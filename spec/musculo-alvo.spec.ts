/**
 * musculo-alvo.spec.ts — TEAM_012
 * ---------------------------------------------------------------------------
 * Testes unitários (Jasmine) da regra de TROCA por mesmo músculo:
 *
 *   1) musculoAlvoDoExercicio deriva o músculo fino a partir do nome dentro
 *      das famílias amplas (pernas/ombro/core) e devolve o próprio grupo nos
 *      demais casos;
 *   2) listarAlternativasDeExercicio só oferece exercícios do mesmo músculo
 *      (com fallback para o grupo quando o músculo não tem outra opção);
 *   3) aplicarTrocaDeExercicio rejeita troca cross-músculo quando existe
 *      opção do mesmo músculo no catálogo.
 *
 * A função existe nos dois motores (API + navegador) com conteúdo idêntico —
 * os testes rodam contra o motor do navegador e cobrem a paridade.
 * ---------------------------------------------------------------------------
 */
import { musculoAlvoDoExercicio } from '../apps/web/src/lib/motor/musculoAlvo';
import { musculoAlvoDoExercicio as musculoAlvoDaApi } from '../apps/api/src/motor/musculoAlvo';
import { aplicarTrocaDeExercicio } from '../apps/web/src/lib/motor/montadorPlano';
import type { ModeloExercicio } from '../apps/web/src/lib/motor/tipos-modelos';
import type { ExercicioDoPlano, PlanoTreino } from '../apps/web/src/lib/tipos';

type PlanoClonado = Omit<PlanoTreino, 'id' | 'versao' | 'modelo_origem' | 'criado_em'>;

/** Monta um exercício de plano mínimo para os testes de troca. */
function exercicioDoPlano(nome: string, grupo: string): ExercicioDoPlano {
  return {
    nome,
    grupo,
    tipo: 'composto',
    series: 4,
    repeticoes_min: 8,
    repeticoes_max: 12,
    descanso_segundos: 90,
    carga_sugerida_kg: null,
    distancia_km: null,
    dicas: '',
  };
}

/** Catálogo sintético: quadríceps × 2 + posterior × 1 + glúteo × 1. */
const CATALOGO: ModeloExercicio[] = [
  { nome: 'Agachamento livre', grupo: 'pernas', tipo: 'composto', series: 4, repeticoes_min: 8, repeticoes_max: 12, descanso_segundos: 90, percentual_carga_peso_corporal: 0.5, dicas: '' },
  { nome: 'Leg press 45°', grupo: 'pernas', tipo: 'composto', series: 4, repeticoes_min: 8, repeticoes_max: 12, descanso_segundos: 90, percentual_carga_peso_corporal: 0.6, dicas: '' },
  { nome: 'Mesa flexora', grupo: 'pernas', tipo: 'isolador', series: 3, repeticoes_min: 10, repeticoes_max: 15, descanso_segundos: 60, percentual_carga_peso_corporal: 0.3, dicas: '' },
  { nome: 'Elevação pélvica', grupo: 'pernas', tipo: 'composto', series: 4, repeticoes_min: 8, repeticoes_max: 12, descanso_segundos: 90, percentual_carga_peso_corporal: 0.5, dicas: '' },
];

function planoCom(exercicio: ExercicioDoPlano): PlanoClonado {
  return {
    nome: 'Plano teste',
    objetivo: 'hipertrofia',
    modalidade: 'academia',
    dias: 1,
    duracao_estimada_min: 60,
    dicas: [],
    dias_da_semana: [{ titulo: 'Dia 1', exercicios: [exercicio] }],
  };
}

