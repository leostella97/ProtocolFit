/**
 * aviso-modo-local.tsx
 * ---------------------------------------------------------------------------
 * Faixa discreta exibida quando o sistema roda no MODO NAVEGADOR (site
 * publicado no GitHub Pages). Deixa claro para o visitante que os dados
 * ficam apenas no navegador dele — sem servidor e sem envio de informações.
 * TEAM_005: o aviso ganhou um botão "X" que fecha a faixa; a escolha fica
 * gravada no navegador e o aviso não volta a aparecer nas próximas visitas.
 * ---------------------------------------------------------------------------
 */
'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { Info, X } from 'lucide-react';
import { Botao } from '@/components/ui/button';
import { MODO_LOCAL } from '@/lib/api';

/** Chave que lembra que o visitante já fechou o aviso do modo navegador. */
const CHAVE_AVISO_DISPENSADO = 'protocolfit_aviso_local_dispensado';

/**
 * Efeito que roda ANTES da pintura no navegador (useLayoutEffect) e cai para
 * useEffect no servidor (onde useLayoutEffect não existe). Assim, quem já
 * fechou o aviso não vê nem um flash da faixa ao carregar a página.
 */
const useEfeitoAntesDaPintura = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** Aviso do modo navegador (não renderiza nada no modo servidor). */
export function AvisoModoLocal() {
  // true quando o visitante fecha o aviso (nesta sessão ou em visita anterior).
  const [dispensado, definirDispensado] = useState(false);

  // Ao montar no navegador, recupera a preferência gravada pelo visitante.
  useEfeitoAntesDaPintura(() => {
    if (window.localStorage.getItem(CHAVE_AVISO_DISPENSADO) === '1') {
      definirDispensado(true);
    }
  }, []);

  /** Fecha o aviso e grava a escolha para não exibi-lo de novo. */
  function fecharAviso(): void {
    window.localStorage.setItem(CHAVE_AVISO_DISPENSADO, '1');
    definirDispensado(true);
  }

  // No modo servidor (API + SQLite) não há nada a avisar; e depois que o
  // visitante fecha a faixa, ela não deve voltar a ocupar espaço na tela.
  if (!MODO_LOCAL || dispensado) {
    return null;
  }
  return (
    <div className="border-b bg-secondary/60">
      <div className="mx-auto flex max-w-6xl items-start gap-2 px-4 py-2 text-xs text-secondary-foreground sm:px-6">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <p className="flex-1">
          <strong>Modo demonstração no seu navegador:</strong> o motor de cálculo roda aqui mesmo e
          seus dados (conta, plano e pesagens) ficam salvos apenas neste navegador — nada é enviado a
          servidores.
        </p>
        {/* TEAM_005: o "X" fecha o aviso e grava a escolha no navegador. */}
        <Botao
          variante="fantasma"
          tamanho="icone"
          onClick={fecharAviso}
          aria-label="Fechar aviso"
          className="-my-1 size-6 shrink-0 text-secondary-foreground"
        >
          <X />
        </Botao>
      </div>
    </div>
  );
}
