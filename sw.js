// Wadan Roster — minimal service worker.
// Goal: make the app installable and let the shell (HTML/CSS/JS) open
// offline. Data (roster.json, GitHub API calls) is always fetched fresh
// from the network and simply isn't cached here.
const CACHE = 'wadan-shell-v1';
const SHELL = ['./', './index.html', './styles.css', './app.js', './manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Only handle the app shell ourselves; let data/API requests go straight
  // to the network untouched (roster.json, api.github.com, fonts, etc).
  const isShell = url.origin === location.origin && SHELL.some((p) => url.pathname.endsWith(p.replace('./', '/')) || (p === './' && url.pathname.endsWith('/')));
  if (!isShell) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req))
  );
});
