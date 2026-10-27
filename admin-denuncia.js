// =====================================================
// Painel da equipe: conteúdo denunciado como apareceu no site.
// - mensagem: a mensagem denunciada (texto, foto, vídeo, áudio, cartão de pedido ou de
//   avaliação, citação) e as mensagens em volta (denuncias.contexto: ids guardados por quem
//   denunciou). Cada mensagem é lida do servidor, uma por vez (as regras deixam a moderação
//   abrir uma mensagem por vez, sem listar a conversa): a equipe vê o que foi dito de verdade.
// - publicação, comentário, perfil e negócio: o conteúdo completo, com foto.
// =====================================================
import { C, D, h, toast, dataHora, abrirFicha, TIPOS_NEG } from "./admin-base.js?v=23";
import { criarPlayerAudio } from "./audio-ondas.js?v=1";

const TITULOS = { perfil: "Perfil denunciado", publicacao: "Publicação denunciada", comentario: "Comentário denunciado", mensagem: "Mensagem denunciada", negocio: "Negócio denunciado", comunidade: "Anúncio da Comunidade denunciado" };
const CAT_COMUNIDADE = { doacao: "Doação", troca: "Troca", pedido: "Pedido de ajuda", quarto: "Quarto compartilhado", achados: "Achados e perdidos" };
// Só mostra mídia do próprio site (dentro do documento ou do Firebase Storage do projeto).
const midiaOk = (u, tipos = "image|video|audio") => typeof u === "string" && new RegExp(`^(data:(${tipos})/[^,]{1,80},|https://firebasestorage\\.googleapis\\.com/|https://lh3\\.googleusercontent\\.com/)`).test(u);
const reais = (v) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const nomeDe = (uid) => D.pessoas.get(uid)?.nome || "";

function img(url, alt = "") { const i = document.createElement("img"); i.src = url; i.alt = alt; i.loading = "lazy"; return i; }

// Cartão de pedido, orçamento, interesse ou avaliação, no formato que aparece no chat.
function cartao(m) {
  const box = h("div", "ad-den-cartao");
  if (m.tipoArquivo === "avaliacao") {
    const a = m.avaliacao || {};
    box.classList.add("aval");
    box.append(h("small", null, "Pedido de avaliação"), h("strong", null, a.titulo || "Atendimento"), h("span", null, `${a.negocioNome || "Negócio"} pediu uma avaliação do atendimento`));
    const est = h("div", "estrelas", "★★★★★"); box.appendChild(est);
    return box;
  }
  const c = m.cartao || {};
  if (midiaOk(c.foto, "image")) box.appendChild(img(c.foto));
  if (Array.isArray(c.pedido?.itens)) {
    box.append(h("small", null, "Pedido"));
    const l = h("ul");
    c.pedido.itens.slice(0, 20).forEach((i) => l.appendChild(h("li", null, `${Number(i?.qtd) || 1}× ${i?.nome || "item"}${i?.preco != null ? " · " + reais(i.preco) : ""}`)));
    box.append(l, h("strong", null, `Total: ${reais(c.pedido.total)}`));
  } else if (c.solicitacao) {
    const so = c.solicitacao;
    box.append(h("small", null, "Pedido de orçamento"), h("strong", null, Array.isArray(so.servicos) && so.servicos.length ? so.servicos.join(", ") : "Serviço"));
    if (so.quando?.tipo) box.appendChild(h("span", null, so.quando.tipo === "urgente" ? "Urgente" : `Quando: ${so.quando.data || so.quando.tipo}`));
    if (so.descricao) box.appendChild(h("span", null, so.descricao));
  } else if (c.status) {
    box.append(h("small", null, "Atualização do pedido"), h("strong", null, String(c.titulo || "Pedido")), h("span", null, `Situação: ${c.status}`));
  } else {
    box.append(h("small", null, "Interesse"), h("strong", null, c.titulo || "Portfólio"));
    if (c.preco != null) box.appendChild(h("span", null, reais(c.preco)));
  }
  return box;
}

