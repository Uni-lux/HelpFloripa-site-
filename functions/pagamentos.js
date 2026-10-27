// =====================================================
// Pagamento automático dos planos pelo Mercado Pago (Pix com QR Code e cartão de crédito/débito).
// - O preço sai do planos-base.js (o mesmo arquivo do site, copiado aqui na hora de publicar): o servidor NUNCA usa o
//   valor que vem do navegador.
// - Todo pagamento leva external_reference = id do pedido (planos_pedidos/{id}).
// - O plano só liga quando a API do Mercado Pago (consultada com o Access Token) diz "approved" e o valor confere.
//   O aviso (webhook) só serve para avisar que algo mudou: o servidor sempre confere o pagamento na API.
// - A ativação faz o mesmo que o botão "Confirmar pagamento e ativar" do painel: pedido pago, planos/{uid} com a data
//   final (soma ao plano atual ou converte os dias de outro plano), +30 dias na primeira assinatura, aviso e registro.
// =====================================================
import crypto from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { PLANOS, valorPeriodo, nivelPlano, creditoDias, DIAS_BONUS, nomePlano } from "./planos-base.js";

const DIA = 864e5;
const ms = (t) => t?.toMillis?.() ?? (t?.seconds ? t.seconds * 1000 : typeof t === "number" ? t : 0);
const reais = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const nMeses = (m) => (m === 1 ? "1 mês" : `${m} meses`);
const dataBR = (t) => new Date(t).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
export const QUEM = "mercadopago";
export const NOME_QUEM = "Mercado Pago (automático)";

// ---------- API do Mercado Pago ----------
export function criarApi({ token, base = "https://api.mercadopago.com", buscar = fetch }) {
  return async function api(caminho, { metodo = "GET", corpo, chave } = {}) {
    const r = await buscar(base + caminho, {
      method: metodo,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(chave ? { "X-Idempotency-Key": chave } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined
    });
    const dados = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(dados?.message || `Mercado Pago respondeu ${r.status}`); e.status = r.status; e.mp = dados; throw e; }
    return dados;
  };
}

// ---------- pedido válido para pagar ----------
export function conferirPedido(p, uid) {
  if (!p) return "Pedido não encontrado.";
  if (p.uid !== uid) return "Este pedido é de outra conta.";
  if (!PLANOS[p.plano] || ![1, 3, 6, 12].includes(p.meses)) return "Pedido com plano ou período inválido.";
  if (p.status !== "pendente") return p.status === "pago" ? "" : "Este pedido foi cancelado. Escolha o plano de novo.";
  return "";
}
const descricao = (p) => `Help Floripa - Plano ${nomePlano(p.plano)} (${nMeses(p.meses)})`;
const extras = (pedidoId, p, notificacao) => ({
  external_reference: pedidoId,
  metadata: { pedido_id: pedidoId, uid: p.uid, plano: p.plano, meses: p.meses },
  ...(notificacao ? { notification_url: notificacao } : {})
});

// Pix: QR Code e "copia e cola" do próprio Mercado Pago (vale 24 h). Reaproveita o do pedido se ainda vale por 10 min.
export function corpoPix(pedidoId, p, email, notificacao, agora = Date.now()) {
  return {
    transaction_amount: valorPeriodo(p.plano, p.meses),
    description: descricao(p),
    payment_method_id: "pix",
    payer: { email },
    date_of_expiration: new Date(agora + DIA).toISOString().replace("Z", "-00:00"),
    ...extras(pedidoId, p, notificacao)
  };
}
// Cartão: os dados vêm do formulário do Mercado Pago (Card Payment Brick), que troca o número do cartão por um token.
// O site nunca vê o número do cartão. À vista (1 parcela).
export function corpoCartao(pedidoId, p, f, email, notificacao) {
  const txt = (v, n) => (typeof v === "string" && v.length > 0 && v.length <= n ? v : "");
  const token = txt(f?.token, 200), meio = txt(f?.payment_method_id, 40);
  if (!token || !meio) return null;
  const id = f?.payer?.identification;
  return {
    transaction_amount: valorPeriodo(p.plano, p.meses),
    token,
    description: descricao(p),
    installments: 1,
    payment_method_id: meio,
    ...(f.issuer_id ? { issuer_id: String(f.issuer_id).slice(0, 20) } : {}),
    payer: { email: txt(f?.payer?.email, 120) || email, ...(id?.type && id?.number ? { identification: { type: String(id.type).slice(0, 10), number: String(id.number).replace(/\D/g, "").slice(0, 20) } } : {}) },
    statement_descriptor: "HELPFLORIPA",
    ...extras(pedidoId, p, notificacao)
  };
}

// Motivo de recusa do cartão em português (status_detail do Mercado Pago).
const RECUSAS = {
  cc_rejected_insufficient_amount: "Saldo ou limite insuficiente.",
  cc_rejected_bad_filled_security_code: "Código de segurança (CVV) incorreto.",
  cc_rejected_bad_filled_date: "Data de validade incorreta.",
  cc_rejected_bad_filled_card_number: "Número do cartão incorreto.",
  cc_rejected_bad_filled_other: "Confira os dados do cartão.",
  cc_rejected_call_for_authorize: "O banco pediu autorização: ligue para o seu banco e tente de novo.",
  cc_rejected_card_disabled: "Cartão bloqueado ou não ativado. Fale com o seu banco.",
  cc_rejected_duplicated_payment: "Você já fez um pagamento igual agora há pouco.",
  cc_rejected_high_risk: "O pagamento foi recusado pela análise de segurança. Tente o Pix ou outro cartão.",
  cc_rejected_max_attempts: "Muitas tentativas. Tente outro cartão ou o Pix.",
  cc_rejected_blacklist: "Não foi possível pagar com este cartão. Tente o Pix.",
  cc_rejected_other_reason: "O banco recusou o pagamento. Tente outro cartão ou o Pix."
};
export const textoRecusa = (det) => RECUSAS[det] || "O pagamento não foi aprovado. Confira os dados ou tente o Pix.";

