// =====================================================
// Cloud Functions do Help Floripa (região São Paulo).
// - pagarPlano (chamada pelo site, com login): cria o pagamento no Mercado Pago para um pedido de plano
//   (planos_pedidos/{id}) por Pix (devolve o QR Code) ou cartão (token do formulário do Mercado Pago).
// - webhookMercadoPago (endereço que o Mercado Pago chama): quando um pagamento muda, consulta a API e, se aprovado,
//   liga o plano sozinho.
// - montarRankingDiario (a cada 15 min) e conferirMensagem (cada mensagem nova): Etapa A, _regras/SERVIDOR-LEIA-ME.md
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

// =====================================================
// Etapa A (nível nacional): Diário montado no servidor + conferências do chat. Tudo isso só roda com o plano Blaze
// (deploy das Functions). Sem ele, o site faz como antes. Passo a passo: _regras/SERVIDOR-LEIA-ME.md
// =====================================================
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { HORAS, MAX_POSTS, CONTAR, entra, preNota, notaServidor, montarListas } from "./diario-ranking.js";
import { novaMedia, passoEspera, conferirPedidoChat } from "./seguranca-chat.js";
import { nivelPlano } from "./planos-base.js";

const msDe = (t) => (t?.toMillis ? t.toMillis() : typeof t === "number" ? t : 0);

// Rodada do ranking (também chamada pelos testes no emulador por montarRankingAgora).
async function rodarRanking(agora = Date.now()) {
  const desde = new Date(agora - HORAS * 3600e3);
  const snap = await db.collection("diario").where("criadoEm", ">=", desde).orderBy("criadoEm", "desc").limit(MAX_POSTS)
    .select("autorId", "autorUf", "autorIbge", "criadoEm", "agendadoPara", "oculto", "removido").get();
  const posts = snap.docs.map((d) => {
    const x = d.data();
    return { id: d.id, autorId: x.autorId, uf: x.autorUf || "", ibge: Number(x.autorIbge) || 0, criadoEm: msDe(x.criadoEm), agendadoPara: msDe(x.agendadoPara), oculto: !!x.oculto, removido: !!x.removido, total: 0, soma: 0, comentarios: 0, vistas: 0 };
  }).filter((p) => entra(p, agora));
  // Estrelas: diario_notas/{id} {total, soma} (de 300 em 300).
  for (let i = 0; i < posts.length; i += 300) {
    const lote = posts.slice(i, i + 300);
    const notas = await db.getAll(...lote.map((p) => db.doc(`diario_notas/${p.id}`)));
    notas.forEach((s, k) => { if (s.exists) { lote[k].total = Number(s.get("total")) || 0; lote[k].soma = Number(s.get("soma")) || 0; } });
  }
  // Alcance e comentários só das mais promissoras (contagem no servidor: 1 leitura a cada 1.000 entradas).
  const promissoras = posts.slice().sort((a, b) => preNota(b, agora) - preNota(a, agora)).slice(0, CONTAR);
  for (let i = 0; i < promissoras.length; i += 40) {
    await Promise.all(promissoras.slice(i, i + 40).map(async (p) => {
      const [v, c] = await Promise.all([
        db.collection(`diario/${p.id}/vistas`).count().get().catch(() => null),
        db.collection("comentarios").where("postId", "==", p.id).count().get().catch(() => null)
      ]);
      p.vistas = v?.data().count || 0; p.comentarios = c?.data().count || 0;
    }));
  }
  posts.forEach((p) => { p.nota = notaServidor({ ...p, horas: (agora - p.criadoEm) / 3600e3 }); });
  const docs = montarListas(posts, agora);
  // Estados que saíram (ninguém publicou nas últimas 48 h) ficam vazios, para o site não usar uma lista velha.
  const antigos = await db.collection("ranking_diario").select("atualizadoEm").get();
  const lote = db.batch();
  Object.entries(docs).forEach(([id, d]) => lote.set(db.doc(`ranking_diario/${id}`), d));
  antigos.docs.filter((d) => !docs[d.id]).forEach((d) => lote.set(d.ref, { itens: [], cidades: {}, total: 0, atualizadoEm: agora, versao: 1 }));
  await lote.commit();
  return { posts: posts.length, contadas: promissoras.length, listas: Object.keys(docs).length };
}

