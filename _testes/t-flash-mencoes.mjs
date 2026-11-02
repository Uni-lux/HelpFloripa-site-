// Flash: correções e novidades de 02/11/2026 (prints dele).
// - Modo Texto: trocar a letra/fundo com o teclado aberto NÃO encolhe o cartão (antes o campo perdia o foco e o cartão
//   era medido de novo, espremido, com "Escrev / a / algo..." e os botões cortados).
// - @ no texto/legenda: sugestões enquanto digita (inclusive @ de quem você não segue), menção oculta (olho cortado),
//   lista "Menções" com mostrar/ocultar/tirar.
// - Figurinhas tocáveis: localização de verdade (lugar escolhido na busca) → publicações de lá; hashtag → #; menção →
//   perfil. Menção oculta não aparece para quem vê, mas a pessoa recebe o aviso.
// - Enquete e caixa de perguntas com cor e opções com borda.
// - Apagar a publicação apaga o flash dela; flash de outra pessoa com publicação apagada é pulado.
// - Respostas da caixa organizadas (topo, Todas | Novas, por dia).
// Uso: node t-flash-mencoes.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, garantirImagem } from "./nav.mjs";
import { readFileSync } from "node:fs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const PX = "data:image/png;base64," + readFileSync(garantirImagem("saida/foto-fm.png", 900, 1600)).toString("base64");
for (const u of [U.ana, U.bruno, U.edu]) for (const s of (await db.collection("stories").where("autorId", "==", u).get()).docs) await s.ref.delete();
await db.doc(`relacoes/${U.ana}_${U.bruno}`).set({ tipo: "seguir", seguidorId: U.ana, alvoId: U.bruno, criadoEm: Timestamp.now() });
await db.doc(`relacoes/${U.bruno}_${U.ana}`).set({ tipo: "seguir", seguidorId: U.bruno, alvoId: U.ana, criadoEm: Timestamp.now() });
// publicação da Ana que vai para o flash dela e depois é apagada; e uma do Bruno, já apagada, com flash do Bruno
await db.doc("diario/fmPost").set({ autorId: U.ana, nome: "Ana Souza", texto: "Pôr do sol", mediaUrl: PX, criadoEm: Timestamp.fromMillis(Date.now() - 3600e3) });
const fApagada = (await db.collection("stories").add({ autorId: U.bruno, nome: "Bruno Reparos", tipo: "imagem", midia: PX, postDe: { postId: "fmSumiu", autorId: U.bruno, nome: "Bruno Reparos" }, criadoEm: Timestamp.fromMillis(Date.now() - 20 * 60000) })).id;
const fBom = (await db.collection("stories").add({ autorId: U.bruno, nome: "Bruno Reparos", tipo: "imagem", midia: PX, texto: "Olha isso @anasouza #obra", criadoEm: Timestamp.fromMillis(Date.now() - 10 * 60000) })).id;
const fAna = (await db.collection("stories").add({ autorId: U.ana, nome: "Ana Souza", tipo: "imagem", midia: PX, postDe: { postId: "fmPost", autorId: U.ana, nome: "Ana Souza" }, criadoEm: Timestamp.fromMillis(Date.now() - 30 * 60000) })).id;

const { browser, ctx } = await navegador({ mobile: true });
const p = await entrar(ctx, "ana", "feed.html");
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForTimeout(3500);
const W0 = 390, H0 = 844;
await p.setViewportSize({ width: W0, height: H0 });

