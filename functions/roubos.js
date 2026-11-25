// =====================================================
// Roubos, furtos, golpes e veículos pelo servidor (25/11/2026, etapa 2).
// As regras do Firestore destas coleções não cabiam no limite de tamanho do Firebase: agora o aparelho chama a função
// "roubos" com uma ação e é AQUI que tudo é conferido. As regras só deixam ler (quem pode) e o dono apagar o próprio
// veículo e o índice de venda; o resto é "só o servidor".
// Ações:
//   ocorrencia  registrar roubo/furto/golpe/suspeita (anônima = autoria só em ocorrencias_autoria); 5 por dia
//   status      quem registrou: recuperado | removido; moderação: ativo | removido
//   pista       "eu vi" (anônima ou com nome); automática ("consulta") uma por pessoa por dia; 30 por dia;
//               a equipe manda como "Equipe Help Floripa"
//   veiculo     cadastrar/editar o carro ou moto com a placa (o hash é calculado aqui); até 10 por pessoa
//   conferirPlacas  antes de anunciar carro/moto: placa com alerta ativo bloqueia e avisa quem registrou
//   vendas      índice veiculos_venda do negócio (só o hash da placa); confere as placas de novo
// =====================================================
import { HttpsError } from "firebase-functions/v2/https";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { createHash } from "node:crypto";
import { TIPOS_OCORRENCIA, OBJETOS, normalizarId, identificadorOk, geohash } from "./alertas-base.js";
import { placaOk, placaMercosul, formasPlaca, idVenda } from "./veiculos-base.js";

export const LIMITES = { ocorrencia: 5, pista: 30, desaparecido: 3, veiculos: 10, vendas: 40 };
const erro = (codigo, texto) => new HttpsError(codigo, texto);
const txt = (v, n) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);
const idOk = (v) => typeof v === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(v);
const ms = (t) => (t?.toMillis ? t.toMillis() : 0);
const noBrasil = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng) && lat >= -34 && lat <= 6 && lng >= -75 && lng <= -28;
const ano = (v) => (/^\d{4}$/.test(String(v ?? "").trim()) ? String(v).trim() : "");
const uf = (v) => (/^[A-Z]{2}$/.test(String(v || "")) ? v : "");
const diaBR = (agora = Date.now()) => new Date(agora - 3 * 3600e3).toISOString().slice(0, 10);
export const hashDaPlaca = (p) => createHash("sha256").update("hf-veiculo:" + placaMercosul(p)).digest("hex");

// ---------- quem pode ----------
async function contaLiberada(db, auth) {
  if (!auth) throw erro("unauthenticated", "Entre na sua conta.");
  if (auth.token?.email_verified !== true) throw erro("permission-denied", "Confirme seu e-mail para usar esta função.");
  const s = await db.doc(`sancoes/${auth.uid}`).get();
  if (s.exists && (s.get("tipo") === "banimento" || ms(s.get("ate")) > Date.now())) throw erro("permission-denied", "Sua conta está com uma restrição no momento.");
}
async function podeModerar(db, uid) {
  const a = await db.doc(`admins/${uid}`).get();
  return a.exists && ["dono", "moderacao"].includes(a.get("papel"));
}
// Contador do dia por pessoa (servidor_limites/{uid}: { dia, ocorrencia, pista }). Só o servidor lê e grava.
async function contar(db, uid, tipo) {
  const ref = db.doc(`servidor_limites/${uid}`), dia = diaBR();
  await db.runTransaction(async (tx) => {
    const d = (await tx.get(ref)).data() || {};
    const n = d.dia === dia ? Number(d[tipo] || 0) : 0;
    if (n >= LIMITES[tipo]) throw erro("resource-exhausted", { ocorrencia: "Você já registrou 5 ocorrências hoje. Tente amanhã.", desaparecido: "Você já registrou 3 avisos hoje. Fale com o Suporte se precisar de mais." }[tipo] || "Muitas pistas hoje. Tente amanhã.");
    // Dia novo: começa do zero (sem merge, para não sobrar contagem de outro tipo do dia anterior).
    if (d.dia === dia) tx.set(ref, { [tipo]: n + 1 }, { merge: true }); else tx.set(ref, { dia, [tipo]: 1 });
  });
}
async function autorDe(db, id, o) {
  if (o.autorId) return o.autorId;
  const a = await db.doc(`ocorrencias_autoria/${id}`).get();
  return a.exists ? a.get("uid") : "";
}

