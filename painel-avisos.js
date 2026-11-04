// =====================================================
// Painel de notificações (gaveta lateral)
// O sino do topo abre este painel na própria página, em vez de sair para notificacoes.html.
// Carrega os avisos (mensagens, seguidores, pedidos do social, estrelas, comentários, respostas,
// reações, marcações, enquetes, caixa de perguntas, avaliações, reclamações, suporte e o plano) e
// desenha com a lista comum (avisos-lista.js): filtros, "Não lidas", pedidos no topo, agrupamento,
// seções por período, botões de ação, menu ⋯ e preferências. Ao abrir, os avisos contam como vistos.
// Funciona em qualquer página com o sino no topo (a[href="notificacoes.html"] dentro de .topo),
// menos na própria página de notificações.
// =====================================================
import { buscarReclamacoes, TEXTO_RECLAMACAO, linkReclamacao } from "./avisos-reclamacoes.js?v=17";
import { fotoSegura } from "./seguranca.js?v=1";
import { contarNovas, textoMensagens } from "./mensagens-novas.js?v=1";
import { buscarItensEquipe, TEXTO_EQUIPE, linkEquipe } from "./avisos-equipe.js?v=1";
import { enquetesEncerradas, textoEnqueteFim } from "./enquetes.js?v=7";
import { avisoPlano, textoPlano } from "./planos-base.js?v=15";
import { docsComValidade, docsPorIds, esquecer } from "./leituras.js?v=4";
import { lerReacoesFlash, textoFlash } from "./flash-avisos.js?v=3";
import { fontesDoSino, lerFonte } from "./sino-fontes.js?v=2";
import { criarLista, svg, toastNt, categoriaLigada, categoriaDe } from "./avisos-lista.js?v=18";

const ms = (ts) => ts?.toMillis?.() ?? (typeof ts === "number" ? ts : 0);
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };

const VINCULOS = { duo: "Duo", namoro: "Namorado(a)", casamento: "Cônjuge", melhor_amigo: "Melhor amigo(a)", amigo: "Amigo(a)", irmao: "Irmão(ã)", pai_mae: "Pai/Mãe", filho: "Filho(a)", primo: "Primo(a)", tio: "Tio(a)", sobrinho: "Sobrinho(a)", avo: "Avô/Avó", neto: "Neto(a)", parceiro: "Parceiro(a) de trabalho" };
const TIPOS_DUO = ["duo", "namoro", "casamento"];

function texto(i) {
  switch (i.tipo) {
    case "mensagem": return textoMensagens(i.n);
    case "seguidor": return "começou a seguir você";
    case "social":
      if (i.pendente) return `quer adicionar você como ${(VINCULOS[i.tipoParaMim] || "vínculo").toLowerCase()}`;
      return i.aceitoPorMim ? `agora está no seu social: ${VINCULOS[i.tipoParaMim] || "vínculo"}` : `aceitou seu pedido: ${VINCULOS[i.tipoParaMim] || "vínculo"}`;
    case "curtida": return `deu ${i.nota} ${i.nota === 1 ? "estrela" : "estrelas"} na sua publicação`;
    case "comentario": return "comentou na sua publicação";
    case "resposta": return "respondeu seu comentário";
    case "reacao": return `reagiu com ${i.reacao || "❤️"} ao seu comentário`;
    case "marcacao": return "marcou você numa publicação";
    case "republicacao": return "republicou sua publicação";
    case "flash": return textoFlash(i);
    case "caixa": return "respondeu sua caixa de perguntas";
    case "enquete": return i.souAutor ? "terminou. Veja o resultado." : textoEnqueteFim(i).titulo;
    case "aviso": case "suporte": return TEXTO_EQUIPE(i);
    case "plano": return textoPlano(i);
    default: return TEXTO_RECLAMACAO[i.tipo] ? TEXTO_RECLAMACAO[i.tipo](i) : "";
  }
}

