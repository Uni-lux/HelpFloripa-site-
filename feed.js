// =====================================================
// Diário (feed.html)
// - Aba Diário: flashes (24 h) e publicações (Principais ou Amigos), com
//   estrelas, comentários, enviar, compartilhar e salvar.
// - Aba Explorar (explorar.js): busca completa, em alta, enquetes abertas,
//   sugestões, negócios e destaques.
// Links: feed.html?aba=explorar · ?publicar=1 (?aba=registros, antigo, abre o Diário)
// Abas do topo: Diário (publicações com foto ou vídeo) | Registros (textos, enquetes e caixas de perguntas). O Explorar e a
// Comunidade ficam na barra de baixo (barra-rede.js); o Explorar abre aqui mesmo, sem recarregar.
// =====================================================
import { textoCidade } from "./endereco.js?v=1";
import {
  $, el, icone, ms, paraData, pintarAvatar, urlSegura, nomeCidade, tempoRelativo, toast, erroAmigavel,
  fb, eu, dados, meusSeguindo, escondido, ganchos, obterPerfil, iniciarRede, carregarMeusSeguindo, linhaPessoa,
  barraInteracao, abrirCompositor, abrirOpcoes, compartilharPerfil, botaoSeguir, montarBarraRede, marcarBarra, pintarBarraRede, ouvirAvisos, lerOrdenado,
  editarPublicacao, bloquear, comMencoes, fotosDoPost, carrosselFotos, contadorEstrelas, estaSalvo, alternarSalvo, escolherColecao, lerResumosEstrelas, contarComentarios,
  silenciado, alternarSilenciar, marcarVista, definirOrigem, jaVisto, confirmarHF, blocoEnquete, blocoCaixa, editarPublicoDoPost
} from "./rede.js?v=82";
import { afinidade, sincronizarGosto, registrarGosto, PESO } from "./gosto.js?v=2";
import { montarStories, abrirFlashPorId, repostarFlash } from "./stories.js?v=54";
import { abrirDenuncia } from "./denuncias.js?v=6";
import { pessoasRecentes } from "./pessoas.js?v=5";
import { abrirExplorar, definirCartao, abrirPublicacao } from "./explorar.js?v=64";
import { docsComValidade, docsPorIds } from "./leituras.js?v=3";
import { lerLocal } from "./local-escolhido.js?v=3";
import { distanciaKm, minhaPosicao } from "./perto.js?v=2";
import { combinaPublico, leitorDe, temPublico, resumoPublico } from "./publico-alvo.js?v=1";
import { postsDoEstado, pesoRegiao, RECENTES_PAIS } from "./regiao.js?v=4";
import { comDescoberta, sorteioFixo, janela } from "./relevancia.js?v=4";

const POR_VEZ = 10;
// Publicação de conta desativada (conta.js): escondida até ocultoAte.
// Agendada: só aparece na hora marcada. Silenciado: some do seu Diário (você continua seguindo).
// Público da publicação (idade, gênero, lugar, seguidores): quem não está no público não vê no Diário (publico-alvo.js).
let leitor = null;
const foraDoPublico = (p) => !!leitor && !combinaPublico(p, leitor);
const postOculto = (p) => (p?.ocultoAte?.toMillis?.() ?? 0) > Date.now() || (p?.agendadoPara?.toMillis?.() ?? 0) > Date.now() || silenciado(p?.autorId) || foraDoPublico(p);
// Quem lê: os dados da própria conta + o lugar escolhido + a posição (espera no máximo 1,5 s pela posição).
async function prepararLeitor() {
  const pos = await Promise.race([minhaPosicao(dados).catch(() => null), new Promise((ok) => setTimeout(() => ok(null), 1500))]);
  leitor = leitorDe({ uid: eu.uid, dados, local: lerLocal(), pos, segue: (u) => meusSeguindo.has(u) });
}
// Busca por hashtag: feed.html?tag=reforma
let tagAtual = (new URLSearchParams(location.search).get("tag") || "").toLowerCase().replace(/^#/, "").slice(0, 30);
// Publicações de um lugar: feed.html?local=-27.44,-48.50&n=Jurerê (o que foi publicado a até 3 km dali).
let localAtual = (() => {
  const pg = new URLSearchParams(location.search), m = /^(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)$/.exec(pg.get("local") || "");
  return m ? { lat: Number(m[1]), lng: Number(m[2]), nome: String(pg.get("n") || "Este lugar").slice(0, 80) } : null;
})();
function abrirLocal(l) {
  localAtual = { lat: Number(l.lat), lng: Number(l.lng), nome: l.nome };
  tagAtual = "";
  history.pushState({ ...(history.state || {}), hfAbaFeed: "diario" }, "", `feed.html?local=${l.lat},${l.lng}&n=${encodeURIComponent(l.nome)}`);
  if (aba !== "diario") trocarAba("diario"); else { pintarFiltro(); carregarFeed(); }
  scrollTo({ top: 0, behavior: "smooth" });
}
async function buscarLocal(l) {
  const s = await fb.getDocs(fb.query(fb.collection(fb.db, "diario"), fb.orderBy("criadoEm", "desc"), fb.limit(200)));
  return s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }))
    .filter((p) => p.local && (p.local.nome === l.nome || distanciaKm(l, p.local) <= 3));
}
// Filtro do Diário: Principais (o que tem a ver com você + quem você segue, pelo engajamento) ou Amigos.
const FILTROS = { principais: "Principais", amigos: "Amigos" };
let aba = "diario", filtro = "principais";
let posts = [], todosPosts = [], mostrados = 0;

