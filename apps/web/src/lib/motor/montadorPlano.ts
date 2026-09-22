/**
 * montadorPlano.ts (motor do navegador)
 * ---------------------------------------------------------------------------
 * Porta fiel de apps/api/src/motor/montadorPlano.ts. Recebe o modelo JSON
 * mestre + o perfil do usuário e INJETA os valores personalizados (séries,
 * repetições, cargas e quantidades exatas em gramas), devolvendo o plano
 * completo que será salvo no armazenamento local do navegador.
 * ---------------------------------------------------------------------------
 */
import type {
  DiaDeTreino,
  ItemDaDieta,
  MetaDaDieta,
  Objetivo,
  Perfil,
  PlanoDieta,
  PlanoTreino,
  RefeicaoDaDieta,
  TotaisNutricionais,
} from '../tipos';
import { arredondarCarga } from './calculos';
import type { ModeloDieta, ModeloDiaTreino, ModeloItemDieta, ModeloTreino } from './tipos-modelos';

/** Regras de volume e descanso aplicadas por objetivo sobre os modelos. */
const REGRAS_POR_OBJETIVO: Record<Objetivo, { series: number; repeticoes_min: number; repeticoes_max: number; descanso_segundos: number }> = {
  emagrecimento: { series: 3, repeticoes_min: 12, repeticoes_max: 15, descanso_segundos: 60 },
  hipertrofia: { series: 4, repeticoes_min: 8, repeticoes_max: 12, descanso_segundos: 90 },
  corrida: { series: 3, repeticoes_min: 10, repeticoes_max: 12, descanso_segundos: 60 },
};

/** Orientações gerais de treino exibidas no painel, por objetivo. */
const DICAS_DE_TREINO_POR_OBJETIVO: Record<Objetivo, string[]> = {
  emagrecimento: [
    'Priorize a execução correta: o descanso curto entre séries mantém seu coração acelerado e acelera a queima.',
    'O cardio do fim do treino é obrigatório — ele é o "segundo tempo" da sessão de emagrecimento.',
    'Aumente o ritmo do circuito a cada semana: menos pausa = mais gasto calórico.',
    'Não pule o treino de força por causa do cardio: músculo ativo queima mais calorias em repouso.',
  ],
  hipertrofia: [
    'Anote suas cargas: a progressão semanal (mais peso ou mais repetições) é o que constrói músculo.',
    'Respeite o descanso indicado — ele é parte do estímulo, não preguiça.',
    'A última repetição de cada série deve ser desafiadora, mas com a técnica intacta.',
    'Consistência vence: 4 treinos por semana, toda semana, batem qualquer treino perfeito feito às vezes.',
  ],
  corrida: [
    'O fortalecimento previne lesões: pernas, glúteos e core fortes protegem seus joelhos nos quilômetros.',
    'Treine a força longe das corridas mais intensas (ideal: no mesmo dia ou dia seguinte ao trote leve).',
    'Capriche na aterrissagem macia dos saltos e educativos — é técnica de passada disfarçada de exercício.',
    'Progressão gradual: adicione séries ou minutos por semana, nunca tudo de uma vez.',
  ],
};

/** Orientações nutricionais exibidas no plano de dieta de cada objetivo. */
const DICAS_POR_OBJETIVO: Record<Objetivo, string[]> = {
  emagrecimento: [
    'Mantenha o déficit calórico: prefira alimentos integrais e ricos em fibras para aumentar a saciedade.',
    'Beba a meta diária de água — ela ajuda no controle do apetite e na queima de gordura.',
    'Pese-se no máximo 1 vez por semana, sempre em jejum, e registre a evolução no painel.',
    'Coma devagar e sem distrações: a saciedade leva cerca de 20 minutos para chegar ao cérebro.',
    'Monte o prato na ordem: metade vegetais, um quarto proteína e um quarto carboidrato.',
  ],
  hipertrofia: [
    'Para ganhar massa magra, respeite o superávit calórico e não pule refeições.',
    'Distribua a proteína ao longo do dia — todas as refeições contêm fontes proteicas.',
    'Priorize carboidratos complexos ao redor do treino para energia e recuperação.',
    'A ceia com proteína (queijo cottage) alimenta a recuperação muscular durante o sono.',
    'Se o peso não subir em 2 semanas, aumente 10% da porção de carboidrato das refeições principais.',
  ],
  corrida: [
    'Carboidrato é o combustível do corredor: mantenha as porções indicadas para sustentar os treinos.',
    'Hidrate-se bem: sua meta de água é maior por causa da transpiração nas corridas.',
    'Evite treinar em jejum nos dias de treinos longos ou intensos.',
    'Coma uma fonte de carbo (banana, mel, tapioca) até 1 hora antes das corridas mais fortes.',
    'Após treinos longos, combine proteína com carboidrato para acelerar a recuperação muscular.',
  ],
};

/** Arredonda para o múltiplo de 5 mais próximo (porções em gramas/ml). */
function arredondarGramas(valor: number): number {
  return Math.max(5, Math.round(valor / 5) * 5);
}