// Uma mensagem como apareceu no chat.
function bolha(m, { denunciada = false, ladoDe = "" } = {}) {
  const linha = h("div", "ad-den-linha" + (m.remetenteId === ladoDe ? " dir" : "") + (denunciada ? " denunciada" : ""));
  const b = h("div", "ad-den-bolha");
  if (denunciada) b.appendChild(h("span", "ad-den-marca", "Mensagem denunciada"));
  if (m.apagadaInfo) b.appendChild(h("div", "ad-den-vazio", `Apagada para todos por quem enviou (${dataHora(m.apagadaInfo.em)}).${m.apagadaInfo.guardada ? " Abaixo, o conteúdo como era:" : " O conteúdo já foi apagado de vez (24 horas)."}`));
  if (m.editadaEm && Array.isArray(m.edicoes) && m.edicoes.length) b.appendChild(h("div", "ad-den-vazio", `Editada ${dataHora(m.editadaEm)}. Texto original: “${String(m.edicoes[0]?.texto || "").slice(0, 400)}”`));
  const quem = h("div", "ad-den-quem"); quem.append(h("b", null, nomeDe(m.remetenteId) || "Usuário"), h("span", null, dataHora(m.criadoEm)));
  b.appendChild(quem);
  if (m.resposta?.texto) { const q = h("div", "ad-den-cita"); q.append(h("small", null, `Respondendo a ${nomeDe(m.resposta.remetenteId) || "mensagem"}`), h("span", null, m.resposta.texto)); b.appendChild(q); }
  if (m.tipoArquivo === "imagem" && midiaOk(m.arquivoUrl, "image")) { const a = img(m.arquivoUrl, "Foto enviada"); a.className = "ad-den-foto"; b.appendChild(a); }
  else if (m.tipoArquivo === "video" && midiaOk(m.arquivoUrl, "video")) { const v = document.createElement("video"); v.src = m.arquivoUrl; v.controls = true; v.preload = "metadata"; v.className = "ad-den-foto"; b.appendChild(v); }
  else if (m.tipoArquivo === "audio" && midiaOk(m.arquivoUrl, "audio")) b.appendChild(criarPlayerAudio({ chave: "den:" + m.id, fonte: m.arquivoUrl, aoErro: () => toast("Não foi possível tocar o áudio.") }));
  else if (m.tipoArquivo === "cartao" || m.tipoArquivo === "avaliacao") b.appendChild(cartao(m));
  else if (m.arquivoUrl) b.appendChild(h("div", "ad-den-vazio", "Anexo de um tipo que não pode ser mostrado aqui."));
  if (m.texto) b.appendChild(h("div", "ad-den-texto", m.texto));
  linha.appendChild(b);
  return linha;
}

async function conteudoMensagem(d, corpo) {
  const { fb } = C;
  // Apagada para todos: o conteúdo fica em conversas/{c}/apagadas/{id} (a moderação abre enquanto existir).
  const ler = (id) => fb.getDoc(fb.doc(fb.db, "conversas", d.conversaId, "mensagens", id)).then(async (s) => {
    if (!s.exists()) return null;
    const m = { id, ...s.data() };
    if (!m.apagada) return m;
    const g = await fb.getDoc(fb.doc(fb.db, "conversas", d.conversaId, "apagadas", id)).catch(() => null);
    return { ...m, ...(g?.exists() ? g.data().conteudo || {} : {}), apagadaInfo: { ...m.apagada, guardada: !!g?.exists() } };
  }).catch(() => null);
  const ids = [...new Set([...(Array.isArray(d.contexto) ? d.contexto : []), d.itemId])];
  const lidas = (await Promise.all(ids.map(ler))).filter(Boolean).sort((a, b) => (a.criadoEm?.toMillis?.() ?? 0) - (b.criadoEm?.toMillis?.() ?? 0));
  const alvo = lidas.find((m) => m.id === d.itemId);
  const info = h("p", "ad-den-info");
  info.textContent = Array.isArray(d.contexto) && d.contexto.length
    ? `Conversa entre ${nomeDe(d.autorId) || "quem denunciou"} e ${nomeDe(d.alvoId) || "a pessoa denunciada"}: ${lidas.length - (alvo ? 1 : 0)} mensagem(ns) em volta, como estão no servidor.`
    : "Esta denúncia foi enviada sem as mensagens em volta (antes desta atualização). Só a mensagem denunciada pode ser aberta.";
  corpo.appendChild(info);
  const chat = h("div", "ad-den-chat");
  if (!alvo) {
    const apagada = h("div", "ad-den-linha denunciada"); const b = h("div", "ad-den-bolha");
    b.append(h("span", "ad-den-marca", "Mensagem denunciada"), h("div", "ad-den-vazio", "Apagada por quem enviou. Abaixo, o trecho guardado na hora da denúncia."));
    if (d.trecho) b.appendChild(h("div", "ad-den-texto", d.trecho));
    apagada.appendChild(b);
    const antes = lidas.filter((m) => (m.criadoEm?.toMillis?.() ?? 0) <= (d.criadoEm?.toMillis?.() ?? Infinity));
    antes.forEach((m) => chat.appendChild(bolha(m, { ladoDe: d.autorId })));
    chat.appendChild(apagada);
    lidas.filter((m) => !antes.includes(m)).forEach((m) => chat.appendChild(bolha(m, { ladoDe: d.autorId })));
  } else lidas.forEach((m) => chat.appendChild(bolha(m, { denunciada: m.id === d.itemId, ladoDe: d.autorId })));
  corpo.appendChild(chat);
  requestAnimationFrame(() => chat.querySelector(".denunciada")?.scrollIntoView({ block: "center" }));
}

