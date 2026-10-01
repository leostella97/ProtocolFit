/**
 * perfil.ts
 * ---------------------------------------------------------------------------
 * Rotas de perfil do usuário:
 *  - POST   /            → salva o perfil (onboarding) e GERA os planos
 *  - PATCH  /corpo       → altera peso/altura (sem regenerar)
 *  - PATCH  /treino      → troca o estilo de treino e regenera os planos
 *  - POST   /recalcular  → regenera os planos com base na evolução física
 *
 * O recálculo usa o peso mais recente registrado na evolução (se existir)
 * para ajustar a matemática do plano — a base das "renovações periódicas".
 * ---------------------------------------------------------------------------
 */
import type { FastifyInstance } from 'fastify';
import {
  atualizarCorpoDoPerfil,
  buscarPerfilPorUsuario,
  buscarUltimaEvolucao,
  executarEmTransacao,
  salvarPerfil,
  salvarPesagemDoDia,
} from '../bd/banco.js';
import { gerarPlanosParaPerfil } from '../servicos/geradorDePlanos.js';
import { listarVariacoesDeTreino } from '../motor/carregadorModelos.js';
import type { Modalidade, Nivel, Objetivo, Perfil, Sexo } from '../tipos.js';
import {
  DIAS_DA_SEMANA,
  FAIXAS_ETARIAS,
  LIMITES_CORPO,
  MODALIDADES,
  NIVEIS,
  OBJETIVOS,
} from '../util/constantes.js';
// TEAM_007: validação de datas civis centralizada (formato + regra de futuro).
import { dataNoFuturo, dataValida, hojeEmTexto } from '../util/datas.js';
import { enviarErro, exigirAutenticacao, usuarioIdDaRequisicao } from '../util/respostas.js';

/** Corpo enviado pelo onboarding para criar/atualizar o perfil. */
interface CorpoPerfil {
  sexo?: Sexo;
  faixa_etaria?: string;
  peso_kg?: number;
  altura_cm?: number;
  objetivo?: Objetivo;
  frequencia_semanal?: number;
  dias_disponiveis?: string[];
  modalidade?: Modalidade;
  nivel?: Nivel;
  variacao_treino?: string | null;
}

/** Formato aceito para o identificador de estilo de treino (slug). */
const FORMATO_DO_ESTILO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Valida o identificador do estilo de treino.
 * O estilo precisa existir entre as variações disponíveis em /modelos — assim
 * o perfil nunca aponta para um arquivo inexistente.
 */
function estiloInvalido(variacao: string | null | undefined): string | null {
  // null/undefined = estilo padrão (sempre válido).
  if (variacao === null || variacao === undefined) {
    return null;
  }
  // Aceita apenas o slug em minúsculas com hífens.
  if (typeof variacao !== 'string' || variacao.length > 40 || !FORMATO_DO_ESTILO.test(variacao)) {
    return 'Estilo de treino inválido.';
  }
  // "padrao" é o identificador interno do estilo clássico.
  if (variacao === 'padrao') {
    return null;
  }
  // Confere se o estilo existe na pasta de modelos mestres.
  const existe = listarVariacoesDeTreino().some((disponivel) => disponivel.id === variacao);
  if (!existe) {
    return 'Estilo de treino indisponível.';
  }
  return null;
}

/**
 * Valida o corpo do perfil e devolve uma mensagem de erro (ou null se ok).
 * Toda validação acontece no servidor — o frontend é apenas conveniência.
 */
