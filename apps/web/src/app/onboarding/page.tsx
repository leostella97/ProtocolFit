'use client';

// Hooks do React: efeitos e estado.
import { useEffect, useState } from 'react';
// Tipo do retorno da função que renderiza cada passo.
import type { ReactNode } from 'react';
// Navegação declarativa entre páginas do Next.js.
import Link from 'next/link';
// Roteador para a guarda de sessão e o redirecionamento final.
import { useRouter } from 'next/navigation';
// Animações: presença animada entre passos e movimento.
import { AnimatePresence, motion } from 'framer-motion';
// Ícones da interface.
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Dumbbell,
  Flame,
  Footprints,
  HeartPulse,
  Loader2,
  Mars,
  PersonStanding,
  Sparkles,
  Venus,
} from 'lucide-react';
// Tipo dos ícones do lucide (usado nos mapas de ícones).
import type { LucideIcon } from 'lucide-react';
// Funções de API e o tipo do corpo enviado ao gerar o plano.
import { buscarOpcoes, salvarPerfilEGerarPlanos, ErroDaApi } from '@/lib/api';
import type { CorpoPerfil } from '@/lib/api';
// Verificação de sessão ativa no navegador.
import { possuiSessao } from '@/lib/armazenamento';
// Tipos do contrato de dados do frontend.
import type { Modalidade, Objetivo, OpcoesDoSistema, Sexo } from '@/lib/tipos';
// Utilitários de classes e rótulos amigáveis.
import {
  combinarClasses,
  formatarDecimal,
  rotuloDaModalidade,
  rotuloDoDia,
  rotuloDoObjetivo,
} from '@/lib/util';
// Constantes de animação do design system.
import { ANIMACAO_DE_ENTRADA, TRANSICAO_SUAVE } from '@/lib/constantes';
// Componentes de interface prontos do projeto.
import { Botao } from '@/components/ui/button';
import { Cartao, CartaoConteudo, CartaoDescricao, CartaoTitulo } from '@/components/ui/card';
import { CampoDeEntrada } from '@/components/ui/input';
import { Rotulo } from '@/components/ui/label';
import { MenuDeSelecao } from '@/components/ui/select';
import { BarraDeProgresso } from '@/components/ui/progress';
import { Esqueleto } from '@/components/ui/skeleton';

/** Estado único do formulário do onboarding (respostas dos 5 passos). */
interface FormularioDoOnboarding {
  sexo: Sexo | null;
  faixaEtaria: string;
  alturaCm: string;
  pesoKg: string;
  objetivo: Objetivo | null;
  frequenciaSemanal: number | null;
  diasSelecionados: string[];
  modalidade: Modalidade | null;
}

/** Valores iniciais do formulário (tudo vazio). */
const FORMULARIO_INICIAL: FormularioDoOnboarding = {
  sexo: null,
  faixaEtaria: '',
  alturaCm: '',
  pesoKg: '',
  objetivo: null,
  frequenciaSemanal: null,
  diasSelecionados: [],
  modalidade: null,
};

/** Quantidade total de passos do wizard. */
const TOTAL_DE_PASSOS = 5;

/** Títulos exibidos em cada passo. */
const TITULOS_DOS_PASSOS = ['Seu corpo', 'Seu objetivo', 'Sua rotina', 'Seu local', 'Revisão'];

/** Descrições curtas exibidas em cada passo. */
const DESCRICOES_DOS_PASSOS = [
  'Esses dados alimentam a fórmula Mifflin-St Jeor.',
  'O plano inteiro é montado em torno do seu objetivo.',
  'Quantas vezes por semana e em quais dias você vai treinar?',
  'Onde o treino vai acontecer?',
  'Confira tudo antes de gerar o seu plano.',
];

/** Ícones associados a cada objetivo do sistema. */
const ICONES_DOS_OBJETIVOS: Record<Objetivo, LucideIcon> = {
  emagrecimento: Flame,
  hipertrofia: Dumbbell,
  corrida: Footprints,
};

