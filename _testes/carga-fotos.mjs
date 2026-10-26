// Põe fotos de tamanho real nos dados da carga (carga-seed.mjs), de um dos dois jeitos:
//   node carga-fotos.mjs doc      → foto dentro do documento (data:, como o site grava hoje, sem o Storage)
//   node carga-fotos.mjs storage  → foto no Storage (emulador 9199) e só o link no documento (USAR_STORAGE = true)
// Mesmos bytes nos dois jeitos (as mesmas compressões que o site usa ao salvar): só muda ONDE a foto fica.
// Usado pelo t-storage-compara.mjs. Precisa do emulador (firestore 8085 + storage 9199) e do carga-seed.mjs antes.
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
const MODO = process.argv[2];
if (!["doc", "storage"].includes(MODO)) { console.error("Uso: node carga-fotos.mjs doc|storage"); process.exit(1); }
const BUCKET = "demo-hf.appspot.com";
initializeApp({ projectId: "demo-hf", storageBucket: BUCKET });
const db = getFirestore(), bucket = getStorage().bucket();
// JPEGs de verdade gerados pelo gerar-fotos.py (tamanhos típicos do que o site grava).
const F = Object.fromEntries(["post", "avatar", "logo", "foto"].map((k) => [k, readFileSync(new URL(`saida/fotos-carga/${k}.jpg`, import.meta.url))]));
console.log("tamanhos:", Object.entries(F).map(([k, b]) => `${k} ${(b.length / 1024).toFixed(0)} KB`).join(", "));

const fila = [];
async function foto(tipo, caminho) {
  if (MODO === "doc") return "data:image/jpeg;base64," + F[tipo].toString("base64");
  // Nome único e cache de 1 ano, igual ao salvarImagem do rede.js.
  const token = randomUUID();
  await bucket.file(caminho).save(F[tipo], { contentType: "image/jpeg", metadata: { cacheControl: "public, max-age=31536000, immutable", metadata: { firebaseStorageDownloadTokens: token } } });
  return `http://127.0.0.1:9199/v0/b/${BUCKET}/o/${encodeURIComponent(caminho)}?alt=media&token=${token}`;
}
let lote = db.batch(), n = 0;
// Lotes de 8 (com as fotos dentro, 20 perfis de negócio já passam dos 4 MB que o emulador aceita por envio).
async function mexer(ref, dados) { const b = lote; b.set(ref, dados, { merge: true }); if (++n % 8 === 0) { lote = db.batch(); await b.commit(); } }
async function emParalelo(itens, f, k = 16) { for (let i = 0; i < itens.length; i += k) await Promise.all(itens.slice(i, i + k).map(f)); }

// Pessoas: foto de perfil (480 px). As publicações levam a foto do autor junto (campo fotoPerfil), como o site grava.
const avatares = {};
await emParalelo(Array.from({ length: 60 }, (_, i) => `cg_u${i}`), async (uid) => {
  avatares[uid] = await foto("avatar", `fotosPerfil/${uid}/perfil_${MODO}.jpg`);
  await mexer(db.doc(`perfis_publicos/${uid}`), { fotoPerfil: avatares[uid] });
});
console.log("perfis ok");
// Diário: 1 em 3 publicações com foto (1080 px).
await emParalelo(Array.from({ length: 400 }, (_, i) => i), async (i) => {
  const d = { fotoPerfil: avatares[`cg_u${i % 60}`] };
  if (i % 3 === 0) d.mediaUrl = await foto("post", `diario/cg_u${i % 60}/cg_p${i}_${MODO}.jpg`);
  await mexer(db.doc(`diario/cg_p${i}`), d);
});
console.log("diário ok");
// Negócios: logo (480 px) + 2 fotos (1080 px). Imóveis: 2 fotos.
const TIPOS = ["servicos", "delivery", "lojinha", "imoveis", "saude"];
await emParalelo(Array.from({ length: 400 }, (_, i) => i), async (i) => {
  const id = `cg_n${i}_${TIPOS[i % 5]}`;
  await mexer(db.doc(`negocios/${id}`), { foto: await foto("logo", `negocios/${id}_${MODO}.jpg`), fotos: [await foto("foto", `negocios/${id}_f0_${MODO}.jpg`), await foto("foto", `negocios/${id}_f1_${MODO}.jpg`)] });
});
console.log("negócios ok");
await emParalelo(Array.from({ length: 120 }, (_, i) => i), async (i) => {
  await mexer(db.doc(`anuncios/cg_a${i}`), { fotos: [await foto("foto", `anuncios/cg_n${i}/cg_a${i}_0_${MODO}.jpg`), await foto("foto", `anuncios/cg_n${i}/cg_a${i}_1_${MODO}.jpg`)] });
});
await lote.commit();
console.log(`Fotos (${MODO}) gravadas em ${n} documentos.`);
