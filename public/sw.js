const CACHE_NAME = 'smartledger-pro-shell-v6';
const appRoot = () => new URL('./', self.registration.scope).pathname;
const shellUrls = () => {
  const root = appRoot();
  return [root, `${root}index.html`, `${root}favicon.svg`, `${root}icon-192.svg`, `${root}icon-512.svg`, `${root}manifest.webmanifest`];
};

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        await cache.addAll(shellUrls());
        const index = await cache.match(`${appRoot()}index.html`);
        if (index) {
          const html = await index.text();
          const assets = Array.from(html.matchAll(/(?:src|href)="([^"]*\/assets\/[^"]+)"/g), match => new URL(match[1], new URL('./', self.registration.scope)).href);
          if (assets.length) await cache.addAll(assets);
        }
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith('smartledger-pro-shell-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    const root = appRoot();
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(`${root}index.html`, copy));
        }
        return response;
      }).catch(() => caches.match(`${root}index.html`).then(cached => cached || caches.match(root)))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    }))
  );
});
