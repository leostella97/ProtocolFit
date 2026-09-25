/**
 * verificar-pwa.mjs
 * ---------------------------------------------------------------------------
 * Verifica se o pacote PUBLICADO (apps/web/out) está realmente instalável
 * como aplicativo (PWA) e se o código do Google AdSense está no <head> de
 * TODAS as páginas. Roda automaticamente no fim do `build:pages`, então
 * qualquer regressão no PWA ou nos anúncios quebra o build (e o GitHub
 * Actions avisa).
 *
 * Confere:
 *  1) existência do manifesto, do service worker e de todos os ícones;
 *  2) manifesto é JSON válido e tem os campos obrigatórios (name, start_url,
 *     display: standalone, tema e ícones 192/512 + maskable);
 *  3) a página inicial referencia o manifesto, a cor do tema e o ícone do iOS;
 *  4) o script do Google AdSense aparece dentro do <head> de cada HTML;
 *  5) o ads.txt do AdSense está na raiz do site publicado.
 *
 * Uso: node scripts/verificar-pwa.mjs
 * ---------------------------------------------------------------------------
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Pasta com o site exportado. */
const SAIDA = join(dirname(fileURLToPath(import.meta.url)), '..', 'out');

/** Identificador do publisher do Google AdSense esperado em todas as páginas. */
const ID_ADSENSE = 'ca-pub-2430276497312227';

/** Mesmo publisher no formato usado pelo ads.txt (sem o prefixo "ca-"). */
const ID_ADSENSE_NO_ADS_TXT = ID_ADSENSE.replace(/^ca-/, '');

/** Lista de problemas encontrados. */
const problemas = [];

/** Verifica a existência de um arquivo do pacote. */
function exigirArquivo(nome) {
  if (!existsSync(join(SAIDA, nome))) {
    problemas.push(`arquivo ausente: ${nome}`);
    return false;
  }
  return true;
}

// ---- 1) Arquivos obrigatórios ---------------------------------------------
const ARQUIVOS = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'apple-touch-icon.png',
  'favicon.png',
];
for (const arquivo of ARQUIVOS) {
  exigirArquivo(arquivo);
}

// ---- 2) Conteúdo do manifesto ---------------------------------------------
if (existsSync(join(SAIDA, 'manifest.webmanifest'))) {
  try {
    const manifesto = JSON.parse(readFileSync(join(SAIDA, 'manifest.webmanifest'), 'utf-8'));
    if (!manifesto.name) problemas.push('manifesto sem "name"');
    if (!manifesto.short_name) problemas.push('manifesto sem "short_name"');
    if (!manifesto.start_url) problemas.push('manifesto sem "start_url"');
    if (manifesto.display !== 'standalone') problemas.push('manifesto sem display "standalone"');
    if (!manifesto.theme_color) problemas.push('manifesto sem "theme_color"');
    if (!manifesto.background_color) problemas.push('manifesto sem "background_color"');

    // Confere os tamanhos de ícone exigidos para instalação.
    const tamanhos = (manifesto.icons ?? []).map((icone) => icone.sizes);
    if (!tamanhos.includes('192x192')) problemas.push('manifesto sem ícone 192x192');
    if (!tamanhos.includes('512x512')) problemas.push('manifesto sem ícone 512x512');
    const temMaskable = (manifesto.icons ?? []).some((icone) => String(icone.purpose ?? '').includes('maskable'));
    if (!temMaskable) problemas.push('manifesto sem ícone "maskable" (Android)');

    // Cada ícone do manifesto precisa existir no pacote.
    for (const icone of manifesto.icons ?? []) {
      if (!existsSync(join(SAIDA, String(icone.src)))) {
        problemas.push(`ícone do manifesto ausente no pacote: ${icone.src}`);
      }
    }
  } catch (erro) {
    problemas.push(`manifesto inválido (JSON): ${erro.message}`);
  }
}

