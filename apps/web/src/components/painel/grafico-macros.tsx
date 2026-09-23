/**
 * grafico-macros.tsx
 * ---------------------------------------------------------------------------
 * Gráfico de pizza (recharts) da distribuição de macronutrientes da dieta.
 * Mostra CARBOIDRATOS, PROTEÍNAS e GORDURAS com as cores da marca, um rótulo
 * central com a meta calórica e — logo abaixo da pizza — o TEXTO de cada
 * macro com a quantidade em gramas e o percentual do total.
 * ---------------------------------------------------------------------------
 */
'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { CORES_DO_GRAFICO } from '@/lib/constantes';
import type { MetaDaDieta } from '@/lib/tipos';

/** Fatia da pizza — dado simples exigido pelo recharts (sem "any"). */
interface FatiaDosMacros {
  /** Nome do macronutriente (ex.: "Carboidratos"). */
  nome: string;
  /** Quantidade em gramas. */
  valor: number;
}

/** Propriedades do gráfico de macronutrientes. */
interface PropriedadesDoGraficoMacros {
  /** Metas nutricionais calculadas pelo motor determinístico. */
  meta: MetaDaDieta;
}

/**
 * Ordem de exibição pedida: carboidratos, proteínas e gorduras — cada macro
 * mantém a SUA cor (a cor não é posicional, é do nutriente).
 */
const MACROS_EXIBIDOS: { nome: string; cor: string; gramasDe: (meta: MetaDaDieta) => number }[] = [
  { nome: 'Carboidratos', cor: CORES_DO_GRAFICO.carboidrato, gramasDe: (meta) => meta.carboidratos_g },
  { nome: 'Proteínas', cor: CORES_DO_GRAFICO.proteina, gramasDe: (meta) => meta.proteinas_g },
  { nome: 'Gorduras', cor: CORES_DO_GRAFICO.gordura, gramasDe: (meta) => meta.gorduras_g },
];

/** Gráfico de pizza da distribuição de macronutrientes (recharts). */
export function GraficoMacros({ meta }: PropriedadesDoGraficoMacros) {
  // Monta as fatias na ordem de exibição (carboidrato, proteína, gordura).
  const dados: FatiaDosMacros[] = MACROS_EXIBIDOS.map((macro) => ({
    nome: macro.nome,
    valor: macro.gramasDe(meta),
  }));

  // Total de gramas dos três macros (base para o percentual exibido).
  const totalDeGramas = dados.reduce((soma, fatia) => soma + fatia.valor, 0);

  return (
    <div className="space-y-3">
      {/* Container relativo: pizza responsiva + rótulo central absoluto por cima. */}
      <div className="relative h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {/* Pizza estilo "rosca" com fatias levemente espaçadas. */}
            <Pie
              data={dados}
              dataKey="valor"
              nameKey="nome"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={4}
              strokeWidth={2}
            >
              {/* Cada fatia recebe a cor do SEU macronutriente. */}
              {dados.map((fatia) => {
                const macro = MACROS_EXIBIDOS.find((candidata) => candidata.nome === fatia.nome);
                return <Cell key={fatia.nome} fill={macro?.cor ?? CORES_DO_GRAFICO.carboidrato} />;
              })}
            </Pie>
            {/* Legenda com os nomes dos macronutrientes. */}
            <Legend />
            {/* Tooltip com nome e gramas de cada fatia. */}
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        {/* Rótulo central absoluto: meta calórica diária em destaque. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-bold text-foreground">{meta.meta_kcal}</span>
          <span className="text-xs font-medium text-muted-foreground">kcal/dia</span>
        </div>
      </div>

      {/* TEXTO de cada macro: nome, gramas e percentual do total. */}
      <ul className="space-y-1.5 border-t pt-3">
        {dados.map((fatia) => {
          // Cor do macro correspondente (para o pontinho ao lado do nome).
          const macro = MACROS_EXIBIDOS.find((candidata) => candidata.nome === fatia.nome);
          // Percentual em gramas do total diário (0 quando não há meta).
          const percentual = totalDeGramas > 0 ? Math.round((fatia.valor / totalDeGramas) * 100) : 0;
          return (
            <li key={fatia.nome} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 font-medium text-foreground">
                {/* Pontinho colorido com a cor do macronutriente. */}
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: macro?.cor ?? CORES_DO_GRAFICO.carboidrato }}
                />
                {fatia.nome}
              </span>
              {/* Quantidade em gramas e participação percentual. */}
              <span className="text-muted-foreground">
                {fatia.valor} g · {percentual}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
