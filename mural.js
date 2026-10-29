// =====================================================
// Mural da Comunidade (mural.html, item "Comunidade" da barra de baixo): as publicações das pessoas — doações,
// trocas, pedidos de ajuda, quartos para dividir e achados e perdidos — no jeito de rede social, perto de você.
// Os dados são os mesmos da Comunidade (coleção comunidade, comunidade.html): publicar, ver o anúncio inteiro e
// chamar no chat acontecem lá (comunidade.html?novo=TIPO&volta=mural · ?item=ID). Sem venda e sem cobrança.
// Leituras: cidade → estado → Brasil (por-local.js, mesmo cache da comunidade.html) e os perfis dos autores em lote.
// =====================================================
import { $, el, icone, pintarAvatar, toast, fb, eu, dados, escondido, iniciarRede, montarBarraRede, pintarBarraRede, ouvirAvisos } from "./rede.js?v=82";
import { CAT_COM, comunidadeNoAr } from "./comunidade-cartao.js?v=2";
import { lerPorLocal } from "./por-local.js?v=1";
import { docsComValidade, docsPorIds } from "./leituras.js?v=3";
import { lerLocal, rotuloLocal, escolherLocal, aoMudarLocal, atualizarPeloGps } from "./local-escolhido.js?v=3";
import { minhaPosicao, comDistancia, textoDistancia, pedirLocalizacao, esquecerPosicao, posicaoGuardada } from "./perto.js?v=2";

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
const link = (k) => `comunidade.html?novo=${k}&volta=mural`;

// ---------- topo: publicar ----------
function pintarTipos() {
  const w = $("muTipos"); w.replaceChildren();
  Object.entries(CAT_COM).forEach(([k, c]) => {
    const a = el("a", "mu-tipo"); a.href = link(k); a.style.setProperty("--cc", c.cor);
    a.append(el("span", "mu-tipo-em", c.emoji), el("b", null, TIPOS[k].chamada), el("small", null, TIPOS[k].dica));
    w.appendChild(a);
  });
}
function pintarLocal() { $("muLocal").querySelector("span").textContent = rotuloLocal(lerLocal()); }

// ---------- números de verdade do que foi carregado ----------
function pintarNumeros() {
  const w = $("muNumeros"), lista = visiveis(false);
  const cont = (k) => lista.filter((a) => a.categoria === k).length;
  const itens = [["doacao", "doações"], ["troca", "trocas"], ["pedido", "pedidos"]].map(([k, n]) => [cont(k), n, CAT_COM[k].cor]).filter(([n]) => n > 0);
  w.hidden = !itens.length;
  w.replaceChildren(...itens.map(([n, nome, cor]) => { const s = el("span", "mu-num"); s.style.setProperty("--cc", cor); s.append(el("b", null, String(n)), document.createTextNode(" " + nome)); return s; }),
    el("small", null, lerLocal().uf ? "começando por " + rotuloLocal(lerLocal()) : "em todo o Brasil"));
}

// ---------- filtros ----------
function pintarFiltros() {
  const w = $("muFiltros"), base = visiveis(false);
  const tipos = Object.keys(CAT_COM).filter((k) => base.some((a) => a.categoria === k));
  w.replaceChildren();
  [["", "Tudo", base.length], ...tipos.map((k) => [k, CAT_COM[k].plural, base.filter((a) => a.categoria === k).length])].forEach(([k, nome, n]) => {
    const b = el("button", "mu-chip"); b.type = "button"; b.setAttribute("role", "tab"); b.dataset.k = k;
    b.setAttribute("aria-selected", String(k === filtro));
    if (k) { b.style.setProperty("--cc", CAT_COM[k].cor); b.append(el("span", "mu-chip-em", CAT_COM[k].emoji)); }
    b.append(document.createTextNode(nome), el("small", null, String(n)));
    b.addEventListener("click", () => { filtro = k; mostrados = POR_VEZ; pintarFiltros(); pintarLista(); });
    w.appendChild(b);
  });
}

// ---------- publicações ----------
// O lugar escolhido primeiro (cidade, depois estado), e dentro de cada um, as mais novas.
function doLugar(a) { const l = lerLocal(); if (!l.uf) return 0; if (l.cidadeIbge && Number(a.cidadeIbge) === Number(l.cidadeIbge)) return 2; return a.uf === l.uf ? 1 : 0; }
function visiveis(comFiltro = true) {
  return todos.filter((a) => comunidadeNoAr(a) && !escondido(a.donoId) && (!comFiltro || !filtro || a.categoria === filtro))
    .sort((a, b) => doLugar(b) - doLugar(a) || ms(b.atualizadoEm || b.criadoEm) - ms(a.atualizadoEm || a.criadoEm));
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
    corpo.appendChild(f);
  } else {
    const f = el("div", "mu-foto sem"); f.append(el("span", "mu-foto-em", c.emoji), el("span", "mu-selo", selo(a)));
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
  const c = filtro ? CAT_COM[filtro] : null;
  v.append(el("span", "mu-vazio-em", c ? c.emoji : "🤝"), el("strong", null, c ? `Nenhuma publicação de ${c.plural.toLowerCase()} por aqui` : "Ainda não tem publicações por aqui"),
    el("p", null, "Seja a primeira pessoa: doe, troque ou peça o que precisa. Quem estiver perto chama você no chat."));
  const b = el("a", "mu-acao", "Publicar agora"); b.href = link(filtro || "doacao");
  v.appendChild(b);
  return v;
}
function pintarLista() {
  const lista = visiveis(), w = $("muLista");
  w.replaceChildren(...(lista.length ? lista.slice(0, mostrados).map(cartao) : [vazio()]));
  $("muMais").hidden = !(lista.length > mostrados || (maisNoServidor && !filtro));
}
function pintarTudo() { pintarNumeros(); pintarFiltros(); pintarLista(); }

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
  $("muLocal").addEventListener("click", async () => {
    const f = await escolherLocal({ perfil: dados, pedirLocalizacao, esquecerPosicao, cores: { accent: ROSA, ink: "#ffffff" } });
    if (f !== null) trocarLugar();
  });
  posEu = await minhaPosicao(dados).catch(() => null);
  await carregar();
  pintarTudo();
  if (new URLSearchParams(location.search).get("publicado")) { toast("Publicado! Quem tiver interesse chama você no chat."); history.replaceState(history.state, "", "mural.html"); }
  aoMudarLocal(() => trocarLugar());
  atualizarPeloGps({ pedirLocalizacao, posicaoGuardada }).then((novo) => { if (novo) trocarLugar(); });
})();
