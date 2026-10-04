// =====================================================
// Diário (feed.html)
// - Aba Diário: publicações de quem você segue (ou de todos), com
//   estrelas, comentários e compartilhar.
// - Aba Explorar: atalhos para Serviços, Delivery, Shopping e Imóveis
//   e a busca de pessoas.
// Links: feed.html?aba=explorar · ?publicar=1
// =====================================================
import {
  $, el, icone, ms, paraData, pintarAvatar, urlSegura, nomeCidade, tempoRelativo, toast, erroAmigavel,
  fb, eu, dados, meusSeguindo, escondido, ganchos, obterPerfil, iniciarRede, carregarMeusSeguindo, linhaPessoa,
  barraInteracao, abrirCompositor, abrirOpcoes, compartilharPerfil, montarBarraRede, pintarBarraRede, ouvirAvisos, lerOrdenado
} from "./rede.js?v=13";
import { buscarPessoas, pessoasRecentes } from "./pessoas.js?v=1";

const POR_VEZ = 10;
let aba = "diario", filtro = "seguindo";
let posts = [], mostrados = 0;

// ---------- abas ----------
function trocarAba(nova) {
  aba = nova;
  document.querySelectorAll("#abasFeed [data-aba]").forEach((b) => b.setAttribute("aria-selected", b.dataset.aba === aba ? "true" : "false"));
  $("painelFeed").hidden = aba !== "diario";
  $("painelExplorar").hidden = aba !== "explorar";
  history.replaceState(null, "", aba === "explorar" ? "feed.html?aba=explorar" : "feed.html");
  if (aba === "explorar") carregarPessoas();
  else carregarFeed();
}
document.querySelectorAll("#abasFeed [data-aba]").forEach((b) => b.addEventListener("click", () => trocarAba(b.dataset.aba)));
document.querySelectorAll("#filtroFeed [data-filtro]").forEach((b) => b.addEventListener("click", () => {
  filtro = b.dataset.filtro;
  document.querySelectorAll("#filtroFeed [data-filtro]").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
  carregarFeed();
}));

// ---------- publicações ----------
async function buscarSeguindo() {
  const autores = [eu.uid, ...meusSeguindo].filter((u) => !escondido(u));
  const lotes = [];
  for (let i = 0; i < autores.length; i += 30) lotes.push(autores.slice(i, i + 30));
  // As mais recentes de cada lote de autores (índice diario: autorId + criadoEm).
  const col = fb.collection(fb.db, "diario");
  const res = await Promise.all(lotes.map((l) => lerOrdenado(
    fb.query(col, fb.where("autorId", "in", l), fb.orderBy("criadoEm", "desc"), fb.limit(60)),
    fb.query(col, fb.where("autorId", "in", l), fb.limit(60))
  ).catch(() => ({ docs: [] }))));
  return res.flatMap((s) => s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })));
}
async function buscarTodos() {
  const s = await fb.getDocs(fb.query(fb.collection(fb.db, "diario"), fb.orderBy("criadoEm", "desc"), fb.limit(80)));
  return s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }));
}
async function carregarFeed() {
  const lista = $("listaFeed");
  lista.replaceChildren(el("div", "esqueleto-post"), el("div", "esqueleto-post"));
  $("maisFeed").hidden = true;
  try {
    const bruto = filtro === "todos" ? await buscarTodos() : await buscarSeguindo();
    posts = bruto.filter((p) => !escondido(p.autorId)).sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
  } catch (e) {
    console.warn(e);
    lista.replaceChildren(vazio("Não foi possível carregar o diário", erroAmigavel(e)));
    return;
  }
  mostrados = 0;
  lista.replaceChildren();
  if (!posts.length) {
    lista.appendChild(filtro === "todos"
      ? vazio("Nada publicado ainda", "Seja o primeiro a compartilhar um trabalho ou uma novidade.", "Publicar agora", () => abrirCompositor({ aoPublicar: ganchos.aoPublicar }))
      : vazio("Seu diário está vazio", "Siga pessoas e negócios para ver as publicações deles aqui, ou veja as de todo o Help Floripa.", "Ver publicações de todos", () => document.querySelector('#filtroFeed [data-filtro="todos"]').click()));
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
    sub.textContent = [p.nickname ? "@" + p.nickname : "", tempoRelativo(paraData(post.criadoEm))].filter(Boolean).join(" · ");
  });
  const url = urlSegura(post.mediaUrl);
  if (post.texto) {
    const t = el("p", "post-texto" + (url ? "" : " so-texto"), post.texto);
    c.appendChild(t);
    // Texto longo: mostra o começo e "ver mais".
    if (post.texto.length > 220) {
      t.classList.add("curto");
      const vm = el("button", "ver-mais", "ver mais"); vm.type = "button";
      vm.addEventListener("click", () => { t.classList.remove("curto"); vm.remove(); });
      c.appendChild(vm);
    }
  }
  if (url) {
    const m = el("div", "post-midia-f");
    if (post.mediaTipo === "video") { const v = document.createElement("video"); v.src = url; v.controls = true; v.playsInline = true; v.preload = "metadata"; m.appendChild(v); }
    else {
      const img = document.createElement("img"); img.src = url; img.alt = post.texto ? post.texto.slice(0, 80) : "Publicação"; img.loading = "lazy";
      m.appendChild(img);
      m.title = "Toque para ver inteira";
      m.addEventListener("click", () => m.classList.toggle("inteira"));
    }
    c.appendChild(m);
  }
  c.appendChild(barraInteracao(post));
  return c;
}

