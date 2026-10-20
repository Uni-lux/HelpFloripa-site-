// "Outra (escrever)" em cada tipo de negócio: Freelances (área), Delivery (categoria) e Imóveis (tipo do anúncio).
// O texto escrito aparece no perfil/anúncio e vira um filtro próprio na página. Precisa das regras do main.
import { navegador, entrar, BASE, USUARIOS } from "./nav.mjs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
const db = getFirestore(initializeApp({ projectId: "demo-hf" }));
const { browser, ctx } = await navegador({ mobile: true });
const p = await entrar(ctx, "bruno", "negocios.html?tipo=servicos");
await p.waitForSelector("#negAreasBusca", { timeout: 20000 }); await p.waitForTimeout(1200);

// Freelances: marcar "Outra (escrever)" mostra o campo; salvar vazio avisa; escrito grava.
await p.locator("#negExtras .marca-op", { hasText: "Outra (escrever)" }).click(); await p.waitForTimeout(300);
console.log("serv campo:", await p.locator("#negX_categoriaPersonalizada").count(), await p.getAttribute("#negX_categoriaPersonalizada", "placeholder"));
await p.locator("#negX_categoriaPersonalizada").scrollIntoViewIfNeeded();
await p.screenshot({ path: "saida/outra-serv.png" });
await p.click("#negSalvar"); await p.waitForTimeout(800);
console.log("serv vazio:", await p.locator(".toast, #toast").last().textContent().catch(() => "?"));
await p.fill("#negX_categoriaPersonalizada", "  Pianista  ");
await p.click("#negSalvar"); await p.waitForTimeout(2500);
const s = (await db.doc(`negocios/${USUARIOS.bruno}_servicos`).get()).data();
console.log("serv salvo:", JSON.stringify({ categorias: s.categorias, categoriaPersonalizada: s.categoriaPersonalizada }));

// Página de Freelances: filtro próprio "Pianista" e a tag no cartão.
await p.goto(BASE + "servicos.html"); await p.waitForTimeout(4000);
console.log("serv chips:", (await p.locator("#filterChips .chip").allTextContents()).map((t) => t.trim()).join(" | "));
await p.locator("#filterChips .chip", { hasText: "Pianista" }).click(); await p.waitForTimeout(800);
console.log("serv filtrado:", (await p.locator("#vitrine").textContent()).includes("Bruno Reparos"), (await p.locator("#vitrine").textContent()).includes("Pianista"));
await p.screenshot({ path: "saida/outra-serv-pagina.png" });

// Delivery: categoria "Outra (escrever)".
await p.goto(BASE + "negocios.html?tipo=delivery"); await p.waitForSelector("#negX_categoria", { timeout: 20000 }); await p.waitForTimeout(800);
await p.selectOption("#negX_categoria", "outros"); await p.waitForTimeout(300);
console.log("deliv campo:", await p.getAttribute("#negX_categoriaPersonalizada", "placeholder"));
await p.fill("#negNome", "Açaí do Bruno"); await p.fill("#negX_categoriaPersonalizada", "Açaí");
await p.locator("#negX_categoriaPersonalizada").scrollIntoViewIfNeeded();
await p.screenshot({ path: "saida/outra-deliv.png" });
await p.click("#negSalvar"); await p.waitForTimeout(2500);
const d = (await db.doc(`negocios/${USUARIOS.bruno}_delivery`).get()).data();
console.log("deliv salvo:", JSON.stringify({ categoria: d?.categoria, categoriaPersonalizada: d?.categoriaPersonalizada }));
await p.goto(BASE + "delivery.html"); await p.waitForTimeout(4000);
console.log("deliv chips:", (await p.locator("#filterChips .chip").allTextContents()).map((t) => t.trim()).join(" | "));

// Imóveis: tipo "Outro (escrever)" no anúncio.
await p.goto(BASE + "negocios.html?tipo=imoveis"); await p.waitForTimeout(3000);
await p.locator(".neg-anuncio").first().click(); await p.waitForTimeout(1500);
const tipoSel = p.locator("#anCorpo select").nth(1);
console.log("imov campo escondido:", await p.locator("#anCorpo input[placeholder^='Ex.: Chácara']").isHidden());
await tipoSel.selectOption("outros"); await p.waitForTimeout(300);
console.log("imov campo visível:", await p.locator("#anCorpo input[placeholder^='Ex.: Chácara']").isVisible());
await p.fill("#anCorpo input[placeholder^='Ex.: Chácara']", "Chácara");
await p.locator("#anCorpo input[placeholder^='Ex.: Chácara']").scrollIntoViewIfNeeded();
await p.screenshot({ path: "saida/outra-imov.png" });
await p.click("#anSalvar"); await p.waitForTimeout(1500);
await p.locator(".hf-confirma-fundo button", { hasText: "Publicar" }).click().catch(() => {});
await p.waitForTimeout(2500);
const a = (await db.doc("anuncios/an1").get()).data();
console.log("imov salvo:", JSON.stringify({ categoria: a.categoria, categoriaPersonalizada: a.categoriaPersonalizada, titulo: a.titulo }));
await p.goto(BASE + "imoveis.html"); await p.waitForTimeout(4000);
console.log("imov chips:", (await p.locator("#filterChips .chip").allTextContents()).map((t) => t.trim()).join(" | "));
await p.locator("#filterChips .chip", { hasText: "Chácara" }).click(); await p.waitForTimeout(800);
console.log("imov filtrado:", (await p.locator("#vitrine").textContent()).includes("Apto na Trindade"));
await p.screenshot({ path: "saida/outra-imov-pagina.png" });
await browser.close();
process.exit(0);
