// Gaveta dos planos: "Seu plano vai valer até ..." (data certa) e o bônus de 30 dias só na primeira assinatura
// (quem já teve pedido pago não vê mais o bônus em lugar nenhum; renovar soma ao que falta).
// Uso: node seed.mjs && node t-validade.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, BASE } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const DIA = 864e5;
let p; const dataLonga = (dias) => p.evaluate((d) => new Date(Date.now() + d * 864e5).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }), dias);
for (const d of (await db.collection("planos_pedidos").where("uid", "==", U.bruno).get()).docs) await d.ref.delete();
await db.doc(`planos/${U.bruno}`).delete().catch(() => {}); await db.doc(`planos_negociacoes/${U.bruno}`).delete().catch(() => {});
const B = await navegador({ mobile: true });
p = await entrar(B.ctx, "bruno", "negocios.html?planos=1");
await p.waitForSelector(".pl-validade", { timeout: 20000 });
let v = (await p.textContent(".pl-validade")).replace(/\s+/g, " ");
ok(v.includes("Seu Pro vai valer até") && v.includes(await dataLonga(60)) && v.includes("+ 30 dias grátis") && v.includes("primeira assinatura"), "primeira assinatura: 1 mês + 30 dias, data por extenso: " + v);
await p.locator(".pl-per[data-m='3']").click();
v = (await p.textContent(".pl-validade")).replace(/\s+/g, " ");
ok(v.includes(await dataLonga(120)) && v.includes("3 meses pagos"), "3 meses: data muda junto");
await p.locator(".pl-validade").scrollIntoViewIfNeeded(); await p.screenshot({ path: "saida/validade-primeira.png" });
// Já pagou antes: sem bônus em lugar nenhum; renovar o Pro soma ao que falta.
const ped = await db.collection("planos_pedidos").add({ uid: U.bruno, plano: "pro", meses: 1, valor: 39.9, txid: "HFX1", status: "pago", criadoEm: Timestamp.now() });
await db.doc(`planos/${U.bruno}`).set({ plano: "pro", ate: Timestamp.fromMillis(Date.now() + 10 * DIA), meses: 1, pedidoId: ped.id, ativadoEm: Timestamp.now(), ativadoPor: "x" });
await p.goto(BASE + "negocios.html?planos=1"); await p.waitForSelector(".pl-validade", { timeout: 20000 });
const tudo = await p.textContent(".pl-caixa");
v = (await p.textContent(".pl-validade")).replace(/\s+/g, " ");
ok(!/dias grátis/.test(tudo), "depois da primeira assinatura: nenhum \"30 dias grátis\" na gaveta");
ok(v.includes(await dataLonga(40)) && v.includes("somados ao que ainda falta"), "renovar o Pro: soma aos 10 dias que faltam: " + v);
// Encerrado pela equipe (plano grátis, guardando o pedido): continua sem bônus.
await db.doc(`planos/${U.bruno}`).set({ plano: "gratis", ate: Timestamp.now(), ativadoEm: Timestamp.now(), ativadoPor: "x" });
await p.goto(BASE + "negocios.html?planos=1"); await p.waitForSelector(".pl-validade", { timeout: 20000 });
ok(!/dias grátis/.test(await p.textContent(".pl-caixa")), "plano encerrado sem o pedido no documento: o pedido pago já basta, sem bônus");
await p.locator(".pl-validade").scrollIntoViewIfNeeded(); await p.screenshot({ path: "saida/validade-renovar.png" });
await B.browser.close();
for (const d of (await db.collection("planos_pedidos").where("uid", "==", U.bruno).get()).docs) await d.ref.delete();
await db.doc(`planos/${U.bruno}`).delete();
