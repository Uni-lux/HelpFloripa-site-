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
  obterPerfil, linhaPessoa, botaoSeguir, fotosDoPost, lerResumosEstrelas, minhaRede, jaVisto, definirOrigem, origemAtual, pilha
} from "./rede.js?v=52";
import { afinidade } from "./gosto.js?v=1";
import { buscarNoServidor } from "./busca.js?v=1";
import { postsDoEstado, pesoRegiao } from "./regiao.js?v=1";
import { buscarPessoas, pessoasRecentes, semAcento } from "./pessoas.js?v=3";
import { docsComValidade } from "./leituras.js?v=1";
import { lerResumos, media } from "./avaliacoes.js?v=14";
import { CATEGORIAS, CORES_TIPO, NOMES_TIPO, PAGINA_TIPO, nomeCategoria, nomeCat, categoriasDe } from "./vitrine.js?v=52";
import { fimDaEnquete, faltaTexto } from "./enquetes.js?v=3";
import { minhaPosicao, comDistancia, textoDistancia, pedirLocalizacao, rotuloPosicao, distanciaKm } from "./perto.js?v=1";

const DIARIO_VALIDADE = 3 * 60000, DIA = 864e5, HORA = 3600e3;
const postOculto = (p) => (p?.ocultoAte?.toMillis?.() ?? 0) > Date.now() || (p?.agendadoPara?.toMillis?.() ?? 0) > Date.now() || silenciado(p?.autorId);
const lerLocal = (k, padrao) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v ?? padrao; } catch { return padrao; } };
const gravarLocal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const NOME_TIPO = (t) => (t === "lojinha" ? "Shopping" : NOMES_TIPO[t] || "Negócio");
const IMG_TIPO = { servicos: "servicos-480.webp", delivery: "lanchonetes-480.webp", lojinha: "shopping-480.webp", imoveis: "imoveis-480.webp", saude: "saude.svg" };
const linkNegocio = (n) => `${PAGINA_TIPO[n.tipo]}?negocio=${encodeURIComponent(n.id)}&de=explorar`;
const linkPost = (p) => `usuarios.html?post=${encodeURIComponent(p.id)}`;

// ---------- dados (lidos uma vez e guardados) ----------
// As mesmas 120 publicações recentes dos Principais (mesma chave no aparelho).
let postsP = null, postsEm = 0, ultimoDoc = null, acabouAntigas = false;
function postsRecentes() {
  if (postsP && Date.now() - postsEm < DIARIO_VALIDADE) return postsP;
  postsEm = Date.now();
  const q = fb.query(fb.collection(fb.db, "diario"), fb.orderBy("criadoEm", "desc"), fb.limit(120));
  // Junto com as recentes do país, as recentes do seu estado (regiao.js), sem repetir.
  return (postsP = Promise.all([docsComValidade(fb, "diario-principais", q, DIARIO_VALIDADE), postsDoEstado(fb, dados.uf)])
    .then(([s, doEstado]) => { const ja = new Set(s.docs.map((d) => d.id)); return { docs: s.docs, mais: doEstado.filter((p) => !ja.has(p.id)), size: s.size }; })
    .then((s) => (ultimoDoc = s.docs.at(-1) || null, s.size < 120 && (acabouAntigas = true), [...s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })), ...s.mais]).filter((p) => !escondido(p.autorId) && !postOculto(p)))
    .catch((e) => { postsP = null; console.warn("Explorar:", e); return []; }));
}
// Negócios atualizados por último (os mesmos da página inicial, guardados por 10 min).
let negociosP = null;
function negociosRecentes() {
  return (negociosP ||= (async () => {
    const col = fb.collection(fb.db, "negocios");
    const s = await docsComValidade(fb, "explorar-negocios", fb.query(col, fb.orderBy("atualizadoEm", "desc"), fb.limit(200)), 10 * 60000)
      .catch(() => fb.getDocs(fb.query(col, fb.limit(200))));
    return prepararNegocios(s.docs.map((d) => ({ id: d.id, ...d.data() })));
  })().catch((e) => { negociosP = null; console.warn("Explorar (negócios):", e); return []; }));
}
const prepararNegocios = (lista) => lista
  .filter((n) => n.nome && NOMES_TIPO[n.tipo] && (n.ocultoAte?.toMillis?.() ?? 0) <= Date.now() && !escondido(n.donoId))
  .map((n) => ({ ...n, _txt: semAcento([n.nome, nomeCategoria(n), ...categoriasDe(n).map((c) => nomeCat(n, c)), n.bairro, nomeCidade(n.cidade), n.descricao].filter(Boolean).join(" ")) }));
