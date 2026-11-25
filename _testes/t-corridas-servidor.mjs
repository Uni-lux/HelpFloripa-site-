// Corridas pelo servidor (functions/corridas.js, função "corrida"): o que só o servidor pode conferir.
// PIN com limite de tentativas (5 erros = 10 min), no máximo 3 pedidos abertos, quem pode cada ação, valores,
// presente usado junto com o pedido e o resumo de notas.
// Uso: FUNCOES=1 ./emulador.sh  (porta 5001) e node seed.mjs antes.
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp as appAdmin } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator, httpsCallable } from "firebase/functions";
import { USUARIOS as U } from "./nav.mjs";

const db = getFirestore(appAdmin({ projectId: "demo-hf" }, "adm"));
let falhas = 0;
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) falhas++; };
async function cliente(k) {
  const app = initializeApp({ apiKey: "demo", projectId: "demo-hf" }, k);
  const a = getAuth(app); connectAuthEmulator(a, "http://127.0.0.1:9099", { disableWarnings: true });
  await signInWithEmailAndPassword(a, `${k}@teste.com`, "teste123");
  const f = getFunctions(app, "southamerica-east1"); connectFunctionsEmulator(f, "127.0.0.1", 5001);
  const fn = httpsCallable(f, "corrida");
  return async (acao, dados = {}) => { try { return { ok: true, ...(await fn({ acao, ...dados })).data }; } catch (e) { return { ok: false, code: e.code, msg: e.message }; } };
}
const ana = await cliente("ana"), bruno = await cliente("bruno"), carla = await cliente("carla").catch(() => null);

// Bruno entregador de moto ativo; limpa pedidos antigos da Ana.
await db.doc(`entregadores/${U.bruno}`).set({ uid: U.bruno, nome: "Bruno", servicos: ["entrega", "corrida"], veiculo: "moto", modelo: "CG", cor: "Preta", placa: "ABC1D23", cnh: "A", declaracoes: { maior: true, documentos: true, autonomo: true }, status: "ativo", criadoEm: Timestamp.now(), atualizadoEm: Timestamp.now() });
for (const s of (await db.collection("corridas").where("clienteId", "==", U.ana).get()).docs) await s.ref.update({ status: "cancelada" });

const P = (extra) => ({ modalidade: "entrega_moto", origem: { lat: -27.5954, lng: -48.5481, nome: "Rua A, 10", sub: "Centro · Florianópolis" }, destino: { lat: -27.6012, lng: -48.5203, nome: "Rua B, 20", sub: "Saco dos Limões" }, km: 4.2, min: 12, valor: 15, pagamento: "pix", pacote: { tamanho: "P", oque: "Documentos" }, contato: { nome: "Dest", telefone: "48999990000" }, ...extra });

console.log("Cadastro de quem leva");
const CAD = (extra) => ({ veiculo: "moto", servicos: ["entrega", "corrida"], modelo: "CG 160", cor: "Preta", placa: "abc-1d23", cnh: "A", declaracoes: { maior: true, documentos: true, autonomo: true }, ...extra });
let c0 = await ana("cadastro", CAD());
ok(!c0.ok && /verificada/.test(c0.msg), "conta sem verificação não se cadastra: " + c0.msg);
c0 = await bruno("cadastro", CAD({ placa: "AB-1" })); ok(!c0.ok && /Placa/.test(c0.msg), "placa inválida é recusada");
c0 = await bruno("cadastro", CAD({ cnh: "B" })); ok(!c0.ok && /CNH/.test(c0.msg), "CNH que não serve para moto é recusada");
c0 = await bruno("cadastro", CAD({ declaracoes: { maior: true } })); ok(!c0.ok && /declarações/.test(c0.msg), "sem as três declarações é recusado");
c0 = await bruno("cadastro", CAD({ veiculo: "bike", servicos: ["corrida", "entrega"], placa: "", cnh: "" }));
const cb = (await db.doc(`entregadores/${U.bruno}`).get()).data();
ok(c0.ok && cb.veiculo === "bike" && JSON.stringify(cb.servicos) === '["entrega"]' && cb.placa === "", "bike: só entregas e sem placa");
c0 = await bruno("situacao", { status: "pausado" }); ok(c0.ok && (await db.doc(`entregadores/${U.bruno}`).get()).get("status") === "pausado", "pausar pelo servidor");
await db.doc(`entregadores/${U.bruno}`).update({ status: "suspenso" });
c0 = await bruno("situacao", { status: "ativo" }); ok(!c0.ok && /suspenso/.test(c0.msg), "suspenso não se reativa sozinho");
c0 = await bruno("cadastro", CAD()); ok(!c0.ok, "suspenso não muda o cadastro");
await db.doc(`entregadores/${U.bruno}`).set({ uid: U.bruno, nome: "Bruno", servicos: ["entrega", "corrida"], veiculo: "moto", modelo: "CG", cor: "Preta", placa: "ABC1D23", cnh: "A", declaracoes: { maior: true, documentos: true, autonomo: true }, status: "ativo", criadoEm: Timestamp.now(), atualizadoEm: Timestamp.now() }); // volta ao cadastro de moto para o resto

