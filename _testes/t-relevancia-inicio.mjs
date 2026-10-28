// Ordem justa no Início e no Explorar (Parte 2, relevancia.js): no "Mais bem avaliados", "Chegaram agora" e na busca de
// negócios do Explorar, 1 espaço pago a cada 5 e o 1º de um Premium; perfis sem plano também aparecem no começo;
// a ordem não muda ao recarregar. Uso: node seed.mjs && node t-relevancia-inicio.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const dia = 864e5, agora = Date.now();
const PLANOS = ["plus", "pro", "premium", "plus", "pro"];
for (let i = 0; i < 25; i++) {
  const uid = `ri_u${i}`, id = `${uid}_servicos`;
  await db.doc(`negocios/${id}`).set({
    donoId: uid, tipo: "servicos", nome: `Zeta ${String(i).padStart(2, "0")}`, categoria: "limpeza", categorias: ["limpeza"],
    cidade: "Florianópolis", uf: "SC", cidadeIbge: 4205407, bairro: "Centro", descricao: "Limpeza residencial e comercial com capricho e pontualidade.",
    busca: ["zeta", String(i)], precoDesde: 80 + i, criadoEm: Timestamp.fromMillis(agora - (30 + i) * dia), atualizadoEm: Timestamp.fromMillis(agora - i * 60e3)
  });
  await db.doc(`notas/neg_${id}`).set({ total: 3, soma: 13 });
  if (i < PLANOS.length) await db.doc(`planos/${uid}`).set({ plano: PLANOS[i], meses: 1, ate: Timestamp.fromMillis(agora + 20 * dia) });
}
const planoDe = (c) => (String(c).match(/(?:hf-pl-|pl-)(plus|pro|premium)\b/) || [])[1] || "";

const { browser, ctx } = await navegador({ mobile: true });
const p = await entrar(ctx, "ana", "index.html");
const ordemTrilho = async (id) => {
  await p.waitForSelector(`#${id} .slot a`, { timeout: 20000 }); await p.waitForTimeout(2500);
  return p.$$eval(`#${id} .slot a`, (as) => as.map((a) => ({ c: a.className, t: a.textContent.slice(0, 40) })));
};
const top = await ordemTrilho("trilhoTop");
ok(top.length >= 6, `Mais bem avaliados com ${top.length} cartões`);
ok(planoDe(top[0].c) === "premium", "Início › Mais bem avaliados: o 1º é de um Premium");
ok(!!planoDe(top[5]?.c), "Início › Mais bem avaliados: o 6º é um espaço pago (" + planoDe(top[5]?.c) + ")");
ok(top.slice(1, 5).some((x) => !planoDe(x.c)), "Início: sem plano aparece entre os primeiros");
const novos = await ordemTrilho("trilhoNovos");
ok(planoDe(novos[0].c) === "premium", "Início › Chegaram agora: o 1º é de um Premium");
await p.reload();
const top2 = await ordemTrilho("trilhoTop");
ok(top2.map((x) => x.t).join() === top.map((x) => x.t).join(), "recarregar o Início não muda a ordem");
// Explorar: busca de negócios.
await p.goto(p.url().replace(/index\.html.*/, "feed.html?aba=explorar"));
await p.waitForSelector("#buscaPessoas", { timeout: 20000 });
await p.fill("#buscaPessoas", "zeta");
await p.waitForSelector(".linha-neg", { timeout: 20000 }); await p.waitForTimeout(2500);
await p.locator("#abasBusca button", { hasText: "Negócios" }).click(); await p.waitForTimeout(1500);
const neg = await p.$$eval(".linha-neg", (ls) => ls.map((l) => l.querySelector(".avatar")?.dataset.plano || ""));
ok(neg.length >= 6, `Explorar › busca "zeta": ${neg.length} negócios`);
ok(neg[0] === "premium" && ["plus", "pro", "premium"].includes(neg[5]), "Explorar › busca: o 1º é Premium e o 6º é um espaço pago: " + neg.slice(0, 6).join(", "));
await p.screenshot({ path: "saida/relevancia-explorar.png" });
await browser.close();
for (let i = 0; i < 25; i++) { await db.doc(`negocios/ri_u${i}_servicos`).delete(); await db.doc(`notas/neg_ri_u${i}_servicos`).delete(); await db.doc(`planos/ri_u${i}`).delete().catch(() => {}); }
process.exit();
