// =====================================================
// Avisos da rede social (notificacoes.html)
// Seguidores, estrelas, comentários, respostas, pedidos do social, mensagens, enquetes, avaliações,
// reclamações, suporte e o plano. Os dados chegam em tempo real por rede.js (ouvirAvisos) e são
// desenhados pela lista comum com o painel do sino (avisos-lista.js).
// =====================================================
import {
  $, el, icone, pintarAvatar, urlSegura, tempoRelativo, toast, erroAmigavel,
  fb, eu, dados, refUsuario, ganchos, iniciarRede, carregarMeusSeguindo, botaoSeguir, montarBarraRede, pintarBarraRede,
  ouvirAvisos, aoMudarAvisos, avisosVistosEm, marcarAvisosVistos, rotuloVinculo, abrirComentarios, abrirResultadoEnquete, verRespostasCaixa
} from "./rede.js?v=58";
import { TEXTO_RECLAMACAO, linkReclamacao } from "./avisos-reclamacoes.js?v=17";
import { TEXTO_EQUIPE, linkEquipe, seloOficial, fotoSuporte } from "./avisos-equipe.js?v=1";
import { textoEnqueteFim, resumoResultado } from "./enquetes.js?v=4";
import { textoPlano } from "./planos-base.js?v=3";
import { criarLista } from "./avisos-lista.js?v=2";

let vistoAntes = 0, ultimo = null, abriuPedida = false;
const postsCache = new Map();

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

// Os ids seguem os do painel do sino (painel-avisos.js), para "lida" e "removida" valerem nos dois.
function itens(a) {
  return [
    ...a.seguidores.map((x) => ({ tipo: "seguidor", ...x, docId: x.id, id: "s_" + x.id, texto: "começou a seguir você" })),
    ...a.curtidas.map((x) => ({ tipo: "curtida", ...x, docId: x.id, id: "c_" + x.id, texto: `deu ${x.nota} ${x.nota === 1 ? "estrela" : "estrelas"} na sua publicação` })),
    ...a.comentarios.map((x) => ({ tipo: "comentario", ...x, docId: x.id, id: "m_" + x.id, texto: "comentou na sua publicação", detalhe: x.texto })),
    ...a.respostas.filter((x) => !a.comentarios.some((c) => c.id === x.id)).map((x) => ({ tipo: "resposta", ...x, docId: x.id, id: "r_" + x.id, texto: "respondeu seu comentário", detalhe: x.texto })),
    ...(a.reacoes || []).map((x) => ({ tipo: "reacao", ...x, docId: x.id, id: "e_" + x.id, texto: `reagiu com ${x.reacao} ao seu comentário` })),
    ...(a.marcacoes || []).map((x) => ({ tipo: "marcacao", ...x, docId: x.id, id: "k_" + x.id, texto: "marcou você numa publicação" })),
    ...(a.caixas || []).map((x) => ({ tipo: "caixa", ...x, docId: x.id, id: "x_" + x.id, texto: "respondeu sua caixa de perguntas", detalhe: x.texto })),
    ...(a.enquetes || []).map((x) => ({ ...x, texto: x.souAutor ? "terminou. Veja o resultado." : textoEnqueteFim(x).titulo, detalhe: "" })),
    ...a.vinculos.map((x) => ({ tipo: "social", ...x, texto: x.pendente ? `quer adicionar você como ${rotuloVinculo(x.tipoParaMim).toLowerCase()}` : `aceitou seu pedido: ${rotuloVinculo(x.tipoParaMim)}` })),
    ...a.mensagens.map((x) => ({ tipo: "mensagem", ...x, naoLida: true, texto: "enviou uma mensagem", detalhe: x.ultimaMensagem })),
    ...(a.reclamacoes || []).map((x) => ({ ...x, texto: TEXTO_RECLAMACAO[x.tipo](x) })),
    ...(a.equipe || []).map((x) => ({ ...x, texto: TEXTO_EQUIPE(x), pendente: x.naoLida })),
    ...(a.planos || []).map((x) => ({ ...x, texto: textoPlano(x) }))
  ].sort((x, y) => y.quando - x.quando);
}

