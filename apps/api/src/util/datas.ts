/**
 * datas.ts — utilitários de datas civis (AAAA-MM-DD)
 * ---------------------------------------------------------------------------
 * As datas civis do domínio (check-ins, pesagens) são strings no padrão
 * AAAA-MM-DD, compartilhadas com o navegador. Este módulo é a fonte única de
 * validação de formato e da regra "data não pode estar no futuro".
 * ---------------------------------------------------------------------------
 */

/** Padrão do formato de data civil aceito pela API (AAAA-MM-DD). */
const PADRAO_DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Data de hoje em UTC no formato AAAA-MM-DD (referência do servidor). */
export function hojeEmTexto(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Data de amanhã em UTC. Usada como limite para datas futuras: o cliente pode
 * estar até ~14 horas à frente do UTC (fusos como Samoa/Line Islands), então
 * aceitar "amanhã UTC" cobre qualquer "hoje" legítimo do lado do cliente.
 */
export function amanhaEmTexto(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * Verifica se a string está no formato AAAA-MM-DD e representa uma data real
 * (rejeita 2025-02-30, por exemplo).
 */
export function dataValida(data: unknown): data is string {
  return typeof data === 'string' && PADRAO_DATA.test(data) && !Number.isNaN(Date.parse(`${data}T00:00:00Z`));
}

/** Verifica se a data civil ultrapassa o limite aceito (amanhã em UTC). */
export function dataNoFuturo(data: string): boolean {
  return data > amanhaEmTexto();
}
