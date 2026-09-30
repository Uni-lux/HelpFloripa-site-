// =====================================================
// Páginas de classe (serviços, delivery, shopping, imóveis)
// - Topo: foto do perfil e contador de mensagens não lidas.
// - Categorias: marca a escolhida (a vitrine.js filtra a lista).
// - Busca: o botão da lupa leva até o campo.
// =====================================================
import { fotoSegura } from "./seguranca.js?v=1";

const $ = (id) => document.getElementById(id);

// ---------- categorias ----------
const chips = $("filterChips");
chips?.addEventListener("click", (e) => {
  const c = e.target.closest(".chip");
  if (!c) return;
  chips.querySelectorAll(".chip").forEach((x) => {
    x.classList.toggle("active", x === c);
    x.setAttribute("aria-pressed", x === c ? "true" : "false");
  });
  c.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
});

// ---------- busca ----------
$("searchForm")?.addEventListener("submit", (e) => e.preventDefault());
$("btnBusca")?.addEventListener("click", () => {
  const i = $("searchInput");
  i?.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => i?.focus({ preventScroll: true }), 250);
});

// ---------- topo: perfil e mensagens ----------
const iniciais = (n) => { const p = String(n || "?").trim().split(/\s+/); return ((p[0]?.[0] || "?") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase(); };
const ms = (ts) => ts?.toMillis?.() ?? 0;

async function iniciarTopo() {
  for (let i = 0; i < 100 && (!window.firebaseAuth || !window.firebaseDb); i++) await new Promise((r) => setTimeout(r, 50));
  if (!window.firebaseAuth) return;
  const [auth, fs] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
  ]);
  const db = window.firebaseDb;
  let parar = null;
  auth.onAuthStateChanged(window.firebaseAuth, async (u) => {
    parar?.(); parar = null;
    if (!u) {
      // Visitante (páginas públicas): o topo e o menu levam para o login.
      definirPerfilMenu({ logado: false });
      const link = $("topoAvatar")?.closest("a");
      if (link) { link.href = "login.html"; link.setAttribute("aria-label", "Entrar"); }
      $("badgeMensagens")?.closest("a")?.setAttribute("href", "login.html");
      return;
    }
    // Foto do perfil
    try {
      const s = await fs.getDoc(fs.doc(db, "perfis_publicos", u.uid));
      const p = s.exists() ? s.data() : {};
      definirPerfilMenu({ logado: true, nome: p.nome || u.displayName || "", nick: p.nickname || p.nick || "", foto: p.fotoPerfil || u.photoURL || "" });
      const av = $("topoAvatar");
      if (av) {
        const url = fotoSegura(p.fotoPerfil || u.photoURL);
        av.replaceChildren();
        if (url) { const img = document.createElement("img"); img.src = url; img.alt = ""; img.onerror = () => { av.textContent = iniciais(p.nome || u.displayName); }; av.appendChild(img); }
        else av.textContent = iniciais(p.nome || u.displayName || u.email);
      }
    } catch {}
    // Mensagens não lidas (mesma conta da página de mensagens)
    const q = fs.query(fs.collection(db, "conversas"), fs.where("participantes", "array-contains", u.uid), fs.limit(60));
    parar = fs.onSnapshot(q, (snap) => {
      const n = snap.docs.filter((d) => {
        const c = d.data({ serverTimestamps: "estimate" });
        const lido = Math.max(ms(c.lidoEm?.[u.uid]), ms(c.vistoEm?.[u.uid]), ms(c.ocultaPara?.[u.uid]));
        return !!c.ultimaMensagemRemetenteId && c.ultimaMensagemRemetenteId !== u.uid && ms(c.atualizadoEm) > lido;
      }).length;
      const b = $("badgeMensagens");
      if (b) { b.hidden = !n; b.textContent = n > 9 ? "9+" : String(n); }
    }, () => {});
  });
}
iniciarTopo();

// =====================================================
// Menu lateral (todas as páginas do marketplace)
// =====================================================
const ICONES_MENU = {
  casa: '<path d="M4 10.5L12 4l8 6.5V19a1.5 1.5 0 01-1.5 1.5H15v-6h-6v6H5.5A1.5 1.5 0 014 19z"/>',
  servicos: '<path d="M14.7 6.3a4 4 0 01-5.4 5.4l-6 6a1.5 1.5 0 002.1 2.1l6-6a4 4 0 015.4-5.4l-2.6 2.6-2-2z"/>',
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
  alerta: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.5h.01"/>'
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
    ["servicos.html", "servicos", "Serviços", "#00adee"],
    ["delivery.html", "delivery", "Delivery", "#ff7a1a"],
    ["shopping.html", "lojinha", "Shopping", "#b066ff"],
    ["imoveis.html", "imoveis", "Imóveis", "#2fbf71"]
  ]],
  ["Minha conta", [
    ["usuarios.html", "perfil", "Meu perfil"],
    ["mensagens.html", "chat", "Mensagens", null, "menuBadge"],
    ["social.html", "social", "Social e conexões"]
  ]],
  ["Help Floripa", [
    ["profissionais.html", "servicos", "Para profissionais"],
    ["clientes.html", "perfil", "Para clientes"],
    ["socios-parcerias.html", "parceria", "Sócios e parcerias"],
    ["cadastro-empresa.html", "empresa", "Cadastrar empresa / MEI"],
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
  const anunciar = el("a", "gaveta-anunciar"); anunciar.href = "usuarios.html?acao=negocio";
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
function abrirGaveta() {
  if (!gaveta) montarGaveta();
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
function atualizarBadgeMenu() {
  const b = $("menuBadge"), t = $("badgeMensagens");
  if (!b || !t) return;
  if (b.hidden !== t.hidden) b.hidden = t.hidden;
  if (b.textContent !== t.textContent) b.textContent = t.textContent;
}
$("btnMenu")?.addEventListener("click", abrirGaveta);
// O menu copia o contador de mensagens do topo.
const badgeTopo = $("badgeMensagens");
if (badgeTopo) new MutationObserver(atualizarBadgeMenu).observe(badgeTopo, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
// Chamado pelo topo quando o perfil carrega.
export function definirPerfilMenu(p) { Object.assign(perfilMenu, p); pintarPerfilMenu(); }