// Busca nacional (busca.js): negócios do Brasil inteiro com a palavra digitada + publicações com a #palavra.
async function negociosDoServidor(termo) { return prepararNegocios(await buscarNoServidor(fb, "negocios", termo)); }
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
const ABAS_BUSCA = [["tudo", "Tudo"], ["pessoas", "Pessoas"], ["negocios", "Negócios"], ["tags", "Hashtags"], ["posts", "Publicações"]];
let abaBusca = "tudo", tempoBusca = null, ultimoTermo = "";
let achados = { pessoas: [], negocios: [], tags: [], posts: [] };

async function buscar() {
  const termo = $("buscaPessoas").value.trim();
  pintarRecentes();
  $("exploraConteudo").hidden = !!termo;
  $("abasBusca").hidden = !termo;
  if (!termo) { ultimoTermo = ""; $("titPessoas").textContent = "Ativos recentemente"; return carregarAtivos(); }
  $("titPessoas").textContent = "Resultados";
  if (termo !== ultimoTermo) abaBusca = termo.startsWith("#") ? "tags" : "tudo";
  ultimoTermo = termo;
  const corpo = $("listaPessoas");
  if (!corpo.querySelector(".res-sec, .linha")) corpo.replaceChildren(el("div", "lista-vazia", "Buscando..."));
  const limpo = termo.replace(/^[#@]/, "");
  const t = semAcento(limpo);
  const semNeg = termo.startsWith("#") || termo.startsWith("@");
  const [pessoas, negRecentes, negServidor, recentes, comTag] = await Promise.all([
    termo.startsWith("#") ? [] : buscarPessoas(fb, termo, { limite: 30 }),
    semNeg ? [] : negociosRecentes(),
    semNeg || t.length < 3 ? [] : negociosDoServidor(limpo),
    postsRecentes(),
    termo.startsWith("@") || /\s/.test(limpo) ? [] : postsComTag(limpo)
  ]);
  const negocios = juntar(negRecentes, negServidor), posts = juntar(recentes, comTag);
  if ($("buscaPessoas").value.trim() !== termo) return;
  // Hashtags: as das publicações recentes que começam com o que foi digitado (e a exata, contada no servidor).
  const tags = new Map();
  if (!termo.startsWith("@")) posts.forEach((p) => (p.tags || []).forEach((tg) => { if (semAcento(tg).startsWith(t)) tags.set(tg, (tags.get(tg) || 0) + 1); }));
  const exata = /^[\p{L}\p{N}_]{1,30}$/u.test(limpo) && !termo.startsWith("@") ? limpo.toLowerCase() : "";
  if (exata && !tags.has(exata) && termo.startsWith("#")) tags.set(exata, 0);
  achados = {
    pessoas: pessoas.filter((p) => p.uid !== eu.uid && !escondido(p.uid)),
    negocios: t.length < 2 ? [] : negocios.filter((n) => t.split(/\s+/).every((x) => n._txt.includes(x)))
      .sort((a, b) => peso(b) - peso(a)).slice(0, 40),
    tags: [...tags].map(([tag, n]) => ({ tag, n })).sort((a, b) => b.n - a.n || (b.tag === exata) - (a.tag === exata)).slice(0, 20),
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
  const total = achados.pessoas.length + achados.negocios.length + achados.tags.length + achados.posts.length;
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
  secao("tags", "Hashtags", achados.tags, 3);
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
  if (id === "tags") return itens.map((x) => {
    const b = el("a", "linha-tag"); b.href = `feed.html?tag=${encodeURIComponent(x.tag)}`;
    b.append(el("span", "ic-tag", "#"), el("strong", null, "#" + x.tag), el("small", null, x.n ? `${plural(x.n, "publicação", "publicações")}${x.contada ? "" : " recentes"}` : "Ver publicações"));
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

// ---------- "Ativos recentemente" (sem busca) ----------
async function carregarAtivos() {
  const corpo = $("listaPessoas");
  if (!corpo.querySelector(".linha")) corpo.replaceChildren(el("div", "lista-vazia", "Carregando pessoas..."));
  const lista = (await pessoasRecentes(fb, { limite: 40 })).filter((p) => p.uid !== eu.uid && !escondido(p.uid));
  if ($("buscaPessoas").value.trim()) return;
  const ordem = [...lista.filter((p) => !meusSeguindo.has(p.uid)), ...lista.filter((p) => meusSeguindo.has(p.uid))];
  corpo.replaceChildren();
  if (!ordem.length) { corpo.appendChild(el("div", "lista-vazia", "Ninguém por aqui ainda.")); return; }
  ordem.slice(0, 8).forEach((p) => corpo.appendChild(linhaPessoa({
    uid: p.uid, nome: p.nome, foto: p.fotoPerfil,
    sub: [p.nickname ? "@" + p.nickname : "", nomeCidade(p.cidade || p.cidadeNome)].filter(Boolean).join(" · ")
  })));
}

// ---------- início do Explorar ----------
let feitoEm = 0;
export async function abrirExplorar() {
  buscar();
  if (Date.now() - feitoEm < 3 * 60000) return;
  feitoEm = Date.now();
  const lista = await postsRecentes();
  pintarAlta(lista);
  pintarEnquetes(lista);
  lerResumosEstrelas(lista.map((p) => p.id)).then((r) => { resumosPosts = r; postsDestaque = lista; pintarDestaques(); }).catch(() => {});
  pintarNegocios().catch((e) => console.warn("Explorar (negócios):", e));
  pintarPostsPerto(lista).catch((e) => console.warn("Explorar (perto):", e));
  pintarSugestoes().catch((e) => console.warn("Explorar (sugestões):", e));
}

// Em alta: as hashtags mais usadas (peso maior para as mais novas). "Subindo" = metade ou mais do uso nas últimas 24 h.
function pintarAlta(lista) {
  const conta = new Map(), agora = Date.now();
  lista.forEach((p) => (p.tags || []).forEach((t) => {
    const idade = Math.max(0, agora - ms(p.criadoEm));
    const x = conta.get(t) || { t, n: 0, p: 0, hoje: 0 };
    x.n++; x.p += pesoRegiao(p, dados) / (1 + idade / (3 * DIA)); if (idade < DIA) x.hoje++; // a sua região pesa mais
    conta.set(t, x);
  }));
  const top = [...conta.values()].sort((a, b) => b.p - a.p).slice(0, 12);
  $("secAlta").hidden = !top.length;
  $("exploraTags").replaceChildren(...top.map((x, i) => {
    const subindo = x.hoje >= 2 && x.hoje * 2 >= x.n;
    const a = el("a", "exp-tag" + (i < 3 ? " quente" : "") + (subindo ? " subindo" : "")); a.href = `feed.html?tag=${encodeURIComponent(x.t)}`;
    a.append(el("b", null, "#" + x.t), el("small", null, subindo ? `${plural(x.hoje, "publicação", "publicações")} hoje` : plural(x.n, "publicação", "publicações")));
    return a;
  }));
}

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
const posicao = () => (posPronta ||= minhaPosicao(dados).then((p) => (posEu = p)).catch(() => null));
// Botão "Usar minha localização" dentro do título da seção (some quando já tem GPS).
function botaoLocal(alvo, aoMudar) {
  alvo.querySelector(".exp-loc")?.remove();
  if (posEu?.origem === "gps") return;
  const b = el("button", "exp-loc"); b.type = "button"; b.append(icone("local", "i xs"), document.createTextNode("Usar minha localização"));
  b.addEventListener("click", async () => {
    b.disabled = true; b.lastChild.textContent = "Localizando...";
    try { posEu = await pedirLocalizacao(); posPronta = Promise.resolve(posEu); aoMudar(); }
    catch (e) { b.disabled = false; b.lastChild.textContent = "Usar minha localização"; toast(e?.message || "Não deu para pegar a sua localização."); }
  });
  alvo.appendChild(b);
}
// Negócios: os mais perto primeiro (pela distância e pela nota); sem localização, os da sua cidade.
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
  const top = base.sort((a, b) => pesoPerto(b) - pesoPerto(a)).slice(0, 12);
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

// Sugestões: quem é da sua rede (seguido por quem você segue), quem segue você, gente da sua cidade e quem esteve ativo.
const CHAVE_DISPENSADOS = "hf-sug-dispensados";
async function pintarSugestoes() {
  const fora = new Set(lerLocal(CHAVE_DISPENSADOS, []));
  const pode = (u) => u && u !== eu.uid && !meusSeguindo.has(u) && !escondido(u) && !fora.has(u);
  const [recentes, rede, seguidores] = await Promise.all([pessoasRecentes(fb, { limite: 40 }), minhaRede().catch(() => new Map()), meusSeguidores()]);
  const cand = new Map();
  recentes.forEach((p) => { if (pode(p.uid)) cand.set(p.uid, p); });
  // Da rede e quem segue você, mesmo sem ter entrado agora (até 10 perfis a mais).
  const extras = [...new Set([...seguidores, ...rede.keys()])].filter((u) => pode(u) && !cand.has(u)).slice(0, 10);
  (await Promise.all(extras.map((u) => obterPerfil(u).then((p) => ({ uid: u, ...p })).catch(() => null)))).forEach((p) => { if (p?.nome) cand.set(p.uid, p); });
  const cid = minhaCidade();
  const pontes = new Map();
  await Promise.all([...cand.keys()].filter((u) => rede.has(u)).map((u) => obterPerfil(rede.get(u)).then((p) => pontes.set(u, String(p.nome || "").split(" ")[0])).catch(() => {})));
  const motivo = (p) => seguidores.has(p.uid) ? ["Segue você", 4] : pontes.get(p.uid) ? [`Seguido por ${pontes.get(p.uid)}`, 3]
    : cid && chaveCidade(p.cidade || p.cidadeNome) === cid ? [`Em ${nomeCid(p.cidade || p.cidadeNome)}`, 1.5] : ["Ativo recentemente", 1];
  const sug = [...cand.values()].map((p) => ({ p, m: motivo(p) })).sort((a, b) => b.m[1] - a.m[1] || ms(b.p.ultimoAcesso) - ms(a.p.ultimoAcesso)).slice(0, 12);
  $("secSugestoes").hidden = !sug.length;
  $("exploraSugestoes").replaceChildren(...sug.map(({ p, m }) => {
    const c = el("div", "exp-pessoa");
    const x = el("button", "sug-tirar"); x.type = "button"; x.setAttribute("aria-label", `Não sugerir ${p.nome || "esta pessoa"}`); x.appendChild(icone("fechar", "i xs"));
    x.addEventListener("click", () => {
      gravarLocal(CHAVE_DISPENSADOS, [p.uid, ...lerLocal(CHAVE_DISPENSADOS, []).filter((u) => u !== p.uid)].slice(0, 200));
      c.classList.add("saindo"); setTimeout(() => { c.remove(); if (!$("exploraSugestoes").children.length) $("secSugestoes").hidden = true; }, 200);
    });
    const av = el("div", "avatar"); pintarAvatar(av, p.fotoPerfil, p.nome);
    const nome = el("strong", null, p.nome || "Usuário");
    const sub = el("small", null, p.nickname ? "@" + p.nickname : "Help Floripa");
    const mot = el("span", "sug-motivo" + (m[1] >= 3 ? " forte" : ""), m[0]);
    const abrir = () => ganchos.abrirPerfil(p.uid);
    av.addEventListener("click", abrir); nome.addEventListener("click", abrir);
    c.append(x, av, nome, sub, mot, botaoSeguir(p.uid, { meSegue: seguidores.has(p.uid) }));
    return c;
  }));
}

// Destaques: mosaico pelo engajamento e pelo seu gosto, com filtros e "Ver mais".
const FILTROS_DEST = [["tudo", "Tudo"], ["fotos", "Fotos"], ["videos", "Vídeos"], ["textos", "Textos"]];
const tipoPost = (p) => (p.mediaTipo === "video" && urlSegura(p.mediaUrl) ? "videos" : fotosDoPost(p).length ? "fotos" : "textos");
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
    return (1 + r.total + Math.max(0, r.soma - 3 * r.total) * 0.4) * (1 + afinidade(p)) * pesoRegiao(p, dados) / Math.pow(horas + 6, 0.8);
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
  a.addEventListener("click", (e) => { if (!cartaoPost || e.ctrlKey || e.metaKey || e.shiftKey) return; e.preventDefault(); abrirVisor(p); });
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
  v.io?.disconnect();
  v.el.querySelectorAll("video").forEach((x) => x.pause());
  v.el.classList.add("saindo");
  setTimeout(() => v.el.remove(), 180);
  if (!pilha.length) document.body.classList.remove("travado");
  definirOrigem(v.origemAntes);
  if (!doHistorico && history.state?.hfVisorExp) history.back();
}
addEventListener("popstate", () => { if (visor && !history.state?.hfVisorExp) fecharVisor({ doHistorico: true }); });

async function abrirVisor(origem) {
  if (visor) fecharVisor({ doHistorico: true });
  const caixa = el("div", "visor-exp");
  caixa.setAttribute("role", "dialog"); caixa.setAttribute("aria-label", "Publicações do Explorar");
  const topo = el("div", "ve-topo");
  const voltar = el("button", "icone-btn"); voltar.type = "button"; voltar.setAttribute("aria-label", "Voltar ao Explorar"); voltar.appendChild(icone("voltar", "i"));
  const tit = el("div", "ve-tit");
  tit.append(el("strong", null, "Explorar"), el("small", null, (origem.tags || []).length ? `#${origem.tags[0]} e parecidas` : "Publicações para você"));
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
  const v = visor = { el: caixa, usados: new Set([origem.id]), ultimoAutor: origem.autorId, carregando: false, acabou: false, origemAntes: origemAtual, nota: parecida(origem) };
  definirOrigem("principais");
  voltar.addEventListener("click", () => fecharVisor());
  lista.appendChild(cartaoPost(origem));

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
        const b = el("button", "btn sec", "Voltar ao Explorar"); b.type = "button"; b.addEventListener("click", () => fecharVisor());
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
