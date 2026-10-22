// =====================================================
// Página inicial do Help Floripa (marketplace)
// - Busca geral: leva para a classe escolhida (pagina.html?q=termo).
// - Números de cada classe.
// - Destaques (mais bem avaliados, chegaram agora, imóveis): os cartões
//   se revezam sozinhos, com entrada e saída; quem tem nota melhor aparece
//   mais vezes e fica mais tempo, mas todos ganham sua vez.
// - Banner de anúncios: passa sozinho e aceita arrastar com o dedo.
// =====================================================
import { fotoSegura } from "./seguranca.js?v=1";
import { enfeitarSelect } from "./escolha.js?v=4";
import { estrelas, lerResumos, media } from "./avaliacoes.js?v=14";
import { docComValidade, docsComValidade } from "./leituras.js?v=1";
import { lerPlano, nivelPlano, seloPlano } from "./planos-base.js?v=3";
import { minhaPosicao, comDistancia, textoDistancia, pedirLocalizacao, rotuloPosicao, esquecerPosicao } from "./perto.js?v=2";
import { lerLocal, salvarLocal, rotuloLocal, noLocal, escolherLocal } from "./local-escolhido.js?v=1";
import { CATEGORIAS, FINALIDADE, NOMES_TIPO, PAGINA_TIPO, moeda, nomeCategoria, nomeCat } from "./vitrine.js?v=55";

