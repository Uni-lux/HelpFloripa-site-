// =====================================================
// Reclamações do Help Floripa
// - Reclamação = avaliação com 1 ou 2 estrelas dada a um perfil que oferece
//   serviços, delivery, loja ou imóveis. Avaliações de publicações não entram.
// - Quem recebeu responde publicamente (reclamacoes/{id da avaliação}) e o
//   cliente que reclamou marca como resolvida.
// - Painel de cada pessoa (?pessoa=uid): reclamações recebidas e enviadas.
// - Sempre com o nome da pessoa, nunca "o negócio".
// =====================================================
import { fotoSegura, conferirEmail, emailPendente, MSG_EMAIL } from "./seguranca.js?v=1";
import { estrelas } from "./avaliacoes.js?v=4";
import { NOMES_TIPO, PAGINA_TIPO } from "./vitrine.js?v=17";

const $ = (id) => document.getElementById(id);
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const ms = (ts) => ts?.toMillis?.() ?? 0;
const data = (ts) => { const d = ts?.toDate?.(); return d ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : ""; };
const dataCurta = (ts) => { const d = ts?.toDate?.(); return d ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : ""; };
const iniciais = (n) => { const p = String(n || "?").trim().split(/\s+/); return ((p[0]?.[0] || "?") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase(); };
const primeiro = (n) => String(n || "").trim().split(/\s+/)[0] || "";
const COR = { servicos: "var(--c-servicos)", delivery: "var(--c-delivery)", lojinha: "var(--c-lojinha)", imoveis: "var(--c-imoveis)" };
const nomeClasse = (t) => (t === "lojinha" ? "Shopping" : NOMES_TIPO[t] || "Perfil");
const ROTULO = { pendente: "Aguardando", respondida: "Respondida", resolvida: "Resolvida" };
const CLASSE_ST = { pendente: "pend", respondida: "resp", resolvida: "resolv" };
const POR_PAGINA = 18;
const url = new URLSearchParams(location.search);

let fb = null, eu = null;
let todas = [];                 // reclamações carregadas
const respostas = new Map();    // id da avaliação -> resposta
const negocios = new Map();     // negocioId -> dados
const pessoas = new Map();      // uid -> perfil público
let aba = "todas", classe = "todas", termo = "", limite = POR_PAGINA;
let pessoa = "", lado = "recebidas";

function toast(t) {
  const d = el("div", "vt-toast", t);
  Object.assign(d.style, { position: "fixed", left: "50%", bottom: "24px", transform: "translateX(-50%)", zIndex: 9300, padding: "12px 18px", borderRadius: "12px", background: "var(--text)", color: "var(--panel)", fontWeight: 700, maxWidth: "90vw" });
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 3200);
}
const tipoDe = (r) => negocios.get(r.negocioId)?.tipo || String(r.negocioId || "").split("_").pop();
const estado = (r) => { const s = respostas.get(r.id); return s?.resolvido ? "resolvida" : s ? "respondida" : "pendente"; };

