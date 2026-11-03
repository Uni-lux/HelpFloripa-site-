// Etapa A (servidor, com o plano Blaze): ranking do Diário montado pela Cloud Function, tempo de resposta calculado no
// servidor e pedido do chat conferido. Precisa do emulador com as Functions: FUNCOES=1 ./emulador.sh (porta 5001).
// Roda: FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 node t-servidor.mjs
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, BASE, USUARIOS as U } from "./nav.mjs";
import { notaServidor, montarListas, lerItem } from "../functions/diario-ranking.js";
import { passoEspera, novaMedia, conferirPedidoChat } from "../functions/seguranca-chat.js";
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
let falhas = 0; const ok = (c, t) => { console.log((c ? "  ✔ " : "  ✘ ") + t); if (!c) falhas++; };
const agora = Date.now(), ts = (m) => Timestamp.fromMillis(m), criados = [];
const pôr = async (c, id, d) => { await db.doc(`${c}/${id}`).set(d); criados.push(`${c}/${id}`); };
const esperar = async (f, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const r = await f(); if (r) return r; await new Promise((x) => setTimeout(x, 300)); } return null; };

// ---------- 1) a conta (sem Firebase) ----------
console.log("Conta do ranking");
const vistaPorPoucos = notaServidor({ total: 6, soma: 28, vistas: 15, horas: 3 });
const vistaPorMuitos = notaServidor({ total: 6, soma: 28, vistas: 3000, horas: 3 });
ok(vistaPorPoucos > vistaPorMuitos * 1.5, `taxa pesa: 6 estrelas em 15 vistas (${vistaPorPoucos.toFixed(3)}) > as mesmas em 3 mil (${vistaPorMuitos.toFixed(3)})`);
ok(notaServidor({ total: 1, soma: 5, vistas: 1, horas: 1 }) < notaServidor({ total: 8, soma: 36, vistas: 40, horas: 1 }), "uma estrela sozinha não vira viral (prior de vistas)");
ok(notaServidor({ total: 3, soma: 12, vistas: 20, horas: 1 }) > notaServidor({ total: 3, soma: 12, vistas: 20, horas: 30 }), "mais nova vale mais");
const muitos = Array.from({ length: 10 }, (_, i) => ({ id: "x" + i, autorId: "mesma", uf: "SC", ibge: 4205407, nota: 1 - i / 100, criadoEm: agora, total: 0, soma: 0, comentarios: 0, vistas: 0 }));
const listas = montarListas([...muitos, { id: "outra", autorId: "b", uf: "SP", ibge: 3550308, nota: 0.5, criadoEm: agora, total: 0, soma: 0, comentarios: 0, vistas: 0 }], agora);
ok(listas.br.itens.filter((x) => lerItem(x).autorId === "mesma").length === 3, "no máximo 3 da mesma pessoa em cada lista");
ok(listas.uf_SC.cidades["4205407"].length === 3 && listas.uf_SP.itens.length === 1, "listas por estado e por cidade");
ok(lerItem(listas.br.itens[0]).id === "x0", "item compacto volta igual");

console.log("Conta do atendimento e do pedido");
let e = passoEspera(null, "cliente", false, 1000);
ok(e.espera?.de === "cliente" && e.resposta == null, "cliente escreve: começa a esperar");
e = passoEspera(e.espera, "cliente", false, 5000);
ok(e.espera.desde === 1000, "mandou mais uma: a espera continua desde a 1ª");
e = passoEspera(e.espera, "negocio", true, 1000 + 12 * 60000);
ok(e.resposta === 12 && e.espera === null, "negócio respondeu: 12 min");
ok(passoEspera(null, "negocio", true, 1).espera === null, "negócio escrevendo primeiro não abre espera");
ok(novaMedia({ media: 10, n: 1 }, 20).media === 15, "média das respostas");
const neg = { tipo: "delivery", taxaEntrega: 5, itens: [{ nome: "Pastel", preco: 10 }, { nome: "Suco", preco: 6 }] };
ok(conferirPedidoChat({ itens: [{ nome: "Pastel", qtd: 2, preco: 10 }], taxa: 5, total: 25, modo: "entrega" }, neg).ok, "pedido certo confere");
const errado = conferirPedidoChat({ itens: [{ nome: "Pastel", qtd: 2, preco: 1 }], taxa: 0, total: 2, modo: "entrega" }, neg);
ok(!errado.ok && errado.avisos.some((a) => /Preço diferente/.test(a)) && errado.avisos.some((a) => /Taxa/.test(a)), "preço e taxa mexidos são apontados: " + errado.avisos.join(" | "));
ok(!conferirPedidoChat({ itens: [{ nome: "Pastel", qtd: 1, preco: 10 }], taxa: 5, total: 15, cupom: { codigo: "X10" } }, neg).ok, "cupom sem promoção valendo é apontado");

