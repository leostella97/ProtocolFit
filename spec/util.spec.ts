/**
 * util.spec.ts — TEAM_007
 * ---------------------------------------------------------------------------
 * Testes unitários (Jasmine) dos utilitários gerais do frontend
 * (apps/web/src/lib/util.ts): formatação brasileira, rótulos de domínio e a
 * composição de classes Tailwind.
 * ---------------------------------------------------------------------------
 */
import {
  combinarClasses,
  formatarData,
  formatarDecimal,
  formatarMinutosSegundos,
  rotuloDaModalidade,
  rotuloDoDia,
  rotuloDoObjetivo,
  variacoesDaCombinacao,
} from '../apps/web/src/lib/util';
import type { VariacaoDeTreino } from '../apps/web/src/lib/tipos';

describe('formatarData', () => {
  it('converte AAAA-MM-DD para DD/MM/AAAA', () => {
    expect(formatarData('2025-01-05')).toBe('05/01/2025');
    expect(formatarData('1997-12-31')).toBe('31/12/1997');
  });
});

describe('formatarDecimal', () => {
  it('usa vírgula e sempre uma casa decimal', () => {
    expect(formatarDecimal(12.34)).toBe('12,3');
    expect(formatarDecimal(80)).toBe('80,0');
  });
});

describe('formatarMinutosSegundos (visor do timer)', () => {
  it('formata segundos como mm:ss com zero à esquerda', () => {
    expect(formatarMinutosSegundos(0)).toBe('00:00');
    expect(formatarMinutosSegundos(5)).toBe('00:05');
    expect(formatarMinutosSegundos(60)).toBe('01:00');
    expect(formatarMinutosSegundos(90)).toBe('01:30');
    expect(formatarMinutosSegundos(3600)).toBe('60:00');
  });
});

describe('rótulos de domínio', () => {
  it('rotula objetivos conhecidos e devolve o valor bruto se desconhecido', () => {
    expect(rotuloDoObjetivo('emagrecimento')).toBe('Emagrecimento');
    expect(rotuloDoObjetivo('hipertrofia')).toBe('Hipertrofia');
    expect(rotuloDoObjetivo('corrida')).toBe('Corrida');
    expect(rotuloDoObjetivo('outro')).toBe('outro');
  });

  it('rotula modalidades', () => {
    expect(rotuloDaModalidade('academia')).toBe('Academia');
    expect(rotuloDaModalidade('pesocorporal')).toBe('Peso do corpo');
    expect(rotuloDaModalidade('x')).toBe('x');
  });

  it('rotula dias da semana canônicos', () => {
    expect(rotuloDoDia('segunda')).toBe('Segunda');
    expect(rotuloDoDia('terca')).toBe('Terça');
    expect(rotuloDoDia('sabado')).toBe('Sábado');
    expect(rotuloDoDia('domingo')).toBe('Domingo');
  });
});

describe('combinarClasses', () => {
  it('junta classes e ignora valores falsy', () => {
    expect(combinarClasses('a', false, undefined, 'b')).toBe('a b');
  });

  it('resolve conflitos do Tailwind mantendo a última classe', () => {
    expect(combinarClasses('p-2', 'p-4')).toBe('p-4');
    expect(combinarClasses('text-sm', 'text-lg')).toBe('text-lg');
  });
});

/** Monta uma variação de treino mínima para os testes de filtro/ordenação. */
function variacao(parcial: Partial<VariacaoDeTreino>): VariacaoDeTreino {
  return {
    id: 'padrao',
    nome: 'Padrão',
    modalidade: 'academia',
    objetivo: 'hipertrofia',
    dias: 3,
    duracao_estimada_min: 60,
    arquivo: '3dias.json',
    ...parcial,
  };
}

describe('variacoesDaCombinacao', () => {
  const lista: VariacaoDeTreino[] = [
    variacao({ id: 'forca', nome: 'Força máxima', modalidade: 'academia', objetivo: 'hipertrofia', dias: 3 }),
    variacao({ id: 'padrao', nome: 'Padrão', modalidade: 'academia', objetivo: 'hipertrofia', dias: 3 }),
    variacao({ id: 'density', nome: 'Alta densidade', modalidade: 'academia', objetivo: 'emagrecimento', dias: 3 }),
    variacao({ id: 'padrao-4', nome: 'Padrão 4d', modalidade: 'academia', objetivo: 'hipertrofia', dias: 4 }),
    variacao({ id: 'casa', nome: 'Casa', modalidade: 'pesocorporal', objetivo: 'hipertrofia', dias: 3 }),
  ];

  it('filtra por modalidade + objetivo + quantidade de dias', () => {
    const resultado = variacoesDaCombinacao(lista, 'academia', 'hipertrofia', 3);
    expect(resultado.map((estilo) => estilo.id)).toEqual(['padrao', 'forca']);
  });

  it('coloca o estilo padrão sempre primeiro', () => {
    const resultado = variacoesDaCombinacao(lista, 'academia', 'emagrecimento', 3);
    expect(resultado.map((estilo) => estilo.id)).toEqual(['density']);
    // Mesmo sem "padrao" na combinação, a lista vem coerente (só o que serve).
    expect(resultado.every((estilo) => estilo.dias === 3)).toBeTrue();
  });

  it('devolve lista vazia quando a combinação não existe', () => {
    expect(variacoesDaCombinacao(lista, 'pesocorporal', 'corrida', 5)).toEqual([]);
  });
});
