// Testes das regras do Firestore (firestore.rules) no emulador, projeto separado "demo-regras"
// (não apaga os dados do demo-hf que o navegador usa). Uso: node testes-regras.mjs [arquivo.rules]
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { doc, setDoc, updateDoc, getDoc, getDocs, collection, query, where, writeBatch, Timestamp, serverTimestamp, increment, deleteField, deleteDoc, orderBy, limit, addDoc } from "firebase/firestore";

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
await t("busca: anúncio de imóvel com as palavras da busca", () => assertSucceeds(setDoc(doc(ctx("dono"), "anuncios", "a1"), anuncio({ busca: ["apartamento", "apa", "trindade"] }))));
await t("anúncio: recusa UF errada", () => assertFails(setDoc(doc(ctx("dono"), "anuncios", "a2"), anuncio({ uf: "sc" }))));
await t("anúncio: tipo escrito pela pessoa (Outro) até 30 letras", () => assertSucceeds(setDoc(doc(ctx("dono"), "anuncios", "a4"), anuncio({ categoria: "outros", categoriaPersonalizada: "Chácara" }))));
await t("anúncio: recusa tipo escrito com mais de 30 letras", () => assertFails(setDoc(doc(ctx("dono"), "anuncios", "a5"), anuncio({ categoria: "outros", categoriaPersonalizada: "x".repeat(31) }))));
await t("negócio: ponto do endereço (geo) no Brasil", () => assertSucceeds(setDoc(doc(ctx("dono"), "negocios", "dono_lojinha"), neg({ tipo: "lojinha", geo: { lat: -27.595, lng: -48.548 } }))));
await t("negócio: recusa geo fora do Brasil", () => assertFails(setDoc(doc(ctx("dono"), "negocios", "dono_lojinha"), neg({ tipo: "lojinha", geo: { lat: 48.85, lng: 2.35 } }))));
await t("negócio: recusa geo com campo a mais", () => assertFails(setDoc(doc(ctx("dono"), "negocios", "dono_lojinha"), neg({ tipo: "lojinha", geo: { lat: -27.5, lng: -48.5, precisao: 5 } }))));
await t("anúncio: ponto do endereço (geo)", () => assertSucceeds(setDoc(doc(ctx("dono"), "anuncios", "a6"), anuncio({ geo: { lat: -27.6, lng: -48.52 } }))));
await t("anúncio: recusa geo como texto", () => assertFails(setDoc(doc(ctx("dono"), "anuncios", "a7"), anuncio({ geo: { lat: "-27.6", lng: -48.52 } }))));
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
const msgSup = (quem, extra) => setDoc(doc(ctx(quem), "suporte", idSup, "mensagens", "ax" + Math.random().toString(36).slice(2, 8)), { autorId: quem, equipe: quem === "adm", texto: "", em: serverTimestamp(), ...extra });
await t("suporte: usuário manda foto sem texto", () => assertSucceeds(msgSup("ana", { anexo: { tipo: "imagem", url: "data:image/jpeg;base64,AAAA", nome: "print.jpg" } })));
await t("suporte: usuário manda PDF", () => assertSucceeds(msgSup("ana", { texto: "Segue o comprovante", anexo: { tipo: "arquivo", url: "data:application/pdf;base64,JVBE", nome: "comprovante.pdf" } })));
await t("suporte: vídeo pelo Storage", () => assertSucceeds(msgSup("ana", { anexo: { tipo: "video", url: "https://firebasestorage.googleapis.com/v0/b/x/o/v.mp4", nome: "tela.mp4" } })));
await t("suporte: equipe responde com foto", () => assertSucceeds(msgSup("adm", { texto: "Veja como fazer", anexo: { tipo: "imagem", url: "data:image/jpeg;base64,AAAA", nome: "passo.jpg" } })));
await t("suporte: recusa anexo de outro site", () => assertFails(msgSup("ana", { anexo: { tipo: "imagem", url: "https://exemplo.com/x.jpg" } })));
await t("suporte: recusa PNG/HTML em data:", () => assertFails(msgSup("ana", { anexo: { tipo: "arquivo", url: "data:text/html;base64,PGgxPg==" } })));
await t("suporte: recusa mensagem vazia sem anexo", () => assertFails(msgSup("ana", {})));
await t("suporte: recusa anexo grande demais", () => assertFails(msgSup("ana", { anexo: { tipo: "imagem", url: "data:image/jpeg;base64," + "A".repeat(760000) } })));
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
await t("perfil público: gravação com TUDO junto (atendimento, local, busca, opções) fica dentro do limite", () => assertSucceeds(updateDoc(doc(ctx("bia"), "perfis_publicos", "bia"), { nome: "Bia Souza", bio: "Bio completa da Bia", cidade: "Florianópolis", uf: "SC", cidadeIbge: 4205407, busca: ["bia", "souza", "bia", "s", "so", "sou", "souz", "b", "bi", "x", "y", "z"], socialVisibilidade: "amigos", duoCapa: "rosa", fotoPerfil: "data:image/jpeg;base64,AAAA", fotoCapa: "data:image/jpeg;base64,AAAA", atualizadoEm: serverTimestamp(), atendimento: { horario: { dias: [1, 2, 3, 4, 5, 6], inicio: "08:00", fim: "18:00" }, semana: ["", "08:00-18:00", "08:00-18:00", "08:00-18:00", "08:00-18:00", "08:00-17:00", "09:00-12:00"], almoco: "12:00-13:00", ausente: true, mensagem: "Férias", volta: Timestamp.fromMillis(Date.now() + 5 * 864e5) } })));
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
await t("diário: publicação com local", () => assertSucceeds(publicar("bia", { texto: "Na praia", local: { nome: "Jurerê, Florianópolis", lat: -27.44, lng: -48.5 } })));
await t("região: publicação com o estado e a cidade de quem publica", () => assertSucceeds(publicar("hele", { texto: "Oi, Floripa", autorUf: "SC", autorIbge: 4205407 })));
await t("região: estado em minúsculas é recusado", () => assertFails(publicar("ana", { autorUf: "sc" })));
await t("região: código de cidade inválido é recusado", () => assertFails(publicar("ana", { autorUf: "SC", autorIbge: "4205407" })));
await t("diário: recusa local fora do Brasil", () => assertFails(publicar("ana", { local: { nome: "Paris", lat: 48.85, lng: 2.35 } })));
await t("diário: recusa local com campo a mais", () => assertFails(publicar("ana", { local: { nome: "Centro", lat: -27.5, lng: -48.5, endereco: "Rua X, 10" } })));
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

// Comentários: quem pode comentar, comentário fixado e reações.
await semRegras(async (db) => {
  await setDoc(doc(db, "diario", "pCom"), { autorId: "dono", nome: "Dono", texto: "post", criadoEm: antigo });
  await setDoc(doc(db, "relacoes", "bia_dono"), { tipo: "seguir", seguidorId: "bia", alvoId: "dono" });   // bia segue o dono
  await setDoc(doc(db, "relacoes", "edu_dono"), { tipo: "seguir", seguidorId: "edu", alvoId: "dono" });   // edu segue o dono...
  await setDoc(doc(db, "relacoes", "dono_edu"), { tipo: "seguir", seguidorId: "dono", alvoId: "edu" });   // ...e o dono segue o edu
  for (const u of ["ana", "bia", "edu", "dono"]) await setDoc(doc(db, "ritmo", u), { inicio: Timestamp.now(), msg: 0, pub: 0, com: 0, parc: 0 });
});
async function comentar(quem, id, extra = {}) {
  const db = ctx(quem), b = writeBatch(db);
  b.set(doc(db, "comentarios", id), { postId: "pCom", postAutorId: "dono", autorId: quem, nome: quem, foto: "", texto: "oi", criadoEm: serverTimestamp(), ...extra });
  b.set(doc(db, "ritmo", quem), { com: increment(1), ultimaEm: serverTimestamp(), ultimoTipo: "com" }, { merge: true });
  return b.commit();
}
await t("comentários: todos podem comentar (padrão)", () => assertSucceeds(comentar("ana", "c1")));
await t("comentários: o dono escolhe 'só seguidores'", () => assertSucceeds(updateDoc(doc(ctx("dono"), "diario", "pCom"), { quemComenta: "seguidores" })));
await t("comentários: quem não segue não comenta", () => assertFails(comentar("ana", "c2")));
await t("comentários: seguidor comenta", () => assertSucceeds(comentar("bia", "c3")));
await t("comentários: o dono sempre comenta", () => assertSucceeds(comentar("dono", "c4")));
await t("comentários: 'seguidores que você segue' recusa quem só segue", async () => { await assertSucceeds(updateDoc(doc(ctx("dono"), "diario", "pCom"), { quemComenta: "mutuos" })); await assertFails(comentar("bia", "c5")); });
await t("comentários: 'seguidores que você segue' aceita seguidor seguido de volta", () => assertSucceeds(comentar("edu", "c6")));
await t("comentários: 'ninguém' fecha os comentários", async () => { await assertSucceeds(updateDoc(doc(ctx("dono"), "diario", "pCom"), { quemComenta: "ninguem" })); await assertFails(comentar("edu", "c7")); });
await t("comentários: valor estranho é recusado", () => assertFails(updateDoc(doc(ctx("dono"), "diario", "pCom"), { quemComenta: "amigos" })));
await t("comentários: outra pessoa não muda a regra", () => assertFails(updateDoc(doc(ctx("ana"), "diario", "pCom"), { quemComenta: "todos" })));
await t("comentários: o dono fixa e tira o fixado", async () => { await assertSucceeds(updateDoc(doc(ctx("dono"), "diario", "pCom"), { comentarioFixo: "c3" })); await assertSucceeds(updateDoc(doc(ctx("dono"), "diario", "pCom"), { comentarioFixo: null })); });
await t("comentários: o dono apaga comentário de outra pessoa", () => assertSucceeds(deleteDoc(doc(ctx("dono"), "comentarios", "c1"))));
await t("reações: reage com emoji", () => assertSucceeds(setDoc(doc(ctx("ana"), "curtidas_comentarios", "c3_ana"), { comentarioId: "c3", uid: "ana", reacao: "😂", criadoEm: serverTimestamp() })));
await t("reações: troca o emoji", () => assertSucceeds(updateDoc(doc(ctx("ana"), "curtidas_comentarios", "c3_ana"), { reacao: "❤️" })));
await t("reações: emoji fora da lista é recusado", () => assertFails(updateDoc(doc(ctx("ana"), "curtidas_comentarios", "c3_ana"), { reacao: "💩" })));
await t("reações: não troca a reação de outra pessoa", () => assertFails(updateDoc(doc(ctx("bia"), "curtidas_comentarios", "c3_ana"), { reacao: "👍" })));
await t("reações: curtida antiga (sem emoji) continua valendo", () => assertSucceeds(setDoc(doc(ctx("bia"), "curtidas_comentarios", "c3_bia"), { comentarioId: "c3", uid: "bia", criadoEm: serverTimestamp() })));

