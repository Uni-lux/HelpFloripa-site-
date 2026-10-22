// Início nacional: "Você está em" (vale para as vitrines), buscas populares, cidades em destaque, segurança.
import { navegador, entrar, BASE } from "./nav.mjs";
const { browser, ctx } = await navegador({ mobile: true });
const erros = [];
const p = await entrar(ctx, "ana", "index.html");
p.on("pageerror", (e) => erros.push(e.message));
await p.evaluate(() => localStorage.removeItem("hf-busca-local"));
await p.reload(); await p.waitForTimeout(5000);
console.log("título:", await p.title());
console.log("chip:", await p.textContent("#localBtn"));
console.log("populares (freelances):", await p.evaluate(() => [...document.querySelectorAll("#buscasPop button")].map((b) => b.textContent).join(", ")));
await p.screenshot({ path: "saida/ini-1.png" });
// trocar a área muda as buscas populares; tocar numa leva à vitrine com a busca
await p.evaluate(() => { const s = document.getElementById("classeBusca"); s.value = "delivery"; s.dispatchEvent(new Event("change")); });
console.log("populares (delivery):", await p.evaluate(() => [...document.querySelectorAll("#buscasPop button")].map((b) => b.textContent).slice(0, 3).join(", ")));
await p.tap("#buscasPop button:nth-of-type(1)");
await p.waitForURL(/delivery\.html\?q=Pizza/, { timeout: 10000 });
console.log("foi para:", p.url().replace(BASE, ""));
await p.goto(BASE + "index.html"); await p.waitForTimeout(3000);
// escolher a cidade
await p.tap("#localBtn"); await p.waitForTimeout(500);
await p.screenshot({ path: "saida/ini-local.png" });
const ops = await p.evaluate(() => [...document.querySelectorAll(".hm-local-op strong")].map((s) => s.textContent));
console.log("opções:", ops.join(" | "));
// Estado + cidade pela lista
await p.selectOption(".hm-local select", "SC").catch(() => {});
await p.waitForTimeout(800);
const cid = p.locator(".hm-local input").first();
await cid.fill("Florianópolis"); await p.waitForTimeout(800);
await p.keyboard.press("Enter").catch(() => {});
await p.waitForTimeout(300);
const lido = await p.evaluate(() => document.querySelector(".hm-local") ? "aberta" : "fechada");
if (lido === "aberta") await p.tap(".hm-local-aplicar");
await p.waitForTimeout(5000);
console.log("local salvo:", await p.evaluate(() => localStorage.getItem("hf-busca-local")));
console.log("chip:", await p.textContent("#localTexto"), "| top:", await p.textContent("#t-secTop"), "| novos:", await p.textContent("#t-secNovos"));
console.log("perto:", await p.textContent("#pertoSub"));
console.log("cidades:", await p.evaluate(() => document.getElementById("secCidades").hidden ? "escondida" : [...document.querySelectorAll("#cidadesChips strong")].map((s) => s.textContent).join(", ")));
await p.screenshot({ path: "saida/ini-2.png" });
await p.evaluate(() => document.querySelector(".faixa-seg").scrollIntoView({ block: "center" })); await p.waitForTimeout(300);
await p.screenshot({ path: "saida/ini-seg.png" });
// a vitrine usa o mesmo lugar
await p.goto(BASE + "servicos.html"); await p.waitForTimeout(4000);
console.log("vitrine:", await p.evaluate(() => document.getElementById("vtLocalBtn")?.textContent));
// volta para todo o Brasil
await p.goto(BASE + "index.html"); await p.waitForTimeout(2500);
await p.tap("#localBtn"); await p.waitForTimeout(400);
await p.locator(".hm-local-op", { hasText: "Todo o Brasil" }).tap(); await p.waitForTimeout(4000);
console.log("depois:", await p.textContent("#localTexto"), "| top:", await p.textContent("#t-secTop"));
console.log("erros:", erros.length ? erros : "nenhum");
await browser.close();
