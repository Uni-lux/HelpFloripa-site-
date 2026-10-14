// Testes das regras do Firestore (firestore.rules) no emulador, projeto separado "demo-regras"
// (não apaga os dados do demo-hf que o navegador usa). Uso: node testes-regras.mjs [arquivo.rules]
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { doc, setDoc, updateDoc, getDoc, getDocs, collection, query, where, writeBatch, Timestamp, serverTimestamp, increment, deleteField, deleteDoc } from "firebase/firestore";

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


// ===================== ETAPA 5: conferência geral (o que já existia antes) =====================
// Mensagens: participante, limite diário (ritmo/{uid}) gravado junto, bloqueio.
async function mandarMsg(quem, conv, texto, primeira) {
  const db = ctx(quem), b = writeBatch(db);
  b.set(doc(collection(db, "conversas", conv, "mensagens")), { remetenteId: quem, texto, criadoEm: serverTimestamp() });
  if (primeira) b.set(doc(db, "ritmo", quem), { inicio: serverTimestamp(), msg: 1, pub: 0, com: 0, parc: 0, ultimaEm: serverTimestamp(), ultimoTipo: "msg" });
  else b.set(doc(db, "ritmo", quem), { msg: increment(1), ultimaEm: serverTimestamp(), ultimoTipo: "msg" }, { merge: true });
  return b.commit();
}
const convAB = par("ana", "bia");
await t("mensagem: participante manda (com o limite diário junto)", () => assertSucceeds(mandarMsg("ana", convAB, "Oi Bia", true)));
await t("mensagem: segunda mensagem soma 1 no limite", () => assertSucceeds(mandarMsg("ana", convAB, "Tudo bem?", false)));
await t("mensagem: sem contar no limite diário é recusada", () => assertFails(setDoc(doc(collection(ctx("ana"), "conversas", convAB, "mensagens")), { remetenteId: "ana", texto: "x", criadoEm: serverTimestamp() })));
await t("mensagem: quem não participa não manda", () => assertFails(mandarMsg("edu", convAB, "intruso", true)));
await t("mensagem: quem não participa não lê", () => assertFails(getDocs(collection(ctx("edu"), "conversas", convAB, "mensagens"))));
await t("mensagem: não se passa por outra pessoa", async () => { const db = ctx("ana"), b = writeBatch(db); b.set(doc(collection(db, "conversas", convAB, "mensagens")), { remetenteId: "bia", texto: "fake", criadoEm: serverTimestamp() }); b.set(doc(db, "ritmo", "ana"), { msg: increment(1), ultimaEm: serverTimestamp(), ultimoTipo: "msg" }, { merge: true }); await assertFails(b.commit()); });
await t("mensagem: citação de mensagem real é aceita", async () => { const db = ctx("ana"), b = writeBatch(db); b.set(doc(collection(db, "conversas", convAB, "mensagens")), { remetenteId: "ana", texto: "respondendo", resposta: { id: "m1", texto: "oi", remetenteId: "bia" }, criadoEm: serverTimestamp() }); b.set(doc(db, "ritmo", "ana"), { msg: increment(1), ultimaEm: serverTimestamp(), ultimoTipo: "msg" }, { merge: true }); await assertSucceeds(b.commit()); });
await t("mensagem: citação inventada (autor errado) é recusada", async () => { const db = ctx("ana"), b = writeBatch(db); b.set(doc(collection(db, "conversas", convAB, "mensagens")), { remetenteId: "ana", texto: "x", resposta: { id: "m1", texto: "oi", remetenteId: "ana" }, criadoEm: serverTimestamp() }); b.set(doc(db, "ritmo", "ana"), { msg: increment(1), ultimaEm: serverTimestamp(), ultimoTipo: "msg" }, { merge: true }); await assertFails(b.commit()); });
await semRegras((db) => setDoc(doc(db, "bloqueios", "bia_ana"), { bloqueadorId: "bia", bloqueadoId: "ana" }));
await t("mensagem: com bloqueio, ninguém manda", () => assertFails(mandarMsg("ana", convAB, "oi?", false)));
await semRegras(async (db) => { const { deleteDoc } = await import("firebase/firestore"); await deleteDoc(doc(db, "bloqueios", "bia_ana")); });
await t("conversa: cada um marca só a própria leitura", () => assertSucceeds(updateDoc(doc(ctx("ana"), "conversas", convAB), { "lidoEm.ana": serverTimestamp() })));
await t("conversa: não marca a leitura da outra pessoa", () => assertFails(updateDoc(doc(ctx("ana"), "conversas", convAB), { "lidoEm.bia": serverTimestamp() })));

