// Ligação no padrão dos apps grandes (09/11/2026, pedido do dono): minimizar e usar o site durante a ligação (na rede a
// pílula fica por cima de todas as abas), aviso "Fulano silenciou o microfone", ligar a câmera numa ligação de voz
// (o outro passa a ver o vídeo), selo de criptografia, e a foto das Configurações do Mensagens (classe .lg) de volta.
// Uso: node seed.mjs && node t-ligacao3.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, garantirImagem } from "./nav.mjs";
import { readFileSync } from "node:fs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
for (const d of (await db.collection("chamadas").get()).docs) await d.ref.delete();
const esperar = async (fn, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn().catch(() => false)) return true; await new Promise((r) => setTimeout(r, 200)); } return false; };
const quadroCom = async (p, sel) => { for (const f of p.frames()) if (await f.locator(sel).count().catch(() => 0)) return f; return null; };

const A = await navegador({ mobile: true, camera: true, rede: true }), B = await navegador({ mobile: true, camera: true });
const ana = await entrar(A.ctx, "ana", "rede.html?aba=diario");
const bru = await entrar(B.ctx, "bruno", `mensagens.html?conversa=${U.conv}`);
await bru.waitForSelector("#btnLigar:not([hidden])", { timeout: 20000 });
await esperar(async () => ana.frames().filter((f) => f.parentFrame() && /(feed|mural|mensagens|usuarios)\.html/.test(f.url())).length >= 4, 40000);
await ana.waitForTimeout(3000);
await ana.evaluate(() => window.__hfShell.ir("comunidade")); await ana.waitForTimeout(500);

await bru.click("#btnLigar");
ok(await esperar(async () => !!(await quadroCom(ana, ".hfl .hfl-bt.atender"))), "Ana recebe a ligação de voz");
const fa = await quadroCom(ana, ".hfl .hfl-bt.atender");
await fa.click(".hfl-bt.atender");
ok(await esperar(async () => /^\d\d:\d\d$/.test(((await bru.textContent(".hfl-sit").catch(() => "")) || "").trim())), "conectou");
ok(/Criptografada/.test(await bru.textContent(".hfl-cripto")), "selo de criptografia (aparelho a aparelho)");
const bts = (await bru.locator(".hfl-bts .hfl-bt:visible span").allTextContents()).join(",");
ok(bts === "Câmera,Silenciar,Encerrar", "controles: " + bts);
ok(await bru.locator(".hfl-min").isVisible(), "botão de minimizar no topo");

// Bruno silencia → Ana vê o aviso
await bru.locator(".hfl-bt", { hasText: "Silenciar" }).click();
ok(await esperar(async () => /Bruno silenciou o microfone/.test(await fa.textContent(".hfl-outro").catch(() => "")), 8000), "Ana vê \"Bruno silenciou o microfone\"");
await bru.locator(".hfl-bt", { hasText: "Mudo" }).click();
ok(await esperar(async () => await fa.locator(".hfl-outro").isHidden(), 8000), "o aviso some quando ele volta a falar");

// Bruno liga a câmera numa ligação de voz → Ana vê o vídeo
await bru.locator(".hfl-bt", { hasText: "Câmera" }).click();
ok(await esperar(async () => await bru.locator(".hfl-local").isVisible(), 8000) && await bru.locator(".hfl-bt", { hasText: "Virar" }).isVisible(), "câmera ligada no meio da ligação de voz (prévia e Virar)");
ok(await esperar(async () => fa.evaluate(() => { const v = document.querySelector(".hfl-remoto"); return !v.hidden && v.videoWidth > 0; }), 12000), "Ana passa a ver o vídeo do Bruno");
await fa.screenshot?.({ path: "saida/lig3-video.png" }).catch(() => {});
await ana.screenshot({ path: "saida/lig3-video.png" });
await bru.locator(".hfl-bt", { hasText: "Câmera" }).click();
ok(await esperar(async () => fa.evaluate(() => document.querySelector(".hfl-remoto").hidden), 8000), "desligou a câmera: Ana volta a ver a foto");

// Ana minimiza (na rede): pílula na página de cima, troca de aba e continua na ligação
await fa.click(".hfl-min");
ok(await esperar(async () => (await ana.locator(".hfm").count()) === 1, 5000), "Ana minimiza: pílula da ligação no alto, por cima das abas");
ok(await ana.evaluate(() => !document.querySelector("iframe.hf-quadro.por-cima")), "o quadro da ligação desceu (a aba aparece)");
await ana.waitForTimeout(1200);
ok(/^\d\d:\d\d$/.test((await ana.textContent(".hfm-tx small")).trim()), "a pílula mostra o tempo: " + (await ana.textContent(".hfm-tx small")).trim());
await ana.evaluate(() => window.__hfShell.ir("perfil")); await ana.waitForTimeout(600);
ok(await ana.locator(".hfm").isVisible(), "trocou de aba e a pílula continua");
await ana.screenshot({ path: "saida/lig3-mini.png" });
await ana.locator(".hfm-bt").first().click();
ok(await esperar(async () => /Ana silenciou o microfone/.test(await bru.textContent(".hfl-outro").catch(() => "")), 8000), "silenciar pela pílula: Bruno vê o aviso");
await ana.locator(".hfm-tx").click();
ok(await esperar(async () => (await ana.locator(".hfm").count()) === 0 && await ana.evaluate(() => !!document.querySelector("iframe.hf-quadro.por-cima")), 5000), "tocar na pílula volta para a ligação");

// Bruno minimiza (fora da rede): pílula na própria página e a conversa à vista
await bru.click(".hfl-min");
ok(await esperar(async () => (await bru.locator(".hfm").count()) === 1 && await bru.locator(".hfl").isHidden(), 5000), "Bruno minimiza: pílula na página e a conversa aparece");
ok(await bru.locator("#texto").isVisible(), "dá para usar o chat durante a ligação");
await bru.screenshot({ path: "saida/lig3-mini-bruno.png" });
await bru.locator(".hfm-bt.fim").click();
ok(await esperar(async () => (await bru.locator(".hfm, .hfl").count()) === 0, 8000), "encerrar pela pílula fecha a ligação");
ok(await esperar(async () => !(await quadroCom(ana, ".hfl")), 10000), "e fecha do lado da Ana");
await A.browser.close(); await B.browser.close();

// Foto das Configurações do Mensagens (a classe .lg do cartão da ligação encolhia o avatar grande)
const F = "data:image/png;base64," + readFileSync(garantirImagem("saida/foto-perfil-q.png", 400, 400)).toString("base64");
const antes = (await db.doc(`perfis_publicos/${U.bruno}`).get()).data()?.fotoPerfil || "";
await db.doc(`perfis_publicos/${U.bruno}`).set({ fotoPerfil: F }, { merge: true });
const C = await navegador({ mobile: true });
const p = await entrar(C.ctx, "bruno", "mensagens.html");
await p.waitForTimeout(3000);
await p.click("#btnConfig"); await p.waitForTimeout(800);
const r = await p.evaluate(() => { const a = document.getElementById("cfgAvatar").getBoundingClientRect(), i = document.querySelector("#cfgAvatar img")?.getBoundingClientRect(); return i ? [a.width, i.width, i.height] : [a.width, 0, 0]; });
ok(r[1] === r[0] && r[2] === r[0], `foto das Configurações preenche o círculo (${r.join(" × ")})`);
await C.browser.close();
await db.doc(`perfis_publicos/${U.bruno}`).set({ fotoPerfil: antes }, { merge: true });
for (const d of (await db.collection("chamadas").get()).docs) await d.ref.delete();