// ---- 3) Referências na página inicial -------------------------------------
if (existsSync(join(SAIDA, 'index.html'))) {
  const html = readFileSync(join(SAIDA, 'index.html'), 'utf-8');
  if (!/rel="manifest"/.test(html)) problemas.push('index.html sem <link rel="manifest">');
  if (!/name="theme-color"/.test(html)) problemas.push('index.html sem <meta name="theme-color">');
  if (!/apple-touch-icon/.test(html)) problemas.push('index.html sem apple-touch-icon (iOS)');
}

// ---- 4) Google AdSense: script no <head> de TODAS as páginas exportadas ----
/**
 * Lista recursivamente todos os arquivos .html do site exportado.
 * Cada rota do App Router vira uma pasta com index.html (ex.: painel/index.html).
 */
function listarPaginasHtml(pasta) {
  const paginas = [];
  for (const entrada of readdirSync(pasta, { withFileTypes: true })) {
    const caminho = join(pasta, entrada.name);
    if (entrada.isDirectory()) {
      paginas.push(...listarPaginasHtml(caminho));
    } else if (entrada.name.endsWith('.html')) {
      paginas.push(caminho);
    }
  }
  return paginas;
}

if (existsSync(SAIDA)) {
  const paginas = listarPaginasHtml(SAIDA);
  if (paginas.length === 0) {
    problemas.push('nenhuma página HTML encontrada no pacote exportado');
  }
  for (const pagina of paginas) {
    const html = readFileSync(pagina, 'utf-8');
    // Só o trecho ANTES de </head> conta: é onde o Google exige o código.
    const posicaoDoFimDoHead = html.indexOf('</head>');
    const cabecalho = posicaoDoFimDoHead >= 0 ? html.slice(0, posicaoDoFimDoHead) : '';
    const nomeDaPagina = relative(SAIDA, pagina).replace(/\\/g, '/');
    if (!cabecalho.includes('adsbygoogle.js')) {
      problemas.push(`sem o script do AdSense no <head>: ${nomeDaPagina}`);
    } else if (!cabecalho.includes(ID_ADSENSE)) {
      problemas.push(`script do AdSense com publisher diferente de ${ID_ADSENSE}: ${nomeDaPagina}`);
    }
  }
}

// ---- 5) ads.txt do Google AdSense na raiz do site -------------------------
// O Google exige o arquivo na RAIZ (aqui: /ProtocolFit/ads.txt, que é a raiz
// deste site publicado). A cópia do domínio raiz (leostella97.github.io/ads.txt)
// mora no repositório leostella97.github.io.
const LINHA_ESPERADA_DO_ADS_TXT = `google.com, ${ID_ADSENSE_NO_ADS_TXT}, DIRECT, f08c47fec0942fa0`;
if (existsSync(join(SAIDA, 'ads.txt'))) {
  const conteudo = readFileSync(join(SAIDA, 'ads.txt'), 'utf-8');
  if (!conteudo.includes(LINHA_ESPERADA_DO_ADS_TXT)) {
    problemas.push(`ads.txt sem a linha do publisher: ${LINHA_ESPERADA_DO_ADS_TXT}`);
  }
} else {
  problemas.push('ads.txt ausente na raiz do site publicado');
}

// ---- 6) Service worker: estratégias mínimas -------------------------------
if (existsSync(join(SAIDA, 'sw.js'))) {
  const sw = readFileSync(join(SAIDA, 'sw.js'), 'utf-8');
  if (!/addEventListener\('install'/.test(sw)) problemas.push('sw.js sem evento de install');
  if (!/addEventListener\('fetch'/.test(sw)) problemas.push('sw.js sem evento de fetch (offline)');
}

// ---- Relatório ------------------------------------------------------------
if (problemas.length > 0) {
  console.error('[pwa] FALHA na verificação do aplicativo instalável:');
  for (const problema of problemas) {
    console.error(`  - ${problema}`);
  }
  process.exit(1);
}
console.log(
  '[pwa] OK: manifesto, ícones, service worker, metadados e AdSense (script no <head> de todas as páginas + ads.txt) validados — app instalável e offline.',
);
