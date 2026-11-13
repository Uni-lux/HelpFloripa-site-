// Flash privado de verdade (13/11/2026): Amigos próximos só para quem está na lista e "Ocultar de" barrado nas REGRAS
// (não só no app). A Ana tem 3 flashes: para todos, Amigos próximos (só o Bruno) e para todos menos o Edu.
// Bruno vê os 3; Edu vê só o para todos; Dani (não está nos amigos) vê 2. Também confere a gravação (privacidadeDoFlash).
// Uso: node t-flash-privado.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
import { privacidadeDoFlash } from "../flash-privado.js";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const PX = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/yQALCAABAAEBAREA/8wABgAQEAX/2gAIAQEAAD8A0s8g/9k=";

// gravação
const a = privacidadeDoFlash({ autorId: "x", publico: "amigos", lista: ["b", "e"], ocultoPara: ["e"] });
ok(a.doc.restrito === true && a.doc.lista.join() === "b" && !("ocultoPara" in a.doc) && !a.indice, "Amigos próximos: lista sem quem foi ocultado, sem índice");
const o = privacidadeDoFlash({ autorId: "x", ocultoPara: ["e"], criadoEm: 1, negocios: ["x_servicos"] });
ok(o.doc.restrito === true && o.indice?.autorId === "x" && o.indice.negocios[0] === "x_servicos", "para todos com ocultados: restrito + índice");
const t = privacidadeDoFlash({ autorId: "x", lista: ["b"] });
ok(t.doc.restrito === false && !("lista" in t.doc) && !t.indice, "para todos: restrito falso, sem lista");

for (const u of [U.bruno, U.edu, U.dani]) await db.doc(`relacoes/${u}_${U.ana}`).set({ tipo: "seguir", seguidorId: u, alvoId: U.ana, criadoEm: Timestamp.now() });
const agora = Date.now(), ts = (m) => Timestamp.fromMillis(agora - m * 60000);
const base = { autorId: U.ana, nome: "Ana Souza", tipo: "imagem", midia: PX };
const velhos = await db.collection("stories").where("autorId", "==", U.ana).get(); for (const d of velhos.docs) await d.ref.delete();
await db.doc("stories/fpTodos").set({ ...base, restrito: false, criadoEm: ts(30) });
await db.doc("stories/fpAmigos").set({ ...base, restrito: true, publico: "amigos", lista: [U.bruno], criadoEm: ts(20) });
await db.doc("stories/fpOculto").set({ ...base, restrito: true, ocultoPara: [U.edu], criadoEm: ts(10) });
await db.doc("stories_restritos/fpOculto").set({ autorId: U.ana, criadoEm: ts(10) });

async function quantos(quem) {
  const A = await navegador({ mobile: true });
  const p = await entrar(A.ctx, quem, "feed.html");
  const erros = []; p.on("pageerror", (e) => erros.push(e.message));
  await p.evaluate(() => { try { localStorage.removeItem("hf-flash-barra-" + window.firebaseAuth.currentUser.uid); } catch {} });
  await p.reload();
  const anel = await p.waitForFunction(() => [...document.querySelectorAll("#storiesFeed .story-circ:not(.meu)")].find((c) => /Ana/.test(c.textContent)), null, { timeout: 25000 }).then(() => true).catch(() => false);
  let n = 0;
  if (anel) {
    await p.evaluate(() => [...document.querySelectorAll("#storiesFeed .story-circ:not(.meu)")].find((c) => /Ana/.test(c.textContent)).click());
    await p.waitForSelector(".story-visor .story-barra", { timeout: 10000 }).catch(() => {});
    await p.waitForTimeout(800);
    n = await p.locator(".story-visor .story-barra").count();
  }
  await A.browser.close();
  return { n, erros };
}
const b = await quantos("bruno"); ok(b.n === 3, `Bruno (amigo próximo) vê os 3 flashes (${b.n})`); ok(!b.erros.length, "Bruno sem erros " + b.erros.join(" | "));
const e = await quantos("edu"); ok(e.n === 1, `Edu (ocultado, fora dos amigos) vê só o para todos (${e.n})`);
const d = await quantos("dani"); ok(d.n === 2, `Dani (fora dos amigos) vê o para todos e o com ocultados (${d.n})`);
for (const id of ["fpTodos", "fpAmigos", "fpOculto"]) await db.doc(`stories/${id}`).delete();
await db.doc("stories_restritos/fpOculto").delete();
