// Roubos, furtos, golpes e veículos pelo servidor (functions/roubos.js, função "roubos"): o que só o servidor confere.
// Ocorrência (anônima com autoria à parte, limite de 5 por dia, veículo marcado como roubado), status (quem registrou e
// moderação), pistas (anônima, automática uma por dia, da equipe), veículos (hash da placa, alerta de outra pessoa) e
// venda de carro/moto (placa com alerta bloqueia e avisa quem registrou; índice só com o hash).
// Uso: FUNCOES=1 ./emulador.sh  (porta 5001) e node seed.mjs antes.
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp as appAdmin } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator, httpsCallable } from "firebase/functions";
import { createHash } from "node:crypto";
import { USUARIOS as U } from "./nav.mjs";

const db = getFirestore(appAdmin({ projectId: "demo-hf" }, "adm"));
let falhas = 0;
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) falhas++; };
async function cliente(k) {
  const app = initializeApp({ apiKey: "demo", projectId: "demo-hf" }, k);
  const a = getAuth(app); connectAuthEmulator(a, "http://127.0.0.1:9099", { disableWarnings: true });
  await signInWithEmailAndPassword(a, `${k}@teste.com`, "teste123");
  const f = getFunctions(app, "southamerica-east1"); connectFunctionsEmulator(f, "127.0.0.1", 5001);
  const fn = httpsCallable(f, "roubos");
  return async (acao, dados = {}) => { try { return { ok: true, ...(await fn({ acao, ...dados })).data }; } catch (e) { return { ok: false, code: e.code, msg: e.message }; } };
}
const ana = await cliente("ana"), bruno = await cliente("bruno"), dani = await cliente("dani");
const hash = (p) => createHash("sha256").update("hf-veiculo:" + p).digest("hex");

// Limpa o que sobrou de rodadas anteriores.
await db.doc(`servidor_limites/${U.ana}`).delete(); await db.doc(`servidor_limites/${U.bruno}`).delete();
for (const c of ["ocorrencias", "veiculos", "veiculos_venda"]) for (const s of (await db.collection(c).get()).docs) await s.ref.delete();
await db.doc(`usuarios/${U.ana}`).set({ cidade: "Florianópolis", uf: "SC" }, { merge: true });

const O = (extra) => ({ tipo: "furto", objeto: "celular", identificador: "356938035643809", descricao: "Levaram meu celular no ônibus", quando: Date.now() - 3600e3, lat: -27.59412, lng: -48.54871, bairro: "Centro", ...extra });

console.log("Ocorrência");
let r = await ana("ocorrencia", O({ descricao: "curto" }));
ok(!r.ok && /10 letras/.test(r.msg), "descrição curta é recusada");
r = await ana("ocorrencia", O({ identificador: "123" }));
ok(!r.ok && /IMEI/.test(r.msg), "IMEI fora do formato é recusado");
r = await ana("ocorrencia", O({ quando: Date.now() + 864e5 }));
ok(!r.ok, "data no futuro é recusada");
r = await ana("ocorrencia", O({ lat: 48.8, lng: 2.3 }));
ok(!r.ok, "fora do Brasil é recusado");
r = await ana("ocorrencia", O());
ok(r.ok && r.id, "ocorrência anônima registrada");
const o1 = r.id, d1 = (await db.doc(`ocorrencias/${o1}`).get()).data();
ok(d1.anonimo === true && d1.autorId === "" && !("autorNome" in d1), "anônima: sem nome nem autor no documento");
ok((await db.doc(`ocorrencias_autoria/${o1}`).get()).get("uid") === U.ana, "autoria guardada à parte");
ok(d1.lat === -27.594 && d1.lng === -48.549 && d1.geo4 && d1.cidade === "Florianópolis" && d1.uf === "SC", "ponto aproximado (3 casas), geohash e cidade do perfil calculados no servidor");
ok(((await db.doc(`usuarios/${U.ana}`).get()).get("minhasOcorrencias") || []).includes(o1), "a ocorrência entra em minhasOcorrencias");
r = await bruno("ocorrencia", O({ anonimo: false, identificador: "" , descricao: "Tentaram me aplicar um golpe do Pix", tipo: "golpe", objeto: "outro" }));
ok(r.ok && (await db.doc(`ocorrencias/${r.id}`).get()).get("autorId") === U.bruno, "com nome: autorId e nome no documento");
const o2 = r.id;

console.log("Status");
r = await bruno("status", { id: o1, status: "recuperado" }); ok(!r.ok, "outra pessoa não encerra");
r = await ana("status", { id: o1, status: "ativo" }); ok(!r.ok, "quem registrou não reativa (só a moderação)");
r = await dani("status", { id: o2, status: "removido" }); ok(r.ok && (await db.doc(`ocorrencias/${o2}`).get()).get("status") === "removido", "a moderação tira do ar");

