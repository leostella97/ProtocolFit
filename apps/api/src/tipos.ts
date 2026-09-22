/**
 * tipos.ts
 * ---------------------------------------------------------------------------
 * Contrato de tipos compartilhado por TODO o backend do ProtocolFit.
 * Estes tipos espelham fielmente a estrutura dos modelos JSON mestres do
 * servidor e dos planos clonados para a tabela individual do usuário.
 * ---------------------------------------------------------------------------
 */

/** Sexo biológico informado pelo usuário — usado na fórmula de Mifflin-St Jeor. */
export type Sexo = 'masculino' | 'feminino';

/** Objetivo principal do usuário — define déficit/superávit e o modelo de treino. */
export type Objetivo = 'emagrecimento' | 'hipertrofia' | 'corrida';

/** Modalidade de treino — academia (pesos e máquinas) ou peso do corpo (calistenia). */
export type Modalidade = 'academia' | 'pesocorporal';

/** Tipo de plano clonado para o usuário na tabela `planos`. */
export type TipoPlano = 'treino' | 'dieta';

/** Nível de experiência informado no perfil (usado em dicas e textos). */
export type Nivel = 'iniciante' | 'intermediario' | 'avancado';

/** Faixa etária selecionável no onboarding (limites inclusivos). */
export interface FaixaEtaria {
  /** Valor canônico usado pela API (ex.: "18-19"). */
  valor: string;
  /** Limite inferior da faixa, em anos. */
  inicio: number;
  /** Limite superior da faixa, em anos. */
  fim: number;
  /** Rótulo amigável exibido na interface. */
  rotulo: string;
}

/** Dados do perfil físico do usuário, gravados na tabela `perfis`. */
export interface Perfil {
  /** Identificador único do perfil no SQLite. */
  id: number;
  /** Chave estrangeira para a tabela `usuarios`. */
  usuario_id: number;
  /** Sexo biológico usado nas fórmulas metabólicas. */
  sexo: Sexo;
  /** Faixa etária canônica selecionada (ex.: "19-23"). */
  faixa_etaria: string;
  /** Peso corporal em quilogramas (aceita decimais, ex.: 72.5). */
  peso_kg: number;
  /** Altura em centímetros. */
  altura_cm: number;
  /** Objetivo escolhido no onboarding. */
  objetivo: Objetivo;
  /** Quantidade de sessões de treino por semana (1 a 7). */
  frequencia_semanal: number;
  /** Dias da semana disponíveis (ex.: ["segunda", "quarta", "sexta"]). */
  dias_disponiveis: string[];
  /** Modalidade preferida de treino. */
  modalidade: Modalidade;
  /** Nível de experiência declarado. */
  nivel: Nivel;
}

/** Estrutura de um exercício DENTRO do modelo JSON mestre (antes da montagem). */
export interface ModeloExercicio {
  /** Nome do exercício. */
  nome: string;
  /** Grupo muscular trabalhado. */
  grupo: string;
  /** Tipo biomecânico do movimento. */
  tipo: 'composto' | 'isolador' | 'cardio' | 'corporal';
  /** Séries de referência do modelo (o motor pode sobrescrever pelo objetivo). */
  series: number;
  /** Faixa mínima de repetições de referência. */
  repeticoes_min: number;
  /** Faixa máxima de repetições de referência. */
  repeticoes_max: number;
  /** Descanso de referência entre séries, em segundos. */
  descanso_segundos: number;
  /** Fração do peso corporal sugerida como carga inicial (null = sem carga). */
  percentual_carga_peso_corporal: number | null;
  /** Dica de execução exibida ao usuário. */
  dicas: string;
}

/** Um dia de treino dentro do modelo JSON mestre. */
export interface ModeloDiaTreino {
  /** Título do dia (ex.: "Dia A — Peito, Ombro e Tríceps"). */
  titulo: string;
  /** Exercícios do dia na ordem de execução. */
  exercicios: ModeloExercicio[];
}

/** Modelo JSON mestre de treino (arquivo em /modelos/treinos/...). */
export interface ModeloTreino {
  /** Nome comercial do modelo. */
  nome: string;
  /** Modalidade do modelo. */
  modalidade: Modalidade;
  /** Objetivo do modelo. */
  objetivo: Objetivo;
  /** Quantidade de dias coberta pelo modelo. */
  dias: number;
  /** Duração estimada de cada sessão, em minutos. */
  duracao_estimada_min: number;
  /** Estrutura dos dias de treino. */
  dias_da_semana: ModeloDiaTreino[];
}

/** Densidade nutricional de um alimento (macros por 100 g ou 100 ml). */
export interface DensidadeNutricional {
  /** Nome do alimento. */
  nome: string;
  /** Calorias por 100 g/ml. */
  calorias_por_100g: number;
  /** Proteínas em gramas por 100 g/ml. */
  proteinas_por_100g: number;
  /** Carboidratos em gramas por 100 g/ml. */
  carboidratos_por_100g: number;
  /** Gorduras em gramas por 100 g/ml. */
  gorduras_por_100g: number;
}

