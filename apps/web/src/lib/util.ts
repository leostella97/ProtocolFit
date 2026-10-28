/**
 * util.ts
 * ---------------------------------------------------------------------------
 * Utilitários gerais do frontend do ProtocolFit.
 * ---------------------------------------------------------------------------
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
// TEAM_017: CorpoPerfil é o contrato de POST /perfil — import type não gera
// dependência em runtime (o tipo é apagado na compilação).
import type { CorpoPerfil } from './api';
import type { Modalidade, Objetivo, OpcoesDoSistema, Perfil, VariacaoDeDieta, VariacaoDeTreino } from './tipos';

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

/**
 * TEAM_015: estilos (variações) de dieta que servem para um objetivo —
 * "padrao" primeiro, demais em ordem alfabética. Fonte única usada pelos
 * seletores da página de dieta e do perfil.
 */
export function variacoesDeDietaDoObjetivo(
  variacoes: VariacaoDeDieta[],
  objetivo: Objetivo,
): VariacaoDeDieta[] {
  return variacoes
    .filter((estilo) => estilo.objetivo === objetivo)
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

/**
 * TEAM_017: monta o corpo de POST /perfil para TROCAR OBJETIVO e/ou
 * MODALIDADE mantendo o restante do perfil — fonte única usada pelos
 * seletores das páginas de treino (objetivo TEAM_014 + modalidade) e de
 * dieta (objetivo).
 *
 * Regras de fallback na nova combinação:
 *  - o estilo de treino só sobrevive se existe para a NOVA combinação
 *    (modalidade + objetivo + nº de dias) — senão volta ao clássico (null);
 *  - o estilo de dieta nomeado só vale para o objetivo certo — null/"padrao"
 *    sempre sobrevivem; um slug inválido volta ao automático (null).
 */
export function montarCorpoParaTrocaDePlano(
  perfil: Perfil,
  mudancas: { objetivo?: Objetivo; modalidade?: Modalidade },
  opcoes: OpcoesDoSistema | null,
): CorpoPerfil {
  // Campos não alterados seguem os valores atuais do perfil.
  const novoObjetivo = mudancas.objetivo ?? perfil.objetivo;
  const novaModalidade = mudancas.modalidade ?? perfil.modalidade;
  // O estilo de treino precisa existir para a combinação nova.
  const estiloDeTreinoValido =
    opcoes?.variacoes_de_treino.some(
      (variacao) =>
        variacao.id === perfil.variacao_treino &&
        variacao.modalidade === novaModalidade &&
        variacao.objetivo === novoObjetivo &&
        variacao.dias === perfil.dias_disponiveis.length,
    ) ?? false;
  // O estilo de dieta nomeado precisa pertencer ao objetivo novo.
  const estiloDeDietaValido =
    perfil.variacao_dieta === null ||
    perfil.variacao_dieta === 'padrao' ||
    (opcoes?.variacoes_de_dieta.some(
      (variacao) => variacao.id === perfil.variacao_dieta && variacao.objetivo === novoObjetivo,
    ) ?? false);
  return {
    sexo: perfil.sexo,
    faixa_etaria: perfil.faixa_etaria,
    // O peso segue o histórico de pesagem (regra do perfil).
    peso_kg: perfil.peso_kg,
    altura_cm: perfil.altura_cm,
    objetivo: novoObjetivo,
    // A frequência enviada é a quantidade real de dias (regra do onboarding).
    frequencia_semanal: perfil.dias_disponiveis.length,
    dias_disponiveis: perfil.dias_disponiveis,
    modalidade: novaModalidade,
    nivel: perfil.nivel,
    variacao_treino: estiloDeTreinoValido ? perfil.variacao_treino : null,
    variacao_dieta: estiloDeDietaValido ? perfil.variacao_dieta : null,
  };
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
