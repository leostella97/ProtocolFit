/**
 * aviso-de-responsabilidade.tsx
 * ---------------------------------------------------------------------------
 * AVISO OBRIGATÓRIO DE RESPONSABILIDADE do ProtocolFit.
 *
 * Regras de comportamento (propositalmente rígidas):
 *  - Aparece para todo visitante ANTES de usar o sistema (inclusive antes do
 *    onboarding, ou seja, antes de informar qualquer dado corporal).
 *  - Enquanto não for aceito, a aplicação NÃO é renderizada: o conteúdo fica
 *    totalmente bloqueado atrás do aviso.
 *  - A ÚNICA forma de fechar é o botão "Li e aceito — continuar". Não existe
 *    botão de fechar (X), não fecha ao clicar fora e a tecla Esc é bloqueada.
 *  - O aceite é gravado no próprio navegador (localStorage) com a VERSÃO do
 *    texto: se o aviso mudar, todos precisam aceitar novamente.
 *
 * O botão "Termo de uso" na barra lateral reabre este aviso a qualquer momento
 * (via evento `protocolfit:abrir-termo`).
 * ---------------------------------------------------------------------------
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, BookOpenText, HeartPulse, Lock, Scale, ShieldAlert, Stethoscope } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Botao } from '@/components/ui/button';
import {
  EVENTO_ABRIR_TERMO,
  registrarAceiteDoTermo,
  termoFoiAceito,
} from '@/lib/termo-de-uso';

// Reexporta os utilitários do termo para quem já importava deste arquivo.
export { VERSAO_DO_TERMO, abrirTermoDeUso, termoFoiAceito } from '@/lib/termo-de-uso';

/** Uma seção do aviso (ícone, título e texto). */
interface SecaoDoTermo {
  /** Ícone exibido ao lado do título. */
  icone: LucideIcon;
  /** Título da seção. */
  titulo: string;
  /** Texto integral do aviso. */
  texto: string;
}

/** Conteúdo do aviso, na ordem em que é apresentado. */
const SECOES_DO_TERMO: SecaoDoTermo[] = [
  {
    icone: Lock,
    titulo: 'Sua privacidade em 1º lugar',
    texto:
      'O ProtocolFit não possui servidor nem banco de dados. Todos os seus dados de peso, idade e treinos ficam armazenados exclusivamente no seu próprio navegador e celular.',
  },
  {
    icone: BookOpenText,
    titulo: 'Caráter Exclusivamente Informativo e Educativo',
    texto:
      'O ProtocolFit é uma ferramenta automatizada de código aberto e sem fins lucrativos. Ele realiza cálculos matemáticos baseados em estimativas gerais e não substitui a avaliação, a prescrição ou o acompanhamento individualizado de um Profissional de Educação Física ou Nutricionista.',
  },
  {
    icone: Stethoscope,
    titulo: 'Consulte um Profissional',
    texto:
      'Antes de iniciar qualquer programa de exercícios ou mudança na sua alimentação, consulte um médico, nutricionista e um profissional de educação física habilitado.',
  },
  {
    icone: Scale,
    titulo: 'Ausência de Responsabilidade',
    texto:
      'O criador e os mantenedores do ProtocolFit não se responsabilizam por quaisquer danos, lesões, problemas de saúde ou prejuízos decorrentes do uso direto ou indireto das informações geradas por esta aplicação.',
  },
  {
    icone: HeartPulse,
    titulo: 'Aptidão Física',
    texto:
      'Ao utilizar esta ferramenta, você declara estar em plenas condições de saúde e assume total responsabilidade pela execução dos exercícios e escolhas alimentares.',
  },
];

/**
 * Provedor do aviso: renderiza a aplicação somente após o aceite.
 * Enquanto não houver aceite, apenas o aviso é exibido (nada mais é clicável).
 */
