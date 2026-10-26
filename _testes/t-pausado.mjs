// Sem plano, só um perfil de negócio no ar: Meus negócios marca os outros como "Pausado" e grava negocios.principal;
// a vitrine esconde o pausado (e os anúncios de imóveis quando o perfil Imóveis está pausado), o link direto avisa;
// "Deixar este no ar" troca; com plano (ou nos 3 dias de tolerância depois de vencer) tudo volta, com promoção.
// Sem plano a promoção não aparece. Comunidade no seletor de tipo do "Novo perfil".
// Uso: node seed.mjs && node t-pausado.mjs  (precisa das regras do repositório: campo principal)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, BASE } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const dia = 864e5;
await db.doc(`planos/${U.bruno}`).delete().catch(() => {});
await db.doc(`usuarios/${U.bruno}`).set({ negocioPrincipal: null }, { merge: true });
for (const t of ["servicos", "imoveis"]) await db.doc(`negocios/${U.bruno}_${t}`).set({ principal: null, atualizadoEm: Timestamp.now() }, { merge: true });
await db.doc(`negocios/${U.bruno}_servicos`).set({ promocao: { titulo: "10% na primeira visita", texto: "", codigo: "BEMVINDO10", ate: Timestamp.fromMillis(Date.now() + 5 * dia) } }, { merge: true });
const principais = async () => Promise.all(["servicos", "imoveis"].map(async (t) => (await db.doc(`negocios/${U.bruno}_${t}`).get()).data().principal));

const { browser, ctx } = await navegador({ mobile: true });
// ---------- 1) Meus negócios sem plano ----------
const b = await entrar(ctx, "bruno", "negocios.html");
await b.waitForSelector("#neg-imoveis .ng-status", { timeout: 20000 });
await b.waitForFunction(() => document.querySelector("#neg-imoveis .ng-status")?.textContent === "Pausado", null, { timeout: 15000 }).catch(() => {});
ok((await b.textContent("#neg-servicos .ng-status")) === "No ar" && (await b.textContent("#neg-imoveis .ng-status")) === "Pausado", "sem plano: o mais antigo (Freelances) no ar e Imóveis pausado");
ok(await b.locator("#neg-imoveis .neg-aviso.pausa").count() === 1 && await b.locator("#neg-servicos .neg-aviso.pausa").count() === 0, "aviso com \"Deixar este no ar\" e \"Ver planos\" só no pausado");
ok((await b.textContent("#neg-servicos .ng-promo-st")).includes("plano ativo"), "promoção salva: aparece com um plano ativo");
ok((await b.textContent("#planoBox")).includes("só um perfil"), "cartão do plano explica o limite: " + (await b.textContent("#planoBox")).replace(/\s+/g, " ").slice(0, 160));
await b.waitForTimeout(1500);
ok((await principais()).every((x) => x === "servicos"), "principal gravado nos dois perfis: " + (await principais()).join(", "));
await b.locator("#neg-imoveis .neg-aviso.pausa").scrollIntoViewIfNeeded();
await b.screenshot({ path: "saida/pausado-meus.png" });

// ---------- 2) quem procura ----------
const ctx2 = (await navegador({ mobile: true })).ctx;
let a = await entrar(ctx2, "ana", "servicos.html");
// A lista de perfis fica 10 min guardada no aparelho de quem visita: depois de cada mudança, um visitante "novo".
const extras = [];
async function visitante(pagina) { const n = await navegador({ mobile: true }); extras.push(n.browser); return entrar(n.ctx, "ana", pagina); }
await a.waitForSelector("#vtGrade .vt-conta", { timeout: 20000 });
await a.waitForTimeout(800);
ok((await a.textContent("#vtGrade")).includes("Bruno Reparos"), "Freelances do Bruno (principal) aparece");
ok(await a.locator("#vtGrade .vt-promo-tag").count() === 0, "sem plano: sem selo de promoção no cartão");
await a.goto(BASE + "imoveis.html"); await a.waitForTimeout(3500);
ok(!(await a.textContent("#vtGrade")).includes("Apto na Trindade"), "anúncio do perfil Imóveis pausado não aparece");
await a.goto(BASE + "imoveis.html?anuncio=an1"); await a.waitForTimeout(3500);
ok((await a.textContent("body")).includes("pausado no momento"), "link direto do anúncio avisa que está pausado");
await a.goto(BASE + `servicos.html?negocio=${U.bruno}_servicos`); await a.waitForSelector(".vd-promo-lugar", { state: "attached", timeout: 15000 }); await a.waitForTimeout(1200);
ok(await a.locator(".vd-promo").count() === 0, "perfil aberto sem plano: sem o cartão da promoção");

