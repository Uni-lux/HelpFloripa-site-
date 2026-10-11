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
