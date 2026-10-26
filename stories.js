// =====================================================
// Flash ⚡ (dura 24 horas) — barra no topo do Diário, criador e visor em tela cheia.
// stories/{id} = { autorId, nome, tipo: imagem|video, midia, texto?, duracao?, criadoEm }
// (a coleção continua "stories": as regras já existem; na tela o nome é Flash)
// - Foto: dentro do documento (até ~900 KB) ou no Storage; vídeo curto só com o Storage ligado.
// - Flash de texto: desenhado num quadro 1080×1920 (fundo e letra escolhidos) e salvo como foto.
// - Somem para todos depois de 24 h (o site filtra; a própria pessoa apaga os vencidos ao abrir).
// - stories/{id}/vistos/{uid}: quem viu (só o autor lista).
// - Responder e reagir vão como mensagem para a conversa com o autor (Mensagens), sem regra nova.
// =====================================================
import {
  $, el, icone, ms, pintarAvatar, toast, erroAmigavel, tempoRelativo, fb, eu, dados, storageFns,
  meusSeguindo, escondido, silenciado, alternarSilenciar, obterPerfil, abrirOpcoes, abrirLista, linhaPessoa,
  salvarImagem, mandarMensagem, ganchos, confirmarHF, nomeCidade, blocoEnquete, refUsuario, podeMarcar, registrarEnquete, blocoCaixa,
  fotosDoPost, urlSegura, lerResumosEstrelas
} from "./rede.js?v=62";
import { FILTROS, semFiltro, aplicarFiltro, imagemFiltrada, FiltroGL } from "./filtros-foto.js?v=3";
import { lerPlano, nivelPlano } from "./planos-base.js?v=4";
import { seletorDuracao, fimEscolhido, linhaChave, MAX_FLASH_MIN, fimDaEnquete, encerrada, faltaTexto, resultadoFinal, lerContasEnquete } from "./enquetes.js?v=5";

const DIA = 24 * 3600e3;
const TEMPO_FOTO = 6000;
const REACOES = ["🔥", "😍", "😂", "😮", "👏", "💯"];
let porAutor = new Map();   // uid -> [flashes em ordem de criação]
let barra = null;
const vistosLocal = new Set((() => { try { return JSON.parse(localStorage.getItem("hf-stories-vistos") || "[]"); } catch { return []; } })());
const guardarVistos = () => { try { localStorage.setItem("hf-stories-vistos", JSON.stringify([...vistosLocal].slice(-600))); } catch {} };
const ativo = (s) => Date.now() - (ms(s.criadoEm) || Date.now()) < DIA;
const comStorage = () => !!(storageFns && window.firebaseStorage);
const erroPublicar = (e) => (e?.code === "permission-denied" ? "O Flash começa a funcionar quando as regras novas forem publicadas." : "Não foi possível publicar: " + erroAmigavel(e));

export async function montarStories(alvo) {
  if (!alvo) return;
  barra = alvo;
  await carregar();
}
async function carregar() {
  const desde = fb.Timestamp.fromMillis(Date.now() - DIA);
  let docs = [];
  try {
    const s = await fb.getDocs(fb.query(fb.collection(fb.db, "stories"), fb.where("criadoEm", ">=", desde), fb.orderBy("criadoEm", "asc"), fb.limit(400)));
    docs = s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }));
  } catch (e) { console.warn("Flash:", e?.code || e?.message); }
  porAutor = new Map();
  docs.filter((x) => ativo(x) && (x.autorId === eu.uid || (x.perfil !== false && meusSeguindo.has(x.autorId) && !escondido(x.autorId) && !silenciado(x.autorId) && podeVer(x))))
    .forEach((x) => { if (!porAutor.has(x.autorId)) porAutor.set(x.autorId, []); porAutor.get(x.autorId).push(x); });
  limparVencidos();
  pintarBarra();
}
// O autor do flash segue quem está vendo? (respostas "só quem eu sigo")
const segueCache = new Map();
function autorMeSegue(autor) {
  if (!segueCache.has(autor)) segueCache.set(autor, fb.getDoc(fb.doc(fb.db, "relacoes", `${autor}_${eu.uid}`)).then((d) => d.exists()).catch(() => false));
  return segueCache.get(autor);
}
// Escolhas do autor: "Amigos próximos" (só a lista vê) e "Ocultar de" (essas pessoas não veem).
const podeVer = (x) => !(Array.isArray(x.ocultoPara) && x.ocultoPara.includes(eu.uid)) && (x.publico !== "amigos" || (Array.isArray(x.lista) && x.lista.includes(eu.uid)));
// A própria pessoa apaga os flashes que já passaram de 24 h.
async function limparVencidos() {
  try {
    const s = await fb.getDocs(fb.query(fb.collection(fb.db, "stories"), fb.where("autorId", "==", eu.uid), fb.limit(50)));
    s.docs.filter((d) => !ativo(d.data({ serverTimestamps: "estimate" }))).forEach((d) => fb.deleteDoc(d.ref).catch(() => {}));
  } catch {}
}
const todosVistos = (uid) => (porAutor.get(uid) || []).every((x) => vistosLocal.has(x.id));
function ordemAutores() {
  const outros = [...porAutor.keys()].filter((u) => u !== eu.uid);
  const ultimo = (u) => ms(porAutor.get(u).at(-1)?.criadoEm);
  return outros.sort((a, b) => (todosVistos(a) - todosVistos(b)) || ultimo(b) - ultimo(a));
}

