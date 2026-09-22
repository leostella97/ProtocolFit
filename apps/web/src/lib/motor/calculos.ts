/**
 * calculos.ts (motor do navegador)
 * ---------------------------------------------------------------------------
 * MOTOR DE CÁLCULO NUMÉRICO DETERMINÍSTICO rodando no NAVEGADOR.
 *
 * Porta fiel de apps/api/src/motor/calculos.ts: mesmas fórmulas, mesmos
 * fatores e mesmos pisos de segurança. Assim o plano gerado no site
 * publicado (GitHub Pages) é idêntico ao gerado pelo servidor — sem IA e
 * sem chamadas de rede.
 *
 * Fórmula base: Mifflin-St Jeor (1990) para a taxa metabólica basal (TMB).
 * ---------------------------------------------------------------------------
 */
import type { MetaDaDieta, Objetivo, Sexo } from '../tipos';
import { FAIXAS_ETARIAS, MINIMO_CALORIAS_POR_SEXO } from './constantes';

/** Constante da fórmula de Mifflin-St Jeor para homens (+5). */
const AJUSTE_HOMEM = 5;

/** Constante da fórmula de Mifflin-St Jeor para mulheres (-161). */
const AJUSTE_MULHER = -161;

/** Tabela de fatores de atividade física por frequência semanal de treino. */
const FATORES_DE_ATIVIDADE: Record<number, number> = {
  1: 1.2,
  2: 1.375,
  3: 1.55,
  4: 1.725,
  5: 1.725,
  6: 1.9,
  7: 1.9,
};

/** Ajuste percentual aplicado sobre o gasto calórico total conforme o objetivo. */
const AJUSTE_POR_OBJETIVO: Record<Objetivo, number> = {
  emagrecimento: -0.2, // Déficit de 20%
  hipertrofia: 0.1, // Superávit de 10%
  corrida: 0, // Manutenção
};

/** Meta de proteína em gramas por quilo de peso corporal, por objetivo. */
const PROTEINA_G_POR_KG: Record<Objetivo, number> = {
  emagrecimento: 2.0,
  hipertrofia: 1.8,
  corrida: 1.6,
};

/** Percentual das calorias totais destinado às gorduras, por objetivo. */
const GORDURA_PERCENTUAL: Record<Objetivo, number> = {
  emagrecimento: 0.25,
  hipertrofia: 0.3,
  corrida: 0.2,
};

/** Calorias contidas em 1 grama de cada macronutriente. */
const KCAL_POR_GRAMAS = { proteina: 4, carboidrato: 4, gordura: 9 } as const;

/** Mililitros de água por quilo de peso corporal, por objetivo. */
const AGUA_ML_POR_KG: Record<Objetivo, number> = {
  emagrecimento: 35,
  hipertrofia: 35,
  corrida: 40,
};

/** Converte uma faixa etária canônica (ex.: "19-23") na idade representativa. */
export function idadeRepresentativaDaFaixa(valorFaixa: string): number {
  const faixa = FAIXAS_ETARIAS.find((candidata) => candidata.valor === valorFaixa);
  if (!faixa) {
    throw new Error(`Faixa etária desconhecida: ${valorFaixa}`);
  }
  // Usa o ponto médio da faixa (ex.: "18-19" → 19).
  return Math.round((faixa.inicio + faixa.fim) / 2);
}

/** Calcula a Taxa Metabólica Basal pela fórmula de Mifflin-St Jeor. */
export function calcularTMB(sexo: Sexo, pesoKg: number, alturaCm: number, idade: number): number {
  // Base comum: 10 x peso + 6,25 x altura - 5 x idade.
  const base = 10 * pesoKg + 6.25 * alturaCm - 5 * idade;
  // Homens somam +5; mulheres subtraem -161.
  const ajuste = sexo === 'masculino' ? AJUSTE_HOMEM : AJUSTE_MULHER;
  return Math.round(base + ajuste);
}

/** Devolve o fator de atividade pela frequência semanal de treino. */
export function fatorDeAtividade(frequenciaSemanal: number): number {
  // Limita a frequência entre 1 e 7 antes de consultar a tabela.
  const frequenciaLimitada = Math.min(Math.max(frequenciaSemanal, 1), 7);
  return FATORES_DE_ATIVIDADE[frequenciaLimitada] ?? 1.375;
}

