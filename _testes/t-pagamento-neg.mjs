// Pagamento automático (Mercado Pago) de uma negociação aprovada: o valor esperado é o combinado; o plano liga com os dias,
// perfis e selo combinados (sem o bônus de 30 dias) e a negociação vira "aprovado" com o pedido; se a negociação mudou,
// não ativa. Chama confirmarPagamento direto no emulador (sem as Functions).
// Uso: node t-pagamento-neg.mjs (emulador do Firestore ligado; antes: cd ../functions && npm install && cp ../planos-base.js .)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
// Mesmo firebase-admin das Functions (duas cópias não se misturam numa transação).
import { initializeApp } from "../functions/node_modules/firebase-admin/lib/app/index.js"; import { getFirestore, Timestamp } from "../functions/node_modules/firebase-admin/lib/firestore/index.js";
import { confirmarPagamento, conferirPedido, corpoPix } from "../functions/pagamentos.js";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const uid = "neg-mp-teste", DIA = 864e5;
const limpar = async () => { for (const c of ["planos_pedidos"]) for (const d of (await db.collection(c).where("uid", "==", uid).get()).docs) await d.ref.delete(); await db.doc(`planos/${uid}`).delete(); await db.doc(`planos_negociacoes/${uid}`).delete(); };
await limpar();
await db.doc(`planos_negociacoes/${uid}`).set({ uid, tipo: "apoio", plano: "pro", status: "aguardando_pagamento", planoConcedido: "pro", meses: 3, dias: 90, tipos: ["servicos"], semSelo: true, valorAcordado: 59.85, criadoEm: Timestamp.now() });
const p = { uid, plano: "pro", meses: 3, valor: 59.85, txid: "HFX", status: "pendente", negociacaoId: uid, criadoEm: Timestamp.now() };
ok(conferirPedido(p, uid) === "" && corpoPix("x", p, "a@b.c", "").transaction_amount === 59.85, "pedido da negociação: aceito e cobra o valor combinado (59,85), não a tabela");
const ref = await db.collection("planos_pedidos").add(p);
const pg = (x = {}) => ({ id: 777, external_reference: ref.id, status: "approved", status_detail: "accredited", currency_id: "BRL", transaction_amount: 59.85, payment_method_id: "pix", ...x });
ok(await confirmarPagamento(db, pg({ transaction_amount: 119.7 })) === "valor-diferente", "valor diferente do combinado não ativa");
await db.doc(`planos_negociacoes/${uid}`).update({ status: "recusado" });
ok(await confirmarPagamento(db, pg()) === "negociacao-mudou", "negociação cancelada: pagamento não ativa (fica o alerta para o painel)");
await db.doc(`planos_negociacoes/${uid}`).update({ status: "aguardando_pagamento" });
ok(await confirmarPagamento(db, pg()) === "ativado", "pagamento aprovado ativa");
const pl = (await db.doc(`planos/${uid}`).get()).data(), ng = (await db.doc(`planos_negociacoes/${uid}`).get()).data();
const dias = Math.round((pl.ate.toMillis() - Date.now()) / DIA);
ok(pl.plano === "pro" && dias === 90 && pl.dias === 90 && JSON.stringify(pl.tipos) === '["servicos"]' && pl.semSelo === true && pl.negociacaoId === uid, `plano com o combinado: 90 dias (${dias}), só Freelances, sem selo, sem bônus`);
ok(ng.status === "aprovado" && ng.pedidoId === ref.id, "negociação aprovada com o pedido");
ok(await confirmarPagamento(db, pg()) === "ja-pago", "aviso repetido não ativa de novo");
await limpar();
