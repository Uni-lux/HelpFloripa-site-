// =====================================================
// Modelos das publicações do Diário (10/11/2026, pedido do dono): o jeito de mostrar cada tipo, escolhido ao publicar
// (diario.layout). Usado no cartão do Diário/Explorar/tela da publicação e na prévia do formulário de publicar.
// Sem dependências: quem chama passa o carrossel e o que fazer nos toques.
//   texto: citação · simples · destaque (cartão colorido)      texto + imagem: em cima · ao lado · no fundo
//   1 foto: normal · polaroid      2 a 4 fotos: carrossel · grade · mosaico · baralho · pizza
//   enquete: lista · cartões · duelo (2 opções)                 vídeo: normal · cinema (16:9) · vertical (9:16)
// =====================================================
export const MODELOS = {
  texto: [["citacao", "Citação", "Aspas e letra grande"], ["simples", "Simples", "Texto corrido"], ["destaque", "Destaque", "Cartão colorido"]],
  casada: [["topo", "Em cima", "Imagem em cima do texto"], ["lado", "Ao lado", "Imagem do lado"], ["fundo", "No fundo", "Texto por cima da imagem"]],
  foto1: [["normal", "Normal", "A foto inteira"], ["polaroid", "Polaroid", "Moldura branca com o título"]],
  fotos: [["carrossel", "Carrossel", "Deslize para ver"], ["grade", "Grade", "Todas lado a lado"], ["mosaico", "Mosaico", "Uma grande e as outras"], ["baralho", "Baralho", "Cartas empilhadas"], ["pizza", "Pizza", "Fatias num círculo"]],
  enquete: [["lista", "Lista", "Uma opção embaixo da outra"], ["cartoes", "Cartões", "Opções em quadrados"], ["duelo", "Duelo", "Duas opções frente a frente"]],
  video: [["normal", "Normal", "Do jeito que foi gravado"], ["cinema", "Cinema", "Tela larga 16:9"], ["vertical", "Vertical", "Em pé, 9:16"]]
};
// Qual lista de modelos vale para a publicação (ou para o que está no formulário).
export function grupoModelo(p) {
  const fotos = Array.isArray(p.midias) && p.midias.length > 1 ? p.midias.length : (p.mediaUrl && p.mediaTipo !== "video" ? 1 : 0);
  if (p.mediaTipo === "video") return "video";
  if (p.enquete?.pergunta) return "enquete";
  if (p.caixa?.pergunta) return null;
  if (p.estilo === "casada" && fotos) return "casada";
  if (fotos > 1) return "fotos";
  if (fotos === 1) return "foto1";
  return p.texto ? "texto" : null;
}
// O modelo escolhido, se vale para o grupo (senão o primeiro). Duelo só com 2 opções.
export function layoutDe(p) {
  const g = grupoModelo(p); if (!g) return "";
  const ok = MODELOS[g].some(([k]) => k === p.layout) && !(p.layout === "duelo" && p.enquete?.opcoes?.length !== 2);
  return ok ? p.layout : MODELOS[g][0][0];
}
export const modelosDe = (p) => { const g = grupoModelo(p); if (!g) return []; return MODELOS[g].filter(([k]) => !(k === "duelo" && p.enquete?.opcoes?.length !== 2)); };

const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const img = (src, alt, i) => { const m = document.createElement("img"); m.src = src; m.alt = alt; m.loading = i ? "lazy" : "eager"; m.decoding = "async"; m.draggable = false; return m; };

// Um toque espera um instante para ver se vem o segundo (toque duplo = estrelas).
function toques(alvo, { aoToque, aoToqueDuplo }) {
  let ultimo = 0, timer = null;
  alvo.addEventListener("click", (e) => {
    if (e.target.closest("a, .bt-modelo")) return;
    const agora = Date.now();
    if (agora - ultimo < 320) { clearTimeout(timer); ultimo = 0; aoToqueDuplo?.(e); return; }
    ultimo = agora; clearTimeout(timer);
    timer = setTimeout(() => aoToque?.(e), aoToqueDuplo ? 300 : 0);
  });
}

