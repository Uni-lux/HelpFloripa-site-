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

const DIAS = 30;
const emulador = !!process.env.FIRESTORE_EMULATOR_HOST;
const conta = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!conta && !emulador) { console.error("Falta o segredo FIREBASE_SERVICE_ACCOUNT."); process.exit(1); }
initializeApp(conta ? { credential: cert(JSON.parse(conta)) } : { projectId: process.env.GCLOUD_PROJECT || "demo-hf" });
const db = getFirestore();
const auth = getAuth();
const simular = process.argv.includes("--simular");

async function apagarConsulta(q) {
  let n = 0;
  for (;;) {
    const s = await q.limit(400).get();
    if (s.empty) return n;
    const lote = db.batch();
    s.docs.forEach((d) => lote.delete(d.ref));
    if (!simular) await lote.commit();
    n += s.size;
    if (simular || s.size < 400) return n;
  }
}

// Pastas do Storage com arquivos da pessoa (as mesmas do storage.rules). Sem Storage ativo, não faz nada.
const BUCKET = process.env.STORAGE_BUCKET || "helpfloripa-61e0d.firebasestorage.app";
async function apagarArquivos(uid, conversas) {
  if (emulador && !process.env.FIREBASE_STORAGE_EMULATOR_HOST) return 0;
  let bucket;
  try { bucket = getStorage().bucket(BUCKET); if (!(await bucket.exists())[0]) return 0; }
  catch (e) { console.warn("Storage indisponível:", e.message); return 0; }
  const prefixos = [`fotosPerfil/${uid}`, `fotosCapa/${uid}`, `negocios/${uid}_`, `anuncios/${uid}_`, `diario/${uid}/`, `stories/${uid}/`,
    `comunidade/${uid}/`, `suporte/${uid}/`, `negociacoes/${uid}/`, ...conversas.map((c) => `mensagens/${c}/${uid}/`)];
  let n = 0;
  for (const prefix of prefixos) {
    const [arquivos] = await bucket.getFiles({ prefix }).catch(() => [[]]);
    // "fotosPerfil/UID" também pegaria "fotosPerfil/UIDxyz...": fica só o próprio uid seguido de "." ou "_".
    const meus = arquivos.filter((f) => prefix.endsWith("/") || prefix.endsWith("_") || /^[._]/.test(f.name.slice(prefix.length)));
    n += meus.length;
    if (!simular) await Promise.all(meus.map((f) => f.delete().catch(() => {})));
  }
  return n;
}

