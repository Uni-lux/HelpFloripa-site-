// Flash (02/11/2026, prints do dono): responder a resposta da caixa NO CHAT com o cartão da pergunta e da resposta
// (como no Instagram), atalho "Salvar rascunho" no criador, bolinhas de cor sem cortar o anel, voltar de um link
// aberto no flash reabre o MESMO flash e segurar uma foto não abre o menu do navegador (em todo o site).
// Uso: node t-flash-respostas.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, garantirImagem } from "./nav.mjs";
import { readFileSync } from "node:fs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const PX = "data:image/png;base64," + readFileSync(garantirImagem("saida/foto-fresp.png", 900, 1600)).toString("base64");
for (const u of [U.ana, U.bruno]) for (const s of (await db.collection("stories").where("autorId", "==", u).get()).docs) await s.ref.delete();
await db.doc(`relacoes/${U.bruno}_${U.ana}`).set({ tipo: "seguir", seguidorId: U.bruno, alvoId: U.ana, criadoEm: Timestamp.now() });
const f1 = (await db.collection("stories").add({ autorId: U.ana, nome: "Ana Souza", tipo: "imagem", midia: PX, caixa: { pergunta: "Qual lanche eu faço hoje?", anonima: false, x: 0.5, y: 0.4, cor: "roxo" },
  toques: [`m|${U.bruno}|0.5|0.75|0.4|0.06`], mencoes: [U.bruno], criadoEm: Timestamp.now() })).id;
await db.collection("caixa_respostas").add({ alvo: `f_${f1}`, tipo: "f", itemId: f1, autorId: U.ana, uid: U.bruno, nome: "Bruno Reparos", texto: "Faz um X-salada!", anonima: false, criadoEm: Timestamp.now() });
await db.doc(`stories/${f1}/vistos/${U.bruno}`).set({ criadoEm: Timestamp.now() });

const { browser, ctx } = await navegador({ mobile: true });
const p = await entrar(ctx, "ana", `feed.html?flash=${f1}`);
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector(".story-visor", { timeout: 15000 }).catch(() => {});
await p.waitForTimeout(1500);

// ---------- 1) responder a resposta no chat ----------
await p.locator(".story-cx .cx-ver").click(); await p.waitForTimeout(1500);
await p.locator("#folhaLista .vv-resp").click(); await p.waitForTimeout(200);
ok(await p.locator("#folhaLista .vv-acao", { hasText: "Responder" }).count() === 1, "resposta da caixa tem “Responder”");
await p.locator("#folhaLista .vv-acao", { hasText: "Responder" }).click();
await p.waitForSelector(".hfc.on iframe", { timeout: 8000 }).catch(() => {});
const q = p.frameLocator(".hfc.on iframe");
await q.locator("#barraCartao:not([hidden])").waitFor({ timeout: 15000 }).catch(() => {});
ok((await q.locator("#cartaoTipo").textContent().catch(() => "")).includes("Qual lanche"), "o chat abre por cima com a pergunta e a resposta prontas");
await p.screenshot({ path: "saida/fresp-pendente.png" });
await q.locator("#texto").fill("Boa ideia, vou fazer!");
await q.locator("#btnEnviar").click(); await p.waitForTimeout(2500);
const conv = [U.ana, U.bruno].sort().join("_");
const msgs = (await db.collection(`conversas/${conv}/mensagens`).orderBy("criadoEm", "desc").limit(2).get()).docs.map((d) => d.data());
const cartao = msgs.find((m) => m.cartao?.tipo === "caixa")?.cartao;
ok(cartao && cartao.resposta === "Faz um X-salada!" && cartao.cor === "roxo" && cartao.itemTipo === "f" && cartao.itemId === f1, "vai o cartão {tipo: caixa} com pergunta, resposta, cor e o flash");
ok(msgs.some((m) => m.texto === "Boa ideia, vou fazer!"), "e a mensagem escrita vai logo depois");
ok(await q.locator(".caixa-msg .cxm-perg").count() >= 1 && await q.locator(".caixa-msg .cxm-ver").count() >= 1, "no chat aparece o cartão (faixa da pergunta + resposta + Ver flash)");
await p.screenshot({ path: "saida/fresp-chat.png" });
await p.evaluate(() => history.back()); await p.waitForTimeout(1200);
const passos = [await p.locator(".hfc.on").count()];
for (let k = 0; k < 3 && await p.locator(".hfc.on").count(); k++) { await p.evaluate(() => history.back()); await p.waitForTimeout(1200); passos.push(await p.locator(".hfc.on").count()); }
console.log("    (gaveta aberta depois de cada voltar:", passos.join(","), ")");
ok(passos[0] === 0 && await p.locator(".hfc.on").count() === 0 && await p.locator(".story-visor").count() === 1, "voltar fecha o chat e continua no flash");
await p.keyboard.press("Escape"); await p.waitForTimeout(400);
await p.keyboard.press("Escape"); await p.waitForTimeout(600);
ok(await p.locator(".story-visor").count() === 0, "Esc fecha a lista e depois o flash");

// ---------- 2) Bruno vê o cartão do lado dele ----------
const nb = await navegador({ mobile: true });
const b = await entrar(nb.ctx, "bruno", `mensagens.html?conversa=${conv}`);
await b.waitForSelector(".caixa-msg", { timeout: 15000 }).catch(() => {});
ok((await b.locator(".caixa-msg .cxm-cab").first().textContent().catch(() => "")).includes("Respondeu à sua resposta"), "quem respondeu vê “Respondeu à sua resposta”");
await b.screenshot({ path: "saida/fresp-bruno.png" });

