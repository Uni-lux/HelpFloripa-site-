// =====================================================
// Conteúdo escondido DE VERDADE (13/11/2026).
// Antes, esconder só marcava `ocultoAte` no documento: o site não mostrava, mas o conteúdo continuava
// no documento e um app modificado conseguia lê-lo numa lista. Agora, ao esconder:
//   - o conteúdo inteiro vai para guardados/{colecao}_{id} (só o dono e a equipe leem);
//   - no lugar fica um "esqueleto" sem nada: { dono, tipo?, ocultoAte (data distante), ocultoPelaEquipe, guardado: true }.
// Mostrar de novo = o documento volta exatamente como era e o guardado sai (na mesma gravação).
// As regras (firestore.rules: guardados, viraEsqueleto, voltaDoGuardado) conferem que nada muda no caminho.
//
// Motivos:
//   conta      – a própria pessoa desativou a conta (ela mesma devolve ao reativar);
//   sancao     – suspensão/banimento (volta quando a suspensão acaba e a pessoa entra, ou quando a equipe tira a sanção);
//   moderacao  – escondido pela equipe (só a equipe devolve);
//   sem_verif  – anunciante sem verificação (volta quando o pedido é aprovado).
// Sem dependências: recebe as funções do Firestore (fb).
// =====================================================

export const CAMPO_DONO = { negocios: "donoId", anuncios: "donoId", diario: "autorId", comunidade: "donoId" };
export const SEM_DATA = new Date("2999-12-31T00:00:00Z");
export const MARCA_SEM_VERIF = new Date("2999-11-30T00:00:00Z");
// Quem "manda mais": um motivo da equipe não é trocado por um da pessoa.
const FORCA = { conta: 1, sancao: 2, sem_verif: 3, moderacao: 4 };
const TIRAR = ["ocultoAte", "ocultoPelaEquipe", "guardado"];
const ms = (t) => t?.toMillis?.() ?? (t instanceof Date ? t.getTime() : Number(t) || 0);

export const idGuardado = (col, id) => `${col}_${id}`;
export const ehEsqueleto = (d) => d?.guardado === true;

function comoTimestamp(fb, d) {
  if (!d) return null;
  if (d.toMillis) return d;
  return fb.Timestamp.fromDate(d instanceof Date ? d : new Date(d));
}

// Esconde um documento. ate: até quando (Date/Timestamp/null = sem data). Devolve true se escondeu ou já estava.
export async function guardarItem(fb, col, id, { motivo = "moderacao", ate = null, por = "" } = {}) {
  const campo = CAMPO_DONO[col];
  if (!campo) throw new Error("Coleção sem guardado: " + col);
  const ref = fb.doc(fb.db, col, id);
  const gRef = fb.doc(fb.db, "guardados", idGuardado(col, id));
  const s = await fb.getDoc(ref);
  if (!s.exists()) return false;
  const d = s.data();
  const porEquipe = motivo !== "conta";
  const ateTs = comoTimestamp(fb, ate);
  if (ehEsqueleto(d)) {
    // Já guardado: só troca o motivo se o novo "manda mais" (equipe por cima de conta, por exemplo).
    const g = await fb.getDoc(gRef).catch(() => null);
    const atual = g?.exists() ? g.data() : null;
    if (!atual) return true;
    if (FORCA[motivo] < FORCA[atual.motivo]) return true;
    if (motivo === atual.motivo && ms(atual.ate) === ms(ateTs)) return true;
    const lote = fb.writeBatch(fb.db);
    lote.update(gRef, porEquipe ? { motivo, porEquipe, ate: ateTs, por, em: fb.serverTimestamp() } : { ate: ateTs, em: fb.serverTimestamp() });
    if (porEquipe && d.ocultoPelaEquipe !== true) lote.update(ref, { ocultoPelaEquipe: true });
    await lote.commit();
    return true;
  }
  const dados = Object.fromEntries(Object.entries(d).filter(([k]) => !TIRAR.includes(k)));
  const esqueleto = {
    [campo]: d[campo], ...(d.tipo !== undefined ? { tipo: d.tipo } : {}),
    // Sempre uma data distante: o esqueleto nunca aparece, mesmo depois do prazo (quem devolve é a pessoa ou a equipe).
    ocultoAte: fb.Timestamp.fromDate(motivo === "sem_verif" ? MARCA_SEM_VERIF : SEM_DATA),
    ocultoPelaEquipe: porEquipe, guardado: true
  };
  const lote = fb.writeBatch(fb.db);
  lote.set(gRef, { colecao: col, docId: id, dono: d[campo], dados, motivo, porEquipe, ate: ateTs, por, em: fb.serverTimestamp() });
  lote.set(ref, esqueleto);
  await lote.commit();
  return true;
}

