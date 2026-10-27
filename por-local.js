// =====================================================
// Listas por região, em nível nacional e sem ler à toa: primeiro a cidade escolhida, depois o estado e só então o
// Brasil, parando quando já tem itens suficientes. Cada nível fica guardado 10 min no aparelho (docsComValidade).
// Usa o índice composto (filtros + atualizadoEm) quando existe; sem ele (índice ainda não criado), lê sem ordem e
// ordena na tela, para nada quebrar. Sem dependências.
// =====================================================
const ms = (t) => t?.toMillis?.() ?? (t?.seconds ? t.seconds * 1000 : 0);
const recente = (a, b) => ms(b.atualizadoEm || b.criadoEm) - ms(a.atualizadoEm || a.criadoEm);

// colecao: "comunidade" | "negocios"...; filtros: [[campo, valor], ...] (igualdades fixas, ex.: [["tipo", "saude"]]);
// loc: { uf, cidadeIbge } (vazio = Brasil); minimo: quantos itens bastam; noAr: filtro do que pode aparecer.
// Devolve { lista, nivel } (nivel: "cidade" | "estado" | "brasil" — de onde veio o primeiro item).
export async function lerPorLocal(fb, docsComValidade, { colecao, filtros = [], loc = {}, limite = 30, minimo = 10, noAr = () => true, chave }) {
  const col = fb.collection(fb.db, colecao);
  const onde = (extra) => [...filtros, ...extra].map(([c, v]) => fb.where(c, "==", v));
  async function ler(nome, extra) {
    const k = `${chave || colecao}-${nome}`;
    const tentar = (q, sufixo) => (docsComValidade ? docsComValidade(fb, k + sufixo, q, 10 * 60000) : fb.getDocs(q));
    let s;
    try { s = await tentar(fb.query(col, ...onde(extra), fb.orderBy("atualizadoEm", "desc"), fb.limit(limite)), ""); }
    catch { s = await tentar(fb.query(col, ...onde(extra), fb.limit(limite)), "-s").catch(() => null); } // sem o índice
    return s ? s.docs.map((d) => ({ id: d.id, ...d.data() })).filter(noAr).sort(recente) : [];
  }
  const vistos = new Set(), lista = [];
  let nivel = "";
  const somar = (l, n) => { l.forEach((x) => { if (!vistos.has(x.id)) { vistos.add(x.id); lista.push(x); } }); if (!nivel && l.length) nivel = n; };
  const ibge = Number(loc.cidadeIbge) || 0;
  if (ibge) somar(await ler(`c${ibge}`, [["cidadeIbge", ibge]]), "cidade");
  if (loc.uf && lista.length < minimo) somar(await ler(`u${loc.uf}`, [["uf", loc.uf]]), "estado");
  if (lista.length < minimo) somar(await ler("br", []), "brasil");
  return { lista, nivel: nivel || "brasil" };
}

// Carrega a seção só quando ela chega perto da tela (quem não rola até lá não gasta leitura).
export function quandoVisivel(elemento, fn, margem = "600px") {
  if (!elemento) return;
  if (!("IntersectionObserver" in window)) { fn(); return; }
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); fn(); } }, { rootMargin: margem });
  io.observe(elemento);
}
