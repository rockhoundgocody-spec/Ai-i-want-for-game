// Logic tests for public/sw.js. The worker is evaluated in a vm context with an in-memory
// CacheStorage and a scriptable network, so the offline behaviour is checked without a browser.
// (A real-browser check was run separately; see docs/ROLE_AND_PLAN.md.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ORIGIN = 'https://app.test';
const CACHE = 'rockhound-neural-v4';

// The Response surface the worker uses. A real opaque response cannot be constructed in Node.
function reply(body, { status = 200, type = 'basic', redirected = false } = {}) {
  return {
    status,
    type,
    redirected,
    ok: status >= 200 && status < 300,
    statusText: '',
    headers: new Headers(),
    text: async () => body,
    blob: async () => new Blob([body]),
    clone: () => reply(body, { status, type, redirected }),
  };
}

const text = (response) => response.text();
const href = (url) => new URL(url, `${ORIGIN}/`).href;

function startWorker({ source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), existingCaches = [] } = {}) {
  const listeners = {};
  const calls = { skipWaiting: 0, claim: 0, network: [] };
  const stores = new Map(existingCaches.map((name) => [name, new Map()]));
  const routes = new Map();
  const state = { online: true };

  async function network(request) {
    const url = href(typeof request === 'string' ? request : request.url);
    calls.network.push(url);
    if (!state.online) throw new TypeError('Failed to fetch');
    const route = routes.get(url);
    if (!route) throw new TypeError(`test has no network route for ${url}`);
    return route.clone();
  }

  const cacheApi = (entries) => ({
    async match(request, options = {}) {
      const key = new URL(href(typeof request === 'string' ? request : request.url));
      if (options.ignoreSearch) key.search = '';
      const hit = entries.get(key.href);
      return hit ? hit.clone() : undefined;
    },
    async put(request, response) {
      entries.set(href(typeof request === 'string' ? request : request.url), response);
    },
    async addAll(urls) {
      const responses = await Promise.all(urls.map(network));
      const bad = responses.find((response) => !response.ok);
      if (bad) throw new TypeError(`addAll: unexpected status ${bad.status}`);
      urls.forEach((url, index) => entries.set(href(url), responses[index]));
    },
  });

  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      return cacheApi(stores.get(name));
    },
    async keys() {
      return [...stores.keys()];
    },
    async delete(name) {
      return stores.delete(name);
    },
    // Global lookup across every cache, as the browser provides it.
    async match(request, options) {
      for (const entries of stores.values()) {
        const hit = await cacheApi(entries).match(request, options);
        if (hit) return hit;
      }
      return undefined;
    },
  };

  const self = {
    location: new URL(`${ORIGIN}/sw.js`),
    addEventListener: (type, listener) => (listeners[type] ??= []).push(listener),
    skipWaiting: async () => { calls.skipWaiting += 1; },
    clients: { claim: async () => { calls.claim += 1; } },
  };
  const context = vm.createContext({ self, caches, fetch: network, URL, Response, Headers, Blob, console });
  vm.runInContext(source, context, { filename: 'public/sw.js' });

  async function lifecycle(type) {
    const pending = [];
    for (const listener of listeners[type] ?? []) listener({ waitUntil: (promise) => pending.push(Promise.resolve(promise)) });
    await Promise.all(pending);
  }

  // Dispatch a fetch event the way the browser does. `handled` is false when the worker did not
  // call respondWith, i.e. the request goes straight to the network.
  function request(url, { method = 'GET', mode = 'no-cors', cache = 'default', headers = {} } = {}) {
    let answer;
    const pending = [];
    const event = {
      request: { url: href(url), method, mode, cache, headers: new Headers(headers) },
      respondWith: (promise) => { answer = Promise.resolve(promise); },
      waitUntil: (promise) => pending.push(Promise.resolve(promise)),
    };
    for (const listener of listeners.fetch ?? []) listener(event);
    return {
      handled: answer !== undefined,
      response: () => answer,
      async settle() {
        for (let index = 0; index < pending.length; index += 1) await pending[index];
      },
    };
  }

  async function load(url, options) {
    const dispatched = request(url, options);
    assert.ok(dispatched.handled, `expected the worker to handle ${url}`);
    const response = await dispatched.response();
    await dispatched.settle();
    return response;
  }

  return {
    calls,
    request,
    load,
    lifecycle,
    serve: (url, response) => routes.set(href(url), response),
    setOnline: (online) => { state.online = online; },
    cacheNames: () => [...stores.keys()],
    cachedUrls: (name = CACHE) => [...(stores.get(name)?.keys() ?? [])],
    networkCalls: (url) => calls.network.filter((called) => called === href(url)).length,
  };
}

// A deployment as the static host serves it.
function deploy(worker, { shell = '<html>shell v1</html>', entry = 'console.log("app v1")' } = {}) {
  worker.serve('/', reply(shell));
  worker.serve('/assets/index-abc123.js', reply(entry));
}

test('install caches the app shell and takes over immediately', async () => {
  const worker = startWorker();
  deploy(worker);
  await worker.lifecycle('install');
  assert.deepEqual(worker.cachedUrls(), [`${ORIGIN}/`]);
  assert.equal(worker.calls.skipWaiting, 1);
});

