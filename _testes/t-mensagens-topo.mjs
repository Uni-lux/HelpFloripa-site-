// Mensagens (09/11/2026, prints do dono): topo da lista no jeito dos mensageiros (logo + "Mensagens" + "Help Floripa · N não
// lidas", busca antes das abas sublinhadas), faixa do atendimento compacta (pílula de uma linha), citação com contraste e
// foto do topo da conversa sem o anel que parecia flash. Uso: node t-mensagens-topo.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const CONV = [U.ana, U.bruno].sort().join("_");
const ref = await db.collection(`conversas/${CONV}/mensagens`).add({ remetenteId: U.bruno, texto: "Posso passar amanhã às 14h?", criadoEm: FieldValue.serverTimestamp() });
await db.collection(`conversas/${CONV}/mensagens`).add({ remetenteId: U.ana, texto: "Pode sim, te espero!", resposta: { id: ref.id, texto: "Posso passar amanhã às 14h?", remetenteId: U.bruno }, criadoEm: FieldValue.serverTimestamp() });

const A = await navegador({ mobile: true });
await A.ctx.addInitScript(() => { try { localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" })); } catch {} });
const p = await entrar(A.ctx, "ana", "mensagens.html");
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector('.modos [data-modo="negocios"]'); await p.waitForTimeout(2500);
ok(await p.locator(".side-top .side-logo").count() === 0 && (await p.locator(".side-tit h1").textContent()) === "Mensagens", "topo sem a logo, só “Mensagens”");
ok(!/Help Floripa/.test(await p.locator(".side-top").textContent()), "topo sem a marca “Help Floripa”");
const nl = p.locator("#sideResumo");
ok(await nl.isHidden() || /^\d+\+?$/.test(await nl.textContent()), `não lidas só como número ao lado do título (${await nl.textContent()})`);
const [appH, winH, bordaBarra] = await p.evaluate(() => [document.querySelector(".app").getBoundingClientRect().height, innerHeight, getComputedStyle(document.querySelector(".barra-rede")).borderLeftWidth]);
ok(Math.abs(appH - winH) <= 1, `página ocupa a janela inteira (${appH} de ${winH})`);
ok(bordaBarra === "0px", `barra de baixo sem a borda em volta (${bordaBarra})`);
// Android de ponta a ponta: a parte visível é menor que a janela (faixa de gestos). A página não pode encolher.
const encolhe = await p.evaluate(() => { Object.defineProperty(visualViewport, "height", { get: () => innerHeight - 48, configurable: true }); window.__hfMedirTela(); return document.querySelector(".app").getBoundingClientRect().height; });
ok(Math.abs(encolhe - winH) <= 1, `com a faixa de gestos fora da parte visível, continua do tamanho da janela (${encolhe})`);
const comTeclado = await p.evaluate(() => { Object.defineProperty(visualViewport, "height", { get: () => innerHeight - 300, configurable: true }); window.__hfMedirTela(); const h = document.querySelector(".app").getBoundingClientRect().height; delete visualViewport.height; Object.defineProperty(visualViewport, "height", { get: () => innerHeight, configurable: true }); window.__hfMedirTela(); return h; });
ok(Math.abs(comTeclado - (winH - 300)) <= 1, `com o teclado aberto, encolhe até o teclado (${comTeclado})`);
const ordem = await p.evaluate(() => { const b = document.querySelector("#buscaConversas").getBoundingClientRect().top, m = document.querySelector(".modos").getBoundingClientRect().top; return b < m; });
ok(ordem, "busca antes das abas");
ok(await p.locator('.modos [aria-selected="true"]').evaluate((e) => getComputedStyle(e, "::after").height) === "3px", "aba atual sublinhada");
await p.screenshot({ path: "saida/topo-lista.png" });

await p.goto(p.url().replace(/mensagens\.html.*/, `mensagens.html?conversa=${CONV}`));
await p.waitForSelector("body.chat-aberto"); await p.waitForTimeout(2500);
const faixa = p.locator("#faixaAtend");
if (await faixa.isVisible()) {
  const b = await faixa.boundingBox(); const vw = p.viewportSize().width;
  ok(b.height <= 34 && b.width < vw - 20, `faixa do atendimento é uma pílula pequena (${Math.round(b.width)}×${Math.round(b.height)})`);
  await faixa.tap(); await p.waitForTimeout(600);
  ok(await p.locator(".pv-fundo").count() > 0, "tocar na pílula abre a gaveta com tudo");
  await p.keyboard.press("Escape"); await p.goBack().catch(() => {}); await p.waitForTimeout(400);
} else ok(false, "faixa do atendimento aparece (Bruno tem atendimento no seed)");
const anel = await p.locator(".chat-top .avatar").first().evaluate((e) => getComputedStyle(e).boxShadow);
ok(anel === "none", `foto do topo sem anel (${anel})`);
const cit = p.locator(".linha-msg.minha .citacao").last();
await cit.scrollIntoViewIfNeeded();
const [fc, fb] = await cit.evaluate((e) => [getComputedStyle(e).backgroundColor, getComputedStyle(e.closest(".bolha")).backgroundImage]);
ok(fc === "rgb(12, 31, 43)", `citação no seu balão com cor própria, opaca (${fc})`);
await p.screenshot({ path: "saida/topo-conversa.png" });
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close();
