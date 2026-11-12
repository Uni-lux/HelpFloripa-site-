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
import { ligarPuxar } from "./puxar-atualizar.js?v=5";
import { textoCidade } from "./endereco.js?v=1";
import {
  $, el, icone, ms, paraData, pintarAvatar, urlSegura, nomeCidade, tempoRelativo, toast, erroAmigavel,
  fb, eu, dados, meusSeguindo, escondido, ganchos, obterPerfil, iniciarRede, carregarMeusSeguindo, linhaPessoa, pessoasEmPilha, blocoCasado,
  barraInteracao, abrirCompositor, avisarPublicacaoGuardada, abrirOpcoes, compartilharPerfil, botaoSeguir, montarBarraRede, marcarBarra, pintarBarraRede, ouvirAvisos, lerOrdenado,
  editarPublicacao, bloquear, comMencoes, fotosDoPost, carrosselFotos, contadorEstrelas, estaSalvo, alternarSalvo, escolherColecao, lerResumosEstrelas, contarComentarios,
  silenciado, alternarSilenciar, marcarVista, definirOrigem, jaVisto, confirmarHF, blocoEnquete, blocoCaixa, editarPublicoDoPost, apagarFlashesDaPublicacao
} from "./rede.js?v=148";
import { afinidade, sincronizarGosto, registrarGosto, PESO } from "./gosto.js?v=2";
import { montarStories, atualizarBarraFlash, abrirFlashPorId, abrirFlashesDoNegocio, repostarFlash, voltarAoFlash, novoFlash } from "./stories.js?v=120";
import { abrirDenuncia } from "./denuncias.js?v=7";
import { pessoasRecentes } from "./pessoas.js?v=6";
import { recarregarExplorar, abrirExplorar, definirCartao, abrirPublicacao, abrirTopico, montarSugestoes } from "./explorar.js?v=137";
import { docsComValidade, docsPorIds, buscarDeNovo } from "./leituras.js?v=4";
import { lerLocal } from "./local-escolhido.js?v=3";
import { distanciaKm, minhaPosicao } from "./perto.js?v=3";
import { combinaPublico, leitorDe, temPublico, resumoPublico } from "./publico-alvo.js?v=1";
import { postsDoEstado, pesoRegiao, RECENTES_PAIS } from "./regiao.js?v=5";
import { lerRanking, juntarRanking, fatorTaxa } from "./ranking-diario.js?v=1";
import { comDescoberta, sorteioFixo, janela } from "./relevancia.js?v=4";
import { maisNovo, marcoOu, haNovidade, pilulaNovidades, conferirDeTempos } from "./novidades.js?v=1";
import { partesDoTexto } from "./texto-pub.js?v=1";
import { layoutDe, blocoFotos, abrirVisorFotos, tomDestaque } from "./pub-modelos.js?v=1";

const POR_VEZ = 10;
// Publicação de conta desativada (conta.js): escondida até ocultoAte.
// Agendada: só aparece na hora marcada. Silenciado: some do seu Diário (você continua seguindo).
// Público da publicação (idade, gênero, lugar, seguidores): quem não está no público não vê no Diário (publico-alvo.js).
let leitor = null;
const foraDoPublico = (p) => !!leitor && !combinaPublico(p, leitor);
const postOculto = (p) => (p?.ocultoAte?.toMillis?.() ?? 0) > Date.now() || (p?.agendadoPara?.toMillis?.() ?? 0) > Date.now() || silenciado(p?.autorId) || foraDoPublico(p);
// Quem lê: os dados da própria conta + o lugar escolhido + a posição (espera no máximo 1,5 s pela posição).
// A posição só importa para publicações com público "perto de um lugar": o Diário não espera mais por ela (antes esperava
// até 1,5 s, baixando a lista de cidades, antes de mostrar qualquer coisa). Só espera se alguma publicação lida precisar.
let posPronta = null;
function prepararLeitor() {
  const montar = (pos) => { leitor = leitorDe({ uid: eu.uid, dados, local: lerLocal(), pos, segue: (u) => meusSeguindo.has(u) }); };
  montar(null);
  posPronta = minhaPosicao(dados).catch(() => null).then((pos) => { if (pos) montar(pos); return pos; });
}
async function esperarPosicaoSePrecisa(lista) {
  if (!posPronta || !lista.some((p) => p?.publico?.local === "perto")) return;
  await Promise.race([posPronta, new Promise((ok) => setTimeout(ok, 1500))]);
}
// Busca por hashtag: feed.html?tag=reforma
let tagAtual = (new URLSearchParams(location.search).get("tag") || "").toLowerCase().replace(/^#/, "").slice(0, 30);
// Publicações de um lugar: feed.html?local=-27.44,-48.50&n=Jurerê (o que foi publicado a até 3 km dali).
let localAtual = (() => {
  const pg = new URLSearchParams(location.search), m = /^(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)$/.exec(pg.get("local") || "");
  return m ? { lat: Number(m[1]), lng: Number(m[2]), nome: String(pg.get("n") || "Este lugar").slice(0, 80) } : null;
})();
// Hashtags e lugares agora abrem a página do assunto no EXPLORAR (como no Instagram), não um filtro do Diário (10/11/2026).
// Links antigos feed.html?tag= / ?local= abrem o Explorar com a página do assunto por cima.
const topicoDaUrl = tagAtual ? { tag: tagAtual } : localAtual ? { local: localAtual } : null;
tagAtual = ""; localAtual = null;
function abrirLocal(l) { abrirTopico({ local: { nome: l.nome, lat: Number(l.lat), lng: Number(l.lng) } }); }
// Tocar numa #hashtag (texto, etiquetas, Em alta) ou num lugar: abre a página do assunto aqui mesmo, sem recarregar.
document.addEventListener("click", (e) => {
  const a = e.target.closest?.('a[href*="feed.html?tag="], a[href*="feed.html?local="]');
  if (!a || !eu || e.ctrlKey || e.metaKey || e.shiftKey) return;
  const u = new URL(a.href, location.href), q = u.searchParams;
  const m = /^(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)$/.exec(q.get("local") || "");
  const alvo = q.get("tag") ? { tag: q.get("tag") } : m ? { local: { nome: q.get("n") || "Este lugar", lat: Number(m[1]), lng: Number(m[2]) } } : null;
  if (!alvo) return;
  e.preventDefault(); e.stopPropagation();
  abrirTopico(alvo);
}, true);
async function buscarLocal(l) {
  const s = await fb.getDocs(fb.query(fb.collection(fb.db, "diario"), fb.orderBy("criadoEm", "desc"), fb.limit(200)));
  return s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }))
    .filter((p) => p.local && (p.local.nome === l.nome || distanciaKm(l, p.local) <= 3));
}
// Filtro do Diário: Principais (o que tem a ver com você + quem você segue, pelo engajamento) ou Amigos.
const FILTROS = { principais: "Principais", seguindo: "Seguindo", amigos: "Amigos" };
let aba = "diario", filtro = "principais";
let marcoFeed = null, pilula = null; // a mais nova da tela e a pílula "Novas publicações" (atualizarDiario)
let posts = [], todosPosts = [], mostrados = 0, sugNaLista = false; // sugNaLista: o bloco de sugestões já entrou nesta lista

