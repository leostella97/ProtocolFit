/**
 * api.ts
 * ---------------------------------------------------------------------------
 * Cliente de dados do ProtocolFit — funciona em DOIS MODOS:
 *
 *  1) MODO SERVIDOR (padrão): conversa com a API Fastify + SQLite e envia o
 *     token JWT automaticamente.
 *  2) MODO NAVEGADOR (NEXT_PUBLIC_MODO_LOCAL=true): usa o motor determinístico
 *     e o armazenamento local do navegador — é o modo usado no site publicado
 *     no GitHub Pages, onde não existe servidor.
 *
 * A interface (telas) chama SEMPRE as mesmas funções; o modo é transparente.
 * ---------------------------------------------------------------------------
 */
import type {
  CheckinDiario,
  OpcoesDoSistema,
  Perfil,
  PlanoCompleto,
  PlanoDieta,
  PlanoTreino,
  RegistroEvolucao,
  RespostaDeAutenticacao,
  ResumoDeCheckins,
  Usuario,
} from './tipos';
import { obterToken } from './armazenamento';
import { ErroDaApi } from './erro-api';
import * as local from './repositorio-local';

// Reexporta o erro para que as telas continuem importando de '@/lib/api'.
export { ErroDaApi };

/** Indica se o sistema está rodando no modo navegador (site estático). */
export const MODO_LOCAL = process.env.NEXT_PUBLIC_MODO_LOCAL === 'true';

/** URL base da API (configurável por variável de ambiente). */
const URL_BASE = process.env.NEXT_PUBLIC_URL_API ?? 'http://localhost:3333/api';

/** Executa uma chamada HTTP à API com headers e tratamento de erro padronizados. */
async function chamarApi<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  // Recupera o token de sessão (se existir).
  const token = obterToken();
  // Monta os headers: SEMPRE JSON (o servidor aceita corpo vazio no parser
  // tolerante) + Authorization Bearer quando autenticado.
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  // Executa a requisição.
  const resposta = await fetch(`${URL_BASE}${caminho}`, { ...opcoes, headers });
  // Interpreta o corpo (a API sempre responde JSON).
  const dados = (await resposta.json().catch(() => null)) as { mensagem?: string } | null;
  // Em erro, lança exceção com a mensagem vinda do servidor.
  if (!resposta.ok) {
    throw new ErroDaApi(resposta.status, dados?.mensagem ?? 'Erro inesperado. Tente novamente.');
  }
  return dados as T;
}

/** Corpo do cadastro de usuário. */
interface CorpoCadastro {
  nome: string;
  email: string;
  senha: string;
}

/** Corpo do login. */
interface CorpoLogin {
  email: string;
  senha: string;
}

/** Corpo do perfil enviado no onboarding. */
export interface CorpoPerfil {
  sexo: Perfil['sexo'];
  faixa_etaria: string;
  peso_kg: number;
  altura_cm: number;
  objetivo: Perfil['objetivo'];
  frequencia_semanal: number;
  dias_disponiveis: string[];
  modalidade: Perfil['modalidade'];
  nivel?: Perfil['nivel'];
}

/** Cria a conta do usuário e devolve token + dados públicos. */
export async function cadastrarUsuario(corpo: CorpoCadastro): Promise<RespostaDeAutenticacao> {
  // Modo navegador: cria a conta no armazenamento local.
  if (MODO_LOCAL) {
    return local.cadastrarLocal(corpo);
  }
  return chamarApi<RespostaDeAutenticacao>('/auth/cadastro', {
    method: 'POST',
    body: JSON.stringify(corpo),
  });
}

/** Autentica o usuário (com bloqueio de 3 tentativas por 5 horas). */
export async function entrarUsuario(corpo: CorpoLogin): Promise<RespostaDeAutenticacao> {
  // Modo navegador: valida a senha no armazenamento local.
  if (MODO_LOCAL) {
    return local.entrarLocal(corpo);
  }
  return chamarApi<RespostaDeAutenticacao>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(corpo),
  });
}

/** Busca a conta logada e o estado do onboarding. */
export async function buscarContaAtual(): Promise<{ usuario: Usuario; perfil: Perfil | null; possui_planos: boolean }> {
  if (MODO_LOCAL) {
    return local.buscarContaLocal();
  }
  return chamarApi('/eu');
}

/** Busca as opções estáticas do onboarding (faixas, objetivos, modalidades...). */
export async function buscarOpcoes(): Promise<OpcoesDoSistema> {
  if (MODO_LOCAL) {
    return local.buscarOpcoesLocal();
  }
  return chamarApi('/opcoes');
}