// ---------- quem é quem ----------
function alvo(r) {
  const p = pessoas.get(r.alvoId) || {}, n = negocios.get(r.negocioId) || {};
  const nome = p.nome || n.nome || "Usuário";
  const perfil = n.nome && n.nome.trim().toLowerCase() !== nome.trim().toLowerCase() ? n.nome : "";
  return { uid: r.alvoId, nome, perfil, foto: fotoSegura(p.fotoPerfil) || fotoSegura(n.foto), nick: p.nickname || "", cidade: p.cidade || n.cidade || "" };
}
function autor(r) {
  const p = pessoas.get(r.autorId) || {};
  return { uid: r.autorId, nome: p.nome || r.autorNome || "Cliente", foto: fotoSegura(p.fotoPerfil) || fotoSegura(r.autorFoto), nick: p.nickname || "", cidade: p.cidade || "" };
}
function dadosPessoa(uid) {
  const p = pessoas.get(uid);
  if (p) return { uid, nome: p.nome || "Usuário", foto: fotoSegura(p.fotoPerfil), nick: p.nickname || "", cidade: p.cidade || "" };
  const r = todas.find((x) => x.alvoId === uid);
  if (r) return alvo(r);
  const r2 = todas.find((x) => x.autorId === uid);
  if (r2) return autor(r2);
  if (uid === eu?.uid) return { uid, nome: eu.displayName || "Você", foto: fotoSegura(eu.photoURL), nick: "", cidade: "" };
  return { uid, nome: "Usuário", foto: "", nick: "", cidade: "" };
}
const eh = (uid) => uid === eu?.uid;
const chamar = (p) => (eh(p.uid) ? "Você" : p.nome);
function avatar(p, cls = "av") {
  const a = el("span", cls);
  if (p.foto) { const i = document.createElement("img"); i.src = p.foto; i.alt = ""; i.loading = "lazy"; a.appendChild(i); } else a.textContent = iniciais(p.nome);
  return a;
}
function linkPerfil(uid) { return eh(uid) ? "usuarios.html" : `usuarios.html?perfil=${encodeURIComponent(uid)}`; }
function linkVitrine(r) {
  const t = tipoDe(r);
  return t === "imoveis" || !PAGINA_TIPO[t] ? linkPerfil(r.alvoId) : `${PAGINA_TIPO[t]}?negocio=${encodeURIComponent(r.negocioId)}`;
}

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
  const uids = [...new Set([...todas.flatMap((r) => [r.alvoId, r.autorId]), pessoa, eu.uid].filter(Boolean))];
  await Promise.all([
    ...ids.map(async (id) => {
      try { const s = await fb.getDoc(fb.doc(fb.db, "negocios", id)); negocios.set(id, s.exists() ? { id, ...s.data() } : { id, tipo: id.split("_").pop() }); }
      catch { negocios.set(id, { id, tipo: id.split("_").pop() }); }
    }),
    ...Array.from({ length: Math.ceil(uids.length / 30) }, (_, k) => uids.slice(k * 30, k * 30 + 30)).map(async (lote) => {
      try {
        const s = await fb.getDocs(fb.query(fb.collection(fb.db, "perfis_publicos"), fb.where(fb.documentId(), "in", lote)));
        s.docs.forEach((d) => pessoas.set(d.id, d.data()));
      } catch (e) { console.warn("[Reclamações] perfis:", e); }
    })
  ]);
}

// ---------- recortes ----------
const recebidasDe = (uid) => todas.filter((r) => r.alvoId === uid);
const enviadasDe = (uid) => todas.filter((r) => r.autorId === uid);
function base() { return pessoa ? (lado === "enviadas" ? enviadasDe(pessoa) : recebidasDe(pessoa)) : todas; }
function filtradas() {
  return base().filter((r) => {
    if (aba !== "todas" && estado(r) !== aba) return false;
    if (classe !== "todas" && tipoDe(r) !== classe) return false;
    if (termo) {
      const a = alvo(r), b = autor(r);
      const t = [a.nome, a.perfil, b.nome, r.comentario, respostas.get(r.id)?.texto].join(" ").toLowerCase();
      if (!t.includes(termo)) return false;
    }
    return true;
  });
}

