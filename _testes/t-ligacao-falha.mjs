// Ligação que NÃO conecta (09/11/2026, relato do dono: "fica em Conectando… e o barulho do telefone chamando continua").
// Simula uma rede que bloqueia a ligação direta: os dois aparelhos ignoram os caminhos (candidatos ICE) do outro.
// Confere: o "tuu… tuu…" de quem ligou para assim que a outra pessoa atende; depois de 9 s aparece o aviso de demora;
// aos 30 s a tela diz "Não foi possível conectar" com o motivo, fecha sozinha e o cartão do chat diz "Não conectou".
// Uso: node seed.mjs && node t-ligacao-falha.mjs  (leva ~45 s)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
for (const d of (await db.collection("chamadas").get()).docs) await d.ref.delete();
const bloquear = () => { RTCPeerConnection.prototype.addIceCandidate = function () { return Promise.resolve(); }; };
const A = await navegador({ mobile: true, camera: true }), B = await navegador({ mobile: true, camera: true });
await A.ctx.addInitScript(bloquear); await B.ctx.addInitScript(bloquear);
const ana = await entrar(A.ctx, "ana", "index.html");
const bru = await entrar(B.ctx, "bruno", `mensagens.html?conversa=${U.conv}`);
const avisosCand = []; bru.on("console", (m) => { if (/caminhos do outro lado/.test(m.text())) avisosCand.push(m.text()); });
await bru.waitForSelector("#btnLigar:not([hidden])", { timeout: 20000 }); await bru.waitForTimeout(2500); await ana.waitForTimeout(2500);
await bru.click("#btnLigar");
await ana.waitForSelector(".hfl .hfl-bt.atender", { timeout: 15000 });
ok(await bru.locator(".hfl.tocando").count() === 1, "antes de atender, quem ligou ouve o telefone chamando");
await ana.click(".hfl-bt.atender");
const parou = await bru.waitForFunction(() => !document.querySelector(".hfl.tocando") && /Conectando/.test(document.querySelector(".hfl-topo span")?.textContent || ""), null, { timeout: 8000 }).then(() => true).catch(() => false);
ok(parou, "atendeu: o \"tuu… tuu…\" de quem ligou para na hora e aparece \"Conectando…\"");
ok(await ana.locator(".hfl.tocando").count() === 0, "quem atendeu também não ouve mais a campainha");
await bru.waitForTimeout(9500);
ok(/demorando/.test(await bru.textContent(".hfl-aviso").catch(() => "")), "depois de 9 s: aviso de que está demorando (4G/5G, Wi-Fi)");
const falhou = await bru.waitForFunction(() => /Não foi possível conectar/.test(document.querySelector(".hfl-topo span")?.textContent || ""), null, { timeout: 30000 }).then(() => true).catch(() => false);
ok(falhou, "aos 30 s: \"Não foi possível conectar\" (antes ficava em \"Conectando…\" para sempre)");
const motivo = await bru.textContent(".hfl-aviso").catch(() => "");
ok(/bloqueou a ligação direta.*Wi-Fi/.test(motivo), "com o motivo certo (quem ligou RECEBEU os caminhos de quem atendeu) e o que fazer: " + motivo);
ok(!avisosCand.length, "a escuta dos caminhos do outro lado não foi recusada (bug antigo): " + avisosCand.join(" | "));
await bru.screenshot({ path: "saida/lig-falha.png" });
ok(await bru.waitForSelector(".hfl", { state: "detached", timeout: 10000 }).then(() => true).catch(() => false), "a tela fecha sozinha");
ok(await ana.waitForSelector(".hfl", { state: "detached", timeout: 15000 }).then(() => true).catch(() => false), "e a de quem atendeu também");
await bru.waitForTimeout(1500);
const card = (await bru.locator(".chamada-msg").last().textContent().catch(() => "") || "").replace(/\s+/g, " ");
ok(card.includes("Não conectou"), "cartão no chat: " + card);
await A.browser.close(); await B.browser.close();
for (const d of (await db.collection("chamadas").get()).docs) await d.ref.delete();
