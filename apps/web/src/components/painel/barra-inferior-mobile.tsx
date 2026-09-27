/**
 * barra-inferior-mobile.tsx
 * ---------------------------------------------------------------------------
 * Barra de navegação INFERIOR do painel — visível só em telas pequenas
 * (md:hidden). No desktop a navegação fica na BarraLateral; sem este
 * componente o usuário de celular não conseguia chegar em "Meu perfil",
 * "Meu treino" e "Minha dieta" (o cabeçalho mobile só tinha voltar e sair).
 *
 * Os itens vêm de ITENS_DE_NAVEGACAO (barra-lateral.tsx) — mesma fonte para
 * os dois modos, então um link novo aparece nos dois lugares.
 * ---------------------------------------------------------------------------
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ITENS_DE_NAVEGACAO } from '@/components/painel/barra-lateral';
import { combinarClasses } from '@/lib/util';

/** Barra inferior fixa com os itens de navegação do painel (somente mobile). */
export function BarraInferiorMobile() {
  // Rota atual fornecida pelo roteador do Next.
  const caminhoAtual = usePathname();

  return (
    // Barra fixa na base da tela, acima do conteúdo (z-30) e só no mobile.
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:hidden"
    >
      <div className="grid grid-cols-4">
        {ITENS_DE_NAVEGACAO.map((item) => {
          // Ativo na rota exata ou em sub-rotas (ex.: /painel/treino/*).
          const ativo = caminhoAtual === item.href || caminhoAtual.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={ativo ? 'page' : undefined}
              className={combinarClasses(
                // Base: ícone sobre rótulo, área de toque generosa.
                'flex flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-medium transition-colors',
                ativo ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <item.icone className="size-5 shrink-0" />
              {item.rotuloCurto}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
