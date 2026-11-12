// Início e vitrines no preto do celular (tema escuro): fundo, topo e barra do celular #000 (12/11/2026).
import { navegador, entrar, BASE } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const A = await navegador({ mobile: true });
await A.ctx.addInitScript(() => { try { localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" })); } catch {} });
const p = await entrar(A.ctx, "bruno", "index.html");
for (const pg of ["index.html", "servicos.html", "ajuda.html"]) {
  await p.goto(BASE + pg); await p.waitForTimeout(1800);
  const r = await p.evaluate(() => ({ bg: getComputedStyle(document.body).backgroundColor, topo: getComputedStyle(document.querySelector(".topo")).backgroundColor,
    meta: document.querySelector('meta[name="theme-color"]').content }));
  ok(r.bg === "rgb(0, 0, 0)" && r.topo === "rgb(0, 0, 0)" && r.meta === "#000000", pg + ": fundo, topo e barra do celular pretos " + JSON.stringify(r));
  if (pg === "index.html") await p.screenshot({ path: "saida/inicio-preto.png" });
}
await A.browser.close();
