/**
 * input.tsx
 * ---------------------------------------------------------------------------
 * Campo de entrada de texto (shadcn/ui) — usado em formulários de login,
 * cadastro, onboarding e edições do painel.
 * ---------------------------------------------------------------------------
 */
import * as React from 'react';
import { combinarClasses } from '@/lib/util';

/** Campo de entrada padrão do ProtocolFit. */
function CampoDeEntrada({ className, type = 'text', ...propriedades }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={combinarClasses(
        // Aparência: borda clara, fundo branco, foco com anel verde.
        'flex h-10 w-full min-w-0 rounded-md border border-input bg-card px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        className,
      )}
      {...propriedades}
    />
  );
}

export { CampoDeEntrada };
