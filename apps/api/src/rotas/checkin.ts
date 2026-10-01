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
import { montarResumoDeCheckins } from '../servicos/sequenciaDeCheckins.js';
import { LIMITES_CORPO } from '../util/constantes.js';
// TEAM_007: validação de datas civis centralizada (formato + regra de futuro).
import { dataNoFuturo, dataValida, hojeEmTexto } from '../util/datas.js';
import { enviarErro, exigirAutenticacao, usuarioIdDaRequisicao } from '../util/respostas.js';

/** Corpo esperado na rota de check-in. */
interface CorpoCheckin {
  /** Dia do check-in (padrão: hoje). */
  data?: string;
  /**
   * TEAM_007: dia civil DO CLIENTE usado como referência do resumo
   * (sequência atual e campo `hoje`). Difere de `data` quando o check-in é
   * retroativo — sem ele, o resumo cairia no UTC do servidor e um check-in
   * feito perto da meia-noite poderia "sumir" da resposta.
   */
  hoje?: string;
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

/** TEAM_007: tamanho máximo da observação livre do check-in (caracteres). */
const OBSERVACAO_MAXIMA = 1000;

/** Registra as rotas de check-in (prefixo /api/checkin). */
export async function rotasCheckin(app: FastifyInstance): Promise<void> {
  /** GET /api/checkin — resumo do check-in diário (sequência e histórico). */
  app.get('/', { onRequest: [exigirAutenticacao] }, async (requisicao, resposta) => {
    // Recupera o id do usuário autenticado.
    const usuarioId = usuarioIdDaRequisicao(requisicao);
    // TEAM_001: o cliente informa o próprio dia civil (?hoje=AAAA-MM-DD) —
    // o servidor não conhece o fuso do usuário (UTC quebraria o check-in à noite).
    const { hoje } = (requisicao.query ?? {}) as { hoje?: string };
    if (hoje !== undefined && !dataValida(hoje)) {
      return enviarErro(resposta, 400, 'Informe uma data válida no formato AAAA-MM-DD.');
    }
    // TEAM_007: busca o histórico COMPLETO — a sequência máxima precisa dos
    // check-ins mais antigos (o resumo só devolve os 60 mais recentes).
    const registros = listarCheckins(usuarioId);
    // Responde com o resumo calculado (hoje, sequências e histórico).
    return resposta.send(montarResumoDeCheckins(registros, hoje));
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
    // TEAM_007: check-in no futuro é rejeitado (tolera até "amanhã" UTC para
    // fusos à frente do servidor, ex.: cliente no UTC+14).
    if (dataNoFuturo(data)) {
      return enviarErro(resposta, 400, 'Não é possível registrar check-in em uma data futura.');
    }
    // TEAM_007: a referência "hoje" do resumo também precisa ser uma data válida.
    if (corpo.hoje !== undefined && !dataValida(corpo.hoje)) {
      return enviarErro(resposta, 400, 'Informe uma data de referência válida no formato AAAA-MM-DD.');
    }

    // TEAM_007: os campos booleanos precisam ser booleanos de verdade — antes,
    // tipos errados (ex.: "sim") entravam por coerção silenciosa.
    if (corpo.treino_feito !== undefined && typeof corpo.treino_feito !== 'boolean') {
      return enviarErro(resposta, 400, 'O campo treino_feito precisa ser verdadeiro ou falso.');
    }
    if (corpo.dieta_seguida !== undefined && typeof corpo.dieta_seguida !== 'boolean') {
      return enviarErro(resposta, 400, 'O campo dieta_seguida precisa ser verdadeiro ou falso.');
    }

    // Valida a quantidade de água informada (tipo errado → 400, não mais 0).
    if (corpo.agua_ml !== undefined && (typeof corpo.agua_ml !== 'number' || !Number.isFinite(corpo.agua_ml))) {
      return enviarErro(resposta, 400, 'Informe a quantidade de água em mililitros.');
    }
    const aguaMl = typeof corpo.agua_ml === 'number' ? Math.round(corpo.agua_ml) : 0;
    if (aguaMl < 0 || aguaMl > AGUA_MAXIMA_ML) {
      return enviarErro(resposta, 400, `Informe a água entre 0 e ${AGUA_MAXIMA_ML} ml.`);
    }

    // TEAM_007: a observação é texto livre — rejeita tipos errados e limita o
    // tamanho para não gravar conteúdo gigante no banco.
    if (corpo.observacao !== undefined && corpo.observacao !== null && typeof corpo.observacao !== 'string') {
      return enviarErro(resposta, 400, 'A observação precisa ser um texto.');
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
      observacao:
        corpo.observacao !== undefined
          ? corpo.observacao?.trim().slice(0, OBSERVACAO_MAXIMA) || null
          : (checkinDoDia?.observacao ?? null),
    });

    // TEAM_007: o resumo usa o dia civil DO CLIENTE (`hoje`) como referência —
    // NÃO a data do check-in: um registro retroativo não pode fingir que a
    // sequência termina nele. Sem `hoje`, cai no UTC do servidor (mesmo
    // comportamento do GET sem o parâmetro).
    const registros = listarCheckins(usuarioId);
    return resposta.code(201).send({ checkin: registrado, ...montarResumoDeCheckins(registros, corpo.hoje) });
  });
}
