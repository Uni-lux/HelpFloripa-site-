import { navegador, entrar } from "./nav.mjs";
const { browser, ctx } = await navegador({ mobile: true });
await ctx.addInitScript(() => { try { localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" })); } catch {} });
const p = await entrar(ctx, "ana", "index.html");
for (const pg of (process.argv[2] || "index,servicos,delivery,shopping,imoveis").split(",")) {
  await p.goto("http://127.0.0.1:5057/" + pg + ".html"); await p.waitForTimeout(3500);
  await p.evaluate(() => document.querySelector(".hfman-x")?.click());
  const y = await p.evaluate(() => { const f = document.querySelector(".filtros, #filterChips, .busca-geral"); return f ? f.getBoundingClientRect().top + scrollY - 140 : 0; });
  await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(400);
  await p.screenshot({ path: `saida/filtro-antes-${pg}.png` });
}
await browser.close(); process.exit(0);