/** Salva o perfil e gera os planos personalizados (retorna tudo pronto). */
export async function salvarPerfilEGerarPlanos(corpo: CorpoPerfil): Promise<{ perfil: Perfil; treino: PlanoTreino; dieta: PlanoDieta }> {
  if (MODO_LOCAL) {
    return local.salvarPerfilEGerarPlanosLocal(corpo);
  }
  return chamarApi('/perfil', { method: 'POST', body: JSON.stringify(corpo) });
}

/** Recalcula os planos usando a evolução física mais recente. */
export async function recalcularPlanos(): Promise<{ perfil: Perfil; treino: PlanoTreino; dieta: PlanoDieta }> {
  if (MODO_LOCAL) {
    return local.recalcularPlanosLocal();
  }
  return chamarApi('/perfil/recalcular', { method: 'POST' });
}

/** Busca o plano vigente completo (perfil + treino + dieta). */
export async function buscarPlanoAtual(): Promise<PlanoCompleto> {
  if (MODO_LOCAL) {
    return local.buscarPlanoAtualLocal();
  }
  return chamarApi('/plano/atual');
}

/** Corpo da edição de um exercício do treino. */
export interface CorpoEdicaoExercicio {
  dia_indice: number;
  exercicio_indice: number;
  series?: number;
  repeticoes?: number;
  carga_kg?: number | null;
}

/** Edita séries/repetições/carga de um exercício na CÓPIA do usuário. */
export async function editarExercicio(planoId: number, corpo: CorpoEdicaoExercicio): Promise<PlanoTreino> {
  if (MODO_LOCAL) {
    return local.editarExercicioLocal(planoId, corpo);
  }
  return chamarApi(`/plano/treino/${planoId}`, { method: 'PATCH', body: JSON.stringify(corpo) });
}

/** Corpo da substituição de um alimento da dieta. */
export interface CorpoSubstituicao {
  refeicao_indice: number;
  item_indice: number;
  alternativa_nome: string;
}

/** Substitui um alimento por um substituto equivalente na CÓPIA do usuário. */
export async function substituirAlimento(planoId: number, corpo: CorpoSubstituicao): Promise<PlanoDieta> {
  if (MODO_LOCAL) {
    return local.substituirAlimentoLocal(planoId, corpo);
  }
  return chamarApi(`/plano/dieta/${planoId}/substituir`, { method: 'PATCH', body: JSON.stringify(corpo) });
}

/** Registra uma pesagem na evolução corporal. */
export async function registrarPesagem(pesoKg: number, data?: string): Promise<RegistroEvolucao> {
  if (MODO_LOCAL) {
    return local.registrarPesagemLocal(pesoKg, data);
  }
  return chamarApi('/evolucao', { method: 'POST', body: JSON.stringify({ peso_kg: pesoKg, data }) });
}

/** Lista o histórico de pesagens (gráfico de evolução). */
export async function listarEvolucao(): Promise<RegistroEvolucao[]> {
  if (MODO_LOCAL) {
    return local.listarEvolucaoLocal();
  }
  return chamarApi('/evolucao');
}

/** Corpo da atualização de peso/altura feita direto no painel. */
export interface CorpoAtualizacaoDoCorpo {
  /** Novo peso em kg (opcional). */
  peso_kg?: number;
  /** Nova altura em cm (opcional). */
  altura_cm?: number;
}

/** Altera peso e/ou altura do perfil SEM regenerar os planos. */
export async function atualizarCorpo(corpo: CorpoAtualizacaoDoCorpo): Promise<{ perfil: Perfil; mensagem: string }> {
  if (MODO_LOCAL) {
    return local.atualizarCorpoLocal(corpo);
  }
  return chamarApi('/perfil/corpo', { method: 'PATCH', body: JSON.stringify(corpo) });
}

/** Corpo do check-in diário. */
export interface CorpoCheckin {
  /** Dia do check-in (padrão: hoje). */
  data?: string;
  /** Treino concluído no dia. */
  treino_feito?: boolean;
  /** Dieta seguida no dia. */
  dieta_seguida?: boolean;
  /** Água bebida no dia (ml). */
  agua_ml?: number;
  /** Peso do dia (opcional). */
  peso_kg?: number | null;
  /** Anotação livre (opcional). */
  observacao?: string | null;
}

/** Busca o resumo dos check-ins (sequência atual, recorde e histórico). */
export async function buscarCheckins(): Promise<ResumoDeCheckins> {
  if (MODO_LOCAL) {
    return local.buscarCheckinsLocal();
  }
  return chamarApi('/checkin');
}

/** Salva (ou atualiza) o check-in do dia e devolve o resumo atualizado. */
export async function salvarCheckin(corpo: CorpoCheckin): Promise<ResumoDeCheckins & { checkin: CheckinDiario }> {
  if (MODO_LOCAL) {
    return local.salvarCheckinLocal(corpo);
  }
  return chamarApi('/checkin', { method: 'POST', body: JSON.stringify(corpo) });
}