// Chat da equipe: grupo, conversa individual, anexos, citar e reações.
await semRegras((db) => setDoc(doc(db, "admins", "mod2"), { nome: "Mod 2", papel: "suporte" }));
await t("equipe: manda no grupo", () => assertSucceeds(setDoc(doc(ctx("adm"), "equipe_chat", "g1"), { autorId: "adm", nome: "Adm", texto: "Bom dia", em: serverTimestamp() })));
await t("equipe: quem não é da equipe não lê o grupo", () => assertFails(getDoc(doc(ctx("ana"), "equipe_chat", "g1"))));
await t("equipe: citar uma mensagem", () => assertSucceeds(setDoc(doc(ctx("mod"), "equipe_chat", "g2"), { autorId: "mod", nome: "Mod", texto: "Combinado", resposta: { id: "g1", autorId: "adm", nome: "Adm", texto: "Bom dia" }, em: serverTimestamp() })));
await t("equipe: reagir com emoji (só a própria reação)", () => assertSucceeds(updateDoc(doc(ctx("mod"), "equipe_chat", "g1"), { "reacoes.mod": "👍" })));
await t("equipe: não reage em nome de outra pessoa", () => assertFails(updateDoc(doc(ctx("mod"), "equipe_chat", "g1"), { "reacoes.adm": "👍" })));
await t("equipe: emoji fora da lista é recusado", () => assertFails(updateDoc(doc(ctx("mod"), "equipe_chat", "g1"), { "reacoes.mod": "💩" })));
await t("equipe: tirar a própria reação", () => assertSucceeds(updateDoc(doc(ctx("mod"), "equipe_chat", "g1"), { "reacoes.mod": deleteField() })));
await t("equipe: não edita o texto de uma mensagem", () => assertFails(updateDoc(doc(ctx("adm"), "equipe_chat", "g1"), { texto: "editado" })));
const parEq = par("adm", "mod");
await t("equipe: abre conversa individual", () => assertSucceeds(setDoc(doc(ctx("adm"), "equipe_dm", parEq), { participantes: parEq.split("_"), ultimaEm: serverTimestamp(), ultimaTexto: "Oi", ultimoAutor: "adm", lidoEm: {} })));
await t("equipe: manda na conversa individual com anexo de áudio (gravado junto)", async () => {
  const db = ctx("adm"), b = writeBatch(db);
  b.set(doc(db, "equipe_anexos", "ax1"), { autorId: "adm", conversa: parEq, dados: "data:audio/webm;codecs=opus;base64,AAAA", em: serverTimestamp() });
  b.set(doc(db, "equipe_dm", parEq, "mensagens", "d1"), { autorId: "adm", nome: "Adm", texto: "", tipoArquivo: "audio", anexo: "ax1", nomeArquivo: "audio", tamanho: 4, duracao: 3, em: serverTimestamp() });
  await assertSucceeds(b.commit());
});
await t("equipe: a outra pessoa da conversa ouve o anexo", () => assertSucceeds(getDoc(doc(ctx("mod"), "equipe_anexos", "ax1"))));
await t("equipe: terceira pessoa da equipe não lê a conversa individual", () => assertFails(getDoc(doc(ctx("mod2"), "equipe_dm", parEq, "mensagens", "d1"))));
await t("equipe: terceira pessoa da equipe não abre o anexo", () => assertFails(getDoc(doc(ctx("mod2"), "equipe_anexos", "ax1"))));
await t("equipe: anexo de outra conversa é recusado", async () => {
  const db = ctx("adm"), b = writeBatch(db);
  b.set(doc(db, "equipe_anexos", "ax2"), { autorId: "adm", conversa: "equipe", dados: "data:image/png;base64,AAAA", em: serverTimestamp() });
  b.set(doc(db, "equipe_dm", parEq, "mensagens", "d2"), { autorId: "adm", nome: "Adm", texto: "", tipoArquivo: "imagem", anexo: "ax2", em: serverTimestamp() });
  await assertFails(b.commit());
});
await t("equipe: reage na conversa individual", () => assertSucceeds(updateDoc(doc(ctx("mod"), "equipe_dm", parEq, "mensagens", "d1"), { "reacoes.mod": "❤️" })));
await t("equipe: marca a leitura da conversa individual", () => assertSucceeds(updateDoc(doc(ctx("mod"), "equipe_dm", parEq), { "lidoEm.mod": serverTimestamp() })));

