// Menu ⋮ da conversa → "Configurações do chat" abre e FICA aberto (o "voltar" atrasado do menu fechava o painel) e o cartão
// de texto com imagem ganha "ver mais / ver menos" (10/11/2026).
// Uso: node seed.mjs | tail -1 > saida/seed-ids.json && node t-menu-vermais.mjs
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8085";
const app = initializeApp({ projectId: "demo-hf" }, "mv"); const db = getFirestore(app);
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const erros = [];
const ids = JSON.parse(readFileSync("saida/seed-ids.json", "utf8"));
const conv = ids.conv;
// publicação de texto com imagem, texto longo
const foto = "data:image/jpeg;base64," + readFileSync("saida/fotos-pub/praia.jpg").toString("base64");
const longo = "Nem tudo precisa fazer sentido agora. Algumas coisas levam tempo, outras exigem paciência e algumas simplesmente precisam acontecer. O importante é não perder a essência, continuar acreditando e nunca permitir que as dificuldades apaguem a vontade de viver. Cada dia é uma nova oportunidade de fazer diferente. E quando parecer difícil, lembre que tudo passa e que o melhor ainda está por vir, um passo de cada vez, sem pressa.";
await db.doc("diario/mvcasada1").set({ autorId: ids.bruno, nome: "Bruno Reparos", texto: longo, mediaUrl: foto, mediaTipo: "imagem", estilo: "casada", tipo: "texto", criadoEm: Timestamp.now() });
const A = await navegador({ mobile: true });
const p = await entrar(A.ctx, "ana", "mensagens.html?conversa=" + conv);
p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector("#btnMenuConversa", { timeout: 20000 }); await p.waitForTimeout(2500);
await p.locator("#btnMenuConversa").tap(); await p.waitForTimeout(500);
await p.locator("#menuMsg button", { hasText: "Configurações do chat" }).tap(); await p.waitForTimeout(1500);
ok(await p.evaluate(() => document.getElementById("painelConfig").classList.contains("aberto")), "menu ⋮ → Configurações do chat abre e fica aberto");
await p.locator('#painelConfig [data-cfg="fonte"] [data-valor="grande"]').tap(); await p.waitForTimeout(300);
ok(await p.evaluate(() => document.documentElement.dataset.fonte) === "grande", "a opção escolhida ali vale");
await p.goBack(); await p.waitForTimeout(600);
ok(await p.evaluate(() => !document.getElementById("painelConfig").classList.contains("aberto")), "voltar fecha o painel");
await p.locator("#btnMenuConversa").tap(); await p.waitForTimeout(500);
await p.locator("#menuMsg button", { hasText: "Configurações de pagamento" }).tap(); await p.waitForTimeout(1500);
ok(await p.evaluate(() => !!document.querySelector(".pv-fundo, .hfc, .pv-gaveta, [class*='pix']")), "Configurações de pagamento também abre");
await p.goto("http://127.0.0.1:5057/feed.html"); await p.waitForSelector(".casada-texto", { timeout: 30000 }); await p.waitForTimeout(1500);
const c = p.locator(".post-card", { has: p.locator(".casada-texto") }).first();
await c.scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
ok(await c.locator(".casada-texto.recolhido").count() === 1 && await c.locator(".casada-ver").textContent() === "ver mais", "texto com imagem longo: recolhido com \"ver mais\"");
await c.locator(".casada-ver").tap(); await p.waitForTimeout(300);
ok(await c.locator(".casada-texto.recolhido").count() === 0 && await c.locator(".casada-ver").textContent() === "ver menos", "\"ver mais\" abre e vira \"ver menos\"");
await p.screenshot({ path: "saida/menu-vermais.png" });
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await db.doc("diario/mvcasada1").delete();
await A.browser.close(); process.exit();
