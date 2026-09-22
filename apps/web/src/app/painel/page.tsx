/**
 * page.tsx — Dashboard do painel
 * ---------------------------------------------------------------------------
 * Página inicial da área logada: saudação personalizada, 4 cartões de
 * resumo (peso, IMC, meta calórica e água), gráficos de evolução de peso e
 * de macronutrientes, e dois resumos rápidos (próximo treino e dieta).
 * Carrega buscarPlanoAtual() e listarEvolucao() em paralelo.
 * ---------------------------------------------------------------------------
 */
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Clock, Droplets, Dumbbell, Flame, Gauge, TrendingDown, TrendingUp, Weight } from 'lucide-react';
import { CartaoResumo } from '@/components/painel/cartao-resumo';
import { GraficoEvolucaoPeso } from '@/components/painel/grafico-evolucao-peso';
import { GraficoMacros } from '@/components/painel/grafico-macros';
import { Botao } from '@/components/ui/button';
import {
  Cartao,
  CartaoCabecalho,
  CartaoConteudo,
  CartaoDescricao,
  CartaoRodape,
  CartaoTitulo,
} from '@/components/ui/card';
import { BarraDeProgresso } from '@/components/ui/progress';
import { Esqueleto } from '@/components/ui/skeleton';
import { buscarPlanoAtual, listarEvolucao, ErroDaApi } from '@/lib/api';
import { encerrarSessao, obterUsuario } from '@/lib/armazenamento';
import { formatarDecimal } from '@/lib/util';
import type { PlanoCompleto, RegistroEvolucao } from '@/lib/tipos';

/** Frases motivacionais exibidas conforme o objetivo do plano. */
const FRASES_POR_OBJETIVO: Record<string, string> = {
  emagrecimento: 'Você está em déficit de 20% — consistência vence intensidade.',
  hipertrofia: 'Você está em superávit calórico — cada série constrói músculo.',
  corrida: 'Energia e carboidrato no ponto certo — sua performance agradece.',
};

/** Linha de macro exibida com barra de progresso no resumo da dieta. */
interface LinhaDeMacro {
  /** Rótulo do macronutriente. */
  rotulo: string;
  /** Total consumido no plano (g). */
  consumido: number;
  /** Meta diária do plano (g). */
  meta: number;
  /** Percentual da meta já coberto pelo plano. */
  percentual: number;
}

