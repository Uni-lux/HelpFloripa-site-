// Flash, parte 3 dos prints de 02/11/2026:
// - Visualizações como a atividade do Instagram: barra com o número + Destacar + lixeira, abas Visualizações | Enquete |
//   Respostas; segurar a miniatura não abre o menu do navegador; "Ver votos"/"respostas · ver" abrem a aba certa
// - "Também em N negócios" numa linha e tocável (lista com o link de cada negócio)
// - lugar e hashtag abrem folha com mapa / publicações; @ escrito no texto vira área tocável
// - aviso (toast) do criador embaixo, sem cobrir os botões
// Uso: node t-flash-atividade.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, garantirImagem } from "./nav.mjs";
import { readFileSync } from "node:fs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const PX = "data:image/png;base64," + readFileSync(garantirImagem("saida/foto-fa.png", 900, 1600)).toString("base64");
for (const u of [U.ana, U.bruno]) for (const s of (await db.collection("stories").where("autorId", "==", u).get()).docs) await s.ref.delete();
await db.doc(`usuarios/${U.ana}`).set({ flashConfig: { amigos: [U.bruno] } }, { merge: true });
await db.doc(`relacoes/${U.bruno}_${U.ana}`).set({ tipo: "seguir", seguidorId: U.bruno, alvoId: U.ana, criadoEm: Timestamp.now() });
await db.doc(`negocios/${U.ana}_servicos`).set({ donoId: U.ana, tipo: "servicos", nome: "Ana Faxinas", criadoEm: Timestamp.now() }, { merge: true });
await db.doc(`negocios/${U.ana}_delivery`).set({ donoId: U.ana, tipo: "delivery", nome: "Ana Lanches", criadoEm: Timestamp.now() }, { merge: true });
await db.doc("diario/faPerto").set({ autorId: U.bruno, nome: "Bruno Reparos", texto: "Pôr do sol na Lagoa #praia", tags: ["praia"], mediaUrl: PX, local: { nome: "Lagoa da Conceição", lat: -27.6, lng: -48.47 }, criadoEm: Timestamp.now() });
const fim = Timestamp.fromMillis(Date.now() + 20 * 3600e3);
const f1 = (await db.collection("stories").add({ autorId: U.ana, nome: "Ana Souza", tipo: "imagem", midia: PX, criadoEm: Timestamp.fromMillis(Date.now() - 20 * 60000) })).id;
const f2 = (await db.collection("stories").add({ autorId: U.ana, nome: "Ana Souza", tipo: "imagem", midia: PX, negocios: [`${U.ana}_servicos`, `${U.ana}_delivery`],
  enquete: { pergunta: "Praia ou piscina?", opcoes: ["Praia", "Piscina"], x: 0.5, y: 0.7, fimEm: fim, cor: "roxo" }, caixa: { pergunta: "Me pergunte", anonima: false, x: 0.5, y: 0.3 },
  toques: ["l|Lagoa da Conceição, Florianópolis|-27.6|-48.47|0.5|0.12|0.5|0.05", "h|praia|0.5|0.2|0.3|0.05"], criadoEm: Timestamp.fromMillis(Date.now() - 10 * 60000) })).id;
await db.doc(`enquete_votos/f_${f2}_${U.bruno}`).set({ alvo: `f_${f2}`, tipo: "f", itemId: f2, uid: U.bruno, opcao: 0, fatia: 3, fimEm: fim, criadoEm: Timestamp.now() });
await db.doc(`enquete_contas/f_${f2}_3`).set({ n0: 1 });
await db.collection("caixa_respostas").add({ alvo: `f_${f2}`, tipo: "f", itemId: f2, autorId: U.ana, uid: U.bruno, nome: "Bruno Reparos", texto: "Qual seu lanche favorito?", anonima: false, criadoEm: Timestamp.now() });
await db.doc(`stories/${f2}/vistos/${U.bruno}`).set({ criadoEm: Timestamp.now() });

