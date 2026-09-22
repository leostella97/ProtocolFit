/**
 * page.tsx — Treino do painel
 * ---------------------------------------------------------------------------
 * Exibe o plano de treino organizado em abas (um dia por aba). Cada
 * exercício é um cartão editável (séries, repetições e carga) que salva via
 * editarExercicio(), com feedback "Salvo ✓" temporário ou erro em vermelho.
 * ---------------------------------------------------------------------------
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Lightbulb, Pencil, Save, Timer } from 'lucide-react';
import { Botao } from '@/components/ui/button';
import { Selo } from '@/components/ui/badge';
import {
  Cartao,
  CartaoCabecalho,
  CartaoConteudo,
  CartaoDescricao,
  CartaoTitulo,
} from '@/components/ui/card';
import { CampoDeEntrada } from '@/components/ui/input';
import { Rotulo } from '@/components/ui/label';
import { Separador } from '@/components/ui/separator';
import { Esqueleto } from '@/components/ui/skeleton';
import { Abas, ConteudoDeAba, GatilhoDeAba, ListaDeAbas } from '@/components/ui/tabs';
import { buscarPlanoAtual, editarExercicio, ErroDaApi, type CorpoEdicaoExercicio } from '@/lib/api';
import { encerrarSessao } from '@/lib/armazenamento';
import { rotuloDoObjetivo } from '@/lib/util';
import type { ExercicioDoPlano, PlanoCompleto, PlanoTreino } from '@/lib/tipos';

/** Propriedades do cartão editável de um exercício. */
interface PropriedadesDoCartaoDeExercicio {
  /** Plano de treino vigente (usado para o id da edição). */
  treino: PlanoTreino;
  /** Índice do dia dentro do plano (0-based). */
  diaIndice: number;
  /** Índice do exercício dentro do dia (0-based). */
  exercicioIndice: number;
  /** Dados atuais do exercício. */
  exercicio: ExercicioDoPlano;
  /** Callback que atualiza o treino no estado da página. */
  aoAtualizarTreino: (novoTreino: PlanoTreino) => void;
}

