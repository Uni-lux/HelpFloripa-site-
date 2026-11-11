// =====================================================
// Explorar (aba do feed.html)
// - Busca completa: Tudo | Pessoas | Negócios | Hashtags | Publicações,
//   com as buscas recentes guardadas no aparelho (hf-buscas).
// - O que está acontecendo: hashtags em alta (e as que estão subindo),
//   enquetes abertas para votar e negócios da sua cidade.
// - Sugestões com o motivo (Seguido por, Segue você, mesma cidade), que dá para dispensar.
// - Destaques em mosaico com filtros (Tudo, Fotos, Vídeos, Textos) e "Ver mais".
// Sem campo nem regra nova: lê o que o Diário e as vitrines já leem.
// =====================================================
import {
  $, el, icone, ms, toast, pintarAvatar, urlSegura, nomeCidade, fb, eu, dados, meusSeguindo, escondido, silenciado, ganchos,
  obterPerfil, linhaPessoa, botaoSeguir, fotosDoPost, lerResumosEstrelas, minhaRede, jaVisto, definirOrigem, origemAtual, pilha,
  abrirCompositor
} from "./rede.js?v=141";
import { flashesCarregados, mapaDoLugar, abrirFlashPorId } from "./stories.js?v=113";
import { afinidade } from "./gosto.js?v=2";
import { buscarNoServidor } from "./busca.js?v=1";
import { postsDoEstado, pesoRegiao, RECENTES_PAIS } from "./regiao.js?v=5";
import { buscarPessoas, pessoasRecentes, semAcento } from "./pessoas.js?v=6";
import { docsComValidade, docsPorIds } from "./leituras.js?v=4";
import { ordenarJusto, dadosNegocio } from "./relevancia.js?v=4";
import { lerResumos, media } from "./avaliacoes.js?v=19";
import { CATEGORIAS, CORES_TIPO, NOMES_TIPO, PAGINA_TIPO, nomeCategoria, nomeCat, categoriasDe } from "./vitrine.js?v=95";
import { fimDaEnquete, faltaTexto } from "./enquetes.js?v=7";
import { minhaPosicao, comDistancia, textoDistancia, pedirLocalizacao, rotuloPosicao, distanciaKm } from "./perto.js?v=3";
import { semPausados, corDoPlano, lerPlano, classePlano, planosDosDonos, nivelPlano } from "./planos-base.js?v=16";
import { lerComunidade, cartaoComunidade, filtrosComunidade, comunidadeNoAr } from "./comunidade-cartao.js?v=3";
import { combinaPublico, leitorDe } from "./publico-alvo.js?v=1";
import { lerLocal as lugarEscolhido } from "./local-escolhido.js?v=3";
import { maisNovo, haNovidade } from "./novidades.js?v=1";

const DIARIO_VALIDADE = 3 * 60000, DIA = 864e5, HORA = 3600e3;
// Público da publicação: quem não está no público não vê no Explorar (publico-alvo.js). A posição entra quando chega.
let leitorExp = null;
const leitor = () => (leitorExp ||= leitorDe({ uid: eu.uid, dados, local: lugarEscolhido(), pos: posEu, segue: (u) => meusSeguindo.has(u) }));
// Região de quem lê: o lugar escolhido ("Você está em", o mesmo do Diário, do Início e das vitrines) ou a cidade do perfil.
const regiaoEu = () => { const l = lugarEscolhido(); return l.uf ? { uf: l.uf, cidadeIbge: Number(l.cidadeIbge) || 0 } : { uf: dados.uf || "", cidadeIbge: Number(dados.cidadeIbge) || 0 }; };
const postOculto = (p) => (p?.ocultoAte?.toMillis?.() ?? 0) > Date.now() || (p?.agendadoPara?.toMillis?.() ?? 0) > Date.now() || silenciado(p?.autorId) || !combinaPublico(p, leitor());
const lerLocal = (k, padrao) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v ?? padrao; } catch { return padrao; } };
const gravarLocal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const NOME_TIPO = (t) => (t === "lojinha" ? "Shopping" : NOMES_TIPO[t] || "Negócio");
const IMG_TIPO = { servicos: "servicos-480.webp", delivery: "lanchonetes-480.webp", lojinha: "shopping-480.webp", imoveis: "imoveis-480.webp", saude: "saude.svg", automotivo: "automotivo.svg" };
const linkNegocio = (n) => `${PAGINA_TIPO[n.tipo]}?negocio=${encodeURIComponent(n.id)}&de=explorar`;
// Link de uma publicação: abre a própria publicação (tela cheia, com as parecidas embaixo), como no Instagram.
const linkPost = (p) => `feed.html?post=${encodeURIComponent(p.id)}`;

// ---------- dados (lidos uma vez e guardados) ----------
// As mesmas publicações recentes dos Principais (mesma consulta e mesma chave no aparelho).
let postsP = null, postsEm = 0, ultimoDoc = null, acabouAntigas = false;
function postsRecentes() {
  if (postsP && Date.now() - postsEm < DIARIO_VALIDADE) return postsP;
  postsEm = Date.now();
  const q = fb.query(fb.collection(fb.db, "diario"), fb.orderBy("criadoEm", "desc"), fb.limit(RECENTES_PAIS));
  // Junto com as recentes do país, as recentes do seu estado (regiao.js), sem repetir.
  return (postsP = Promise.all([docsComValidade(fb, "diario-principais", q, DIARIO_VALIDADE), postsDoEstado(fb, regiaoEu().uf)])
    .then(([s, doEstado]) => { const ja = new Set(s.docs.map((d) => d.id)); return { docs: s.docs, mais: doEstado.filter((p) => !ja.has(p.id)), size: s.size }; })
    .then((s) => (ultimoDoc = s.docs.at(-1) || null, s.size < RECENTES_PAIS && (acabouAntigas = true), [...s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })), ...s.mais]).filter((p) => !escondido(p.autorId) && !postOculto(p)))
    .catch((e) => { postsP = null; console.warn("Explorar:", e); return []; }));
}
// Negócios atualizados por último: a MESMA consulta e a mesma chave da página inicial (inicio.js), guardada
// por 10 min — quem vem do início não lê de novo. Eram 200 só aqui; a busca vai ao servidor (busca.js).
let negociosP = null;
function negociosRecentes() {
  return (negociosP ||= (async () => {
    const col = fb.collection(fb.db, "negocios");
    const s = await docsComValidade(fb, "inicio-negocios", fb.query(col, fb.orderBy("atualizadoEm", "desc"), fb.limit(60)), 10 * 60000)
      .catch(() => fb.getDocs(fb.query(col, fb.limit(60))));
    return semPausados(fb, prepararNegocios(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
  })().catch((e) => { negociosP = null; console.warn("Explorar (negócios):", e); return []; }));
}
const prepararNegocios = (lista) => lista
  .filter((n) => n.nome && NOMES_TIPO[n.tipo] && (n.ocultoAte?.toMillis?.() ?? 0) <= Date.now() && !escondido(n.donoId))
  .map((n) => ({ ...n, _txt: semAcento([n.nome, nomeCategoria(n), ...categoriasDe(n).map((c) => nomeCat(n, c)), n.bairro, nomeCidade(n.cidade), n.descricao].filter(Boolean).join(" ")) }));
// Busca nacional (busca.js): negócios do Brasil inteiro com a palavra digitada + publicações com a #palavra.
async function negociosDoServidor(termo) { return semPausados(fb, prepararNegocios(await buscarNoServidor(fb, "negocios", termo))); }
async function postsComTag(palavra) {
  if (!/^[\p{L}\p{N}_]{2,30}$/u.test(palavra)) return [];
  const s = await fb.getDocs(fb.query(fb.collection(fb.db, "diario"), fb.where("tags", "array-contains", palavra.toLowerCase()), fb.limit(40))).catch(() => null);
  return s ? s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })).filter((p) => !escondido(p.autorId) && !postOculto(p)) : [];
}
const juntar = (...listas) => { const m = new Map(); listas.flat().forEach((x) => { if (!m.has(x.id)) m.set(x.id, x); }); return [...m.values()]; };
const notasNegocios = new Map();
async function notasDe(lista) {
  const falta = lista.filter((n) => !notasNegocios.has(n.id));
  if (falta.length) {
    const r = await lerResumos(fb, falta.map((n) => "neg_" + n.id)).catch(() => ({}));
    falta.forEach((n) => notasNegocios.set(n.id, r["neg_" + n.id] || null));
  }
  return (n) => notasNegocios.get(n.id);
}
// Quem segue você (mesma leitura guardada da "Sua rede").
let seguidoresP = null;
const meusSeguidores = () => (seguidoresP ||= docsComValidade(fb, "seguidores-" + eu.uid, fb.query(fb.collection(fb.db, "relacoes"), fb.where("tipo", "==", "seguir"), fb.where("alvoId", "==", eu.uid), fb.limit(500)), 15 * 60000)
  .then((s) => new Set(s.docs.map((d) => d.data().seguidorId))).catch(() => new Set()));
// "Florianópolis/SC", "florianopolis" e "Florianópolis" são a mesma cidade.
const nomeCid = (v) => String(nomeCidade(v) || "").split(/\s*[\/,]\s*|\s+-\s+/)[0].trim();
const chaveCidade = (v) => semAcento(nomeCid(v));
const minhaCidade = () => chaveCidade(dados.cidade || dados.cidadeNome);

// ---------- buscas recentes ----------
const CHAVE_BUSCAS = "hf-buscas";
const buscasRecentes = () => lerLocal(CHAVE_BUSCAS, []).filter((x) => typeof x === "string").slice(0, 10);
function guardarBusca(t) {
  t = String(t || "").trim().slice(0, 40);
  if (t.length < 2) return;
  gravarLocal(CHAVE_BUSCAS, [t, ...buscasRecentes().filter((x) => semAcento(x) !== semAcento(t))].slice(0, 10));
}
function pintarRecentes() {
  const box = $("buscaRecentes");
  const lista = buscasRecentes();
  const mostrar = document.activeElement === $("buscaPessoas") && !$("buscaPessoas").value.trim() && lista.length;
  box.hidden = !mostrar;
  if (!mostrar) { box.replaceChildren(); return; }
  const cab = el("div", "br-cab");
  const limpar = el("button", "br-limpar", "Limpar tudo"); limpar.type = "button";
  limpar.addEventListener("pointerdown", (e) => e.preventDefault());
  limpar.addEventListener("click", () => { gravarLocal(CHAVE_BUSCAS, []); pintarRecentes(); });
  cab.append(el("strong", null, "Buscas recentes"), limpar);
  box.replaceChildren(cab, ...lista.map((t) => {
    const l = el("div", "br-item");
    const b = el("button", "br-usar"); b.type = "button";
    const ic = el("span", "br-ic"); ic.appendChild(t.startsWith("#") ? document.createTextNode("#") : icone("relogio", "i xs"));
    b.append(ic, el("span", null, t));
    b.addEventListener("pointerdown", (e) => e.preventDefault());
    b.addEventListener("click", () => { $("buscaPessoas").value = t; guardarBusca(t); box.hidden = true; buscar(); });
    const x = el("button", "br-tirar"); x.type = "button"; x.setAttribute("aria-label", `Tirar "${t}" das buscas recentes`); x.appendChild(icone("fechar", "i xs"));
    x.addEventListener("pointerdown", (e) => e.preventDefault());
    x.addEventListener("click", () => { gravarLocal(CHAVE_BUSCAS, buscasRecentes().filter((y) => y !== t)); pintarRecentes(); });
    l.append(b, x);
    return l;
  }));
}

// ---------- busca ----------
const ABAS_BUSCA = [["tudo", "Tudo"], ["pessoas", "Pessoas"], ["negocios", "Negócios"], ["comunidade", "Comunidade"], ["tags", "Hashtags"], ["lugares", "Lugares"], ["posts", "Publicações"]];
let abaBusca = "tudo", tempoBusca = null, ultimoTermo = "";
let achados = { pessoas: [], negocios: [], comunidade: [], tags: [], lugares: [], posts: [] };

