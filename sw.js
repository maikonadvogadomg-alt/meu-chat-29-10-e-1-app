/* Meu Chat — guarda a tela para abrir sem internet (a IA continua precisando de internet). */
const CACHE = 'meuchat-v2910e';
const ARQS = ['./', 'index.html', 'css/app.css', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png',
  'js/00-base.js', 'js/10-banco.js', 'js/20-provedores.js', 'js/30-memoria.js', 'js/40-voz.js', 'js/50-internet.js', 'js/60-previa.js', 'js/70-texto.js', 'js/80-chat.js', 'js/lib/cofre-arquivo.js', 'js/lib/guia-maikon.js', 'js/85-config.js', 'js/87-cofre.js', 'js/90-backup.js', 'js/99-app.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('meuchat-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // IAs e internet: direto
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((k) => k.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
