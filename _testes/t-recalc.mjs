// Painel → Publicações → "Recalcular estrelas": monta diario_notas a partir das notas (publicações de antes).
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => console.log(c ? "  ✔" : "  ✘", t);
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
await db.doc("diario/velho").set({ autorId: U.bruno, nome: "Bruno", texto: "post antigo", criadoEm: Timestamp.now() });
for (const [u, n] of [[U.ana, 5], [U.edu, 4], [U.fabi, 5]]) await db.doc(`curtidas/velho_${u}`).set({ postId: "velho", uid: u, postAutorId: U.bruno, nota: n });
await db.doc("diario_notas/velho").set({ total: 1, soma: 3, n1: 0, n2: 0, n3: 1, n4: 0, n5: 0 }); // resumo errado
const { browser, ctx } = await navegador({ mobile: false });
const p = await entrar(ctx, "dani", "admin.html#publicacoes");
p.on("dialog", (d) => d.accept());
await p.waitForSelector("button:has-text('Recalcular estrelas')", { timeout: 40000 });
await p.locator("button:has-text('Recalcular estrelas')").click();
await p.waitForTimeout(4000);
const r = (await db.doc("diario_notas/velho").get()).data();
ok(r.total === 3 && r.soma === 14 && r.n5 === 2 && r.n4 === 1 && r.n3 === 0, "recalculou: " + JSON.stringify(r));
await browser.close();
