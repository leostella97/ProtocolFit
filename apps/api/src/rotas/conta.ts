/**
 * conta.ts
 * ---------------------------------------------------------------------------
 * Rota autenticada GET /eu — devolve os dados da conta do usuário logado
 * junto com o estado do onboarding (perfil preenchido ou não).
 * O frontend usa esta rota para restaurar a sessão ao recarregar a página.
 * ---------------------------------------------------------------------------
 */
import type { FastifyInstance } from 'fastify';
import { buscarPerfilPorUsuario, buscarUsuarioPorId } from '../bd/banco.js';
import { enviarErro, exigirAutenticacao, usuarioIdDaRequisicao } from '../util/respostas.js';

/** Registra as rotas de conta (prefixo /api). */
export async function rotasConta(app: FastifyInstance): Promise<void> {
  app.get('/eu', { onRequest: [exigirAutenticacao] }, async (requisicao, resposta) => {
    // Recupera o id do usuário do token JWT verificado.
    const usuarioId = usuarioIdDaRequisicao(requisicao);

    // Busca a conta no banco.
    const usuario = buscarUsuarioPorId(usuarioId);
    if (!usuario) {
      return enviarErro(resposta, 404, 'Usuário não encontrado.');
    }

    // Verifica se o onboarding já foi concluído (perfil existe).
    const perfil = buscarPerfilPorUsuario(usuarioId);

    // Responde com a conta pública e o estado do onboarding.
    return resposta.send({
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, criado_em: usuario.criado_em },
      perfil: perfil ?? null,
      possui_planos: perfil !== undefined,
    });
  });
}
