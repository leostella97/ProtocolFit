/**
 * montador-plano.spec.ts — TEAM_009
 * ---------------------------------------------------------------------------
 * Testes de regressão (Jasmine) para montarPlanoTreino do motor do navegador:
 *
 *   1) Exercícios SEM "prescricao_fixa" recebem a regra do objetivo
 *      (ex.: hipertrofia → 4×8–12, 90 s);
 *   2) Exercícios COM "prescricao_fixa": true preservam série/reps/descanso
 *      do modelo (estilos periodizados como DUP, MRT, força de corredor);
 *   3) Exercícios do grupo "cardio" preservam a semântica de tempo/distância
 *      mesmo sem a flag (TEAM_008).
 * ---------------------------------------------------------------------------
 */
import { montarPlanoTreino } from '../apps/web/src/lib/motor/montadorPlano';
import type { ModeloTreino } from '../apps/web/src/lib/motor/tipos-modelos';
import type { Perfil } from '../apps/web/src/lib/tipos';

// Perfil mínimo para os testes — o montador usa objetivo e peso_kg.
const PERFIL: Perfil = {
  id: 1,
  usuario_id: 1,
  sexo: 'masculino',
  faixa_etaria: '19-23',
  peso_kg: 80,
  altura_cm: 175,
  objetivo: 'hipertrofia',
  frequencia_semanal: 3,
  dias_disponiveis: ['segunda', 'quarta', 'sexta'],
  modalidade: 'academia',
  nivel: 'intermediario',
  variacao_treino: null,
};

function modeloCom(exercicios: Partial<ModeloTreino['dias_da_semana'][0]['exercicios'][0]>[]): ModeloTreino {
  return {
    nome: 'Modelo de teste',
    modalidade: 'academia',
    objetivo: 'hipertrofia',
    dias: 1,
    duracao_estimada_min: 60,
    dias_da_semana: [
      {
        titulo: 'Dia 1',
        exercicios: exercicios.map((parcial) => ({
          nome: 'Exercício',
          grupo: 'peito',
          tipo: 'composto',
          series: 5,
          repeticoes_min: 4,
          repeticoes_max: 6,
          descanso_segundos: 180,
          percentual_carga_peso_corporal: 0.5,
          dicas: 'Dica.',
          ...parcial,
        })),
      },
    ],
  };
}

describe('montarPlanoTreino — prescricao_fixa (TEAM_009)', () => {
  it('exercício sem a flag recebe a regra do objetivo (hipertrofia 4×8–12/90 s)', () => {
    const plano = montarPlanoTreino(modeloCom([{}]), PERFIL);
    const exercicio = plano.dias_da_semana[0].exercicios[0];
    expect(exercicio.series).toBe(4);
    expect(exercicio.repeticoes_min).toBe(8);
    expect(exercicio.repeticoes_max).toBe(12);
    expect(exercicio.descanso_segundos).toBe(90);
  });

  it('exercício com prescricao_fixa preserva a prescrição do modelo', () => {
    const plano = montarPlanoTreino(modeloCom([{ prescricao_fixa: true }]), PERFIL);
    const exercicio = plano.dias_da_semana[0].exercicios[0];
    expect(exercicio.series).toBe(5);
    expect(exercicio.repeticoes_min).toBe(4);
    expect(exercicio.repeticoes_max).toBe(6);
    expect(exercicio.descanso_segundos).toBe(180);
  });

  it('cardio mantém tempo/distância do modelo sem a flag (TEAM_008)', () => {
    const plano = montarPlanoTreino(
      modeloCom([{ grupo: 'cardio', tipo: 'cardio', series: 1, repeticoes_min: 20, repeticoes_max: 30, distancia_km: 5 }]),
      PERFIL,
    );
    const exercicio = plano.dias_da_semana[0].exercicios[0];
    expect(exercicio.series).toBe(1);
    expect(exercicio.repeticoes_min).toBe(20);
    expect(exercicio.repeticoes_max).toBe(30);
    expect(exercicio.distancia_km).toBe(5);
  });

  it('carga sugerida usa a fração do peso corporal mesmo com prescricao_fixa', () => {
    const plano = montarPlanoTreino(modeloCom([{ prescricao_fixa: true }]), PERFIL);
    // 80 kg × 0,5 = 40 kg (já múltiplo de 2,5).
    expect(plano.dias_da_semana[0].exercicios[0].carga_sugerida_kg).toBe(40);
  });
});
