// Topo da rede: no Diário o nome "Diário" (16/11/2026, letra cursiva como a do Instagram; a rede se chama The Diare), sem a marca Help Floripa;
// no Explorar, Comunidade e Perfil a marca sai. Tocar no nome sobe para o começo do Diário.
// Uso: node seed.mjs | tail -1 > saida/seed-ids.json && node t-marca-ponte.mjs
import { navegador, entrar } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const erros = [];
const A = await navegador({ mobile: true, rede: true });
await A.ctx.addInitScript(() => { try { if (!sessionStorage.getItem("t")) { sessionStorage.setItem("t", "1"); localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" })); } } catch {} });
const p = await entrar(A.ctx, "ana", "feed.html");
p.on("pageerror", (e) => erros.push(e.message));
await p.waitForURL(/rede\.html/, { timeout: 15000 }).catch(() => {});
for (let i = 0; i < 60 && (await p.evaluate(() => [...document.querySelectorAll(".hf-quadro")].filter((q) => q.dataset.carregou).length)) < 4; i++) await p.waitForTimeout(500);
await p.waitForTimeout(1500);
const quadro = (re) => p.frames().find((f) => f.parentFrame() && re.test(f.url()));
const feed = quadro(/feed\.html/), mural = quadro(/mural\.html/), perfil = quadro(/usuarios\.html/);
const topo = (f) => f.evaluate(() => {
  const pt = document.querySelector(".topo .marca-ponte"), svg = pt?.querySelector(".marca-diare"), r = svg?.getBoundingClientRect();
  const h = document.querySelector(".topo").getBoundingClientRect();
  return { escrita: !!document.querySelector(".topo .marca"), texto: /HELP|FLORIPA|LUGAR/.test(document.querySelector(".topo").innerText),
    ponte: !!pt && getComputedStyle(pt).visibility === "visible" && r.width > 30,
    centro: r ? Math.abs((r.left + r.width / 2) - (h.left + h.width / 2)) : 99, cabo: svg ? getComputedStyle(svg).color + "|" + getComputedStyle(svg).fontFamily + "|" + svg.textContent + "|" + document.fonts.check('33px "The Diare"') : "", gear: !!document.querySelector('.topo a[href="configuracoes.html"]'), sino: !!document.querySelector('.topo a[href="notificacoes.html"]'), fab: !!document.querySelector("body > .fab-hf") && getComputedStyle(document.querySelector("body > .fab-hf")).display !== "none" };
});
const d = await topo(feed);
ok(d.ponte && !d.escrita && !d.texto, "Diário: só o nome Diário na letra cursiva, sem HELP FLORIPA e slogan");
ok(d.centro < 3, "Diário: nome no meio do topo (" + d.centro.toFixed(1) + " px)");
ok(/"The Diare".*\|Diário\|true/.test(d.cabo) && /rgb\(2[0-9]{2}/.test(d.cabo), "Diário: nome na letra cursiva e na cor do texto (" + d.cabo + ")");
ok(!d.gear && d.sino, "Diário: sem engrenagem, com o sino");
ok(d.fab, "Diário: + do lado");
await p.screenshot({ path: "saida/mp-diario.png" });
await feed.evaluate(() => scrollTo(0, 900)); await p.waitForTimeout(300);
await feed.locator("#marcaTopo").click(); await p.waitForTimeout(900);
ok(await feed.evaluate(() => scrollY) < 5, "tocar no nome sobe para o começo");
await p.locator('#barraRede [data-barra="explorar"], [data-barra="explorar"]').first().click().catch(async () => { await feed.locator('[data-barra="explorar"]').click(); });
await p.waitForTimeout(1200);
const e = await topo(feed);
ok(!e.ponte && !e.escrita && !e.texto, "Explorar: sem marca");
ok(!e.fab, "Explorar: sem o +");
ok(await feed.locator("#secSugestoes, #secPostsPerto").count() === 0, "Explorar: sem Sugestões e Publicações perto");
await p.screenshot({ path: "saida/mp-explorar.png" });
for (const [nome, f, k] of [["Comunidade", mural, "comunidade"], ["Perfil", perfil, "perfil"]]) {
  await p.evaluate((k) => window.__hfShell.ir(k), k); await p.waitForTimeout(1200);
  const t = await topo(f);
  ok(!t.ponte && !t.escrita && !t.texto, nome + ": sem marca");
  ok(k === "perfil" ? t.gear : !t.gear && t.fab, nome + (k === "perfil" ? ": engrenagem só aqui" : ": sem engrenagem, com o +"));
  await p.screenshot({ path: `saida/mp-${k}.png` });
}
await p.evaluate(() => window.__hfShell.ir("diario")); await p.waitForTimeout(1000);
ok((await topo(feed)).ponte, "voltando ao Diário o nome aparece");
await feed.evaluate(() => { const c = JSON.parse(localStorage.getItem("hf-chat-config") || "{}"); c.tema = "claro"; localStorage.setItem("hf-chat-config", JSON.stringify(c)); });
await p.reload(); await p.waitForTimeout(5000);
await p.screenshot({ path: "saida/mp-diario-claro.png" });
ok(await quadro(/feed\.html/).evaluate(() => /rgb\(([0-9]|[1-9][0-9]),/.test(getComputedStyle(document.querySelector(".marca-diare")).color)), "tema claro: nome escuro");
const pc = await A.ctx.newPage(); await pc.setViewportSize({ width: 1280, height: 800 });
await pc.goto("http://127.0.0.1:5057/feed.html"); await pc.waitForTimeout(4000);
await pc.screenshot({ path: "saida/mp-computador.png" });
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close();
