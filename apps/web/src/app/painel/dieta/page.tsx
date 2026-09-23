/**
 * page.tsx — Dieta do painel
 * ---------------------------------------------------------------------------
 * Exibe o plano de dieta: resumo do topo (meta kcal, água, fibras e barras
 * de progresso por macro), refeições com itens detalhados e substituição de
 * alimentos via substituirAlimento(), além das dicas do objetivo no rodapé.
 * ---------------------------------------------------------------------------
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Droplets, Flame, Lightbulb, Wheat } from 'lucide-react';
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
import { BarraDeProgresso } from '@/components/ui/progress';
import { MenuDeSelecao } from '@/components/ui/select';
import { Esqueleto } from '@/components/ui/skeleton';
import { buscarPlanoAtual, recalcularPlanos, substituirAlimento, ErroDaApi, type CorpoSubstituicao } from '@/lib/api';
import { encerrarSessao } from '@/lib/armazenamento';
import type { ItemDaDieta, PlanoCompleto, PlanoDieta } from '@/lib/tipos';

/** Linha de macro com barra de progresso no resumo do topo. */
interface LinhaDeMacro {
  /** Rótulo do macronutriente. */
  rotulo: string;
  /** Total do plano (g). */
  consumido: number;
  /** Meta diária (g). */
  meta: number;
  /** Percentual da meta coberto pelo plano. */
  percentual: number;
}

/** Propriedades da linha de um item da refeição. */
interface PropriedadesDaLinhaDoItem {
  /** Item da dieta exibido. */
  item: ItemDaDieta;
  /** Plano de dieta vigente (usado para o id da substituição). */
  dieta: PlanoDieta;
  /** Índice da refeição dentro do plano (0-based). */
  refeicaoIndice: number;
  /** Índice do item dentro da refeição (0-based). */
  itemIndice: number;
  /** Callback que atualiza a dieta no estado da página. */
  aoAtualizarDieta: (novaDieta: PlanoDieta) => void;
}

