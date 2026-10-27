// Pagamento automático dos planos (Mercado Pago + Cloud Functions), contra o emulador e um Mercado Pago de mentira.
// - Pix: o pedido gera o QR Code do Mercado Pago; quando o Pix "cai" e o aviso (webhook) chega com assinatura certa, o
//   plano liga sozinho (primeira assinatura +30 dias), a tela vira "Pagamento aprovado!", aviso e registro do painel.
// - Aviso com assinatura errada é recusado; aviso repetido não ativa duas vezes; o valor sai do servidor (pedido com
//   valor adulterado paga o preço certo); pedido de outra pessoa é recusado.
// - Cartão (formulário do Mercado Pago simulado): recusado mostra o motivo; aprovado liga o plano na hora (troca de
//   plano converte os dias que sobravam).
// Uso: FUNCOES=1 ./emulador.sh (sobe as Functions) + node mp-falso.mjs + node servidor-csp.mjs; node seed.mjs && node t-pagamento.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
import { assinaturaOk, corpoCartao, fimDoPlano } from "../functions/pagamentos.js";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const DIA = 864e5, FUNC = "http://127.0.0.1:5001/demo-hf/southamerica-east1", MP = "http://127.0.0.1:5099", SEGREDO = "segredo-de-teste";

// ---------- 0) peças do servidor ----------
{
  const ts = "1700000000000", rid = "req-abc", id = "123456";
  const v1 = crypto.createHmac("sha256", SEGREDO).update(`id:${id};request-id:${rid};ts:${ts};`).digest("hex");
  ok(assinaturaOk({ assinatura: `ts=${ts},v1=${v1}`, requestId: rid, dataId: id, segredo: SEGREDO }) && !assinaturaOk({ assinatura: `ts=${ts},v1=${"0".repeat(64)}`, requestId: rid, dataId: id, segredo: SEGREDO }), "assinatura do aviso: certa passa, errada não");
  ok(corpoCartao("x", { plano: "pro", meses: 1, uid: "u" }, { payment_method_id: "visa" }, "a@b.c", "") === null, "cartão sem token é recusado antes de chamar o Mercado Pago");
  const c = corpoCartao("x", { plano: "pro", meses: 3, uid: "u" }, { token: "t", payment_method_id: "visa", transaction_amount: 1 }, "a@b.c", "");
  ok(c.transaction_amount === 107.73 && c.installments === 1 && c.statement_descriptor === "HELPFLORIPA", "cartão: valor do servidor (107,73), à vista, fatura HELPFLORIPA");
  const agora = Date.now();
  ok(Math.round((fimDoPlano({ plano: "plus", ate: Timestamp.fromMillis(agora + 10 * DIA) }, "plus", 1, 0, agora) - agora) / DIA) === 40, "mesmo plano: soma 30 dias ao fim do atual");
}

// ---------- preparo ----------
async function limpar() {
  for (const col of ["planos_pedidos"]) { const s = await db.collection(col).where("uid", "==", U.bruno).get(); for (const d of s.docs) await d.ref.delete(); }
  await db.doc(`planos/${U.bruno}`).delete().catch(() => {});
  await db.doc(`planos_negociacoes/${U.bruno}`).delete().catch(() => {});
}
await limpar();
const sdkFalso = `window.MercadoPago = class { constructor(k) { window.__mpChave = k; } bricks() { return { create: async (nome, id, cfg) => {
  window.__brick = { nome, amount: cfg.initialization.amount, max: cfg.customization.paymentMethods.maxInstallments, tema: cfg.customization.visual.style.theme };
  const c = document.getElementById(id); const b = document.createElement("button"); b.type = "button"; b.className = "mp-falso"; b.textContent = cfg.customization.visual.texts.formSubmit;
  b.onclick = () => cfg.callbacks.onSubmit({ token: window.__tokenCartao || "aprovado", payment_method_id: "master", issuer_id: "24", installments: 1, transaction_amount: 0.01, payer: { email: "bruno@cartao.test", identification: { type: "CPF", number: "123.456.789-09" } } }).catch(() => {});
  c.appendChild(b); cfg.callbacks.onReady?.(); return { unmount() { c.innerHTML = ""; } }; } }; } };`;
async function preparar(ctx) {
  await ctx.addInitScript(() => { window.__hfFuncoesEmulador = 5001; });
  const base = readFileSync(new URL("../planos-base.js", import.meta.url), "utf8").replace("PAGAMENTO = { automatico: false", "PAGAMENTO = { automatico: true");
  await ctx.route(/\/planos-base\.js(\?.*)?$/, (r) => r.fulfill({ body: base, contentType: "text/javascript" }));
  await ctx.route("https://sdk.mercadopago.com/**", (r) => r.fulfill({ body: sdkFalso, contentType: "text/javascript" }));
}
async function aviso(id, { segredo = SEGREDO } = {}) {
  const ts = String(Date.now()), rid = "req-" + ts;
  const v1 = crypto.createHmac("sha256", segredo).update(`id:${id};request-id:${rid};ts:${ts};`).digest("hex");
  const r = await fetch(`${FUNC}/webhookMercadoPago?data.id=${id}&type=payment`, { method: "POST", headers: { "Content-Type": "application/json", "x-signature": `ts=${ts},v1=${v1}`, "x-request-id": rid }, body: JSON.stringify({ type: "payment", data: { id } }) });
  return { status: r.status, corpo: await r.json().catch(() => ({})) };
}
const pagamentosMp = async () => (await fetch(`${MP}/__pagamentos`)).json();

