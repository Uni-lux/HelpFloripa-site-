// =====================================================
// Cloud Functions do Help Floripa (região São Paulo).
// - pagarPlano (chamada pelo site, com login): cria o pagamento no Mercado Pago para um pedido de plano
//   (planos_pedidos/{id}) por Pix (devolve o QR Code) ou cartão (token do formulário do Mercado Pago).
// - webhookMercadoPago (endereço que o Mercado Pago chama): quando um pagamento muda, consulta a API e, se aprovado,
//   liga o plano sozinho.
// Segredos (Secret Manager, nunca no código): MP_ACCESS_TOKEN e MP_WEBHOOK_SECRET. Passo a passo: _regras/PAGAMENTO-LEIA-ME.md
// =====================================================
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { criarApi, conferirPedido, corpoPix, corpoCartao, confirmarPagamento, assinaturaOk, textoRecusa } from "./pagamentos.js";

initializeApp();
const db = getFirestore();
const REGIAO = "southamerica-east1";
const MP_ACCESS_TOKEN = defineSecret("MP_ACCESS_TOKEN");
const MP_WEBHOOK_SECRET = defineSecret("MP_WEBHOOK_SECRET");
const EMULADOR = process.env.FUNCTIONS_EMULATOR === "true";
// No emulador os testes apontam para um Mercado Pago de mentira (MP_API no .env.local).
const api = () => criarApi({ token: MP_ACCESS_TOKEN.value(), base: (EMULADOR && process.env.MP_API) || "https://api.mercadopago.com" });
const enderecoAviso = () => (EMULADOR ? "" : `https://${REGIAO}-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/webhookMercadoPago`);

export const pagarPlano = onCall({ region: REGIAO, secrets: [MP_ACCESS_TOKEN], maxInstances: 10 }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Entre na sua conta para pagar.");
  const { pedidoId, metodo, cartao, tentativa } = req.data || {};
  if (typeof pedidoId !== "string" || !/^[A-Za-z0-9]{1,40}$/.test(pedidoId)) throw new HttpsError("invalid-argument", "Pedido inválido.");
  if (!["pix", "cartao"].includes(metodo)) throw new HttpsError("invalid-argument", "Forma de pagamento inválida.");
  const ref = db.collection("planos_pedidos").doc(pedidoId);
  const s = await ref.get();
  const p = s.exists ? s.data() : null;
  const erro = conferirPedido(p, req.auth.uid);
  if (erro) throw new HttpsError("failed-precondition", erro);
  if (p.status === "pago") return { status: "approved", jaPago: true };
  const email = req.auth.token.email || p.email;
  if (!email) throw new HttpsError("failed-precondition", "Sua conta precisa de um e-mail para pagar.");
  const mp = api();
  try {
    if (metodo === "pix") {
      const atual = p.mpPix;
      if (atual?.qr && (atual.expira?.toMillis?.() || 0) > Date.now() + 10 * 60e3) return { status: "pending", qr: atual.qr, expira: atual.expira.toMillis() };
      const corpo = corpoPix(pedidoId, p, email, enderecoAviso());
      const pg = await mp("/v1/payments", { metodo: "POST", corpo, chave: `pix-${pedidoId}-${Date.now()}` });
      const qr = pg?.point_of_interaction?.transaction_data?.qr_code;
      if (!qr) throw new Error("O Mercado Pago não devolveu o QR Code.");
      const expira = Date.parse(pg.date_of_expiration || corpo.date_of_expiration) || Date.now() + 864e5;
      await ref.update({ mpPix: { id: String(pg.id), qr, expira: new Date(expira) }, mp: { id: String(pg.id), status: String(pg.status || ""), detalhe: String(pg.status_detail || ""), meio: "pix", em: FieldValue.serverTimestamp() } });
      return { status: "pending", qr, expira };
    }
    const corpo = corpoCartao(pedidoId, p, cartao, email, enderecoAviso());
    if (!corpo) throw new HttpsError("invalid-argument", "Dados do cartão incompletos. Preencha de novo.");
    const chave = `cartao-${pedidoId}-${String(tentativa || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 30) || Date.now()}`;
    const pg = await mp("/v1/payments", { metodo: "POST", corpo, chave });
    const r = await confirmarPagamento(db, pg);
    logger.info("Cartão", { pedidoId, pagamento: pg.id, status: pg.status, detalhe: pg.status_detail, r });
    return { status: pg.status, detalhe: pg.status_detail, ...(pg.status === "rejected" ? { motivo: textoRecusa(pg.status_detail) } : {}) };
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    logger.error("Mercado Pago", { pedidoId, metodo, erro: e.message, status: e.status, mp: e.mp });
    throw new HttpsError("unavailable", "Não foi possível falar com o Mercado Pago agora. Tente de novo em instantes.");
  }
});

export const webhookMercadoPago = onRequest({ region: REGIAO, secrets: [MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET], maxInstances: 10 }, async (req, res) => {
  if (req.method !== "POST") { res.status(405).send("Use POST"); return; }
  const tipo = String(req.query.type || req.query.topic || req.body?.type || "");
  const dataId = String(req.query["data.id"] || req.body?.data?.id || "");
  if (tipo !== "payment" || !/^[0-9A-Za-z]{1,40}$/.test(dataId)) { res.status(200).send("ignorado"); return; }
  const segredo = MP_WEBHOOK_SECRET.value();
  if (!assinaturaOk({ assinatura: req.get("x-signature"), requestId: req.get("x-request-id"), dataId, segredo })) {
    logger.warn("Aviso com assinatura inválida", { dataId });
    res.status(401).send("assinatura inválida"); return;
  }
  try {
    // Nunca confia no corpo do aviso: busca o pagamento na API com o Access Token.
    const pg = await api()(`/v1/payments/${encodeURIComponent(dataId)}`);
    const r = await confirmarPagamento(db, pg);
    logger.info("Aviso do Mercado Pago", { dataId, status: pg.status, pedido: pg.external_reference, r });
    res.status(200).json({ ok: true, r });
  } catch (e) {
    logger.error("Aviso do Mercado Pago falhou", { dataId, erro: e.message, status: e.status });
    // 500 faz o Mercado Pago tentar de novo mais tarde.
    res.status(500).send("erro");
  }
});
