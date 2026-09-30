// =====================================================
// Feed da rede social (feed.html)
// - Seguindo: publicações suas e de quem você segue.
// - Explorar: as publicações mais recentes de todo o Help Floripa.
// - Pessoas: busca e sugestões de quem seguir.
// Links: feed.html?aba=explorar · ?aba=pessoas · ?publicar=1
// =====================================================
import {
  $, el, icone, ms, paraData, pintarAvatar, urlSegura, nomeCidade, numero, tempoRelativo, toast, erroAmigavel,
  fb, eu, dados, meusSeguindo, escondido, ganchos, obterPerfil, iniciarRede, carregarMeusSeguindo, botaoSeguir, linhaPessoa,
  barraInteracao, abrirComentarios, abrirCompositor, abrirOpcoes, compartilharPerfil, montarBarraRede, pintarBarraRede, ouvirAvisos
} from "./rede.js?v=1";

const POR_VEZ = 12;
let aba = "seguindo";
let posts = [], mostrados = 0;
let pessoas = null;

// ---------- abas ----------
function trocarAba(nova) {
  aba = nova;
  document.querySelectorAll("#abasFeed [data-aba]").forEach((b) => b.setAttribute("aria-selected", b.dataset.aba === aba ? "true" : "false"));
  $("painelFeed").hidden = aba === "pessoas";
  $("painelPessoas").hidden = aba !== "pessoas";
  const u = new URL(location.href);
  if (aba === "seguindo") u.searchParams.delete("aba"); else u.searchParams.set("aba", aba);
  history.replaceState(null, "", u.pathname.split("/").pop() + u.search);
  if (aba === "pessoas") carregarPessoas();
  else carregarFeed();
}
document.querySelectorAll("#abasFeed [data-aba]").forEach((b) => b.addEventListener("click", () => trocarAba(b.dataset.aba)));

// ---------- publicações ----------
async function buscarSeguindo() {
  const autores = [eu.uid, ...meusSeguindo].filter((u) => !escondido(u));
  const lotes = [];
  for (let i = 0; i < autores.length; i += 30) lotes.push(autores.slice(i, i + 30));
  const res = await Promise.all(lotes.map((l) => fb.getDocs(fb.query(fb.collection(fb.db, "diario"), fb.where("autorId", "in", l), fb.limit(60))).catch(() => ({ docs: [] }))));
  return res.flatMap((s) => s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })));
}
async function buscarExplorar() {
  const s = await fb.getDocs(fb.query(fb.collection(fb.db, "diario"), fb.orderBy("criadoEm", "desc"), fb.limit(80)));
  return s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }));
}
async function carregarFeed() {
  const lista = $("listaFeed");
  lista.replaceChildren(el("div", "esqueleto-post"), el("div", "esqueleto-post"));
  $("maisFeed").hidden = true;
  try {
    const bruto = aba === "explorar" ? await buscarExplorar() : await buscarSeguindo();
    posts = bruto.filter((p) => !escondido(p.autorId)).sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
  } catch (e) {
    console.warn(e);
    lista.replaceChildren(vazio("Não foi possível carregar o feed", erroAmigavel(e)));
    return;
  }
  mostrados = 0;
  lista.replaceChildren();
  if (!posts.length) {
    lista.appendChild(aba === "explorar"
      ? vazio("Nada publicado ainda", "Seja o primeiro a compartilhar um trabalho ou novidade.", "Publicar agora", () => abrirCompositor({ aoPublicar: ganchos.aoPublicar }))
      : vazio("Seu feed está vazio", "Siga pessoas e negócios para ver as publicações deles aqui.", "Descobrir pessoas", () => trocarAba("pessoas")));
    return;
  }
  mostrarMais();
}
function mostrarMais() {
  const lista = $("listaFeed");
  posts.slice(mostrados, mostrados + POR_VEZ).forEach((p) => lista.appendChild(cartaoPost(p)));
  mostrados = Math.min(posts.length, mostrados + POR_VEZ);
  $("maisFeed").hidden = mostrados >= posts.length;
}
$("maisFeed").addEventListener("click", mostrarMais);
function vazio(titulo, texto, botao, acao) {
  const v = el("div", "feed-vazio");
  v.append(el("strong", null, titulo), el("span", null, texto));
  if (botao) { const b = el("button", "btn pri", botao); b.type = "button"; b.addEventListener("click", acao); v.append(el("br"), b); }
  return v;
}

