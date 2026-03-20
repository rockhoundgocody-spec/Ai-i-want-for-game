
const CACHE_NAME = 'rockhound-neural-v3';

// Optimized static asset list
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] NEURAL GRID :: CACHING CORE SHELL');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/auth')) {
    return;
  }

  // Audio files have procedural fallbacks, so we don't block on them if they fail
  if (url.pathname.endsWith('.mp3')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response(null, { status: 404 }))
    );
    return;
  }

  if (
    url.hostname.includes('cdn') || 
    url.hostname.includes('googleapis') || 
    url.hostname.includes('gstatic') ||
    url.hostname.includes('aistudiocdn') ||
    url.hostname.includes('unpkg') || 
    url.hostname.includes('res.cloudinary.com') || 
    url.hostname.includes('esm.sh') ||
    url.pathname.endsWith('.glb') || 
    url.pathname.endsWith('.bin') || 
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg')
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) return cachedResponse;
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse.status === 200) cache.put(event.request, networkResponse.clone());
          return networkResponse;
        } catch (error) {
          return new Response('ASSET UNAVAILABLE', { status: 503 });
        }
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
