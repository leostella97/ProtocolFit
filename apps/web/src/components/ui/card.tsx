/**
 * card.tsx
 * ---------------------------------------------------------------------------
 * Componentes de cartão (shadcn/ui) — superfícies elevadas usadas em toda
 * a interface do ProtocolFit (painel, formulários e seções).
 * ---------------------------------------------------------------------------
 */
import * as React from 'react';
import { combinarClasses } from '@/lib/util';

/** Cartão principal — superfície branca com borda e sombra sutil. */
function Cartao({ className, ...propriedades }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={combinarClasses(
        'flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm',
        className,
      )}
      {...propriedades}
    />
  );
}

/** Cabeçalho do cartão — título e descrição. */
function CartaoCabecalho({ className, ...propriedades }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={combinarClasses('grid auto-rows-min items-start gap-1.5 px-6', className)}
      {...propriedades}
    />
  );
}

/** Título do cartão. */
function CartaoTitulo({ className, ...propriedades }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={combinarClasses('font-display text-lg font-bold leading-none', className)}
      {...propriedades}
    />
  );
}

/** Descrição do cartão (texto secundário). */
function CartaoDescricao({ className, ...propriedades }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={combinarClasses('text-sm text-muted-foreground', className)}
      {...propriedades}
    />
  );
}

/** Ação do cabeçalho (ex.: botão no canto superior direito). */
function CartaoAcao({ className, ...propriedades }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={combinarClasses('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      {...propriedades}
    />
  );
}

/** Conteúdo do cartão. */
function CartaoConteudo({ className, ...propriedades }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="card-content" className={combinarClasses('px-6', className)} {...propriedades} />
  );
}

/** Rodapé do cartão. */
function CartaoRodape({ className, ...propriedades }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={combinarClasses('flex items-center px-6', className)}
      {...propriedades}
    />
  );
}

export { Cartao, CartaoCabecalho, CartaoRodape, CartaoTitulo, CartaoAcao, CartaoDescricao, CartaoConteudo };