/** Cartão de um exercício com campos editáveis e feedback de salvamento. */
function CartaoDeExercicio({
  treino,
  diaIndice,
  exercicioIndice,
  exercicio,
  aoAtualizarTreino,
}: PropriedadesDoCartaoDeExercicio) {
  // Campos editados localmente (strings para inputs numéricos).
  const [series, definirSeries] = useState(String(exercicio.series));
  const [repeticoes, definirRepeticoes] = useState(String(exercicio.repeticoes_min));
  // Toggle de carga: true = carga definida, false = peso corporal.
  const [usarCarga, definirUsarCarga] = useState(exercicio.carga_sugerida_kg !== null);
  // Valor da carga em kg (vazio = voltar para peso corporal).
  const [carga, definirCarga] = useState(
    exercicio.carga_sugerida_kg !== null ? String(exercicio.carga_sugerida_kg) : '',
  );
  // Salvamento em andamento (desabilita o botão).
  const [salvando, definirSalvando] = useState(false);
  // Feedback temporário "Salvo ✓".
  const [mensagemDeSucesso, definirMensagemDeSucesso] = useState(false);
  // Mensagem de erro amigável.
  const [mensagemDeErro, definirMensagemDeErro] = useState<string | null>(null);

  /** Valida os campos e salva a edição via editarExercicio(). */
  async function salvarAlteracoes() {
    definirMensagemDeErro(null);
    // Converte os textos digitados para números.
    const seriesNumericas = Number(series);
    const repeticoesNumericas = Number(repeticoes);
    // Validações locais antes de chamar a API (mensagens amigáveis).
    if (!Number.isFinite(seriesNumericas) || seriesNumericas < 1 || seriesNumericas > 10) {
      definirMensagemDeErro('As séries devem ficar entre 1 e 10.');
      return;
    }
    if (!Number.isFinite(repeticoesNumericas) || repeticoesNumericas < 1 || repeticoesNumericas > 50) {
      definirMensagemDeErro('As repetições devem ficar entre 1 e 50.');
      return;
    }
    // Carga: null em modo peso corporal; número válido quando informada.
    let cargaNumerica: number | null = null;
    if (usarCarga && carga !== '') {
      const valorDaCarga = Number(carga);
      // Validação local da carga antes de chamar a API.
      if (!Number.isFinite(valorDaCarga)) {
        definirMensagemDeErro('Informe uma carga válida em kg.');
        return;
      }
      cargaNumerica = valorDaCarga;
    }
    definirSalvando(true);
    try {
      // Corpo da edição: índices + campos alterados.
      const corpo: CorpoEdicaoExercicio = {
        dia_indice: diaIndice,
        exercicio_indice: exercicioIndice,
        series: seriesNumericas,
        repeticoes: repeticoesNumericas,
        // null quando em modo peso corporal (remove a carga no servidor).
        carga_kg: cargaNumerica,
      };
      // Salva na cópia do usuário e recebe o plano atualizado.
      const novoTreino = await editarExercicio(treino.id, corpo);
      aoAtualizarTreino(novoTreino);
      // Exibe "Salvo ✓" por 2 segundos.
      definirMensagemDeSucesso(true);
      window.setTimeout(() => definirMensagemDeSucesso(false), 2000);
    } catch (erroCapturado: unknown) {
      definirMensagemDeErro(
        erroCapturado instanceof Error ? erroCapturado.message : 'Não foi possível salvar. Tente novamente.',
      );
    } finally {
      definirSalvando(false);
    }
  }

  return (
    // Cartão do exercício com cabeçalho, campos e rodapé informativo.
    <Cartao className="gap-4">
      {/* Nome do exercício + selo do grupo muscular. */}
      <CartaoCabecalho>
        <div className="flex items-center justify-between gap-2">
          <CartaoTitulo className="text-base">{exercicio.nome}</CartaoTitulo>
          <Selo variante="secundario">{exercicio.grupo}</Selo>
        </div>
      </CartaoCabecalho>

      <CartaoConteudo className="space-y-4">
        {/* Grade dos campos editáveis: séries, repetições e carga. */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Campo de séries (1 a 10). */}
          <div className="space-y-1.5">
            <Rotulo htmlFor={`series-${diaIndice}-${exercicioIndice}`}>Séries</Rotulo>
            <CampoDeEntrada
              id={`series-${diaIndice}-${exercicioIndice}`}
              type="number"
              min={1}
              max={10}
              value={series}
              onChange={(evento) => definirSeries(evento.target.value)}
            />
          </div>
          {/* Campo de repetições (1 a 50). */}
          <div className="space-y-1.5">
            <Rotulo htmlFor={`repeticoes-${diaIndice}-${exercicioIndice}`}>Repetições</Rotulo>
            <CampoDeEntrada
              id={`repeticoes-${diaIndice}-${exercicioIndice}`}
              type="number"
              min={1}
              max={50}
              value={repeticoes}
              onChange={(evento) => definirRepeticoes(evento.target.value)}
            />
          </div>
          {/* Campo de carga com toggle de peso corporal. */}
          <div className="space-y-1.5">
            <Rotulo htmlFor={`carga-${diaIndice}-${exercicioIndice}`}>Carga (kg)</Rotulo>
            {usarCarga ? (
              // Modo carga definida: input numérico com passo de 0,5 kg.
              <CampoDeEntrada
                id={`carga-${diaIndice}-${exercicioIndice}`}
                type="number"
                step={0.5}
                min={0}
                max={400}
                placeholder="0"
                value={carga}
                onChange={(evento) => definirCarga(evento.target.value)}
              />
            ) : (
              // Modo peso corporal: selo + atalho para definir carga.
              <div className="flex h-10 items-center gap-2">
                <Selo variante="contorno">Peso corporal</Selo>
                <Botao variante="link" tamanho="pequeno" onClick={() => definirUsarCarga(true)}>
                  <Pencil /> Definir carga
                </Botao>
              </div>
            )}
            {/* Atalho para voltar ao peso corporal quando houver carga. */}
            {usarCarga ? (
              <Botao
                variante="link"
                tamanho="pequeno"
                className="h-auto p-0 text-xs"
                onClick={() => definirUsarCarga(false)}
              >
                Voltar para peso corporal
              </Botao>
            ) : null}
          </div>
        </div>

        {/* Linha de ação: salvar + feedback de sucesso ou erro. */}
        <div className="flex flex-wrap items-center gap-3">
          <Botao tamanho="pequeno" onClick={() => void salvarAlteracoes()} disabled={salvando}>
            <Save /> {salvando ? 'Salvando...' : 'Salvar alterações'}
          </Botao>
          {/* Feedback temporário de sucesso ("Salvo ✓"). */}
          {mensagemDeSucesso ? (
            <span className="text-sm font-medium text-primary">Salvo ✓</span>
          ) : null}
          {/* Feedback de erro em vermelho. */}
          {mensagemDeErro ? (
            <span className="text-sm font-medium text-destructive">{mensagemDeErro}</span>
          ) : null}
        </div>

        {/* Rodapé do exercício: descanso e dica de execução. */}
        <Separador />
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <Timer className="size-4 shrink-0 text-primary" /> Descanso: {exercicio.descanso_segundos}s
          </p>
          <p className="flex items-start gap-1.5">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" /> {exercicio.dicas}
          </p>
        </div>
      </CartaoConteudo>
    </Cartao>
  );
}

