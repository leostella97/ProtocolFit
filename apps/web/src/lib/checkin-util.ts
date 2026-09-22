/**
 * checkin-util.ts
 * ---------------------------------------------------------------------------
 * Utilitários do CHECK-IN DIÁRIO no frontend.
 *
 * As datas do sistema são sempre strings no formato AAAA-MM-DD (mesmo padrão
 * usado no backend), o que evita problemas de fuso horário e facilita a
 * comparação direta entre dias.
 * ---------------------------------------------------------------------------
 */

/** Um dia do mini histórico do check-in. */
export interface DiaDoHistorico {
  /** Data no formato AAAA-MM-DD. */
  data: string;
  /** Letra do dia da semana exibida no círculo (D, S, T, Q...). */
  rotulo: string;
  /** Indica se o dia teve check-in cumprido. */
  cumprido: boolean;
}

/** Iniciais dos dias da semana na ordem do JavaScript (0 = domingo). */
const INICIAIS_DOS_DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/** Devolve a data de hoje no formato AAAA-MM-DD (fuso local). */
export function hojeLocal(): string {
  // Ajusta o fuso para que a data seja a do relógio do usuário.
  const agora = new Date();
  const deslocamento = agora.getTimezoneOffset() * 60 * 1000;
  return new Date(agora.getTime() - deslocamento).toISOString().slice(0, 10);
}

/**
 * Monta a lista dos últimos N dias (do mais antigo para o mais recente),
 * marcando quais foram cumpridos — é o mini histórico exibido no painel.
 */
export function separadorDeDatas(diasCumpridos: string[], quantidade = 7): DiaDoHistorico[] {
  // Conjunto para consulta rápida (O(1) por dia).
  const conjunto = new Set(diasCumpridos);
  const hoje = new Date(`${hojeLocal()}T00:00:00Z`).getTime();
  const dias: DiaDoHistorico[] = [];
  // Percorre de (quantidade - 1) dias atrás até hoje.
  for (let recuo = quantidade - 1; recuo >= 0; recuo -= 1) {
    const data = new Date(hoje - recuo * 24 * 60 * 60 * 1000);
    const texto = data.toISOString().slice(0, 10);
    dias.push({
      data: texto,
      rotulo: INICIAIS_DOS_DIAS[data.getUTCDay()],
      cumprido: conjunto.has(texto),
    });
  }
  return dias;
}
