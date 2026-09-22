/**
 * servir-paginas.mjs
 * ---------------------------------------------------------------------------
 * Servidor HTTP estático mínimo (sem dependências) usado para testar
 * LOCALMENTE o site exportado para o GitHub Pages, replicando o
 * comportamento da hospedagem:
 *   - resolve diretórios para o index.html correspondente (trailingSlash);
 *   - devolve 404.html quando o arquivo não existe.
 *
 * Uso: node scripts/servir-paginas.mjs <pasta-raiz> [porta]
 * ---------------------------------------------------------------------------
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

// Pasta raiz publicada e porta de escuta (valores padrão sensatos).
const RAIZ = process.argv[2] ?? '.';
const PORTA = Number(process.argv[3] ?? 4173);

/** Tipos de conteúdo usados pelo site. */
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

/** Tenta ler um arquivo, devolvendo null quando ele não existe. */
async function lerSeExistir(caminho) {
  try {
    const info = await stat(caminho);
    if (!info.isFile()) {
      return null;
    }
    return await readFile(caminho);
  } catch {
    return null;
  }
}

createServer(async (requisicao, resposta) => {
  // Remove a query string e normaliza o caminho (evita path traversal).
  const caminhoUrl = decodeURIComponent((requisicao.url ?? '/').split('?')[0]);
  const caminhoSeguro = normalize(caminhoUrl).replace(/^(\.\.[/\\])+/, '');
  const caminhoCompleto = join(RAIZ, caminhoSeguro);

  // 1) Tenta o arquivo exato; 2) tenta <caminho>/index.html; 3) tenta 404.html.
  let conteudo = await lerSeExistir(caminhoCompleto);
  if (!conteudo) {
    conteudo = await lerSeExistir(join(caminhoCompleto, 'index.html'));
  }
  if (!conteudo) {
    conteudo = await lerSeExistir(join(RAIZ, '404.html'));
    if (conteudo) {
      resposta.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      resposta.end(conteudo);
      return;
    }
    resposta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    resposta.end('404 - nao encontrado');
    return;
  }

  // Define o tipo de conteúdo pela extensão do caminho pedido.
  const extensao = extname(caminhoCompleto) || '.html';
  resposta.writeHead(200, { 'Content-Type': TIPOS[extensao] ?? 'application/octet-stream' });
  resposta.end(conteudo);
}).listen(PORTA, () => {
  console.log(`Servindo "${RAIZ}" em http://localhost:${PORTA}/`);
});
