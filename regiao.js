// =====================================================
// Diário e Explorar por região (site nacional): as publicações guardam a região de quem publica
// (diario.autorUf / diario.autorIbge). "Principais", "Em alta" e os destaques juntam as recentes do país com as
// recentes do SEU estado e dão mais peso à sua cidade e ao seu estado. Publicações antigas (sem região) valem 1.
// Precisa do índice diario: autorUf + criadoEm (firestore.indexes.json); sem ele, fica só a lista do país.
// =====================================================
import { docsComValidade } from "./leituras.js?v=1";

export const ufValida = (uf) => (/^[A-Z]{2}$/.test(uf || "") ? uf : "");

// Recentes do estado (vale 3 min no aparelho, como o começo do Diário).
export async function postsDoEstado(fb, uf, limite = 60) {
  if (!ufValida(uf)) return [];
  const q = fb.query(fb.collection(fb.db, "diario"), fb.where("autorUf", "==", uf), fb.orderBy("criadoEm", "desc"), fb.limit(limite));
  try { return (await docsComValidade(fb, `diario-uf-${uf}-${limite}`, q, 3 * 60000)).docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })); }
  catch (e) { console.warn("Diário por região indisponível (índice autorUf + criadoEm):", e?.code || e?.message); return []; }
}

// Peso da região na nota: mesma cidade ×1,6; mesmo estado ×1,25; o resto ×1.
export function pesoRegiao(p, eu) {
  if (!p || !eu) return 1;
  if (eu.cidadeIbge && p.autorIbge === eu.cidadeIbge) return 1.6;
  if (eu.uf && p.autorUf === eu.uf) return 1.25;
  return 1;
}
