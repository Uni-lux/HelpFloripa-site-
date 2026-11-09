// Flash (09/11/2026, pedido do dono): figurinhas de hora/data no cartão novo (bolinha com ícone + texto, 5 estilos que um
// toque troca), enquete que aumenta e diminui com dois dedos (o tamanho k vai gravado e o visor desenha igual), e a
// página do lugar no Diário (feed.html?local=) com cabeçalho próprio.
// Uso: node seed.mjs && node t-flash-figurinhas2.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
for (const s of (await db.collection("stories").where("autorId", "==", U.ana).get()).docs) await s.ref.delete();

const { browser, ctx } = await navegador({ mobile: true });
await ctx.addInitScript(() => { try { localStorage.setItem("hf-tema", "escuro"); } catch {} });
const p = await entrar(ctx, "ana", "feed.html");
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.emulateMedia({ colorScheme: "dark" });
await p.waitForTimeout(3500);
const cdp = await ctx.newCDPSession(p);
const toques = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
async function pinca(cx, cy, d0, d1) {
  const pt = (d) => [[cx - d, cy], [cx + d, cy]];
  await toques("touchStart", [pt(d0)[0]]); await p.waitForTimeout(40);
  await toques("touchMove", pt(d0)); await toques("touchStart", pt(d0)); await p.waitForTimeout(40);
  for (let k = 1; k <= 8; k++) { await toques("touchMove", pt(d0 + ((d1 - d0) * k) / 8)); await p.waitForTimeout(20); }
  await toques("touchEnd", []); await p.waitForTimeout(300);
}

await p.locator(".story-circ").first().locator(".mais").tap();
await p.waitForSelector(".flash-criar", { timeout: 8000 }); await p.waitForTimeout(700);
await p.locator(".flash-modos button", { hasText: "Texto" }).tap(); await p.waitForTimeout(300);
await p.keyboard.type("Hoje tem novidade");
await p.locator(".flash-texto").blur();
const figura = async (nome) => { await p.locator(".flash-ferr-btn[aria-label^='Figurinhas']").tap(); await p.waitForTimeout(300); await p.locator(".fig-pilula", { hasText: nome }).first().tap(); await p.waitForTimeout(400); };
await figura("Horário"); await figura("Data");
const hora = p.locator(".flash-fig.fig-hora"), data = p.locator(".flash-fig.fig-data");
ok(await hora.locator(".fig-chip svg").count() === 1 && await data.locator(".fig-chip svg").count() === 1, "hora e data com a bolinha do ícone");
ok(await hora.evaluate((e) => e.classList.contains("est-0")) && await hora.locator(".fig-tx.fig-grad").count() === 1, "estilo Clássico: branco com o texto em degradê");
// um toque troca o estilo: Clássico → Vidro → Noite → Help Floripa → Vibrante → Clássico
const estilos = [];
for (let i = 0; i < 5; i++) { await hora.tap(); await p.waitForTimeout(250); estilos.push(await hora.evaluate((e) => [...e.classList].find((c) => /^est-/.test(c)))); }
ok(estilos.join(",") === "est-1,est-2,est-3,est-4,est-0", "5 estilos em roda: " + estilos.join(","));
await hora.tap(); await p.waitForTimeout(150); await hora.tap(); await p.waitForTimeout(150); await hora.tap(); await p.waitForTimeout(200); // fica no Help Floripa
await data.tap(); await p.waitForTimeout(200); // Vidro

// enquete com pinça
await figura("Enquete");
await p.locator(".fv-perg").fill("Vem amanhã?");
await p.locator(".flash-fig-viva .fe-pronto").tap(); await p.waitForTimeout(400);
const enq = p.locator(".flash-camada .flash-txt").filter({ has: p.locator(".fe-enq, .fe-enquete, .fe-teste") }).first();
const e0 = await enq.boundingBox().catch(() => null) || await p.locator(".flash-camada .flash-txt").last().boundingBox();
const alvoEnq = (await enq.count()) ? enq : p.locator(".flash-camada .flash-txt").last();
await pinca(e0.x + e0.width / 2, e0.y + e0.height / 2, 30, 46);
const e1 = await alvoEnq.boundingBox();
const kTela = await alvoEnq.evaluate((e) => Number((/scale\(([\d.]+)\)/.exec(e.style.transform) || [0, 1])[1]));
const pal = await p.locator(".flash-palco").boundingBox();
ok(e1.x >= pal.x - 1 && e1.x + e1.width <= pal.x + pal.width + 1, `a enquete maior continua inteira dentro do cartão (${Math.round(e1.x)}–${Math.round(e1.x + e1.width)} no cartão ${Math.round(pal.x)}–${Math.round(pal.x + pal.width)})`);
ok(kTela > 1.2 && e1.width > e0.width * 1.2, `pinça aumenta a enquete (${Math.round(e0.width)} → ${Math.round(e1.width)} px, k ${kTela})`);
await p.screenshot({ path: "saida/fg2-criador.png" });
await p.locator(".flash-publicar").tap();
await p.waitForSelector(".flash-criar", { state: "detached", timeout: 15000 }).catch(() => {});
await p.waitForTimeout(1500);
const meus = (await db.collection("stories").where("autorId", "==", U.ana).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const f = meus[0] || {};
ok(f.enquete?.k > 1.2 && f.enquete?.k <= 1.3, "o tamanho vai gravado na enquete: k " + f.enquete?.k);

// visor: abre o flash e confere o tamanho da enquete
await p.goto(`http://127.0.0.1:5057/feed.html?flash=${f.id}`); await p.waitForSelector(".story-visor .story-enq", { timeout: 15000 });
await p.waitForTimeout(800);
const kVisor = await p.locator(".story-visor .story-enq").first().evaluate((w) => Number(w.dataset.k || 1));
ok(Math.abs(kVisor - f.enquete.k) < 0.01, "o visor desenha a enquete no mesmo tamanho (k " + kVisor + ")");
await p.screenshot({ path: "saida/fg2-visor.png" });
await p.keyboard.press("Escape"); await p.waitForTimeout(400);

// página do lugar
await p.goto("http://127.0.0.1:5057/feed.html?local=-27.6602,-48.5203&n=" + encodeURIComponent("Tapera da Base, Florianópolis"));
await p.waitForSelector("#feedLugar", { timeout: 15000 }); await p.waitForTimeout(2500);
ok((await p.textContent("#feedLugar h2")).includes("Tapera da Base, Florianópolis"), "lugar: nome inteiro no cabeçalho");
ok(/publicaç/.test(await p.textContent("#feedLugar .fl-qtd")), "lugar: quantas publicações → " + (await p.textContent("#feedLugar .fl-qtd")));
ok(await p.locator("#storiesFeed").isHidden() && await p.locator("#filtroFeed").isHidden(), "lugar: sem a fileira do Flash e sem a linha de filtros apertada");
ok(await p.locator("#feedLugar .fl-bt", { hasText: "Como chegar" }).count() === 1 && await p.locator("#feedLugar .fl-bt", { hasText: "Publicar aqui" }).count() === 1, "lugar: Como chegar e Publicar aqui");
await p.screenshot({ path: "saida/fg2-lugar.png" });
await p.locator("#feedLugar .fl-voltar").tap(); await p.waitForTimeout(1500);
ok(await p.locator("#feedLugar").count() === 0 && await p.locator("#storiesFeed").isVisible(), "voltar ao Diário");
ok(!erros.length, "sem erros na página " + erros.join(" | "));
await browser.close();
