/**
 * servidor.ts
 * ---------------------------------------------------------------------------
 * Bootstrap do servidor Fastify do ProtocolFit.
 *
 * Registra CORS, autenticação JWT e todas as rotas da API, e sobe o
 * servidor na porta configurada (padrão 3333). Leitura/escrita em SQLite e
 * arquivos locais garantem resposta em milissegundos em qualquer hospedagem.
 * ---------------------------------------------------------------------------
 */
// Carrega as variáveis de ambiente do arquivo .env (se existir).
import 'dotenv/config';

// Framework HTTP de alta performance (baixa latência).
import Fastify from 'fastify';

// Permite que o frontend Next.js (outra porta) chame a API.
import cors from '@fastify/cors';

// TEAM_007: limita requisições por IP nas rotas de autenticação — cada login
// custa ~100ms de CPU (bcrypt), então sem limite um atacante podia forçar
// força bruta em massa ou derrubar o servidor por consumo de CPU.
import rateLimit from '@fastify/rate-limit';

// Plugin de autenticação JWT.
import { configurarAutenticacao } from './plugins/autenticacaoJwt.js';

// Rotas da API.
import { rotasAutenticacao } from './rotas/autenticacao.js';
import { rotasCheckin } from './rotas/checkin.js';
import { rotasConta } from './rotas/conta.js';
import { rotasEvolucao } from './rotas/evolucao.js';
import { rotasOpcoes } from './rotas/opcoes.js';
import { rotasPerfil } from './rotas/perfil.js';
import { rotasPlanos } from './rotas/planos.js';

/** Porta do servidor (variável PORTA ou 3333 como padrão). */
const PORTA = Number(process.env.PORTA ?? 3333);

/**
 * Instância principal do Fastify com logs de desenvolvimento.
 * TEAM_007: trustProxy honra X-Forwarded-For do proxy reverso (Caddy/Nginx) —
 * sem ele, o rate limit enxergaria todos os usuários como um único IP.
 */
const app = Fastify({ logger: true, trustProxy: true });

// Habilita CORS para a origem do frontend (evita bloqueios no navegador).
await app.register(cors, {
  origin: process.env.PROTOCOLFIT_ORIGEM_WEB ?? 'http://localhost:3000',
});

// Parser de JSON tolerante: aceita corpo vazio em requisições sem payload
// (ex.: POST /api/perfil/recalcular), que o Fastify v5 rejeita por padrão.
// Assinatura do Fastify v5: (requisicao, corpoComoTexto, pronto) — o
// `parseAs: 'string'` entrega o corpo já convertido em texto UTF-8.
app.addContentTypeParser('application/json', { parseAs: 'string' }, (requisicao, corpoComoTexto: string, pronto) => {
  // Corpo vazio ou em branco vira um objeto vazio (rotas sem payload).
  if (!corpoComoTexto || corpoComoTexto.trim() === '') {
    pronto(null, {});
    return;
  }
  try {
    // Interpreta o JSON e entrega o objeto para a rota.
    pronto(null, JSON.parse(corpoComoTexto));
  } catch (erro) {
    // JSON malformado: devolve o erro para o tratamento padrão do Fastify.
    pronto(erro as Error, undefined);
  }
});

// TEAM_011: cabeçalhos de segurança em TODA resposta — a API só entrega
// JSON, mas os headers protegem quem abre a URL direto no navegador e
// impedem cache intermediário de dados pessoais (perfil, planos, check-ins).
app.addHook('onSend', async (_requisicao, resposta) => {
  // Impede o navegador de "adivinhar" o tipo do conteúdo (MIME sniffing).
  resposta.header('X-Content-Type-Options', 'nosniff');
  // A API nunca deve ser embutida em <iframe> (clickjacking).
  resposta.header('X-Frame-Options', 'DENY');
  // Não vaza a URL de origem para terceiros via cabeçalho Referer.
  resposta.header('Referrer-Policy', 'no-referrer');
  // Respostas de API não devem ficar em cache de proxies/navegador.
  resposta.header('Cache-Control', 'no-store');
});

// Configura o JWT na instância raiz — chamada DIRETA (não app.register)
// para que os decorators (app.jwt, request.jwtVerify) fiquem globais.
await configurarAutenticacao(app);