/** Calcula a meta calórica diária aplicando déficit/superávit sobre o gasto. */
export function calcularMetaCalorica(tmb: number, fator: number, objetivo: Objetivo, sexo: Sexo): number {
  // Gasto calórico total (TDEE) = TMB x fator de atividade.
  const gastoTotal = tmb * fator;
  // Aplica o ajuste percentual do objetivo.
  const metaBruta = gastoTotal * (1 + AJUSTE_POR_OBJETIVO[objetivo]);
  // Nunca prescreve abaixo do piso de segurança do sexo.
  return Math.round(Math.max(metaBruta, MINIMO_CALORIAS_POR_SEXO[sexo]));
}

/** Calcula o Índice de Massa Corporal (IMC) com uma casa decimal. */
export function calcularIMC(pesoKg: number, alturaCm: number): number {
  // Converte a altura de centímetros para metros.
  const alturaMetros = alturaCm / 100;
  return Math.round((pesoKg / (alturaMetros * alturaMetros)) * 10) / 10;
}

/** Classifica o IMC conforme os pontos de corte da OMS. */
export function classificarIMC(imc: number): string {
  if (imc < 18.5) {
    return 'Abaixo do peso';
  }
  if (imc < 25) {
    return 'Peso adequado';
  }
  if (imc < 30) {
    return 'Sobrepeso';
  }
  return 'Obesidade';
}

/** Arredonda uma carga para o múltiplo de 2,5 kg mais próximo (anilhas comuns). */
export function arredondarCarga(valorKg: number): number {
  return Math.round(valorKg / 2.5) * 2.5;
}

/**
 * Calcula o plano nutricional COMPLETO para um perfil — ponto de entrada do
 * motor (idêntico ao usado no backend).
 */
export function calcularPlanoNutricional(perfil: {
  sexo: Sexo;
  peso_kg: number;
  altura_cm: number;
  faixa_etaria: string;
  objetivo: Objetivo;
  frequencia_semanal: number;
}): MetaDaDieta {
  // Idade representativa da faixa etária selecionada.
  const idade = idadeRepresentativaDaFaixa(perfil.faixa_etaria);
  // Taxa metabólica basal (Mifflin-St Jeor).
  const tmb = calcularTMB(perfil.sexo, perfil.peso_kg, perfil.altura_cm, idade);
  // Fator de atividade pela frequência semanal.
  const fator = fatorDeAtividade(perfil.frequencia_semanal);
  // Gasto calórico total estimado.
  const gastoTotal = tmb * fator;
  // Meta calórica com ajuste do objetivo e piso de segurança.
  const metaKcal = calcularMetaCalorica(tmb, fator, perfil.objetivo, perfil.sexo);
  // 1) Proteína: gramas por quilo definidos pelo objetivo.
  const proteinasGramas = Math.round(perfil.peso_kg * PROTEINA_G_POR_KG[perfil.objetivo]);
  // 2) Gordura: percentual das calorias totais convertido para gramas.
  const gordurasGramas = Math.round((metaKcal * GORDURA_PERCENTUAL[perfil.objetivo]) / KCAL_POR_GRAMAS.gordura);
  // 3) Carboidrato: preenche o restante das calorias da meta.
  const carboidratosGramas = Math.round(
    Math.max(0, metaKcal - proteinasGramas * KCAL_POR_GRAMAS.proteina - gordurasGramas * KCAL_POR_GRAMAS.gordura) /
      KCAL_POR_GRAMAS.carboidrato,
  );
  // 4) Fibras: 14 g por 1000 kcal, limitadas entre 25 g e 40 g.
  const fibrasGramas = Math.min(40, Math.max(25, Math.round(14 * (metaKcal / 1000))));
  // 5) Água: mililitros por quilo conforme o objetivo.
  const aguaMl = Math.round(perfil.peso_kg * AGUA_ML_POR_KG[perfil.objetivo]);
  // Índice de massa corporal e classificação.
  const imc = calcularIMC(perfil.peso_kg, perfil.altura_cm);
  return {
    meta_kcal: metaKcal,
    proteinas_g: proteinasGramas,
    carboidratos_g: carboidratosGramas,
    gorduras_g: gordurasGramas,
    fibras_g: fibrasGramas,
    agua_ml: aguaMl,
    tmb,
    gasto_total: Math.round(gastoTotal),
    imc,
    classificacao_imc: classificarIMC(imc),
  };
}
