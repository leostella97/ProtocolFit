/**
 * termo-de-uso.ts
 * ---------------------------------------------------------------------------
 * Regras de ACEITE do aviso de responsabilidade do ProtocolFit.
 *
 * Este módulo é intencionalmente "puro" (sem React) para poder ser usado
 * tanto pela interface quanto pelo repositório local do navegador — que
 * IMPEDE a geração de planos enquanto o termo não for aceito.
 * ---------------------------------------------------------------------------
 */

/** Versão do texto do termo — trocar a versão invalida aceites anteriores. */
export const VERSAO_DO_TERMO = 1;

/** Chave do aceite no armazenamento do navegador. */
export const CHAVE_DO_ACEITE = 'protocolfit_termo_aceito';

/** Nome do evento que reabre o aviso (disparado pelo botão "Termo de uso"). */
export const EVENTO_ABRIR_TERMO = 'protocolfit:abrir-termo';

/** Verifica se o termo (na versão atual) já foi aceito neste navegador. */
export function termoFoiAceito(): boolean {
  // Fora do navegador não há como verificar: considera não aceito.
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    const bruto = window.localStorage.getItem(CHAVE_DO_ACEITE);
    if (!bruto) {
      return false;
    }
    const registro = JSON.parse(bruto) as { versao?: number };
    // Aceite de uma versão antiga do texto exige novo aceite.
    return registro.versao === VERSAO_DO_TERMO;
  } catch {
    return false;
  }
}

/** Grava o aceite do termo no navegador (com data e versão). */
export function registrarAceiteDoTermo(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(
    CHAVE_DO_ACEITE,
    JSON.stringify({ versao: VERSAO_DO_TERMO, aceito_em: new Date().toISOString() }),
  );
}

/** Abre o aviso novamente (usado pelo botão "Termo de uso" da barra lateral). */
export function abrirTermoDeUso(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVENTO_ABRIR_TERMO));
  }
}
