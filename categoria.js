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
    if (!u) return;
    // Foto do perfil
    try {
      const s = await fs.getDoc(fs.doc(db, "perfis_publicos", u.uid));
      const p = s.exists() ? s.data() : {};
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