// ---------- abas ----------
// O Diário é um só: fotos, vídeos, textos, enquetes e perguntas juntos ("Registros" virou o filtro Textos).
const ABAS = ["diario", "explorar"];
const urlAba = (a) => (a === "diario" ? "feed.html" : `feed.html?aba=${a}`);
const abaDaUrl = () => { const a = new URLSearchParams(location.search).get("aba"); return a === "pessoas" ? "explorar" : a === "explorar" ? "explorar" : "diario"; };
const temMidia = (p) => !!(p.mediaUrl || (p.midias || []).length);
// Tipo de publicação (filtro do topo): tudo, fotos e vídeos, textos, enquetes e perguntas. Filtra o que já foi lido.
// Botões só com ícone numa linha fina (como a grade do perfil das redes sociais), com o nome no title/aria-label.
// "Reels" não filtra a lista: abre os vídeos em tela cheia (reels.js).
const TIPOS_FEED = [["tudo", "Tudo", "grade"], ["reels", "Reels (vídeos)", "video"], ["textos", "Textos", "registros"], ["enquetes", "Enquetes e perguntas", "enquete"]];
let tipoFeed = "tudo"; // "fotos" (antigo) virou Reels // links antigos ?aba=registros abrem o Diário normal (textos e enquetes estão nele)
const doTipo = (p) => tipoFeed === "tudo" || (tipoFeed === "fotos" ? temMidia(p) : tipoFeed === "enquetes" ? !!(p.enquete?.pergunta || p.caixa?.pergunta) : !temMidia(p) && !p.enquete?.pergunta && !p.caixa?.pergunta);
const daAba = (p) => !!(tagAtual || localAtual) || doTipo(p);
// Reels: os vídeos já lidos + os mais novos do servidor, com as mesmas regras do Diário (silenciados, público...).
const verReels = (comecarEm = null) => import("./reels.js?v=1").then((m) => m.abrirReels({ lista: todosPosts, oculto: postOculto, comecarEm, aoNovo: () => compor("video") }));
const compor = (inicio = "") => abrirCompositor({ aoPublicar: ganchos.aoPublicar, inicio });
function pintarTipos() {
  const w = $("tiposFeed"); if (!w) return;
  w.replaceChildren(...TIPOS_FEED.map(([k, nome, ic]) => {
    const b = el("button"); b.type = "button"; b.setAttribute("role", "tab"); b.dataset.tipo = k;
    b.title = nome; b.setAttribute("aria-label", nome); b.appendChild(icone(ic, "i s"));
    b.setAttribute("aria-selected", String(k === tipoFeed));
    b.addEventListener("click", () => {
      if (k === "reels") { verReels(); return; }
      if (tipoFeed === k) return; tipoFeed = k; pintarTipos(); mostrarFiltrados();
    });
    return b;
  }));
}
function trocarAba(nova, { passo = false } = {}) {
  // Diário ↔ Explorar é um passo no histórico: o "voltar" volta para o anterior.
  if (passo && nova !== aba) { const st = { ...(history.state || {}), hfAbaFeed: nova }; delete st.hfBase; delete st.hfGuarda; delete st.hfCamadas; history.pushState(st, "", urlAba(nova)); }
  aba = nova;
  $("painelFeed").hidden = aba === "explorar";
  $("painelExplorar").hidden = aba !== "explorar";
  marcarBarra(aba === "explorar" ? "explorar" : "diario");
  if (!passo) history.replaceState({ ...(history.state || {}), hfAbaFeed: aba }, "", urlAba(aba) + (tagAtual ? `?tag=${encodeURIComponent(tagAtual)}` : ""));
  if (aba === "explorar") abrirExplorar();
  else carregarFeed();
}
pintarTipos();
addEventListener("popstate", () => { const a = history.state?.hfAbaFeed || abaDaUrl(); if (a !== aba && eu) trocarAba(a); });
// Barra de baixo: Diário e Explorar trocam aqui mesmo (sem recarregar a página).
document.addEventListener("click", (e) => {
  const a = e.target.closest?.("#barraRede [data-barra]");
  if (!a || !eu || !["diario", "explorar"].includes(a.dataset.barra)) return;
  e.preventDefault();
  const alvo = a.dataset.barra;
  if (alvo !== aba) trocarAba(alvo, { passo: true }); else scrollTo({ top: 0, behavior: "smooth" });
});
function pintarFiltro() {
  $("filtroAtual").textContent = localAtual ? "📍 " + localAtual.nome : tagAtual ? "#" + tagAtual : FILTROS[filtro];
  $("filtroFeedBtn").classList.toggle("com-tag", !!(tagAtual || localAtual));
  definirOrigem(tagAtual || localAtual ? "tag" : filtro);
}
$("filtroFeedBtn").addEventListener("click", () => abrirOpcoes("Mostrar no Diário", [
  tagAtual && { rotulo: `Sair de #${tagAtual}`, sub: "Voltar para o Diário", icone: "fechar", fn: () => { tagAtual = ""; history.replaceState(history.state, "", "feed.html"); pintarFiltro(); carregarFeed(); } },
  localAtual && { rotulo: `Sair de ${localAtual.nome}`, sub: "Voltar para o Diário", icone: "fechar", fn: () => { localAtual = null; history.replaceState(history.state, "", "feed.html"); pintarFiltro(); carregarFeed(); } },
  { rotulo: "Principais" + (filtro === "principais" ? "  ✓" : ""), sub: "O que combina com você e as novidades de quem você segue", icone: "estrela", fn: () => mudarFiltro("principais") },
  { rotulo: "Amigos" + (filtro === "amigos" ? "  ✓" : ""), sub: "Seus vínculos do Social e quem vocês se seguem, das mais novas", icone: "coracao", fn: () => mudarFiltro("amigos") }
]));
function mudarFiltro(f) { filtro = f; tagAtual = ""; localAtual = null; if (/tag=|local=/.test(location.search)) history.replaceState(history.state, "", "feed.html"); try { localStorage.setItem("hf-filtro-diario", f); } catch {} pintarFiltro(); carregarFeed(); }
// ("Quem eu sigo" entrou nos Principais.)
try { const f = localStorage.getItem("hf-filtro-diario"); if (FILTROS[f]) filtro = f; } catch {}
pintarFiltro();