console.log("Pistas");
r = await bruno("pista", { id: o1, texto: "Vi à venda na feira", anonimo: true });
const p1 = r.id;
ok(r.ok && (await db.doc(`ocorrencias/${o1}/pistas/${p1}`).get()).get("uid") === undefined, "pista anônima sem uid no documento");
ok((await db.doc(`pistas_autoria/${o1}_${p1}`).get()).get("uid") === U.bruno, "autoria da pista à parte");
r = await bruno("pista", { id: o1, texto: "Vi de novo", anonimo: false });
ok(r.ok && !!(await db.doc(`ocorrencias/${o1}/pistas/${r.id}`).get()).get("nome"), "pista com nome");
r = await bruno("pista", { id: o1, auto: "consulta" }); const a1 = r.id;
r = await bruno("pista", { id: o1, auto: "consulta" });
const autos = (await db.collection(`ocorrencias/${o1}/pistas`).get()).docs.filter((x) => x.id.startsWith("auto_"));
ok(a1 && autos.length === 1 && /consultou/.test(autos[0].get("texto")), "pista automática de consulta: uma por pessoa por dia");
r = await bruno("pista", { id: o2, texto: "Teste" }); ok(!r.ok, "ocorrência fora do ar não recebe pista");
r = await bruno("pista", { id: o1, texto: "Equipe falsa", equipe: true }); ok(!r.ok, "quem não é da equipe não manda como equipe");
r = await dani("pista", { id: o1, texto: "Equipe de segurança: achamos um anúncio", equipe: true });
ok(r.ok && (await db.doc(`ocorrencias/${o1}/pistas/${r.id}`).get()).get("nome") === "Equipe Help Floripa", "a equipe manda como Equipe Help Floripa");

console.log("Veículos");
r = await ana("veiculo", { tipo: "carro", placa: "AB-12", marca: "Fiat", modelo: "Uno" }); ok(!r.ok && /placa/.test(r.msg), "placa inválida é recusada");
r = await ana("veiculo", { tipo: "carro", placa: "ABC-1234", marca: "Fiat", modelo: "Uno", ano: "2015", cor: "Prata" });
const v1 = r.id, dv = (await db.doc(`veiculos/${v1}`).get()).data();
ok(r.ok && dv.placa === "ABC1C34" && dv.placaHash === hash("ABC1C34") && dv.donoId === U.ana && dv.status === "ok", "placa antiga vira Mercosul e o código é calculado no servidor");
r = await bruno("veiculo", { id: v1, tipo: "carro", placa: "XYZ1234", marca: "Fiat", modelo: "Uno" }); ok(!r.ok, "outra pessoa não edita o veículo");
r = await ana("ocorrencia", O({ objeto: "carro", tipo: "roubo", identificador: "ABC1234", descricao: "Levaram meu carro na rua", veiculoId: v1, veiculo: { marca: "Fiat", modelo: "Uno", ano: "2015", cor: "Prata", placa: "X" } }));
const o3 = r.id, d3 = (await db.doc(`ocorrencias/${o3}`).get()).data(), v1b = (await db.doc(`veiculos/${v1}`).get()).data();
ok(r.ok && d3.identificador === "ABC1C34" && JSON.stringify(Object.keys(d3.veiculo).sort()) === '["ano","cor","marca","modelo"]', "ocorrência de carro: placa no padrão Mercosul e só marca/modelo/ano/cor");
ok(v1b.status === "roubado" && v1b.ocorrenciaId === o3, "o veículo cadastrado vira 'roubado' junto");
r = await bruno("veiculo", { tipo: "carro", placa: "ABC1C34", marca: "Fiat", modelo: "Uno" });
ok(r.ok && r.alerta === true, "cadastrar placa com alerta de outra pessoa avisa");
await db.doc(`veiculos/${r.id}`).delete();

console.log("Venda de carro/moto");
await db.doc(`negocios/${U.bruno}_lojinha`).set({ donoId: U.bruno, tipo: "lojinha", nome: "Loja do Bruno", cidade: "Florianópolis", uf: "SC" }, { merge: true });
r = await bruno("conferirPlacas", { nomeNegocio: "Loja do Bruno", itens: [{ nome: "Uno 2015", placa: "ABC1C34" }] });
ok(r.ok && r.bloqueados?.[0] === "Uno 2015", "placa com alerta é bloqueada");
const auto = (await db.collection(`ocorrencias/${o3}/pistas`).get()).docs.find((x) => /tentou ser anunciado/.test(x.get("texto")));
ok(!!auto && (await db.doc(`pistas_autoria/${o3}_${auto.id}`).get()).get("uid") === U.bruno, "quem registrou recebe o alerta automático (autoria só para a moderação)");
r = await bruno("vendas", { negocioId: `${U.bruno}_lojinha`, itens: [{ placa: "ABC1C34", item: "Uno", tipo: "carro" }] });
ok(!r.ok && /alerta/.test(r.msg), "o índice também recusa placa com alerta");
r = await ana("vendas", { negocioId: `${U.bruno}_lojinha`, itens: [] }); ok(!r.ok, "não mexe no negócio de outra pessoa");
r = await bruno("vendas", { negocioId: `${U.bruno}_lojinha`, itens: [{ placa: "QWE1R23", item: "Moto CG", tipo: "moto", marca: "Honda", modelo: "CG 160", ano: "2020", cor: "Vermelha" }] });
const vv = (await db.collection("veiculos_venda").where("negocioId", "==", `${U.bruno}_lojinha`).get()).docs;
ok(r.ok && vv.length === 1 && vv[0].get("placaHash") === hash("QWE1R23") && !("placa" in vv[0].data()) && vv[0].get("cidade") === "Florianópolis", "índice com o hash (sem a placa) e a cidade do negócio");
r = await bruno("vendas", { negocioId: `${U.bruno}_lojinha`, itens: [] });
ok(r.ok && (await db.collection("veiculos_venda").where("negocioId", "==", `${U.bruno}_lojinha`).get()).size === 0, "lista vazia tira o que estava à venda");

