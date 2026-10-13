// Conversão das cidades antigas e janela para completar.
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { navegador, entrar, USUARIOS, BASE } from "./nav.mjs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
initializeApp({ projectId: "demo-hf" });
const db = getFirestore();
const ver = async (uid) => { const [u, p] = await Promise.all([db.doc(`usuarios/${uid}`).get(), db.doc(`perfis_publicos/${uid}`).get()]); const f = (d) => ({ cidade: d.cidade, uf: d.uf, ibge: d.cidadeIbge }); return { conta: f(u.data()), publico: f(p.data()) }; };
const { browser, ctx } = await navegador({ mobile: true });
// 1) "florianopolis" (formato bem antigo) converte sozinho, inclusive o negócio
let p = await entrar(ctx, "fabi", "index.html");
await p.waitForTimeout(5000);
console.log("fabi:", JSON.stringify(await ver(USUARIOS.fabi)), "| negócio:", JSON.stringify((({ cidade, uf, cidadeIbge }) => ({ cidade, uf, cidadeIbge }))((await db.doc(`negocios/${USUARIOS.fabi}_servicos`).get()).data())));
console.log("  janela apareceu?", await p.isVisible("#hfLocalJanela"));
await p.close();
// 2) cidade que não existe: pede para escolher
const c2 = await browser.newContext({ bypassCSP: false, viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true });
const { ctx: ctx2 } = await navegador({ mobile: true });
p = await entrar(ctx2, "hele", "index.html");
await p.waitForSelector("#hfLocalJanela", { timeout: 15000 });
console.log("hele: janela com texto:", (await p.locator("#hfLocalJanela p").textContent()).slice(0, 80));
await p.screenshot({ path: "saida/local-janela.png" });
await p.selectOption("#hfLocalJanela select", "RS");
await p.waitForTimeout(500);
await p.locator("#hfLocalJanela input").fill("porto ale");
await p.waitForTimeout(300);
console.log("  sugestões:", await p.locator("#hfLocalJanela .hf-end-lista li").allTextContents());
await p.screenshot({ path: "saida/local-sugestoes.png" });
await p.locator("#hfLocalJanela .hf-end-lista li").first().click();
await p.locator("#hfLocalJanela .sim").click();
await p.waitForTimeout(2000);
console.log("  depois de salvar:", JSON.stringify(await ver(USUARIOS.hele)), "| janela fechou:", !(await p.isVisible("#hfLocalJanela")));
// 3) sem cidade: "Agora não" adia
const { ctx: ctx3 } = await navegador({ mobile: true });
p = await entrar(ctx3, "gui", "index.html");
await p.waitForSelector("#hfLocalJanela", { timeout: 15000 });
await p.locator("#hfLocalJanela .nao").click();
await p.evaluate(() => sessionStorage.clear());
await p.goto(BASE + "servicos.html"); await p.waitForTimeout(4000);
console.log("gui: adiou e não voltou a perguntar:", !(await p.isVisible("#hfLocalJanela")));
// 4) já no padrão novo: nada acontece
const { ctx: ctx4 } = await navegador({ mobile: true });
p = await entrar(ctx4, "edu", "index.html"); await p.waitForTimeout(4000);
console.log("edu (SP já certo):", JSON.stringify(await ver(USUARIOS.edu)), "| janela:", await p.isVisible("#hfLocalJanela"));
await browser.close(); process.exit(0);
