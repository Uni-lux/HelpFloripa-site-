// =====================================================
// Reclamações do Help Floripa
// - Reclamação = avaliação de um perfil de negócio (serviços, delivery,
//   loja ou imóveis) com 1 ou 2 estrelas. Avaliações de publicações não entram.
// - O negócio responde publicamente (reclamacoes/{id da avaliação}) e o
//   cliente que reclamou marca como resolvida.
// =====================================================
import { fotoSegura, conferirEmail, emailPendente, MSG_EMAIL } from "./seguranca.js?v=1";
import { estrelas } from "./avaliacoes.js?v=2";
import { NOMES_TIPO, PAGINA_TIPO } from "./vitrine.js?v=15";

const $ = (id) => document.getElementById(id);
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const ms = (ts) => ts?.toMillis?.() ?? 0;
const data = (ts) => { const d = ts?.toDate?.(); return d ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : ""; };
const iniciais = (n) => { const p = String(n || "?").trim().split(/\s+/); return ((p[0]?.[0] || "?") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase(); };
const COR = { servicos: "var(--c-servicos)", delivery: "var(--c-delivery)", lojinha: "var(--c-lojinha)", imoveis: "var(--c-imoveis)" };
const nomeClasse = (t) => (t === "lojinha" ? "Shopping" : NOMES_TIPO[t] || "Negócio");
const POR_PAGINA = 20;

let fb = null, eu = null;
let todas = [];                 // reclamações carregadas
const respostas = new Map();    // id da avaliação -> resposta
const negocios = new Map();     // negocioId -> dados
let aba = "todas", classe = "todas", termo = "", limite = POR_PAGINA;
const filtroNegocio = new URLSearchParams(location.search).get("negocio") || "";

function toast(t) {
  const d = el("div", "vt-toast", t);
  Object.assign(d.style, { position: "fixed", left: "50%", bottom: "24px", transform: "translateX(-50%)", zIndex: 9100, padding: "12px 18px", borderRadius: "12px", background: "var(--text)", color: "var(--panel)", fontWeight: 700 });
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 3200);
}
const tipoDe = (r) => negocios.get(r.negocioId)?.tipo || String(r.negocioId || "").split("_").pop();
const estado = (r) => { const s = respostas.get(r.id); return s?.resolvido ? "resolvida" : s ? "respondida" : "pendente"; };

// ---------- carregar ----------
async function carregar() {
  const col = fb.collection(fb.db, "avaliacoes");
  const [n1, n2, resp] = await Promise.all([
    fb.getDocs(fb.query(col, fb.where("tipo", "==", "negocio"), fb.where("nota", "==", 1), fb.limit(300))),
    fb.getDocs(fb.query(col, fb.where("tipo", "==", "negocio"), fb.where("nota", "==", 2), fb.limit(300))),
    fb.getDocs(fb.query(fb.collection(fb.db, "reclamacoes"), fb.limit(600))).catch(() => ({ docs: [] }))
  ]);
  todas = [...n1.docs, ...n2.docs].map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
  resp.docs.forEach((d) => respostas.set(d.id, d.data()));
  const ids = [...new Set(todas.map((r) => r.negocioId).filter(Boolean))];
  await Promise.all(ids.map(async (id) => {
    try { const s = await fb.getDoc(fb.doc(fb.db, "negocios", id)); negocios.set(id, s.exists() ? { id, ...s.data() } : { id, tipo: id.split("_").pop() }); }
    catch { negocios.set(id, { id, tipo: id.split("_").pop() }); }
  }));
}

// ---------- números e abas ----------
function base() { return filtroNegocio ? todas.filter((r) => r.negocioId === filtroNegocio) : todas; }
function pintarNumeros() {
  const b = base();
  const resp = b.filter((r) => respostas.has(r.id)).length;
  const resolv = b.filter((r) => respostas.get(r.id)?.resolvido).length;
  $("nTotal").textContent = b.length;
  $("nResp").textContent = b.length ? `${Math.round((resp / b.length) * 100)}%` : "–";
  $("nPend").textContent = b.length - resp;
  $("nResolv").textContent = resolv;
  const conta = { todas: b.length, pendente: b.length - resp, respondida: resp - resolv, resolvida: resolv, recebidas: b.filter((r) => r.alvoId === eu.uid).length, minhas: b.filter((r) => r.autorId === eu.uid).length };
  document.querySelectorAll("#abasRec [data-aba]").forEach((bt) => {
    bt.querySelector("em").textContent = conta[bt.dataset.aba];
    if (bt.dataset.aba === "recebidas" || bt.dataset.aba === "minhas") bt.hidden = !conta[bt.dataset.aba];
  });
}
function filtradas() {
  return base().filter((r) => {
    if (aba === "recebidas" && r.alvoId !== eu.uid) return false;
    if (aba === "minhas" && r.autorId !== eu.uid) return false;
    if (["pendente", "respondida", "resolvida"].includes(aba) && estado(r) !== aba) return false;
    if (classe !== "todas" && tipoDe(r) !== classe) return false;
    if (termo) {
      const n = negocios.get(r.negocioId) || {};
      const alvo = [n.nome, r.comentario, r.autorNome, respostas.get(r.id)?.texto].join(" ").toLowerCase();
      if (!alvo.includes(termo)) return false;
    }
    return true;
  });
}

