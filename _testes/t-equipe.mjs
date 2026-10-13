// Chat da equipe: visual, envio com o botão redondo, áudio com ondas, menu da mensagem e conversa individual.
import { navegador, entrar } from "./nav.mjs";
const mobile = process.argv[2] !== "pc";
const { browser, ctx } = await navegador({ mobile });
const p = await entrar(ctx, "admin", "admin.html#equipe");
const toque = (sel) => (mobile ? p.locator(sel).first().tap() : p.locator(sel).first().click());
await p.waitForSelector(".eq-chat", { timeout: 30000 });
await p.waitForTimeout(2500);
if (mobile) { await p.screenshot({ path: "saida/eq-lista.png" }); await toque(".eq-item"); await p.waitForTimeout(800); }
console.log("botão redondo (vazio):", await p.getAttribute(".eq-compor .eq-principal", "aria-label"));
await p.locator(".eq-caixa textarea").fill("Teste do novo chat da equipe");
await p.dispatchEvent(".eq-caixa textarea", "input");
console.log("botão redondo (com texto):", await p.getAttribute(".eq-compor .eq-principal", "aria-label"));
await toque(".eq-compor .eq-principal");
await p.waitForTimeout(1500);
console.log("enviada:", await p.locator(".eq-linha.meu .eq-texto").last().textContent(), "| foco no campo:", await p.evaluate(() => document.activeElement?.tagName));
// áudio
await p.evaluate(() => document.querySelector(".eq-balao .hf-audio")?.scrollIntoView({ block: "center" }));
await toque(".eq-balao .hf-audio-play");
await p.waitForTimeout(2500);
console.log("áudio:", await p.evaluate(() => { const a = document.querySelector(".eq-balao .hf-audio"); return { classe: a.className, tempo: a.querySelector(".hf-audio-tempo").textContent, on: a.querySelectorAll("i.on").length }; }));
// chega mensagem nova enquanto toca: o áudio continua
await p.evaluate(async () => { });
// menu da mensagem
const alvo = p.locator(".eq-linha:not(.meu) .eq-balao").first();
if (mobile) { const b = await alvo.boundingBox(); await p.touchscreen.tap(b.x + 30, b.y + 10).catch(() => {}); await alvo.dispatchEvent("contextmenu"); } else await alvo.click({ button: "right" });
await p.waitForTimeout(400);
console.log("menu:", await p.locator(".eq-menu:not([hidden]) .eq-menu-item").allTextContents(), "| emojis:", await p.locator(".eq-menu:not([hidden]) .eq-menu-emoji").count());
await p.screenshot({ path: `saida/eq-menu-${mobile ? "cel" : "pc"}.png` });
await p.keyboard.press("Escape");
await p.waitForTimeout(300);
await p.screenshot({ path: `saida/eq-grupo-${mobile ? "cel" : "pc"}.png` });
// conversa individual
if (mobile) { await toque(".eq-voltar"); await p.waitForTimeout(400); }
await p.locator(".eq-item", { hasText: "Daniel" }).first().click();
await p.waitForTimeout(1500);
console.log("individual:", await p.locator(".eq-quem strong").textContent(), "| msgs:", await p.locator(".eq-linha").count(), "| erro:", await p.locator(".eq-vazio").allTextContents());
await p.screenshot({ path: `saida/eq-dm-${mobile ? "cel" : "pc"}.png` });
await browser.close();
