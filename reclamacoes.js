// =====================================================
// Reclamações do Help Floripa
// - Dois tipos de reclamação aparecem aqui:
//   1) aberta pelo cliente (queixas/{negocio}_{cliente}): motivo, relato e foto;
//      o negócio tem 7 dias para responder ("Sem resposta" depois disso);
//   2) avaliação com 1 ou 2 estrelas dada a um perfil de negócio (modelo antigo, continua valendo).
// - Botão "Abrir reclamação": escolhe um negócio com quem a pessoa conversou no chat.
// - Quem recebeu responde publicamente (reclamacoes/{id da avaliação}) e o
//   cliente que reclamou marca como resolvida.
// - Painel de cada pessoa (?pessoa=uid): reclamações recebidas e enviadas.
// - Sempre com o nome da pessoa, nunca "o negócio".
// =====================================================
import { fotoSegura, conferirEmail, emailPendente, MSG_EMAIL } from "./seguranca.js?v=1";
import { estrelas } from "./avaliacoes.js?v=17";
import { abrirQueixa, responderQueixa, resolverQueixa, semResposta, MOTIVOS, PRAZO_DIAS } from "./queixas.js?v=16";
import { NOMES_TIPO, PAGINA_TIPO } from "./vitrine.js?v=76";
import { docsComValidade, docsPorIds } from "./leituras.js?v=3";
import { lerLocal, noLocal, aoMudarLocal } from "./local-escolhido.js?v=3";

const $ = (id) => document.getElementById(id);
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const ms = (ts) => ts?.toMillis?.() ?? 0;
const data = (ts) => { const d = ts?.toDate?.(); return d ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : ""; };
const dataCurta = (ts) => { const d = ts?.toDate?.(); return d ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : ""; };
const iniciais = (n) => { const p = String(n || "?").trim().split(/\s+/); return ((p[0]?.[0] || "?") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase(); };
const primeiro = (n) => String(n || "").trim().split(/\s+/)[0] || "";
const COR = { servicos: "var(--c-servicos)", delivery: "var(--c-delivery)", lojinha: "var(--c-lojinha)", imoveis: "var(--c-imoveis)", saude: "#0fb5a6" };
const nomeClasse = (t) => (t === "lojinha" ? "Shopping" : NOMES_TIPO[t] || "Perfil");
const ROTULO = { pendente: "Aguardando", respondida: "Respondida", resolvida: "Resolvida" };
const CLASSE_ST = { pendente: "pend", respondida: "resp", resolvida: "resolv" };
const POR_PAGINA = 18;
const url = new URLSearchParams(location.search);

let fb = null, eu = null;
let todas = [];                 // reclamações carregadas
const respostas = new Map();    // id da avaliação -> resposta
const negocios = new Map();     // negocioId -> dados
const pessoas = new Map();      // uid -> perfil público
let aba = "todas", classe = "todas", termo = "", limite = POR_PAGINA;
let pessoa = "", lado = "recebidas";

function toast(t) {
  const d = el("div", "vt-toast", t);
  Object.assign(d.style, { position: "fixed", left: "50%", bottom: "24px", transform: "translateX(-50%)", zIndex: 9300, padding: "12px 18px", borderRadius: "12px", background: "var(--text)", color: "var(--panel)", fontWeight: 700, maxWidth: "90vw" });
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 3200);
}
const tipoDe = (r) => negocios.get(r.negocioId)?.tipo || String(r.negocioId || "").split("_").pop();
const estado = (r) => { const s = respostas.get(r.id); return s?.resolvido ? "resolvida" : s?.texto ? "respondida" : "pendente"; };
const ehQueixa = (r) => r.origem === "queixa";
const atrasada = (r) => ehQueixa(r) && semResposta(r.dados);

// ---------- quem é quem ----------
function alvo(r) {
  const p = pessoas.get(r.alvoId) || {}, n = negocios.get(r.negocioId) || {};
  const nome = p.nome || n.nome || "Usuário";
  const perfil = n.nome && n.nome.trim().toLowerCase() !== nome.trim().toLowerCase() ? n.nome : "";
  return { uid: r.alvoId, nome, perfil, foto: fotoSegura(p.fotoPerfil) || fotoSegura(n.foto), nick: p.nickname || "", cidade: p.cidade || n.cidade || "" };
}
function autor(r) {
  const p = pessoas.get(r.autorId) || {};
  return { uid: r.autorId, nome: p.excluido ? "Ex-usuário" : (p.nome || r.autorNome || "Cliente"), foto: fotoSegura(p.fotoPerfil) || fotoSegura(r.autorFoto), nick: p.nickname || "", cidade: p.cidade || "" };
}
function dadosPessoa(uid) {
  const p = pessoas.get(uid);
  if (p) return { uid, nome: p.nome || "Usuário", foto: fotoSegura(p.fotoPerfil), nick: p.nickname || "", cidade: p.cidade || "" };
  const r = todas.find((x) => x.alvoId === uid);
  if (r) return alvo(r);
  const r2 = todas.find((x) => x.autorId === uid);
  if (r2) return autor(r2);
  if (uid === eu?.uid) return { uid, nome: eu.displayName || "Você", foto: fotoSegura(eu.photoURL), nick: "", cidade: "" };
  return { uid, nome: "Usuário", foto: "", nick: "", cidade: "" };
}
const eh = (uid) => uid === eu?.uid;
const chamar = (p) => (eh(p.uid) ? "Você" : p.nome);
function avatar(p, cls = "av") {
  const a = el("span", cls);
  if (p.foto) { const i = document.createElement("img"); i.src = p.foto; i.alt = ""; i.loading = "lazy"; a.appendChild(i); } else a.textContent = iniciais(p.nome);
  return a;
}
function linkPerfil(uid) { return eh(uid) ? "usuarios.html" : `usuarios.html?perfil=${encodeURIComponent(uid)}`; }
function linkVitrine(r) {
  const t = tipoDe(r);
  return t === "imoveis" || !PAGINA_TIPO[t] ? linkPerfil(r.alvoId) : `${PAGINA_TIPO[t]}?negocio=${encodeURIComponent(r.negocioId)}`;
}

