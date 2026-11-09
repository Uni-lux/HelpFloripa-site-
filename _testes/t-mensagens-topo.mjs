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
ok(await p.locator(".side-top .side-logo").isVisible() && (await p.locator(".side-tit h1").textContent()) === "Mensagens", "topo com a logo e “Mensagens”");
ok((await p.locator("#sideResumo").textContent()).startsWith("Help Floripa"), `linha de baixo: ${await p.locator("#sideResumo").textContent()}`);
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