console.log("Criar");
let r = await ana("criar", P({ valor: 1 }));
ok(!r.ok && /Valor/.test(r.msg), "valor abaixo do mínimo é recusado: " + r.msg);
r = await ana("criar", P({ origem: { lat: 48.8, lng: 2.3, nome: "Paris" } }));
ok(!r.ok, "fora do Brasil é recusado");
r = await ana("criar", P({ km: 80 }));
ok(!r.ok && /até 60 km/.test(r.msg), "moto até 60 km: " + r.msg);
r = await ana("criar", P({ destinatarioId: "alguem_sem_conversa_xyz" }));
ok(!r.ok && /conversa/.test(r.msg), "destinatário sem conversa é recusado");
r = await ana("criar", P());
ok(r.ok && r.id, "entrega criada: " + r.id);
const id = r.id;
const c = (await db.doc(`corridas/${id}`).get()).data();
ok(c.origem.lat === -27.6 && c.origem.nome === "Região de Centro" && c.clienteId === U.ana && c.status === "procurando", "no documento só a região e quem pediu");
const pin = (await db.doc(`corridas/${id}/privado/pin`).get()).data();
ok(/^\d{4}$/.test(pin.pin), "PIN gerado no servidor");
ok((await db.doc(`corridas/${id}/privado/rota`).get()).data().origem.nome === "Rua A, 10", "endereço exato em privado/rota");
ok(c.valorSugerido > 0 && c.geo4 && c.pinEm === "entrega", "valor sugerido, geohash e PIN na entrega calculados no servidor");

console.log("Oferta e aceite");
r = await ana("oferta", { id, valor: 10 }); ok(!r.ok, "oferta não diminui");
r = await bruno("oferta", { id, valor: 30 }); ok(!r.ok, "só quem pediu muda a oferta");
r = await ana("oferta", { id, valor: 18 }); ok(r.ok && (await db.doc(`corridas/${id}`).get()).get("valor") === 18, "oferta sobe para R$ 18");
r = await ana("aceitar", { id }); ok(!r.ok, "quem pediu não aceita o próprio (nem é entregador)");
r = await bruno("etapa", { id, para: "chegou" }); ok(!r.ok, "não avança antes de aceitar");
r = await bruno("aceitar", { id }); ok(r.ok, "Bruno aceita");
const ac = (await db.doc(`corridas/${id}`).get()).data();
ok(ac.entregadorId === U.bruno && ac.entregador.placa === "ABC1D23", "placa vem do cadastro: " + ac.entregador.placa);
r = await bruno("aceitar", { id }); ok(!r.ok && /aceitou antes/.test(r.msg), "não aceita duas vezes");

