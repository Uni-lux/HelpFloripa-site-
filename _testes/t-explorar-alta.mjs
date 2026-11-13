// Explorar (10/11/2026, pedido do dono): Top 20 "Em alta" (hashtags e lugares só das publicações: os flashes não contam), Hall da fama
// (estrelas dos últimos 7 dias, coroa/prata/bronze), página da #hashtag / do lugar dentro do Explorar e busca de lugares.
// Uso: node seed.mjs && node t-explorar-alta.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const foto = (n) => "data:image/jpeg;base64," + readFileSync(`saida/fotos-pub/${n}.jpg`).toString("base64");
const min = (m) => Timestamp.fromMillis(Date.now() - m * 60000);
const LAGOA = { nome: "Lagoa da Conceição, Florianópolis", lat: -27.6012, lng: -48.4703 };
// limpa o que é deste teste
for (const d of (await db.collection("diario").where("tags", "array-contains", "trilhaexp").get()).docs) await d.ref.delete();
const pubs = [
  ["ea1", U.bruno, "Bruno Reparos", ["floripa", "praia", "trilhaexp"], LAGOA, "praia", 20, [9, 44]],
  ["ea2", U.edu, "Edu Lima", ["floripa", "trilhaexp"], LAGOA, "montanha", 50, [6, 28]],
  ["ea3", U.fabi, "Fabi", ["floripa", "praia", "trilhaexp"], null, "ponte", 90, [4, 19]],
  ["ea4", U.gui, "Gui", ["floripa", "comida", "trilhaexp"], { nome: "Mercado Público, Florianópolis", lat: -27.5963, lng: -48.5530 }, "cozinha", 140, [2, 9]],
  ["ea5", U.hele, "Helê", ["praia", "trilhaexp"], LAGOA, "praia", 200, [1, 5]],
];
for (const [id, autor, nome, tags, local, f, m, [total, soma]] of pubs) {
  await db.doc(`diario/${id}`).set({ autorId: autor, nome, tipo: "foto", texto: `Dia lindo! ${tags.map((t) => "#" + t).join(" ")}`, tags, ...(local ? { local } : {}), mediaUrl: foto(f), mediaTipo: "image", criadoEm: min(m) });
  await db.doc(`diario_notas/${id}`).set({ total, soma, n1: 0, n2: 0, n3: 0, n4: 0, n5: total });
}
// flash de quem a Ana segue com # e lugar nas figurinhas
await db.doc(`relacoes/${U.ana}_${U.bruno}`).set({ tipo: "seguir", seguidorId: U.ana, alvoId: U.bruno, criadoEm: min(999) });
for (const d of (await db.collection("stories").where("autorId", "==", U.bruno).get()).docs) await d.ref.delete();
await db.doc("stories/eaFlash").set({ restrito: false, autorId: U.bruno, nome: "Bruno", tipo: "foto", midia: foto("praia"), perfil: true, criadoEm: min(15),
  toques: ["h|festivalexp|0.5|0.3|0.3|0.06", `l|${LAGOA.nome}|${LAGOA.lat}|${LAGOA.lng}|0.5|0.6|0.4|0.06`] });