// ---------- ocorrência ----------
// Confere e monta o documento (sem ler nada: testável).
export function montarOcorrencia(d, uid, perfil, agora = Date.now()) {
  if (!TIPOS_OCORRENCIA[d?.tipo]) throw erro("invalid-argument", "Escolha o que aconteceu.");
  if (!OBJETOS[d.objeto]) throw erro("invalid-argument", "Escolha o que foi levado.");
  const veic = d.objeto === "carro" || d.objeto === "moto";
  let ident = normalizarId(d.identificador);
  if (veic && ident) ident = placaMercosul(ident);
  if (!identificadorOk(d.objeto, ident)) throw erro("invalid-argument", d.objeto === "celular" ? "Confira o IMEI: 15 números." : veic ? "Confira a placa." : "Confira o número.");
  if (veic && !ident) throw erro("invalid-argument", "Para carro ou moto, a placa é obrigatória.");
  const descricao = txt(d.descricao, 500);
  if (descricao.length < 10) throw erro("invalid-argument", "Descreva com pelo menos 10 letras.");
  const quando = Number(d.quando);
  if (!(quando <= agora + 60e3 && quando >= agora - 61 * 864e5)) throw erro("invalid-argument", "Escolha uma data dos últimos 60 dias.");
  const lat = Number(d.lat), lng = Number(d.lng);
  if (!noBrasil(lat, lng)) throw erro("invalid-argument", "Ative a localização para marcar a região (dentro do Brasil).");
  const anonimo = d.anonimo !== false;
  const doc = {
    anonimo, autorId: anonimo ? "" : uid, ...(anonimo ? {} : { autorNome: txt(perfil.nome, 80) }),
    tipo: d.tipo, objeto: d.objeto, identificador: ident, descricao,
    quando: Timestamp.fromMillis(Math.min(quando, agora - 1000)),
    lat: Math.round(lat * 1e3) / 1e3, lng: Math.round(lng * 1e3) / 1e3, geo4: geohash(lat, lng, 4),
    bairro: txt(d.bairro, 60), cidade: txt(perfil.cidade, 60), uf: uf(perfil.uf), status: "ativo"
  };
  const v = d.veiculo || {};
  if (veic) {
    const vei = { marca: txt(v.marca, 30), modelo: txt(v.modelo, 40), ano: ano(v.ano), cor: txt(v.cor, 20) };
    if (vei.marca || vei.modelo || vei.ano || vei.cor) doc.veiculo = vei;
  }
  return doc;
}
async function ocorrencia(db, auth, d) {
  await contaLiberada(db, auth);
  const uid = auth.uid;
  const u = (await db.doc(`usuarios/${uid}`).get()).data() || {};
  const doc = montarOcorrencia(d, uid, u);
  // Veículo da pessoa que foi roubado (opcional): tem que ser dela e a placa tem que bater.
  let vref = null;
  if (d.veiculoId) {
    if (!idOk(d.veiculoId)) throw erro("invalid-argument", "Veículo inválido.");
    vref = db.doc(`veiculos/${d.veiculoId}`);
    const v = await vref.get();
    if (!v.exists || v.get("donoId") !== uid) throw erro("permission-denied", "Esse veículo não é seu.");
    if (placaMercosul(v.get("placa")) !== doc.identificador) throw erro("invalid-argument", "A placa não bate com a do veículo cadastrado.");
  }
  await contar(db, uid, "ocorrencia");
  const ref = db.collection("ocorrencias").doc(), agora = FieldValue.serverTimestamp();
  const lote = db.batch();
  lote.set(ref, { ...doc, criadoEm: agora, atualizadoEm: agora });
  if (doc.anonimo) lote.set(db.doc(`ocorrencias_autoria/${ref.id}`), { uid });
  lote.set(db.doc(`usuarios/${uid}`), { minhasOcorrencias: FieldValue.arrayUnion(ref.id) }, { merge: true });
  if (vref) lote.update(vref, { status: "roubado", ocorrenciaId: ref.id, roubadoEm: agora, atualizadoEm: agora });
  await lote.commit();
  return { id: ref.id };
}
async function status(db, auth, d) {
  if (!idOk(d.id)) throw erro("invalid-argument", "Ocorrência inválida.");
  const ref = db.doc(`ocorrencias/${d.id}`), s = await ref.get();
  if (!s.exists) throw erro("not-found", "Ocorrência não encontrada.");
  const o = s.data(), uid = auth.uid;
  const autor = (await autorDe(db, d.id, o)) === uid;
  const mod = await podeModerar(db, uid);
  const ok = (autor && ["recuperado", "removido"].includes(d.status)) || (mod && ["ativo", "removido"].includes(d.status));
  if (!ok) throw erro("permission-denied", "Você não pode mudar esta ocorrência.");
  const agora = FieldValue.serverTimestamp();
  const lote = db.batch();
  lote.update(ref, { status: d.status, atualizadoEm: agora });
  // Recuperado: o veículo da pessoa ligado a esta ocorrência sai do "roubado".
  if (autor && d.status === "recuperado") {
    const vs = await db.collection("veiculos").where("donoId", "==", uid).where("ocorrenciaId", "==", d.id).limit(5).get();
    vs.docs.forEach((v) => lote.update(v.ref, { status: "recuperado", atualizadoEm: agora }));
  }
  await lote.commit();
  return { ok: true };
}

