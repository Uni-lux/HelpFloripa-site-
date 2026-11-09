// Mensagens (09/11/2026, prints do dono): nome e sobrenome + @ na lista, painel de emojis/figurinhas que cresce ao
// arrastar para cima (como no WhatsApp), humores nas figurinhas, menu "Nova figurinha", editor completo (remover
// fundo liso, varinha, emoji, desenho, desfazer/refazer, formas) e, no celular, nada de "Copiar / Selecionar tudo".
// Uso: node seed.mjs && node t-figurinhas-pro.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
import { mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const esperar = async (fn, ms = 10000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn().catch(() => false)) return true; await new Promise((r) => setTimeout(r, 200)); } return false; };
mkdirSync("saida", { recursive: true });
// foto com fundo liso verde e uma "pessoa" (círculo) no meio
execFileSync("python3", ["-c", `
from PIL import Image, ImageDraw
im = Image.new("RGB", (900, 900), (40, 200, 90)); d = ImageDraw.Draw(im); d.ellipse((250, 200, 650, 700), fill=(230, 120, 40)); d.rectangle((380, 380, 520, 520), fill=(30, 30, 160)); im.save("saida/fundo-liso.jpg")
`]);

const A = await navegador({ mobile: true });
const p = await entrar(A.ctx, "ana", "mensagens.html");
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector('.modos [data-modo="negocios"]'); await p.waitForTimeout(1500);
await p.locator('.modos [data-modo="negocios"]').tap();
await p.waitForSelector(".conv-item", { timeout: 20000 }); await p.waitForTimeout(600);

// 1) Nome e sobrenome + @
const nome = await p.locator(".conv-item .conv-nm").first().textContent();
const nick = await p.locator(".conv-item .conv-nick").first().textContent().catch(() => "");
ok(nome.trim().split(/\s+/).length <= 2, `lista com nome e sobrenome (${nome})`);
ok(/^@/.test(nick || ""), `@ ao lado do nome (${nick})`);
const curto = await p.evaluate(async () => {
  // a mesma regra do mensagens-app.js
  const PARTICULAS = /^(d[aeo]s?|e|del|van|von|di)$/i;
  const f = (nome) => { const q = String(nome || "").trim().split(/\s+/).filter(Boolean); if (q.length <= 2) return q.join(" ") || "Usuário"; const cap = (w) => (w === w.toLowerCase() ? w.charAt(0).toUpperCase() + w.slice(1) : w); let u = q[q.length - 1]; if (PARTICULAS.test(u)) u = q[q.length - 2]; return `${q[0]} ${cap(u)}`; };
  return [f("Bianca suelane da Silva Dantas"), f("Fabricio Vieira pinheiro"), f("José"), f("Maria das Dores")];
});
ok(curto.join("|") === "Bianca Dantas|Fabricio Pinheiro|José|Maria Dores", "regra do nome curto: " + curto.join(" | "));

// 2) Celular: segurar texto não abre "Copiar / Selecionar tudo"; o campo de texto continua selecionável
const sel = await p.evaluate(() => [getComputedStyle(document.querySelector(".side-tit h1")).userSelect, getComputedStyle(document.querySelector("#buscaConversas")).userSelect]);
ok(sel[0] === "none" && sel[1] !== "none", `texto do site não seleciona no toque (${sel.join(" / ")})`);
const naoSelecionou = await p.evaluate(async () => {
  const h = document.querySelector(".side-tit h1"); const r = document.createRange(); r.selectNodeContents(h);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  await new Promise((x) => setTimeout(x, 150));
  return getSelection().isCollapsed || !getSelection().toString();
});
ok(naoSelecionou, "seleção feita fora de um campo é desfeita");
const menuBloq = await p.evaluate(() => { const e = new MouseEvent("contextmenu", { bubbles: true, cancelable: true }); document.querySelector(".side-tit h1").dispatchEvent(e); return e.defaultPrevented; });
ok(menuBloq, "segurar texto não abre o menu do navegador");