// ---------- anel ----------
// Um pedaço do anel para cada flash (como o WhatsApp): colorido = novo, cinza = já visto.
const COR_ANEL = [[255, 214, 10], [255, 138, 0], [255, 61, 127], [0, 173, 238]];
function corEm(f) {
  const x = Math.min(0.999, Math.max(0, f)) * (COR_ANEL.length - 1), i = Math.floor(x), t = x - i;
  const a = COR_ANEL[i], b = COR_ANEL[i + 1];
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * t)).join(",")})`;
}
export function fundoAnel(lista) {
  const n = lista.length;
  if (!n) return "";
  const vazio = "color-mix(in srgb, var(--muted) 38%, transparent)";
  const VERDE = "#2fbf71";
  if (n === 1) return vistosLocal.has(lista[0].id) ? vazio : lista[0].publico === "amigos" ? VERDE : `conic-gradient(from 200deg, ${COR_ANEL.map((_, i) => corEm(i / (COR_ANEL.length - 1))).join(", ")}, ${corEm(0)})`;
  const vao = Math.min(8, 60 / n), passo = 360 / n, partes = [];
  lista.forEach((s, k) => {
    const a0 = k * passo + vao / 2, a1 = (k + 1) * passo - vao / 2;
    const novo = !vistosLocal.has(s.id);
    partes.push(`transparent ${k * passo}deg ${a0}deg`);
    partes.push(!novo ? `${vazio} ${a0}deg ${a1}deg` : s.publico === "amigos" ? `${VERDE} ${a0}deg ${a1}deg` : `${corEm(a0 / 360)} ${a0}deg, ${corEm(a1 / 360)} ${a1}deg`);
    partes.push(`transparent ${a1}deg ${(k + 1) * passo}deg`);
  });
  return `conic-gradient(${partes.join(", ")})`;
}

function pintarBarra() {
  if (!barra) return;
  barra.replaceChildren();
  const meus = porAutor.get(eu.uid) || [];
  barra.appendChild(circulo({ uid: eu.uid, nome: "Seu flash", foto: dados.fotoPerfil, nomeReal: dados.nome, meu: true, lista: meus }));
  ordemAutores().forEach((u) => {
    const c = circulo({ uid: u, nome: "...", lista: porAutor.get(u) });
    obterPerfil(u).then((p) => { c.querySelector(".nome").textContent = String(p.nome || "Usuário").split(" ")[0]; c.setAttribute("aria-label", `Flash de ${p.nome || "Usuário"}${todosVistos(u) ? "" : " (novo)"}`); pintarAvatar(c.querySelector(".avatar"), p.fotoPerfil, p.nome); }).catch(() => {});
    barra.appendChild(c);
  });
  barra.hidden = false;
}
function circulo({ uid, nome, foto, nomeReal, meu = false, lista = [] }) {
  const tem = lista.length, visto = !tem || todosVistos(uid);
  const b = el("button", "story-circ" + (tem && !visto ? " novo" : "") + (tem ? " tem" : "") + (meu ? " meu" : "")); b.type = "button";
  b.setAttribute("aria-label", meu ? (tem ? "Seu flash" : "Criar um flash") : `Flash de ${nome}`);
  const anel = el("span", "anel"); if (tem) anel.style.background = fundoAnel(lista);
  const av = el("span", "avatar"); pintarAvatar(av, foto, nomeReal || nome); anel.appendChild(av);
  if (meu) { const mais = el("span", "mais"); mais.appendChild(icone("mais", "i xs")); anel.appendChild(mais); }
  if (tem && !visto && !meu) { const r = el("span", "raio"); r.appendChild(icone("raio", "i xs")); anel.appendChild(r); }
  b.append(anel, el("span", "nome", nome));
  // Seu flash: tocar na foto abre os seus flashes; tocar no "+" (ou sem flash nenhum) abre o criador.
  b.addEventListener("click", (e) => {
    if (meu && (!tem || e.target.closest(".mais"))) { abrirCriador(); return; }
    if (meu) { abrirVisor(eu.uid); return; }
    abrirVisor(uid);
  });
  return b;
}

// Mensagem com o cartão do flash (o Mensagens mostra a miniatura enquanto o flash existe, 24 h):
// acao = resposta | reacao | mencao | enviar | repost. O cartão guarda só o id; a foto vem do flash.
function msgFlash(s, acao, extra = {}) {
  return { tipoArquivo: "cartao", cartao: { tipo: "flash", acao, flashId: s.id, autorId: s.autorId, nome: String(s.nome || "").slice(0, 80), ...extra } };
}
const PAGINA_NEGOCIO = { servicos: "servicos.html", delivery: "delivery.html", lojinha: "shopping.html", imoveis: "imoveis.html", saude: "saude.html" };
const ICONE_NEGOCIO = { servicos: "servicos", delivery: "delivery", lojinha: "lojinha", imoveis: "imoveis", saude: "saude" };
const linkNegocio = (l) => `${PAGINA_NEGOCIO[l.tipo] || "servicos.html"}?negocio=${encodeURIComponent(l.negocioId)}&de=flash`;

// Abrir um flash pelo link (feed.html?flash=ID), vindo de uma mensagem.
export async function abrirFlashPorId(id) {
  try {
    const d = await fb.getDoc(fb.doc(fb.db, "stories", id));
    if (!d.exists() || !ativo(d.data({ serverTimestamps: "estimate" }))) { toast("Esse flash não está mais disponível (passou de 24 horas)."); return; }
    const x = { id: d.id, ...d.data({ serverTimestamps: "estimate" }) };
    if (x.autorId !== eu.uid && (escondido(x.autorId) || !podeVer(x))) { toast("Esse flash não está disponível."); return; }
    const s = await fb.getDocs(fb.query(fb.collection(fb.db, "stories"), fb.where("autorId", "==", x.autorId), fb.limit(30))).catch(() => null);
    const lista = (s?.docs || [d]).map((k) => ({ id: k.id, ...k.data({ serverTimestamps: "estimate" }) })).filter((k) => ativo(k) && (k.autorId === eu.uid || podeVer(k))).sort((a, b) => ms(a.criadoEm) - ms(b.criadoEm));
    porAutor.set(x.autorId, lista.length ? lista : [x]);
    abrirVisor(x.autorId, { so: true, comecarEm: id });
  } catch (e) { toast("Não foi possível abrir o flash: " + erroAmigavel(e)); }
}
// Repostar um flash em que você foi mencionado (abre o criador com a foto dele).
export async function repostarFlash(id) {
  try {
    const d = await fb.getDoc(fb.doc(fb.db, "stories", id));
    if (!d.exists() || !ativo(d.data({ serverTimestamps: "estimate" }))) { toast("Esse flash já saiu do ar (passou de 24 horas)."); return; }
    const x = { id: d.id, ...d.data({ serverTimestamps: "estimate" }) };
    if (!(Array.isArray(x.mencoes) && x.mencoes.includes(eu.uid))) { toast("Só quem foi mencionado no flash pode repostar."); return; }
    if (x.tipo === "video") { toast("Repostar vídeo precisa do armazenamento de arquivos ligado."); return; }
    abrirCriador({ repost: x });
  } catch (e) { toast("Não foi possível repostar: " + erroAmigavel(e)); }
}

// ---------- publicação do Diário no flash (como "Adicionar ao story" do Instagram) ----------
// Monta a imagem 1080×1920 com o cartão da publicação (autor, foto ou texto, legenda e a ENQUETE, se tiver) e abre o
// criador com ela; o flash grava postDe {postId, autorId, nome}: o crédito e o link para a publicação (onde se vota).
// O autor pode desligar em Configurações → Diário e Flash (pref_publicas.permiteFlash = false).
// Cada imagem tem até 4 s para chegar (sem ela o cartão sai do mesmo jeito): antes, uma foto lenta deixava o
// "Preparando..." parado.
function carregarImg(url, limite = 4000) {
  return new Promise((ok, erro) => {
    const i = new Image(); i.crossOrigin = "anonymous"; i.decoding = "async";
    const t = setTimeout(() => { i.src = ""; erro(new Error("demorou")); }, limite);
    i.onload = () => { clearTimeout(t); ok(i); }; i.onerror = () => { clearTimeout(t); erro(new Error("imagem")); };
    i.src = url;
  });
}
function linhasDe(ctx, texto, larg, max) {
  const palavras = String(texto || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const linhas = []; let atual = "";
  for (const p of palavras) {
    const t = atual ? atual + " " + p : p;
    if (ctx.measureText(t).width > larg && atual) { linhas.push(atual); atual = p; if (linhas.length === max) break; } else atual = t;
  }
  if (linhas.length < max && atual) linhas.push(atual);
  if (linhas.length === max && palavras.join(" ").length > linhas.join(" ").length) linhas[max - 1] = linhas[max - 1].replace(/\s*\S*$/, "") + "…";
  return linhas;
}
// Resultado que pode aparecer no cartão: o final (enquete encerrada) ou o parcial quando quem compartilha é o autor
// (ele já vê as porcentagens; ao pôr no flash, escolhe mostrá-las). Os outros veem só as opções, como no Diário.
async function resultadoParaCartao(post) {
  const e = post.enquete, alvo = `d_${post.id}`, n = e.opcoes.length;
  const tempo = (p) => Promise.race([p, new Promise((ok) => setTimeout(() => ok(null), 3000))]);
  try {
    if (encerrada(e)) return { contas: await tempo(resultadoFinal(fb, fb.db, alvo, n)), final: true };
    if (post.autorId === eu.uid) return { contas: await tempo(lerContasEnquete(fb, fb.db, alvo, n, { fresco: true })), final: false };
  } catch {}
  return { contas: null, final: false };
}
const FONTE = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
const AZUL = "#00adee", AZUL_ESC = "#0089bd", TINTA = "#0f1b22", CINZA = "#51636d", CINZA2 = "#6b7c86";
const quando = (t) => { const d = new Date(ms(t) || Date.now()); return d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "").replace(" de ", " de "); };
// Ícones desenhados (os mesmos do site): barras da enquete, balão da caixa de perguntas, estrela.
function iconeEnquete(ctx, x, y) { [26, 20, 14].forEach((w, i) => { ctx.beginPath(); ctx.roundRect(x, y + 6 + i * 9, w, 5, 3); ctx.fill(); }); }
function iconeBalao(ctx, x, y) {
  ctx.beginPath(); ctx.roundRect(x, y + 4, 28, 21, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + 7, y + 23); ctx.lineTo(x + 5, y + 31); ctx.lineTo(x + 14, y + 24); ctx.fill();
  ctx.save(); ctx.fillStyle = "#fff"; ctx.font = `900 17px ${FONTE}`; ctx.textAlign = "center"; ctx.fillText("?", x + 14, y + 21); ctx.restore();
}
function estrela(ctx, cx, cy, r, cor) {
  ctx.fillStyle = cor; ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx[i ? "lineTo" : "moveTo"](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill();
}
// Caixa azul-clara com o selo (ENQUETE / CAIXA DE PERGUNTAS), o prazo à direita e a pergunta: cabeçalho comum dos blocos.
function caixaBloco(ctx, x, y, w, h, selo, desenhaIcone, prazo, acabou) {
  ctx.fillStyle = "#eef8fd"; ctx.strokeStyle = "#cdeaf8"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 30); ctx.fill(); ctx.stroke();
  ctx.fillStyle = AZUL; desenhaIcone(ctx, x + 28, y + 28);
  ctx.font = `900 27px ${FONTE}`; ctx.fillText(selo, x + 66, y + 58);
  if (prazo) {
    ctx.font = `800 24px ${FONTE}`; const tw = ctx.measureText(prazo).width;
    ctx.fillStyle = acabou ? "#e6edf1" : "#d3effb"; ctx.beginPath(); ctx.roundRect(x + w - 28 - tw - 32, y + 28, tw + 32, 44, 22); ctx.fill();
    ctx.fillStyle = acabou ? CINZA : AZUL_ESC; ctx.fillText(prazo, x + w - 28 - tw - 16, y + 59);
  }
}
async function imagemDaPublicacao(post) {
  const W = 1080, H = 1920, c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  // Navegador antigo sem roundRect: cantos retos.
  if (!ctx.roundRect) ctx.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };
  const e = post.enquete?.pergunta && Array.isArray(post.enquete.opcoes) && post.enquete.opcoes.length >= 2 ? post.enquete : null;
  const cx = !e && post.caixa?.pergunta ? post.caixa : null;
  const fotos = fotosDoPost(post).filter(Boolean), foto = fotos[0];
  const tempo = (p, ms = 3000) => Promise.race([p, new Promise((ok) => setTimeout(() => ok(null), ms))]);
  // Tudo ao mesmo tempo: foto, rosto de quem publicou, resultado da enquete e as estrelas.
  const [im, av, res, notas] = await Promise.all([
    foto ? carregarImg(foto).catch(() => null) : null,
    urlSegura(post.fotoPerfil) ? carregarImg(post.fotoPerfil, 3000).catch(() => null) : null,
    e ? resultadoParaCartao(post) : null,
    tempo(lerResumosEstrelas([post.id]).then((m) => m.get(post.id)).catch(() => null))
  ]);
  const soTexto = !im && !e && !cx;
  // Fundo: a própria foto desfocada e escurecida (desenhada pequena e esticada: rápido até em celular simples) ou um degradê.
  if (im) {
    const m = document.createElement("canvas"); m.width = 54; m.height = 96;
    const mc = m.getContext("2d"), k0 = Math.max(54 / im.width, 96 / im.height);
    mc.drawImage(im, (54 - im.width * k0) / 2, (96 - im.height * k0) / 2, im.width * k0, im.height * k0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high"; ctx.drawImage(m, 0, 0, W, H);
    ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(0, 0, W, H);
  } else {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#0b3d5c"); g.addColorStop(1, e ? "#0e7490" : cx ? "#7c3aed" : "#6d28d9"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  // ---- medidas: tudo cabe entre y=250 e y=1690 (em cima ficam os botões do flash; embaixo, a legenda e o nome) ----
  const CW = 900, X = (W - CW) / 2, pad = 40, larg = CW - pad * 2, CAB = 136, TOPO = 250, MAXH = 1440;
  const temNotas = notas?.total > 0, NOTAS_H = temNotas ? 64 : 0;
  const mostrar = !!res?.contas;
  const total = mostrar ? res.contas.reduce((a, b) => a + b, 0) : 0;
  // Bloco de baixo: enquete (selo, pergunta, opções, rodapé) ou caixa de perguntas (selo, pergunta, campo, rodapé).
  const bloco = e || cx;
  let blocoH = 0, pergL = [];
  if (bloco) {
    ctx.font = `800 42px ${FONTE}`; pergL = linhasDe(ctx, bloco.pergunta, larg - 56, 2);
    blocoH = 28 + 40 + 16 + pergL.length * 54 + 14 + (e ? e.opcoes.length * 92 : 96) + 46 + 24;
  }
  // Texto: só texto vira cartão de citação (letra grande, que diminui se for longo); com foto é legenda (até 2 linhas);
  // com enquete/caixa e sem foto, até 4 linhas.
  const textoPost = String(post.texto || "").trim() === String(bloco?.pergunta || "").trim() ? "" : String(post.texto || "").trim();
  let tamTexto = im ? 34 : bloco ? 44 : 56, maxL = im ? 2 : bloco ? 4 : 9, txtL = [];
  const pesoTexto = () => (im ? 500 : 700);
  const medir = () => { ctx.font = `${pesoTexto()} ${tamTexto}px ${FONTE}`; txtL = linhasDe(ctx, textoPost, larg - (soTexto ? 40 : 0), maxL); };
  medir();
  // Citação longa: diminui a letra (56 → 40) até caber sem cortar.
  while (soTexto && tamTexto > 40 && txtL.length && txtL[txtL.length - 1].endsWith("…")) { tamTexto -= 4; maxL = Math.min(12, maxL + 1); medir(); }
  const lh = () => Math.round(tamTexto * (soTexto ? 1.3 : 1.36));
  const altTxt = () => (!txtL.length ? 0 : soTexto ? txtL.length * lh() + 150 : txtL.length * lh() + (im ? 22 : 30));
  // Foto: a proporção dela (entre 4:5 e 1,91:1), encolhendo se precisar para o resto caber.
  let mH = 0;
  if (im) {
    const resto = () => MAXH - CAB - altTxt() - (bloco ? blocoH + 24 : 0) - NOTAS_H - pad;
    if (resto() < 340 && txtL.length > 1) { txtL = txtL.slice(0, 1); txtL[0] = txtL[0].replace(/…?$/, "…"); }
    mH = Math.max(260, Math.min(Math.round(Math.min(bloco ? 0.75 : 1.25, Math.max(0.52, im.height / im.width)) * CW), resto()));
  }
  const CH = Math.min(MAXH, CAB + mH + (im && txtL.length ? 22 : 0) + altTxt() + (bloco ? blocoH + 8 : 0) + NOTAS_H + pad - (im ? 0 : 6));
  const Y = Math.round(Math.max(TOPO, TOPO + (MAXH - CH) / 2));

  // ---- cartão ----
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 60; ctx.shadowOffsetY = 18;
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.roundRect(X, Y, CW, CH, 40); ctx.fill(); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.roundRect(X, Y, CW, CH, 40); ctx.clip();
  // Autor: foto, nome e "local ou Diário · data"
  ctx.save(); ctx.beginPath(); ctx.arc(X + pad + 36, Y + 66, 36, 0, Math.PI * 2); ctx.clip();
  if (av) { const k = Math.max(72 / av.width, 72 / av.height); ctx.drawImage(av, X + pad + 36 - av.width * k / 2, Y + 66 - av.height * k / 2, av.width * k, av.height * k); }
  else { ctx.fillStyle = AZUL; ctx.fillRect(X + pad, Y + 30, 72, 72); ctx.fillStyle = "#fff"; ctx.font = `800 32px ${FONTE}`; ctx.textAlign = "center"; ctx.fillText(String(post.nome || "?").trim().charAt(0).toUpperCase(), X + pad + 36, Y + 78); ctx.textAlign = "left"; }
  ctx.restore();
  ctx.fillStyle = TINTA; ctx.font = `800 36px ${FONTE}`;
  ctx.fillText(String(post.nome || "Usuário").slice(0, 28), X + pad + 92, Y + 60);
  ctx.fillStyle = CINZA2; ctx.font = `600 26px ${FONTE}`;
  const sub = `${post.local?.nome ? String(post.local.nome).slice(0, 26) : "Diário"} · ${quando(post.agendadoPara || post.criadoEm)}`;
  ctx.fillText(sub, X + pad + 92, Y + 98);
  // marca discreta à direita
  ctx.fillStyle = AZUL; ctx.font = `900 22px ${FONTE}`; ctx.textAlign = "right"; ctx.fillText("HELP FLORIPA", X + CW - pad, Y + 60); ctx.textAlign = "left";
  let y = Y + CAB;
  // Foto (e "1/N" + bolinhas quando são várias)
  if (im) {
    const k = Math.max(CW / im.width, mH / im.height);
    ctx.save(); ctx.beginPath(); ctx.rect(X, y, CW, mH); ctx.clip(); ctx.drawImage(im, X + (CW - im.width * k) / 2, y + (mH - im.height * k) / 2, im.width * k, im.height * k); ctx.restore();
    if (fotos.length > 1) {
      const t = `1/${fotos.length}`; ctx.font = `800 26px ${FONTE}`; const tw = ctx.measureText(t).width;
      ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.beginPath(); ctx.roundRect(X + CW - 30 - tw - 28, y + 26, tw + 28, 44, 22); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.fillText(t, X + CW - 30 - tw - 14, y + 57);
      const n = Math.min(fotos.length, 6), x0 = X + CW / 2 - (n - 1) * 11;
      for (let i = 0; i < n; i++) { ctx.fillStyle = i ? "rgba(255,255,255,.6)" : "#fff"; ctx.beginPath(); ctx.arc(x0 + i * 22, y + mH - 26, i ? 6 : 7, 0, Math.PI * 2); ctx.fill(); }
    }
    y += mH + 22;
  }
  // Texto / legenda / citação
  if (txtL.length) {
    if (soTexto) {
      // Cartão de citação: fundo azul-claro, aspas grandes e o texto.
      const qh = altTxt() - 40;
      ctx.fillStyle = "#eef8fd"; ctx.beginPath(); ctx.roundRect(X + pad - 6, y, CW - (pad - 6) * 2, qh, 30); ctx.fill();
      ctx.fillStyle = AZUL; ctx.font = `900 120px Georgia, serif`; ctx.fillText("“", X + pad + 18, y + 104);
      ctx.fillStyle = TINTA; ctx.font = `700 ${tamTexto}px ${FONTE}`;
      txtL.forEach((l, i) => ctx.fillText(l, X + pad + 26, y + 96 + tamTexto + i * lh()));
      y += qh + 30;
    } else {
      ctx.fillStyle = TINTA; ctx.font = `${pesoTexto()} ${tamTexto}px ${FONTE}`;
      txtL.forEach((l, i) => ctx.fillText(l, X + pad, y + tamTexto + i * lh()));
      y += txtL.length * lh() + (im ? 22 : 30);
    }
  }
  // Enquete ou caixa de perguntas
  if (bloco) {
    const ex = X + pad - 6, ew = CW - (pad - 6) * 2, ey = y;
    const fimE = e ? fimDaEnquete(e) : 0, acabou = e ? encerrada(e) : false;
    const prazo = e ? (acabou ? "Encerrada" : fimE ? faltaTexto(fimE).replace(/^termina/, "Termina") : "") : (cx.anonima ? "Anônima" : "");
    caixaBloco(ctx, ex, ey, ew, blocoH - 8, e ? "ENQUETE" : "CAIXA DE PERGUNTAS", e ? iconeEnquete : iconeBalao, prazo, acabou || (!!cx && cx.anonima));
    let yy = ey + 28 + 40 + 16;
    ctx.fillStyle = TINTA; ctx.font = `800 42px ${FONTE}`;
    pergL.forEach((l, i) => ctx.fillText(l, ex + 28, yy + 40 + i * 54));
    yy += pergL.length * 54 + 14;
    if (e) {
      const maior = mostrar ? Math.max(...res.contas) : 0;
      e.opcoes.forEach((o, i) => {
        const oy = yy + i * 92, ow = ew - 56, ox = ex + 28;
        const pct = mostrar && total ? Math.round(res.contas[i] / total * 100) : 0;
        const lider = mostrar && total && res.contas[i] === maior;
        ctx.fillStyle = "#ffffff"; ctx.strokeStyle = lider ? AZUL : "#d6e3ea"; ctx.lineWidth = lider ? 4 : 2;
        ctx.beginPath(); ctx.roundRect(ox, oy, ow, 76, 22); ctx.fill(); ctx.stroke();
        if (mostrar && pct) { ctx.save(); ctx.beginPath(); ctx.roundRect(ox, oy, ow, 76, 22); ctx.clip(); ctx.fillStyle = lider ? "rgba(0,173,238,.28)" : "rgba(15,27,34,.08)"; ctx.fillRect(ox, oy, ow * pct / 100, 76); ctx.restore(); }
        let tx = ox + 26;
        if (!mostrar) { ctx.strokeStyle = "#9fb1bb"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ox + 40, oy + 38, 14, 0, Math.PI * 2); ctx.stroke(); tx = ox + 70; }
        const pctTxt = mostrar ? `${pct}%` : "";
        ctx.font = `800 32px ${FONTE}`; const pw = pctTxt ? ctx.measureText(pctTxt).width : 0;
        ctx.fillStyle = TINTA; ctx.font = `${lider ? 800 : 700} 34px ${FONTE}`;
        const rot = linhasDe(ctx, (lider && res?.final ? "🏆 " : "") + o, ow - (tx - ox) - pw - 40, 1)[0] || o;
        ctx.fillText(rot, tx, oy + 50);
        if (pctTxt) { ctx.font = `800 32px ${FONTE}`; ctx.fillStyle = lider ? AZUL_ESC : CINZA; ctx.fillText(pctTxt, ox + ow - 24 - pw, oy + 50); }
      });
      yy += e.opcoes.length * 92;
    } else {
      // campo de resposta (só o desenho: responder é na publicação)
      ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#d6e3ea"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(ex + 28, yy, ew - 56, 80, 24); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#9fb1bb"; ctx.font = `600 32px ${FONTE}`; ctx.fillText("Escreva sua resposta…", ex + 54, yy + 51);
      yy += 96;
    }
    ctx.fillStyle = CINZA; ctx.font = `600 26px ${FONTE}`;
    const votos = `${total.toLocaleString("pt-BR")} ${total === 1 ? "voto" : "votos"}`;
    const rodape = e ? (mostrar ? (res.final ? `Resultado final · ${votos}` : `Parcial · ${votos}`) + (e.anonima ? " · anônima" : "")
      : acabou ? "Enquete encerrada" : `Toque em “Ver publicação” para votar${e.anonima ? " · anônima" : ""}`)
      : "Toque em “Ver publicação” para responder";
    // Rodapé numa linha só: diminui a letra se não couber.
    for (let t = 26; t >= 20; t -= 2) { ctx.font = `600 ${t}px ${FONTE}`; if (ctx.measureText(rodape).width <= ew - 56) break; }
    ctx.fillText(rodape, ex + 28, yy + 34);
    y += blocoH + 8;
  }
  // Estrelas da publicação (só quando já tem notas)
  if (temNotas) {
    const media = notas.soma / notas.total;
    for (let i = 0; i < 5; i++) estrela(ctx, X + pad + 18 + i * 42, y + 26, 17, i < Math.round(media) ? "#f5b301" : "#d6e3ea");
    ctx.fillStyle = TINTA; ctx.font = `800 30px ${FONTE}`;
    const txt = `${media.toFixed(1).replace(".", ",")} · ${notas.total} ${notas.total === 1 ? "nota" : "notas"}`;
    ctx.fillText(txt, X + pad + 230, y + 37);
  }
  ctx.restore();
  return c.toDataURL("image/jpeg", 0.9);
}
export async function compartilharNoFlash(post) {
  if (!post?.id) return;
  if (post.mediaTipo === "video") { toast("Vídeos ainda não vão para o flash. Compartilhe uma publicação com foto ou texto."); return; }
  if (post.autorId !== eu.uid) {
    try { const p = await fb.getDoc(fb.doc(fb.db, "pref_publicas", post.autorId)); if (p.exists() && p.data().permiteFlash === false) { toast(`${String(post.nome || "Quem publicou").split(" ")[0]} não permite compartilhar as publicações no Flash.`); return; } } catch {}
  }
  toast(post.enquete?.pergunta ? "Preparando a enquete para o flash..." : "Preparando a publicação para o flash...");
  let imagem = null;
  try { imagem = await imagemDaPublicacao(post); } catch (e) { console.warn(e); }
  if (!imagem) { toast("Não foi possível preparar a publicação para o flash."); return; }
  abrirCriador({ post: { id: post.id, autorId: post.autorId, nome: post.nome, imagem, enquete: !!post.enquete?.pergunta, caixa: !post.enquete?.pergunta && !!post.caixa?.pergunta } });
}

// Criar um flash de fora do Diário (o "+" na foto do seu perfil). aoPublicar roda depois de publicar.
let depoisDePublicar = null;
export function novoFlash(aoPublicar) { depoisDePublicar = aoPublicar || null; abrirCriador(); }

// Perfil: anel em volta da foto quando a pessoa tem flash ativo (tocar abre).
export async function anelNoPerfil(avatar, uid) {
  if (!avatar || !uid || escondido(uid)) return;
  try {
    const s = await fb.getDocs(fb.query(fb.collection(fb.db, "stories"), fb.where("autorId", "==", uid), fb.limit(30)));
    const lista = s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })).filter((x) => ativo(x) && (uid === eu.uid || (x.perfil !== false && podeVer(x)))).sort((a, b) => ms(a.criadoEm) - ms(b.criadoEm));
    const wrap = avatar.parentElement;
    if (!lista.length) { wrap?.classList.remove("com-flash"); return; }
    if (!avatar.isConnected) return;
    porAutor.set(uid, lista);
    if (avatar._anelFlash) { wrap.classList.add("com-flash"); wrap.style.setProperty("--anel-flash", fundoAnel(lista)); return; }
    avatar._anelFlash = true;
    wrap.classList.add("com-flash");
    wrap.style.setProperty("--anel-flash", fundoAnel(lista));
    avatar.setAttribute("role", "button"); avatar.tabIndex = 0;
    avatar.setAttribute("aria-label", "Ver o flash");
    const abrir = (e) => { e.stopPropagation(); abrirVisor(uid, { so: true, aoFechar: () => wrap.style.setProperty("--anel-flash", fundoAnel(porAutor.get(uid) || lista)) }); };
    avatar.addEventListener("click", abrir);
    avatar.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") abrir(e); });
  } catch {}
}

// =====================================================
// Criar um flash (tela cheia): Texto ou Foto/Vídeo
// =====================================================
const FUNDOS = [
  ["#0f2027", "#2c5364"], ["#ff512f", "#dd2476"], ["#00adee", "#0052d4"], ["#f7971e", "#ffd200"],
  ["#11998e", "#38ef7d"], ["#8e2de2", "#4a00e0"], ["#232526", "#414345"], ["#ee9ca7", "#ffdde1"]
];
const LETRAS = [
  { nome: "Moderna", css: "800 1em system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", sombra: false },
  { nome: "Clássica", css: "italic 700 1em Georgia, 'Times New Roman', serif", sombra: false },
  { nome: "Neon", css: "800 1em system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", sombra: true },
  { nome: "Máquina", css: "700 1em 'Courier New', ui-monospace, monospace", sombra: false }
];
const corTexto = (f) => (f === 3 || f === 7 ? "#1a1a1a" : "#ffffff");

// Cores do texto por cima da foto (como no Instagram) e quem fica com letra escura no destaque.
const CORES = ["#ffffff", "#111111", "#ffd60a", "#ff8a00", "#ff3d7f", "#00adee", "#38ef7d", "#8e2de2"];
const clara = (c) => ["#ffffff", "#ffd60a", "#38ef7d"].includes(c);

// Figurinhas (horário, data e localização): 4 estilos, um toque troca.
const EST_FIG = [
  { fundo: "#ffffff", cor: "#111111" },
  { fundo: "rgba(255,255,255,.28)", cor: "#ffffff", borda: "rgba(255,255,255,.55)" },
  { fundo: "rgba(10,14,18,.72)", cor: "#ffffff" },
  { fundo: ["#ff8a00", "#ff3d7f"], cor: "#ffffff" }
];
const DIAS_SEM = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const MESES_C = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
function textoFigurinha(fig, local = "") {
  const d = new Date();
  if (fig === "hora") return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (fig === "data") return `${DIAS_SEM[d.getDay()]} · ${String(d.getDate()).padStart(2, "0")} ${MESES_C[d.getMonth()]}`;
  return "📍 " + (local || "Minha cidade");
}

function abrirCriador({ repost = null, post = null } = {}) {
  const fundo = el("div", "flash-criar"); fundo.setAttribute("role", "dialog"); fundo.setAttribute("aria-modal", "true"); fundo.setAttribute("aria-label", "Novo flash");
  const caixa = el("div", "flash-caixa");
  const palco = el("div", "flash-palco");
  const midiaBox = el("div", "flash-midia");
  const guias = el("div", "flash-guias"); guias.setAttribute("aria-hidden", "true");
  guias.append(el("span", "fx-faixa cima"), el("span", "fx-faixa baixo"), el("span", "fx-guia v"), el("span", "fx-guia h"));
  const camada = el("div", "flash-camada"); // textos por cima da foto
  const topo = el("div", "flash-topo");
  const bX = el("button", "flash-ferr-btn"); bX.type = "button"; bX.setAttribute("aria-label", "Fechar"); bX.appendChild(icone("fechar", "i s"));
  const ferramentas = el("div", "flash-ferr");
  // Configurações do Flash (engrenagem) ao lado do X; o selo mostra quando vai só para os Amigos próximos.
  const bCfg = el("button", "flash-ferr-btn"); bCfg.type = "button"; bCfg.setAttribute("aria-label", "Configurações do Flash"); bCfg.title = "Configurações"; bCfg.appendChild(icone("config", "i s"));
  const seloAmigos = el("span", "flash-selo-amigos", "Amigos próximos");
  const esq = el("div", "flash-esq"); esq.append(bX, bCfg, seloAmigos);
  topo.append(esq, ferramentas);
  const lixo = el("div", "flash-lixo"); lixo.appendChild(icone("lixo", "i s")); lixo.setAttribute("aria-hidden", "true");
  palco.append(midiaBox, guias, camada, topo, lixo);
  const baixo = el("div", "flash-baixo");
  const modos = el("div", "flash-modos"); modos.setAttribute("role", "tablist");
  const mFoto = el("button"); mFoto.type = "button"; mFoto.setAttribute("role", "tab"); mFoto.append(icone("camera", "i xs"), document.createTextNode(comStorage() ? "Foto ou vídeo" : "Foto"));
  const mTexto = el("button", null, "Aa  Texto"); mTexto.type = "button"; mTexto.setAttribute("role", "tab");
  modos.append(mFoto, mTexto);
  const publicar = el("button", "flash-publicar"); publicar.type = "button";
  const raioPub = el("b"); raioPub.appendChild(icone("raio", "i s"));
  publicar.append(el("span", null, "Compartilhar"), raioPub);
  const linhaBaixo = el("div", "flash-linha"); linhaBaixo.append(modos, publicar);
  const dica = el("small", "flash-dica", "Fica 24 horas para quem segue você · você vê quem viu");
  // "Publicar em": seu perfil e/ou os seus perfis de negócio (um, alguns ou todos). Só aparece se você tem negócio.
  // Fica num botão da barra de cima (e nas figurinhas), para não ocupar o espaço embaixo do cartão.
  const dest = { perfil: true, negocios: new Set() };
  let meusNeg = [];
  const bOnde = el("button", "flash-ferr-btn flash-onde"); bOnde.type = "button"; bOnde.title = "Publicar em"; bOnde.setAttribute("aria-label", "Onde publicar");
  const contaOnde = el("b", "flash-onde-n");
  bOnde.append(icone("loja", "i s"), contaOnde);
  const resumoDestino = () => {
    const nomes = meusNeg.filter((n) => dest.negocios.has(n.id)).map((n) => n.nome);
    const onde = [dest.perfil ? "no seu perfil" : "", ...nomes].filter(Boolean);
    const total = onde.length;
    contaOnde.textContent = String(total); contaOnde.hidden = total < 2 && dest.perfil;
    bOnde.classList.toggle("on", !!dest.negocios.size);
    bOnde.setAttribute("aria-label", `Onde publicar: ${onde.join(", ")}`);
    dica.textContent = !meusNeg.length ? "Fica 24 horas para quem segue você · você vê quem viu"
      : `Fica 24 h ${total > 1 ? "em " + onde.slice(0, -1).join(", ") + " e " + onde.slice(-1) : onde[0] === "no seu perfil" ? "no seu perfil" : "no perfil de " + onde[0]} · toque para mudar`;
    dica.classList.toggle("clicavel", !!meusNeg.length);
  };
  function escolherDestinos() {
    palco.querySelector(".flash-figs")?.remove();
    const pn = el("div", "flash-figs");
    const cab = el("div", "fe-cab"); const ok = el("button", "fe-pronto", "Pronto"); ok.type = "button";
    cab.append(el("strong", "figs-tit", "Publicar em"), el("span", "esp"), ok);
    const lista = el("div", "mencao-lista");
    const corpo = el("div", "mencao-corpo"); corpo.append(el("p", "figs-dica", "Escolha onde o flash aparece: no seu perfil e/ou nos perfis dos seus negócios (um, alguns ou todos)."), lista);
    pn.append(cab, corpo);
    palco.appendChild(pn);
    ok.addEventListener("click", () => pn.remove());
    const linha = (rot, sub, on, av, fn) => {
      const b = el("button", "mencao-item flash-dest-item" + (on ? " on" : "")); b.type = "button"; b.setAttribute("aria-pressed", String(on));
      const tx = el("span", "tx"); tx.append(el("strong", null, rot), el("small", null, sub));
      b.append(av, tx, el("i", "ok"));
      b.addEventListener("click", fn);
      return b;
    };
    const pintarL = () => {
      const avEu = el("span", "avatar"); pintarAvatar(avEu, dados.fotoPerfil, dados.nome);
      lista.replaceChildren(linha("Seu perfil", "Diário e o anel do seu perfil, para quem segue você", dest.perfil, avEu, () => {
        if (dest.perfil && !dest.negocios.size) { toast("Escolha pelo menos um lugar para publicar."); return; }
        dest.perfil = !dest.perfil; pintarL(); resumoDestino();
      }), ...meusNeg.map((n) => {
        const av = el("span", "avatar neg-av " + n.tipo);
        if (n.foto && /^(data:image|https:)/.test(n.foto)) pintarAvatar(av, n.foto, n.nome); else av.appendChild(icone(ICONE_NEGOCIO[n.tipo] || "loja", "i xs"));
        return linha(n.nome || "Negócio", "Perfil do negócio: aparece com o anel do Flash", dest.negocios.has(n.id), av, () => {
          if (dest.negocios.has(n.id)) { if (!dest.perfil && dest.negocios.size === 1) { toast("Escolha pelo menos um lugar para publicar."); return; } dest.negocios.delete(n.id); }
          else dest.negocios.add(n.id);
          pintarL(); resumoDestino();
        });
      }));
    };
    pintarL();
  }
  bOnde.addEventListener("click", escolherDestinos);
  dica.addEventListener("click", () => { if (meusNeg.length) escolherDestinos(); });
  // Flash nos perfis de negócio faz parte dos planos: sem plano ativo, publica só no seu perfil.
  Promise.all([fb.getDocs(fb.query(fb.collection(fb.db, "negocios"), fb.where("donoId", "==", eu.uid), fb.limit(8))), lerPlano(fb, eu.uid)]).then(([x, plano]) => {
    if (!nivelPlano(plano)) return;
    meusNeg = x.docs.map((d) => ({ id: d.id, ...d.data() })).filter((n) => PAGINA_NEGOCIO[n.tipo] && /^[A-Za-z0-9]+_(servicos|delivery|lojinha|imoveis|saude)$/.test(n.id));
    if (!meusNeg.length) return;
    // Onde publicar por padrão (Configurações do Flash)
    const cfg = configFlash();
    cfg.ondeNegocios.filter((id) => meusNeg.some((n) => n.id === id)).forEach((id) => dest.negocios.add(id));
    dest.perfil = cfg.ondePerfil || !dest.negocios.size;
    resumoDestino(); pintar();
  }).catch(() => {});
  // Campos do lugar escolhido (vão em todo flash publicado por este criador).
  const camposDestino = () => (dest.negocios.size ? { negocios: [...dest.negocios].slice(0, 4), ...(dest.perfil ? {} : { perfil: false }) } : {});
  baixo.append(linhaBaixo, dica);
  // Moldura com o degradê do Flash em volta do cartão (que ocupa quase a tela toda).
  const moldura = el("div", "flash-moldura"); moldura.appendChild(palco);
  caixa.append(moldura, baixo);
  fundo.appendChild(caixa);
  document.body.appendChild(fundo);
  document.body.classList.add("travado");

  let modo = "foto", fundoI = Math.floor(Math.random() * FUNDOS.length), letraI = 0;
  let foto = null, video = null, enviando = false;
  // Foto no cartão: zoom (1 a 5) e deslocamento a partir do centro (em px do cartão).
  let img = null, z = 1, ox = 0, oy = 0;
  let filtro = FILTROS[0];             // filtro escolhido (prévia e foto passam pelo mesmo processamento)
  const fotoFiltrada = new Map();      // filtro -> foto já processada (prévia rápida)
  let cam = null;                      // { stream, frente } enquanto a câmera do app está aberta
  let virada = false;                  // câmera da frente (selfie)
  const textos = []; // { texto, x, y (0..1), tam (fração da largura), letra, cor, destaque, el }

  // ---------- modo Texto ----------
  const area = el("textarea", "flash-texto"); area.maxLength = 220; area.rows = 3; area.placeholder = "Escreva algo..."; area.setAttribute("aria-label", "Texto do flash");
  const bFundo = el("button", "flash-ferr-btn cor"); bFundo.type = "button"; bFundo.setAttribute("aria-label", "Trocar o fundo"); bFundo.title = "Fundo";
  const bLetra = el("button", "flash-ferr-btn letra", "Aa"); bLetra.type = "button"; bLetra.title = "Letra"; bLetra.setAttribute("aria-label", "Trocar a letra");
  // ---------- modo Foto ----------
  const escolher = el("div", "flash-escolher");
  const bigIc = el("span", "ic"); bigIc.appendChild(icone("camera", "i"));
  const botoesEsc = el("div", "flash-esc-btns");
  const bCam = el("button", "flash-esc-btn pri"); bCam.type = "button"; bCam.append(icone("camera", "i s"), el("span", null, "Câmera"));
  const bGal = el("button", "flash-esc-btn"); bGal.type = "button"; bGal.append(icone("imagem", "i s"), el("span", null, "Galeria"));
  botoesEsc.append(bCam, bGal);
  escolher.append(bigIc, el("strong", null, "Mostre o que está acontecendo"), el("small", null, comStorage() ? "Foto ou vídeo de até 60 s · em pé fica melhor" : "Uma foto · em pé fica melhor"), botoesEsc);
  const legenda = el("input", "flash-legenda"); legenda.type = "text"; legenda.maxLength = 150; legenda.placeholder = "Adicionar legenda..."; legenda.setAttribute("aria-label", "Legenda do flash");
  const bAa = el("button", "flash-ferr-btn letra", "Aa"); bAa.type = "button"; bAa.title = "Escrever na foto"; bAa.setAttribute("aria-label", "Escrever na foto");
  const bTrocar = el("button", "flash-ferr-btn"); bTrocar.type = "button"; bTrocar.setAttribute("aria-label", "Trocar a foto"); bTrocar.title = "Trocar"; bTrocar.appendChild(icone("imagem", "i s"));
  const bFig = el("button", "flash-ferr-btn"); bFig.type = "button"; bFig.setAttribute("aria-label", "Figurinhas: horário, data e localização"); bFig.title = "Figurinhas"; bFig.appendChild(icone("figurinha", "i s"));
  const bFiltros = el("button", "flash-ferr-btn", "✨"); bFiltros.type = "button"; bFiltros.setAttribute("aria-label", "Filtros"); bFiltros.title = "Filtros";
  // Foto (ou câmera) dentro de uma caixa: o filtro de cor vai na caixa e a "pele suave" é uma cópia desfocada por cima.
  const fotoBox = el("div", "flash-fotobox");
  // Câmera do próprio app (como Instagram e TikTok)
  const camBox = el("div", "flash-cambox");
  const camVideo = document.createElement("video"); camVideo.className = "flash-cam"; camVideo.playsInline = true; camVideo.muted = true; camVideo.autoplay = true;
  // Com filtro, a câmera aparece já processada (um canvas desenhado a cada quadro): o que se vê é o que sai na foto.
  const camTela = document.createElement("canvas"); camTela.className = "flash-cam tela"; camTela.setAttribute("aria-hidden", "true");
  camBox.append(camVideo, camTela);
  let quadroId = 0;
  // Pela placa de vídeo (WebGL) quando dá: filtro ao vivo sem travar. Sem WebGL, o cálculo normal (menor).
  let glCam = null; try { glCam = new FiltroGL(camTela); } catch { glCam = null; }
  const camUI = el("div", "flash-cam-ui");
  const tiraFiltros = el("div", "flash-filtros"); tiraFiltros.setAttribute("role", "listbox"); tiraFiltros.setAttribute("aria-label", "Filtros");
  const camLinha = el("div", "flash-cam-linha");
  const bCamGal = el("button", "flash-cam-gal"); bCamGal.type = "button"; bCamGal.setAttribute("aria-label", "Escolher da galeria"); bCamGal.appendChild(icone("imagem", "i s"));
  const bDisparo = el("button", "flash-disparo"); bDisparo.type = "button"; bDisparo.setAttribute("aria-label", "Tirar foto"); bDisparo.appendChild(el("span"));
  const bVirar = el("button", "flash-cam-gal"); bVirar.type = "button"; bVirar.setAttribute("aria-label", "Virar a câmera"); bVirar.innerHTML = '<svg class="i s" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5A2.5 2.5 0 016.5 7h1.8l1.5-2h4.4l1.5 2h1.8A2.5 2.5 0 0120 9.5v7a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 16.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 13.2a3 3 0 015-2.2M15 13a3 3 0 01-5 2.2M14 9.6V11h-1.4M10 16.4V15h1.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  camLinha.append(bCamGal, bDisparo, bVirar);
  camUI.append(tiraFiltros, camLinha);
  const bLanterna = el("button", "flash-ferr-btn"); bLanterna.appendChild(icone("raio-off", "i s")); bLanterna.type = "button"; bLanterna.setAttribute("aria-label", "Lanterna"); bLanterna.title = "Lanterna";
  const bTempo = el("button", "flash-ferr-btn tempo", "3s"); bTempo.type = "button"; bTempo.setAttribute("aria-label", "Esperar 3 segundos"); bTempo.title = "Temporizador";
  const contagemCam = el("div", "flash-contagem"); contagemCam.setAttribute("aria-live", "assertive");
  let comTempo = false, lanterna = false, filtrosAbertos = false;

  const ajustarLetra = () => {
    const n = area.value.length;
    area.style.fontSize = (n < 40 ? 34 : n < 90 ? 27 : n < 150 ? 22 : 19) + "px";
  };
  const prontoParaPublicar = () => (modo === "texto" ? !!area.value.trim() : !!(foto || video));
  function pintar() {
    mTexto.setAttribute("aria-selected", String(modo === "texto")); mFoto.setAttribute("aria-selected", String(modo === "foto"));
    seloAmigos.hidden = configFlash().publico !== "amigos";
    ferramentas.replaceChildren();
    midiaBox.replaceChildren();
    palco.style.background = "";
    palco.classList.toggle("modo-texto", modo === "texto");
    camada.hidden = modo !== "foto";
    legenda.remove(); area.remove(); escolher.remove(); camUI.remove(); contagemCam.remove(); tiraFiltros.remove();
    if (modo === "texto" && cam) pararCamera();
    if (modo === "texto") {
      const [a, b] = FUNDOS[fundoI];
      palco.style.background = `linear-gradient(160deg, ${a}, ${b})`;
      bFundo.style.background = `linear-gradient(160deg, ${a}, ${b})`;
      const L = LETRAS[letraI];
      area.style.font = L.css; ajustarLetra();
      area.style.color = corTexto(fundoI);
      area.classList.toggle("neon", L.sombra);
      bLetra.style.font = L.css.replace("1em", "15px");
      palco.appendChild(area);
      ferramentas.append(bLetra, bFundo);
      if (meusNeg.length) ferramentas.append(bOnde);
      setTimeout(() => area.focus(), 60);
    } else if (cam) {
      midiaBox.appendChild(camBox);
      pintarFiltroNaTela();
      pintarTira();
      camUI.prepend(tiraFiltros);
      palco.append(camUI, contagemCam);
      const temLanterna = !virada && !!cam.stream.getVideoTracks()[0]?.getCapabilities?.().torch;
      if (temLanterna) ferramentas.append(bLanterna);
      ferramentas.append(bTempo);
      bTempo.classList.toggle("on", comTempo); bLanterna.classList.toggle("on", lanterna);
    } else if (foto || video) {
      if (foto) {
        midiaBox.appendChild(fotoBox); posicionar(); pintarFiltroNaTela();
        ferramentas.append(bAa, bFig, bFiltros, bTrocar);
        if (meusNeg.length) ferramentas.prepend(bOnde);
        bFiltros.classList.toggle("on", filtrosAbertos);
        if (filtrosAbertos) { pintarTira(); palco.appendChild(tiraFiltros); }
      } else { midiaBox.appendChild(video.el); ferramentas.append(bTrocar); if (meusNeg.length) ferramentas.prepend(bOnde); }
      palco.appendChild(legenda);
    } else {
      palco.appendChild(escolher);
    }
    palco.classList.toggle("com-camera", !!cam && modo === "foto");
    palco.classList.toggle("com-filtros", filtrosAbertos && !!foto && !cam);
    publicar.disabled = !prontoParaPublicar();
  }
  area.addEventListener("input", () => { ajustarLetra(); publicar.disabled = !area.value.trim(); });
  bFundo.addEventListener("click", () => { fundoI = (fundoI + 1) % FUNDOS.length; pintar(); });
  bLetra.addEventListener("click", () => { letraI = (letraI + 1) % LETRAS.length; toast(`Letra: ${LETRAS[letraI].nome}`); pintar(); });
  mTexto.addEventListener("click", () => { modo = "texto"; pintar(); });
  mFoto.addEventListener("click", () => { modo = "foto"; pintar(); });
  bCam.addEventListener("click", () => abrirCamera());
  bCamGal.addEventListener("click", () => escolherArquivo(false));
  bVirar.addEventListener("click", () => { virada = !virada; lanterna = false; abrirCamera(); });
  bTempo.addEventListener("click", () => { comTempo = !comTempo; bTempo.classList.toggle("on", comTempo); toast(comTempo ? "Temporizador: 3 segundos" : "Temporizador desligado"); });
  bLanterna.addEventListener("click", async () => {
    try { lanterna = !lanterna; await cam.stream.getVideoTracks()[0].applyConstraints({ advanced: [{ torch: lanterna }] }); bLanterna.classList.toggle("on", lanterna); bLanterna.replaceChildren(icone(lanterna ? "raio" : "raio-off", "i s")); }
    catch { lanterna = false; toast("Este aparelho não deixa ligar a lanterna pelo site."); }
  });
  bDisparo.addEventListener("click", () => disparar());
  bFiltros.addEventListener("click", () => { filtrosAbertos = !filtrosAbertos; pintar(); });
  bGal.addEventListener("click", () => escolherArquivo(false));
  bTrocar.addEventListener("click", () => escolherArquivo(false));
  bAa.addEventListener("click", () => editarTexto(null));
  bCfg.addEventListener("click", () => { abrirConfigFlash(); const f = $("folhaLista"); const volta = () => { f?.removeEventListener("fechada", volta); setTimeout(() => { if (fundo.isConnected && !document.querySelector(".folha.aberta")) seloAmigos.hidden = configFlash().publico !== "amigos"; }, 50); }; f?.addEventListener("fechada", volta); });
  bFig.addEventListener("click", () => abrirFigurinhas());

  // ---------- foto: arrastar e pinça direto no cartão ----------
  const medidas = () => { const r = palco.getBoundingClientRect(); return { W: r.width, H: r.height }; };
  const base = () => { const { W, H } = medidas(); return Math.max(W / img.naturalWidth, H / img.naturalHeight); };
  function limitarFoto() {
    const { W, H } = medidas(), s = base() * z;
    const mx = Math.max(0, (img.naturalWidth * s - W) / 2), my = Math.max(0, (img.naturalHeight * s - H) / 2);
    ox = Math.min(mx, Math.max(-mx, ox)); oy = Math.min(my, Math.max(-my, oy));
  }
  function posicionar() {
    if (!img?.naturalWidth) return;
    limitarFoto();
    const { W, H } = medidas(), s = base() * z;
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    fotoBox.style.width = w + "px"; fotoBox.style.height = h + "px";
    fotoBox.style.left = (W / 2 + ox - w / 2) + "px"; fotoBox.style.top = (H / 2 + oy - h / 2) + "px";
  }
  const dedos = new Map(); let dist0 = 0, z0 = 1;
  midiaBox.addEventListener("pointerdown", (e) => {
    if (!img || !foto) return;
    midiaBox.setPointerCapture(e.pointerId);
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    palco.classList.add("movendo");
    if (dedos.size === 2) { const [a, b] = [...dedos.values()]; dist0 = Math.hypot(a.x - b.x, a.y - b.y); z0 = z; }
  });
  midiaBox.addEventListener("pointermove", (e) => {
    if (!dedos.has(e.pointerId)) return;
    const antes = dedos.get(e.pointerId);
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (dedos.size === 1) { ox += e.clientX - antes.x; oy += e.clientY - antes.y; }
    else if (dedos.size === 2 && dist0) { const [a, b] = [...dedos.values()]; z = Math.min(5, Math.max(1, z0 * Math.hypot(a.x - b.x, a.y - b.y) / dist0)); }
    limitarFoto();
    // Encaixa no meio quando chega perto (linhas cor-de-rosa, como no Instagram).
    const nx = Math.abs(ox) < 7, ny = Math.abs(oy) < 7;
    if (nx) ox = 0; if (ny) oy = 0;
    guias.querySelector(".v").classList.toggle("on", nx); guias.querySelector(".h").classList.toggle("on", ny);
    posicionar();
  });
  const soltarFoto = (e) => { dedos.delete(e.pointerId); if (dedos.size < 2) dist0 = 0; if (!dedos.size) { palco.classList.remove("movendo"); guias.querySelectorAll(".on").forEach((g) => g.classList.remove("on")); } };
  midiaBox.addEventListener("pointerup", soltarFoto);
  midiaBox.addEventListener("pointercancel", soltarFoto);
  midiaBox.addEventListener("wheel", (e) => { if (!img) return; e.preventDefault(); z = Math.min(5, Math.max(1, z * (e.deltaY < 0 ? 1.08 : 1 / 1.08))); posicionar(); }, { passive: false });
  midiaBox.addEventListener("dblclick", () => { z = 1; ox = 0; oy = 0; posicionar(); });
  const aoRedimensionar = () => { posicionar(); textos.forEach(pintarTexto); };
  window.addEventListener("resize", aoRedimensionar);

  // ---------- texto por cima da foto ----------
  function pintarTexto(t) {
    const { W } = medidas();
    const e = t.el;
    e.textContent = t.texto;
    e.style.left = t.x * 100 + "%"; e.style.top = t.y * 100 + "%";
    if (t.lk) {
      // Prévia do link para o perfil de negócio (quem vê toca e vai para o perfil).
      e.className = "flash-txt flash-link";
      e.style.fontSize = Math.round(W * 0.04) + "px";
      const pill = el("span", "fe-link"); pill.append(icone(ICONE_NEGOCIO[t.negocio.tipo] || "loja", "i s"), el("span", null, t.negocio.nome || "Perfil do negócio"), icone("avancar", "i xs"));
      e.replaceChildren(pill);
      return;
    }
    if (t.cx) {
      // Prévia da caixa de perguntas (quem vê escreve a resposta; aqui só arrasta ou toca para editar).
      e.className = "flash-txt flash-enq";
      e.style.fontSize = Math.round(W * 0.042) + "px";
      const card = el("div", "fe-enq fe-cx");
      const cab = el("small", "fe-cx-cab"); cab.append(icone(t.anonima ? "mascara" : "caixa", "i xs"), document.createTextNode(t.anonima ? "PERGUNTAS · ANÔNIMA" : "PERGUNTAS"));
      card.append(cab, el("strong", null, t.pergunta), el("span", "fe-cx-campo", "Escreva aqui..."));
      e.replaceChildren(card);
      return;
    }
    if (t.enq) {
      // Prévia da enquete (quem vê vota no flash; aqui só arrasta ou toca para editar).
      e.className = "flash-txt flash-enq";
      e.style.fontSize = Math.round(W * 0.042) + "px";
      const card = el("div", "fe-enq"); card.appendChild(el("strong", null, t.pergunta));
      t.opcoes.forEach((o) => card.appendChild(el("span", null, o)));
      const d = t.duracao || { dur: 1440 };
      card.appendChild(el("small", "fe-enq-dur", d.fim ? `Termina às ${new Date(d.fim).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : `Dura ${d.dur >= 1440 ? "24 h" : d.dur / 60 + " h"}`));
      e.replaceChildren(card);
      return;
    }
    if (t.fig) {
      const es = EST_FIG[t.estilo];
      e.className = `flash-txt flash-fig fig-${t.fig}`;
      e.style.font = `${t.fig === "hora" ? 800 : 750} ${Math.round(t.tam * W)}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
      e.style.color = es.cor;
      e.style.background = Array.isArray(es.fundo) ? `linear-gradient(135deg, ${es.fundo[0]}, ${es.fundo[1]})` : es.fundo;
      e.style.boxShadow = es.borda ? `inset 0 0 0 1.5px ${es.borda}` : "0 4px 14px rgba(0,0,0,.25)";
      return;
    }
    e.style.font = LETRAS[t.letra].css.replace("1em", Math.round(t.tam * W) + "px");
    e.style.color = t.destaque ? (clara(t.cor) ? "#111" : "#fff") : t.cor;
    e.style.background = t.destaque ? t.cor : "transparent";
    e.classList.toggle("destaque", t.destaque);
    e.classList.toggle("neon", LETRAS[t.letra].sombra && !t.destaque);
  }
  function criarTexto(t) {
    const e = el("div", "flash-txt"); e.setAttribute("role", "button"); e.tabIndex = 0; e.setAttribute("aria-label", "Texto na foto: toque para editar, arraste para mover");
    t.el = e; textos.push(t); camada.appendChild(e); pintarTexto(t);
    let p0 = null, mexeu = false;
    e.addEventListener("pointerdown", (ev) => { ev.stopPropagation(); e.setPointerCapture(ev.pointerId); p0 = { x: ev.clientX, y: ev.clientY, tx: t.x, ty: t.y }; mexeu = false; });
    e.addEventListener("pointermove", (ev) => {
      if (!p0) return;
      const { W, H } = medidas();
      const dx = ev.clientX - p0.x, dy = ev.clientY - p0.y;
      if (!mexeu && Math.hypot(dx, dy) < 5) return;
      if (!mexeu) { mexeu = true; palco.classList.add("arrastando-txt"); }
      t.x = Math.min(0.98, Math.max(0.02, p0.tx + dx / W)); t.y = Math.min(0.98, Math.max(0.02, p0.ty + dy / H));
      const nx = Math.abs(t.x - 0.5) < 0.015; if (nx) t.x = 0.5;
      guias.querySelector(".v").classList.toggle("on", nx);
      const rl = lixo.getBoundingClientRect();
      lixo.classList.toggle("sobre", ev.clientY > rl.top - 20 && Math.abs(ev.clientX - (rl.left + rl.width / 2)) < 70);
      pintarTexto(t);
    });
    const fim = (ev) => {
      if (!p0) return;
      p0 = null; palco.classList.remove("arrastando-txt"); guias.querySelector(".v").classList.remove("on");
      if (lixo.classList.contains("sobre")) { lixo.classList.remove("sobre"); e.remove(); textos.splice(textos.indexOf(t), 1); navigator.vibrate?.(12); return; }
      if (!mexeu && ev.type === "pointerup") { if (t.enq) editarEnquete(t); else if (t.cx) editarCaixa(t); else if (t.lk) escolherNegocio(t); else if (t.fig) { t.estilo = (t.estilo + 1) % EST_FIG.length; pintarTexto(t); } else editarTexto(t); }
    };
    e.addEventListener("pointerup", fim);
    e.addEventListener("pointercancel", fim);
    e.addEventListener("keydown", (ev) => { if (ev.key === "Enter") editarTexto(t); });
  }
  // Painel de figurinhas: Horário, Data e Localização (a do perfil; dá para mudar).
  function abrirFigurinhas() {
    palco.querySelector(".flash-figs")?.remove();
    const pn = el("div", "flash-figs");
    const cab = el("div", "fe-cab"); const ok = el("button", "fe-pronto", "Fechar"); ok.type = "button";
    cab.append(el("strong", "figs-tit", "Figurinhas"), el("span", "esp"), ok);
    const grade = el("div", "figs-grade");
    const localPerfil = [dados.bairro, nomeCidade(dados.cidade || dados.cidadeNome)].filter(Boolean).join(", ");
    // Enquete e menção (interativas) primeiro
    // Onde publicar (seu perfil e/ou os perfis dos seus negócios): o primeiro da lista, quando você tem negócio.
    if (meusNeg.length) {
      const b = el("button", "fig-op"); b.type = "button";
      const amostra = el("span", "flash-fig amostra-fig fig-enq"); amostra.append(icone("loja", "i s"), document.createTextNode("PUBLICAR EM"));
      b.append(amostra, el("small", null, dest.negocios.size ? `${dest.negocios.size + (dest.perfil ? 1 : 0)} lugares` : "Seus negócios"));
      b.addEventListener("click", () => { pn.remove(); escolherDestinos(); });
      grade.appendChild(b);
    }
    [["enq", "Enquete", "enquete"], ["cx", "Perguntas", "caixa"], ["mencao", "Menção", "pessoa-mais"], ["lk", "Link", "loja"]].forEach(([k, rot, ic]) => {
      const b = el("button", "fig-op"); b.type = "button";
      const amostra = el("span", `flash-fig amostra-fig fig-${k === "cx" || k === "lk" ? "enq" : k}`); amostra.append(icone(ic, "i s"), document.createTextNode(k === "enq" ? "ENQUETE" : k === "cx" ? "PERGUNTAS" : k === "lk" ? "NEGÓCIO" : "@MENÇÃO"));
      b.append(amostra, el("small", null, k === "lk" ? "Link do negócio" : rot));
      b.addEventListener("click", () => { pn.remove(); if (k === "enq") editarEnquete(textos.find((t) => t.enq) || null); else if (k === "cx") editarCaixa(textos.find((t) => t.cx) || null); else if (k === "lk") escolherNegocio(textos.find((t) => t.lk) || null); else escolherMencao(); });
      grade.appendChild(b);
    });
    const opcoes = [["hora", "Horário"], ["data", "Data"], ["local", "Localização"]];
    opcoes.forEach(([fig, rot]) => {
      const b = el("button", "fig-op"); b.type = "button";
      const amostra = el("span", `flash-fig fig-${fig} amostra-fig`, textoFigurinha(fig, localPerfil));
      b.append(amostra, el("small", null, rot));
      b.addEventListener("click", () => {
        if (fig === "local") { escolherLocal(localPerfil); return; }
        pn.remove(); colocarFig(fig, textoFigurinha(fig));
      });
      grade.appendChild(b);
    });
    ok.addEventListener("click", () => pn.remove());
    pn.append(cab, grade, el("p", "figs-dica", "Toque na figurinha para trocar o estilo · arraste até a lixeira para tirar"));
    palco.appendChild(pn);
    function escolherLocal(sugestao) {
      grade.replaceChildren();
      const inp = el("input", "fe-local"); inp.type = "text"; inp.maxLength = 40; inp.value = sugestao || ""; inp.placeholder = "Bairro, cidade ou lugar"; inp.setAttribute("aria-label", "Localização");
      const usar = el("button", "fe-pronto", "Colocar"); usar.type = "button";
      const linha = el("div", "fe-linha-local"); linha.append(inp, usar);
      grade.appendChild(linha);
      const colocar = () => { const v = inp.value.trim(); if (!v) { inp.focus(); return; } pn.remove(); colocarFig("local", "📍 " + v.slice(0, 40)); };
      usar.addEventListener("click", colocar);
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") colocar(); });
      setTimeout(() => inp.focus(), 50);
    }
  }
  function colocarFig(fig, texto, extra = {}) {
    const y = 0.22 + (textos.filter((t) => t.fig).length % 4) * 0.1;
    criarTexto({ fig, texto, estilo: 0, x: 0.5, y, tam: fig === "hora" ? 0.11 : 0.055, letra: 0, cor: "#fff", destaque: false, ...extra });
  }
  // Enquete no flash: pergunta e 2 a 4 opções; quem vê vota na hora (não vai desenhada na foto).
  function editarEnquete(t) {
    palco.querySelector(".flash-figs")?.remove();
    const pn = el("div", "flash-figs flash-enq-ed");
    const cab = el("div", "fe-cab"); const ok = el("button", "fe-pronto", "Pronto"); ok.type = "button";
    cab.append(el("strong", "figs-tit", "Enquete"), el("span", "esp"), ok);
    const box = el("div", "enq-ed");
    const perg = el("input", "enq-ed-perg"); perg.type = "text"; perg.maxLength = 120; perg.placeholder = "Faça uma pergunta..."; perg.value = t?.pergunta || "";
    const ops = (t?.opcoes || ["Sim", "Não"]).slice();
    const lista = el("div", "enq-ed-ops");
    const pintarOps = () => {
      lista.replaceChildren(...ops.map((o, i) => {
        const l = el("div", "enq-ed-op");
        const inp = el("input"); inp.type = "text"; inp.maxLength = 40; inp.value = o; inp.placeholder = `Opção ${i + 1}`;
        inp.addEventListener("input", () => { ops[i] = inp.value; });
        l.appendChild(inp);
        if (ops.length > 2) { const x = el("button", null, "×"); x.type = "button"; x.setAttribute("aria-label", "Tirar opção"); x.addEventListener("click", () => { ops.splice(i, 1); pintarOps(); }); l.appendChild(x); }
        return l;
      }));
      if (ops.length < 4) { const m = el("button", "enq-ed-mais", "+ Adicionar opção"); m.type = "button"; m.addEventListener("click", () => { ops.push(""); pintarOps(); }); lista.appendChild(m); }
    };
    pintarOps();
    // Duração: no flash vai até 24 h (acaba junto com ele).
    const duracao = { ...(t?.duracao || { dur: 1440 }) };
    const extras = { anonima: !!t?.anonima };
    box.append(perg, lista, linhaChave(extras, "anonima", { titulo: "Votação anônima", sub: "Ninguém vê quem votou, nem você", escuro: true }), seletorDuracao(duracao, { maxMin: MAX_FLASH_MIN, escuro: true }));
    pn.append(cab, box);
    palco.appendChild(pn);
    setTimeout(() => perg.focus(), 50);
    ok.addEventListener("click", () => {
      const pergunta = perg.value.trim().slice(0, 120), opcoes = ops.map((o) => o.trim().slice(0, 40)).filter(Boolean);
      if (!pergunta) { toast("Escreva a pergunta."); perg.focus(); return; }
      if (opcoes.length < 2) { toast("Coloque pelo menos 2 opções."); return; }
      pn.remove();
      if (t) { t.pergunta = pergunta; t.opcoes = opcoes; t.duracao = duracao; t.anonima = extras.anonima; pintarTexto(t); }
      else criarTexto({ enq: true, pergunta, opcoes, duracao, anonima: extras.anonima, texto: "", x: 0.5, y: 0.6, tam: 0.05, letra: 0, cor: "#111", destaque: false });
    });
  }
  // Caixa de perguntas no flash: o texto e se as respostas são anônimas (quem vê responde por cima do flash).
  function editarCaixa(t) {
    palco.querySelector(".flash-figs")?.remove();
    const pn = el("div", "flash-figs flash-enq-ed");
    const cab = el("div", "fe-cab"); const ok = el("button", "fe-pronto", "Pronto"); ok.type = "button";
    cab.append(el("strong", "figs-tit", "Caixa de perguntas"), el("span", "esp"), ok);
    const box = el("div", "enq-ed");
    const perg = el("input", "enq-ed-perg"); perg.type = "text"; perg.maxLength = 120; perg.placeholder = "Me faça uma pergunta"; perg.value = t?.pergunta || "Me faça uma pergunta";
    const estado = { anonima: !!t?.anonima };
    box.append(perg, el("small", "enq-ed-dica", "Quem vê o flash escreve a resposta numa caixa de texto. As respostas chegam só para você."),
      linhaChave(estado, "anonima", { titulo: "Respostas anônimas", sub: "Você não vê quem respondeu", escuro: true }));
    pn.append(cab, box);
    palco.appendChild(pn);
    setTimeout(() => perg.select(), 50);
    ok.addEventListener("click", () => {
      const pergunta = perg.value.trim().slice(0, 120);
      if (!pergunta) { toast("Escreva o texto da caixa."); perg.focus(); return; }
      pn.remove();
      if (t) { t.pergunta = pergunta; t.anonima = estado.anonima; pintarTexto(t); }
      else criarTexto({ cx: true, pergunta, anonima: estado.anonima, texto: "", x: 0.5, y: 0.42, tam: 0.05, letra: 0, cor: "#111", destaque: false });
    });
  }
  // Link para o perfil de um negócio: os seus primeiro, e a busca entre todos os negócios do site.
  let negociosP = null;
  async function escolherNegocio(t) {
    palco.querySelector(".flash-figs")?.remove();
    const pn = el("div", "flash-figs");
    const cab = el("div", "fe-cab"); const ok = el("button", "fe-pronto", t ? "Tirar" : "Fechar"); ok.type = "button";
    cab.append(el("strong", "figs-tit", "Link para um negócio"), el("span", "esp"), ok);
    const busca = el("input", "fe-local"); busca.type = "search"; busca.placeholder = "Buscar negócio pelo nome"; busca.setAttribute("aria-label", "Buscar negócio");
    const lista = el("div", "mencao-lista");
    const corpo = el("div", "mencao-corpo"); corpo.append(busca, el("p", "figs-dica", "Quem vê o flash toca no link e vai direto para o perfil do negócio."), lista);
    pn.append(cab, corpo);
    palco.appendChild(pn);
    ok.addEventListener("click", () => { pn.remove(); if (t) { t.el.remove(); textos.splice(textos.indexOf(t), 1); } });
    lista.appendChild(el("p", "figs-dica", "Carregando..."));
    negociosP ||= fb.getDocs(fb.query(fb.collection(fb.db, "negocios"), fb.limit(300))).then((x) => x.docs.map((d) => ({ id: d.id, ...d.data() })).filter((n) => n.nome && PAGINA_NEGOCIO[n.tipo] && !escondido(n.donoId))).catch(() => []);
    const todos = await negociosP;
    const meus = todos.filter((n) => n.donoId === eu.uid);
    const ROT = { servicos: "Freelances", delivery: "Delivery", lojinha: "Lojinha", imoveis: "Imóveis", saude: "Saúde" };
    const item = (n) => {
      const b = el("button", "mencao-item"); b.type = "button";
      const av = el("span", "avatar neg-av " + n.tipo); if (n.foto && /^(data:image|https:)/.test(n.foto)) pintarAvatar(av, n.foto, n.nome); else av.appendChild(icone(ICONE_NEGOCIO[n.tipo], "i s"));
      const tx = el("span", "tx"); tx.append(el("strong", null, n.nome), el("small", null, [ROT[n.tipo], n.donoId === eu.uid ? "seu negócio" : ""].filter(Boolean).join(" · ")));
      b.append(av, tx);
      b.addEventListener("click", () => {
        pn.remove();
        const negocio = { id: n.id, nome: n.nome, tipo: n.tipo };
        if (t) { t.negocio = negocio; pintarTexto(t); }
        else { textos.filter((x) => x.lk).forEach((x) => { x.el.remove(); textos.splice(textos.indexOf(x), 1); }); criarTexto({ lk: true, negocio, texto: "", x: 0.5, y: 0.68, tam: 0.05, letra: 0, cor: "#111", destaque: false }); }
      });
      return b;
    };
    const pintarL = () => {
      const q = busca.value.trim().toLowerCase();
      const outros = todos.filter((n) => n.donoId !== eu.uid && (!q || String(n.nome).toLowerCase().includes(q))).slice(0, 30);
      const m = meus.filter((n) => !q || String(n.nome).toLowerCase().includes(q));
      const blocos = [];
      if (m.length) blocos.push(el("p", "figs-sec", "Seus negócios"), ...m.map(item));
      if (outros.length) blocos.push(el("p", "figs-sec", q ? "Encontrados" : "Outros negócios"), ...outros.map(item));
      lista.replaceChildren(...(blocos.length ? blocos : [el("p", "figs-dica", q ? "Nenhum negócio com esse nome." : "Ainda não há negócios no site.")]));
    };
    busca.addEventListener("input", pintarL);
    pintarL();
  }
  // Menção: escolher a pessoa (quem você segue e com quem conversou); vira "@usuário" na foto e ela é avisada.
  async function escolherMencao() {
    palco.querySelector(".flash-figs")?.remove();
    const pn = el("div", "flash-figs");
    const cab = el("div", "fe-cab"); const ok = el("button", "fe-pronto", "Fechar"); ok.type = "button";
    cab.append(el("strong", "figs-tit", "Mencionar"), el("span", "esp"), ok);
    const busca = el("input", "fe-local"); busca.type = "search"; busca.placeholder = "Buscar pessoas"; busca.setAttribute("aria-label", "Buscar pessoas");
    const lista = el("div", "mencao-lista");
    const corpo = el("div", "mencao-corpo"); corpo.append(busca, lista);
    pn.append(cab, corpo);
    palco.appendChild(pn);
    ok.addEventListener("click", () => pn.remove());
    lista.appendChild(el("p", "figs-dica", "Carregando..."));
    const uids = [...meusSeguindo].filter((u) => !escondido(u)).slice(0, 80);
    const pessoas = (await Promise.all(uids.map(async (u) => ({ uid: u, ...(await obterPerfil(u).catch(() => ({}))) })))).filter((p) => p.nickname);
    const pintarL = () => {
      const q = busca.value.trim().toLowerCase().replace(/^@/, "");
      const l = pessoas.filter((p) => !q || String(p.nome || "").toLowerCase().includes(q) || String(p.nickname).includes(q)).slice(0, 30);
      lista.replaceChildren(...(l.length ? l.map((p) => {
        const b = el("button", "mencao-item"); b.type = "button";
        const av = el("span", "avatar"); pintarAvatar(av, p.fotoPerfil, p.nome);
        const tx = el("span", "tx"); tx.append(el("strong", null, p.nome || "Usuário"), el("small", null, "@" + p.nickname));
        b.append(av, tx);
        b.addEventListener("click", async () => {
          if (!(await podeMarcar(p.uid))) { toast(`${String(p.nome || "Essa pessoa").split(" ")[0]} não aceita ser mencionada por você.`); return; }
          pn.remove(); colocarFig("mencao", "@" + p.nickname, { uid: p.uid });
        });
        return b;
      }) : [el("p", "figs-dica", pessoas.length ? "Ninguém com esse nome." : "Siga pessoas para mencionar no flash.")]));
    };
    busca.addEventListener("input", pintarL);
    pintarL();
    setTimeout(() => busca.focus(), 50);
  }

  // Janela de escrever (por cima do cartão): cor, letra, destaque e tamanho.
  function editarTexto(t) {
    const novo = !t;
    const tmp = t ? { ...t } : { texto: "", x: 0.5, y: 0.45, tam: 0.075, letra: 0, cor: "#ffffff", destaque: false };
    const ed = el("div", "flash-edtxt");
    const cab = el("div", "fe-cab");
    const bLe = el("button", "flash-ferr-btn letra", "Aa"); bLe.type = "button"; bLe.setAttribute("aria-label", "Trocar a letra");
    const bDe = el("button", "flash-ferr-btn destaque"); bDe.type = "button"; bDe.setAttribute("aria-label", "Fundo atrás do texto"); bDe.innerHTML = "<b>A</b>";
    const ok = el("button", "fe-pronto", "Pronto"); ok.type = "button";
    cab.append(bLe, bDe, el("span", "esp"), ok);
    const tam = el("input", "fe-tam"); tam.type = "range"; tam.min = "0.04"; tam.max = "0.16"; tam.step = "0.002"; tam.value = String(tmp.tam); tam.setAttribute("aria-label", "Tamanho do texto");
    const campo = el("textarea", "fe-campo"); campo.rows = 2; campo.maxLength = 120; campo.value = tmp.texto; campo.placeholder = "Escreva...";
    const cores = el("div", "fe-cores");
    CORES.forEach((c) => { const b = el("button"); b.type = "button"; b.style.background = c; b.setAttribute("aria-label", "Cor " + c); b.addEventListener("click", () => { tmp.cor = c; pintarEd(); }); cores.appendChild(b); });
    ed.append(cab, tam, campo, cores);
    palco.appendChild(ed);
    function pintarEd() {
      const { W } = medidas();
      campo.style.font = LETRAS[tmp.letra].css.replace("1em", Math.round(tmp.tam * W) + "px");
      campo.style.color = tmp.destaque ? (clara(tmp.cor) ? "#111" : "#fff") : tmp.cor;
      campo.style.background = tmp.destaque ? tmp.cor : "transparent";
      campo.classList.toggle("neon", LETRAS[tmp.letra].sombra && !tmp.destaque);
      bLe.style.font = LETRAS[tmp.letra].css.replace("1em", "15px");
      bDe.classList.toggle("on", tmp.destaque);
      [...cores.children].forEach((b, k) => b.classList.toggle("on", CORES[k] === tmp.cor));
    }
    bLe.addEventListener("click", () => { tmp.letra = (tmp.letra + 1) % LETRAS.length; pintarEd(); });
    bDe.addEventListener("click", () => { tmp.destaque = !tmp.destaque; pintarEd(); });
    tam.addEventListener("input", () => { tmp.tam = Number(tam.value); pintarEd(); });
    const concluir = () => {
      const texto = campo.value.trim();
      ed.remove();
      if (t && !texto) { t.el.remove(); textos.splice(textos.indexOf(t), 1); return; }
      if (!texto) return;
      tmp.texto = texto;
      if (novo) criarTexto(tmp); else { Object.assign(t, tmp); pintarTexto(t); }
    };
    ok.addEventListener("click", concluir);
    ed.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); concluir(); } });
    pintarEd();
    setTimeout(() => campo.focus(), 50);
  }

  // ---------- filtros ----------
  // Foto: processada uma vez por filtro (tamanho de tela) e guardada; a câmera é processada ao vivo.
  function pintarFiltroNaTela() {
    palco.dataset.filtro = filtro.id;
    if (cam) { ligarQuadros(); return; }
    if (!img) return;
    const c = fotoFiltrada.get(filtro.id);
    if (c) { fotoBox.replaceChildren(c); return; }
    // Processa depois de mostrar o "carregando" (no celular leva uma fração de segundo).
    if (!fotoBox.children.length) { const o = imagemFiltrada(img, FILTROS[0], { max: 1100 }); o.className = "flash-foto"; fotoFiltrada.set("original", o); fotoBox.replaceChildren(o); }
    const f = filtro, alvo = img;
    palco.classList.add("processando");
    requestAnimationFrame(() => setTimeout(() => {
      if (alvo !== img) return;
      const n = imagemFiltrada(img, f, { max: 1100 }); n.className = "flash-foto";
      fotoFiltrada.set(f.id, n);
      if (filtro === f) fotoBox.replaceChildren(n);
      palco.classList.remove("processando");
    }, 0));
  }
  // Câmera com filtro: cada quadro do vídeo vai para um canvas pequeno e passa pelo filtro.
  function ligarQuadros() {
    cancelAnimationFrame(quadroId);
    const com = !semFiltro(filtro);
    camBox.classList.toggle("filtrada", com);
    if (!com) return;
    const desenhar = () => {
      if (!cam || semFiltro(filtro) || !fundo.isConnected) return;
      quadroId = requestAnimationFrame(desenhar);
      const vw = camVideo.videoWidth, vh = camVideo.videoHeight;
      if (!vw || !vh) return;
      const { W, H } = medidas();
      if (glCam) {
        // Recorte "cover" do vídeo no tamanho do cartão, na resolução da tela (até 900 px).
        const k = Math.min(Math.min(window.devicePixelRatio || 1, 2), 900 / W), cw = Math.round(W * k), ch = Math.round(H * k);
        const e = Math.max(cw / vw, ch / vh), rw = cw / e, rh = ch / e;
        glCam.desenhar(camVideo, filtro, cw, ch, { recorte: { x: (vw - rw) / 2, y: (vh - rh) / 2, w: rw, h: rh } });
        return;
      }
      const k = Math.min(1, 300 / W), cw = Math.round(W * k), ch = Math.round(H * k);
      if (camTela.width !== cw || camTela.height !== ch) { camTela.width = cw; camTela.height = ch; }
      const g = camTela.getContext("2d", { willReadFrequently: true });
      const esc = Math.max(cw / vw, ch / vh);
      // (a selfie já aparece espelhada pela caixa inteira, como o vídeo)
      g.drawImage(camVideo, (cw - vw * esc) / 2, (ch - vh * esc) / 2, vw * esc, vh * esc);
      aplicarFiltro(camTela, filtro);
    };
    desenhar();
  }
  // Amostras das bolinhas: a própria foto (ou um quadro da câmera) com cada filtro, como no Instagram.
  let amostraBase = null;
  function pegarAmostra() {
    const fonte = img || (cam && camVideo.videoWidth ? camVideo : null);
    if (!fonte) return null;
    const fw = fonte.naturalWidth || fonte.videoWidth, fh = fonte.naturalHeight || fonte.videoHeight;
    const c = document.createElement("canvas"); c.width = c.height = 96;
    const lado = Math.min(fw, fh), g = c.getContext("2d");
    g.drawImage(fonte, (fw - lado) / 2, (fh - lado) / 2, lado, lado, 0, 0, 96, 96);
    return c;
  }
  function pintarTira() {
    amostraBase = pegarAmostra() || amostraBase;
    tiraFiltros.replaceChildren(...FILTROS.map((f) => {
      const b = el("button", "flash-filtro" + (f.id === filtro.id ? " on" : "")); b.type = "button"; b.setAttribute("role", "option"); b.setAttribute("aria-selected", String(f.id === filtro.id));
      const amostra = el("span", "amostra");
      if (amostraBase) {
        const c = document.createElement("canvas"); c.width = c.height = 96;
        c.getContext("2d").drawImage(amostraBase, 0, 0);
        aplicarFiltro(c, f);
        amostra.appendChild(c);
      }
      b.append(amostra, el("small", null, f.nome));
      b.addEventListener("click", () => escolherFiltro(f));
      return b;
    }));
    requestAnimationFrame(() => { const on = tiraFiltros.querySelector(".on"); if (on) tiraFiltros.scrollLeft = on.offsetLeft - tiraFiltros.clientWidth / 2 + on.clientWidth / 2; });
  }
  function escolherFiltro(f) {
    filtro = f;
    pintarFiltroNaTela();
    [...tiraFiltros.children].forEach((b, k) => { const on = FILTROS[k].id === f.id; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); });
    const nome = el("div", "flash-nome-filtro", f.nome); palco.querySelector(".flash-nome-filtro")?.remove(); palco.appendChild(nome); setTimeout(() => nome.remove(), 900);
  }
  // Deslizar para o lado na câmera troca o filtro (como no Instagram).
  let toque0 = null;
  midiaBox.addEventListener("touchstart", (e) => { if (cam) toque0 = e.touches[0].clientX; }, { passive: true });
  midiaBox.addEventListener("touchend", (e) => {
    if (!cam || toque0 == null) return;
    const dx = e.changedTouches[0].clientX - toque0; toque0 = null;
    if (Math.abs(dx) < 50) return;
    const k = FILTROS.findIndex((f) => f.id === filtro.id);
    escolherFiltro(FILTROS[(k + (dx < 0 ? 1 : -1) + FILTROS.length) % FILTROS.length]);
  }, { passive: true });

  // ---------- câmera do app ----------
  async function abrirCamera() {
    if (!navigator.mediaDevices?.getUserMedia) { escolherArquivo(true); return; }
    pararCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: virada ? "user" : "environment", width: { ideal: 1920 }, height: { ideal: 1080 } } });
      if (!fundo.isConnected) { stream.getTracks().forEach((t) => t.stop()); return; }
      cam = { stream };
      camVideo.srcObject = stream;
      camBox.classList.toggle("espelho", virada);
      camVideo.play().catch(() => {});
      modo = "foto"; pintar();
      // Quando o primeiro quadro chega: amostras reais nas bolinhas dos filtros.
      camVideo.addEventListener("loadeddata", () => { if (cam) pintarTira(); }, { once: true });
    } catch (e) {
      cam = null;
      toast(e?.name === "NotAllowedError" ? "Sem permissão para a câmera. Abrindo a câmera do celular." : "Não foi possível abrir a câmera aqui. Abrindo a câmera do celular.");
      escolherArquivo(true);
    }
  }
  function pararCamera() {
    if (!cam) return;
    cam.stream.getTracks().forEach((t) => t.stop());
    cancelAnimationFrame(quadroId);
    camVideo.srcObject = null;
    cam = null; lanterna = false;
  }
  async function disparar() {
    if (!cam || bDisparo.disabled) return;
    bDisparo.disabled = true;
    if (comTempo) for (let n = 3; n > 0; n--) { contagemCam.textContent = String(n); contagemCam.classList.add("on"); await new Promise((r) => setTimeout(r, 1000)); }
    contagemCam.classList.remove("on"); contagemCam.textContent = "";
    if (!cam) { bDisparo.disabled = false; return; }
    // Quadro do vídeo recortado como aparece no cartão (preenche o 9:16).
    const vw = camVideo.videoWidth, vh = camVideo.videoHeight;
    if (!vw || !vh) { bDisparo.disabled = false; toast("A câmera ainda está abrindo. Tente de novo."); return; }
    const OW = 1080, OH = 1920, esc = Math.max(OW / vw, OH / vh);
    const c = document.createElement("canvas"); c.width = OW; c.height = OH;
    const g = c.getContext("2d");
    if (virada) { g.translate(OW, 0); g.scale(-1, 1); }
    g.drawImage(camVideo, (OW - vw * esc) / 2, (OH - vh * esc) / 2, vw * esc, vh * esc);
    palco.classList.add("clique"); setTimeout(() => palco.classList.remove("clique"), 260);
    navigator.vibrate?.(15);
    const blob = await new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.92));
    pararCamera();
    bDisparo.disabled = false;
    if (blob) await usarFoto(URL.createObjectURL(blob));
  }
  async function usarFoto(url) {
    const im = new Image(); im.className = "flash-foto"; im.alt = "Foto do flash"; im.draggable = false;
    await new Promise((ok, erro) => { im.onload = ok; im.onerror = () => erro(new Error("Não foi possível abrir esta foto. Tente JPG ou PNG.")); im.src = url; });
    if (foto?.startsWith("blob:")) URL.revokeObjectURL(foto);
    foto = url; img = im; video = null; z = 1; ox = 0; oy = 0;
    fotoFiltrada.clear(); amostraBase = null; fotoBox.replaceChildren();
    modo = "foto"; pintar();
  }

  function escolherArquivo(camera) {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = comStorage() ? "image/*,video/*" : "image/*";
    if (camera) inp.setAttribute("capture", "environment");
    inp.addEventListener("change", async () => {
      const arq = inp.files?.[0]; if (!arq) return;
      try {
        if (arq.type.startsWith("video/")) {
          if (!comStorage()) { toast("Vídeo no flash precisa do armazenamento de arquivos ligado."); return; }
          if (arq.size > 40 * 1024 * 1024) { toast("O vídeo deve ter até 40 MB."); return; }
          const v = document.createElement("video"); v.preload = "metadata"; v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true;
          const url = URL.createObjectURL(arq);
          const dur = await new Promise((ok) => { v.onloadedmetadata = () => ok(v.duration); v.onerror = () => ok(0); v.src = url; });
          if (dur > 61) { toast(`O vídeo tem ${Math.round(dur)} s. Flash: até 60 segundos.`); return; }
          video = { arq, dur, el: v }; foto = null; img = null;
          textos.splice(0).forEach((t) => t.el.remove());
          v.play().catch(() => {});
        } else {
          if (!arq.type.startsWith("image/")) { toast("Escolha uma foto."); return; }
          pararCamera();
          await usarFoto(URL.createObjectURL(arq));
        }
        pararCamera();
        modo = "foto"; pintar();
        if (foto && !sessionStorage.getItem("hf-flash-dica")) { toast("Arraste e use dois dedos para ajustar a foto"); try { sessionStorage.setItem("hf-flash-dica", "1"); } catch {} }
      } catch (e) { toast("Não foi possível abrir: " + erroAmigavel(e)); }
    });
    inp.click();
  }

  const fechar = () => {
    pararCamera();
    fundo.remove(); document.body.classList.remove("travado"); document.removeEventListener("keydown", tecla); window.removeEventListener("resize", aoRedimensionar);
    if (foto) URL.revokeObjectURL(foto);
  };
  const tecla = (e) => { if (e.key === "Escape" && !document.querySelector(".hfe-fundo, .flash-edtxt")) fechar(); };
  document.addEventListener("keydown", tecla);
  bX.addEventListener("click", async () => {
    if ((area.value.trim() || foto || video) && !await confirmarHF({ titulo: "Descartar este flash?", texto: "A foto e o que você escreveu serão perdidos.", ok: "Descartar", cancelar: "Continuar editando", icone: "lixo" })) return;
    fechar();
  });
  // Foto com os textos: desenha o cartão inteiro em 1080×1920 (o que a pessoa vê é o que vai).
  function desenharFoto() {
    const OW = 1080, OH = 1920;
    const { W } = medidas(), k = OW / W;
    const c = document.createElement("canvas"); c.width = OW; c.height = OH;
    const g = c.getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, OW, OH);
    g.imageSmoothingQuality = "high";
    const s = base() * z * k, w = img.naturalWidth * s, h = img.naturalHeight * s;
    // A foto vai com o filtro em tamanho cheio (a prévia usa uma cópia menor, processada do mesmo jeito).
    const fonte = semFiltro(filtro) ? img : imagemFiltrada(img, filtro, { max: 2200 });
    g.drawImage(fonte, OW / 2 + ox * k - w / 2, OH / 2 + oy * k - h / 2, w, h);
    textos.forEach((t) => {
      if (t.enq || t.cx || t.lk) return; // enquete, caixa de perguntas e link ficam por cima, interativos (não vão desenhados)
      const px = Math.round(t.tam * OW);
      if (t.fig) {
        const es = EST_FIG[t.estilo];
        g.font = `${t.fig === "hora" ? 800 : 750} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
        g.textAlign = "center"; g.textBaseline = "middle";
        const x = t.x * OW, y = t.y * OH, lw = g.measureText(t.texto).width + px * 0.9, lh = px * 1.5;
        if (Array.isArray(es.fundo)) { const gr = g.createLinearGradient(x - lw / 2, y - lh / 2, x + lw / 2, y + lh / 2); gr.addColorStop(0, es.fundo[0]); gr.addColorStop(1, es.fundo[1]); g.fillStyle = gr; }
        else g.fillStyle = es.fundo;
        g.shadowColor = es.borda ? "transparent" : "rgba(0,0,0,.25)"; g.shadowBlur = es.borda ? 0 : px * 0.4; g.shadowOffsetY = es.borda ? 0 : px * 0.1;
        g.beginPath(); (g.roundRect ? g.roundRect(x - lw / 2, y - lh / 2, lw, lh, px * 0.32) : g.rect(x - lw / 2, y - lh / 2, lw, lh)); g.fill();
        g.shadowBlur = 0; g.shadowOffsetY = 0;
        if (es.borda) { g.strokeStyle = es.borda; g.lineWidth = Math.max(2, px * 0.05); g.stroke(); }
        g.fillStyle = es.cor; g.fillText(t.texto, x, y + px * 0.04);
        return;
      }
      g.font = LETRAS[t.letra].css.replace("1em", px + "px");
      g.textAlign = "center"; g.textBaseline = "middle";
      const linhas = t.texto.split("\n");
      const alt = px * 1.25, y0 = t.y * OH - ((linhas.length - 1) * alt) / 2;
      linhas.forEach((l, i) => {
        const y = y0 + i * alt, x = t.x * OW;
        if (t.destaque) {
          const lw = g.measureText(l).width + px * 0.7, lh = alt + px * 0.1;
          g.fillStyle = t.cor;
          g.beginPath(); (g.roundRect ? g.roundRect(x - lw / 2, y - lh / 2, lw, lh, px * 0.25) : g.rect(x - lw / 2, y - lh / 2, lw, lh)); g.fill();
          g.fillStyle = clara(t.cor) ? "#111" : "#fff"; g.shadowBlur = 0;
        } else {
          g.fillStyle = t.cor;
          if (LETRAS[t.letra].sombra) { g.shadowColor = "rgba(255,255,255,.95)"; g.shadowBlur = px * 0.35; } else { g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = px * 0.12; }
        }
        g.fillText(l, x, y);
        g.shadowBlur = 0;
      });
    });
    let q = 0.86, url = c.toDataURL("image/jpeg", q);
    while (url.length > 860000 && q > 0.45) { q -= 0.08; url = c.toDataURL("image/jpeg", q); }
    return url;
  }
  publicar.addEventListener("click", async () => {
    if (enviando || !prontoParaPublicar()) return;
    enviando = true; publicar.disabled = true; publicar.classList.add("enviando"); publicar.firstChild.textContent = "Publicando...";
    try {
      if (modo === "texto") {
        const midia = desenharTexto(area.value.trim(), FUNDOS[fundoI], LETRAS[letraI], corTexto(fundoI));
        const url = await salvarImagem(midia, `stories/${eu.uid}/${Date.now()}.jpg`);
        await gravar({ tipo: "imagem", midia: url, ...camposDestino() }, { imagem: midia });
      } else if (video) {
        toast("Enviando o vídeo...");
        const ext = (video.arq.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "mp4";
        const r = storageFns.ref(window.firebaseStorage, `stories/${eu.uid}/${Date.now()}.${ext}`);
        await storageFns.uploadBytes(r, video.arq, { contentType: video.arq.type, cacheControl: "public, max-age=31536000, immutable" });
        const texto = legenda.value.trim().slice(0, 150);
        await gravar({ tipo: "video", midia: await storageFns.getDownloadURL(r), duracao: Math.min(60, Math.round(video.dur)), ...(texto ? { texto } : {}), ...camposDestino() });
      } else {
        const imagem = desenharFoto();
        const url = await salvarImagem(imagem, `stories/${eu.uid}/${Date.now()}.jpg`);
        const texto = legenda.value.trim().slice(0, 150);
        const enq = textos.find((t) => t.enq);
        const mencoes = [...new Set(textos.filter((t) => t.fig === "mencao" && t.uid).map((t) => t.uid))].slice(0, 10);
        const enquete = enq ? { pergunta: enq.pergunta, opcoes: enq.opcoes, x: Math.round(enq.x * 1000) / 1000, y: Math.round(enq.y * 1000) / 1000,
          fimEm: fb.Timestamp.fromMillis(fimEscolhido(enq.duracao || { dur: 1440 }, { maxMin: MAX_FLASH_MIN })), ...(enq.anonima ? { anonima: true } : {}) } : null;
        const cx = textos.find((t) => t.cx);
        const caixa = cx ? { pergunta: cx.pergunta, anonima: !!cx.anonima, x: Math.round(cx.x * 1000) / 1000, y: Math.round(cx.y * 1000) / 1000 } : null;
        const lk = textos.find((t) => t.lk);
        const link = lk ? { negocioId: lk.negocio.id, nome: String(lk.negocio.nome || "").slice(0, 80), tipo: lk.negocio.tipo, x: Math.round(lk.x * 1000) / 1000, y: Math.round(lk.y * 1000) / 1000 } : null;
        const repostDe = repost ? { storyId: repost.id, autorId: repost.autorId, nome: String(repost.nome || "").slice(0, 80) } : null;
        const postDe = post ? { postId: post.id, autorId: post.autorId, nome: String(post.nome || "").slice(0, 80) } : null;
        const ref = await gravar({ tipo: "imagem", midia: url, ...(texto ? { texto } : {}), ...camposDestino(), ...(enquete ? { enquete } : {}), ...(caixa ? { caixa } : {}), ...(link ? { link } : {}), ...(repostDe ? { repostDe } : {}), ...(postDe ? { postDe } : {}),
          ...(mencoes.length ? { mencoes } : {}) }, { imagem });
        if (enquete) registrarEnquete("f_" + ref.id, enquete);
        if (repost && repost.autorId !== eu.uid) mandarMensagem(repost.autorId, msgFlash({ id: ref.id, autorId: eu.uid, nome: dados.nome }, "repost", { original: repost.id }), "Repostou seu flash").catch(() => {});
      }
      fechar();
    } catch (e) {
      toast(erroPublicar(e));
      enviando = false; publicar.disabled = false; publicar.classList.remove("enviando"); publicar.firstChild.textContent = "Compartilhar";
    }
  });
  pintar();
  if (post) {
    // Publicação do Diário: o cartão dela já desenhado, com o selo de quem publicou.
    const tipoPub = post.enquete ? ["enquete", "Enquete"] : post.caixa ? ["caixa", "Caixa de perguntas"] : ["fotos", "Publicação"];
    const selo = el("div", "flash-repost-selo"); selo.append(icone(tipoPub[0], "i xs"), document.createTextNode(`${tipoPub[1]} de ${String(post.nome || "alguém").split(" ")[0]}`));
    palco.appendChild(selo);
    usarFoto(post.imagem).catch((e) => toast(erroAmigavel(e)));
    return;
  }
  if (repost) {
    // Repostar: a foto do flash original, com o selo de quem fez (o original fica creditado).
    const selo = el("div", "flash-repost-selo"); selo.append(icone("raio", "i xs"), document.createTextNode(`Repostando o flash de ${String(repost.nome || "alguém").split(" ")[0]}`));
    palco.appendChild(selo);
    usarFoto(repost.midia).catch((e) => toast(erroAmigavel(e)));
    return;
  }
  // Câmera já liberada antes: abre direto nela (como Instagram e TikTok). Sem permissão: fica a escolha Câmera/Galeria.
  if (configFlash().cameraDireto) navigator.permissions?.query?.({ name: "camera" }).then((p) => { if (p.state === "granted" && modo === "foto" && !foto && !video) abrirCamera(); }).catch(() => {});
}