/** Linha de um alimento: detalhes, macros e seletor de substituição. */
function LinhaDoItem({
  item,
  dieta,
  refeicaoIndice,
  itemIndice,
  aoAtualizarDieta,
}: PropriedadesDaLinhaDoItem) {
  // Substituição em andamento (desabilita o seletor).
  const [trocando, definirTrocando] = useState(false);
  // Mensagem de erro amigável da substituição.
  const [erro, definirErro] = useState<string | null>(null);

  /** Substitui o alimento pela alternativa escolhida no seletor. */
  async function trocarAlimento(nomeDaAlternativa: string) {
    // Opção placeholder ("Trocar por...") — nada a fazer.
    if (!nomeDaAlternativa) {
      return;
    }
    definirTrocando(true);
    definirErro(null);
    try {
      // Corpo da substituição: índices + nome da alternativa.
      const corpo: CorpoSubstituicao = {
        refeicao_indice: refeicaoIndice,
        item_indice: itemIndice,
        alternativa_nome: nomeDaAlternativa,
      };
      // Troca na cópia do usuário e recebe a dieta recalculada.
      const novaDieta = await substituirAlimento(dieta.id, corpo);
      aoAtualizarDieta(novaDieta);
    } catch (erroCapturado: unknown) {
      definirErro(
        erroCapturado instanceof Error ? erroCapturado.message : 'Não foi possível trocar o alimento.',
      );
    } finally {
      definirTrocando(false);
    }
  }

  return (
    // Bloco do item com borda suave.
    <div className="space-y-2 rounded-lg border p-4">
      {/* Nome do alimento (+ selo quando substituído) e quantidade. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{item.nome}</p>
          {/* Selo exibido quando o alimento foi trocado pelo usuário. */}
          {item.alternativa_usada ? <Selo variante="secundario">substituído</Selo> : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {item.quantidade}
          {item.unidade}
        </p>
      </div>
      {/* Resumo nutricional do item (kcal + macros abreviados). */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span>{item.calorias} kcal</span>
        <span>P {item.proteinas}g</span>
        <span>C {item.carboidratos}g</span>
        <span>G {item.gorduras}g</span>
      </div>
      {/* Seletor de substituição com as alternativas disponíveis. */}
      <div className="max-w-xs">
        <MenuDeSelecao
          value=""
          disabled={trocando}
          aria-label={`Trocar ${item.nome}`}
          onChange={(evento) => void trocarAlimento(evento.target.value)}
        >
          {/* Opção placeholder: mantém o valor vazio no seletor. */}
          <option value="">Trocar por...</option>
          {/* Uma opção para cada alternativa do item. */}
          {item.alternativas.map((alternativa) => (
            <option key={alternativa.nome} value={alternativa.nome}>
              {alternativa.nome}
            </option>
          ))}
        </MenuDeSelecao>
      </div>
      {/* Feedback de erro da substituição. */}
      {erro ? <p className="text-xs font-medium text-destructive">{erro}</p> : null}
    </div>
  );
}

/** Página da dieta — resumo, refeições editáveis e dicas. */
export default function PaginaDaDieta() {
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
      definirErro('Erro inesperado ao carregar a dieta. Tente novamente.');
    } finally {
      definirCarregando(false);
    }
  }, [roteador]);

  // Dispara o carregamento ao montar a página.
  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  /** Atualiza a dieta no estado local com a resposta da substituição. */
  function atualizarDieta(novaDieta: PlanoDieta) {
    definirPlano((planoAtual) => (planoAtual ? { ...planoAtual, dieta: novaDieta } : planoAtual));
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
        <Esqueleto className="h-40 w-full" />
        <Esqueleto className="h-64 w-full" />
        <Esqueleto className="h-64 w-full" />
      </div>
    );
  }

  // Cartão de erro com botão para tentar novamente.
  if (erro) {
    return (
      <Cartao className="max-w-md">
        <CartaoCabecalho>
          <CartaoTitulo>Não foi possível carregar a dieta</CartaoTitulo>
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

  // Plano de dieta vigente.
  const { dieta } = plano;

  // Linhas de macro do resumo do topo (consumo do plano vs meta).
  const linhasDosMacros: LinhaDeMacro[] = [
    { rotulo: 'Proteínas', consumido: dieta.totais.proteinas, meta: dieta.meta.proteinas_g },
    { rotulo: 'Carboidratos', consumido: dieta.totais.carboidratos, meta: dieta.meta.carboidratos_g },
    { rotulo: 'Gorduras', consumido: dieta.totais.gorduras, meta: dieta.meta.gorduras_g },
  ].map((linha) => ({
    ...linha,
    percentual: linha.meta > 0 ? Math.round((linha.consumido / linha.meta) * 100) : 0,
  }));

  return (
    <div className="space-y-6">
      {/* Cartão resumo do topo: metas rápidas + progresso por macro. */}
      <Cartao>
        <CartaoCabecalho>
          <CartaoTitulo>{dieta.nome}</CartaoTitulo>
          <CartaoDescricao>Plano de dieta — versão {dieta.versao}</CartaoDescricao>
        </CartaoCabecalho>
        <CartaoConteudo className="space-y-5">
          {/* Metas rápidas: calorias, água e fibras. */}
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Meta calórica diária. */}
            <div className="rounded-lg bg-secondary/60 p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Flame className="size-3.5 shrink-0 text-primary" /> Meta diária
              </p>
              <p className="font-display text-xl font-bold text-foreground">
                {dieta.meta.meta_kcal} <span className="text-sm font-semibold text-muted-foreground">kcal</span>
              </p>
            </div>
            {/* Meta de água. */}
            <div className="rounded-lg bg-secondary/60 p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Droplets className="size-3.5 shrink-0 text-sky-600" /> Água
              </p>
              <p className="font-display text-xl font-bold text-foreground">
                {dieta.meta.agua_ml} <span className="text-sm font-semibold text-muted-foreground">ml/dia</span>
              </p>
            </div>
            {/* Meta de fibras. */}
            <div className="rounded-lg bg-secondary/60 p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Wheat className="size-3.5 shrink-0 text-amber-600" /> Fibras
              </p>
              <p className="font-display text-xl font-bold text-foreground">
                {dieta.meta.fibras_g} <span className="text-sm font-semibold text-muted-foreground">g/dia</span>
              </p>
            </div>
          </div>
          {/* Barras de progresso de cada macro vs meta. */}
          <div className="space-y-3">
            {linhasDosMacros.map((linha) => (
              <div key={linha.rotulo} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{linha.rotulo}</span>
                  <span className="text-muted-foreground">
                    {linha.percentual}% · {linha.consumido} g / {linha.meta} g
                  </span>
                </div>
                <BarraDeProgresso valor={linha.percentual} />
              </div>
            ))}
          </div>
        </CartaoConteudo>
      </Cartao>

      {/* Há quanto tempo com a dieta + quando renovar + botão atualizar. */}
      <CartaoTempoDoPlano
        tipo="dieta"
        criadoEm={dieta.criado_em}
        versao={dieta.versao}
        aoAtualizar={async () => {
          await atualizarPlano();
        }}
      />

      {/* Seção das refeições do dia. */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold text-foreground">Refeições do dia</h2>
        {/* Um cartão por refeição do plano. */}
        {dieta.refeicoes.map((refeicao, refeicaoIndice) => (
          <Cartao key={refeicaoIndice} className="gap-4">
            {/* Cabeçalho da refeição: tipo, horário e calorias. */}
            <CartaoCabecalho className="flex flex-row items-center justify-between gap-2">
              <div>
                <CartaoTitulo className="text-base">{refeicao.tipo}</CartaoTitulo>
                <CartaoDescricao className="flex items-center gap-1.5">
                  <Clock className="size-3.5 shrink-0" /> {refeicao.horario_sugerido}
                </CartaoDescricao>
              </div>
              <Selo variante="contorno">
                {refeicao.totais.calorias} / {refeicao.calorias_alvo} kcal
              </Selo>
            </CartaoCabecalho>
            {/* Itens da refeição com seletor de substituição. */}
            <CartaoConteudo className="space-y-3">
              {refeicao.itens.map((item, itemIndice) => (
                <LinhaDoItem
                  key={itemIndice}
                  item={item}
                  dieta={dieta}
                  refeicaoIndice={refeicaoIndice}
                  itemIndice={itemIndice}
                  aoAtualizarDieta={atualizarDieta}
                />
              ))}
            </CartaoConteudo>
          </Cartao>
        ))}
      </section>

      {/* Dicas do objetivo no rodapé da página. */}
      <Cartao>
        <CartaoCabecalho>
          <CartaoTitulo>Dicas para o seu objetivo</CartaoTitulo>
          <CartaoDescricao>Orientações calculadas junto com o seu plano</CartaoDescricao>
        </CartaoCabecalho>
        <CartaoConteudo>
          <ul className="space-y-2">
            {dieta.dicas.map((dica, indice) => (
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