// ---------- publicações ----------
async function buscarSeguindo(lista = null, chave = "seguindo") {
  const autores = (lista || [eu.uid, ...meusSeguindo]).filter((u) => !escondido(u));
  const lotes = [];
  for (let i = 0; i < autores.length; i += 30) lotes.push(autores.slice(i, i + 30));
  // As 20 mais recentes de cada lote de autores (índice diario: autorId + criadoEm).
  const col = fb.collection(fb.db, "diario");
  const res = await Promise.all(lotes.map((l, k) => docsComValidade(fb, `diario-${chave}-${eu.uid}-${k}`,
    fb.query(col, fb.where("autorId", "in", l), fb.orderBy("criadoEm", "desc"), fb.limit(20)), DIARIO_VALIDADE).catch(() => lerOrdenado(
    fb.query(col, fb.where("autorId", "in", l), fb.orderBy("criadoEm", "desc"), fb.limit(20)),
    fb.query(col, fb.where("autorId", "in", l), fb.limit(20))
  )).catch(() => ({ docs: [] }))));
  return res.flatMap((s) => s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })));
}
// Amigos: vínculos aceitos do Social + quem vocês se seguem (você segue e a pessoa segue você).
async function buscarAmigos() {
  const [vin, seg] = await Promise.all([
    fb.getDocs(fb.query(fb.collection(fb.db, "vinculos"), fb.where("participantes", "array-contains", eu.uid), fb.limit(100))).catch(() => ({ docs: [] })),
    docsComValidade(fb, "seguidores-" + eu.uid, fb.query(fb.collection(fb.db, "relacoes"), fb.where("tipo", "==", "seguir"), fb.where("alvoId", "==", eu.uid), fb.limit(500)), 15 * 60000).catch(() => ({ docs: [] }))
  ]);
  const amigos = new Set(vin.docs.map((d) => d.data()).filter((v) => v.status === "aceito").map((v) => (v.participantes || []).find((u) => u !== eu.uid)).filter(Boolean));
  seg.docs.forEach((d) => { const u = d.data().seguidorId; if (meusSeguindo.has(u)) amigos.add(u); });
  if (!amigos.size) return [];
  return buscarSeguindo([...amigos].slice(0, 300), "amigos");
}
// Principais (como Instagram e TikTok): junta as publicações recentes de todo mundo com as de quem você
// segue e dá uma nota a cada uma:
//   engajamento (estrelas, média, comentários) × gosto (autores e hashtags com que você interage) ×
//   quem você segue (empurrão) × já vista (desce) ÷ idade (as novas sobem).
// Depois espalha os autores (nunca dois seguidos do mesmo) e mistura um pouco para o Diário não ficar parado.
// Justo para todos (relevancia.js): a mistura é fixa por pessoa e muda a cada 3 h (recarregar não embaralha); 1 a cada
// 5 publicações é de descoberta (alguém que você não segue e que ainda tem pouco alcance); no máximo 2 do mesmo autor
// nas 10 primeiras.
// Chegou ao fim: "Ver mais" busca as próximas do país (mais antigas), RECENTES_PAIS por vez, e dá nota igual.
let cursorPrincipais = null, maisPrincipais = false;
// Região de quem lê: o lugar escolhido ("Você está em", o mesmo do Início e das vitrines) ou a cidade do perfil.
function regiaoLeitor() {
  const l = lerLocal();
  if (l.uf) return { uf: l.uf, cidadeIbge: Number(l.cidadeIbge) || 0 };
  return { uf: dados.uf || "", cidadeIbge: Number(dados.cidadeIbge) || 0 };
}
// Republicações de quem você segue (últimos 7 dias): a publicação original entra no Diário com "Fulano republicou".
async function buscarRepublicados() {
  const quem = [...meusSeguindo].filter((u) => u !== eu.uid && !escondido(u));
  if (!quem.length) return [];
  const col = fb.collection(fb.db, "republicacoes"), lotes = [];
  for (let i = 0; i < quem.length; i += 30) lotes.push(quem.slice(i, i + 30));
  const res = await Promise.all(lotes.map((l, k) => docsComValidade(fb, `repub-seg-${eu.uid}-${k}`,
    fb.query(col, fb.where("uid", "in", l), fb.orderBy("criadoEm", "desc"), fb.limit(20)), DIARIO_VALIDADE).catch(() => lerOrdenado(
    fb.query(col, fb.where("uid", "in", l), fb.orderBy("criadoEm", "desc"), fb.limit(20)),
    fb.query(col, fb.where("uid", "in", l), fb.limit(20))
  )).catch(() => ({ docs: [] }))));
  const semana = Date.now() - 7 * 864e5;
  const reps = res.flatMap((s) => s.docs.map((d) => d.data({ serverTimestamps: "estimate" })))
    .filter((r) => r.postId && !escondido(r.postAutorId) && (ms(r.criadoEm) || Date.now()) > semana)
    .sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
  // Uma linha por publicação: quem republicou por último (+ quantos outros que você segue).
  const por = new Map();
  reps.forEach((r) => { const x = por.get(r.postId); if (x) x.outros++; else por.set(r.postId, { uid: r.uid, nome: r.nome || "", em: ms(r.criadoEm) || Date.now(), outros: 0 }); });
  if (!por.size) return [];
  const docs = await docsPorIds(fb, "diario", [...por.keys()], DIARIO_VALIDADE);
  return [...por.entries()].map(([id, r]) => { const d = docs.get(id); return d ? { id, ...d, _repost: r } : null; }).filter(Boolean);
}
async function buscarPrincipais(continuar = false) {
  const base = [fb.collection(fb.db, "diario"), fb.orderBy("criadoEm", "desc")];
  if (continuar) {
    if (!cursorPrincipais) return [];
    const s = await fb.getDocs(fb.query(...base, fb.startAfter(cursorPrincipais), fb.limit(RECENTES_PAIS)));
    cursorPrincipais = s.docs.at(-1) || null; maisPrincipais = s.size === RECENTES_PAIS;
    return ordenarPrincipais(s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })));
  }
  const q = fb.query(...base, fb.limit(RECENTES_PAIS));
  const [s, deQuemSigo, doEstado, republicados] = await Promise.all([
    docsComValidade(fb, "diario-principais", q, DIARIO_VALIDADE),
    buscarSeguindo().catch(() => []),
    postsDoEstado(fb, regiaoLeitor().uf),
    buscarRepublicados().catch(() => []),
    sincronizarGosto(fb, eu.uid)
  ]);
  cursorPrincipais = s.docs.at(-1) || null; maisPrincipais = s.size === RECENTES_PAIS;
  return ordenarPrincipais([...s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })), ...deQuemSigo, ...doEstado, ...republicados]);
}
async function ordenarPrincipais(bruto) {
  // Sem repetidas; a mesma publicação vinda também por uma republicação guarda o "Fulano republicou".
  const unicos = new Map();
  bruto.forEach((p) => { const x = unicos.get(p.id); if (!x) unicos.set(p.id, p); else if (p._repost && !x._repost) x._repost = p._repost; });
  const lista = [...unicos.values()].filter((p) => !escondido(p.autorId) && !postOculto(p));
  const regiao = regiaoLeitor();
  const resumos = await lerResumosEstrelas(lista.map((p) => p.id));
  const agora = Date.now();
  const sigo = (p) => meusSeguindo.has(p.autorId) || !!p._repost;
  const minha = (p) => p.autorId === eu.uid;
  const gosto = new Map(lista.map((p) => [p.id, afinidade(p)]));
  const eng = (p) => { const r = resumos.get(p.id) || { total: 0, soma: 0 }; return r.total + Math.max(0, r.soma - 3 * r.total) * 0.4; };
  const pre = (p) => (1 + eng(p)) * (1 + gosto.get(p.id)) * (sigo(p) ? 1.8 : 1);
  // Comentários: conta só para as 20 mais promissoras (contagem guardada no aparelho por alguns minutos).
  const ordem1 = lista.slice().sort((a, b) => pre(b) - pre(a)).slice(0, 20);
  const com = new Map(await Promise.all(ordem1.map(async (p) => [p.id, await contarComentarios(p.id).catch(() => 0)])));
  const pontos = (p) => {
    // Idade: agendada conta de quando apareceu; republicada, de quando foi republicada (se for mais recente).
    const quando = Math.max(ms(p.agendadoPara) || ms(p.criadoEm) || agora, p._repost?.em || 0);
    const horas = Math.max(0, (agora - quando) / 3600e3);
    // Sua cidade e seu estado pesam mais (site nacional): regiao.js. Republicada por quem você segue: empurrão social.
    const base = (1 + eng(p) + 2 * (com.get(p.id) || 0)) * (1 + gosto.get(p.id)) * (sigo(p) ? 1.8 : 1) * (p._repost ? 1.2 + 0.15 * Math.min(4, p._repost.outros) : 1) * pesoRegiao(p, regiao);
    // As suas: aparecem no topo logo depois de publicar (até 3 h) e depois descem (antes ficavam sempre em cima).
    if (minha(p)) return base * (horas < 3 ? 3 : 0.2) / Math.pow(horas + 2, 1.35);
    const visto = jaVisto(p.id) ? 0.3 : 1;
    // Quem você segue envelhece mais devagar (você quer ver as novidades deles mesmo sem muito engajamento).
    return base * visto * (0.9 + 0.2 * sorteioFixo(eu.uid + ":" + janela() + ":" + p.id)) / Math.pow(horas + 2, sigo(p) ? 1.1 : 1.35);
  };
  // Descoberta: de quem você não segue, com pouco alcance ainda (até 3 notas e até 1 comentário) e que você não viu.
  const descoberta = (p) => !sigo(p) && !minha(p) && !jaVisto(p.id) && (resumos.get(p.id)?.total || 0) <= 3 && (com.get(p.id) || 0) <= 1;
  const ordenada = lista.map((p) => ({ ...p, _pontos: pontos(p) })).sort((a, b) => b._pontos - a._pontos);
  return espalharAutores(comDescoberta(ordenada, descoberta));
}
// Nunca duas publicações seguidas do mesmo autor (puxa a próxima de outra pessoa, se houver).
function espalharAutores(lista) {
  const res = [], resto = lista.slice();
  while (resto.length) {
    const ult = res.at(-1)?.autorId;
    const k = resto.findIndex((p) => p.autorId !== ult);
    res.push(resto.splice(k < 0 || k > 6 ? 0 : k, 1)[0]);
  }
  return res;
}
// Hashtag: publicações com a tag (as mais novas primeiro).
async function buscarTag(tag) {
  const s = await fb.getDocs(fb.query(fb.collection(fb.db, "diario"), fb.where("tags", "array-contains", tag), fb.limit(80)));
  return s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }));
}
// O começo do diário vale por 3 min no aparelho (o que você publica aparece na hora).
const DIARIO_VALIDADE = 3 * 60000;
// "Todos": 20 por vez; "Ver mais" busca as 20 seguintes só quando a pessoa chega ao fim.
const LOTE_TODOS = 20;
let cursorTodos = null, maisTodos = false;
async function buscarTodos(continuar = false) {
  if (!continuar) cursorTodos = null;
  const q = fb.query(fb.collection(fb.db, "diario"), fb.orderBy("criadoEm", "desc"), ...(cursorTodos ? [fb.startAfter(cursorTodos)] : []), fb.limit(LOTE_TODOS));
  const s = cursorTodos ? await fb.getDocs(q) : await docsComValidade(fb, "diario-todos", q, DIARIO_VALIDADE);
  cursorTodos = s.docs.at(-1) || cursorTodos; maisTodos = s.size === LOTE_TODOS;
  return s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }));
}
async function carregarFeed() {
  const lista = $("listaFeed");
  lista.replaceChildren(el("div", "esqueleto-post"), el("div", "esqueleto-post"));
  $("maisFeed").hidden = true;
  try {
    maisTodos = false; maisPrincipais = false;
    const bruto = localAtual ? await buscarLocal(localAtual) : tagAtual ? await buscarTag(tagAtual) : filtro === "amigos" ? await buscarAmigos() : await buscarPrincipais();
    todosPosts = bruto.filter((p) => !escondido(p.autorId) && !postOculto(p));
    if (localAtual || tagAtual || filtro !== "principais") todosPosts.sort((a, b) => ms(b.agendadoPara || b.criadoEm) - ms(a.agendadoPara || a.criadoEm)); // principais: pela pontuação
  } catch (e) {
    console.warn(e);
    lista.replaceChildren(vazio("Não foi possível carregar o diário", erroAmigavel(e)));
    return;
  }
  mostrarFiltrados();
}
// Aplica o filtro de tipo (Tudo, Fotos e vídeos, Textos, Enquetes) no que já foi lido, sem ler de novo.
function mostrarFiltrados() {
  const lista = $("listaFeed");
  posts = todosPosts.filter(daAba);
  mostrados = 0;
  lista.replaceChildren();
  if (!posts.length) {
    const nomeTipo = TIPOS_FEED.find((t) => t[0] === tipoFeed)?.[1].toLowerCase();
    lista.appendChild(localAtual ? vazio(`Nada publicado em ${localAtual.nome} ainda`, "Adicione o local na sua publicação para começar.", "Publicar agora", () => compor()) : tagAtual ? vazio(`Nada com #${tagAtual} ainda`, "Use a hashtag na sua publicação para começar.", "Publicar agora", () => compor())
      : tipoFeed !== "tudo" && todosPosts.length ? vazio(`Nenhuma publicação de ${nomeTipo} por aqui ainda`, "Mude o filtro para ver tudo ou publique a primeira.", "Ver tudo", () => { tipoFeed = "tudo"; pintarTipos(); mostrarFiltrados(); })
      : filtro === "principais" ? vazio("Nada publicado por aqui ainda", "Compartilhe uma foto do seu trabalho, um texto ou faça uma enquete.", "Publicar agora", () => compor())
      : vazio("Seus amigos ainda não publicaram", "Amigos são seus vínculos do Social e quem vocês se seguem.", "Ver as principais", () => mudarFiltro("principais")));
    $("maisFeed").hidden = !temMaisPrincipais();
    return;
  }
  mostrarMais();
}
function mostrarMais() {
  const lista = $("listaFeed");
  posts.slice(mostrados, mostrados + POR_VEZ).forEach((p) => lista.appendChild(cartaoPost(p)));
  mostrados = Math.min(posts.length, mostrados + POR_VEZ);
  $("maisFeed").hidden = mostrados >= posts.length && !temMaisPrincipais();
}
const temMaisPrincipais = () => maisPrincipais && filtro === "principais" && !localAtual && !tagAtual;
let buscandoMais = false;
$("maisFeed").addEventListener("click", async () => {
  const principais = temMaisPrincipais();
  if (mostrados < posts.length || (!principais && (filtro !== "todos" || !maisTodos))) { mostrarMais(); return; } // (filtro "todos" saiu; o resto fica para o caso de voltar)
  if (buscandoMais) return;
  buscandoMais = true; $("maisFeed").disabled = true;
  try {
    const ja = new Set(todosPosts.map((p) => p.id));
    const novos = (await (principais ? buscarPrincipais(true) : buscarTodos(true))).filter((p) => !ja.has(p.id) && !escondido(p.autorId) && !postOculto(p));
    const ord = principais ? novos : novos.sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
    todosPosts.push(...ord); posts.push(...ord.filter(daAba));
    mostrarMais();
  } catch (e) { console.warn(e); toast("Não foi possível carregar mais."); }
  finally { buscandoMais = false; $("maisFeed").disabled = false; }
});
function vazio(titulo, texto, botao, acao) {
  const v = el("div", "feed-vazio");
  v.append(el("strong", null, titulo), el("span", null, texto));
  if (botao) { const b = el("button", "btn pri", botao); b.type = "button"; b.addEventListener("click", acao); v.append(el("br"), b); }
  return v;
}

