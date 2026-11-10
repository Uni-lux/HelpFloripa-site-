// Reações nas mensagens (10/11/2026, pedido do dono): segurar o balão mostra os emojis em cima do menu, a reação
// aparece numa pílula no pé do balão (a outra pessoa vê), tocar de novo tira; toque duplo = ❤️.
// Uso: node seed.mjs && node t-reacoes-msg.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const esperar = async (fn, ms = 10000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn().catch(() => false)) return true; await new Promise((r) => setTimeout(r, 150)); } return false; };
const CONV = [U.ana, U.bruno].sort().join("_");
await db.doc(`conversas/${CONV}`).set({ participantes: [U.ana, U.bruno].sort(), atualizadoEm: FieldValue.serverTimestamp(), ultimaMensagem: "Bora amanhã?", ultimaMensagemRemetenteId: U.bruno }, { merge: true });
await db.doc(`conversas/${CONV}/mensagens/rx1`).set({ remetenteId: U.bruno, texto: "Consegui o orçamento da reforma! 🎉", criadoEm: Timestamp.fromMillis(Date.now() - 120000) });
await db.doc(`conversas/${CONV}/mensagens/rx2`).set({ remetenteId: U.bruno, texto: "Bora amanhã?", criadoEm: Timestamp.fromMillis(Date.now() - 60000) });

const A = await navegador({ mobile: true });
const p = await entrar(A.ctx, "ana", `mensagens.html?conversa=${CONV}`);
if (process.env.CLARO !== "1") await p.emulateMedia({ colorScheme: "dark" }); // prints no tema escuro
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector('.linha-msg[data-id="rx1"] .bolha', { timeout: 20000 }); await p.waitForTimeout(800);
const b1 = p.locator('.linha-msg[data-id="rx1"] .bolha');
await b1.click({ button: "right" });
await p.waitForSelector("#menuMsg .menu-reacoes button");
ok(await p.locator("#menuMsg .menu-reacoes button").count() === 8, "segurar o balão: 8 emojis em cima do menu");
await p.screenshot({ path: "saida/rm-01-menu.png" });
await p.locator("#menuMsg .menu-reacoes button", { hasText: "😂" }).click();
ok(await esperar(async () => (await db.doc(`conversas/${CONV}/mensagens/rx1`).get()).data().reacoes?.[U.ana] === "😂"), "reação gravada na mensagem");
ok(await p.locator('.linha-msg[data-id="rx1"] .msg-reacoes').textContent() === "😂", "pílula com o emoji no pé do balão");
// a outra pessoa também reage (chega ao vivo)
await db.doc(`conversas/${CONV}/mensagens/rx1`).update({ [`reacoes.${U.bruno}`]: "❤️" });
ok(await esperar(async () => (await p.locator('.linha-msg[data-id="rx1"] .msg-reacoes .mr-n').textContent()) === "2"), "reação da outra pessoa aparece ao vivo (2)");
// toque duplo no outro balão = ❤️
await p.locator('.linha-msg[data-id="rx2"] .bolha .texto').dblclick();
ok(await esperar(async () => (await db.doc(`conversas/${CONV}/mensagens/rx2`).get()).data().reacoes?.[U.ana] === "❤️"), "toque duplo = ❤️");
await p.waitForTimeout(500);
await p.screenshot({ path: "saida/rm-02-reacoes.png" });
// tocar na própria reação de novo tira
await b1.click({ button: "right" }); await p.waitForSelector("#menuMsg .menu-reacoes button.eu");
await p.locator("#menuMsg .menu-reacoes button.eu").click();
ok(await esperar(async () => !(await db.doc(`conversas/${CONV}/mensagens/rx1`).get()).data().reacoes?.[U.ana]), "tocar na mesma reação tira");
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close(); process.exit();
