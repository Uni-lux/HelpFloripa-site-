// Testes das regras do Firestore (firestore.rules) no emulador, projeto separado "demo-regras"
// (não apaga os dados do demo-hf que o navegador usa). Uso: node testes-regras.mjs [arquivo.rules]
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { doc, setDoc, updateDoc, getDoc, writeBatch, Timestamp, serverTimestamp } from "firebase/firestore";

const arquivo = process.argv[2] || new URL("../firestore.rules", import.meta.url).pathname;
const env = await initializeTestEnvironment({ projectId: "demo-regras", firestore: { rules: readFileSync(arquivo, "utf8"), host: "127.0.0.1", port: 8085 } });
let ok = 0, falhou = 0;
const resultados = [];
async function t(nome, fn) {
  try { await fn(); ok++; resultados.push(["ok", nome]); }
  catch (e) { falhou++; resultados.push(["FALHOU", nome, e.message.split("\n")[0].slice(0, 200)]); }
}
const antigo = Timestamp.fromMillis(Date.now() - 10 * 864e5);
const ctx = (uid, verificado = true) => env.authenticatedContext(uid, { email: `${uid}@t.com`, email_verified: verificado }).firestore();
async function semRegras(fn) { await env.withSecurityRulesDisabled(async (c) => fn(c.firestore())); }

// ---------- dados base ----------
await env.clearFirestore();
await semRegras(async (db) => {
  for (const u of ["ana", "bia", "dono"]) await setDoc(doc(db, "usuarios", u), { uid: u, nome: u, criadoEm: antigo, aceiteTermos: true });
  await setDoc(doc(db, "perfis_publicos", "bia"), { uid: "bia", nome: "Bia", cidade: "Florianópolis" });
  await setDoc(doc(db, "admins", "adm"), { nome: "Adm" });
});

// ===================== ETAPA 3: endereço para o Brasil todo =====================
const perfil = (extra) => ({ uid: "ana", nome: "Ana", cidade: "Florianópolis", ...extra });
await t("perfil: cria com uf + cidadeIbge certos (SC/Florianópolis)", () => assertSucceeds(setDoc(doc(ctx("ana"), "perfis_publicos", "ana"), perfil({ uf: "SC", cidadeIbge: 4205407 }))));
await t("perfil: atualiza para SP/São Paulo", () => assertSucceeds(updateDoc(doc(ctx("ana"), "perfis_publicos", "ana"), { cidade: "São Paulo", uf: "SP", cidadeIbge: 3550308 })));
await t("perfil: DF/Brasília (código 5300108)", () => assertSucceeds(updateDoc(doc(ctx("ana"), "perfis_publicos", "ana"), { cidade: "Brasília", uf: "DF", cidadeIbge: 5300108 })));
await t("perfil: recusa UF inexistente", () => assertFails(updateDoc(doc(ctx("ana"), "perfis_publicos", "ana"), { uf: "XX" })));
await t("perfil: recusa código de outro estado (SC + código de SP)", () => assertFails(updateDoc(doc(ctx("ana"), "perfis_publicos", "ana"), { uf: "SC", cidadeIbge: 3550308 })));
await t("perfil: recusa código em texto", () => assertFails(updateDoc(doc(ctx("ana"), "perfis_publicos", "ana"), { uf: "SC", cidadeIbge: "4205407" })));
await t("perfil: recusa código sem estado", () => assertFails(setDoc(doc(ctx("bia"), "perfis_publicos", "bia"), { uid: "bia", nome: "Bia", cidadeIbge: 4205407 })));
await t("perfil: recusa código fora da faixa", () => assertFails(updateDoc(doc(ctx("ana"), "perfis_publicos", "ana"), { uf: "SC", cidadeIbge: 42054070 })));
await t("perfil: aceita limpar (uf vazio e código nulo)", () => assertSucceeds(updateDoc(doc(ctx("ana"), "perfis_publicos", "ana"), { cidade: "", uf: "", cidadeIbge: null })));
await t("perfil antigo sem uf continua editável (só nome)", () => assertSucceeds(updateDoc(doc(ctx("bia"), "perfis_publicos", "bia"), { nome: "Bia S." })));
await t("perfil: recusa campo desconhecido", () => assertFails(updateDoc(doc(ctx("ana"), "perfis_publicos", "ana"), { estado: "SC" })));