// Fotos no modelo escolhido. op: { layout, carrosselFotos, alt, titulo, aoToqueDuplo, abrirFoto(i) }
export function blocoFotos(fotos, op = {}) {
  const n = fotos.length, alt = op.alt || "Foto da publicação";
  const lay = n > 1 ? (["grade", "mosaico", "baralho", "pizza"].includes(op.layout) ? op.layout : "carrossel") : (op.layout === "polaroid" ? "polaroid" : "normal");
  if (lay === "carrossel" || lay === "normal") return null; // o cartão usa o carrossel de sempre
  const abrir = (i) => op.abrirFoto?.(i);
  if (lay === "polaroid") {
    const w = el("figure", "md-polaroid");
    const q = el("div", "md-pol-foto"); q.appendChild(img(fotos[0], alt, 0));
    w.appendChild(q);
    if (op.titulo) w.appendChild(el("figcaption", null, op.titulo));
    toques(w, { aoToque: () => abrir(0), aoToqueDuplo: op.aoToqueDuplo });
    return w;
  }
  if (lay === "grade" || lay === "mosaico") {
    const w = el("div", `md-${lay} n${n}`);
    fotos.forEach((u, i) => { const c = el("div", "md-cel"); c.dataset.i = i; c.appendChild(img(u, `${alt} (${i + 1} de ${n})`, i)); w.appendChild(c); });
    toques(w, { aoToque: (e) => { const c = e.target.closest(".md-cel"); if (c) abrir(Number(c.dataset.i)); }, aoToqueDuplo: op.aoToqueDuplo });
    return w;
  }
  if (lay === "baralho") {
    // Cartas empilhadas: tocar manda a de cima para trás (com a carta voando); a contagem mostra qual está em cima.
    const w = el("div", "md-baralho"); w.setAttribute("aria-label", `${n} fotos empilhadas · toque para passar`);
    const cartas = fotos.map((u, i) => { const c = el("div", "md-carta"); c.appendChild(img(u, `${alt} (${i + 1} de ${n})`, i)); w.appendChild(c); return c; });
    const cont = el("span", "md-cont"); w.appendChild(cont);
    const dica = el("span", "md-dica", "Toque para passar"); w.appendChild(dica);
    let topo = 0;
    const pintar = () => {
      cartas.forEach((c, i) => { const p = (i - topo + n) % n; c.style.setProperty("--p", p); c.style.setProperty("--r", p ? (p % 2 ? 6 : -5) + "deg" : "0deg"); c.style.zIndex = String(n - p); c.classList.toggle("em-cima", p === 0); });
      cont.textContent = `${topo + 1}/${n}`;
    };
    pintar();
    const passar = () => {
      const c = cartas[topo]; c.classList.add("voa");
      dica.remove();
      setTimeout(() => { c.classList.remove("voa"); topo = (topo + 1) % n; pintar(); }, 260);
    };
    toques(w, { aoToque: passar, aoToqueDuplo: op.aoToqueDuplo });
    w.indice = () => topo;
    return w;
  }
  // Pizza: cada foto é uma fatia de um círculo; tocar numa fatia abre a foto.
  const w = el("div", `md-pizza n${n}`);
  const passo = 360 / n;
  fotos.forEach((u, i) => {
    const f = el("div", "md-fatia"); f.dataset.i = i;
    const a0 = i * passo, a1 = (i + 1) * passo, pts = ["50% 50%"];
    for (let a = a0; a <= a1 + 0.01; a += Math.min(30, a1 - a0) || 30) {
      const r = (Math.min(a, a1) * Math.PI) / 180; pts.push(`${(50 + 75 * Math.sin(r)).toFixed(2)}% ${(50 - 75 * Math.cos(r)).toFixed(2)}%`);
    }
    f.style.clipPath = `polygon(${pts.join(", ")})`;
    // a parte da foto que aparece fica no meio da fatia
    const meio = ((a0 + a1) / 2) * Math.PI / 180;
    const im = img(u, `${alt} (${i + 1} de ${n})`, i);
    im.style.objectPosition = `${(50 + 30 * Math.sin(meio)).toFixed(0)}% ${(50 - 30 * Math.cos(meio)).toFixed(0)}%`;
    f.appendChild(im);
    w.appendChild(f);
  });
  w.style.setProperty("--passo", passo + "deg");
  w.appendChild(el("span", "md-pz-linhas"));
  const centro = el("span", "md-pz-centro"); centro.append(el("b", null, String(n)), el("small", null, "fotos"));
  w.appendChild(centro);
  toques(w, {
    aoToque: (e) => {
      const r = w.getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
      let a = Math.atan2(x, -y) * 180 / Math.PI; if (a < 0) a += 360;
      abrir(Math.min(n - 1, Math.floor(a / passo)));
    },
    aoToqueDuplo: op.aoToqueDuplo
  });
  return w;
}