// Diário: hashtags, marcar pessoas, agendar; alcance; salvamentos; stories; rascunhos; aviso de reação.
async function publicar2(quem, dadosPub) {
  const db = ctx(quem), b = writeBatch(db);
  b.set(doc(collection(db, "diario")), { autorId: quem, nome: quem, fotoPerfil: "", texto: "x", criadoEm: serverTimestamp(), ...dadosPub });
  b.set(doc(db, "ritmo", quem), { pub: increment(1), ultimaEm: serverTimestamp(), ultimoTipo: "pub" }, { merge: true });
  return b.commit();
}
await t("diário: hashtags e pessoas marcadas", () => assertSucceeds(publicar2("edu", { tags: ["reforma", "floripa", "obra_2026", "decoração"], marcados: ["bia", "dono"] })));
await t("diário: hashtag com maiúscula ou espaço é recusada", () => assertFails(publicar2("edu", { tags: ["Reforma"] })));
await t("diário: mais de 10 marcados é recusado", () => assertFails(publicar2("edu", { marcados: Array.from({ length: 11 }, (_, i) => "usuario" + i) })));
await t("diário: agendar para daqui a 2 dias", () => assertSucceeds(publicar2("edu", { agendadoPara: Timestamp.fromMillis(Date.now() + 2 * 864e5) })));
await t("diário: agendar no passado é recusado", () => assertFails(publicar2("edu", { agendadoPara: Timestamp.fromMillis(Date.now() - 3600e3) })));
await t("diário: agendar para mais de 60 dias é recusado", () => assertFails(publicar2("edu", { agendadoPara: Timestamp.fromMillis(Date.now() + 61 * 864e5) })));
await semRegras((db) => setDoc(doc(db, "diario", "pAlc"), { autorId: "dono", nome: "Dono", texto: "x", criadoEm: antigo }));
await t("alcance: quem vê marca a visualização (uma vez)", () => assertSucceeds(setDoc(doc(ctx("ana"), "diario", "pAlc", "vistas", "ana"), { criadoEm: serverTimestamp(), origem: "principais" })));
await t("alcance: não marca em nome de outra pessoa", () => assertFails(setDoc(doc(ctx("ana"), "diario", "pAlc", "vistas", "bia"), { criadoEm: serverTimestamp() })));
await t("alcance: o autor conta quem viu; outra pessoa não", async () => { await assertSucceeds(getDocs(collection(ctx("dono"), "diario", "pAlc", "vistas"))); await assertFails(getDocs(collection(ctx("ana"), "diario", "pAlc", "vistas"))); });
await t("salvamentos: salvar deixa um registro para a contagem do autor", () => assertSucceeds(setDoc(doc(ctx("ana"), "salvamentos", "pAlc_ana"), { postId: "pAlc", uid: "ana", postAutorId: "dono", criadoEm: serverTimestamp() })));
await t("salvamentos: o autor conta; outra pessoa não lista", async () => { await assertSucceeds(getDocs(query(collection(ctx("dono"), "salvamentos"), where("postAutorId", "==", "dono")))); await assertFails(getDocs(query(collection(ctx("bia"), "salvamentos"), where("postAutorId", "==", "dono")))); });
const fotoS = "data:image/jpeg;base64,/9j/AAAA";
await t("stories: publica foto", () => assertSucceeds(setDoc(doc(ctx("ana"), "stories", "s1"), { autorId: "ana", nome: "Ana", tipo: "imagem", midia: fotoS, texto: "bom dia", criadoEm: serverTimestamp() })));
await t("stories: vídeo dentro do documento é recusado (só Storage)", () => assertFails(setDoc(doc(ctx("ana"), "stories", "s2"), { autorId: "ana", nome: "Ana", tipo: "video", midia: fotoS, criadoEm: serverTimestamp() })));
await t("stories: quem vê marca; só a autora lista quem viu", async () => { await assertSucceeds(setDoc(doc(ctx("bia"), "stories", "s1", "vistos", "bia"), { criadoEm: serverTimestamp() })); await assertSucceeds(getDocs(collection(ctx("ana"), "stories", "s1", "vistos"))); await assertFails(getDocs(collection(ctx("edu"), "stories", "s1", "vistos"))); });
await t("stories: outra pessoa não apaga", () => assertFails(deleteDoc(doc(ctx("bia"), "stories", "s1"))));
await t("rascunhos: só a própria pessoa", async () => { await assertSucceeds(setDoc(doc(ctx("ana"), "rascunhos", "ana", "itens", "r1"), { texto: "ideia", fotos: [], atualizadoEm: serverTimestamp() })); await assertFails(getDoc(doc(ctx("bia"), "rascunhos", "ana", "itens", "r1"))); });
await t("reação com o autor do comentário certo (para o aviso)", () => assertSucceeds(setDoc(doc(ctx("edu"), "curtidas_comentarios", "c3_edu"), { comentarioId: "c3", uid: "edu", reacao: "👏", comentarioAutorId: "bia", criadoEm: serverTimestamp() })));
await t("reação com autor do comentário errado é recusada", () => assertFails(setDoc(doc(ctx("dono"), "curtidas_comentarios", "c3_dono"), { comentarioId: "c3", uid: "dono", reacao: "👏", comentarioAutorId: "ana", criadoEm: serverTimestamp() })));

