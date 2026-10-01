// =====================================================
// Avisos das reclamações (usado pelas notificações e pelo sino do topo)
// Reclamação = avaliação de 1 ou 2 estrelas num perfil de negócio.
// - recebida: alguém reclamou de um negócio meu
// - respondida: o negócio respondeu uma reclamação que eu fiz
// - resolvida: o cliente marcou como resolvida uma reclamação que recebi
// =====================================================
const ms = (ts) => ts?.toMillis?.() ?? 0;
const ehReclamacao = (a) => a && a.tipo === "negocio" && Number(a.nota) <= 2;
const MAX = 40;

function montar(recebidas, minhas, respostas, perfis) {
  const itens = [];
  recebidas.forEach((a) => {
    itens.push({ tipo: "reclamacao", id: "rec_" + a.id, avalId: a.id, uid: a.autorId, nome: a.autorNome || "Cliente", foto: a.autorFoto || "", nota: Number(a.nota), detalhe: a.comentario || "", quando: ms(a.criadoEm) });
    const r = respostas.get(a.id);
    if (r?.resolvido) itens.push({ tipo: "reclamacao-ok", id: "ok_" + a.id, avalId: a.id, uid: a.autorId, nome: a.autorNome || "Cliente", foto: a.autorFoto || "", quando: ms(r.resolvidoEm) });
  });
  minhas.forEach((a) => {
    const r = respostas.get(a.id);
    if (!r?.texto) return;
    const p = perfis.get(a.alvoId) || {};
    itens.push({ tipo: "reclamacao-resp", id: "resp_" + a.id, avalId: a.id, uid: a.alvoId, nome: p.nome || "Usuário", foto: p.fotoPerfil || "", detalhe: r.texto, quando: Math.max(ms(r.criadoEm), ms(r.editadoEm)) });
  });
  return itens.filter((i) => i.quando);
}

async function lerPerfis(fs, db, uids, perfis) {
  const faltam = [...new Set(uids)].filter((u) => u && !perfis.has(u));
  await Promise.all(faltam.map(async (u) => {
    try { const s = await fs.getDoc(fs.doc(db, "perfis_publicos", u)); perfis.set(u, s.exists() ? s.data() : {}); } catch { perfis.set(u, {}); }
  }));
}

// Leitura única (sino do topo).
export async function buscarReclamacoes(fs, db, uid) {
  const col = fs.collection(db, "avaliacoes");
  const [rec, min] = await Promise.all([
    fs.getDocs(fs.query(col, fs.where("alvoId", "==", uid), fs.limit(MAX))).catch(() => ({ docs: [] })),
    fs.getDocs(fs.query(col, fs.where("autorId", "==", uid), fs.limit(MAX))).catch(() => ({ docs: [] }))
  ]);
  const recebidas = rec.docs.map((d) => ({ id: d.id, ...d.data() })).filter(ehReclamacao);
  const minhas = min.docs.map((d) => ({ id: d.id, ...d.data() })).filter(ehReclamacao);
  const respostas = new Map();
  await Promise.all([...recebidas, ...minhas].map(async (a) => {
    try { const s = await fs.getDoc(fs.doc(db, "reclamacoes", a.id)); if (s.exists()) respostas.set(a.id, s.data()); } catch {}
  }));
  const perfis = new Map();
  await lerPerfis(fs, db, minhas.filter((a) => respostas.get(a.id)?.texto).map((a) => a.alvoId), perfis);
  return montar(recebidas, minhas, respostas, perfis);
}

// Tempo real (página de notificações e páginas da rede social).
export function ouvirReclamacoes(fs, db, uid, aoMudar) {
  const col = fs.collection(db, "avaliacoes");
  let recebidas = [], minhas = [];
  const respostas = new Map(), perfis = new Map(), ouvindo = new Map();
  const paradas = [];
  let pronto = { rec: false, min: false };
  const avisar = async () => {
    if (!pronto.rec || !pronto.min) return;
    await lerPerfis(fs, db, minhas.filter((a) => respostas.get(a.id)?.texto).map((a) => a.alvoId), perfis);
    aoMudar(montar(recebidas, minhas, respostas, perfis));
  };
  const ouvirRespostas = () => {
    const ids = new Set([...recebidas, ...minhas].map((a) => a.id));
    ids.forEach((id) => {
      if (ouvindo.has(id)) return;
      ouvindo.set(id, fs.onSnapshot(fs.doc(db, "reclamacoes", id), (s) => {
        if (s.exists()) respostas.set(id, s.data({ serverTimestamps: "estimate" })); else respostas.delete(id);
        avisar();
      }, () => {}));
    });
    ouvindo.forEach((parar, id) => { if (!ids.has(id)) { parar(); ouvindo.delete(id); respostas.delete(id); } });
  };
  paradas.push(fs.onSnapshot(fs.query(col, fs.where("alvoId", "==", uid), fs.limit(MAX)), (snap) => {
    recebidas = snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })).filter(ehReclamacao);
    pronto.rec = true; ouvirRespostas(); avisar();
  }, () => { pronto.rec = true; avisar(); }));
  paradas.push(fs.onSnapshot(fs.query(col, fs.where("autorId", "==", uid), fs.limit(MAX)), (snap) => {
    minhas = snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })).filter(ehReclamacao);
    pronto.min = true; ouvirRespostas(); avisar();
  }, () => { pronto.min = true; avisar(); }));
  return () => { paradas.forEach((p) => p()); ouvindo.forEach((p) => p()); };
}

export const TEXTO_RECLAMACAO = {
  "reclamacao": (i) => `fez uma reclamação (${i.nota} ${i.nota === 1 ? "estrela" : "estrelas"}) sobre seu negócio`,
  "reclamacao-resp": () => "respondeu sua reclamação",
  "reclamacao-ok": () => "marcou a reclamação como resolvida"
};
export const linkReclamacao = (i, uid) => (i.tipo === "reclamacao-resp" ? `reclamacoes.html?pessoa=${encodeURIComponent(uid)}&lado=enviadas` : `reclamacoes.html?pessoa=${encodeURIComponent(uid)}`);