// ---------- carregar ----------
// Nacional: as 100 mais recentes do Brasil (avaliações 1–2 e reclamações abertas), com "Carregar mais" buscando
// as próximas no servidor, e SEMPRE as suas (e as da pessoa do painel) por consulta própria — antes o seu
// painel só via o que estivesse entre as 450 carregadas do país inteiro. Cada lista vale 5 min no aparelho.
const V = 5 * 60000, LIM = 100;
const carregadas = new Map();   // id -> reclamação (sem repetir)
const pessoasLidas = new Set(); // uids com as recebidas/enviadas já lidas
let fimAval = null, fimQx = null, temMais = false, ordenado = true;

function deQueixa(d) {
  const q = d.data(), id = "q_" + d.id;
  if (q.resposta || q.status === "resolvida") respostas.set(id, { texto: q.resposta || "", criadoEm: q.respondidaEm, resolvido: q.status === "resolvida", resolvidoEm: q.resolvidaEm, autorId: q.alvoId });
  return { id, qid: d.id, origem: "queixa", dados: q, negocioId: q.negocioId, alvoId: q.alvoId, autorId: q.autorId, autorNome: q.autorNome, nota: 0, comentario: q.texto, motivo: q.motivo, foto: q.foto, criadoEm: q.abertaEm || q.criadoEm };
}
const deAval = (d) => ({ id: d.id, ...d.data() });
const baixa = (r) => r.tipo === "negocio" && (r.nota === 1 || r.nota === 2);

// Respostas, negócios e perfis só do que ainda não foi lido, em lote (30 por consulta).
async function completar(novas) {
  const idsAval = novas.filter((r) => r.origem !== "queixa" && !respostas.has(r.id)).map((r) => r.id);
  const ids = [...new Set(novas.map((r) => r.negocioId).filter((id) => id && !negocios.has(id)))];
  const uids = [...new Set([...novas.flatMap((r) => [r.alvoId, r.autorId]), pessoa, eu.uid].filter((u) => u && !pessoas.has(u)))];
  const [resp, negs, perfs] = await Promise.all([
    docsPorIds(fb, "reclamacoes", idsAval, 60000).catch(() => new Map()),
    docsPorIds(fb, "negocios", ids, 30 * 60000).catch(() => new Map()),
    docsPorIds(fb, "perfis_publicos", uids, 10 * 60000).catch(() => new Map())
  ]);
  resp.forEach((d, id) => { if (d) respostas.set(id, d); });
  ids.forEach((id) => { const n = negs.get(id); negocios.set(id, n ? { id, ...n } : { id, tipo: id.split("_").pop() }); });
  uids.forEach((u) => pessoas.set(u, perfs.get(u) || { excluido: true })); // sem perfil público = conta excluída
}
function juntar(lista) {
  const novas = lista.filter((r) => r && !carregadas.has(r.id));
  novas.forEach((r) => carregadas.set(r.id, r));
  todas = [...carregadas.values()].sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
  return novas;
}

// Página do Brasil (a 1ª ou as seguintes, a partir de onde parou).
async function paginaBrasil() {
  const col = fb.collection(fb.db, "avaliacoes"), qcol = fb.collection(fb.db, "queixas");
  const seguinte = !!(fimAval || fimQx);
  const qAval = [fb.where("tipo", "==", "negocio"), fb.where("nota", "in", [1, 2]), fb.orderBy("criadoEm", "desc")];
  const qQx = [fb.orderBy("abertaEm", "desc")];
  let av, qx;
  try {
    [av, qx] = await Promise.all([
      seguinte ? (fimAval ? fb.getDocs(fb.query(col, ...qAval, fb.startAfter(fimAval), fb.limit(LIM))) : { docs: [] })
        : docsComValidade(fb, "recl-av", fb.query(col, ...qAval, fb.limit(LIM)), V),
      seguinte ? (fimQx ? fb.getDocs(fb.query(qcol, ...qQx, fb.startAfter(fimQx), fb.limit(LIM))) : { docs: [] })
        : docsComValidade(fb, "recl-qx", fb.query(qcol, ...qQx, fb.limit(LIM)), V).catch(() => fb.getDocs(fb.query(qcol, fb.limit(LIM)))).catch(() => ({ docs: [] }))
    ]);
  } catch (e) {
    // Sem o índice (tipo + nota + criadoEm) ainda criado: as de antes, sem ordem e sem "carregar mais".
    if (seguinte) throw e;
    console.warn("[Reclamações] sem o índice, lendo sem ordem:", e?.code || e);
    ordenado = false;
    const [n1, n2, q] = await Promise.all([
      docsComValidade(fb, "recl-n1", fb.query(col, fb.where("tipo", "==", "negocio"), fb.where("nota", "==", 1), fb.limit(LIM)), V),
      docsComValidade(fb, "recl-n2", fb.query(col, fb.where("tipo", "==", "negocio"), fb.where("nota", "==", 2), fb.limit(LIM)), V),
      docsComValidade(fb, "recl-qx", fb.query(qcol, ...qQx, fb.limit(LIM)), V).catch(() => ({ docs: [] }))
    ]);
    av = { docs: [...n1.docs, ...n2.docs] }; qx = q;
  }
  if (ordenado) {
    fimAval = av.docs.length === LIM ? av.docs[av.docs.length - 1] : null;
    fimQx = qx.docs.length === LIM ? qx.docs[qx.docs.length - 1] : null;
    temMais = !!(fimAval || fimQx);
  }
  return [...av.docs.map(deAval), ...qx.docs.map(deQueixa)];
}

