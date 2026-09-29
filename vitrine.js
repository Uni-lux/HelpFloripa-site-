// =====================================================
// Vitrine de negócios do Help Floripa
// Carregue assim na página:  <script type="module" src="vitrine.js?tipo=servicos"></script>
// Tipos: servicos | delivery | lojinha | imoveis
// Os negócios são criados no perfil (usuarios.html → bolinha "Criar perfil de negócio").
// =====================================================

const TIPO_PAGINA = new URL(import.meta.url).searchParams.get("tipo");
const TIPO = TIPO_PAGINA || "servicos";

export const CATEGORIAS = {
  servicos: { limpeza: "Limpeza", reformas: "Reformas", beleza: "Saúde e Beleza", transporte: "Transporte", pets: "Pets", outros: "Outros" },
  delivery: { hamburguer: "Hambúrguer", pizza: "Pizza", sushi: "Sushi", doces: "Doces", bebidas: "Bebidas", outros: "Outros" },
  lojinha: { eletronicos: "Eletrônicos", roupas: "Roupas", mercado: "Mercado", casa: "Casa", outros: "Outros" },
  imoveis: { apartamento: "Apartamento", casa: "Casa", kitnet: "Kitnet", terreno: "Terreno", comercial: "Comercial", outros: "Outros" }
};
const TEXTOS = {
  servicos: { titulo: "Profissionais da <span>comunidade</span>", sub: "Autônomos que atendem em Florianópolis e região.", criar: "Oferecer meus serviços", vazio: "Nenhum profissional por aqui ainda", img: "servicos.webp" },
  delivery: { titulo: "Cardápios da <span>vizinhança</span>", sub: "Peça direto com quem faz, sem intermediário.", criar: "Cadastrar meu delivery", vazio: "Nenhum delivery cadastrado ainda", img: "lanchonetes.webp" },
  lojinha: { titulo: "Lojinhas <span>locais</span>", sub: "Produtos de quem vende perto de você.", criar: "Abrir minha lojinha", vazio: "Nenhuma lojinha aberta ainda", img: "shopping.webp" },
  imoveis: { titulo: "Imóveis <span>anunciados</span>", sub: "Aluguel, venda e temporada direto com o anunciante.", criar: "Anunciar meu imóvel", vazio: "Nenhum imóvel anunciado ainda", img: "imoveis.webp" }
};
const FINALIDADE = { aluguel: "Aluguel", venda: "Venda", temporada: "Temporada" };
const MODOS = { domicilio: "Vai até você", local: "No local", online: "Online" };

