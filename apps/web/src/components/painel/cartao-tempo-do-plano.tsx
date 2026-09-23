/**
 * cartao-tempo-do-plano.tsx
 * ---------------------------------------------------------------------------
 * Cartão que mostra HÁ QUANTO TEMPO o usuário está com o plano atual
 * (treino ou dieta), quando é BOM TROCAR (recomendado a cada 30 dias) e um
 * botão ATUALIZAR que recalcula o plano pela evolução física.
 *
 * Regra de renovação (determinística e explicada na interface):
 *  - A recomendação é renovar o plano a cada 30 dias.
 *  - Barra de progresso mostra o tempo percorrido dentro desse ciclo.
 *  - Passou de 30 dias: aviso "já passou da hora" (o usuário decide).
 * ---------------------------------------------------------------------------
 */
'use client';

import { useMemo, useState } from 'react';
import { CalendarClock, Check, Clock3, Loader2, RefreshCw } from 'lucide-react';
import { Botao } from '@/components/ui/button';
import { Cartao, CartaoCabecalho, CartaoConteudo, CartaoDescricao, CartaoTitulo } from '@/components/ui/card';
import { BarraDeProgresso } from '@/components/ui/progress';
import { Selo } from '@/components/ui/badge';

/** Intervalo recomendado (em dias) para renovar treino/dieta. */
const DIAS_RECOMENDADOS_PARA_RENOVAR = 30;

/** Milissegundos de um dia. */
const UM_DIA_MS = 24 * 60 * 60 * 1000;

/** Propriedades do cartão de tempo do plano. */
interface PropriedadesDoCartaoTempo {
  /** Tipo do plano exibido (define os textos "treino"/"dieta"). */
  tipo: 'treino' | 'dieta';
  /** Data de criação da cópia atual (ISO). */
  criadoEm: string;
  /** Versão atual do plano (incrementa a cada atualização). */
  versao: number;
  /** Chamado pelo botão atualizar — a página recalcula e devolve o novo plano. */
  aoAtualizar: () => Promise<{ novaVersao: number } | void>;
}

/** Cartão de tempo com o plano e renovação recomendada. */
export function CartaoTempoDoPlano({ tipo, criadoEm, versao, aoAtualizar }: PropriedadesDoCartaoTempo) {
  // Controle do botão atualizar e feedback de sucesso.
  const [atualizando, definirAtualizando] = useState(false);
  const [sucesso, definirSucesso] = useState(false);

  /** Rótulos conforme o tipo de plano (treino ou dieta). */
  const rotulos = tipo === 'treino' ? { titulo: 'Tempo com o treino', frase: 'este treino' } : { titulo: 'Tempo com a dieta', frase: 'esta dieta' };

  /** Dias desde a criação do plano (calculado a cada renderização). */
  const diasComPlano = useMemo(() => {
    const criacao = new Date(criadoEm).getTime();
    if (Number.isNaN(criacao)) {
      return 0;
    }
    return Math.max(0, Math.floor((Date.now() - criacao) / UM_DIA_MS));
  }, [criadoEm]);

  /** Dias restantes até a renovação recomendada (0 quando já passou). */
  const diasRestantes = Math.max(0, DIAS_RECOMENDADOS_PARA_RENOVAR - diasComPlano);

  /** Percentual do ciclo de 30 dias já percorrido (0..100). */
  const percentualDoCiclo = Math.min(100, Math.round((diasComPlano / DIAS_RECOMENDADOS_PARA_RENOVAR) * 100));

  /** Executa a atualização do plano (recalcula pela evolução física). */
  async function atualizar() {
    definirAtualizando(true);
    definirSucesso(false);
    try {
      // A página recalcula e troca o criadoEm/versão do plano (reseta o cartão).
      await aoAtualizar();
      definirSucesso(true);
      window.setTimeout(() => definirSucesso(false), 3000);
    } finally {
      definirAtualizando(false);
    }
  }

  return (
    <Cartao className="gap-4">
      <CartaoCabecalho>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CartaoTitulo>{rotulos.titulo}</CartaoTitulo>
            <CartaoDescricao>Renovação recomendada a cada {DIAS_RECOMENDADOS_PARA_RENOVAR} dias</CartaoDescricao>
          </div>
          {/* Versão atual do plano (mostra que a atualização mudou o número). */}
          <Selo variante="contorno">Versão {versao}</Selo>
        </div>
      </CartaoCabecalho>

      <CartaoConteudo className="space-y-3">
        {/* Há quanto tempo o usuário está com o plano. */}
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Clock3 className="size-4 shrink-0 text-primary" />
          Você está com {rotulos.frase} há{' '}
          {diasComPlano === 0 ? 'menos de 1 dia' : `${diasComPlano} ${diasComPlano === 1 ? 'dia' : 'dias'}`}
        </p>

        {/* Barra de progresso do ciclo de 30 dias. */}
        <BarraDeProgresso valor={percentualDoCiclo} />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>0 dias</span>
          <span>troca recomendada: {DIAS_RECOMENDADOS_PARA_RENOVAR} dias</span>
        </div>

        {/* Situação atual: quanto falta (ou já passou) para a troca. */}
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <CalendarClock className="mt-0.5 size-4 shrink-0 text-primary" />
          {diasRestantes > 0
            ? `Faltam ${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'} para a renovação recomendada.`
            : 'Já passou da hora de renovar — sua evolução pede um plano novo.'}
        </p>

        {/* Botão atualizar + feedback de sucesso. */}
        <div className="flex flex-wrap items-center gap-3">
          <Botao onClick={() => void atualizar()} disabled={atualizando}>
            {atualizando ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            {atualizando ? 'Atualizando...' : 'Atualizar plano'}
          </Botao>
          {sucesso ? (
            <span className="flex items-center gap-1 text-sm font-medium text-primary">
              <Check className="size-4" /> Plano atualizado ✓
            </span>
          ) : null}
        </div>
      </CartaoConteudo>
    </Cartao>
  );
}