// ---------- 2) a função no emulador ----------
console.log("Ranking no emulador");
const H = 3600e3;
// Ana é de Florianópolis (SC, 4205407). Edu de São Paulo.
await pôr("diario", "rkA", { autorId: U.bruno, nome: "Bruno", texto: "Pôr do sol na Beira-Mar (ranking)", autorUf: "SC", autorIbge: 4205407, criadoEm: ts(agora - 30 * H) });
await pôr("diario", "rkB", { autorId: U.edu, nome: "Eduardo Lima", texto: "Muita gente viu, pouca gente curtiu (ranking)", autorUf: "SP", autorIbge: 3550308, criadoEm: ts(agora - 30 * H) });
await pôr("diario", "rkVelha", { autorId: U.edu, nome: "Eduardo Lima", texto: "Velha demais (ranking)", autorUf: "SP", autorIbge: 3550308, criadoEm: ts(agora - 60 * H) });
await pôr("diario", "rkAgendada", { autorId: U.edu, nome: "Eduardo Lima", texto: "Agendada (ranking)", autorUf: "SP", criadoEm: ts(agora - H), agendadoPara: ts(agora + 5 * H) });
// 25 publicações novas de outras pessoas: a de 30 h fica fora das 20 recentes (só chega pelo ranking).
for (let i = 0; i < 25; i++) await pôr("diario", "rkNova" + i, { autorId: [U.dani, U.fabi, U.gui, U.hele][i % 4], nome: "Teste", texto: "Nova " + i + " (ranking)", criadoEm: ts(agora - (i + 1) * 60e3) });
await pôr("diario_notas", "rkA", { total: 6, soma: 29, n5: 5, n4: 1 });
await pôr("diario_notas", "rkB", { total: 6, soma: 29, n5: 5, n4: 1 });
const lote = db.batch();
for (let i = 0; i < 12; i++) lote.set(db.doc(`diario/rkA/vistas/v${i}`), { em: ts(agora) });
for (let i = 0; i < 400; i++) lote.set(db.doc(`diario/rkB/vistas/v${i}`), { em: ts(agora) });
await lote.commit();
criados.push("diario/rkA/vistas", "diario/rkB/vistas");
await pôr("comentarios", "rkCom1", { postId: "rkA", autorId: U.edu, postAutorId: U.bruno, texto: "Lindo!", criadoEm: ts(agora - H) });
const r = await fetch("http://127.0.0.1:5001/demo-hf/southamerica-east1/montarRankingAgora").then((x) => x.json()).catch((e) => ({ erro: String(e) }));
ok(r.listas >= 2, "função montou as listas: " + JSON.stringify(r));
const br = (await db.doc("ranking_diario/br").get()).data();
const ids = (br?.itens || []).map((x) => lerItem(x).id);
ok(ids.includes("rkA") && ids.includes("rkB"), "Brasil tem as duas de 30 h");
ok(!ids.includes("rkVelha") && !ids.includes("rkAgendada"), "fora: mais de 48 h e agendada");
ok(ids.indexOf("rkA") < ids.indexOf("rkB"), "mesmas estrelas: a vista por 12 fica acima da vista por 400 (taxa)");
const a = lerItem(br.itens.find((x) => lerItem(x).id === "rkA"));
ok(a.vistas === 12 && a.comentarios === 1 && a.total === 6, `números do servidor: ${a.vistas} vistas, ${a.comentarios} comentário, ${a.total} estrelas`);
const sc = (await db.doc("ranking_diario/uf_SC").get()).data();
ok(sc?.cidades?.["4205407"]?.some((x) => lerItem(x).id === "rkA"), "Florianópolis tem a dela");

