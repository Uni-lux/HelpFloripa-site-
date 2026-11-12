// Mensagens no jeito do WhatsApp (09/11/2026, prints do dono): topo só com Suporte e Configurações, "+" flutuante,
// segurar a conversa = seleção com caixinha (barra com Fixar/Silenciar/Arquivar/Apagar/⋯, voltar sai), prévias com
// ícone, áudio com a foto e o microfone, avião no enviar e nada de selecionar texto ao segurar.
// Uso: node t-mensagens-whats.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
// A aba Negócios só aparece para quem tem negócio (12/11/2026): a Ana ganha um perfil para o teste.
await db.doc(`negocios/${U.ana}_servicos`).set({ donoId: U.ana, tipo: "servicos", nome: "Ana Serviços", criadoEm: FieldValue.serverTimestamp(), atualizadoEm: FieldValue.serverTimestamp() });
const CONV = [U.ana, U.bruno].sort().join("_");
await db.doc(`conversas/${CONV}`).set({ ultimaMensagem: "📍 Localização", ultimaMensagemRemetenteId: U.ana, atualizadoEm: FieldValue.serverTimestamp(), fixadaPara: { [U.ana]: FieldValue.delete() } }, { merge: true });
// um áudio da outra pessoa (data: curto) para ver o player
const wav = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
await db.collection(`conversas/${CONV}/mensagens`).add({ remetenteId: U.bruno, texto: "", tipoArquivo: "audio", arquivoUrl: wav, nomeArquivo: "audio", criadoEm: FieldValue.serverTimestamp() });

const A = await navegador({ mobile: true });
const p = await entrar(A.ctx, "ana", "mensagens.html");
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector('.modos [data-modo="negocios"]'); await p.waitForTimeout(1500);
await p.locator('.modos [data-modo="negocios"]').tap();
await p.waitForSelector(".conv-item", { timeout: 20000 }); await p.waitForTimeout(800);

const topo = await p.$$eval(".side-top button, .side-top a", (l) => l.map((b) => b.id || b.getAttribute("href")));
ok(topo.join() === "btnSuporte,btnConfig", `topo só com Suporte e Configurações (${topo.join()})`);
const fab = await p.locator("#btnNovaConversa.fab-nova").boundingBox();
const vp = p.viewportSize();
ok(fab && fab.x + fab.width > vp.width - 30 && fab.y > vp.height - 220, `"+" flutuante embaixo à direita (${fab && Math.round(fab.x)},${fab && Math.round(fab.y)})`);
ok(await p.locator(".conv-previa .pv-ic").count() >= 1 && (await p.locator(".conv-previa").first().textContent()).includes("Localização") && !(await p.locator(".conv-previa").first().textContent()).includes("📍"), "prévia com ícone no lugar do emoji");
await p.screenshot({ path: "saida/whats-lista.png" });

// segurar = seleção
const cx = await p.context().newCDPSession(p);
const b = await p.locator(".conv-item").first().boundingBox();
const x = b.x + b.width / 2, y = b.y + b.height / 2;
await cx.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
await p.waitForTimeout(700);
await cx.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await p.waitForTimeout(400);
ok(await p.evaluate(() => document.body.classList.contains("selecionando")), "segurar a conversa entra na seleção");
ok(await p.locator(".conv-item.marcada").count() === 1 && (await p.locator("#selConta").textContent()) === "1", "a conversa segurada fica marcada (1)");
ok(await p.locator(".conv-item.marcada .sel-marca").isVisible(), "caixinha com ✓ na foto");
ok(await p.locator("#menuMsg").isHidden(), "não abre o menu antigo");
await p.screenshot({ path: "saida/whats-selecao.png" });
await p.locator("#selFixar").tap(); await p.waitForTimeout(1200);
ok(!!(await db.doc(`conversas/${CONV}`).get()).data().fixadaPara?.[U.ana], "Fixar na barra fixa a conversa");
ok(await p.evaluate(() => document.body.classList.contains("selecionando")) && await p.locator(".conv-item.marcada").count() === 1, "Fixar NÃO sai da seleção (dá para usar outra função)");
await p.locator("#selSilenciar").tap(); await p.waitForTimeout(1200);
ok(!!(await db.doc(`conversas/${CONV}`).get()).data().silenciadaPara?.[U.ana] && await p.evaluate(() => document.body.classList.contains("selecionando")), "Silenciar em seguida, ainda na seleção");
ok(await p.locator("#selSilenciar use").getAttribute("href") === "#i-sino" && await p.locator("#selFixar use").getAttribute("href") === "#i-pin-off", "botões mostram a ação de desfazer (sino / alfinete cortado)");
await p.screenshot({ path: "saida/whats-selecao2.png" });
await p.locator("#selSair").tap(); await p.waitForTimeout(400);
await db.doc(`conversas/${CONV}`).set({ silenciadaPara: { [U.ana]: FieldValue.delete() } }, { merge: true });
// voltar sai da seleção sem sair da página
await cx.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] }); await p.waitForTimeout(700);
await cx.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await p.waitForTimeout(500);
const url = p.url();
await p.goBack(); await p.waitForTimeout(600);
ok(!(await p.evaluate(() => document.body.classList.contains("selecionando"))) && p.url() === url, "o voltar do celular sai da seleção e fica na página");
await db.doc(`conversas/${CONV}`).set({ fixadaPara: { [U.ana]: FieldValue.delete() } }, { merge: true });

// conversa: áudio no modelo do WhatsApp, enviar com avião, sem seleção de texto
await p.locator(".conv-item").first().tap();
await p.waitForSelector("body.chat-aberto"); await p.waitForTimeout(2500);
const aud = p.locator(".linha-msg.outra .hf-audio.wa").last();
ok(await aud.count() === 1, "áudio no modelo novo (foto + play + onda)");
ok(await aud.locator(".hf-audio-foto").count() === 1 && await aud.locator(".hf-audio-mic").count() === 1 && await aud.locator(".hf-audio-ponto").count() === 1, "foto com microfone e ponto na onda");
const disco = await aud.locator(".hf-audio-play").evaluate((e) => getComputedStyle(e).backgroundImage + "|" + getComputedStyle(e).backgroundColor);
ok(/none\|rgba\(0, 0, 0, 0\)/.test(disco), `play sem disco (${disco})`);
const sel = await p.locator(".bolha").first().evaluate((e) => getComputedStyle(e).userSelect);
ok(sel === "none", `segurar o balão não seleciona texto (${sel})`);
ok(await p.locator("#texto").evaluate((e) => getComputedStyle(e).userSelect) !== "none", "o campo de digitar continua normal");
ok((await p.locator("#iconeEnviar use").getAttribute("href")) === "#i-enviar" && (await p.locator("#i-enviar path").getAttribute("d")).startsWith("M3.4 20.4"), "enviar com avião de papel");
await aud.scrollIntoViewIfNeeded(); await p.evaluate(() => { document.documentElement.dataset.theme = "dark"; }); await p.waitForTimeout(300);
await p.screenshot({ path: "saida/whats-conversa.png" });
await p.evaluate(() => { document.documentElement.dataset.theme = "light"; }); await p.waitForTimeout(300);
await p.screenshot({ path: "saida/whats-conversa-claro.png" });
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close();