async function limpar(uid) {
  const r = {};
  const col = (n) => db.collection(n);
  const apagar = async (nome, q) => { r[nome] = (r[nome] || 0) + await apagarConsulta(q); };
  // publicações e o que pendura nelas
  const posts = await col("diario").where("autorId", "==", uid).get();
  for (const p of posts.docs) {
    await apagar("comentarios", col("comentarios").where("postId", "==", p.id));
    await apagar("curtidas", col("curtidas").where("postId", "==", p.id));
    await apagar("republicacoes", col("republicacoes").where("postId", "==", p.id));
    if (!simular) await col("diario_notas").doc(p.id).delete();
  }
  await apagar("diario", col("diario").where("autorId", "==", uid));
  await apagar("comentarios", col("comentarios").where("autorId", "==", uid));
  // Estrelas que a pessoa deu em publicações de outros: tira do resumo da publicação (diario_notas) também.
  const dadas = await col("curtidas").where("uid", "==", uid).get();
  for (const c of dadas.docs) {
    const { postId, nota } = c.data(); const n = Number(nota) || 0;
    if (!postId || n < 1 || n > 5 || simular) continue;
    const resumo = col("diario_notas").doc(postId);
    if ((await resumo.get()).exists) await resumo.update({ total: FieldValue.increment(-1), soma: FieldValue.increment(-n), ["n" + n]: FieldValue.increment(-1) });
  }
  await apagar("curtidas", col("curtidas").where("uid", "==", uid));
  await apagar("curtidas_comentarios", col("curtidas_comentarios").where("uid", "==", uid));
  await apagar("republicacoes", col("republicacoes").where("uid", "==", uid));
  // Votos das enquetes (públicos e anônimos): tira da contagem (o pedaço enquete_contas/{alvo}_{fatia} do voto;
  // votos antigos sem fatia: enquete_contas/{alvo}) e apaga o voto.
  for (const nomeCol of ["enquete_votos", "enquete_anon"]) {
    const votos = await col(nomeCol).where("uid", "==", uid).get();
    for (const v of votos.docs) {
      const { alvo, opcao, fatia } = v.data();
      if (simular || !alvo || !Number.isInteger(opcao)) continue;
      const c = col("enquete_contas").doc(Number.isInteger(fatia) ? `${alvo}_${fatia}` : alvo);
      if ((await c.get()).exists) await c.update({ ["n" + opcao]: FieldValue.increment(-1) });
    }
    await apagar(nomeCol, col(nomeCol).where("uid", "==", uid));
  }
  // Caixa de perguntas: respostas que a pessoa deu (com nome e anônimas) e as que recebeu.
  await apagar("caixa_respostas", col("caixa_respostas").where("uid", "==", uid));
  await apagar("caixa_respostas", col("caixa_respostas").where("autorId", "==", uid));
  const autorias = await col("caixa_autoria").where("uid", "==", uid).get();
  for (const a of autorias.docs) { if (!simular) { await col("caixa_respostas").doc(a.id).delete(); await a.ref.delete(); } }
  r.caixa_autoria = autorias.size;
  // Estatísticas dos negócios: as visitas que a pessoa fez e os números dos negócios dela.
  await apagar("neg_visitas", col("neg_visitas").where("uid", "==", uid));
  await apagar("neg_stats", col("neg_stats").where("donoId", "==", uid));
  await apagar("relacoes", col("relacoes").where("seguidorId", "==", uid));
  await apagar("relacoes", col("relacoes").where("alvoId", "==", uid));
  await apagar("bloqueios", col("bloqueios").where("bloqueadorId", "==", uid));
  await apagar("bloqueios", col("bloqueios").where("bloqueadoId", "==", uid));
  await apagar("vinculos", col("vinculos").where("participantes", "array-contains", uid));
  await apagar("negocios", col("negocios").where("donoId", "==", uid));
  await apagar("anuncios", col("anuncios").where("donoId", "==", uid));
  await apagar("comunidade", col("comunidade").where("donoId", "==", uid));
  // mensagens que a pessoa enviou (a conversa continua para a outra pessoa)
  const convs = await col("conversas").where("participantes", "array-contains", uid).get();
  for (const c of convs.docs) await apagar("mensagens", c.ref.collection("mensagens").where("remetenteId", "==", uid));
  // Arquivos no Firebase Storage (quando ligado): fotos, vídeos, áudios e anexos da pessoa.
  r.arquivos = await apagarArquivos(uid, convs.docs.map((c) => c.id));
  // avaliações e reclamações ficam, sem nome e foto
  const anon = [];
  for (const [nome, campo] of [["avaliacoes", "autorId"], ["queixas", "autorId"]]) {
    const s = await col(nome).where(campo, "==", uid).get();
    s.docs.forEach((d) => anon.push(d.ref.update(nome === "avaliacoes" ? { autorNome: "Ex-usuário", autorFoto: "" } : { autorNome: "Ex-usuário" })));
    r["anonimizadas_" + nome] = s.size;
  }
  if (!simular) await Promise.all(anon);
  // perfil, @usuário, dados da conta
  const u = await col("usuarios").doc(uid).get();
  const nick = u.exists ? u.data().nickname : "";
  if (!simular) {
    if (nick) { const n = await col("nicknames").doc(nick).get(); if (n.exists && n.data().uid === uid) await n.ref.delete(); }
    await col("perfis_publicos").doc(uid).delete();
    await col("usuarios").doc(uid).delete();
    await col("cotas").doc(uid).delete();
    try { await auth.deleteUser(uid); r.login = "apagado"; }
    catch (e) { r.login = e.code === "auth/user-not-found" ? "já não existia" : "erro: " + e.code; if (r.login.startsWith("erro")) throw e; }
    await col("exclusoes").doc(uid).delete();
  }
  return r;
}

const limite = new Date(Date.now() - DIAS * 864e5);
const vencidas = await db.collection("exclusoes").where("pedidaEm", "<=", limite).get();
console.log(`${vencidas.size} conta(s) com exclusão vencida${simular ? " (simulação, nada foi apagado)" : ""}.`);
let falhas = 0;
for (const d of vencidas.docs) {
  try { console.log(d.id, JSON.stringify(await limpar(d.id))); }
  catch (e) { falhas++; console.error("Falhou", d.id, e.message); }
}
if (falhas) process.exit(1);
