// Diário: publicações novas não ficam embaixo das antigas (03/11/2026). Ana e Edu (que o Bruno segue) têm publicações
// de 1 a 3 dias com muitas estrelas e comentários; depois publicam agora. O Bruno abre o Diário: as novas que ele ainda
// não viu vêm antes das antigas, e a que o próprio Bruno acabou de publicar fica no topo.
// Uso: node t-diario-recentes.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const agora = Date.now(), H = 3600e3;
for (const u of [U.ana, U.edu]) await db.doc(`relacoes/${U.bruno}_${u}`).set({ tipo: "seguir", seguidorId: U.bruno, alvoId: u, criadoEm: Timestamp.now() });
const velhas = [["pVelha1", U.ana, 26], ["pVelha2", U.edu, 40], ["pVelha3", U.ana, 60], ["pVelha4", U.edu, 30]];
for (const [id, autor, h] of velhas) {
  await db.doc(`diario/${id}`).set({ autorId: autor, nome: "Antiga", texto: `Publicação antiga muito curtida ${id}`, tipo: "texto", autorUf: "SC", autorIbge: 4205407, criadoEm: Timestamp.fromMillis(agora - h * H) });
  await db.doc(`diario_notas/${id}`).set({ total: 12, soma: 58, n5: 10, n4: 2 });
  for (let k = 0; k < 6; k++) await db.doc(`comentarios/c_${id}_${k}`).set({ postId: id, postAutorId: autor, autorId: U.dani, nome: "Dani", texto: "Show!", criadoEm: Timestamp.fromMillis(agora - h * H + k * 60000) });
}
const novas = [["pNova1", U.ana, 0.2], ["pNova2", U.edu, 0.5], ["pNova3", U.ana, 2]];
for (const [id, autor, h] of novas) {
  await db.doc(`diario/${id}`).set({ autorId: autor, nome: "Nova", texto: `Publicação nova de agora ${id}`, tipo: "texto", autorUf: "SC", autorIbge: 4205407, criadoEm: Timestamp.fromMillis(agora - h * H) });
  await db.doc(`diario_notas/${id}`).delete().catch(() => {});
}
const B = await navegador({ mobile: true });
const p = await entrar(B.ctx, "bruno", "feed.html");
await p.evaluate(() => { for (const k of Object.keys(localStorage)) if (/^hf-(vistas|cache|marcas)|diario-|^hf-gosto/.test(k)) localStorage.removeItem(k); });
await p.reload(); await p.waitForSelector(".post-card", { timeout: 30000 }); await p.waitForTimeout(1500);
const ordem = async () => (await p.locator("#listaFeed .post-card").evaluateAll((l) => l.map((c) => c.textContent))).slice(0, 12);
let l = await ordem();
const pos = (t) => l.findIndex((x) => x.includes(t));
const resumo = () => l.map((x) => (x.match(/pNova\d|pVelha\d|Bruno\)/) || ["outra"])[0]).join(" · ");
console.log("   ao abrir:", resumo());
const ultNova = Math.max(...novas.map(([id]) => pos(id)));
const priVelha = Math.min(...velhas.map(([id]) => pos(id)).filter((x) => x >= 0));
ok(novas.every(([id]) => pos(id) >= 0) && ultNova < priVelha, `as novas de quem você segue vêm antes das antigas (última nova ${ultNova + 1}º, 1ª antiga ${priVelha + 1}º)`);
ok(pos("pNova1") < pos("pNova2") && pos("pNova2") < pos("pNova3"), "entre as novas, a mais recente primeiro");
ok(priVelha >= 0 && priVelha < 10, `as antigas muito curtidas continuam aparecendo logo depois (${priVelha + 1}º)`);
// O Bruno publica agora: a dele vai para o topo
await p.locator("#btnComporFeed").tap(); await p.waitForTimeout(500);
await p.locator("#pubTexto").fill("Minha publicação de agora (Bruno)");
await p.locator("#pubEnviar").tap(); await p.waitForTimeout(3500);
l = await ordem();
console.log("   depois de publicar:", resumo());
ok(pos("(Bruno)") === 0, `a sua publicação de agora fica em 1º (posição ${pos("(Bruno)") + 1})`);
// Depois de vistas, as novas descem e as antigas não voltam por cima de novas que você ainda não viu
await B.browser.close();
for (const [id] of [...velhas, ...novas]) await db.doc(`diario/${id}`).delete();
for (const s of (await db.collection("diario").where("autorId", "==", U.bruno).get()).docs) if (/de agora \(Bruno\)/.test(s.data().texto)) await s.ref.delete();