// TEAM_007: respostas de erro padronizadas — o frontend lê sempre `mensagem`.
// Erros de JWT (token expirado/ausente) viram 401 amigável; os demais erros
// inesperados viram 500 genérico sem vazar detalhes internos.
app.setErrorHandler((erro: unknown, _requisicao, resposta) => {
  // Extrai status e mensagem de forma segura (o Fastify entrega FastifyError).
  const falha = erro as { statusCode?: number; message?: string };
  // Erros com statusCode próprio (JWT, rate limit, validação do Fastify).
  const status = falha.statusCode && falha.statusCode >= 400 ? falha.statusCode : 500;
  if (status >= 500) {
    app.log.error(erro);
  }
  if (status === 401) {
    return resposta.code(401).send({ mensagem: 'Sessão expirada ou inválida. Entre novamente.' });
  }
  if (status === 429) {
    return resposta.code(429).send({ mensagem: 'Muitas tentativas. Aguarde um instante e tente de novo.' });
  }
  if (status >= 500) {
    return resposta.code(500).send({ mensagem: 'Erro interno do servidor. Tente novamente em instantes.' });
  }
  return resposta.code(status).send({ mensagem: falha.message ?? 'Requisição inválida.' });
});

// TEAM_011: registra o rate-limit na raiz com global:false — cria o decorator
// app.rateLimit para opt-in por rota (/api/saude) sem limitar tudo; rotas
// autenticadas ficam sem teto por dependerem de JWT válido.
await app.register(rateLimit, { global: false });

// TEAM_011: rate limit nas rotas PÚBLICAS (as demais exigem JWT válido — um
// atacante sem conta não as alcança; um usuário logado só derruba a si mesmo).
// 300 req/min por IP é folga larga para uso humano e barreira para flood —
// e não sufoca os testes de integração legítimos que fazem centenas de
// requisições autenticadas em sequência.
await app.register(async (rotasPublicas) => {
  await rotasPublicas.register(rateLimit, { max: 300, timeWindow: '1 minute' });
  await rotasPublicas.register(rotasOpcoes);
}, { prefix: '/api' }); // GET /api/opcoes

// TEAM_007: as rotas de autenticação recebem rate limit próprio — 30
// requisições/minuto por IP é folga para uso humano e barreira para bots.
await app.register(async (rotasProtegidas) => {
  await rotasProtegidas.register(rateLimit, { max: 30, timeWindow: '1 minute' });
  await rotasProtegidas.register(rotasAutenticacao);
}, { prefix: '/api/auth' }); // POST /api/auth/cadastro | /api/auth/login
await app.register(rotasConta, { prefix: '/api' }); // GET  /api/eu
await app.register(rotasPerfil, { prefix: '/api/perfil' }); // POST /api/perfil | PATCH /api/perfil/corpo | PATCH /api/perfil/treino | POST /api/perfil/recalcular
await app.register(rotasPlanos, { prefix: '/api/plano' }); // GET /api/plano/atual | PATCH /api/plano/treino/:id | PATCH /api/plano/dieta/:id/substituir
await app.register(rotasEvolucao, { prefix: '/api/evolucao' }); // POST /api/evolucao | GET /api/evolucao
await app.register(rotasCheckin, { prefix: '/api/checkin' }); // GET /api/checkin | POST /api/checkin (check-in diário)

/** Rota de saúde — usada para monitorar se o servidor está no ar. */
// TEAM_011: também pública → fica dentro do mesmo teto de 300 req/min.
// Registrada direto na instância raiz com config própria do rate-limit.
app.get('/api/saude', { config: { rateLimit: { max: 300, timeWindow: '1 minute' } } }, async () => ({
  status: 'ok',
  sistema: 'ProtocolFit',
  timestamp: new Date().toISOString(),
}));

/** Sobe o servidor escutando em todas as interfaces na porta configurada. */
try {
  await app.listen({ port: PORTA, host: '0.0.0.0' });
} catch (erro) {
  // Em caso de falha (ex.: porta ocupada), registra e encerra o processo.
  app.log.error(erro);
  process.exit(1);
}
