// =====================================================
// Diário (feed.html)
// - Aba Diário: publicações de quem você segue (ou de todos), com
//   estrelas, comentários e compartilhar.
// - Aba Explorar: atalhos para Serviços, Delivery, Shopping e Imóveis
//   e a busca de pessoas.
// Links: feed.html?aba=explorar · ?publicar=1
// =====================================================
import { textoCidade } from "./endereco.js?v=1";
import {
  $, el, icone, ms, paraData, pintarAvatar, urlSegura, nomeCidade, tempoRelativo, toast, erroAmigavel,
  fb, eu, dados, meusSeguindo, escondido, ganchos, obterPerfil, iniciarRede, carregarMeusSeguindo, linhaPessoa,
  barraInteracao, abrirCompositor, abrirOpcoes, compartilharPerfil, montarBarraRede, pintarBarraRede, ouvirAvisos, lerOrdenado,
  editarPublicacao, bloquear, comMencoes, fotosDoPost, carrosselFotos, contadorEstrelas, estaSalvo, alternarSalvo, lerResumosEstrelas, contarComentarios,
  silenciado, alternarSilenciar, marcarVista, definirOrigem
} from "./rede.js?v=34";
import { montarStories } from "./stories.js?v=1";
import { abrirDenuncia } from "./denuncias.js?v=2";
import { buscarPessoas, pessoasRecentes } from "./pessoas.js?v=3";
import { docsComValidade } from "./leituras.js?v=1";

