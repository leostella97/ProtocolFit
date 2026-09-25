/**
 * copiar-modelos.mjs
 * ---------------------------------------------------------------------------
 * Prepara o modo navegador (site estático publicado no GitHub Pages):
 *
 *  1) Copia os modelos JSON MESTRES de `apps/api/modelos` para
 *     `apps/web/public/modelos` — assim eles ficam acessíveis por HTTP como
 *     conteúdo estático e o motor do navegador consegue carregá-los.
 *  2) Gera o `indice.json` com os dias disponíveis por modalidade/objetivo e
 *     com a lista de VARIAÇÕES (estilos de treino) de cada combinação,
 *     permitindo o fallback determinístico e o seletor de estilo da interface
 *     sem precisar listar diretórios (impossível de fazer via HTTP).
 *
 * Convenção de nomes dos modelos de treino:
 *   • "{dias}dias.json"            → estilo PADRÃO (id "padrao")
 *   • "{dias}dias-{slug}.json"     → estilo alternativo (id = slug)
 *
 * Uso: node scripts/copiar-modelos.mjs  (executado automaticamente no build:pages)
 * ---------------------------------------------------------------------------
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Caminhos de origem (modelos mestres do backend) e destino (arquivos públicos).
const RAIZ_DO_ARQUIVO = dirname(fileURLToPath(import.meta.url));
const ORIGEM = join(RAIZ_DO_ARQUIVO, '..', '..', 'api', 'modelos');
const DESTINO = join(RAIZ_DO_ARQUIVO, '..', 'public', 'modelos');

// Modalidades e objetivos do sistema.
const MODALIDADES = ['academia', 'pesocorporal'];
const OBJETIVOS = ['emagrecimento', 'hipertrofia', 'corrida'];

// Reconhece "{dias}dias.json" e "{dias}dias-{slug}.json".
const PADRAO_DO_NOME = /^(\d+)dias(?:-([a-z0-9]+(?:-[a-z0-9]+)*))?\.json$/;

/** Cria a pasta de destino (recursivamente). */
mkdirSync(DESTINO, { recursive: true });

/** Monta o rótulo curto do estilo a partir do nome completo do modelo. */
function rotuloDaVariacao(nomeDoModelo, id) {
  // O estilo padrão é sempre chamado de "Padrão".
  if (id === 'padrao') {
    return 'Padrão';
  }
  // O nome do modelo segue "Rótulo - N Dias (detalhe)": fica só o rótulo.
  const primeiraParte = String(nomeDoModelo ?? '').split(/\s+[—-]\s+/)[0].trim();
  return primeiraParte || id;
}

/** Estrutura do índice gerado. */
const indice = { treinos: {}, variacoes: [], dietas: [] };

// ---- 1) Treinos: copia os arquivos e monta o índice ------------------------
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

    // Copia SÓ os arquivos no padrão oficial (padrão + variações nomeadas).
    const arquivos = readdirSync(pastaOrigem).filter((nome) => PADRAO_DO_NOME.test(nome));
    const diasDisponiveis = [];
    for (const arquivo of arquivos) {
      const [, diasDoNome, slug] = PADRAO_DO_NOME.exec(arquivo);
      const caminhoOrigem = join(pastaOrigem, arquivo);
      // Lê o modelo para conferir a coerência e aproveitar o rótulo/duração.
      const modelo = JSON.parse(readFileSync(caminhoOrigem, 'utf-8'));
      if (modelo.modalidade !== modalidade || modelo.objetivo !== objetivo || modelo.dias !== Number(diasDoNome)) {
        console.warn(`[modelos] ignorado (conteúdo não bate com a pasta/dias): ${modalidade}/${objetivo}/${arquivo}`);
        continue;
      }
      copyFileSync(caminhoOrigem, join(pastaDestino, arquivo));
      // Registra a variação para o seletor de estilo da interface.
      indice.variacoes.push({
        id: slug ?? 'padrao',
        nome: rotuloDaVariacao(modelo.nome, slug ?? 'padrao'),
        arquivo,
        dias: modelo.dias,
        modalidade,
        objetivo,
        duracao_estimada_min: modelo.duracao_estimada_min,
      });
      // Os arquivos PADRÃO definem a matriz de dias do fallback.
      if (!slug) {
        diasDisponiveis.push(modelo.dias);
      }
    }
    // Ordena os dias para o fallback determinístico.
    indice.treinos[modalidade][objetivo] = diasDisponiveis.sort((a, b) => a - b);
    const variacoesDaPasta = indice.variacoes.filter((v) => v.modalidade === modalidade && v.objetivo === objetivo);
    console.log(
      `[modelos] treinos/${modalidade}/${objetivo}: ${diasDisponiveis.length} arquivo(s) padrão, ${variacoesDaPasta.length} estilo(s)`,
    );
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
console.log(
  `[modelos] indice.json gerado com ${indice.variacoes.length} estilo(s) de treino e ${indice.dietas.length} dieta(s)`,
);
