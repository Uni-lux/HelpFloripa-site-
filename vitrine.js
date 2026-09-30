// =====================================================
// Vitrine de negócios do Help Floripa
// Na página:  <script type="module" src="vitrine.js?tipo=servicos"></script>
// Tipos: servicos | delivery | lojinha | imoveis
// Negócios: coleção "negocios" (um perfil de cada tipo por pessoa).
// Imóveis:  coleção "anuncios" (vários imóveis por pessoa).
// Links diretos: pagina.html?negocio=ID  ·  imoveis.html?anuncio=ID
// =====================================================

import { fotoSegura, conferirEmail, emailPendente, mostrarAvisoEmail, MSG_EMAIL } from "./seguranca.js?v=1";
import { estrelas, pintarEstrelas, lerResumo, lerResumos, abrirDetalhamento } from "./avaliacoes.js?v=2";

const PARAMS = new URL(import.meta.url).searchParams;
const TIPO_PAGINA = PARAMS.get("tipo");
const TIPO = TIPO_PAGINA || "servicos";

export const CORES_TIPO = { servicos: "#00adee", delivery: "#ff7a1a", lojinha: "#b066ff", imoveis: "#2fbf71" };
export const NOMES_TIPO = { servicos: "Serviços", delivery: "Delivery", lojinha: "Lojinha", imoveis: "Imóveis" };
export const PAGINA_TIPO = { servicos: "servicos.html", delivery: "delivery.html", lojinha: "shopping.html", imoveis: "imoveis.html" };
export const CATEGORIAS = {
  servicos: { limpeza: "Limpeza", reformas: "Reformas", beleza: "Saúde e Beleza", transporte: "Transporte / Motorista", pets: "Pets", outros: "Outros" },
  delivery: { hamburguer: "Hambúrguer", pizza: "Pizza", sushi: "Sushi", doces: "Doces", bebidas: "Bebidas", outros: "Outros" },
  lojinha: { roupas: "Moda e roupas", calcados: "Calçados", acessorios: "Acessórios", beleza: "Beleza", eletronicos: "Eletrônicos", casa: "Casa e decoração", mercado: "Mercado", artesanato: "Artesanato", infantil: "Infantil", esportes: "Esportes", outros: "Outros" },
  imoveis: { apartamento: "Apartamento", casa: "Casa", kitnet: "Kitnet", terreno: "Terreno", comercial: "Comercial", outros: "Outros" }
};
export const FINALIDADE = { aluguel: "Aluguel", venda: "Venda", temporada: "Temporada" };
// Opções usadas no formulário (usuarios.html) e na vitrine.
export const DIAS = { seg: "Seg", ter: "Ter", qua: "Qua", qui: "Qui", sex: "Sex", sab: "Sáb", dom: "Dom" };
export const PAGAMENTOS = { pix: "Pix", credito: "Crédito", debito: "Débito", dinheiro: "Dinheiro", vale: "Vale-refeição" };
export const UNIDADES_SERV = { fixo: "preço fixo", hora: "por hora", m2: "por m²", diaria: "por diária", visita: "por visita", km: "por km", combinar: "a combinar" };
export const DIFERENCIAIS_SERV = { urgencia: "Atendo urgências", orcamentoGratis: "Orçamento grátis", garantia: "Dou garantia", nota: "Emito nota/recibo", material: "Levo o material" };
export const CONDICAO = { novo: "Novo", seminovo: "Seminovo", usado: "Usado" };
export const SECOES_CARDAPIO = ["Destaques", "Lanches", "Pizzas", "Pratos", "Porções", "Combos", "Bebidas", "Sobremesas"];
export const CARACT_IMOVEL = { piscina: "Piscina", churrasqueira: "Churrasqueira", varanda: "Varanda / sacada", elevador: "Elevador", portaria: "Portaria 24h", academia: "Academia", salao: "Salão de festas", ar: "Ar-condicionado", servico: "Área de serviço", quintal: "Quintal", vistaMar: "Vista para o mar", internet: "Internet inclusa", acessivel: "Acessível" };
export const CONDICOES_IMOVEL = { caucao: "Caução", fiador: "Fiador", seguro: "Seguro-fiança", semFiador: "Sem fiador", financiamento: "Aceita financiamento", fgts: "Aceita FGTS", permuta: "Aceita permuta", pets: "Aceita pets" };
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
// Fotos só do próprio site (seguranca.js): evita imagens de terceiros que rastreiam visitantes.
const urlSegura = (u) => fotoSegura(u);
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
  avancar: '<path d="M9 5l7 7-7 7"/>',
  cartao: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
  estrela: '<path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8z"/>',
  menos: '<path d="M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  lixo: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>'
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
  if (Array.isArray(n.dias) && n.dias.length && !n.dias.includes(["dom", "seg", "ter", "qua", "qui", "sex", "sab"][agora.getDay()])) return false;
  return f > a ? m >= a && m < f : m >= a || m < f; // atravessa a meia-noite
}
// Áreas de atuação do profissional (aceita cadastro antigo com uma categoria só).
export const nomeCategoria = (n) => (n.categoria === "outros" && n.categoriaPersonalizada ? n.categoriaPersonalizada : CATEGORIAS[n.tipo]?.[n.categoria] || NOMES_TIPO[n.tipo]);
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
  if (emailPendente(euX)) { mostrarAvisoEmail(euX); toast(MSG_EMAIL); return; }
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

