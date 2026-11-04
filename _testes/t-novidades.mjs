// Puxar esperto + "Novas ↑" + fotos suaves no Diário, Explorar, Comunidade (mural), Notificações, painel do sino e
// Mensagens. Mede as leituras pelo proxy-contador: sem novidade, puxar não relê as listas.
// Uso: FS_PORTA=8086 node t-novidades.mjs   (emulador + servidor-csp + proxy-contador + seed)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
if (process.env.FS_PORTA !== "8086") { console.error("Rode com FS_PORTA=8086 (medidor de leituras)."); process.exit(1); }
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
let falhas = 0; const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) falhas++; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const contador = (c) => fetch("http://127.0.0.1:8086/__" + c).then((r) => (c === "contagem" ? r.json() : r.text()));
const PX = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const A = await navegador({ mobile: true });
await A.ctx.addInitScript(() => { window.__hfTesteNovidades = 2500; });
const erros = [];
let p = await entrar(A.ctx, "ana", "feed.html");
p.on("pageerror", (e) => erros.push(e.message));
let cdp = await A.ctx.newCDPSession(p);
const t = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
async function puxar(x = 195, y = null, dist = 300) {
  if (y == null) y = await p.evaluate(() => { for (let y = 140; y < 700; y += 20) { const e = document.elementFromPoint(195, y); if (e && !e.closest("input, textarea, select, header, a, button, video, canvas")) return y; } return 320; });
  await t("touchStart", [[x, y]]);
  for (let k = 1; k <= 14; k++) { await t("touchMove", [[x, y + (dist * k) / 14]]); await p.waitForTimeout(16); }
  await t("touchEnd", []);
  await p.waitForTimeout(2200);
}
const nova = (id, quem, texto) => db.doc(`diario/${id}`).set({ autorId: U[quem], nome: quem === "bruno" ? "Bruno" : "Edu", texto, tipo: "texto", autorUf: "SC", autorIbge: 4205407, criadoEm: Timestamp.now() });

// ---------- Diário ----------
await p.waitForSelector("#listaFeed .post", { timeout: 30000 }).catch(() => {});
await p.waitForTimeout(4000);
await contador("zerar");
await p.evaluate(() => scrollTo(0, 0));
await puxar();
let c = await contador("contagem");
ok(!c.colecoes.diario, `Diário: puxar sem novidade não relê as publicações (${c.colecoes.diario || 0} lidas)`);
const id1 = "novid1" + Date.now();
await nova(id1, "bruno", "Publicação nova " + id1);
await puxar();
await p.waitForFunction((x) => document.body.textContent.includes(x), id1, { timeout: 12000 }).catch(() => {});
ok(await p.evaluate((x) => document.body.textContent.includes(x), id1), "Diário: com novidade, puxar traz a publicação nova");
// Pílula: chega uma publicação enquanto a pessoa está lá embaixo.
await p.evaluate(() => { document.body.style.minHeight = "4000px"; scrollTo(0, 900); });
const id2 = "novid2" + Date.now();
await nova(id2, "edu", "Chegou agora " + id2);
await p.waitForSelector(".hf-novas.on", { timeout: 15000 }).catch(() => {});
const pil = await p.evaluate(() => { const b = document.querySelector(".hf-novas.on"); return b ? { t: b.textContent, rostos: b.querySelectorAll(".hn-rostos i").length } : null; });
ok(pil && /Novas publicações/.test(pil.t) && pil.rostos >= 1, `Diário: pílula “${pil?.t}” com ${pil?.rostos || 0} rosto(s)`);
await p.screenshot({ path: "saida/novidades-pilula.png" });
await p.locator(".hf-novas.on").tap().catch(() => {});
await p.waitForFunction((x) => document.body.textContent.includes(x), id2, { timeout: 12000 }).catch(() => {});
await p.waitForTimeout(800);
ok(await p.evaluate((x) => document.body.textContent.includes(x) && scrollY < 50 && !document.querySelector(".hf-novas.on"), id2), "Diário: tocar na pílula sobe, mostra a nova e a pílula some");

