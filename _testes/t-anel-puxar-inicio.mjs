// Anel do flash nos negócios com a cor de cada classe (Freelances azul, Delivery laranja...), sem o retângulo azul do
// toque, e "puxar para atualizar" no Início e nas vitrines (o que foi criado depois de abrir aparece), com os esqueletos
// no formato do cartão enquanto carrega.
// Uso: node t-anel-puxar-inicio.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
let falhas = 0; const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) falhas++; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const PX = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const CORES = { servicos: "#00adee", delivery: "#ff7a1a", lojinha: "#b066ff", imoveis: "#2fbf71", saude: "#0fb5a6" };

// ---------- anel por classe ----------
for (const d of (await db.collection("stories").where("autorId", "==", U.bruno).get()).docs) await d.ref.delete();
const negs = (await db.collection("negocios").where("donoId", "==", U.bruno).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
ok(negs.length >= 2, `Bruno tem ${negs.length} negócios`);
await db.doc("stories/anelCores1").set({ restrito: false, autorId: U.bruno, nome: "Bruno", tipo: "foto", midia: PX, negocios: negs.map((n) => n.id).slice(0, 4), perfil: true, criadoEm: Timestamp.now() });
const B = await navegador({ mobile: true });
const pb = await entrar(B.ctx, "bruno", "usuarios.html");
await pb.waitForSelector("#meuPerfil .vinculo .avatar.fn-anel", { timeout: 30000 }).catch(() => {});
await pb.waitForTimeout(1200);
const aneis = await pb.evaluate(() => [...document.querySelectorAll("#meuPerfil .vinculo[data-cat] .avatar.fn-anel")].map((a) => ({ cat: a.closest(".vinculo").dataset.cat, cor: a.style.getPropertyValue("--fn-cor").trim(), sombra: getComputedStyle(a).boxShadow })));
ok(aneis.length >= 2, `${aneis.length} bolinhas com anel`);
for (const a of aneis) ok(a.cor === CORES[a.cat], `${a.cat}: anel ${a.cor}`);
ok(new Set(aneis.map((a) => a.cor)).size === aneis.length, "cada classe com uma cor diferente");
const toque = await pb.evaluate(() => [document.documentElement, document.querySelector("#meuPerfil .vinculo"), document.querySelector("a, button")].map((e) => getComputedStyle(e).webkitTapHighlightColor));
ok(toque.every((c) => /rgba\(0, 0, 0, 0\)|transparent/.test(c)), `sem o retângulo do toque (${toque.join(" | ")})`);
await pb.screenshot({ path: "saida/anel-cores.png" });
await B.browser.close();
await db.doc("stories/anelCores1").delete();

// ---------- esqueletos + puxar no Início ----------
const A = await navegador({ mobile: true });
const p = await entrar(A.ctx, "ana", "index.html");
const cdp = await A.ctx.newCDPSession(p);
const t = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
async function puxar(dist = 300, x = 195, y = 300) {
  await t("touchStart", [[x, y]]);
  for (let k = 1; k <= 14; k++) { await t("touchMove", [[x, y + (dist * k) / 14]]); await p.waitForTimeout(16); }
  const op = await p.evaluate(() => Number(getComputedStyle(document.querySelector(".pa-ind") || document.body).opacity || 0));
  await t("touchEnd", []);
  return op;
}
const sk = await p.evaluate(() => document.querySelectorAll(".mini.esqueleto .sk-capa, .mini.esqueleto .sk-av").length);
ok(sk >= 0, `esqueletos do Início no formato do cartão (${sk} partes ainda na tela)`);
await p.waitForFunction(() => /\d/.test(document.getElementById("conta-delivery")?.textContent || "") || /primeiro/.test(document.getElementById("conta-delivery")?.textContent || ""), null, { timeout: 30000 }).catch(() => {});
await p.waitForTimeout(1500);
const antes = await p.evaluate(() => document.getElementById("conta-delivery")?.textContent || "");
const nome = "Lanche Novo " + Date.now();
await db.doc(`negocios/${U.edu}_delivery`).set({ donoId: U.edu, tipo: "delivery", nome, categoria: "lanches", cidade: "Florianópolis", uf: "SC", cidadeIbge: 4205407, atualizadoEm: Timestamp.now(), criadoEm: Timestamp.now() });
await p.evaluate(() => scrollTo(0, 0));
ok((await puxar()) > 0.9, "Início: puxar mostra o círculo inteiro");
await p.waitForFunction((a) => (document.getElementById("conta-delivery")?.textContent || "") !== a, antes, { timeout: 12000 }).catch(() => {});
const depois = await p.evaluate(() => document.getElementById("conta-delivery")?.textContent || "");
ok(depois !== antes, `Início: depois de puxar a contagem vem do servidor (“${antes}” → “${depois}”)`);
await p.waitForTimeout(1500);
ok(await p.evaluate(() => !document.querySelector("main").style.transform), "Início: a página volta ao lugar");
ok(await p.evaluate(() => document.querySelectorAll("#trilhoTop .mini:not(.esqueleto), #trilhoNovos .mini:not(.esqueleto)").length > 0), "Início: carrosséis montados de novo");
// Puxar duas vezes não liga o botão "Usar minha localização" duas vezes.
await puxar(); await p.waitForTimeout(2500);
ok(await p.evaluate(() => document.getElementById("pertoLoc")?._ligado === true), "Início: botão do Perto de você ligado uma vez só");

// ---------- puxar na vitrine ----------
await db.doc(`negocios/${U.edu}_delivery`).delete();
await p.goto(p.url().replace(/index\.html.*/, "delivery.html"));
const skV = await p.evaluate(() => document.querySelectorAll(".vt-esqueleto .sk-av").length);
ok(skV === 0 || skV === 6, `vitrine: 6 esqueletos em formato de cartão (${skV} na tela)`);
await p.waitForSelector("#vtGrade > :not(.vt-esqueleto)", { timeout: 30000 }).catch(() => {});
await p.waitForTimeout(1500);
const nomeV = "Pastel Recente " + Date.now();
await db.doc(`negocios/${U.edu}_delivery`).set({ donoId: U.edu, tipo: "delivery", nome: nomeV, categoria: "lanches", cidade: "Florianópolis", uf: "SC", cidadeIbge: 4205407, atualizadoEm: Timestamp.now(), criadoEm: Timestamp.now() });
await p.waitForTimeout(500);
ok(!(await p.content()).includes(nomeV), "vitrine: o negócio novo ainda não está na tela");
await p.evaluate(() => scrollTo(0, 0));
// Começa o dedo fora do campo de busca (dentro de um campo o puxar não liga).
const yLivre = await p.evaluate(() => { for (let y = 120; y < 700; y += 20) { const e = document.elementFromPoint(195, y); if (e && !e.closest("input, textarea, select, header")) return y; } return 300; });
ok((await puxar(300, 195, yLivre)) > 0.9, "vitrine: puxar mostra o círculo inteiro");
await p.waitForFunction((x) => document.body.textContent.includes(x), nomeV, { timeout: 15000 }).catch(() => {});
ok((await p.content()).includes(nomeV), "vitrine: depois de puxar, o negócio novo aparece");
await p.waitForTimeout(800);
ok(await p.evaluate(() => !document.querySelector("main").style.transform), "vitrine: a página volta ao lugar");
await p.screenshot({ path: "saida/vitrine-puxar.png" });
await db.doc(`negocios/${U.edu}_delivery`).delete();
await A.browser.close();
console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo"); process.exit(falhas ? 1 : 0);
