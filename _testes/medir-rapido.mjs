// Mede o tempo até o conteúdo aparecer (2ª visita, 4G simulado, service worker ligado).
// Uso: node medir-rapido.mjs   (rodar seed.mjs antes)
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";
import { navegador, entrar } from "./nav.mjs";

const PAGINAS = [
  ["Diário", "feed.html", () => !!document.querySelector("#listaFeed > :not(.esqueleto-post)")],
  ["Mensagens", "mensagens.html", () => !!document.querySelector("#listaConversas > *")],
  ["Perfil", "usuarios.html", () => { const e = document.getElementById("estadoCarregando"); return !!e && e.hidden; }],
  ["Mural", "mural.html", () => !!document.querySelector(".mu-post")],
];
const A = await navegador({ mobile: true, sw: true });
const p = await entrar(A.ctx, "ana", "feed.html");
await p.waitForTimeout(4000);
for (const [, url] of PAGINAS) { await p.goto("http://127.0.0.1:5057/" + url); await p.waitForTimeout(3500); } // 1ª visita (aquece)
const cdp = await A.ctx.newCDPSession(p);
await cdp.send("Network.enable");
await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: Number(process.env.LAT || 150), downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
const res = [];
for (const [nome, url, pronto] of PAGINAS) {
  const t0 = Date.now();
  await p.goto("http://127.0.0.1:5057/" + url, { waitUntil: "commit" });
  const ok = await p.waitForFunction(pronto, null, { timeout: 30000, polling: 50 }).then(() => true).catch(() => false);
  res.push(`${nome}: ${ok ? (Date.now() - t0) + " ms" : "não apareceu"}`);
}
console.log(res.join("\n"));
await A.browser.close();
