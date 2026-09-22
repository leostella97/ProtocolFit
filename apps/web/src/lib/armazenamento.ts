/**
 * armazenamento.ts
 * ---------------------------------------------------------------------------
 * Gerenciamento da sessão no navegador (token JWT e dados do usuário).
 * Usa localStorage por simplicidade de desenvolvimento; em produção a
 * recomendação é armazenar o token em cookie httpOnly + middleware.
 * ---------------------------------------------------------------------------
 */

/** Chave do token no localStorage. */
const CHAVE_TOKEN = 'protocolfit_token';

/** Chave dos dados do usuário no localStorage. */
const CHAVE_USUARIO = 'protocolfit_usuario';

/** Guarda o token JWT da sessão. */
export function guardarToken(token: string): void {
  localStorage.setItem(CHAVE_TOKEN, token);
}

/** Lê o token JWT da sessão (null quando deslogado). */
export function obterToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(CHAVE_TOKEN);
}

/** Guarda os dados públicos do usuário logado. */
export function guardarUsuario(usuario: unknown): void {
  localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
}

/** Lê os dados públicos do usuário logado. */
export function obterUsuario(): { id: number; nome: string; email: string } | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const bruto = localStorage.getItem(CHAVE_USUARIO);
  if (!bruto) {
    return null;
  }
  try {
    return JSON.parse(bruto) as { id: number; nome: string; email: string };
  } catch {
    return null;
  }
}

/** Verifica se existe uma sessão ativa no navegador. */
export function possuiSessao(): boolean {
  return obterToken() !== null;
}

/** Encerra a sessão removendo token e dados do usuário. */
export function encerrarSessao(): void {
  localStorage.removeItem(CHAVE_TOKEN);
  localStorage.removeItem(CHAVE_USUARIO);
}
