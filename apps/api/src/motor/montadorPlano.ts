/**
 * montadorPlano.ts
 * ---------------------------------------------------------------------------
 * Motor de MONTAGEM dos planos: recebe o modelo JSON mestre + o perfil do
 * usuário e INJETA os valores personalizados (séries, repetições, cargas e
 * quantidades exatas em gramas) na estrutura.
 *
 * O resultado é a cópia individual que será gravada no SQLite do usuário —
 * o arquivo JSON mestre permanece intocado.
 * ---------------------------------------------------------------------------
 */
import { arredondarCarga } from './calculos.js';
import type {
  DiaDeTreino,
  DistribuicaoMacros,
  ItemDaDieta,
  ModeloDiaTreino,
  ModeloDieta,
  ModeloExercicio,
  ModeloTreino,
  Objetivo,
  Perfil,
  PlanoDieta,
  PlanoTreino,
  RefeicaoDaDieta,
  TotaisNutricionais,
} from '../tipos.js';

/** Regras de volume e descanso aplicadas por objetivo sobre os modelos. */
const REGRAS_POR_OBJETIVO: Record<Objetivo, { series: number; repeticoes_min: number; repeticoes_max: number; descanso_segundos: number }> = {
  emagrecimento: { series: 3, repeticoes_min: 12, repeticoes_max: 15, descanso_segundos: 60 }, // volume alto, descanso curto (queima)
  hipertrofia: { series: 4, repeticoes_min: 8, repeticoes_max: 12, descanso_segundos: 90 }, // volume e tensão para hipertrofia
  corrida: { series: 3, repeticoes_min: 10, repeticoes_max: 12, descanso_segundos: 60 }, // força de suporte sem fadiga excessiva
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
    exercicios: dia.exercicios.map((exercicio) => {
      // TEAM_008: no grupo "cardio" os campos do modelo já são TEMPO/DISTÂNCIA
      // (1 série = minutos contínuos; várias = tiros de X–Y segundos) — a regra
      // do objetivo, feita para reps de musculação, destruía essa semântica.
      const ehCardio = exercicio.grupo === 'cardio';
      return {
        nome: exercicio.nome,
        grupo: exercicio.grupo,
        tipo: exercicio.tipo,
        series: ehCardio ? exercicio.series : regra.series,
        repeticoes_min: ehCardio ? exercicio.repeticoes_min : regra.repeticoes_min,
        repeticoes_max: ehCardio ? exercicio.repeticoes_max : regra.repeticoes_max,
        descanso_segundos: ehCardio ? exercicio.descanso_segundos : regra.descanso_segundos,
        // Carga inicial sugerida = fração do peso corporal do exercício (kg).
        carga_sugerida_kg:
          exercicio.percentual_carga_peso_corporal === null
            ? null
            : arredondarCarga(perfil.peso_kg * exercicio.percentual_carga_peso_corporal),
        distancia_km: exercicio.distancia_km ?? null,
        dicas: exercicio.dicas,
      };
    }),
  };
}

/** Monta o plano de treino completo (estrutura do modelo + regras do usuário). */
export function montarPlanoTreino(
  modelo: ModeloTreino,
  perfil: Perfil,
): Omit<PlanoTreino, 'id' | 'versao' | 'modelo_origem' | 'criado_em'> {
  // Aplica as regras do objetivo a cada dia do modelo mestre.
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
function montarItem(item: ModeloDieta['refeicoes'][number]['itens'][number], caloriasDaRefeicao: number): ItemDaDieta {
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
    // Macros efetivos da porção montada (quantidade x densidade nutricional).
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
  metas: DistribuicaoMacros,
): Omit<PlanoDieta, 'id' | 'versao' | 'modelo_origem' | 'criado_em'> {
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
  /** TEAM_008: nova distância alvo em km p/ cardio (null remove a meta). */
  distancia_km?: number | null;
}

/** Aplica a edição do usuário na CÓPIA do plano (mestre fica intacto). */
export function aplicarEdicaoTreino(
  plano: Omit<PlanoTreino, 'id' | 'versao' | 'modelo_origem' | 'criado_em'>,
  edicao: EdicaoDeExercicio,
): Omit<PlanoTreino, 'id' | 'versao' | 'modelo_origem' | 'criado_em'> {
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
    // Atualiza a faixa de repetições mantendo amplitude de 2 repetições.
    // TEAM_008: no cardio o campo é tempo-alvo (min ou s por tiro) — alvo
    // exato, sem amplitude artificial de repetição.
    if (exercicio.grupo === 'cardio') {
      exercicio.repeticoes_min = edicao.repeticoes;
      exercicio.repeticoes_max = edicao.repeticoes;
    } else {
      exercicio.repeticoes_min = edicao.repeticoes;
      exercicio.repeticoes_max = edicao.repeticoes + 2;
    }
  }
  if (edicao.carga_kg !== undefined) {
    exercicio.carga_sugerida_kg = edicao.carga_kg;
  }
  // TEAM_008: meta de distância do cardio (null limpa a meta).
  if (edicao.distancia_km !== undefined) {
    exercicio.distancia_km = edicao.distancia_km;
  }
  return plano;
}

