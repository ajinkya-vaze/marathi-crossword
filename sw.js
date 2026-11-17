// Service worker: lets the game open and play offline.
//
// Strategy: network-first for everything on this site, falling back to the cache when offline
// (or when the network takes longer than 4s and we have a cached copy). Online players therefore
// always get the latest app and today's puzzle; every file fetched is kept for offline use.
// The app shell is cached up front on install. Bump VERSION when files are added or removed.

const VERSION = 'v5';
const CACHE = `marathi-crossword-${VERSION}`;
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/app.js',
  'js/akshara.js',
  'js/help.js',
  'js/i18n.js',
  'js/input.js',
  'js/keyboard.js',
  'js/puzzle.js',
  'js/storage.js',
  'js/util.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'puzzles/index.json',
  'puzzles/extra/index.json',
];
const TIMEOUT_MS = 4000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('marathi-crossword-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(networkFirst(req));
});

async function fromCache(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;
  if (req.mode === 'navigate') return cache.match('index.html');
  return undefined;
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  // no-cache: always ask the server (a cheap 304 when unchanged), so a release reaches players
  // right away instead of after GitHub Pages' 10-minute browser cache.
  const network = fetch(req, { cache: 'no-cache' }).then((res) => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  });
  network.catch(() => {}); // handled below; avoid unhandled-rejection noise
  const timeout = new Promise((resolve) => setTimeout(resolve, TIMEOUT_MS, 'timeout'));
  try {
    const first = await Promise.race([network, timeout]);
    if (first !== 'timeout') return first;
    return (await fromCache(req)) || (await network);
  } catch {
    return (await fromCache(req)) || Response.error();
  }
}
