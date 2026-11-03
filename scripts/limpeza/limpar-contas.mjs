// =====================================================
// Limpeza automática das contas excluídas (roda uma vez por dia no GitHub Actions).
// Para cada exclusoes/{uid} com mais de 30 dias:
//   - apaga perfil, publicações, comentários, estrelas, seguidores, conexões,
//     bloqueios, negócios, anúncios, as mensagens que a pessoa enviou e a conta de login;
//   - avaliações e reclamações continuam (para as notas seguirem justas), mas sem
//     nome e foto ("Ex-usuário").
// Usa o Admin SDK (ignora as regras). Credencial: segredo FIREBASE_SERVICE_ACCOUNT.
// Teste local: FIRESTORE_EMULATOR_HOST e FIREBASE_AUTH_EMULATOR_HOST.
// =====================================================
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import { criarLimpeza } from "./limpeza-conta.mjs";

const DIAS = 30;
const emulador = !!process.env.FIRESTORE_EMULATOR_HOST;
const conta = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!conta && !emulador) { console.error("Falta o segredo FIREBASE_SERVICE_ACCOUNT."); process.exit(1); }
initializeApp(conta ? { credential: cert(JSON.parse(conta)) } : { projectId: process.env.GCLOUD_PROJECT || "demo-hf" });
const db = getFirestore();
const auth = getAuth();
const simular = process.argv.includes("--simular");

// Pastas do Storage (as mesmas do storage.rules). Sem Storage ativo, não faz nada.
const BUCKET = process.env.STORAGE_BUCKET || "helpfloripa-61e0d.firebasestorage.app";
const pegarBucket = async () => (emulador && !process.env.FIREBASE_STORAGE_EMULATOR_HOST ? null : getStorage().bucket(BUCKET));
const { limpar } = criarLimpeza({ db, auth, FieldValue, pegarBucket, simular });

const limite = new Date(Date.now() - DIAS * 864e5);
const vencidas = await db.collection("exclusoes").where("pedidaEm", "<=", limite).get();
console.log(`${vencidas.size} conta(s) com exclusão vencida${simular ? " (simulação, nada foi apagado)" : ""}.`);
let falhas = 0;
for (const d of vencidas.docs) {
  try { console.log(d.id, JSON.stringify(await limpar(d.id))); }
  catch (e) { falhas++; console.error("Falhou", d.id, e.message); }
}
if (falhas) process.exit(1);