// ---------- 3) o Diário usa o ranking ----------
console.log("Diário com o ranking");
const { browser, ctx } = await navegador({ mobile: true });
const erros = [];
const p = await entrar(ctx, "ana", "feed.html");
p.on("pageerror", (x) => erros.push(x.message));
const lidas = [];
p.on("request", (q) => { const u = q.url(); if (/ranking_diario/.test(decodeURIComponent(u))) lidas.push(u); });
await p.evaluate(() => { Object.keys(sessionStorage).filter((k) => k.startsWith("hf-rk-")).forEach((k) => sessionStorage.removeItem(k)); localStorage.removeItem("hf-ranking-sem"); localStorage.setItem("hf-filtro-diario", "principais"); });
await p.reload();
await p.waitForSelector(".post-card", { timeout: 30000 });
await p.waitForTimeout(2500);
const usou = await p.evaluate(() => !!sessionStorage.getItem("hf-rk-br"));
ok(usou, "Diário leu o ranking do servidor");
const textos = await p.evaluate(() => [...document.querySelectorAll(".post-card")].map((x) => x.textContent));
ok(textos.some((t) => /Beira-Mar \(ranking\)/.test(t)), "publicação do ranking (30 h, fora das recentes) aparece no Diário");
ok(!textos.some((t) => /Agendada \(ranking\)/.test(t)), "agendada não aparece");
// Ranking parado (mais de 90 min): o Diário faz como antes.
await db.doc("ranking_diario/br").set({ ...br, atualizadoEm: agora - 3 * H });
await p.evaluate(() => { Object.keys(sessionStorage).filter((k) => k.startsWith("hf-rk-")).forEach((k) => sessionStorage.removeItem(k)); localStorage.removeItem("hf-ranking-sem"); });
await p.reload(); await p.waitForSelector(".post-card", { timeout: 30000 }); await p.waitForTimeout(1500);
ok(await p.evaluate(() => Number(localStorage.getItem("hf-ranking-sem") || 0) > Date.now()), "ranking velho: volta ao jeito de antes e espera 30 min para tentar de novo");
ok(await p.locator(".post-card").count() > 0, "Diário continua com publicações sem o ranking");
await db.doc("ranking_diario/br").delete(); await db.doc("ranking_diario/uf_SC").delete(); await db.doc("ranking_diario/uf_SP").delete();

