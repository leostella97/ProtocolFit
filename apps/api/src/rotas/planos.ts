/**
 * planos.ts
 * ---------------------------------------------------------------------------
 * Rotas de leitura e edição dos planos CLONADOS do usuário:
 *  - GET   /atual                    → plano vigente (treino + dieta)
 *  - PATCH /treino/:planoId          → edita carga/séries/repetições
 *  - PATCH /dieta/:planoId/substituir → troca um alimento por substituto
 *
 * ISOLAMENTO DE DADOS: toda edição acontece exclusivamente na cópia gravada
 * no SQLite do usuário. Os arquivos JSON mestres em /modelos nunca recebem
 * escrita — permanecem protegidos e intactos.
 * ---------------------------------------------------------------------------
 */
import type { FastifyInstance } from 'fastify';
import {
  atualizarConteudoDoPlano,
  buscarPlanoAtivo,
  buscarPlanoPorId,
} from '../bd/banco.js';
import type { LinhaPlano } from '../bd/banco.js';
import {
  aplicarEdicaoTreino,
  aplicarSubstituicao,
  aplicarTrocaDeExercicio,
  type EdicaoDeExercicio,
  type TrocaDeExercicio,
} from '../motor/montadorPlano.js';
import { listarAlternativasDeExercicio, listarCatalogoDeExercicios } from '../motor/carregadorModelos.js';
import { buscarPerfilPorUsuario } from '../bd/banco.js';
import type { PlanoDieta, PlanoTreino } from '../tipos.js';
import { enviarErro, exigirAutenticacao, usuarioIdDaRequisicao } from '../util/respostas.js';

/** Interpreta o conteúdo JSON de uma linha de plano. */
function interpretarConteudo<T>(linha: LinhaPlano): T {
  return JSON.parse(linha.conteudo) as T;
}

/** Limites de edição de um exercício (séries, repetições e carga). */
const LIMITES_EDICAO = {
  series_min: 1,
  series_max: 10,
  repeticoes_min: 1,
  repeticoes_max: 50,
  carga_min_kg: 0,
  carga_max_kg: 400,
} as const;

