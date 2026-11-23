// Testes das regras do Firebase Storage (storage.rules) no emulador: Storage 9199 + Firestore (participantes e equipe),
// projeto "demo-storage". Sobe com: ./emulador.sh (inclui o Storage na porta 9199).
// Uso: node testes-storage.mjs [arquivo.rules]
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { ref, uploadBytes, getBytes, deleteObject, listAll } from "firebase/storage";
import { doc, setDoc } from "firebase/firestore";

const arquivo = process.argv[2] || new URL("../storage.rules", import.meta.url).pathname;
const FS_PORTA = Number(process.env.FS_PORTA || 8085), ST_PORTA = Number(process.env.ST_PORTA || 9199);
const env = await initializeTestEnvironment({
  projectId: "demo-storage",
  storage: { rules: readFileSync(arquivo, "utf8"), host: "127.0.0.1", port: ST_PORTA },
  firestore: { rules: "rules_version='2'; service cloud.firestore { match /databases/{d}/documents { match /{x=**} { allow read, write: if false; } } }", host: "127.0.0.1", port: FS_PORTA }
});
let ok = 0, falhou = 0;
const res = [];
async function t(nome, fn) {
  try { await fn(); ok++; res.push(["ok", nome]); }
  catch (e) { falhou++; res.push(["FALHOU", nome, String(e.message).split("\n")[0].slice(0, 200)]); }
}
// Contas de teste com e-mail confirmado; "semEmail" sem confirmar.
const st = (uid) => (uid ? env.authenticatedContext(uid, { email_verified: uid !== "semEmail" }) : env.unauthenticatedContext()).storage();
const MB = 1024 * 1024;
const bytes = (n) => new Uint8Array(n);
const subir = (uid, caminho, tipo = "image/jpeg", tam = 2000) => uploadBytes(ref(st(uid), caminho), bytes(tam), { contentType: tipo });

// Dados do Firestore usados pelas regras: conversa ana×bia, equipe (st_adm = moderação, st_dono = dono do site).
// As regras do Storage consultam o Firestore do projeto com que o emulador subiu (demo-hf): os dados vão para lá,
// com ids próprios do teste, e saem no fim.
process.env.FIRESTORE_EMULATOR_HOST = `127.0.0.1:${FS_PORTA}`;
const { initializeApp } = await import("firebase-admin/app");
const { getFirestore } = await import("firebase-admin/firestore");
const adm = getFirestore(initializeApp({ projectId: process.env.FS_PROJETO || "demo-hf" }));
const APOIO = [["conversas/st_ana_bia", { participantes: ["ana", "bia"] }], ["admins/st_adm", { papel: "moderacao" }], ["admins/st_dono", { papel: "dono" }], ["admins/st_com", { papel: "comercial" }],
  ["sancoes/st_ban", { tipo: "banimento" }], ["sancoes/st_susp", { tipo: "suspensao", ate: new Date(Date.now() + 864e5) }],
  ["sancoes/st_venc", { tipo: "suspensao", ate: new Date(Date.now() - 864e5) }]];
for (const [c, d] of APOIO) await adm.doc(c).set(d);
await env.clearStorage();

// ---------- perfil ----------
await t("foto de perfil: a própria (nome único)", () => assertSucceeds(subir("ana", "fotosPerfil/ana_lz3k9.jpg")));
await t("foto de perfil: nome antigo (UID.jpg)", () => assertSucceeds(subir("ana", "fotosPerfil/ana.jpg")));
await t("foto de perfil: de outra pessoa NÃO", () => assertFails(subir("ana", "fotosPerfil/bia_lz3k9.jpg")));
await t("foto de perfil: uid parecido NÃO (anaX)", () => assertFails(subir("ana", "fotosPerfil/anaX_1.jpg")));
await t("foto de perfil: sem login NÃO", () => assertFails(subir(null, "fotosPerfil/ana_2.jpg")));
await t("foto de perfil: PDF NÃO", () => assertFails(subir("ana", "fotosPerfil/ana_3.jpg", "application/pdf")));
await t("foto de perfil: maior que 5 MB NÃO", () => assertFails(subir("ana", "fotosPerfil/ana_4.jpg", "image/jpeg", 5 * MB + 10)));
await t("foto de perfil: outra conta NÃO abre pelo nome (só pelo link com código)", () => assertFails(getBytes(ref(st("bruno"), "fotosPerfil/ana_lz3k9.jpg"))));
await t("sem login: não baixa nem lista pelo Storage", () => assertFails(getBytes(ref(st(null), "fotosPerfil/ana_lz3k9.jpg"))));
await t("capa: a própria", () => assertSucceeds(subir("ana", "fotosCapa/ana_lz3k9.jpg")));
await t("capa: apagar a de outra pessoa NÃO", () => assertFails(deleteObject(ref(st("bia"), "fotosCapa/ana_lz3k9.jpg"))));
await t("capa: apagar a própria", () => assertSucceeds(deleteObject(ref(st("ana"), "fotosCapa/ana_lz3k9.jpg"))));

