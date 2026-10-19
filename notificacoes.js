// =====================================================
// Avisos da rede social (notificacoes.html)
// Seguidores, estrelas, comentários, respostas, pedidos do social e mensagens.
// Os dados chegam em tempo real por rede.js (ouvirAvisos).
// =====================================================
import {
  $, el, icone, pintarAvatar, urlSegura, tempoRelativo, toast, erroAmigavel,
  fb, eu, ganchos, iniciarRede, carregarMeusSeguindo, botaoSeguir, montarBarraRede, pintarBarraRede,
  ouvirAvisos, aoMudarAvisos, avisosVistosEm, marcarAvisosVistos, rotuloVinculo, abrirComentarios
} from "./rede.js?v=41";
import { TEXTO_RECLAMACAO, linkReclamacao } from "./avisos-reclamacoes.js?v=15";
import { TEXTO_EQUIPE, linkEquipe, seloOficial, fotoSuporte } from "./avisos-equipe.js?v=1";

let filtro = "tudo";
let vistoAntes = 0;
const postsCache = new Map();
const CORES = { reacao: "#e0457b", marcacao: "#00adee", seguidor: "#00adee", curtida: "#f5b700", comentario: "#7c5cff", resposta: "#7c5cff", social: "#e0457b", mensagem: "#1fa855", reclamacao: "#ef4444", "reclamacao-resp": "#ff7a1a", "reclamacao-ok": "#2fbf71", suporte: "#00adee", aviso: "#7c5cff" };
const ICONES = { reacao: "coracao", marcacao: "pessoa-mais", seguidor: "pessoa-mais", curtida: "estrela", comentario: "chat", resposta: "chat", social: "fio", mensagem: "envelope", reclamacao: "alerta", "reclamacao-resp": "chat", "reclamacao-ok": "check", suporte: "ajuda", aviso: "sino" };
// Filtro de cada tipo (as três de reclamação ficam juntas; avisos e respostas do suporte também)
const grupo = (t) => (t === "resposta" || t === "reacao" ? "comentario" : t === "marcacao" ? "curtida" : t.startsWith("reclamacao") ? "reclamacao" : t === "aviso" ? "suporte" : t);

function obterPost(id) {
  if (!postsCache.has(id)) postsCache.set(id, fb.getDoc(fb.doc(fb.db, "diario", id)).then((s) => (s.exists() ? { id, ...s.data() } : null)).catch(() => null));
  return postsCache.get(id);
}

// Duo, namoro e casamento ocupam o mesmo lugar: só um aceito por vez.
const TIPOS_DUO = ["duo", "namoro", "casamento"];
async function responderVinculo(v, aceitar) {
  try {
    if (aceitar && TIPOS_DUO.includes(v.tipoParaMim)) {
      const s = await fb.getDocs(fb.query(fb.collection(fb.db, "vinculos"), fb.where("participantes", "array-contains", eu.uid), fb.limit(60)));
      const ja = s.docs.map((d) => ({ id: d.id, ...d.data() })).find((x) => x.id !== v.id && x.status === "aceito" && TIPOS_DUO.includes(x.de === eu.uid ? x.tipoDe : x.tipoPara));
      if (ja) { toast("Você já tem um duo no seu social. Desfaça antes de aceitar."); return; }
    }
    if (aceitar) await fb.updateDoc(fb.doc(fb.db, "vinculos", v.id), { status: "aceito", aceitoEm: fb.serverTimestamp() });
    else await fb.deleteDoc(fb.doc(fb.db, "vinculos", v.id));
    toast(aceitar ? "Vínculo aceito" : "Pedido recusado");
  } catch (e) { toast("Não foi possível responder: " + erroAmigavel(e)); }
}