// Flash de texto: quadro 1080×1920 com o fundo e a letra escolhidos (vira uma foto JPEG).
function desenharTexto(texto, [a, b], letra, cor) {
  const W = 1080, H = 1920;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, W * 0.6, H);
  grad.addColorStop(0, a); grad.addColorStop(1, b);
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  // Brilho suave no alto (dá profundidade ao fundo).
  const luz = g.createRadialGradient(W * 0.25, H * 0.12, 0, W * 0.25, H * 0.12, W * 0.9);
  luz.addColorStop(0, "rgba(255,255,255,.18)"); luz.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = luz; g.fillRect(0, 0, W, H);
  const n = texto.length;
  const tam = n < 40 ? 104 : n < 90 ? 84 : n < 150 ? 68 : 58;
  g.font = letra.css.replace("1em", tam + "px");
  g.fillStyle = cor; g.textAlign = "center"; g.textBaseline = "middle";
  if (letra.sombra) { g.shadowColor = "rgba(255,255,255,.95)"; g.shadowBlur = 36; }
  else { g.shadowColor = "rgba(0,0,0,.18)"; g.shadowBlur = 12; g.shadowOffsetY = 4; }
  const linhas = [];
  const max = W - 180;
  texto.split(/\n/).forEach((par) => {
    let atual = "";
    par.split(/\s+/).forEach((p) => {
      const t = atual ? atual + " " + p : p;
      if (g.measureText(t).width > max && atual) { linhas.push(atual); atual = p; } else atual = t;
    });
    linhas.push(atual);
  });
  const alt = tam * 1.28, y0 = H / 2 - ((linhas.length - 1) * alt) / 2;
  linhas.slice(0, 14).forEach((l, i) => g.fillText(l, W / 2, y0 + i * alt));
  // Marca discreta embaixo.
  g.shadowBlur = 0; g.shadowOffsetY = 0;
  g.font = "700 30px system-ui, sans-serif"; g.fillStyle = cor === "#ffffff" ? "rgba(255,255,255,.55)" : "rgba(0,0,0,.45)";
  g.fillText("⚡ Help Floripa", W / 2, H - 110);
  let q = 0.9, url = c.toDataURL("image/jpeg", q);
  while (url.length > 860000 && q > 0.5) { q -= 0.1; url = c.toDataURL("image/jpeg", q); }
  return url;
}