// ---------- dados ----------
let fs = null, db = null, eu = null;
async function prontoFirebase() {
  for (let i = 0; i < 100 && (!window.firebaseAuth || !window.firebaseDb); i++) await new Promise((r) => setTimeout(r, 50));
  if (!window.firebaseAuth || !window.firebaseDb) return false;
  if (!fs) {
    const [auth, firestore] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
    ]);
    fs = firestore; db = window.firebaseDb;
    eu = await new Promise((ok) => { const parar = auth.onAuthStateChanged(window.firebaseAuth, (u) => { parar(); ok(u); }); });
  }
  return !!eu;
}
// Rápido (como a parte social): tudo sai junto (antes eram ~10 esperas em fila: conta → fontes → enquetes → plano →
// flash → miniaturas → quem eu sigo → perfis). Miniaturas e nomes/fotos de agora chegam depois, pela lista
// (ganchos.miniatura e ganchos.perfis), sem segurar a primeira pintura.
async function carregar() {
  const uid = eu.uid;
  const ler = (col, ...f) => fs.getDocs(fs.query(fs.collection(db, col), ...f, fs.limit(60))).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }))).catch(() => []);
  const usuarioP = fs.getDoc(fs.doc(db, "usuarios", uid)).then((s) => (s.exists() ? s.data() : {})).catch(() => ({}));
  // Só as 30 mais novas de cada fonte (sino-fontes.js). Mensagens, respostas da caixa, reações em comentários e no
  // Flash e avaliação boa do negócio saíram do sino (ficam na página de origem).
  const F = fontesDoSino(fs, uid);
  const fonte = (k) => lerFonte(fs, db, F[k]).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }))).catch(() => []);
  // Quem eu já sigo (para o "Seguir de volta"): a mesma cópia de 15 min das páginas da rede. Não segura a lista.
  docsComValidade({ ...fs, db }, "seguindo-" + uid, fs.query(fs.collection(db, "relacoes"), fs.where("tipo", "==", "seguir"), fs.where("seguidorId", "==", uid), fs.limit(500)), 15 * 60000)
    .then((snap) => { sigo = new Set(snap.docs.map((d) => d.data().alvoId)); if (lista && estado) lista.redesenhar(); })
    .catch(() => { sigo = null; });
  const [dados, seg, curt, com, resp, vin, recl, equipe, marc, repub, enq, plano, flash] = await Promise.all([
    usuarioP,
    fonte("seguidores"), fonte("curtidas"), fonte("comentarios"), fonte("respostas"),
    ler("vinculos", fs.where("participantes", "array-contains", uid)),
    buscarReclamacoes(fs, db, uid).then((l) => l.filter((x) => !(x.tipo === "avaliacao" && !x.cliente))).catch(() => []),
    usuarioP.then((d) => buscarItensEquipe(fs, db, uid, d.suporteLido || {})).catch(() => []),
    fonte("marcacoes"), fonte("republicacoes"),
    usuarioP.then((d) => enquetesEncerradas(fs, db, uid, d)).catch(() => []),
    avisoPlano({ ...fs, db }, uid).catch(() => null),
    lerReacoesFlash(fs, db, uid).catch(() => [])
  ]);
  const restritos = new Set(dados.restritos || []);
  const itens = [];
  // Enquetes que terminaram (minhas e em que votei)
  enq.forEach((x) => itens.push({ ...x, ...(x.souAutor ? { nome: "Sua enquete", foto: dados.fotoPerfil || "" } : {}), detalhe: textoEnqueteFim(x).detalhe }));
  seg.forEach((r) => itens.push({ tipo: "seguidor", id: "s_" + r.id, uid: r.seguidorId, quando: ms(r.criadoEm) }));
  curt.filter((c) => c.uid !== uid && Number(c.nota) > 0).forEach((c) => itens.push({ tipo: "curtida", id: "c_" + c.id, uid: c.uid, nota: Number(c.nota), postId: c.postId, quando: Math.max(ms(c.criadoEm), ms(c.atualizadoEm)) }));
  com.filter((c) => c.autorId !== uid).forEach((c) => itens.push({ tipo: "comentario", id: "m_" + c.id, uid: c.autorId, nome: c.nome, foto: c.foto, detalhe: c.texto, postId: c.postId, quando: ms(c.criadoEm) }));
  marc.filter((p) => p.autorId !== uid && (p.agendadoPara?.toMillis?.() ?? 0) <= Date.now()).forEach((p) => itens.push({ tipo: "marcacao", id: "k_" + p.id, uid: p.autorId, postId: p.id, quando: ms(p.criadoEm) }));
  repub.filter((r) => r.uid !== uid).forEach((r) => itens.push({ tipo: "republicacao", id: "p_" + r.id, uid: r.uid, nome: r.nome, postId: r.postId, quando: ms(r.criadoEm) }));
  resp.filter((c) => c.autorId !== uid && c.postAutorId !== uid).forEach((c) => itens.push({ tipo: "resposta", id: "r_" + c.id, uid: c.autorId, nome: c.nome, foto: c.foto, detalhe: c.texto, postId: c.postId, quando: ms(c.criadoEm) }));
  vin.forEach((v) => {
    const outro = (v.participantes || []).find((x) => x !== uid);
    const pendente = v.status !== "aceito";
    if (pendente && v.para === uid) itens.push({ tipo: "social", id: v.id, vinculoId: v.id, uid: outro, pendente: true, tipoParaMim: v.tipoPara, quando: ms(v.criadoEm) });
    else if (!pendente && v.de === uid) itens.push({ tipo: "social", id: v.id, vinculoId: v.id, uid: outro, pendente: false, tipoParaMim: v.tipoDe, quando: ms(v.aceitoEm) });
  });
  recl.forEach((x) => itens.push({ ...x }));
  equipe.forEach((x) => itens.push({ ...x }));
  if (plano) itens.push(plano);
  flash.forEach((x) => itens.push({ ...x }));
  // Nome e foto: os da cópia de 30 min do aparelho (docsPorIds) entram já; o resto a lista busca em lote e redesenha.
  const perfis = lerPerfisGuardados(itens.filter((i) => i.uid && !i.nome).map((i) => i.uid));
  itens.forEach((i) => { const p = perfis.get(i.uid); if (p) { i.nome = i.nome || p.nome; i.foto = i.foto || p.fotoPerfil; } i.nome = i.nome || "Usuário"; });
  itens.forEach((i) => { if (i.postId && minis.has(i.postId)) i.mini = minis.get(i.postId); i.texto = texto(i); });
  return { visto: ms(dados.notificacoesVistasEm), prefs: dados.prefNotif || {}, itens: itens.filter((i) => i.quando && !restritos.has(i.uid)).sort((a, b) => b.quando - a.quando) };
}
// Perfis que já estão na memória desta página (preenchidos pelo gancho da lista).
const perfisMem = new Map();
function lerPerfisGuardados(ids) { const r = new Map(); ids.forEach((u) => { if (perfisMem.has(u)) r.set(u, perfisMem.get(u)); }); return r; }
function perfisEmLote(ids) {
  return docsPorIds({ ...fs, db }, "perfis_publicos", ids, 30 * 60000).then((m) => { m.forEach((v, k) => perfisMem.set(k, v || {})); return m; });
}
// Miniatura da publicação, sob demanda (só das que aparecem na tela), uma leitura por publicação.
const minis = new Map(), minisP = new Map();
function miniatura(i) {
  if (!minisP.has(i.postId)) minisP.set(i.postId, fs.getDoc(fs.doc(db, "diario", i.postId)).then((s) => {
    const p = s.exists() ? s.data() : null;
    const m = p ? { foto: p.mediaTipo !== "video" ? fotoSegura(p.mediaUrl || p.midias?.[0]) : "", texto: p.texto || "" } : null;
    minis.set(i.postId, m); guardarDepois(); return m;
  }).catch(() => null));
  return minisP.get(i.postId);
}

