/**
 * grafico-macros.tsx
 * ---------------------------------------------------------------------------
 * Gráfico de pizza (recharts) da distribuição de macronutrientes da dieta.
 * Mostra proteínas, carboidratos e gorduras com as cores da marca e um
 * rótulo central com a meta calórica diária.
 * ---------------------------------------------------------------------------
 */
'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { CORES_DOS_MACROS, NOMES_DOS_MACROS } from '@/lib/constantes';
import type { MetaDaDieta } from '@/lib/tipos';

/** Fatia da pizza — dado simples exigido pelo recharts (sem "any"). */
interface FatiaDosMacros {
  /** Nome do macronutriente (ex.: "Proteínas"). */
  nome: string;
  /** Quantidade em gramas. */
  valor: number;
}

/** Propriedades do gráfico de macronutrientes. */
interface PropriedadesDoGraficoMacros {
  /** Metas nutricionais calculadas pelo motor determinístico. */
  meta: MetaDaDieta;
}

/** Gráfico de pizza da distribuição de macronutrientes (recharts). */
export function GraficoMacros({ meta }: PropriedadesDoGraficoMacros) {
  // Valores das três macros na mesma ordem de NOMES_DOS_MACROS.
  const valoresDosMacros: number[] = [meta.proteinas_g, meta.carboidratos_g, meta.gorduras_g];

  // Monta as fatias do gráfico (nome + valor em gramas).
  const dados: FatiaDosMacros[] = NOMES_DOS_MACROS.map((nome, indice) => ({
    nome,
    valor: valoresDosMacros[indice],
  }));

  return (
    // Container relativo: pizza responsiva + rótulo central absoluto por cima.
    <div className="relative h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {/* Pizza estilo "rosca" com fatias levemente espaçadas. */}
          <Pie
            data={dados}
            dataKey="valor"
            nameKey="nome"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={4}
            strokeWidth={2}
          >
            {/* Cada fatia recebe a cor correspondente da paleta de macros. */}
            {dados.map((fatia, indice) => (
              <Cell key={fatia.nome} fill={CORES_DOS_MACROS[indice]} />
            ))}
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
  );
}
