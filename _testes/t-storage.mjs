// Storage LIGADO (chave USAR_STORAGE): fotos do Diário, da Comunidade e do chat vão para o Firebase Storage
// (emulador 9199) com nome único, o documento guarda só o link, e as fotos aparecem para quem vê.
// Uso: STORAGE=1 node t-storage.mjs  (precisa do emulador com o Storage: ./emulador.sh)
process.env.STORAGE = "1";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { navegador, entrar, garantirImagem, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const db = getFirestore(initializeApp({ projectId: "demo-hf" }));
const ST = /^http:\/\/127\.0\.0\.1:9199\/v0\/b\/[^/]+\/o\//;
const carregou = (p, sel) => p.waitForFunction((s) => [...document.querySelectorAll(s)].some((i) => i.complete && i.naturalWidth > 0), sel, { timeout: 20000 }).then(() => true).catch(() => false);
for (const d of (await db.collection("comunidade").where("donoId", "==", U.ana).get()).docs) await d.ref.delete();
// No emulador o link do Storage é http://127.0.0.1:9199/... (no site real, https://firebasestorage.googleapis.com/...):
// uma cópia das regras do Firestore aceita os dois durante o teste; as do repositório voltam no fim.
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
const RG = new URL("saida/regras-storage-teste.rules", import.meta.url).pathname;
writeFileSync(RG, readFileSync(new URL("../firestore.rules", import.meta.url), "utf8").replaceAll("https://firebasestorage[.]googleapis[.]com/", "(https://firebasestorage[.]googleapis[.]com|http://127[.]0[.]0[.]1:9199)/"));
execSync(`node trocar-regras.mjs ${RG}`);
const voltarRegras = () => execSync("node trocar-regras.mjs main");

const A = await navegador({ mobile: true });
// ---------- 1) Diário: 2 fotos ----------
const pa = await entrar(A.ctx, "ana", "feed.html");
await pa.waitForSelector("#btnComporFeed", { timeout: 30000 }); await pa.waitForTimeout(1500);
ok(await pa.evaluate(() => !!window.firebaseStorage), "chave ligada: window.firebaseStorage existe ao abrir a página");
await pa.locator("#btnComporFeed").tap();
await pa.locator("#pubTexto").fill("Teste do Storage no Diário");
for (const [i, cor] of [[0, [200, 80, 60]], [1, [60, 120, 200]]]) {
  await pa.setInputFiles("#pubArquivoFoto", garantirImagem(`saida/st-foto${i}.png`, 900 + i, 1100));
  await pa.locator(".hfe-btn.pri").click({ timeout: 15000 }); await pa.waitForTimeout(500);
}
await pa.locator("#pubEnviar").click();
await pa.waitForFunction(() => !document.getElementById("folhaPublicar")?.classList.contains("aberta"), null, { timeout: 40000 }).catch(() => {});
await pa.waitForTimeout(1500);
const post = (await db.collection("diario").where("autorId", "==", U.ana).get()).docs.map((d) => d.data()).find((x) => x.texto === "Teste do Storage no Diário");
ok(post && ST.test(post.mediaUrl) && post.midias?.length === 2 && post.midias.every((u) => ST.test(u)), "Diário: as 2 fotos foram para o Storage · documento com " + (post ? Math.round(JSON.stringify(post).length / 1024 * 10) / 10 + " KB" : "-"));
ok(post && post.midias[0] !== post.midias[1] && /_[a-z0-9]+\.jpg/.test(decodeURIComponent(post.midias[0])), "nome único em cada foto: " + (post ? decodeURIComponent(post.midias[0].split("/o/")[1].split("?")[0]) : "-"));
await A.browser.close();

const B = await navegador({ mobile: true });
const pb = await entrar(B.ctx, "bruno", "feed.html");
await pb.waitForSelector(".filtro-feed", { timeout: 30000 });
const card = pb.locator(".post-card", { hasText: "Teste do Storage" }).first();
await card.waitFor({ timeout: 20000 }); await card.scrollIntoViewIfNeeded();
ok(await carregou(pb, ".post-card img[src^='http://127.0.0.1:9199']"), "outra pessoa vê a foto vinda do Storage no feed");
await pb.screenshot({ path: "saida/st-feed.png" });

// ---------- 2) Chat: foto ----------
const conv = [U.ana, U.bruno].sort().join("_");
await B.browser.close();
const M = await navegador({ mobile: true });
const pm = await entrar(M.ctx, "bruno", `mensagens.html?conversa=${conv}`);
await pm.waitForSelector("#btnAnexar", { timeout: 20000 }); await pm.waitForTimeout(2500);
await pm.setInputFiles("#inputArquivo", garantirImagem("saida/st-chat.png", 2400, 1800)); await pm.waitForTimeout(800);
await pm.locator("#btnEnviar").click(); await pm.waitForTimeout(4000);
const msg = (await db.collection(`conversas/${conv}/mensagens`).orderBy("criadoEm", "desc").limit(1).get()).docs[0]?.data();
ok(msg && ST.test(msg.arquivoUrl || ""), "chat: a foto foi para o Storage (" + (msg?.tipo || "-") + ")");
ok(await carregou(pm, ".msg img[src^='http://127.0.0.1:9199'], .bolha img[src^='http://127.0.0.1:9199']"), "chat: a foto aparece na conversa");
await pm.screenshot({ path: "saida/st-chat-tela.png" });
await M.browser.close();

// ---------- 3) Comunidade: doação com foto ----------
const C = await navegador({ mobile: true });
const c = await entrar(C.ctx, "ana", "comunidade.html");
await c.waitForSelector("#cmGrade", { timeout: 20000 }); await c.waitForTimeout(1500);
await c.locator(".cm-atalho.doacao").click(); await c.waitForSelector(".cm-form", { timeout: 10000 });
await c.locator(".cm-campo", { hasText: "Título" }).locator("input").fill("Cadeira de escritório");
await c.locator(".cm-campo", { hasText: "O que é" }).locator("select").selectOption({ index: 1 });
await c.locator(".cm-campo", { hasText: "Descrição" }).locator("textarea").fill("Funcionando, só retirar.");
await c.setInputFiles("#cmArquivo", garantirImagem("saida/st-cadeira.png", 900, 700)); await c.waitForTimeout(1200);
await c.check("#cmAceite");
await c.locator(".cm-form .cm-btn.pri").click(); await c.waitForTimeout(3500);
const doa = (await db.collection("comunidade").where("donoId", "==", U.ana).get()).docs.map((d) => d.data()).find((x) => x.titulo === "Cadeira de escritório");
ok(doa && doa.fotos.length === 1 && ST.test(doa.fotos[0]), "Comunidade: a foto foi para o Storage");
await c.locator(".cm-card", { hasText: "Cadeira de escritório" }).first().scrollIntoViewIfNeeded().catch(() => {});
const fundo = await c.locator(".cm-card", { hasText: "Cadeira de escritório" }).first().locator("[style*='127.0.0.1:9199']").first().evaluate((e) => getComputedStyle(e).backgroundImage).catch(() => "");
const urlFundo = (/url\("?([^")]+)/.exec(fundo) || [])[1];
const abre = urlFundo ? await c.evaluate(async (u) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i.naturalWidth > 0); i.onerror = () => ok(false); i.src = u; }), urlFundo) : false;
ok(abre, "Comunidade: a foto aparece no anúncio (vem do Storage e abre)");
await c.screenshot({ path: "saida/st-comunidade.png" });
await C.browser.close();
voltarRegras();
process.exit(process.exitCode || 0);
