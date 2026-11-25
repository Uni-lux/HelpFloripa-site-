// =====================================================
// Entregas e corridas pelo servidor (25/11/2026).
// As regras do Firestore delas não cabiam no limite de tamanho do Firebase: agora o aparelho chama a função
// "corrida" com uma ação e é AQUI que tudo é conferido (quem pode, em que etapa, PIN, valores). As regras só deixam
// ler (quem faz parte) e gravar a posição ao vivo de quem leva; o resto é "só o servidor".
// Ações: criar, oferta, raio, cancelar, aceitar, desistir, etapa (com PIN: 5 erros = espera 10 min), avaliar,
// avaliarCliente. Pagamento continua direto entre as pessoas: o site não cobra nem recebe.
// =====================================================
import { HttpsError } from "firebase-functions/v2/https";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { randomInt } from "node:crypto";
import { MODALIDADES, geohash, valorSugerido, pinEm, VALOR_MIN, VALOR_MAX, RAIOS, ELOGIOS, MOTIVOS_CANCELAR } from "./corridas-base.js";

export const ATIVAS = ["aceita", "chegou", "em_rota"];
const PAGAMENTOS = ["pix", "dinheiro", "cartao"];
const TAMANHOS = ["P", "M", "G", "GG"];
export const MAX_ABERTOS = 3; // pedidos ao mesmo tempo (procurando ou em andamento) por pessoa
export const PIN_ERROS = 5, PIN_ESPERA_MIN = 10;

const erro = (codigo, texto) => new HttpsError(codigo, texto);
const txt = (v, n) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);
const idOk = (v) => typeof v === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(v);
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : NaN);
const noBrasil = (p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.lat >= -34 && p.lat <= 6 && p.lng >= -75 && p.lng <= -28;
const r2 = (v) => Math.round(Number(v) * 100) / 100;
const ms = (t) => (t?.toMillis ? t.toMillis() : 0);
const par = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);

export function pontoExato(p) {
  if (!p || typeof p !== "object") return null;
  const q = { lat: num(p.lat), lng: num(p.lng), nome: txt(p.nome, 120), sub: txt(p.sub, 160) };
  return noBrasil(q) ? q : null;
}
// Só a região (uns 500 m) fica à vista dos entregadores (igual ao aproximar do entregas-comum.js).
export function aproximar(p) {
  const partes = String(p?.sub || "").split("·").map((s) => s.trim()).filter(Boolean);
  return { lat: r2(p.lat), lng: r2(p.lng), nome: partes[0] ? `Região de ${partes[0]}`.slice(0, 120) : "Região aproximada", sub: partes.slice(1).join(" · ").slice(0, 160) };
}

// ---------- quem pode ----------
async function contaLiberada(db, auth) {
  if (!auth) throw erro("unauthenticated", "Entre na sua conta.");
  if (auth.token?.email_verified !== true) throw erro("permission-denied", "Confirme seu e-mail para usar entregas e corridas.");
  const [s, b] = await Promise.all([db.doc(`sancoes/${auth.uid}`).get(), db.doc(`programa_banidos/${auth.uid}_entregas`).get()]);
  const agora = Date.now();
  if (s.exists && (s.get("tipo") === "banimento" || ms(s.get("ate")) > agora)) throw erro("permission-denied", "Sua conta está com uma restrição no momento.");
  if (b.exists && (!b.get("ate") || ms(b.get("ate")) > agora)) throw erro("permission-denied", "Você não pode usar entregas e corridas no momento.");
}
async function bloqueioEntre(db, a, b) {
  const [x, y] = await Promise.all([db.doc(`bloqueios/${a}_${b}`).get(), db.doc(`bloqueios/${b}_${a}`).get()]);
  return x.exists || y.exists;
}
async function entregadorAtivo(db, uid) {
  const e = await db.doc(`entregadores/${uid}`).get();
  return e.exists && e.get("status") === "ativo" ? e.data() : null;
}