describe('musculoAlvoDoExercicio (TEAM_012)', () => {
  it('fatia "pernas" em quadríceps / posterior / glúteos / adutores', () => {
    expect(musculoAlvoDoExercicio('Agachamento livre', 'pernas')).toBe('quadriceps');
    expect(musculoAlvoDoExercicio('Leg press 45°', 'pernas')).toBe('quadriceps');
    expect(musculoAlvoDoExercicio('Mesa flexora', 'pernas')).toBe('posterior_de_coxa');
    expect(musculoAlvoDoExercicio('Stiff com barra', 'pernas')).toBe('posterior_de_coxa');
    expect(musculoAlvoDoExercicio('Elevação pélvica com barra', 'pernas')).toBe('gluteos');
    expect(musculoAlvoDoExercicio('Agachamento sumô', 'pernas')).toBe('adutores');
  });

  it('fatia "ombro" nas três cabeças do deltoide', () => {
    expect(musculoAlvoDoExercicio('Elevação lateral com halteres', 'ombro')).toBe('deltoide_lateral');
    expect(musculoAlvoDoExercicio('Face pull na polia', 'ombro')).toBe('deltoide_posterior');
    expect(musculoAlvoDoExercicio('Desenvolvimento com halteres', 'ombro')).toBe('deltoide_anterior');
  });

  it('fatia "core" em oblíquos / estabilização / reto abdominal', () => {
    expect(musculoAlvoDoExercicio('Prancha lateral', 'core')).toBe('obliquos');
    expect(musculoAlvoDoExercicio('Rotação russa com anilha', 'core')).toBe('obliquos');
    expect(musculoAlvoDoExercicio('Prancha isométrica', 'core')).toBe('core_estabilizacao');
    expect(musculoAlvoDoExercicio('Abdominal supra', 'core')).toBe('reto_abdominal');
  });

  it('grupos específicos devolvem o próprio grupo', () => {
    expect(musculoAlvoDoExercicio('Supino reto com barra', 'peito')).toBe('peito');
    expect(musculoAlvoDoExercicio('Barra fixa', 'costas')).toBe('costas');
  });

  it('paridade: API e navegador derivam o mesmo músculo', () => {
    const casos: [string, string][] = [
      ['Agachamento livre', 'pernas'], ['Mesa flexora', 'pernas'], ['Elevação pélvica', 'pernas'],
      ['Agachamento sumô', 'pernas'], ['Elevação lateral', 'ombro'], ['Face pull', 'ombro'],
      ['Desenvolvimento', 'ombro'], ['Prancha lateral', 'core'], ['Abdominal supra', 'core'],
      ['Supino reto', 'peito'],
    ];
    for (const [nome, grupo] of casos) {
      expect(musculoAlvoDoExercicio(nome, grupo)).toBe(musculoAlvoDaApi(nome, grupo));
    }
  });
});

describe('aplicarTrocaDeExercicio — mesmo músculo (TEAM_012)', () => {
  it('aceita troca dentro do mesmo músculo (quadríceps → quadríceps)', () => {
    const plano = planoCom(exercicioDoPlano('Agachamento livre', 'pernas'));
    const resultado = aplicarTrocaDeExercicio(
      plano,
      { dia_indice: 0, exercicio_indice: 0, exercicio_nome: 'Leg press 45°' },
      CATALOGO,
      80,
    );
    expect(resultado.dias_da_semana[0].exercicios[0].nome).toBe('Leg press 45°');
  });

  it('rejeita troca cross-músculo quando existe opção do mesmo músculo', () => {
    const plano = planoCom(exercicioDoPlano('Agachamento livre', 'pernas'));
    // Catálogo tem "Leg press" (quadríceps) disponível → mesa flexora
    // (posterior) não pode entrar no lugar do agachamento.
    expect(() =>
      aplicarTrocaDeExercicio(
        plano,
        { dia_indice: 0, exercicio_indice: 0, exercicio_nome: 'Mesa flexora' },
        CATALOGO,
        80,
      ),
    ).toThrowError(/mesmo músculo/);
  });

  it('permite troca cross-músculo no fallback (músculo sem outra opção)', () => {
    const plano = planoCom(exercicioDoPlano('Mesa flexora', 'pernas'));
    // Único posterior do catálogo está em uso → vale o grupo inteiro.
    const resultado = aplicarTrocaDeExercicio(
      plano,
      { dia_indice: 0, exercicio_indice: 0, exercicio_nome: 'Elevação pélvica' },
      CATALOGO,
      80,
    );
    expect(resultado.dias_da_semana[0].exercicios[0].nome).toBe('Elevação pélvica');
  });

  it('continua rejeitando troca entre grupos diferentes', () => {
    const plano = planoCom(exercicioDoPlano('Agachamento livre', 'pernas'));
    const catalogoCruzado: ModeloExercicio[] = [
      ...CATALOGO,
      { nome: 'Supino reto', grupo: 'peito', tipo: 'composto', series: 4, repeticoes_min: 8, repeticoes_max: 12, descanso_segundos: 90, percentual_carga_peso_corporal: 0.5, dicas: '' },
    ];
    expect(() =>
      aplicarTrocaDeExercicio(
        plano,
        { dia_indice: 0, exercicio_indice: 0, exercicio_nome: 'Supino reto' },
        catalogoCruzado,
        80,
      ),
    ).toThrowError(/mesmo grupo/);
  });
});
