// =====================================================
// Relatório diário automático (GitHub Actions, junto com a limpeza de contas).
// Grava estatisticas/{AAAA-MM-DD} com os números do dia; o painel do
// administrador usa esse histórico (ativos por dia, crescimento, relatórios).
// Só usa contagens (count), então custa poucas leituras.
// =====================================================
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";

const conta = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!getApps().length) initializeApp(conta ? { credential: cert(JSON.parse(conta)) } : { projectId: process.env.GCLOUD_PROJECT || "demo-hf" });
const db = getFirestore();
const agora = Date.now(), DIA = 864e5;
const desde = (dias) => Timestamp.fromMillis(agora - dias * DIA);
const contar = async (q) => (await q.count().get()).data().count;
const col = (n) => db.collection(n);

// Dia no fuso de Brasília (UTC-3).
const dia = new Date(agora - 3 * 3600e3).toISOString().slice(0, 10);
const r = {
  dia,
  usuarios: await contar(col("usuarios")),
  novos: await contar(col("usuarios").where("criadoEm", ">=", desde(1))),
  novos7: await contar(col("usuarios").where("criadoEm", ">=", desde(7))),
  ativos1: await contar(col("perfis_publicos").where("ultimoAcesso", ">=", desde(1))),
  ativos7: await contar(col("perfis_publicos").where("ultimoAcesso", ">=", desde(7))),
  ativos30: await contar(col("perfis_publicos").where("ultimoAcesso", ">=", desde(30))),
  negocios: await contar(col("negocios")),
  anuncios: await contar(col("anuncios")),
  publicacoes: await contar(col("diario")),
  publicacoesDia: await contar(col("diario").where("criadoEm", ">=", desde(1))),
  conversas: await contar(col("conversas")),
  avaliacoes: await contar(col("avaliacoes")),
  denunciasNovas: await contar(col("denuncias").where("status", "==", "nova")),
  reclamacoesAbertas: await contar(col("queixas").where("status", "==", "aberta")),
  chamadosAbertos: await contar(col("suporte").where("status", "==", "aberto")),
  exclusoesAgendadas: await contar(col("exclusoes")),
  geradoEm: FieldValue.serverTimestamp()
};
await col("estatisticas").doc(dia).set(r);
console.log("Relatório do dia", dia, JSON.stringify({ ...r, geradoEm: undefined }));
