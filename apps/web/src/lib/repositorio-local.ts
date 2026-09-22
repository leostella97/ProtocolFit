/**
 * repositorio-local.ts
 * ---------------------------------------------------------------------------
 * BANCO DE DADOS DO NAVEGADOR — permite que o ProtocolFit funcione como site
 * publicado no GitHub Pages, sem servidor e sem SQLite.
 *
 * Como funciona:
 *  - Contas, perfis, planos e pesagens são gravados no `localStorage` do
 *    visitante (chave `protocolfit_banco_local`), em um formato equivalente
 *    às tabelas do backend.
 *  - O motor de cálculo determinístico roda no navegador (pasta ./motor) e
 *    usa os MESMOS modelos JSON mestres, servidos como arquivos estáticos.
 *  - Cada função aqui espelha uma rota da API, com as mesmas validações,
 *    as mesmas mensagens e os mesmos códigos de erro (401, 409, 423...).
 *
 * Privacidade: os dados NUNCA saem do navegador do usuário.
 * ---------------------------------------------------------------------------
 */
import type {
  DiaDeTreino,
  ItemDaDieta,
  OpcoesDoSistema,
  Perfil,
  PlanoCompleto,
  PlanoDieta,
  PlanoTreino,
  RegistroEvolucao,
  RespostaDeAutenticacao,
  Sexo,
  Modalidade,
  Nivel,
  Objetivo,
  Usuario,
} from './tipos';
import { guardarToken, guardarUsuario, obterToken } from './armazenamento';
import { ErroDaApi } from './erro-api';
import { calcularPlanoNutricional } from './motor/calculos';
import { buscarModeloDieta, buscarModeloTreino } from './motor/carregadorModelos';
import {
  aplicarEdicaoTreino,
  aplicarSubstituicao,
  montarPlanoDieta,
  montarPlanoTreino,
  type EdicaoDeExercicio,
} from './motor/montadorPlano';
import {
  DIAS_DA_SEMANA,
  HORAS_DE_BLOQUEIO,
  FAIXAS_ETARIAS,
  LIMITE_TENTATIVAS_LOGIN,
  LIMITES_CORPO,
  MODALIDADES,
  NIVEIS,
  OBJETIVOS,
  opcoesDoSistema,
} from './motor/constantes';

/** Chave do "banco de dados" no armazenamento do navegador. */
const CHAVE_BANCO = 'protocolfit_banco_local';

/** Prefixo do token de sessão do modo navegador. */
const PREFIXO_TOKEN = 'local:';

/** Conta de usuário gravada no navegador. */
interface ContaLocal {
  /** Identificador único. */
  id: number;
  /** Nome exibido. */
  nome: string;
  /** E-mail de acesso (único, minúsculo). */
  email: string;
  /** Hash SHA-256 da senha (nunca a senha em texto puro). */
  senha_hash: string;
  /** Tentativas de login falhas consecutivas. */
  tentativas_falhas: number;
  /** Timestamp (ms) até o qual a conta fica bloqueada, ou null. */
  bloqueado_ate: number | null;
  /** Data de criação. */
  criado_em: string;
}

/** Estrutura completa do banco local. */
interface BancoLocal {
  /** Versão do esquema (permite migrações futuras). */
  versao: number;
  /** Contas cadastradas neste navegador. */
  contas: ContaLocal[];
  /** Perfis físicos (um por conta). */
  perfis: Perfil[];
  /** Planos clonados (treino e dieta, com histórico de versões). */
  planos: {
    id: number;
    usuario_id: number;
    tipo: 'treino' | 'dieta';
    versao: number;
    ativo: boolean;
    modelo_origem: string;
    conteudo: string;
  }[];
  /** Pesagens registradas. */
  evolucao: { id: number; usuario_id: number; data: string; peso_kg: number }[];
  /** Contador de identificadores. */
  proximoId: number;
}

/** Banco vazio (primeira visita). */
function bancoVazio(): BancoLocal {
  return { versao: 1, contas: [], perfis: [], planos: [], evolucao: [], proximoId: 1 };
}

/** Lê o banco do armazenamento local (ou cria um vazio). */
function lerBanco(): BancoLocal {
  if (typeof window === 'undefined') {
    return bancoVazio();
  }
  const bruto = window.localStorage.getItem(CHAVE_BANCO);
  if (!bruto) {
    return bancoVazio();
  }
  try {
    return JSON.parse(bruto) as BancoLocal;
  } catch {
    // Banco corrompido: recomeça do zero em vez de quebrar a aplicação.
    return bancoVazio();
  }
}

