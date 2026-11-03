// Vistas do Diário em lote (03/11/2026): as publicações vistas vão juntas numa gravação só (writeBatch) a cada 6 s,
// com 20 na fila ou quando a página some; vista que já existia (outro aparelho) não derruba as outras.
// "Já vi" da conta: usuarios/{uid}.vistos leva as vistas para o outro aparelho (que não grava de novo).
// Uso: node t-vistas-lote.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const agora = Date.now();
const ids = [];
for (let i = 0; i < 8; i++) {
  const id = `pLote${i}`; ids.push(id);
  await db.doc(`diario/${id}`).set({ autorId: U.ana, nome: "Ana", texto: `Publicação do lote número ${i}`, tipo: "texto", criadoEm: Timestamp.fromMillis(agora - i * 60000) });
  for (const d of (await db.collection(`diario/${id}/vistas`).get()).docs) await d.ref.delete();
}
// pLote3 já foi vista pelo Bruno em outro aparelho
await db.doc(`diario/pLote3/vistas/${U.bruno}`).set({ origem: "principais", criadoEm: Timestamp.fromMillis(agora - 864e5) });
await db.doc(`usuarios/${U.bruno}`).update({ vistos: FieldValue.delete() });
const vistas = async () => (await Promise.all(ids.map((id) => db.doc(`diario/${id}/vistas/${U.bruno}`).get()))).filter((s) => s.exists).length;

const B = await navegador({ mobile: true });
const p = await entrar(B.ctx, "bruno", "feed.html");
await p.evaluate(() => { try { for (const k of Object.keys(localStorage)) if (k.startsWith("hf-vistas")) localStorage.removeItem(k); } catch {} });
await p.reload();
await p.waitForSelector(".post-card", { timeout: 30000 }); await p.waitForTimeout(1500);
// rola devagar pelas publicações (cada uma fica 1 s+ na tela); a última fica para o teste de sair da página
const rolar = async (id) => { const c = p.locator(".post-card", { hasText: `lote número ${id.slice(5)}` }).first(); await c.scrollIntoViewIfNeeded(); await p.waitForTimeout(1250); };
for (const id of ids.slice(0, 3)) await rolar(id);
const naFila = await vistas();
ok(naFila <= 1, `enquanto rola, nada é gravado uma a uma (gravadas: ${naFila}, a de outro aparelho conta)`);
for (const id of ids.slice(3, 7)) await rolar(id);
await p.waitForTimeout(7000);
const depois = await vistas();
ok(depois >= 7, `as vistas saem juntas a cada 6 s (${depois} gravadas)`);
const v0 = (await db.doc(`diario/pLote0/vistas/${U.bruno}`).get()).data();
ok(v0?.origem === "principais", `origem guardada (${v0?.origem})`);
const v3 = (await db.doc(`diario/pLote3/vistas/${U.bruno}`).get()).data();
ok(v3.criadoEm.toMillis() < agora - 3600e3, "a vista de outro aparelho continua a mesma e as outras do lote entraram");

// Some da tela antes dos 6 s: manda na hora
await rolar("pLote7");
// o celular esconde a página antes de fechar (troca de app): visibilitychange "hidden"
await p.evaluate(() => { Object.defineProperty(document, "visibilityState", { get: () => "hidden", configurable: true }); document.dispatchEvent(new Event("visibilitychange")); });
await p.waitForTimeout(2000);
await p.goto("about:blank"); await new Promise((r) => setTimeout(r, 1500));
ok((await db.doc(`diario/pLote7/vistas/${U.bruno}`).get()).exists, "escondeu a página antes dos 6 s: a fila foi enviada na hora");
const conta = (await db.doc(`usuarios/${U.bruno}`).get()).data().vistos || [];
ok(ids.slice(0, 7).every((id) => conta.includes(id)), `as vistas foram para a conta (usuarios.vistos: ${conta.length})`);
await B.browser.close();

// Outro aparelho (sem nada guardado): sabe o que já foi visto e não tenta gravar de novo
const C = await navegador({ mobile: true });
let repetidas = 0;
C.ctx.on("request", (r) => { const d = decodeURIComponent(r.postData() || ""); if (r.method() === "POST" && /Write\/channel/.test(r.url()) && /pLote\d\/vistas/.test(d)) repetidas++; });
const q = await entrar(C.ctx, "bruno", "feed.html");
await q.waitForSelector(".post-card", { timeout: 30000 }); await q.waitForTimeout(2500);
const noOutro = await q.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.startsWith("hf-vistas-")) || "[]")));
ok(ids.slice(0, 7).every((id) => noOutro.includes(id)), `o outro aparelho recebeu o "já vi" da conta (${noOutro.length})`);
for (const id of ids.slice(0, 4)) { const c = q.locator(".post-card", { hasText: `lote número ${id.slice(5)}` }).first(); if (await c.count()) { await c.scrollIntoViewIfNeeded(); await q.waitForTimeout(1200); } }
await q.waitForTimeout(7000);
ok(repetidas === 0, `não grava de novo o que já foi visto no outro aparelho (${repetidas} envios)`);
await C.browser.close();