// ---------- 3) voltar de um link do flash reabre o mesmo flash ----------
await b.goto(b.url().split("/mensagens")[0] + `/feed.html?flash=${f1}`); await b.waitForTimeout(3500);
await b.waitForSelector(".story-visor", { timeout: 10000 }).catch(() => {});
await b.goto(b.url().split("?")[0]); await b.waitForTimeout(3000); // chega no Diário (sem ?flash)
await b.locator(".story-circ", { hasText: "Ana" }).first().click().catch(() => {});
await b.waitForSelector(".story-visor", { timeout: 10000 }).catch(() => {});
await b.waitForTimeout(800);
// texto digitado na caixa de perguntas colorida aparece bem (escuro sobre o campo claro)
await b.locator(".story-cx textarea").fill("Tem de frango?");
const cores = await b.evaluate(() => { const t = document.querySelector(".story-cx textarea"), f = t.closest(".cx-form"); return [getComputedStyle(t).color, getComputedStyle(f).backgroundColor]; });
ok(cores[0] === "rgb(17, 17, 17)" && /241, 244, 246/.test(cores[1]), `o que a pessoa escreve na caixa fica legível (${cores.join(" sobre ")})`);
await b.screenshot({ path: "saida/fresp-digitando.png" });
await b.locator(".story-cx textarea").fill(""); await b.locator(".story-cx textarea").blur(); await b.waitForTimeout(400);
await b.locator(".story-fig-toque").first().click(); await b.waitForTimeout(300);
await Promise.all([b.waitForURL(/usuarios\.html/, { timeout: 10000 }).catch(() => {}), b.locator(".story-fig-balao:not([hidden])").click()]);
await b.waitForTimeout(1500);
ok(/usuarios\.html/.test(b.url()), "tocar na menção abre o perfil");
await b.goBack(); await b.waitForTimeout(4000);
ok(await b.locator(".story-visor").count() === 1, "voltar do perfil reabre o flash");
await b.keyboard.press("Escape"); await b.waitForTimeout(600);
ok(await b.locator(".story-visor").count() === 0 && /feed\.html$/.test(b.url()), "e um “voltar”/Esc fecha o flash normalmente");
await nb.browser.close();

// ---------- 4) foto sem menu do navegador ----------
const menu = await p.evaluate(() => { const im = document.createElement("img"); im.src = "logo-app-96.webp"; document.body.appendChild(im); const e = new MouseEvent("contextmenu", { bubbles: true, cancelable: true }); im.dispatchEvent(e); im.remove(); return e.defaultPrevented; });
ok(menu === true, "segurar uma foto do site não abre Copiar/Baixar imagem");
const menuTxt = await p.evaluate(() => { const t = document.createElement("textarea"); document.body.appendChild(t); const e = new MouseEvent("contextmenu", { bubbles: true, cancelable: true }); t.dispatchEvent(e); t.remove(); return e.defaultPrevented; });
ok(menuTxt === false, "campos de texto continuam com o menu (colar)");

// ---------- 5) criador: atalho de rascunho e bolinhas de cor inteiras ----------
await p.locator(".story-circ").first().locator(".mais").tap();
await p.waitForSelector(".flash-criar", { timeout: 8000 }); await p.waitForTimeout(600);
await p.locator(".flash-modos button", { hasText: "Texto" }).tap(); await p.waitForTimeout(300);
ok(await p.locator(".flash-salvar-rasc").isHidden(), "sem nada feito, o atalho de rascunho fica escondido");
await p.keyboard.type("Rascunho rápido");
await p.waitForTimeout(200);
ok(!(await p.locator(".flash-salvar-rasc").isHidden()), "com algo escrito, aparece o atalho “Salvar rascunho”");
await p.locator(".flash-salvar-rasc").tap(); await p.waitForTimeout(500);
await p.locator("#folhaOpcoes.aberta button", { hasText: "Salvar e continuar" }).tap(); await p.waitForTimeout(1200);
await p.screenshot({ path: "saida/fresp-criador.png" });
const n = await p.evaluate(() => new Promise((ok2) => { const r = indexedDB.open("hf-flash-" + window.firebaseAuth?.currentUser?.uid, 1); r.onsuccess = () => { try { const t = r.result.transaction("rascunhos").objectStore("rascunhos").count(); t.onsuccess = () => ok2(t.result); t.onerror = () => ok2(-1); } catch { ok2(-2); } }; r.onerror = () => ok2(-3); }));
ok(await p.locator(".flash-criar").count() === 1 && n >= 1, `salvou sem sair do criador (rascunhos: ${n})`);
await p.locator(".flash-texto").blur();
await p.locator(".flash-ferr-btn[aria-label^='Figurinhas']").tap(); await p.waitForTimeout(300);
await p.locator(".fig-pilula", { hasText: "Enquete" }).tap(); await p.waitForTimeout(300);
await p.evaluate((c) => { for (let i = 0; i < 8 && !document.querySelector(".fv-card").classList.contains("tema-" + c); i++) document.querySelector(".fv-cor").click(); }, "verde"); await p.waitForTimeout(200);
ok(await p.locator(".fv-card.tema-verde").count() === 1, "botão de cor troca a cor do cartão");
await p.screenshot({ path: "saida/fresp-cores.png" });

ok(!erros.length, "sem erros na página" + (erros.length ? ": " + erros.slice(0, 3).join(" | ") : ""));
await browser.close();
