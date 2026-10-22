// Testes das regras do Firebase Storage (storage.rules) no emulador: Storage 9199 + Firestore (participantes e equipe),
// projeto "demo-storage". Sobe com: ./emulador.sh (inclui o Storage na porta 9199).
// Uso: node testes-storage.mjs [arquivo.rules]
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { ref, uploadBytes, getBytes, deleteObject } from "firebase/storage";
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
const st = (uid) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).storage();
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
const APOIO = [["conversas/st_ana_bia", { participantes: ["ana", "bia"] }], ["admins/st_adm", { papel: "moderacao" }], ["admins/st_dono", { papel: "dono" }]];
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
await t("foto de perfil: qualquer um vê", () => assertSucceeds(getBytes(ref(st(null), "fotosPerfil/ana_lz3k9.jpg"))));
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

for (const r of res) if (r[0] !== "ok") console.log("✘", r[1], "→", r[2]);
console.log(`${ok} passaram, ${falhou} falharam (${arquivo.split("/").pop()})`);
for (const [c] of APOIO) await adm.doc(c).delete();
await env.cleanup();
process.exit(falhou ? 1 : 0);
