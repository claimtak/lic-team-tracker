// Team Preeti95272 – service worker (ॲप शेल ऑफलाइन चालण्यासाठी)
const CACHE = 'preeti-app-v1';
const SHELL = ['./', 'index.html', 'manifest.json', 'cover.png', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];
const CDN_HOSTS = ['cdn.tailwindcss.com', 'cdnjs.cloudflare.com', 'www.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Firestore / Auth कॉल्स कधीही कॅश करत नाही
  if (url.origin !== location.origin && !CDN_HOSTS.includes(url.hostname)) return;

  // पान: आधी नेटवर्क (नवीन आवृत्ती मिळण्यासाठी), नसेल तर कॅश
  if (req.mode === 'navigate' || (url.origin === location.origin && url.pathname.endsWith('index.html'))) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('index.html', copy));
        return res;
      }).catch(() => caches.match('index.html'))
    );
    return;
  }

  // बाकी (आयकॉन, CDN स्क्रिप्ट): कॅश आधी, मागे अपडेट
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