// ---------- negócios, anúncios, Diário, Flash, Comunidade ----------
await t("negócio: foto e capa do próprio (UID_tipo...)", async () => { await assertSucceeds(subir("ana", "negocios/ana_saude_lz1.jpg")); await assertSucceeds(subir("ana", "negocios/ana_saude_capa_lz1.jpg")); });
await t("negócio: de outra pessoa NÃO", () => assertFails(subir("bia", "negocios/ana_saude_lz2.jpg")));
await t("anúncio de imóvel: o próprio", () => assertSucceeds(subir("ana", "anuncios/ana_AN1_f0_lz1.jpg")));
await t("anúncio de imóvel: de outra pessoa NÃO", () => assertFails(subir("bia", "anuncios/ana_AN1_f0_lz2.jpg")));
await t("Diário: foto na própria pasta", () => assertSucceeds(subir("ana", "diario/ana/1-0_lz.jpg")));
await t("Diário: vídeo de 30 MB", () => assertSucceeds(subir("ana", "diario/ana/2.mp4", "video/mp4", 30 * MB)));
await t("Diário: vídeo maior que 50 MB NÃO", () => assertFails(subir("ana", "diario/ana/3.mp4", "video/mp4", 51 * MB)));
await t("Diário: pasta de outra pessoa NÃO", () => assertFails(subir("bia", "diario/ana/4.jpg")));
await t("Diário: áudio NÃO", () => assertFails(subir("ana", "diario/ana/5.webm", "audio/webm")));
await t("Flash: foto e vídeo na própria pasta", async () => { await assertSucceeds(subir("ana", "stories/ana/1.jpg")); await assertSucceeds(subir("ana", "stories/ana/2.mp4", "video/mp4")); });
await t("Flash: pasta de outra pessoa NÃO", () => assertFails(subir("bia", "stories/ana/3.jpg")));
await t("Comunidade: foto na própria pasta", () => assertSucceeds(subir("ana", "comunidade/ana/0_lz.jpg")));
await t("Comunidade: vídeo NÃO", () => assertFails(subir("ana", "comunidade/ana/1.mp4", "video/mp4")));
await t("Comunidade: pasta de outra pessoa NÃO", () => assertFails(subir("bia", "comunidade/ana/2.jpg")));
await t("equipe apaga foto da Comunidade", () => assertSucceeds(deleteObject(ref(st("st_adm"), "comunidade/ana/0_lz.jpg"))));

// ---------- conversas ----------
await t("chat: participante envia foto", () => assertSucceeds(subir("ana", "mensagens/st_ana_bia/ana/1.jpg")));
await t("chat: participante envia áudio", () => assertSucceeds(subir("bia", "mensagens/st_ana_bia/bia/2.webm", "audio/webm;codecs=opus", 300000)));
await t("chat: participante envia vídeo", () => assertSucceeds(subir("ana", "mensagens/st_ana_bia/ana/3.mp4", "video/mp4", 10 * MB)));
await t("chat: o outro participante lê", () => assertSucceeds(getBytes(ref(st("bia"), "mensagens/st_ana_bia/ana/1.jpg"))));
await t("chat: quem não participa NÃO lê", () => assertFails(getBytes(ref(st("caio"), "mensagens/st_ana_bia/ana/1.jpg"))));
await t("chat: quem não participa NÃO envia", () => assertFails(subir("caio", "mensagens/st_ana_bia/caio/1.jpg")));
await t("chat: na pasta do outro NÃO", () => assertFails(subir("ana", "mensagens/st_ana_bia/bia/9.jpg")));
await t("chat: PDF NÃO", () => assertFails(subir("ana", "mensagens/st_ana_bia/ana/4.pdf", "application/pdf")));
await t("chat: conversa que não existe NÃO", () => assertFails(subir("ana", "mensagens/st_ana_zeca/ana/1.jpg")));

