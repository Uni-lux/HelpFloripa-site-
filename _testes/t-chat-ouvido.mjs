// Mensagens (17/11/2026): ✓✓ entregue, áudio ouvido (microfone azul), play alinhado com a onda, foto em pé com a hora
// no canto e voltar do celular fechando só a foto. Uso: node seed.mjs | tail -1 > saida/seed-ids.json && node t-chat-ouvido.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const CONV = [U.ana, U.bruno].sort().join("_");
const n = 8000 * 4, buf = Buffer.alloc(44 + n);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + n, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
buf.writeUInt32LE(8000, 24); buf.writeUInt32LE(8000, 28); buf.writeUInt16LE(1, 32); buf.writeUInt16LE(8, 34); buf.write("data", 36); buf.writeUInt32LE(n, 40);
for (let i = 0; i < n; i++) buf[44 + i] = 128 + Math.round(60 * Math.sin(i / 7) * Math.sin(i / 900));
const audio = "data:audio/wav;base64," + buf.toString("base64");
const foto = "data:image/jpeg;base64," + readFileSync("saida/print-alto.jpg").toString("base64");
const col = db.collection(`conversas/${CONV}/mensagens`);
await db.doc(`perfis_publicos/${U.bruno}`).set({ ultimoAcesso: Timestamp.fromMillis(Date.now() - 3 * 3600e3) }, { merge: true });
await db.doc(`conversas/${CONV}`).set({ entregueEm: FieldValue.delete(), ouvidos: FieldValue.delete(), lidoEm: FieldValue.delete() }, { merge: true });
const aB = await col.add({ remetenteId: U.bruno, texto: "", tipoArquivo: "audio", arquivoUrl: audio, nomeArquivo: "audio", criadoEm: FieldValue.serverTimestamp() });
const aA = await col.add({ remetenteId: U.ana, texto: "", tipoArquivo: "audio", arquivoUrl: audio, nomeArquivo: "audio", criadoEm: FieldValue.serverTimestamp() });
const fB = await col.add({ remetenteId: U.bruno, texto: "", tipoArquivo: "imagem", arquivoUrl: foto, nomeArquivo: "print.jpg", criadoEm: FieldValue.serverTimestamp() });
const tA = await col.add({ remetenteId: U.ana, texto: "Recebeu?", criadoEm: FieldValue.serverTimestamp() });
await db.doc(`conversas/${CONV}`).set({ ultimaMensagem: "Recebeu?", ultimaMensagemRemetenteId: U.ana, atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });

const A = await navegador({ mobile: true });
await A.ctx.addInitScript(() => { try { localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" })); } catch {} });
const p = await entrar(A.ctx, "ana", `mensagens.html?conversa=${CONV}`);
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector("body.chat-aberto"); await p.waitForTimeout(3000);
const chk = () => p.locator(`.linha-msg[data-id="${tA.id}"] .meta .check`).getAttribute("aria-label");
ok(await chk() === "Enviada", "texto ainda não entregue: um tracinho (" + await chk() + ")");
await db.doc(`conversas/${CONV}`).set({ entregueEm: { [U.bruno]: FieldValue.serverTimestamp() } }, { merge: true });
await p.waitForTimeout(1500);
ok(await chk() === "Entregue", "chegou no aparelho dela: ✓✓ cinza (" + await chk() + ")");
const novo = p.locator(`.linha-msg[data-id="${aB.id}"] .bolha`);
ok(await novo.evaluate((b) => b.classList.contains("audio-novo")), "áudio recebido e não ouvido: microfone azul");
// alinhamento: play na altura da onda e a bolinha sem encostar no play
const al = await p.locator(`.linha-msg[data-id="${aA.id}"] .hf-audio.wa`).evaluate((b) => {
  const pl = b.querySelector(".hf-audio-play").getBoundingClientRect(), on = b.querySelector(".hf-audio-onda").getBoundingClientRect(), pt = b.querySelector(".hf-audio-ponto").getBoundingClientRect();
  return { dy: Math.abs((pl.top + pl.height / 2) - (on.top + on.height / 2)), folga: pt.left - pl.right };
});
ok(al.dy < 3 && al.folga >= 0, `play alinhado com a onda (diferença ${al.dy.toFixed(1)} px, folga da bolinha ${al.folga.toFixed(1)} px)`);
await novo.scrollIntoViewIfNeeded();
await novo.locator(".hf-audio-play").click(); await p.waitForTimeout(2500);
const conv = (await db.doc(`conversas/${CONV}`).get()).data();
ok((conv.ouvidos?.[U.ana] || []).includes(aB.id), "tocar o áudio grava ouvidos.ana");
ok(!(await novo.evaluate((b) => b.classList.contains("audio-novo"))), "depois de ouvir, o microfone fica cinza");
await db.doc(`conversas/${CONV}`).set({ ouvidos: { [U.bruno]: [aA.id] } }, { merge: true });
await p.waitForTimeout(1500);
ok(await p.locator(`.linha-msg[data-id="${aA.id}"] .bolha`).evaluate((b) => b.classList.contains("audio-ouvido")), "Bruno ouviu o áudio da Ana: microfone azul no dela");
// foto em pé
const ft = p.locator(`.linha-msg[data-id="${fB.id}"] .bolha`);
await ft.scrollIntoViewIfNeeded(); await p.waitForTimeout(800);
const r = await ft.evaluate((b) => { const im = b.querySelector("img.foto").getBoundingClientRect(), me = b.querySelector(".meta").getBoundingClientRect(); return { dentro: me.bottom <= im.bottom + 1 && me.bottom > im.bottom - 24 && me.right <= im.right + 1, altMeta: me.height, larg: im.width, alt: im.height }; });
ok(r.dentro && r.altMeta < 26, `hora no canto de baixo da foto, sem faixa (${JSON.stringify(r)})`);
await p.screenshot({ path: "saida/chat-ouvido.png" });
await ft.locator("img.foto").click(); await p.waitForTimeout(600);
ok(await p.locator("#visualizador").isVisible(), "tocar na foto abre a foto");
await p.goBack(); await p.waitForTimeout(900);
ok(!(await p.locator("#visualizador").isVisible()) && await p.evaluate(() => document.body.classList.contains("chat-aberto")), "voltar fecha só a foto (a conversa continua)");
ok(!erros.length, "sem erros: " + erros.join(" | "));
await A.browser.close();
