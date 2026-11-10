// =====================================================
// Mural da Comunidade (mural.html, item "Comunidade" da barra de baixo): as publicações das pessoas — doações,
// trocas, pedidos de ajuda, quartos para dividir e achados e perdidos — no jeito de rede social, perto de você.
// Os dados são os mesmos da Comunidade (coleção comunidade, comunidade.html): publicar, ver o anúncio inteiro e
// chamar no chat acontecem lá (comunidade.html?novo=TIPO&volta=mural · ?item=ID). Sem venda e sem cobrança.
// Leituras: cidade → estado → Brasil (por-local.js, mesmo cache da comunidade.html) e os perfis dos autores em lote.
// =====================================================
import { ligarPuxar } from "./puxar-atualizar.js?v=2";
import { maisNovo, marcoOu, haNovidade, pilulaNovidades, conferirDeTempos } from "./novidades.js?v=1";
import { $, el, icone, pintarAvatar, toast, fb, eu, dados, escondido, iniciarRede, montarBarraRede, pintarBarraRede, ouvirAvisos } from "./rede.js?v=135";
import { CAT_COM, comunidadeNoAr } from "./comunidade-cartao.js?v=2";
import { lerPorLocal } from "./por-local.js?v=1";
import { docsComValidade, docsPorIds, buscarDeNovo } from "./leituras.js?v=4";
import { lerLocal, rotuloLocal, escolherLocal, aoMudarLocal, atualizarPeloGps, salvarLocal, marcarManual } from "./local-escolhido.js?v=3";
import { buscarNoServidor, semAcento } from "./busca.js?v=1";
import { minhaPosicao, comDistancia, textoDistancia, pedirLocalizacao, esquecerPosicao, posicaoGuardada } from "./perto.js?v=3";

const ROSA = "#e5487f";
const POR_VEZ = 12;
// O que cada tipo diz na publicação ("Ana está doando") e o botão de ação (os mesmos da comunidade.html).
const TIPOS = {
  doacao: { verbo: "está doando", acao: "Quero receber", chamada: "Doar", dica: "algo que não usa" },
  troca: { verbo: "quer trocar", acao: "Quero trocar", chamada: "Trocar", dica: "uma coisa por outra" },
  pedido: { verbo: "está precisando de", acao: "Posso ajudar", chamada: "Pedir", dica: "ajuda ou um item" },
  quarto: { verbo: "tem um quarto para dividir", acao: "Tenho interesse", chamada: "Quarto", dica: "dividir a moradia" },
  achados: { verbo: "perdeu", acao: "Falar com quem postou", chamada: "Achados", dica: "perdeu ou encontrou" }
};
const ms = (t) => t?.toMillis?.() ?? (t?.seconds ? t.seconds * 1000 : 0);
const fotoOk = (u) => typeof u === "string" && (/^data:image\/(jpeg|png|webp);base64,/.test(u) || /^https:\/\/firebasestorage\.googleapis\.com\//.test(u));
const moeda = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
function haQuanto(t) {
  const m = Math.max(0, Math.floor((Date.now() - ms(t)) / 60000));
  if (m < 1) return "agora"; if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60); if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24); return d === 1 ? "ontem" : d < 30 ? `há ${d} dias` : "há mais de um mês";
}
const verbo = (a) => (a.categoria === "achados" && a.achado?.tipo === "encontrado" ? "encontrou" : TIPOS[a.categoria]?.verbo || "publicou");
function selo(a) {
  if (a.categoria === "doacao") return "De graça";
  if (a.categoria === "quarto") return Number(a.quarto?.rateio) > 0 ? `Divisão ${moeda(a.quarto.rateio)}/mês` : "Dividir contas";
  if (a.categoria === "achados") return a.achado?.tipo === "encontrado" ? "Encontrado" : "Perdido";
  if (a.categoria === "pedido") return "Precisa de ajuda";
  return "Sem dinheiro";
}