function ficha(foto, titulo, sub, linhas = []) {
  const box = h("div", "ad-den-ficha");
  const cab = h("div", "cab");
  if (midiaOk(foto, "image")) { const f = img(foto); f.className = "av"; cab.appendChild(f); }
  const t = h("div"); t.append(h("strong", null, titulo || "—")); if (sub) t.append(h("span", null, sub));
  cab.appendChild(t); box.appendChild(cab);
  linhas.filter(Boolean).forEach((l) => box.appendChild(typeof l === "string" ? h("div", "ad-den-texto", l) : l));
  return box;
}

async function conteudoOutro(d, corpo, acoes) {
  const { fb } = C;
  const ler = (col, id) => fb.getDoc(fb.doc(fb.db, col, id)).then((s) => (s.exists() ? s.data() : null));
  if (d.tipo === "publicacao") {
    const p = await ler("diario", d.itemId);
    if (!p) { corpo.appendChild(h("div", "ad-den-vazio", "A publicação já foi apagada.")); return; }
    const midia = p.mediaTipo === "video" && midiaOk(p.mediaUrl, "video") ? Object.assign(document.createElement("video"), { src: p.mediaUrl, controls: true, className: "ad-den-foto" }) : midiaOk(p.mediaUrl, "image") ? Object.assign(img(p.mediaUrl), { className: "ad-den-foto" }) : null;
    // Várias fotos: todas aparecem para a equipe.
    const outras = p.mediaTipo !== "video" && Array.isArray(p.midias) ? p.midias.slice(1).filter((u) => midiaOk(u, "image")).map((u) => Object.assign(img(u), { className: "ad-den-foto" })) : [];
    corpo.appendChild(ficha(p.fotoPerfil, p.nome || nomeDe(p.autorId), `Publicada em ${dataHora(p.criadoEm)}${p.editadoEm ? " · editada" : ""}${outras.length ? ` · ${outras.length + 1} fotos` : ""}`, [p.texto || "", midia, ...outras]));
  } else if (d.tipo === "comentario") {
    const c = await ler("comentarios", d.itemId);
    if (!c) { corpo.appendChild(h("div", "ad-den-vazio", "O comentário já foi apagado.")); return; }
    const post = c.postId ? await ler("diario", c.postId).catch(() => null) : null;
    corpo.appendChild(ficha(c.foto, c.nome || nomeDe(c.autorId), `Comentou em ${dataHora(c.criadoEm)}${c.editadoEm ? " · editado" : ""}`, [c.texto, post ? h("div", "ad-den-cita", `Na publicação: ${String(post.texto || "(só mídia)").slice(0, 200)}`) : ""]));
  } else if (d.tipo === "negocio") {
    const n = await ler("negocios", d.itemId);
    if (!n) { corpo.appendChild(h("div", "ad-den-vazio", "O negócio não existe mais.")); return; }
    const fotos = h("div", "ad-den-fotos"); (Array.isArray(n.fotos) ? n.fotos : []).filter((u) => midiaOk(u, "image")).slice(0, 5).forEach((u) => fotos.appendChild(img(u)));
    corpo.appendChild(ficha(n.foto, n.nome, [TIPOS_NEG[n.tipo] || n.tipo, n.cidade].filter(Boolean).join(" · "), [n.descricao || "", fotos.children.length ? fotos : ""]));
    const pag = ({ servicos: "servicos.html", delivery: "delivery.html", lojinha: "shopping.html", imoveis: "imoveis.html", saude: "saude.html" }[n.tipo] || "servicos.html");
    const a = h("a", "ad-bt", "Abrir no site"); a.href = `${pag}?negocio=${encodeURIComponent(d.itemId)}`; a.target = "_blank"; a.rel = "noopener"; acoes.prepend(a);
  } else if (d.tipo === "comunidade") {
    const a = await ler("comunidade", d.itemId);
    if (!a) { corpo.appendChild(h("div", "ad-den-vazio", "O anúncio já foi apagado.")); return; }
    const fotos = h("div", "ad-den-fotos"); (Array.isArray(a.fotos) ? a.fotos : []).filter((u) => midiaOk(u, "image")).slice(0, 4).forEach((u) => fotos.appendChild(img(u)));
    const extra = a.quarto ? `Divisão: ${a.quarto.rateio ? "R$ " + a.quarto.rateio + "/mês" : "a combinar"}${a.quarto.regras ? " · Regras: " + a.quarto.regras : ""}` : "";
    corpo.appendChild(ficha("", a.titulo, [CAT_COMUNIDADE[a.categoria] || a.categoria, a.status, a.bairro, a.cidade, `publicado em ${dataHora(a.criadoEm)}`].filter(Boolean).join(" · "), [a.descricao || "", extra, fotos.children.length ? fotos : ""]));
    const ln = h("a", "ad-bt", "Abrir no site"); ln.href = `comunidade.html?item=${encodeURIComponent(d.itemId)}`; ln.target = "_blank"; ln.rel = "noopener"; acoes.prepend(ln);
  } else if (d.tipo === "perfil") {
    const p = await ler("perfis_publicos", d.itemId);
    if (!p) { corpo.appendChild(h("div", "ad-den-vazio", "O perfil não existe mais.")); return; }
    const capa = midiaOk(p.fotoCapa, "image") ? Object.assign(img(p.fotoCapa), { className: "ad-den-foto" }) : "";
    corpo.appendChild(ficha(p.fotoPerfil, p.nome, [p.nickname ? "@" + p.nickname : "", p.cidade].filter(Boolean).join(" · "), [capa, p.bio || "(sem bio)"]));
  }
}

