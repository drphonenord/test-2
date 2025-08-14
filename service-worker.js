// v0 — no offline, clear caches
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e => {
  // Always go to network; no cache put
  return;
});