async function buscar() {
  const termo = $("buscaPessoas").value.trim();
  pintarRecentes();
  $("exploraConteudo").hidden = !!termo;
  $("abasBusca").hidden = !termo;
  $("titPessoas").hidden = $("listaPessoas").hidden = !termo; // sem busca: só o conteúdo do Explorar ("Ativos recentemente" saiu)
  if (!termo) { ultimoTermo = ""; return; }
  $("titPessoas").textContent = "Resultados";
  if (termo !== ultimoTermo) abaBusca = termo.startsWith("#") ? "tags" : "tudo";
  ultimoTermo = termo;
  const corpo = $("listaPessoas");
  if (!corpo.querySelector(".res-sec, .linha")) corpo.replaceChildren(el("div", "lista-vazia", "Buscando..."));
  const limpo = termo.replace(/^[#@]/, "");
  const t = semAcento(limpo);
  const semNeg = termo.startsWith("#") || termo.startsWith("@");
  const [pessoas, negRecentes, negServidor, recentes, comTag, comRecentes, comServidor] = await Promise.all([
    termo.startsWith("#") ? [] : buscarPessoas(fb, termo, { limite: 30 }),
    semNeg ? [] : negociosRecentes(),
    semNeg || t.length < 3 ? [] : negociosDoServidor(limpo),
    postsRecentes(),
    termo.startsWith("@") || /\s/.test(limpo) ? [] : postsComTag(limpo),
    semNeg ? [] : comunidadeRecentes(),
    semNeg || t.length < 3 ? [] : comunidadeDoServidor(limpo)
  ]);
  const negocios = juntar(negRecentes, negServidor), posts = juntar(recentes, comTag);
  if ($("buscaPessoas").value.trim() !== termo) return;
  // Hashtags: as das publicações recentes que começam com o que foi digitado (e a exata, contada no servidor).
  const tags = new Map();
  if (!termo.startsWith("@")) posts.forEach((p) => (p.tags || []).forEach((tg) => { if (semAcento(tg).startsWith(t)) tags.set(tg, (tags.get(tg) || 0) + 1); }));
  const exata = /^[\p{L}\p{N}_]{1,30}$/u.test(limpo) && !termo.startsWith("@") ? limpo.toLowerCase() : "";
  if (exata && !tags.has(exata) && termo.startsWith("#")) tags.set(exata, 0);
  // Negócios achados: a mesma ordem justa das vitrines (1 espaço pago a cada 5), com o quanto o nome bate com o que
  // foi digitado pesando junto (nome que começa com a palavra vem antes).
  const negAchados = t.length < 2 ? [] : negocios.filter((n) => t.split(/\s+/).every((x) => n._txt.includes(x)));
  const planosAch = await planosDosDonos(fb, negAchados.map((n) => n.donoId), docsPorIds);
  if ($("buscaPessoas").value.trim() !== termo) return;
  achados = {
    pessoas: pessoas.filter((p) => p.uid !== eu.uid && !escondido(p.uid)),
    negocios: ordenarJusto(negAchados, (n) => dadosNegocio(n, { nivel: nivelPlano(planosAch.get(n.donoId)), fator: 0.6 + 0.2 * peso(n) }), { dono: (n) => n.donoId, semente: eu.uid }).slice(0, 40),
    comunidade: t.length < 2 ? [] : juntar(comRecentes, comServidor).filter((a) => { const x = semAcento(`${a.titulo || ""} ${a.descricao || ""} ${a.bairro || ""} ${a.cidade || ""}`); return t.split(/\s+/).every((p) => x.includes(p)); }).slice(0, 40),
    tags: [...tags].map(([tag, n]) => ({ tag, n })).sort((a, b) => b.n - a.n || (b.tag === exata) - (a.tag === exata)).slice(0, 20),
    // Lugares marcados nas publicações e nos flashes (os do Em alta) com o nome que foi digitado.
    lugares: t.length < 2 || termo.startsWith("@") || termo.startsWith("#") ? [] : (assuntos.length ? assuntos : contarAssuntos(posts)).filter((x) => x.tipo === "lugar" && semAcento(x.nome).includes(t)).slice(0, 20),
    posts: t.length < 2 || termo.startsWith("@") ? [] : posts.filter((p) => semAcento(`${p.texto || ""} ${(p.tags || []).join(" ")} ${p.enquete?.pergunta || ""}`).includes(t)).slice(0, 30)
  };
  function peso(n) { const nm = semAcento(n.nome); return (nm.startsWith(t) ? 3 : nm.includes(t) ? 2 : 0) + (minhaCidade() && chaveCidade(n.cidade) === minhaCidade() ? 1 : 0); }
  pintarAbasBusca();
  pintarResultados();
  // A contagem exata da hashtag vem do servidor (todas as publicações, não só as recentes).
  if (exata && achados.tags.some((x) => x.tag === exata)) {
    const n = await fb.getCountFromServer(fb.query(fb.collection(fb.db, "diario"), fb.where("tags", "array-contains", exata))).then((x) => x.data().count).catch(() => null);
    const item = achados.tags.find((x) => x.tag === exata);
    if (n == null || !item || $("buscaPessoas").value.trim() !== termo) return;
    // Hashtag que ninguém usou: sai da lista. Usada: mostra o total e sobe para o topo.
    if (!n) achados.tags = achados.tags.filter((x) => x !== item);
    else { item.n = Math.max(item.n, n); item.contada = true; achados.tags = [item, ...achados.tags.filter((x) => x !== item)]; }
    pintarAbasBusca(); pintarResultados();
  }
}
function pintarAbasBusca() {
  $("abasBusca").replaceChildren(...ABAS_BUSCA.map(([id, nome]) => {
    const b = el("button"); b.type = "button"; b.setAttribute("role", "tab"); b.dataset.aba = id;
    b.setAttribute("aria-selected", String(abaBusca === id));
    b.append(document.createTextNode(nome));
    if (id !== "tudo") b.appendChild(el("b", null, String(achados[id].length)));
    b.addEventListener("click", () => { abaBusca = id; pintarAbasBusca(); pintarResultados(); });
    return b;
  }));
}
function pintarResultados() {
  const corpo = $("listaPessoas");
  const total = achados.pessoas.length + achados.negocios.length + achados.comunidade.length + achados.tags.length + achados.lugares.length + achados.posts.length;
  if (!total) { corpo.replaceChildren(el("div", "lista-vazia", "Nada encontrado. Tente o @usuário, uma #hashtag ou outra palavra.")); return; }
  const secoes = [];
  const tudo = abaBusca === "tudo";
  const secao = (id, titulo, itens, limite) => {
    if (!itens.length || (!tudo && abaBusca !== id)) return;
    const s = el("div", "res-sec");
    const cab = el("div", "grupo-titulo", titulo);
    if (tudo && itens.length > limite) {
      const ver = el("button", "res-ver", "Ver tudo"); ver.type = "button";
      ver.addEventListener("click", () => { abaBusca = id; pintarAbasBusca(); pintarResultados(); });
      cab.appendChild(ver);
    }
    s.appendChild(cab);
    s.append(...desenhar(id, itens.slice(0, tudo ? limite : 60)));
    secoes.push(s);
  };
  secao("pessoas", plural(achados.pessoas.length, "pessoa", "pessoas"), achados.pessoas, 4);
  secao("negocios", plural(achados.negocios.length, "negócio", "negócios"), achados.negocios, 3);
  secao("comunidade", achados.comunidade.length === 1 ? "1 anúncio na Comunidade" : `${achados.comunidade.length} anúncios na Comunidade`, achados.comunidade, 4);
  secao("tags", "Hashtags", achados.tags, 3);
  secao("lugares", "Lugares", achados.lugares, 3);
  secao("posts", plural(achados.posts.length, "publicação", "publicações"), achados.posts, 6);
  corpo.replaceChildren(...(secoes.length ? secoes : [el("div", "lista-vazia", "Nada nesta aba. Veja em Tudo.")]));
  if (achados.negocios.length && (tudo || abaBusca === "negocios")) notasDe(achados.negocios.slice(0, 60)).then((nota) => corpo.querySelectorAll("[data-neg]").forEach((x) => pintarNota(x, nota({ id: x.dataset.neg })))).catch(() => {});
}
function desenhar(id, itens) {
  if (id === "pessoas") return itens.map((p) => linhaPessoa({
    uid: p.uid, nome: p.nome, foto: p.fotoPerfil,
    sub: [p.nickname ? "@" + p.nickname : "", nomeCidade(p.cidade || p.cidadeNome)].filter(Boolean).join(" · ")
  }));
  if (id === "negocios") return itens.map(linhaNegocio);
  if (id === "comunidade") { const g = el("div", "exp-trilho res-com"); g.append(...itens.map((a) => cartaoComunidade(a, "explorar"))); return [g]; }
  if (id === "tags") return itens.map((x) => {
    const b = el("a", "linha-tag"); b.href = `feed.html?tag=${encodeURIComponent(x.tag)}`;
    b.append(el("span", "ic-tag", "#"), el("strong", null, "#" + x.tag), el("small", null, x.n ? `${plural(x.n, "publicação", "publicações")}${x.contada ? "" : " recentes"}` : "Ver publicações"));
    return b;
  });
  if (id === "lugares") return itens.map((x) => {
    const b = el("a", "linha-tag lugar"); b.href = linkTopico({ local: x });
    const ic = el("span", "ic-tag"); ic.appendChild(icone("local", "i xs"));
    b.append(ic, el("strong", null, String(x.nome).split(",")[0]), el("small", null, metaAssunto(x)));
    return b;
  });
  const g = el("div", "exp-grade res-grade");
  g.append(...itens.map((p) => tilePost(p, null, false)));
  return [g];
}
function linhaNegocio(n) {
  const a = el("a", "linha linha-neg"); a.href = linkNegocio(n); a.dataset.neg = n.id;
  a.style.setProperty("--c", CORES_TIPO[n.tipo] || "var(--accent)");
  const av = el("div", "avatar neg");
  const f = urlSegura(n.foto) || urlSegura((n.fotos || [])[0]);
  pintarAvatar(av, f, n.nome);
  // Anel da foto pela cor do plano de quem anuncia (como nas vitrines).
  if (n.donoId) lerPlano(fb, n.donoId).then((pl) => { av.dataset.plano = classePlano(pl).slice(6); });
  const t = el("div", "txt");
  t.append(el("strong", null, n.nome), el("small", null, [NOME_TIPO(n.tipo), nomeCategoria(n) !== NOMES_TIPO[n.tipo] ? nomeCategoria(n) : "", [n.bairro, nomeCid(n.cidade)].filter(Boolean).join(", ")].filter(Boolean).join(" · ")));
  a.append(av, t, el("span", "neg-nota"));
  return a;
}
function pintarNota(alvo, r) {
  const box = alvo.querySelector(".neg-nota");
  if (!box) return;
  box.replaceChildren();
  if (r?.total) box.append(icone("estrela", "i xs"), document.createTextNode(media(r).toFixed(1).replace(".", ",")));
}

// ---------- início do Explorar ----------
let feitoEm = 0;
// Puxar para atualizar no Explorar: monta tudo de novo com o que há de novo no servidor.
// Puxar para atualizar esperto: pergunta se saiu publicação ou negócio depois do mais novo que está na tela (2 leituras);
// sem novidade e com menos de 10 min, nada é relido. Com novidade, lê de novo (os recentes e os negócios).
export async function recarregarExplorar() {
  const [posts, negs] = await Promise.all([postsP || [], negociosP || []]);
  const velho = !feitoEm || Date.now() - feitoEm > 10 * 60000 || !posts.length;
  if (!velho) {
    const [a, b] = await Promise.all([
      haNovidade(fb, fb.db, "diario", [], "criadoEm", maisNovo(posts)),
      haNovidade(fb, fb.db, "negocios", [], "atualizadoEm", maisNovo(negs, "atualizadoEm")),
    ]);
    if (!a && !b) return;
    if (b) negociosP = null;
    if (!a) { feitoEm = 0; postsEm = Date.now(); await abrirExplorar(); return; }
  }
  postsP = null; negociosP = null; feitoEm = 0;
  await abrirExplorar();
}
export async function abrirExplorar() {
  buscar();
  if (Date.now() - feitoEm < 3 * 60000) return;
  feitoEm = Date.now();
  const lista = await postsRecentes();
  pintarAlta(lista);
  pintarEnquetes(lista);
  // Com as estrelas lidas, o Em alta conta também o engajamento de cada publicação.
  lerResumosEstrelas(lista.map((p) => p.id)).then((r) => { resumosPosts = r; postsDestaque = lista; pintarAlta(lista); pintarDestaques(); pintarHall(lista); }).catch(() => {});
  pintarNegocios().catch((e) => console.warn("Explorar (negócios):", e));
  pintarComunidade().catch((e) => console.warn("Explorar (comunidade):", e));
  pintarPostsPerto(lista).catch((e) => console.warn("Explorar (perto):", e));
  pintarSugestoes().catch((e) => console.warn("Explorar (sugestões):", e));
}

// ---------- Em alta: Top 20 de assuntos do Help Floripa (10/11/2026, revisto no mesmo dia) ----------
// Só as hashtags e os lugares das PUBLICAÇÕES (as mesmas que o Explorar já leu). As # e os lugares dos flashes aparecem no
// Flash e na página do assunto ("Nos flashes agora"), mas não entram na contagem.
// Nota de cada assunto: cada publicação vale pela recência (meia-vida ~2 dias), pela sua região e pelas estrelas que recebeu;
// de cada pessoa só as 2 melhores publicações contam cheio (as outras ¼: repetir a mesma # não põe ninguém no topo);
// mais pessoas usando = nota maior, assunto de uma pessoa só vale menos. "Subindo" = mais uso nas últimas 24 h do que no dia
// anterior; "Novo" = apareceu nas últimas 24 h e já tem 2 pessoas. Hashtags iguais sem acento e lugares a menos de 800 m
// viram um assunto só. Nada inventado: só dados do próprio site.
const ALTA_MAX = 100;
let assuntos = [], filtroAlta = "tudo", altaVer = 5;
// Onde contar (Em alta e Hall da fama): Brasil, o estado ou a cidade (lugar escolhido ou a cidade do perfil), pela região
// gravada na publicação (diario.autorUf / autorIbge). Guardado no aparelho.
let escopoAlta = (() => { try { return localStorage.getItem("hf-alta-escopo") || "brasil"; } catch { return "brasil"; } })();
const regiaoNome = () => {
  const l = lugarEscolhido(), r = regiaoEu();
  const cid = String((l.uf ? l.cidade : dados.cidade) || "").split("/")[0].trim();
  return { uf: r.uf, ibge: r.cidadeIbge, cidade: cid };
};
const doEscopo = (p, esc, r) => (esc === "estado" ? !!r.uf && p.autorUf === r.uf : esc === "cidade" ? !!r.ibge && Number(p.autorIbge) === r.ibge : true);
function seletorEscopo() {
  const r = regiaoNome();
  const ops = [["brasil", "Brasil"], ...(r.uf ? [["estado", r.uf]] : []), ...(r.ibge ? [["cidade", r.cidade || "Cidade"]] : [])];
  if (!ops.some(([k]) => k === escopoAlta)) escopoAlta = "brasil";
  const w = el("div", "esc-seg"); w.setAttribute("role", "tablist"); w.setAttribute("aria-label", "Onde contar");
  ops.forEach(([k, nome]) => {
    const b = el("button", null, nome); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(escopoAlta === k));
    b.title = k === "brasil" ? "Nacional" : k === "estado" ? "Estadual" : "Municipal";
    b.addEventListener("click", () => {
      if (escopoAlta === k) return;
      escopoAlta = k; try { localStorage.setItem("hf-alta-escopo", k); } catch {}
      altaVer = 5; pintarAlta(listaAlta); pintarHall();
    });
    w.appendChild(b);
  });
  return w;
}
const chaveLugar = (nome) => semAcento(String(nome || "").split(",")[0]).trim();
// Figurinhas tocáveis do flash: "h|tag|x|y|w|h" e "l|nome|lat|lng|x|y|w|h" (só para "Nos flashes agora" da página do assunto).
function toquesDoFlash(f) {
  const tags = [], lugares = [];
  (Array.isArray(f?.toques) ? f.toques : []).forEach((t) => {
    const p = String(t).split("|");
    if (p[0] === "h" && /^[\p{L}\p{N}_]{1,30}$/u.test(p[1] || "")) tags.push(p[1].toLowerCase());
    if (p[0] === "l" && p[1] && Number.isFinite(Number(p[2])) && Number.isFinite(Number(p[3]))) lugares.push({ nome: p[1], lat: Number(p[2]), lng: Number(p[3]) });
  });
  return { tags, lugares };
}
const flashesDaPagina = () => { try { return flashesCarregados().filter((f) => !escondido(f.autorId) && !silenciado(f.autorId)); } catch { return []; } };
function contarAssuntos(lista, agora = Date.now()) {
  const m = new Map(), reg = regiaoEu(), lugares = [];
  const somar = (k, base, p, nomeVisto) => {
    let x = m.get(k);
    if (!x) { x = { ...base, k, n: 0, hoje: 0, ontem: 0, notas: 0, primeiro: agora, porAutor: new Map(), formas: new Map(), capa: "", capaW: -1 }; m.set(k, x); }
    const idade = Math.max(0, agora - (ms(p.criadoEm) || agora));
    const r = resumosPosts.get(p.id) || { total: 0, soma: 0 };
    const eng = 1 + 0.45 * Math.log1p(r.total + Math.max(0, r.soma - 3 * r.total) * 0.5);
    const w = pesoRegiao(p, reg) * eng / (1 + idade / (2 * DIA));
    (x.porAutor.get(p.autorId) || x.porAutor.set(p.autorId, []).get(p.autorId)).push(w);
    x.n++; x.notas += r.total;
    if (idade < DIA) x.hoje++; else if (idade < 2 * DIA) x.ontem++;
    x.primeiro = Math.min(x.primeiro, agora - idade);
    x.formas.set(nomeVisto, (x.formas.get(nomeVisto) || 0) + 1);
    const foto = fotosDoPost(p)[0];
    if (foto && w > x.capaW) { x.capa = foto; x.capaW = w; }
  };
  lista.forEach((p) => {
    if (p.autorId && escondido(p.autorId)) return;
    new Set((p.tags || []).map((t) => String(t).toLowerCase())).forEach((t) => somar("t:" + semAcento(t), { tipo: "tag", nome: t }, p, t));
    const l = p.local;
    if (l?.nome && Number.isFinite(l.lat) && Number.isFinite(l.lng)) {
      // Lugar: o mesmo nome ou outro a menos de 800 m é o mesmo assunto.
      let k = "l:" + chaveLugar(l.nome);
      if (!m.has(k)) { const perto = lugares.find((y) => distanciaKm(y, l) <= 0.8); if (perto) k = perto.k; else lugares.push({ k, lat: l.lat, lng: l.lng }); }
      somar(k, { tipo: "lugar", nome: l.nome, lat: l.lat, lng: l.lng }, p, l.nome);
    }
  });
  return [...m.values()].map((x) => {
    let p = 0;
    x.porAutor.forEach((ws) => ws.sort((a, b) => b - a).forEach((w, i) => { p += i < 2 ? w : w * 0.25; }));
    const pessoas = x.porAutor.size;
    p *= (1 + Math.log1p(pessoas - 1) * 0.7) * (pessoas === 1 ? 0.6 : 1);
    const nome = [...x.formas.entries()].sort((a, b) => b[1] - a[1])[0][0]; // a forma mais usada (com ou sem acento)
    return { ...x, nome: x.tipo === "tag" ? nome : x.nome, p, pessoas, novo: agora - x.primeiro < DIA && pessoas >= 2, subindo: x.hoje >= 2 && x.hoje > x.ontem * 1.5 };
  }).sort((a, b) => b.p - a.p || b.pessoas - a.pessoas || b.n - a.n);
}
const nomeAssunto = (x) => (x.tipo === "tag" ? "#" + x.nome : String(x.nome).split(",")[0]);
const metaAssunto = (x) => plural(x.n, "publicação", "publicações") + (x.pessoas > 1 && x.pessoas < x.n ? ` de ${x.pessoas} pessoas` : "");
const posicaoEmAlta = (k, local) => {
  const i = assuntos.findIndex((x) => x.k === k || (x.tipo === "tag" && x.k === "t:" + semAcento(String(k).slice(2))) || (local && x.tipo === "lugar" && distanciaKm(x, local) <= 0.8));
  return i >= 0 && i < ALTA_MAX ? i + 1 : 0;
};
let listaAlta = [];
export function atualizarAlta() { if (listaAlta.length) pintarAlta(listaAlta); }
// Lista: posição com luz (1º, 2º, 3º), quanto subiu ou caiu desde ontem (mesma conta feita só com as publicações de até
// 24 h atrás), tendência (Subindo / Caindo pelo uso de hoje × ontem), estrelas em dourado e "Ver o Top 20 / 100".
function pintarAlta(lista) {
  listaAlta = lista;
  assuntos = contarAssuntos(lista);
  const sec = $("secAlta");
  sec.hidden = !assuntos.length;
  if (!assuntos.length) return;
  const r = regiaoNome(), agora = Date.now();
  const escopo = seletorEscopo();
  const base = escopoAlta === "brasil" ? lista : lista.filter((p) => doEscopo(p, escopoAlta, r));
  const atuais = escopoAlta === "brasil" ? assuntos : contarAssuntos(base, agora);
  const ontem = contarAssuntos(base.filter((p) => (ms(p.criadoEm) || agora) <= agora - DIA), agora - DIA);
  const posOntem = new Map(ontem.slice(0, ALTA_MAX).map((x, i) => [x.k, i + 1]));
  const temLugar = atuais.some((x) => x.tipo === "lugar"), temTag = atuais.some((x) => x.tipo === "tag");
  if (filtroAlta !== "tudo" && !(filtroAlta === "tag" ? temTag : temLugar)) filtroAlta = "tudo";
  const filtrados = atuais.filter((x) => filtroAlta === "tudo" || x.tipo === filtroAlta).slice(0, ALTA_MAX);
  const tipos = el("div", "alta-tipos"); tipos.setAttribute("role", "tablist"); tipos.setAttribute("aria-label", "Tipo");
  [["tudo", "Tudo", null], ["tag", "Hashtags", "hashtag"], ["lugar", "Lugares", "local"]].forEach(([k, nome, ic]) => {
    const b = el("button"); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(filtroAlta === k));
    b.title = nome; b.setAttribute("aria-label", nome);
    if (ic) b.appendChild(icone(ic, "i xs")); else b.textContent = "Tudo";
    b.disabled = k !== "tudo" && !(k === "tag" ? temTag : temLugar);
    b.addEventListener("click", () => { filtroAlta = k; altaVer = 5; pintarAlta(lista); });
    tipos.appendChild(b);
  });
  const barra = el("div", "alta-filtros"); barra.append(escopo, tipos);
  const ol = el("ol", "alta-lista aberta");
  filtrados.slice(0, altaVer).forEach((x, i) => {
    const pos = i + 1, antes = posOntem.get(x.k), delta = antes ? antes - pos : null;
    const caindo = (delta !== null && delta <= -1) || (x.ontem >= 2 && x.hoje < x.ontem * 0.6);
    const subindo = (delta !== null && delta >= 1) || x.subindo;
    const li = el("li");
    const b = el("button", "alta-item" + (pos <= 3 ? " top" + pos : "") + (subindo && !caindo ? " sobe" : caindo ? " cai" : "")); b.type = "button";
    const mov = delta === null ? "novo na lista" : delta > 0 ? `subiu ${delta}` : delta < 0 ? `caiu ${-delta}` : "mesma posição";
    b.setAttribute("aria-label", `${pos}º em alta: ${nomeAssunto(x)}, ${metaAssunto(x)}, ${mov}`);
    const col = el("span", "alta-col");
    col.appendChild(el("span", "alta-pos", String(pos)));
    const m = el("span", "alta-mov " + (delta === null ? "novo" : delta > 0 ? "sobe" : delta < 0 ? "cai" : "igual"),
      delta === null ? "novo" : delta > 0 ? "▲" + delta : delta < 0 ? "▼" + -delta : "–");
    col.appendChild(m);
    const ic = el("span", "alta-ic " + x.tipo);
    if (x.capa) { ic.classList.add("foto"); ic.style.backgroundImage = `url("${x.capa}")`; const sl = el("span", "alta-ic-selo"); sl.appendChild(icone(x.tipo === "tag" ? "hashtag" : "local", "i xs")); ic.appendChild(sl); }
    else ic.appendChild(icone(x.tipo === "tag" ? "hashtag" : "local", "i s"));
    const meta = el("small"); meta.appendChild(document.createTextNode(metaAssunto(x)));
    if (x.notas) { const e = el("span", "alta-est"); e.append(icone("estrela", "i xs"), document.createTextNode(numeroCurto(x.notas))); meta.append(document.createTextNode(" · "), e); }
    const tx = el("span", "alta-tx"); tx.append(el("strong", null, nomeAssunto(x)), meta);
    b.append(col, ic, tx);
    if (caindo) b.appendChild(el("span", "alta-tend cai", "Caindo"));
    else if (subindo && delta !== null) b.appendChild(el("span", "alta-tend sobe", "Subindo"));
    b.addEventListener("click", () => abrirTopico(x.tipo === "tag" ? { tag: x.nome } : { local: { nome: x.nome, lat: x.lat, lng: x.lng } }));
    li.appendChild(b); ol.appendChild(li);
  });
  const corpo = [barra];
  if (!filtrados.length) corpo.push(el("p", "alta-vazio", `Ainda não há hashtags ou lugares em alta ${escopoAlta === "cidade" ? "em " + (r.cidade || "sua cidade") : "em " + r.uf} nos últimos dias.`));
  else corpo.push(ol);
  const n = filtrados.length;
  const prox = altaVer < 20 && n > 5 ? Math.min(20, n) : altaVer < 100 && n > 20 ? Math.min(100, n) : 0;
  if (prox || altaVer > 5) {
    const mais = el("button", "alta-mais", prox ? `Ver o Top ${prox}` : "Mostrar menos"); mais.type = "button";
    mais.addEventListener("click", () => { altaVer = prox || 5; pintarAlta(lista); if (!prox) sec.scrollIntoView({ block: "start", behavior: "smooth" }); });
    corpo.push(mais);
  }
  corpo.push(el("p", "alta-nota", "Pelas hashtags e lugares das publicações dos últimos dias: conta quantas pessoas usam, as estrelas que receberam e se está crescendo. As setas comparam com a posição de 24 horas atrás. Os flashes não entram na contagem."));
  $("exploraTags").replaceChildren(...corpo);
}