const neg = (extra) => ({ donoId: "dono", tipo: "servicos", nome: "Reparos", cidade: "Florianópolis", uf: "SC", cidadeIbge: 4205407, bairro: "Centro", criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(), ...extra });
await t("negócio: cria com estado, cidade, bairro e endereço", () => assertSucceeds(setDoc(doc(ctx("dono"), "negocios", "dono_servicos"), neg({ rua: "Rua Felipe Schmidt", numero: "120", complemento: "Sala 3", cep: "88010001" }))));
await t("negócio: recusa CEP com traço", () => assertFails(setDoc(doc(ctx("dono"), "negocios", "dono_delivery"), neg({ tipo: "delivery", cep: "88010-001" }))));
await t("negócio: recusa rua com mais de 100 letras", () => assertFails(setDoc(doc(ctx("dono"), "negocios", "dono_delivery"), neg({ tipo: "delivery", rua: "x".repeat(101) }))));
await t("negócio: recusa cidade de outro estado", () => assertFails(setDoc(doc(ctx("dono"), "negocios", "dono_delivery"), neg({ tipo: "delivery", uf: "RS", cidadeIbge: 4205407 }))));
await t("negócio: sem endereço detalhado continua valendo", () => assertSucceeds(setDoc(doc(ctx("dono"), "negocios", "dono_lojinha"), { donoId: "dono", tipo: "lojinha", nome: "Loja", cidade: "Palhoça" })));

const anuncio = (extra) => ({ donoId: "dono", tipo: "imovel", titulo: "Apto 2 quartos", finalidade: "aluguel", categoria: "apartamento", bairro: "Trindade", cidade: "Florianópolis", uf: "SC", cidadeIbge: 4205407, ...extra });
await t("anúncio: cria com estado, cidade, bairro, rua e CEP", () => assertSucceeds(setDoc(doc(ctx("dono"), "anuncios", "a1"), anuncio({ rua: "Rua Lauro Linhares", cep: "88036001" }))));
await t("anúncio: recusa UF errada", () => assertFails(setDoc(doc(ctx("dono"), "anuncios", "a2"), anuncio({ uf: "sc" }))));
await t("anúncio: recusa campo desconhecido", () => assertFails(setDoc(doc(ctx("dono"), "anuncios", "a3"), anuncio({ estado: "SC" }))));
await t("usuário: endereço completo na parte privada", () => assertSucceeds(setDoc(doc(ctx("ana"), "usuarios", "ana"), { cidade: "Florianópolis", uf: "SC", cidadeIbge: 4205407, endereco: { cep: "88010001", uf: "SC", cidade: "Florianópolis", cidadeIbge: 4205407, bairro: "Centro", rua: "Rua A", numero: "1", complemento: "" } }, { merge: true })));
await t("usuário: outra pessoa não lê o endereço", () => assertFails(getDoc(doc(ctx("bia"), "usuarios", "ana"))));


