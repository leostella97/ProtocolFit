/**
 * respostas.ts
 * ---------------------------------------------------------------------------
 * Utilitários de resposta HTTP usados por todas as rotas do ProtocolFit.
 * ---------------------------------------------------------------------------
 */
import type { FastifyReply, FastifyRequest } from 'fastify';

/** Envia um erro padronizado no formato JSON { mensagem }. */
export function enviarErro(reply: FastifyReply, codigo: number, mensagem: string): FastifyReply {
  return reply.code(codigo).send({ mensagem });
}

/** Extrai o id do usuário autenticado do token JWT verificado. */
export function usuarioIdDaRequisicao(requisicao: FastifyRequest): number {
  // O plugin @fastify/jwt grava o payload verificado em requisicao.user.
  const usuario = requisicao.user as { sub: string };
  return Number(usuario.sub);
}

/**
 * Hook de autenticação usado em todas as rotas protegidas.
 * O @fastify/jwt v9+ expõe `jwtVerify()` na requisição (não mais o decorator
 * `app.authenticate`): o token inválido/ausente lança erro e vira 401.
 */
export async function exigirAutenticacao(requisicao: FastifyRequest): Promise<void> {
  // Verifica a assinatura e a validade do token JWT da requisição.
  await requisicao.jwtVerify();
}
