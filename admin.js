// =====================================================
// Painel do administrador (admin.html)
// Só entra quem tem o documento admins/{uid} (criado à mão no console do
// Firebase). As regras do Firestore conferem isso em cada leitura e ação.
// =====================================================
import { C, D, $, h, ms, toast, PAPEIS, vendoAgora, pode, registrar, garantirNegocios, garantirTodasPessoas, carregarPessoas } from "./admin-base.js?v=25";
import * as S from "./admin-secoes.js?v=63";
import { previa, tocarSom } from "./admin-chat.js?v=27";
import { meusCanais, silenciado, canalPorId, convCanal } from "./equipe-canais.js?v=1";

const SECOES = {
  visao: S.visao, estatisticas: S.estatisticas, relatorios: S.relatorios, usuarios: S.usuarios, verificacoes: S.verificacoes,
  suporte: S.suporte, denuncias: S.denuncias, reclamacoes: S.reclamacoes, sancoes: S.sancoes, negocios: S.negocios,
  parcerias: S.parcerias, planos: S.planos, comunicados: S.comunicados, registro: S.registro, equipe: S.equipe,
  tarefas: S.tarefas, publicacoes: S.publicacoes
};
let atual = "visao", ultimaPresenca = "";
// Só os donos do site: planos (pagamentos, negociações, receita) e o registro de ações da equipe.
const SO_DONO = new Set(["planos", "registro"]);
// Seções que usam a lista inteira de negócios (as outras só precisam dos totais).
const PRECISAM_NEGOCIOS = new Set(["estatisticas", "relatorios", "verificacoes", "publicacoes"]);
// Seções que usam todas as contas (gráficos de idade, cidade, bairro...).
const PRECISAM_PESSOAS = new Set(["estatisticas", "relatorios"]);