// Enquetes (publicação e flash), menções e escolhas do flash, "quem pode me marcar" no perfil.
await semRegras((db) => setDoc(doc(db, "diario", "pEnq"), { autorId: "dono", nome: "Dono", texto: "Qual cor?", enquete: { pergunta: "Qual cor?", opcoes: ["Azul", "Verde", "Rosa"] }, criadoEm: antigo }));
await t("enquete: publicação com enquete (3 opções)", () => assertSucceeds(publicar2("edu", { enquete: { pergunta: "Qual é melhor?", opcoes: ["Sim", "Não", "Talvez"] } })));
await t("enquete: com 1 opção é recusada", () => assertFails(publicar2("edu", { enquete: { pergunta: "?", opcoes: ["Só uma"] } })));
await t("enquete: com 5 opções é recusada", () => assertFails(publicar2("edu", { enquete: { pergunta: "?", opcoes: ["a", "b", "c", "d", "e"] } })));
await t("enquete: opção com mais de 40 letras é recusada", () => assertFails(publicar2("edu", { enquete: { pergunta: "?", opcoes: ["a", "x".repeat(41)] } })));
const voto = (quem, opcao, item = "pEnq", tipo = "d") => setDoc(doc(ctx(quem), "enquete_votos", `${tipo}_${item}_${quem}`), { alvo: `${tipo}_${item}`, tipo, itemId: item, uid: quem, opcao, criadoEm: serverTimestamp() });
await t("voto: vota na opção 2", () => assertSucceeds(voto("bia", 2)));
await t("voto: opção que não existe é recusada", () => assertFails(voto("ana", 3)));
await t("voto: em nome de outra pessoa é recusado", () => assertFails(setDoc(doc(ctx("ana"), "enquete_votos", "d_pEnq_bia"), { alvo: "d_pEnq", tipo: "d", itemId: "pEnq", uid: "bia", opcao: 0, criadoEm: serverTimestamp() })));
await t("voto único: não troca o voto", () => assertFails(updateDoc(doc(ctx("bia"), "enquete_votos", "d_pEnq_bia"), { opcao: 0 })));
await t("voto único: não tira o voto", () => assertFails(deleteDoc(doc(ctx("bia"), "enquete_votos", "d_pEnq_bia"))));
await t("voto único: não vota de novo por cima", () => assertFails(voto("bia", 0)));
await t("voto: outra pessoa não apaga o voto", () => assertFails(deleteDoc(doc(ctx("ana"), "enquete_votos", "d_pEnq_bia"))));
await t("flash: com enquete (posição), menções e escolhas", () => assertSucceeds(setDoc(doc(ctx("ana"), "stories", "sEnq"), { autorId: "ana", nome: "Ana", tipo: "imagem", midia: fotoS, enquete: { pergunta: "Gostou?", opcoes: ["Sim", "Não"], x: 0.5, y: 0.6 }, mencoes: ["bia", "edu"], respostas: "seguindo", publico: "amigos", lista: ["bia"], ocultoPara: ["edu"], criadoEm: serverTimestamp() })));
await t("flash: quem responde com valor estranho é recusado", () => assertFails(setDoc(doc(ctx("ana"), "stories", "sX"), { autorId: "ana", nome: "Ana", tipo: "imagem", midia: fotoS, respostas: "qualquer", criadoEm: serverTimestamp() })));
await t("voto: na enquete do flash", () => assertSucceeds(voto("bia", 1, "sEnq", "f")));
// Enquete com duração (fimEm): publicação até 7 dias (a partir da data agendada, se houver), flash até 24 h; votar só até o fim.
const daqui = (min) => Timestamp.fromMillis(Date.now() + min * 60000);
await t("enquete: com fim em 1 dia", () => assertSucceeds(publicar2("bia", { enquete: { pergunta: "Vai?", opcoes: ["Sim", "Não"], fimEm: daqui(1440) } })));
await t("enquete: fim em 7 dias (personalizado)", () => assertSucceeds(publicar2("bia", { enquete: { pergunta: "Vai?", opcoes: ["Sim", "Não"], fimEm: daqui(7 * 1440) } })));
await t("enquete: fim depois de 7 dias é recusado", () => assertFails(publicar2("bia", { enquete: { pergunta: "Vai?", opcoes: ["Sim", "Não"], fimEm: daqui(7 * 1440 + 60) } })));
await t("enquete: fim no passado é recusado", () => assertFails(publicar2("bia", { enquete: { pergunta: "Vai?", opcoes: ["Sim", "Não"], fimEm: daqui(-5) } })));
await t("enquete: fim que não é data é recusado", () => assertFails(publicar2("bia", { enquete: { pergunta: "Vai?", opcoes: ["Sim", "Não"], fimEm: "amanhã" } })));
await t("enquete agendada: o fim conta a partir da data agendada", () => assertSucceeds(publicar2("bia", { agendadoPara: daqui(3 * 1440), enquete: { pergunta: "Vai?", opcoes: ["Sim", "Não"], fimEm: daqui(3 * 1440 + 1440) } })));
await t("enquete agendada: fim antes de aparecer é recusado", () => assertFails(publicar2("bia", { agendadoPara: daqui(3 * 1440), enquete: { pergunta: "Vai?", opcoes: ["Sim", "Não"], fimEm: daqui(1440) } })));
await t("flash: enquete com fim em 24 h", () => assertSucceeds(setDoc(doc(ctx("ana"), "stories", "sEnq2"), { autorId: "ana", nome: "Ana", tipo: "imagem", midia: fotoS, enquete: { pergunta: "Gostou?", opcoes: ["Sim", "Não"], x: 0.5, y: 0.6, fimEm: daqui(1440) }, criadoEm: serverTimestamp() })));
await t("flash: enquete passando de 24 h é recusada", () => assertFails(setDoc(doc(ctx("ana"), "stories", "sEnq3"), { autorId: "ana", nome: "Ana", tipo: "imagem", midia: fotoS, enquete: { pergunta: "Gostou?", opcoes: ["Sim", "Não"], fimEm: daqui(1440 + 60) }, criadoEm: serverTimestamp() })));
await semRegras(async (db) => {
  await setDoc(doc(db, "diario", "pAberta"), { autorId: "dono", nome: "Dono", texto: "?", enquete: { pergunta: "Qual?", opcoes: ["A", "B"], fimEm: daqui(600) }, criadoEm: antigo });
  await setDoc(doc(db, "diario", "pFechada"), { autorId: "dono", nome: "Dono", texto: "?", enquete: { pergunta: "Qual?", opcoes: ["A", "B"], fimEm: daqui(-10) }, criadoEm: antigo });
});
const votoF = (quem, item, fimEm) => setDoc(doc(ctx(quem), "enquete_votos", `d_${item}_${quem}`), { alvo: `d_${item}`, tipo: "d", itemId: item, uid: quem, opcao: 0, ...(fimEm ? { fimEm } : {}), criadoEm: serverTimestamp() });
const fimAberta = (await (async () => { let v; await semRegras(async (db) => { v = (await getDoc(doc(db, "diario", "pAberta"))).data().enquete.fimEm; }); return v; })());
await t("voto: com o fim igual ao da enquete", () => assertSucceeds(votoF("bia", "pAberta", fimAberta)));
await t("voto: com fim diferente do da enquete é recusado", () => assertFails(votoF("edu", "pAberta", daqui(5000))));
await t("voto: sem o campo fim também vale (versão antiga do site)", () => assertSucceeds(votoF("ana", "pAberta")));
await t("voto: depois do fim da enquete é recusado", () => assertFails(votoF("bia", "pFechada")));
await t("voto: com fim numa enquete sem fim é recusado", () => assertFails(votoF("edu", "pEnq", daqui(60))));
// Enquete anônima (votos em enquete_anon + contagem em enquete_contas na mesma gravação) e caixa de perguntas.
await t("enquete anônima: publicação com anonima", () => assertSucceeds(publicar2("bia", { enquete: { pergunta: "Segredo?", opcoes: ["Sim", "Não"], anonima: true } })));
await t("enquete: anonima que não é sim/não é recusada", () => assertFails(publicar2("bia", { enquete: { pergunta: "?", opcoes: ["a", "b"], anonima: "sim" } })));
await semRegras(async (db) => {
  await setDoc(doc(db, "diario", "pAnon"), { autorId: "dono", nome: "Dono", texto: "?", enquete: { pergunta: "Qual?", opcoes: ["A", "B"], anonima: true }, criadoEm: antigo });
  await setDoc(doc(db, "diario", "pCaixa"), { autorId: "dono", nome: "Dono", texto: "Perguntem!", caixa: { pergunta: "Me pergunte algo", anonima: false }, criadoEm: antigo });
  await setDoc(doc(db, "diario", "pCaixaA"), { autorId: "dono", nome: "Dono", texto: "Perguntem!", caixa: { pergunta: "Anônimo", anonima: true }, criadoEm: antigo });
});
const votoAnon = (quem, opcao, mexer = 1, item = "pAnon") => { const db = ctx(quem); const b = writeBatch(db); b.set(doc(db, "enquete_anon", `d_${item}_${quem}`), { alvo: `d_${item}`, tipo: "d", itemId: item, uid: quem, opcao, criadoEm: serverTimestamp() }); b.set(doc(db, "enquete_contas", `d_${item}`), { ["n" + opcao]: increment(mexer) }, { merge: true }); return b.commit(); };
await t("anônima: vota com a contagem subindo 1", () => assertSucceeds(votoAnon("bia", 1)));
await t("anônima: segundo voto também conta (outra pessoa)", () => assertSucceeds(votoAnon("edu", 1)));
await t("anônima: subir a contagem em 2 é recusado", () => assertFails(votoAnon("ana", 0, 2)));
await t("anônima: votar sem mexer na contagem é recusado", () => assertFails(setDoc(doc(ctx("ana"), "enquete_anon", "d_pAnon_ana"), { alvo: "d_pAnon", tipo: "d", itemId: "pAnon", uid: "ana", opcao: 0, criadoEm: serverTimestamp() })));
await t("anônima: mexer na contagem sem votar é recusado", () => assertFails(setDoc(doc(ctx("ana"), "enquete_contas", "d_pAnon"), { n0: increment(1) }, { merge: true })));
await t("anônima: não vota duas vezes", () => assertFails(votoAnon("bia", 0)));
await t("anônima: voto público (enquete_votos) é recusado", () => assertFails(voto("ana", 0, "pAnon")));
await t("anônima: o autor não lista quem votou", () => assertFails(getDocs(query(collection(ctx("dono"), "enquete_anon"), where("alvo", "==", "d_pAnon")))));
await t("anônima: o autor não lê o voto de alguém", () => assertFails(getDoc(doc(ctx("dono"), "enquete_anon", "d_pAnon_bia"))));
await t("anônima: a pessoa lista os próprios votos", () => assertSucceeds(getDocs(query(collection(ctx("bia"), "enquete_anon"), where("uid", "==", "bia")))));
await t("anônima: listar votos de outra pessoa é recusado", () => assertFails(getDocs(query(collection(ctx("ana"), "enquete_anon"), where("uid", "==", "bia")))));
await t("anônima: a pessoa lê o próprio voto (e o que não existe)", async () => { await assertSucceeds(getDoc(doc(ctx("bia"), "enquete_anon", "d_pAnon_bia"))); await assertSucceeds(getDoc(doc(ctx("ana"), "enquete_anon", "d_pAnon_ana"))); });
await t("anônima: todos leem a contagem", async () => { const s = await assertSucceeds(getDoc(doc(ctx("ana"), "enquete_contas", "d_pAnon"))); if (s.data().n1 !== 2) throw new Error("n1=" + s.data().n1); });
await t("caixa: publicação com caixa de perguntas", () => assertSucceeds(publicar2("bia", { caixa: { pergunta: "Me pergunte", anonima: true } })));
await t("caixa: sem dizer se é anônima é recusada", () => assertFails(publicar2("bia", { caixa: { pergunta: "Me pergunte" } })));
await t("caixa: no flash", () => assertSucceeds(setDoc(doc(ctx("ana"), "stories", "sCaixa"), { autorId: "ana", nome: "Ana", tipo: "imagem", midia: fotoS, caixa: { pergunta: "Pergunte", anonima: false, x: 0.5, y: 0.5 }, criadoEm: serverTimestamp() })));
const resp = (quem, item, extra = {}) => setDoc(doc(collection(ctx(quem), "caixa_respostas")), { alvo: `d_${item}`, tipo: "d", itemId: item, autorId: "dono", uid: quem, nome: quem, texto: "Oi, tudo bem?", anonima: false, criadoEm: serverTimestamp(), ...extra });
await t("caixa: responde com nome", () => assertSucceeds(resp("bia", "pCaixa")));
await t("caixa: responde em nome de outra pessoa é recusado", () => assertFails(resp("bia", "pCaixa", { uid: "ana" })));
await t("caixa: dono errado é recusado", () => assertFails(resp("bia", "pCaixa", { autorId: "ana" })));
await t("caixa: texto de mais de 300 letras é recusado", () => assertFails(resp("bia", "pCaixa", { texto: "x".repeat(301) })));
await t("caixa: dizer anônima numa caixa que não é é recusado", () => assertFails(resp("bia", "pCaixa", { anonima: true })));
const respAnon = (quem, comNome = false, autoriaDe = quem) => { const db = ctx(quem); const b = writeBatch(db); const r = doc(collection(db, "caixa_respostas")); b.set(r, { alvo: "d_pCaixaA", tipo: "d", itemId: "pCaixaA", autorId: "dono", texto: "Pergunta secreta", anonima: true, ...(comNome ? { uid: quem } : {}), criadoEm: serverTimestamp() }); b.set(doc(db, "caixa_autoria", r.id), { uid: autoriaDe, criadoEm: serverTimestamp() }); return b.commit().then(() => r.id); };
let idAnon = "";
await t("caixa anônima: responde sem nome (autoria só para a moderação)", async () => { idAnon = await respAnon("edu"); });
await t("caixa anônima: com uid junto é recusada", () => assertFails(respAnon("edu", true)));
await t("caixa anônima: sem autoria é recusada", () => assertFails(setDoc(doc(collection(ctx("edu"), "caixa_respostas")), { alvo: "d_pCaixaA", tipo: "d", itemId: "pCaixaA", autorId: "dono", texto: "x", anonima: true, criadoEm: serverTimestamp() })));
await t("caixa anônima: autoria em nome de outra pessoa é recusada", () => assertFails(respAnon("edu", false, "ana")));
await t("caixa: o dono lista as respostas", () => assertSucceeds(getDocs(query(collection(ctx("dono"), "caixa_respostas"), where("autorId", "==", "dono")))));
await t("caixa: outra pessoa não lista as respostas do dono", () => assertFails(getDocs(query(collection(ctx("ana"), "caixa_respostas"), where("autorId", "==", "dono")))));
await t("caixa anônima: o dono não lê a autoria", () => assertFails(getDoc(doc(ctx("dono"), "caixa_autoria", idAnon))));
await t("caixa anônima: a moderação lê a autoria", () => assertSucceeds(getDoc(doc(ctx("mod"), "caixa_autoria", idAnon))));
await t("caixa: o dono apaga uma resposta", () => assertSucceeds(deleteDoc(doc(ctx("dono"), "caixa_respostas", idAnon))));
// Flash: figurinha com link para um negócio e repostar quando foi mencionado.
await semRegras(async (db) => {
  await setDoc(doc(db, "negocios", "dono_servicos"), { donoId: "dono", tipo: "servicos", nome: "Reparos", criadoEm: antigo }, { merge: true });
  await setDoc(doc(db, "stories", "sMen"), { autorId: "dono", nome: "Dono", tipo: "imagem", midia: fotoS, mencoes: ["bia"], criadoEm: Timestamp.now() });
});
const flash = (quem, extra) => setDoc(doc(collection(ctx(quem), "stories")), { autorId: quem, nome: quem, tipo: "imagem", midia: fotoS, criadoEm: serverTimestamp(), ...extra });
await t("flash: publicação do Diário compartilhada (com crédito)", () => assertSucceeds(flash("ana", { postDe: { postId: "pCom", autorId: "dono", nome: "Dono" } })));
await t("flash: recusa publicação com autor errado", () => assertFails(flash("ana", { postDe: { postId: "pCom", autorId: "bia", nome: "Bia" } })));
await t("flash: recusa publicação que não existe", () => assertFails(flash("ana", { postDe: { postId: "naoExiste", autorId: "dono", nome: "Dono" } })));
await t("flash: figurinha de link para um negócio", () => assertSucceeds(flash("ana", { link: { negocioId: "dono_servicos", nome: "Reparos", tipo: "servicos", x: 0.5, y: 0.7 } })));
await t("flash: link para negócio que não existe é recusado", () => assertFails(flash("ana", { link: { negocioId: "nao_existe", nome: "X", tipo: "servicos" } })));
await t("flash: link com tipo estranho é recusado", () => assertFails(flash("ana", { link: { negocioId: "dono_servicos", nome: "X", tipo: "site" } })));
await t("flash: quem foi mencionado reposta", () => assertSucceeds(flash("bia", { repostDe: { storyId: "sMen", autorId: "dono", nome: "Dono" } })));
await t("flash: com TUDO junto (repost, link, caixa, enquete anônima, menções, amigos, ocultar) fica dentro do limite", () => assertSucceeds(flash("bia", { texto: "Tudo", repostDe: { storyId: "sMen", autorId: "dono", nome: "Dono" }, link: { negocioId: "dono_servicos", nome: "Reparos", tipo: "servicos", x: 0.5, y: 0.8 }, negocios: ["bia_servicos", "bia_delivery", "bia_lojinha", "bia_imoveis"], perfil: false, caixa: { pergunta: "Pergunte", anonima: true, x: 0.5, y: 0.3 }, enquete: { pergunta: "Gostou?", opcoes: ["Sim", "Não", "Talvez", "Mais ou menos"], x: 0.5, y: 0.6, anonima: true, fimEm: daqui(1400) }, mencoes: ["ana", "edu", "dono"], respostas: "seguindo", publico: "amigos", lista: ["ana", "edu"], ocultoPara: ["dono"] })));
await t("flash: aparece em 2 perfis de negócio seus", () => assertSucceeds(flash("dono", { negocios: ["dono_servicos", "dono_delivery"] })));
await t("flash: só nos negócios (não no perfil pessoal)", () => assertSucceeds(flash("dono", { negocios: ["dono_imoveis"], perfil: false })));
await t("flash: em todos os 4 negócios", () => assertSucceeds(flash("dono", { negocios: ["dono_servicos", "dono_delivery", "dono_lojinha", "dono_imoveis"] })));
await t("flash: no negócio de outra pessoa é recusado", () => assertFails(flash("ana", { negocios: ["dono_servicos"] })));
await t("flash: tipo de negócio estranho é recusado", () => assertFails(flash("dono", { negocios: ["dono_site"] })));
await t("flash: lista de negócios vazia é recusada", () => assertFails(flash("dono", { negocios: [] })));
await t("flash: fora do perfil sem negócio nenhum é recusado", () => assertFails(flash("dono", { perfil: false })));
await t("flash: quem não foi mencionado não reposta", () => assertFails(flash("ana", { repostDe: { storyId: "sMen", autorId: "dono", nome: "Dono" } })));
await t("flash: repost com autor errado é recusado", () => assertFails(flash("bia", { repostDe: { storyId: "sMen", autorId: "ana", nome: "Ana" } })));
await t("flash: repost de flash que não existe é recusado", () => assertFails(flash("bia", { repostDe: { storyId: "naoExiste", autorId: "dono", nome: "Dono" } })));
await t("preferências: quem pode me marcar (seguindo)", () => assertSucceeds(setDoc(doc(ctx("ana"), "pref_publicas", "ana"), { permiteMarcar: "seguindo", atualizadoEm: serverTimestamp() })));
await t("preferências: não permitir compartilhar no flash", () => assertSucceeds(setDoc(doc(ctx("dono"), "pref_publicas", "dono"), { permiteFlash: false, atualizadoEm: serverTimestamp() })));
await t("flash: autor desligou o compartilhamento → recusado", () => assertFails(flash("ana", { postDe: { postId: "pCom", autorId: "dono", nome: "Dono" } })));
await t("flash: o próprio autor ainda compartilha a dele", () => assertSucceeds(flash("dono", { postDe: { postId: "pCom", autorId: "dono", nome: "Dono" } })));
await t("preferências: permiteFlash só verdadeiro/falso", () => assertFails(setDoc(doc(ctx("dono"), "pref_publicas", "dono"), { permiteFlash: "sim" })));
await t("preferências: valor estranho é recusado", () => assertFails(setDoc(doc(ctx("ana"), "pref_publicas", "ana"), { permiteMarcar: "todo mundo" })));
await t("preferências: outra pessoa não grava", () => assertFails(setDoc(doc(ctx("bia"), "pref_publicas", "ana"), { permiteMarcar: "todos" })));
await t("preferências: qualquer pessoa logada lê", () => assertSucceeds(getDoc(doc(ctx("bia"), "pref_publicas", "ana"))));

