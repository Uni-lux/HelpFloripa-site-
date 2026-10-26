// =====================================================
// Vitrine de negócios do Help Floripa
// Na página:  <script type="module" src="vitrine.js?tipo=servicos"></script>
// Tipos: servicos | delivery | lojinha | imoveis | saude
// Negócios: coleção "negocios" (um perfil de cada tipo por pessoa).
// Imóveis:  coleção "anuncios" (vários imóveis por pessoa).
// Links diretos: pagina.html?negocio=ID  ·  imoveis.html?anuncio=ID
// =====================================================

import { confirmarHF } from "./confirmar.js?v=4";
import { relogioDe } from "./fuso.js?v=1";
import { buscarNoServidor } from "./busca.js?v=1";
import { fotoSegura, conferirEmail, emailPendente, mostrarAvisoEmail, MSG_EMAIL } from "./seguranca.js?v=1";
import { estrelas, pintarEstrelas, lerResumo, lerResumos, abrirDetalhamento, media, avaliarNegocio } from "./avaliacoes.js?v=14";
import { abrirQueixa } from "./queixas.js?v=12";
import { docComValidade, docsComValidade } from "./leituras.js?v=1";
import { anelNegocio } from "./flash-negocio.js?v=5";
import { camposEndereco, textoCidade, cidadesDe, NOME_UF, semAcento } from "./endereco.js?v=1";
import { minhaPosicao, comDistancia, textoDistancia, pedirLocalizacao, rotuloPosicao } from "./perto.js?v=2";
import { lerPlano, nivelPlano, seloPlano, nomePlano, negocioPausado, LIMITES_GRATIS } from "./planos-base.js?v=5";
import { PROFISSOES_SAUDE, CATEGORIAS_SAUDE, SITE_CONSELHO, MODALIDADES_SAUDE, PUBLICO_SAUDE, PUBLICO_VET, nomeProfissao, conselhoDe, ehVet, textoRegistro, textoValor, AVISO_EMERGENCIA, AVISO_REGISTRO } from "./saude-dados.js?v=1";
import { usarEstat, registrarVisita, registrarAcao, registrarItem, chaveItem as chaveEstat, chaveAnuncio } from "./estat-negocio.js?v=1";
// Plano de quem anuncia: todo plano pago tem o selo; Pro e Premium aparecem antes na ordem padrão
// (Premium antes de todos).
const planosDonos = new Map();
const nivelDe = (n) => nivelPlano(planosDonos.get(n?.donoId));
// Sem plano: só o perfil principal do dono aparece (planos-base.js). Anúncios seguem o perfil Imóveis do dono.
const principalImoveis = new Map(); // donoId -> tipo principal (lido do perfil Imóveis)
// Perfil grátis (dono sem plano ativo): até 3 itens, 1 foto, sem capa, sem links e sem promoção; pedidos,
// orçamentos e agendamentos só pelo chat e WhatsApp. O resto continua guardado e volta quando a pessoa assina.
function versaoGratis(n) {
  return { ...n, itens: (n.itens || []).filter((i) => i?.nome).slice(0, LIMITES_GRATIS.itens), fotos: (n.fotos || []).slice(0, LIMITES_GRATIS.fotos), capa: "", instagram: "", site: "", promocao: null, _gratis: true };
}
const comLimites = (n) => (n && !n._gratis && n.tipo !== "imovel" && planosDonos.has(n.donoId) && !nivelPlano(planosDonos.get(n.donoId)) ? versaoGratis(n) : n);
const pausadoNaVitrine = (x) => x?.donoId !== eu?.uid && negocioPausado(x?.tipo === "imovel" ? { tipo: "imovel", principal: principalImoveis.get(x.donoId) ?? negociosImoveis.get(x.donoId)?.principal } : x, planosDonos.get(x?.donoId));
// Ordem padrão: Premium > Pro > Plus > grátis (todo plano pago aparece antes de quem não tem plano).
const destaqueDe = (n) => nivelDe(n);
const proPrimeiro = (f) => (a, b) => (destaqueDe(b.n || b) - destaqueDe(a.n || a)) || f(a, b);

const PARAMS = new URL(import.meta.url).searchParams;
const TIPO_PAGINA = PARAMS.get("tipo");
const TIPO = TIPO_PAGINA || "servicos";

export const CORES_TIPO = { servicos: "#00adee", delivery: "#ff7a1a", lojinha: "#b066ff", imoveis: "#2fbf71", saude: "#0fb5a6", comunidade: "#e5487f" };
export const NOMES_TIPO = { servicos: "Freelances", delivery: "Delivery", lojinha: "Lojinha", imoveis: "Imóveis", saude: "Saúde", comunidade: "Comunidade" };
export const PAGINA_TIPO = { servicos: "servicos.html", delivery: "delivery.html", lojinha: "shopping.html", imoveis: "imoveis.html", saude: "saude.html", comunidade: "comunidade.html" };
// Áreas de atuação dos Freelances, em grupos. [nome, palavras que a busca também encontra].
// As chaves antigas (limpeza, reformas, beleza, transporte, pets, outros) continuam valendo.
export const GRUPOS_SERV = [
  { nome: "Casa e reparos", areas: {
    limpeza: ["Limpeza e faxina", "faxina diarista faxineira passadeira limpeza pos obra higienizacao sofa"],
    reformas: ["Reformas e obras", "pedreiro obra azulejo piso gesso drywall construcao telhado"],
    eletrica: ["Eletricista", "eletrica tomada chuveiro disjuntor instalacao iluminacao"],
    hidraulica: ["Encanador", "hidraulica vazamento desentupimento caixa d agua torneira"],
    pintura: ["Pintura", "pintor parede textura grafiato"],
    montagem: ["Montagem de móveis", "montador marceneiro marcenaria moveis planejados"],
    marido: ["Marido de aluguel", "pequenos reparos consertos gerais instalacoes"],
    jardim: ["Jardinagem e piscina", "jardineiro paisagismo poda grama piscineiro"],
    climatizacao: ["Ar-condicionado", "refrigeracao climatizacao instalacao limpeza de ar"],
    eletro: ["Conserto de eletrodomésticos", "maquina de lavar geladeira fogao microondas tecnico"]
  } },
  { nome: "Beleza e bem-estar", areas: {
    beleza: ["Beleza e estética", "cabeleireiro cabelo manicure unha maquiagem sobrancelha barbeiro depilacao cilios estetica saude"],
    saude: ["Saúde e terapias", "massagem fisioterapia psicologo nutricionista enfermagem terapeuta"],
    fitness: ["Personal e esportes", "personal trainer academia yoga pilates treino"]
  } },
  { nome: "Aulas e cursos", areas: {
    aulas: ["Aulas particulares", "reforco escolar professor matematica vestibular enem"],
    idiomas: ["Idiomas", "ingles espanhol frances traducao professor de idioma"],
    musica: ["Música", "pianista piano violao guitarra musico banda cantor aula de musica"]
  } },
  { nome: "Eventos e arte", areas: {
    fotografia: ["Foto e vídeo", "fotografo fotografia filmagem video drone ensaio"],
    eventos: ["Festas e eventos", "decoracao garcom recreacao dj animador cerimonial"],
    culinaria: ["Culinária e buffet", "cozinheira chef buffet bolo doces confeitaria salgados marmita"],
    costura: ["Costura e artesanato", "costureira ajustes bainha artesanato croche"]
  } },
  { nome: "Transporte", areas: {
    transporte: ["Motorista e transporte", "motorista transporte van escolar transfer viagem"],
    mudancas: ["Mudanças e fretes", "mudanca frete carreto caminhao"],
    entregas: ["Entregas e motoboy", "motoboy entregador entrega rapida"]
  } },
  { nome: "Cuidados e pets", areas: {
    pets: ["Pets", "banho e tosa passeador adestrador pet sitter cachorro gato veterinario"],
    baba: ["Babá", "baba cuidadora de criancas"],
    idosos: ["Cuidador de idosos", "cuidadora acompanhante idoso"]
  } },
  { nome: "Tecnologia e escritório", areas: {
    tecnologia: ["Informática e celular", "computador notebook formatacao conserto de celular tecnico de informatica"],
    digital: ["Design e marketing", "designer logo social media sites programacao marketing digital"],
    consultoria: ["Contabilidade e consultoria", "contador mei imposto de renda advogado consultor"]
  } }
];
const AREAS_SERV = Object.assign({}, ...GRUPOS_SERV.map((g) => g.areas));
export const PALAVRAS_SERV = Object.fromEntries(Object.entries(AREAS_SERV).map(([k, [, p]]) => [k, p]));
export const CATEGORIAS = {
  servicos: { ...Object.fromEntries(Object.entries(AREAS_SERV).map(([k, [nome]]) => [k, nome])), outros: "Outros" },
  delivery: { hamburguer: "Hambúrguer", pizza: "Pizza", sushi: "Sushi", doces: "Doces", bebidas: "Bebidas", outros: "Outros" },
  lojinha: { roupas: "Moda e roupas", calcados: "Calçados", acessorios: "Acessórios", beleza: "Beleza", eletronicos: "Eletrônicos", casa: "Casa e decoração", mercado: "Mercado", artesanato: "Artesanato", infantil: "Infantil", esportes: "Esportes", outros: "Outros" },
  imoveis: { apartamento: "Apartamento", casa: "Casa", kitnet: "Kitnet", terreno: "Terreno", comercial: "Comercial", outros: "Outros" },
  saude: CATEGORIAS_SAUDE
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
  servicos: { titulo: "Profissionais da <span>comunidade</span>", sub: "Autônomos que atendem na sua cidade e em todo o Brasil.", criar: "Criar meu perfil de freelancer", vazio: "Nenhum profissional por aqui ainda", img: "servicos.webp" },
  delivery: { titulo: "Cardápios da <span>vizinhança</span>", sub: "Peça direto com quem faz, sem intermediário.", criar: "Cadastrar meu delivery", vazio: "Nenhum delivery cadastrado ainda", img: "lanchonetes.webp" },
  lojinha: { titulo: "Lojinhas <span>locais</span>", sub: "Produtos de quem vende perto de você.", criar: "Abrir minha lojinha", vazio: "Nenhuma lojinha aberta ainda", img: "shopping.webp" },
  imoveis: { titulo: "Imóveis <span>anunciados</span>", sub: "Aluguel, venda e temporada direto com o anunciante.", criar: "Anunciar imóvel", vazio: "Nenhum imóvel anunciado ainda", img: "imoveis.webp" },
  saude: { titulo: "Profissionais de <span>saúde</span>", sub: "Médicos, enfermagem, psicólogos, veterinários e mais, com o registro do conselho à vista.", criar: "Criar meu perfil de saúde", vazio: "Nenhum profissional de saúde por aqui ainda", img: "saude.svg" }
};
const MODOS = { domicilio: "Vai até você", local: "No local", online: "Online" };
const TEXTO_CONTATO = { servicos: "Pedir orçamento", delivery: "Fazer pedido", lojinha: "Falar com a loja", imoveis: "Tenho interesse", saude: "Agendar consulta" };

