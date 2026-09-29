// =====================================================
// Vitrine de negócios do Help Floripa
// Na página:  <script type="module" src="vitrine.js?tipo=servicos"></script>
// Tipos: servicos | delivery | lojinha | imoveis
// Negócios: coleção "negocios" (um perfil de cada tipo por pessoa).
// Imóveis:  coleção "anuncios" (vários imóveis por pessoa).
// Links diretos: pagina.html?negocio=ID  ·  imoveis.html?anuncio=ID
// =====================================================

const PARAMS = new URL(import.meta.url).searchParams;
const TIPO_PAGINA = PARAMS.get("tipo");
const TIPO = TIPO_PAGINA || "servicos";

export const CORES_TIPO = { servicos: "#00adee", delivery: "#ff7a1a", lojinha: "#b066ff", imoveis: "#2fbf71" };
export const NOMES_TIPO = { servicos: "Serviços", delivery: "Delivery", lojinha: "Lojinha", imoveis: "Imóveis" };
export const PAGINA_TIPO = { servicos: "servicos.html", delivery: "delivery.html", lojinha: "shopping.html", imoveis: "imoveis.html" };
export const CATEGORIAS = {
  servicos: { limpeza: "Limpeza", reformas: "Reformas", beleza: "Saúde e Beleza", transporte: "Transporte / Motorista", pets: "Pets", outros: "Outros" },
  delivery: { hamburguer: "Hambúrguer", pizza: "Pizza", sushi: "Sushi", doces: "Doces", bebidas: "Bebidas", outros: "Outros" },
  lojinha: { eletronicos: "Eletrônicos", roupas: "Roupas", mercado: "Mercado", casa: "Casa", outros: "Outros" },
  imoveis: { apartamento: "Apartamento", casa: "Casa", kitnet: "Kitnet", terreno: "Terreno", comercial: "Comercial", outros: "Outros" }
};
export const FINALIDADE = { aluguel: "Aluguel", venda: "Venda", temporada: "Temporada" };
export const ANUNCIANTE = { proprietario: "Proprietário(a)", corretor: "Corretor(a)", imobiliaria: "Imobiliária" };
const TEXTOS = {
  servicos: { titulo: "Profissionais da <span>comunidade</span>", sub: "Autônomos que atendem em Florianópolis e região.", criar: "Oferecer meus serviços", vazio: "Nenhum profissional por aqui ainda", img: "servicos.webp" },
  delivery: { titulo: "Cardápios da <span>vizinhança</span>", sub: "Peça direto com quem faz, sem intermediário.", criar: "Cadastrar meu delivery", vazio: "Nenhum delivery cadastrado ainda", img: "lanchonetes.webp" },
  lojinha: { titulo: "Lojinhas <span>locais</span>", sub: "Produtos de quem vende perto de você.", criar: "Abrir minha lojinha", vazio: "Nenhuma lojinha aberta ainda", img: "shopping.webp" },
  imoveis: { titulo: "Imóveis <span>anunciados</span>", sub: "Aluguel, venda e temporada direto com o anunciante.", criar: "Anunciar imóvel", vazio: "Nenhum imóvel anunciado ainda", img: "imoveis.webp" }
};
const MODOS = { domicilio: "Vai até você", local: "No local", online: "Online" };
const TEXTO_CONTATO = { servicos: "Pedir orçamento", delivery: "Fazer pedido", lojinha: "Falar com a loja", imoveis: "Tenho interesse" };

