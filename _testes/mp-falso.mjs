// Mercado Pago de mentira para os testes do pagamento automático (porta 5099; o emulador das Functions aponta para cá
// pelo functions/.env.local). Imita só o que as funções usam: criar pagamento (Pix ou cartão) e consultar pagamento.
// Cartão: token "aprovado" → approved, "recusado" → rejected (saldo insuficiente), "analise" → in_process.
// Rotas só do teste: POST /__aprovar/:id (o Pix "caiu"), GET /__pagamentos (tudo o que foi criado).
import http from "node:http";
const TOKEN = "TEST-token-falso";
const pagamentos = new Map(), porChave = new Map();
let seq = 1000;
const json = (res, st, d) => { res.writeHead(st, { "Content-Type": "application/json" }); res.end(JSON.stringify(d)); };
http.createServer((req, res) => {
  let corpo = "";
  req.on("data", (c) => (corpo += c));
  req.on("end", () => {
    const url = new URL(req.url, "http://x");
    if (url.pathname === "/__pagamentos") return json(res, 200, [...pagamentos.values()]);
    const ap = url.pathname.match(/^\/__aprovar\/(\d+)$/);
    if (ap && req.method === "POST") { const p = pagamentos.get(ap[1]); if (!p) return json(res, 404, {}); Object.assign(p, { status: "approved", status_detail: "accredited" }); return json(res, 200, p); }
    if (req.headers.authorization !== `Bearer ${TOKEN}`) return json(res, 401, { message: "invalid access token" });
    if (url.pathname === "/v1/payments" && req.method === "POST") {
      const chave = req.headers["x-idempotency-key"];
      if (!chave) return json(res, 400, { message: "X-Idempotency-Key obrigatório" });
      if (porChave.has(chave)) return json(res, 200, pagamentos.get(porChave.get(chave)));
      const d = JSON.parse(corpo || "{}");
      const id = String(++seq);
      const base = { id: Number(id), currency_id: "BRL", transaction_amount: d.transaction_amount, external_reference: d.external_reference, payment_method_id: d.payment_method_id, description: d.description, payer: d.payer, metadata: d.metadata, installments: d.installments, statement_descriptor: d.statement_descriptor, _corpo: d };
      let p;
      if (d.payment_method_id === "pix") p = { ...base, status: "pending", status_detail: "pending_waiting_transfer", date_of_expiration: d.date_of_expiration, point_of_interaction: { transaction_data: { qr_code: `00020101021226860014br.gov.bcb.pix2564pix.mercadopago.test/qr/${id}5204000053039865802BR6304ABCD`, qr_code_base64: "" } } };
      else if (d.token === "aprovado") p = { ...base, status: "approved", status_detail: "accredited" };
      else if (d.token === "analise") p = { ...base, status: "in_process", status_detail: "pending_contingency" };
      else p = { ...base, status: "rejected", status_detail: "cc_rejected_insufficient_amount" };
      pagamentos.set(id, p); porChave.set(chave, id);
      return json(res, 201, p);
    }
    const g = url.pathname.match(/^\/v1\/payments\/(\d+)$/);
    if (g && req.method === "GET") { const p = pagamentos.get(g[1]); return p ? json(res, 200, p) : json(res, 404, { message: "not found" }); }
    json(res, 404, { message: "rota desconhecida" });
  });
}).listen(5099, "127.0.0.1", () => console.log("mp-falso na porta 5099"));