export const montarRankingDiario = onSchedule({ region: REGIAO, schedule: "every 15 minutes", timeZone: "America/Sao_Paulo", memory: "512MiB", timeoutSeconds: 300, maxInstances: 1 }, async () => {
  const r = await rodarRanking();
  logger.info("Ranking do Diário", r);
});

// Só no emulador: roda o ranking na hora (os testes chamam por HTTP).
export const montarRankingAgora = onRequest({ region: REGIAO }, async (req, res) => {
  if (!EMULADOR) { res.status(404).send(""); return; }
  res.json(await rodarRanking(Number(req.query.agora) || Date.now()));
});

// Quem tem negócio (guardado na instância por 10 min).
const temNegocio = new Map();
async function ehNegocio(uid) {
  const x = temNegocio.get(uid);
  if (x && Date.now() - x.em < 600000) return x.v;
  const s = await db.collection("negocios").where("donoId", "==", uid).limit(1).get();
  temNegocio.set(uid, { v: !s.empty, em: Date.now() });
  return !s.empty;
}

// Cada mensagem nova: tempo de resposta do negócio e conferência do pedido.
export const conferirMensagem = onDocumentCreated({ region: REGIAO, document: "conversas/{conv}/mensagens/{msg}", maxInstances: 20 }, async (ev) => {
  const m = ev.data?.data();
  if (!m?.remetenteId) return;
  const conv = ev.params.conv;
  const quando = msDe(m.criadoEm) || Date.now();
  const tarefas = [];
  // 1) Pedido do chat: confere com o negócio de agora e grava o resultado na própria mensagem.
  const p = m.cartao?.pedido;
  if (p && typeof p === "object") {
    tarefas.push((async () => {
      const id = (String(m.cartao.link || "").match(/[?&]negocio=([^&]+)/) || [])[1];
      const n = id ? await db.doc(`negocios/${decodeURIComponent(id)}`).get() : null;
      if (!n?.exists) { await ev.data.ref.update({ conferencia: { ok: false, avisos: ["Negócio não encontrado para conferir os valores."], total: 0, em: Date.now() } }); return; }
      const nd = n.data();
      const plano = nd.donoId ? await db.doc(`planos/${nd.donoId}`).get() : null;
      const r = conferirPedidoChat(p, nd, { agora: quando, temPlano: nivelPlano(plano?.exists ? plano.data() : null) >= 1 });
      await ev.data.ref.update({ conferencia: { ...r, em: Date.now() } });
    })());
  }
  // 2) Tempo de resposta (só conversas de negócio: contexto.tipo diferente de "pessoal").
  tarefas.push((async () => {
    const c = await db.doc(`conversas/${conv}`).get();
    const tipo = c.get("contexto.tipo");
    if (!tipo || tipo === "pessoal") return;
    const de = m.remetenteId, negocio = await ehNegocio(de);
    const refEspera = db.doc(`servidor_atendimento/${conv}`);
    await db.runTransaction(async (t) => {
      const e = await t.get(refEspera);
      const passo = passoEspera(e.exists ? e.data() : null, de, negocio, quando);
      // Transação: todas as leituras antes das gravações.
      const refPerfil = db.doc(`perfis_publicos/${de}`);
      const pf = passo.resposta != null ? await t.get(refPerfil) : null;
      t.set(refEspera, passo.espera || { de: null, desde: 0 });
      if (pf?.exists) t.update(refPerfil, { respostaServ: { ...novaMedia(pf.get("respostaServ"), passo.resposta), em: Date.now() } });
    });
  })());
  // 3) Notificação com o app fechado para a outra pessoa (Etapa B).
  tarefas.push((async () => {
    const c = await db.doc(`conversas/${conv}`).get();
    const para = (c.get("participantes") || []).find((u) => u !== m.remetenteId);
    if (!para) return;
    await avisarPush(para, "mensagem", { nome: await nomeDe(m.remetenteId), mensagem: m, conversa: conv });
  })());
  const r = await Promise.allSettled(tarefas);
  r.filter((x) => x.status === "rejected").forEach((x) => logger.warn("conferirMensagem", x.reason?.message || x.reason));
});