// ===================== ETAPA 4: avaliações, denúncias, suporte e atendimento =====================
const par = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);
await semRegras(async (db) => {
  await setDoc(doc(db, "usuarios", "nova"), { uid: "nova", nome: "Nova", criadoEm: Timestamp.now(), aceiteTermos: true });
  await setDoc(doc(db, "usuarios", "edu"), { uid: "edu", nome: "Edu", criadoEm: antigo, aceiteTermos: true });
  for (const u of ["ana", "bia", "nova", "edu"]) await setDoc(doc(db, "conversas", par(u, "dono")), { participantes: [u, "dono"].sort(), falaram: { [u]: true, dono: u !== "edu" } });
  await setDoc(doc(db, "vinculos", par("ana", "dono")), { participantes: [par("ana", "dono").split("_")].flat(), de: "ana", para: "dono", tipoDe: "amigo", tipoPara: "amigo", status: "aceito" });
  await setDoc(doc(db, "conversas", par("ana", "bia"), "mensagens", "m1"), { remetenteId: "bia", texto: "oi", criadoEm: antigo });
  await setDoc(doc(db, "conversas", par("ana", "bia")), { participantes: ["ana", "bia"], falaram: { ana: true, bia: true } });
});
// Avaliação do cliente + resumo do negócio, gravados juntos (como o site faz).
async function avaliarNeg(quem, idAval, nota = 5, extra = {}) {
  const db = ctx(quem), b = writeBatch(db);
  b.set(doc(db, "avaliacoes", idAval), { tipo: "negocio", autorId: quem, alvoId: "dono", negocioId: "dono_servicos", nota, comentario: "", chaves: ["neg_dono_servicos"], criadoEm: serverTimestamp(), ...extra });
  const r = await getDoc(doc(db, "notas", "neg_dono_servicos"));
  if (!r.exists()) b.set(doc(db, "notas", "neg_dono_servicos"), { total: 1, soma: nota, n1: 0, n2: 0, n3: 0, n4: 0, n5: 0, [`n${nota}`]: 1, ultima: idAval });
  else b.set(doc(db, "notas", "neg_dono_servicos"), { total: r.data().total + 1, soma: r.data().soma + nota, [`n${nota}`]: (r.data()[`n${nota}`] || 0) + 1, ultima: idAval }, { merge: true });
  return b.commit();
}
await t("avaliação: amiga (vínculo aceito) avalia o negócio", () => assertSucceeds(avaliarNeg("ana", "n_dono_servicos_ana")));
await t("avaliação: a mesma pessoa não cria outra (id de outra pessoa)", () => assertFails(avaliarNeg("ana", "n_dono_servicos_bia")));
await t("avaliação: conta com menos de 3 dias não avalia", () => assertFails(avaliarNeg("nova", "n_dono_servicos_nova")));
await t("avaliação: sem o negócio ter respondido não avalia", () => assertFails(avaliarNeg("edu", "n_dono_servicos_edu")));
await t("avaliação: e-mail não confirmado não avalia", async () => { const db = env.authenticatedContext("bia", { email: "bia@t.com", email_verified: false }).firestore(); await assertFails(setDoc(doc(db, "avaliacoes", "n_dono_servicos_bia"), { tipo: "negocio", autorId: "bia", alvoId: "dono", negocioId: "dono_servicos", nota: 4, chaves: ["neg_dono_servicos"], criadoEm: serverTimestamp() })); });
await t("avaliação: cliente sem vínculo continua avaliando", () => assertSucceeds(avaliarNeg("bia", "n_dono_servicos_bia", 4)));
async function avaliarCli(quem, cliente, extra = {}) {
  const db = ctx(quem), b = writeBatch(db), id = `c_dono_servicos_${cliente}`;
  b.set(doc(db, "avaliacoes", id), { tipo: "cliente", autorId: quem, alvoId: cliente, negocioId: "dono_servicos", nota: 5, chaves: [`cli_${cliente}`], criadoEm: serverTimestamp(), ...extra });
  b.set(doc(db, "notas", `cli_${cliente}`), { total: 1, soma: 5, n1: 0, n2: 0, n3: 0, n4: 0, n5: 1, ultima: id });
  return b.commit();
}
await t("avaliação: negócio avalia o cliente que conversou", () => assertSucceeds(avaliarCli("dono", "ana")));
await t("avaliação: negócio não avalia quem não respondeu (falaram)", () => assertFails(avaliarCli("dono", "edu2")));
await t("avaliação: outra pessoa não avalia em nome do negócio", () => assertFails(avaliarCli("bia", "nova")));

const den = (extra) => ({ tipo: "mensagem", alvoId: "bia", itemId: "m1", conversaId: par("ana", "bia"), autorId: "ana", motivo: "spam", detalhe: "", trecho: "oi", status: "nova", criadoEm: serverTimestamp(), ...extra });
await t("denúncia: mensagem com contexto (ids antes e depois)", () => assertSucceeds(setDoc(doc(ctx("ana"), "denuncias", "mensagem_m1_ana"), den({ contexto: ["m0", "m1", "m2"] }))));
await t("denúncia: contexto com mais de 12 ids é recusado", () => assertFails(setDoc(doc(ctx("ana"), "denuncias", "mensagem_m1_ana"), den({ contexto: Array.from({ length: 13 }, (_, i) => "m" + i) }))));
await t("denúncia: contexto só vale para mensagem", () => assertFails(setDoc(doc(ctx("ana"), "denuncias", "perfil_bia_ana"), { tipo: "perfil", alvoId: "bia", itemId: "bia", autorId: "ana", motivo: "spam", status: "nova", criadoEm: serverTimestamp(), contexto: ["x"] })));
await t("denúncia: moderação abre a mensagem do contexto (uma por vez)", async () => { await semRegras((db) => setDoc(doc(db, "admins", "mod"), { nome: "Mod", papel: "moderacao" })); await assertSucceeds(getDoc(doc(ctx("mod"), "conversas", par("ana", "bia"), "mensagens", "m1"))); });