// Editar e apagar mensagens (para todos fica "apagou esta mensagem"; o conteúdo abre por 24 horas).
// Só até 10 minutos depois de enviar: "recente" = enviada há 1 minuto.
const recente = Timestamp.fromMillis(Date.now() - 60e3), passou = Timestamp.fromMillis(Date.now() - 11 * 60e3);
await semRegras(async (db) => {
  await setDoc(doc(db, "conversas", convAB, "mensagens", "e1"), { remetenteId: "ana", texto: "Oi Bia", criadoEm: recente });
  await setDoc(doc(db, "conversas", convAB, "mensagens", "e2"), { remetenteId: "ana", texto: "foto", tipoArquivo: "imagem", arquivoUrl: "data:image/png;base64,AAAA", criadoEm: recente });
  await setDoc(doc(db, "conversas", convAB, "mensagens", "e3"), { remetenteId: "ana", texto: "", tipoArquivo: "cartao", cartao: { nome: "x" }, criadoEm: recente });
  await setDoc(doc(db, "admins", "mod"), { nome: "Mod", papel: "moderacao" }, { merge: true });
});
const editar = (quem, id, texto, edicoes) => updateDoc(doc(ctx(quem), "conversas", convAB, "mensagens", id), { texto, editadaEm: serverTimestamp(), edicoes });
await t("editar: quem enviou edita (guarda o texto de antes)", () => assertSucceeds(editar("ana", "e1", "Oi Bia!", [{ texto: "Oi Bia", em: recente }])));
await t("editar: segunda edição mantém a primeira", async () => { const m = (await getDoc(doc(ctx("ana"), "conversas", convAB, "mensagens", "e1"))).data(); await assertSucceeds(editar("ana", "e1", "Oi Bia!!", [...m.edicoes, { texto: m.texto, em: m.editadaEm }])); });
await t("editar: não reescreve o histórico", async () => { const m = (await getDoc(doc(ctx("ana"), "conversas", convAB, "mensagens", "e1"))).data(); await assertFails(editar("ana", "e1", "x", [{ texto: "outra coisa", em: recente }, m.edicoes[1], { texto: m.texto, em: m.editadaEm }])); });
await t("editar: versão anterior com texto inventado é recusada", async () => { const m = (await getDoc(doc(ctx("ana"), "conversas", convAB, "mensagens", "e1"))).data(); await assertFails(editar("ana", "e1", "x", [...m.edicoes, { texto: "nunca disse", em: m.editadaEm }])); });
await t("editar: a outra pessoa não edita", () => assertFails(editar("bia", "e1", "hack", [{ texto: "Oi Bia!!", em: recente }])));
await t("editar: legenda de foto", () => assertSucceeds(editar("ana", "e2", "foto da obra", [{ texto: "foto", em: recente }])));
await t("editar: não troca a foto junto", () => assertFails(updateDoc(doc(ctx("ana"), "conversas", convAB, "mensagens", "e2"), { arquivoUrl: "data:image/png;base64,BBBB" })));
await t("editar: cartão não se edita", () => assertFails(editar("ana", "e3", "x", [{ texto: "", em: recente }])));
async function apagarTodos(quem, id, conteudo) {
  const db = ctx(quem), b = writeBatch(db);
  b.set(doc(db, "conversas", convAB, "mensagens", id), { remetenteId: quem, criadoEm: recente, apagada: { por: quem, em: serverTimestamp() } });
  b.set(doc(db, "conversas", convAB, "apagadas", id), { remetenteId: quem, conteudo, apagadaEm: serverTimestamp() });
  return b.commit();
}
await t("apagar p/ todos: a outra pessoa não apaga", () => assertFails(apagarTodos("bia", "e2", { texto: "foto da obra", tipoArquivo: "imagem", arquivoUrl: "data:image/png;base64,AAAA" })));
await t("apagar p/ todos: conteúdo inventado é recusado", () => assertFails(apagarTodos("ana", "e2", { texto: "outra", tipoArquivo: "imagem", arquivoUrl: "data:image/png;base64,AAAA" })));
await t("apagar p/ todos: sem guardar o conteúdo é recusado", () => assertFails(updateDoc(doc(ctx("ana"), "conversas", convAB, "mensagens", "e2"), { texto: deleteField(), tipoArquivo: deleteField(), arquivoUrl: deleteField(), edicoes: deleteField(), editadaEm: deleteField(), apagada: { por: "ana", em: serverTimestamp() } })));
await t("apagar p/ todos: quem enviou apaga (foto)", () => assertSucceeds(apagarTodos("ana", "e2", { texto: "foto da obra", tipoArquivo: "imagem", arquivoUrl: "data:image/png;base64,AAAA", edicoes: [{ texto: "foto", em: recente }] })));
await t("apagar p/ todos: os dois veem a mensagem apagada (24 h)", async () => { await assertSucceeds(getDoc(doc(ctx("ana"), "conversas", convAB, "apagadas", "e2"))); await assertSucceeds(getDoc(doc(ctx("bia"), "conversas", convAB, "apagadas", "e2"))); });
await t("apagar p/ todos: quem não participa não vê", () => assertFails(getDoc(doc(ctx("edu"), "conversas", convAB, "apagadas", "e2"))));
await t("apagar p/ todos: mensagem apagada não se edita", () => assertFails(editar("ana", "e2", "volta", [{ texto: "", em: recente }])));
await t("apagar p/ todos: ninguém apaga o conteúdo antes das 24 h", () => assertFails(deleteDoc(doc(ctx("ana"), "conversas", convAB, "apagadas", "e2"))));
await t("apagar p/ todos: quem recebeu marca como denunciada", () => assertSucceeds(updateDoc(doc(ctx("bia"), "conversas", convAB, "apagadas", "e2"), { denunciada: true })));
await t("apagar p/ todos: quem apagou não marca nem muda o conteúdo", async () => { await assertFails(updateDoc(doc(ctx("ana"), "conversas", convAB, "apagadas", "e2"), { denunciada: true })); await assertFails(updateDoc(doc(ctx("bia"), "conversas", convAB, "apagadas", "e2"), { conteudo: {} })); });
await t("apagar p/ todos: a moderação abre o conteúdo", () => assertSucceeds(getDoc(doc(ctx("mod"), "conversas", convAB, "apagadas", "e2"))));
await semRegras((db) => setDoc(doc(db, "conversas", convAB, "apagadas", "velha"), { remetenteId: "ana", conteudo: { texto: "x" }, apagadaEm: Timestamp.fromMillis(Date.now() - 25 * 36e5) }));
await semRegras((db) => setDoc(doc(db, "conversas", convAB, "apagadas", "velhaDen"), { remetenteId: "ana", conteudo: { texto: "x" }, apagadaEm: Timestamp.fromMillis(Date.now() - 25 * 36e5), denunciada: true }));
await t("apagar p/ todos: depois de 24 h ninguém da conversa lê", async () => { await assertFails(getDoc(doc(ctx("ana"), "conversas", convAB, "apagadas", "velha"))); await assertFails(getDoc(doc(ctx("bia"), "conversas", convAB, "apagadas", "velha"))); });
await t("apagar p/ todos: depois de 24 h qualquer um dos dois apaga de vez", () => assertSucceeds(deleteDoc(doc(ctx("bia"), "conversas", convAB, "apagadas", "velha"))));
await semRegras(async (db) => {
  await setDoc(doc(db, "conversas", convAB, "apagadas", "velhaDenAntes"), { remetenteId: "ana", conteudo: { texto: "x" }, apagadaEm: Timestamp.fromMillis(Date.now() - 25 * 36e5) });
  await setDoc(doc(db, "denuncias", "mensagem_velhaDenAntes_bia"), { tipo: "mensagem", alvoId: "ana", itemId: "velhaDenAntes", conversaId: convAB, autorId: "bia", motivo: "outro", status: "nova", criadoEm: recente });
});
await t("apagar p/ todos: denunciada antes de apagar também fica (existe a denúncia)", () => assertFails(deleteDoc(doc(ctx("ana"), "conversas", convAB, "apagadas", "velhaDenAntes"))));
await t("apagar p/ todos: a moderação apaga a denunciada quando quiser", () => assertSucceeds(deleteDoc(doc(ctx("mod"), "conversas", convAB, "apagadas", "velhaDenAntes"))));
await t("apagar p/ todos: denunciada fica para a moderação", async () => { await assertFails(deleteDoc(doc(ctx("ana"), "conversas", convAB, "apagadas", "velhaDen"))); await assertSucceeds(getDoc(doc(ctx("mod"), "conversas", convAB, "apagadas", "velhaDen"))); });
await semRegras(async (db) => { await setDoc(doc(db, "conversas", convAB, "mensagens", "v1"), { remetenteId: "ana", texto: "de 11 minutos atrás", criadoEm: passou }); });
await t("10 min: depois de 10 minutos não edita", () => assertFails(updateDoc(doc(ctx("ana"), "conversas", convAB, "mensagens", "v1"), { texto: "mudou", editadaEm: serverTimestamp(), edicoes: [{ texto: "de 11 minutos atrás", em: passou }] })));
await t("10 min: depois de 10 minutos não apaga para todos", async () => { const db = ctx("ana"), b = writeBatch(db); b.set(doc(db, "conversas", convAB, "mensagens", "v1"), { remetenteId: "ana", criadoEm: passou, apagada: { por: "ana", em: serverTimestamp() } }); b.set(doc(db, "conversas", convAB, "apagadas", "v1"), { remetenteId: "ana", conteudo: { texto: "de 11 minutos atrás" }, apagadaEm: serverTimestamp() }); await assertFails(b.commit()); });
await t("10 min: depois de 10 minutos não apaga de vez", () => assertFails(deleteDoc(doc(ctx("ana"), "conversas", convAB, "mensagens", "v1"))));
await t("apagar para mim: fica só na própria conta", () => assertSucceeds(setDoc(doc(ctx("bia"), "usuarios", "bia"), { ocultasMsg: { [convAB]: ["e1"] } }, { merge: true })));

