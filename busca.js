// =====================================================
// Busca nacional (negócios, imóveis e Comunidade) no próprio Firestore, sem serviço pago.
// Cada documento guarda `busca`: as palavras do nome, categorias, cidade, bairro... minúsculas, sem acento,
// e também o COMEÇO de cada palavra (a partir de 3 letras), para "eletric" achar "eletricista".
// A busca pergunta ao Firebase pela palavra mais longa digitada (array-contains) e confere as outras na tela.
// Documentos antigos sem `busca` continuam aparecendo pela busca nos mais recentes (como antes).
// Sem dependências.
// =====================================================
export const semAcento = (v) => String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const PALAVRA_MAX = 15, MAX_TERMOS = 100;
const VAZIAS = new Set(["de", "da", "do", "das", "dos", "e", "em", "no", "na", "nos", "nas", "para", "pra", "com", "por", "a", "o", "as", "os", "um", "uma", "ao", "aos", "ou", "que", "se", "sc"]);
export const palavrasDe = (texto) => semAcento(texto).split(/[^a-z0-9]+/).filter((p) => p.length >= 2 && !VAZIAS.has(p));

// Termos gravados no documento. `textos` em ordem de importância: o que vem primeiro sempre cabe.
export function termosBusca(textos) {
  const termos = new Set();
  for (const t of textos.flat()) {
    for (const p of palavrasDe(t)) {
      const w = p.slice(0, PALAVRA_MAX);
      for (let i = Math.min(3, w.length); i <= w.length; i++) {
        if (termos.size >= MAX_TERMOS) return [...termos];
        termos.add(w.slice(0, i));
      }
    }
  }
  return [...termos];
}

// Palavra usada na pergunta ao Firebase: a mais longa digitada (mais seletiva), cortada como na gravação.
export function palavraChave(termo) {
  const ps = palavrasDe(termo).filter((p) => p.length >= 3);
  if (!ps.length) return "";
  return ps.sort((a, b) => b.length - a.length)[0].slice(0, PALAVRA_MAX);
}
// Todas as palavras digitadas aparecem no texto do item?
export const combina = (termo, texto) => { const t = semAcento(texto); return palavrasDe(termo).every((p) => t.includes(p)); };

// Pergunta ao Firebase. `onde` = filtros extras (ex.: [where("tipo", "==", "servicos")]).
export async function buscarNoServidor(fb, colecao, termo, onde = [], limite = 60) {
  const chave = palavraChave(termo);
  if (!chave) return [];
  const q = fb.query(fb.collection(fb.db, colecao), fb.where("busca", "array-contains", chave), ...onde, fb.limit(limite));
  try { return (await fb.getDocs(q)).docs.map((d) => ({ id: d.id, ...d.data() })); }
  catch (e) { console.warn("Busca no servidor indisponível:", e?.code || e?.message); return []; }
}
