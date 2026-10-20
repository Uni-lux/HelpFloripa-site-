// Chat: o clipe abre a gaveta "Anexar" (galeria, câmera, localização, endereço, fazer pedido e o cartão do
// meu negócio); voltar fecha; galeria abre o seletor de arquivos; o cartão do negócio fica pronto para enviar.
// Uso: node t-anexar.mjs
import { navegador, entrar, garantirImagem, USUARIOS as U } from "./nav.mjs";
import { readFileSync } from "node:fs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
const db = getFirestore(initializeApp({ projectId: "demo-hf" }));
const ok = (c, m) => console.log(c ? "  ✔" : "  ✘", m);
const conv = [U.ana, U.bruno].sort().join("_");
await db.doc(`usuarios/${U.bruno}`).set({ endereco: { rua: "Rua das Flores", numero: "120", bairro: "Trindade", cidade: "Florianópolis", uf: "SC", cep: "88036000" } }, { merge: true });
const { browser, ctx } = await navegador({ mobile: true });
await ctx.addInitScript(() => { try { localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" })); } catch {} });
// Sem internet aqui: azulejos do mapa e o nome da rua chegam de mentira (o site real usa o OpenStreetMap).
const azulejo = readFileSync(garantirImagem("saida/azulejo.png", 256, 256));
await ctx.route(/tile\.openstreetmap\.org/, (r) => r.fulfill({ body: azulejo, contentType: "image/png" }));
await ctx.route(/nominatim\.openstreetmap\.org\/reverse/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ address: { road: "Rua Lauro Linhares", house_number: "589", suburb: "Trindade", city: "Florianópolis" } }) }));
await ctx.route(/nominatim\.openstreetmap\.org\/search/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify([{ lat: "-27.5880", lon: "-48.5230" }]) }));
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
await p.locator(".ax-op", { hasText: "Localização" }).click(); await p.waitForTimeout(2500);
ok(await p.locator(".pv-fundo .lc-previa .lc-mapa img").count() > 0, "localização: prévia com mapa antes de enviar");
await p.screenshot({ path: "saida/local-previa.png" });
await p.locator(".pv-fundo .pv-btn.pri", { hasText: "Enviar localização" }).click(); await p.waitForTimeout(2500);
const ultima = async () => (await db.collection(`conversas/${conv}/mensagens`).orderBy("criadoEm", "desc").limit(1).get()).docs[0]?.data();
const ml = await ultima();
ok(ml?.cartao?.tipo === "local" && ml.cartao.lat === -27.5954 && ml.cartao.lng === -48.548 && ml.cartao.endereco === "Rua Lauro Linhares, 589 · Trindade · Florianópolis", "localização enviada como cartão (lat/lng e o nome da rua)");
ok(await p.locator(".bolha.local-msg").last().locator(".lc-acoes a", { hasText: "Como chegar" }).count() === 1, "cartão com mapa, Como chegar e Copiar no chat");
ok((await p.inputValue("#texto")) === "", "o campo de texto continua vazio (nada de link solto)");
await p.locator(".bolha.local-msg").last().scrollIntoViewIfNeeded(); await p.screenshot({ path: "saida/local-chat.png" });
await p.click("#btnAnexar"); await p.waitForTimeout(800);
await p.locator(".ax-op", { hasText: "Endereço" }).click(); await p.waitForTimeout(2500);
await p.locator(".pv-fundo .pv-btn.pri", { hasText: "Enviar endereço" }).click(); await p.waitForTimeout(2500);
const me = await ultima();
ok(me?.cartao?.tipo === "endereco" && me.cartao.endereco.includes("Rua das Flores, 120") && me.cartao.lat === -27.588, "endereço enviado como cartão com o ponto no mapa: " + me?.cartao?.endereco);
await p.locator(".bolha.local-msg").last().scrollIntoViewIfNeeded(); await p.screenshot({ path: "saida/endereco-chat.png" });
// mensagem antiga (texto com o link) vira cartão
await db.collection(`conversas/${conv}/mensagens`).add({ remetenteId: U.ana, texto: "📍 Minha localização: https://maps.google.com/?q=-27.686414,-48.551602", criadoEm: new Date() });
await p.waitForTimeout(2500);
ok(await p.locator(".bolha.local-msg").count() >= 3, "localização antiga (texto) aparece como cartão");
// teclado aberto: o campo continua à vista
await p.click("#texto"); await p.fill("#texto", "linha 1\nlinha 2\nlinha 3\nlinha 4\nlinha 5");
await p.setViewportSize({ width: 390, height: 430 }); await p.waitForTimeout(800);
const caixa = await p.locator("#texto").boundingBox();
ok(caixa && caixa.y + caixa.height <= 430 && caixa.y > 0, `com o teclado aberto o campo fica à vista (fim em ${Math.round(caixa?.y + caixa?.height)} de 430)`);
await p.screenshot({ path: "saida/teclado-aberto.png" });
await p.setViewportSize({ width: 390, height: 844 }); await p.fill("#texto", "");
await p.click("#btnAnexar"); await p.waitForTimeout(1200);
await p.locator(".ax-op", { hasText: "Bruno Reparos" }).click(); await p.waitForTimeout(1500);
ok(!(await p.locator("#barraCartao").isHidden()) && (await p.textContent("#cartaoTitulo")).includes("Bruno Reparos"), "cartão do meu negócio pronto para enviar");
await p.screenshot({ path: "saida/anexar-cartao.png" });
await browser.close();
process.exit(0);