// Devolve um documento guardado (exatamente como era). Sem guardado: nada a fazer.
export async function devolverItem(fb, col, id) {
  const ref = fb.doc(fb.db, col, id);
  const gRef = fb.doc(fb.db, "guardados", idGuardado(col, id));
  const g = await fb.getDoc(gRef);
  if (!g.exists()) return false;
  const lote = fb.writeBatch(fb.db);
  lote.set(ref, g.data().dados);
  lote.delete(gRef);
  await lote.commit();
  return true;
}

// Guardados de uma pessoa (o dono lê os seus; a equipe lê de todos). motivos: lista ou nada (todos).
export async function guardadosDe(fb, uid, motivos = null) {
  const filtros = [fb.where("dono", "==", uid)];
  if (motivos?.length === 1) filtros.push(fb.where("motivo", "==", motivos[0]));
  else if (motivos?.length) filtros.push(fb.where("motivo", "in", motivos));
  const s = await fb.getDocs(fb.query(fb.collection(fb.db, "guardados"), ...filtros, fb.limit(500)));
  return s.docs.map((x) => ({ gid: x.id, ...x.data() }));
}

// Devolve tudo de uma pessoa com esses motivos (reativar a conta, tirar a sanção, verificação aprovada).
export async function devolverDe(fb, uid, motivos, { colecoes = null } = {}) {
  const lista = await guardadosDe(fb, uid, motivos);
  let n = 0;
  for (const g of lista) {
    if (colecoes && !colecoes.includes(g.colecao)) continue;
    try { if (await devolverItem(fb, g.colecao, g.docId)) n++; } catch (e) { console.warn("[Guardados] não voltou:", g.gid, e?.code || e); }
  }
  return n;
}

// Ao entrar: o que a pessoa pode devolver sozinha e já venceu (suspensão que acabou; desativação com data que passou e
// a conta já foi reativada). Uma leitura por sessão.
export async function devolverVencidos(fb, uid) {
  const lista = await guardadosDe(fb, uid, ["sancao"]).catch(() => []);
  let n = 0;
  for (const g of lista) {
    if (!g.ate || ms(g.ate) > Date.now()) continue;
    try { if (await devolverItem(fb, g.colecao, g.docId)) n++; } catch {}
  }
  return n;
}

// Para quem pode ler os guardados (o dono e a equipe): troca os esqueletos da lista pelo conteúdo de verdade,
// com as marcas de escondido (ocultoAte, ocultoPelaEquipe) e o motivo em _guardado. Sem permissão, fica o esqueleto.
export async function completarGuardados(fb, col, lista) {
  const esq = lista.filter(ehEsqueleto);
  if (!esq.length) return lista;
  const lidos = new Map();
  await Promise.all(esq.map(async (x) => {
    try {
      const g = await fb.getDoc(fb.doc(fb.db, "guardados", idGuardado(col, x.id)));
      if (g.exists()) lidos.set(x.id, g.data());
    } catch {}
  }));
  return lista.map((x) => {
    const g = ehEsqueleto(x) ? lidos.get(x.id) : null;
    if (!g) return x;
    return { ...g.dados, id: x.id, ocultoAte: x.ocultoAte, ocultoPelaEquipe: x.ocultoPelaEquipe, guardado: true,
      _guardado: { motivo: g.motivo, ate: g.ate || null, porEquipe: !!g.porEquipe } };
  });
}

// Um documento só (com o conteúdo guardado, se a pessoa puder ler). null = não existe.
export async function lerComGuardado(fb, col, id) {
  const s = await fb.getDoc(fb.doc(fb.db, col, id));
  if (!s.exists()) return null;
  const [x] = await completarGuardados(fb, col, [{ id, ...s.data() }]);
  return x;
}

// Apagar um item escondido: o esqueleto e o guardado juntos.
export async function apagarComGuardado(fb, col, id) {
  const lote = fb.writeBatch(fb.db);
  lote.delete(fb.doc(fb.db, col, id));
  lote.delete(fb.doc(fb.db, "guardados", idGuardado(col, id)));
  await lote.commit();
}

// Texto para quem é dono: por que está escondido.
export function motivoTexto(g) {
  const m = g?._guardado?.motivo || g?.motivo;
  return m === "conta" ? "Escondido enquanto a conta está desativada"
    : m === "sancao" ? "Escondido durante a suspensão da conta"
    : m === "sem_verif" ? "Fora do ar até a conta ser verificada"
    : "Escondido pela equipe do Help Floripa";
}
