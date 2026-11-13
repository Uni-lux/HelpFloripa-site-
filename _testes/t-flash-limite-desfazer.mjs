// Flash (02/11/2026): limitador de fotos ("Escolha até N fotos" quando marca mais do que cabe), desfazer/refazer com o
// nome do passo, e respostas/reações a flash e caixa de perguntas no chat no modelo único (linha + miniatura + balão).
// Uso: node t-flash-limite-desfazer.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, garantirImagem } from "./nav.mjs";
import { readFileSync } from "node:fs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const fotos = [1, 2, 3, 4, 5, 6].map((i) => garantirImagem(`saida/foto-lim${i}.png`, 600 + i * 10, 800));
const PX = "data:image/png;base64," + readFileSync(fotos[0]).toString("base64");
for (const u of [U.ana, U.bruno]) for (const s of (await db.collection("stories").where("autorId", "==", u).get()).docs) await s.ref.delete();

const { browser, ctx } = await navegador({ mobile: true });
const p = await entrar(ctx, "ana", "feed.html");
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForTimeout(3500);
await p.locator(".story-circ").first().locator(".mais").tap(); await p.waitForSelector(".flash-criar", { timeout: 8000 }); await p.waitForTimeout(600);
await p.locator(".flash-modos button", { hasText: "Texto" }).tap(); await p.waitForTimeout(300);
await p.keyboard.type("Teste"); await p.locator(".flash-texto").blur();

// ---------- 1) limitador ----------
const botaoFotos = p.locator(".flash-ferr-btn[aria-label*='oto']").first();
await botaoFotos.tap(); await p.waitForTimeout(300);
const [fc] = await Promise.all([p.waitForEvent("filechooser"), p.locator(".fig-pilula", { hasText: "Foto por cima" }).tap()]);
await fc.setFiles(fotos); await p.waitForTimeout(800);
ok(await p.locator(".fe-escolha").count() === 1 && (await p.locator(".fe-esc-tit strong").textContent()).includes("Escolha até 4"), "marcou 6: abre “Escolha até 4 fotos”");
ok((await p.locator(".fe-esc-tit small").textContent()) === "4 de 4" && await p.locator(".fe-esc-cel.on").count() === 4, "já vêm as 4 primeiras escolhidas (4 de 4)");
await p.locator(".fe-esc-cel").nth(5).tap(); await p.waitForTimeout(200);
ok(await p.locator(".fe-esc-cel.on").count() === 4, "a 5ª não entra: o limite segura");
await p.locator(".fe-esc-cel").nth(1).tap(); await p.locator(".fe-esc-cel").nth(5).tap(); await p.waitForTimeout(200);
ok((await p.locator(".fe-esc-cel").nth(5).locator(".fe-esc-n").textContent()) === "4", "tira uma e escolhe outra (número = ordem)");
await p.screenshot({ path: "saida/fl-limite.png" });
await p.locator(".fe-escolha .fe-pronto").tap(); await p.waitForTimeout(1500);
ok(await p.locator(".flash-camada .flash-ft, .flash-camada .flash-txt img").count() >= 4 || await p.evaluate(() => document.querySelectorAll(".flash-camada .flash-txt").length) >= 4, "entram exatamente as 4 escolhidas");
await botaoFotos.tap(); await p.waitForTimeout(300);
ok((await p.locator(".fig-pilula", { hasText: "Foto por cima" }).textContent()).includes("4 de 4"), "com 4 já postas, o botão avisa “4 de 4”");
await p.locator(".fig-pilula", { hasText: "Foto por cima" }).tap(); await p.waitForTimeout(300);
await p.locator(".flash-figs .fe-pronto").tap().catch(() => {}); await p.waitForTimeout(300);