// Chat da equipe: editar e apagar.
await semRegras(async (db) => {
  await setDoc(doc(db, "equipe_chat", "q1"), { autorId: "adm", nome: "Adm", texto: "Reunião 10h", em: recente });
  await setDoc(doc(db, "equipe_dm", parEq, "mensagens", "q2"), { autorId: "adm", nome: "Adm", texto: "Oi", em: recente });
});
await t("equipe: edita a própria mensagem", () => assertSucceeds(updateDoc(doc(ctx("adm"), "equipe_chat", "q1"), { texto: "Reunião 11h", editadaEm: serverTimestamp(), edicoes: [{ texto: "Reunião 10h", em: recente }] })));
await t("equipe: não edita a de outra pessoa", () => assertFails(updateDoc(doc(ctx("mod"), "equipe_chat", "q1"), { texto: "x", editadaEm: serverTimestamp(), edicoes: [{ texto: "Reunião 11h", em: recente }] })));
async function apagarEq(quem, ref, conversa, conteudo, base) {
  const db = ctx(quem), b = writeBatch(db);
  b.set(doc(db, ...ref), { autorId: quem, nome: "Adm", em: recente, apagada: { por: quem, em: serverTimestamp() } });
  b.set(doc(db, "equipe_apagadas", ref[ref.length - 1]), { autorId: quem, conversa, conteudo, apagadaEm: serverTimestamp() });
  return b.commit();
}
await t("equipe: outra pessoa não apaga para todos", () => assertFails(apagarEq("mod", ["equipe_chat", "q1"], "equipe", { texto: "Reunião 11h" })));
await t("equipe: apaga para todos no grupo", async () => { const m = (await getDoc(doc(ctx("adm"), "equipe_chat", "q1"))).data(); await assertSucceeds(apagarEq("adm", ["equipe_chat", "q1"], "equipe", { texto: m.texto, edicoes: m.edicoes })); });
await t("equipe: todos do grupo veem a apagada (24 h)", () => assertSucceeds(getDoc(doc(ctx("mod2"), "equipe_apagadas", "q1"))));
await t("equipe: apagar na conversa individual", () => assertSucceeds(apagarEq("adm", ["equipe_dm", parEq, "mensagens", "q2"], parEq, { texto: "Oi" })));
await t("equipe: terceira pessoa não vê a apagada da individual", () => assertFails(getDoc(doc(ctx("mod2"), "equipe_apagadas", "q2"))));
await t("equipe: conteúdo de outra conversa é recusado", () => assertFails(apagarEq("adm", ["equipe_dm", parEq, "mensagens", "d1"], "equipe", { texto: "" })));
await semRegras((db) => setDoc(doc(db, "equipe_chat", "q3"), { autorId: "adm", nome: "Adm", texto: "Antiga", em: passou }));
await t("equipe 10 min: depois de 10 minutos não edita", () => assertFails(updateDoc(doc(ctx("adm"), "equipe_chat", "q3"), { texto: "x", editadaEm: serverTimestamp(), edicoes: [{ texto: "Antiga", em: passou }] })));
await t("equipe 10 min: depois de 10 minutos não apaga para todos", async () => { const db = ctx("adm"), b = writeBatch(db); b.set(doc(db, "equipe_chat", "q3"), { autorId: "adm", nome: "Adm", em: passou, apagada: { por: "adm", em: serverTimestamp() } }); b.set(doc(db, "equipe_apagadas", "q3"), { autorId: "adm", conversa: "equipe", conteudo: { texto: "Antiga" }, apagadaEm: serverTimestamp() }); await assertFails(b.commit()); });
await t("equipe 10 min: reagir continua liberado", () => assertSucceeds(updateDoc(doc(ctx("mod"), "equipe_chat", "q3"), { "reacoes.mod": "👍" })));
await t("equipe: ninguém apaga o conteúdo antes das 24 h", () => assertFails(deleteDoc(doc(ctx("adm"), "equipe_apagadas", "q1"))));

