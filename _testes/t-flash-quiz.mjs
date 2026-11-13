// Flash (02/11/2026): figurinha Teste (quiz: resposta certa marcada, quem vê descobre na hora), nome fixo no topo do
// visor (as linhas extras não empurram o nome) e Configurações do Flash novas (Criar flash: começar em Texto, rascunhos).
// Uso: node t-flash-quiz.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, garantirImagem } from "./nav.mjs";
import { readFileSync } from "node:fs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const PX = "data:image/png;base64," + readFileSync(garantirImagem("saida/foto-qz.png", 900, 1600)).toString("base64");
for (const u of [U.ana, U.bruno]) for (const s of (await db.collection("stories").where("autorId", "==", u).get()).docs) await s.ref.delete();
await db.doc(`usuarios/${U.ana}`).set({ flashConfig: {} }, { merge: true });

const A = await navegador({ mobile: true });
const p = await entrar(A.ctx, "ana", "feed.html");
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForTimeout(3500);
const abrirCriador = async () => { await p.locator(".story-circ").first().locator(".mais").tap(); await p.waitForSelector(".flash-criar", { timeout: 8000 }); await p.waitForTimeout(600); };

// ---------- 1) criar um teste ----------
await abrirCriador();
await p.locator(".flash-modos button", { hasText: "Texto" }).tap(); await p.waitForTimeout(300);
await p.keyboard.type("Quiz da Ana"); await p.locator(".flash-texto").blur();
await p.locator(".flash-ferr-btn[aria-label^='Figurinhas']").tap(); await p.waitForTimeout(300);
ok(await p.locator(".fig-pilula", { hasText: "Teste" }).count() === 1, "figurinha “Teste” nas figurinhas");
await p.locator(".fig-pilula", { hasText: "Teste" }).tap(); await p.waitForTimeout(400);
ok(await p.locator(".flash-fig-viva.fv-eh-teste .fv-letra").count() === 2, "editor do teste com as letras A e B");
await p.keyboard.type("Capital de Santa Catarina?");
await p.locator(".fv-op input").nth(0).fill("Joinville");
await p.locator(".fv-op input").nth(1).fill("Blumenau");
await p.locator(".fv-nova").type("Florianópolis");
await p.locator(".fv-letra").nth(2).tap(); await p.waitForTimeout(150);
ok(await p.locator(".fv-op.certa input").inputValue() === "Florianópolis", "tocar na letra C marca a resposta certa");
await p.screenshot({ path: "saida/qz-editor.png" });
await p.locator(".flash-fig-viva .fe-pronto").tap(); await p.waitForTimeout(400);
ok(await p.locator(".flash-camada .fe-teste span.certa").textContent() === "CFlorianópolis", "prévia no cartão mostra a certa");
await p.locator(".flash-publicar").tap();
let doc = null;
for (let i = 0; i < 30 && !doc; i++) { await p.waitForTimeout(500); doc = (await db.collection("stories").where("autorId", "==", U.ana).get()).docs[0]; }
const enq = doc?.data().enquete;
ok(enq && enq.certa === 2 && enq.opcoes.length === 3 && !enq.fimEm, `flash gravado com o teste (certa = ${enq?.certa})`);
await A.browser.close();

// ---------- 2) quem vê responde e descobre na hora ----------
const B = await navegador({ mobile: true });
const b = await entrar(B.ctx, "bruno", `feed.html?flash=${doc.id}`);
b.on("pageerror", (e) => erros.push(e.message));
await b.waitForSelector(".story-enq .enquete.teste", { timeout: 15000 }); await b.waitForTimeout(1500);
ok((await b.locator(".story-enq .enq-tit").textContent()).includes("Teste"), "no visor aparece como “Teste”");
ok(await b.locator(".story-enq .enq-op.certa").count() === 0, "antes de responder, a certa fica escondida");
await b.locator(".story-enq .enq-op").nth(1).click(); await b.waitForTimeout(1500);
ok(await b.locator(".story-enq .enq-op.errada").count() === 1 && await b.locator(".story-enq .enq-op.certa").count() === 1, "respondeu errado: a dele fica vermelha e a certa verde");
ok((await b.locator(".story-enq .enq-rod-tx").textContent()).includes("a certa era a C"), "rodapé: “Não foi dessa vez · a certa era a C”");
await b.screenshot({ path: "saida/qz-visor.png" });