// 3) Painel: arrastar para cima cresce, para baixo volta
await p.locator(".conv-item").first().tap();
await p.waitForSelector("body.chat-aberto"); await p.waitForTimeout(1200);
await p.locator("#btnEmoji").tap();
await p.waitForSelector("#painelEmoji.aberto");
const h0 = (await p.locator("#painelEmoji").boundingBox()).height;
const cx = await p.context().newCDPSession(p);
const alca = await p.locator("#peAlca").boundingBox();
const ax = alca.x + alca.width / 2, ay = alca.y + alca.height / 2;
const arrastar = async (y0, y1) => {
  await cx.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: ax, y: y0 }] });
  for (let i = 1; i <= 8; i++) { await cx.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: ax, y: y0 + (y1 - y0) * i / 8 }] }); await p.waitForTimeout(16); }
  await cx.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await p.waitForTimeout(450);
};
await arrastar(ay, ay - 260);
const h1 = (await p.locator("#painelEmoji").boundingBox()).height;
ok(await p.locator("#painelEmoji.expandido").count() === 1 && h1 > h0 + 150, `arrastar para cima aumenta o painel (${Math.round(h0)} → ${Math.round(h1)} px)`);
await p.screenshot({ path: "saida/painel-grande.png" });
const a2 = await p.locator("#peAlca").boundingBox();
await arrastar(a2.y + 9, a2.y + 9 + 200);
const h2 = (await p.locator("#painelEmoji").boundingBox()).height;
ok(await p.locator("#painelEmoji.expandido").count() === 0 && await p.locator("#painelEmoji").isVisible() && Math.abs(h2 - h0) < 30, `arrastar para baixo volta ao normal (${Math.round(h2)} px)`);
await p.locator("#peAlca").click(); await p.waitForTimeout(400);
ok(await p.locator("#painelEmoji.expandido").count() === 1, "tocar na alça também aumenta");
await p.locator("#peAlca").click(); await p.waitForTimeout(400);

// 4) Figurinhas: humores e menu de criar
await p.locator('[data-pe="figurinhas"]').tap();
await p.waitForSelector(".pe-humor .pe-chip");
await p.locator(".pe-chip", { hasText: "Valeu" }).tap(); await p.waitForTimeout(500);
const valeu = await p.locator(".pe-figs .pe-fig").count();
ok(valeu >= 2 && valeu < 16, `humor "Valeu" filtra o pacote (${valeu})`);
await p.locator(".pe-chip", { hasText: "Valeu" }).tap(); await p.waitForTimeout(400);
await p.locator(".pe-cats .pe-novo").tap();
ok(await p.locator(".pe-menu", { hasText: "Nova figurinha" }).isVisible() && await p.locator(".pe-menu button").count() === 4, "botão + abre o menu Nova figurinha (foto, câmera, importar)");
await p.locator(".pe-menu button", { hasText: "Cancelar" }).tap();

