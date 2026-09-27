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
  CheckinDiario,
  DiaDeTreino,
  ItemDaDieta,
  OpcoesDoSistema,
  Perfil,
  PlanoCompleto,
  PlanoDieta,
  PlanoTreino,
  RegistroEvolucao,
  RespostaDeAutenticacao,
  ResumoDeCheckins,
  Sexo,
  Modalidade,
  Nivel,
  Objetivo,
  Usuario,
} from './tipos';
import { guardarToken, guardarUsuario, obterToken } from './armazenamento';
import { hojeLocal } from './checkin-util';
import { CHAVE_DO_ACEITE, termoFoiAceito, VERSAO_DO_TERMO } from './termo-de-uso';
import { ErroDaApi } from './erro-api';
import { calcularPlanoNutricional } from './motor/calculos';
import { buscarModeloDieta, buscarModeloTreino, listarVariacoesDeTreino } from './motor/carregadorModelos';
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
    /** Data de criação da cópia (base do "há quanto tempo com o plano"). */
    criado_em: string;
    conteudo: string;
  }[];
  /** Pesagens registradas. */
  evolucao: { id: number; usuario_id: number; data: string; peso_kg: number }[];
  /** Check-ins diários (um por dia, por usuário) — opcional em bancos antigos. */
  checkins?: CheckinDiarioInterno[];
  /** Contador de identificadores. */
  proximoId: number;
}

/** Check-in diário gravado no navegador. */
interface CheckinDiarioInterno {
  /** Identificador do registro. */
  id: number;
  /** Dono do check-in. */
  usuario_id: number;
  /** Dia do check-in (AAAA-MM-DD). */
  data: string;
  /** Treino concluído. */
  treino_feito: boolean;
  /** Dieta seguida. */
  dieta_seguida: boolean;
  /** Água bebida (ml). */
  agua_ml: number;
  /** Peso do dia (opcional). */
  peso_kg: number | null;
  /** Anotação livre. */
  observacao: string | null;
}

/** Banco vazio (primeira visita). */
function bancoVazio(): BancoLocal {
  return { versao: 1, contas: [], perfis: [], planos: [], evolucao: [], checkins: [], proximoId: 1 };
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
    const banco = JSON.parse(bruto) as BancoLocal;
    // MIGRAÇÃO LEVE: bancos salvos antes do seletor de estilo não têm o campo
    // `variacao_treino` — normaliza para null (estilo clássico).
    for (const perfil of banco.perfis ?? []) {
      perfil.variacao_treino = perfil.variacao_treino ?? null;
    }
    return banco;
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

/**
 * Data de hoje no formato AAAA-MM-DD — no FUSO DO USUÁRIO (não em UTC).
 * TEAM_001: usar UTC aqui gravava o check-in/pesagem "amanhã" para quem usa o
 * app depois das 21h no Brasil (UTC-3) — o registro sumia do dia seguinte.
 */
function dataDeHoje(): string {
  return hojeLocal();
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
  // Estilos de treino vêm do indice.json gerado no build (arquivos estáticos).
  const variacoes = await listarVariacoesDeTreino();
  return { ...opcoesDoSistema(), variacoes_de_treino: variacoes };
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
  /** Estilo de treino escolhido (null/ausente = estilo padrão). */
  variacao_treino?: string | null;
}

/** Formato aceito para o identificador de estilo de treino (slug). */
const FORMATO_DO_ESTILO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
  // Valida o FORMATO do estilo de treino (a existência é conferida depois,
  // pois depende dos arquivos estáticos do índice). "padrao" é sempre aceito.
  if (corpo.variacao_treino !== undefined && corpo.variacao_treino !== null && corpo.variacao_treino !== 'padrao') {
    if (
      typeof corpo.variacao_treino !== 'string' ||
      corpo.variacao_treino.length > 40 ||
      !FORMATO_DO_ESTILO.test(corpo.variacao_treino)
    ) {
      throw new ErroDaApi(400, 'Estilo de treino inválido.');
    }
  }
}

/**
 * Gera (ou regenera) treino e dieta: localiza o modelo JSON mestre correto,
 * injeta cargas e quantidades em gramas e grava as cópias do usuário.
 */
