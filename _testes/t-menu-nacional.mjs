// Menu lateral nacional + páginas institucionais (Contato → chamado já preenchido).
import { navegador, entrar, BASE } from "./nav.mjs";
const { browser, ctx } = await navegador({ mobile: true });
const erros = [];
let p = await entrar(ctx, "ana", "contato.html");
p.on("pageerror", (e) => erros.push(e.message));
await p.waitForTimeout(2000);
await p.tap("#btnMenu"); await p.waitForTimeout(600);
const menu = await p.evaluate(() => [...document.querySelectorAll(".gaveta-secao")].map((s) => [s.querySelector("h3")?.textContent, [...s.querySelectorAll(".gaveta-item .rot")].map((r) => r.firstChild.textContent)]));
console.log("menu:", JSON.stringify(menu));
console.log("contato marcado:", await p.evaluate(() => document.querySelector('.gaveta-item[aria-current="page"]')?.textContent));
console.log("rodapé:", await p.evaluate(() => document.querySelector(".gaveta-rodape").innerText.replace(/\n+/g, " | ")));
await p.screenshot({ path: "saida/menu-nac-1.png" });
await p.locator(".gaveta-rodape").scrollIntoViewIfNeeded();
await p.screenshot({ path: "saida/menu-nac-2.png" });
await p.tap(".gaveta-x"); await p.waitForTimeout(400);
await p.screenshot({ path: "saida/contato-1.png", fullPage: true });
// Parcerias: some o "Enviar como chamado"
await p.selectOption("#ctAssunto", { label: "Parcerias, imprensa e anúncios" }).catch(() => p.evaluate(() => { const s = document.getElementById("ctAssunto"); s.selectedIndex = 7; s.dispatchEvent(new Event("change")); }));
console.log("parceria:", await p.evaluate(() => ({ aviso: !document.getElementById("ctParceria").hidden, chamado: document.querySelector('[data-via="chamado"]').hidden })));
await p.evaluate(() => { const s = document.getElementById("ctAssunto"); s.selectedIndex = 3; s.dispatchEvent(new Event("change")); });
await p.fill("#ctLocal", "Recife, PE"); await p.fill("#ctMsg", "Quero saber como funciona o plano Pro para o meu delivery.");
await p.locator('[data-via="chamado"]').scrollIntoViewIfNeeded();
await p.tap('[data-via="chamado"]');
await p.waitForURL(/suporte\.html/, { timeout: 15000 });
await p.waitForFunction(() => document.getElementById("folhaNovo")?.classList.contains("aberta"), null, { timeout: 20000 }).catch(() => {});
console.log("suporte:", await p.evaluate(() => ({ aberta: document.getElementById("folhaNovo")?.classList.contains("aberta"), assunto: document.getElementById("supAssunto").value, texto: document.getElementById("supTexto").value, cont: document.getElementById("supCont")?.textContent, cat: document.querySelector("[aria-pressed='true'], .cat.sel, .escolhida")?.textContent?.trim().slice(0, 40) })));
await p.screenshot({ path: "saida/contato-chamado.png" });
// Perto de você pelo menu
await p.goto(BASE + "ajuda.html"); await p.waitForTimeout(1500);
await p.tap("#btnMenu"); await p.waitForTimeout(500);
await p.tap('.gaveta-item[href="index.html#secPerto"]');
await p.waitForURL(/index\.html#secPerto/); await p.waitForTimeout(6000);
console.log("perto:", await p.evaluate(() => ({ menuFechado: !document.body.classList.contains("gaveta-aberta"), topo: Math.round(document.getElementById("secPerto").getBoundingClientRect().top), oculta: document.getElementById("secPerto").hidden })));
await p.screenshot({ path: "saida/menu-perto.png" });
for (const pg of ["ajuda.html", "clientes.html", "profissionais.html", "socios-parcerias.html", "sobre.html"]) {
  await p.goto(BASE + pg); await p.waitForTimeout(1200);
  await p.screenshot({ path: `saida/nac-${pg.replace(".html", "")}.png`, fullPage: true });
}
// Menu abre onde a pessoa estava (e com a página atual à vista)
await p.goto(BASE + "sobre.html"); await p.waitForTimeout(1500);
await p.tap("#btnMenu"); await p.waitForTimeout(500);
await p.locator('.gaveta-item[href="profissionais.html"]').scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
const antes = await p.evaluate(() => document.getElementById("gaveta").scrollTop);
await p.tap('.gaveta-item[href="profissionais.html"]');
await p.waitForURL(/profissionais/); await p.waitForTimeout(1500);
await p.tap("#btnMenu"); await p.waitForTimeout(600);
console.log("rolagem do menu:", await p.evaluate((antes) => { const g = document.getElementById("gaveta"), a = g.querySelector('[aria-current="page"]').getBoundingClientRect(), r = g.getBoundingClientRect(); return { antes, depois: Math.round(g.scrollTop), atualVisivel: a.top >= r.top && a.bottom <= r.bottom, atual: g.querySelector('[aria-current="page"]').textContent }; }, antes));
await p.screenshot({ path: "saida/menu-rolagem.png" });
console.log("erros:", erros.length ? erros : "nenhum");
await browser.close();
