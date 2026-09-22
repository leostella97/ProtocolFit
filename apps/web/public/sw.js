/**
 * sw.js — Service Worker do ProtocolFit (PWA)
 * ---------------------------------------------------------------------------
 * Dá suporte OFFLINE ao sistema instalado: depois da primeira visita, as
 * páginas e os modelos de treino/dieta continuam disponíveis mesmo sem
 * internet (essencial porque o motor de cálculo roda no navegador).
 *
 * Estratégias:
 *  - Navegação (abrir páginas): REDE primeiro; se falhar, usa o cache
 *    (e, em último caso, a página inicial já visitada).
 *  - Demais arquivos (JS, CSS, imagens e modelos JSON): CACHE primeiro com
 *    atualização em segundo plano (stale-while-revalidate).
 *
 * Todos os caminhos são resolvidos a partir do ESCOPO do service worker,
 * então o mesmo arquivo funciona em `localhost:3000` e no GitHub Pages
 * (`/ProtocolFit/`).
 * ---------------------------------------------------------------------------
 */

// Nome da versão do cache (trocar o sufixo invalida caches antigos).
const VERSAO_DO_CACHE = 'protocolfit-v1';

// Escopo do service worker (raiz do site, com ou sem basePath).
const ESCOPO = self.registration.scope;

// Arquivos essenciais para o app abrir offline.
const ARQUIVOS_ESSENCIAIS = [
  '',
  'manifest.webmanifest',
  'favicon.png',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'apple-touch-icon.png',
].map((caminho) => new URL(caminho, ESCOPO).toString());

// ---- Instalação: pré-carrega os arquivos essenciais ------------------------
self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(VERSAO_DO_CACHE)
      // addAll ignora falhas individuais? Não — por isso usamos allSettled.
      .then((cache) => Promise.allSettled(ARQUIVOS_ESSENCIAIS.map((url) => cache.add(url))))
      // Ativa o novo service worker imediatamente.
      .then(() => self.skipWaiting()),
  );
});

// ---- Ativação: remove caches de versões antigas ---------------------------
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((chave) => chave !== VERSAO_DO_CACHE).map((chave) => caches.delete(chave))))
      // Passa a controlar as páginas já abertas.
      .then(() => self.clients.claim()),
  );
});

// ---- Interceptação das requisições ----------------------------------------
self.addEventListener('fetch', (evento) => {
  const requisicao = evento.request;

  // Só tratamos requisições GET do próprio site.
  if (requisicao.method !== 'GET') {
    return;
  }
  const url = new URL(requisicao.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // 1) Navegação (abrir uma página): rede primeiro, cache como reserva.
  if (requisicao.mode === 'navigate') {
    evento.respondWith(
      fetch(requisicao)
        .then((resposta) => {
          // Guarda uma cópia da página visitada para uso offline.
          const copia = resposta.clone();
          caches.open(VERSAO_DO_CACHE).then((cache) => cache.put(requisicao, copia));
          return resposta;
        })
        .catch(async () => {
          // Sem internet: tenta a página exata e depois a página inicial.
          const paginaEmCache = await caches.match(requisicao);
          if (paginaEmCache) {
            return paginaEmCache;
          }
          const inicioEmCache = await caches.match(new URL('', ESCOPO).toString());
          return inicioEmCache ?? Response.error();
        }),
    );
    return;
  }

  // 2) Demais arquivos: cache primeiro, atualizando em segundo plano.
  evento.respondWith(
    caches.match(requisicao).then((emCache) => {
      const daRede = fetch(requisicao)
        .then((resposta) => {
          // Só guarda respostas válidas do próprio site.
          if (resposta && resposta.status === 200 && resposta.type === 'basic') {
            const copia = resposta.clone();
            caches.open(VERSAO_DO_CACHE).then((cache) => cache.put(requisicao, copia));
          }
          return resposta;
        })
        .catch(() => emCache);
      // Responde na hora com o cache (se existir) e atualiza em seguida.
      return emCache ?? daRede;
    }),
  );
});
