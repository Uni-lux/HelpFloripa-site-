// Flash, parte 2 dos prints de 02/11/2026:
// - cartão de ponta a ponta no celular; todo flash começa "para todos" (mesmo com Amigos próximos nas configurações)
// - figurinhas no modo Texto (enquete publicada num flash de texto)
// - pinça e giro com dois dedos (o 2º dedo pode cair fora da figurinha)
// - foto por cima (moldura muda com um toque), modelo com várias fotos
// - a mesma pessoa não é mencionada duas vezes; menção "Só na lista" (não vai desenhada, mas aparece na lista)
// - prévia da cor ao vivo no editor da enquete; sem o menu "baixar imagem" ao segurar o flash
// Uso: node t-flash-gestos.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, garantirImagem } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
garantirImagem("saida/foto-g1.png", 900, 1600); garantirImagem("saida/foto-g2.png", 1200, 800);
for (const s of (await db.collection("stories").where("autorId", "==", U.ana).get()).docs) await s.ref.delete();
await db.doc(`relacoes/${U.ana}_${U.bruno}`).set({ tipo: "seguir", seguidorId: U.ana, alvoId: U.bruno, criadoEm: Timestamp.now() });
// Ana tinha deixado "Amigos próximos" nas configurações
await db.doc(`usuarios/${U.ana}`).set({ flashConfig: { publico: "amigos", amigos: [U.bruno] } }, { merge: true });

const { browser, ctx } = await navegador({ mobile: true });
const p = await entrar(ctx, "ana", "feed.html");
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForTimeout(3500);
const cdp = await ctx.newCDPSession(p);
const toques = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
async function pinca(cx, cy, d0, d1, ang = 0) {
  const pt = (d, a) => [[cx - d * Math.cos(a), cy - d * Math.sin(a)], [cx + d * Math.cos(a), cy + d * Math.sin(a)]];
  await toques("touchStart", [pt(d0, 0)[0]]); await p.waitForTimeout(40);
  await toques("touchMove", pt(d0, 0)); await toques("touchStart", pt(d0, 0)); await p.waitForTimeout(40);
  for (let k = 1; k <= 8; k++) { await toques("touchMove", pt(d0 + ((d1 - d0) * k) / 8, (ang * k) / 8)); await p.waitForTimeout(20); }
  await toques("touchEnd", []); await p.waitForTimeout(300);
}

// ---------- 1) tela cheia e começa para todos ----------
await p.locator(".story-circ").first().locator(".mais").tap();
await p.waitForSelector(".flash-criar", { timeout: 8000 }); await p.waitForTimeout(700);
const pal = await p.locator(".flash-palco").boundingBox();
ok(pal.width >= 389, `cartão de ponta a ponta (${Math.round(pal.width)} de 390 px)`);
ok(await p.locator(".flash-amigos.on").count() === 0 && (await p.locator(".flash-publicar").textContent()).includes("Compartilhar"), "começa para todos (não em Amigos próximos)");

