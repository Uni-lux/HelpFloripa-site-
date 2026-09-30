// =====================================================
// Página inicial do Help Floripa (marketplace)
// - Busca geral: leva para a classe escolhida (pagina.html?q=termo).
// - Números de cada classe, mais bem avaliados, novidades e imóveis.
// - Banner de anúncios.
// =====================================================
import { fotoSegura } from "./seguranca.js?v=1";
import { estrelas, lerResumos, media } from "./avaliacoes.js?v=2";
import { CATEGORIAS, FINALIDADE, NOMES_TIPO, PAGINA_TIPO, moeda, nomeCategoria } from "./vitrine.js?v=14";

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
  document.querySelectorAll("#classesBusca [data-classe]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.classe === tipo ? "true" : "false"));
  $("buscaGeral").dataset.classe = tipo;
  $("campoBusca").placeholder = DICAS[tipo];
}
document.querySelectorAll("#classesBusca [data-classe]").forEach((b) => b.addEventListener("click", () => { escolherClasse(b.dataset.classe); $("campoBusca").focus(); }));
function buscar(tipo, termo) {
  const t = String(termo || "").trim().slice(0, 80);
  location.href = PAGINA_TIPO[tipo] + (t ? `?q=${encodeURIComponent(t)}` : "");
}
$("buscaGeral").addEventListener("submit", (e) => { e.preventDefault(); buscar(classeBusca, $("campoBusca").value); });
document.querySelectorAll("#populares [data-q]").forEach((b) => b.addEventListener("click", () => buscar(b.dataset.classe, b.dataset.q)));
$("btnBusca")?.addEventListener("click", () => { $("campoBusca").scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(() => $("campoBusca").focus({ preventScroll: true }), 250); });
escolherClasse("servicos");

// ---------- banner ----------
(function banner() {
  const trilho = $("bannerTrilho"), pontos = $("bannerPontos");
  if (!trilho) return;
  const slides = [...trilho.children];
  let i = 0, timer = null;
  const parado = matchMedia("(prefers-reduced-motion: reduce)").matches;
  slides.forEach((_, k) => {
    const b = el("button"); b.type = "button"; b.setAttribute("aria-label", `Ver anúncio ${k + 1}`);
    b.addEventListener("click", () => { ir(k); reiniciar(); });
    pontos.appendChild(b);
  });
  function marcar() { [...pontos.children].forEach((b, k) => b.setAttribute("aria-current", k === i ? "true" : "false")); }
  function ir(k) { i = (k + slides.length) % slides.length; trilho.scrollTo({ left: trilho.clientWidth * i, behavior: "smooth" }); marcar(); }
  function reiniciar() { clearInterval(timer); if (!parado) timer = setInterval(() => ir(i + 1), 5000); }
  trilho.addEventListener("scroll", () => { const k = Math.round(trilho.scrollLeft / Math.max(1, trilho.clientWidth)); if (k !== i) { i = k; marcar(); } }, { passive: true });
  trilho.addEventListener("pointerdown", () => clearInterval(timer));
  trilho.addEventListener("pointerup", reiniciar);
  $("bannerAnt")?.addEventListener("click", () => { ir(i - 1); reiniciar(); });
  $("bannerProx")?.addEventListener("click", () => { ir(i + 1); reiniciar(); });
  document.addEventListener("visibilitychange", () => (document.hidden ? clearInterval(timer) : reiniciar()));
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
    const top = lista.filter((n) => nota(n)?.total).sort((a, b) => media(nota(b)) - media(nota(a)) || nota(b).total - nota(a).total).slice(0, 12);
    preencher("trilhoTop", top.map((n) => cartaoNegocio(n, nota(n))));
    const novos = [...lista].sort((a, b) => ms(b.atualizadoEm) - ms(a.atualizadoEm)).filter((n) => n.tipo !== "imoveis").slice(0, 12);
    preencher("trilhoNovos", novos.map((n) => cartaoNegocio(n, nota(n))));
  } catch (e) { console.warn("Vitrine da página inicial indisponível:", e); preencher("trilhoTop", []); preencher("trilhoNovos", []); }

  try {
    const snap = await fs.getDocs(fs.query(fs.collection(db, "anuncios"), fs.where("tipo", "==", "imovel"), fs.limit(40)));
    const ims = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((a) => a.ativo !== false).sort((a, b) => ms(b.atualizadoEm || b.criadoEm) - ms(a.atualizadoEm || a.criadoEm)).slice(0, 10);
    preencher("trilhoImoveis", ims.map(cartaoImovel));
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
