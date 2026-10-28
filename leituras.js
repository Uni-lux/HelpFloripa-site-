// =====================================================
// Leituras com validade
// O Firestore já guarda no aparelho o que foi baixado. Aqui anotamos QUANDO cada
// coisa veio do servidor: dentro da validade, a página lê a cópia do aparelho
// (sem custo de leitura); depois disso, busca de novo no servidor.
// Se a cópia não existir (outro aparelho, aba anônima, cache limpo), vai ao servidor.
// =====================================================
const CHAVE = "hf-validade";
const MAX_ITENS = 1500;
let marcas = null;

function lerMarcas() {
  if (marcas) return marcas;
  try { marcas = JSON.parse(localStorage.getItem(CHAVE) || "{}") || {}; } catch { marcas = {}; }
  return marcas;
}
let gravando = 0;
function gravar() {
  clearTimeout(gravando);
  gravando = setTimeout(() => {
    const m = lerMarcas(), agora = Date.now();
    // Joga fora o que passou de um dia e mantém a lista curta.
    let lista = Object.entries(m).filter(([, v]) => agora - (v.em ?? v) < 86400000);
    if (lista.length > MAX_ITENS) lista = lista.sort((a, b) => (b[1].em ?? b[1]) - (a[1].em ?? a[1])).slice(0, MAX_ITENS);
    marcas = Object.fromEntries(lista);
    try { localStorage.setItem(CHAVE, JSON.stringify(marcas)); } catch {}
  }, 300);
}
const valido = (m, validade) => m && Date.now() - (m.em ?? m) < validade;

export function esquecer(chave) { const m = lerMarcas(); if (chave in m) { delete m[chave]; gravar(); } }

// Um documento. caminho: ["colecao", "id"].
export async function docComValidade(fbx, caminho, validade) {
  const ref = fbx.doc(fbx.db, ...caminho);
  const chave = "d:" + caminho.join("/");
  if (valido(lerMarcas()[chave], validade) && fbx.getDocFromCache) {
    try { return await fbx.getDocFromCache(ref); } catch {} // não está no aparelho: vai ao servidor
  }
  const s = await fbx.getDoc(ref);
  if (!s.metadata?.fromCache) { lerMarcas()[chave] = Date.now(); gravar(); }
  return s;
}

// Vários documentos da mesma coleção pelo id, de 30 em 30 numa consulta só (em vez de 1 leitura solta por id).
// Dentro da validade usa a cópia do aparelho; o que não existe fica anotado (não busca de novo na validade).
// Devolve Map id -> dados (ou null). Se a consulta falhar, cai na leitura de um por um.
export async function docsPorIds(fbx, colecao, ids, validade) {
  const r = new Map(), m = lerMarcas(), falta = [];
  await Promise.all([...new Set(ids)].filter(Boolean).map(async (id) => {
    const marca = m["d:" + colecao + "/" + id];
    if (valido(marca, validade)) {
      if (marca.nada) { r.set(id, null); return; }
      if (fbx.getDocFromCache) { try { const s = await fbx.getDocFromCache(fbx.doc(fbx.db, colecao, id)); r.set(id, s.exists() ? s.data() : null); return; } catch {} }
    }
    falta.push(id);
  }));
  const lotes = Array.from({ length: Math.ceil(falta.length / 30) }, (_, k) => falta.slice(k * 30, k * 30 + 30));
  await Promise.all(lotes.map(async (lote) => {
    try {
      const s = await fbx.getDocs(fbx.query(fbx.collection(fbx.db, colecao), fbx.where(fbx.documentId(), "in", lote)));
      const achou = new Set();
      s.docs.forEach((d) => { achou.add(d.id); r.set(d.id, d.data()); m["d:" + colecao + "/" + d.id] = Date.now(); });
      lote.filter((id) => !achou.has(id)).forEach((id) => { r.set(id, null); m["d:" + colecao + "/" + id] = { em: Date.now(), nada: 1 }; });
    } catch {
      await Promise.all(lote.map(async (id) => { try { const s = await docComValidade(fbx, [colecao, id], validade); r.set(id, s.exists() ? s.data() : null); } catch { r.set(id, null); } }));
    }
  }));
  gravar();
  return r;
}

// Uma consulta. chave: nome curto e único para ela.
export async function docsComValidade(fbx, chave, q, validade) {
  const k = "q:" + chave, m = lerMarcas()[k];
  if (valido(m, validade) && fbx.getDocsFromCache) {
    try {
      const s = await fbx.getDocsFromCache(q);
      if (s.size >= (m.n || 0)) return s; // faltou algo no aparelho: melhor buscar de novo
    } catch {}
  }
  const s = await fbx.getDocs(q);
  if (!s.metadata?.fromCache) { lerMarcas()[k] = { em: Date.now(), n: s.size }; gravar(); }
  return s;
}
