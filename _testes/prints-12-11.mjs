// Prints do PR de 12/11/2026 (ligação, corretor no chat). Uso: node seed.mjs && node prints-12-11.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
import { initializeApp } from "firebase-admin/app"; import { getFirestore } from "firebase-admin/firestore";
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
for (const d of (await db.collection("chamadas").get()).docs) await d.ref.delete();
const A = await navegador({ mobile: true, camera: true }), B = await navegador({ mobile: true, camera: true });
const ana = await entrar(A.ctx, "ana", "mensagens.html");
const bru = await entrar(B.ctx, "bruno", `mensagens.html?conversa=${U.conv}`);
await bru.waitForSelector("#btnLigar:not([hidden])", { timeout: 20000 }); await ana.waitForTimeout(2000);
await bru.click("#btnLigar");
await ana.waitForSelector(".hfl .hfl-desliza", { timeout: 20000 }); await ana.waitForTimeout(800);
await ana.screenshot({ path: "saida/print-ligacao-recebendo.png" });
const cdp = await ana.context().newCDPSession(ana);
const tr = await ana.locator(".hfl-desliza").boundingBox(); const y = tr.y + tr.height / 2, x = tr.x + tr.width / 2;
await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x + 30, y, id: 1 }] });
for (let i = 1; i <= 8; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + 30 + i * 10, y, id: 1 }] }); await ana.waitForTimeout(16); }
await ana.screenshot({ path: "saida/print-ligacao-arrastando.png" });
await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await ana.waitForTimeout(500); await ana.locator(".hfl-bt.fim").first().click().catch(() => {});
await bru.waitForTimeout(1500);
// corretor no chat
await bru.goto(bru.url()); await bru.waitForSelector("#texto", { timeout: 20000 });
await bru.locator("#texto").fill("oi vc ta bem? amanha eu passo la pra ver o orcamento do servico");
await bru.waitForTimeout(900);
await bru.screenshot({ path: "saida/print-chat-corrigir.png" });
await bru.locator("#chipCorretor").click(); await bru.locator(".cr-fundo").waitFor();
await bru.screenshot({ path: "saida/print-chat-revisar.png" });
await Promise.all([A.browser.close(), B.browser.close()]);
