// Flash com o teclado aberto e o visor mais fácil de passar.
// - Criador: com o teclado (simulado encolhendo a tela com um campo focado), o cartão NÃO encolhe e os painéis
//   (Escrever, Mencionar, Caixa de perguntas) cabem na largura e ficam acima do teclado.
// - Escrever: letras com o nome, cores, alinhamento e a régua do tamanho; o texto sai alinhado na foto.
// - Visor: tocar nas beiradas passa/volta mesmo num flash com publicação; o balão "Ver publicação" só no miolo e só com
//   toque rápido; deslizar para o lado troca de pessoa (o cartão acompanha o dedo).
// - Visualizações: fita dos seus flashes, ações da pessoa (Mensagem, Ver perfil, Ocultar flashes).
// - Configurações do Flash: ícones sem cor.
// Uso: node t-flash-teclado.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, BASE, garantirImagem } from "./nav.mjs";
import { readFileSync } from "node:fs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const PX = "data:image/png;base64," + readFileSync(garantirImagem("saida/foto-ft.png", 900, 1600)).toString("base64");
for (const u of [U.ana, U.bruno]) for (const s of (await db.collection("stories").where("autorId", "==", u).get()).docs) await s.ref.delete();
await db.doc("diario/ftPost").set({ autorId: U.bruno, nome: "Bruno Reparos", texto: "Telhado novo", mediaUrl: PX, criadoEm: Timestamp.fromMillis(Date.now() - 5 * 60000) });
// Bruno: 3 flashes (o do meio com uma publicação compartilhada)
const fl = [];
for (let k = 0; k < 3; k++) fl.push((await db.collection("stories").add({ autorId: U.bruno, nome: "Bruno Reparos", tipo: "imagem", midia: PX, ...(k === 1 ? { postDe: { postId: "ftPost", autorId: U.bruno, nome: "Bruno Reparos" } } : {}), criadoEm: Timestamp.fromMillis(Date.now() - (30 - k) * 60000) })).id);
// Ana: 2 flashes, vistos pelo Bruno (com estrela no 2º)
const fa = [];
for (let k = 0; k < 2; k++) fa.push((await db.collection("stories").add({ autorId: U.ana, nome: "Ana Souza", tipo: "imagem", midia: PX, criadoEm: Timestamp.fromMillis(Date.now() - (20 - k) * 60000) })).id);
for (const id of fa) await db.doc(`stories/${id}/vistos/${U.bruno}`).set({ criadoEm: Timestamp.now() });
await db.doc(`stories/${fa[1]}/reacoes/${U.bruno}`).set({ curtiu: true, emoji: "🔥", em: Timestamp.now() });
await db.doc(`relacoes/${U.ana}_${U.bruno}`).set({ tipo: "seguir", seguidorId: U.ana, alvoId: U.bruno, criadoEm: Timestamp.now() }).catch(() => {});

const { browser, ctx } = await navegador({ mobile: true });
const p = await entrar(ctx, "ana", "feed.html");
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForTimeout(3500);
const W0 = 390, H0 = 844;
await p.setViewportSize({ width: W0, height: H0 });

// ---------- 1) criador: teclado ----------
await p.locator(".story-circ").first().locator(".mais").tap();
await p.waitForSelector(".flash-criar", { timeout: 8000 }); await p.waitForTimeout(600);
await p.locator(".flash-modos button", { hasText: "Texto" }).tap(); await p.waitForTimeout(400);
const antes = await p.locator(".flash-palco").boundingBox();
// "teclado": a tela encolhe com o campo focado
await p.locator(".flash-texto").focus();
await p.setViewportSize({ width: W0, height: 470 }); await p.waitForTimeout(500);
const depois = await p.locator(".flash-palco").boundingBox();
ok(Math.abs(depois.width - antes.width) < 2 && Math.abs(depois.height - antes.height) < 2, `modo Texto: o cartão não encolhe com o teclado (${Math.round(antes.width)}×${Math.round(antes.height)} → ${Math.round(depois.width)}×${Math.round(depois.height)})`);
ok(await p.locator(".flash-criar.teclado").count() === 1, "marca que o teclado está aberto");
const cx = await p.locator(".flash-texto").boundingBox();
ok(cx.y + cx.height <= 470 && cx.y >= 0, `texto fica acima do teclado (${Math.round(cx.y)}–${Math.round(cx.y + cx.height)} de 470)`);
await p.screenshot({ path: "saida/ft-texto-teclado.png" });
await p.locator(".flash-texto").blur();
await p.setViewportSize({ width: W0, height: H0 }); await p.waitForTimeout(400);
ok(await p.locator(".flash-criar.teclado").count() === 0, "teclado fechou: volta ao normal");

