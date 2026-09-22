/**
 * provedor-pwa.tsx
 * ---------------------------------------------------------------------------
 * Registra o service worker e exibe o AVISO PARA INSTALAR o ProtocolFit
 * como aplicativo (PWA):
 *
 *  - Android / Chrome / Edge: usa o evento nativo `beforeinstallprompt` e
 *    mostra o botão "Instalar agora" (instalação em um toque).
 *  - iPhone / iPad (Safari): o iOS não tem instalação programática, então o
 *    aviso ensina o caminho "Compartilhar → Adicionar à Tela de Início".
 *  - Se o app JÁ estiver instalado (janela própria), o aviso não aparece.
 *  - Se o usuário dispensar, o aviso volta a aparecer depois de 7 dias.
 *
 * O componente também confirma a instalação concluída com uma mensagem.
 * ---------------------------------------------------------------------------
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Download, Share2, Smartphone, X } from 'lucide-react';
import { Botao } from '@/components/ui/button';
import { MODO_LOCAL } from '@/lib/api';

/** Caminho base do site (vazio em dev, "/ProtocolFit" no GitHub Pages). */
const CAMINHO_BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** Chave usada para lembrar que o usuário dispensou o aviso. */
const CHAVE_DISPENSA = 'protocolfit_pwa_dispensado';

/** Sete dias em milissegundos (tempo até o aviso reaparecer). */
const SETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;

