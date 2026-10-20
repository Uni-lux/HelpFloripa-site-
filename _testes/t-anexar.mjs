// Chat: o clipe abre a gaveta "Anexar" (galeria, câmera, localização, endereço, fazer pedido e o cartão do
// meu negócio); voltar fecha; galeria abre o seletor de arquivos; o cartão do negócio fica pronto para enviar.
// Uso: node t-anexar.mjs
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, m) => console.log(c ? "  ✔" : "  ✘", m);
const conv = [U.ana, U.bruno].sort().join("_");
const { browser, ctx } = await navegador({ mobile: true });
await ctx.addInitScript(() => { try { localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" })); } catch {} });
await ctx.grantPermissions(["geolocation"]); await ctx.setGeolocation({ latitude: -27.5954, longitude: -48.548 });
const p = await entrar(ctx, "bruno", `mensagens.html?conversa=${conv}`);
await p.waitForSelector("#btnAnexar", { timeout: 20000 }); await p.waitForTimeout(2500);
await p.click("#btnAnexar"); await p.waitForTimeout(1200);
const rot = (await p.locator(".ax-op b").allTextContents()).join(" | ");
ok(["Galeria", "Câmera", "Localização", "Endereço", "Fazer pedido", "Bruno Reparos"].every((x) => rot.includes(x)), "opções: " + rot);
await p.screenshot({ path: "saida/anexar.png" });
await p.goBack(); await p.waitForTimeout(600);
ok(await p.locator(".pv-fundo").count() === 0 && p.url().includes("conversa="), "voltar fecha a gaveta");
await p.click("#btnAnexar"); await p.waitForTimeout(800);
const escolha = p.waitForEvent("filechooser", { timeout: 5000 }).catch(() => null);
await p.locator(".ax-op", { hasText: "Galeria" }).click();
ok(!!(await escolha), "Galeria abre o seletor de fotos");
await p.waitForTimeout(500);
await p.click("#btnAnexar"); await p.waitForTimeout(800);
await p.locator(".ax-op", { hasText: "Localização" }).click(); await p.waitForTimeout(1500);
ok((await p.inputValue("#texto")).includes("maps.google.com/?q=-27.595400,-48.548000"), "localização vai para o campo para conferir e enviar");
await p.fill("#texto", "");
await p.click("#btnAnexar"); await p.waitForTimeout(1200);
await p.locator(".ax-op", { hasText: "Bruno Reparos" }).click(); await p.waitForTimeout(1500);
ok(!(await p.locator("#barraCartao").isHidden()) && (await p.textContent("#cartaoTitulo")).includes("Bruno Reparos"), "cartão do meu negócio pronto para enviar");
await p.screenshot({ path: "saida/anexar-cartao.png" });
await browser.close();
process.exit(0);
