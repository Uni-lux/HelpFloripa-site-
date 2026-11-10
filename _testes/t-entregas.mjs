// Entregas e corridas de ponta a ponta: o Bruno se cadastra como entregador (moto) e fica online com o GPS; a Ana pede
// uma entrega (A → B no mapa, veículo com "1 perto", oferta), o Bruno vê o pedido com som e aceita, a Ana vê a placa,
// o PIN e o carrinho andando quando o GPS do Bruno muda; o Bruno chega, coleta e só finaliza com o PIN certo; a Ana
// avalia e salva nos favoritos. Também: Anexar do Mensagens (Entrega, Corrida, Chamar Bruno), chamar o entregador
// pelo @ e o convite para quem ainda não é entregador.
// Uso: node t-entregas.mjs   (precisa das regras do main e do seed.mjs antes)
import { navegador, entrar, BASE, USUARIOS as U } from "./nav.mjs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
const db = getFirestore(initializeApp({ projectId: "demo-hf" }));
let falhas = 0;
const ok = (c, m) => { if (!c) falhas++; console.log(c ? "  ✔" : "  ✘", m); };

// Dados limpos: Bruno verificado e sem cadastro de entregador; nada de pedidos antigos.
await db.doc(`usuarios/${U.bruno}`).set({ verificado: true }, { merge: true });
await db.doc(`usuarios/${U.ana}`).set({ entregadoresFavoritos: FieldValue.delete() }, { merge: true });
await db.doc(`entregadores/${U.bruno}`).delete().catch(() => {});
await db.doc(`entregadores_online/${U.bruno}`).delete().catch(() => {});
for (const d of (await db.collection("corridas").get()).docs) await db.recursiveDelete(d.ref);
await db.doc(`entregadores_notas/${U.bruno}`).delete().catch(() => {});

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
async function simularMapa(ctx) {
  await ctx.route(/tile\.openstreetmap\.org/, (r) => r.fulfill({ body: PNG, contentType: "image/png" }));
  await ctx.route(/nominatim\.openstreetmap\.org\/reverse/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ address: { road: "Rua Felipe Schmidt", house_number: "100", suburb: "Centro", city: "Florianópolis" } }) }));
  await ctx.route(/nominatim\.openstreetmap\.org\/search/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify([{ lat: "-27.6010", lon: "-48.5200", name: "Rua Lauro Linhares", address: { road: "Rua Lauro Linhares", house_number: "900", suburb: "Trindade", city: "Florianópolis", state: "Santa Catarina" } }]) }));
  await ctx.route(/router\.project-osrm\.org/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ routes: [{ distance: 4300, duration: 720, geometry: { coordinates: [[-48.548, -27.595], [-48.535, -27.598], [-48.52, -27.601]] } }] }) }));
}

// ---------- Bruno: cadastro e online ----------
const B = await navegador({ mobile: true });
await B.ctx.grantPermissions(["geolocation"]); await B.ctx.setGeolocation({ latitude: -27.592, longitude: -48.545 });
await simularMapa(B.ctx);
const pb = await entrar(B.ctx, "bruno", "entregador.html");
await pb.waitForSelector("#egSalvar", { timeout: 20000 });
ok(await pb.locator(".leaflet-container").count() === 1, "entregador: mapa (Leaflet) carregado");
await pb.click('[data-veiculo="moto"]');
await pb.click('[data-servico="corrida"]');
await pb.fill("#egModelo", "Honda CG 160"); await pb.fill("#egCor", "Vermelha");
await pb.fill("#egPlaca", "abc1x23");
await pb.click("#egSalvar"); await pb.waitForTimeout(400);
ok(await pb.locator(".toast").count() === 1 && /Placa|CNH|declara/.test(await pb.textContent(".toast")), "cadastro: avisa o que falta: " + await pb.locator(".toast").textContent().catch(() => ""));
await pb.fill("#egPlaca", "abc1d23");
await pb.selectOption("#egCnh", "A");
for (const k of ["maior", "documentos", "autonomo"]) await pb.check(`[data-decl="${k}"]`);
await pb.click("#egSalvar");
await pb.waitForSelector("#egOnline", { timeout: 15000 });
const cadBruno = (await db.doc(`entregadores/${U.bruno}`).get()).data();
ok(cadBruno?.placa === "ABC1D23" && cadBruno.servicos.includes("corrida") && cadBruno.status === "ativo", "cadastro gravado: " + JSON.stringify({ placa: cadBruno?.placa, servicos: cadBruno?.servicos }));
await pb.click("#egOnline"); await pb.waitForTimeout(2500);
ok(await pb.getAttribute("#egOnline", "aria-checked") === "true", "entregador online");
const on = (await db.doc(`entregadores_online/${U.bruno}`).get()).data();
ok(on && on.geo4 && on.veiculo === "moto" && Math.abs(on.lat - -27.592) < 0.002, "presença online gravada (posição arredondada): " + JSON.stringify({ lat: on?.lat, geo4: on?.geo4 }));
await pb.screenshot({ path: "saida/entregador-online.png" });

