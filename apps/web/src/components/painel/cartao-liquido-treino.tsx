/**
 * cartao-liquido-treino.tsx — TEAM_017
 * ---------------------------------------------------------------------------
 * Formulário de LÍQUIDO dentro da página do treino: "quanto você bebeu?"
 *
 * O valor registrado aqui INCREMENTA o `agua_ml` do check-in de hoje — o
 * líquido global do dia é uma única fonte de verdade (o cartão de check-in
 * do painel continua editável e já mostra o total com a parte do treino).
 *
 * Antes de gravar, o resumo é rebuscado: a soma acontece sobre o total MAIS
 * FRESCO do dia, então uma edição feita no painel com o treino aberto não é
 * sobrescrita. A validação da soma (incremento positivo + teto diário) é a
 * função pura somarAguaDoDia() de checkin-util.ts.
 * ---------------------------------------------------------------------------
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Droplets, Loader2 } from 'lucide-react';
import { Botao } from '@/components/ui/button';
import { Cartao, CartaoCabecalho, CartaoConteudo, CartaoDescricao, CartaoTitulo } from '@/components/ui/card';
import { CampoDeEntrada } from '@/components/ui/input';
import { Rotulo } from '@/components/ui/label';
import { BarraDeProgresso } from '@/components/ui/progress';
import { buscarCheckins, salvarCheckin } from '@/lib/api';
import { AGUA_MAXIMA_ML, somarAguaDoDia } from '@/lib/checkin-util';

/** Propriedades do cartão de líquido do treino. */
interface PropriedadesDoCartaoLiquidoTreino {
  /** Total de líquido já registrado hoje no check-in (ml). */
  aguaHojeMl: number;
  /** Meta diária de líquido do plano (ml) — referência da barra de progresso. */
  metaAguaMl: number;
  /** Avisa a página quando o total do dia muda (estado sincronizado). */
  aoMudarTotal: (novoTotalMl: number) => void;
}

