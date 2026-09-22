/**
 * cartao-checkin.tsx
 * ---------------------------------------------------------------------------
 * Cartão do CHECK-IN DIÁRIO do painel. O usuário marca, todo dia:
 *
 *   - treino feito  ✅   |   dieta seguida  ✅
 *   - água bebida (ml, com atalhos de +250 / +500)
 *   - peso do dia (opcional — entra no gráfico de evolução)
 *   - observação livre
 *
 * O cartão mostra a SEQUÊNCIA (dias seguidos), o RECORDE, o total de
 * check-ins e um mini histórico dos últimos 7 dias, reforçando o hábito.
 * ---------------------------------------------------------------------------
 */
'use client';

import { useMemo, useState } from 'react';
import { Check, Droplets, Flame, Loader2, NotebookPen, Trophy, Dumbbell, Salad } from 'lucide-react';
import { Botao } from '@/components/ui/button';
import { Cartao, CartaoCabecalho, CartaoConteudo, CartaoDescricao, CartaoTitulo } from '@/components/ui/card';
import { CampoDeEntrada } from '@/components/ui/input';
import { Rotulo } from '@/components/ui/label';
import { AreaDeTexto } from '@/components/ui/textarea';
import { Selo } from '@/components/ui/badge';
import { separadorDeDatas } from '@/lib/checkin-util';
import { salvarCheckin } from '@/lib/api';
import type { Perfil, ResumoDeCheckins } from '@/lib/tipos';
import { combinarClasses } from '@/lib/util';

/** Propriedades do cartão de check-in diário. */
interface PropriedadesDoCartaoCheckin {
  /** Resumo atual dos check-ins (vindo do painel). */
  resumo: ResumoDeCheckins;
  /** Perfil do usuário (para pré-preencher o peso do dia). */
  perfil: Perfil;
  /** Chamado após salvar (para o painel recarregar a evolução, se quiser). */
  aoSalvar?: (resumo: ResumoDeCheckins) => void;
}