// ---------- 4) mensagens: tempo de resposta e pedido ----------
console.log("Chat conferido no servidor");
const conv = [U.ana, U.bruno].sort().join("_");
const antes = (await db.doc(`conversas/${conv}`).get()).data() || null;
await db.doc(`conversas/${conv}`).set({ participantes: [U.ana, U.bruno].sort(), contexto: { tipo: "delivery", titulo: "Teste" }, atualizadoEm: ts(agora) }, { merge: true });
await db.doc(`servidor_atendimento/${conv}`).delete().catch(() => {});
const pfAntes = (await db.doc(`perfis_publicos/${U.bruno}`).get()).get("respostaServ") || null;
await db.doc(`perfis_publicos/${U.bruno}`).update({ respostaServ: null }).catch(() => {});
await pôr(`conversas/${conv}/mensagens`, "rsp1", { remetenteId: U.ana, texto: "Oi, tem pastel?", criadoEm: ts(agora - 20 * 60e3) });
await esperar(async () => (await db.doc(`servidor_atendimento/${conv}`).get()).get("de") === U.ana);
await pôr(`conversas/${conv}/mensagens`, "rsp2", { remetenteId: U.bruno, texto: "Tem sim!", criadoEm: ts(agora - 12 * 60e3) });
const rs = await esperar(async () => (await db.doc(`perfis_publicos/${U.bruno}`).get()).get("respostaServ"));
ok(rs && Math.round(rs.media) === 8 && rs.n === 1, "tempo de resposta do negócio calculado no servidor: " + JSON.stringify(rs));
// Pedido com o preço mexido
const negId = `${U.bruno}_delivery`;
const negAntes = (await db.doc(`negocios/${negId}`).get()).data() || null;
await db.doc(`negocios/${negId}`).set({ donoId: U.bruno, tipo: "delivery", nome: "Bruno Lanches", taxaEntrega: 5, itens: [{ nome: "Pastel", preco: 10 }], criadoEm: ts(agora), atualizadoEm: ts(agora) }, { merge: true });
const cartao = (pedido) => ({ tipo: "delivery", titulo: "Pedido · Bruno Lanches", link: `delivery.html?negocio=${negId}`, pedido });
await pôr(`conversas/${conv}/mensagens`, "ped1", { remetenteId: U.ana, texto: "", tipoArquivo: "cartao", cartao: cartao({ itens: [{ nome: "Pastel", qtd: 2, preco: 1 }], subtotal: 2, taxa: 5, total: 7, modo: "entrega" }), criadoEm: ts(agora) });
await pôr(`conversas/${conv}/mensagens`, "ped2", { remetenteId: U.ana, texto: "", tipoArquivo: "cartao", cartao: cartao({ itens: [{ nome: "Pastel", qtd: 2, preco: 10 }], subtotal: 20, taxa: 5, total: 25, modo: "entrega" }), criadoEm: ts(agora + 1000) });
const c1 = await esperar(async () => (await db.doc(`conversas/${conv}/mensagens/ped1`).get()).get("conferencia"));
const c2 = await esperar(async () => (await db.doc(`conversas/${conv}/mensagens/ped2`).get()).get("conferencia"));
ok(c1 && !c1.ok && c1.avisos.some((x) => /Preço diferente/.test(x)), "pedido com preço mexido: apontado na mensagem");
ok(c2?.ok === true && c2.total === 25, "pedido certo: conferido");
// No chat do negócio (Bruno): selo verde e alerta.
const p2 = await entrar(await (await navegador({ mobile: true })).ctx, "bruno", `mensagens.html?conversa=${conv}`);
p2.on("pageerror", (x) => erros.push(x.message));
await p2.waitForSelector(".pd-conferido", { timeout: 30000 }).catch(() => {});
ok(await p2.locator(".pd-conferido").count() >= 1, "chat mostra \"Valores conferidos\" no pedido certo");
const alerta = await p2.locator(".pd-alerta:not([hidden])").allTextContents();
ok(alerta.some((x) => /Preço diferente/.test(x)), "chat mostra o alerta do servidor no pedido mexido");
await p2.screenshot({ path: "saida/servidor-pedido.png" });
ok(!erros.length, "sem erros " + erros.join(" | "));

// ---------- limpeza ----------
for (const c of criados) {
  if (/\/vistas$/.test(c)) { const s = await db.collection(c).get(); const b = db.batch(); s.docs.forEach((d) => b.delete(d.ref)); await b.commit(); }
  else await db.doc(c).delete().catch(() => {});
}
if (negAntes) await db.doc(`negocios/${negId}`).set(negAntes); else await db.doc(`negocios/${negId}`).delete();
await db.doc(`perfis_publicos/${U.bruno}`).update({ respostaServ: pfAntes }).catch(() => {});
if (!antes) await db.doc(`conversas/${conv}`).delete().catch(() => {});
else await db.doc(`conversas/${conv}`).set(antes);
await db.doc(`servidor_atendimento/${conv}`).delete().catch(() => {});
await browser.close();
console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
