import { navegador, entrar, BASE } from "./nav.mjs";
const mobile = process.argv[2] !== "pc";
const { browser, ctx } = await navegador({ mobile });
const p = await entrar(ctx, "ana", "servicos.html");
await p.waitForSelector("#vtLocalBtn", { timeout: 20000 }); await p.waitForTimeout(2500);
const nomes = () => p.evaluate(() => [...new Set([...document.querySelectorAll("#vtGrade [class*=nome], #vtGrade h3, #vtGrade strong")].map((e) => e.textContent.trim()).filter((t) => /Reparos|Pinturas|Faxina/.test(t)))]);
console.log("sem filtro:", await p.textContent("#vtLocalBtn"), await nomes());
const aplicar = async (uf, cidade) => {
  await p.click("#vtLocalBtn"); await p.waitForSelector("#vtLocalPop select");
  await p.selectOption("#vtLocalPop select", uf); await p.waitForTimeout(400);
  if (cidade) { await p.locator("#vtLocalPop input[role=combobox]").fill(cidade); await p.waitForTimeout(200); await p.locator("#vtLocalPop .hf-end-lista li").first().click(); }
  if (!cidade && uf === "SC") await p.screenshot({ path: `saida/busca-filtro-${mobile ? "cel" : "pc"}.png` });
  await p.click("#vtLocalPop .vt-local-aplicar"); await p.waitForTimeout(800);
};
await aplicar("SP"); console.log("SP:", await p.textContent("#vtLocalBtn"), await nomes());
await aplicar("SC"); console.log("SC:", await p.textContent("#vtLocalBtn"), await nomes());
await aplicar("SC", "florian"); console.log("Florianópolis:", await p.textContent("#vtLocalBtn"), await nomes());
await p.screenshot({ path: `saida/busca-${mobile ? "cel" : "pc"}.png` });
await p.reload(); await p.waitForTimeout(3500);
console.log("lembrou depois de recarregar:", await p.textContent("#vtLocalBtn"), await nomes());
await p.click("#vtLocalBtn"); await p.click("#vtLocalPop .vt-local-limpar"); await p.waitForTimeout(600);
console.log("Todo o Brasil:", await nomes());
// Imóveis com bairro
await p.goto(BASE + "imoveis.html"); await p.waitForSelector("#vtLocalBtn"); await p.waitForTimeout(2500);
const imoveis = () => p.evaluate(() => [...new Set([...document.querySelectorAll("#vtGrade strong, #vtGrade h3, #vtGrade .nm")].map((e) => e.textContent.trim()).filter((t) => /Trindade|Pinheiros|Studio|Apto/.test(t)))]);
console.log("imóveis sem filtro:", await imoveis());
await p.click("#vtLocalBtn"); await p.selectOption("#vtLocalPop select", "SC"); await p.waitForTimeout(400);
await p.locator("#vtLocalPop input[role=combobox]").fill("florian"); await p.waitForTimeout(200); await p.locator("#vtLocalPop .hf-end-lista li").first().click();
await p.locator("#vtLocalPop input[autocomplete=address-level3]").fill("trinda");
await p.click("#vtLocalPop .vt-local-aplicar"); await p.waitForTimeout(800);
console.log("imóveis Florianópolis · trinda:", await p.textContent("#vtLocalBtn"), await imoveis());
await browser.close();
