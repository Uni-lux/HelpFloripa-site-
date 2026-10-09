// =====================================================
// Menu lateral do Help Floripa (todas as páginas)
// - Abre no botão #btnMenu. Traz o perfil, as classes, a conta,
//   as páginas institucionais, o tema e o botão de sair.
// - O estilo vem junto (injetado uma vez), para servir em qualquer página.
// - definirPerfilMenu({ logado, nome, nick, foto }) atualiza o cabeçalho.
// =====================================================
import { fotoSegura } from "./seguranca.js?v=1";

const $ = (id) => document.getElementById(id);
const iniciais = (n) => { const p = String(n || "?").trim().split(/\s+/); return ((p[0]?.[0] || "?") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase(); };

if (!document.getElementById("hfMenuCss")) {
  const st = document.createElement("style");
  st.id = "hfMenuCss";
  st.textContent = `
/* ---------- menu lateral ---------- */
.gaveta-fundo { position: fixed; inset: 0; z-index: 1400; background: rgba(2, 6, 9, .55); opacity: 0; pointer-events: none; transition: opacity .25s; -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px); }
.gaveta {
  position: fixed; top: 0; bottom: 0; left: 0; z-index: 1401; width: min(330px, 88vw); display: flex; flex-direction: column; gap: 6px;
  padding: calc(12px + env(safe-area-inset-top)) 12px calc(16px + env(safe-area-inset-bottom)); overflow-y: auto; overscroll-behavior: contain;
  background: var(--panel); border-right: 1px solid var(--line); box-shadow: var(--shadow); transform: translateX(-104%); transition: transform .28s cubic-bezier(.2, .8, .2, 1); visibility: hidden;
}
body.gaveta-aberta { overflow: hidden; }
body.gaveta-aberta .gaveta-fundo { opacity: 1; pointer-events: auto; }
body.gaveta-aberta .gaveta { transform: none; visibility: visible; }
.gaveta-topo { display: flex; align-items: center; gap: 6px; }
.gaveta a { color: inherit; }
.gaveta .gaveta-item[aria-current="page"] { color: var(--accent); }
.gaveta .gaveta-x { width: 42px; height: 42px; border-radius: 50%; border: 0; background: transparent; display: grid; place-items: center; cursor: pointer; color: var(--text); flex-shrink: 0; }
.gaveta .gaveta-x:hover { background: var(--hover); }
.gaveta svg.i { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; flex-shrink: 0; }
.gaveta svg.i.s { width: 17px; height: 17px; }
.gaveta svg.i.xs { width: 14px; height: 14px; }
.gaveta-perfil { flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 16px; text-decoration: none; background: var(--panel-2); border: 1px solid var(--line); }
.gaveta-perfil:hover { background: var(--hover); }
.gaveta-perfil .tx { flex: 1; min-width: 0; display: grid; }
.gaveta-perfil strong { font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gaveta-perfil small { color: var(--muted); font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gaveta-perfil > svg { color: var(--muted); }
.gaveta-avatar { width: 46px; height: 46px; border-radius: 50%; overflow: hidden; flex-shrink: 0; display: grid; place-items: center; font-weight: 800; color: #fff; background: linear-gradient(135deg, #0a4a63, #00adee); box-shadow: 0 0 0 2px var(--panel), 0 0 0 4px var(--accent); }
.gaveta-avatar img { width: 100%; height: 100%; object-fit: cover; }
.gaveta-anunciar { margin: 6px 0 2px; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border-radius: 14px; background: var(--accent); color: var(--accent-ink); font-weight: 800; text-decoration: none; }
.gaveta-anunciar:hover { background: var(--accent-strong); }
.gaveta-secao { display: grid; gap: 2px; padding-top: 8px; }
.gaveta-secao h3 { margin: 6px 10px 4px; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: var(--muted); }
.gaveta-item { display: flex; align-items: center; gap: 12px; padding: 9px 10px; border-radius: 12px; text-decoration: none; font-weight: 650; font-size: 14.5px; }
.gaveta-item:hover { background: var(--hover); }
.gaveta-item[aria-current="page"] { background: color-mix(in srgb, var(--accent) 12%, transparent); color: var(--accent); }
.gaveta-item .ic { --c: var(--text); width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: color-mix(in srgb, var(--c) 12%, transparent); color: var(--c); flex-shrink: 0; }
.gaveta-item .rot { flex: 1; }
.gaveta-badge { min-width: 20px; height: 20px; padding: 0 6px; border-radius: 10px; background: #ff3b5c; color: #fff; font-size: 11px; font-weight: 800; display: grid; place-items: center; }
.gaveta-tema { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 4px; margin: 0 4px; border-radius: 14px; background: var(--panel-2); border: 1px solid var(--line); }
.gaveta-tema button { display: inline-flex; align-items: center; justify-content: center; gap: 5px; border: 0; border-radius: 10px; padding: 8px 4px; background: transparent; cursor: pointer; font-size: 12.5px; font-weight: 700; color: var(--muted); }
.gaveta-tema button[aria-pressed="true"] { background: var(--panel); color: var(--text); box-shadow: 0 1px 4px rgba(0, 0, 0, .15); }
.gaveta-rodape { margin-top: auto; padding: 14px 10px 0; display: grid; gap: 10px; border-top: 1px solid var(--line); color: var(--muted); font-size: 12px; }
.gaveta-rodape .links { display: flex; gap: 14px; }
.gaveta-rodape a { text-decoration: none; }
.gaveta-rodape a:hover { color: var(--text); }
.gaveta-sair { justify-self: start; display: inline-flex; align-items: center; gap: 8px; border: 1px solid color-mix(in srgb, var(--danger) 40%, transparent); background: transparent; color: var(--danger); border-radius: 12px; padding: 9px 14px; font-weight: 700; cursor: pointer; }
.gaveta-sair:hover { background: color-mix(in srgb, var(--danger) 10%, transparent); }
`;
  document.head.appendChild(st);
}

const ICONES_MENU = {
  casa: '<path d="M4 10.5L12 4l8 6.5V19a1.5 1.5 0 01-1.5 1.5H15v-6h-6v6H5.5A1.5 1.5 0 014 19z"/>',
  servicos: '<rect x="3.5" y="7" width="17" height="12.5" rx="2"/><path d="M9 7V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7M3.5 12.5h17"/>',
  delivery: '<path d="M3 10h18M4 10a8 8 0 0116 0M2 14h20M4 14l1 6h14l1-6"/>',
  lojinha: '<path d="M6 8h12l-1 12H7L6 8zM9 8V6a3 3 0 016 0v2"/>',
  imoveis: '<path d="M4 11.5L12 4l8 7.5M6 10v9.5h12V10M10 19.5v-5h4v5"/>',
  perfil: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.3-3.6 4.2-5.3 7.5-5.3s6.2 1.7 7.5 5.3"/>',
  chat: '<path d="M20.5 11.6c0 4.3-3.8 7.6-8.5 7.6-1.2 0-2.3-.2-3.3-.6L4 20l1.2-3.6c-1.1-1.3-1.7-3-1.7-4.8C3.5 7.4 7.3 4 12 4s8.5 3.4 8.5 7.6z"/>',
  social: '<circle cx="9" cy="9" r="3.2"/><circle cx="17" cy="10" r="2.5"/><path d="M3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5M15 15c2.6-.4 4.6.8 5.5 3.5"/>',
  maleta: '<rect x="3.5" y="7" width="17" height="12.5" rx="2"/><path d="M9 7V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7M3.5 12.5h17"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  ajuda: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 014.8.9c0 1.7-2.4 2-2.4 3.6M12 17h.01"/>',
  contato: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
  sobre: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.5h.01"/>',
  parceria: '<path d="M3 11l4-4 4 2 3-2 7 5-4 4M8 13l3 3M11 11l4 4M14 9l4 4"/>',
  empresa: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M11 21v-3h2v3"/>',
  escudo: '<path d="M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6z"/>',
  termos: '<path d="M7 3.5h7l4 4V20.5H7z"/><path d="M14 3.5v4h4M10 12h5M10 15.5h5"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
  lua: '<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>',
  auto: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17a8.5 8.5 0 000-17z" fill="currentColor"/>',
  sair: '<path d="M14 4.5h4.5a1.5 1.5 0 011.5 1.5v12a1.5 1.5 0 01-1.5 1.5H14M10 16l-4-4 4-4M6 12h9.5"/>',
  fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
  seta: '<path d="M9 5l7 7-7 7"/>',
  alerta: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.5h.01"/>',
  feed: '<rect x="4" y="4" width="16" height="7" rx="2"/><rect x="4" y="13" width="16" height="7" rx="2"/>',
  sino: '<path d="M18 9.5a6 6 0 00-12 0c0 6.5-2.5 8-2.5 8h17S18 16 18 9.5z"/><path d="M10.2 20.5a2 2 0 003.6 0"/>',
  config: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>'
};
function iconeMenu(n, cls = "i s") {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("class", cls); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true");
  s.innerHTML = ICONES_MENU[n] || "";
  return s;
}
const SECOES_MENU = [
  ["Explorar", [
    ["index.html", "casa", "Início"],
    ["servicos.html", "servicos", "Freelances", "#00adee"],
    ["delivery.html", "delivery", "Delivery", "#ff7a1a"],
    ["shopping.html", "lojinha", "Shopping", "#b066ff"],
    ["imoveis.html", "imoveis", "Imóveis", "#2fbf71"]
  ]],
  ["Minha conta", [
    ["feed.html", "feed", "Feed"],
    ["usuarios.html", "perfil", "Meu perfil"],
    ["notificacoes.html", "sino", "Notificações"],
    ["mensagens.html", "chat", "Mensagens", null, "menuBadge"],
    ["negocios.html", "maleta", "Meus negócios"],
    ["usuarios.html?aba=social", "social", "Social e conexões"],
    ["configuracoes.html", "config", "Configurações"]
  ]],
  ["Help Floripa", [
    ["profissionais.html", "servicos", "Para profissionais"],
    ["clientes.html", "perfil", "Para clientes"],
    ["socios-parcerias.html", "parceria", "Sócios e parcerias"],
    ["reclamacoes.html", "alerta", "Reclamações"],
    ["ajuda.html", "ajuda", "Ajuda"],
    ["contato.html", "contato", "Contato"],
    ["sobre.html", "sobre", "Sobre"]
  ]]
];
const perfilMenu = { nome: "", nick: "", foto: "", logado: null };
let gaveta = null;
function temaAtual() { try { return JSON.parse(localStorage.getItem("hf-chat-config") || "{}").tema || "sistema"; } catch { return "sistema"; } }
function aplicarTema(tema) {
  try { const c = JSON.parse(localStorage.getItem("hf-chat-config") || "{}"); c.tema = tema; localStorage.setItem("hf-chat-config", JSON.stringify(c)); } catch {}
  const escuro = tema === "escuro" || (tema === "sistema" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = escuro ? "dark" : "light";
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = escuro ? "#0f161b" : "#ffffff";
  gaveta?.querySelectorAll("[data-tema]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.tema === tema ? "true" : "false"));
}
function montarGaveta() {
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const fundo = el("div", "gaveta-fundo");
  const g = el("aside", "gaveta");
  g.id = "gaveta"; g.setAttribute("aria-label", "Menu"); g.setAttribute("role", "dialog"); g.setAttribute("aria-modal", "true");
  // Cabeçalho com o perfil
  const cab = el("a", "gaveta-perfil"); cab.href = "usuarios.html"; cab.id = "gavetaPerfil";
  const av = el("span", "gaveta-avatar"); av.id = "gavetaAvatar";
  const tx = el("span", "tx");
  const nome = el("strong", null, perfilMenu.nome || "Meu perfil"); nome.id = "gavetaNome";
  const nick = el("small", null, perfilMenu.nick ? "@" + perfilMenu.nick : "Ver e editar meu perfil"); nick.id = "gavetaNick";
  tx.append(nome, nick);
  cab.append(av, tx, iconeMenu("seta", "i xs"));
  const fechar = el("button", "icone-btn gaveta-x"); fechar.type = "button"; fechar.setAttribute("aria-label", "Fechar menu"); fechar.appendChild(iconeMenu("fechar", "i"));
  const topo = el("div", "gaveta-topo"); topo.append(cab, fechar);
  g.appendChild(topo);
  // Botão de anunciar
  const anunciar = el("a", "gaveta-anunciar"); anunciar.href = "negocios.html";
  anunciar.append(iconeMenu("mais"), document.createTextNode("Anunciar no Help Floripa"));
  g.appendChild(anunciar);
  const aqui = location.pathname.split("/").pop() || "index.html";
  SECOES_MENU.forEach(([titulo, itens]) => {
    const sec = el("nav", "gaveta-secao"); sec.setAttribute("aria-label", titulo);
    sec.appendChild(el("h3", null, titulo));
    itens.forEach(([href, ic, rot, cor, badge]) => {
      const a = el("a", "gaveta-item"); a.href = href;
      if (href === aqui) a.setAttribute("aria-current", "page");
      const i = el("span", "ic"); if (cor) i.style.setProperty("--c", cor); i.appendChild(iconeMenu(ic));
      a.append(i, el("span", "rot", rot));
      if (badge) { const b = el("b", "gaveta-badge"); b.id = badge; b.hidden = true; a.appendChild(b); }
      sec.appendChild(a);
    });
    g.appendChild(sec);
  });
  // Tema
  const tsec = el("div", "gaveta-secao"); tsec.appendChild(el("h3", null, "Aparência"));
  const seg = el("div", "gaveta-tema"); seg.setAttribute("role", "group"); seg.setAttribute("aria-label", "Tema");
  [["claro", "sol", "Claro"], ["escuro", "lua", "Escuro"], ["sistema", "auto", "Automático"]].forEach(([v, ic, r]) => {
    const b = el("button"); b.type = "button"; b.dataset.tema = v; b.append(iconeMenu(ic, "i xs"), document.createTextNode(r));
    b.addEventListener("click", () => aplicarTema(v));
    seg.appendChild(b);
  });
  tsec.appendChild(seg);
  g.appendChild(tsec);
  // Rodapé
  const rod = el("div", "gaveta-rodape");
  const links = el("div", "links");
  [["termos.html", "Termos de Uso"], ["privacidade.html", "Privacidade"]].forEach(([h, r]) => { const a = el("a", null, r); a.href = h; links.appendChild(a); });
  const sair = el("button", "gaveta-sair"); sair.type = "button"; sair.id = "gavetaSair"; sair.append(iconeMenu("sair"), document.createTextNode("Sair da conta"));
  sair.addEventListener("click", async () => {
    if (!confirm("Sair da sua conta?")) return;
    try { const { signOut } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"); await signOut(window.firebaseAuth); } catch {}
    location.href = "login.html";
  });
  rod.append(sair, links, el("small", null, "© 2025 Help Floripa · CNPJ 61.935.934/0001-00"));
  g.appendChild(rod);
  document.body.append(fundo, g);
  fundo.addEventListener("click", fecharGaveta);
  fechar.addEventListener("click", fecharGaveta);
  g.addEventListener("keydown", (e) => { if (e.key === "Escape") fecharGaveta(); });
  gaveta = g;
  pintarPerfilMenu();
  aplicarTema(temaAtual());
  atualizarBadgeMenu();
}
// Páginas que não informam o perfil (ex.: mensagens): o menu busca sozinho.
async function carregarPerfilSozinho() {
  if (perfilMenu.logado !== null || !window.firebaseAuth) return;
  const u = window.firebaseAuth.currentUser;
  if (!u) { definirPerfilMenu({ logado: false }); return; }
  try {
    const fs = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const s = await fs.getDoc(fs.doc(window.firebaseDb, "perfis_publicos", u.uid));
    const p = s.exists() ? s.data() : {};
    definirPerfilMenu({ logado: true, nome: p.nome || u.displayName || "", nick: p.nickname || "", foto: p.fotoPerfil || u.photoURL || "" });
  } catch { definirPerfilMenu({ logado: true, nome: u.displayName || "" }); }
}
function abrirGaveta() {
  if (!gaveta) montarGaveta();
  carregarPerfilSozinho();
  document.body.classList.add("gaveta-aberta");
  $("btnMenu")?.setAttribute("aria-expanded", "true");
  setTimeout(() => gaveta.querySelector(".gaveta-x")?.focus(), 50);
}
function fecharGaveta() {
  document.body.classList.remove("gaveta-aberta");
  $("btnMenu")?.setAttribute("aria-expanded", "false");
  $("btnMenu")?.focus();
}
function pintarPerfilMenu() {
  const av = $("gavetaAvatar");
  if (!av) return;
  av.replaceChildren();
  const url = fotoSegura(perfilMenu.foto);
  if (url) { const img = document.createElement("img"); img.src = url; img.alt = ""; av.appendChild(img); }
  else av.textContent = iniciais(perfilMenu.nome);
  const visitante = perfilMenu.logado === false;
  $("gavetaPerfil").href = visitante ? "login.html" : "usuarios.html";
  $("gavetaNome").textContent = visitante ? "Entrar ou criar conta" : perfilMenu.nome || "Meu perfil";
  $("gavetaNick").textContent = visitante ? "Para anunciar, conversar e avaliar" : perfilMenu.nick ? "@" + perfilMenu.nick : "Ver e editar meu perfil";
  $("gavetaSair").hidden = visitante;
}
// Contador de mensagens não lidas no item "Mensagens" do menu.
let naoLidas = 0;
function atualizarBadgeMenu() {
  // Item "Mensagens" do menu e atalho "Mensagens" da página inicial
  [$("menuBadge"), $("atalhoBadgeMensagens")].forEach((b) => {
    if (!b) return;
    b.hidden = !naoLidas;
    b.textContent = naoLidas > 9 ? "9+" : String(naoLidas);
  });
}
export function definirBadgeMensagens(n) { naoLidas = n; atualizarBadgeMenu(); }
$("btnMenu")?.addEventListener("click", abrirGaveta);
// Chamado pelo topo quando o perfil carrega.
export function definirPerfilMenu(p) { Object.assign(perfilMenu, p); pintarPerfilMenu(); }
