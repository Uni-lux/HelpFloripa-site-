// Ordem justa das vitrines (relevancia.js): 1 espaço a cada 5 é de quem tem plano, o resto pela relevância (nota ajustada,
// novidade, perto, bônus do plano, exposição); a ordem não muda ao recarregar; quem a pessoa já viu muito no topo desce;
// fileira de categoria e destaques seguem a mesma regra. Uso: node seed.mjs && node t-relevancia.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, BASE } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const dia = 864e5, agora = Date.now();
const PLANOS = ["plus", "pro", "premium", "plus", "pro"];
for (let i = 0; i < 25; i++) {
  const uid = `rl_u${i}`;
  await db.doc(`negocios/${uid}_servicos`).set({
    donoId: uid, tipo: "servicos", nome: `Prof ${String(i).padStart(2, "0")}`, categoria: "limpeza", categorias: ["limpeza"],
    cidade: "Florianópolis", uf: "SC", cidadeIbge: 4205407, bairro: "Centro", descricao: "Limpeza residencial e comercial com capricho e pontualidade.",
    precoDesde: 80 + i, criadoEm: Timestamp.fromMillis(agora - (30 + i) * dia), atualizadoEm: Timestamp.fromMillis(agora - i * 36e5)
  });
  if (i < PLANOS.length) await db.doc(`planos/${uid}`).set({ plano: PLANOS[i], meses: 1, ate: Timestamp.fromMillis(agora + 20 * dia) });
}

const { browser, ctx } = await navegador({ mobile: true });
await ctx.addInitScript(() => { try { if (!localStorage.getItem("hf-vt-modo-servicos")) localStorage.setItem("hf-vt-modo-servicos", "2"); } catch {} });
const p = await entrar(ctx, "ana", "servicos.html");
const ordem = async () => {
  await p.waitForSelector("#vtGrade article.vt-cv", { timeout: 20000 });
  await p.waitForTimeout(1500);
  return p.$$eval("#vtGrade article.vt-cv", (cs) => cs.map((c) => ({ nome: c.querySelector(".nm")?.textContent.trim(), pago: /\bpl-(plus|pro|premium)\b/.test(c.className) })));
};
const a = await ordem();
const pagos = a.map((x, i) => (x.pago ? i : -1)).filter((i) => i >= 0);
ok(a.length >= 25, `${a.length} profissionais na lista`);
// A cada 5 posições (1ª, 6ª, 11ª...) vem um pagante, enquanto houver pagante que ainda não apareceu (com o bônus
// do plano algum pode aparecer antes, pela relevância).
const aCada5 = (l) => l.every((x, i) => i % 5 !== 0 || x.pago || l.slice(0, i).filter((y) => y.pago).length >= l.filter((y) => y.pago).length);
ok(aCada5(a) && pagos.length === 5, "1 espaço pago a cada 5 enquanto há pagante: pagos em " + pagos.map((i) => i + 1).join(", "));
// O que os planos prometem: espaços pagos na ordem Premium → Pro → Plus; o 1º cartão é de um Premium.
const planoDe = (c) => (c.match(/\bpl-(plus|pro|premium)\b/) || [])[1] || "";
const slots = await p.$$eval("#vtGrade article.vt-cv", (cs) => cs.map((c) => c.className));
const ordemSlots = [0, 5, 10, 15, 20].map((i) => planoDe(slots[i] || "")).filter(Boolean);
ok(planoDe(slots[0]) === "premium", "o 1º cartão é de um Premium");
const NIV = { plus: 1, pro: 2, premium: 3 };
ok(ordemSlots.every((k, i) => i === 0 || NIV[k] <= NIV[ordemSlots[i - 1]]), "espaços pagos na ordem Premium → Pro → Plus: " + ordemSlots.join(", "));
ok(a.slice(0, 5).filter((x) => !x.pago).length >= 2, "nos 5 primeiros há pelo menos 2 perfis sem plano (o topo não é só de quem paga)");
ok(await p.$$eval("#vtGrade .vt-ordem button", (bs) => bs.map((b) => b.textContent).join("|")).then((t) => t.startsWith("Relevância") && t.includes("Mais bem avaliados")), "ordens: Relevância (padrão) e Mais bem avaliados");
await p.reload();
const b = await ordem();
ok(a.map((x) => x.nome).join() === b.map((x) => x.nome).join(), "recarregar não muda a ordem (giro fixo por 3 h)");
// O 1º sem plano foi muito visto: desce.
const alvo = a.find((x) => !x.pago).nome;
const idAlvo = `rl_u${Number(alvo.split(" ")[1])}_servicos`;
await p.evaluate((id) => { localStorage.setItem("hf-expo", JSON.stringify({ [id]: { n: 40, em: Date.now(), j: 0 } })); }, idAlvo);
await p.reload();
const c = await ordem();
const antes = a.findIndex((x) => x.nome === alvo), depois = c.findIndex((x) => x.nome === alvo);
ok(depois > antes + 3, `quem a pessoa já viu muito desce: ${alvo} da posição ${antes + 1} para ${depois + 1}`);
// Outra pessoa vê outra mistura (mesma regra).
const p2 = await entrar((await navegador({ mobile: true })).ctx, "bruno", "sobre.html");
await p2.evaluate(() => localStorage.setItem("hf-vt-modo-servicos", "2"));
await p2.goto(BASE + "servicos.html");
await p2.waitForSelector("#vtGrade article.vt-cv", { timeout: 20000 }); await p2.waitForTimeout(1500);
const d = await p2.$$eval("#vtGrade article.vt-cv", (cs) => cs.map((c) => ({ nome: c.querySelector(".nm")?.textContent.trim(), pago: /\bpl-(plus|pro|premium)\b/.test(c.className) })));
ok(d.map((x) => x.nome).join() !== a.map((x) => x.nome).join() && d[0].pago && aCada5(d), "outra pessoa: outra mistura, com os mesmos espaços pagos");
// Por categoria: a fileira da categoria começa por um espaço pago e mistura os sem plano.
await p.evaluate(() => localStorage.setItem("hf-vt-modo-servicos", "linhas"));
await p.reload();
await p.waitForSelector("#vtGrade .linha-cat article", { timeout: 20000 }); await p.waitForTimeout(1200);
const fila = await p.evaluate(() => [...document.querySelectorAll("#vtGrade .linha-cat")].map((f) => ({ t: f.querySelector(".vt-car-tit")?.textContent || "", l: [...f.querySelectorAll("article")].map((c) => ({ pago: /\bpl-(plus|pro|premium)\b/.test(c.className) })) })).find((f) => /Limpeza/i.test(f.t)));
ok(fila && fila.l[0].pago && aCada5(fila.l) && fila.l.slice(0, 5).some((x) => !x.pago), `fileira "${fila?.t}": começa por um pagante, 1 a cada 5, sem plano no meio`);
const dest = await p.$$eval(".top-cat .vt-cv", (cs) => cs.length);
ok(dest > 0, `destaques de cada categoria aparecem (${dest})`);
await p.screenshot({ path: "saida/relevancia.png" });
await browser.close();
for (let i = 0; i < 25; i++) { await db.doc(`negocios/rl_u${i}_servicos`).delete(); await db.doc(`planos/rl_u${i}`).delete().catch(() => {}); }
process.exit();
