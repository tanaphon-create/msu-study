const CACHE = "msu-v3";
const CORE = ["./", "index.html", "style.css", "app.js", "manifest.json", "icons/icon-192.png", "data/10151.js", "data/key10151.js", "data/q/1.js", "data/q/2.js", "data/q/3.js", "data/q/4.js", "data/q/5.js", "data/q/6.js", "data/q/7.js", "data/q/8.js", "data/q/9.js", "data/q/10.js", "data/q/11.js", "data/q/12.js", "data/q/13.js", "data/q/14.js", "data/q/15.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  // เปิดจากแคชทันที แล้วอัปเดตเบื้องหลัง (อ่านออฟไลน์ได้)
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => {
    const net = fetch(req).then(r => { if (r.ok) caches.open(CACHE).then(c => c.put(req, r.clone())); return r; }).catch(() => hit);
    return hit || net;
  }));
});