/** Ícones associados a cada modalidade de treino. */
const ICONES_DAS_MODALIDADES: Record<Modalidade, LucideIcon> = {
  academia: Building2,
  pesocorporal: PersonStanding,
};

/** Variantes da transição entre passos (deslize direcional). */
const VARIANTES_DO_PASSO = {
  // Entra deslizando a partir do lado indicado pela direção.
  entrar: (direcaoAtual: number): { opacity: number; x: number } => ({ opacity: 0, x: 48 * direcaoAtual }),
  // Posição central (totalmente visível).
  central: { opacity: 1, x: 0 },
  // Sai deslizando para o lado oposto ao da entrada.
  sair: (direcaoAtual: number): { opacity: number; x: number } => ({ opacity: 0, x: -48 * direcaoAtual }),
};

/** Propriedades do cartão de opção clicável (sexo, objetivo, modalidade). */
interface PropriedadesDoCartaoDeOpcao {
  selecionado: boolean;
  aoSelecionar: () => void;
  icone: LucideIcon;
  titulo: string;
  descricao?: string;
}

/** Cartão clicável usado para escolher uma opção entre poucas. */
function CartaoDeOpcao({ selecionado, aoSelecionar, icone: IconeDaOpcao, titulo, descricao }: PropriedadesDoCartaoDeOpcao) {
  return (
    <button
      type="button"
      onClick={aoSelecionar}
      aria-pressed={selecionado}
      className={combinarClasses(
        'flex flex-col items-start gap-3 rounded-xl border p-5 text-left transition-all',
        // Estado selecionado: borda verde, fundo verde claro e anel.
        selecionado
          ? 'border-primary bg-secondary ring-2 ring-primary/30'
          : 'border-border bg-card hover:border-primary/50 hover:bg-secondary/60',
      )}
    >
      {/* Ícone em gradiente quando selecionado; verde claro caso contrário. */}
      <span
        className={combinarClasses(
          'flex size-10 items-center justify-center rounded-lg transition-colors',
          selecionado ? 'gradiente-marca text-white' : 'bg-secondary text-primary',
        )}
      >
        <IconeDaOpcao className="size-5" />
      </span>
      <span className="font-display text-base font-bold">{titulo}</span>
      {descricao ? <span className="text-sm leading-relaxed text-muted-foreground">{descricao}</span> : null}
    </button>
  );
}