const $ = (id) => document.getElementById(id);
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const ms = (ts) => ts?.toMillis?.() ?? 0;
const IMG_TIPO = { servicos: "servicos-480.webp", delivery: "lanchonetes-480.webp", lojinha: "shopping-480.webp", imoveis: "imoveis-480.webp", saude: "saude.svg" };
const iniciais = (n) => { const p = String(n || "?").trim().split(/\s+/); return ((p[0]?.[0] || "?") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase(); };

// ---------- saudação ----------
function saudacao(nome) {
  const h = new Date().getHours();
  const s = h < 5 ? "Boa noite" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  $("saudacao").textContent = nome ? `${s}, ${String(nome).split(" ")[0]}` : s;
  $("iconeHora")?.querySelector("use")?.setAttribute("href", h >= 6 && h < 18 ? "#i-sol" : "#i-lua");
}
saudacao("");

// ---------- busca geral ----------
let classeBusca = "servicos";
let seletor = null; // seletor bonito no lugar do <select> nativo
const DICAS = {
  servicos: "Ex.: diarista, eletricista, manicure",
  delivery: "Ex.: pizza, hambúrguer, açaí",
  lojinha: "Ex.: tênis, fone, vestido",
  imoveis: "Ex.: apartamento com 2 quartos",
  saude: "Ex.: pediatra, psicóloga, Unimed",
  comunidade: "Ex.: berço, sofá, quarto para dividir"
};
// Buscas populares embaixo da busca (como nos apps de serviço e de classificados): mudam com a área.
const POPULARES = {
  servicos: ["Diarista", "Eletricista", "Encanador", "Manicure", "Pedreiro", "Fotógrafo", "Personal trainer"],
  delivery: ["Pizza", "Hambúrguer", "Açaí", "Marmita", "Japonesa", "Doces", "Pastel"],
  lojinha: ["Roupas", "Tênis", "Celular", "Maquiagem", "Móveis", "Artesanato", "Infantil"],
  imoveis: ["Apartamento", "Casa", "Kitnet", "Temporada", "Sala comercial", "Terreno"],
  saude: ["Psicólogo", "Nutricionista", "Fisioterapeuta", "Dentista", "Pediatra", "Veterinário"],
  comunidade: ["Doação", "Móveis", "Roupas", "Quarto", "Brinquedos", "Achados e perdidos"]
};
function pintarPopulares(tipo) {
  const box = $("buscasPop"); if (!box) return;
  box.replaceChildren(el("span", "rot", "Populares:"), ...POPULARES[tipo].map((t) => {
    const b = el("button", null, t); b.type = "button";
    b.addEventListener("click", () => buscar(tipo, t));
    return b;
  }));
}
function escolherClasse(tipo) {
  classeBusca = tipo;
  $("classeBusca").value = tipo;
  $("buscaGeral").dataset.classe = tipo;
  $("campoBusca").placeholder = DICAS[tipo];
  pintarPopulares(tipo);
  seletor?.atualizar();
}
$("classeBusca").addEventListener("change", () => { escolherClasse($("classeBusca").value); $("campoBusca").focus(); });
function buscar(tipo, termo) {
  const t = String(termo || "").trim().slice(0, 80);
  location.href = PAGINA_TIPO[tipo] + (t ? `?q=${encodeURIComponent(t)}` : "");
}
$("buscaGeral").addEventListener("submit", (e) => { e.preventDefault(); buscar(classeBusca, $("campoBusca").value); });
escolherClasse("servicos");
seletor = enfeitarSelect($("classeBusca"), { titulo: "Onde você quer buscar?" });

// ---------- "Você está em ..." ----------
// A cidade escolhida vale para o início, as vitrines e o "Perto de você" (local-escolhido.js).
let perfilEu = {};
function pintarLocal() {
  const f = lerLocal();
  const t = $("localTexto"); if (t) t.textContent = rotuloLocal(f);
  $("localBtn")?.setAttribute("aria-label", `Você está em: ${rotuloLocal(f)}. Tocar para mudar`);
}
async function trocarLocal() {
  const f = await escolherLocal({ perfil: perfilEu, pedirLocalizacao, esquecerPosicao });
  if (f === null) return;
  pintarLocal();
  location.reload(); // destaques, "Perto de você" e números refeitos para o lugar novo
}
$("localBtn")?.addEventListener("click", trocarLocal);
pintarLocal();

// ---------- banner ----------
// Passa sozinho a cada 5 s. Arrastar com o dedo (ou usar as setas e os pontos)
// troca na hora e o relógio recomeça depois que a pessoa solta.
(function banner() {
  const trilho = $("bannerTrilho"), pontos = $("bannerPontos");
  if (!trilho) return;
  const slides = [...trilho.children];
  if (slides.length < 2) return;
  const suave = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  let i = 0, timer = null, mexendo = false, retomar = null;
  slides.forEach((_, k) => {
    const b = el("button"); b.type = "button"; b.setAttribute("aria-label", `Ver anúncio ${k + 1}`);
    b.addEventListener("click", () => { ir(k); reiniciar(); });
    pontos.appendChild(b);
  });
  const marcar = () => [...pontos.children].forEach((b, k) => b.setAttribute("aria-current", k === i ? "true" : "false"));
  function ir(k) {
    i = (k + slides.length) % slides.length;
    trilho.scrollTo({ left: trilho.clientWidth * i, behavior: suave ? "smooth" : "auto" });
    marcar();
  }
  function parar() { clearInterval(timer); timer = null; }
  function reiniciar() { parar(); if (!document.hidden) timer = setInterval(() => { if (!mexendo) ir(i + 1); }, 5000); }
  // Dedo na tela: pausa; ao soltar (ou quando o navegador cancela o toque por causa da rolagem), volta a contar.
  const soltar = () => { clearTimeout(retomar); retomar = setTimeout(() => { mexendo = false; reiniciar(); }, 700); };
  trilho.addEventListener("pointerdown", () => { mexendo = true; parar(); });
  trilho.addEventListener("touchstart", () => { mexendo = true; parar(); }, { passive: true });
  ["pointerup", "pointercancel", "touchend", "touchcancel"].forEach((ev) => trilho.addEventListener(ev, soltar, { passive: true }));
  let fimRolagem = null;
  trilho.addEventListener("scroll", () => {
    const k = Math.round(trilho.scrollLeft / Math.max(1, trilho.clientWidth));
    if (k !== i) { i = Math.max(0, Math.min(slides.length - 1, k)); marcar(); }
    clearTimeout(fimRolagem);
    fimRolagem = setTimeout(() => { if (mexendo) soltar(); }, 160);
  }, { passive: true });
  $("bannerAnt")?.addEventListener("click", () => { ir(i - 1); reiniciar(); });
  $("bannerProx")?.addEventListener("click", () => { ir(i + 1); reiniciar(); });
  // Com mouse, pausa enquanto o cursor está em cima (no celular o toque não conta como "passar por cima").
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    trilho.addEventListener("mouseenter", parar);
    trilho.addEventListener("mouseleave", reiniciar);
  }
  document.addEventListener("visibilitychange", () => (document.hidden ? parar() : reiniciar()));
  addEventListener("resize", () => trilho.scrollTo({ left: trilho.clientWidth * i }));
  marcar(); reiniciar();
})();

