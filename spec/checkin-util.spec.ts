/**
 * checkin-util.spec.ts — TEAM_007
 * ---------------------------------------------------------------------------
 * Testes unitários (Jasmine) dos utilitários de check-in diário do frontend
 * (apps/web/src/lib/checkin-util.ts): datas no padrão AAAA-MM-DD, mini
 * histórico e a grade mensal do calendário de check-ins.
 * ---------------------------------------------------------------------------
 */
import {
  AGUA_MAXIMA_ML,
  hojeLocal,
  META_CARDIO_SEMANAL_MIN,
  montarCalendarioDoMes,
  resumirSemanaDeCheckins,
  separadorDeDatas,
  somarAguaDoDia,
  type CelulaDoCalendario,
  type CheckinParaCalendario,
  type CheckinParaResumoSemanal,
} from '../apps/web/src/lib/checkin-util';

/** Localiza a célula de uma data na grade de semanas retornada. */
function celulaDaData(semanas: CelulaDoCalendario[][], data: string): CelulaDoCalendario {
  const celula = semanas.flat().find((item) => item.data === data);
  if (!celula) {
    throw new Error(`Data ${data} não encontrada na grade`);
  }
  return celula;
}

describe('hojeLocal', () => {
  it('devolve a data no formato AAAA-MM-DD e igual ao relógio local', () => {
    const hoje = hojeLocal();
    expect(hoje).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Confere com os componentes da data local (sem conversão de fuso).
    const agora = new Date();
    const esperado = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(
      agora.getDate(),
    ).padStart(2, '0')}`;
    expect(hoje).toBe(esperado);
  });
});

describe('separadorDeDatas (mini histórico)', () => {
  it('devolve N dias terminando em hoje', () => {
    const dias = separadorDeDatas([], 7);
    expect(dias.length).toBe(7);
    expect(dias[6].data).toBe(hojeLocal());
    expect(dias.every((dia) => dia.cumprido === false)).toBe(true);
  });

  it('marca como cumpridos os dias presentes na lista', () => {
    const hoje = hojeLocal();
    const dias = separadorDeDatas([hoje], 3);
    expect(dias[2].cumprido).toBe(true);
    expect(dias[0].cumprido).toBe(false);
  });

  it('preenche o rótulo com a inicial do dia da semana', () => {
    const dias = separadorDeDatas([], 7);
    expect(dias.every((dia) => ['D', 'S', 'T', 'Q'].includes(dia.rotulo))).toBe(true);
  });
});

describe('montarCalendarioDoMes', () => {
  // Janeiro de 2025: começa numa quarta-feira (3 células de preenchimento) e
  // tem 31 dias → 34 células, completadas até 35 (5 semanas de 7).
  const hoje = '2025-01-15';
  const checkins: CheckinParaCalendario[] = [
    { data: '2025-01-10', treino_feito: true, dieta_seguida: false },
    { data: '2025-01-11', treino_feito: false, dieta_seguida: false },
    { data: '2025-01-12', treino_feito: false, dieta_seguida: true },
    // TEAM_019: dia só com cardio também é dia cumprido no calendário.
    { data: '2025-01-13', treino_feito: false, dieta_seguida: false, cardio_feito: true },
  ];
  const semanas = montarCalendarioDoMes(2025, 0, checkins, hoje);

  it('monta semanas de 7 células com preenchimento inicial e final', () => {
    expect(semanas.length).toBe(5);
    expect(semanas.every((semana) => semana.length === 7)).toBe(true);
    // As três primeiras células são preenchimento (o mês começa na quarta).
    expect(semanas[0].slice(0, 3).every((celula) => celula.estado === 'fora_do_mes')).toBe(true);
    expect(semanas[0][3].data).toBe('2025-01-01');
    // A última célula também é preenchimento (o mês acaba na sexta).
    expect(semanas[4][6].estado).toBe('fora_do_mes');
  });

  it('classifica cada dia conforme o check-in', () => {
    // Treino feito OU dieta seguida → dia cumprido.
    expect(celulaDaData(semanas, '2025-01-10').estado).toBe('cumprido');
    expect(celulaDaData(semanas, '2025-01-12').estado).toBe('cumprido');
    // Check-in sem treino nem dieta → registrado (não conta na sequência).
    expect(celulaDaData(semanas, '2025-01-11').estado).toBe('registrado');
    // TEAM_019: cardio feito → dia cumprido.
    expect(celulaDaData(semanas, '2025-01-13').estado).toBe('cumprido');
    // Dia passado sem check-in.
    expect(celulaDaData(semanas, '2025-01-05').estado).toBe('sem_checkin');
    // O próprio hoje sem check-in é "sem_checkin", não "futuro".
    expect(celulaDaData(semanas, hoje).estado).toBe('sem_checkin');
    // Dias depois de hoje são futuro — mesmo com check-in hipotético.
    expect(celulaDaData(semanas, '2025-01-20').estado).toBe('futuro');
    expect(celulaDaData(semanas, '2025-01-31').estado).toBe('futuro');
  });

  it('expõe número do dia e data só nas células reais', () => {
    const primeiro = celulaDaData(semanas, '2025-01-01');
    expect(primeiro.dia).toBe(1);
    const ultimo = celulaDaData(semanas, '2025-01-31');
    expect(ultimo.dia).toBe(31);
    // Células de preenchimento não têm data nem dia.
    expect(semanas[0][0].data).toBe('');
    expect(semanas[0][0].dia).toBeNull();
  });

  it('respeita meses de 29 dias em ano bissexto', () => {
    // Fevereiro de 2024 tem 29 dias.
    const fevereiro = montarCalendarioDoMes(2024, 1, [], '2024-02-15');
    expect(celulaDaData(fevereiro, '2024-02-29').dia).toBe(29);
    expect(fevereiro.flat().some((celula) => celula.data === '2024-02-30')).toBe(false);
  });
});

// TEAM_017: o formulário de líquido do treino incrementa o agua_ml do
// check-in — a soma e o teto diário são a função pura somarAguaDoDia.
describe('somarAguaDoDia (incremento do líquido do treino)', () => {
  it('soma o incremento sobre o total atual do dia', () => {
    const resultado = somarAguaDoDia(1250, 500);
    expect(resultado).toEqual({ ok: true, totalMl: 1750 });
  });

  it('parte do zero quando o dia ainda não tem líquido', () => {
    const resultado = somarAguaDoDia(0, 250);
    expect(resultado).toEqual({ ok: true, totalMl: 250 });
  });

  it('arredonda incrementos com decimal para ml inteiros', () => {
    const resultado = somarAguaDoDia(100, 249.6);
    expect(resultado).toEqual({ ok: true, totalMl: 350 });
  });

  it('aceita o total exatamente no teto diário', () => {
    const resultado = somarAguaDoDia(AGUA_MAXIMA_ML - 500, 500);
    expect(resultado).toEqual({ ok: true, totalMl: AGUA_MAXIMA_ML });
  });

  it('rejeita incremento que estoura o teto diário (sem truncar)', () => {
    const resultado = somarAguaDoDia(AGUA_MAXIMA_ML - 100, 500);
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.erro).toContain(String(AGUA_MAXIMA_ML));
    }
  });

  it('rejeita incremento zero, negativo ou não numérico', () => {
    for (const invalido of [0, -250, Number.NaN, Number.POSITIVE_INFINITY]) {
      const resultado = somarAguaDoDia(1000, invalido);
      expect(resultado.ok).toBe(false);
    }
  });
});

/* TEAM_019: resumo semanal de consistência — base das pizzas do perfil
   (força vs frequência, hidratação vs meta de água, cardio vs 150 min). */
describe('resumirSemanaDeCheckins', () => {
  const hoje = '2025-06-14'; // sábado — janela de 2025-06-08 a 2025-06-14.

  /** Monta um check-in mínimo para o resumo semanal. */
  function checkin(data: string, parcial: Partial<CheckinParaResumoSemanal> = {}): CheckinParaResumoSemanal {
    return {
      data,
      treino_feito: false,
      agua_ml: 0,
      cardio_feito: false,
      cardio_tempo_min: null,
      cardio_km: null,
      ...parcial,
    };
  }

  it('conta sessões de força só dentro da janela de 7 dias', () => {
    const resumo = resumirSemanaDeCheckins(
      [
        checkin('2025-06-14', { treino_feito: true }),
        checkin('2025-06-10', { treino_feito: true }),
        checkin('2025-06-08', { treino_feito: true }),
        // Fora da janela (8 dias atrás) — não deve contar.
        checkin('2025-06-07', { treino_feito: true }),
        // No futuro da referência — também não conta.
        checkin('2025-06-15', { treino_feito: true }),
      ],
      5,
      2500,
      hoje,
    );
    expect(resumo.forca.feito).toBe(3);
    expect(resumo.forca.meta).toBe(5);
  });

  it('limita a meta de força entre 1 e 7 sessões', () => {
    const resumoBaixo = resumirSemanaDeCheckins([], 0, 2500, hoje);
    expect(resumoBaixo.forca.meta).toBe(1);
    const resumoAlto = resumirSemanaDeCheckins([], 10, 2500, hoje);
    expect(resumoAlto.forca.meta).toBe(7);
  });

  it('conta só os dias com água na meta diária', () => {
    const resumo = resumirSemanaDeCheckins(
      [
        checkin('2025-06-14', { agua_ml: 2500 }),
        checkin('2025-06-13', { agua_ml: 2600 }),
        checkin('2025-06-12', { agua_ml: 2400 }), // abaixo da meta
        checkin('2025-06-11', { agua_ml: 0 }), // check-in sem água
        // Dia 10 sem check-in nenhum → conta como fora da meta.
      ],
      5,
      2500,
      hoje,
    );
    expect(resumo.hidratacao.diasNaMeta).toBe(2);
    expect(resumo.hidratacao.dias).toBe(7);
    expect(resumo.hidratacao.metaMl).toBe(2500);
  });

  it('soma minutos e km de cardio só dos dias marcados', () => {
    const resumo = resumirSemanaDeCheckins(
      [
        checkin('2025-06-14', { cardio_feito: true, cardio_tempo_min: 40, cardio_km: 5 }),
        checkin('2025-06-12', { cardio_feito: true, cardio_tempo_min: 30, cardio_km: 4.5 }),
        // Cardio desmarcado com detalhe preenchido por engano não soma.
        checkin('2025-06-11', { cardio_feito: false, cardio_tempo_min: 60, cardio_km: 10 }),
        // Cardio marcado sem detalhe soma zero (sem inventar valor).
        checkin('2025-06-10', { cardio_feito: true }),
      ],
      5,
      2500,
      hoje,
    );
    expect(resumo.cardio.minutos).toBe(70);
    expect(resumo.cardio.km).toBe(9.5);
    expect(resumo.cardio.metaMinutos).toBe(META_CARDIO_SEMANAL_MIN);
  });

  it('devolve zeros com a semana vazia', () => {
    const resumo = resumirSemanaDeCheckins([], 3, 2000, hoje);
    expect(resumo.forca.feito).toBe(0);
    expect(resumo.hidratacao.diasNaMeta).toBe(0);
    expect(resumo.cardio.minutos).toBe(0);
    expect(resumo.cardio.km).toBe(0);
  });
});
