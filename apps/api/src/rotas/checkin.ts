/**
 * checkin.ts
 * ---------------------------------------------------------------------------
 * Rotas do CHECK-IN DIÁRIO do ProtocolFit:
 *
 *  - GET  /api/checkin → resumo completo (hoje, sequência atual, recorde,
 *                        total e histórico dos últimos dias)
 *  - POST /api/checkin → salva (ou atualiza) o check-in do dia
 *
 * O check-in registra: treino feito, dieta seguida, água bebida, peso do dia
 * (opcional) e uma observação livre. Um registro por dia, por usuário.
 * Quando o peso é informado, ele também entra na evolução corporal — que é a
 * base do recálculo dos planos.
 * ---------------------------------------------------------------------------
 */
import type { FastifyInstance } from 'fastify';
import { buscarCheckinDoDia, listarCheckins, salvarCheckin } from '../bd/banco.js';
import { hojeEmTexto, montarResumoDeCheckins } from '../servicos/sequenciaDeCheckins.js';
import { LIMITES_CORPO } from '../util/constantes.js';
import { enviarErro, exigirAutenticacao, usuarioIdDaRequisicao } from '../util/respostas.js';

/** Corpo esperado na rota de check-in. */
interface CorpoCheckin {
  /** Dia do check-in (padrão: hoje). */
  data?: string;
  /** Treino concluído no dia. */
  treino_feito?: boolean;
  /** Dieta seguida no dia. */
  dieta_seguida?: boolean;
  /** Água bebida no dia (ml). */
  agua_ml?: number;
  /** Peso do dia (opcional). */
  peso_kg?: number | null;
  /** Anotação livre (opcional). */
  observacao?: string | null;
}

/** Limite máximo aceito de água por dia (ml) — evita digitação absurda. */
const AGUA_MAXIMA_ML = 10000;

/** Verifica se a data está no formato AAAA-MM-DD e é válida. */
function dataValida(data: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(data) && !Number.isNaN(Date.parse(data));
}

/** Registra as rotas de check-in (prefixo /api/checkin). */
export async function rotasCheckin(app: FastifyInstance): Promise<void> {
  /** GET /api/checkin — resumo do check-in diário (sequência e histórico). */
  app.get('/', { onRequest: [exigirAutenticacao] }, async (requisicao, resposta) => {
    // Recupera o id do usuário autenticado.
    const usuarioId = usuarioIdDaRequisicao(requisicao);
    // Busca os check-ins mais recentes (60 dias cobrem qualquer sequência).
    const registros = listarCheckins(usuarioId, 60);
    // Responde com o resumo calculado (hoje, sequências e histórico).
    return resposta.send(montarResumoDeCheckins(registros));
  });

  /** POST /api/checkin — salva (ou atualiza) o check-in do dia. */
  app.post('/', { onRequest: [exigirAutenticacao] }, async (requisicao, resposta) => {
    // Recupera o id do usuário autenticado.
    const usuarioId = usuarioIdDaRequisicao(requisicao);
    const corpo = (requisicao.body ?? {}) as CorpoCheckin;

    // Valida a data (quando informada) ou usa o dia de hoje.
    const data = corpo.data ?? hojeEmTexto();
    if (!dataValida(data)) {
      return enviarErro(resposta, 400, 'Informe uma data válida no formato AAAA-MM-DD.');
    }

    // Valida a quantidade de água informada.
    const aguaMl = typeof corpo.agua_ml === 'number' ? Math.round(corpo.agua_ml) : 0;
    if (aguaMl < 0 || aguaMl > AGUA_MAXIMA_ML) {
      return enviarErro(resposta, 400, `Informe a água entre 0 e ${AGUA_MAXIMA_ML} ml.`);
    }

    // Valida o peso quando informado (null = não informado).
    if (corpo.peso_kg !== undefined && corpo.peso_kg !== null) {
      if (
        typeof corpo.peso_kg !== 'number' ||
        corpo.peso_kg < LIMITES_CORPO.peso_minimo_kg ||
        corpo.peso_kg > LIMITES_CORPO.peso_maximo_kg
      ) {
        return enviarErro(resposta, 400, `Informe um peso entre ${LIMITES_CORPO.peso_minimo_kg} e ${LIMITES_CORPO.peso_maximo_kg} kg.`);
      }
    }

    // Mantém os valores já registrados no dia quando o campo não for enviado
    // (assim o usuário pode atualizar só a água, por exemplo).
    const checkinDoDia = buscarCheckinDoDia(usuarioId, data);
    const registrado = salvarCheckin(usuarioId, {
      data,
      treino_feito: corpo.treino_feito ?? checkinDoDia?.treino_feito ?? false,
      dieta_seguida: corpo.dieta_seguida ?? checkinDoDia?.dieta_seguida ?? false,
      agua_ml: corpo.agua_ml !== undefined ? aguaMl : (checkinDoDia?.agua_ml ?? 0),
      peso_kg: corpo.peso_kg !== undefined ? corpo.peso_kg : (checkinDoDia?.peso_kg ?? null),
      observacao: corpo.observacao !== undefined ? corpo.observacao : (checkinDoDia?.observacao ?? null),
    });

    // Responde com o check-in gravado e o resumo atualizado (uma única chamada).
    const registros = listarCheckins(usuarioId, 60);
    return resposta.code(201).send({ checkin: registrado, ...montarResumoDeCheckins(registros) });
  });
}