// ---------- 3) trocar qual fica no ar ----------
await b.locator("#neg-imoveis .neg-aviso.pausa .ng-pri").click();
await b.locator(".hf-confirma .sim").click();
await b.waitForFunction(() => document.querySelector("#neg-imoveis .ng-status")?.textContent === "No ar", null, { timeout: 10000 }).catch(() => {});
ok((await b.textContent("#neg-imoveis .ng-status")) === "No ar" && (await b.textContent("#neg-servicos .ng-status")) === "Pausado", "\"Deixar este no ar\": Imóveis no ar e Freelances pausado");
await b.waitForTimeout(1500);
ok((await principais()).every((x) => x === "imoveis") && (await db.doc(`usuarios/${U.bruno}`).get()).data().negocioPrincipal === "imoveis", "escolha gravada na conta e nos perfis");
a = await visitante("servicos.html"); await a.waitForSelector("#vtGrade", { timeout: 20000 }); await a.waitForTimeout(3500);
ok(!(await a.textContent("#vtGrade")).includes("Bruno Reparos"), "Freelances pausado some da vitrine");
a = await visitante("imoveis.html"); await a.waitForTimeout(3500);
ok((await a.textContent("#vtGrade")).includes("Apto na Trindade"), "anúncio volta com o perfil Imóveis no ar");

// ---------- 4) com plano: tudo no ar, com promoção ----------
await db.doc(`planos/${U.bruno}`).set({ plano: "plus", meses: 1, ate: Timestamp.fromMillis(Date.now() + 20 * dia), ativadoEm: Timestamp.now(), ativadoPor: U.admin });
a = await visitante("servicos.html"); await a.waitForSelector("#vtGrade .vt-conta", { timeout: 20000 }); await a.waitForTimeout(2500);
ok((await a.textContent("#vtGrade")).includes("Bruno Reparos") && await a.locator("#vtGrade .vt-promo-tag").count() === 1, "com plano: os dois no ar e a promoção aparece");
// 2 dias depois de vencer: ainda vale (tolerância de 3 dias)
await db.doc(`planos/${U.bruno}`).set({ ate: Timestamp.fromMillis(Date.now() - 2 * dia) }, { merge: true });
a = await visitante("servicos.html"); await a.waitForSelector("#vtGrade .vt-conta", { timeout: 20000 }); await a.waitForTimeout(2500);
ok((await a.textContent("#vtGrade")).includes("Bruno Reparos"), "venceu há 2 dias: ainda no ar (3 dias para renovar)");
await b.goto(BASE + "negocios.html"); await b.waitForSelector("#planoBox:not([hidden])", { timeout: 20000 });
ok((await b.textContent("#planoBox")).includes("venceu"), "Meus negócios avisa que venceu: " + (await b.textContent("#planoBox")).replace(/\s+/g, " ").slice(0, 140));
// 5 dias depois: volta a valer só um
await db.doc(`planos/${U.bruno}`).set({ ate: Timestamp.fromMillis(Date.now() - 5 * dia) }, { merge: true });
a = await visitante("servicos.html"); await a.waitForSelector("#vtGrade", { timeout: 20000 }); await a.waitForTimeout(3500);
ok(!(await a.textContent("#vtGrade")).includes("Bruno Reparos"), "venceu há 5 dias: só o principal (Imóveis) fica no ar");

// ---------- 5) Novo perfil: aviso sem plano e Comunidade no seletor ----------
await db.doc(`planos/${U.bruno}`).delete();
await b.goto(BASE + "negocios.html"); await b.waitForSelector("#neg-imoveis .ng-status", { timeout: 20000 }); await b.waitForTimeout(1500);
await b.locator(".ng-novo.delivery").click();
await b.waitForSelector(".hf-confirma", { timeout: 5000 });
ok((await b.textContent(".hf-confirma")).includes("só um perfil fica no ar"), "criar outro sem plano: avisa que o novo fica pausado");
await b.locator(".hf-confirma .sim").click();
await b.waitForSelector("#folhaNegocio.aberta", { timeout: 5000 });
const com = b.locator("#negTipo a.ng-tipo.comunidade");
ok(await com.count() === 1 && (await com.getAttribute("href")) === "comunidade.html?novo=doacao", "Comunidade no seletor de tipo, levando a anunciar na Comunidade");
ok(await b.locator("#negTipo .ng-tipo").count() === 6, "6 cartões no seletor (5 tipos + Comunidade)");
await b.screenshot({ path: "saida/pausado-tipos.png" });

await db.doc(`usuarios/${U.bruno}`).set({ negocioPrincipal: null }, { merge: true });
await db.doc(`negocios/${U.bruno}_servicos`).set({ promocao: null }, { merge: true });
await browser.close(); await ctx2.browser().close(); for (const x of extras) await x.close();