// ---------- carrosséis ----------
document.querySelectorAll(".carrossel").forEach((c) => {
  const t = c.querySelector(".trilho");
  c.querySelector(".ant")?.addEventListener("click", () => t.scrollBy({ left: -t.clientWidth * 0.85, behavior: "smooth" }));
  c.querySelector(".prox")?.addEventListener("click", () => t.scrollBy({ left: t.clientWidth * 0.85, behavior: "smooth" }));
});
function esqueletos(id, n = 4) { const t = $(id); t.replaceChildren(...Array.from({ length: n }, () => el("div", "mini esqueleto"))); }
["trilhoPerto", "trilhoTop", "trilhoNovos", "trilhoImoveis"].forEach((id) => esqueletos(id));

function fundo(div, url) { if (url) div.style.backgroundImage = `url("${url}")`; }

// Conta do dono desativada: o conteúdo fica escondido até ocultoAte (conta.js).
const oculto = (x) => (x?.ocultoAte?.toMillis?.() ?? 0) > Date.now();

function cartaoNegocio(n, resumo) {
  const a = el("a", "mini");
  a.href = `${PAGINA_TIPO[n.tipo]}?negocio=${encodeURIComponent(n.id)}&de=inicio`;
  a.style.setProperty("--c", `var(--c-${n.tipo})`);
  const capa = el("div", "capa");
  fundo(capa, fotoSegura((n.fotos || []).find(fotoSegura)) || fotoSegura(n.foto) || IMG_TIPO[n.tipo]);
  capa.appendChild(el("span", "tag", NOMES_TIPO[n.tipo] === "Lojinha" ? "Shopping" : NOMES_TIPO[n.tipo]));
  const av = el("span", "av");
  const f = fotoSegura(n.foto);
  if (f) { const img = document.createElement("img"); img.src = f; img.alt = ""; img.loading = "lazy"; av.appendChild(img); } else av.textContent = iniciais(n.nome);
  capa.appendChild(av);
  const tx = el("div", "tx");
  tx.appendChild(el("strong", null, n.nome || "Negócio"));
  const cat = n.tipo === "servicos" ? (n.categorias || [n.categoria]).map((k) => CATEGORIAS.servicos[k] && nomeCat(n, k)).filter(Boolean).slice(0, 2).join(" · ") : nomeCategoria(n);
  tx.appendChild(el("small", null, [cat, n.cidade].filter(Boolean).join(" · ")));
  tx.appendChild(estrelas(resumo, { compacto: true }));
  a.append(capa, tx);
  return a;
}
function cartaoImovel(an) {
  const a = el("a", "mini imovel");
  a.href = `imoveis.html?anuncio=${encodeURIComponent(an.id)}`;
  a.style.setProperty("--c", "var(--c-imoveis)");
  const capa = el("div", "capa");
  fundo(capa, fotoSegura((an.fotos || []).find(fotoSegura)) || IMG_TIPO.imoveis);
  capa.appendChild(el("span", "tag", FINALIDADE[an.finalidade] || "Imóvel"));
  const preco = el("span", "preco", moeda(an.preco) || "Consultar");
  if (moeda(an.preco) && an.finalidade === "aluguel") preco.appendChild(el("small", null, "/mês"));
  if (moeda(an.preco) && an.finalidade === "temporada") preco.appendChild(el("small", null, "/dia"));
  capa.appendChild(preco);
  const tx = el("div", "tx");
  tx.appendChild(el("strong", null, an.titulo || `${(CATEGORIAS.imoveis[an.categoria] && nomeCat(an, an.categoria)) || "Imóvel"} para ${(FINALIDADE[an.finalidade] || "negociar").toLowerCase()}`));
  tx.appendChild(el("small", null, [an.bairro, an.cidade].filter(Boolean).join(", ") || "Local não informado"));
  const specs = [an.quartos ? `${an.quartos} ${Number(an.quartos) === 1 ? "quarto" : "quartos"}` : "", an.vagas ? `${an.vagas} ${Number(an.vagas) === 1 ? "vaga" : "vagas"}` : "", an.area ? `${an.area} m²` : ""].filter(Boolean).join(" · ");
  if (specs) tx.appendChild(el("span", "specs", specs));
  a.append(capa, tx);
  return a;
}
function preencher(id, cartoes) {
  const t = $(id);
  t.replaceChildren(...cartoes);
  t.closest(".secao-home").hidden = !cartoes.length;
}

