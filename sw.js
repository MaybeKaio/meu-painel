/**
 * ============================================================================
 * PERFORMANCE STUDIO • SERVICE WORKER OFFLINE-FIRST (sw.js)
 * Armazena a interface em cache no dispositivo para abrir instantaneamente
 * mesmo sem internet (modo avião / plantão / subsolo).
 * ============================================================================
 */

const CACHE_NAME = 'perf-studio-cache-v11';
const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        APP_SHELL_ASSETS.map((url) => cache.add(url))
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Nunca faz cache das chamadas de API do Google Apps Script (deixa o JS gerenciar a fila offline)
  if (url.hostname.includes('script.google.com') || url.hostname.includes('googleusercontent.com') || req.method !== 'GET') {
    return;
  }

  // Estratégia Network-First com Fallback imediato para o Cache Offline
  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return networkRes;
      })
      .catch(() => {
        return caches.match(req).then((cachedRes) => {
          return cachedRes || caches.match('./index.html');
        });
      })
  );
});
