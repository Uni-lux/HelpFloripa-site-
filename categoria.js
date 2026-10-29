// =====================================================
// Páginas de classe (serviços, delivery, shopping, imóveis)
// - Topo: foto do perfil e sino com o total de notificações novas
//   (seguidores, estrelas, comentários, social, reclamações e mensagens).
// - Categorias: marca a escolhida (a vitrine.js filtra a lista).
// - Busca: o botão da lupa leva até o campo.
// =====================================================
import { fotoSegura } from "./seguranca.js?v=1";
import { definirPerfilMenu, definirBadgeMensagens } from "./menu.js?v=17";
import { buscarReclamacoes } from "./avisos-reclamacoes.js?v=17";
import { avisoPlano } from "./planos-base.js?v=15";
import { ouvirItensEquipe } from "./avisos-equipe.js?v=1";
import { enquetesEncerradas } from "./enquetes.js?v=5";
import "./painel-avisos.js?v=40"; // o sino abre o painel de notificações na própria página
import "./chat-gaveta.js?v=2";
import { docComValidade } from "./leituras.js?v=3"; // "Mensagens" abre as conversas por cima da página, sem sair dela

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
    const [seg, curt, com, resp, vin, recl, reac, marc, repub] = await Promise.all([
      ler([col("relacoes"), fs.where("tipo", "==", "seguir"), fs.where("alvoId", "==", uid)]),
      ler([col("curtidas"), fs.where("postAutorId", "==", uid)]),
      ler([col("comentarios"), fs.where("postAutorId", "==", uid)]),
      ler([col("comentarios"), fs.where("respostaAutorId", "==", uid)]),
      ler([col("vinculos"), fs.where("participantes", "array-contains", uid)]),
      buscarReclamacoes(fs, db, uid).catch(() => []),
      ler([col("curtidas_comentarios"), fs.where("comentarioAutorId", "==", uid)]),
      ler([col("diario"), fs.where("marcados", "array-contains", uid)]),
      ler([col("republicacoes"), fs.where("postAutorId", "==", uid)])
    ]);
    const novo = (t) => t > visto;
    // Preferências de notificação (usuarios.prefNotif): categoria desligada não conta.
    const prefs = (usuario.exists() ? usuario.data().prefNotif : null) || {};
    const on = (c) => prefs[c] !== false;
    let n = 0;
    if (on("seguidores")) n += seg.filter((x) => novo(ms(x.criadoEm))).length;
    if (on("publicacoes")) {
      n += curt.filter((x) => x.uid !== uid && Number(x.nota) > 0 && novo(Math.max(ms(x.criadoEm), ms(x.atualizadoEm)))).length;
      n += [...com, ...resp.filter((r) => r.postAutorId !== uid)].filter((x) => x.autorId !== uid && novo(ms(x.criadoEm))).length;
      n += reac.filter((x) => x.uid !== uid && novo(ms(x.criadoEm))).length;
      n += marc.filter((x) => x.autorId !== uid && novo(ms(x.criadoEm)) && (x.agendadoPara?.toMillis?.() ?? 0) <= Date.now()).length;
      n += repub.filter((x) => x.uid !== uid && novo(ms(x.criadoEm))).length;
    }
    if (on("social")) n += vin.filter((v) => (v.status !== "aceito" && v.para === uid) || (v.status === "aceito" && v.de === uid && novo(ms(v.aceitoEm)))).length;
    if (on("negocios")) {
      n += recl.filter((x) => novo(x.quando)).length;
      const plano = await avisoPlano({ ...fs, db }, uid).catch(() => null);
      if (plano && novo(plano.quando)) n++;
    }
    if (on("enquetes")) {
      n += (await ler([col("caixa_respostas"), fs.where("autorId", "==", uid)])).filter((x) => novo(ms(x.criadoEm))).length;
      n += (await enquetesEncerradas(fs, db, uid, usuario.exists() ? usuario.data() : {}).catch(() => [])).filter((x) => novo(x.quando)).length;
    }
    const r = { n, visto, msgs: on("mensagens"), em: Date.now() };
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
  let parar = null, pararEquipe = null;
  auth.onAuthStateChanged(window.firebaseAuth, async (u) => {
    parar?.(); parar = null; pararEquipe?.(); pararEquipe = null;
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
    // Suporte Help Floripa: avisos da equipe e respostas do suporte ainda não abertos contam
    // no sino (se chegaram depois da última vez que viu as notificações) e em Mensagens.
    let avisosNovos = 0, visto = Infinity, naoLidas = [], equipe = [], msgsNoSino = true;
    const pintarSino = () => {
      const eqNaoLidas = equipe.filter((i) => i.naoLida);
      const n = avisosNovos + (msgsNoSino ? naoLidas.filter((t) => t > visto).length : 0) + eqNaoLidas.filter((i) => i.quando > visto).length, b = $("badgeAvisos");
      if (b) { b.hidden = !n; b.textContent = n > 9 ? "9+" : String(n); }
      definirBadgeMensagens(naoLidas.length + eqNaoLidas.length);
    };
    pararEquipe?.(); pararEquipe = ouvirItensEquipe(fs, db, u.uid, (itens) => { equipe = itens; pintarSino(); });
    const recontar = () => contarAvisos(fs, db, u.uid).then((r) => { avisosNovos = r.n; visto = r.visto || 0; msgsNoSino = r.msgs !== false; pintarSino(); });
    recontar();
    // Preferências de notificação mudaram: conta de novo (o número guardado já foi apagado).
    addEventListener("hf:prefs-notif", recontar);
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

// ---------- abas das páginas institucionais (.nav-inst) ----------
// A aba da página atual aparece na tela (no meio, se der) e as bordas esmaecem quando há mais abas para os lados.
(function abasInstitucionais() {
  const barra = document.querySelector(".nav-inst");
  if (!barra) return;
  // As abas rolam numa fileira por dentro; a barra fica parada, com o fundo sólido (o esmaecido não deixa a página aparecer).
  const nav = document.createElement("div"); nav.className = "nav-inst-trilho";
  nav.append(...barra.childNodes);
  barra.appendChild(nav); barra.classList.add("pronto");
  const bordas = () => {
    nav.classList.toggle("tem-esq", nav.scrollLeft > 4);
    nav.classList.toggle("tem-dir", nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 4);
  };
  const atual = nav.querySelector('[aria-current="page"]');
  if (atual) { nav.style.scrollBehavior = "auto"; nav.scrollLeft = Math.max(0, atual.offsetLeft - (nav.clientWidth - atual.offsetWidth) / 2); nav.style.scrollBehavior = ""; }
  bordas();
  nav.addEventListener("scroll", bordas, { passive: true });
  addEventListener("resize", bordas);
})();