// ---------- explorar: pessoas ----------
// Busca no Firebase só quem combina com o que foi digitado (pessoas.js); sem busca, quem esteve ativo por último.
let tempoBusca = null;
async function carregarPessoas() {
  const corpo = $("listaPessoas");
  const termo = $("buscaPessoas").value.trim();
  if (!corpo.children.length) corpo.replaceChildren(el("div", "lista-vazia", "Carregando pessoas..."));
  const achados = await buscarPessoas(fb, termo, { limite: termo ? 30 : 40 });
  if ($("buscaPessoas").value.trim() !== termo) return;
  let lista = achados.filter((p) => p.uid !== eu.uid && !escondido(p.uid));
  if (!termo) lista = [...lista.filter((p) => !meusSeguindo.has(p.uid)), ...lista.filter((p) => meusSeguindo.has(p.uid))];
  corpo.replaceChildren(el("div", "grupo-titulo", termo ? `${lista.length} ${lista.length === 1 ? "pessoa encontrada" : "pessoas encontradas"}` : "Ativos recentemente"));
  if (!lista.length) { corpo.appendChild(el("div", "lista-vazia", "Ninguém encontrado. Tente o @usuário ou outra parte do nome.")); return; }
  lista.slice(0, termo ? 60 : 20).forEach((p) => corpo.appendChild(linhaPessoa({
    uid: p.uid, nome: p.nome, foto: p.fotoPerfil,
    sub: [p.nickname ? "@" + p.nickname : "", nomeCidade(p.cidade || p.cidadeNome)].filter(Boolean).join(" · ")
  })));
}
$("buscaPessoas").addEventListener("input", () => { clearTimeout(tempoBusca); tempoBusca = setTimeout(carregarPessoas, 300); });

// ---------- lateral (computador) ----------
async function pintarLateral() {
  pintarAvatar($("euAvatar"), dados.fotoPerfil, dados.nome);
  $("euNome").textContent = dados.nome || "Você";
  $("euNick").textContent = dados.nickname ? "@" + dados.nickname : "Ver meu perfil";
  pintarAvatar($("comporAvatar"), dados.fotoPerfil, dados.nome);
  try {
    const recentes = await pessoasRecentes(fb, { limite: 30 });
    const sug = recentes.filter((p) => p.uid !== eu.uid && !meusSeguindo.has(p.uid) && !escondido(p.uid)).sort(() => Math.random() - 0.5).slice(0, 4);
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
  ganchos.aoPublicar = () => { if (aba !== "diario") trocarAba("diario"); else carregarFeed(); };
  ganchos.aposSeguir = () => { if (aba === "diario" && filtro === "seguindo") carregarFeed(); };
  montarBarraRede("diario");
  pintarBarraRede();
  ouvirAvisos();
  $("btnComporFeed").addEventListener("click", () => abrirCompositor({ aoPublicar: ganchos.aoPublicar }));
  await carregarMeusSeguindo();
  // Sem ninguém para seguir ainda: começa mostrando as publicações de todos.
  if (!meusSeguindo.size) document.querySelectorAll("#filtroFeed [data-filtro]").forEach((x) => { const t = x.dataset.filtro === "todos"; x.setAttribute("aria-pressed", t ? "true" : "false"); if (t) filtro = "todos"; });
  pintarLateral();
  const p = new URLSearchParams(location.search);
  trocarAba(p.get("aba") === "explorar" || p.get("aba") === "pessoas" ? "explorar" : "diario");
  if (p.get("publicar")) abrirCompositor({ aoPublicar: ganchos.aoPublicar });
})();