// Suporte do usuário e avisos.
await t("suporte: usuário abre chamado com a primeira mensagem", async () => {
  const db = ctx("bia"), b = writeBatch(db);
  b.set(doc(db, "suporte", "cb1"), { uid: "bia", nome: "Bia", email: "bia@t.com", assunto: "Ajuda com a conta", categoria: "conta", status: "aberto", criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(), ultimaDe: "usuario" });
  b.set(doc(db, "suporte", "cb1", "mensagens", "inicio"), { autorId: "bia", equipe: false, texto: "Não consigo entrar.", em: serverTimestamp() });
  await assertSucceeds(b.commit());
});
await t("suporte: usuário não escreve como equipe", () => assertFails(setDoc(doc(ctx("bia"), "suporte", "cb1", "mensagens", "x"), { autorId: "bia", equipe: true, texto: "oficial", em: serverTimestamp() })));
await t("suporte: equipe responde", async () => {
  const db = ctx("mod2"), b = writeBatch(db);
  b.set(doc(db, "suporte", "cb1", "mensagens", "r1"), { autorId: "mod2", equipe: true, texto: "Vamos ver!", em: serverTimestamp() });
  b.update(doc(db, "suporte", "cb1"), { status: "respondido", atualizadoEm: serverTimestamp(), ultimaDe: "equipe", atendidoPor: "mod2" });
  await assertSucceeds(b.commit());
});
await t("suporte: usuário guarda a leitura na própria conta", () => assertSucceeds(setDoc(doc(ctx("bia"), "usuarios", "bia"), { suporteLido: { cb1: serverTimestamp() } }, { merge: true })));
await t("aviso: a equipe envia", () => assertSucceeds(setDoc(doc(ctx("adm"), "avisos", "av1"), { uid: "bia", titulo: "Olá", texto: "Bem-vinda", tipo: "info", por: "adm", em: serverTimestamp(), lidoEm: null })));
await t("aviso: quem recebeu lê e marca como lido", async () => { await assertSucceeds(getDoc(doc(ctx("bia"), "avisos", "av1"))); await assertSucceeds(updateDoc(doc(ctx("bia"), "avisos", "av1"), { lidoEm: serverTimestamp() })); });
await t("aviso: outra pessoa não lê", () => assertFails(getDoc(doc(ctx("ana"), "avisos", "av1"))));
await t("aviso: usuário comum não envia aviso", () => assertFails(setDoc(doc(ctx("ana"), "avisos", "av2"), { uid: "bia", titulo: "Falso", texto: "x", tipo: "grave", por: "ana", em: serverTimestamp(), lidoEm: null })));