// ---------- Hall da fama (10/11/2026, revisto no mesmo dia) ----------
// Abas: Semana (soma das estrelas nos últimos 7 dias), Hoje (últimas 24 h) e Melhor média (média com pelo menos 5 notas,
// puxada para 3,5 enquanto há poucas notas: 2 notas 5 não passam na frente de 40 notas 4,8). De cada pessoa contam só as
// 5 publicações com mais estrelas (publicar sem parar não compra lugar). 1º com coroa, 2º prata, 3º bronze, do 4º ao 10º em
// lista com a melhor publicação ao lado, e "Você está em Nº · faltam N estrelas para o Nº". Só quem recebeu estrelas.
const ABAS_HALL = [["semana", "Semana"], ["hoje", "Hoje"], ["media", "Melhor média"]];
let abaHall = "semana", listaHall = [];
const perfisHall = new Map();
const perfilHall = (u) => (perfisHall.has(u) ? perfisHall.get(u) : (perfisHall.set(u, obterPerfil(u).catch(() => ({}))), perfisHall.get(u)));
function rankingHall(lista, aba) {
  const agora = Date.now(), desde = agora - (aba === "hoje" ? DIA : 7 * DIA), por = new Map();
  lista.forEach((p) => {
    if (ms(p.criadoEm) < desde || escondido(p.autorId)) return;
    const r = resumosPosts.get(p.id);
    const x = por.get(p.autorId) || { uid: p.autorId, nome: p.nome, foto: p.fotoPerfil, itens: [] };
    x.itens.push({ p, soma: r?.soma || 0, total: r?.total || 0 });
    por.set(p.autorId, x);
  });
  const lst = [...por.values()].map((x) => {
    const melhores = x.itens.sort((a, b) => b.soma - a.soma).slice(0, 5);
    const soma = melhores.reduce((s, i) => s + i.soma, 0), total = melhores.reduce((s, i) => s + i.total, 0);
    const capa = melhores.find((i) => fotosDoPost(i.p)[0]);
    return { ...x, soma, total, posts: x.itens.length, media: total ? soma / total : 0, bayes: (soma + 3.5 * 8) / (total + 8), melhor: melhores[0]?.p, capa: capa ? fotosDoPost(capa.p)[0] : "" };
  }).filter((x) => x.total > 0);
  return aba === "media" ? lst.filter((x) => x.total >= 5).sort((a, b) => b.bayes - a.bayes || b.total - a.total)
    : lst.sort((a, b) => b.soma - a.soma || b.media - a.media || b.posts - a.posts);
}
// Visual (10/11/2026, pedido dele "profissional e elegante, como no X"): cartão do líder (coroa discreta, foto, @, números e a
// melhor publicação), do 2º ao 10º em linhas com barra proporcional ao líder e estrela dourada; filtro Brasil/estado/cidade.
async function pintarHall(lista = listaHall) {
  listaHall = lista;
  const sec = $("secHall"); if (!sec) return;
  const abas = ABAS_HALL.filter(([k]) => rankingHall(lista, k).length);
  sec.hidden = !abas.length;
  if (!abas.length) return;
  if (!abas.some(([k]) => k === abaHall)) abaHall = abas[0][0];
  const r = regiaoNome();
  const base = escopoAlta === "brasil" ? lista : lista.filter((p) => doEscopo(p, escopoAlta, r));
  const ranking = rankingHall(base, abaHall);
  const top = ranking.slice(0, 10);
  const perfis = new Map(await Promise.all(top.map((x) => perfilHall(x.uid).then((pp) => [x.uid, pp || {}]))));
  const nomeDe = (x) => perfis.get(x.uid)?.nome || x.nome || "Usuário";
  const nickDe = (x) => perfis.get(x.uid)?.nickname || "";
  const virg = (n) => n.toFixed(1).replace(".", ",");
  const ehMedia = abaHall === "media";
  const valor = (x) => (ehMedia ? virg(x.media) : numeroCurto(x.soma));
  const medida = (x) => (ehMedia ? x.bayes : x.soma);
  const estrela = (x) => { const e = el("span", "hall-est"); e.append(icone("estrela", "i xs"), document.createTextNode(valor(x))); return e; };
  const COROA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18l1.6-10 4.9 4.2L12 5l2.5 7.2L19.4 8 21 18z" fill="currentColor"/></svg>';
  const tabs = el("div", "alta-abas hall-abas"); tabs.setAttribute("role", "tablist");
  abas.forEach(([k, nome]) => {
    const b = el("button", null, nome); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(abaHall === k));
    b.addEventListener("click", () => { abaHall = k; pintarHall(); });
    tabs.appendChild(b);
  });
  const filtros = el("div", "alta-filtros hall-filtros"); filtros.append(seletorEscopo(), tabs);
  const corpo = [filtros];
  if (!top.length) {
    corpo.push(el("p", "alta-vazio", `Ninguém recebeu estrelas ${escopoAlta === "cidade" ? "em " + (r.cidade || "sua cidade") : "em " + r.uf} neste período.`));
    $("exploraHall").replaceChildren(...corpo); return;
  }
  // Líder
  const l = top[0], ppl = perfis.get(l.uid) || {};
  const lider = el("button", "hall-lider"); lider.type = "button";
  lider.setAttribute("aria-label", `1º lugar: ${nomeDe(l)}, ${valor(l)} ${ehMedia ? "de média" : "estrelas"}`);
  const faixa = el("span", "hl-faixa"); const cr = el("span", "hl-coroa"); cr.innerHTML = COROA;
  faixa.append(cr, el("span", null, ehMedia ? "Melhor média" : abaHall === "hoje" ? "Destaque de hoje" : "Destaque da semana"), el("span", "hl-pos", "1º"));
  const av = el("div", "avatar hl-av"); pintarAvatar(av, ppl.fotoPerfil || l.foto, nomeDe(l));
  const quem = el("span", "hl-quem"); quem.append(el("strong", null, nomeDe(l)), el("small", null, nickDe(l) ? "@" + nickDe(l) : plural(l.posts, "publicação", "publicações")));
  const linha = el("span", "hl-topo"); linha.append(av, quem);
  if (l.capa) { const t = el("span", "hl-capa"); t.style.backgroundImage = `url("${l.capa}")`; linha.appendChild(t); }
  const nums = el("span", "hl-nums");
  const num = (v, n, est) => { const c = el("span", "hl-num"); const b = el("b"); if (est) b.appendChild(icone("estrela", "i xs")); b.appendChild(document.createTextNode(v)); c.append(b, el("small", null, n)); return c; };
  nums.append(num(numeroCurto(l.soma), "estrelas", true), num(virg(l.media), "média"), num(String(l.total), l.total === 1 ? "nota" : "notas"), num(String(l.posts), l.posts === 1 ? "publicação" : "publicações"));
  lider.append(faixa, linha, nums);
  lider.addEventListener("click", () => ganchos.abrirPerfil(l.uid));
  corpo.push(lider);
  // 2º ao 10º
  if (top.length > 1) {
    const resto = el("ol", "hall-resto"); resto.start = 2;
    const maior = medida(l) || 1;
    top.slice(1).forEach((x, k) => {
      const pp = perfis.get(x.uid) || {}, pos = k + 2;
      const li = el("li"); const b = el("button", "hall-linha" + (pos <= 3 ? " p" + pos : "") + (x.uid === eu.uid ? " eu" : "")); b.type = "button";
      b.setAttribute("aria-label", `${pos}º lugar: ${nomeDe(x)}, ${valor(x)} ${ehMedia ? "de média" : "estrelas"}`);
      const a = el("div", "avatar"); pintarAvatar(a, pp.fotoPerfil || x.foto, nomeDe(x));
      const tx = el("span", "hall-tx");
      tx.append(el("strong", null, nomeDe(x)), el("small", null, [nickDe(x) ? "@" + nickDe(x) : "", ehMedia ? plural(x.total, "nota", "notas") : `média ${virg(x.media)}`].filter(Boolean).join(" · ")));
      const barra = el("span", "hall-barra"); const f = el("i"); f.style.width = Math.max(6, Math.round((medida(x) / maior) * 100)) + "%"; barra.appendChild(f); tx.appendChild(barra);
      b.append(el("span", "hall-n", String(pos)), a, tx, estrela(x));
      b.addEventListener("click", () => ganchos.abrirPerfil(x.uid));
      li.appendChild(b); resto.appendChild(li);
    });
    corpo.push(resto);
  }
  const minha = ranking.findIndex((x) => x.uid === eu.uid);
  if (minha === 0) corpo.push(el("p", "hall-voce lider", "Você está em 1º lugar."));
  else if (minha > 0 && !ehMedia) {
    const falta = ranking[minha - 1].soma - ranking[minha].soma + 1;
    corpo.push(el("p", "hall-voce", `Você está em ${minha + 1}º · faltam ${plural(falta, "estrela", "estrelas")} para o ${minha}º.`));
  } else if (minha > 0) corpo.push(el("p", "hall-voce", `Você está em ${minha + 1}º na melhor média.`));
  corpo.push(el("p", "alta-nota", ehMedia ? "Média das notas com pelo menos 5 notas recebidas nos últimos 7 dias; quem tem poucas notas fica perto de 3,5 até ter mais."
    : `Pela soma das estrelas recebidas nas publicações ${abaHall === "hoje" ? "das últimas 24 horas" : "dos últimos 7 dias"}. De cada pessoa contam as 5 publicações com mais estrelas.`));
  $("exploraHall").replaceChildren(...corpo);
}
const numeroCurto = (n) => (n >= 1e4 ? (n / 1e3).toFixed(1).replace(".", ",").replace(",0", "") + " mil" : n.toLocaleString("pt-BR"));

