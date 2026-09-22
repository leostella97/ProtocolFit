/**
 * api.ts
 * ---------------------------------------------------------------------------
 * Cliente HTTP do ProtocolFit — centraliza todas as chamadas à API Fastify.
 * Adiciona o token JWT automaticamente e traduz erros em mensagens amigáveis.
 * ---------------------------------------------------------------------------
 */
import type {
  OpcoesDoSistema,
  Perfil,
  PlanoCompleto,
  PlanoDieta,
  PlanoTreino,
  RegistroEvolucao,
  RespostaDeAutenticacao,
  Usuario,
} from './tipos';
import { obterToken } from './armazenamento';

/** URL base da API (configurável por variável de ambiente). */
const URL_BASE = process.env.NEXT_PUBLIC_URL_API ?? 'http://localhost:3333/api';

/** Erro de API com código HTTP — exibido de forma amigável na interface. */
export class ErroDaApi extends Error {
  /** Código de status HTTP da resposta. */
  status: number;

  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.status = status;
    this.name = 'ErroDaApi';
  }
}

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
export function cadastrarUsuario(corpo: CorpoCadastro): Promise<RespostaDeAutenticacao> {
  return chamarApi<RespostaDeAutenticacao>('/auth/cadastro', {
    method: 'POST',
    body: JSON.stringify(corpo),
  });
}

/** Autentica o usuário (com bloqueio de 3 tentativas por 5 horas no servidor). */
export function entrarUsuario(corpo: CorpoLogin): Promise<RespostaDeAutenticacao> {
  return chamarApi<RespostaDeAutenticacao>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(corpo),
  });
}

/** Busca a conta logada e o estado do onboarding. */
export function buscarContaAtual(): Promise<{ usuario: Usuario; perfil: Perfil | null; possui_planos: boolean }> {
  return chamarApi('/eu');
}

/** Busca as opções estáticas do onboarding (faixas, objetivos, modalidades...). */
export function buscarOpcoes(): Promise<OpcoesDoSistema> {
  return chamarApi('/opcoes');
}

/** Salva o perfil e gera os planos personalizados (retorna tudo pronto). */
export function salvarPerfilEGerarPlanos(corpo: CorpoPerfil): Promise<{ perfil: Perfil; treino: PlanoTreino; dieta: PlanoDieta }> {
  return chamarApi('/perfil', { method: 'POST', body: JSON.stringify(corpo) });
}

/** Recalcula os planos usando a evolução física mais recente. */
export function recalcularPlanos(): Promise<{ perfil: Perfil; treino: PlanoTreino; dieta: PlanoDieta }> {
  return chamarApi('/perfil/recalcular', { method: 'POST' });
}

/** Busca o plano vigente completo (perfil + treino + dieta). */
export function buscarPlanoAtual(): Promise<PlanoCompleto> {
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
export function editarExercicio(planoId: number, corpo: CorpoEdicaoExercicio): Promise<PlanoTreino> {
  return chamarApi(`/plano/treino/${planoId}`, { method: 'PATCH', body: JSON.stringify(corpo) });
}

/** Corpo da substituição de um alimento da dieta. */
export interface CorpoSubstituicao {
  refeicao_indice: number;
  item_indice: number;
  alternativa_nome: string;
}

/** Substitui um alimento por um substituto equivalente na CÓPIA do usuário. */
export function substituirAlimento(planoId: number, corpo: CorpoSubstituicao): Promise<PlanoDieta> {
  return chamarApi(`/plano/dieta/${planoId}/substituir`, { method: 'PATCH', body: JSON.stringify(corpo) });
}

/** Registra uma pesagem na evolução corporal. */
export function registrarPesagem(pesoKg: number, data?: string): Promise<RegistroEvolucao> {
  return chamarApi('/evolucao', { method: 'POST', body: JSON.stringify({ peso_kg: pesoKg, data }) });
}

/** Lista o histórico de pesagens (gráfico de evolução). */
export function listarEvolucao(): Promise<RegistroEvolucao[]> {
  return chamarApi('/evolucao');
}