async function gravar(extra, { imagem = null } = {}) {
  const cfg = configFlash();
  // Escolhas das configurações do Flash vão junto (só o que foge do padrão).
  const escolhas = {
    ...(cfg.respostas !== "todos" ? { respostas: cfg.respostas } : {}),
    ...(cfg.publico === "amigos" ? { publico: "amigos", lista: cfg.amigos.slice(0, 150) } : {}),
    ...(cfg.ocultarDe.length ? { ocultoPara: cfg.ocultarDe.slice(0, 100) } : {})
  };
  const ref = await fb.addDoc(fb.collection(fb.db, "stories"), { autorId: eu.uid, nome: String(dados.nome || "Usuário").slice(0, 80), ...extra, ...escolhas, criadoEm: fb.serverTimestamp() });
  toast(cfg.publico === "amigos" ? "⚡ Flash publicado para os Amigos próximos." : extra.negocios?.length ? `⚡ Flash publicado${extra.perfil === false ? " só" : ""} ${extra.negocios.length === 1 ? "no perfil do negócio" : `em ${extra.negocios.length} perfis de negócio`}${extra.perfil === false ? "" : " e no seu perfil"}! Fica 24 horas.` : "⚡ Flash publicado! Fica 24 horas.");
  // Quem foi mencionado recebe uma mensagem (como no Instagram).
  (extra.mencoes || []).forEach((u) => mandarMensagem(u, msgFlash({ id: ref.id, autorId: eu.uid, nome: dados.nome }, "mencao"), "Mencionou você no flash").catch(() => {}));
  // Salvar no aparelho (Configurações do Flash).
  if (cfg.salvarAparelho && imagem) { const a = document.createElement("a"); a.href = imagem; a.download = `flash-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.jpg`; document.body.appendChild(a); a.click(); a.remove(); }
  carregar();
  const depois = depoisDePublicar; depoisDePublicar = null;
  try { depois?.(); } catch {}
  return ref;
}

