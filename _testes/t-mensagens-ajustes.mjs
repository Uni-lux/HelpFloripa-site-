// Mensagens (09/11/2026, prints do dono): citação com cor própria, ponto do áudio andando liso, prévia do perfil sem anel,
// lupa também nas Chamadas e o "voltar" fechando só o menu ⋮ (como no WhatsApp). Uso: node t-mensagens-ajustes.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const CONV = [U.ana, U.bruno].sort().join("_");
// áudio de 3 s (silêncio, 8 kHz, 8 bits)
const n = 8000 * 3, buf = Buffer.alloc(44 + n);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + n, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
buf.writeUInt32LE(8000, 24); buf.writeUInt32LE(8000, 28); buf.writeUInt16LE(1, 32); buf.writeUInt16LE(8, 34); buf.write("data", 36); buf.writeUInt32LE(n, 40); buf.fill(128, 44);
const ref = await db.collection(`conversas/${CONV}/mensagens`).add({ remetenteId: U.bruno, texto: "Posso passar amanhã?", criadoEm: FieldValue.serverTimestamp() });
await db.collection(`conversas/${CONV}/mensagens`).add({ remetenteId: U.bruno, texto: "", tipoArquivo: "audio", arquivoUrl: "data:audio/wav;base64," + buf.toString("base64"), nomeArquivo: "audio", criadoEm: FieldValue.serverTimestamp() });
await db.collection(`conversas/${CONV}/mensagens`).add({ remetenteId: U.ana, texto: "Pode sim!", resposta: { id: ref.id, texto: "Posso passar amanhã?", remetenteId: U.bruno }, criadoEm: FieldValue.serverTimestamp() });

const A = await navegador({ mobile: true });
await A.ctx.addInitScript(() => { try { localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" })); } catch {} });
const p = await entrar(A.ctx, "ana", "mensagens.html");
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector('.modos [data-modo="chamadas"]'); await p.waitForTimeout(1500);
await p.locator('.modos [data-modo="chamadas"]').tap(); await p.waitForTimeout(800);
const busca = p.locator("#buscaConversas");
ok(await busca.isVisible() && (await busca.getAttribute("placeholder")) === "Pesquisar chamadas", "lupa no topo também na aba Chamadas");
await busca.fill("zzz nada"); await p.waitForTimeout(600);
ok(await p.locator(".rc-busca").count() === 0, "sem a busca repetida dentro da lista");
await busca.fill(""); await p.locator('.modos [data-modo="pessoal"]').tap(); await p.waitForTimeout(300);
ok((await busca.getAttribute("placeholder")) === "Pesquisar conversa", "de volta às conversas, a lupa procura conversas");

await p.goto(p.url().replace(/mensagens\.html.*/, `mensagens.html?conversa=${CONV}`));
await p.waitForSelector("body.chat-aberto"); await p.waitForTimeout(2500);
const cit = p.locator(".linha-msg.minha .citacao").last(); await cit.scrollIntoViewIfNeeded();
const fc = await cit.evaluate((e) => getComputedStyle(e).backgroundColor);
ok(fc === "rgb(12, 31, 43)", `citação com cor própria, opaca (${fc})`);
await p.screenshot({ path: "saida/ajustes-citacao.png" });

// áudio: o ponto anda liso (muitas posições diferentes em meio segundo)
const aud = p.locator(".linha-msg.outra .hf-audio.wa").last(); await aud.scrollIntoViewIfNeeded();
await aud.locator(".hf-audio-play").click(); await p.waitForTimeout(400);
const posicoes = await aud.evaluate(async (box) => { const v = new Set(); const t0 = performance.now(); while (performance.now() - t0 < 500) { v.add(box.style.getPropertyValue("--p")); await new Promise((r) => requestAnimationFrame(r)); } return v.size; });
ok(posicoes >= 12, `ponto do áudio anda quadro a quadro (${posicoes} posições em 0,5 s; antes ~2)`);
await p.screenshot({ path: "saida/ajustes-audio.png" });
await aud.locator(".hf-audio-play").click();

// menu ⋮ + voltar = fecha só o menu (conversa aberta pela lista, como a pessoa faz)
await p.goto(p.url().replace(/mensagens\.html.*/, "mensagens.html")); await p.waitForSelector('.modos [data-modo="negocios"]'); await p.waitForTimeout(1500);
await p.locator('.modos [data-modo="negocios"]').tap(); await p.waitForSelector(".conv-item"); await p.locator(".conv-item").first().tap();
await p.waitForSelector("body.chat-aberto"); await p.waitForTimeout(1500);
await p.locator("#btnMenuConversa").tap(); await p.waitForTimeout(400);
ok(await p.locator("#menuMsg").isVisible(), "menu ⋮ abre");
await p.goBack(); await p.waitForTimeout(700);
ok(await p.locator("#menuMsg").isHidden(), "voltar fecha o menu");
ok(await p.evaluate(() => document.body.classList.contains("chat-aberto")), "e continua na conversa");
await p.goBack(); await p.waitForTimeout(700);
ok(!(await p.evaluate(() => document.body.classList.contains("chat-aberto"))) && await p.locator("#menuMsg").isHidden(), "o próximo voltar sai da conversa, sem menu por cima da lista");

// prévia do perfil sem anel azul
await p.goto(p.url().replace(/mensagens\.html.*/, `mensagens.html?conversa=${CONV}`));
await p.waitForSelector("body.chat-aberto"); await p.waitForTimeout(2000);
const q = await p.locator("#btnQuem").boundingBox();
await p.mouse.move(q.x + 40, q.y + 20); await p.mouse.down(); await p.waitForTimeout(700); await p.mouse.up(); await p.waitForTimeout(1200);
const av = p.locator(".pv-perfil .avatar").first();
if (await av.count()) { const sh = await av.evaluate((e) => getComputedStyle(e).boxShadow); ok(!/0, 173, 238|0, 147, 204/.test(sh), `foto da prévia sem anel azul (${sh})`); }
else ok(false, "prévia do perfil abriu");
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close();
