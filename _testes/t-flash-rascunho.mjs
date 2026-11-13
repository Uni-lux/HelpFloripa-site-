// Flash (02/11/2026, lista nova): voltar não perde o flash (painel fecha primeiro; com conteúdo pergunta Rascunho/Descartar/
// Continuar), rascunhos no aparelho (salvar, listar, reabrir), desfazer, resposta da caixa como figurinha (trocar o fundo
// não apaga), ⋯ das Visualizações com menu organizado e a barra do tempo andando mesmo com "remover animações".
// Uso: node t-flash-rascunho.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, garantirImagem } from "./nav.mjs";
import { readFileSync } from "node:fs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const PX = "data:image/png;base64," + readFileSync(garantirImagem("saida/foto-fr.png", 900, 1600)).toString("base64");
garantirImagem("saida/foto-fr2.png", 1200, 900);
for (const u of [U.ana, U.bruno]) for (const s of (await db.collection("stories").where("autorId", "==", u).get()).docs) await s.ref.delete();
const f1 = (await db.collection("stories").add({ restrito: false, autorId: U.ana, nome: "Ana Souza", tipo: "imagem", midia: PX, caixa: { pergunta: "Me pergunte", anonima: false, x: 0.5, y: 0.4, cor: "rosa" }, criadoEm: Timestamp.now() })).id;
await db.collection("caixa_respostas").add({ alvo: `f_${f1}`, tipo: "f", itemId: f1, autorId: U.ana, uid: U.bruno, nome: "Bruno Reparos", texto: "Qual seu lanche favorito?", anonima: false, criadoEm: Timestamp.now() });
await db.doc(`stories/${f1}/vistos/${U.bruno}`).set({ criadoEm: Timestamp.now() });

const { browser, ctx } = await navegador({ mobile: true });
const p = await entrar(ctx, "ana", "feed.html");
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForTimeout(3500);
const abrirCriador = async () => { await p.locator(".story-circ").first().locator(".mais").tap(); await p.waitForSelector(".flash-criar", { timeout: 8000 }); await p.waitForTimeout(600); };

// ---------- 1) voltar: painel primeiro, depois a pergunta; salvar rascunho ----------
await abrirCriador();
await p.locator(".flash-modos button", { hasText: "Texto" }).tap(); await p.waitForTimeout(300);
await p.keyboard.type("Rascunho de teste");
await p.locator(".flash-texto").blur();
await p.locator(".flash-ferr-btn[aria-label^='Figurinhas']").tap(); await p.waitForTimeout(300);
await p.goBack(); await p.waitForTimeout(500);
ok(await p.locator(".flash-criar").count() === 1 && await p.locator(".flash-figs").count() === 0, "voltar com as figurinhas abertas fecha só o painel");
await p.locator(".flash-ferr-btn[aria-label^='Figurinhas']").tap(); await p.waitForTimeout(300);
await p.locator(".fig-pilula", { hasText: "Emoji" }).tap(); await p.waitForTimeout(200);
await p.locator(".fig-emojis button").first().tap(); await p.waitForTimeout(300);
ok(!(await p.locator(".flash-desfazer").isHidden()), "botão desfazer aparece depois de uma mudança");
await p.locator(".flash-desfazer").tap(); await p.waitForTimeout(300);
ok(await p.locator(".flash-camada .flash-txt").count() === 0, "desfazer tira o emoji colocado");
await p.locator(".flash-ferr-btn[aria-label^='Figurinhas']").tap(); await p.waitForTimeout(300);
await p.locator(".fig-pilula", { hasText: "Emoji" }).tap(); await p.waitForTimeout(200);
await p.locator(".fig-emojis button").nth(3).tap(); await p.waitForTimeout(300);
await p.goBack(); await p.waitForTimeout(600);
ok(await p.locator(".flash-criar").count() === 1 && await p.locator("#folhaOpcoes.aberta button", { hasText: "Salvar como rascunho" }).count() === 1, "voltar com algo feito pergunta (rascunho / descartar / continuar)");
await p.screenshot({ path: "saida/fr-sair.png" });
await p.locator("#folhaOpcoes.aberta button", { hasText: "Salvar como rascunho" }).tap(); await p.waitForTimeout(1200);
ok(await p.locator(".flash-criar").count() === 0, "salvou o rascunho e fechou");

