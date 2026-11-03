// Anti-spam do Diário e do Flash (03/11/2026): quem posta muito não toma o Diário (no máximo 3 de cada pessoa entram na
// escolha, cada publicação a mais da mesma pessoa vale menos, e quem encheu a leitura de quem você segue é deixado de
// fora numa 2ª leitura), e o Flash entra no limite diário (50 por dia, conferido pelas regras).
// Uso: node t-antispam.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const agora = Date.now();
// Bruno segue a Dani (que posta muito) e mais 4 pessoas que postam pouco
const calmos = [U.ana, U.edu, U.fabi, U.gui];
for (const u of [U.dani, ...calmos]) await db.doc(`relacoes/${U.bruno}_${u}`).set({ tipo: "seguir", seguidorId: U.bruno, alvoId: u, criadoEm: Timestamp.now() });
for (const s of (await db.collection("diario").where("texto", ">=", "Spam ").where("texto", "<", "Spam~").get()).docs) await s.ref.delete();
for (let i = 0; i < 30; i++) await db.doc(`diario/pSpam${i}`).set({ autorId: U.dani, nome: "Dani", texto: `Spam da Dani ${i}`, tipo: "texto", criadoEm: Timestamp.fromMillis(agora - i * 20000) });
for (const [k, u] of calmos.entries()) await db.doc(`diario/pCalmo${k}`).set({ autorId: u, nome: "Calmo " + k, texto: `Spam? Não: publicação calma ${k}`, tipo: "texto", criadoEm: Timestamp.fromMillis(agora - 3 * 3600e3 - k * 600e3) });

const B = await navegador({ mobile: true });
const p = await entrar(B.ctx, "bruno", "feed.html");
await p.evaluate(() => { for (const k of Object.keys(localStorage)) if (/^hf-(cache|diario)|diario-/.test(k)) localStorage.removeItem(k); });
await p.reload();
await p.waitForSelector(".post-card", { timeout: 30000 }); await p.waitForTimeout(3000);
const textos = await p.locator("#listaFeed .post-card").evaluateAll((l) => l.map((c) => c.textContent));
const dez = textos.slice(0, 10);
const daDani = dez.filter((t) => t.includes("Spam da Dani")).length;
ok(daDani <= 3, `nas 10 primeiras, no máximo 3 da Dani (${daDani})`);
const calmas = textos.filter((t) => t.includes("publicação calma")).length;
ok(calmas === 4, `as 4 pessoas que postam pouco aparecem, mesmo com a Dani postando 30 (${calmas})`);
ok(textos.filter((t) => t.includes("Spam da Dani")).length <= 3, `no total, só 3 da Dani entram na escolha (${textos.filter((t) => t.includes("Spam da Dani")).length})`);
await B.browser.close();

// Flash: o 51º do dia é recusado com o aviso do limite
for (const s of (await db.collection("stories").where("autorId", "==", U.ana).get()).docs) await s.ref.delete();
await db.doc(`ritmo/${U.ana}`).set({ inicio: Timestamp.now(), msg: 0, pub: 0, com: 0, parc: 0, flash: 49 });
const A = await navegador({ mobile: true });
const q = await entrar(A.ctx, "ana", "feed.html");
await q.waitForTimeout(3500);
const publicarTexto = async (txt) => {
  await q.locator(".story-circ").first().locator(".mais").tap(); await q.waitForSelector(".flash-criar", { timeout: 8000 }); await q.waitForTimeout(600);
  await q.locator(".flash-modos button", { hasText: "Texto" }).tap(); await q.waitForTimeout(300);
  await q.keyboard.type(txt); await q.locator(".flash-texto").blur();
  await q.locator(".flash-publicar").tap(); await q.waitForTimeout(3000);
};
await publicarTexto("Flash 50");
const r1 = (await db.doc(`ritmo/${U.ana}`).get()).data();
const n1 = (await db.collection("stories").where("autorId", "==", U.ana).get()).size;
ok(n1 === 1 && r1.flash === 50 && r1.ultimoTipo === "flash", `o 50º flash entra e soma no limite (flashes: ${n1}, contador: ${r1.flash})`);
await q.waitForTimeout(1500);
if (await q.locator(".flash-criar").count()) await q.keyboard.press("Escape");
await q.waitForTimeout(800);
await publicarTexto("Flash 51");
const aviso = await q.locator(".toast").allTextContents();
const n2 = (await db.collection("stories").where("autorId", "==", U.ana).get()).size;
ok(n2 === 1, `o 51º não entra (flashes: ${n2})`);
ok(aviso.some((t) => /limite de 50.flashes/.test(t)), `aviso do limite (${aviso.join(" | ").slice(0, 120)})`);
await A.browser.close();
for (const s of (await db.collection("diario").where("autorId", "==", U.dani).get()).docs) if (s.id.startsWith("pSpam")) await s.ref.delete();
await db.doc(`ritmo/${U.ana}`).delete();
