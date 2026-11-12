// Mensagens: deslizar o balão para a direita responde a mensagem (09/11/2026) e lista de conversas reorganizada
// (títulos Fixadas/Conversas, número na pílula "Não lidas"). Uso: node t-deslizar-responder.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const CONV = [U.ana, U.bruno].sort().join("_");
const texto = "Mensagem para responder " + Date.now();
await db.collection(`conversas/${CONV}/mensagens`).add({ texto, remetenteId: U.bruno, criadoEm: FieldValue.serverTimestamp() });
await db.doc(`conversas/${CONV}`).set({ ultimaMensagem: texto, ultimaMensagemRemetenteId: U.bruno, atualizadoEm: FieldValue.serverTimestamp(), fixadaPara: { [U.ana]: FieldValue.serverTimestamp() } }, { merge: true });

const A = await navegador({ mobile: true });
const p = await entrar(A.ctx, "ana", "mensagens.html");
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector('.modos [data-modo="negocios"]'); await p.waitForTimeout(1500); await p.locator('.modos [data-modo="negocios"]').tap();
await p.waitForSelector(".conv-item", { timeout: 25000 }).catch(async (e) => { await p.screenshot({ path: "saida/falha.png" }); console.log(p.url(), erros); throw e; }); await p.waitForTimeout(1200);
const secoes = await p.locator(".conv-secao").allTextContents();
ok(await p.locator('.pill[data-filtro="naoLidas"]').count() === 0, "sem as pílulas Todas/Não lidas");
ok(secoes[0] === "Fixadas", `título "Fixadas" na lista (${secoes.join(", ") || "nenhum"})`);
await p.screenshot({ path: "saida/lista-conversas.png" });
await p.evaluate(() => document.documentElement.dataset.theme = "dark"); await p.waitForTimeout(300); await p.screenshot({ path: "saida/lista-conversas-escuro.png" });

await p.goto(p.url().replace(/mensagens\.html.*/, `mensagens.html?conversa=${CONV}`));
await p.waitForSelector("body.chat-aberto", { timeout: 15000 }); await p.waitForTimeout(2000);
const bolha = p.locator(".linha-msg.outra .bolha", { hasText: texto }).last();
await bolha.scrollIntoViewIfNeeded();
const cx = await p.context().newCDPSession(p);
const toque = (type, x, y) => cx.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
const arrastar = async (dx, dy) => {
  await bolha.scrollIntoViewIfNeeded(); const r = await bolha.boundingBox();
  const x = r.x + 30, y = r.y + r.height / 2;
  await toque("touchStart", x, y);
  for (let i = 1; i <= 10; i++) { await toque("touchMove", x + dx * i / 10, y + dy * i / 10); await p.waitForTimeout(16); }
  return { x, y };
};
// deslize curto: não responde
let pos = await arrastar(30, 0);
ok(await p.locator(".desliza-resp").count() === 1, "o ícone de responder aparece atrás do balão");
await toque("touchEnd"); await p.waitForTimeout(300);
ok(await p.locator("#barraResposta").isHidden(), "deslize curto não responde");
// deslize para cima/baixo: não responde (é rolagem)
pos = await arrastar(10, 80); await toque("touchEnd"); await p.waitForTimeout(300);
ok(await p.locator("#barraResposta").isHidden(), "arrastar para baixo não responde");
// deslize completo
pos = await arrastar(110, 4);
ok(await p.locator(".desliza-resp.pronto").count() === 1, "passou do ponto: ícone fica ciano");
await p.screenshot({ path: "saida/deslizar-responder.png" });
await toque("touchEnd"); await p.waitForTimeout(400);
ok(await p.locator("#barraResposta").isVisible(), "ao soltar, abre a resposta");
ok((await p.locator("#respostaTexto").textContent()).includes("Mensagem para responder"), "resposta da mensagem certa");
const tr = await bolha.evaluate((b) => b.style.transform);
ok(!tr || tr === "none" || tr === "", "o balão volta ao lugar");
ok(await p.locator(".desliza-resp").count() === 0, "o ícone some");
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await db.doc(`conversas/${CONV}`).set({ fixadaPara: { [U.ana]: FieldValue.delete() } }, { merge: true });
await A.browser.close();
