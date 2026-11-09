// Áudio no jeito do WhatsApp (09/11/2026, pedido do dono): rolar a conversa com o dedo por cima da onda NÃO pula o áudio
// nem toca; tocar na onda também não; só arrastar a bolinha muda o ponto (e o áudio começa dali ao tocar).
// Uso: node t-audio-arrastar.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const CONV = [U.ana, U.bruno].sort().join("_");
const n = 8000 * 6, buf = Buffer.alloc(44 + n);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + n, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
buf.writeUInt32LE(8000, 24); buf.writeUInt32LE(8000, 28); buf.writeUInt16LE(1, 32); buf.writeUInt16LE(8, 34); buf.write("data", 36); buf.writeUInt32LE(n, 40); buf.fill(128, 44);
await db.collection(`conversas/${CONV}/mensagens`).add({ remetenteId: U.bruno, texto: "", tipoArquivo: "audio", arquivoUrl: "data:audio/wav;base64," + buf.toString("base64"), nomeArquivo: "audio", criadoEm: FieldValue.serverTimestamp() });
for (let i = 0; i < 6; i++) await db.collection(`conversas/${CONV}/mensagens`).add({ remetenteId: i % 2 ? U.ana : U.bruno, texto: "Mensagem para rolar " + i, criadoEm: FieldValue.serverTimestamp() });

const A = await navegador({ mobile: true });
const p = await entrar(A.ctx, "ana", `mensagens.html?conversa=${CONV}`);
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector("body.chat-aberto"); await p.waitForTimeout(2500);
const aud = p.locator(".linha-msg.outra .hf-audio.wa").last();
await aud.scrollIntoViewIfNeeded(); await p.waitForTimeout(800);
const cx = await p.context().newCDPSession(p);
const toque = (type, pts) => cx.send("Input.dispatchTouchEvent", { type, touchPoints: pts });
const estado = () => aud.evaluate((b) => ({ p: b.style.getPropertyValue("--p"), tocando: b.classList.contains("tocando") }));
const onda = await aud.locator(".hf-audio-onda").boundingBox();
const antes = await estado();
const rol0 = await p.evaluate(() => document.getElementById("msgs").scrollTop);
// dedo no meio da onda e sobe (rolar a conversa)
let x = onda.x + onda.width * 0.7, y = onda.y + onda.height / 2;
await toque("touchStart", [{ x, y }]);
for (let i = 1; i <= 12; i++) { await toque("touchMove", [{ x, y: y + i * 15 }]); await p.waitForTimeout(16); }
await toque("touchEnd", []); await p.waitForTimeout(600);
const depois = await estado();
const rol1 = await p.evaluate(() => document.getElementById("msgs").scrollTop);
ok(depois.p === antes.p && !depois.tocando, `rolar por cima da onda não pula nem toca (--p ${antes.p || "0"} → ${depois.p || "0"})`);
ok(rol1 !== rol0, `a conversa rolou (${rol0} → ${rol1})`);
// tocar na onda (sem arrastar a bolinha) também não pula
await aud.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
const o2 = await aud.locator(".hf-audio-onda").boundingBox();
await p.touchscreen.tap(o2.x + o2.width * 0.8, o2.y + o2.height / 2); await p.waitForTimeout(500);
const t2 = await estado();
ok(t2.p === antes.p && !t2.tocando, "tocar na onda não pula");
// arrastar a bolinha até 60%
const bola = await aud.locator(".hf-audio-ponto").boundingBox();
x = bola.x + bola.width / 2; y = bola.y + bola.height / 2;
await toque("touchStart", [{ x, y }]);
const alvo = o2.x + o2.width * 0.6;
for (let i = 1; i <= 10; i++) { await toque("touchMove", [{ x: x + (alvo - x) * i / 10, y }]); await p.waitForTimeout(16); }
const meio = await aud.evaluate((b) => b.classList.contains("arrastando"));
await toque("touchEnd", []); await p.waitForTimeout(500);
const t3 = await estado();
ok(meio, "a bolinha cresce enquanto é arrastada");
ok(Math.abs(Number(t3.p) - 0.6) < 0.05 && !t3.tocando, `arrastar a bolinha muda o ponto (--p ${t3.p}) sem tocar sozinho`);
// tocar no play: começa de onde a bolinha ficou
await aud.locator(".hf-audio-play").click(); await p.waitForTimeout(700);
const ct = await aud.evaluate((b) => { const a = [...document.querySelectorAll("audio")]; return Number(b.style.getPropertyValue("--p")); });
ok(ct >= 0.58, `ao tocar, começa de onde a bolinha ficou (--p ${ct.toFixed(2)})`);
await aud.locator(".hf-audio-play").click();
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close();
