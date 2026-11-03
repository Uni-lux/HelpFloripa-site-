// =====================================================
// Ranking do Diário vindo do servidor (Cloud Function montarRankingDiario, a cada 15 min; functions/diario-ranking.js).
// Lê 2 documentos: ranking_diario/br e ranking_diario/uf_<UF> (com as cidades dentro). Cada item já traz estrelas,
// comentários e alcance (quem viu), então o Diário não precisa ler as notas nem contar comentários dessas publicações.
// Sem o documento (sem Blaze, regra não publicada ou função parada há mais de 90 min) devolve null e o Diário faz
// como antes (recentes do país + do estado). Sem dependências: recebe as funções do Firestore (fb).
// =====================================================
// Lista sem id válido (texto estranho) é ignorada.
const VALIDO = 90 * 60000;              // lista mais velha que isso não serve (função parada)
const idOk = (x) => /^[A-Za-z0-9_-]{1,100}$/.test(x.id);
const GUARDA = 5 * 60000;               // guardada no aparelho por 5 min (a função roda a cada 15)
const SEM = "hf-ranking-sem";           // sem permissão / sem documento: não tenta de novo por um tempo

// Item: "id|autorId|nota×1e6|estrelas|soma|comentários|vistas|criadoEm|ibge" (functions/diario-ranking.js).
function lerItem(t, fonte) {
  const x = String(t).split("|"), n = (i) => Number(x[i]) || 0;
  return { id: x[0], autorId: x[1], nota: n(2) / 1e6, total: n(3), soma: n(4), comentarios: n(5), vistas: n(6), criadoEm: n(7), ibge: n(8), fonte };
}

function lerGuardado(k) { try { const c = JSON.parse(sessionStorage.getItem("hf-rk-" + k) || "null"); return c && Date.now() - c.lido < GUARDA ? c.d : undefined; } catch { return undefined; } }
function guardar(k, d) { try { sessionStorage.setItem("hf-rk-" + k, JSON.stringify({ lido: Date.now(), d })); } catch {} }
function semAgora() { try { return Date.now() < Number(localStorage.getItem(SEM) || 0); } catch { return false; } }
function marcarSem(minutos) { try { localStorage.setItem(SEM, String(Date.now() + minutos * 60000)); } catch {} }

async function lerDoc(fb, id) {
  const g = lerGuardado(id);
  if (g !== undefined) return g;
  const s = await fb.getDoc(fb.doc(fb.db, "ranking_diario", id));
  const d = s.exists() ? s.data() : null;
  guardar(id, d);
  return d;
}

// { cidade: [...], uf: [...], br: [...], atualizadoEm } ou null.
export async function lerRanking(fb, { uf = "", cidadeIbge = 0 } = {}) {
  if (semAgora()) return null;
  try {
    const [br, est] = await Promise.all([lerDoc(fb, "br"), /^[A-Z]{2}$/.test(uf) ? lerDoc(fb, "uf_" + uf).catch(() => null) : null]);
    if (!br || !Array.isArray(br.itens) || Date.now() - Number(br.atualizadoEm || 0) > VALIDO) { marcarSem(30); return null; }
    const fresco = est && Date.now() - Number(est.atualizadoEm || 0) <= VALIDO;
    return {
      atualizadoEm: Number(br.atualizadoEm),
      br: br.itens.map((x) => lerItem(x, "br")).filter(idOk),
      uf: fresco ? (est.itens || []).map((x) => lerItem(x, "uf")).filter(idOk) : [],
      cidade: fresco && cidadeIbge ? (est.cidades?.[String(cidadeIbge)] || []).map((x) => lerItem(x, "cidade")).filter(idOk) : []
    };
  } catch (e) {
    // Regra ainda não publicada (permission-denied) ou fora do ar: tenta de novo em 6 h / 10 min.
    marcarSem(e?.code === "permission-denied" ? 360 : 10);
    return null;
  }
}

// Junta as listas sem repetir, na ordem: sua cidade, seu estado, Brasil (cada uma já vem na ordem do servidor).
// quantos: { cidade, uf, br }. Devolve { escolhidos, resto } (resto = o que sobrou, para o "Ver mais").
export function juntarRanking(r, quantos = { cidade: 20, uf: 25, br: 45 }, pular = () => false) {
  const vistos = new Set(), escolhidos = [], resto = [];
  for (const k of ["cidade", "uf", "br"]) {
    let n = 0;
    for (const x of r[k] || []) {
      if (vistos.has(x.id) || pular(x)) continue;
      vistos.add(x.id);
      if (n < quantos[k]) { escolhidos.push(x); n++; } else resto.push(x);
    }
  }
  return { escolhidos, resto };
}

// Fator da TAXA de engajamento (interações ÷ quem viu), o mesmo da função: 0,6 a 1,5. Sem dados = 1.
export function fatorTaxa(x) {
  if (!x) return 1;
  const eng = x.total + Math.max(0, x.soma - 3 * x.total) * 0.4 + 2 * x.comentarios;
  return 0.6 + 0.9 * Math.min(1, ((eng + 0.5) / (x.vistas + 30)) * 6);
}
