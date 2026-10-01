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
import { estrelas, lerResumos, media } from "./avaliacoes.js?v=3";
import { CATEGORIAS, FINALIDADE, NOMES_TIPO, PAGINA_TIPO, moeda, nomeCategoria } from "./vitrine.js?v=16";

const $ = (id) => document.getElementById(id);
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const ms = (ts) => ts?.toMillis?.() ?? 0;
const IMG_TIPO = { servicos: "servicos.webp", delivery: "lanchonetes.webp", lojinha: "shopping.webp", imoveis: "imoveis.webp" };
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
const DICAS = {
  servicos: "Ex.: diarista, eletricista, manicure",
  delivery: "Ex.: pizza, hambúrguer, açaí",
  lojinha: "Ex.: tênis, fone, vestido",
  imoveis: "Ex.: apartamento na Trindade"
};
function escolherClasse(tipo) {
  classeBusca = tipo;
  $("classeBusca").value = tipo;
  $("buscaGeral").dataset.classe = tipo;
  $("campoBusca").placeholder = DICAS[tipo];
}
$("classeBusca").addEventListener("change", () => { escolherClasse($("classeBusca").value); $("campoBusca").focus(); });
function buscar(tipo, termo) {
  const t = String(termo || "").trim().slice(0, 80);
  location.href = PAGINA_TIPO[tipo] + (t ? `?q=${encodeURIComponent(t)}` : "");
}
$("buscaGeral").addEventListener("submit", (e) => { e.preventDefault(); buscar(classeBusca, $("campoBusca").value); });
escolherClasse("servicos");

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
["trilhoTop", "trilhoNovos", "trilhoImoveis"].forEach((id) => esqueletos(id));

function fundo(div, url) { if (url) div.style.backgroundImage = `url("${url}")`; }

function cartaoNegocio(n, resumo) {
  const a = el("a", "mini");
  a.href = n.tipo === "imoveis" ? `usuarios.html?perfil=${encodeURIComponent(n.donoId)}` : `${PAGINA_TIPO[n.tipo]}?negocio=${encodeURIComponent(n.id)}`;
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
  const cat = n.tipo === "servicos" ? (n.categorias || [n.categoria]).map((k) => CATEGORIAS.servicos[k]).filter(Boolean).slice(0, 2).join(" · ") : nomeCategoria(n);
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
  tx.appendChild(el("strong", null, an.titulo || `${CATEGORIAS.imoveis[an.categoria] || "Imóvel"} para ${(FINALIDADE[an.finalidade] || "negociar").toLowerCase()}`));
  tx.appendChild(el("small", null, [an.bairro, an.cidade].filter(Boolean).join(", ") || "Florianópolis"));
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
    if (!naTela || document.hidden || Date.now() < pausaAte) return;
    const vis = visiveis();
    // Troca o cartão visível que já cumpriu seu tempo (o mais antigo primeiro).
    const vencido = vis.filter((s) => Date.now() - s.desde >= tempo(s.item)).sort((a, b) => a.desde - b.desde)[0];
    if (!vencido) return;
    const novo = sortear(new Set(vis.map((s) => chave(s.item))));
    if (novo) trocar(vencido, novo);
  });
}
// Um relógio só para todos os trilhos; cada um troca no máximo um cartão por vez.
setInterval(() => revezamentos.forEach((fn) => fn()), 1600);

