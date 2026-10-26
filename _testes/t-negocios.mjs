// Meus negócios: topo com os 4 tipos, cartões criados (completude, compartilhar) e de criar (cor de cada classe),
// formulário que muda de cor e textos conforme o tipo, WhatsApp formatado. Uso: node t-negocios.mjs [dark|light]
import { navegador, entrar } from "./nav.mjs";
const tema = process.argv[2] || "dark";
const { browser, ctx } = await navegador({ mobile: true });
await ctx.addInitScript((t) => { try { localStorage.setItem("hf-chat-config", JSON.stringify({ tema: t === "dark" ? "escuro" : "claro" })); } catch {} }, tema);
const p = await entrar(ctx, "bruno", "negocios.html");
await p.waitForSelector(".ng-slot", { timeout: 15000 }); await p.waitForTimeout(2500);
await p.evaluate(() => document.querySelector(".hfman-x")?.click());
await p.screenshot({ path: `saida/neg-${tema}-1.png` });
await p.screenshot({ path: `saida/neg-${tema}-full.png`, fullPage: true });
console.log("cards:", await p.locator(".neg-card").count(), "novos:", await p.locator(".ng-novo").count(), "comp:", await p.locator(".ng-comp-topo strong").allTextContents());
await p.locator(".ng-novo").first().click(); await p.waitForTimeout(800);
// Sem plano e já com perfil: pergunta antes (o novo fica pausado). Aceita para seguir.
if (await p.locator(".hf-confirma .sim").count()) { await p.locator(".hf-confirma .sim").click(); await p.waitForTimeout(800); }
console.log("titulo:", await p.textContent("#tNegocio"), "ph:", await p.getAttribute("#negNome", "placeholder"));
await p.screenshot({ path: `saida/neg-${tema}-form.png` });
await p.fill("#negWhats", "48999887766"); console.log("whats:", await p.inputValue("#negWhats"));
await p.locator("button.ng-tipo:not(:disabled)").last().click(); await p.waitForTimeout(400);
console.log("tipo:", await p.getAttribute("#folhaNegocio", "data-tipo"));
await p.screenshot({ path: `saida/neg-${tema}-form2.png` });
await browser.close();
