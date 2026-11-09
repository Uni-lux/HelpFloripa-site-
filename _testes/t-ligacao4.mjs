// Ligação parte 4 (09/11/2026, prints do dono): tela de receber com "arraste para atender/recusar", topo sem ficar
// espremido, recusar com mensagem pronta, pílula minimizada que recolhe numa bolha no canto, registro de chamadas com
// UMA linha por pessoa + histórico reorganizado, e a seleção de conversas que marcava 2 ao segurar.
// Uso: node seed.mjs && node t-ligacao4.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
for (const d of (await db.collection("chamadas").get()).docs) await d.ref.delete();
const esperar = async (fn, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn().catch(() => false)) return true; await new Promise((r) => setTimeout(r, 200)); } return false; };

const A = await navegador({ mobile: true, camera: true }), B = await navegador({ mobile: true, camera: true });
const ana = await entrar(A.ctx, "ana", "mensagens.html");
const bru = await entrar(B.ctx, "bruno", `mensagens.html?conversa=${U.conv}`);
await bru.waitForSelector("#btnLigar:not([hidden])", { timeout: 20000 });
await ana.waitForSelector('.modos [data-modo="negocios"]'); await ana.waitForTimeout(1500);

// 1) Recebendo: topo inteiro, arrastar para atender
await bru.click("#btnLigar");
ok(await esperar(async () => await ana.locator(".hfl .hfl-desliza").isVisible()), "Ana vê a tela de receber com o controle de arrastar");
const larg = await ana.evaluate(() => document.querySelector(".hfl-cab").getBoundingClientRect().width);
ok(larg > 200, "topo com o nome no meio (largura " + Math.round(larg) + " px, antes ficava espremido em 48 px)");
ok(await ana.locator(".hfl-rapido", { hasText: "Mensagem" }).isVisible() && await ana.locator(".hfl-rapido", { hasText: "Silenciar" }).isVisible(), "atalhos Mensagem e Silenciar");
await ana.screenshot({ path: "saida/lig4-recebendo.png" });
// arrastar pouco: a bola volta e nada acontece
const bola = await ana.locator(".hfl-ds-bola").boundingBox();
const cx = bola.x + bola.width / 2, cy = bola.y + bola.height / 2;
await ana.mouse.move(cx, cy); await ana.mouse.down(); await ana.mouse.move(cx + 40, cy, { steps: 5 }); await ana.mouse.up();
await ana.waitForTimeout(500);
ok(await ana.locator(".hfl-desliza").isVisible(), "arrastar pouco não atende (a bola volta)");
await ana.mouse.move(cx, cy); await ana.mouse.down(); await ana.mouse.move(cx + 160, cy, { steps: 10 }); await ana.mouse.up();
ok(await esperar(async () => /^\d\d:\d\d$/.test(((await bru.textContent(".hfl-sit").catch(() => "")) || "").trim())), "arrastou para a direita: atendeu e conectou");
// O SDP da resposta já leva os caminhos (para quem liga com versão antiga não ficar em "Conectando…")
const ch = (await db.collection("chamadas").get()).docs[0].data();
ok(/a=candidate/.test(ch.resposta?.sdp || "") && /a=candidate/.test(ch.oferta?.sdp || ""), "oferta e resposta com os caminhos (ICE) dentro do SDP");

// 2) Minimizar → pílula → bolha
await ana.click(".hfl-min");
ok(await esperar(async () => await ana.locator(".hfm").isVisible(), 5000), "minimizou: pílula");
const wp = (await ana.locator(".hfm").boundingBox()).width;
ok(wp <= 360, "pílula compacta (" + Math.round(wp) + " px)");
await ana.screenshot({ path: "saida/lig4-pilula.png" });
await ana.click(".hfm-bt.rec");
ok(await esperar(async () => (await ana.locator(".hfm.bolha").count()) === 1, 3000), "recolheu numa bolha no canto");
const bb = await ana.locator(".hfm").boundingBox(); const vw = ana.viewportSize().width;
ok(bb.width <= 70 && bb.x + bb.width > vw - 20, `bolha pequena no canto direito (${Math.round(bb.width)} px)`);
await ana.waitForTimeout(1200);
ok(/^\d\d:\d\d$/.test((await ana.textContent(".hfm-tx small")).trim()), "a bolha mostra o tempo");
await ana.screenshot({ path: "saida/lig4-bolha.png" });
await ana.click(".hfm-av");
ok(await esperar(async () => (await ana.locator(".hfm").count()) === 0 && await ana.locator(".hfl:not(.minimizada)").isVisible(), 4000), "tocar na bolha volta para a ligação");
await ana.locator(".hfl-bt.fim").click();
await ana.waitForTimeout(1500);