// ---------- suporte e comprovantes ----------
await t("suporte: a pessoa anexa PDF na pasta dela", () => assertSucceeds(subir("ana", "suporte/ana/1_x.pdf", "application/pdf", 3 * MB)));
await t("suporte: PDF maior que 20 MB NÃO", () => assertFails(subir("ana", "suporte/ana/2_x.pdf", "application/pdf", 21 * MB)));
await t("suporte: pasta de outra pessoa NÃO", () => assertFails(subir("bia", "suporte/ana/3_x.jpg")));
await t("suporte: outra pessoa NÃO lê", () => assertFails(getBytes(ref(st("bia"), "suporte/ana/1_x.pdf"))));
await t("suporte: a equipe lê", () => assertSucceeds(getBytes(ref(st("st_adm"), "suporte/ana/1_x.pdf"))));
await t("suporte: a equipe anexa na pasta equipe_UID", () => assertSucceeds(subir("st_adm", "suporte/equipe_st_adm/1_x.jpg")));
await t("suporte: quem não é da equipe NÃO usa equipe_", () => assertFails(subir("ana", "suporte/equipe_ana/1_x.jpg")));
await t("comprovante: a pessoa envia", () => assertSucceeds(subir("ana", "negociacoes/ana/1_x.jpg")));
await t("comprovante: a moderação NÃO lê (só os donos)", () => assertFails(getBytes(ref(st("st_adm"), "negociacoes/ana/1_x.jpg"))));
await t("comprovante: o dono do site lê e apaga", async () => { await assertSucceeds(getBytes(ref(st("st_dono"), "negociacoes/ana/1_x.jpg"))); await assertSucceeds(deleteObject(ref(st("st_dono"), "negociacoes/ana/1_x.jpg"))); });

// ---------- resto ----------
await t("pasta desconhecida NÃO", () => assertFails(subir("ana", "qualquer/ana.jpg")));
await t("raiz NÃO", () => assertFails(subir("ana", "ana.jpg")));

// ---------- listar pastas (read = get + list) e apagar arquivo dos outros ----------
await subir("ana", "stories/ana/amigos_lz.jpg");
await subir("st_adm", "suporte/equipe_st_adm/2_x.jpg");
await t("Flash: outra pessoa NÃO lista a pasta (Amigos próximos/vencidos)", () => assertFails(listAll(ref(st("bia"), "stories/ana"))));
await t("Flash: o dono lista a própria pasta", () => assertSucceeds(listAll(ref(st("ana"), "stories/ana"))));
await t("Flash: outra conta NÃO abre pelo nome (nome adivinhável)", () => assertFails(getBytes(ref(st("bia"), "stories/ana/amigos_lz.jpg"))));
await t("Diário: outra pessoa NÃO lista", () => assertFails(listAll(ref(st("bia"), "diario/ana"))));
await t("Comunidade: outra pessoa NÃO lista", () => assertFails(listAll(ref(st("bia"), "comunidade/ana"))));
await t("perfil/capa/negócios/anúncios: ninguém lista", async () => { for (const p of ["fotosPerfil", "fotosCapa", "negocios", "anuncios"]) await assertFails(listAll(ref(st("ana"), p))); });
await t("suporte: usuário NÃO lista a pasta da equipe", () => assertFails(listAll(ref(st("bia"), "suporte/equipe_st_adm"))));
await t("suporte: usuário NÃO abre anexo da equipe pelo nome", () => assertFails(getBytes(ref(st("bia"), "suporte/equipe_st_adm/2_x.jpg"))));
await t("suporte: a equipe lista", () => assertSucceeds(listAll(ref(st("st_adm"), "suporte/equipe_st_adm"))));
await t("chat: ninguém lista a conversa", () => assertFails(listAll(ref(st("ana"), "mensagens/st_ana_bia/ana"))));
await t("Comercial NÃO apaga foto de outra pessoa", () => assertFails(deleteObject(ref(st("st_com"), "stories/ana/amigos_lz.jpg"))));
await t("dono do site apaga foto de outra pessoa", () => assertSucceeds(deleteObject(ref(st("st_dono"), "stories/ana/amigos_lz.jpg"))));

await t("o dono abre o próprio arquivo (getDownloadURL depois de enviar)", () => assertSucceeds(getBytes(ref(st("ana"), "fotosPerfil/ana_lz3k9.jpg"))));
await t("equipe abre arquivo de usuário (moderação)", () => assertSucceeds(getBytes(ref(st("st_adm"), "fotosPerfil/ana_lz3k9.jpg"))));
await t("e-mail não confirmado NÃO envia foto", () => assertFails(subir("semEmail", "diario/semEmail/1.jpg")));
await t("e-mail não confirmado ainda anexa no suporte", () => assertSucceeds(subir("semEmail", "suporte/semEmail/1.jpg")));
await t("conta banida NÃO envia", () => assertFails(subir("st_ban", "fotosPerfil/st_ban_1.jpg")));
await t("conta suspensa NÃO envia", () => assertFails(subir("st_susp", "stories/st_susp/1.jpg")));
await t("suspensão vencida volta a enviar", () => assertSucceeds(subir("st_venc", "comunidade/st_venc/1.jpg")));
await t("conta suspensa anexa no suporte (contestar)", () => assertSucceeds(subir("st_susp", "suporte/st_susp/1.pdf", "application/pdf")));

for (const r of res) if (r[0] !== "ok") console.log("✘", r[1], "→", r[2]);
console.log(`${ok} passaram, ${falhou} falharam (${arquivo.split("/").pop()})`);
for (const [c] of APOIO) await adm.doc(c).delete();
await env.cleanup();
process.exit(falhou ? 1 : 0);