// ---------- 1) modo Texto: trocar a letra com o teclado aberto ----------
await p.locator(".story-circ").first().locator(".mais").tap();
await p.waitForSelector(".flash-criar", { timeout: 8000 }); await p.waitForTimeout(600);
await p.locator(".flash-modos button", { hasText: "Texto" }).tap(); await p.waitForTimeout(400);
const antes = await p.locator(".flash-palco").boundingBox();
await p.locator(".flash-texto").focus();
await p.setViewportSize({ width: W0, height: 470 }); await p.waitForTimeout(500);
for (let k = 0; k < 3; k++) { await p.locator(".flash-ferr-btn.letra").tap(); await p.waitForTimeout(250); }
await p.locator(".flash-ferr-btn.cor").tap(); await p.waitForTimeout(300);
const depois = await p.locator(".flash-palco").boundingBox();
ok(Math.abs(depois.width - antes.width) < 2, `trocar letra/fundo com o teclado: o cartão não encolhe (${Math.round(antes.width)} → ${Math.round(depois.width)} px)`);
ok(await p.evaluate(() => document.activeElement?.classList.contains("flash-texto")), "o texto continua com o foco (o teclado não fecha)");
const ferr = await p.evaluate(() => { const pal = document.querySelector(".flash-palco").getBoundingClientRect(); return [...document.querySelectorAll(".flash-topo .flash-ferr-btn")].every((b) => { const r = b.getBoundingClientRect(); return r.right <= pal.right + 1 && r.left >= pal.left - 1; }); });
ok(ferr, "botões do topo inteiros dentro do cartão");
// @ no modo texto
await p.keyboard.type("Bom dia @bru");
await p.waitForSelector(".fe-arroba .fa-item", { timeout: 6000 }).catch(() => {});
ok(await p.locator(".fe-arroba .fa-item", { hasText: "@brunoreparos" }).count() === 1, "digitar @bru sugere @brunoreparos");
await p.screenshot({ path: "saida/fm-texto-arroba.png" });
await p.locator(".fe-arroba .fa-usar").first().tap(); await p.waitForTimeout(300);
ok((await p.locator(".flash-texto").inputValue()).includes("@brunoreparos "), "tocar põe o @usuário no texto");
ok((await p.locator(".flash-arroba .flash-onde-n").textContent()) === "1", "botão @ mostra 1 menção");
await p.locator(".flash-texto").blur();
await p.setViewportSize({ width: W0, height: H0 }); await p.waitForTimeout(400);