// ---------- painéis ----------
function numeros(lista) {
  const resp = lista.filter((r) => respostas.has(r.id)).length;
  const resolv = lista.filter((r) => respostas.get(r.id)?.resolvido).length;
  return { total: lista.length, resp, resolv, pend: lista.length - resp, pct: lista.length ? `${Math.round((resp / lista.length) * 100)}%` : "–" };
}
function pintarMeuPainel() {
  const eu_ = dadosPessoa(eu.uid);
  const rec = numeros(recebidasDe(eu.uid)), env = numeros(enviadasDe(eu.uid));
  $("mpAv").replaceWith(Object.assign(avatar(eu_), { id: "mpAv" }));
  $("mpNome").textContent = eu_.nome;
  $("mpRec").textContent = rec.total;
  $("mpEnv").textContent = env.total;
  $("mpResolv").textContent = rec.resolv + env.resolv;
  const ri = $("mpRecInfo");
  ri.textContent = rec.pend ? `${rec.pend} aguardando sua resposta` : rec.total ? "Todas respondidas" : "Nenhuma recebida";
  ri.className = rec.pend ? "alerta" : "";
  $("mpEnvInfo").textContent = env.total ? `${env.resp} com resposta` : "Nenhuma enviada";
  $("meuPainel").hidden = !!pessoa;
}
function pintarPainelPessoa() {
  const box = $("painelPessoa");
  box.hidden = !pessoa;
  $("visaoGeral").hidden = !!pessoa;
  if (!pessoa) return;
  const p = dadosPessoa(pessoa);
  const rec = numeros(recebidasDe(pessoa)), env = numeros(enviadasDe(pessoa));
  $("ppAv").replaceWith(Object.assign(avatar(p, "av grande"), { id: "ppAv" }));
  $("ppSelo").textContent = eh(pessoa) ? "Seu painel de reclamações" : "Painel de reclamações";
  $("ppNome").textContent = eh(pessoa) ? `${p.nome} (você)` : p.nome;
  const classes = [...new Set(recebidasDe(pessoa).map(tipoDe))].map(nomeClasse);
  $("ppSub").textContent = [p.nick ? "@" + p.nick : "", p.cidade, classes.join(", ")].filter(Boolean).join(" · ");
  $("ppPerfil").href = linkPerfil(pessoa);
  $("ppRec").textContent = rec.total;
  $("ppResp").textContent = rec.pct;
  $("ppResolv").textContent = rec.resolv;
  $("ppEnv").textContent = env.total;
  const nm = eh(pessoa) ? "você" : primeiro(p.nome);
  const [bR, bE] = $("ppAbas").querySelectorAll("[data-lado]");
  bR.querySelector("span").textContent = eh(pessoa) ? "Recebidas por você" : `Recebidas por ${nm}`;
  bE.querySelector("span").textContent = eh(pessoa) ? "Enviadas por você" : `Enviadas por ${nm}`;
  bR.querySelector("em").textContent = rec.total;
  bE.querySelector("em").textContent = env.total;
  $("ppAbas").querySelectorAll("[data-lado]").forEach((b) => b.setAttribute("aria-selected", b.dataset.lado === lado ? "true" : "false"));
}
function pintarNumeros() {
  const g = numeros(todas);
  $("nTotal").textContent = g.total;
  $("nResp").textContent = g.pct;
  $("nPend").textContent = g.pend;
  $("nResolv").textContent = g.resolv;
  const b = base();
  const conta = { todas: b.length, pendente: 0, respondida: 0, resolvida: 0 };
  b.forEach((r) => conta[estado(r)]++);
  document.querySelectorAll("#abasRec [data-aba]").forEach((bt) => { bt.querySelector("em").textContent = conta[bt.dataset.aba]; });
}

