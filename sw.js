// Service worker do Help Floripa (app instalado / PWA). Cuidado de propósito:
// - páginas (.html): sempre da rede; sem internet, mostra a página offline.html (estilizada);
// - ícones e a página offline ficam guardados; o resto (JS com ?v=, Firebase, fotos) não passa por aqui,
//   para nunca prender uma versão velha do site.
const VERSAO = "hf-app-1";
const GUARDAR = ["offline.html", "icone-192.png", "icone-512.png", "logo.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(GUARDAR)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== self.location.origin) return;
  if (r.mode === "navigate") { e.respondWith(fetch(r).catch(() => caches.match("offline.html"))); return; }
  if (GUARDAR.some((g) => new URL(r.url).pathname.endsWith("/" + g))) e.respondWith(caches.match(r).then((c) => c || fetch(r)));
});