function itens(a) {
  return [
    ...a.seguidores.map((x) => ({ tipo: "seguidor", ...x, texto: "começou a seguir você" })),
    ...a.curtidas.map((x) => ({ tipo: "curtida", ...x, texto: `deu ${"★".repeat(x.nota)}${"☆".repeat(5 - x.nota)} na sua publicação` })),
    ...a.comentarios.map((x) => ({ tipo: "comentario", ...x, texto: "comentou na sua publicação", detalhe: x.texto })),
    ...a.respostas.filter((x) => !a.comentarios.some((c) => c.id === x.id)).map((x) => ({ tipo: "resposta", ...x, texto: "respondeu seu comentário", detalhe: x.texto })),
    ...(a.reacoes || []).map((x) => ({ tipo: "reacao", ...x, texto: `reagiu com ${x.reacao} ao seu comentário` })),
    ...(a.marcacoes || []).map((x) => ({ tipo: "marcacao", ...x, texto: "marcou você numa publicação" })),
    ...a.vinculos.map((x) => ({ tipo: "social", ...x, texto: x.pendente ? `quer adicionar você como ${rotuloVinculo(x.tipoParaMim).toLowerCase()}` : `aceitou seu pedido: ${rotuloVinculo(x.tipoParaMim)}` })),
    ...a.mensagens.map((x) => ({ tipo: "mensagem", ...x, texto: "enviou uma mensagem", detalhe: x.ultimaMensagem })),
    ...(a.reclamacoes || []).map((x) => ({ ...x, texto: TEXTO_RECLAMACAO[x.tipo](x) })),
    ...(a.equipe || []).map((x) => ({ ...x, texto: TEXTO_EQUIPE(x), pendente: x.naoLida }))
  ].sort((x, y) => y.quando - x.quando);
}

function linha(i) {
  const d = el("div", "notif" + (i.quando > vistoAntes || i.pendente ? " nova" : ""));
  d.tabIndex = 0; d.setAttribute("role", "button");
  const w = el("div", "av-wrap");
  const av = el("div", "avatar");
  if (i.oficial) av.replaceChildren(fotoSuporte()); else pintarAvatar(av, i.foto, i.nome);
  const t = el("span", "tipo"); t.style.background = CORES[i.tipo]; t.appendChild(icone(ICONES[i.tipo], "i"));
  w.append(av, t);
  const tx = el("div", "tx");
  const nome = el("b", null, i.nome || "Usuário");
  if (i.oficial) nome.appendChild(seloOficial());
  tx.append(nome, document.createTextNode(" " + i.texto + " "));
  tx.appendChild(el("span", "quando", tempoRelativo(i.quando ? new Date(i.quando) : null)));
  if (i.detalhe) tx.appendChild(el("small", null, i.oficial ? i.detalhe : `"${i.detalhe}"`));
  d.append(w, tx);
  // Miniatura da publicação curtida ou comentada
  if (i.postId) obterPost(i.postId).then((p) => {
    const u = urlSegura(p?.mediaUrl);
    if (u && p.mediaTipo !== "video") { const img = document.createElement("img"); img.className = "mini-foto"; img.src = u; img.alt = ""; d.appendChild(img); }
  });
  if (i.tipo === "seguidor") { const box = el("div", "acoes-linha"); box.appendChild(botaoSeguir(i.uid, { meSegue: true })); d.appendChild(box); }
  if (i.tipo === "social" && i.pendente) {
    const box = el("div", "acoes-linha");
    [["Aceitar", "pri", true], ["Recusar", "sec", false]].forEach(([r, c, sim]) => {
      const b = el("button", `btn mini ${c}`, r); b.type = "button";
      b.addEventListener("click", async (e) => { e.stopPropagation(); b.disabled = true; await responderVinculo(i, sim); b.disabled = false; });
      box.appendChild(b);
    });
    d.appendChild(box);
  }
  const abrir = async () => {
    if (i.tipo === "mensagem") { location.href = `mensagens.html?conversa=${encodeURIComponent(i.id)}`; return; }
    if (i.oficial) { location.href = linkEquipe(i); return; }
    if (i.tipo.startsWith("reclamacao")) { location.href = linkReclamacao(i, eu.uid); return; }
    if (i.tipo === "reacao") {
      const c = await fb.getDoc(fb.doc(fb.db, "comentarios", i.comentarioId)).catch(() => null);
      const p = c?.exists() ? await obterPost(c.data().postId) : null;
      if (!p) { toast("Esse comentário foi apagado."); return; }
      abrirComentarios(p); return;
    }
    if (i.tipo === "comentario" || i.tipo === "curtida" || i.tipo === "resposta" || i.tipo === "marcacao") {
      const p = await obterPost(i.postId);
      if (!p) { toast("Essa publicação foi apagada."); return; }
      abrirComentarios(p);
      return;
    }
    ganchos.abrirPerfil(i.uid);
  };
  d.addEventListener("click", (e) => { if (!e.target.closest("button")) abrir(); });
  d.addEventListener("keydown", (e) => { if (e.target === d && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); abrir(); } });
  return d;
}