// ---------- destaques que se revezam ----------
// Cada trilho mostra alguns "lugares". De tempos em tempos um cartão visível sai
// (desaparece) e outro entra no lugar. A escolha é sorteada com peso: nota melhor
// = mais chances e mais tempo na tela. Quem ainda não apareceu ganha prioridade,
// então todos têm sua vez. Pausa quando a pessoa mexe no trilho, quando a seção
// sai da tela ou quando a aba fica em segundo plano.
const SEM_MOVIMENTO = matchMedia("(prefers-reduced-motion: reduce)").matches;
const revezamentos = [];
function revezar(id, itens, { criar, peso, tempo, chave = (x) => x.id, lugares = 8 }) {
  const trilho = $(id);
  // Trocar o filtro monta o trilho de novo: o revezamento antigo para sozinho.
  const geracao = (trilho._geracao = (trilho._geracao || 0) + 1);
  const total = Math.min(itens.length, lugares);
  // Começa pelos de maior peso (os melhores aparecem primeiro).
  const ordem = [...itens].sort((a, b) => peso(b) - peso(a));
  const slots = ordem.slice(0, total).map((item) => {
    const s = el("div", "slot");
    s.appendChild(criar(item));
    return { el: s, item, desde: Date.now() };
  });
  preencher(id, slots.map((s) => s.el));
  if (itens.length <= 1 || SEM_MOVIMENTO) return;
  const vezes = new Map(itens.map((x) => [chave(x), 0]));
  slots.forEach((s) => vezes.set(chave(s.item), 1));
  let pausaAte = 0, naTela = false;
  const pausar = () => { pausaAte = Date.now() + 6000; };
  ["pointerdown", "touchstart", "wheel", "focusin"].forEach((ev) => trilho.addEventListener(ev, pausar, { passive: true }));
  trilho.addEventListener("scroll", pausar, { passive: true });
  new IntersectionObserver(([e]) => { naTela = e.isIntersecting; }, { threshold: 0.35 }).observe(trilho);

  const visiveis = () => {
    const r = trilho.getBoundingClientRect();
    return slots.filter((s) => { const b = s.el.getBoundingClientRect(); return b.right > r.left + 24 && b.left < r.right - 24; });
  };
  function sortear(excluir) {
    const cand = itens.filter((x) => !excluir.has(chave(x)));
    if (!cand.length) return null;
    // Peso da nota dividido por quantas vezes já apareceu: os melhores voltam mais, mas ninguém fica de fora.
    const p = cand.map((x) => peso(x) / (1 + (vezes.get(chave(x)) || 0)));
    let r = Math.random() * p.reduce((a, b) => a + b, 0);
    for (let k = 0; k < cand.length; k++) { r -= p[k]; if (r <= 0) return cand[k]; }
    return cand[cand.length - 1];
  }
  function trocar(slot, novo) {
    const fora = slots.find((s) => s !== slot && chave(s.item) === chave(novo));
    slot.el.classList.add("sai");
    setTimeout(() => {
      if (fora) { fora.item = slot.item; fora.el.replaceChildren(criar(fora.item)); } // o que estava fora da tela troca de lugar
      slot.item = novo; slot.desde = Date.now();
      vezes.set(chave(novo), (vezes.get(chave(novo)) || 0) + 1);
      slot.el.replaceChildren(criar(novo));
      slot.el.classList.remove("sai");
      slot.el.classList.add("entra");
      setTimeout(() => slot.el.classList.remove("entra"), 650);
    }, 420);
  }
  revezamentos.push(() => {
    if (trilho._geracao !== geracao || !naTela || document.hidden || Date.now() < pausaAte) return;
    const vis = visiveis();
    // Troca o cartão visível que já cumpriu seu tempo (o mais antigo primeiro).
    const vencido = vis.filter((s) => Date.now() - s.desde >= tempo(s.item)).sort((a, b) => a.desde - b.desde)[0];
    if (!vencido) return;
    const novo = sortear(new Set(vis.map((s) => chave(s.item))));
    if (novo) trocar(vencido, novo);
  });
}
// Filtro por tipo em cima de um carrossel (Tudo · Freelances · Delivery · Lojas · Imóveis): só os
// tipos que têm alguém aparecem; com um tipo só, o filtro nem aparece.
const ROT_FILTRO = { servicos: "Freelances", delivery: "Delivery", lojinha: "Lojas", imoveis: "Imóveis", saude: "Saúde" };
function filtroTipos(secId, lista, montar) {
  const sec = $(secId); if (!sec) return;
  sec.querySelector(".hm-filtro")?.remove();
  const tipos = Object.keys(ROT_FILTRO).filter((t) => lista.some((n) => n.tipo === t));
  montar(lista);
  if (tipos.length < 2) return;
  const box = el("div", "hm-filtro"); box.setAttribute("role", "tablist"); box.setAttribute("aria-label", "Filtrar por tipo");
  const pintar = (atual) => box.querySelectorAll("button").forEach((b) => { const on = b.dataset.t === atual; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); });
  [["", "Tudo"], ...tipos.map((t) => [t, ROT_FILTRO[t]])].forEach(([t, rot]) => {
    const b = el("button", t ? "t-" + t : "", rot); b.type = "button"; b.dataset.t = t; b.setAttribute("role", "tab");
    b.addEventListener("click", () => { pintar(t); montar(t ? lista.filter((n) => n.tipo === t) : lista); });
    box.appendChild(b);
  });
  pintar("");
  sec.querySelector(".secao-cab").insertAdjacentElement("afterend", box);
}
// Um relógio só para todos os trilhos; cada um troca no máximo um cartão por vez.
setInterval(() => revezamentos.forEach((fn) => fn()), 1600);

