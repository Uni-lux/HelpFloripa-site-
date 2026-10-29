// "Adicionar local" nas publicações (busca no OpenStreetMap simulada, chip, nome do lugar no cartão, feed do lugar)
// e "Adicionar ao seu flash" (publicação vira um flash com o crédito e o link; autor pode desligar).
// Uso: node t-local-flash.mjs  (precisa das regras do repositório: diario.local, stories.postDe, pref_publicas.permiteFlash)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, BASE, garantirImagem } from "./nav.mjs";
import { readFileSync } from "node:fs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const PX = "data:image/png;base64," + readFileSync(garantirImagem("saida/foto-lf.png", 800, 1000)).toString("base64");
await db.doc(`pref_publicas/${U.bruno}`).delete().catch(() => {});
await db.doc("diario/lfBruno").set({ autorId: U.bruno, nome: "Bruno Reparos", texto: "Reforma concluída no Campeche", mediaUrl: PX, local: { nome: "Campeche, Florianópolis", lat: -27.68, lng: -48.48 }, criadoEm: Timestamp.fromMillis(Date.now() - 5 * 60000) });
for (const s of (await db.collection("stories").where("autorId", "==", U.ana).get()).docs) await s.ref.delete();

const { browser, ctx } = await navegador({ mobile: true });
await ctx.route(/nominatim\.openstreetmap\.org\/search/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify([
  { name: "Lagoa da Conceição", lat: "-27.6036", lon: "-48.4668", address: { suburb: "Lagoa da Conceição", city: "Florianópolis", state: "Santa Catarina", country: "Brasil" } }
]) }));

// ---------- 1) publicar com local ----------
const pa = await entrar(ctx, "ana", "feed.html");
await pa.waitForSelector("#btnComporFeed", { timeout: 30000 }); await pa.waitForTimeout(1500);
await pa.locator("#btnComporFeed").tap();
await pa.locator("#pubTexto").fill("Fim de tarde lindo por aqui");
await pa.locator("#pubLocal").tap();
await pa.locator(".busca-enviar[aria-label='Buscar local']").fill("lagoa da");
await pa.waitForSelector(".lista-locais .linha-local >> text=Lagoa da Conceição", { timeout: 8000 });
await pa.screenshot({ path: "saida/lf-buscar-local.png" });
await pa.locator(".linha-local", { hasText: "Lagoa da Conceição" }).first().tap(); await pa.waitForTimeout(400);
ok((await pa.locator("#pubLocalBox .chip-extra.local").textContent()).includes("Lagoa da Conceição"), "chip do local no compositor");
await pa.screenshot({ path: "saida/lf-compositor.png" });
await pa.locator("#pubEnviar").click(); await pa.waitForTimeout(3500);
const pub = (await db.collection("diario").where("autorId", "==", U.ana).get()).docs.map((d) => ({ id: d.id, ...d.data() })).find((p) => p.texto === "Fim de tarde lindo por aqui");
ok(pub?.local?.nome === "Lagoa da Conceição, Florianópolis" && pub.local.lat === -27.604 && pub.local.lng === -48.467, "publicação gravada com o local: " + JSON.stringify(pub?.local));

// ---------- 2) local no cartão e feed do lugar ----------
await pa.goto(BASE + "feed.html"); await pa.waitForTimeout(4000);
const lp = pa.locator(".post-cab .local-post", { hasText: "Campeche" }).first();
ok(await lp.count() === 1, "nome do lugar no cartão da publicação");
await lp.scrollIntoViewIfNeeded(); await pa.screenshot({ path: "saida/lf-cartao.png" });
await lp.click(); await pa.waitForTimeout(3000);
ok(/local=/.test(pa.url()) && (await pa.locator("body").textContent()).includes("Reforma concluída no Campeche"), "tocar no lugar abre as publicações de lá: " + pa.url().split("?")[1]);
await pa.screenshot({ path: "saida/lf-feed-lugar.png" });

// ---------- 3) publicação no flash ----------
await pa.goto(BASE + "feed.html"); await pa.waitForTimeout(4000);
const card = pa.locator("article", { hasText: "Reforma concluída no Campeche" }).first();
await card.scrollIntoViewIfNeeded();
await card.locator(".acoes-post button", { hasText: "Compartilhar" }).click(); await pa.waitForTimeout(500);
ok(await pa.locator("#opcoesCorpo button", { hasText: "Adicionar ao seu flash" }).count() === 1, "Compartilhar tem 'Adicionar ao seu flash'");
await pa.screenshot({ path: "saida/lf-compartilhar.png" });
await pa.locator("#opcoesCorpo button", { hasText: "Adicionar ao seu flash" }).click();
await pa.waitForSelector(".flash-criar .flash-repost-selo", { timeout: 15000 });
await pa.waitForSelector(".flash-fotobox .flash-foto", { timeout: 15000 }); await pa.waitForTimeout(800);
ok((await pa.locator(".flash-repost-selo").textContent()).includes("Publicação de Bruno"), "criador do flash abre com a publicação e o selo 'Publicação de Bruno'");
await pa.screenshot({ path: "saida/lf-criador.png" });
await pa.locator(".flash-publicar").tap(); await pa.waitForTimeout(4000);
const st = (await db.collection("stories").where("autorId", "==", U.ana).get()).docs.map((d) => ({ id: d.id, ...d.data() }))[0];
ok(st?.postDe?.postId === "lfBruno" && st.postDe.autorId === U.bruno, "flash gravado com postDe (crédito): " + JSON.stringify(st?.postDe));
await pa.goto(BASE + `feed.html?flash=${st?.id}`); await pa.waitForTimeout(4000);
const link = pa.locator(".story-visor .story-post");
ok(await link.count() === 1 && (await link.textContent()).trim() === "Ver publicação" && (await link.getAttribute("aria-label")).includes("Bruno"), "visor mostra 'Ver publicação' (como no Instagram): " + (await link.textContent().catch(() => "")));
await pa.screenshot({ path: "saida/lf-visor.png" });

// ---------- 4) autor desliga: não dá para compartilhar ----------
await db.doc(`pref_publicas/${U.bruno}`).set({ permiteFlash: false, atualizadoEm: Timestamp.now() });
await pa.goto(BASE + "feed.html"); await pa.waitForTimeout(4000);
const card2 = pa.locator("article", { hasText: "Reforma concluída no Campeche" }).first();
await card2.scrollIntoViewIfNeeded();
await card2.locator(".acoes-post button", { hasText: "Compartilhar" }).click(); await pa.waitForTimeout(500);
await pa.locator("#opcoesCorpo button", { hasText: "Adicionar ao seu flash" }).click(); await pa.waitForTimeout(1500);
ok(await pa.locator(".flash-criar").count() === 0 && /não permite|desligou|não deixa/i.test(await pa.locator(".toast").allTextContents().then((l) => l.join(" "))), "autor que desligou: não abre o criador e avisa: " + (await pa.locator(".toast").allTextContents()).join(" "));
await db.doc(`pref_publicas/${U.bruno}`).delete();
await browser.close();
process.exit(process.exitCode || 0);