// ---------- carrinho (delivery e lojinha) ----------
// Fica no aparelho do cliente, um carrinho por negócio.
// Chave de cada linha: "índice:nome" e, se tiver, "|t=tamanho" e "|c=cor".
const chaveCarrinho = (n) => `hf-carrinho-${n.id || n.donoId + "_" + n.tipo}`;
const chaveItem = (i, idx, tam = "", cor = "") => `${idx}:${i.nome}` + (tam ? `|t=${tam}` : "") + (cor ? `|c=${cor}` : "");
function lerChave(n, chave) {
  const [base, ...vars] = String(chave).split("|");
  const p = base.indexOf(":");
  const idx = parseInt(base.slice(0, p), 10);
  const i = (n.itens || [])[idx];
  if (!i || i.nome !== base.slice(p + 1)) return null;
  const v = {};
  vars.forEach((x) => { const [k, ...r] = x.split("="); v[k] = r.join("="); });
  return { i, idx, tam: v.t || "", cor: v.c || "" };
}
function lerCarrinho(n) {
  try { const c = JSON.parse(localStorage.getItem(chaveCarrinho(n)) || "{}"); return c && typeof c === "object" ? c : {}; } catch { return {}; }
}
function gravarCarrinho(n, c) {
  try { if (Object.keys(c).length) localStorage.setItem(chaveCarrinho(n), JSON.stringify(c)); else localStorage.removeItem(chaveCarrinho(n)); } catch {}
}
function mudarCarrinho(n, chave, q) {
  const c = lerCarrinho(n);
  if (q > 0) c[chave] = q; else delete c[chave];
  gravarCarrinho(n, c);
}
const estoqueDe = (i) => (Number.isInteger(i.estoque) ? i.estoque : null);
const limiteItem = (i) => (estoqueDe(i) ?? 99);
// Quantas unidades ainda cabem nesta linha, somando as variações do mesmo produto.
function maxDaLinha(n, carrinho, chave) {
  const x = lerChave(n, chave);
  if (!x) return 0;
  const outras = Object.entries(carrinho).filter(([k]) => k !== chave && lerChave(n, k)?.idx === x.idx).reduce((s, [, q]) => s + q, 0);
  return Math.max(0, limiteItem(x.i) - outras);
}
const unidadesNoCarrinho = (n) => Object.entries(lerCarrinho(n)).filter(([k]) => lerChave(n, k)).reduce((s, [, q]) => s + q, 0);
function resumoPedido(n, carrinho, modo = "entrega") {
  const linhas = Object.entries(carrinho).map(([chave, q]) => {
    const x = lerChave(n, chave);
    if (!x || !(q > 0)) return null;
    const variacao = [x.tam, x.cor].filter(Boolean).join(", ");
    return { chave, idx: x.idx, item: x.i, nome: String(x.i.nome).slice(0, 60) + (variacao ? ` (${variacao})` : ""), qtd: Math.min(q, limiteItem(x.i)), preco: Number(x.i.preco) > 0 ? Number(x.i.preco) : 0 };
  }).filter(Boolean);
  const subtotal = linhas.reduce((s, l) => s + l.qtd * l.preco, 0);
  const taxa = n.tipo === "delivery" && modo === "entrega" && Number(n.taxaEntrega) > 0 ? Number(n.taxaEntrega) : 0;
  return { linhas, subtotal, taxa, total: subtotal + taxa, unidades: linhas.reduce((s, l) => s + l.qtd, 0), aCombinar: linhas.some((l) => !l.preco) };
}
const reais = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const opcoesRecebimento = (n) => {
  if (n.tipo === "delivery") return Array.isArray(n.opcoesEntrega) && n.opcoesEntrega.length ? n.opcoesEntrega : ["entrega"];
  return Array.isArray(n.entrega) && n.entrega.length ? n.entrega : ["entrega", "retirada"];
};
const pagamentosDe = (n) => (Array.isArray(n.pagamentos) && n.pagamentos.length ? n.pagamentos.filter((k) => PAGAMENTOS[k]) : ["pix", "credito", "debito", "dinheiro"]);
function textoPedidoWhats(n, r, extra) {
  const l = [`Olá! Quero fazer um pedido em "${n.nome}" (vi no Help Floripa):`, ""];
  r.linhas.forEach((x) => l.push(`${x.qtd}x ${x.nome} — ${x.preco ? reais(x.qtd * x.preco) : "a combinar"}`));
  l.push("");
  if (r.taxa) l.push(`Entrega: ${reais(r.taxa)}`);
  l.push(`Total: ${reais(r.total)}${r.aCombinar ? " + itens a combinar" : ""}`);
  if (extra.modo) l.push(extra.modo === "retirada" ? "Vou retirar no local." : `Entregar em: ${extra.endereco || "(combinar)"}`);
  if (extra.pagamento) l.push(`Pagamento: ${PAGAMENTOS[extra.pagamento] || extra.pagamento}${extra.troco ? ` (troco para ${reais(extra.troco)})` : ""}`);
  if (extra.obs) l.push("", `Obs.: ${extra.obs}`);
  return l.join("\n");
}
function cartaoDePedido(n, r, extra) {
  return {
    ...cartaoDeNegocio(n),
    titulo: `Pedido · ${n.nome || NOMES_TIPO[n.tipo]}`,
    sub: `${r.unidades} ${r.unidades === 1 ? "item" : "itens"}`,
    preco: reais(r.total) + (r.aCombinar ? " + a combinar" : ""),
    pedido: {
      itens: r.linhas.slice(0, 30).map(({ nome, qtd, preco }) => ({ nome, qtd, preco })),
      subtotal: r.subtotal, taxa: r.taxa, total: r.total, obs: String(extra.obs || "").slice(0, 300),
      modo: extra.modo || "", endereco: String(extra.endereco || "").slice(0, 200),
      pagamento: extra.pagamento || "", troco: Number(extra.troco) > 0 ? Number(extra.troco) : null
    }
  };
}
function controleQtd(qtd, max, aoMudar, rotuloAdd = "Adicionar") {
  const box = el("div", "vd-qtd" + (qtd ? " ativo" : ""));
  if (!qtd) {
    const add = el("button", "vd-add");
    add.type = "button";
    add.append(icone("mais"), document.createTextNode(rotuloAdd));
    add.addEventListener("click", (e) => { e.stopPropagation(); aoMudar(1); });
    box.appendChild(add);
    return box;
  }
  const menos = el("button"); menos.type = "button"; menos.setAttribute("aria-label", "Tirar um"); menos.appendChild(icone(qtd === 1 ? "lixo" : "menos"));
  menos.addEventListener("click", (e) => { e.stopPropagation(); aoMudar(qtd - 1); });
  const mais = el("button"); mais.type = "button"; mais.setAttribute("aria-label", "Mais um"); mais.appendChild(icone("mais"));
  mais.disabled = qtd >= max;
  mais.addEventListener("click", (e) => { e.stopPropagation(); if (qtd < max) aoMudar(qtd + 1); else toast("Não há mais unidades disponíveis."); });
  box.append(menos, el("strong", null, String(qtd)), mais);
  return box;
}
// Grupo de opções em forma de chips (uma ou várias).
function chipsEscolha(opcoes, { multi = false, valor = multi ? [] : "", aoMudar } = {}) {
  const box = el("div", "vd-chips");
  let atual = multi ? new Set(valor) : valor;
  Object.entries(opcoes).forEach(([v, t]) => {
    const b = el("button", "vd-chip", t);
    b.type = "button";
    const marcado = () => (multi ? atual.has(v) : atual === v);
    b.classList.toggle("on", marcado());
    b.addEventListener("click", () => {
      if (multi) { atual.has(v) ? atual.delete(v) : atual.add(v); } else atual = atual === v ? "" : v;
      box.querySelectorAll(".vd-chip").forEach((x, i) => x.classList.toggle("on", multi ? atual.has(Object.keys(opcoes)[i]) : atual === Object.keys(opcoes)[i]));
      aoMudar?.(multi ? [...atual] : atual);
    });
    box.appendChild(b);
  });
  return box;
}
function campoVd(rotulo, ...filhos) {
  const c = el("div", "vd-campo");
  c.append(el("label", null, rotulo), ...filhos);
  return c;
}
// Endereço salvo nas Configurações (só o próprio usuário consegue ler).
async function enderecoSalvo(fbx, euX) {
  if (!fbx || !euX) return null;
  try { const s = await fbx.getDoc(fbx.doc(fbx.db, "usuarios", euX.uid)); return s.exists() ? s.data().endereco || null : null; } catch { return null; }
}
const enderecoEmTexto = (e) => (e ? [[e.rua, e.numero].filter(Boolean).join(", "), e.complemento, e.bairro, e.referencia ? `ref.: ${e.referencia}` : ""].filter(Boolean).join(" · ") : "");

