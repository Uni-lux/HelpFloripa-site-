// Puxar para atualizar "esperto" (como o Instagram) e vitrine preparada antes do toque terminar.
// - Vitrine: puxar pergunta ao servidor só o que mudou depois do mais recente da tela (sem novidade = 1 leitura); o que
//   é novo entra, o que mudou troca no lugar.
// - Início: puxar sem novidade não relê nada (só confere, ~3 leituras) e não remonta os cartões; com novidade recarrega.
// - Dedo parado numa classe = a vitrine é preparada (speculation rules); começar a rolar em cima não prepara;
//   cartão com ?negocio= só baixa o HTML (não conta visita de quem não abriu).
// Uso: FS_PORTA=8086 node t-puxar-esperto.mjs   (emulador + servidor-csp + proxy-contador + seed)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
if (process.env.FS_PORTA !== "8086") { console.error("Rode com FS_PORTA=8086 (medidor de leituras)."); process.exit(1); }
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
let falhas = 0; const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) falhas++; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const contador = (c) => fetch("http://127.0.0.1:8086/__" + c).then((r) => (c === "contagem" ? r.json() : r.text()));

const A = await navegador({ mobile: true });
const p = await entrar(A.ctx, "ana", "delivery.html");
const cdp = await A.ctx.newCDPSession(p);
const t = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
async function puxar() {
  await p.evaluate(() => scrollTo(0, 0));
  const y = await p.evaluate(() => { for (let y = 120; y < 700; y += 20) { const e = document.elementFromPoint(195, y); if (e && !e.closest("input, textarea, select, header, a, button")) return y; } return 300; });
  await t("touchStart", [[195, y]]);
  for (let k = 1; k <= 14; k++) { await t("touchMove", [[195, y + 22 * k]]); await p.waitForTimeout(16); }
  await t("touchEnd", []);
  await p.waitForFunction(() => !document.querySelector("main")?.style.transform, null, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(1500);
}

// ---------- vitrine ----------
await p.waitForSelector("#vtGrade > :not(.vt-esqueleto)", { timeout: 30000 }).catch(() => {});
await p.waitForTimeout(3000);
await contador("zerar");
await puxar();
let c = await contador("contagem");
ok(c.leituras <= 1, `vitrine: puxar sem novidade = ${c.leituras} leitura(s) (antes relia a lista inteira)`);

const nomeNovo = "Pastel Esperto " + Date.now();
await db.doc(`negocios/${U.edu}_delivery`).set({ donoId: U.edu, tipo: "delivery", nome: nomeNovo, categoria: "lanches", cidade: "Florianópolis", uf: "SC", cidadeIbge: 4205407, atualizadoEm: Timestamp.now(), criadoEm: Timestamp.now() });
await contador("zerar");
await puxar();
c = await contador("contagem");
ok(await p.evaluate((x) => document.body.textContent.includes(x), nomeNovo), "vitrine: o negócio novo aparece depois de puxar");
ok(c.leituras <= 8, `vitrine: com 1 novidade = ${c.leituras} leituras (o novo, o dono, o plano e a nota)`);

const nomeTrocado = "Pastel Renomeado " + Date.now();
await db.doc(`negocios/${U.edu}_delivery`).update({ nome: nomeTrocado, atualizadoEm: Timestamp.now() });
await puxar();
const txt = await p.evaluate(() => document.body.textContent);
ok(txt.includes(nomeTrocado) && !txt.includes(nomeNovo), "vitrine: o que mudou troca no lugar (sem o nome antigo repetido)");
await contador("zerar");
await puxar();
c = await contador("contagem");
ok(c.leituras <= 1, `vitrine: puxar de novo logo depois = ${c.leituras} leitura(s) (o mais recente não volta toda vez)`);
await db.doc(`negocios/${U.edu}_delivery`).delete();

// ---------- Início ----------
await p.goto(p.url().replace(/[a-z-]+\.html.*/, "index.html"));
await p.waitForFunction(() => document.querySelectorAll("#trilhoNovos .mini:not(.esqueleto)").length > 0, null, { timeout: 30000 }).catch(() => {});
await p.waitForTimeout(4000);
await p.evaluate(() => { const m = document.querySelector("#trilhoNovos .mini:not(.esqueleto)"); if (m) m.dataset.marca = "antes"; });
await contador("zerar");
await puxar();
c = await contador("contagem");
ok(c.leituras <= 3 && !c.contagens, `Início: puxar sem novidade = ${c.leituras} leitura(s), ${c.contagens} contagem(ns)`);
ok(await p.evaluate(() => !!document.querySelector("#trilhoNovos .mini[data-marca=antes]")), "Início: sem novidade os cartões não são remontados");
const antes = await p.evaluate(() => document.getElementById("conta-delivery")?.textContent || "");
await db.doc(`negocios/${U.edu}_delivery`).set({ donoId: U.edu, tipo: "delivery", nome: "Lanche Início " + Date.now(), categoria: "lanches", cidade: "Florianópolis", uf: "SC", cidadeIbge: 4205407, atualizadoEm: Timestamp.now(), criadoEm: Timestamp.now() });
await puxar();
await p.waitForFunction((a) => (document.getElementById("conta-delivery")?.textContent || "") !== a, antes, { timeout: 12000 }).catch(() => {});
const depois = await p.evaluate(() => document.getElementById("conta-delivery")?.textContent || "");
ok(depois !== antes, `Início: com novidade recarrega (“${antes}” → “${depois}”)`);
await db.doc(`negocios/${U.edu}_delivery`).delete();

// ---------- preparar a vitrine ao tocar ----------
await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
const regras = () => p.evaluate(() => [...document.querySelectorAll("script[type=speculationrules]")].map((s) => JSON.parse(s.textContent)));
const centro = (sel) => p.evaluate((s) => { const e = document.querySelector(s); e.scrollIntoView({ block: "center" }); const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, sel);
ok(await p.evaluate(() => HTMLScriptElement.supports?.("speculationrules") === true), "navegador aceita speculation rules");
// Começar a rolar em cima da classe: não prepara.
let [x, y] = await centro(".classe-card.delivery");
await t("touchStart", [[x, y]]); await t("touchMove", [[x, y - 30]]); await p.waitForTimeout(150); await t("touchCancel", []);
ok(!(await regras()).length, "rolar em cima da classe não prepara a página");
// Dedo parado: prepara a vitrine inteira.
[x, y] = await centro(".classe-card.servicos");
await t("touchStart", [[x, y]]); await p.waitForTimeout(150); await t("touchCancel", []);
let r = await regras();
ok(r.some((g) => g.prerender?.[0]?.urls?.[0]?.endsWith("/servicos.html")), "dedo parado na classe: Freelances preparada por trás (prerender)");
// Cartão que abre um perfil (?negocio=): só o HTML.
const temCartao = await p.evaluate(() => !!document.querySelector("#trilhoTop a.mini[href*='negocio='], #trilhoNovos a.mini[href*='negocio=']"));
if (temCartao) {
  [x, y] = await centro("#trilhoNovos a.mini[href*='negocio='], #trilhoTop a.mini[href*='negocio=']");
  await t("touchStart", [[x, y]]); await p.waitForTimeout(150); await t("touchCancel", []);
  r = await regras();
  ok(r.some((g) => g.prefetch?.[0]?.urls?.[0]?.includes("negocio=")) && !r.some((g) => g.prerender?.[0]?.urls?.[0]?.includes("negocio=")), "cartão de perfil: só baixa o HTML (não conta visita)");
} else ok(false, "Início sem cartão de negócio para testar");

await A.browser.close();
console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo"); process.exit(falhas ? 1 : 0);