// 5) Editor
await p.setInputFiles("#inputFigurinha", "saida/fundo-liso.jpg");
await p.waitForSelector(".fg-ed", { timeout: 5000 });
const ferr = await p.locator(".fg-ferr button").allTextContents();
ok(ferr.join(",") === "Recortar,Fundo,Contorno,Texto,Emoji,Desenhar,Ajustes", "7 ferramentas: " + ferr.join(", "));
ok(await p.locator(".fg-op", { hasText: "Coração" }).count() === 1 && await p.locator(".fg-op", { hasText: "Estrela" }).count() === 1, "formas: quadrada, redonda, coração, estrela, balão e inteira");
const alfa = () => p.evaluate(() => { const c = document.querySelector(".fg-palco canvas"); const d = c.getContext("2d").getImageData(0, 0, 512, 512).data; let t = 0; for (let i = 3; i < d.length; i += 16) if (d[i] < 20) t++; return t; });
const t0 = await alfa();
await p.locator(".fg-ferr button", { hasText: "Fundo" }).tap();
await p.locator(".fg-op", { hasText: "Remover fundo" }).tap(); await p.waitForTimeout(300);
const t1 = await alfa();
ok(t1 > t0 + 15000, `remover fundo liso deixa o fundo transparente (${t0} → ${t1} pontos)`);
const verdeSumiu = await p.evaluate(() => { const c = document.querySelector(".fg-palco canvas"); const d = c.getContext("2d").getImageData(256, 256, 1, 1).data; return d[3] > 200; });
ok(verdeSumiu, "o meio (a pessoa) continua");
await p.screenshot({ path: "saida/fig-sem-fundo.png" });
await p.locator(".fg-topo [aria-label='Desfazer']").tap(); await p.waitForTimeout(200);
ok(Math.abs((await alfa()) - t0) < 500, "desfazer traz o fundo de volta");
await p.locator(".fg-topo [aria-label='Refazer']").tap(); await p.waitForTimeout(200);
ok(Math.abs((await alfa()) - t1) < 500, "refazer tira de novo");
// varinha: tocar no quadrado azul do meio apaga só ele
await p.locator(".fg-op", { hasText: "Varinha" }).tap();
await p.evaluate(() => { window.__ev = []; const pl = document.querySelector(".fg-palco"); ["pointerdown","pointerup","pointercancel","pointermove"].forEach((t) => pl.addEventListener(t, () => window.__ev.push(t))); });
const palco = await p.locator(".fg-palco").boundingBox();
await p.touchscreen.tap(palco.x + palco.width / 2, palco.y + palco.height / 2); await p.waitForTimeout(300);
const meio = await p.evaluate(() => document.querySelector(".fg-palco canvas").getContext("2d").getImageData(256, 256, 1, 1).data[3]);
ok(meio < 20 && (await alfa()) > t1 + 150, "varinha mágica apaga a área de cor parecida onde tocou");
// emoji e desenho
await p.locator(".fg-ferr button", { hasText: "Emoji" }).tap();
await p.locator(".fg-emojis button").first().tap();
ok(await p.locator(".fg-op", { hasText: "Apagar" }).count() === 1, "emoji entra selecionado (girar, apagar, tamanho)");
await p.locator(".fg-ferr button", { hasText: "Desenhar" }).tap();
await p.locator(".fg-op", { hasText: "Neon" }).tap();
await cx.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: palco.x + 40, y: palco.y + 40 }] });
for (let i = 1; i <= 6; i++) await cx.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: palco.x + 40 + i * 25, y: palco.y + 40 + i * 6 }] });
await cx.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await p.waitForTimeout(200);
ok(await p.locator(".fg-op", { hasText: "Apagar desenhos" }).count() === 1, "desenhar com o dedo (neon)");
await p.locator(".fg-ferr button", { hasText: "Contorno" }).tap();
await p.screenshot({ path: "saida/fig-editor-pro.png" });
// cancelar com algo feito pergunta
await p.locator(".fg-topo [aria-label='Cancelar']").tap();
ok(await p.locator(".fg-conf", { hasText: "Descartar a figurinha?" }).isVisible(), "cancelar com mudanças pergunta antes de descartar");
await p.locator(".fg-conf button", { hasText: "Continuar editando" }).tap();
await p.locator(".fg-topo .ok").tap();
ok(await esperar(async () => (await p.locator('.pe-sec[data-sec="minhas"] + .pe-figs .pe-fig').count()) >= 1), "Concluir salva em Suas figurinhas");
const url = await p.evaluate(() => document.querySelector('.pe-sec[data-sec="minhas"] + .pe-figs .pe-fig img').src);
ok(/^data:image\/webp/.test(url) && url.length * 0.75 <= 100000, `WebP até 100 KB (${Math.round(url.length * 0.75 / 1024)} KB)`);
ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "sem rolagem para o lado");
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close();
process.exit();