let todos = [], perfisAut = new Map(), filtro = "", mostrados = POR_VEZ, posEu = null, maisAntigo = null, maisNoServidor = false;
let termo = "", ordem = "recentes", tBusca = 0;
const link = (k) => `comunidade.html?novo=${k}&volta=mural`;

// ---------- topo: publicar ----------
function pintarTipos() {
  const w = $("muTipos"); w.replaceChildren();
  Object.entries(CAT_COM).forEach(([k, c]) => {
    const a = el("a", "mu-tipo"); a.href = link(k); a.style.setProperty("--cc", c.cor);
    const bola = el("span", "mu-tipo-em", c.emoji);
    a.append(bola, el("b", null, TIPOS[k].chamada), el("small", null, TIPOS[k].dica));
    w.appendChild(a);
  });
}
function pintarLocal() { $("muLocal").querySelector("span").textContent = rotuloLocal(lerLocal()); }

// ---------- números de verdade do que foi carregado ----------
function pintarNumeros() {
  const w = $("muNumeros"), lista = visiveis(false, false);
  const cont = (k) => lista.filter((a) => a.categoria === k).length;
  const pessoas = new Set(lista.map((a) => a.donoId)).size;
  const itens = [[lista.length, lista.length === 1 ? "publicação" : "publicações", "#ffffff"], [cont("doacao"), cont("doacao") === 1 ? "doação" : "doações", CAT_COM.doacao.cor],
    [cont("pedido"), cont("pedido") === 1 ? "pedido de ajuda" : "pedidos de ajuda", CAT_COM.pedido.cor], [pessoas, pessoas === 1 ? "pessoa ajudando" : "pessoas ajudando", "#2fbf71"]].filter(([n], i) => i === 0 || n > 0);
  w.hidden = !lista.length;
  w.replaceChildren(...itens.map(([n, nome, cor]) => { const s = el("span", "mu-num"); s.style.setProperty("--cc", cor); s.append(el("b", null, String(n)), el("small", null, nome)); return s; }));
}

// ---------- filtros ----------
function pintarFiltros() {
  const w = $("muFiltros"), base = visiveis(false);
  const tipos = Object.keys(CAT_COM);
  w.replaceChildren();
  [["", "Tudo", base.length], ...tipos.map((k) => [k, CAT_COM[k].plural, base.filter((a) => a.categoria === k).length])].forEach(([k, nome, n]) => {
    const b = el("button", "mu-chip"); b.type = "button"; b.setAttribute("role", "tab"); b.dataset.k = k;
    b.setAttribute("aria-selected", String(k === filtro));
    if (!n && k !== filtro) b.classList.add("zero");
    if (k) { b.style.setProperty("--cc", CAT_COM[k].cor); b.append(el("span", "mu-chip-em", CAT_COM[k].emoji)); }
    b.append(document.createTextNode(nome), el("small", null, String(n)));
    b.addEventListener("click", () => { filtro = k; mostrados = POR_VEZ; pintarFiltros(); pintarLista(); });
    w.appendChild(b);
  });
}