// ---------- página de uma #hashtag ou de um lugar (como no Instagram, dentro do Explorar) ----------
// Abre por cima do Explorar (voltar fecha): cabeçalho com o assunto (mapa no lugar), quantas publicações, posição no Em alta,
// Publicar com a hashtag / Publicar aqui, Como chegar, Compartilhar, os flashes de agora com o assunto, assuntos
// relacionados e a grade Principais | Recentes. Tocar numa publicação abre a tela da publicação com as parecidas.
let topico = null;
function fecharTopico({ doHistorico = false } = {}) {
  if (!topico) return;
  const t = topico; topico = null;
  t.el.classList.add("saindo"); setTimeout(() => t.el.remove(), 180);
  if (!pilha.length && !visor && !document.querySelector(".story-visor")) document.body.classList.remove("travado");
  if (!doHistorico && history.state?.hfTopico) history.back();
  else if (/[?&](tag|local)=/.test(location.search)) history.replaceState({ ...(history.state || {}), hfTopico: false }, "", "feed.html?aba=explorar");
}
addEventListener("popstate", () => { if (topico && !history.state?.hfTopico && !history.state?.hfVisorExp) fecharTopico({ doHistorico: true }); });
const linkTopico = ({ tag, local }) => tag ? `feed.html?tag=${encodeURIComponent(tag)}` : `feed.html?local=${local.lat},${local.lng}&n=${encodeURIComponent(local.nome)}`;
async function postsDoTopico({ tag, local }) {
  if (tag) {
    const q = fb.query(fb.collection(fb.db, "diario"), fb.where("tags", "array-contains", tag), fb.limit(60));
    const [s, c] = await Promise.all([fb.getDocs(q), fb.getCountFromServer(fb.query(fb.collection(fb.db, "diario"), fb.where("tags", "array-contains", tag))).then((x) => x.data().count).catch(() => null)]);
    return { lista: s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })), total: c };
  }
  const [rec, s] = await Promise.all([postsRecentes(), fb.getDocs(fb.query(fb.collection(fb.db, "diario"), fb.orderBy("criadoEm", "desc"), fb.limit(120))).catch(() => null)]);
  const todas = juntar(rec, s ? s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })) : []);
  const k = chaveLugar(local.nome);
  return { lista: todas.filter((p) => p.local && Number.isFinite(p.local.lat) && (chaveLugar(p.local.nome) === k || distanciaKm(local, p.local) <= 3)), total: null };
}
export async function abrirTopico({ tag = "", local = null } = {}, { daUrl = false } = {}) {
  tag = String(tag || "").toLowerCase().replace(/^#/, "").slice(0, 30);
  if (!tag && !(local && Number.isFinite(Number(local.lat)))) return;
  if (local) local = { nome: String(local.nome || "Este lugar").slice(0, 80), lat: Number(local.lat), lng: Number(local.lng) };
  if (topico) fecharTopico({ doHistorico: true });
  const ehLugar = !tag;
  const nome = ehLugar ? String(local.nome).split(",")[0] : "#" + tag;
  const k = ehLugar ? "l:" + chaveLugar(local.nome) : "t:" + tag;
  const caixa = el("div", "topico" + (ehLugar ? " lugar" : " tag")); caixa.setAttribute("role", "dialog"); caixa.setAttribute("aria-label", nome);
  const topo = el("div", "tp-topo");
  const voltar = el("button", "icone-btn"); voltar.type = "button"; voltar.setAttribute("aria-label", "Voltar ao Explorar"); voltar.appendChild(icone("voltar", "i"));
  const tit = el("div", "tp-tit"); tit.append(el("strong", null, nome), el("small", null, ehLugar ? "Lugar" : "Hashtag"));
  const comp = el("button", "icone-btn"); comp.type = "button"; comp.setAttribute("aria-label", "Compartilhar"); comp.appendChild(icone("compartilhar", "i s"));
  topo.append(voltar, tit, comp);
  const rolagem = el("div", "tp-rolagem");
  // cabeçalho
  const hero = el("section", "tp-hero");
  if (ehLugar) { const mp = mapaDoLugar(local.lat, local.lng); mp.classList.add("tp-mapa"); hero.appendChild(mp); }
  const cab = el("div", "tp-cab");
  const ic = el("span", "tp-ic"); ic.appendChild(icone(ehLugar ? "local" : "hashtag", "i"));
  const tx = el("div", "tp-tx");
  const nPosts = el("span", "tp-n", "Carregando…");
  tx.append(el("h1", null, nome), el("small", null, ehLugar ? (String(local.nome).split(",").slice(1).join(",").trim() || "Lugar marcado nas publicações") : "Hashtag do Help Floripa"), nPosts);
  cab.append(ic, tx);
  hero.appendChild(cab);
  const pos = posicaoEmAlta(k, ehLugar ? local : null);
  if (pos) { const sel = el("span", "tp-alta" + (pos <= 3 ? " top" : "")); sel.textContent = `${pos}º em alta no Help Floripa`; hero.appendChild(sel); }
  const acoes = el("div", "tp-acoes");
  const pub = el("button", "tp-bt pri"); pub.type = "button"; pub.append(icone("criar", "i s"), document.createTextNode(ehLugar ? "Publicar aqui" : "Publicar com " + nome));
  pub.addEventListener("click", () => abrirCompositor({ aoPublicar: ganchos.aoPublicar, ...(ehLugar ? { local } : { texto: `\n\n#${tag}` }) }));
  acoes.appendChild(pub);
  if (ehLugar) { const ir = el("a", "tp-bt"); ir.href = `https://www.google.com/maps/dir/?api=1&destination=${local.lat},${local.lng}`; ir.target = "_blank"; ir.rel = "noopener"; ir.append(icone("bussola", "i s"), document.createTextNode("Como chegar")); acoes.appendChild(ir); }
  hero.appendChild(acoes);
  rolagem.appendChild(hero);
  // flashes de agora com o assunto (os que já estão na página)
  const vivos = flashesDaPagina().filter((f) => { const { tags, lugares } = toquesDoFlash(f); return ehLugar ? lugares.some((l) => chaveLugar(l.nome) === chaveLugar(local.nome) || distanciaKm(local, l) <= 3) : tags.includes(tag); });
  if (vivos.length) {
    const fl = el("section", "tp-sec");
    fl.appendChild(el("h2", "tp-sec-tit", `Nos flashes agora · ${vivos.length}`));
    const trilho = el("div", "tp-flashes");
    const porAutor = new Map(); vivos.forEach((f) => { if (!porAutor.has(f.autorId)) porAutor.set(f.autorId, f); });
    porAutor.forEach((f, uid) => {
      const b = el("button", "tp-flash"); b.type = "button";
      const av = el("div", "avatar"); b.append(av, el("small", null, "…"));
      obterPerfil(uid).then((pp) => { pintarAvatar(av, pp.fotoPerfil, pp.nome); b.lastChild.textContent = String(pp.nome || "").split(" ")[0] || "Flash"; }).catch(() => {});
      b.addEventListener("click", () => abrirFlashPorId(f.id));
      trilho.appendChild(b);
    });
    fl.appendChild(trilho);
    rolagem.appendChild(fl);
  }
  const rel = el("section", "tp-sec"); rel.hidden = true;
  rolagem.appendChild(rel);
  // grade
  const grade = el("section", "tp-sec tp-gradesec");
  const abas = el("div", "tp-abas"); abas.setAttribute("role", "tablist");
  const g = el("div", "exp-grade tp-grade"); g.appendChild(el("div", "lista-vazia", "Carregando publicações…"));
  grade.append(abas, g);
  rolagem.appendChild(grade);
  caixa.append(topo, rolagem);
  document.body.appendChild(caixa);
  document.body.classList.add("travado");
  const url = linkTopico({ tag, local });
  // Aberta por um link (feed.html?tag=…): o Explorar fica embaixo, e voltar cai nele.
  if (daUrl) history.replaceState({ ...(history.state || {}), hfTopico: false, hfAbaFeed: "explorar" }, "", "feed.html?aba=explorar");
  history.pushState({ ...(history.state || {}), hfTopico: true, hfBase: false, hfGuarda: false }, "", url);
  const t = topico = { el: caixa };
  voltar.addEventListener("click", () => fecharTopico());
  caixa.addEventListener("keydown", (e) => { if (e.key === "Escape" && !visor) { e.stopPropagation(); fecharTopico(); } });
  comp.addEventListener("click", async () => {
    const link = new URL(url, location.href).href;
    try { if (navigator.share) await navigator.share({ title: nome + " · Help Floripa", url: link }); else { await navigator.clipboard.writeText(link); toast("Link copiado"); } } catch {}
  });
  let lista = [], total = null;
  try { ({ lista, total } = await postsDoTopico({ tag, local })); } catch (e) { console.warn("Assunto:", e); }
  if (topico !== t) return;
  lista = lista.filter((p) => !escondido(p.autorId) && !postOculto(p));
  const n = total ?? lista.length;
  nPosts.textContent = [n ? plural(n, "publicação", "publicações") : "Nenhuma publicação ainda", vivos.length ? plural(vivos.length, "flash agora", "flashes agora") : ""].filter(Boolean).join(" · ");
  const r = await lerResumosEstrelas(lista.map((p) => p.id)).catch(() => new Map());
  r.forEach((v, kk) => resumosPosts.set(kk, v));
  if (topico !== t) return;
  // relacionados: hashtags que aparecem junto / lugares que aparecem nas mesmas publicações e por perto
  const rels = new Map();
  lista.forEach((p) => {
    (p.tags || []).forEach((x) => { if (x !== tag) rels.set("t:" + x, { tag: x, n: (rels.get("t:" + x)?.n || 0) + 1 }); });
    if (!ehLugar && p.local?.nome && Number.isFinite(p.local.lat)) { const kk = "l:" + chaveLugar(p.local.nome); rels.set(kk, { local: p.local, n: (rels.get(kk)?.n || 0) + 1 }); }
  });
  const top = [...rels.values()].sort((a, b) => b.n - a.n).slice(0, 10);
  if (top.length) {
    rel.hidden = false;
    rel.appendChild(el("h2", "tp-sec-tit", "Relacionados"));
    const chips = el("div", "tp-rel");
    top.forEach((x) => { const b = el("button", "tp-chip"); b.type = "button"; b.append(icone(x.tag ? "hashtag" : "local", "i xs"), document.createTextNode(x.tag || String(x.local.nome).split(",")[0])); b.addEventListener("click", () => abrirTopico(x.tag ? { tag: x.tag } : { local: x.local })); chips.appendChild(b); });
    rel.appendChild(chips);
  }
  const agora = Date.now();
  const notaP = (p) => { const rr = resumosPosts.get(p.id) || { total: 0, soma: 0 }; return (1 + rr.soma) / Math.pow(1 + Math.max(0, agora - ms(p.criadoEm)) / DIA, 0.6); };
  let aba = "principais", mostrar = 18;
  const pintar = () => {
    abas.replaceChildren(...[["principais", "Principais"], ["recentes", "Recentes"]].map(([kk, nm]) => { const b = el("button", null, nm); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(aba === kk)); b.addEventListener("click", () => { aba = kk; mostrar = 18; pintar(); }); return b; }));
    const ord = lista.slice().sort(aba === "recentes" ? (a, b) => ms(b.criadoEm) - ms(a.criadoEm) : (a, b) => notaP(b) - notaP(a));
    if (!ord.length) {
      const v = el("div", "tp-vazio"); v.append(icone(ehLugar ? "local" : "hashtag", "i"), el("strong", null, ehLugar ? "Ninguém publicou deste lugar ainda" : `Ninguém usou ${nome} ainda`), el("small", null, "Seja a primeira pessoa: toque em Publicar."));
      g.replaceChildren(v); return;
    }
    g.replaceChildren(...ord.slice(0, mostrar).map((p, i) => tilePost(p, resumosPosts.get(p.id), aba === "principais" && i === 0)));
    if (ord.length > mostrar) { const m = el("button", "btn sec tp-mais", "Ver mais"); m.type = "button"; m.addEventListener("click", () => { mostrar += 18; pintar(); }); g.appendChild(m); }
  };
  pintar();
}
ganchos.abrirTopico = (x) => abrirTopico(x);

