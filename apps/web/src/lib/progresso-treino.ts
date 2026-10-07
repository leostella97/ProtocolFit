/**
 * progresso-treino.ts — TEAM_008
 * ---------------------------------------------------------------------------
 * Checklist de exercícios concluídos do treino, persistida no navegador por
 * plano+dia — SEM a data civil na chave (mudança pedida: "guardar o check
 * para mostrar na próxima visita").
 *
 * A data entra no VALOR gravado:
 *   - marcas feitas hoje são restauradas normalmente (mesma regra de antes);
 *   - marcas de OUTRO dia com a sessão ainda incompleta são restauradas —
 *     o usuário continua de onde parou;
 *   - marcas de outro dia com a sessão CONCLUÍDA são descartadas — treino
 *     feito, dia novo = sessão nova.
 *
 * Chaves legadas no formato antigo (com a data embutida) são podadas na
 * primeira gravação. O registro durável do treino segue sendo o check-in.
 * ---------------------------------------------------------------------------
 */
import { hojeLocal } from './checkin-util';

/** Prefixo das chaves da checklist no localStorage. */
const PREFIXO_DO_PROGRESSO = 'protocolfit_treino_concluido:';

/** Valor persistido da checklist de um dia do plano. */
export interface ProgressoDaSessao {
  /** Data civil (AAAA-MM-DD) em que as marcas foram feitas. */
  data: string;
  /** Índices dos exercícios concluídos dentro do dia. */
  indices: number[];
}

/** Monta a chave da checklist de um dia do plano (sem data — persiste entre visitas). */
function chaveDoProgresso(planoId: number, diaIndice: number): string {
  return `${PREFIXO_DO_PROGRESSO}${planoId}:${diaIndice}`;
}

/**
 * Lê os índices dos exercícios concluídos num dia do plano.
 * `totalDoDia` é a quantidade atual de exercícios do dia — marcações de uma
 * sessão CONCLUÍDA numa data anterior são descartadas (sessão nova), e
 * índices fora da grade atual (plano encolheu) são ignorados.
 */
export function lerConcluidos(planoId: number, diaIndice: number, totalDoDia: number, hoje = hojeLocal()): number[] {
  try {
    const bruto = localStorage.getItem(chaveDoProgresso(planoId, diaIndice));
    if (!bruto) {
      return [];
    }
    const valor: unknown = JSON.parse(bruto);
    // Formato novo: { data, indices }. Qualquer outro formato é descartado.
    if (!valor || typeof valor !== 'object' || !Array.isArray((valor as ProgressoDaSessao).indices)) {
      return [];
    }
    const progresso = valor as ProgressoDaSessao;
    const indices = progresso.indices.filter(
      (indice): indice is number => Number.isInteger(indice) && indice >= 0 && indice < totalDoDia,
    );
    // Sessão concluída num dia ANTERIOR: o treino foi feito, a lista zera.
    if (typeof progresso.data === 'string' && progresso.data !== hoje && indices.length >= totalDoDia) {
      return [];
    }
    return indices;
  } catch {
    return [];
  }
}

/**
 * Grava os índices concluídos de um dia do plano (lista vazia remove a chave)
 * e aproveita para podar chaves obsoletas: de outros planos (plano antigo
 * regenerado) e do formato legado que embutia a data na chave.
 */
export function gravarConcluidos(planoId: number, diaIndice: number, concluidos: number[], hoje = hojeLocal()): void {
  try {
    const chave = chaveDoProgresso(planoId, diaIndice);
    if (concluidos.length === 0) {
      localStorage.removeItem(chave);
    } else {
      const progresso: ProgressoDaSessao = { data: hoje, indices: concluidos };
      localStorage.setItem(chave, JSON.stringify(progresso));
    }
    const obsoletas: string[] = [];
    for (let indice = 0; indice < localStorage.length; indice += 1) {
      const outraChave = localStorage.key(indice);
      if (!outraChave?.startsWith(PREFIXO_DO_PROGRESSO)) {
        continue;
      }
      const partes = outraChave.split(':');
      // Formato novo tem 3 partes (prefixo, planoId, dia); o legado tinha 4
      // (prefixo, planoId, data, dia). Mantém só as do plano vigente.
      if (partes.length !== 3 || partes[1] !== String(planoId)) {
        obsoletas.push(outraChave);
      }
    }
    obsoletas.forEach((chaveAntiga) => localStorage.removeItem(chaveAntiga));
  } catch {
    // Armazenamento bloqueado/cheio: a checklist segue só na memória da sessão.
  }
}
