'use client';

// Hooks do React: efeitos e estado.
import { useEffect, useRef, useState } from 'react';
// Navegação declarativa entre páginas do Next.js.
import Link from 'next/link';
// Motor de animações: movimento e detecção de visibilidade na rolagem.
import { motion, useInView } from 'framer-motion';
// Ícones da identidade visual do ProtocolFit.
import {
  ArrowRight,
  Calculator,
  Check,
  ClipboardList,
  Dumbbell,
  Flame,
  Footprints,
  HeartHandshake,
  HeartPulse,
  Lock,
  SlidersHorizontal,
  Sparkles,
  Zap,
} from 'lucide-react';
// Tipo dos ícones do lucide (usado para tipar as listas de conteúdo).
import type { LucideIcon } from 'lucide-react';
// Constantes de animação do design system (entrada suave padrão).
import { ANIMACAO_DE_ENTRADA, TRANSICAO_SUAVE } from '@/lib/constantes';
// Componentes de interface prontos do projeto.
import { Botao } from '@/components/ui/button';
import { Cartao, CartaoConteudo } from '@/components/ui/card';
import { Selo } from '@/components/ui/badge';

/** Rola suavemente até uma seção da própria página (links âncora). */
function rolarAte(idDaSecao: string): void {
  // Busca a seção pelo id e desliza até ela com suavidade.
  document.getElementById(idDaSecao)?.scrollIntoView({ behavior: 'smooth' });
}

/** Logotipo do ProtocolFit — reutilizado no cabeçalho e no rodapé. */
function Logotipo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      {/* Quadrado com gradiente da marca e ícone de batimento cardíaco. */}
      <span className="gradiente-marca flex size-9 items-center justify-center rounded-lg text-white shadow-sm">
        <HeartPulse className="size-5" />
      </span>
      {/* Nome da marca na fonte de títulos. */}
      <span className="font-display text-xl font-bold">ProtocolFit</span>
    </Link>
  );
}

/** Propriedades da estatística animada (valor, sufixo e rótulo). */
interface PropriedadesDaEstatistica {
  valor: number;
  sufixo: string;
  rotulo: string;
}

/** Número que conta de 0 até o alvo quando entra na tela (motion + useEffect). */
function EstatisticaAnimada({ valor, sufixo, rotulo }: PropriedadesDaEstatistica) {
  // Referência do bloco observado para detectar quando ele fica visível.
  const referencia = useRef<HTMLDivElement>(null);
  // Dispara o contador somente quando a estatística aparece na tela.
  const estaVisivel = useInView(referencia, { once: true, amount: 0.5 });
  // Valor exibido no momento (anima progressivamente até o alvo).
  const [valorExibido, definirValorExibido] = useState(0);

  useEffect(() => {
    // Não anima enquanto o bloco ainda não apareceu na tela.
    if (!estaVisivel) {
      return;
    }
    // Marca o instante inicial da contagem.
    const instanteInicial = performance.now();
    // Duração total do contador em milissegundos.
    const duracaoMs = 1400;
    // Identificador do quadro atual (permite cancelar a animação).
    let identificadorDoQuadro = 0;
    // Função recursiva que atualiza o número a cada quadro renderizado.
    const animar = (instanteAtual: number) => {
      // Calcula o progresso entre 0 e 1 (trava no fim).
      const progresso = Math.min((instanteAtual - instanteInicial) / duracaoMs, 1);
      // Exibe o valor proporcional ao progresso da animação.
      definirValorExibido(Math.round(valor * progresso));
      // Agenda o próximo quadro enquanto a contagem não terminar.
      if (progresso < 1) {
        identificadorDoQuadro = requestAnimationFrame(animar);
      }
    };
    // Inicia o primeiro quadro da contagem.
    identificadorDoQuadro = requestAnimationFrame(animar);
    // Cancela a animação se o componente sair da tela.
    return () => cancelAnimationFrame(identificadorDoQuadro);
  }, [estaVisivel, valor]);

  return (
    <div ref={referencia} className="flex flex-col items-center gap-1 text-center">
      {/* Número grande em destaque (fonte de títulos, cor da marca). */}
      <div className="font-display text-4xl font-bold text-primary">
        {valorExibido}
        {sufixo}
      </div>
      {/* Rótulo explicativo abaixo do número. */}
      <p className="text-sm text-muted-foreground">{rotulo}</p>
    </div>
  );
}

