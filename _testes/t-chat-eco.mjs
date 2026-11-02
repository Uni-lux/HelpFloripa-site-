// Chat: o teclado Android devolve a palavra para o campo depois de enviar e um 2º toque mandava duas vezes (02/11/2026).
// Também: rodapé da enquete do flash e "Visto por" alinhados. Uso: node t-chat-eco.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const CONV = [U.ana, U.bruno].sort().join("_");
const A = await navegador({ mobile: true });
const p = await entrar(A.ctx, "ana", `mensagens.html?conversa=${CONV}`);
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector("body.chat-aberto", { timeout: 15000 }); await p.waitForTimeout(1500);
const texto = "Oi, tudo certo? " + Date.now();
await p.locator("#texto").fill(texto);
await p.locator("#btnEnviar").tap();
// o teclado devolve o texto (como o Gboard faz com a palavra que estava sendo escrita)
await p.evaluate((t) => { const c = document.getElementById("texto"); c.value = t; c.dispatchEvent(new Event("input", { bubbles: true })); }, texto);
await p.waitForTimeout(80);
const depois = await p.locator("#texto").inputValue();
ok(depois === "", `o texto que o teclado devolveu sai do campo (“${depois}”)`);
await p.locator("#texto").fill(texto); await p.locator("#btnEnviar").tap(); // 2º toque com o mesmo texto
await p.waitForTimeout(2500);
const n = (await db.collection(`conversas/${CONV}/mensagens`).where("texto", "==", texto).get()).size;
ok(n === 1, `a mensagem foi uma vez só (${n})`);
await p.waitForTimeout(1500);
await p.locator("#texto").fill(texto); await p.locator("#btnEnviar").tap(); await p.waitForTimeout(2000);
const n2 = (await db.collection(`conversas/${CONV}/mensagens`).where("texto", "==", texto).get()).size;
ok(n2 === 2, `depois de 2 s o mesmo texto pode ir de novo, de propósito (${n2})`);
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close();