// Foto do grupo do chat da equipe.
const fotoP = "data:image/jpeg;base64,/9j/4AAQ";
await t("equipe: troca a foto do grupo", () => assertSucceeds(setDoc(doc(ctx("mod2"), "equipe_info", "grupo"), { foto: fotoP, por: "mod2", em: serverTimestamp() })));
await t("equipe: todos da equipe veem a foto do grupo", () => assertSucceeds(getDoc(doc(ctx("adm"), "equipe_info", "grupo"))));
await t("equipe: quem não é da equipe não vê nem troca a foto", async () => { await assertFails(getDoc(doc(ctx("ana"), "equipe_info", "grupo"))); await assertFails(setDoc(doc(ctx("ana"), "equipe_info", "grupo"), { foto: fotoP, por: "ana", em: serverTimestamp() })); });
await t("equipe: foto de outro site é recusada", () => assertFails(setDoc(doc(ctx("adm"), "equipe_info", "grupo"), { foto: "https://exemplo.com/a.jpg", por: "adm", em: serverTimestamp() })));
await t("equipe: só o documento 'grupo'", () => assertFails(setDoc(doc(ctx("adm"), "equipe_info", "outro"), { foto: fotoP, por: "adm", em: serverTimestamp() })));
await t("equipe: tirar a foto do grupo", () => assertSucceeds(setDoc(doc(ctx("adm"), "equipe_info", "grupo"), { foto: null, por: "adm", em: serverTimestamp() })));

