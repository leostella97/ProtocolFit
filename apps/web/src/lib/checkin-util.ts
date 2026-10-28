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

/** Situação de um dia no calendário de check-ins. */
export type EstadoDoDiaNoCalendario =
  // Célula de preenchimento antes/depois do mês.
  | 'fora_do_mes'
  // Dia ainda não chegou (não dá para fazer check-in do futuro).
  | 'futuro'
  // Dia passado/hoje sem nenhum check-in registrado.
  | 'sem_checkin'
  // Check-in existe, mas sem treino nem dieta marcados (não conta na sequência).
  | 'registrado'
  // Dia cumprido: treino feito OU dieta seguida (conta na sequência).
  | 'cumprido';

/** Uma célula da grade mensal do calendário de check-ins. */
export interface CelulaDoCalendario {
  /** Data no formato AAAA-MM-DD ('' nas células de preenchimento). */
  data: string;
  /** Número do dia exibido (null nas células de preenchimento). */
  dia: number | null;
  /** Situação do dia (ver EstadoDoDiaNoCalendario). */
  estado: EstadoDoDiaNoCalendario;
}

/** Check-in mínimo necessário para montar o calendário. */
export interface CheckinParaCalendario {
  /** Dia do check-in (AAAA-MM-DD). */
  data: string;
  /** Treino concluído. */
  treino_feito: boolean;
  /** Dieta seguida. */
  dieta_seguida: boolean;
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

/** Padrão do formato de data civil aceito pelo sistema (AAAA-MM-DD). */
const PADRAO_DATA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * TEAM_007: verifica se o valor é uma data civil REAL no formato AAAA-MM-DD
 * (rejeita "2025-02-30"). Mesma regra de apps/api/src/util/datas.ts.
 */
export function dataValida(data: unknown): data is string {
  return typeof data === 'string' && PADRAO_DATA.test(data) && !Number.isNaN(Date.parse(`${data}T00:00:00Z`));
}

/** Devolve a data de AMANHÃ no formato AAAA-MM-DD (fuso local). */
export function amanhaLocal(): string {
  // Um dia a frente do relógio do usuário, medido no fuso local.
  const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const deslocamento = amanha.getTimezoneOffset() * 60 * 1000;
  return new Date(amanha.getTime() - deslocamento).toISOString().slice(0, 10);
}

/**
 * TEAM_007: indica se a data civil está no futuro — check-in e pesagem
 * futuros não fazem sentido no domínio. Tolerância de um dia para fusos
 * (alinhada à regra do servidor, que aceita até "amanhã" em UTC).
 */
export function dataNoFuturo(data: string): boolean {
  return data > amanhaLocal();
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

/**
 * Monta a grade do calendário de um mês (semanas de 7 células, começando no
 * domingo), marcando cada dia como cumprido/registrado/sem check-in/futuro.
 *
 * Função pura: recebe os check-ins conhecidos e a data de hoje, o que a torna
 * fácil de testar e isenta do relógio do sistema.
 */
export function montarCalendarioDoMes(
  ano: number,
  mes: number,
  checkins: CheckinParaCalendario[],
  hoje: string = hojeLocal(),
): CelulaDoCalendario[][] {
  // Mapa data → check-in para consulta rápida.
  const porData = new Map<string, CheckinParaCalendario>();
  for (const checkin of checkins) {
    porData.set(checkin.data, checkin);
  }

  // Quantos dias tem o mês (dia 0 do mês seguinte = último dia deste mês).
  const totalDeDias = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  // Dia da semana do 1º do mês (0 = domingo) — define o preenchimento inicial.
  const primeiroDiaDaSemana = new Date(Date.UTC(ano, mes, 1)).getUTCDay();

  // Lista linear de células: preenchimento + dias do mês.
  const celulas: CelulaDoCalendario[] = [];
  for (let vazio = 0; vazio < primeiroDiaDaSemana; vazio += 1) {
    celulas.push({ data: '', dia: null, estado: 'fora_do_mes' });
  }
  for (let dia = 1; dia <= totalDeDias; dia += 1) {
    const data = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const checkin = porData.get(data);
    let estado: EstadoDoDiaNoCalendario;
    if (data > hoje) {
      estado = 'futuro';
    } else if (!checkin) {
      estado = 'sem_checkin';
    } else {
      estado = checkin.treino_feito || checkin.dieta_seguida ? 'cumprido' : 'registrado';
    }
    celulas.push({ data, dia, estado });
  }
  // Completa a última semana com células de preenchimento.
  while (celulas.length % 7 !== 0) {
    celulas.push({ data: '', dia: null, estado: 'fora_do_mes' });
  }

  // Agrupa em semanas de 7 células.
  const semanas: CelulaDoCalendario[][] = [];
  for (let indice = 0; indice < celulas.length; indice += 7) {
    semanas.push(celulas.slice(indice, indice + 7));
  }
  return semanas;
}

/* ===========================================================================
 * LÍQUIDO DO DIA (agua_ml do check-in)
 * ---------------------------------------------------------------------------
 * TEAM_017: o check-in guarda o total de líquido do dia e dois lugares o
 * alimentam — o campo editável do cartão de check-in (valor absoluto) e o
 * formulário do treino (INCREMENTO sobre o total atual). As regras de soma
 * e do teto diário ficam aqui, única fonte usada pelas duas telas.
 * ======================================================================== */

/** Limite máximo de líquido aceito por dia (ml) — trava anti-digitação. */
export const AGUA_MAXIMA_ML = 10000;

/** Resultado da soma de líquido do dia: total novo ou mensagem de erro. */
export type ResultadoDaSomaDeAgua =
  | { ok: true; totalMl: number }
  | { ok: false; erro: string };

/**
 * TEAM_017: soma um incremento de líquido sobre o total atual do dia.
 * Função pura — recebe os dois valores e devolve o novo total ou o motivo
 * da recusa (incremento inválido ou estouro do teto diário, sem truncar
 * em silêncio).
 */
export function somarAguaDoDia(totalAtualMl: number, adicionalMl: number): ResultadoDaSomaDeAgua {
  // O incremento precisa ser um número finito e positivo.
  if (!Number.isFinite(adicionalMl) || adicionalMl <= 0) {
    return { ok: false, erro: 'Informe uma quantidade de líquido maior que zero.' };
  }
  // Ambos são arredondados: o campo do check-in guarda mililitros inteiros.
  const totalMl = Math.round(totalAtualMl) + Math.round(adicionalMl);
  // Estourar o teto é erro explícito — o usuário decide, não o sistema.
  if (totalMl > AGUA_MAXIMA_ML) {
    return { ok: false, erro: `O total do dia ficaria acima de ${AGUA_MAXIMA_ML} ml.` };
  }
  return { ok: true, totalMl };
}