// Alcance: conta como vista quando a publicação fica pelo menos metade na tela por 1 segundo.
const vigiaVista = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => {
  const c = e.target;
  if (e.isIntersecting) {
    c._tVista = setTimeout(() => marcarVista(c._post), 1000);
    // Ficou olhando (4 s): conta um pouco no gosto (uma vez por publicação).
    if (!c._olhou) c._tOlhar = setTimeout(() => { c._olhou = true; registrarGosto(c._post, PESO.olhar, eu.uid); }, 4000);
  } else { clearTimeout(c._tVista); clearTimeout(c._tOlhar); }
}), { threshold: 0.5 }) : null;
// Vídeo curto: toca sozinho, sem som e em repetição, quando aparece; tocar liga o som.
const vigiaVideo = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => {
  const v = e.target;
  if (e.isIntersecting && e.intersectionRatio >= 0.6) v.play().catch(() => {}); else v.pause();
}), { threshold: [0, 0.6] }) : null;
function cartaoPost(post) {
  const c = el("article", "post-card");
  c.dataset.autor = post.autorId; c._post = post;
  vigiaVista?.observe(c);
  // Veio por uma republicação de quem você segue: "Fulano republicou" em cima (tocar abre o perfil de quem republicou).
  if (post._repost) {
    const r = post._repost, linha = el("div", "post-repost");
    const quem = el("button", null, String(r.nome || "Alguém").split(" ")[0]); quem.type = "button";
    quem.addEventListener("click", () => ganchos.abrirPerfil(r.uid));
    linha.append(icone("republicar", "i xs"), quem, document.createTextNode(r.outros ? ` e mais ${r.outros} republicaram` : " republicou"));
    obterPerfil(r.uid).then((pp) => { if (pp.nome) quem.textContent = String(pp.nome).split(" ")[0]; }).catch(() => {});
    c.appendChild(linha);
  }
  const cab = el("div", "post-cab");
  const av = el("div", "avatar"); pintarAvatar(av, post.fotoPerfil, post.nome);
  const verAutor = () => { registrarGosto(post, PESO.abrir, eu.uid); ganchos.abrirPerfil(post.autorId); };
  av.addEventListener("click", verAutor);
  const quem = el("div", "quem");
  const nome = el("button", null, post.nome || "Usuário"); nome.type = "button";
  nome.addEventListener("click", verAutor);
  const sub = el("small", null, tempoRelativo(paraData(post.criadoEm)));
  quem.append(nome);
  // Local da publicação: tocar mostra o que foi publicado ali.
  if (post.local?.nome && Number.isFinite(post.local.lat)) {
    const lb = el("button", "local-post"); lb.type = "button"; lb.setAttribute("aria-label", `Publicações em ${post.local.nome}`);
    lb.append(icone("local", "i xs"), document.createTextNode(post.local.nome));
    lb.addEventListener("click", (e) => { e.stopPropagation(); abrirLocal(post.local); });
    quem.appendChild(lb);
  }
  quem.appendChild(sub);
  const mais = el("button", "icone-btn"); mais.type = "button"; mais.setAttribute("aria-label", "Opções da publicação");
  mais.appendChild(icone("pontos", "i s"));
  mais.addEventListener("click", () => abrirOpcoes("Publicação", [
    { rotulo: "Ver perfil", icone: "olho", fn: () => ganchos.abrirPerfil(post.autorId) },
    estaSalvo(post.id)
      ? { rotulo: "Remover dos salvos", icone: "salvo", fn: () => alternarSalvo(post) }
      : { rotulo: "Salvar publicação", sub: "Para ver depois no seu Perfil → Salvos", icone: "salvo", fn: () => alternarSalvo(post) },
    { rotulo: "Salvar em uma coleção", sub: "Organize seus salvos em pastas", icone: "fotos", fn: () => escolherColecao(post) },
    { rotulo: "Compartilhar perfil", icone: "compartilhar", fn: () => compartilharPerfil(post.autorId, post.nome) },
    post.autorId === eu.uid && { rotulo: "Estatísticas", sub: "Alcance, estrelas, salvos e de onde vieram", icone: "estrela", fn: () => import("./estatisticas-post.js?v=49").then((m) => m.abrirEstatisticas(post)) },
    post.autorId === eu.uid && { rotulo: "Editar publicação", icone: "lapis", fn: () => editarPublicacao(post, () => c.replaceWith(cartaoPost(post))) },
    post.autorId === eu.uid && { rotulo: "Público da publicação", sub: temPublico(post) ? resumoPublico(post.publico) : "Para todos · escolha idade, gênero, lugar e seguidores", icone: "pessoa-mais", fn: () => editarPublicoDoPost(post, () => c.replaceWith(cartaoPost(post))) },
    post.autorId !== eu.uid && { rotulo: silenciado(post.autorId) ? `Mostrar ${nome.textContent} de novo` : `Silenciar ${nome.textContent}`, sub: "Continua seguindo, mas as publicações e flashes somem do seu Diário", icone: "restringir",
      fn: async () => { await alternarSilenciar(post.autorId, nome.textContent); if (silenciado(post.autorId)) { posts = posts.filter((x) => x.autorId !== post.autorId); document.querySelectorAll(".post-card").forEach((x) => { if (x.dataset.autor === post.autorId) x.remove(); }); } } },
    post.autorId !== eu.uid && { rotulo: "Denunciar publicação", sub: "Golpe, ofensa, conteúdo impróprio...", icone: "alerta", perigo: true,
      fn: () => abrirDenuncia({ fb, eu, tipo: "publicacao", alvoId: post.autorId, itemId: post.id, trecho: post.texto || "", nomeAlvo: nome.textContent,
        aoBloquear: async () => { if (await bloquear(post.autorId, nome.textContent)) { posts = posts.filter((x) => x.autorId !== post.autorId); carregarFeed(); } } }) },
    post.autorId === eu.uid && { rotulo: "Apagar publicação", icone: "lixo", perigo: true, fn: async () => {
      if (!await confirmarHF({ titulo: "Apagar esta publicação?", texto: "Ela some do seu perfil e do Diário. Não dá para desfazer.", ok: "Apagar", icone: "lixo" })) return;
      try { await fb.deleteDoc(fb.doc(fb.db, "diario", post.id)); c.remove(); posts = posts.filter((x) => x.id !== post.id); toast("Publicação apagada"); }
      catch (e) { toast("Não foi possível apagar: " + erroAmigavel(e)); }
    } }
  ]));
  cab.append(av, quem, mais);
  c.appendChild(cab);
  // Sua publicação com público escolhido: só você vê este aviso (toque para mudar).
  if (post.autorId === eu.uid && temPublico(post)) {
    const pp = el("button", "post-publico"); pp.type = "button"; pp.title = "Mudar o público";
    pp.append(icone("pessoa-mais", "i xs"), document.createTextNode("Público: " + resumoPublico(post.publico)));
    pp.addEventListener("click", () => editarPublicoDoPost(post, () => c.replaceWith(cartaoPost(post))));
    c.appendChild(pp);
  }
  // Nome e foto atualizados do perfil (a publicação guarda os de quando foi feita).
  obterPerfil(post.autorId).then((p) => {
    if (p.nome) nome.textContent = p.nome;
    if (p.fotoPerfil) pintarAvatar(av, p.fotoPerfil, p.nome);
    sub.textContent = [p.nickname ? "@" + p.nickname : "", tempoRelativo(paraData(post.criadoEm)), post.editadoEm ? "editada" : ""].filter(Boolean).join(" · ");
  });
  const url = urlSegura(post.mediaUrl);
  // Pessoas marcadas: "com Ana e Bruno".
  if (Array.isArray(post.marcados) && post.marcados.length) {
    const linhaM = el("div", "post-com");
    linhaM.append(icone("pessoa-mais", "i xs"), document.createTextNode("com "));
    post.marcados.slice(0, 10).forEach((u, i) => {
      const b = el("button", null, "..."); b.type = "button"; b.addEventListener("click", () => ganchos.abrirPerfil(u));
      obterPerfil(u).then((p) => { b.textContent = String(p.nome || "Usuário").split(" ")[0]; }).catch(() => { b.textContent = "Usuário"; });
      if (i) linhaM.appendChild(document.createTextNode(i === post.marcados.length - 1 ? " e " : ", "));
      linhaM.appendChild(b);
    });
    c.appendChild(linhaM);
  }
  if (post.texto) {
    // Só texto (sem foto, enquete ou caixa de perguntas) vira cartão de citação, como no Flash.
    const citacao = !url && !post.enquete?.pergunta && !post.caixa?.pergunta && post.texto.length <= 500;
    const t = comMencoes(el("p", "post-texto" + (url ? "" : " so-texto") + (citacao ? " citacao" : "")), post.texto);
    c.appendChild(t);
    if (!url) c._texto = t;
    // Texto longo: mostra o começo e "ver mais".
    if (post.texto.length > 220) {
      t.classList.add("curto");
      const vm = el("button", "ver-mais", "ver mais"); vm.type = "button";
      vm.addEventListener("click", () => { t.classList.remove("curto"); vm.remove(); });
      c.appendChild(vm);
    }
  }
  const barra = barraInteracao(post);
  // Publicação só de texto: toque duplo no texto dá as 5 estrelas (como na foto).
  if (c._texto) toqueDuploEm(c._texto, () => toqueDuplo(c._texto, barra, true));
  const fotos = fotosDoPost(post);
  if (fotos.length && post.mediaTipo !== "video") {
    // A foto aparece no recorte escolhido ao publicar (4:5, 1:1 ou 16:9), sem cortar de novo. Fotos antigas
    // fora dessas medidas ficam entre 4:5 e 1,91:1. Toque duplo: contagem de estrelas.
    const m = el("div", "post-midia-f" + (fotos.length > 1 ? " varias" : ""));
    const car = carrosselFotos(fotos, { alt: post.texto ? post.texto.slice(0, 80) : "Publicação", aoToqueDuplo: () => toqueDuplo(m, barra) });
    const img = car.querySelector("img"); img.loading = "lazy";
    img.addEventListener("load", () => { const p = img.naturalWidth / Math.max(1, img.naturalHeight); m.style.setProperty("--prop", String(Math.min(1.91, Math.max(0.8, p)))); m.classList.toggle("alta", p < 0.8); }, { once: true });
    m.appendChild(car);
    m.title = "Toque duas vezes para dar estrelas";
    c.appendChild(m);
  } else if (url) {
    const m = el("div", "post-midia-f");
    const v = document.createElement("video"); v.src = url; v.muted = true; v.loop = true; v.playsInline = true; v.preload = "metadata";
    const som = el("button", "video-som"); som.type = "button"; som.setAttribute("aria-label", "Ligar o som"); som.textContent = "🔇";
    som.addEventListener("click", (e) => { e.stopPropagation(); v.muted = !v.muted; som.textContent = v.muted ? "🔇" : "🔊"; som.setAttribute("aria-label", v.muted ? "Ligar o som" : "Desligar o som"); if (v.paused) v.play().catch(() => {}); });
    v.addEventListener("click", () => (v.paused ? v.play() : v.pause()));
    m.classList.add("video"); m.append(v, som); vigiaVideo?.observe(v);
    c.appendChild(m);
  }
  const enq = blocoEnquete(post);
  if (enq) c.appendChild(enq);
  const cx = blocoCaixa(post);
  if (cx) c.appendChild(cx);
  c.appendChild(barra);
  return c;
}
// Dois toques rápidos no elemento (links e "ver mais" continuam funcionando com um toque).
function toqueDuploEm(alvo, fn) {
  let ultimo = 0;
  alvo.addEventListener("click", (e) => {
    if (e.target.closest("a, button, .enquete")) return;
    const agora = Date.now();
    if (agora - ultimo < 320) { ultimo = 0; window.getSelection?.()?.removeAllRanges?.(); fn(); return; }
    ultimo = agora;
  });
}
// Toque duplo: 5 estrelas na hora (vale também na própria publicação). Para dar menos, use as estrelas da barra.
// Na publicação só de texto (simples) as estrelas não voam por cima: só as da barra acendem.
async function toqueDuplo(m, barra, simples = false) {
  if (!barra.estrelas?.darNota) return;
  if (simples) { barra.estrelas.pular?.(); await barra.estrelas.darNota(5); return; }
  await contadorEstrelas(m, (nota) => barra.estrelas.darNota(nota));
}

