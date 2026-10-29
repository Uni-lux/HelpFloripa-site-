// =====================================================
// Reels: vídeos curtos do Diário em tela cheia, deslizando para cima (como no Instagram).
// - Abre pelo ícone de vídeo do filtro do Diário (feed.js) e pelo link feed.html?reels=1.
// - Fonte: os vídeos já lidos no Diário + os mais recentes do servidor (diario.mediaTipo == "video").
// - Cada vídeo: toca sozinho quando aparece (sem som até a pessoa ligar), toque = pausa, toque duplo = 5 estrelas,
//   estrelas, comentar, salvar, republicar, compartilhar e enviar (as mesmas do Diário), autor com Seguir e legenda.
// - Publicação de vídeo precisa do Storage (firebase.js USAR_STORAGE): sem ele não existem vídeos novos.
// =====================================================
import {
  el, icone, ms, pintarAvatar, obterPerfil, barraInteracao, botaoSeguir, comMencoes, marcarVista, definirOrigem, origemAtual, pessoasEmPilha,
  contadorEstrelas, ganchos, eu, fb, toast, urlSegura, escondido, tempoRelativo, paraData, meusSeguindo, storageFns
} from "./rede.js?v=84";

let aberto = null;
let somLigado = false;
const ehVideo = (p) => p?.mediaTipo === "video" && !!urlSegura(p.mediaUrl);

async function videosRecentes(oculto) {
  const col = fb.collection(fb.db, "diario");
  let s;
  try { s = await fb.getDocs(fb.query(col, fb.where("mediaTipo", "==", "video"), fb.orderBy("criadoEm", "desc"), fb.limit(30))); }
  catch { s = await fb.getDocs(fb.query(col, fb.where("mediaTipo", "==", "video"), fb.limit(60))).catch(() => ({ docs: [] })); }
  return s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })).filter((p) => ehVideo(p) && !escondido(p.autorId) && !oculto(p));
}

// lista = publicações já lidas no Diário; oculto(p) = a mesma regra do Diário (silenciado, agendada, fora do público...).
export async function abrirReels({ lista = [], oculto = () => false, comecarEm = null, aoNovo = null } = {}) {
  if (aberto) return;
  const caixa = el("div", "reels"); caixa.setAttribute("role", "dialog"); caixa.setAttribute("aria-label", "Reels");
  const topo = el("div", "reels-topo");
  const voltar = el("button", "reels-btn"); voltar.type = "button"; voltar.setAttribute("aria-label", "Voltar ao Diário"); voltar.appendChild(icone("voltar", "i"));
  const tit = el("strong", "reels-tit"); tit.append(icone("reels", "i"), document.createTextNode("Reels"));
  const som = el("button", "reels-btn"); som.type = "button";
  const pintarSom = () => { som.replaceChildren(icone(somLigado ? "som" : "mudo", "i")); som.setAttribute("aria-label", somLigado ? "Desligar o som" : "Ligar o som"); };
  pintarSom();
  topo.append(voltar, tit, som);
  const trilho = el("div", "reels-lista");
  caixa.append(topo, trilho);
  document.body.appendChild(caixa);
  document.body.classList.add("travado");
  const origemAntes = origemAtual;
  definirOrigem("principais");
  history.pushState({ ...(history.state || {}), hfReels: true, hfBase: false, hfGuarda: false }, "", location.href);
  const fechar = (doHistorico = false) => {
    if (!aberto) return;
    aberto.io?.disconnect();
    caixa.querySelectorAll("video").forEach((v) => v.pause());
    caixa.remove();
    if (!document.querySelector(".visor-exp, .story-visor")) document.body.classList.remove("travado");
    definirOrigem(origemAntes);
    removeEventListener("popstate", aoVoltar); document.removeEventListener("keydown", tecla);
    aberto = null;
    if (!doHistorico && history.state?.hfReels) history.back();
  };
  const aoVoltar = () => { if (!history.state?.hfReels) fechar(true); };
  const tecla = (e) => { if (e.key === "Escape" && !document.querySelector(".folha.aberta")) fechar(); };
  addEventListener("popstate", aoVoltar); document.addEventListener("keydown", tecla);
  voltar.addEventListener("click", () => fechar());
  som.addEventListener("click", () => { somLigado = !somLigado; pintarSom(); trilho.querySelectorAll("video").forEach((v) => { v.muted = !somLigado; }); });
  aberto = { el: caixa, fechar };

  trilho.appendChild(el("div", "reels-carregando", "Carregando vídeos..."));
  const ja = new Map(lista.filter((p) => ehVideo(p) && !oculto(p)).map((p) => [p.id, p]));
  (await videosRecentes(oculto).catch(() => [])).forEach((p) => { if (!ja.has(p.id)) ja.set(p.id, p); });
  if (!aberto) return;
  // Os que você ainda não viu e os mais novos primeiro; o pedido (comecarEm) no topo.
  const videos = [...ja.values()].sort((a, b) => ms(b.agendadoPara || b.criadoEm) - ms(a.agendadoPara || a.criadoEm));
  if (comecarEm) { const k = videos.findIndex((p) => p.id === comecarEm); if (k > 0) videos.unshift(videos.splice(k, 1)[0]); }
  trilho.replaceChildren();
  if (!videos.length) {
    const v = el("div", "reels-vazio");
    v.append(icone("reels", "i"), el("strong", null, "Nenhum vídeo por aqui ainda"), el("span", null, "Os vídeos curtos publicados no Diário aparecem aqui, em tela cheia."));
    if (storageFns && aoNovo) { const b = el("button", "btn pri", "Publicar um vídeo"); b.type = "button"; b.addEventListener("click", () => { fechar(); aoNovo(); }); v.appendChild(b); }
    trilho.appendChild(v);
    return;
  }
  videos.forEach((p) => trilho.appendChild(reel(p)));
  // Toca o que está na tela (70%) e pausa os outros; 1 s na tela conta como vista.
  aberto.io = new IntersectionObserver((es) => es.forEach((e) => {
    const r = e.target, v = r.querySelector("video");
    if (e.isIntersecting && e.intersectionRatio >= 0.7) {
      v.muted = !somLigado; v.preload = "auto";
      v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
      r._t = setTimeout(() => marcarVista(r._post), 1000);
      const prox = r.nextElementSibling?.querySelector("video"); if (prox) prox.preload = "auto";
    } else { v.pause(); clearTimeout(r._t); }
  }), { root: trilho, threshold: [0, 0.7] });
  trilho.querySelectorAll(".reel").forEach((r) => aberto.io.observe(r));
}