// ---------- reportes do suporte e nota do atendimento ----------
const rep = (quem, id, extra) => setDoc(doc(ctx(quem), "reportes", id), { tipo: "atendimento", chamadoId: "cb1", assunto: "Ajuda com a conta", autorId: quem, alvoId: "mod2", motivo: "grosseria", detalhe: "Foi rude", status: "novo", criadoEm: serverTimestamp(), ...extra });
await t("reporte: quem abriu o chamado reporta o atendimento", () => assertSucceeds(rep("bia", "atendimento_cb1_bia")));
await t("reporte: id fora do padrão é recusado", () => assertFails(rep("bia", "qualquer")));
await t("reporte: outra pessoa não reporta o chamado de alguém", () => assertFails(rep("ana", "atendimento_cb1_ana")));
await t("reporte: motivo estranho é recusado", () => assertFails(rep("bia", "atendimento_cb1_bia", { motivo: "xingou" })));
await t("reporte: quem reportou vê o próprio reporte", () => assertSucceeds(getDoc(doc(ctx("bia"), "reportes", "atendimento_cb1_bia"))));
await t("reporte: o suporte (quem atendeu) não lê", () => assertFails(getDoc(doc(ctx("mod2"), "reportes", "atendimento_cb1_bia"))));
await t("reporte: o suporte não lista os reportes", () => assertFails(getDocs(query(collection(ctx("mod2"), "reportes")))));
await t("reporte: a moderação lê", () => assertSucceeds(getDoc(doc(ctx("mod"), "reportes", "atendimento_cb1_bia"))));
await t("reporte: o dono lista", () => assertSucceeds(getDocs(query(collection(ctx("adm"), "reportes")))));
await t("reporte: a moderação resolve com nota", () => assertSucceeds(updateDoc(doc(ctx("mod"), "reportes", "atendimento_cb1_bia"), { status: "resolvido", nota: "Conversamos com a equipe", analisadaPor: "mod", analisadaEm: serverTimestamp() })));
await t("reporte: quem reportou não muda a situação", () => assertFails(updateDoc(doc(ctx("bia"), "reportes", "atendimento_cb1_bia"), { status: "descartado" })));
await t("reporte: a equipe reporta a pessoa do chamado", () => assertSucceeds(setDoc(doc(ctx("mod2"), "reportes", "usuario_cb1_mod2"), { tipo: "usuario", chamadoId: "cb1", assunto: "Ajuda", autorId: "mod2", alvoId: "bia", alvoNome: "Bia", motivo: "ofensa", status: "novo", criadoEm: serverTimestamp() })));
await t("reporte: a equipe não reporta outra pessoa que não é do chamado", () => assertFails(setDoc(doc(ctx("mod2"), "reportes", "usuario_cb1_mod2"), { tipo: "usuario", chamadoId: "cb1", autorId: "mod2", alvoId: "ana", motivo: "ofensa", status: "novo", criadoEm: serverTimestamp() })));
await t("reporte: usuário comum não reporta como equipe", () => assertFails(setDoc(doc(ctx("bia"), "reportes", "usuario_cb1_bia"), { tipo: "usuario", chamadoId: "cb1", autorId: "bia", alvoId: "bia", motivo: "ofensa", status: "novo", criadoEm: serverTimestamp() })));
await t("nota do atendimento: quem abriu dá 5 estrelas", () => assertSucceeds(setDoc(doc(ctx("bia"), "suporte_notas", "cb1"), { uid: "bia", nota: 5, comentario: "Rápido!", atendidoPor: "mod2", criadoEm: serverTimestamp() })));
await t("nota do atendimento: não troca depois", () => assertFails(setDoc(doc(ctx("bia"), "suporte_notas", "cb1"), { uid: "bia", nota: 1, criadoEm: serverTimestamp() })));
await t("nota do atendimento: outra pessoa não avalia", () => assertFails(setDoc(doc(ctx("ana"), "suporte_notas", "cb1"), { uid: "ana", nota: 1, criadoEm: serverTimestamp() })));
await t("nota do atendimento: nota 6 é recusada", async () => { await semRegras((db) => setDoc(doc(db, "suporte", "cb9"), { uid: "bia", assunto: "x", categoria: "conta", status: "fechado" })); await assertFails(setDoc(doc(ctx("bia"), "suporte_notas", "cb9"), { uid: "bia", nota: 6, criadoEm: serverTimestamp() })); });
await t("nota do atendimento: a equipe lê", () => assertSucceeds(getDoc(doc(ctx("mod2"), "suporte_notas", "cb1"))));

await t("perfil: rosinha do duo \"Só a rosinha\" (rosa)", () => assertSucceeds(updateDoc(doc(ctx("ana"), "perfis_publicos", "ana"), { duoCapa: "rosa" })));
await t("perfil: rosinha com valor estranho é recusada", () => assertFails(updateDoc(doc(ctx("ana"), "perfis_publicos", "ana"), { duoCapa: "piscando" })));

// ---------- verificação do perfil ----------
const docJ = "data:image/jpeg;base64," + "A".repeat(4000);
const pedidoV = (extra) => ({ uid: "bia", categoria: "profissional", nomeLegal: "Beatriz Souza", conhecidoComo: "Bia", documentoTipo: "rg", documento: docJ, links: ["https://instagram.com/bia"], motivo: "Tenho perfis falsos com meu nome.", status: "pendente", criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(), ...extra });
await t("verificação: a pessoa envia o pedido com a foto do documento", () => assertSucceeds(setDoc(doc(ctx("bia"), "verificacoes", "bia"), pedidoV())));
await t("verificação: não envia em nome de outra pessoa", () => assertFails(setDoc(doc(ctx("ana"), "verificacoes", "bia2"), pedidoV({ uid: "bia2" }))));
await t("verificação: documento que não é foto JPEG é recusado", () => assertFails(setDoc(doc(ctx("edu"), "verificacoes", "edu"), pedidoV({ uid: "edu", documento: "data:text/html;base64,PHNjcmlwdD4=" }))));
await t("verificação: tipo de perfil estranho é recusado", () => assertFails(setDoc(doc(ctx("edu"), "verificacoes", "edu"), pedidoV({ uid: "edu", categoria: "rei" }))));
await t("verificação: outra pessoa não lê o pedido", () => assertFails(getDoc(doc(ctx("ana"), "verificacoes", "bia"))));
await t("verificação: o suporte não lê (só a moderação)", () => assertFails(getDoc(doc(ctx("mod2"), "verificacoes", "bia"))));
await t("verificação: a moderação lê", () => assertSucceeds(getDoc(doc(ctx("mod"), "verificacoes", "bia"))));
await t("verificação: aprovar sem apagar a foto do documento é recusado", () => assertFails(updateDoc(doc(ctx("mod"), "verificacoes", "bia"), { status: "aprovada", analisadaPor: "mod", analisadaEm: serverTimestamp() })));
await t("verificação: a pessoa não muda o pedido em análise (só cancela)", () => assertFails(updateDoc(doc(ctx("bia"), "verificacoes", "bia"), { nomeLegal: "Outro Nome" })));
await t("verificação: a moderação recusa com motivo e apaga a foto", () => assertSucceeds(updateDoc(doc(ctx("mod"), "verificacoes", "bia"), { status: "recusada", motivoRecusa: "Documento ilegível.", analisadaPor: "mod", analisadaEm: serverTimestamp(), documento: deleteField() })));
await t("verificação: depois de recusada, pede de novo", () => assertSucceeds(setDoc(doc(ctx("bia"), "verificacoes", "bia"), pedidoV())));
await t("verificação: a pessoa cancela (a foto sai junto)", () => assertSucceeds(updateDoc(doc(ctx("bia"), "verificacoes", "bia"), { status: "cancelada", atualizadoEm: serverTimestamp(), documento: deleteField() })));
await t("verificação: a moderação não aprova em nome de outro", async () => { await setDoc(doc(ctx("bia"), "verificacoes", "bia"), pedidoV()); await assertFails(updateDoc(doc(ctx("mod"), "verificacoes", "bia"), { status: "aprovada", analisadaPor: "adm", analisadaEm: serverTimestamp(), documento: deleteField() })); });
await t("verificação: a moderação aprova e apaga a foto", () => assertSucceeds(updateDoc(doc(ctx("mod"), "verificacoes", "bia"), { status: "aprovada", analisadaPor: "mod", analisadaEm: serverTimestamp(), documento: deleteField() })));

