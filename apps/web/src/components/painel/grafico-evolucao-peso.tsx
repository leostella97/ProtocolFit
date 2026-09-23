/**
 * grafico-evolucao-peso.tsx
 * ---------------------------------------------------------------------------
 * Gráfico de linha (recharts) da evolução de peso do usuário.
 * Recebe o histórico de pesagens e desenha a curva com a cor esmeralda da
 * marca. Abaixo do gráfico mostra a PROGRESSÃO: variação desde a primeira
 * pesagem (seta de tendência) e a última pesagem registrada.
 * Sem dados, exibe estado vazio amigável com atalho para registrar a
 * primeira pesagem (o formulário fica logo abaixo, no cartão do painel).
 * ---------------------------------------------------------------------------
 */
'use client';

import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
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
import { formatarData, formatarDecimal } from '@/lib/util';

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

  // Sem pesagens ainda: orienta o usuário a registrar a primeira pesagem.
  if (dados.length === 0) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center">
        <p className="text-sm font-semibold text-foreground">Nenhuma pesagem registrada ainda.</p>
        <p className="text-sm text-muted-foreground">
          Registre sua primeira pesagem no formulário abaixo para acompanhar a evolução.
        </p>
        <Link
          href="/painel/perfil"
          className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Ou registre na página Meu perfil
        </Link>
      </div>
    );
  }

  // PROGRESSÃO: primeira x última pesagem registradas.
  const primeira = registros[0];
  const ultima = registros[registros.length - 1];
  const variacao = primeira && ultima ? ultima.peso_kg - primeira.peso_kg : 0;

  return (
    <div className="space-y-3">
      {/* Altura fixa com container responsivo (preenche a largura do cartão). */}
      <div className="h-64 w-full">
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

      {/* Progressão textual: tendência desde a primeira pesagem + última pesagem. */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {variacao < 0 ? (
            <TrendingDown className="size-4 shrink-0 text-primary" />
          ) : variacao > 0 ? (
            <TrendingUp className="size-4 shrink-0 text-amber-600" />
          ) : (
            <Minus className="size-4 shrink-0 text-muted-foreground" />
          )}
          {variacao === 0
            ? 'Peso estável desde a primeira pesagem'
            : `${formatarDecimal(Math.abs(variacao))} kg ${variacao < 0 ? 'eliminados' : 'ganhos'} desde a primeira pesagem`}
        </span>
        {ultima ? (
          <span className="font-medium text-foreground">
            Última: {formatarDecimal(ultima.peso_kg)} kg · {formatarData(ultima.data)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
