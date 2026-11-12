// Botão "+" flutuante (como no X), marca nova, Explorar sem cores sobrando (classes em grade 3 × 2) e deslize entre abas
// sem emenda: Diário ↔ Explorar mostra a outra aba DE VERDADE ao lado e, entre as outras abas, o topo fica parado (10/11/2026).
// Uso: node t-x-transicoes.mjs (rodar seed.mjs antes)
import { navegador, entrar } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const erros = [];
const A = await navegador({ mobile: true, rede: true });
const p = await entrar(A.ctx, "ana", "feed.html");
p.on("pageerror", (e) => erros.push(e.message));
await p.waitForURL(/rede\.html/, { timeout: 15000 }).catch(() => {});
for (let i = 0; i < 50 && (await p.evaluate(() => [...document.querySelectorAll(".hf-quadro")].filter((q) => q.dataset.carregou).length)) < 4; i++) await p.waitForTimeout(500);
await p.waitForTimeout(2500);
const feed = () => p.frames().find((f) => f.parentFrame() && /feed\.html/.test(f.url()));
const ativo = () => p.evaluate(() => document.querySelector(".hf-quadro.ativo")?.dataset.id);
const cdp = await A.ctx.newCDPSession(p);
const toque = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
const W = await p.evaluate(() => innerWidth);
// topo e "+"
const f = feed();
const info = await f.evaluate(() => {
  const fab = document.getElementById("btnComporFeed");
  return { fab: fab.classList.contains("fab-hf"), lapis: !!document.querySelector(".topo #btnComporFeed"), ponte: !!document.querySelector(".topo .marca-ponte .mp") };
});
ok(info.fab && !info.lapis, "o + fica do lado (como no X), fora do topo");
ok(info.ponte, "topo com o símbolo da ponte");
await p.screenshot({ path: "saida/x-diario.png" });
await f.locator("#btnComporFeed").tap(); await p.waitForTimeout(600);
ok(await f.evaluate(() => !!document.querySelector("#folhaPublicar.aberta")), "tocar no + abre a nova publicação");
await f.evaluate(() => document.querySelector("#folhaPublicar [data-fechar], #folhaPublicar .fechar")?.click()); await p.waitForTimeout(500);
await f.evaluate(() => document.querySelector(".hf-confirma-fundo [data-acao='descartar'], .hf-confirma-fundo button")?.click()).catch(() => {});
await p.waitForTimeout(400);
// Diário → Explorar: a aba Explorar de verdade aparece ao lado (sem o painel com ícone)
const y = 520;
await toque("touchStart", [[W - 40, y]]);
let meio;
for (let k = 1; k <= 14; k++) {
  await toque("touchMove", [[W - 40 - k * 16, y + 1]]); await p.waitForTimeout(18);
  if (k === 9) meio = await feed().evaluate(() => { const e = document.getElementById("painelExplorar"); return { painel: !!document.querySelector(".df-painel"), visivel: !e.hidden, pos: e.style.position, tr: e.style.transform, x: e.getBoundingClientRect().left }; });
  if (k === 9) await p.screenshot({ path: "saida/x-meio-explorar.png" });
}
await toque("touchEnd", []); await p.waitForTimeout(700);
ok(meio && !meio.painel && meio.visivel && meio.pos === "fixed" && meio.x > 0 && meio.x < W, `no meio do deslize o Explorar de verdade está ao lado (x=${meio && Math.round(meio.x)})`);
ok(/aba=explorar/.test(p.url()), "Diário → Explorar");
const depois = await feed().evaluate(() => { const e = document.getElementById("painelExplorar"); return { fixo: e.style.position, d: document.getElementById("painelFeed").hidden }; });
ok(depois.fixo === "" && depois.d, "no fim o Explorar volta ao lugar normal e o Diário some");
await p.screenshot({ path: "saida/x-explorar.png" });
const cls = await feed().evaluate(() => { const g = document.querySelector("#exploraConteudo .atalhos-classes"); const t = [...g.children].map((x) => x.getBoundingClientRect()); return { cols: getComputedStyle(g).gridTemplateColumns.split(" ").length, todas: t.every((r) => r.right <= innerWidth && r.left >= 0), cor: getComputedStyle(g.querySelector(".ic")).backgroundColor }; });
ok(cls.cols === 3 && cls.todas, "classes de negócio em grade 3 × 2, todas à vista");
ok(!/0, 173, 238|255, 122, 26/.test(cls.cor), `ícones das classes sem cor (${cls.cor})`);
// Explorar → Comunidade: o topo fica parado (cópia na casca). Começa no título "Perto de você" (o carrossel embaixo rola).
const y2 = 345;
await toque("touchStart", [[W - 40, y2]]);
let m2;
for (let k = 1; k <= 14; k++) {
  await toque("touchMove", [[W - 40 - k * 16, y2 + 1]]); await p.waitForTimeout(18);
  if (k === 9) { m2 = await p.evaluate(() => { const t = [...document.body.children].filter((x) => x.tagName === "HEADER"); return { n: t.length, x: t.map((x) => Math.round(x.getBoundingClientRect().left)), op: t.map((x) => x.style.opacity) }; }); await p.screenshot({ path: "saida/x-meio-comunidade.png" }); }
}
await toque("touchEnd", []); await p.waitForTimeout(700);
ok(m2?.n === 2 && m2.x.every((x) => x === 0), `topo parado durante o deslize (${JSON.stringify(m2)})`);
ok(await ativo() === "mural", "Explorar → Comunidade");
ok(await p.evaluate(() => ![...document.body.children].some((x) => x.tagName === "HEADER")), "as cópias do topo somem no fim");
ok(await p.evaluate(() => getComputedStyle(document.querySelector(".hf-quadro.ativo").contentDocument.querySelector("header.topo")).visibility) === "visible", "o topo da aba nova aparece");
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close();