await t("verificação: documento de tamanho real (~600 KB) passa", () => assertSucceeds(setDoc(doc(ctx("edu"), "verificacoes", "edu"), pedidoV({ uid: "edu", documento: "data:image/jpeg;base64," + "Q".repeat(598000) }))));
await t("verificação: documento grande demais (> 700 KB) é recusado", () => assertFails(setDoc(doc(ctx("gui"), "verificacoes", "gui"), pedidoV({ uid: "gui", documento: "data:image/jpeg;base64," + "Q".repeat(710000) }))));
// selo: a moderação só dá com o pedido aprovado; o dono dá direto; tirar é livre
await semRegras(async (db) => { for (const u of ["bia", "edu", "hele"]) { await setDoc(doc(db, "usuarios", u), { uid: u, nome: u }, { merge: true }); await setDoc(doc(db, "perfis_publicos", u), { uid: u, nome: u }, { merge: true }); } });
await t("selo: a moderação dá o selo com o pedido aprovado", () => assertSucceeds(updateDoc(doc(ctx("mod"), "usuarios", "bia"), { verificado: true, solicitacaoVerificacao: false, verificacaoRespondidaEm: serverTimestamp() })));
await t("selo: e no perfil público também", () => assertSucceeds(updateDoc(doc(ctx("mod"), "perfis_publicos", "bia"), { verificado: true })));
await t("selo: a moderação NÃO dá o selo com o pedido ainda em análise", () => assertFails(updateDoc(doc(ctx("mod"), "usuarios", "edu"), { verificado: true })));
await t("selo: nem no perfil público", () => assertFails(updateDoc(doc(ctx("mod"), "perfis_publicos", "edu"), { verificado: true })));
await t("selo: a moderação NÃO dá o selo para quem não pediu", () => assertFails(updateDoc(doc(ctx("mod"), "usuarios", "hele"), { verificado: true })));
await t("selo: o dono do site dá o selo direto", () => assertSucceeds(updateDoc(doc(ctx("adm"), "usuarios", "hele"), { verificado: true })));
await t("selo: o dono dá no perfil público também", () => assertSucceeds(updateDoc(doc(ctx("adm"), "perfis_publicos", "hele"), { verificado: true })));
await t("selo: a moderação tira o selo", () => assertSucceeds(updateDoc(doc(ctx("mod"), "usuarios", "hele"), { verificado: false })));
await t("selo: a moderação tira do perfil público", () => assertSucceeds(updateDoc(doc(ctx("mod"), "perfis_publicos", "hele"), { verificado: false })));
await t("selo: o suporte não dá nem tira", () => assertFails(updateDoc(doc(ctx("mod2"), "usuarios", "bia"), { verificado: false })));
await t("selo: a pessoa não se dá o selo", () => assertFails(updateDoc(doc(ctx("hele"), "usuarios", "hele"), { verificado: true })));
await t("verificação: a moderação não muda um pedido já decidido", () => assertFails(updateDoc(doc(ctx("mod"), "verificacoes", "bia"), { status: "recusada", motivoRecusa: "x", analisadaPor: "mod", analisadaEm: serverTimestamp() })));
await t("verificação: a moderação não aprova um pedido cancelado", async () => { await semRegras((db) => setDoc(doc(db, "verificacoes", "hele"), { uid: "hele", status: "cancelada" })); await assertFails(updateDoc(doc(ctx("mod"), "verificacoes", "hele"), { status: "aprovada", analisadaPor: "mod", analisadaEm: serverTimestamp() })); });

// ===================== NEGÓCIOS: campos novos e estatísticas (neg_visitas + neg_stats) =====================
await semRegras(async (db) => {
  await setDoc(doc(db, "usuarios", "loja"), { uid: "loja", nome: "Loja", criadoEm: antigo, aceiteTermos: true });
  await setDoc(doc(db, "negocios", "loja_delivery"), { donoId: "loja", tipo: "delivery", nome: "Burger", cidade: "Florianópolis" });
});
const negX = (extra) => ({ donoId: "loja", tipo: "delivery", nome: "Burger", cidade: "Florianópolis", atualizadoEm: serverTimestamp(), ...extra });
const grava = (extra) => setDoc(doc(ctx("loja"), "negocios", "loja_delivery"), negX(extra));
await t("negócio: Instagram, site, CNPJ, capa, horário por dia e promoção", () => assertSucceeds(grava({
  instagram: "burger.da_ilha", site: "https://burgerdailha.com.br", cnpj: "11222333000181", capa: "data:image/jpeg;base64,AAAA",
  semana: ["", "11:00-23:00", "11:00-23:00", "11:00-23:00", "11:00-23:00", "11:00-23:59", "18:00-23:59"],
  promocao: { titulo: "10% no primeiro pedido", texto: "Use o cupom no chat.", codigo: "BEMVINDO10", ate: Timestamp.fromMillis(Date.now() + 10 * 864e5) } })));
await t("negócio com TUDO junto (de vazio para completo: 12 itens, 5 fotos, todos os campos, busca com 100 palavras) cabe no limite", async () => { await grava({}); await assertSucceeds(grava({
  busca: Array.from({ length: 100 }, (_, i) => "palavra" + i), descricao: "x".repeat(600), whatsapp: "48999998888", foto: "data:image/jpeg;base64,AAAA", fotos: Array(5).fill("data:image/jpeg;base64,AAAA"),
  itens: Array.from({ length: 12 }, (_, i) => ({ nome: "Item " + i, preco: 10, foto: "data:image/jpeg;base64,AAAA", secao: "Lanches", descricao: "abc", precoAntigo: 12 })),
  categoria: "hamburguer", horaAbre: "11:00", horaFecha: "23:00", tempoMin: 30, tempoMax: 50, taxaEntrega: 5, pedidoMinimo: 20, dias: ["seg", "ter"], opcoesEntrega: ["entrega"], pagamentos: ["pix"],
  uf: "SC", cidadeIbge: 4205407, bairro: "Centro", rua: "Rua A", numero: "1", complemento: "", cep: "88010001",
  instagram: "burger", site: "https://burger.com", cnpj: "11222333000181", capa: "data:image/jpeg;base64,AAAA",
  semana: ["", "11:00-23:00", "11:00-23:00", "11:00-23:00", "11:00-23:00", "11:00-23:59", "18:00-23:59"],
  promocao: { titulo: "Promo", texto: "x".repeat(200), codigo: "CUPOM10", ate: Timestamp.fromMillis(Date.now() + 864e5) } })); });
await t("negócio: site com mais de 120 letras é recusado", () => assertFails(grava({ site: "https://" + "a".repeat(120) })));
await t("negócio: Instagram com espaço/@ é recusado", () => assertFails(grava({ instagram: "@burger da ilha" })));
await t("negócio: site que não é http(s) é recusado", () => assertFails(grava({ site: "javascript:alert(1)" })));
await t("negócio: CNPJ com 13 números é recusado", () => assertFails(grava({ cnpj: "1122233300018" })));
await t("negócio: capa de outro site é recusada", () => assertFails(grava({ capa: "https://exemplo.com/x.jpg" })));
await t("negócio: horário com 6 dias é recusado", () => assertFails(grava({ semana: ["", "", "", "", "", ""] })));
await t("negócio: horário inválido (25:00) é recusado", () => assertFails(grava({ semana: ["25:00-26:00", "", "", "", "", "", ""] })));
await t("negócio: promoção de 90 dias é recusada (máx. 62)", () => assertFails(grava({ promocao: { titulo: "Promo longa", ate: Timestamp.fromMillis(Date.now() + 90 * 864e5) } })));
await t("negócio: cupom com minúsculas é recusado", () => assertFails(grava({ promocao: { titulo: "Promo", codigo: "abc10", ate: Timestamp.fromMillis(Date.now() + 864e5) } })));
await t("negócio: promoção e campos novos vazios valem", () => assertSucceeds(grava({ instagram: "", site: "", cnpj: "", promocao: null, semana: null })));

const agoraBR = () => { const d = new Date(Date.now() - 3 * 3600e3); return { dia: `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`, hora: d.getUTCHours() }; };
const NEG = "loja_delivery";
async function visitar(quem, origem = "vitrine", mexer = {}) {
  const { dia, hora } = agoraBR();
  const db = ctx(quem), b = writeBatch(db);
  const visita = { negocioId: NEG, uid: quem, dia, hora, origem, acoes: [], itens: [], ...(mexer.visita || {}) };
  b.set(doc(db, "neg_visitas", mexer.idVisita || `${NEG}_${quem}_${dia}`), visita);
  let existe = false; await semRegras(async (d0) => { existe = (await getDoc(doc(d0, "neg_stats", `${NEG}_${dia}`))).exists(); });
  const st = doc(db, "neg_stats", `${NEG}_${dia}`);
  if (mexer.semStats) {} else if (existe) b.update(st, { v: increment(mexer.mais || 1), [`o.${origem}`]: increment(1), [`h.${hora}`]: increment(1) });
  else b.set(st, { negocioId: NEG, donoId: "loja", dia, v: mexer.mais || 1, o: { [origem]: 1 }, h: { [String(hora)]: 1 }, a: {}, it: {} });
  return b.commit();
}
async function agir(quem, campo, x, mexer = {}) {
  const { dia } = agoraBR();
  const db = ctx(quem), b = writeBatch(db);
  const ref = doc(db, "neg_visitas", `${NEG}_${quem}_${dia}`);
  let antes = []; await semRegras(async (d0) => { antes = (await getDoc(doc(d0, "neg_visitas", `${NEG}_${quem}_${dia}`))).data()?.[campo] || []; });
  if (!mexer.semVisita) b.update(ref, { [campo]: [...antes, x] });
  if (!mexer.semStats) b.update(doc(db, "neg_stats", `${NEG}_${dia}`), { [`${campo === "acoes" ? "a" : "it"}.${x}`]: increment(1) });
  return b.commit();
}
await t("estatística: a pessoa confere a visita do dia que ainda não existe", () => assertSucceeds(getDoc(doc(ctx("ana"), "neg_visitas", `${NEG}_ana_${agoraBR().dia}`))));
await t("estatística: cliente visita o negócio (visita + número do dia juntos)", () => assertSucceeds(visitar("ana", "busca")));
await t("estatística: a mesma pessoa no mesmo dia não conta de novo", () => assertFails(visitar("ana", "busca")));
await t("estatística: outra pessoa visita (sobe para 2)", () => assertSucceeds(visitar("bia", "link")));
await t("estatística: o dono visitando o próprio negócio não conta", () => assertFails(visitar("loja")));
await t("estatística: visita sem subir o número é recusada", () => assertFails(visitar("edu", "vitrine", { semStats: true })));
await t("estatística: subir +2 numa visita é recusado", () => assertFails(visitar("edu", "vitrine", { mais: 2 })));
await t("estatística: dia errado é recusado", () => assertFails(visitar("edu", "vitrine", { visita: { dia: "20200101" } })));
await t("estatística: hora errada é recusada", () => assertFails(visitar("edu", "vitrine", { visita: { hora: (agoraBR().hora + 5) % 24 } })));
await t("estatística: origem desconhecida é recusada", () => assertFails(visitar("edu", "hacker")));
await t("estatística: visita em nome de outra pessoa é recusada", () => assertFails(visitar("edu", "vitrine", { visita: { uid: "ana" } })));
await t("estatística: inflar o número sozinho é recusado", () => assertFails(updateDoc(doc(ctx("edu"), "neg_stats", `${NEG}_${agoraBR().dia}`), { v: increment(1) })));
await t("estatística: tocar no WhatsApp conta (ação + número juntos)", () => assertSucceeds(agir("ana", "acoes", "whats")));
await t("estatística: a mesma ação no mesmo dia não conta de novo", () => assertFails(agir("ana", "acoes", "whats")));
await t("estatística: outra ação (rota) conta", () => assertSucceeds(agir("ana", "acoes", "rota")));
await t("estatística: ação sem subir o número é recusada", () => assertFails(agir("ana", "acoes", "site", { semStats: true })));
await t("estatística: subir o número da ação sem a visita é recusado", () => assertFails(agir("ana", "acoes", "site", { semVisita: true })));
await t("estatística: ação desconhecida é recusada", () => assertFails(agir("ana", "acoes", "hackear")));
await t("estatística: item visto (prato) conta", () => assertSucceeds(agir("bia", "itens", "p_x_bacon")));
await t("estatística: item com nome estranho é recusado", () => assertFails(agir("bia", "itens", "p_X Bacon!")));
await t("estatística: o dono lê os números do negócio", async () => { const r = await assertSucceeds(getDocs(query(collection(ctx("loja"), "neg_stats"), where("donoId", "==", "loja")))); const d = r.docs[0].data(); if (d.v !== 2 || d.a.whats !== 1 || d.a.rota !== 1 || d.it.p_x_bacon !== 1 || d.o.busca !== 1 || d.o.link !== 1) throw new Error("números errados: " + JSON.stringify(d)); });
await t("estatística: outra pessoa não lê os números", () => assertFails(getDocs(query(collection(ctx("bia"), "neg_stats"), where("donoId", "==", "loja")))));
await t("estatística: o dono NÃO lê quem visitou", () => assertFails(getDoc(doc(ctx("loja"), "neg_visitas", `${NEG}_ana_${agoraBR().dia}`))));
await t("estatística: a pessoa lê a própria visita", () => assertSucceeds(getDoc(doc(ctx("ana"), "neg_visitas", `${NEG}_ana_${agoraBR().dia}`))));
await t("estatística: ninguém apaga visitas nem números", () => assertFails(deleteDoc(doc(ctx("loja"), "neg_stats", `${NEG}_${agoraBR().dia}`))));

