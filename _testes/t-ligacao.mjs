// Ligações de voz e vídeo no chat (chamadas.js): Bruno liga por vídeo da conversa, Ana recebe a tela de chamada em
// outra página, atende, os dois se veem (vídeo de mentira do Chromium), cronômetro, mudo, encerrar e o cartão na
// conversa; ligação de voz recusada vira "não atendida".
// Uso: node seed.mjs && node t-ligacao.mjs  (precisa das regras do repositório)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
for (const d of (await db.collection("chamadas").get()).docs) await d.ref.delete();
const A = await navegador({ mobile: true, camera: true }), B = await navegador({ mobile: true, camera: true });
const ana = await entrar(A.ctx, "ana", "feed.html");
const bru = await entrar(B.ctx, "bruno", `mensagens.html?conversa=${U.conv}`);
await bru.waitForSelector("#btnVideo:not([hidden])", { timeout: 20000 }); await bru.waitForTimeout(2500); await ana.waitForTimeout(2500);
ok(await bru.locator("#btnLigar").isVisible() && await bru.locator("#btnVideo").isVisible(), "chat: botões de ligação de voz e de vídeo no topo");

// 1) vídeo, atendida
await bru.click("#btnVideo");
await ana.waitForSelector(".hfl", { timeout: 15000 });
const tela = (await ana.textContent(".hfl")).replace(/\s+/g, " ");
ok(tela.includes("Chamada de vídeo") && tela.includes("Bruno") && await ana.locator(".hfl-bt.atender").count() === 1, "Ana (em outra página) vê a chamada de vídeo do Bruno com Atender/Recusar");
await ana.screenshot({ path: "saida/lig-recebendo.png" });
ok((await bru.textContent(".hfl")).includes("Chamando"), "Bruno vê \"Chamando…\"");
await ana.click(".hfl-bt.atender");
await bru.waitForSelector(".hfl.com-video", { timeout: 20000 }).catch(() => {});
await ana.waitForSelector(".hfl.com-video", { timeout: 20000 }).catch(() => {});
await ana.waitForTimeout(2500);
const vid = async (p) => p.evaluate(() => { const v = document.querySelector(".hfl-remoto"); return v ? [v.videoWidth, v.readyState] : [0, 0]; });
const [vb, va] = [await vid(bru), await vid(ana)];
ok(vb[0] > 0 && va[0] > 0, `os dois recebem o vídeo do outro (${vb[0]}px e ${va[0]}px)`);
ok(/^\d\d:\d\d$/.test((await bru.textContent(".hfl-topo span")).trim()), "cronômetro rodando: " + (await bru.textContent(".hfl-topo span")).trim());
await bru.screenshot({ path: "saida/lig-video.png" });
await bru.locator(".hfl-bt", { hasText: "Microfone" }).click();
ok(await bru.evaluate(() => document.querySelector(".hfl-bt.off")?.textContent?.includes("Mudo")), "botão de mudo");
await bru.waitForTimeout(1500);
await bru.locator(".hfl-bt.fim").click();
await ana.waitForSelector(".hfl", { state: "detached", timeout: 10000 }).catch(() => {});
ok(await ana.locator(".hfl").count() === 0 && await bru.locator(".hfl").count() === 0, "encerrar fecha a tela dos dois lados");
await bru.waitForSelector(".chamada-msg", { timeout: 10000 }).catch(() => {});
const card = (await bru.locator(".chamada-msg").last().textContent() || "").replace(/\s+/g, " ");
ok(/Chamada de vídeo · \d+ s/.test(card) && card.includes("Ligar de novo"), "cartão na conversa: " + card);
const ch = (await db.collection("chamadas").get()).docs.map((d) => d.data());
ok(ch.length === 1 && ch[0].status === "encerrada" && !!ch[0].aceitaEm && !!ch[0].resposta, "chamada gravada só com a sinalização e o resultado (encerrada)");

// 2) voz, recusada
await bru.click("#btnLigar");
await ana.waitForSelector(".hfl", { timeout: 15000 });
ok((await ana.textContent(".hfl")).includes("Chamada de voz"), "Ana recebe a ligação de voz");
await ana.locator(".hfl-bt.fim").click();
await bru.waitForSelector(".hfl", { state: "detached", timeout: 10000 }).catch(() => {});
await bru.waitForTimeout(1500);
const card2 = (await bru.locator(".chamada-msg").last().textContent() || "").replace(/\s+/g, " ");
ok(card2.includes("Ligação de voz não atendida"), "recusada: cartão \"não atendida\" → " + card2);
await bru.locator(".chamada-msg").last().screenshot({ path: "saida/lig-cartao.png" });
await A.browser.close(); await B.browser.close();