// ---------- Explorar ----------
await p.evaluate(() => window.__hfTrocarAba?.("explorar")); await p.waitForTimeout(4000);
await p.evaluate(() => scrollTo(0, 0));
await contador("zerar");
await puxar();
c = await contador("contagem");
ok(!c.colecoes.diario && !c.colecoes.negocios, `Explorar: puxar sem novidade não relê (${c.colecoes.diario || 0} publicações, ${c.colecoes.negocios || 0} negócios)`);
ok(!(await p.evaluate(() => document.querySelector(".hf-novas.on"))), "Explorar: a pílula do Diário não aparece aqui");

// ---------- Comunidade (mural) ----------
await p.goto(p.url().replace(/[a-z-]+\.html.*/, "mural.html"));
await p.waitForTimeout(5000);
await contador("zerar");
await p.evaluate(() => scrollTo(0, 0));
await puxar();
c = await contador("contagem");
ok(!c.colecoes.comunidade, `Mural: puxar sem novidade não relê (${c.colecoes.comunidade || 0} anúncios)`);
await p.evaluate(() => { document.body.style.minHeight = "4000px"; scrollTo(0, 900); });
const cid = "novidCom" + Date.now();
await db.doc(`comunidade/${cid}`).set({ donoId: U.bruno, tipo: "doacao", categoria: "doacao", titulo: "Sofá novo " + cid, descricao: "Doação", status: "disponivel", cidade: "Florianópolis", uf: "SC", cidadeIbge: 4205407, criadoEm: Timestamp.now(), atualizadoEm: Timestamp.now(), expiraEm: Timestamp.fromMillis(Date.now() + 30 * 864e5) });
await p.waitForSelector(".hf-novas.on", { timeout: 15000 }).catch(() => {});
ok(/Novas na Comunidade/.test(await p.evaluate(() => document.querySelector(".hf-novas.on")?.textContent || "")), "Mural: pílula “Novas na Comunidade”");
await p.locator(".hf-novas.on").tap().catch(() => {});
await p.waitForFunction((x) => document.body.textContent.includes(x), cid, { timeout: 12000 }).catch(() => {});
ok(await p.evaluate((x) => document.body.textContent.includes(x), cid), "Mural: tocar na pílula traz o anúncio novo");

// ---------- Notificações ----------
await p.goto(p.url().replace(/[a-z-]+\.html.*/, "notificacoes.html"));
await p.waitForTimeout(5000);
await contador("zerar");
await p.evaluate(() => scrollTo(0, 0));
await puxar();
c = await contador("contagem");
const listas = ["relacoes", "curtidas", "comentarios", "diario", "republicacoes", "vinculos"].reduce((n, k) => n + (c.colecoes[k] || 0), 0);
ok(listas === 0, `Notificações: puxar não relê o que já chega ao vivo (${listas} lidas)`);
await p.evaluate(() => { document.body.style.minHeight = "4000px"; scrollTo(0, 900); });
await db.doc(`relacoes/${U.fabi}_${U.ana}`).set({ tipo: "seguir", seguidorId: U.fabi, alvoId: U.ana, criadoEm: Timestamp.now() });
await p.waitForSelector(".hf-novas.on", { timeout: 15000 }).catch(() => {});
ok(/1 nova notificação/.test(await p.evaluate(() => document.querySelector(".hf-novas.on")?.textContent || "")), "Notificações: pílula “1 nova notificação” quando chega um seguidor");
await p.locator(".hf-novas.on").tap().catch(() => {});
await p.waitForTimeout(1200);
ok(await p.evaluate(() => scrollY < 50 && !document.querySelector(".hf-novas.on")), "Notificações: tocar sobe e a pílula some");
await db.doc(`relacoes/${U.fabi}_${U.ana}`).delete();