// ---------- cartão compacto ----------
function cartao(r) {
  const a = alvo(r), b = autor(r), t = tipoDe(r), st = estado(r), s = respostas.get(r.id);
  const c = el("article", "rec-card");
  c.tabIndex = 0;
  c.setAttribute("role", "button");
  c.setAttribute("aria-label", `Reclamação de ${chamar(b)} para ${chamar(a)}, ${r.nota} ${r.nota === 1 ? "estrela" : "estrelas"}, ${ROTULO[st]}`);
  c.style.setProperty("--c", COR[t] || "var(--accent)");

  const topo = el("div", "rc-topo");
  topo.append(el("span", "tag-classe", nomeClasse(t)), el("span", "status mini " + CLASSE_ST[st], ROTULO[st]));
  const quem = el("div", "rc-pessoa");
  const tx = el("div", "rc-nome");
  tx.append(el("strong", null, chamar(a)), el("small", null, a.perfil || nomeClasse(t)));
  quem.append(avatar(a), tx);
  const nota = el("div", "rc-nota");
  nota.append(estrelas({ total: 1, soma: r.nota }, { soEstrelas: true }), el("small", null, dataCurta(r.criadoEm)));
  const texto = el("p", "rc-texto" + (r.comentario ? "" : " vazio"), r.comentario || "Nota sem comentário.");
  const rod = el("div", "rc-rodape");
  const de = el("span", "rc-de");
  de.append(avatar(b, "av mini"), el("span", null, `de ${eh(b.uid) ? "você" : primeiro(b.nome)}`));
  rod.appendChild(de);
  if (s) rod.appendChild(el("span", "rc-resp", `${eh(a.uid) ? "Você" : primeiro(a.nome)} respondeu`));
  if (eh(a.uid) && !s) rod.appendChild(el("span", "rc-acao", "Responder"));
  c.append(topo, quem, nota, texto, rod);
  c.addEventListener("click", () => abrirDetalhe(r));
  c.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrirDetalhe(r); } });
  return c;
}

// ---------- detalhe ----------
let ultimoFoco = null, detalheAberto = null;
function abrirDetalhe(r) {
  detalheAberto = r;
  ultimoFoco = document.activeElement;
  pintarDetalhe(r);
  $("recModal").hidden = false;
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => $("recModal").classList.add("aberto"));
  $("recFechar").focus();
}
function fecharDetalhe() {
  if ($("recModal").hidden) return;
  $("recModal").classList.remove("aberto");
  $("recModal").hidden = true;
  document.body.style.overflow = "";
  detalheAberto = null;
  ultimoFoco?.focus?.();
}
function pintarDetalhe(r) {
  const a = alvo(r), b = autor(r), t = tipoDe(r), st = estado(r), s = respostas.get(r.id);
  const corpo = $("recModalCorpo");
  corpo.replaceChildren();
  corpo.style.setProperty("--c", COR[t] || "var(--accent)");
  $("recModalTitulo").textContent = `Reclamação · ${nomeClasse(t)}`;

  // de quem -> para quem
  const par = el("div", "rd-par");
  const lado_ = (p, rot) => {
    const bt = el("button", "rd-lado"); bt.type = "button";
    const tx = el("span", "rd-lado-tx");
    tx.append(el("small", null, rot), el("strong", null, chamar(p)));
    bt.append(avatar(p), tx);
    bt.title = `Abrir o painel de ${chamar(p)}`;
    bt.addEventListener("click", () => { fecharDetalhe(); abrirPessoa(p.uid, rot === "Reclamou" ? "enviadas" : "recebidas"); });
    return bt;
  };
  const seta = el("span", "rd-seta"); seta.innerHTML = '<svg class="i xs" aria-hidden="true"><use href="#i-seta"/></svg>';
  par.append(lado_(b, "Reclamou"), seta, lado_(a, "Recebeu"));
  corpo.appendChild(par);

  const info = el("div", "rd-info");
  info.append(el("span", "tag-classe", nomeClasse(t)));
  if (a.perfil) info.appendChild(el("span", "rd-perfil", a.perfil));
  info.append(el("span", "status " + CLASSE_ST[st], ROTULO[st]));
  corpo.appendChild(info);

  const nota = el("div", "rd-nota");
  nota.append(estrelas({ total: 1, soma: r.nota }, { soEstrelas: true }), el("span", null, `${r.nota} de 5 · ${data(r.criadoEm)}`));
  corpo.appendChild(nota);
  corpo.appendChild(el("blockquote", "rd-texto" + (r.comentario ? "" : " vazio"), r.comentario || `${chamar(b)} deu a nota sem escrever comentário.`));

  if (s) {
    const bx = el("div", "resposta");
    const cab = el("div", "resposta-cab");
    cab.append(avatar(a, "av mini"), el("strong", null, eh(a.uid) ? "Sua resposta" : `Resposta de ${a.nome}`));
    bx.append(cab, el("p", null, s.texto));
    bx.appendChild(el("small", null, [data(s.criadoEm), s.editadoEm ? "editada" : "", s.resolvido ? `marcada como resolvida por ${eh(b.uid) ? "você" : primeiro(b.nome)} em ${data(s.resolvidoEm)}` : ""].filter(Boolean).join(" · ")));
    corpo.appendChild(bx);
  } else {
    corpo.appendChild(el("p", "rd-aguarda", eh(a.uid) ? "Você ainda não respondeu. Uma resposta educada mostra cuidado para todos os clientes." : `${a.nome} ainda não respondeu.`));
  }

  const acoes = el("div", "rec-acoes");
  if (eh(a.uid)) {
    const bt = el("button", "botao" + (s ? " sec" : ""), s ? "Editar resposta" : "Responder publicamente");
    bt.type = "button";
    bt.addEventListener("click", () => abrirResposta(corpo, r, s, acoes));
    acoes.appendChild(bt);
  }
  if (eh(b.uid) && s) {
    const bt = el("button", "botao" + (s.resolvido ? " sec" : ""), s.resolvido ? "Reabrir reclamação" : "Marcar como resolvida");
    bt.type = "button";
    bt.addEventListener("click", () => marcarResolvida(r, !s.resolvido, bt));
    acoes.appendChild(bt);
  }
  const painel = el("button", "botao sec", eh(a.uid) ? "Meu painel" : `Painel de ${primeiro(a.nome)}`); painel.type = "button";
  painel.addEventListener("click", () => { fecharDetalhe(); abrirPessoa(a.uid, "recebidas"); });
  const ver = el("a", "botao sec", eh(a.uid) ? "Meu perfil" : `Perfil de ${primeiro(a.nome)}`); ver.href = linkVitrine(r);
  acoes.append(painel, ver);
  corpo.appendChild(acoes);
}

