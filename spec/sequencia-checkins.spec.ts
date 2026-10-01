/**
 * sequencia-checkins.spec.ts — TEAM_007
 * ---------------------------------------------------------------------------
 * Testes de REGRESSÃO (Jasmine) do serviço que monta o resumo de check-ins
 * (apps/api/src/servicos/sequenciaDeCheckins.ts):
 *
 *  - "dia cumprido" = treino OU dieta marcados;
 *  - a sequência atual termina na data de referência do cliente (ou em ontem,
 *    quando hoje ainda não tem check-in);
 *  - a sequência máxima é o maior bloco consecutivo do histórico;
 *  - as métricas usam o histórico COMPLETO, mesmo com `registros` fatiado a
 *    60 itens na resposta (streaks longos não podem quebrar).
 * ---------------------------------------------------------------------------
 */
import { montarResumoDeCheckins } from '../apps/api/src/servicos/sequenciaDeCheckins';
import type { CheckinDiario } from '../apps/api/src/tipos';

/** Monta um check-in mínimo para os testes (cumprido por padrão). */
function checkin(data: string, parcial: Partial<CheckinDiario> = {}): CheckinDiario {
  return {
    id: 0,
    data,
    treino_feito: true,
    dieta_seguida: false,
    agua_ml: 0,
    peso_kg: null,
    observacao: null,
    ...parcial,
  };
}

/** Gera as datas consecutivas terminando em `fim` (AAAA-MM-DD), mais antiga 1ª. */
function datasConsecutivas(fim: string, quantidade: number): string[] {
  const fimMs = new Date(`${fim}T00:00:00Z`).getTime();
  return Array.from({ length: quantidade }, (_, indice) =>
    new Date(fimMs - (quantidade - 1 - indice) * 86400000).toISOString().slice(0, 10),
  );
}

describe('montarResumoDeCheckins', () => {
  it('conta como cumprido o dia com treino OU dieta marcados', () => {
    const resumo = montarResumoDeCheckins(
      [
        checkin('2025-01-01', { treino_feito: true, dieta_seguida: false }),
        checkin('2025-01-02', { treino_feito: false, dieta_seguida: true }),
        checkin('2025-01-03', { treino_feito: false, dieta_seguida: false }),
      ],
      '2025-01-03',
    );
    // Dias 1 e 2 cumpridos (um por cada flag); dia 3 não conta.
    expect(resumo.dias_cumpridos).toEqual(['2025-01-01', '2025-01-02']);
    // Hoje (03) está pendente → a contagem parte de ontem e vale 2.
    expect(resumo.sequencia_atual).toBe(2);
  });

  it('sequência atual termina na referência — incluindo hoje cumprido', () => {
    const registros = datasConsecutivas('2025-03-10', 4).map((data) => checkin(data));
    const resumo = montarResumoDeCheckins(registros, '2025-03-10');
    expect(resumo.sequencia_atual).toBe(4);
    expect(resumo.hoje?.data).toBe('2025-03-10');
  });

  it('sem check-in de hoje, a sequência continua válida a partir de ontem', () => {
    // Cumpriu 03, 04 e 05 — hoje é 06 e ainda não foi registrado.
    const registros = datasConsecutivas('2025-03-05', 3).map((data) => checkin(data));
    const resumo = montarResumoDeCheckins(registros, '2025-03-06');
    expect(resumo.sequencia_atual).toBe(3);
    expect(resumo.hoje).toBeNull();
  });

  it('um dia sem registro no meio quebra a sequência atual', () => {
    const registros = [
      ...datasConsecutivas('2025-03-03', 3).map((data) => checkin(data)),
      // 2025-03-04 ficou sem check-in.
      ...datasConsecutivas('2025-03-06', 2).map((data) => checkin(data)),
    ];
    const resumo = montarResumoDeCheckins(registros, '2025-03-06');
    expect(resumo.sequencia_atual).toBe(2);
    // O recorde segue sendo o bloco maior do passado (3 dias).
    expect(resumo.sequencia_maxima).toBe(3);
  });

  it('a sequência máxima enxerga blocos antigos mesmo após quebra', () => {
    const registros = [
      ...datasConsecutivas('2025-01-10', 10).map((data) => checkin(data)),
      checkin('2025-02-01'), // bloco novo de 1 dia, depois de semanas parado.
    ];
    const resumo = montarResumoDeCheckins(registros, '2025-02-01');
    expect(resumo.sequencia_maxima).toBe(10);
    expect(resumo.sequencia_atual).toBe(1);
  });

  it('a referência de hoje respeita a data civil enviada pelo cliente', () => {
    // Fuso do usuário ainda é "ontem" em relação ao UTC do servidor.
    const registros = datasConsecutivas('2025-06-30', 2).map((data) => checkin(data));
    const resumo = montarResumoDeCheckins(registros, '2025-06-30');
    expect(resumo.hoje?.data).toBe('2025-06-30');
    expect(resumo.sequencia_atual).toBe(2);
  });

  it('métricas usam o histórico completo mesmo com registros fatiados a 60', () => {
    // Streak de 90 dias seguidos: antes do ajuste o total e a sequência
    // quebravam porque a rota lia só as 60 linhas mais recentes.
    const registros = datasConsecutivas('2025-04-30', 90)
      .reverse() // o serviço recebe do mais recente para o mais antigo.
      .map((data) => checkin(data));
    const resumo = montarResumoDeCheckins(registros, '2025-04-30');
    expect(resumo.total).toBe(90);
    expect(resumo.sequencia_atual).toBe(90);
    expect(resumo.sequencia_maxima).toBe(90);
    // Só os 60 mais recentes viajam na resposta.
    expect(resumo.registros.length).toBe(60);
    expect(resumo.registros[0].data).toBe('2025-04-30');
  });

  it('dias_cumpridos traz só os 30 mais recentes', () => {
    const registros = datasConsecutivas('2025-05-31', 45).map((data) => checkin(data));
    const resumo = montarResumoDeCheckins(registros, '2025-05-31');
    expect(resumo.dias_cumpridos.length).toBe(30);
    expect(resumo.dias_cumpridos.at(-1)).toBe('2025-05-31');
  });

  it('devolve zeros com histórico vazio', () => {
    const resumo = montarResumoDeCheckins([], '2025-01-15');
    expect(resumo.hoje).toBeNull();
    expect(resumo.sequencia_atual).toBe(0);
    expect(resumo.sequencia_maxima).toBe(0);
    expect(resumo.total).toBe(0);
  });
});