function validarCorpoPerfil(corpo: CorpoPerfil): string | null {
  // Valida o sexo biológico.
  if (corpo.sexo !== 'masculino' && corpo.sexo !== 'feminino') {
    return 'Selecione o sexo: masculino ou feminino.';
  }
  // Valida a faixa etária contra a lista oficial do sistema.
  if (!corpo.faixa_etaria || !FAIXAS_ETARIAS.some((faixa) => faixa.valor === corpo.faixa_etaria)) {
    return 'Selecione uma faixa etária válida.';
  }
  // Valida o peso dentro dos limites aceitos (aceita decimais).
  if (typeof corpo.peso_kg !== 'number' || corpo.peso_kg < LIMITES_CORPO.peso_minimo_kg || corpo.peso_kg > LIMITES_CORPO.peso_maximo_kg) {
    return `Informe um peso entre ${LIMITES_CORPO.peso_minimo_kg} e ${LIMITES_CORPO.peso_maximo_kg} kg.`;
  }
  // Valida a altura dentro dos limites aceitos.
  if (typeof corpo.altura_cm !== 'number' || corpo.altura_cm < LIMITES_CORPO.altura_minima_cm || corpo.altura_cm > LIMITES_CORPO.altura_maxima_cm) {
    return `Informe uma altura entre ${LIMITES_CORPO.altura_minima_cm} e ${LIMITES_CORPO.altura_maxima_cm} cm.`;
  }
  // Valida o objetivo contra a lista oficial.
  if (!corpo.objetivo || !OBJETIVOS.some((objetivo) => objetivo.valor === corpo.objetivo)) {
    return 'Selecione um objetivo válido.';
  }
  // Valida a frequência semanal (1 a 7 sessões).
  if (typeof corpo.frequencia_semanal !== 'number' || corpo.frequencia_semanal < 1 || corpo.frequencia_semanal > 7) {
    return 'Informe a frequência semanal de treino (1 a 7 dias).';
  }
  // Valida a lista de dias disponíveis (não pode ser vazia).
  if (!Array.isArray(corpo.dias_disponiveis) || corpo.dias_disponiveis.length === 0) {
    return 'Selecione pelo menos um dia disponível para treinar.';
  }
  // TEAM_007: dias repetidos inflariam a contagem — o plano usaria mais dias
  // de treino do que o usuário realmente escolheu.
  if (new Set(corpo.dias_disponiveis).size !== corpo.dias_disponiveis.length) {
    return 'Há dias repetidos na seleção.';
  }
  // Valida cada dia contra a lista oficial da semana.
  const valoresValidos = new Set(DIAS_DA_SEMANA.map((dia) => dia.valor));
  if (corpo.dias_disponiveis.some((dia) => !valoresValidos.has(dia))) {
    return 'Há um dia da semana inválido na seleção.';
  }
  // Valida a modalidade contra a lista oficial.
  if (!corpo.modalidade || !MODALIDADES.some((modalidade) => modalidade.valor === corpo.modalidade)) {
    return 'Selecione uma modalidade válida.';
  }
  // Valida o nível de experiência (opcional, padrão: iniciante).
  if (corpo.nivel && !NIVEIS.includes(corpo.nivel)) {
    return 'Nível de experiência inválido.';
  }
  // Valida o estilo de treino escolhido (opcional, padrão: clássico).
  const erroDoEstilo = estiloInvalido(corpo.variacao_treino);
  if (erroDoEstilo) {
    return erroDoEstilo;
  }
  return null;
}