// ---------- pistas ----------
async function gravarPista(db, ocId, pista, autoria, idFixo = "") {
  const ref = idFixo ? db.doc(`ocorrencias/${ocId}/pistas/${idFixo}`) : db.collection(`ocorrencias/${ocId}/pistas`).doc();
  const lote = db.batch();
  lote.create(ref, { ...pista, criadoEm: FieldValue.serverTimestamp() });
  if (autoria) lote.set(db.doc(`pistas_autoria/${ocId}_${ref.id}`), { uid: autoria });
  try { await lote.commit(); } catch (e) { if (e?.code === 6 || /ALREADY_EXISTS/.test(e?.message || "")) return null; throw e; }
  return ref.id;
}
// Pista automática: uma por pessoa, ocorrência, motivo e dia (o id é um resumo, sem mostrar quem foi).
const idAuto = (uid, ocId, motivo) => "auto_" + createHash("sha256").update(`${uid}|${ocId}|${motivo}|${diaBR()}`).digest("hex").slice(0, 20);
async function pista(db, auth, d) {
  await contaLiberada(db, auth);
  if (!idOk(d.id)) throw erro("invalid-argument", "Ocorrência inválida.");
  const s = await db.doc(`ocorrencias/${d.id}`).get();
  if (!s.exists || s.get("status") !== "ativo") throw erro("failed-precondition", "Esta ocorrência não está mais ativa.");
  const uid = auth.uid;
  if (d.equipe) {
    if (!(await podeModerar(db, uid))) throw erro("permission-denied", "Só a equipe de segurança.");
    const texto = txt(d.texto, 400);
    if (texto.length < 3) throw erro("invalid-argument", "Escreva a pista.");
    return { id: await gravarPista(db, d.id, { texto, anonimo: false, uid, nome: "Equipe Help Floripa" }, "") };
  }
  if (d.auto === "consulta") {
    const cidade = txt((await db.doc(`usuarios/${uid}`).get()).get("cidade"), 60);
    const texto = `Alguém consultou este número no Help Floripa${cidade ? ` (${cidade})` : ""}: pode estar à venda.`;
    return { id: await gravarPista(db, d.id, { texto, anonimo: true }, uid, idAuto(uid, d.id, "consulta")) };
  }
  const texto = txt(d.texto, 400);
  if (texto.length < 3) throw erro("invalid-argument", "Escreva a pista.");
  await contar(db, uid, "pista");
  const anonimo = d.anonimo !== false;
  const nome = anonimo ? "" : txt((await db.doc(`usuarios/${uid}`).get()).get("nome"), 80);
  return { id: await gravarPista(db, d.id, anonimo ? { texto, anonimo: true } : { texto, anonimo: false, uid, nome }, anonimo ? uid : "") };
}