// Recebidas e enviadas de uma pessoa (com igualdade e "in", sem índice composto).
async function daPessoa(uid) {
  if (!uid || pessoasLidas.has(uid)) return [];
  pessoasLidas.add(uid);
  const col = fb.collection(fb.db, "avaliacoes"), qcol = fb.collection(fb.db, "queixas");
  const ler = (k, q) => docsComValidade(fb, `recl-${k}-${uid}`, q, V).catch(() => ({ docs: [] }));
  const [ar, ae, qr, qe] = await Promise.all([
    ler("ar", fb.query(col, fb.where("alvoId", "==", uid), fb.where("nota", "in", [1, 2]), fb.limit(200))),
    ler("ae", fb.query(col, fb.where("autorId", "==", uid), fb.where("nota", "in", [1, 2]), fb.limit(200))),
    ler("qr", fb.query(qcol, fb.where("alvoId", "==", uid), fb.limit(200))),
    ler("qe", fb.query(qcol, fb.where("autorId", "==", uid), fb.limit(200)))
  ]);
  return [...[...ar.docs, ...ae.docs].map(deAval).filter(baixa), ...[...qr.docs, ...qe.docs].map(deQueixa)];
}

async function carregar() {
  carregadas.clear(); pessoasLidas.clear(); fimAval = fimQx = null; temMais = false;
  const [brasil, minhas, dele] = await Promise.all([paginaBrasil(), daPessoa(eu.uid), daPessoa(pessoa)]);
  await completar(juntar([...brasil, ...minhas, ...dele]));
  contarNoSite();
}
async function carregarMais() {
  const novas = juntar(await paginaBrasil());
  await completar(novas);
}
async function garantirPessoa(uid) {
  const novas = juntar(await daPessoa(uid));
  if (novas.length || !pessoas.has(uid)) await completar(novas);
}

// Total do site contado no servidor (a lista mostra só as mais recentes). Guardado 10 min no aparelho.
let totalSite = null;
async function contarNoSite() {
  try {
    const g = JSON.parse(localStorage.getItem("hf-recl-total") || "null");
    if (g && Date.now() - g.em < 10 * 60000) { totalSite = g.n; pintarNumeros(); return; }
  } catch {}
  try {
    const [a, q] = await Promise.all([
      fb.getCountFromServer(fb.query(fb.collection(fb.db, "avaliacoes"), fb.where("tipo", "==", "negocio"), fb.where("nota", "in", [1, 2]))),
      fb.getCountFromServer(fb.collection(fb.db, "queixas"))
    ]);
    totalSite = a.data().count + q.data().count;
    try { localStorage.setItem("hf-recl-total", JSON.stringify({ em: Date.now(), n: totalSite })); } catch {}
    pintarNumeros();
  } catch {}
}

// ---------- recortes ----------
const recebidasDe = (uid) => todas.filter((r) => r.alvoId === uid);
const enviadasDe = (uid) => todas.filter((r) => r.autorId === uid);
// Onde: Todo o Brasil, o estado ou a cidade escolhida no site (mesmo lugar do Início e das vitrines),
// pelo endereço do negócio que recebeu a reclamação.
let onde = "brasil";
const localDoSite = () => lerLocal() || {};
function noOnde(r) {
  if (onde === "brasil" || pessoa) return true;
  const f = localDoSite(), n = negocios.get(r.negocioId) || {}, p = pessoas.get(r.alvoId) || {};
  const item = n.uf || n.cidade ? n : p;
  return noLocal(item, onde === "estado" ? { uf: f.uf } : f);
}
function base() { return pessoa ? (lado === "enviadas" ? enviadasDe(pessoa) : recebidasDe(pessoa)) : todas.filter(noOnde); }
function filtradas() {
  return base().filter((r) => {
    if (aba !== "todas" && estado(r) !== aba) return false;
    if (classe !== "todas" && tipoDe(r) !== classe) return false;
    if (termo) {
      const a = alvo(r), b = autor(r);
      const t = [a.nome, a.perfil, b.nome, r.comentario, respostas.get(r.id)?.texto].join(" ").toLowerCase();
      if (!t.includes(termo)) return false;
    }
    return true;
  });
}

