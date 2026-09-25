/**
 * tipos.ts
 * ---------------------------------------------------------------------------
 * Contrato de tipos do FRONTEND do ProtocolFit — espelha exatamente os
 * payloads da API Fastify (apps/api/src/tipos.ts). Manter em sincronia.
 * ---------------------------------------------------------------------------
 */

/** Sexo biológico usado nas fórmulas metabólicas. */
export type Sexo = 'masculino' | 'feminino';

/** Objetivo principal do plano. */
export type Objetivo = 'emagrecimento' | 'hipertrofia' | 'corrida';

/** Modalidade de treino. */
export type Modalidade = 'academia' | 'pesocorporal';

/** Nível de experiência declarado. */
export type Nivel = 'iniciante' | 'intermediario' | 'avancado';

/** Usuário público retornado pela API (sem segredos). */
export interface Usuario {
  id: number;
  nome: string;
  email: string;
  criado_em?: string;
}

/** Perfil físico do usuário. */
export interface Perfil {
  id: number;
  usuario_id: number;
  sexo: Sexo;
  /** Faixa etária canônica (ex.: "19-23"). */
  faixa_etaria: string;
  peso_kg: number;
  altura_cm: number;
  objetivo: Objetivo;
  frequencia_semanal: number;
  /** Dias disponíveis (ex.: ["segunda", "quarta"]). */
  dias_disponiveis: string[];
  modalidade: Modalidade;
  nivel: Nivel;
  /**
   * Estilo (variação) de treino escolhido, ou null para o estilo padrão.
   * Ex.: "forca-maxima" aponta para "{dias}dias-forca-maxima.json".
   */
  variacao_treino: string | null;
}

/** Estilo (variação) de treino disponível para uma combinação. */
export interface VariacaoDeTreino {
  /** Identificador do estilo: "padrao" ou o slug do arquivo. */
  id: string;
  /** Rótulo curto exibido na interface (ex.: "Força Máxima"). */
  nome: string;
  /** Nome do arquivo do modelo dentro da pasta da combinação. */
  arquivo: string;
  /** Quantidade de dias coberta pelo modelo. */
  dias: number;
  /** Modalidade do modelo. */
  modalidade: Modalidade;
  /** Objetivo do modelo. */
  objetivo: Objetivo;
  /** Duração estimada de cada sessão, em minutos. */
  duracao_estimada_min: number;
}

/** Exercício montado dentro do plano de treino clonado. */
export interface ExercicioDoPlano {
  nome: string;
  grupo: string;
  tipo: 'composto' | 'isolador' | 'cardio' | 'corporal';
  series: number;
  repeticoes_min: number;
  repeticoes_max: number;
  descanso_segundos: number;
  /** Carga sugerida em kg (null para exercícios de peso corporal). */
  carga_sugerida_kg: number | null;
  dicas: string;
}

/** Dia de treino montado. */
export interface DiaDeTreino {
  titulo: string;
  exercicios: ExercicioDoPlano[];
}

/** Plano de treino clonado do usuário. */
export interface PlanoTreino {
  id: number;
  versao: number;
  /** Caminho do modelo JSON mestre que originou esta cópia. */
  modelo_origem: string;
  /** Data de criação da cópia (ISO — base do "há quanto tempo com o plano"). */
  criado_em: string;
  nome: string;
  modalidade: Modalidade;
  objetivo: Objetivo;
  dias: number;
  duracao_estimada_min: number;
  dias_da_semana: DiaDeTreino[];
  /** Dicas gerais do objetivo — exibidas no painel de treino. */
  dicas: string[];
}

/** Densidade nutricional de um alimento (por 100 g/ml). */
export interface DensidadeNutricional {
  nome: string;
  calorias_por_100g: number;
  proteinas_por_100g: number;
  carboidratos_por_100g: number;
  gorduras_por_100g: number;
}

