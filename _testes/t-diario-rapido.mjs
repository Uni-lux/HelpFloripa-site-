// Diário e Flash rápidos (04/11/2026): a fileira do Flash e as publicações aparecem com a cópia do aparelho antes do
// servidor responder; voltar do Explorar não recarrega o Diário; trocar o tipo de publicação não abre a galeria nem o
// teclado; botão de criar novo no topo.
// Uso: node t-diario-rapido.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
for (let k = 0; k < 6; k++) await db.doc(`diario/rap${k}`).set({ autorId: k % 2 ? U.bruno : U.edu, nome: "Teste", texto: `Publicação rápida ${k}`, tipo: "texto", autorUf: "SC", autorIbge: 4205407, criadoEm: Timestamp.fromMillis(Date.now() - k * 600000) });
await db.doc(`relacoes/${U.ana}_${U.bruno}`).set({ tipo: "seguir", seguidorId: U.ana, alvoId: U.bruno, criadoEm: Timestamp.now() });
await db.doc("stories/rapFlash").set({ autorId: U.bruno, nome: "Bruno", tipo: "texto", mediaUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", criadoEm: Timestamp.now() });
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const erros = [];
const A = await navegador({ mobile: true });
const p = await entrar(A.ctx, "ana", "feed.html");
p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector("#listaFeed .post-card", { timeout: 20000 });
await p.waitForSelector("#storiesFeed .story-circ:not(.meu)", { timeout: 20000 });
await p.waitForTimeout(1500);
ok(await p.evaluate(() => !!localStorage.getItem("hf-diario-ultimos-" + window.firebaseAuth.currentUser.uid)), "lista do Diário guardada no aparelho");
ok(await p.evaluate(() => !!localStorage.getItem("hf-flash-barra-" + window.firebaseAuth.currentUser.uid)), "fileira do Flash guardada no aparelho");

// 2ª visita com o servidor MUITO lento (respostas do Firestore atrasadas 4 s): a cópia aparece antes
await A.ctx.route(/127\.0\.0\.1:8085\/.*(Listen|Write)\/channel/, async (r) => { await new Promise((ok) => setTimeout(ok, 4000)); r.continue().catch(() => {}); });
const t0 = Date.now();
await p.goto("http://127.0.0.1:5057/feed.html", { waitUntil: "commit" });
const tPost = await p.waitForSelector("#listaFeed .post-card", { timeout: 20000 }).then(() => Date.now() - t0).catch(() => null);
const tFlash = await p.waitForSelector("#storiesFeed .story-circ:not(.meu)", { timeout: 20000 }).then(() => Date.now() - t0).catch(() => null);
ok(tPost !== null && tPost < 3500, `publicações aparecem antes do servidor (${tPost} ms, servidor atrasado 4 s)`);
ok(tFlash !== null && tFlash < 3500, `fileira do Flash aparece antes do servidor (${tFlash} ms)`);
await A.ctx.unroute(/127\.0\.0\.1:8085\/.*(Listen|Write)\/channel/);
await p.waitForTimeout(6000);
ok(await p.locator("#listaFeed .post-card").count() > 0, "a lista do servidor entrou");

// Explorar e voltar: o Diário não recarrega
await p.evaluate(() => { window.__marcaFeed = document.querySelector("#listaFeed .post-card"); });
await p.locator("#barraRede [data-barra=explorar]").tap(); await p.waitForTimeout(900);
await p.locator("#barraRede [data-barra=diario]").tap(); await p.waitForTimeout(400);
ok(await p.evaluate(() => !document.querySelector("#listaFeed .esqueleto-post") && document.querySelector("#listaFeed .post-card") === window.__marcaFeed), "voltar do Explorar mantém o Diário (sem carregar de novo)");

// botão de criar no topo
const bt = await p.evaluate(() => { const b = document.getElementById("btnComporFeed"); const ic = b.querySelector(".tc-ic"); return { ic: !!ic, use: b.querySelector("use")?.getAttribute("href"), fundo: ic && getComputedStyle(ic).backgroundImage }; });
ok(bt.ic && bt.use === "#i-criar" && !/gradient/.test(bt.fundo), `botão de criar novo, sem o azul (${bt.use})`);
await p.screenshot({ path: "saida/diario-criar.png", clip: { x: 0, y: 0, width: 390, height: 120 } });

// tipos de publicação: tocar não abre a galeria nem o teclado
await p.locator("#btnComporFeed").tap(); await p.waitForSelector("#folhaPublicar.aberta");
await p.evaluate(() => { window.__abriuGaleria = 0; for (const id of ["pubArquivoFoto", "pubArquivoVideo"]) { const i = document.getElementById(id); i.click = () => { window.__abriuGaleria++; }; } document.activeElement?.blur(); });
await p.locator("#pubTipoFoto").tap(); await p.waitForTimeout(300);
ok(await p.evaluate(() => window.__abriuGaleria) === 0, "tocar em Foto não abre a galeria sozinho");
ok(await p.locator("#pubEscolher").isVisible(), "aparece o quadro “Escolher as fotos”");
await p.screenshot({ path: "saida/pub-tipo-foto.png" });
await p.locator("#pubEscolher").tap(); await p.waitForTimeout(200);
ok(await p.evaluate(() => window.__abriuGaleria) === 1, "tocar no quadro abre a galeria");
await p.locator("#pubEnqueteBtn").tap(); await p.waitForTimeout(300);
ok(await p.evaluate(() => !document.activeElement?.matches?.("input, textarea")), "tocar em Enquete não abre o teclado");
ok(await p.locator("#pubEnquete .pe-pergunta").isVisible(), "a enquete aparece para preencher");
ok(!(await p.locator("#pubEscolher").isVisible().catch(() => false)), "o quadro de fotos some fora do tipo Foto");
await p.locator("#pubCaixaBtn").tap(); await p.waitForTimeout(300);
ok(await p.evaluate(() => !document.activeElement?.matches?.("input, textarea")), "tocar em Perguntas não abre o teclado");
await p.locator("#pubTipoTexto").tap(); await p.waitForTimeout(300);
ok(await p.evaluate(() => !document.activeElement?.matches?.("input, textarea")) && await p.evaluate(() => window.__abriuGaleria) === 1, "voltar para Texto também não abre nada");
for (let k = 0; k < 6; k++) await db.doc(`diario/rap${k}`).delete();
await db.doc("stories/rapFlash").delete();
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close();