// =====================================================
// Configurações do Flash (usuarios/{uid}.flashConfig): quem responde, Amigos próximos, ocultar de, salvar no aparelho.
// =====================================================
export function configFlash() {
  const c = dados.flashConfig || {};
  return {
    respostas: ["todos", "seguindo", "ninguem"].includes(c.respostas) ? c.respostas : "todos",
    publico: c.publico === "amigos" ? "amigos" : "todos",
    amigos: Array.isArray(c.amigos) ? c.amigos : [],
    ocultarDe: Array.isArray(c.ocultarDe) ? c.ocultarDe : [],
    salvarAparelho: !!c.salvarAparelho,
    cameraDireto: c.cameraDireto !== false,           // abre a câmera do app direto (quando já tem permissão)
    somVideo: c.somVideo === true,                    // vídeos dos flashes começam com som
    ondePerfil: c.ondePerfil !== false,               // onde publicar por padrão: seu perfil...
    ondeNegocios: Array.isArray(c.ondeNegocios) ? c.ondeNegocios.slice(0, 4) : [] // ...e estes negócios
  };
}
async function salvarConfigFlash(c) {
  dados.flashConfig = c;
  try { await fb.setDoc(refUsuario, { flashConfig: c }, { merge: true }); } catch (e) { toast("Não foi possível salvar: " + erroAmigavel(e)); }
}
// Configurações do Flash (cartões por assunto): seus flashes agora, quem vê, onde publicar, respostas,
// câmera e vídeo, salvar no aparelho e menções. Tudo em usuarios/{uid}.flashConfig (só a própria pessoa).
export function abrirConfigFlash() {
  const raiz = el("div", "cfg2");
  abrirLista("Configurações do Flash").appendChild(raiz);
  const corpo = raiz;
  let meusNeg = null, ativos = null;
  const pintar = () => {
    const c = configFlash();
    const salvar = async (mud) => { await salvarConfigFlash({ ...configFlash(), ...mud }); pintar(); };
    corpo.replaceChildren();
    const cartao = (ic, cor, titulo, sub) => {
      const k = el("section", "cfg2-card");
      const cab = el("div", "cfg2-cab");
      const t = el("span", "cfg2-ic"); t.style.setProperty("--c", cor); t.appendChild(icone(ic, "i s"));
      const tx = el("div", "cfg2-tx"); tx.append(el("h3", null, titulo)); if (sub) tx.append(el("p", null, sub));
      cab.append(t, tx); k.appendChild(cab); corpo.appendChild(k);
      return k;
    };
    const linha = (rot, sub, dir, fn) => {
      const b = el(fn ? "button" : "div", "cfg2-linha"); if (fn) { b.type = "button"; b.addEventListener("click", fn); }
      const tx = el("span", "tx"); tx.append(el("strong", null, rot)); if (sub) tx.append(el("small", null, sub));
      b.append(tx); if (dir) b.append(dir); return b;
    };
    const chave = (on, fn) => {
      const l = el("label", "switch"); const i = el("input"); i.type = "checkbox"; i.checked = on;
      i.addEventListener("change", () => fn(i.checked)); l.append(i, el("span")); l.addEventListener("click", (e) => e.stopPropagation()); return l;
    };
    const opcoes = (k, valores, atual, fn) => {
      const g = el("div", "cfg2-seg"); g.setAttribute("role", "radiogroup");
      valores.forEach(([v, rot, sub]) => {
        const b = el("button", "cfg2-op" + (v === atual ? " on" : "")); b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(v === atual));
        b.append(el("span", "radio"), el("span", "tx")); b.lastChild.append(el("strong", null, rot)); if (sub) b.lastChild.append(el("small", null, sub));
        b.addEventListener("click", () => { if (v !== atual) fn(v); });
        g.appendChild(b);
      });
      k.appendChild(g);
    };
    const seta = () => icone("avancar", "i xs cfg2-seta");

    // 1) Seus flashes agora
    const k0 = cartao("raio", "#ff8a00", "Seus flashes agora", ativos == null ? "Carregando..." : ativos.length ? `${ativos.length} ${ativos.length === 1 ? "flash no ar" : "flashes no ar"} · somem 24 h depois de publicados` : "Nenhum flash no ar agora.");
    const acoes0 = el("div", "cfg2-acoes");
    if (ativos?.length) { const v = el("button", "btn sec mini", "Ver e quem viu"); v.type = "button"; v.addEventListener("click", () => { fecharLista(); porAutor.set(eu.uid, ativos); abrirVisor(eu.uid, { so: true }); }); acoes0.appendChild(v); }
    const nv = el("button", "btn pri mini", "Novo flash"); nv.type = "button"; nv.addEventListener("click", () => { fecharLista(); abrirCriador(); }); acoes0.appendChild(nv);
    k0.appendChild(acoes0);

    // 2) Quem vê
    const k1 = cartao("olho", "#00adee", "Quem vê os seus flashes", "Vale para os próximos flashes.");
    opcoes(k1, [["todos", "Todos que seguem você"], ["amigos", "Amigos próximos", `${c.amigos.length} ${c.amigos.length === 1 ? "pessoa" : "pessoas"} · anel verde`]], c.publico, (v) => salvar({ publico: v }));
    k1.append(
      linha("Amigos próximos", c.amigos.length ? `${c.amigos.length} na lista` : "Ninguém na lista ainda", seta(), async () => { const l = await escolherPessoas("Amigos próximos", c.amigos); if (l) await salvarConfigFlash({ ...configFlash(), amigos: l }); abrirConfigFlash(); }),
      linha("Ocultar flash de", c.ocultarDe.length ? `${c.ocultarDe.length} ${c.ocultarDe.length === 1 ? "pessoa não vê" : "pessoas não veem"} (e não sabem disso)` : "Ninguém oculto", seta(), async () => { const l = await escolherPessoas("Ocultar flash de", c.ocultarDe); if (l) await salvarConfigFlash({ ...configFlash(), ocultarDe: l }); abrirConfigFlash(); })
    );

    // 3) Onde publicar por padrão (só para quem tem negócio)
    if (meusNeg?.length) {
      const k2 = cartao("loja", "#2fbf71", "Onde publicar por padrão", "Já vem marcado no \"Publicar em\" (dá para mudar em cada flash).");
      const neg = new Set(c.ondeNegocios.filter((id) => meusNeg.some((n) => n.id === id)));
      k2.appendChild(linha("Seu perfil", "Diário e o anel do seu perfil", chave(c.ondePerfil, (on) => { if (!on && !neg.size) { toast("Deixe pelo menos um lugar marcado."); pintar(); return; } salvar({ ondePerfil: on }); })));
      meusNeg.forEach((n) => k2.appendChild(linha(n.nome || "Negócio", "Perfil do negócio", chave(neg.has(n.id), (on) => {
        if (on) neg.add(n.id); else neg.delete(n.id);
        if (!neg.size && !c.ondePerfil) { toast("Deixe pelo menos um lugar marcado."); pintar(); return; }
        salvar({ ondeNegocios: [...neg] });
      }))));
    }

    // 4) Respostas e reações
    const k3 = cartao("chat", "#7c5cff", "Respostas e reações", "Chegam no Mensagens como cartão do flash.");
    opcoes(k3, [["todos", "Todos que veem"], ["seguindo", "Só quem você segue"], ["ninguem", "Ninguém", "Desliga respostas e reações"]], c.respostas, (v) => salvar({ respostas: v }));

    // 5) Câmera e vídeo
    const k4 = cartao("camera", "#ff3d7f", "Câmera e vídeo");
    k4.append(
      linha("Abrir a câmera direto", "Ao criar um flash, já abre a câmera do app (se você deu permissão)", chave(c.cameraDireto, (on) => salvar({ cameraDireto: on }))),
      linha("Vídeos com som", "Os vídeos dos flashes começam com o som ligado", chave(c.somVideo, (on) => salvar({ somVideo: on })))
    );

    // 6) Salvar no aparelho
    const k5 = cartao("imagem", "#f5b301", "Salvar no aparelho");
    k5.appendChild(linha("Salvar automaticamente", "Guarda uma cópia de cada flash de foto ou texto que você publicar", chave(c.salvarAparelho, (on) => salvar({ salvarAparelho: on }))));

    // 7) Menções
    const k6 = cartao("pessoa-mais", "#00adee", "Menções", "Quem pode mencionar você nos flashes e publicações.");
    const a = el("a", "cfg2-linha"); a.href = "configuracoes.html#diario";
    a.append(el("span", "tx"), seta()); a.firstChild.append(el("strong", null, "Quem pode mencionar você"), el("small", null, "Ajuste em Configurações → Diário e Flash"));
    k6.appendChild(a);

    corpo.appendChild(el("p", "cfg2-nota", "As escolhas valem para os próximos flashes. Os que já estão no ar continuam como foram publicados."));
  };
  const fecharLista = () => $("folhaLista")?.querySelector("[data-fechar]")?.click();
  pintar();
  // Dados que precisam de leitura: seus flashes no ar e os seus negócios.
  fb.getDocs(fb.query(fb.collection(fb.db, "stories"), fb.where("autorId", "==", eu.uid), fb.limit(30))).then((x) => {
    ativos = x.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })).filter(ativo).sort((a, b) => ms(a.criadoEm) - ms(b.criadoEm));
    if (corpo.isConnected) pintar();
  }).catch(() => { ativos = []; if (corpo.isConnected) pintar(); });
  fb.getDocs(fb.query(fb.collection(fb.db, "negocios"), fb.where("donoId", "==", eu.uid), fb.limit(8))).then((x) => {
    meusNeg = x.docs.map((d) => ({ id: d.id, ...d.data() })).filter((n) => PAGINA_NEGOCIO[n.tipo] && /^[A-Za-z0-9]+_(servicos|delivery|lojinha|imoveis|saude)$/.test(n.id));
    if (meusNeg.length && corpo.isConnected) pintar();
  }).catch(() => {});
}
// Escolher pessoas (entre quem segue você e quem você segue). Devolve a lista nova ou null se fechar sem concluir.
function escolherPessoas(titulo, atuais) {
  return new Promise(async (resolver) => {
    const corpo = abrirLista(titulo);
    const sel = new Set(atuais);
    const busca = el("input", "busca-enviar"); busca.type = "search"; busca.placeholder = "Buscar pessoas"; busca.setAttribute("aria-label", "Buscar pessoas");
    const box = el("div");
    const ok = el("button", "btn pri", "Concluir"); ok.type = "button"; ok.style.width = "100%"; ok.style.marginTop = "10px";
    corpo.append(busca, box, ok);
    box.appendChild(el("div", "lista-vazia", "Carregando..."));
    let concluiu = false;
    const f = $("folhaLista");
    const aoFechar = () => { f?.removeEventListener("fechada", aoFechar); if (!concluiu) resolver(null); };
    f?.addEventListener("fechada", aoFechar);
    ok.addEventListener("click", () => { concluiu = true; resolver([...sel]); f?.querySelector("[data-fechar]")?.click(); });
    const seg = await fb.getDocs(fb.query(fb.collection(fb.db, "relacoes"), fb.where("tipo", "==", "seguir"), fb.where("alvoId", "==", eu.uid), fb.limit(300))).catch(() => ({ docs: [] }));
    const uids = [...new Set([...atuais, ...seg.docs.map((d) => d.data().seguidorId), ...meusSeguindo])].filter((u) => u && u !== eu.uid && !escondido(u)).slice(0, 300);
    const pessoas = await Promise.all(uids.map(async (u) => ({ uid: u, ...(await obterPerfil(u).catch(() => ({}))) })));
    const pintarL = () => {
      const q = busca.value.trim().toLowerCase();
      box.replaceChildren();
      const l = pessoas.filter((p) => !q || String(p.nome || "").toLowerCase().includes(q) || String(p.nickname || "").includes(q));
      if (!l.length) { box.appendChild(el("div", "lista-vazia", "Ninguém por aqui ainda.")); return; }
      l.sort((a, b) => sel.has(b.uid) - sel.has(a.uid)).forEach((p) => box.appendChild(linhaPessoa({ uid: p.uid, nome: p.nome, foto: p.fotoPerfil, sub: p.nickname ? "@" + p.nickname : "", semSeguir: true,
        acoes: [{ rotulo: sel.has(p.uid) ? "✓ Na lista" : "Adicionar", classe: sel.has(p.uid) ? "sec" : "pri", fn: () => { if (sel.has(p.uid)) sel.delete(p.uid); else sel.add(p.uid); pintarL(); } }], aoClicar: () => {} })));
    };
    busca.addEventListener("input", pintarL);
    pintarL();
  });
}