async function abrirConversaSuporte(quem, uid, extra = {}, comMensagem = true) {
  const db = ctx(quem), b = writeBatch(db), id = "eq_" + uid + "_" + Math.random().toString(36).slice(2, 7);
  b.set(doc(db, "suporte", id), { uid, nome: "Ana", assunto: "Sobre seu anúncio", categoria: "negocio", status: "respondido", criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(), ultimaDe: "equipe", abertoPor: quem, atendidoPor: quem, ...extra });
  if (comMensagem) b.set(doc(db, "suporte", id, "mensagens", "inicio"), { autorId: quem, equipe: true, texto: "Olá! Aqui é o suporte.", em: serverTimestamp() });
  await b.commit();
  return id;
}
let idSup = "";
await t("suporte: a equipe abre conversa com um usuário", async () => { idSup = await abrirConversaSuporte("adm", "ana"); });
await t("suporte: o usuário vê a conversa aberta pela equipe", () => assertSucceeds(getDoc(doc(ctx("ana"), "suporte", idSup))));
await t("suporte: o usuário lê a mensagem da equipe", () => assertSucceeds(getDoc(doc(ctx("ana"), "suporte", idSup, "mensagens", "inicio"))));
await t("suporte: o usuário responde", async () => { const db = ctx("ana"), b = writeBatch(db); b.set(doc(db, "suporte", idSup, "mensagens", "r1"), { autorId: "ana", equipe: false, texto: "Obrigada!", em: serverTimestamp() }); b.update(doc(db, "suporte", idSup), { status: "aberto", atualizadoEm: serverTimestamp(), ultimaDe: "usuario" }); await assertSucceeds(b.commit()); });
await t("suporte: outra pessoa não lê", () => assertFails(getDoc(doc(ctx("bia"), "suporte", idSup))));
await t("suporte: usuário comum não abre conversa em nome de outro", () => assertFails(abrirConversaSuporte("bia", "ana")));
await t("suporte: equipe não abre sem a primeira mensagem", () => assertFails(abrirConversaSuporte("adm", "ana", {}, false)));
await t("suporte: equipe não abre para conta que não existe", () => assertFails(abrirConversaSuporte("adm", "fantasma")));
await t("suporte: quem abre pode ficar como responsável", () => assertSucceeds(abrirConversaSuporte("adm", "bia", { responsavel: "adm", responsavelNome: "Adm", assumidoEm: serverTimestamp() })));
await t("suporte: não põe outra pessoa como responsável ao abrir", () => assertFails(abrirConversaSuporte("adm", "bia", { responsavel: "mod", responsavelNome: "Mod", assumidoEm: serverTimestamp() })));
await t("suporte: abertoPor precisa ser quem abre", () => assertFails(abrirConversaSuporte("adm", "ana", { abertoPor: "mod" })));

const atend = (a) => updateDoc(doc(ctx("bia"), "perfis_publicos", "bia"), { atendimento: a });
await t("atendimento: horário por dia, almoço e volta", () => assertSucceeds(atend({ horario: { dias: [1, 2, 3, 4, 5, 6], inicio: "08:00", fim: "18:00" }, semana: ["", "08:00-18:00", "08:00-18:00", "08:00-18:00", "08:00-18:00", "08:00-17:00", "09:00-12:00"], almoco: "12:00-13:00", ausente: true, mensagem: "Férias", volta: Timestamp.fromMillis(Date.now() + 5 * 864e5) })));
await t("atendimento: os 7 dias", () => assertSucceeds(atend({ semana: ["10:00-14:00", "08:00-18:00", "08:00-18:00", "08:00-18:00", "08:00-18:00", "08:00-18:00", "08:00-12:00"], almoco: null, volta: null, ausente: false })));
await t("atendimento: recusa hora inválida", () => assertFails(atend({ semana: ["", "25:00-26:00", "", "", "", "", ""] })));
await t("atendimento: recusa texto solto num dia", () => assertFails(atend({ semana: ["", "8h às 18h", "", "", "", "", ""] })));
await t("atendimento: recusa número no lugar do texto", () => assertFails(atend({ semana: ["", 8, "", "", "", "", ""] })));
await t("atendimento: recusa semana com 8 dias", () => assertFails(atend({ semana: ["", "", "", "", "", "", "", "08:00-18:00"] })));
await t("atendimento: recusa semana em mapa", () => assertFails(atend({ semana: { 1: "08:00-18:00" } })));
await t("atendimento: recusa almoço em formato errado", () => assertFails(atend({ almoco: "12h-13h" })));
await t("atendimento: recusa volta em texto", () => assertFails(atend({ volta: "20/10" })));
await t("atendimento: recusa campo desconhecido", () => assertFails(atend({ feriados: [] })));
await t("atendimento: formato antigo continua valendo", () => assertSucceeds(atend({ horario: { dias: [1, 3], inicio: "10:00", fim: "16:00" }, ausente: false, mensagem: "" })));

// ---------- resultado ----------
for (const r of resultados) console.log(r[0] === "ok" ? "  ✔" : "  ✘", r[1], r[2] ? "→ " + r[2] : "");
console.log(`\n${ok} passaram, ${falhou} falharam (${arquivo})`);
await env.cleanup();
process.exit(falhou ? 1 : 0);
