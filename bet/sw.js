/* ScorePick — service worker: офлайн-кэш (стратегия «сначала сеть, потом кэш») */
const CACHE = 'scorepick-v3';
const ASSETS = [
  './',
  './index.html',
  './settings.json',
  './manifest.json',
  './css/styles.css',
  './js/i18n.js',
  './js/store.js',
  './js/ui.js',
  './js/screens.js',
  './js/app.js',
  './icons/icon.svg',
  './icons/icon-maskable.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// Сначала сеть (свежий контент онлайн), при отсутствии сети — кэш.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        const copy = r.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return r;
      })
      .catch(() => caches.match(e.request).then((c) => c || caches.match('./index.html')))
  );
});
