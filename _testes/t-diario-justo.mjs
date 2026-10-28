// Diário justo (Parte 3, relevancia.js): em Principais, 1 a cada 5 publicações é de descoberta (alguém que você não
// segue e com pouco alcance), no máximo 2 do mesmo autor nas 10 primeiras, e a mistura não é sorteada a cada abertura.
// Uso: node seed.mjs && node t-diario-justo.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const T = (h) => Timestamp.fromMillis(Date.now() - h * 36e5);
const pessoa = async (uid, nome) => {
  const p = { uid, nome, nickname: uid.replace(/_/g, ""), cidade: "Florianópolis", uf: "SC", cidadeIbge: 4205407, fotoPerfil: "", criadoEm: T(500) };
  await db.doc(`perfis_publicos/${uid}`).set(p); await db.doc(`usuarios/${uid}`).set({ ...p, aceiteTermos: true });
};
const ids = [];
// 4 pessoas que a Ana segue, com 6 publicações bem avaliadas cada; 10 que ela não segue, 1 publicação sem notas.
for (let a = 0; a < 4; a++) {
  const uid = `dj_f${a}`; await pessoa(uid, `Seguida ${a}`);
  await db.doc(`relacoes/${U.ana}_${uid}`).set({ tipo: "seguir", seguidorId: U.ana, alvoId: uid, criadoEm: T(100) });
  for (let k = 0; k < 6; k++) {
    const id = `dj_pf${a}_${k}`; ids.push(id);
    await db.doc(`diario/${id}`).set({ autorId: uid, nome: `Seguida ${a}`, fotoPerfil: "", texto: `Popular ${a}.${k}`, tags: [], autorUf: "SC", autorIbge: 4205407, criadoEm: T(1 + k + a * 0.1) });
    await db.doc(`diario_notas/${id}`).set({ total: 12, soma: 58, n1: 0, n2: 0, n3: 0, n4: 2, n5: 10 });
  }
}
for (let a = 0; a < 10; a++) {
  const uid = `dj_n${a}`; await pessoa(uid, `Nova ${a}`);
  const id = `dj_pn${a}`; ids.push(id);
  await db.doc(`diario/${id}`).set({ autorId: uid, nome: `Nova ${a}`, fotoPerfil: "", texto: `Primeira publicação ${a}`, tags: [], autorUf: "SC", autorIbge: 4205407, criadoEm: T(2 + a * 0.3) });
}

const { browser, ctx } = await navegador({ mobile: true });
const p = await entrar(ctx, "ana", "feed.html");
const ordem = async () => {
  await p.waitForSelector(".post-card", { timeout: 25000 }); await p.waitForTimeout(2000);
  for (let i = 0; i < 3 && (await p.locator(".post-card").count()) < 16; i++) { if (await p.isVisible("#maisFeed")) await p.click("#maisFeed"); await p.waitForTimeout(1200); }
  return p.$$eval(".post-card", (cs) => cs.map((c) => c.dataset.autor));
};
const a = await ordem();
const nossos = a.filter((x) => x.startsWith("dj_"));
ok(nossos.length >= 20, `${a.length} publicações no Diário (${nossos.length} do teste)`);
const desc = [2, 7, 12].map((i) => a[i]);
ok(desc.every((x) => x?.startsWith("dj_n")), "descoberta nas posições 3, 8 e 13 (quem a Ana não segue): " + desc.join(", "));
const conta = {}; a.slice(0, 10).forEach((x) => (conta[x] = (conta[x] || 0) + 1));
ok(Math.max(...Object.values(conta)) <= 2, "no máximo 2 do mesmo autor nas 10 primeiras: " + JSON.stringify(conta));
ok(a.every((x, i) => i === 0 || x !== a[i - 1]), "nunca duas seguidas do mesmo autor");
// A mesma pessoa em outro aparelho (sem nada visto ainda) vê a mesma mistura: sem sorteio a cada abertura.
const outro = await (await navegador({ mobile: true })).ctx;
const p2 = await entrar(outro, "ana", "feed.html");
await p2.waitForSelector(".post-card", { timeout: 25000 }); await p2.waitForTimeout(2000);
const b = await p2.$$eval(".post-card", (cs) => cs.slice(0, 3).map((c) => c.dataset.autor));
ok(a.slice(0, 3).join() === b.join(), "a mesma mistura em outra abertura (sem sorteio a cada vez): " + b.join(", "));
await browser.close();
for (const id of ids) { await db.doc(`diario/${id}`).delete(); await db.doc(`diario_notas/${id}`).delete().catch(() => {}); }
process.exit();
