/**
 * autenticacaoJwt.ts
 * ---------------------------------------------------------------------------
 * Configuração do @fastify/jwt no ProtocolFit.
 *
 * ATENÇÃO (Fastify v5): decorators (app.jwt, request.jwtVerify) de plugins
 * registrados DENTRO de um wrapper via app.register ficam ENCAPSULADOS no
 * escopo do wrapper e não aparecem na instância raiz. Por isso esta função
 * é chamada DIRETAMENTE em servidor.ts (e não via app.register), garantindo
 * que os decorators fiquem disponíveis em todas as rotas.
 * ---------------------------------------------------------------------------
 */
import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance } from 'fastify';

/** Configura o JWT na instância raiz do servidor Fastify. */
export async function configurarAutenticacao(app: FastifyInstance): Promise<void> {
  // Registra o plugin JWT diretamente na instância raiz (decorators globais).
  await app.register(fastifyJwt, {
    // Segredo de assinatura (use a variável de ambiente em produção!).
    secret: process.env.PROTOCOLFIT_JWT_SECRET ?? 'protocolfit-segredo-apenas-desenvolvimento',
    // Validade padrão dos tokens emitidos.
    sign: { expiresIn: '7d' },
  });
}
