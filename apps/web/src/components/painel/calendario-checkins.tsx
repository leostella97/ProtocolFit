/**
 * calendario-checkins.tsx
 * ---------------------------------------------------------------------------
 * Calendário mensal de CHECK-INS — mostra, dia a dia, quais dias tiveram
 * check-in (e se o dia "contou" na sequência) e quais ficaram sem.
 *
 * Situação de cada dia:
 *   ● verde cheio   → dia cumprido (treino OU dieta marcados)
 *   ◐ verde vazado  → check-in registrado, mas sem treino nem dieta
 *   · cinza         → sem check-in
 *   · apagado       → dia futuro (ainda não dá para marcar)
 *
 * TEAM_002: os dias COM check-in (cumprido ou registrado) são clicáveis —
 * tocar neles abre um painel com os detalhes do dia (treino, dieta, água,
 * peso e observação).
 *
 * A grade vem de montarCalendarioDoMes (lib/checkin-util.ts), função pura —
 * a navegação entre meses fica limitada ao período coberto pelos registros
 * recebidos (o resumo traz os últimos 60 dias).
 * ---------------------------------------------------------------------------
 */
'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Droplets, Dumbbell, NotebookPen, Salad, Weight, X } from 'lucide-react';
import { Botao } from '@/components/ui/button';
import { hojeLocal, montarCalendarioDoMes } from '@/lib/checkin-util';
import type { CheckinDiario } from '@/lib/tipos';
import { combinarClasses } from '@/lib/util';

/** Propriedades do calendário de check-ins. */
interface PropriedadesDoCalendario {
  /** Check-ins conhecidos (o resumo traz os últimos 60 dias). */
  registros: CheckinDiario[];
}

/** Iniciais dos dias da semana exibidas no cabeçalho (domingo primeiro). */
const CABECALHO_DOS_DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/** Devolve { ano, mes } (mês de 0 a 11) de uma data AAAA-MM-DD. */
function mesDaData(data: string): { ano: number; mes: number } {
  return { ano: Number(data.slice(0, 4)), mes: Number(data.slice(5, 7)) - 1 };
}