// Enquetes abertas: as que ainda dá para votar (as que terminam antes vêm primeiro).
function pintarEnquetes(lista) {
  const agora = Date.now();
  const abertas = lista.filter((p) => p.enquete?.pergunta && p.autorId !== eu.uid && (fimDaEnquete(p.enquete) ? fimDaEnquete(p.enquete) > agora : agora - ms(p.criadoEm) < 7 * DIA))
    .sort((a, b) => (fimDaEnquete(a.enquete) || 9e15) - (fimDaEnquete(b.enquete) || 9e15)).slice(0, 10);
  $("secEnquetes").hidden = !abertas.length;
  $("exploraEnquetes").replaceChildren(...abertas.map((p) => {
    const a = el("a", "exp-enq"); a.href = linkPost(p);
    const topo = el("div", "enq-topo");
    topo.append(icone("enquete", "i xs"), el("span", null, p.enquete.anonima ? "Enquete anônima" : "Enquete"));
    const fim = fimDaEnquete(p.enquete);
    if (fim) { const f = el("span", "enq-prazo" + (fim - agora < 3 * HORA ? " acabando" : "")); f.append(icone("relogio", "i xs"), document.createTextNode(faltaTexto(fim).replace(/^termina/, "Termina"))); topo.appendChild(f); }
    const ops = el("div", "enq-ops");
    (p.enquete.opcoes || []).slice(0, 4).forEach((o) => ops.appendChild(el("span", null, String(o?.texto ?? o ?? ""))));
    const quem = el("div", "enq-quem");
    const av = el("span", "avatar"); pintarAvatar(av, p.fotoPerfil, p.nome);
    quem.append(av, el("small", null, p.nome || "Usuário"), el("b", "enq-votar", "Votar"));
    a.append(topo, el("strong", "enq-perg", p.enquete.pergunta), ops, quem);
    return a;
  }));
}

