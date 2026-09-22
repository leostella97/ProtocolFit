/**
 * gerar-icones.mjs
 * ---------------------------------------------------------------------------
 * Gera os ÍCONES do PWA do ProtocolFit sem nenhuma dependência externa:
 * um codificador PNG mínimo (zlib do Node + CRC32) desenha:
 *
 *   - icon-192.png / icon-512.png ............ ícone normal (cantos arredondados)
 *   - icon-maskable-512.png .................. ícone "maskable" (Android corta em círculo)
 *   - apple-touch-icon.png (180x180) ......... ícone do iOS (sem transparência)
 *   - favicon.png (32x32) .................... ícone da aba do navegador
 *
 * A arte é o gradiente da marca (esmeralda → teal) com a LINHA DE PULSO
 * cardíaco em branco, reforçando a identidade de saúde do sistema.
 *
 * Uso: node scripts/gerar-icones.mjs
 * ---------------------------------------------------------------------------
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Pasta de saída dos ícones (public/, servida como conteúdo estático). */
const DESTINO = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
mkdirSync(DESTINO, { recursive: true });

/** Cor inicial do gradiente da marca (verde esmeralda). */
const COR_INICIO = { r: 16, g: 163, b: 127 };

/** Cor final do gradiente da marca (teal). */
const COR_FIM = { r: 20, g: 184, b: 166 };

/** Pontos da linha de pulso cardíaco (coordenadas relativas 0..1). */
const PULSO = [
  [0.14, 0.54],
  [0.33, 0.54],
  [0.41, 0.30],
  [0.50, 0.74],
  [0.58, 0.44],
  [0.66, 0.54],
  [0.86, 0.54],
];

/* ---------------------------------------------------------------------------
 * 1) Codificador PNG mínimo (RGBA, 8 bits)
 * ------------------------------------------------------------------------ */

/** Tabela de CRC32 calculada uma única vez. */
const TABELA_CRC = (() => {
  const tabela = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    tabela[n] = c >>> 0;
  }
  return tabela;
})();