// ---------- cartão ----------
function linkNegocio(n, r) {
  const t = n.tipo || tipoDe(r);
  return t === "imoveis" || !PAGINA_TIPO[t] ? `usuarios.html?perfil=${encodeURIComponent(r.alvoId)}` : `${PAGINA_TIPO[t]}?negocio=${encodeURIComponent(r.negocioId)}`;
}
function cartao(r) {
  const n = negocios.get(r.negocioId) || {};
  const t = n.tipo || tipoDe(r);
  const s = respostas.get(r.id);
  const c = el("article", "rec");
  c.style.setProperty("--c", COR[t] || "var(--accent)");

  const cab = el("div", "rec-cab");
  const av = el("span", "av");
  const f = fotoSegura(n.foto);
  if (f) { const img = document.createElement("img"); img.src = f; img.alt = ""; img.loading = "lazy"; av.appendChild(img); } else av.textContent = iniciais(n.nome);
  const quem = el("div", "quem");
  const a = el("a", null, n.nome || "Negócio"); a.href = linkNegocio(n, r);
  const sub = el("small");
  sub.append(el("span", "tag-classe", nomeClasse(t)), document.createTextNode([n.cidade, data(r.criadoEm)].filter(Boolean).join(" · ")));
  quem.append(a, sub);
  const st = estado(r);
  const status = el("span", "status " + ({ pendente: "pend", respondida: "resp", resolvida: "resolv" }[st]), { pendente: "Aguardando resposta", respondida: "Respondida", resolvida: "Resolvida" }[st]);
  cab.append(av, quem, status);
  c.appendChild(cab);

  const meta = el("div", "rec-meta");
  meta.append(estrelas({ total: 1, soma: r.nota }, { soEstrelas: true }), document.createTextNode(`Reclamação de ${r.autorId === eu.uid ? "você" : r.autorNome || "cliente"}`));
  c.appendChild(meta);
  c.appendChild(el("p", "rec-texto" + (r.comentario ? "" : " vazio"), r.comentario || "O cliente deu a nota sem escrever comentário."));

  if (s) {
    const bx = el("div", "resposta");
    bx.append(el("strong", null, `Resposta de ${n.nome || "o negócio"}`), el("p", null, s.texto));
    bx.appendChild(el("small", null, [data(s.criadoEm), s.editadoEm ? "editada" : "", s.resolvido ? `resolvida pelo cliente em ${data(s.resolvidoEm)}` : ""].filter(Boolean).join(" · ")));
    c.appendChild(bx);
  }

  const acoes = el("div", "rec-acoes");
  if (r.alvoId === eu.uid) {
    const bt = el("button", "botao" + (s ? " sec" : ""), s ? "Editar resposta" : "Responder publicamente");
    bt.type = "button";
    bt.addEventListener("click", () => abrirResposta(c, r, s, acoes));
    acoes.appendChild(bt);
  }
  if (r.autorId === eu.uid && s) {
    const bt = el("button", "botao" + (s.resolvido ? " sec" : ""), s.resolvido ? "Reabrir reclamação" : "Marcar como resolvida");
    bt.type = "button";
    bt.addEventListener("click", () => marcarResolvida(r, !s.resolvido, bt));
    acoes.appendChild(bt);
  }
  const ver = el("a", "botao sec", "Ver negócio"); ver.href = linkNegocio(n, r);
  acoes.appendChild(ver);
  c.appendChild(acoes);
  return c;
}

