/**
 * page.tsx — Treino do painel
 * ---------------------------------------------------------------------------
 * Exibe o plano de treino organizado em abas (um dia por aba). Cada
 * exercício é um cartão editável (séries, repetições e carga) que salva via
 * editarExercicio(), com feedback "Salvo ✓" temporário ou erro em vermelho.
 * TEAM_004: cada exercício pode ser marcado como concluído na sessão de hoje;
 * ao concluir TODOS os exercícios do dia, o check-in recebe treino_feito
 * automaticamente — ou pelo botão "Concluir treino de hoje" da aba.
 * ---------------------------------------------------------------------------
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, Check, CheckCircle2, Clock, Lightbulb, Pencil, Save, Timer, Youtube } from 'lucide-react';
import { Botao } from '@/components/ui/button';
import { Selo } from '@/components/ui/badge';
import { CartaoTempoDoPlano } from '@/components/painel/cartao-tempo-do-plano';
import {
  Cartao,
  CartaoCabecalho,
  CartaoConteudo,
  CartaoDescricao,
  CartaoTitulo,
} from '@/components/ui/card';
import { CampoDeEntrada } from '@/components/ui/input';
import { Rotulo } from '@/components/ui/label';
import { BarraDeProgresso } from '@/components/ui/progress';
import { MenuDeSelecao } from '@/components/ui/select';
import { Separador } from '@/components/ui/separator';
import { Esqueleto } from '@/components/ui/skeleton';
import { Abas, ConteudoDeAba, GatilhoDeAba, ListaDeAbas } from '@/components/ui/tabs';
import {
  buscarCheckins,
  buscarPlanoAtual,
  editarExercicio,
  listarAlternativasDeExercicio,
  recalcularPlanos,
  salvarCheckin,
  trocarExercicio,
  ErroDaApi,
  type CorpoEdicaoExercicio,
} from '@/lib/api';
import { encerrarSessao } from '@/lib/armazenamento';
import { hojeLocal } from '@/lib/checkin-util';
import { combinarClasses, rotuloDoObjetivo } from '@/lib/util';
import type { AlternativaDeExercicio, ExercicioDoPlano, PlanoCompleto, PlanoTreino } from '@/lib/tipos';

/* ===========================================================================
 * TEAM_004 — progresso da sessão de hoje (checklist de exercícios).
 * Estado efêmero por plano+dia civil+aba: zera sozinho a cada dia (a data
 * está na chave) e não vai ao banco — o registro durável é o check-in.
 * ======================================================================== */

/** Monta a chave do localStorage para a checklist de um dia do plano. */
function chaveDoProgresso(planoId: number, diaIndice: number): string {
  return `protocolfit_treino_concluido:${planoId}:${hojeLocal()}:${diaIndice}`;
}

/** Lê os índices dos exercícios concluídos hoje num dia do plano. */
function lerConcluidos(planoId: number, diaIndice: number): number[] {
  try {
    const bruto = localStorage.getItem(chaveDoProgresso(planoId, diaIndice));
    const lista: unknown = JSON.parse(bruto ?? '[]');
    // Descarta entradas corrompidas — só inteiros (índices) são válidos.
    return Array.isArray(lista) ? lista.filter((item): item is number => Number.isInteger(item)) : [];
  } catch {
    return [];
  }
}

/** Grava os índices dos exercícios concluídos hoje num dia do plano. */
function gravarConcluidos(planoId: number, diaIndice: number, concluidos: number[]) {
  try {
    localStorage.setItem(chaveDoProgresso(planoId, diaIndice), JSON.stringify(concluidos));
  } catch {
    // Armazenamento bloqueado/cheio: a checklist segue só na memória da sessão.
  }
}

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
  /** TEAM_004: exercício marcado como concluído na sessão de hoje. */
  concluido: boolean;
  /** TEAM_004: alterna a marcação de concluído do exercício. */
  aoAlternarConcluido: () => void;
}

