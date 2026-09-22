/**
 * grafico-evolucao-peso.tsx
 * ---------------------------------------------------------------------------
 * Gráfico de linha (recharts) da evolução de peso do usuário.
 * Recebe o histórico de pesagens e desenha a curva com a cor esmeralda da
 * marca. Sem dados, exibe estado vazio amigável com atalho para o perfil.
 * ---------------------------------------------------------------------------
 */
'use client';

import Link from 'next/link';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CORES_DO_GRAFICO } from '@/lib/constantes';
import type { RegistroEvolucao } from '@/lib/tipos';
import { formatarData } from '@/lib/util';

/** Ponto do gráfico — dado simples exigido pelo recharts (sem "any"). */
interface PontoDaEvolucao {
  /** Data da pesagem no formato ISO (AAAA-MM-DD). */
  data: string;
  /** Peso registrado em kg. */
  peso: number;
}

/** Propriedades do gráfico de evolução de peso. */
interface PropriedadesDoGraficoEvolucao {
  /** Histórico de pesagens em ordem cronológica. */
  registros: RegistroEvolucao[];
}

/** Gráfico de linha da evolução de peso (recharts). */
export function GraficoEvolucaoPeso({ registros }: PropriedadesDoGraficoEvolucao) {
  // Mapeia os registros para o formato simples aceito pelo recharts.
  const dados: PontoDaEvolucao[] = registros.map((registro) => ({
    data: registro.data,
    peso: registro.peso_kg,
  }));

  // Sem pesagens ainda: orienta o usuário com link para o perfil.
  if (dados.length === 0) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center">
        <p className="text-sm font-semibold text-foreground">Nenhuma pesagem registrada ainda.</p>
        <p className="text-sm text-muted-foreground">
          Registre sua primeira pesagem para acompanhar a evolução.
        </p>
        <Link
          href="/painel/perfil"
          className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Registre sua primeira pesagem
        </Link>
      </div>
    );
  }

  return (
    // Altura fixa com container responsivo (preenche a largura do cartão).
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dados} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          {/* Grade pontilhada sutil ao fundo do gráfico. */}
          <CartesianGrid strokeDasharray="3 3" />
          {/* Eixo X com as datas formatadas no padrão brasileiro. */}
          <XAxis dataKey="data" tickFormatter={formatarData} tick={{ fontSize: 12 }} />
          {/* Eixo Y automático (ajusta-se ao intervalo dos pesos). */}
          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} />
          {/* Tooltip padrão com data e peso do ponto. */}
          <Tooltip />
          {/* Curva do peso na cor esmeralda da marca. */}
          <Line
            type="monotone"
            dataKey="peso"
            stroke={CORES_DO_GRAFICO.peso}
            strokeWidth={3}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
