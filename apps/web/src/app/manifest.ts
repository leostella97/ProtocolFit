/**
 * manifest.ts
 * ---------------------------------------------------------------------------
 * Manifesto do PWA do ProtocolFit — permite INSTALAR o sistema no celular ou
 * no computador (ícone na tela inicial, janela própria sem barra do navegador).
 *
 * Os caminhos são RELATIVOS de propósito: o manifesto é servido em
 * `{basePath}/manifest.webmanifest`, então "icon-192.png" resolve
 * automaticamente tanto em `localhost:3000` quanto em `/ProtocolFit/`.
 * ---------------------------------------------------------------------------
 */
import type { MetadataRoute } from 'next';

// Garante que o manifesto seja gerado como arquivo estático no build.
export const dynamic = 'force-static';

/** Manifesto do aplicativo instalável. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    // Nome completo exibido na instalação.
    name: 'ProtocolFit — Treino e dieta personalizados',
    // Nome curto exibido abaixo do ícone na tela inicial.
    short_name: 'ProtocolFit',
    description:
      'Gere treinos e dietas personalizados com cálculo determinístico: calorias, macronutrientes, fibras e água calculados para o seu corpo e objetivo.',
    // Página inicial ao abrir o app instalado (relativo ao manifesto).
    start_url: '.',
    // Escopo de navegação do app instalado.
    scope: '.',
    // Abre em janela própria (sem a barra de endereço do navegador).
    display: 'standalone',
    // Orientação preferida em celulares.
    orientation: 'portrait',
    // Cores usadas na abertura e na barra de status do sistema.
    background_color: '#f7fbf9',
    theme_color: '#10a37f',
    lang: 'pt-BR',
    dir: 'ltr',
    categories: ['health', 'fitness', 'lifestyle'],
    // Ícones do aplicativo (inclui a versão "maskable" para o Android).
    icons: [
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // Atalhos exibidos ao segurar o ícone do app instalado.
    shortcuts: [
      { name: 'Meu treino', short_name: 'Treino', url: 'painel/treino/' },
      { name: 'Minha dieta', short_name: 'Dieta', url: 'painel/dieta/' },
      { name: 'Meu perfil', short_name: 'Perfil', url: 'painel/perfil/' },
    ],
  };
}
