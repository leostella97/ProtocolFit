/**
 * select.tsx
 * ---------------------------------------------------------------------------
 * Menu de seleção (shadcn/ui) — usa o <select> nativo estilizado para
 * máxima performance e compatibilidade (baixa latência do ProtocolFit).
 * ---------------------------------------------------------------------------
 */
import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { combinarClasses } from '@/lib/util';

/** Menu de seleção nativo estilizado. */
function MenuDeSelecao({ className, ...propriedades }: React.ComponentProps<'select'>) {
  return (
    // Wrapper relativo para posicionar o ícone da seta.
    <div className="relative w-full">
      <select
        data-slot="select"
        className={combinarClasses(
          // Aparência consistente com os inputs; remove a seta nativa.
          'peer inline-flex h-10 w-full cursor-pointer appearance-none items-center rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 pr-8',
          className,
        )}
        {...propriedades}
      />
      {/* Ícone de seta posicionado à direita (não clicável). */}
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export { MenuDeSelecao };
