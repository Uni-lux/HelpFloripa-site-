// =====================================================
// Painel do administrador (admin.html)
// Só entra quem tem o documento admins/{uid} (criado à mão no console do
// Firebase). As regras do Firestore conferem isso em cada leitura e ação.
// =====================================================
import { C, D, $, h, ms, toast } from "./admin-base.js?v=2";
import * as S from "./admin-secoes.js?v=2";

const SECOES = {
  visao: S.visao, estatisticas: S.estatisticas, relatorios: S.relatorios, usuarios: S.usuarios, verificacoes: S.verificacoes,
  suporte: S.suporte, denuncias: S.denuncias, reclamacoes: S.reclamacoes, sancoes: S.sancoes, negocios: S.negocios,
  parcerias: S.parcerias, comunicados: S.comunicados, registro: S.registro, equipe: S.equipe
};
let atual = "visao";

function irPara(sec, termo = "") {
  let filtro = "";
  if (sec.includes(":")) [sec, filtro] = sec.split(":");
  if (!SECOES[sec]) sec = "visao";
  atual = sec;
  document.querySelectorAll(".ad-nav").forEach((b) => { if (b.dataset.secao === sec) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  const el = $("principal"); el.replaceChildren();
  try {
    if (sec === "usuarios" && filtro) { const chip = filtro; SECOES.usuarios(el, termo); el.querySelector(`.ad-chip:nth-child(${["todos", "novos", "ativos", "inativos", "negocio", "verificados", "desativado", "exclusao", "sancao"].indexOf(chip) + 1})`)?.click(); }
    else SECOES[sec](el, termo);
  } catch (e) { console.error(e); el.appendChild(h("div", "ad-vazio", "Não foi possível montar esta seção: " + e.message)); }
  history.replaceState(null, "", `admin.html#${sec}`);
  $("lateral").classList.remove("aberta");
  el.focus({ preventScroll: true }); window.scrollTo({ top: 0 });
}

function contadores() {
  const pend = (n) => (n ? String(n) : "");
  const set = (k, v) => { const e = document.querySelector(`[data-cont="${k}"]`); if (e) { e.textContent = v; e.hidden = !v; } };
  set("usuarios", D.pessoas.size ? String(D.pessoas.size) : "");
  set("verificacoes", pend([...D.pessoas.values()].filter((p) => p.solicitacaoVerificacao && !p.verificado).length));
  set("suporte", pend(D.suporte.filter((s) => s.status === "aberto").length));
  set("denuncias", pend(D.denuncias.filter((d) => d.status === "nova").length));
  set("reclamacoes", pend(D.queixas.filter((q) => q.status === "aberta" && !q.resposta && ms(q.abertaEm) < Date.now() - 7 * 864e5).length));
  set("sancoes", pend([...D.sancoes.values()].filter((s) => s.tipo === "banimento" || ms(s.ate) > Date.now()).length));
  set("parcerias", pend(D.parcerias.filter((p) => (p.status || "novo") === "novo").length));
}

// Carrega tudo o que o painel usa. Em sites maiores, o relatório diário (estatisticas/) evita recalcular.
async function carregar(mostrar = true) {
  const { fb } = C;
  const col = (n) => fb.collection(fb.db, n);
  const todos = (q) => fb.getDocs(q).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }))).catch((e) => { console.warn("Painel:", e.code || e.message); return []; });
  const ordenado = (n, campo, lim) => todos(fb.query(col(n), fb.orderBy(campo, "desc"), fb.limit(lim))).then((l) => (l.length ? l : todos(fb.query(col(n), fb.limit(lim)))));
  const contar = (n) => fb.getCountFromServer(col(n)).then((s) => s.data().count).catch(() => null);
  if (mostrar) $("atualizado").textContent = "Atualizando...";
  const [usuarios, perfis, negocios, anuncios, posts, denuncias, queixas, suporte, parcerias, sancoes, exclusoes, notas, comunicados, log, admins, estatisticas, nPosts, nConversas, nComentarios, nAvaliacoes] = await Promise.all([
    todos(fb.query(col("usuarios"), fb.limit(5000))), todos(fb.query(col("perfis_publicos"), fb.limit(5000))),
    todos(fb.query(col("negocios"), fb.limit(3000))), todos(fb.query(col("anuncios"), fb.limit(3000))),
    ordenado("diario", "criadoEm", 3000), todos(fb.query(col("denuncias"), fb.limit(1500))), todos(fb.query(col("queixas"), fb.limit(1500))),
    ordenado("suporte", "atualizadoEm", 500), todos(fb.query(col("parcerias"), fb.limit(500))), todos(fb.query(col("sancoes"), fb.limit(1000))),
    todos(fb.query(col("exclusoes"), fb.limit(1000))), todos(fb.query(col("notas"), fb.limit(5000))), todos(fb.query(col("comunicados"), fb.limit(100))),
    ordenado("admin_log", "em", 300), todos(fb.query(col("admins"), fb.limit(50))), ordenado("estatisticas", "dia", 400),
    contar("diario"), contar("conversas"), contar("comentarios"), contar("avaliacoes")
  ]);
  D.pessoas = new Map();
  perfis.forEach((p) => D.pessoas.set(p.id, { uid: p.id, ...p }));
  usuarios.forEach((u) => D.pessoas.set(u.id, { ...(D.pessoas.get(u.id) || {}), ...u, uid: u.id, ultimoAcesso: D.pessoas.get(u.id)?.ultimoAcesso, desativadaAte: D.pessoas.get(u.id)?.desativadaAte, fotoPerfil: u.fotoPerfil || D.pessoas.get(u.id)?.fotoPerfil }));
  Object.assign(D, { negocios, anuncios, posts, denuncias, queixas, suporte, parcerias, comunicados, log, admins, estatisticas });
  D.sancoes = new Map(sancoes.map((s) => [s.id, s]));
  D.exclusoes = new Map(exclusoes.map((s) => [s.id, s]));
  D.notas = new Map(notas.map((n) => [n.id, n]));
  D.contagens = { diario: nPosts, conversas: nConversas, comentarios: nComentarios, avaliacoes: nAvaliacoes };
  D.carregadoEm = Date.now();
  $("atualizado").textContent = `Atualizado às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  contadores();
  if (mostrar) irPara(atual);
}

(async function iniciar() {
  for (let i = 0; i < 100 && (!window.firebaseAuth || !window.firebaseDb); i++) await new Promise((r) => setTimeout(r, 50));
  if (!window.firebaseAuth) { document.body.textContent = "Não foi possível conectar."; return; }
  const [A, F] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
  ]);
  C.fb = { ...F, db: window.firebaseDb }; C.A = A;
  const usuario = await new Promise((ok) => { const parar = A.onAuthStateChanged(window.firebaseAuth, (u) => { parar(); ok(u); }); });
  if (!usuario) { location.replace("login.html?redirect=" + encodeURIComponent("admin.html")); return; }
  C.eu = usuario;
  let eAdmin = false, ficha = null;
  try { const s = await F.getDoc(F.doc(C.fb.db, "admins", usuario.uid)); eAdmin = s.exists(); ficha = s.exists() ? s.data() : null; } catch {}
  if (!eAdmin) {
    $("bloqueio").hidden = false; $("bloqueioId").hidden = false; $("meuUid").textContent = usuario.uid;
    $("bloqueioTxt").textContent = `Você entrou como ${usuario.email || usuario.displayName || "usuário"}, que não está na equipe.`;
    return;
  }
  C.nome = ficha?.nome || usuario.displayName || usuario.email || "Equipe";
  C.irPara = irPara;
  C.contadores = contadores;
  C.recarregar = (mostrar) => carregar(mostrar);
  $("app").hidden = false;
  document.querySelectorAll(".ad-nav").forEach((b) => b.addEventListener("click", () => irPara(b.dataset.secao)));
  $("btMenu").addEventListener("click", () => $("lateral").classList.toggle("aberta"));
  $("btAtualizar").addEventListener("click", async () => { await carregar(true); toast("Dados atualizados"); });
  let tempo; $("buscaGlobal").addEventListener("input", (e) => { clearTimeout(tempo); const t = e.target.value; tempo = setTimeout(() => { if (t.trim()) irPara("usuarios", t.trim()); }, 300); });
  atual = (location.hash.slice(1) || "visao");
  await carregar(true);
})();