function cartaoPost(post) {
  const c = el("article", "post-card");
  const cab = el("div", "post-cab");
  const av = el("div", "avatar"); pintarAvatar(av, post.fotoPerfil, post.nome);
  av.addEventListener("click", () => ganchos.abrirPerfil(post.autorId));
  const quem = el("div", "quem");
  const nome = el("button", null, post.nome || "Usuário"); nome.type = "button";
  nome.addEventListener("click", () => ganchos.abrirPerfil(post.autorId));
  const sub = el("small", null, tempoRelativo(paraData(post.criadoEm)));
  quem.append(nome, sub);
  const mais = el("button", "icone-btn"); mais.type = "button"; mais.setAttribute("aria-label", "Opções da publicação");
  mais.appendChild(icone("pontos", "i s"));
  mais.addEventListener("click", () => abrirOpcoes("Publicação", [
    { rotulo: "Ver perfil", icone: "olho", fn: () => ganchos.abrirPerfil(post.autorId) },
    { rotulo: "Compartilhar perfil", icone: "compartilhar", fn: () => compartilharPerfil(post.autorId, post.nome) },
    post.autorId === eu.uid && { rotulo: "Apagar publicação", icone: "lixo", perigo: true, fn: async () => {
      if (!confirm("Apagar esta publicação? Essa ação não pode ser desfeita.")) return;
      try { await fb.deleteDoc(fb.doc(fb.db, "diario", post.id)); c.remove(); posts = posts.filter((x) => x.id !== post.id); toast("Publicação apagada"); }
      catch (e) { toast("Não foi possível apagar: " + erroAmigavel(e)); }
    } }
  ]));
  cab.append(av, quem, mais);
  c.appendChild(cab);
  // Nome e foto atualizados do perfil (a publicação guarda os de quando foi feita).
  obterPerfil(post.autorId).then((p) => {
    if (p.nome) nome.textContent = p.nome;
    if (p.fotoPerfil) pintarAvatar(av, p.fotoPerfil, p.nome);
    const extra = [p.nickname ? "@" + p.nickname : "", tempoRelativo(paraData(post.criadoEm))].filter(Boolean).join(" · ");
    sub.textContent = extra;
  });
  const url = urlSegura(post.mediaUrl);
  if (post.texto) c.appendChild(el("p", "post-texto" + (url ? "" : " so-texto"), post.texto));
  if (url) {
    const m = el("div", "post-midia-f");
    if (post.mediaTipo === "video") { const v = document.createElement("video"); v.src = url; v.controls = true; v.playsInline = true; v.preload = "metadata"; m.appendChild(v); }
    else { const img = document.createElement("img"); img.src = url; img.alt = post.texto ? post.texto.slice(0, 80) : "Publicação"; img.loading = "lazy"; m.appendChild(img); }
    c.appendChild(m);
  }
  c.appendChild(barraInteracao(post));
  return c;
}

// ---------- pessoas ----------
async function carregarPessoas() {
  const corpo = $("listaPessoas");
  if (!pessoas) {
    corpo.replaceChildren(el("div", "lista-vazia", "Carregando pessoas..."));
    try {
      const snap = await fb.getDocs(fb.query(fb.collection(fb.db, "perfis_publicos"), fb.orderBy("nome"), fb.limit(500)));
      pessoas = snap.docs.map((d) => ({ uid: d.id, ...d.data() })).filter((p) => p.uid !== eu.uid);
    } catch (e) { corpo.replaceChildren(el("div", "lista-vazia", "Não foi possível buscar: " + erroAmigavel(e))); return; }
  }
  pintarPessoas();
  setTimeout(() => $("buscaPessoas").focus({ preventScroll: true }), 50);
}
function pintarPessoas() {
  const termo = $("buscaPessoas").value.trim().toLowerCase().replace(/^@/, "");
  const corpo = $("listaPessoas");
  corpo.replaceChildren();
  let lista = (pessoas || []).filter((p) => !escondido(p.uid));
  if (termo) lista = lista.filter((p) => String(p.nome || "").toLowerCase().includes(termo) || String(p.nickname || "").toLowerCase().includes(termo) || nomeCidade(p.cidade || p.cidadeNome).toLowerCase().includes(termo));
  else lista = [...lista.filter((p) => !meusSeguindo.has(p.uid)), ...lista.filter((p) => meusSeguindo.has(p.uid))];
  corpo.appendChild(el("div", "grupo-titulo", termo ? `${lista.length} ${lista.length === 1 ? "pessoa encontrada" : "pessoas encontradas"}` : "Sugestões para você"));
  if (!lista.length) { corpo.appendChild(el("div", "lista-vazia", "Ninguém encontrado.")); return; }
  lista.slice(0, 80).forEach((p) => corpo.appendChild(linhaPessoa({
    uid: p.uid, nome: p.nome, foto: p.fotoPerfil,
    sub: [p.nickname ? "@" + p.nickname : "", nomeCidade(p.cidade || p.cidadeNome)].filter(Boolean).join(" · ")
  })));
}
$("buscaPessoas").addEventListener("input", pintarPessoas);