// ---------- dados ----------
// ---------- Perto de você ----------
// Negócios e imóveis mais perto: GPS do aparelho (se a pessoa deixou) ou o centro da cidade do perfil.
function seloDistancia(card, x) {
  if (!Number.isFinite(x._km)) return card;
  const s = el("span", "dist"); s.textContent = textoDistancia(x._km, x._aprox);
  card.querySelector(".capa")?.appendChild(s);
  if (x._plano) card.querySelector(".capa")?.appendChild(seloPlano(x._plano, "selo-pro hm-pro"));
  return card;
}
async function montarPerto(fs, db, u, negocios, imoveis, nota) {
  const sec = $("secPerto"), sub = $("pertoSub"), bt = $("pertoLoc");
  const perfil = await docComValidade({ ...fs, db }, ["perfis_publicos", u.uid], 10 * 60000).then((s) => (s.exists() ? s.data() : {})).catch(() => ({}));
  let pos = await minhaPosicao(perfil).catch(() => null);
  const desenhar = async () => {
    bt.hidden = pos?.origem === "gps";
    if (!pos) { sub.textContent = "Ative a localização para ver quem atende perto de você."; preencher("trilhoPerto", []); bt.hidden = false; return; }
    const nome = await rotuloPosicao(pos);
    sub.textContent = pos.origem === "gps" ? `Do mais perto ao mais longe de onde você está${nome ? ` · ${nome}` : ""}` : `${pos.escolhida ? "Pela cidade escolhida" : "Pela cidade do seu perfil"}${nome ? ` · ${nome}` : ""}. Use a localização para ver mais exato.`;
    const itens = await comDistancia([...negocios.filter((n) => n.tipo !== "imoveis"), ...imoveis.map((a) => ({ ...a, tipo: "imoveis", _anuncio: true }))], pos);
    // Plano Pro: aparece antes (conta como se estivesse 40% mais perto) e com o selo.
    const comKm = itens.filter((x) => Number.isFinite(x._km));
    const fsb = { ...fs, db };
    await Promise.all([...new Set(comKm.map((x) => x.donoId).filter(Boolean))].map(async (id) => { const pl = await lerPlano(fsb, id).catch(() => null); const nv = nivelPlano(pl); comKm.forEach((x) => { if (x.donoId === id) { x._nivel = nv; x._plano = nv ? pl : null; } }); }));
    // Pro conta 40% mais perto e Premium 50% (o Plus só tem o selo).
    const peso = (x) => (x._nivel >= 3 ? 0.5 : x._nivel === 2 ? 0.6 : 1);
    const perto = comKm.sort((a, b) => a._km * peso(a) - b._km * peso(b));
    const raio = perto.filter((x) => x._km <= 60);
    const lista = (raio.length >= 4 ? raio : perto).slice(0, 24);
    if (!lista.length) { sub.textContent = "Ainda não tem ninguém cadastrado perto de você."; }
    filtroTipos("secPerto", lista, (l) => preencher("trilhoPerto", l.slice(0, 16).map((x) => seloDistancia(x._anuncio ? cartaoImovel(x) : cartaoNegocio(x, nota(x)), x))));
  };
  bt.addEventListener("click", async () => {
    bt.disabled = true; bt.querySelector("span").textContent = "Localizando...";
    try { pos = await pedirLocalizacao(); await desenhar(); }
    catch (e) { sub.textContent = e?.message || "Não deu para pegar a sua localização."; }
    finally { bt.disabled = false; bt.querySelector("span").textContent = "Usar minha localização"; }
  });
  await desenhar();
  sec.hidden = false;
  // Veio do menu ("Perto de você"): a seção só aparece depois de carregar, então rola até ela agora.
  if (location.hash === "#secPerto") scrollTo({ top: sec.getBoundingClientRect().top + scrollY - 76 });
}

