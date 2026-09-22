/**
 * cartao-resumo.tsx
 * ---------------------------------------------------------------------------
 * Cartão de métrica reutilizável do painel — exibe um valor em destaque
 * (peso, IMC, meta calórica...) com ícone em quadrado verde, unidade e um
 * rodapé opcional com contexto. Usado na grade de resumo do Dashboard.
 * ---------------------------------------------------------------------------
 */
import type { ReactNode } from 'react';
import { Cartao } from '@/components/ui/card';
import { combinarClasses } from '@/lib/util';

/** Propriedades do cartão de resumo. */
interface PropriedadesDoCartaoResumo {
  /** Título da métrica (ex.: "Peso atual"). */
  titulo: string;
  /** Valor principal exibido em destaque. */
  valor: string | number;
  /** Unidade opcional exibida ao lado do valor (ex.: "kg"). */
  unidade?: string;
  /** Ícone do cartão (componente do lucide-react). */
  icone: ReactNode;
  /** Rodapé opcional com contexto da métrica (delta, classificação...). */
  rodape?: ReactNode;
  /** Classes extras para a cor do ícone (ex.: "text-sky-600"). */
  corDoIcone?: string;
}

/** Cartão de métrica do painel — valor grande com ícone em quadrado. */
export function CartaoResumo({
  titulo,
  valor,
  unidade,
  icone,
  rodape,
  corDoIcone,
}: PropriedadesDoCartaoResumo) {
  return (
    // Superfície elevada com espaçamento interno confortável.
    <Cartao className="gap-4 p-5">
      <div className="flex items-start justify-between gap-4">
        {/* Lado esquerdo: título discreto + valor na fonte de exibição. */}
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{titulo}</p>
          <p className="font-display text-3xl font-bold text-foreground">
            {valor}
            {/* Unidade menor e mais clara logo após o número. */}
            {unidade ? (
              <span className="ml-1 text-sm font-semibold text-muted-foreground">{unidade}</span>
            ) : null}
          </p>
        </div>
        {/* Ícone em quadrado arredondado (verde por padrão, cor sobrescrevível). */}
        <div
          className={combinarClasses(
            'flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary',
            corDoIcone,
          )}
        >
          {icone}
        </div>
      </div>
      {/* Rodapé opcional com contexto da métrica. */}
      {rodape ? <p className="text-xs text-muted-foreground">{rodape}</p> : null}
    </Cartao>
  );
}