// 3) Recusar com mensagem
await bru.waitForTimeout(1500);
await bru.click("#btnLigar");
ok(await esperar(async () => await ana.locator(".hfl .hfl-desliza").isVisible()), "Bruno liga de novo");
await ana.click(".hfl-rapido:has-text('Mensagem')");
await ana.click(".hfl-msgs button >> nth=0");
ok(await esperar(async () => (await ana.locator(".hfl").count()) === 0, 6000), "recusou com mensagem");
ok(await esperar(async () => /Te ligo daqui a pouco/.test(await bru.locator(".bolha").allTextContents().then((x) => x.join(" "))), 10000), "Bruno recebe a mensagem pronta na conversa");
await bru.waitForTimeout(1500);
// 4) Recusar arrastando para a esquerda (3ª chamada)
await bru.click("#btnLigar");
ok(await esperar(async () => await ana.locator(".hfl .hfl-desliza").isVisible()), "3ª ligação");
const b2 = await ana.locator(".hfl-ds-bola").boundingBox();
await ana.mouse.move(b2.x + 31, b2.y + 31); await ana.mouse.down(); await ana.mouse.move(b2.x - 130, b2.y + 31, { steps: 10 }); await ana.mouse.up();
ok(await esperar(async () => (await ana.locator(".hfl").count()) === 0, 6000), "arrastou para a esquerda: recusou");
await bru.waitForTimeout(2500);

// 5) Registro: uma linha por pessoa + histórico
await ana.click('.modos [data-modo="chamadas"]');
ok(await esperar(async () => (await ana.locator(".rc-item").count()) >= 1), "aba Chamadas carregou");
const linhas = await ana.locator(".rc-item").count();
ok(linhas === 1, `3 ligações com o Bruno numa linha só (${linhas})`);
ok(/\(3\)/.test(await ana.textContent(".rc-item b")), "a linha mostra (3)");
await ana.click(".rc-item");
ok(await esperar(async () => await ana.locator(".rcd-nums").isVisible(), 4000), "histórico com os números");
const nums = (await ana.locator(".rcd-num b").allTextContents()).join(",");
ok(nums === "3,0,3,0" || nums === "3,0,1,2", "números do histórico: " + nums);
ok((await ana.locator(".rcd-cartao .rcd-item").count()) === 3, "as 3 ligações no cartão do dia");
await ana.waitForTimeout(700);
console.log("   rótulos:", (await ana.locator(".rcd-num span").allTextContents()).join(","), await ana.evaluate(() => { const e = document.querySelector(".rcd-num span"); const c = getComputedStyle(e); return c.display + " " + e.getBoundingClientRect().height + " / " + document.querySelector(".rcd-nums").offsetHeight + " corpo " + getComputedStyle(document.querySelector(".rcd")).display + " rows " + getComputedStyle(document.querySelector(".rcd")).gridTemplateRows; }));
await ana.screenshot({ path: "saida/lig4-historico.png" });
await ana.click(".pv-x"); await ana.waitForTimeout(400);

// 6) Seleção: segurar marca só UMA e a lista não sai do lugar
await ana.click('.modos [data-modo="negocios"]'); await ana.waitForSelector(".conv-item"); await ana.waitForTimeout(600);
const itens = ana.locator(".conv-item");
const n = await itens.count();
ok(n >= 1, "conversas na lista (" + n + ")");
const r0 = await itens.first().boundingBox();
const cdp = await A.ctx.newCDPSession(ana);
const pt = { x: r0.x + r0.width / 2, y: r0.y + r0.height / 2 };
await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pt] });
await ana.waitForTimeout(900);
await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await ana.waitForTimeout(500);
ok((await ana.textContent("#selConta")).trim() === "1", "segurar marca só 1 (marcava 2): " + (await ana.textContent("#selConta")).trim());
const r1 = await itens.first().boundingBox();
ok(Math.abs(r1.y - r0.y) < 2, `a lista não pulou (${Math.round(r0.y)} → ${Math.round(r1.y)})`);
ok(/selecionada/.test(await ana.textContent("#selRotulo")), "barra com \"1 selecionada\"");
await ana.screenshot({ path: "saida/lig4-selecao.png" });
await ana.click("#selSair");

await A.navegador?.close?.(); await B.navegador?.close?.();
process.exit();
