// Presentes (mimo, dinheiro por Pix, produto de uma loja, corrida de presente) e localização em tempo real no chat,
// mais os atalhos de corridas/entregas no Automotivo e no Início.
// Uso: node seed.mjs && node t-presentes-vivo.mjs   (precisa das regras do main)
import { navegador, entrar, BASE, USUARIOS as U } from "./nav.mjs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
const db = getFirestore(initializeApp({ projectId: "demo-hf" }));
let falhas = 0;
const ok = (c, m) => { if (!c) falhas++; console.log(c ? "  ✔" : "  ✘", m); };
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
async function simular(ctx) {
  await ctx.route(/tile\.openstreetmap\.org/, (r) => r.fulfill({ body: PNG, contentType: "image/png" }));
  await ctx.route(/nominatim\.openstreetmap\.org\/reverse/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ address: { road: "Rua Bocaiúva", house_number: "50", suburb: "Centro", city: "Florianópolis" } }) }));
  await ctx.route(/nominatim\.openstreetmap\.org\/search/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify([{ lat: "-27.6010", lon: "-48.5200", name: "Praça XV", address: { road: "Praça XV de Novembro", suburb: "Centro", city: "Florianópolis" } }]) }));
  await ctx.route(/router\.project-osrm\.org/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ routes: [{ distance: 3000, duration: 600, geometry: { coordinates: [[-48.548, -27.595], [-48.52, -27.601]] } }] }) }));
}
// Bruno segue a Ana (padrão "quem eu sigo" deixa a Ana mandar presentes para ele); loja de lanches da Fabi.
await db.doc(`relacoes/${U.bruno}_${U.ana}`).set({ tipo: "seguir", seguidorId: U.bruno, alvoId: U.ana, criadoEm: Timestamp.now() });
await db.doc(`negocios/${U.fabi}_delivery`).set({ donoId: U.fabi, tipo: "delivery", nome: "Lanches da Fabi", cidade: "Florianópolis", uf: "SC", itens: [{ nome: "X-salada", preco: 22 }, { nome: "Suco natural", preco: 9 }], atualizadoEm: Timestamp.now(), criadoEm: Timestamp.now() });
await db.doc(`pref_publicas/${U.bruno}`).delete().catch(() => {});
for (const c of ["presentes", "locais_vivos"]) for (const d of (await db.collection(c).get()).docs) await d.ref.delete();

const A = await navegador({ mobile: true }); await simular(A.ctx);
await A.ctx.grantPermissions(["geolocation"]); await A.ctx.setGeolocation({ latitude: -27.595, longitude: -48.548 });
const B = await navegador({ mobile: true }); await simular(B.ctx);
await B.ctx.grantPermissions(["geolocation"]); await B.ctx.setGeolocation({ latitude: -27.6, longitude: -48.55 });
const pa = await entrar(A.ctx, "ana", "index.html");
await pa.waitForSelector(".mob-faixa", { timeout: 15000 });
ok(/Pedir corrida/.test(await pa.textContent(".mob-faixa")) && /Enviar presente/.test(await pa.textContent(".mob-faixa")), "Início: atalhos Pedir corrida, Enviar entrega e Enviar presente");
await pa.goto(BASE + "automotivo.html"); await pa.waitForSelector(".mob", { timeout: 15000 });
ok(await pa.locator(".mob-op").count() === 3, "Automotivo: bloco Corridas e entregas com 3 atalhos");

