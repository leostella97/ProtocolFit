/**
 * aviso-modo-local.tsx
 * ---------------------------------------------------------------------------
 * Faixa discreta exibida quando o sistema roda no MODO NAVEGADOR (site
 * publicado no GitHub Pages). Deixa claro para o visitante que os dados
 * ficam apenas no navegador dele — sem servidor e sem envio de informações.
 * ---------------------------------------------------------------------------
 */
import { Info } from 'lucide-react';
import { MODO_LOCAL } from '@/lib/api';

/** Aviso do modo navegador (não renderiza nada no modo servidor). */
export function AvisoModoLocal() {
  // No modo servidor (API + SQLite) não há nada a avisar.
  if (!MODO_LOCAL) {
    return null;
  }
  return (
    <div className="border-b bg-secondary/60">
      <div className="mx-auto flex max-w-6xl items-start gap-2 px-4 py-2 text-xs text-secondary-foreground sm:px-6">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <p>
          <strong>Modo demonstração no seu navegador:</strong> o motor de cálculo roda aqui mesmo e
          seus dados (conta, plano e pesagens) ficam salvos apenas neste navegador — nada é enviado a
          servidores.
        </p>
      </div>
    </div>
  );
}