function pintar(a) {
  const corpo = $("listaAvisos");
  const todos = itens(a);
  const cont = { tudo: todos.length };
  todos.forEach((i) => { const t = grupo(i.tipo); cont[t] = (cont[t] || 0) + 1; });
  document.querySelectorAll("#abasAvisos [data-filtro]").forEach((b) => { const n = cont[b.dataset.filtro] || 0; b.querySelector("em").textContent = n ? String(n) : ""; });
  const lista = filtro === "tudo" ? todos : todos.filter((i) => grupo(i.tipo) === filtro);
  corpo.replaceChildren();
  if (!lista.length) {
    const v = el("div", "feed-vazio");
    v.append(el("strong", null, "Nada por aqui ainda"), el("span", null, "Quando alguém seguir você, der estrelas, comentar suas publicações, responder uma reclamação ou o suporte responder, aparece aqui."));
    corpo.appendChild(v);
    return;
  }
  const novas = lista.filter((i) => i.quando > vistoAntes || i.pendente), antigas = lista.filter((i) => !(i.quando > vistoAntes || i.pendente));
  [["Novas", novas], ["Anteriores", antigas]].forEach(([t, l]) => {
    if (!l.length) return;
    corpo.appendChild(el("div", "grupo-titulo", t));
    l.slice(0, 120).forEach((i) => corpo.appendChild(linha(i)));
  });
}

document.querySelectorAll("#abasAvisos [data-filtro]").forEach((b) => b.addEventListener("click", () => {
  filtro = b.dataset.filtro;
  document.querySelectorAll("#abasAvisos [data-filtro]").forEach((x) => x.setAttribute("aria-selected", x === b ? "true" : "false"));
  aoMudarAvisosUmaVez();
}));
let ultimo = null;
function aoMudarAvisosUmaVez() { if (ultimo) pintar(ultimo); }

function pintarPermissao() {
  const box = $("avisoNavegador");
  box.hidden = !("Notification" in window) || Notification.permission !== "default";
}
$("ativarNotif").addEventListener("click", async () => { try { await Notification.requestPermission(); } catch {} pintarPermissao(); });

(async function iniciar() {
  try { await iniciarRede(); }
  catch (e) { $("listaAvisos").replaceChildren(el("div", "lista-vazia", e.message || "Não foi possível carregar.")); return; }
  montarBarraRede("avisos");
  pintarBarraRede();
  carregarMeusSeguindo().then(() => ultimo && pintar(ultimo));
  pintarPermissao();
  ouvirAvisos({ notificarNovos: false });
  vistoAntes = avisosVistosEm;
  aoMudarAvisos((a) => { ultimo = a; pintar(a); });
  // Abriu a página: os avisos contam como vistos (continuam destacados até sair).
  setTimeout(marcarAvisosVistos, 1500);
})();
