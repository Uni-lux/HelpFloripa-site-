import { navegador, entrar } from "./nav.mjs";
const larg = Number(process.argv[2] || 390);
const { browser, ctx } = await navegador({ mobile: true });
await ctx.newPage().then((p) => p.close());
const p = await entrar(ctx, "admin", "admin.html#estatisticas");
await p.setViewportSize({ width: larg, height: 800 });
await p.waitForTimeout(6000);
await p.locator(".ad-chip", { hasText: "Personalizado" }).click();
await p.waitForTimeout(400);
const r = await p.evaluate(() => {
  const w = document.documentElement.clientWidth;
  const fora = [...document.querySelectorAll(".ad-cab button, .ad-cab .ad-chip, .ad-cab select, .ad-cab input, .ad-cab label")].map((e) => { const b = e.getBoundingClientRect(); return { t: e.textContent.trim().slice(0, 28), l: Math.round(b.left), r: Math.round(b.right) }; }).filter((x) => x.r > w + 1 || x.l < -1);
  return { w, scrollW: document.documentElement.scrollWidth, fora };
});
console.log(larg, JSON.stringify(r));
await p.screenshot({ path: `saida/painel-${larg}.png` });
await browser.close();