/** Formulário de líquido do treino — incrementa o agua_ml do check-in de hoje. */
export function CartaoLiquidoTreino({ aguaHojeMl, metaAguaMl, aoMudarTotal }: PropriedadesDoCartaoLiquidoTreino) {
  // Total do dia exibido no cartão (sincronizado com o check-in).
  const [totalMl, definirTotalMl] = useState(aguaHojeMl);
  // Quantidade digitada que será somada ao total (string do input).
  const [quantidade, definirQuantidade] = useState('');
  // Salvamento em andamento + feedbacks de sucesso e de erro.
  const [salvando, definirSalvando] = useState(false);
  const [sucesso, definirSucesso] = useState(false);
  const [erro, definirErro] = useState<string | null>(null);
  // Referência do timeout do "Registrado ✓" — cancelado no desmonte.
  const temporizadorSucesso = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (temporizadorSucesso.current !== null) {
        window.clearTimeout(temporizadorSucesso.current);
      }
    },
    [],
  );

  // Re-sincroniza o total exibido quando o valor de fora muda (ex.: recarga
  // da página após "Tentar novamente" ou edição conhecida pelo pai).
  useEffect(() => {
    definirTotalMl(aguaHojeMl);
  }, [aguaHojeMl]);

  /** Registra a quantidade digitada no campo no check-in de hoje. */
  async function registrarLiquido() {
    definirErro(null);
    definirSucesso(false);
    // Converte o texto digitado para número (aceita vírgula decimal).
    const adicionalMl = Number(quantidade.replace(',', '.'));
    definirSalvando(true);
    try {
      // Rebusca o resumo para somar sobre o total MAIS FRESCO do dia —
      // merge de campos do POST preserva treino/dieta/peso/observação.
      const resumoAtual = await buscarCheckins();
      const resultado = somarAguaDoDia(resumoAtual.hoje?.agua_ml ?? 0, adicionalMl);
      if (!resultado.ok) {
        definirErro(resultado.erro);
        return;
      }
      const resposta = await salvarCheckin({ agua_ml: resultado.totalMl });
      // O total gravado volta no check-in da resposta (fonte da verdade).
      const novoTotalMl = resposta.checkin.agua_ml;
      definirTotalMl(novoTotalMl);
      aoMudarTotal(novoTotalMl);
      definirQuantidade('');
      // Feedback "Registrado ✓" por 2,5 s (timeout limpo no desmonte).
      definirSucesso(true);
      if (temporizadorSucesso.current !== null) {
        window.clearTimeout(temporizadorSucesso.current);
      }
      temporizadorSucesso.current = window.setTimeout(() => definirSucesso(false), 2500);
    } catch (erroCapturado: unknown) {
      definirErro(
        erroCapturado instanceof Error ? erroCapturado.message : 'Não foi possível registrar o líquido.',
      );
    } finally {
      definirSalvando(false);
    }
  }

  // Percentual da meta diária já alcançado (a barra trava em 100%).
  const percentualDaMeta = metaAguaMl > 0 ? (totalMl / metaAguaMl) * 100 : 0;

  return (
    <Cartao className="gap-4">
      <CartaoCabecalho>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CartaoTitulo className="flex items-center gap-2">
              <Droplets className="size-5 text-sky-600" /> Líquido no treino
            </CartaoTitulo>
            <CartaoDescricao>O que você beber aqui soma no check-in de hoje</CartaoDescricao>
          </div>
          {/* Total do dia sincronizado com o check-in + meta do plano. */}
          <span className="text-sm text-muted-foreground">
            hoje: <strong className="text-foreground">{totalMl} ml</strong>
            {metaAguaMl > 0 ? ` · meta ${metaAguaMl} ml` : ''}
          </span>
        </div>
      </CartaoCabecalho>

      <CartaoConteudo className="space-y-3">
        {/* Barra do total do dia contra a meta diária do plano. */}
        {metaAguaMl > 0 ? <BarraDeProgresso valor={percentualDaMeta} /> : null}

        {/* Formulário: campo de ml + atalhos + botão de registro. */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-36 space-y-1.5">
            <Rotulo htmlFor="liquido-do-treino">Quanto bebeu? (ml)</Rotulo>
            <CampoDeEntrada
              id="liquido-do-treino"
              type="number"
              inputMode="numeric"
              step={50}
              min={0}
              max={AGUA_MAXIMA_ML}
              placeholder="ex.: 500"
              value={quantidade}
              disabled={salvando}
              onChange={(evento) => definirQuantidade(evento.target.value)}
              onKeyDown={(evento) => {
                // Enter no campo também registra (atalho durante a sessão).
                if (evento.key === 'Enter') {
                  void registrarLiquido();
                }
              }}
            />
          </div>
          {/* Atalhos somam no campo — mesmo padrão do cartão de check-in. */}
          <Botao
            variante="contorno"
            tamanho="pequeno"
            disabled={salvando}
            onClick={() => definirQuantidade(String((Number(quantidade.replace(',', '.')) || 0) + 250))}
          >
            +250
          </Botao>
          <Botao
            variante="contorno"
            tamanho="pequeno"
            disabled={salvando}
            onClick={() => definirQuantidade(String((Number(quantidade.replace(',', '.')) || 0) + 500))}
          >
            +500
          </Botao>
          <Botao tamanho="pequeno" disabled={salvando} onClick={() => void registrarLiquido()}>
            {salvando ? <Loader2 className="animate-spin" /> : <Check />}
            {salvando ? 'Registrando...' : 'Registrar no check-in'}
          </Botao>
        </div>

        {/* Feedbacks: sucesso temporário e erro de validação/rede. */}
        {sucesso ? <span className="text-sm font-medium text-primary">Registrado ✓</span> : null}
        {erro ? <span className="text-sm font-medium text-destructive">{erro}</span> : null}
      </CartaoConteudo>
    </Cartao>
  );
}