// ---------- planos dos negócios (Pro, Pix manual) ----------
await semRegras((db) => setDoc(doc(db, "admins", "com"), { nome: "Comercial", papel: "comercial" }));
const pedidoPlano = (uid, x = {}) => ({ uid, nome: "Loja X", email: uid + "@t.com", plano: "pro", meses: 3, valor: 119.7, txid: "HFLOJA123ABC", status: "pendente", criadoEm: serverTimestamp(), ...x });
await t("plano: a pessoa faz o pedido do Pro", () => assertSucceeds(setDoc(doc(ctx("loja"), "planos_pedidos", "pp1"), pedidoPlano("loja"))));
await t("plano: pedido em nome de outra pessoa é recusado", () => assertFails(setDoc(doc(ctx("bia"), "planos_pedidos", "pp2"), pedidoPlano("loja"))));
await t("plano: período fora da lista é recusado", () => assertFails(setDoc(doc(ctx("loja"), "planos_pedidos", "pp3"), pedidoPlano("loja", { meses: 2 }))));
await t("plano: pedido já pago é recusado", () => assertFails(setDoc(doc(ctx("loja"), "planos_pedidos", "pp3"), pedidoPlano("loja", { status: "pago" }))));
await t("plano: sem e-mail confirmado é recusado", () => assertFails(setDoc(doc(ctx("loja", false), "planos_pedidos", "pp3"), pedidoPlano("loja"))));
await t("plano: a pessoa lê os próprios pedidos", () => assertSucceeds(getDocs(query(collection(ctx("loja"), "planos_pedidos"), where("uid", "==", "loja")))));
await t("plano: outra pessoa não lê o pedido", () => assertFails(getDoc(doc(ctx("bia"), "planos_pedidos", "pp1"))));
await t("plano: a pessoa não marca o próprio pedido como pago", () => assertFails(updateDoc(doc(ctx("loja"), "planos_pedidos", "pp1"), { status: "pago" })));
await t("plano: a pessoa não se dá o Pro", () => assertFails(setDoc(doc(ctx("loja"), "planos", "loja"), { plano: "pro", ate: Timestamp.fromMillis(Date.now() + 9e9), ativadoEm: serverTimestamp(), ativadoPor: "loja" })));
await t("plano: moderação não confirma pagamento", () => assertFails(updateDoc(doc(ctx("mod"), "planos_pedidos", "pp1"), { status: "pago", decididoPor: "mod", decididoEm: serverTimestamp() })));
await t("plano: comercial NÃO lê os pedidos (só donos)", () => assertFails(getDocs(query(collection(ctx("com"), "planos_pedidos"), where("status", "==", "pendente")))));
await t("plano: comercial NÃO confirma o pagamento", () => assertFails(updateDoc(doc(ctx("com"), "planos_pedidos", "pp1"), { status: "pago", decididoPor: "com", decididoEm: serverTimestamp() })));
await t("plano: comercial NÃO ativa plano", () => assertFails(setDoc(doc(ctx("com"), "planos", "loja"), { plano: "pro", ate: Timestamp.fromMillis(Date.now() + 90 * 864e5), meses: 3, pedidoId: "pp1", ativadoEm: serverTimestamp(), ativadoPor: "com" })));
await t("plano: dono lê os pedidos", () => assertSucceeds(getDocs(query(collection(ctx("adm"), "planos_pedidos"), where("status", "==", "pendente")))));
await t("plano: dono confirma o pagamento", () => assertSucceeds(updateDoc(doc(ctx("adm"), "planos_pedidos", "pp1"), { status: "pago", decididoPor: "adm", decididoEm: serverTimestamp() })));
await t("plano: dono ativa o Pro", () => assertSucceeds(setDoc(doc(ctx("adm"), "planos", "loja"), { plano: "pro", ate: Timestamp.fromMillis(Date.now() + 90 * 864e5), meses: 3, pedidoId: "pp1", ativadoEm: serverTimestamp(), ativadoPor: "adm" })));
await t("plano: ativar com campo a mais é recusado", () => assertFails(setDoc(doc(ctx("adm"), "planos", "loja"), { plano: "pro", ate: Timestamp.fromMillis(Date.now()), ativadoEm: serverTimestamp(), ativadoPor: "adm", desconto: 100 })));
await t("plano: plano que não existe é recusado", () => assertFails(setDoc(doc(ctx("adm"), "planos", "loja"), { plano: "ouro", ate: Timestamp.fromMillis(Date.now() + 9e8), ativadoEm: serverTimestamp(), ativadoPor: "adm" })));
await t("plano: qualquer logado lê o plano (selo)", () => assertSucceeds(getDoc(doc(ctx("bia"), "planos", "loja"))));
await t("plano: pedido já decidido não muda mais", () => assertFails(updateDoc(doc(ctx("adm"), "planos_pedidos", "pp1"), { status: "recusado", decididoPor: "adm", decididoEm: serverTimestamp() })));
await t("plano: a pessoa cancela um pedido pendente", async () => { await setDoc(doc(ctx("loja"), "planos_pedidos", "pp4"), pedidoPlano("loja")); await assertSucceeds(updateDoc(doc(ctx("loja"), "planos_pedidos", "pp4"), { status: "cancelado" })); });
await t("plano: pedido do Plus e do Premium", async () => { await assertSucceeds(setDoc(doc(ctx("loja"), "planos_pedidos", "pp5"), pedidoPlano("loja", { plano: "plus", meses: 1, valor: 29.9 }))); await assertSucceeds(setDoc(doc(ctx("loja"), "planos_pedidos", "pp6"), pedidoPlano("loja", { plano: "premium", meses: 12, valor: 718.8 }))); });
await t("plano: pedido de plano inexistente é recusado", () => assertFails(setDoc(doc(ctx("loja"), "planos_pedidos", "pp7"), pedidoPlano("loja", { plano: "ouro" }))));
await t("plano: dono ativa o Premium", () => assertSucceeds(setDoc(doc(ctx("adm"), "planos", "bia"), { plano: "premium", ate: Timestamp.fromMillis(Date.now() + 30 * 864e5), ativadoEm: serverTimestamp(), ativadoPor: "adm" })));
await t("plano: ninguém apaga pedido", () => assertFails(deleteDoc(doc(ctx("adm"), "planos_pedidos", "pp4"))));

// ---------- teste grátis de 30 dias no primeiro acesso ----------
const teste = (uid, x = {}) => ({ plano: "pro", teste: true, meses: 1, ate: Timestamp.fromMillis(Date.now() + 30 * 864e5), ativadoEm: serverTimestamp(), ativadoPor: uid, ...x });
await t("teste grátis: a pessoa começa 30 dias no primeiro acesso", () => assertSucceeds(setDoc(doc(ctx("ana"), "planos", "ana"), teste("ana"))));
await t("teste grátis: não começa de novo (a conta já teve plano)", () => assertFails(setDoc(doc(ctx("ana"), "planos", "ana"), teste("ana", { plano: "premium" }))));
await t("teste grátis: quem já pagou não ganha teste", () => assertFails(setDoc(doc(ctx("loja"), "planos", "loja"), teste("loja"))));
await t("teste grátis: mais de 30 dias é recusado", () => assertFails(setDoc(doc(ctx("dono"), "planos", "dono"), teste("dono", { ate: Timestamp.fromMillis(Date.now() + 60 * 864e5) }))));
await t("teste grátis: sem a marca de teste é recusado", () => assertFails(setDoc(doc(ctx("dono"), "planos", "dono"), teste("dono", { teste: false }))));
await t("teste grátis: para outra conta é recusado", () => assertFails(setDoc(doc(ctx("bia"), "planos", "dono"), teste("bia"))));
await t("teste grátis: sem e-mail confirmado é recusado", () => assertFails(setDoc(doc(ctx("dono", false), "planos", "dono"), teste("dono"))));
await t("teste grátis: a pessoa não estica o próprio teste", () => assertFails(updateDoc(doc(ctx("ana"), "planos", "ana"), { ate: Timestamp.fromMillis(Date.now() + 300 * 864e5) })));
await t("teste grátis: dono do site ativa o plano pago por cima do teste", () => assertSucceeds(setDoc(doc(ctx("adm"), "planos", "ana"), { plano: "pro", ate: Timestamp.fromMillis(Date.now() + 120 * 864e5), meses: 3, pedidoId: "pp9", ativadoEm: serverTimestamp(), ativadoPor: "adm" })));