const POR_VEZ = 10;
// Publicação de conta desativada (conta.js): escondida até ocultoAte.
// Agendada: só aparece na hora marcada. Silenciado: some do seu Diário (você continua seguindo).
const postOculto = (p) => (p?.ocultoAte?.toMillis?.() ?? 0) > Date.now() || (p?.agendadoPara?.toMillis?.() ?? 0) > Date.now() || silenciado(p?.autorId);
// Busca por hashtag: feed.html?tag=reforma
let tagAtual = (new URLSearchParams(location.search).get("tag") || "").toLowerCase().replace(/^#/, "").slice(0, 30);
// Filtro do Diário: Principais (melhores publicações pelo engajamento de verdade), Quem eu sigo ou Amigos.
const FILTROS = { principais: "Principais", seguindo: "Quem eu sigo", amigos: "Amigos" };
let aba = "diario", filtro = "principais";
let posts = [], mostrados = 0;

// ---------- abas ----------
function trocarAba(nova) {
  aba = nova;
  document.querySelectorAll("#abasFeed [data-aba]").forEach((b) => b.setAttribute("aria-selected", b.dataset.aba === aba ? "true" : "false"));
  $("painelFeed").hidden = aba !== "diario";
  $("painelExplorar").hidden = aba !== "explorar";
  history.replaceState(history.state, "", aba === "explorar" ? "feed.html?aba=explorar" : "feed.html");
  if (aba === "explorar") carregarPessoas();
  else carregarFeed();
}
document.querySelectorAll("#abasFeed [data-aba]").forEach((b) => b.addEventListener("click", () => trocarAba(b.dataset.aba)));
function pintarFiltro() {
  $("filtroAtual").textContent = tagAtual ? "#" + tagAtual : FILTROS[filtro];
  $("filtroFeedBtn").classList.toggle("com-tag", !!tagAtual);
  definirOrigem(tagAtual ? "tag" : filtro);
}
$("filtroFeedBtn").addEventListener("click", () => abrirOpcoes("Mostrar no Diário", [
  tagAtual && { rotulo: `Sair de #${tagAtual}`, sub: "Voltar para o Diário", icone: "fechar", fn: () => { tagAtual = ""; history.replaceState(history.state, "", "feed.html"); pintarFiltro(); carregarFeed(); } },
  { rotulo: "Principais" + (filtro === "principais" ? "  ✓" : ""), sub: "As melhores publicações agora, pelo engajamento", icone: "estrela", fn: () => mudarFiltro("principais") },
  { rotulo: "Quem eu sigo" + (filtro === "seguindo" ? "  ✓" : ""), sub: "Publicações de quem você segue, das mais novas", icone: "pessoa-mais", fn: () => mudarFiltro("seguindo") },
  { rotulo: "Amigos" + (filtro === "amigos" ? "  ✓" : ""), sub: "Seus vínculos do Social e quem vocês se seguem", icone: "coracao", fn: () => mudarFiltro("amigos") }
]));
function mudarFiltro(f) { filtro = f; tagAtual = ""; if (location.search.includes("tag=")) history.replaceState(history.state, "", "feed.html"); try { localStorage.setItem("hf-filtro-diario", f); } catch {} pintarFiltro(); carregarFeed(); }
try { const f = localStorage.getItem("hf-filtro-diario"); if (FILTROS[f]) filtro = f; } catch {}
pintarFiltro();

// ---------- publicações ----------
async function buscarSeguindo(lista = null, chave = "seguindo") {
  const autores = (lista || [eu.uid, ...meusSeguindo]).filter((u) => !escondido(u));
  const lotes = [];
  for (let i = 0; i < autores.length; i += 30) lotes.push(autores.slice(i, i + 30));
  // As mais recentes de cada lote de autores (índice diario: autorId + criadoEm).
  const col = fb.collection(fb.db, "diario");
  const res = await Promise.all(lotes.map((l, k) => docsComValidade(fb, `diario-${chave}-${eu.uid}-${k}`,
    fb.query(col, fb.where("autorId", "in", l), fb.orderBy("criadoEm", "desc"), fb.limit(30)), DIARIO_VALIDADE).catch(() => lerOrdenado(
    fb.query(col, fb.where("autorId", "in", l), fb.orderBy("criadoEm", "desc"), fb.limit(30)),
    fb.query(col, fb.where("autorId", "in", l), fb.limit(30))
  )).catch(() => ({ docs: [] }))));
  return res.flatMap((s) => s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })));
}
// Amigos: vínculos aceitos do Social + quem vocês se seguem (você segue e a pessoa segue você).
async function buscarAmigos() {
  const [vin, seg] = await Promise.all([
    fb.getDocs(fb.query(fb.collection(fb.db, "vinculos"), fb.where("participantes", "array-contains", eu.uid), fb.limit(100))).catch(() => ({ docs: [] })),
    docsComValidade(fb, "seguidores-" + eu.uid, fb.query(fb.collection(fb.db, "relacoes"), fb.where("tipo", "==", "seguir"), fb.where("alvoId", "==", eu.uid), fb.limit(500)), 15 * 60000).catch(() => ({ docs: [] }))
  ]);
  const amigos = new Set(vin.docs.map((d) => d.data()).filter((v) => v.status === "aceito").map((v) => (v.participantes || []).find((u) => u !== eu.uid)).filter(Boolean));
  seg.docs.forEach((d) => { const u = d.data().seguidorId; if (meusSeguindo.has(u)) amigos.add(u); });
  if (!amigos.size) return [];
  return buscarSeguindo([...amigos].slice(0, 300), "amigos");
}
// Principais: as publicações recentes ordenadas pelo engajamento de verdade (estrelas, média e comentários),
// com a idade pesando contra (como as redes fazem) e um empurrão para quem você segue.
async function buscarPrincipais() {
  const q = fb.query(fb.collection(fb.db, "diario"), fb.orderBy("criadoEm", "desc"), fb.limit(120));
  const s = await docsComValidade(fb, "diario-principais", q, DIARIO_VALIDADE);
  const lista = s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })).filter((p) => !escondido(p.autorId) && !postOculto(p));
  const resumos = await lerResumosEstrelas(lista.map((p) => p.id));
  const agora = Date.now();
  const pre = (p) => { const r = resumos.get(p.id) || { total: 0, soma: 0 }; return r.total + Math.max(0, r.soma - 3 * r.total) * 0.4 + (meusSeguindo.has(p.autorId) ? 2 : 0); };
  // Comentários: conta só para os 40 mais promissores (contagem guardada no aparelho por alguns minutos).
  const ordem1 = lista.slice().sort((a, b) => pre(b) - pre(a)).slice(0, 40);
  const com = new Map(await Promise.all(ordem1.map(async (p) => [p.id, await contarComentarios(p.id).catch(() => 0)])));
  const pontos = (p) => {
    const horas = Math.max(0, (agora - (ms(p.criadoEm) || agora)) / 3600e3);
    return (1 + pre(p) + 2 * (com.get(p.id) || 0)) / Math.pow(horas + 2, 1.35);
  };
  return lista.map((p) => ({ ...p, _pontos: pontos(p) })).sort((a, b) => b._pontos - a._pontos);
}
// Hashtag: publicações com a tag (as mais novas primeiro).
async function buscarTag(tag) {
  const s = await fb.getDocs(fb.query(fb.collection(fb.db, "diario"), fb.where("tags", "array-contains", tag), fb.limit(80)));
  return s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }));
}
// O começo do diário vale por 3 min no aparelho (o que você publica aparece na hora).
const DIARIO_VALIDADE = 3 * 60000;
// "Todos": 20 por vez; "Ver mais" busca as 20 seguintes só quando a pessoa chega ao fim.
const LOTE_TODOS = 20;
let cursorTodos = null, maisTodos = false;
async function buscarTodos(continuar = false) {
  if (!continuar) cursorTodos = null;
  const q = fb.query(fb.collection(fb.db, "diario"), fb.orderBy("criadoEm", "desc"), ...(cursorTodos ? [fb.startAfter(cursorTodos)] : []), fb.limit(LOTE_TODOS));
  const s = cursorTodos ? await fb.getDocs(q) : await docsComValidade(fb, "diario-todos", q, DIARIO_VALIDADE);
  cursorTodos = s.docs.at(-1) || cursorTodos; maisTodos = s.size === LOTE_TODOS;
  return s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }));
}
async function carregarFeed() {
  const lista = $("listaFeed");
  lista.replaceChildren(el("div", "esqueleto-post"), el("div", "esqueleto-post"));
  $("maisFeed").hidden = true;
  try {
    maisTodos = false;
    const bruto = tagAtual ? await buscarTag(tagAtual) : filtro === "principais" ? await buscarPrincipais() : filtro === "amigos" ? await buscarAmigos() : await buscarSeguindo();
    posts = bruto.filter((p) => !escondido(p.autorId) && !postOculto(p));
    if (tagAtual || filtro !== "principais") posts.sort((a, b) => ms(b.agendadoPara || b.criadoEm) - ms(a.agendadoPara || a.criadoEm)); // principais: pela pontuação
  } catch (e) {
    console.warn(e);
    lista.replaceChildren(vazio("Não foi possível carregar o diário", erroAmigavel(e)));
    return;
  }
  mostrados = 0;
  lista.replaceChildren();
  if (!posts.length) {
    lista.appendChild(tagAtual ? vazio(`Nada com #${tagAtual} ainda`, "Use a hashtag na sua publicação para começar.", "Publicar agora", () => abrirCompositor({ aoPublicar: ganchos.aoPublicar })) : filtro === "principais"
      ? vazio("Nada publicado ainda", "Seja o primeiro a compartilhar um trabalho ou uma novidade.", "Publicar agora", () => abrirCompositor({ aoPublicar: ganchos.aoPublicar }))
      : filtro === "amigos"
        ? vazio("Seus amigos ainda não publicaram", "Amigos são seus vínculos do Social e quem vocês se seguem.", "Ver as principais", () => mudarFiltro("principais"))
        : vazio("Seu diário está vazio", "Siga pessoas e negócios para ver as publicações deles aqui.", "Ver as principais", () => mudarFiltro("principais")));
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
let buscandoMais = false;
$("maisFeed").addEventListener("click", async () => {
  if (mostrados < posts.length || filtro !== "todos" || !maisTodos) { mostrarMais(); return; } // (filtro "todos" saiu; o resto fica para o caso de voltar)
  if (buscandoMais) return;
  buscandoMais = true; $("maisFeed").disabled = true;
  try {
    const ja = new Set(posts.map((p) => p.id));
    const novos = (await buscarTodos(true)).filter((p) => !ja.has(p.id) && !escondido(p.autorId) && !postOculto(p));
    posts.push(...novos.sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm)));
    mostrarMais();
  } catch (e) { console.warn(e); toast("Não foi possível carregar mais."); }
  finally { buscandoMais = false; $("maisFeed").disabled = false; }
});
function vazio(titulo, texto, botao, acao) {
  const v = el("div", "feed-vazio");
  v.append(el("strong", null, titulo), el("span", null, texto));
  if (botao) { const b = el("button", "btn pri", botao); b.type = "button"; b.addEventListener("click", acao); v.append(el("br"), b); }
  return v;
}

