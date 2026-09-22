/**
 * next.config.ts
 * ---------------------------------------------------------------------------
 * Configuração do Next.js 15 (App Router) do ProtocolFit.
 * `output: 'standalone'` gera um servidor enxuto (server.js + dependências)
 * usado pela imagem Docker de produção — sem Node extra no container.
 * ---------------------------------------------------------------------------
 */
import type { NextConfig } from 'next';

/** Configuração do Next.js com saída standalone para o Docker. */
const proximaConfiguracao: NextConfig = {
  output: 'standalone',
};

export default proximaConfiguracao;