// ---------- utilitários ----------
const urlSegura = (u) => (/^(https:\/\/|data:image\/)/i.test(String(u || "")) ? String(u) : "");
const iniciais = (n) => { const p = String(n || "?").trim().split(/\s+/); return ((p[0]?.[0] || "?") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase(); };
const moeda = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: Number(v) % 1 ? 2 : 0 }) : "");
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
  lapis: '<path d="M4 20h4L19 9a2.8 2.8 0 00-4-4L4 16v4z"/>'
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
function linkWhats(n, texto) {
  const numero = String(n.whatsapp || "").replace(/\D/g, "");
  if (numero.length < 10) return null;
  const a = el("a", "vt-btn whats");
  a.href = `https://wa.me/${numero.startsWith("55") ? numero : "55" + numero}?text=${encodeURIComponent(texto || `Olá! Vi "${n.nome}" no Help Floripa.`)}`;
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

// ---------- estado ----------
let fb = null, eu = null, todos = [];
const donos = new Map();

async function iniciarConversa(uid) {
  if (!eu) { location.href = "login.html"; return; }
  if (uid === eu.uid) { toast("Esse é o seu próprio negócio."); return; }
  const ids = [eu.uid, uid].sort();
  const id = `${ids[0]}_${ids[1]}`;
  const ref = fb.doc(fb.db, "conversas", id);
  try {
    let existe = false;
    try { existe = (await fb.getDoc(ref)).exists(); } catch {}
    if (!existe) await fb.setDoc(ref, { participantes: ids, ultimaMensagem: "", atualizadoEm: fb.serverTimestamp() }, { merge: true });
    location.href = `mensagens.html?conversa=${encodeURIComponent(id)}`;
  } catch { toast("Não foi possível abrir a conversa."); }
}

function botoesContato(n, { textoPri = "Mensagem", textoWhats } = {}) {
  const box = el("div", "vt-botoes");
  if (eu && n.donoId === eu.uid) {
    const ed = el("a", "vt-btn sec");
    ed.href = `usuarios.html?acao=negocio&tipo=${n.tipo}`;
    ed.append(icone("lapis"), document.createTextNode("Editar"));
    ed.addEventListener("click", (e) => e.stopPropagation());
    box.appendChild(ed);
    return box;
  }
  const w = linkWhats(n, textoWhats);
  const m = el("button", "vt-btn " + (w ? "sec" : "pri"));
  m.type = "button";
  m.append(icone("chat"), document.createTextNode(textoPri));
  m.addEventListener("click", (e) => { e.stopPropagation(); iniciarConversa(n.donoId); });
  box.appendChild(m);
  if (w) box.appendChild(w);
  return box;
}

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
function linhaDono(n) {
  return linkCriador(n.donoId, donos.get(n.donoId) || {});
}

// ---------- cartões por tipo ----------
function cartaoServico(n) {
  const c = el("article", "vt-card vt-servico");
  const topo = el("div", "topo");
  const txt = el("div");
  txt.append(el("h3", "vt-nome", n.nome || "Profissional"));
  const sub = el("div", "vt-sub");
  sub.append(el("span", "vt-tag", CATEGORIAS.servicos[n.categoria] || "Serviços"));
  if (n.cidade) { const s = el("span"); s.append(icone("pin"), document.createTextNode(n.cidade)); sub.appendChild(s); }
  txt.appendChild(sub);
  topo.append(avatar(n.foto, n.nome), txt);
  c.appendChild(topo);
  if (moeda(n.precoDesde)) {
    const p = el("div", "vt-preco-desde");
    p.append(el("small", null, "a partir de"), el("strong", null, moeda(n.precoDesde)));
    c.appendChild(p);
  }
  if (n.descricao) c.appendChild(el("p", "vt-desc", n.descricao));
  const itens = (n.itens || []).filter((i) => i?.nome).slice(0, 3);
  if (itens.length) {
    const ul = el("ul", "vt-lista-serv");
    itens.forEach((i) => { const li = el("li"); li.append(el("span", null, i.nome), el("span", null, moeda(i.preco) || "a combinar")); ul.appendChild(li); });
    c.appendChild(ul);
  }
  if (Array.isArray(n.atendimento) && n.atendimento.length) {
    const m = el("div", "vt-modos");
    n.atendimento.forEach((k) => MODOS[k] && m.appendChild(el("span", "vt-tag neutra", MODOS[k])));
    c.appendChild(m);
  }
  c.append(linhaDono(n), botoesContato(n, { textoPri: "Pedir orçamento", textoWhats: `Olá! Vi seu perfil "${n.nome}" no Help Floripa e gostaria de um orçamento.` }));
  return c;
}

function cartaoDelivery(n) {
  const c = el("article", "vt-card vt-delivery");
  const capa = el("div", "capa");
  const fotoCapa = urlSegura((n.fotos || [])[0]) || TEXTOS.delivery.img;
  capa.style.backgroundImage = `url("${fotoCapa}")`;
  const aberto = abertoAgora(n);
  if (aberto !== null) capa.appendChild(el("span", "vt-tag " + (aberto ? "ok" : "off"), aberto ? "Aberto agora" : "Fechado"));
  capa.appendChild(avatar(n.foto, n.nome, "vt-avatar logo"));
  const corpo = el("div", "corpo");
  const cab = el("div");
  cab.append(el("h3", "vt-nome", n.nome || "Delivery"));
  const sub = el("div", "vt-sub");
  sub.append(el("span", "vt-tag", CATEGORIAS.delivery[n.categoria] || "Delivery"));
  if (n.cidade) { const s = el("span"); s.append(icone("pin"), document.createTextNode(n.cidade)); sub.appendChild(s); }
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
  corpo.appendChild(botoesContato(n, { textoPri: "Fazer pedido", textoWhats: `Olá! Vi o cardápio de "${n.nome}" no Help Floripa e quero fazer um pedido.` }));
  c.append(capa, corpo);
  return c;
}

function cartaoLoja(n) {
  const c = el("article", "vt-card vt-loja");
  const topo = el("div", "topo");
  const txt = el("div");
  txt.append(el("h3", "vt-nome", n.nome || "Lojinha"));
  const sub = el("div", "vt-sub");
  sub.append(el("span", "vt-tag", CATEGORIAS.lojinha[n.categoria] || "Lojinha"));
  (n.entrega || []).forEach((k) => sub.appendChild(el("span", "vt-tag neutra", k === "entrega" ? "Entrega" : "Retirada")));
  txt.appendChild(sub);
  topo.append(avatar(n.foto, n.nome), txt);
  c.appendChild(topo);
  const grade = el("div", "vt-produtos");
  const itens = (n.itens || []).filter((i) => i?.nome).slice(0, 3);
  itens.forEach((i) => {
    const p = el("div", "vt-produto");
    if (urlSegura(i.foto)) p.style.backgroundImage = `url("${i.foto}")`;
    if (moeda(i.preco)) p.appendChild(el("span", null, moeda(i.preco)));
    p.title = i.nome;
    grade.appendChild(p);
  });
  if (!itens.length) grade.appendChild(Object.assign(el("div", "vt-produto vazio", "Produtos em breve"), { style: "grid-column: 1 / -1; aspect-ratio: auto; min-height: 90px" }));
  c.appendChild(grade);
  if (n.descricao) c.appendChild(el("p", "vt-desc", n.descricao));
  c.append(linhaDono(n), botoesContato(n, { textoPri: "Falar com a loja", textoWhats: `Olá! Vi a lojinha "${n.nome}" no Help Floripa.` }));
  return c;
}

function cartaoImovel(n) {
  const c = el("article", "vt-card vt-imovel");
  const g = el("div", "galeria");
  g.style.backgroundImage = `url("${urlSegura((n.fotos || [])[0]) || TEXTOS.imoveis.img}")`;
  g.appendChild(el("span", "vt-tag", FINALIDADE[n.finalidade] || "Imóvel"));
  const nFotos = (n.fotos || []).filter(urlSegura).length;
  if (nFotos > 1) { const s = el("span", "fotos-n"); s.append(icone("foto"), document.createTextNode(String(nFotos))); g.appendChild(s); }
  if (moeda(n.preco)) {
    const p = el("div", "preco", moeda(n.preco));
    if (n.finalidade === "aluguel") p.appendChild(el("small", null, " /mês"));
    if (n.finalidade === "temporada") p.appendChild(el("small", null, " /diária"));
    g.appendChild(p);
  }
  const corpo = el("div", "corpo");
  corpo.append(el("h3", "vt-nome", n.nome || `${CATEGORIAS.imoveis[n.categoria] || "Imóvel"} para ${FINALIDADE[n.finalidade]?.toLowerCase() || "negociar"}`));
  const sub = el("div", "vt-sub");
  const local = [n.bairro, n.cidade].filter(Boolean).join(", ");
  if (local) { const s = el("span"); s.append(icone("pin"), document.createTextNode(local)); sub.appendChild(s); }
  sub.appendChild(el("span", "vt-tag neutra", CATEGORIAS.imoveis[n.categoria] || "Imóvel"));
  if (n.mobiliado) sub.appendChild(el("span", "vt-tag neutra", "Mobiliado"));
  corpo.appendChild(sub);
  const specs = el("div", "vt-specs");
  [["cama", n.quartos, "quartos"], ["banho", n.banheiros, "banheiros"], ["carro", n.vagas, "vagas"], ["area", n.area ? `${n.area}` : "", "m²"]].forEach(([ic, v, rot]) => {
    const d = el("div");
    const s = el("strong");
    s.append(icone(ic), document.createTextNode(v === 0 || v ? String(v) : "–"));
    d.append(s, document.createTextNode(rot));
    specs.appendChild(d);
  });
  corpo.appendChild(specs);
  if (moeda(n.condominio)) corpo.appendChild(el("div", "vt-sub", `Condomínio ${moeda(n.condominio)}`));
  corpo.append(linhaDono(n), botoesContato(n, { textoPri: "Tenho interesse", textoWhats: `Olá! Tenho interesse no imóvel "${n.nome || "anunciado"}" que vi no Help Floripa.` }));
  c.append(g, corpo);
  return c;
}

const CARTAO = { servicos: cartaoServico, delivery: cartaoDelivery, lojinha: cartaoLoja, imoveis: cartaoImovel };

// ---------- detalhe ----------
// ---------- perfil completo do negócio (detalhe) ----------
// Usado na vitrine e no perfil (usuarios.html), onde o dono vê a pré-visualização.
// opcoes: { dono, proprio, aoMensagem(uid), aoEditar(n) }
export function abrirDetalhe(n, opcoes = {}) {
  const tipo = n.tipo || TIPO;
  const dono = opcoes.dono || donos.get(n.donoId) || {};
  const proprio = opcoes.proprio ?? (!!eu && n.donoId === eu.uid);
  const aoMensagem = opcoes.aoMensagem || iniciarConversa;
  const fundo = el("div", "vt-modal vitrine");
  fundo.dataset.tipo = tipo;
  fundo.setAttribute("role", "dialog");
  fundo.setAttribute("aria-modal", "true");
  fundo.setAttribute("aria-label", n.nome || "Negócio");
  const caixa = el("div", "caixa vd");
  const fechar = el("button", "fechar");
  fechar.type = "button";
  fechar.setAttribute("aria-label", "Fechar");
  fechar.appendChild(icone("fechar", "vi"));
  caixa.appendChild(fechar);

  const fotos = (n.fotos || []).filter(urlSegura);
  // capa
  const capa = el("div", "vd-capa");
  capa.style.backgroundImage = `url("${fotos[0] || TEXTOS[tipo].img}")`;
  const logo = avatar(n.foto, n.nome, "vt-avatar vd-logo");
  capa.appendChild(logo);
  caixa.appendChild(capa);

  const ct = el("div", "conteudo");
  if (proprio) {
    const aviso = el("div", "vd-previa");
    aviso.append(el("span", null, "Pré-visualização: é assim que os outros veem seu perfil de negócio."));
    if (opcoes.aoEditar) { const b = el("button", "vt-btn pri"); b.type = "button"; b.append(icone("lapis"), document.createTextNode("Editar")); b.addEventListener("click", () => { sair(); opcoes.aoEditar(n); }); aviso.appendChild(b); }
    ct.appendChild(aviso);
  }
  const cab = el("div", "vd-cab");
  cab.appendChild(el("h3", null, n.nome || TEXTOS[tipo].criar));
  const tags = el("div", "vt-sub");
  tags.appendChild(el("span", "vt-tag", CATEGORIAS[tipo][n.categoria] || ({ servicos: "Serviços", delivery: "Delivery", lojinha: "Lojinha", imoveis: "Imóvel" })[tipo]));
  if (tipo === "delivery") { const ab = abertoAgora(n); if (ab !== null) tags.appendChild(el("span", "vt-tag " + (ab ? "ok" : "off"), ab ? "Aberto agora" : "Fechado")); }
  if (tipo === "imoveis" && n.finalidade) tags.appendChild(el("span", "vt-tag neutra", FINALIDADE[n.finalidade]));
  const local = [n.bairro, n.cidade].filter(Boolean).join(", ");
  if (local) { const s2 = el("span"); s2.append(icone("pin"), document.createTextNode(local)); tags.appendChild(s2); }
  cab.appendChild(tags);
  cab.appendChild(linkCriador(n.donoId, dono, opcoes.aoPerfil));
  ct.appendChild(cab);

  // fatos principais de cada tipo
  const fatos = el("div", "vd-fatos");
  const fato = (ic, valor, rotulo) => { if (valor === "" || valor == null) return; const f = el("div", "vd-fato"); f.append(icone(ic, "vi"), el("strong", null, String(valor)), el("small", null, rotulo)); fatos.appendChild(f); };
  if (tipo === "servicos") {
    fato("sacola", moeda(n.precoDesde) || "A combinar", "a partir de");
    fato("relogio", n.horario || "", "horário");
    (n.atendimento || []).forEach((k) => MODOS[k] && fato("casa", MODOS[k], "atendimento"));
  }
  if (tipo === "delivery") {
    fato("relogio", n.horaAbre && n.horaFecha ? `${n.horaAbre}–${n.horaFecha}` : "", "funcionamento");
    fato("moto", n.tempoMin || n.tempoMax ? `${n.tempoMin || "?"}–${n.tempoMax || "?"} min` : "", "entrega");
    fato("moto", Number(n.taxaEntrega) > 0 ? moeda(n.taxaEntrega) : "Grátis", "taxa");
    fato("sacola", moeda(n.pedidoMinimo), "pedido mínimo");
  }
  if (tipo === "lojinha") {
    (n.entrega || []).forEach((k) => fato(k === "entrega" ? "moto" : "sacola", k === "entrega" ? "Entrega" : "Retirada", "como receber"));
    fato("sacola", (n.itens || []).filter((i) => i?.nome).length || "", "produtos");
  }
  if (tipo === "imoveis") {
    fato("sacola", moeda(n.preco) ? moeda(n.preco) + (n.finalidade === "aluguel" ? "/mês" : n.finalidade === "temporada" ? "/dia" : "") : "", FINALIDADE[n.finalidade] || "preço");
    fato("cama", n.quartos ?? "", "quartos");
    fato("banho", n.banheiros ?? "", "banheiros");
    fato("carro", n.vagas ?? "", "vagas");
    fato("area", n.area ? `${n.area} m²` : "", "área");
    fato("casa", moeda(n.condominio), "condomínio");
    if (n.mobiliado) fato("casa", "Sim", "mobiliado");
  }
  if (fatos.children.length) ct.appendChild(fatos);

  if (n.descricao) { ct.appendChild(el("h4", null, tipo === "imoveis" ? "Descrição do imóvel" : "Sobre")); ct.appendChild(el("p", "texto", n.descricao)); }

  const itens = (n.itens || []).filter((i) => i?.nome);
  if (itens.length) {
    ct.appendChild(el("h4", null, tipo === "delivery" ? "Cardápio" : tipo === "lojinha" ? "Produtos" : "Serviços e preços"));
    if (tipo === "servicos") {
      const ul = el("ul", "vt-lista-serv");
      itens.forEach((i) => { const li = el("li"); li.append(el("span", null, i.nome), el("span", null, moeda(i.preco) || "a combinar")); ul.appendChild(li); });
      ct.appendChild(ul);
    } else {
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
  }

  const galeria = tipo === "delivery" ? [] : fotos;
  if (galeria.length) {
    ct.appendChild(el("h4", null, tipo === "imoveis" ? "Fotos do imóvel" : "Fotos"));
    const g = el("div", "vd-galeria");
    galeria.forEach((f, i) => { const im = document.createElement("img"); im.src = f; im.alt = `Foto ${i + 1}`; im.loading = "lazy"; im.addEventListener("click", () => window.open(f, "_blank", "noopener")); g.appendChild(im); });
    ct.appendChild(g);
  }

  // barra de contato
  const barra = el("div", "vd-acoes");
  if (proprio) {
    if (opcoes.aoEditar) { const b = el("button", "vt-btn pri"); b.type = "button"; b.append(icone("lapis"), document.createTextNode("Editar perfil de negócio")); b.addEventListener("click", () => { sair(); opcoes.aoEditar(n); }); barra.appendChild(b); }
    else { const a = el("a", "vt-btn pri"); a.href = `usuarios.html?acao=negocio&tipo=${tipo}`; a.append(icone("lapis"), document.createTextNode("Editar")); barra.appendChild(a); }
  } else {
    const textos = { servicos: "Pedir orçamento", delivery: "Fazer pedido", lojinha: "Falar com a loja", imoveis: "Tenho interesse" };
    const w = linkWhats(n);
    const m = el("button", "vt-btn " + (w ? "sec" : "pri"));
    m.type = "button";
    m.append(icone("chat"), document.createTextNode(textos[tipo]));
    m.addEventListener("click", () => aoMensagem(n.donoId));
    barra.appendChild(m);
    if (w) barra.appendChild(w);
  }
  ct.appendChild(barra);

  caixa.appendChild(ct);
  fundo.appendChild(caixa);
  const sair = () => { fundo.remove(); document.removeEventListener("keydown", tecla); };
  const tecla = (e) => { if (e.key === "Escape") sair(); };
  fundo.addEventListener("click", (e) => { if (e.target === fundo) sair(); });
  fechar.addEventListener("click", sair);
  document.addEventListener("keydown", tecla);
  document.body.appendChild(fundo);
  fechar.focus();
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
    if (cat !== "todos" && n.categoria !== cat && n.finalidade !== cat) return false;
    if (!termo) return true;
    const alvo = [n.nome, n.descricao, n.cidade, n.bairro, CATEGORIAS[TIPO][n.categoria], ...(n.itens || []).map((i) => i?.nome), donos.get(n.donoId)?.nome].join(" ").toLowerCase();
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
    const c = CARTAO[TIPO](n);
    c.tabIndex = 0;
    c.setAttribute("role", "button");
    c.setAttribute("aria-label", `Ver ${n.nome || "negócio"}`);
    c.addEventListener("click", () => abrirDetalhe(n));
    c.addEventListener("keydown", (e) => { if (e.target === c && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); abrirDetalhe(n); } });
    grade.appendChild(c);
  });
}