// Diário: várias fotos (2 a 4) numa publicação; salvos ficam na própria conta.
async function publicar(quem, dadosPub) {
  const db = ctx(quem), b = writeBatch(db);
  b.set(doc(collection(db, "diario")), { autorId: quem, nome: quem, fotoPerfil: "", texto: "", criadoEm: serverTimestamp(), ...dadosPub });
  b.set(doc(db, "ritmo", quem), { inicio: serverTimestamp(), msg: 0, pub: 1, com: 0, parc: 0, ultimaEm: serverTimestamp(), ultimoTipo: "pub" });
  return b.commit();
}
const fP = (n) => "data:image/jpeg;base64,/9j/" + "A".repeat(n);
await semRegras(async (db) => { const { deleteDoc: dd } = await import("firebase/firestore"); for (const u of ["edu", "nova", "dono"]) await dd(doc(db, "ritmo", u)); });
await t("diário: publica com 3 fotos", () => assertSucceeds(publicar("edu", { mediaUrl: fP(4), mediaTipo: "image", midias: [fP(4), fP(5), fP(6)] })));
await t("diário: recusa 5 fotos", () => assertFails(publicar("dono", { mediaUrl: fP(4), mediaTipo: "image", midias: [fP(4), fP(5), fP(6), fP(7), fP(8)] })));
await t("diário: recusa foto de outro site no meio", () => assertFails(publicar("dono", { mediaUrl: fP(4), mediaTipo: "image", midias: [fP(4), "https://exemplo.com/a.jpg"] })));
await t("diário: a primeira tem que ser a mesma da capa (mediaUrl)", () => assertFails(publicar("dono", { mediaUrl: fP(4), mediaTipo: "image", midias: [fP(9), fP(5)] })));
await t("diário: uma foto só continua igual (sem midias)", () => assertSucceeds(publicar("dono", { mediaUrl: fP(4), mediaTipo: "image" })));
await semRegras((db) => setDoc(doc(db, "diario", "pEdu"), { autorId: "edu", nome: "Edu", texto: "oi", criadoEm: antigo }));
// Estrelas: a nota e o resumo da publicação (diario_notas) mudam juntos, na conta exata.
async function estrela(quem, postId, autor, nota, antes = 0, resumo = null) {
  const db = ctx(quem), b = writeBatch(db), ref = doc(db, "curtidas", `${postId}_${quem}`);
  if (!nota) b.delete(ref);
  else if (antes) b.update(ref, { nota, atualizadoEm: serverTimestamp() });
  else b.set(ref, { postId, uid: quem, postAutorId: autor, nota, criadoEm: serverTimestamp() });
  const conta = resumo || { total: increment((nota ? 1 : 0) - (antes ? 1 : 0)), soma: increment(nota - antes), ...(antes ? { ["n" + antes]: increment(-1) } : {}), ...(nota ? { ["n" + nota]: increment(1) } : {}) };
  if (resumo !== false) b.set(doc(db, "diario_notas", postId), conta, { merge: true });
  return b.commit();
}
const resumoEdu = async () => (await getDoc(doc(ctx("bia"), "diario_notas", "pEdu"))).data();
await t("estrelas: dá estrelas na própria publicação (com o resumo)", () => assertSucceeds(estrela("edu", "pEdu", "edu", 5)));
await t("estrelas: não finge que é de outra pessoa (autor errado)", () => assertFails(estrela("bia", "pEdu", "bia", 5)));
await t("estrelas: outra pessoa dá 4", () => assertSucceeds(estrela("bia", "pEdu", "edu", 4)));
await t("estrelas: resumo certo (2 notas, soma 9, um 5 e um 4)", async () => { const r = await resumoEdu(); if (!(r.total === 2 && r.soma === 9 && r.n5 === 1 && r.n4 === 1)) throw new Error(JSON.stringify(r)); });
await t("estrelas: sem mexer no resumo é recusado", () => assertFails(estrela("ana", "pEdu", "edu", 3, 0, false)));
await t("estrelas: resumo inflado é recusado (+10 notas)", () => assertFails(estrela("ana", "pEdu", "edu", 3, 0, { total: increment(10), soma: increment(30), n3: increment(10) })));
await t("estrelas: resumo na estrela errada é recusado", () => assertFails(estrela("ana", "pEdu", "edu", 3, 0, { total: increment(1), soma: increment(3), n5: increment(1) })));
await t("estrelas: troca de 4 para 2 (sai do 4, entra no 2)", async () => { await assertSucceeds(estrela("bia", "pEdu", "edu", 2, 4)); const r = await resumoEdu(); if (!(r.total === 2 && r.soma === 7 && r.n4 === 0 && r.n2 === 1)) throw new Error(JSON.stringify(r)); });
await t("estrelas: tirar a nota tira do resumo", async () => { await assertSucceeds(estrela("bia", "pEdu", "edu", 0, 2)); const r = await resumoEdu(); if (!(r.total === 1 && r.soma === 5 && r.n2 === 0)) throw new Error(JSON.stringify(r)); });
await t("estrelas: mexer no resumo sem dar nota é recusado", () => assertFails(setDoc(doc(ctx("ana"), "diario_notas", "pEdu"), { total: increment(1), soma: increment(5), n5: increment(1) }, { merge: true })));
await t("estrelas: a moderação recalcula o resumo", () => assertSucceeds(setDoc(doc(ctx("mod"), "diario_notas", "pEdu"), { total: 1, soma: 5, n1: 0, n2: 0, n3: 0, n4: 0, n5: 1 })));
await t("estrelas: usuário comum não recalcula", () => assertFails(setDoc(doc(ctx("ana"), "diario_notas", "pEdu"), { total: 9, soma: 45, n1: 0, n2: 0, n3: 0, n4: 0, n5: 9 })));
await semRegras(async (db) => { await setDoc(doc(db, "curtidas", "pSumiu_ana"), { postId: "pSumiu", uid: "ana", postAutorId: "edu", nota: 4 }); });
await t("estrelas: nota de publicação que já não existe sai sem resumo (limpeza de conta)", () => assertSucceeds(deleteDoc(doc(ctx("ana"), "curtidas", "pSumiu_ana"))));
await t("diário: salvar publicação fica na própria conta", () => assertSucceeds(setDoc(doc(ctx("bia"), "usuarios", "bia"), { salvos: ["p1"] }, { merge: true })));

// ---------- resultado ----------
for (const r of resultados) console.log(r[0] === "ok" ? "  ✔" : "  ✘", r[1], r[2] ? "→ " + r[2] : "");
console.log(`\n${ok} passaram, ${falhou} falharam (${arquivo})`);
await env.cleanup();
process.exit(falhou ? 1 : 0);
