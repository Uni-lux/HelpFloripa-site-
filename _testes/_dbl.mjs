process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const img = "data:image/png;base64," + readFileSync("saida/foto0.png").toString("base64");
await db.doc("diario/p1").set({ autorId: U.bruno, nome: "Bruno", texto: "uma foto", mediaUrl: img, mediaTipo: "image", criadoEm: Timestamp.now() });
const { browser, ctx } = await navegador({ mobile: true });
const p = await entrar(ctx, "ana", "feed.html");
await p.waitForSelector(".filtro-feed"); await p.locator('#filtroFeed [data-filtro="todos"]').tap();
const card = p.locator(".post-card", { hasText: "uma foto" }).first(); await card.waitFor(); await card.scrollIntoViewIfNeeded(); await p.waitForTimeout(1000);
const b = await card.locator(".car-trilho").boundingBox();
await p.touchscreen.tap(b.x + b.width / 2, b.y + 100); await p.waitForTimeout(100); await p.touchscreen.tap(b.x + b.width / 2, b.y + 100);
for (const t of [80, 200, 400]) { await p.waitForTimeout(t === 80 ? 80 : t - 80); const r = await card.locator(".estrela-pulo").evaluate((e) => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return { op: s.opacity, anim: s.animationName, x: r.x, y: r.y, w: r.width, h: r.height, z: s.zIndex, pos: s.position }; }).catch((e) => "sem: " + e.message.slice(0, 60)); console.log(t, JSON.stringify(r)); }
await p.screenshot({ path: "saida/dbl.png" });
await browser.close();