// ---------- publicações ----------
// O lugar escolhido primeiro (cidade, depois estado), e dentro de cada um, as mais novas.
function doLugar(a) { const l = lerLocal(); if (!l.uf) return 0; if (l.cidadeIbge && Number(a.cidadeIbge) === Number(l.cidadeIbge)) return 2; return a.uf === l.uf ? 1 : 0; }
const kmDe = (a) => (Number.isFinite(a._km) ? a._km : Infinity);
const textoDe = (a) => (a._txt ||= semAcento([a.titulo, a.descricao, a.bairro, a.cidade, CAT_COM[a.categoria]?.nome].filter(Boolean).join(" ")));
function visiveis(comFiltro = true, comBusca = true) {
  const t = comBusca ? semAcento(termo).split(/\s+/).filter(Boolean) : [];
  return todos.filter((a) => comunidadeNoAr(a) && !escondido(a.donoId) && (!comFiltro || !filtro || a.categoria === filtro) && t.every((x) => textoDe(a).includes(x)))
    .sort(ordem === "perto" && posEu ? (a, b) => kmDe(a) - kmDe(b) || ms(b.atualizadoEm) - ms(a.atualizadoEm)
      : (a, b) => doLugar(b) - doLugar(a) || ms(b.atualizadoEm || b.criadoEm) - ms(a.atualizadoEm || a.criadoEm));
}
function cartao(a) {
  const c = CAT_COM[a.categoria] || CAT_COM.doacao, t = TIPOS[a.categoria] || TIPOS.doacao;
  const p = perfisAut.get(a.donoId) || {};
  const nome = p.nome || "Alguém da comunidade";
  const art = el("article", "mu-post"); art.style.setProperty("--cc", c.cor); art.dataset.id = a.id; art.dataset.cat = a.categoria;
  // Cabeçalho: foto, "Ana está doando", onde e quando, etiqueta do tipo.
  const cab = el("header", "mu-cab");
  const av = el("a", "avatar"); av.href = `usuarios.html?perfil=${encodeURIComponent(a.donoId)}`; av.setAttribute("aria-label", "Perfil de " + nome);
  pintarAvatar(av, p.fotoPerfil, nome);
  const quem = el("div", "mu-quem");
  const linha = el("p"); const nm = el("a", "mu-nome", nome); nm.href = av.href;
  linha.append(nm, document.createTextNode(" " + verbo(a)));
  const onde = [a.bairro, a.cidade].filter(Boolean).join(", ");
  const dist = Number.isFinite(a._km) && a._km !== Infinity ? textoDistancia(a._km, a._aprox) : "";
  quem.append(linha, el("small", null, [dist, onde, haQuanto(a.atualizadoEm || a.criadoEm)].filter(Boolean).join(" · ")));
  const tag = el("span", "mu-tag"); tag.append(el("span", null, c.emoji), document.createTextNode(c.nome));
  cab.append(av, quem, tag);
  if (Date.now() - ms(a.criadoEm || a.atualizadoEm) < 24 * 3600e3) art.classList.add("novo");
  art.appendChild(cab);
  // Corpo: título, descrição (3 linhas) e a foto.
  const corpo = el("a", "mu-corpo"); corpo.href = `comunidade.html?item=${encodeURIComponent(a.id)}&de=mural`;
  corpo.appendChild(el("h2", null, a.titulo || c.nome));
  if (a.descricao) corpo.appendChild(el("p", "mu-desc", a.descricao));
  const fotos = (a.fotos || []).filter(fotoOk);
  if (fotos.length) {
    const f = el("div", "mu-foto"); const img = new Image(); img.src = fotos[0]; img.alt = a.titulo || ""; img.loading = "lazy"; img.decoding = "async";
    f.appendChild(img);
    if (fotos.length > 1) f.appendChild(el("span", "mu-foto-n", `+${fotos.length - 1}`));
    f.appendChild(el("span", "mu-selo", selo(a)));
    if (dist) f.appendChild(el("span", "mu-dist", dist));
    corpo.appendChild(f);
  } else {
    const f = el("div", "mu-foto sem"); f.append(el("span", "mu-foto-em", c.emoji), el("span", "mu-selo", selo(a)));
    if (dist) f.appendChild(el("span", "mu-dist", dist));
    corpo.appendChild(f);
  }
  art.appendChild(corpo);
  // Rodapé: situação, compartilhar e a ação do tipo (abre o anúncio, onde dá para chamar no chat).
  const rod = el("footer", "mu-rod");
  const st = el("span", "mu-status" + (a.status === "reservado" ? " reservado" : ""), a.status === "reservado" ? "Reservado" : "Disponível");
  const comp = el("button", "mu-btn"); comp.type = "button"; comp.setAttribute("aria-label", "Compartilhar"); comp.title = "Compartilhar";
  comp.appendChild(icone("compartilhar"));
  comp.addEventListener("click", () => compartilhar(a));
  const ac = el("a", "mu-acao", a.donoId === eu?.uid ? "Ver meu anúncio" : t.acao); ac.href = corpo.href;
  rod.append(st, el("span", "mu-esp"), comp, ac);
  art.appendChild(rod);
  return art;
}
async function compartilhar(a) {
  const url = new URL(`comunidade.html?item=${encodeURIComponent(a.id)}`, location.href).href;
  const texto = `${a.titulo || "Comunidade"} · Comunidade do Help Floripa`;
  try {
    if (navigator.share) await navigator.share({ title: texto, url });
    else { await navigator.clipboard.writeText(url); toast("Link copiado"); }
  } catch {}
}
function vazio() {
  const v = el("div", "mu-vazio");
  const c = filtro ? CAT_COM[filtro] : null, l = lerLocal();
  if (termo) {
    v.append(el("span", "mu-vazio-em", "🔍"), el("strong", null, `Nada com “${termo}” por aqui`), el("p", null, "Tente outra palavra ou publique um pedido: quem tiver pode oferecer."));
    const b = el("button", "mu-acao", "Limpar a busca"); b.type = "button"; b.addEventListener("click", () => { termo = ""; $("muBusca").value = ""; pintarTudo(); });
    const p = el("a", "mu-acao sec", "Pedir isso na Comunidade"); p.href = link("pedido");
    const bts = el("div", "mu-vazio-bts"); bts.append(b, p); v.appendChild(bts); return v;
  }
  v.append(el("span", "mu-vazio-em", c ? c.emoji : "🤝"),
    el("strong", null, c ? `Nenhuma publicação de ${c.plural.toLowerCase()} ${l.uf ? "em " + rotuloLocal(l) : "por aqui"}` : `Ainda não tem publicações ${l.uf ? "em " + rotuloLocal(l) : "por aqui"}`),
    el("p", null, "Seja a primeira pessoa! Quem estiver perto vê a sua publicação e chama você no chat."));
  const atalhos = el("div", "mu-vazio-tipos");
  ["doacao", "pedido", "troca"].forEach((k) => { const a = el("a", "mu-vazio-tipo"); a.href = link(k); a.style.setProperty("--cc", CAT_COM[k].cor); a.append(el("span", null, CAT_COM[k].emoji), el("b", null, TIPOS[k].chamada), el("small", null, TIPOS[k].dica)); atalhos.appendChild(a); });
  v.appendChild(atalhos);
  const bts = el("div", "mu-vazio-bts");
  if (l.uf) { const b = el("button", "mu-acao sec", "Ver em todo o Brasil"); b.type = "button"; b.addEventListener("click", () => { salvarLocal({}); marcarManual(true); trocarLugar(); }); bts.appendChild(b); }
  const conv = el("button", "mu-acao sec", "Convidar alguém"); conv.type = "button";
  conv.addEventListener("click", async () => { const url = new URL("comunidade.html", location.href).href; try { if (navigator.share) await navigator.share({ title: "Comunidade do Help Floripa", text: "Doe, troque e peça ajuda perto de você, de graça:", url }); else { await navigator.clipboard.writeText(url); toast("Link copiado"); } } catch {} });
  bts.appendChild(conv);
  v.appendChild(bts);
  return v;
}
// "Perto de você": as 10 mais perto (com a sua posição), em cartões pequenos que deslizam.
function pintarPerto() {
  const sec = $("muPertoSec");
  const perto = posEu && !termo && !filtro ? visiveis(false).filter((a) => Number.isFinite(a._km) && a._km < 300).sort((a, b) => a._km - b._km).slice(0, 10) : [];
  sec.hidden = perto.length < 3;
  if (sec.hidden) return;
  $("muPertoSub").textContent = "Pela distância até você";
  $("muPerto").replaceChildren(...perto.map((a) => {
    const c = CAT_COM[a.categoria] || CAT_COM.doacao;
    const m = el("a", "mu-mini"); m.href = `comunidade.html?item=${encodeURIComponent(a.id)}&de=mural`; m.style.setProperty("--cc", c.cor);
    const f = el("div", "mu-mini-foto"); const foto = (a.fotos || []).find(fotoOk);
    if (foto) { const im = new Image(); im.src = foto; im.alt = ""; im.loading = "lazy"; f.appendChild(im); } else f.appendChild(el("span", null, c.emoji));
    f.appendChild(el("span", "mu-mini-tag", c.emoji + " " + c.nome));
    m.append(f, el("strong", null, a.titulo || c.nome), el("small", null, textoDistancia(a._km, a._aprox)));
    return m;
  }));
}
function pintarOrdem() {
  const w = $("muOrdem");
  w.hidden = !posEu;
  if (!posEu) { ordem = "recentes"; return; }
  w.replaceChildren(...[["recentes", "Recentes"], ["perto", "Mais perto"]].map(([k, n]) => {
    const b = el("button", null, n); b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(ordem === k));
    b.addEventListener("click", () => { ordem = k; mostrados = POR_VEZ; pintarOrdem(); pintarLista(); });
    return b;
  }));
}
function pintarLista() {
  const lista = visiveis(), w = $("muLista");
  w.replaceChildren(...(lista.length ? lista.slice(0, mostrados).map(cartao) : [vazio()]));
  $("muMais").hidden = !(lista.length > mostrados || (maisNoServidor && !filtro));
}
function pintarTudo() { pintarNumeros(); pintarFiltros(); pintarOrdem(); pintarPerto(); pintarLista(); document.querySelector(".mu-barra").hidden = !visiveis(false, false).length; }