// ---------- utilitários ----------
const urlSegura = (u) => (/^(https:\/\/|data:image\/)/i.test(String(u || "")) ? String(u) : "");
const iniciais = (n) => { const p = String(n || "?").trim().split(/\s+/); return ((p[0]?.[0] || "?") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase(); };
export const moeda = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: Number(v) % 1 ? 2 : 0 }) : "");
const el = (tag, cls, texto) => { const e = document.createElement(tag); if (cls) e.className = cls; if (texto != null) e.textContent = texto; return e; };
const ICONES = {
  chat: '<path d="M20.5 11.6c0 4.3-3.8 7.6-8.5 7.6-1.2 0-2.3-.2-3.3-.6L4 20l1.2-3.6c-1.1-1.3-1.7-3-1.7-4.8C3.5 7.4 7.3 4 12 4s8.5 3.4 8.5 7.6z"/>',
  whats: '<path d="M20.5 11.7a8.5 8.5 0 01-12.6 7.5L3.5 20.5l1.3-4.2A8.5 8.5 0 1120.5 11.7z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .8a4.5 4.5 0 01-2.4-2.4l.8-1-1-2z"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
  relogio: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4.5l3 1.8"/>',
  moto: '<circle cx="6" cy="17" r="2.6"/><circle cx="18" cy="17" r="2.6"/><path d="M8.6 17h6.8M14 7h3l2.5 7.5M12 11h5M6 14.4L9 9h4"/>',
  sacola: '<path d="M6 8h12l-1 12H7L6 8zM9 8V6a3 3 0 016 0v2"/>',
  cama: '<path d="M3 18v-7h18v7M3 14h18M6 11V8h5v3"/>',
  banho: '<path d="M4 12h16v2a5 5 0 01-5 5H9a5 5 0 01-5-5zM6 12V6a2 2 0 014 0"/>',
  carro: '<path d="M5 16l1.5-5h11l1.5 5M4 16h16v3H4zM7 19v1M17 19v1"/>',
  area: '<path d="M4 4h16v16H4zM4 9h5V4M20 15h-5v5"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  foto: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5-8.5 8.5"/>',
  fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
  casa: '<path d="M4 10.5L12 4l8 6.5V19a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 19z"/>',
  lapis: '<path d="M4 20h4L19 9a2.8 2.8 0 00-4-4L4 16v4z"/>',
  cnh: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 16c.6-1.4 1.7-2 3-2s2.4.6 3 2M14 10h4M14 13h3"/>',
  selo: '<path d="M12 3l2.4 1.8 3-.2.9 2.9 2.5 1.7-1 2.8 1 2.8-2.5 1.7-.9 2.9-3-.2L12 21l-2.4-1.8-3 .2-.9-2.9-2.5-1.7 1-2.8-1-2.8 2.5-1.7.9-2.9 3 .2z"/>',
  avancar: '<path d="M9 5l7 7-7 7"/>'
};
function icone(nome, cls = "vi s") {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("class", cls);
  s.setAttribute("viewBox", "0 0 24 24");
  s.setAttribute("aria-hidden", "true");
  s.innerHTML = ICONES[nome] || "";
  return s;
}
function avatar(foto, nome, cls = "vt-avatar") {
  const d = el("div", cls);
  const u = urlSegura(foto);
  if (u) { const i = document.createElement("img"); i.src = u; i.alt = ""; i.loading = "lazy"; i.onerror = () => { d.textContent = iniciais(nome); }; d.appendChild(i); }
  else d.textContent = iniciais(nome);
  return d;
}
function toast(t) {
  document.querySelectorAll(".vt-toast").forEach((x) => x.remove());
  const d = el("div", "vt-toast", t);
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 3500);
}
function linkWhats(numeroBruto, texto) {
  const numero = String(numeroBruto || "").replace(/\D/g, "");
  if (numero.length < 10) return null;
  const a = el("a", "vt-btn whats");
  a.href = `https://wa.me/${numero.startsWith("55") ? numero : "55" + numero}?text=${encodeURIComponent(texto)}`;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.append(icone("whats"), document.createTextNode("WhatsApp"));
  a.addEventListener("click", (e) => e.stopPropagation());
  return a;
}
function abertoAgora(n) {
  if (!n.horaAbre || !n.horaFecha) return null;
  const [ha, ma] = n.horaAbre.split(":").map(Number), [hf, mf] = n.horaFecha.split(":").map(Number);
  if ([ha, ma, hf, mf].some((x) => !Number.isFinite(x))) return null;
  const agora = new Date(), m = agora.getHours() * 60 + agora.getMinutes(), a = ha * 60 + ma, f = hf * 60 + mf;
  return f > a ? m >= a && m < f : m >= a || m < f; // atravessa a meia-noite
}
// Áreas de atuação do profissional (aceita cadastro antigo com uma categoria só).
export const categoriasDe = (n) => (Array.isArray(n.categorias) && n.categorias.length ? n.categorias : n.categoria ? [n.categoria] : []);
const precoImovel = (a) => (moeda(a.preco) ? moeda(a.preco) + (a.finalidade === "aluguel" ? "/mês" : a.finalidade === "temporada" ? "/dia" : "") : "Consultar");
const tituloImovel = (a) => a.titulo || `${CATEGORIAS.imoveis[a.categoria] || "Imóvel"} para ${(FINALIDADE[a.finalidade] || "negociar").toLowerCase()}`;
const fotoPequena = (u) => { const s = urlSegura(u); return s && s.length < 220000 ? s : ""; };

// ---------- conversa com cartão do que o cliente quer ----------
export function cartaoDeNegocio(n) {
  const cats = categoriasDe(n).map((c) => CATEGORIAS[n.tipo]?.[c]).filter(Boolean);
  return {
    tipo: n.tipo, titulo: n.nome || NOMES_TIPO[n.tipo],
    sub: [NOMES_TIPO[n.tipo], cats.slice(0, 2).join(", ")].filter(Boolean).join(" · "),
    preco: n.tipo === "servicos" && moeda(n.precoDesde) ? `a partir de ${moeda(n.precoDesde)}` : "",
    foto: fotoPequena(n.foto) || fotoPequena((n.fotos || [])[0]),
    link: `${PAGINA_TIPO[n.tipo]}?negocio=${encodeURIComponent(n.id || "")}`
  };
}
export function cartaoDeAnuncio(a) {
  return {
    tipo: "imoveis", titulo: tituloImovel(a),
    sub: [FINALIDADE[a.finalidade], [a.bairro, a.cidade].filter(Boolean).join(", ")].filter(Boolean).join(" · "),
    preco: precoImovel(a), foto: fotoPequena((a.fotos || [])[0]),
    link: `imoveis.html?anuncio=${encodeURIComponent(a.id || "")}`
  };
}
// Abre (ou cria) a conversa, marca o assunto e deixa o cartão pronto para ir junto na mensagem.
export async function prepararConversa(fbx, euX, uid, cartao) {
  if (!euX) { location.href = "login.html"; return; }
  if (uid === euX.uid) { toast("Esse é o seu próprio perfil."); return; }
  const ids = [euX.uid, uid].sort();
  const id = `${ids[0]}_${ids[1]}`;
  const ref = fbx.doc(fbx.db, "conversas", id);
  try {
    let existe = false;
    try { existe = (await fbx.getDoc(ref)).exists(); } catch {}
    const contexto = cartao ? { tipo: cartao.tipo, titulo: cartao.titulo } : null;
    if (!existe) await fbx.setDoc(ref, { participantes: ids, ultimaMensagem: "", atualizadoEm: fbx.serverTimestamp(), ...(contexto ? { contexto } : {}) }, { merge: true });
    else if (contexto) await fbx.setDoc(ref, { contexto }, { merge: true });
    if (cartao) { try { sessionStorage.setItem("hf-cartao-pendente", JSON.stringify({ conversaId: id, cartao })); } catch {} }
    location.href = `mensagens.html?conversa=${encodeURIComponent(id)}`;
  } catch { toast("Não foi possível abrir a conversa."); }
}

