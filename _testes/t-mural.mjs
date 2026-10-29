// Mural da Comunidade (mural.html, item Comunidade da barra), formulário de publicar com Diário | Registros, atalhos do
// campo de publicar, Registros em lista corrida e o Mensagens da barra abrindo a página inteira (sem a gaveta).
// Uso: node seed.mjs && node t-mural.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, BASE } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const T = (h) => Timestamp.fromMillis(Date.now() - h * 36e5);
const FOTO = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";
const loc = { cidade: "Florianópolis", uf: "SC", cidadeIbge: 4205407, bairro: "Centro", status: "disponivel" };
const itens = [
  ["mu_doa", { donoId: U.bruno, categoria: "doacao", titulo: "Sofá de 3 lugares", descricao: "Em bom estado, só retirar.", fotos: [FOTO] }],
  ["mu_tro", { donoId: U.bruno, categoria: "troca", titulo: "Troco bicicleta aro 26 por patinete", descricao: "Bicicleta revisada." }],
  ["mu_ped", { donoId: U.dani, categoria: "pedido", titulo: "Preciso de um berço", descricao: "Bebê chega mês que vem." }],
  ["mu_ach", { donoId: U.dani, categoria: "achados", titulo: "Encontrei uma carteira na Beira-Mar", descricao: "Documentos dentro.", achado: { tipo: "encontrado" } }]
];
for (const [i, [id, d]] of itens.entries()) await db.doc(`comunidade/${id}`).set({ ...loc, ...d, criadoEm: T(i + 1), atualizadoEm: T(i + 1) });
await db.doc("diario/mu_texto").set({ autorId: U.bruno, nome: "Bruno", fotoPerfil: "", tags: [], autorUf: "SC", autorIbge: 4205407, texto: "Registro só em texto para a lista", criadoEm: T(1) });

const { browser, ctx } = await navegador({ mobile: true });
const erros = [];
const p = await entrar(ctx, "ana", "mural.html");
p.on("pageerror", (e) => erros.push(String(e)));
await p.waitForSelector(".mu-post", { timeout: 25000 }); await p.waitForTimeout(1200);
const posts = await p.$$eval(".mu-post", (cs) => cs.map((c) => c.textContent));
ok(posts.some((t) => t.includes("Sofá de 3 lugares") && t.includes("está doando") && t.includes("Quero receber")), "mural: publicação de doação com quem doa e o botão Quero receber");
ok(posts.some((t) => t.includes("encontrou") && t.includes("carteira")), "achados: \"encontrou\" quando é encontrado");
ok(await p.locator(".mu-topo h1").textContent() === "Comunidade" && await p.locator(".hero").count() === 0, "sem o painel grande (hero) da comunidade.html");
ok(await p.locator('#barraRede [data-barra=comunidade][aria-current="page"]').count() === 1 && (await p.getAttribute("#barraRede [data-barra=comunidade]", "href")) === "mural.html", "barra: Comunidade abre o mural e fica marcada");
ok((await p.$$eval(".mu-tipo", (as) => as.map((a) => a.getAttribute("href")))).every((h) => /^comunidade\.html\?novo=\w+&volta=mural$/.test(h)), "atalhos de publicar levam ao formulário da Comunidade e voltam ao mural");
await p.locator('.mu-chip[data-k="pedido"]').click(); await p.waitForTimeout(300);
const filtrados = await p.$$eval(".mu-post", (cs) => cs.map((c) => c.dataset.cat));
ok(filtrados.length >= 1 && filtrados.every((k) => k === "pedido"), "filtro por tipo: só os pedidos de ajuda");
await p.locator('.mu-chip[data-k=""]').click();
ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "mural cabe no celular (sem rolar para o lado)");
await p.screenshot({ path: "saida/mural.png", fullPage: true });
await p.locator(".mu-post .mu-acao").first().click();
await p.waitForURL(/comunidade\.html/, { timeout: 15000 });
ok(true, "tocar na ação abre o anúncio na comunidade.html");

// Mensagens da barra: abre a página inteira (não a gaveta por cima).
await p.goto(BASE + "feed.html?aba=registros"); await p.waitForSelector("#barraRede a", { timeout: 20000 });
await p.waitForSelector(".post-card", { timeout: 25000 }); await p.waitForTimeout(1500);
ok(await p.evaluate(() => document.getElementById("listaFeed").classList.contains("registros")), "Registros em lista corrida (#listaFeed.registros)");
ok(await p.locator("#feedIntroTit").textContent() === "Registros" && await p.locator('#comporAtalhos [data-inicio="enquete"]').isVisible() && await p.locator('#comporAtalhos [data-inicio="foto"]').isHidden(), "Registros: topo próprio e atalhos Texto/Enquete/Perguntas");
await p.screenshot({ path: "saida/registros-lista.png" });
await p.locator("#btnComporFeed").click(); await p.waitForTimeout(600);
ok(await p.locator('#pubModo [data-modo="registros"][aria-pressed="true"]').count() === 1 && (await p.locator("#pubEnviar").textContent()).includes("Registros") && await p.locator("#pubFoto").isHidden(), "formulário em Registros: sem foto, \"Publicar em Registros\"");
await p.locator('#pubModo [data-modo="diario"]').click(); await p.waitForTimeout(300);
ok(await p.locator("#pubDestino").isVisible() && (await p.locator("#pubEnviar").textContent()).includes("Registros"), "Diário sem foto: avisa que vai para Registros");
await p.screenshot({ path: "saida/compositor-modo.png" });
await p.keyboard.press("Escape"); await p.waitForTimeout(400);
await p.locator("#abasFeed [data-aba=diario]").click(); await p.waitForTimeout(1200);
ok(await p.locator('#comporAtalhos [data-inicio="foto"]').isVisible() && await p.locator('#comporAtalhos [data-inicio="flash"]').isVisible(), "Diário: atalhos Foto, Flash e Local");
await p.screenshot({ path: "saida/diario-topo.png" });
await p.locator("#barraRede [data-barra=mensagens]").click();
await p.waitForURL(/mensagens\.html/, { timeout: 15000 }).catch(() => {});
ok(/mensagens\.html/.test(p.url()) && await p.locator(".hfc.on, .hfc-gaveta.on").count() === 0, "Mensagens da barra abre a página inteira");
ok(!erros.length, "sem erro nas páginas " + erros.join(" | "));
await browser.close();
for (const [id] of itens) await db.doc(`comunidade/${id}`).delete();
await db.doc("diario/mu_texto").delete();
process.exit();