// ---------- painéis ----------
function numeros(lista) {
  const resp = lista.filter((r) => respostas.get(r.id)?.texto).length;
  const resolv = lista.filter((r) => respostas.get(r.id)?.resolvido).length;
  return { total: lista.length, resp, resolv, pend: lista.length - resp, pct: lista.length ? `${Math.round((resp / lista.length) * 100)}%` : "–" };
}
function pintarMeuPainel() {
  const eu_ = dadosPessoa(eu.uid);
  const rec = numeros(recebidasDe(eu.uid)), env = numeros(enviadasDe(eu.uid));
  $("mpAv").replaceWith(Object.assign(avatar(eu_), { id: "mpAv" }));
  $("mpNome").textContent = eu_.nome;
  $("mpRec").textContent = rec.total;
  $("mpEnv").textContent = env.total;
  $("mpResolv").textContent = rec.resolv + env.resolv;
  const ri = $("mpRecInfo");
  ri.textContent = rec.pend ? `${rec.pend} aguardando sua resposta` : rec.total ? "Todas respondidas" : "Nenhuma recebida";
  ri.className = rec.pend ? "alerta" : "";
  $("mpEnvInfo").textContent = env.total ? `${env.resp} com resposta` : "Nenhuma enviada";
  $("meuPainel").hidden = !!pessoa;
}
function pintarPainelPessoa() {
  const box = $("painelPessoa");
  box.hidden = !pessoa;
  $("visaoGeral").hidden = !!pessoa;
  if (!pessoa) return;
  const p = dadosPessoa(pessoa);
  const rec = numeros(recebidasDe(pessoa)), env = numeros(enviadasDe(pessoa));
  $("ppAv").replaceWith(Object.assign(avatar(p, "av grande"), { id: "ppAv" }));
  $("ppSelo").textContent = eh(pessoa) ? "Seu painel de reclamações" : "Painel de reclamações";
  $("ppNome").textContent = eh(pessoa) ? `${p.nome} (você)` : p.nome;
  const classes = [...new Set(recebidasDe(pessoa).map(tipoDe))].map(nomeClasse);
  $("ppSub").textContent = [p.nick ? "@" + p.nick : "", p.cidade, classes.join(", ")].filter(Boolean).join(" · ");
  $("ppPerfil").href = linkPerfil(pessoa);
  $("ppRec").textContent = rec.total;
  $("ppResp").textContent = rec.pct;
  $("ppResolv").textContent = rec.resolv;
  $("ppEnv").textContent = env.total;
  const nm = eh(pessoa) ? "você" : primeiro(p.nome);
  const [bR, bE] = $("ppAbas").querySelectorAll("[data-lado]");
  bR.querySelector("span").textContent = eh(pessoa) ? "Recebidas por você" : `Recebidas por ${nm}`;
  bE.querySelector("span").textContent = eh(pessoa) ? "Enviadas por você" : `Enviadas por ${nm}`;
  bR.querySelector("em").textContent = rec.total;
  bE.querySelector("em").textContent = env.total;
  $("ppAbas").querySelectorAll("[data-lado]").forEach((b) => b.setAttribute("aria-selected", b.dataset.lado === lado ? "true" : "false"));
}
function pintarNumeros() {
  const g = numeros(todas.filter(noOnde));
  $("nTotal").textContent = onde === "brasil" && totalSite != null ? Math.max(totalSite, g.total) : g.total;
  $("nTotalTx").textContent = onde === "brasil" ? "reclamações no Brasil" : `reclamações em ${onde === "estado" ? (localDoSite().uf || "") : rotuloOnde()}`;
  $("nNota").hidden = !(onde === "brasil" && totalSite > g.total);
  $("nNota").textContent = `Respondidas, aguardando e resolvidas contam as ${g.total} mais recentes.`;
  $("nResp").textContent = g.pct;
  $("nPend").textContent = g.pend;
  $("nResolv").textContent = g.resolv;
  const b = base();
  const conta = { todas: b.length, pendente: 0, respondida: 0, resolvida: 0 };
  b.forEach((r) => conta[estado(r)]++);
  document.querySelectorAll("#abasRec [data-aba]").forEach((bt) => { bt.querySelector("em").textContent = conta[bt.dataset.aba]; });
}

// ---------- cartão compacto ----------
function cartao(r) {
  const a = alvo(r), b = autor(r), t = tipoDe(r), st = estado(r), s = respostas.get(r.id);
  const c = el("article", "rec-card");
  c.tabIndex = 0;
  c.setAttribute("role", "button");
  c.setAttribute("aria-label", `Reclamação de ${chamar(b)} para ${chamar(a)}, ${ehQueixa(r) ? MOTIVOS[r.motivo] || "reclamação" : `${r.nota} ${r.nota === 1 ? "estrela" : "estrelas"}`}, ${atrasada(r) ? "sem resposta" : ROTULO[st]}`);
  c.style.setProperty("--c", COR[t] || "var(--accent)");

  const topo = el("div", "rc-topo");
  topo.append(el("span", "tag-classe", nomeClasse(t)), atrasada(r) ? el("span", "status mini atras", "Sem resposta") : el("span", "status mini " + CLASSE_ST[st], ROTULO[st]));
  const quem = el("div", "rc-pessoa");
  const tx = el("div", "rc-nome");
  tx.append(el("strong", null, chamar(a)), el("small", null, a.perfil || nomeClasse(t)));
  quem.append(avatar(a), tx);
  const nota = el("div", "rc-nota");
  if (ehQueixa(r)) nota.append(el("span", "rc-motivo", MOTIVOS[r.motivo] || "Reclamação"), el("small", null, dataCurta(r.criadoEm)));
  else nota.append(estrelas({ total: 1, soma: r.nota }, { soEstrelas: true }), el("small", null, dataCurta(r.criadoEm)));
  const texto = el("p", "rc-texto" + (r.comentario ? "" : " vazio"), r.comentario || "Nota sem comentário.");
  const rod = el("div", "rc-rodape");
  const de = el("span", "rc-de");
  de.append(avatar(b, "av mini"), el("span", null, `de ${eh(b.uid) ? "você" : primeiro(b.nome)}`));
  rod.appendChild(de);
  if (s?.texto) rod.appendChild(el("span", "rc-resp", `${eh(a.uid) ? "Você" : primeiro(a.nome)} respondeu`));
  if (eh(a.uid) && !s?.texto && st !== "resolvida") rod.appendChild(el("span", "rc-acao", "Responder"));
  c.append(topo, quem, nota, texto, rod);
  c.addEventListener("click", () => abrirDetalhe(r));
  c.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrirDetalhe(r); } });
  return c;
}

