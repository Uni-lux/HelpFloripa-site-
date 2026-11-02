// Flash (02/11/2026): figurinha Contagem regressiva (números andando, "Lembrar-me", quem pediu lembrete, aviso no sino
// quando acaba) e Público do flash (só quem está no público vê).
// Uso: node t-flash-contagem.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
for (const u of [U.ana, U.bruno]) for (const s of (await db.collection("stories").where("autorId", "==", u).get()).docs) await s.ref.delete();
for (const d of (await db.collection("contagem_lembretes").get()).docs) await d.ref.delete();
await db.doc(`usuarios/${U.bruno}`).set({ genero: FieldValue.delete() }, { merge: true });
const erros = [];

// ---------- 1) Ana cria o flash com a contagem e o público ----------
const A = await navegador({ mobile: true });
const p = await entrar(A.ctx, "ana", "feed.html");
p.on("pageerror", (e) => erros.push(e.message));
await p.waitForTimeout(3500);
await p.locator(".story-circ").first().locator(".mais").tap(); await p.waitForSelector(".flash-criar", { timeout: 8000 }); await p.waitForTimeout(600);
await p.locator(".flash-modos button", { hasText: "Texto" }).tap(); await p.waitForTimeout(300);
await p.keyboard.type("Vem aí"); await p.locator(".flash-texto").blur();
await p.locator(".flash-ferr-btn[aria-label^='Figurinhas']").tap(); await p.waitForTimeout(300);
ok(await p.locator(".fig-pilula", { hasText: "Contagem" }).count() === 1, "figurinha “Contagem regressiva” nas figurinhas");
await p.locator(".fig-pilula", { hasText: "Contagem" }).tap(); await p.waitForTimeout(400);
ok(await p.locator(".fv-eh-ct .fv-ctg .ctg-num .ctg-casa").count() >= 3, "editor com o cartão e os números");
await p.keyboard.type("Lançamento da loja");
await p.locator(".fv-chip", { hasText: "Em 7 dias" }).tap(); await p.waitForTimeout(1200);
const dias = await p.locator(".fv-ctg .ctg-casa b").first().textContent();
ok(dias === "6" || dias === "7", `“Em 7 dias” muda os números na hora (${dias} dias)`);
await p.screenshot({ path: "saida/ct-editor.png" });
await p.locator(".flash-fig-viva .fe-pronto").tap(); await p.waitForTimeout(500);
ok(await p.locator(".flash-camada .flash-ct .ctg-tit").textContent() === "Lançamento da loja", "a contagem fica no cartão do flash");
// público: só mulheres
await p.locator(".flash-alvo").tap(); await p.waitForSelector(".pa-pagina .pa-opcao", { timeout: 6000 });
await p.locator(".pa-opcao", { hasText: "Personalizado" }).click();
await p.locator(".pa-chip", { hasText: "Mulheres" }).click();
await p.locator(".pa-pagina .pa-ok").click(); await p.waitForTimeout(400);
ok(await p.locator(".flash-alvo.on").count() === 1, "botão do público aceso depois de escolher");
await p.screenshot({ path: "saida/ct-criador.png" });
await p.locator(".flash-publicar").tap();
let doc = null;
for (let i = 0; i < 30 && !doc; i++) { await p.waitForTimeout(500); doc = (await db.collection("stories").where("autorId", "==", U.ana).get()).docs[0]; }
const d = doc?.data() || {};
const falta = (d.contagem?.fim?.toMillis?.() || 0) - Date.now();
ok(d.contagem?.titulo === "Lançamento da loja" && falta > 6.9 * 864e5 && falta < 7.1 * 864e5, "flash gravado com a contagem (7 dias)");
ok(d.alvo?.genero === "f", "flash gravado com o público (mulheres)");
await A.browser.close();

// ---------- 2) fora do público não vê; dentro vê e pede lembrete ----------
const B = await navegador({ mobile: true });
const b0 = await entrar(B.ctx, "bruno", `feed.html?flash=${doc.id}`);
b0.on("pageerror", (e) => erros.push(e.message));
await b0.waitForTimeout(5000);
ok(await b0.locator(".story-visor").count() === 0, "quem está fora do público não vê o flash");
await B.browser.close();
await db.doc(`usuarios/${U.bruno}`).set({ genero: "f" }, { merge: true });
const B2 = await navegador({ mobile: true });
const b = await entrar(B2.ctx, "bruno", `feed.html?flash=${doc.id}`);
b.on("pageerror", (e) => erros.push(e.message));
await b.waitForSelector(".story-visor .story-ct .ctg", { timeout: 15000 }); await b.waitForTimeout(800);
ok(true, "no público, o flash abre com a contagem");
const s1 = await b.locator(".story-ct .ctg-casa b").last().textContent(); await b.waitForTimeout(1300);
const s2 = await b.locator(".story-ct .ctg-casa b").last().textContent();
ok(s1 !== s2, `os segundos andam (${s1} → ${s2})`);
await b.locator(".story-ct .ctg-lembrar").click(); await b.waitForTimeout(1200);
ok((await b.locator(".story-ct .ctg-lembrar").textContent()).includes("Vou lembrar"), "“Lembrar-me” liga (Vou lembrar você)");
ok((await db.doc(`contagem_lembretes/${doc.id}_${U.bruno}`).get()).exists, "lembrete gravado");
await b.screenshot({ path: "saida/ct-visor.png" });
await B2.browser.close();

// ---------- 3) Ana vê quem pediu lembrete ----------
const C = await navegador({ mobile: true });
const c = await entrar(C.ctx, "ana", `feed.html?flash=${doc.id}`);
await c.waitForSelector(".story-ct .ctg-lembrar.quem", { timeout: 15000 }); await c.waitForTimeout(1500);
ok((await c.locator(".story-ct .ctg-lembrar.quem").textContent()).includes("1 pessoa pediu lembrete"), "autora vê “1 pessoa pediu lembrete”");
await c.locator(".story-ct .ctg-lembrar.quem").click(); await c.waitForSelector("#folhaLista.aberta .linha", { timeout: 6000 }).catch(() => {});
ok((await c.locator("#folhaLista.aberta .linha").first().textContent().catch(() => "")).includes("Bruno"), "a lista mostra quem pediu");
await C.browser.close();

// ---------- 4) aviso no sino quando a contagem acaba ----------
await db.doc(`contagem_lembretes/xAcabou_${U.bruno}`).set({ flashId: "xAcabou", autorId: U.ana, uid: U.bruno, titulo: "Promoção relâmpago", fim: Timestamp.fromMillis(Date.now() - 3600e3), criadoEm: Timestamp.now() });
const D = await navegador({ mobile: true });
const n = await entrar(D.ctx, "bruno", "notificacoes.html");
await n.waitForTimeout(5000);
ok((await n.locator("body").textContent()).includes("a contagem “Promoção relâmpago” terminou"), "notificações: “a contagem … terminou”");
await n.screenshot({ path: "saida/ct-sino.png" });
await D.browser.close();
await db.doc(`usuarios/${U.bruno}`).set({ genero: FieldValue.delete() }, { merge: true });

ok(!erros.length, "sem erros na página " + erros.join(" | "));