// Alcance: conta como vista quando a publicação fica pelo menos metade na tela por 1 segundo.
const vigiaVista = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => {
  const c = e.target;
  if (e.isIntersecting) c._tVista = setTimeout(() => { marcarVista(c._post); vigiaVista.unobserve(c); }, 1000);
  else clearTimeout(c._tVista);
}), { threshold: 0.5 }) : null;
// Vídeo curto: toca sozinho, sem som e em repetição, quando aparece; tocar liga o som.
const vigiaVideo = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => {
  const v = e.target;
  if (e.isIntersecting && e.intersectionRatio >= 0.6) v.play().catch(() => {}); else v.pause();
}), { threshold: [0, 0.6] }) : null;
function cartaoPost(post) {
  const c = el("article", "post-card");
  c.dataset.autor = post.autorId; c._post = post;
  vigiaVista?.observe(c);
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
    estaSalvo(post.id)
      ? { rotulo: "Remover dos salvos", icone: "salvo", fn: () => alternarSalvo(post) }
      : { rotulo: "Salvar publicação", sub: "Para ver depois no seu Perfil → Salvos", icone: "salvo", fn: () => alternarSalvo(post) },
    { rotulo: "Compartilhar perfil", icone: "compartilhar", fn: () => compartilharPerfil(post.autorId, post.nome) },
    post.autorId === eu.uid && { rotulo: "Estatísticas", sub: "Alcance, estrelas, salvos e de onde vieram", icone: "estrela", fn: () => import("./estatisticas-post.js?v=1").then((m) => m.abrirEstatisticas(post)) },
    post.autorId === eu.uid && { rotulo: "Editar publicação", icone: "lapis", fn: () => editarPublicacao(post, () => c.replaceWith(cartaoPost(post))) },
    post.autorId !== eu.uid && { rotulo: silenciado(post.autorId) ? `Mostrar ${nome.textContent} de novo` : `Silenciar ${nome.textContent}`, sub: "Continua seguindo, mas as publicações e stories somem do seu Diário", icone: "restringir",
      fn: async () => { await alternarSilenciar(post.autorId, nome.textContent); if (silenciado(post.autorId)) { posts = posts.filter((x) => x.autorId !== post.autorId); document.querySelectorAll(".post-card").forEach((x) => { if (x.dataset.autor === post.autorId) x.remove(); }); } } },
    post.autorId !== eu.uid && { rotulo: "Denunciar publicação", sub: "Golpe, ofensa, conteúdo impróprio...", icone: "alerta", perigo: true,
      fn: () => abrirDenuncia({ fb, eu, tipo: "publicacao", alvoId: post.autorId, itemId: post.id, trecho: post.texto || "", nomeAlvo: nome.textContent,
        aoBloquear: async () => { if (await bloquear(post.autorId, nome.textContent)) { posts = posts.filter((x) => x.autorId !== post.autorId); carregarFeed(); } } }) },
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
    sub.textContent = [p.nickname ? "@" + p.nickname : "", tempoRelativo(paraData(post.criadoEm)), post.editadoEm ? "editada" : ""].filter(Boolean).join(" · ");
  });
  const url = urlSegura(post.mediaUrl);
  // Pessoas marcadas: "com Ana e Bruno".
  if (Array.isArray(post.marcados) && post.marcados.length) {
    const linhaM = el("div", "post-com");
    linhaM.append(icone("pessoa-mais", "i xs"), document.createTextNode("com "));
    post.marcados.slice(0, 10).forEach((u, i) => {
      const b = el("button", null, "..."); b.type = "button"; b.addEventListener("click", () => ganchos.abrirPerfil(u));
      obterPerfil(u).then((p) => { b.textContent = String(p.nome || "Usuário").split(" ")[0]; }).catch(() => { b.textContent = "Usuário"; });
      if (i) linhaM.appendChild(document.createTextNode(i === post.marcados.length - 1 ? " e " : ", "));
      linhaM.appendChild(b);
    });
    c.appendChild(linhaM);
  }
  if (post.texto) {
    const t = comMencoes(el("p", "post-texto" + (url ? "" : " so-texto")), post.texto);
    c.appendChild(t);
    // Texto longo: mostra o começo e "ver mais".
    if (post.texto.length > 220) {
      t.classList.add("curto");
      const vm = el("button", "ver-mais", "ver mais"); vm.type = "button";
      vm.addEventListener("click", () => { t.classList.remove("curto"); vm.remove(); });
      c.appendChild(vm);
    }
  }
  const barra = barraInteracao(post);
  const fotos = fotosDoPost(post);
  if (fotos.length && post.mediaTipo !== "video") {
    // A foto aparece no recorte escolhido ao publicar (4:5, 1:1 ou 16:9), sem cortar de novo. Fotos antigas
    // fora dessas medidas ficam entre 4:5 e 1,91:1. Toque duplo: contagem de estrelas.
    const m = el("div", "post-midia-f" + (fotos.length > 1 ? " varias" : ""));
    const car = carrosselFotos(fotos, { alt: post.texto ? post.texto.slice(0, 80) : "Publicação", aoToqueDuplo: () => toqueDuplo(m, barra) });
    const img = car.querySelector("img"); img.loading = "lazy";
    img.addEventListener("load", () => { const p = img.naturalWidth / Math.max(1, img.naturalHeight); m.style.setProperty("--prop", String(Math.min(1.91, Math.max(0.8, p)))); m.classList.toggle("alta", p < 0.8); }, { once: true });
    m.appendChild(car);
    m.title = "Toque duas vezes para dar estrelas";
    c.appendChild(m);
  } else if (url) {
    const m = el("div", "post-midia-f");
    const v = document.createElement("video"); v.src = url; v.muted = true; v.loop = true; v.playsInline = true; v.preload = "metadata";
    const som = el("button", "video-som"); som.type = "button"; som.setAttribute("aria-label", "Ligar o som"); som.textContent = "🔇";
    som.addEventListener("click", (e) => { e.stopPropagation(); v.muted = !v.muted; som.textContent = v.muted ? "🔇" : "🔊"; som.setAttribute("aria-label", v.muted ? "Ligar o som" : "Desligar o som"); if (v.paused) v.play().catch(() => {}); });
    v.addEventListener("click", () => (v.paused ? v.play() : v.pause()));
    m.classList.add("video"); m.append(v, som); vigiaVideo?.observe(v);
    c.appendChild(m);
  }
  c.appendChild(barra);
  return c;
}
// Toque duplo na foto: a contagem de estrelas (vale também na própria publicação).
async function toqueDuplo(m, barra) {
  if (!barra.estrelas?.darNota) return;
  const n = await contadorEstrelas(m, (nota) => barra.estrelas.darNota(nota));
  if (n) toast(`Você deu ${n} ${n === 1 ? "estrela" : "estrelas"}`);
}

