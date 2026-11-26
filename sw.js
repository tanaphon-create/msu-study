const CACHE = "msu-v8";
const CORE = ["./", "index.html", "style.css", "app.js", "manifest.json", "icons/icon-192.png", "data/10151.js", "data/key10151.js", "data/40101.js", "data/key40101.js", "data/q40101/1.js", "data/q40101/2.js", "data/q40101/3.js", "data/q40101/4.js", "data/q40101/5.js", "data/q40101/6.js", "data/q40101/7.js", "data/q40101/8.js", "data/q40101/9.js", "data/q40101/10.js", "data/q40101/11.js", "data/q40101/12.js", "data/q40101/13.js", "data/q40101/14.js", "data/q40101/15.js", "data/q/1.js", "data/q/2.js", "data/q/3.js", "data/q/4.js", "data/q/5.js", "data/q/6.js", "data/q/7.js", "data/q/8.js", "data/q/9.js", "data/q/10.js", "data/q/11.js", "data/q/12.js", "data/q/13.js", "data/q/14.js", "data/q/15.js", "data/41214.js", "data/key41214.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  // ออนไลน์: โหลดเวอร์ชันล่าสุดจากเน็ตก่อนเสมอ (แล้วเก็บแคชไว้) / ออฟไลน์: ใช้แคช
  e.respondWith(fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); } return r; })
    .catch(() => caches.match(req, { ignoreSearch: true })));
});