/** Item de refeição dentro do modelo JSON mestre de dieta. */
export interface ModeloItemDieta extends DensidadeNutricional {
  /** Categoria do alimento (proteina, carboidrato, gordura, fruta, vegetal...). */
  categoria: string;
  /** Fração das calorias da refeição destinada a este item (0..1). */
  percentual_da_refeicao: number;
  /** Unidade de medida da quantidade calculada pelo motor. */
  unidade: 'g' | 'ml';
  /** Alimentos substitutos equivalentes (mesma categoria nutricional). */
  alternativas: DensidadeNutricional[];
}

/** Uma refeição dentro do modelo JSON mestre de dieta. */
export interface ModeloRefeicao {
  /** Tipo da refeição (ex.: "Café da manhã"). */
  tipo: string;
  /** Horário sugerido para consumo. */
  horario_sugerido: string;
  /** Fração das calorias diárias destinada a esta refeição (0..1). */
  percentual_calorias: number;
  /** Itens da refeição. */
  itens: ModeloItemDieta[];
}

/** Modelo JSON mestre de dieta (arquivo em /modelos/dietas/...). */
export interface ModeloDieta {
  /** Nome comercial do modelo. */
  nome: string;
  /** Objetivo atendido pelo modelo. */
  objetivo: Objetivo;
  /** Refeições do dia. */
  refeicoes: ModeloRefeicao[];
}

/** Resultado completo do plano nutricional calculado pelo motor determinístico. */
export interface DistribuicaoMacros {
  /** Meta calórica diária em kcal. */
  meta_kcal: number;
  /** Proteínas em gramas por dia. */
  proteinas_g: number;
  /** Carboidratos em gramas por dia. */
  carboidratos_g: number;
  /** Gorduras em gramas por dia. */
  gorduras_g: number;
  /** Fibras em gramas por dia (14 g por 1000 kcal, entre 25 e 40 g). */
  fibras_g: number;
  /** Água recomendada em mililitros por dia (35 a 40 ml por kg). */
  agua_ml: number;
  /** Taxa metabólica basal (fórmula de Mifflin-St Jeor). */
  tmb: number;
  /** Gasto calórico total estimado (TMB x fator de atividade). */
  gasto_total: number;
  /** Índice de Massa Corporal calculado. */
  imc: number;
  /** Classificação textual do IMC. */
  classificacao_imc: string;
}

/** Exercício JÁ montado pelo motor dentro do plano clonado do usuário. */
export interface ExercicioDoPlano {
  /** Nome do exercício. */
  nome: string;
  /** Grupo muscular trabalhado. */
  grupo: string;
  /** Tipo biomecânico do movimento. */
  tipo: ModeloExercicio['tipo'];
  /** Séries definidas pelo objetivo (editáveis pelo usuário). */
  series: number;
  /** Faixa mínima de repetições (editável pelo usuário). */
  repeticoes_min: number;
  /** Faixa máxima de repetições (editável pelo usuário). */
  repeticoes_max: number;
  /** Descanso entre séries, em segundos. */
  descanso_segundos: number;
  /** Carga inicial sugerida em kg (null para exercícios de peso corporal). */
  carga_sugerida_kg: number | null;
  /** Dica de execução. */
  dicas: string;
}

/** Dia de treino montado dentro do plano clonado do usuário. */
export interface DiaDeTreino {
  /** Título do dia. */
  titulo: string;
  /** Exercícios montados. */
  exercicios: ExercicioDoPlano[];
}

/** Plano de treino clonado para o usuário (gravado na tabela `planos`). */
export interface PlanoTreino {
  /** Identificador da cópia no SQLite. */
  id: number;
  /** Versão do plano (incrementa a cada recálculo). */
  versao: number;
  /** Caminho relativo do modelo JSON mestre que originou esta cópia. */
  modelo_origem: string;
  /** Nome do plano. */
  nome: string;
  /** Modalidade do plano. */
  modalidade: Modalidade;
  /** Objetivo do plano. */
  objetivo: Objetivo;
  /** Quantidade de dias do plano. */
  dias: number;
  /** Duração estimada de cada sessão, em minutos. */
  duracao_estimada_min: number;
  /** Dias de treino montados. */
  dias_da_semana: DiaDeTreino[];
  /** Dicas gerais do objetivo — exibidas no painel de treino. */
  dicas: string[];
}

