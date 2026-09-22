/**
 * separator.tsx
 * ---------------------------------------------------------------------------
 * Separador visual (shadcn/ui) — linha sutil entre seções.
 * ---------------------------------------------------------------------------
 */
'use client';

import * as React from 'react';
import { combinarClasses } from '@/lib/util';

/** Separador horizontal ou vertical. */
function Separador({
  className,
  orientacao = 'horizontal',
  decorativo = true,
  ...propriedades
}: React.ComponentProps<'div'> & {
  /** Orientação da linha: 'horizontal' | 'vertical'. */
  orientacao?: 'horizontal' | 'vertical';
  /** Elemento decorativo (sem leitura por leitores de tela). */
  decorativo?: boolean;
}) {
  return (
    <div
      role={decorativo ? 'none' : 'separator'}
      data-orientation={orientacao}
      className={combinarClasses(
        // Cor da linha: borda do tema com transparência.
        'shrink-0 bg-border',
        orientacao === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...propriedades}
    />
  );
}

export { Separador };