// ---------- abas ----------
// O Diário é um só: fotos, vídeos, textos, enquetes e perguntas juntos ("Registros" virou o filtro Textos).
const ABAS = ["diario", "explorar"];
const urlAba = (a) => (a === "diario" ? "feed.html" : `feed.html?aba=${a}`);
const abaDaUrl = () => { const a = new URLSearchParams(location.search).get("aba"); return a === "pessoas" ? "explorar" : a === "explorar" ? "explorar" : "diario"; };
const temMidia = (p) => !!(p.mediaUrl || (p.midias || []).length);
// Tipo de publicação (filtro do topo): tudo, fotos e vídeos, textos, enquetes e perguntas. Filtra o que já foi lido.
// Botões só com ícone numa linha fina (como a grade do perfil das redes sociais), com o nome no title/aria-label.
// "Reels" não filtra a lista: abre os vídeos em tela cheia (reels.js).
const TIPOS_FEED = [["tudo", "Tudo", "grade"], ["reels", "Vídeos", "reels"], ["textos", "Textos", "registros"], ["enquetes", "Enquetes e perguntas", "enquete"]];
let tipoFeed = "tudo"; // "fotos" (antigo) virou Reels // links antigos ?aba=registros abrem o Diário normal (textos e enquetes estão nele)
// Tipo da publicação (diario.tipo; nas antigas, pelo conteúdo).
const tipoDe = (p) => p.tipo || (p.enquete?.pergunta ? "enquete" : p.caixa?.pergunta ? "caixa" : p.mediaTipo === "video" && temMidia(p) ? "video" : temMidia(p) ? "foto" : "texto");
const doTipo = (p) => tipoFeed === "tudo" || (tipoFeed === "fotos" ? ["foto", "video"].includes(tipoDe(p)) : tipoFeed === "enquetes" ? ["enquete", "caixa"].includes(tipoDe(p)) : tipoDe(p) === "texto");
const daAba = (p) => p._emDia ? tipoFeed === "tudo" && !tagAtual && !localAtual : !!(tagAtual || localAtual) || doTipo(p);
// Reels: os vídeos já lidos + os mais novos do servidor, com as mesmas regras do Diário (silenciados, público...).
const verReels = (comecarEm = null) => import("./reels.js?v=67").then((m) => m.abrirReels({ lista: todosPosts, oculto: postOculto, comecarEm, aoNovo: () => compor("video") }));
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
  scrollDaAba[aba] = scrollY;
  aba = nova;
  $("painelFeed").hidden = aba === "explorar";
  $("painelExplorar").hidden = aba !== "explorar";
  scrollTo({ top: scrollDaAba[aba] || 0, behavior: "instant" });
  marcarBarra(aba === "explorar" ? "explorar" : "diario");
  if (!passo) history.replaceState({ ...(history.state || {}), hfAbaFeed: aba }, "", urlAba(aba) + (tagAtual ? `?tag=${encodeURIComponent(tagAtual)}` : ""));
  if (aba === "explorar") { pilula?.esconder(); abrirExplorar(); }
  else carregarFeed({ forcar: false });
}
// Cada aba (Diário / Explorar) volta para onde estava rolada.
const scrollDaAba = { diario: 0, explorar: 0 };
// Deslizar entre Diário e Explorar (deslizar-flash.js): a outra aba aparece DE VERDADE ao lado, na rolagem em que
// estava, e anda junto com o dedo (antes aparecia um painel com o ícone e o nome). Devolve { atual, el, fim, cancelar }.
window.__hfPreviaAba = (k) => {
  if (!eu || k === aba || !ABAS.includes(k)) return null;
  const atual = $(aba === "explorar" ? "painelExplorar" : "painelFeed"), el = $(k === "explorar" ? "painelExplorar" : "painelFeed");
  const r = atual.getBoundingClientRect();
  if (!r.width) return null;
  if (k === "explorar") abrirExplorar(); else if (!$("listaFeed").children.length) carregarFeed({ forcar: false });
  const topo = r.top + scrollY - (scrollDaAba[k] || 0);
  Object.assign(el.style, { position: "fixed", top: topo + "px", left: r.left + "px", width: r.width + "px", zIndex: "1", margin: "0" });
  el.hidden = false;
  const limpar = () => { for (const p of ["position", "top", "left", "width", "zIndex", "margin", "transform"]) el.style[p] = ""; el.classList.remove("df-anima", "df-movendo"); };
  return { atual, el, fim: limpar, cancelar: () => { limpar(); el.hidden = true; } };
};
pintarTipos();
addEventListener("popstate", () => { const a = history.state?.hfAbaFeed || abaDaUrl(); if (a !== aba && eu) trocarAba(a); });
// Dentro da rede (rede.html): a casca troca entre Diário e Explorar sem recarregar (antes de terminar de abrir, guarda o pedido).
let abaPedida = null;
window.__hfTrocarAba = (k) => {
  if (!["diario", "explorar"].includes(k)) return;
  if (!eu) { abaPedida = k; return; }
  if (k !== aba) trocarAba(k);
};
// Barra de baixo: Diário e Explorar trocam aqui mesmo (sem recarregar a página).
document.addEventListener("click", (e) => {
  const a = e.target.closest?.("#barraRede [data-barra]");
  if (!a || !eu || !["diario", "explorar"].includes(a.dataset.barra)) return;
  e.preventDefault();
  const alvo = a.dataset.barra;
  // Dentro da rede (rede.html) o passo do "voltar" entre abas é da casca: aqui só troca.
  if (alvo !== aba) trocarAba(alvo, { passo: !document.documentElement.classList.contains("na-rede") }); else scrollTo({ top: 0, behavior: "smooth" });
});
function pintarFiltro() {
  $("filtroAtual").textContent = localAtual ? "📍 " + localAtual.nome : tagAtual ? "#" + tagAtual : FILTROS[filtro];
  $("filtroFeedBtn").classList.toggle("com-tag", !!(tagAtual || localAtual));
  definirOrigem(tagAtual || localAtual ? "tag" : filtro);
  pintarCabLugar();
}
// Página de um lugar ou de uma hashtag (tocar no lugar/# de um flash ou de uma publicação), 09/11/2026: antes aparecia só
// a linha fina de filtros com o nome cortado ("📍 Tapera da Base, Florianóp") e os ícones; agora um cabeçalho próprio
// (ícone, nome inteiro, quantas publicações, Como chegar / Publicar e Voltar ao Diário). O Flash e os filtros saem.
function sairDoLugar() { tagAtual = ""; localAtual = null; history.replaceState(history.state, "", "feed.html"); pintarFiltro(); carregarFeed(); }
function pintarCabLugar(qtd) {
  let cab = $("feedLugar");
  const ativo = !!(localAtual || tagAtual);
  document.body.classList.toggle("modo-lugar", ativo);
  if (!ativo) { cab?.remove(); return; }
  if (!cab) { cab = el("section", "feed-lugar"); cab.id = "feedLugar"; $("listaFeed").before(cab); }
  const chave = localAtual ? `l:${localAtual.lat},${localAtual.lng}` : `t:${tagAtual}`;
  if (cab.dataset.chave !== chave) {
    cab.dataset.chave = chave; cab.replaceChildren();
    const fechar = el("button", "fl-voltar"); fechar.type = "button"; fechar.setAttribute("aria-label", "Voltar ao Diário"); fechar.appendChild(icone("voltar", "i s"));
    fechar.addEventListener("click", sairDoLugar);
    const ic = el("span", "fl-ic " + (localAtual ? "lugar" : "tag")); ic.appendChild(icone(localAtual ? "local" : "hashtag", "i"));
    const tx = el("div", "fl-tx");
    tx.append(el("small", null, localAtual ? "Lugar" : "Hashtag"), el("h2", null, localAtual ? localAtual.nome : "#" + tagAtual), el("span", "fl-qtd", "Carregando as publicações…"));
    const acoes = el("div", "fl-acoes");
    if (localAtual) {
      const ir = el("a", "fl-bt"); ir.href = `https://www.google.com/maps/search/?api=1&query=${localAtual.lat},${localAtual.lng}`; ir.target = "_blank"; ir.rel = "noopener";
      ir.append(icone("bussola", "i s"), "Como chegar");
      acoes.appendChild(ir);
    }
    const pub = el("button", "fl-bt pri"); pub.type = "button"; pub.append(icone("criar", "i s"), localAtual ? "Publicar aqui" : `Publicar com #${tagAtual}`);
    pub.addEventListener("click", () => compor(tagAtual ? `#${tagAtual} ` : ""));
    acoes.appendChild(pub);
    const topo = el("div", "fl-topo"); topo.append(fechar, ic, tx);
    cab.append(topo, acoes);
    if (localAtual) cab.appendChild(el("p", "fl-dica", "Publicações marcadas neste lugar ou a até 3 km dele."));
  }
  if (qtd !== undefined) cab.querySelector(".fl-qtd").textContent = qtd ? `${qtd} ${qtd === 1 ? "publicação" : "publicações"}` : "Nenhuma publicação ainda";
}
$("filtroFeedBtn").addEventListener("click", () => abrirOpcoes("Mostrar no Diário", [
  tagAtual && { rotulo: `Sair de #${tagAtual}`, sub: "Voltar para o Diário", icone: "fechar", fn: () => { tagAtual = ""; history.replaceState(history.state, "", "feed.html"); pintarFiltro(); carregarFeed(); } },
  localAtual && { rotulo: `Sair de ${localAtual.nome}`, sub: "Voltar para o Diário", icone: "fechar", fn: () => { localAtual = null; history.replaceState(history.state, "", "feed.html"); pintarFiltro(); carregarFeed(); } },
  { rotulo: "Principais" + (filtro === "principais" ? "  ✓" : ""), sub: "O que combina com você e as novidades de quem você segue", icone: "estrela", fn: () => mudarFiltro("principais") },
  { rotulo: "Seguindo" + (filtro === "seguindo" ? "  ✓" : ""), sub: "Só quem você segue, das mais novas para as mais antigas", icone: "pessoa", fn: () => mudarFiltro("seguindo") },
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
  const ler = (l, k) => docsComValidade(fb, `diario-${chave}-${eu.uid}-${k}`,
    fb.query(col, fb.where("autorId", "in", l), fb.orderBy("criadoEm", "desc"), fb.limit(20)), DIARIO_VALIDADE).catch(() => lerOrdenado(
    fb.query(col, fb.where("autorId", "in", l), fb.orderBy("criadoEm", "desc"), fb.limit(20)),
    fb.query(col, fb.where("autorId", "in", l), fb.limit(20))
  )).catch(() => ({ docs: [] }));
  const comoPost = (d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) });
  const res = await Promise.all(lotes.map(async (l, k) => {
    const posts = (await ler(l, k)).docs.map(comoPost);
    // Anti-spam: se 1 ou 2 pessoas que postam muito encheram as 20 do lote, lê de novo SEM elas (só nesse caso, para
    // não gastar leitura à toa) e as outras pessoas que você segue não somem do Diário.
    const conta = contarPorAutor(posts);
    const muito = [...conta].filter(([, n]) => n > POR_AUTOR).map(([u]) => u);
    const resto = l.filter((u) => !muito.includes(u));
    if (posts.length < 20 || !muito.length || !resto.length) return posts;
    return [...posts, ...(await ler(resto, `${k}-sem`)).docs.map(comoPost)];
  }));
  return limitarPorAutor(res.flat(), POR_AUTOR);
}
// No máximo POR_AUTOR publicações recentes de cada pessoa entram na escolha do Diário (as mais novas).
const POR_AUTOR = 3;
function contarPorAutor(lista) { const m = new Map(); for (const p of lista) m.set(p.autorId, (m.get(p.autorId) || 0) + 1); return m; }
function limitarPorAutor(lista, max) {
  const vistos = new Set(), conta = new Map(), saida = [];
  for (const p of lista.slice().sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm))) {
    if (vistos.has(p.id)) continue; vistos.add(p.id);
    const n = conta.get(p.autorId) || 0;
    if (n < max) { conta.set(p.autorId, n + 1); saida.push(p); }
  }
  return saida;
}
// Seguindo (como o "Seguindo" do Instagram): só quem você segue, em ordem de data, sem ordem por nota e sem limite por
// pessoa. Lê as 20 mais novas de cada grupo de até 30 pessoas (índice autorId + criadoEm). Cada grupo só está completo até
// a publicação mais antiga que ele trouxe: a página para no ponto em que TODOS os grupos estão completos, e "Ver mais"
// continua dali (criadoEm < esse ponto) — nada fica pulado entre um grupo e outro.
let cursorSeguindo = null, maisSeguindo = false;
async function buscarSeguindoCrono(continuar = false) {
  if (!continuar) { cursorSeguindo = null; maisSeguindo = false; }
  else if (!cursorSeguindo) return [];
  const autores = [...meusSeguindo].filter((u) => u !== eu.uid && !escondido(u));
  if (!autores.length) return [];
  const lotes = [];
  for (let i = 0; i < autores.length; i += 30) lotes.push(autores.slice(i, i + 30));
  const col = fb.collection(fb.db, "diario"), N = 20;
  const antes = continuar ? [fb.where("criadoEm", "<", fb.Timestamp.fromMillis(cursorSeguindo))] : [];
  const q = (l) => fb.query(col, fb.where("autorId", "in", l), ...antes, fb.orderBy("criadoEm", "desc"), fb.limit(N));
  const res = await Promise.all(lotes.map((l, k) => (continuar ? fb.getDocs(q(l)) : docsComValidade(fb, `diario-segcrono-${eu.uid}-${k}`, q(l), DIARIO_VALIDADE))
    .catch(() => lerOrdenado(q(l), fb.query(col, fb.where("autorId", "in", l), fb.limit(N)))).catch(() => ({ docs: [] }))));
  const lista = res.flatMap((s) => s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })));
  // O grupo cheio que parou mais tarde manda: abaixo dele pode faltar publicação desse grupo.
  const cheios = res.filter((s) => s.docs.length >= N).map((s) => ms(s.docs.at(-1).data({ serverTimestamps: "estimate" }).criadoEm));
  maisSeguindo = cheios.length > 0;
  const corte = maisSeguindo ? Math.max(...cheios) : 0;
  cursorSeguindo = maisSeguindo ? corte : null;
  return lista.filter((p) => ms(p.criadoEm) >= corte).sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
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
// Ranking do servidor (ranking-diario.js): o que sobrou das listas, para o "Ver mais" antes das mais antigas.
let restoRanking = [];
const RECENTES_COM_RANKING = 20;
// Publicações do ranking, com os números do servidor (_srv): estrelas, comentários e quem viu.
async function postsDoRanking(itens) {
  if (!itens.length) return [];
  const docs = await docsPorIds(fb, "diario", itens.map((x) => x.id), DIARIO_VALIDADE);
  return itens.map((x) => { const d = docs.get(x.id); return d ? { id: x.id, ...d, _srv: x } : null; }).filter(Boolean);
}
async function buscarPrincipais(continuar = false) {
  const base = [fb.collection(fb.db, "diario"), fb.orderBy("criadoEm", "desc")];
  if (continuar) {
    // Primeiro o resto do ranking do servidor (as boas que não couberam), depois as mais antigas do país.
    if (restoRanking.length) {
      const lote = restoRanking.splice(0, 40);
      maisPrincipais = !!restoRanking.length || !!cursorPrincipais;
      return ordenarPrincipais(await postsDoRanking(lote), { marcador: false });
    }
    if (!cursorPrincipais) return [];
    const s = await fb.getDocs(fb.query(...base, fb.startAfter(cursorPrincipais), fb.limit(RECENTES_PAIS)));
    cursorPrincipais = s.docs.at(-1) || null; maisPrincipais = s.size === RECENTES_PAIS;
    return ordenarPrincipais(s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })), { marcador: false });
  }
  const regiao = regiaoLeitor();
  // Com o ranking do servidor (Blaze): as melhores das últimas 48 h da sua cidade, do seu estado e do Brasil, já com os
  // números; mais as 20 recentes do país (as que saíram depois da última rodada da função, a cada 15 min).
  const ranking = await lerRanking(fb, regiao);
  if (ranking) {
    const { escolhidos, resto } = juntarRanking(ranking, undefined, (x) => escondido(x.autorId));
    restoRanking = resto;
    const q = fb.query(...base, fb.limit(RECENTES_COM_RANKING));
    const [doRanking, s, deQuemSigo, republicados] = await Promise.all([
      postsDoRanking(escolhidos).catch(() => []),
      docsComValidade(fb, "diario-principais-" + RECENTES_COM_RANKING, q, DIARIO_VALIDADE),
      buscarSeguindo().catch(() => []),
      buscarRepublicados().catch(() => []),
      sincronizarGosto(fb, eu.uid)
    ]);
    cursorPrincipais = s.docs.at(-1) || null; maisPrincipais = !!restoRanking.length || s.size === RECENTES_COM_RANKING;
    return ordenarPrincipais([...doRanking, ...s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })), ...deQuemSigo, ...republicados]);
  }
  restoRanking = [];
  const q = fb.query(...base, fb.limit(RECENTES_PAIS));
  const [s, deQuemSigo, doEstado, republicados] = await Promise.all([
    docsComValidade(fb, "diario-principais", q, DIARIO_VALIDADE),
    buscarSeguindo().catch(() => []),
    postsDoEstado(fb, regiao.uf),
    buscarRepublicados().catch(() => []),
    sincronizarGosto(fb, eu.uid)
  ]);
  cursorPrincipais = s.docs.at(-1) || null; maisPrincipais = s.size === RECENTES_PAIS;
  return ordenarPrincipais([...s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })), ...deQuemSigo, ...doEstado, ...republicados]);
}
async function ordenarPrincipais(bruto, { marcador = true } = {}) {
  // Sem repetidas; a mesma publicação vinda também por uma republicação guarda o "Fulano republicou".
  const unicos = new Map();
  await esperarPosicaoSePrecisa(bruto);
  bruto.forEach((p) => { const x = unicos.get(p.id); if (!x) unicos.set(p.id, p); else { if (p._repost && !x._repost) x._repost = p._repost; if (p._srv && !x._srv) x._srv = p._srv; } });
  const lista = [...unicos.values()].filter((p) => !escondido(p.autorId) && !postOculto(p));
  const regiao = regiaoLeitor();
  // Estrelas: as do ranking já vêm do servidor; só as outras são lidas.
  const lidos = await lerResumosEstrelas(lista.filter((p) => !p._srv).map((p) => p.id));
  const resumos = new Map(lidos);
  lista.forEach((p) => { if (p._srv) resumos.set(p.id, { total: p._srv.total, soma: p._srv.soma }); });
  const agora = Date.now();
  const sigo = (p) => meusSeguindo.has(p.autorId) || !!p._repost;
  const minha = (p) => p.autorId === eu.uid;
  const gosto = new Map(lista.map((p) => [p.id, afinidade(p)]));
  const eng = (p) => { const r = resumos.get(p.id) || { total: 0, soma: 0 }; return r.total + Math.max(0, r.soma - 3 * r.total) * 0.4; };
  const pre = (p) => (1 + eng(p)) * (1 + gosto.get(p.id)) * (sigo(p) ? 1.8 : 1);
  // Comentários: conta só para as 20 mais promissoras (contagem guardada no aparelho por alguns minutos).
  // (As do ranking do servidor já trazem os comentários.)
  const ordem1 = lista.filter((p) => !p._srv).sort((a, b) => pre(b) - pre(a)).slice(0, 20);
  const com = new Map(await Promise.all(ordem1.map(async (p) => [p.id, await contarComentarios(p.id).catch(() => 0)])));
  lista.forEach((p) => { if (p._srv) com.set(p.id, p._srv.comentarios); });
  // Nota de cada publicação (03/11/2026: as novas não ficam mais embaixo das antigas).
  // - Engajamento conta com retorno decrescente (log): 30 estrelas não valem 30× uma publicação nova sem nenhuma.
  //   Antes contava cheio e a idade pesava pouco (expoente 1,1 para quem você segue): uma publicação de 2 dias muito
  //   curtida ficava acima das que acabaram de sair.
  // - Frescor: até 24 h, o que você ainda não viu ganha até ×3,5 (some aos poucos, mais forte nas primeiras horas).
  // - Idade divide em todas: (horas + 2)^1,3 (quem você segue 1,2: envelhece um pouco mais devagar).
  const engDe = (p) => Math.log1p(eng(p) + 2 * (com.get(p.id) || 0));
  const pontos = (p) => {
    // Idade: agendada conta de quando apareceu; republicada, de quando foi republicada (se for mais recente).
    const quando = Math.max(ms(p.agendadoPara) || ms(p.criadoEm) || agora, p._repost?.em || 0);
    const horas = Math.max(0, (agora - quando) / 3600e3);
    // Sua cidade e seu estado pesam mais (site nacional): regiao.js. Republicada por quem você segue: empurrão social.
    const base = (1 + 1.2 * engDe(p)) * (1 + gosto.get(p.id)) * (sigo(p) ? 1.6 : 1) * (p._repost ? 1.2 + 0.15 * Math.min(4, p._repost.outros) : 1) * pesoRegiao(p, regiao) * fatorTaxa(p._srv);
    // As suas: no topo logo depois de publicar (até 3 h) e depois descem como as outras.
    if (minha(p)) return base * (horas < 3 ? 12 : 0.3) / Math.pow(horas + 2, 1.3);
    const visto = jaVisto(p.id);
    const frescor = !visto && horas < 24 ? 1 + 2.5 * Math.pow(1 - horas / 24, 2) : 1;
    return base * (visto ? 0.3 : 1) * frescor * (0.9 + 0.2 * sorteioFixo(eu.uid + ":" + janela() + ":" + p.id)) / Math.pow(horas + 2, sigo(p) ? 1.2 : 1.3);
  };
  // Descoberta: de quem você não segue, com pouco alcance ainda (até 3 notas e até 1 comentário) e que você não viu.
  const descoberta = (p) => !sigo(p) && !minha(p) && !jaVisto(p.id) && (resumos.get(p.id)?.total || 0) <= 3 && (com.get(p.id) || 0) <= 1;
  // Anti-spam: cada publicação a mais da MESMA pessoa vale menos (1ª ×1, 2ª ×0,55, 3ª ×0,3) e só as POR_AUTOR melhores
  // de cada pessoa entram (por leitura; "Ver mais" traz as outras). Quem posta 30 seguidas não ocupa o Diário inteiro.
  // As suas não entram nessa conta.
  const comNota = lista.map((p) => ({ ...p, _pontos: pontos(p) })).sort((a, b) => b._pontos - a._pontos);
  const vezes = new Map();
  const ordenada = comNota.filter((p) => {
    if (minha(p)) return true;
    const k = vezes.get(p.autorId) || 0;
    vezes.set(p.autorId, k + 1);
    p._pontos *= Math.pow(0.55, k);
    return k < POR_AUTOR;
  }).sort((a, b) => b._pontos - a._pontos);
  // "Você está em dia" (como o Instagram): as novidades de quem você segue (até 3 dias, que você ainda não viu) e as suas
  // das últimas 3 h vêm primeiro; depois um aviso e, embaixo, as sugestões (o resto). A descoberta (1 a cada 5) continua
  // entrando no meio das novidades.
  const novidade = (p) => minha(p) ? agora - ms(p.criadoEm) < 3 * 3600e3 : sigo(p) && !jaVisto(p.id) && agora - Math.max(ms(p.agendadoPara) || ms(p.criadoEm) || agora, p._repost?.em || 0) < 3 * 864e5;
  if (!marcador) return espalharAutores(comDescoberta(ordenada, descoberta));
  const A = ordenada.filter(novidade), B = ordenada.filter((p) => !novidade(p));
  const { topo, resto } = comEmDia(A, B, descoberta);
  if (!meusSeguindo.size || !resto.length) return [...topo, ...resto];
  return [...topo, { id: "__emdia", _emDia: true, _novidades: A.length }, ...resto];
}
// Parte de cima (novidades de quem você segue) com a descoberta nos lugares 3, 8, 13... e no máximo 2 da mesma pessoa
// nas 10 primeiras (se só sobrar novidade da mesma pessoa, ela entra assim mesmo: as novidades não descem para depois
// do aviso). O resto (sugestões) segue a ordem de sempre.
function comEmDia(A, B, ehDescoberta) {
  const desc = B.filter(ehDescoberta), usados = new Set(), topo = [], conta = new Map(), deA = new Set(A);
  const cabe = (p) => topo.length >= 10 || (conta.get(p.autorId) || 0) < 2;
  const pegar = (fila, forcar) => fila.find((p) => !usados.has(p) && cabe(p)) || (forcar ? fila.find((p) => !usados.has(p)) : null);
  let falta = A.length;
  while (falta) {
    const vez = topo.length >= 2 && (topo.length - 2) % 5 === 0;
    const p = (vez && pegar(desc)) || pegar(A, true);
    usados.add(p); topo.push(p); conta.set(p.autorId, (conta.get(p.autorId) || 0) + 1);
    if (deA.has(p)) falta--;
  }
  return { topo: espalharAutores(topo), resto: espalharAutores(comDescoberta(B.filter((p) => !usados.has(p)), ehDescoberta)) };
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
// Puxar para atualizar esperto (como o Instagram): primeiro pergunta ao servidor se saiu alguma publicação depois da mais
// nova da tela (1 leitura); sem novidade, a lista fica (as estrelas e a ordem só são refeitas se ela tiver mais de 10 min).
async function atualizarDiario() {
  const velho = !feedCarregado || feedCarregado.chave !== chaveFeed() || Date.now() - feedCarregado.em > 10 * 60000 || !todosPosts.length;
  if (velho || (await haNovidade(fb, fb.db, "diario", [], "criadoEm", marcoFeed))) await carregarFeed({ forcar: true });
  pilula?.esconder();
}
// "Novas publicações ↑": de 2 em 2 min (só com a página à vista) confere se quem você segue publicou depois da mais nova
// da tela (sem seguir ninguém, qualquer pessoa). 1 leitura por conferência; tocar sobe e atualiza.
async function conferirNovasPublicacoes() {
  if (aba !== "diario" || !marcoFeed || !feedCarregado || pilula?.ligada || localAtual || tagAtual) return;
  const seg = [...meusSeguindo].filter((u) => u !== eu.uid && !escondido(u)).slice(0, 30);
  const novas = await haNovidade(fb, fb.db, "diario", seg.length ? [fb.where("autorId", "in", seg)] : [], "criadoEm", marcoFeed, 3);
  const boas = (Array.isArray(novas) ? novas : []).filter((p) => p.autorId !== eu.uid && !escondido(p.autorId) && !postOculto(p) && !((p.agendadoPara?.toMillis?.() ?? 0) > Date.now()));
  if (!boas.length) return;
  const rostos = [...new Map(boas.map((p) => [p.autorId, { foto: p.fotoPerfil, nome: p.nome }])).values()];
  pilula ||= pilulaNovidades({ aoTocar: () => { buscarDeNovo(); return carregarFeed({ forcar: true }); } });
  pilula.mostrar({ texto: "Novas publicações", fotos: rostos });
}

// O que está na tela vale por alguns minutos: voltar do Explorar (ou deslizar entre as abas) não lê tudo de novo.
const MANTER_FEED = 4 * 60000;
let feedCarregado = null; // { chave, em }
const chaveFeed = () => `${filtro}|${tagAtual}|${localAtual ? localAtual.lat + "," + localAtual.lng : ""}`;
const feedAtual = () => !!feedCarregado && feedCarregado.chave === chaveFeed() && Date.now() - feedCarregado.em < MANTER_FEED && !!$("listaFeed").children.length;
// Última lista do Principais guardada no aparelho (só os ids; as publicações vêm do cache do Firebase): o Diário abre com
// ela NA HORA e a lista nova do servidor entra por trás (como os apps grandes). Se você já começou a rolar, o que está na
// tela fica e o resto da lista nova continua embaixo.
const chaveUltimos = () => "hf-diario-ultimos-" + eu.uid;
function guardarUltimos(lista) {
  try { localStorage.setItem(chaveUltimos(), JSON.stringify({ em: Date.now(), ids: lista.filter((p) => !p._emDia).slice(0, 8).map((p) => p.id) })); } catch {}
}
async function postsDoAparelho() {
  let g = null;
  try { g = JSON.parse(localStorage.getItem(chaveUltimos()) || "null"); } catch {}
  if (!g?.ids?.length || Date.now() - g.em > 2 * 864e5 || !fb.getDocFromCache) return [];
  const docs = await Promise.all(g.ids.map((id) => fb.getDocFromCache(fb.doc(fb.db, "diario", id)).then((d) => (d.exists() ? { id, ...d.data({ serverTimestamps: "estimate" }) } : null)).catch(() => null)));
  return docs.filter((p) => p && !escondido(p.autorId) && !postOculto(p));
}
let geracaoFeed = 0;
// O Flash (fotos grandes) só começa a baixar depois que as primeiras publicações apareceram (ou 5 s): antes os dois
// disputavam a mesma internet e nada aparecia.
let primeirasProntas;
const primeirasPublicacoes = new Promise((ok) => { primeirasProntas = ok; setTimeout(ok, 5000); });
async function carregarFeed({ forcar = true } = {}) {
  if (!forcar && feedAtual()) return;
  const lista = $("listaFeed");
  const g = ++geracaoFeed;
  const principal = !localAtual && !tagAtual && filtro === "principais";
  let copia = [];
  if (principal && !lista.children.length) copia = (await postsDoAparelho().catch(() => [])).filter(doTipo);
  if (g !== geracaoFeed) return;
  const comCopia = copia.length >= 2;
  if (comCopia) {
    posts = copia; todosPosts = copia.slice(); mostrados = 0; sugNaLista = true; // cópia rápida: sem sugestões (entram com a lista completa)
    lista.replaceChildren(); mostrarMais(); $("maisFeed").hidden = true;
  } else {
    lista.replaceChildren(el("div", "esqueleto-post"), el("div", "esqueleto-post"));
    $("maisFeed").hidden = true;
  }
  let y0 = scrollY;
  let mostrouRapida = false;
  try {
    maisTodos = false; maisPrincipais = false;
    // Sem nada guardado no aparelho: PRIMEIRO só as 4 mais novas (leitura pequena, sozinha na conexão) e elas aparecem;
    // SÓ DEPOIS a lista completa (dezenas de publicações com as fotos dentro, que no 4G levava quase 1 minuto e deixava a
    // tela no esqueleto; medido em 04/11/2026). A lista completa entra por trás.
    if (principal && !comCopia) {
      try {
        const sn = await Promise.race([
          fb.getDocs(fb.query(fb.collection(fb.db, "diario"), fb.orderBy("criadoEm", "desc"), fb.limit(4))),
          new Promise((_, nao) => setTimeout(() => nao(new Error("demorou")), 9000)),
        ]);
        if (g !== geracaoFeed) return;
        const r = sn.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })).filter((p) => !escondido(p.autorId) && !postOculto(p) && doTipo(p));
        if (r.length) {
          copia = r; mostrouRapida = true;
          posts = r; todosPosts = r.slice(); mostrados = 0; sugNaLista = true;
          lista.replaceChildren(); mostrarMais(); $("maisFeed").hidden = true;
          y0 = scrollY;
        }
      } catch {}
    }
    primeirasProntas();
    try { if (window.parent !== window) window.parent.__hfShell?.conteudoPronto?.(); } catch {}
    const pedido = localAtual ? buscarLocal(localAtual) : tagAtual ? buscarTag(tagAtual) : filtro === "amigos" ? buscarAmigos() : filtro === "seguindo" ? buscarSeguindoCrono() : buscarPrincipais();
    const bruto = await pedido;
    if (g !== geracaoFeed) return;
    todosPosts = bruto.filter((p) => p._emDia || (!escondido(p.autorId) && !postOculto(p)));
    if (localAtual || tagAtual || filtro !== "principais") todosPosts.sort((a, b) => ms(b.agendadoPara || b.criadoEm) - ms(a.agendadoPara || a.criadoEm)); // principais: pela pontuação
    if (localAtual || tagAtual) pintarCabLugar(todosPosts.filter((p) => !postOculto?.(p)).length);
  } catch (e) {
    console.warn(e);
    primeirasProntas();
    if (g !== geracaoFeed) return;
    if (comCopia) { toast("Sem conexão: mostrando o que já estava no aparelho."); return; }
    lista.replaceChildren(vazio("Não foi possível carregar o diário", erroAmigavel(e)));
    return;
  }
  feedCarregado = { chave: chaveFeed(), em: Date.now() };
  marcoFeed = marcoOu(maisNovo(todosPosts.filter((p) => !p._emDia)), Date.now() - 60000);
  pilula?.esconder();
  if (principal) guardarUltimos(todosPosts);
  // Com a cópia na tela e a pessoa já rolando (ou com algo aberto): mantém o que ela está vendo e põe o resto embaixo.
  if ((comCopia || mostrouRapida) && (Math.abs(scrollY - y0) > 60 || scrollY > 120)) {
    const vistos = new Set(copia.map((p) => p.id));
    todosPosts = [...copia, ...todosPosts.filter((p) => !vistos.has(p.id))];
    posts = todosPosts.filter(daAba);
    mostrados = Math.min(posts.length, copia.length);
    $("maisFeed").hidden = mostrados >= posts.length && !temMaisPrincipais();
    return;
  }
  mostrarFiltrados();
}
// Aplica o filtro de tipo (Tudo, Fotos e vídeos, Textos, Enquetes) no que já foi lido, sem ler de novo.
function mostrarFiltrados() {
  const lista = $("listaFeed");
  posts = todosPosts.filter(daAba);
  mostrados = 0; sugNaLista = false;
  lista.replaceChildren();
  if (!posts.length) {
    const nomeTipo = TIPOS_FEED.find((t) => t[0] === tipoFeed)?.[1].toLowerCase();
    lista.appendChild(localAtual ? vazio(`Nada publicado em ${localAtual.nome} ainda`, "Adicione o local na sua publicação para começar.", "Publicar agora", () => compor()) : tagAtual ? vazio(`Nada com #${tagAtual} ainda`, "Use a hashtag na sua publicação para começar.", "Publicar agora", () => compor())
      : tipoFeed !== "tudo" && todosPosts.length ? vazio(`Nenhuma publicação de ${nomeTipo} por aqui ainda`, "Mude o filtro para ver tudo ou publique a primeira.", "Ver tudo", () => { tipoFeed = "tudo"; pintarTipos(); mostrarFiltrados(); })
      : filtro === "principais" ? vazio("Nada publicado por aqui ainda", "Compartilhe uma foto do seu trabalho, um texto ou faça uma enquete.", "Publicar agora", () => compor())
      : filtro === "seguindo" ? vazio(meusSeguindo.size ? "Quem você segue ainda não publicou" : "Você ainda não segue ninguém", meusSeguindo.size ? "As publicações de quem você segue aparecem aqui, das mais novas para as mais antigas." : "Siga pessoas e negócios para ver aqui o que eles publicam, em ordem de data.", "Abrir o Explorar", () => trocarAba("explorar"))
      : vazio("Seus amigos ainda não publicaram", "Amigos são seus vínculos do Social e quem vocês se seguem.", "Ver as principais", () => mudarFiltro("principais")));
    $("maisFeed").hidden = !temMaisPrincipais();
    return;
  }
  mostrarMais();
}
function mostrarMais() {
  const lista = $("listaFeed");
  posts.slice(mostrados, mostrados + POR_VEZ).forEach((p, i) => {
    lista.appendChild(p._emDia ? cartaoEmDia(p) : cartaoPost(p));
    // Sugestões para você no meio do Diário (como no Instagram): depois da 4ª publicação, uma vez por lista.
    if (!p._emDia && podeSugerir() && posts.slice(0, mostrados + i + 1).filter((x) => !x._emDia).length >= SUG_DEPOIS) lista.appendChild(blocoSugestoes());
  });
  mostrados = Math.min(posts.length, mostrados + POR_VEZ);
  // Com poucas publicações: as sugestões entram no fim.
  if (mostrados >= posts.length && posts.length >= 1 && podeSugerir()) lista.appendChild(blocoSugestoes());
  $("maisFeed").hidden = mostrados >= posts.length && !temMaisPrincipais();
}
const SUG_DEPOIS = 4;
const podeSugerir = () => !sugNaLista && (filtro === "principais" || filtro === "seguindo") && tipoFeed === "tudo" && !tagAtual && !localAtual;
function blocoSugestoes() {
  sugNaLista = true;
  const b = el("section", "feed-sug"); b.setAttribute("aria-label", "Sugestões para você");
  const topo = el("div", "feed-sug-topo");
  const tit = el("div"); tit.append(el("strong", null, "Sugestões para você"), el("small", null, "Pessoas que você pode conhecer"));
  const ver = el("button", null, "Ver tudo"); ver.type = "button";
  ver.addEventListener("click", () => { trocarAba("explorar"); setTimeout(() => $("secSugestoes")?.scrollIntoView({ block: "start", behavior: "smooth" }), 400); });
  topo.append(tit, ver);
  const corpo = el("div");
  b.append(topo, corpo);
  b.hidden = true;
  montarSugestoes(corpo, { max: 10, aoEsvaziar: () => b.remove() }).then((n) => { if (n) b.hidden = false; else b.remove(); }).catch(() => b.remove());
  return b;
}
const temMaisPrincipais = () => !localAtual && !tagAtual && ((maisPrincipais && filtro === "principais") || (maisSeguindo && filtro === "seguindo"));
// Aviso "Você está em dia" no meio do Diário (Principais).
function cartaoEmDia(m) {
  const c = el("div", "feed-em-dia");
  c.dataset.emDia = "1";
  const ic = el("span", "fed-ic"); ic.append(icone("check"));
  const ver = el("button", "fed-link", "Ver as anteriores de quem você segue"); ver.type = "button";
  ver.addEventListener("click", () => { mudarFiltro("seguindo"); scrollTo({ top: 0, behavior: "smooth" }); });
  c.append(ic, el("strong", null, "Você está em dia"),
    el("span", null, m._novidades ? "Você viu as novidades de quem você segue dos últimos 3 dias." : "Nada novo de quem você segue nos últimos 3 dias."),
    ver, el("div", "fed-sug", "Sugestões para você"));
  return c;
}
let buscandoMais = false;
$("maisFeed").addEventListener("click", async () => {
  const principais = temMaisPrincipais();
  if (mostrados < posts.length || (!principais && (filtro !== "todos" || !maisTodos))) { mostrarMais(); return; } // (filtro "todos" saiu; o resto fica para o caso de voltar)
  if (buscandoMais) return;
  buscandoMais = true; $("maisFeed").disabled = true;
  try {
    const ja = new Set(todosPosts.map((p) => p.id));
    const novos = (await (principais ? (filtro === "seguindo" ? buscarSeguindoCrono(true) : buscarPrincipais(true)) : buscarTodos(true))).filter((p) => !ja.has(p.id) && !escondido(p.autorId) && !postOculto(p));
    const ord = principais && filtro === "principais" ? novos : novos.sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
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
  if (!post._previa) vigiaVista?.observe(c);
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
  if (post.local?.nome && Number.isFinite(post.local.lat)) sub.textContent = "· " + sub.textContent;
  // Local da publicação: tocar mostra o que foi publicado ali.
  // Com local (como no Instagram): o nome em cima e, numa linha só embaixo, "📍 Local · 3 h" (o local encurta com
  // "…" e nunca quebra o nome). Sem local: "@nick · 3 h".
  const temLocal = post.local?.nome && Number.isFinite(post.local.lat);
  if (temLocal) {
    const linhaSub = el("div", "sub-linha");
    const lb = el("button", "local-post"); lb.type = "button"; lb.setAttribute("aria-label", `Publicações em ${post.local.nome}`); lb.title = post.local.nome;
    lb.append(icone("local", "i xs"), el("span", null, post.local.nome));
    lb.addEventListener("click", (e) => { e.stopPropagation(); abrirLocal(post.local); });
    linhaSub.append(lb, sub);
    quem.appendChild(linhaSub);
  } else quem.appendChild(sub);
  const mais = el("button", "icone-btn"); mais.type = "button"; mais.setAttribute("aria-label", "Opções da publicação");
  mais.appendChild(icone("pontos", "i s"));
  mais.addEventListener("click", () => abrirOpcoes("Publicação", [
    { rotulo: "Ver perfil", icone: "olho", fn: () => ganchos.abrirPerfil(post.autorId) },
    estaSalvo(post.id)
      ? { rotulo: "Remover dos salvos", icone: "salvo", fn: () => alternarSalvo(post) }
      : { rotulo: "Salvar publicação", sub: "Para ver depois no seu Perfil → Salvos", icone: "salvo", fn: () => alternarSalvo(post) },
    { rotulo: "Salvar em uma coleção", sub: "Organize seus salvos em pastas", icone: "fotos", fn: () => escolherColecao(post) },
    { rotulo: "Compartilhar perfil", icone: "compartilhar", fn: () => compartilharPerfil(post.autorId, post.nome) },
    post.autorId === eu.uid && { rotulo: "Estatísticas", sub: "Alcance, estrelas, salvos e de onde vieram", icone: "estrela", fn: () => import("./estatisticas-post.js?v=115").then((m) => m.abrirEstatisticas(post)) },
    post.autorId === eu.uid && { rotulo: "Editar publicação", icone: "lapis", fn: () => editarPublicacao(post, () => c.replaceWith(cartaoPost(post))) },
    post.autorId === eu.uid && { rotulo: "Público da publicação", sub: temPublico(post) ? resumoPublico(post.publico) : "Para todos · escolha idade, gênero, lugar e seguidores", icone: "pessoa-mais", fn: () => editarPublicoDoPost(post, () => c.replaceWith(cartaoPost(post))) },
    post.autorId !== eu.uid && { rotulo: silenciado(post.autorId) ? `Mostrar ${nome.textContent} de novo` : `Silenciar ${nome.textContent}`, sub: "Continua seguindo, mas as publicações e flashes somem do seu Diário", icone: "restringir",
      fn: async () => { await alternarSilenciar(post.autorId, nome.textContent); if (silenciado(post.autorId)) { posts = posts.filter((x) => x.autorId !== post.autorId); document.querySelectorAll(".post-card").forEach((x) => { if (x.dataset.autor === post.autorId) x.remove(); }); } } },
    post.autorId !== eu.uid && { rotulo: "Denunciar publicação", sub: "Golpe, ofensa, conteúdo impróprio...", icone: "alerta", perigo: true,
      fn: () => abrirDenuncia({ fb, eu, tipo: "publicacao", alvoId: post.autorId, itemId: post.id, trecho: post.texto || "", nomeAlvo: nome.textContent,
        aoBloquear: async () => { if (await bloquear(post.autorId, nome.textContent)) { posts = posts.filter((x) => x.autorId !== post.autorId); carregarFeed(); } } }) },
    post.autorId === eu.uid && { rotulo: "Apagar publicação", icone: "lixo", perigo: true, fn: async () => {
      if (!await confirmarHF({ titulo: "Apagar esta publicação?", texto: "Ela some do seu perfil e do Diário. Não dá para desfazer.", ok: "Apagar", icone: "lixo" })) return;
      try {
        await fb.deleteDoc(fb.doc(fb.db, "diario", post.id)); c.remove(); posts = posts.filter((x) => x.id !== post.id);
        const n = await apagarFlashesDaPublicacao(post.id);
        toast(n ? `Publicação apagada (e o flash dela também)` : "Publicação apagada");
      }
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
    sub.textContent = (temLocal ? "· " : "") + [temLocal ? "" : p.nickname ? "@" + p.nickname : "", tempoRelativo(paraData(post.criadoEm)), post.editadoEm ? "editada" : ""].filter(Boolean).join(" · ");
  });
  const url = urlSegura(post.mediaUrl);
  // Título em cima (opcional, até 90 letras), logo abaixo de quem publicou.
  if (post.titulo) c.appendChild(el("h3", "post-titulo", post.titulo));
  // Pessoas marcadas: fotinhas empilhadas + "com Ana e mais 2" (vale para todos os tipos de publicação).
  if (Array.isArray(post.marcados) && post.marcados.length) c.appendChild(pessoasEmPilha(post.marcados, { classe: "post-com" }));
  const layout = layoutDe(post);
  // Descrição + #hashtags (sempre no fim, em etiquetas). Publicações antigas com hashtags no meio também ficam assim.
  const { corpo, tags } = partesDoTexto(post.texto);
  const barra = barraInteracao(post);
  // Texto com imagem casada: um cartão só (em cima, ao lado ou com o texto por cima da imagem).
  const casada = post.estilo === "casada" && url && post.mediaTipo !== "video";
  if (casada) { c._casada = blocoCasado(corpo, url, { layout, verMais: true }); c.appendChild(c._casada); }
  const fotos = casada ? [] : fotosDoPost(post);
  if (casada) { /* já desenhado acima */ }
  else if (fotos.length && post.mediaTipo !== "video") {
    // A foto aparece no recorte escolhido ao publicar (4:5, 1:1 ou 16:9), sem cortar de novo. Fotos antigas
    // fora dessas medidas ficam entre 4:5 e 1,91:1. Toque duplo: contagem de estrelas. Modelos: grade, mosaico,
    // baralho, pizza e polaroid (pub-modelos.js); tocar numa foto deles abre em tela cheia.
    const alt = post.titulo || (post.texto ? post.texto.slice(0, 80) : "Publicação");
    const modelo = blocoFotos(fotos, { layout, alt, titulo: post.titulo, aoToqueDuplo: () => toqueDuplo(c._midia, barra), abrirFoto: (i) => abrirVisorFotos(fotos, i, carrosselFotos) });
    const m = el("div", "post-midia-f" + (fotos.length > 1 ? " varias" : "") + (modelo ? " modelo mod-" + layout : ""));
    c._midia = m;
    if (modelo) m.appendChild(modelo);
    else {
      const car = carrosselFotos(fotos, { alt, aoToqueDuplo: () => toqueDuplo(m, barra) });
      const img = car.querySelector("img"); img.loading = "lazy";
      img.addEventListener("load", () => { const p = img.naturalWidth / Math.max(1, img.naturalHeight); m.style.setProperty("--prop", String(Math.min(1.91, Math.max(0.8, p)))); m.classList.toggle("alta", p < 0.8); }, { once: true });
      m.appendChild(car);
    }
    m.title = "Toque duas vezes para dar estrelas";
    c.appendChild(m);
  } else if (url) {
    const m = el("div", "post-midia-f" + (layout && layout !== "normal" ? " vd-" + layout : ""));
    const v = document.createElement("video"); v.src = url; v.muted = true; v.loop = true; v.playsInline = true; v.preload = "metadata";
    const som = el("button", "video-som"); som.type = "button"; som.setAttribute("aria-label", "Ligar o som"); som.appendChild(icone("mudo", "i s"));
    som.addEventListener("click", (e) => { e.stopPropagation(); v.muted = !v.muted; som.replaceChildren(icone(v.muted ? "mudo" : "som", "i s")); som.setAttribute("aria-label", v.muted ? "Ligar o som" : "Desligar o som"); if (v.paused) v.play().catch(() => {}); });
    // Abrir nos Reels (tela cheia), como no Instagram.
    const ir = el("button", "video-reels"); ir.type = "button"; ir.setAttribute("aria-label", "Abrir em Vídeos"); ir.appendChild(icone("reels", "i s"));
    ir.addEventListener("click", (e) => { e.stopPropagation(); v.pause(); verReels(post.id); });
    m.appendChild(ir);
    v.addEventListener("click", () => (v.paused ? v.play() : v.pause()));
    m.classList.add("video"); m.append(v, som); vigiaVideo?.observe(v);
    c.appendChild(m);
  }
  const enq = blocoEnquete(post);
  if (enq) { if (layout === "cartoes" || layout === "duelo") enq.classList.add("enq-" + layout); c.appendChild(enq); }
  const cx = blocoCaixa(post);
  if (cx) c.appendChild(cx);
  if (corpo && !casada) {
    // Só texto (sem foto, enquete ou caixa de perguntas): citação, simples ou destaque (cartão colorido).
    const soTexto = !url && !post.enquete?.pergunta && !post.caixa?.pergunta;
    let estilo = soTexto ? (post.layout ? layout : (corpo.length <= 500 ? "citacao" : "simples")) : "";
    if (estilo === "destaque" && corpo.length > 320) estilo = "citacao";
    const t = descricaoPost(corpo, "post-texto" + (soTexto ? " so-texto" : "") + (estilo && estilo !== "simples" ? " " + estilo : "") + (estilo === "simples" ? " simples" : ""), estilo === "citacao" ? 7 : estilo === "destaque" ? 8 : 4);
    if (estilo === "destaque") { const [a, b] = tomDestaque(post.id); t.style.setProperty("--d1", a); t.style.setProperty("--d2", b); t.classList.toggle("menor", corpo.length > 140); }
    c.appendChild(t);
    if (soTexto) c._texto = t;
  }
  if (tags.length) c.appendChild(etiquetasTags(tags));
  // Publicação só de texto: toque duplo no texto dá as 5 estrelas (como na foto).
  if (c._texto) toqueDuploEm(c._texto, () => toqueDuplo(c._texto, barra, true));
  if (c._casada) toqueDuploEm(c._casada, () => toqueDuplo(c._casada, barra));
  c.appendChild(barra);
  return c;
}
// Descrição com "ver mais / ver menos": só aparece se o texto passar das linhas (medido depois de desenhar).
function descricaoPost(texto, classe, linhas = 4) {
  const p = el("div", classe);
  const sp = comMencoes(el("span", "pt-c"), texto);
  p.style.setProperty("--linhas", linhas);
  p.appendChild(sp);
  const longo = texto.length > 180 || texto.split("\n").length > linhas;
  if (!longo) return p;
  p.classList.add("curto");
  const vm = el("button", "ver-mais", "ver mais"); vm.type = "button"; vm.setAttribute("aria-expanded", "false");
  vm.addEventListener("click", (e) => {
    e.stopPropagation();
    const abrir = p.classList.contains("curto");
    p.classList.toggle("curto", !abrir); vm.textContent = abrir ? "ver menos" : "ver mais"; vm.setAttribute("aria-expanded", String(abrir));
    if (!abrir) p.closest(".post-card")?.scrollIntoView?.({ block: "nearest" });
  });
  p.appendChild(vm);
  // Cabe inteiro? Some o botão. Só mede com a publicação À VISTA: escondida (aba da rede escondida, lista montada antes de
  // aparecer) a altura é 0, tudo parecia caber e o "ver mais" sumia de textos longos (10/11/2026).
  const conferir = () => {
    if (!p.isConnected || !sp.clientHeight) return false;
    if (p.classList.contains("curto") && sp.scrollHeight <= sp.clientHeight + 2) { p.classList.remove("curto"); vm.remove(); }
    return true;
  };
  if (typeof ResizeObserver === "function") { const ro = new ResizeObserver(() => { if (conferir()) ro.disconnect(); }); ro.observe(sp); }
  else requestAnimationFrame(() => { if (!conferir()) setTimeout(conferir, 400); });
  return p;
}
function etiquetasTags(tags) {
  const w = el("div", "post-tags");
  tags.forEach((t) => {
    const a = document.createElement("a"); a.className = "tag-chip"; a.href = `feed.html?tag=${encodeURIComponent(t.toLowerCase())}`;
    a.append(el("b", null, "#"), document.createTextNode(t));
    a.addEventListener("click", (e) => e.stopPropagation());
    w.appendChild(a);
  });
  return w;
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
  // Prévia no formulário de publicar ("Ver como vai ficar"): o mesmo cartão do Diário.
  ganchos.cartaoPrevia = (post) => cartaoPost(post);
  // "Ver publicação" (Flash) e links feed.html?post=ID abrem a própria publicação aqui.
  ganchos.abrirPublicacao = (id, opc) => abrirPublicacao(id, opc);
  // Voltou de um link aberto de dentro de um flash: reabre o flash JÁ (antes esperava o Diário inteiro carregar).
  const voltouAoFlash = voltarAoFlash();
  // Links do Flash (Mensagens, vitrines, deslizar): abrem JÁ, sem esperar o Diário carregar (antes aparecia a tela do
  // Diário carregando antes do criador/visor). O feed.html cobre a tela de preto até abrir (script no <head>).
  {
    const p = new URLSearchParams(location.search);
    // Links das mensagens do Flash: feed.html?flash=ID abre o flash; ?repostar=ID abre o criador para repostar.
    // Voltou de um link aberto de dentro de um flash: o mesmo flash abre de novo.
    // Flash de um perfil de negócio (vindo da vitrine: feed.html?flash=ID&negocio=UID_tipo): abre a sequência do negócio no
    // visor completo, com o negócio no topo; fechar volta para a vitrine.
    const negFlash = p.get("negocio") || "";
    if (!voltouAoFlash && /^[A-Za-z0-9]{1,64}$/.test(p.get("flash") || "") && /^[A-Za-z0-9]{10,40}_(servicos|delivery|lojinha|imoveis|saude|automotivo)$/.test(negFlash)) {
      const daVitrine = (() => { try { return !!document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1; } catch { return false; } })();
      fb.getDoc(fb.doc(fb.db, "negocios", negFlash)).then((d) => {
        const n = d.exists() ? d.data() : {};
        abrirFlashesDoNegocio({ id: negFlash, nome: n.nome || "", foto: n.foto || "", tipo: n.tipo || negFlash.split("_")[1] }, { comecarEm: p.get("flash"), aoFechar: () => { if (daVitrine) setTimeout(() => history.back(), 60); }, aoVitrine: daVitrine ? () => {} : null });
      }).catch(() => abrirFlashPorId(p.get("flash")));
    } else if (!voltouAoFlash && /^[A-Za-z0-9]{1,64}$/.test(p.get("flash") || "")) {
      // Veio de outra página do site (o chat, fora da rede): fechar o flash volta para ela, como no Instagram
      // (antes ficava no Diário e era preciso voltar de novo).
      const doSite = (() => { try { return !!document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1 && !p.get("negocio"); } catch { return false; } })();
      abrirFlashPorId(p.get("flash"), { aoFechar: doSite ? () => setTimeout(() => history.back(), 60) : null });
    }
    if (/^[A-Za-z0-9]{1,64}$/.test(p.get("repostar") || "")) repostarFlash(p.get("repostar"));
    // Entrada direta para a casca da rede (rede-app.js abrirFlash): o Mensagens abre o flash AQUI, com este quadro por
    // cima da aba do chat, sem trocar de página.
    window.__hfAbrirFlashId = (id, opc = {}) => abrirFlashPorId(id, opc);
    window.__hfRepostarFlash = async (id, { aoAbrir, aoFechar, aviso } = {}) => {
      await repostarFlash(id, { aviso });
      const criador = document.querySelector(".flash-criar");
      if (!criador) return false;
      aoAbrir?.();
      const obs = new MutationObserver(() => { if (!criador.isConnected) { obs.disconnect(); aoFechar?.(); } });
      obs.observe(document.body, { childList: true });
      return true;
    };
    // Deslizar o dedo para a direita no Diário (deslizar-flash.js) abre o criador do Flash; ?novoFlash=1 também abre.
    window.__hfAbrirFlash = () => novoFlash();
    if (p.get("novoFlash") === "1") {
      p.delete("novoFlash");
      history.replaceState(history.state, "", location.pathname + (p.toString() ? "?" + p : "") + location.hash);
      novoFlash();
    }
  }
  // Depois de publicar: vai para a aba onde a publicação aparece (com foto = Diário; texto/enquete/pergunta = Registros).
  // Depois de publicar: volta para o Diário (no filtro em que a publicação aparece).
  ganchos.aoPublicar = (post) => { feedCarregado = null; if (post && !doTipo(post)) { tipoFeed = "tudo"; pintarTipos(); } if (aba !== "diario") trocarAba("diario"); else carregarFeed(); };
  montarBarraRede(abaDaUrl() === "explorar" ? "explorar" : "diario");
  pintarBarraRede();
  // O sino (e as marcações em publicações com foto) espera as primeiras publicações aparecerem.
  primeirasPublicacoes.then(() => ouvirAvisos());
  $("btnComporFeed").addEventListener("click", () => compor());
  // Saiu do app no meio de uma publicação: o Diário avisa e "Continuar" abre o formulário com ela.
  primeirasPublicacoes.then(() => setTimeout(() => avisarPublicacaoGuardada(() => compor()), 600));
  // O Flash começa junto (ele mesmo espera a lista de quem você segue) e o Diário não espera a posição.
  const seguindo = carregarMeusSeguindo();
  montarStories($("storiesFeed"), { esperar: primeirasPublicacoes }).catch((e) => console.warn("Flash:", e));
  // Puxar para atualizar (como no Instagram): no Diário lê de novo as publicações e a fileira do Flash; no Explorar, tudo.
  ligarPuxar({ aoAtualizar: () => (aba === "explorar" ? recarregarExplorar() : Promise.all([atualizarDiario(), atualizarBarraFlash()])) });
  conferirDeTempos(conferirNovasPublicacoes, 120000);
  await seguindo;
  prepararLeitor();
  pintarFiltro();
  pintarLateral();
  const p = new URLSearchParams(location.search);
  trocarAba(topicoDaUrl ? "explorar" : (abaPedida || abaDaUrl()));
  abaPedida = null;
  if (topicoDaUrl) abrirTopico(topicoDaUrl, { daUrl: true });
  if (p.get("publicar")) compor();
  if (p.get("reels")) verReels(/^[A-Za-z0-9_-]{1,64}$/.test(p.get("reels")) ? p.get("reels") : null);
  if (/^[A-Za-z0-9_-]{1,64}$/.test(p.get("post") || "")) {
    const id = p.get("post");
    history.replaceState(history.state, "", urlAba(aba));
    // Veio de outra página do site: o "voltar" da publicação volta para lá.
    let daOrigem = false;
    try { daOrigem = !!document.referrer && new URL(document.referrer).origin === location.origin && !/\/feed\.html/.test(new URL(document.referrer).pathname) && history.length > 1; } catch {}
    abrirPublicacao(id, { daOrigem });
  }
})();
