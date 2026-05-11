const CACHE = 'uod-gen-v1';
const PRECACHE = ['/uod-gen.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];
const SKIP_HOSTS = ['supabase.co', 'googleapis.com', 'jsdelivr.net'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (SKIP_HOSTS.some(h => url.hostname.includes(h))) return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
