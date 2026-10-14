// Diário: estrelas (média, resumo 5→1 gravado junto; publicação antiga sem resumo) e prévia de foto alta.
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
// normal: com o resumo (diario_notas); antigo: publicação de antes, sem resumo (conta no servidor).
if (modo === "normal") await db.doc("diario_notas/p-alta").set({ total: 1, soma: 3, n1: 0, n2: 0, n3: 1, n4: 0, n5: 0 });
const { browser, ctx } = await navegador({ mobile: true });
const p = await entrar(ctx, "ana", "feed.html");
await p.waitForSelector(".post-card .estrelas-txt", { timeout: 30000 }).catch(() => {});
const card = p.locator(".post-card", { hasText: "Print de tela" }).first();
await card.waitFor({ timeout: 20000 });
await card.scrollIntoViewIfNeeded(); await p.waitForTimeout(1500);
console.log("modo:", modo);
const t0 = await card.locator(".estrelas-txt").textContent();
ok(t0.includes("3,0") && t0.includes("1 nota"), "estrelas antes: " + t0);
if (modo === "normal") {
  await card.locator(".estrela").nth(4).tap(); await p.waitForTimeout(1500);
  const t = await card.locator(".estrelas-txt").textContent();
  console.log("classes:", await card.locator(".estrelas-linha .estrela").evaluateAll((l) => l.map((b) => b.className)));
ok(t.includes("4,0") && t.includes("2 notas") && await card.locator(".estrelas-linha .estrela.on.minha").count() === 5, "depois de dar 5: " + t + " (5 estrelas acesas = a sua nota)");
  const r = (await db.doc("diario_notas/p-alta").get()).data();
  ok(r.total === 2 && r.soma === 8 && r.n5 === 1 && r.n3 === 1, "resumo gravado junto: " + JSON.stringify(r));
  await card.locator(".estrelas-txt").click();
  await p.waitForSelector("#folhaEstrelas.aberta", { timeout: 8000 }); await p.waitForTimeout(800);
  const barras = await p.locator(".est-barra").allTextContents();
  ok(barras.length === 5 && barras[0].includes("1") && barras[0].includes("50%") && barras[2].includes("50%") && barras[1].includes("0%"), "resumo: barras 5→1 → " + barras.join(" | "));
  ok((await p.locator(".est-grande strong").textContent()) === "4,0" && (await p.locator(".est-sua").textContent()).includes("Sua nota: 5"), "resumo: média grande e a sua nota");
  ok(await p.locator(".est-quem").count() === 0, "resumo: quem deu só aparece para o dono da publicação");
  await p.screenshot({ path: "saida/estrelas-resumo.png" });
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
}
// Foto: no recorte da publicação; print bem alto fica em 4:5 mostrando o começo; sem "Ver inteira".
ok(await card.locator(".post-midia-f.alta").count() === 1 && (await card.locator(".post-midia-f").evaluate((m) => m.style.getPropertyValue("--prop"))) === "0.8" && await card.locator(".ver-inteira").count() === 0, "foto alta: fica em 4:5, mostrando o começo, sem \"Ver inteira\"");
await p.screenshot({ path: `saida/feed-${modo}.png` });
await browser.close();
