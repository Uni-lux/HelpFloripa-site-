// Avaliações: negócio avalia o cliente pelo cartão do chat e cliente com vínculo avalia o negócio.
// Uso: node t-aval.mjs [pr25|main]  (só muda o que se espera: com pr25 o vínculo ainda bloqueia)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
initializeApp({ projectId: "demo-hf" });
const db = getFirestore();
const { browser, ctx } = await navegador({ mobile: true });
const janela = async (p) => (await p.locator(".hf-aval").last().textContent().catch(() => "")).replace(/\s+/g, " ").trim().slice(0, 220);
const dialogos = [];
// 1) Bruno (negócio) avalia a Ana pelo cartão do chat
let p = await entrar(ctx, "bruno", `mensagens.html?conversa=${U.conv}`);
p.on("dialog", (d) => { dialogos.push(d.message()); d.dismiss(); });
await p.waitForFunction(() => [...document.querySelectorAll(".aval-acoes button")].some((b) => b.textContent.includes("Avaliar cliente")), null, { timeout: 20000 });
await p.locator(".aval-acoes button", { hasText: "Avaliar cliente" }).first().click();
await p.waitForSelector(".hf-aval .grande button", { timeout: 10000 });
await p.locator(".hf-aval .grande button").nth(3).click();
await p.locator(".hf-aval .pri").click();
await p.waitForTimeout(2500);
const c = await db.doc(`avaliacoes/c_${U.bruno}_servicos_${U.ana}`).get();
console.log("bruno avaliou ana:", c.exists ? `nota ${c.data().nota}` : "NÃO", "| alertas:", JSON.stringify(dialogos.splice(0)), "| janela:", await janela(p));
// 2) Cliente sem ter escrito na conversa: o motivo real aparece (e não "confirme seu e-mail")
await db.doc(`conversas/${U.conv}`).set({ falaram: { [U.ana]: false, [U.bruno]: true } }, { merge: true });
await db.doc(`avaliacoes/c_${U.bruno}_servicos_${U.ana}`).delete();
await p.reload();
await p.evaluate(() => sessionStorage.removeItem("hf-aval-situacao"));
await p.reload();
await p.waitForFunction(() => [...document.querySelectorAll(".aval-acoes button")].some((b) => b.textContent.includes("Avaliar cliente")), null, { timeout: 20000 });
await p.locator(".aval-acoes button", { hasText: "Avaliar cliente" }).first().click();
await p.waitForTimeout(2500);
console.log("sem o cliente ter escrito:", await janela(p), "| alertas:", JSON.stringify(dialogos.splice(0)));
await db.doc(`conversas/${U.conv}`).set({ falaram: { [U.ana]: true, [U.bruno]: true } }, { merge: true });
await p.close();
// 3) Ana tem vínculo aceito com o Bruno (amigos) e avalia o negócio
const par = [U.ana, U.bruno].sort().join("_");
await db.doc(`vinculos/${par}`).set({ participantes: par.split("_"), de: U.ana, para: U.bruno, tipoDe: "amigo", tipoPara: "amigo", status: "aceito", criadoEm: Timestamp.now() });
p = await entrar(ctx, "ana", `mensagens.html?conversa=${U.conv}`);
p.on("dialog", (d) => { dialogos.push(d.message()); d.dismiss(); });
await p.waitForFunction(() => [...document.querySelectorAll(".aval-acoes button")].some((b) => b.textContent.includes("Avaliar")), null, { timeout: 20000 });
await p.locator(".aval-acoes button", { hasText: "Avaliar" }).first().click();
await p.waitForTimeout(2000);
if (await p.locator(".hf-aval .grande button").count()) {
  await p.locator(".hf-aval .grande button").nth(4).click();
  await p.locator(".hf-aval .pri").click();
  await p.waitForTimeout(2500);
}
const n = await db.doc(`avaliacoes/n_${U.bruno}_servicos_${U.ana}`).get();
console.log("ana (amiga) avaliou o negócio:", n.exists ? `nota ${n.data().nota}` : "NÃO", "| motivo na janela:", (await p.locator(".hf-aval .erro:not([hidden])").textContent().catch(() => "")) || "(nenhum)", "| alertas:", JSON.stringify(dialogos.splice(0)));
await p.screenshot({ path: "saida/aval-amiga.png" });
await browser.close();