test('activate removes older RockHound caches and nobody else\'s', async () => {
  const worker = startWorker({ existingCaches: ['rockhound-neural-v3', CACHE, 'other-app-v1'] });
  await worker.lifecycle('activate');
  assert.deepEqual(worker.cacheNames().sort(), [CACHE, 'other-app-v1'].sort());
  assert.equal(worker.calls.claim, 1);
});

test('the installed app reopens offline at /?source=pwa', async () => {
  // Regression for the review finding "Installed app fails offline": only "/", "/index.html" and
  // "/manifest.json" were cached, and the start URL carries a query, so no entry ever matched it.
  const worker = startWorker();
  deploy(worker);
  await worker.lifecycle('install');
  await worker.lifecycle('activate');

  // Online session: the page and its entry script both flow through the worker.
  assert.equal(await text(await worker.load('/?source=pwa', { mode: 'navigate' })), '<html>shell v1</html>');
  assert.equal(await text(await worker.load('/assets/index-abc123.js', { mode: 'cors' })), 'console.log("app v1")');

  worker.setOnline(false);
  const page = await worker.load('/?source=pwa', { mode: 'navigate' });
  assert.equal(page.status, 200);
  assert.equal(await text(page), '<html>shell v1</html>');
  assert.equal(await text(await worker.load('/assets/index-abc123.js', { mode: 'cors' })), 'console.log("app v1")');
});

test('any page URL falls back to the shell offline, but never to an error page', async () => {
  const worker = startWorker();
  deploy(worker);
  await worker.lifecycle('install');
  worker.setOnline(false);
  assert.equal(await text(await worker.load('/?view=map', { mode: 'navigate' })), '<html>shell v1</html>');
  assert.equal(await text(await worker.load('/somewhere/else', { mode: 'navigate' })), '<html>shell v1</html>');
});

test('with nothing cached, an offline navigation fails like it would without a worker', async () => {
  const worker = startWorker();
  const page = await worker.load('/?source=pwa', { mode: 'navigate' });
  assert.equal(page.type, 'error');
});

test('online, a new deployment wins and becomes the offline copy', async () => {
  const worker = startWorker();
  deploy(worker);
  await worker.lifecycle('install');
  worker.serve('/', reply('<html>shell v2</html>'));
  assert.equal(await text(await worker.load('/', { mode: 'navigate' })), '<html>shell v2</html>');
  worker.setOnline(false);
  assert.equal(await text(await worker.load('/?source=pwa', { mode: 'navigate' })), '<html>shell v2</html>');
});

test('only the app\'s own page refreshes the offline shell', async () => {
  const worker = startWorker();
  deploy(worker);
  await worker.lifecycle('install');
  worker.serve('/privacy.html', reply('<html>a different page</html>'));
  assert.equal(await text(await worker.load('/privacy.html', { mode: 'navigate' })), '<html>a different page</html>');
  worker.setOnline(false);
  assert.equal(await text(await worker.load('/?source=pwa', { mode: 'navigate' })), '<html>shell v1</html>');
});

test('a server error page is shown as is and does not replace the cached shell', async () => {
  const worker = startWorker();
  deploy(worker);
  await worker.lifecycle('install');
  worker.serve('/', reply('Bad gateway', { status: 502 }));
  const page = await worker.load('/', { mode: 'navigate' });
  assert.equal(page.status, 502);
  worker.setOnline(false);
  assert.equal(await text(await worker.load('/', { mode: 'navigate' })), '<html>shell v1</html>');
});

test('a shell that followed a redirect is rewritten before it answers a navigation', async () => {
  const worker = startWorker();
  worker.serve('/', reply('<html>redirected</html>', { redirected: true }));
  await worker.lifecycle('install');
  worker.setOnline(false);
  const page = await worker.load('/', { mode: 'navigate' });
  assert.equal(page.redirected, false);
  assert.equal(await text(page), '<html>redirected</html>');
});

test('hashed assets are cached on first use and served without the network afterwards', async () => {
  const worker = startWorker();
  deploy(worker);
  await worker.load('/assets/index-abc123.js', { mode: 'cors' });
  await worker.load('/assets/index-abc123.js', { mode: 'cors' });
  assert.equal(worker.networkCalls('/assets/index-abc123.js'), 1);
});

test('an asset that was never cached is a 503 when offline, not a thrown error', async () => {
  const worker = startWorker();
  worker.setOnline(false);
  const response = await worker.load('/assets/never-seen.js', { mode: 'cors' });
  assert.equal(response.status, 503);
  assert.equal(await text(response), 'ASSET UNAVAILABLE');
});

test('a failed asset response is not cached', async () => {
  const worker = startWorker();
  worker.serve('/assets/broken.js', reply('Not found', { status: 404 }));
  await worker.load('/assets/broken.js', { mode: 'cors' });
  worker.serve('/assets/broken.js', reply('fixed'));
  assert.equal(await text(await worker.load('/assets/broken.js', { mode: 'cors' })), 'fixed');
});

