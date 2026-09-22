/**
 * page.tsx — Perfil do painel
 * ---------------------------------------------------------------------------
 * Exibe os dados do perfil, permite registrar pesagens (registrarPesagem)
 * com histórico comparado, recalcular os planos (recalcularPlanos) com
 * confirmação, e encerrar a sessão. Carrega plano + evolução em paralelo.
 * ---------------------------------------------------------------------------
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut, Plus, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
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
import {
  buscarPlanoAtual,
  listarEvolucao,
  recalcularPlanos,
  registrarPesagem,
  ErroDaApi,
} from '@/lib/api';
import { encerrarSessao } from '@/lib/armazenamento';
import { formatarData, formatarDecimal, rotuloDaModalidade, rotuloDoDia, rotuloDoObjetivo } from '@/lib/util';
import type { PlanoCompleto, RegistroEvolucao } from '@/lib/tipos';

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

/** Linha de um dado do perfil (rótulo + valor). */
function LinhaDeDado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
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

  /** Carrega o plano atual e a evolução em paralelo (404 → onboarding; 401 → login). */
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
            <CartaoTitulo>Meus dados</CartaoTitulo>
            <CartaoDescricao>Perfil usado no cálculo dos seus planos</CartaoDescricao>
          </CartaoCabecalho>
          <CartaoConteudo>
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