/** Arredonda um número para 1 casa decimal. */
function comUmaCasa(valor: number): number {
  return Math.round(valor * 10) / 10;
}

/** Soma os totais nutricionais de uma lista de itens montados. */
function somarTotais(itens: ItemDaDieta[]): TotaisNutricionais {
  return itens.reduce<TotaisNutricionais>(
    (soma, item) => ({
      calorias: soma.calorias + item.calorias,
      proteinas: comUmaCasa(soma.proteinas + item.proteinas),
      carboidratos: comUmaCasa(soma.carboidratos + item.carboidratos),
      gorduras: comUmaCasa(soma.gorduras + item.gorduras),
    }),
    { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0 },
  );
}

/** Soma os totais nutricionais de uma lista de refeições montadas. */
function somarTotaisDasRefeicoes(refeicoes: RefeicaoDaDieta[]): TotaisNutricionais {
  return refeicoes.reduce<TotaisNutricionais>(
    (soma, refeicao) => ({
      calorias: soma.calorias + refeicao.totais.calorias,
      proteinas: comUmaCasa(soma.proteinas + refeicao.totais.proteinas),
      carboidratos: comUmaCasa(soma.carboidratos + refeicao.totais.carboidratos),
      gorduras: comUmaCasa(soma.gorduras + refeicao.totais.gorduras),
    }),
    { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0 },
  );
}

/** Monta um dia do modelo aplicando as regras do objetivo do usuário. */
function montarDia(dia: ModeloDiaTreino, perfil: Perfil): DiaDeTreino {
  const regra = REGRAS_POR_OBJETIVO[perfil.objetivo];
  return {
    titulo: dia.titulo,
    exercicios: dia.exercicios.map((exercicio) => ({
      nome: exercicio.nome,
      grupo: exercicio.grupo,
      tipo: exercicio.tipo,
      // Séries, repetições e descanso sobrescritos pelo objetivo do usuário.
      series: regra.series,
      repeticoes_min: regra.repeticoes_min,
      repeticoes_max: regra.repeticoes_max,
      descanso_segundos: regra.descanso_segundos,
      // Carga inicial sugerida = fração do peso corporal do exercício.
      carga_sugerida_kg:
        exercicio.percentual_carga_peso_corporal === null
          ? null
          : arredondarCarga(perfil.peso_kg * exercicio.percentual_carga_peso_corporal),
      dicas: exercicio.dicas,
    })),
  };
}

/** Monta o plano de treino completo (estrutura do modelo + regras do usuário). */
export function montarPlanoTreino(
  modelo: ModeloTreino,
  perfil: Perfil,
): Omit<PlanoTreino, 'id' | 'versao' | 'modelo_origem'> {
  const dias_da_semana = modelo.dias_da_semana.map((dia) => montarDia(dia, perfil));
  return {
    nome: modelo.nome,
    modalidade: modelo.modalidade,
    objetivo: modelo.objetivo,
    dias: dias_da_semana.length,
    duracao_estimada_min: modelo.duracao_estimada_min,
    dias_da_semana,
    // Dicas gerais do objetivo — exibidas no painel de treino.
    dicas: DICAS_DE_TREINO_POR_OBJETIVO[modelo.objetivo],
  };
}

/** Monta um item de refeição injetando a quantidade exata em gramas. */
function montarItem(item: ModeloItemDieta, caloriasDaRefeicao: number): ItemDaDieta {
  // Calorias-alvo do item = fração dele dentro das calorias da refeição.
  const alvoCalorias = Math.round(caloriasDaRefeicao * item.percentual_da_refeicao);
  // Quantidade em gramas = calorias-alvo / calorias por 100 g (x 100).
  const quantidade = arredondarGramas((alvoCalorias / item.calorias_por_100g) * 100);
  return {
    nome: item.nome,
    categoria: item.categoria,
    unidade: item.unidade,
    quantidade,
    alvo_calorias: alvoCalorias,
    // Macros efetivos da porção montada.
    calorias: Math.round((quantidade / 100) * item.calorias_por_100g),
    proteinas: comUmaCasa((quantidade / 100) * item.proteinas_por_100g),
    carboidratos: comUmaCasa((quantidade / 100) * item.carboidratos_por_100g),
    gorduras: comUmaCasa((quantidade / 100) * item.gorduras_por_100g),
    // Densidade do alimento atual — permite trocas futuras sem acessar o modelo.
    densidade: {
      nome: item.nome,
      calorias_por_100g: item.calorias_por_100g,
      proteinas_por_100g: item.proteinas_por_100g,
      carboidratos_por_100g: item.carboidratos_por_100g,
      gorduras_por_100g: item.gorduras_por_100g,
    },
    alternativas: item.alternativas,
    alternativa_usada: null,
  };
}

