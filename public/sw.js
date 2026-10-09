/*
 * RockHound GO service worker.
 *
 * Goal: the installed app (manifest start_url "/?source=pwa") reopens without a network. It must
 * never touch API traffic, so only GET requests are handled, and only these:
 *
 *   page navigations           network-first; offline, the cached app shell answers
 *   same-origin /assets/*      cache-first (the build content-hashes these file names)
 *   static third-party files   stale-while-revalidate (STATIC_HOSTS / STATIC_PREFIXES below)
 *
 * Everything else (Firestore, Auth, Gemini, POSTs, ...) is not intercepted at all, so it can
 * never be answered from a cache.
 *
 * The page that first registers this worker is not controlled by it, so that first load is not
 * cached: the app is available offline from its second online load. A product that needs a full
 * offline guarantee should precache the build's file list (vite-plugin-pwa / Workbox) instead.
 *
 * Bump CACHE_NAME to discard everything an earlier version of this file cached.
 */

const CACHE_PREFIX = 'rockhound-neural-';
const CACHE_NAME = `${CACHE_PREFIX}v4`;
const SHELL = '/';

// Third-party hosts that serve static files only. Never add a host that also serves an API:
// a cached API answer is a stale one.
const STATIC_HOSTS = new Set([
  'cdn.tailwindcss.com',
  'unpkg.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'aistudiocdn.com',
  'cdn-icons-png.flaticon.com',
]);

// storage.googleapis.com is shared with other Google APIs, so only this one bucket (sounds and
// 3D models) counts as static.
const STATIC_PREFIXES = ['https://storage.googleapis.com/aistudio-fluff-assets/'];

// Same-origin paths that belong to a backend or to sign-in, never to the app shell.
const PASS_THROUGH = [/^\/api(\/|$)/, /^\/auth(\/|$)/, /^\/__\//];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll([SHELL]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  // Media elements ask for byte ranges and need a 206 back; a cached 200 would break seeking.
  if (request.headers.has('range')) return;
  // Chrome makes fetch() throw for this combination (seen with DevTools open).
  if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return;

  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    if (PASS_THROUGH.some((pattern) => pattern.test(url.pathname))) return;
    if (request.mode === 'navigate') event.respondWith(openPage(event, url));
    else if (url.pathname.startsWith('/assets/')) event.respondWith(cacheFirst(event));
  } else if (isStaticThirdParty(url)) {
    event.respondWith(staleWhileRevalidate(event));
  }
});

function isStaticThirdParty(url) {
  return STATIC_HOSTS.has(url.hostname) || STATIC_PREFIXES.some((prefix) => url.href.startsWith(prefix));
}

function unavailable() {
  return new Response('ASSET UNAVAILABLE', { status: 503, headers: { 'Content-Type': 'text/plain' } });
}

// The browser refuses a navigation that is answered with a response which followed a redirect.
async function withoutRedirect(response) {
  if (!response.redirected) return response;
  return new Response(await response.blob(), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

// Online: always the network, so a new deployment is picked up at once. Offline (the fetch fails):
// the cached shell for ANY page URL, because the installed app starts at "/?source=pwa", which is
// not a cache key.
async function openPage(event, url) {
  try {
    const response = await fetch(event.request);
    if (url.pathname === SHELL && response.status === 200) {
      const copy = response.clone(); // before the page starts reading the body
      event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(SHELL, copy)));
    }
    return response;
  } catch {
    const cache = await caches.open(CACHE_NAME);
    const shell = await cache.match(SHELL);
    return shell ? withoutRedirect(shell) : Response.error();
  }
}

async function cacheFirst(event) {
  const { request } = event;
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.status === 200) event.waitUntil(cache.put(request, response.clone()));
    return response;
  } catch {
    return unavailable();
  }
}

async function staleWhileRevalidate(event) {
  const { request } = event;
  const cache = await caches.open(CACHE_NAME);
  let cached = await cache.match(request);
  // The browser rejects an opaque response for any request that is not "no-cors".
  if (cached && cached.type === 'opaque' && request.mode !== 'no-cors') cached = undefined;

  const refresh = fetch(request).then((response) => {
    // A cross-origin <script> or <link> gets an opaque response (status 0) whose real status is
    // hidden. It is kept anyway, and replaced by the next successful revalidation.
    if (response.status === 200 || response.type === 'opaque') {
      event.waitUntil(cache.put(request, response.clone()));
    }
    return response;
  });

  if (cached) {
    event.waitUntil(refresh.catch(() => {}));
    return cached;
  }
  return refresh.catch(unavailable);
}