// ---------- cópia da lista no aparelho ----------
// Ao abrir o sino, a última lista aparece NA HORA e a do servidor chega por trás (redesenha sozinha).
// Fotos em data: grandes ficam fora (o localStorage é pequeno); a lista busca as atuais em lote.
const chaveCopia = () => "hf-sino-lista-" + eu.uid;
const leve = (u) => (typeof u === "string" && u.startsWith("data:") && u.length > 6000 ? "" : u);
function guardarCopia() {
  if (!estado || !eu) return;
  try {
    const itens = estado.itens.slice(0, 120).map((i) => {
      const x = { ...i }; delete x.grupo;
      if (x.foto) x.foto = leve(x.foto);
      if (x.mini) x.mini = { ...x.mini, foto: leve(x.mini.foto) };
      return x;
    });
    let txt = JSON.stringify({ em: Date.now(), visto: estado.visto, prefs: estado.prefs, itens });
    if (txt.length > 400000) txt = JSON.stringify({ em: Date.now(), visto: estado.visto, prefs: estado.prefs, itens: itens.map((x) => ({ ...x, foto: x.foto?.startsWith?.("data:") ? "" : x.foto, mini: x.mini ? { ...x.mini, foto: "" } : x.mini })) });
    localStorage.setItem(chaveCopia(), txt);
  } catch {}
}
let tGuardar = 0;
function guardarDepois() { clearTimeout(tGuardar); tGuardar = setTimeout(guardarCopia, 800); }
function lerCopia() {
  try {
    const c = JSON.parse(localStorage.getItem(chaveCopia()) || "null");
    if (!c || !Array.isArray(c.itens) || Date.now() - c.em > 7 * 864e5) return null;
    c.itens.forEach((i) => { if (i.postId && i.mini !== undefined && !minis.has(i.postId)) minis.set(i.postId, i.mini); });
    return { visto: c.visto || 0, prefs: c.prefs || {}, itens: c.itens };
  } catch { return null; }
}

