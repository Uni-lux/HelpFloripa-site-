// Mensagens (09/11/2026, prints do dono): selo de verificado no lugar do @, Negócios com selinho do tipo na foto e
// linha "Freelances · perfil", topo da conversa "nome + selo / tipo · visto há N min" e mensagens guardadas no
// aparelho (aparecem na hora com o servidor lento; ao reabrir só o que é novo vem do servidor).
// Uso: node seed.mjs && node t-mensagens-cache.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const esperar = async (fn, ms = 10000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn().catch(() => false)) return true; await new Promise((r) => setTimeout(r, 100)); } return false; };
const CONV = [U.ana, U.bruno].sort().join("_");
await db.doc(`perfis_publicos/${U.bruno}`).set({ verificado: true, ultimoAcesso: Timestamp.fromMillis(Date.now() - 25 * 60000) }, { merge: true });
for (let i = 0; i < 6; i++) await db.collection(`conversas/${CONV}/mensagens`).add({ remetenteId: U.bruno, texto: `antiga ${i}`, criadoEm: Timestamp.fromMillis(Date.now() - (60 - i) * 60000) });
await db.doc(`conversas/${CONV}`).set({ atualizadoEm: FieldValue.serverTimestamp(), ultimaMensagem: "antiga 5", ultimaMensagemRemetenteId: U.bruno }, { merge: true });

const A = await navegador({ mobile: true });
const p = await entrar(A.ctx, "ana", "mensagens.html");
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector('.modos [data-modo="negocios"]'); await p.waitForTimeout(1200);
await p.locator('.modos [data-modo="negocios"]').tap();
await p.waitForSelector(".conv-item", { timeout: 20000 }); await p.waitForTimeout(600);
const item = p.locator(".conv-item").first();
ok(await item.locator(".conv-nick").count() === 0 && !/@/.test(await item.locator(".conv-nome").textContent()), "sem o @ na lista");
ok(await item.locator(".conv-nome .selo-v").count() === 1, "selo de verificado ao lado do nome");
ok(await item.locator(".conv-tipo-ic").count() === 1 && await item.locator(".conv-nome .conv-tipo-nm").count() === 1, "negócio: selinho do tipo na foto + tipo ao lado do nome");
const anel = await item.locator(".avatar").evaluate((e) => getComputedStyle(e).boxShadow);
ok(anel === "none", "sem o anel colorido na foto (" + anel + ")");
await p.screenshot({ path: "saida/negocios-lista.png" });

// topo da conversa
await item.tap();
await p.waitForSelector("body.chat-aberto"); await p.waitForTimeout(1500);
ok(!(await p.locator("#topSelo").isHidden()), "selo de verificado no topo");
const sub = (await p.locator("#topSub").textContent()).replace(/\s+/g, " ").trim();
ok(/Freelances/.test(sub) && /há 2\d min/.test(sub), `linha de baixo: tipo · visto (${sub})`);
ok(await p.locator("#topStatus .st-ic").count() === 1, "olho na frente do visto");
const linhas = await p.evaluate(() => { const n = document.querySelector(".quem-nome").getBoundingClientRect(), s = document.querySelector("#topSub").getBoundingClientRect(); return [Math.round(n.bottom), Math.round(s.top), Math.round(s.height)]; });
ok(linhas[0] <= linhas[1] + 1 && linhas[2] <= 20, "topo em 2 linhas organizadas: " + linhas.join(","));
await p.screenshot({ path: "saida/topo-negocio.png" });
ok(await esperar(async () => (await p.locator(".linha-msg").count()) >= 6), "mensagens carregadas");
await p.waitForTimeout(1200); // grava no aparelho
const guardadas = await p.evaluate(() => new Promise((ok) => { const r = indexedDB.open("hf-msgs"); r.onsuccess = () => { const t = r.result.transaction("conversas").objectStore("conversas").getAll(); t.onsuccess = () => ok(t.result.map((x) => [x.conv, JSON.parse(x.texto).length])); }; r.onerror = () => ok([]); }));
ok(guardadas.some(([c, n]) => c.includes("_") && n >= 6), "conversa guardada no aparelho: " + JSON.stringify(guardadas));

// reabrir com o servidor lento: aparece do aparelho; só as novas vêm do servidor
await db.collection(`conversas/${CONV}/mensagens`).add({ remetenteId: U.bruno, texto: "nova enquanto fechada", criadoEm: FieldValue.serverTimestamp() });
await p.close();
const p2 = await A.ctx.newPage(); 
await p2.goto("http://127.0.0.1:5057/mensagens.html");
await p2.waitForSelector('.modos [data-modo="negocios"]'); await p2.waitForTimeout(1500);
await p2.locator('.modos [data-modo="negocios"]').tap();
await p2.waitForSelector(".conv-item", { timeout: 20000 }); await p2.waitForTimeout(800);
// abrir a conversa com o servidor lento (como na rede 4G ruim)
await A.ctx.route(/127\.0\.0\.1:8085\/.*Listen\/channel/, async (r) => { await new Promise((ok) => setTimeout(ok, 3500)); r.continue().catch(() => {}); });
await p2.waitForTimeout(300);
await p2.locator(".conv-item").first().tap();
const t0 = Date.now();
const rapido = await esperar(async () => (await p2.locator(".linha-msg", { hasText: /^antiga 5/ }).count()) === 1, 15000);
const tempo = Date.now() - t0;
const novaJa = await p2.locator(".linha-msg", { hasText: "nova enquanto fechada" }).count();
ok(rapido && novaJa === 0, `mensagens guardadas aparecem antes do servidor (${tempo} ms; servidor atrasado 3,5 s)`);
ok(await esperar(async () => (await p2.locator(".linha-msg", { hasText: "nova enquanto fechada" }).count()) === 1, 20000), "a nova chega do servidor depois");
await A.ctx.unroute(/127\.0\.0\.1:8085\/.*Listen\/channel/);
ok(await p2.locator(".linha-msg", { hasText: /^antiga 0/ }).count() === 1, "as antigas continuam (vindas do aparelho)");
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close();
process.exit();
