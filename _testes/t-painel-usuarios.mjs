// Painel › Usuários: lista "Todos" com o total certo (contas sem data de cadastro ou sem último acesso entravam na
// contagem mas sumiam da lista), "Último acesso" mostra todo mundo, e-mail da conta preenchido ao entrar (contas antigas
// sem o e-mail apareciam com "—"). Roda: FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 node t-painel-usuarios.mjs
import { initializeApp } from "firebase-admin/app"; import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
let falhas = 0; const ok = (c, t) => { console.log((c ? "  ✔ " : "  ✘ ") + t); if (!c) falhas++; };
const SEM = "semDataAAAAAAAAAAAAAAAA";
await db.doc(`perfis_publicos/${SEM}`).set({ uid: SEM, nome: "Sem Data", nickname: "semdata" });
await db.doc(`usuarios/${SEM}`).set({ uid: SEM, nome: "Sem Data", aceiteTermos: true });
// A Ana "perde" o e-mail gravado (como as contas antigas do print)
await db.doc(`usuarios/${U.ana}`).update({ email: FieldValue.delete() });

const A = await navegador({ mobile: true });
const pa = await entrar(A.ctx, "ana", "sobre.html"); await pa.waitForTimeout(3500);
ok((await db.doc(`usuarios/${U.ana}`).get()).get("email") === "ana@teste.com", "ao entrar, a conta volta a ter o e-mail do login gravado");
await A.browser.close();

const total = (await db.collection("perfis_publicos").count().get()).data().count;
const B = await navegador({ mobile: true });
const erros = [];
const p = await entrar(B.ctx, "admin", "admin.html#usuarios");
p.on("pageerror", (e) => erros.push(e.message));
await p.setViewportSize({ width: 360, height: 760 });
await p.waitForSelector(".ad-tabela tbody tr", { timeout: 30000 }); await p.waitForTimeout(2500);
await p.evaluate(() => document.getElementById("hfLocalJanela")?.remove());
const linhas = async () => p.locator(".ad-tabela tbody tr").count();
ok(await linhas() === total, `"Todos" mostra todas as ${total} contas (antes faltava quem não tem data de cadastro)`);
ok(await p.locator(".ad-tabela tbody tr", { hasText: "Sem Data" }).count() === 1, "conta sem data de cadastro aparece");
ok(new RegExp(`Mostrando ${total} de ${total}`).test(await p.textContent("body")), "o texto bate com o total");
await p.locator(".ad-chip", { hasText: "Último acesso" }).first().click(); await p.waitForTimeout(2500);
ok(await linhas() === total, `"Último acesso" mostra todas (${await linhas()} de ${total}; antes só quem tinha acesso registrado)`);
await p.locator(".ad-chip", { hasText: "Mais recentes" }).first().click(); await p.waitForTimeout(2500);
ok(await p.locator(".ad-tabela tbody tr", { hasText: "ana@teste.com" }).count() === 1, "o e-mail da Ana aparece na lista");
const medidas = await p.evaluate(() => [...document.querySelectorAll(".ad-tabela tbody tr")].map((tr) => [...tr.children].map((td) => [td.getBoundingClientRect().top, td.getBoundingClientRect().height, getComputedStyle(td).display])));
const alinhadas = medidas.every((l) => l.every((c) => c[2] === "table-cell" && Math.abs(c[0] - l[0][0]) < 1.5 && Math.abs(c[1] - l[0][1]) < 1.5));
if (!alinhadas) console.log("    medidas:", JSON.stringify(medidas.find((l) => !l.every((c) => Math.abs(c[0] - l[0][0]) < 1.5 && Math.abs(c[1] - l[0][1]) < 1.5))));
ok(alinhadas, "linhas alinhadas no celular (360 px)");
ok(!erros.length, "sem erros " + erros.join(" | "));
await B.browser.close();
await db.doc(`perfis_publicos/${SEM}`).delete(); await db.doc(`usuarios/${SEM}`).delete();
console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