/** Monta o plano de dieta completo com quantidades exatas em gramas. */
export function montarPlanoDieta(
  modelo: ModeloDieta,
  perfil: Perfil,
  metas: MetaDaDieta,
): Omit<PlanoDieta, 'id' | 'versao' | 'modelo_origem'> {
  // Monta cada refeição do modelo mestre com as calorias do usuário.
  const refeicoes = modelo.refeicoes.map((refeicao) => {
    // Calorias da refeição = fração dela sobre a meta diária do usuário.
    const caloriasDaRefeicao = Math.round(metas.meta_kcal * refeicao.percentual_calorias);
    const itens = refeicao.itens.map((item) => montarItem(item, caloriasDaRefeicao));
    return {
      tipo: refeicao.tipo,
      horario_sugerido: refeicao.horario_sugerido,
      percentual_calorias: refeicao.percentual_calorias,
      calorias_alvo: caloriasDaRefeicao,
      itens,
      totais: somarTotais(itens),
    };
  });
  return {
    nome: modelo.nome,
    objetivo: modelo.objetivo,
    meta: metas,
    refeicoes,
    totais: somarTotaisDasRefeicoes(refeicoes),
    dicas: DICAS_POR_OBJETIVO[modelo.objetivo],
  };
}

/** Corpo da edição de um exercício feita pelo usuário. */
export interface EdicaoDeExercicio {
  /** Índice do dia no plano (0-based). */
  dia_indice: number;
  /** Índice do exercício dentro do dia (0-based). */
  exercicio_indice: number;
  /** Novas séries (opcional). */
  series?: number;
  /** Novas repetições (opcional). */
  repeticoes?: number;
  /** Nova carga em kg (opcional; null remove a carga). */
  carga_kg?: number | null;
}

/** Aplica a edição do usuário na CÓPIA do plano. */
export function aplicarEdicaoTreino(
  plano: Omit<PlanoTreino, 'id' | 'versao' | 'modelo_origem'>,
  edicao: EdicaoDeExercicio,
): Omit<PlanoTreino, 'id' | 'versao' | 'modelo_origem'> {
  const dia = plano.dias_da_semana[edicao.dia_indice];
  if (!dia) {
    throw new Error('Dia de treino não encontrado no plano.');
  }
  const exercicio = dia.exercicios[edicao.exercicio_indice];
  if (!exercicio) {
    throw new Error('Exercício não encontrado no plano.');
  }
  // Aplica apenas os campos enviados (edição parcial).
  if (edicao.series !== undefined) {
    exercicio.series = edicao.series;
  }
  if (edicao.repeticoes !== undefined) {
    // Mantém amplitude de 2 repetições na faixa.
    exercicio.repeticoes_min = edicao.repeticoes;
    exercicio.repeticoes_max = edicao.repeticoes + 2;
  }
  if (edicao.carga_kg !== undefined) {
    exercicio.carga_sugerida_kg = edicao.carga_kg;
  }
  return plano;
}

/**
 * Aplica a troca de um alimento por um substituto da mesma categoria,
 * recalculando a porção em gramas para manter as mesmas calorias-alvo.
 */
export function aplicarSubstituicao(
  plano: Omit<PlanoDieta, 'id' | 'versao' | 'modelo_origem'>,
  refeicaoIndice: number,
  itemIndice: number,
  nomeAlternativa: string,
): Omit<PlanoDieta, 'id' | 'versao' | 'modelo_origem'> {
  const refeicao = plano.refeicoes[refeicaoIndice];
  if (!refeicao) {
    throw new Error('Refeição não encontrada no plano.');
  }
  const item = refeicao.itens[itemIndice];
  if (!item) {
    throw new Error('Alimento não encontrado no plano.');
  }
  const alternativa = item.alternativas.find((candidata) => candidata.nome === nomeAlternativa);
  if (!alternativa) {
    throw new Error('Substituto não encontrado para este alimento.');
  }
  // O alimento atual entra na lista de substitutos — permite desfazer a troca.
  const listaAtualizada = [
    ...item.alternativas.filter((candidata) => candidata.nome !== alternativa.nome),
    item.densidade,
  ];
  // Aplica a densidade nutricional do substituto escolhido.
  item.nome = alternativa.nome;
  item.densidade = { ...alternativa };
  // Recalcula a porção mantendo as mesmas calorias-alvo do item.
  item.quantidade = arredondarGramas((item.alvo_calorias / alternativa.calorias_por_100g) * 100);
  item.calorias = Math.round((item.quantidade / 100) * alternativa.calorias_por_100g);
  item.proteinas = comUmaCasa((item.quantidade / 100) * alternativa.proteinas_por_100g);
  item.carboidratos = comUmaCasa((item.quantidade / 100) * alternativa.carboidratos_por_100g);
  item.gorduras = comUmaCasa((item.quantidade / 100) * alternativa.gorduras_por_100g);
  item.alternativas = listaAtualizada;
  item.alternativa_usada = alternativa.nome;
  // Recalcula os totais da refeição alterada e do plano inteiro.
  refeicao.totais = somarTotais(refeicao.itens);
  plano.totais = somarTotaisDasRefeicoes(plano.refeicoes);
  return plano;
}
