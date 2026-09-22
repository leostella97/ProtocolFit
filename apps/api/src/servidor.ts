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

/** Instância principal do Fastify com logs de desenvolvimento. */
const app = Fastify({ logger: true });

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

// Configura o JWT na instância raiz — chamada DIRETA (não app.register)
// para que os decorators (app.jwt, request.jwtVerify) fiquem globais.
await configurarAutenticacao(app);

// Registra as rotas com seus prefixos de API.
await app.register(rotasOpcoes, { prefix: '/api' }); // GET  /api/opcoes
await app.register(rotasAutenticacao, { prefix: '/api/auth' }); // POST /api/auth/cadastro | /api/auth/login
await app.register(rotasConta, { prefix: '/api' }); // GET  /api/eu
await app.register(rotasPerfil, { prefix: '/api/perfil' }); // POST /api/perfil | GET /api/perfil | POST /api/perfil/recalcular
await app.register(rotasPlanos, { prefix: '/api/plano' }); // GET /api/plano/atual | PATCH /api/plano/treino/:id | PATCH /api/plano/dieta/:id/substituir
await app.register(rotasEvolucao, { prefix: '/api/evolucao' }); // POST /api/evolucao | GET /api/evolucao
await app.register(rotasCheckin, { prefix: '/api/checkin' }); // GET /api/checkin | POST /api/checkin (check-in diário)

/** Rota de saúde — usada para monitorar se o servidor está no ar. */
app.get('/api/saude', async () => ({
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