async function gerarPlanos(banco: BancoLocal, usuarioId: number, perfil: Perfil): Promise<{ treino: PlanoTreino; dieta: PlanoDieta }> {
  // 1) Localiza o modelo mestre de treino cruzando modalidade + objetivo +
  //    dias + estilo escolhido (padrão quando variacao_treino é null).
  const { modelo: modeloTreino, caminhoDoModelo: caminhoTreino } = await buscarModeloTreino(
    perfil.modalidade,
    perfil.objetivo,
    perfil.dias_disponiveis.length,
    perfil.variacao_treino,
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

  // 7) Grava as novas cópias do usuário (com a data de criação atual).
  const idTreino = proximoId(banco);
  const idDieta = proximoId(banco);
  const criadoEm = new Date().toISOString();
  banco.planos.push({
    id: idTreino,
    usuario_id: usuarioId,
    tipo: 'treino',
    versao: versaoTreino,
    ativo: true,
    modelo_origem: caminhoTreino,
    criado_em: criadoEm,
    conteudo: JSON.stringify(treinoMontado),
  });
  banco.planos.push({
    id: idDieta,
    usuario_id: usuarioId,
    tipo: 'dieta',
    versao: versaoDieta,
    ativo: true,
    modelo_origem: caminhoDieta,
    criado_em: criadoEm,
    conteudo: JSON.stringify(dietaMontada),
  });

  // 8) Devolve os planos prontos para a interface.
  return {
    treino: { id: idTreino, versao: versaoTreino, modelo_origem: caminhoTreino, criado_em: criadoEm, ...treinoMontado },
    dieta: { id: idDieta, versao: versaoDieta, modelo_origem: caminhoDieta, criado_em: criadoEm, ...dietaMontada },
  };
}

/** Salva o perfil e gera os planos (espelha POST /api/perfil). */
export async function salvarPerfilEGerarPlanosLocal(
  corpo: CorpoPerfilLocal,
): Promise<{ perfil: Perfil; treino: PlanoTreino; dieta: PlanoDieta }> {
  // BLOQUEIO OBRIGATÓRIO: sem o aceite do aviso de responsabilidade a geração
  // é impedida (o aviso também bloqueia a interface, mas esta é a garantia
  // definitiva no motor do navegador).
  if (!termoFoiAceito()) {
    throw new ErroDaApi(
      403,
      'É necessário ler e aceitar o aviso de responsabilidade antes de gerar o plano.',
    );
  }
  const banco = lerBanco();
  const conta = exigirSessao(banco);
  // Valida antes de qualquer processamento.
  validarPerfil(corpo);

  // O estilo escolhido precisa existir no índice (senão o plano cairia no
  // padrão silenciosamente — melhor avisar).
  const estiloPedido = corpo.variacao_treino ?? null;
  if (estiloPedido && estiloPedido !== 'padrao') {
    const disponiveis = await listarVariacoesDeTreino();
    // Índice indisponível (ex.: rodando fora do build): segue adiante e deixa o
    // carregador cair no modelo padrão em vez de bloquear o usuário.
    if (disponiveis.length > 0 && !disponiveis.some((variacao) => variacao.id === estiloPedido)) {
      throw new ErroDaApi(400, 'Estilo de treino indisponível.');
    }
  }
  // "padrao" é o identificador interno do estilo clássico (gravado como null).
  const estiloGravado = !estiloPedido || estiloPedido === 'padrao' ? null : estiloPedido;

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
    existente.variacao_treino = estiloGravado;
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
      variacao_treino: estiloGravado,
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
 * ESTILO DE TREINO (espelha PATCH /api/perfil/treino)
 * ======================================================================== */

/**
 * Troca o ESTILO de treino do usuário e regenera os planos na hora.
 * `null` (ou "padrao") volta ao modelo clássico da combinação.
 */
export async function atualizarEstiloDeTreinoLocal(
  variacao: string | null,
): Promise<{ perfil: Perfil; treino: PlanoTreino; dieta: PlanoDieta }> {
  const banco = lerBanco();
  const conta = exigirSessao(banco);
  const perfil = banco.perfis.find((candidato) => candidato.usuario_id === conta.id);
  if (!perfil) {
    throw new ErroDaApi(404, 'Perfil não encontrado. Complete o onboarding primeiro.');
  }
  // Normaliza o identificador: "padrao"/vazio = estilo clássico (null).
  const estiloPedido = variacao ?? null;
  const estiloNormalizado = !estiloPedido || estiloPedido === 'padrao' ? null : estiloPedido;
  // Valida o estilo pedido contra o índice de modelos disponíveis.
  if (estiloNormalizado) {
    const disponiveis = await listarVariacoesDeTreino();
    // Índice indisponível: não bloqueia — o carregador cai no modelo padrão.
    if (disponiveis.length > 0 && !disponiveis.some((disponivel) => disponivel.id === estiloNormalizado)) {
      throw new ErroDaApi(400, 'Estilo de treino indisponível.');
    }
  }
  // Grava o estilo e regenera os planos (nova versão, antigas inativas).
  perfil.variacao_treino = estiloNormalizado;
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
    treino: { id: linhaTreino.id, versao: linhaTreino.versao, modelo_origem: linhaTreino.modelo_origem, criado_em: linhaTreino.criado_em, ...JSON.parse(linhaTreino.conteudo) } as PlanoTreino,
    dieta: { id: linhaDieta.id, versao: linhaDieta.versao, modelo_origem: linhaDieta.modelo_origem, criado_em: linhaDieta.criado_em, ...JSON.parse(linhaDieta.conteudo) } as PlanoDieta,
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
  const conteudo = JSON.parse(plano.conteudo) as Omit<PlanoTreino, 'id' | 'versao' | 'modelo_origem' | 'criado_em'>;
  aplicarEdicaoTreino(conteudo, corpo);
  plano.conteudo = JSON.stringify(conteudo);
  salvarBanco(banco);
  return { id: plano.id, versao: plano.versao, modelo_origem: plano.modelo_origem, criado_em: plano.criado_em, ...conteudo };
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
  const conteudo = JSON.parse(plano.conteudo) as Omit<PlanoDieta, 'id' | 'versao' | 'modelo_origem' | 'criado_em'>;
  aplicarSubstituicao(conteudo, corpo.refeicao_indice, corpo.item_indice, corpo.alternativa_nome);
  plano.conteudo = JSON.stringify(conteudo);
  salvarBanco(banco);
  return { id: plano.id, versao: plano.versao, modelo_origem: plano.modelo_origem, criado_em: plano.criado_em, ...conteudo };
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
  // TEAM_001: um registro por data (mesma regra do servidor) — e a pesagem
  // mais recente passa a ser o "peso atual" do perfil (sincronizarPesoAtual).
  const registro = salvarPesagemDoDiaNoBanco(banco, conta.id, dataDoRegistro, pesoKg);
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

/* ===========================================================================
 * CORPO (peso e altura) — espelha PATCH /api/perfil/corpo
 * ======================================================================== */

/** Altera peso e/ou altura sem regenerar os planos. */
export async function atualizarCorpoLocal(corpo: { peso_kg?: number; altura_cm?: number }): Promise<{ perfil: Perfil; mensagem: string }> {
  const banco = lerBanco();
  const conta = exigirSessao(banco);
  const perfil = banco.perfis.find((candidato) => candidato.usuario_id === conta.id);
  if (!perfil) {
    throw new ErroDaApi(404, 'Perfil não encontrado. Complete o onboarding primeiro.');
  }
  // Pelo menos um campo precisa ser informado.
  if (corpo.peso_kg === undefined && corpo.altura_cm === undefined) {
    throw new ErroDaApi(400, 'Informe o novo peso e/ou a nova altura.');
  }
  // Valida o peso dentro dos limites aceitos.
  if (corpo.peso_kg !== undefined) {
    if (typeof corpo.peso_kg !== 'number' || corpo.peso_kg < LIMITES_CORPO.peso_minimo_kg || corpo.peso_kg > LIMITES_CORPO.peso_maximo_kg) {
      throw new ErroDaApi(400, `Informe um peso entre ${LIMITES_CORPO.peso_minimo_kg} e ${LIMITES_CORPO.peso_maximo_kg} kg.`);
    }
    perfil.peso_kg = corpo.peso_kg;
    // Registra a pesagem do dia (mantém um ponto por dia no gráfico).
    salvarPesagemDoDiaNoBanco(banco, conta.id, dataDeHoje(), corpo.peso_kg);
  }
  // Valida a altura dentro dos limites aceitos.
  if (corpo.altura_cm !== undefined) {
    if (typeof corpo.altura_cm !== 'number' || corpo.altura_cm < LIMITES_CORPO.altura_minima_cm || corpo.altura_cm > LIMITES_CORPO.altura_maxima_cm) {
      throw new ErroDaApi(400, `Informe uma altura entre ${LIMITES_CORPO.altura_minima_cm} e ${LIMITES_CORPO.altura_maxima_cm} cm.`);
    }
    perfil.altura_cm = corpo.altura_cm;
  }
  salvarBanco(banco);
  return { perfil, mensagem: 'Dados atualizados. Use "Recalcular" para renovar o plano.' };
}

/**
 * Grava a pesagem de um dia mantendo APENAS UM registro por data
 * (se já existir pesagem no dia, ela é atualizada em vez de duplicada).
 * Devolve o registro gravado e mantém o "peso atual" do perfil em dia.
 */
function salvarPesagemDoDiaNoBanco(
  banco: BancoLocal,
  usuarioId: number,
  data: string,
  pesoKg: number,
): BancoLocal['evolucao'][number] {
  const existente = banco.evolucao.find((registro) => registro.usuario_id === usuarioId && registro.data === data);
  if (existente) {
    // Atualiza o valor do dia (evita pontos duplicados no gráfico).
    existente.peso_kg = pesoKg;
    sincronizarPesoAtual(banco, usuarioId);
    return existente;
  }
  const registro = { id: proximoId(banco), usuario_id: usuarioId, data, peso_kg: pesoKg };
  banco.evolucao.push(registro);
  sincronizarPesoAtual(banco, usuarioId);
  return registro;
}

/**
 * TEAM_001: o "peso atual" do perfil é sempre a pesagem mais recente
 * (maior data; em empate, a de maior id — a última gravada). Assim a
 * "Evolução de peso" e o resumo do painel nunca divergem.
 */
function sincronizarPesoAtual(banco: BancoLocal, usuarioId: number): void {
  const perfil = banco.perfis.find((candidato) => candidato.usuario_id === usuarioId);
  if (!perfil) {
    return;
  }
  let maisRecente: BancoLocal['evolucao'][number] | null = null;
  for (const registro of banco.evolucao) {
    if (registro.usuario_id !== usuarioId) {
      continue;
    }
    if (!maisRecente || registro.data > maisRecente.data || (registro.data === maisRecente.data && registro.id > maisRecente.id)) {
      maisRecente = registro;
    }
  }
  if (maisRecente) {
    perfil.peso_kg = maisRecente.peso_kg;
  }
}

/* ===========================================================================
 * CHECK-IN DIÁRIO — espelha GET/POST /api/checkin
 * ======================================================================== */

/** Verifica se o check-in conta como "dia cumprido". */
function diaCumprido(checkin: CheckinDiarioInterno): boolean {
  return checkin.treino_feito || checkin.dieta_seguida;
}

/** Converte o número de dias (desde 1970) em AAAA-MM-DD. */
function deNumeroParaData(numeroDeDias: number): string {
  return new Date(numeroDeDias * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Converte AAAA-MM-DD no número de dias desde 1970. */
function deDataParaNumero(data: string): number {
  return Math.floor(new Date(`${data}T00:00:00Z`).getTime() / (24 * 60 * 60 * 1000));
}

/** Calcula o resumo dos check-ins (sequências e histórico) — igual ao servidor. */
function montarResumo(registrosDoUsuario: CheckinDiarioInterno[]): ResumoDeCheckins {
  // Ordena do mais recente para o mais antigo.
  const ordenados = [...registrosDoUsuario].sort((a, b) => b.data.localeCompare(a.data));
  // Datas cumpridas em ordem crescente.
  const diasCumpridos = ordenados.filter(diaCumprido).map((registro) => registro.data).sort();
  const conjunto = new Set(diasCumpridos);

  // Sequência máxima: maior bloco de dias consecutivos.
  let sequenciaMaxima = 0;
  let corrente = 0;
  let anterior: number | null = null;
  for (const data of diasCumpridos) {
    const numero = deDataParaNumero(data);
    corrente = anterior !== null && numero === anterior + 1 ? corrente + 1 : 1;
    sequenciaMaxima = Math.max(sequenciaMaxima, corrente);
    anterior = numero;
  }

  // Sequência atual: conta de trás para frente a partir de hoje (ou ontem).
  const hoje = deDataParaNumero(dataDeHoje());
  let cursor = conjunto.has(deNumeroParaData(hoje)) ? hoje : hoje - 1;
  let sequenciaAtual = 0;
  while (conjunto.has(deNumeroParaData(cursor))) {
    sequenciaAtual += 1;
    cursor -= 1;
  }

  return {
    hoje: ordenados.find((registro) => registro.data === dataDeHoje()) ?? null,
    registros: ordenados.slice(0, 60).map((registro) => ({
      id: registro.id,
      data: registro.data,
      treino_feito: registro.treino_feito,
      dieta_seguida: registro.dieta_seguida,
      agua_ml: registro.agua_ml,
      peso_kg: registro.peso_kg,
      observacao: registro.observacao,
    })),
    sequencia_atual: sequenciaAtual,
    sequencia_maxima: sequenciaMaxima,
    total: ordenados.length,
    dias_cumpridos: diasCumpridos.slice(-30),
  };
}

/** Busca o resumo do check-in diário do usuário logado. */
export async function buscarCheckinsLocal(): Promise<ResumoDeCheckins> {
  const banco = lerBanco();
  const conta = exigirSessao(banco);
  // Bancos criados antes do recurso não têm a lista: trata como vazia.
  const registros = (banco.checkins ?? []).filter((registro) => registro.usuario_id === conta.id);
  return montarResumo(registros);
}

/** Salva (ou atualiza) o check-in do dia e devolve o resumo atualizado. */
export async function salvarCheckinLocal(corpo: {
  data?: string;
  treino_feito?: boolean;
  dieta_seguida?: boolean;
  agua_ml?: number;
  peso_kg?: number | null;
  observacao?: string | null;
}): Promise<ResumoDeCheckins & { checkin: CheckinDiario }> {
  const banco = lerBanco();
  const conta = exigirSessao(banco);
  // Garante a existência da lista em bancos antigos.
  if (!banco.checkins) {
    banco.checkins = [];
  }
  const data = corpo.data && /^\d{4}-\d{2}-\d{2}$/.test(corpo.data) ? corpo.data : dataDeHoje();

  // Valida a água informada.
  const aguaMl = typeof corpo.agua_ml === 'number' ? Math.round(corpo.agua_ml) : 0;
  if (aguaMl < 0 || aguaMl > 10000) {
    throw new ErroDaApi(400, 'Informe a água entre 0 e 10000 ml.');
  }
  // Valida o peso quando informado.
  if (corpo.peso_kg !== undefined && corpo.peso_kg !== null) {
    if (typeof corpo.peso_kg !== 'number' || corpo.peso_kg < LIMITES_CORPO.peso_minimo_kg || corpo.peso_kg > LIMITES_CORPO.peso_maximo_kg) {
      throw new ErroDaApi(400, `Informe um peso entre ${LIMITES_CORPO.peso_minimo_kg} e ${LIMITES_CORPO.peso_maximo_kg} kg.`);
    }
  }

  // Mantém o que já foi registrado no dia quando o campo não é enviado.
  const existente = banco.checkins.find((registro) => registro.usuario_id === conta.id && registro.data === data);
  const checkin: CheckinDiarioInterno = existente ?? {
    id: proximoId(banco),
    usuario_id: conta.id,
    data,
    treino_feito: false,
    dieta_seguida: false,
    agua_ml: 0,
    peso_kg: null,
    observacao: null,
  };
  checkin.treino_feito = corpo.treino_feito ?? checkin.treino_feito;
  checkin.dieta_seguida = corpo.dieta_seguida ?? checkin.dieta_seguida;
  checkin.agua_ml = corpo.agua_ml !== undefined ? aguaMl : checkin.agua_ml;
  checkin.peso_kg = corpo.peso_kg !== undefined ? corpo.peso_kg : checkin.peso_kg;
  checkin.observacao = corpo.observacao !== undefined ? corpo.observacao : checkin.observacao;
  if (!existente) {
    banco.checkins.push(checkin);
  }

  // Peso informado no check-in entra na evolução corporal do dia.
  if (checkin.peso_kg !== null) {
    salvarPesagemDoDiaNoBanco(banco, conta.id, data, checkin.peso_kg);
  }
  salvarBanco(banco);

  const registros = banco.checkins.filter((registro) => registro.usuario_id === conta.id);
  return {
    checkin: {
      id: checkin.id,
      data: checkin.data,
      treino_feito: checkin.treino_feito,
      dieta_seguida: checkin.dieta_seguida,
      agua_ml: checkin.agua_ml,
      peso_kg: checkin.peso_kg,
      observacao: checkin.observacao,
    },
    ...montarResumo(registros),
  };
}

/* ===========================================================================
 * PORTABILIDADE — exportar/importar o progresso entre dispositivos
 * ---------------------------------------------------------------------------
 * TEAM_001: no modo navegador os dados moram APENAS no localStorage — não
 * existe nuvem. Para não perder tudo ao trocar de dispositivo, o usuário
 * exporta um arquivo JSON (o "backup") e o importa no destino.
 *
 * Decisões:
 *  - O backup NÃO carrega ids internos (`id`, `usuario_id`): na importação
 *    cada registro ganha um id novo via `proximoId`, sem risco de colisão
 *    com contas que já existam no navegador de destino.
 *  - O hash da senha viaja no arquivo — a pessoa entra no novo dispositivo
 *    com a MESMA senha (a interface avisa para guardar o arquivo com zelo).
 *  - Se o e-mail importado já existir no navegador, a conta e os dados dela
 *    são substituídos pelo snapshot do arquivo (restauração fiel).
 *  - O aceite do termo de uso viaja junto: quem já aceitou não é barrado de
 *    novo no novo dispositivo.
 * ======================================================================== */

/** Versão atual do formato do arquivo de backup. */
const VERSAO_DO_BACKUP = 1;

/** Envelope do arquivo de backup (formato público, sem ids internos). */
interface BackupDeProgresso {
  /** Assinatura do formato: sempre "protocolfit". */
  aplicativo: 'protocolfit';
  /** Tipo do arquivo: sempre "progresso". */
  tipo: 'progresso';
  /** Versão do formato do backup (permite evoluir sem quebrar). */
  versao: number;
  /** Quando o backup foi gerado (ISO). */
  exportado_em: string;
  /** Aceite do aviso de responsabilidade gravado no navegador de origem. */
  aceite_do_termo: { versao: number; aceito_em: string } | null;
  /** Conta do usuário (com o hash — a mesma senha funciona no destino). */
  conta: { nome: string; email: string; senha_hash: string; criado_em: string };
  /** Perfil físico (sem ids — recriados na importação), ou null. */
  perfil: Omit<Perfil, 'id' | 'usuario_id'> | null;
  /** Planos do usuário — todas as versões, ativos e histórico. */
  planos: {
    tipo: 'treino' | 'dieta';
    versao: number;
    ativo: boolean;
    modelo_origem: string;
    criado_em: string;
    conteudo: string;
  }[];
  /** Pesagens registradas. */
  evolucao: { data: string; peso_kg: number }[];
  /** Check-ins diários. */
  checkins: Omit<CheckinDiarioInterno, 'id' | 'usuario_id'>[];
}

/** Resumo do backup exibido na prévia de importação (confirmação da interface). */
export interface ResumoDoBackup {
  /** Nome do dono do backup. */
  nome: string;
  /** E-mail da conta do backup. */
  email: string;
  /** Data em que o arquivo foi gerado (ISO). */
  exportado_em: string;
  /** Total de planos (treino + dieta, todas as versões). */
  total_planos: number;
  /** Total de pesagens registradas. */
  total_pesagens: number;
  /** Total de check-ins diários. */
  total_checkins: number;
  /** Indica se o backup inclui o perfil (onboarding concluído). */
  possui_perfil: boolean;
}

/** Monta o arquivo de backup do usuário logado (nome de arquivo + conteúdo JSON). */
export async function exportarProgressoLocal(): Promise<{ nomeDoArquivo: string; conteudo: string }> {
  const banco = lerBanco();
  const conta = exigirSessao(banco);

  // Lê o aceite do termo gravado neste navegador (viaja junto no backup).
  let aceiteDoTermo: BackupDeProgresso['aceite_do_termo'] = null;
  try {
    const brutoAceite = window.localStorage.getItem(CHAVE_DO_ACEITE);
    if (brutoAceite) {
      const registro = JSON.parse(brutoAceite) as { versao?: number; aceito_em?: string };
      if (typeof registro.versao === 'number' && typeof registro.aceito_em === 'string') {
        aceiteDoTermo = { versao: registro.versao, aceito_em: registro.aceito_em };
      }
    }
  } catch {
    // Aceite ilegível: segue sem ele (o destino pedirá o aceite de novo).
  }

  // Reúne SÓ os dados do usuário logado, sem os ids internos do banco.
  const perfilDoUsuario = banco.perfis.find((candidato) => candidato.usuario_id === conta.id);
  const backup: BackupDeProgresso = {
    aplicativo: 'protocolfit',
    tipo: 'progresso',
    versao: VERSAO_DO_BACKUP,
    exportado_em: new Date().toISOString(),
    aceite_do_termo: aceiteDoTermo,
    conta: {
      nome: conta.nome,
      email: conta.email,
      senha_hash: conta.senha_hash,
      criado_em: conta.criado_em,
    },
    perfil: perfilDoUsuario ? (({ id: _id, usuario_id: _dono, ...dados }) => dados)(perfilDoUsuario) : null,
    planos: banco.planos
      .filter((plano) => plano.usuario_id === conta.id)
      .map((plano) => ({
        tipo: plano.tipo,
        versao: plano.versao,
        ativo: plano.ativo,
        modelo_origem: plano.modelo_origem,
        criado_em: plano.criado_em,
        conteudo: plano.conteudo,
      })),
    evolucao: banco.evolucao
      .filter((registro) => registro.usuario_id === conta.id)
      .map((registro) => ({ data: registro.data, peso_kg: registro.peso_kg })),
    checkins: (banco.checkins ?? [])
      .filter((registro) => registro.usuario_id === conta.id)
      .map((registro) => ({
        data: registro.data,
        treino_feito: registro.treino_feito,
        dieta_seguida: registro.dieta_seguida,
        agua_ml: registro.agua_ml,
        peso_kg: registro.peso_kg,
        observacao: registro.observacao,
      })),
  };

  return {
    nomeDoArquivo: `protocolfit-progresso-${dataDeHoje()}.json`,
    conteudo: JSON.stringify(backup, null, 2),
  };
}

/**
 * Interpreta e VALIDA o texto de um arquivo de backup.
 * Devolve o objeto normalizado ou lança ErroDaApi(400) com mensagem amigável.
 * Usado tanto pela prévia (inspecionarBackupLocal) quanto pela importação.
 */
function interpretarBackup(texto: string): BackupDeProgresso {
  // 1) O conteúdo precisa ser JSON.
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    throw new ErroDaApi(400, 'Não conseguimos ler este arquivo. Escolha o backup gerado pelo ProtocolFit.');
  }
  const backup = bruto as Partial<BackupDeProgresso> | null;

  // 2) Envelope: precisa ser um backup de progresso do ProtocolFit.
  if (!backup || typeof backup !== 'object' || backup.aplicativo !== 'protocolfit' || backup.tipo !== 'progresso') {
    throw new ErroDaApi(400, 'Este arquivo não é um backup do ProtocolFit.');
  }
  // 3) Versão do formato: backups de versões mais novas são recusados.
  if (typeof backup.versao !== 'number' || backup.versao < 1) {
    throw new ErroDaApi(400, 'Este backup está incompleto ou corrompido.');
  }
  if (backup.versao > VERSAO_DO_BACKUP) {
    throw new ErroDaApi(400, 'Este backup foi criado em uma versão mais nova do ProtocolFit. Atualize este dispositivo e tente de novo.');
  }

  // 4) A conta é obrigatória: nome, e-mail válido e o hash da senha.
  const conta = backup.conta;
  if (
    !conta ||
    typeof conta.nome !== 'string' ||
    conta.nome.trim().length < 3 ||
    typeof conta.email !== 'string' ||
    !emailValido(conta.email.trim().toLowerCase()) ||
    typeof conta.senha_hash !== 'string' ||
    conta.senha_hash.length === 0 ||
    typeof conta.criado_em !== 'string'
  ) {
    throw new ErroDaApi(400, 'Este backup está incompleto ou corrompido.');
  }

  // 5) O perfil é opcional (conta criada sem onboarding), mas se existir
  //    precisa ter os campos centrais no tipo certo.
  const perfil = backup.perfil ?? null;
  if (
    perfil !== null &&
    (typeof perfil !== 'object' ||
      typeof perfil.peso_kg !== 'number' ||
      typeof perfil.altura_cm !== 'number' ||
      typeof perfil.faixa_etaria !== 'string' ||
      typeof perfil.objetivo !== 'string' ||
      typeof perfil.modalidade !== 'string' ||
      typeof perfil.frequencia_semanal !== 'number' ||
      !Array.isArray(perfil.dias_disponiveis))
  ) {
    throw new ErroDaApi(400, 'Este backup está incompleto ou corrompido.');
  }

  // 6) Planos: cada um precisa ter tipo válido e conteúdo JSON legível —
  //    um plano corrompido quebraria o painel depois, então falha aqui.
  const planosBrutos = Array.isArray(backup.planos) ? backup.planos : [];
  const planos: BackupDeProgresso['planos'] = [];
  for (const plano of planosBrutos) {
    const valido =
      plano &&
      (plano.tipo === 'treino' || plano.tipo === 'dieta') &&
      typeof plano.versao === 'number' &&
      typeof plano.ativo === 'boolean' &&
      typeof plano.modelo_origem === 'string' &&
      typeof plano.criado_em === 'string' &&
      typeof plano.conteudo === 'string';
    if (!valido) {
      throw new ErroDaApi(400, 'Este backup está incompleto ou corrompido.');
    }
    try {
      JSON.parse(plano.conteudo);
    } catch {
      throw new ErroDaApi(400, 'Este backup está incompleto ou corrompido.');
    }
    planos.push({
      tipo: plano.tipo,
      versao: plano.versao,
      ativo: plano.ativo,
      modelo_origem: plano.modelo_origem,
      criado_em: plano.criado_em,
      conteudo: plano.conteudo,
    });
  }

  // 7) Históricos (pesagens e check-ins): entradas malformadas são ignoradas
  //    em vez de derrubar a importação inteira — não são críticas.
  const evolucao: BackupDeProgresso['evolucao'] = (Array.isArray(backup.evolucao) ? backup.evolucao : [])
    .filter((registro) => registro && typeof registro.data === 'string' && typeof registro.peso_kg === 'number')
    .map((registro) => ({ data: registro.data, peso_kg: registro.peso_kg }));
  const checkins: BackupDeProgresso['checkins'] = (Array.isArray(backup.checkins) ? backup.checkins : [])
    .filter((registro) => registro && typeof registro.data === 'string')
    .map((registro) => ({
      data: registro.data,
      treino_feito: registro.treino_feito === true,
      dieta_seguida: registro.dieta_seguida === true,
      agua_ml: typeof registro.agua_ml === 'number' ? registro.agua_ml : 0,
      peso_kg: typeof registro.peso_kg === 'number' ? registro.peso_kg : null,
      observacao: typeof registro.observacao === 'string' ? registro.observacao : null,
    }));

  // 8) Aceite do termo: só viaja se tiver o formato esperado.
  const aceiteBruto = backup.aceite_do_termo;
  const aceiteDoTermo =
    aceiteBruto && typeof aceiteBruto.versao === 'number' && typeof aceiteBruto.aceito_em === 'string'
      ? { versao: aceiteBruto.versao, aceito_em: aceiteBruto.aceito_em }
      : null;

  // 9) Devolve o backup normalizado (e-mail minúsculo, nome sem espaços extras).
  return {
    aplicativo: 'protocolfit',
    tipo: 'progresso',
    versao: backup.versao,
    exportado_em: typeof backup.exportado_em === 'string' ? backup.exportado_em : '',
    aceite_do_termo: aceiteDoTermo,
    conta: {
      nome: conta.nome.trim(),
      email: conta.email.trim().toLowerCase(),
      senha_hash: conta.senha_hash,
      criado_em: conta.criado_em,
    },
    perfil,
    planos,
    evolucao,
    checkins,
  };
}

/** Lê um backup e devolve um resumo para a prévia (sem gravar nada). */
export function inspecionarBackupLocal(texto: string): ResumoDoBackup {
  const backup = interpretarBackup(texto);
  return {
    nome: backup.conta.nome,
    email: backup.conta.email,
    exportado_em: backup.exportado_em,
    total_planos: backup.planos.length,
    total_pesagens: backup.evolucao.length,
    total_checkins: backup.checkins.length,
    possui_perfil: backup.perfil !== null,
  };
}

/**
 * Importa um backup e ABRE A SESSÃO da conta restaurada.
 * Se o e-mail já existir neste navegador, os dados antigos da conta são
 * substituídos pelo snapshot do arquivo (restauração, não fusão).
 */
export async function importarProgressoLocal(texto: string): Promise<{ usuario: Usuario; possui_planos: boolean }> {
  // Valida o arquivo inteiro antes de tocar no banco.
  const backup = interpretarBackup(texto);
  const banco = lerBanco();
  const email = backup.conta.email;

  // Conta já existe neste navegador: remove ela e TODOS os dados dela —
  // a importação é uma restauração fiel do snapshot, não uma fusão.
  const existente = banco.contas.find((candidata) => candidata.email === email);
  if (existente) {
    banco.perfis = banco.perfis.filter((perfil) => perfil.usuario_id !== existente.id);
    banco.planos = banco.planos.filter((plano) => plano.usuario_id !== existente.id);
    banco.evolucao = banco.evolucao.filter((registro) => registro.usuario_id !== existente.id);
    banco.checkins = (banco.checkins ?? []).filter((registro) => registro.usuario_id !== existente.id);
    banco.contas = banco.contas.filter((candidata) => candidata.id !== existente.id);
  }

  // Recria a conta com um id novo (não colide com nada que já exista aqui).
  const contaImportada: ContaLocal = {
    id: proximoId(banco),
    nome: backup.conta.nome,
    email,
    senha_hash: backup.conta.senha_hash,
    tentativas_falhas: 0,
    bloqueado_ate: null,
    criado_em: backup.conta.criado_em,
  };
  banco.contas.push(contaImportada);

  // Perfil e coleções ganham ids novos apontando para a conta recriada.
  if (backup.perfil) {
    banco.perfis.push({ ...backup.perfil, id: proximoId(banco), usuario_id: contaImportada.id });
  }
  for (const plano of backup.planos) {
    banco.planos.push({
      id: proximoId(banco),
      usuario_id: contaImportada.id,
      tipo: plano.tipo,
      versao: plano.versao,
      ativo: plano.ativo,
      modelo_origem: plano.modelo_origem,
      criado_em: plano.criado_em,
      conteudo: plano.conteudo,
    });
  }
  for (const registro of backup.evolucao) {
    banco.evolucao.push({ id: proximoId(banco), usuario_id: contaImportada.id, data: registro.data, peso_kg: registro.peso_kg });
  }
  banco.checkins = banco.checkins ?? [];
  for (const registro of backup.checkins) {
    banco.checkins.push({ id: proximoId(banco), usuario_id: contaImportada.id, ...registro });
  }
  salvarBanco(banco);

  // Restaura o aceite do termo quando a versão do texto é a mesma —
  // quem já leu e aceitou não é barrado de novo no novo dispositivo.
  if (backup.aceite_do_termo && backup.aceite_do_termo.versao === VERSAO_DO_TERMO) {
    window.localStorage.setItem(CHAVE_DO_ACEITE, JSON.stringify(backup.aceite_do_termo));
  }

  // Abre a sessão da conta importada: o usuário continua de onde parou.
  const token = `${PREFIXO_TOKEN}${contaImportada.id}`;
  guardarToken(token);
  guardarUsuario({ id: contaImportada.id, nome: contaImportada.nome, email: contaImportada.email });

  return { usuario: usuarioPublico(contaImportada), possui_planos: backup.perfil !== null };
}
