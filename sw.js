/* Heligonka Tabulator — service worker (offline PWA)
   Cache-first pro statické soubory, network-first pro API (knihovna potřebuje síť). */
const CACHE = 'heligonka-v2';
const ASSETS = [
  './',
  './index.html',
  './knihovna.html',
  './uzivatele.html',
  './akordy.html',
  './predloha.html',
  './napoveda.html',
  './style.css?v=2026100611',
  './shared.js',
  './app.js',
  './library.js',
  './midi.js',
  './xls.js',
  './manifest.json',
  './favicon-32.png',
  './favicon-192.png',
  './apple-touch-icon.png'
];
const CDN = ['unpkg.com']; // MIDI/XLS knihovny — cache při prvním načtení

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  /* API vždy ze sítě (PHP backend, žádné ukládání odpovědí) */
  if (url.pathname.includes('api.php')) { e.respondWith(fetch(e.request)); return; }
  /* CDN (unpkg): cache-first po prvním načtení — offline MIDI/XLS import */
  if (CDN.some(d => url.hostname === d)) {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }))
    );
    return;
  }
  /* vlastní soubory: cache-first, fallback na síť a update cache */
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok && url.origin === location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});