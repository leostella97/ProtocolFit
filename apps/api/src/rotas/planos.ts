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
import { musculoAlvoDoExercicio } from '../motor/musculoAlvo.js';
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
  /**
   * TEAM_008: no cardio o campo "repetições" carrega TEMPO (minutos do alvo
   * contínuo ou segundos por tiro) — valores como "45 min" ou "90 s" iam
   * além do teto de 50 repetições de musculação.
   */
  tempo_cardio_max: 600,
  distancia_min_km: 0,
  distancia_max_km: 500,
} as const;

/**
 * TEAM_007: converte o parâmetro de rota para o id do plano — devolve null
 * para valores que não são inteiro positivo ("abc", "1.5", "0", "-3"), que
 * antes chegavam ao SQLite como NaN e explodiam em erro 500.
 */
function interpretarPlanoId(bruto: string): number | null {
  const planoId = Number(bruto);
  return Number.isInteger(planoId) && planoId > 0 ? planoId : null;
}

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

    // TEAM_007: valida o id da rota antes de tocar no banco (NaN → 403).
    const planoId = interpretarPlanoId(requisicao.params.planoId);
    if (planoId === null) {
      return enviarErro(resposta, 403, 'Você só pode editar o seu próprio plano de treino.');
    }

    // Busca a cópia do plano no banco.
    const linha = buscarPlanoPorId(planoId);

    // Garante que o plano existe, pertence ao usuário e é do tipo treino.
    if (!linha || linha.usuario_id !== usuarioId || linha.tipo !== 'treino') {
      return enviarErro(resposta, 403, 'Você só pode editar o seu próprio plano de treino.');
    }

    // Interpreta a cópia e valida os campos de edição recebidos.
    const edicao = (requisicao.body ?? {}) as EdicaoDeExercicio;
    // TEAM_007: os índices precisam ser inteiros NÃO negativos — "-1" passava
    // no isInteger e estourava num erro 500 dentro do motor.
    if (
      !Number.isInteger(edicao.dia_indice) || (edicao.dia_indice as number) < 0 ||
      !Number.isInteger(edicao.exercicio_indice) || (edicao.exercicio_indice as number) < 0
    ) {
      return enviarErro(resposta, 400, 'Informe o dia e o exercício que deseja editar.');
    }
    // TEAM_007: séries/repetições exigem INTEIRO e a carga exige NÚMERO —
    // antes "abc"/NaN escapavam das comparações de intervalo (NaN < x é falso)
    // e eram gravados direto na cópia do usuário.
    // A edição precisa conhecer o exercício ANTES de validar: no cardio o
    // campo numérico é tempo (teto maior) e existe a meta de distância.
    const plano = interpretarConteudo<Omit<PlanoTreino, 'id' | 'versao' | 'modelo_origem' | 'criado_em'>>(linha);
    const exercicioEditado = plano.dias_da_semana[edicao.dia_indice]?.exercicios[edicao.exercicio_indice];
    if (!exercicioEditado) {
      return enviarErro(resposta, 400, 'Dia ou exercício não encontrado no plano.');
    }
    const tetoNumerico = exercicioEditado.grupo === 'cardio' ? LIMITES_EDICAO.tempo_cardio_max : LIMITES_EDICAO.repeticoes_max;
    if (
      edicao.series !== undefined &&
      (!Number.isInteger(edicao.series) || edicao.series < LIMITES_EDICAO.series_min || edicao.series > LIMITES_EDICAO.series_max)
    ) {
      return enviarErro(resposta, 400, `As séries devem ficar entre ${LIMITES_EDICAO.series_min} e ${LIMITES_EDICAO.series_max}.`);
    }
    if (
      edicao.repeticoes !== undefined &&
      (!Number.isInteger(edicao.repeticoes) || edicao.repeticoes < LIMITES_EDICAO.repeticoes_min || edicao.repeticoes > tetoNumerico)
    ) {
      return enviarErro(
        resposta,
        400,
        exercicioEditado.grupo === 'cardio'
          ? `O tempo deve ficar entre ${LIMITES_EDICAO.repeticoes_min} e ${LIMITES_EDICAO.tempo_cardio_max}.`
          : `As repetições devem ficar entre ${LIMITES_EDICAO.repeticoes_min} e ${LIMITES_EDICAO.repeticoes_max}.`,
      );
    }
    if (
      edicao.carga_kg !== undefined &&
      edicao.carga_kg !== null &&
      (typeof edicao.carga_kg !== 'number' || !Number.isFinite(edicao.carga_kg) ||
        edicao.carga_kg < LIMITES_EDICAO.carga_min_kg || edicao.carga_kg > LIMITES_EDICAO.carga_max_kg)
    ) {
      return enviarErro(resposta, 400, `A carga deve ficar entre ${LIMITES_EDICAO.carga_min_kg} e ${LIMITES_EDICAO.carga_max_kg} kg.`);
    }
    // TEAM_008: a distância é opcional — número finito no intervalo, ou null
    // para remover a meta de km do exercício de cardio.
    if (
      edicao.distancia_km !== undefined &&
      edicao.distancia_km !== null &&
      (typeof edicao.distancia_km !== 'number' || !Number.isFinite(edicao.distancia_km) ||
        edicao.distancia_km <= LIMITES_EDICAO.distancia_min_km || edicao.distancia_km > LIMITES_EDICAO.distancia_max_km)
    ) {
      return enviarErro(resposta, 400, `A distância deve ficar entre 0 e ${LIMITES_EDICAO.distancia_max_km} km.`);
    }
    try {
      aplicarEdicaoTreino(plano, edicao);
    } catch (erro) {
      // Índice fora da grade do plano (ex.: dia 9 num plano de 3 dias).
      return enviarErro(resposta, 400, erro instanceof Error ? erro.message : 'Não foi possível editar o exercício.');
    }

    // Persiste a cópia atualizada no SQLite.
    atualizarConteudoDoPlano(planoId, JSON.stringify(plano));

    // Responde com o treino atualizado (id/versão/modelo/data sobrescrevem o conteúdo).
    return resposta.send({ ...plano, id: planoId, versao: linha.versao, modelo_origem: linha.modelo_origem, criado_em: linha.criado_em });
  });

  /**
   * GET /api/plano/treino/:planoId/alternativas?dia_indice=N
   * TEAM_007: devolve as alternativas de TODOS os exercícios do dia em uma
   * única chamada — antes a página fazia uma requisição por exercício (N+1).
   */
  app.get<{
    Params: { planoId: string };
    Querystring: { dia_indice?: string };
  }>('/treino/:planoId/alternativas', { onRequest: [exigirAutenticacao] }, async (requisicao, resposta) => {
    // Recupera o id do usuário autenticado.
    const usuarioId = usuarioIdDaRequisicao(requisicao);

    // TEAM_007: valida o id da rota antes de tocar no banco (NaN → 403).
    const planoId = interpretarPlanoId(requisicao.params.planoId);
    if (planoId === null) {
      return enviarErro(resposta, 403, 'Você só pode consultar o seu próprio plano de treino.');
    }

    // Busca a cópia do plano no banco.
    const linha = buscarPlanoPorId(planoId);

    // Garante que o plano existe, pertence ao usuário e é do tipo treino.
    if (!linha || linha.usuario_id !== usuarioId || linha.tipo !== 'treino') {
      return enviarErro(resposta, 403, 'Você só pode consultar o seu próprio plano de treino.');
    }

    // Valida o índice do dia recebido na query (inteiro não negativo).
    const diaIndice = Number(requisicao.query.dia_indice);
    if (!Number.isInteger(diaIndice) || diaIndice < 0) {
      return enviarErro(resposta, 400, 'Informe o dia que deseja consultar.');
    }

    // Localiza o dia na cópia do plano do usuário.
    const plano = interpretarConteudo<Omit<PlanoTreino, 'id' | 'versao' | 'modelo_origem' | 'criado_em'>>(linha);
    const dia = plano.dias_da_semana[diaIndice];
    if (!dia) {
      return enviarErro(resposta, 404, 'Dia de treino não encontrado no plano.');
    }

    // TEAM_003+TEAM_012: alternativas do mesmo músculo na modalidade do plano
    // (o motor cai para o grupo quando não há opção do mesmo músculo); os
    // nomes já usados no dia ficam fora para não repetir exercício na sessão.
    // TEAM_007: uma lista por posição do dia, na mesma ordem dos exercícios.
    const nomesDoDia = dia.exercicios.map((item) => item.nome);
    const alternativasPorExercicio = dia.exercicios.map((exercicio) => {
      const musculoAlvo = musculoAlvoDoExercicio(exercicio.nome, exercicio.grupo);
      return listarAlternativasDeExercicio(plano.modalidade, exercicio, nomesDoDia).map(
        (alternativa) => ({
          nome: alternativa.nome,
          tipo: alternativa.tipo,
          // TEAM_012: informa se a opção atinge o mesmo músculo do exercício.
          mesmo_musculo: musculoAlvoDoExercicio(alternativa.nome, alternativa.grupo) === musculoAlvo,
        }),
      );
    });
    return resposta.send({ alternativasPorExercicio });
  });

  /** PATCH /api/plano/treino/:planoId/trocar — troca um exercício por outro do mesmo músculo (fallback: mesmo grupo). */
  app.patch<{ Params: { planoId: string } }>('/treino/:planoId/trocar', { onRequest: [exigirAutenticacao] }, async (requisicao, resposta) => {
    // Recupera o id do usuário autenticado.
    const usuarioId = usuarioIdDaRequisicao(requisicao);

    // TEAM_007: valida o id da rota antes de tocar no banco (NaN → 403).
    const planoId = interpretarPlanoId(requisicao.params.planoId);
    if (planoId === null) {
      return enviarErro(resposta, 403, 'Você só pode editar o seu próprio plano de treino.');
    }

    // Busca a cópia do plano no banco.
    const linha = buscarPlanoPorId(planoId);

    // Garante que o plano existe, pertence ao usuário e é do tipo treino.
    if (!linha || linha.usuario_id !== usuarioId || linha.tipo !== 'treino') {
      return enviarErro(resposta, 403, 'Você só pode editar o seu próprio plano de treino.');
    }

    // Valida os índices e o nome da alternativa recebidos.
    const corpo = (requisicao.body ?? {}) as TrocaDeExercicio;
    // TEAM_007: índices precisam ser inteiros não negativos.
    if (
      !Number.isInteger(corpo.dia_indice) || (corpo.dia_indice as number) < 0 ||
      !Number.isInteger(corpo.exercicio_indice) || (corpo.exercicio_indice as number) < 0 ||
      !corpo.exercicio_nome
    ) {
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

    // TEAM_007: valida o id da rota antes de tocar no banco (NaN → 403).
    const planoId = interpretarPlanoId(requisicao.params.planoId);
    if (planoId === null) {
      return enviarErro(resposta, 403, 'Você só pode editar o seu próprio plano de dieta.');
    }

    // Busca a cópia do plano no banco.
    const linha = buscarPlanoPorId(planoId);

    // Garante que o plano existe, pertence ao usuário e é do tipo dieta.
    if (!linha || linha.usuario_id !== usuarioId || linha.tipo !== 'dieta') {
      return enviarErro(resposta, 403, 'Você só pode editar o seu próprio plano de dieta.');
    }

    // Valida os índices e o nome do substituto recebidos.
    const corpo = (requisicao.body ?? {}) as { refeicao_indice?: number; item_indice?: number; alternativa_nome?: string };
    // TEAM_007: índices precisam ser inteiros não negativos.
    if (
      !Number.isInteger(corpo.refeicao_indice) || (corpo.refeicao_indice as number) < 0 ||
      !Number.isInteger(corpo.item_indice) || (corpo.item_indice as number) < 0 ||
      !corpo.alternativa_nome
    ) {
      return enviarErro(resposta, 400, 'Informe a refeição, o alimento e o substituto desejado.');
    }

    // Aplica a substituição na cópia do usuário com recálculo da porção.
    const plano = interpretarConteudo<Omit<PlanoDieta, 'id' | 'versao' | 'modelo_origem' | 'criado_em'>>(linha);
    try {
      aplicarSubstituicao(plano, corpo.refeicao_indice as number, corpo.item_indice as number, corpo.alternativa_nome);
    } catch (erro) {
      // Índice fora da grade do plano ou substituto inexistente.
      return enviarErro(resposta, 400, erro instanceof Error ? erro.message : 'Não foi possível substituir o alimento.');
    }

    // Persiste a cópia atualizada no SQLite.
    atualizarConteudoDoPlano(planoId, JSON.stringify(plano));

    // Responde com a dieta atualizada (id/versão/modelo/data sobrescrevem o conteúdo).
    return resposta.send({ ...plano, id: planoId, versao: linha.versao, modelo_origem: linha.modelo_origem, criado_em: linha.criado_em });
  });
}
