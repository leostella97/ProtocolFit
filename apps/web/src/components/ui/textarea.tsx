/**
 * textarea.tsx
 * ---------------------------------------------------------------------------
 * Área de texto multi-linhas (shadcn/ui) — usada em observações do painel.
 * ---------------------------------------------------------------------------
 */
import * as React from 'react';
import { combinarClasses } from '@/lib/util';

/** Área de texto padrão do ProtocolFit. */
function AreaDeTexto({ className, ...propriedades }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={combinarClasses(
        // Mesma linguagem visual dos inputs, com altura mínima maior.
        'flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-card px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className,
      )}
      {...propriedades}
    />
  );
}

export { AreaDeTexto };
