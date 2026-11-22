const CACHE_NAME = 'smartledger-pro-shell-v1';
const SHELL_URLS = ['/', '/index.html', '/favicon.svg', '/icon-192.svg', '/icon-512.svg', '/manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        await cache.addAll(SHELL_URLS);
        const index = await cache.match('/index.html');
        if (index) {
          const html = await index.text();
          const assets = Array.from(html.matchAll(/(?:src|href)="(\\/assets\\/[^"]+)"/g), match => match[1]);
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
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('/index.html', copy));
        }
        return response;
      }).catch(() => caches.match('/index.html').then(cached => cached || caches.match('/')))
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