// ---------- estado ----------
let fb = null, eu = null, todos = [];
const donos = new Map();
const negociosImoveis = new Map(); // donoId -> perfil de imóveis (anunciante)
const conversar = (uid, cartao) => prepararConversa(fb, eu, uid, cartao);

export async function buscarAnuncios(fbx, donoId) {
  const snap = await fbx.getDocs(fbx.query(fbx.collection(fbx.db, "anuncios"), fbx.where("donoId", "==", donoId), fbx.limit(40)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((a) => a.ativo !== false)
    .sort((a, b) => (b.atualizadoEm?.toMillis?.() ?? 0) - (a.atualizadoEm?.toMillis?.() ?? 0));
}
// Cadastro antigo: o próprio perfil de imóveis tinha os dados de um imóvel.
const negocioComoAnuncio = (n) => ({ ...n, id: "n_" + n.id, legado: true, titulo: n.titulo || "", categoria: n.categoria });

// Nome do criador leva ao perfil dele.
function linkCriador(uid, dono, aoPerfil) {
  const a = el("a", "vt-dono");
  a.href = `usuarios.html?perfil=${encodeURIComponent(uid)}`;
  a.append(avatar(dono.fotoPerfil, dono.nome), document.createTextNode("por "), el("strong", null, dono.nome || "Usuário"));
  a.title = "Ver perfil de quem criou";
  a.addEventListener("click", (e) => {
    e.stopPropagation();
    if (aoPerfil) { e.preventDefault(); document.querySelectorAll(".vt-modal").forEach((m) => m.remove()); aoPerfil(uid); }
  });
  return a;
}

function botoes(donoId, { texto, whats, textoWhats, cartao, editarHref }) {
  const box = el("div", "vt-botoes");
  if (eu && donoId === eu.uid) {
    const ed = el("a", "vt-btn sec");
    ed.href = editarHref;
    ed.append(icone("lapis"), document.createTextNode("Editar"));
    ed.addEventListener("click", (e) => e.stopPropagation());
    box.appendChild(ed);
    return box;
  }
  const w = linkWhats(whats, textoWhats);
  const m = el("button", "vt-btn " + (w ? "sec" : "pri"));
  m.type = "button";
  m.append(icone("chat"), document.createTextNode(texto));
  m.addEventListener("click", (e) => { e.stopPropagation(); conversar(donoId, cartao); });
  box.appendChild(m);
  if (w) box.appendChild(w);
  return box;
}
const botoesNegocio = (n) => botoes(n.donoId, {
  texto: TEXTO_CONTATO[n.tipo], whats: n.whatsapp, cartao: cartaoDeNegocio(n),
  textoWhats: `Olá! Vi "${n.nome}" no Help Floripa.`, editarHref: `usuarios.html?acao=negocio&tipo=${n.tipo}`
});

// ---------- cartões por tipo ----------
function cabecalhoCartao(n, extras) {
  const topo = el("div", "vt-topo");
  const txt = el("div", "vt-topo-tx");
  txt.appendChild(el("h3", "vt-nome", n.nome || NOMES_TIPO[n.tipo]));
  const sub = el("div", "vt-sub");
  extras.forEach((x) => x && sub.appendChild(x));
  if (n.cidade) { const s = el("span", "vt-local"); s.append(icone("pin"), document.createTextNode(n.cidade)); sub.appendChild(s); }
  txt.appendChild(sub);
  topo.append(avatar(n.foto, n.nome), txt);
  return topo;
}

function cartaoServico(n) {
  const c = el("article", "vt-card vt-servico");
  const cats = categoriasDe(n);
  c.appendChild(cabecalhoCartao(n, []));
  const areas = el("div", "vt-areas");
  cats.slice(0, 3).forEach((k) => areas.appendChild(el("span", "vt-tag", CATEGORIAS.servicos[k] || k)));
  if (cats.length > 3) areas.appendChild(el("span", "vt-tag neutra", `+${cats.length - 3}`));
  if (Array.isArray(n.cnh) && n.cnh.length) { const t = el("span", "vt-tag cnh"); t.append(icone("cnh"), document.createTextNode(`CNH ${n.cnh.join(" · ")}`)); areas.appendChild(t); }
  if (areas.children.length) c.appendChild(areas);
  const linha = el("div", "vt-linha-preco");
  if (moeda(n.precoDesde)) { const p = el("div", "vt-preco-desde"); p.append(el("small", null, "a partir de"), el("strong", null, moeda(n.precoDesde))); linha.appendChild(p); }
  const modos = el("div", "vt-modos");
  (n.atendimento || []).forEach((k) => MODOS[k] && modos.appendChild(el("span", "vt-tag neutra", MODOS[k])));
  if (modos.children.length) linha.appendChild(modos);
  if (linha.children.length) c.appendChild(linha);
  if (n.descricao) c.appendChild(el("p", "vt-desc", n.descricao));
  const itens = (n.itens || []).filter((i) => i?.nome).slice(0, 3);
  if (itens.length) {
    const ul = el("ul", "vt-lista-serv");
    itens.forEach((i) => { const li = el("li"); li.append(el("span", null, i.nome), el("span", null, moeda(i.preco) || "a combinar")); ul.appendChild(li); });
    c.appendChild(ul);
  }
  const rodape = el("div", "vt-rodape");
  rodape.append(linkCriador(n.donoId, donos.get(n.donoId) || {}), botoesNegocio(n));
  c.appendChild(rodape);
  return c;
}

function cartaoDelivery(n) {
  const c = el("article", "vt-card vt-delivery");
  const capa = el("div", "capa");
  capa.style.backgroundImage = `url("${urlSegura((n.fotos || [])[0]) || TEXTOS.delivery.img}")`;
  const aberto = abertoAgora(n);
  if (aberto !== null) capa.appendChild(el("span", "vt-tag " + (aberto ? "ok" : "off"), aberto ? "Aberto agora" : "Fechado"));
  capa.appendChild(avatar(n.foto, n.nome, "vt-avatar logo"));
  const corpo = el("div", "corpo");
  const cab = el("div");
  cab.append(el("h3", "vt-nome", n.nome || "Delivery"));
  const sub = el("div", "vt-sub");
  sub.append(el("span", "vt-tag", CATEGORIAS.delivery[n.categoria] || "Delivery"));
  if (n.cidade) { const s = el("span", "vt-local"); s.append(icone("pin"), document.createTextNode(n.cidade)); sub.appendChild(s); }
  cab.appendChild(sub);
  corpo.appendChild(cab);
  const infos = el("div", "vt-infos");
  if (n.tempoMin || n.tempoMax) { const s = el("span"); s.append(icone("relogio"), el("strong", null, `${n.tempoMin || "?"}–${n.tempoMax || "?"} min`)); infos.appendChild(s); }
  { const s = el("span"); s.append(icone("moto"), el("strong", null, Number(n.taxaEntrega) > 0 ? moeda(n.taxaEntrega) : "Entrega grátis")); infos.appendChild(s); }
  if (moeda(n.pedidoMinimo)) { const s = el("span"); s.append(icone("sacola"), document.createTextNode("mín. "), el("strong", null, moeda(n.pedidoMinimo))); infos.appendChild(s); }
  corpo.appendChild(infos);
  const itens = (n.itens || []).filter((i) => i?.nome).slice(0, 6);
  if (itens.length) {
    const cardapio = el("div", "vt-cardapio");
    itens.forEach((i) => {
      const p = el("div", "vt-prato");
      const f = el("div", "ft");
      if (urlSegura(i.foto)) f.style.backgroundImage = `url("${i.foto}")`;
      p.append(f, el("small", null, i.nome), el("strong", null, moeda(i.preco)));
      cardapio.appendChild(p);
    });
    corpo.appendChild(cardapio);
  } else if (n.descricao) corpo.appendChild(el("p", "vt-desc", n.descricao));
  const rodape = el("div", "vt-rodape");
  rodape.append(linkCriador(n.donoId, donos.get(n.donoId) || {}), botoesNegocio(n));
  corpo.appendChild(rodape);
  c.append(capa, corpo);
  return c;
}

function cartaoLoja(n) {
  const c = el("article", "vt-card vt-loja");
  const extras = [el("span", "vt-tag", CATEGORIAS.lojinha[n.categoria] || "Lojinha")];
  (n.entrega || []).forEach((k) => extras.push(el("span", "vt-tag neutra", k === "entrega" ? "Entrega" : "Retirada")));
  c.appendChild(cabecalhoCartao(n, extras));
  const grade = el("div", "vt-produtos");
  const itens = (n.itens || []).filter((i) => i?.nome).slice(0, 3);
  itens.forEach((i) => {
    const p = el("div", "vt-produto");
    if (urlSegura(i.foto)) p.style.backgroundImage = `url("${i.foto}")`;
    if (moeda(i.preco)) p.appendChild(el("span", null, moeda(i.preco)));
    p.title = i.nome;
    grade.appendChild(p);
  });
  if (!itens.length) { const v = el("div", "vt-produto vazio", "Produtos em breve"); v.style.cssText = "grid-column: 1 / -1; aspect-ratio: auto; min-height: 80px"; grade.appendChild(v); }
  c.appendChild(grade);
  if (n.descricao) c.appendChild(el("p", "vt-desc", n.descricao));
  const rodape = el("div", "vt-rodape");
  rodape.append(linkCriador(n.donoId, donos.get(n.donoId) || {}), botoesNegocio(n));
  c.appendChild(rodape);
  return c;
}

function cartaoImovel(a) {
  const c = el("article", "vt-card vt-imovel");
  const g = el("div", "galeria");
  g.style.backgroundImage = `url("${urlSegura((a.fotos || [])[0]) || TEXTOS.imoveis.img}")`;
  g.appendChild(el("span", "vt-tag", FINALIDADE[a.finalidade] || "Imóvel"));
  const nFotos = (a.fotos || []).filter(urlSegura).length;
  if (nFotos > 1) { const s = el("span", "fotos-n"); s.append(icone("foto"), document.createTextNode(String(nFotos))); g.appendChild(s); }
  const p = el("div", "preco", moeda(a.preco) || "Consultar");
  if (moeda(a.preco) && a.finalidade === "aluguel") p.appendChild(el("small", null, " /mês"));
  if (moeda(a.preco) && a.finalidade === "temporada") p.appendChild(el("small", null, " /diária"));
  g.appendChild(p);
  const corpo = el("div", "corpo");
  corpo.append(el("h3", "vt-nome", tituloImovel(a)));
  const sub = el("div", "vt-sub");
  const local = [a.bairro, a.cidade].filter(Boolean).join(", ");
  if (local) { const s = el("span", "vt-local"); s.append(icone("pin"), document.createTextNode(local)); sub.appendChild(s); }
  sub.appendChild(el("span", "vt-tag neutra", CATEGORIAS.imoveis[a.categoria] || "Imóvel"));
  if (a.mobiliado) sub.appendChild(el("span", "vt-tag neutra", "Mobiliado"));
  corpo.appendChild(sub);
  corpo.appendChild(specsImovel(a));
  const rodape = el("div", "vt-rodape");
  const anunciante = negociosImoveis.get(a.donoId);
  rodape.append(linkCriador(a.donoId, donos.get(a.donoId) || {}), botoes(a.donoId, {
    texto: "Tenho interesse", whats: a.whatsapp || anunciante?.whatsapp, cartao: cartaoDeAnuncio(a),
    textoWhats: `Olá! Tenho interesse no imóvel "${tituloImovel(a)}" que vi no Help Floripa.`, editarHref: "usuarios.html?acao=negocio&tipo=imoveis"
  }));
  corpo.appendChild(rodape);
  c.append(g, corpo);
  return c;
}
function specsImovel(a) {
  const specs = el("div", "vt-specs");
  [["cama", a.quartos, "quartos"], ["banho", a.banheiros, "banheiros"], ["carro", a.vagas, "vagas"], ["area", a.area ? `${a.area}` : "", "m²"]].forEach(([ic, v, rot]) => {
    const d = el("div");
    const s = el("strong");
    s.append(icone(ic), document.createTextNode(v === 0 || v ? String(v) : "–"));
    d.append(s, document.createTextNode(rot));
    specs.appendChild(d);
  });
  return specs;
}

const CARTAO = { servicos: cartaoServico, delivery: cartaoDelivery, lojinha: cartaoLoja };

// ---------- janela de detalhe ----------
function novaJanela(tipo, rotulo) {
  const fundo = el("div", "vt-modal vitrine");
  fundo.dataset.tipo = tipo;
  fundo.setAttribute("role", "dialog");
  fundo.setAttribute("aria-modal", "true");
  fundo.setAttribute("aria-label", rotulo);
  const caixa = el("div", "caixa vd");
  const fechar = el("button", "fechar");
  fechar.type = "button";
  fechar.setAttribute("aria-label", "Fechar");
  fechar.appendChild(icone("fechar", "vi"));
  caixa.appendChild(fechar);
  fundo.appendChild(caixa);
  const sair = () => { fundo.remove(); document.removeEventListener("keydown", tecla); };
  const tecla = (e) => { if (e.key === "Escape") sair(); };
  fundo.addEventListener("click", (e) => { if (e.target === fundo) sair(); });
  fechar.addEventListener("click", sair);
  document.addEventListener("keydown", tecla);
  document.body.appendChild(fundo);
  requestAnimationFrame(() => fechar.focus());
  return { fundo, caixa, sair };
}
const titulo4 = (t) => el("h4", null, t);
function fatosBox(lista) {
  const fatos = el("div", "vd-fatos");
  lista.forEach(([ic, valor, rotulo]) => {
    if (valor === "" || valor == null) return;
    const f = el("div", "vd-fato");
    f.append(icone(ic, "vi"), el("strong", null, String(valor)), el("small", null, rotulo));
    fatos.appendChild(f);
  });
  return fatos.children.length ? fatos : null;
}
function barraContato({ proprio, aoEditar, editarHref, sair, texto, whats, textoWhats, aoMensagem, donoId, cartao }) {
  const barra = el("div", "vd-acoes");
  if (proprio) {
    if (aoEditar) { const b = el("button", "vt-btn pri"); b.type = "button"; b.append(icone("lapis"), document.createTextNode("Editar")); b.addEventListener("click", () => { sair(); aoEditar(); }); barra.appendChild(b); }
    else { const a = el("a", "vt-btn pri"); a.href = editarHref; a.append(icone("lapis"), document.createTextNode("Editar")); barra.appendChild(a); }
    return barra;
  }
  const w = linkWhats(whats, textoWhats);
  const m = el("button", "vt-btn " + (w ? "sec" : "pri"));
  m.type = "button";
  m.append(icone("chat"), document.createTextNode(texto));
  m.addEventListener("click", () => aoMensagem(donoId, cartao));
  barra.appendChild(m);
  if (w) barra.appendChild(w);
  return barra;
}

// ---------- perfil completo do negócio ----------
// opcoes: { fb, eu, dono, proprio, aoMensagem(uid, cartao), aoEditar(n), aoPerfil(uid) }
export function abrirDetalhe(n, opcoes = {}) {
  const tipo = n.tipo || TIPO;
  const fbx = opcoes.fb || fb, euX = opcoes.eu || eu;
  const dono = opcoes.dono || donos.get(n.donoId) || {};
  const proprio = opcoes.proprio ?? (!!euX && n.donoId === euX.uid);
  const aoMensagem = opcoes.aoMensagem || ((uid, cartao) => prepararConversa(fbx, euX, uid, cartao));
  const { caixa, sair } = novaJanela(tipo, n.nome || "Negócio");
  const fotos = (n.fotos || []).filter(urlSegura);

  const capa = el("div", "vd-capa");
  capa.style.backgroundImage = `url("${fotos[0] || TEXTOS[tipo].img}")`;
  capa.appendChild(avatar(n.foto, n.nome, "vt-avatar vd-logo"));
  caixa.appendChild(capa);
  const ct = el("div", "conteudo");
  if (proprio) {
    const aviso = el("div", "vd-previa");
    aviso.append(el("span", null, "Pré-visualização: é assim que os outros veem seu perfil de negócio."));
    ct.appendChild(aviso);
  }
  const cab = el("div", "vd-cab");
  cab.appendChild(el("h3", null, n.nome || NOMES_TIPO[tipo]));
  const tags = el("div", "vt-sub");
  if (tipo === "servicos") categoriasDe(n).forEach((k) => tags.appendChild(el("span", "vt-tag", CATEGORIAS.servicos[k] || k)));
  else if (tipo !== "imoveis") tags.appendChild(el("span", "vt-tag", CATEGORIAS[tipo][n.categoria] || NOMES_TIPO[tipo]));
  else tags.appendChild(el("span", "vt-tag", ANUNCIANTE[n.tipoAnunciante] || "Anunciante"));
  if (tipo === "delivery") { const ab = abertoAgora(n); if (ab !== null) tags.appendChild(el("span", "vt-tag " + (ab ? "ok" : "off"), ab ? "Aberto agora" : "Fechado")); }
  if (n.cidade) { const s2 = el("span", "vt-local"); s2.append(icone("pin"), document.createTextNode(n.cidade)); tags.appendChild(s2); }
  cab.append(tags, linkCriador(n.donoId, dono, opcoes.aoPerfil));
  ct.appendChild(cab);

  const fatos = {
    servicos: () => [["sacola", moeda(n.precoDesde) || "A combinar", "a partir de"], ["relogio", n.horario || "", "horário"],
      ...(n.atendimento || []).filter((k) => MODOS[k]).map((k) => ["casa", MODOS[k], "atendimento"]),
      ["cnh", Array.isArray(n.cnh) && n.cnh.length ? n.cnh.join(" · ") : "", "CNH"], ["carro", n.veiculo || "", "veículo"]],
    delivery: () => [["relogio", n.horaAbre && n.horaFecha ? `${n.horaAbre}–${n.horaFecha}` : "", "funcionamento"],
      ["moto", n.tempoMin || n.tempoMax ? `${n.tempoMin || "?"}–${n.tempoMax || "?"} min` : "", "entrega"],
      ["moto", Number(n.taxaEntrega) > 0 ? moeda(n.taxaEntrega) : "Grátis", "taxa"], ["sacola", moeda(n.pedidoMinimo), "pedido mínimo"]],
    lojinha: () => [...(n.entrega || []).map((k) => [k === "entrega" ? "moto" : "sacola", k === "entrega" ? "Entrega" : "Retirada", "como receber"]),
      ["sacola", (n.itens || []).filter((i) => i?.nome).length || "", "produtos"]],
    imoveis: () => [["selo", n.creci || "", "CRECI"]]
  }[tipo]();
  const fb1 = fatosBox(fatos);
  if (fb1) ct.appendChild(fb1);
  if (n.descricao) { ct.appendChild(titulo4("Sobre")); ct.appendChild(el("p", "texto", n.descricao)); }

  const itens = (n.itens || []).filter((i) => i?.nome);
  if (tipo === "servicos" && itens.length) {
    // serviços agrupados por área de atuação
    const cats = categoriasDe(n);
    const grupos = [...cats, ""].map((k) => [k, itens.filter((i) => (i.categoria || "") === k || (!k && !cats.includes(i.categoria || "")))]).filter(([, l]) => l.length);
    ct.appendChild(titulo4("Serviços e preços"));
    grupos.forEach(([k, lista]) => {
      if (grupos.length > 1) ct.appendChild(el("div", "vd-subtitulo", k ? CATEGORIAS.servicos[k] || k : "Outros serviços"));
      const ul = el("ul", "vt-lista-serv");
      lista.forEach((i) => { const li = el("li"); li.append(el("span", null, i.nome), el("span", null, moeda(i.preco) || "a combinar")); ul.appendChild(li); });
      ct.appendChild(ul);
    });
  } else if ((tipo === "delivery" || tipo === "lojinha") && itens.length) {
    ct.appendChild(titulo4(tipo === "delivery" ? "Cardápio" : "Produtos"));
    const g = el("div", "vd-itens " + tipo);
    itens.forEach((i) => {
      const card = el("div", "vd-item");
      const f = el("div", "ft");
      if (urlSegura(i.foto)) f.style.backgroundImage = `url("${i.foto}")`; else f.appendChild(icone(tipo === "delivery" ? "sacola" : "foto", "vi"));
      card.append(f, el("strong", null, i.nome), el("span", null, moeda(i.preco) || "Consultar"));
      g.appendChild(card);
    });
    ct.appendChild(g);
  }

  if (tipo === "imoveis") {
    // perfil do anunciante: lista todos os imóveis dele
    ct.appendChild(titulo4("Imóveis disponíveis"));
    const grade = el("div", "vd-imoveis");
    grade.appendChild(el("p", "vt-sub", "Carregando imóveis..."));
    ct.appendChild(grade);
    buscarAnuncios(fbx, n.donoId).then((lista) => {
      if (n.preco || n.quartos) lista.push(negocioComoAnuncio(n));
      grade.replaceChildren();
      if (!lista.length) { grade.appendChild(el("p", "vt-sub", proprio ? "Você ainda não anunciou imóveis. Use Editar para anunciar." : "Nenhum imóvel disponível no momento.")); return; }
      lista.forEach((a) => grade.appendChild(miniImovel(a, () => { sair(); abrirAnuncio({ ...a, donoId: n.donoId }, { ...opcoes, anunciante: n }); })));
    }).catch(() => { grade.replaceChildren(el("p", "vt-sub", "Não foi possível carregar os imóveis.")); });
  } else {
    const galeria = tipo === "delivery" ? [] : fotos;
    if (galeria.length) {
      ct.appendChild(titulo4(tipo === "servicos" ? "Trabalhos realizados" : "Fotos"));
      const g = el("div", "vd-galeria");
      galeria.forEach((f, i) => { const im = document.createElement("img"); im.src = f; im.alt = `Foto ${i + 1}`; im.loading = "lazy"; g.appendChild(im); });
      ct.appendChild(g);
    }
  }

  ct.appendChild(barraContato({
    proprio, sair, aoEditar: opcoes.aoEditar ? () => opcoes.aoEditar(n) : null, editarHref: `usuarios.html?acao=negocio&tipo=${tipo}`,
    texto: tipo === "imoveis" ? "Falar com o anunciante" : TEXTO_CONTATO[tipo], whats: n.whatsapp,
    textoWhats: `Olá! Vi "${n.nome}" no Help Floripa.`, aoMensagem, donoId: n.donoId, cartao: cartaoDeNegocio(n)
  }));
  caixa.appendChild(ct);
}

function miniImovel(a, aoClicar) {
  const b = el("button", "vd-mini-imovel");
  b.type = "button";
  const f = el("div", "ft");
  f.style.backgroundImage = `url("${urlSegura((a.fotos || [])[0]) || TEXTOS.imoveis.img}")`;
  f.appendChild(el("span", "vt-tag", FINALIDADE[a.finalidade] || "Imóvel"));
  const tx = el("div", "tx");
  tx.append(el("strong", null, precoImovel(a)), el("span", null, tituloImovel(a)));
  const det = [a.quartos ? `${a.quartos} qto` : "", a.area ? `${a.area} m²` : "", a.bairro || ""].filter(Boolean).join(" · ");
  if (det) tx.appendChild(el("small", null, det));
  b.append(f, tx);
  b.addEventListener("click", aoClicar);
  return b;
}

// ---------- detalhe de um imóvel ----------
// opcoes: { fb, eu, dono, anunciante, aoMensagem, aoPerfil, aoEditar }
export function abrirAnuncio(a, opcoes = {}) {
  const fbx = opcoes.fb || fb, euX = opcoes.eu || eu;
  const dono = opcoes.dono || donos.get(a.donoId) || {};
  const anunciante = opcoes.anunciante || negociosImoveis.get(a.donoId) || {};
  const proprio = !!euX && a.donoId === euX.uid;
  const aoMensagem = opcoes.aoMensagem || ((uid, cartao) => prepararConversa(fbx, euX, uid, cartao));
  const { caixa, sair } = novaJanela("imoveis", tituloImovel(a));
  const fotos = (a.fotos || []).filter(urlSegura);
  const g = el("div", "vd-fotos");
  (fotos.length ? fotos : [TEXTOS.imoveis.img]).forEach((f, i) => { const im = document.createElement("img"); im.src = f; im.alt = `Foto ${i + 1}`; g.appendChild(im); });
  caixa.appendChild(g);
  if (fotos.length > 1) caixa.appendChild(el("div", "vd-fotos-n", `${fotos.length} fotos · deslize para ver`));
  const ct = el("div", "conteudo");
  const cab = el("div", "vd-cab");
  const preco = el("div", "vd-preco", precoImovel(a));
  const tags = el("div", "vt-sub");
  tags.appendChild(el("span", "vt-tag", FINALIDADE[a.finalidade] || "Imóvel"));
  tags.appendChild(el("span", "vt-tag neutra", CATEGORIAS.imoveis[a.categoria] || "Imóvel"));
  if (a.mobiliado) tags.appendChild(el("span", "vt-tag neutra", "Mobiliado"));
  const local = [a.bairro, a.cidade].filter(Boolean).join(", ");
  if (local) { const s = el("span", "vt-local"); s.append(icone("pin"), document.createTextNode(local)); tags.appendChild(s); }
  cab.append(preco, el("h3", null, tituloImovel(a)), tags);
  ct.appendChild(cab);
  ct.appendChild(specsImovel(a));
  const fatos = fatosBox([["casa", moeda(a.condominio), "condomínio"], ["casa", moeda(a.iptu), "IPTU"]]);
  if (fatos) ct.appendChild(fatos);
  if (a.descricao) { ct.appendChild(titulo4("Descrição")); ct.appendChild(el("p", "texto", a.descricao)); }

  // anunciante
  ct.appendChild(titulo4("Anunciante"));
  const box = el("div", "vd-anunciante");
  const info = el("div", "tx");
  info.append(linkCriador(a.donoId, dono, opcoes.aoPerfil));
  const papel = [ANUNCIANTE[anunciante.tipoAnunciante], anunciante.creci ? `CRECI ${anunciante.creci}` : ""].filter(Boolean).join(" · ");
  if (papel) info.appendChild(el("small", null, papel));
  box.appendChild(info);
  ct.appendChild(box);
  // outros imóveis do mesmo anunciante
  const outros = el("div", "vd-imoveis linha");
  ct.appendChild(outros);
  buscarAnuncios(fbx, a.donoId).then((lista) => {
    const resto = lista.filter((x) => x.id !== a.id);
    if (!resto.length) return;
    outros.before(titulo4("Outros imóveis deste anunciante"));
    resto.forEach((x) => outros.appendChild(miniImovel(x, () => { sair(); abrirAnuncio(x, opcoes); })));
  }).catch(() => {});

  ct.appendChild(barraContato({
    proprio, sair, aoEditar: opcoes.aoEditar ? () => opcoes.aoEditar(anunciante) : null, editarHref: "usuarios.html?acao=negocio&tipo=imoveis",
    texto: "Tenho interesse", whats: a.whatsapp || anunciante.whatsapp, textoWhats: `Olá! Tenho interesse no imóvel "${tituloImovel(a)}" que vi no Help Floripa.`,
    aoMensagem, donoId: a.donoId, cartao: cartaoDeAnuncio(a)
  }));
  caixa.appendChild(ct);
}

// ---------- montagem na página ----------
function montarSecao() {
  const main = document.querySelector("main") || document.body;
  const sec = el("section", "vitrine");
  sec.dataset.tipo = TIPO;
  sec.id = "vitrine";
  const cab = el("div", "vt-cabeca");
  const t = el("div");
  const h = el("h2");
  h.innerHTML = TEXTOS[TIPO].titulo;
  t.append(h, el("p", null, TEXTOS[TIPO].sub));
  const criar = el("a", "vt-criar");
  criar.href = `usuarios.html?acao=negocio&tipo=${TIPO}`;
  criar.append(icone("mais"), document.createTextNode(TEXTOS[TIPO].criar));
  cab.append(t, criar);
  const cont = el("div", "vt-contagem");
  cont.id = "vtContagem";
  const grade = el("div", "vt-grade");
  grade.id = "vtGrade";
  for (let i = 0; i < 3; i++) grade.appendChild(el("div", "vt-esqueleto"));
  sec.append(cab, cont, grade);
  const cta = main.querySelector(".cta-strip");
  if (cta) {
    main.insertBefore(sec, cta);
    const link = cta.querySelector("a");
    if (link) { link.href = `usuarios.html?acao=negocio&tipo=${TIPO}`; link.textContent = TEXTOS[TIPO].criar; }
  } else main.appendChild(sec);
}

function filtroAtual() {
  const chip = document.querySelector("#filterChips .chip.active");
  return { cat: chip?.dataset.filter || "todos", termo: (document.getElementById("searchInput")?.value || "").trim().toLowerCase() };
}

function renderizar() {
  const grade = document.getElementById("vtGrade");
  const { cat, termo } = filtroAtual();
  const lista = todos.filter((n) => {
    const cats = TIPO === "servicos" ? categoriasDe(n) : [n.categoria];
    if (cat !== "todos" && !cats.includes(cat) && n.finalidade !== cat) return false;
    if (!termo) return true;
    const alvo = [n.nome, n.titulo, n.descricao, n.cidade, n.bairro, ...cats.map((c) => CATEGORIAS[TIPO][c]), ...(n.itens || []).map((i) => i?.nome), n.veiculo, donos.get(n.donoId)?.nome].join(" ").toLowerCase();
    return alvo.includes(termo);
  });
  grade.replaceChildren();
  document.getElementById("vtContagem").textContent = todos.length ? `${lista.length} ${lista.length === 1 ? "resultado" : "resultados"}` : "";
  if (!lista.length) {
    const v = el("div", "vt-vazio");
    v.append(el("strong", null, todos.length ? "Nada encontrado com esse filtro" : TEXTOS[TIPO].vazio), todos.length ? "Tente outra categoria ou palavra." : "Seja o primeiro: crie seu perfil de negócio pelo seu perfil.");
    if (!todos.length) { const a = el("a", "vt-criar"); a.href = `usuarios.html?acao=negocio&tipo=${TIPO}`; a.append(icone("mais"), document.createTextNode(TEXTOS[TIPO].criar)); v.append(document.createElement("br"), a); }
    grade.appendChild(v);
    return;
  }
  lista.forEach((n) => {
    const c = TIPO === "imoveis" ? cartaoImovel(n) : CARTAO[TIPO](n);
    const abrir = () => (TIPO === "imoveis" ? abrirAnuncio(n) : abrirDetalhe(n));
    c.tabIndex = 0;
    c.setAttribute("role", "button");
    c.setAttribute("aria-label", `Ver ${n.nome || n.titulo || "detalhes"}`);
    c.addEventListener("click", abrir);
    c.addEventListener("keydown", (e) => { if (e.target === c && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); abrir(); } });
    grade.appendChild(c);
  });
}

function ligarFiltros() {
  const chips = document.getElementById("filterChips");
  if (chips) {
    if (!chips.querySelector('[data-filter="outros"]')) {
      const b = el("button", "chip", "Outros"); b.type = "button"; b.dataset.filter = "outros"; chips.appendChild(b);
      b.addEventListener("click", () => { chips.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === b)); });
    }
    chips.addEventListener("click", (e) => { if (e.target.closest(".chip")) setTimeout(renderizar, 0); });
  }
  document.getElementById("searchInput")?.addEventListener("input", renderizar);
  document.getElementById("searchForm")?.addEventListener("submit", () => setTimeout(() => { renderizar(); document.getElementById("vitrine")?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 0));
}