async function precisaEmail() {
  if (!emailPendente(eu)) return false;
  if (await conferirEmail(eu)) return false;
  toast(MSG_EMAIL);
  return true;
}
function abrirResposta(corpo, r, s, acoes) {
  if (corpo.querySelector(".rec-form")) return;
  const f = el("div", "rec-form campo");
  const lb = el("label", null, s ? "Editar sua resposta pública" : "Sua resposta pública"); lb.htmlFor = "resp_" + r.id;
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
      respostas.set(r.id, (await fb.getDoc(ref)).data());
      toast(s ? "Resposta atualizada" : "Resposta publicada");
      pintar();
      pintarDetalhe(r);
    } catch (e) { console.error(e); env.disabled = false; toast("Não foi possível salvar a resposta. Tente de novo."); }
  });
  lin.append(env, can);
  f.append(lb, tx, aj, lin);
  acoes.hidden = true;
  corpo.appendChild(f);
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
    pintarDetalhe(r);
  } catch (e) { console.error(e); bt.disabled = false; toast("Não foi possível atualizar agora."); }
}

// ---------- lista ----------
function pintar() {
  pintarMeuPainel();
  pintarPainelPessoa();
  pintarNumeros();
  const lista = $("listaRec");
  const itens = filtradas();
  lista.replaceChildren();
  if (!itens.length) {
    const v = el("div", "lista-vazia");
    let t = "Nada encontrado", d = "Tente outra situação, classe ou palavra.";
    if (!base().length) {
      const nm = eh(pessoa) ? "você" : primeiro(dadosPessoa(pessoa).nome);
      if (!pessoa) { t = "Nenhuma reclamação por aqui"; d = "Ótimo sinal: ninguém recebeu nota 1 ou 2 até agora."; }
      else if (lado === "recebidas") { t = eh(pessoa) ? "Você não tem reclamações" : `${nm} não tem reclamações`; d = "Nenhum cliente deu nota 1 ou 2."; }
      else { t = eh(pessoa) ? "Você não enviou reclamações" : `${nm} não enviou reclamações`; d = "Nenhuma nota 1 ou 2 dada."; }
    }
    v.append(el("strong", null, t), d);
    lista.appendChild(v);
  }
  itens.slice(0, limite).forEach((r) => lista.appendChild(cartao(r)));
  $("maisRec").hidden = itens.length <= limite;
}