// ---------- detalhe ----------
let ultimoFoco = null, detalheAberto = null;
function abrirDetalhe(r) {
  detalheAberto = r;
  ultimoFoco = document.activeElement;
  pintarDetalhe(r);
  $("recModal").hidden = false;
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => $("recModal").classList.add("aberto"));
  $("recFechar").focus();
}
function fecharDetalhe() {
  if ($("recModal").hidden) return;
  $("recModal").classList.remove("aberto");
  $("recModal").hidden = true;
  document.body.style.overflow = "";
  detalheAberto = null;
  ultimoFoco?.focus?.();
}
function pintarDetalhe(r) {
  const a = alvo(r), b = autor(r), t = tipoDe(r), st = estado(r), s = respostas.get(r.id);
  const corpo = $("recModalCorpo");
  corpo.replaceChildren();
  corpo.style.setProperty("--c", COR[t] || "var(--accent)");
  $("recModalTitulo").textContent = `Reclamação · ${nomeClasse(t)}`;

  // de quem -> para quem
  const par = el("div", "rd-par");
  const lado_ = (p, rot) => {
    const bt = el("button", "rd-lado"); bt.type = "button";
    const tx = el("span", "rd-lado-tx");
    tx.append(el("small", null, rot), el("strong", null, chamar(p)));
    bt.append(avatar(p), tx);
    bt.title = `Abrir o painel de ${chamar(p)}`;
    bt.addEventListener("click", () => { fecharDetalhe(); abrirPessoa(p.uid, rot === "Reclamou" ? "enviadas" : "recebidas"); });
    return bt;
  };
  const seta = el("span", "rd-seta"); seta.innerHTML = '<svg class="i xs" aria-hidden="true"><use href="#i-seta"/></svg>';
  par.append(lado_(b, "Reclamou"), seta, lado_(a, "Recebeu"));
  corpo.appendChild(par);

  const info = el("div", "rd-info");
  info.append(el("span", "tag-classe", nomeClasse(t)));
  if (a.perfil) info.appendChild(el("span", "rd-perfil", a.perfil));
  info.append(atrasada(r) ? el("span", "status atras", "Sem resposta") : el("span", "status " + CLASSE_ST[st], ROTULO[st]));
  corpo.appendChild(info);

  const nota = el("div", "rd-nota");
  if (ehQueixa(r)) {
    nota.append(el("span", "rc-motivo", MOTIVOS[r.motivo] || "Reclamação"), el("span", null, `Aberta em ${data(r.criadoEm)}${(r.dados.aberturas || 1) > 1 ? " · reaberta" : ""}`));
  } else nota.append(estrelas({ total: 1, soma: r.nota }, { soEstrelas: true }), el("span", null, `${r.nota} de 5 · ${data(r.criadoEm)}`));
  corpo.appendChild(nota);
  corpo.appendChild(el("blockquote", "rd-texto" + (r.comentario ? "" : " vazio"), r.comentario || `${chamar(b)} deu a nota sem escrever comentário.`));
  if (ehQueixa(r) && r.foto) { const im = document.createElement("img"); im.className = "rd-foto"; im.src = fotoSegura(r.foto); im.alt = "Foto anexada pelo cliente"; im.loading = "lazy"; if (im.src) corpo.appendChild(im); }
  if (ehQueixa(r) && st === "pendente") {
    const dias = Math.max(0, PRAZO_DIAS - Math.floor((Date.now() - ms(r.criadoEm)) / 864e5));
    corpo.appendChild(el("p", "rd-prazo" + (atrasada(r) ? " atras" : ""), atrasada(r) ? `Prazo de ${PRAZO_DIAS} dias para responder terminou sem resposta.` : `${dias} ${dias === 1 ? "dia" : "dias"} para ${eh(a.uid) ? "você responder" : "o negócio responder"}.`));
  }

  if (s?.texto) {
    const bx = el("div", "resposta");
    const cab = el("div", "resposta-cab");
    cab.append(avatar(a, "av mini"), el("strong", null, eh(a.uid) ? "Sua resposta" : `Resposta de ${a.nome}`));
    bx.append(cab, el("p", null, s.texto));
    bx.appendChild(el("small", null, [data(s.criadoEm), s.editadoEm ? "editada" : "", s.resolvido ? `marcada como resolvida por ${eh(b.uid) ? "você" : primeiro(b.nome)} em ${data(s.resolvidoEm)}` : ""].filter(Boolean).join(" · ")));
    corpo.appendChild(bx);
  } else {
    corpo.appendChild(el("p", "rd-aguarda", eh(a.uid) ? "Você ainda não respondeu. Uma resposta educada mostra cuidado para todos os clientes." : `${a.nome} ainda não respondeu.`));
  }

  const acoes = el("div", "rec-acoes");
  if (eh(a.uid) && !(ehQueixa(r) && st === "resolvida")) {
    const bt = el("button", "botao" + (s?.texto ? " sec" : ""), s?.texto ? "Editar resposta" : "Responder publicamente");
    bt.type = "button";
    bt.addEventListener("click", () => abrirResposta(corpo, r, s, acoes));
    acoes.appendChild(bt);
  }
  if (eh(b.uid) && ehQueixa(r)) {
    // Reclamação aberta pelo cliente: ele marca resolvida a qualquer momento; resolvida, pode reabrir com relato novo.
    const bt = el("button", "botao" + (st === "resolvida" ? " sec" : ""), st === "resolvida" ? "Reabrir com relato novo" : "Marcar como resolvida");
    bt.type = "button";
    bt.addEventListener("click", () => (st === "resolvida" ? reabrir(r) : marcarResolvida(r, true, bt)));
    acoes.appendChild(bt);
  } else if (eh(b.uid) && s) {
    const bt = el("button", "botao" + (s.resolvido ? " sec" : ""), s.resolvido ? "Reabrir reclamação" : "Marcar como resolvida");
    bt.type = "button";
    bt.addEventListener("click", () => marcarResolvida(r, !s.resolvido, bt));
    acoes.appendChild(bt);
  }
  const painel = el("button", "botao sec", eh(a.uid) ? "Meu painel" : `Painel de ${primeiro(a.nome)}`); painel.type = "button";
  painel.addEventListener("click", () => { fecharDetalhe(); abrirPessoa(a.uid, "recebidas"); });
  const ver = el("a", "botao sec", eh(a.uid) ? "Meu perfil" : `Perfil de ${primeiro(a.nome)}`); ver.href = linkVitrine(r);
  acoes.append(painel, ver);
  corpo.appendChild(acoes);
}

