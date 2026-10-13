import { navegador, entrar, USUARIOS } from "./nav.mjs";
const { browser, ctx } = await navegador({ mobile: true });
const p = await entrar(ctx, "bruno", `mensagens.html?conversa=${USUARIOS.conv}`);
await p.waitForSelector(".aval-status", { timeout: 20000 });
await p.waitForTimeout(1500);
// 1) Voltar para a lista e abrir de novo: o cartão aparece pronto (sem "Carregando...").
await p.tap("#btnFecharConversa");
await p.waitForTimeout(500);
await p.evaluate(() => { window.__c = 0; setInterval(() => { if ([...document.querySelectorAll(".aval-status")].some((s) => s.textContent.includes("Carregando"))) window.__c++; }, 10); });
await p.locator(".conv-item").first().click().catch(() => {});
await p.waitForSelector(".aval-status", { timeout: 10000 });
await p.waitForTimeout(800);
console.log("reabrir -> vezes em Carregando:", await p.evaluate(() => window.__c), "|", await p.locator(".aval-status").first().textContent());
// 2) Rolagem: a etiqueta do dia aparece e some sozinha.
await p.evaluate(() => { const c = document.getElementById("msgs"); c.scrollTop = 300; });
await p.waitForTimeout(300);
const chip1 = await p.evaluate(() => ({ on: document.getElementById("diaFlutuante").classList.contains("on"), t: document.getElementById("diaFlutuante").textContent }));
await p.screenshot({ path: "saida/rolando.png" });
await p.waitForTimeout(1600);
const chip2 = await p.evaluate(() => document.getElementById("diaFlutuante").classList.contains("on"));
console.log("etiqueta ao rolar:", JSON.stringify(chip1), "| depois de parar:", chip2);
// 3) Sem conexão e sem nada guardado: o cartão não fica preso.
await p.evaluate(() => sessionStorage.removeItem("hf-aval-situacao"));
const bloquear = (r) => r.abort(); await ctx.route(/127\.0\.0\.1:8085/, bloquear);
await p.reload();
await p.waitForSelector(".aval-status", { timeout: 30000 }).catch(() => {});
await p.waitForTimeout(16000);
console.log("offline:", await p.locator(".aval-status").first().textContent().catch(() => "(sem cartão)"), "| botões:", await p.locator(".aval-acoes button").allTextContents().catch(() => []));
await ctx.unroute(/127\.0\.0\.1:8085/, bloquear);
await p.waitForFunction(() => !document.querySelector(".aval-status").textContent.includes("Não foi possível"), null, { timeout: 40000 }).catch(() => {});
console.log("depois de tentar de novo:", await p.locator(".aval-status").first().textContent());
await p.evaluate(() => { const c = document.getElementById("msgs"); c.scrollTop = c.scrollHeight; });
await p.waitForTimeout(1500);
await p.screenshot({ path: "saida/fim.png" });
await browser.close();