// ---------- mimo ----------
await pa.goto(BASE + `presentes.html?para=${U.bruno}`);
await pa.waitForSelector('[data-tipo="mimo"]', { timeout: 15000 });
await pa.waitForFunction(() => /Bruno/.test(document.querySelector(".ent-folha")?.textContent || ""), null, { timeout: 8000 });
await pa.click('[data-tipo="mimo"]'); await pa.click('[data-mimo="rosa"]');
await pa.fill("#prMensagem", "Pelo seu aniversário!");
await pa.click("#prMandar"); await pa.waitForTimeout(2500);
let ps = (await db.collection("presentes").where("de", "==", U.ana).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const mimo = ps.find((p) => p.tipo === "mimo");
ok(mimo?.status === "pendente" && mimo.mimo === "rosa" && mimo.para === U.bruno, "mimo enviado (pendente)");
ok(/Uma rosa/.test(await pa.textContent("#prCorpo")), "aparece em Enviados");

// ---------- Bruno aceita pelo chat ----------
const pb = await entrar(B.ctx, "bruno", `mensagens.html?conversa=${U.conv}`);
await pb.waitForSelector(".pr-c-sim", { timeout: 20000 });
ok(/Uma rosa/.test(await pb.textContent(".presente-msg")), "cartão do presente no chat do Bruno");
await pb.screenshot({ path: "saida/presente-chat.png" });
await pb.click(".pr-c-sim"); await pb.waitForTimeout(1500);
ok((await db.doc(`presentes/${mimo.id}`).get()).data().status === "aceito", "Bruno aceitou pelo chat");

// ---------- dinheiro (Pix) ----------
await pa.click("#prEnviar"); await pa.waitForSelector("#prBusca");
const nick = (await db.doc(`perfis_publicos/${U.bruno}`).get()).data()?.nickname;
await pa.fill("#prBusca", "@" + nick); await pa.click(`[data-achado="${U.bruno}"]`, { timeout: 8000 });
await pa.click('[data-tipo="pix"]'); await pa.click(".ent-chip >> text=R$ 20,00");
await pa.click("#prMandar"); await pa.waitForTimeout(2500);
const pix = (await db.collection("presentes").where("tipo", "==", "pix").get()).docs[0];
ok(pix?.data().valor === 20, "dinheiro de R$ 20 enviado");
await pb.goto(BASE + `presentes.html?id=${pix.id}`);
await pb.waitForSelector(".ent-folha .ent-btn.ok", { timeout: 15000 });
await pb.click(".ent-folha .ent-btn.ok"); await pb.waitForTimeout(1200);
await pb.click("text=Mandar minha chave Pix");
await pb.fill("#prChave", "bruno@teste.com"); await pb.fill("#prNomePix", "Bruno Reparos"); await pb.fill("#prCidPix", "Florianópolis");
await pb.click("text=Mandar no chat"); await pb.waitForTimeout(2000);
const msgs = (await db.collection(`conversas/${U.conv}/mensagens`).get()).docs.map((d) => d.data());
ok(msgs.some((m) => m.cartao?.tipo === "pix" && m.cartao.valor === 20 && m.remetenteId === U.bruno), "Bruno mandou o cartão de Pix com o valor do presente");

// ---------- produto de uma loja ----------
await pa.goto(BASE + `presentes.html?para=${U.bruno}&negocio=${U.fabi}_delivery`);
await pa.waitForSelector('[data-item="0"]', { timeout: 15000 });
await pa.click('[data-item="0"]'); await pa.click('[data-item="1"]');
ok(/R\$\s?31,00/.test(await pa.textContent(".pr-total")), "total dos itens: " + await pa.textContent(".pr-total"));
await pa.click("#prMandar"); await pa.waitForTimeout(2500);
const prod = (await db.collection("presentes").where("tipo", "==", "produto").get()).docs[0];
ok(prod?.data().donoId === U.fabi && prod.data().itens.length === 2, "presente de produto da loja da Fabi");
await pb.goto(BASE + `presentes.html?id=${prod.id}`);
await pb.waitForSelector(".ent-folha .ent-btn.ok", { timeout: 15000 }); await pb.click(".ent-folha .ent-btn.ok"); await pb.waitForTimeout(1200);
await pb.click("text=Escolher onde receber");
await pb.fill("#prRua", "Rua das Flores, 120"); await pb.fill("#prBairro", "Trindade");
await pb.click("#prPedirLoja"); await pb.waitForTimeout(2500);
ok((await db.doc(`presentes/${prod.id}`).get()).data().status === "usado", "pedido enviado à loja (presente usado)");
const conv2 = [U.bruno, U.fabi].sort().join("_");
const pedidoLoja = (await db.collection(`conversas/${conv2}/mensagens`).get()).docs.map((d) => d.data()).find((m) => m.cartao?.pedido);
ok(pedidoLoja?.cartao.presente?.deId === U.ana && /Rua das Flores/.test(pedidoLoja.cartao.pedido.endereco), "a loja recebe o pedido com o endereço; quem deu não vê o endereço");
const anaVe = (await db.doc(`presentes/${prod.id}`).get()).data();
ok(!JSON.stringify(anaVe).includes("Rua das Flores"), "o endereço não fica no presente");

// ---------- corrida de presente ----------
await pa.goto(BASE + `presentes.html?para=${U.bruno}`);
await pa.waitForSelector('[data-tipo="corrida"]', { timeout: 15000 });
await pa.waitForFunction(() => /Bruno/.test(document.querySelector(".ent-folha")?.textContent || ""), null, { timeout: 8000 });
await pa.click('[data-tipo="corrida"]'); await pa.click(".ent-chip >> text=R$ 30,00");
await pa.click("#prMandar"); await pa.waitForTimeout(2500);
const cor = (await db.collection("presentes").where("tipo", "==", "corrida").get()).docs[0];
await pb.goto(BASE + `presentes.html?id=${cor.id}`);
await pb.waitForSelector(".ent-folha .ent-btn.ok", { timeout: 15000 }); await pb.click(".ent-folha .ent-btn.ok"); await pb.waitForTimeout(1200);
await pb.click("text=Pedir a corrida agora");
await pb.waitForSelector("[data-presente]", { timeout: 15000 });
ok(/Presente de Ana/.test(await pb.textContent("[data-presente]")), "Entregas: aviso do presente");
await pb.click('[data-end="destino"]'); await pb.fill(".ent-folha input", "Praça XV");
await pb.waitForSelector("[data-res]", { timeout: 8000 }); await pb.click("[data-res]");
await pb.waitForSelector("#btPedir:not([disabled])", { timeout: 12000 });
const valorTela = await pb.inputValue("#entValor");
ok(Number(valorTela.replace(/[^\d,]/g, "").replace(",", ".")) <= 30, "oferta limitada ao valor do presente: " + valorTela);
await pb.screenshot({ path: "saida/presente-corrida.png" });
await pb.click("#btPedir"); await pb.waitForSelector(".ent-busca", { timeout: 15000 });
const pc = (await db.doc(`presentes/${cor.id}`).get()).data();
const corrida = pc.corridaId ? (await db.doc(`corridas/${pc.corridaId}`).get()).data() : null;
ok(pc.status === "usado" && corrida?.pagadorId === U.ana && corrida.pagamento === "presente", "corrida criada com quem paga = Ana, presente usado");
await pa.goto(BASE + `entregas.html?id=${pc.corridaId}`);
await pa.waitForSelector(".ent-busca, .ent-resumo", { timeout: 15000 });
ok(/Presente \(paga quem deu\)/.test(await pa.textContent("#painel")), "Ana acompanha a corrida que deu");
await pb.click("text=Cancelar pedido"); await pb.click(".ent-folha .ent-chip >> nth=2"); await pb.click(".ent-folha .ent-btn.perigo"); await pb.waitForTimeout(1000);

// ---------- quem pode mandar ----------
await pb.goto(BASE + "presentes.html"); await pb.waitForFunction(() => document.querySelector("#prQuemTx")?.textContent !== "...", null, { timeout: 15000 });
await pb.click("#prQuem"); await pb.click('[data-quem="ninguem"]'); await pb.waitForTimeout(1200);
ok((await db.doc(`pref_publicas/${U.bruno}`).get()).data()?.presentes === "ninguem", "Bruno escolheu não receber presentes");
await pa.goto(BASE + `presentes.html?para=${U.bruno}`);
await pa.waitForFunction(() => /não recebe presentes/.test(document.querySelector(".ent-folha")?.textContent || ""), null, { timeout: 10000 }).catch(() => {});
ok(/não recebe presentes/.test(await pa.textContent(".ent-folha")), "Ana vê que ele não recebe presentes");
await db.doc(`pref_publicas/${U.bruno}`).delete();

// ---------- localização em tempo real ----------
await pa.goto(BASE + `mensagens.html?conversa=${U.conv}`); await pa.waitForTimeout(3000);
await pa.click("#btnAnexar"); await pa.click(".ax-op >> text=Localização");
await pa.waitForSelector(".lv-tela", { timeout: 8000 });
await pa.waitForFunction(() => /Precisão de|Pelo GPS/.test(document.querySelector(".lv-op.atual")?.textContent || ""), null, { timeout: 10000 });
ok(await pa.locator(".lv-tela .leaflet-container").count() === 1, "tela Enviar localização com mapa e a precisão");
await pa.screenshot({ path: "saida/local-tela.png" });
await pa.click(".lv-op.vivo"); await pa.click('[data-min="60"]'); await pa.click("#lvComecar");
await pa.waitForTimeout(2500);
console.log("  aviso:", await pa.locator(".toast").textContent().catch(() => "(nenhum)"));
const lv = (await db.collection("locais_vivos").get()).docs[0];
ok(lv && lv.data().uid === U.ana && Math.abs(lv.data().lat - -27.595) < 0.001, "compartilhamento ao vivo criado");
await pb.goto(BASE + `mensagens.html?conversa=${U.conv}`);
await pb.waitForSelector(".vivo-msg", { timeout: 20000 });
await pb.waitForFunction(() => /Ao vivo/.test(document.querySelector(".vivo-msg")?.textContent || ""), null, { timeout: 10000 });
ok(true, "Bruno vê o cartão Ao vivo");
await A.ctx.setGeolocation({ latitude: -27.59, longitude: -48.54 });
await pa.waitForTimeout(12000);
const lv2 = (await db.doc(`locais_vivos/${lv.id}`).get()).data();
ok(Math.abs(lv2.lat - -27.59) < 0.0005, "a posição da Ana atualizou no compartilhamento: " + lv2.lat);
await pb.click(".vivo-msg .lc-acoes button"); await pb.waitForSelector(".lv-ao-vivo .leaflet-container", { timeout: 8000 });
ok(/Ao vivo/.test(await pb.textContent(".lv-vivo-tit")), "Ver ao vivo: mapa com a pessoa");
await pb.screenshot({ path: "saida/local-ao-vivo.png" });
await pb.click(".lv-ao-vivo [data-fechar]");
await pa.click(".vivo-msg .lv-parar"); await pa.waitForTimeout(2000);
ok((await db.doc(`locais_vivos/${lv.id}`).get()).data().parado === true, "Ana parou de compartilhar");
await pb.waitForFunction(() => /encerrad/i.test(document.querySelector(".vivo-msg")?.textContent || ""), null, { timeout: 8000 }).catch(() => {});
ok(/encerrad/i.test(await pb.textContent(".vivo-msg")), "Bruno vê o compartilhamento encerrado");

await A.browser.close(); await B.browser.close();
console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo");
process.exit(falhas ? 1 : 0);
