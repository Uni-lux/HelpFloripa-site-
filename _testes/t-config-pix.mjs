// ⋯ da conversa → "Configurações de pagamento": salvar a chave Pix (usuarios.pix), chave inválida avisa,
// o cartão de Pix já vem preenchido e "Remover a chave salva".
// Uso: node seed.mjs && node t-config-pix.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
await db.doc(`usuarios/${U.bruno}`).update({ pix: FieldValue.delete() }).catch(() => {});
const B = await navegador({ mobile: true });
const b = await entrar(B.ctx, "bruno", `mensagens.html?conversa=${U.conv}`);
await b.waitForSelector("#btnMenuConversa", { timeout: 20000 }); await b.waitForTimeout(2500);
await b.click("#btnMenuConversa"); await b.waitForTimeout(400);
ok(await b.locator("#menuMsg", { hasText: "Configurações de pagamento" }).count() === 1, "menu ⋯ tem \"Configurações de pagamento\"");
await b.locator("#menuMsg button, #menuMsg [role=menuitem]", { hasText: "Configurações de pagamento" }).first().click();
await b.waitForSelector(".pv-gaveta .px-campo", { timeout: 8000 });
const campos = b.locator(".pv-gaveta .px-campo input");
await campos.nth(0).fill("12345"); await b.waitForTimeout(200);
ok((await b.textContent(".px-tipo")).includes("inválida"), "chave inválida avisa na hora");
await b.locator(".pv-gaveta .pv-btn.pri", { hasText: "Salvar" }).click(); await b.waitForTimeout(500);
ok(!(await db.doc(`usuarios/${U.bruno}`).get()).data().pix, "não salva chave inválida");
await campos.nth(0).fill("bruno@exemplo.com"); await campos.nth(1).fill("Bruno Reparos"); await b.waitForTimeout(200);
ok((await b.textContent(".px-tipo")).includes("E-mail") || (await b.textContent(".px-tipo")).toLowerCase().includes("e-mail"), "mostra o tipo da chave: " + await b.textContent(".px-tipo"));
await b.locator(".pv-gaveta").screenshot({ path: "saida/config-pix.png" });
await b.locator(".pv-gaveta .pv-btn.pri", { hasText: "Salvar" }).click(); await b.waitForTimeout(1500);
const pix = (await db.doc(`usuarios/${U.bruno}`).get()).data().pix;
ok(pix?.chave === "bruno@exemplo.com" && pix.nome === "Bruno Reparos", "chave salva na conta: " + JSON.stringify(pix));
await b.click("#btnAnexar"); await b.waitForTimeout(800);
await b.locator(".ax-op", { hasText: "Pix" }).click(); await b.waitForSelector(".px-campo", { timeout: 8000 }); await b.waitForTimeout(800);
ok(await b.locator(".pv-gaveta .px-campo input").first().inputValue() === "bruno@exemplo.com", "cartão de Pix já vem com a chave salva");
await b.keyboard.press("Escape"); await b.waitForTimeout(500);
await b.click("#btnMenuConversa"); await b.waitForTimeout(400);
await b.locator("#menuMsg button, #menuMsg [role=menuitem]", { hasText: "Configurações de pagamento" }).first().click();
await b.waitForSelector(".pv-gaveta .pv-btn.perigo", { timeout: 8000 });
await b.locator(".pv-gaveta .pv-btn.perigo").click(); await b.waitForTimeout(1500);
ok(!(await db.doc(`usuarios/${U.bruno}`).get()).data().pix, "\"Remover a chave salva\" apaga da conta");
await B.browser.close();