function ligarFiltros() {
  const chips = document.getElementById("filterChips");
  if (chips) {
    // Garante um chip "Outros" e liga as categorias dos cadastros aos chips da página.
    if (!chips.querySelector('[data-filter="outros"]')) {
      const b = el("button", "chip", "Outros"); b.type = "button"; b.dataset.filter = "outros"; chips.appendChild(b);
      b.addEventListener("click", () => { chips.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === b)); });
    }
    chips.addEventListener("click", (e) => { if (e.target.closest(".chip")) setTimeout(renderizar, 0); });
  }
  const busca = document.getElementById("searchInput");
  busca?.addEventListener("input", renderizar);
  document.getElementById("searchForm")?.addEventListener("submit", () => setTimeout(() => { renderizar(); document.getElementById("vitrine")?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 0));
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
      const snap = await fb.getDocs(fb.query(fb.collection(fb.db, "negocios"), fb.where("tipo", "==", TIPO), fb.limit(80)));
      todos = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((n) => n.nome && n.oculto !== true);
      todos.sort((a, b) => (b.atualizadoEm?.toMillis?.() ?? 0) - (a.atualizadoEm?.toMillis?.() ?? 0));
      const ids = [...new Set(todos.map((n) => n.donoId))];
      await Promise.all(ids.map(async (id) => {
        try { const s = await fb.getDoc(fb.doc(fb.db, "perfis_publicos", id)); donos.set(id, s.exists() ? s.data() : {}); } catch { donos.set(id, {}); }
      }));
    } catch (e) {
      console.warn("Vitrine indisponível:", e);
      todos = [];
    }
    renderizar();
  });
}

// Só monta a vitrine nas páginas que informam o tipo (servicos, delivery, shopping, imoveis).
if (TIPO_PAGINA) iniciar();
