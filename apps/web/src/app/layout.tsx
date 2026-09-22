/**
 * layout.tsx
 * ---------------------------------------------------------------------------
 * Layout raiz do ProtocolFit — fontes, metadados, PWA (manifesto + ícones +
 * service worker) e o shell global de todas as páginas do aplicativo.
 * ---------------------------------------------------------------------------
 */
import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { AvisoModoLocal } from '@/components/aviso-modo-local';
import { ProvedorPwa } from '@/components/pwa/provedor-pwa';
import './globals.css';

/** Caminho base do site (vazio em dev, "/ProtocolFit" no GitHub Pages). */
const CAMINHO_BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** Fonte de texto: Inter — legibilidade máxima em telas. */
const fonteInter = Inter({
  subsets: ['latin'],
  variable: '--fonte-inter',
  display: 'swap',
});

/** Fonte de títulos: Plus Jakarta Sans — personalidade e energia. */
const fonteJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--fonte-jakarta',
  display: 'swap',
});

/** Metadados do site (título, descrição, PWA e ícones). */
export const metadata: Metadata = {
  title: {
    default: 'ProtocolFit — Seu treino e dieta personalizados em segundos',
    template: '%s | ProtocolFit',
  },
  description:
    'Gere treinos e dietas personalizados com ciência determinística: cálculo exato de calorias e macronutrientes, planos sob medida para o seu corpo e objetivo — 100% gratuito, sem assinatura e sem cartão de crédito.',
  // Nome exibido em instalações e no sistema operacional.
  applicationName: 'ProtocolFit',
  // Manifesto do PWA (permite instalar como aplicativo).
  manifest: `${CAMINHO_BASE}/manifest.webmanifest`,
  // Ícones do site e do aplicativo instalado.
  icons: {
    icon: [
      { url: `${CAMINHO_BASE}/favicon.png`, sizes: '32x32', type: 'image/png' },
      { url: `${CAMINHO_BASE}/icon-192.png`, sizes: '192x192', type: 'image/png' },
      { url: `${CAMINHO_BASE}/icon-512.png`, sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: `${CAMINHO_BASE}/apple-touch-icon.png`, sizes: '180x180', type: 'image/png' }],
  },
  // Configuração para instalação em iPhone/iPad (tela inicial).
  appleWebApp: {
    capable: true,
    title: 'ProtocolFit',
    statusBarStyle: 'default',
  },
};

/** Configuração da janela (cor da barra do navegador no celular). */
export const viewport: Viewport = {
  themeColor: '#10a37f',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/** Componente raiz: aplica fontes e renderiza as páginas filhas. */
export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: extensões de navegador (ex.: ColorZilla) injetam
    // atributos próprios no <html>/<body> (ex.: cz-shortcut-listen="true") após o
    // React hidratar — o aviso evita o erro de "hydration mismatch" causado por
    // esses atributos externos, sem afetar o comportamento da aplicação.
    <html
      lang="pt-BR"
      className={`${fonteInter.variable} ${fonteJakarta.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh font-sans antialiased" suppressHydrationWarning>
        {/* Faixa informativa exibida apenas no modo navegador (GitHub Pages). */}
        <AvisoModoLocal />
        {children}
        {/* Service worker + aviso para instalar o aplicativo (PWA). */}
        <ProvedorPwa />
      </body>
    </html>
  );
}