// ---------- criar ----------
// Confere o pedido e devolve { doc, rota, contato } prontos para gravar (sem ler nada: testável).
export function montarPedido(d, uid, nome) {
  const m = MODALIDADES[d?.modalidade];
  if (!m) throw erro("invalid-argument", "Escolha o veículo.");
  const origem = pontoExato(d.origem), destino = pontoExato(d.destino);
  if (!origem || !destino) throw erro("invalid-argument", "Escolha a saída e o destino (dentro do Brasil).");
  const km = num(d.km), min = num(d.min), valor = Math.round(num(d.valor) * 100) / 100;
  if (!(km >= 0 && km <= 400) || !(min >= 0 && min <= 900)) throw erro("invalid-argument", "Distância inválida.");
  if (km > m.maxKm) throw erro("invalid-argument", `${m.nome}: até ${m.maxKm} km.`);
  if (!(valor >= VALOR_MIN && valor <= VALOR_MAX)) throw erro("invalid-argument", "Valor fora do permitido.");
  const presente = !!d.presenteId;
  if (!presente && !PAGAMENTOS.includes(d.pagamento)) throw erro("invalid-argument", "Escolha como vai pagar.");
  let pacote = null;
  if (m.servico === "entrega") {
    const oque = txt(d.pacote?.oque, 80);
    if (oque.length < 2) throw erro("invalid-argument", "Diga o que vai na entrega.");
    if (!TAMANHOS.includes(d.pacote?.tamanho)) throw erro("invalid-argument", "Escolha o tamanho da encomenda.");
    pacote = { tamanho: d.pacote.tamanho, oque };
  }
  const paraId = idOk(d.paraId) ? d.paraId : "", destinatarioId = idOk(d.destinatarioId) ? d.destinatarioId : "";
  if (paraId === uid || destinatarioId === uid) throw erro("invalid-argument", "Você não pode ser quem leva nem quem recebe o seu pedido.");
  const doc = {
    servico: m.servico, modalidade: d.modalidade, veiculo: m.veiculo,
    clienteId: uid, clienteNome: txt(nome, 80),
    origem: aproximar(origem), destino: aproximar(destino),
    km: Math.round(km * 10) / 10, min: Math.round(min), valor, valorSugerido: valorSugerido(d.modalidade, km, min),
    pagamento: presente ? "presente" : d.pagamento, pacote, status: "procurando",
    paraId, destinatarioId,
    geo4: geohash(origem.lat, origem.lng, 4), geo5: geohash(origem.lat, origem.lng, 5),
    raioKm: paraId ? 40 : RAIOS[0], pinEm: pinEm(m.servico)
  };
  const c = d.contato || {};
  const contato = { nome: txt(c.nome, 80), telefone: txt(c.telefone, 20), obs: txt(c.obs, 300) };
  return { doc, rota: { origem, destino }, contato };
}