// ---------- condição especial / parceria pelos planos (só donos negociam) ----------
const semCampos = (o, ...k) => { k.forEach((c) => delete o[c]); return o; };
const negPlano = (uid, x = {}) => ({ uid, nome: "Loja X", email: uid + "@t.com", tipo: "apoio", plano: "pro", valorProposto: 15, contato: "48 99999-0000", mensagem: "Sou autônoma e a renda caiu este mês, consigo pagar menos.", status: "novo", criadoEm: serverTimestamp(), comprovanteTipo: "cadunico", declaracao: true, comprovante: { tipo: "imagem", url: "data:image/jpeg;base64,/9j/4AAQ", nome: "cadunico.jpg" }, ...x });
await t("negociação: condição especial sem a declaração é recusada", () => assertFails(setDoc(doc(ctx("bia"), "planos_negociacoes", "bia"), negPlano("bia", { declaracao: false }))));
await t("negociação: condição especial sem dizer o documento é recusada", () => assertFails(setDoc(doc(ctx("bia"), "planos_negociacoes", "bia"), negPlano("bia", { comprovanteTipo: "" }))));
await t("negociação: documento fora da lista é recusado", () => assertFails(setDoc(doc(ctx("bia"), "planos_negociacoes", "bia"), negPlano("bia", { comprovanteTipo: "selfie" }))));
await t("negociação: anexo de outro tipo (html) é recusado", () => assertFails(setDoc(doc(ctx("bia"), "planos_negociacoes", "bia"), negPlano("bia", { comprovante: { tipo: "arquivo", url: "data:text/html;base64,PGgxPg==", nome: "x.html" } }))));
await t("negociação: parceria não leva comprovante de renda", () => assertFails(setDoc(doc(ctx("bia"), "planos_negociacoes", "bia"), negPlano("bia", { tipo: "parceria" }))));
await t("negociação: a pessoa pede condição especial", () => assertSucceeds(setDoc(doc(ctx("loja"), "planos_negociacoes", "loja"), negPlano("loja"))));
await t("negociação: em nome de outra pessoa é recusado", () => assertFails(setDoc(doc(ctx("bia"), "planos_negociacoes", "loja"), negPlano("bia"))));
await t("negociação: no documento de outra pessoa é recusado", () => assertFails(setDoc(doc(ctx("bia"), "planos_negociacoes", "loja2"), negPlano("bia"))));
await t("negociação: mensagem curta é recusada", () => assertFails(setDoc(doc(ctx("bia"), "planos_negociacoes", "bia"), negPlano("bia", { mensagem: "quero" }))));
await t("negociação: tipo estranho é recusado", () => assertFails(setDoc(doc(ctx("bia"), "planos_negociacoes", "bia"), negPlano("bia", { tipo: "golpe" }))));
await t("negociação: sem e-mail confirmado é recusado", () => assertFails(setDoc(doc(ctx("bia", false), "planos_negociacoes", "bia"), negPlano("bia"))));
await t("negociação: a pessoa já aprovada não se aprova", () => assertFails(updateDoc(doc(ctx("loja"), "planos_negociacoes", "loja"), { status: "aprovado" })));
await t("negociação: pedir de novo com um aberto é recusado", () => assertFails(setDoc(doc(ctx("loja"), "planos_negociacoes", "loja"), negPlano("loja", { tipo: "parceria" }))));
await t("negociação: a pessoa lê o próprio pedido", () => assertSucceeds(getDoc(doc(ctx("loja"), "planos_negociacoes", "loja"))));
await t("negociação: outra pessoa não lê", () => assertFails(getDoc(doc(ctx("bia"), "planos_negociacoes", "loja"))));
await t("negociação: comercial não lê", () => assertFails(getDocs(collection(ctx("com"), "planos_negociacoes"))));
await t("negociação: moderação não lê", () => assertFails(getDoc(doc(ctx("mod"), "planos_negociacoes", "loja"))));
await t("negociação: comercial não aprova", () => assertFails(updateDoc(doc(ctx("com"), "planos_negociacoes", "loja"), { status: "aprovado", planoConcedido: "pro", meses: 3, valorAcordado: 0, decididoPor: "com", decididoEm: serverTimestamp() })));
await t("negociação: dono lista os pedidos", () => assertSucceeds(getDocs(collection(ctx("adm"), "planos_negociacoes"))));
await t("negociação: dono põe em conversa", () => assertSucceeds(updateDoc(doc(ctx("adm"), "planos_negociacoes", "loja"), { status: "em_conversa", decididoPor: "adm", decididoEm: serverTimestamp() })));
await t("negociação: aprovar sem plano é recusado", () => assertFails(updateDoc(doc(ctx("adm"), "planos_negociacoes", "loja"), { status: "aprovado", decididoPor: "adm", decididoEm: serverTimestamp() })));
await t("negociação: dono não aprova deixando o documento guardado", () => assertFails(updateDoc(doc(ctx("adm"), "planos_negociacoes", "loja"), { status: "recusado", resposta: "Não", decididoPor: "adm", decididoEm: serverTimestamp() })));
await t("negociação: dono aprova (plano + negociação juntos)", async () => {
  const db = ctx("adm"); const b = writeBatch(db);
  b.update(doc(db, "planos_negociacoes", "loja"), { status: "aprovado", planoConcedido: "pro", meses: 3, valorAcordado: 45, resposta: "Liberado!", comprovante: deleteField(), decididoPor: "adm", decididoEm: serverTimestamp() });
  b.set(doc(db, "planos", "loja"), { plano: "pro", ate: Timestamp.fromMillis(Date.now() + 90 * 864e5), meses: 3, negociacaoId: "loja", ativadoEm: serverTimestamp(), ativadoPor: "adm" });
  await assertSucceeds(b.commit());
});
await t("negociação: decidida não muda mais pela equipe", () => assertFails(updateDoc(doc(ctx("adm"), "planos_negociacoes", "loja"), { status: "recusado", decididoPor: "adm", decididoEm: serverTimestamp() })));
await t("negociação: depois de decidida, a pessoa pede de novo", () => assertSucceeds(setDoc(doc(ctx("loja"), "planos_negociacoes", "loja"), semCampos(negPlano("loja", { tipo: "parceria", valorProposto: 0 }), "comprovanteTipo", "declaracao", "comprovante"))));
await t("negociação: pedido novo não leva a decisão antiga", () => assertFails(setDoc(doc(ctx("bia"), "planos_negociacoes", "bia"), negPlano("bia", { valorAcordado: 0 }))));
await t("negociação: a pessoa cancela o pedido aberto", () => assertSucceeds(updateDoc(doc(ctx("loja"), "planos_negociacoes", "loja"), { status: "cancelado" })));
await t("negociação: pedido com 'mando depois' e sem anexo", () => assertSucceeds(setDoc(doc(ctx("loja"), "planos_negociacoes", "loja"), semCampos(negPlano("loja", { comprovanteTipo: "depois" }), "comprovante"))));
await t("negociação: cancelar apaga o documento junto", async () => { await semRegras((db) => updateDoc(doc(db, "planos_negociacoes", "loja"), { comprovante: { tipo: "arquivo", url: "data:application/pdf;base64,JVBERi0=", nome: "x.pdf" } })); await assertSucceeds(updateDoc(doc(ctx("loja"), "planos_negociacoes", "loja"), { status: "cancelado", comprovante: deleteField() })); });
await t("negociação: ninguém apaga", () => assertFails(deleteDoc(doc(ctx("adm"), "planos_negociacoes", "loja"))));

// ---------- registro de ações: só os donos leem (o resto vê só as cobranças) ----------
await semRegras((db) => Promise.all([setDoc(doc(db, "admin_log", "l1"), { acao: "aviso", alvo: "bia", por: "mod", em: Timestamp.now() }), setDoc(doc(db, "admin_log", "l2"), { acao: "cobrar_reclamacao", alvo: "loja", detalhe: "queixa:q1", por: "mod", em: Timestamp.now() })]));
await t("registro: dono lê tudo", () => assertSucceeds(getDocs(query(collection(ctx("adm"), "admin_log"), orderBy("em", "desc"), limit(50)))));
await t("registro: dono lê o dia (histórico por pessoa)", () => assertSucceeds(getDocs(query(collection(ctx("adm"), "admin_log"), where("em", ">=", Timestamp.fromMillis(Date.now() - 864e5)), orderBy("em", "asc")))));
await t("registro: moderação NÃO lê o registro", () => assertFails(getDocs(query(collection(ctx("mod"), "admin_log"), orderBy("em", "desc"), limit(50)))));
await t("registro: comercial NÃO lê uma ação", () => assertFails(getDoc(doc(ctx("com"), "admin_log", "l1"))));
await t("registro: moderação lê as cobranças das reclamações", () => assertSucceeds(getDocs(query(collection(ctx("mod"), "admin_log"), where("acao", "==", "cobrar_reclamacao")))));
await t("registro: toda a equipe continua registrando", () => assertSucceeds(addDoc(collection(ctx("mod"), "admin_log"), { acao: "entrou", alvo: "", detalhe: "Entrou no painel", por: "mod", porNome: "Mod", em: serverTimestamp() })));
await t("registro: fora da equipe não registra", () => assertFails(addDoc(collection(ctx("bia"), "admin_log"), { acao: "entrou", por: "bia", em: serverTimestamp() })));

// ---------- Saúde (perfil de negócio) ----------
const sau = (uid, x = {}, s = {}) => ({ donoId: uid, tipo: "saude", nome: "Dra. Ana · Psicóloga", cidade: "Florianópolis", uf: "SC", cidadeIbge: 4205407, categoria: "psicologo", criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
  saude: { profissao: "psicologo", profissaoOutra: "", especialidades: ["Ansiedade e depressão", "TCC"], registro: "12/34567", registroUf: "SC", rqe: "", modalidades: ["consultorio", "online"], convenios: ["Unimed"], particular: true, valorConsulta: 180, duracao: 50, publico: ["adultos", "adolescentes"], idiomas: ["Português"], acessivel: true, formacao: "Psicologia UFSC", ...s }, ...x });
await t("saúde: cria o perfil completo", () => assertSucceeds(setDoc(doc(ctx("ana"), "negocios", "ana_saude"), sau("ana"))));
await t("saúde: atualiza a especialidade", () => assertSucceeds(updateDoc(doc(ctx("ana"), "negocios", "ana_saude"), { "saude.especialidades": ["Luto"], atualizadoEm: serverTimestamp() })));
await t("saúde: profissão que não existe é recusada", () => assertFails(setDoc(doc(ctx("bia"), "negocios", "bia_saude"), sau("bia", {}, { profissao: "mago" }))));
await t("saúde: perfil sem o mapa saúde é recusado", async () => { const d = sau("bia"); delete d.saude; await assertFails(setDoc(doc(ctx("bia"), "negocios", "bia_saude"), d)); });
await t("saúde: campo estranho no mapa é recusado", () => assertFails(setDoc(doc(ctx("bia"), "negocios", "bia_saude"), sau("bia", {}, { nota: 5 }))));
await t("saúde: registro com caractere estranho é recusado", () => assertFails(setDoc(doc(ctx("bia"), "negocios", "bia_saude"), sau("bia", {}, { registro: "<script>" }))));
await t("saúde: modalidade estranha é recusada", () => assertFails(setDoc(doc(ctx("bia"), "negocios", "bia_saude"), sau("bia", {}, { modalidades: ["teletransporte"] }))));
await t("saúde: especialidade com mais de 40 letras é recusada", () => assertFails(setDoc(doc(ctx("bia"), "negocios", "bia_saude"), sau("bia", {}, { especialidades: ["x".repeat(41)] }))));
await t("saúde: mais de 30 itens nas listas é recusado", () => assertFails(setDoc(doc(ctx("bia"), "negocios", "bia_saude"), sau("bia", {}, { especialidades: Array(10).fill("a"), convenios: Array(15).fill("b"), idiomas: Array(7).fill("c") }))));
await t("saúde: faltando campo no mapa é recusado", async () => { const d = sau("bia"); delete d.saude.formacao; await assertFails(setDoc(doc(ctx("bia"), "negocios", "bia_saude"), d)); });
await t("saúde: particular que não é sim/não é recusado", () => assertFails(setDoc(doc(ctx("bia"), "negocios", "bia_saude"), sau("bia", {}, { particular: "sim" }))));
await t("saúde: duração absurda é recusada", () => assertFails(setDoc(doc(ctx("bia"), "negocios", "bia_saude"), sau("bia", {}, { duracao: 5000 }))));
await t("saúde: valor da consulta absurdo é recusado", () => assertFails(setDoc(doc(ctx("bia"), "negocios", "bia_saude"), sau("bia", {}, { valorConsulta: 999999 }))));
await t("saúde: veterinário com público de pets e sem registro de RQE", () => assertSucceeds(setDoc(doc(ctx("bia"), "negocios", "bia_saude"), sau("bia", { categoria: "veterinario" }, { profissao: "veterinario", publico: ["caes", "gatos"], registro: "1234", rqe: "" }))));
await t("saúde: perfil de saúde com TUDO junto (máximo, com busca) cabe nas regras", () => assertSucceeds(setDoc(doc(ctx("dono"), "negocios", "dono_saude"), sau("dono", { busca: Array.from({ length: 100 }, (_, i) => "palavra" + i), instagram: "dra.ana", site: "https://ana.com.br", cnpj: "", semana: ["", "08:00-12:00", "08:00-18:00", "08:00-18:00", "08:00-18:00", "08:00-18:00", ""], promocao: { titulo: "Primeira consulta", texto: "10% na primeira", codigo: "BEMVINDO", ate: Timestamp.fromMillis(Date.now() + 10 * 864e5) }, geo: { lat: -27.6, lng: -48.5 }, capa: "data:image/jpeg;base64,AAA" },
  { profissao: "medico", especialidades: ["Clínica geral", "Pediatria", "Geriatria", "Cardiologia", "Neurologia", "Dermatologia"], registro: "123456", rqe: "9876", modalidades: ["consultorio", "online", "domicilio"], convenios: ["Unimed", "Bradesco Saúde", "SulAmérica", "Amil", "Hapvida NotreDame", "Porto Saúde", "Cassi", "Geap", "Saúde Caixa", "Postal Saúde", "SC Saúde", "Petlove Saúde", "Outro 1", "Outro 2", "Outro 3"], publico: ["bebes", "criancas", "adolescentes", "adultos", "idosos", "gestantes"], idiomas: ["Português", "Inglês", "Espanhol", "Libras", "Italiano", "Francês", "Alemão"], formacao: "y".repeat(200) }))));