// Tela cheia para ver as fotos dos modelos (grade, mosaico, baralho, pizza, polaroid). Esc/voltar/X fecham.
export function abrirVisorFotos(fotos, i, carrosselFotos) {
  document.querySelector(".md-visor")?.remove();
  const v = el("div", "md-visor"); v.setAttribute("role", "dialog"); v.setAttribute("aria-label", "Fotos"); v.tabIndex = -1;
  const x = el("button", "md-visor-x"); x.type = "button"; x.setAttribute("aria-label", "Fechar"); x.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  const car = carrosselFotos(fotos, { alt: "Foto" });
  v.append(car, x);
  document.body.appendChild(v);
  const trilho = car.querySelector(".car-trilho");
  requestAnimationFrame(() => { if (trilho) trilho.scrollLeft = trilho.clientWidth * i; });
  const fechar = () => { v.remove(); document.removeEventListener("keydown", tecla, true); };
  const tecla = (e) => { if (e.key === "Escape" && v.isConnected) { e.stopPropagation(); fechar(); } };
  x.addEventListener("click", fechar);
  v.addEventListener("click", (e) => { if (e.target === v) fechar(); });
  v.addEventListener("keydown", tecla);
  document.addEventListener("keydown", tecla, true);
  v.focus({ preventScroll: true });
  return v;
}

// Paleta do cartão "Destaque" (fixa por publicação: a mesma em todo lugar).
const TONS = [["#0a84c6", "#003a63"], ["#7b3fe4", "#2a1066"], ["#e5487f", "#6a0f3a"], ["#f08a24", "#7a2b06"], ["#15a37a", "#06402f"], ["#25313b", "#0b1116"]];
export function tomDestaque(id = "") { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) | 0; return TONS[Math.abs(h) % TONS.length]; }