// "Perto de você": posição da pessoa (GPS guardado no aparelho ou a cidade do perfil).
let posEu = null, posPronta = null;
const posicao = () => (posPronta ||= minhaPosicao(dados).then((p) => { posEu = p; leitorExp = null; return p; }).catch(() => null));
// Botão "Usar minha localização" dentro do título da seção (some quando já tem GPS).
function botaoLocal(alvo, aoMudar) {
  alvo.querySelector(".exp-loc")?.remove();
  if (posEu?.origem === "gps") return;
  const b = el("button", "exp-loc"); b.type = "button"; b.append(icone("local", "i xs"), document.createTextNode("Usar minha localização"));
  b.addEventListener("click", async () => {
    b.disabled = true; b.lastChild.textContent = "Localizando...";
    try { posEu = await pedirLocalizacao(); posPronta = Promise.resolve(posEu); leitorExp = null; aoMudar(); }
    catch (e) { b.disabled = false; b.lastChild.textContent = "Usar minha localização"; toast(e?.message || "Não deu para pegar a sua localização."); }
  });
  alvo.appendChild(b);
}
// Negócios: os mais perto primeiro (pela distância e pela nota); sem localização, os da sua cidade.
// Comunidade (doações, trocas, pedidos, quartos, achados e perdidos): os da cidade da pessoa primeiro, com filtro por tipo.
// Nacional (por-local.js): a cidade do perfil, depois o estado e só então o Brasil; com a distância quando há posição.
let comunidadeP = null;
const comunidadeLocal = () => (comunidadeP ||= lerComunidade(fb, docsComValidade, { uf: dados.uf, cidadeIbge: Number(dados.cidadeIbge) || null }).catch(() => ({ lista: [], nivel: "brasil" })));
const comunidadeRecentes = () => comunidadeLocal().then((r) => r.lista);
async function pintarComunidade() {
  const { lista, nivel } = await comunidadeLocal();
  $("secComunidade").hidden = !lista.length;
  if (!lista.length) return;
  const pos = await posicao();
  if (pos) { await comDistancia(lista, pos); lista.forEach((a) => { if (Number.isFinite(a._km)) a._dist = textoDistancia(a._km, a._aprox); }); }
  $("titComunidade").textContent = nivel === "cidade" ? `Na Comunidade em ${nomeCid(dados.cidade || dados.cidadeNome)}` : nivel === "estado" ? `Na Comunidade no seu estado` : "Na Comunidade";
  const pintar = (l) => $("exploraComunidade").replaceChildren(...l.slice(0, 16).map((a) => cartaoComunidade(a, "explorar")));
  $("filtrosComunidadeExp").replaceChildren(filtrosComunidade(lista, pintar));
  pintar(lista);
}
async function comunidadeDoServidor(termo) {
  return (await buscarNoServidor(fb, "comunidade", termo).catch(() => [])).filter(comunidadeNoAr);
}

async function pintarNegocios() {
  const todos = (await negociosRecentes()).filter((n) => n.donoId !== eu.uid);
  const pos = await posicao();
  if (pos) await comDistancia(todos, pos);
  const cid = minhaCidade();
  const daCidade = cid ? todos.filter((n) => chaveCidade(n.cidade) === cid) : [];
  const perto = pos ? todos.filter((n) => n._km <= 60) : [];
  const base = (perto.length >= 3 ? perto : daCidade.length >= 3 ? daCidade : todos).slice(0, 60);
  const nota = await notasDe(base);
  const agora = Date.now();
  const novo = (n) => agora - ms(n.criadoEm || n.atualizadoEm) < 14 * DIA;
  const peso = (n) => { const r = nota(n); const m = r?.total ? media(r) : 0; return (r?.total ? m * m * (1 + Math.log1p(r.total)) / 5 : 0.8) * (novo(n) ? 1.6 : 1) / (1 + (agora - ms(n.atualizadoEm)) / (30 * DIA)); };
  // Perto pesa mais: 1 km vale quase o dobro de 10 km.
  const pesoPerto = (n) => peso(n) / (pos && Number.isFinite(n._km) ? 1 + n._km / 8 : 1);
  // Mesma regra das vitrines (relevancia.js): no "Perto de você" manda a distância (Pro/Premium contam mais perto, como no
  // Início); nas outras, a ordem justa (1 espaço pago a cada 5, o 1º de um Premium quando houver) pela nota e novidade.
  const planos = await planosDosDonos(fb, base.map((n) => n.donoId), docsPorIds);
  const nivelN = (n) => nivelPlano(planos.get(n.donoId));
  const porPertoJa = pos && perto.length >= 3;
  const bonusPerto = (n) => [1, 0.9, 0.6, 0.5][nivelN(n)] || 1;
  const top = (porPertoJa
    ? base.sort((a, b) => ((a._km ?? 9e9) + 0.5) * bonusPerto(a) - ((b._km ?? 9e9) + 0.5) * bonusPerto(b))
    : ordenarJusto(base, (n) => dadosNegocio(n, { nota: nota(n), nivel: nivelN(n), fator: novo(n) ? 1.2 : 1 }), { dono: (n) => n.donoId, semente: eu.uid, marcar: 6 })).slice(0, 12);
  $("secNegocios").hidden = !top.length;
  if (!top.length) return;
  const porPerto = perto.length >= 3;
  const cidade = !porPerto && daCidade.length >= 3 ? nomeCid(dados.cidade || dados.cidadeNome) : "";
  const onde = porPerto ? await rotuloPosicao(pos) : "";
  $("titNegocios").textContent = porPerto ? "Perto de você" : cidade ? `Negócios em ${cidade}` : "Negócios em destaque";
  $("subNegocios").textContent = porPerto ? `Negócios ${pos.origem === "gps" ? "perto de onde você está" : "da sua cidade e arredores"}${onde ? ` · ${onde}` : ""}` : cidade ? "Bem avaliados e novidades perto de você" : "Bem avaliados e novidades no Help Floripa";
  botaoLocal($("titNegocios").parentElement, () => { pintarNegocios(); if (postsDestaque.length) pintarPostsPerto(postsDestaque); });
  $("exploraNegocios").replaceChildren(...top.map((n) => {
    const a = el("a", "exp-neg"); a.href = linkNegocio(n);
    if (n.donoId) corDoPlano(fb, a, n.donoId);
    a.style.setProperty("--c", CORES_TIPO[n.tipo] || "var(--accent)");
    const capa = el("div", "capa");
    const f = urlSegura((n.fotos || []).find((x) => urlSegura(x))) || urlSegura(n.foto);
    const img = document.createElement("img"); img.src = f || IMG_TIPO[n.tipo]; img.alt = ""; img.loading = "lazy"; img.decoding = "async";
    capa.append(img, el("span", "tag", NOME_TIPO(n.tipo)));
    if (novo(n)) capa.appendChild(el("span", "novo", "Novo"));
    if (pos && Number.isFinite(n._km)) { const d = el("span", "dist"); d.append(icone("local", "i xs"), document.createTextNode(textoDistancia(n._km, n._aprox))); capa.appendChild(d); }
    const tx = el("div", "tx");
    tx.append(el("strong", null, n.nome), el("small", null, [nomeCategoria(n), n.bairro || nomeCid(n.cidade)].filter(Boolean).join(" · ")));
    const r = nota(n);
    const nt = el("span", "nota");
    if (r?.total) nt.append(icone("estrela", "i xs"), document.createTextNode(`${media(r).toFixed(1).replace(".", ",")} (${r.total})`));
    else nt.textContent = "Sem avaliações ainda";
    tx.appendChild(nt);
    a.append(capa, tx);
    return a;
  }));
}

