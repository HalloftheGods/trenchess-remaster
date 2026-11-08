/*
 * Trenchess service worker. Plain JavaScript on purpose: it is copied as is, and the build stamps
 * BUILD_ID and SHELL_FILES (vite.config.ts, pwaShell).
 *
 * - The app shell (page, scripts, art) is precached, so a match against the computer plays offline.
 * - A page navigation asks the network first and falls back to the cached page.
 * - Hashed build assets are cache first.
 * - Music streams from the network (range requests) and is never cached; offline the game plays without it.
 * - Google Fonts are kept the first time they load, so the title keeps its lettering offline.
 * - A new version waits until the page sends SKIP_WAITING, which it does only on the title screen.
 */
const BUILD_ID = 'dev';
const SHELL_FILES = [];

const SHELL_CACHE = 'trenchess-shell-' + BUILD_ID;
const FONT_CACHE = 'trenchess-fonts-v1';
const NETWORK_WAIT_MS = 4000;

const SCOPE_PATH = new URL('./', self.location.href).pathname;
const ASSETS_PATH = SCOPE_PATH + 'assets/';
const MUSIC_PATH = SCOPE_PATH + 'music/';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

const scopedUrl = (file) => new URL(file, self.location.href).href;

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell());
});

async function precacheShell() {
  const cache = await caches.open(SHELL_CACHE);
  const urls = ['./', ...SHELL_FILES].map(scopedUrl);
  // Fresh from the network, so a shell never mixes files of two builds.
  await Promise.all(urls.map((url) => cache.add(new Request(url, { cache: 'reload' }))));
}

self.addEventListener('activate', (event) => {
  event.waitUntil(removeOldCaches().then(() => self.clients.claim()));
});

async function removeOldCaches() {
  const keep = new Set([SHELL_CACHE, FONT_CACHE]);
  const names = await caches.keys();
  await Promise.all(names.filter((name) => name.startsWith('trenchess-') && !keep.has(name)).map((name) => caches.delete(name)));
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(fontFirst(request));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith(MUSIC_PATH)) return;
  if (url.pathname.startsWith(ASSETS_PATH)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  event.respondWith(networkFirst(request, request.mode === 'navigate'));
});

const hasNoQuery = (request) => new URL(request.url).search === '';

async function keepCopy(request, response) {
  const cache = await caches.open(SHELL_CACHE);
  await cache.put(request, response);
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { cacheName: SHELL_CACHE });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && hasNoQuery(request)) await keepCopy(request, response.clone());
  return response;
}

function fetchWithin(request, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('slow network')), ms);
    fetch(request).then(
      (response) => {
        clearTimeout(timer);
        resolve(response);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

async function networkFirst(request, isPage) {
  try {
    const response = await fetchWithin(request, NETWORK_WAIT_MS);
    // Every page is the same page, so a query (?dev, a room code) never fills the cache with copies.
    const copyKey = isPage ? scopedUrl('./') : request;
    if (response.ok && (isPage || hasNoQuery(request))) await keepCopy(copyKey, response.clone());
    return response;
  } catch (error) {
    const cached = await caches.match(request, { cacheName: SHELL_CACHE, ignoreSearch: true });
    if (cached) return cached;
    const page = isPage ? await caches.match(scopedUrl('./'), { cacheName: SHELL_CACHE }) : undefined;
    if (page) return page;
    throw error;
  }
}

async function fontFirst(request) {
  const cache = await caches.open(FONT_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  // Font files come back opaque (no-cors) or ok; both are worth keeping.
  if (response.ok || response.type === 'opaque') await cache.put(request, response.clone());
  return response;
}
