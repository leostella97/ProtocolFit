/**
 * next.config.ts
 * ---------------------------------------------------------------------------
 * Configuração do Next.js 15 (App Router) do ProtocolFit — funciona em DOIS
 * cenários de publicação:
 *
 *  1) MODO SERVIDOR (padrão): `output: 'standalone'` gera um servidor enxuto
 *     usado pela imagem Docker (VPS/Render/Railway) junto da API Fastify.
 *
 *  2) MODO NAVEGADOR (MODO_PAGES=true): `output: 'export'` gera um site
 *     TOTALMENTE ESTÁTICO (HTML/CSS/JS) para o GitHub Pages. Nesse modo o
 *     motor de cálculo e o banco de dados rodam no próprio navegador do
 *     visitante — não é necessária nenhuma API.
 * ---------------------------------------------------------------------------
 */
import type { NextConfig } from 'next';

/** Indica o build para hospedagem estática (GitHub Pages). */
const modoPaginas = process.env.MODO_PAGES === 'true';

/** Prefixo de caminho público (no GitHub Pages o site fica em /ProtocolFit). */
const caminhoBase = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** Configuração do Next.js conforme o modo de publicação. */
const proximaConfiguracao: NextConfig = modoPaginas
  ? {
      // Site estático: nenhum servidor Node é necessário.
      output: 'export',
      // Todas as rotas viram pastas com index.html (ex.: /painel/index.html).
      trailingSlash: true,
      // Prefixo do projeto no GitHub Pages (ex.: /ProtocolFit).
      basePath: caminhoBase,
      assetPrefix: caminhoBase || undefined,
      // Otimização de imagens exige servidor: desativada no modo estático.
      images: { unoptimized: true },
    }
  : {
      // Servidor standalone para a imagem Docker de produção.
      output: 'standalone',
    };

export default proximaConfiguracao;
