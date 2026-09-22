/**
 * sequenciaDeCheckins.ts
 * ---------------------------------------------------------------------------
 * Cálculo da SEQUÊNCIA (streak) de check-ins diários do ProtocolFit.
 *
 * Regras (determinísticas e fáceis de explicar ao usuário):
 *  - "Dia cumprido" = o usuário marcou o treino OU seguiu a dieta naquele dia.
 *  - A sequência atual conta os dias consecutivos terminando HOJE; se hoje
 *    ainda não teve check-in, ela continua válida até o fim do dia (contando
 *    a partir de ontem), para não "punir" quem ainda não registrou.
 *  - A sequência máxima é o maior bloco consecutivo já alcançado.
 * ---------------------------------------------------------------------------
 */
import type { CheckinDiario, ResumoDeCheckins } from '../tipos.js';

/** Milissegundos de um dia (usado para percorrer datas). */
const UM_DIA_MS = 24 * 60 * 60 * 1000;

/** Converte uma data AAAA-MM-DD para um número (dias desde 1970). */
function paraNumeroDeDias(data: string): number {
  return Math.floor(new Date(`${data}T00:00:00Z`).getTime() / UM_DIA_MS);
}

/** Converte um número de dias (desde 1970) de volta para AAAA-MM-DD. */
function paraData(numeroDeDias: number): string {
  return new Date(numeroDeDias * UM_DIA_MS).toISOString().slice(0, 10);
}

/** Data de hoje no formato AAAA-MM-DD. */
export function hojeEmTexto(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Verifica se um check-in conta como "dia cumprido". */
export function diaCumprido(checkin: CheckinDiario): boolean {
  return checkin.treino_feito || checkin.dieta_seguida;
}

/** Calcula o resumo completo dos check-ins (hoje, sequências e histórico). */
export function montarResumoDeCheckins(registros: CheckinDiario[]): ResumoDeCheckins {
  // Datas cumpridas em ordem crescente e sem repetição.
  const diasCumpridos = registros.filter(diaCumprido).map((registro) => registro.data).sort();
  const conjuntoDeDias = new Set(diasCumpridos);

  // ---- Sequência máxima: maior bloco de dias consecutivos ----------------
  let sequenciaMaxima = 0;
  let sequenciaCorrente = 0;
  let diaAnterior: number | null = null;
  for (const data of diasCumpridos) {
    const numeroDoDia = paraNumeroDeDias(data);
    // Continua a sequência quando o dia é exatamente o seguinte.
    sequenciaCorrente = diaAnterior !== null && numeroDoDia === diaAnterior + 1 ? sequenciaCorrente + 1 : 1;
    sequenciaMaxima = Math.max(sequenciaMaxima, sequenciaCorrente);
    diaAnterior = numeroDoDia;
  }

  // ---- Sequência atual: conta de trás para frente a partir de hoje -------
  const hoje = paraNumeroDeDias(hojeEmTexto());
  // Se hoje ainda não foi cumprido, a contagem começa em ontem.
  let cursor = conjuntoDeDias.has(paraData(hoje)) ? hoje : hoje - 1;
  let sequenciaAtual = 0;
  while (conjuntoDeDias.has(paraData(cursor))) {
    sequenciaAtual += 1;
    cursor -= 1;
  }

  return {
    hoje: registros.find((registro) => registro.data === hojeEmTexto()) ?? null,
    // Os registros já chegam ordenados do mais recente para o mais antigo.
    registros,
    sequencia_atual: sequenciaAtual,
    sequencia_maxima: sequenciaMaxima,
    total: registros.length,
    // Últimos 30 dias cumpridos (usado no mini histórico do painel).
    dias_cumpridos: diasCumpridos.slice(-30),
  };
}
