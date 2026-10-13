import { navegador, entrar, USUARIOS, BASE } from "./nav.mjs";
const { browser, ctx } = await navegador({ mobile: true });
for (const quem of ["admin", "ana"]) {
  const c2 = await browser.newContext({ bypassCSP: true, viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  await c2.close();
}
// Menu: admin
let p = await entrar(ctx, "admin", "index.html");
await p.waitForTimeout(2500);
await p.tap("#btnMenu");
await p.waitForSelector("#gavetaPainel", { timeout: 10000 }).catch(() => {});
await p.waitForFunction(() => !document.getElementById("gavetaPainelSub")?.textContent.includes("Conferindo"), null, { timeout: 10000 }).catch(() => {});
console.log("admin menu:", await p.evaluate(() => ({ tem: !!document.getElementById("gavetaPainel"), badge: document.getElementById("gavetaPainelBadge")?.textContent, hidden: document.getElementById("gavetaPainelBadge")?.hidden, sub: document.getElementById("gavetaPainelSub")?.textContent, href: document.getElementById("gavetaPainel")?.getAttribute("href") })));
await p.locator("#gavetaPainel").scrollIntoViewIfNeeded();
await p.screenshot({ path: "saida/menu-admin.png" });
await ctx.close();
// Menu: ana (não é da equipe) + sair da conta
const { browser: b2, ctx: ctx2 } = await navegador({ mobile: true });
p = await entrar(ctx2, "ana", "index.html");
await p.waitForTimeout(2500);
await p.tap("#btnMenu"); await p.waitForTimeout(2500);
console.log("ana menu tem equipe:", await p.evaluate(() => !!document.getElementById("gavetaPainel")));
await p.goto(BASE + "mensagens.html");
await p.waitForFunction(() => document.getElementById("carregandoApp").hidden, null, { timeout: 20000 });
await p.tap("#btnConfig"); await p.waitForTimeout(600);
await p.locator("#btnSairConta").scrollIntoViewIfNeeded();
await p.screenshot({ path: "saida/sair-botao.png" });
await p.tap("#btnSairConta"); await p.waitForTimeout(300);
console.log("janela aberta:", await p.isVisible(".hf-confirma"));
await p.screenshot({ path: "saida/sair-confirma.png" });
await p.tap(".hf-confirma .nao"); await p.waitForTimeout(200);
console.log("cancelar fecha:", !(await p.isVisible(".hf-confirma")));
await p.tap("#btnSairConta"); await p.waitForTimeout(200);
await p.keyboard.press("Escape"); await p.waitForTimeout(200);
console.log("esc fecha:", !(await p.isVisible(".hf-confirma")), "| painel ainda aberto:", await p.evaluate(() => document.getElementById("painelConfig").classList.contains("aberto")));
await p.tap("#btnSairConta"); await p.waitForTimeout(200);
await p.tap(".hf-confirma .sim");
await p.waitForTimeout(5000);
await p.waitForFunction(() => !!window.firebaseAuth, null, { timeout: 10000 }).catch(() => {});
await p.waitForTimeout(1500);
console.log("depois de sair:", p.url(), "| usuário:", await p.evaluate(() => window.firebaseAuth?.currentUser?.email || null));
await b2.close(); await browser.close();
