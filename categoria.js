// =====================================================
// Páginas de classe (serviços, delivery, shopping, imóveis)
// - Topo: foto do perfil e sino com o total de notificações novas
//   (seguidores, estrelas, comentários, social, reclamações e mensagens).
// - Categorias: marca a escolhida (a vitrine.js filtra a lista).
// - Busca: o botão da lupa leva até o campo.
// =====================================================
import { fotoSegura } from "./seguranca.js?v=1";
import { definirPerfilMenu, definirBadgeMensagens } from "./menu.js?v=4";
import { buscarReclamacoes } from "./avisos-reclamacoes.js?v=15";
import "./painel-avisos.js?v=13"; // o sino abre o painel de notificações na própria página
import "./chat-gaveta.js?v=1";
import { docComValidade } from "./leituras.js?v=1"; // "Mensagens" abre as conversas por cima da página, sem sair dela

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

// ---------- topo: perfil e mensagens ----------
const iniciais = (n) => { const p = String(n || "?").trim().split(/\s+/); return ((p[0]?.[0] || "?") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase(); };
const ms = (ts) => ts?.toMillis?.() ?? 0;

// Avisos novos desde a última vez que a pessoa viu as notificações.
// Mesmas fontes da página notificacoes.html (rede.js), sem ficar ouvindo em tempo real.
// O número fica guardado no aparelho por 15 min (vale para todas as abas); ver as
// notificações zera o número guardado sem precisar ler tudo de novo.
const SINO_VALIDADE = 15 * 60000;
const chaveSino = (uid) => "hf-sino-" + uid;
function sinoGuardado(uid) {
  try { const c = JSON.parse(localStorage.getItem(chaveSino(uid)) || "null"); if (c && typeof c.n === "number" && Date.now() - c.em < SINO_VALIDADE) return c; } catch {}
  return null;
}
async function contarAvisos(fs, db, uid) {
  const guardado = sinoGuardado(uid);
  if (guardado) return guardado;
  try {
    const usuario = await fs.getDoc(fs.doc(db, "usuarios", uid));
    const visto = ms(usuario.exists() ? usuario.data().notificacoesVistasEm : null);
    const ler = (q) => fs.getDocs(fs.query(...q, fs.limit(60))).then((s) => s.docs.map((d) => d.data())).catch(() => []);
    const col = (n) => fs.collection(db, n);
    const [seg, curt, com, resp, vin, recl] = await Promise.all([
      ler([col("relacoes"), fs.where("tipo", "==", "seguir"), fs.where("alvoId", "==", uid)]),
      ler([col("curtidas"), fs.where("postAutorId", "==", uid)]),
      ler([col("comentarios"), fs.where("postAutorId", "==", uid)]),
      ler([col("comentarios"), fs.where("respostaAutorId", "==", uid)]),
      ler([col("vinculos"), fs.where("participantes", "array-contains", uid)]),
      buscarReclamacoes(fs, db, uid).catch(() => [])
    ]);
    const novo = (t) => t > visto;
    let n = seg.filter((x) => novo(ms(x.criadoEm))).length;
    n += curt.filter((x) => x.uid !== uid && Number(x.nota) > 0 && novo(Math.max(ms(x.criadoEm), ms(x.atualizadoEm)))).length;
    n += [...com, ...resp.filter((r) => r.postAutorId !== uid)].filter((x) => x.autorId !== uid && novo(ms(x.criadoEm))).length;
    n += vin.filter((v) => (v.status !== "aceito" && v.para === uid) || (v.status === "aceito" && v.de === uid && novo(ms(v.aceitoEm)))).length;
    n += recl.filter((x) => novo(x.quando)).length;
    const r = { n, visto, em: Date.now() };
    try { localStorage.setItem(chaveSino(uid), JSON.stringify(r)); } catch {}
    return r;
  } catch { return { n: 0, visto: Date.now() }; }
}

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
      $("badgeAvisos")?.closest("a")?.setAttribute("href", "login.html");
      return;
    }
    // Foto do perfil
    try {
      // Foto e nome do topo: cópia do aparelho por 10 min (mudar a foto atualiza a cópia na hora).
      const s = await docComValidade({ ...fs, db }, ["perfis_publicos", u.uid], 10 * 60000);
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
    // Sino: avisos novos (leitura única, guardada por 15 min) + mensagens que chegaram
    // depois da última vez que as notificações foram vistas (tempo real).
    // O menu "Mensagens" continua mostrando todas as conversas não lidas.
    let avisosNovos = 0, visto = Infinity, naoLidas = [];
    const pintarSino = () => {
      const n = avisosNovos + naoLidas.filter((t) => t > visto).length, b = $("badgeAvisos");
      if (b) { b.hidden = !n; b.textContent = n > 9 ? "9+" : String(n); }
      definirBadgeMensagens(naoLidas.length);
    };
    contarAvisos(fs, db, u.uid).then((r) => { avisosNovos = r.n; visto = r.visto || 0; pintarSino(); });
    addEventListener("hf:avisos-vistos", () => { avisosNovos = 0; visto = Date.now(); pintarSino(); });
    // Outra aba viu as notificações: zera aqui também.
    addEventListener("storage", (e) => { if (e.key === chaveSino(u.uid)) { const r = sinoGuardado(u.uid); if (r) { avisosNovos = r.n; visto = r.visto || 0; pintarSino(); } } });
    const q = fs.query(fs.collection(db, "conversas"), fs.where("participantes", "array-contains", u.uid), fs.limit(60));
    parar = fs.onSnapshot(q, (snap) => {
      naoLidas = snap.docs.map((d) => {
        const c = d.data({ serverTimestamps: "estimate" });
        const lido = Math.max(ms(c.lidoEm?.[u.uid]), ms(c.vistoEm?.[u.uid]), ms(c.ocultaPara?.[u.uid]));
        return c.ultimaMensagemRemetenteId && c.ultimaMensagemRemetenteId !== u.uid && ms(c.atualizadoEm) > lido ? ms(c.atualizadoEm) : 0;
      }).filter(Boolean);
      pintarSino();
    }, () => {});
  });
}
iniciarTopo();
