/**
 * button.tsx
 * ---------------------------------------------------------------------------
 * Componente de botão (shadcn/ui) — variantes com cva e slots do React.
 * Adaptado à identidade visual verde-saúde do ProtocolFit.
 * ---------------------------------------------------------------------------
 */
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { combinarClasses } from '@/lib/util';

/** Variantes do botão: aparência (padrão, outline, fantasma...) e tamanho. */
const variantesDoBotao = cva(
  // Classes base: aparência, foco e transições.
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*=\'size-\'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] cursor-pointer',
  {
    variants: {
      /** Variações visuais do botão. */
      variante: {
        /** Botão principal — verde esmeralda com sombra suave. */
        padrao: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
        /** Botão destrutivo — para ações perigosas (ex.: remover). */
        destrutivo: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        /** Botão com contorno — aparência limpa. */
        contorno: 'border border-input bg-card text-foreground shadow-sm hover:bg-secondary hover:text-secondary-foreground',
        /** Botão secundário — verde claro discreto. */
        secundario: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        /** Botão fantasma — apenas texto, sem fundo. */
        fantasma: 'text-foreground hover:bg-secondary hover:text-secondary-foreground',
        /** Botão link — aparência de hyperlink. */
        link: 'text-primary underline-offset-4 hover:underline',
        /** Botão gradiente — usado nas chamadas principais da landing. */
        gradiente: 'gradiente-marca text-white shadow-lg shadow-primary/30 hover:opacity-95 hover:shadow-primary/40',
      },
      /** Tamanhos disponíveis. */
      tamanho: {
        padrao: 'h-10 px-5 py-2 has-[>svg]:px-3',
        pequeno: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        grande: 'h-12 rounded-lg px-8 text-base has-[>svg]:px-6',
        icone: 'size-9',
      },
    },
    // Valores padrão quando nada é informado.
    defaultVariants: {
      variante: 'padrao',
      tamanho: 'padrao',
    },
  },
);

/** Propriedades do botão (herda do <button> + variantes). */
function Botao({
  className,
  variante,
  tamanho,
  comoFilho = false,
  ...propriedades
}: React.ComponentProps<'button'> &
  VariantProps<typeof variantesDoBotao> & {
    /** Renderiza como filho (Slot) quando verdadeiro — útil com links. */
    comoFilho?: boolean;
  }) {
  // Permite usar o botão como wrapper de outro elemento (ex.: Link).
  const Componente = comoFilho ? Slot : 'button';
  return (
    <Componente
      data-slot="button"
      className={combinarClasses(variantesDoBotao({ variante, tamanho, className }))}
      {...propriedades}
    />
  );
}

export { Botao, variantesDoBotao };
