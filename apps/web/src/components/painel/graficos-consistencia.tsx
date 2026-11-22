/**
 * graficos-consistencia.tsx
 * ---------------------------------------------------------------------------
 * TEAM_019: três GRÁFICOS PIZZA de consistência dos últimos 7 dias,
 * calculados a partir dos check-ins diários (ver resumirSemanaDeCheckins):
 *
 *   - FORÇA: sessões com "treino feito" vs a frequência semanal do perfil;
 *   - HIDRATAÇÃO: dias com água ≥ meta diária do plano (peso × ml/kg do
 *     objetivo — regra do motor);
 *   - CARDIO: minutos somados vs a diretriz de 150 min/semana (OMS/ACSM).
 *
 * Cada pizza é uma rosca de duas fatias — "Feito" na cor do indicador e
 * "Restante" em tom neutro — com o percentual no centro e a legenda abaixo.
 * ---------------------------------------------------------------------------
 */
'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { resumirSemanaDeCheckins } from '@/lib/checkin-util';
import { CORES_DO_GRAFICO } from '@/lib/constantes';
import { formatarDecimal } from '@/lib/util';
import type { CheckinDiario } from '@/lib/tipos';

/** Fatia da pizza — dado simples exigido pelo recharts (sem "any"). */
interface FatiaDaConsistencia {
  /** Nome da fatia ("Feito" ou "Restante"). */
  nome: string;
  /** Valor numérico da fatia. */
  valor: number;
}

/** Configuração de uma pizza de consistência. */
interface PizzaDaConsistencia {
  /** Título exibido acima da rosca. */
  titulo: string;
  /** Cor da fatia "Feito". */
  cor: string;
  /** Percentual cumprido (0–100) exibido no centro da rosca. */
  percentual: number;
  /** Fatias da pizza (feito + o que falta para a meta). */
  fatias: FatiaDaConsistencia[];
  /** Legenda detalhada abaixo da pizza (ex.: "3 de 5 sessões"). */
  legenda: string;
}

/** Propriedades do conjunto de pizzas de consistência. */
interface PropriedadesDosGraficosConsistencia {
  /** Últimos check-ins do usuário (mais recentes primeiro). */
  checkins: CheckinDiario[];
  /** Frequência semanal de treino do perfil (meta de sessões de força). */
  frequenciaSemanal: number;
  /** Meta diária de água do plano, em ml (peso × ml/kg do objetivo). */
  metaAguaMl: number;
}

/** Uma pizza individual de consistência (rosca feito × restante). */
function PizzaDeConsistencia({ pizza }: { pizza: PizzaDaConsistencia }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {/* Título do indicador acima da rosca. */}
      <span className="text-sm font-semibold text-foreground">{pizza.titulo}</span>
      {/* Rosca responsiva com o percentual cumprido no centro. */}
      <div className="relative h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pizza.fatias} dataKey="valor" nameKey="nome" innerRadius={34} outerRadius={52} strokeWidth={2}>
              {/* Fatia "Feito" na cor do indicador; "Restante" em tom neutro. */}
              {pizza.fatias.map((fatia) => (
                <Cell
                  key={fatia.nome}
                  fill={fatia.nome === 'Feito' ? pizza.cor : CORES_DO_GRAFICO.restante}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        {/* Percentual central sobreposto à rosca (sem capturar cliques). */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="font-display text-lg font-bold text-foreground">{pizza.percentual}%</span>
        </div>
      </div>
      {/* Legenda com os números reais da aderência. */}
      <span className="text-xs text-muted-foreground">{pizza.legenda}</span>
    </div>
  );
}

/** Conjunto das três pizzas de consistência dos últimos 7 dias. */
export function GraficosConsistencia({ checkins, frequenciaSemanal, metaAguaMl }: PropriedadesDosGraficosConsistencia) {
  // Transforma os check-ins da janela nos três números de aderência (função pura).
  const resumo = resumirSemanaDeCheckins(checkins, frequenciaSemanal, metaAguaMl);

  /** Monta as duas fatias de uma pizza (feito × o que falta para a meta). */
  function montarFatias(feito: number, meta: number): FatiaDaConsistencia[] {
    // O "feito" nunca passa da meta na pizza — excedente vira rosca cheia.
    const feitoCortado = Math.min(Math.max(feito, 0), meta);
    return [
      { nome: 'Feito', valor: feitoCortado },
      { nome: 'Restante', valor: meta - feitoCortado },
    ];
  }

  /** Percentual cumprido arredondado (100 quando a meta é zero ou superada). */
  function percentualDe(feito: number, meta: number): number {
    return meta > 0 ? Math.min(100, Math.round((feito / meta) * 100)) : 0;
  }

  const pizzas: PizzaDaConsistencia[] = [
    {
      titulo: 'Força',
      cor: CORES_DO_GRAFICO.forca,
      percentual: percentualDe(resumo.forca.feito, resumo.forca.meta),
      fatias: montarFatias(resumo.forca.feito, resumo.forca.meta),
      legenda: `${resumo.forca.feito} de ${resumo.forca.meta} sessões`,
    },
    {
      titulo: 'Hidratação',
      cor: CORES_DO_GRAFICO.hidratacao,
      percentual: percentualDe(resumo.hidratacao.diasNaMeta, resumo.hidratacao.dias),
      fatias: montarFatias(resumo.hidratacao.diasNaMeta, resumo.hidratacao.dias),
      legenda: `${resumo.hidratacao.diasNaMeta} de ${resumo.hidratacao.dias} dias na meta`,
    },
    {
      titulo: 'Cardio',
      cor: CORES_DO_GRAFICO.cardio,
      percentual: percentualDe(resumo.cardio.minutos, resumo.cardio.metaMinutos),
      fatias: montarFatias(resumo.cardio.minutos, resumo.cardio.metaMinutos),
      legenda:
        resumo.cardio.km > 0
          ? `${resumo.cardio.minutos} de ${resumo.cardio.metaMinutos} min · ${formatarDecimal(resumo.cardio.km)} km`
          : `${resumo.cardio.minutos} de ${resumo.cardio.metaMinutos} min`,
    },
  ];

  return (
    // As três pizzas lado a lado (empilhadas no celular).
    <div className="grid gap-6 sm:grid-cols-3">
      {pizzas.map((pizza) => (
        <PizzaDeConsistencia key={pizza.titulo} pizza={pizza} />
      ))}
    </div>
  );
}