export function ProvedorDoTermo({ children }: { children: React.ReactNode }) {
  // Só decide depois de montar no navegador (evita divergência de hidratação).
  const [verificado, definirVerificado] = useState(false);
  // Indica se o termo já foi aceito nesta sessão/navegador.
  const [aceito, definirAceito] = useState(false);
  // Indica que o aviso foi reaberto manualmente pelo usuário.
  const [reaberto, definirReaberto] = useState(false);
  // Estado do botão de aceite (evita duplo clique).
  const [salvando, definirSalvando] = useState(false);

  /** Verifica o aceite ao montar e escuta o pedido de reabertura. */
  useEffect(() => {
    definirAceito(termoFoiAceito());
    definirVerificado(true);
    // O botão da barra lateral dispara este evento para reler o termo.
    const aoAbrir = () => definirReaberto(true);
    window.addEventListener(EVENTO_ABRIR_TERMO, aoAbrir);
    return () => window.removeEventListener(EVENTO_ABRIR_TERMO, aoAbrir);
  }, []);

  /** Bloqueia a rolagem da página enquanto o aviso estiver visível. */
  const mostrando = verificado && (!aceito || reaberto);
  useEffect(() => {
    if (!mostrando) {
      return;
    }
    // Guarda o valor anterior para restaurar depois.
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Bloqueia a tecla Esc: a única saída é o botão de aceite.
    const bloquearEsc = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        evento.stopPropagation();
      }
    };
    window.addEventListener('keydown', bloquearEsc, true);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener('keydown', bloquearEsc, true);
    };
  }, [mostrando]);

  /** Grava o aceite no navegador e libera o sistema. */
  const aceitar = useCallback(() => {
    definirSalvando(true);
    try {
      // Persiste o aceite (com versão e data) no navegador do usuário.
      registrarAceiteDoTermo();
      definirAceito(true);
      definirReaberto(false);
    } finally {
      definirSalvando(false);
    }
  }, []);

  // Antes da verificação no navegador, renderiza a aplicação normalmente
  // (o HTML do servidor continua completo para SEO) — o aviso aparece logo em
  // seguida, no primeiro ciclo do cliente, e bloqueia a interação.
  if (!verificado) {
    return <>{children}</>;
  }

  // Sem aceite (ou com o aviso reaberto): SOMENTE o aviso é renderizado.
  if (mostrando) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-do-termo"
        className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-background/95 p-4 backdrop-blur-sm sm:items-center"
      >
        <div className="my-auto w-full max-w-2xl rounded-xl border bg-card shadow-2xl">
          {/* Cabeçalho do aviso. */}
          <header className="gradiente-marca rounded-t-xl px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white/20">
                <ShieldAlert className="size-6" />
              </span>
              <div>
                <h2 id="titulo-do-termo" className="font-display text-lg font-bold sm:text-xl">
                  Aviso de responsabilidade e termo de uso
                </h2>
                <p className="text-sm text-white/90">
                  Leia com atenção antes de usar o ProtocolFit. É necessário aceitar para continuar.
                </p>
              </div>
            </div>
          </header>

          {/* Seções do aviso (os cinco pontos obrigatórios). */}
          <div className="max-h-[52vh] space-y-5 overflow-y-auto px-6 py-5">
            {SECOES_DO_TERMO.map((secao) => (
              <section key={secao.titulo} className="flex gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                  <secao.icone className="size-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{secao.titulo}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{secao.texto}</p>
                </div>
              </section>
            ))}
          </div>

          {/* Rodapé: única ação possível = ACEITAR. */}
          <footer className="space-y-3 border-t px-6 py-5">
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <Activity className="mt-0.5 size-3.5 shrink-0 text-primary" />
              Ao tocar no botão abaixo você declara que leu, entendeu e concorda com os termos acima e
              assume a responsabilidade pelo uso das informações geradas.
            </p>
            <Botao variante="gradiente" className="w-full" tamanho="grande" onClick={aceitar} disabled={salvando} autoFocus>
              {salvando ? 'Registrando aceite...' : 'Li e aceito — continuar'}
            </Botao>
          </footer>
        </div>
      </div>
    );
  }

  // Termo aceito: a aplicação é liberada normalmente.
  return <>{children}</>;
}