// ---------- leitura ----------
async function carregarPerfis(lista) {
  const ids = [...new Set(lista.map((a) => a.donoId))].filter((id) => id && !perfisAut.has(id));
  if (!ids.length) return;
  const r = await docsPorIds(fb, "perfis_publicos", ids, 30 * 60000).catch(() => new Map());
  ids.forEach((id) => perfisAut.set(id, r.get(id) || {}));
}
async function carregar() {
  const { lista } = await lerPorLocal(fb, docsComValidade, { colecao: "comunidade", loc: lerLocal(), limite: 60, minimo: 30, noAr: comunidadeNoAr, chave: "cm" }).catch(() => ({ lista: [] }));
  todos = lista;
  maisAntigo = todos.reduce((m, a) => { const t = ms(a.atualizadoEm); return t && (!m || t < m) ? t : m; }, 0) || null;
  maisNoServidor = lista.length >= 30;
  await Promise.all([carregarPerfis(todos), posEu ? comDistancia(todos, posEu).catch(() => {}) : null]);
}
async function verMais() {
  const lista = visiveis();
  if (lista.length > mostrados) { mostrados += POR_VEZ; pintarLista(); return; }
  const b = $("muMais"); b.disabled = true; b.textContent = "Carregando...";
  try {
    const q = fb.query(fb.collection(fb.db, "comunidade"), fb.orderBy("atualizadoEm", "desc"), ...(maisAntigo ? [fb.startAfter(fb.Timestamp.fromMillis(maisAntigo))] : []), fb.limit(60));
    const s = await fb.getDocs(q);
    const ja = new Set(todos.map((x) => x.id));
    const novos = s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((a) => !ja.has(a.id));
    await Promise.all([carregarPerfis(novos), posEu ? comDistancia(novos, posEu).catch(() => {}) : null]);
    todos.push(...novos);
    maisAntigo = s.docs.length ? ms(s.docs[s.docs.length - 1].data().atualizadoEm) || maisAntigo : maisAntigo;
    maisNoServidor = s.docs.length === 60;
    mostrados += POR_VEZ;
  } catch (e) { console.warn("Mural:", e.code || e.message); toast("Não deu para carregar mais agora."); }
  b.disabled = false; b.textContent = "Ver mais publicações";
  pintarTudo();
}
async function trocarLugar() {
  pintarLocal();
  posEu = await minhaPosicao(dados).catch(() => null);
  mostrados = POR_VEZ;
  await carregar(); pintarTudo();
}

