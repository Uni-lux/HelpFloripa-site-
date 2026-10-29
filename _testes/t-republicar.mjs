// Diário único (fotos, vídeos, textos e enquetes juntos, com filtro de tipo), botão Republicar no meio da barra
// (Enviar por último), "Fulano republicou" no Diário de quem segue, aviso para o autor e nome novo nas publicações antigas.
// Uso: node seed.mjs && node t-republicar.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, BASE } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const T = (h) => Timestamp.fromMillis(Date.now() - h * 36e5);
const FOTO = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";
const base = (uid, nome) => ({ autorId: uid, nome, fotoPerfil: "", tags: [], autorUf: "SC", autorIbge: 4205407 });
await db.doc("diario/rp_foto").set({ ...base(U.dani, "Dani"), texto: "Obra entregue hoje", mediaUrl: FOTO, mediaTipo: "image", criadoEm: T(1) });
await db.doc("diario/rp_texto").set({ ...base(U.dani, "Dani"), texto: "Dica rápida só em texto", criadoEm: T(2) });
await db.doc("diario/rp_enq").set({ ...base(U.dani, "Dani"), texto: "Votem", enquete: { pergunta: "Melhor dia?", opcoes: ["Sábado", "Domingo"] }, criadoEm: T(3) });
// Publicação antiga da Ana com o nome de antes: ao entrar, passa a mostrar o nome de agora.
await db.doc("diario/rp_antiga").set({ ...base(U.ana, "Nome Antigo"), texto: "Publicação de antes de mudar o nome", criadoEm: T(400) });
await db.doc(`relacoes/${U.bruno}_${U.ana}`).set({ tipo: "seguir", seguidorId: U.bruno, alvoId: U.ana, criadoEm: T(100) });
for (const d of (await db.collection("republicacoes").get()).docs) await d.ref.delete();

const { browser, ctx } = await navegador({ mobile: true });
const erros = [];
const p = await entrar(ctx, "ana", "feed.html");
p.on("pageerror", (e) => erros.push(String(e)));
await p.waitForSelector(".post-card", { timeout: 25000 }); await p.waitForTimeout(2500);
ok(await p.locator("#abasFeed").count() === 0, "sem as abas Diário | Registros: um Diário só");
const txt = await p.$$eval(".post-card", (cs) => cs.map((c) => c.textContent).join("|"));
ok(txt.includes("Obra entregue hoje") && txt.includes("Dica rápida") && txt.includes("Melhor dia?"), "Diário mostra foto, texto e enquete juntos");
await p.locator('#tiposFeed [data-tipo="textos"]').click(); await p.waitForTimeout(400);
const so = await p.$$eval(".post-card", (cs) => cs.map((c) => c.textContent).join("|"));
ok(so.includes("Dica rápida") && !so.includes("Obra entregue") && !so.includes("Melhor dia?"), "filtro Textos: só os textos");
await p.locator('#tiposFeed [data-tipo="tudo"]').click(); await p.waitForTimeout(400);
const card = p.locator(".post-card", { hasText: "Obra entregue hoje" }).first();
const acoes = await card.locator(".acoes-post .acao").evaluateAll((bs) => bs.map((b) => b.className.replace("acao ", "").trim()));
ok(acoes.join(",") === "comentar,salvar,republicar,compartilhar,enviar", "ações: " + acoes.join(" · ") + " (Republicar no meio, Enviar por último)");
for (const w of [360, 390]) {
  await p.setViewportSize({ width: w, height: 800 }); await p.waitForTimeout(300);
  const cortes = await card.locator(".acoes-post .rot").evaluateAll((rs) => rs.filter((x) => x.scrollWidth > x.clientWidth + 1).map((x) => x.textContent));
  ok(!cortes.length, `${w} px: os 5 nomes cabem inteiros ${cortes.join(", ")}`);
}
await card.locator(".acao.republicar").click(); await p.waitForTimeout(1500);
const doc = await db.doc(`republicacoes/rp_foto_${U.ana}`).get();
ok(doc.exists && doc.data().postAutorId === U.dani, "republicar grava republicacoes/{post}_{uid}");
ok((await card.locator(".acao.republicar .rot").textContent()) === "Republicado", "o botão vira Republicado");
await p.waitForTimeout(2500);
const antiga = (await db.doc("diario/rp_antiga").get()).data();
ok(antiga.nome !== "Nome Antigo", "publicação antiga recebe o nome atual: " + antiga.nome);
await p.screenshot({ path: "saida/republicar.png" });

const b = await entrar((await navegador({ mobile: true })).ctx, "bruno", "feed.html");
await b.waitForSelector(".post-card", { timeout: 25000 }); await b.waitForTimeout(2500);
const rep = b.locator(".post-card", { hasText: "Obra entregue hoje" }).first();
ok(await rep.locator(".post-repost").count() === 1 && /republicou/.test(await rep.locator(".post-repost").textContent()), "quem segue a Ana vê \"Ana republicou\": " + (await rep.locator(".post-repost").textContent().catch(() => "")));
await b.screenshot({ path: "saida/republicado-feed.png" });

const d = await entrar((await navegador({ mobile: true })).ctx, "dani", "notificacoes.html");
await d.waitForTimeout(5000);
ok((await d.textContent("body")).includes("republicou sua publicação"), "o autor recebe o aviso \"republicou sua publicação\"");
await card.locator(".acao.republicar").click(); await p.waitForTimeout(1200);
ok(!(await db.doc(`republicacoes/rp_foto_${U.ana}`).get()).exists, "tocar de novo desfaz a republicação");
ok(!erros.length, "sem erro na página " + erros.join(" | "));
await browser.close();
for (const id of ["rp_foto", "rp_texto", "rp_enq", "rp_antiga"]) await db.doc(`diario/${id}`).delete();
await db.doc(`relacoes/${U.bruno}_${U.ana}`).delete();
process.exit();
