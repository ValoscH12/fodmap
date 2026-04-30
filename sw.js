// Service Worker — FODMAP Analyser PWA
// Met l'app en cache pour fonctionnement hors ligne

const CACHE_NAME = 'fodmap-v2';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap'
];

// Installation : mise en cache des ressources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // On met en cache ce qu'on peut, sans bloquer si les fonts échouent
      return cache.addAll(['./index.html', './manifest.json']).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Interception des requêtes : cache-first pour les assets locaux
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Pour les ressources locales : cache d'abord, réseau ensuite
  if (url.origin === location.origin || url.pathname.includes('index.html')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => caches.match('./index.html'));
      })
    );
    return;
  }

  // Pour les fonts Google : network-first avec fallback cache
  if (url.hostname.includes('fonts.')) {
    event.respondWith(
      fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Autres requêtes : network normal
  event.respondWith(fetch(event.request).catch(() => {}));
});