// ---------- Painel do sino ----------
await p.goto(p.url().replace(/[a-z-]+\.html.*/, "ajuda.html"));
await p.waitForTimeout(3000);
const sino = p.locator('.topo a[href="notificacoes.html"]').first();
await sino.click();
await p.waitForSelector(".pa.on .nt2-item, .pa.on .nt2-vazio, .pa.on .lista-vazia", { timeout: 20000 }).catch(() => {});
await p.waitForTimeout(2500);
await contador("zerar");
const corpo = await p.evaluate(() => { const r = document.querySelector(".pa.on .pa-corpo").getBoundingClientRect(); return [r.x + r.width / 2, r.y + 30]; });
await puxar(corpo[0], corpo[1]);
c = await contador("contagem");
const relidas = ["relacoes", "curtidas", "comentarios", "diario", "republicacoes", "vinculos", "avaliacoes"].reduce((n, k) => n + (c.colecoes[k] || 0), 0);
ok(relidas === 0, `Sino: puxar sem novidade não relê (${relidas} lidas)`);
await db.doc(`relacoes/${U.gui}_${U.ana}`).set({ tipo: "seguir", seguidorId: U.gui, alvoId: U.ana, criadoEm: Timestamp.now() });
await p.waitForTimeout(800);
const antesN = await p.evaluate(() => document.querySelectorAll(".pa.on .nt2-item").length);
await puxar(corpo[0], corpo[1]);
await p.waitForTimeout(2500);
const depoisN = await p.evaluate(() => document.querySelectorAll(".pa.on .nt2-item").length);
ok(depoisN > antesN || (await p.evaluate(() => /Gui/i.test(document.querySelector(".pa.on").textContent))), `Sino: com seguidor novo, puxar traz a notificação (${antesN} → ${depoisN} itens)`);
await db.doc(`relacoes/${U.gui}_${U.ana}`).delete();

// ---------- Mensagens ----------
await p.goto(p.url().replace(/[a-z-]+\.html.*/, "mensagens.html"));
await p.waitForSelector("#listaConversas .conv-item, #listaConversas [data-id], #listaConversas > *", { timeout: 20000 }).catch(() => {});
await p.waitForTimeout(3000);
await contador("zerar");
const lc = await p.evaluate(() => { const r = document.getElementById("listaConversas").getBoundingClientRect(); return [r.x + r.width / 2, r.y + 40]; });
const itensAntes = await p.evaluate(() => document.getElementById("listaConversas").children.length);
await puxar(lc[0], lc[1]);
c = await contador("contagem");
ok(c.leituras <= 2, `Mensagens: puxar a lista = ${c.leituras} leitura(s) (as conversas já chegam ao vivo)`);
ok(await p.evaluate((n) => document.getElementById("listaConversas").children.length === n && !document.getElementById("listaConversas").style.transform, itensAntes), "Mensagens: lista redesenhada e no lugar");

// ---------- Fotos suaves ----------
await p.route("**/teste-foto-lenta.png", async (r) => { await new Promise((ok) => setTimeout(ok, 1500)); r.fulfill({ contentType: "image/png", body: Buffer.from(PX.split(",")[1], "base64") }); });
await p.goto(p.url().replace(/[a-z-]+\.html.*/, "ajuda.html"));
await p.waitForTimeout(1500);
const foto = await p.evaluate(async () => {
  const i = document.createElement("img"); i.width = 240; i.height = 160; i.src = "teste-foto-lenta.png?" + Date.now();
  document.body.appendChild(i);
  await new Promise((ok) => setTimeout(ok, 300));
  const carregando = i.classList.contains("hf-suave") && getComputedStyle(i).filter.includes("blur");
  await new Promise((ok) => i.complete ? ok() : i.addEventListener("load", ok));
  await new Promise((ok) => setTimeout(ok, 700));
  const icone = document.createElement("img"); icone.width = 24; icone.height = 24; icone.src = "teste-foto-lenta.png?b" + Date.now(); document.body.appendChild(icone);
  await new Promise((ok) => setTimeout(ok, 200));
  return { carregando, depois: !i.classList.contains("hf-suave") && getComputedStyle(i).filter === "none", icone: !icone.classList.contains("hf-suave") };
});
ok(foto.carregando, "foto lenta: brilho e desfoque enquanto chega");
ok(foto.depois, "foto lenta: nítida depois que chega");
ok(foto.icone, "ícone pequeno (24 px): sem efeito");

ok(!erros.length, `sem erros na página${erros.length ? ": " + erros.slice(0, 3).join(" | ") : ""}`);
await A.browser.close();
console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo"); process.exit(falhas ? 1 : 0);
