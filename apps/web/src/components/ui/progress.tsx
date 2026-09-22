/**
 * progress.tsx
 * ---------------------------------------------------------------------------
 * Barra de progresso (shadcn/ui) — exibe metas cumpridas (ex.: calorias
 * consumidas x meta diária) com a cor verde da marca.
 * ---------------------------------------------------------------------------
 */
'use client';

import * as React from 'react';
import { combinarClasses } from '@/lib/util';

/** Barra de progresso animada via CSS custom property. */
function BarraDeProgresso({
  className,
  valor,
  ...propriedades
}: React.ComponentProps<'div'> & { valor?: number }) {
  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      // Informa o progresso por CSS (variável --progresso) para a barra filha.
      style={{ '--progresso': `${Math.min(Math.max(valor ?? 0, 0), 100)}%` } as React.CSSProperties}
      aria-valuenow={valor}
      className={combinarClasses(
        'relative h-2 w-full overflow-hidden rounded-full bg-secondary',
        className,
      )}
      {...propriedades}
    >
      {/* Preenchimento verde esmeralda com transição suave. */}
      <div
        data-slot="progress-bar"
        className="h-full w-0 flex-1 rounded-full bg-primary transition-all duration-500"
        style={{ width: 'var(--progresso)' }}
      />
    </div>
  );
}

export { BarraDeProgresso };