/** Números da faixa de estatísticas (prova social numérica). */
const ESTATISTICAS = [
  { valor: 3, sufixo: '', rotulo: 'objetivos' },
  { valor: 17, sufixo: '', rotulo: 'faixas etárias' },
  { valor: 36, sufixo: '', rotulo: 'treinos prontos' },
  { valor: 0, sufixo: ' R$', rotulo: 'de mensalidade' },
] as const;

/** Passos exibidos na seção "Como funciona". */
const PASSOS_COMO_FUNCIONA: { icone: LucideIcon; numero: string; titulo: string; descricao: string }[] = [
  { icone: ClipboardList, numero: '1', titulo: 'Responda o onboarding', descricao: 'Em 5 passos rápidos você conta seu corpo, objetivo, rotina e local de treino. Sem formulários gigantes.' },
  { icone: Calculator, numero: '2', titulo: 'O motor calcula TMB e macros', descricao: 'Fórmula Mifflin-St Jeor aplicada no seu corpo: calorias, proteínas, carboidratos e gorduras na medida exata.' },
  { icone: Dumbbell, numero: '3', titulo: 'Treine e evolua', descricao: 'Siga o treino e a dieta, registre seu peso e recalcule o plano sempre que a sua evolução pedir.' },
];

/** Diferenciais exibidos na grade 2x2. */
const DIFERENCIAIS: { icone: LucideIcon; titulo: string; descricao: string }[] = [
  { icone: HeartHandshake, titulo: '100% gratuito', descricao: 'Sem assinatura, sem cartão de crédito e sem letras miúdas: seu treino e sua dieta ficam para sempre no seu painel.' },
  { icone: Zap, titulo: 'Resultado em milissegundos', descricao: 'Planos gerados na hora, sem fila e sem processamento pesado rodando em segundo plano.' },
  { icone: Lock, titulo: 'Isolamento de dados', descricao: 'Seus dados servem apenas para calcular o seu plano — nada de treinar modelos com a sua rotina.' },
  { icone: SlidersHorizontal, titulo: 'Edite à vontade', descricao: 'Ajuste cargas, séries, repetições e troque alimentos quantas vezes quiser.' },
];

/** Objetivos em destaque, com atalho direto para o cadastro. */
const OBJETIVOS_DA_LANDING: { icone: LucideIcon; titulo: string; descricao: string }[] = [
  { icone: Flame, titulo: 'Emagrecimento', descricao: 'Déficit calórico seguro para secar sem perder músculo.' },
  { icone: Dumbbell, titulo: 'Hipertrofia', descricao: 'Superávit e proteína calculados para construir massa magra.' },
  { icone: Footprints, titulo: 'Corrida', descricao: 'Energia e carboidratos na medida para render no asfalto.' },
];