async function carregar(fs, db, u) {
  let negociosPerto = [], imoveisPerto = [], notaPerto = () => null;
  // Os totais por categoria ficam guardados por 30 min.
  let totais = {};
  try { const t = JSON.parse(localStorage.getItem("hf-totais-inicio") || "null"); if (t && Date.now() - t.em < 1800000) totais = t; } catch {}
  const contar = async (q, nome) => {
    if (typeof totais[nome] === "number") return totais[nome];
    try { const n = (await fs.getCountFromServer(q)).data().count; totais[nome] = n; totais.em = totais.em || Date.now(); try { localStorage.setItem("hf-totais-inicio", JSON.stringify(totais)); } catch {} return n; } catch { return null; }
  };
  const neg = fs.collection(db, "negocios");
  const rotulos = { servicos: ["profissional", "profissionais"], delivery: ["cardápio", "cardápios"], lojinha: ["loja", "lojas"], imoveis: ["imóvel", "imóveis"], saude: ["profissional", "profissionais"], comunidade: ["anúncio", "anúncios"] };
  Promise.all([
    contar(fs.query(neg, fs.where("tipo", "==", "servicos")), "servicos"),
    contar(fs.query(neg, fs.where("tipo", "==", "delivery")), "delivery"),
    contar(fs.query(neg, fs.where("tipo", "==", "lojinha")), "lojinha"),
    contar(fs.query(fs.collection(db, "anuncios"), fs.where("tipo", "==", "imovel")), "imoveis"),
    contar(fs.query(neg, fs.where("tipo", "==", "saude")), "saude"),
    contar(fs.query(fs.collection(db, "comunidade"), fs.where("status", "==", "disponivel")), "comunidade")
  ]).then((ns) => ["servicos", "delivery", "lojinha", "imoveis", "saude", "comunidade"].forEach((t, k) => {
    const alvo = $("conta-" + t);
    if (alvo && ns[k] != null) alvo.textContent = ns[k] ? `${ns[k]} ${rotulos[t][ns[k] === 1 ? 0 : 1]}` : "Seja o primeiro";
  }));

  try {
    // Os 60 atualizados mais recentemente: o bastante para os dois carrosséis (40 + 30).
    // Antes eram 150 perfis inteiros, com fotos, a cada visita; o resto está nas vitrines.
    // Vale por 10 min no aparelho: voltar à página inicial não lê tudo de novo.
    const snap = await docsComValidade({ ...fs, db }, "inicio-negocios", fs.query(neg, fs.orderBy("atualizadoEm", "desc"), fs.limit(60)), 10 * 60000).catch(() => fs.getDocs(fs.query(neg, fs.limit(60))));
    const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((n) => n.nome && n.oculto !== true && !oculto(n) && NOMES_TIPO[n.tipo]);
    const resumos = await lerResumos({ ...fs, db }, lista.map((n) => "neg_" + n.id));
    const nota = (n) => resumos["neg_" + n.id];
    negociosPerto = lista; notaPerto = nota;
    // Peso pela nota: média alta e mais avaliações pesam mais; sem nota ainda entra, com peso pequeno.
    const pesoNota = (n) => { const r = nota(n); if (!r?.total) return 1; const m = media(r); return 1 + (m * m * (1 + Math.log1p(r.total))) / 5; };
    const tempoNota = (n) => 4500 + 900 * (nota(n)?.total ? media(nota(n)) : 0); // 4,5 s a ~9 s na tela
    const comNota = lista.filter((n) => nota(n)?.total);
    // Cidade/estado escolhido em "Você está em": os de lá vêm primeiro (os outros continuam, depois).
    const loc = lerLocal(), aqui = (n) => noLocal(n, loc);
    const localPrimeiro = (l) => (loc.uf ? [...l.filter(aqui), ...l.filter((n) => !aqui(n))] : l);
    const nomeLocal = loc.uf ? rotuloLocal(loc) : "";
    if (nomeLocal) {
      const temTop = comNota.some(aqui), temNovo = lista.some(aqui);
      $("t-secTop").textContent = temTop ? `Mais bem avaliados em ${nomeLocal}` : "Mais bem avaliados no Brasil";
      if (!temTop && comNota.length) $("secTop").querySelector(".secao-cab p").textContent = `Ainda sem notas em ${nomeLocal}. Veja os mais bem avaliados de todo o Brasil.`;
      $("t-secNovos").textContent = temNovo ? `Chegaram agora em ${nomeLocal}` : "Chegaram agora no Brasil";
    }
    cidadesEmDestaque(lista);
    // "Mais bem avaliados" sempre aparece: sem notas ainda, mostra todos e convida a avaliar.
    if (!comNota.length) $("secTop").querySelector(".secao-cab p").textContent = "Ainda sem notas por aqui. Depois do atendimento, avalie quem te atendeu.";
    filtroTipos("secTop", localPrimeiro(comNota.length ? comNota : lista).slice(0, 40), (l) => revezar("trilhoTop", l, { criar: (n) => cartaoNegocio(n, nota(n)), peso: pesoNota, tempo: tempoNota }));
    const agora = Date.now(), DIA = 86400000;
    const novos = localPrimeiro([...lista].filter((n) => n.tipo !== "imoveis").sort((a, b) => ms(b.atualizadoEm) - ms(a.atualizadoEm))).slice(0, 30);
    // Mais novos pesam mais; a nota também conta.
    const pesoNovo = (n) => { const dias = (agora - ms(n.atualizadoEm || n.criadoEm)) / DIA; return (dias < 3 ? 4 : dias < 14 ? 2.5 : 1) * (0.6 + pesoNota(n) / 5); };
    filtroTipos("secNovos", novos, (l) => revezar("trilhoNovos", l, { criar: (n) => cartaoNegocio(n, nota(n)), peso: pesoNovo, tempo: tempoNota }));
  } catch (e) { console.warn("Vitrine da página inicial indisponível:", e); preencher("trilhoTop", []); preencher("trilhoNovos", []); }

  try {
    const an = fs.collection(db, "anuncios");
    const snap = await docsComValidade({ ...fs, db }, "inicio-imoveis", fs.query(an, fs.where("tipo", "==", "imovel"), fs.orderBy("atualizadoEm", "desc"), fs.limit(24)), 10 * 60000)
      .catch(() => fs.getDocs(fs.query(an, fs.where("tipo", "==", "imovel"), fs.limit(24))));
    const locIm = lerLocal();
    const imsTodos = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((a) => a.ativo !== false && !oculto(a)).sort((a, b) => ms(b.atualizadoEm || b.criadoEm) - ms(a.atualizadoEm || a.criadoEm));
    const ims = (locIm.uf ? [...imsTodos.filter((a) => noLocal(a, locIm)), ...imsTodos.filter((a) => !noLocal(a, locIm))] : imsTodos).slice(0, 30);
    if (locIm.uf && imsTodos.some((a) => noLocal(a, locIm))) $("t-secImoveis").textContent = `Imóveis em ${rotuloLocal(locIm)}`;
    imoveisPerto = ims;
    const agora = Date.now();
    revezar("trilhoImoveis", ims, {
      criar: cartaoImovel,
      peso: (a) => { const dias = (agora - ms(a.atualizadoEm || a.criadoEm)) / 86400000; return (dias < 7 ? 3 : 1) + ((a.fotos || []).length ? 1 : 0); },
      tempo: () => 6000
    });
  } catch { preencher("trilhoImoveis", []); }
  montarPerto(fs, db, u, negociosPerto, imoveisPerto, notaPerto).catch((e) => { console.warn("Perto de você indisponível:", e); preencher("trilhoPerto", []); });
}

