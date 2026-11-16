/**
 * aviso-modo-local.tsx
 * ---------------------------------------------------------------------------
 * Faixa discreta exibida quando o sistema roda no MODO NAVEGADOR (site
 * publicado no GitHub Pages). Deixa claro para o visitante que os dados
 * ficam apenas no navegador dele — sem servidor e sem envio de informações.
 * TEAM_005: o aviso ganhou um botão "X" que fecha a faixa; a escolha fica
 * gravada no navegador e o aviso não volta a aparecer nas próximas visitas.
 * TEAM_018: a faixa só é renderizada DEPOIS da verificação no navegador —
 * antes ela saía no HTML estático e sumia num flash ("aparece e some")
 * para quem já tinha dispensado o aviso; e agora só aparece nas páginas
 * PÚBLICAS (index e cadastro) — dentro do app ela virava ruído.
 * ---------------------------------------------------------------------------
 */
'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Info, X } from 'lucide-react';
import { Botao } from '@/components/ui/button';
import { MODO_LOCAL } from '@/lib/api';

/** Chave que lembra que o visitante já fechou o aviso do modo navegador. */
const CHAVE_AVISO_DISPENSADO = 'protocolfit_aviso_local_dispensado';

/** Páginas públicas onde o aviso faz sentido (visitante novo decide aqui). */
const PAGINAS_COM_AVISO = ['/', '/cadastro'];

/** Aviso do modo navegador (não renderiza nada no modo servidor). */
export function AvisoModoLocal() {
  // TEAM_018: só decide depois de montar no navegador — o HTML estático não
  // conhece o localStorage, então começar "visível" causava o flash da faixa.
  const [verificado, definirVerificado] = useState(false);
  // true quando o visitante fecha o aviso (nesta sessão ou em visita anterior).
  const [dispensado, definirDispensado] = useState(false);
  // TEAM_018: rota atual — o aviso só aparece nas páginas públicas.
  const caminhoAtual = (usePathname() ?? '/').replace(/\/+$/, '') || '/';

  // Ao montar no navegador, recupera a preferência gravada pelo visitante.
  useEffect(() => {
    definirDispensado(window.localStorage.getItem(CHAVE_AVISO_DISPENSADO) === '1');
    definirVerificado(true);
  }, []);

  /** Fecha o aviso e grava a escolha para não exibi-lo de novo. */
  function fecharAviso(): void {
    window.localStorage.setItem(CHAVE_AVISO_DISPENSADO, '1');
    definirDispensado(true);
  }

  // No modo servidor (API + SQLite) não há nada a avisar; antes da checagem
  // no navegador também não renderiza nada (evita o flash no HTML estático);
  // fora das páginas públicas o aviso não aparece; e depois que o visitante
  // fecha a faixa, ela não volta a ocupar a tela.
  if (!MODO_LOCAL || !verificado || dispensado || !PAGINAS_COM_AVISO.includes(caminhoAtual)) {
    return null;
  }
  // A faixa fica no FLUXO normal (sem fixed/sticky): ocupa o topo da página e
  // empurra tudo para baixo. Os cabeçalhos do app são sticky e começam abaixo
  // dela — nenhum menu (fixo ou sticky) passa por cima do texto do aviso.
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
