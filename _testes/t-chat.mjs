// Chat: foco ao enviar, cartão de avaliação (cache, sem "Carregando..." de novo), layout.
import { navegador, entrar, USUARIOS } from "./nav.mjs";
const quem = process.argv[2] || "bruno";
const { browser, ctx } = await navegador({ mobile: process.argv[3] !== "pc" });
const p = await entrar(ctx, quem, `mensagens.html?conversa=${USUARIOS.conv}`);
await p.waitForSelector(".aval-status", { timeout: 20000 });
await p.evaluate(() => {
  window.__carregando = 0; window.__blur = 0; window.__linhasNovas = 0;
  new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) { if (n.nodeType === 1 && n.matches?.(".linha-msg")) window.__linhasNovas++; } }).observe(document.getElementById("msgs"), { childList: true });
  setInterval(() => { if ([...document.querySelectorAll(".aval-status")].some((s) => s.textContent.includes("Carregando"))) window.__carregando++; }, 20);
  document.getElementById("texto").addEventListener("blur", () => window.__blur++);
});
const ini = Date.now();
await p.waitForFunction(() => ![...document.querySelectorAll(".aval-status")].some((s) => s.textContent.includes("Carregando")), null, { timeout: 15000 }).catch(() => console.log("CARTÃO PRESO EM CARREGANDO"));
console.log("cartão pronto em", Date.now() - ini, "ms:", await p.locator(".aval-status").first().textContent());
await p.evaluate(() => { window.__carregando = 0; window.__linhasNovas = 0; });
await p.tap("#texto");
await p.keyboard.type("Teste de foco 1");
await p.tap("#btnEnviar");
await p.waitForTimeout(1500);
await p.keyboard.type("Teste de foco 2");
await p.tap("#btnEnviar");
await p.waitForTimeout(2500);
const r = await p.evaluate(() => ({ ativo: document.activeElement?.id || document.activeElement?.tagName, blur: window.__blur, carregando: window.__carregando, linhasNovas: window.__linhasNovas, ultima: [...document.querySelectorAll(".linha-msg .texto")].pop()?.textContent }));
console.log(JSON.stringify(r));
await p.screenshot({ path: `saida/chat-${quem}.png` });
await browser.close();