// ---------- utilitários ----------
// Fotos só do próprio site (seguranca.js): evita imagens de terceiros que rastreiam visitantes.
const urlSegura = (u) => fotoSegura(u);
const iniciais = (n) => { const p = String(n || "?").trim().split(/\s+/); return ((p[0]?.[0] || "?") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase(); };
export const moeda = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: Number(v) % 1 ? 2 : 0 }) : "");
const el = (tag, cls, texto) => { const e = document.createElement(tag); if (cls) e.className = cls; if (texto != null) e.textContent = texto; return e; };
const ICONES = {
  chat: '<path d="M20.5 11.6c0 4.3-3.8 7.6-8.5 7.6-1.2 0-2.3-.2-3.3-.6L4 20l1.2-3.6c-1.1-1.3-1.7-3-1.7-4.8C3.5 7.4 7.3 4 12 4s8.5 3.4 8.5 7.6z"/>',
  whats: '<path d="M20.5 11.7a8.5 8.5 0 01-12.6 7.5L3.5 20.5l1.3-4.2A8.5 8.5 0 1120.5 11.7z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .8a4.5 4.5 0 01-2.4-2.4l.8-1-1-2z"/>',
  filtro: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
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
  lixo: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
  alerta: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.5h.01"/>',
  instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.2 6.8h.01"/>',
  site: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.3 2.4 3.5 5.2 3.5 8.5s-1.2 6.1-3.5 8.5c-2.3-2.4-3.5-5.2-3.5-8.5s1.2-6.1 3.5-8.5z"/>',
  rota: '<path d="M12 3l8.5 8.5L12 20l-8.5-8.5z"/><path d="M9.5 13v-2.5h5M13 8.5l1.5 2-1.5 2"/>',
  compartilhar: '<path d="M12 15V4M8 8l4-4 4 4M5 12v6.5A1.5 1.5 0 006.5 20h11a1.5 1.5 0 001.5-1.5V12"/>',
  cupom: '<path d="M4 7.5A1.5 1.5 0 015.5 6h13A1.5 1.5 0 0120 7.5V10a2 2 0 000 4v2.5a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 16.5V14a2 2 0 000-4z"/><path d="M14 6v12" stroke-dasharray="2 2"/>',
  copiar: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 00-1.5-1.5H6A1.5 1.5 0 004.5 6v8A1.5 1.5 0 006 15.5h2.5"/>',
  verificado: '<path d="M12 2.8l2.3 1.7 2.9.1.9 2.8 2.3 1.8-.9 2.8.9 2.8-2.3 1.8-.9 2.8-2.9.1L12 21.2l-2.3-1.7-2.9-.1-.9-2.8-2.3-1.8.9-2.8-.9-2.8 2.3-1.8.9-2.8 2.9-.1z"/><path d="M8.6 12.2l2.3 2.3 4.6-4.8"/>',
  saude: '<path d="M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6z"/>',
  online: '<rect x="3.5" y="5" width="17" height="11.5" rx="2"/><path d="M8.5 20h7M12 16.5V20"/><path d="M10.5 8.8v4.4l3.6-2.2z"/>',
  estetoscopio: '<path d="M6 3.5v5a4 4 0 008 0v-5"/><path d="M10 12.5v2.5a4.5 4.5 0 009 0v-2"/><circle cx="19" cy="11" r="2"/>',
  escudo: '<path d="M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6z"/><path d="M8.8 12l2.2 2.2 4.2-4.4"/>',
  // modos de exibição da lista
  "m-linhas": '<rect x="3" y="4.5" width="7.5" height="6" rx="1.5"/><rect x="12.5" y="4.5" width="7.5" height="6" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="6" rx="1.5"/><rect x="12.5" y="13.5" width="7.5" height="6" rx="1.5"/><path d="M22 6.5v2M22 15.5v2"/>',
  "m-1": '<rect x="3.5" y="4" width="17" height="6.5" rx="1.5"/><rect x="3.5" y="13.5" width="17" height="6.5" rx="1.5"/>',
  "m-2": '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  "m-3": '<rect x="3.5" y="3.5" width="4.5" height="4.5" rx="1"/><rect x="9.75" y="3.5" width="4.5" height="4.5" rx="1"/><rect x="16" y="3.5" width="4.5" height="4.5" rx="1"/><rect x="3.5" y="9.75" width="4.5" height="4.5" rx="1"/><rect x="9.75" y="9.75" width="4.5" height="4.5" rx="1"/><rect x="16" y="9.75" width="4.5" height="4.5" rx="1"/><rect x="3.5" y="16" width="4.5" height="4.5" rx="1"/><rect x="9.75" y="16" width="4.5" height="4.5" rx="1"/><rect x="16" y="16" width="4.5" height="4.5" rx="1"/>'
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
function linkWhats(numeroBruto, texto, aoClicar = null) {
  const numero = String(numeroBruto || "").replace(/\D/g, "");
  if (numero.length < 10) return null;
  const a = el("a", "vt-btn whats");
  a.href = `https://wa.me/${numero.startsWith("55") ? numero : "55" + numero}?text=${encodeURIComponent(texto)}`;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.append(icone("whats"), document.createTextNode("WhatsApp"));
  a.addEventListener("click", (e) => { e.stopPropagation(); aoClicar?.(); });
  return a;
}
// Horário de cada dia (domingo a sábado): "HH:MM-HH:MM" ou "" (fechado). Vale para todos os tipos.
export const NOMES_DIA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const semanaDe = (n) => (Array.isArray(n?.semana) && n.semana.length === 7 && n.semana.some(Boolean) ? n.semana : null);
const faixaMin = (s) => { const r = /^(\d\d):(\d\d)-(\d\d):(\d\d)$/.exec(s || ""); return r ? [Number(r[1]) * 60 + Number(r[2]), Number(r[3]) * 60 + Number(r[4])] : null; };
const horaTxt = (s) => String(s || "").replace("-", " às ");
// Aberto agora e a próxima mudança ("fecha às 23:00", "abre amanhã às 11:00").
export function situacaoHorario(n, agora = relogioDe(ufDe(n))) {
  const sem = semanaDe(n);
  if (!sem) return null;
  const d = agora.getDay(), m = agora.getHours() * 60 + agora.getMinutes();
  const hoje = faixaMin(sem[d]), ontem = faixaMin(sem[(d + 6) % 7]);
  if (ontem && ontem[1] <= ontem[0] && m < ontem[1]) return { aberto: true, texto: `Fecha às ${sem[(d + 6) % 7].split("-")[1]}` };
  if (hoje && (hoje[1] > hoje[0] ? m >= hoje[0] && m < hoje[1] : m >= hoje[0])) return { aberto: true, texto: `Fecha às ${sem[d].split("-")[1]}` };
  if (hoje && m < hoje[0]) return { aberto: false, texto: `Abre hoje às ${sem[d].split("-")[0]}` };
  for (let i = 1; i <= 7; i++) {
    const k = (d + i) % 7;
    if (sem[k]) return { aberto: false, texto: `Abre ${i === 1 ? "amanhã" : NOMES_DIA[k].toLowerCase()} às ${sem[k].split("-")[0]}` };
  }
  return { aberto: false, texto: "Fechado" };
}
function abertoAgora(n) {
  const sit = situacaoHorario(n);
  if (sit) return sit.aberto;
  if (!n.horaAbre || !n.horaFecha) return null;
  const [ha, ma] = n.horaAbre.split(":").map(Number), [hf, mf] = n.horaFecha.split(":").map(Number);
  if ([ha, ma, hf, mf].some((x) => !Number.isFinite(x))) return null;
  const agora = relogioDe(ufDe(n)), m = agora.getHours() * 60 + agora.getMinutes(), a = ha * 60 + ma, f = hf * 60 + mf;
  if (Array.isArray(n.dias) && n.dias.length && !n.dias.includes(["dom", "seg", "ter", "qua", "qui", "sex", "sab"][agora.getDay()])) return false;
  return f > a ? m >= a && m < f : m >= a || m < f; // atravessa a meia-noite
}
// Áreas de atuação do profissional (aceita cadastro antigo com uma categoria só).
export const nomeCategoria = (n) => (n.categoria === "outros" && n.categoriaPersonalizada ? n.categoriaPersonalizada : CATEGORIAS[n.tipo]?.[n.categoria] || NOMES_TIPO[n.tipo]);
// Nome de uma categoria do perfil/anúncio: "outros" mostra o que a pessoa escreveu (Pianista, Chácara...).
export const nomeCat = (n, k) => (k === "outros" && n.categoriaPersonalizada ? n.categoriaPersonalizada : CATEGORIAS[n.tipo === "imovel" ? "imoveis" : n.tipo]?.[k] || k);
// Filtro/grupo de uma categoria: a personalizada vira "c:Nome" (um filtro só dela).
const chaveCat = (n, k) => (k === "outros" && n.categoriaPersonalizada ? "c:" + n.categoriaPersonalizada : k);
export const categoriasDe = (n) => (Array.isArray(n.categorias) && n.categorias.length ? n.categorias : n.categoria ? [n.categoria] : []);
const precoImovel = (a) => (moeda(a.preco) ? moeda(a.preco) + (a.finalidade === "aluguel" ? "/mês" : a.finalidade === "temporada" ? "/dia" : "") : "Consultar");
const tituloImovel = (a) => a.titulo || `${(a.categoria && nomeCat(a, a.categoria)) || "Imóvel"} para ${(FINALIDADE[a.finalidade] || "negociar").toLowerCase()}`;
const fotoPequena = (u) => { const s = urlSegura(u); return s && s.length < 220000 ? s : ""; };

// ---------- conversa com cartão do que o cliente quer ----------
export function cartaoDeNegocio(n) {
  const cats = categoriasDe(n).map((c) => CATEGORIAS[n.tipo]?.[c] && nomeCat(n, c)).filter(Boolean);
  return {
    tipo: n.tipo, titulo: n.nome || NOMES_TIPO[n.tipo],
    sub: n.tipo === "saude" ? [nomeProfissao(n.saude), textoRegistro(n.saude)].filter(Boolean).join(" · ") : [NOMES_TIPO[n.tipo], cats.slice(0, 2).join(", ")].filter(Boolean).join(" · "),
    preco: n.tipo === "servicos" && moeda(n.precoDesde) ? `a partir de ${moeda(n.precoDesde)}` : n.tipo === "saude" ? textoValor(n.saude, moeda) : "",
    foto: fotoPequena(n.foto) || fotoPequena((n.fotos || [])[0]),
    link: `${PAGINA_TIPO[n.tipo]}?negocio=${encodeURIComponent(n.id || "")}&de=mensagens`
  };
}
export function cartaoDeAnuncio(a) {
  return {
    tipo: "imoveis", titulo: tituloImovel(a),
    sub: [FINALIDADE[a.finalidade], [a.bairro, textoCidade(a)].filter(Boolean).join(", ")].filter(Boolean).join(" · "),
    preco: precoImovel(a), foto: fotoPequena((a.fotos || [])[0]),
    link: `imoveis.html?anuncio=${encodeURIComponent(a.id || "")}&de=mensagens`
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
    const url = `mensagens.html?conversa=${encodeURIComponent(id)}`;
    // Nas páginas do site a conversa abre na gaveta de mensagens (sem sair da página).
    if (window.hfAbrirChat) window.hfAbrirChat(url); else location.href = url;
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
  if (extra.cupom) l.push(textoCupom(extra.cupom));
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
      pagamento: extra.pagamento || "", troco: Number(extra.troco) > 0 ? Number(extra.troco) : null,
      cupom: cupomDoEstado(extra.cupom),
      // Previsão de entrega mostrada no cartão do pedido ("30–50 min").
      prazo: n.tipo === "delivery" && extra.modo !== "retirada" && (n.tempoMin || n.tempoMax) ? `${n.tempoMin || n.tempoMax}–${n.tempoMax || n.tempoMin} min` : ""
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
// ---------- cupom / promoção no pedido e no orçamento ----------
// Ao copiar o cupom no perfil ele fica guardado no aparelho e já entra no pedido daquele negócio.
const chaveCupom = (n) => `hf-cupom-${n.id || n.donoId + "_" + n.tipo}`;
const normCupom = (v) => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
function guardarCupom(n, codigo) { try { sessionStorage.setItem(chaveCupom(n), codigo); } catch {} }
function cupomGuardado(n) { try { return sessionStorage.getItem(chaveCupom(n)) || ""; } catch { return ""; } }
// "Termina hoje", "Termina amanhã", "Faltam 3 dias" (até 7 dias) ou "Válida até 20 de outubro".
export function prazoPromo(ate) {
  const fim = new Date(ate?.toMillis?.() ?? ate);
  const dia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dias = Math.round((dia(fim) - dia(new Date())) / 864e5);
  if (dias <= 0) return `Termina hoje às ${fim.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  if (dias === 1) return "Termina amanhã";
  if (dias <= 7) return `Faltam ${dias} dias`;
  return "Válida até " + fim.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}
// Bloco do pedido: promoção sem código entra sozinha; com código, a pessoa digita (ou já vem do "Copiar").
function blocoCupom(n, estado) {
  const promo = promoAtiva(n);
  estado.cupom = null;
  if (!promo) return null;
  const box = el("div", "vd-cupom-ped");
  if (promo.codigo && normCupom(cupomGuardado(n)) === promo.codigo) estado.cupom = { codigo: promo.codigo, titulo: promo.titulo };
  if (!promo.codigo) estado.cupom = { codigo: "", titulo: promo.titulo };
  const pintar = () => {
    box.replaceChildren();
    box.classList.toggle("ok", !!estado.cupom);
    const ic = el("span", "ic"); ic.appendChild(icone(estado.cupom ? "check" : "cupom", "vi"));
    const tx = el("div", "tx");
    box.append(ic, tx);
    if (estado.cupom) {
      tx.append(el("small", null, promo.codigo ? "Cupom aplicado" : "Promoção do negócio"), el("strong", null, promo.titulo),
        el("span", "nota", promo.codigo ? `Código ${promo.codigo} · vai junto no pedido` : "Vai junto no pedido. O negócio confirma o desconto na conversa."));
      if (promo.codigo) {
        const x = el("button", "vd-link"); x.type = "button"; x.textContent = "Remover";
        x.addEventListener("click", () => { estado.cupom = null; guardarCupom(n, ""); pintar(); });
        box.appendChild(x);
      }
      return;
    }
    tx.append(el("small", null, "Tem um cupom?"), el("span", "nota", `${promo.titulo} · ${prazoPromo(promo.ate)}`));
    const linha = el("div", "vd-cupom-linha");
    const i = document.createElement("input");
    i.className = "vd-input"; i.placeholder = "Código do cupom"; i.maxLength = 20; i.autocapitalize = "characters"; i.autocomplete = "off"; i.spellcheck = false;
    i.addEventListener("input", () => { i.value = normCupom(i.value); });
    const ap = el("button", "vt-btn sec"); ap.type = "button"; ap.textContent = "Aplicar";
    const aplicar = () => {
      const c = normCupom(i.value);
      if (!c) { toast("Digite o código do cupom."); i.focus(); return; }
      if (c !== promo.codigo) { toast("Cupom inválido ou vencido. Confira o código no perfil do negócio."); i.select(); return; }
      estado.cupom = { codigo: promo.codigo, titulo: promo.titulo };
      guardarCupom(n, promo.codigo);
      toast("Cupom aplicado");
      pintar();
    };
    ap.addEventListener("click", aplicar);
    i.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); aplicar(); } });
    linha.append(i, ap);
    tx.appendChild(linha);
  };
  pintar();
  return box;
}
const cupomDoEstado = (c) => (c ? { codigo: String(c.codigo || "").slice(0, 20), titulo: String(c.titulo || "").slice(0, 60) } : null);
const textoCupom = (c) => (c ? (c.codigo ? `Cupom: ${c.codigo} (${c.titulo})` : `Promoção: ${c.titulo}`) : "");
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
  const estado = { modo: receb[0], pagamento: "", troco: null, endereco: "", obs: "", cupom: null };
  let caixaCupom = null;
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

    // O bloco do cupom é montado uma vez e reaproveitado (o pedido se redesenha a cada mudança).
    if (caixaCupom === null) caixaCupom = blocoCupom(n, estado) || false;
    if (caixaCupom) ct.appendChild(caixaCupom);
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
      contarAcao(n, "pedido", opcoes.origem);
      gravarCarrinho(n, {});
      document.querySelectorAll(".vt-modal").forEach((m) => m.remove());
      (opcoes.aoMensagem || conversar)(n.donoId, cartao);
    });
    barra.appendChild(env);
    const w = linkWhats(n.whatsapp, "", () => contarAcao(n, "whats", opcoes.origem));
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
    limpar.addEventListener("click", async () => { if (await confirmarHF({ titulo: "Esvaziar o carrinho?", texto: "Todos os itens saem do carrinho.", ok: "Esvaziar", icone: "carrinho" })) { gravarCarrinho(n, {}); aoMudar?.(); pintar(); } });
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
  usarEstat(opcoes.fb || fb, euX);
  if (!proprio) registrarItem(negEstat(n), chaveEstat(i.nome), opcoes.origem || origemPadrao());
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
    // Perfil grátis: sem carrinho; a pessoa fala com a loja.
    if (opcoes.semPedido ?? n._gratis) {
      const b = el("button", "vt-btn pri"); b.type = "button"; b.append(icone("chat"), document.createTextNode("Perguntar pelo chat"));
      b.addEventListener("click", () => { sair(); (opcoes.aoMensagem || ((uid, c) => prepararConversa(opcoes.fb || fb, opcoes.eu || eu, uid, c)))(n.donoId, cartaoDeNegocio(n)); });
      barra.appendChild(b); return;
    }
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
  const opServ = itens.length ? Object.fromEntries(itens.map(({ i, idx }) => [String(idx), i.nome])) : Object.fromEntries(categoriasDe(n).map((k) => [k, nomeCat(n, k)]));
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
      d.type = "date"; d.className = "vd-input"; d.dataset.titulo = "Para qual dia?";
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

  const cupomOrc = blocoCupom(n, estado);
  if (cupomOrc) ct.appendChild(cupomOrc);
  const montar = () => {
    const nomes = estado.servicos.map((k) => opServ[k]).filter(Boolean);
    return {
      cupom: cupomDoEstado(estado.cupom),
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
    const cartao = { ...cartaoDeNegocio(n), titulo: `Orçamento · ${n.nome || "Freelances"}`, sub: s.servicos.join(", "), preco: QUANDO[s.quando.tipo] || "", solicitacao: s };
    contarAcao(n, "orcamento", opcoes.origem);
    document.querySelectorAll(".vt-modal").forEach((m) => m.remove());
    (opcoes.aoMensagem || conversar)(n.donoId, cartao);
  });
  barra.appendChild(env);
  const w = linkWhats(n.whatsapp, "", () => contarAcao(n, "whats", opcoes.origem));
  if (w) {
    w.addEventListener("click", (e) => {
      if (!validar()) { e.preventDefault(); return; }
      const s = montar();
      const txt = [`Olá! Vi seu perfil "${n.nome}" no Help Floripa e gostaria de um orçamento.`, "",
        s.servicos.length ? `Serviço: ${s.servicos.join(", ")}` : "", `Descrição: ${s.descricao}`,
        `Quando: ${textoQuando(s.quando)}`, s.local ? `Local: ${s.local}` : "", textoCupom(s.cupom)].filter(Boolean).join("\n");
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
// Conta do dono desativada: o conteúdo fica escondido até ocultoAte (conta.js).
const oculto = (x) => (x?.ocultoAte?.toMillis?.() ?? 0) > Date.now();
const idNegocio = (n) => n.id || `${n.donoId}_${n.tipo}`;
// Capa própria do perfil (campo novo) ou a primeira foto.
const capaDe = (n) => urlSegura(n.capa) || urlSegura((n.fotos || []).find(urlSegura));
// Promoção no ar faz parte dos planos: sem plano ativo do dono (ou enquanto o plano não foi lido) não aparece.
// Saúde não tem promoção nem cupom (como nas plataformas de saúde: os conselhos limitam esse tipo de anúncio).
export const promoAtiva = (n) => (n?.tipo !== "saude" && n?.promocao?.titulo && (n.promocao.ate?.toMillis?.() ?? 0) > Date.now() && nivelPlano(planosDonos.get(n.donoId)) ? n.promocao : null);
const cnpjTxt = (c) => (/^\d{14}$/.test(c || "") ? c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : "");
// De onde a pessoa abriu o perfil (estatísticas do negócio).
const origemPadrao = () => (TIPO_PAGINA ? (filtroAtual().termo ? "busca" : "vitrine") : "outro");
const negEstat = (n, tipo = n.tipo) => ({ id: idNegocio({ ...n, tipo }), donoId: n.donoId, tipo });
const contarAcao = (n, acao, origem) => { if (!(eu && n.donoId === eu.uid)) registrarAcao(negEstat(n), acao, origem || origemPadrao()); };
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
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((a) => a.ativo !== false && !oculto(a))
    .sort((a, b) => (b.atualizadoEm?.toMillis?.() ?? 0) - (a.atualizadoEm?.toMillis?.() ?? 0));
}
// Cadastro antigo: o próprio perfil de imóveis tinha os dados de um imóvel.
// Sem plano, o anunciante mostra 1 anúncio de imóvel: o mais antigo (o mesmo em todo lugar).
const umAnuncioGratis = (lista) => [...lista].sort((a, b) => (a.criadoEm?.toMillis?.() ?? 0) - (b.criadoEm?.toMillis?.() ?? 0)).slice(0, LIMITES_GRATIS.anuncios);
function umAnuncioGratisPorDono(lista) {
  const porDono = new Map();
  lista.forEach((a) => porDono.set(a.donoId, [...(porDono.get(a.donoId) || []), a]));
  return [...porDono.values()].flatMap(umAnuncioGratis);
}
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

function botoes(donoId, { texto, whats, textoWhats, cartao, editarHref, acao, neg = null }) {
  const box = el("div", "vt-botoes");
  if (eu && donoId === eu.uid) {
    const ed = el("a", "vt-btn sec");
    ed.href = editarHref;
    ed.append(icone("lapis"), document.createTextNode("Editar"));
    ed.addEventListener("click", (e) => e.stopPropagation());
    box.appendChild(ed);
    return box;
  }
  const w = linkWhats(whats, textoWhats, () => neg && contarAcao(neg, "whats"));
  const m = el("button", "vt-btn " + (w ? "sec" : "pri"));
  m.type = "button";
  m.append(icone("chat"), document.createTextNode(texto));
  m.addEventListener("click", (e) => { e.stopPropagation(); if (acao) acao(); else { if (neg) contarAcao(neg, "mensagem"); conversar(donoId, cartao); } });
  box.appendChild(m);
  if (w) box.appendChild(w);
  return box;
}
const botoesNegocio = (n) => botoes(n.donoId, {
  texto: n.tipo === "delivery" ? "Ver cardápio" : n._gratis ? "Conversar" : TEXTO_CONTATO[n.tipo], whats: n.whatsapp, cartao: cartaoDeNegocio(n),
  acao: n.tipo === "servicos" && !n._gratis ? () => abrirOrcamento(n) : n.tipo === "delivery" ? () => abrirDetalhe(n) : null,
  textoWhats: `Olá! Vi "${n.nome}" no Help Floripa.`, editarHref: `negocios.html?tipo=${n.tipo}`, neg: n
});

// ---------- cartões por tipo ----------
function cabecalhoCartao(n, extras) {
  const topo = el("div", "vt-topo");
  const txt = el("div", "vt-topo-tx");
  txt.appendChild(el("h3", "vt-nome", n.nome || NOMES_TIPO[n.tipo]));
  const sub = el("div", "vt-sub");
  extras.forEach((x) => x && sub.appendChild(x));
  if (n.cidade) { const s = el("span", "vt-local"); s.append(icone("pin"), document.createTextNode(textoCidade(n))); sub.appendChild(s); }
  txt.appendChild(sub);
  topo.append(avatar(n.foto, n.nome), txt);
  return topo;
}

function cartaoServico(n) {
  const c = el("article", "vt-card vt-servico");
  const cats = categoriasDe(n);
  c.appendChild(cabecalhoCartao(n, [estrelasNeg(idNegocio(n), { nome: n.nome, donoId: n.donoId })]));
  const areas = el("div", "vt-areas");
  cats.slice(0, 3).forEach((k) => areas.appendChild(el("span", "vt-tag", nomeCat(n, k))));
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
  capa.style.backgroundImage = `url("${capaDe(n) || TEXTOS.delivery.img}")`;
  const aberto = abertoAgora(n);
  if (aberto !== null) capa.appendChild(el("span", "vt-tag " + (aberto ? "ok" : "off"), aberto ? "Aberto agora" : "Fechado"));
  capa.appendChild(avatar(n.foto, n.nome, "vt-avatar logo"));
  const corpo = el("div", "corpo");
  const cab = el("div");
  cab.append(el("h3", "vt-nome", n.nome || "Delivery"));
  const sub = el("div", "vt-sub");
  sub.append(estrelasNeg(idNegocio(n), { compacto: true, nome: n.nome, donoId: n.donoId }), el("span", "vt-tag", nomeCategoria(n)));
  if (n.cidade) { const s = el("span", "vt-local"); s.append(icone("pin"), document.createTextNode(textoCidade(n))); sub.appendChild(s); }
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
function barraContato({ proprio, aoEditar, editarHref, sair, texto, whats, textoWhats, aoMensagem, donoId, cartao, aoContar = () => {}, contaMensagem = true }) {
  const barra = el("div", "vd-acoes");
  if (proprio) {
    if (aoEditar) { const b = el("button", "vt-btn pri"); b.type = "button"; b.append(icone("lapis"), document.createTextNode("Editar")); b.addEventListener("click", () => { sair(); aoEditar(); }); barra.appendChild(b); }
    else { const a = el("a", "vt-btn pri"); a.href = editarHref; a.append(icone("lapis"), document.createTextNode("Editar")); barra.appendChild(a); }
    return barra;
  }
  const w = linkWhats(whats, textoWhats, () => aoContar("whats"));
  const m = el("button", "vt-btn " + (w ? "sec" : "pri"));
  m.type = "button";
  m.append(icone("chat"), document.createTextNode(texto));
  m.addEventListener("click", () => { if (contaMensagem) aoContar("mensagem"); aoMensagem(donoId, cartao); });
  barra.appendChild(m);
  if (w) barra.appendChild(w);
  return barra;
}

// ---------- perfil completo do negócio ----------
// opcoes: { fb, eu, dono, proprio, aoMensagem(uid, cartao), aoEditar(n), aoPerfil(uid) }
export function abrirDetalhe(n, opcoes = {}) {
  // Precisa do plano do dono para saber o que mostrar (perfil grátis tem limites): lê antes, se ainda não sabe.
  if (n?.donoId && !planosDonos.has(n.donoId) && !opcoes._comPlano) {
    lerPlano(opcoes.fb || fb, n.donoId).catch(() => null).then((pl) => { planosDonos.set(n.donoId, pl); abrirDetalhe(n, { ...opcoes, _comPlano: true }); });
    return;
  }
  n = comLimites(n);
  const semPedido = !!n._gratis;
  const tipo = n.tipo || TIPO;
  const fbx = opcoes.fb || fb, euX = opcoes.eu || eu;
  const dono = opcoes.dono || donos.get(n.donoId) || {};
  const proprio = opcoes.proprio ?? (!!euX && n.donoId === euX.uid);
  const aoMensagem = opcoes.aoMensagem || ((uid, cartao) => prepararConversa(fbx, euX, uid, cartao));
  const { caixa, sair } = novaJanela(tipo, n.nome || "Negócio");
  const fotos = (n.fotos || []).filter(urlSegura);
  // Estatísticas: a visita (uma por pessoa no dia) e cada ação do cliente.
  usarEstat(fbx, euX);
  const origem = opcoes.origem || origemPadrao();
  const neg = negEstat(n, tipo);
  const contar = (acao) => { if (!proprio) registrarAcao(neg, acao, origem); };
  if (!proprio) registrarVisita(neg, origem);

  const capa = el("div", "vd-capa");
  capa.style.backgroundImage = `url("${capaDe(n) || TEXTOS[tipo].img}")`;
  const logo = avatar(n.foto, n.nome, "vt-avatar vd-logo");
  capa.appendChild(logo);
  caixa.appendChild(capa);
  // Flash do negócio: anel na foto (o dono escolhe, ao publicar o flash, em quais negócios ele aparece).
  if (euX) anelNegocio(fbx, euX, logo, { ...n, tipo, id: n.id || idNegocio({ ...n, tipo }) }, {
    aoMensagem: proprio ? null : () => aoMensagem(n.donoId, cartaoDeNegocio({ ...n, tipo })),
    aoPerfil: opcoes.aoPerfil || null
  });
  const ct = el("div", "conteudo");
  if (proprio) {
    const aviso = el("div", "vd-previa");
    aviso.append(el("span", null, "Pré-visualização: é assim que os outros veem seu perfil de negócio."));
    if (semPedido) aviso.append(el("span", null, ` Perfil grátis: aparecem até ${LIMITES_GRATIS.itens} itens e ${LIMITES_GRATIS.fotos} foto, sem capa, links e pedidos pelo site. Com um plano, tudo volta.`));
    ct.appendChild(aviso);
  }
  const cab = el("div", "vd-cab");
  cab.appendChild(el("h3", null, n.nome || NOMES_TIPO[tipo]));
  const tags = el("div", "vt-sub");
  if (tipo === "servicos") categoriasDe(n).forEach((k) => tags.appendChild(el("span", "vt-tag", nomeCat(n, k))));
  else if (tipo === "saude") {
    tags.appendChild(el("span", "vt-tag", nomeProfissao(n.saude)));
    (n.saude?.especialidades || []).slice(0, 4).forEach((e) => tags.appendChild(el("span", "vt-tag neutra", e)));
  } else if (tipo !== "imoveis") tags.appendChild(el("span", "vt-tag", nomeCategoria(n)));
  else tags.appendChild(el("span", "vt-tag", ANUNCIANTE[n.tipoAnunciante] || "Anunciante"));
  const sitH = situacaoHorario(n);
  if (sitH) tags.appendChild(el("span", "vt-tag " + (sitH.aberto ? "ok" : "off"), sitH.aberto ? "Aberto agora" : "Fechado"));
  else if (tipo === "delivery") { const ab = abertoAgora(n); if (ab !== null) tags.appendChild(el("span", "vt-tag " + (ab ? "ok" : "off"), ab ? "Aberto agora" : "Fechado")); }
  if (n.cidade) { const s2 = el("span", "vt-local"); s2.append(icone("pin"), document.createTextNode([n.bairro, textoCidade(n)].filter(Boolean).join(", "))); tags.appendChild(s2); }
  const notaCab = el("div", "vd-nota-cab");
  notaCab.appendChild(estrelasNeg(idNegocio({ ...n, tipo }), { nome: n.nome, donoId: n.donoId, fbx }));
  cab.append(tags, notaCab, linkCriador(n.donoId, dono, opcoes.aoPerfil));
  // Confiança: responsável com perfil verificado e CNPJ informado.
  const conf0 = el("div", "vd-selos");
  if (dono.verificado) { const v = el("span", "vd-selo-ok"); v.append(icone("verificado"), document.createTextNode("Responsável verificado")); v.title = "A identidade de quem criou este perfil foi conferida pela equipe do Help Floripa."; conf0.appendChild(v); }
  // Tempo de resposta (média das conversas do dono).
  const resp = respostaDe({ donoId: n.donoId }) || (dono.atendimento?.resposta?.n >= 3 ? dono.atendimento.resposta : null);
  if (resp) { const r = el("span", "vd-selo-resp" + (resp.media <= 60 ? " rapido" : "")); r.append(icone("relogio"), document.createTextNode(resp.media <= 60 ? `Responde rápido · ${tempoResposta(resp.media)}` : `Responde em ${tempoResposta(resp.media)}`)); r.title = "Tempo médio de resposta nas conversas do Help Floripa."; conf0.appendChild(r); }
  if (cnpjTxt(n.cnpj)) { const c = el("span", "vd-selo-cnpj"); c.append(icone("cartao"), document.createTextNode(`CNPJ ${cnpjTxt(n.cnpj)}`)); conf0.appendChild(c); }
  cab.appendChild(conf0); conf0.hidden = !conf0.children.length;
  // Selo do plano pago (lido do plano da conta, guardado 10 min).
  lerPlano(fbx || fb, n.donoId).then((pl) => {
    const antes = planosDonos.has(n.donoId);
    planosDonos.set(n.donoId, pl);
    if (!antes) pintarPromo();
    if (!nivelPlano(pl)) return;
    const pr = el("span", "vd-selo-pro"); pr.append(seloPlano(pl), document.createTextNode(`Negócio ${nomePlano(pl.plano)}`));
    pr.title = `Este negócio assina o plano ${nomePlano(pl.plano)} do Help Floripa.`;
    conf0.prepend(pr); conf0.hidden = false;
  }).catch(() => {});
  ct.appendChild(cab);
  // Saúde: registro no conselho com o link para conferir, como atende e o aviso de emergência.
  if (tipo === "saude") ct.appendChild(blocoSaude(n));

  // Promoção ou cupom com prazo (só com o plano do dono ativo: aparece quando o plano é lido).
  const lugarPromo = el("div", "vd-promo-lugar"); lugarPromo.style.display = "contents";
  ct.appendChild(lugarPromo);
  const pintarPromo = () => {
  const promo = promoAtiva(n);
  lugarPromo.replaceChildren();
  if (promo) {
    const p = el("div", "vd-promo");
    const ic = el("span", "ic"); ic.appendChild(icone("cupom", "vi"));
    const tx = el("div", "tx");
    tx.append(el("small", null, "Promoção"), el("strong", null, promo.titulo));
    if (promo.texto) tx.appendChild(el("p", null, promo.texto));
    tx.appendChild(el("span", "ate", prazoPromo(promo.ate)));
    p.append(ic, tx);
    if (promo.codigo) {
      const b = el("button", "vd-cupom"); b.type = "button";
      b.append(el("span", null, promo.codigo), el("small", null, "Copiar"), icone("copiar"));
      b.setAttribute("aria-label", `Copiar o cupom ${promo.codigo}`);
      b.addEventListener("click", async () => {
        guardarCupom(n, promo.codigo);
        const usar = n.tipo === "delivery" || n.tipo === "lojinha" ? "Ele já entra no seu pedido." : n.tipo === "servicos" ? "Ele já entra no seu pedido de orçamento." : n.tipo === "saude" ? "Ele já entra no seu pedido de agendamento." : "Mostre ao falar com o anunciante.";
        try { await navigator.clipboard.writeText(promo.codigo); toast(`Cupom ${promo.codigo} copiado. ${usar}`); } catch { toast(`Cupom ${promo.codigo}. ${usar}`); }
        contar("cupom");
      });
      p.appendChild(b);
    }
    lugarPromo.appendChild(p);
  }
  };
  pintarPromo();

  // Atalhos: Instagram, site, como chegar e compartilhar.
  const links = el("div", "vd-links");
  const linkExt = (ic, rot, href, acao) => {
    const a = el("a", "vd-link"); a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer";
    a.append(icone(ic), el("span", null, rot));
    a.addEventListener("click", () => contar(acao));
    links.appendChild(a);
  };
  if (/^[A-Za-z0-9._]{1,30}$/.test(n.instagram || "")) linkExt("instagram", "@" + n.instagram, `https://instagram.com/${n.instagram}`, "instagram");
  if (/^https?:\/\/\S{3,}$/.test(n.site || "")) linkExt("site", "Site", n.site, "site");
  if (n.rua) {
    const end = [[n.rua, n.numero].filter(Boolean).join(", "), n.bairro, textoCidade(n), n.uf].filter(Boolean).join(", ");
    linkExt("rota", "Como chegar", `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(end)}`, "rota");
  }
  {
    const b = el("button", "vd-link"); b.type = "button";
    b.append(icone("compartilhar"), el("span", null, "Compartilhar"));
    b.addEventListener("click", async () => {
      const url = new URL(`${PAGINA_TIPO[tipo]}?negocio=${encodeURIComponent(neg.id)}`, location.href).href;
      try {
        if (navigator.share) await navigator.share({ title: n.nome, text: `${n.nome} no Help Floripa`, url });
        else { await navigator.clipboard.writeText(url); toast("Link copiado"); }
        contar("compartilhar");
      } catch (e) { if (e?.name !== "AbortError") toast("Não foi possível compartilhar agora."); }
    });
    links.appendChild(b);
  }
  ct.appendChild(links);

  const listaDias = (d) => (Array.isArray(d) && d.length ? (d.length === 7 ? "Todos os dias" : Object.keys(DIAS).filter((k) => d.includes(k)).map((k) => DIAS[k]).join(", ")) : "");
  const listaPag = (p) => (Array.isArray(p) && p.length ? p.filter((k) => PAGAMENTOS[k]).map((k) => PAGAMENTOS[k]).join(", ") : "");
  const fatos = {
    servicos: () => [["sacola", moeda(n.precoDesde) || "A combinar", "a partir de"], ["relogio", sitH ? "" : [listaDias(n.dias), n.horario].filter(Boolean).join(" · "), "atendimento"],
      ["casa", (n.atendimento || []).filter((k) => MODOS[k]).map((k) => MODOS[k]).join(" · "), "como atende"],
      ["pin", n.regiao || "", "região"], ["selo", Number(n.experiencia) > 0 ? `${n.experiencia} ${Number(n.experiencia) === 1 ? "ano" : "anos"}` : "", "experiência"],
      ["cnh", Array.isArray(n.cnh) && n.cnh.length ? n.cnh.join(" · ") : "", "CNH"], ["carro", n.veiculo || "", "veículo"],
      ["cartao", listaPag(n.pagamentos), "pagamento"]],
    delivery: () => [["relogio", sitH ? "" : [listaDias(n.dias), n.horaAbre && n.horaFecha ? `${n.horaAbre}–${n.horaFecha}` : ""].filter(Boolean).join(" · "), "funcionamento"],
      ["moto", n.tempoMin || n.tempoMax ? `${n.tempoMin || "?"}–${n.tempoMax || "?"} min` : "", "tempo de entrega"],
      ["moto", Number(n.taxaEntrega) > 0 ? moeda(n.taxaEntrega) : "Grátis", "taxa de entrega"], ["sacola", moeda(n.pedidoMinimo), "pedido mínimo"],
      ["casa", opcoesRecebimento(n).map((k) => (k === "entrega" ? "Entrega" : "Retirada")).join(" · "), "como receber"],
      ["cartao", listaPag(n.pagamentos), "pagamento"]],
    lojinha: () => [["moto", (n.entrega || []).map((k) => (k === "entrega" ? "Entrega" : "Retirada")).join(" · "), "como receber"],
      ["sacola", (n.itens || []).filter((i) => i?.nome).length || "", "produtos"], ["cartao", listaPag(n.pagamentos), "pagamento"]],
    imoveis: () => [["selo", n.creci || "", "CRECI"]],
    saude: () => {
      const sd = n.saude || {}, pub = ehVet(sd) ? PUBLICO_VET : PUBLICO_SAUDE;
      const conv = [sd.particular ? "Particular" : "", ...(sd.convenios || [])].filter(Boolean);
      return [["sacola", [Number(sd.valorConsulta) > 0 ? moeda(sd.valorConsulta) : "", Number(sd.duracao) > 0 ? `${sd.duracao} min` : ""].filter(Boolean).join(" · "), ehVet(sd) ? "consulta veterinária" : "consulta"],
        ["cartao", conv.join(", "), "convênios e particular"],
        ["casa", (sd.modalidades || []).filter((k) => MODALIDADES_SAUDE[k]).map((k) => MODALIDADES_SAUDE[k]).join(" · "), "como atende"],
        ["selo", (sd.publico || []).filter((k) => pub[k]).map((k) => pub[k]).join(", "), ehVet(sd) ? "animais que atende" : "atende"],
        ["chat", (sd.idiomas || []).join(", "), "idiomas"],
        ["check", sd.acessivel ? "Local com acessibilidade" : "", "acessibilidade"],
        ["selo", String(sd.formacao || ""), "formação"],
        ["relogio", sitH ? "" : [listaDias(n.dias), n.horario].filter(Boolean).join(" · "), "atendimento"]];
    }
  }[tipo]();
  if (tipo === "servicos" && Array.isArray(n.diferenciais) && n.diferenciais.length) {
    const d = el("div", "vd-diferenciais");
    n.diferenciais.filter((k) => DIFERENCIAIS_SERV[k]).forEach((k) => { const t = el("span", "vt-tag" + (k === "urgencia" ? " urgente" : "")); t.append(icone("check"), document.createTextNode(DIFERENCIAIS_SERV[k])); d.appendChild(t); });
    if (d.children.length) ct.appendChild(d);
  }
  // Endereço do local (só quando o negócio informou rua): aparece primeiro.
  const endLocal = [[n.rua, n.numero].filter(Boolean).join(", "), n.complemento, n.bairro, textoCidade(n)].filter(Boolean).join(" · ");
  const fb1 = fatosBox([...(n.rua ? [["pin", endLocal, "endereço"]] : []), ...fatos]);
  if (fb1) ct.appendChild(fb1);
  if (n.descricao) { ct.appendChild(titulo4("Sobre")); ct.appendChild(el("p", "texto", n.descricao)); }
  if (sitH) {
    ct.appendChild(titulo4(tipo === "servicos" || tipo === "saude" ? "Horário de atendimento" : "Horário de funcionamento"));
    const h = el("div", "vd-horario");
    const st = el("div", "vd-horario-agora " + (sitH.aberto ? "ok" : "off"));
    st.append(el("i"), el("strong", null, sitH.aberto ? "Aberto agora" : "Fechado agora"), el("span", null, sitH.texto));
    h.appendChild(st);
    const hoje = new Date().getDay();
    [1, 2, 3, 4, 5, 6, 0].forEach((k) => {
      const l = el("div", "vd-horario-dia" + (k === hoje ? " hoje" : ""));
      l.append(el("span", null, NOMES_DIA[k] + (k === hoje ? " (hoje)" : "")), el("strong", n.semana[k] ? null : "fechado", n.semana[k] ? horaTxt(n.semana[k]) : "Fechado"));
      h.appendChild(l);
    });
    ct.appendChild(h);
  }

  const itens = (n.itens || []).filter((i) => i?.nome);
  const orcar = (idx = null) => (proprio || semPedido ? null : abrirOrcamento(n, { ...opcoes, fb: fbx, eu: euX, aoMensagem, origem }, idx));
  const agendar = (idx = null) => (proprio || semPedido ? null : abrirAgendamento(n, { ...opcoes, fb: fbx, eu: euX, aoMensagem, origem }, idx));
  if (tipo === "saude" && itens.length) {
    // Consultas e procedimentos com preço e duração; "Agendar" já leva o escolhido.
    ct.appendChild(titulo4(ehVet(n.saude) ? "Consultas e serviços" : "Consultas e procedimentos"));
    const ul = el("div", "vd-servicos");
    (n.itens || []).forEach((i, idx) => {
      if (!i?.nome) return;
      const li = el("div", "vd-serv");
      const tx = el("div", "tx");
      tx.appendChild(el("strong", null, i.nome));
      if (i.duracao) tx.appendChild(el("small", null, `⏱ ${i.duracao}`));
      if (i.descricao) tx.appendChild(el("p", null, i.descricao));
      const pr = el("div", "pr");
      pr.append(el("strong", null, moeda(i.preco) || "Consultar"));
      if (!proprio && !semPedido) {
        const b = el("button", "vd-pedir", "Agendar"); b.type = "button";
        b.addEventListener("click", () => { registrarItem(neg, chaveEstat(i.nome), origem); agendar(idx); });
        pr.appendChild(b);
      }
      li.append(tx, pr);
      ul.appendChild(li);
    });
    ct.appendChild(ul);
  } else if (tipo === "servicos" && itens.length) {
    // serviços agrupados por área de atuação, cada um com como cobra, duração e o que inclui
    const cats = categoriasDe(n);
    const comIdx = (n.itens || []).map((i, idx) => ({ i, idx })).filter(({ i }) => i?.nome);
    const grupos = [...cats, ""].map((k) => [k, comIdx.filter(({ i }) => (i.categoria || "") === k || (!k && !cats.includes(i.categoria || "")))]).filter(([, l]) => l.length);
    ct.appendChild(titulo4("Serviços e preços"));
    grupos.forEach(([k, lista]) => {
      if (grupos.length > 1) ct.appendChild(el("div", "vd-subtitulo", k ? nomeCat(n, k) : "Outros serviços"));
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
        if (!proprio && !semPedido) {
          const b = el("button", "vd-pedir", "Pedir");
          b.type = "button";
          b.addEventListener("click", () => { if (!proprio) registrarItem(neg, chaveEstat(i.nome), origem); orcar(idx); });
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
    if (!proprio && semPedido) ct.appendChild(el("p", "vd-dica", "Para pedir, fale com o negócio pelo chat ou pelo WhatsApp aqui embaixo."));
    else if (!proprio) ct.appendChild(el("p", "vd-dica", tipo === "delivery" ? "Toque em Adicionar para montar seu pedido. O total vai somando lá embaixo." : "Toque no produto para ver tamanhos, cores e detalhes."));
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
      ver.addEventListener("click", () => abrirPedido(n, { ...opcoes, fb: fbx, eu: euX, aoMensagem, origem }, pintarItens));
      barraCarrinho.append(info, ver);
    };
    const opcoesProduto = () => ({ ...opcoes, fb: fbx, eu: euX, aoMensagem, proprio, aoMudarCarrinho: pintarItens, origem, semPedido });
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
            if (!proprio && !semPedido && est !== 0) {
              const chave = chaveItem(i, idx);
              lado.appendChild(controleQtd(carrinho[chave] || 0, limiteItem(i), (q) => { if (q > 0) registrarItem(neg, chaveEstat(i.nome), origem); mudarCarrinho(n, chave, q); pintarItens(); }));
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
        if (!(await confirmarHF({ titulo: est === 1 ? "Última unidade vendida?" : "Tirar da loja?", texto: msg, ok: est === 1 ? "Sim, vendido" : "Tirar", icone: est === 1 ? "check" : "lixo", cor: est === 1 ? "normal" : "perigo" }))) return;
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
      if (semPedido) lista = umAnuncioGratis(lista);
      grade.replaceChildren();
      if (!lista.length) { grade.appendChild(el("p", "vt-sub", proprio ? "Você ainda não anunciou imóveis. Use Editar para anunciar." : "Nenhum imóvel disponível no momento.")); return; }
      lista.forEach((a) => grade.appendChild(miniImovel(a, () => { sair(); abrirAnuncio({ ...a, donoId: n.donoId }, { ...opcoes, anunciante: n }); })));
    }).catch(() => { grade.replaceChildren(el("p", "vt-sub", "Não foi possível carregar os imóveis.")); });
  } else {
    const galeria = tipo === "delivery" ? [] : fotos;
    if (galeria.length) {
      ct.appendChild(titulo4(tipo === "servicos" ? "Trabalhos realizados" : tipo === "saude" ? "O local de atendimento" : "Fotos"));
      const g = el("div", "vd-galeria");
      galeria.forEach((f, i) => { const im = document.createElement("img"); im.src = f; im.alt = `Foto ${i + 1}`; im.loading = "lazy"; g.appendChild(im); });
      ct.appendChild(g);
    }
  }

  ct.appendChild(barraContato({
    proprio, sair, aoEditar: opcoes.aoEditar ? () => opcoes.aoEditar(n) : null, editarHref: `negocios.html?tipo=${tipo}`,
    texto: tipo === "imoveis" ? "Falar com o anunciante" : semPedido ? "Conversar pelo chat" : TEXTO_CONTATO[tipo], whats: n.whatsapp,
    textoWhats: `Olá! Vi "${n.nome}" no Help Floripa.`, aoMensagem: semPedido ? aoMensagem : tipo === "servicos" ? () => orcar() : tipo === "saude" ? () => agendar() : aoMensagem, donoId: n.donoId, cartao: cartaoDeNegocio(n),
    aoContar: contar, contaMensagem: semPedido || (tipo !== "servicos" && tipo !== "saude")
  }));
  // Avaliar e reclamar: abertos pelo cliente (uma nota por cliente; reclamação com limite justo).
  if (!proprio && euX && fbx) {
    const conf = el("div", "vd-confianca");
    const autor = { nome: euX.displayName || "", foto: euX.photoURL || "" };
    const bA = el("button", "vt-btn sec"); bA.type = "button";
    bA.append(icone("estrela"), document.createTextNode("Avaliar"));
    bA.addEventListener("click", () => avaliarNegocio(fbx, euX, n, { autor, aoAvaliar: (nota, editou) => {
      toast(editou ? "Avaliação atualizada" : "Obrigado pela avaliação!");
      contar("avaliar");
      lerResumo(fbx, "neg_" + idNegocio(n), { recarregar: true }).then((r) => { notasNeg.set(idNegocio(n), r); const e = notaCab.querySelector(".hf-estrelas"); if (e) pintarEstrelas(e, r); });
    } }));
    const bR = el("button", "vt-btn sec reclamar"); bR.type = "button";
    bR.append(icone("alerta"), document.createTextNode("Reclamar"));
    bR.addEventListener("click", () => abrirQueixa(fbx, euX, n, { autor, aoAbrir: (id) => { toast("Reclamação enviada. O negócio tem 7 dias para responder."); setTimeout(() => { location.href = `reclamacoes.html?negocio=${encodeURIComponent(id)}`; }, 1200); } }));
    // Golpe ou perfil falso não precisa de conversa: vai para a equipe analisar.
    const bD = el("button", "vd-denunciar", "Denunciar golpe ou perfil falso"); bD.type = "button";
    bD.addEventListener("click", async () => {
      const { abrirDenuncia } = await import("./denuncias.js?v=5");
      abrirDenuncia({ fb: fbx, eu: euX, tipo: "negocio", alvoId: n.donoId, itemId: idNegocio(n), trecho: [n.nome, n.descricao].filter(Boolean).join(" · "), nomeAlvo: n.nome || "", podeBloquear: false });
    });
    conf.append(bA, bR, el("small", null, "Só avalia ou reclama quem conversou com o negócio pelo chat."), bD);
    ct.appendChild(conf);
  }
  // barra do carrinho fica colada no rodapé, no lugar dos botões de contato
  const bc = ct.querySelector(".vd-carrinho");
  if (bc) ct.insertBefore(bc, ct.lastChild);
  caixa.appendChild(ct);
}

// Registro do conselho (com link para conferir), formas de atendimento e avisos de saúde.
function blocoSaude(n) {
  const sd = n.saude || {}, box = el("div", "vd-saude");
  const reg = textoRegistro(sd), cons = conselhoDe(sd);
  const l1 = el("div", "vd-saude-reg");
  const ic = el("span", "ic"); ic.appendChild(icone("escudo", "vi"));
  const tx = el("div", "tx");
  tx.append(el("small", null, cons ? "Registro profissional" : "Profissão"), el("strong", null, reg || (cons ? `${cons} não informado` : nomeProfissao(sd))));
  if (reg) tx.appendChild(el("span", null, AVISO_REGISTRO));
  l1.append(ic, tx);
  if (reg && SITE_CONSELHO[cons]) {
    const a = el("a", "vd-saude-conf"); a.href = SITE_CONSELHO[cons]; a.target = "_blank"; a.rel = "noopener noreferrer";
    a.append(document.createTextNode(`Conferir no ${cons === "CRM" ? "CFM" : cons}`), icone("avancar"));
    l1.appendChild(a);
  }
  box.appendChild(l1);
  const mods = (sd.modalidades || []).filter((k) => MODALIDADES_SAUDE[k]);
  if (mods.length) {
    const m = el("div", "vd-saude-mod");
    mods.forEach((k) => { const t = el("span", "vt-tag " + k); t.append(icone(k === "online" ? "online" : k === "domicilio" ? "casa" : "estetoscopio"), document.createTextNode(MODALIDADES_SAUDE[k])); m.appendChild(t); });
    box.appendChild(m);
  }
  const av = el("p", "vd-saude-urg"); av.append(icone("alerta"), document.createTextNode(AVISO_EMERGENCIA));
  box.appendChild(av);
  return box;
}
// Pedido de agendamento (vai como cartão na conversa, igual ao orçamento): o que, para quem, como, convênio e quando.
export function abrirAgendamento(n, opcoes = {}, preIdx = null) {
  const fbx = opcoes.fb || fb, euX = opcoes.eu || eu;
  if (!euX) { location.href = "login.html"; return; }
  const sd = n.saude || {}, vet = ehVet(sd);
  const { caixa } = novaJanela("saude", "Agendar consulta");
  caixa.classList.add("vd-pedido");
  const ct = el("div", "conteudo");
  caixa.appendChild(ct);
  const itens = (n.itens || []).map((i, idx) => ({ i, idx })).filter(({ i }) => i?.nome);
  const opServ = itens.length ? Object.fromEntries(itens.map(({ i, idx }) => [String(idx), i.nome])) : { consulta: vet ? "Consulta veterinária" : "Consulta" };
  const mods = (sd.modalidades || []).filter((k) => MODALIDADES_SAUDE[k]);
  const conv = [...(sd.particular || !(sd.convenios || []).length ? ["Particular"] : []), ...(sd.convenios || [])];
  const estado = { servicos: preIdx !== null && opServ[String(preIdx)] ? [String(preIdx)] : Object.keys(opServ).length === 1 ? Object.keys(opServ) : [], quem: vet ? "pet" : "eu", nomeQuem: "", modo: mods.length === 1 ? mods[0] : "", convenio: conv.length === 1 ? conv[0] : "", quando: "", data: "", periodo: "", descricao: "", local: "" };
  const cab = el("div", "vd-cab");
  cab.append(el("h3", null, "Agendar consulta"), linhaNegocioMini(n));
  ct.appendChild(cab);
  ct.appendChild(el("p", "vd-dica", "Escolha o que precisa e quando prefere. O profissional responde pelo chat com o horário disponível."));
  if (Object.keys(opServ).length > 1) ct.appendChild(campoVd("Qual atendimento?", chipsEscolha(opServ, { multi: true, valor: estado.servicos, aoMudar: (v) => { estado.servicos = v; } })));
  const quemBox = el("div");
  const pintarQuem = () => {
    const ops = vet ? { pet: "Meu pet" } : { eu: "Para mim", outra: "Para outra pessoa" };
    quemBox.replaceChildren(campoVd(vet ? "Para qual animal?" : "Para quem?", ...(vet ? [] : [chipsEscolha(ops, { valor: estado.quem, aoMudar: (v) => { estado.quem = v; pintarQuem(); } })])));
    if (vet || estado.quem === "outra") {
      const i = document.createElement("input"); i.className = "vd-input"; i.maxLength = 60; i.value = estado.nomeQuem;
      i.placeholder = vet ? "Nome, espécie e idade (ex.: Thor, cachorro, 4 anos)" : "Nome e idade (ex.: minha mãe, 72 anos)";
      i.addEventListener("input", () => { estado.nomeQuem = i.value; });
      quemBox.lastChild.appendChild(i);
    }
  };
  pintarQuem();
  ct.appendChild(quemBox);
  const modoBox = el("div");
  const pintarModo = () => {
    if (!mods.length) return;
    modoBox.replaceChildren(campoVd("Como prefere ser atendido?", chipsEscolha(Object.fromEntries(mods.map((k) => [k, MODALIDADES_SAUDE[k]])), { valor: estado.modo, aoMudar: (v) => { estado.modo = v; pintarModo(); } })));
    if (estado.modo === "domicilio") {
      const loc = document.createElement("input"); loc.className = "vd-input"; loc.maxLength = 80; loc.value = estado.local;
      loc.placeholder = "Bairro e cidade (ex.: Trindade, Florianópolis)";
      loc.addEventListener("input", () => { estado.local = loc.value; });
      const c = campoVd("Onde?", loc);
      c.appendChild(el("small", "vd-nota", "Mande só o bairro agora. O endereço completo você passa depois de combinar."));
      modoBox.appendChild(c);
    }
  };
  pintarModo();
  ct.appendChild(modoBox);
  if (conv.length > 1) ct.appendChild(campoVd("Particular ou convênio?", chipsEscolha(Object.fromEntries(conv.map((c) => [c, c])), { valor: estado.convenio, aoMudar: (v) => { estado.convenio = v; } })));
  const quandoBox = el("div");
  const opQuando = { primeira: "Primeiro horário livre", agendar: "Escolher o dia", flexivel: "Sou flexível" };
  const pintarQuando = () => {
    quandoBox.replaceChildren(campoVd("Quando?", chipsEscolha(opQuando, { valor: estado.quando, aoMudar: (v) => { estado.quando = v; pintarQuando(); } })));
    if (estado.quando === "agendar") {
      const d = document.createElement("input");
      d.type = "date"; d.className = "vd-input"; d.dataset.titulo = "Qual dia?";
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
  const desc = document.createElement("textarea");
  desc.className = "vd-obs"; desc.maxLength = 400;
  desc.placeholder = vet ? "Ex.: primeira consulta, vacinas atrasadas, está sem comer há 2 dias..." : "Ex.: primeira consulta, retorno, quero tirar uma dúvida sobre...";
  desc.addEventListener("input", () => { estado.descricao = desc.value; });
  const cDesc = campoVd("Algo que o profissional precisa saber? (opcional)", desc);
  cDesc.appendChild(el("small", "vd-nota", "Não mande exames, documentos ou detalhes muito pessoais agora: combine isso direto com o profissional."));
  ct.appendChild(cDesc);
  const urg = el("p", "vd-saude-urg"); urg.append(icone("alerta"), document.createTextNode(AVISO_EMERGENCIA));
  ct.appendChild(urg);
  const cupom = blocoCupom(n, estado);
  if (cupom) ct.appendChild(cupom);
  const montar = () => {
    const nomes = estado.servicos.map((k) => opServ[k]).filter(Boolean);
    const quem = vet ? `Pet: ${estado.nomeQuem.trim()}` : estado.quem === "outra" ? `Para: ${estado.nomeQuem.trim() || "outra pessoa"}` : "Para mim";
    return {
      cupom: cupomDoEstado(estado.cupom),
      servicos: nomes.slice(0, 12), descricao: estado.descricao.trim().slice(0, 400),
      quando: { tipo: estado.quando === "agendar" ? "agendar" : "flexivel", data: estado.quando === "agendar" ? estado.data : "", periodo: estado.quando === "agendar" ? estado.periodo : "" },
      local: estado.modo === "domicilio" ? estado.local.trim().slice(0, 80) : "", modo: estado.modo === "consultorio" ? "local" : estado.modo,
      saude: { quem: quem.slice(0, 80), convenio: String(estado.convenio || "").slice(0, 40), atendimento: MODALIDADES_SAUDE[estado.modo] || "", primeiro: estado.quando === "primeira" }
    };
  };
  const validar = () => {
    if (Object.keys(opServ).length > 1 && !estado.servicos.length) { toast("Escolha o atendimento."); return false; }
    if ((vet || estado.quem === "outra") && estado.nomeQuem.trim().length < 2) { toast(vet ? "Conte qual é o animal." : "Diga para quem é a consulta."); return false; }
    if (mods.length > 1 && !estado.modo) { toast("Escolha como prefere ser atendido."); return false; }
    if (conv.length > 1 && !estado.convenio) { toast("Escolha particular ou o convênio."); return false; }
    if (!estado.quando) { toast("Diga quando prefere."); return false; }
    if (estado.quando === "agendar" && !estado.data) { toast("Escolha o dia."); return false; }
    return true;
  };
  const textoQuandoS = (s) => (s.saude.primeiro ? "Primeiro horário livre" : textoQuando(s.quando));
  const barra = el("div", "vd-acoes");
  const env = el("button", "vt-btn pri"); env.type = "button";
  env.append(icone("chat"), document.createTextNode("Enviar pedido de agendamento"));
  env.addEventListener("click", () => {
    if (!validar()) return;
    const s = montar();
    const cartao = { ...cartaoDeNegocio(n), titulo: `Agendamento · ${n.nome || "Saúde"}`, sub: (s.servicos.join(", ") || "Consulta"), preco: textoQuandoS(s), solicitacao: s };
    contarAcao(n, "orcamento", opcoes.origem);
    document.querySelectorAll(".vt-modal").forEach((m) => m.remove());
    (opcoes.aoMensagem || conversar)(n.donoId, cartao);
  });
  barra.appendChild(env);
  const w = linkWhats(n.whatsapp, "", () => contarAcao(n, "whats", opcoes.origem));
  if (w) {
    w.addEventListener("click", (e) => {
      if (!validar()) { e.preventDefault(); return; }
      const s = montar();
      const txt = [`Olá! Vi seu perfil "${n.nome}" no Help Floripa e gostaria de agendar.`, "",
        s.servicos.length ? `Atendimento: ${s.servicos.join(", ")}` : "", s.saude.quem, s.saude.atendimento ? `Como: ${s.saude.atendimento}` : "",
        s.saude.convenio ? `Pagamento: ${s.saude.convenio}` : "", `Quando: ${textoQuandoS(s)}`, s.local ? `Local: ${s.local}` : "", s.descricao ? `Obs.: ${s.descricao}` : "", textoCupom(s.cupom)].filter(Boolean).join("\n");
      w.href = w.href.split("?")[0] + "?text=" + encodeURIComponent(txt);
    });
    barra.appendChild(w);
  }
  ct.appendChild(barra);
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
  // Estatísticas do perfil de imóveis do anunciante: visita + qual imóvel foi visto.
  usarEstat(fbx, euX);
  const negIm = { id: `${a.donoId}_imoveis`, donoId: a.donoId, tipo: "imoveis" };
  const origemAn = opcoes.origem || origemPadrao();
  const contarIm = (acao) => { if (!proprio) registrarAcao(negIm, acao, origemAn); };
  if (!proprio) { registrarVisita(negIm, origemAn); if (a.id && !a.legado) registrarItem(negIm, chaveAnuncio(a.id), origemAn); }
  const g = el("div", "vd-fotos");
  (fotos.length ? fotos : [TEXTOS.imoveis.img]).forEach((f, i) => { const im = document.createElement("img"); im.src = f; im.alt = `Foto ${i + 1}`; g.appendChild(im); });
  caixa.appendChild(g);
  if (fotos.length > 1) caixa.appendChild(el("div", "vd-fotos-n", `${fotos.length} fotos · deslize para ver`));
  const ct = el("div", "conteudo");
  const cab = el("div", "vd-cab");
  const preco = el("div", "vd-preco", precoImovel(a));
  const tags = el("div", "vt-sub");
  tags.appendChild(el("span", "vt-tag", FINALIDADE[a.finalidade] || "Imóvel"));
  tags.appendChild(el("span", "vt-tag neutra", (CATEGORIAS.imoveis[a.categoria] && nomeCat(a, a.categoria)) || "Imóvel"));
  if (a.mobiliado) tags.appendChild(el("span", "vt-tag neutra", "Mobiliado"));
  const local = [a.bairro, textoCidade(a)].filter(Boolean).join(", ");
  if (local) { const s = el("span", "vt-local"); s.append(icone("pin"), document.createTextNode(local)); tags.appendChild(s); }
  cab.append(preco, el("h3", null, tituloImovel(a)), tags);
  ct.appendChild(cab);
  ct.appendChild(specsImovel(a));
  const custo = (Number(a.preco) || 0) + (a.finalidade === "aluguel" ? (Number(a.condominio) || 0) + (Number(a.iptu) || 0) : 0);
  const fatos = fatosBox([
    ["pin", a.rua ? [[a.rua, a.numero].filter(Boolean).join(", "), a.complemento].filter(Boolean).join(" · ") : "", "endereço"],
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
    proprio, sair, aoEditar: opcoes.aoEditar ? () => opcoes.aoEditar(anunciante) : null, editarHref: "negocios.html?tipo=imoveis",
    texto: "Tenho interesse", whats: a.whatsapp || anunciante.whatsapp, textoWhats: `Olá! Tenho interesse no imóvel "${tituloImovel(a)}" que vi no Help Floripa.`,
    aoMensagem, donoId: a.donoId, cartao: cartaoDeAnuncio(a), aoContar: contarIm
  }));
  if (proprio && a.id && !a.legado) {
    // Fechou negócio? Um toque apaga o anúncio.
    const rotulo = a.finalidade === "venda" ? "Vendido" : "Alugado";
    const fim = el("button", "vt-btn sec");
    fim.type = "button";
    fim.append(icone("check"), document.createTextNode(`${rotulo} · apagar`));
    fim.addEventListener("click", async () => {
      if (!(await confirmarHF({ titulo: `Imóvel ${rotulo.toLowerCase()}?`, texto: "O anúncio será apagado e sai da vitrine.", ok: `${rotulo} · apagar`, icone: "check" }))) return;
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
  criar.href = `negocios.html?tipo=${TIPO}`;
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
    if (link) link.href = `negocios.html?tipo=${TIPO}`;
    if (link && !lugar) link.textContent = TEXTOS[TIPO].criar;
  } else if (!lugar) main.appendChild(sec);
}

function filtroAtual() {
  const chip = document.querySelector("#filterChips .chip.active");
  return { cat: chip?.dataset.filter || "todos", termo: semAcento(document.getElementById("searchInput")?.value || "") };
}
function passaCategoria(n, cat) {
  if (cat === "todos") return true;
  const cats = TIPO === "servicos" ? categoriasDe(n) : [n.categoria];
  if (cat.startsWith("c:")) return cats.includes("outros") && (n.categoriaPersonalizada || "") === cat.slice(2);
  // Saúde: "Enfermagem" junta enfermeiros e técnicos de enfermagem.
  if (TIPO === "saude" && cat === "enfermagem") return cats.includes("enfermeiro") || cats.includes("tecEnfermagem");
  return cats.includes(cat) || n.finalidade === cat;
}
// ---------- filtro de local: Estado → Cidade (→ Bairro nos imóveis) ----------
// Guardado no aparelho. Perfis antigos sem estado: a cidade em texto é comparada pelo nome
// (as contas antigas são todas de SC, então "Florianópolis" sem estado conta como SC).
const CHAVE_LOCAL = "hf-busca-local";
let filtroLocal = {};
try { filtroLocal = JSON.parse(localStorage.getItem(CHAVE_LOCAL) || "{}") || {}; } catch {}
let nomesSC = null;
const nomeSemUf = (c) => semAcento(String(c || "").replace(/\s*[\/,-]\s*[A-Za-z]{2}\s*$/, ""));
function ufDe(n) {
  if (n.uf) return n.uf;
  const m = String(n.cidade || "").match(/[\/,-]\s*([A-Za-z]{2})\s*$/);
  if (m && NOME_UF[m[1].toUpperCase()]) return m[1].toUpperCase();
  return nomesSC?.has(nomeSemUf(n.cidade)) ? "SC" : "";
}
function passaLocal(n) {
  const f = filtroLocal;
  if (!f.uf) return true;
  if (ufDe(n) !== f.uf) return false;
  if (f.cidadeIbge && !(n.cidadeIbge ? n.cidadeIbge === f.cidadeIbge : nomeSemUf(n.cidade) === semAcento(f.cidade))) return false;
  if (f.bairro && !semAcento(n.bairro).includes(semAcento(f.bairro))) return false;
  return true;
}
const rotuloLocal = () => (!filtroLocal.uf ? "Todo o Brasil" : filtroLocal.cidadeIbge ? textoCidade(filtroLocal) + (filtroLocal.bairro ? ` · ${filtroLocal.bairro}` : "") : NOME_UF[filtroLocal.uf]);
function pintarBotaoLocal() {
  const b = document.getElementById("vtLocalBtn"); if (!b) return;
  b.querySelector("span").textContent = rotuloLocal();
  b.classList.toggle("on", !!filtroLocal.uf);
  b.setAttribute("aria-label", `Onde procurar: ${rotuloLocal()}. Tocar para mudar`);
}
function montarFiltroLocal() {
  const chips = document.getElementById("filterChips");
  if (!chips || document.getElementById("vtLocalBtn")) return;
  const b = el("button", "vt-local-btn"); b.type = "button"; b.id = "vtLocalBtn"; b.setAttribute("aria-haspopup", "dialog");
  b.append(icone("pin"), el("span"), icone("avancar"));
  chips.parentNode.insertBefore(b, chips);
  b.addEventListener("click", abrirFiltroLocal);
  pintarBotaoLocal();
  if (filtroLocal.uf) cidadesDe("SC").then((l) => { nomesSC = new Set(l.map((c) => semAcento(c.nome))); renderizar(); }).catch(() => {});
}
function abrirFiltroLocal() {
  if (document.getElementById("vtLocalPop")) return;
  const fundo = el("div", "vt-local-fundo"); fundo.id = "vtLocalPop";
  const cx = el("div", "vt-local-pop"); cx.setAttribute("role", "dialog"); cx.setAttribute("aria-modal", "true"); cx.setAttribute("aria-label", "Onde procurar");
  const topo = el("div", "vt-local-topo"); topo.append(el("strong", null, "Onde procurar"));
  const x = el("button", "vt-local-x"); x.type = "button"; x.setAttribute("aria-label", "Fechar"); x.textContent = "×"; topo.appendChild(x);
  const campos = el("div", "vt-local-campos");
  const local = camposEndereco(campos, { campos: TIPO === "imoveis" ? ["uf", "cidade", "bairro"] : ["uf", "cidade"], obrigatorios: [], valor: filtroLocal, rotuloCidade: "Cidade (opcional)" });
  campos.querySelectorAll(".opcional").forEach((o) => o.remove());
  const dica = el("small", "vt-local-dica", "Escolha só o estado para ver tudo dele, ou a cidade para ver só ela.");
  const acoes = el("div", "vt-local-acoes");
  const limpar = el("button", "vt-local-limpar", "Todo o Brasil"); limpar.type = "button";
  const aplicar = el("button", "vt-local-aplicar", "Aplicar"); aplicar.type = "button";
  acoes.append(limpar, aplicar);
  cx.append(topo, campos, dica, acoes); fundo.appendChild(cx); document.body.appendChild(fundo);
  setTimeout(() => campos.querySelector("select")?.focus(), 50);
  const fechar = () => { fundo.remove(); document.removeEventListener("keydown", tecla); document.getElementById("vtLocalBtn")?.focus(); };
  const tecla = (e) => { if (e.key === "Escape") fechar(); };
  document.addEventListener("keydown", tecla);
  fundo.addEventListener("click", (e) => { if (e.target === fundo) fechar(); });
  x.addEventListener("click", fechar);
  const salvar = async (f) => {
    filtroLocal = f;
    try { localStorage.setItem(CHAVE_LOCAL, JSON.stringify(f)); } catch {}
    if (f.uf && !nomesSC) { try { nomesSC = new Set((await cidadesDe("SC")).map((c) => semAcento(c.nome))); } catch {} }
    pintarBotaoLocal(); fechar();
    // Local novo: busca de novo no servidor (os perfis daquele Estado/cidade), depois desenha.
    if (localNoServidor && fb) {
      todos = []; negociosImoveis.clear(); cursorNeg = cursorAn = null; maisNeg = maisAn = false;
      try { await carregarLote(true); chipsDinamicos(); } catch (e) { console.warn("Vitrine:", e); }
    }
    renderizar();
  };
  limpar.addEventListener("click", () => salvar({}));
  aplicar.addEventListener("click", () => {
    const v = local.ler();
    if (!v.uf) return salvar({});
    salvar({ uf: v.uf, ...(v.cidadeIbge ? { cidade: v.cidade, cidadeIbge: v.cidadeIbge } : {}), ...(v.bairro && v.cidadeIbge ? { bairro: v.bairro } : {}) });
  });
}

// ---------- Perto de você ----------
// Posição da pessoa (GPS guardado no aparelho ou o centro da cidade do perfil) e a distância de cada item.
let posEu = null, rotuloEu = "";
const kmDe = (n) => (Number.isFinite(n?._km) ? n._km : Infinity);
const distDe = (n) => (posEu && Number.isFinite(n?._km) ? textoDistancia(n._km, n._aprox) : "");
function seloDist(f, n) {
  const t = distDe(n);
  if (!t) return;
  const s = el("span", "vt-dist"); s.append(icone("pin", "vi s"), document.createTextNode(t));
  f.appendChild(s);
}
async function definirPosicao(p) {
  posEu = p;
  rotuloEu = p ? await rotuloPosicao(p) : "";
  if (p) await comDistancia(todos, p);
}
// "Mais perto" sem posição nenhuma: pede a localização (com a cidade do perfil já dá para ordenar).
async function garantirPosicao(ordem) {
  if (ordem !== "perto" || posEu) return;
  try { await definirPosicao(await pedirLocalizacao()); } catch (e) { toast(e?.message || "Ative a localização para ver o que está mais perto."); }
}

// ---------- Filtros (gaveta) ----------
// Opções de cada página, como nos apps de entrega e de imóveis. Ficam guardadas no aparelho;
// os filtros ligados aparecem como etiquetas com "x" logo abaixo da barra.
const nota4 = (n) => { const r = notaDe(n); return !!r?.total && media(r) >= 4; };
const FILTROS = {
  servicos: [
    ["agora", "Atendendo agora", (n) => situacaoHorario(n)?.aberto === true],
    ["nota4", "Nota 4 ou mais", nota4],
    ["promo", "Com promoção", (n) => !!promoAtiva(n)],
    ["urgencia", "Atende urgência", (n) => (n.diferenciais || []).includes("urgencia")],
    ["orcamento", "Orçamento grátis", (n) => (n.diferenciais || []).includes("orcamentoGratis")],
    ["domicilio", "Vai até você", (n) => (n.atendimento || []).includes("domicilio")],
    ["online", "Atende online", (n) => (n.atendimento || []).includes("online")],
    ["garantia", "Dá garantia", (n) => (n.diferenciais || []).includes("garantia")]
  ],
  delivery: [
    ["aberto", "Aberto agora", (n) => abertoAgora(n) === true],
    ["gratis", "Entrega grátis", (n) => !(Number(n.taxaEntrega) > 0)],
    ["rapido", "Até 40 min", (n) => Number(n.tempoMax || n.tempoMin) > 0 && Number(n.tempoMax || n.tempoMin) <= 40],
    ["promo", "Com cupom ou promoção", (n) => !!promoAtiva(n)],
    ["nota4", "Nota 4 ou mais", nota4],
    ["retirada", "Retirada no local", (n) => (n.opcoesEntrega || []).includes("retirada")],
    ["pix", "Aceita Pix", (n) => !Array.isArray(n.pagamentos) || !n.pagamentos.length || n.pagamentos.includes("pix")]
  ],
  lojinha: [
    ["promo", "Com cupom ou promoção", (n) => !!promoAtiva(n)],
    ["desconto", "Produtos com desconto", (n) => (n.itens || []).some((i) => Number(i?.precoAntigo) > Number(i?.preco) && Number(i?.preco) > 0)],
    ["entrega", "Faz entrega", (n) => (n.entrega || ["entrega"]).includes("entrega")],
    ["retirada", "Retirada", (n) => (n.entrega || ["retirada"]).includes("retirada")],
    ["nota4", "Nota 4 ou mais", nota4],
    ["pix", "Aceita Pix", (n) => !Array.isArray(n.pagamentos) || !n.pagamentos.length || n.pagamentos.includes("pix")]
  ],
  saude: [
    ["online", "Atende online", (n) => (n.saude?.modalidades || []).includes("online")],
    ["domicilio", "Atende em casa", (n) => (n.saude?.modalidades || []).includes("domicilio")],
    ["consultorio", "Consultório", (n) => (n.saude?.modalidades || []).includes("consultorio")],
    ["convenio", "Aceita convênio", (n) => (n.saude?.convenios || []).length > 0],
    ["particular", "Particular", (n) => !!n.saude?.particular],
    ["agora", "Atendendo agora", (n) => situacaoHorario(n)?.aberto === true],
    ["nota4", "Nota 4 ou mais", nota4],
    ["registro", "Com registro informado", (n) => !!textoRegistro(n.saude)],
    ["acessivel", "Local acessível", (n) => !!n.saude?.acessivel],
    ["criancas", "Atende crianças", (n) => (n.saude?.publico || []).some((k) => k === "criancas" || k === "bebes")],
    ["promo", "Com promoção", (n) => !!promoAtiva(n)]
  ],
  imoveis: [
    ["mobiliado", "Mobiliado", (a) => !!a.mobiliado],
    ["pets", "Aceita pets", (a) => (a.condicoes || []).includes("pets")],
    ["vaga", "Com vaga", (a) => Number(a.vagas) > 0],
    ["fotos", "Com fotos", (a) => (a.fotos || []).some((f) => urlSegura(f))],
    ["piscina", "Piscina", (a) => (a.caracteristicas || []).includes("piscina")],
    ["vistaMar", "Vista para o mar", (a) => (a.caracteristicas || []).includes("vistaMar")],
    ["semFiador", "Sem fiador", (a) => (a.condicoes || []).includes("semFiador")]
  ]
};
const CHAVE_FILTROS = `hf-filtros-${TIPO}`;
let filtrosX = { liga: [], quartos: 0, precoMax: 0, raio: 0 };
try { const f = JSON.parse(localStorage.getItem(CHAVE_FILTROS) || "null"); if (f) filtrosX = { liga: Array.isArray(f.liga) ? f.liga : [], quartos: Number(f.quartos) || 0, precoMax: Number(f.precoMax) || 0, raio: Number(f.raio) || 0 }; } catch {}
const opcoesFiltro = () => FILTROS[TIPO] || [];
const filtrosLigados = () => filtrosX.liga.filter((k) => opcoesFiltro().some((o) => o[0] === k)).length + (filtrosX.quartos ? 1 : 0) + (filtrosX.precoMax ? 1 : 0) + (filtrosX.raio ? 1 : 0);
function passaExtras(n, f = filtrosX) {
  for (const k of f.liga) { const o = opcoesFiltro().find((x) => x[0] === k); if (o && !o[2](n)) return false; }
  if (f.raio && posEu && !(kmDe(n) <= f.raio)) return false;
  if (TIPO === "imoveis") {
    if (f.quartos && !(Number(n.quartos) >= f.quartos)) return false;
    if (f.precoMax && !(Number(n.preco) > 0 && Number(n.preco) <= f.precoMax)) return false;
  }
  return true;
}
function guardarFiltros() { try { localStorage.setItem(CHAVE_FILTROS, JSON.stringify(filtrosX)); } catch {} }
function montarBotaoFiltros() {
  const chips = document.getElementById("filterChips");
  if (!chips || document.getElementById("vtFiltrosBtn") || !opcoesFiltro().length) return;
  const b = el("button", "vt-filtros-btn"); b.type = "button"; b.id = "vtFiltrosBtn"; b.setAttribute("aria-haspopup", "dialog");
  b.append(icone("filtro"), el("span", null, "Filtros"), el("b"));
  chips.parentNode.insertBefore(b, chips);
  b.addEventListener("click", abrirFiltros);
  const ativos = el("div", "vt-ativos"); ativos.id = "vtAtivos"; ativos.hidden = true;
  chips.parentNode.insertAdjacentElement("afterend", ativos);
  pintarFiltrosAtivos();
}
function pintarFiltrosAtivos() {
  const b = document.getElementById("vtFiltrosBtn"), box = document.getElementById("vtAtivos");
  if (!b || !box) return;
  const n = filtrosLigados();
  b.classList.toggle("on", !!n);
  b.querySelector("b").textContent = n ? String(n) : "";
  b.setAttribute("aria-label", n ? `Filtros, ${n} ligados` : "Filtros");
  box.replaceChildren();
  const pilula = (rot, tirar) => { const p = el("button", "vt-ativo"); p.type = "button"; p.append(el("span", null, rot), icone("fechar")); p.setAttribute("aria-label", `Tirar o filtro ${rot}`); p.addEventListener("click", () => { tirar(); guardarFiltros(); pintarFiltrosAtivos(); renderizar(); }); box.appendChild(p); };
  filtrosX.liga.forEach((k) => { const o = opcoesFiltro().find((x) => x[0] === k); if (o) pilula(o[1], () => { filtrosX.liga = filtrosX.liga.filter((x) => x !== k); }); });
  if (filtrosX.quartos) pilula(`${filtrosX.quartos}+ quartos`, () => { filtrosX.quartos = 0; });
  if (filtrosX.precoMax) pilula(`Até ${moeda(filtrosX.precoMax)}`, () => { filtrosX.precoMax = 0; });
  if (filtrosX.raio) pilula(`Até ${filtrosX.raio} km`, () => { filtrosX.raio = 0; });
  if (n > 1) { const l = el("button", "vt-ativo limpar", "Limpar tudo"); l.type = "button"; l.addEventListener("click", () => { filtrosX = { liga: [], quartos: 0, precoMax: 0, raio: 0 }; guardarFiltros(); pintarFiltrosAtivos(); renderizar(); }); box.appendChild(l); }
  box.hidden = !n;
}
function abrirFiltros() {
  if (document.getElementById("vtFiltrosPop")) return;
  const rasc = { liga: [...filtrosX.liga], quartos: filtrosX.quartos, precoMax: filtrosX.precoMax, raio: filtrosX.raio };
  const fundo = el("div", "vt-local-fundo vt-filtros-fundo"); fundo.id = "vtFiltrosPop";
  const cx = el("div", "vt-local-pop vt-filtros-pop"); cx.setAttribute("role", "dialog"); cx.setAttribute("aria-modal", "true"); cx.setAttribute("aria-label", "Filtros");
  const topo = el("div", "vt-local-topo"); topo.append(el("strong", null, "Filtros"));
  const x = el("button", "vt-local-x"); x.type = "button"; x.setAttribute("aria-label", "Fechar"); x.textContent = "×"; topo.appendChild(x);
  const corpo = el("div", "vt-filtros-corpo");
  const sec = (t) => { const d = el("div", "vt-f-sec"); d.appendChild(el("h4", null, t)); corpo.appendChild(d); return d; };
  const chipF = (rot, on, mudar) => { const c = el("button", "vt-f-chip" + (on ? " on" : ""), rot); c.type = "button"; c.setAttribute("aria-pressed", String(on)); c.addEventListener("click", () => { mudar(); pintar(); }); return c; };
  const aplicar = el("button", "vt-local-aplicar"); aplicar.type = "button";
  const pintar = () => {
    corpo.replaceChildren();
    // Distância: com GPS é exata; com a cidade do perfil, aproximada.
    const s0 = sec("Distância");
    const onde = el("div", "vt-f-onde");
    const usar = el("button", "vt-f-loc"); usar.type = "button";
    usar.append(icone("pin", "vi s"), document.createTextNode(posEu?.origem === "gps" ? "Atualizar minha localização" : "Usar minha localização"));
    usar.addEventListener("click", async () => {
      usar.disabled = true; usar.lastChild.textContent = "Localizando...";
      try { await definirPosicao(await pedirLocalizacao()); } catch (e) { toast(e?.message || "Não foi possível pegar a localização."); }
      pintar();
    });
    onde.append(el("span", null, posEu ? `${posEu.origem === "gps" ? "Você está perto de" : "Pela cidade do seu perfil:"} ${rotuloEu || "sua região"}` : "Ative a localização para filtrar pela distância."), usar);
    s0.appendChild(onde);
    if (posEu) {
      const g0 = el("div", "vt-f-seg seis");
      [[0, "Qualquer"], [2, "2 km"], [5, "5 km"], [10, "10 km"], [25, "25 km"], [50, "50 km"]].forEach(([v, rot]) => g0.appendChild(chipF(rot, rasc.raio === v, () => { rasc.raio = v; })));
      s0.appendChild(g0);
    }
    const s1 = sec(TIPO === "imoveis" ? "Comodidades" : "Mostrar só");
    const g1 = el("div", "vt-f-chips");
    opcoesFiltro().forEach(([k, rot]) => g1.appendChild(chipF(rot, rasc.liga.includes(k), () => { rasc.liga = rasc.liga.includes(k) ? rasc.liga.filter((y) => y !== k) : [...rasc.liga, k]; })));
    s1.appendChild(g1);
    if (TIPO === "imoveis") {
      const s2 = sec("Quartos");
      const g2 = el("div", "vt-f-seg");
      [[0, "Todos"], [1, "1+"], [2, "2+"], [3, "3+"], [4, "4+"]].forEach(([v, rot]) => g2.appendChild(chipF(rot, rasc.quartos === v, () => { rasc.quartos = v; })));
      s2.appendChild(g2);
      const s3 = sec("Preço até");
      const g3 = el("div", "vt-f-chips");
      [[0, "Qualquer"], [1500, "R$ 1.500"], [2500, "R$ 2.500"], [4000, "R$ 4.000"], [500000, "R$ 500 mil"], [1000000, "R$ 1 milhão"]].forEach(([v, rot]) => g3.appendChild(chipF(rot, rasc.precoMax === v, () => { rasc.precoMax = v; })));
      s3.appendChild(g3);
    }
    const { cat, termo } = filtroAtual();
    const total = todos.filter((n) => passaCategoria(n, cat) && passaLocal(n) && (!termo || textoBusca(n).includes(termo)) && passaExtras(n, rasc)).length;
    const algum = !!(rasc.liga.length || rasc.quartos || rasc.precoMax || rasc.raio);
    aplicar.textContent = !algum ? "Mostrar todos" : total ? `Ver ${total} ${total === 1 ? "resultado" : "resultados"}` : "Nenhum resultado";
    aplicar.disabled = algum && !total;
  };
  const acoes = el("div", "vt-local-acoes");
  const limpar = el("button", "vt-local-limpar", "Limpar"); limpar.type = "button";
  acoes.append(limpar, aplicar);
  cx.append(topo, corpo, acoes); fundo.appendChild(cx); document.body.appendChild(fundo);
  const fechar = () => { fundo.remove(); document.removeEventListener("keydown", tecla); document.getElementById("vtFiltrosBtn")?.focus(); };
  const tecla = (e) => { if (e.key === "Escape") fechar(); };
  document.addEventListener("keydown", tecla);
  fundo.addEventListener("click", (e) => { if (e.target === fundo) fechar(); });
  x.addEventListener("click", fechar);
  limpar.addEventListener("click", () => { rasc.liga = []; rasc.quartos = 0; rasc.precoMax = 0; rasc.raio = 0; pintar(); });
  aplicar.addEventListener("click", () => { filtrosX = rasc; guardarFiltros(); pintarFiltrosAtivos(); fechar(); renderizar(); document.getElementById("vitrine")?.scrollIntoView({ behavior: "smooth", block: "start" }); });
  pintar();
  setTimeout(() => cx.querySelector(".vt-f-chip")?.focus({ preventScroll: true }), 50);
}

function textoBusca(n) {
  const cats = TIPO === "servicos" ? categoriasDe(n) : [n.categoria];
  return [n.nome, n.titulo, n.descricao, n.cidade, n.uf, NOME_UF[n.uf], n.bairro, n.regiao, n.categoriaPersonalizada, ...cats.map((c) => CATEGORIAS[TIPO]?.[c]), ...(TIPO === "servicos" ? cats.map((c) => PALAVRAS_SERV[c]) : []),
    ...(n.itens || []).map((i) => [i?.nome, i?.descricao, i?.secao, i?.marca].join(" ")), n.veiculo, donos.get(n.donoId)?.nome,
    ...(n.saude ? [nomeProfissao(n.saude), conselhoDe(n.saude), ...(n.saude.especialidades || []), ...(n.saude.convenios || []), n.saude.formacao] : [])].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
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

// ---------- Freelances: destaques de cada categoria + grade compacta ----------
const notaDe = (n) => notasNeg.get(TIPO === "imoveis" ? `${n.donoId}_imoveis` : idNegocio(n));
const tsMs = (t) => t?.toMillis?.() ?? 0;
// Média ajustada: com poucas notas, puxa para 3,5 (um 5,0 com 1 nota não passa quem tem 4,8 com 30).
function pontuacao(n) { const r = notaDe(n); if (!r?.total) return 0; return (media(r) * r.total + 3.5 * 2) / (r.total + 2); }
// Peso no revezamento: nota alta aparece mais; sem nota ainda entra, com peso pequeno.
function pesoServ(n) { const r = notaDe(n); if (!r?.total) return 1; const m = media(r); return 1 + (m * m * (1 + Math.log1p(r.total))) / 5; }
const ORDENS_SERV = {
  melhores: ["Melhores", proPrimeiro((a, b) => pontuacao(b) - pontuacao(a) || (notaDe(b)?.total || 0) - (notaDe(a)?.total || 0))],
  novos: ["Novos", (a, b) => tsMs(b.criadoEm || b.atualizadoEm) - tsMs(a.criadoEm || a.atualizadoEm)],
  preco: ["Menor preço", (a, b) => (Number(a.precoDesde) || Infinity) - (Number(b.precoDesde) || Infinity)],
  maior: ["Maior preço", (a, b) => (Number(b.precoDesde) || 0) - (Number(a.precoDesde) || 0)],
  perto: ["Mais perto", (a, b) => kmDe(a) - kmDe(b)]
};
let ordemServ = "melhores";
let pararGiro = null;
const SEM_MOVIMENTO = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Nome do cartão com o selo Pro ao lado (quando a conta tem o plano).
// Tempo médio de resposta do dono (perfis_publicos.atendimento.resposta, calculado no Mensagens a cada resposta, com
// pelo menos 3): selo "Responde rápido" nos cartões (até 1 h) e "Responde em ~X" no perfil do negócio.
const respostaDe = (n) => { const r = donos.get(n?.donoId)?.atendimento?.resposta; return r && r.n >= 3 && Number.isFinite(Number(r.media)) ? r : null; };
const tempoResposta = (min) => (min < 1 ? "menos de 1 min" : min < 60 ? `~${Math.round(min)} min` : min < 1440 ? `~${Math.round(min / 60)} h` : "~1 dia");
function seloRapido(n) {
  const r = respostaDe(n);
  if (!r || r.media > 60) return document.createTextNode("");
  const s = el("span", "vt-rapido"); s.title = `Costuma responder em ${tempoResposta(r.media)}`;
  s.append(icone("relogio", "vi s"), document.createTextNode("Responde rápido"));
  return s;
}
function nomeComSelo(n, padrao) {
  const s = el("strong", "nm", n.nome || padrao);
  if (nivelDe(n)) { s.classList.add("com-pro"); s.append(" ", seloPlano(planosDonos.get(n.donoId))); }
  return s;
}
// Cartão dos Freelances: o mesmo modelo das páginas irmãs (foto do trabalho em cima, avatar,
// nome, nota, categoria e preço). Nos destaques leva a etiqueta "Destaque em <categoria>".
function cartaoPro(n, destaqueEm = "") {
  const c = el("article", "vt-del vt-free");
  const f = el("div", "ft");
  f.style.backgroundImage = `url("${capaDe(n) || TEXTOS.servicos.img}")`;
  if (destaqueEm) {
    const t = el("span", "tag-dest");
    t.append(icone("selo", "vi s"), document.createTextNode(`Destaque em ${CATEGORIAS.servicos[destaqueEm] || "Freelances"}`));
    f.appendChild(t);
  }
  if ((n.diferenciais || []).includes("urgencia")) f.appendChild(el("span", "st urg", "Urgência"));
  seloPromo(f, n);
  f.appendChild(avatar(n.foto, n.nome, "vt-avatar logo"));
  const tx = el("div", "tx");
  tx.append(nomeComSelo(n, "Freelancer"), estrelasNeg(idNegocio(n), { compacto: true, nome: n.nome, donoId: n.donoId }), seloRapido(n));
  const cats = categoriasDe(n).map((k) => CATEGORIAS.servicos[k] && nomeCat(n, k)).filter(Boolean);
  const info = [cats[0] ? (cats.length > 1 ? `${cats[0]} +${cats.length - 1}` : cats[0]) : nomeCategoria(n), textoCidade(n)].filter(Boolean).join(" · ");
  if (info) tx.appendChild(el("small", null, info));
  tx.appendChild(el("span", "tx-taxa", moeda(n.precoDesde) ? `desde ${moeda(n.precoDesde)}` : "Orçamento grátis"));
  seloDist(f, n);
  c.append(f, tx);
  return tornarClicavel(c, () => abrirDetalhe(n), `Ver ${n.nome}`);
}
const cartaoTop = (n, cat) => cartaoPro(n, cat);
// Saúde: foto do local (ou a capa da classe), avatar, nome com selo, nota, profissão + registro e a consulta.
function cartaoSaude(n) {
  const sd = n.saude || {};
  const c = el("article", "vt-del vt-free vt-saude");
  const f = el("div", "ft");
  f.style.backgroundImage = `url("${capaDe(n) || TEXTOS.saude.img}")`;
  const mods = (sd.modalidades || []).filter((k) => k === "online" || k === "domicilio");
  if (mods.length) f.appendChild(el("span", "st saude-mod", mods.map((k) => (k === "online" ? "Online" : "Em casa")).join(" · ")));
  seloPromo(f, n);
  f.appendChild(avatar(n.foto, n.nome, "vt-avatar logo"));
  const tx = el("div", "tx");
  tx.append(nomeComSelo(n, "Profissional de saúde"), estrelasNeg(idNegocio(n), { compacto: true, nome: n.nome, donoId: n.donoId }), seloRapido(n));
  const esp = (sd.especialidades || [])[0];
  tx.appendChild(el("small", null, [nomeProfissao(sd), esp].filter(Boolean).join(" · ")));
  const reg = textoRegistro(sd);
  if (reg) { const r = el("small", "reg"); r.append(icone("escudo"), document.createTextNode(reg.split(" · ")[0])); tx.appendChild(r); }
  tx.appendChild(el("span", "tx-taxa", textoValor(sd, moeda) || textoCidade(n) || "Agende pelo chat"));
  seloDist(f, n);
  c.append(f, tx);
  return tornarClicavel(c, () => abrirDetalhe(n), `Ver ${n.nome}`);
}
function linhaSaude(n) {
  const sd = n.saude || {};
  return linhaCompacta({
    classe: "pro", midia: avatar(n.foto, n.nome), titulo: n.nome || "Profissional de saúde",
    sub: [estrelasNeg(idNegocio(n), { compacto: true, nome: n.nome, donoId: n.donoId }), [distDe(n), nomeProfissao(sd), (sd.especialidades || [])[0], textoCidade(n)].filter(Boolean).join(" · ")],
    direita: el("span", "pr", Number(sd.valorConsulta) > 0 ? moeda(sd.valorConsulta) : (sd.convenios || []).length ? "Convênios" : "Agendar"),
    abrir: () => abrirDetalhe(n), rotulo: `Ver ${n.nome}`
  });
}
const ORDENS_SAUDE = {
  melhores: ["Melhores", proPrimeiro((a, b) => pontuacao(b) - pontuacao(a) || (notaDe(b)?.total || 0) - (notaDe(a)?.total || 0))],
  perto: ["Mais perto", (a, b) => kmDe(a) - kmDe(b)],
  preco: ["Menor valor", (a, b) => (Number(a.saude?.valorConsulta) || Infinity) - (Number(b.saude?.valorConsulta) || Infinity)],
  novos: ["Novos", (a, b) => tsMs(b.criadoEm || b.atualizadoEm) - tsMs(a.criadoEm || a.atualizadoEm)]
};
let ordemSaude = "melhores";

// Destaques: um lugar por categoria. Começa pelo melhor de cada uma e, de tempos em tempos,
// revezam os mais bem avaliados daquela categoria (peso pela nota; quem ainda não apareceu
// ganha prioridade). Pausa quando a pessoa mexe no trilho ou ele sai da tela.
function secaoDestaquesServ(lista) {
  const porCat = Object.keys(CATEGORIAS.servicos).map((cat) => ({
    cat, cands: lista.filter((n) => categoriasDe(n).includes(cat)).sort(ORDENS_SERV.melhores[1]).slice(0, 6)
  })).filter((x) => x.cands.length);
  if (!porCat.length) return null;
  porCat.sort((a, b) => pontuacao(b.cands[0]) - pontuacao(a.cands[0]));
  const slots = porCat.map(({ cat, cands }) => {
    const s = el("div", "vt-slot");
    s.appendChild(cartaoTop(cands[0], cat));
    return { el: s, cands, item: cands[0], criar: (n) => cartaoTop(n, cat), desde: Date.now(), vezes: new Map([[cands[0].id, 1]]) };
  });
  const sec = carrossel("Destaques de cada categoria", slots.map((s) => s.el), "top-cat");
  sec.querySelector(".vt-car-topo").insertAdjacentElement("afterend", el("p", "vt-car-sub", "Os mais bem avaliados de cada área, revezando o tempo todo."));
  girar(sec.querySelector(".vt-trilho"), slots);
  return sec;
}
function girar(trilho, slots, peso = pesoServ) {
  pararGiro?.();
  if (SEM_MOVIMENTO || !slots.some((s) => s.cands.length > 1)) return;
  let pausaAte = 0, naTela = false;
  const pausar = () => { pausaAte = Date.now() + 6000; };
  ["pointerdown", "touchstart", "wheel", "focusin", "scroll"].forEach((ev) => trilho.addEventListener(ev, pausar, { passive: true }));
  const io = new IntersectionObserver(([e]) => { naTela = e.isIntersecting; }, { threshold: 0.3 });
  // Só observa depois que o trilho entrou na página (observar antes deixa "fora da tela" para sempre).
  requestAnimationFrame(() => io.observe(trilho));
  const tempo = (n) => 5000 + 900 * (notaDe(n)?.total ? media(notaDe(n)) : 0); // 5 s a ~9,5 s na tela
  const relogio = setInterval(() => {
    if (!naTela || document.hidden || Date.now() < pausaAte) return;
    const r = trilho.getBoundingClientRect();
    const visiveis = slots.filter((s) => { const b = s.el.getBoundingClientRect(); return b.right > r.left + 24 && b.left < r.right - 24; });
    const s = visiveis.filter((x) => x.cands.length > 1 && Date.now() - x.desde >= tempo(x.item)).sort((a, b) => a.desde - b.desde)[0];
    if (!s) return;
    const naTelaIds = new Set(visiveis.map((x) => x.item.id));
    const opcoes = s.cands.filter((n) => n !== s.item && !naTelaIds.has(n.id));
    if (!opcoes.length) { s.desde = Date.now(); return; }
    const p = opcoes.map((n) => peso(n) / (1 + (s.vezes.get(n.id) || 0)));
    let sorteio = Math.random() * p.reduce((a, b) => a + b, 0), novo = opcoes[opcoes.length - 1];
    for (let k = 0; k < opcoes.length; k++) { sorteio -= p[k]; if (sorteio <= 0) { novo = opcoes[k]; break; } }
    s.el.classList.add("sai");
    setTimeout(() => {
      s.item = novo; s.desde = Date.now();
      s.vezes.set(novo.id, (s.vezes.get(novo.id) || 0) + 1);
      s.el.replaceChildren(s.criar(novo));
      s.el.classList.remove("sai"); s.el.classList.add("entra");
      setTimeout(() => s.el.classList.remove("entra"), 650);
    }, 420);
  }, 1600);
  pararGiro = () => { clearInterval(relogio); io.disconnect(); pararGiro = null; };
}

// ---------- Imóveis: grade compacta (3 por fileira no celular) ----------
const ORDENS_IMOVEL = {
  recentes: ["Recentes", proPrimeiro((a, b) => tsMs(b.atualizadoEm || b.criadoEm) - tsMs(a.atualizadoEm || a.criadoEm))],
  melhores: ["Melhores", (a, b) => pontuacao(b) - pontuacao(a)],
  menor: ["Menor preço", (a, b) => (Number(a.preco) || Infinity) - (Number(b.preco) || Infinity)],
  maior: ["Maior preço", (a, b) => (Number(b.preco) || 0) - (Number(a.preco) || 0)],
  perto: ["Mais perto", (a, b) => kmDe(a) - kmDe(b)]
};
let ordemImovel = "recentes";
function cartaoImovelMini(a) {
  const c = el("article", "vt-imo");
  const f = el("div", "ft");
  f.style.backgroundImage = `url("${urlSegura((a.fotos || []).find(urlSegura)) || TEXTOS.imoveis.img}")`;
  f.appendChild(el("span", "tag", FINALIDADE[a.finalidade] || "Imóvel"));
  const nFotos = (a.fotos || []).filter(urlSegura).length;
  if (nFotos > 1) { const s = el("span", "nf"); s.append(icone("foto", "vi s"), document.createTextNode(String(nFotos))); f.appendChild(s); }
  const p = el("span", "pr", moeda(a.preco) || "Consultar");
  if (moeda(a.preco) && a.finalidade === "aluguel") p.appendChild(el("small", null, "/mês"));
  if (moeda(a.preco) && a.finalidade === "temporada") p.appendChild(el("small", null, "/dia"));
  f.appendChild(p);
  const tx = el("div", "tx");
  tx.appendChild(el("strong", "nm", tituloImovel(a)));
  const local = a.bairro || a.cidade;
  if (local) { const s = el("span", "loc"); s.append(icone("pin", "vi s"), document.createTextNode(local)); tx.appendChild(s); }
  const sp = el("div", "sp");
  [["cama", a.quartos], ["carro", a.vagas], ["area", a.area ? `${a.area}m²` : ""]].forEach(([ic, v]) => {
    if (!v) return;
    const s = el("span"); s.append(icone(ic, "vi s"), document.createTextNode(String(v))); sp.appendChild(s);
  });
  if (sp.children.length) tx.appendChild(sp);
  seloDist(f, a);
  c.append(f, tx);
  return tornarClicavel(c, () => abrirAnuncio(a), `Ver ${tituloImovel(a)}`);
}
// Título e ordenação da lista (Freelances e Imóveis usam o mesmo modelo).
function topoLista(titulo, total, ordens, atual, aoMudar) {
  const cab = el("div", "vt-lista-topo");
  const tit = el("h3", "vt-titulo-lista", titulo);
  tit.appendChild(el("span", "vt-conta", String(total)));
  const ord = el("div", "vt-ordem");
  ord.setAttribute("role", "group"); ord.setAttribute("aria-label", "Ordenar");
  Object.entries(ordens).forEach(([k, [rot]]) => {
    const b = el("button", null, rot); b.type = "button";
    b.setAttribute("aria-pressed", k === atual ? "true" : "false");
    b.addEventListener("click", () => aoMudar(k));
    ord.appendChild(b);
  });
  cab.append(tit, ord);
  return cab;
}

// ---------- modos de exibição (a pessoa escolhe; fica salvo neste aparelho, por página) ----------
const MODOS_VER = [["linhas", "Por categoria"], ["1", "1 por linha"], ["2", "2 por linha"], ["3", "3 por linha"]];
const chaveModo = "hf-vt-modo-" + TIPO;
let modoVer = (() => { try { const m = localStorage.getItem(chaveModo); return MODOS_VER.some(([k]) => k === m) ? m : "linhas"; } catch { return "linhas"; } })();
function botoesModo() {
  const g = el("div", "vt-modos-ver");
  g.setAttribute("role", "group"); g.setAttribute("aria-label", "Como mostrar");
  MODOS_VER.forEach(([k, rot]) => {
    const b = el("button"); b.type = "button";
    b.title = rot; b.setAttribute("aria-label", rot);
    b.setAttribute("aria-pressed", k === modoVer ? "true" : "false");
    b.appendChild(icone("m-" + k, "vi"));
    b.addEventListener("click", () => {
      modoVer = k;
      try { localStorage.setItem(chaveModo, k); } catch {}
      renderizar();
    });
    g.appendChild(b);
  });
  return g;
}
// Monta os itens no modo escolhido. "Por categoria": uma fileira por categoria, rolando para o lado.
// Filtrando por uma categoria ou buscando, "por categoria" vira grade de 3.
function mostrarItens(grade, itens, { tile, linha, grupos, nomeGrupo, filtrando }) {
  const modo = modoVer === "linhas" && filtrando ? "3" : modoVer;
  if (modo === "linhas") {
    grade.classList.add("vt-linhas");
    const mapa = new Map();
    itens.forEach((x) => [].concat(grupos(x)).filter(Boolean).forEach((g) => { if (!mapa.has(g)) mapa.set(g, []); mapa.get(g).push(x); }));
    [...mapa].sort((a, b) => b[1].length - a[1].length).forEach(([g, lista]) => {
      const fila = carrossel(nomeGrupo(g), lista.slice(0, 30).map(tile), "linha-cat");
      const topo = fila.querySelector(".vt-car-topo h3");
      topo.appendChild(el("span", "vt-conta", String(lista.length)));
      const chip = document.querySelector(`#filterChips [data-filter="${CSS.escape(g)}"]`);
      if (chip && lista.length > 2) {
        const ver = el("button", "vt-ver-todos", "Ver todos"); ver.type = "button";
        ver.addEventListener("click", () => { chip.click(); document.getElementById("vitrine")?.scrollIntoView({ behavior: "smooth", block: "start" }); });
        fila.querySelector(".vt-car-topo").insertBefore(ver, fila.querySelector(".vt-setas"));
      }
      grade.appendChild(fila);
    });
    return;
  }
  grade.classList.add("vt-cols", "c" + modo);
  itens.forEach((x) => grade.appendChild(modo === "1" ? linha(x) : tile(x)));
}
// Título com contagem + ordenação + modos de exibição.
function barraLista(titulo, total, ordens, atual, aoMudar) {
  const cab = topoLista(titulo, total, ordens, atual, aoMudar);
  const linhaBotoes = el("div", "vt-ferramentas");
  linhaBotoes.append(cab.querySelector(".vt-ordem"), botoesModo());
  cab.appendChild(linhaBotoes);
  return cab;
}

// ---------- cartões que faltavam: versões em linha e delivery compacto ----------
const precoMin = (n) => { const v = (n.itens || []).map((i) => Number(i?.preco)).filter((x) => x > 0); return v.length ? Math.min(...v) : NaN; };
function linhaCompacta({ classe = "", midia, titulo, sub = [], direita, abrir, rotulo }) {
  const c = el("article", "vt-row " + classe);
  c.appendChild(midia);
  const tx = el("div", "tx");
  tx.appendChild(el("strong", "nm", titulo));
  sub.filter(Boolean).forEach((x) => tx.appendChild(typeof x === "string" ? el("small", null, x) : x));
  c.appendChild(tx);
  if (direita) c.appendChild(direita);
  return tornarClicavel(c, abrir, rotulo);
}
function linhaPro(n) {
  const cats = categoriasDe(n).map((k) => CATEGORIAS.servicos[k] && nomeCat(n, k)).filter(Boolean);
  return linhaCompacta({
    classe: "pro", midia: avatar(n.foto, n.nome), titulo: n.nome || "Freelancer",
    sub: [estrelasNeg(idNegocio(n), { compacto: true, nome: n.nome, donoId: n.donoId }), [distDe(n), cats.slice(0, 2).join(" · "), textoCidade(n)].filter(Boolean).join(" · ")],
    direita: el("span", "pr", moeda(n.precoDesde) ? `desde ${moeda(n.precoDesde)}` : "a combinar"),
    abrir: () => abrirDetalhe(n), rotulo: `Ver ${n.nome}`
  });
}
function linhaImovel(a) {
  const f = el("div", "th");
  f.style.backgroundImage = `url("${urlSegura((a.fotos || []).find(urlSegura)) || TEXTOS.imoveis.img}")`;
  f.appendChild(el("span", "tag", FINALIDADE[a.finalidade] || "Imóvel"));
  const specs = [a.quartos ? `${a.quartos} ${Number(a.quartos) === 1 ? "quarto" : "quartos"}` : "", a.vagas ? `${a.vagas} ${Number(a.vagas) === 1 ? "vaga" : "vagas"}` : "", a.area ? `${a.area} m²` : ""].filter(Boolean).join(" · ");
  const pr = el("span", "pr", moeda(a.preco) || "Consultar");
  if (moeda(a.preco) && a.finalidade === "aluguel") pr.appendChild(el("small", null, "/mês"));
  return linhaCompacta({
    classe: "imo", midia: f, titulo: tituloImovel(a), sub: [[distDe(a), [a.bairro, textoCidade(a)].filter(Boolean).join(", ")].filter(Boolean).join(" · "), specs], direita: pr,
    abrir: () => abrirAnuncio(a), rotulo: `Ver ${tituloImovel(a)}`
  });
}
function linhaProduto({ n, i, idx }) {
  const f = el("div", "th");
  if (urlSegura(i.foto)) f.style.backgroundImage = `url("${i.foto}")`; else f.appendChild(icone("foto", "vi"));
  return linhaCompacta({
    classe: "prod" + (estoqueDe(i) === 0 ? " esgotado" : ""), midia: f, titulo: i.nome,
    sub: [estrelasNeg(idNegocio(n), { compacto: true, nome: n.nome, donoId: n.donoId }), n.nome || "Loja"],
    direita: precoComDesconto(i), abrir: () => abrirProduto(n, idx), rotulo: `Ver ${i.nome}`
  });
}
function tileDelivery(n) {
  const c = el("article", "vt-del");
  const ab = abertoAgora(n);
  if (ab === false) c.classList.add("fechado");
  const f = el("div", "ft");
  const prato = (n.itens || []).find((i) => urlSegura(i?.foto));
  f.style.backgroundImage = `url("${urlSegura(prato?.foto) || TEXTOS.delivery.img}")`;
  if (ab !== null) f.appendChild(el("span", "st " + (ab ? "on" : "off"), ab ? "Aberto" : "Fechado"));
  seloPromo(f, n);
  f.appendChild(avatar(n.foto, n.nome, "vt-avatar logo"));
  const tx = el("div", "tx");
  tx.append(nomeComSelo(n, "Delivery"), estrelasNeg(idNegocio(n), { compacto: true, nome: n.nome, donoId: n.donoId }), seloRapido(n));
  const info = [nomeCategoria(n), n.tempoMin || n.tempoMax ? `${n.tempoMin || "?"}–${n.tempoMax || "?"} min` : ""].filter(Boolean).join(" · ");
  if (info) tx.appendChild(el("small", null, info));
  tx.appendChild(el("span", "tx-taxa" + (Number(n.taxaEntrega) > 0 ? "" : " gratis"), Number(n.taxaEntrega) > 0 ? `Entrega ${moeda(n.taxaEntrega)}` : "Entrega grátis"));
  seloDist(f, n);
  c.append(f, tx);
  return tornarClicavel(c, () => abrirDetalhe(n), `Ver ${n.nome}`);
}
const ORDENS_PRECO = (preco, nota, km = kmDe) => ({
  melhores: ["Melhores", proPrimeiro((a, b) => nota(b) - nota(a))],
  menor: ["Menor preço", (a, b) => (preco(a) || Infinity) - (preco(b) || Infinity)],
  maior: ["Maior preço", (a, b) => (preco(b) || 0) - (preco(a) || 0)],
  perto: ["Mais perto", (a, b) => km(a) - km(b)]
});
const ORDENS_DELIVERY = ORDENS_PRECO(precoMin, (n) => pontuacao(n));
const ORDENS_PRODUTO = ORDENS_PRECO((x) => Number(x.i.preco) || NaN, (x) => pontuacao(x.n), (x) => kmDe(x.n));
let ordemDelivery = "melhores", ordemProduto = "melhores";

// Imóveis em destaque: imóveis de quem tem as melhores notas como anunciante (e os mais novos),
// revezando nos lugares do trilho, como os destaques dos Freelances.
function secaoDestaquesImoveis(lista) {
  if (lista.length < 2) return null;
  const agora = Date.now();
  const peso = (a) => pesoServ(a) * ((agora - tsMs(a.atualizadoEm || a.criadoEm)) / 864e5 < 7 ? 1.5 : 1) * ((a.fotos || []).some(urlSegura) ? 1.3 : 1);
  const pool = [...lista].sort((a, b) => peso(b) - peso(a)).slice(0, 24);
  const vezes = new Map();
  const slots = pool.slice(0, Math.min(6, pool.length)).map((a) => {
    const s = el("div", "vt-slot");
    s.appendChild(cartaoImovelMini(a));
    vezes.set(a.id, 1);
    return { el: s, cands: pool, item: a, criar: cartaoImovelMini, desde: Date.now(), vezes };
  });
  const sec = carrossel("Imóveis em destaque", slots.map((s) => s.el), "top-imo");
  sec.querySelector(".vt-car-topo").insertAdjacentElement("afterend", el("p", "vt-car-sub", "Anunciantes mais bem avaliados e imóveis novos, revezando o tempo todo."));
  girar(sec.querySelector(".vt-trilho"), slots, peso);
  return sec;
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
  linhaSub.append(estrelasNeg(idNegocio(n), { compacto: true, nome: n.nome, donoId: n.donoId }), el("small", null, [nomeCategoria(n), textoCidade(n)].filter(Boolean).join(" · ")));
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
// Selo no canto da foto do cartão quando o negócio tem promoção no ar.
function seloPromo(f, n) {
  const p = promoAtiva(n);
  if (!p) return;
  const s = el("span", "vt-promo-tag");
  s.append(icone("cupom", "vi s"), document.createTextNode(p.codigo ? "Cupom" : "Promoção"));
  f.appendChild(s);
}
function bolhaLoja(n) {
  const c = el("button", "vt-bolha-loja");
  c.type = "button";
  c.append(avatar(n.foto, n.nome), el("span", null, n.nome || "Loja"), estrelasNeg(idNegocio(n), { compacto: true, nome: n.nome, donoId: n.donoId }));
  if (promoAtiva(n)) { c.classList.add("com-promo"); c.appendChild(el("em", "vt-bolha-promo", promoAtiva(n).codigo ? "Cupom" : "Promoção")); }
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
  const filtrando = cat !== "todos" || !!termo || !!filtroLocal.uf || filtrosLigados() > 0;
  pararGiro?.();
  grade.replaceChildren();
  dest.replaceChildren();
  grade.className = "vt-grade tipo-" + TIPO;
  cont.textContent = ""; // a contagem vai junto do título da lista
  const lista = todos.filter((n) => passaCategoria(n, cat) && passaLocal(n) && (!termo || textoBusca(n).includes(termo)) && passaExtras(n));
  pintarVerMais(filtrando);
  const vazio = () => {
    const v = el("div", "vt-vazio");
    v.append(el("strong", null, todos.length ? "Nada encontrado com esse filtro" : TEXTOS[TIPO].vazio), todos.length ? (filtrosLigados() ? "Tire algum filtro ou tente outra categoria." : "Tente outra categoria ou palavra.") : "Seja o primeiro: crie seu perfil de negócio pelo seu perfil.");
    if (todos.length && filtrosLigados()) { const l = el("button", "vt-criar"); l.type = "button"; l.textContent = "Limpar filtros"; l.addEventListener("click", () => { filtrosX = { liga: [], quartos: 0, precoMax: 0, raio: 0 }; guardarFiltros(); pintarFiltrosAtivos(); renderizar(); }); v.append(document.createElement("br"), l); }
    if (!todos.length) { const a = el("a", "vt-criar"); a.href = `negocios.html?tipo=${TIPO}`; a.append(icone("mais"), document.createTextNode(TEXTOS[TIPO].criar)); v.append(document.createElement("br"), a); }
    grade.appendChild(v);
  };
  const titulo = (t) => (filtrando ? "Resultados" : t);

  if (TIPO === "lojinha") {
    // Lojas no topo (bolinhas) e os produtos de todas as lojas.
    if (lista.length) dest.appendChild(carrossel("Lojas", lista.map(bolhaLoja), "lojas"));
    const produtos = [];
    lista.forEach((n) => (n.itens || []).forEach((i, idx) => {
      if (!i?.nome) return;
      const alvo = [i.nome, i.descricao, i.marca, n.nome, ...(i.cores || []), ...(i.tamanhos || [])].join(" ");
      if (termo && !semAcento(alvo).includes(termo) && !semAcento(n.nome).includes(termo)) return;
      produtos.push({ n, i, idx });
    }));
    if (!produtos.length) return vazio();
    produtos.sort((a, b) => ORDENS_PRODUTO[ordemProduto][1](a, b) || (estoqueDe(a.i) === 0) - (estoqueDe(b.i) === 0));
    grade.appendChild(barraLista(titulo("Todos os produtos"), produtos.length, ORDENS_PRODUTO, ordemProduto, (k) => { ordemProduto = k; garantirPosicao(k).then(renderizar); }));
    mostrarItens(grade, produtos, {
      filtrando, linha: linhaProduto,
      tile: ({ n, i, idx }) => tornarClicavel(cartaoProduto(n, i, idx), () => abrirProduto(n, idx), `Ver ${i.nome}`),
      grupos: ({ n }) => (n.categoria === "outros" && n.categoriaPersonalizada ? "c:" + n.categoriaPersonalizada : n.categoria || "outros"),
      nomeGrupo: (g) => (g.startsWith("c:") ? g.slice(2) : CATEGORIAS.lojinha[g] || "Outros")
    });
    return;
  }

  if (!lista.length) return vazio();

  if (TIPO === "servicos") {
    // 1) Destaques de cada categoria (revezando)  2) Todos, no modo escolhido
    const top = !filtrando && secaoDestaquesServ(lista);
    if (top) dest.appendChild(top);
    grade.appendChild(barraLista(titulo("Todos os profissionais"), lista.length, ORDENS_SERV, ordemServ, (k) => { ordemServ = k; garantirPosicao(k).then(renderizar); }));
    mostrarItens(grade, [...lista].sort(ORDENS_SERV[ordemServ][1]), {
      filtrando, tile: (n) => cartaoPro(n), linha: linhaPro, grupos: (n) => categoriasDe(n).map((k) => chaveCat(n, k)), nomeGrupo: (g) => (g.startsWith("c:") ? g.slice(2) : CATEGORIAS.servicos[g] || "Outros")
    });
  } else if (TIPO === "saude") {
    // Online agora / atendendo agora em cima; depois todos, agrupados pela profissão.
    const online = lista.filter((n) => (n.saude?.modalidades || []).includes("online"));
    if (!filtrando && online.length >= 2) dest.appendChild(carrossel("Atendem online", online.sort(ORDENS_SAUDE.melhores[1]).slice(0, 10).map(cartaoSaude), "online"));
    grade.appendChild(barraLista(titulo("Todos os profissionais de saúde"), lista.length, ORDENS_SAUDE, ordemSaude, (k) => { ordemSaude = k; garantirPosicao(k).then(renderizar); }));
    mostrarItens(grade, [...lista].sort(ORDENS_SAUDE[ordemSaude][1]), {
      filtrando, tile: cartaoSaude, linha: linhaSaude,
      grupos: (n) => chaveCat(n, n.categoria || n.saude?.profissao || "outros"), nomeGrupo: (g) => (g.startsWith("c:") ? g.slice(2) : CATEGORIAS.saude[g] || "Outros")
    });
  } else if (TIPO === "delivery") {
    const abertos = lista.filter((n) => abertoAgora(n) === true);
    if (!filtrando && abertos.length) dest.appendChild(carrossel("Abertos agora", abertos.slice(0, 10).map((n) => tornarClicavel(cartaoDelivery(n), () => abrirDetalhe(n), `Ver ${n.nome}`)), "abertos"));
    const ordem = [...lista].sort((a, b) => ORDENS_DELIVERY[ordemDelivery][1](a, b) || (abertoAgora(b) === true) - (abertoAgora(a) === true));
    grade.appendChild(barraLista(titulo("Todos os restaurantes"), lista.length, ORDENS_DELIVERY, ordemDelivery, (k) => { ordemDelivery = k; garantirPosicao(k).then(renderizar); }));
    mostrarItens(grade, ordem, {
      filtrando, tile: tileDelivery, linha: (n) => tornarClicavel(linhaDelivery(n), () => abrirDetalhe(n), `Ver ${n.nome}`),
      grupos: (n) => chaveCat(n, n.categoria || "outros"), nomeGrupo: (g) => (g.startsWith("c:") ? g.slice(2) : CATEGORIAS.delivery[g] || "Outros")
    });
  } else {
    const top = !filtrando && secaoDestaquesImoveis(lista);
    if (top) dest.appendChild(top);
    grade.appendChild(barraLista(titulo("Todos os imóveis"), lista.length, ORDENS_IMOVEL, ordemImovel, (k) => { ordemImovel = k; garantirPosicao(k).then(renderizar); }));
    mostrarItens(grade, [...lista].sort(ORDENS_IMOVEL[ordemImovel][1]), {
      filtrando, tile: cartaoImovelMini, linha: linhaImovel, grupos: (a) => chaveCat(a, a.categoria || "outros"), nomeGrupo: (g) => (g.startsWith("c:") ? g.slice(2) : CATEGORIAS.imoveis[g] || "Outros")
    });
  }
}

function ligarFiltros() {
  montarFiltroLocal();
  montarBotaoFiltros();
  const chips = document.getElementById("filterChips");
  if (chips) {
    if (!chips.querySelector('[data-filter="outros"]')) {
      const b = el("button", "chip", "Outros"); b.type = "button"; b.dataset.filter = "outros"; chips.appendChild(b);
      b.addEventListener("click", () => { chips.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === b)); });
    }
    chips.addEventListener("click", (e) => { if (e.target.closest(".chip")) setTimeout(renderizar, 0); });
  }
  let esperaBusca = null;
  document.getElementById("searchInput")?.addEventListener("input", () => { renderizar(); clearTimeout(esperaBusca); esperaBusca = setTimeout(buscarNaVitrine, 400); });
  document.getElementById("searchForm")?.addEventListener("submit", () => setTimeout(() => { renderizar(); buscarNaVitrine(); document.getElementById("vitrine")?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 0));
}

// Cria filtros para as categorias personalizadas que existem ("Outro" escrito pela pessoa: Pianista, Chácara...).
// No Shopping e nos Freelances também para as categorias fixas que têm alguém (as áreas sem filtro na página).
function chipsDinamicos() {
  const chips = document.getElementById("filterChips");
  if (!chips) return;
  const existentes = new Set([...chips.querySelectorAll("[data-filter]")].map((c) => c.dataset.filter));
  const novos = [];
  todos.forEach((n) => {
    const cats = TIPO === "servicos" ? categoriasDe(n) : [n.categoria];
    if (cats.includes("outros") && n.categoriaPersonalizada) novos.push(["c:" + n.categoriaPersonalizada, n.categoriaPersonalizada]);
    if ((TIPO === "lojinha" || TIPO === "saude") && n.categoria !== "outros" && CATEGORIAS[TIPO][n.categoria] && !(TIPO === "saude" && /^(enfermeiro|tecEnfermagem)$/.test(n.categoria))) novos.push([n.categoria, CATEGORIAS[TIPO][n.categoria]]);
    if (TIPO === "servicos") cats.forEach((k) => { if (k !== "outros" && CATEGORIAS.servicos[k]) novos.push([k, CATEGORIAS.servicos[k]]); });
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

// Vitrine em lotes: carrega 48 por vez (os atualizados mais recentemente primeiro) e busca
// mais quando a pessoa pede. Antes eram 300 perfis inteiros, com fotos, a cada visita.
const LOTE = 48;
let cursorNeg = null, cursorAn = null, maisNeg = false, maisAn = false, carregandoMais = false;
// Site nacional: com Estado/Cidade escolhidos, a busca já vem filtrada do servidor (os 48 mais recentes DAQUELA cidade,
// não os 48 do Brasil inteiro filtrados no aparelho). Precisa dos índices tipo+uf+atualizadoEm e tipo+cidadeIbge+atualizadoEm
// (firestore.indexes.json); enquanto o índice não existe, cai na busca geral, como antes.
let localNoServidor = true;
const filtroServidor = () => (!localNoServidor ? [] : filtroLocal.cidadeIbge ? [fb.where("cidadeIbge", "==", filtroLocal.cidadeIbge)] : filtroLocal.uf ? [fb.where("uf", "==", filtroLocal.uf)] : []);
const chaveLocal = () => filtroLocal.cidadeIbge || filtroLocal.uf || "";
async function lote(col, tipo, cursor, { geral = false } = {}) {
  const c = fb.collection(fb.db, col);
  const consulta = (onde) => fb.query(c, fb.where("tipo", "==", tipo), ...onde, fb.orderBy("atualizadoEm", "desc"), ...(cursor ? [fb.startAfter(cursor)] : []), fb.limit(LOTE));
  // A primeira página vale por 10 min no aparelho; as seguintes ("Ver mais") vêm do servidor.
  const buscar = (q, chave) => (cursor ? fb.getDocs(q) : docsComValidade(fb, chave, q, 10 * 60000));
  try {
    const onde = geral ? [] : filtroServidor();
    let snap;
    try { snap = await buscar(consulta(onde), `vitrine-${col}-${tipo}${onde.length ? "-" + chaveLocal() : ""}`); }
    catch (e) {
      if (!onde.length || e?.code !== "failed-precondition") throw e;
      console.warn("Índice por local ainda não criado; filtrando no aparelho:", e.message);
      localNoServidor = false;
      snap = await buscar(consulta([]), `vitrine-${col}-${tipo}`);
    }
    return { docs: snap.docs, mais: snap.size === LOTE, cursor: snap.docs.at(-1) || cursor };
  } catch (e) {
    // Sem o índice (tipo + atualizadoEm) ainda criado: busca simples, sem lotes.
    if (e?.code !== "failed-precondition") throw e;
    console.warn("Índice do Firebase ainda não criado:", e.message);
    const snap = await fb.getDocs(fb.query(c, fb.where("tipo", "==", tipo), fb.limit(300)));
    return { docs: snap.docs, mais: false, cursor: null };
  }
}
async function carregarLote(primeira = false) {
  const novos = [];
  if (primeira || maisNeg) {
    const r = await lote("negocios", TIPO, cursorNeg);
    cursorNeg = r.cursor; maisNeg = r.mais;
    // Com o local filtrado no servidor, a 1ª página também traz os mais recentes gerais (perfis antigos sem Estado
    // gravado continuam aparecendo; o filtro do aparelho decide o que mostra).
    if (primeira && filtroServidor().length) r.docs = [...r.docs, ...(await lote("negocios", TIPO, null, { geral: true }).catch(() => ({ docs: [] }))).docs];
    const negocios = r.docs.map((d) => ({ id: d.id, ...d.data() })).filter((n) => n.nome && n.oculto !== true && !oculto(n));
    if (TIPO === "imoveis") {
      negocios.forEach((n) => negociosImoveis.set(n.donoId, n));
      negocios.filter((n) => n.preco || n.quartos).forEach((n) => novos.push(negocioComoAnuncio(n)));
    } else novos.push(...negocios);
  }
  if (TIPO === "imoveis" && (primeira || maisAn)) {
    const r = await lote("anuncios", "imovel", cursorAn);
    cursorAn = r.cursor; maisAn = r.mais;
    if (primeira && filtroServidor().length) r.docs = [...r.docs, ...(await lote("anuncios", "imovel", null, { geral: true }).catch(() => ({ docs: [] }))).docs];
    novos.push(...r.docs.map((d) => ({ id: d.id, ...d.data() })).filter((a) => a.ativo !== false && !oculto(a)));
  }
  return incorporar(novos);
}
// Junta perfis/anúncios novos à lista (sem repetidos), com donos, notas e distância. Devolve quantos entraram.
async function incorporar(novos) {
  // Sem repetidos (a busca por local e a geral podem trazer o mesmo perfil).
  const ja = new Set(todos.map((x) => x.id));
  const add = novos.filter((x) => !ja.has(x.id) && (ja.add(x.id), true));
  todos.push(...add);
  todos.sort((a, b) => (b.atualizadoEm?.toMillis?.() ?? 0) - (a.atualizadoEm?.toMillis?.() ?? 0));
  const idsNotas = [...new Set(add.map((n) => (TIPO === "imoveis" ? `${n.donoId}_imoveis` : idNegocio(n))))].filter((i) => !notasNeg.has(i));
  const [r] = await Promise.all([lerResumos(fb, idsNotas.map((i) => "neg_" + i)), carregarDonos(add.map((n) => n.donoId))]);
  idsNotas.forEach((i) => notasNeg.set(i, r["neg_" + i]));
  // Anúncios de quem está sem plano: lê o perfil Imóveis do dono para saber se ele é o principal.
  const semPerfil = [...new Set(add.filter((x) => x.tipo === "imovel" && !negociosImoveis.has(x.donoId) && !principalImoveis.has(x.donoId) && !nivelPlano(planosDonos.get(x.donoId))).map((x) => x.donoId))];
  await Promise.all(semPerfil.map(async (id) => {
    const s = await docComValidade(fb, ["negocios", `${id}_imoveis`], DONOS_VALIDADE).catch(() => null);
    principalImoveis.set(id, s?.exists() ? s.data().principal || null : null);
  }));
  if (posEu) await comDistancia(add, posEu);
  if (add.some(pausadoNaVitrine)) todos = todos.filter((x) => !pausadoNaVitrine(x));
  todos = todos.map(comLimites); // depois da distância: a versão grátis é uma cópia e leva o _km junto
  // Imóveis de quem está sem plano: só o anúncio mais antigo aparece.
  if (TIPO === "imoveis") {
    const livres = new Set(umAnuncioGratisPorDono(todos.filter((x) => x.tipo === "imovel" && !nivelPlano(planosDonos.get(x.donoId)))).map((x) => x.id));
    todos = todos.filter((x) => x.tipo !== "imovel" || nivelPlano(planosDonos.get(x.donoId)) || livres.has(x.id));
  }
  return add.length;
}
// Busca nacional (busca.js): o que foi digitado também é perguntado ao Firebase, além dos perfis já carregados.
async function buscarNaVitrine() {
  const termo = (document.getElementById("searchInput")?.value || "").trim();
  if (termo.length < 3 || !fb) return;
  const [negs, ans] = await Promise.all([
    buscarNoServidor(fb, "negocios", termo, [fb.where("tipo", "==", TIPO)]),
    TIPO === "imoveis" ? buscarNoServidor(fb, "anuncios", termo, [fb.where("tipo", "==", "imovel")]) : []
  ]);
  const novos = [], ok = negs.filter((n) => n.nome && n.oculto !== true && !oculto(n));
  if (TIPO === "imoveis") {
    ok.forEach((n) => negociosImoveis.set(n.donoId, n));
    ok.filter((n) => n.preco || n.quartos).forEach((n) => novos.push(negocioComoAnuncio(n)));
    novos.push(...ans.filter((a) => a.ativo !== false && !oculto(a)));
  } else novos.push(...ok);
  if (await incorporar(novos).catch(() => 0)) { chipsDinamicos(); renderizar(); }
}
const temMais = () => maisNeg || (TIPO === "imoveis" && maisAn);
// Botão no fim da lista: "Ver mais" (sem filtro) ou "Procurar em mais perfis" (com filtro/busca).
function pintarVerMais(filtrando) {
  const grade = document.getElementById("vtGrade");
  if (!grade) return;
  let w = document.getElementById("vtMais");
  if (!w) {
    w = el("div", "vt-mais"); w.id = "vtMais";
    const b = el("button", "vt-mais-bt"); b.type = "button"; b.id = "vtMaisBt";
    b.addEventListener("click", async () => {
      if (carregandoMais) return;
      carregandoMais = true; b.disabled = true; b.textContent = "Carregando...";
      try { await carregarLote(false); chipsDinamicos(); renderizar(); }
      catch (e) { console.warn(e); toast("Não foi possível carregar mais. Tente de novo."); }
      finally { carregandoMais = false; b.disabled = false; pintarVerMais(!!filtroAtual().termo || filtroAtual().cat !== "todos"); }
    });
    w.appendChild(b); grade.after(w);
  }
  w.hidden = !temMais();
  const b = document.getElementById("vtMaisBt");
  if (b && !carregandoMais) b.textContent = filtrando ? "Procurar em mais perfis" : "Ver mais";
}

const DONOS_VALIDADE = 30 * 60000; // nome e foto de quem anuncia: cópia do aparelho por 30 min
async function carregarDonos(ids) {
  await Promise.all([...new Set(ids)].map(async (id) => {
    if (!planosDonos.has(id)) planosDonos.set(id, await lerPlano(fb, id).catch(() => null));
    if (donos.has(id)) return;
    try { const s = await docComValidade(fb, ["perfis_publicos", id], DONOS_VALIDADE); donos.set(id, s.exists() ? s.data() : {}); } catch { donos.set(id, {}); }
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
    usarEstat(fb, eu);
    conferirEmail(u);
    try {
      // Onde a pessoa está: GPS guardado no aparelho ou a cidade do perfil público.
      const perfil = await docComValidade(fb, ["perfis_publicos", u.uid], DONOS_VALIDADE).then((s2) => (s2.exists() ? s2.data() : {})).catch(() => ({}));
      await definirPosicao(await minhaPosicao(perfil).catch(() => null));
      await carregarLote(true);
    } catch (e) {
      console.warn("Vitrine indisponível:", e);
      todos = [];
    }
    chipsDinamicos();
    renderizar();
    // Chegou com uma busca (?q=): pergunta também ao Firebase.
    if (termoInicial) buscarNaVitrine();
    // link direto vindo de uma mensagem
    const pg = new URLSearchParams(location.search);
    const idNeg = pg.get("negocio"), idAn = pg.get("anuncio");
    // De onde veio o link (estatísticas): explorar, início, flash, mensagens; sem nada = link compartilhado.
    const origemLink = ["explorar", "inicio", "flash", "mensagens", "perfil"].includes(pg.get("de")) ? pg.get("de") : "link";
    // Fora da lista carregada? Busca direto pelo id antes de dizer que não existe.
    const buscarDireto = async (col, id) => {
      try { const d = await fb.getDoc(fb.doc(fb.db, col, id)); return d.exists() ? { id: d.id, ...d.data() } : null; } catch { return null; }
    };
    if (idAn) {
      let a = todos.find((x) => x.id === idAn);
      if (!a) { a = await buscarDireto("anuncios", idAn); if (a && (a.ativo === false || oculto(a))) a = null; if (a) await carregarDonos([a.donoId]).catch(() => {}); }
      if (a && pausadoNaVitrine(a)) toast("Este anúncio está pausado no momento.");
      else if (a) abrirAnuncio(a, { origem: origemLink }); else toast("Este imóvel não está mais disponível.");
    } else if (idNeg) {
      let n = todos.find((x) => x.id === idNeg);
      if (!n) {
        n = await buscarDireto("negocios", idNeg);
        if (n && (n.tipo !== TIPO || !n.nome || n.oculto === true || oculto(n))) n = null;
        if (n) { await carregarDonos([n.donoId]).catch(() => {}); const r = await lerResumos(fb, ["neg_" + idNegocio(n)]).catch(() => ({})); notasNeg.set(idNegocio(n), r["neg_" + idNegocio(n)]); }
      }
      if (n && pausadoNaVitrine(n)) toast("Este perfil está pausado no momento.");
      else if (n) abrirDetalhe(n, { origem: origemLink }); else toast("Este perfil não está mais disponível.");
    }
  });
}

// Só monta a vitrine nas páginas que informam o tipo (servicos, delivery, shopping, imoveis).
if (TIPO_PAGINA) iniciar();