// ---------- Sugestões para você (Explorar e no meio do Diário, como no Instagram) ----------
// Quem é da sua rede (seguido por quem você segue), quem segue você, quem está online agora, gente da sua cidade e quem
// esteve ativo. A lista é montada uma vez (5 min) e serve às duas telas; dispensar (X) vale para sempre no aparelho.
// Com 3 ou mais: cartões que deslizam (capa, foto, nome, motivo com a foto de quem liga vocês e Seguir).
// Com 1 ou 2: linhas largas (um cartão sozinho no canto ficava feio).
const CHAVE_DISPENSADOS = "hf-sug-dispensados";
const ONLINE_MS = 10 * 60000;
const estaOn = (p) => !!p?.ultimoAcesso && Date.now() - ms(p.ultimoAcesso) < ONLINE_MS;
let sugP = null, sugEm = 0;
function listaSugestoes() {
  if (sugP && Date.now() - sugEm < 5 * 60000) return sugP;
  sugEm = Date.now();
  return (sugP = (async () => {
    const pode = (u) => u && u !== eu.uid && !meusSeguindo.has(u) && !escondido(u);
    const [recentes, rede, seguidores] = await Promise.all([pessoasRecentes(fb, { limite: 40 }), minhaRede().catch(() => new Map()), meusSeguidores()]);
    const cand = new Map();
    recentes.forEach((p) => { if (pode(p.uid) && p.nome) cand.set(p.uid, p); });
    // Da rede e quem segue você, mesmo sem ter entrado agora (até 14 perfis a mais).
    const extras = [...new Set([...seguidores, ...rede.keys()])].filter((u) => pode(u) && !cand.has(u)).slice(0, 14);
    (await Promise.all(extras.map((u) => obterPerfil(u).then((p) => ({ uid: u, ...p })).catch(() => null)))).forEach((p) => { if (p?.nome) cand.set(p.uid, p); });
    const cid = minhaCidade();
    const pontes = new Map();
    await Promise.all([...cand.keys()].filter((u) => rede.has(u)).map((u) => obterPerfil(rede.get(u)).then((p) => pontes.set(u, { nome: String(p.nome || "").split(" ")[0], foto: p.fotoPerfil, nomeTodo: p.nome })).catch(() => {})));
    const motivo = (p) => {
      const mesmaCid = cid && chaveCidade(p.cidade || p.cidadeNome) === cid;
      if (seguidores.has(p.uid)) return { txt: "Segue você", peso: 5, tipo: "segue" };
      if (pontes.get(p.uid)) return { txt: `Seguido por ${pontes.get(p.uid).nome}`, peso: 4 + (mesmaCid ? 0.5 : 0), tipo: "rede", ponte: pontes.get(p.uid) };
      if (estaOn(p) && mesmaCid) return { txt: `Online · ${nomeCid(p.cidade || p.cidadeNome)}`, peso: 2.4, tipo: "online" };
      if (mesmaCid) return { txt: `Em ${nomeCid(p.cidade || p.cidadeNome)}`, peso: 2, tipo: "cidade" };
      if (estaOn(p)) return { txt: "Online agora", peso: 1.6, tipo: "online" };
      return { txt: "Novo por aqui", peso: 1, tipo: "ativo" };
    };
    return [...cand.values()].map((p) => ({ p, m: motivo(p), segueVoce: seguidores.has(p.uid) }))
      .sort((a, b) => b.m.peso - a.m.peso || (b.p.fotoPerfil ? 1 : 0) - (a.p.fotoPerfil ? 1 : 0) || ms(b.p.ultimoAcesso) - ms(a.p.ultimoAcesso))
      .slice(0, 24);
  })().catch((e) => { sugP = null; throw e; }));
}
function cartaoSugestao(s, linha, aoTirar) {
  const { p, m } = s;
  const c = el("div", linha ? "sug-linha" : "sug-cartao");
  c.dataset.uid = p.uid;
  const abrir = () => ganchos.abrirPerfil(p.uid);
  const x = el("button", "sug-tirar"); x.type = "button"; x.setAttribute("aria-label", `Não sugerir ${p.nome || "esta pessoa"}`); x.appendChild(icone("fechar", "i xs"));
  x.addEventListener("click", (e) => { e.stopPropagation(); aoTirar(c, p.uid); });
  const av = el("div", "avatar"); pintarAvatar(av, p.fotoPerfil, p.nome);
  const foto = el("button", "sug-foto"); foto.type = "button"; foto.setAttribute("aria-label", `Ver o perfil de ${p.nome || "Usuário"}`);
  foto.appendChild(av);
  if (estaOn(p)) foto.appendChild(el("i", "sug-on"));
  foto.addEventListener("click", abrir);
  const nome = el("strong", "sug-nome"); nome.append(document.createTextNode(p.nome || "Usuário"));
  if (p.verificado) { const v = icone("selo", "i xs sug-selo"); v.setAttribute("aria-label", "Verificado"); nome.appendChild(v); }
  nome.addEventListener("click", abrir);
  const nick = el("small", "sug-nick", p.nickname ? "@" + p.nickname : nomeCid(p.cidade || p.cidadeNome) || "Help Floripa");
  const mot = el("span", "sug-motivo " + m.tipo);
  if (m.ponte) { const mini = el("span", "avatar sug-mini"); pintarAvatar(mini, m.ponte.foto, m.ponte.nomeTodo); mot.appendChild(mini); }
  else if (m.tipo === "online") mot.appendChild(el("i", "sug-pt"));
  else mot.appendChild(icone(m.tipo === "segue" ? "pessoa" : m.tipo === "cidade" ? "local" : "estrela", "i xs"));
  mot.appendChild(el("span", null, m.txt));
  const seg = botaoSeguir(p.uid, { meSegue: s.segueVoce });
  if (linha) {
    const tx = el("div", "sug-tx"); tx.append(nome, nick, mot);
    c.append(foto, tx, seg, x);
  } else {
    const capa = el("div", "sug-capa");
    const capaUrl = urlSegura(p.fotoCapa);
    if (capaUrl) capa.style.backgroundImage = `url("${capaUrl}")`; else capa.classList.add("vazia");
    c.append(capa, x, foto, nome, nick, mot, seg);
  }
  return c;
}
// Monta as sugestões dentro de `alvo`. Devolve quantas apareceram (0 = nada para sugerir).
export async function montarSugestoes(alvo, { max = 12, aoEsvaziar = null } = {}) {
  const fora = new Set(lerLocal(CHAVE_DISPENSADOS, []));
  const sug = (await listaSugestoes()).filter((s) => !fora.has(s.p.uid) && !meusSeguindo.has(s.p.uid) && !escondido(s.p.uid)).slice(0, max);
  if (!sug.length) { alvo.replaceChildren(); return 0; }
  const linha = sug.length < 3;
  alvo.classList.toggle("sug-poucas", linha);
  alvo.classList.toggle("sug-trilho", !linha);
  const tirar = (c, uid) => {
    gravarLocal(CHAVE_DISPENSADOS, [uid, ...lerLocal(CHAVE_DISPENSADOS, []).filter((u) => u !== uid)].slice(0, 200));
    c.classList.add("saindo");
    setTimeout(() => { c.remove(); if (!alvo.children.length) aoEsvaziar?.(); }, 200);
  };
  alvo.replaceChildren(...sug.map((s) => cartaoSugestao(s, linha, tirar)));
  return sug.length;
}
async function pintarSugestoes() {
  const n = await montarSugestoes($("exploraSugestoes"), { max: 16, aoEsvaziar: () => { $("secSugestoes").hidden = true; } });
  $("secSugestoes").hidden = !n;
}

// Destaques: mosaico pelo engajamento e pelo seu gosto, com filtros e "Ver mais".
const FILTROS_DEST = [["tudo", "Tudo"], ["fotos", "Fotos"], ["videos", "Vídeos"], ["textos", "Textos"]];
// Texto com imagem casada conta como texto (o quadrinho mostra a imagem atrás do texto).
const tipoPost = (p) => (p.mediaTipo === "video" && urlSegura(p.mediaUrl) ? "videos" : p.estilo === "casada" ? "textos" : fotosDoPost(p).length ? "fotos" : "textos");
let filtroDest = lerLocal("hf-explorar-filtro", "tudo"), mostrarDest = 12, resumosPosts = new Map(), postsDestaque = [];
if (!FILTROS_DEST.some(([id]) => id === filtroDest)) filtroDest = "tudo";
// Publicações de pessoas da sua região (pela cidade do perfil de quem publicou, até 50 km).
async function pintarPostsPerto(lista) {
  const sec = $("secPostsPerto"); if (!sec) return;
  const pos = await posicao();
  if (!pos) { sec.hidden = true; return; }
  const base = lista.filter((p) => p.autorId !== eu.uid && !postOculto(p)).slice(0, 120);
  const autores = [...new Set(base.map((p) => p.autorId))];
  const perfis = new Map(await Promise.all(autores.map((u) => obterPerfil(u).then((x) => [u, x || {}]).catch(() => [u, {}]))));
  const locais = await comDistancia(autores.map((u) => ({ uid: u, cidade: perfis.get(u)?.cidade, uf: perfis.get(u)?.uf, cidadeIbge: perfis.get(u)?.cidadeIbge })), pos);
  const km = new Map(locais.map((x) => [x.uid, x._km]));
  // Com local na publicação vale o lugar dela (até 30 km); sem, a cidade de quem publicou (até 50 km).
  const perto = base.filter((p) => (p.local && Number.isFinite(p.local.lat) ? distanciaKm(pos, p.local) <= 30 : km.get(p.autorId) <= 50)).sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm)).slice(0, 9);
  sec.hidden = perto.length < 3;
  if (sec.hidden) return;
  const onde = await rotuloPosicao(pos);
  $("subPostsPerto").textContent = `De quem mora ${onde ? `em ${onde} e arredores` : "perto de você"}`;
  $("gradePostsPerto").replaceChildren(...perto.map((p) => tilePost(p, resumosPosts.get(p.id), false)));
}
function pintarDestaques() {
  const agora = Date.now();
  const nota = (p) => {
    const r = resumosPosts.get(p.id) || { total: 0, soma: 0 };
    const horas = Math.max(0, (agora - (ms(p.criadoEm) || agora)) / HORA);
    return (1 + r.total + Math.max(0, r.soma - 3 * r.total) * 0.4) * (1 + afinidade(p)) * pesoRegiao(p, regiaoEu()) / Math.pow(horas + 6, 0.8);
  };
  const base = postsDestaque.filter((p) => p.autorId !== eu.uid && (tipoPost(p) !== "textos" || String(p.texto || p.enquete?.pergunta || "").trim().length >= 8));
  const conta = Object.fromEntries(FILTROS_DEST.map(([id]) => [id, id === "tudo" ? base.length : base.filter((p) => tipoPost(p) === id).length]));
  const lista = base.filter((p) => filtroDest === "tudo" || tipoPost(p) === filtroDest).sort((a, b) => nota(b) - nota(a));
  $("secDestaques").hidden = base.length < 3;
  $("filtrosDestaque").replaceChildren(...FILTROS_DEST.filter(([id]) => id === "tudo" || conta[id]).map(([id, nome]) => {
    const b = el("button", null, nome); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(filtroDest === id));
    b.addEventListener("click", () => { filtroDest = id; mostrarDest = 12; gravarLocal("hf-explorar-filtro", id); pintarDestaques(); });
    return b;
  }));
  $("exploraGrade").replaceChildren(...(lista.length ? lista.slice(0, mostrarDest).map((p, i) => tilePost(p, resumosPosts.get(p.id), i % 12 === 0)) : [el("div", "lista-vazia", "Nada por aqui ainda.")]));
  $("maisDestaques").hidden = lista.length <= mostrarDest;
}
function tilePost(p, r, grande) {
  const tipo = tipoPost(p);
  const a = el("a", "exp-tile" + (grande ? " grande" : "") + (tipo === "textos" ? " texto" : "")); a.href = linkPost(p);
  // Toque: abre a publicação na tela do Explorar (como no Instagram), com as parecidas embaixo.
  a.addEventListener("click", (e) => {
    if (!cartaoPost || e.ctrlKey || e.metaKey || e.shiftKey) return; e.preventDefault();
    // Vídeo abre nos Reels (tela cheia, deslizando para os próximos), como no Instagram.
    if (tipo === "videos") { import("./reels.js?v=60").then((m) => m.abrirReels({ lista: postsDestaque, oculto: postOculto, comecarEm: p.id })).catch(() => abrirVisor(p)); return; }
    abrirVisor(p);
  });
  a.setAttribute("aria-label", `Publicação de ${p.nome || "alguém"}`);
  if (tipo === "fotos") {
    const im = document.createElement("img"); im.src = fotosDoPost(p)[0]; im.alt = ""; im.loading = "lazy"; im.decoding = "async";
    a.appendChild(im);
    if (fotosDoPost(p).length > 1) a.appendChild(icone("fotos", "i xs marca"));
  } else if (tipo === "videos") {
    const v = document.createElement("video"); v.src = urlSegura(p.mediaUrl); v.muted = true; v.playsInline = true; v.preload = "metadata"; v.setAttribute("aria-hidden", "true");
    a.append(v, icone("play", "i xs marca"));
  } else {
    let h = 0; for (const c of String(p.id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    a.dataset.tom = String(h % 5);
    if (p.estilo === "casada" && urlSegura(p.mediaUrl)) { const im = document.createElement("img"); im.className = "exp-casada"; im.src = urlSegura(p.mediaUrl); im.alt = ""; im.loading = "lazy"; a.classList.add("casada-tile"); a.appendChild(im); }
    if (p.enquete?.pergunta) a.appendChild(icone("enquete", "i xs marca"));
    a.append(el("p", null, String(p.enquete?.pergunta || p.texto || "").slice(0, 160)), el("span", "exp-autor", p.nome || ""));
  }
  if (r?.total) { const nt = el("span", "exp-nota"); nt.append(icone("estrela", "i"), document.createTextNode((r.soma / r.total).toFixed(1).replace(".", ","))); a.appendChild(nt); }
  if (grande && tipo !== "textos") a.appendChild(el("span", "exp-quem", p.nome || ""));
  return a;
}

// ---------- ligações ----------
$("buscaPessoas").addEventListener("input", () => { clearTimeout(tempoBusca); pintarRecentes(); tempoBusca = setTimeout(buscar, 300); });
$("buscaPessoas").addEventListener("focus", pintarRecentes);
$("buscaPessoas").addEventListener("blur", () => setTimeout(pintarRecentes, 150));
$("buscaPessoas").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); guardarBusca($("buscaPessoas").value); clearTimeout(tempoBusca); buscar(); $("buscaPessoas").blur(); } });
// Abrir um resultado guarda a busca.
$("listaPessoas").addEventListener("click", (e) => { if ($("buscaPessoas").value.trim() && e.target.closest("a, .linha")) guardarBusca($("buscaPessoas").value); }, true);
$("maisDestaques").addEventListener("click", () => { mostrarDest += 12; pintarDestaques(); });