// ---------- veículos ----------
export function montarVeiculo(d) {
  if (!["carro", "moto"].includes(d?.tipo)) throw erro("invalid-argument", "Escolha carro ou moto.");
  if (!placaOk(d.placa)) throw erro("invalid-argument", "Confira a placa (ABC-1234 ou ABC1D23).");
  const placa = placaMercosul(d.placa);
  const v = { tipo: d.tipo, placa, placaHash: hashDaPlaca(placa), marca: txt(d.marca, 30), modelo: txt(d.modelo, 40), ano: ano(d.ano), cor: txt(d.cor, 20), apelido: txt(d.apelido, 30), chassiFim: "" };
  if (!v.marca || !v.modelo) throw erro("invalid-argument", "Informe a marca e o modelo.");
  return v;
}
async function alertasDaPlaca(db, placa) {
  return (await db.collection("ocorrencias").where("status", "==", "ativo").where("identificador", "in", formasPlaca(placa)).limit(5).get()).docs;
}
async function veiculo(db, auth, d) {
  await contaLiberada(db, auth);
  const uid = auth.uid, v = montarVeiculo(d), agora = FieldValue.serverTimestamp();
  let ref;
  if (d.id) {
    if (!idOk(d.id)) throw erro("invalid-argument", "Veículo inválido.");
    ref = db.doc(`veiculos/${d.id}`);
  } else ref = db.collection("veiculos").doc();
  await db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    if (s.exists) {
      if (s.get("donoId") !== uid) throw erro("permission-denied", "Esse veículo não é seu.");
      tx.update(ref, { ...v, atualizadoEm: agora });
    } else {
      const meus = await tx.get(db.collection("veiculos").where("donoId", "==", uid).limit(LIMITES.veiculos));
      if (meus.size >= LIMITES.veiculos) throw erro("resource-exhausted", `Você já tem ${LIMITES.veiculos} veículos cadastrados.`);
      tx.set(ref, { ...v, donoId: uid, status: "ok", ocorrenciaId: "", criadoEm: agora, atualizadoEm: agora });
    }
  });
  // A placa tem alerta de outra pessoa? (pode ter comprado um veículo roubado sem saber)
  const meus = new Set((await db.doc(`usuarios/${uid}`).get()).get("minhasOcorrencias") || []);
  const alheia = (await alertasDaPlaca(db, v.placa)).some((o) => !meus.has(o.id) && o.get("autorId") !== uid);
  return { id: ref.id, alerta: alheia };
}