console.log("Recuperado e limite");
r = await ana("status", { id: o3, status: "recuperado" });
ok(r.ok && (await db.doc(`veiculos/${v1}`).get()).get("status") === "recuperado", "recuperado: o veículo ligado sai do 'roubado'");
await db.doc(`servidor_limites/${U.ana}`).delete();
let n = 0; for (let i = 0; i < 6; i++) { const x = await ana("ocorrencia", O({ identificador: "" })); if (x.ok) n++; else r = x; }
ok(n === 5 && /5 ocorrências/.test(r.msg), "no máximo 5 ocorrências por dia: " + r.msg);

console.log("Desaparecidos");
await db.doc(`servidor_limites/${U.ana}`).delete(); await db.doc(`servidor_limites/${U.bruno}`).delete();
for (const x of (await db.collection("desaparecidos").get()).docs) await x.ref.delete();
const D = (extra) => ({ nome: "Joana Silva", idade: 8, condicao: "crianca", parentesco: "pais", descricao: "Cabelo cacheado, camiseta amarela", sinais: "", visto: "Praça XV", bo: "2026/123456", declaro: true, quando: Date.now() - 3600e3, lat: -27.59412, lng: -48.54871, ...extra });
r = await ana("desaparecido", D({ bo: "" })); ok(!r.ok && /boletim/.test(r.msg), "sem boletim é recusado");
r = await ana("desaparecido", D({ declaro: false })); ok(!r.ok && /declaração/.test(r.msg), "sem a declaração é recusado");
r = await ana("desaparecido", D({ condicao: "x" })); ok(!r.ok, "situação inventada é recusada");
r = await ana("desaparecido", D({ foto: "javascript:alert(1)" })); ok(!r.ok && /foto/.test(r.msg), "foto que não é imagem é recusada");
r = await ana("desaparecido", D());
const ds1 = r.id, dsd = r.ok ? (await db.doc(`desaparecidos/${ds1}`).get()).data() : {};
ok(r.ok && dsd.status === "analise" && dsd.autorId === U.ana && dsd.lat === -27.594 && dsd.geo4 && dsd.bo === "2026/123456", "registrado em análise, ponto aproximado e boletim guardado");
const sup = (await db.collection("suporte").where("desaparecidoId", "==", ds1).get()).docs[0]?.data();
ok(sup?.prioridade === "urgente" && sup?.categoria === "sos", "chamado urgente aberto para a equipe conferir");
r = await bruno("pistaDesap", { id: ds1, texto: "Vi na praça" }); ok(!r.ok, "em análise não recebe pista");
r = await ana("statusDesap", { id: ds1, status: "ativo" }); ok(!r.ok, "quem registrou não publica sozinho");
r = await bruno("statusDesap", { id: ds1, status: "removido" }); ok(!r.ok, "outra pessoa não muda o aviso");
r = await dani("statusDesap", { id: ds1, status: "ativo" });
const pub = (await db.doc(`desaparecidos/${ds1}`).get()).data();
ok(r.ok && pub.status === "ativo" && !("bo" in pub), "a moderação publica e o boletim sai do aviso");
r = await bruno("pistaDesap", { id: ds1, texto: "Vi perto do terminal", anonimo: true, lat: -27.5912, lng: -48.5511 });
const pd = r.ok ? (await db.doc(`desaparecidos/${ds1}/pistas/${r.id}`).get()).data() : {};
ok(r.ok && pd.anonimo === true && !pd.uid && pd.lat === -27.591, "pista anônima com o ponto aproximado");
ok((await db.doc(`pistas_desap_autoria/${ds1}_${r.id}`).get()).get("uid") === U.bruno, "autoria da pista só para a moderação");
r = await ana("statusDesap", { id: ds1, status: "encontrado" }); ok(r.ok && (await db.doc(`desaparecidos/${ds1}`).get()).get("status") === "encontrado", "quem registrou marca encontrado");
r = await bruno("pistaDesap", { id: ds1, texto: "Vi de novo" }); ok(!r.ok, "encerrado não recebe mais pista");
let nd = 0; for (let i = 0; i < 3; i++) { const x = await bruno("desaparecido", D()); if (x.ok) nd++; else r = x; }
ok(nd === 3, "3 avisos por dia passam"); r = await bruno("desaparecido", D()); ok(!r.ok && /3 avisos/.test(r.msg), "o 4º no mesmo dia é recusado");

console.log(falhas ? `\n${falhas} falha(s)` : "\ntudo certo");
process.exit(falhas ? 1 : 0);