(async function iniciar() {
  pintarTipos();
  try { await iniciarRede(); }
  catch (e) { $("muLista").replaceChildren(el("div", "mu-vazio", e.message || "Não foi possível carregar")); return; }
  montarBarraRede("comunidade"); pintarBarraRede(); ouvirAvisos();
  pintarAvatar($("muAvatar"), dados.fotoPerfil, dados.nome);
  pintarLocal();
  $("muCompor").addEventListener("click", () => { location.href = link(filtro || "doacao"); });
  $("muMais").addEventListener("click", verMais);
  // Busca: filtra o que já está na tela na hora e, com 3 letras ou mais, procura em todo o Brasil (busca.js).
  $("muBusca").addEventListener("input", () => {
    termo = $("muBusca").value.trim(); mostrados = POR_VEZ; pintarTudo();
    clearTimeout(tBusca);
    if (semAcento(termo).length < 3) return;
    const pedido = termo;
    tBusca = setTimeout(async () => {
      const achados = await buscarNoServidor(fb, "comunidade", pedido).catch(() => []);
      if (pedido !== termo) return;
      const ja = new Set(todos.map((a) => a.id)), novos = achados.filter((a) => !ja.has(a.id));
      if (!novos.length) return;
      await Promise.all([carregarPerfis(novos), posEu ? comDistancia(novos, posEu).catch(() => {}) : null]);
      todos.push(...novos); pintarTudo();
    }, 450);
  });
  $("muLocal").addEventListener("click", async () => {
    const f = await escolherLocal({ perfil: dados, pedirLocalizacao, esquecerPosicao, cores: { accent: ROSA, ink: "#ffffff" } });
    if (f !== null) trocarLugar();
  });
  posEu = await minhaPosicao(dados).catch(() => null);
  await carregar();
  pintarTudo();
  if (new URLSearchParams(location.search).get("publicado")) { toast("Publicado! Quem tiver interesse chama você no chat."); history.replaceState(history.state, "", "mural.html"); }
  aoMudarLocal(() => trocarLugar());
  // Puxar para atualizar (como no Instagram): lê de novo as publicações da Comunidade.
  // Puxar para atualizar esperto: pergunta se saiu algo depois do mais novo da tela (1 leitura); sem novidade (e com menos
  // de 10 min) a lista fica. "Novas publicações ↑" aparece quando chega algo enquanto a pessoa rola (conferido de 2 em 2 min).
  let carregadoEm = Date.now();
  const recarregar = async () => { posEu = await minhaPosicao(dados).catch(() => posEu); await carregar(); carregadoEm = Date.now(); pilula?.esconder(); pintarTudo(); };
  ligarPuxar({ aoAtualizar: async () => {
    if (Date.now() - carregadoEm < 10 * 60000 && !(await haNovidade(fb, fb.db, "comunidade", [], "atualizadoEm", marcoOu(maisNovo(todos, "atualizadoEm"), carregadoEm - 60000)))) return;
    await recarregar();
  } });
  let pilula = null;
  conferirDeTempos(async () => {
    if (pilula?.ligada) return;
    const novas = await haNovidade(fb, fb.db, "comunidade", [], "atualizadoEm", marcoOu(maisNovo(todos, "atualizadoEm"), carregadoEm - 60000), 3);
    const boas = (Array.isArray(novas) ? novas : []).filter((a) => a.donoId !== eu.uid && comunidadeNoAr(a));
    if (!boas.length) return;
    await carregarPerfis(boas).catch(() => {});
    pilula ||= pilulaNovidades({ aoTocar: () => { buscarDeNovo(); return recarregar(); } });
    pilula.mostrar({ texto: "Novas na Comunidade", fotos: boas.map((a) => ({ foto: perfisAut.get(a.donoId)?.fotoPerfil, nome: perfisAut.get(a.donoId)?.nome })) });
  }, 120000);
  atualizarPeloGps({ pedirLocalizacao, posicaoGuardada }).then((novo) => { if (novo) trocarLugar(); });
})();