// Enviar um flash para alguém: quem você segue e com quem conversou por último.
async function enviarFlash(s, aoFechar) {
  const corpo = abrirLista("Enviar flash");
  const f = $("folhaLista"); const volta = () => { f?.removeEventListener("fechada", volta); aoFechar?.(); }; f?.addEventListener("fechada", volta);
  const busca = el("input", "rel-busca-campo"); busca.type = "search"; busca.placeholder = "Buscar pessoas"; busca.setAttribute("aria-label", "Buscar pessoas");
  const box = el("div");
  corpo.append(busca, box);
  box.appendChild(el("div", "lista-vazia", "Carregando..."));
  const conv = await fb.getDocs(fb.query(fb.collection(fb.db, "conversas"), fb.where("participantes", "array-contains", eu.uid), fb.limit(40))).catch(() => ({ docs: [] }));
  const recentes = conv.docs.map((d) => d.data()).sort((a, b) => ms(b.atualizadoEm) - ms(a.atualizadoEm)).map((c) => (c.participantes || []).find((u) => u !== eu.uid)).filter(Boolean);
  const uids = [...new Set([...recentes, ...meusSeguindo])].filter((u) => u && u !== eu.uid && u !== s.autorId && !escondido(u)).slice(0, 80);
  const pessoas = await Promise.all(uids.map(async (u) => ({ uid: u, ...(await obterPerfil(u).catch(() => ({}))) })));
  const pintarL = () => {
    const q = busca.value.trim().toLowerCase().replace(/^@/, "");
    const l = pessoas.filter((p) => !q || String(p.nome || "").toLowerCase().includes(q) || String(p.nickname || "").toLowerCase().includes(q));
    box.replaceChildren(...(l.length ? l.map((p) => linhaPessoa({ uid: p.uid, nome: p.nome, foto: p.fotoPerfil, sub: p.nickname ? "@" + p.nickname : "", semSeguir: true, aoClicar: () => {},
      acoes: [{ rotulo: "Enviar", classe: "pri", fn: async (b) => {
        if (b.dataset.enviado) return;
        try { await mandarMensagem(p.uid, msgFlash(s, "enviar"), `Flash de ${String(s.nome || "alguém").split(" ")[0]}`); b.dataset.enviado = "1"; b.textContent = "Enviado ✓"; b.classList.replace("pri", "sec"); }
        catch (e) { if (e?.message !== "e-mail") toast("Não foi possível enviar: " + erroAmigavel(e)); }
      } }] })) : [el("div", "lista-vazia", q ? "Ninguém encontrado." : "Siga pessoas ou converse com alguém para enviar.")]));
  };
  busca.addEventListener("input", pintarL);
  pintarL();
}

