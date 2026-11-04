// Flash: a linha dos mencionados nunca fica na beirada da foto (metade dentro, metade fora), no seu flash e no dos outros,
// em celulares de tamanhos diferentes. Uso: node t-chip-mencao.mjs (rodar seed.mjs antes)
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
let falhas = 0; const ok = (c, m) => { console.log((c ? "  ✔ " : "  ✘ ") + m); if (!c) falhas++; };
const PX = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
await db.doc("stories/chipM").set({ autorId: U.ana, nome: "Ana", tipo: "foto", midia: PX, mencoes: [U.bruno], criadoEm: Timestamp.now() });
const medir = (p) => p.evaluate(() => { const q = document.querySelector(".story-quadro").getBoundingClientRect(), l = document.querySelector(".story-linha-acoes").getBoundingClientRect(), m = document.querySelector(".story-mencoes").getBoundingClientRect(), b = document.querySelector(".story-mencoes .pilha-tx b").getBoundingClientRect();
  return { qb: q.bottom, lt: l.top, lb: l.bottom, meio: Math.abs((b.top + b.bottom) / 2 - (m.top + m.bottom) / 2) }; });
for (const [w, h] of [[360, 800], [390, 844], [412, 915], [360, 740]]) for (const quem of ["ana", "bruno"]) {
  const A = await navegador({ mobile: true });
  const p = await entrar(A.ctx, quem, "feed.html?flash=chipM");
  await p.setViewportSize({ width: w, height: h });
  await p.waitForSelector(".story-mencoes", { timeout: 20000 }); await p.waitForTimeout(900);
  const r = await medir(p);
  const naBeirada = r.lt < r.qb - 1 && r.lb > r.qb - 4;
  ok(!naBeirada && r.meio < 2, `${w}×${h} (${quem === "ana" ? "seu flash" : "flash de outra pessoa"}): linha ${Math.round(r.lt)}–${Math.round(r.lb)}, foto termina em ${Math.round(r.qb)}, nome no meio (${r.meio.toFixed(1)} px)`);
  await A.browser?.close?.();
}
await db.doc("stories/chipM").delete();
console.log(falhas ? `${falhas} falha(s)` : "tudo certo"); process.exit(falhas ? 1 : 0);
