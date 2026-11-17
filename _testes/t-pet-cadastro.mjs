// RG do pet (17/11/2026): foto com recorte, seções, sexo/porte e cores claros, página de trás parada.
// Uso: node t-pet-cadastro.mjs
import { navegador, entrar } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const A = await navegador({ mobile: true });
await A.ctx.addInitScript(() => { try { localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" })); } catch {} });
const p = await entrar(A.ctx, "ana", "social.html");
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForTimeout(3500);
await p.evaluate(async () => {
  const { abrirCadastroPet } = await import("./pet-cadastro.js?v=2");
  window.__pet = abrirCadastroPet({ fb: window.__fbTeste || { serverTimestamp: () => null }, uid: "x", dados: { nome: "Ana" }, toast: (t) => (window.__toast = t) });
});
await p.waitForSelector(".pc-fundo");
ok(await p.evaluate(() => getComputedStyle(document.documentElement).overflow === "hidden"), "página de trás travada com o cadastro aberto");
await p.fill("#pcNome", "Thor"); await p.fill("#pcIdade", "3 anos");
await p.click('#pcSexo [data-v="m"]'); await p.click('#pcPorte [data-v="M"]');
const marcado = await p.locator('#pcSexo [data-v="m"]').evaluate((b) => getComputedStyle(b).borderColor);
ok(/0, 173, 238/.test(marcado), "sexo marcado com a borda azul (" + marcado + ")");
for (const c of ["preto", "branco", "caramelo", "cinza"]) await p.click(`.pc-cor[data-cor="${c}"]`);
ok(await p.locator('.pc-cor[data-cor="dourado"]').isDisabled(), "com 4 cores as outras ficam travadas");
ok((await p.locator(".pc-rg .nmv").textContent()) === "Thor" && /macho/.test(await p.locator(".pc-rg .sub").textContent()), "cartão do RG mostra o nome e o que foi escolhido");
// foto: escolher abre o recorte quadrado
await p.setInputFiles("#pcFoto", "saida/print-alto.jpg");
await p.waitForSelector(".hfe-fundo", { timeout: 8000 }).catch(() => {});
ok(await p.locator(".hfe-fundo").count() === 1, "escolher a foto abre o recorte (margem para enquadrar)");
await p.screenshot({ path: "saida/pet-recorte.png" });
await p.locator('.hfe-fundo [data-acao="ok"]').click(); await p.waitForTimeout(800);
ok(await p.locator(".pc-foto img").count() === 1 && await p.locator("#pcAjustar").isVisible(), "foto recortada no RG, com 'Ajustar foto'");
await p.locator(".pc-corpo").evaluate((c) => c.scrollTo(0, 0)); await p.waitForTimeout(300);
await p.screenshot({ path: "saida/pet-cadastro1.png" });
await p.locator(".pc-corpo").evaluate((c) => c.scrollTo(0, 520)); await p.waitForTimeout(300);
await p.screenshot({ path: "saida/pet-cadastro2.png" });
ok(!erros.length, "sem erros: " + erros.join(" | "));
await A.browser.close();
