// Chamada de vídeo (17/11/2026, pedido do dono): câmera desligada mostra a MINHA foto no quadradinho (como no WhatsApp),
// minimizar vira a janelinha do vídeo que gruda nos cantos e a campainha de quem atende solta o som antes do microfone.
// Uso: node seed.mjs && node t-ligacao5.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
for (const d of (await db.collection("chamadas").get()).docs) await d.ref.delete();
const esperar = async (fn, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn().catch(() => false)) return true; await new Promise((r) => setTimeout(r, 200)); } return false; };
const A = await navegador({ mobile: true, camera: true }), B = await navegador({ mobile: true, camera: true });
const ana = await entrar(A.ctx, "ana", "feed.html");
const bru = await entrar(B.ctx, "bruno", `mensagens.html?conversa=${U.conv}`);
const erros = []; bru.on("pageerror", (e) => erros.push(e.message)); ana.on("pageerror", (e) => erros.push(e.message));
await bru.waitForSelector("#btnVideo:not([hidden])", { timeout: 20000 });
await ana.waitForTimeout(3000);
await bru.click("#btnVideo");
ok(await esperar(async () => await ana.locator(".hfl .hfl-bt.atender").count() > 0), "Ana recebe a chamada de vídeo");
await ana.click(".hfl .hfl-bt.atender");
ok(await esperar(async () => /^\d\d:\d\d$/.test(((await bru.textContent(".hfl-sit").catch(() => "")) || "").trim())), "conectou");
ok(await bru.locator(".hfl-local").isVisible() && await bru.locator(".hfl-eu").isHidden(), "câmera ligada: aparece a minha imagem");
await bru.locator(".hfl-bt", { hasText: "Câmera" }).click();
ok(await esperar(async () => await bru.locator(".hfl-eu").isVisible() && await bru.locator(".hfl-local").isHidden(), 5000), "câmera desligada: a minha foto fica no lugar da imagem");
ok(/Câmera off/.test(await bru.textContent(".hfl-eu")), "com o aviso de câmera desligada");
await bru.screenshot({ path: "saida/lig5-camera-off.png" });
await bru.locator(".hfl-bt", { hasText: "Câmera" }).click();
ok(await esperar(async () => await bru.locator(".hfl-local").isVisible() && await bru.locator(".hfl-eu").isHidden(), 5000), "ligou de novo: volta a imagem");
// minimizar a chamada de vídeo: janelinha
await ana.click(".hfl-min");
ok(await esperar(async () => (await ana.locator(".hfm.janela").count()) === 1, 5000), "minimizar a chamada de vídeo vira a janelinha do vídeo");
const v = await ana.locator(".hfm.janela").boundingBox();
ok(v.y >= 60 && v.x + v.width <= 390 - 8, `janelinha no canto de cima à direita, sem cobrir o topo (${Math.round(v.x)}, ${Math.round(v.y)})`);
ok(await esperar(async () => ana.evaluate(() => { const x = document.querySelector(".hfm.janela video"); return !!x && x.videoWidth > 0; }), 8000), "mostra o vídeo do Bruno");
// arrastar para baixo à esquerda: gruda no canto
await ana.mouse.move(v.x + v.width / 2, v.y + v.height / 2); await ana.mouse.down();
for (let i = 1; i <= 10; i++) await ana.mouse.move(v.x + v.width / 2 - i * 25, v.y + v.height / 2 + i * 45);
await ana.mouse.up(); await ana.waitForTimeout(600);
const v2 = await ana.locator(".hfm.janela").boundingBox();
ok(v2.x <= 12 && v2.y + v2.height >= 780 - 90 && v2.y + v2.height <= 780 - 60, `grudou no canto de baixo à esquerda, acima da barra (${Math.round(v2.x)}, ${Math.round(v2.y + v2.height)})`);
await ana.screenshot({ path: "saida/lig5-janela.png" });
await ana.locator(".hfm.janela").click(); await ana.waitForTimeout(500);
ok(await ana.locator(".hfl").isVisible() && (await ana.locator(".hfm").count()) === 0, "tocar na janelinha volta para a chamada");
await bru.locator(".hfl-bt", { hasText: "Encerrar" }).click();
ok(await esperar(async () => (await ana.locator(".hfl").count()) === 0, 8000), "encerrou dos dois lados");
ok(!erros.length, "sem erros: " + erros.join(" | "));
await A.browser.close(); await B.browser.close();