async function precisaEmail() {
  if (!emailPendente(eu)) return false;
  if (await conferirEmail(eu)) return false;
  toast(MSG_EMAIL);
  return true;
}
function abrirResposta(c, r, s, acoes) {
  if (c.querySelector(".rec-form")) return;
  const f = el("div", "rec-form campo");
  const lb = el("label", null, s ? "Editar resposta pública" : "Sua resposta pública"); lb.htmlFor = "resp_" + r.id;
  const tx = el("textarea"); tx.id = "resp_" + r.id; tx.maxLength = 1000; tx.value = s?.texto || "";
  tx.placeholder = "Explique o que aconteceu e como vai resolver. Seja educado: todos podem ler.";
  const aj = el("span", "ajuda", "Até 1000 caracteres. A resposta fica visível para todos, junto da reclamação.");
  const lin = el("div", "rec-acoes");
  const env = el("button", "botao", s ? "Salvar" : "Publicar resposta"); env.type = "button";
  const can = el("button", "botao sec", "Cancelar"); can.type = "button";
  can.addEventListener("click", () => { f.remove(); acoes.hidden = false; });
  env.addEventListener("click", async () => {
    const texto = tx.value.trim();
    if (texto.length < 2) { tx.focus(); return; }
    if (await precisaEmail()) return;
    env.disabled = true;
    try {
      const ref = fb.doc(fb.db, "reclamacoes", r.id);
      if (s) await fb.updateDoc(ref, { texto, editadoEm: fb.serverTimestamp() });
      else await fb.setDoc(ref, { texto, autorId: eu.uid, criadoEm: fb.serverTimestamp() });
      const novo = (await fb.getDoc(ref)).data();
      respostas.set(r.id, novo);
      toast(s ? "Resposta atualizada" : "Resposta publicada");
      pintar();
    } catch (e) { console.error(e); env.disabled = false; toast("Não foi possível salvar a resposta. Tente de novo."); }
  });
  lin.append(env, can);
  f.append(lb, tx, aj, lin);
  acoes.hidden = true;
  c.appendChild(f);
  tx.focus();
}
async function marcarResolvida(r, sim, bt) {
  if (await precisaEmail()) return;
  bt.disabled = true;
  try {
    const ref = fb.doc(fb.db, "reclamacoes", r.id);
    await fb.updateDoc(ref, { resolvido: sim, resolvidoEm: fb.serverTimestamp() });
    respostas.set(r.id, (await fb.getDoc(ref)).data());
    toast(sim ? "Obrigado! Reclamação marcada como resolvida." : "Reclamação reaberta");
    pintar();
  } catch (e) { console.error(e); bt.disabled = false; toast("Não foi possível atualizar agora."); }
}

// ---------- lista ----------
function pintar() {
  pintarNumeros();
  const lista = $("listaRec");
  const itens = filtradas();
  lista.replaceChildren();
  if (!itens.length) {
    const v = el("div", "lista-vazia");
    v.append(el("strong", null, todas.length ? "Nada encontrado" : "Nenhuma reclamação por aqui"), todas.length ? "Tente outra aba, classe ou palavra." : "Ótimo sinal: nenhum cliente deu nota 1 ou 2 até agora.");
    lista.appendChild(v);
  }
  itens.slice(0, limite).forEach((r) => lista.appendChild(cartao(r)));
  $("maisRec").hidden = itens.length <= limite;
}

// ---------- filtros ----------
document.querySelectorAll("#abasRec [data-aba]").forEach((b) => b.addEventListener("click", () => {
  aba = b.dataset.aba; limite = POR_PAGINA;
  document.querySelectorAll("#abasRec [data-aba]").forEach((x) => x.setAttribute("aria-selected", x === b ? "true" : "false"));
  pintar();
}));
$("filterChips").addEventListener("click", (e) => { const c = e.target.closest(".chip"); if (!c) return; classe = c.dataset.filter; limite = POR_PAGINA; setTimeout(pintar, 0); });
$("searchInput").addEventListener("input", (e) => { termo = e.target.value.trim().toLowerCase(); limite = POR_PAGINA; pintar(); });
$("maisRec").addEventListener("click", () => { limite += POR_PAGINA; pintar(); });

// ---------- início ----------
(async function iniciar() {
  for (let i = 0; i < 100 && (!window.firebaseAuth || !window.firebaseDb); i++) await new Promise((r) => setTimeout(r, 50));
  if (!window.firebaseDb) return;
  const [auth, fs] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
  ]);
  fb = { ...fs, db: window.firebaseDb };
  auth.onAuthStateChanged(window.firebaseAuth, async (u) => {
    if (!u || eu) return;
    eu = u;
    if (new URLSearchParams(location.search).get("aba") === "recebidas") $("abasRec").querySelector('[data-aba="recebidas"]')?.click();
    try {
      await carregar();
      if (filtroNegocio) {
        const n = negocios.get(filtroNegocio);
        const f = $("filtroNegocio");
        f.hidden = false;
        f.querySelector("strong").textContent = n?.nome || "este negócio";
      }
      pintar();
    } catch (e) {
      console.error(e);
      $("listaRec").replaceChildren(Object.assign(el("div", "lista-vazia"), { textContent: "Não foi possível carregar as reclamações agora." }));
    }
  });
})();