(async function iniciar() {
  for (let i = 0; i < 100 && (!window.firebaseAuth || !window.firebaseDb); i++) await new Promise((r) => setTimeout(r, 50));
  if (!window.firebaseDb) return;
  const [auth, fs] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
  ]);
  const db = window.firebaseDb;
  let feito = false;
  auth.onAuthStateChanged(window.firebaseAuth, async (u) => {
    if (!u || feito) return;
    feito = true;
    try { const s = await docComValidade({ ...fs, db }, ["perfis_publicos", u.uid], 10 * 60000); perfilEu = s.exists() ? s.data() : {}; saudacao(perfilEu.nome || u.displayName || ""); } catch { saudacao(u.displayName || ""); }
    carregar(fs, db, u);
    comunicados(fs, db);
  });
})();

// ---------- cidades em destaque ----------
// Cidades com mais negócios entre os carregados (como a lista de estados/cidades dos classificados).
// Tocar escolhe a cidade em "Você está em" e refaz a página.
function cidadesEmDestaque(lista) {
  const sec = $("secCidades"), box = $("cidadesChips");
  if (!sec || !box) return;
  const cont = new Map();
  lista.forEach((n) => {
    if (!n.uf || !n.cidade) return;
    const k = n.cidadeIbge ? String(n.cidadeIbge) : `${n.cidade}|${n.uf}`;
    const c = cont.get(k) || { uf: n.uf, cidade: String(n.cidade).replace(/\s*[\/,-]\s*[A-Za-z]{2}\s*$/, ""), cidadeIbge: Number(n.cidadeIbge) || null, n: 0 };
    c.n++; cont.set(k, c);
  });
  const top = [...cont.values()].sort((a, b) => b.n - a.n).slice(0, 10);
  if (top.length < 2) return;
  const atual = lerLocal();
  box.replaceChildren(...top.map((c) => {
    const b = el("button", "cid" + (atual.cidadeIbge && Number(atual.cidadeIbge) === c.cidadeIbge ? " on" : "")); b.type = "button";
    b.append(el("strong", null, `${c.cidade}/${c.uf}`), el("small", null, `${c.n} ${c.n === 1 ? "negócio" : "negócios"}`));
    b.addEventListener("click", () => { esquecerPosicao(); salvarLocal(c.cidadeIbge ? { uf: c.uf, cidade: c.cidade, cidadeIbge: c.cidadeIbge } : { uf: c.uf }); location.reload(); });
    return b;
  }), (() => { const b = el("button", "cid outra"); b.type = "button"; b.append(el("strong", null, "Outra cidade"), el("small", null, "Escolher")); b.addEventListener("click", trocarLocal); return b; })());
  sec.hidden = false;
}