// =====================================================
// Etapa B: notificações com o app fechado (Firebase Cloud Messaging). Passo a passo: _regras/PUSH-LEIA-ME.md
// O site guarda o token do aparelho em usuarios/{uid}.pushTokens e as escolhas em usuarios/{uid}.pushPref (push.js).
// Mensagem só com "data": o sw.js do site desenha a notificação e, ao tocar, abre a página certa.
// No emulador não existe FCM: o aviso vai para push_teste/{auto} (os testes conferem lá).
// =====================================================
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { quer, limite, montarAviso, JANELA, corpoFcm, TOKEN_MORTO } from "./push.js";

const nomes = new Map();
async function nomeDe(uid) {
  const x = nomes.get(uid);
  if (x && Date.now() - x.em < 600000) return x.v;
  const s = await db.doc(`perfis_publicos/${uid}`).get().catch(() => null);
  const v = (s?.exists && s.get("nome")) || "Alguém";
  nomes.set(uid, { v, em: Date.now() });
  return v;
}

// Manda o aviso para todos os aparelhos da pessoa (respeitando o que ela escolheu e o limite de repetição).
async function avisarPush(uid, tipo, dados) {
  const aviso = montarAviso(tipo, dados);
  if (!aviso || !uid) return null;
  const ref = db.doc(`usuarios/${uid}`);
  const u = await ref.get();
  if (!u.exists) return null;
  const pref = u.get("pushPref") || null;
  if (!aviso.forcar && !quer(pref, aviso.categoria)) return null;
  // Bloqueio entre as duas pessoas (bloqueios/{quem}_{quem}): não avisa.
  if (dados.uid) {
    const [b1, b2] = await db.getAll(db.doc(`bloqueios/${uid}_${dados.uid}`), db.doc(`bloqueios/${dados.uid}_${uid}`));
    if (b1.exists || b2.exists) return null;
  }
  const tokens = (u.get("pushTokens") || []).map((x) => x?.t).filter((t) => typeof t === "string" && t.length > 20).slice(0, 5);
  if (!tokens.length) return null;
  if (JANELA[tipo]) {
    const refE = db.doc(`push_estado/${uid}`);
    const ok = await db.runTransaction(async (t) => {
      const e = await t.get(refE);
      const r = limite(e.exists ? e.get("ultimo") : {}, aviso.tag || tipo, Date.now(), JANELA[tipo]);
      if (r.pode) t.set(refE, { ultimo: r.estado });
      return r.pode;
    });
    if (!ok) return null;
  }
  const corpo = corpoFcm(tokens, aviso);
  if (EMULADOR) { await db.collection("push_teste").add({ uid, tipo, ...corpo, em: Date.now() }); return { enviados: tokens.length }; }
  const res = await getMessaging().sendEachForMulticast(corpo);
  // Tira os aparelhos que não recebem mais (desinstalou, tirou a permissão).
  const mortos = res.responses.map((x, i) => (!x.success && TOKEN_MORTO.test(String(x.error?.code || "")) ? tokens[i] : null)).filter(Boolean);
  if (mortos.length) await ref.update({ pushTokens: (u.get("pushTokens") || []).filter((x) => !mortos.includes(x?.t)) }).catch(() => {});
  return { enviados: res.successCount, falhas: res.failureCount };
}

const OPC = { region: REGIAO, maxInstances: 20 };
const tarefa = (nome, f) => async (ev) => { try { await f(ev); } catch (e) { logger.warn(nome, e?.message || e); } };

