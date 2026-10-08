/**
 * motor-navegador.spec.ts — TEAM_007
 * ---------------------------------------------------------------------------
 * Testes unitários (Jasmine) do motor de cálculo determinístico que roda no
 * navegador (apps/web/src/lib/motor/calculos.ts) — Mifflin-St Jeor, IMC,
 * fatores de atividade, pisos de segurança e arredondamento de cargas.
 *
 * Complementa os scripts de verificação ponta a ponta (testar:motor /
 * testar:local) com expectativas unitárias de cada fórmula.
 * ---------------------------------------------------------------------------
 */
import {
  arredondarCarga,
  calcularIMC,
  calcularMetaCalorica,
  calcularPlanoNutricional,
  calcularTMB,
  classificarIMC,
  fatorDeAtividade,
  idadeRepresentativaDaFaixa,
} from '../apps/web/src/lib/motor/calculos';
import { MINIMO_CALORIAS_POR_SEXO } from '../apps/web/src/lib/motor/constantes';

describe('calcularTMB (Mifflin-St Jeor)', () => {
  it('homem: 10×peso + 6,25×altura − 5×idade + 5', () => {
    // 10×80 + 6,25×175 − 5×30 + 5 = 1748,75 → arredonda para 1749.
    expect(calcularTMB('masculino', 80, 175, 30)).toBe(1749);
  });

  it('mulher: 10×peso + 6,25×altura − 5×idade − 161', () => {
    // 10×60 + 6,25×165 − 5×30 − 161 = 1320,25 → arredonda para 1320.
    expect(calcularTMB('feminino', 60, 165, 30)).toBe(1320);
  });

  it('mantém a diferença de 166 kcal entre os sexos a paridade de medidas', () => {
    const homem = calcularTMB('masculino', 70, 170, 25);
    const mulher = calcularTMB('feminino', 70, 170, 25);
    expect(homem - mulher).toBe(166);
  });
});

describe('fatorDeAtividade', () => {
  it('mapeia a frequência semanal na tabela de fatores', () => {
    expect(fatorDeAtividade(1)).toBe(1.2);
    expect(fatorDeAtividade(3)).toBe(1.55);
    expect(fatorDeAtividade(5)).toBe(1.725);
    expect(fatorDeAtividade(7)).toBe(1.9);
  });

  it('limita a frequência entre 1 e 7 antes de consultar', () => {
    expect(fatorDeAtividade(0)).toBe(1.2);
    expect(fatorDeAtividade(10)).toBe(1.9);
  });
});

describe('calcularMetaCalorica', () => {
  it('emagrecimento aplica déficit de 20% sobre o gasto total', () => {
    // 2000 × 1,55 × 0,8 = 2480.
    expect(calcularMetaCalorica(2000, 1.55, 'emagrecimento', 'masculino')).toBe(2480);
  });

  it('hipertrofia aplica superávit de 10% sobre o gasto total', () => {
    // 1800 × 1,55 × 1,1 = 3069.
    expect(calcularMetaCalorica(1800, 1.55, 'hipertrofia', 'masculino')).toBe(3069);
  });

  it('corrida mantém o gasto total (sem ajuste)', () => {
    // 1600 × 1,375 = 2200.
    expect(calcularMetaCalorica(1600, 1.375, 'corrida', 'feminino')).toBe(2200);
  });

  it('TEAM_010: luta mantém o gasto total (performance, sem corte de peso)', () => {
    // 1600 × 1,375 = 2200 — manutenção deliberada para o lutador.
    expect(calcularMetaCalorica(1600, 1.375, 'luta', 'feminino')).toBe(2200);
  });

  it('nunca desce abaixo do piso de segurança do sexo', () => {
    // 900 × 1,2 × 0,8 = 864 → piso feminino.
    expect(calcularMetaCalorica(900, 1.2, 'emagrecimento', 'feminino')).toBe(
      MINIMO_CALORIAS_POR_SEXO.feminino,
    );
    // 1000 × 1,2 × 0,8 = 960 → piso masculino.
    expect(calcularMetaCalorica(1000, 1.2, 'emagrecimento', 'masculino')).toBe(
      MINIMO_CALORIAS_POR_SEXO.masculino,
    );
  });
});