// Mini desenho de cada modelo (botões de escolher no formulário).
export function desenhoModelo(k) {
  const d = {
    citacao: '<rect x="4" y="5" width="32" height="22" rx="4" class="f"/><text x="8" y="15" class="a">“</text><rect x="11" y="13" width="20" height="2.6" rx="1.3"/><rect x="11" y="18" width="15" height="2.6" rx="1.3"/>',
    simples: '<rect x="5" y="8" width="30" height="2.6" rx="1.3"/><rect x="5" y="13" width="26" height="2.6" rx="1.3"/><rect x="5" y="18" width="29" height="2.6" rx="1.3"/><rect x="5" y="23" width="18" height="2.6" rx="1.3"/>',
    destaque: '<rect x="4" y="4" width="32" height="24" rx="5" class="g"/><rect x="10" y="12" width="20" height="3" rx="1.5" class="w"/><rect x="13" y="18" width="14" height="3" rx="1.5" class="w"/>',
    topo: '<rect x="6" y="3" width="28" height="13" rx="3" class="p"/><rect x="8" y="19" width="24" height="2.6" rx="1.3"/><rect x="8" y="24" width="17" height="2.6" rx="1.3"/>',
    lado: '<rect x="3" y="7" width="15" height="18" rx="3" class="p"/><rect x="21" y="10" width="16" height="2.6" rx="1.3"/><rect x="21" y="15" width="13" height="2.6" rx="1.3"/><rect x="21" y="20" width="15" height="2.6" rx="1.3"/>',
    fundo: '<rect x="5" y="3" width="30" height="26" rx="4" class="p"/><rect x="9" y="18" width="22" height="2.8" rx="1.4" class="w"/><rect x="9" y="23" width="15" height="2.8" rx="1.4" class="w"/>',
    normal: '<rect x="7" y="3" width="26" height="26" rx="4" class="p"/>',
    polaroid: '<g transform="rotate(-6 20 16)"><rect x="9" y="3" width="22" height="26" rx="2" class="w2"/><rect x="11.5" y="5.5" width="17" height="15" rx="1" class="p"/></g>',
    carrossel: '<rect x="9" y="5" width="22" height="22" rx="3" class="p"/><rect x="2" y="8" width="5" height="16" rx="2" class="p2"/><rect x="33" y="8" width="5" height="16" rx="2" class="p2"/>',
    grade: '<rect x="6" y="3" width="13" height="12.5" rx="2" class="p"/><rect x="21" y="3" width="13" height="12.5" rx="2" class="p2"/><rect x="6" y="17" width="13" height="12.5" rx="2" class="p2"/><rect x="21" y="17" width="13" height="12.5" rx="2" class="p"/>',
    mosaico: '<rect x="4" y="3" width="19" height="26" rx="2.5" class="p"/><rect x="25" y="3" width="11" height="12.5" rx="2" class="p2"/><rect x="25" y="17" width="11" height="12" rx="2" class="p2"/>',
    baralho: '<rect x="12" y="4" width="18" height="23" rx="3" class="p2" transform="rotate(12 21 16)"/><rect x="10" y="4" width="18" height="23" rx="3" class="p2" transform="rotate(-10 19 16)"/><rect x="11" y="5" width="18" height="23" rx="3" class="p"/>',
    pizza: '<circle cx="20" cy="16" r="13" class="p"/><path d="M20 16V3M20 16l11.3 6.5M20 16L8.7 22.5" class="l"/>',
    lista: '<rect x="5" y="5" width="30" height="6" rx="3" class="p2"/><rect x="5" y="13" width="30" height="6" rx="3" class="p"/><rect x="5" y="21" width="30" height="6" rx="3" class="p2"/>',
    cartoes: '<rect x="5" y="4" width="14" height="11" rx="2.5" class="p"/><rect x="21" y="4" width="14" height="11" rx="2.5" class="p2"/><rect x="5" y="17" width="14" height="11" rx="2.5" class="p2"/><rect x="21" y="17" width="14" height="11" rx="2.5" class="p2"/>',
    duelo: '<rect x="3" y="6" width="15" height="20" rx="3" class="p"/><rect x="22" y="6" width="15" height="20" rx="3" class="p2"/><circle cx="20" cy="16" r="4.5" class="g"/>',
    cinema: '<rect x="3" y="6" width="34" height="20" rx="3" class="k"/><rect x="3" y="10" width="34" height="12" class="p"/><path d="M18 13.5l5 2.5-5 2.5z" class="w"/>',
    vertical: '<rect x="13" y="2" width="14" height="28" rx="3" class="p"/><path d="M18 13.5l5 2.5-5 2.5z" class="w"/>'
  }[k] || "";
  return `<svg viewBox="0 0 40 32" class="md-ic" aria-hidden="true">${d}</svg>`;
}