// ---------- lateral e histórias ----------
async function pintarLateral() {
  pintarAvatar($("euAvatar"), dados.fotoPerfil, dados.nome);
  $("euNome").textContent = dados.nome || "Você";
  $("euNick").textContent = dados.nickname ? "@" + dados.nickname : "Ver meu perfil";
  pintarAvatar($("comporAvatar"), dados.fotoPerfil, dados.nome);
  // Quem eu sigo, em bolinhas
  const trilho = $("trilhoSeguindo");
  const ids = [...meusSeguindo].filter((u) => !escondido(u)).slice(0, 20);
  trilho.replaceChildren();
  const eu0 = el("a", "pessoa-bola"); eu0.href = "usuarios.html";
  const a0 = el("span", "anel"); const av0 = el("div", "avatar"); pintarAvatar(av0, dados.fotoPerfil, dados.nome); a0.appendChild(av0);
  eu0.append(a0, el("span", null, "Você"));
  trilho.appendChild(eu0);
  const perfisS = await Promise.all(ids.map(obterPerfil));
  ids.forEach((u, i) => {
    const b = el("a", "pessoa-bola"); b.href = `usuarios.html?perfil=${encodeURIComponent(u)}`;
    const anel = el("span", "anel"); const av = el("div", "avatar"); pintarAvatar(av, perfisS[i].fotoPerfil, perfisS[i].nome); anel.appendChild(av);
    b.append(anel, el("span", null, (perfisS[i].nome || "Usuário").split(" ")[0]));
    trilho.appendChild(b);
  });
  const conv = el("button", "pessoa-bola"); conv.type = "button";
  const an = el("span", "anel"); an.style.background = "var(--line)"; const avc = el("div", "avatar"); avc.appendChild(icone("pessoa-mais", "i")); an.appendChild(avc);
  conv.append(an, el("span", null, "Descobrir"));
  conv.addEventListener("click", () => trocarAba("pessoas"));
  trilho.appendChild(conv);
  // Sugestões
  try {
    if (!pessoas) {
      const snap = await fb.getDocs(fb.query(fb.collection(fb.db, "perfis_publicos"), fb.orderBy("nome"), fb.limit(500)));
      pessoas = snap.docs.map((d) => ({ uid: d.id, ...d.data() })).filter((p) => p.uid !== eu.uid);
    }
    const sug = pessoas.filter((p) => !meusSeguindo.has(p.uid) && !escondido(p.uid)).sort(() => Math.random() - 0.5).slice(0, 5);
    const box = $("sugestoes");
    box.replaceChildren();
    if (!sug.length) box.appendChild(el("div", "lista-vazia", "Você já segue todo mundo por aqui."));
    sug.forEach((p) => box.appendChild(linhaPessoa({ uid: p.uid, nome: p.nome, foto: p.fotoPerfil, sub: p.nickname ? "@" + p.nickname : nomeCidade(p.cidade) })));
  } catch {}
}

// ---------- início ----------
(async function iniciar() {
  try { await iniciarRede(); }
  catch (e) { $("listaFeed").replaceChildren(vazio("Não foi possível carregar", e.message || "")); return; }
  ganchos.aoPublicar = () => { if (aba === "pessoas") trocarAba("seguindo"); else carregarFeed(); };
  ganchos.aposSeguir = () => { if (aba === "seguindo") carregarFeed(); };
  montarBarraRede(new URLSearchParams(location.search).get("aba") === "pessoas" ? "descobrir" : "feed");
  pintarBarraRede();
  ouvirAvisos();
  $("btnComporFeed").addEventListener("click", () => abrirCompositor({ aoPublicar: ganchos.aoPublicar }));
  await carregarMeusSeguindo();
  pintarLateral();
  const p = new URLSearchParams(location.search);
  trocarAba(["explorar", "pessoas"].includes(p.get("aba")) ? p.get("aba") : "seguindo");
  if (p.get("publicar")) abrirCompositor({ aoPublicar: ganchos.aoPublicar });
})();