// ---------- Ana: pedir uma entrega ----------
const A = await navegador({ mobile: true });
await A.ctx.grantPermissions(["geolocation"]); await A.ctx.setGeolocation({ latitude: -27.595, longitude: -48.548 });
await simularMapa(A.ctx);
const pa = await entrar(A.ctx, "ana", "entregas.html");
await pa.waitForSelector('[data-end="destino"]', { timeout: 20000 });
await pa.waitForFunction(() => /Felipe Schmidt|Minha localização/.test(document.querySelector('[data-end="origem"]')?.textContent || ""), null, { timeout: 10000 }).catch(() => {});
ok(/Felipe Schmidt/.test(await pa.textContent('[data-end="origem"]')), "coleta = minha localização com o nome da rua: " + (await pa.textContent('[data-end="origem"]')).trim());
await pa.click('[data-end="destino"]');
await pa.fill(".ent-folha input", "Lauro Linhares 900");
await pa.waitForSelector("[data-res]", { timeout: 8000 });
await pa.click("[data-res]");
await pa.waitForSelector(".ent-op", { timeout: 10000 });
await pa.waitForTimeout(1500);
const opMoto = await pa.textContent('[data-mod="entrega_moto"]');
ok(/1 perto/.test(opMoto) && /R\$/.test(opMoto), "moto mostra quem está perto e o valor sugerido: " + opMoto.replace(/\s+/g, " "));
ok(await pa.locator(".mv-veic.livre").count() >= 1, "o Bruno aparece no mapa como moto livre");
ok(/4,3 km/.test(await pa.textContent("#painel")), "rota pela rua (OSRM simulado): 4,3 km");
ok(await pa.isDisabled("#btPedir"), "sem dizer o que vai, o botão espera");
await pa.fill("#entOque", "Documentos do cartório");
await pa.click('.ent-oferta button[aria-label="Aumentar R$ 1"]');
const botao = await pa.textContent("#btPedir");
ok(/Enviar entrega · R\$/.test(botao), "botão com a oferta: " + botao);
await pa.screenshot({ path: "saida/entregas-pedir.png", fullPage: false });
await pa.click("#btPedir");
await pa.waitForSelector(".ent-busca", { timeout: 15000 });
ok(/Procurando entregador/.test(await pa.textContent("#painel")), "procurando entregador (radar)");
const pedidoId = await pa.evaluate(() => new URLSearchParams(location.search).get("id"));
ok(!!pedidoId, "endereço com o id do pedido: " + pedidoId);

// ---------- Bruno: vê e aceita ----------
await pb.waitForSelector(`[data-pedido="${pedidoId}"]`, { timeout: 15000 });
ok(true, "o pedido apareceu na lista do Bruno");
ok(/Documentos do cartório/.test(await pb.textContent(`[data-pedido="${pedidoId}"]`)), "cartão do pedido com o que vai e o valor");
await pb.screenshot({ path: "saida/entregador-pedido.png" });
await pb.click(`[data-aceitar="${pedidoId}"]`);
await pb.waitForSelector("#egAvancar", { timeout: 15000 });
ok(/Cheguei na coleta/.test(await pb.textContent("#egAvancar")), "trabalho: Cheguei na coleta");
ok(/Rua Lauro Linhares|Documentos/.test(await pb.textContent("#painel")) && /Apto|recebe|Valor/.test(await pb.textContent("#painel")), "trabalho mostra o destino e os detalhes");

