// =====================================================
// Barra de baixo da rede (Diário, Explorar, Comunidade, Mensagens, Perfil). Sem dependências: o rede.js usa este
// módulo e a página da Comunidade também (sem carregar o rede.js). Estilo próprio, injetado só quando a página não
// tem o rede.css (que já traz o mesmo estilo).
// =====================================================
import { ligarQuadro, casca } from "./quadro-rede.js?v=3";
import { ligarDeslizarFlash } from "./deslizar-flash.js?v=12";
export const ITENS_BARRA = [
  ["diario", "feed.html", "feed", "Diário"],
  ["explorar", "feed.html?aba=explorar", "bussola", "Explorar"],
  ["comunidade", "mural.html", "comunidade", "Comunidade"],
  ["mensagens", "mensagens.html", "chat", "Mensagens"],
  ["perfil", "usuarios.html", null, "Perfil"]
];
const ICONES = {
  feed: '<rect x="4" y="4" width="16" height="7" rx="2"/><rect x="4" y="13" width="16" height="7" rx="2"/>',
  bussola: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  comunidade: '<path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/><path d="M9 11.5h6"/>',
  chat: '<path d="M20.5 11.6c0 4.3-3.8 7.6-8.5 7.6-1.2 0-2.3-.2-3.3-.6L4 20l1.2-3.6c-1.1-1.3-1.7-3-1.7-4.8C3.5 7.4 7.3 4 12 4s8.5 3.4 8.5 7.6z"/>'
};
const CSS = `
body.com-barra { padding-bottom: calc(92px + var(--sab, env(safe-area-inset-bottom, 0px))); } 
/* Esmaecido atrás da barra de baixo: o que rola some aos poucos antes de chegar nela (antes um cartão com borda, como o    "Estatísticas do perfil", ficava colado na barra e parecia uma segunda barra). */ body.com-barra::after { content: ""; position: fixed; left: 0; right: 0; bottom: 0; z-index: 1099; pointer-events: none;   height: calc(128px + var(--sab, env(safe-area-inset-bottom, 0px))); background: linear-gradient(to bottom, transparent, color-mix(in srgb, var(--bg, #070b0e) 85%, transparent) 38%, var(--bg, #070b0e) 58%); } 

.barra-rede { position: fixed; left: 50%; bottom: calc(10px + var(--sab, env(safe-area-inset-bottom, 0px))); transform: translateX(-50%); z-index: 1100;
  width: min(460px, calc(100% - 20px)); display: grid; grid-template-columns: repeat(5, 1fr); align-items: center; padding: 6px;
  border-radius: 22px; background: color-mix(in srgb, var(--panel, #0f161b) 97%, transparent); border: 1px solid var(--line, rgba(255,255,255,.1));
  box-shadow: 0 12px 30px rgba(0,0,0,.25); -webkit-backdrop-filter: saturate(1.4) blur(16px); backdrop-filter: saturate(1.4) blur(16px); }
.barra-rede a { position: relative; display: grid; justify-items: center; gap: 2px; padding: 6px 2px; border-radius: 16px;
  color: var(--muted, #8fa0ab); text-decoration: none; font-size: 10.5px; font-weight: 700; }
@media (hover: hover) { .barra-rede a:hover { color: var(--text, #fff); background: var(--hover, rgba(255,255,255,.06)); } }
.barra-rede [aria-current="page"], .barra-rede [aria-current="page"]:hover { color: var(--accent, #00adee); background: color-mix(in srgb, var(--accent, #00adee) 12%, transparent); }
.barra-rede .bi { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.barra-rede .mini-av { width: 24px; height: 24px; border-radius: 50%; overflow: hidden; display: grid; place-items: center; font-size: 9px; font-weight: 800; color: #fff; background: linear-gradient(135deg, #0a4a63, #00adee); }
.barra-rede .mini-av img { width: 100%; height: 100%; object-fit: cover; }
.barra-rede [aria-current="page"] .mini-av { box-shadow: 0 0 0 2px var(--accent, #00adee); }
.barra-rede .ponto-badge { position: absolute; top: 0; right: calc(50% - 22px); }
/* Barra de baixo no jeito do X (12/11/2026, pedido dele): de ponta a ponta, só ícones (o nome fica para o leitor de tela),
   linha fina em cima e uma linha curta sobre o item ativo. Preta no tema escuro, branca no claro. */
body.com-barra { padding-bottom: calc(64px + var(--sab, env(safe-area-inset-bottom, 0px))); }
body.com-barra::after { display: none; }
.barra-rede { left: 0; right: 0; bottom: 0; transform: none; width: auto; max-width: none; margin: 0; padding: 0 4px var(--sab, env(safe-area-inset-bottom, 0px));
  border: 0; border-top: 1px solid var(--line); border-radius: 0; background: var(--panel); box-shadow: none;
  -webkit-backdrop-filter: none; backdrop-filter: none; will-change: transform; }
.barra-rede a, .barra-rede button { height: 54px; padding: 0; border-radius: 0; place-items: center; align-content: center; background: none !important; box-shadow: none !important; color: var(--muted); }
.barra-rede a > span:not(.mini-av) { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.barra-rede .bi { width: 26px; height: 26px; stroke-width: 1.9; }
.barra-rede [aria-current="page"], .barra-rede [aria-current="page"]:hover { color: var(--text); }
.barra-rede [aria-current="page"] .bi { stroke-width: 2.5; }
.barra-rede [aria-current="page"]::before { content: ""; position: absolute; top: 0; left: 50%; width: 24px; height: 2px; margin-left: -12px; border-radius: 0 0 2px 2px; background: var(--text); }
.barra-rede .mini-av { width: 28px; height: 28px; }
.barra-rede [aria-current="page"] .mini-av { box-shadow: 0 0 0 2px var(--panel), 0 0 0 3.5px var(--text); }
.barra-rede .ponto-badge { top: 9px; right: calc(50% - 18px); }
:root[data-theme="dark"] .barra-rede { background: #000; border-top-color: rgba(255, 255, 255, .14); }
:root[data-theme="dark"] .barra-rede [aria-current="page"], :root[data-theme="dark"] .barra-rede [aria-current="page"]:hover { color: #fff; }
:root[data-theme="dark"] .barra-rede [aria-current="page"]::before { background: #fff; }
:root[data-theme="dark"] .barra-rede [aria-current="page"] .mini-av { box-shadow: 0 0 0 2px #000, 0 0 0 3.5px #fff; }
@media (hover: hover) { .barra-rede a:hover { color: var(--text); } }
body.com-barra .fab-hf { bottom: calc(72px + var(--sab, env(safe-area-inset-bottom, 0px))); }
body.com-barra .toast { bottom: calc(72px + var(--sab, env(safe-area-inset-bottom, 0px))); }
/* Barras translúcidas como no X (12/11/2026): o conteúdo passa por baixo do topo e da barra de baixo e aparece
   através delas; a barra vai até o fim da tela (por baixo da faixa de gestos do Android, viewport-fit=cover). */
.barra-rede, :root[data-theme="dark"] .barra-rede { background: rgba(255, 255, 255, .94); -webkit-backdrop-filter: saturate(1.8) blur(18px); backdrop-filter: saturate(1.8) blur(18px); }
:root[data-theme="dark"] .barra-rede { background: #000; }
`;
function estilo() {
  if (document.getElementById("hf-barra-css") || document.querySelector('link[href*="rede.c' + 'ss"]')) return;
  const s = document.createElement("style"); s.id = "hf-barra-css"; s.textContent = CSS; document.head.appendChild(s);
}
const svg = (k) => `<svg class="i bi" viewBox="0 0 24 24" aria-hidden="true">${ICONES[k]}</svg>`;