/** Registra as rotas de perfil (prefixo /api/perfil). */
export async function rotasPerfil(app: FastifyInstance): Promise<void> {
  /** POST /api/perfil — salva o perfil e gera os planos personalizados. */
  app.post('/', { onRequest: [exigirAutenticacao] }, async (requisicao, resposta) => {
    // Recupera o id do usuário autenticado.
    const usuarioId = usuarioIdDaRequisicao(requisicao);

    // Valida o corpo recebido antes de qualquer processamento.
    const corpo = (requisicao.body ?? {}) as CorpoPerfil;
    const erroDeValidacao = validarCorpoPerfil(corpo);
    if (erroDeValidacao) {
      return enviarErro(resposta, 400, erroDeValidacao);
    }

    // TEAM_007: gravação do perfil + geração dos planos em UMA transação —
    // antes, uma falha na geração deixava o perfil salvo sem plano ativo.
    const { perfil, treino, dieta } = executarEmTransacao(() => {
      // Grava (ou atualiza) o perfil no SQLite.
      const perfilSalvo: Perfil = salvarPerfil(usuarioId, {
        sexo: corpo.sexo as Sexo,
        faixa_etaria: corpo.faixa_etaria as string,
        peso_kg: corpo.peso_kg as number,
        altura_cm: corpo.altura_cm as number,
        objetivo: corpo.objetivo as Objetivo,
        frequencia_semanal: corpo.frequencia_semanal as number,
        dias_disponiveis: corpo.dias_disponiveis as string[],
        modalidade: corpo.modalidade as Modalidade,
        nivel: (corpo.nivel as Nivel | undefined) ?? 'iniciante',
        // Estilo clássico quando o onboarding não escolhe um estilo nomeado.
        variacao_treino: corpo.variacao_treino ?? null,
      });

      // Gera e clona os planos (treino + dieta) para a tabela do usuário.
      const planos = gerarPlanosParaPerfil(usuarioId, perfilSalvo);
      return { perfil: perfilSalvo, ...planos };
    });

    // Responde com perfil e planos recém-gerados.
    return resposta.code(201).send({ perfil, treino, dieta });
  });

  /**
   * PATCH /api/perfil/corpo — altera APENAS peso e/ou altura do usuário.
   * Não regenera os planos (isso é feito por /recalcular, de propósito):
   * o usuário pode corrigir os dados do corpo sem perder as edições do plano.
   */
  app.patch('/corpo', { onRequest: [exigirAutenticacao] }, async (requisicao, resposta) => {
    // Recupera o id do usuário autenticado.
    const usuarioId = usuarioIdDaRequisicao(requisicao);
    // TEAM_001: `data` opcional = dia civil do cliente (o padrão UTC do
    // servidor gravaria a pesagem "amanhã" para quem usa o app à noite no Brasil).
    const corpo = (requisicao.body ?? {}) as { peso_kg?: number; altura_cm?: number; data?: string };

    // Garante que o perfil existe antes de alterar.
    const perfilAtual = buscarPerfilPorUsuario(usuarioId);
    if (!perfilAtual) {
      return enviarErro(resposta, 404, 'Perfil não encontrado. Complete o onboarding primeiro.');
    }

    // Pelo menos um dos campos precisa ser informado.
    if (corpo.peso_kg === undefined && corpo.altura_cm === undefined) {
      return enviarErro(resposta, 400, 'Informe o novo peso e/ou a nova altura.');
    }

    // Valida o peso dentro dos limites aceitos.
    if (corpo.peso_kg !== undefined) {
      if (
        typeof corpo.peso_kg !== 'number' ||
        corpo.peso_kg < LIMITES_CORPO.peso_minimo_kg ||
        corpo.peso_kg > LIMITES_CORPO.peso_maximo_kg
      ) {
        return enviarErro(resposta, 400, `Informe um peso entre ${LIMITES_CORPO.peso_minimo_kg} e ${LIMITES_CORPO.peso_maximo_kg} kg.`);
      }
    }

    // Valida a altura dentro dos limites aceitos.
    if (corpo.altura_cm !== undefined) {
      if (
        typeof corpo.altura_cm !== 'number' ||
        corpo.altura_cm < LIMITES_CORPO.altura_minima_cm ||
        corpo.altura_cm > LIMITES_CORPO.altura_maxima_cm
      ) {
        return enviarErro(resposta, 400, `Informe uma altura entre ${LIMITES_CORPO.altura_minima_cm} e ${LIMITES_CORPO.altura_maxima_cm} cm.`);
      }
    }

    // TEAM_007: `data` informada com formato inválido agora gera 400 — antes
    // era ignorada em silêncio e a pesagem ia para "hoje" sem aviso.
    if (corpo.data !== undefined) {
      if (!dataValida(corpo.data)) {
        return enviarErro(resposta, 400, 'Informe uma data válida no formato AAAA-MM-DD.');
      }
      if (dataNoFuturo(corpo.data)) {
        return enviarErro(resposta, 400, 'Não é possível registrar pesagem em uma data futura.');
      }
    }

    // TEAM_007: atualização do perfil + pesagem do dia em UMA transação.
    const perfilAtualizado = executarEmTransacao(() => {
      // Atualiza somente os campos enviados no perfil.
      const atualizado = atualizarCorpoDoPerfil(usuarioId, {
        ...(corpo.peso_kg !== undefined ? { peso_kg: corpo.peso_kg } : {}),
        ...(corpo.altura_cm !== undefined ? { altura_cm: corpo.altura_cm } : {}),
      });

      // Quando o peso muda, registra a pesagem do dia (alimenta o gráfico).
      if (corpo.peso_kg !== undefined) {
        salvarPesagemDoDia(usuarioId, corpo.data ?? hojeEmTexto(), corpo.peso_kg);
      }
      return atualizado;
    });

    // Responde com o perfil já atualizado.
    return resposta.send({ perfil: perfilAtualizado, mensagem: 'Dados atualizados. Use "Recalcular" para renovar o plano.' });
  });

  /**
   * PATCH /api/perfil/treino — troca o ESTILO de treino e regenera os planos.
   * É o caminho usado pelo seletor "Estilo de treino" da tela de perfil: o
   * usuário escolhe outro modelo (ex.: Força Máxima) e recebe um plano novo.
   */
  app.patch('/treino', { onRequest: [exigirAutenticacao] }, async (requisicao, resposta) => {
    // Recupera o id do usuário autenticado.
    const usuarioId = usuarioIdDaRequisicao(requisicao);
    const corpo = (requisicao.body ?? {}) as { variacao_treino?: string | null };

    // O campo é obrigatório (null limpa o estilo e volta ao clássico).
    if (!('variacao_treino' in corpo)) {
      return enviarErro(resposta, 400, 'Informe o estilo de treino desejado.');
    }

    // Garante que o perfil existe antes de alterar.
    const perfilAtual = buscarPerfilPorUsuario(usuarioId);
    if (!perfilAtual) {
      return enviarErro(resposta, 404, 'Perfil não encontrado. Complete o onboarding primeiro.');
    }

    // Valida o estilo pedido contra a pasta de modelos mestres.
    const erroDoEstilo = estiloInvalido(corpo.variacao_treino);
    if (erroDoEstilo) {
      return enviarErro(resposta, 400, erroDoEstilo);
    }

    // TEAM_007: troca do estilo + regeneração dos planos em UMA transação.
    const { perfilAtualizado, treino, dieta } = executarEmTransacao(() => {
      // Grava o novo estilo no perfil (mantendo todos os outros dados).
      const estiloNormalizado =
        corpo.variacao_treino === undefined || corpo.variacao_treino === 'padrao'
          ? null
          : corpo.variacao_treino;
      const perfilComEstilo = salvarPerfil(usuarioId, {
        ...perfilAtual,
        variacao_treino: estiloNormalizado,
      });

      // Regenera os planos já com o novo estilo (nova versão, antigas inativas).
      const planos = gerarPlanosParaPerfil(usuarioId, perfilComEstilo);
      return { perfilAtualizado: perfilComEstilo, ...planos };
    });

    // Responde com o perfil e os planos atualizados.
    return resposta.send({ perfil: perfilAtualizado, treino, dieta });
  });

  /** POST /api/perfil/recalcular — renova os planos pela evolução física. */
  app.post('/recalcular', { onRequest: [exigirAutenticacao] }, async (requisicao, resposta) => {
    // Recupera o id do usuário autenticado.
    const usuarioId = usuarioIdDaRequisicao(requisicao);

    // Busca o perfil atual do usuário.
    const perfil = buscarPerfilPorUsuario(usuarioId);
    if (!perfil) {
      return enviarErro(resposta, 404, 'Perfil não encontrado. Complete o onboarding primeiro.');
    }

    // TEAM_007: atualização do peso + regeneração dos planos em UMA transação.
    const { perfilAtualizado, treino, dieta } = executarEmTransacao(() => {
      // Usa o peso mais recente da evolução (base da renovação periódica).
      const ultimaPesagem = buscarUltimaEvolucao(usuarioId);
      const pesoAtualizado = ultimaPesagem ? ultimaPesagem.peso_kg : perfil.peso_kg;

      // Atualiza o peso do perfil com o valor mais recente antes de recalcular.
      const perfilComPeso = salvarPerfil(usuarioId, { ...perfil, peso_kg: pesoAtualizado });

      // Regenera os planos com a nova versão (cópias antigas ficam inativas).
      const planos = gerarPlanosParaPerfil(usuarioId, perfilComPeso);
      return { perfilAtualizado: perfilComPeso, ...planos };
    });

    // Responde com o perfil atualizado e os novos planos.
    return resposta.send({ perfil: perfilAtualizado, treino, dieta });
  });
}
