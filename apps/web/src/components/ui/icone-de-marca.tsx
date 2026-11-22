/**
 * icone-de-marca.tsx
 * ---------------------------------------------------------------------------
 * Ícones de MARCA (Facebook, Instagram, YouTube) usados nos botões de
 * compartilhamento da conquista e no link de exemplo do treino.
 *
 * TEAM_020: o lucide-react 1.x removeu todos os ícones de marca (breaking
 * change — o projeto upstream descontinuou logos de terceiros). Para manter
 * a mesma linguagem visual dos demais ícones, este módulo reproduz os
 * paths SVG das versões antigas do lucide (stroke 24×24, currentColor),
 * com a mesma assinatura mínima usada no código (`className`).
 * ---------------------------------------------------------------------------
 */
import type { SVGProps } from 'react';
import { combinarClasses } from '@/lib/util';

/** Propriedades aceitas pelos ícones de marca (igual ao uso do lucide). */
type PropriedadesDoIcone = SVGProps<SVGSVGElement>;

/** Base comum: svg 24×24 com stroke herdada do texto — padrão lucide. */
function BaseDoIcone({ className, children, ...propriedades }: PropriedadesDoIcone) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={combinarClasses('size-4', className)}
      {...propriedades}
    >
      {children}
    </svg>
  );
}

/** Logo do Facebook (path da versão 0.x do lucide, mantido para paridade visual). */
export function IconeFacebook(propriedades: PropriedadesDoIcone) {
  return (
    <BaseDoIcone {...propriedades}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </BaseDoIcone>
  );
}

/** Logo do Instagram (path da versão 0.x do lucide). */
export function IconeInstagram(propriedades: PropriedadesDoIcone) {
  return (
    <BaseDoIcone {...propriedades}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </BaseDoIcone>
  );
}

/** Logo do YouTube (path da versão 0.x do lucide). */
export function IconeYoutube(propriedades: PropriedadesDoIcone) {
  return (
    <BaseDoIcone {...propriedades}>
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </BaseDoIcone>
  );
}
