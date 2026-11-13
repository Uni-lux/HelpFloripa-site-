// Flash: o rodapé (Mencionados, Visualizações/Destacar, responder) nunca fica na beirada da foto (metade dentro, metade
// fora) e as figurinhas (enquete, link) não ficam embaixo dele; no seu flash e no dos outros, em vários celulares e com a
// barra do navegador (tela mais baixa). Uso: node t-chip-mencao.mjs (rodar seed.mjs antes)
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
let falhas = 0; const ok = (c, m) => { console.log((c ? "  ✔ " : "  ✘ ") + m); if (!c) falhas++; };
const PX = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const neg = (await db.collection("negocios").limit(1).get()).docs[0];
await db.doc("stories/chipM").set({ restrito: false, autorId: U.ana, nome: "Ana", tipo: "foto", midia: PX, mencoes: [U.bruno], criadoEm: Timestamp.now(),
  enquete: { pergunta: "Jk", opcoes: ["Sim", "Não"], x: 0.6, y: 0.62, fimEm: Timestamp.fromMillis(Date.now() + 8 * 3600e3) },
  ...(neg ? { link: { negocioId: neg.id, nome: "Relógios", tipo: neg.data().tipo || "lojinha", x: 0.25, y: 0.8 } } : {}) });
const medir = (p) => p.evaluate(() => {
  const R = (e) => e.getBoundingClientRect(), qb = R(document.querySelector(".story-quadro")).bottom;
  const linhas = [...document.querySelector(".story-rodape").children].filter((c) => getComputedStyle(c).position !== "absolute" && c.offsetHeight).map(R);
  const figs = [...document.querySelectorAll(".story-quadro .story-enq, .story-quadro a.story-link")].map(R);
  const cobre = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  return { qb, beirada: linhas.filter((l) => l.top < qb - 1 && l.bottom > qb - 4).length, figs: figs.length,
    figSobRodape: figs.filter((f) => linhas.some((l) => cobre(f, l))).length, figsJuntas: figs.length > 1 && cobre(figs[0], figs[1]),
    linhas: linhas.map((l) => `${Math.round(l.top)}–${Math.round(l.bottom)}`).join(", ") };
});
for (const [w, h] of [[360, 800], [360, 660], [390, 844], [390, 700], [412, 915], [360, 740]]) for (const quem of ["ana", "bruno"]) {
  const A = await navegador({ mobile: true });
  const p = await entrar(A.ctx, quem, "feed.html?flash=chipM");
  await p.setViewportSize({ width: w, height: h });
  await p.waitForSelector(".story-mencoes", { timeout: 20000 }); await p.waitForTimeout(1000);
  const r = await medir(p);
  ok(!r.beirada && !r.figSobRodape && !r.figsJuntas && r.figs >= 1, `${w}×${h} (${quem === "ana" ? "seu flash" : "de outra pessoa"}): foto termina em ${Math.round(r.qb)}, linhas ${r.linhas}; ${r.figs} figurinha(s), nenhuma por baixo do rodapé`);
  if (w === 360 && h === 660 && quem === "ana") await p.screenshot({ path: "saida/chip-mencao.png" });
  await A.browser?.close?.();
}
await db.doc("stories/chipM").delete();
console.log(falhas ? `${falhas} falha(s)` : "tudo certo"); process.exit(falhas ? 1 : 0);