// ---------- lateral (computador) ----------
async function pintarLateral() {
  pintarAvatar($("euAvatar"), dados.fotoPerfil, dados.nome);
  $("euNome").textContent = dados.nome || "Você";
  $("euNick").textContent = dados.nickname ? "@" + dados.nickname : "Ver meu perfil";
  // Sugestões só aparecem na lateral do computador: no celular nem busca.
  if (!$("sugestoes")?.offsetParent) return;
  try {
    const recentes = await pessoasRecentes(fb, { limite: 30 });
    const sug = recentes.filter((p) => p.uid !== eu.uid && !meusSeguindo.has(p.uid) && !escondido(p.uid)).sort(() => Math.random() - 0.5).slice(0, 4);
    const box = $("sugestoes");
    box.replaceChildren();
    if (!sug.length) box.appendChild(el("div", "lista-vazia", "Você já segue todo mundo por aqui."));
    sug.forEach((p) => box.appendChild(linhaPessoa({ uid: p.uid, nome: p.nome, foto: p.fotoPerfil, sub: p.nickname ? "@" + p.nickname : textoCidade({ cidade: nomeCidade(p.cidade), uf: p.uf }) })));
  } catch {}
}

// ---------- início ----------
(async function iniciar() {
  try { await iniciarRede(); }
  catch (e) { $("listaFeed").replaceChildren(vazio("Não foi possível carregar", e.message || "")); return; }
  definirCartao(cartaoPost);
  // "Ver publicação" (Flash) e links feed.html?post=ID abrem a própria publicação aqui.
  ganchos.abrirPublicacao = (id) => abrirPublicacao(id);
  // Depois de publicar: vai para a aba onde a publicação aparece (com foto = Diário; texto/enquete/pergunta = Registros).
  // Depois de publicar: volta para o Diário (no filtro em que a publicação aparece).
  ganchos.aoPublicar = (post) => { if (post && !doTipo(post)) { tipoFeed = "tudo"; pintarTipos(); } if (aba !== "diario") trocarAba("diario"); else carregarFeed(); };
  montarBarraRede(abaDaUrl() === "explorar" ? "explorar" : "diario");
  pintarBarraRede();
  ouvirAvisos();
  $("btnComporFeed").addEventListener("click", () => compor());
  await carregarMeusSeguindo();
  await prepararLeitor();
  pintarFiltro();
  montarStories($("storiesFeed")).catch((e) => console.warn("Flash:", e));
  pintarLateral();
  const p = new URLSearchParams(location.search);
  trocarAba(abaDaUrl());
  if (p.get("publicar")) compor();
  if (p.get("reels")) verReels(/^[A-Za-z0-9_-]{1,64}$/.test(p.get("reels")) ? p.get("reels") : null);
  if (/^[A-Za-z0-9_-]{1,64}$/.test(p.get("post") || "")) {
    const id = p.get("post");
    history.replaceState(history.state, "", urlAba(aba));
    abrirPublicacao(id);
  }
  // Links das mensagens do Flash: feed.html?flash=ID abre o flash; ?repostar=ID abre o criador para repostar.
  if (/^[A-Za-z0-9]{1,64}$/.test(p.get("flash") || "")) abrirFlashPorId(p.get("flash"));
  if (/^[A-Za-z0-9]{1,64}$/.test(p.get("repostar") || "")) repostarFlash(p.get("repostar"));
})();