/** Item de refeição montado dentro do plano de dieta. */
export interface ItemDaDieta {
  nome: string;
  categoria: string;
  unidade: 'g' | 'ml';
  quantidade: number;
  alvo_calorias: number;
  calorias: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
  densidade: DensidadeNutricional;
  alternativas: DensidadeNutricional[];
  alternativa_usada: string | null;
}

/** Totais nutricionais. */
export interface TotaisNutricionais {
  calorias: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
}

/** Refeição montada dentro do plano de dieta. */
export interface RefeicaoDaDieta {
  tipo: string;
  horario_sugerido: string;
  percentual_calorias: number;
  calorias_alvo: number;
  itens: ItemDaDieta[];
  totais: TotaisNutricionais;
}

/** Metas nutricionais calculadas pelo motor determinístico. */
export interface MetaDaDieta {
  meta_kcal: number;
  proteinas_g: number;
  carboidratos_g: number;
  gorduras_g: number;
  fibras_g: number;
  agua_ml: number;
  tmb: number;
  gasto_total: number;
  imc: number;
  classificacao_imc: string;
}

/** Plano de dieta clonado do usuário. */
export interface PlanoDieta {
  id: number;
  versao: number;
  /** Caminho do modelo JSON mestre que originou esta cópia. */
  modelo_origem: string;
  /** Data de criação da cópia (ISO — base do "há quanto tempo com o plano"). */
  criado_em: string;
  nome: string;
  objetivo: Objetivo;
  meta: MetaDaDieta;
  refeicoes: RefeicaoDaDieta[];
  totais: TotaisNutricionais;
  dicas: string[];
}

/** Registro de pesagem (evolução corporal). */
export interface RegistroEvolucao {
  id: number;
  data: string;
  peso_kg: number;
}

/** Check-in diário do usuário (um registro por dia). */
export interface CheckinDiario {
  /** Identificador do registro. */
  id: number;
  /** Dia do check-in (AAAA-MM-DD). */
  data: string;
  /** Treino do dia concluído. */
  treino_feito: boolean;
  /** Dieta do dia seguida. */
  dieta_seguida: boolean;
  /** Água bebida no dia (ml). */
  agua_ml: number;
  /** Peso informado no dia (null quando não informado). */
  peso_kg: number | null;
  /** Anotação livre do usuário. */
  observacao: string | null;
}

/** Resumo dos check-ins (sequência atual, recorde e histórico). */
export interface ResumoDeCheckins {
  /** Check-in de hoje (null se ainda não feito). */
  hoje: CheckinDiario | null;
  /** Últimos check-ins (mais recentes primeiro). */
  registros: CheckinDiario[];
  /** Dias consecutivos cumpridos até hoje (ou até ontem, se hoje pendente). */
  sequencia_atual: number;
  /** Maior sequência já alcançada. */
  sequencia_maxima: number;
  /** Total de check-ins registrados. */
  total: number;
  /** Datas dos dias cumpridos (mini histórico do painel). */
  dias_cumpridos: string[];
}

/** Resposta de GET /plano/atual — plano completo do painel. */
export interface PlanoCompleto {
  perfil: Perfil;
  treino: PlanoTreino;
  dieta: PlanoDieta;
}

/** Opções estáticas do onboarding servidas por GET /opcoes. */
export interface OpcoesDoSistema {
  faixas_etarias: { valor: string; rotulo: string }[];
  objetivos: { valor: Objetivo; rotulo: string; descricao: string }[];
  modalidades: { valor: Modalidade; rotulo: string; descricao: string }[];
  frequencias_semanais: number[];
  dias_semana: { valor: string; rotulo: string }[];
  /** Estilos de treino disponíveis (padrão + variações nomeadas). */
  variacoes_de_treino: VariacaoDeTreino[];
  seguranca: { tentativas_limite: number; horas_bloqueio: number };
}

/** Resposta de login/cadastro. */
export interface RespostaDeAutenticacao {
  token: string;
  usuario: Usuario;
}