let porHistorico = false;
addEventListener("popstate", () => {
  const s = location.hash.slice(1) || "visao";
  if (s !== atual && SECOES[s] && C.irPara) { porHistorico = true; try { irPara(s); } finally { porHistorico = false; } }
});
function irPara(sec, termo = "") {
  let filtro = "";
  if (sec.includes(":")) [sec, filtro] = sec.split(":");
  if (!SECOES[sec]) sec = "visao";
  if (SO_DONO.has(sec) && !pode("dono")) { if (!porHistorico) toast("Só os donos do site veem esta seção."); sec = "visao"; filtro = ""; }
  atual = sec;
  document.querySelectorAll(".ad-nav").forEach((b) => { if (b.dataset.secao === sec) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  const el = $("principal"); el.replaceChildren();
  const faltaNeg = PRECISAM_NEGOCIOS.has(sec) && !D.negociosProntos, faltaPessoas = PRECISAM_PESSOAS.has(sec) && !D.pessoasCompletas;
  if (faltaNeg || faltaPessoas) {
    el.appendChild(h("div", "ad-vazio", faltaPessoas ? "Carregando todas as contas para os gráficos..." : "Carregando negócios e anúncios..."));
    Promise.all([garantirNegocios(), faltaPessoas ? garantirTodasPessoas() : null]).then(() => { if (atual === sec) irPara(sec + (filtro ? ":" + filtro : ""), termo); })
      .catch((e) => { el.replaceChildren(h("div", "ad-vazio", "Não foi possível carregar os negócios: " + (e.code || e.message))); });
    history.replaceState(history.state, "", `admin.html#${sec}`);
    return;
  }
  try {
    if (filtro && sec !== "usuarios") { S.definirFiltro(sec, filtro); SECOES[sec](el, termo); }
    else if (sec === "usuarios" && filtro) { const chip = filtro; SECOES.usuarios(el, termo); el.querySelector(`.ad-chip:nth-child(${["todos", "novos", "ativos", "inativos", "negocio", "verificados", "desativado", "exclusao", "sancao"].indexOf(chip) + 1})`)?.click(); }
    else SECOES[sec](el, termo);
  } catch (e) { console.error(e); el.appendChild(h("div", "ad-vazio", "Não foi possível montar esta seção: " + e.message)); }
  // Trocar de seção é um passo no histórico: o "voltar" volta para a seção anterior.
  if (!porHistorico && location.hash.slice(1) && location.hash.slice(1) !== sec) { const st = { ...(history.state || {}) }; delete st.hfBase; delete st.hfGuarda; delete st.hfCamadas; history.pushState(st, "", `admin.html#${sec}`); }
  else history.replaceState(history.state, "", `admin.html#${sec}`);
  C.marcarItem?.(null);
  requestAnimationFrame(() => C.pintarVendo?.());
  if (C.marcarPresenca && sec !== ultimaPresenca) { ultimaPresenca = sec; C.marcarPresenca(true); }
  menuLateral(false);
  el.focus({ preventScroll: true }); window.scrollTo({ top: 0 });
}

function contadores() {
  const pend = (n) => (n ? String(n) : "");
  const set = (k, v) => { const e = document.querySelector(`[data-cont="${k}"]`); if (e) { e.textContent = v; e.hidden = !v; } };
  set("usuarios", D.contPessoas.total ? String(D.contPessoas.total) : "");
  set("verificacoes", pend(D.pendVerif.length));
  set("suporte", pend(D.suporte.filter((s) => s.status === "aberto").length));
  set("denuncias", pend(D.denuncias.filter((d) => d.status === "nova").length + D.reportes.filter((r) => r.status === "novo").length));
  set("reclamacoes", pend(D.queixas.filter((q) => q.status === "aberta" && !q.resposta && ms(q.abertaEm) < Date.now() - 7 * 864e5).length));
  set("sancoes", pend([...D.sancoes.values()].filter((s) => s.tipo === "banimento" || ms(s.ate) > Date.now()).length));
  set("parcerias", pend(D.parcerias.filter((p) => (p.status || "novo") === "novo").length));
  set("planos", pend((D.planosPedidos || []).filter((p) => p.status === "pendente").length + (D.planosNeg || []).filter((n) => n.status === "novo").length));
  set("equipe", pend((C.chatNaoLidas || 0) + (C.dmNaoLidas || 0) + (C.canaisNaoLidas || 0)));
  set("tarefas", pend(C.tarefas.filter((t) => t.status !== "feito" && t.responsavel === C.eu?.uid).length));
  // Online = abriu o painel nos últimos minutos e não está "Fora do turno".
  const on = D.admins.filter((a) => a.id !== C.eu?.uid && C.online(a.id) && C.statusDe?.(a.id) !== "fora").length;
  const e = $("equipeOnline"); if (e) { e.hidden = !on; e.textContent = `${on} da equipe online`; }
}

// Presença no painel (a cada minuto) + chat da equipe, ao vivo.
function equipeAoVivo() {
  const { fb } = C;
  C.presenca = new Map(); C.chat = []; C.chatNaoLidas = 0;
  C.online = (uid) => uid === C.eu.uid || ms(C.presenca.get(uid)?.em) > Date.now() - 150000;
  const chaveVisto = "hf-equipe-chat-visto-" + C.eu.uid;
  let visto = 0; try { visto = Number(localStorage.getItem(chaveVisto) || 0); } catch {}
  C.marcarChatVisto = () => { visto = Date.now(); try { localStorage.setItem(chaveVisto, String(visto)); } catch {} C.chatNaoLidas = 0; contadores(); };
  const avisar = () => { contadores(); C.pintarVendo?.(); if (atual === "equipe") C.aoMudarEquipe?.(); };
  let itemAtual = null, itemNome = null;
  // Situação de quem está no painel: Disponível, Em pausa ou Fora do turno (guardada no aparelho e na presença).
  const chaveStatus = "hf-status-" + C.eu.uid;
  try { C.meuStatus = ["disponivel", "pausa", "fora"].includes(localStorage.getItem(chaveStatus)) ? localStorage.getItem(chaveStatus) : "disponivel"; } catch { C.meuStatus = "disponivel"; }
  let semStatus = false; // regras antigas no servidor: a presença vai sem a situação
  C.marcarPresenca = (forcar) => {
    if (document.hidden && !forcar) return;
    const dados = { nome: C.nome.slice(0, 80), secao: atual, item: itemAtual, itemNome, em: fb.serverTimestamp() };
    const ref = fb.doc(fb.db, "equipe_presenca", C.eu.uid);
    fb.setDoc(ref, semStatus ? dados : { ...dados, status: C.meuStatus }).catch((e) => {
      if (e?.code === "permission-denied" && !semStatus) { semStatus = true; return fb.setDoc(ref, dados); }
      throw e;
    }).catch((e) => console.warn("Presença:", e.code || e.message));
  };
  C.statusDe = (uid) => (!C.online(uid) ? null : uid === C.eu.uid ? C.meuStatus : (["pausa", "fora"].includes(C.presenca.get(uid)?.status) ? C.presenca.get(uid).status : "disponivel"));
  C.mudarStatus = (st) => {
    C.meuStatus = st; try { localStorage.setItem(chaveStatus, st); } catch {}
    C.marcarPresenca(true); avisar();
  };
  // Item aberto agora (ficha, denúncia, chamado, proposta): a equipe vê "fulano está vendo".
  C.marcarItem = (item, nome) => { if (item === itemAtual) return; itemAtual = item || null; itemNome = item ? String(nome || "").slice(0, 120) || null : null; C.marcarPresenca(true); };
  // Marca nos cartões da tela quem da equipe está com aquele item aberto.
  C.pintarVendo = () => {
    document.querySelectorAll("[data-item]").forEach((el) => {
      const nomes = vendoAgora(el.dataset.item);
      let tag = el.querySelector(":scope .ad-vendo");
      if (!nomes.length) { tag?.remove(); return; }
      if (!tag) { tag = h("span", "ad-vendo"); (el.querySelector(".cab") || el).appendChild(tag); }
      tag.textContent = `${nomes.join(", ")} ${nomes.length > 1 ? "estão" : "está"} vendo agora`;
    });
  };
  C.marcarPresenca(true);
  setInterval(() => C.marcarPresenca(), 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) C.marcarPresenca(true); });
  setInterval(avisar, 30000); // quem parou de mandar sinal sai do "online"
  fb.onSnapshot(fb.collection(fb.db, "equipe_presenca"), (s) => { C.presenca = new Map(s.docs.map((d) => [d.id, d.data()])); avisar(); }, (e) => console.warn("Presença:", e.code || e.message));
  let primeiraT = true;
  fb.onSnapshot(fb.query(fb.collection(fb.db, "equipe_tarefas"), fb.limit(500)), (s) => {
    C.tarefas = s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }));
    if (!primeiraT) s.docChanges().filter((c) => c.type !== "removed" && c.doc.data().responsavel === C.eu.uid && c.doc.data().status === "a_fazer" && c.doc.data().criadoPor !== C.eu.uid && !c.doc.metadata.hasPendingWrites).slice(-1).forEach((c) => toast(`Nova tarefa para você: ${c.doc.data().titulo}`));
    primeiraT = false; contadores(); if (atual === "tarefas" || atual === "visao") C.aoMudarTarefas?.();
  }, (e) => console.warn("Tarefas:", e.code || e.message));
  // Chat de todos: quem está com ele aberto não acumula "não lidas".
  const vendoConversa = (id) => atual === "equipe" && C.conversaAberta === id && !document.hidden;
  let primeira = true;
  fb.onSnapshot(fb.query(fb.collection(fb.db, "equipe_chat"), fb.orderBy("em", "desc"), fb.limit(150)), (s) => {
    C.chat = s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })).reverse();
    const novas = C.chat.filter((m) => m.autorId !== C.eu.uid && ms(m.em) > visto);
    C.chatNaoLidas = vendoConversa("equipe") ? 0 : novas.length;
    if (!primeira) s.docChanges().filter((c) => c.type === "added" && c.doc.data().autorId !== C.eu.uid && !c.doc.metadata.hasPendingWrites).slice(-1).forEach((c) => {
      const m = c.doc.data(), mencao = (m.mencoes || []).includes(C.eu.uid);
      if (vendoConversa("equipe") && !mencao) return;
      toast(mencao ? `${m.nome || "Alguém"} mencionou você no Geral: ${previa(m).slice(0, 60)}` : `Geral · ${m.nome || "mensagem"}: ${previa(m).slice(0, 60)}`);
      tocarSom();
    });
    primeira = false; avisar();
  }, (e) => console.warn("Chat da equipe:", e.code || e.message));
  // Canais por setor: só o resumo de cada um (≤ 7 documentos); as mensagens são lidas quando o canal é aberto.
  C.canais = new Map(); C.canaisNaoLidas = 0;
  C.papelEu = D.admins.find((a) => a.id === C.eu.uid)?.papel || "dono";
  C.prefCanais = {};
  C.meusCanais = () => meusCanais(C.papelEu, C.prefCanais);
  const chaveCanais = "hf-canais-visto-" + C.eu.uid;
  let vistoCanais = {}; try { vistoCanais = JSON.parse(localStorage.getItem(chaveCanais) || "{}") || {}; } catch {}
  C.canalVisto = (id) => Number(vistoCanais[id] || 0);
  C.marcarCanalVisto = (id) => { vistoCanais[id] = Date.now(); try { localStorage.setItem(chaveCanais, JSON.stringify(vistoCanais)); } catch {} contarCanais(); contadores(); };
  // Preferências da pessoa (entrar, sair e silenciar canais) ficam na conta dela.
  C.salvarPrefCanais = async (pref) => {
    C.prefCanais = pref; contarCanais(); avisar();
    await fb.setDoc(fb.doc(fb.db, "usuarios", C.eu.uid), { equipeCanais: pref }, { merge: true });
  };
  const naoLidaCanal = (id, d) => C.meusCanais().includes(id) && d.ultimoAutor !== C.eu.uid && ms(d.ultimaEm) > C.canalVisto(id) && !vendoConversa(convCanal(id));
  const mencionaMe = (d) => Array.isArray(d.mencoes) && d.mencoes.includes(C.eu.uid);
  // Canal silenciado não conta (a não ser que tenham mencionado você).
  const contarCanais = () => { C.canaisNaoLidas = [...C.canais.entries()].filter(([id, d]) => naoLidaCanal(id, d) && (!silenciado(id, C.prefCanais) || mencionaMe(d))).length; };
  fb.getDoc(fb.doc(fb.db, "usuarios", C.eu.uid)).then((sn) => { const p = sn.data()?.equipeCanais; if (p && typeof p === "object") { C.prefCanais = p; contarCanais(); avisar(); } }).catch(() => {});
  let primeiraC = true;
  fb.onSnapshot(fb.collection(fb.db, "equipe_canais"), (s) => {
    C.canais = new Map(s.docs.filter((d) => canalPorId(d.id)).map((d) => [d.id, d.data({ serverTimestamps: "estimate" })]));
    contarCanais();
    if (!primeiraC) s.docChanges().filter((c) => c.type !== "removed" && !c.doc.metadata.hasPendingWrites && canalPorId(c.doc.id)).forEach((c) => {
      const d = c.doc.data({ serverTimestamps: "estimate" });
      if (!naoLidaCanal(c.doc.id, d)) return;
      const mencao = mencionaMe(d);
      if (silenciado(c.doc.id, C.prefCanais) && !mencao) return;
      toast(mencao ? `${d.ultimoNome || "Alguém"} mencionou você em ${canalPorId(c.doc.id).nome}: ${String(d.ultimaTexto || "").slice(0, 60)}` : `${canalPorId(c.doc.id).nome} · ${d.ultimoNome || "mensagem"}: ${String(d.ultimaTexto || "").slice(0, 60)}`);
      tocarSom();
    });
    primeiraC = false; avisar();
  }, (e) => console.warn("Canais da equipe:", e.code || e.message));
  // Conversas individuais: só o resumo de cada uma (quem falou por último, quando, e quando eu li).
  C.dms = new Map(); C.dmNaoLidas = 0;
  let primeiraDm = true;
  fb.onSnapshot(fb.query(fb.collection(fb.db, "equipe_dm"), fb.where("participantes", "array-contains", C.eu.uid), fb.limit(100)), (s) => {
    C.dms = new Map(s.docs.map((d) => [d.id, d.data({ serverTimestamps: "estimate" })]));
    const naoLida = (id, d) => d.ultimoAutor !== C.eu.uid && ms(d.ultimaEm) > ms(d.lidoEm?.[C.eu.uid]) && !vendoConversa(id);
    C.dmNaoLidas = [...C.dms.entries()].filter(([id, d]) => naoLida(id, d)).length;
    if (!primeiraDm) s.docChanges().filter((c) => c.type !== "removed" && !c.doc.metadata.hasPendingWrites).forEach((c) => {
      const d = c.doc.data({ serverTimestamps: "estimate" });
      if (d.ultimoAutor === C.eu.uid || !naoLida(c.doc.id, d)) return;
      const de = D.admins.find((a) => a.id === d.ultimoAutor)?.nome || "Alguém da equipe";
      toast(`${de} (mensagem privada): ${String(d.ultimaTexto || "").slice(0, 60)}`); tocarSom();
    });
    primeiraDm = false; avisar();
  }, (e) => console.warn("Conversas individuais:", e.code || e.message));
}

