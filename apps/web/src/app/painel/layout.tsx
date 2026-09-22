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
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, HeartPulse, LogOut } from 'lucide-react';
import { BarraLateral } from '@/components/painel/barra-lateral';
import { Botao } from '@/components/ui/button';
import { Esqueleto } from '@/components/ui/skeleton';
import { buscarContaAtual, ErroDaApi } from '@/lib/api';
import { encerrarSessao, obterUsuario, possuiSessao } from '@/lib/armazenamento';
import { ANIMACAO_DE_ENTRADA, TRANSICAO_SUAVE } from '@/lib/constantes';

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

  /** Volta para a página anterior do histórico do navegador. */
  function voltarPagina() {
    roteador.back();
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

      {/* Cabeçalho mobile: seta de voltar + logo + botão de sair. */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          {/* Seta para a esquerda: volta para a página anterior. */}
          <Botao variante="fantasma" tamanho="icone" onClick={voltarPagina} aria-label="Voltar para a página anterior">
            <ArrowLeft />
          </Botao>
          <HeartPulse className="size-5 shrink-0 text-primary" />
          <span className="font-display text-base font-bold text-foreground">ProtocolFit</span>
        </div>
        <Botao variante="fantasma" tamanho="icone" onClick={sairDaConta} aria-label="Sair da conta">
          <LogOut />
        </Botao>
      </header>

      {/* Área principal com compensação da largura da barra lateral. */}
      <main className="md:pl-64">
        <div className="p-6 lg:p-10">
          {/* Seta para a esquerda: volta para a página anterior (todas as telas). */}
          <div className="mb-4">
            <Botao variante="fantasma" tamanho="pequeno" onClick={voltarPagina} className="text-muted-foreground">
              <ArrowLeft /> Voltar
            </Botao>
          </div>
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
