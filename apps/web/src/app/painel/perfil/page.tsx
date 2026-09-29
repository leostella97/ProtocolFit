/**
 * page.tsx — Perfil do painel
 * ---------------------------------------------------------------------------
 * Exibe os dados do perfil, permite registrar pesagens (registrarPesagem)
 * com histórico comparado, TROCAR O ESTILO DE TREINO (atualizarEstiloDeTreino),
 * recalcular os planos (recalcularPlanos) com confirmação, e encerrar a sessão.
 * Carrega plano + evolução + opções em paralelo.
 * ---------------------------------------------------------------------------
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut, Pencil, Plus, RefreshCw, Save, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
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
import { MenuDeSelecao } from '@/components/ui/select';
import { Separador } from '@/components/ui/separator';
import { Esqueleto } from '@/components/ui/skeleton';
import {
  atualizarEstiloDeTreino,
  buscarContaAtual,
  buscarOpcoes,
  buscarPlanoAtual,
  listarEvolucao,
  recalcularPlanos,
  registrarPesagem,
  salvarPerfilEGerarPlanos,
  ErroDaApi,
  type CorpoPerfil,
} from '@/lib/api';
import { encerrarSessao } from '@/lib/armazenamento';
// TEAM_001: cartão "Leve seu progresso com você" (exportar/importar backup).
import { CartaoPortabilidade } from '@/components/portabilidade/cartao-portabilidade';
import {
  combinarClasses,
  formatarData,
  formatarDecimal,
  rotuloDaModalidade,
  rotuloDoDia,
  rotuloDoObjetivo,
} from '@/lib/util';
import type {
  Modalidade,
  Objetivo,
  OpcoesDoSistema,
  PlanoCompleto,
  RegistroEvolucao,
  Sexo,
  VariacaoDeTreino,
} from '@/lib/tipos';

/** Data de hoje no formato AAAA-MM-DD (fuso local do navegador). */
function dataDeHoje(): string {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/** Mensagem de feedback (sucesso ou erro) da pesagem. */
interface MensagemDaPesagem {
  /** Tipo do feedback exibido. */
  tipo: 'sucesso' | 'erro';
  /** Texto amigável da mensagem. */
  texto: string;
}

/**
 * Estilos (variações) de treino disponíveis para a combinação do usuário.
 * O estilo padrão vem sempre primeiro; os demais em ordem alfabética.
 */
function estilosDaCombinacao(
  opcoes: OpcoesDoSistema | null,
  plano: PlanoCompleto | null,
): VariacaoDeTreino[] {
  // Sem opções ou sem perfil não há estilos para listar.
  if (!opcoes || !plano) {
    return [];
  }
  const { modalidade, objetivo, dias_disponiveis } = plano.perfil;
  return opcoes.variacoes_de_treino
    .filter(
      (estilo) =>
        estilo.modalidade === modalidade &&
        estilo.objetivo === objetivo &&
        estilo.dias === dias_disponiveis.length,
    )
    .sort((primeiro, segundo) => {
      // O estilo padrão é sempre a primeira opção da lista.
      if (primeiro.id === 'padrao') {
        return -1;
      }
      if (segundo.id === 'padrao') {
        return 1;
      }
      return primeiro.nome.localeCompare(segundo.nome, 'pt-BR');
    });
}

/** Linha de um dado do perfil (rótulo + valor). */
function LinhaDeDado({ rotulo, valor }: { rotulo: string; valor: string }) {  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{rotulo}</span>
      <span className="text-sm font-semibold capitalize text-foreground">{valor}</span>
    </div>
  );
}