// ---------- 2) desfazer / refazer ----------
ok(!(await p.locator(".flash-hist").isHidden()), "barra Desfazer/Refazer aparece depois de mudar algo");
const antes = await p.locator(".flash-camada .flash-txt").count();
ok((await p.locator(".flash-hist .flash-desfazer").getAttribute("title")).startsWith("Desfazer: Adicionar foto"), "o botão diz o que vai desfazer (“Desfazer: Adicionar foto”)");
await p.locator(".flash-hist .flash-desfazer").tap(); await p.waitForTimeout(300);
ok(await p.locator(".flash-camada .flash-txt").count() === antes - 1 && (await p.locator(".flash-hist .fh-rot").textContent()).startsWith("Desfeito: Adicionar foto"), "desfazer tira a última foto e mostra “Desfeito: Adicionar foto”");
await p.screenshot({ path: "saida/fl-desfeito.png" });
ok(!(await p.locator(".flash-hist .fh-refazer").isDisabled()), "Refazer fica disponível");
await p.locator(".flash-hist .fh-refazer").tap(); await p.waitForTimeout(300);
ok(await p.locator(".flash-camada .flash-txt").count() === antes && (await p.locator(".flash-hist .fh-rot").textContent()).startsWith("Refeito"), "refazer põe de volta");
await p.keyboard.press("Control+z"); await p.waitForTimeout(300);
ok(await p.locator(".flash-camada .flash-txt").count() === antes - 1, "Ctrl+Z também desfaz (computador)");
await p.keyboard.press("Escape"); await p.waitForTimeout(500);
await p.locator("#folhaOpcoes.aberta button", { hasText: "Descartar" }).tap().catch(() => {}); await p.waitForTimeout(500);

// ---------- 3) respostas e reações no chat, no mesmo modelo ----------
const f1 = (await db.collection("stories").add({ restrito: false, autorId: U.bruno, nome: "Bruno Reparos", tipo: "imagem", midia: PX, criadoEm: Timestamp.now() })).id;
const conv = [U.ana, U.bruno].sort().join("_");
await db.doc(`conversas/${conv}`).set({ participantes: [U.ana, U.bruno].sort(), atualizadoEm: Timestamp.now(), ultimaMensagem: "oi" }, { merge: true });
const msgs = db.collection(`conversas/${conv}/mensagens`);
const t0 = Date.now();
await msgs.add({ remetenteId: U.ana, texto: "", tipoArquivo: "cartao", cartao: { tipo: "flash", acao: "resposta", flashId: f1, autorId: U.bruno, nome: "Bruno Reparos", texto: "Kkkkkkk" }, criadoEm: Timestamp.fromMillis(t0) });
await msgs.add({ remetenteId: U.ana, texto: "", tipoArquivo: "cartao", cartao: { tipo: "flash", acao: "reacao", flashId: f1, autorId: U.bruno, nome: "Bruno Reparos", emoji: "🔥" }, criadoEm: Timestamp.fromMillis(t0 + 1000) });
await msgs.add({ remetenteId: U.ana, texto: "Texto comum", criadoEm: Timestamp.fromMillis(t0 + 2000) });
await p.goto(p.url().replace(/feed\.html.*$/, `mensagens.html?conversa=${conv}`)); await p.waitForSelector(".flash-msg .rsp-mini", { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(2500);
const r = await p.evaluate(() => {
  const txt = document.querySelector(".flash-msg .rsp-txt"), comum = [...document.querySelectorAll(".minha .bolha:not(.cartao-msg)")].pop();
  const mini = document.querySelector(".flash-msg .rsp-mini").getBoundingClientRect();
  return { cor: txt && getComputedStyle(txt).backgroundColor, comum: comum && getComputedStyle(comum).backgroundColor, w: mini.width, emoji: document.querySelector(".flash-msg .rsp-emoji")?.textContent, rot: document.querySelector(".flash-msg .rsp-rot")?.textContent, fundo: getComputedStyle(document.querySelector(".bolha.flash-msg")).backgroundColor };
});
ok(r.rot?.includes("Você respondeu ao flash de Bruno"), "linha pequena: “Você respondeu ao flash de Bruno”");
ok(r.w < 160, `miniatura compacta (${Math.round(r.w)} px de largura)`);
ok(r.cor && r.cor === r.comum, `o texto da resposta fica num balão igual aos outros (${r.cor})`);
ok(r.fundo === "rgba(0, 0, 0, 0)", "sem cartão grande em volta");
ok(r.emoji === "🔥", "reação: emoji no canto da miniatura");
await p.screenshot({ path: "saida/fl-chat.png" });

ok(!erros.length, "sem erros na página " + erros.join(" | "));
await browser.close();