/** Página do treino — abas por dia com exercícios editáveis. */
export default function PaginaDoTreino() {
  const roteador = useRouter();
  // Estado de carregamento, erro e plano completo.
  const [carregando, definirCarregando] = useState(true);
  const [erro, definirErro] = useState<string | null>(null);
  const [plano, definirPlano] = useState<PlanoCompleto | null>(null);

  /** Carrega o plano atual (404 → onboarding; 401 → login). */
  const carregarDados = useCallback(async () => {
    definirCarregando(true);
    definirErro(null);
    try {
      const planoAtual = await buscarPlanoAtual();
      definirPlano(planoAtual);
    } catch (erroCapturado: unknown) {
      // Erro da API com status conhecido.
      if (erroCapturado instanceof ErroDaApi) {
        // 404: plano ainda não gerado → completa o onboarding.
        if (erroCapturado.status === 404) {
          roteador.replace('/onboarding');
          return;
        }
        // 401: sessão inválida → limpa e volta ao login.
        if (erroCapturado.status === 401) {
          encerrarSessao();
          roteador.replace('/login');
          return;
        }
        definirErro(erroCapturado.message);
        return;
      }
      definirErro('Erro inesperado ao carregar o treino. Tente novamente.');
    } finally {
      definirCarregando(false);
    }
  }, [roteador]);

  // Dispara o carregamento ao montar a página.
  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  /** Atualiza o treino no estado local com a resposta da edição. */
  function atualizarTreino(novoTreino: PlanoTreino) {
    definirPlano((planoAtual) => (planoAtual ? { ...planoAtual, treino: novoTreino } : planoAtual));
  }

  // Esqueleto de carregamento enquanto o plano chega.
  if (carregando) {
    return (
      <div className="space-y-6">
        <Esqueleto className="h-8 w-64" />
        <Esqueleto className="h-4 w-48" />
        <Esqueleto className="h-10 w-full max-w-md" />
        <Esqueleto className="h-56 w-full" />
        <Esqueleto className="h-56 w-full" />
      </div>
    );
  }

  // Cartão de erro com botão para tentar novamente.
  if (erro) {
    return (
      <Cartao className="max-w-md">
        <CartaoCabecalho>
          <CartaoTitulo>Não foi possível carregar o treino</CartaoTitulo>
          <CartaoDescricao className="text-destructive">{erro}</CartaoDescricao>
        </CartaoCabecalho>
        <CartaoConteudo>
          <Botao onClick={() => void carregarDados()}>Tentar novamente</Botao>
        </CartaoConteudo>
      </Cartao>
    );
  }

  // Guarda de tipo: sem plano não há o que renderizar.
  if (!plano) {
    return null;
  }

  // Plano de treino vigente.
  const { treino } = plano;

  return (
    <div className="space-y-6">
      {/* Cabeçalho: nome do plano, objetivo, versão e duração estimada. */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-bold text-foreground lg:text-3xl">{treino.nome}</h1>
          <Selo variante="secundario">{rotuloDoObjetivo(treino.objetivo)}</Selo>
          <Selo variante="contorno">Versão {treino.versao}</Selo>
        </div>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="size-4 shrink-0 text-primary" /> Duração estimada: {treino.duracao_estimada_min} min
        </p>
      </section>

      {/* Abas: um gatilho "Dia N" por dia de treino. */}
      <Abas valorPadrao="0">
        <ListaDeAbas className="h-auto flex-wrap">
          {treino.dias_da_semana.map((dia, indice) => (
            <GatilhoDeAba key={indice} valor={String(indice)}>
              Dia {indice + 1}
            </GatilhoDeAba>
          ))}
        </ListaDeAbas>
        {/* Conteúdo de cada aba: título do dia + exercícios editáveis. */}
        {treino.dias_da_semana.map((dia, indice) => (
          <ConteudoDeAba key={indice} valor={String(indice)}>
            <div className="space-y-4">
              {/* Título do dia selecionado. */}
              <h2 className="font-display text-lg font-bold text-foreground">{dia.titulo}</h2>
              {/* Cartão editável de cada exercício do dia. */}
              {dia.exercicios.map((exercicio, exercicioIndice) => (
                <CartaoDeExercicio
                  key={exercicioIndice}
                  treino={treino}
                  diaIndice={indice}
                  exercicioIndice={exercicioIndice}
                  exercicio={exercicio}
                  aoAtualizarTreino={atualizarTreino}
                />
              ))}
            </div>
          </ConteudoDeAba>
        ))}
      </Abas>

      {/* Dicas gerais do objetivo — orientações para potencializar o treino. */}
      <Cartao>
        <CartaoCabecalho>
          <CartaoTitulo>Dicas para o seu treino</CartaoTitulo>
          <CartaoDescricao>Orientações montadas junto com o seu plano</CartaoDescricao>
        </CartaoCabecalho>
        <CartaoConteudo>
          <ul className="space-y-2">
            {(treino.dicas ?? []).map((dica, indice) => (
              <li key={indice} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{dica}</span>
              </li>
            ))}
          </ul>
        </CartaoConteudo>
      </Cartao>
    </div>
  );
}