// ---------- 2) foto: figurinhas, @ na legenda, menção oculta, enquete com cor ----------
await p.locator(".flash-texto").fill("");
await p.locator(".flash-modos button", { hasText: "Foto" }).tap(); await p.waitForTimeout(300);
const [fc] = await Promise.all([p.waitForEvent("filechooser", { timeout: 8000 }), p.locator(".flash-esc-btn", { hasText: "Galeria" }).click()]);
await fc.setFiles("saida/foto-fm.png");
await p.waitForSelector(".flash-fotobox", { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(800);
// localização: busca de lugar → cidade do perfil
await p.locator(".flash-ferr-btn[aria-label^='Figurinhas']").tap(); await p.waitForTimeout(300);
await p.locator(".fig-pilula", { hasText: "Localização" }).tap();
await p.waitForSelector("#folhaLista.aberta .linha-local", { timeout: 8000 });
await p.waitForTimeout(1500);
const linhaCidade = p.locator("#folhaLista .linha-local", { hasText: "Sua cidade" });
ok(await linhaCidade.count() === 1, "escolher lugar: cidade do perfil aparece");
await linhaCidade.tap(); await p.waitForTimeout(500);
ok(await p.locator(".flash-fig.fig-local").count() === 1, "figurinha de localização no cartão");
ok(await p.evaluate(() => document.body.classList.contains("travado")), "o criador continua travando a página depois da folha");
// hashtag
await p.locator(".flash-ferr-btn[aria-label^='Figurinhas']").tap(); await p.waitForTimeout(300);
await p.locator(".fig-pilula", { hasText: "Hashtag" }).tap(); await p.waitForTimeout(200);
await p.locator(".fe-local").fill("#praia"); await p.locator(".fe-linha-local .fe-pronto").tap(); await p.waitForTimeout(300);
// menção como figurinha (Bruno) pelo painel de Menções
await p.locator(".flash-arroba").tap(); await p.waitForTimeout(300);
ok(await p.locator(".flash-mencoes").count() === 1, "botão @ abre a lista de Menções");
await p.locator(".fm-add").tap(); await p.waitForTimeout(800);
await p.locator(".flash-figs .fm-usar", { hasText: "brunoreparos" }).first().tap(); await p.waitForTimeout(400);
ok(await p.locator(".flash-fig.fig-mencao").count() === 1, "menção do Bruno como figurinha");
// @ na legenda → menção oculta do Edu (que a Ana não segue: vem da busca de @)
await p.locator(".flash-legenda").tap();
await p.keyboard.type("Fim de tarde @edu");
await p.waitForSelector(".fe-arroba .fa-item", { timeout: 6000 }).catch(() => {});
const temEdu = await p.locator(".fe-arroba .fa-item").count();
ok(temEdu > 0, `@edu na legenda sugere pessoas de todo o site (${temEdu})`);
await p.screenshot({ path: "saida/fm-legenda-arroba.png" });
await p.locator(".fe-arroba .fa-oculta").first().tap(); await p.waitForTimeout(400);
ok(!(await p.locator(".flash-legenda").inputValue()).includes("@edu"), "menção oculta tira o @ do texto");
await p.locator(".flash-legenda").blur();
await p.locator(".flash-arroba").tap(); await p.waitForTimeout(500);
ok(await p.locator(".flash-mencoes .figs-sec", { hasText: "Ocultas" }).count() === 1, "lista mostra a seção de ocultas");
await p.screenshot({ path: "saida/fm-lista-mencoes.png" });
await p.locator(".flash-mencoes .fe-pronto").tap(); await p.waitForTimeout(200);
// enquete roxa
await p.locator(".flash-ferr-btn[aria-label^='Figurinhas']").tap(); await p.waitForTimeout(300);
await p.locator(".fig-pilula", { hasText: "Enquete" }).tap(); await p.waitForTimeout(300);
await p.locator(".fv-perg").fill("Praia ou piscina?");
await p.evaluate((c) => { for (let i = 0; i < 8 && !document.querySelector(".fv-card").classList.contains("tema-" + c); i++) document.querySelector(".fv-cor").click(); }, "roxo");
await p.screenshot({ path: "saida/fm-enquete-cor.png" });
await p.locator(".flash-fig-viva .fe-pronto").tap(); await p.waitForTimeout(300);
ok(await p.locator(".fe-enq.tema-roxo").count() === 1, "prévia da enquete na cor escolhida");
const borda = await p.evaluate(() => getComputedStyle(document.querySelector(".fe-enq > span")).borderTopWidth);
ok(parseFloat(borda) >= 1, `opções da enquete com borda (${borda})`);
await p.screenshot({ path: "saida/fm-cartao.png" });
await p.locator(".flash-publicar").tap();
await p.waitForSelector(".flash-criar", { state: "detached", timeout: 15000 }).catch(() => {});
await p.waitForTimeout(1500);
const meus = (await db.collection("stories").where("autorId", "==", U.ana).get()).docs.map((d) => ({ id: d.id, ...d.data() })).filter((d) => d.id !== fAna);
const novo = meus.sort((a, b) => b.criadoEm.toMillis() - a.criadoEm.toMillis())[0] || {};
ok(Array.isArray(novo.toques) && novo.toques.some((t) => t.startsWith("l|")) && novo.toques.some((t) => t.startsWith("h|praia|")) && novo.toques.some((t) => t.startsWith(`m|${U.bruno}|`)), `gravou as figurinhas tocáveis (${(novo.toques || []).map((t) => t.split("|").slice(0, 2).join("|")).join(", ")})`);
ok(JSON.stringify(novo.mencoes) === JSON.stringify([U.bruno, U.edu]) && JSON.stringify(novo.mencoesOcultas) === JSON.stringify([U.edu]), "menções: Bruno à vista, Edu oculto");
ok(novo.enquete?.cor === "roxo", "enquete gravada com a cor");
ok(novo.texto === "Fim de tarde", `legenda sem o @ oculto (“${novo.texto}”)`);
const avisoEdu = (await db.collection("conversas").where("participantes", "array-contains", U.edu).get()).docs.length;
ok(avisoEdu > 0, "quem foi mencionado oculto recebe o aviso no Mensagens");

// ---------- 3) Bruno vê o flash da Ana ----------
const nb = await navegador({ mobile: true });
const b = await entrar(nb.ctx, "bruno", `feed.html?flash=${novo.id}`);
await b.setViewportSize({ width: W0, height: H0 });
await b.waitForSelector(".story-visor", { timeout: 12000 }).catch(() => {});
await b.waitForTimeout(1200);
const areas = await b.locator(".story-fig-toque").count();
ok(areas === 3, `quem vê tem 3 figurinhas tocáveis (local, hashtag, menção): ${areas}`);
const mencoesVis = await b.locator(".story-mencoes").count();
ok(mencoesVis === 1, "lista de mencionados aparece (só o Bruno)");
ok(await b.locator(".story-enq .enquete.tema-roxo").count() === 1, "enquete roxa no visor");
await b.locator(".story-fig-toque[aria-label='Florianópolis']").click();
await b.waitForTimeout(300);
const href = await b.locator(".story-fig-balao:not([hidden])").getAttribute("href").catch(() => "");
ok(/^feed\.html\?local=-?\d/.test(href || ""), `localização abre as publicações de lá (${href})`);
await b.screenshot({ path: "saida/fm-visor-local.png" });
await b.locator(".story-fig-toque[aria-label='#praia']").click(); await b.waitForTimeout(300);
ok(((await b.locator(".story-fig-balao:not([hidden])").getAttribute("href")) || "").includes("tag=praia"), "hashtag abre #praia");
await nb.browser.close();

// ---------- 4) visor: legenda com @ e #, flash com publicação apagada ----------
await p.goto(p.url().split("?")[0] + `?flash=${fBom}`); await p.waitForTimeout(3500);
await p.waitForSelector(".story-visor", { timeout: 10000 }).catch(() => {});
ok(await p.locator(".story-legenda a.mencao").count() === 1 && await p.locator(".story-legenda a.hashtag").count() === 1, "legenda com @ e # tocáveis");
const idsVistos = [];
for (let k = 0; k < 3; k++) { idsVistos.push(await p.evaluate(() => document.querySelector(".story-palco img")?.src?.slice(-20) || "")); }
await p.keyboard.press("Escape"); await p.waitForTimeout(400);
await p.evaluate(() => document.querySelector(".story-visor")?.remove());
await p.goto(p.url().split("?")[0] + `?flash=${fApagada}`); await p.waitForTimeout(4000);
const pulou = await p.evaluate(() => !document.querySelector(".story-visor .story-post-area"));
ok(pulou, "flash cuja publicação foi apagada é pulado (não mostra “Ver publicação”)");
await p.keyboard.press("Escape"); await p.waitForTimeout(300);

// ---------- 5) apagar a publicação apaga o flash dela ----------
await p.goto(p.url().split("?")[0].replace("feed.html", "feed.html") + "?post=fmPost"); await p.waitForTimeout(3500);
await p.locator(".visor-exp [aria-label='Opções da publicação']").first().click().catch(() => {});
await p.waitForTimeout(400);
const apagar = p.locator("button", { hasText: "Apagar publicação" });
if (await apagar.count()) {
  await apagar.first().click(); await p.waitForTimeout(300);
  await p.locator(".hf-confirma-fundo button", { hasText: "Apagar" }).last().click(); await p.waitForTimeout(2000);
  ok(!(await db.doc(`stories/${fAna}`).get()).exists, "apagar a publicação apagou o flash dela");
} else ok(false, "não achei o menu Apagar publicação");

// ---------- 6) respostas da caixa organizadas ----------
await db.doc("diario/fmCaixa").set({ autorId: U.ana, nome: "Ana Souza", texto: "", caixa: { pergunta: "O que acharam?", anonima: false }, criadoEm: Timestamp.now() });
for (const [k, h] of [[0, 1], [1, 30]]) await db.collection("caixa_respostas").add({ alvo: "d_fmCaixa", tipo: "d", itemId: "fmCaixa", autorId: U.ana, uid: U.bruno, nome: "Bruno Reparos", texto: "Resposta " + k, anonima: false, criadoEm: Timestamp.fromMillis(Date.now() - h * 3600e3) });
await p.goto(p.url().split("?")[0] + "?post=fmCaixa"); await p.waitForTimeout(3500);
await p.locator(".visor-exp .cx-ver").first().click(); await p.waitForTimeout(1500);
ok(await p.locator(".cxr-topo").count() === 1 && await p.locator(".cxr-item").count() === 2, "respostas: topo com a pergunta e 2 respostas");
ok(await p.locator(".cxr-dia").count() === 2, "respostas separadas por dia (Hoje / Ontem)");
ok(await p.locator(".cxr-filtro").count() === 2, "filtro Todas | Novas");
await p.screenshot({ path: "saida/fm-respostas.png" });

ok(!erros.length, "sem erros na página" + (erros.length ? ": " + erros.slice(0, 3).join(" | ") : ""));
await browser.close();
