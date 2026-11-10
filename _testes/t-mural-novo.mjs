// Mural da Comunidade refeito (10/11/2026, pedido do dono): topo com busca e números reais, publicar em cartões, regra
// com "Como funciona", Perto de você, filtros com todos os tipos, ordenar e estado vazio que ajuda.
// Uso: node seed.mjs && node t-mural-novo.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const T = (h) => Timestamp.fromMillis(Date.now() - h * 36e5);
const foto = (n) => "data:image/jpeg;base64," + readFileSync(`saida/fotos-pub/${n}.jpg`).toString("base64");
const loc = { cidade: "Florianópolis", uf: "SC", cidadeIbge: 4205407, status: "disponivel" };
const itens = [
  ["mn_doa", { donoId: U.bruno, categoria: "doacao", bairro: "Trindade", titulo: "Sofá de 3 lugares", descricao: "Em ótimo estado, só retirar no fim de semana.", fotos: [foto("cozinha")], geo: { lat: -27.585, lng: -48.522 } }],
  ["mn_ped", { donoId: U.dani, categoria: "pedido", bairro: "Centro", titulo: "Preciso de um berço", descricao: "Nosso bebê chega mês que vem. Qualquer ajuda é bem-vinda!", geo: { lat: -27.596, lng: -48.548 } }],
  ["mn_tro", { donoId: U.edu, categoria: "troca", bairro: "Lagoa", titulo: "Troco bicicleta aro 26 por patinete", descricao: "Bicicleta revisada.", fotos: [foto("montanha")], geo: { lat: -27.6, lng: -48.47 } }],
  ["mn_qua", { donoId: U.fabi, categoria: "quarto", bairro: "Itacorubi", titulo: "Quarto para dividir perto da UFSC", descricao: "Apartamento tranquilo.", quarto: { rateio: 650 }, fotos: [foto("ponte")], geo: { lat: -27.58, lng: -48.5 } }],
  ["mn_ach", { donoId: U.gui, categoria: "achados", bairro: "Beira-Mar", titulo: "Encontrei uma carteira na Beira-Mar", descricao: "Com documentos.", achado: { tipo: "encontrado" }, geo: { lat: -27.59, lng: -48.54 } }]
];
for (const [i, [id, d]] of itens.entries()) await db.doc(`comunidade/${id}`).set({ ...loc, ...d, criadoEm: T(i * 3 + 1), atualizadoEm: T(i * 3 + 1) });

const { browser, ctx } = await navegador({ mobile: true });
await ctx.grantPermissions(["geolocation"]); await ctx.setGeolocation({ latitude: -27.5954, longitude: -48.548 });
const p = await entrar(ctx, "ana", "mural.html");
if (process.env.CLARO !== "1") await p.emulateMedia({ colorScheme: "dark" });
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector(".mu-post", { timeout: 25000 }); await p.waitForTimeout(1500);
ok(await p.locator("#muNumeros, .mu-tipo, .mu-topo").count() === 0, "topo enxuto (sem números, cartões nem painel)");
ok(await p.locator('.mu-chip[data-k]').count() === 6, "filtros com todos os tipos (Tudo + 5)");
await p.screenshot({ path: "saida/mn-01-topo.png" });
ok(await p.locator(".mu-aviso a[href='diretrizes.html']").count() === 1, "regra numa linha com o link das Regras");
// busca
await p.locator("#muBusca").fill("berço"); await p.waitForTimeout(500);
const achados = await p.$$eval(".mu-post", (cs) => cs.map((c) => c.dataset.id));
ok(achados.length >= 1 && achados.every((id) => id === "mn_ped" || !id.startsWith("mn_")), "busca acha o berço (" + achados.join(",") + ")");
await p.locator("#muBusca").fill("xyzabc"); await p.waitForTimeout(600);
ok(await p.locator(".mu-vazio", { hasText: "Nada com" }).count() === 1, "busca sem resultado: ajuda (limpar ou pedir)");
await p.locator(".mu-vazio button", { hasText: "Limpar a busca" }).click(); await p.waitForTimeout(300);
// filtro + ordem
await p.locator('.mu-chip[data-k="quarto"]').click(); await p.waitForTimeout(300);
ok((await p.$$eval(".mu-post", (cs) => cs.map((c) => c.dataset.cat))).every((k) => k === "quarto"), "filtro de quartos");
await p.locator('.mu-chip[data-k=""]').click(); await p.waitForTimeout(300);
const temOrdem = await p.locator(".mu-chip.mu-ordem").count();
if (temOrdem) {
  await p.locator(".mu-chip.mu-ordem").click(); await p.waitForTimeout(300);
  ok((await p.locator(".mu-post").first().getAttribute("data-id")) === "mn_ped", "Mais perto: o do Centro primeiro");
  ok(await p.locator("#muPertoSec:not([hidden]) .mu-bolha").count() >= 3, "Perto de você em bolinhas");
} else ok(false, "com a posição, aparece o Mais perto");
ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "cabe no celular sem rolar para o lado");
await p.locator("#muPertoSec").scrollIntoViewIfNeeded().catch(() => {}); await p.waitForTimeout(300);
await p.screenshot({ path: "saida/mn-02-perto.png" });
await p.locator(".mu-post").first().scrollIntoViewIfNeeded(); await p.evaluate(() => scrollBy(0, -60)); await p.waitForTimeout(300);
await p.screenshot({ path: "saida/mn-03-posts.png" });
// vazio inteligente
for (const [id] of itens) await db.doc(`comunidade/${id}`).delete();
// sem nenhuma publicação (como no site hoje): apaga as do seed (o seed.mjs recria)
for (const d of (await db.collection("comunidade").get()).docs) await d.ref.delete();
const B = await navegador({ mobile: true }); // aparelho sem cópia guardada
const p2 = await entrar(B.ctx, "ana", "mural.html");
if (process.env.CLARO !== "1") await p2.emulateMedia({ colorScheme: "dark" });
await p2.waitForSelector(".mu-vazio", { timeout: 25000 }); await p2.waitForTimeout(500);
ok(await p2.locator(".mu-vazio .mu-vazio-tipo").count() === 3, "vazio com atalhos Doar · Pedir · Trocar");
await p2.locator(".mu-vazio").scrollIntoViewIfNeeded(); await p2.screenshot({ path: "saida/mn-04-vazio.png" });
await B.browser.close();
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await browser.close(); process.exit();
