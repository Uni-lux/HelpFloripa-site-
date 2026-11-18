// Pedido de 18/11/2026: marca "ponte" própria (sem a cursiva do Instagram), Presentes organizado (topo de app, abas e
// ocasião em cartões, presentes em grupos), ocorrência e consulta melhores, veículos (placa oculta, roubado → ocorrência +
// busca de anúncios com a mesma placa), venda de carro/moto com placa obrigatória, Comunidade em cartões com "Combina com
// você" e o painel "Segurança e alertas" com os cruzamentos.
// Uso: node seed.mjs | tail -1 > saida/seed-ids.json && node t-veiculos-presentes.mjs
import { navegador, entrar, BASE, USUARIOS } from "./nav.mjs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { hashPlaca, idVenda, pareceVeiculo, imeiOk, placaMercosul } from "../veiculos-base.js";
process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8085";
const db = getFirestore(initializeApp({ projectId: "demo-hf" }));
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const U = USUARIOS;
const uid = (k) => U[k]?.uid || U[k];
const ANA = uid("ana"), BRUNO = uid("bruno");
for (const c of ["veiculos", "veiculos_venda", "ocorrencias", "ocorrencias_autoria"]) for (const d of (await db.collection(c).get()).docs) await db.recursiveDelete(d.ref);
// base pura
ok(placaMercosul("ABC-1234") === "ABC1C34" && (await hashPlaca("ABC1234")) === (await hashPlaca("ABC1C34")), "placa antiga e Mercosul dão o mesmo hash");
ok(imeiOk("490154203237518") && !imeiOk("490154203237517"), "IMEI conferido pela soma (Luhn)");
ok(pareceVeiculo("Fiat Uno Way 2015", 25000) && !pareceVeiculo("Capacete para moto", 200), "anúncio com cara de carro/moto é reconhecido (capacete não)");

const A = await navegador({ mobile: true });
await A.ctx.grantPermissions(["geolocation"]); await A.ctx.setGeolocation({ latitude: -27.5954, longitude: -48.548 });
const erros = [];
const p = await entrar(A.ctx, "ana", "feed.html");
p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector("#marcaTopo .marca-diare", { timeout: 25000 });
const marca = await p.locator("#marcaTopo .marca-diare").evaluate((e) => ({ t: e.textContent, f: getComputedStyle(e).fontFamily }));
ok(marca.t === "ponte" && /HF Marca/.test(marca.f) && !/Cursiva/.test(marca.f), `marca "ponte" na letra do site, sem a cursiva (${marca.f})`);

// ---------- Presentes ----------
await p.goto(BASE + "presentes.html"); await p.waitForSelector(".pr-aba small", { timeout: 20000 }); await p.waitForTimeout(1500);
ok(await p.locator("header.topo-app .topo-tit").textContent() === "Presentes" && await p.locator("header .marca").count() === 0, "presentes com topo de app (sem a marca antiga)");
ok(await p.locator(".pr-aba").count() === 2 && !/Carregando/.test(await p.locator(".pr-aba small").first().textContent()), "abas Recebidos/Enviados em cartões com o resumo");
await p.locator("#prEnviar").click(); await p.waitForSelector(".pr-ocasioes .op-card", { timeout: 10000 });
ok(await p.locator(".pr-ocasioes .op-card").count() === 7, "ocasião em 7 cartões com ícone e explicação");
const ordem = await p.locator(".pr-folha .pr-passo h3").allTextContents();
ok(ordem.slice(0, 3).join("|") === "Para quem|A ocasião|O presente", `ordem: ${ordem.join(" → ")}`);
ok((await p.locator(".pr-folha .op-sec").allTextContents()).join("|") === "Na hora|De um negócio|Mobilidade", "presentes em grupos: na hora, de um negócio, mobilidade");
await p.locator('[data-ocasiao="aniversario"]').click(); await p.waitForTimeout(200);
ok((await p.locator("#prMensagem").inputValue()).startsWith("Feliz aniversário"), "ocasião preenche o recado");
await p.locator(".ent-folha [data-fechar]").first().click(); await p.waitForTimeout(400);
if (await p.locator(".hf-confirma-fundo").count()) { await p.locator(".hf-confirma-fundo button", { hasText: /Sair|Descartar/ }).first().click().catch(() => {}); await p.waitForTimeout(300); }

