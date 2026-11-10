// Emojis e figurinhas no Mensagens (09/11/2026, pedido do dono): painel no lugar do teclado, recentes, busca em
// português, apagar; figurinha do pacote enviada sem balão (WebP), a outra pessoa guarda nas dela; criar uma
// figurinha de uma foto (editor) e importar um .webp 512×512 do WhatsApp; texto só com emojis fica grande.
// Uso: node seed.mjs && node t-emojis-figurinhas.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const esperar = async (fn, ms = 12000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn().catch(() => false)) return true; await new Promise((r) => setTimeout(r, 200)); } return false; };
mkdirSync("saida", { recursive: true });
// imagens de teste: foto comum (jpg 800×600) e figurinha do WhatsApp (webp 512×512)
execFileSync("python3", ["-c", `
from PIL import Image, ImageDraw
im = Image.new("RGB", (800, 600), (30, 120, 200)); d = ImageDraw.Draw(im); d.ellipse((250, 150, 550, 450), fill=(255, 200, 0)); im.save("saida/foto-fig.jpg")
st = Image.new("RGBA", (512, 512), (0, 0, 0, 0)); d = ImageDraw.Draw(st); d.rounded_rectangle((60, 60, 452, 452), 80, fill=(229, 72, 127)); st.save("saida/zap.webp", "WEBP")
`]);

const A = await navegador({ mobile: true }), B = await navegador({ mobile: true });
const ana = await entrar(A.ctx, "ana", `mensagens.html?conversa=${U.conv}`);
const bru = await entrar(B.ctx, "bruno", `mensagens.html?conversa=${U.conv}`);
await ana.waitForSelector("#btnEmoji", { timeout: 20000 }); await bru.waitForSelector("#btnEmoji", { timeout: 20000 });
await ana.waitForTimeout(1500);

// 1) Painel de emojis
await ana.click("#btnEmoji");
ok(await ana.locator("#painelEmoji").isVisible(), "o botão abre o painel de emojis");
ok(await ana.locator(".pe-grade button").count() > 500 && await ana.locator("#peCats button").count() >= 8, "categorias completas (" + await ana.locator(".pe-grade button").count() + " emojis)");
await ana.locator(".pe-grade button", { hasText: "😂" }).first().click();
await ana.locator(".pe-grade button", { hasText: "🔥" }).first().click();
ok((await ana.inputValue("#texto")) === "😂🔥", "tocar põe o emoji no campo (sem abrir o teclado)");
await ana.click("#peApagar");
ok((await ana.inputValue("#texto")) === "😂", "⌫ apaga o último emoji inteiro");
await ana.fill("#peBusca", "festa");
const achados = (await ana.locator(".pe-grade button").allTextContents()).join("");
ok(/🥳/.test(achados) && /🎉/.test(achados), "busca em português: festa → " + achados.slice(0, 12));
await ana.fill("#peBusca", "");
ok(await ana.locator('.pe-sec[data-sec="recentes"]').count() === 1, "seção Recentes com os usados");
await ana.screenshot({ path: "saida/emojis.png" });
await ana.click("#btnEnviar");
ok(await esperar(async () => (await bru.locator(".bolha.so-emoji").count()) >= 1), "mensagem só com emoji aparece grande (sem balão) para o Bruno");

// 2) Figurinhas: pacote
await ana.click('[data-pe="figurinhas"]');
ok(await esperar(async () => (await ana.locator('.pe-sec[data-sec="helpfloripa"] + .pe-figs .pe-fig').count()) === 16), "pacote da Help Floripa com 16 figurinhas");
await ana.screenshot({ path: "saida/figurinhas-painel.png" });
await ana.locator('.pe-sec[data-sec="helpfloripa"] + .pe-figs .pe-fig').nth(2).click();
ok(await esperar(async () => (await bru.locator(".bolha.figurinha-msg img.figurinha").count()) >= 1), "Bruno recebe a figurinha sem balão");
const msg = (await db.collection(`conversas/${U.conv}/mensagens`).orderBy("criadoEm", "desc").limit(1).get()).docs[0].data();
ok(msg.tipoArquivo === "imagem" && msg.nomeArquivo === "figurinha.webp" && /^data:image\/webp;base64,/.test(msg.arquivoUrl) && msg.arquivoUrl.length < 140000, "vai como WebP dentro da mensagem (sem regra nova), " + Math.round(msg.arquivoUrl.length * 0.75 / 1024) + " KB");
ok(await esperar(async () => (await ana.locator('.pe-sec[data-sec="recentes"]').count()) === 1), "a enviada aparece em Recentes");
const prev = await bru.evaluate(() => document.querySelector(".hfc, .chat-topo") ? 1 : 1);
await bru.waitForTimeout(500);
await bru.screenshot({ path: "saida/figurinha-chat.png" });