// ---------- visual da gaveta (a lista em si vem do avisos-lista.js) ----------
const CSS = `
.pa-fundo { position: fixed; inset: 0; z-index: 9500; background: rgba(2, 8, 14, .5); opacity: 0; transition: opacity .25s; -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px); }
.pa-fundo.on { opacity: 1; pointer-events: auto; }
.pa-fundo:not(.on) { pointer-events: none; }
.pa { position: fixed; top: 0; right: 0; bottom: 0; z-index: 9501; width: min(440px, 100vw); display: flex; flex-direction: column;
  background: var(--panel, #0f161b); color: var(--text, #eaf0f3); border-left: 1px solid var(--line, #213038); box-shadow: -24px 0 60px rgba(0, 0, 0, .4);
  transform: translateX(100%); transition: transform .3s cubic-bezier(.2, .8, .2, 1); outline: none; font-family: inherit; }
.pa.on { transform: none; }
.pa-cab { display: flex; align-items: center; gap: 12px; padding: calc(14px + env(safe-area-inset-top)) 14px 12px 18px; }
.pa-cab .pa-ic { width: 42px; height: 42px; border-radius: 14px; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, #00adee, #0077b6); box-shadow: 0 8px 20px rgba(0, 173, 238, .35); flex-shrink: 0; }
.pa-cab .pa-ic svg { width: 21px; height: 21px; }
.pa-cab .pa-tit { flex: 1; min-width: 0; }
.pa-cab h2 { margin: 0; font-size: 20px; font-weight: 850; letter-spacing: -.3px; }
.pa-cab p { margin: 1px 0 0; font-size: 12.5px; color: var(--muted, #8c9ca7); }
.pa-btn { width: 38px; height: 38px; border-radius: 12px; border: 0; display: grid; place-items: center; cursor: pointer; color: var(--text, #eaf0f3); background: transparent; flex-shrink: 0; }
.pa-btn:hover { background: var(--hover, #19252c); }
.pa-btn:focus-visible, .pa-rodape a:focus-visible { outline: 2px solid #00adee; outline-offset: 2px; }
.pa-btn svg { width: 20px; height: 20px; }
.pa-corpo { flex: 1; overflow-y: auto; overscroll-behavior: contain; padding: 0 12px 12px; }
.pa-corpo .nt2-barra { position: sticky; top: 0; z-index: 2; background: var(--panel, #0f161b); padding-top: 4px; border-bottom: 1px solid var(--line, #213038); margin: 0 -12px; padding-left: 12px; padding-right: 12px; }
.pa-esq { display: flex; gap: 12px; align-items: center; padding: 12px 4px; }
.pa-esq i { display: block; border-radius: 10px; background: linear-gradient(90deg, var(--panel-2, #151f25), var(--hover, #19252c), var(--panel-2, #151f25)); background-size: 200% 100%; animation: pa-brilho 1.2s linear infinite; }
.pa-esq i:first-child { width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0; }
.pa-esq div { flex: 1; display: grid; gap: 7px; }
@keyframes pa-brilho { to { background-position: -200% 0; } }
.pa-erro { padding: 40px 20px; text-align: center; color: var(--muted, #8c9ca7); }
.pa-rodape { padding: 10px 16px calc(12px + env(safe-area-inset-bottom)); border-top: 1px solid var(--line, #213038); }
.pa-rodape a { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 12px; border-radius: 14px; text-decoration: none; font-weight: 800; font-size: 14px; color: #00adee; background: color-mix(in srgb, #00adee 10%, transparent); }
.pa-rodape a svg { width: 16px; height: 16px; }
html.pa-aberto { overflow: hidden; }
@media (prefers-reduced-motion: reduce) { .pa, .pa-fundo { transition: none !important; } }
`;
let cssPronto = false;
function css() { if (cssPronto) return; cssPronto = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); }

