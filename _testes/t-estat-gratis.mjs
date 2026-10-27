// Sem plano, as estatísticas do negócio não abrem (nem pelo link negocios.html?insights=ID, que chegava antes do plano
// ser lido): abre a gaveta dos planos. Nas estatísticas do perfil, "Seus negócios" aparece sem números e com PLUS.
// Uso: node seed.mjs && node t-estat-gratis.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, BASE } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
await db.doc(`planos/${U.bruno}`).delete().catch(() => {});
const B = await navegador({ mobile: true });
const p = await entrar(B.ctx, "bruno", `negocios.html?insights=${U.bruno}_servicos`);
await p.waitForTimeout(5000);
ok(await p.locator(".pl-card").count() > 0 && await p.locator(".ngi-kpis, .ins-neg-kpis, #folhaInsightsNeg.aberta").count() === 0, "sem plano: o link das estatísticas abre os planos");
// Com plano: abre as estatísticas.
await db.doc(`planos/${U.bruno}`).set({ plano: "plus", meses: 1, ate: Timestamp.fromMillis(Date.now() + 20 * 864e5) });
const B2 = await navegador({ mobile: true });
const p2 = await entrar(B2.ctx, "bruno", `negocios.html?insights=${U.bruno}_servicos`);
await p2.waitForTimeout(5000);
ok(await p2.locator(".pl-card").count() === 0 && (await p2.textContent("body")).includes("Estatísticas do negócio"), "com plano: o link abre as estatísticas");
await db.doc(`planos/${U.bruno}`).delete();
await B.browser.close(); await B2.browser.close();
