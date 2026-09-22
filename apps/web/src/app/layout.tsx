/**
 * layout.tsx
 * ---------------------------------------------------------------------------
 * Layout raiz do ProtocolFit — fontes, metadados e o shell global de todas
 * as páginas do aplicativo.
 * ---------------------------------------------------------------------------
 */
import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { AvisoModoLocal } from '@/components/aviso-modo-local';
import './globals.css';

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

/** Metadados do site (título, descrição e idioma). */
export const metadata: Metadata = {
  title: {
    default: 'ProtocolFit — Seu treino e dieta personalizados em segundos',
    template: '%s | ProtocolFit',
  },
  description:
    'Gere treinos e dietas personalizados com ciência determinística: cálculo exato de calorias e macronutrientes, planos sob medida para o seu corpo e objetivo — 100% gratuito, sem assinatura e sem cartão de crédito.',
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
      </body>
    </html>
  );
}