// ---------- 3) topo: nome fixo na altura da foto ----------
await db.collection("stories").add({ restrito: false, autorId: U.ana, nome: "Ana Souza", tipo: "imagem", midia: PX, negocios: [`${U.ana}_servicos`], perfil: true, repostDe: { storyId: doc.id, autorId: U.bruno, nome: "Bruno" }, criadoEm: Timestamp.now() });
await b.keyboard.press("Escape"); await b.waitForTimeout(500);
const id2 = (await db.collection("stories").where("autorId", "==", U.ana).get()).docs.find((d) => d.data().repostDe)?.id;
await b.goto(b.url().split("?")[0] + `?flash=${id2}`); await b.waitForSelector(".story-visor", { timeout: 15000 }); await b.waitForTimeout(1200);
const alt = await b.evaluate(() => { const a = document.querySelector(".story-quem .avatar").getBoundingClientRect(), n = document.querySelector(".story-nome").getBoundingClientRect(); return [a.top + a.height / 2, n.top + n.height / 2, document.querySelectorAll(".story-quem-sub .story-repost:not(.story-onde)").length]; });
ok(alt[2] === 0 && Math.abs(alt[0] - alt[1]) <= 3, `repost sem o selo “Flash de X” e o nome na altura da foto (diferença ${Math.abs(alt[0] - alt[1]).toFixed(1)} px)`);
await b.screenshot({ path: "saida/qz-topo.png" });
await B.browser.close();

// ---------- 4) configurações: começar em Texto ----------
const C = await navegador({ mobile: true });
const c = await entrar(C.ctx, "ana", "feed.html");
await c.waitForTimeout(3500);
await c.locator(".story-circ").first().locator(".mais").tap(); await c.waitForSelector(".flash-criar", { timeout: 8000 }); await c.waitForTimeout(500);
await c.locator(".flash-ferr-btn[aria-label='Configurações do Flash']").tap(); await c.waitForSelector(".cfg2-card", { timeout: 6000 }); await c.waitForTimeout(500);
ok(await c.locator(".cfg2-card h3", { hasText: "Criar flash" }).count() === 1, "configurações têm o cartão “Criar flash”");
await c.locator(".cfg2-op", { hasText: "Começar em Texto" }).click(); await c.waitForTimeout(1000);
const cfg = (await db.doc(`usuarios/${U.ana}`).get()).data().flashConfig;
ok(cfg?.modoInicial === "texto", "escolha salva na conta (modoInicial = texto)");
await c.screenshot({ path: "saida/qz-config.png", fullPage: false });
await c.locator("#folhaLista.aberta [data-fechar]").first().click(); await c.waitForTimeout(300);
await c.keyboard.press("Escape"); await c.waitForTimeout(500);
await c.locator("#folhaOpcoes.aberta button", { hasText: "Descartar" }).click().catch(() => {}); await c.waitForTimeout(500);
await c.locator(".story-circ").first().locator(".mais").tap(); await c.waitForSelector(".flash-criar", { timeout: 8000 }); await c.waitForTimeout(500);
ok(await c.locator(".flash-modos button.on, .flash-modos button[aria-selected=true]", { hasText: "Texto" }).count() === 1, "o criador já abre em Texto");
await db.doc(`usuarios/${U.ana}`).set({ flashConfig: {} }, { merge: true });

ok(!erros.length, "sem erros na página " + erros.join(" | "));
await C.browser.close();