// ---------- Ana: acompanha ----------
await pa.waitForSelector(".ent-placa", { timeout: 15000 });
ok(/ABC-1D23/.test(await pa.textContent(".ent-placa")), "Ana vê a placa: " + await pa.textContent(".ent-placa"));
ok(/a caminho da coleta/.test(await pa.textContent("#painel")), "status: a caminho da coleta");
const pin = (await pa.textContent("#entPin")).trim();
ok(/^\d{4}$/.test(pin), "PIN da entrega na tela da Ana: " + pin);
await pa.waitForSelector(".mv-veic:not(.livre)", { timeout: 15000 });
const antes = await pa.evaluate(() => { const r = document.querySelector(".mv-veic:not(.livre)").getBoundingClientRect(); return [r.x, r.y]; });
await B.ctx.setGeolocation({ latitude: -27.5935, longitude: -48.5465 });
await pb.waitForTimeout(5500);
await B.ctx.setGeolocation({ latitude: -27.594, longitude: -48.547 });
await pa.waitForTimeout(4000);
const depois = await pa.evaluate(() => { const r = document.querySelector(".mv-veic:not(.livre)").getBoundingClientRect(); return [r.x, r.y]; });
ok(Math.abs(antes[0] - depois[0]) + Math.abs(antes[1] - depois[1]) > 2, `o marcador do Bruno andou no mapa da Ana (${antes.map(Math.round)} → ${depois.map(Math.round)})`);
ok(/\d+ min/.test(await pa.textContent("#entEta")), "previsão de chegada: " + await pa.textContent("#entEta"));
await pa.screenshot({ path: "saida/entregas-acompanhar.png" });

// ---------- etapas ----------
await pb.click("#egAvancar"); await pa.waitForFunction(() => /no local da coleta/.test(document.querySelector("#painel")?.textContent || ""), null, { timeout: 10000 });
ok(true, "Ana vê: entregador no local da coleta");
await pb.waitForFunction(() => /Peguei/.test(document.querySelector("#egAvancar")?.textContent || ""), null, { timeout: 10000 });
await pb.click("#egAvancar");
await pa.waitForFunction(() => /Encomenda a caminho/.test(document.querySelector("#painel")?.textContent || ""), null, { timeout: 10000 });
ok(true, "Ana vê: encomenda a caminho (o pacote vai junto com o GPS)");
ok(await pa.locator(".mv-veic em").count() === 1, "marcador com a encomenda junto");
await pb.waitForFunction(() => /Finalizar entrega/.test(document.querySelector("#egAvancar")?.textContent || ""), null, { timeout: 10000 });
await pb.click("#egAvancar");
await pb.fill("#egPin", pin === "0000" ? "1111" : "0000");
await pb.click(".ent-folha .ent-btn.ok"); await pb.waitForTimeout(1500);
ok(/PIN errado/.test(await pb.locator(".toast").textContent().catch(() => "")), "PIN errado não finaliza");
await pb.fill("#egPin", pin);
await pb.click(".ent-folha .ent-btn.ok");
await pb.waitForFunction(() => /Entrega concluída/.test(document.querySelector("#painel")?.textContent || ""), null, { timeout: 10000 });
ok(true, "Bruno: entrega concluída");
await pa.waitForSelector(".ent-estrelas", { timeout: 10000 });
ok(/Entregue/.test(await pa.textContent("#painel")), "Ana: entregue");
await pa.click('.ent-estrelas [data-nota="5"]');
await pa.click(".ent-chip >> text=Rápido");
await pa.click("text=Enviar avaliação"); await pa.waitForTimeout(2000);
const notas = (await db.doc(`entregadores_notas/${U.bruno}`).get()).data();
ok(notas?.n === 1 && notas.soma === 5, "avaliação com o resumo de notas: " + JSON.stringify(notas));
await pa.click("text=/Salvar .* nos favoritos/"); await pa.waitForTimeout(1500);
ok(((await db.doc(`usuarios/${U.ana}`).get()).data().entregadoresFavoritos || []).includes(U.bruno), "Bruno nos favoritos da Ana");
await pa.screenshot({ path: "saida/entregas-fim.png" });