/** Grava o banco no armazenamento local. */
function salvarBanco(banco: BancoLocal): void {
  window.localStorage.setItem(CHAVE_BANCO, JSON.stringify(banco));
}

/** Gera o próximo identificador e incrementa o contador. */
function proximoId(banco: BancoLocal): number {
  const id = banco.proximoId;
  banco.proximoId += 1;
  return id;
}

/** Calcula o hash SHA-256 de um texto (senha) em hexadecimal. */
async function calcularHash(texto: string): Promise<string> {
  // Usa a Web Crypto API disponível em todos os navegadores modernos.
  const dados = new TextEncoder().encode(texto);
  const digesto = await window.crypto.subtle.digest('SHA-256', dados);
  return Array.from(new Uint8Array(digesto))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/** Data de hoje no formato AAAA-MM-DD. */
function dataDeHoje(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Devolve o id do usuário da sessão atual (ou null). */
function usuarioDaSessao(): number | null {
  const token = obterToken();
  if (!token || !token.startsWith(PREFIXO_TOKEN)) {
    return null;
  }
  const id = Number(token.slice(PREFIXO_TOKEN.length));
  return Number.isFinite(id) ? id : null;
}

/** Exige uma sessão ativa e devolve a conta correspondente. */
function exigirSessao(banco: BancoLocal): ContaLocal {
  const usuarioId = usuarioDaSessao();
  const conta = banco.contas.find((candidata) => candidata.id === usuarioId);
  if (!conta) {
    throw new ErroDaApi(401, 'Sessão inválida. Faça login novamente.');
  }
  return conta;
}

/** Máscara pública do usuário (nunca expõe o hash da senha). */
function usuarioPublico(conta: ContaLocal): Usuario {
  return { id: conta.id, nome: conta.nome, email: conta.email, criado_em: conta.criado_em };
}

/** Valida o formato do e-mail. */
function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ===========================================================================
 * AUTENTICAÇÃO (espelha POST /api/auth/cadastro e /api/auth/login)
 * ======================================================================== */

/** Cria a conta no navegador e abre a sessão. */
export async function cadastrarLocal(corpo: { nome: string; email: string; senha: string }): Promise<RespostaDeAutenticacao> {
  const banco = lerBanco();
  const nome = (corpo.nome ?? '').trim();
  const email = (corpo.email ?? '').trim().toLowerCase();

  // Mesmas validações do servidor, com as mesmas mensagens.
  if (nome.length < 3) {
    throw new ErroDaApi(400, 'Informe seu nome completo (mínimo de 3 caracteres).');
  }
  if (!emailValido(email)) {
    throw new ErroDaApi(400, 'Informe um e-mail válido.');
  }
  if (!corpo.senha || corpo.senha.length < 8) {
    throw new ErroDaApi(400, 'A senha precisa ter pelo menos 8 caracteres.');
  }
  if (banco.contas.some((conta) => conta.email === email)) {
    throw new ErroDaApi(409, 'Este e-mail já está cadastrado. Faça login para continuar.');
  }

  // Cria a conta com o hash da senha.
  const nova: ContaLocal = {
    id: proximoId(banco),
    nome,
    email,
    senha_hash: await calcularHash(corpo.senha),
    tentativas_falhas: 0,
    bloqueado_ate: null,
    criado_em: new Date().toISOString(),
  };
  banco.contas.push(nova);
  salvarBanco(banco);

  // Abre a sessão (token local) e guarda os dados do usuário.
  const token = `${PREFIXO_TOKEN}${nova.id}`;
  guardarToken(token);
  guardarUsuario({ id: nova.id, nome: nova.nome, email: nova.email });
  return { token, usuario: usuarioPublico(nova) };
}

/** Autentica no navegador, com bloqueio de 3 tentativas por 5 horas. */
export async function entrarLocal(corpo: { email: string; senha: string }): Promise<RespostaDeAutenticacao> {
  const banco = lerBanco();
  const email = (corpo.email ?? '').trim().toLowerCase();
  if (!email || !corpo.senha) {
    throw new ErroDaApi(400, 'Informe e-mail e senha.');
  }
  const conta = banco.contas.find((candidata) => candidata.email === email);
  // Não revela se o e-mail existe (evita enumeração de contas).
  if (!conta) {
    throw new ErroDaApi(401, 'Credenciais inválidas.');
  }

  const agora = Date.now();
  // Conta dentro do período de bloqueio de 5 horas.
  if (conta.bloqueado_ate !== null && conta.bloqueado_ate > agora) {
    const horasRestantes = Math.ceil((conta.bloqueado_ate - agora) / (60 * 60 * 1000));
    throw new ErroDaApi(
      423,
      `Conta temporariamente bloqueada por excesso de tentativas. Tente novamente em ${horasRestantes} hora(s).`,
    );
  }

  // Compara o hash da senha informada com o armazenado.
  const senhaConfere = (await calcularHash(corpo.senha)) === conta.senha_hash;

  if (!senhaConfere) {
    const tentativas = conta.tentativas_falhas + 1;
    // Ao atingir o limite, bloqueia por 5 horas e zera o contador.
    if (tentativas >= LIMITE_TENTATIVAS_LOGIN) {
      conta.tentativas_falhas = 0;
      conta.bloqueado_ate = agora + HORAS_DE_BLOQUEIO * 60 * 60 * 1000;
      salvarBanco(banco);
      throw new ErroDaApi(
        423,
        `Conta bloqueada por ${HORAS_DE_BLOQUEIO} horas após ${LIMITE_TENTATIVAS_LOGIN} tentativas inválidas.`,
      );
    }
    conta.tentativas_falhas = tentativas;
    salvarBanco(banco);
    throw new ErroDaApi(401, `Senha incorreta. Tentativas restantes: ${LIMITE_TENTATIVAS_LOGIN - tentativas}.`);
  }

  // Sucesso: zera as tentativas e abre a sessão.
  conta.tentativas_falhas = 0;
  conta.bloqueado_ate = null;
  salvarBanco(banco);

  const token = `${PREFIXO_TOKEN}${conta.id}`;
  guardarToken(token);
  guardarUsuario({ id: conta.id, nome: conta.nome, email: conta.email });
  return { token, usuario: usuarioPublico(conta) };
}

/** Devolve a conta, o perfil e se os planos já existem (espelha GET /api/eu). */
export async function buscarContaLocal(): Promise<{ usuario: Usuario; perfil: Perfil | null; possui_planos: boolean }> {
  const banco = lerBanco();
  const conta = exigirSessao(banco);
  const perfil = banco.perfis.find((candidato) => candidato.usuario_id === conta.id) ?? null;
  return { usuario: usuarioPublico(conta), perfil, possui_planos: perfil !== null };
}

/** Opções estáticas do onboarding (espelha GET /api/opcoes). */
export async function buscarOpcoesLocal(): Promise<OpcoesDoSistema> {
  return opcoesDoSistema();
}

/* ===========================================================================
 * PERFIL E GERAÇÃO DE PLANOS (espelha POST /api/perfil e /recalcular)
 * ======================================================================== */

/** Corpo do perfil enviado pelo onboarding. */
export interface CorpoPerfilLocal {
  sexo: Sexo;
  faixa_etaria: string;
  peso_kg: number;
  altura_cm: number;
  objetivo: Objetivo;
  frequencia_semanal: number;
  dias_disponiveis: string[];
  modalidade: Modalidade;
  nivel?: Nivel;
}

/** Valida o perfil com as MESMAS regras e mensagens do servidor. */
function validarPerfil(corpo: Partial<CorpoPerfilLocal>): void {
  if (corpo.sexo !== 'masculino' && corpo.sexo !== 'feminino') {
    throw new ErroDaApi(400, 'Selecione o sexo: masculino ou feminino.');
  }
  if (!corpo.faixa_etaria || !FAIXAS_ETARIAS.some((faixa) => faixa.valor === corpo.faixa_etaria)) {
    throw new ErroDaApi(400, 'Selecione uma faixa etária válida.');
  }
  if (
    typeof corpo.peso_kg !== 'number' ||
    corpo.peso_kg < LIMITES_CORPO.peso_minimo_kg ||
    corpo.peso_kg > LIMITES_CORPO.peso_maximo_kg
  ) {
    throw new ErroDaApi(400, `Informe um peso entre ${LIMITES_CORPO.peso_minimo_kg} e ${LIMITES_CORPO.peso_maximo_kg} kg.`);
  }
  if (
    typeof corpo.altura_cm !== 'number' ||
    corpo.altura_cm < LIMITES_CORPO.altura_minima_cm ||
    corpo.altura_cm > LIMITES_CORPO.altura_maxima_cm
  ) {
    throw new ErroDaApi(400, `Informe uma altura entre ${LIMITES_CORPO.altura_minima_cm} e ${LIMITES_CORPO.altura_maxima_cm} cm.`);
  }
  if (!corpo.objetivo || !OBJETIVOS.some((objetivo) => objetivo.valor === corpo.objetivo)) {
    throw new ErroDaApi(400, 'Selecione um objetivo válido.');
  }
  if (typeof corpo.frequencia_semanal !== 'number' || corpo.frequencia_semanal < 1 || corpo.frequencia_semanal > 7) {
    throw new ErroDaApi(400, 'Informe a frequência semanal de treino (1 a 7 dias).');
  }
  if (!Array.isArray(corpo.dias_disponiveis) || corpo.dias_disponiveis.length === 0) {
    throw new ErroDaApi(400, 'Selecione pelo menos um dia disponível para treinar.');
  }
  const valoresValidos = new Set(DIAS_DA_SEMANA.map((dia) => dia.valor));
  if (corpo.dias_disponiveis.some((dia) => !valoresValidos.has(dia))) {
    throw new ErroDaApi(400, 'Há um dia da semana inválido na seleção.');
  }
  if (!corpo.modalidade || !MODALIDADES.some((modalidade) => modalidade.valor === corpo.modalidade)) {
    throw new ErroDaApi(400, 'Selecione uma modalidade válida.');
  }
  if (corpo.nivel && !NIVEIS.includes(corpo.nivel)) {
    throw new ErroDaApi(400, 'Nível de experiência inválido.');
  }
}

/**
 * Gera (ou regenera) treino e dieta: localiza o modelo JSON mestre correto,
 * injeta cargas e quantidades em gramas e grava as cópias do usuário.
 */
async function gerarPlanos(banco: BancoLocal, usuarioId: number, perfil: Perfil): Promise<{ treino: PlanoTreino; dieta: PlanoDieta }> {
  // 1) Localiza o modelo mestre de treino cruzando modalidade + objetivo + dias.
  const { modelo: modeloTreino, caminhoDoModelo: caminhoTreino } = await buscarModeloTreino(
    perfil.modalidade,
    perfil.objetivo,
    perfil.dias_disponiveis.length,
  );
  // 2) Localiza o modelo mestre de dieta do objetivo.
  const { modelo: modeloDieta, caminhoDoModelo: caminhoDieta } = await buscarModeloDieta(perfil.objetivo);
  // 3) Calcula o plano nutricional determinístico no navegador.
  const metas = calcularPlanoNutricional(perfil);
  // 4) Monta os planos injetando séries, cargas e gramas.
  const treinoMontado = montarPlanoTreino(modeloTreino, perfil);
  const dietaMontada = montarPlanoDieta(modeloDieta, perfil, metas);

  // 5) Desativa as cópias antigas (ficam no histórico, inativas).
  for (const plano of banco.planos) {
    if (plano.usuario_id === usuarioId) {
      plano.ativo = false;
    }
  }
  // 6) Calcula a nova versão de cada tipo de plano.
  const versaoTreino = Math.max(0, ...banco.planos.filter((p) => p.usuario_id === usuarioId && p.tipo === 'treino').map((p) => p.versao)) + 1;
  const versaoDieta = Math.max(0, ...banco.planos.filter((p) => p.usuario_id === usuarioId && p.tipo === 'dieta').map((p) => p.versao)) + 1;

  // 7) Grava as novas cópias do usuário.
  const idTreino = proximoId(banco);
  const idDieta = proximoId(banco);
  banco.planos.push({
    id: idTreino,
    usuario_id: usuarioId,
    tipo: 'treino',
    versao: versaoTreino,
    ativo: true,
    modelo_origem: caminhoTreino,
    conteudo: JSON.stringify(treinoMontado),
  });
  banco.planos.push({
    id: idDieta,
    usuario_id: usuarioId,
    tipo: 'dieta',
    versao: versaoDieta,
    ativo: true,
    modelo_origem: caminhoDieta,
    conteudo: JSON.stringify(dietaMontada),
  });

  // 8) Devolve os planos prontos para a interface.
  return {
    treino: { id: idTreino, versao: versaoTreino, modelo_origem: caminhoTreino, ...treinoMontado },
    dieta: { id: idDieta, versao: versaoDieta, modelo_origem: caminhoDieta, ...dietaMontada },
  };
}

/** Salva o perfil e gera os planos (espelha POST /api/perfil). */
export async function salvarPerfilEGerarPlanosLocal(
  corpo: CorpoPerfilLocal,
): Promise<{ perfil: Perfil; treino: PlanoTreino; dieta: PlanoDieta }> {
  const banco = lerBanco();
  const conta = exigirSessao(banco);
  // Valida antes de qualquer processamento.
  validarPerfil(corpo);

  // Grava (ou atualiza) o perfil do usuário.
  const existente = banco.perfis.find((candidato) => candidato.usuario_id === conta.id);
  let perfil: Perfil;
  if (existente) {
    existente.sexo = corpo.sexo;
    existente.faixa_etaria = corpo.faixa_etaria;
    existente.peso_kg = corpo.peso_kg;
    existente.altura_cm = corpo.altura_cm;
    existente.objetivo = corpo.objetivo;
    existente.frequencia_semanal = corpo.frequencia_semanal;
    existente.dias_disponiveis = corpo.dias_disponiveis;
    existente.modalidade = corpo.modalidade;
    existente.nivel = corpo.nivel ?? 'iniciante';
    perfil = existente;
  } else {
    perfil = {
      id: proximoId(banco),
      usuario_id: conta.id,
      sexo: corpo.sexo,
      faixa_etaria: corpo.faixa_etaria,
      peso_kg: corpo.peso_kg,
      altura_cm: corpo.altura_cm,
      objetivo: corpo.objetivo,
      frequencia_semanal: corpo.frequencia_semanal,
      dias_disponiveis: corpo.dias_disponiveis,
      modalidade: corpo.modalidade,
      nivel: corpo.nivel ?? 'iniciante',
    };
    banco.perfis.push(perfil);
  }

  // Gera e grava os planos clonados para o usuário.
  const planos = await gerarPlanos(banco, conta.id, perfil);
  salvarBanco(banco);
  return { perfil, ...planos };
}

/** Renova os planos com base na evolução física (espelha POST /perfil/recalcular). */
export async function recalcularPlanosLocal(): Promise<{ perfil: Perfil; treino: PlanoTreino; dieta: PlanoDieta }> {
  const banco = lerBanco();
  const conta = exigirSessao(banco);
  const perfil = banco.perfis.find((candidato) => candidato.usuario_id === conta.id);
  if (!perfil) {
    throw new ErroDaApi(404, 'Perfil não encontrado. Complete o onboarding primeiro.');
  }
  // Usa o peso mais recente da evolução, quando houver.
  const pesagens = banco.evolucao.filter((registro) => registro.usuario_id === conta.id).sort((a, b) => a.data.localeCompare(b.data));
  const ultima = pesagens[pesagens.length - 1];
  if (ultima) {
    perfil.peso_kg = ultima.peso_kg;
  }
  const planos = await gerarPlanos(banco, conta.id, perfil);
  salvarBanco(banco);
  return { perfil, ...planos };
}

/* ===========================================================================
 * PLANOS (espelha GET /api/plano/atual e as rotas de edição)
 * ======================================================================== */

/** Busca o plano vigente completo (perfil + treino + dieta). */
export async function buscarPlanoAtualLocal(): Promise<PlanoCompleto> {
  const banco = lerBanco();
  const conta = exigirSessao(banco);
  const perfil = banco.perfis.find((candidato) => candidato.usuario_id === conta.id);
  if (!perfil) {
    throw new ErroDaApi(404, 'Perfil não encontrado. Complete o onboarding primeiro.');
  }
  // Busca as cópias vigentes de treino e dieta.
  const linhaTreino = banco.planos.find((plano) => plano.usuario_id === conta.id && plano.tipo === 'treino' && plano.ativo);
  const linhaDieta = banco.planos.find((plano) => plano.usuario_id === conta.id && plano.tipo === 'dieta' && plano.ativo);
  if (!linhaTreino || !linhaDieta) {
    throw new ErroDaApi(404, 'Planos ainda não gerados. Atualize seu perfil para gerá-los.');
  }
  return {
    perfil,
    treino: { id: linhaTreino.id, versao: linhaTreino.versao, modelo_origem: linhaTreino.modelo_origem, ...JSON.parse(linhaTreino.conteudo) } as PlanoTreino,
    dieta: { id: linhaDieta.id, versao: linhaDieta.versao, modelo_origem: linhaDieta.modelo_origem, ...JSON.parse(linhaDieta.conteudo) } as PlanoDieta,
  };
}

/** Localiza a cópia do plano do usuário logado, exigindo o tipo correto. */
function exigirPlano(banco: BancoLocal, planoId: number, tipo: 'treino' | 'dieta') {
  const conta = exigirSessao(banco);
  const plano = banco.planos.find((candidato) => candidato.id === planoId);
  if (!plano || plano.usuario_id !== conta.id || plano.tipo !== tipo) {
    throw new ErroDaApi(403, `Você só pode editar o seu próprio plano de ${tipo}.`);
  }
  return plano;
}

/** Edita séries/repetições/carga de um exercício (espelha PATCH /plano/treino/:id). */
export async function editarExercicioLocal(planoId: number, corpo: EdicaoDeExercicio): Promise<PlanoTreino> {
  const banco = lerBanco();
  const plano = exigirPlano(banco, planoId, 'treino');
  // Valida os índices recebidos.
  if (!Number.isInteger(corpo.dia_indice) || !Number.isInteger(corpo.exercicio_indice)) {
    throw new ErroDaApi(400, 'Informe o dia e o exercício que deseja editar.');
  }
  // Aplica a edição na cópia (o modelo mestre permanece intacto).
  const conteudo = JSON.parse(plano.conteudo) as Omit<PlanoTreino, 'id' | 'versao' | 'modelo_origem'>;
  aplicarEdicaoTreino(conteudo, corpo);
  plano.conteudo = JSON.stringify(conteudo);
  salvarBanco(banco);
  return { id: plano.id, versao: plano.versao, modelo_origem: plano.modelo_origem, ...conteudo };
}

/** Substitui um alimento por substituto (espelha PATCH /plano/dieta/:id/substituir). */
export async function substituirAlimentoLocal(
  planoId: number,
  corpo: { refeicao_indice: number; item_indice: number; alternativa_nome: string },
): Promise<PlanoDieta> {
  const banco = lerBanco();
  const plano = exigirPlano(banco, planoId, 'dieta');
  if (!Number.isInteger(corpo.refeicao_indice) || !Number.isInteger(corpo.item_indice) || !corpo.alternativa_nome) {
    throw new ErroDaApi(400, 'Informe a refeição, o alimento e o substituto desejado.');
  }
  // Aplica a substituição recalculando a porção.
  const conteudo = JSON.parse(plano.conteudo) as Omit<PlanoDieta, 'id' | 'versao' | 'modelo_origem'>;
  aplicarSubstituicao(conteudo, corpo.refeicao_indice, corpo.item_indice, corpo.alternativa_nome);
  plano.conteudo = JSON.stringify(conteudo);
  salvarBanco(banco);
  return { id: plano.id, versao: plano.versao, modelo_origem: plano.modelo_origem, ...conteudo };
}

/* ===========================================================================
 * EVOLUÇÃO CORPORAL (espelha POST/GET /api/evolucao)
 * ======================================================================== */

/** Registra uma pesagem do usuário. */
export async function registrarPesagemLocal(pesoKg: number, data?: string): Promise<RegistroEvolucao> {
  const banco = lerBanco();
  const conta = exigirSessao(banco);
  if (typeof pesoKg !== 'number' || pesoKg < LIMITES_CORPO.peso_minimo_kg || pesoKg > LIMITES_CORPO.peso_maximo_kg) {
    throw new ErroDaApi(400, `Informe um peso válido entre ${LIMITES_CORPO.peso_minimo_kg} e ${LIMITES_CORPO.peso_maximo_kg} kg.`);
  }
  const dataDoRegistro = data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : dataDeHoje();
  const registro = { id: proximoId(banco), usuario_id: conta.id, data: dataDoRegistro, peso_kg: pesoKg };
  banco.evolucao.push(registro);
  salvarBanco(banco);
  return { id: registro.id, data: registro.data, peso_kg: registro.peso_kg };
}

/** Lista as pesagens do usuário em ordem cronológica. */
export async function listarEvolucaoLocal(): Promise<RegistroEvolucao[]> {
  const banco = lerBanco();
  const conta = exigirSessao(banco);
  return banco.evolucao
    .filter((registro) => registro.usuario_id === conta.id)
    .sort((a, b) => a.data.localeCompare(b.data) || a.id - b.id)
    .map((registro) => ({ id: registro.id, data: registro.data, peso_kg: registro.peso_kg }));
}

/** Tipos auxiliares reexportados para uso interno das telas (opcional). */
export type { DiaDeTreino, ItemDaDieta };