const { browser, ctx } = await navegador({ mobile: true });
const p = await entrar(ctx, "ana", `feed.html?flash=${f2}`);
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector(".story-visor", { timeout: 15000 }).catch(() => {});
await p.waitForTimeout(1500);

// ---------- 1) atividade do flash ----------
await p.locator(".story-vistos").click(); await p.waitForTimeout(1500);
ok(await p.locator("#folhaLista .vv-barra .vv-barra-btn").count() === 2, "Visualizações: barra com Destacar e lixeira");
ok(await p.locator("#folhaLista .vv-aba").count() === 3, "abas Visualizações | Enquete | Respostas");
const menu = await p.evaluate(() => { const im = document.querySelector("#folhaLista .vv-mini img"); if (!im) return null; const e = new MouseEvent("contextmenu", { bubbles: true, cancelable: true }); im.dispatchEvent(e); return e.defaultPrevented; });
ok(menu === true, "segurar a miniatura não abre o menu de baixar");
await p.locator("#folhaLista .vv-aba", { hasText: "Enquete" }).click(); await p.waitForTimeout(1500);
ok(await p.locator("#folhaLista .vv-enq-op").count() === 2 && (await p.locator("#folhaLista .vv-enq-op").first().textContent()).includes("Bruno"), "aba Enquete: opções com % e quem votou");
await p.screenshot({ path: "saida/fa-enquete.png" });
await p.locator("#folhaLista .vv-aba", { hasText: "Respostas" }).click(); await p.waitForTimeout(1500);
ok(await p.locator("#folhaLista .vv-resp").count() === 1, "aba Respostas: a resposta em cartão");
await p.locator("#folhaLista .vv-resp").click(); await p.waitForTimeout(200);
ok(await p.locator("#folhaLista .vv-resp-acoes .vv-acao").count() === 3, "tocar na resposta: Pôr no flash, Ver perfil, Apagar");
await p.screenshot({ path: "saida/fa-respostas.png" });
await p.locator("#folhaLista [data-fechar]").first().click(); await p.waitForTimeout(600);
// "respostas · ver" no próprio flash abre a atividade na aba Respostas
await p.locator(".story-cx .cx-ver").click(); await p.waitForTimeout(1500);
ok(await p.locator("#folhaLista .vv-aba.on", { hasText: "Respostas" }).count() === 1, "“respostas · ver” abre a atividade na aba Respostas");
// lixeira apaga o flash da enquete
await p.locator("#folhaLista .vv-aba", { hasText: "Visualizações" }).click(); await p.waitForTimeout(600);
await p.locator("#folhaLista .vv-barra-btn.perigo").click(); await p.waitForTimeout(300);
await p.locator(".hf-confirma-fundo button", { hasText: "Apagar" }).last().click(); await p.waitForTimeout(1500);
ok(!(await db.doc(`stories/${f2}`).get()).exists, "lixeira das Visualizações apaga o flash");
await p.keyboard.press("Escape"); await p.waitForTimeout(300);

// ---------- 2) Bruno vê: negócios, lugar e hashtag ----------
const f3 = (await db.collection("stories").add({ autorId: U.ana, nome: "Ana Souza", tipo: "imagem", midia: PX, negocios: [`${U.ana}_servicos`, `${U.ana}_delivery`],
  toques: ["l|Lagoa da Conceição, Florianópolis|-27.6|-48.47|0.5|0.3|0.5|0.06", "h|praia|0.5|0.5|0.3|0.06"], criadoEm: Timestamp.now() })).id;