// Bruno guarda a figurinha recebida
await bru.locator(".bolha.figurinha-msg img.figurinha").last().click();
await bru.waitForSelector(".fgv .pv-btn.pri", { timeout: 5000 });
await bru.click(".fgv .pv-btn.pri");
await bru.waitForTimeout(600);
await bru.click("#btnEmoji"); await bru.click('[data-pe="figurinhas"]');
ok(await esperar(async () => (await bru.locator('.pe-sec[data-sec="minhas"] + .pe-figs .pe-fig').count()) === 1), "Bruno guardou nas figurinhas dele");

// 3) Criar de uma foto (editor) e importar .webp do WhatsApp
await ana.setInputFiles("#inputFigurinha", "saida/foto-fig.jpg");
ok(await esperar(async () => await ana.locator(".fg-ed").isVisible(), 5000), "foto abre o editor de figurinha");
await ana.locator(".fg-op", { hasText: "Redonda" }).click();
await ana.locator(".fg-ferr button", { hasText: "Texto" }).click();
await ana.locator(".fg-op", { hasText: "Adicionar texto" }).click();
await ana.fill("input.fg-texto", "Bom dia!");
await ana.screenshot({ path: "saida/figurinha-editor.png" });
await ana.click(".fg-topo .ok");
ok(await esperar(async () => (await ana.locator('.pe-sec[data-sec="minhas"] + .pe-figs .pe-fig').count()) === 1), "figurinha criada vai para Suas figurinhas");
const criada = await ana.evaluate(() => document.querySelector('.pe-sec[data-sec="minhas"] + .pe-figs .pe-fig img').src);
const dim = await ana.evaluate((u) => new Promise((r) => { const i = new Image(); i.onload = () => r([i.naturalWidth, i.naturalHeight]); i.src = u; }), criada);
ok(/^data:image\/webp/.test(criada) && dim[0] === 512 && dim[1] === 512 && criada.length * 0.75 <= 100000, `WebP 512×512 até 100 KB (${dim.join("×")}, ${Math.round(criada.length * 0.75 / 1024)} KB)`);
await ana.setInputFiles("#inputFigurinha", "saida/zap.webp");
ok(await esperar(async () => (await ana.locator('.pe-sec[data-sec="minhas"] + .pe-figs .pe-fig').count()) === 2) && await ana.locator(".fg-ed").count() === 0, "WebP 512×512 do WhatsApp entra direto, sem editor");
// segurar = menu (favoritar)
const t = ana.locator('.pe-sec[data-sec="minhas"] + .pe-figs .pe-fig').first();
await t.dispatchEvent("contextmenu");
await ana.waitForSelector(".pe-menu", { timeout: 3000 });
await ana.locator(".pe-menu button", { hasText: "Adicionar às favoritas" }).click();
ok(await esperar(async () => (await ana.locator('.pe-sec[data-sec="favoritas"]').count()) === 1), "segurar → Favoritar cria a seção Favoritas");
// voltar fecha o painel
await ana.goBack().catch(() => {}); await ana.waitForTimeout(600);
ok(await ana.locator("#painelEmoji").isHidden() && await ana.locator("#btnLigar").isVisible(), "voltar do celular fecha só o painel (a conversa continua)");
ok(await ana.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "sem rolagem para o lado");

await A.browser.close(); await B.browser.close();
process.exit();