/** Página inicial — apresentação persuasiva do ProtocolFit. */
export default function PaginaInicial() {
  return (
    <div className="min-h-dvh bg-background">
      {/* Cabeçalho fixo com navegação por âncoras e botões de sessão. */}
      <header className="fixed inset-x-0 top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Logotipo à esquerda. */}
          <Logotipo />
          {/* Links âncora (visíveis em telas médias e grandes). */}
          <nav className="hidden items-center gap-6 md:flex">
            <button
              type="button"
              onClick={() => rolarAte('como-funciona')}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Como funciona
            </button>
            <button
              type="button"
              onClick={() => rolarAte('diferenciais')}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Diferenciais
            </button>
          </nav>
          {/* Botões de sessão à direita. */}
          <div className="flex items-center gap-2">
            <Botao variante="fantasma" tamanho="pequeno" comoFilho>
              <Link href="/login">Entrar</Link>
            </Botao>
            <Botao variante="gradiente" tamanho="pequeno" comoFilho>
              <Link href="/cadastro">Começar grátis</Link>
            </Botao>
          </div>
        </div>
      </header>

      {/* HERO — chamada principal com entrada escalonada. */}
      <section className="relative overflow-hidden pb-20 pt-36">
        {/* Brilhos decorativos de fundo (não interferem na leitura). */}
        <div aria-hidden className="pointer-events-none absolute -top-32 right-0 size-[500px] rounded-full bg-accent/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-20 size-[400px] rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 text-center sm:px-6">
          {/* Selo de posicionamento (primeiro elemento a aparecer). */}
          <motion.div initial={ANIMACAO_DE_ENTRADA.escondido} animate={ANIMACAO_DE_ENTRADA.visivel} transition={TRANSICAO_SUAVE}>
            <Selo variante="secundario" className="gap-1.5 rounded-full px-3 py-1 text-sm">
              <Sparkles className="size-3.5" /> Método determinístico · 100% gratuito
            </Selo>
          </motion.div>
          {/* Título grande com a palavra-chave em gradiente da marca. */}
          <motion.h1
            initial={ANIMACAO_DE_ENTRADA.escondido}
            animate={ANIMACAO_DE_ENTRADA.visivel}
            transition={{ ...TRANSICAO_SUAVE, delay: 0.1 }}
            className="mx-auto mt-6 max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl"
          >
            Seu treino e dieta personalizados em <span className="texto-gradiente">segundos</span>
          </motion.h1>
          {/* Subtítulo persuasivo com tom de confiança científica. */}
          <motion.p
            initial={ANIMACAO_DE_ENTRADA.escondido}
            animate={ANIMACAO_DE_ENTRADA.visivel}
            transition={{ ...TRANSICAO_SUAVE, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
          >
            Seu treino e sua dieta em segundos — calculados com ciência, não com achismo. Fórmula
            Mifflin-St Jeor aplicada no seu corpo, com cálculo exato e sem surpresas.
          </motion.p>
          {/* Chamadas para ação principais. */}
          <motion.div
            initial={ANIMACAO_DE_ENTRADA.escondido}
            animate={ANIMACAO_DE_ENTRADA.visivel}
            transition={{ ...TRANSICAO_SUAVE, delay: 0.3 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Botao variante="gradiente" tamanho="grande" comoFilho>
              <Link href="/cadastro">Criar meu plano grátis</Link>
            </Botao>
            <Botao variante="contorno" tamanho="grande" onClick={() => rolarAte('como-funciona')}>
              Ver como funciona
            </Botao>
          </motion.div>
          {/* Prova social rápida com três promessas curtas. */}
          <motion.div
            initial={ANIMACAO_DE_ENTRADA.escondido}
            animate={ANIMACAO_DE_ENTRADA.visivel}
            transition={{ ...TRANSICAO_SUAVE, delay: 0.4 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-medium text-muted-foreground"
          >
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-primary" /> 3 passos
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-primary" /> Sem assinatura
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-primary" /> 100% ciência
            </span>
          </motion.div>
        </div>
      </section>

      {/* Faixa de estatísticas com contadores animados. */}
      <section className="border-y bg-muted/40 py-12">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 sm:px-6 md:grid-cols-4">
          {/* Renderiza uma estatística animada por item da lista. */}
          {ESTATISTICAS.map((estatistica) => (
            <EstatisticaAnimada
              key={estatistica.rotulo}
              valor={estatistica.valor}
              sufixo={estatistica.sufixo}
              rotulo={estatistica.rotulo}
            />
          ))}
        </div>
      </section>

      {/* Seção "Como funciona" — os 3 passos do produto. */}
      <section id="como-funciona" className="scroll-mt-24 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* Título da seção com entrada ao rolar. */}
          <motion.div
            initial={ANIMACAO_DE_ENTRADA.escondido}
            whileInView={ANIMACAO_DE_ENTRADA.visivel}
            viewport={{ once: true, amount: 0.3 }}
            transition={TRANSICAO_SUAVE}
          >
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Como funciona</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Três passos entre você e um plano que respeita o seu corpo. Simples de começar,
              científico por baixo do capô.
            </p>
          </motion.div>
          {/* Grade de 3 cartões, um por passo. */}
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {PASSOS_COMO_FUNCIONA.map((passo, indice) => (
              <motion.div
                key={passo.numero}
                initial={ANIMACAO_DE_ENTRADA.escondido}
                whileInView={ANIMACAO_DE_ENTRADA.visivel}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ ...TRANSICAO_SUAVE, delay: indice * 0.1 }}
                className="h-full"
              >
                <Cartao className="h-full gap-4">
                  <CartaoConteudo className="flex flex-col gap-3">
                    {/* Ícone do passo e número em selo. */}
                    <div className="flex items-center justify-between">
                      <span className="gradiente-marca flex size-11 items-center justify-center rounded-lg text-white">
                        <passo.icone className="size-5" />
                      </span>
                      <Selo variante="contorno">Passo {passo.numero}</Selo>
                    </div>
                    <h3 className="font-display text-lg font-bold">{passo.titulo}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{passo.descricao}</p>
                  </CartaoConteudo>
                </Cartao>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Seção "Diferenciais" — grade 2x2 com os quatro pilares. */}
      <section id="diferenciais" className="scroll-mt-24 bg-muted/40 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={ANIMACAO_DE_ENTRADA.escondido}
            whileInView={ANIMACAO_DE_ENTRADA.visivel}
            viewport={{ once: true, amount: 0.3 }}
            transition={TRANSICAO_SUAVE}
          >
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Por que o ProtocolFit é diferente</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Zero inteligência artificial, zero erro de conta. Um motor determinístico que
              trabalha para você.
            </p>
          </motion.div>
          {/* Grade 2x2 com ícone, título e descrição de cada diferencial. */}
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {DIFERENCIAIS.map((diferencial, indice) => (
              <motion.div
                key={diferencial.titulo}
                initial={ANIMACAO_DE_ENTRADA.escondido}
                whileInView={ANIMACAO_DE_ENTRADA.visivel}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ ...TRANSICAO_SUAVE, delay: indice * 0.08 }}
                className="h-full"
              >
                <Cartao className="h-full flex-row gap-4">
                  {/* Ícone em quadrado verde claro. */}
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                    <diferencial.icone className="size-5" />
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-display text-base font-bold">{diferencial.titulo}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{diferencial.descricao}</p>
                  </div>
                </Cartao>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Seção "Objetivos" — três caminhos com atalho para o cadastro. */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={ANIMACAO_DE_ENTRADA.escondido}
            whileInView={ANIMACAO_DE_ENTRADA.visivel}
            viewport={{ once: true, amount: 0.3 }}
            transition={TRANSICAO_SUAVE}
          >
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Escolha o seu objetivo</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              O plano inteiro — treino, calorias e macros — é montado em torno do que você quer
              conquistar.
            </p>
          </motion.div>
          {/* Três cartões de objetivo com seta para o cadastro. */}
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {OBJETIVOS_DA_LANDING.map((objetivo, indice) => (
              <motion.div
                key={objetivo.titulo}
                initial={ANIMACAO_DE_ENTRADA.escondido}
                whileInView={ANIMACAO_DE_ENTRADA.visivel}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ ...TRANSICAO_SUAVE, delay: indice * 0.1 }}
                className="h-full"
              >
                <Cartao className="group h-full gap-4 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-md">
                  <CartaoConteudo className="flex flex-col gap-3">
                    {/* Ícone do objetivo em gradiente da marca. */}
                    <span className="gradiente-marca flex size-11 items-center justify-center rounded-lg text-white">
                      <objetivo.icone className="size-5" />
                    </span>
                    <h3 className="font-display text-lg font-bold">{objetivo.titulo}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{objetivo.descricao}</p>
                    {/* Seta para o cadastro (desliza ao passar o mouse). */}
                    <Link
                      href="/cadastro"
                      className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                    >
                      Começar agora <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </CartaoConteudo>
                </Cartao>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final — painel em gradiente da marca com botão branco. */}
      <section className="pb-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={ANIMACAO_DE_ENTRADA.escondido}
            whileInView={ANIMACAO_DE_ENTRADA.visivel}
            viewport={{ once: true, amount: 0.3 }}
            transition={TRANSICAO_SUAVE}
            className="gradiente-marca sombra-suave rounded-3xl px-6 py-16 text-center text-white"
          >
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Seu primeiro plano em menos de 2 minutos</h2>
            <p className="mx-auto mt-4 max-w-xl text-white/85">
              Sem cadastro complexo, sem espera e sem achismo. Crie sua conta e receba treino e
              dieta calculados para o seu corpo.
            </p>
            {/* Botão branco sobre o gradiente (contraste máximo). */}
            <div className="mt-8">
              <Botao tamanho="grande" className="bg-white text-primary shadow-none hover:bg-white/90" comoFilho>
                <Link href="/cadastro">Criar meu plano grátis</Link>
              </Botao>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Rodapé com logotipo, tagline e ano corrente. */}
      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-10 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left">
          <Logotipo />
          <p className="text-sm text-muted-foreground">Treino e dieta com ciência determinística — sem achismo.</p>
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} ProtocolFit</p>
        </div>
      </footer>
    </div>
  );
}