// ---------- 2) Texto com figurinhas ----------
await p.locator(".flash-modos button", { hasText: "Texto" }).tap(); await p.waitForTimeout(400);
await p.keyboard.type("Bom dia");
ok(await p.locator(".flash-ferr-btn[aria-label^='Figurinhas']").count() === 1, "modo Texto tem Figurinhas");
await p.locator(".flash-texto").blur();
await p.locator(".flash-ferr-btn[aria-label^='Figurinhas']").tap(); await p.waitForTimeout(300);
await p.locator(".fig-pilula", { hasText: "Emoji" }).tap(); await p.waitForTimeout(200);
await p.locator(".fig-emojis button").first().tap(); await p.waitForTimeout(300);
const em = p.locator(".flash-camada .flash-txt").first();
const b0 = await em.boundingBox();
// pinça: o 2º dedo cai fora do emoji
await pinca(b0.x + b0.width / 2, b0.y + b0.height / 2, 30, 90, 0.6);
const b1 = await em.boundingBox();
const rot = await em.evaluate((e) => e.style.transform);
ok(b1.width > b0.width * 1.8, `pinça aumenta o emoji (${Math.round(b0.width)} → ${Math.round(b1.width)} px)`);
ok(/rotate\(/.test(rot), `dois dedos giram (${rot})`);
await pinca(b1.x + b1.width / 2, b1.y + b1.height / 2, 90, 40, 0);
const b2 = await em.boundingBox();
ok(b2.width < b1.width * 0.8, `pinça diminui (${Math.round(b1.width)} → ${Math.round(b2.width)} px)`);
// enquete no flash de texto, com a prévia da cor ao vivo
await p.locator(".flash-ferr-btn[aria-label^='Figurinhas']").tap(); await p.waitForTimeout(300);
await p.locator(".fig-pilula", { hasText: "Enquete" }).tap(); await p.waitForTimeout(300);
await p.locator(".fv-perg").fill("Café ou chá?");
await p.evaluate((c) => { for (let i = 0; i < 8 && !document.querySelector(".fv-card").classList.contains("tema-" + c); i++) document.querySelector(".fv-cor").click(); }, "verde"); await p.waitForTimeout(150);
ok(await p.locator(".fv-card.tema-verde").count() === 1 && (await p.locator(".fv-perg").inputValue()) === "Café ou chá?", "o cartão muda de cor na hora (com a pergunta)");
await p.screenshot({ path: "saida/fg-enquete-previa.png" });
await p.locator(".flash-fig-viva .fe-pronto").tap(); await p.waitForTimeout(300);
await p.screenshot({ path: "saida/fg-texto.png" });
await p.locator(".flash-publicar").tap();
await p.waitForSelector(".flash-criar", { state: "detached", timeout: 15000 }).catch(() => {});
await p.waitForTimeout(1200);
let meus = (await db.collection("stories").where("autorId", "==", U.ana).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const fTexto = meus[0] || {};
ok(meus.length === 1 && fTexto.enquete?.pergunta === "Café ou chá?" && fTexto.enquete?.cor === "verde", "flash de texto publicado com a enquete verde");
ok(!fTexto.publico, "publicado para todos (sem lista de Amigos próximos)");

// ---------- 3) fotos: modelo, foto por cima, menções ----------
await p.waitForTimeout(800);
await p.locator(".story-circ").first().locator(".mais").tap();
await p.waitForSelector(".flash-criar", { timeout: 8000 }); await p.waitForTimeout(600);
await p.locator(".flash-modos button", { hasText: "Texto" }).tap(); await p.waitForTimeout(300);
await p.locator(".flash-texto").blur();
await p.locator(".flash-ferr-btn[aria-label^='Fotos']").tap(); await p.waitForTimeout(300);
ok(await p.locator(".fm-modelo").count() === 6, "6 modelos com várias fotos");
const [fc] = await Promise.all([p.waitForEvent("filechooser"), p.locator(".fm-modelo").first().tap()]);
await fc.setFiles(["saida/foto-g1.png", "saida/foto-g2.png"]);
await p.waitForSelector(".flash-fotobox img, .flash-fotobox canvas", { timeout: 8000 }).catch(() => {});
await p.waitForTimeout(800);
ok(await p.locator(".flash-fotobox").count() === 1, "modelo vira a foto do flash (2 empilhadas)");
await p.locator(".flash-ferr-btn[aria-label^='Fotos']").tap(); await p.waitForTimeout(300);
const [fc2] = await Promise.all([p.waitForEvent("filechooser"), p.locator(".fig-pilula", { hasText: "Foto por cima" }).tap()]);
await fc2.setFiles(["saida/foto-g2.png"]);
await p.waitForSelector(".flash-ft", { timeout: 8000 }).catch(() => {});
await p.waitForTimeout(400);
ok(await p.locator(".flash-ft.ft-1").count() === 1, "foto por cima com moldura branca");
await p.locator(".flash-ft").tap(); await p.waitForTimeout(200);
ok(await p.locator(".flash-ft.ft-2").count() === 1, "um toque troca a moldura (redonda)");
const fb0 = await p.locator(".flash-ft").boundingBox();
await pinca(fb0.x + fb0.width / 2, fb0.y + fb0.height / 2, 40, 20, 0);
const fb1 = await p.locator(".flash-ft").boundingBox();
ok(fb1.width < fb0.width * 0.8, `pinça diminui a foto por cima (${Math.round(fb0.width)} → ${Math.round(fb1.width)} px)`);
// menção 2 vezes
for (let k = 0; k < 2; k++) {
  await p.locator(".flash-ferr-btn[aria-label^='Figurinhas']").tap(); await p.waitForTimeout(300);
  await p.locator(".fig-pilula", { hasText: "Menção" }).tap(); await p.waitForTimeout(900);
  if (k === 1) ok(await p.locator(".fm-escolher .fm-linha.ja", { hasText: "brunoreparos" }).count() === 1, "quem já foi mencionado aparece como “já mencionado”");
  await p.locator(".flash-figs .fm-usar", { hasText: "brunoreparos" }).first().tap({ force: true }); await p.waitForTimeout(300);
  if (k === 0) await p.locator(".fm-usar-todos").tap(); else await p.locator(".flash-figs .fe-pronto").first().tap().catch(() => {});
  await p.waitForTimeout(300);
}
ok((await p.locator(".flash-arroba .flash-onde-n").textContent()) === "1", "a mesma pessoa não é mencionada duas vezes");
await p.locator(".flash-arroba").tap(); await p.waitForTimeout(500);
ok(await p.locator(".fm-seg-op.on", { hasText: "Na lista" }).count() === 1 && await p.locator(".flash-fig.fig-mencao").count() === 0, "menção vai “Na lista” (sem @ na foto)");
await p.screenshot({ path: "saida/fg-mencoes.png" });
await p.locator(".flash-mencoes .fe-pronto").tap(); await p.waitForTimeout(200);
await p.screenshot({ path: "saida/fg-foto.png" });
await p.locator(".flash-publicar").tap();
await p.waitForSelector(".flash-criar", { state: "detached", timeout: 15000 }).catch(() => {});
await p.waitForTimeout(1200);
meus = (await db.collection("stories").where("autorId", "==", U.ana).get()).docs.map((d) => ({ id: d.id, ...d.data() })).filter((d) => d.id !== fTexto.id);
const fFoto = meus[0] || {};
ok(JSON.stringify(fFoto.mencoes) === JSON.stringify([U.bruno]) && !fFoto.mencoesOcultas && !(fFoto.toques || []).some((t) => t.startsWith("m|")), "Só na lista: está nas menções, sem figurinha tocável");

// ---------- 4) visor: responder com o teclado aberto não encolhe o flash ----------
const PXB = "data:image/png;base64," + (await import("node:fs")).readFileSync("saida/foto-g1.png").toString("base64");
const fBruno = (await db.collection("stories").add({ autorId: U.bruno, nome: "Bruno Reparos", tipo: "imagem", midia: PXB, caixa: { pergunta: "Me faça uma pergunta", anonima: false, x: 0.5, y: 0.3 }, criadoEm: Timestamp.now() })).id;
await p.goto(p.url().split("?")[0] + `?flash=${fBruno}`); await p.waitForTimeout(3500);
await p.waitForSelector(".story-visor .story-responder input", { timeout: 10000 }).catch(() => {});
const q0 = await p.locator(".story-quadro").boundingBox();
await p.locator(".story-cx textarea").focus();
await p.setViewportSize({ width: 390, height: 430 }); await p.waitForTimeout(500);
const q1 = await p.locator(".story-quadro").boundingBox();
ok(q0 && q1 && Math.abs(q1.width - q0.width) < 2, `teclado aberto: o flash não diminui (${Math.round(q0?.width)} → ${Math.round(q1?.width)} px)`);
await p.screenshot({ path: "saida/fg-visor-teclado.png" });
await p.locator(".story-cx textarea").blur();
await p.setViewportSize({ width: 390, height: 780 }); await p.waitForTimeout(500);
await p.keyboard.press("Escape"); await p.waitForTimeout(300);
await db.doc(`stories/${fBruno}`).delete();

// ---------- 5) visor: segurar não abre o menu do navegador ----------
await p.goto(p.url().split("?")[0] + `?flash=${fFoto.id}`); await p.waitForTimeout(3500);
await p.waitForSelector(".story-visor .story-palco img", { timeout: 10000 }).catch(() => {});
const bloqueado = await p.evaluate(() => { const im = document.querySelector(".story-visor .story-palco img"); if (!im) return null; const e = new MouseEvent("contextmenu", { bubbles: true, cancelable: true }); im.dispatchEvent(e); return e.defaultPrevented; });
ok(bloqueado === true, "segurar o flash não abre o menu de baixar imagem");

ok(!erros.length, "sem erros na página" + (erros.length ? ": " + erros.slice(0, 3).join(" | ") : ""));
await db.doc(`usuarios/${U.ana}`).set({ flashConfig: { publico: "todos" } }, { merge: true });
await browser.close();