console.log("Etapas e PIN");
r = await bruno("etapa", { id, para: "concluida", pin: pin.pin }); ok(!r.ok, "não pula etapas");
r = await bruno("etapa", { id, para: "chegou" }); ok(r.ok, "chegou");
r = await ana("criar", P()); const id2 = r.id;
await bruno("aceitar", { id: id2 }); await bruno("etapa", { id: id2, para: "chegou" }); await bruno("etapa", { id: id2, para: "em_rota" });
const pin2 = (await db.doc(`corridas/${id2}/privado/pin`).get()).get("pin");
const errado = pin2 === "0000" ? "1111" : "0000";
for (let i = 1; i <= 4; i++) r = await bruno("etapa", { id: id2, para: "concluida", pin: errado });
ok(!r.ok && /resta 1 tentativa\b/.test(r.msg), "4 erros: " + r.msg);
r = await bruno("etapa", { id: id2, para: "concluida", pin: errado });
ok(!r.ok && /5 vezes/.test(r.msg), "5º erro trava: " + r.msg);
r = await bruno("etapa", { id: id2, para: "concluida", pin: pin2 });
ok(!r.ok && /Tente de novo em/.test(r.msg), "travado: nem o PIN certo passa por 10 min");
await db.doc(`corridas/${id2}/privado/pin`).update({ bloqueadoAte: Timestamp.fromMillis(Date.now() - 1000) });
r = await bruno("etapa", { id: id2, para: "concluida", pin: pin2 });
ok(r.ok && (await db.doc(`corridas/${id2}`).get()).get("status") === "concluida", "depois da espera, o PIN certo conclui");

console.log("Avaliações");
r = await bruno("avaliar", { id: id2, nota: 5 }); ok(!r.ok, "quem levou não avalia como cliente");
const antes = (await db.doc(`entregadores_notas/${U.bruno}`).get()).data() || { soma: 0, n: 0 };
r = await ana("avaliar", { id: id2, nota: 4, elogios: ["Rápido", "inventado"], texto: "Bom" });
const depois = (await db.doc(`entregadores_notas/${U.bruno}`).get()).data();
ok(r.ok && depois.n === antes.n + 1 && depois.soma === antes.soma + 4, "avaliação sobe o resumo de notas");
ok(JSON.stringify((await db.doc(`corridas/${id2}`).get()).get("avaliacao.elogios")) === '["Rápido"]', "elogio que não existe é ignorado");
r = await ana("avaliar", { id: id2, nota: 5 }); ok(!r.ok, "avalia só uma vez");
r = await bruno("avaliarCliente", { id: id2, nota: 5 }); ok(r.ok, "quem levou avalia quem pediu");

console.log("Cancelar e limite");
r = await bruno("cancelar", { id, motivo: "Não apareceu" }); ok(!r.ok && /5 minutos/.test(r.msg), "entregador só cancela depois de 5 min esperando");
await db.doc(`corridas/${id}`).update({ chegouEm: Timestamp.fromMillis(Date.now() - 6 * 60000) });
r = await bruno("cancelar", { id, motivo: "Não apareceu" }); ok(r.ok && (await db.doc(`corridas/${id}`).get()).get("canceladaPor") === "entregador", "depois de 5 min o entregador cancela");
const abertos = [];
for (let i = 0; i < 3; i++) { const x = await ana("criar", P()); if (x.ok) abertos.push(x.id); }
r = await ana("criar", P());
ok(abertos.length === 3 && !r.ok && /3 pedidos abertos/.test(r.msg), "no máximo 3 pedidos abertos: " + r.msg);
r = await ana("cancelar", { id: abertos[0], motivo: "Mudei de planos" }); ok(r.ok, "quem pediu cancela enquanto procura");
for (const x of abertos) await db.doc(`corridas/${x}`).update({ status: "cancelada" });

console.log("Presente");
await db.doc("presentes/prTesteCorr").set({ de: U.bruno, para: U.ana, tipo: "corrida", valor: 30, status: "aceito", criadoEm: Timestamp.now() });
r = await ana("criar", P({ modalidade: "corrida_moto", pacote: null, valor: 50, presenteId: "prTesteCorr" }));
ok(!r.ok && /valor do presente/.test(r.msg), "corrida de presente acima do valor é recusada");
r = await ana("criar", P({ modalidade: "corrida_moto", pacote: null, valor: 25, presenteId: "prTesteCorr" }));
const pr = (await db.doc("presentes/prTesteCorr").get()).data();
const cp = r.ok ? (await db.doc(`corridas/${r.id}`).get()).data() : {};
ok(r.ok && pr.status === "usado" && pr.corridaId === r.id && cp.pagadorId === U.bruno && cp.pagamento === "presente", "presente usado junto com o pedido (quem deu paga)");
if (r.ok) await db.doc(`corridas/${r.id}`).update({ status: "cancelada" });

console.log(falhas ? `\n${falhas} falha(s)` : "\ntudo certo");
process.exit(falhas ? 1 : 0);