export async function verConteudoDenuncia(d) {
  const fundo = h("div", "ad-modal-fundo"), cx = h("div", "ad-modal ad-den");
  cx.setAttribute("role", "dialog"); cx.setAttribute("aria-modal", "true"); cx.setAttribute("aria-label", "Conteúdo denunciado");
  const topo = h("div", "ad-den-topo");
  const t = h("div"); t.append(h("h3", null, TITULOS[d.tipo] || "Conteúdo denunciado"), h("p", null, `Denúncia de ${nomeDe(d.autorId) || "usuário"} contra ${nomeDe(d.alvoId) || "usuário"} · ${dataHora(d.criadoEm)}`));
  const x = h("button", "ad-icone"); x.type = "button"; x.setAttribute("aria-label", "Fechar"); x.innerHTML = '<svg class="i s"><use href="#i-fechar"/></svg>';
  topo.append(t, x);
  const corpo = h("div", "ad-den-corpo"); corpo.appendChild(h("div", "ad-vazio", "Carregando o conteúdo..."));
  const acoes = h("div", "ad-acoes");
  const bFicha = h("button", "ad-bt", "Ver ficha da pessoa"); bFicha.type = "button";
  const ok = h("button", "ad-bt pri", "Fechar"); ok.type = "button";
  acoes.append(bFicha, ok);
  cx.append(topo, corpo);
  if (d.trecho && d.tipo !== "mensagem") { const tr = h("div", "ad-den-guardado"); tr.append(h("small", null, "Trecho guardado na hora da denúncia"), h("span", null, d.trecho)); cx.appendChild(tr); }
  if (d.detalhe) { const r = h("div", "ad-den-guardado relato"); r.append(h("small", null, "Relato de quem denunciou"), h("span", null, d.detalhe)); cx.appendChild(r); }
  cx.appendChild(acoes);
  fundo.appendChild(cx); document.body.appendChild(fundo);
  const fechar = () => { fundo.remove(); document.removeEventListener("keydown", tecla, true); };
  const tecla = (e) => { if (e.key === "Escape") { e.stopPropagation(); fechar(); } };
  document.addEventListener("keydown", tecla, true);
  x.addEventListener("click", fechar); ok.addEventListener("click", fechar);
  fundo.addEventListener("click", (e) => { if (e.target === fundo) fechar(); });
  bFicha.addEventListener("click", () => { fechar(); abrirFicha(d.alvoId); });
  ok.focus();
  try {
    corpo.replaceChildren();
    if (d.tipo === "mensagem") await conteudoMensagem(d, corpo);
    else await conteudoOutro(d, corpo, acoes);
  } catch (e) { corpo.replaceChildren(h("div", "ad-den-vazio", "Não foi possível abrir: " + (e.code || e.message))); }
}