// Ligação tocando (e perdida, se ninguém atendeu).
export const pushChamada = onDocumentCreated({ ...OPC, document: "chamadas/{id}" }, tarefa("pushChamada", async (ev) => {
  const c = ev.data?.data();
  if (!c || c.status !== "chamando" || !c.para) return;
  await avisarPush(c.para, "chamada", { nome: await nomeDe(c.de), modo: c.tipo, conversa: c.conv, id: ev.params.id, uid: c.de });
}));
export const pushChamadaPerdida = onDocumentUpdated({ ...OPC, document: "chamadas/{id}" }, tarefa("pushChamadaPerdida", async (ev) => {
  const a = ev.data?.before.data(), d = ev.data?.after.data();
  if (!a || !d || a.status !== "chamando" || !["perdida", "cancelada"].includes(d.status)) return;
  await avisarPush(d.para, "chamada_perdida", { nome: await nomeDe(d.de), modo: d.tipo, conversa: d.conv, id: ev.params.id, uid: d.de });
}));
export const pushSeguidor = onDocumentCreated({ ...OPC, document: "relacoes/{id}" }, tarefa("pushSeguidor", async (ev) => {
  const r = ev.data?.data();
  if (r?.tipo !== "seguir" || !r.alvoId || r.alvoId === r.seguidorId) return;
  await avisarPush(r.alvoId, "seguidor", { nome: await nomeDe(r.seguidorId), uid: r.seguidorId });
}));
export const pushEstrelas = onDocumentCreated({ ...OPC, document: "curtidas/{id}" }, tarefa("pushEstrelas", async (ev) => {
  const c = ev.data?.data();
  if (!c?.postAutorId || c.postAutorId === c.uid || !(Number(c.nota) > 0)) return;
  await avisarPush(c.postAutorId, "curtida", { nome: await nomeDe(c.uid), nota: Number(c.nota), postId: c.postId, uid: c.uid });
}));
export const pushComentario = onDocumentCreated({ ...OPC, document: "comentarios/{id}" }, tarefa("pushComentario", async (ev) => {
  const c = ev.data?.data();
  if (!c?.autorId) return;
  const nome = c.nome || await nomeDe(c.autorId);
  const feitos = [];
  if (c.respostaAutorId && c.respostaAutorId !== c.autorId) { feitos.push(c.respostaAutorId); await avisarPush(c.respostaAutorId, "resposta", { nome, texto: c.texto, postId: c.postId, uid: c.autorId }); }
  if (c.postAutorId && c.postAutorId !== c.autorId && !feitos.includes(c.postAutorId)) await avisarPush(c.postAutorId, "comentario", { nome, texto: c.texto, postId: c.postId, uid: c.autorId });
}));
export const pushMarcacao = onDocumentCreated({ ...OPC, document: "diario/{id}" }, tarefa("pushMarcacao", async (ev) => {
  const p = ev.data?.data();
  const marcados = Array.isArray(p?.marcados) ? p.marcados.slice(0, 10) : [];
  if (!marcados.length || (p.agendadoPara && p.agendadoPara.toMillis?.() > Date.now())) return;
  const nome = p.nome || await nomeDe(p.autorId);
  await Promise.all(marcados.filter((u) => u !== p.autorId).map((u) => avisarPush(u, "marcacao", { nome, postId: ev.params.id, uid: p.autorId })));
}));
export const pushSocial = onDocumentCreated({ ...OPC, document: "vinculos/{id}" }, tarefa("pushSocial", async (ev) => {
  const v = ev.data?.data();
  if (!v?.para || v.status === "aceito") return;
  await avisarPush(v.para, "social", { nome: await nomeDe(v.de), uid: v.de });
}));
export const pushAvisoEquipe = onDocumentCreated({ ...OPC, document: "avisos/{id}" }, tarefa("pushAvisoEquipe", async (ev) => {
  const a = ev.data?.data();
  if (!a?.uid) return;
  await avisarPush(a.uid, "aviso", { id: ev.params.id, titulo: a.titulo, texto: a.texto });
}));
export const pushSuporte = onDocumentCreated({ ...OPC, document: "suporte/{id}/mensagens/{msg}" }, tarefa("pushSuporte", async (ev) => {
  const m = ev.data?.data();
  if (!m?.equipe) return;
  const ch = await db.doc(`suporte/${ev.params.id}`).get();
  if (ch.exists && ch.get("uid")) await avisarPush(ch.get("uid"), "suporte", { id: ev.params.id, texto: m.texto });
}));

// "Enviar um teste" das Configurações: manda para os aparelhos da própria pessoa.
export const pushTeste = onCall({ region: REGIAO, maxInstances: 5 }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Entre na sua conta.");
  const r = await avisarPush(req.auth.uid, "teste", {});
  if (!r) throw new HttpsError("failed-precondition", "Nenhum aparelho com as notificações ligadas.");
  return r;
});