// ---------- assinatura do aviso (webhook) ----------
// x-signature: "ts=...,v1=..."; conteúdo assinado: "id:{data.id};request-id:{x-request-id};ts:{ts};" (HMAC-SHA256).
export function assinaturaOk({ assinatura, requestId, dataId, segredo }) {
  if (!segredo) return true;
  const partes = Object.fromEntries(String(assinatura || "").split(",").map((x) => x.trim().split("=")).filter((x) => x.length === 2));
  if (!partes.ts || !partes.v1) return false;
  const id = /^[a-z0-9]+$/i.test(String(dataId)) ? String(dataId).toLowerCase() : String(dataId);
  const manifesto = `${dataId ? `id:${id};` : ""}${requestId ? `request-id:${requestId};` : ""}ts:${partes.ts};`;
  const certo = crypto.createHmac("sha256", segredo).update(manifesto).digest("hex");
  const a = Buffer.from(certo), b = Buffer.from(String(partes.v1));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---------- data final do plano (igual ao painel) ----------
export function fimDoPlano(atual, plano, meses, bonus, agora = Date.now()) {
  const mesmo = nivelPlano(atual) && atual.plano === plano;
  const base = mesmo ? Math.max(agora, ms(atual.ate)) : agora + creditoDias(atual, plano) * DIA;
  return base + (meses * 30 + bonus) * DIA;
}

// ---------- confirmar um pagamento consultado na API ----------
// Devolve "ativado", "ja-pago", "sem-pedido", "valor-diferente" ou o status do Mercado Pago (pending, rejected...).
export async function confirmarPagamento(db, pg) {
  const pedidoId = String(pg?.external_reference || "");
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(pedidoId)) return "sem-pedido";
  const refPed = db.collection("planos_pedidos").doc(pedidoId);
  return db.runTransaction(async (tx) => {
    const sp = await tx.get(refPed);
    if (!sp.exists) return "sem-pedido";
    const p = sp.data();
    if (p.status === "pago") return "ja-pago";
    const situacao = { id: String(pg.id), status: String(pg.status || ""), detalhe: String(pg.status_detail || ""), meio: String(pg.payment_method_id || ""), em: FieldValue.serverTimestamp() };
    if (pg.status !== "approved") { tx.update(refPed, { mp: situacao }); return String(pg.status || "desconhecido"); }
    const esperado = valorPeriodo(p.plano, p.meses);
    if (pg.currency_id !== "BRL" || Math.abs(Number(pg.transaction_amount) - esperado) > 0.009) {
      tx.update(refPed, { mp: { ...situacao, alerta: `Valor pago ${pg.transaction_amount} ${pg.currency_id}, esperado ${esperado}` } });
      return "valor-diferente";
    }
    const uid = p.uid, k = p.plano;
    const refPlano = db.collection("planos").doc(uid);
    const [spl, pagos, neg] = await Promise.all([
      tx.get(refPlano),
      tx.get(db.collection("planos_pedidos").where("uid", "==", uid).where("status", "==", "pago").limit(1)),
      tx.get(db.collection("planos_negociacoes").doc(uid))
    ]);
    const atual = spl.exists ? spl.data() : null;
    const primeira = pagos.empty && neg.data()?.status !== "aprovado" && !atual?.pedidoId && !atual?.negociacaoId;
    const bonus = primeira ? DIAS_BONUS : 0;
    const ate = fimDoPlano(atual, k, p.meses, bonus);
    const pix = pg.payment_method_id === "pix";
    tx.update(refPed, { status: "pago", decididoPor: QUEM, decididoEm: FieldValue.serverTimestamp(), mp: situacao, metodo: pix ? "pix" : "cartao" });
    tx.set(refPlano, { plano: k, ate: Timestamp.fromMillis(ate), meses: p.meses, pedidoId, ativadoEm: FieldValue.serverTimestamp(), ativadoPor: QUEM });
    tx.create(db.collection("avisos").doc(), {
      uid, tipo: "info", por: QUEM, em: FieldValue.serverTimestamp(), lidoEm: null,
      titulo: `Seu plano ${nomePlano(k)} está ativo`,
      texto: `Recebemos o seu pagamento de ${reais(esperado)} (${pix ? "Pix" : "cartão"}).${bonus ? ` Como é a sua primeira assinatura, você ganhou mais ${bonus} dias grátis.` : ""} O plano ${nomePlano(k)} vale até ${dataBR(ate)} para todos os seus negócios. Obrigado!`
    });
    tx.create(db.collection("admin_log").doc(), {
      acao: "plano_ativar", alvo: uid, ref: "planos_pedidos:" + pedidoId, por: QUEM, porNome: NOME_QUEM, em: FieldValue.serverTimestamp(),
      detalhe: `${nomePlano(k)} · ${nMeses(p.meses)}${bonus ? ` + ${bonus} dias grátis` : ""} · ${reais(esperado)} · ${pix ? "Pix" : "cartão"} automático (Mercado Pago ${pg.id}) · até ${dataBR(ate)}`
    });
    return "ativado";
  });
}
