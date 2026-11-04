// Mede quando o Flash (fileira) e as publicações do Diário aparecem (4G simulado). Uso: node medir-diario.mjs
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";
import { navegador, entrar } from "./nav.mjs";
const A = await navegador({ mobile: true, sw: true });
const p = await entrar(A.ctx, "ana", "feed.html");
await p.waitForTimeout(4000);
p.on("console", (m) => { if (/^T|Flash/.test(m.text())) console.log("   ", m.text()); });
p.on("response", (r) => { if (r.status() >= 400) console.log("   HTTP", r.status(), r.url().slice(0, 160)); });
const cdp = await A.ctx.newCDPSession(p);
await cdp.send("Network.enable");
await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: Number(process.env.LAT || 150), downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
for (const vez of [1, 2, 3]) {
  const t0 = Date.now();
  await p.goto("http://127.0.0.1:5057/feed.html", { waitUntil: "commit" });
  const marcas = await p.waitForFunction(() => {
    const w = window; w.__m = w.__m || {};
    const t = performance.now();
    if (!w.__m.flash && document.querySelector("#storiesFeed > *")) w.__m.flash = t;
    if (!w.__m.posts && document.querySelector("#listaFeed > :not(.esqueleto-post)")) w.__m.posts = t;
    return w.__m.flash && w.__m.posts ? w.__m : null;
  }, null, { timeout: 40000, polling: 30 }).then((h) => h.jsonValue()).catch(() => null);
  console.log(`visita ${vez}:`, marcas ? `flash ${Math.round(marcas.flash)} ms · publicações ${Math.round(marcas.posts)} ms` : "não apareceu", `(total ${Date.now() - t0})`);
}
await A.browser.close();