/**
 * Aplica a troca de um alimento por um substituto da mesma categoria,
 * recalculando a porção em gramas para manter as mesmas calorias-alvo.
 */
export function aplicarSubstituicao(
  plano: Omit<PlanoDieta, 'id' | 'versao' | 'modelo_origem' | 'criado_em'>,
  refeicaoIndice: number,
  itemIndice: number,
  nomeAlternativa: string,
): Omit<PlanoDieta, 'id' | 'versao' | 'modelo_origem' | 'criado_em'> {
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

/** Corpo da troca de um exercício por outro do mesmo grupo muscular. */
export interface TrocaDeExercicio {
  /** Índice do dia no plano (0-based). */
  dia_indice: number;
  /** Índice do exercício dentro do dia (0-based). */
  exercicio_indice: number;
  /** Nome da alternativa escolhida (vem do catálogo da modalidade). */
  exercicio_nome: string;
}

/**
 * TEAM_003: aplica a troca de um exercício por outro do MESMO grupo muscular.
 *
 * O "slot" mantém séries/repetições/descanso — inclusive edições feitas pelo
 * usuário. Nome, tipo e dicas vêm da alternativa, e a carga sugerida é
 * recalculada pelo percentual do novo exercício sobre o peso do usuário
 * (percentual null → exercício de peso corporal, sem carga).
 */
export function aplicarTrocaDeExercicio(
  plano: Omit<PlanoTreino, 'id' | 'versao' | 'modelo_origem' | 'criado_em'>,
  troca: TrocaDeExercicio,
  catalogo: ModeloExercicio[],
  pesoKg: number,
): Omit<PlanoTreino, 'id' | 'versao' | 'modelo_origem' | 'criado_em'> {
  const dia = plano.dias_da_semana[troca.dia_indice];
  if (!dia) {
    throw new Error('Dia de treino não encontrado no plano.');
  }
  const exercicio = dia.exercicios[troca.exercicio_indice];
  if (!exercicio) {
    throw new Error('Exercício não encontrado no plano.');
  }
  const alternativa = catalogo.find((candidata) => candidata.nome === troca.exercicio_nome);
  if (!alternativa) {
    throw new Error('Exercício alternativo não encontrado no catálogo.');
  }
  // Regra central: a troca só vale entre exercícios do mesmo músculo.
  if (alternativa.grupo !== exercicio.grupo) {
    throw new Error('A troca só é permitida entre exercícios do mesmo grupo muscular.');
  }
  // Troca a identidade do exercício, preservando o volume do slot.
  exercicio.nome = alternativa.nome;
  exercicio.tipo = alternativa.tipo;
  // TEAM_008: a meta de distância pertence ao exercício novo, não ao slot.
  exercicio.distancia_km = alternativa.distancia_km ?? null;
  exercicio.dicas = alternativa.dicas;
  exercicio.carga_sugerida_kg =
    alternativa.percentual_carga_peso_corporal === null
      ? null
      : arredondarCarga(pesoKg * alternativa.percentual_carga_peso_corporal);
  return plano;
}