async function precisaEmail() {
  if (!emailPendente(eu)) return false;
  if (await conferirEmail(eu)) return false;
  toast(MSG_EMAIL);
  return true;
}
function abrirResposta(corpo, r, s, acoes) {
  if (corpo.querySelector(".rec-form")) return;
  const f = el("div", "rec-form campo");
  const lb = el("label", null, s ? "Editar sua resposta pública" : "Sua resposta pública"); lb.htmlFor = "resp_" + r.id;
  const tx = el("textarea"); tx.id = "resp_" + r.id; tx.maxLength = 1000; tx.value = s?.texto || "";
  tx.placeholder = "Explique o que aconteceu e como vai resolver. Seja educado: todos podem ler.";
  const aj = el("span", "ajuda", "Até 1000 caracteres. A resposta fica visível para todos, junto da reclamação.");
  const lin = el("div", "rec-acoes");
  const env = el("button", "botao", s ? "Salvar" : "Publicar resposta"); env.type = "button";
  const can = el("button", "botao sec", "Cancelar"); can.type = "button";
  can.addEventListener("click", () => { f.remove(); acoes.hidden = false; });
  env.addEventListener("click", async () => {
    const texto = tx.value.trim();
    if (texto.length < 2) { tx.focus(); return; }
    if (await precisaEmail()) return;
    env.disabled = true;
    try {
      if (ehQueixa(r)) {
        await responderQueixa(fb, r.qid, texto);
        respostas.set(r.id, { texto, criadoEm: { toMillis: () => Date.now(), toDate: () => new Date() }, autorId: eu.uid });
        toast(s?.texto ? "Resposta atualizada" : "Resposta publicada");
        pintar(); pintarDetalhe(r);
        return;
      }
      const ref = fb.doc(fb.db, "reclamacoes", r.id);
      if (s) await fb.updateDoc(ref, { texto, editadoEm: fb.serverTimestamp() });
      else await fb.setDoc(ref, { texto, autorId: eu.uid, criadoEm: fb.serverTimestamp() });
      respostas.set(r.id, (await fb.getDoc(ref)).data());
      toast(s ? "Resposta atualizada" : "Resposta publicada");
      pintar();
      pintarDetalhe(r);
    } catch (e) { console.error(e); env.disabled = false; toast("Não foi possível salvar a resposta. Tente de novo."); }
  });
  lin.append(env, can);
  f.append(lb, tx, aj, lin);
  acoes.hidden = true;
  corpo.appendChild(f);
  tx.focus();
}
async function marcarResolvida(r, sim, bt) {
  if (await precisaEmail()) return;
  bt.disabled = true;
  try {
    if (ehQueixa(r)) {
      await resolverQueixa(fb, r.qid);
      r.dados.status = "resolvida";
      respostas.set(r.id, { ...(respostas.get(r.id) || { texto: "" }), resolvido: true, resolvidoEm: { toMillis: () => Date.now(), toDate: () => new Date() } });
      toast("Obrigado! Reclamação marcada como resolvida.");
      pintar(); pintarDetalhe(r);
      return;
    }
    const ref = fb.doc(fb.db, "reclamacoes", r.id);
    await fb.updateDoc(ref, { resolvido: sim, resolvidoEm: fb.serverTimestamp() });
    respostas.set(r.id, (await fb.getDoc(ref)).data());
    toast(sim ? "Obrigado! Reclamação marcada como resolvida." : "Reclamação reaberta");
    pintar();
    pintarDetalhe(r);
  } catch (e) { console.error(e); bt.disabled = false; toast("Não foi possível atualizar agora."); }
}

