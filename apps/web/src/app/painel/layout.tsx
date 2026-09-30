/**
 * layout.tsx
 * ---------------------------------------------------------------------------
 * Layout da área logada (/painel) com guarda de sessão.
 * O componente padrão exportado é um wrapper fino que apenas delega ao
 * componente cliente interno (LayoutClienteDoPainel), responsável por:
 *   - redirecionar para /login quando não há token (possuiSessao());
 *   - buscar a conta logada (nome do usuário) e limpar a sessão + /login
 *     nos erros 401/403;
 *   - montar o shell: barra lateral fixa + área principal com animação.
 *
 * OBSERVAÇÃO: a diretiva 'use client' é por MÓDULO no React/Next — ela
 * precisa ficar no topo do arquivo e vale para todos os componentes dele.
 * O wrapper padrão foi mantido sem nenhuma lógica de cliente (apenas JSX),
 * reproduzindo o comportamento de um server component que renderiza o
 * componente cliente definido no mesmo arquivo.
 * ---------------------------------------------------------------------------
 */
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bug, HeartPulse, LogOut } from 'lucide-react';
import { BarraInferiorMobile } from '@/components/painel/barra-inferior-mobile';
import { BarraLateral } from '@/components/painel/barra-lateral';
import { Botao } from '@/components/ui/button';
import { Esqueleto } from '@/components/ui/skeleton';
import { buscarContaAtual, ErroDaApi } from '@/lib/api';
import { encerrarSessao, obterUsuario, possuiSessao } from '@/lib/armazenamento';
import { ANIMACAO_DE_ENTRADA, TRANSICAO_SUAVE, URL_DE_REPORTE_DE_BUG } from '@/lib/constantes';

/** Componente cliente com a guarda de sessão e o shell do painel. */
function LayoutClienteDoPainel({ children }: { children: ReactNode }) {
  const roteador = useRouter();
  // Verificação inicial de sessão em andamento.
  const [verificando, definirVerificando] = useState(true);
  // Nome do usuário logado (exibido na barra lateral).
  const [nomeDoUsuario, definirNomeDoUsuario] = useState<string | null>(null);

  // Executa a guarda de sessão ao montar (somente no navegador).
  useEffect(() => {
    // Sem token: redireciona para o login.
    if (!possuiSessao()) {
      roteador.replace('/login');
      return;
    }
    // Evita atualizar estado após o desmonte do componente.
    let ativo = true;
    // Com token: busca a conta para obter o nome do usuário.
    buscarContaAtual()
      .then((conta) => {
        if (!ativo) {
          return;
        }
        definirNomeDoUsuario(conta.usuario.nome);
        definirVerificando(false);
      })
      .catch((erroCapturado: unknown) => {
        if (!ativo) {
          return;
        }
        // Sessão inválida/expirada: limpa e volta ao login.
        if (erroCapturado instanceof ErroDaApi && (erroCapturado.status === 401 || erroCapturado.status === 403)) {
          encerrarSessao();
          roteador.replace('/login');
          return;
        }
        // Outros erros: usa o nome guardado localmente e segue para o painel.
        definirNomeDoUsuario(obterUsuario()?.nome ?? null);
        definirVerificando(false);
      });
    return () => {
      ativo = false;
    };
  }, [roteador]);

  /** Encerra a sessão e redireciona para o login. */
  function sairDaConta() {
    encerrarSessao();
    roteador.replace('/login');
  }

  // Enquanto verifica a sessão, exibe esqueletos centralizados.
  if (verificando) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <Esqueleto className="h-8 w-48" />
          <Esqueleto className="h-40 w-full" />
          <Esqueleto className="h-40 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* Barra lateral fixa (oculta em telas pequenas). */}
      <BarraLateral nomeDoUsuario={nomeDoUsuario} aoSair={sairDaConta} />

      {/* Cabeçalho mobile: logo + botões de ação. TEAM_005: a seta de voltar
          saiu de vez — a navegação entre telas já existe na barra inferior, e
          o logo assume o papel de atalho para o dashboard (mesmo papel do
          logo na barra lateral do desktop). */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
        <Link href="/painel" className="flex items-center gap-2" aria-label="Ir para o dashboard">
          <HeartPulse className="size-5 shrink-0 text-primary" />
          <span className="font-display text-base font-bold text-foreground">ProtocolFit</span>
        </Link>
        <div className="flex items-center gap-1">
          {/* TEAM_003: reporte de bug sempre à mão no mobile — abre uma issue
              do GitHub em nova aba. */}
          <Botao variante="fantasma" tamanho="icone" comoFilho>
            <a href={URL_DE_REPORTE_DE_BUG} target="_blank" rel="noopener noreferrer" aria-label="Reportar bug">
              <Bug />
            </a>
          </Botao>
          <Botao variante="fantasma" tamanho="icone" onClick={sairDaConta} aria-label="Sair da conta">
            <LogOut />
          </Botao>
        </div>
      </header>

      {/* Navegação inferior fixa (só mobile — o desktop usa a barra lateral). */}
      <BarraInferiorMobile />

      {/* Área principal: compensa a barra lateral (desktop) e a barra
          inferior do mobile (pb-24) para o conteúdo não ficar por baixo. */}
      <main className="md:pl-64">
        <div className="p-6 pb-24 lg:p-10 md:pb-10">
          {/* TEAM_005: o botão "Voltar" saiu — no desktop a navegação é a
              barra lateral (logo incluso), no mobile a barra inferior e o
              logo do cabeçalho. */}
          {/* Conteúdo da rota com animação de entrada suave. */}
          <motion.div
            initial={ANIMACAO_DE_ENTRADA.escondido}
            animate={ANIMACAO_DE_ENTRADA.visivel}
            transition={TRANSICAO_SUAVE}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

/** Layout do painel — wrapper fino que delega ao componente cliente interno. */
export default function LayoutDoPainel({ children }: { children: ReactNode }) {
  return <LayoutClienteDoPainel>{children}</LayoutClienteDoPainel>;
}