// =====================================================
// Etapa C: TURN das ligações (Cloudflare Realtime TURN). Passo a passo: _regras/TURN-LEIA-ME.md
// =====================================================
import { TTL, urlCloudflare, lerServidores, limiteDia } from "./turn.js";
const CF_TURN_KEY_ID = defineSecret("CF_TURN_KEY_ID");
const CF_TURN_TOKEN = defineSecret("CF_TURN_TOKEN");

export const credenciaisTurn = onCall({ region: REGIAO, secrets: [CF_TURN_KEY_ID, CF_TURN_TOKEN], maxInstances: 10 }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Entre na sua conta para ligar.");
  // Limite por pessoa e por dia (o site guarda a credencial por 4 h: uma ligação atrás da outra não pede de novo).
  const hoje = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  const ref = db.doc(`turn_uso/${req.auth.uid}`);
  const pode = await db.runTransaction(async (t) => {
    const e = await t.get(ref);
    const r = limiteDia(e.exists ? e.data() : null, hoje);
    t.set(ref, r.estado);
    return r.pode;
  });
  if (!pode) throw new HttpsError("resource-exhausted", "Muitas ligações hoje. Tente amanhã.");
  const base = (EMULADOR && process.env.TURN_API) || "https://rtc.live.cloudflare.com";
  const res = await fetch(urlCloudflare(base, CF_TURN_KEY_ID.value()), {
    method: "POST",
    headers: { Authorization: `Bearer ${CF_TURN_TOKEN.value()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ttl: TTL })
  });
  if (!res.ok) { logger.warn("TURN: Cloudflare respondeu", res.status); throw new HttpsError("unavailable", "Serviço de ligação indisponível agora."); }
  const iceServers = lerServidores(await res.json());
  if (!iceServers.length) throw new HttpsError("unavailable", "Serviço de ligação indisponível agora.");
  return { iceServers, ate: Date.now() + (TTL - 600) * 1000 };
});

// =====================================================
// Etapa D: passar as fotos antigas (data:image dentro dos documentos) para o Storage. Só os donos, pelo painel
// (Publicações › "Passar fotos para o Storage"), em lotes: cada chamada lê até `lote` documentos de uma coleção e
// devolve `proximo` para continuar. simular: true só conta. Passo a passo: _regras/STORAGE-LEIA-ME.md
// =====================================================
import { getStorage } from "firebase-admin/storage";
import { randomUUID } from "node:crypto";
import { COLECOES, fotosDoDoc, documentoNovo, lerData, linkDoStorage } from "./migrar-fotos.js";

async function ehDono(uid) {
  const a = await db.doc(`admins/${uid}`).get();
  return a.exists && (a.get("papel") || "dono") === "dono";
}
async function subir(bucket, pasta, valor) {
  const x = lerData(valor);
  if (!x) return null;
  const caminho = `${pasta}.${x.ext}`, token = randomUUID();
  await bucket.file(caminho).save(x.bytes, { contentType: x.tipo, resumable: false, metadata: { cacheControl: "public, max-age=31536000, immutable", metadata: { firebaseStorageDownloadTokens: token, migradoDe: "documento" } } });
  const base = EMULADOR && process.env.FIREBASE_STORAGE_EMULATOR_HOST ? `http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST}` : "https://firebasestorage.googleapis.com";
  return { link: linkDoStorage(base, bucket.name, caminho, token), bytes: x.bytes.length };
}

export const migrarFotos = onCall({ region: REGIAO, memory: "1GiB", timeoutSeconds: 300, maxInstances: 2 }, async (req) => {
  if (!req.auth || !(await ehDono(req.auth.uid))) throw new HttpsError("permission-denied", "Só os donos do site.");
  const { colecao, depois = null, simular = true } = req.data || {};
  const lote = Math.min(Math.max(Number(req.data?.lote) || 25, 1), 60);
  if (!COLECOES.includes(colecao)) throw new HttpsError("invalid-argument", "Coleção inválida.");
  if (depois != null && (typeof depois !== "string" || depois.length > 200)) throw new HttpsError("invalid-argument", "Continuação inválida.");
  let q = db.collection(colecao).orderBy("__name__").limit(lote);
  if (depois) q = q.startAfter(depois);
  const snap = await q.get();
  const bucket = getStorage().bucket();
  const r = { colecao, lidos: snap.size, comFotos: 0, fotos: 0, bytes: 0, trocados: 0, mudaram: 0, erros: 0, proximo: snap.size === lote ? snap.docs.at(-1).id : null };
  for (const s of snap.docs) {
    const d = s.data();
    const fotos = fotosDoDoc(colecao, s.id, d);
    if (!fotos.length) continue;
    r.comFotos++;
    const unicas = [...new Map(fotos.map((f) => [f.valor, f])).values()];
    r.fotos += unicas.length;
    if (simular) { r.bytes += unicas.reduce((t, f) => t + Math.round(f.valor.length * 0.75), 0); continue; }
    try {
      const links = new Map();
      for (const f of unicas) { const up = await subir(bucket, f.pasta, f.valor); if (up) { links.set(f.valor, up.link); r.bytes += up.bytes; } }
      const novo = documentoNovo(d, fotos, links);
      // Só troca se o documento não mudou desde a leitura (a pessoa pode ter editado no meio): senão fica para a próxima.
      try { await s.ref.update(novo, { lastUpdateTime: s.updateTime }); r.trocados++; }
      catch (e) { if (/FAILED_PRECONDITION|precondition/i.test(String(e?.message || e?.code))) r.mudaram++; else throw e; }
      // O perfil público repete a foto da conta: troca junto pelo mesmo link (sem enviar de novo).
      if (colecao === "usuarios") {
        const pp = await db.doc(`perfis_publicos/${s.id}`).get();
        if (pp.exists) {
          const fp = fotosDoDoc("perfis_publicos", s.id, pp.data()).filter((f) => links.has(f.valor));
          if (fp.length) await pp.ref.update(documentoNovo(pp.data(), fp, links), { lastUpdateTime: pp.updateTime }).catch(() => {});
        }
      }
    } catch (e) { r.erros++; logger.warn("migrarFotos", colecao, s.id, e?.message || e); }
  }
  return r;
});

// =====================================================
// Apagar conta pelo painel (só os donos do site): a mesma limpeza da exclusão automática de 30 dias
// (scripts/limpeza/limpeza-conta.mjs, copiado para cá no predeploy). Não apaga a própria conta nem a de alguém da equipe.
// =====================================================
import { getAuth } from "firebase-admin/auth";
import { criarLimpeza } from "./limpeza-conta.mjs";

export const apagarConta = onCall({ region: REGIAO, memory: "512MiB", timeoutSeconds: 300, maxInstances: 2 }, async (req) => {
  if (!req.auth || !(await ehDono(req.auth.uid))) throw new HttpsError("permission-denied", "Só os donos do site apagam contas.");
  const { uid, motivo = "" } = req.data || {};
  if (typeof uid !== "string" || !/^[A-Za-z0-9]{20,40}$/.test(uid)) throw new HttpsError("invalid-argument", "Conta inválida.");
  if (uid === req.auth.uid) throw new HttpsError("failed-precondition", "Você não pode apagar a sua própria conta por aqui.");
  if ((await db.doc(`admins/${uid}`).get()).exists) throw new HttpsError("failed-precondition", "Tire a pessoa da equipe antes de apagar a conta.");
  const u = await db.doc(`usuarios/${uid}`).get();
  const antes = { nome: u.get("nome") || "", email: u.get("email") || "" };
  const { limpar } = criarLimpeza({ db, auth: getAuth(), FieldValue, pegarBucket: async () => getStorage().bucket() });
  const r = await limpar(uid);
  const quem = await db.doc(`usuarios/${req.auth.uid}`).get();
  await db.collection("admin_log").add({ acao: "apagar_conta", alvo: uid, detalhe: `${antes.nome || "sem nome"}${antes.email ? " · " + antes.email : ""}${motivo ? " · " + String(motivo).slice(0, 200) : ""}`, por: req.auth.uid, porNome: quem.get("nome") || "", em: FieldValue.serverTimestamp() });
  return { ok: true, resumo: r };
});
