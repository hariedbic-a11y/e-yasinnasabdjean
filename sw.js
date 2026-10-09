const CACHE = "eyasin-v2";
const PRECACHE = ["./", "index.html", "manifest.webmanifest", "icon.svg"];
const EXT = /^(fonts\.googleapis\.com|fonts\.gstatic\.com|drive\.google\.com|.*\.googleusercontent\.com)$/;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Font & foto: stale-while-revalidate (boleh opaque)
  if (EXT.test(url.hostname)) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(req).then(hit => {
          const net = fetch(req).then(res => {
            if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
            return res;
          }).catch(() => hit);
          return hit || net;
        })
      )
    );
    return;
  }

  // Data Google Sheets & lainnya: jangan di-cache oleh SW
  if (url.origin !== location.origin) return;

  // File aplikasi: network-first, cadangan cache
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match("index.html")))
  );
});