/** Calcula o CRC32 de um buffer (exigido pelo formato PNG). */
function calcularCrc(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = TABELA_CRC[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Monta um chunk PNG (tamanho + tipo + dados + CRC). */
function criarChunk(tipo, dados) {
  const comprimento = Buffer.alloc(4);
  comprimento.writeUInt32BE(dados.length, 0);
  const tipoBuffer = Buffer.from(tipo, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(calcularCrc(Buffer.concat([tipoBuffer, dados])), 0);
  return Buffer.concat([comprimento, tipoBuffer, dados, crc]);
}

/** Converte os pixels RGBA em um arquivo PNG completo. */
function codificarPng(largura, altura, pixels) {
  // Assinatura do formato PNG.
  const assinatura = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  // Cabeçalho IHDR: 8 bits por canal, tipo 6 (RGBA), sem interlacing.
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  // Dados de imagem: cada linha recebe o byte de filtro 0 antes dos pixels.
  const linhas = [];
  for (let y = 0; y < altura; y += 1) {
    linhas.push(Buffer.from([0]));
    linhas.push(pixels.subarray(y * largura * 4, (y + 1) * largura * 4));
  }
  const idat = deflateSync(Buffer.concat(linhas), { level: 9 });
  return Buffer.concat([
    assinatura,
    criarChunk('IHDR', ihdr),
    criarChunk('IDAT', idat),
    criarChunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------------------------------------------------------------------------
 * 2) Desenho do ícone
 * ------------------------------------------------------------------------ */

/** Distância de um ponto a um segmento de reta (para traçar a linha grossa). */
function distanciaAoSegmento(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const comprimentoQuadrado = dx * dx + dy * dy || 1;
  // Projeção do ponto sobre o segmento, limitada entre 0 e 1.
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / comprimentoQuadrado));
  const projecaoX = ax + t * dx;
  const projecaoY = ay + t * dy;
  return Math.hypot(px - projecaoX, py - projecaoY);
}

/** Verifica se o pixel está dentro do retângulo de cantos arredondados. */
function dentroDoRetanguloArredondado(x, y, tamanho, raio) {
  // Coordenadas relativas aos cantos.
  const cx = Math.min(x, tamanho - 1 - x);
  const cy = Math.min(y, tamanho - 1 - y);
  if (cx >= raio || cy >= raio) {
    return true; // região central/bordas retas
  }
  // Cantos: valida a distância até o centro do arco.
  return Math.hypot(raio - cx, raio - cy) <= raio;
}

/**
 * Desenha um ícone do ProtocolFit.
 * @param tamanho lado do ícone em pixels
 * @param opcoes.comTransparencia cantos arredondados transparentes (false = sangrado)
 * @param opcoes.margemDoConteudo fração de margem interna (proteção do maskable)
 */
function desenharIcone(tamanho, opcoes = {}) {
  const comTransparencia = opcoes.comTransparencia ?? true;
  const margem = opcoes.margemDoConteudo ?? 0;
  const pixels = Buffer.alloc(tamanho * tamanho * 4);
  // Raio dos cantos arredondados (22% do lado) e espessura da linha do pulso.
  const raio = tamanho * 0.22;
  const espessura = tamanho * 0.075;

  // Área útil do desenho (descontando a margem de proteção do maskable).
  const inicio = tamanho * margem;
  const areaUtil = tamanho - inicio * 2;

  for (let y = 0; y < tamanho; y += 1) {
    for (let x = 0; x < tamanho; x += 1) {
      const indice = (y * tamanho + x) * 4;

      // Fora do retângulo arredondado: pixel transparente.
      if (comTransparencia && !dentroDoRetanguloArredondado(x, y, tamanho, raio)) {
        pixels[indice] = 0;
        pixels[indice + 1] = 0;
        pixels[indice + 2] = 0;
        pixels[indice + 3] = 0;
        continue;
      }

      // Gradiente diagonal da marca (esmeralda → teal).
      const progresso = (x + y) / (2 * tamanho);
      let r = Math.round(COR_INICIO.r + (COR_FIM.r - COR_INICIO.r) * progresso);
      let g = Math.round(COR_INICIO.g + (COR_FIM.g - COR_INICIO.g) * progresso);
      let b = Math.round(COR_INICIO.b + (COR_FIM.b - COR_INICIO.b) * progresso);

      // Linha de pulso cardíaco: menor distância até qualquer segmento.
      let distanciaMinima = Number.POSITIVE_INFINITY;
      for (let i = 0; i < PULSO.length - 1; i += 1) {
        const [ax, ay] = PULSO[i];
        const [bx, by] = PULSO[i + 1];
        const distancia = distanciaAoSegmento(
          x,
          y,
          inicio + ax * areaUtil,
          inicio + ay * areaUtil,
          inicio + bx * areaUtil,
          inicio + by * areaUtil,
        );
        distanciaMinima = Math.min(distanciaMinima, distancia);
      }

      // Mistura com branco conforme a proximidade da linha (borda suave).
      const metade = espessura / 2;
      if (distanciaMinima <= metade + 1) {
        const intensidade = distanciaMinima <= metade ? 1 : Math.max(0, 1 - (distanciaMinima - metade));
        r = Math.round(r + (255 - r) * intensidade);
        g = Math.round(g + (255 - g) * intensidade);
        b = Math.round(b + (255 - b) * intensidade);
      }

      pixels[indice] = r;
      pixels[indice + 1] = g;
      pixels[indice + 2] = b;
      pixels[indice + 3] = 255;
    }
  }
  return codificarPng(tamanho, tamanho, pixels);
}

/* ---------------------------------------------------------------------------
 * 3) Geração dos arquivos
 * ------------------------------------------------------------------------ */

/** Lista de ícones a gerar (nome do arquivo, tamanho e opções de desenho). */
const ICONES = [
  { arquivo: 'icon-192.png', tamanho: 192, opcoes: { comTransparencia: true } },
  { arquivo: 'icon-512.png', tamanho: 512, opcoes: { comTransparencia: true } },
  // Maskable: fundo sangrado (sem transparência) e conteúdo dentro da zona segura.
  { arquivo: 'icon-maskable-512.png', tamanho: 512, opcoes: { comTransparencia: false, margemDoConteudo: 0.14 } },
  // iOS: sem transparência para evitar bordas pretas.
  { arquivo: 'apple-touch-icon.png', tamanho: 180, opcoes: { comTransparencia: false, margemDoConteudo: 0.06 } },
  // Favicon da aba do navegador.
  { arquivo: 'favicon.png', tamanho: 32, opcoes: { comTransparencia: true } },
];

for (const icone of ICONES) {
  const conteudo = desenharIcone(icone.tamanho, icone.opcoes);
  writeFileSync(join(DESTINO, icone.arquivo), conteudo);
  console.log(`[icones] ${icone.arquivo} (${icone.tamanho}x${icone.tamanho}, ${(conteudo.length / 1024).toFixed(1)} KB)`);
}

console.log(`[icones] ${ICONES.length} icones gerados em apps/web/public`);