// ---------- comunicados da equipe (painel do administrador) ----------
// Faixa no topo da página inicial. Quem fecha não vê de novo aquele comunicado.
async function comunicados(fs, db) {
  let fechados = [];
  try { fechados = JSON.parse(localStorage.getItem("hf-comunicados-fechados") || "[]"); } catch {}
  try {
    const s = await fs.getDocs(fs.query(fs.collection(db, "comunicados"), fs.where("ativo", "==", true), fs.limit(5)));
    const lista = s.docs.map((d) => ({ id: d.id, ...d.data() }))
      .filter((c) => !fechados.includes(c.id) && (!c.ate || (c.ate.toMillis?.() ?? 0) > Date.now()))
      .sort((a, b) => (b.em?.toMillis?.() ?? 0) - (a.em?.toMillis?.() ?? 0));
    const main = document.querySelector("main.pagina");
    if (!lista.length) return;
    const { cartaoComunicado } = await import("./comunicados.js?v=1");
    lista.slice(0, 2).reverse().forEach((c) => {
      main?.prepend(cartaoComunicado(c, { aoFechar: () => { fechados.push(c.id); try { localStorage.setItem("hf-comunicados-fechados", JSON.stringify(fechados.slice(-50))); } catch {} } }));
    });
  } catch (e) { console.warn("Comunicados:", e); }
}