// Carrega tudo o que o painel usa. Em sites maiores, o relatório diário (estatisticas/) evita recalcular.
async function carregar(mostrar = true) {
  const { fb } = C;
  const col = (n) => fb.collection(fb.db, n);
  const todos = (q) => fb.getDocs(q).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }))).catch((e) => { console.warn("Painel:", e.code || e.message); return []; });
  const ordenado = (n, campo, lim) => todos(fb.query(col(n), fb.orderBy(campo, "desc"), fb.limit(lim))).then((l) => (l.length ? l : todos(fb.query(col(n), fb.limit(lim)))));
  const contar = (n) => fb.getCountFromServer(col(n)).then((s) => s.data().count).catch(() => null);
  const contarQ = (q) => fb.getCountFromServer(q).then((s) => s.data().count).catch(() => null);
  const dias = (n) => fb.Timestamp.fromMillis(Date.now() - n * 864e5);
  const pub = col("perfis_publicos");
  const contarPessoas = async () => {
    const entre = (campo, de, ate) => contarQ(fb.query(pub, fb.where(campo, ">=", dias(de)), ...(ate ? [fb.where(campo, "<", dias(ate))] : [])));
    const [total, verificados, novos7, novos7a, novos30, novos30a, ativos1, ativos7, ativos30] = await Promise.all([
      contar("perfis_publicos"), contarQ(fb.query(pub, fb.where("verificado", "==", true))),
      entre("criadoEm", 7), entre("criadoEm", 14, 7), entre("criadoEm", 30), entre("criadoEm", 60, 30),
      entre("ultimoAcesso", 1), entre("ultimoAcesso", 7), entre("ultimoAcesso", 30)
    ]);
    return { total, verificados, novos7, novos7a, novos30, novos30a, ativos1, ativos7, ativos30 };
  };
  const contarNeg = async () => {
    const tipos = ["servicos", "delivery", "lojinha", "imoveis", "saude"];
    const [total, anuncios, ...porTipo] = await Promise.all([contar("negocios"), contar("anuncios"), ...tipos.map((t) => contarQ(fb.query(col("negocios"), fb.where("tipo", "==", t))))]);
    return { total, anuncios, ...Object.fromEntries(tipos.map((t, i) => [t, porTipo[i]])) };
  };
  if (mostrar) $("atualizado").textContent = "Atualizando...";
  const seteDias = fb.Timestamp.fromMillis(Date.now() - 7 * 864e5);
  const [contPessoas, pendVerif, negocios, anuncios, posts, denuncias, queixas, suporte, parcerias, sancoes, exclusoes, notas, comunicados, log, admins, estatisticas, nPosts, nConversas, nComentarios, nAvaliacoes, nPosts7] = await Promise.all([
    // Pessoas: só os totais e os pedidos de verificação (cada pessoa é lida quando aparece na tela).
    contarPessoas(), pode("moderar") ? todos(fb.query(col("usuarios"), fb.where("solicitacaoVerificacao", "==", true), fb.limit(200))) : Promise.resolve([]),
    // Negócios: só os totais (a lista é paginada na seção Negócios e lida inteira só quando uma seção precisa)
    contarNeg(), Promise.resolve(null),
    Promise.resolve([]) /* publicações: só os totais; a lista vem junto com a dos negócios */, todos(fb.query(col("denuncias"), fb.limit(1500))), todos(fb.query(col("queixas"), fb.limit(1500))),
    ordenado("suporte", "atualizadoEm", 500), todos(fb.query(col("parcerias"), fb.limit(500))), todos(fb.query(col("sancoes"), fb.limit(1000))),
    todos(fb.query(col("exclusoes"), fb.limit(1000))), todos(fb.query(col("notas"), fb.limit(5000))), todos(fb.query(col("comunicados"), fb.limit(100))),
    pode("dono") ? ordenado("admin_log", "em", 300) : Promise.resolve([]), todos(fb.query(col("admins"), fb.limit(50))), ordenado("estatisticas", "dia", 400),
    contar("diario"), pode("moderar") ? contar("conversas") : Promise.resolve(null), contar("comentarios"), contar("avaliacoes"),
    contarQ(fb.query(col("diario"), fb.where("criadoEm", ">=", seteDias)))
  ]);
  D.pessoas = new Map(); D.pessoasCompletas = false;
  D.contPessoas = contPessoas;
  // Gráfico "Novos usuários por dia": vem do relatório diário automático (estatisticas/) quando
  // ele cobre o mês; sem ele, lê só quem entrou nos últimos 30 dias.
  const diasMes = new Set(Array.from({ length: 30 }, (_, i) => new Date(Date.now() - 3 * 3600e3 - i * 864e5).toISOString().slice(0, 10)));
  const cobertos = estatisticas.filter((x) => diasMes.has(x.id) && typeof x.novos === "number");
  D.novos30 = cobertos.length >= 25
    ? cobertos.flatMap((x) => { const t = new Date(x.id + "T12:00:00-03:00").getTime(); return Array(Math.min(x.novos, 5000)).fill({ toMillis: () => t }); })
    : await fb.getDocs(fb.query(pub, fb.where("criadoEm", ">=", dias(30)), fb.limit(3000))).then((s) => s.docs.map((d) => d.data().criadoEm)).catch(() => []);
  D.pendVerif = pendVerif.filter((u) => !u.verificado).map((u) => u.id);
  D.contNeg = negocios;
  D.negociosProntos = false; D.negocios = []; D.anuncios = []; D.posts = [];
  Object.assign(D, { posts, denuncias, queixas, suporte, parcerias, comunicados, log, admins, estatisticas });
  // Suporte nacional: TODOS os chamados esperando a equipe (não só os 500 mexidos por último), para a fila e o "Pegar o próximo".
  const esperando = await todos(fb.query(col("suporte"), fb.where("status", "==", "aberto"), fb.limit(2000)));
  const jaSup = new Set(D.suporte.map((x) => x.id));
  D.suporte.push(...esperando.filter((x) => !jaSup.has(x.id)));
  D.respostasSup = await todos(fb.query(col("suporte_respostas"), fb.limit(300)));
  // Reportes do suporte (só moderação e donos leem) e notas do atendimento.
  let planosAtivos;
  [D.reportes, D.notasSuporte, D.verificacoes, D.planosPedidos, D.planosNeg, planosAtivos] = await Promise.all([
    pode("moderar") ? todos(fb.query(col("reportes"), fb.limit(500))) : Promise.resolve([]),
    todos(fb.query(col("suporte_notas"), fb.limit(2000))),
    pode("moderar") ? todos(fb.query(col("verificacoes"), fb.limit(500))) : Promise.resolve([]),
    // Planos e negociações (só donos): sem as regras novas publicadas a leitura falha e a seção fica vazia.
    pode("dono") ? todos(fb.query(col("planos_pedidos"), fb.limit(1000))).catch(() => []) : Promise.resolve([]),
    pode("dono") ? todos(fb.query(col("planos_negociacoes"), fb.limit(500))).catch(() => []) : Promise.resolve([]),
    todos(fb.query(col("planos"), fb.limit(1000))).catch(() => [])
  ]);
  D.planos = new Map(planosAtivos.map((p) => [p.id, p]));
  // Pedidos de verificação: os do usuarios.solicitacaoVerificacao e os da coleção nova.
  D.pendVerif = [...new Set([...D.pendVerif, ...D.verificacoes.filter((v) => v.status === "pendente" || v.status === "em_analise").map((v) => v.id)])];
  D.sancoes = new Map(sancoes.map((s) => [s.id, s]));
  D.exclusoes = new Map(exclusoes.map((s) => [s.id, s]));
  D.notas = new Map(notas.map((n) => [n.id, n]));
  // Só as pessoas que aparecem nas listas da equipe (denúncias, chamados, sanções...).
  await carregarPessoas([
    ...D.pendVerif, ...denuncias.flatMap((d) => [d.alvoId, d.autorId]), ...queixas.flatMap((q) => [q.alvoId, q.autorId]),
    ...suporte.map((s) => s.uid), ...parcerias.map((p) => p.uid), ...sancoes.map((s) => s.id), ...exclusoes.map((s) => s.id),
    ...log.flatMap((x) => [x.alvo, x.por]), ...admins.map((a) => a.id), ...D.reportes.flatMap((r) => [r.autorId, r.alvoId]), ...D.verificacoes.map((v) => v.id), ...D.planosPedidos.map((p) => p.uid), ...D.planosNeg.map((n) => n.uid || n.id), ...D.planos.keys()
  ]);
  D.contagens = { diario: nPosts, diario7: nPosts7, conversas: nConversas, comentarios: nComentarios, avaliacoes: nAvaliacoes };
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
  C.papel = PAPEIS[ficha?.papel] ? ficha.papel : "dono";
  C.tarefas = [];
  document.body.dataset.papel = C.papel;
  document.querySelectorAll("[data-so-dono]").forEach((b) => { b.hidden = !pode("dono"); });
  const mp = $("meuPapel"); if (mp) { mp.textContent = PAPEIS[C.papel]; mp.hidden = false; }
  C.irPara = irPara;
  C.contadores = contadores;
  C.recarregar = (mostrar) => carregar(mostrar);
  $("app").hidden = false;
  document.querySelectorAll(".ad-nav").forEach((b) => b.addEventListener("click", () => irPara(b.dataset.secao)));
  $("equipeOnline").addEventListener("click", () => irPara("equipe"));
  // Menu lateral (celular): abre com fundo escuro, trava a página de trás (a rolagem fica no menu) e
  // fecha ao tocar fora.
  $("btMenu").addEventListener("click", () => menuLateral(!$("lateral").classList.contains("aberta")));
  $("btAtualizar").addEventListener("click", async () => { await carregar(true); toast("Dados atualizados"); });
  // Celular: a lupa abre o campo de busca por cima da barra; o × (ou Esc) fecha.
  const topoBusca = document.querySelector(".ad-topo");
  const fecharBusca = () => { topoBusca.classList.remove("buscando"); $("buscaGlobal").blur(); };
  $("btBuscaCel").addEventListener("click", () => { topoBusca.classList.add("buscando"); $("buscaGlobal").placeholder = "Nome, @, e-mail, telefone ou ID"; $("buscaGlobal").focus(); });
  $("btBuscaFechar").addEventListener("click", (e) => { e.preventDefault(); $("buscaGlobal").value = ""; fecharBusca(); });
  $("buscaGlobal").addEventListener("keydown", (e) => { if (e.key === "Escape") fecharBusca(); });
  $("buscaGlobal").addEventListener("blur", () => setTimeout(() => { if (!$("buscaGlobal").value.trim() && document.activeElement !== $("buscaGlobal")) topoBusca.classList.remove("buscando"); }, 150));
  let tempo; $("buscaGlobal").addEventListener("input", (e) => { clearTimeout(tempo); const t = e.target.value; tempo = setTimeout(() => { if (t.trim()) irPara("usuarios", t.trim()); }, 300); });
  atual = (location.hash.slice(1) || "visao");
  await carregar(true);
  equipeAoVivo();
  marcarEntrada();
})();

// Primeira entrada do dia no painel vai para o registro (o histórico de cada pessoa começa por ela).
function marcarEntrada() {
  const dia = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10), chave = `hf-painel-entrou-${C.eu.uid}`;
  try { if (localStorage.getItem(chave) === dia) return; localStorage.setItem(chave, dia); } catch {}
  registrar("entrou", "", `Papel: ${PAPEIS[C.papel] || C.papel}`);
}

function menuLateral(abrir) {
  const lat = $("lateral");
  lat.classList.toggle("aberta", abrir);
  document.documentElement.classList.toggle("ad-menu-aberto", abrir);
  let fundo = document.querySelector(".ad-menu-fundo");
  if (abrir && !fundo && matchMedia("(max-width: 900px)").matches) { fundo = document.createElement("div"); fundo.className = "ad-menu-fundo"; fundo.addEventListener("click", () => menuLateral(false)); document.body.appendChild(fundo); }
  if (!abrir) fundo?.remove();
}
