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
import { listarEvolucao, salvarPesagemDoDia } from '../bd/banco.js';
import { LIMITES_CORPO } from '../util/constantes.js';
// TEAM_007: validação de datas civis centralizada (formato + regra de futuro).
import { dataNoFuturo, dataValida, hojeEmTexto } from '../util/datas.js';
import { enviarErro, exigirAutenticacao, usuarioIdDaRequisicao } from '../util/respostas.js';

/** Corpo esperado na rota de registro de pesagem. */
interface CorpoPesagem {
  peso_kg?: number;
  /** Data opcional no formato AAAA-MM-DD (padrão: data de hoje). */
  data?: string;
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
    const data = corpo.data ?? hojeEmTexto();
    if (!dataValida(data)) {
      return enviarErro(resposta, 400, 'Informe uma data válida no formato AAAA-MM-DD.');
    }
    // TEAM_007: pesagem no futuro não faz sentido — rejeita com tolerância de
    // fuso (aceita até "amanhã" em UTC).
    if (dataNoFuturo(data)) {
      return enviarErro(resposta, 400, 'Não é possível registrar pesagem em uma data futura.');
    }

    // Grava a pesagem do dia (atualiza o registro do dia, se já existir) e
    // devolve o registro gravado — sem a consulta extra que existia antes.
    const registro = salvarPesagemDoDia(usuarioId, data, corpo.peso_kg);

    // Responde com o registro criado/atualizado.
    return resposta.code(201).send(registro);
  });

  /** GET /api/evolucao — histórico de pesagens em ordem cronológica. */
  app.get('/', { onRequest: [exigirAutenticacao] }, async (requisicao) => {
    // Recupera o id do usuário autenticado.
    const usuarioId = usuarioIdDaRequisicao(requisicao);

    // Lista as pesagens do usuário (isolamento garantido pela chave estrangeira).
    return listarEvolucao(usuarioId);
  });
}
