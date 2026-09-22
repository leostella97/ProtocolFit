/**
 * opcoes.ts
 * ---------------------------------------------------------------------------
 * Rota pública que entrega ao frontend todas as opções estáticas do
 * onboarding (faixas etárias, objetivos, modalidades, frequências, dias da
 * semana e parâmetros de segurança do login). Assim o servidor permanece a
 * fonte única de verdade das regras do sistema.
 * ---------------------------------------------------------------------------
 */
import type { FastifyInstance } from 'fastify';
import type { OpcoesDoSistema } from '../tipos.js';
import {
  DIAS_DA_SEMANA,
  FAIXAS_ETARIAS,
  FREQUENCIAS_SEMANAIS,
  HORAS_DE_BLOQUEIO,
  LIMITE_TENTATIVAS_LOGIN,
  MODALIDADES,
  OBJETIVOS,
} from '../util/constantes.js';

/** Registra a rota GET /opcoes. */
export async function rotasOpcoes(app: FastifyInstance): Promise<void> {
  app.get('/opcoes', async () => {
    // Monta o objeto de opções a partir das constantes do domínio.
    const opcoes: OpcoesDoSistema = {
      faixas_etarias: FAIXAS_ETARIAS.map((faixa) => ({ valor: faixa.valor, rotulo: faixa.rotulo })),
      objetivos: OBJETIVOS,
      modalidades: MODALIDADES,
      frequencias_semanais: FREQUENCIAS_SEMANAIS,
      dias_semana: DIAS_DA_SEMANA,
      seguranca: { tentativas_limite: LIMITE_TENTATIVAS_LOGIN, horas_bloqueio: HORAS_DE_BLOQUEIO },
    };
    return opcoes;
  });
}