// ---------- Veículos ----------
await p.goto(BASE + "alertas.html?aba=veiculos"); await p.waitForSelector('[data-acao="veiculo"]', { timeout: 20000 });
ok(await p.locator('.al-abas [data-aba]').count() === 4 && await p.locator("header.topo-app .topo-tit").textContent() === "Help e alertas", "alertas com topo de app e 4 abas (Veículos)");
await p.locator('[data-acao="veiculo"]').click(); await p.waitForSelector("#alVeiPlaca");
await p.locator("#alVeiPlaca").fill("ABC1234"); await p.waitForTimeout(150);
ok(/Mercosul: ABC1C34/.test(await p.locator(".al-valida").first().textContent()), "placa antiga mostra a forma Mercosul");
await p.locator("#alVeiMarca").fill("Fiat"); await p.locator("#alVeiModelo").fill("Uno Way"); await p.locator("#alVeiAno").fill("2015"); await p.locator("#alVeiCor").fill("Prata");
await p.locator("#alVeiSalvar").click(); await p.waitForSelector("#alVeiculos [data-veiculo]", { timeout: 15000 });
const vdoc = (await db.collection("veiculos").where("donoId", "==", ANA).get()).docs[0]?.data();
ok(vdoc?.placa === "ABC1C34" && vdoc.placaHash === await hashPlaca("ABC1234") && vdoc.marca === "Fiat", "veículo gravado com a placa Mercosul e o hash");
// Bruno anuncia um carro com a mesma placa (índice só com o hash)
const h = await hashPlaca("ABC1C34");
await db.doc(`veiculos_venda/${idVenda(BRUNO + "_lojinha", h)}`).set({ negocioId: BRUNO + "_lojinha", donoId: BRUNO, tipoNegocio: "lojinha", item: "Uno Way 2015 completo", tipo: "carro", placaHash: h, marca: "Fiat", modelo: "Uno Way", ano: "2015", cor: "Prata", cidade: "Florianópolis", uf: "SC", criadoEm: FieldValue.serverTimestamp(), atualizadoEm: FieldValue.serverTimestamp() });
await db.doc(`veiculos_venda/${idVenda(BRUNO + "_automotivo", "c".repeat(64))}`).set({ negocioId: BRUNO + "_automotivo", donoId: BRUNO, tipoNegocio: "automotivo", item: "Fiat Uno 2016 prata", tipo: "carro", placaHash: "c".repeat(64), marca: "Fiat", modelo: "Uno Way", ano: "2016", cor: "Prata", cidade: "Florianópolis", uf: "SC", criadoEm: FieldValue.serverTimestamp(), atualizadoEm: FieldValue.serverTimestamp() });
await p.locator("#alVeiculos [data-veiculo]").first().click(); await p.waitForSelector('[data-acao="roubado"]');
await p.locator('[data-acao="roubado"]').click(); await p.waitForSelector("#alOcDesc");
ok(await p.locator('[data-objeto="carro"][aria-pressed="true"]').count() === 1 && (await p.locator("#alOcId").inputValue()) === "ABC1C34", "\"Fui roubado\" abre a ocorrência com o carro e a placa");
ok(await p.locator('.ent-folha [data-tipo="roubo"][aria-pressed="true"]').count() === 1 && await p.locator(".ent-folha .op-card").count() >= 12, "o que aconteceu e o que foi levado em cartões");
await p.locator("#alOcDesc").fill("Levaram o carro estacionado na frente de casa");
await p.locator("#alOcOk").click(); await p.waitForSelector(".al-anuncios .al-resultado", { timeout: 20000 });
ok((await p.locator(".al-anuncios .al-resultado").first().textContent()).includes("MESMA placa"), "depois de registrar, acha o anúncio com a MESMA placa");
ok(await p.locator(".al-anuncios .al-anuncio").count() >= 2, "e mostra o parecido (mesma marca/modelo/cor, ano perto)");
const oc = (await db.collection("ocorrencias").get()).docs.map((d) => d.data())[0];
ok(oc?.identificador === "ABC1C34" && oc.veiculo?.modelo === "Uno Way", "ocorrência com a placa e marca/modelo/ano/cor");
const v2 = (await db.collection("veiculos").where("donoId", "==", ANA).get()).docs[0]?.data();
ok(v2?.status === "roubado" && !!v2.ocorrenciaId, "veículo marcado como roubado com a ocorrência");
// consulta pela placa antiga acha a ocorrência registrada na Mercosul
await p.goto(BASE + "alertas.html?aba=roubos"); await p.waitForSelector('[data-acao="consultar"]', { timeout: 20000 });
await p.locator('[data-acao="consultar"]').click(); await p.waitForSelector('[data-consulta="veiculo"]');
await p.locator('[data-consulta="veiculo"]').click(); await p.locator("#alConsulta").fill("ABC-1234"); await p.locator("#alConsultar").click();
await p.waitForSelector(".al-res .al-resultado", { timeout: 15000 });
ok((await p.locator(".al-res .al-resultado").textContent()).includes("Atenção"), "consulta pela placa antiga acha o alerta (Mercosul)");
ok(await p.locator(".al-res .al-anuncio").count() === 1, "e avisa que está anunciado no Help Floripa");
await p.locator('[data-consulta="celular"]').click(); await p.locator("#alConsulta").fill("490154203237517");
ok(/não confere/.test(await p.locator(".al-valida").last().textContent()), "IMEI digitado errado é avisado na hora");