// foto da galeria para escrever por cima
await p.locator(".flash-modos button", { hasText: "Foto" }).tap(); await p.waitForTimeout(300);
const [fc] = await Promise.all([p.waitForEvent("filechooser", { timeout: 8000 }), p.locator(".flash-esc-btn", { hasText: "Galeria" }).click()]);
await fc.setFiles("saida/foto-ft.png");
await p.waitForSelector(".flash-fotobox", { timeout: 8000 }).catch(() => {});
await p.waitForTimeout(800);
const temFoto = await p.locator(".flash-fotobox").count() === 1;
ok(temFoto, "foto da galeria no cartão");

const largura = async (sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; }, sel);
async function comTeclado(sel, nome) {
  await p.waitForTimeout(250);
  const campo = await p.evaluate(() => document.activeElement?.tagName);
  await p.setViewportSize({ width: W0, height: 470 }); await p.waitForTimeout(500);
  const pal = await largura(".flash-palco");
  const pn = await largura(sel);
  const pronto = await largura(sel + " .fe-pronto");
  ok(pal && Math.abs(pal.r - pal.l - (antes.width)) < 2, `${nome}: cartão com a mesma largura com o teclado (${Math.round(pal.r - pal.l)} px; campo focado: ${campo})`);
  ok(pn && pn.b <= 472, `${nome}: painel acima do teclado (termina em ${Math.round(pn?.b)} de 470)`);
  ok(pronto && pronto.r <= pal.r + 1 && pronto.l >= pal.l, `${nome}: botão do topo inteiro à vista`);
  const corta = await p.evaluate((s) => [...document.querySelectorAll(s + " input:not([type=range]), " + s + " textarea, " + s + " strong")].some((e) => e.scrollWidth > e.parentElement.getBoundingClientRect().width + 40), sel);
  ok(!corta, `${nome}: nada cortado na largura`);
  await p.screenshot({ path: `saida/ft-${nome.toLowerCase().replace(/\W+/g, "-")}.png` });
  await p.evaluate(() => document.activeElement?.blur());
  await p.setViewportSize({ width: W0, height: H0 }); await p.waitForTimeout(400);
}
// Escrever (Aa)
await p.locator(".flash-ferr-btn[aria-label='Escrever na foto']").tap();
await p.locator(".fe-campo").fill("Bom dia\nFloripa");
ok(await p.locator(".fe-letra").count() >= 6 && await p.locator(".fe-letra", { hasText: "Manuscrita" }).count() === 1, "letras com o nome (" + await p.locator(".fe-letra").count() + ")");
ok(await p.locator(".fe-regua .fe-tam").count() === 1, "régua do tamanho na lateral");
await p.locator(".fe-campo").focus();
await comTeclado(".flash-edtxt", "Escrever");
await p.locator(".fe-letra", { hasText: "Clássica" }).tap();
await p.locator(".fe-alinha").tap(); // meio → esquerda
ok((await p.locator(".fe-campo").evaluate((e) => e.style.textAlign)) === "left", "alinhamento: à esquerda");
await p.locator(".fe-pronto").tap(); await p.waitForTimeout(300);
const txt = p.locator(".flash-camada .flash-txt").first();
ok((await txt.evaluate((e) => e.style.textAlign)) === "left" && /Georgia/.test(await txt.evaluate((e) => e.style.font)), "texto na foto com a letra e o alinhamento escolhidos");
// Mencionar e Caixa de perguntas
await p.locator(".flash-ferr-btn[aria-label^='Figurinhas']").tap(); await p.waitForTimeout(300);
await p.locator(".fig-op", { hasText: "Menção" }).tap(); await p.waitForTimeout(800);
await p.locator(".flash-figs .fe-local").focus();
await comTeclado(".flash-figs", "Mencionar");
await p.locator(".flash-figs .fe-pronto").tap();
await p.locator(".flash-ferr-btn[aria-label^='Figurinhas']").tap(); await p.waitForTimeout(300);
await p.locator(".fig-op", { hasText: "Perguntas" }).tap(); await p.waitForTimeout(400);
await p.locator(".flash-figs .enq-ed-perg").focus();
await comTeclado(".flash-figs", "Caixa de perguntas");
await p.locator(".flash-figs .fe-pronto").tap(); await p.waitForTimeout(300);
// configurações: ícones sem cor
await p.locator(".flash-ferr-btn[aria-label='Configurações do Flash']").tap(); await p.waitForSelector(".cfg2-ic", { timeout: 5000 });
const cores = await p.locator(".cfg2-ic").evaluateAll((l) => [...new Set(l.map((e) => getComputedStyle(e).backgroundImage + "|" + getComputedStyle(e).color))]);
ok(cores.length === 1 && cores[0].startsWith("none"), "Configurações do Flash: ícones sem cor, todos iguais → " + cores[0]);
await p.screenshot({ path: "saida/ft-config.png" });
await p.locator("#folhaLista.aberta [data-fechar]").first().click(); await p.waitForTimeout(300);
// publica e confere o desenho alinhado à esquerda
await p.locator(".flash-publicar").tap();
await p.waitForSelector(".flash-criar", { state: "detached", timeout: 15000 }).catch(() => {});
const meu = (await db.collection("stories").where("autorId", "==", U.ana).get()).docs.map((d) => d.data()).find((s) => s.caixa);
ok(!!meu?.midia && meu.caixa?.pergunta, "flash publicado com a caixa de perguntas");

