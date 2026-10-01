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

/** Segredo de assinatura dos tokens (configurável por variável de ambiente). */
const SEGREDO_JWT = process.env.PROTOCOLFIT_JWT_SECRET;

// TEAM_007: em produção o segredo é OBRIGATÓRIO — um fallback fixo permitiria
// a qualquer pessoa que leu o código assinar tokens JWT válidos.
if (!SEGREDO_JWT && process.env.NODE_ENV === 'production') {
  throw new Error(
    'PROTOCOLFIT_JWT_SECRET não configurado: defina um segredo forte na variável de ambiente antes de subir em produção.',
  );
}

/** Configura o JWT na instância raiz do servidor Fastify. */
export async function configurarAutenticacao(app: FastifyInstance): Promise<void> {
  // Registra o plugin JWT diretamente na instância raiz (decorators globais).
  await app.register(fastifyJwt, {
    // Segredo de assinatura (em desenvolvimento usa um valor só local).
    secret: SEGREDO_JWT ?? 'protocolfit-segredo-apenas-desenvolvimento',
    // Validade padrão dos tokens emitidos.
    sign: { expiresIn: '7d' },
  });
}