// ---------- Venda: placa obrigatória, bloqueio com alerta e índice só com o hash ----------
await db.doc(`negocios/${BRUNO}_lojinha`).set({ donoId: BRUNO, tipo: "lojinha", nome: "Bruno Garagem", cidade: "Florianópolis", uf: "SC", cidadeIbge: 4205407, bairro: "Centro", categoria: "outros", categoriaPersonalizada: "Veículos", itens: [{ nome: "Camiseta", preco: 50, foto: "" }], fotos: [], criadoEm: FieldValue.serverTimestamp(), atualizadoEm: FieldValue.serverTimestamp() });
const B = await navegador({ mobile: true });
const pb = await entrar(B.ctx, "bruno", "negocios.html?tipo=lojinha");
pb.on("pageerror", (e) => erros.push("bruno: " + e.message));
await pb.waitForSelector("text=Bruno Garagem", { timeout: 25000 }); await pb.waitForTimeout(1500);
if (!(await pb.locator(".neg-item").count())) await pb.evaluate(() => {
  let e = [...document.querySelectorAll("strong, h2, h3, b")].find((x) => x.textContent.trim() === "Bruno Garagem");
  while (e && ![...e.querySelectorAll("button, a")].some((b) => b.textContent.trim() === "Editar")) e = e.parentElement;
  [...e.querySelectorAll("button, a")].find((b) => b.textContent.trim() === "Editar").click();
});
await pb.waitForSelector(".neg-item", { timeout: 15000 }); await pb.waitForTimeout(800);
const toastTxt = async () => { await pb.waitForTimeout(1500); return (await pb.locator(".toast").last().textContent().catch(() => "")) || ""; };
await pb.locator(".neg-add").first().click(); await pb.waitForTimeout(300);
const ult = pb.locator(".neg-item").last();
await ult.locator("input").first().fill("Fiat Uno Way 2015"); await ult.locator("input.preco").fill("25000");
await pb.locator("#negSalvar").click();
ok(/parece um carro ou moto/.test(await toastTxt()), "produto com cara de carro sem marcar veículo não salva (placa obrigatória)");
await ult.locator(".item-det summary").click().catch(() => {});
await ult.locator('[data-veiculo-tipo="carro"]').click(); await pb.waitForTimeout(200);
const campos = ult.locator(".item-vei-campos input");
await campos.nth(0).fill("ABC1C34"); await campos.nth(1).fill("Fiat"); await campos.nth(2).fill("Uno Way"); await campos.nth(3).fill("2015"); await campos.nth(4).fill("Prata");
await pb.locator("#negSalvar").click();
ok(/alerta de roubo ou furto ativo/.test(await toastTxt()), "placa com alerta de roubo: o anúncio não é publicado");
await pb.waitForTimeout(1500);
const ocId = (await db.collection("ocorrencias").get()).docs[0].id;
const pistas = (await db.collection(`ocorrencias/${ocId}/pistas`).get()).docs.map((d) => d.data());
ok(pistas.some((x) => /Alerta automático/.test(x.texto) && x.anonimo), "quem registrou recebe o alerta automático nas pistas");
const aut = (await db.collection("pistas_autoria").get()).docs.map((d) => d.data().uid);
ok(aut.includes(BRUNO), "a equipe sabe quem tentou anunciar (autoria da pista)");
await campos.nth(0).fill("XYZ9A87");
await pb.locator("#negSalvar").click(); await pb.waitForTimeout(3500);
const neg = (await db.doc(`negocios/${BRUNO}_lojinha`).get()).data();
const itV = (neg?.itens || []).find((x) => x.veiculo);
ok(itV?.veiculo?.conferido && itV.veiculo.modelo === "Uno Way" && !JSON.stringify(neg).includes("XYZ9A87"), "anúncio salvo com o selo conferido e SEM a placa no documento público");
const vendas = (await db.collection("veiculos_venda").where("negocioId", "==", BRUNO + "_lojinha").get()).docs.map((d) => d.data());
ok(vendas.length === 1 && vendas[0].placaHash === await hashPlaca("XYZ9A87") && !("placa" in vendas[0]), "índice de venda só com o hash (o antigo com outra placa saiu)");
ok(((await db.doc(`usuarios/${BRUNO}`).get()).data()?.veiculosVenda || {})[(await hashPlaca("XYZ9A87")).slice(0, 16)] === "XYZ9A87", "a placa fica só na conta do vendedor");