async function criar(db, auth, d) {
  await contaLiberada(db, auth);
  const uid = auth.uid;
  const u = await db.doc(`usuarios/${uid}`).get();
  const { doc, rota, contato } = montarPedido(d, uid, u.get("nome") || "");
  // Anti-spam: no máximo 3 pedidos abertos ao mesmo tempo.
  const abertos = await db.collection("corridas").where("clienteId", "==", uid).where("status", "in", ["procurando", ...ATIVAS]).limit(MAX_ABERTOS + 1).get();
  if (abertos.size >= MAX_ABERTOS) throw erro("resource-exhausted", `Você já tem ${MAX_ABERTOS} pedidos abertos. Termine ou cancele um antes.`);
  if (doc.paraId) {
    const e = await entregadorAtivo(db, doc.paraId);
    if (!e) throw erro("failed-precondition", "Essa pessoa não está fazendo entregas agora.");
    if (e.veiculo !== doc.veiculo || !(e.servicos || []).includes(doc.servico)) throw erro("failed-precondition", "Essa pessoa não faz esse tipo de pedido.");
    if (await bloqueioEntre(db, uid, doc.paraId)) throw erro("permission-denied", "Não é possível chamar essa pessoa.");
  }
  // Quem recebe: só alguém com quem você já conversa (conversa aceita e sem bloqueio).
  if (doc.destinatarioId) {
    const conv = await db.doc(`conversas/${par(uid, doc.destinatarioId)}`).get();
    const pd = conv.exists ? conv.get("pedido") : null;
    if (!conv.exists || (pd && pd.status !== "aceito") || await bloqueioEntre(db, uid, doc.destinatarioId))
      throw erro("permission-denied", "A entrega só vai para quem já conversa com você (conversa aceita e sem bloqueio).");
  }
  const ref = db.collection("corridas").doc();
  const pin = String(randomInt(0, 10000)).padStart(4, "0");
  const agora = FieldValue.serverTimestamp();
  await db.runTransaction(async (tx) => {
    if (d.presenteId) {
      if (!idOk(d.presenteId)) throw erro("invalid-argument", "Presente inválido.");
      const pr = db.doc(`presentes/${d.presenteId}`), p = (await tx.get(pr)).data();
      if (!p || p.para !== uid || p.status !== "aceito" || p.tipo !== doc.servico) throw erro("failed-precondition", "Esse presente não pode ser usado aqui.");
      if (doc.valor > Number(p.valor || 0)) throw erro("invalid-argument", "O valor passou do valor do presente.");
      doc.presenteId = d.presenteId; doc.pagadorId = p.de;
      tx.update(pr, { status: "usado", corridaId: ref.id, usadoEm: agora, atualizadoEm: agora });
    }
    tx.set(ref, { ...doc, criadoEm: agora, atualizadoEm: agora });
    tx.set(ref.collection("privado").doc("pin"), { pin, erros: 0 });
    tx.set(ref.collection("privado").doc("rota"), rota);
    tx.set(ref.collection("privado").doc("contato"), contato);
  });
  return { id: ref.id };
}

// ---------- mudanças num pedido (sempre por transação) ----------
async function mudar(db, id, fn) {
  if (!idOk(id)) throw erro("invalid-argument", "Pedido inválido.");
  const ref = db.doc(`corridas/${id}`);
  return db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    if (!s.exists) throw erro("not-found", "Pedido não encontrado.");
    return fn(tx, ref, s.data());
  });
}
const agoraTs = () => FieldValue.serverTimestamp();

