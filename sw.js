/* Backstage service worker: cache the shell so the app opens (and queues
   captures) with no signal. Network passes through for everything else. */
var CACHE = 'backstage-shell-v1';
var SHELL = [
  './',
  'index.html',
  'app.js',
  'msal-auth.js',
  'vendor/msal-browser.min.js',
  'manifest.webmanifest',
  'apple-touch-icon.png',
  'icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // Graph/login always hit the network
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
      return hit || fetch(e.request);
    })
  );
});
