// Diário compacto e "Ver publicação" do Flash abrindo a própria publicação (não o perfil).
// - Topo sem o cartão "Diário", sem a caixa de publicar e sem a fileira de filtros: "+" no topo e uma linha fina.
// - Filtro de tipo por ícones; Principais/Amigos no "Principais ▾".
// - Flash com uma publicação: "Ver publicação" abre a tela da publicação aqui mesmo; voltar fecha.
// - feed.html?post=ID abre a publicação; publicação apagada avisa.
// Uso: node t-diario-compacto.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, BASE, garantirImagem } from "./nav.mjs";
import { readFileSync } from "node:fs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const PX = "data:image/png;base64," + readFileSync(garantirImagem("saida/foto-dc.png", 800, 1000)).toString("base64");
await db.doc("diario/dcBruno").set({ autorId: U.bruno, nome: "Bruno Reparos", texto: "Telhado novo entregue hoje", mediaUrl: PX, criadoEm: Timestamp.fromMillis(Date.now() - 3 * 60000) });
await db.doc("diario/dcTexto").set({ autorId: U.bruno, nome: "Bruno Reparos", texto: "Dica: limpe as calhas antes da chuva", criadoEm: Timestamp.fromMillis(Date.now() - 4 * 60000) });
for (const s of (await db.collection("stories").where("autorId", "==", U.ana).get()).docs) await s.ref.delete();
const flash = await db.collection("stories").add({ autorId: U.ana, nome: "Ana", tipo: "imagem", midia: PX, postDe: { postId: "dcBruno", autorId: U.bruno, nome: "Bruno Reparos" }, criadoEm: Timestamp.now() });

const { browser, ctx } = await navegador({ mobile: true });
const p = await entrar(ctx, "ana", "feed.html");
const erros = [];
p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector(".post-card", { timeout: 30000 }); await p.waitForTimeout(1500);

// ---------- 1) topo compacto ----------
ok(await p.locator("#feedIntro, .compor-box, #comporAtalhos").count() === 0, "sem o cartão 'Diário', a caixa de publicar e os atalhos");
const alt = await p.locator("#filtroFeed").evaluate((e) => e.getBoundingClientRect().height);
ok(alt <= 56, "linha do filtro fina: " + Math.round(alt) + " px");
const largura = await p.evaluate(() => document.documentElement.scrollWidth);
ok(largura <= 390, "nada passa da largura da tela: " + largura);
const topoPost = await p.locator(".post-card").first().evaluate((e) => e.getBoundingClientRect().top);
ok(topoPost < 330, "primeira publicação aparece logo: " + Math.round(topoPost) + " px do topo");
await p.screenshot({ path: "saida/dc-topo.png" });
await p.locator("#btnComporFeed").tap(); await p.waitForTimeout(500);
ok(await p.locator("#folhaCompor.aberta, .folha.aberta #pubTexto").count() >= 1, "'+' do topo abre a nova publicação");
await p.locator(".folha.aberta [data-fechar]").first().click().catch(() => {});
await p.waitForTimeout(400);

// ---------- 2) filtro de tipo por ícones ----------
await p.locator('#tiposFeed [data-tipo="textos"]').click(); await p.waitForTimeout(400);
const txt = await p.locator(".post-card").allTextContents();
ok(txt.some((t) => t.includes("limpe as calhas")) && !txt.some((t) => t.includes("Telhado novo")), "ícone Textos mostra só textos");
await p.locator('#tiposFeed [data-tipo="fotos"]').click(); await p.waitForTimeout(400);
const fot = await p.locator(".post-card").allTextContents();
ok(fot.some((t) => t.includes("Telhado novo")) && !fot.some((t) => t.includes("limpe as calhas")), "ícone Fotos mostra só fotos");
await p.screenshot({ path: "saida/dc-filtro.png" });
await p.locator('#tiposFeed [data-tipo="tudo"]').click(); await p.waitForTimeout(300);
await p.locator("#filtroFeedBtn").tap(); await p.waitForTimeout(400);
ok(await p.locator("#opcoesCorpo button", { hasText: "Amigos" }).count() === 1, "'Principais ▾' abre Principais/Amigos");
await p.locator("#opcoesCorpo button", { hasText: "Principais" }).tap(); await p.waitForTimeout(1500);

// ---------- 3) Flash → Ver publicação ----------
await p.goto(BASE + `feed.html?flash=${flash.id}`); await p.waitForTimeout(4000);
const link = p.locator(".story-visor .story-post");
ok(await link.count() === 1, "visor do flash com 'Ver publicação'");
await link.click(); await p.waitForTimeout(2500);
ok(await p.locator(".story-visor").count() === 0, "o visor do flash fecha");
ok(await p.locator(".visor-exp").count() === 1 && (await p.locator(".visor-exp .post-card").first().textContent()).includes("Telhado novo"), "abre a PUBLICAÇÃO (não o perfil)");
ok(/feed\.html/.test(p.url()) && !/usuarios/.test(p.url()), "continua no Diário: " + p.url().replace(BASE, ""));
ok((await p.locator(".visor-exp .ve-tit strong").textContent()) === "Publicação", "topo 'Publicação'");
await p.screenshot({ path: "saida/dc-publicacao.png" });
await p.goBack(); await p.waitForTimeout(800);
ok(await p.locator(".visor-exp").count() === 0 && await p.locator(".post-card").count() > 0, "voltar fecha a publicação e mostra o Diário");

// ---------- 4) link direto ----------
await p.goto(BASE + "feed.html?post=dcTexto"); await p.waitForTimeout(4500);
ok(await p.locator(".visor-exp .post-card").count() >= 1 && (await p.locator(".visor-exp .post-card").first().textContent()).includes("limpe as calhas"), "feed.html?post=ID abre a publicação");
await p.goto(BASE + "feed.html?post=naoExiste"); await p.waitForTimeout(4000);
ok(await p.locator(".visor-exp").count() === 0 && (await p.locator(".toast").allTextContents()).join(" ").includes("não existe"), "publicação apagada avisa");

// ---------- 5) "Preparando..." some quando o criador abre ----------
await p.goto(BASE + "feed.html"); await p.waitForSelector(".post-card", { timeout: 30000 }); await p.waitForTimeout(1500);
const card = p.locator("article", { hasText: "Telhado novo" }).first();
await card.scrollIntoViewIfNeeded();
await card.locator(".acoes-post button", { hasText: "Compartilhar" }).click(); await p.waitForTimeout(500);
await p.locator("#opcoesCorpo button", { hasText: "Adicionar ao seu flash" }).click();
await p.waitForSelector(".flash-criar .flash-repost-selo", { timeout: 15000 }); await p.waitForTimeout(300);
ok(await p.locator(".toast", { hasText: "Preparando" }).count() === 0, "o aviso 'Preparando...' não fica por cima do criador");
await p.screenshot({ path: "saida/dc-criador.png" });

ok(!erros.length, "sem erros na página: " + erros.join(" | ").slice(0, 300));
await db.doc("diario/dcBruno").delete(); await db.doc("diario/dcTexto").delete(); await flash.delete();
await browser.close();
process.exit(process.exitCode || 0);
