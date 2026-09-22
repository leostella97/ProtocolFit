/**
 * copiar-modelos.mjs
 * ---------------------------------------------------------------------------
 * Prepara o modo navegador (site estático publicado no GitHub Pages):
 *
 *  1) Copia os modelos JSON MESTRES de `apps/api/modelos` para
 *     `apps/web/public/modelos` — assim eles ficam acessíveis por HTTP como
 *     conteúdo estático e o motor do navegador consegue carregá-los.
 *  2) Gera o `indice.json` com os dias disponíveis por modalidade/objetivo,
 *     permitindo o fallback determinístico sem precisar listar diretórios
 *     (impossível de fazer via HTTP).
 *
 * Uso: node scripts/copiar-modelos.mjs  (executado automaticamente no build:pages)
 * ---------------------------------------------------------------------------
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Caminhos de origem (modelos mestres do backend) e destino (arquivos públicos).
const RAIZ_DO_ARQUIVO = dirname(fileURLToPath(import.meta.url));
const ORIGEM = join(RAIZ_DO_ARQUIVO, '..', '..', 'api', 'modelos');
const DESTINO = join(RAIZ_DO_ARQUIVO, '..', 'public', 'modelos');

// Modalidades e objetivos do sistema.
const MODALIDADES = ['academia', 'pesocorporal'];
const OBJETIVOS = ['emagrecimento', 'hipertrofia', 'corrida'];

/** Cria a pasta de destino (recursivamente). */
mkdirSync(DESTINO, { recursive: true });

/** Estrutura do índice gerado. */
const indice = { treinos: {}, dietas: [] };

// ---- 1) Treinos: copia os arquivos Xdias.json e monta o índice -------------
for (const modalidade of MODALIDADES) {
  indice.treinos[modalidade] = {};
  for (const objetivo of OBJETIVOS) {
    // Pasta de origem: modelos/treinos/{modalidade}/{objetivo}
    const pastaOrigem = join(ORIGEM, 'treinos', modalidade, objetivo);
    if (!existsSync(pastaOrigem)) {
      console.warn(`[modelos] pasta ausente: ${pastaOrigem}`);
      continue;
    }
    // Pasta de destino equivalente.
    const pastaDestino = join(DESTINO, 'treinos', modalidade, objetivo);
    mkdirSync(pastaDestino, { recursive: true });

    // Copia apenas os arquivos "Ndias.json" e registra os dias no índice.
    const arquivos = readdirSync(pastaOrigem).filter((nome) => /^\d+dias\.json$/.test(nome));
    const diasDisponiveis = [];
    for (const arquivo of arquivos) {
      copyFileSync(join(pastaOrigem, arquivo), join(pastaDestino, arquivo));
      diasDisponiveis.push(Number(arquivo.split('dias')[0]));
    }
    // Ordena os dias para o fallback determinístico.
    indice.treinos[modalidade][objetivo] = diasDisponiveis.sort((a, b) => a - b);
    console.log(`[modelos] treinos/${modalidade}/${objetivo}: ${diasDisponiveis.length} arquivo(s)`);
  }
}

// ---- 2) Dietas: copia os arquivos por objetivo -----------------------------
const pastaDietasOrigem = join(ORIGEM, 'dietas');
const pastaDietasDestino = join(DESTINO, 'dietas');
mkdirSync(pastaDietasDestino, { recursive: true });
for (const objetivo of OBJETIVOS) {
  const arquivo = `${objetivo}.json`;
  if (!existsSync(join(pastaDietasOrigem, arquivo))) {
    console.warn(`[modelos] dieta ausente: ${arquivo}`);
    continue;
  }
  copyFileSync(join(pastaDietasOrigem, arquivo), join(pastaDietasDestino, arquivo));
  indice.dietas.push(objetivo);
  console.log(`[modelos] dietas/${arquivo} copiado`);
}

// ---- 3) Grava o índice usado pelo carregador no navegador -----------------
writeFileSync(join(DESTINO, 'indice.json'), JSON.stringify(indice, null, 2), 'utf-8');
console.log(`[modelos] indice.json gerado com ${indice.dietas.length} dietas`);