// =====================================================
// Ver (tela cheia)
// =====================================================
function abrirVisor(uidInicial, { so = false, aoFechar = null, comecarEm = null } = {}) {
  const ordem = so ? [uidInicial] : [eu.uid, ...ordemAutores()].filter((u) => porAutor.get(u)?.length);
  let ai = Math.max(0, ordem.indexOf(uidInicial)), si = 0;
  // Começa no primeiro flash ainda não visto desse autor.
  const inicioDo = (u) => { const l = porAutor.get(u) || []; const k = l.findIndex((x) => !vistosLocal.has(x.id)); return k < 0 ? 0 : k; };
  si = inicioDo(ordem[ai]);
  if (comecarEm) { const k = (porAutor.get(ordem[ai]) || []).findIndex((x) => x.id === comecarEm); if (k >= 0) si = k; }
  const fundo = el("div", "story-visor"); fundo.setAttribute("role", "dialog"); fundo.setAttribute("aria-modal", "true"); fundo.setAttribute("aria-label", "Flash");
  const caixa = el("div", "story-caixa");
  const barras = el("div", "story-barras");
  const topo = el("div", "story-topo");
  const av = el("span", "avatar"); const nome = el("strong"); const quando = el("small");
  const bSom = el("button", "story-btn"); bSom.type = "button"; bSom.setAttribute("aria-label", "Ligar o som"); bSom.textContent = "🔇"; bSom.hidden = true;
  const bMais = el("button", "story-btn"); bMais.type = "button"; bMais.setAttribute("aria-label", "Opções"); bMais.appendChild(icone("pontos", "i s"));
  const bX = el("button", "story-btn"); bX.type = "button"; bX.setAttribute("aria-label", "Fechar"); bX.appendChild(icone("fechar", "i s"));
  const quem = el("div", "story-quem"); const txtQuem = el("div");
  const chip = el("span", "story-chip"); chip.append(icone("raio", "i xs"), document.createTextNode("Flash"));
  const linhaNome = el("div", "story-nome"); linhaNome.append(nome, chip);
  txtQuem.append(linhaNome, quando); quem.append(av, txtQuem);
  // Enviar o flash para alguém (vai como cartão no Mensagens)
  const bEnv = el("button", "story-btn"); bEnv.type = "button"; bEnv.setAttribute("aria-label", "Enviar este flash"); bEnv.title = "Enviar"; bEnv.appendChild(icone("enviar", "i s"));
  topo.append(quem, bSom, bEnv, bMais, bX);
  const palco = el("div", "story-palco");
  const legenda = el("div", "story-legenda");
  const rodape = el("div", "story-rodape");
  const esq = el("button", "story-toque esq"); esq.type = "button"; esq.setAttribute("aria-label", "Anterior");
  const dir = el("button", "story-toque dir"); dir.type = "button"; dir.setAttribute("aria-label", "Próximo");
  caixa.append(palco, el("div", "story-sombra"), legenda, esq, dir, barras, topo, rodape);
  fundo.appendChild(caixa);
  document.body.appendChild(fundo);
  document.body.classList.add("travado");
  let timer = null, inicio = 0, restante = 0, pausado = false, video = null, digitando = false, fechado = false;
  const fechar = () => {
    if (fechado) return; fechado = true;
    clearTimeout(timer); video?.pause(); fundo.remove(); document.body.classList.remove("travado");
    document.removeEventListener("keydown", tecla, true); document.removeEventListener("visibilitychange", aoEsconder);
    pintarBarra(); aoFechar?.();
  };
  const atual = () => porAutor.get(ordem[ai])?.[si];

  // Rodapé de quem vê: responder (vai para o Mensagens) e reações rápidas.
  const form = el("form", "story-responder");
  const campo = el("input"); campo.type = "text"; campo.maxLength = 300; campo.setAttribute("aria-label", "Responder");
  const bEnviar = el("button", "story-env"); bEnviar.type = "submit"; bEnviar.setAttribute("aria-label", "Enviar"); bEnviar.appendChild(icone("enviar", "i s"));
  const bRaio = el("button", "story-raio", "⚡"); bRaio.type = "button"; bRaio.setAttribute("aria-label", "Reagir com um raio");
  form.append(campo, bEnviar, bRaio);
  const bandeja = el("div", "story-bandeja"); bandeja.setAttribute("aria-label", "Reações rápidas");
  REACOES.forEach((r) => { const b = el("button", null, r); b.type = "button"; b.setAttribute("aria-label", "Reagir com " + r); b.addEventListener("pointerdown", (e) => e.preventDefault()); b.addEventListener("click", () => reagir(r, b)); bandeja.appendChild(b); });

  // Resposta e reação vão como cartão do flash no Mensagens (com a miniatura enquanto ele existir).
  async function enviarResposta(acao, extra, resumo) {
    const s = atual(); if (!s) return false;
    try { await mandarMensagem(s.autorId, msgFlash(s, acao, extra), resumo); return true; }
    catch (e) { if (e?.message !== "e-mail") toast("Não foi possível enviar: " + erroAmigavel(e)); return false; }
  }
  async function reagir(r, origem) {
    voarEmoji(r, origem);
    navigator.vibrate?.(8);
    if (await enviarResposta("reacao", { emoji: r }, `Reagiu ao seu flash: ${r}`)) toast("Reação enviada");
  }
  function voarEmoji(r, origem) {
    const box = caixa.getBoundingClientRect(), o = origem?.getBoundingClientRect?.() || { left: box.left + box.width / 2, top: box.bottom - 80, width: 0 };
    for (let k = 0; k < 7; k++) {
      const e = el("span", "story-voa", r);
      e.style.left = (o.left - box.left + o.width / 2 + (Math.random() - 0.5) * 120) + "px";
      e.style.top = (o.top - box.top) + "px";
      e.style.animationDelay = k * 70 + "ms";
      e.style.setProperty("--dx", (Math.random() - 0.5) * 140 + "px");
      caixa.appendChild(e);
      setTimeout(() => e.remove(), 1700 + k * 70);
    }
  }
  bRaio.addEventListener("click", () => reagir("⚡", bRaio));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const t = campo.value.trim(); if (!t) return;
    bEnviar.disabled = true;
    if (await enviarResposta("resposta", { texto: t.slice(0, 300) }, `Respondeu ao seu flash: ${t}`)) { campo.value = ""; toast("Resposta enviada pelo Mensagens"); campo.blur(); }
    bEnviar.disabled = false;
  });
  campo.addEventListener("focus", () => { digitando = true; caixa.classList.add("digitando"); pausar(true); });
  campo.addEventListener("blur", () => { digitando = false; setTimeout(() => { if (!digitando) { caixa.classList.remove("digitando"); pausar(false); } }, 150); });

  function mostrar(dirAnim = 0) {
    if (fechado) return;
    clearTimeout(timer); video?.pause(); video = null;
    const lista = porAutor.get(ordem[ai]) || [];
    const s = lista[si]; if (!s) { fechar(); return; }
    const meu = s.autorId === eu.uid;
    pausado = false; caixa.classList.remove("pausado");
    if (dirAnim) { caixa.classList.remove("vai-dir", "vai-esq"); void caixa.offsetWidth; caixa.classList.add(dirAnim > 0 ? "vai-dir" : "vai-esq"); }
    barras.replaceChildren(...lista.map((_, k) => { const b = el("span", "story-barra"); const i = el("i"); if (k < si) i.style.width = "100%"; b.appendChild(i); return b; }));
    obterPerfil(s.autorId).then((p) => {
      nome.textContent = meu ? "Seu flash" : (p.nome || s.nome || "Usuário");
      campo.placeholder = `Responder a ${String(p.nome || s.nome || "").split(" ")[0] || "esta pessoa"}...`;
      pintarAvatar(av, p.fotoPerfil, p.nome || s.nome);
    }).catch(() => { nome.textContent = s.nome || "Usuário"; });
    quando.textContent = tempoRelativo(new Date(ms(s.criadoEm) || Date.now()));
    palco.replaceChildren();
    legenda.textContent = s.texto || ""; legenda.hidden = !s.texto;
    rodape.replaceChildren();
    // Enquete por cima do flash, no lugar escolhido (quem vê vota; o autor vê o resultado).
    caixa.querySelector(".story-enq")?.remove();
    const enq = blocoEnquete(s, { tipo: "f", escura: true });
    if (enq) {
      const w = el("div", "story-enq"); w.style.left = `${(s.enquete.x ?? 0.5) * 100}%`; w.style.top = `${(s.enquete.y ?? 0.6) * 100}%`;
      w.appendChild(enq); caixa.appendChild(w);
      ["pointerdown", "pointerup", "click"].forEach((ev) => w.addEventListener(ev, (e) => e.stopPropagation()));
    }
    // Caixa de perguntas por cima do flash (quem vê responde; o autor vê as respostas).
    caixa.querySelector(".story-cx")?.remove();
    const cx = blocoCaixa(s, { tipo: "f", escura: true });
    if (cx) {
      const w = el("div", "story-enq story-cx"); w.style.left = `${(s.caixa.x ?? 0.5) * 100}%`; w.style.top = `${(s.caixa.y ?? 0.42) * 100}%`;
      w.appendChild(cx); caixa.appendChild(w);
      ["pointerdown", "pointerup", "click", "keydown"].forEach((ev) => w.addEventListener(ev, (e) => e.stopPropagation()));
      // escrever a resposta (ou abrir as respostas) pausa o flash
      const t = cx.querySelector("textarea");
      t?.addEventListener("focus", () => { digitando = true; pausar(true); });
      t?.addEventListener("blur", () => { digitando = false; setTimeout(() => { if (!digitando) pausar(false); }, 150); });
      cx.querySelector(".cx-ver")?.addEventListener("click", () => {
        pausar(true);
        const f = $("folhaLista"); const volta = () => { f?.removeEventListener("fechada", volta); if (document.querySelector(".story-visor")) document.body.classList.add("travado"); pausar(false); }; f?.addEventListener("fechada", volta);
      });
    }
    // Uma linha só para "1 pessoa mencionada" e "Adicionar ao seu flash" (não empilham por cima da foto).
    const linhaAcoes = () => rodape.querySelector(".story-linha-acoes") || rodape.appendChild(el("div", "story-linha-acoes"));
    // Repost: crédito de quem fez o flash original (tocar abre o perfil).
    topo.querySelector(".story-repost")?.remove();
    if (s.repostDe?.autorId) {
      const r = el("button", "story-repost"); r.type = "button";
      r.append(icone("raio", "i xs"), document.createTextNode(`Flash de ${String(s.repostDe.nome || "alguém").split(" ")[0]}`));
      r.addEventListener("click", (e) => { e.stopPropagation(); fechar(); ganchos.abrirPerfil(s.repostDe.autorId); });
      txtQuem.appendChild(r);
    }
    // Também nos perfis de negócio (o dono escolheu ao publicar)
    topo.querySelector(".story-onde")?.remove();
    if (Array.isArray(s.negocios) && s.negocios.length) {
      const o = el("span", "story-repost story-onde"); o.append(icone("loja", "i xs"), document.createTextNode(`${s.perfil === false ? "Só no" : "Também no"} perfil ${s.negocios.length === 1 ? "do negócio" : `de ${s.negocios.length} negócios`}`));
      txtQuem.appendChild(o);
    }
    // Publicação do Diário compartilhada: botão para abrir a publicação original (crédito ao autor).
    caixa.querySelector(".story-post")?.remove();
    if (s.postDe?.postId) {
      const a = el("a", "story-link story-post"); a.href = `usuarios.html?post=${encodeURIComponent(s.postDe.postId)}`;
      a.style.left = "50%"; a.style.top = "86%";
      a.append(icone("fotos", "i s"), el("span", null, s.postDe.autorId === s.autorId ? "Ver publicação" : `Ver publicação de ${String(s.postDe.nome || "").split(" ")[0] || "quem publicou"}`), icone("avancar", "i xs"));
      ["pointerdown", "pointerup"].forEach((ev) => a.addEventListener(ev, (e) => e.stopPropagation()));
      a.addEventListener("click", (e) => { e.stopPropagation(); pausar(true); });
      caixa.appendChild(a);
    }
    // Link para o perfil de um negócio (figurinha): tocar vai para o perfil.
    caixa.querySelector(".story-link:not(.story-post)")?.remove();
    if (s.link?.negocioId && PAGINA_NEGOCIO[s.link.tipo]) {
      const a = el("a", "story-link"); a.href = linkNegocio(s.link);
      a.style.left = `${(s.link.x ?? 0.5) * 100}%`; a.style.top = `${(s.link.y ?? 0.68) * 100}%`;
      a.append(icone(ICONE_NEGOCIO[s.link.tipo] || "loja", "i s"), el("span", null, s.link.nome || "Ver o negócio"), icone("avancar", "i xs"));
      a.setAttribute("aria-label", `Abrir o perfil de ${s.link.nome || "negócio"}`);
      ["pointerdown", "pointerup"].forEach((ev) => a.addEventListener(ev, (e) => e.stopPropagation()));
      a.addEventListener("click", (e) => { e.stopPropagation(); pausar(true); });
      caixa.appendChild(a);
    }
    // Fui mencionado: posso repostar no meu flash.
    if (!meu && Array.isArray(s.mencoes) && s.mencoes.includes(eu.uid) && s.tipo !== "video") {
      const rp = el("button", "story-repostar"); rp.type = "button";
      rp.append(icone("mais", "i xs"), document.createTextNode("Adicionar ao seu flash"));
      rp.addEventListener("click", (e) => { e.stopPropagation(); fechar(); abrirCriador({ repost: s }); });
      linhaAcoes().appendChild(rp);
    }
    // Pessoas mencionadas: chip que abre a lista (tocar leva ao perfil).
    if (Array.isArray(s.mencoes) && s.mencoes.length) {
      const bm = el("button", "story-mencoes"); bm.type = "button";
      bm.append(icone("pessoa-mais", "i xs"), document.createTextNode(s.mencoes.length === 1 ? "1 pessoa mencionada" : `${s.mencoes.length} pessoas mencionadas`));
      bm.addEventListener("click", async (e) => {
        e.stopPropagation(); pausar(true);
        const corpoL = abrirLista("Mencionados");
        const f = $("folhaLista"); const volta = () => { f?.removeEventListener("fechada", volta); if (document.querySelector(".story-visor")) document.body.classList.add("travado"); pausar(false); }; f?.addEventListener("fechada", volta);
        const ps = await Promise.all(s.mencoes.map((u) => obterPerfil(u).then((p) => ({ uid: u, ...p })).catch(() => ({ uid: u }))));
        ps.forEach((p) => corpoL.appendChild(linhaPessoa({ uid: p.uid, nome: p.nome || "Usuário", foto: p.fotoPerfil, sub: p.nickname ? "@" + p.nickname : "" })));
      });
      linhaAcoes().prepend(bm);
    }
    if (meu) {
      const v = el("button", "story-vistos"); v.type = "button";
      const rostos = el("span", "rostos");
      v.append(icone("olho", "i xs"), el("span", null, "Visualizações"), rostos);
      v.addEventListener("click", (e) => { e.stopPropagation(); pausar(true); verQuemViu(s, () => pausar(false)); });
      rodape.appendChild(v);
      // Quantas pessoas viram e as 3 últimas fotos.
      fb.getDocs(fb.query(fb.collection(fb.db, "stories", s.id, "vistos"), fb.limit(300))).then((x) => {
        v.children[1].textContent = x.size ? `Visto por ${x.size}` : "Ninguém viu ainda";
        x.docs.sort((a, b) => ms(b.data().criadoEm) - ms(a.data().criadoEm)).slice(0, 3).forEach((d) => {
          const r = el("span", "avatar"); rostos.appendChild(r);
          obterPerfil(d.id).then((p) => pintarAvatar(r, p.fotoPerfil, p.nome)).catch(() => {});
        });
      }).catch(() => {});
    } else {
      // Respostas: conforme a escolha do autor (todos, só quem ele segue, ninguém).
      if (s.respostas === "ninguem") rodape.appendChild(el("p", "story-sem-resposta", "Respostas desativadas"));
      else if (s.respostas === "seguindo") {
        rodape.append(bandeja, form); form.hidden = true; bandeja.hidden = true;
        autorMeSegue(s.autorId).then((ok) => { if (atual() !== s) return; form.hidden = !ok; bandeja.hidden = !ok; if (!ok) rodape.appendChild(el("p", "story-sem-resposta", "Só quem essa pessoa segue pode responder")); });
      } else { rodape.append(bandeja, form); form.hidden = false; bandeja.hidden = false; }
    }
    bSom.hidden = s.tipo !== "video";
    if (s.tipo === "video") {
      video = document.createElement("video"); video.src = s.midia; video.playsInline = true; video.autoplay = true; video.muted = somDesligado;
      video.addEventListener("ended", proximo);
      video.addEventListener("loadedmetadata", () => animarBarra((video.duration || 15) * 1000));
      video.play().catch(() => { video.muted = somDesligado = true; pintarSom(); video.play().catch(() => {}); });
      pintarSom();
      palco.appendChild(video);
    } else {
      const img = document.createElement("img"); img.src = s.midia; img.alt = s.texto || `Flash de ${nome.textContent || "alguém"}`; img.decoding = "async";
      palco.appendChild(img);
      animarBarra(TEMPO_FOTO);
      timer = setTimeout(proximo, TEMPO_FOTO);
      inicio = Date.now(); restante = TEMPO_FOTO;
    }
    // Já carrega o próximo (troca sem piscar).
    const prox = lista[si + 1] || porAutor.get(ordem[ai + 1])?.[0];
    if (prox && prox.tipo !== "video") { const pre = new Image(); pre.src = prox.midia; }
    // Visto (no aparelho e para o autor contar)
    if (!vistosLocal.has(s.id)) { vistosLocal.add(s.id); guardarVistos(); }
    if (!meu) fb.setDoc(fb.doc(fb.db, "stories", s.id, "vistos", eu.uid), { criadoEm: fb.serverTimestamp() }).catch(() => {});
  }
  let somDesligado = !configFlash().somVideo;
  const pintarSom = () => { bSom.textContent = somDesligado ? "🔇" : "🔊"; bSom.setAttribute("aria-label", somDesligado ? "Ligar o som" : "Desligar o som"); };
  bSom.addEventListener("click", (e) => { e.stopPropagation(); somDesligado = !somDesligado; if (video) video.muted = somDesligado; pintarSom(); });
  function animarBarra(dur) {
    const i = barras.children[si]?.firstChild; if (!i) return;
    i.style.transition = "none"; i.style.width = "0%";
    requestAnimationFrame(() => requestAnimationFrame(() => { if (pausado) return; i.style.transition = `width ${dur}ms linear`; i.style.width = "100%"; }));
  }
  function proximo() {
    const lista = porAutor.get(ordem[ai]) || [];
    if (si < lista.length - 1) { si++; mostrar(); return; }
    proximoAutor();
  }
  function proximoAutor() {
    if (ai < ordem.length - 1) { ai++; si = inicioDo(ordem[ai]); mostrar(1); return; }
    fechar();
  }
  function anterior() {
    if (si > 0) { si--; mostrar(); return; }
    anteriorAutor();
  }
  function anteriorAutor() {
    if (ai > 0) { ai--; si = 0; mostrar(-1); return; }
    mostrar();
  }
  function pausar(sim) {
    if (fechado || sim === pausado) return;
    if (!sim && (digitando || document.querySelector(".folha.aberta"))) return;
    pausado = sim;
    caixa.classList.toggle("pausado", sim);
    const i = barras.children[si]?.firstChild;
    if (sim) {
      clearTimeout(timer); video?.pause();
      if (i) { const w = getComputedStyle(i).width; i.style.transition = "none"; i.style.width = w; }
      if (!video) restante = Math.max(300, restante - (Date.now() - inicio));
    } else {
      if (video) { video.play().catch(() => {}); if (i) { i.style.transition = `width ${Math.max(200, ((video.duration || 15) - video.currentTime) * 1000)}ms linear`; i.style.width = "100%"; } }
      else { inicio = Date.now(); timer = setTimeout(proximo, restante); if (i) { i.style.transition = `width ${restante}ms linear`; i.style.width = "100%"; } }
    }
  }
  // Toques: direita = próximo, esquerda = anterior; segurar = pausa e esconde o que está por cima da foto.
  let segurou = false, tSeg = null, arrastou = false;
  [esq, dir].forEach((b) => {
    b.addEventListener("pointerdown", () => { segurou = false; arrastou = false; tSeg = setTimeout(() => { segurou = true; pausar(true); caixa.classList.add("limpo"); }, 220); });
    b.addEventListener("pointerup", () => {
      clearTimeout(tSeg); caixa.classList.remove("limpo");
      if (segurou) { segurou = false; pausar(false); return; }
      if (arrastou) return;
      (b === dir ? proximo : anterior)();
    });
    b.addEventListener("pointerleave", () => { clearTimeout(tSeg); caixa.classList.remove("limpo"); if (segurou) { segurou = false; pausar(false); } });
    b.addEventListener("pointercancel", () => { clearTimeout(tSeg); caixa.classList.remove("limpo"); if (segurou) { segurou = false; pausar(false); } });
    b.addEventListener("click", (e) => { if (e.detail === 0) (b === dir ? proximo : anterior)(); }); // teclado
  });
  bX.addEventListener("click", fechar);
  bEnv.addEventListener("click", (e) => { e.stopPropagation(); const s = atual(); if (!s) return; pausar(true); enviarFlash(s, () => { if (document.querySelector(".story-visor")) document.body.classList.add("travado"); pausar(false); }); });
  bMais.addEventListener("click", () => {
    const s = atual(); if (!s) return;
    pausar(true);
    const meu = s.autorId === eu.uid;
    abrirOpcoes("Flash", [
      meu && { rotulo: "Apagar este flash", icone: "lixo", perigo: true, fn: async () => {
        if (!await confirmarHF({ titulo: "Apagar este flash?", texto: "Ele some para todo mundo.", ok: "Apagar", icone: "lixo" })) return;
        try { await fb.deleteDoc(fb.doc(fb.db, "stories", s.id)); const l = porAutor.get(s.autorId); l.splice(si, 1); if (!l.length) porAutor.delete(s.autorId); toast("Flash apagado"); if (!porAutor.get(s.autorId)) fechar(); else { si = Math.min(si, l.length - 1); mostrar(); } }
        catch (e) { toast("Não foi possível apagar: " + erroAmigavel(e)); }
      } },
      meu && { rotulo: "Novo flash", icone: "camera", fn: () => { fechar(); abrirCriador(); } },
      !meu && { rotulo: "Ver perfil", icone: "olho", fn: () => { fechar(); ganchos.abrirPerfil(s.autorId); } },
      !meu && { rotulo: silenciado(s.autorId) ? "Mostrar os flashes de novo" : "Silenciar esta pessoa", sub: "Continua seguindo, mas não vê os flashes e as publicações dela", icone: "restringir", fn: async () => { await alternarSilenciar(s.autorId, nome.textContent); fechar(); carregar(); } }
    ]);
    const volta = () => { document.body.classList.add("travado"); pausar(false); $("folhaOpcoes")?.removeEventListener("fechada", volta); };
    $("folhaOpcoes")?.addEventListener("fechada", volta);
  });
  const tecla = (e) => {
    if (digitando) { if (e.key === "Escape") campo.blur(); return; }
    if (document.querySelector(".folha.aberta")) return;
    if (e.key === "Escape") fechar(); else if (e.key === "ArrowRight") proximo(); else if (e.key === "ArrowLeft") anterior(); else if (e.key === " ") { e.preventDefault(); pausar(!pausado); }
  };
  // Antes do Esc das folhas (rede.js): com uma folha aberta, o Esc fecha só a folha.
  document.addEventListener("keydown", tecla, true);
  const aoEsconder = () => { if (document.hidden) pausar(true); else pausar(false); };
  document.addEventListener("visibilitychange", aoEsconder);
  // Arrastar: para baixo fecha; para o lado troca de pessoa; para cima (no seu) mostra quem viu.
  let x0 = null, y0 = null;
  caixa.addEventListener("touchstart", (e) => { if (e.target.closest("form, .story-bandeja")) { x0 = null; return; } x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  caixa.addEventListener("touchmove", (e) => { if (x0 != null && (Math.abs(e.touches[0].clientX - x0) > 12 || Math.abs(e.touches[0].clientY - y0) > 12)) arrastou = true; }, { passive: true });
  caixa.addEventListener("touchend", (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (dy > 110 && Math.abs(dy) > Math.abs(dx)) { fechar(); return; }
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy)) { clearTimeout(tSeg); segurou = false; caixa.classList.remove("limpo"); if (dx < 0) proximoAutor(); else anteriorAutor(); return; }
    if (dy < -90 && atual()?.autorId === eu.uid) { pausar(true); verQuemViu(atual(), () => pausar(false)); }
  }, { passive: true });
  mostrar();
}
async function verQuemViu(s, aoFechar) {
  const corpo = abrirLista("Quem viu");
  const f = $("folhaLista");
  const volta = () => { f?.removeEventListener("fechada", volta); if (document.querySelector(".story-visor")) document.body.classList.add("travado"); aoFechar?.(); };
  f?.addEventListener("fechada", volta);
  corpo.appendChild(el("div", "lista-vazia", "Carregando..."));
  try {
    const v = await fb.getDocs(fb.query(fb.collection(fb.db, "stories", s.id, "vistos"), fb.limit(300)));
    corpo.replaceChildren();
    if (!v.size) { corpo.appendChild(el("div", "lista-vazia", "Ninguém viu ainda.")); return; }
    corpo.appendChild(el("div", "grupo-titulo", `${v.size} ${v.size === 1 ? "pessoa viu" : "pessoas viram"} · respostas e reações chegam no Mensagens`));
    const l = v.docs.map((d) => ({ uid: d.id, quando: ms(d.data().criadoEm) })).sort((a, b) => b.quando - a.quando);
    const perfis = await Promise.all(l.map((x) => obterPerfil(x.uid).catch(() => ({}))));
    l.forEach((x, i) => corpo.appendChild(linhaPessoa({ uid: x.uid, nome: perfis[i].nome || "Usuário", foto: perfis[i].fotoPerfil, sub: tempoRelativo(new Date(x.quando || Date.now())) })));
  } catch (e) { corpo.replaceChildren(el("div", "lista-vazia", "Não foi possível carregar: " + erroAmigavel(e))); }
}