// ---------- dados ----------
async function carregar(fs, db, u) {
  const contar = async (q) => { try { return (await fs.getCountFromServer(q)).data().count; } catch { return null; } };
  const neg = fs.collection(db, "negocios");
  const rotulos = { servicos: ["profissional", "profissionais"], delivery: ["cardápio", "cardápios"], lojinha: ["loja", "lojas"], imoveis: ["imóvel", "imóveis"] };
  Promise.all([
    contar(fs.query(neg, fs.where("tipo", "==", "servicos"))),
    contar(fs.query(neg, fs.where("tipo", "==", "delivery"))),
    contar(fs.query(neg, fs.where("tipo", "==", "lojinha"))),
    contar(fs.query(fs.collection(db, "anuncios"), fs.where("tipo", "==", "imovel")))
  ]).then((ns) => ["servicos", "delivery", "lojinha", "imoveis"].forEach((t, k) => {
    const alvo = $("conta-" + t);
    if (alvo && ns[k] != null) alvo.textContent = ns[k] ? `${ns[k]} ${rotulos[t][ns[k] === 1 ? 0 : 1]}` : "Seja o primeiro";
  }));

  try {
    const snap = await fs.getDocs(fs.query(neg, fs.limit(100)));
    const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((n) => n.nome && n.oculto !== true && NOMES_TIPO[n.tipo]);
    const resumos = await lerResumos({ ...fs, db }, lista.map((n) => "neg_" + n.id));
    const nota = (n) => resumos["neg_" + n.id];
    // Peso pela nota: média alta e mais avaliações pesam mais; sem nota ainda entra, com peso pequeno.
    const pesoNota = (n) => { const r = nota(n); if (!r?.total) return 1; const m = media(r); return 1 + (m * m * (1 + Math.log1p(r.total))) / 5; };
    const tempoNota = (n) => 4500 + 900 * (nota(n)?.total ? media(nota(n)) : 0); // 4,5 s a ~9 s na tela
    const comNota = lista.filter((n) => nota(n)?.total);
    // "Mais bem avaliados" sempre aparece: sem notas ainda, mostra todos e convida a avaliar.
    if (!comNota.length) $("secTop").querySelector(".secao-cab p").textContent = "Ainda sem notas por aqui. Depois do atendimento, avalie quem te atendeu.";
    revezar("trilhoTop", (comNota.length ? comNota : lista).slice(0, 40), { criar: (n) => cartaoNegocio(n, nota(n)), peso: pesoNota, tempo: tempoNota });
    const agora = Date.now(), DIA = 86400000;
    const novos = [...lista].filter((n) => n.tipo !== "imoveis").sort((a, b) => ms(b.atualizadoEm) - ms(a.atualizadoEm)).slice(0, 30);
    // Mais novos pesam mais; a nota também conta.
    const pesoNovo = (n) => { const dias = (agora - ms(n.atualizadoEm || n.criadoEm)) / DIA; return (dias < 3 ? 4 : dias < 14 ? 2.5 : 1) * (0.6 + pesoNota(n) / 5); };
    revezar("trilhoNovos", novos, { criar: (n) => cartaoNegocio(n, nota(n)), peso: pesoNovo, tempo: tempoNota });
  } catch (e) { console.warn("Vitrine da página inicial indisponível:", e); preencher("trilhoTop", []); preencher("trilhoNovos", []); }

  try {
    const snap = await fs.getDocs(fs.query(fs.collection(db, "anuncios"), fs.where("tipo", "==", "imovel"), fs.limit(40)));
    const ims = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((a) => a.ativo !== false).sort((a, b) => ms(b.atualizadoEm || b.criadoEm) - ms(a.atualizadoEm || a.criadoEm)).slice(0, 30);
    const agora = Date.now();
    revezar("trilhoImoveis", ims, {
      criar: cartaoImovel,
      peso: (a) => { const dias = (agora - ms(a.atualizadoEm || a.criadoEm)) / 86400000; return (dias < 7 ? 3 : 1) + ((a.fotos || []).length ? 1 : 0); },
      tempo: () => 6000
    });
  } catch { preencher("trilhoImoveis", []); }
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
    try { const s = await fs.getDoc(fs.doc(db, "perfis_publicos", u.uid)); saudacao((s.exists() && s.data().nome) || u.displayName || ""); } catch { saudacao(u.displayName || ""); }
    carregar(fs, db, u);
  });
})();
