/**
 * tipos-modelos.ts
 * ---------------------------------------------------------------------------
 * Tipos dos modelos JSON MESTRES de treino e dieta (o formato dos arquivos
 * da pasta /modelos no backend). O motor do navegador busca esses arquivos
 * como conteúdo estático e os interpreta exatamente como o servidor faz.
 * ---------------------------------------------------------------------------
 */
import type { Modalidade, Objetivo } from '../tipos';

/** Estrutura de um exercício DENTRO do modelo JSON mestre. */
export interface ModeloExercicio {
  /** Nome do exercício. */
  nome: string;
  /** Grupo muscular trabalhado. */
  grupo: string;
  /** Tipo biomecânico do movimento. */
  tipo: 'composto' | 'isolador' | 'cardio' | 'corporal';
  /** Séries de referência do modelo. */
  series: number;
  /** Faixa mínima de repetições de referência. */
  repeticoes_min: number;
  /** Faixa máxima de repetições de referência. */
  repeticoes_max: number;
  /** Descanso de referência entre séries, em segundos. */
  descanso_segundos: number;
  /** Fração do peso corporal sugerida como carga inicial (null = sem carga). */
  percentual_carga_peso_corporal: number | null;
  /** Dica de execução. */
  dicas: string;
}

/** Um dia de treino dentro do modelo JSON mestre. */
export interface ModeloDiaTreino {
  /** Título do dia (ex.: "Dia A — Peito e Tríceps"). */
  titulo: string;
  /** Exercícios do dia na ordem de execução. */
  exercicios: ModeloExercicio[];
}

/** Modelo JSON mestre de treino. */
export interface ModeloTreino {
  /** Nome do modelo. */
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

/** Densidade nutricional de um alimento (macros por 100 g/ml). */
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
  /** Unidade de medida da quantidade calculada. */
  unidade: 'g' | 'ml';
  /** Alimentos substitutos equivalentes. */
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

/** Modelo JSON mestre de dieta. */
export interface ModeloDieta {
  /** Nome do modelo. */
  nome: string;
  /** Objetivo atendido pelo modelo. */
  objetivo: Objetivo;
  /** Refeições do dia. */
  refeicoes: ModeloRefeicao[];
}

/** Índice dos modelos disponíveis (gerado no build para navegação estática). */
export interface IndiceDeModelos {
  /** Dias de treino disponíveis por modalidade e objetivo. */
  treinos: Record<string, Record<string, number[]>>;
  /** Objetivos com modelo de dieta disponível. */
  dietas: string[];
}
