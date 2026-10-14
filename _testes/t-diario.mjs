// Diário: várias fotos (publicar e ver), toque duplo = 5 estrelas, quem deu estrelas, salvar e Salvos,
// editar legenda. Ana publica; Bruno vê, dá estrelas com toque duplo e salva.
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => console.log(c ? "  ✔" : "  ✘", t);
function png(w, hgt, cor) {
  const crc = (b) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const ch = (tipo, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(tipo), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(hgt, 4); ih[8] = 8; ih[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * hgt); for (let y = 0; y < hgt; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = cor[0]; raw[o + 1] = cor[1]; raw[o + 2] = (x * 7 + y * 3) % 255; } }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ch("IHDR", ih), ch("IDAT", deflateSync(raw)), ch("IEND", Buffer.alloc(0))]);
}
const arqs = [[200, 60, 60], [60, 160, 60], [60, 60, 200]].map((c, i) => { const f = new URL(`saida/foto${i}.png`, import.meta.url).pathname; writeFileSync(f, png(800, 1000, c)); return f; });
initializeApp({ projectId: "demo-hf" });
const db = getFirestore();
const A = await navegador({ mobile: true }), B = await navegador({ mobile: true });
const pa = await entrar(A.ctx, "ana", "feed.html");
await pa.waitForSelector("#btnComporFeed", { timeout: 30000 }); await pa.waitForTimeout(1500);
// 1) Publicar com 3 fotos
await pa.locator("#btnComporFeed").tap();
await pa.locator("#pubTexto").fill("Obra pronta: antes e depois");
for (const f of arqs) {
  await pa.setInputFiles("#pubArquivoFoto", f);
  await pa.locator(".hfe-btn.pri").click({ timeout: 15000 });
  await pa.waitForTimeout(500);
}
ok(await pa.locator("#pubPrevia .pub-foto").count() === 3 && await pa.locator(".pub-foto-mais").count() === 1, "compor: 3 miniaturas e o quadrado de adicionar (3/4)");
await pa.screenshot({ path: "saida/diario-compor.png" });
await pa.locator("#pubEnviar").click();
await pa.waitForFunction(() => !document.getElementById("folhaPublicar")?.classList.contains("aberta"), null, { timeout: 30000 }).catch(() => {});
const snap = await db.collection("diario").where("autorId", "==", U.ana).get();
console.log("posts da Ana logo depois de publicar:", snap.size);
const pub = snap.docs.map((d) => ({ id: d.id, ...d.data() })).find((p) => p.texto === "Obra pronta: antes e depois");
if (process.argv[2] === "ar") {
  // Regras do ar (sem "midias"): publica com a primeira foto e avisa.
  await pa.waitForTimeout(500);
  ok(pub && !pub.midias && pub.mediaUrl, "regras do ar: publicou com a primeira foto → aviso: " + (await pa.locator("#toast, .toast").allTextContents().catch(() => [])).join(" "));
  await A.browser.close(); await B.browser.close(); process.exit(0);
}
ok(pub && Array.isArray(pub.midias) && pub.midias.length === 3 && pub.midias[0] === pub.mediaUrl, "publicou com 3 fotos (midias) · tamanho do documento: " + (pub ? Math.round(JSON.stringify(pub).length / 1024) + " KB" : "-"));
// 2) Bruno vê o carrossel, desliza, dá 5 estrelas com toque duplo e salva
const pb = await entrar(B.ctx, "bruno", "feed.html");
await pb.waitForSelector(".filtro-feed", { timeout: 30000 });
await pb.locator('#filtroFeed [data-filtro="todos"]').tap();
const card = pb.locator(".post-card", { hasText: "Obra pronta" }).first();
await card.waitFor({ timeout: 20000 }); await card.scrollIntoViewIfNeeded(); await pb.waitForTimeout(1200);
ok(await card.locator(".carrossel.varias img").count() === 3 && (await card.locator(".car-cont").textContent()) === "1/3", "feed: carrossel com 3 fotos e \"1/3\"");
await card.locator(".car-trilho").evaluate((t) => t.scrollTo({ left: t.clientWidth, behavior: "instant" }));
await pb.waitForTimeout(400);
ok((await card.locator(".car-cont").textContent()) === "2/3", "feed: deslizar mostra \"2/3\"");
await pb.screenshot({ path: "saida/diario-carrossel.png" });
const box = await card.locator(".car-trilho").boundingBox();
await pb.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); await pb.waitForTimeout(120);
await pb.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
await pb.waitForTimeout(150);
ok(await card.locator(".estrela-pulo").count() === 1, "toque duplo: estrela grande na foto");
await pb.waitForTimeout(1800);
const tDbl = await card.locator(".estrelas-txt").textContent();
ok(tDbl.includes("5,0") && tDbl.includes("1 nota") && await card.locator(".estrelas-linha .estrela.on.minha").count() === 5, "toque duplo: deu 5 estrelas → " + tDbl);
await card.locator(".post-cab .icone-btn").tap();
await pb.locator("#opcoesCorpo button", { hasText: "Salvar publicação" }).tap();
await pb.waitForTimeout(800);
await pb.locator('#filtroFeed [data-filtro="salvos"]').tap();
await pb.waitForTimeout(2000);
ok(await pb.locator("#listaFeed .post-card", { hasText: "Obra pronta" }).count() === 1 && await pb.locator("#listaFeed .post-card").count() === 1, "Salvos: mostra só a publicação salva");
await pb.reload(); await pb.waitForSelector("#listaFeed .post-card, #listaFeed .feed-vazio", { timeout: 30000 });
await pb.locator('#filtroFeed [data-filtro="salvos"]').tap(); await pb.waitForTimeout(2000);
ok(await pb.locator("#listaFeed .post-card", { hasText: "Obra pronta" }).count() === 1 && (await pb.locator("#filtroFeed [aria-pressed=true]").textContent()).includes("Salvos"), "Salvos: continua depois de recarregar");
await pb.locator("#listaFeed .post-card .post-cab .icone-btn").first().dispatchEvent("click");
await pb.waitForTimeout(600); console.log("menu:", await pb.locator("#opcoesCorpo button").allTextContents());
await pb.locator("#opcoesCorpo button", { hasText: "Remover dos salvos" }).tap({ timeout: 5000 }); await pb.waitForTimeout(2500);
console.log("depois de remover:", await pb.locator("#toast, .toast").allTextContents().catch(() => []), "| cards:", await pb.locator("#listaFeed .post-card").count(), "| filtro:", await pb.locator("#filtroFeed [aria-pressed=true]").textContent());
ok(await pb.locator("#listaFeed .post-card").count() === 0, "Remover dos salvos: sai da lista");
console.log("posts da Ana antes do passo 3:", (await db.collection("diario").where("autorId", "==", U.ana).get()).size);
// 3) Ana: quem deu estrelas + editar legenda
await pa.reload(); await pa.waitForSelector(".filtro-feed", { timeout: 30000 }); await pa.waitForTimeout(1500);
const meu = pa.locator(".post-card", { hasText: "Obra pronta" }).first();
await meu.scrollIntoViewIfNeeded(); await pa.waitForTimeout(1500);
await meu.locator(".estrelas-txt").tap();
await pa.waitForSelector("#folhaEstrelas.aberta", { timeout: 8000 }).catch(() => {});
await pa.waitForTimeout(1500);
const quem = await pa.locator("#c_folhaEstrelas").textContent();
ok(quem.includes("Bruno") && quem.includes("5 estrelas") && await pa.locator(".est-barra").count() === 5 && await pa.locator(".est-chips button").count() === 6, "resumo do dono: barras, filtro por estrela e quem deu → " + quem.replace(/\s+/g, " ").slice(0, 80));
await pa.locator(".est-barra").nth(1).tap(); await pa.waitForTimeout(1000); // 4 estrelas: ninguém
ok((await pa.locator(".est-quem").textContent()).includes("Ninguém deu 4 estrelas"), "filtro 4★: ninguém");
await pa.locator(".est-chips button", { hasText: "Todas" }).tap(); await pa.waitForTimeout(800);
await pa.screenshot({ path: "saida/diario-quem.png" });
await pa.keyboard.press("Escape"); await pa.waitForTimeout(300);
// "Se curtir": Ana dá 3 estrelas na própria publicação (entra na média; não vira aviso para ela)
await meu.locator(".estrela").nth(2).tap(); await pa.waitForTimeout(1500);
const tProprio = await meu.locator(".estrelas-txt").textContent();
ok(tProprio.includes("4,0") && tProprio.includes("2 notas") && await meu.locator(".estrelas-linha .estrela.on.minha").count() === 3, "se curtir: dá estrelas na própria publicação → " + tProprio);
const rs = (await db.doc(`diario_notas/${pub.id}`).get()).data();
ok(rs.total === 2 && rs.soma === 8 && rs.n5 === 1 && rs.n3 === 1, "resumo: " + JSON.stringify(rs));
const mim = await db.doc(`curtidas/${pub.id}_${U.ana}`).get();
ok(mim.exists && mim.data().nota === 3, "se curtir: nota gravada");
await meu.locator(".post-cab .icone-btn").tap();
await pa.locator("#opcoesCorpo button", { hasText: "Editar publicação" }).tap();
await pa.locator("#edPostTexto").fill("Obra pronta: antes e depois (Trindade)");
await pa.locator("#edPostSalvar").tap(); await pa.waitForTimeout(1500);
ok(await pa.locator(".post-card", { hasText: "(Trindade)" }).count() === 1, "editar legenda: texto novo aparece");
// 4) Perfil: grade com marca de várias fotos e carrossel na publicação
await pa.goto(new URL("usuarios.html", pa.url()).href); await pa.waitForSelector("#gradePosts .tile", { timeout: 30000 }); await pa.waitForTimeout(1000);
ok(await pa.locator("#gradePosts .tile[data-fotos='3'] .marca-fotos").count() === 1, "perfil: miniatura com a marca de várias fotos");
await pa.locator("#gradePosts .tile[data-fotos='3']").tap(); await pa.waitForTimeout(1200);
ok(await pa.locator("#postMidia .carrossel.varias img").count() === 3, "perfil: publicação abre com as 3 fotos");
ok(await pa.locator("#postSalvar").isHidden(), "perfil: na própria publicação não aparece Salvar");
await pa.screenshot({ path: "saida/diario-perfil.png" });
await A.browser.close(); await B.browser.close();
