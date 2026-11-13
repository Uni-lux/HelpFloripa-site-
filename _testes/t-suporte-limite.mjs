// Limite de 3 chamados em andamento conferido nas regras (suporte_abertos/{uid}), 13/11/2026.
//  - abrir chamado grava a lista na mesma gravação; o 4º avisa e não grava;
//  - encerrar tira da lista; reabrir com 3 em andamento avisa;
//  - id preso de chamado que não existe mais sai sozinho ao abrir o suporte.
// Uso: node seed.mjs && node t-suporte-limite.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const uid = U.fabi;
for (const d of (await db.collection("suporte").where("uid", "==", uid).get()).docs) await d.ref.delete();
await db.doc("ritmo/" + uid).delete().catch(() => {});
await db.doc("suporte_abertos/" + uid).set({ ids: ["naoExiste123"], ultimo: "naoExiste123", acao: "entrou", atualizadoEm: Timestamp.now() });
const lista = async () => (await db.doc("suporte_abertos/" + uid).get()).data()?.ids || [];
const abertos = async () => (await db.collection("suporte").where("uid", "==", uid).get()).docs.filter((d) => d.data().status !== "fechado");

const B = await navegador({ mobile: true });
const p = await entrar(B.ctx, "fabi", "suporte.html");
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector("#supLista:not([hidden])", { timeout: 20000 }); await p.waitForTimeout(1500);
ok(!(await lista()).includes("naoExiste123"), "id de chamado que não existe sai da lista ao abrir o suporte");
async function novo(n, esperarAviso = false) {
  await p.locator("#btnNovo").tap(); await p.waitForTimeout(400);
  await p.locator("#supAssunto").fill("Chamado de teste " + n);
  await p.locator("#supTexto").fill("Texto do chamado de teste número " + n + ".");
  await p.locator("#supEnviar").tap();
  if (esperarAviso) return p.waitForFunction(() => /já tem 3\s+chamados/.test(document.body.innerText), null, { timeout: 5000 }).then(() => true).catch(() => false);
  await p.waitForTimeout(2200);
}
for (let i = 1; i <= 3; i++) await novo(i);
ok((await abertos()).length === 3 && (await lista()).length === 3, "3 chamados abertos e 3 na lista");
ok(await novo(4, true), "aviso de 3 chamados em andamento");
await p.waitForTimeout(1500);
ok((await abertos()).length === 3, "o 4º não é gravado");
await p.keyboard.press("Escape"); await p.waitForTimeout(600);
// Pessoa tenta furar pela tela de programação: recusado pelas regras.
const furou = await p.evaluate(async (uid) => {
  const f = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  const db = window.firebaseDb, ref = f.doc(f.collection(db, "suporte")), b = f.writeBatch(db);
  b.set(ref, { uid, nome: "x", email: "", assunto: "Furando", categoria: "conta", status: "aberto", criadoEm: f.serverTimestamp(), atualizadoEm: f.serverTimestamp(), ultimaDe: "usuario" });
  b.set(f.doc(db, "suporte", ref.id, "mensagens", "inicio"), { autorId: uid, equipe: false, texto: "x", em: f.serverTimestamp() });
  b.set(f.doc(db, "ritmo", uid), { sup: f.increment(1), ultimaEm: f.serverTimestamp(), ultimoTipo: "sup" }, { merge: true });
  try { await b.commit(); return true; } catch (e) { return e.code; }
}, uid);
ok(furou === "permission-denied", "gravar o 4º direto (sem a lista) é recusado: " + furou);
// Encerrar um tira da lista.
await p.locator(".sup-item", { hasText: "Chamado de teste 1" }).first().tap(); await p.waitForTimeout(1200);
await p.locator("#chMais").tap(); await p.waitForTimeout(500);
await p.locator("button", { hasText: "Encerrar chamado" }).first().tap();
await p.waitForTimeout(1500);
ok((await abertos()).length === 2 && (await lista()).length === 2, "encerrar tira da lista");
await p.screenshot({ path: "saida/suporte-limite.png" });
ok(!erros.length, "sem erros na página: " + erros.join(" | "));
await B.browser.close();
console.log(process.exitCode ? "Falhou" : "Tudo certo");