// Monta a barra (uma vez por página). ativo = "diario" | "explorar" | "comunidade" | "mensagens" | "perfil" | "".
// Topo e barra de baixo que acompanham o dedo (como Instagram, X e TikTok): ao descer, o topo sobe e a barra desce na
// mesma medida da rolagem; ao subir, voltam. Quando o dedo para no meio, completam o movimento por requestAnimationFrame
// (funciona com "remover animações" ligado, que desliga as transições do CSS). --topo-desl leva as faixas presas logo
// abaixo do topo (abas, filtros da Comunidade) junto.
export function ligarTopoQueSome() {
  if (window.__hfTopoSome) return;
  window.__hfTopoSome = true;
  const raiz = document.documentElement, corpo = document.body;
  let ultimo = Math.max(0, scrollY), desl = 0, H = 0, anim = 0, tFim = 0;
  const pecas = () => ({ t: document.querySelector("header.topo"), b: document.getElementById("barraRede"), f: document.querySelectorAll(".fab-hf") });
  const aplicar = (v) => {
    desl = v;
    const { t, b, f } = pecas();
    const k = H ? v / H : 0;
    if (t) t.style.transform = v ? `translate3d(0, ${-v}px, 0)` : "";
    raiz.style.setProperty("--topo-desl", v + "px");
    const bh = b ? b.offsetHeight + 2 : 0;
    if (b) b.style.transform = k ? `translate3d(0, ${(k * bh).toFixed(1)}px, 0)` : "";
    f.forEach((x) => { x.style.transform = k ? `translate3d(0, ${(k * bh).toFixed(1)}px, 0)` : ""; });
    corpo.classList.toggle("topo-some", H > 0 && v >= H - 1);
  };
  const animar = (alvo) => {
    cancelAnimationFrame(anim);
    const de = desl, t0 = performance.now(), dur = 200;
    if (de === alvo) return;
    const passo = (agora) => {
      const p = Math.min(1, (agora - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      aplicar(de + (alvo - de) * e);
      if (p < 1) anim = requestAnimationFrame(passo);
    };
    anim = requestAnimationFrame(passo);
  };
  addEventListener("scroll", () => {
    H = pecas().t?.offsetHeight || 0;
    const y = Math.max(0, scrollY), d = y - ultimo;
    ultimo = y;
    if (!H || corpo.classList.contains("travado")) return;
    cancelAnimationFrame(anim);
    let v = Math.min(H, Math.max(0, desl + d));
    if (y < H) v = Math.min(v, y); // perto do começo, nunca esconde mais do que rolou
    aplicar(v);
    clearTimeout(tFim);
    tFim = setTimeout(() => { if (desl > 0 && desl < H) animar(desl > H / 2 && scrollY > H ? H : 0); }, 120);
  }, { passive: true });
  // Mostrar de novo (trocar Diário/Explorar, a aba volta a aparecer na rede)
  window.__hfMostrarTopo = () => { H = pecas().t?.offsetHeight || H; animar(0); };
  addEventListener("hf:gaveta", () => { if (window.__hfGavetaAberta !== false) window.__hfMostrarTopo(); });
}
export function montarBarra(ativo) {
  ligarTopoQueSome();
  // Deslizar o dedo para o lado troca de aba (no Diário, para a direita abre o Flash).
  ligarQuadro(); // na rede (rede.html), os itens da barra trocam de aba; fora dela, levam para a rede
  if (ITENS_BARRA.some(([k]) => k === ativo)) ligarDeslizarFlash();
  if (document.getElementById("barraRede")) return document.getElementById("barraRede");
  estilo();
  const nav = document.createElement("nav"); nav.className = "barra-rede"; nav.id = "barraRede"; nav.setAttribute("aria-label", "Rede social");
  ITENS_BARRA.forEach(([k, href, ic, rot]) => {
    const a = document.createElement("a"); a.href = href; a.dataset.barra = k;
    if (k === ativo) a.setAttribute("aria-current", "page");
    if (k === "perfil") a.innerHTML = '<span class="mini-av" id="barraAvatar"></span>';
    else a.innerHTML = svg(ic);
    const t = document.createElement("span"); t.textContent = rot; a.appendChild(t);
    if (k === "mensagens") { const bd = document.createElement("b"); bd.className = "ponto-badge"; bd.id = "badgeMensagens"; bd.hidden = true; a.appendChild(bd); }
    nav.appendChild(a);
  });
  document.body.appendChild(nav);
  document.body.classList.add("com-barra");
  // Página com a barra = preto do X no tema escuro: a faixa do sistema acompanha (antes ficava #0f161b).
  const m = document.querySelector('meta[name="theme-color"]');
  if (m && document.documentElement.dataset.theme === "dark") m.content = "#000000";
  return nav;
}
// Marca o item da página atual (o Diário troca entre Diário e Explorar sem recarregar).
export function marcarBarra(ativo) {
  casca()?.marcou(ativo, window); // dentro da rede (rede.html): a casca acompanha a troca Diário ↔ Explorar
  document.querySelectorAll("#barraRede [data-barra]").forEach((a) => (a.dataset.barra === ativo ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
}
// Foto (ou iniciais) do perfil no item Perfil, para páginas sem o rede.js.
export function pintarAvatarBarra(foto, nome) {
  const av = document.getElementById("barraAvatar");
  if (!av) return;
  av.replaceChildren();
  if (foto && /^(https:|data:image\/)/.test(foto)) { const i = document.createElement("img"); i.src = foto; i.alt = ""; av.appendChild(i); }
  else av.textContent = String(nome || "?").trim().split(/\s+/).map((p) => p[0] || "").slice(0, 2).join("").toUpperCase() || "?";
}
