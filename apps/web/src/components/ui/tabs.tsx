/**
 * tabs.tsx
 * ---------------------------------------------------------------------------
 * Abas de navegação (shadcn/ui) — implementação leve SEM Radix para manter
 * o bundle mínimo (filosofia de performance extrema do ProtocolFit).
 * Usadas no painel para alternar dias de treino e seções da dieta.
 * ---------------------------------------------------------------------------
 */
'use client';

import * as React from 'react';
import { combinarClasses } from '@/lib/util';

/** Contexto das abas — compartilha a aba ativa entre gatilho e conteúdo. */
interface ContextoDasAbas {
  valor: string;
  alterarValor: (valor: string) => void;
}

/** Cria o contexto React das abas. */
const ContextoAbas = React.createContext<ContextoDasAbas | null>(null);

/** Hook interno que acessa o contexto das abas. */
function usarAbas(): ContextoDasAbas {
  const contexto = React.useContext(ContextoAbas);
  if (!contexto) {
    throw new Error('Componentes de aba devem estar dentro de <Abas>.');
  }
  return contexto;
}

/** Propriedades do container de abas. */
interface PropriedadesAbas extends React.ComponentProps<'div'> {
  /** Valor da aba ativa por padrão. */
  valorPadrao: string;
  /** Callback executado quando a aba ativa muda. */
  aoMudar?: (valor: string) => void;
}

/** Container das abas — controla qual aba está ativa. */
function Abas({ valorPadrao, aoMudar, className, children, ...propriedades }: PropriedadesAbas) {
  // Estado da aba selecionada (começa no valor padrão).
  const [valor, alterarValor] = React.useState(valorPadrao);
  return (
    <ContextoAbas.Provider value={{ valor, alterarValor }}>
      <div data-slot="tabs" className={combinarClasses('flex flex-col gap-4', className)} {...propriedades}>
        {children}
      </div>
    </ContextoAbas.Provider>
  );
}

/** Lista horizontal dos gatilhos (botões das abas). */
function ListaDeAbas({ className, ...propriedades }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="tabs-list"
      className={combinarClasses(
        // Fundo verde claro com cantos arredondados (estilo pill).
        'inline-flex h-10 w-fit items-center justify-center gap-1 rounded-lg bg-secondary p-1 text-muted-foreground',
        className,
      )}
      {...propriedades}
    />
  );
}

/** Botão individual de uma aba. */
function GatilhoDeAba({
  valor,
  className,
  ...propriedades
}: React.ComponentProps<'button'> & { valor: string }) {
  // Acessa o contexto para saber se esta aba está ativa.
  const { valor: valorAtivo, alterarValor } = usarAbas();
  const ativa = valorAtivo === valor;
  return (
    <button
      type="button"
      data-slot="tabs-trigger"
      role="tab"
      aria-selected={ativa}
      onClick={() => alterarValor(valor)}
      className={combinarClasses(
        // Estilo base dos gatilhos.
        'inline-flex h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
        // Aba ativa: fundo branco com sombra (efeito pill selecionado).
        ativa && 'bg-card text-primary shadow-sm',
        className,
      )}
      {...propriedades}
    />
  );
}

/** Conteúdo exibido apenas quando a aba correspondente está ativa. */
function ConteudoDeAba({
  valor,
  className,
  ...propriedades
}: React.ComponentProps<'div'> & { valor: string }) {
  const { valor: valorAtivo } = usarAbas();
  // Renderiza null quando a aba não está selecionada.
  if (valorAtivo !== valor) {
    return null;
  }
  return <div data-slot="tabs-content" role="tabpanel" className={combinarClasses('outline-none', className)} {...propriedades} />;
}

export { Abas, ListaDeAbas, GatilhoDeAba, ConteudoDeAba };