function reel(post) {
  const r = el("section", "reel"); r._post = post;
  const v = document.createElement("video");
  v.src = urlSegura(post.mediaUrl); v.loop = true; v.playsInline = true; v.muted = true; v.preload = "metadata";
  v.setAttribute("aria-label", post.texto ? post.texto.slice(0, 80) : "Vídeo");
  const pausa = el("span", "reel-pausa"); pausa.appendChild(icone("play", "i"));
  const sombra = el("div", "reel-sombra");
  r.append(v, sombra, pausa);
  const barra = barraInteracao(post);
  // Toque = pausa/continua; toque duplo = 5 estrelas (como no Diário).
  let ult = 0, tSimples = null;
  v.addEventListener("click", () => {
    const agora = Date.now();
    if (agora - ult < 300) { clearTimeout(tSimples); ult = 0; if (barra.estrelas?.darNota) contadorEstrelas(r, (n) => barra.estrelas.darNota(n)); return; }
    ult = agora;
    tSimples = setTimeout(() => { if (v.paused) { v.play().catch(() => {}); r.classList.remove("parado"); } else { v.pause(); r.classList.add("parado"); } }, 300);
  });
  // Autor, legenda e as estrelas embaixo; as ações numa coluna à direita.
  const info = el("div", "reel-info");
  const quem = el("div", "reel-quem");
  const av = el("button", "avatar"); av.type = "button"; av.setAttribute("aria-label", "Ver perfil");
  pintarAvatar(av, post.fotoPerfil, post.nome);
  const nome = el("button", "reel-nome", post.nome || "Usuário"); nome.type = "button";
  const verPerfil = () => ganchos.abrirPerfil(post.autorId);
  av.addEventListener("click", verPerfil); nome.addEventListener("click", verPerfil);
  quem.append(av, nome);
  if (post.autorId !== eu.uid && !meusSeguindo.has(post.autorId)) quem.appendChild(botaoSeguir(post.autorId));
  obterPerfil(post.autorId).then((pp) => { if (pp.nome) nome.textContent = pp.nome; if (pp.fotoPerfil) pintarAvatar(av, pp.fotoPerfil, pp.nome); }).catch(() => {});
  info.appendChild(quem);
  // Legenda em 2 linhas com "mais" (como no Instagram): tocar abre tudo, com as #hashtags e @menções como links.
  if (post.texto) {
    const t = comMencoes(el("p", "reel-legenda"), post.texto);
    const mais = el("button", "reel-mais", "mais"); mais.type = "button"; mais.hidden = true;
    const alternar = (e) => { if (e?.target?.closest?.("a")) return; const ab = t.classList.toggle("aberta"); r.classList.toggle("lendo", ab); mais.textContent = ab ? "menos" : "mais"; };
    t.addEventListener("click", alternar); mais.addEventListener("click", (e) => { e.stopPropagation(); alternar(); });
    requestAnimationFrame(() => { mais.hidden = t.scrollHeight <= t.clientHeight + 2; });
    info.append(t, mais);
  }
  // Pessoas marcadas: fotinhas empilhadas (até 3 e +N).
  if (Array.isArray(post.marcados) && post.marcados.length) info.appendChild(pessoasEmPilha(post.marcados, { classe: "reel-marcados escuro", aoAbrir: () => v.pause(), aoFechar: () => { if (!r.classList.contains("parado") && aberto) v.play().catch(() => {}); } }));
  const meta = el("div", "reel-meta");
  if (post.local?.nome) { const l = el("span", "reel-local"); l.append(icone("pin", "i xs"), document.createTextNode(post.local.nome)); meta.appendChild(l); }
  meta.appendChild(el("span", null, tempoRelativo(paraData(post.criadoEm))));
  info.appendChild(meta);
  // Barra de progresso do vídeo (fina, embaixo).
  const prog = el("div", "reel-prog"); const enche = el("i"); prog.appendChild(enche);
  v.addEventListener("timeupdate", () => { if (v.duration) enche.style.width = (v.currentTime / v.duration) * 100 + "%"; });
  r.appendChild(prog);
  const topoEst = barra.querySelector(".int-topo"); if (topoEst) info.appendChild(topoEst);
  barra.classList.add("reel-lado");
  r.append(info, barra);
  return r;
}