let painel = null, fundo = null, estado = null, quemAbriu = null, carregadoEm = 0, sigo = null, lista = null;

function destino(i) {
  if (i.tipo === "mensagem") return `mensagens.html?conversa=${encodeURIComponent(i.conversaId)}`;
  if (i.oficial) return linkEquipe(i);
  if (i.tipo.startsWith("reclamacao") || i.tipo === "avaliacao") return linkReclamacao(i, eu.uid);
  if (i.tipo === "plano") return "negocios.html?planos=1";
  if (i.tipo === "flash") return `feed.html?flash=${encodeURIComponent(i.flashId)}`;
  if (i.grupo && i.tipo === "seguidor") return "notificacoes.html";
  if (i.tipo === "seguidor" || i.tipo === "social") return `usuarios.html?perfil=${encodeURIComponent(i.uid)}`;
  // Estrelas, comentários, respostas e marcações: abre a própria publicação.
  if (i.postId && ["curtida", "comentario", "resposta", "marcacao", "republicacao"].includes(i.tipo)) return `feed.html?post=${encodeURIComponent(i.postId)}`;
  if (i.tipo === "enquete") return `notificacoes.html?enquete=${encodeURIComponent(i.alvo)}`;
  return "notificacoes.html"; // reações e caixa de perguntas abrem na página de notificações
}
async function responderVinculo(i, aceitar) {
  try {
    if (aceitar && TIPOS_DUO.includes(i.tipoParaMim)) {
      const s = await fs.getDocs(fs.query(fs.collection(db, "vinculos"), fs.where("participantes", "array-contains", eu.uid), fs.limit(60)));
      const ja = s.docs.map((d) => ({ id: d.id, ...d.data() })).find((x) => x.id !== i.vinculoId && x.status === "aceito" && TIPOS_DUO.includes(x.de === eu.uid ? x.tipoDe : x.tipoPara));
      if (ja) { toastNt("Você já tem um duo no seu social. Desfaça antes de aceitar."); lista.redesenhar(); return; }
    }
    if (aceitar) await fs.updateDoc(fs.doc(db, "vinculos", i.vinculoId), { status: "aceito", aceitoEm: fs.serverTimestamp() });
    else await fs.deleteDoc(fs.doc(db, "vinculos", i.vinculoId));
    estado.itens = estado.itens.filter((x) => x !== i);
    if (aceitar) { const n = { ...i, pendente: false, aceitoPorMim: true, quando: Date.now() }; n.texto = texto(n); estado.itens.unshift(n); }
    toastNt(aceitar ? "Vínculo aceito" : "Pedido recusado");
    lista.pintar(estado.itens);
    pintarCab();
  } catch { toastNt("Não foi possível responder agora."); lista.redesenhar(); }
}
// "Seguir de volta" / "Seguindo" (mesmo documento que as páginas da rede: relacoes/{eu}_{alvo}).
function botaoSeguir(alvo) {
  if (!sigo) return null;
  const b = el("button", "nt2-bt"); b.type = "button";
  const pintarB = () => { const on = sigo.has(alvo); b.classList.toggle("pri", !on); b.classList.toggle("on", on); b.textContent = on ? "Seguindo" : "Seguir de volta"; };
  pintarB();
  b.addEventListener("click", async (e) => {
    e.stopPropagation(); b.disabled = true;
    const ref = fs.doc(db, "relacoes", `${eu.uid}_${alvo}`);
    try {
      if (sigo.has(alvo)) { await fs.deleteDoc(ref); sigo.delete(alvo); }
      else { await fs.setDoc(ref, { tipo: "seguir", seguidorId: eu.uid, alvoId: alvo, criadoEm: fs.serverTimestamp() }); sigo.add(alvo); }
      esquecer("seguindo-" + eu.uid);
    } catch { toastNt("Não foi possível seguir agora."); }
    finally { b.disabled = false; pintarB(); }
  });
  return b;
}
// Preferências por categoria: usuarios/{uid}.prefNotif (o próprio dono grava).
async function salvarPrefs(prefs) {
  await fs.setDoc(fs.doc(db, "usuarios", eu.uid), { prefNotif: prefs }, { merge: true });
  if (estado) estado.prefs = prefs;
  try { localStorage.removeItem("hf-sino-" + eu.uid); } catch {}
  window.dispatchEvent(new CustomEvent("hf:prefs-notif", { detail: prefs }));
  pintarCab();
}
function pintarCab() {
  if (!estado) return;
  const n = lista.contarNaoLidas();
  const msgs = estado.itens.filter((i) => i.naoLida && !i.oficial && categoriaLigada(estado.prefs, categoriaDe(i.tipo))).length;
  painel.querySelector(".pa-cab p").textContent = (n ? `${n} ${n === 1 ? "não lida" : "não lidas"}` : "Tudo em dia") + (msgs ? ` · ${msgs} ${msgs === 1 ? "mensagem" : "mensagens"}` : "");
}
function esqueleto() {
  const corpo = painel.querySelector(".pa-corpo");
  corpo.replaceChildren(...Array.from({ length: 7 }, () => {
    const e = el("div", "pa-esq");
    const b = el("div"); const l1 = el("i"); l1.style.height = "12px"; l1.style.width = "82%"; const l2 = el("i"); l2.style.height = "10px"; l2.style.width = "40%";
    b.append(l1, l2); e.append(el("i"), b);
    return e;
  }));
}
function marcarVistos() {
  if (!eu) return;
  fs.setDoc(fs.doc(db, "usuarios", eu.uid), { notificacoesVistasEm: fs.serverTimestamp() }, { merge: true }).catch(() => {});
  try { localStorage.setItem("hf-sino-" + eu.uid, JSON.stringify({ n: 0, visto: Date.now(), em: Date.now() })); } catch {}
  // O sino do topo e as páginas da rede social atualizam o contador
  window.dispatchEvent(new CustomEvent("hf:avisos-vistos"));
}
function montar() {
  css();
  fundo = el("div", "pa-fundo");
  fundo.addEventListener("click", fechar);
  painel = el("aside", "pa");
  painel.setAttribute("role", "dialog"); painel.setAttribute("aria-modal", "true"); painel.setAttribute("aria-labelledby", "paTitulo");
  painel.tabIndex = -1;
  const cab = el("div", "pa-cab");
  const ic = el("div", "pa-ic"); ic.appendChild(svg("sino"));
  const tit = el("div", "pa-tit"); const h = el("h2", null, "Notificações"); h.id = "paTitulo"; tit.append(h, el("p", null, "Carregando..."));
  const x = el("button", "pa-btn"); x.type = "button"; x.setAttribute("aria-label", "Fechar notificações"); x.appendChild(svg("fechar"));
  x.addEventListener("click", fechar);
  cab.append(ic, tit, x);
  const corpo = el("div", "pa-corpo");
  const rod = el("div", "pa-rodape");
  const a = el("a"); a.href = "notificacoes.html"; a.append(document.createTextNode("Ver todas as notificações"), svg("seta"));
  rod.appendChild(a);
  painel.append(cab, corpo, rod);
  // Esc fecha (o menu ⋯ e as preferências tratam o Esc antes)
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && painel.classList.contains("on") && !document.querySelector(".nt2-menu, .nt2-pref-fundo")) { e.preventDefault(); fechar(); } });
  painel.addEventListener("keydown", (e) => {
    if (e.key === "Tab") { // mantém o foco dentro do painel
      const f = [...painel.querySelectorAll("button, a, [tabindex='0']")].filter((x) => !x.disabled && x.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  document.body.append(fundo, painel);
}
function desenhar(atualizando) {
  if (!lista) {
    const corpo = painel.querySelector(".pa-corpo");
    corpo.replaceChildren();
    lista = criarLista({ raiz: corpo, uid: eu.uid, ganchos: { perfis: perfisEmLote, miniatura, abrir: (i) => { location.href = destino(i); }, botaoSeguir, responderVinculo, salvarPrefs, marcarTodasVistas: () => { estado.visto = Date.now(); marcarVistos(); pintarCab(); } } });
  }
  lista.pintar(estado.itens, { vistoAntes: estado.visto, prefs: estado.prefs });
  pintarCab();
  if (atualizando) painel.querySelector(".pa-cab p").textContent += " · atualizando…";
}
// Busca do servidor (uma de cada vez). Começa já no toque do sino (pointerdown), antes do clique.
let buscando = null;
function buscar() {
  if (!buscando) buscando = carregar().then((e) => { estado = e; carregadoEm = Date.now(); guardarCopia(); return e; }).finally(() => { buscando = null; });
  return buscando;
}
async function abrir(origem) {
  quemAbriu = origem;
  if (!painel) montar();
  document.documentElement.classList.add("pa-aberto");
  requestAnimationFrame(() => { fundo.classList.add("on"); painel.classList.add("on"); painel.focus({ preventScroll: true }); });
  origem?.setAttribute("aria-expanded", "true");
  if (!(await prontoFirebase())) { location.href = "login.html"; return; }
  // Reabriu logo depois: mostra o que já foi carregado, sem ler tudo de novo.
  if (estado && Date.now() - carregadoEm < 60000) { desenhar(); return; }
  // Cópia do aparelho na hora (a última lista vista); sem cópia, o esqueleto.
  if (!estado) estado = lerCopia();
  if (estado) desenhar(true); else esqueleto();
  try {
    await buscar();
    if (painel.classList.contains("on")) desenhar();
    // Abriu: os avisos contam como vistos no servidor (continuam destacados até fechar).
    setTimeout(() => { if (painel?.classList.contains("on")) marcarVistos(); }, 1200);
  } catch (e) {
    console.warn("[Avisos]", e);
    if (estado) { pintarCab(); return; } // fica a cópia
    lista = null;
    painel.querySelector(".pa-corpo").replaceChildren(el("div", "pa-erro", "Não foi possível carregar as notificações agora."));
  }
}
function fechar() {
  if (!painel?.classList.contains("on")) return;
  painel.classList.remove("on"); fundo.classList.remove("on");
  document.documentElement.classList.remove("pa-aberto");
  document.querySelectorAll(".nt2-menu").forEach((m) => m.remove());
  // Da próxima vez, o que foi visto agora já não é "novo".
  if (estado) estado.visto = Date.now();
  quemAbriu?.setAttribute("aria-expanded", "false");
  quemAbriu?.focus({ preventScroll: true });
}

// ---------- liga o sino do topo ----------
function ligar() {
  if (/(^|\/)notificacoes\.html$/.test(location.pathname)) return; // a própria página já é a lista completa
  document.querySelectorAll('.topo a[href="notificacoes.html"]').forEach((a) => {
    if (a.dataset.painel) return;
    a.dataset.painel = "1";
    a.setAttribute("aria-haspopup", "dialog");
    a.setAttribute("aria-expanded", "false");
    // Começa a buscar no toque (ganha o tempo entre encostar o dedo e soltar).
    a.addEventListener("pointerdown", () => { prontoFirebase().then((ok) => { if (ok && !(estado && Date.now() - carregadoEm < 60000)) buscar().catch(() => {}); }); }, { passive: true });
    a.addEventListener("click", (e) => {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return; // nova aba continua indo para a página
      e.preventDefault();
      abrir(a);
    });
  });
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ligar); else ligar();