describe('calcularIMC', () => {
  it('calcula peso ÷ altura² com uma casa decimal', () => {
    // 80 ÷ 1,75² = 26,12… → 26,1.
    expect(calcularIMC(80, 175)).toBe(26.1);
    expect(calcularIMC(60, 165)).toBe(22);
  });
});

describe('classificarIMC', () => {
  it('classifica pelos pontos de corte da OMS (inclusivos no limite superior)', () => {
    expect(classificarIMC(18.4)).toBe('Abaixo do peso');
    expect(classificarIMC(18.5)).toBe('Peso adequado');
    expect(classificarIMC(24.9)).toBe('Peso adequado');
    expect(classificarIMC(25)).toBe('Sobrepeso');
    expect(classificarIMC(29.9)).toBe('Sobrepeso');
    expect(classificarIMC(30)).toBe('Obesidade');
  });
});

describe('arredondarCarga', () => {
  it('arredonda para o múltiplo de 2,5 kg mais próximo', () => {
    expect(arredondarCarga(23)).toBe(22.5);
    expect(arredondarCarga(24)).toBe(25);
    expect(arredondarCarga(40)).toBe(40);
    expect(arredondarCarga(11.4)).toBe(12.5);
  });
});

describe('idadeRepresentativaDaFaixa', () => {
  it('usa o ponto médio da faixa etária', () => {
    expect(idadeRepresentativaDaFaixa('18-19')).toBe(19); // (18+19)/2 = 18,5 → 19
    expect(idadeRepresentativaDaFaixa('19-23')).toBe(21);
    expect(idadeRepresentativaDaFaixa('79-83')).toBe(81);
  });

  it('rejeita faixa desconhecida com erro descritivo', () => {
    expect(() => idadeRepresentativaDaFaixa('99-105')).toThrowError(/Faixa etária desconhecida/);
  });
});

describe('calcularPlanoNutricional', () => {
  const perfil = {
    sexo: 'masculino' as const,
    peso_kg: 80,
    altura_cm: 175,
    faixa_etaria: '27-31', // ponto médio 29 anos
    objetivo: 'hipertrofia' as const,
    frequencia_semanal: 4,
  };

  it('produz metas coerentes com as regras do objetivo', () => {
    const meta = calcularPlanoNutricional(perfil);
    // Proteína de hipertrofia: 1,8 g/kg.
    expect(meta.proteinas_g).toBe(144);
    // Água de hipertrofia: 35 ml/kg.
    expect(meta.agua_ml).toBe(2800);
    // Fibras: 14 g/1000 kcal, limitadas entre 25 g e 40 g.
    expect(meta.fibras_g).toBeGreaterThanOrEqual(25);
    expect(meta.fibras_g).toBeLessThanOrEqual(40);
    // Meta nunca abaixo do piso de segurança.
    expect(meta.meta_kcal).toBeGreaterThanOrEqual(MINIMO_CALORIAS_POR_SEXO.masculino);
    // Superávit: meta calórica acima do gasto total.
    expect(meta.meta_kcal).toBeGreaterThan(meta.gasto_total);
    // Os macros não podem estourar a meta calórica.
    const kcalDosMacros = meta.proteinas_g * 4 + meta.carboidratos_g * 4 + meta.gorduras_g * 9;
    expect(Math.abs(kcalDosMacros - meta.meta_kcal)).toBeLessThanOrEqual(20);
    // IMC e classificação coerentes.
    expect(meta.imc).toBe(26.1);
    expect(meta.classificacao_imc).toBe('Sobrepeso');
  });

  it('emagrecimento produz meta abaixo do gasto total', () => {
    const meta = calcularPlanoNutricional({ ...perfil, objetivo: 'emagrecimento' });
    expect(meta.meta_kcal).toBeLessThan(meta.gasto_total);
    // Proteína de emagrecimento: 2,0 g/kg.
    expect(meta.proteinas_g).toBe(160);
  });

  it('TEAM_010: luta mantém a meta no gasto total, com proteína e água altas', () => {
    const meta = calcularPlanoNutricional({ ...perfil, objetivo: 'luta' });
    // Manutenção: meta = gasto total.
    expect(meta.meta_kcal).toBe(meta.gasto_total);
    // Proteína de luta: 1,8 g/kg → 80 × 1,8 = 144 g.
    expect(meta.proteinas_g).toBe(144);
    // Água de luta: 40 ml/kg (sudorese alta) → 80 × 40 = 3200 ml.
    expect(meta.agua_ml).toBe(3200);
  });
});