// ---------- venda de carro/moto (Shopping e Automotivo) ----------
const negocioMeu = (uid, id) => typeof id === "string" && new RegExp(`^${uid}_(lojinha|automotivo)$`).test(id);
// Confere as placas: com alerta ativo, avisa quem registrou (pista automática anônima, uma por dia; a autoria = quem
// tentou anunciar, só a moderação vê) e devolve os itens bloqueados.
async function bloqueadas(db, uid, itens, nomeNegocio) {
  const out = [];
  for (const it of itens) {
    const docs = await alertasDaPlaca(db, it.placa);
    if (!docs.length) continue;
    out.push(it.nome || it.item || "Veículo");
    const texto = `Alerta automático: um veículo com esta placa tentou ser anunciado no Help Floripa (${txt(nomeNegocio, 80) || "um perfil de negócio"}). O anúncio foi bloqueado e a equipe de segurança sabe quem tentou.`.slice(0, 400);
    for (const o of docs) await gravarPista(db, o.id, { texto, anonimo: true }, uid, idAuto(uid, o.id, "venda")).catch(() => {});
  }
  return out;
}
const placasDe = (lista) => {
  if (!Array.isArray(lista) || lista.length > LIMITES.vendas) throw erro("invalid-argument", `No máximo ${LIMITES.vendas} veículos por negócio.`);
  return lista.map((it) => {
    if (!placaOk(it?.placa)) throw erro("invalid-argument", `Confira a placa de “${txt(it?.nome || it?.item, 60) || "um veículo"}”.`);
    return { ...it, placa: placaMercosul(it.placa) };
  });
};
async function conferirPlacas(db, auth, d) {
  await contaLiberada(db, auth);
  const itens = placasDe(d.itens);
  return { bloqueados: await bloqueadas(db, auth.uid, itens, d.nomeNegocio) };
}
async function vendas(db, auth, d) {
  await contaLiberada(db, auth);
  const uid = auth.uid;
  if (!negocioMeu(uid, d.negocioId)) throw erro("permission-denied", "Esse negócio não é seu.");
  const neg = await db.doc(`negocios/${d.negocioId}`).get();
  const itens = placasDe(d.itens);
  // Lista vazia = tirar tudo (também quando o negócio foi excluído).
  if (itens.length && !neg.exists) throw erro("failed-precondition", "Salve o perfil do negócio antes.");
  const bloq = await bloqueadas(db, uid, itens, neg.get("nome"));
  if (bloq.length) throw erro("failed-precondition", `A placa de “${bloq[0]}” tem um alerta de roubo ou furto ativo no Help Floripa, então o anúncio não pode ser publicado.`);
  const col = db.collection("veiculos_venda"), agora = FieldValue.serverTimestamp();
  const tipoNegocio = d.negocioId.split("_").pop();
  const antigos = await col.where("negocioId", "==", d.negocioId).where("donoId", "==", uid).limit(60).get();
  const novos = new Map();
  for (const it of itens) {
    if (!["carro", "moto"].includes(it.tipo)) throw erro("invalid-argument", "Escolha carro ou moto.");
    const hash = hashDaPlaca(it.placa), id = idVenda(d.negocioId, hash);
    novos.set(id, { negocioId: d.negocioId, donoId: uid, tipoNegocio, item: txt(it.item || it.nome, 60), tipo: it.tipo, placaHash: hash,
      marca: txt(it.marca, 30), modelo: txt(it.modelo, 40), ano: ano(it.ano), cor: txt(it.cor, 20),
      cidade: txt(neg.get("cidade"), 60), uf: uf(neg.get("uf")), atualizadoEm: agora });
  }
  const ja = new Set(antigos.docs.map((x) => x.id));
  const lote = db.batch();
  for (const [id, doc] of novos) lote.set(col.doc(id), ja.has(id) ? doc : { ...doc, criadoEm: agora }, { merge: true });
  for (const x of antigos.docs) if (!novos.has(x.id)) lote.delete(x.ref);
  await lote.commit();
  return { ok: true, n: novos.size };
}