// ---------- 2) visor: passar e voltar ----------
await p.goto(BASE + `feed.html?flash=${fl[0]}`); await p.waitForSelector(".story-visor", { timeout: 10000 }); await p.waitForTimeout(800);
const caixa = await p.locator(".story-caixa").boundingBox();
const tocar = async (fx, fy) => { await p.touchscreen.tap(caixa.x + caixa.width * fx, caixa.y + caixa.height * fy); await p.waitForTimeout(450); };
const qual = async () => p.evaluate(() => [...document.querySelectorAll(".story-barra i")].findIndex((i) => !i.style.width || i.style.width !== "100%"));
await tocar(0.85, 0.5);
ok(await p.locator(".story-post-area").count() === 1, "2º flash (com publicação) aberto pelo toque na direita");
const area = await p.locator(".story-post-area").boundingBox();
ok(area.width < caixa.width * 0.6, `área da publicação só no miolo (${Math.round(area.width)} de ${Math.round(caixa.width)} px)`);
await tocar(0.9, 0.5);
ok(await p.locator(".story-post-area").count() === 0 && await p.locator(".story-post.balao:visible").count() === 0, "tocar na beirada direita passa (sem balão)");
await tocar(0.1, 0.5);
ok(await p.locator(".story-post-area").count() === 1, "tocar na beirada esquerda volta");
// segurar no miolo: pausa, sem balão
await p.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
const cdp = await ctx.newCDPSession(p);
const toque = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
const cxm = caixa.x + caixa.width / 2, cym = caixa.y + caixa.height / 2;
await toque("touchStart", cxm, cym); await p.waitForTimeout(700); await toque("touchEnd", cxm, cym); await p.waitForTimeout(300);
ok(await p.locator(".story-post.balao:visible").count() === 0, "segurar na publicação não mostra o balão");
await tocar(0.5, 0.5);
ok(await p.locator(".story-post.balao:visible").count() === 1, "toque rápido no miolo mostra 'Ver publicação'");
await tocar(0.5, 0.5);
ok(await p.locator(".story-post.balao:visible").count() === 0, "outro toque esconde o balão");
// deslizar para o lado: o cartão acompanha o dedo e troca de pessoa
// pelo Diário (todas as pessoas em fila): abre o do Bruno e desliza para a direita (volta para a pessoa anterior)
await p.goto(BASE + "feed.html"); await p.waitForTimeout(3500);
await p.locator(".story-circ", { hasText: "Bruno" }).first().tap(); await p.waitForSelector(".story-visor", { timeout: 10000 }); await p.waitForTimeout(800);
const nome0 = await p.locator(".story-nome strong").textContent();
await toque("touchStart", cxm - 120, cym);
for (let k = 1; k <= 6; k++) { await toque("touchMove", cxm - 120 + k * 25, cym); await p.waitForTimeout(16); }
const tr = await p.locator(".story-caixa").evaluate((e) => e.style.transform);
ok(/translateX\(\d/.test(tr), "deslizando: o cartão acompanha o dedo → " + tr.slice(0, 40));
await toque("touchEnd", cxm + 30, cym); await p.waitForTimeout(700);
const nome1 = await p.locator(".story-nome strong").textContent().catch(() => "");
ok(nome1 && nome1 !== nome0, `deslizar troca de pessoa (${nome0} → ${nome1})`);
// gesto curto volta para o lugar
await toque("touchStart", cxm, cym); await toque("touchMove", cxm + 30, cym); await p.waitForTimeout(400); await toque("touchEnd", cxm + 30, cym); await p.waitForTimeout(500);
ok((await p.locator(".story-nome strong").textContent()) === nome1 && !(await p.locator(".story-caixa").evaluate((e) => e.style.transform)), "gesto curto e lento: volta para o lugar");

// ---------- 3) Visualizações ----------
await p.goto(BASE + `feed.html?flash=${fa[0]}`); await p.waitForSelector(".story-visor", { timeout: 10000 }); await p.waitForTimeout(800);
await p.locator(".story-vistos").tap(); await p.waitForSelector(".vv-pessoa", { timeout: 8000 }); await p.waitForTimeout(800);
ok(await p.locator(".vv-fita .vv-mini").count() >= 2, "fita com os seus flashes no ar (" + await p.locator(".vv-fita .vv-mini").count() + ")");
await p.waitForFunction(() => [...document.querySelectorAll(".vv-mini-n span")].every((s) => s.textContent !== "…"), null, { timeout: 5000 }).catch(() => {});
ok((await p.locator(".vv-mini-n span").allTextContents()).every((t) => /^\d+$/.test(t)), "cada miniatura com quantas pessoas viram");
await p.locator(".vv-mini").nth(1).tap(); await p.waitForTimeout(1200);
ok(await p.locator(".vv-pessoa .vv-foto .vv-est").count() === 1 && await p.locator(".vv-pessoa .vv-emoji").count() === 1, "trocar de flash na fita: estrela e 🔥 do Bruno como selos na foto");
await p.locator(".vv-opcoes").first().tap(); await p.waitForTimeout(200);
ok(await p.locator(".vv-acao").count() === 3, "⋯ da pessoa: Mensagem, Ver perfil e Ocultar flashes");
await p.screenshot({ path: "saida/ft-visualizacoes.png" });
await p.locator(".vv-acao", { hasText: "Ocultar" }).tap();
await p.locator(".hf-confirma .sim").tap(); await p.waitForTimeout(1200);
const cfg = (await db.doc(`usuarios/${U.ana}`).get()).data()?.flashConfig;
ok(cfg?.ocultarDe?.includes(U.bruno) && await p.locator(".vv-oculto").count() === 1, "Ocultar flashes grava e mostra 'Não vê mais os seus flashes'");

ok(!erros.length, "sem erros na página " + erros.join(" | "));
await browser.close();
