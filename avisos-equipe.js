// =====================================================
// Avisos da equipe e respostas do suporte ("Suporte Help Floripa", conta oficial)
// Usado pela página de notificações, pelo painel do sino, pelos números do sino e de
// Mensagens e pela faixa do suporte nas mensagens.
// - avisos/{id} (uid = eu): aviso da equipe. Não lido enquanto lidoEm == null.
// - suporte/{id} (uid = eu): chamado. "Resposta nova" quando a última palavra é da equipe
//   (status respondido) e chegou depois da última vez que a pessoa abriu o chamado.
//   A marca de leitura fica em usuarios/{uid}.suporteLido = { idDoChamado: data }
//   (parte privada da conta: não depende de regra nova).
// Tocar leva ao chamado (suporte.html?chamado=ID) ou ao aviso (suporte.html?aviso=ID).
// =====================================================
export const SUPORTE = { nome: "Suporte Help Floripa", foto: "logo.png" };
const ms = (t) => t?.toMillis?.() ?? (typeof t === "number" ? t : 0);
const LIMITE = 30;

export const linkEquipe = (i) => (i.tipo === "aviso" ? `suporte.html?aviso=${encodeURIComponent(i.ref)}` : `suporte.html?chamado=${encodeURIComponent(i.ref)}`);
export const TEXTO_EQUIPE = (i) => (i.tipo === "aviso" ? (i.grave ? "enviou um aviso importante" : "enviou um aviso") : i.abertoPelaEquipe && !i.respondeu ? "abriu uma conversa com você" : "respondeu seu chamado");

export function montarItensEquipe(avisos, chamados, lidos = {}) {
  const itens = [];
  avisos.forEach((a) => itens.push({
    tipo: "aviso", id: "av_" + a.id, ref: a.id, oficial: true, nome: SUPORTE.nome, foto: SUPORTE.foto,
    grave: a.tipo === "grave" || a.tipo === "alerta", titulo: a.titulo || "Aviso",
    detalhe: [a.titulo, a.texto].filter(Boolean).join(" — ").slice(0, 160), quando: ms(a.em), naoLida: a.lidoEm == null
  }));
  chamados.filter((c) => c.ultimaDe === "equipe" && c.status !== "fechado").forEach((c) => itens.push({
    tipo: "suporte", id: "sp_" + c.id, ref: c.id, oficial: true, nome: SUPORTE.nome, foto: SUPORTE.foto,
    abertoPelaEquipe: !!c.abertoPor, respondeu: ms(c.atualizadoEm) - ms(c.criadoEm) > 5000,
    detalhe: c.assunto || "Chamado", quando: ms(c.atualizadoEm),
    naoLida: c.status === "respondido" && ms(c.atualizadoEm) > ms(lidos?.[c.id])
  }));
  return itens.filter((i) => i.quando).sort((a, b) => b.quando - a.quando);
}

// Leitura única (sino das páginas de categoria e painel de notificações).
export async function buscarItensEquipe(fs, db, uid, lidos = null) {
  const ler = (col) => fs.getDocs(fs.query(fs.collection(db, col), fs.where("uid", "==", uid), fs.limit(LIMITE)))
    .then((s) => s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }))).catch(() => []);
  const [avisos, chamados, usuario] = await Promise.all([ler("avisos"), ler("suporte"), lidos ? null : fs.getDoc(fs.doc(db, "usuarios", uid)).catch(() => null)]);
  return montarItensEquipe(avisos, chamados, lidos || (usuario?.exists() ? usuario.data().suporteLido || {} : {}));
}

// Tempo real (páginas da rede social, sino do topo e mensagens). Devolve a função que para.
export function ouvirItensEquipe(fs, db, uid, aoMudar) {
  let avisos = [], chamados = [], lidos = {};
  const pronto = { a: false, c: false, u: false };
  const avisar = () => { if (pronto.a && pronto.c && pronto.u) aoMudar(montarItensEquipe(avisos, chamados, lidos)); };
  const lista = (col, k, guardar) => fs.onSnapshot(fs.query(fs.collection(db, col), fs.where("uid", "==", uid), fs.limit(LIMITE)), (s) => {
    guardar(s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }))); pronto[k] = true; avisar();
  }, (e) => { console.warn("[Suporte] Avisos da equipe indisponíveis:", e?.code || e); pronto[k] = true; avisar(); });
  const paradas = [
    lista("avisos", "a", (l) => { avisos = l; }),
    lista("suporte", "c", (l) => { chamados = l; }),
    fs.onSnapshot(fs.doc(db, "usuarios", uid), (s) => { lidos = (s.exists() ? s.data().suporteLido : null) || {}; pronto.u = true; avisar(); }, () => { pronto.u = true; avisar(); })
  ];
  // Abriu um chamado nesta aba: some do número na hora (sem esperar o servidor).
  const local = (e) => { if (e.detail?.id) { lidos = { ...lidos, [e.detail.id]: { toMillis: () => Date.now() + 1000 } }; avisar(); } };
  addEventListener("hf:suporte-lido", local);
  return () => { paradas.forEach((p) => p()); removeEventListener("hf:suporte-lido", local); };
}

// A pessoa abriu o chamado: guarda a leitura na parte privada da conta.
export function marcarChamadoLido(fs, db, uid, chamadoId) {
  dispatchEvent(new CustomEvent("hf:suporte-lido", { detail: { id: chamadoId } }));
  return fs.setDoc(fs.doc(db, "usuarios", uid), { suporteLido: { [chamadoId]: fs.serverTimestamp() } }, { merge: true }).catch((e) => console.warn("[Suporte] Leitura não guardada:", e?.code || e));
}

export const naoLidasEquipe = (itens) => itens.filter((i) => i.naoLida).length;

// Selo de conta oficial (ao lado do nome).
export function seloOficial() {
  const s = document.createElement("span");
  s.className = "hf-oficial"; s.title = "Conta oficial do Help Floripa"; s.setAttribute("aria-label", "Conta oficial");
  s.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M12 1.8l2.6 1.9 3.2-.2 1 3.1 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3.1-3.2-.2L12 22.2l-2.6-1.9-3.2.2-1-3.1-2.6-1.9 1-3.1-1-3.1 2.6-1.9 1-3.1 3.2.2z"/><path d="M8 12.3l2.6 2.6L16.2 9.3" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  cssOficial();
  return s;
}
let cssPronto = false;
function cssOficial() {
  if (cssPronto || document.getElementById("hfOficialCss")) return;
  cssPronto = true;
  const st = document.createElement("style"); st.id = "hfOficialCss";
  st.textContent = ".hf-oficial{display:inline-flex;vertical-align:-2px;margin-left:4px;color:#00adee}.hf-oficial svg{display:block}";
  document.head.appendChild(st);
}
// Foto do suporte (logo do Help Floripa): fonte fixa do próprio site.
export function fotoSuporte(cls = "") {
  const i = document.createElement("img");
  i.src = SUPORTE.foto; i.alt = ""; i.loading = "lazy"; if (cls) i.className = cls;
  return i;
}