// Janela do pedido: lista com as unidades, soma, entrega ou retirada, pagamento e envio.
function abrirPedido(n, opcoes, aoMudar) {
  const fbx = opcoes.fb || fb, euX = opcoes.eu || eu;
  const { caixa, sair } = novaJanela(n.tipo, "Seu pedido");
  caixa.classList.add("vd-pedido");
  const ct = el("div", "conteudo");
  caixa.appendChild(ct);
  const receb = opcoesRecebimento(n);
  const estado = { modo: receb[0], pagamento: "", troco: null, endereco: "", obs: "" };
  const pintar = () => {
    const carrinho = lerCarrinho(n);
    const r = resumoPedido(n, carrinho, estado.modo);
    ct.replaceChildren();
    const cab = el("div", "vd-cab");
    cab.append(el("h3", null, "Seu pedido"), el("div", "vt-sub", n.nome || NOMES_TIPO[n.tipo]));
    ct.appendChild(cab);
    if (!r.linhas.length) {
      ct.appendChild(el("p", "vt-sub", "Seu carrinho está vazio."));
      const v = el("button", "vt-btn sec"); v.type = "button"; v.textContent = n.tipo === "delivery" ? "Voltar ao cardápio" : "Voltar à loja"; v.addEventListener("click", sair);
      ct.appendChild(v);
      return;
    }
    const ul = el("ul", "vd-pedido-lista");
    r.linhas.forEach((x) => {
      const li = el("li");
      const tx = el("div", "tx");
      tx.append(el("strong", null, x.nome), el("small", null, x.preco ? `${reais(x.preco)} cada` : "preço a combinar"));
      li.append(controleQtd(x.qtd, maxDaLinha(n, carrinho, x.chave), (q) => { mudarCarrinho(n, x.chave, q); aoMudar?.(); pintar(); }), tx, el("span", "vl", x.preco ? reais(x.qtd * x.preco) : "—"));
      ul.appendChild(li);
    });
    ct.appendChild(ul);

    // entrega ou retirada
    if (receb.length > 1) {
      ct.appendChild(campoVd("Como você quer receber?", chipsEscolha(Object.fromEntries(receb.map((k) => [k, k === "entrega" ? "Entrega" : "Retirar no local"])), { valor: estado.modo, aoMudar: (v) => { estado.modo = v || receb[0]; pintar(); } })));
    } else ct.appendChild(el("p", "vd-dica", receb[0] === "retirada" ? "Este negócio trabalha só com retirada no local." : "Pedido para entrega."));
    if (estado.modo === "entrega") {
      const end = document.createElement("textarea");
      end.className = "vd-obs curto";
      end.maxLength = 200;
      end.placeholder = "Rua, número, bairro e ponto de referência";
      end.value = estado.endereco;
      end.addEventListener("input", () => { estado.endereco = end.value; });
      const usar = el("button", "vd-link");
      usar.type = "button";
      usar.append(icone("pin"), document.createTextNode("Usar meu endereço salvo"));
      usar.addEventListener("click", async () => {
        const e = await enderecoSalvo(fbx, euX);
        if (!e) { toast("Você ainda não salvou um endereço. Cadastre em Configurações > Endereço."); return; }
        estado.endereco = enderecoEmTexto(e); end.value = estado.endereco;
      });
      const c = campoVd("Endereço de entrega", end, usar);
      c.appendChild(el("small", "vd-nota", "O endereço vai só para a loja, dentro desta conversa."));
      ct.appendChild(c);
    }
    // pagamento
    const pags = pagamentosDe(n);
    if (!pags.includes(estado.pagamento)) estado.pagamento = pags[0];
    ct.appendChild(campoVd("Forma de pagamento", chipsEscolha(Object.fromEntries(pags.map((k) => [k, PAGAMENTOS[k]])), { valor: estado.pagamento, aoMudar: (v) => { estado.pagamento = v || pags[0]; pintar(); } })));
    if (estado.pagamento === "dinheiro") {
      const tr = document.createElement("input");
      tr.className = "vd-input"; tr.inputMode = "decimal"; tr.placeholder = "Ex.: 100 (deixe vazio se não precisa)";
      tr.value = estado.troco ? String(estado.troco) : "";
      tr.addEventListener("input", () => { const v = Number(tr.value.replace(",", ".")); estado.troco = v > 0 ? v : null; });
      ct.appendChild(campoVd("Troco para quanto?", tr));
    }

    const tot = el("div", "vd-totais");
    const linha = (a, b, cls) => { const d = el("div", cls || ""); d.append(el("span", null, a), el("span", null, b)); tot.appendChild(d); };
    linha(`Subtotal (${r.unidades} ${r.unidades === 1 ? "item" : "itens"})`, reais(r.subtotal));
    if (n.tipo === "delivery") linha(estado.modo === "retirada" ? "Retirada" : "Entrega", estado.modo === "retirada" ? "Sem taxa" : r.taxa ? reais(r.taxa) : "Grátis");
    linha("Total", reais(r.total) + (r.aCombinar ? " + a combinar" : ""), "total");
    ct.appendChild(tot);
    const minimo = Number(n.pedidoMinimo) > 0 ? Number(n.pedidoMinimo) : 0;
    if (minimo && r.subtotal < minimo) ct.appendChild(el("p", "vd-aviso", `Pedido mínimo: ${reais(minimo)}. Faltam ${reais(minimo - r.subtotal)}.`));
    const obsCampo = document.createElement("textarea");
    obsCampo.className = "vd-obs";
    obsCampo.maxLength = 300;
    obsCampo.placeholder = n.tipo === "delivery" ? "Observações: sem cebola, ponto da carne, interfone..." : "Observações: presente, horário para retirar...";
    obsCampo.value = estado.obs;
    obsCampo.addEventListener("input", () => { estado.obs = obsCampo.value; });
    ct.appendChild(obsCampo);
    const barra = el("div", "vd-acoes");
    const validar = () => {
      if (minimo && r.subtotal < minimo) { toast(`O pedido mínimo é ${reais(minimo)}.`); return false; }
      if (estado.modo === "entrega" && estado.endereco.trim().length < 6) { toast("Informe o endereço de entrega."); return false; }
      return true;
    };
    const extra = () => ({ ...estado, obs: estado.obs.trim(), endereco: estado.modo === "entrega" ? estado.endereco.trim() : "" });
    const env = el("button", "vt-btn pri");
    env.type = "button";
    env.append(icone("chat"), document.createTextNode("Enviar pedido"));
    env.addEventListener("click", () => {
      if (!validar()) return;
      const cartao = cartaoDePedido(n, resumoPedido(n, lerCarrinho(n), estado.modo), extra());
      gravarCarrinho(n, {});
      document.querySelectorAll(".vt-modal").forEach((m) => m.remove());
      (opcoes.aoMensagem || conversar)(n.donoId, cartao);
    });
    barra.appendChild(env);
    const w = linkWhats(n.whatsapp, "");
    if (w) {
      w.addEventListener("click", (e) => {
        if (!validar()) { e.preventDefault(); return; }
        w.href = w.href.split("?")[0] + "?text=" + encodeURIComponent(textoPedidoWhats(n, resumoPedido(n, lerCarrinho(n), estado.modo), extra()));
      });
      barra.appendChild(w);
    }
    ct.appendChild(barra);
    const limpar = el("button", "vd-limpar", "Esvaziar carrinho");
    limpar.type = "button";
    limpar.addEventListener("click", () => { if (confirm("Tirar todos os itens do carrinho?")) { gravarCarrinho(n, {}); aoMudar?.(); pintar(); } });
    ct.appendChild(limpar);
  };
  pintar();
}

