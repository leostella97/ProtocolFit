/**
 * util.ts
 * ---------------------------------------------------------------------------
 * Utilitários gerais do frontend do ProtocolFit.
 * ---------------------------------------------------------------------------
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Combina classes Tailwind resolvendo conflitos (padrão shadcn/ui). */
export function combinarClasses(...entradas: ClassValue[]): string {
  return twMerge(clsx(entradas));
}

/** Formata um número como moeda brasileira (R$). */
export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Formata uma data ISO (AAAA-MM-DD) para o padrão brasileiro (DD/MM/AAAA). */
export function formatarData(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Formata um número com vírgula decimal brasileira e uma casa. */
export function formatarDecimal(valor: number): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Rótulo amigável de um objetivo. */
export function rotuloDoObjetivo(objetivo: string): string {
  const rotulos: Record<string, string> = {
    emagrecimento: 'Emagrecimento',
    hipertrofia: 'Hipertrofia',
    corrida: 'Corrida',
  };
  return rotulos[objetivo] ?? objetivo;
}

/** Rótulo amigável de uma modalidade. */
export function rotuloDaModalidade(modalidade: string): string {
  const rotulos: Record<string, string> = {
    academia: 'Academia',
    pesocorporal: 'Peso do corpo',
  };
  return rotulos[modalidade] ?? modalidade;
}

/** Rótulo amigável de um dia da semana (valor canônico → "Segunda"). */
export function rotuloDoDia(valorDia: string): string {
  const rotulos: Record<string, string> = {
    segunda: 'Segunda',
    terca: 'Terça',
    quarta: 'Quarta',
    quinta: 'Quinta',
    sexta: 'Sexta',
    sabado: 'Sábado',
    domingo: 'Domingo',
  };
  return rotulos[valorDia] ?? valorDia;
}