// ---------- banimento de um programa ----------
await t("banimento: moderação bane da Comunidade", () => assertSucceeds(setDoc(doc(ctx("mod"), "programa_banidos", "bia_comunidade"), { uid: "bia", tipo: "comunidade", motivo: "Vendendo celular", por: "mod", em: serverTimestamp() })));
await t("banimento: a pessoa lê o próprio", () => assertSucceeds(getDoc(doc(ctx("bia"), "programa_banidos", "bia_comunidade"))));
await t("banimento: outra pessoa não lê", () => assertFails(getDoc(doc(ctx("ana"), "programa_banidos", "bia_comunidade"))));
await t("banimento: usuário comum não bane", () => assertFails(setDoc(doc(ctx("ana"), "programa_banidos", "bia_saude"), { uid: "bia", tipo: "saude", motivo: "teste", por: "ana", em: serverTimestamp() })));
await t("banimento: id que não bate é recusado", () => assertFails(setDoc(doc(ctx("mod"), "programa_banidos", "bia_x"), { uid: "bia", tipo: "saude", motivo: "teste", por: "mod", em: serverTimestamp() })));
await t("banimento: banido do programa Saúde não cria o perfil de novo", async () => {
  await assertSucceeds(setDoc(doc(ctx("mod"), "programa_banidos", "bia_saude"), { uid: "bia", tipo: "saude", motivo: "Registro falso", por: "mod", em: serverTimestamp() }));
  await assertSucceeds(deleteDoc(doc(ctx("bia"), "negocios", "bia_saude")));
  await assertFails(setDoc(doc(ctx("bia"), "negocios", "bia_saude"), sau("bia", { categoria: "veterinario" }, { profissao: "veterinario", publico: ["caes"], registro: "1234" })));
});
await t("banimento: com prazo vencido, volta a poder", async () => {
  await assertSucceeds(setDoc(doc(ctx("mod"), "programa_banidos", "bia_saude"), { uid: "bia", tipo: "saude", motivo: "Registro falso", ate: Timestamp.fromMillis(Date.now() - 1000), por: "mod", em: serverTimestamp() }));
  await assertSucceeds(setDoc(doc(ctx("bia"), "negocios", "bia_saude"), sau("bia", { categoria: "veterinario" }, { profissao: "veterinario", publico: ["caes"], registro: "1234" })));
});
await t("banimento: escondido pela equipe, o dono não mostra o perfil de novo", async () => {
  await assertSucceeds(updateDoc(doc(ctx("mod"), "negocios", "bia_saude"), { ocultoAte: Timestamp.fromMillis(Date.now() + 9e9), ocultoPelaEquipe: true }));
  await assertFails(updateDoc(doc(ctx("bia"), "negocios", "bia_saude"), { ocultoAte: null, atualizadoEm: serverTimestamp() }));
});

// ---------- Comunidade ----------
const com = (uid, x = {}) => ({ donoId: uid, categoria: "doacao", tipoItem: "moveis", titulo: "Sofá de 3 lugares", descricao: "Em bom estado, retirar no Centro.", fotos: [], estado: "usado", entrega: "retirar", status: "disponivel", uf: "SC", cidade: "Florianópolis", cidadeIbge: 4205407, bairro: "Centro", aceiteRegras: true, criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(), ...x });
await t("comunidade: doação", () => assertSucceeds(setDoc(doc(ctx("ana"), "comunidade", "c1"), com("ana"))));
await t("busca: anúncio da Comunidade com as palavras da busca", () => assertSucceeds(setDoc(doc(ctx("ana"), "comunidade", "cb1"), com("ana", { busca: ["berco", "ber", "berc", "madeira"] }))));
await t("busca: mais de 100 palavras é recusado", () => assertFails(setDoc(doc(ctx("ana"), "comunidade", "cb2"), com("ana", { busca: Array.from({ length: 101 }, (_, i) => "p" + i) }))));
await t("busca: o dono preenche só a busca num negócio antigo", () => assertSucceeds(updateDoc(doc(ctx("loja"), "negocios", "loja_delivery"), { busca: ["burger", "bur", "burg", "lanche"] })));
await t("busca: outra pessoa não mexe na busca de um negócio", () => assertFails(updateDoc(doc(ctx("ana"), "negocios", "loja_delivery"), { busca: ["golpe"] })));
await t("busca: negócio com mais de 100 palavras é recusado", () => assertFails(updateDoc(doc(ctx("loja"), "negocios", "loja_delivery"), { busca: Array.from({ length: 101 }, (_, i) => "p" + i) })));
await t("comunidade: sem aceitar as regras é recusado", () => assertFails(setDoc(doc(ctx("ana"), "comunidade", "c2"), com("ana", { aceiteRegras: false }))));
await t("comunidade: 'vendo' no texto é recusado", () => assertFails(setDoc(doc(ctx("ana"), "comunidade", "c2"), com("ana", { titulo: "Vendo sofá" }))));
await t("comunidade: 'VENDA' na descrição é recusado", () => assertFails(setDoc(doc(ctx("ana"), "comunidade", "c2"), com("ana", { descricao: "Faço VENDA barato" }))));
await t("comunidade: 'R$' na doação é recusado", () => assertFails(setDoc(doc(ctx("ana"), "comunidade", "c2"), com("ana", { descricao: "Só R$ 20 do frete" }))));
await t("comunidade: palavra parecida (vendedor) passa", () => assertSucceeds(setDoc(doc(ctx("ana"), "comunidade", "c2"), com("ana", { descricao: "Era do meu avô, que foi vendedor ambulante." }))));
await t("comunidade: quarto compartilhado com divisão das despesas", () => assertSucceeds(setDoc(doc(ctx("ana"), "comunidade", "c3"), com("ana", { categoria: "quarto", titulo: "Vaga no Pantanal", tipoItem: "", estado: "usado", quarto: { vaga: "compartilhado", rateio: 600, contasInclusas: true, mobiliado: true, vagas: 1, para: "mulheres", disponivelEm: "2026-11-01", regras: "Não fumantes" }, descricao: "Divisão R$ 600 com contas." }))));
await t("comunidade: quarto sem os dados da vaga é recusado", () => assertFails(setDoc(doc(ctx("ana"), "comunidade", "c4"), com("ana", { categoria: "quarto" }))));
await t("comunidade: quarto com divisão absurda é recusado", () => assertFails(setDoc(doc(ctx("ana"), "comunidade", "c4"), com("ana", { categoria: "quarto", quarto: { vaga: "individual", rateio: 99000, para: "todos" } }))));
await t("comunidade: doação não leva dados de quarto", () => assertFails(setDoc(doc(ctx("ana"), "comunidade", "c4"), com("ana", { quarto: { vaga: "individual", para: "todos" } }))));
await t("comunidade: achados e perdidos", () => assertSucceeds(setDoc(doc(ctx("ana"), "comunidade", "c5"), com("ana", { categoria: "achados", titulo: "Carteira marrom", achado: { tipo: "perdido", data: "2026-10-20", local: "TICEN" } }))));
await t("comunidade: categoria estranha é recusada", () => assertFails(setDoc(doc(ctx("ana"), "comunidade", "c6"), com("ana", { categoria: "venda" }))));
await t("comunidade: em nome de outra pessoa é recusado", () => assertFails(setDoc(doc(ctx("dono"), "comunidade", "c6"), com("ana"))));
await t("comunidade: banido do programa não anuncia", () => assertFails(setDoc(doc(ctx("bia"), "comunidade", "c7"), com("bia"))));
await t("comunidade: dono marca como concluído", () => assertSucceeds(updateDoc(doc(ctx("ana"), "comunidade", "c1"), { status: "concluido", atualizadoEm: serverTimestamp() })));
await t("comunidade: dono não troca o texto para venda", () => assertFails(updateDoc(doc(ctx("ana"), "comunidade", "c2"), { titulo: "Vendo tudo", atualizadoEm: serverTimestamp() })));
await t("comunidade: outra pessoa não edita", () => assertFails(updateDoc(doc(ctx("dono"), "comunidade", "c2"), { status: "concluido" })));
await t("comunidade: moderação esconde", () => assertSucceeds(updateDoc(doc(ctx("mod"), "comunidade", "c2"), { ocultoAte: Timestamp.fromMillis(Date.now() + 9e9), ocultoPelaEquipe: true })));
await t("comunidade: escondido pela equipe, o dono não mostra de novo", () => assertFails(updateDoc(doc(ctx("ana"), "comunidade", "c2"), { ocultoAte: null })));
await t("comunidade: moderação apaga", () => assertSucceeds(deleteDoc(doc(ctx("mod"), "comunidade", "c5"))));
await t("comunidade: denúncia de venda no anúncio", () => assertSucceeds(setDoc(doc(ctx("dono"), "denuncias", "comunidade_c3_dono"), { tipo: "comunidade", alvoId: "ana", itemId: "c3", autorId: "dono", motivo: "venda", detalhe: "", trecho: "Vaga no Pantanal", status: "nova", criadoEm: serverTimestamp() })));
await t("comunidade: denúncia contra quem não é o dono é recusada", () => assertFails(setDoc(doc(ctx("dono"), "denuncias", "comunidade_c3_dono2"), { tipo: "comunidade", alvoId: "bia", itemId: "c3", autorId: "dono", motivo: "venda", status: "nova", criadoEm: serverTimestamp() })));
await t("conversa: assunto Saúde e Comunidade", () => assertSucceeds(setDoc(doc(ctx("ana"), "conversas", "ana_zeca"), { participantes: ["ana", "zeca"], ultimaMensagem: "", atualizadoEm: serverTimestamp(), contexto: { tipo: "comunidade", titulo: "Sofá" } })));

// ---------- resultado ----------
for (const r of resultados) console.log(r[0] === "ok" ? "  ✔" : "  ✘", r[1], r[2] ? "→ " + r[2] : "");
console.log(`\n${ok} passaram, ${falhou} falharam (${arquivo})`);
await env.cleanup();
process.exit(falhou ? 1 : 0);
