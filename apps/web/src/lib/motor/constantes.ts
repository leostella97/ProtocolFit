/**
 * constantes.ts (motor do navegador)
 * ---------------------------------------------------------------------------
 * Constantes de domínio do ProtocolFit no lado do cliente — as MESMAS regras
 * do backend (apps/api/src/util/constantes.ts). São usadas pelo motor de
 * cálculo que roda no navegador quando o sistema é publicado como site
 * estático (GitHub Pages), sem depender de servidor.
 * ---------------------------------------------------------------------------
 */
import type { Modalidade, Nivel, Objetivo } from '../tipos';

/** Faixa etária selecionável no onboarding (limites inclusivos). */
export interface FaixaEtaria {
  /** Valor canônico usado pela API (ex.: "15-19"). */
  valor: string;
  /** Limite inferior da faixa, em anos. */
  inicio: number;
  /** Limite superior da faixa, em anos. */
  fim: number;
  /** Rótulo amigável exibido na interface. */
  rotulo: string;
}

/** Quantidade máxima de tentativas de login falhas antes do bloqueio. */
export const LIMITE_TENTATIVAS_LOGIN = 3;

/** Duração do bloqueio da conta após estourar o limite de tentativas (horas). */
export const HORAS_DE_BLOQUEIO = 5;

/** Piso calórico de segurança por sexo (nunca prescrever abaixo disso). */
export const MINIMO_CALORIAS_POR_SEXO: Record<'masculino' | 'feminino', number> = {
  masculino: 1500,
  feminino: 1200,
};

/** Limites de validação dos dados corporais informados pelo usuário. */
export const LIMITES_CORPO = {
  peso_minimo_kg: 30,
  peso_maximo_kg: 300,
  altura_minima_cm: 100,
  altura_maxima_cm: 230,
} as const;

/** Faixas etárias selecionáveis no onboarding (limites inclusivos). */
export const FAIXAS_ETARIAS: FaixaEtaria[] = [
  { valor: '15-19', inicio: 15, fim: 19, rotulo: '15 a 19 anos' },
  { valor: '19-23', inicio: 19, fim: 23, rotulo: '19 a 23 anos' },
  { valor: '23-27', inicio: 23, fim: 27, rotulo: '23 a 27 anos' },
  { valor: '27-31', inicio: 27, fim: 31, rotulo: '27 a 31 anos' },
  { valor: '31-35', inicio: 31, fim: 35, rotulo: '31 a 35 anos' },
  { valor: '35-39', inicio: 35, fim: 39, rotulo: '35 a 39 anos' },
  { valor: '39-43', inicio: 39, fim: 43, rotulo: '39 a 43 anos' },
  { valor: '43-47', inicio: 43, fim: 47, rotulo: '43 a 47 anos' },
  { valor: '47-51', inicio: 47, fim: 51, rotulo: '47 a 51 anos' },
  { valor: '51-55', inicio: 51, fim: 55, rotulo: '51 a 55 anos' },
  { valor: '55-59', inicio: 55, fim: 59, rotulo: '55 a 59 anos' },
  { valor: '59-63', inicio: 59, fim: 63, rotulo: '59 a 63 anos' },
  { valor: '63-67', inicio: 63, fim: 67, rotulo: '63 a 67 anos' },
  { valor: '67-71', inicio: 67, fim: 71, rotulo: '67 a 71 anos' },
  { valor: '71-75', inicio: 71, fim: 75, rotulo: '71 a 75 anos' },
  { valor: '75-79', inicio: 75, fim: 79, rotulo: '75 a 79 anos' },
  { valor: '79-83', inicio: 79, fim: 83, rotulo: '79 a 83 anos' },
];

/** Objetivos disponíveis com rótulo e descrição persuasiva. */
export const OBJETIVOS: { valor: Objetivo; rotulo: string; descricao: string }[] = [
  {
    valor: 'emagrecimento',
    rotulo: 'Emagrecimento',
    descricao: 'Déficit calórico de 20% com treinos de alta densidade para queimar gordura preservando massa magra.',
  },
  {
    valor: 'hipertrofia',
    rotulo: 'Hipertrofia',
    descricao: 'Superávit calórico de 10% com treinos de força progressiva para ganho de massa muscular.',
  },
  {
    valor: 'corrida',
    rotulo: 'Corrida',
    descricao: 'Manutenção calórica com alto carboidrato e fortalecimento específico para melhorar o desempenho.',
  },
];

/** Modalidades de treino disponíveis com rótulo e descrição. */
export const MODALIDADES: { valor: Modalidade; rotulo: string; descricao: string }[] = [
  {
    valor: 'academia',
    rotulo: 'Academia',
    descricao: 'Treinos com pesos livres e máquinas, com cargas calculadas para o seu corpo.',
  },
  {
    valor: 'pesocorporal',
    rotulo: 'Peso do corpo',
    descricao: 'Treinos de calistenia que você faz em qualquer lugar, sem nenhum equipamento.',
  },
];

/** Frequências semanais de treino permitidas no onboarding. */
export const FREQUENCIAS_SEMANAIS = [2, 3, 4, 5, 6, 7];

/** Dias da semana disponíveis para treino (valores canônicos e rótulos). */
export const DIAS_DA_SEMANA: { valor: string; rotulo: string }[] = [
  { valor: 'segunda', rotulo: 'Segunda' },
  { valor: 'terca', rotulo: 'Terça' },
  { valor: 'quarta', rotulo: 'Quarta' },
  { valor: 'quinta', rotulo: 'Quinta' },
  { valor: 'sexta', rotulo: 'Sexta' },
  { valor: 'sabado', rotulo: 'Sábado' },
  { valor: 'domingo', rotulo: 'Domingo' },
];

/** Níveis de experiência aceitos no perfil. */
export const NIVEIS: Nivel[] = ['iniciante', 'intermediario', 'avancado'];

/** Monta o objeto de opções exigido pelo onboarding (mesmo formato da API). */
export function opcoesDoSistema() {
  return {
    faixas_etarias: FAIXAS_ETARIAS.map((faixa) => ({ valor: faixa.valor, rotulo: faixa.rotulo })),
    objetivos: OBJETIVOS,
    modalidades: MODALIDADES,
    frequencias_semanais: FREQUENCIAS_SEMANAIS,
    dias_semana: DIAS_DA_SEMANA,
    seguranca: { tentativas_limite: LIMITE_TENTATIVAS_LOGIN, horas_bloqueio: HORAS_DE_BLOQUEIO },
  };
}