// Resultado da enquete na própria notificação: a pergunta e as 2 mais votadas em barrinhas.
function miniResultado(i) {
  const r = resumoResultado(i.opcoes, i.contas);
  const box = el("span", "nt-enq");
  box.appendChild(el("span", "nt-enq-p", `“${i.pergunta}”`));
  const ordem = i.opcoes.map((o, k) => [o, i.contas[k], k]).sort((a, b) => b[1] - a[1]).slice(0, 2);
  ordem.forEach(([o, n, k]) => {
    const pct = r.total ? Math.round((n / r.total) * 100) : 0;
    const l = el("span", "nt-enq-op" + (r.vencedoras.includes(k) && r.total ? " lider" : "") + (i.minha === k ? " minha" : ""));
    const b = el("i"); b.style.width = `${pct}%`;
    l.append(b, el("span", "o", o), el("span", "n", `${pct}%`));
    box.appendChild(l);
  });
  box.appendChild(el("span", "nt-enq-t", r.total ? `${r.total} ${r.total === 1 ? "voto" : "votos"}${i.minha != null && !i.souAutor ? ` · você: “${i.opcoes[i.minha]}”` : ""}` : "Sem votos"));
  return box;
}

// O que acontece ao tocar numa notificação (ou no botão de ação dela).
async function abrirItem(i) {
  if (i.tipo === "enquete") { abrirResultadoEnquete(i); return; }
    if (i.tipo === "caixa") {
      const s = await fb.getDoc(fb.doc(fb.db, i.itemTipo === "f" ? "stories" : "diario", i.itemId)).catch(() => null);
      if (!s?.exists() || !s.data().caixa) { toast(i.itemTipo === "f" ? "Esse flash já saiu do ar. A resposta: " + i.texto : "Essa publicação foi apagada."); return; }
      verRespostasCaixa({ id: s.id, ...s.data() }, i.alvo);
      return;
    }
    if (i.tipo === "mensagem") { location.href = `mensagens.html?conversa=${encodeURIComponent(i.id)}`; return; }
    if (i.oficial) { location.href = linkEquipe(i); return; }
    if (i.tipo.startsWith("reclamacao") || i.tipo === "avaliacao") { location.href = linkReclamacao(i, eu.uid); return; }
    if (i.tipo === "plano") { location.href = "negocios.html?planos=1"; return; }
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
}

let lista = null;
// Preferências por categoria: usuarios/{uid}.prefNotif (o próprio dono grava; o número do sino respeita).
async function salvarPrefs(prefs) {
  await fb.setDoc(refUsuario, { prefNotif: prefs }, { merge: true });
  dados.prefNotif = prefs;
  try { localStorage.removeItem("hf-sino-" + eu.uid); } catch {}
  window.dispatchEvent(new CustomEvent("hf:prefs-notif", { detail: prefs }));
}
const miniatura = (i) => obterPost(i.postId).then((p) => (p ? { foto: p.mediaTipo !== "video" ? urlSegura(p.mediaUrl) : "", texto: p.texto || "" } : null));

(async function iniciar() {
  try { await iniciarRede(); }
  catch (e) { $("listaAvisos").replaceChildren(el("div", "lista-vazia", e.message || "Não foi possível carregar.")); return; }
  montarBarraRede("avisos");
  pintarBarraRede();
  ouvirAvisos({ notificarNovos: false });
  vistoAntes = avisosVistosEm;
  lista = criarLista({ raiz: $("listaAvisos"), uid: eu.uid, ganchos: {
    abrir: abrirItem, miniatura, salvarPrefs,
    botaoSeguir: (uid) => botaoSeguir(uid, { meSegue: true }),
    responderVinculo: (i, sim) => responderVinculo(i, sim),
    extra: (i) => (i.tipo === "enquete" ? miniResultado(i) : null),
    marcarTodasVistas: () => marcarAvisosVistos()
  } });
  carregarMeusSeguindo().then(() => ultimo && lista.pintar(itens(ultimo)));
  const pedida = new URLSearchParams(location.search).get("enquete");
  aoMudarAvisos((a) => {
    ultimo = a; lista.pintar(itens(a), { vistoAntes, prefs: dados.prefNotif || {} });
    const x = pedida && (a.enquetes || []).find((e) => e.alvo === pedida);
    if (x && !abriuPedida) { abriuPedida = true; abrirResultadoEnquete(x); }
  });
  // Abriu a página: os avisos contam como vistos (continuam destacados até sair).
  setTimeout(marcarAvisosVistos, 1500);
})();
