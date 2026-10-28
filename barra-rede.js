// =====================================================
// Barra de baixo da rede (Diário, Explorar, Comunidade, Mensagens, Perfil). Sem dependências: o rede.js usa este
// módulo e a página da Comunidade também (sem carregar o rede.js). Estilo próprio, injetado só quando a página não
// tem o rede.css (que já traz o mesmo estilo).
// =====================================================
export const ITENS_BARRA = [
  ["diario", "feed.html", "feed", "Diário"],
  ["explorar", "feed.html?aba=explorar", "bussola", "Explorar"],
  ["comunidade", "comunidade.html", "comunidade", "Comunidade"],
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
body.com-barra { padding-bottom: calc(74px + env(safe-area-inset-bottom)); }
.barra-rede { position: fixed; left: 50%; bottom: calc(10px + env(safe-area-inset-bottom)); transform: translateX(-50%); z-index: 1100;
  width: min(460px, calc(100% - 20px)); display: grid; grid-template-columns: repeat(5, 1fr); align-items: center; padding: 6px;
  border-radius: 22px; background: color-mix(in srgb, var(--panel, #0f161b) 90%, transparent); border: 1px solid var(--line, rgba(255,255,255,.1));
  box-shadow: 0 12px 30px rgba(0,0,0,.25); -webkit-backdrop-filter: saturate(1.4) blur(16px); backdrop-filter: saturate(1.4) blur(16px); }
.barra-rede a { position: relative; display: grid; justify-items: center; gap: 2px; padding: 6px 2px; border-radius: 16px;
  color: var(--muted, #8fa0ab); text-decoration: none; font-size: 10.5px; font-weight: 700; }
.barra-rede a:hover { color: var(--text, #fff); background: var(--hover, rgba(255,255,255,.06)); }
.barra-rede [aria-current="page"] { color: var(--accent, #00adee); }
.barra-rede .bi { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.barra-rede .mini-av { width: 24px; height: 24px; border-radius: 50%; overflow: hidden; display: grid; place-items: center; font-size: 9px; font-weight: 800; color: #fff; background: linear-gradient(135deg, #0a4a63, #00adee); }
.barra-rede .mini-av img { width: 100%; height: 100%; object-fit: cover; }
.barra-rede [aria-current="page"] .mini-av { box-shadow: 0 0 0 2px var(--accent, #00adee); }
.barra-rede .ponto-badge { position: absolute; top: 0; right: calc(50% - 22px); }`;
function estilo() {
  if (document.getElementById("hf-barra-css") || document.querySelector('link[href*="rede.c' + 'ss"]')) return;
  const s = document.createElement("style"); s.id = "hf-barra-css"; s.textContent = CSS; document.head.appendChild(s);
}
const svg = (k) => `<svg class="i bi" viewBox="0 0 24 24" aria-hidden="true">${ICONES[k]}</svg>`;

// Monta a barra (uma vez por página). ativo = "diario" | "explorar" | "comunidade" | "mensagens" | "perfil" | "".
export function montarBarra(ativo) {
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
  return nav;
}
// Marca o item da página atual (o Diário troca entre Diário e Explorar sem recarregar).
export function marcarBarra(ativo) {
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