// ---------- chamar pelo @ e convidar ----------
await pa.goto(BASE + "entregas.html?modo=corrida"); await pa.waitForSelector("#btQuem", { timeout: 15000 });
await pa.click("#btQuem");
await pa.waitForSelector(".ent-folha input");
const nickBruno = (await db.doc(`perfis_publicos/${U.bruno}`).get()).data()?.nickname;
const nickFabi = (await db.doc(`perfis_publicos/${U.fabi}`).get()).data()?.nickname;
if (nickFabi) {
  await pa.fill(".ent-folha input", "@" + nickFabi); await pa.waitForTimeout(1500);
  ok(/ainda não é entregador/.test(await pa.textContent(".ent-folha")), "quem não é entregador: convite para se cadastrar");
}
await pa.waitForTimeout(1500);
ok(/Seus entregadores/.test(await pa.textContent(".ent-folha")), "favoritos/quem já levou aparecem na escolha");
if (nickBruno) {
  await pa.fill(".ent-folha input", "@" + nickBruno);
  await pa.waitForSelector("[data-achado]", { timeout: 8000 }); await pa.click("[data-achado]");
} else await pa.click(".ent-folha .ent-res >> nth=1");
await pa.waitForTimeout(800);
ok(/só Bruno|só .* recebe o pedido/i.test(await pa.textContent("#btQuem")), "corrida chamando o Bruno direto: " + (await pa.textContent("#btQuem")).replace(/\s+/g, " "));
await pa.screenshot({ path: "saida/entregas-chamar.png" });

// ---------- chamado direto com o Bruno offline ----------
await pb.click("text=Voltar aos pedidos"); await pb.waitForSelector("#egOnline");
await pb.click("#egOnline"); await pb.waitForTimeout(1200);
ok(await pb.getAttribute("#egOnline", "aria-checked") === "false", "Bruno fica offline");
ok(!(await db.doc(`entregadores_online/${U.bruno}`).get()).exists, "offline: some da lista de quem está perto");
await pa.fill(".ent-folha input", "").catch(() => {});
await pa.click('[data-end="destino"]'); await pa.fill(".ent-folha input", "Lauro Linhares 900");
await pa.waitForSelector("[data-res]", { timeout: 8000 }); await pa.click("[data-res]");
await pa.waitForSelector("#btPedir:not([disabled])", { timeout: 10000 });
await pa.click("#btPedir");
await pa.waitForSelector(".ent-busca", { timeout: 15000 });
ok(/Chamando seu entregador/.test(await pa.textContent("#painel")), "corrida direta: chamando seu entregador");
await pb.waitForSelector(".ent-item.direto", { timeout: 15000 });
ok(/chamou você/.test(await pb.textContent(".ent-item.direto")), "Bruno offline recebe o chamado direto: " + (await pb.textContent(".ent-item.direto .ent-etq")));
await pa.click("text=Cancelar pedido"); await pa.click(".ent-folha .ent-chip >> nth=1"); await pa.click(".ent-folha .ent-btn.perigo"); await pa.waitForTimeout(1500);
ok(/cancelado/i.test(await pa.textContent("#painel")), "Ana cancela a corrida");
await pb.waitForTimeout(1500);
ok(await pb.locator(".ent-item.direto").count() === 0, "o chamado sai da lista do Bruno");

// ---------- Mensagens: Anexar ----------
await pa.goto(BASE + `mensagens.html?conversa=${U.conv}`); await pa.waitForTimeout(3500);
await pa.click("#btnAnexar").catch(() => pa.click('[aria-label="Anexar"]'));
await pa.waitForTimeout(1500);
const anexar = await pa.textContent(".ax-grade");
ok(/Entrega/.test(anexar) && /Corrida/.test(anexar), "Anexar tem Entrega e Corrida");
ok(/Chamar Bruno/.test(await pa.textContent("body")), "Anexar: Chamar Bruno (ele é entregador)");
await pa.screenshot({ path: "saida/entregas-anexar.png" });

// ---------- computador ----------
const C = await navegador();
await C.ctx.addInitScript(() => { try { localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" })); } catch {} });
await simularMapa(C.ctx);
const pc = await entrar(C.ctx, "ana", "entregas.html?id=" + pedidoId);
await pc.waitForSelector(".ent-fim", { timeout: 15000 });
const larg = await pc.evaluate(() => [document.querySelector("#painel").getBoundingClientRect().width, document.documentElement.scrollWidth <= innerWidth]);
ok(larg[0] > 350 && larg[0] < 460 && larg[1], "computador: painel lateral e sem rolagem para o lado");
await pc.screenshot({ path: "saida/entregas-computador.png" });

await pb.click("#egOnline").catch(() => {});
await A.browser.close(); await B.browser.close(); await C.browser.close();
console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo");
process.exit(falhas ? 1 : 0);