// ---------- abrir reclamação ----------
async function negocioPorId(id) {
  if (negocios.has(id) && negocios.get(id).donoId) return negocios.get(id);
  const s = await fb.getDoc(fb.doc(fb.db, "negocios", id)).catch(() => null);
  const n = s?.exists() ? { id, ...s.data() } : null;
  if (n) negocios.set(id, n);
  return n;
}
async function iniciarQueixa(n) {
  if (!n) { toast("Negócio não encontrado."); return; }
  abrirQueixa(fb, eu, n, { autor: { nome: dadosPessoa(eu.uid).nome }, aoAbrir: async () => {
    toast("Reclamação enviada. O negócio tem 7 dias para responder.");
    respostas.clear(); await carregar(); abrirPessoa(eu.uid, "enviadas");
  } });
}
function reabrir(r) { fecharDetalhe(); negocioPorId(r.negocioId).then(iniciarQueixa); }
// Lista os negócios de quem a pessoa já conversou no chat (só eles podem receber reclamação dela).
async function escolherNegocio() {
  const fundo = el("div", "rec-modal escolher aberto"); fundo.setAttribute("role", "dialog"); fundo.setAttribute("aria-modal", "true");
  const caixa = el("div", "rec-caixa");
  const cab = el("div", "rec-escolher-cab");
  cab.append(el("strong", null, "De qual negócio você quer reclamar?"));
  const x = el("button", "botao sec mini", "Fechar"); x.type = "button";
  const fechar = () => { fundo.remove(); document.body.style.overflow = ""; };
  x.addEventListener("click", fechar);
  fundo.addEventListener("click", (e) => { if (e.target === fundo) fechar(); });
  cab.appendChild(x);
  const lista = el("div", "rec-escolher-lista", "Carregando...");
  caixa.append(cab, el("p", "ajuda", "Aparecem os negócios com quem você já conversou pelo chat do Help Floripa."), lista);
  fundo.appendChild(caixa);
  document.body.appendChild(fundo);
  document.body.style.overflow = "hidden";
  try {
    const conv = await fb.getDocs(fb.query(fb.collection(fb.db, "conversas"), fb.where("participantes", "array-contains", eu.uid), fb.limit(60)));
    const outros = [...new Set(conv.docs.filter((d) => d.data().falaram?.[eu.uid]).map((d) => (d.data().participantes || []).find((x) => x !== eu.uid)).filter(Boolean))];
    const negs = [];
    for (let k = 0; k < outros.length; k += 30) {
      const s = await fb.getDocs(fb.query(fb.collection(fb.db, "negocios"), fb.where("donoId", "in", outros.slice(k, k + 30)))).catch(() => ({ docs: [] }));
      s.docs.forEach((d) => { const n = { id: d.id, ...d.data() }; negocios.set(d.id, n); if (n.nome && n.oculto !== true) negs.push(n); });
    }
    lista.replaceChildren();
    if (!negs.length) { lista.append(el("p", "lista-vazia", "Você ainda não conversou com nenhum negócio pelo chat. Abra o perfil do negócio e mande uma mensagem primeiro.")); return; }
    negs.forEach((n) => {
      const b = el("button", "rec-escolher-item"); b.type = "button";
      b.style.setProperty("--c", COR[n.tipo] || "var(--accent)");
      const p = { nome: n.nome, foto: fotoSegura(n.foto) };
      const tx = el("span", "tx"); tx.append(el("strong", null, n.nome), el("small", null, [nomeClasse(n.tipo), n.cidade].filter(Boolean).join(" · ")));
      b.append(avatar(p), tx);
      b.addEventListener("click", () => { fechar(); iniciarQueixa(n); });
      lista.appendChild(b);
    });
  } catch (e) { console.error(e); lista.replaceChildren(el("p", "lista-vazia", "Não foi possível carregar seus negócios agora.")); }
}

// ---------- lista ----------
function pintar() {
  pintarMeuPainel();
  pintarPainelPessoa();
  pintarNumeros();
  const lista = $("listaRec");
  const itens = filtradas();
  lista.replaceChildren();
  if (!itens.length) {
    const v = el("div", "lista-vazia");
    let t = "Nada encontrado", d = "Tente outra situação, classe ou palavra.";
    if (!base().length) {
      const nm = eh(pessoa) ? "você" : primeiro(dadosPessoa(pessoa).nome);
      if (!pessoa) { t = "Nenhuma reclamação por aqui"; d = "Ótimo sinal: ninguém reclamou nem deu nota 1 ou 2 até agora."; }
      else if (lado === "recebidas") { t = eh(pessoa) ? "Você não tem reclamações" : `${nm} não tem reclamações`; d = "Nenhuma reclamação aberta e nenhuma nota 1 ou 2."; }
      else { t = eh(pessoa) ? "Você não enviou reclamações" : `${nm} não enviou reclamações`; d = "Nenhuma reclamação aberta e nenhuma nota 1 ou 2 dada."; }
    }
    v.append(el("strong", null, t), d);
    lista.appendChild(v);
  }
  itens.slice(0, limite).forEach((r) => lista.appendChild(cartao(r)));
  // Acabou o que está na tela: o botão busca as próximas no servidor (lista do Brasil).
  $("maisRec").hidden = itens.length <= limite && !(temMais && !pessoa);
  pintarOnde();
}