async function oferta(db, auth, d) {
  return mudar(db, d.id, (tx, ref, c) => {
    if (c.clienteId !== auth.uid) throw erro("permission-denied", "Só quem pediu muda a oferta.");
    if (c.status !== "procurando") throw erro("failed-precondition", "Alguém já aceitou o pedido.");
    const valor = Math.round(num(d.valor) * 100) / 100;
    if (!(valor >= c.valor && valor <= VALOR_MAX)) throw erro("invalid-argument", "A oferta só pode subir.");
    if (c.presenteId) throw erro("failed-precondition", "No presente o valor fica como está.");
    tx.update(ref, { valor, atualizadoEm: agoraTs() });
    return { valor };
  });
}
async function raio(db, auth, d) {
  return mudar(db, d.id, (tx, ref, c) => {
    if (c.clienteId !== auth.uid || c.status !== "procurando") return { raioKm: c.raioKm };
    const r = Number(d.raioKm);
    if (!RAIOS.includes(r) || r <= (c.raioKm || 0)) return { raioKm: c.raioKm };
    tx.update(ref, { raioKm: r, atualizadoEm: agoraTs() });
    return { raioKm: r };
  });
}
async function cancelar(db, auth, d) {
  const motivo = txt(d.motivo, 120);
  return mudar(db, d.id, (tx, ref, c) => {
    const st = c.status;
    let por = "";
    if (c.clienteId === auth.uid && ["procurando", "aceita", "chegou"].includes(st)) por = "cliente";
    else if (c.entregadorId === auth.uid && st === "chegou") {
      if (Date.now() - ms(c.chegouEm) < 5 * 60000) throw erro("failed-precondition", "Espere 5 minutos no local antes de cancelar.");
      por = "entregador";
    }
    if (!por) throw erro(st === "em_rota" ? "failed-precondition" : "permission-denied", st === "em_rota" ? "Com a viagem em andamento não dá para cancelar." : "Você não pode cancelar este pedido.");
    tx.update(ref, { status: "cancelada", canceladaPor: por, motivo, canceladaEm: agoraTs(), atualizadoEm: agoraTs() });
    return { ok: true };
  });
}
async function aceitar(db, auth, d) {
  await contaLiberada(db, auth);
  const uid = auth.uid;
  const e = await entregadorAtivo(db, uid);
  if (!e) throw erro("failed-precondition", "Seu cadastro de entregador não está ativo.");
  const u = await db.doc(`usuarios/${uid}`).get();
  return mudar(db, d.id, async (tx, ref, c) => {
    if (c.status !== "procurando") throw erro("failed-precondition", "Outra pessoa aceitou antes.");
    if (c.paraId && c.paraId !== uid) throw erro("permission-denied", "Este pedido foi feito para outra pessoa.");
    if (c.clienteId === uid) throw erro("permission-denied", "Você não pode aceitar o seu próprio pedido.");
    if (e.veiculo !== c.veiculo || !(e.servicos || []).includes(c.servico)) throw erro("failed-precondition", "Seu veículo não atende este pedido.");
    if (await bloqueioEntre(db, uid, c.clienteId)) throw erro("permission-denied", "Não é possível aceitar este pedido.");
    tx.update(ref, {
      status: "aceita", entregadorId: uid, aceitaEm: agoraTs(), atualizadoEm: agoraTs(),
      entregador: { nome: txt(u.get("nome") || e.nome, 80), veiculo: e.veiculo, modelo: txt(e.modelo, 40), cor: txt(e.cor, 20), placa: e.placa || "" }
    });
    return { ok: true };
  });
}
async function desistir(db, auth, d) {
  return mudar(db, d.id, (tx, ref, c) => {
    if (c.entregadorId !== auth.uid || !["aceita", "chegou"].includes(c.status)) throw erro("failed-precondition", "Não dá para desistir agora.");
    tx.update(ref, {
      status: "procurando", entregadorId: "", entregador: FieldValue.delete(), aceitaEm: FieldValue.delete(), chegouEm: FieldValue.delete(),
      pos: FieldValue.delete(), desistencias: (c.desistencias || 0) + 1, atualizadoEm: agoraTs()
    });
    return { ok: true };
  });
}
// Etapas de quem leva: chegou → em_rota (PIN no embarque) → concluida (PIN na entrega).
async function etapa(db, auth, d) {
  const para = d.para, pinDado = String(d.pin || "").replace(/\D/g, "").slice(0, 4);
  const resultado = await mudar(db, d.id, async (tx, ref, c) => {
    if (c.entregadorId !== auth.uid) throw erro("permission-denied", "Só quem leva avança o pedido.");
    const st = c.status;
    const ok = (st === "aceita" && para === "chegou") || (st === "chegou" && para === "em_rota") || (st === "em_rota" && para === "concluida");
    if (!ok) throw erro("failed-precondition", "Esta etapa já mudou. Atualize a tela.");
    const precisaPin = (para === "em_rota" && c.pinEm === "embarque") || (para === "concluida" && c.pinEm === "entrega");
    if (precisaPin) {
      const pr = ref.collection("privado").doc("pin"), p = (await tx.get(pr)).data() || {};
      const espera = ms(p.bloqueadoAte) - Date.now();
      if (espera > 0) throw erro("resource-exhausted", `Muitas tentativas com o PIN errado. Tente de novo em ${Math.ceil(espera / 60000)} min.`);
      if (pinDado.length !== 4 || pinDado !== p.pin) {
        const erros = (p.erros || 0) + 1;
        const trava = erros >= PIN_ERROS;
        tx.update(pr, { erros: trava ? 0 : erros, ...(trava ? { bloqueadoAte: Timestamp.fromMillis(Date.now() + PIN_ESPERA_MIN * 60000) } : {}) });
        return { pinErrado: true, restam: trava ? 0 : PIN_ERROS - erros, travou: trava };
      }
      tx.update(pr, { erros: 0, bloqueadoAte: FieldValue.delete() });
    }
    const campo = para === "chegou" ? "chegouEm" : para === "em_rota" ? "coletadoEm" : "concluidaEm";
    tx.update(ref, { status: para, [campo]: agoraTs(), atualizadoEm: agoraTs() });
    return { ok: true };
  });
  // O PIN errado precisa GRAVAR o número de erros: por isso volta como resultado (não como erro, que desfaria a contagem).
  if (resultado?.pinErrado) {
    throw erro(resultado.travou ? "resource-exhausted" : "invalid-argument",
      resultado.travou ? `PIN errado ${PIN_ERROS} vezes. Espere ${PIN_ESPERA_MIN} min e peça o código de novo.` : `PIN errado. Peça o código de novo (${resultado.restam === 1 ? "resta 1 tentativa" : `restam ${resultado.restam} tentativas`}).`);
  }
  return resultado;
}
async function avaliar(db, auth, d) {
  const nota = Number(d.nota);
  if (![1, 2, 3, 4, 5].includes(nota)) throw erro("invalid-argument", "Escolha de 1 a 5 estrelas.");
  return mudar(db, d.id, async (tx, ref, c) => {
    if (c.clienteId !== auth.uid || c.status !== "concluida") throw erro("permission-denied", "Só quem pediu avalia, depois de concluído.");
    if (c.avaliacao) throw erro("already-exists", "Você já avaliou este pedido.");
    const validos = ELOGIOS[c.servico === "corrida" ? "corrida" : "entrega"];
    const elogios = (Array.isArray(d.elogios) ? d.elogios : []).filter((t) => validos.includes(t)).slice(0, 5);
    const rn = db.doc(`entregadores_notas/${c.entregadorId}`), n = (await tx.get(rn)).data();
    tx.update(ref, { avaliacao: { nota, elogios, texto: txt(d.texto, 300), em: agoraTs() } });
    tx.set(rn, { soma: (n?.soma || 0) + nota, n: (n?.n || 0) + 1, ultima: ref.id });
    return { ok: true };
  });
}
async function avaliarCliente(db, auth, d) {
  const nota = Number(d.nota);
  if (![1, 2, 3, 4, 5].includes(nota)) throw erro("invalid-argument", "Escolha de 1 a 5 estrelas.");
  return mudar(db, d.id, (tx, ref, c) => {
    if (c.entregadorId !== auth.uid || c.status !== "concluida") throw erro("permission-denied", "Só quem levou avalia, depois de concluído.");
    if (c.avaliacaoEntregador) throw erro("already-exists", "Você já avaliou.");
    tx.update(ref, { avaliacaoEntregador: { nota, em: agoraTs() } });
    return { ok: true };
  });
}

const ACOES = { criar, oferta, raio, cancelar, aceitar, desistir, etapa, avaliar, avaliarCliente };
export async function acaoCorrida(db, auth, dados) {
  if (!auth) throw erro("unauthenticated", "Entre na sua conta.");
  const fn = ACOES[dados?.acao];
  if (!fn) throw erro("invalid-argument", "Ação inválida.");
  return fn(db, auth, dados || {});
}
export { MOTIVOS_CANCELAR };
