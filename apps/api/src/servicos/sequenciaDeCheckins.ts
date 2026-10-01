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
// TEAM_007: hojeEmTexto mora em util/datas.ts — fonte única das datas civis.
import { hojeEmTexto } from '../util/datas.js';

/** Milissegundos de um dia (usado para percorrer datas). */
const UM_DIA_MS = 24 * 60 * 60 * 1000;

/** TEAM_007: quantidade máxima de registros devolvidos no resumo ao cliente. */
const LIMITE_DE_REGISTROS = 60;

/** Converte uma data AAAA-MM-DD para um número (dias desde 1970). */
function paraNumeroDeDias(data: string): number {
  return Math.floor(new Date(`${data}T00:00:00Z`).getTime() / UM_DIA_MS);
}

/** Converte um número de dias (desde 1970) de volta para AAAA-MM-DD. */
function paraData(numeroDeDias: number): string {
  return new Date(numeroDeDias * UM_DIA_MS).toISOString().slice(0, 10);
}

/** Verifica se um check-in conta como "dia cumprido". */
function diaCumprido(checkin: CheckinDiario): boolean {
  return checkin.treino_feito || checkin.dieta_seguida;
}

/**
 * Calcula o resumo completo dos check-ins (hoje, sequências e histórico).
 *
 * TEAM_001: "hoje" é o DIA CIVIL DO CLIENTE — o servidor não sabe o fuso do
 * usuário, então a rota aceita ?hoje=AAAA-MM-DD. Sem o parâmetro, cai no
 * fallback `hojeEmTexto()` (UTC do servidor).
 *
 * TEAM_007: as métricas (sequência atual/máxima e total) são calculadas sobre
 * o histórico COMPLETO — a rota não limita mais a leitura a 60 linhas, porque
 * um streak de 90 dias era contado errado. Só o campo `registros` é fatiado
 * para não inflar a resposta (mesma regra do repositório local do navegador).
 */
export function montarResumoDeCheckins(registros: CheckinDiario[], referenciaDeHoje?: string): ResumoDeCheckins {
  // Dia civil usado para "hoje" e para a sequência atual.
  const hojeTexto = referenciaDeHoje ?? hojeEmTexto();
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
  const hoje = paraNumeroDeDias(hojeTexto);
  // Se hoje ainda não foi cumprido, a contagem começa em ontem.
  let cursor = conjuntoDeDias.has(paraData(hoje)) ? hoje : hoje - 1;
  let sequenciaAtual = 0;
  while (conjuntoDeDias.has(paraData(cursor))) {
    sequenciaAtual += 1;
    cursor -= 1;
  }

  return {
    hoje: registros.find((registro) => registro.data === hojeTexto) ?? null,
    // Os registros já chegam ordenados do mais recente para o mais antigo;
    // só os mais recentes viajam na resposta (as métricas usam a lista cheia).
    registros: registros.slice(0, LIMITE_DE_REGISTROS),
    sequencia_atual: sequenciaAtual,
    sequencia_maxima: sequenciaMaxima,
    total: registros.length,
    // Últimos 30 dias cumpridos (usado no mini histórico do painel).
    dias_cumpridos: diasCumpridos.slice(-30),
  };
}