/** Registra as rotas de planos (prefixo /api/plano). */
export async function rotasPlanos(app: FastifyInstance): Promise<void> {
  /** GET /api/plano/atual — plano vigente completo do usuário. */
  app.get('/atual', { onRequest: [exigirAutenticacao] }, async (requisicao, resposta) => {
    // Recupera o id do usuário autenticado.
    const usuarioId = usuarioIdDaRequisicao(requisicao);

    // Busca o perfil (necessário para o painel exibir os dados corporais).
    const perfil = buscarPerfilPorUsuario(usuarioId);
    if (!perfil) {
      return enviarErro(resposta, 404, 'Perfil não encontrado. Complete o onboarding primeiro.');
    }

    // Busca as cópias vigentes de treino e dieta no SQLite.
    const linhaTreino = buscarPlanoAtivo(usuarioId, 'treino');
    const linhaDieta = buscarPlanoAtivo(usuarioId, 'dieta');
    if (!linhaTreino || !linhaDieta) {
      return enviarErro(resposta, 404, 'Planos ainda não gerados. Atualize seu perfil para gerá-los.');
    }

    // Monta os planos com id, versão, vínculo e data de criação embutidos.
    const treino: PlanoTreino = {
      id: linhaTreino.id,
      versao: linhaTreino.versao,
      modelo_origem: linhaTreino.modelo_origem,
      criado_em: linhaTreino.criado_em,
      ...interpretarConteudo<Omit<PlanoTreino, 'id' | 'versao' | 'modelo_origem' | 'criado_em'>>(linhaTreino),
    };
    const dieta: PlanoDieta = {
      id: linhaDieta.id,
      versao: linhaDieta.versao,
      modelo_origem: linhaDieta.modelo_origem,
      criado_em: linhaDieta.criado_em,
      ...interpretarConteudo<Omit<PlanoDieta, 'id' | 'versao' | 'modelo_origem' | 'criado_em'>>(linhaDieta),
    };

    return resposta.send({ perfil, treino, dieta });
  });

  /** PATCH /api/plano/treino/:planoId — edita um exercício da cópia do usuário. */
  app.patch<{ Params: { planoId: string } }>('/treino/:planoId', { onRequest: [exigirAutenticacao] }, async (requisicao, resposta) => {
    // Recupera o id do usuário autenticado.
    const usuarioId = usuarioIdDaRequisicao(requisicao);

    // Converte o parâmetro da rota para número.
    const planoId = Number(requisicao.params.planoId);

    // Busca a cópia do plano no banco.
    const linha = buscarPlanoPorId(planoId);

    // Garante que o plano existe, pertence ao usuário e é do tipo treino.
    if (!linha || linha.usuario_id !== usuarioId || linha.tipo !== 'treino') {
      return enviarErro(resposta, 403, 'Você só pode editar o seu próprio plano de treino.');
    }

    // Interpreta a cópia e valida os campos de edição recebidos.
    const edicao = (requisicao.body ?? {}) as EdicaoDeExercicio;
    if (!Number.isInteger(edicao.dia_indice) || !Number.isInteger(edicao.exercicio_indice)) {
      return enviarErro(resposta, 400, 'Informe o dia e o exercício que deseja editar.');
    }
    if (edicao.series !== undefined && (edicao.series < LIMITES_EDICAO.series_min || edicao.series > LIMITES_EDICAO.series_max)) {
      return enviarErro(resposta, 400, `As séries devem ficar entre ${LIMITES_EDICAO.series_min} e ${LIMITES_EDICAO.series_max}.`);
    }
    if (edicao.repeticoes !== undefined && (edicao.repeticoes < LIMITES_EDICAO.repeticoes_min || edicao.repeticoes > LIMITES_EDICAO.repeticoes_max)) {
      return enviarErro(resposta, 400, `As repetições devem ficar entre ${LIMITES_EDICAO.repeticoes_min} e ${LIMITES_EDICAO.repeticoes_max}.`);
    }
    if (edicao.carga_kg !== undefined && edicao.carga_kg !== null && (edicao.carga_kg < LIMITES_EDICAO.carga_min_kg || edicao.carga_kg > LIMITES_EDICAO.carga_max_kg)) {
      return enviarErro(resposta, 400, `A carga deve ficar entre ${LIMITES_EDICAO.carga_min_kg} e ${LIMITES_EDICAO.carga_max_kg} kg.`);
    }

    // Aplica a edição na cópia do usuário (o mestre permanece intacto).
    const plano = interpretarConteudo<Omit<PlanoTreino, 'id' | 'versao' | 'modelo_origem' | 'criado_em'>>(linha);
    aplicarEdicaoTreino(plano, edicao);

    // Persiste a cópia atualizada no SQLite.
    atualizarConteudoDoPlano(planoId, JSON.stringify(plano));

    // Responde com o treino atualizado (id/versão/modelo/data sobrescrevem o conteúdo).
    return resposta.send({ ...plano, id: planoId, versao: linha.versao, modelo_origem: linha.modelo_origem, criado_em: linha.criado_em });
  });

  /** GET /api/plano/treino/:planoId/alternativas — exercícios do mesmo grupo para a posição. */
  app.get<{
    Params: { planoId: string };
    Querystring: { dia_indice?: string; exercicio_indice?: string };
  }>('/treino/:planoId/alternativas', { onRequest: [exigirAutenticacao] }, async (requisicao, resposta) => {
    // Recupera o id do usuário autenticado.
    const usuarioId = usuarioIdDaRequisicao(requisicao);

    // Converte o parâmetro da rota para número.
    const planoId = Number(requisicao.params.planoId);

    // Busca a cópia do plano no banco.
    const linha = buscarPlanoPorId(planoId);

    // Garante que o plano existe, pertence ao usuário e é do tipo treino.
    if (!linha || linha.usuario_id !== usuarioId || linha.tipo !== 'treino') {
      return enviarErro(resposta, 403, 'Você só pode consultar o seu próprio plano de treino.');
    }

    // Valida os índices recebidos na query.
    const diaIndice = Number(requisicao.query.dia_indice);
    const exercicioIndice = Number(requisicao.query.exercicio_indice);
    if (!Number.isInteger(diaIndice) || !Number.isInteger(exercicioIndice)) {
      return enviarErro(resposta, 400, 'Informe o dia e o exercício que deseja consultar.');
    }

    // Localiza o exercício na cópia para descobrir o grupo muscular dele.
    const plano = interpretarConteudo<Omit<PlanoTreino, 'id' | 'versao' | 'modelo_origem' | 'criado_em'>>(linha);
    const dia = plano.dias_da_semana[diaIndice];
    const exercicio = dia?.exercicios[exercicioIndice];
    if (!dia || !exercicio) {
      return enviarErro(resposta, 404, 'Exercício não encontrado no plano.');
    }

    // TEAM_003: alternativas do mesmo grupo na modalidade do plano; os nomes
    // já usados no dia ficam fora para não repetir exercício na sessão.
    const nomesDoDia = dia.exercicios.map((item) => item.nome);
    const alternativas = listarAlternativasDeExercicio(plano.modalidade, exercicio.grupo, nomesDoDia).map(
      (alternativa) => ({ nome: alternativa.nome, tipo: alternativa.tipo }),
    );
    return resposta.send({ alternativas });
  });

  /** PATCH /api/plano/treino/:planoId/trocar — troca um exercício por outro do mesmo grupo. */
  app.patch<{ Params: { planoId: string } }>('/treino/:planoId/trocar', { onRequest: [exigirAutenticacao] }, async (requisicao, resposta) => {
    // Recupera o id do usuário autenticado.
    const usuarioId = usuarioIdDaRequisicao(requisicao);

    // Converte o parâmetro da rota para número.
    const planoId = Number(requisicao.params.planoId);

    // Busca a cópia do plano no banco.
    const linha = buscarPlanoPorId(planoId);

    // Garante que o plano existe, pertence ao usuário e é do tipo treino.
    if (!linha || linha.usuario_id !== usuarioId || linha.tipo !== 'treino') {
      return enviarErro(resposta, 403, 'Você só pode editar o seu próprio plano de treino.');
    }

    // Valida os índices e o nome da alternativa recebidos.
    const corpo = (requisicao.body ?? {}) as TrocaDeExercicio;
    if (!Number.isInteger(corpo.dia_indice) || !Number.isInteger(corpo.exercicio_indice) || !corpo.exercicio_nome) {
      return enviarErro(resposta, 400, 'Informe o dia, o exercício e a alternativa desejada.');
    }

    // O peso do perfil recalcula a carga sugerida do novo exercício.
    const perfil = buscarPerfilPorUsuario(usuarioId);
    if (!perfil) {
      return enviarErro(resposta, 404, 'Perfil não encontrado. Complete o onboarding primeiro.');
    }

    // Aplica a troca na cópia do usuário (o mestre permanece intacto) —
    // a validação de "mesmo grupo" acontece dentro do motor.
    const plano = interpretarConteudo<Omit<PlanoTreino, 'id' | 'versao' | 'modelo_origem' | 'criado_em'>>(linha);
    try {
      aplicarTrocaDeExercicio(plano, corpo, listarCatalogoDeExercicios(plano.modalidade), perfil.peso_kg);
    } catch (erro) {
      return enviarErro(resposta, 400, erro instanceof Error ? erro.message : 'Não foi possível trocar o exercício.');
    }

    // Persiste a cópia atualizada no SQLite.
    atualizarConteudoDoPlano(planoId, JSON.stringify(plano));

    // Responde com o treino atualizado (id/versão/modelo/data sobrescrevem o conteúdo).
    return resposta.send({ ...plano, id: planoId, versao: linha.versao, modelo_origem: linha.modelo_origem, criado_em: linha.criado_em });
  });

  /** PATCH /api/plano/dieta/:planoId/substituir — troca um alimento por substituto. */
  app.patch<{ Params: { planoId: string } }>('/dieta/:planoId/substituir', { onRequest: [exigirAutenticacao] }, async (requisicao, resposta) => {
    // Recupera o id do usuário autenticado.
    const usuarioId = usuarioIdDaRequisicao(requisicao);

    // Converte o parâmetro da rota para número.
    const planoId = Number(requisicao.params.planoId);

    // Busca a cópia do plano no banco.
    const linha = buscarPlanoPorId(planoId);

    // Garante que o plano existe, pertence ao usuário e é do tipo dieta.
    if (!linha || linha.usuario_id !== usuarioId || linha.tipo !== 'dieta') {
      return enviarErro(resposta, 403, 'Você só pode editar o seu próprio plano de dieta.');
    }

    // Valida os índices e o nome do substituto recebidos.
    const corpo = (requisicao.body ?? {}) as { refeicao_indice?: number; item_indice?: number; alternativa_nome?: string };
    if (!Number.isInteger(corpo.refeicao_indice) || !Number.isInteger(corpo.item_indice) || !corpo.alternativa_nome) {
      return enviarErro(resposta, 400, 'Informe a refeição, o alimento e o substituto desejado.');
    }

    // Aplica a substituição na cópia do usuário com recálculo da porção.
    const plano = interpretarConteudo<Omit<PlanoDieta, 'id' | 'versao' | 'modelo_origem' | 'criado_em'>>(linha);
    aplicarSubstituicao(plano, corpo.refeicao_indice as number, corpo.item_indice as number, corpo.alternativa_nome);

    // Persiste a cópia atualizada no SQLite.
    atualizarConteudoDoPlano(planoId, JSON.stringify(plano));

    // Responde com a dieta atualizada (id/versão/modelo/data sobrescrevem o conteúdo).
    return resposta.send({ ...plano, id: planoId, versao: linha.versao, modelo_origem: linha.modelo_origem, criado_em: linha.criado_em });
  });
}