/** Cartão de check-in diário com sequência e histórico. */
export function CartaoCheckin({ resumo, perfil, aoSalvar }: PropriedadesDoCartaoCheckin) {
  // Estado do formulário, iniciado com o check-in de hoje (se já existir).
  const [treinoFeito, definirTreinoFeito] = useState(resumo.hoje?.treino_feito ?? false);
  const [dietaSeguida, definirDietaSeguida] = useState(resumo.hoje?.dieta_seguida ?? false);
  const [agua, definirAgua] = useState(String(resumo.hoje?.agua_ml ?? 0));
  // Peso do dia: usa o do check-in de hoje ou o peso atual do perfil.
  const [pesoDoDia, definirPesoDoDia] = useState(String(resumo.hoje?.peso_kg ?? perfil.peso_kg));
  // Observação livre do dia.
  const [observacao, definirObservacao] = useState(resumo.hoje?.observacao ?? '');
  // Controle de salvamento e mensagens.
  const [salvando, definirSalvando] = useState(false);
  const [sucesso, definirSucesso] = useState(false);
  const [erro, definirErro] = useState<string | null>(null);

  // Últimos 7 dias (do mais antigo para o mais recente) para o mini histórico.
  const ultimosSeteDias = useMemo(() => separadorDeDatas(resumo.dias_cumpridos, 7), [resumo.dias_cumpridos]);

  /** Salva o check-in do dia. */
  async function salvar() {
    definirErro(null);
    definirSucesso(false);
    // Converte os campos numéricos (aceita vírgula decimal).
    const aguaNumerica = Number(String(agua).replace(',', '.')) || 0;
    const pesoNumerico = pesoDoDia.trim() === '' ? null : Number(String(pesoDoDia).replace(',', '.'));

    if (aguaNumerica < 0 || aguaNumerica > 10000) {
      definirErro('Informe a água entre 0 e 10000 ml.');
      return;
    }
    if (pesoNumerico !== null && (!Number.isFinite(pesoNumerico) || pesoNumerico < 30 || pesoNumerico > 300)) {
      definirErro('Informe o peso entre 30 e 300 kg (ou deixe em branco).');
      return;
    }

    definirSalvando(true);
    try {
      // Envia o check-in e recebe o resumo já recalculado.
      const resposta = await salvarCheckin({
        treino_feito: treinoFeito,
        dieta_seguida: dietaSeguida,
        agua_ml: aguaNumerica,
        peso_kg: pesoNumerico,
        observacao: observacao.trim() === '' ? null : observacao.trim(),
      });
      definirSucesso(true);
      window.setTimeout(() => definirSucesso(false), 2500);
      // Avisa o painel (atualiza a sequência e, se houver peso, a evolução).
      aoSalvar?.(resposta);
    } catch (erroCapturado: unknown) {
      definirErro(erroCapturado instanceof Error ? erroCapturado.message : 'Não foi possível salvar o check-in.');
    } finally {
      definirSalvando(false);
    }
  }

  return (
    <Cartao className="gap-4">
      <CartaoCabecalho>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CartaoTitulo>Check-in de hoje</CartaoTitulo>
            <CartaoDescricao>Marque o que você cumpriu e mantenha a sequência viva</CartaoDescricao>
          </div>
          {/* Sequência atual (streak) em destaque. */}
          <Selo variante="secundario" className="gap-1 px-3 py-1 text-sm">
            <Flame className="size-3.5" /> {resumo.sequencia_atual} {resumo.sequencia_atual === 1 ? 'dia' : 'dias'}
          </Selo>
        </div>
      </CartaoCabecalho>

      <CartaoConteudo className="space-y-4">
        {/* Botões de marcação: treino e dieta. */}
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => definirTreinoFeito((valorAtual) => !valorAtual)}
            aria-pressed={treinoFeito}
            className={combinarClasses(
              'flex items-center gap-3 rounded-lg border p-3 text-left transition-colors',
              treinoFeito ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-secondary/50',
            )}
          >
            <span className={combinarClasses('flex size-9 items-center justify-center rounded-md', treinoFeito ? 'bg-primary text-primary-foreground' : 'bg-secondary text-primary')}>
              {treinoFeito ? <Check className="size-4" /> : <Dumbbell className="size-4" />}
            </span>
            <span>
              <span className="block text-sm font-semibold text-foreground">Treino feito</span>
              <span className="block text-xs text-muted-foreground">{treinoFeito ? 'Concluído hoje ✓' : 'Toque para marcar'}</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => definirDietaSeguida((valorAtual) => !valorAtual)}
            aria-pressed={dietaSeguida}
            className={combinarClasses(
              'flex items-center gap-3 rounded-lg border p-3 text-left transition-colors',
              dietaSeguida ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-secondary/50',
            )}
          >
            <span className={combinarClasses('flex size-9 items-center justify-center rounded-md', dietaSeguida ? 'bg-primary text-primary-foreground' : 'bg-secondary text-primary')}>
              {dietaSeguida ? <Check className="size-4" /> : <Salad className="size-4" />}
            </span>
            <span>
              <span className="block text-sm font-semibold text-foreground">Dieta seguida</span>
              <span className="block text-xs text-muted-foreground">{dietaSeguida ? 'Concluída hoje ✓' : 'Toque para marcar'}</span>
            </span>
          </button>
        </div>

        {/* Água e peso do dia lado a lado. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Rotulo htmlFor="checkin-agua">
              <Droplets className="size-3.5 text-primary" /> Água (ml)
            </Rotulo>
            <CampoDeEntrada
              id="checkin-agua"
              type="number"
              step="50"
              min={0}
              max={10000}
              value={agua}
              onChange={(evento) => definirAgua(evento.target.value)}
            />
            {/* Atalhos para somar água rapidamente. */}
            <div className="flex flex-wrap gap-2">
              <Botao
                variante="contorno"
                tamanho="pequeno"
                onClick={() => definirAgua(String((Number(agua.replace(',', '.')) || 0) + 250))}
              >
                +250
              </Botao>
              <Botao
                variante="contorno"
                tamanho="pequeno"
                onClick={() => definirAgua(String((Number(agua.replace(',', '.')) || 0) + 500))}
              >
                +500
              </Botao>
              <span className="text-xs text-muted-foreground">meta: {perfil.peso_kg ? `${Math.round(perfil.peso_kg * 35)} ml` : '—'}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Rotulo htmlFor="checkin-peso">Peso de hoje (kg) — opcional</Rotulo>
            <CampoDeEntrada
              id="checkin-peso"
              type="number"
              step="0.1"
              min={30}
              max={300}
              placeholder="Deixe em branco para não pesar"
              value={pesoDoDia}
              onChange={(evento) => definirPesoDoDia(evento.target.value)}
            />
            <p className="text-xs text-muted-foreground">Ao informar, o peso entra no gráfico de evolução do dia.</p>
          </div>
        </div>

        {/* Observação livre do dia. */}
        <div className="space-y-1.5">
          <Rotulo htmlFor="checkin-observacao">
            <NotebookPen className="size-3.5 text-primary" /> Observação (opcional)
          </Rotulo>
          <AreaDeTexto
            id="checkin-observacao"
            rows={2}
            maxLength={280}
            placeholder="Como foi o treino? Alguma dificuldade com a dieta?"
            value={observacao}
            onChange={(evento) => definirObservacao(evento.target.value)}
          />
        </div>

        {/* Ação de salvar + feedback. */}
        <div className="flex flex-wrap items-center gap-3">
          <Botao tamanho="pequeno" onClick={() => void salvar()} disabled={salvando}>
            {salvando ? <Loader2 className="animate-spin" /> : <Check />}
            {salvando ? 'Salvando...' : 'Salvar check-in de hoje'}
          </Botao>
          {sucesso ? <span className="text-sm font-medium text-primary">Check-in salvo ✓</span> : null}
          {erro ? <span className="text-sm font-medium text-destructive">{erro}</span> : null}
        </div>

        {/* Mini histórico dos últimos 7 dias + recorde. */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <div className="flex items-center gap-2">
            {ultimosSeteDias.map((dia) => (
              <span
                key={dia.data}
                title={`${dia.data}${dia.cumprido ? ' — cumprido' : ' — sem check-in'}`}
                className={combinarClasses(
                  'flex size-8 items-center justify-center rounded-full text-[11px] font-semibold',
                  dia.cumprido ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
                )}
              >
                {dia.rotulo}
              </span>
            ))}
          </div>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Trophy className="size-3.5 text-primary" /> recorde: {resumo.sequencia_maxima}{' '}
            {resumo.sequencia_maxima === 1 ? 'dia' : 'dias'} · total: {resumo.total} check-in(s)
          </span>
        </div>
      </CartaoConteudo>
    </Cartao>
  );
}