const A = await navegador({ mobile: true });
await A.ctx.addInitScript(() => { try { localStorage.setItem("hf-busca-local", JSON.stringify({ uf: "SC", cidade: "Florianópolis", cidadeIbge: 4205407 })); localStorage.setItem("hf-local-manual", "1"); } catch {} });
const p = await entrar(A.ctx, "ana", "feed.html?aba=explorar");
if (process.env.CLARO !== "1") await p.emulateMedia({ colorScheme: "dark" });
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector("#secAlta:not([hidden]) .alta-item", { timeout: 30000 });
await p.waitForTimeout(2500);
const itens = await p.locator("#exploraTags .alta-item strong").allTextContents();
ok(itens[0] === "#trilhaexp" && itens.slice(0, 3).includes("#floripa"), "mais usadas em cima: " + itens.slice(0, 5).join(", "));
ok(itens.includes("Lagoa da Conceição"), "lugar da publicação entra no Em alta");
ok(await p.locator("#exploraTags .alta-item.top1").count() === 1 && await p.locator("#exploraTags .alta-item.top3").count() === 1, "top 3 destacados (ouro, prata, bronze)");
// flash: a #festivalexp só existe no flash
await p.locator("#exploraTags .alta-mais").click().catch(() => {});
await p.waitForTimeout(300);
ok(!(await p.locator("#exploraTags .alta-item strong").allTextContents()).includes("#festivalexp"), "hashtag só das figurinhas do flash NÃO conta no Em alta");
const lagoaMeta = await p.locator("#exploraTags .alta-item", { hasText: "Lagoa da Conceição" }).locator("small").textContent();
ok(/3 publicações/.test(lagoaMeta) && !/flash/.test(lagoaMeta), "lugar conta só as publicações: " + lagoaMeta);
await p.locator('#exploraTags .alta-tipos button[aria-label="Lugares"]').click(); await p.waitForTimeout(200);
ok((await p.locator("#exploraTags .alta-item .alta-ic.tag").count()) === 0, "aba Lugares só com lugares");
await p.locator('#exploraTags .alta-tipos button[aria-label="Tudo"]').click(); await p.waitForTimeout(200);
// Filtro Brasil / estado / cidade e setas de posição (10/11/2026)
const esc = await p.locator("#exploraTags .esc-seg button").allTextContents();
ok(esc[0] === "Brasil" && esc.length >= 2, "filtro compacto Brasil / estado / cidade: " + esc.join(" · "));
ok((await p.locator("#exploraTags .alta-item .alta-mov").count()) > 0, "cada assunto mostra quanto subiu ou caiu");
ok(await p.locator("#exploraTags .alta-est").first().evaluate((e) => getComputedStyle(e).color) === "rgb(245, 183, 0)", "estrelas em dourado");
await p.locator("#exploraTags .esc-seg button").nth(1).click(); await p.waitForTimeout(300);
ok(await p.locator("#exploraTags .esc-seg button").nth(1).getAttribute("aria-selected") === "true", "troca para o estado");
await p.locator("#exploraTags .esc-seg button").first().click(); await p.waitForTimeout(300);
await p.locator("#secAlta").scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
await p.screenshot({ path: "saida/ea-01-em-alta.png" });
// Hall da fama
await p.waitForSelector("#secHall:not([hidden]) .hall-lider", { timeout: 15000 });
const primeiro = await p.locator(".hall-lider .hl-quem strong").textContent();
ok(/Bruno/.test(primeiro) && await p.locator(".hall-lider .hl-coroa").count() === 1 && await p.locator(".hall-lider .hl-num").count() === 4, "1º do Hall da fama no cartão do líder, com coroa e números: " + primeiro);
ok(await p.locator(".hall-linha.p2").count() === 1 && await p.locator(".hall-linha.p3").count() === 1 && await p.locator(".hall-linha .hall-barra i").count() >= 2, "2º e 3º em linhas com barra");
await p.locator("#secHall").scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
await p.screenshot({ path: "saida/ea-02-hall.png" });
// página da hashtag
await p.locator("#exploraTags .alta-item", { hasText: "#floripa" }).click();
await p.waitForSelector(".topico.tag .exp-tile", { timeout: 15000 }); await p.waitForTimeout(500);
ok((await p.locator(".topico .tp-tx h1").textContent()) === "#floripa" && /publicaç/.test(await p.locator(".topico .tp-n").textContent()), "página da #hashtag no Explorar");
ok(/^[123]º em alta/.test(await p.locator(".topico .tp-alta").textContent()), "selo da posição no Em alta: " + await p.locator(".topico .tp-alta").textContent());
ok(new URL(p.url()).searchParams.get("tag") === "floripa", "link da página: feed.html?tag=floripa");
ok(await p.locator(".topico .tp-chip").count() >= 1, "hashtags relacionadas");
await p.screenshot({ path: "saida/ea-03-hashtag.png" });
await p.goBack(); await p.waitForTimeout(400);
ok(await p.locator(".topico").count() === 0 && await p.locator("#painelExplorar:not([hidden])").count() === 1, "voltar fecha a página e fica no Explorar");
// página do lugar (com o flash de agora)
await p.locator("#exploraTags .alta-item", { hasText: "Lagoa da Conceição" }).click();
await p.waitForSelector(".topico.lugar .exp-tile", { timeout: 15000 }); await p.waitForTimeout(800);
ok(await p.locator(".topico .tp-flash").count() === 1, "lugar mostra quem está nos flashes agora");
ok(await p.locator(".topico .lg-mapa").count() === 1 && await p.locator(".topico .tp-bt", { hasText: "Como chegar" }).count() === 1, "mapa e Como chegar");
await p.screenshot({ path: "saida/ea-04-lugar.png" });
await p.locator(".topico .tp-abas button", { hasText: "Recentes" }).click(); await p.waitForTimeout(200);
await p.locator(".topico .tp-voltar, .topico .tp-topo .icone-btn").first().click(); await p.waitForTimeout(400);
// link antigo do Diário abre no Explorar
await p.goto("http://127.0.0.1:5057/feed.html?tag=praia");
await p.waitForSelector(".topico.tag .exp-tile", { timeout: 25000 });
ok(await p.locator("#painelExplorar:not([hidden])").count() === 1 && (await p.locator(".topico .tp-tx h1").textContent()) === "#praia", "feed.html?tag= abre a página no Explorar (não no Diário)");
// hashtag tocada numa publicação abre a página sem recarregar
await p.goBack(); await p.waitForTimeout(500);
// busca de lugares
await p.locator("#buscaPessoas").fill("lagoa"); await p.waitForTimeout(2000);
ok(await p.locator("#listaPessoas .linha-tag.lugar").count() >= 1, "a busca acha lugares");
await p.screenshot({ path: "saida/ea-05-busca-lugar.png" });
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close(); process.exit();