// ---------- 1) Pix automático ----------
const B = await navegador({ mobile: true });
await preparar(B.ctx);
const b = await entrar(B.ctx, "bruno", "negocios.html?planos=1");
await b.waitForSelector(".pl-card", { timeout: 20000 });
await b.locator(".pl-card[data-plano='plus']").click();
await b.locator(".pl-per", { hasText: "1 mês" }).click();
ok((await b.locator(".pl-btn", { hasText: "Pagar" }).textContent()).includes("Pix ou cartão"), "botão: Pagar R$ 29,90 · Pix ou cartão");
await b.locator(".pl-btn", { hasText: "Pagar" }).click();
await b.waitForSelector(".pl-abas", { timeout: 10000 });
await b.waitForSelector(".pl-espera", { timeout: 30000 }).catch(() => {});
const ped1 = (await db.collection("planos_pedidos").where("uid", "==", U.bruno).get()).docs[0];
const qrTela = await b.textContent(".pl-area .pl-codigo").catch(() => "");
ok(/pix\.mercadopago\.test\/qr\//.test(qrTela) && await b.locator(".pl-area svg").count() === 1, "aba Pix: QR Code e copia e cola do Mercado Pago");
ok((await b.textContent(".pl-espera")).includes("liga sozinho"), "\"Esperando o pagamento. O plano liga sozinho...\"");
const pgPix = (await pagamentosMp()).find((x) => x.external_reference === ped1.id);
ok(pgPix && pgPix.transaction_amount === 29.9 && pgPix.payment_method_id === "pix" && pgPix.payer.email, "pagamento Pix criado no Mercado Pago com o valor do servidor (29,90) e o pedido como referência");
ok((await ped1.ref.get()).data().mpPix?.qr === qrTela.trim(), "QR guardado no pedido (reabrir não cria outro)");
await b.screenshot({ path: "saida/pg-pix.png" });

const ruim = await aviso(pgPix.id, { segredo: "outro" });
ok(ruim.status === 401, "aviso com assinatura errada: recusado (401)");
const cedo = await aviso(pgPix.id);
ok(cedo.status === 200 && cedo.corpo.r === "pending" && (await ped1.ref.get()).data().status === "pendente", "aviso antes de pagar: nada liga (pending)");
await fetch(`${MP}/__aprovar/${pgPix.id}`, { method: "POST" });
const pago = await aviso(pgPix.id);
ok(pago.corpo.r === "ativado", "Pix caiu + aviso: " + pago.corpo.r);
await b.waitForSelector(".pl-aprovado", { timeout: 15000 }).catch(() => {});
ok((await b.textContent(".pl-aprovado").catch(() => "")).includes("Pagamento aprovado!"), "a tela muda sozinha para \"Pagamento aprovado!\"");
await b.screenshot({ path: "saida/pg-aprovado.png" });
const pl1 = (await db.doc(`planos/${U.bruno}`).get()).data();
const dias1 = Math.round((pl1.ate.toMillis() - Date.now()) / DIA);
ok(pl1.plano === "plus" && pl1.pedidoId === ped1.id && pl1.ativadoPor === "mercadopago" && dias1 === 60, `plano Plus ligado: 30 dias + 30 de bônus da primeira assinatura (${dias1} dias)`);
const p1 = (await ped1.ref.get()).data();
ok(p1.status === "pago" && p1.metodo === "pix" && p1.decididoPor === "mercadopago", "pedido pago, por Pix, decidido pelo Mercado Pago");
const avisos = (await db.collection("avisos").where("uid", "==", U.bruno).get()).docs.map((d) => d.data()).filter((a) => a.por === "mercadopago");
ok(avisos.some((a) => a.titulo.includes("Plus está ativo") && a.texto.includes("30 dias grátis")), "aviso para a pessoa: plano ativo + 30 dias grátis");
const log = (await db.collection("admin_log").where("ref", "==", "planos_pedidos:" + ped1.id).get()).docs.map((d) => d.data());
ok(log.length === 1 && log[0].acao === "plano_ativar" && log[0].porNome.includes("automático"), "registro no painel: Ativou plano · Mercado Pago (automático)");
const repetido = await aviso(pgPix.id);
ok(repetido.corpo.r === "ja-pago" && (await db.collection("admin_log").where("ref", "==", "planos_pedidos:" + ped1.id).get()).size === 1, "aviso repetido não ativa duas vezes");
await B.browser.close();

// ---------- 2) segurança do valor e do dono ----------
const adulterado = await db.collection("planos_pedidos").add({ uid: U.bruno, nome: "Bruno", email: "bruno@teste.com", plano: "premium", meses: 1, valor: 0.5, txid: "HFADULTERADO", status: "pendente", criadoEm: Timestamp.now() });
const A = await navegador({ mobile: true });
await preparar(A.ctx);
const a = await entrar(A.ctx, "ana", "negocios.html");
await a.waitForTimeout(2500);
const chamar = (dados) => a.evaluate(async (d) => {
  const m = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js");
  const f = m.getFunctions(window.firebaseApp, "southamerica-east1"); m.connectFunctionsEmulator(f, "127.0.0.1", 5001);
  try { return { ok: (await m.httpsCallable(f, "pagarPlano")(d)).data }; } catch (e) { return { erro: e.code, msg: e.message }; }
}, dados);
const alheio = await chamar({ pedidoId: adulterado.id, metodo: "pix" });
ok(alheio.erro === "functions/failed-precondition" && alheio.msg.includes("outra conta"), "pedido de outra pessoa: recusado (" + alheio.msg + ")");
await A.browser.close();

// ---------- 3) cartão (troca para o Pro) ----------
await adulterado.update({ status: "cancelado" });
const B2 = await navegador({ mobile: true });
await preparar(B2.ctx);
const c = await entrar(B2.ctx, "bruno", "negocios.html?planos=1");
c.on("console", (m) => { if (/Cart|Pagamento|sdk|mercado/i.test(m.text())) console.log("CONSOLE", m.text().slice(0, 300)); });
await c.waitForSelector(".pl-card", { timeout: 20000 });
await c.locator(".pl-card[data-plano='pro']").click();
await c.locator(".pl-per", { hasText: "1 mês" }).click();
await c.locator(".pl-btn", { hasText: "Pagar" }).click();
await c.waitForSelector(".pl-abas", { timeout: 10000 });
await c.locator(".pl-aba", { hasText: "Cartão" }).click();
await c.waitForSelector(".mp-falso", { timeout: 15000 }).catch(async () => { console.log("ÁREA:", await c.textContent(".pl-area")); await c.screenshot({ path: "saida/pg-dbg.png" }); });
const brick = await c.evaluate(() => ({ ...window.__brick, chave: window.__mpChave }));
ok(brick.nome === "cardPayment" && brick.amount === 39.9 && brick.max === 1 && brick.chave.startsWith("TEST-"), `formulário de cartão do Mercado Pago: R$ 39,90, à vista, chave de teste (tema ${brick.tema})`);
await c.evaluate(() => { window.__tokenCartao = "recusado"; });
await c.locator(".mp-falso").click();
await c.waitForSelector(".pl-area .pl-erro:not([hidden])", { timeout: 20000 }).catch(() => {});
ok((await c.textContent(".pl-area .pl-erro").catch(() => "")).includes("Saldo ou limite insuficiente"), "cartão recusado: mostra o motivo (saldo ou limite insuficiente)");
await c.screenshot({ path: "saida/pg-cartao-recusado.png" });
await c.evaluate(() => { window.__tokenCartao = "aprovado"; });
await c.locator(".mp-falso").click();
await c.waitForSelector(".pl-aprovado", { timeout: 20000 }).catch(() => {});
ok((await c.textContent(".pl-aprovado").catch(() => "")).includes("HELPFLORIPA"), "cartão aprovado: plano liga na hora (fatura como HELPFLORIPA)");
const pl2 = (await db.doc(`planos/${U.bruno}`).get()).data();
const dias2 = Math.round((pl2.ate.toMillis() - Date.now()) / DIA);
const credito = Math.floor((dias1 * 29.9) / 39.9);
ok(pl2.plano === "pro" && Math.abs(dias2 - (credito + 30)) <= 1, `troca Plus → Pro: os ${dias1} dias do Plus viram ${credito} no Pro + 30 pagos (${dias2} dias, sem bônus de novo)`);
const pedPro = (await db.collection("planos_pedidos").where("uid", "==", U.bruno).where("plano", "==", "pro").get()).docs.map((d) => d.id);
const pgs = (await pagamentosMp()).filter((x) => x.payment_method_id === "master" && pedPro.includes(x.external_reference));
ok(pgs.length === 2 && pgs.every((x) => x.transaction_amount === 39.9 && x.installments === 1 && x._corpo.payer.identification?.number === "12345678909"), "cartão: valor do servidor mesmo com valor errado vindo do navegador, CPF só com números");
await c.screenshot({ path: "saida/pg-cartao-ok.png" });
await B2.browser.close();
await limpar();
process.exit(process.exitCode || 0);