// ---------- navegação entre painéis ----------
function abrirPessoa(uid, l = "recebidas", empilhar = true) {
  pessoa = uid || ""; lado = l; limite = POR_PAGINA;
  if (empilhar) {
    const u = new URL(location.href);
    ["negocio", "aba", "pessoa", "lado"].forEach((k) => u.searchParams.delete(k));
    if (pessoa) { u.searchParams.set("pessoa", pessoa); if (lado !== "recebidas") u.searchParams.set("lado", lado); }
    history.pushState({ pessoa, lado }, "", u);
  }
  pintar();
  (pessoa ? $("painelPessoa") : $("meuPainel")).scrollIntoView({ behavior: "smooth", block: "start" });
}
window.addEventListener("popstate", () => {
  const q = new URLSearchParams(location.search);
  pessoa = q.get("pessoa") || ""; lado = q.get("lado") === "enviadas" ? "enviadas" : "recebidas";
  fecharDetalhe();
  if (eu) pintar();
});

// ---------- filtros ----------
document.querySelectorAll("#abasRec [data-aba]").forEach((b) => b.addEventListener("click", () => {
  aba = b.dataset.aba; limite = POR_PAGINA;
  document.querySelectorAll("#abasRec [data-aba]").forEach((x) => x.setAttribute("aria-selected", x === b ? "true" : "false"));
  pintar();
}));
$("filterChips").addEventListener("click", (e) => { const c = e.target.closest(".chip"); if (!c) return; classe = c.dataset.filter; limite = POR_PAGINA; setTimeout(pintar, 0); });
$("searchInput").addEventListener("input", (e) => { termo = e.target.value.trim().toLowerCase(); limite = POR_PAGINA; pintar(); });
$("maisRec").addEventListener("click", () => { limite += POR_PAGINA; pintar(); });
$("ppAbas").querySelectorAll("[data-lado]").forEach((b) => b.addEventListener("click", () => abrirPessoa(pessoa, b.dataset.lado)));
$("ppVoltar").addEventListener("click", () => abrirPessoa("", "recebidas"));
$("mpAbrir").addEventListener("click", () => abrirPessoa(eu.uid, "recebidas"));
document.querySelectorAll("#meuPainel [data-lado]").forEach((b) => b.addEventListener("click", () => abrirPessoa(eu.uid, b.dataset.lado)));
$("recFechar").addEventListener("click", fecharDetalhe);
$("recModal").addEventListener("click", (e) => { if (e.target === $("recModal")) fecharDetalhe(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") fecharDetalhe(); });

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
    // Endereços antigos: ?aba=recebidas (meu painel) e ?negocio=uid_tipo (painel do dono).
    if (url.get("pessoa")) { pessoa = url.get("pessoa"); lado = url.get("lado") === "enviadas" ? "enviadas" : "recebidas"; }
    else if (url.get("aba") === "recebidas") pessoa = eu.uid;
    else if (url.get("negocio")) {
      const n = url.get("negocio");
      pessoa = n.slice(0, n.lastIndexOf("_")) || "";
      const t = n.split("_").pop();
      document.querySelector(`#filterChips [data-filter="${CSS.escape(t)}"]`)?.click();
    }
    try {
      await carregar();
      pintar();
    } catch (e) {
      console.error(e);
      $("listaRec").replaceChildren(Object.assign(el("div", "lista-vazia"), { textContent: "Não foi possível carregar as reclamações agora." }));
    }
  });
})();
