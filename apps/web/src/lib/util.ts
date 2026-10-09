/**
 * util.ts
 * ---------------------------------------------------------------------------
 * Utilitários gerais do frontend do ProtocolFit.
 * ---------------------------------------------------------------------------
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Modalidade, Objetivo, VariacaoDeTreino } from './tipos';

/** Combina classes Tailwind resolvendo conflitos (padrão shadcn/ui). */
export function combinarClasses(...entradas: ClassValue[]): string {
  return twMerge(clsx(entradas));
}

/**
 * TEAM_007: estilos (variações) de treino que servem para a combinação
 * modalidade + objetivo + quantidade de dias — padrão primeiro, demais em
 * ordem alfabética. Fonte única usada por onboarding e perfil.
 */
export function variacoesDaCombinacao(
  variacoes: VariacaoDeTreino[],
  modalidade: Modalidade,
  objetivo: Objetivo,
  dias: number,
): VariacaoDeTreino[] {
  return variacoes
    .filter(
      (estilo) =>
        estilo.modalidade === modalidade && estilo.objetivo === objetivo && estilo.dias === dias,
    )
    .sort((primeiro, segundo) => {
      // O estilo padrão é sempre a primeira opção da lista.
      if (primeiro.id === 'padrao') {
        return -1;
      }
      if (segundo.id === 'padrao') {
        return 1;
      }
      return primeiro.nome.localeCompare(segundo.nome, 'pt-BR');
    });
}

/** Formata uma data ISO (AAAA-MM-DD) para o padrão brasileiro (DD/MM/AAAA). */
export function formatarData(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Formata um número com vírgula decimal brasileira e uma casa. */
export function formatarDecimal(valor: number): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** TEAM_007: formata segundos como "mm:ss" (visor do timer de descanso). */
export function formatarMinutosSegundos(totalSegundos: number): string {
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
}

/**
 * TEAM_008: alvo textual do exercício. Musculação mostra "séries × reps";
 * no grupo cardio os campos carregam TEMPO/DISTÂNCIA — 1 série é trabalho
 * contínuo (a faixa é em minutos) e várias séries são tiros (faixa em
 * segundos por tiro). A distância, quando presente, vem primeiro.
 */
export function formatarAlvoDoExercicio(exercicio: {
  grupo: string;
  series: number;
  repeticoes_min: number;
  repeticoes_max: number;
  distancia_km?: number | null;
}): string {
  if (exercicio.grupo !== 'cardio') {
    return exercicio.repeticoes_min === exercicio.repeticoes_max
      ? `${exercicio.series}×${exercicio.repeticoes_min}`
      : `${exercicio.series}×${exercicio.repeticoes_min}–${exercicio.repeticoes_max}`;
  }
  const partes: string[] = [];
  if (typeof exercicio.distancia_km === 'number' && exercicio.distancia_km > 0) {
    partes.push(`${formatarDecimal(exercicio.distancia_km)} km`);
  }
  if (exercicio.series > 1) {
    // Intervalado: a faixa guarda os SEGUNDOS de cada tiro.
    const porTiro =
      exercicio.repeticoes_min === exercicio.repeticoes_max
        ? `${exercicio.repeticoes_min} s`
        : `${exercicio.repeticoes_min}–${exercicio.repeticoes_max} s`;
    partes.push(`${exercicio.series} tiros de ${porTiro}`);
  } else {
    // Contínuo: a faixa guarda os MINUTOS do alvo ("1–1" = sem tempo-alvo).
    const semTempo = exercicio.repeticoes_min <= 1 && exercicio.repeticoes_max <= 1;
    if (!semTempo) {
      partes.push(
        exercicio.repeticoes_min === exercicio.repeticoes_max
          ? `${exercicio.repeticoes_min} min`
          : `${exercicio.repeticoes_min}–${exercicio.repeticoes_max} min`,
      );
    }
  }
  return partes.join(' · ') || 'tempo livre';
}

/** Rótulo amigável de um objetivo. */
export function rotuloDoObjetivo(objetivo: string): string {
  const rotulos: Record<string, string> = {
    emagrecimento: 'Emagrecimento',
    hipertrofia: 'Hipertrofia',
    corrida: 'Corrida',
    luta: 'Luta',
  };
  return rotulos[objetivo] ?? objetivo;
}

/**
 * TEAM_012: rótulo legível do músculo-alvo derivado por musculoAlvoDoExercicio
 * — usado no seletor de troca ("Trocar exercício (quadríceps)").
 * Grupos não fatiados aparecem com o próprio nome do grupo.
 */
export function rotuloDoMusculo(musculo: string): string {
  const rotulos: Record<string, string> = {
    quadriceps: 'quadríceps',
    posterior_de_coxa: 'posterior de coxa',
    gluteos: 'glúteos',
    adutores: 'adutores/glúteos médios',
    deltoide_anterior: 'deltoide anterior',
    deltoide_lateral: 'deltoide lateral',
    deltoide_posterior: 'deltoide posterior',
    reto_abdominal: 'reto abdominal',
    obliquos: 'oblíquos',
    core_estabilizacao: 'core estabilizador',
    peito: 'peito',
    costas: 'costas',
    biceps: 'bíceps',
    triceps: 'tríceps',
    panturrilha: 'panturrilha',
    trapezio: 'trapézio',
    lombar: 'lombar',
    corpointeiro: 'corpo inteiro',
    pliometria: 'pliometria',
    cardio: 'cardio',
    mobilidade: 'mobilidade',
    tecnica: 'técnica',
    respiracao: 'respiração',
    equilibrio: 'equilíbrio',
    posterior: 'posterior',
  };
  return rotulos[musculo] ?? musculo;
}

/** Rótulo amigável de uma modalidade. */
export function rotuloDaModalidade(modalidade: string): string {
  const rotulos: Record<string, string> = {
    academia: 'Academia',
    pesocorporal: 'Peso do corpo',
  };
  return rotulos[modalidade] ?? modalidade;
}

/** Rótulo amigável de um dia da semana (valor canônico → "Segunda"). */
export function rotuloDoDia(valorDia: string): string {
  const rotulos: Record<string, string> = {
    segunda: 'Segunda',
    terca: 'Terça',
    quarta: 'Quarta',
    quinta: 'Quinta',
    sexta: 'Sexta',
    sabado: 'Sábado',
    domingo: 'Domingo',
  };
  return rotulos[valorDia] ?? valorDia;
}