/** Wizard de onboarding — coleta o perfil e gera o primeiro plano. */
export default function PaginaDeOnboarding() {
  // Roteador para guarda de sessão e redirecionamento final.
  const roteador = useRouter();
  // Passo atual do wizard (1 a 5).
  const [passo, definirPasso] = useState(1);
  // Direção do slide da transição (1 = avança, -1 = volta).
  const [direcao, definirDirecao] = useState(1);
  // Estado único do formulário com todas as respostas.
  const [formulario, definirFormulario] = useState<FormularioDoOnboarding>(FORMULARIO_INICIAL);
  // Opções oficiais vindas da API (faixas, objetivos, modalidades...).
  const [opcoes, definirOpcoes] = useState<OpcoesDoSistema | null>(null);
  // Indica o carregamento inicial das opções.
  const [carregando, definirCarregando] = useState(true);
  // Erro ao carregar as opções (permite tentar novamente).
  const [erroAoCarregar, definirErroAoCarregar] = useState<string | null>(null);
  // Mensagem de validação ou de erro de envio.
  const [mensagem, definirMensagem] = useState<string | null>(null);
  // Indica o envio do perfil em andamento.
  const [enviando, definirEnviando] = useState(false);

  /** Carrega as opções estáticas do onboarding direto da API. */
  async function carregarOpcoes(): Promise<void> {
    // Liga o esqueleto e limpa erros antigos.
    definirCarregando(true);
    definirErroAoCarregar(null);
    try {
      // Busca faixas etárias, objetivos, modalidades, frequências e dias.
      const opcoesRecebidas = await buscarOpcoes();
      definirOpcoes(opcoesRecebidas);
    } catch (erroCapturado) {
      // Exibe a mensagem amigável da API (ou fallback de conexão).
      definirErroAoCarregar(
        erroCapturado instanceof ErroDaApi
          ? erroCapturado.message
          : 'Não foi possível carregar as opções. Verifique sua conexão.',
      );
    } finally {
      // Encerra o esqueleto em qualquer desfecho.
      definirCarregando(false);
    }
  }

  // Guarda de sessão: sem token não há onboarding — volta ao login.
  useEffect(() => {
    // Verifica o token salvo no navegador.
    if (!possuiSessao()) {
      // Substitui a rota para impedir voltar ao onboarding deslogado.
      roteador.replace('/login');
    }
  }, [roteador]);

  // Carrega as opções somente com uma sessão ativa.
  useEffect(() => {
    // Sem sessão não há o que carregar (a guarda acima redireciona).
    if (!possuiSessao()) {
      return;
    }
    // Dispara o carregamento ignorando a promise (erros tratados dentro).
    void carregarOpcoes();
    // Executa somente na montagem do componente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Atualiza um campo específico do formulário preservando os demais. */
  function atualizarCampo<Chave extends keyof FormularioDoOnboarding>(
    chave: Chave,
    valor: FormularioDoOnboarding[Chave],
  ): void {
    // Usa o atualizador funcional para nunca perder respostas anteriores.
    definirFormulario((atual) => ({ ...atual, [chave]: valor }));
  }

  /** Adiciona ou remove um dia da semana da seleção (comportamento toggle). */
  function alternarDia(valorDia: string): void {
    definirFormulario((atual) => ({
      ...atual,
      // Já selecionado → remove; caso contrário → adiciona ao final.
      diasSelecionados: atual.diasSelecionados.includes(valorDia)
        ? atual.diasSelecionados.filter((dia) => dia !== valorDia)
        : [...atual.diasSelecionados, valorDia],
    }));
  }

  /** Valida o passo atual e devolve a mensagem de erro (ou null). */
  function validarPassoAtual(): string | null {
    // Passo 1 — corpo: sexo, faixa etária, altura e peso.
    if (passo === 1) {
      if (!formulario.sexo) {
        return 'Selecione seu sexo biológico para calibrar a fórmula.';
      }
      if (!formulario.faixaEtaria) {
        return 'Escolha a sua faixa etária.';
      }
      // Converte a altura para número e confere o intervalo aceito.
      const altura = Number(formulario.alturaCm);
      if (!formulario.alturaCm || Number.isNaN(altura) || altura < 100 || altura > 250) {
        return 'Informe uma altura válida em centímetros (ex.: 175).';
      }
      // Converte o peso para número e confere o intervalo aceito.
      const peso = Number(formulario.pesoKg);
      if (!formulario.pesoKg || Number.isNaN(peso) || peso < 30 || peso > 350) {
        return 'Informe um peso válido em quilogramas (ex.: 72,5).';
      }
      return null;
    }
    // Passo 2 — objetivo principal.
    if (passo === 2) {
      return formulario.objetivo ? null : 'Escolha o objetivo principal do seu plano.';
    }
    // Passo 3 — frequência semanal e dias disponíveis.
    if (passo === 3) {
      if (formulario.frequenciaSemanal === null) {
        return 'Selecione quantas vezes por semana você pretende treinar.';
      }
      if (formulario.diasSelecionados.length === 0) {
        return 'Marque pelo menos 1 dia disponível na semana.';
      }
      return null;
    }
    // Passo 4 — local/modalidade de treino.
    if (passo === 4) {
      return formulario.modalidade ? null : 'Escolha onde você vai treinar.';
    }
    // O passo de revisão não exige validação.
    return null;
  }

  /** Avança para o próximo passo (validando antes de ir). */
  function irParaProximoPasso(): void {
    // Interrompe a navegação quando o passo atual está inválido.
    const erroDeValidacao = validarPassoAtual();
    if (erroDeValidacao) {
      definirMensagem(erroDeValidacao);
      return;
    }
    // Limpa mensagens antigas e desliza para frente.
    definirMensagem(null);
    definirDirecao(1);
    definirPasso((atual) => Math.min(atual + 1, TOTAL_DE_PASSOS));
  }

  /** Volta para o passo anterior (sem validar respostas). */
  function voltarParaPassoAnterior(): void {
    // Limpa mensagens antigas e desliza para trás.
    definirMensagem(null);
    definirDirecao(-1);
    definirPasso((atual) => Math.max(atual - 1, 1));
  }

  /** Envia o perfil completo e gera treino + dieta no servidor. */
  async function gerarPlano(): Promise<void> {
    // Defesa extra: os campos obrigatórios precisam existir antes do envio.
    if (!formulario.sexo || !formulario.objetivo || !formulario.modalidade) {
      definirMensagem('Complete os passos anteriores antes de gerar o plano.');
      return;
    }
    // Liga o estado de envio e limpa mensagens antigas.
    definirEnviando(true);
    definirMensagem(null);
    try {
      // Monta o corpo enviado à API conforme o contrato CorpoPerfil.
      const corpo: CorpoPerfil = {
        sexo: formulario.sexo,
        faixa_etaria: formulario.faixaEtaria,
        peso_kg: Number(formulario.pesoKg),
        altura_cm: Number(formulario.alturaCm),
        objetivo: formulario.objetivo,
        // A frequência enviada é a quantidade real de dias selecionados.
        frequencia_semanal: formulario.diasSelecionados.length,
        dias_disponiveis: formulario.diasSelecionados,
        modalidade: formulario.modalidade,
        // Todo novo usuário começa no nível iniciante.
        nivel: 'iniciante',
      };
      // Salva o perfil e recebe os planos prontos do motor determinístico.
      await salvarPerfilEGerarPlanos(corpo);
      // Sucesso: segue para o painel com os planos recém-gerados.
      roteador.push('/painel');
      roteador.refresh();
    } catch (erroCapturado) {
      // Exibe a mensagem amigável da API (ou fallback de conexão).
      definirMensagem(
        erroCapturado instanceof ErroDaApi
          ? erroCapturado.message
          : 'Não foi possível gerar o plano agora. Tente novamente em instantes.',
      );
      // Reabilita o botão para uma nova tentativa.
      definirEnviando(false);
    }
  }

  /** Renderiza o conteúdo do passo atual do wizard. */
  function renderizarConteudoDoPasso(): ReactNode {
    // Cabeçalho padrão exibido em todos os passos.
    const cabecalhoDoPasso = (
      <div>
        <h2 className="font-display text-2xl font-bold">{TITULOS_DOS_PASSOS[passo - 1]}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{DESCRICOES_DOS_PASSOS[passo - 1]}</p>
      </div>
    );

    // Passo 1 — dados do corpo.
    if (passo === 1 && opcoes) {
      return (
        <div className="flex flex-col gap-6">
          {cabecalhoDoPasso}
          {/* Escolha do sexo biológico (2 cartões-botão). */}
          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium">Sexo biológico</span>
            <div className="grid grid-cols-2 gap-4">
              <CartaoDeOpcao
                selecionado={formulario.sexo === 'masculino'}
                aoSelecionar={() => atualizarCampo('sexo', 'masculino')}
                icone={Mars}
                titulo="Masculino"
                descricao="Fator masculino na fórmula"
              />
              <CartaoDeOpcao
                selecionado={formulario.sexo === 'feminino'}
                aoSelecionar={() => atualizarCampo('sexo', 'feminino')}
                icone={Venus}
                titulo="Feminino"
                descricao="Fator feminino na fórmula"
              />
            </div>
          </div>
          {/* Faixa etária vinda da API. */}
          <div className="flex flex-col gap-2">
            <Rotulo htmlFor="faixa-etaria">Faixa etária</Rotulo>
            <MenuDeSelecao
              id="faixa-etaria"
              value={formulario.faixaEtaria}
              onChange={(evento) => atualizarCampo('faixaEtaria', evento.target.value)}
            >
              {/* Opção inicial desabilitada para forçar uma escolha real. */}
              <option value="" disabled>
                Selecione sua faixa etária
              </option>
              {opcoes.faixas_etarias.map((faixa) => (
                <option key={faixa.valor} value={faixa.valor}>
                  {faixa.rotulo}
                </option>
              ))}
            </MenuDeSelecao>
          </div>
          {/* Altura e peso lado a lado. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Rotulo htmlFor="altura">Altura (cm)</Rotulo>
              <div className="relative">
                <CampoDeEntrada
                  id="altura"
                  type="number"
                  min={100}
                  max={250}
                  step={1}
                  placeholder="Ex.: 175"
                  value={formulario.alturaCm}
                  onChange={(evento) => atualizarCampo('alturaCm', evento.target.value)}
                  className="pr-12"
                />
                {/* Unidade fixa à direita do campo. */}
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  cm
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Rotulo htmlFor="peso">Peso (kg)</Rotulo>
              <div className="relative">
                <CampoDeEntrada
                  id="peso"
                  type="number"
                  min={30}
                  max={350}
                  step={0.1}
                  placeholder="Ex.: 72,5"
                  value={formulario.pesoKg}
                  // Aceita vírgula decimal brasileira, convertendo para ponto.
                  onChange={(evento) => atualizarCampo('pesoKg', evento.target.value.replace(',', '.'))}
                  className="pr-12"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  kg
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Passo 2 — objetivo principal.
    if (passo === 2 && opcoes) {
      return (
        <div className="flex flex-col gap-6">
          {cabecalhoDoPasso}
          {/* Um cartão clicável por objetivo vindo da API. */}
          <div className="grid gap-4">
            {opcoes.objetivos.map((objetivo) => (
              <CartaoDeOpcao
                key={objetivo.valor}
                selecionado={formulario.objetivo === objetivo.valor}
                aoSelecionar={() => atualizarCampo('objetivo', objetivo.valor)}
                icone={ICONES_DOS_OBJETIVOS[objetivo.valor]}
                titulo={objetivo.rotulo}
                descricao={objetivo.descricao}
              />
            ))}
          </div>
        </div>
      );
    }

    // Passo 3 — rotina semanal.
    if (passo === 3 && opcoes) {
      return (
        <div className="flex flex-col gap-6">
          {cabecalhoDoPasso}
          {/* Chips com as frequências oficiais da API. */}
          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium">Frequência semanal</span>
            <div className="flex flex-wrap gap-2">
              {opcoes.frequencias_semanais.map((frequencia) => {
                const selecionada = formulario.frequenciaSemanal === frequencia;
                return (
                  <button
                    key={frequencia}
                    type="button"
                    onClick={() => atualizarCampo('frequenciaSemanal', frequencia)}
                    aria-pressed={selecionada}
                    className={combinarClasses(
                      'rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                      selecionada
                        ? 'gradiente-marca border-transparent text-white'
                        : 'border-border bg-card text-foreground hover:bg-secondary',
                    )}
                  >
                    {frequencia}x/semana
                  </button>
                );
              })}
            </div>
          </div>
          {/* Chips de dias da semana com seleção múltipla (toggle). */}
          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium">Dias disponíveis</span>
            <div className="flex flex-wrap gap-2">
              {opcoes.dias_semana.map((dia) => {
                const selecionado = formulario.diasSelecionados.includes(dia.valor);
                return (
                  <button
                    key={dia.valor}
                    type="button"
                    onClick={() => alternarDia(dia.valor)}
                    aria-pressed={selecionado}
                    className={combinarClasses(
                      'rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                      selecionado
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-foreground hover:bg-secondary',
                    )}
                  >
                    {/* Rótulo amigável do dia (ex.: "Segunda"). */}
                    {rotuloDoDia(dia.valor)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // Passo 4 — local/modalidade de treino.
    if (passo === 4 && opcoes) {
      return (
        <div className="flex flex-col gap-6">
          {cabecalhoDoPasso}
          {/* Um cartão clicável por modalidade vinda da API. */}
          <div className="grid gap-4 sm:grid-cols-2">
            {opcoes.modalidades.map((modalidade) => (
              <CartaoDeOpcao
                key={modalidade.valor}
                selecionado={formulario.modalidade === modalidade.valor}
                aoSelecionar={() => atualizarCampo('modalidade', modalidade.valor)}
                icone={ICONES_DAS_MODALIDADES[modalidade.valor]}
                titulo={modalidade.rotulo}
                descricao={modalidade.descricao}
              />
            ))}
          </div>
        </div>
      );
    }

    // Passo 5 — revisão do resumo (único passo restante).
    // Rótulo amigável da faixa etária escolhida (busca nas opções).
    const rotuloDaFaixaEtaria =
      opcoes?.faixas_etarias.find((faixa) => faixa.valor === formulario.faixaEtaria)?.rotulo ??
      formulario.faixaEtaria;
    // Monta a lista de linhas do resumo final.
    const itensDaRevisao = [
      { rotulo: 'Sexo', valor: formulario.sexo === 'feminino' ? 'Feminino' : 'Masculino' },
      { rotulo: 'Faixa etária', valor: rotuloDaFaixaEtaria },
      { rotulo: 'Altura', valor: `${formulario.alturaCm} cm` },
      { rotulo: 'Peso', valor: `${formatarDecimal(Number(formulario.pesoKg))} kg` },
      { rotulo: 'Objetivo', valor: rotuloDoObjetivo(formulario.objetivo ?? '') },
      { rotulo: 'Frequência', valor: `${formulario.diasSelecionados.length}x/semana` },
      { rotulo: 'Dias', valor: formulario.diasSelecionados.map(rotuloDoDia).join(', ') },
      { rotulo: 'Modalidade', valor: rotuloDaModalidade(formulario.modalidade ?? '') },
    ];
    return (
      <div className="flex flex-col gap-6">
        {cabecalhoDoPasso}
        {/* Resumo em lista com linhas alternadas para leitura fácil. */}
        <div className="overflow-hidden rounded-xl border">
          {itensDaRevisao.map((item, indice) => (
            <div
              key={item.rotulo}
              className={combinarClasses(
                'flex items-center justify-between gap-4 px-4 py-3 text-sm',
                indice % 2 === 0 ? 'bg-card' : 'bg-muted/40',
              )}
            >
              <span className="text-muted-foreground">{item.rotulo}</span>
              <span className="text-right font-semibold">{item.valor}</span>
            </div>
          ))}
        </div>
        {/* Dica tranquilizadora antes da geração. */}
        <p className="text-sm text-muted-foreground">
          Tudo certo? O motor vai calcular sua TMB, suas calorias e seus macros — e você poderá
          ajustar tudo depois.
        </p>
      </div>
    );
  }

  // Estado de carregamento inicial: esqueletos pulsantes no lugar do formulário.
  if (carregando) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-2xl">
          {/* Esqueleto do logo e do título. */}
          <div className="mb-8 flex items-center gap-3">
            <Esqueleto className="size-10 rounded-lg" />
            <Esqueleto className="h-6 w-40" />
          </div>
          {/* Esqueleto da barra de progresso e do rótulo. */}
          <Esqueleto className="mb-2 h-2.5 w-full" />
          <Esqueleto className="mb-8 h-4 w-32" />
          {/* Esqueleto dos campos do passo. */}
          <div className="grid grid-cols-2 gap-4">
            <Esqueleto className="h-24 w-full" />
            <Esqueleto className="h-24 w-full" />
            <Esqueleto className="h-12 w-full" />
            <Esqueleto className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Estado de erro no carregamento: cartão com botão de nova tentativa.
  if (erroAoCarregar) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
        <Cartao className="w-full max-w-md text-center">
          <CartaoConteudo className="flex flex-col items-center gap-4">
            <AlertCircle className="size-10 text-destructive" />
            <CartaoTitulo>Não foi possível carregar as opções</CartaoTitulo>
            <CartaoDescricao>{erroAoCarregar}</CartaoDescricao>
            <Botao onClick={() => void carregarOpcoes()}>Tentar novamente</Botao>
          </CartaoConteudo>
        </Cartao>
      </div>
    );
  }

  // Defesa de tipo: sem opções carregadas não há o que renderizar.
  if (!opcoes) {
    return null;
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
        {/* Topo: logo + progresso visual do wizard. */}
        <header className="mb-8 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            {/* Logo leva de volta à página inicial. */}
            <Link href="/" className="flex items-center gap-2">
              <span className="gradiente-marca flex size-9 items-center justify-center rounded-lg text-white">
                <HeartPulse className="size-5" />
              </span>
              <span className="font-display text-lg font-bold">ProtocolFit</span>
            </Link>
            <span className="text-sm font-medium text-muted-foreground">
              Passo {passo} de {TOTAL_DE_PASSOS}
            </span>
          </div>
          {/* Barra de progresso proporcional ao passo atual. */}
          <BarraDeProgresso valor={(passo / TOTAL_DE_PASSOS) * 100} className="h-2.5" />
        </header>
        {/* Cartão do wizard com entrada animada padrão. */}
        <motion.div initial={ANIMACAO_DE_ENTRADA.escondido} animate={ANIMACAO_DE_ENTRADA.visivel} transition={TRANSICAO_SUAVE}>
          <Cartao className="sombra-suave">
            <CartaoConteudo>
              {/* Conteúdo do passo com transição de slide entre eles. */}
              <AnimatePresence mode="wait" custom={direcao}>
                <motion.div
                  key={passo}
                  custom={direcao}
                  variants={VARIANTES_DO_PASSO}
                  initial="entrar"
                  animate="central"
                  exit="sair"
                  transition={TRANSICAO_SUAVE}
                  className="min-h-[280px]"
                >
                  {renderizarConteudoDoPasso()}
                </motion.div>
              </AnimatePresence>
              {/* Mensagem de validação ou de erro de envio. */}
              {mensagem && (
                <p
                  role="alert"
                  className="mt-5 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  {mensagem}
                </p>
              )}
              {/* Rodapé com a navegação entre passos. */}
              <div className="mt-8 flex items-center justify-between gap-3 border-t pt-6">
                {/* Voltar só aparece a partir do passo 2. */}
                {passo > 1 ? (
                  <Botao variante="contorno" onClick={voltarParaPassoAnterior} disabled={enviando}>
                    <ArrowLeft /> Voltar
                  </Botao>
                ) : (
                  <span />
                )}
                {/* Avançar nos passos 1 a 4; gerar o plano no passo 5. */}
                {passo < TOTAL_DE_PASSOS ? (
                  <Botao onClick={irParaProximoPasso} disabled={enviando}>
                    Avançar <ArrowRight />
                  </Botao>
                ) : (
                  <Botao
                    variante="gradiente"
                    tamanho="grande"
                    onClick={() => void gerarPlano()}
                    disabled={enviando}
                  >
                    {enviando ? (
                      <>
                        <Loader2 className="animate-spin" /> Gerando…
                      </>
                    ) : (
                      <>
                        Gerar meu plano <Sparkles />
                      </>
                    )}
                  </Botao>
                )}
              </div>
            </CartaoConteudo>
          </Cartao>
        </motion.div>
      </div>
    </div>
  );
}