/** Nome do mês em pt-BR capitalizado (ex.: "janeiro de 2025" → "Janeiro de 2025"). */
function nomeDoMes(ano: number, mes: number): string {
  const nome = new Date(ano, mes, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

/** TEAM_002: data AAAA-MM-DD por extenso em pt-BR (ex.: "sábado, 10 de janeiro"). */
function formatarDataDoCheckin(data: string): string {
  // Meio-dia evita que o fuso horário jogue a data para o dia anterior.
  return new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Calendário mensal com os check-ins marcados por dia. */
export function CalendarioDeCheckins({ registros }: PropriedadesDoCalendario) {
  // Mês exibido — começa sempre no mês atual (dia civil do usuário).
  const hoje = hojeLocal();
  const mesAtual = mesDaData(hoje);
  const [mesVisivel, definirMesVisivel] = useState(mesAtual);

  // Limite inferior de navegação: o mês do check-in mais antigo conhecido.
  const mesMaisAntigo = useMemo(() => {
    if (registros.length === 0) {
      return mesAtual;
    }
    const maisAntiga = registros.reduce((menor, registro) => (registro.data < menor ? registro.data : menor), registros[0].data);
    const encontrado = mesDaData(maisAntiga);
    // Nunca deixa navegar para antes do mês atual menos a janela de 60 dias.
    return encontrado;
  }, [registros, mesAtual]);

  // Grade do mês visível (semanas de 7 células).
  const semanas = useMemo(
    () => montarCalendarioDoMes(mesVisivel.ano, mesVisivel.mes, registros, hoje),
    [mesVisivel, registros, hoje],
  );

  // TEAM_002: mapa data → check-in completo para o painel de detalhes do dia.
  const porData = useMemo(() => {
    const mapa = new Map<string, CheckinDiario>();
    for (const registro of registros) {
      mapa.set(registro.data, registro);
    }
    return mapa;
  }, [registros]);

  // TEAM_002: dia selecionado — só dias COM check-in respondem a clique/toque.
  const [dataSelecionada, definirDataSelecionada] = useState<string | null>(null);
  // Check-in do dia selecionado (null quando nada está selecionado).
  const checkinSelecionado = dataSelecionada ? (porData.get(dataSelecionada) ?? null) : null;

  // Só permite voltar até o mês do registro mais antigo e avançar até o mês atual.
  const podeVoltar = mesVisivel.ano > mesMaisAntigo.ano || (mesVisivel.ano === mesMaisAntigo.ano && mesVisivel.mes > mesMaisAntigo.mes);
  const podeAvancar = mesVisivel.ano < mesAtual.ano || (mesVisivel.ano === mesAtual.ano && mesVisivel.mes < mesAtual.mes);

  /** Move o mês visível para trás (-1) ou para frente (+1). */
  function mudarMes(direcao: -1 | 1) {
    // TEAM_002: ao trocar de mês o painel de detalhes fecha — ele nunca mostra
    // uma data que não pertence ao mês exibido.
    definirDataSelecionada(null);
    definirMesVisivel((atual) => {
      const data = new Date(atual.ano, atual.mes + direcao, 1);
      return { ano: data.getFullYear(), mes: data.getMonth() };
    });
  }

  return (
    <div className="space-y-3">
      {/* Navegação entre meses + título do mês exibido. */}
      <div className="flex items-center justify-between">
        <Botao variante="fantasma" tamanho="icone" onClick={() => mudarMes(-1)} disabled={!podeVoltar} aria-label="Mês anterior">
          <ChevronLeft />
        </Botao>
        <span className="text-sm font-semibold text-foreground">{nomeDoMes(mesVisivel.ano, mesVisivel.mes)}</span>
        <Botao variante="fantasma" tamanho="icone" onClick={() => mudarMes(1)} disabled={!podeAvancar} aria-label="Próximo mês">
          <ChevronRight />
        </Botao>
      </div>

      {/* Cabeçalho com as iniciais dos dias da semana. */}
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted-foreground">
        {CABECALHO_DOS_DIAS.map((inicial, indice) => (
          <span key={indice}>{inicial}</span>
        ))}
      </div>

      {/* Grade do mês: uma linha por semana. */}
      <div className="space-y-1">
        {semanas.map((semana, indiceDaSemana) => (
          <div key={indiceDaSemana} className="grid grid-cols-7 gap-1">
            {semana.map((celula, indiceDoDia) => {
              // Célula de preenchimento (fora do mês) — só ocupa espaço.
              if (celula.dia === null) {
                return <span key={indiceDoDia} className="size-8" />;
              }

              // TEAM_002: texto de ajuda do dia — os com check-in avisam que
              // são clicáveis e abrem os detalhes.
              const tituloDaCelula =
                celula.estado === 'cumprido'
                  ? `${celula.data} — dia cumprido (toque para ver detalhes)`
                  : celula.estado === 'registrado'
                    ? `${celula.data} — check-in sem treino nem dieta (toque para ver detalhes)`
                    : celula.estado === 'futuro'
                      ? `${celula.data} — ainda não chegou`
                      : `${celula.data} — sem check-in`;

              // Aparência compartilhada entre dia clicável e dia estático.
              const classesDaCelula = combinarClasses(
                'flex size-8 items-center justify-center rounded-full text-[11px] font-semibold',
                celula.estado === 'cumprido' && 'bg-primary text-primary-foreground',
                celula.estado === 'registrado' && 'border border-primary/60 bg-primary/10 text-primary',
                celula.estado === 'sem_checkin' && 'bg-secondary/60 text-muted-foreground',
                celula.estado === 'futuro' && 'text-muted-foreground/40',
                // Anel destaca o dia de hoje em qualquer situação.
                celula.data === hoje && 'ring-2 ring-primary ring-offset-1 ring-offset-card',
                // TEAM_002: anel neutro marca o dia selecionado para detalhes.
                celula.data === dataSelecionada && 'ring-2 ring-foreground ring-offset-1 ring-offset-card',
              );

              // TEAM_002: somente dias COM check-in viram botão; os demais
              // continuam inertes (sem check-in e futuro não têm o que mostrar).
              if (celula.estado !== 'cumprido' && celula.estado !== 'registrado') {
                return (
                  <span key={celula.data} title={tituloDaCelula} className={classesDaCelula}>
                    {celula.dia}
                  </span>
                );
              }

              // Tocar num dia com check-in seleciona; tocar de novo fecha.
              return (
                <button
                  key={celula.data}
                  type="button"
                  title={tituloDaCelula}
                  aria-label={`Ver detalhes do check-in de ${celula.data}`}
                  aria-pressed={dataSelecionada === celula.data}
                  onClick={() =>
                    definirDataSelecionada((dataAtual) => (dataAtual === celula.data ? null : celula.data))
                  }
                  className={combinarClasses(classesDaCelula, 'cursor-pointer transition-transform hover:scale-110')}
                >
                  {celula.dia}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legenda das marcações do calendário. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-primary" /> Dia cumprido
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border border-primary/60 bg-primary/10" /> Check-in sem treino/dieta
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-secondary" /> Sem check-in
        </span>
      </div>

      {/* TEAM_002: detalhes do dia selecionado — o que foi marcado no check-in. */}
      {checkinSelecionado ? (
        <div className="space-y-2 rounded-lg border border-border bg-secondary/30 p-3">
          {/* Data por extenso + botão para fechar os detalhes. */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-foreground">{formatarDataDoCheckin(checkinSelecionado.data)}</span>
            <Botao
              variante="fantasma"
              tamanho="icone"
              onClick={() => definirDataSelecionada(null)}
              aria-label="Fechar detalhes do dia"
            >
              <X />
            </Botao>
          </div>

          {/* Resumo do check-in daquele dia (treino, dieta, água, peso, obs). */}
          <ul className="space-y-1.5 text-sm text-foreground">
            <li className="flex items-center gap-2">
              <Dumbbell className="size-4 shrink-0 text-primary" />
              Treino: {checkinSelecionado.treino_feito ? 'feito' : 'não marcado'}
            </li>
            <li className="flex items-center gap-2">
              <Salad className="size-4 shrink-0 text-primary" />
              Dieta: {checkinSelecionado.dieta_seguida ? 'seguida' : 'não marcada'}
            </li>
            <li className="flex items-center gap-2">
              <Droplets className="size-4 shrink-0 text-primary" />
              Água: {checkinSelecionado.agua_ml.toLocaleString('pt-BR')} ml
            </li>
            {/* Peso só aparece quando foi informado no check-in do dia. */}
            {checkinSelecionado.peso_kg !== null ? (
              <li className="flex items-center gap-2">
                <Weight className="size-4 shrink-0 text-primary" />
                Peso: {checkinSelecionado.peso_kg.toLocaleString('pt-BR')} kg
              </li>
            ) : null}
            {/* Observação livre só aparece quando foi escrita. */}
            {checkinSelecionado.observacao ? (
              <li className="flex items-start gap-2">
                <NotebookPen className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="italic text-muted-foreground">“{checkinSelecionado.observacao}”</span>
              </li>
            ) : null}
          </ul>
        </div>
      ) : (
        // Dica de uso exibida enquanto nenhum dia está selecionado.
        <p className="text-[11px] text-muted-foreground">
          Toque em um dia com check-in para ver treino, dieta, água e observações.
        </p>
      )}
    </div>
  );
}