// ---------- produto da lojinha (estilo marketplace) ----------
function precoComDesconto(i) {
  const box = el("div", "vd-preco-prod");
  const p = Number(i.preco), a = Number(i.precoAntigo);
  if (a > p && p > 0) {
    box.append(el("s", null, moeda(a)), el("strong", null, moeda(p)), el("span", "desc", `-${Math.round((1 - p / a) * 100)}%`));
  } else box.appendChild(el("strong", null, moeda(p) || "Consultar"));
  return box;
}
export function abrirProduto(n, idx, opcoes = {}) {
  const i = (n.itens || [])[idx];
  if (!i) return;
  const euX = opcoes.eu || eu;
  const proprio = opcoes.proprio ?? (!!euX && n.donoId === euX.uid);
  const { caixa, sair } = novaJanela(n.tipo, i.nome);
  caixa.classList.add("vd-produto");
  const foto = el("div", "vd-prod-foto");
  if (urlSegura(i.foto)) foto.style.backgroundImage = `url("${i.foto}")`; else { foto.classList.add("vazia"); foto.appendChild(icone("foto", "vi")); }
  const est = estoqueDe(i);
  if (est === 0) foto.appendChild(el("span", "vd-selo", "Esgotado"));
  caixa.appendChild(foto);
  const ct = el("div", "conteudo");
  const cab = el("div", "vd-cab");
  const linhaTopo = [CONDICAO[i.condicao] || "", i.marca ? `Marca ${i.marca}` : ""].filter(Boolean).join(" · ");
  if (linhaTopo) cab.appendChild(el("small", "vd-condicao", linhaTopo));
  cab.append(el("h3", null, i.nome), precoComDesconto(i));
  if (est !== null && est > 0) cab.appendChild(el("span", "vt-tag " + (est === 1 ? "" : "neutra"), est === 1 ? "Última unidade" : `${est} disponíveis`));
  ct.appendChild(cab);

  const escolha = { tam: "", cor: "" };
  const tams = Array.isArray(i.tamanhos) ? i.tamanhos.filter(Boolean) : [];
  const cores = Array.isArray(i.cores) ? i.cores.filter(Boolean) : [];
  if (tams.length) ct.appendChild(campoVd("Tamanho", chipsEscolha(Object.fromEntries(tams.map((t) => [t, t])), { aoMudar: (v) => { escolha.tam = v; pintarAcoes(); } })));
  if (cores.length) ct.appendChild(campoVd("Cor", chipsEscolha(Object.fromEntries(cores.map((t) => [t, t])), { aoMudar: (v) => { escolha.cor = v; pintarAcoes(); } })));

  if (i.descricao) { ct.appendChild(titulo4("Descrição")); ct.appendChild(el("p", "texto", i.descricao)); }
  const ficha = String(i.ficha || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const fichaLinhas = [
    ...(i.marca ? [["Marca", i.marca]] : []), ...(CONDICAO[i.condicao] ? [["Estado", CONDICAO[i.condicao]]] : []),
    ...(tams.length ? [["Tamanhos", tams.join(", ")]] : []), ...(cores.length ? [["Cores", cores.join(", ")]] : []),
    ...ficha.map((l) => { const p = l.indexOf(":"); return p > 0 ? [l.slice(0, p).trim(), l.slice(p + 1).trim()] : ["", l]; })
  ];
  if (fichaLinhas.length) {
    ct.appendChild(titulo4("Ficha técnica"));
    const tb = el("dl", "vd-ficha");
    fichaLinhas.forEach(([k, v]) => { tb.append(el("dt", null, k || "•"), el("dd", null, v)); });
    ct.appendChild(tb);
  }
  // loja
  const loja = el("button", "vd-loja-mini");
  loja.type = "button";
  loja.append(avatar(n.foto, n.nome), el("div", null, ""), icone("avancar"));
  loja.children[1].append(el("small", null, "Vendido por"), el("strong", null, n.nome || "Loja"), estrelasNeg(idNegocio(n), { compacto: true, nome: n.nome, donoId: n.donoId, fbx: opcoes.fb || fb }));
  loja.addEventListener("click", () => { sair(); abrirDetalhe(n, opcoes); });
  ct.appendChild(loja);

  const barra = el("div", "vd-acoes");
  ct.appendChild(barra);
  const pintarAcoes = () => {
    barra.replaceChildren();
    if (proprio) { barra.appendChild(el("p", "vd-dica", "Pré-visualização do seu produto.")); return; }
    if (est === 0) { const b = el("button", "vt-btn sec", "Produto esgotado"); b.type = "button"; b.disabled = true; barra.appendChild(b); return; }
    const falta = (tams.length && !escolha.tam) || (cores.length && !escolha.cor);
    const chave = chaveItem(i, idx, escolha.tam, escolha.cor);
    const carrinho = lerCarrinho(n);
    const noCarrinho = carrinho[chave] || 0;
    const add = el("button", "vt-btn sec");
    add.type = "button";
    add.append(icone("sacola"), document.createTextNode(noCarrinho ? `No carrinho (${noCarrinho})` : "Adicionar"));
    const colocar = () => {
      if (falta) { toast(`Escolha ${tams.length && !escolha.tam ? "o tamanho" : "a cor"}.`); return false; }
      if (maxDaLinha(n, carrinho, chave) <= noCarrinho) { toast("Não há mais unidades disponíveis."); return false; }
      mudarCarrinho(n, chave, noCarrinho + 1);
      return true;
    };
    add.addEventListener("click", () => { if (colocar()) { toast("Adicionado ao carrinho"); pintarAcoes(); opcoes.aoMudarCarrinho?.(); } });
    const comprar = el("button", "vt-btn pri");
    comprar.type = "button";
    comprar.textContent = "Comprar";
    comprar.addEventListener("click", () => { if (noCarrinho || colocar()) { opcoes.aoMudarCarrinho?.(); sair(); abrirPedido(n, opcoes, opcoes.aoMudarCarrinho); } });
    barra.append(add, comprar);
  };
  pintarAcoes();
  caixa.appendChild(ct);
}

// ---------- pedido de orçamento (serviços) ----------
const PERIODOS = { manha: "Manhã", tarde: "Tarde", noite: "Noite" };
const QUANDO = { urgente: "Urgente (hoje)", agendar: "Agendar", flexivel: "Sou flexível" };
export function abrirOrcamento(n, opcoes = {}, preIdx = null) {
  const fbx = opcoes.fb || fb, euX = opcoes.eu || eu;
  if (!euX) { location.href = "login.html"; return; }
  const { caixa, sair } = novaJanela("servicos", "Pedir orçamento");
  caixa.classList.add("vd-pedido");
  const ct = el("div", "conteudo");
  caixa.appendChild(ct);
  const itens = (n.itens || []).map((i, idx) => ({ i, idx })).filter(({ i }) => i?.nome);
  const opServ = itens.length ? Object.fromEntries(itens.map(({ i, idx }) => [String(idx), i.nome])) : Object.fromEntries(categoriasDe(n).map((k) => [k, CATEGORIAS.servicos[k] || k]));
  const estado = { servicos: preIdx !== null && opServ[String(preIdx)] ? [String(preIdx)] : (Object.keys(opServ).length === 1 ? Object.keys(opServ) : []), descricao: "", quando: "", data: "", periodo: "", local: "" };
  const modos = n.atendimento || [];

  const cab = el("div", "vd-cab");
  cab.append(el("h3", null, "Pedir orçamento"), linhaNegocioMini(n));
  ct.appendChild(cab);
  if (Object.keys(opServ).length) ct.appendChild(campoVd(itens.length ? "Qual serviço você precisa?" : "Área do serviço", chipsEscolha(opServ, { multi: true, valor: estado.servicos, aoMudar: (v) => { estado.servicos = v; } })));
  const desc = document.createElement("textarea");
  desc.className = "vd-obs";
  desc.maxLength = 600;
  desc.placeholder = "Descreva o que precisa: tamanho do local, quantidade, problema, o que já tentou...";
  desc.addEventListener("input", () => { estado.descricao = desc.value; });
  ct.appendChild(campoVd("Descreva o serviço", desc));

  const quandoBox = el("div");
  const opQuando = { ...QUANDO };
  const pintarQuando = () => {
    quandoBox.replaceChildren(campoVd("Para quando?", chipsEscolha(opQuando, { valor: estado.quando, aoMudar: (v) => { estado.quando = v; pintarQuando(); } })));
    if (estado.quando === "urgente" && !(n.diferenciais || []).includes("urgencia")) quandoBox.appendChild(el("p", "vd-nota", "Este profissional não marcou que atende urgências, mas você pode perguntar."));
    if (estado.quando === "agendar") {
      const d = document.createElement("input");
      d.type = "date"; d.className = "vd-input";
      const hoje = new Date(); d.min = new Date(hoje.getTime() - hoje.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      d.value = estado.data;
      d.addEventListener("change", () => { estado.data = d.value; });
      const g = el("div", "vd-duas");
      g.append(campoVd("Dia", d), campoVd("Período", chipsEscolha(PERIODOS, { valor: estado.periodo, aoMudar: (v) => { estado.periodo = v; } })));
      quandoBox.appendChild(g);
    }
  };
  pintarQuando();
  ct.appendChild(quandoBox);

  if (modos.includes("domicilio") || !modos.length) {
    const loc = document.createElement("input");
    loc.className = "vd-input"; loc.maxLength = 80; loc.placeholder = "Bairro e cidade (ex.: Trindade, Florianópolis)";
    loc.addEventListener("input", () => { estado.local = loc.value; });
    const usar = el("button", "vd-link");
    usar.type = "button";
    usar.append(icone("pin"), document.createTextNode("Usar o bairro do meu endereço"));
    usar.addEventListener("click", async () => {
      const e = await enderecoSalvo(fbx, euX);
      if (!e) { toast("Você ainda não salvou um endereço. Cadastre em Configurações > Endereço."); return; }
      estado.local = [e.bairro, e.cidade].filter(Boolean).join(", "); loc.value = estado.local;
    });
    const c = campoVd("Onde vai ser?", loc, usar);
    c.appendChild(el("small", "vd-nota", "Mande só o bairro agora. O endereço completo você passa depois de combinar."));
    ct.appendChild(c);
  } else if (modos.includes("online")) ct.appendChild(el("p", "vd-dica", "Atendimento online."));
  else if (modos.includes("local")) ct.appendChild(el("p", "vd-dica", "Atendimento no local do profissional."));

  const montar = () => {
    const nomes = estado.servicos.map((k) => opServ[k]).filter(Boolean);
    return {
      servicos: nomes.slice(0, 12), descricao: estado.descricao.trim().slice(0, 600),
      quando: { tipo: estado.quando, data: estado.quando === "agendar" ? estado.data : "", periodo: estado.quando === "agendar" ? estado.periodo : "" },
      local: estado.local.trim().slice(0, 80),
      modo: modos.includes("domicilio") ? "domicilio" : modos[0] || ""
    };
  };
  const validar = () => {
    if (Object.keys(opServ).length > 1 && !estado.servicos.length) { toast("Escolha o serviço que você precisa."); return false; }
    if (estado.descricao.trim().length < 10) { toast("Descreva o serviço em poucas palavras."); desc.focus(); return false; }
    if (!estado.quando) { toast("Diga para quando você precisa."); return false; }
    if (estado.quando === "agendar" && !estado.data) { toast("Escolha o dia."); return false; }
    return true;
  };
  const barra = el("div", "vd-acoes");
  const env = el("button", "vt-btn pri");
  env.type = "button";
  env.append(icone("chat"), document.createTextNode("Enviar pedido de orçamento"));
  env.addEventListener("click", () => {
    if (!validar()) return;
    const s = montar();
    const cartao = { ...cartaoDeNegocio(n), titulo: `Orçamento · ${n.nome || "Serviços"}`, sub: s.servicos.join(", "), preco: QUANDO[s.quando.tipo] || "", solicitacao: s };
    document.querySelectorAll(".vt-modal").forEach((m) => m.remove());
    (opcoes.aoMensagem || conversar)(n.donoId, cartao);
  });
  barra.appendChild(env);
  const w = linkWhats(n.whatsapp, "");
  if (w) {
    w.addEventListener("click", (e) => {
      if (!validar()) { e.preventDefault(); return; }
      const s = montar();
      const txt = [`Olá! Vi seu perfil "${n.nome}" no Help Floripa e gostaria de um orçamento.`, "",
        s.servicos.length ? `Serviço: ${s.servicos.join(", ")}` : "", `Descrição: ${s.descricao}`,
        `Quando: ${textoQuando(s.quando)}`, s.local ? `Local: ${s.local}` : ""].filter(Boolean).join("\n");
      w.href = w.href.split("?")[0] + "?text=" + encodeURIComponent(txt);
    });
    barra.appendChild(w);
  }
  ct.appendChild(barra);
  setTimeout(() => desc.focus({ preventScroll: true }), 80);
}
export function textoQuando(q) {
  if (!q?.tipo) return "";
  if (q.tipo !== "agendar") return QUANDO[q.tipo] || "";
  let dia = "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(q.data || "")) { const [a, m, d] = q.data.split("-").map(Number); dia = new Date(a, m - 1, d).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }); }
  return ["Agendar", dia, PERIODOS[q.periodo] || ""].filter(Boolean).join(" · ");
}
function linhaNegocioMini(n) {
  const d = el("div", "vd-neg-mini");
  d.append(avatar(n.foto, n.nome), el("span", null, n.nome || NOMES_TIPO[n.tipo]));
  return d;
}

// ---------- estrelas dos negócios ----------
// Resumo das notas de cada perfil de negócio (notas/neg_{id}); imóveis usam o perfil de imóveis do anunciante.
const notasNeg = new Map();
const idNegocio = (n) => n.id || `${n.donoId}_${n.tipo}`;
function estrelasNeg(negId, { compacto = false, nome = "", donoId = "", fbx = null } = {}) {
  const f = fbx || fb;
  const abrir = () => lerResumo(f, "neg_" + negId).then((r) => abrirDetalhamento({
    fbx: f, titulo: nome || "Avaliações", sub: "Notas dadas pelos clientes depois do atendimento", geral: r,
    alvoId: donoId || negId.split("_")[0], filtroTipos: ["negocio"], negocioId: negId
  }));
  const el = estrelas(notasNeg.get(negId) || null, { compacto, aoClicar: abrir });
  if (!notasNeg.has(negId) && f) lerResumo(f, "neg_" + negId).then((r) => { notasNeg.set(negId, r); pintarEstrelas(el, r, { compacto }); });
  return el;
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

function botoes(donoId, { texto, whats, textoWhats, cartao, editarHref, acao }) {
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
  m.addEventListener("click", (e) => { e.stopPropagation(); acao ? acao() : conversar(donoId, cartao); });
  box.appendChild(m);
  if (w) box.appendChild(w);
  return box;
}
const botoesNegocio = (n) => botoes(n.donoId, {
  texto: n.tipo === "delivery" ? "Ver cardápio" : TEXTO_CONTATO[n.tipo], whats: n.whatsapp, cartao: cartaoDeNegocio(n),
  acao: n.tipo === "servicos" ? () => abrirOrcamento(n) : n.tipo === "delivery" ? () => abrirDetalhe(n) : null,
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
  c.appendChild(cabecalhoCartao(n, [estrelasNeg(idNegocio(n), { nome: n.nome, donoId: n.donoId })]));
  const areas = el("div", "vt-areas");
  cats.slice(0, 3).forEach((k) => areas.appendChild(el("span", "vt-tag", CATEGORIAS.servicos[k] || k)));
  if (cats.length > 3) areas.appendChild(el("span", "vt-tag neutra", `+${cats.length - 3}`));
  (n.diferenciais || []).filter((k) => k === "urgencia" || k === "orcamentoGratis").forEach((k) => { const t = el("span", "vt-tag " + (k === "urgencia" ? "urgente" : "ok")); t.append(icone("check", "vi s"), document.createTextNode(DIFERENCIAIS_SERV[k])); areas.appendChild(t); });
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
    itens.forEach((i) => {
      const li = el("li");
      const un = i.unidade && !["fixo", "combinar"].includes(i.unidade) && moeda(i.preco) ? ` ${UNIDADES_SERV[i.unidade]}` : "";
      li.append(el("span", null, i.nome), el("span", null, i.unidade === "combinar" ? "a combinar" : (moeda(i.preco) || "a combinar") + un));
      ul.appendChild(li);
    });
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
  sub.append(estrelasNeg(idNegocio(n), { compacto: true, nome: n.nome, donoId: n.donoId }), el("span", "vt-tag", nomeCategoria(n)));
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
  sub.appendChild(estrelasNeg(`${a.donoId}_imoveis`, { compacto: true, nome: (negociosImoveis.get(a.donoId) || {}).nome || "Anunciante", donoId: a.donoId }));
  if (a.mobiliado) sub.appendChild(el("span", "vt-tag neutra", "Mobiliado"));
  (a.condicoes || []).filter((k) => k === "pets" || k === "semFiador" || k === "financiamento").slice(0, 2).forEach((k) => sub.appendChild(el("span", "vt-tag", CONDICOES_IMOVEL[k])));
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
  else if (tipo !== "imoveis") tags.appendChild(el("span", "vt-tag", nomeCategoria(n)));
  else tags.appendChild(el("span", "vt-tag", ANUNCIANTE[n.tipoAnunciante] || "Anunciante"));
  if (tipo === "delivery") { const ab = abertoAgora(n); if (ab !== null) tags.appendChild(el("span", "vt-tag " + (ab ? "ok" : "off"), ab ? "Aberto agora" : "Fechado")); }
  if (n.cidade) { const s2 = el("span", "vt-local"); s2.append(icone("pin"), document.createTextNode(n.cidade)); tags.appendChild(s2); }
  const notaCab = el("div", "vd-nota-cab");
  notaCab.appendChild(estrelasNeg(idNegocio({ ...n, tipo }), { nome: n.nome, donoId: n.donoId, fbx }));
  cab.append(tags, notaCab, linkCriador(n.donoId, dono, opcoes.aoPerfil));
  ct.appendChild(cab);

  const listaDias = (d) => (Array.isArray(d) && d.length ? (d.length === 7 ? "Todos os dias" : Object.keys(DIAS).filter((k) => d.includes(k)).map((k) => DIAS[k]).join(", ")) : "");
  const listaPag = (p) => (Array.isArray(p) && p.length ? p.filter((k) => PAGAMENTOS[k]).map((k) => PAGAMENTOS[k]).join(", ") : "");
  const fatos = {
    servicos: () => [["sacola", moeda(n.precoDesde) || "A combinar", "a partir de"], ["relogio", [listaDias(n.dias), n.horario].filter(Boolean).join(" · "), "atendimento"],
      ["casa", (n.atendimento || []).filter((k) => MODOS[k]).map((k) => MODOS[k]).join(" · "), "como atende"],
      ["pin", n.regiao || "", "região"], ["selo", Number(n.experiencia) > 0 ? `${n.experiencia} ${Number(n.experiencia) === 1 ? "ano" : "anos"}` : "", "experiência"],
      ["cnh", Array.isArray(n.cnh) && n.cnh.length ? n.cnh.join(" · ") : "", "CNH"], ["carro", n.veiculo || "", "veículo"],
      ["cartao", listaPag(n.pagamentos), "pagamento"]],
    delivery: () => [["relogio", [listaDias(n.dias), n.horaAbre && n.horaFecha ? `${n.horaAbre}–${n.horaFecha}` : ""].filter(Boolean).join(" · "), "funcionamento"],
      ["moto", n.tempoMin || n.tempoMax ? `${n.tempoMin || "?"}–${n.tempoMax || "?"} min` : "", "tempo de entrega"],
      ["moto", Number(n.taxaEntrega) > 0 ? moeda(n.taxaEntrega) : "Grátis", "taxa de entrega"], ["sacola", moeda(n.pedidoMinimo), "pedido mínimo"],
      ["casa", opcoesRecebimento(n).map((k) => (k === "entrega" ? "Entrega" : "Retirada")).join(" · "), "como receber"],
      ["cartao", listaPag(n.pagamentos), "pagamento"]],
    lojinha: () => [["moto", (n.entrega || []).map((k) => (k === "entrega" ? "Entrega" : "Retirada")).join(" · "), "como receber"],
      ["sacola", (n.itens || []).filter((i) => i?.nome).length || "", "produtos"], ["cartao", listaPag(n.pagamentos), "pagamento"]],
    imoveis: () => [["selo", n.creci || "", "CRECI"]]
  }[tipo]();
  if (tipo === "servicos" && Array.isArray(n.diferenciais) && n.diferenciais.length) {
    const d = el("div", "vd-diferenciais");
    n.diferenciais.filter((k) => DIFERENCIAIS_SERV[k]).forEach((k) => { const t = el("span", "vt-tag" + (k === "urgencia" ? " urgente" : "")); t.append(icone("check"), document.createTextNode(DIFERENCIAIS_SERV[k])); d.appendChild(t); });
    if (d.children.length) ct.appendChild(d);
  }
  const fb1 = fatosBox(fatos);
  if (fb1) ct.appendChild(fb1);
  if (n.descricao) { ct.appendChild(titulo4("Sobre")); ct.appendChild(el("p", "texto", n.descricao)); }

  const itens = (n.itens || []).filter((i) => i?.nome);
  const orcar = (idx = null) => (proprio ? null : abrirOrcamento(n, { ...opcoes, fb: fbx, eu: euX, aoMensagem }, idx));
  if (tipo === "servicos" && itens.length) {
    // serviços agrupados por área de atuação, cada um com como cobra, duração e o que inclui
    const cats = categoriasDe(n);
    const comIdx = (n.itens || []).map((i, idx) => ({ i, idx })).filter(({ i }) => i?.nome);
    const grupos = [...cats, ""].map((k) => [k, comIdx.filter(({ i }) => (i.categoria || "") === k || (!k && !cats.includes(i.categoria || "")))]).filter(([, l]) => l.length);
    ct.appendChild(titulo4("Serviços e preços"));
    grupos.forEach(([k, lista]) => {
      if (grupos.length > 1) ct.appendChild(el("div", "vd-subtitulo", k ? CATEGORIAS.servicos[k] || k : "Outros serviços"));
      const ul = el("div", "vd-servicos");
      lista.forEach(({ i, idx }) => {
        const li = el("div", "vd-serv");
        const tx = el("div", "tx");
        tx.appendChild(el("strong", null, i.nome));
        const meta = [i.duracao ? `⏱ ${i.duracao}` : ""].filter(Boolean).join(" · ");
        if (meta) tx.appendChild(el("small", null, meta));
        if (i.descricao) tx.appendChild(el("p", null, i.descricao));
        const pr = el("div", "pr");
        const unidade = i.unidade && i.unidade !== "fixo" && i.unidade !== "combinar" ? UNIDADES_SERV[i.unidade] : "";
        pr.append(el("strong", null, i.unidade === "combinar" ? "A combinar" : moeda(i.preco) || "A combinar"));
        if (unidade && moeda(i.preco)) pr.appendChild(el("small", null, unidade));
        if (!proprio) {
          const b = el("button", "vd-pedir", "Pedir");
          b.type = "button";
          b.addEventListener("click", () => orcar(idx));
          pr.appendChild(b);
        }
        li.append(tx, pr);
        ul.appendChild(li);
      });
      ct.appendChild(ul);
    });
  } else if ((tipo === "delivery" || tipo === "lojinha") && itens.length) {
    const comIdx = (n.itens || []).map((i, idx) => ({ i, idx })).filter(({ i }) => i?.nome);
    ct.appendChild(titulo4(tipo === "delivery" ? "Cardápio" : "Produtos"));
    if (!proprio) ct.appendChild(el("p", "vd-dica", tipo === "delivery" ? "Toque em Adicionar para montar seu pedido. O total vai somando lá embaixo." : "Toque no produto para ver tamanhos, cores e detalhes."));
    const area = el("div", "vd-cardapio-area");
    ct.appendChild(area);
    const barraCarrinho = el("div", "vd-carrinho");
    barraCarrinho.hidden = true;
    const pintarBarraCarrinho = () => {
      if (proprio) return;
      const r = resumoPedido(n, lerCarrinho(n));
      barraCarrinho.hidden = !r.unidades;
      caixa.classList.toggle("com-carrinho", !!r.unidades);
      if (!r.unidades) return;
      barraCarrinho.replaceChildren();
      const info = el("div", "tx");
      const bloco = el("div");
      bloco.append(el("small", null, r.unidades === 1 ? "1 item no carrinho" : `${r.unidades} itens no carrinho`), el("strong", null, reais(r.total) + (r.aCombinar ? " +" : "")));
      info.append(icone("sacola"), el("span", "n", String(r.unidades)), bloco);
      const ver = el("button", "vt-btn pri");
      ver.type = "button";
      ver.append(document.createTextNode("Ver pedido"), icone("avancar"));
      ver.addEventListener("click", () => abrirPedido(n, { ...opcoes, fb: fbx, eu: euX, aoMensagem }, pintarItens));
      barraCarrinho.append(info, ver);
    };
    const opcoesProduto = () => ({ ...opcoes, fb: fbx, eu: euX, aoMensagem, proprio, aoMudarCarrinho: pintarItens });
    const pintarItens = () => {
      const carrinho = lerCarrinho(n);
      area.replaceChildren();
      if (tipo === "delivery") {
        // cardápio por seções, cada prato em linha (texto à esquerda, foto à direita)
        const secoes = [...new Set(comIdx.map(({ i }) => i.secao || "Cardápio"))];
        if (secoes.length > 1) {
          const nav = el("div", "vd-secoes");
          secoes.forEach((sName, k) => { const b = el("button", "vd-chip", sName); b.type = "button"; b.addEventListener("click", () => area.querySelectorAll(".vd-secao-tit")[k]?.scrollIntoView({ behavior: "smooth", block: "start" })); nav.appendChild(b); });
          area.appendChild(nav);
        }
        secoes.forEach((sName) => {
          if (secoes.length > 1) area.appendChild(el("div", "vd-secao-tit", sName));
          const box = el("div", "vd-pratos");
          comIdx.filter(({ i }) => (i.secao || "Cardápio") === sName).forEach(({ i, idx }) => {
            const est = estoqueDe(i);
            const row = el("div", "vd-prato" + (est === 0 ? " esgotado" : ""));
            const tx = el("div", "tx");
            tx.appendChild(el("strong", null, i.nome));
            if (i.descricao) tx.appendChild(el("p", null, i.descricao));
            tx.appendChild(precoComDesconto(i));
            const lado = el("div", "lado");
            if (urlSegura(i.foto)) { const f = el("div", "ft"); f.style.backgroundImage = `url("${i.foto}")`; lado.appendChild(f); }
            else lado.classList.add("sem-foto");
            if (!proprio && est !== 0) {
              const chave = chaveItem(i, idx);
              lado.appendChild(controleQtd(carrinho[chave] || 0, limiteItem(i), (q) => { mudarCarrinho(n, chave, q); pintarItens(); }));
            } else if (est === 0) lado.appendChild(el("span", "vd-selo-inline", "Esgotado"));
            row.append(tx, lado);
            box.appendChild(row);
          });
          area.appendChild(box);
        });
      } else {
        // lojinha: grade de produtos estilo marketplace
        const g = el("div", "vd-itens lojinha");
        comIdx.forEach(({ i, idx }) => {
          const card = cartaoProduto(n, i, idx, { mostrarLoja: false });
          card.addEventListener("click", () => abrirProduto(n, idx, opcoesProduto()));
          if (proprio) {
            const est = estoqueDe(i);
            const v = el("button", "vd-vendi");
            v.type = "button";
            v.append(icone(est === null || est <= 1 ? "lixo" : "check"), document.createTextNode(est === null ? "Tirar da loja" : est <= 1 ? "Vendido · remover" : "Vendi 1"));
            v.addEventListener("click", (e) => { e.stopPropagation(); marcarVendido(idx); });
            card.appendChild(v);
          }
          g.appendChild(card);
        });
        area.appendChild(g);
      }
      pintarBarraCarrinho();
    };
    async function marcarVendido(idx) {
      const item = (n.itens || [])[idx];
      if (!item) return;
      const est = estoqueDe(item);
      const novos = [...n.itens];
      if (est === null || est <= 1) {
        const msg = est === 1 ? `"${item.nome}" foi vendido? Era a última unidade, então ele sai da loja.` : `Tirar "${item.nome}" da loja?`;
        if (!confirm(msg)) return;
        novos.splice(idx, 1);
      } else novos[idx] = { ...item, estoque: est - 1 };
      try {
        await fbx.setDoc(fbx.doc(fbx.db, "negocios", n.id || `${n.donoId}_${n.tipo}`), { itens: novos, atualizadoEm: fbx.serverTimestamp() }, { merge: true });
        n.itens = novos;
        toast(est !== null && est > 1 ? `Venda registrada. Restam ${est - 1}.` : "Produto removido da loja.");
        sair();
        abrirDetalhe(n, opcoes);
        if (TIPO_PAGINA) renderizar();
      } catch { toast("Não foi possível atualizar o produto."); }
    }
    ct.appendChild(barraCarrinho);
    pintarItens();
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
    textoWhats: `Olá! Vi "${n.nome}" no Help Floripa.`, aoMensagem: tipo === "servicos" ? () => orcar() : aoMensagem, donoId: n.donoId, cartao: cartaoDeNegocio(n)
  }));
  // barra do carrinho fica colada no rodapé, no lugar dos botões de contato
  const bc = ct.querySelector(".vd-carrinho");
  if (bc) ct.insertBefore(bc, ct.lastChild);
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
  const custo = (Number(a.preco) || 0) + (a.finalidade === "aluguel" ? (Number(a.condominio) || 0) + (Number(a.iptu) || 0) : 0);
  const fatos = fatosBox([
    ["casa", moeda(a.condominio), "condomínio"], ["cartao", moeda(a.iptu), "IPTU / mês"],
    ["sacola", a.finalidade === "aluguel" && custo > Number(a.preco) ? moeda(custo) : "", "total por mês"],
    ["cama", Number(a.suites) > 0 ? String(a.suites) : "", Number(a.suites) === 1 ? "suíte" : "suítes"],
    ["area", a.andar || "", "andar"], ["relogio", a.disponivel || "", "disponível"],
    ["cama", a.finalidade === "temporada" && Number(a.hospedes) > 0 ? `até ${a.hospedes}` : "", "hóspedes"],
    ["selo", a.mobiliado ? "Sim" : "", "mobiliado"]
  ]);
  if (fatos) ct.appendChild(fatos);
  const listaChips = (titulo, chaves, nomes) => {
    const ok = (Array.isArray(chaves) ? chaves : []).filter((k) => nomes[k]);
    if (!ok.length) return;
    ct.appendChild(titulo4(titulo));
    const d = el("div", "vd-caract");
    ok.forEach((k) => { const t = el("span"); t.append(icone("check", "vi s"), document.createTextNode(nomes[k])); d.appendChild(t); });
    ct.appendChild(d);
  };
  listaChips("Características", a.caracteristicas, CARACT_IMOVEL);
  listaChips("Condições", a.condicoes, CONDICOES_IMOVEL);
  if (a.descricao) { ct.appendChild(titulo4("Descrição")); ct.appendChild(el("p", "texto", a.descricao)); }

  // anunciante
  ct.appendChild(titulo4("Anunciante"));
  const box = el("div", "vd-anunciante");
  const info = el("div", "tx");
  info.append(linkCriador(a.donoId, dono, opcoes.aoPerfil));
  const papel = [ANUNCIANTE[anunciante.tipoAnunciante], anunciante.creci ? `CRECI ${anunciante.creci}` : ""].filter(Boolean).join(" · ");
  if (papel) info.appendChild(el("small", null, papel));
  info.appendChild(estrelasNeg(`${a.donoId}_imoveis`, { nome: anunciante.nome || "Anunciante", donoId: a.donoId, fbx }));
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
  if (proprio && a.id && !a.legado) {
    // Fechou negócio? Um toque apaga o anúncio.
    const rotulo = a.finalidade === "venda" ? "Vendido" : "Alugado";
    const fim = el("button", "vt-btn sec");
    fim.type = "button";
    fim.append(icone("check"), document.createTextNode(`${rotulo} · apagar`));
    fim.addEventListener("click", async () => {
      if (!confirm(`Imóvel ${rotulo.toLowerCase()}? O anúncio será apagado e sai da vitrine.`)) return;
      try {
        await fbx.deleteDoc(fbx.doc(fbx.db, "anuncios", a.id));
        toast(`Imóvel marcado como ${rotulo.toLowerCase()} e removido.`);
        sair();
        todos = todos.filter((x) => x.id !== a.id);
        if (TIPO_PAGINA) renderizar();
        opcoes.aoMudar?.();
      } catch { toast("Não foi possível apagar o anúncio."); }
    });
    ct.lastChild.appendChild(fim);
  }
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
  const dest = el("div", "vt-destaques");
  dest.id = "vtDestaques";
  sec.append(cab, dest, cont, grade);
  const cta = main.querySelector(".cta-strip");
  const lugar = document.getElementById("vitrineAqui");
  if (lugar) lugar.replaceWith(sec);
  if (cta) {
    if (!lugar) main.insertBefore(sec, cta);
    const link = cta.querySelector("a");
    if (link) link.href = `usuarios.html?acao=negocio&tipo=${TIPO}`;
    if (link && !lugar) link.textContent = TEXTOS[TIPO].criar;
  } else if (!lugar) main.appendChild(sec);
}

function filtroAtual() {
  const chip = document.querySelector("#filterChips .chip.active");
  return { cat: chip?.dataset.filter || "todos", termo: (document.getElementById("searchInput")?.value || "").trim().toLowerCase() };
}
function passaCategoria(n, cat) {
  if (cat === "todos") return true;
  if (cat.startsWith("c:")) return n.categoria === "outros" && (n.categoriaPersonalizada || "") === cat.slice(2);
  const cats = TIPO === "servicos" ? categoriasDe(n) : [n.categoria];
  return cats.includes(cat) || n.finalidade === cat;
}
function textoBusca(n) {
  const cats = TIPO === "servicos" ? categoriasDe(n) : [n.categoria];
  return [n.nome, n.titulo, n.descricao, n.cidade, n.bairro, n.regiao, n.categoriaPersonalizada, ...cats.map((c) => CATEGORIAS[TIPO]?.[c]),
    ...(n.itens || []).map((i) => [i?.nome, i?.descricao, i?.secao, i?.marca].join(" ")), n.veiculo, donos.get(n.donoId)?.nome].join(" ").toLowerCase();
}

// Carrossel horizontal com título (arrasta com o dedo; setas no computador).
function carrossel(titulo, itens, classe = "") {
  const sec = el("div", "vt-carrossel " + classe);
  const topo = el("div", "vt-car-topo");
  topo.appendChild(el("h3", null, titulo));
  const setas = el("div", "vt-setas");
  const trilho = el("div", "vt-trilho");
  [["voltar", -1], ["avancar", 1]].forEach(([ic, dir]) => {
    const b = el("button");
    b.type = "button";
    b.setAttribute("aria-label", dir < 0 ? "Anteriores" : "Próximos");
    b.appendChild(icone(ic === "voltar" ? "avancar" : "avancar"));
    if (dir < 0) b.classList.add("esq");
    b.addEventListener("click", () => trilho.scrollBy({ left: dir * trilho.clientWidth * 0.85, behavior: "smooth" }));
    setas.appendChild(b);
  });
  topo.appendChild(setas);
  itens.forEach((x) => trilho.appendChild(x));
  sec.append(topo, trilho);
  return sec;
}
function tornarClicavel(c, abrir, rotulo) {
  c.tabIndex = 0;
  c.setAttribute("role", "button");
  c.setAttribute("aria-label", rotulo);
  c.addEventListener("click", abrir);
  c.addEventListener("keydown", (e) => { if (e.target === c && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); abrir(); } });
  return c;
}

// Serviços: destaque com foto do trabalho
function cartaoDestaqueServico(n) {
  const c = el("article", "vt-destaque");
  const capa = el("div", "capa");
  capa.style.backgroundImage = `url("${urlSegura((n.fotos || [])[0]) || TEXTOS.servicos.img}")`;
  capa.appendChild(avatar(n.foto, n.nome));
  const tx = el("div", "tx");
  tx.append(el("strong", null, n.nome), estrelasNeg(idNegocio(n), { compacto: true, nome: n.nome, donoId: n.donoId }), el("small", null, categoriasDe(n).map((k) => CATEGORIAS.servicos[k]).filter(Boolean).slice(0, 2).join(" · ")));
  if (moeda(n.precoDesde)) tx.appendChild(el("span", "pr", `a partir de ${moeda(n.precoDesde)}`));
  c.append(capa, tx);
  return c;
}
// Delivery: linha estilo app de comida (logo, nome, categoria, tempo e taxa)
function linhaDelivery(n) {
  const c = el("article", "vt-linha-loja");
  const ab = abertoAgora(n);
  if (ab === false) c.classList.add("fechado");
  c.appendChild(avatar(n.foto, n.nome, "vt-avatar logo"));
  const tx = el("div", "tx");
  tx.appendChild(el("strong", null, n.nome || "Delivery"));
  const linhaSub = el("div", "vt-sub");
  linhaSub.append(estrelasNeg(idNegocio(n), { compacto: true, nome: n.nome, donoId: n.donoId }), el("small", null, [nomeCategoria(n), n.cidade].filter(Boolean).join(" · ")));
  tx.appendChild(linhaSub);
  const info = el("div", "vt-infos");
  if (n.tempoMin || n.tempoMax) { const s = el("span"); s.append(icone("relogio", "vi s"), document.createTextNode(`${n.tempoMin || "?"}–${n.tempoMax || "?"} min`)); info.appendChild(s); }
  const taxa = Number(n.taxaEntrega) > 0 ? moeda(n.taxaEntrega) : "Grátis";
  { const s = el("span", Number(n.taxaEntrega) > 0 ? "" : "gratis"); s.append(icone("moto", "vi s"), document.createTextNode(taxa)); info.appendChild(s); }
  if (ab !== null) info.appendChild(el("span", ab ? "aberto" : "fechado-tx", ab ? "Aberto" : "Fechado"));
  tx.appendChild(info);
  const pratos = (n.itens || []).filter((i) => i?.nome && urlSegura(i.foto)).slice(0, 3);
  c.appendChild(tx);
  if (pratos.length) {
    const mini = el("div", "mini");
    pratos.forEach((i) => { const f = el("span"); f.style.backgroundImage = `url("${i.foto}")`; mini.appendChild(f); });
    c.appendChild(mini);
  }
  return c;
}
// Shopping: loja em bolinha (como stories)
function bolhaLoja(n) {
  const c = el("button", "vt-bolha-loja");
  c.type = "button";
  c.append(avatar(n.foto, n.nome), el("span", null, n.nome || "Loja"), estrelasNeg(idNegocio(n), { compacto: true, nome: n.nome, donoId: n.donoId }));
  c.addEventListener("click", () => abrirDetalhe(n));
  return c;
}
// Shopping: cartão de produto (estilo marketplace)
function cartaoProduto(n, i, idx, { mostrarLoja = true } = {}) {
  const c = el("article", "vt-prod");
  const est = estoqueDe(i);
  if (est === 0) c.classList.add("esgotado");
  const f = el("div", "ft");
  if (urlSegura(i.foto)) f.style.backgroundImage = `url("${i.foto}")`; else f.appendChild(icone("foto", "vi"));
  const p = Number(i.preco), a = Number(i.precoAntigo);
  if (est === 0) f.appendChild(el("span", "selo", "Esgotado"));
  else if (a > p && p > 0) f.appendChild(el("span", "selo desc", `-${Math.round((1 - p / a) * 100)}%`));
  else if (est === 1) f.appendChild(el("span", "selo", "Última unidade"));
  if (i.condicao && i.condicao !== "novo" && CONDICAO[i.condicao]) f.appendChild(el("span", "selo cond", CONDICAO[i.condicao]));
  const tx = el("div", "tx");
  tx.appendChild(el("strong", "nome", i.nome));
  tx.appendChild(precoComDesconto(i));
  tx.appendChild(estrelasNeg(idNegocio(n), { compacto: true, nome: n.nome, donoId: n.donoId }));
  const nt = Array.isArray(i.tamanhos) ? i.tamanhos.length : 0, nc = Array.isArray(i.cores) ? i.cores.length : 0;
  const extras = [nt ? (nt === 1 ? `Tam. ${i.tamanhos[0]}` : `${nt} tamanhos`) : "", nc ? (nc === 1 ? i.cores[0] : `${nc} cores`) : ""].filter(Boolean).join(" · ");
  if (extras) tx.appendChild(el("small", null, extras));
  if (mostrarLoja) {
    const loja = el("span", "loja");
    loja.append(icone("sacola", "vi s"), el("span", "ln", n.nome || "Loja"));
    if ((n.entrega || []).includes("entrega")) loja.appendChild(el("em", null, "entrega"));
    tx.appendChild(loja);
  }
  c.append(f, tx);
  return c;
}

function renderizar() {
  const grade = document.getElementById("vtGrade");
  const dest = document.getElementById("vtDestaques");
  const cont = document.getElementById("vtContagem");
  const { cat, termo } = filtroAtual();
  const filtrando = cat !== "todos" || !!termo;
  grade.replaceChildren();
  dest.replaceChildren();
  grade.className = "vt-grade " + ({ servicos: "lista", delivery: "lista-lojas", lojinha: "produtos", imoveis: "imoveis" }[TIPO] || "");
  const lista = todos.filter((n) => passaCategoria(n, cat) && (!termo || textoBusca(n).includes(termo)));
  const vazio = () => {
    const v = el("div", "vt-vazio");
    v.append(el("strong", null, todos.length ? "Nada encontrado com esse filtro" : TEXTOS[TIPO].vazio), todos.length ? "Tente outra categoria ou palavra." : "Seja o primeiro: crie seu perfil de negócio pelo seu perfil.");
    if (!todos.length) { const a = el("a", "vt-criar"); a.href = `usuarios.html?acao=negocio&tipo=${TIPO}`; a.append(icone("mais"), document.createTextNode(TEXTOS[TIPO].criar)); v.append(document.createElement("br"), a); }
    grade.appendChild(v);
  };

  if (TIPO === "lojinha") {
    // Lojas no topo (bolinhas) e todos os produtos numa grade, como nos marketplaces.
    if (lista.length) dest.appendChild(carrossel("Lojas", lista.map(bolhaLoja), "lojas"));
    const produtos = [];
    lista.forEach((n) => (n.itens || []).forEach((i, idx) => {
      if (!i?.nome) return;
      if (termo && !textoBusca(n).includes(termo)) return;
      const alvo = [i.nome, i.descricao, i.marca, n.nome, ...(i.cores || []), ...(i.tamanhos || [])].join(" ").toLowerCase();
      if (termo && !alvo.includes(termo) && !String(n.nome || "").toLowerCase().includes(termo)) return;
      produtos.push({ n, i, idx });
    }));
    produtos.sort((a, b) => (estoqueDe(a.i) === 0) - (estoqueDe(b.i) === 0));
    cont.textContent = todos.length ? `${produtos.length} ${produtos.length === 1 ? "produto" : "produtos"} · ${lista.length} ${lista.length === 1 ? "loja" : "lojas"}` : "";
    if (!produtos.length) return vazio();
    produtos.forEach(({ n, i, idx }) => grade.appendChild(tornarClicavel(cartaoProduto(n, i, idx), () => abrirProduto(n, idx), `Ver ${i.nome}`)));
    return;
  }

  cont.textContent = todos.length ? `${lista.length} ${lista.length === 1 ? "resultado" : "resultados"}` : "";
  if (!lista.length) return vazio();

  if (TIPO === "servicos") {
    const comFoto = lista.filter((n) => (n.fotos || []).some(urlSegura));
    if (!filtrando && comFoto.length >= 2) dest.appendChild(carrossel("Trabalhos em destaque", comFoto.slice(0, 10).map((n) => tornarClicavel(cartaoDestaqueServico(n), () => abrirDetalhe(n), `Ver ${n.nome}`)), "destaques"));
    lista.forEach((n) => grade.appendChild(tornarClicavel(cartaoServico(n), () => abrirDetalhe(n), `Ver ${n.nome}`)));
  } else if (TIPO === "delivery") {
    const ordem = [...lista].sort((a, b) => (abertoAgora(b) === true) - (abertoAgora(a) === true));
    const abertos = ordem.filter((n) => abertoAgora(n) === true);
    if (!filtrando && abertos.length) dest.appendChild(carrossel("Abertos agora", abertos.slice(0, 10).map((n) => tornarClicavel(cartaoDelivery(n), () => abrirDetalhe(n), `Ver ${n.nome}`)), "abertos"));
    grade.appendChild(el("h3", "vt-titulo-lista", filtrando ? "Resultados" : "Todos os restaurantes"));
    ordem.forEach((n) => grade.appendChild(tornarClicavel(linhaDelivery(n), () => abrirDetalhe(n), `Ver ${n.nome}`)));
  } else {
    lista.forEach((n) => grade.appendChild(tornarClicavel(cartaoImovel(n), () => abrirAnuncio(n), `Ver ${n.titulo || "imóvel"}`)));
  }
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

// Shopping: cria filtros para as categorias que existem (inclusive as personalizadas).
function chipsDinamicos() {
  const chips = document.getElementById("filterChips");
  if (!chips || TIPO !== "lojinha") return;
  const existentes = new Set([...chips.querySelectorAll("[data-filter]")].map((c) => c.dataset.filter));
  const novos = [];
  todos.forEach((n) => {
    if (n.categoria === "outros" && n.categoriaPersonalizada) novos.push(["c:" + n.categoriaPersonalizada, n.categoriaPersonalizada]);
    else if (n.categoria && CATEGORIAS.lojinha[n.categoria]) novos.push([n.categoria, CATEGORIAS.lojinha[n.categoria]]);
  });
  const outros = chips.querySelector('[data-filter="outros"]');
  new Map(novos).forEach((rotulo, f) => {
    if (existentes.has(f)) return;
    const b = el("button", "chip", rotulo);
    b.type = "button"; b.dataset.filter = f; b.dataset.dyn = "1";
    b.addEventListener("click", () => chips.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === b)));
    chips.insertBefore(b, outros || null);
  });
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
  // Busca vinda da página inicial: pagina.html?q=termo
  const termoInicial = new URLSearchParams(location.search).get("q");
  const campo = document.getElementById("searchInput");
  if (termoInicial && campo) campo.value = termoInicial.slice(0, 80);
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
    conferirEmail(u);
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
      const idsNotas = [...new Set(todos.map((n) => (TIPO === "imoveis" ? `${n.donoId}_imoveis` : idNegocio(n))))];
      const [r] = await Promise.all([lerResumos(fb, idsNotas.map((i) => "neg_" + i)), carregarDonos(todos.map((n) => n.donoId))]);
      idsNotas.forEach((i) => notasNeg.set(i, r["neg_" + i]));
    } catch (e) {
      console.warn("Vitrine indisponível:", e);
      todos = [];
    }
    chipsDinamicos();
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