/** Página do perfil — dados, pesagem, recálculo e saída. */
export default function PaginaDoPerfil() {
  const roteador = useRouter();
  // Estado de carregamento, erro e plano completo.
  const [carregando, definirCarregando] = useState(true);
  const [erro, definirErro] = useState<string | null>(null);
  const [plano, definirPlano] = useState<PlanoCompleto | null>(null);
  // Histórico de pesagens (recarregado após cada registro).
  const [evolucao, definirEvolucao] = useState<RegistroEvolucao[]>([]);
  // Formulário da pesagem: peso digitado e data (padrão hoje).
  const [pesoDigitado, definirPesoDigitado] = useState('');
  const [dataDaPesagem, definirDataDaPesagem] = useState(dataDeHoje);
  // Salvamento da pesagem em andamento.
  const [salvandoPesagem, definirSalvandoPesagem] = useState(false);
  // Feedback de sucesso/erro da pesagem.
  const [mensagemDaPesagem, definirMensagemDaPesagem] = useState<MensagemDaPesagem | null>(null);
  // Confirmação em duas etapas do recálculo.
  const [confirmandoRecalculo, definirConfirmandoRecalculo] = useState(false);
  // Recálculo em andamento.
  const [recalculando, definirRecalculando] = useState(false);
  // Mensagens de sucesso/erro do recálculo.
  const [mensagemDeRecalculo, definirMensagemDeRecalculo] = useState<string | null>(null);
  const [erroDeRecalculo, definirErroDeRecalculo] = useState<string | null>(null);
  // Opções do sistema (traz a lista de estilos de treino disponíveis).
  const [opcoes, definirOpcoes] = useState<OpcoesDoSistema | null>(null);
  // Estilo de treino escolhido no seletor ("padrao" = modelo clássico).
  const [estiloEscolhido, definirEstiloEscolhido] = useState<string>('padrao');
  // Troca de estilo em andamento.
  const [aplicandoEstilo, definirAplicandoEstilo] = useState(false);
  // Mensagens de sucesso/erro da troca de estilo.
  const [mensagemDoEstilo, definirMensagemDoEstilo] = useState<string | null>(null);
  const [erroDoEstilo, definirErroDoEstilo] = useState<string | null>(null);
  // TEAM_004: modo de edição de "Meus dados", envio e feedback.
  const [editandoDados, definirEditandoDados] = useState(false);
  const [salvandoDados, definirSalvandoDados] = useState(false);
  const [mensagemDosDados, definirMensagemDosDados] = useState<string | null>(null);
  const [erroDosDados, definirErroDosDados] = useState<string | null>(null);
  // TEAM_004: campos do formulário de edição (espelham o perfil atual).
  const [sexoEdicao, definirSexoEdicao] = useState<Sexo>('masculino');
  const [faixaEdicao, definirFaixaEdicao] = useState('');
  const [alturaEdicao, definirAlturaEdicao] = useState('');
  const [objetivoEdicao, definirObjetivoEdicao] = useState<Objetivo>('emagrecimento');
  const [modalidadeEdicao, definirModalidadeEdicao] = useState<Modalidade>('academia');
  const [diasEdicao, definirDiasEdicao] = useState<string[]>([]);

  /** Carrega o plano atual e a evolução em paralelo (404 → onboarding; 401 → login). */
  const carregarDados = useCallback(async () => {
    definirCarregando(true);
    definirErro(null);
    try {
      // Busca os três recursos ao mesmo tempo (Promise.all).
      const [planoAtual, registros, opcoesRecebidas] = await Promise.all([
        buscarPlanoAtual(),
        listarEvolucao(),
        buscarOpcoes(),
      ]);
      definirPlano(planoAtual);
      definirEvolucao(registros);
      definirOpcoes(opcoesRecebidas);
      // Sincroniza o seletor com o estilo gravado no perfil.
      definirEstiloEscolhido(planoAtual.perfil.variacao_treino ?? 'padrao');
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
      definirErro('Erro inesperado ao carregar o perfil. Tente novamente.');
    } finally {
      definirCarregando(false);
    }
  }, [roteador]);

  // Dispara o carregamento ao montar a página.
  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  /** Registra a pesagem e recarrega o histórico de evolução. */
  async function salvarPesagem() {
    // Aceita vírgula ou ponto como separador decimal.
    const pesoNumerico = Number(pesoDigitado.replace(',', '.'));
    // Validação local com mensagem amigável.
    if (!Number.isFinite(pesoNumerico) || pesoNumerico <= 0) {
      definirMensagemDaPesagem({ tipo: 'erro', texto: 'Informe um peso válido maior que zero.' });
      return;
    }
    definirSalvandoPesagem(true);
    definirMensagemDaPesagem(null);
    try {
      // Registra a pesagem (a data vazia deixa a API usar o dia atual).
      await registrarPesagem(pesoNumerico, dataDaPesagem || undefined);
      // Recarrega o histórico para exibir a lista atualizada.
      const registros = await listarEvolucao();
      definirEvolucao(registros);
      // TEAM_001: a pesagem mais recente vira o "Peso" exibido em Meus dados.
      const conta = await buscarContaAtual();
      const perfilSincronizado = conta.perfil;
      if (perfilSincronizado) {
        definirPlano((atual) => (atual ? { ...atual, perfil: perfilSincronizado } : atual));
      }
      definirPesoDigitado('');
      definirMensagemDaPesagem({ tipo: 'sucesso', texto: 'Pesagem registrada! 🎉' });
    } catch (erroCapturado: unknown) {
      // Sessão inválida: limpa e volta ao login.
      if (erroCapturado instanceof ErroDaApi && erroCapturado.status === 401) {
        encerrarSessao();
        roteador.replace('/login');
        return;
      }
      definirMensagemDaPesagem({
        tipo: 'erro',
        texto: erroCapturado instanceof Error ? erroCapturado.message : 'Não foi possível registrar a pesagem.',
      });
    } finally {
      definirSalvandoPesagem(false);
    }
  }

  /** Recalcula os planos com a evolução mais recente (após confirmação). */
  async function recalcular() {
    definirRecalculando(true);
    definirMensagemDeRecalculo(null);
    definirErroDeRecalculo(null);
    try {
      // Motor aplica Mifflin-St Jeor novamente com os dados atualizados.
      const resultado = await recalcularPlanos();
      definirPlano({ perfil: resultado.perfil, treino: resultado.treino, dieta: resultado.dieta });
      definirMensagemDeRecalculo(`Plano renovado! Versão ${resultado.treino.versao}.`);
      definirConfirmandoRecalculo(false);
    } catch (erroCapturado: unknown) {
      // Sessão inválida: limpa e volta ao login.
      if (erroCapturado instanceof ErroDaApi && erroCapturado.status === 401) {
        encerrarSessao();
        roteador.replace('/login');
        return;
      }
      definirErroDeRecalculo(
        erroCapturado instanceof Error ? erroCapturado.message : 'Não foi possível recalcular o plano.',
      );
    } finally {
      definirRecalculando(false);
    }
  }

  /**
   * Troca o estilo de treino e regenera os planos na hora.
   * O estilo "padrao" é enviado como null (modelo clássico da combinação).
   */
  async function aplicarEstilo() {
    definirAplicandoEstilo(true);
    definirMensagemDoEstilo(null);
    definirErroDoEstilo(null);
    try {
      // Gera os planos já com o novo estilo escolhido.
      const resultado = await atualizarEstiloDeTreino(
        estiloEscolhido === 'padrao' ? null : estiloEscolhido,
      );
      // Atualiza a tela com os planos recém-gerados.
      definirPlano({ perfil: resultado.perfil, treino: resultado.treino, dieta: resultado.dieta });
      definirMensagemDoEstilo(
        `Estilo aplicado! Seu treino agora é "${resultado.treino.nome}" (versão ${resultado.treino.versao}).`,
      );
    } catch (erroCapturado: unknown) {
      // Sessão inválida: limpa e volta ao login.
      if (erroCapturado instanceof ErroDaApi && erroCapturado.status === 401) {
        encerrarSessao();
        roteador.replace('/login');
        return;
      }
      definirErroDoEstilo(
        erroCapturado instanceof Error ? erroCapturado.message : 'Não foi possível trocar o estilo.',
      );
    } finally {
      definirAplicandoEstilo(false);
    }
  }

  /** TEAM_004: abre a edição de "Meus dados" com os valores atuais do perfil. */
  function iniciarEdicaoDosDados() {
    if (!plano) {
      return;
    }
    definirSexoEdicao(plano.perfil.sexo);
    definirFaixaEdicao(plano.perfil.faixa_etaria);
    definirAlturaEdicao(String(plano.perfil.altura_cm));
    definirObjetivoEdicao(plano.perfil.objetivo);
    definirModalidadeEdicao(plano.perfil.modalidade);
    definirDiasEdicao([...plano.perfil.dias_disponiveis]);
    definirErroDosDados(null);
    definirEditandoDados(true);
  }

  /** TEAM_004: liga/desliga um dia da semana na edição (mesma regra do onboarding). */
  function alternarDiaEdicao(dia: string) {
    definirDiasEdicao((atuais) =>
      atuais.includes(dia) ? atuais.filter((item) => item !== dia) : [...atuais, dia],
    );
  }

  /**
   * TEAM_004: salva os dados editados via POST /perfil — a rota faz upsert
   * no perfil e REGENERA treino e dieta (objetivo/modalidade/dias mudam o
   * plano inteiro, não dá para manter a versão antiga).
   */
  async function salvarDadosDoPerfil() {
    if (!plano) {
      return;
    }
    // Validação local da altura (limites do onboarding: 100–250 cm).
    const alturaNumerica = Number(alturaEdicao);
    if (!Number.isFinite(alturaNumerica) || alturaNumerica < 100 || alturaNumerica > 250) {
      definirErroDosDados('Informe uma altura válida em cm.');
      return;
    }
    if (diasEdicao.length === 0) {
      definirErroDosDados('Selecione pelo menos um dia disponível para treinar.');
      return;
    }
    definirSalvandoDados(true);
    definirErroDosDados(null);
    definirMensagemDosDados(null);
    try {
      // Se a combinação mudou e o estilo atual não existe nela, volta ao
      // clássico — cada variação só vale para modalidade+objetivo+dias certos.
      const estiloValidoNaNovaCombinacao = opcoes?.variacoes_de_treino.some(
        (variacao) =>
          variacao.id === plano.perfil.variacao_treino &&
          variacao.modalidade === modalidadeEdicao &&
          variacao.objetivo === objetivoEdicao &&
          variacao.dias === diasEdicao.length,
      );
      const corpo: CorpoPerfil = {
        sexo: sexoEdicao,
        faixa_etaria: faixaEdicao,
        // O peso NÃO é editado aqui: ele segue o registro de pesagem para
        // não pular o histórico de evolução (POST /perfil não grava pesagem).
        peso_kg: plano.perfil.peso_kg,
        altura_cm: alturaNumerica,
        objetivo: objetivoEdicao,
        // A frequência enviada é a quantidade real de dias (mesma regra do onboarding).
        frequencia_semanal: diasEdicao.length,
        dias_disponiveis: diasEdicao,
        modalidade: modalidadeEdicao,
        nivel: plano.perfil.nivel,
        variacao_treino: estiloValidoNaNovaCombinacao ? plano.perfil.variacao_treino : null,
      };
      const resultado = await salvarPerfilEGerarPlanos(corpo);
      definirPlano({ perfil: resultado.perfil, treino: resultado.treino, dieta: resultado.dieta });
      // Sincroniza o seletor de estilo com o que restou na nova combinação.
      definirEstiloEscolhido(resultado.perfil.variacao_treino ?? 'padrao');
      definirEditandoDados(false);
      definirMensagemDosDados(`Dados atualizados! Novo plano gerado (versão ${resultado.treino.versao}).`);
    } catch (erroCapturado: unknown) {
      // Sessão inválida: limpa e volta ao login.
      if (erroCapturado instanceof ErroDaApi && erroCapturado.status === 401) {
        encerrarSessao();
        roteador.replace('/login');
        return;
      }
      definirErroDosDados(
        erroCapturado instanceof Error ? erroCapturado.message : 'Não foi possível salvar os dados.',
      );
    } finally {
      definirSalvandoDados(false);
    }
  }

  /** Encerra a sessão e redireciona para o login. */
  function sairDaConta() {
    encerrarSessao();
    roteador.replace('/login');
  }

  // Esqueleto de carregamento enquanto os dados chegam.
  if (carregando) {
    return (
      <div className="space-y-6">
        <Esqueleto className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Esqueleto className="h-72 w-full" />
          <Esqueleto className="h-72 w-full" />
        </div>
        <Esqueleto className="h-40 w-full" />
      </div>
    );
  }

  // Cartão de erro com botão para tentar novamente.
  if (erro) {
    return (
      <Cartao className="max-w-md">
        <CartaoCabecalho>
          <CartaoTitulo>Não foi possível carregar o perfil</CartaoTitulo>
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

  // Desestrutura o plano completo.
  const { perfil, dieta } = plano;

  // Últimas pesagens (mais recentes primeiro, máximo 5).
  const ultimasPesagens = [...evolucao].reverse().slice(0, 5);

  // Estilos de treino disponíveis para a combinação atual do usuário.
  const estilosDisponiveis = estilosDaCombinacao(opcoes, plano);
  // Estilo vigente no perfil (null = clássico) e o rótulo exibido.
  const estiloAtual = perfil.variacao_treino ?? 'padrao';
  const rotuloDoEstiloAtual =
    estilosDisponiveis.find((estilo) => estilo.id === estiloAtual)?.nome ?? 'Padrão';
  // Só habilita o botão quando o estilo escolhido muda de fato.
  const estiloMudou = estiloEscolhido !== estiloAtual;

  return (
    <div className="space-y-6">
      {/* Título da página. */}
      <section>
        <h1 className="font-display text-2xl font-bold text-foreground lg:text-3xl">Meu perfil</h1>
      </section>

      {/* Grade: meus dados + registrar pesagem. */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Seção: dados do perfil usado nos cálculos. */}
        <Cartao>
          <CartaoCabecalho>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CartaoTitulo>Meus dados</CartaoTitulo>
                <CartaoDescricao>Perfil usado no cálculo dos seus planos</CartaoDescricao>
              </div>
              {/* TEAM_004: atalho para editar os dados sem refazer o onboarding —
                  some enquanto as opções não chegaram ou durante a edição. */}
              {!editandoDados && opcoes ? (
                <Botao variante="contorno" tamanho="pequeno" onClick={iniciarEdicaoDosDados}>
                  <Pencil /> Editar
                </Botao>
              ) : null}
            </div>
          </CartaoCabecalho>
          <CartaoConteudo>
            {!editandoDados ? (
              <>
                {/* Selo do IMC com classificação no topo. */}
                <Selo variante="padrao" className="mb-3">
                  IMC {formatarDecimal(dieta.meta.imc)} — {dieta.meta.classificacao_imc}
                </Selo>
                {/* Lista de dados do perfil. */}
                <LinhaDeDado rotulo="Sexo" valor={perfil.sexo} />
                <LinhaDeDado rotulo="Faixa etária" valor={perfil.faixa_etaria} />
                <LinhaDeDado rotulo="Altura" valor={`${perfil.altura_cm} cm`} />
                <LinhaDeDado rotulo="Peso" valor={`${formatarDecimal(perfil.peso_kg)} kg`} />
                <LinhaDeDado rotulo="Objetivo" valor={rotuloDoObjetivo(perfil.objetivo)} />
                <LinhaDeDado rotulo="Modalidade" valor={rotuloDaModalidade(perfil.modalidade)} />
                <LinhaDeDado rotulo="Dias" valor={perfil.dias_disponiveis.map(rotuloDoDia).join(', ')} />
                <LinhaDeDado rotulo="Estilo do treino" valor={rotuloDoEstiloAtual} />
                {/* TEAM_004: confirmação exibida após salvar a edição. */}
                {mensagemDosDados ? (
                  <p className="pt-3 text-sm font-medium text-primary">{mensagemDosDados}</p>
                ) : null}
              </>
            ) : (
              /* TEAM_004: formulário de edição dos dados do perfil. */
              <div className="space-y-4">
                {/* Sexo: dois chips (mesmo padrão visual do onboarding). */}
                <div className="space-y-1.5">
                  <span className="text-sm font-medium">Sexo biológico</span>
                  <div className="flex flex-wrap gap-2">
                    {(['masculino', 'feminino'] as Sexo[]).map((valor) => (
                      <button
                        key={valor}
                        type="button"
                        aria-pressed={sexoEdicao === valor}
                        onClick={() => definirSexoEdicao(valor)}
                        className={combinarClasses(
                          'rounded-full border px-4 py-2 text-sm font-semibold capitalize transition-colors',
                          sexoEdicao === valor
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-card text-foreground hover:bg-secondary',
                        )}
                      >
                        {valor}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Faixa etária e altura lado a lado. */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Rotulo htmlFor="edicao-faixa">Faixa etária</Rotulo>
                    <MenuDeSelecao
                      id="edicao-faixa"
                      value={faixaEdicao}
                      onChange={(evento) => definirFaixaEdicao(evento.target.value)}
                    >
                      {opcoes?.faixas_etarias.map((faixa) => (
                        <option key={faixa.valor} value={faixa.valor}>
                          {faixa.rotulo}
                        </option>
                      ))}
                    </MenuDeSelecao>
                  </div>
                  <div className="space-y-1.5">
                    <Rotulo htmlFor="edicao-altura">Altura (cm)</Rotulo>
                    <CampoDeEntrada
                      id="edicao-altura"
                      type="number"
                      min={100}
                      max={250}
                      step={1}
                      value={alturaEdicao}
                      onChange={(evento) => definirAlturaEdicao(evento.target.value)}
                    />
                  </div>
                </div>
                {/* Objetivo e modalidade lado a lado. */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Rotulo htmlFor="edicao-objetivo">Objetivo</Rotulo>
                    <MenuDeSelecao
                      id="edicao-objetivo"
                      value={objetivoEdicao}
                      onChange={(evento) => definirObjetivoEdicao(evento.target.value as Objetivo)}
                    >
                      {opcoes?.objetivos.map((objetivo) => (
                        <option key={objetivo.valor} value={objetivo.valor}>
                          {objetivo.rotulo}
                        </option>
                      ))}
                    </MenuDeSelecao>
                  </div>
                  <div className="space-y-1.5">
                    <Rotulo htmlFor="edicao-modalidade">Modalidade</Rotulo>
                    <MenuDeSelecao
                      id="edicao-modalidade"
                      value={modalidadeEdicao}
                      onChange={(evento) => definirModalidadeEdicao(evento.target.value as Modalidade)}
                    >
                      {opcoes?.modalidades.map((modalidade) => (
                        <option key={modalidade.valor} value={modalidade.valor}>
                          {modalidade.rotulo}
                        </option>
                      ))}
                    </MenuDeSelecao>
                  </div>
                </div>
                {/* Dias disponíveis: chips de seleção múltipla. */}
                <div className="space-y-1.5">
                  <span className="text-sm font-medium">Dias disponíveis</span>
                  <div className="flex flex-wrap gap-2">
                    {opcoes?.dias_semana.map((dia) => {
                      const selecionado = diasEdicao.includes(dia.valor);
                      return (
                        <button
                          key={dia.valor}
                          type="button"
                          onClick={() => alternarDiaEdicao(dia.valor)}
                          aria-pressed={selecionado}
                          className={combinarClasses(
                            'rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                            selecionado
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-card text-foreground hover:bg-secondary',
                          )}
                        >
                          {rotuloDoDia(dia.valor)}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Aviso: salvar regenera os planos; o peso segue pela pesagem. */}
                <p className="text-xs text-muted-foreground">
                  Salvar gera um treino e uma dieta novos com esses dados — edições feitas nos
                  exercícios são substituídas. O peso continua sendo atualizado pelo registro de
                  pesagem.
                </p>
                {/* Ações: salvar (gera plano novo) ou cancelar a edição. */}
                <div className="flex flex-wrap items-center gap-3">
                  <Botao tamanho="pequeno" onClick={() => void salvarDadosDoPerfil()} disabled={salvandoDados}>
                    {salvandoDados ? <Loader2 className="animate-spin" /> : <Save />}
                    {salvandoDados ? ' Gerando novo plano...' : ' Salvar e gerar novo plano'}
                  </Botao>
                  <Botao
                    variante="fantasma"
                    tamanho="pequeno"
                    disabled={salvandoDados}
                    onClick={() => definirEditandoDados(false)}
                  >
                    Cancelar
                  </Botao>
                  {erroDosDados ? (
                    <span className="text-sm font-medium text-destructive">{erroDosDados}</span>
                  ) : null}
                </div>
              </div>
            )}
          </CartaoConteudo>
        </Cartao>

        {/* Seção: registrar pesagem + histórico recente. */}
        <Cartao>
          <CartaoCabecalho>
            <CartaoTitulo>Registrar pesagem</CartaoTitulo>
            <CartaoDescricao>Acompanhe sua evolução pesando-se regularmente</CartaoDescricao>
          </CartaoCabecalho>
          <CartaoConteudo className="space-y-4">
            {/* Formulário: peso e data. */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Rotulo htmlFor="peso">Peso (kg)</Rotulo>
                <CampoDeEntrada
                  id="peso"
                  type="number"
                  step={0.1}
                  min={0}
                  placeholder="Ex.: 72,5"
                  value={pesoDigitado}
                  onChange={(evento) => definirPesoDigitado(evento.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Rotulo htmlFor="data">Data</Rotulo>
                <CampoDeEntrada
                  id="data"
                  type="date"
                  value={dataDaPesagem}
                  onChange={(evento) => definirDataDaPesagem(evento.target.value)}
                />
              </div>
            </div>
            {/* Botão de envio + feedback de sucesso ou erro. */}
            <div className="flex flex-wrap items-center gap-3">
              <Botao onClick={() => void salvarPesagem()} disabled={salvandoPesagem}>
                {salvandoPesagem ? <Loader2 className="animate-spin" /> : <Plus />} Registrar pesagem
              </Botao>
              {mensagemDaPesagem?.tipo === 'sucesso' ? (
                <span className="text-sm font-medium text-primary">{mensagemDaPesagem.texto}</span>
              ) : null}
              {mensagemDaPesagem?.tipo === 'erro' ? (
                <span className="text-sm font-medium text-destructive">{mensagemDaPesagem.texto}</span>
              ) : null}
            </div>

            {/* Histórico das últimas pesagens com tendência vs anterior. */}
            <Separador className="my-4" />
            <p className="text-sm font-semibold text-foreground">Últimas pesagens</p>
            {ultimasPesagens.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma pesagem registrada ainda.</p>
            ) : (
              <ul className="space-y-2">
                {ultimasPesagens.map((registro, indice) => {
                  // Na lista invertida, o próximo item é a pesagem anterior no tempo.
                  const pesagemAnterior = ultimasPesagens[indice + 1];
                  // Variação em relação à pesagem anterior (null na mais antiga exibida).
                  const variacao = pesagemAnterior ? registro.peso_kg - pesagemAnterior.peso_kg : null;
                  return (
                    <li
                      key={registro.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-sm"
                    >
                      <span className="text-muted-foreground">{formatarData(registro.data)}</span>
                      <span className="flex items-center gap-1.5 font-semibold text-foreground">
                        {/* Queda de peso em verde, alta em âmbar. */}
                        {variacao !== null && variacao < 0 ? (
                          <TrendingDown className="size-4 text-primary" />
                        ) : null}
                        {variacao !== null && variacao > 0 ? (
                          <TrendingUp className="size-4 text-amber-600" />
                        ) : null}
                        {formatarDecimal(registro.peso_kg)} kg
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CartaoConteudo>
        </Cartao>
      </div>

      {/* Seção: trocar o estilo (variação) do treino e regenerar os planos. */}
      <Cartao>
        <CartaoCabecalho>
          <CartaoTitulo>Estilo de treino</CartaoTitulo>
          <CartaoDescricao>
            Cansou da mesma rotina? Troque o formato das sessões sem mudar o seu objetivo — o treino
            é regerado na hora.
          </CartaoDescricao>
        </CartaoCabecalho>
        <CartaoConteudo className="space-y-4">
          {/* Sem alternativa: apenas informa qual estilo está em uso. */}
          {estilosDisponiveis.length <= 1 ? (
            <p className="text-sm text-muted-foreground">
              Para a sua combinação de modalidade, objetivo e dias existe apenas o estilo{' '}
              <span className="font-semibold text-foreground">{rotuloDoEstiloAtual}</span>.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {estilosDisponiveis.map((estilo) => {
                  const escolhido = estiloEscolhido === estilo.id;
                  const emUso = estiloAtual === estilo.id;
                  return (
                    <button
                      key={estilo.id}
                      type="button"
                      onClick={() => definirEstiloEscolhido(estilo.id)}
                      aria-pressed={escolhido}
                      className={combinarClasses(
                        'flex flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition-colors',
                        escolhido
                          ? 'border-primary bg-secondary ring-2 ring-primary/30'
                          : 'border-border bg-card hover:border-primary/50 hover:bg-secondary/60',
                      )}
                    >
                      <span className="font-display text-sm font-bold">{estilo.nome}</span>
                      <span className="text-xs text-muted-foreground">
                        {estilo.duracao_estimada_min} min por sessão
                      </span>
                      {/* Marca o estilo que já está em uso agora. */}
                      {emUso ? (
                        <span className="text-xs font-semibold text-primary">Em uso</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              {/* Botão de aplicação + feedback da troca de estilo. */}
              <div className="flex flex-wrap items-center gap-3">
                <Botao onClick={() => void aplicarEstilo()} disabled={aplicandoEstilo || !estiloMudou}>
                  {aplicandoEstilo ? <Loader2 className="animate-spin" /> : <Sparkles />} Aplicar
                  estilo
                </Botao>
                {mensagemDoEstilo ? (
                  <span className="text-sm font-medium text-primary">{mensagemDoEstilo}</span>
                ) : null}
                {erroDoEstilo ? (
                  <span className="text-sm font-medium text-destructive">{erroDoEstilo}</span>
                ) : null}
              </div>
            </>
          )}
        </CartaoConteudo>
      </Cartao>

      {/* Seção em destaque: renovar plano com confirmação em duas etapas. */}
      <Cartao className="border-primary/50">
        <CartaoCabecalho>
          <CartaoTitulo>Sua evolução pede um plano novo?</CartaoTitulo>
          <CartaoDescricao>
            Recalcule treino e dieta com base na sua última pesagem — a fórmula Mifflin-St Jeor é
            aplicada de novo no seu corpo, sem achismo.
          </CartaoDescricao>
        </CartaoCabecalho>
        <CartaoConteudo className="space-y-3">
          {/* Texto de confirmação exibido após o primeiro clique. */}
          {confirmandoRecalculo ? (
            <p className="text-sm text-muted-foreground">
              Seus planos atuais serão substituídos por novos, calculados com a sua evolução mais
              recente. Deseja continuar?
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {confirmandoRecalculo ? (
              // Modo confirmação: botões "Sim" e "Cancelar".
              <>
                <Botao variante="gradiente" disabled={recalculando} onClick={() => void recalcular()}>
                  {recalculando ? <Loader2 className="animate-spin" /> : <RefreshCw />} Sim, recalcular
                </Botao>
                <Botao
                  variante="contorno"
                  disabled={recalculando}
                  onClick={() => definirConfirmandoRecalculo(false)}
                >
                  Cancelar
                </Botao>
              </>
            ) : (
              // Primeiro clique: entra no modo confirmação.
              <Botao variante="gradiente" onClick={() => definirConfirmandoRecalculo(true)}>
                <RefreshCw /> Recalcular meu plano
              </Botao>
            )}
            {/* Feedback de sucesso ou erro do recálculo. */}
            {mensagemDeRecalculo ? (
              <span className="text-sm font-medium text-primary">{mensagemDeRecalculo}</span>
            ) : null}
            {erroDeRecalculo ? (
              <span className="text-sm font-medium text-destructive">{erroDeRecalculo}</span>
            ) : null}
          </div>
        </CartaoConteudo>
      </Cartao>

      {/* TEAM_001: exportar/importar o progresso entre dispositivos. */}
      <CartaoPortabilidade />

      {/* Seção: sair da conta. */}
      <Cartao>
        <CartaoCabecalho>
          <CartaoTitulo>Sair da conta</CartaoTitulo>
          <CartaoDescricao>Encerra a sessão neste navegador</CartaoDescricao>
        </CartaoCabecalho>
        <CartaoConteudo>
          <Botao variante="destrutivo" onClick={sairDaConta}>
            <LogOut /> Sair da conta
          </Botao>
        </CartaoConteudo>
      </Cartao>
    </div>
  );
}