/** Evento não padronizado do Chrome/Edge para instalação do PWA. */
interface EventoDeInstalacao extends Event {
  /** Dispara o diálogo nativo de instalação. */
  prompt: () => Promise<void>;
  /** Resultado da escolha do usuário. */
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Verifica se o app já está rodando instalado (janela própria). */
function estaInstalado(): boolean {
  // Modo standalone (Android/desktop) ou navegador do iOS em modo app.
  const emModoApp = window.matchMedia('(display-mode: standalone)').matches;
  const iosInstalado = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return emModoApp || iosInstalado;
}

/** Detecta aparelhos da Apple (onde a instalação é manual pelo Safari). */
function ehAparelhoApple(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

/** Provedor do PWA: registra o service worker e controla o aviso de instalação. */
export function ProvedorPwa() {
  // Evento de instalação capturado (Android/Chrome/Edge).
  const [eventoDeInstalacao, definirEventoDeInstalacao] = useState<EventoDeInstalacao | null>(null);
  // Controla a visibilidade do aviso.
  const [mostrarAviso, definirMostrarAviso] = useState(false);
  // Indica que é um aparelho Apple (instruções manuais).
  const [ehApple, definirEhApple] = useState(false);
  // Mensagem de confirmação após instalar.
  const [instaladoAgora, definirInstaladoAgora] = useState(false);
  // Indica que o service worker já está ativo (modo offline disponível).
  const [offlinePronto, definirOfflinePronto] = useState(false);

  /** Registra o service worker responsável pelo funcionamento offline. */
  useEffect(() => {
    // O service worker é registrado apenas em produção (evita cache no dev).
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') {
      return;
    }
    navigator.serviceWorker
      .register(`${CAMINHO_BASE}/sw.js`)
      .then(() => definirOfflinePronto(true))
      .catch(() => definirOfflinePronto(false));
  }, []);

  /** Configura o aviso de instalação após o primeiro carregamento. */
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    // App já instalado: não há nada a oferecer.
    if (estaInstalado()) {
      return;
    }
    // Ativa as instruções manuais para iPhone/iPad.
    definirEhApple(ehAparelhoApple());

    // Verifica se o usuário dispensou o aviso recentemente.
    const dispensadoEm = Number(window.localStorage.getItem(CHAVE_DISPENSA) ?? 0);
    const podeMostrar = Date.now() - dispensadoEm > SETE_DIAS_MS;

    // 1) Android/Chrome/Edge: o navegador informa que o app é instalável.
    const aoPoderInstalar = (evento: Event) => {
      // Impede o mini-aviso automático do navegador (usamos o nosso).
      evento.preventDefault();
      definirEventoDeInstalacao(evento as EventoDeInstalacao);
      if (podeMostrar) {
        definirMostrarAviso(true);
      }
    };

    // 2) iOS e navegadores sem suporte: mostra o aviso com instruções.
    if (ehAparelhoApple() && podeMostrar) {
      definirMostrarAviso(true);
    }

    // 3) Instalação concluída: esconde o aviso e confirma para o usuário.
    const aoInstalar = () => {
      definirMostrarAviso(false);
      definirEventoDeInstalacao(null);
      definirInstaladoAgora(true);
      // A confirmação desaparece sozinha após 6 segundos.
      window.setTimeout(() => definirInstaladoAgora(false), 6000);
    };

    window.addEventListener('beforeinstallprompt', aoPoderInstalar);
    window.addEventListener('appinstalled', aoInstalar);
    return () => {
      window.removeEventListener('beforeinstallprompt', aoPoderInstalar);
      window.removeEventListener('appinstalled', aoInstalar);
    };
  }, []);

  /** Executa a instalação nativa (Android/Chrome/Edge). */
  const instalar = useCallback(async () => {
    if (!eventoDeInstalacao) {
      return;
    }
    // Abre o diálogo nativo de instalação.
    await eventoDeInstalacao.prompt();
    const escolha = await eventoDeInstalacao.userChoice;
    if (escolha.outcome === 'accepted') {
      definirMostrarAviso(false);
      definirInstaladoAgora(true);
      window.setTimeout(() => definirInstaladoAgora(false), 6000);
    }
    definirEventoDeInstalacao(null);
  }, [eventoDeInstalacao]);

  /** Dispensa o aviso por 7 dias. */
  const dispensar = useCallback(() => {
    window.localStorage.setItem(CHAVE_DISPENSA, String(Date.now()));
    definirMostrarAviso(false);
  }, []);

  return (
    <>
      {/* Mensagem de confirmação após instalar o aplicativo. */}
      {instaladoAgora ? (
        <div className="fixed inset-x-4 bottom-4 z-[60] mx-auto max-w-sm rounded-xl border border-primary/30 bg-card p-4 shadow-lg sm:inset-x-auto sm:right-6">
          <p className="flex items-center gap-2 text-sm font-semibold text-primary">
            <CheckCircle2 className="size-4 shrink-0" /> ProtocolFit instalado com sucesso!
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Abra pelo ícone na tela inicial — o sistema funciona até sem internet.
          </p>
        </div>
      ) : null}

      {/* Aviso para instalar o aplicativo. */}
      {mostrarAviso && !instaladoAgora ? (
        <aside className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-xl border bg-card p-4 shadow-xl sm:inset-x-auto sm:right-6 sm:bottom-6">
          <div className="flex items-start gap-3">
            {/* Ícone do aplicativo. */}
            <span className="gradiente-marca flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg text-white">
              <Smartphone className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-bold text-foreground">Instale o ProtocolFit</p>
              {/* Instruções específicas por plataforma. */}
              {ehApple && !eventoDeInstalacao ? (
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  No iPhone/iPad: toque em <Share2 className="inline size-3.5 align-text-bottom" />{' '}
                  <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong> para usar
                  como aplicativo.
                </p>
              ) : (
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Tenha o app na tela inicial, em janela própria e com <strong>funcionamento offline</strong> —
                  {MODO_LOCAL ? ' seus dados continuam salvos no seu aparelho.' : ' acesso em um toque.'}
                </p>
              )}
              {/* Ações do aviso. */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {eventoDeInstalacao ? (
                  <Botao tamanho="pequeno" onClick={() => void instalar()}>
                    <Download /> Instalar agora
                  </Botao>
                ) : null}
                <Botao variante="fantasma" tamanho="pequeno" onClick={dispensar}>
                  Depois
                </Botao>
                {/* Selo do modo offline, quando o service worker já está ativo. */}
                {offlinePronto ? (
                  <span className="text-[11px] font-medium text-primary">offline pronto ✓</span>
                ) : null}
              </div>
            </div>
            {/* Fechar o aviso. */}
            <Botao variante="fantasma" tamanho="icone" onClick={dispensar} aria-label="Fechar aviso de instalação">
              <X />
            </Botao>
          </div>
        </aside>
      ) : null}
    </>
  );
}
