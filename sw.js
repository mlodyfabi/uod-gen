const CACHE = 'uod-gen-v2';
const PRECACHE = [
  '/uod-gen.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Skip external APIs — always fresh
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('jsdelivr.net')
  ) return;

  // Network-first for HTML — always get latest version
  if (url.pathname.endsWith('.html') || url.pathname === '/') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for icons, manifest, sw itself
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
