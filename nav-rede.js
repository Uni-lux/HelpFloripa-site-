// =====================================================
// Navegação da rede, igual em todas as páginas (Diário, Explorar, Mensagens, Perfil, Social...).
// - Barra inferior: Diário · Explorar · Publicar · Mensagens · Perfil.
// - Abas do perfil: Publicações · Social · Avaliações (perfil e Social parecem uma página só).
// - Links de perfil pelo @usuário (helpfloripa.com.br/@nome).
// Não depende do Firebase nem do rede.js: a página de mensagens também usa.
// =====================================================
import { fotoSegura } from "./seguranca.js?v=1";

const ICONES = {
  diario: '<rect x="4" y="4" width="16" height="7" rx="2"/><rect x="4" y="13" width="16" height="7" rx="2"/>',
  explorar: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  mais: '<path d="M12 5.5v13M5.5 12h13"/>',
  mensagens: '<path d="M20.5 11.6c0 4.3-3.8 7.6-8.5 7.6-1.2 0-2.3-.2-3.3-.6L4 20l1.2-3.6c-1.1-1.3-1.7-3-1.7-4.8C3.5 7.4 7.3 4 12 4s8.5 3.4 8.5 7.6z"/>',
  grade: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
  teia: '<circle cx="12" cy="12" r="2.6"/><circle cx="5" cy="6" r="1.8"/><circle cx="19" cy="6" r="1.8"/><circle cx="5" cy="18" r="1.8"/><circle cx="19" cy="18" r="1.8"/><path d="M9.8 10.6L6.5 7.2M14.2 10.6l3.3-3.4M9.8 13.4l-3.3 3.4M14.2 13.4l3.3 3.4"/>',
  estrela: '<path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8z"/>',
  cadeado: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V7.5a3.5 3.5 0 017 0v3"/>'
};
function svg(nome) {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true");
  s.innerHTML = ICONES[nome] || "";
  return s;
}
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const iniciais = (n) => { const p = String(n || "?").trim().split(/\s+/).filter(Boolean); return ((p[0]?.[0] || "?") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase(); };

const CSS = `
body.com-barra { padding-bottom: calc(88px + env(safe-area-inset-bottom)); }
.barra-rede { position: fixed; left: 50%; bottom: calc(10px + env(safe-area-inset-bottom)); transform: translateX(-50%); z-index: 1100;
  width: min(440px, calc(100% - 20px)); display: grid; grid-template-columns: repeat(5, 1fr); align-items: center; gap: 2px; padding: 6px;
  border-radius: 24px; background: color-mix(in srgb, var(--panel, #0f161b) 88%, transparent); border: 1px solid var(--line, #213038);
  box-shadow: 0 12px 40px rgba(0, 0, 0, .32); -webkit-backdrop-filter: saturate(1.4) blur(16px); backdrop-filter: saturate(1.4) blur(16px);
  font-family: var(--font, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif); box-sizing: border-box; }
.barra-rede.embutida { position: relative; left: auto; bottom: auto; transform: none; width: auto; flex-shrink: 0; z-index: 2;
  margin: 6px 10px calc(10px + env(safe-area-inset-bottom)); box-shadow: 0 6px 24px rgba(0, 0, 0, .18); }
.barra-rede a, .barra-rede button { position: relative; display: grid; justify-items: center; align-content: center; gap: 3px; min-height: 52px; padding: 4px 2px;
  border: 0; background: none; border-radius: 17px; color: var(--muted, #8c9ca7); text-decoration: none; font: inherit; font-size: 10.5px; font-weight: 700;
  letter-spacing: .1px; cursor: pointer; -webkit-tap-highlight-color: transparent; transition: color .15s, background .15s; }
.barra-rede svg { width: 23px; height: 23px; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }
@media (hover: hover) { .barra-rede a:hover, .barra-rede button:not(.publicar):hover { color: var(--text, #eaf0f3); background: var(--hover, rgba(127, 127, 127, .12)); } }
.barra-rede a:focus-visible, .barra-rede button:focus-visible { outline: 2px solid var(--accent, #00adee); outline-offset: 1px; }
.barra-rede [aria-current="page"] { color: var(--accent, #00adee); background: color-mix(in srgb, var(--accent, #00adee) 11%, transparent); }
.barra-rede .publicar .bola { width: 46px; height: 46px; border-radius: 16px; display: grid; place-items: center; color: #fff;
  background: linear-gradient(135deg, #00adee, #0077a8); box-shadow: 0 8px 22px rgba(0, 173, 238, .38); transition: transform .15s, box-shadow .15s; }
.barra-rede .publicar .bola svg { width: 24px; height: 24px; stroke-width: 2.4; }
@media (hover: hover) { .barra-rede .publicar:hover .bola { transform: translateY(-1px) scale(1.04); box-shadow: 0 10px 26px rgba(0, 173, 238, .48); } }
.barra-rede .publicar:active .bola { transform: scale(.95); }
.barra-rede .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.barra-rede .ponto-badge { position: absolute; top: 3px; right: calc(50% - 21px); min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: #ff3b5c;
  color: #fff; font-size: 10.5px; font-weight: 800; display: grid; place-items: center; box-shadow: 0 0 0 2px var(--panel, #0f161b); line-height: 1; }
.barra-rede .ponto-badge[hidden] { display: none; }
.barra-rede .mini-av { width: 25px; height: 25px; border-radius: 50%; overflow: hidden; display: grid; place-items: center; font-size: 9px; font-weight: 800; color: #fff;
  background: linear-gradient(135deg, #0a4a63, #00adee); box-shadow: 0 0 0 1.5px var(--line, #213038); }
.barra-rede .mini-av img { width: 100%; height: 100%; object-fit: cover; display: block; }
.barra-rede [aria-current="page"] .mini-av { box-shadow: 0 0 0 2px var(--accent, #00adee); }

.abas-perfil { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; margin: 14px 0 12px; padding: 4px; gap: 4px; border-radius: 16px;
  background: var(--panel, #0f161b); border: 1px solid var(--line, #213038); }
.abas-perfil a, .abas-perfil button { display: flex; align-items: center; justify-content: center; gap: 7px; min-height: 42px; padding: 0 8px; border: 0; border-radius: 12px;
  background: none; color: var(--muted, #8c9ca7); font: inherit; font-size: 14px; font-weight: 750; text-decoration: none; cursor: pointer; white-space: nowrap;
  -webkit-tap-highlight-color: transparent; transition: color .15s, background .15s; }
.abas-perfil svg { width: 18px; height: 18px; flex-shrink: 0; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }
.abas-perfil svg.cad { width: 13px; height: 13px; opacity: .8; }
@media (hover: hover) { .abas-perfil a:hover, .abas-perfil button:hover { color: var(--text, #eaf0f3); background: var(--hover, rgba(127, 127, 127, .12)); } }
.abas-perfil [aria-current="page"] { color: var(--accent-ink, #001a24); background: var(--accent, #00adee); box-shadow: 0 6px 16px rgba(0, 173, 238, .28); }
@media (max-width: 380px) { .abas-perfil a, .abas-perfil button { font-size: 13px; gap: 5px; } .abas-perfil svg:not(.cad) { display: none; } }
`;
function estilo() {
  if (document.getElementById("hfNavCss")) return;
  const s = document.createElement("style");
  s.id = "hfNavCss";
  s.textContent = CSS;
  document.head.appendChild(s);
}

// ---------- links de perfil ----------
const NICK_RE = /^[a-z0-9._]{3,20}$/;
// Pasta do site (para funcionar também fora da raiz).
const base = () => location.origin + location.pathname.replace(/[^/]*$/, "");
// Link dentro do site: pelo @ quando a pessoa tem, senão pelo código da conta.
export function linkPerfil(uid, nick) {
  if (nick && NICK_RE.test(nick)) return `usuarios.html?u=${encodeURIComponent(nick)}`;
  return uid ? `usuarios.html?perfil=${encodeURIComponent(uid)}` : "usuarios.html";
}
// Link para compartilhar (WhatsApp, Instagram, cartão): helpfloripa.com.br/@nome
export function linkPublicoPerfil(uid, nick) {
  if (nick && NICK_RE.test(nick)) return `${base()}@${nick}`;
  return `${base()}usuarios.html?perfil=${encodeURIComponent(uid)}`;
}
export function linkSocial(uid, proprio) {
  return proprio ? "social.html" : `social.html?uid=${encodeURIComponent(uid)}`;
}

// ---------- barra inferior ----------
// ativo: diario | explorar | mensagens | perfil | "" (nenhum)
// aoPublicar: abre o compositor na própria página; sem ele, vai para o diário já com o compositor aberto.
// dentro: elemento onde a barra fica (fixa na tela quando não informado).
export function montarNav({ ativo = "", aoPublicar = null, dentro = null } = {}) {
  estilo();
  let nav = document.getElementById("barraRede");
  if (nav) { marcarNav(ativo); return nav; }
  nav = el("nav", "barra-rede" + (dentro ? " embutida" : ""));
  nav.id = "barraRede";
  nav.setAttribute("aria-label", "Navegação da rede");
  const item = (k, href, rot) => {
    const a = el("a"); a.href = href; a.dataset.nav = k;
    if (k === "perfil") { const av = el("span", "mini-av"); av.id = "barraAvatar"; av.textContent = "?"; a.append(av, el("span", null, rot)); }
    else a.append(svg(k), el("span", null, rot));
    if (k === "mensagens") { const bd = el("b", "ponto-badge"); bd.id = "badgeMensagens"; bd.hidden = true; a.appendChild(bd); }
    return a;
  };
  const pub = el("button", "publicar"); pub.type = "button"; pub.dataset.nav = "publicar";
  pub.setAttribute("aria-label", "Nova publicação"); pub.title = "Nova publicação";
  const bola = el("span", "bola"); bola.appendChild(svg("mais"));
  pub.append(bola, el("span", "sr", "Publicar"));
  pub.addEventListener("click", () => { if (aoPublicar) aoPublicar(); else location.href = "feed.html?publicar=1"; });
  nav.append(item("diario", "feed.html", "Diário"), item("explorar", "feed.html?aba=explorar", "Explorar"), pub,
    item("mensagens", "mensagens.html", "Mensagens"), item("perfil", "usuarios.html", "Perfil"));
  if (dentro) dentro.appendChild(nav);
  else { document.body.appendChild(nav); document.body.classList.add("com-barra"); }
  marcarNav(ativo);
  return nav;
}
export function marcarNav(ativo) {
  document.querySelectorAll("#barraRede [data-nav]").forEach((a) => {
    if (a.dataset.nav === ativo) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
}
export function pintarAvatarNav(foto, nome) {
  const av = document.getElementById("barraAvatar");
  if (!av) return;
  av.replaceChildren();
  const u = fotoSegura(foto);
  if (u) { const i = document.createElement("img"); i.src = u; i.alt = ""; i.onerror = () => { av.textContent = iniciais(nome); }; av.appendChild(i); }
  else av.textContent = iniciais(nome);
}
export function badgeNav(n) {
  const b = document.getElementById("badgeMensagens");
  if (!b) return;
  b.hidden = !n;
  b.textContent = n > 99 ? "99+" : String(n || "");
}

// ---------- abas do perfil ----------
// ativa: publicacoes | social
// social: false quando o dono escondeu o social dos visitantes; restrito: mostra o cadeado.
// aoAvaliacoes: abre as avaliações na própria página; sem ele, o link leva ao perfil e abre lá.
export function abasPerfil({ uid, nick, proprio, ativa, social = true, restrito = false, aoAvaliacoes = null }) {
  estilo();
  const nav = el("nav", "abas-perfil");
  nav.setAttribute("aria-label", "Seções do perfil");
  const perfil = proprio ? "usuarios.html" : linkPerfil(uid, nick);
  const aba = (k, href, ic, rot) => {
    const a = el("a"); a.href = href; a.dataset.aba = k;
    a.append(svg(ic), el("span", null, rot));
    if (k === ativa) a.setAttribute("aria-current", "page");
    return a;
  };
  nav.appendChild(aba("publicacoes", perfil, "grade", "Publicações"));
  if (social) {
    const s = aba("social", linkSocial(uid, proprio), "teia", "Social");
    if (restrito) { const c = svg("cadeado"); c.setAttribute("class", "cad"); s.appendChild(c); s.title = "Social com privacidade"; }
    nav.appendChild(s);
  }
  if (aoAvaliacoes) {
    const b = el("button"); b.type = "button"; b.dataset.aba = "avaliacoes";
    b.append(svg("estrela"), el("span", null, "Avaliações"));
    b.addEventListener("click", aoAvaliacoes);
    nav.appendChild(b);
  } else {
    nav.appendChild(aba("avaliacoes", perfil + (perfil.includes("?") ? "&" : "?") + "ver=avaliacoes", "estrela", "Avaliações"));
  }
  return nav;
}