/** Cartão de um exercício com campos editáveis e feedback de salvamento. */
function CartaoDeExercicio({
  treino,
  diaIndice,
  exercicioIndice,
  exercicio,
  aoAtualizarTreino,
  concluido,
  aoAlternarConcluido,
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
  // TEAM_003: alternativas do mesmo grupo muscular + estado da troca.
  const [alternativas, definirAlternativas] = useState<AlternativaDeExercicio[]>([]);
  const [trocando, definirTrocando] = useState(false);

  // TEAM_003: busca as alternativas do mesmo grupo ao montar o cartão —
  // o seletor só aparece quando existe pelo menos uma opção.
  useEffect(() => {
    // Evita atualizar estado após o desmonte do cartão.
    let ativo = true;
    listarAlternativasDeExercicio(treino.id, diaIndice, exercicioIndice)
      .then((lista) => {
        if (ativo) {
          definirAlternativas(lista);
        }
      })
      .catch(() => {
        // Catálogo indisponível: o seletor simplesmente não é exibido.
      });
    return () => {
      ativo = false;
    };
  }, [treino.id, diaIndice, exercicioIndice]);

  /** TEAM_003: troca o exercício pela alternativa escolhida (mesmo grupo). */
  async function trocarExercicioAtual(nomeDaAlternativa: string) {
    // Opção placeholder ("Trocar por...") — nada a fazer.
    if (!nomeDaAlternativa) {
      return;
    }
    definirTrocando(true);
    definirMensagemDeErro(null);
    try {
      // Corpo da troca: índices do slot + nome da alternativa escolhida.
      const novoTreino = await trocarExercicio(treino.id, {
        dia_indice: diaIndice,
        exercicio_indice: exercicioIndice,
        exercicio_nome: nomeDaAlternativa,
      });
      // O cartão remonta (o key inclui o nome) com os dados do novo exercício.
      aoAtualizarTreino(novoTreino);
    } catch (erroCapturado: unknown) {
      definirMensagemDeErro(
        erroCapturado instanceof Error ? erroCapturado.message : 'Não foi possível trocar o exercício.',
      );
    } finally {
      definirTrocando(false);
    }
  }

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
    // TEAM_004: fica esverdeado enquanto o exercício estiver concluído.
    <Cartao className={combinarClasses('gap-4 transition-colors', concluido && 'border-primary/40 bg-primary/5')}>
      {/* TEAM_004: toggle "concluído" + nome (riscado quando feito) + selo do grupo. */}
      <CartaoCabecalho>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            {/* Botão circular de concluído — alimenta a checklist do dia. */}
            <button
              type="button"
              onClick={aoAlternarConcluido}
              aria-pressed={concluido}
              aria-label={`${concluido ? 'Desmarcar' : 'Marcar'} ${exercicio.nome} como concluído`}
              title={concluido ? 'Desmarcar concluído' : 'Marcar como concluído'}
              className={combinarClasses(
                'flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors',
                concluido
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-transparent hover:border-primary/60 hover:text-primary/40',
              )}
            >
              <Check className="size-4" />
            </button>
            <CartaoTitulo
              className={combinarClasses('truncate text-base', concluido && 'text-muted-foreground line-through')}
            >
              {exercicio.nome}
            </CartaoTitulo>
          </div>
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

        {/* TEAM_003: troca do exercício por outro do MESMO grupo muscular —
            some quando o catálogo não tem alternativa para o grupo. */}
        {alternativas.length > 0 ? (
          <div className="max-w-xs space-y-1.5">
            <Rotulo htmlFor={`trocar-${diaIndice}-${exercicioIndice}`}>
              <ArrowLeftRight className="size-3.5 text-primary" /> Trocar exercício ({exercicio.grupo})
            </Rotulo>
            <MenuDeSelecao
              id={`trocar-${diaIndice}-${exercicioIndice}`}
              value=""
              disabled={trocando}
              aria-label={`Trocar ${exercicio.nome}`}
              onChange={(evento) => void trocarExercicioAtual(evento.target.value)}
            >
              {/* Opção placeholder: mantém o valor vazio no seletor. */}
              <option value="">{trocando ? 'Trocando...' : 'Trocar por...'}</option>
              {/* Uma opção para cada alternativa do mesmo grupo. */}
              {alternativas.map((alternativa) => (
                <option key={alternativa.nome} value={alternativa.nome}>
                  {alternativa.nome}
                </option>
              ))}
            </MenuDeSelecao>
          </div>
        ) : null}

        {/* Rodapé do exercício: descanso e dica de execução. */}
        <Separador />
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <Timer className="size-4 shrink-0 text-primary" /> Descanso: {exercicio.descanso_segundos}s
          </p>
          <p className="flex items-start gap-1.5">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" /> {exercicio.dicas}
          </p>
          {/* TEAM_001: link de exemplo — busca a execução do exercício no
              YouTube (abre em nova aba, sem sair do app). */}
          <a
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${exercicio.nome} execução correta`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-medium text-primary hover:underline"
          >
            <Youtube className="size-4 shrink-0" /> Exemplo: ver a execução no YouTube
          </a>
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
  // TEAM_004: exercícios concluídos por aba de dia (índice → índices).
  const [concluidosPorDia, definirConcluidosPorDia] = useState<Record<number, number[]>>({});
  // TEAM_004: estado do check-in de hoje e do salvamento dele.
  const [treinoFeitoHoje, definirTreinoFeitoHoje] = useState(false);
  const [salvandoCheckin, definirSalvandoCheckin] = useState(false);
  const [erroCheckin, definirErroCheckin] = useState<string | null>(null);

  /** Carrega o plano atual (404 → onboarding; 401 → login). */
  const carregarDados = useCallback(async () => {
    definirCarregando(true);
    definirErro(null);
    try {
      const [planoAtual, resumo] = await Promise.all([
        buscarPlanoAtual(),
        // TEAM_004: o check-in complementa a página — falha dele não derruba
        // o carregamento do plano (o botão simplesmente tenta de novo).
        buscarCheckins().catch(() => null),
      ]);
      definirPlano(planoAtual);
      definirTreinoFeitoHoje(resumo?.hoje?.treino_feito ?? false);
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

  // TEAM_004: restaura a checklist da sessão de hoje quando o PLANO chega
  // ou troca de id (novo plano = progresso novo). A edição de exercício não
  // altera o id, então a checklist por índice do slot é preservada.
  const treinoId = plano?.treino.id ?? null;
  const diasDaSemana = plano?.treino.dias_da_semana;
  useEffect(() => {
    if (treinoId === null || !diasDaSemana) {
      return;
    }
    const inicial: Record<number, number[]> = {};
    diasDaSemana.forEach((_, indice) => {
      inicial[indice] = lerConcluidos(treinoId, indice);
    });
    definirConcluidosPorDia(inicial);
  }, [treinoId, diasDaSemana]);

  /** TEAM_004: marca o treino de hoje como feito no check-in diário. */
  async function concluirTreinoDoDia() {
    definirSalvandoCheckin(true);
    definirErroCheckin(null);
    try {
      // Envia só treino_feito: o merge do check-in preserva água, dieta,
      // peso e observação já registrados no dia (regra dos dois modos).
      const resumo = await salvarCheckin({ treino_feito: true });
      definirTreinoFeitoHoje(resumo.hoje?.treino_feito ?? true);
    } catch (erroCapturado: unknown) {
      definirErroCheckin(
        erroCapturado instanceof Error ? erroCapturado.message : 'Não foi possível registrar o check-in.',
      );
    } finally {
      definirSalvandoCheckin(false);
    }
  }

  /** TEAM_004: alterna "concluído"; TODOS concluídos → check-in automático. */
  function alternarConcluido(diaIndice: number, exercicioIndice: number) {
    if (!plano) {
      return;
    }
    const atuais = new Set(concluidosPorDia[diaIndice] ?? []);
    if (atuais.has(exercicioIndice)) {
      atuais.delete(exercicioIndice);
    } else {
      atuais.add(exercicioIndice);
    }
    const lista = [...atuais].sort((a, b) => a - b);
    definirConcluidosPorDia({ ...concluidosPorDia, [diaIndice]: lista });
    gravarConcluidos(plano.treino.id, diaIndice, lista);
    // Concluiu o dia inteiro → o treino conta como feito no check-in.
    if (
      lista.length === plano.treino.dias_da_semana[diaIndice].exercicios.length &&
      !treinoFeitoHoje &&
      !salvandoCheckin
    ) {
      void concluirTreinoDoDia();
    }
  }

  /** Atualiza o treino no estado local com a resposta da edição. */
  function atualizarTreino(novoTreino: PlanoTreino) {
    definirPlano((planoAtual) => (planoAtual ? { ...planoAtual, treino: novoTreino } : planoAtual));
  }

  /**
   * Atualiza o plano inteiro (treino + dieta) pela evolução física.
   * Usado pelo botão "Atualizar plano" do cartão de tempo — ao recalcular,
   * o criado_em/versão mudam e o contador de dias recomeça.
   */
  async function atualizarPlano() {
    const resposta = await recalcularPlanos();
    definirPlano({ perfil: resposta.perfil, treino: resposta.treino, dieta: resposta.dieta });
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

      {/* Há quanto tempo com o treino + quando renovar + botão atualizar. */}
      <CartaoTempoDoPlano
        tipo="treino"
        criadoEm={treino.criado_em}
        versao={treino.versao}
        aoAtualizar={async () => {
          await atualizarPlano();
        }}
      />

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
        {treino.dias_da_semana.map((dia, indice) => {
          // TEAM_004: quantos exercícios do dia já foram concluídos hoje.
          const concluidosNoDia = (concluidosPorDia[indice] ?? []).length;
          return (
            <ConteudoDeAba key={indice} valor={String(indice)}>
              <div className="space-y-4">
                {/* Título do dia selecionado. */}
                <h2 className="font-display text-lg font-bold text-foreground">{dia.titulo}</h2>

                {/* TEAM_004: progresso da sessão de hoje + atalho que marca o
                    treino como feito no check-in diário. */}
                <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      Sessão de hoje: {concluidosNoDia}/{dia.exercicios.length} exercícios
                    </p>
                    {treinoFeitoHoje ? (
                      // Check-in já registra o treino do dia como feito.
                      <span className="flex items-center gap-1 text-sm font-medium text-primary">
                        <CheckCircle2 className="size-4" /> Treino registrado no check-in
                      </span>
                    ) : (
                      <Botao
                        variante="contorno"
                        tamanho="pequeno"
                        disabled={salvandoCheckin}
                        onClick={() => void concluirTreinoDoDia()}
                      >
                        <Check /> {salvandoCheckin ? 'Registrando...' : 'Concluir treino de hoje'}
                      </Botao>
                    )}
                  </div>
                  {/* Barra de progresso da checklist do dia (0–100%). */}
                  <BarraDeProgresso
                    valor={dia.exercicios.length > 0 ? (concluidosNoDia / dia.exercicios.length) * 100 : 0}
                  />
                  {/* Erro do check-in automático/manual aparece aqui. */}
                  {erroCheckin ? (
                    <p className="text-sm font-medium text-destructive">{erroCheckin}</p>
                  ) : null}
                </div>

                {/* Cartão editável de cada exercício do dia. */}
                {dia.exercicios.map((exercicio, exercicioIndice) => (
                  // TEAM_003: o key inclui o nome — ao trocar de exercício o
                  // cartão REMONTA, reiniciando os campos com os valores novos
                  // (a carga recalculada da alternativa aparece correta).
                  <CartaoDeExercicio
                    key={`${indice}-${exercicioIndice}-${exercicio.nome}`}
                    treino={treino}
                    diaIndice={indice}
                    exercicioIndice={exercicioIndice}
                    exercicio={exercicio}
                    aoAtualizarTreino={atualizarTreino}
                    concluido={(concluidosPorDia[indice] ?? []).includes(exercicioIndice)}
                    aoAlternarConcluido={() => alternarConcluido(indice, exercicioIndice)}
                  />
                ))}
              </div>
            </ConteudoDeAba>
          );
        })}
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
