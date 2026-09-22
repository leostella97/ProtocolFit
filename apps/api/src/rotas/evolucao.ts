/**
 * evolucao.ts
 * ---------------------------------------------------------------------------
 * Rotas de evolução corporal (pesagens):
 *  - POST / → registra o peso do dia
 *  - GET  / → lista o histórico (alimenta o gráfico do dashboard)
 *
 * O peso mais recente registrado aqui é usado no recálculo dos planos —
 * é a base das "renovações periódicas pela evolução física".
 * ---------------------------------------------------------------------------
 */
import type { FastifyInstance } from 'fastify';
import { listarEvolucao, registrarEvolucao } from '../bd/banco.js';
import { LIMITES_CORPO } from '../util/constantes.js';
import { enviarErro, exigirAutenticacao, usuarioIdDaRequisicao } from '../util/respostas.js';

/** Corpo esperado na rota de registro de pesagem. */
interface CorpoPesagem {
  peso_kg?: number;
  /** Data opcional no formato AAAA-MM-DD (padrão: data de hoje). */
  data?: string;
}

/** Verifica se uma data está no formato AAAA-MM-DD. */
function dataValida(data: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(data) && !Number.isNaN(Date.parse(data));
}

/** Registra as rotas de evolução (prefixo /api/evolucao). */
export async function rotasEvolucao(app: FastifyInstance): Promise<void> {
  /** POST /api/evolucao — registra a pesagem do dia. */
  app.post('/', { onRequest: [exigirAutenticacao] }, async (requisicao, resposta) => {
    // Recupera o id do usuário autenticado.
    const usuarioId = usuarioIdDaRequisicao(requisicao);

    // Valida o corpo recebido.
    const corpo = (requisicao.body ?? {}) as CorpoPesagem;
    if (typeof corpo.peso_kg !== 'number' || corpo.peso_kg < LIMITES_CORPO.peso_minimo_kg || corpo.peso_kg > LIMITES_CORPO.peso_maximo_kg) {
      return enviarErro(resposta, 400, `Informe um peso válido entre ${LIMITES_CORPO.peso_minimo_kg} e ${LIMITES_CORPO.peso_maximo_kg} kg.`);
    }
    // Usa a data informada ou a data de hoje no fuso local.
    const data = corpo.data ?? new Date().toISOString().slice(0, 10);
    if (!dataValida(data)) {
      return enviarErro(resposta, 400, 'Informe uma data válida no formato AAAA-MM-DD.');
    }

    // Grava a pesagem no SQLite.
    const id = registrarEvolucao(usuarioId, data, corpo.peso_kg);

    // Responde com o registro criado.
    return resposta.code(201).send({ id, data, peso_kg: corpo.peso_kg });
  });

  /** GET /api/evolucao — histórico de pesagens em ordem cronológica. */
  app.get('/', { onRequest: [exigirAutenticacao] }, async (requisicao) => {
    // Recupera o id do usuário autenticado.
    const usuarioId = usuarioIdDaRequisicao(requisicao);

    // Lista as pesagens do usuário (isolamento garantido pela chave estrangeira).
    return listarEvolucao(usuarioId);
  });
}