// ---------- explorar: pessoas ----------
// Busca no Firebase só quem combina com o que foi digitado (pessoas.js); sem busca, quem esteve ativo por último.
let tempoBusca = null;
async function carregarPessoas() {
  const corpo = $("listaPessoas");
  const termo = $("buscaPessoas").value.trim();
  // #hashtag na busca: leva às publicações com a tag.
  if (/^#[\p{L}\p{N}_]{1,30}$/u.test(termo)) {
    const tag = termo.slice(1).toLowerCase();
    const n = await fb.getCountFromServer(fb.query(fb.collection(fb.db, "diario"), fb.where("tags", "array-contains", tag))).then((x) => x.data().count).catch(() => null);
    if ($("buscaPessoas").value.trim() !== termo) return;
    const b = el("a", "linha-tag"); b.href = `feed.html?tag=${encodeURIComponent(tag)}`;
    b.append(el("span", "ic-tag", "#"), el("strong", null, "#" + tag), el("small", null, n == null ? "Ver publicações" : `${n} ${n === 1 ? "publicação" : "publicações"}`));
    corpo.replaceChildren(el("div", "grupo-titulo", "Hashtag"), b);
    return;
  }
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
  // Sugestões só aparecem na lateral do computador: no celular nem busca.
  if (!$("sugestoes")?.offsetParent) return;
  try {
    const recentes = await pessoasRecentes(fb, { limite: 30 });
    const sug = recentes.filter((p) => p.uid !== eu.uid && !meusSeguindo.has(p.uid) && !escondido(p.uid)).sort(() => Math.random() - 0.5).slice(0, 4);
    const box = $("sugestoes");
    box.replaceChildren();
    if (!sug.length) box.appendChild(el("div", "lista-vazia", "Você já segue todo mundo por aqui."));
    sug.forEach((p) => box.appendChild(linhaPessoa({ uid: p.uid, nome: p.nome, foto: p.fotoPerfil, sub: p.nickname ? "@" + p.nickname : textoCidade({ cidade: nomeCidade(p.cidade), uf: p.uf }) })));
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
  pintarFiltro();
  montarStories($("storiesFeed")).catch((e) => console.warn("Stories:", e));
  pintarLateral();
  const p = new URLSearchParams(location.search);
  trocarAba(p.get("aba") === "explorar" || p.get("aba") === "pessoas" ? "explorar" : "diario");
  if (p.get("publicar")) abrirCompositor({ aoPublicar: ganchos.aoPublicar });
})();