// ---------- pessoas desaparecidas (etapa 3) ----------
// Nasce "analise" com um chamado URGENTE para a equipe conferir o boletim; só a moderação publica ("ativo") e, ao
// publicar, o número do boletim sai do aviso. Evita usar o site para achar quem fugiu de uma situação de violência.
export const CONDICOES = ["crianca", "idoso", "demencia", "deficiencia", "adulto", "outro"];
export const PARENTESCOS = ["pais", "filho", "conjuge", "irmao", "parente", "responsavel", "amigo"];
const NOME_COND = { crianca: "Criança ou adolescente", idoso: "Pessoa idosa", demencia: "Alzheimer ou confusão", deficiencia: "Deficiência ou autismo", adulto: "Adulto", outro: "Outra situação" };
const NOME_PAR = { pais: "Pai ou mãe", filho: "Filho ou filha", conjuge: "Cônjuge", irmao: "Irmão ou irmã", parente: "Outro parente", responsavel: "Responsável legal", amigo: "Amigo ou vizinho" };
const fotoOk = (f) => typeof f === "string" && (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(f) && f.length <= 300000
  || f.startsWith("https://firebasestorage.googleapis.com/v0/b/") && f.length <= 2000);
export function montarDesaparecido(d, uid, perfil, agora = Date.now()) {
  const nome = txt(d?.nome, 80);
  if (nome.length < 3) throw erro("invalid-argument", "Escreva o nome da pessoa.");
  const idade = d.idade === null || d.idade === undefined || d.idade === "" ? null : Number(d.idade);
  if (idade !== null && !(Number.isInteger(idade) && idade >= 0 && idade <= 120)) throw erro("invalid-argument", "Confira a idade.");
  if (!CONDICOES.includes(d.condicao)) throw erro("invalid-argument", "Escolha a situação da pessoa.");
  if (!PARENTESCOS.includes(d.parentesco)) throw erro("invalid-argument", "Diga quem você é para a pessoa.");
  const descricao = txt(d.descricao, 500);
  if (descricao.length < 10) throw erro("invalid-argument", "Descreva a pessoa com pelo menos 10 letras.");
  const bo = String(d.bo || "").replace(/\s+/g, "");
  if (!/^[A-Za-z0-9./-]{4,40}$/.test(bo)) throw erro("invalid-argument", "Informe o número do boletim de ocorrência.");
  if (d.declaro !== true) throw erro("invalid-argument", "Marque a declaração para continuar.");
  const quando = Number(d.quando);
  if (!(quando <= agora + 60e3 && quando >= agora - 366 * 864e5)) throw erro("invalid-argument", "Escolha uma data do último ano.");
  const lat = Number(d.lat), lng = Number(d.lng);
  if (!noBrasil(lat, lng)) throw erro("invalid-argument", "Ative a localização para marcar a região (dentro do Brasil).");
  if (d.foto && !fotoOk(d.foto)) throw erro("invalid-argument", "Não foi possível usar essa foto.");
  return {
    autorId: uid, autorNome: txt(perfil.nome, 80), nome, ...(idade !== null ? { idade } : {}),
    condicao: d.condicao, parentesco: d.parentesco, descricao, sinais: txt(d.sinais, 300), visto: txt(d.visto, 120),
    quando: Timestamp.fromMillis(Math.min(quando, agora - 1000)), bo,
    lat: Math.round(lat * 1e3) / 1e3, lng: Math.round(lng * 1e3) / 1e3, geo4: geohash(lat, lng, 4),
    cidade: txt(perfil.cidade, 60), uf: uf(perfil.uf), status: "analise", ...(d.foto ? { foto: d.foto } : {})
  };
}
async function desaparecido(db, auth, d) {
  await contaLiberada(db, auth);
  const uid = auth.uid, u = (await db.doc(`usuarios/${uid}`).get()).data() || {};
  const doc = montarDesaparecido(d, uid, u);
  await contar(db, uid, "desaparecido");
  const ref = db.collection("desaparecidos").doc(), sref = db.collection("suporte").doc(), agora = FieldValue.serverTimestamp();
  const lote = db.batch();
  lote.set(ref, { ...doc, criadoEm: agora, atualizadoEm: agora });
  // Chamado URGENTE na fila de Segurança para a equipe conferir o boletim e publicar.
  lote.set(sref, { prioridade: "urgente", uid, nome: doc.autorNome, email: txt(auth.token?.email, 120), assunto: `Desaparecimento: ${doc.nome}`.slice(0, 120),
    categoria: "sos", status: "aberto", desaparecidoId: ref.id, criadoEm: agora, atualizadoEm: agora, ultimaDe: "usuario" });
  lote.set(sref.collection("mensagens").doc("inicio"), { autorId: uid, equipe: false, em: agora,
    texto: `DESAPARECIMENTO · conferir e publicar\nPessoa: ${doc.nome}${doc.idade !== undefined ? ", " + doc.idade + " anos" : ""} (${NOME_COND[doc.condicao]})\nBoletim: ${doc.bo}\nQuem registrou: ${NOME_PAR[doc.parentesco]}\nPainel › Segurança e alertas › Desaparecidos`.slice(0, 2000) });
  await lote.commit();
  return { id: ref.id };
}
async function statusDesap(db, auth, d) {
  if (!idOk(d.id)) throw erro("invalid-argument", "Aviso inválido.");
  const ref = db.doc(`desaparecidos/${d.id}`), s = await ref.get();
  if (!s.exists) throw erro("not-found", "Aviso não encontrado.");
  const x = s.data(), uid = auth.uid, autor = x.autorId === uid, mod = await podeModerar(db, uid), agora = FieldValue.serverTimestamp();
  if (d.status === "ativo") {
    if (!mod) throw erro("permission-denied", "Só a equipe publica o aviso.");
    if (x.status !== "analise") throw erro("failed-precondition", "Este aviso não está esperando conferência.");
    await ref.update({ status: "ativo", bo: FieldValue.delete(), publicadoPor: uid, atualizadoEm: agora }); // o boletim fica no registro de ações
    return { ok: true };
  }
  const ok = ["encontrado", "removido"].includes(d.status) && (mod || (autor && ["analise", "ativo"].includes(x.status)));
  if (!ok) throw erro("permission-denied", "Você não pode mudar este aviso.");
  await ref.update({ status: d.status, atualizadoEm: agora });
  return { ok: true };
}
async function pistaDesap(db, auth, d) {
  await contaLiberada(db, auth);
  if (!idOk(d.id)) throw erro("invalid-argument", "Aviso inválido.");
  const s = await db.doc(`desaparecidos/${d.id}`).get();
  if (!s.exists || s.get("status") !== "ativo") throw erro("failed-precondition", "Este aviso não está mais ativo.");
  const texto = txt(d.texto, 400);
  if (texto.length < 3) throw erro("invalid-argument", "Escreva o que você viu.");
  const uid = auth.uid;
  await contar(db, uid, "pista");
  const lat = Number(d.lat), lng = Number(d.lng), comLugar = d.lat !== undefined && d.lat !== null && noBrasil(lat, lng);
  const base = { texto, criadoEm: FieldValue.serverTimestamp(), ...(comLugar ? { lat: Math.round(lat * 1e3) / 1e3, lng: Math.round(lng * 1e3) / 1e3 } : {}) };
  const anonimo = d.anonimo !== false;
  const ref = db.collection(`desaparecidos/${d.id}/pistas`).doc(), lote = db.batch();
  if (anonimo) { lote.set(ref, { ...base, anonimo: true }); lote.set(db.doc(`pistas_desap_autoria/${d.id}_${ref.id}`), { uid }); }
  else lote.set(ref, { ...base, anonimo: false, uid, nome: txt((await db.doc(`usuarios/${uid}`).get()).get("nome"), 80) });
  await lote.commit();
  return { id: ref.id };
}

const ACOES = { ocorrencia, status, pista, veiculo, conferirPlacas, vendas, desaparecido, statusDesap, pistaDesap };
export async function acaoRoubos(db, auth, dados) {
  if (!auth) throw erro("unauthenticated", "Entre na sua conta.");
  const fn = ACOES[dados?.acao];
  if (!fn) throw erro("invalid-argument", "Ação inválida.");
  return fn(db, auth, dados || {});
}