// ---------- 2) reabrir o rascunho ----------
await abrirCriador();
await p.locator(".flash-modos button", { hasText: "Texto" }).tap(); await p.waitForTimeout(300);
await p.locator(".flash-texto").blur();
ok(!(await p.locator(".flash-rasc").isHidden()) && (await p.locator(".flash-rasc").textContent()).includes("1"), "pílula “Rascunhos · 1” no criador vazio");
await p.locator(".flash-rasc").tap(); await p.waitForTimeout(800);
await p.locator("#folhaLista .rasc-abrir").first().tap(); await p.waitForTimeout(1500);
ok((await p.locator(".flash-texto").inputValue()) === "Rascunho de teste" && await p.locator(".flash-camada .flash-txt").count() === 1, "rascunho reabre com o texto e o emoji");
await p.screenshot({ path: "saida/fr-reaberto.png" });
await p.goBack(); await p.waitForTimeout(600);
await p.locator("#folhaOpcoes.aberta button", { hasText: "Descartar" }).tap(); await p.waitForTimeout(600);

// ---------- 3) resposta da caixa vira figurinha e sobrevive à troca do fundo ----------
await p.goto(p.url().split("?")[0] + `?flash=${f1}`); await p.waitForTimeout(3500);
await p.waitForSelector(".story-visor", { timeout: 10000 }).catch(() => {});
await p.locator(".story-cx .cx-ver").click(); await p.waitForTimeout(1500);
await p.locator("#folhaLista .vv-resp").click(); await p.waitForTimeout(200);
await p.locator("#folhaLista .vv-acao", { hasText: "Pôr no flash" }).click(); await p.waitForTimeout(2500);
ok(await p.locator(".flash-criar .flash-ft.ft-3").count() === 1, "resposta da caixa entra como figurinha por cima");
await p.locator(".flash-ferr-btn[aria-label^='Fotos']").tap(); await p.waitForTimeout(300);
const [fc] = await Promise.all([p.waitForEvent("filechooser"), p.locator(".fig-pilula", { hasText: "Trocar o fundo" }).tap()]);
await fc.setFiles("saida/foto-fr2.png"); await p.waitForTimeout(1500);
ok(await p.locator(".flash-criar .flash-ft.ft-3").count() === 1, "trocar o fundo não apaga a resposta");
await p.screenshot({ path: "saida/fr-resposta.png" });
await p.goBack(); await p.waitForTimeout(600);
await p.locator("#folhaOpcoes.aberta button", { hasText: "Descartar" }).tap(); await p.waitForTimeout(600);

// ---------- 4) ⋯ das Visualizações e barra do tempo com "remover animações" ----------
await p.emulateMedia({ reducedMotion: "reduce" });
await p.goto(p.url().split("?")[0] + `?flash=${f1}`); await p.waitForTimeout(3500);
await p.waitForSelector(".story-visor", { timeout: 10000 }).catch(() => {});
await p.waitForTimeout(1500);
const w = await p.evaluate(() => parseFloat(document.querySelector(".story-barra i")?.style.width || "0"));
ok(w > 3 && w < 100, `barra do tempo anda mesmo com "remover animações" (${Math.round(w)}% depois de ~1,5 s)`);
await p.locator(".story-vistos").click(); await p.waitForTimeout(1500);
await p.locator("#folhaLista .vv-opcoes").first().click(); await p.waitForTimeout(400);
ok(await p.locator("#folhaOpcoes.aberta button", { hasText: "Enviar mensagem" }).count() === 1 && await p.locator("#folhaOpcoes.aberta button", { hasText: "Ocultar os seus flashes" }).count() === 1, "⋯ abre um menu organizado (mensagem, perfil, ocultar)");
await p.screenshot({ path: "saida/fr-menu.png" });

ok(!erros.length, "sem erros na página" + (erros.length ? ": " + erros.slice(0, 3).join(" | ") : ""));
await browser.close();
