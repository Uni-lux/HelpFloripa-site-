// SOS em etapas (12/11/2026, pedido do dono): o Social primeiro; se ninguém do Social aceitar em 3 min, quem está perto
// e a equipe de segurança (chamado URGENTE no suporte, fila Segurança). Sem Social: perto + equipe na hora.
// Vale-presente num negócio (qualquer tipo) e ícones no lugar dos emojis.
// Uso: node seed.mjs && node t-sos-etapas.mjs
import { navegador, entrar, BASE, USUARIOS as U } from "./nav.mjs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
const db = getFirestore(initializeApp({ projectId: "demo-hf" }));
const ok = (c, m) => { console.log(c ? "  ✔" : "  ✘", m); if (!c) process.exitCode = 1; };
const esperar = async (fn, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn().catch(() => false)) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
const par = [U.ana, U.bruno].sort();
await db.doc(`vinculos/${par[0]}_${par[1]}`).set({ participantes: par, de: U.ana, para: U.bruno, tipoDe: "amigo", tipoPara: "amigo", status: "aceito", criadoEm: Timestamp.now() });
for (const d of (await db.collection("vinculos").where("participantes", "array-contains", U.edu).get()).docs) await d.ref.delete();
for (const c of ["sos", "presentes"]) for (const d of (await db.collection(c).get()).docs) await db.recursiveDelete(d.ref);
for (const d of (await db.collection("suporte").where("categoria", "==", "sos").get()).docs) await db.recursiveDelete(d.ref);
async function abrir(quem, lat, lng, pagina) {
  const n = await navegador({ mobile: true });
  await n.ctx.route(/tile\.openstreetmap\.org/, (r) => r.fulfill({ body: PNG, contentType: "image/png" }));
  await n.ctx.grantPermissions(["geolocation"]); await n.ctx.setGeolocation({ latitude: lat, longitude: lng });
  await n.ctx.addInitScript(([la, lo]) => { try { localStorage.setItem("hf-perto", JSON.stringify({ lat: la, lng: lo, em: Date.now() })); } catch {} }, [lat, lng]);
  const p = await entrar(n.ctx, quem, pagina);
  await p.setViewportSize({ width: 390, height: 844 });
  return { ...n, p };
}
const erros = [];
// 1) Ana (tem o Bruno no Social) pede ajuda: padrão = Social primeiro
const A = await abrir("ana", -27.595, -48.548, "alertas.html"); const pa = A.p; pa.on("pageerror", (e) => erros.push(e.message));
await pa.waitForSelector("#alSos", { timeout: 20000 }); await pa.click("#alSos");
await pa.waitForSelector('.al-tipo[data-tipo="acidente"] .hf-ic');
ok(await pa.locator(".al-tipo .hf-ic svg").count() === 7, "tipos do SOS com ícones (sem emoji)");
await pa.waitForFunction(() => /1 pessoa recebe/.test(document.querySelector(".al-etapas")?.textContent || ""), null, { timeout: 10000 });
ok(await pa.locator('[data-perto="depois"][aria-pressed="true"]').count() === 1, "com Social: padrão = avisar quem está perto só se ninguém do Social aceitar");
await pa.click('.al-tipo[data-tipo="acidente"]'); await pa.fill("#alSosTexto", "Caí de bicicleta na ciclovia");
await pa.screenshot({ path: "saida/sos-etapas-pedir.png", fullPage: false });
await pa.click("#alSosEnviar");
ok(await esperar(async () => (await db.collection("sos").get()).size === 1), "SOS gravado");
let s = (await db.collection("sos").get()).docs[0]; let d = s.data();
ok(d.publico === false && d.escalarMin === 3 && d.equipe === true, "nasce só para o Social, escala em 3 min, com equipe");
await pa.waitForSelector(".al-etapas.vivo", { timeout: 10000 });
ok(/Se ninguém do Social aceitar, avisamos em [0-9]:/.test(await pa.textContent(".al-etapas.vivo")), "tela do SOS mostra a contagem para avisar quem está perto");
await pa.screenshot({ path: "saida/sos-etapas-esperando.png" });
// 2) Fabi está perto e não vê ainda
const F = await abrir("fabi", -27.596, -48.549, "alertas.html"); const pf = F.p;
await pf.waitForTimeout(3500);
ok(await pf.locator(`[data-sos="${s.id}"]`).count() === 0, "quem está perto ainda não vê (Social primeiro)");
// 3) passam 3 min sem ninguém aceitar → escala sozinho
await s.ref.update({ criadoEm: Timestamp.fromMillis(Date.now() - 4 * 60000) });
ok(await esperar(async () => (await s.ref.get()).data().publico === true, 20000), "3 min sem ninguém do Social: abre para quem está perto");
ok(await esperar(async () => !!(await s.ref.get()).data().suporteId, 10000), "chamado urgente da equipe criado");
d = (await s.ref.get()).data();
const sup = (await db.doc(`suporte/${d.suporteId}`).get()).data() || {};
ok(sup.categoria === "sos" && sup.prioridade === "urgente", "chamado na fila de Segurança como URGENTE");
const msg = (await db.doc(`suporte/${d.suporteId}/mensagens/inicio`).get()).data()?.texto || "";
ok(/google\.com\/maps\?q=/.test(msg) && /alertas\.html\?sos=/.test(msg), "chamado com o mapa e o link para acompanhar");
await pa.waitForTimeout(1500);
ok(/Avisada como urgente · chamado #/.test(await pa.textContent(".al-etapas.vivo")), "etapas: equipe avisada com o número do chamado");
await pa.screenshot({ path: "saida/sos-etapas-escalado.png" });
await pf.reload(); 
ok(await esperar(async () => (await pf.locator(`[data-sos="${s.id}"]`).count()) === 1, 15000), "agora quem está perto vê o pedido");
// 4) Edu sem Social: perto + equipe na hora
const E = await abrir("edu", -27.594, -48.547, "alertas.html"); const pe = E.p; pe.on("pageerror", (e) => erros.push(e.message));
await pe.waitForSelector("#alSos", { timeout: 20000 }); await pe.click("#alSos");
await pe.waitForFunction(() => /ninguém no Social/.test(document.querySelector(".al-etapas")?.textContent || ""), null, { timeout: 10000 });
ok(await pe.locator('[data-perto="depois"]').isHidden() && await pe.locator('[data-perto="agora"][aria-pressed="true"]').count() === 1, "sem Social: quem está perto na hora");
await pe.click('.al-tipo[data-tipo="perdido"]'); await pe.click("#alSosEnviar");
ok(await esperar(async () => { const x = (await db.collection("sos").where("uid", "==", U.edu).get()).docs[0]?.data(); return x?.publico === true && !!x.suporteId; }), "sem Social: aberto para a área e equipe avisada na hora");
// 5) Vale-presente num negócio de serviços (Fabi → Ana, Bruno Reparos)
await db.doc(`pref_publicas/${U.ana}`).set({ presentes: "todos" }, { merge: true });
const negId = (await db.collection("negocios").where("donoId", "==", U.bruno).where("tipo", "==", "servicos").get()).docs[0].id;
await pf.goto(BASE + `presentes.html?para=${U.ana}&negocio=${negId}&tipo=vale`); await pf.waitForTimeout(3500);
ok(await pf.locator('.ent-op[data-tipo="vale"][aria-checked="true"]').count() === 1, "“Dar de presente” num serviço abre o vale-presente");
ok(await pf.locator(".ent-op .hf-ic svg").count() >= 6, "tipos de presente com ícones");
await pf.locator(".ent-chips .ent-chip", { hasText: "100" }).click();
await pf.screenshot({ path: "saida/presente-vale.png" });
await pf.click("#prMandar");
ok(await esperar(async () => (await db.collection("presentes").where("tipo", "==", "vale").get()).size === 1), "vale-presente gravado");
const vale = (await db.collection("presentes").where("tipo", "==", "vale").get()).docs[0];
ok(vale.data().donoId === U.bruno && vale.data().valor === 100, "vale com o dono do negócio e o valor");
await vale.ref.update({ status: "aceito" });
await pa.goto(BASE + `presentes.html?id=${vale.id}`); await pa.waitForTimeout(3000);
await pa.screenshot({ path: "saida/presente-vale-recebido.png" });
await pa.locator(".ent-btn", { hasText: "Usar o vale" }).click(); await pa.locator(".hf-confirma-fundo button", { hasText: "Usar o vale" }).click();
ok(await esperar(async () => (await vale.ref.get()).data().status === "usado"), "Ana usou o vale");
const convAB = [U.ana, U.bruno].sort().join("_");
ok(await esperar(async () => (await db.collection(`conversas/${convAB}/mensagens`).get()).docs.some((m) => m.data().cartao?.acao === "usar")), "o negócio recebe o vale no Mensagens");
ok(!erros.length, "sem erros nas páginas" + (erros.length ? ": " + erros.join(" | ") : ""));
await Promise.all([A.browser.close(), F.browser.close(), E.browser.close()]);
