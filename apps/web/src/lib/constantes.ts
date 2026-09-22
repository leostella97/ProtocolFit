/**
 * constantes.ts
 * ---------------------------------------------------------------------------
 * Constantes visuais do frontend — cores dos gráficos, ícones e valores de
 * referência usados nas telas (as opções oficiais vêm da API via /opcoes).
 * ---------------------------------------------------------------------------
 */

/** Cores usadas nos gráficos recharts (mesma paleta dos tokens CSS). */
export const CORES_DO_GRAFICO = {
  peso: 'oklch(0.6 0.15 160)', // verde esmeralda — linha de evolução de peso
  proteina: 'oklch(0.6 0.15 160)', // proteína (verde)
  carboidrato: 'oklch(0.68 0.12 180)', // carboidrato (teal)
  gordura: 'oklch(0.8 0.16 95)', // gordura (limão)
  calorias: 'oklch(0.62 0.14 240)', // calorias (azul)
} as const;

/** Paleta dos setores do gráfico de pizza de macronutrientes. */
export const CORES_DOS_MACROS = [
  CORES_DO_GRAFICO.proteina,
  CORES_DO_GRAFICO.carboidrato,
  CORES_DO_GRAFICO.gordura,
] as const;

/** Nomes das macros no gráfico de pizza. */
export const NOMES_DOS_MACROS = ['Proteínas', 'Carboidratos', 'Gorduras'] as const;

/** Animação padrão do framer-motion (aparecer deslizando suavemente). */
export const ANIMACAO_DE_ENTRADA = {
  escondido: { opacity: 0, y: 24 },
  visivel: { opacity: 1, y: 0 },
} as const;

/** Transição padrão do framer-motion (spring suave). */
export const TRANSICAO_SUAVE = { type: 'spring', stiffness: 120, damping: 18 } as const;