test('API, sign-in and every non-GET request bypass the worker entirely', async () => {
  const worker = startWorker();
  deploy(worker);
  const untouched = [
    ['https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?VER=8', 'cors'],
    // The Veo video poll is a GET whose answer changes: it must never come from a cache.
    ['https://generativelanguage.googleapis.com/v1beta/operations/veo-123', 'cors'],
    ['https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=k', 'cors'],
    ['https://securetoken.googleapis.com/v1/token?key=k', 'cors'],
    ['https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig', 'cors'],
    ['https://firebasestorage.googleapis.com/v0/b/bucket/o/photo.jpg?alt=media', 'cors'],
    ['https://storage.googleapis.com/some-other-bucket/data.json', 'cors'],
    ['/api/identify', 'cors'],
    ['/auth/callback?code=1', 'navigate'],
    ['/__/auth/handler?apiKey=k', 'navigate'],
  ];
  for (const [url, mode] of untouched) {
    assert.equal(worker.request(url, { mode }).handled, false, `${url} must not be intercepted`);
  }
  for (const url of ['/', '/assets/index-abc123.js', 'https://cdn.tailwindcss.com/', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js']) {
    assert.equal(worker.request(url, { method: 'POST', mode: 'cors' }).handled, false, `POST ${url}`);
  }
  assert.deepEqual(worker.calls.network, []);
});

test('same-origin files outside /assets are left to the browser', () => {
  const worker = startWorker();
  assert.equal(worker.request('/manifest.json', { mode: 'cors' }).handled, false);
  assert.equal(worker.request('/sw.js', { mode: 'cors' }).handled, false);
});

test('requests Chrome cannot fetch from the worker are left alone', () => {
  const worker = startWorker();
  assert.equal(worker.request('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', { cache: 'only-if-cached', mode: 'no-cors' }).handled, false);
});

test('byte-range requests (media elements) are left to the browser', () => {
  const worker = startWorker();
  const model = 'https://storage.googleapis.com/aistudio-fluff-assets/codelab-rockhound-gcn/audio/ambience_loop.mp3';
  assert.equal(worker.request(model, { headers: { Range: 'bytes=0-' } }).handled, false);
  assert.equal(worker.request(model).handled, true);
});

test('static third-party files are recognised', () => {
  const worker = startWorker();
  const handled = [
    'https://cdn.tailwindcss.com/',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://fonts.googleapis.com/css2?family=Exo+2&display=swap',
    'https://fonts.gstatic.com/s/exo2/v21/abc.woff2',
    'https://aistudiocdn.com/assets/rock.glb',
    'https://storage.googleapis.com/aistudio-fluff-assets/codelab-rockhound-gcn/models/crystal-v2.glb',
    'https://storage.googleapis.com/aistudio-fluff-assets/codelab-rockhound-gcn/audio/ui_click.mp3',
  ];
  for (const url of handled) {
    assert.equal(worker.request(url).handled, true, `${url} should be cached`);
  }
});

test('a cross-origin script is cached after first use and still loads when the CDN is unreachable', async () => {
  const worker = startWorker();
  const tailwind = 'https://cdn.tailwindcss.com/';
  worker.serve(tailwind, reply('/* tailwind */', { status: 0, type: 'opaque' }));
  assert.equal((await worker.load(tailwind)).type, 'opaque');

  worker.setOnline(false);
  const offline = await worker.load(tailwind);
  assert.equal(await text(offline), '/* tailwind */');
});

test('stale-while-revalidate: the cached copy answers now, the fresh copy is kept for next time', async () => {
  const worker = startWorker();
  const leaflet = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  worker.serve(leaflet, reply('leaflet old', { type: 'cors' }));
  await worker.load(leaflet);

  worker.serve(leaflet, reply('leaflet new', { type: 'cors' }));
  assert.equal(await text(await worker.load(leaflet)), 'leaflet old');
  assert.equal(await text(await worker.load(leaflet)), 'leaflet new');
});

test('a CDN error response is returned to the page but never cached', async () => {
  const worker = startWorker();
  const font = 'https://fonts.gstatic.com/s/exo2/v21/abc.woff2';
  worker.serve(font, reply('Service unavailable', { status: 503, type: 'cors' }));
  assert.equal((await worker.load(font, { mode: 'cors' })).status, 503);
  worker.serve(font, reply('font bytes', { type: 'cors' }));
  assert.equal(await text(await worker.load(font, { mode: 'cors' })), 'font bytes');
});

test('an opaque cached copy is not handed to a CORS-mode request', async () => {
  const worker = startWorker();
  const css = 'https://fonts.googleapis.com/css2?family=Exo+2&display=swap';
  worker.serve(css, reply('opaque css', { status: 0, type: 'opaque' }));
  await worker.load(css, { mode: 'no-cors' });

  worker.serve(css, reply('readable css', { type: 'cors' }));
  const response = await worker.load(css, { mode: 'cors' });
  assert.equal(response.type, 'cors');
  assert.equal(await text(response), 'readable css');
});

test('a third-party file that was never cached is a 503 when offline', async () => {
  const worker = startWorker();
  worker.setOnline(false);
  const response = await worker.load('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
  assert.equal(response.status, 503);
});
