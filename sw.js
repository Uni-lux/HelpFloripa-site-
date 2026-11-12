// Service worker do Help Floripa (app instalado / PWA e site).
// - páginas (.html): sempre da rede (com "navigation preload", sem esperar o service worker acordar);
//   sem internet, mostra a página offline.html (estilizada);
// - arquivos com versão no endereço (".js?v=12", ".css?v=5", "corretor/lexico.txt?v=1", "vitrine.js?tipo=x&v=54") e o SDK do Firebase
//   (www.gstatic.com/firebasejs/10.12.2/...): NUNCA mudam (mudou o arquivo, muda o ?v=), então vêm do aparelho na
//   hora, sem ir à rede. Isso deixa as páginas e o "voltar" bem mais rápidos. Guardar versão nova de um arquivo apaga
//   as versões antigas dele;
// - imagens, ícones e listas (.json) do próprio site: aparecem do aparelho e são atualizadas por trás;
// - o resto (firebase.js sem ?v, Firestore, fotos de outros sites) não passa por aqui.
const VERSAO = "hf-app-3";
const ARQ = "hf-arq-1";
const GUARDAR = ["offline.html", "icone-192.png", "icone-512.png", "logo-horizontal.png"];
const MAX_ARQ = 500;

self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(GUARDAR)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const ks = await caches.keys();
    await Promise.all(ks.filter((k) => k !== VERSAO && k !== ARQ).map((k) => caches.delete(k)));
    try { await self.registration.navigationPreload?.enable(); } catch {}
    await self.clients.claim();
  })());
});

const versionado = (u) =>
  (u.origin === self.location.origin && /\.(m?js|css|txt)$/.test(u.pathname) && /(^\?|&)v=\d+/.test(u.search))
  || (u.hostname === "www.gstatic.com" && /^\/firebasejs\/\d+\.\d+\.\d+\//.test(u.pathname));
const imagemDoSite = (u) => u.origin === self.location.origin && /\.(png|webp|jpe?g|svg|ico|woff2?|json)$/.test(u.pathname) && !/manifest/.test(u.pathname);
const bom = (res) => res && res.ok && (res.type === "basic" || res.type === "cors");

async function guardar(req, res) {
  const c = await caches.open(ARQ);
  const u = new URL(req.url);
  // tira as versões antigas do mesmo arquivo (mesmo caminho, outro ?v=)
  if (versionado(u)) {
    const velhos = (await c.keys()).filter((k) => { const x = new URL(k.url); return x.origin === u.origin && x.pathname === u.pathname && x.search !== u.search; });
    await Promise.all(velhos.map((k) => c.delete(k)));
  }
  await c.put(req, res);
  const ks = await c.keys();
  if (ks.length > MAX_ARQ) await Promise.all(ks.slice(0, ks.length - MAX_ARQ).map((k) => c.delete(k)));
}

self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (r.mode === "navigate") {
    if (u.origin !== self.location.origin) return;
    e.respondWith((async () => {
      try { return (await e.preloadResponse) || (await fetch(r)); }
      catch { return (await caches.match("offline.html")) || Response.error(); }
    })());
    return;
  }
  if (versionado(u)) {
    e.respondWith((async () => {
      const c = await caches.open(ARQ);
      const achou = await c.match(r);
      if (achou) return achou;
      const res = await fetch(r);
      if (bom(res)) e.waitUntil(guardar(r, res.clone()));
      return res;
    })());
    return;
  }
  if (imagemDoSite(u)) {
    e.respondWith((async () => {
      const c = await caches.open(ARQ);
      const achou = await c.match(r);
      const rede = fetch(r).then((res) => { if (bom(res)) e.waitUntil(guardar(r, res.clone())); return res; });
      if (achou) { e.waitUntil(rede.catch(() => {})); return achou; }
      return rede;
    })());
    return;
  }
  if (u.origin === self.location.origin && GUARDAR.some((g) => u.pathname.endsWith("/" + g))) e.respondWith(caches.match(r).then((c) => c || fetch(r)));
});

// ---------- notificações com o app fechado (Etapa B, Firebase Cloud Messaging) ----------
// As Cloud Functions mandam só "data" {titulo, texto, url, tag, categoria, urgente}; aqui vira a notificação.
// Tocar abre (ou traz para a frente) a página do aviso. Com o site aberto e à vista na MESMA página, não toca de novo
// (a própria página já mostra), mas a notificação ainda é criada em silêncio para o navegador não reclamar.
const ENDERECO_OK = /^[a-z0-9-]+\.html(\?[\w=&%.\-]*)?$/i;
function lerPush(e) {
  let j = {};
  try { j = e.data ? e.data.json() : {}; } catch { try { j = { data: { texto: e.data.text() } }; } catch {} }
  const d = j.data || j.notification || j || {};
  return {
    titulo: String(d.titulo || d.title || "Help Floripa").slice(0, 80),
    texto: String(d.texto || d.body || "").slice(0, 200),
    url: ENDERECO_OK.test(String(d.url || "")) ? d.url : "notificacoes.html",
    tag: String(d.tag || "").slice(0, 80),
    urgente: d.urgente === "1"
  };
}
self.addEventListener("push", (e) => {
  const a = lerPush(e);
  e.waitUntil((async () => {
    const abertas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const aqui = abertas.some((c) => c.visibilityState === "visible" && c.focused && new URL(c.url).pathname.endsWith("/" + a.url.split("?")[0]));
    await self.registration.showNotification(a.titulo, {
      body: a.texto,
      icon: "icone-192.png",
      badge: "favicon-96x96.png",
      tag: a.tag || undefined,
      renotify: !!a.tag && !aqui,
      silent: aqui,
      requireInteraction: a.urgente,
      vibrate: a.urgente ? [300, 150, 300, 150, 300] : [120],
      data: { url: a.url }
    });
  })());
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || "notificacoes.html", self.location.href).href;
  e.waitUntil((async () => {
    const abertas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const mesma = abertas.find((c) => c.url === url) || abertas.find((c) => new URL(c.url).origin === self.location.origin);
    if (mesma) { await mesma.focus(); if (mesma.url !== url && "navigate" in mesma) await mesma.navigate(url).catch(() => {}); return; }
    await self.clients.openWindow(url);
  })());
});
