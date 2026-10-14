// Diário: estrelas ("Sua nota" + média, inclusive quando a soma no servidor falha) e prévia de foto alta.
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { deflateSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => console.log(c ? "  ✔" : "  ✘", t);
// PNG 200x700 (print de tela alto), cinza.
function png(w, hgt) {
  const crc = (b) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const ch = (tipo, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(tipo), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(hgt, 4); ih[8] = 8; ih[9] = 0;
  const raw = Buffer.alloc((w + 1) * hgt, 120); for (let y = 0; y < hgt; y++) raw[y * (w + 1)] = 0;
  return "data:image/png;base64," + Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ch("IHDR", ih), ch("IDAT", deflateSync(raw)), ch("IEND", Buffer.alloc(0))]).toString("base64");
}
initializeApp({ projectId: "demo-hf" });
const db = getFirestore();
await db.doc("diario/p-alta").set({ autorId: U.bruno, nome: "Bruno Reparos", texto: "Print de tela", mediaUrl: png(200, 700), mediaTipo: "imagem", criadoEm: Timestamp.now() });
await db.doc(`curtidas/p-alta_${U.edu}`).set({ postId: "p-alta", uid: U.edu, postAutorId: U.bruno, nota: 3 });
const modo = process.argv[2] || "normal";
const { browser, ctx } = await navegador({ mobile: true });
if (modo === "sem-soma") await ctx.addInitScript(() => { window.__semSoma = true; });
if (modo === "sem-soma") await ctx.route(/\/rede\.js(\?.*)?$/, async (r) => { const s = readFileSync(new URL("../rede.js", import.meta.url), "utf8").replace('fb = { ...firestore, db: window.firebaseDb };', 'fb = { ...firestore, db: window.firebaseDb, getAggregateFromServer: () => Promise.reject(Object.assign(new Error("precisa de índice"), { code: "failed-precondition" })) };'); r.fulfill({ body: s, contentType: "text/javascript" }); });
const p = await entrar(ctx, "ana", "feed.html");
let avisos = 0; p.on("console", (m) => { if (m.text().includes("Estrelas (soma no servidor)")) avisos++; });
await p.waitForSelector(".post-card .estrelas-txt", { timeout: 30000 }).catch(() => {});
await p.locator(".filtro-feed button", { hasText: "Todos" }).click().catch(() => {});
const card = p.locator(".post-card", { hasText: "Print de tela" }).first();
await card.waitFor({ timeout: 20000 });
await card.scrollIntoViewIfNeeded(); await p.waitForTimeout(1500);
console.log("modo:", modo);
ok((await card.locator(".estrelas-txt").textContent()).includes("3,0 · 1 nota"), "estrelas antes: " + await card.locator(".estrelas-txt").textContent());
await card.locator(".estrela").nth(4).click(); await p.waitForTimeout(1500);
const t = await card.locator(".estrelas-txt").textContent();
ok(t.includes("Sua nota: 5") && t.includes("4,0 · 2 notas"), "depois de dar 5: " + t);
ok(await card.locator(".post-midia-f.cortada.alta").count() === 1 && await card.locator(".ver-inteira").isVisible(), "foto alta: mostra o começo e \"Ver inteira\"");
await card.locator(".post-midia-f").click(); await p.waitForTimeout(300);
ok(!(await card.locator(".ver-inteira").isVisible()), "tocou: abre inteira e o selo some");
await p.screenshot({ path: `saida/feed-${modo}.png` });
ok(modo === "sem-soma" ? avisos > 0 : avisos === 0, "caminho usado: " + (avisos ? "contar lendo as notas" : "soma no servidor"));
await browser.close();