/** Dashboard — visão geral do plano vigente do usuário. */
export default function PaginaDoPainel() {
  const roteador = useRouter();
  // Estado de carregamento inicial dos dados.
  const [carregando, definirCarregando] = useState(true);
  // Mensagem de erro amigável (null quando não há erro).
  const [erro, definirErro] = useState<string | null>(null);
  // Plano completo vigente (perfil + treino + dieta).
  const [plano, definirPlano] = useState<PlanoCompleto | null>(null);
  // Histórico de pesagens para o gráfico de evolução.
  const [evolucao, definirEvolucao] = useState<RegistroEvolucao[]>([]);

  /** Carrega o plano atual e a evolução em paralelo (com tratamento de erros). */
  const carregarDados = useCallback(async () => {
    definirCarregando(true);
    definirErro(null);
    try {
      // Busca os dois recursos ao mesmo tempo (Promise.all).
      const [planoAtual, registros] = await Promise.all([buscarPlanoAtual(), listarEvolucao()]);
      definirPlano(planoAtual);
      definirEvolucao(registros);
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
      definirErro('Erro inesperado ao carregar o painel. Tente novamente.');
    } finally {
      definirCarregando(false);
    }
  }, [roteador]);

  // Dispara o carregamento ao montar a página.
  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  // Esqueleto de carregamento enquanto os dados chegam.
  if (carregando) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Esqueleto className="h-8 w-64" />
          <Esqueleto className="h-4 w-full max-w-md" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((indice) => (
            <Esqueleto key={indice} className="h-32 w-full" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Esqueleto className="h-80 w-full" />
          <Esqueleto className="h-80 w-full" />
        </div>
      </div>
    );
  }

  // Cartão de erro com botão para tentar novamente.
  if (erro) {
    return (
      <Cartao className="max-w-md">
        <CartaoCabecalho>
          <CartaoTitulo>Não foi possível carregar o painel</CartaoTitulo>
          <CartaoDescricao className="text-destructive">{erro}</CartaoDescricao>
        </CartaoCabecalho>
        <CartaoConteudo>
          <Botao onClick={() => void carregarDados()}>Tentar novamente</Botao>
        </CartaoConteudo>
      </Cartao>
    );
  }

  // Guarda de tipo: sem plano não há o que renderizar (fluxos de erro já trataram).
  if (!plano) {
    return null;
  }

  // Desestrutura o plano completo para facilitar a leitura.
  const { perfil, treino, dieta } = plano;

  // Nome guardado na sessão (login) — primeiro nome para a saudação.
  const nomeDoUsuario = obterUsuario()?.nome ?? '';
  const primeiroNome = nomeDoUsuario.split(' ')[0] ?? '';

  // Frase motivacional conforme o objetivo do plano.
  const fraseDoObjetivo =
    FRASES_POR_OBJETIVO[perfil.objetivo] ??
    'Planos 100% seus: edite cargas, troque alimentos e renove pela sua evolução.';

  // Delta de peso: última pesagem menos a primeira (nulo com menos de 2 registros).
  let deltaDePeso: number | null = null;
  if (evolucao.length >= 2) {
    const primeiraPesagem = evolucao[0];
    const ultimaPesagem = evolucao[evolucao.length - 1];
    if (primeiraPesagem && ultimaPesagem) {
      deltaDePeso = ultimaPesagem.peso_kg - primeiraPesagem.peso_kg;
    }
  }

  // Rodapé do cartão de peso: delta com seta de tendência.
  const rodapeDoPeso =
    deltaDePeso !== null ? (
      <span className="flex items-center gap-1">
        {/* Setas de tendência: queda em verde, alta em âmbar. */}
        {deltaDePeso < 0 ? <TrendingDown className="size-3.5 text-primary" /> : null}
        {deltaDePeso > 0 ? <TrendingUp className="size-3.5 text-amber-600" /> : null}
        {formatarDecimal(Math.abs(deltaDePeso))} kg desde o início
      </span>
    ) : (
      'Registre pesagens para ver a evolução'
    );

  // Linhas de macro do resumo rápido da dieta (consumo vs meta em percentual).
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
      {/* Saudação personalizada com a frase do objetivo. */}
      <section>
        <h1 className="font-display text-2xl font-bold text-foreground lg:text-3xl">
          {primeiroNome ? `Olá, ${primeiroNome}! 👋` : 'Olá! 👋'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{fraseDoObjetivo}</p>
      </section>

      {/* Grade com as 4 métricas principais do plano. */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoResumo
          titulo="Peso atual"
          valor={formatarDecimal(perfil.peso_kg)}
          unidade="kg"
          icone={<Weight />}
          rodape={rodapeDoPeso}
        />
        <CartaoResumo
          titulo="IMC"
          valor={formatarDecimal(dieta.meta.imc)}
          icone={<Gauge />}
          rodape={dieta.meta.classificacao_imc}
        />
        <CartaoResumo
          titulo="Meta calórica"
          valor={dieta.meta.meta_kcal}
          unidade="kcal/dia"
          icone={<Flame />}
          rodape={`TMB de ${dieta.meta.tmb} kcal`}
        />
        <CartaoResumo
          titulo="Água"
          valor={dieta.meta.agua_ml}
          unidade="ml/dia"
          icone={<Droplets />}
          corDoIcone="text-sky-600"
          rodape="Hidratação diária recomendada"
        />
      </section>

      {/* Gráficos lado a lado: evolução de peso e distribuição de macros. */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Cartao>
          <CartaoCabecalho>
            <CartaoTitulo>Evolução de peso</CartaoTitulo>
            <CartaoDescricao>Suas pesagens ao longo do tempo</CartaoDescricao>
          </CartaoCabecalho>
          <CartaoConteudo>
            <GraficoEvolucaoPeso registros={evolucao} />
          </CartaoConteudo>
        </Cartao>
        <Cartao>
          <CartaoCabecalho>
            <CartaoTitulo>Distribuição de macros</CartaoTitulo>
            <CartaoDescricao>Metas diárias do seu plano</CartaoDescricao>
          </CartaoCabecalho>
          <CartaoConteudo>
            <GraficoMacros meta={dieta.meta} />
          </CartaoConteudo>
        </Cartao>
      </section>

      {/* Resumos rápidos: próximo treino e dieta do dia. */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Cartao>
          <CartaoCabecalho>
            <CartaoTitulo>Próximo treino</CartaoTitulo>
            <CartaoDescricao>{treino.nome}</CartaoDescricao>
          </CartaoCabecalho>
          <CartaoConteudo className="space-y-2 text-sm text-muted-foreground">
            {/* Primeiro dia do plano. */}
            <p className="flex items-center gap-2">
              <Dumbbell className="size-4 shrink-0 text-primary" />
              {treino.dias_da_semana[0]?.titulo ?? 'Treino do dia'}
            </p>
            {/* Duração estimada da sessão. */}
            <p className="flex items-center gap-2">
              <Clock className="size-4 shrink-0 text-primary" />
              Duração estimada: {treino.duracao_estimada_min} min
            </p>
          </CartaoConteudo>
          <CartaoRodape>
            <Botao variante="contorno" tamanho="pequeno" comoFilho>
              <Link href="/painel/treino">Ver treino completo</Link>
            </Botao>
          </CartaoRodape>
        </Cartao>
        <Cartao>
          <CartaoCabecalho>
            <CartaoTitulo>Resumo da dieta</CartaoTitulo>
            <CartaoDescricao>
              {dieta.totais.calorias} kcal de {dieta.meta.meta_kcal} kcal
            </CartaoDescricao>
          </CartaoCabecalho>
          <CartaoConteudo className="space-y-3">
            {/* Barra de progresso por macro (consumo do plano vs meta). */}
            {linhasDosMacros.map((linha) => (
              <div key={linha.rotulo} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{linha.rotulo}</span>
                  <span className="text-muted-foreground">
                    {linha.consumido} g / {linha.meta} g
                  </span>
                </div>
                <BarraDeProgresso valor={linha.percentual} />
              </div>
            ))}
          </CartaoConteudo>
          <CartaoRodape>
            <Botao variante="contorno" tamanho="pequeno" comoFilho>
              <Link href="/painel/dieta">Ver dieta completa</Link>
            </Botao>
          </CartaoRodape>
        </Cartao>
      </section>
    </div>
  );
}