const nb = await navegador({ mobile: true });
await nb.ctx.route("https://tile.openstreetmap.org/**", (r) => r.fulfill({ body: readFileSync("saida/foto-fa.png"), contentType: "image/png" }));
const b = await entrar(nb.ctx, "bruno", `feed.html?flash=${f3}`);
await b.waitForSelector(".story-visor", { timeout: 15000 }).catch(() => {});
await b.waitForTimeout(1500);
const onde = await b.locator(".story-onde").boundingBox();
ok(onde && onde.height < 34, `“Também em 2 negócios” numa linha só (${Math.round(onde?.height)} px)`);
await b.locator(".story-onde").click(); await b.waitForTimeout(1500);
ok(await b.locator("#folhaLista .linha-neg-flash").count() === 2 && /negocio=/.test(await b.locator("#folhaLista .linha-neg-flash").first().getAttribute("href")), "tocar mostra os 2 negócios com o link do perfil");
await b.locator("#folhaLista [data-fechar]").first().click(); await b.waitForTimeout(500);
await b.locator(".story-fig-toque").first().click(); await b.waitForTimeout(300);
await b.locator(".story-fig-balao:not([hidden])").click(); await b.waitForTimeout(2000);
ok(await b.locator("#folhaLista .lg-mapa").count() === 1 && await b.locator("#folhaLista .lg-cel").count() >= 1, "lugar: folha com mapa e as publicações de lá");
await b.screenshot({ path: "saida/fa-lugar.png" });
await b.locator("#folhaLista [data-fechar]").first().click(); await b.waitForTimeout(500);
await b.locator(".story-fig-toque").nth(1).click(); await b.waitForTimeout(300);
await b.locator(".story-fig-balao:not([hidden])").click(); await b.waitForTimeout(2000);
ok((await b.locator("#folhaLista .lg-tx strong").textContent()) === "#praia" && await b.locator("#folhaLista .lg-cel").count() >= 1, "hashtag: folha com as publicações da #");
await b.screenshot({ path: "saida/fa-hashtag.png" });
await nb.browser.close();

// ---------- 3) criador: @ no texto tocável e aviso embaixo ----------
await p.goto(p.url().split("?")[0]); await p.waitForTimeout(3500);
await p.locator(".story-circ").first().locator(".mais").tap();
await p.waitForSelector(".flash-criar", { timeout: 8000 }); await p.waitForTimeout(600);
await p.locator(".flash-modos button", { hasText: "Foto" }).tap(); await p.waitForTimeout(300);
const [fc] = await Promise.all([p.waitForEvent("filechooser"), p.locator(".flash-esc-btn", { hasText: "Galeria" }).click()]);
await fc.setFiles("saida/foto-fa.png"); await p.waitForTimeout(1200);
await p.locator(".flash-amigos").tap(); await p.waitForTimeout(400);
const t = await p.locator(".toast").boundingBox().catch(() => null);
const col = await p.evaluate(() => { const r = document.querySelector(".flash-ferr").getBoundingClientRect(); return r.bottom; });
ok(t && t.y > col, `aviso aparece embaixo, sem cobrir a coluna de botões (aviso em ${Math.round(t?.y)}, botões até ${Math.round(col)})`);
await p.locator(".flash-amigos").tap(); await p.waitForTimeout(300);
await p.locator(".flash-ferr-btn[aria-label='Escrever na foto']").tap(); await p.waitForTimeout(300);
await p.keyboard.type("Oi @brunoreparos tudo bem");
await p.locator(".flash-edtxt .fe-pronto").tap(); await p.waitForTimeout(400);
await p.locator(".flash-publicar").tap();
await p.waitForSelector(".flash-criar", { state: "detached", timeout: 15000 }).catch(() => {});
await p.waitForTimeout(1500);
const meus = (await db.collection("stories").where("autorId", "==", U.ana).get()).docs.map((d) => d.data()).sort((a, b2) => b2.criadoEm.toMillis() - a.criadoEm.toMillis());
ok((meus[0]?.toques || []).some((x) => x.startsWith(`m|${U.bruno}|`)), "@ escrito no texto vira área tocável (abre o perfil)");

ok(!erros.length, "sem erros na página" + (erros.length ? ": " + erros.slice(0, 3).join(" | ") : ""));
await browser.close();
