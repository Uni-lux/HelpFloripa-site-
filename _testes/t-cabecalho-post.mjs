// Cabeçalho da publicação (17/11/2026): linha 1 = nome + selo de verificado + "· 3 h"; linha 2 = "@nick · (alfinete) local".
// Filtros do Diário: Textos e enquetes numa classe só. Chamadas: duração "1:05" inteira, sem corte.
// Uso: FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 node t-cabecalho-post.mjs
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { navegador, entrar } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const U = JSON.parse(readFileSync("saida/seed-ids.json", "utf8"));
const agora = Date.now(), ts = (m) => Timestamp.fromMillis(agora - m * 60000);
const base = { autorId: U.bruno, nome: "Bruno Reparos", fotoPerfil: "", curtidas: 0 };
await db.doc("diario/cab_local").set({ ...base, texto: "Ponte linda hoje", tipo: "texto", criadoEm: ts(30), local: { nome: "Ponte Hercílio Luz, Florianópolis, Santa Catarina", lat: -27.59, lng: -48.56 } });
await db.doc("diario/cab_enq").set({ ...base, texto: "", tipo: "enquete", criadoEm: ts(40), enquete: { pergunta: "Melhor praia?", opcoes: ["Joaquina", "Campeche"] } });
await db.doc(`relacoes/${U.ana}_${U.bruno}`).set({ seguidor: U.ana, seguido: U.bruno, criadoEm: ts(500) }, { merge: true });
const conv = [U.ana, U.bruno].sort().join("_");
await db.doc(`vinculos/${conv}`).set({ participantes: [U.ana, U.bruno], de: U.bruno, para: U.ana, tipoDe: "duo", tipoPara: "duo", status: "aceito", criadoEm: ts(900) });
await db.doc(`perfis_publicos/${U.bruno}`).set({ duoCapa: "gaveta" }, { merge: true });
await db.doc("chamadas/cab_lig").set({ de: U.bruno, para: U.ana, conv, tipo: "audio", status: "encerrada", criadoEm: ts(20), aceitaEm: ts(19.9), fimEm: Timestamp.fromMillis(agora - 19.9 * 60000 + 65000) });

for (const tema of ["claro", "escuro"]) {
  const A = await navegador({ mobile: true });
  await A.ctx.addInitScript((t) => { try { localStorage.setItem("hf-chat-config", JSON.stringify({ tema: t })); } catch {} }, tema);
  const p = await entrar(A.ctx, "ana", "feed.html");
  await p.waitForSelector(".post-card .pc-l1", { timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(2500);
  const r = await p.evaluate(() => {
    const card = [...document.querySelectorAll(".post-card")].find((c) => c._post?.id === "cab_local");
    if (!card) return null;
    const q = card.querySelector(".quem"), n = q.querySelector(".pc-nome").getBoundingClientRect(), k = q.querySelector(".pc-nick").getBoundingClientRect();
    const selo = q.querySelector(".pc-selo"), pin = q.querySelector(".local-post svg").getBoundingClientRect();
    card.scrollIntoView({ block: "center" });
    return { l1: q.querySelector(".pc-l1").innerText, l2: q.querySelector(".pc-l2").innerText, alinhado: Math.abs(n.left - k.left), selo: !!selo && getComputedStyle(selo).display !== "none", pin: pin.width > 8 };
  });
  ok(r && /Bruno/.test(r.l1) && /·\s*\d+ min/.test(r.l1), `${tema}: linha 1 com nome e tempo (${r?.l1})`);
  ok(r?.selo, `${tema}: selo de verificado ao lado do nome`);
  ok(r && /@brunoreparos/.test(r.l2) && /Ponte Hercílio/.test(r.l2), `${tema}: linha 2 com @ e local (${r?.l2.replace(/\n/g, " ")})`);
  ok(r?.pin, `${tema}: alfinete do local à mostra`);
  const rosa = await p.evaluate(() => { const x = document.querySelector(".post-card .pc-av .pc-rosa"); if (!x) return null; const a = x.closest(".pc-av").getBoundingClientRect(), b = x.getBoundingClientRect(); return { canto: b.right > a.right - 8 && b.bottom > a.bottom - 8, cor: getComputedStyle(x).color }; });
  ok(rosa?.canto && /224, 36, 59/.test(rosa.cor), `${tema}: rosinha do duo no canto da foto (${JSON.stringify(rosa)})`);
  ok(r && r.alinhado < 1, `${tema}: nome e @ começam no mesmo ponto (${r?.alinhado})`);
  await p.waitForTimeout(400);
  await p.screenshot({ path: `saida/cab-${tema}.png` });
  if (tema === "claro") {
    const tipos = await p.$$eval("#tiposFeed button", (bs) => bs.map((b) => b.title));
    ok(tipos.length === 3 && tipos.includes("Textos e enquetes"), "filtros: Tudo, Vídeos e Textos e enquetes (" + tipos.join(", ") + ")");
    await p.click('#tiposFeed [data-tipo="textos"]'); await p.waitForTimeout(800);
    const ids = await p.$$eval(".post-card", (cs) => cs.map((c) => c._post?.id));
    ok(ids.includes("cab_enq") && ids.includes("cab_local"), "Textos e enquetes mostra os dois tipos");
    await p.screenshot({ path: "saida/cab-topo.png" });
    const m = await entrar(A.ctx, "ana", "mensagens.html");
    await m.waitForTimeout(2500);
    await m.click('[data-modo="chamadas"], .modos button:has-text("Chamadas")').catch(() => {});
    await m.waitForSelector(".rc-dur", { timeout: 10000 }).catch(() => {});
    await m.waitForTimeout(800);
    const d = await m.evaluate(() => { const x = document.querySelector(".rc-dur"); if (!x) return null; const r = x.getBoundingClientRect(), b = x.closest(".rc-item").querySelector(".rc-lado").getBoundingClientRect(); return { t: x.innerText, inteiro: x.scrollWidth <= x.clientWidth + 1, livre: r.right <= b.left }; });
    ok(d && d.t.trim() === "1:05", `chamadas: duração no formato curto (${d?.t})`);
    ok(d?.inteiro && d?.livre, "chamadas: duração inteira, sem passar por baixo do botão");
    await m.screenshot({ path: "saida/cab-chamadas.png" });
  }
  await A.browser.close();
}
