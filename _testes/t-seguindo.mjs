// Diário (03/11/2026): filtro "Seguindo" (só quem você segue, em ordem de data, "Ver mais" sem pular nenhuma) e o aviso
// "Você está em dia" nos Principais (novidades de quem você segue primeiro, depois o aviso e as sugestões).
// Uso: node t-seguindo.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const agora = Date.now(), H = 3600e3;
// o Bruno só segue a Ana e o Edu
for (const s of (await db.collection("relacoes").where("seguidorId", "==", U.bruno).get()).docs) await s.ref.delete();
for (const u of [U.ana, U.edu]) await db.doc(`relacoes/${U.bruno}_${u}`).set({ tipo: "seguir", seguidorId: U.bruno, alvoId: u, criadoEm: Timestamp.now() });
// só as publicações do teste (as do seed atrapalhariam a conta)
for (const s of (await db.collection("diario").get()).docs) await s.ref.delete();
const ids = [];
const pub = async (id, autor, h, extra = {}) => { ids.push(id); await db.doc(`diario/${id}`).set({ autorId: autor, nome: id, texto: `Texto ${id}`, tipo: "texto", autorUf: "SC", autorIbge: 4205407, criadoEm: Timestamp.fromMillis(agora - h * H), ...extra }); };
// Ana: 25 publicações (uma a cada 5 h); Edu: 3; Dani (não seguida): 4 recentes
for (let i = 0; i < 25; i++) await pub(`sA${String(i).padStart(2, "0")}`, U.ana, 0.5 + i * 5);
for (let i = 0; i < 3; i++) await pub(`sE${i}`, U.edu, 2 + i * 30);
for (let i = 0; i < 4; i++) await pub(`sD${i}`, U.dani, 1 + i);

const B = await navegador({ mobile: true });
const p = await entrar(B.ctx, "bruno", "feed.html");
await p.evaluate(() => { for (const k of Object.keys(localStorage)) if (/^hf-(vistas|marcas|filtro)|diario-|^q:/.test(k)) localStorage.removeItem(k); });
await p.reload(); await p.waitForSelector(".post-card", { timeout: 30000 }); await p.waitForTimeout(1500);
const cards = () => p.$$eval("#listaFeed > :not(.feed-sug)", (l) => l.map((c) => c.dataset.emDia ? "EMDIA" : (c.textContent.match(/s[ADE]\d+/) || ["?"])[0]));
const maisAte = async (n) => { for (let i = 0; i < 6; i++) { const l = await cards(); if (l.length >= n || !(await p.isVisible("#maisFeed"))) return l; await p.click("#maisFeed"); await p.waitForTimeout(1200); } return cards(); };

// ---------- Principais: "Você está em dia" ----------
let l = await maisAte(14);
console.log("   Principais:", l.slice(0, 14).join(" · "));
const iDia = l.indexOf("EMDIA");
ok(iDia > 0, `aviso "Você está em dia" aparece (posição ${iDia + 1})`);
const antes = l.slice(0, iDia), depois = l.slice(iDia + 1);
ok(antes.filter((x) => /^s[AE]/.test(x)).length >= 3 && antes.filter((x) => /^sD/.test(x)).length <= 1, `antes do aviso: novidades de quem o Bruno segue (descoberta no máximo 1: ${antes.join(",")})`);
ok(depois.length > 0 && depois.some((x) => /^sD/.test(x)), "depois do aviso: as sugestões (Dani, que ele não segue)");
ok(await p.locator(".feed-em-dia .fed-sug", { hasText: "Sugestões para você" }).count() === 1, "título “Sugestões para você” embaixo do aviso");
await p.locator(".feed-em-dia").scrollIntoViewIfNeeded(); await p.screenshot({ path: "saida/em-dia.png" });

// ---------- Seguindo ----------
await p.locator(".feed-em-dia .fed-link").tap(); await p.waitForTimeout(2500);
ok((await p.locator("#filtroAtual").textContent()).trim() === "Seguindo", "“Ver as anteriores” troca para o filtro Seguindo");
l = (await cards()).filter((x) => x !== "?");
ok(!l.includes("EMDIA") && !l.some((x) => /^sD/.test(x)), "Seguindo: só quem você segue, sem o aviso");
const esperado = ids.filter((x) => /^s[AE]/.test(x)).sort((a, b) => {
  const h = (x) => x.startsWith("sA") ? 0.5 + Number(x.slice(2)) * 5 : 2 + Number(x.slice(2)) * 30; return h(a) - h(b);
});
ok(l.length >= 10 && l.every((x, i) => x === esperado[i]), `em ordem de data, sem limite por pessoa (${l.slice(0, 6).join(",")}…)`);
l = (await maisAte(28)).filter((x) => x !== "?");
ok(l.length === 28 && l.join() === esperado.join(), `“Ver mais” traz as antigas sem pular nem repetir (${l.length} de 28)`);
await p.screenshot({ path: "saida/seguindo.png" });
// o filtro fica guardado
await p.reload(); await p.waitForSelector(".post-card", { timeout: 30000 }); await p.waitForTimeout(1000);
ok((await p.locator("#filtroAtual").textContent()).trim() === "Seguindo", "o Seguindo fica escolhido ao voltar");
await p.evaluate(() => localStorage.removeItem("hf-filtro-diario"));
await B.browser.close();
for (const id of ids) await db.doc(`diario/${id}`).delete();