// ---------- tela da publicação (como o Explorar do Instagram) ----------
// A publicação tocada em cima e, rolando, as parecidas: mesmas hashtags, mesmo tipo (foto, vídeo, texto,
// enquete), mesmo autor, o seu gosto e o engajamento. Acabaram as 120 recentes: busca as mais antigas, 30 por vez.
// O cartão é o mesmo do Diário (feed.js passa com definirCartao).
let cartaoPost = null;
export function definirCartao(fn) { cartaoPost = fn; }
const POR_VEZ_VISOR = 6;
let visor = null;

async function maisAntigas() {
  if (acabouAntigas || !ultimoDoc) return [];
  const s = await fb.getDocs(fb.query(fb.collection(fb.db, "diario"), fb.orderBy("criadoEm", "desc"), fb.startAfter(ultimoDoc), fb.limit(30))).catch(() => null);
  if (!s) return [];
  if (s.size < 30) acabouAntigas = true;
  ultimoDoc = s.docs.at(-1) || ultimoDoc;
  const novas = s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })).filter((p) => !escondido(p.autorId) && !postOculto(p));
  const r = await lerResumosEstrelas(novas.map((p) => p.id)).catch(() => new Map());
  r.forEach((v, k) => resumosPosts.set(k, v));
  return novas;
}
function parecida(origem) {
  const tags = new Set((origem.tags || []).map((t) => String(t).toLowerCase()));
  const tipo = tipoPost(origem), agora = Date.now();
  return (p) => {
    let s = 0;
    (p.tags || []).forEach((t) => { if (tags.has(String(t).toLowerCase())) s += 3; });
    if (tipoPost(p) === tipo) s += 1.2;
    if (!!p.enquete === !!origem.enquete && p.enquete) s += 1;
    if (p.autorId === origem.autorId) s += 1.5;
    s += afinidade(p) * 1.5;
    const r = resumosPosts.get(p.id);
    if (r?.total) s += Math.log1p(r.total) * 0.8 + Math.max(0, r.soma / r.total - 3) * 0.4;
    s += 2 / (1 + Math.max(0, agora - ms(p.criadoEm)) / DIA);
    if (jaVisto(p.id)) s *= 0.5;
    return s * (0.9 + Math.random() * 0.2);
  };
}
function fecharVisor({ doHistorico = false } = {}) {
  if (!visor) return;
  const v = visor; visor = null;
  // Aberta por um link vindo de outra página do site (Mensagens, notificações, Flash de outra página): voltar leva de
  // volta para lá, num toque só (como no Instagram), em vez de parar no Diário.
  const voltarOrigem = v.daOrigem;
  v.io?.disconnect();
  v.el.querySelectorAll("video").forEach((x) => x.pause());
  v.el.classList.add("saindo");
  setTimeout(() => v.el.remove(), 180);
  if (!pilha.length && !document.querySelector(".story-visor")) document.body.classList.remove("travado");
  definirOrigem(v.origemAntes);
  // Aberta por cima do Flash: o flash continua de onde parou.
  setTimeout(() => v.aoFechar?.(), 0);
  if (!doHistorico && history.state?.hfVisorExp) { if (voltarOrigem) history.go(-2); else history.back(); return; }
  if (doHistorico && voltarOrigem) history.back();
}
addEventListener("popstate", () => { if (visor && !history.state?.hfVisorExp) fecharVisor({ doHistorico: true }); });

// opc.link: aberta por um link (Flash, Mensagens, notificações): o topo diz "Publicação" e as outras vêm em "Mais para você".
async function abrirVisor(origem, opc = {}) {
  if (visor) fecharVisor({ doHistorico: true });
  const caixa = el("div", "visor-exp" + (opc.sobreFlash ? " sobre-flash" : ""));
  caixa.setAttribute("role", "dialog"); caixa.setAttribute("aria-label", opc.link ? "Publicação" : "Publicações do Explorar");
  const topo = el("div", "ve-topo");
  const voltar = el("button", "icone-btn"); voltar.type = "button"; voltar.setAttribute("aria-label", opc.link ? "Voltar" : "Voltar ao Explorar"); voltar.appendChild(icone("voltar", "i"));
  const tit = el("div", "ve-tit");
  if (opc.link) {
    const sub = el("small", null, origem.nome || "");
    tit.append(el("strong", null, "Publicação"), sub);
    obterPerfil(origem.autorId).then((pp) => { if (pp.nome) sub.textContent = pp.nome + (pp.nickname ? " · @" + pp.nickname : ""); }).catch(() => {});
  } else tit.append(el("strong", null, "Explorar"), el("small", null, (origem.tags || []).length ? `#${origem.tags[0]} e parecidas` : "Publicações para você"));
  topo.append(voltar, tit);
  const lista = el("div", "ve-lista");
  const fim = el("div", "ve-fim");
  const mais = el("button", "btn sec", "Ver mais"); mais.type = "button";
  fim.appendChild(mais);
  const rolagem = el("div", "ve-rolagem");
  rolagem.append(lista, fim);
  caixa.append(topo, rolagem);
  document.body.appendChild(caixa);
  document.body.classList.add("travado");
  history.pushState({ ...(history.state || {}), hfVisorExp: true, hfBase: false, hfGuarda: false }, "", location.href);
  const v = visor = { el: caixa, daOrigem: !!opc.daOrigem, aoFechar: opc.aoFechar, usados: new Set([origem.id]), ultimoAutor: origem.autorId, carregando: false, acabou: false, origemAntes: origemAtual, nota: parecida(origem) };
  // Vistas dali: "link" quando veio de um link (as regras aceitam), senão "principais".
  definirOrigem(opc.link ? "link" : "principais");
  voltar.addEventListener("click", () => fecharVisor());
  lista.appendChild(cartaoPost(origem));
  if (opc.link) lista.appendChild(el("h2", "ve-mais-tit", "Mais para você"));

  const pool = (await postsRecentes()).slice();
  async function adicionar() {
    if (v.carregando || v.acabou || visor !== v) return;
    v.carregando = true; mais.disabled = true; mais.textContent = "Carregando...";
    try {
      let candidatas = pool.filter((p) => !v.usados.has(p.id) && p.autorId !== eu.uid);
      if (candidatas.length < POR_VEZ_VISOR && !acabouAntigas) {
        const velhas = await maisAntigas();
        const ids = new Set(pool.map((p) => p.id));
        velhas.forEach((p) => { if (!ids.has(p.id)) pool.push(p); });
        candidatas = pool.filter((p) => !v.usados.has(p.id) && p.autorId !== eu.uid);
      }
      if (visor !== v) return;
      const notas = new Map(candidatas.map((p) => [p.id, v.nota(p)]));
      candidatas.sort((a, b) => notas.get(b.id) - notas.get(a.id));
      for (let n = 0; n < POR_VEZ_VISOR && candidatas.length; n++) {
        // Nunca duas seguidas do mesmo autor (se houver outra entre as 4 melhores).
        let k = candidatas.findIndex((p, i) => i < 4 && p.autorId !== v.ultimoAutor);
        if (k < 0) k = 0;
        const p = candidatas.splice(k, 1)[0];
        v.usados.add(p.id); v.ultimoAutor = p.autorId;
        lista.appendChild(cartaoPost(p));
      }
      if (!candidatas.length && acabouAntigas) {
        v.acabou = true;
        const b = el("button", "btn sec", opc.link ? "Voltar" : "Voltar ao Explorar"); b.type = "button"; b.addEventListener("click", () => fecharVisor());
        fim.replaceChildren(el("p", "ve-acabou", "Você viu tudo por aqui. Volte mais tarde para ver novidades."), b);
      }
    } finally { v.carregando = false; mais.disabled = false; mais.textContent = "Ver mais"; }
  }
  mais.addEventListener("click", adicionar);
  await adicionar();
  // Chegando perto do fim, carrega mais sozinho.
  if ("IntersectionObserver" in window) {
    v.io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) adicionar(); }, { root: rolagem, rootMargin: "0px 0px 900px 0px" });
    v.io.observe(fim);
  }
}

// Abrir uma publicação pelo id (feed.html?post=ID, "Ver publicação" do Flash, cartão do Mensagens, notificações).
// sobreFlash/aoFechar: aberta pelo "Ver publicação" do Flash, por cima do visor (voltar retorna ao flash).
export async function abrirPublicacao(id, { daOrigem = false, sobreFlash = false, aoFechar = null } = {}) {
  if (!cartaoPost || !/^[A-Za-z0-9_-]{1,64}$/.test(String(id || ""))) return false;
  try {
    const s = await fb.getDoc(fb.doc(fb.db, "diario", id));
    if (!s.exists()) { toast("Essa publicação não existe mais."); aoFechar?.(); return false; }
    const post = { id: s.id, ...s.data({ serverTimestamps: "estimate" }) };
    const oculta = (post.ocultoAte?.toMillis?.() ?? 0) > Date.now() || (post.agendadoPara?.toMillis?.() ?? 0) > Date.now();
    if (escondido(post.autorId) || (oculta && post.autorId !== eu.uid)) { toast("Essa publicação não está disponível."); aoFechar?.(); return false; }
    await abrirVisor(post, { link: true, daOrigem, sobreFlash, aoFechar });
    return true;
  } catch (e) { console.warn(e); toast("Não foi possível abrir a publicação."); return false; }
}