// ---------- Comunidade: cartões e "Combina com você" ----------
const agora = FieldValue.serverTimestamp();
const base = { status: "disponivel", cidade: "Florianópolis", uf: "SC", cidadeIbge: 4205407, bairro: "Centro", criadoEm: agora, atualizadoEm: agora, fotos: [] };
await db.doc("comunidade/cmb-ana").set({ ...base, donoId: ANA, categoria: "pedido", titulo: "Cadeira de rodas", descricao: "Preciso de uma cadeira de rodas para minha avó" });
await db.doc("comunidade/cmb-bruno").set({ ...base, donoId: BRUNO, categoria: "doacao", titulo: "Cadeira de rodas dobrável", descricao: "Doando cadeira de rodas em bom estado" });
await p.evaluate(() => { for (const k of Object.keys(sessionStorage)) sessionStorage.removeItem(k); for (const k of Object.keys(localStorage)) if (/^q:|cm|inicio/.test(k)) localStorage.removeItem(k); });
await p.goto(BASE + "mural.html"); await p.waitForSelector(".mu-al .mu-al-ic", { timeout: 20000 });
ok(await p.locator(".mu-al").count() === 3 && (await p.locator(".mu-al small").first().textContent()).length > 3, "Help · Pets · Alertas em cartões com ícone e explicação");
await p.waitForSelector("#muCombina:not([hidden]) .mu-combina-item", { timeout: 20000 }).catch(() => {});
ok(await p.locator("#muCombina:not([hidden]) .mu-combina-item").count() >= 1 && /Cadeira de rodas/.test(await p.locator(".mu-combina-item").first().textContent()), "\"Combina com você\": o pedido da Ana cruza com a doação do Bruno");

// ---------- Painel ----------
// Alguém que burlou o app (sem passar pela conferência) e anunciou o carro roubado: o painel acha pelo cruzamento.
await db.doc(`veiculos_venda/${idVenda(BRUNO + "_automotivo", h)}`).set({ negocioId: BRUNO + "_automotivo", donoId: BRUNO, tipoNegocio: "automotivo", item: "Uno Way 2015 de repasse", tipo: "carro", placaHash: h, marca: "Fiat", modelo: "Uno Way", ano: "2015", cor: "Prata", cidade: "Palhoça", uf: "SC", criadoEm: FieldValue.serverTimestamp(), atualizadoEm: FieldValue.serverTimestamp() });
const C = await navegador({ mobile: false });
const pa = await entrar(C.ctx, "admin", "admin.html#seguranca");
pa.on("pageerror", (e) => erros.push("painel: " + e.message));
await pa.waitForSelector(".ad-item", { timeout: 30000 }).catch(() => {});
await pa.waitForTimeout(1500);
const txt = await pa.locator("#principal").textContent();
ok(/Segurança e alertas/.test(txt) && /Mesma placa/.test(txt), "painel: Segurança e alertas mostra o cruzamento da MESMA placa");
ok(/parecido com um veículo roubado/.test(txt), "painel: e o veículo parecido");
await pa.locator('.ad-chip[data-aba="vendas"]').click(); await pa.waitForTimeout(400);
ok(/Alerta de roubo/.test(await pa.locator("#principal").textContent()), "painel: veículos à venda marcam o que tem alerta");

ok(!erros.length, "sem erros: " + erros.join(" | "));
await db.doc("comunidade/cmb-ana").delete(); await db.doc("comunidade/cmb-bruno").delete();
process.exit(process.exitCode || 0);
