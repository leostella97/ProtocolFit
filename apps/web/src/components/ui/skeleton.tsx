/**
 * skeleton.tsx
 * ---------------------------------------------------------------------------
 * Esqueleto de carregamento (shadcn/ui) — pulsação suave exibida enquanto
 * os dados do painel chegam da API (carregamento em milissegundos, mas
 * ainda assim com feedback visual elegante).
 * ---------------------------------------------------------------------------
 */
import { combinarClasses } from '@/lib/util';

/** Bloco de esqueleto pulsante. */
function Esqueleto({ className, ...propriedades }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={combinarClasses('animate-pulse rounded-md bg-secondary', className)}
      {...propriedades}
    />
  );
}

export { Esqueleto };
