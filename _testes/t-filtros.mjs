// Filtros das vitrines (botão Filtros com gaveta, contagem ao vivo, etiquetas com x, voltar fecha) e filtro
// por tipo nos carrosséis do início. Uso: node t-filtros.mjs
import { navegador, entrar, BASE } from "./nav.mjs";
const ok = (c, m) => console.log(c ? "  ✔" : "  ✘", m);
const { browser, ctx } = await navegador({ mobile: true });
await ctx.addInitScript(() => { try { localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" })); } catch {} });
const p = await entrar(ctx, "ana", "imoveis.html");
await p.waitForSelector("#vtFiltrosBtn", { timeout: 20000 }); await p.waitForTimeout(3000);
await p.evaluate(() => document.querySelector(".hfman-x")?.click());
await p.locator(".filtros").scrollIntoViewIfNeeded(); await p.screenshot({ path: "saida/filtros-barra.png" });
const visiveis = async () => (await p.locator("#vitrine").textContent()) || "";
ok((await visiveis()).includes("Apto na Trindade") && (await visiveis()).includes("Studio em Pinheiros"), "sem filtro: os 2 imóveis");
await p.click("#vtFiltrosBtn"); await p.waitForTimeout(400);
ok(await p.locator(".vt-filtros-pop").count() === 1, "Filtros abre a gaveta");
await p.locator(".vt-f-chip", { hasText: "R$ 2.500" }).click(); await p.waitForTimeout(200);
ok((await p.textContent(".vt-filtros-pop .vt-local-aplicar")) === "Ver 1 resultado", "contagem ao vivo: Ver 1 resultado");
await p.locator(".vt-f-chip", { hasText: "Mobiliado" }).click(); await p.waitForTimeout(200);
ok((await p.textContent(".vt-filtros-pop .vt-local-aplicar")) === "Nenhum resultado" && await p.locator(".vt-filtros-pop .vt-local-aplicar").isDisabled(), "sem resultado: botão travado");
await p.locator(".vt-f-chip", { hasText: "Mobiliado" }).click(); await p.waitForTimeout(200);
await p.screenshot({ path: "saida/filtros-gaveta.png" });
await p.goBack(); await p.waitForTimeout(500);
ok(await p.locator(".vt-filtros-pop").count() === 0 && p.url().includes("imoveis.html"), "voltar fecha a gaveta e fica na página");
ok(await p.locator(".vt-ativo").count() === 0, "fechar sem aplicar não muda nada");
await p.click("#vtFiltrosBtn"); await p.waitForTimeout(300);
await p.locator(".vt-f-chip", { hasText: "R$ 2.500" }).click(); await p.locator(".vt-filtros-pop .vt-local-aplicar").click(); await p.waitForTimeout(800);
ok((await p.textContent("#vtFiltrosBtn b")) === "1" && (await p.locator(".vt-ativo").textContent()).includes("Até R$"), "botão com 1 e etiqueta do filtro");
ok((await visiveis()).includes("Apto na Trindade") && !(await visiveis()).includes("Studio em Pinheiros"), "filtro aplicado na lista");
await p.locator(".filtros").scrollIntoViewIfNeeded(); await p.screenshot({ path: "saida/filtros-ativos.png" });
await p.reload(); await p.waitForTimeout(3500);
ok((await p.textContent("#vtFiltrosBtn b")) === "1", "filtro guardado depois de recarregar");
await p.locator(".vt-ativo").first().click(); await p.waitForTimeout(500);
ok(await p.locator(".vt-ativo").count() === 0 && (await visiveis()).includes("Studio em Pinheiros"), "x na etiqueta tira o filtro");

for (const pg of ["servicos", "delivery", "shopping"]) {
  await p.goto(BASE + pg + ".html"); await p.waitForTimeout(3000);
  await p.click("#vtFiltrosBtn"); await p.waitForTimeout(300);
  const n = await p.locator(".vt-f-chip").count();
  ok(n >= 6, `${pg}: ${n} opções na gaveta`);
  await p.screenshot({ path: `saida/filtros-gaveta-${pg}.png` });
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
}

// início: filtro por tipo nos carrosséis
await p.goto(BASE + "index.html"); await p.waitForTimeout(4000);
const f = p.locator("#secTop .hm-filtro");
ok(await f.count() === 1, "início: filtro por tipo em Mais bem avaliados: " + (await f.locator("button").allTextContents()).join(" | "));
await f.locator("button", { hasText: "Freelances" }).click(); await p.waitForTimeout(800);
const tipos = await p.evaluate(() => [...document.querySelectorAll("#trilhoTop .slot a")].map((a) => a.getAttribute("href")));
ok(tipos.length > 0 && tipos.every((h) => h.startsWith("servicos.html")), "Freelances: só profissionais no carrossel");
await p.locator("#secTop").scrollIntoViewIfNeeded(); await p.screenshot({ path: "saida/filtros-inicio.png" });
await browser.close();
process.exit(0);
