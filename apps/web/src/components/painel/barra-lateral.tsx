/**
 * barra-lateral.tsx
 * ---------------------------------------------------------------------------
 * Barra lateral fixa do painel — logo, navegação principal (com destaque do
 * item ativo via usePathname) e rodapé com o nome do usuário + botão Sair.
 * Fica oculta em telas pequenas (o layout exibe um cabeçalho mobile).
 * ---------------------------------------------------------------------------
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bug,
  Dumbbell,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Salad,
  ScrollText,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { Botao } from '@/components/ui/button';
import { abrirTermoDeUso } from '@/components/consentimento/aviso-de-responsabilidade';
import { URL_DE_REPORTE_DE_BUG } from '@/lib/constantes';
import { combinarClasses } from '@/lib/util';

/** Item de navegação do painel (rótulo, destino e ícone). */
export interface ItemDeNavegacao {
  /** Texto exibido no link. */
  rotulo: string;
  /** Rótulo curto exibido na barra inferior do mobile. */
  rotuloCurto: string;
  /** Rota de destino do link. */
  href: string;
  /** Ícone do lucide-react. */
  icone: LucideIcon;
}

/**
 * Itens de navegação do painel — fonte única usada tanto pela barra lateral
 * (desktop) quanto pela barra inferior (mobile em barra-inferior-mobile.tsx).
 */
export const ITENS_DE_NAVEGACAO: ItemDeNavegacao[] = [
  { rotulo: 'Dashboard', rotuloCurto: 'Início', href: '/painel', icone: LayoutDashboard },
  { rotulo: 'Meu treino', rotuloCurto: 'Treino', href: '/painel/treino', icone: Dumbbell },
  { rotulo: 'Minha dieta', rotuloCurto: 'Dieta', href: '/painel/dieta', icone: Salad },
  { rotulo: 'Meu perfil', rotuloCurto: 'Perfil', href: '/painel/perfil', icone: UserRound },
];

/** Link de navegação com destaque quando a rota atual corresponde. */
function LinkDeNavegacao({ item }: { item: ItemDeNavegacao }) {
  // Rota atual fornecida pelo roteador do Next.
  const caminhoAtual = usePathname();
  // Ativo na rota exata ou em sub-rotas (ex.: /painel/treino/*).
  const ativo = caminhoAtual === item.href || caminhoAtual.startsWith(`${item.href}/`);
  return (
    <Link
      href={item.href}
      className={combinarClasses(
        // Base: linha discreta com transição de cor suave.
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        // Item ativo: fundo verde claro com texto primário.
        ativo
          ? 'bg-secondary text-primary'
          : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
      )}
    >
      <item.icone className="size-4 shrink-0" />
      {item.rotulo}
    </Link>
  );
}

/** Propriedades da barra lateral. */
interface PropriedadesDaBarraLateral {
  /** Nome do usuário logado (null enquanto desconhecido). */
  nomeDoUsuario: string | null;
  /** Callback executado ao clicar em "Sair da conta". */
  aoSair: () => void;
}

/** Barra lateral fixa do painel (visível em telas médias/grandes). */
export function BarraLateral({ nomeDoUsuario, aoSair }: PropriedadesDaBarraLateral) {
  // Inicial do nome para o avatar circular.
  const inicialDoNome = (nomeDoUsuario?.trim().charAt(0) ?? 'U').toUpperCase();

  return (
    // Barra fixa à esquerda com borda e fundo de cartão.
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-card md:flex">
      {/* Logo do painel (âncora para o dashboard). */}
      <div className="flex items-center gap-2 border-b px-6 py-5">
        <HeartPulse className="size-6 shrink-0 text-primary" />
        <Link href="/painel" className="font-display text-lg font-bold text-foreground">
          ProtocolFit
        </Link>
      </div>

      {/* Navegação principal com rolagem própria. */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {ITENS_DE_NAVEGACAO.map((item) => (
          <LinkDeNavegacao key={item.href} item={item} />
        ))}
      </nav>

      {/* Rodapé: avatar com nome do usuário e botão de sair. */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          {/* Avatar circular com a inicial do nome. */}
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-sm font-bold text-primary">
            {inicialDoNome}
          </div>
          {/* Nome truncado + situação do plano. */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {nomeDoUsuario ?? 'Usuário'}
            </p>
            <p className="text-xs text-muted-foreground">Plano ativo</p>
          </div>
        </div>
        {/* TEAM_003: reporte de bug — abre uma issue do GitHub em nova aba. */}
        <Botao
          variante="fantasma"
          className="mt-2 w-full justify-start text-muted-foreground"
          comoFilho
        >
          <a href={URL_DE_REPORTE_DE_BUG} target="_blank" rel="noopener noreferrer">
            <Bug /> Reportar bug
          </a>
        </Botao>
        {/* Botão que reabre o termo de uso e responsabilidade a qualquer momento. */}
        <Botao
          variante="fantasma"
          className="mt-1 w-full justify-start text-muted-foreground"
          onClick={abrirTermoDeUso}
        >
          <ScrollText /> Termo de uso
        </Botao>
        {/* Botão que encerra a sessão (callback vem do layout). */}
        <Botao
          variante="fantasma"
          className="mt-1 w-full justify-start text-muted-foreground"
          onClick={aoSair}
        >
          <LogOut /> Sair da conta
        </Botao>
      </div>
    </aside>
  );
}
