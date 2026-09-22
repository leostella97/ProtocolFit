/**
 * label.tsx
 * ---------------------------------------------------------------------------
 * Rótulo de campo de formulário (shadcn/ui) — acessível via htmlFor.
 * ---------------------------------------------------------------------------
 */
'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { combinarClasses } from '@/lib/util';

/** Rótulo padrão de campos do ProtocolFit. */
function Rotulo({ className, ...propriedades }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={combinarClasses(
        // Texto pequeno, semibold, com cursor de seleção sobre o campo.
        'flex items-center gap-2 text-sm font-medium leading-none select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      {...propriedades}
    />
  );
}

export { Rotulo };
