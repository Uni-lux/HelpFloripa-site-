// Arrastar para atender/recusar (12/11/2026, relato dele: "coloco pra arrastar e não tá indo"). Com toque DE VERDADE
// (CDP), "remover animações" ligado (prefers-reduced-motion) e o dedo começando FORA da bola (em qualquer ponto do trilho).
// Uso: node seed.mjs && node t-ligacao-arrastar.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
for (const d of (await db.collection("chamadas").get()).docs) await d.ref.delete();
const esperar = async (fn, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn().catch(() => false)) return true; await new Promise((r) => setTimeout(r, 200)); } return false; };
const A = await navegador({ mobile: true, camera: true }), B = await navegador({ mobile: true, camera: true });
const ana = await entrar(A.ctx, "ana", "mensagens.html");
await ana.emulateMedia({ reducedMotion: "reduce" });
const bru = await entrar(B.ctx, "bruno", `mensagens.html?conversa=${U.conv}`);
const erros = []; ana.on("pageerror", (e) => erros.push(e.message));
await bru.waitForSelector("#btnLigar:not([hidden])", { timeout: 20000 }); await ana.waitForTimeout(1500);
const cdp = await ana.context().newCDPSession(ana);
const toque = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y, id: 1 }] });
async function arrastar(x0, y, dx, passos = 12, soltar = true) {
  await toque("touchStart", x0, y);
  for (let i = 1; i <= passos; i++) { await toque("touchMove", x0 + (dx * i) / passos, y); await ana.waitForTimeout(16); }
  if (soltar) await toque("touchEnd");
}
const xBola = () => ana.evaluate(() => { const b = document.querySelector(".hfl-ds-bola"), t = document.querySelector(".hfl-desliza"); return b.getBoundingClientRect().left + b.offsetWidth / 2 - (t.getBoundingClientRect().left + t.offsetWidth / 2); });

await bru.click("#btnLigar");
ok(await esperar(async () => await ana.locator(".hfl .hfl-desliza").isVisible()), "Ana recebe a ligação");
const tr = await ana.locator(".hfl-desliza").boundingBox(); const cy = tr.y + tr.height / 2, cx = tr.x + tr.width / 2;
// dedo começa 45 px à direita da bola (antes não pegava) e segue o dedo enquanto arrasta
await arrastar(cx + 45, cy, 60, 8, false);
const meio = await xBola();
ok(meio > 40, `a bola acompanha o dedo começando fora dela (${Math.round(meio)} px), com animações desligadas`);
await ana.screenshot({ path: "saida/lig-arrastando.png" });
await toque("touchEnd");
await ana.waitForTimeout(700);
ok(Math.abs(await xBola()) < 2, "soltou antes do ponto: a bola volta para o meio (mesmo sem animações do sistema)");
ok(await ana.locator(".hfl-desliza").isVisible(), "e não atendeu");
// arrastar até o fim para a direita: atende
await arrastar(cx, cy, tr.width / 2 - 20, 14);
ok(await esperar(async () => /^\d\d:\d\d$/.test(((await bru.textContent(".hfl-sit").catch(() => "")) || "").trim())), "arrastou para a direita: atendeu e conectou");
await ana.locator(".hfl-bt.fim").click(); await ana.waitForTimeout(2500);
// recusar arrastando para a esquerda, dedo saindo do trilho no fim
await bru.click("#btnLigar");
ok(await esperar(async () => await ana.locator(".hfl .hfl-desliza").isVisible()), "2ª ligação");
await arrastar(cx - 10, cy, -(tr.width / 2 + 40), 14);
ok(await esperar(async () => (await ana.locator(".hfl").count()) === 0, 6000), "arrastou para a esquerda (até fora do trilho): recusou");
const ch = (await db.collection("chamadas").orderBy("criadoEm", "desc").limit(1).get()).docs[0]?.data();
ok(ch?.status === "recusada", "chamada gravada como recusada");
ok(!erros.length, "sem erros na página" + (erros.length ? ": " + erros.join(" | ") : ""));
await Promise.all([A.browser.close(), B.browser.close()]);
