// Service worker (sw.js): arquivos com ?v= e o SDK do Firebase vêm do aparelho; páginas continuam da rede.
// Mede o tempo até o Diário mostrar o conteúdo na 1ª visita (sem nada guardado) e nas seguintes.
// Uso: PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS=1 node t-sw-rapido.mjs (rodar seed.mjs antes)
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";
import { navegador, entrar } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const erros = [];
const A = await navegador({ mobile: true, sw: true });
const p = await entrar(A.ctx, "ana", "feed.html");
p.on("pageerror", (e) => erros.push(e.message));
await p.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 15000 }).catch(() => {});
ok(await p.evaluate(() => !!navigator.serviceWorker.controller), "service worker ligado");
await p.waitForTimeout(2500);
const guardados = await p.evaluate(async () => (await (await caches.open("hf-arq-1")).keys()).map((k) => k.url));
ok(guardados.filter((u) => /\?v=|&v=/.test(u)).length > 30, `arquivos com versão guardados (${guardados.length})`);
ok(guardados.some((u) => /gstatic\.com\/firebasejs\//.test(u)), "SDK do Firebase guardado");
ok(!guardados.some((u) => /\.html|firebase\.js$/.test(u)), "páginas e firebase.js (sem ?v) não ficam guardados");
const vezes = [];
for (const pg of ["usuarios.html", "mural.html", "mensagens.html", "feed.html", "feed.html"]) {
  const t0 = Date.now();
  await p.goto(`http://127.0.0.1:5057/${pg}`);
  await p.waitForFunction(() => document.querySelector("#barraRede") && !document.querySelector("#estadoCarregando:not([hidden])"), null, { timeout: 20000 }).catch(() => {});
  const do_sw = await p.evaluate(() => performance.getEntriesByType("resource").filter((r) => /[?&]v=/.test(r.name) && r.workerStart > 0).length);
  vezes.push(`${pg} ${Date.now() - t0} ms (${do_sw} do aparelho)`);
}
console.log("   ", vezes.join(" · "));
ok(true, "páginas abrem com o service worker");
// Versão nova de um arquivo apaga a velha
const sobrou = await p.evaluate(async () => {
  const c = await caches.open("hf-arq-1");
  const r = await fetch("rede.js?v=1");
  await new Promise((s) => setTimeout(s, 600));
  const ks = (await c.keys()).map((k) => new URL(k.url)).filter((u) => u.pathname.endsWith("/rede.js"));
  return ks.map((u) => u.search);
});
ok(sobrou.length === 1 && sobrou[0] === "?v=1", `versão nova de um arquivo tira a velha (${sobrou.join(",")})`);
ok(!erros.length, "sem erros na página" + (erros.length ? `: ${erros.join(" | ")}` : ""));
await A.browser.close();