// ---------- navegação entre painéis ----------
async function abrirPessoa(uid, l = "recebidas", empilhar = true) {
  pessoa = uid || ""; lado = l; limite = POR_PAGINA;
  if (pessoa && !pessoasLidas.has(pessoa)) { $("listaRec").replaceChildren(Object.assign(el("div", "lista-vazia"), { textContent: "Carregando reclamações..." })); try { await garantirPessoa(pessoa); } catch (e) { console.warn(e); } }
  if (empilhar) {
    const u = new URL(location.href);
    ["negocio", "aba", "pessoa", "lado"].forEach((k) => u.searchParams.delete(k));
    if (pessoa) { u.searchParams.set("pessoa", pessoa); if (lado !== "recebidas") u.searchParams.set("lado", lado); }
    history.pushState({ pessoa, lado }, "", u);
  }
  pintar();
  (pessoa ? $("painelPessoa") : $("meuPainel")).scrollIntoView({ behavior: "smooth", block: "start" });
}
window.addEventListener("popstate", () => {
  const q = new URLSearchParams(location.search);
  pessoa = q.get("pessoa") || ""; lado = q.get("lado") === "enviadas" ? "enviadas" : "recebidas";
  fecharDetalhe();
  if (eu) (pessoa && !pessoasLidas.has(pessoa) ? garantirPessoa(pessoa).catch(() => {}) : Promise.resolve()).then(pintar);
});

// ---------- filtros ----------
document.querySelectorAll("#abasRec [data-aba]").forEach((b) => b.addEventListener("click", () => {
  aba = b.dataset.aba; limite = POR_PAGINA;
  document.querySelectorAll("#abasRec [data-aba]").forEach((x) => x.setAttribute("aria-selected", x === b ? "true" : "false"));
  pintar();
}));
$("filterChips").addEventListener("click", (e) => { const c = e.target.closest(".chip"); if (!c) return; classe = c.dataset.filter; limite = POR_PAGINA; setTimeout(pintar, 0); });
$("searchInput").addEventListener("input", (e) => { termo = e.target.value.trim().toLowerCase(); limite = POR_PAGINA; pintar(); });
$("maisRec").addEventListener("click", async () => {
  const bt = $("maisRec");
  if (filtradas().length <= limite && temMais && !pessoa) {
    bt.disabled = true; bt.textContent = "Carregando...";
    try { await carregarMais(); } catch (e) { console.warn(e); toast("Não foi possível carregar mais agora."); }
    bt.disabled = false; bt.textContent = "Carregar mais";
  }
  limite += POR_PAGINA; pintar();
});
function rotuloOnde() { const f = localDoSite(); return f.cidade ? `${f.cidade}${f.uf ? "/" + f.uf : ""}` : f.uf || ""; }
// Chips "Todo o Brasil · Estado · Cidade" (só aparecem com um lugar escolhido no site).
function pintarOnde() {
  const box = $("ondeRec"), f = localDoSite();
  box.hidden = !!pessoa || !f.uf;
  if (box.hidden) return;
  const ops = [["brasil", "Todo o Brasil"], ["estado", f.uf]];
  if (f.cidadeIbge || f.cidade) ops.push(["cidade", rotuloOnde()]);
  if (!ops.some(([k]) => k === onde)) onde = "brasil";
  box.replaceChildren(...ops.map(([k, t]) => {
    const b = el("button", "chip" + (k === onde ? " active" : ""), t); b.type = "button";
    b.setAttribute("aria-pressed", k === onde ? "true" : "false");
    b.addEventListener("click", () => { onde = k; limite = POR_PAGINA; pintar(); });
    return b;
  }));
}
aoMudarLocal(() => { onde = "brasil"; if (eu) pintar(); });
$("ppAbas").querySelectorAll("[data-lado]").forEach((b) => b.addEventListener("click", () => abrirPessoa(pessoa, b.dataset.lado)));
$("ppVoltar").addEventListener("click", () => abrirPessoa("", "recebidas"));
$("mpAbrir").addEventListener("click", () => abrirPessoa(eu.uid, "recebidas"));
$("btnAbrirReclamacao")?.addEventListener("click", () => { if (eu) escolherNegocio(); });
document.querySelectorAll("#meuPainel [data-lado]").forEach((b) => b.addEventListener("click", () => abrirPessoa(eu.uid, b.dataset.lado)));
$("recFechar").addEventListener("click", fecharDetalhe);
$("recModal").addEventListener("click", (e) => { if (e.target === $("recModal")) fecharDetalhe(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") fecharDetalhe(); });

// ---------- início ----------
(async function iniciar() {
  for (let i = 0; i < 100 && (!window.firebaseAuth || !window.firebaseDb); i++) await new Promise((r) => setTimeout(r, 50));
  if (!window.firebaseDb) return;
  const [auth, fs] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
  ]);
  fb = { ...fs, db: window.firebaseDb };
  auth.onAuthStateChanged(window.firebaseAuth, async (u) => {
    if (!u || eu) return;
    eu = u;
    // Endereços antigos: ?aba=recebidas (meu painel) e ?negocio=uid_tipo (painel do dono).
    if (url.get("pessoa")) { pessoa = url.get("pessoa"); lado = url.get("lado") === "enviadas" ? "enviadas" : "recebidas"; }
    else if (url.get("aba") === "recebidas") pessoa = eu.uid;
    else if (url.get("negocio")) {
      const n = url.get("negocio");
      pessoa = n.slice(0, n.lastIndexOf("_")) || "";
      const t = n.split("_").pop();
      document.querySelector(`#filterChips [data-filter="${CSS.escape(t)}"]`)?.click();
    }
    try {
      await carregar();
      pintar();
      // reclamacoes.html?abrir=negocioId (vindo do perfil do negócio): abre o formulário direto
      if (url.get("abrir")) negocioPorId(url.get("abrir")).then(iniciarQueixa);
    } catch (e) {
      console.error(e);
      $("listaRec").replaceChildren(Object.assign(el("div", "lista-vazia"), { textContent: "Não foi possível carregar as reclamações agora." }));
    }
  });
})();
