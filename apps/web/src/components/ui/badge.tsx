/**
 * badge.tsx
 * ---------------------------------------------------------------------------
 * Etiqueta/selo (shadcn/ui) — destaca categorias, versões e status.
 * ---------------------------------------------------------------------------
 */
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { combinarClasses } from '@/lib/util';

/** Variantes visuais do selo. */
const variantesDoSelo = cva(
  // Base: cantos arredondados, texto pequeno e semibold.
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium transition-[color,box-shadow] [&_svg]:pointer-events-none [&_svg:not([class*=\'size-\'])]:size-3 shrink-0 [&_svg]:shrink-0',
  {
    variants: {
      /** Variações de cor do selo. */
      variante: {
        /** Padrão — verde esmeralda suave. */
        padrao: 'border-transparent bg-primary text-primary-foreground',
        /** Secundário — fundo verde claro. */
        secundario: 'border-transparent bg-secondary text-secondary-foreground',
        /** Destrutivo — alertas vermelhos. */
        destrutivo: 'border-transparent bg-destructive text-destructive-foreground',
        /** Contorno — apenas borda, fundo transparente. */
        contorno: 'border-border bg-card text-foreground',
      },
    },
    defaultVariants: {
      variante: 'padrao',
    },
  },
);

/** Selo padrão do ProtocolFit. */
function Selo({
  className,
  variante,
  comoFilho = false,
  ...propriedades
}: React.ComponentProps<'span'> & VariantProps<typeof variantesDoSelo> & { comoFilho?: boolean }) {
  // Permite renderizar como filho (ex.: dentro de links).
  const Componente = comoFilho ? Slot : 'span';
  return (
    <Componente
      data-slot="badge"
      className={combinarClasses(variantesDoSelo({ variante }), className)}
      {...propriedades}
    />
  );
}

export { Selo, variantesDoSelo };
