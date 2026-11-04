process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";
// Flash no esquema do Instagram (04/11/2026): a fileira aparece da cópia do aparelho, tocar abre o visor NA HORA, cada flash
// é baixado só quando vai aparecer (rodinha no lugar da foto) e o próximo já vem pronto. Fotos de tamanho real e 4G simulado.
// Uso: node t-flash-rapido.mjs (rodar seed.mjs antes; usa saida/fotos-carga/post.jpg do gerar-fotos.py)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const FOTO = "data:image/jpeg;base64," + readFileSync(new URL("saida/fotos-carga/post.jpg", import.meta.url)).toString("base64");
const autores = [U.bruno, U.edu, U.dani];
for (const u of autores) await db.doc(`relacoes/${U.ana}_${u}`).set({ tipo: "seguir", seguidorId: U.ana, alvoId: u, criadoEm: Timestamp.now() });
let n = 0;
for (const u of autores) for (let k = 0; k < 2; k++) await db.doc(`stories/rap_${u.slice(0, 5)}_${k}`).set({ autorId: u, nome: "Teste", tipo: "foto", midia: FOTO, criadoEm: Timestamp.fromMillis(Date.now() - (n++) * 60000) });
const erros = [];
const A = await navegador({ mobile: true, sw: true });
const p = await entrar(A.ctx, "ana", "feed.html");
p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector("#storiesFeed .story-circ:not(.meu)", { timeout: 30000 });
await p.waitForTimeout(4000); // fileira guardada no aparelho
ok(await p.evaluate(() => { const g = JSON.parse(localStorage.getItem("hf-flash-barra-" + window.firebaseAuth.currentUser.uid) || "{}"); return (g.lista || []).length >= 3; }), "fileira do Flash guardada no aparelho (3 pessoas)");
// 2ª visita com 4G (4 Mbit/s, 120 ms)
const cdp = await A.ctx.newCDPSession(p);
await cdp.send("Network.enable");
await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 120, downloadThroughput: 4e6 / 8, uploadThroughput: 1e6 / 8 });
const t0 = Date.now();
await p.goto("http://127.0.0.1:5057/feed.html", { waitUntil: "commit" });
await p.waitForSelector("#storiesFeed .story-circ:not(.meu)", { timeout: 30000 });
const tAnel = Date.now() - t0;
ok(tAnel < 4000, `fileira aparece logo (${tAnel} ms)`);
await p.waitForTimeout(300);
const t1 = Date.now();
await p.locator("#storiesFeed .story-circ:not(.meu)").first().tap();
await p.waitForSelector(".story-visor", { timeout: 10000 });
const tAbre = Date.now() - t1;
ok(tAbre < 900, `tocar abre o visor na hora (${tAbre} ms)`);
await p.waitForFunction(() => { const i = document.querySelector(".story-visor .story-palco img"); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 30000 });
const tFoto = Date.now() - t1;
ok(tFoto < 4500, `a foto do 1º flash aparece (${tFoto} ms; 1 flash baixado, não a fileira toda)`);
await p.waitForTimeout(2500); // o próximo baixa por trás
const t2 = Date.now();
await p.evaluate(() => { const v = document.querySelector(".story-visor"); const r = v.getBoundingClientRect(); v.querySelector(".story-caixa").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: r.width - 20, clientY: r.height / 2 })); });
await p.mouse.click(380, 400);
const semRoda = await p.waitForFunction(() => !document.querySelector(".story-lendo") && document.querySelectorAll(".story-barra").length > 0, null, { timeout: 3000 }).then(() => Date.now() - t2).catch(() => null);
ok(semRoda !== null && semRoda < 1200, `o próximo já estava pronto: troca sem rodinha (${semRoda} ms)`);
await p.screenshot({ path: "saida/flash-rapido.png" });
for (const u of autores) for (let k = 0; k < 2; k++) await db.doc(`stories/rap_${u.slice(0, 5)}_${k}`).delete();
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close();