/** Item de refeição montado dentro do plano de dieta clonado. */
export interface ItemDaDieta {
  /** Nome do alimento atual (pode ter sido substituído pelo usuário). */
  nome: string;
  /** Categoria nutricional do alimento. */
  categoria: string;
  /** Unidade de medida da quantidade. */
  unidade: 'g' | 'ml';
  /** Quantidade calculada pelo motor (arredondada para múltiplos de 5). */
  quantidade: number;
  /** Calorias-alvo deste item (usadas no recálculo de substituições). */
  alvo_calorias: number;
  /** Calorias efetivas da porção montada. */
  calorias: number;
  /** Proteínas em gramas da porção montada. */
  proteinas: number;
  /** Carboidratos em gramas da porção montada. */
  carboidratos: number;
  /** Gorduras em gramas da porção montada. */
  gorduras: number;
  /** Densidade nutricional do alimento ATUAL (usada em trocas futuras). */
  densidade: DensidadeNutricional;
  /** Lista dinâmica de substitutos (original do modelo + trocas anteriores). */
  alternativas: DensidadeNutricional[];
  /** Nome do substituto aplicado, ou null se o item é o original do modelo. */
  alternativa_usada: string | null;
}

/** Totais nutricionais de uma refeição ou do plano inteiro. */
export interface TotaisNutricionais {
  /** Calorias totais. */
  calorias: number;
  /** Proteínas em gramas. */
  proteinas: number;
  /** Carboidratos em gramas. */
  carboidratos: number;
  /** Gorduras em gramas. */
  gorduras: number;
}

/** Refeição montada dentro do plano de dieta clonado. */
export interface RefeicaoDaDieta {
  /** Tipo da refeição. */
  tipo: string;
  /** Horário sugerido. */
  horario_sugerido: string;
  /** Fração das calorias diárias da refeição. */
  percentual_calorias: number;
  /** Calorias-alvo da refeição. */
  calorias_alvo: number;
  /** Itens montados. */
  itens: ItemDaDieta[];
  /** Totais nutricionais da refeição. */
  totais: TotaisNutricionais;
}

/** Plano de dieta clonado para o usuário (gravado na tabela `planos`). */
export interface PlanoDieta {
  /** Identificador da cópia no SQLite. */
  id: number;
  /** Versão do plano (incrementa a cada recálculo). */
  versao: number;
  /** Caminho relativo do modelo JSON mestre que originou esta cópia. */
  modelo_origem: string;
  /** Nome do plano. */
  nome: string;
  /** Objetivo do plano. */
  objetivo: Objetivo;
  /** Metas calculadas pelo motor determinístico. */
  meta: DistribuicaoMacros;
  /** Refeições montadas. */
  refeicoes: RefeicaoDaDieta[];
  /** Totais nutricionais do dia. */
  totais: TotaisNutricionais;
  /** Orientações específicas do objetivo. */
  dicas: string[];
}

/** Registro de pesagem do usuário (alimenta o gráfico e o recálculo). */
export interface RegistroEvolucao {
  /** Identificador do registro no SQLite. */
  id: number;
  /** Data do registro no formato ISO (AAAA-MM-DD). */
  data: string;
  /** Peso registrado em quilogramas. */
  peso_kg: number;
}

/** Check-in diário do usuário (um registro por dia). */
export interface CheckinDiario {
  /** Identificador do registro. */
  id: number;
  /** Dia do check-in (AAAA-MM-DD). */
  data: string;
  /** Indica se o treino do dia foi concluído. */
  treino_feito: boolean;
  /** Indica se a dieta do dia foi seguida. */
  dieta_seguida: boolean;
  /** Água bebida no dia, em mililitros. */
  agua_ml: number;
  /** Peso informado no dia (null quando não informado). */
  peso_kg: number | null;
  /** Anotação livre do usuário. */
  observacao: string | null;
}

/** Resumo dos check-ins: usado pelo painel para mostrar a sequência. */
export interface ResumoDeCheckins {
  /** Check-in de hoje (null se ainda não feito). */
  hoje: CheckinDiario | null;
  /** Últimos check-ins (mais recentes primeiro). */
  registros: CheckinDiario[];
  /** Dias consecutivos cumpridos até hoje (ou até ontem, se hoje pendente). */
  sequencia_atual: number;
  /** Maior sequência já alcançada pelo usuário. */
  sequencia_maxima: number;
  /** Total de check-ins registrados. */
  total: number;
  /** Datas dos dias cumpridos (para o mini histórico do painel). */
  dias_cumpridos: string[];
}

/** Conjunto de opções estáticas oferecidas pelo servidor para o onboarding. */
export interface OpcoesDoSistema {
  /** Faixas etárias selecionáveis. */
  faixas_etarias: { valor: string; rotulo: string }[];
  /** Objetivos disponíveis com descrição persuasiva. */
  objetivos: { valor: Objetivo; rotulo: string; descricao: string }[];
  /** Modalidades disponíveis com descrição. */
  modalidades: { valor: Modalidade; rotulo: string; descricao: string }[];
  /** Frequências semanais permitidas. */
  frequencias_semanais: number[];
  /** Dias da semana disponíveis. */
  dias_semana: { valor: string; rotulo: string }[];
  /** Parâmetros de segurança do login. */
  seguranca: { tentativas_limite: number; horas_bloqueio: number };
}