async function carregarDonos(ids) {
  await Promise.all([...new Set(ids)].map(async (id) => {
    if (donos.has(id)) return;
    try { const s = await fb.getDoc(fb.doc(fb.db, "perfis_publicos", id)); donos.set(id, s.exists() ? s.data() : {}); } catch { donos.set(id, {}); }
  }));
}

async function iniciar() {
  montarSecao();
  ligarFiltros();
  for (let i = 0; i < 100 && (!window.firebaseAuth || !window.firebaseDb); i++) await new Promise((r) => setTimeout(r, 50));
  if (!window.firebaseDb) { todos = []; renderizar(); return; }
  const [auth, firestore] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
  ]);
  fb = { ...firestore, db: window.firebaseDb };
  auth.onAuthStateChanged(window.firebaseAuth, async (u) => {
    if (!u || eu) return;
    eu = u;
    try {
      const negSnap = await fb.getDocs(fb.query(fb.collection(fb.db, "negocios"), fb.where("tipo", "==", TIPO), fb.limit(80)));
      const negocios = negSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((n) => n.nome && n.oculto !== true);
      if (TIPO === "imoveis") {
        negocios.forEach((n) => negociosImoveis.set(n.donoId, n));
        const anSnap = await fb.getDocs(fb.query(fb.collection(fb.db, "anuncios"), fb.where("tipo", "==", "imovel"), fb.limit(120)));
        todos = anSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((a) => a.ativo !== false);
        negocios.filter((n) => n.preco || n.quartos).forEach((n) => todos.push(negocioComoAnuncio(n)));
      } else todos = negocios;
      todos.sort((a, b) => (b.atualizadoEm?.toMillis?.() ?? 0) - (a.atualizadoEm?.toMillis?.() ?? 0));
      await carregarDonos(todos.map((n) => n.donoId));
    } catch (e) {
      console.warn("Vitrine indisponível:", e);
      todos = [];
    }
    renderizar();
    // link direto vindo de uma mensagem
    const pg = new URLSearchParams(location.search);
    const idNeg = pg.get("negocio"), idAn = pg.get("anuncio");
    if (idAn) { const a = todos.find((x) => x.id === idAn); if (a) abrirAnuncio(a); else toast("Este imóvel não está mais disponível."); }
    else if (idNeg) { const n = todos.find((x) => x.id === idNeg); if (n) abrirDetalhe(n); else toast("Este perfil não está mais disponível."); }
  });
}

// Só monta a vitrine nas páginas que informam o tipo (servicos, delivery, shopping, imoveis).
if (TIPO_PAGINA) iniciar();
