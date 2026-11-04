// Mede a rede (rede.html) com fotos de tamanho real dentro dos documentos e internet de celular simulada.
// Uso: node medir-rede.mjs  (seed + carga-seed + carga-fotos doc antes). OUTRA=1 deixa outra aba do site aberta e congelada.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";
import { navegador, entrar } from "./nav.mjs";
const A = await navegador({ mobile: true, rede: true, sw: true });
const p = await entrar(A.ctx, "ana", "feed.html");
p.on("console", (m) => { if (/^T|failed|lease|primary/i.test(m.text())) console.log("   ", m.text().slice(0, 160)); });
await p.waitForTimeout(3000);
if (process.env.OUTRA) {
  const o = await A.ctx.newPage(); await o.goto("http://127.0.0.1:5057/index.html"); await o.waitForTimeout(4000);
  const c = await A.ctx.newCDPSession(o); await c.send("Page.setWebLifecycleState", { state: "frozen" }); console.log("   outra aba congelada");
}
const cdp = await A.ctx.newCDPSession(p);
await cdp.send("Network.enable");
await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: Number(process.env.LAT || 120), downloadThroughput: Number(process.env.MBPS || 4) * 1e6 / 8, uploadThroughput: 1e6 / 8 });
const bytes = new Map(), urls = new Map();
const quadros = new Map(); const t00 = Date.now();
await cdp.send("Page.enable"); cdp.on("Page.frameNavigated", (e) => quadros.set(e.frame.id, e.frame.url.split("/").pop().slice(0, 30)));
cdp.on("Network.requestWillBeSent", (e) => urls.set(e.requestId, `[${quadros.get(e.frameId) || "?"} @${Date.now() - t00}] ` + e.request.url.replace(/^https?:\/\/[^/]+\//, "").slice(0, 60)));
cdp.on("Network.dataReceived", (e) => bytes.set(e.requestId, (bytes.get(e.requestId) || 0) + e.dataLength));
setInterval(() => { if (!process.env.BYTES) return; const t = [...bytes].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${(v / 1e6).toFixed(2)}MB ${urls.get(k)}`); console.log("BYTES", Date.now() % 100000, "\n  " + t.join("\n  ")); }, 3000);
const quadro = (re) => p.frames().find((f) => f.parentFrame() && re.test(f.url()));
for (const vez of [1, 2]) {
  const t0 = Date.now();
  await p.goto("http://127.0.0.1:5057/rede.html?aba=diario", { waitUntil: "commit" });
  const marca = {};
  for (let i = 0; i < 600 && Object.keys(marca).length < 3; i++) {
    const f = quadro(/feed\.html/), m = quadro(/mural\.html/);
    try {
      if (!marca.posts && f && await f.evaluate(() => !!document.querySelector("#listaFeed .post-card"))) marca.posts = Date.now() - t0;
      if (!marca.flash && f && await f.evaluate(() => !!document.querySelector("#storiesFeed .story-circ:not(.meu)"))) marca.flash = Date.now() - t0;
      if (!marca.mural && m && await m.evaluate(() => !!document.querySelector(".mu-post"))) marca.mural = Date.now() - t0;
    } catch {}
    await p.waitForTimeout(100);
  }
  console.log(`visita ${vez}: publicações ${marca.posts ?? "—"} ms · flash ${marca.flash ?? "—"} ms · mural ${marca.mural ?? "—"} ms`);
}
await A.browser.close();
