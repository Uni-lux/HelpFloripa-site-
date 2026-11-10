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
  meusSeguindo, meusSeguindoPronto, escondido, silenciado, alternarSilenciar, obterPerfil, abrirOpcoes, abrirLista, linhaPessoa, pessoasEmPilha,
  salvarImagem, mandarMensagem, ganchos, confirmarHF, nomeCidade, blocoEnquete, refUsuario, podeMarcar, registrarEnquete, blocoCaixa,
  fotosDoPost, urlSegura, lerResumosEstrelas, escolherLocal as escolherLugar, CORES_FIG, temaFig, comMencoes, uidsMencionados,
  responderNoChat, cartaoRespostaCaixa, fecharFolha, ajudaPublico
} from "./rede.js?v=136";
import { FILTROS, semFiltro, aplicarFiltro, imagemFiltrada, FiltroGL } from "./filtros-foto.js?v=3";
import { lerPlano, nivelPlano } from "./planos-base.js?v=15";
import { combinaPublico, leitorDe, temPublico, resumoPublico, publicoParaGravar } from "./publico-alvo.js?v=1";
import { escolherPublico } from "./publico-tela.js?v=6";
import { lerLocal } from "./local-escolhido.js?v=3";
import { comRitmo } from "./ritmo.js?v=3";
import { flashesDoNegocio, avisarFlashNegocio } from "./flash-negocio.js?v=21";
import { minhaPosicao } from "./perto.js?v=3";
import { lerFlashTexto, pegarGuardado } from "./flash-direto.js?v=1";
import { fimEscolhido, MAX_FLASH_MIN, fimDaEnquete, encerrada, faltaTexto, resultadoFinal, lerContasEnquete } from "./enquetes.js?v=7";

const DIA = 24 * 3600e3;
const TEMPO_FOTO = 5000;
// Mais tempo quando tem o que ler ou responder (enquete, perguntas, publicação, link ou legenda longa).
// Tempo na tela (como no Instagram): foto 5 s; com enquete, perguntas, publicação ou link 10 s; legenda longa +3 s
// (no máximo 15 s). Vídeo: o tempo dele (até 1 min).
const tempoDoFlash = (s) => Math.min(15000, TEMPO_FOTO + (s.enquete || s.caixa || s.contagem || s.postDe || s.link ? 5000 : 0) + (String(s.texto || "").length > 80 ? 3000 : 0));
const REACOES = ["🔥", "😍", "😂", "😮", "👏", "💯"];
// Estrela (curtir o flash, como o coração do Instagram): stories/{id}/reacoes/{uid} {curtiu, emoji, em}. O autor vê
// quem deu a estrela e quem reagiu na lista de visualizações. Guardada também no aparelho (não lê de novo a cada flash).
// Guardados no aparelho POR CONTA (antes era um só para o aparelho: entrar com outra conta mostrava os flashes
// como já vistos e as estrelas como já dadas).
function conjuntoDaConta(base, max) {
  let dono, set = new Set();
  const atual = () => {
    if (dono !== eu?.uid) { dono = eu?.uid; try { set = new Set(dono ? JSON.parse(localStorage.getItem(`${base}-${dono}`) || "[]") : []); } catch { set = new Set(); } }
    return set;
  };
  return {
    has: (x) => atual().has(x), add: (x) => atual().add(x), delete: (x) => atual().delete(x),
    salvar: () => { if (!dono) return; try { localStorage.setItem(`${base}-${dono}`, JSON.stringify([...atual()].slice(-max))); } catch {} }
  };
}
const curtidos = conjuntoDaConta("hf-flash-curtidos", 300);
const guardarCurtidos = () => curtidos.salvar();
const gravarReacao = (s, campos) => fb.setDoc(fb.doc(fb.db, "stories", s.id, "reacoes", eu.uid), { ...campos, em: fb.serverTimestamp() }, { merge: true });
let porAutor = new Map();   // uid -> [flashes em ordem de criação]
// Os flashes já lidos nesta página (de quem você segue + os seus), para o Explorar contar as #hashtags e os lugares
// marcados nas figurinhas (Em alta e página do assunto) sem ler nada a mais.
export const flashesCarregados = () => [...porAutor.values()].flat().filter((s) => s && !s._leve && ativo(s));
let barra = null;
const vistosLocal = conjuntoDaConta("hf-stories-vistos", 600);
const guardarVistos = () => vistosLocal.salvar();
const ativo = (s) => Date.now() - (ms(s.criadoEm) || Date.now()) < DIA;
const comStorage = () => !!(storageFns && window.firebaseStorage);
const erroPublicar = (e) => (e?.amigavel || e?.code === "limite-diario" ? e.message : e?.code === "permission-denied" ? "O Flash começa a funcionar quando as regras novas forem publicadas." : "Não foi possível publicar: " + erroAmigavel(e));

// A fileira aparece NA HORA (04/11/2026): "Seu flash" e os anéis de quem tinha flash da última vez (guardados no aparelho,
// só ids e horários, sem as fotos) e a leitura do servidor troca por trás. Tocar num anel antes de chegar espera a leitura.
let carregandoBarra = null;
// Um flash por vez (como o Instagram): o anel guardado só tem o id; o documento (com a foto) é lido quando ele vai
// aparecer, e o PRÓXIMO já é lido e a foto decodificada por trás, para a troca ser imediata.
const lendoFlash = new Map();
function carregarFlash(s) {
  if (!s?._leve) return Promise.resolve(true);
  if (!lendoFlash.has(s.id)) lendoFlash.set(s.id, fb.getDoc(fb.doc(fb.db, "stories", s.id)).then((d) => {
    if (!d.exists()) return false;
    const x = d.data({ serverTimestamps: "estimate" });
    if (!ativo(x) || (x.autorId !== eu.uid && (x.perfil === false || !podeVer(x)))) return false;
    Object.assign(s, x); delete s._leve;
    return true;
  }).catch(() => { lendoFlash.delete(s.id); return false; }));
  return lendoFlash.get(s.id);
}
const fotosProntas = new Set();
function prepararFoto(url) {
  if (!url || fotosProntas.has(url) || !/^(data:image\/|https:)/.test(url)) return;
  fotosProntas.add(url);
  try { const im = new Image(); im.decoding = "async"; im.src = url; im.decode?.().catch(() => {}); } catch {}
}
function adiantar(s) { if (!s) return; carregarFlash(s).then((ok) => { if (ok && s.tipo !== "video") prepararFoto(s.midia); }); }
const perfisBarra = new Map(); // uid -> { nome, fotoPerfil } (o que já apareceu na fileira)
const chaveBarra = () => "hf-flash-barra-" + eu.uid;
function guardarBarra() {
  try {
    const lista = [...porAutor].map(([u, l]) => [u, l.filter((x) => !x._leve).map((x) => [x.id, ms(x.criadoEm)])]).filter(([, l]) => l.length).slice(0, 60);
    // nome e foto (só link, nada de foto dentro do texto) para o anel aparecer com o rosto e o nome na hora
    const pessoas = {};
    for (const [u] of lista) { const p = perfisBarra.get(u); if (p) pessoas[u] = [String(p.nome || "").slice(0, 40), /^https:/.test(p.fotoPerfil || "") ? p.fotoPerfil : ""]; }
    localStorage.setItem(chaveBarra(), JSON.stringify({ em: Date.now(), lista, pessoas }));
  } catch {}
}
function barraGuardada() {
  try {
    const g = JSON.parse(localStorage.getItem(chaveBarra()) || "null");
    if (!g || Date.now() - g.em > DIA) return null;
    const limite = Date.now() - DIA, m = new Map();
    for (const [u, [nome, foto]] of Object.entries(g.pessoas || {})) if (!perfisBarra.has(u)) perfisBarra.set(u, { nome, fotoPerfil: foto, _guardado: true });
    for (const [u, l] of g.lista || []) {
      if (u !== eu.uid && (escondido(u) || silenciado(u))) continue;
      const vivos = l.filter(([, t]) => t > limite).map(([id, t]) => ({ id, autorId: u, criadoEm: fb.Timestamp.fromMillis(t), _leve: true }));
      if (vivos.length) m.set(u, vivos);
    }
    return m;
  } catch { return null; }
}
// Puxar para atualizar no Diário: lê de novo a fileira do Flash (quem postou agora aparece).
export async function atualizarBarraFlash() { if (barra) await carregar().catch(() => {}); }
export async function montarStories(alvo, { esperar = null } = {}) {
  if (!alvo) return;
  barra = alvo;
  const guardada = barraGuardada();
  porAutor = guardada || new Map();
  pintarBarra();
  // A fileira guardada aparece já; a leitura (com as fotos dos flashes) espera o Diário mostrar as primeiras publicações.
  carregandoBarra = (esperar ? Promise.race([esperar, new Promise((ok) => setTimeout(ok, 5000))]) : Promise.resolve()).then(() => carregar()).finally(() => { carregandoBarra = null; });
  await carregandoBarra;
}
async function carregar() {
  const desde = fb.Timestamp.fromMillis(Date.now() - DIA);
  let docs = [];
  // Só os flashes de quem você segue (e os seus), 30 pessoas por consulta (índice stories autorId + criadoEm).
  // Antes lia os 400 flashes MAIS ANTIGOS do país inteiro nas últimas 24 h: com o site cheio, os novos de quem você
  // segue ficavam de fora e o Diário baixava centenas de fotos de gente que você nem segue.
  await meusSeguindoPronto.catch(() => {});
  const autores = [eu.uid, ...[...meusSeguindo].filter((u) => u !== eu.uid && !escondido(u) && !silenciado(u))].slice(0, 600);
  const lotes = []; for (let i = 0; i < autores.length; i += 30) lotes.push(autores.slice(i, i + 30));
  try {
    const res = await Promise.all(lotes.map((l) => fb.getDocs(fb.query(fb.collection(fb.db, "stories"), fb.where("autorId", "in", l), fb.where("criadoEm", ">=", desde), fb.orderBy("criadoEm", "desc"), fb.limit(150)))));
    docs = res.flatMap((s) => s.docs).map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })).sort((a, b) => ms(a.criadoEm) - ms(b.criadoEm));
  } catch (e) {
    // Sem o índice (ou com as regras antigas): os mais NOVOS das últimas 24 h, filtrados aqui.
    console.warn("Flash:", e?.code || e?.message);
    try {
      const s = await fb.getDocs(fb.query(fb.collection(fb.db, "stories"), fb.where("criadoEm", ">=", desde), fb.orderBy("criadoEm", "desc"), fb.limit(300)));
      docs = s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })).reverse();
    } catch (e2) { console.warn("Flash:", e2?.code || e2?.message); }
  }
  porAutor = new Map();
  docs.filter((x) => ativo(x) && (x.autorId === eu.uid || (x.perfil !== false && meusSeguindo.has(x.autorId) && !escondido(x.autorId) && !silenciado(x.autorId) && podeVer(x))))
    .forEach((x) => { if (!porAutor.has(x.autorId)) porAutor.set(x.autorId, []); porAutor.get(x.autorId).push(x); });
  limparVencidos();
  pintarBarra();
  guardarBarra();
  setTimeout(guardarBarra, 2500); // de novo depois que os nomes e fotos chegarem
}
// O autor do flash segue quem está vendo? (respostas "só quem eu sigo")
const segueCache = new Map();
function autorMeSegue(autor) {
  if (!segueCache.has(autor)) segueCache.set(autor, fb.getDoc(fb.doc(fb.db, "relacoes", `${autor}_${eu.uid}`)).then((d) => d.exists()).catch(() => false));
  return segueCache.get(autor);
}
// Escolhas do autor: "Amigos próximos" (só a lista vê) e "Ocultar de" (essas pessoas não veem).
// Público do flash (alvo: idade, gênero, lugar, seguidores — o mesmo do público da publicação): quem não está no
// público não vê o flash (filtrado no aparelho, como no Diário). A posição é lida uma vez, sem esperar.
let leitorFlash = null, posFlash = null, pedindoPos = false;
function leitorAgora() {
  if (!eu?.uid) return null;
  if (!pedindoPos) { pedindoPos = true; minhaPosicao(dados).then((p) => { posFlash = p || null; leitorFlash = null; }).catch(() => {}); }
  return (leitorFlash ||= leitorDe({ uid: eu.uid, dados, local: lerLocal(), pos: posFlash, segue: (u) => meusSeguindo.has(u) }));
}
const noPublico = (x) => !x.alvo || x.autorId === eu?.uid || combinaPublico({ autorId: x.autorId, publico: x.alvo }, leitorAgora());
const podeVer = (x) => !(Array.isArray(x.ocultoPara) && x.ocultoPara.includes(eu.uid)) && (x.publico !== "amigos" || (Array.isArray(x.lista) && x.lista.includes(eu.uid))) && noPublico(x);
// Depois das 24 h o flash vai para o ARQUIVO (só você vê), como no Instagram. Quem desligou "Guardar no arquivo" nas
// Configurações do Flash tem os vencidos apagados (menos os que estão num destaque).
async function limparVencidos() {
  if (configFlash().arquivo !== false) return;
  try {
    const s = await fb.getDocs(fb.query(fb.collection(fb.db, "stories"), fb.where("autorId", "==", eu.uid), fb.limit(50)));
    s.docs.filter((d) => { const x = d.data({ serverTimestamps: "estimate" }); return !ativo(x) && !x.destacado; }).forEach((d) => fb.deleteDoc(d.ref).catch(() => {}));
  } catch {}
}
// Flashes no ar de uma pessoa (24 h). Com o índice (stories: autorId + criadoEm) lê só os dela; sem ele, os das últimas
// 24 h de todo mundo filtrados por ela (a regra nova não deixa listar o arquivo dos outros); com as regras antigas, a
// consulta antiga.
async function flashesNoArDe(uid) {
  const desde = fb.Timestamp.fromMillis(Date.now() - DIA);
  try { return (await fb.getDocs(fb.query(fb.collection(fb.db, "stories"), fb.where("autorId", "==", uid), fb.where("criadoEm", ">=", desde), fb.orderBy("criadoEm", "desc"), fb.limit(30)))).docs; } catch {}
  try { return (await fb.getDocs(fb.query(fb.collection(fb.db, "stories"), fb.where("criadoEm", ">=", desde), fb.orderBy("criadoEm", "asc"), fb.limit(400)))).docs.filter((d) => d.data().autorId === uid); } catch {}
  return (await fb.getDocs(fb.query(fb.collection(fb.db, "stories"), fb.where("autorId", "==", uid), fb.limit(30)))).docs;
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
    const g = perfisBarra.get(u);
    const c = circulo({ uid: u, nome: g?.nome ? String(g.nome).split(" ")[0] : "...", foto: g?.fotoPerfil, nomeReal: g?.nome, lista: porAutor.get(u) });
    obterPerfil(u).then((p) => { perfisBarra.set(u, p); c.querySelector(".nome").textContent = String(p.nome || "Usuário").split(" ")[0]; c.setAttribute("aria-label", `Flash de ${p.nome || "Usuário"}${todosVistos(u) ? "" : " (novo)"}`); pintarAvatar(c.querySelector(".avatar"), p.fotoPerfil, p.nome); }).catch(() => {});
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
  // Encostou o dedo no anel: o 1º flash dele já começa a baixar (antes de soltar o toque).
  b.addEventListener("pointerdown", () => { const l = porAutor.get(uid) || []; adiantar(l.find((x) => !vistosLocal.has(x.id)) || l[0]); }, { passive: true });
  b.addEventListener("click", async (e) => {
    if (meu && (!tem || e.target.closest(".mais"))) { abrirCriador(); return; }
    // Anel vindo do aparelho (sem as fotos ainda): espera a leitura do servidor.
    // Anel guardado no aparelho (sem as fotos ainda): abre JÁ; o visor baixa cada flash na hora de mostrar (carregarFlash).
    if (meu) { abrirVisor(eu.uid); return; }
    abrirVisor(uid);
  });
  return b;
}

// Mensagem com o cartão do flash (o Mensagens mostra a miniatura enquanto o flash existe, 24 h):
// acao = resposta | reacao | mencao | enviar | repost. O cartão guarda só o id; a foto vem do flash.
// ---------- contagem regressiva (figurinha, como a do Instagram) ----------
// stories.contagem = { titulo, fim (Timestamp), cor?, x, y }. Quem vê acompanha os números andando e pode tocar em
// "Lembrar-me" (contagem_lembretes/{flash}_{uid}): quando a contagem acaba, chega o aviso no sino.
const pad2 = (n) => String(n).padStart(2, "0");
function faltaPara(fimMs) {
  let r = Math.max(0, fimMs - Date.now());
  const d = Math.floor(r / 864e5); r -= d * 864e5;
  const h = Math.floor(r / 36e5); r -= h * 36e5;
  const m = Math.floor(r / 6e4); r -= m * 6e4;
  return { d, h, m, s: Math.floor(r / 1e3), acabou: fimMs <= Date.now() };
}
const quandoTermina = (fimMs) => new Date(fimMs).toLocaleString("pt-BR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).replace(",", "");
// Cartão da contagem (criador e visor): faixa com o título, os números (dias · h · min · s) e quando termina.
function cartaoContagem(c, { vivo = true } = {}) {
  const card = el("div", "ctg" + temaFig(c.cor));
  const tit = el("div", "ctg-tit", c.titulo || "Nome da contagem");
  const cab = el("small", "ctg-cab"); cab.append(icone("relogio", "i xs"), document.createTextNode("CONTAGEM REGRESSIVA"));
  const num = el("div", "ctg-num"); num.setAttribute("role", "timer");
  const quando = el("small", "ctg-quando");
  const acoes = el("div", "ctg-acoes");
  card.append(tit, cab, num, quando, acoes);
  card._acoes = acoes;
  let relogio = 0;
  const pintarN = () => {
    const fimMs = Number(card._fim ?? c.fim) || 0;
    const f = faltaPara(fimMs);
    card.classList.toggle("acabou", f.acabou);
    const casas = f.d > 0 ? [[f.d, f.d === 1 ? "dia" : "dias"], [f.h, "h"], [f.m, "min"], [f.s, "s"]] : [[f.h, "h"], [f.m, "min"], [f.s, "s"]];
    num.replaceChildren(...casas.map(([v, rot], i) => { const w = el("span", "ctg-casa"); w.append(el("b", null, i === 0 && f.d > 0 ? String(v) : pad2(v)), el("small", null, rot)); return w; }));
    num.setAttribute("aria-label", f.acabou ? "A contagem terminou" : `Faltam ${f.d ? f.d + " dias, " : ""}${f.h} horas, ${f.m} minutos e ${f.s} segundos`);
    quando.textContent = f.acabou ? "Terminou! 🎉" : `Termina ${quandoTermina(fimMs)}`;
  };
  card._pintar = pintarN;
  pintarN();
  if (vivo) relogio = setInterval(() => { if (!card.isConnected) { if (card._jaNaTela) clearInterval(relogio); return; } card._jaNaTela = true; pintarN(); }, 1000);
  return card;
}
function msgFlash(s, acao, extra = {}) {
  return { tipoArquivo: "cartao", cartao: { tipo: "flash", acao, flashId: s.id, autorId: s.autorId, nome: String(s.nome || "").slice(0, 80), ...extra } };
}
const PAGINA_NEGOCIO = { servicos: "servicos.html", delivery: "delivery.html", lojinha: "shopping.html", imoveis: "imoveis.html", saude: "saude.html" };
const ICONE_NEGOCIO = { servicos: "servicos", delivery: "delivery", lojinha: "lojinha", imoveis: "imoveis", saude: "saude" };
const linkNegocio = (l) => `${PAGINA_NEGOCIO[l.tipo] || "servicos.html"}?negocio=${encodeURIComponent(l.negocioId)}&de=flash`;

// Abrir um flash pelo id: link feed.html?flash=ID e, na rede, direto de dentro do Mensagens (rede-app.js abrirFlash).
// Como o Instagram (02/11 → 09/11/2026): o visor abre NA HORA com o flash tocado. Antes esperava baixar o flash e
// depois TODOS os outros da pessoa (com as fotos dentro dos documentos) para só então abrir; agora os outros entram na
// lista por trás, depois que este já apareceu (`_trocarLista` do visor mantém o flash e a barra em que a pessoa está).
// - texto: o flash que o chat já leu (flash-direto.js, com as datas marcadas): não baixa de novo;
// - sem texto, vale também o que o Mensagens guardou na aba antes de trocar de página (pegarGuardado);
// - aoAbrir/aoFechar/aviso: para quem abriu de fora (a casca da rede põe o quadro por cima e mostra o aviso).
// Devolve true quando o visor abriu.
export async function abrirFlashPorId(id, { silencioso = false, texto = "", aoAbrir = null, aoFechar = null, aviso = null } = {}) {
  const avisar = (m) => (aviso ? aviso(m) : toast(m));
  const sumiu = () => { tirarCapa(); if (silencioso) { try { history.replaceState({ ...(history.state || {}), hfCamadas: 0 }, "", location.href); } catch {} } };
  try {
    let x = lerFlashTexto(texto || pegarGuardado(id), id, fb.Timestamp);
    if (!x) {
      const d = await fb.getDoc(fb.doc(fb.db, "stories", id));
      if (d.exists()) x = { id: d.id, ...d.data({ serverTimestamps: "estimate" }) };
    }
    if (!x || !ativo(x)) { sumiu(); avisar("Esse flash não está mais disponível (passou de 24 horas)."); return false; }
    if (x.autorId !== eu.uid && (escondido(x.autorId) || !podeVer(x))) { sumiu(); avisar("Esse flash não está disponível."); return false; }
    // O Diário já tem a lista desta pessoa (fileira do Flash): usa ela, com este flash completo no lugar.
    const ja = porAutor.get(x.autorId);
    const noDiario = ja?.find((k) => k.id === id);
    let lista;
    if (noDiario) { if (noDiario._leve) { Object.assign(noDiario, x); delete noDiario._leve; } lista = ja; x = noDiario; }
    else { lista = [x]; porAutor.set(x.autorId, lista); }
    abrirVisor(x.autorId, { so: true, comecarEm: id, aoFechar });
    aoAbrir?.();
    if (!noDiario) setTimeout(() => completarLista(x), 1200);
    return true;
  } catch (e) { tirarCapa(); avisar("Não foi possível abrir o flash: " + erroAmigavel(e)); return false; }
}
// Os outros flashes da pessoa (no ar) entram na lista do visor aberto por abrirFlashPorId.
async function completarLista(x) {
  const docs = await flashesNoArDe(x.autorId).catch(() => null);
  if (!docs) return;
  const nova = docs.map((k) => (k.id === x.id ? x : { id: k.id, ...k.data({ serverTimestamps: "estimate" }) }))
    .filter((k) => k === x || (ativo(k) && (k.autorId === eu.uid || podeVer(k))));
  if (!nova.includes(x)) nova.push(x);
  nova.sort((a, b) => ms(a.criadoEm) - ms(b.criadoEm));
  const visor = document.querySelector(".story-visor");
  if (visor?._trocarLista) visor._trocarLista(x.autorId, nova);
  else porAutor.set(x.autorId, nova);
}
// Flash no perfil de um negócio, no visor COMPLETO (o mesmo do Diário: enquete/teste, perguntas, contagem, link, lugar,
// # e @, estrela, responder e reações). n = { id, nome, foto, tipo }. Antes o perfil do negócio tinha um visor à parte
// (flash-negocio.js) que só mostrava a foto: as figurinhas não apareciam.
export async function abrirFlashesDoNegocio(n, { comecarEm = null, aoFechar = null, lista = null, aoVitrine = null } = {}) {
  if (!n?.id) return;
  const base = lista || await flashesDoNegocio(fb, eu, n.id).catch(() => []);
  const l = base.filter((x) => ativo(x) && (x.autorId === eu.uid || podeVer(x))).sort((a, b) => ms(a.criadoEm) - ms(b.criadoEm));
  if (!l.length) { tirarCapa(); toast("Esse negócio não tem flash no ar agora."); aoFechar?.(); return; }
  const k = comecarEm ? l.findIndex((x) => x.id === comecarEm) : l.findIndex((x) => !vistosLocal.has(x.id));
  abrirVisor(l[0].autorId, { lista: l, negocio: { id: n.id, nome: n.nome || "", foto: n.foto || "", tipo: n.tipo || String(n.id).split("_")[1] || "" }, comecarEm: l[Math.max(0, k)].id, aoFechar, aoVitrine });
}
// As páginas que já têm o visor completo (Diário, perfis) abrem o flash do negócio na hora (flash-negocio.js usa isto).
window.__hfVisorNegocio = abrirFlashesDoNegocio;
// Voltar ao flash: ao sair da página com um flash aberto (perfil de quem foi mencionado, link do negócio, lugar, #,
// publicação...), o "voltar" do celular traz o MESMO flash de volta (antes voltava para o Diário com o flash fechado).
// Só os flashes no ar (destaques e arquivo não). Guardado na aba (sessionStorage), vale 30 min.
const CHAVE_VOLTA = "hf-flash-volta";
// Empilha figurinhas que se cobrem (cy/h/cx/w em px; muda cy): na ordem de cima para baixo, cada uma desce até ficar
// 10 px abaixo da anterior que ocupa a mesma faixa na horizontal; se o grupo passa de `baixo`, sobe o que der.
function empilhar(l, cima, baixo, gap = 10) {
  l.sort((a, b) => a.cy - b.cy);
  const cruza = (a, b) => Math.abs(a.cx - b.cx) < (a.w + b.w) / 2;
  for (let i = 1; i < l.length; i++) for (let j = 0; j < i; j++) {
    const a = l[j], fim = a.cy + a.h / 2 + gap;
    if (cruza(a, l[i]) && l[i].cy - l[i].h / 2 < fim && l[i].cy + l[i].h / 2 > a.cy - a.h / 2 - gap) l[i].cy = fim + l[i].h / 2;
  }
  const fundo = Math.max(...l.map((x) => x.cy + x.h / 2)), topo = Math.min(...l.map((x) => x.cy - x.h / 2));
  const sobe = Math.min(fundo - baixo, topo - cima);
  if (fundo > baixo && sobe > 0) l.forEach((x) => { x.cy -= sobe; });
  return l;
}
const tirarCapa = () => document.documentElement.classList.remove("hf-volta-flash");
// Zoom da página travado enquanto o criador do Flash está aberto: um gesto de dois dedos que não pega a figurinha
// (cai num botão ou fora dela) virava zoom do navegador e a tela ficava ampliada, com os botões gigantes. O
// `touch-action` do .flash-criar já bloqueia a pinça; o viewport (maximum-scale=1) desfaz um zoom que já existia.
// Na rede numa página só (rede.html) o Diário fica num quadro: o zoom que vale é o da página de cima, então a trava vai
// nas duas (a de cima só se for do mesmo site).
let zoomTravado = 0;
const viewportsAntes = new Map();
function travarZoom() {
  const docs = [document];
  try { if (window.top !== window && window.top.document) docs.push(window.top.document); } catch {}
  if (!zoomTravado++) docs.forEach((d) => {
    const m = d.querySelector('meta[name="viewport"]'); if (!m) return;
    const antes = m.getAttribute("content"); viewportsAntes.set(m, antes);
    m.setAttribute("content", antes.replace(/,\s*(maximum-scale|user-scalable)=[^,]*/g, "") + ", maximum-scale=1, user-scalable=no");
  });
  let feito = false;
  return () => {
    if (feito) return; feito = true;
    if (!--zoomTravado) { viewportsAntes.forEach((antes, m) => m.setAttribute("content", antes)); viewportsAntes.clear(); }
  };
}
function lembrarFlash(s) {
  try { if (s?.id) sessionStorage.setItem(CHAVE_VOLTA, JSON.stringify({ id: s.id, pagina: location.pathname + location.search, em: Date.now() })); } catch {}
}
addEventListener("pagehide", () => lembrarFlash(document.querySelector(".story-visor")?._flashAtual?.()));
// Voltou pela memória do navegador (a página volta como estava, sem recarregar): reabre aqui mesmo se o flash fechou.
addEventListener("pageshow", (e) => { if (!e.persisted) return; if (document.querySelector(".story-visor")) { try { sessionStorage.removeItem(CHAVE_VOLTA); } catch {} } else if (eu?.uid) voltarAoFlash(true); });
export function voltarAoFlash(daMemoria = false) {
  let x = null;
  try { x = JSON.parse(sessionStorage.getItem(CHAVE_VOLTA) || "null"); } catch {}
  // A marca é da página de onde a pessoa saiu: as outras páginas não mexem nela.
  if (!x || x.pagina !== location.pathname + location.search) { tirarCapa(); return false; }
  try { sessionStorage.removeItem(CHAVE_VOLTA); } catch {}
  if (!x.id || !/^[A-Za-z0-9]{1,64}$/.test(x.id) || Date.now() - Number(x.em || 0) > 30 * 60e3) { tirarCapa(); return false; }
  let tipo = ""; try { tipo = performance.getEntriesByType("navigation")[0]?.type || ""; } catch {}
  if (tipo !== "back_forward" && !daMemoria) { tirarCapa(); return false; }
  // O passo do histórico em que estamos era o do flash: reaproveita (um "voltar" fecha o flash, como antes).
  try { history.replaceState({ ...(history.state || {}), hfCamadas: 1 }, "", location.href); } catch {}
  abrirFlashPorId(x.id, { silencioso: true });
  return true;
}
// Repostar um flash em que você foi mencionado (abre o criador com a foto dele).
// Menção OCULTA: com as regras novas ela fica em `mencoes` (+ `mencoesOcultas`) e o repost funciona. Com as regras de
// antes o flash é gravado sem a lista das ocultas (semCamposNovos), então quem foi mencionado escondido não aparece em
// `mencoes` e o servidor recusa o repost: aqui explica o porquê em vez do "só quem foi mencionado".
export async function repostarFlash(id, { aviso = null } = {}) {
  const falhar = (msg) => { tirarCapa(); (aviso || toast)(msg); };
  try {
    const d = await fb.getDoc(fb.doc(fb.db, "stories", id));
    if (!d.exists() || !ativo(d.data({ serverTimestamps: "estimate" }))) { falhar("Esse flash já saiu do ar (passou de 24 horas)."); return; }
    const x = { id: d.id, ...d.data({ serverTimestamps: "estimate" }) };
    if (!(Array.isArray(x.mencoes) && x.mencoes.includes(eu.uid))) {
      falhar(Array.isArray(x.mencoesOcultas) ? "Só quem foi mencionado no flash pode repostar."
        : "Sua menção neste flash ficou oculta. Repostar menção oculta funciona depois que as regras novas forem publicadas.");
      return;
    }
    if (x.tipo === "video") { falhar("Repostar vídeo precisa do armazenamento de arquivos ligado."); return; }
    abrirCriador({ repost: x });
  } catch (e) { falhar("Não foi possível repostar: " + erroAmigavel(e)); }
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
// Enquete antiga sem prazo: termina 7 dias depois de publicada (como no Diário, blocoEnquete).
function comFimImplicito(post) {
  const e = post.enquete;
  if (e && !e.fimEm) { const c = ms(post.agendadoPara || post.criadoEm); if (c) return { ...e, fimEm: { toMillis: () => c + 7 * 864e5 } }; }
  return e;
}
async function resultadoParaCartao(post) {
  const e = comFimImplicito(post), alvo = `d_${post.id}`, n = e.opcoes.length;
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
  const e = post.enquete?.pergunta && Array.isArray(post.enquete.opcoes) && post.enquete.opcoes.length >= 2 ? comFimImplicito(post) : null;
  const cx = !e && post.caixa?.pergunta ? post.caixa : null;
  const fotos = fotosDoPost(post).filter(Boolean), foto = fotos[0];
  const tempo = (p, ms = 3000) => Promise.race([p, new Promise((ok) => setTimeout(() => ok(null), ms))]);
  // Tudo ao mesmo tempo: foto, rosto de quem publicou, resultado da enquete e as estrelas.
  // Pessoas marcadas: até 3 fotinhas empilhadas e "com Ana e mais 2 pessoas" (como no Diário).
  const marcados = [...new Set((post.marcados || []).filter(Boolean))].slice(0, 10);
  const [im, av, res, notas, marc] = await Promise.all([
    foto ? carregarImg(foto).catch(() => null) : null,
    urlSegura(post.fotoPerfil) ? carregarImg(post.fotoPerfil, 3000).catch(() => null) : null,
    e ? resultadoParaCartao(post) : null,
    tempo(lerResumosEstrelas([post.id]).then((m) => m.get(post.id)).catch(() => null)),
    marcados.length ? tempo(Promise.all(marcados.slice(0, 3).map((u) => obterPerfil(u).then(async (p) => ({ nome: p.nome || "", im: urlSegura(p.fotoPerfil) ? await carregarImg(p.fotoPerfil, 2500).catch(() => null) : null })).catch(() => ({ nome: "" })))), 3500) : null
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
  const temNotas = notas?.total > 0, NOTAS_H = temNotas ? 64 : 0, MARC_H = marcados.length ? 70 : 0;
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
    const resto = () => MAXH - CAB - MARC_H - altTxt() - (bloco ? blocoH + 24 : 0) - NOTAS_H - pad;
    if (resto() < 340 && txtL.length > 1) { txtL = txtL.slice(0, 1); txtL[0] = txtL[0].replace(/…?$/, "…"); }
    mH = Math.max(260, Math.min(Math.round(Math.min(bloco ? 0.75 : 1.25, Math.max(0.52, im.height / im.width)) * CW), resto()));
  }
  const CH = Math.min(MAXH, CAB + MARC_H + mH + (im && txtL.length ? 22 : 0) + altTxt() + (bloco ? blocoH + 8 : 0) + NOTAS_H + pad - (im ? 0 : 6));
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
  const nomeLocal = String(post.local?.nome || "");
  const sub = `${nomeLocal ? (nomeLocal.length > 26 ? nomeLocal.slice(0, 25).trimEnd() + "…" : nomeLocal) : "Diário"} · ${quando(post.agendadoPara || post.criadoEm)}`;
  ctx.fillText(sub, X + pad + 92, Y + 98);
  // marca discreta à direita
  ctx.fillStyle = AZUL; ctx.font = `900 22px ${FONTE}`; ctx.textAlign = "right"; ctx.fillText("HELP FLORIPA", X + CW - pad, Y + 60); ctx.textAlign = "left";
  let y = Y + CAB;
  if (MARC_H) {
    const R = 24, ax = X + pad;
    const rostos = (marc || []).slice(0, 3);
    rostos.forEach((p, i) => {
      const cx0 = ax + R + i * (R * 2 - 14);
      ctx.save(); ctx.beginPath(); ctx.arc(cx0, y + 26, R + 4, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
      ctx.beginPath(); ctx.arc(cx0, y + 26, R, 0, Math.PI * 2); ctx.clip();
      if (p?.im) { const k = Math.max(R * 2 / p.im.width, R * 2 / p.im.height); ctx.drawImage(p.im, cx0 - p.im.width * k / 2, y + 26 - p.im.height * k / 2, p.im.width * k, p.im.height * k); }
      else { ctx.fillStyle = AZUL; ctx.fillRect(cx0 - R, y + 26 - R, R * 2, R * 2); ctx.fillStyle = "#fff"; ctx.font = `800 22px ${FONTE}`; ctx.textAlign = "center"; ctx.fillText(String(p?.nome || "?").trim().charAt(0).toUpperCase() || "?", cx0, y + 34); ctx.textAlign = "left"; }
      ctx.restore();
    });
    let tx = ax + R * 2 + Math.max(0, rostos.length - 1) * (R * 2 - 14) + 10;
    if (marcados.length > 3) {
      const cx0 = tx + R - 4;
      ctx.beginPath(); ctx.arc(cx0, y + 26, R + 4, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
      ctx.beginPath(); ctx.arc(cx0, y + 26, R, 0, Math.PI * 2); ctx.fillStyle = "#e6eef2"; ctx.fill();
      ctx.fillStyle = TINTA; ctx.font = `800 20px ${FONTE}`; ctx.textAlign = "center"; ctx.fillText(`+${marcados.length - 3}`, cx0, y + 33); ctx.textAlign = "left";
      tx += R * 2 + 6;
    }
    const primeiro = String(rostos[0]?.nome || "alguém").split(" ")[0];
    const resto2 = marcados.length - 1;
    const partes = [["com ", CINZA2, 600], [primeiro, TINTA, 800]];
    if (resto2 === 1 && rostos[1]?.nome) partes.push([" e ", CINZA2, 600], [String(rostos[1].nome).split(" ")[0], TINTA, 800]);
    else if (resto2 > 0) partes.push([" e ", CINZA2, 600], [resto2 === 1 ? "mais 1 pessoa" : `mais ${resto2} pessoas`, TINTA, 800]);
    partes.forEach(([t, cor, peso]) => { ctx.font = `${peso} 28px ${FONTE}`; ctx.fillStyle = cor; ctx.fillText(t, tx, y + 36); tx += ctx.measureText(t).width; });
    y += MARC_H;
  }
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
  // A publicação guarda o nome e a foto de quando foi feita: o cartão do flash usa os de AGORA.
  const atual = post.autorId === eu.uid ? dados : await obterPerfil(post.autorId).catch(() => ({}));
  post = { ...post, nome: atual?.nome || post.nome, fotoPerfil: atual?.fotoPerfil || post.fotoPerfil };
  if (post.mediaTipo === "video") { toast("Vídeos ainda não vão para o flash. Compartilhe uma publicação com foto ou texto."); return; }
  if (post.autorId !== eu.uid) {
    try { const p = await fb.getDoc(fb.doc(fb.db, "pref_publicas", post.autorId)); if (p.exists() && p.data().permiteFlash === false) { toast(`${String(post.nome || "Quem publicou").split(" ")[0]} não permite compartilhar as publicações no Flash.`); return; } } catch {}
  }
  toast(post.enquete?.pergunta ? "Preparando a enquete para o flash..." : "Preparando a publicação para o flash...");
  let imagem = null;
  try { imagem = await imagemDaPublicacao(post); } catch (e) { console.warn(e); }
  if (!imagem) { toast("Não foi possível preparar a publicação para o flash."); return; }
  // O "Preparando..." some quando o criador abre (antes ficava por cima dos botões do topo).
  document.querySelectorAll(".toast").forEach((t) => t.remove());
  abrirCriador({ post: { id: post.id, autorId: post.autorId, nome: post.nome, imagem, enquete: !!post.enquete?.pergunta, caixa: !post.enquete?.pergunta && !!post.caixa?.pergunta } });
}

// Criar um flash de fora do Diário (o "+" na foto do seu perfil). aoPublicar roda depois de publicar.
let depoisDePublicar = null;
export function novoFlash(aoPublicar) { depoisDePublicar = aoPublicar || null; abrirCriador(); }

// Perfil: anel em volta da foto quando a pessoa tem flash ativo (tocar abre).
export async function anelNoPerfil(avatar, uid) {
  if (!avatar || !uid || escondido(uid)) return;
  try {
    const lista = (await flashesNoArDe(uid)).map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })).filter((x) => ativo(x) && (uid === eu.uid || (x.perfil !== false && podeVer(x)))).sort((a, b) => ms(a.criadoEm) - ms(b.criadoEm));
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

// A publicação que um flash compartilhou ainda existe? (guardado na sessão; na dúvida, existe)
const postsConferidos = new Map();
function publicacaoExiste(id) {
  if (!postsConferidos.has(id)) postsConferidos.set(id, fb.getDoc(fb.doc(fb.db, "diario", id)).then((d) => d.exists()).catch(() => true));
  return postsConferidos.get(id);
}
// Folha do lugar marcado no flash: mapa, "Como chegar" e as publicações feitas por perto.
export function mapaDoLugar(la, lo, z = 15) {
  const box = el("div", "lg-mapa");
  const n = 2 ** z, rad = (la * Math.PI) / 180;
  const px = ((lo + 180) / 360) * n * 256, py = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n * 256;
  const meio = el("div", "lg-meio");
  for (let tx = Math.floor((px - 400) / 256); tx <= Math.floor((px + 400) / 256); tx++) {
    for (let ty = Math.floor((py - 140) / 256); ty <= Math.floor((py + 140) / 256); ty++) {
      const img = document.createElement("img"); img.alt = ""; img.loading = "lazy"; img.decoding = "async"; img.draggable = false;
      img.onerror = () => img.remove();
      img.src = `https://tile.openstreetmap.org/${z}/${((tx % n) + n) % n}/${ty}.png`;
      img.style.left = `${tx * 256 - px}px`; img.style.top = `${ty * 256 - py}px`;
      meio.appendChild(img);
    }
  }
  const pino = el("span", "lg-pino"); pino.appendChild(icone("local", "i"));
  box.append(meio, pino, el("span", "lg-cred", "© OpenStreetMap"));
  return box;
}
const kmEntre = (a, b) => { const R = 6371, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lng - a.lng) * r; const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
function gradePublicacoes(posts, vazio) {
  const g = el("div", "lg-grade");
  if (!posts.length) { g.appendChild(el("p", "lista-vazia", vazio)); return g; }
  posts.slice(0, 12).forEach((p) => {
    const a = el("a", "lg-cel"); a.href = `feed.html?post=${encodeURIComponent(p.id)}`;
    const foto = (fotosDoPost(p) || [])[0] || (p.mediaTipo !== "video" ? p.mediaUrl : "");
    if (foto && /^(data:image|https:)/.test(foto)) { const im = document.createElement("img"); im.src = foto; im.alt = ""; im.loading = "lazy"; im.decoding = "async"; im.draggable = false; a.appendChild(im); }
    else a.appendChild(el("span", "lg-txt", String(p.texto || p.enquete?.pergunta || p.caixa?.pergunta || "").slice(0, 90)));
    a.addEventListener("click", (e) => { if (!ganchos.abrirPublicacao) return; e.preventDefault(); ganchos.abrirPublicacao(p.id); });
    g.appendChild(a);
  });
  return g;
}
async function abrirLugarFlash(l, aoFechar) {
  const corpo = abrirLista(String(l.nome).split(",")[0]);
  const f = $("folhaLista"); const volta = () => { f?.removeEventListener("fechada", volta); aoFechar?.(); }; f?.addEventListener("fechada", volta);
  corpo.addEventListener("contextmenu", (e) => { if (e.target.closest("img")) e.preventDefault(); });
  const cab = el("div", "lg-cab");
  const ic = el("span", "lg-ic"); ic.appendChild(icone("local", "i s"));
  const tx = el("div", "lg-tx"); tx.append(el("strong", null, String(l.nome).split(",")[0]), el("small", null, String(l.nome).split(",").slice(1).join(",").trim() || "Lugar marcado no flash"));
  cab.append(ic, tx);
  const acoes = el("div", "lg-acoes");
  const rota = el("a", "btn sec", "Como chegar"); rota.href = `https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}`; rota.target = "_blank"; rota.rel = "noopener";
  const todas = el("a", "btn pri", "Ver no Explorar"); todas.href = `feed.html?local=${l.lat},${l.lng}&n=${encodeURIComponent(l.nome)}`;
  todas.addEventListener("click", (e) => { if (!ganchos.abrirTopico) return; e.preventDefault(); fecharFolha("folhaLista"); ganchos.abrirTopico({ local: l }); });
  acoes.append(rota, todas);
  const tit = el("p", "lg-sec", "Publicado por perto");
  const lugarGrade = el("div"); lugarGrade.appendChild(el("p", "lista-vazia", "Carregando..."));
  corpo.replaceChildren(mapaDoLugar(l.lat, l.lng), cab, acoes, tit, lugarGrade);
  try {
    const x = await fb.getDocs(fb.query(fb.collection(fb.db, "diario"), fb.orderBy("criadoEm", "desc"), fb.limit(80)));
    const perto = x.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => !p.agendadoPara && p.local && Number.isFinite(p.local.lat) && (p.local.nome === l.nome || kmEntre(l, p.local) <= 3));
    lugarGrade.replaceWith(gradePublicacoes(perto, "Ninguém publicou deste lugar ainda. Marque o local na sua próxima publicação."));
  } catch { lugarGrade.replaceChildren(el("p", "lista-vazia", "Não foi possível carregar as publicações.")); }
}
async function abrirHashtagFlash(tag, aoFechar) {
  const corpo = abrirLista("#" + tag);
  const f = $("folhaLista"); const volta = () => { f?.removeEventListener("fechada", volta); aoFechar?.(); }; f?.addEventListener("fechada", volta);
  const cab = el("div", "lg-cab");
  const ic = el("span", "lg-ic hashtag"); ic.appendChild(icone("hashtag", "i s"));
  const n = el("small", null, "…");
  const tx = el("div", "lg-tx"); tx.append(el("strong", null, "#" + tag), n);
  cab.append(ic, tx);
  const acoes = el("div", "lg-acoes");
  const todas = el("a", "btn pri", "Ver no Explorar"); todas.href = `feed.html?tag=${encodeURIComponent(tag)}`;
  todas.addEventListener("click", (e) => { if (!ganchos.abrirTopico) return; e.preventDefault(); fecharFolha("folhaLista"); ganchos.abrirTopico({ tag }); });
  acoes.appendChild(todas);
  const grade = el("div"); grade.appendChild(el("p", "lista-vazia", "Carregando..."));
  corpo.replaceChildren(cab, acoes, el("p", "lg-sec", "Publicações recentes"), grade);
  const q = fb.query(fb.collection(fb.db, "diario"), fb.where("tags", "array-contains", tag), fb.limit(30));
  fb.getCountFromServer(q).then((c) => { const k = c.data().count; n.textContent = `${k} ${k === 1 ? "publicação" : "publicações"}`; }).catch(() => { n.textContent = "Hashtag"; });
  try {
    const x = await fb.getDocs(q);
    const l = x.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => !p.agendadoPara).sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
    grade.replaceWith(gradePublicacoes(l, "Ainda não há publicações com esta hashtag."));
  } catch { grade.replaceChildren(el("p", "lista-vazia", "Não foi possível carregar as publicações.")); }
}
// Figurinhas que quem vê pode tocar (posição em fração do quadro 9:16).
// Figurinhas que aparecem num flash: as dele e, num repost, as do flash original que ele não tem (enquete/teste, caixa de
// perguntas, contagem, link do negócio e os toques de lugar, # e @). O que vem do original usa o id do original: o voto,
// a resposta e o lembrete contam lá.
export function figurinhasDe(s) {
  const o = s?._orig && s._orig.id !== s.id ? s._orig : null;
  const de = (k) => (s?.[k] ? s : o?.[k] ? o : null);
  const linkOk = (l) => l?.negocioId && PAGINA_NEGOCIO[l.tipo];
  return {
    enquete: de("enquete"),
    caixa: de("caixa"),
    contagem: (s?.contagem?.titulo && s.contagem.fim) ? s : (o?.contagem?.titulo && o.contagem.fim) ? o : null,
    link: linkOk(s?.link) ? s.link : linkOk(o?.link) ? o.link : null,
    toques: [...figurinhasTocaveis(s || {}), ...(o ? figurinhasTocaveis(o) : [])].slice(0, 12)
  };
}
function figurinhasTocaveis(s) {
  const l = [], num = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : null; };
  const ocultas = Array.isArray(s.mencoesOcultas) ? s.mencoesOcultas : [];
  (Array.isArray(s.toques) ? s.toques : []).slice(0, 8).forEach((t) => {
    const p = String(t).split("|");
    if (p[0] === "l") {
      // localização: "l|nome|lat|lng|x|y|w|h" → as publicações de lá (mesma página do local das publicações)
      const [, nomeL, lat, lng, x, y, w, h] = p;
      if (!nomeL || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng)) || num(x) == null) return;
      l.push({ x: num(x), y: num(y), w: num(w) || 0.3, h: num(h) || 0.05, ic: "local", rot: nomeL.split(",")[0],
        lugar: { nome: nomeL, lat: Number(lat), lng: Number(lng) }, href: `feed.html?local=${Number(lat)},${Number(lng)}&n=${encodeURIComponent(nomeL)}` });
      return;
    }
    const [k, v, x, y, w, h] = p;
    if (!v || num(x) == null || num(y) == null) return;
    const pos = { x: num(x), y: num(y), w: num(w) || 0.25, h: num(h) || 0.05 };
    if (k === "h") l.push({ ...pos, ic: "hashtag", rot: `#${v}`, tag: v.toLowerCase(), href: `feed.html?tag=${encodeURIComponent(v.toLowerCase())}` });
    else if (k === "m" && /^[A-Za-z0-9]{1,64}$/.test(v) && !ocultas.includes(v)) l.push({ ...pos, ic: "pessoa", rot: "Ver perfil", uid: v });
  });
  return l;
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
  { nome: "Máquina", css: "700 1em 'Courier New', ui-monospace, monospace", sombra: false },
  { nome: "Forte", css: "900 1em Impact, 'Arial Black', 'Roboto Condensed', sans-serif-condensed, sans-serif", sombra: false },
  { nome: "Manuscrita", css: "700 1em 'Segoe Script', 'Brush Script MT', 'Dancing Script', cursive", sombra: false }
];
// Pincel: desenha os traços (pontos de 0 a 1) num canvas W×H. Caneta = cheia; marca-texto = larga e transparente;
// neon = brilho da cor com o miolo branco; borracha = apaga o que já foi desenhado.
function pintarTracos(g, W, H, lista) {
  g.clearRect(0, 0, W, H);
  const caminho = (t) => {
    const p = t.pts.map(([x, y]) => [x * W, y * H]);
    g.beginPath(); g.moveTo(p[0][0], p[0][1]);
    if (p.length === 1) g.lineTo(p[0][0] + 0.1, p[0][1] + 0.1);
    for (let i = 1; i < p.length - 1; i++) { const mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2; g.quadraticCurveTo(p[i][0], p[i][1], mx, my); }
    if (p.length > 1) g.lineTo(p[p.length - 1][0], p[p.length - 1][1]);
  };
  lista.forEach((t) => {
    if (!t.pts?.length) return;
    const lw = Math.max(1, t.larg * W);
    g.save(); g.lineCap = "round"; g.lineJoin = "round";
    if (t.modo === "borracha") { g.globalCompositeOperation = "destination-out"; g.lineWidth = lw * 2; g.strokeStyle = "#000"; caminho(t); g.stroke(); }
    else if (t.modo === "marcador") { g.globalAlpha = 0.42; g.lineCap = "butt"; g.lineWidth = lw * 2.2; g.strokeStyle = t.cor; caminho(t); g.stroke(); }
    else if (t.modo === "neon") {
      g.shadowColor = t.cor; g.shadowBlur = lw * 2.4; g.lineWidth = lw * 1.3; g.strokeStyle = t.cor; caminho(t); g.stroke();
      g.shadowBlur = lw * 0.8; g.lineWidth = lw * 0.55; g.strokeStyle = "#fff"; caminho(t); g.stroke();
    } else { g.lineWidth = lw; g.strokeStyle = t.cor; caminho(t); g.stroke(); }
    g.restore();
  });
}
// Quebra o texto em linhas que cabem em "max" (palavras inteiras; palavra maior que a linha quebra no meio, como o
// overflow-wrap: anywhere do cartão).
function quebrarLinhas(g, texto, max) {
  const linhas = [];
  String(texto).split("\n").forEach((par) => {
    let atual = "";
    par.split(/(\s+)/).filter((x) => x !== "").forEach((p) => {
      if (/^\s+$/.test(p)) { if (atual) atual += " "; return; }
      let resto = p;
      while (resto) {
        const t = atual + resto;
        if (g.measureText(t).width <= max) { atual = t; resto = ""; break; }
        if (atual.trim()) { linhas.push(atual.trimEnd()); atual = ""; continue; }
        // palavra sozinha maior que a linha: corta letra a letra
        let k = 1; while (k < resto.length && g.measureText(resto.slice(0, k + 1)).width <= max) k++;
        linhas.push(resto.slice(0, k)); resto = resto.slice(k);
      }
    });
    linhas.push(atual.trimEnd());
  });
  return linhas;
}
// Alinhamento do texto por cima da foto (o padrão é no meio).
const ALINHAS = ["center", "left", "right"];
const iconeAlinha = (a) => {
  const d = a === "left" ? "M4 6H20M4 12H14M4 18H18" : a === "right" ? "M4 6H20M10 12H20M6 18H20" : "M4 6H20M7 12H17M5 18H19";
  return `<svg class="i s" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="${d}"/></svg>`;
};
const corTexto = (f) => (f === 3 || f === 7 ? "#1a1a1a" : "#ffffff");

// Cores do texto por cima da foto (como no Instagram) e quem fica com letra escura no destaque.
const CORES = ["#ffffff", "#111111", "#ffd60a", "#ff8a00", "#ff3d7f", "#00adee", "#38ef7d", "#8e2de2"];
const clara = (c) => ["#ffffff", "#ffd60a", "#38ef7d"].includes(c);
const FUNDO_VIDRO = "rgba(8,12,16,.55)"; // fundo escuro transparente atrás do texto
// Figurinhas de emoji (desenhadas na foto, como os outros textos).
const EMOJIS_FIG = ["😍", "😂", "🥰", "😎", "🤩", "🥳", "😮", "😢", "😡", "🙏", "👏", "💪", "🔥", "✨", "💯", "❤️", "💙", "💚", "💛", "💜", "⭐", "🌟", "🎉", "🎂", "☀️", "🌙", "🌊", "🌴", "🏖️", "🍕", "🍔", "☕", "🍺", "⚽", "🎵", "📍", "📸", "🏠", "🐶", "🐱", "🚗", "✈️", "💼", "🛠️", "💡", "✅", "👀", "🤝"];

// Figurinhas (hora, data, lugar, # e @), refeitas em 09/11/2026 ("mais profissional e sofisticado"): cartão em pílula com
// o ícone numa bolinha colorida à esquerda e o texto ao lado; 5 estilos (um toque troca), iguais na tela e na foto
// (o canvas desenha o mesmo ícone com Path2D a partir do MESMO traço do SVG).
//   0 Clássico (branco, bolinha na cor do tipo e texto em degradê) · 1 Vidro · 2 Noite (escuro com borda ciano)
//   3 Help Floripa (degradê ciano da marca) · 4 Vibrante (degradê na cor do tipo)
const ICONE_FIG = {
  hora: "M12 3a9 9 0 110 18 9 9 0 010-18zM12 7.5V12l3 2",
  data: "M4.5 6.5h15v13h-15zM4.5 10.5h15M8.5 4v4M15.5 4v4",
  local: "M12 21s-6.5-6-6.5-11a6.5 6.5 0 1113 0c0 5-6.5 11-6.5 11zM12 12.4a2.4 2.4 0 100-4.8 2.4 2.4 0 000 4.8z",
  hashtag: "M5 9.5h15M4 15h15M10.5 4l-2 16M16 4l-2 16",
  mencao: "M15.6 12a3.6 3.6 0 11-7.2 0 3.6 3.6 0 017.2 0zM15.6 12v1.4a2.6 2.6 0 005.2 0V12a8.8 8.8 0 10-3.4 6.9"
};
const COR_FIG = { hora: ["#ffb300", "#ff6d00"], data: ["#00c6a7", "#1e9bd7"], local: ["#7c5cff", "#00adee"], hashtag: ["#8e2de2", "#ff3d7f"], mencao: ["#ff8a00", "#ff3d7f"] };
const EST_FIG = [
  { nome: "Clássico", fundo: "#ffffff", cor: "#11161b", chip: "tipo", grad: true, sombra: true },
  { nome: "Vidro", fundo: "rgba(255,255,255,.18)", cor: "#ffffff", borda: "rgba(255,255,255,.65)", chip: "rgba(255,255,255,.26)" },
  { nome: "Noite", fundo: "rgba(7,12,16,.88)", cor: "#ffffff", borda: "rgba(0,173,238,.7)", chip: "tipo", sombra: true },
  { nome: "Help Floripa", fundo: ["#14bdf5", "#0081bb"], cor: "#ffffff", chip: "rgba(255,255,255,.24)", sombra: true },
  { nome: "Vibrante", fundo: "tipo", cor: "#ffffff", chip: "rgba(255,255,255,.24)", sombra: true }
];
const corFig = (fig) => COR_FIG[fig] || COR_FIG.local;
// O texto da figurinha sem o símbolo que a bolinha já mostra (📍, # e @ continuam no t.texto para os toques).
const rotuloFig = (t) => String(t.texto || "").replace(/^📍\s*/u, "").replace(/^[#@]/, "");
// Medidas do cartão (em px da letra): o mesmo cálculo para a tela e para a foto.
const MED_FIG = { padE: 0.3, chip: 1.2, gap: 0.36, padD: 0.66, alt: 1.78 };
const DIAS_SEM = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const MESES_C = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
function textoFigurinha(fig, local = "") {
  const d = new Date();
  if (fig === "hora") return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (fig === "data") return `${DIAS_SEM[d.getDay()]} · ${String(d.getDate()).padStart(2, "0")} ${MESES_C[d.getMonth()]}`;
  return "📍 " + (local || "Minha cidade");
}

// ---------- rascunhos do Flash: ficam neste aparelho (IndexedDB, por conta), até 10 ----------
function bdRasc() {
  return new Promise((ok, erro) => {
    const r = indexedDB.open("hf-flash-" + (eu?.uid || "x"), 1);
    r.onupgradeneeded = () => r.result.createObjectStore("rascunhos", { keyPath: "id" });
    r.onsuccess = () => ok(r.result); r.onerror = () => erro(r.error);
  });
}
async function lerRascunhos() {
  try {
    const db = await bdRasc();
    return await new Promise((ok, erro) => { const q = db.transaction("rascunhos").objectStore("rascunhos").getAll(); q.onsuccess = () => ok(q.result.sort((a, b) => b.quando - a.quando)); q.onerror = () => erro(q.error); });
  } catch { return []; }
}
async function apagarRascunho(id) {
  const db = await bdRasc();
  await new Promise((ok, erro) => { const tx = db.transaction("rascunhos", "readwrite"); tx.objectStore("rascunhos").delete(id); tx.oncomplete = ok; tx.onerror = () => erro(tx.error); });
}
async function guardarRascunho(r) {
  const db = await bdRasc();
  await new Promise((ok, erro) => { const tx = db.transaction("rascunhos", "readwrite"); tx.objectStore("rascunhos").put(r); tx.oncomplete = ok; tx.onerror = () => erro(tx.error); });
  for (const x of (await lerRascunhos()).slice(10)) await apagarRascunho(x.id).catch(() => {});
}
// Lista dos rascunhos (folha): miniatura, quando e apagar; tocar reabre no criador.
async function abrirRascunhos(aoAbrir, aoMudar = null) {
  const corpo = abrirLista("Rascunhos do Flash");
  corpo.replaceChildren(el("div", "lista-vazia", "Carregando..."));
  const pintarL = async () => {
    const l = await lerRascunhos();
    aoMudar?.(l.length); // o "Rascunhos · N" do criador acompanha (antes continuava "1" depois de apagar)
    if (!l.length) { corpo.replaceChildren(el("div", "lista-vazia", "Nenhum rascunho. Ao sair de um flash pela metade, escolha “Salvar como rascunho”.")); return; }
    const g = el("div", "rasc-grade");
    l.forEach((r) => {
      const c = el("div", "rasc-cel");
      const b = el("button", "rasc-abrir"); b.type = "button"; b.setAttribute("aria-label", "Abrir rascunho");
      if (r.foto) { const im = document.createElement("img"); im.src = r.foto; im.alt = ""; b.appendChild(im); }
      else { const [a, z2] = FUNDOS[r.fundoI] || FUNDOS[0]; b.style.background = `linear-gradient(160deg, ${a}, ${z2})`; b.appendChild(el("span", "rasc-txt", String(r.texto || "").slice(0, 60))); }
      b.appendChild(el("small", "rasc-quando", tempoRelativo(new Date(r.quando))));
      b.addEventListener("click", () => { document.querySelector("#folhaLista.aberta [data-fechar]")?.click(); setTimeout(() => aoAbrir(r), 200); });
      const x = el("button", "rasc-apagar"); x.type = "button"; x.setAttribute("aria-label", "Apagar rascunho"); x.appendChild(icone("lixo", "i xs"));
      x.addEventListener("click", async () => { if (!await confirmarHF({ titulo: "Apagar este rascunho?", texto: "Não dá para desfazer.", ok: "Apagar", icone: "lixo" })) return; await apagarRascunho(r.id).catch(() => {}); pintarL(); });
      c.append(b, x); g.appendChild(c);
    });
    corpo.replaceChildren(el("p", "rasc-nota", "Ficam guardados só neste aparelho (até 10)."), g);
  };
  pintarL();
}

function abrirCriador({ repost = null, post = null, imagem = null, selo: seloTexto = "", figuras = [], rascunho = null } = {}) {
  const soltarZoom = travarZoom();
  setTimeout(tirarCapa, 120); // a tela preta do feed.html (?repostar= / ?novoFlash=) sai quando o criador já está por cima
  const fundo = el("div", "flash-criar"); fundo.addEventListener("contextmenu", (e) => { if (!e.target.closest("input, textarea")) e.preventDefault(); }); fundo.setAttribute("role", "dialog"); fundo.setAttribute("aria-modal", "true"); fundo.setAttribute("aria-label", "Novo flash");
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
  // Amigos próximos (como no Instagram, escolhido em cada flash): estrela verde acesa = só para a sua lista.
  // Começa como está nas Configurações do Flash.
  // Todo flash começa para todos (como no Instagram); a estrela verde escolhe os Amigos próximos só para este.
  let paraAmigos = false;
  const bAmigos = el("button", "flash-ferr-btn flash-amigos"); bAmigos.type = "button";
  bAmigos.innerHTML = '<svg class="i s" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8z" fill="currentColor"/></svg>';
  const pintarAmigos = () => {
    bAmigos.classList.toggle("on", paraAmigos); bAmigos.setAttribute("aria-pressed", String(paraAmigos));
    bAmigos.setAttribute("aria-label", paraAmigos ? "Só para os Amigos próximos (toque para todos)" : "Para todos que seguem você (toque para os Amigos próximos)");
    bAmigos.title = paraAmigos ? "Amigos próximos" : "Todos";
    publicar.classList.toggle("amigos", paraAmigos);
    publicar.firstChild.textContent = paraAmigos ? "Amigos próximos" : "Compartilhar";
    if (!meusNeg.length) dica.textContent = dicaPadrao();
  };
  bAmigos.addEventListener("click", async () => {
    if (!paraAmigos && !configFlash().amigos.length) {
      const l = await escolherPessoas("Amigos próximos", []);
      if (!l?.length) return;
      await salvarConfigFlash({ ...configFlash(), amigos: l }).catch(() => {});
    }
    paraAmigos = !paraAmigos; pintarAmigos();
    const n = configFlash().amigos.length;
    toast(paraAmigos ? `Este flash vai só para os Amigos próximos (${n} ${n === 1 ? "pessoa" : "pessoas"})` : "Este flash vai para todos que seguem você");
  });
  // Público deste flash (idade, gênero, lugar, seguidores), como no Diário: a página "Público" em tela cheia.
  let alvo = null;
  const bAlvo = el("button", "flash-ferr-btn flash-alvo"); bAlvo.type = "button"; bAlvo.appendChild(icone("alvo", "i s"));
  const pintarAlvo = () => {
    const tem = !!alvo; bAlvo.classList.toggle("on", tem);
    bAlvo.title = tem ? "Público: " + resumoPublico(alvo) : "Público: todos";
    bAlvo.setAttribute("aria-label", tem ? `Público deste flash: ${resumoPublico(alvo)} (toque para mudar)` : "Público deste flash: todos (toque para escolher)");
  };
  bAlvo.addEventListener("click", async () => {
    const v = await escolherPublico(alvo, { ...ajudaPublico(), sub: "Quem vê este flash" });
    if (v === undefined) return; // voltou sem mudar
    alvo = v ? (publicoParaGravar(v) || null) : null; pintarAlvo();
    if (!meusNeg.length) dica.textContent = dicaPadrao();
    document.body.classList.add("travado");
    toast(alvo ? `Este flash vai para: ${resumoPublico(alvo)}` : "Este flash vai para todos que seguem você");
  });
  pintarAlvo();
  const esq = el("div", "flash-esq"); esq.append(bX, bCfg, bAmigos, bAlvo);
  topo.append(esq, ferramentas);
  const lixo = el("div", "flash-lixo"); lixo.appendChild(icone("lixo", "i s")); lixo.setAttribute("aria-hidden", "true");
  // Desenho do pincel: fica entre a foto e os textos (e sai igual na foto publicada).
  const desenho = document.createElement("canvas"); desenho.className = "flash-desenho"; desenho.setAttribute("aria-hidden", "true");
  palco.append(midiaBox, guias, desenho, camada, topo, lixo);
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
  const dicaPadrao = () => (paraAmigos ? "Fica 24 horas só para os seus Amigos próximos" : "Fica 24 horas para quem segue você") + (alvo ? ` · público: ${resumoPublico(alvo)}` : " · você vê quem viu");
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
    dica.textContent = !meusNeg.length ? dicaPadrao()
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
  // _publico: a escolha deste flash (todos ou Amigos próximos); o gravar() tira o "_" antes de salvar.
  const camposDestino = () => ({ _publico: paraAmigos ? "amigos" : "todos", ...(alvo ? { alvo } : {}), ...(dest.negocios.size ? { negocios: [...dest.negocios].slice(0, 4), ...(dest.perfil ? {} : { perfil: false }) } : {}) });
  baixo.append(linhaBaixo, dica);
  pintarAmigos();
  // Moldura com o degradê do Flash em volta do cartão (que ocupa quase a tela toda).
  const moldura = el("div", "flash-moldura"); moldura.appendChild(palco);
  caixa.append(moldura, baixo);
  fundo.appendChild(caixa);
  document.body.appendChild(fundo);
  document.body.classList.add("travado");

  // Começa em Foto ou em Texto (Configurações do Flash → Criar flash).
  let modo = !repost && !post && !imagem && !rascunho && configFlash().modoInicial === "texto" ? "texto" : "foto", fundoI = Math.floor(Math.random() * FUNDOS.length), letraI = 0;
  let foto = null, video = null, enviando = false;
  // Foto no cartão: zoom (1 a 5) e deslocamento a partir do centro (em px do cartão).
  let img = null, z = 1, ox = 0, oy = 0;
  // Repost: a foto do original fica parada (as figurinhas dele vão junto, no mesmo lugar).
  let fotoFixa = false;
  let filtro = FILTROS[0];             // filtro escolhido (prévia e foto passam pelo mesmo processamento)
  const fotoFiltrada = new Map();      // filtro -> foto já processada (prévia rápida)
  let cam = null;                      // { stream, frente } enquanto a câmera do app está aberta
  let virada = false;                  // câmera da frente (selfie)
  const textos = []; // { texto, x, y (0..1), tam (fração da largura), letra, cor, destaque, el }
  const doOriginal = []; // repost: prévias das figurinhas do flash original (não se mexem e não são gravadas de novo)
  const tracos = []; // pincel: { modo caneta|marcador|neon|borracha, cor, larg (fração da largura), pts [[x, y] 0..1] }

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
  // Fotos: trocar o fundo, foto por cima (mexe com os dedos, moldura e ordem) e modelos com várias fotos.
  const bImagens = el("button", "flash-ferr-btn"); bImagens.type = "button"; bImagens.setAttribute("aria-label", "Fotos: trocar o fundo, foto por cima ou modelo com várias fotos"); bImagens.title = "Fotos"; bImagens.appendChild(icone("imagem", "i s"));
  // Menções (@): o número mostra quantas pessoas estão mencionadas (figurinha, texto ou só aviso).
  const bArroba = el("button", "flash-ferr-btn flash-arroba"); bArroba.type = "button"; bArroba.title = "Menções"; bArroba.setAttribute("aria-label", "Menções");
  const contaArroba = el("b", "flash-onde-n"); contaArroba.hidden = true;
  bArroba.append(el("span", "arr", "@"), contaArroba);
  bArroba.addEventListener("pointerdown", (e) => e.preventDefault());
  const bPincel = el("button", "flash-ferr-btn"); bPincel.type = "button"; bPincel.setAttribute("aria-label", "Desenhar"); bPincel.title = "Desenhar"; bPincel.appendChild(icone("pincel", "i s"));
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
  // Temporizador: desligado → 3 s → 10 s (cada toque troca).
  const bTempo = el("button", "flash-ferr-btn tempo"); bTempo.type = "button"; bTempo.title = "Temporizador";
  bTempo.innerHTML = '<svg class="i s" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.2 1.6M9.5 3h5"/></svg><b class="tempo-n"></b>';
  const contagemCam = el("div", "flash-contagem"); contagemCam.setAttribute("aria-live", "assertive");
  let comTempo = 0, lanterna = false, filtrosAbertos = false;
  const pintarTempo = () => {
    bTempo.classList.toggle("on", !!comTempo);
    bTempo.querySelector(".tempo-n").textContent = comTempo ? comTempo + "s" : "";
    bTempo.setAttribute("aria-label", comTempo ? `Temporizador: ${comTempo} segundos (toque para trocar)` : "Temporizador desligado (toque para ligar)");
  };
  pintarTempo();

  const ajustarLetra = () => {
    const n = area.value.length;
    area.style.fontSize = (n < 40 ? 34 : n < 90 ? 27 : n < 150 ? 22 : 19) + "px";
  };
  const prontoParaPublicar = () => (modo === "texto" ? !!area.value.trim() || textos.length > 0 : !!(foto || video));
  function pintar() {
    mTexto.setAttribute("aria-selected", String(modo === "texto")); mFoto.setAttribute("aria-selected", String(modo === "foto"));
    ferramentas.replaceChildren();
    midiaBox.replaceChildren();
    palco.style.background = "";
    palco.classList.toggle("modo-texto", modo === "texto");
    camada.hidden = !(modo === "texto" || foto);
    legenda.remove(); if (modo !== "texto") area.remove(); escolher.remove(); camUI.remove(); contagemCam.remove(); tiraFiltros.remove();
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
      if (!area.isConnected) palco.appendChild(area);
      ferramentas.append(bLetra, bFundo, bFig, bArroba, bPincel, bImagens);
      if (meusNeg.length) ferramentas.append(bOnde);
      if (document.activeElement !== area) setTimeout(() => area.focus(), 60);
    } else if (cam) {
      midiaBox.appendChild(camBox);
      pintarFiltroNaTela();
      pintarTira();
      camUI.prepend(tiraFiltros);
      palco.append(camUI, contagemCam);
      const temLanterna = !virada && !!cam.stream.getVideoTracks()[0]?.getCapabilities?.().torch;
      if (temLanterna) ferramentas.append(bLanterna);
      ferramentas.append(bTempo);
      pintarTempo(); bLanterna.classList.toggle("on", lanterna);
    } else if (foto || video) {
      if (foto) {
        midiaBox.appendChild(fotoBox); posicionar(); pintarFiltroNaTela();
        ferramentas.append(bAa, bFig, bArroba, bPincel, bFiltros, bImagens);
        if (meusNeg.length) ferramentas.prepend(bOnde);
        bFiltros.classList.toggle("on", filtrosAbertos);
        if (filtrosAbertos) { pintarTira(); palco.appendChild(tiraFiltros); }
      } else { midiaBox.appendChild(video.el); ferramentas.append(bArroba, bTrocar); if (meusNeg.length) ferramentas.prepend(bOnde); }
      palco.appendChild(legenda);
    } else {
      palco.appendChild(escolher);
    }
    palco.classList.toggle("com-camera", !!cam && modo === "foto");
    palco.classList.toggle("com-filtros", filtrosAbertos && !!foto && !cam);
    publicar.disabled = !prontoParaPublicar();
  }
  area.addEventListener("input", () => { ajustarLetra(); publicar.disabled = !area.value.trim(); });
  // Trocar letra/fundo NÃO tira o foco do texto (antes o teclado piscava e o cartão era medido de novo, espremido).
  [bFundo, bLetra].forEach((b) => b.addEventListener("pointerdown", (e) => e.preventDefault()));
  bFundo.addEventListener("click", () => { fundoI = (fundoI + 1) % FUNDOS.length; pintar(); });
  bLetra.addEventListener("click", () => { letraI = (letraI + 1) % LETRAS.length; toast(`Letra: ${LETRAS[letraI].nome}`); pintar(); });
  mTexto.addEventListener("click", () => { modo = "texto"; pintar(); });
  mFoto.addEventListener("click", () => { modo = "foto"; pintar(); });
  bCam.addEventListener("click", () => abrirCamera());
  bCamGal.addEventListener("click", () => escolherArquivo(false));
  bVirar.addEventListener("click", () => { virada = !virada; lanterna = false; abrirCamera(); });
  bTempo.addEventListener("click", () => { comTempo = comTempo === 0 ? 3 : comTempo === 3 ? 10 : 0; pintarTempo(); toast(comTempo ? `Temporizador: ${comTempo} segundos` : "Temporizador desligado"); });
  bLanterna.addEventListener("click", async () => {
    try { lanterna = !lanterna; await cam.stream.getVideoTracks()[0].applyConstraints({ advanced: [{ torch: lanterna }] }); bLanterna.classList.toggle("on", lanterna); bLanterna.replaceChildren(icone(lanterna ? "raio" : "raio-off", "i s")); }
    catch { lanterna = false; toast("Este aparelho não deixa ligar a lanterna pelo site."); }
  });
  bDisparo.addEventListener("click", () => disparar());
  bFiltros.addEventListener("click", () => { filtrosAbertos = !filtrosAbertos; pintar(); });
  bGal.addEventListener("click", () => escolherArquivo(false));
  bTrocar.addEventListener("click", () => escolherArquivo(false));
  bImagens.addEventListener("click", () => abrirImagens());
  bAa.addEventListener("click", () => editarTexto(null));
  bCfg.addEventListener("click", () => { abrirConfigFlash(); const f = $("folhaLista"); const volta = () => { f?.removeEventListener("fechada", volta); setTimeout(() => { if (fundo.isConnected && paraAmigos && !configFlash().amigos.length) { paraAmigos = false; pintarAmigos(); } }, 50); }; f?.addEventListener("fechada", volta); });
  bFig.addEventListener("click", () => abrirFigurinhas());

  // ---------- foto: arrastar e pinça direto no cartão ----------
  // Tamanho de verdade do cartão (offsetWidth não muda com a animação de abrir; getBoundingClientRect pegava o
  // cartão ainda encolhido e a foto ficava menor, com uma faixa escura à direita e embaixo).
  const medidas = () => ({ W: palco.offsetWidth, H: palco.offsetHeight });
  if ("ResizeObserver" in window) new ResizeObserver(() => { if (foto && fotoBox.isConnected) posicionar(); }).observe(palco);
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
    if (!img || !foto || fotoFixa) return;
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
  midiaBox.addEventListener("wheel", (e) => { if (!img || fotoFixa) return; e.preventDefault(); z = Math.min(5, Math.max(1, z * (e.deltaY < 0 ? 1.08 : 1 / 1.08))); posicionar(); }, { passive: false });
  midiaBox.addEventListener("dblclick", () => { if (fotoFixa) return; z = 1; ox = 0; oy = 0; posicionar(); });
  // Teclado aberto (o site usa "resizes-content"): o cartão NÃO encolhe junto com a tela (antes os painéis de
  // Mencionar, Caixa de perguntas e Texto ficavam espremidos e cortados). A altura fica presa e os painéis usam só a
  // parte do cartão que continua à vista (--tecl = quanto o teclado cobre).
  const toqueTela = matchMedia("(pointer: coarse)").matches;
  const digitandoAqui = () => { const a = document.activeElement; return !!a && fundo.contains(a) && (a.tagName === "TEXTAREA" || (a.tagName === "INPUT" && !/^(range|checkbox|radio|button|submit)$/.test(a.type))); };
  let alturaFixa = 0, larguraFixa = 0, vhMax = 0;
  function medirCartao() {
    if (!fundo.isConnected) return;
    const vh = window.visualViewport?.height || innerHeight;
    if (innerWidth !== larguraFixa) vhMax = 0;
    // Tela bem mais baixa que a maior já vista nesta largura = teclado aberto (mesmo no instante em que o foco
    // trocou de campo): o cartão não é medido de novo.
    const tecladoAberto = toqueTela && vhMax > 0 && vh < vhMax - 120;
    if (toqueTela && alturaFixa && innerWidth === larguraFixa && (digitandoAqui() || tecladoAberto)) {
      const visivel = Math.max(180, Math.min(alturaFixa, vh - palco.getBoundingClientRect().top - 6));
      const coberto = Math.round(alturaFixa - visivel);
      fundo.style.setProperty("--tecl", coberto + "px");
      fundo.classList.toggle("teclado", coberto > 40);
      return;
    }
    fundo.classList.remove("teclado"); fundo.style.setProperty("--tecl", "0px");
    palco.style.height = "";
    alturaFixa = palco.offsetHeight; larguraFixa = innerWidth; vhMax = Math.max(vhMax, vh);
    if (toqueTela && alturaFixa) palco.style.height = alturaFixa + "px";
  }
  medirCartao();
  let tMedir = null;
  const medirDepois = () => { clearTimeout(tMedir); tMedir = setTimeout(medirCartao, 60); };
  const aoRedimensionar = () => { medirCartao(); posicionar(); textos.forEach(pintarTexto); doOriginal.forEach(pintarOriginal); separarOriginal(); };
  window.addEventListener("resize", aoRedimensionar);
  window.visualViewport?.addEventListener("resize", aoRedimensionar);
  fundo.addEventListener("focusin", medirDepois);
  fundo.addEventListener("focusout", medirDepois);

  // ---------- texto por cima da foto ----------
  function pintarTexto(t) {
    const { W } = medidas();
    const e = t.el;
    e.style.left = t.x * 100 + "%"; e.style.top = t.y * 100 + "%";
    // Giro (dois dedos, como no Instagram): só nos textos, figurinhas, emojis e fotos por cima.
    e.style.transform = `translate(-50%, -50%)${t.rot ? ` rotate(${t.rot}deg)` : ""}`;
    if (t.ft) {
      // Foto por cima: largura = tam × cartão; toque troca a moldura (sem, branca, redonda) e traz para a frente.
      e.className = `flash-txt flash-ft ft-${t.estilo || 0}`;
      e.style.width = Math.round(t.tam * W) + "px";
      if (!e.firstChild) { const im = t.img.cloneNode(); im.draggable = false; im.alt = ""; e.appendChild(im); }
      return;
    }
    e.textContent = t.texto;
    if (t.lk) {
      // Prévia do link para o perfil de negócio (quem vê toca e vai para o perfil).
      e.className = "flash-txt flash-link";
      e.style.fontSize = Math.round(W * 0.04) + "px";
      const pill = el("span", "fe-link"); pill.append(icone(ICONE_NEGOCIO[t.negocio.tipo] || "loja", "i s"), el("span", null, t.negocio.nome || "Perfil do negócio"), icone("avancar", "i xs"));
      e.replaceChildren(pill);
      return;
    }
    if (t.ct) {
      // Prévia da contagem (quem vê acompanha os números andando e pode pedir lembrete)
      e.className = "flash-txt flash-enq flash-ct";
      e.style.fontSize = Math.round(W * 0.042) + "px";
      const card = cartaoContagem({ titulo: t.titulo, fim: t.fim, cor: t.tema });
      const fake = el("span", "ctg-lembrar falso"); fake.append(icone("sino", "i xs"), document.createTextNode("Lembrar-me"));
      card._acoes.appendChild(fake);
      e.replaceChildren(card);
      return;
    }
    if (t.cx) {
      // Prévia da caixa de perguntas (quem vê escreve a resposta; aqui só arrasta ou toca para editar).
      e.className = "flash-txt flash-enq";
      e.style.fontSize = Math.round(W * 0.042) + "px";
      const card = el("div", "fe-enq fe-cx" + temaFig(t.tema));
      const cab = el("small", "fe-cx-cab"); cab.append(icone(t.anonima ? "mascara" : "caixa", "i xs"), document.createTextNode(t.anonima ? "PERGUNTAS · ANÔNIMA" : "PERGUNTAS"));
      card.append(cab, el("strong", null, t.pergunta), el("span", "fe-cx-campo", "Escreva aqui..."));
      e.replaceChildren(card);
      return;
    }
    if (t.enq) {
      // Prévia da enquete (quem vê vota no flash; aqui só arrasta ou toca para editar).
      e.className = "flash-txt flash-enq";
      e.style.fontSize = Math.round(W * 0.042) + "px";
      const ehTeste = Number.isInteger(t.certa);
      const card = el("div", "fe-enq" + (ehTeste ? " fe-teste" : "") + temaFig(t.tema)); card.appendChild(el("strong", null, t.pergunta));
      if (ehTeste) {
        t.opcoes.forEach((o, i) => { const sp = el("span", i === t.certa ? "certa" : null); sp.append(el("b", null, "ABCD"[i]), document.createTextNode(o)); card.appendChild(sp); });
        card.appendChild(el("small", "fe-enq-dur", "TESTE · a certa fica escondida para quem vê"));
        e.replaceChildren(card);
        return;
      }
      t.opcoes.forEach((o) => card.appendChild(el("span", null, o)));
      const d = t.duracao || { dur: 1440 };
      card.appendChild(el("small", "fe-enq-dur", d.fim ? `Termina às ${new Date(d.fim).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : `Dura ${d.dur >= 1440 ? "24 h" : d.dur / 60 + " h"}`));
      e.replaceChildren(card);
      return;
    }
    if (t.fig) {
      t.estilo = (t.estilo || 0) % EST_FIG.length;
      const es = EST_FIG[t.estilo], ct = corFig(t.fig);
      e.className = `flash-txt flash-fig fig-${t.fig} est-${t.estilo}`;
      e.style.font = `${t.fig === "hora" ? 800 : 750} ${Math.round(t.tam * W)}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
      e.style.color = es.cor;
      const fundo = es.fundo === "tipo" ? ct : es.fundo;
      e.style.background = Array.isArray(fundo) ? `linear-gradient(135deg, ${fundo[0]}, ${fundo[1]})` : fundo;
      e.style.boxShadow = [es.borda ? `inset 0 0 0 .07em ${es.borda}` : "", es.sombra ? "0 .18em .6em rgba(0,0,0,.28)" : ""].filter(Boolean).join(", ") || "none";
      const chip = el("span", "fig-chip");
      chip.style.background = es.chip === "tipo" ? `linear-gradient(135deg, ${ct[0]}, ${ct[1]})` : es.chip;
      chip.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONE_FIG[t.fig] || ICONE_FIG.local}"/></svg>`;
      const tx = el("span", "fig-tx" + (es.grad ? " fig-grad" : ""), rotuloFig(t));
      if (es.grad) tx.style.backgroundImage = `linear-gradient(90deg, ${ct[0]}, ${ct[1]})`;
      e.replaceChildren(chip, tx);
      // Menção oculta ou "só na lista": fica apagadinha aqui e NÃO vai desenhada no flash.
      e.classList.toggle("oculta", !!(t.oculta || t.soLista));
      e.title = t.oculta ? "Menção oculta: só o aviso, não aparece no flash" : t.soLista ? "Só na lista de mencionados (não vai desenhada)" : "";
      return;
    }
    e.style.font = LETRAS[t.letra].css.replace("1em", Math.round(t.tam * W) + "px");
    e.style.textAlign = t.alinha || "center";
    e.style.color = t.destaque ? (clara(t.cor) ? "#111" : "#fff") : t.cor;
    e.style.background = t.destaque ? t.cor : t.vidro ? FUNDO_VIDRO : "transparent";
    e.classList.toggle("destaque", !!(t.destaque || t.vidro));
    e.classList.toggle("neon", LETRAS[t.letra].sombra && !t.destaque && !t.vidro);
  }
  // ---------- fotos: fundo, por cima e modelos ----------
  // Modelos (colagem): células em fração do cartão 9:16; a montagem vira a foto de fundo (dá para pôr figurinhas depois).
  const MODELOS = [
    ["duas-v", "2 empilhadas", [[0, 0, 1, 0.5], [0, 0.5, 1, 0.5]]],
    ["duas-h", "2 lado a lado", [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]]],
    ["tres", "1 + 2", [[0, 0, 1, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]]],
    ["tres-v", "3 faixas", [[0, 0, 1, 1 / 3], [0, 1 / 3, 1, 1 / 3], [0, 2 / 3, 1, 1 / 3]]],
    ["quatro", "4 (2 × 2)", [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]]],
    ["seis", "6 (2 × 3)", [0, 1, 2].flatMap((r) => [[0, r / 3, 0.5, 1 / 3], [0.5, r / 3, 0.5, 1 / 3]])]
  ];
  const lerImagem = (arq, max = 1600) => new Promise((ok, erro) => {
    const u = URL.createObjectURL(arq), im = new Image();
    im.onload = () => {
      const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
      const c = document.createElement("canvas"); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
      const r = new Image(); r.onload = () => ok(r); r.onerror = erro; r.src = c.toDataURL("image/jpeg", 0.88);
    };
    im.onerror = () => { URL.revokeObjectURL(u); erro(new Error("Não foi possível abrir esta foto.")); };
    im.src = u;
  });
  // Limitador: o seletor de fotos do celular não deixa limitar quantas a pessoa marca. Se vierem mais do que cabe,
  // abre "Escolha N fotos" com as marcadas (já vêm as primeiras escolhidas, na ordem de toque, com o número).
  function pedirFotos(max, aoEscolher) {
    if (max < 1) return;
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.multiple = max > 1;
    inp.addEventListener("change", async () => {
      let arqs = [...(inp.files || [])].filter((f) => f.type.startsWith("image/"));
      if (!arqs.length) return;
      if (arqs.length > max) { arqs = await escolherDentre(arqs, max); if (!arqs?.length) return; }
      try { aoEscolher(await Promise.all(arqs.map((f) => lerImagem(f, max > 1 ? 1400 : 1000)))); }
      catch (e) { toast(erroAmigavel(e)); }
    });
    toast(max === 1 ? "Escolha 1 foto" : `Escolha até ${max} fotos`);
    inp.click();
  }
  function escolherDentre(arqs, max) {
    return new Promise((fim) => {
      palco.querySelector(".flash-figs")?.remove();
      const pn = el("div", "flash-figs fe-escolha");
      const cab = el("div", "fe-cab");
      const x = el("button", "flash-ferr-btn"); x.type = "button"; x.setAttribute("aria-label", "Cancelar"); x.appendChild(icone("fechar", "i s"));
      const tit = el("div", "fe-esc-tit"); const t1 = el("strong", null, `Escolha até ${max} ${max === 1 ? "foto" : "fotos"}`); const t2 = el("small");
      tit.append(t1, t2);
      const ok = el("button", "fe-pronto"); ok.type = "button";
      cab.append(x, tit, ok);
      const aviso = el("p", "fe-esc-aviso", `Você marcou ${arqs.length}. Aqui cabem ${max}: toque para escolher quais entram (o número é a ordem).`);
      const grade = el("div", "fe-esc-grade");
      const urls = arqs.map((f) => URL.createObjectURL(f));
      const sel = arqs.slice(0, max).map((_, i) => i);
      const pintar = () => {
        [...grade.children].forEach((c, i) => {
          const k = sel.indexOf(i); c.classList.toggle("on", k >= 0); c.classList.toggle("cheio", k < 0 && sel.length >= max);
          c.querySelector(".fe-esc-n").textContent = k >= 0 ? String(k + 1) : "";
          c.setAttribute("aria-pressed", String(k >= 0));
        });
        t2.textContent = `${sel.length} de ${max}`;
        ok.textContent = sel.length ? `Usar ${sel.length}` : "Usar";
        ok.disabled = !sel.length;
      };
      urls.forEach((u, i) => {
        const c = el("button", "fe-esc-cel"); c.type = "button"; c.setAttribute("aria-label", `Foto ${i + 1}`);
        const im = document.createElement("img"); im.src = u; im.alt = ""; im.decoding = "async";
        c.append(im, el("span", "fe-esc-n"));
        c.addEventListener("click", () => {
          const k = sel.indexOf(i);
          if (k >= 0) sel.splice(k, 1);
          else if (sel.length >= max) { toast(`Limite de ${max} ${max === 1 ? "foto" : "fotos"}. Tire uma para trocar.`); navigator.vibrate?.(15); return; }
          else sel.push(i);
          pintar();
        });
        grade.appendChild(c);
      });
      const sair = (l) => { pn.remove(); urls.forEach((u) => URL.revokeObjectURL(u)); fim(l); };
      x.addEventListener("click", () => sair(null));
      ok.addEventListener("click", () => sair(sel.map((i) => arqs[i])));
      pn.append(cab, aviso, grade);
      palco.appendChild(pn);
      pintar();
    });
  }
  function abrirImagens() {
    palco.querySelector(".flash-figs")?.remove();
    const pn = el("div", "flash-figs flash-imagens");
    const cab = el("div", "fe-cab"); const ok = el("button", "fe-pronto", "Fechar"); ok.type = "button";
    cab.append(el("strong", "figs-tit", "Fotos"), el("span", "esp"), ok);
    ok.addEventListener("click", () => pn.remove());
    const corpo = el("div", "mencao-corpo");
    const grade = el("div", "figs-grade");
    const pilula = (ic, rot, cor, fn, extra = "") => {
      const b = el("button", "fig-op fig-pilula"); b.type = "button"; b.style.setProperty("--fc", cor);
      b.append(icone(ic, "i s"), el("span", null, rot)); if (extra) b.appendChild(el("small", null, extra));
      b.addEventListener("click", fn); grade.appendChild(b); return b;
    };
    if (modo === "foto" && (foto || video)) pilula("imagem", "Trocar o fundo", "#00adee", () => { pn.remove(); escolherArquivo(false); });
    const vagas = 4 - textos.filter((t) => t.ft).length;
    pilula("fotos", "Foto por cima", "#ff3d7f", () => {
      if (vagas < 1) { toast("Já tem 4 fotos por cima: arraste uma até a lixeira para pôr outra."); return; }
      pn.remove(); pedirFotos(vagas, (l) => l.forEach((im, i) => criarTexto({ ft: true, img: im, texto: "", x: 0.5 + i * 0.05, y: 0.42 + i * 0.05, tam: 0.55, estilo: 1, rot: i ? (i % 2 ? 4 : -4) : 0, letra: 0, cor: "#fff", destaque: false }))); }, vagas < 4 ? (vagas ? `mais ${vagas}` : "4 de 4") : "até 4");
    const mods = el("div", "fm-modelos");
    MODELOS.forEach(([k, nome, cels]) => {
      const b = el("button", "fm-modelo"); b.type = "button"; b.setAttribute("aria-label", `Modelo ${nome}`);
      const pv = el("span", "fm-prev");
      cels.forEach(([x, y, w, h]) => { const c = el("i"); c.style.left = x * 100 + "%"; c.style.top = y * 100 + "%"; c.style.width = w * 100 + "%"; c.style.height = h * 100 + "%"; pv.appendChild(c); });
      b.append(pv, el("small", null, nome));
      b.addEventListener("click", () => { pn.remove(); pedirFotos(cels.length, (l) => montarModelo(cels, l)); });
      mods.appendChild(b);
    });
    corpo.append(grade, el("p", "figs-sec", "Modelo com várias fotos"), mods,
      el("p", "figs-dica", "Foto por cima: arraste, use dois dedos para aumentar e girar, toque para trocar a moldura (e trazer para a frente) e arraste até a lixeira para tirar."));
    pn.append(cab, corpo);
    palco.appendChild(pn);
  }
  async function montarModelo(cels, fotos) {
    const OW = 1080, OH = 1920, gap = 10;
    const c = document.createElement("canvas"); c.width = OW; c.height = OH;
    const g = c.getContext("2d");
    g.fillStyle = "#0b0f13"; g.fillRect(0, 0, OW, OH);
    cels.forEach(([x, y, w, h], i) => {
      const cx = x * OW + gap / 2, cy = y * OH + gap / 2, cw = w * OW - gap, ch = h * OH - gap;
      const im = fotos[i % fotos.length];
      if (!im) return;
      const k = Math.max(cw / im.naturalWidth, ch / im.naturalHeight), iw = im.naturalWidth * k, ih = im.naturalHeight * k;
      g.save(); g.beginPath(); (g.roundRect ? g.roundRect(cx, cy, cw, ch, 14) : g.rect(cx, cy, cw, ch)); g.clip();
      g.drawImage(im, cx + (cw - iw) / 2, cy + (ch - ih) / 2, iw, ih);
      g.restore();
    });
    if (fotos.length < cels.length) toast(`O modelo tem ${cels.length} lugares: repeti as fotos para completar.`);
    const blob = await new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.9));
    if (!blob) return;
    pararCamera();
    await usarFoto(URL.createObjectURL(blob));
  }

  // ---------- figurinhas: arrastar, pinça (aumentar/diminuir) e girar ----------
  // Como no Instagram: um dedo arrasta de qualquer ponto da figurinha (ela acompanha o dedo, sem pular); dois dedos (o 2º
  // pode cair fora dela) aumentam, diminuem e giram. Durante o gesto só a posição/tamanho mudam (nada é redesenhado:
  // antes cada movimento remontava a figurinha embaixo do dedo e o arrasto travava). Guias do meio (vertical e
  // horizontal) encaixam com uma vibração; a lixeira acende quando o DEDO chega nela e a figurinha encolhe por cima.
  // Enquete, teste, perguntas, contagem e link ficam inteiros dentro do cartão (do mesmo jeito que o visor mostra) e,
  // desde 09/11/2026, também aumentam e diminuem com dois dedos (sem girar): o tamanho vai gravado como `k` (0,6 a 1,3)
  // e o visor desenha do mesmo tamanho (antes a pinça nelas "bugava": a figurinha só seguia o 1º dedo).
  const LIMITE_TAM = (t) => (t.ft ? [0.15, 1.3] : t.emoji ? [0.05, 0.5] : t.fig ? [0.03, 0.22] : [0.03, 0.3]);
  const LIMITE_K = [0.6, 1.3]; // 1,3 × 74% do cartão = 96%: a enquete maior ainda cabe inteira
  const escalavel = (t) => !!(t.enq || t.cx || t.ct || t.lk);
  const giraEsse = (t) => !(t.enq || t.cx || t.lk || t.ct);
  const interativa = (t) => !!(t.enq || t.cx || t.ct);
  const gesto = { t: null, pts: new Map(), base: null, mexeu: false, dois: false, quadro: 0, guiaV: false, guiaH: false, noLixo: false };
  const ptsArr = () => [...gesto.pts.values()];
  function zerarGesto() {
    if (gesto.t?.el) gesto.t.el.classList.remove("no-lixo", "segurando");
    gesto.t = null; gesto.base = null; gesto.mexeu = false; gesto.dois = false; gesto.pts.clear();
    gesto.guiaV = gesto.guiaH = gesto.noLixo = false;
    cancelAnimationFrame(gesto.quadro); gesto.quadro = 0;
    palco.classList.remove("arrastando-txt"); lixo.classList.remove("sobre");
    guias.querySelectorAll(".on").forEach((g) => g.classList.remove("on"));
  }
  function baseGesto() {
    const t = gesto.t, l = ptsArr();
    if (l.length >= 2 && (giraEsse(t) || escalavel(t))) {
      const [a, b] = l;
      gesto.base = { dois: true, escala: !giraEsse(t), d: Math.hypot(a.x - b.x, a.y - b.y) || 1, ang: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, tam: t.tam, k: t.k || 1, rot: t.rot || 0, tx: t.x, ty: t.y };
      gesto.dois = true;
    } else if (l.length) gesto.base = { dois: false, x: l[0].x, y: l[0].y, tx: t.x, ty: t.y };
  }
  // Só o tamanho (pinça), sem remontar a figurinha.
  function ajustarTam(t) {
    if (escalavel(t)) { moverFig(t); return; }
    const { W } = medidas(), e = t.el, px = Math.round(t.tam * W) + "px";
    if (t.ft) e.style.width = px;
    else if (t.fig) e.style.fontSize = px;
    else if (!(t.enq || t.cx || t.ct || t.lk)) e.style.font = LETRAS[t.letra].css.replace("1em", px);
  }
  // As prévias do original ficam empilhadas como no visor (lá, as que se cobrem são separadas).
  function separarOriginal() {
    const { W, H } = medidas(); if (!W || !H || doOriginal.length < 2) return;
    empilhar(doOriginal.map((t) => ({ t, cy: t.y * H, h: t.el.offsetHeight, cx: t.x * W, w: t.el.offsetWidth })), H * 0.11, H - Math.max(H * 0.1, 70))
      .forEach((x) => { x.t.y = x.cy / H; moverFig(x.t); });
  }
  function pintarOriginal(t) {
    pintarTexto(t); t.el.classList.add("flash-orig");
    const { W, H } = medidas(); if (W && H) limitar(t, W, H); moverFig(t);
  }
  // A escala vai DEPOIS do translate(-50%, -50%) no mesmo transform (a propriedade `scale` do CSS é aplicada antes e
  // aumentava junto o deslocamento: a enquete maior escorregava para a esquerda).
  function moverFig(t) {
    const e = t.el, k = escalavel(t) ? t.k || 1 : 1;
    e.style.left = t.x * 100 + "%"; e.style.top = t.y * 100 + "%";
    e.style.transform = `translate(-50%, -50%)${t.rot ? ` rotate(${t.rot}deg)` : ""}${k !== 1 ? ` scale(${k})` : ""}`;
  }
  // Limites do centro: as interativas ficam inteiras e entre as faixas de cima/baixo (igual ao visor, `encaixar`);
  // as outras podem passar um pouco da borda, mas o centro fica no cartão (nunca somem para fora).
  function limitar(t, W, H) {
    const e = t.el, kk = escalavel(t) ? t.k || 1 : 1, w = (e.offsetWidth || 0) * kk, h = (e.offsetHeight || 0) * kk;
    if (interativa(t)) {
      const mx = Math.min(0.5, (w / 2 + 6) / W), cima = Math.min(0.5, 0.11 + h / 2 / H), baixo = Math.max(cima, 1 - Math.max(0.1, 70 / H) - h / 2 / H);
      t.x = Math.min(1 - mx, Math.max(mx, t.x)); t.y = Math.min(baixo, Math.max(cima, t.y));
      return;
    }
    // Figurinhas de @, lugar, # e hora ficam inteiras no cartão (iguais ao que sai na foto); texto e fotos podem passar
    // um pouco da borda, como antes.
    if (t.fig) { const fx = Math.min(0.5, (w / 2 + 6) / W), fy = Math.min(0.5, (h / 2 + 6) / H); t.x = Math.min(1 - fx, Math.max(fx, t.x)); t.y = Math.min(1 - fy, Math.max(fy, t.y)); return; }
    const mx = Math.min(0.5, Math.max(0.04, Math.min(w * 0.35, 60) / W)), my = Math.min(0.5, Math.max(0.03, Math.min(h * 0.35, 60) / H));
    t.x = Math.min(1 - mx, Math.max(mx, t.x)); t.y = Math.min(1 - my, Math.max(my, t.y));
  }
  // Solta embaixo da coluna de botões (direita) ou da barra de cima: o meio da figurinha vai para o lado, senão o dedo
  // pegaria o botão e ela não sairia mais dali.
  function afastarDosBotoes(t) {
    const pr = palco.getBoundingClientRect(); if (!pr.width) return;
    const cx = pr.left + t.x * pr.width, cy = pr.top + t.y * pr.height;
    for (const zona of [ferramentas, esq]) {
      const r = zona?.getBoundingClientRect?.();
      if (!r || !r.width || getComputedStyle(zona).visibility === "hidden") continue;
      if (cx < r.left - 6 || cx > r.right + 6 || cy < r.top - 6 || cy > r.bottom + 6) continue;
      if (zona === ferramentas) t.x = Math.max(0.05, (r.left - 14 - pr.left) / pr.width);
      else t.y = Math.min(0.95, (r.bottom + 14 - pr.top) / pr.height);
    }
  }
  const vibrar = (ms = 8) => { try { navigator.vibrate?.(ms); } catch {} };
  function soltarGesto(ev) {
    if (!gesto.t || !gesto.pts.has(ev.pointerId)) return;
    gesto.pts.delete(ev.pointerId);
    if (gesto.pts.size) { baseGesto(); return; }
    const t = gesto.t, mexeu = gesto.mexeu, foiDois = gesto.dois, noLixo = gesto.noLixo;
    if (gesto.quadro) { cancelAnimationFrame(gesto.quadro); gesto.quadro = 0; moverFig(t); }
    zerarGesto();
    if (noLixo && ev.type === "pointerup") { t.el.remove(); textos.splice(textos.indexOf(t), 1); vibrar(12); pintarArroba(); renomearUltimo(`Apagar ${nomeFig(t)}`); avisarHist(`${nomeFig(t, true)} ${/^(foto|enquete|caixa|menção|localização|hashtag|figurinha|contagem)/.test(nomeFig(t)) ? "apagada" : "apagado"} · toque em ↶ para desfazer`, true); return; }
    if (mexeu) { limitar(t, medidas().W, medidas().H); afastarDosBotoes(t); moverFig(t); }
    if (mexeu || foiDois || ev.type !== "pointerup") return;
    // toque parado. O painel que abre agora fica embaixo do dedo e o "click" deste mesmo toque caía nele (na figurinha de
    // link, escolhia o negócio que aparecesse ali e o link trocava sozinho): o próximo click, logo em seguida, é engolido.
    const engolir = (e) => { e.stopPropagation(); e.preventDefault(); };
    window.addEventListener("click", engolir, { capture: true, once: true });
    setTimeout(() => window.removeEventListener("click", engolir, true), 450);
    if (t.enq) editarEnquete(t); else if (t.cx) editarCaixa(t); else if (t.ct) editarContagem(t); else if (t.lk) escolherNegocio(t);
    else if (t.ft) { if (t.estilo !== 3) t.estilo = ((t.estilo || 0) + 1) % 3; /* 3 = figurinha pronta (resposta): só vem para a frente */ camada.appendChild(t.el); textos.push(textos.splice(textos.indexOf(t), 1)[0]); t.el.replaceChildren(); pintarTexto(t); }
    else if (t.fig) { t.estilo = (t.estilo + 1) % EST_FIG.length; pintarTexto(t); }
    else if (t.emoji) { t.tam = t.tam >= 0.26 ? 0.1 : +(t.tam + 0.06).toFixed(3); pintarTexto(t); }
    else editarTexto(t);
  }
  // 2º dedo em qualquer lugar do cartão enquanto uma figurinha está segura: entra no gesto (não mexe na foto de fundo).
  palco.addEventListener("pointerdown", (ev) => {
    if (!gesto.t || gesto.pts.has(ev.pointerId) || gesto.pts.size >= 2) return;
    if (ev.isPrimary) { zerarGesto(); return; } // 1º dedo de um toque novo: o gesto anterior ficou preso (o dedo saiu sem aviso)
    ev.stopPropagation(); ev.preventDefault();
    gesto.pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY }); baseGesto();
  }, true);
  // Um quadro por vez (requestAnimationFrame): o dedo manda bem mais movimentos do que a tela desenha.
  function desenharGesto() {
    gesto.quadro = 0;
    const t = gesto.t; if (!t) return;
    moverFig(t);
    if (gesto.dois) ajustarTam(t);
  }
  const pedirQuadro = () => { if (!gesto.quadro) gesto.quadro = requestAnimationFrame(desenharGesto); };
  const moverGesto = (ev) => {
    if (!gesto.t || !gesto.pts.has(ev.pointerId)) return;
    ev.preventDefault();
    gesto.pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    const t = gesto.t, b = gesto.base; if (!b) return;
    const { W, H } = medidas();
    if (b.dois && gesto.pts.size >= 2) {
      const [p1, p2] = ptsArr();
      const d = Math.hypot(p1.x - p2.x, p1.y - p2.y), ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const [mn, mx] = LIMITE_TAM(t);
      if (!gesto.mexeu) { marcar(`Ajustar ${nomeFig(t)}`); gesto.mexeu = true; palco.classList.add("arrastando-txt"); t.el.classList.add("segurando"); }
      if (b.escala) {
        // enquete, perguntas, contagem e link: só o tamanho (e a posição pelo meio dos dedos), sem girar
        t.k = Math.round(Math.min(LIMITE_K[1], Math.max(LIMITE_K[0], b.k * (d / b.d))) * 100) / 100;
        t.x = b.tx + ((p1.x + p2.x) / 2 - b.mx) / W;
        t.y = b.ty + ((p1.y + p2.y) / 2 - b.my) / H;
        limitar(t, W, H);
        pedirQuadro();
        return;
      }
      t.tam = Math.min(mx, Math.max(mn, b.tam * (d / b.d)));
      let r = b.rot + ((ang - b.ang) * 180) / Math.PI;
      r = ((r + 540) % 360) - 180;
      if (Math.abs(r) < 4) r = 0; // encaixa reto
      t.rot = Math.round(r * 10) / 10;
      t.x = b.tx + ((p1.x + p2.x) / 2 - b.mx) / W;
      t.y = b.ty + ((p1.y + p2.y) / 2 - b.my) / H;
      limitar(t, W, H);
      pedirQuadro();
      return;
    }
    if (b.dois) return;
    const dx = ev.clientX - b.x, dy = ev.clientY - b.y;
    if (!gesto.mexeu && Math.hypot(dx, dy) < 6) return;
    if (!gesto.mexeu) { marcar(`Mover ${nomeFig(t)}`); gesto.mexeu = true; palco.classList.add("arrastando-txt"); t.el.classList.add("segurando"); }
    t.x = b.tx + dx / W; t.y = b.ty + dy / H;
    limitar(t, W, H);
    // guias do meio: encaixam e vibram ao entrar
    const nx = Math.abs(t.x - 0.5) < 0.02, ny = Math.abs(t.y - 0.5) < 0.012 && !interativa(t);
    if (nx) t.x = 0.5; if (ny) t.y = 0.5;
    if ((nx && !gesto.guiaV) || (ny && !gesto.guiaH)) vibrar(6);
    gesto.guiaV = nx; gesto.guiaH = ny;
    guias.querySelector(".v").classList.toggle("on", nx); guias.querySelector(".h").classList.toggle("on", ny);
    // lixeira: pelo dedo, como no Instagram (a figurinha encolhe por cima dela)
    const rl = lixo.getBoundingClientRect(), cx = rl.left + rl.width / 2, cy = rl.top + rl.height / 2;
    const sobre = Math.hypot(ev.clientX - cx, ev.clientY - cy) < Math.max(56, rl.width);
    if (sobre !== gesto.noLixo) { gesto.noLixo = sobre; lixo.classList.toggle("sobre", sobre); t.el.classList.toggle("no-lixo", sobre); if (sobre) vibrar(14); }
    pedirQuadro();
  };
  // Na fase de captura: botões e painéis que param o pointerup não deixam mais a figurinha "presa" no dedo.
  window.addEventListener("pointermove", moverGesto, { capture: true, passive: false });
  window.addEventListener("pointerup", soltarGesto, true);
  window.addEventListener("pointercancel", soltarGesto, true);
  function criarTexto(t) {
    const e = el("div", "flash-txt"); e.setAttribute("role", "button"); e.tabIndex = 0;
    e.setAttribute("aria-label", t.ft ? "Foto por cima: arraste para mover, dois dedos para aumentar ou girar, toque para trocar a moldura" : "Texto na foto: toque para editar, arraste para mover, dois dedos para aumentar ou girar");
    marcar(`Adicionar ${nomeFig(t)}`);
    t.el = e; textos.push(t); camada.appendChild(e); pintarTexto(t);
    publicar.disabled = !prontoParaPublicar() || enviando;
    e.addEventListener("pointerdown", (ev) => {
      ev.stopPropagation(); ev.preventDefault();
      if (ev.isPrimary && gesto.t) zerarGesto(); // toque novo: nada pode ter ficado preso do anterior
      if (gesto.t && gesto.t !== t) return;
      gesto.t = t; gesto.pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY }); baseGesto();
    });
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
    // Pílulas (ícone colorido + nome), as interativas primeiro. "Publicar em" só aparece para quem tem negócio.
    const pilula = (ic, rot, cor, fn, extra = "") => {
      const b = el("button", "fig-op fig-pilula"); b.type = "button"; b.style.setProperty("--fc", cor);
      b.append(icone(ic, "i s"), el("span", null, rot)); if (extra) b.appendChild(el("small", null, extra));
      b.addEventListener("click", fn); grade.appendChild(b); return b;
    };
    if (meusNeg.length) pilula("loja", "Publicar em", "#f5a400", () => { pn.remove(); escolherDestinos(); }, dest.negocios.size ? `${dest.negocios.size + (dest.perfil ? 1 : 0)} lugares` : "");
    // Enquete e Teste usam o mesmo lugar (um por flash): tocar no outro avisa.
    const enqAqui = () => textos.find((t) => t.enq) || null;
    pilula("enquete", "Enquete", "#ff3d7f", () => { const t = enqAqui(); if (t && Number.isInteger(t.certa)) { toast("Este flash já tem um teste. Um flash tem uma enquete OU um teste."); return; } pn.remove(); editarEnquete(t); });
    pilula("check", "Teste", "#22b573", () => { const t = enqAqui(); if (t && !Number.isInteger(t.certa)) { toast("Este flash já tem uma enquete. Um flash tem uma enquete OU um teste."); return; } pn.remove(); editarTeste(t); }, "quiz");
    pilula("caixa", "Perguntas", "#e5487f", () => { pn.remove(); editarCaixa(textos.find((t) => t.cx) || null); });
    pilula("relogio", "Contagem", "#7c5cff", () => { pn.remove(); editarContagem(textos.find((t) => t.ct) || null); }, "regressiva");
    pilula("pessoa-mais", "Menção", "#ff8a00", () => { pn.remove(); escolherMencao(); });
    pilula("loja", "Link do negócio", "#00adee", () => { pn.remove(); escolherNegocio(textos.find((t) => t.lk) || null); });
    // Localização de verdade (como no Instagram): busca o lugar e quem vê toca na figurinha e vê as publicações de lá.
    pilula("local", "Localização", "#7c5cff", () => { pn.remove(); escolherLugarFig(); });
    pilula("hashtag", "Hashtag", "#ff3d7f", () => escolherHashtag());
    pilula("figurinha", "Emoji", "#f5a400", () => escolherEmoji());
    pilula("relogio", "Horário", "#2fbf71", () => { pn.remove(); colocarFig("hora", textoFigurinha("hora")); }, textoFigurinha("hora"));
    pilula("calendario", "Data", "#0fb5a6", () => { pn.remove(); colocarFig("data", textoFigurinha("data")); }, textoFigurinha("data"));
    ok.addEventListener("click", () => pn.remove());
    pn.append(cab, grade, el("p", "figs-dica", "Toque na figurinha para trocar o estilo (no emoji, o tamanho) · arraste até a lixeira para tirar"));
    palco.appendChild(pn);
    function escolherHashtag() {
      grade.replaceChildren();
      const inp = el("input", "fe-local"); inp.type = "text"; inp.maxLength = 30; inp.placeholder = "#hashtag"; inp.value = "#"; inp.setAttribute("aria-label", "Hashtag");
      const usar = el("button", "fe-pronto", "Colocar"); usar.type = "button";
      const linha = el("div", "fe-linha-local"); linha.append(inp, usar);
      grade.appendChild(linha);
      const colocar = () => { const v = inp.value.replace(/[^\p{L}\p{N}_]/gu, "").slice(0, 28); if (!v) { inp.focus(); return; } pn.remove(); colocarFig("hashtag", "#" + v); };
      usar.addEventListener("click", colocar);
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") colocar(); });
      setTimeout(() => { inp.focus(); inp.setSelectionRange(1, 1); }, 50);
    }
    function escolherEmoji() {
      grade.replaceChildren();
      const g2 = el("div", "fig-emojis");
      EMOJIS_FIG.forEach((em) => { const b = el("button", null, em); b.type = "button"; b.setAttribute("aria-label", "Emoji " + em); b.addEventListener("click", () => { pn.remove(); criarTexto({ texto: em, emoji: true, x: 0.5, y: 0.42, tam: 0.16, letra: 0, cor: "#ffffff", destaque: false }); }); g2.appendChild(b); });
      grade.appendChild(g2);
    }
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
    // A mesma pessoa não é mencionada duas vezes (se estava oculta, vira figurinha).
    if (fig === "mencao" && extra.uid) {
      if (figMencoes().some((t) => t.uid === extra.uid)) { toast(`${texto} já está mencionado neste flash.`); return; }
      avisos.delete(extra.uid);
    }
    const y = 0.22 + (textos.filter((t) => t.fig).length % 4) * 0.1;
    criarTexto({ fig, texto, estilo: 0, x: 0.5, y, tam: fig === "hora" ? 0.11 : 0.055, letra: 0, cor: "#fff", destaque: false, ...extra });
    pintarArroba();
  }
  // A folha de escolher o lugar fica por cima do criador; ao fechar, o criador continua travando a página.
  function escolherLugarFig() {
    const f = $("folhaLista");
    const volta = () => { f?.removeEventListener("fechada", volta); if (fundo.isConnected) document.body.classList.add("travado"); };
    f?.addEventListener("fechada", volta);
    escolherLugar((l) => {
      textos.filter((x) => x.fig === "local").forEach((x) => { x.el.remove(); textos.splice(textos.indexOf(x), 1); });
      colocarFig("local", "📍 " + String(l.nome).slice(0, 40), { lugar: l });
      document.body.classList.add("travado");
    });
  }
  // Enquete e caixa de perguntas editadas NA PRÓPRIA FIGURINHA (pedido de 02/11): o cartão fica no meio da parte
  // que o teclado deixa à vista, a pergunta é escrita na faixa colorida e as opções nas pílulas; o botão colorido em
  // cima troca a cor na hora. Embaixo, em pílulas pequenas: anônima e duração. Antes era um formulário com uma
  // prévia lá embaixo, que o teclado escondia.
  function editorVivo(tipo, t) {
    palco.querySelector(".flash-figs")?.remove();
    // Teste (quiz, como a figurinha "Teste" do Instagram): é uma enquete com a resposta certa marcada (`certa`).
    const teste = tipo === "teste";
    const enq = tipo === "enq" || teste;
    const pn = el("div", "flash-figs flash-fig-viva" + (teste ? " fv-eh-teste" : ""));
    const estado = { cor: t?.tema || t?.cor || "branco", anonima: !!t?.anonima, certa: Number.isInteger(t?.certa) ? t.certa : 0 };
    const duracao = { ...(t?.duracao || { dur: 1440 }) };
    const ops = enq ? (t?.opcoes || (teste ? ["", ""] : ["Sim", "Não"])).slice() : [];
    // topo: cor (troca a cada toque) e Pronto
    const topo = el("div", "fv-topo");
    const bCor = el("button", "fv-cor"); bCor.type = "button";
    const ok = el("button", "fe-pronto", "Pronto"); ok.type = "button";
    topo.append(el("span"), bCor, ok);
    // cartão
    const meio = el("div", "fv-meio");
    const card = el("div", "fv-card");
    const perg = document.createElement("textarea"); perg.className = "fv-perg"; perg.rows = 1; perg.maxLength = 120;
    perg.placeholder = enq ? "Faça uma pergunta..." : "Me faça uma pergunta"; perg.setAttribute("aria-label", "Pergunta");
    perg.value = t?.pergunta || (enq ? "" : "Me faça uma pergunta");
    const crescer = () => { perg.style.height = "auto"; perg.style.height = perg.scrollHeight + "px"; };
    const faixa = el("div", "fv-faixa"); faixa.appendChild(perg);
    const corpo = el("div", "fv-corpo");
    card.append(faixa, corpo);
    meio.appendChild(card);
    const nomeCor = (k) => (CORES_FIG.find(([c]) => c === k) || CORES_FIG[0])[1];
    const pintarCor = () => {
      card.className = "fv-card fe-enq" + (enq ? "" : " fe-cx") + temaFig(estado.cor);
      bCor.setAttribute("aria-label", `Cor: ${nomeCor(estado.cor)} (toque para trocar)`); bCor.title = nomeCor(estado.cor);
    };
    bCor.addEventListener("pointerdown", (e) => e.preventDefault()); // não fecha o teclado
    bCor.addEventListener("click", () => {
      const i = CORES_FIG.findIndex(([c]) => c === estado.cor);
      estado.cor = CORES_FIG[(i + 1) % CORES_FIG.length][0]; pintarCor();
    });
    // opções da enquete: cada uma é uma pílula onde se escreve; a tracejada embaixo vira uma opção nova ao digitar.
    const pintarOps = (focar = -1) => {
      if (!enq) {
        corpo.replaceChildren(el("div", "fv-campo", "Quem vê responde aqui..."));
        return;
      }
      const filhos = ops.map((o, i) => {
        const l = el("div", "fv-op");
        const inp = el("input"); inp.type = "text"; inp.maxLength = 40; inp.value = o; inp.placeholder = teste ? `Resposta ${"ABCD"[i]}` : i === 0 ? "Sim" : i === 1 ? "Não" : `Opção ${i + 1}`;
        if (teste) {
          // A letra marca a resposta certa (fica verde com ✓).
          const certa = i === estado.certa;
          const lt = el("button", "fv-letra" + (certa ? " certa" : "")); lt.type = "button";
          lt.setAttribute("aria-label", certa ? `Resposta ${"ABCD"[i]}: é a certa` : `Marcar a resposta ${"ABCD"[i]} como certa`); lt.setAttribute("aria-pressed", String(certa));
          if (certa) lt.appendChild(icone("check", "i xs")); else lt.textContent = "ABCD"[i];
          lt.addEventListener("pointerdown", (e) => e.preventDefault());
          lt.addEventListener("click", () => { estado.certa = i; pintarOps(); navigator.vibrate?.(8); });
          l.classList.add("com-letra"); if (certa) l.classList.add("certa");
          l.appendChild(lt);
        }
        inp.setAttribute("aria-label", `Opção ${i + 1}`);
        inp.addEventListener("input", () => { ops[i] = inp.value; });
        inp.addEventListener("keydown", (e) => {
          if (e.key === "Enter") { e.preventDefault(); (l.nextElementSibling?.querySelector("input") || corpo.querySelector(".fv-nova"))?.focus(); }
          // apagar tudo de uma opção vazia (a partir da 3ª) tira ela
          if (e.key === "Backspace" && !inp.value && ops.length > 2 && i >= 2) { e.preventDefault(); tirarOp(i); pintarOps(i - 1); }
        });
        l.appendChild(inp);
        if (ops.length > 2 && i >= 2) {
          const x = el("button", "fv-op-x"); x.type = "button"; x.setAttribute("aria-label", "Tirar opção"); x.appendChild(icone("fechar", "i xs"));
          x.addEventListener("pointerdown", (e) => e.preventDefault());
          x.addEventListener("click", () => { tirarOp(i); pintarOps(); });
          l.appendChild(x);
        }
        return l;
      });
      if (ops.length < 4) {
        const nova = el("input", "fv-nova"); nova.type = "text"; nova.maxLength = 40; nova.placeholder = "Adicionar outra opção..."; nova.setAttribute("aria-label", "Adicionar outra opção");
        nova.addEventListener("input", () => { if (!nova.value) return; ops.push(nova.value); pintarOps(ops.length - 1); });
        filhos.push(nova);
      }
      corpo.replaceChildren(...filhos);
      if (focar >= 0) { const f = corpo.querySelectorAll(".fv-op input")[focar]; if (f) { f.focus(); const n = f.value.length; f.setSelectionRange(n, n); } }
    };
    function tirarOp(i) { ops.splice(i, 1); if (estado.certa === i) estado.certa = 0; else if (estado.certa > i) estado.certa--; }
    perg.addEventListener("input", crescer);
    perg.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); corpo.querySelector("input")?.focus(); } });
    // pílulas de baixo: anônima e (na enquete) duração
    const extras = el("div", "fv-extras");
    const bAnon = el("button", "fv-chip"); bAnon.type = "button";
    const pintarAnon = () => {
      bAnon.classList.toggle("on", estado.anonima); bAnon.setAttribute("aria-pressed", String(estado.anonima));
      bAnon.replaceChildren(icone("mascara", "i xs"), document.createTextNode(estado.anonima ? "Anônima" : (enq ? "Votos visíveis" : "Com nome")));
    };
    bAnon.addEventListener("pointerdown", (e) => e.preventDefault());
    bAnon.addEventListener("click", () => {
      estado.anonima = !estado.anonima; pintarAnon();
      toast(estado.anonima ? (enq ? "Votação anônima: ninguém vê quem votou, nem você" : "Respostas anônimas: você não vê quem respondeu") : (enq ? "Você vai ver quem votou em cada opção" : "Você vai ver quem respondeu"));
    });
    if (!teste) extras.appendChild(bAnon);
    if (enq && !teste) {
      const bDur = el("button", "fv-chip"); bDur.type = "button";
      const rotDur = () => duracao.fim ? "Personalizada" : (DURACOES_FLASH.find(([m]) => m === (duracao.dur || 1440)) || [0, "24 h"])[1];
      const pintarDur = () => bDur.replaceChildren(icone("relogio", "i xs"), document.createTextNode("Termina em " + rotDur() + " ▾"));
      bDur.addEventListener("pointerdown", (e) => e.preventDefault());
      bDur.addEventListener("click", () => abrirOpcoes("Quanto tempo a enquete fica aberta?", DURACOES_FLASH.map(([m, r]) => ({
        rotulo: r, sub: m === 1440 ? "O flash inteiro (24 horas)" : "", icone: "relogio",
        fn: () => { duracao.dur = m; delete duracao.fim; pintarDur(); }
      }))));
      pintarDur();
      extras.appendChild(bDur);
    }
    extras.appendChild(el("small", "fv-dica", teste ? "Toque na letra para marcar a resposta certa. Quem vê descobre na hora se acertou." : enq ? "Uma pessoa, um voto" : "As respostas chegam só para você"));
    pn.append(topo, meio, extras);
    palco.appendChild(pn);
    pintarCor(); pintarOps(); pintarAnon();
    requestAnimationFrame(crescer);
    setTimeout(() => { perg.focus(); if (!enq) perg.select(); }, 50);
    ok.addEventListener("click", () => {
      const pergunta = perg.value.trim().slice(0, 120);
      if (!pergunta) { toast(enq ? "Escreva a pergunta." : "Escreva o texto da caixa."); perg.focus(); return; }
      if (teste) {
        if (!ops[estado.certa]?.trim()) { toast("Escreva a resposta certa (a marcada com ✓)."); corpo.querySelectorAll(".fv-op input")[estado.certa]?.focus(); return; }
        const usadas = ops.map((o, i) => [o.trim().slice(0, 40), i]).filter(([o]) => o);
        if (usadas.length < 2) { toast("Coloque pelo menos 2 respostas."); return; }
        if (new Set(usadas.map(([o]) => o.toLowerCase())).size < usadas.length) { toast("As respostas precisam ser diferentes."); return; }
        const opcoes = usadas.map(([o]) => o), certa = usadas.findIndex(([, i]) => i === estado.certa);
        pn.remove();
        if (t) { marcar("Editar teste"); t.pergunta = pergunta; t.opcoes = opcoes; t.certa = certa; delete t.duracao; t.anonima = false; t.tema = estado.cor; pintarTexto(t); }
        else criarTexto({ enq: true, pergunta, opcoes, certa, anonima: false, tema: estado.cor, texto: "", x: 0.5, y: 0.6, tam: 0.05, letra: 0, cor: "#111", destaque: false });
      } else if (enq) {
        // opção vazia usa o que aparece escrito de leve (Sim / Não)
        const opcoes = ops.map((o, i) => (o.trim() || (i === 0 ? "Sim" : i === 1 ? "Não" : "")).slice(0, 40)).filter(Boolean);
        if (opcoes.length < 2) { toast("Coloque pelo menos 2 opções."); return; }
        pn.remove();
        if (t) { marcar("Editar enquete"); t.pergunta = pergunta; t.opcoes = opcoes; t.duracao = duracao; t.anonima = estado.anonima; t.tema = estado.cor; pintarTexto(t); }
        else criarTexto({ enq: true, pergunta, opcoes, duracao, anonima: estado.anonima, tema: estado.cor, texto: "", x: 0.5, y: 0.6, tam: 0.05, letra: 0, cor: "#111", destaque: false });
      } else {
        pn.remove();
        if (t) { marcar("Editar caixa de perguntas"); t.pergunta = pergunta; t.anonima = estado.anonima; t.tema = estado.cor; pintarTexto(t); }
        else criarTexto({ cx: true, pergunta, anonima: estado.anonima, tema: estado.cor, texto: "", x: 0.5, y: 0.42, tam: 0.05, letra: 0, cor: "#111", destaque: false });
      }
    });
  }
  const DURACOES_FLASH = [[60, "1 h"], [360, "6 h"], [720, "12 h"], [1440, "24 h"]];
  const editarEnquete = (t) => editorVivo(Number.isInteger(t?.certa) ? "teste" : "enq", t);
  const editarTeste = (t) => editorVivo("teste", t);
  // Contagem regressiva: o nome na faixa colorida, a data e a hora embaixo (calendário e relógio do site) e os números
  // andando no próprio cartão, como vai aparecer para quem vê.
  function editarContagem(t) {
    palco.querySelector(".flash-figs")?.remove();
    const pn = el("div", "flash-figs flash-fig-viva fv-eh-ct");
    const estado = { cor: t?.tema || "branco" };
    const amanha = new Date(Date.now() + 864e5); amanha.setHours(20, 0, 0, 0);
    let fimMs = Number(t?.fim) || amanha.getTime();
    const topo = el("div", "fv-topo");
    const bCor = el("button", "fv-cor"); bCor.type = "button";
    const ok = el("button", "fe-pronto", "Pronto"); ok.type = "button";
    topo.append(el("span"), bCor, ok);
    const meio = el("div", "fv-meio");
    const card = cartaoContagem({ titulo: t?.titulo || "", fim: fimMs, cor: estado.cor });
    card.classList.add("fv-ctg");
    const tit = card.querySelector(".ctg-tit");
    const campo = document.createElement("textarea"); campo.className = "fv-perg"; campo.rows = 1; campo.maxLength = 40;
    campo.placeholder = "Nome da contagem"; campo.setAttribute("aria-label", "Nome da contagem"); campo.value = t?.titulo || "";
    tit.replaceChildren(campo);
    const crescer = () => { campo.style.height = "auto"; campo.style.height = campo.scrollHeight + "px"; };
    campo.addEventListener("input", crescer);
    campo.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); campo.blur(); } });
    // data e hora (o campos.js abre o calendário e o relógio do site)
    const linhaQuando = el("div", "ctg-escolher");
    const loc = (ms) => { const d = new Date(ms); return [`${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`, `${pad2(d.getHours())}:${pad2(d.getMinutes())}`]; };
    const dia = el("input", "fv-dia"); dia.type = "date"; dia.setAttribute("aria-label", "Dia em que termina");
    const hora = el("input", "fv-hora"); hora.type = "time"; hora.setAttribute("aria-label", "Hora em que termina");
    const hoje = loc(Date.now())[0], limite = loc(Date.now() + 365 * 864e5)[0];
    dia.min = hoje; dia.max = limite;
    [dia.value, hora.value] = loc(fimMs);
    const ler = () => {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia.value), h = /^(\d{2}):(\d{2})$/.exec(hora.value);
      if (!m || !h) return;
      fimMs = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(h[1]), Number(h[2])).getTime();
      card._fim = fimMs; card._pintar();
    };
    ["input", "change"].forEach((ev) => { dia.addEventListener(ev, ler); hora.addEventListener(ev, ler); });
    const rDia = el("label", "ctg-campo"); rDia.append(el("small", null, "Dia"), dia);
    const rHora = el("label", "ctg-campo"); rHora.append(el("small", null, "Hora"), hora);
    linhaQuando.append(rDia, rHora);
    card._acoes.appendChild(linhaQuando);
    // atalhos de prazo
    const atalhos = el("div", "fv-extras");
    [["Em 1 hora", 36e5], ["Hoje às 20h", "hoje20"], ["Amanhã às 20h", "amanha20"], ["Em 7 dias", 7 * 864e5]].forEach(([rot, v]) => {
      const b = el("button", "fv-chip", rot); b.type = "button";
      b.addEventListener("pointerdown", (e) => e.preventDefault());
      b.addEventListener("click", () => {
        let ms;
        if (typeof v === "number") ms = Math.ceil((Date.now() + v) / 6e4) * 6e4;
        else { const d = new Date(); if (v === "amanha20") d.setDate(d.getDate() + 1); d.setHours(20, 0, 0, 0); ms = d.getTime(); }
        if (ms < Date.now() + 5 * 6e4) { toast("Hoje às 20h já passou: escolha outro horário."); return; }
        fimMs = ms; [dia.value, hora.value] = loc(ms); card._fim = ms; card._pintar();
      });
      atalhos.appendChild(b);
    });
    atalhos.appendChild(el("small", "fv-dica", "Quem vê pode tocar em “Lembrar-me” e recebe um aviso quando a contagem acabar."));
    const pintarCor = () => {
      card.className = "ctg fv-ctg" + temaFig(estado.cor) + (card.classList.contains("acabou") ? " acabou" : "");
      bCor.setAttribute("aria-label", `Cor: ${(CORES_FIG.find(([c]) => c === estado.cor) || CORES_FIG[0])[1]} (toque para trocar)`);
    };
    bCor.addEventListener("pointerdown", (e) => e.preventDefault());
    bCor.addEventListener("click", () => { const i = CORES_FIG.findIndex(([c]) => c === estado.cor); estado.cor = CORES_FIG[(i + 1) % CORES_FIG.length][0]; pintarCor(); });
    meio.appendChild(card);
    pn.append(topo, meio, atalhos);
    palco.appendChild(pn);
    pintarCor();
    requestAnimationFrame(crescer);
    setTimeout(() => campo.focus(), 50);
    ok.addEventListener("click", () => {
      const titulo = campo.value.trim().slice(0, 40);
      if (!titulo) { toast("Dê um nome para a contagem."); campo.focus(); return; }
      ler();
      if (!(fimMs > Date.now() + 5 * 6e4)) { toast("Escolha um horário pelo menos 5 minutos à frente."); return; }
      if (fimMs > Date.now() + 365 * 864e5) { toast("A contagem pode ir até 1 ano."); return; }
      pn.remove();
      if (t) { marcar("Editar contagem regressiva"); t.titulo = titulo; t.fim = fimMs; t.tema = estado.cor; pintarTexto(t); }
      else criarTexto({ ct: true, titulo, fim: fimMs, tema: estado.cor, texto: "", x: 0.5, y: 0.32, tam: 0.05, letra: 0, cor: "#111", destaque: false });
    });
  }
  const editarCaixa = (t) => editorVivo("cx", t);
  // Link para o perfil de um negócio: os seus primeiro, e a busca entre todos os negócios do site.
  let negociosP = null;
  async function escolherNegocio(t) {
    palco.querySelector(".flash-figs")?.remove();
    const pn = el("div", "flash-figs");
    // "Fechar" só fecha (antes, com o link já posto, o botão do topo era "Tirar": quem abria a lista só para olhar apagava
    // o link). Com o link posto, ele aparece em cima ("No flash agora") com "Tirar o link" separado.
    const cab = el("div", "fe-cab"); const ok = el("button", "fe-pronto", "Fechar"); ok.type = "button";
    cab.append(el("strong", "figs-tit", t ? "Trocar o negócio do link" : "Link para um negócio"), el("span", "esp"), ok);
    const busca = el("input", "fe-local"); busca.type = "search"; busca.placeholder = "Buscar negócio pelo nome"; busca.setAttribute("aria-label", "Buscar negócio");
    const lista = el("div", "mencao-lista");
    const atual = el("div", "lk-atual");
    if (t) {
      const tirar = el("button", "lk-tirar", "Tirar o link"); tirar.type = "button";
      const tx = el("span", "tx"); tx.append(el("small", null, "No flash agora"), el("strong", null, t.negocio?.nome || "Perfil do negócio"));
      atual.append(icone(ICONE_NEGOCIO[t.negocio?.tipo] || "loja", "i s"), tx, tirar);
      tirar.addEventListener("click", () => { pn.remove(); marcar("Tirar link do negócio"); t.el.remove(); textos.splice(textos.indexOf(t), 1); toast("Link tirado · toque em ↶ para desfazer"); });
    }
    const corpo = el("div", "mencao-corpo");
    corpo.append(...(t ? [atual] : []), busca, el("p", "figs-dica", "Pode ser o seu negócio ou o de outra pessoa do Help Floripa (um link por flash). Quem vê toca no link e vai direto para o perfil do negócio."), lista);
    pn.append(cab, corpo);
    palco.appendChild(pn);
    ok.addEventListener("click", () => pn.remove());
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
        if (t) { if (t.negocio?.id === negocio.id) return; marcar("Trocar link do negócio"); t.negocio = negocio; pintarTexto(t); toast(`Link trocado para ${n.nome}`); }
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
  // ---------- menções (@) ----------
  // Três jeitos de mencionar: a figurinha "@usuário" (dá para ocultar), o "@" escrito no texto ou na legenda (as
  // sugestões aparecem enquanto digita, como nos apps) e a menção OCULTA (a pessoa é avisada e pode pôr o flash no dela,
  // mas o nome não aparece para quem vê). Até 10 pessoas. O botão "@" organiza tudo numa lista.
  const avisos = new Map();  // uid -> perfil (menção oculta, sem figurinha nem texto)
  const nickUid = new Map(); // nick -> uid (escolhidos nas sugestões)
  let pessoasMenc = null;
  const RECENTES_M = "hf-mencoes-rec-" + eu.uid;
  const recentesM = () => { try { return JSON.parse(localStorage.getItem(RECENTES_M) || "[]"); } catch { return []; } };
  const lembrarM = (uid) => { try { localStorage.setItem(RECENTES_M, JSON.stringify([uid, ...recentesM().filter((u) => u !== uid)].slice(0, 20))); } catch {} };
  const semAc = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  async function pessoasParaMencionar() {
    if (pessoasMenc) return pessoasMenc;
    const uids = [...new Set([...recentesM(), ...meusSeguindo])].filter((u) => u !== eu.uid && !escondido(u)).slice(0, 120);
    pessoasMenc = (await Promise.all(uids.map(async (u) => ({ uid: u, ...(await obterPerfil(u).catch(() => ({}))) })))).filter((p) => p.nickname);
    return pessoasMenc;
  }
  // Ordem "inteligente": @ que começa com o que foi digitado > nome que começa > contém; quem você mencionou há pouco
  // sobe. Com 2 letras ou mais e poucas pessoas, procura também entre todos os @ do site.
  async function sugerirPessoas(q) {
    const base = await pessoasParaMencionar(), rec = recentesM();
    const nota = (p) => {
      const n = String(p.nickname), nm = semAc(p.nome);
      let v = !q ? 1 : n.startsWith(q) ? 4 : nm.split(/\s+/).some((w) => w.startsWith(q)) ? 3 : n.includes(q) || nm.includes(q) ? 2 : 0;
      if (v && rec.includes(p.uid)) v += 1.5 - rec.indexOf(p.uid) * 0.05;
      return v;
    };
    let l = base.map((p) => [nota(p), p]).filter(([v]) => v > 0).sort((x, y) => y[0] - x[0]).map(([, p]) => p).slice(0, 8);
    if (q.length >= 2 && l.length < 8) {
      try {
        const x = await fb.getDocs(fb.query(fb.collection(fb.db, "nicknames"), fb.where(fb.documentId(), ">=", q), fb.where(fb.documentId(), "<=", q + "\uf8ff"), fb.limit(8)));
        const novos = x.docs.map((d) => d.data()?.uid).filter((u) => typeof u === "string" && u !== eu.uid && !escondido(u) && !l.some((p) => p.uid === u));
        const mais = await Promise.all(novos.map(async (u) => ({ uid: u, ...(await obterPerfil(u).catch(() => ({}))) })));
        l = [...l, ...mais.filter((p) => p.nickname)].slice(0, 8);
      } catch {}
    }
    return l;
  }
  const textosComArroba = () => [modo === "texto" ? area.value : "", legenda.value, ...textos.filter((t) => !t.fig && !t.enq && !t.cx && !t.lk && !t.ct && !t.emoji).map((t) => t.texto)].join("\n");
  const nicksNoTexto = () => [...new Set([...textosComArroba().matchAll(/(^|[^\w@#])@([a-z0-9._]{3,20})/gi)].map((m) => m[2].toLowerCase().replace(/\.+$/, "")))];
  const figMencoes = () => textos.filter((t) => t.fig === "mencao" && t.uid);
  const totalMencoes = () => new Set([...figMencoes().map((t) => t.uid), ...nicksNoTexto().map((n) => nickUid.get(n) || "@" + n), ...avisos.keys()]).size;
  function pintarArroba() {
    publicar.disabled = !prontoParaPublicar() || enviando;
    const n = totalMencoes();
    contaArroba.textContent = String(n); contaArroba.hidden = !n;
    bArroba.classList.toggle("on", n > 0);
    bArroba.setAttribute("aria-label", n ? `Menções: ${n} ${n === 1 ? "pessoa" : "pessoas"}` : "Menções");
  }
  async function podeEsta(p, contar = true) {
    if (!(await podeMarcar(p.uid))) { toast(`${String(p.nome || "Essa pessoa").split(" ")[0]} não aceita ser mencionada por você.`); return false; }
    if (contar && totalMencoes() >= 10) { toast("Dá para mencionar até 10 pessoas em cada flash."); return false; }
    return true;
  }
  async function mencionarOculta(p) {
    if (avisos.has(p.uid)) return true;
    if (!(await podeEsta(p))) return false;
    avisos.set(p.uid, p); lembrarM(p.uid); pintarArroba();
    toast(`@${p.nickname} recebe o aviso, mas o nome não aparece no flash`);
    return true;
  }
  // Sugestões enquanto digita "@": uma fileira por cima do teclado. Tocar põe o "@usuário"; o olho cortado menciona
  // sem aparecer.
  const tiraArroba = el("div", "fe-arroba"); tiraArroba.setAttribute("role", "listbox"); tiraArroba.setAttribute("aria-label", "Pessoas para mencionar");
  let buscaArroba = 0;
  const esconderArroba = () => { buscaArroba++; tiraArroba.remove(); };
  function ligarArroba(campo) {
    const ver = async () => {
      const ant = campo.value.slice(0, campo.selectionStart ?? campo.value.length);
      const m = ant.match(/(^|[\s(])@([a-z0-9._]{0,20})$/i);
      if (!m) { esconderArroba(); return; }
      const q = m[2].toLowerCase(), id = ++buscaArroba;
      const l = await sugerirPessoas(q);
      if (id !== buscaArroba || document.activeElement !== campo) return;
      tiraArroba.replaceChildren(...(l.length ? l.map((p) => itemArroba(p, campo, m[2].length)) : [el("span", "fa-vazio", q ? `Ninguém com @${q}` : "Siga pessoas para mencioná-las")]));
      if (!tiraArroba.isConnected) palco.appendChild(tiraArroba);
    };
    campo.addEventListener("input", () => { ver(); pintarArroba(); });
    campo.addEventListener("click", ver);
    campo.addEventListener("keyup", (e) => { if (e.key.startsWith("Arrow")) ver(); });
    campo.addEventListener("blur", () => setTimeout(() => { if (document.activeElement !== campo) esconderArroba(); }, 150));
  }
  function itemArroba(p, campo, nq) {
    const b = el("div", "fa-item"); b.setAttribute("role", "option");
    const usar = el("button", "fa-usar"); usar.type = "button";
    const av = el("span", "avatar"); pintarAvatar(av, p.fotoPerfil, p.nome);
    const tx = el("span", "tx"); tx.append(el("strong", null, "@" + p.nickname), el("small", null, p.nome || ""));
    usar.append(av, tx);
    const oc = el("button", "fa-oculta"); oc.type = "button"; oc.title = "Mencionar sem aparecer";
    oc.setAttribute("aria-label", `Mencionar @${p.nickname} sem aparecer no flash`); oc.appendChild(icone("olho-off", "i xs"));
    [usar, oc].forEach((x) => x.addEventListener("pointerdown", (e) => e.preventDefault())); // o teclado continua aberto
    const trocarToken = (por) => {
      const pos = campo.selectionStart ?? campo.value.length, ini = Math.max(0, pos - nq - 1);
      campo.value = (campo.value.slice(0, ini) + por + campo.value.slice(pos)).slice(0, campo.maxLength > 0 ? campo.maxLength : 9999);
      const c = Math.min(campo.value.length, ini + por.length); campo.setSelectionRange(c, c);
      campo.dispatchEvent(new Event("input", { bubbles: true }));
    };
    usar.addEventListener("click", async () => {
      if (figMencoes().some((t) => t.uid === p.uid)) { toast(`@${p.nickname} já está mencionado (figurinha).`); trocarToken(""); esconderArroba(); return; }
      if (!nickUid.has(p.nickname) && !(await podeEsta(p))) return;
      nickUid.set(p.nickname, p.uid); lembrarM(p.uid); trocarToken("@" + p.nickname + " "); esconderArroba(); pintarArroba();
    });
    oc.addEventListener("click", async () => { if (await mencionarOculta(p)) { trocarToken(""); esconderArroba(); } });
    b.append(usar, oc);
    return b;
  }
  // Escolher alguém para mencionar (figurinha no modo foto; no modo texto, "@usuário" no texto). Cada pessoa tem
  // também o botão de menção oculta.
  async function escolherMencao() {
    palco.querySelector(".flash-figs")?.remove();
    const pn = el("div", "flash-figs");
    const cab = el("div", "fe-cab"); const ok = el("button", "fe-pronto", "Fechar"); ok.type = "button";
    cab.append(el("strong", "figs-tit", "Mencionar"), el("span", "esp"), ok);
    const busca = el("input", "fe-local"); busca.type = "search"; busca.placeholder = "Buscar pelo nome ou @"; busca.setAttribute("aria-label", "Buscar pessoas"); busca.autocomplete = "off";
    const lista = el("div", "mencao-lista");
    const corpo = el("div", "mencao-corpo");
    corpo.append(busca, el("p", "figs-dica", modo === "texto" ? "Toque para pôr o @ no texto · olho cortado: a pessoa é avisada sem o nome aparecer" : "Toque para pôr a figurinha · olho cortado: a pessoa é avisada sem o nome aparecer"), lista);
    pn.append(cab, corpo);
    palco.appendChild(pn);
    ok.addEventListener("click", () => pn.remove());
    lista.appendChild(el("p", "figs-dica", "Carregando..."));
    let id = 0;
    const pintarL = async () => {
      const q = semAc(busca.value.trim()).replace(/^@/, ""), meu = ++id;
      const l = await sugerirPessoas(q);
      if (meu !== id) return;
      lista.replaceChildren(...(l.length ? l.map((p) => {
        const linha = el("div", "mencao-item fm-linha");
        const b = el("button", "fm-usar"); b.type = "button";
        const av = el("span", "avatar"); pintarAvatar(av, p.fotoPerfil, p.nome);
        const tx = el("span", "tx"); tx.append(el("strong", null, p.nome || "Usuário"), el("small", null, "@" + p.nickname));
        b.append(av, tx);
        const oc = el("button", "fa-oculta"); oc.type = "button"; oc.title = "Mencionar sem aparecer"; oc.setAttribute("aria-label", `Mencionar @${p.nickname} sem aparecer`);
        oc.append(icone("olho-off", "i xs"));
        if (avisos.has(p.uid)) oc.classList.add("on");
        b.addEventListener("click", async () => {
          if (figMencoes().some((t) => t.uid === p.uid) || (modo === "texto" && nicksNoTexto().includes(p.nickname))) { toast(`@${p.nickname} já está mencionado neste flash.`); return; }
          if (!avisos.has(p.uid) && !(await podeEsta(p))) return;
          pn.remove(); lembrarM(p.uid); nickUid.set(p.nickname, p.uid);
          if (modo === "texto") {
            area.value = (area.value.trimEnd() + " @" + p.nickname + " ").replace(/^ /, "").slice(0, area.maxLength);
            area.dispatchEvent(new Event("input")); area.focus(); pintarArroba(); return;
          }
          colocarFig("mencao", "@" + p.nickname, { uid: p.uid });
        });
        oc.addEventListener("click", async () => { if (await mencionarOculta(p)) pn.remove(); });
        linha.append(b, oc);
        return linha;
      }) : [el("p", "figs-dica", q ? "Ninguém com esse nome ou @." : "Siga pessoas para mencionar no flash.")]));
    };
    busca.addEventListener("input", pintarL);
    pintarL();
    setTimeout(() => busca.focus(), 50);
  }
  // Lista de quem está mencionado: figurinhas (mostrar/ocultar, tirar), escritos no texto e os ocultos.
  async function abrirMencoes() {
    palco.querySelector(".flash-figs")?.remove();
    esconderArroba();
    const pn = el("div", "flash-figs flash-mencoes");
    const cab = el("div", "fe-cab"); const ok = el("button", "fe-pronto", "Pronto"); ok.type = "button";
    cab.append(el("strong", "figs-tit", "Menções"), el("span", "esp"), ok);
    const corpo = el("div", "mencao-corpo");
    const add = el("button", "fm-add"); add.type = "button"; add.append(icone("pessoa-mais", "i s"), el("span", null, "Mencionar alguém"));
    const lista = el("div", "mencao-lista");
    corpo.append(add, el("p", "figs-dica", "Quem você menciona recebe um aviso e pode pôr o seu flash no dele. Oculta: a pessoa é avisada, mas o nome não aparece para quem vê. Dica: escreva @ no texto ou na legenda."), lista);
    pn.append(cab, corpo); palco.appendChild(pn);
    ok.addEventListener("click", () => pn.remove());
    add.addEventListener("click", () => { if (totalMencoes() >= 10) { toast("Dá para mencionar até 10 pessoas em cada flash."); return; } escolherMencao(); });
    const linha = (p, sub, botoes) => {
      const l = el("div", "mencao-item fm-linha");
      const av = el("span", "avatar"); pintarAvatar(av, p?.fotoPerfil, p?.nome);
      const tx = el("span", "tx"); tx.append(el("strong", null, p?.nickname ? "@" + p.nickname : p?.nome || "Pessoa"), el("small", null, sub));
      const info = el("div", "fm-usar"); info.append(av, tx);
      l.append(info, ...botoes); return l;
    };
    const botao = (ic, rot, fn, extra = "") => { const b = el("button", "fa-oculta" + extra); b.type = "button"; b.title = rot; b.setAttribute("aria-label", rot); b.appendChild(icone(ic, "i xs")); b.addEventListener("click", fn); return b; };
    async function pintarL() {
      const blocos = [];
      const figs = figMencoes(), nicks = nicksNoTexto();
      // Muitas menções: um toque junta todas na lista "Mencionados" (sem encher a foto de @).
      blocos.push(el("p", "fm-total", `${totalMencoes()} de 10 pessoas mencionadas`));
      if (figs.filter((t) => !t.soLista && !t.oculta).length >= 3) {
        const j = el("button", "fm-add fm-juntar"); j.type = "button"; j.append(icone("pessoa-mais", "i s"), el("span", null, "Tirar os @ da foto e mostrar só em “Mencionados”"));
        j.addEventListener("click", () => { figs.forEach((t) => { if (!t.oculta) { t.soLista = true; pintarTexto(t); } }); pintarL(); toast("Os @ saíram da foto: quem vê encontra todos em “Mencionados”"); });
        blocos.push(j);
      }
      if (figs.length) {
        blocos.push(el("p", "figs-sec", "Figurinhas"));
        for (const t of figs) {
          const p = await obterPerfil(t.uid).catch(() => ({}));
          const modoM = t.oculta ? "oculta" : t.soLista ? "lista" : "tela";
          const sub = { tela: "Na tela: o @ aparece no flash e abre o perfil", lista: "Só na lista: não aparece na foto, mas quem vê encontra em “Mencionados”", oculta: "Oculta: só recebe o aviso, ninguém vê" }[modoM];
          const l = linha({ ...p, nickname: t.texto.replace(/^@/, "") || p.nickname }, sub, [botao("lixo", "Tirar a menção", () => { t.el.remove(); textos.splice(textos.indexOf(t), 1); pintarArroba(); pintarL(); })]);
          const seg = el("div", "fm-seg"); seg.setAttribute("role", "radiogroup"); seg.setAttribute("aria-label", "Como a menção aparece");
          [["tela", "Na tela"], ["lista", "Só na lista"], ["oculta", "Oculta"]].forEach(([k, rot]) => {
            const b = el("button", "fm-seg-op" + (k === modoM ? " on" : ""), rot); b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(k === modoM));
            b.addEventListener("click", () => { marcar("Mudar a menção"); t.oculta = k === "oculta"; t.soLista = k === "lista"; pintarTexto(t); pintarL(); });
            seg.appendChild(b);
          });
          const w = el("div", "fm-bloco"); w.append(l, seg);
          blocos.push(w);
        }
      }
      if (nicks.length) {
        blocos.push(el("p", "figs-sec", "Escritos no texto"));
        for (const n of nicks) {
          const u = nickUid.get(n); const p = u ? await obterPerfil(u).catch(() => ({})) : {};
          blocos.push(linha({ ...p, nickname: n }, "Aparece onde você escreveu · para tirar, apague do texto", []));
        }
      }
      if (avisos.size) {
        blocos.push(el("p", "figs-sec", "Ocultas (só o aviso)"));
        [...avisos.values()].forEach((p) => blocos.push(linha(p, "Não aparece para quem vê", [
          ...(modo === "foto" && img ? [botao("olho", "Mostrar como figurinha", () => { avisos.delete(p.uid); colocarFig("mencao", "@" + p.nickname, { uid: p.uid }); pintarL(); })] : []),
          botao("lixo", "Tirar a menção", () => { avisos.delete(p.uid); pintarArroba(); pintarL(); })
        ])));
      }
      lista.replaceChildren(...(blocos.length ? blocos : [el("p", "figs-dica fm-vazio", "Ninguém mencionado ainda.")]));
      pintarArroba();
    }
    pintarL();
  }
  bArroba.addEventListener("click", abrirMencoes);
  ligarArroba(area); ligarArroba(legenda);
  // Menções que vão gravadas: visíveis (figurinhas à vista e @ do texto) e ocultas (figurinhas ocultas e só aviso).
  async function mencoesParaGravar() {
    const nicks = nicksNoTexto();
    const doTexto = nicks.length ? await uidsMencionados(nicks.map((n) => "@" + n).join(" ")).catch(() => []) : [];
    const vis = [...new Set([...figMencoes().filter((t) => !t.oculta).map((t) => t.uid), ...doTexto])];
    const oc = [...new Set([...figMencoes().filter((t) => t.oculta).map((t) => t.uid), ...avisos.keys()])].filter((u) => !vis.includes(u));
    const todas = [...vis, ...oc].slice(0, 10);
    const ocultas = oc.filter((u) => todas.includes(u));
    return { ...(todas.length ? { mencoes: todas } : {}), ...(ocultas.length ? { mencoesOcultas: ocultas } : {}) };
  }

  // Janela de escrever (por cima do cartão). Em cima: alinhamento, fundo atrás do texto e Pronto; na lateral, a régua
  // do tamanho; embaixo (logo acima do teclado), as letras com o nome de cada uma e as cores.
  function editarTexto(t) {
    const novo = !t;
    const tmp = t ? { alinha: "center", ...t } : { texto: "", x: 0.5, y: 0.42, tam: 0.075, letra: 0, cor: "#ffffff", destaque: false, alinha: "center" };
    const ed = el("div", "flash-edtxt");
    const cab = el("div", "fe-cab");
    const bAl = el("button", "flash-ferr-btn fe-alinha"); bAl.type = "button";
    const bDe = el("button", "flash-ferr-btn destaque"); bDe.type = "button"; bDe.setAttribute("aria-label", "Fundo atrás do texto"); bDe.title = "Fundo atrás do texto"; bDe.innerHTML = "<b>A</b>";
    const ok = el("button", "fe-pronto", "Pronto"); ok.type = "button";
    cab.append(bAl, bDe, el("span", "esp"), ok);
    // Régua do tamanho (em pé, na lateral): mais fina em baixo, mais grossa em cima.
    const regua = el("div", "fe-regua");
    const tam = el("input", "fe-tam"); tam.type = "range"; tam.min = "0.04"; tam.max = "0.16"; tam.step = "0.002"; tam.value = String(tmp.tam); tam.setAttribute("aria-label", "Tamanho do texto");
    regua.appendChild(tam);
    const campo = el("textarea", "fe-campo"); campo.rows = 2; campo.maxLength = 120; campo.value = tmp.texto; campo.placeholder = "Escreva...";
    const baixo = el("div", "fe-baixo");
    const letras = el("div", "fe-letras"); letras.setAttribute("role", "radiogroup"); letras.setAttribute("aria-label", "Letra");
    LETRAS.forEach((L, k) => {
      const b = el("button", "fe-letra", L.nome); b.type = "button"; b.setAttribute("role", "radio");
      b.style.font = L.css.replace("1em", "14px"); if (L.sombra) b.classList.add("neon");
      b.addEventListener("pointerdown", (e) => e.preventDefault()); // não fecha o teclado
      b.addEventListener("click", () => { tmp.letra = k; pintarEd(); b.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" }); });
      letras.appendChild(b);
    });
    const cores = el("div", "fe-cores");
    CORES.forEach((c) => { const b = el("button"); b.type = "button"; b.style.background = c; b.setAttribute("aria-label", "Cor " + c); b.addEventListener("pointerdown", (e) => e.preventDefault()); b.addEventListener("click", () => { tmp.cor = c; pintarEd(); }); cores.appendChild(b); });
    baixo.append(letras, cores);
    ed.append(cab, regua, campo, baixo);
    palco.appendChild(ed);
    [bAl, bDe].forEach((b) => b.addEventListener("pointerdown", (e) => e.preventDefault()));
    function pintarEd() {
      const { W } = medidas();
      campo.style.font = LETRAS[tmp.letra].css.replace("1em", Math.round(tmp.tam * W) + "px");
      campo.style.textAlign = tmp.alinha;
      campo.style.color = tmp.destaque ? (clara(tmp.cor) ? "#111" : "#fff") : tmp.cor;
      campo.style.background = tmp.destaque ? tmp.cor : tmp.vidro ? FUNDO_VIDRO : "transparent";
      campo.classList.toggle("neon", LETRAS[tmp.letra].sombra && !tmp.destaque && !tmp.vidro);
      bDe.classList.toggle("on", !!tmp.destaque); bDe.classList.toggle("vidro", !!tmp.vidro); bDe.setAttribute("aria-pressed", String(!!(tmp.destaque || tmp.vidro)));
      bDe.setAttribute("aria-label", tmp.destaque ? "Fundo: cor cheia (toque para fundo escuro)" : tmp.vidro ? "Fundo: escuro transparente (toque para tirar)" : "Fundo atrás do texto");
      bAl.innerHTML = iconeAlinha(tmp.alinha);
      bAl.setAttribute("aria-label", `Alinhamento: ${{ center: "no meio", left: "à esquerda", right: "à direita" }[tmp.alinha]}`);
      [...letras.children].forEach((b, k) => { b.classList.toggle("on", k === tmp.letra); b.setAttribute("aria-checked", String(k === tmp.letra)); });
      [...cores.children].forEach((b, k) => b.classList.toggle("on", CORES[k] === tmp.cor));
    }
    bAl.addEventListener("click", () => { tmp.alinha = ALINHAS[(ALINHAS.indexOf(tmp.alinha) + 1) % ALINHAS.length]; pintarEd(); });
    // Fundo: sem → cor cheia → escuro transparente → sem.
    bDe.addEventListener("click", () => { if (tmp.destaque) { tmp.destaque = false; tmp.vidro = true; } else if (tmp.vidro) tmp.vidro = false; else tmp.destaque = true; pintarEd(); });
    tam.addEventListener("input", () => { tmp.tam = Number(tam.value); pintarEd(); });
    const concluir = () => {
      const texto = campo.value.trim();
      ed.remove();
      if (t && !texto) { marcar(`Apagar ${nomeFig(t)}`); t.el.remove(); textos.splice(textos.indexOf(t), 1); return; }
      if (!texto) return;
      tmp.texto = texto;
      if (novo) criarTexto(tmp); else { marcar(`Editar ${nomeFig(t)}`); Object.assign(t, tmp); pintarTexto(t); }
      pintarArroba();
    };
    ok.addEventListener("click", concluir);
    // Tocar fora do texto (na parte escura) também conclui, como nos outros apps.
    ed.addEventListener("click", (e) => { if (e.target === ed) concluir(); });
    ed.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); concluir(); } });
    pintarEd();
    ligarArroba(campo);
    setTimeout(() => campo.focus(), 50);
  }

  // ---------- pincel (desenhar na foto) ----------
  const pintarDesenho = () => {
    const W = palco.offsetWidth, H = palco.offsetHeight, k = Math.min(2, devicePixelRatio || 1);
    if (desenho.width !== Math.round(W * k)) { desenho.width = Math.round(W * k); desenho.height = Math.round(H * k); }
    const g = desenho.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0);
    pintarTracos(g, desenho.width, desenho.height, tracos);
  };
  if ("ResizeObserver" in window) new ResizeObserver(() => { if (tracos.length) pintarDesenho(); }).observe(palco);
  function abrirPincel() {
    palco.querySelector(".flash-figs, .flash-edtxt, .flash-pincel")?.remove();
    const est = { modo: "caneta", cor: "#ffffff", larg: 0.016 };
    const ed = el("div", "flash-pincel");
    const cab = el("div", "fe-cab");
    const desfazer = el("button", "flash-ferr-btn"); desfazer.type = "button"; desfazer.setAttribute("aria-label", "Desfazer"); desfazer.appendChild(icone("voltar", "i s"));
    const MODOS = [["caneta", "Caneta", '<path d="M4 20l3.5-1 11-11-2.5-2.5-11 11z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>'],
      ["marcador", "Marca-texto", '<path d="M6 15l7-7 4 4-7 7H6zM13 8l2.5-2.5 4 4L17 12" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M4 21h9" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'],
      ["neon", "Neon", '<path d="M5 19c4-1 5-6 8-9s6-3 6-3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="19" cy="7" r="2.2" fill="currentColor"/>'],
      ["borracha", "Borracha", '<path d="M8 20h11M5.5 15.5l8-8 5 5-6.5 6.5H9z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>']];
    const modos = el("div", "fp-modos"); modos.setAttribute("role", "radiogroup"); modos.setAttribute("aria-label", "Pincel");
    MODOS.forEach(([k, rot, svg]) => {
      const b = el("button", "flash-ferr-btn fp-modo"); b.type = "button"; b.dataset.modo = k; b.setAttribute("role", "radio"); b.setAttribute("aria-label", rot); b.title = rot;
      b.innerHTML = `<svg class="i s" viewBox="0 0 24 24" aria-hidden="true">${svg}</svg>`;
      b.addEventListener("click", () => { est.modo = k; pintarEd(); });
      modos.appendChild(b);
    });
    const ok = el("button", "fe-pronto", "Pronto"); ok.type = "button";
    cab.append(desfazer, el("span", "esp"), modos, el("span", "esp"), ok);
    const regua = el("div", "fe-regua");
    const tam = el("input", "fe-tam"); tam.type = "range"; tam.min = "0.006"; tam.max = "0.06"; tam.step = "0.001"; tam.value = String(est.larg); tam.setAttribute("aria-label", "Espessura");
    regua.appendChild(tam);
    const amostra = el("span", "fp-amostra"); regua.appendChild(amostra);
    const cores = el("div", "fe-cores fp-cores");
    CORES.forEach((c) => { const b = el("button"); b.type = "button"; b.style.background = c; b.setAttribute("aria-label", "Cor " + c); b.addEventListener("click", () => { est.cor = c; if (est.modo === "borracha") est.modo = "caneta"; pintarEd(); }); cores.appendChild(b); });
    const area = el("div", "fp-area");
    ed.append(area, cab, regua, cores);
    palco.appendChild(ed);
    palco.classList.add("pincel-aberto");
    function pintarEd() {
      [...modos.children].forEach((b) => { const on = b.dataset.modo === est.modo; b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on)); });
      [...cores.children].forEach((b, k) => b.classList.toggle("on", CORES[k] === est.cor && est.modo !== "borracha"));
      const W = palco.offsetWidth, px = Math.max(3, est.larg * W * (est.modo === "marcador" ? 2.2 : 1));
      amostra.style.width = amostra.style.height = px + "px";
      amostra.style.background = est.modo === "borracha" ? "transparent" : est.cor;
      amostra.style.boxShadow = est.modo === "neon" ? `0 0 ${px}px ${est.cor}` : "";
      desfazer.disabled = !tracos.length;
    }
    tam.addEventListener("input", () => { est.larg = Number(tam.value); pintarEd(); });
    desfazer.addEventListener("click", () => { tracos.pop(); pintarDesenho(); pintarEd(); });
    let atual = null;
    area.addEventListener("pointerdown", (e) => {
      const r = palco.getBoundingClientRect();
      area.setPointerCapture(e.pointerId);
      marcar(est.modo === "borracha" ? "Apagar parte do desenho" : "Desenhar");
      atual = { modo: est.modo, cor: est.cor, larg: est.larg, pts: [[(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]] };
      tracos.push(atual); ed.classList.add("desenhando"); pintarDesenho();
    });
    area.addEventListener("pointermove", (e) => {
      if (!atual) return;
      const r = palco.getBoundingClientRect();
      atual.pts.push([(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]);
      if (atual.pts.length > 900) atual.pts.splice(1, 1); // traço muito longo: não pesa no aparelho
      pintarDesenho();
    });
    const soltar = () => { if (!atual) return; atual = null; ed.classList.remove("desenhando"); pintarEd(); };
    area.addEventListener("pointerup", soltar); area.addEventListener("pointercancel", soltar);
    ok.addEventListener("click", () => { ed.remove(); palco.classList.remove("pincel-aberto"); });
    pintarEd();
  }
  bPincel.addEventListener("click", abrirPincel);

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
      try { localStorage.setItem("hf-cam-ok", "1"); } catch {}
      camVideo.addEventListener("playing", () => palco.classList.remove("abrindo-cam"), { once: true });
      setTimeout(() => palco.classList.remove("abrindo-cam"), 2500);
      modo = "foto"; pintar();
      // Quando o primeiro quadro chega: amostras reais nas bolinhas dos filtros.
      camVideo.addEventListener("loadeddata", () => { if (cam) pintarTira(); }, { once: true });
    } catch (e) {
      cam = null; palco.classList.remove("abrindo-cam");
      if (e?.name === "NotAllowedError") { try { localStorage.removeItem("hf-cam-ok"); } catch {} }
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
    if (comTempo) for (let n = comTempo; n > 0; n--) { contagemCam.textContent = String(n); contagemCam.classList.add("on"); await new Promise((r) => setTimeout(r, 1000)); }
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
    soltarZoom();
    pararCamera();
    window.removeEventListener("pointermove", moverGesto, true); window.removeEventListener("pointerup", soltarGesto, true); window.removeEventListener("pointercancel", soltarGesto, true);
    fundo.remove(); document.body.classList.remove("travado"); document.removeEventListener("keydown", tecla); window.removeEventListener("resize", aoRedimensionar); window.visualViewport?.removeEventListener("resize", aoRedimensionar); clearTimeout(tMedir);
    if (foto) URL.revokeObjectURL(foto);
  };
  // Voltar do celular, Esc e o X (como no Instagram): com um painel aberto fecha só o painel; com algo feito pergunta se
  // guarda como rascunho, descarta ou continua editando. Nada se perde sem querer.
  const temConteudo = () => !!(foto || video || area.value.trim() || textos.length || tracos.length);
  function fecharPainel() {
    const ed = palco.querySelector(".flash-edtxt, .flash-pincel");
    if (ed) { ed.querySelector(".fe-cab .fe-pronto")?.click(); return true; }
    const pn = palco.querySelector(".flash-figs, .fe-arroba");
    if (pn) { pn.remove(); return true; }
    return false;
  }
  function perguntarSair() {
    if (!temConteudo() || !configFlash().perguntarRascunho) { fechar(); return; }
    abrirOpcoes("Sair do flash?", [
      { rotulo: "Salvar como rascunho", sub: "Fica guardado neste aparelho para terminar depois", icone: "rascunho", fn: async () => { if (await salvarRascunho()) fechar(); } },
      { rotulo: "Descartar", sub: "A foto e o que você fez serão perdidos", icone: "lixo", perigo: true, fn: () => fechar() },
      { rotulo: "Continuar editando", icone: "lapis", fn: () => {} }
    ]);
  }
  const tecla = (e) => {
    if (e.key !== "Escape" || document.querySelector(".hfe-fundo")) return;
    // uma folha aberta por cima (ex.: "Sair do flash?") fecha primeiro = continuar editando
    const fo = document.querySelector(".folha.aberta"); if (fo) { fo.querySelector("[data-fechar]")?.click(); return; }
    if (document.activeElement && fundo.contains(document.activeElement) && /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName) && document.activeElement !== area) document.activeElement.blur();
    if (fecharPainel()) return;
    perguntarSair();
  };
  document.addEventListener("keydown", tecla);
  bX.addEventListener("click", () => { if (!fecharPainel()) perguntarSair(); });

  // ---------- rascunhos (no aparelho, IndexedDB) ----------
  async function salvarRascunho() {
    try {
      let fotoUrl = "";
      if (img) {
        const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); fotoUrl = c.toDataURL("image/jpeg", 0.88);
      }
      const { W } = medidas();
      const r = {
        id: rascId || "r" + Date.now().toString(36), quando: Date.now(), modo: video ? "foto" : modo, fundoI, letraI, texto: area.value, legenda: legenda.value,
        foto: fotoUrl, filtro: filtro.id, z, ox: ox / (W || 1), oy: oy / (W || 1), tracos: tracos.map((t) => ({ ...t, pts: t.pts.slice() })), paraAmigos, alvo,
        textos: textos.map(({ el: _e, _area, _arrobas, img: im, ...t }) => ({ ...t, ...(im ? { imgSrc: im.src } : {}) })), avisos: [...avisos.values()]
      };
      await guardarRascunho(r);
      rascId = r.id;
      lerRascunhos().then((l) => { nRasc = l.length; });
      toast("Rascunho salvo neste aparelho");
      return true;
    } catch (e) { toast("Não foi possível salvar o rascunho: " + erroAmigavel(e)); return false; }
  }
  let rascId = rascunho?.id || null;

  // ---------- desfazer e refazer ----------
  // Cada mudança (pôr, mover, ajustar, editar, apagar, desenhar) guarda como estava antes, com o nome do que foi feito.
  // Barra no alto do cartão: ↶ Desfazer · ↷ Refazer; ao desfazer, mostra o que voltou ("Desfeito: Mover texto").
  // No computador: Ctrl+Z / Ctrl+Shift+Z (ou Ctrl+Y). Até 40 passos.
  const historico = [], refeitos = [];
  let restaurando = false;
  const SVG_DESF = '<svg class="i s" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 010 11H11"/></svg>';
  const hist = el("div", "flash-hist"); hist.hidden = true; hist.setAttribute("role", "group"); hist.setAttribute("aria-label", "Desfazer e refazer");
  const bDesfazer = el("button", "fh-btn flash-desfazer"); bDesfazer.type = "button"; bDesfazer.innerHTML = SVG_DESF;
  const bRefazer = el("button", "fh-btn fh-refazer"); bRefazer.type = "button"; bRefazer.innerHTML = SVG_DESF;
  const rotHist = el("span", "fh-rot"); rotHist.setAttribute("aria-live", "polite");
  hist.append(bDesfazer, rotHist, bRefazer);
  palco.appendChild(hist);
  [bDesfazer, bRefazer].forEach((b) => b.addEventListener("pointerdown", (e) => { e.stopPropagation(); e.preventDefault(); }));
  function nomeFig(t, maiuscula = false) {
    const n = t.enq ? (Number.isInteger(t.certa) ? "teste" : "enquete") : t.ct ? "contagem regressiva" : t.cx ? "caixa de perguntas" : t.lk ? "link do negócio" : t.ft ? "foto" : t.emoji ? "emoji"
      : t.fig === "mencao" ? "menção" : t.fig === "local" ? "localização" : t.fig === "hashtag" ? "hashtag" : t.fig ? "figurinha" : "texto";
    return maiuscula ? n[0].toUpperCase() + n.slice(1) : n;
  }
  const instantaneo = () => ({ textos: textos.map(({ el: _e, _area, _arrobas, ...t }) => ({ ...t })), tracos: tracos.map((t) => ({ ...t, pts: t.pts.slice() })) });
  let tRot = 0;
  function avisarHist(txt, comDesfazer = false) {
    rotHist.textContent = txt; hist.classList.add("com-rot", "pisca"); clearTimeout(tRot);
    if (comDesfazer) hist.classList.add("acabou-apagar");
    tRot = setTimeout(() => hist.classList.remove("com-rot", "pisca", "acabou-apagar"), 2600);
  }
  function pintarHist() {
    hist.hidden = !historico.length && !refeitos.length;
    bDesfazer.disabled = !historico.length; bRefazer.disabled = !refeitos.length;
    const u = historico[historico.length - 1], f = refeitos[refeitos.length - 1];
    bDesfazer.title = u ? `Desfazer: ${u.rotulo}` : "Nada para desfazer"; bDesfazer.setAttribute("aria-label", bDesfazer.title);
    bRefazer.title = f ? `Refazer: ${f.rotulo}` : "Nada para refazer"; bRefazer.setAttribute("aria-label", bRefazer.title);
  }
  function marcar(rotulo = "Mudança") {
    if (restaurando) return;
    historico.push({ ...instantaneo(), rotulo });
    if (historico.length > 40) historico.shift();
    refeitos.length = 0;
    pintarHist();
  }
  const renomearUltimo = (rotulo) => { const u = historico[historico.length - 1]; if (u) { u.rotulo = rotulo; pintarHist(); } };
  function aplicar(h) {
    restaurando = true;
    textos.splice(0).forEach((t) => t.el?.remove());
    h.textos.forEach((t) => criarTexto({ ...t }));
    tracos.splice(0, tracos.length, ...h.tracos); pintarDesenho();
    restaurando = false;
    pintarArroba();
    publicar.disabled = !prontoParaPublicar() || enviando;
  }
  function desfazer() {
    const h = historico.pop(); if (!h) return;
    refeitos.push({ ...instantaneo(), rotulo: h.rotulo });
    aplicar(h); pintarHist(); avisarHist(`Desfeito: ${h.rotulo}`);
  }
  function refazer() {
    const h = refeitos.pop(); if (!h) return;
    historico.push({ ...instantaneo(), rotulo: h.rotulo });
    aplicar(h); pintarHist(); avisarHist(`Refeito: ${h.rotulo}`);
  }
  bDesfazer.addEventListener("click", (e) => { e.stopPropagation(); desfazer(); });
  bRefazer.addEventListener("click", (e) => { e.stopPropagation(); refazer(); });
  document.addEventListener("keydown", (e) => {
    if (!fundo.isConnected || !(e.ctrlKey || e.metaKey) || /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || "")) return;
    const k = e.key.toLowerCase();
    if (k === "z" && !e.shiftKey) { e.preventDefault(); desfazer(); }
    else if (k === "y" || (k === "z" && e.shiftKey)) { e.preventDefault(); refazer(); }
  });
  // Atalho para salvar o rascunho (sem precisar sair): aparece quando já tem algo feito.
  const bSalvaRasc = el("button", "flash-ferr-btn flash-salvar-rasc"); bSalvaRasc.type = "button"; bSalvaRasc.title = "Salvar rascunho"; bSalvaRasc.setAttribute("aria-label", "Salvar como rascunho");
  bSalvaRasc.appendChild(icone("rascunho", "i s")); bSalvaRasc.hidden = true;
  esq.appendChild(bSalvaRasc);
  const verRasc = () => setTimeout(() => { bSalvaRasc.hidden = !temConteudo(); }, 0);
  ["input", "click", "pointerup", "change"].forEach((ev) => fundo.addEventListener(ev, verRasc, true));
  // Pergunta antes (antes salvava direto com um toque): salvar e continuar, salvar e sair ou cancelar.
  bSalvaRasc.addEventListener("click", (e) => {
    e.stopPropagation();
    const salvar = async (sair) => {
      bSalvaRasc.disabled = true;
      const ok = await salvarRascunho();
      bSalvaRasc.disabled = false;
      if (!ok) return;
      if (sair) { fechar(); return; }
      bSalvaRasc.classList.add("salvo"); setTimeout(() => bSalvaRasc.classList.remove("salvo"), 1400);
    };
    abrirOpcoes("Quer salvar como rascunho?", [
      { rotulo: "Salvar e continuar editando", sub: "Fica guardado neste aparelho (até 10 rascunhos)", icone: "rascunho", fn: () => salvar(false) },
      { rotulo: "Salvar e sair", sub: "Você termina depois em “Rascunhos”", icone: "check", fn: () => salvar(true) },
      { rotulo: "Cancelar", icone: "fechar", fn: () => {} }
    ]);
  });
  // Foto com os textos: desenha o cartão inteiro em 1080×1920 (o que a pessoa vê é o que vai).
  function desenharCamada(g, OW, OH) {
    if (tracos.length) { const cd = document.createElement("canvas"); cd.width = OW; cd.height = OH; pintarTracos(cd.getContext("2d"), OW, OH, tracos); g.drawImage(cd, 0, 0); }
    textos.forEach((t) => {
      if (t.enq || t.cx || t.lk || t.ct) return; // enquete, contagem, caixa de perguntas e link ficam por cima, interativos (não vão desenhados)
      if (t.fig && (t.oculta || t.soLista)) return; // menção oculta / só na lista: não aparece na foto
      // Girada com dois dedos: desenha em volta do centro dela.
      g.save();
      if (t.rot) { g.translate(t.x * OW, t.y * OH); g.rotate((t.rot * Math.PI) / 180); g.translate(-t.x * OW, -t.y * OH); }
      desenharUma(g, t, OW, OH);
      g.restore();
    });
  }
  function desenharUma(g, t, OW, OH) {
      const px = Math.round(t.tam * OW);
      if (t.ft) {
        // Foto por cima: sem moldura, moldura branca ou redonda
        const w = t.tam * OW, h = w * (t.img.naturalHeight / t.img.naturalWidth), x = t.x * OW, y = t.y * OH, est = t.estilo || 0;
        if (est === 3) { g.drawImage(t.img, x - w / 2, y - h / 2, w, h); return; } // figurinha pronta (já tem sombra e cantos)
        g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = w * 0.05; g.shadowOffsetY = w * 0.015;
        if (est === 2) {
          const r = w / 2; // redonda: o círculo tem a largura toda (igual à prévia)
          g.beginPath(); g.arc(x, y, r + w * 0.02, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill(); g.shadowBlur = 0;
          g.save(); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.clip();
          const k = (2 * r) / Math.min(t.img.naturalWidth, t.img.naturalHeight);
          g.drawImage(t.img, x - (t.img.naturalWidth * k) / 2, y - (t.img.naturalHeight * k) / 2, t.img.naturalWidth * k, t.img.naturalHeight * k);
          g.restore();
        } else {
          // moldura branca: a borda fica DENTRO da largura (4% de cada lado), como na prévia
          const m = est === 1 ? w * 0.04 : 0, pw = w - 2 * m, ph = pw * (t.img.naturalHeight / t.img.naturalWidth);
          if (est === 1) { g.fillStyle = "#fff"; g.beginPath(); (g.roundRect ? g.roundRect(x - w / 2, y - ph / 2 - m, w, ph + 2 * m, w * 0.02) : g.rect(x - w / 2, y - ph / 2 - m, w, ph + 2 * m)); g.fill(); }
          else { g.fillStyle = "rgba(0,0,0,.01)"; g.beginPath(); g.rect(x - pw / 2, y - ph / 2, pw, ph); g.fill(); }
          g.shadowBlur = 0;
          g.save(); g.beginPath(); (g.roundRect ? g.roundRect(x - pw / 2, y - ph / 2, pw, ph, est === 1 ? 2 : pw * 0.03) : g.rect(x - pw / 2, y - ph / 2, pw, ph)); g.clip();
          g.drawImage(t.img, x - pw / 2, y - ph / 2, pw, ph);
          g.restore();
        }
        g.shadowColor = "transparent"; g.shadowOffsetY = 0;
        return;
      }
      if (t.fig) {
        const es = EST_FIG[(t.estilo || 0) % EST_FIG.length], ct = corFig(t.fig), rot = rotuloFig(t), M = MED_FIG;
        g.font = `${t.fig === "hora" ? 800 : 750} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
        g.textAlign = "left"; g.textBaseline = "middle";
        const tw = g.measureText(rot).width;
        const lw = px * (M.padE + M.chip + M.gap + M.padD) + tw, lh = px * M.alt;
        const ra = ((t.rot || 0) * Math.PI) / 180, bw = Math.abs(lw * Math.cos(ra)) + Math.abs(lh * Math.sin(ra)), bh = Math.abs(lw * Math.sin(ra)) + Math.abs(lh * Math.cos(ra));
        // A figurinha (@, lugar, #, hora) sai INTEIRA na foto: a letra da foto é um pouco mais larga que a do criador e,
        // encostada na beirada, a ponta ficava cortada (o @ aparecia pela metade no visor).
        const folga = OW * 0.015, x = Math.min(OW - bw / 2 - folga, Math.max(bw / 2 + folga, t.x * OW)), y = Math.min(OH - bh / 2 - folga, Math.max(bh / 2 + folga, t.y * OH));
        // Onde a figurinha ficou (fração da foto): quem vê toca ali (localização, hashtag e menção).
        t._area = { x: x / OW, y: y / OH, w: bw / OW, h: bh / OH };
        const grad = (cores, x0, y0, x1, y1) => { const gg = g.createLinearGradient(x0, y0, x1, y1); gg.addColorStop(0, cores[0]); gg.addColorStop(1, cores[1]); return gg; };
        const fundo = es.fundo === "tipo" ? ct : es.fundo;
        g.save(); // (o giro já foi aplicado em volta do ponto da figurinha, em desenharCamada)
        g.fillStyle = Array.isArray(fundo) ? grad(fundo, x - lw / 2, y - lh / 2, x + lw / 2, y + lh / 2) : fundo;
        if (es.sombra) { g.shadowColor = "rgba(0,0,0,.28)"; g.shadowBlur = px * 0.5; g.shadowOffsetY = px * 0.16; }
        g.beginPath(); (g.roundRect ? g.roundRect(x - lw / 2, y - lh / 2, lw, lh, lh / 2) : g.rect(x - lw / 2, y - lh / 2, lw, lh)); g.fill();
        g.shadowColor = "transparent"; g.shadowBlur = 0; g.shadowOffsetY = 0;
        if (es.borda) { g.strokeStyle = es.borda; g.lineWidth = Math.max(2, px * 0.07); g.stroke(); }
        // bolinha com o ícone
        const cr = (px * M.chip) / 2, cx = x - lw / 2 + px * M.padE + cr;
        g.fillStyle = es.chip === "tipo" ? grad(ct, cx - cr, y - cr, cx + cr, y + cr) : es.chip;
        g.beginPath(); g.arc(cx, y, cr, 0, Math.PI * 2); g.fill();
        try {
          const ic = new Path2D(ICONE_FIG[t.fig] || ICONE_FIG.local), esc = (cr * 1.16) / 24;
          g.save(); g.translate(cx - 12 * esc, y - 12 * esc); g.scale(esc, esc);
          g.strokeStyle = "#ffffff"; g.lineWidth = 2.3; g.lineCap = "round"; g.lineJoin = "round"; g.stroke(ic); g.restore();
        } catch {}
        // texto
        const x0 = x - lw / 2 + px * (M.padE + M.chip + M.gap);
        g.fillStyle = es.grad ? grad(ct, x0, 0, x0 + tw, 0) : es.cor;
        g.fillText(rot, x0, y + px * 0.04);
        g.restore();
        return;
      }
      g.font = LETRAS[t.letra].css.replace("1em", px + "px");
      const al = t.alinha || "center";
      g.textAlign = al; g.textBaseline = "middle";
      // Quebra as linhas como o cartão quebrou (no máximo 88% da largura): o que se vê no criador é o que sai.
      const linhas = quebrarLinhas(g, t.texto, OW * 0.88);
      const alt = px * 1.22, y0 = t.y * OH - ((linhas.length - 1) * alt) / 2;
      // Alinhado à esquerda/direita: as linhas encostam na borda do bloco (o bloco continua centrado no ponto).
      const larg = Math.max(...linhas.map((l) => g.measureText(l).width));
      const xa = t.x * OW + (al === "left" ? -larg / 2 : al === "right" ? larg / 2 : 0);
      // @usuário escrito no texto: guarda onde ficou cada um (o visor deixa tocar e abrir o perfil).
      t._arrobas = [];
      const ra = ((t.rot || 0) * Math.PI) / 180, cx0 = t.x * OW, cy0 = t.y * OH;
      linhas.forEach((l, i) => {
        const y = y0 + i * alt, wl = g.measureText(l).width, esq = al === "left" ? xa : al === "right" ? xa - wl : xa - wl / 2;
        for (const m of l.matchAll(/(^|[^\w@#])@([a-z0-9._]{3,20})/gi)) {
          const ini = m.index + m[1].length, w = g.measureText("@" + m[2]).width, mx = esq + g.measureText(l.slice(0, ini)).width + w / 2;
          const dx = mx - cx0, dy = y - cy0; // gira o centro junto com o texto
          t._arrobas.push({ nick: m[2].toLowerCase().replace(/\.+$/, ""), x: (cx0 + dx * Math.cos(ra) - dy * Math.sin(ra)) / OW, y: (cy0 + dx * Math.sin(ra) + dy * Math.cos(ra)) / OH, w: (w + px * 0.3) / OW, h: alt / OH });
        }
      });
      linhas.forEach((l, i) => {
        const y = y0 + i * alt, x = xa;
        if (t.destaque || t.vidro) {
          const lw = g.measureText(l).width + px * 0.7, lh = alt + px * 0.1;
          const rx = al === "left" ? x - px * 0.35 : al === "right" ? x - lw + px * 0.35 : x - lw / 2;
          g.fillStyle = t.destaque ? t.cor : FUNDO_VIDRO;
          g.beginPath(); (g.roundRect ? g.roundRect(rx, y - lh / 2, lw, lh, px * 0.25) : g.rect(rx, y - lh / 2, lw, lh)); g.fill();
          g.fillStyle = t.destaque ? (clara(t.cor) ? "#111" : "#fff") : t.cor; g.shadowBlur = 0;
        } else {
          g.fillStyle = t.cor;
          if (LETRAS[t.letra].sombra) { g.shadowColor = "rgba(255,255,255,.95)"; g.shadowBlur = px * 0.35; } else { g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = px * 0.12; }
        }
        g.fillText(l, x, y);
        g.shadowBlur = 0;
      });
  }
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
    desenharCamada(g, OW, OH);
    let q = 0.86, url = c.toDataURL("image/jpeg", q);
    while (url.length > 860000 && q > 0.45) { q -= 0.08; url = c.toDataURL("image/jpeg", q); }
    return url;
  }
  publicar.addEventListener("click", async () => {
    if (enviando || !prontoParaPublicar()) return;
    enviando = true; publicar.disabled = true; publicar.classList.add("enviando"); publicar.firstChild.textContent = "Publicando...";
    try {
      if (video && modo !== "texto") {
        toast("Enviando o vídeo...");
        const ext = (video.arq.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "mp4";
        const r = storageFns.ref(window.firebaseStorage, `stories/${eu.uid}/${Date.now()}.${ext}`);
        await storageFns.uploadBytes(r, video.arq, { contentType: video.arq.type, cacheControl: "public, max-age=31536000, immutable" });
        const texto = legenda.value.trim().slice(0, 150);
        await gravar({ tipo: "video", midia: await storageFns.getDownloadURL(r), duracao: Math.min(60, Math.round(video.dur)), ...(texto ? { texto } : {}), ...camposDestino(), ...(await mencoesParaGravar()) });
      } else {
        // Texto ou foto: as figurinhas (enquete, perguntas, local, @, fotos por cima, pincel) valem nos dois.
        const imagem = modo === "texto" ? desenharTexto(area.value.trim(), FUNDOS[fundoI], LETRAS[letraI], corTexto(fundoI), (g, W, H) => desenharCamada(g, W, H)) : desenharFoto();
        const url = await salvarImagem(imagem, `stories/${eu.uid}/${Date.now()}.jpg`);
        const texto = modo === "texto" ? "" : legenda.value.trim().slice(0, 150);
        const enq = textos.find((t) => t.enq);
        const mencoes = await mencoesParaGravar();
        const comCor = (t) => (t.tema && t.tema !== "branco" && CORES_FIG.some(([k]) => k === t.tema) ? { cor: t.tema } : {});
        const ehTeste = enq && Number.isInteger(enq.certa);
        // tamanho escolhido com dois dedos (só quando mudou): o visor desenha igual
        const kDe = (t) => (t && Math.abs((t.k || 1) - 1) > 0.02 ? { k: Math.round(t.k * 100) / 100 } : {});
        const enquete = enq ? { pergunta: enq.pergunta, opcoes: enq.opcoes, x: Math.round(enq.x * 1000) / 1000, y: Math.round(enq.y * 1000) / 1000, ...kDe(enq),
          ...(ehTeste ? { certa: enq.certa } : { fimEm: fb.Timestamp.fromMillis(fimEscolhido(enq.duracao || { dur: 1440 }, { maxMin: MAX_FLASH_MIN })) }),
          ...(enq.anonima && !ehTeste ? { anonima: true } : {}), ...comCor(enq) } : null;
        const ctt = textos.find((t) => t.ct);
        if (ctt && ctt.fim < Date.now() + 4 * 6e4) throw Object.assign(new Error("A contagem regressiva já está quase no fim: escolha outro horário."), { amigavel: true });
        const contagem = ctt ? { titulo: String(ctt.titulo).slice(0, 40), fim: fb.Timestamp.fromMillis(ctt.fim), x: Math.round(ctt.x * 1000) / 1000, y: Math.round(ctt.y * 1000) / 1000, ...kDe(ctt), ...comCor(ctt) } : null;
        const cx = textos.find((t) => t.cx);
        const caixa = cx ? { pergunta: cx.pergunta, anonima: !!cx.anonima, x: Math.round(cx.x * 1000) / 1000, y: Math.round(cx.y * 1000) / 1000, ...kDe(cx), ...comCor(cx) } : null;
        // Figurinhas que quem vê pode tocar: localização (vai para as publicações de lá), hashtags e menções à vista.
        const r3 = (n) => Math.round(Math.min(1, Math.max(0, n)) * 1000) / 1000;
        const pos = (a) => [r3(a.x), r3(a.y), r3(a.w), r3(a.h)];
        const lg = textos.find((t) => t.fig === "local" && t.lugar && t._area && Number.isFinite(t.lugar.lat) && Number.isFinite(t.lugar.lng));
        const nomeLg = lg ? String(lg.lugar.nome).replace(/[|\n]+/g, " ").trim().slice(0, 60) : "";
        const local = lg && lg.lugar.lat > -34 && lg.lugar.lat < 6 && lg.lugar.lng > -75 && lg.lugar.lng < -28 && nomeLg.length >= 2
          ? ["l", nomeLg, Number(lg.lugar.lat.toFixed(5)), Number(lg.lugar.lng.toFixed(5)), ...pos(lg._area)].join("|") : null;
        const toques = textos.filter((t) => t._area && ((t.fig === "hashtag" && /^#[\p{L}\p{N}_]{1,28}$/u.test(t.texto)) || (t.fig === "mencao" && t.uid && !t.oculta && !t.soLista && (mencoes.mencoes || []).includes(t.uid))))
          .slice(0, local ? 7 : 8).map((t) => [t.fig === "hashtag" ? "h" : "m", t.fig === "hashtag" ? t.texto.slice(1) : t.uid, ...pos(t._area)].join("|"));
        if (local) toques.unshift(local);
        // @ escrito nos textos: vira área tocável também (só quem está mesmo nas menções)
        const visiveis = new Set((mencoes.mencoes || []).filter((u) => !(mencoes.mencoesOcultas || []).includes(u)));
        for (const t of textos) {
          for (const a of t._arrobas || []) {
            if (toques.length >= 8) break;
            const uid = nickUid.get(a.nick) || (await fb.getDoc(fb.doc(fb.db, "nicknames", a.nick)).then((d) => (d.exists() ? d.data().uid : null)).catch(() => null));
            if (uid && visiveis.has(uid) && !toques.some((z) => z.startsWith(`m|${uid}|`))) toques.push(["m", uid, ...pos(a)].join("|"));
          }
        }
        const lk = textos.find((t) => t.lk);
        const link = lk ? { negocioId: lk.negocio.id, nome: String(lk.negocio.nome || "").slice(0, 80), tipo: lk.negocio.tipo, x: Math.round(lk.x * 1000) / 1000, y: Math.round(lk.y * 1000) / 1000, ...kDe(lk) } : null;
        const repostDe = repost ? { storyId: repost.id, autorId: repost.autorId, nome: String(repost.nome || "").slice(0, 80) } : null;
        const postDe = post ? { postId: post.id, autorId: post.autorId, nome: String(post.nome || "").slice(0, 80) } : null;
        const ref = await gravar({ tipo: "imagem", midia: url, ...(texto ? { texto } : {}), ...camposDestino(), ...(enquete ? { enquete } : {}), ...(caixa ? { caixa } : {}), ...(contagem ? { contagem } : {}), ...(link ? { link } : {}), ...(repostDe ? { repostDe } : {}), ...(postDe ? { postDe } : {}),
          ...mencoes, ...(toques.length ? { toques } : {}) }, { imagem });
        if (enquete && !Number.isInteger(enquete.certa)) registrarEnquete("f_" + ref.id, enquete);
        if (repost && repost.autorId !== eu.uid) mandarMensagem(repost.autorId, msgFlash({ id: ref.id, autorId: eu.uid, nome: dados.nome }, "repost", { original: repost.id }), "Repostou seu flash").catch(() => {});
      }
      if (rascId) apagarRascunho(rascId).catch(() => {});
      fechar();
    } catch (e) {
      toast(erroPublicar(e));
      enviando = false; publicar.disabled = false; publicar.classList.remove("enviando"); pintarAmigos();
    }
  });
  pintar();
  // Pílula "Rascunhos" no alto do cartão enquanto ele está vazio.
  const bRasc = el("button", "flash-rasc"); bRasc.type = "button"; bRasc.hidden = true;
  palco.appendChild(bRasc);
  const pintarRasc = () => { bRasc.hidden = temConteudo() || !nRasc; bRasc.replaceChildren(icone("rascunho", "i xs"), el("span", null, `Rascunhos · ${nRasc}`)); };
  let nRasc = 0;
  lerRascunhos().then((l) => { nRasc = l.length; pintarRasc(); });
  new MutationObserver(pintarRasc).observe(camada, { childList: true });
  [area, legenda].forEach((c) => c.addEventListener("input", pintarRasc));
  bRasc.addEventListener("click", () => abrirRascunhos((r) => { fechar(); abrirCriador({ rascunho: r }); }, (n) => { nRasc = n; pintarRasc(); }));
  if (rascunho) {
    // Reabre o rascunho como ele estava (fundo, foto e posição, filtro, figurinhas, pincel e menções ocultas).
    fundoI = rascunho.fundoI ?? fundoI; letraI = rascunho.letraI ?? 0;
    area.value = rascunho.texto || ""; legenda.value = rascunho.legenda || "";
    paraAmigos = !!rascunho.paraAmigos; pintarAmigos();
    alvo = rascunho.alvo || null; pintarAlvo();
    filtro = FILTROS.find((f) => f.id === rascunho.filtro) || FILTROS[0];
    (rascunho.avisos || []).forEach((p2) => p2?.uid && avisos.set(p2.uid, p2));
    tracos.splice(0, tracos.length, ...(rascunho.tracos || []));
    const carregarImg2 = (src) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = src; });
    const pore = async () => {
      const lista = await Promise.all((rascunho.textos || []).map(async (t) => (t.imgSrc ? { ...t, img: await carregarImg2(t.imgSrc) } : t)));
      restaurando = true;
      lista.filter((t) => !t.ft || t.img).forEach(({ imgSrc: _s, ...t }) => criarTexto(t));
      restaurando = false;
      pintarDesenho(); pintarArroba(); pintarRasc();
    };
    if (rascunho.foto) usarFoto(rascunho.foto).then(() => { const { W } = medidas(); z = rascunho.z || 1; ox = (rascunho.ox || 0) * W; oy = (rascunho.oy || 0) * W; posicionar(); pintarFiltroNaTela(); return pore(); }).catch((e) => toast(erroAmigavel(e)));
    else { modo = "texto"; pintar(); pore(); }
    return;
  }
  if (post) {
    // Publicação do Diário: o cartão dela já desenhado, com o selo de quem publicou.
    const tipoPub = post.enquete ? ["enquete", "Enquete"] : post.caixa ? ["caixa", "Caixa de perguntas"] : ["fotos", "Publicação"];
    const selo = el("div", "flash-repost-selo"); selo.append(icone(tipoPub[0], "i xs"), document.createTextNode(`${tipoPub[1]} de ${String(post.nome || "alguém").split(" ")[0]}`));
    palco.appendChild(selo);
    usarFoto(post.imagem).catch((e) => toast(erroAmigavel(e)));
    return;
  }
  if (imagem) {
    // Imagem já desenhada (resposta da caixa de perguntas): abre no cartão com o selo.
    const selo = el("div", "flash-repost-selo"); selo.append(icone("caixa", "i xs"), document.createTextNode(seloTexto || "Resposta"));
    palco.appendChild(selo);
    usarFoto(imagem).then(() => figuras.forEach((f) => criarTexto({ ft: true, img: f.img, texto: "", x: 0.5, y: 0.45, tam: f.tam, estilo: 3, rot: 0, letra: 0, cor: "#fff", destaque: false })))
      .catch((e) => toast(erroAmigavel(e)));
    if (figuras.length) setTimeout(() => toast("Troque o fundo em Fotos; a resposta continua por cima"), 900);
    return;
  }
  if (repost) {
    // Repostar: a foto do flash original, com o selo de quem fez (o original fica creditado).
    const selo = el("div", "flash-repost-selo"); selo.append(icone("raio", "i xs"), document.createTextNode(`Repostando o flash de ${String(repost.nome || "alguém").split(" ")[0]}`));
    palco.appendChild(selo);
    fotoFixa = true;
    usarFoto(repost.midia).then(() => {
      // As figurinhas interativas do original (enquete/teste, perguntas, contagem, link) não estão desenhadas na foto: antes
      // só apareciam depois de publicar. Agora aparecem aqui na hora, no lugar e na cor de lá (só para ver: o visor usa as
      // do original, com os votos e respostas de lá).
      const ms = (v) => v?.toMillis?.() ?? (typeof v === "number" ? v : null);
      const pos = (o) => ({ x: Number.isFinite(o.x) ? o.x : 0.5, y: Number.isFinite(o.y) ? o.y : 0.6, tema: o.cor || "branco" });
      const e = repost.enquete, c = repost.caixa, k = repost.contagem, l = repost.link;
      if (e?.pergunta) doOriginal.push({ enq: true, pergunta: e.pergunta, opcoes: e.opcoes || [], ...(Number.isInteger(e.certa) ? { certa: e.certa } : {}), anonima: !!e.anonima, duracao: ms(e.fimEm) ? { fim: ms(e.fimEm) } : { dur: 1440 }, ...pos(e) });
      if (c?.pergunta) doOriginal.push({ cx: true, pergunta: c.pergunta, anonima: !!c.anonima, ...pos(c) });
      if (k?.titulo && ms(k.fim)) doOriginal.push({ ct: true, titulo: k.titulo, fim: ms(k.fim), ...pos(k) });
      if (l?.negocioId) doOriginal.push({ lk: true, negocio: { id: l.negocioId, nome: l.nome, tipo: l.tipo }, ...pos(l) });
      doOriginal.forEach((t) => { t.el = el("div"); t.el.setAttribute("aria-hidden", "true"); camada.appendChild(t.el); pintarOriginal(t); });
      separarOriginal();
      // As figurinhas que funcionam (enquete, perguntas, contagem, link, lugar, # e @) vão junto e continuam valendo.
      const tem = [repost.enquete && (repost.enquete.certa != null ? "teste" : "enquete"), repost.caixa && "perguntas", repost.contagem && "contagem", repost.link && "link", Array.isArray(repost.toques) && repost.toques.length && "lugar, # e @"].filter(Boolean);
      if (tem.length) toast(`As figurinhas do flash original vão junto: ${tem.join(", ")}.`);
    }).catch((e) => toast(erroAmigavel(e)));
    return;
  }
  // Câmera já liberada antes: abre direto nela (como Instagram e TikTok). Sem permissão: fica a escolha Câmera/Galeria.
  // Câmera direto: enquanto ela liga, o cartão fica escuro com "Abrindo a câmera" (antes aparecia por 1 s a tela de
  // escolher Câmera/Galeria e só depois a câmera).
  const semCamera = () => { palco.classList.remove("abrindo-cam"); };
  if (configFlash().cameraDireto && modo === "foto" && !foto && !video && navigator.mediaDevices?.getUserMedia) {
    let jaDeu = false; try { jaDeu = localStorage.getItem("hf-cam-ok") === "1"; } catch {}
    if (jaDeu) palco.classList.add("abrindo-cam");
    setTimeout(semCamera, 5000);
    navigator.permissions?.query?.({ name: "camera" }).then((p) => {
      if (p.state === "granted" && modo === "foto" && !foto && !video) { palco.classList.add("abrindo-cam"); abrirCamera(); }
      else semCamera();
    }).catch(semCamera);
  }
}

// Flash de texto: quadro 1080×1920 com o fundo e a letra escolhidos (vira uma foto JPEG).
function desenharTexto(texto, [a, b], letra, cor, extra = null) {
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
  // figurinhas, fotos por cima e pincel (o mesmo desenho do flash de foto)
  if (extra) { g.save(); g.shadowColor = "transparent"; extra(g, W, H); g.restore(); }
  let q = 0.9, url = c.toDataURL("image/jpeg", q);
  while (url.length > 860000 && q > 0.5) { q -= 0.1; url = c.toDataURL("image/jpeg", q); }
  return url;
}

async function gravar(extraCom, { imagem = null } = {}) {
  const cfg = configFlash();
  const { _publico, ...extra } = extraCom;
  const amigos = _publico === "amigos" && cfg.amigos.length > 0;
  // Escolhas das configurações do Flash vão junto (só o que foge do padrão).
  const escolhas = {
    ...(cfg.respostas !== "todos" ? { respostas: cfg.respostas } : {}),
    ...(amigos ? { publico: "amigos", lista: cfg.amigos.slice(0, 150) } : {}),
    ...(cfg.ocultarDe.length ? { ocultoPara: cfg.ocultarDe.slice(0, 100) } : {})
  };
  const docFlash = { autorId: eu.uid, nome: String(dados.nome || "Usuário").slice(0, 80), ...extra, ...escolhas, criadoEm: fb.serverTimestamp() };
  // Anti-spam: cada flash soma 1 no limite diário (ritmo.js, 50 por dia) na mesma gravação. Com as regras de antes (sem
  // o tipo "flash" no limite), o lote é recusado e o flash vai sozinho, como antes.
  const criar = async (d) => {
    try { return await comRitmo(fb, eu.uid, "flash", (lote) => { const r = fb.doc(fb.collection(fb.db, "stories")); lote.set(r, d); return r; }); }
    catch (e) { if (e?.code !== "permission-denied") throw e; return fb.addDoc(fb.collection(fb.db, "stories"), d); }
  };
  let ref;
  try { ref = await criar(docFlash); }
  catch (e) {
    // Regras ainda sem localização/hashtag tocáveis, menção oculta e cor da enquete: publica sem esses campos (a
    // figurinha continua desenhada na foto; a pessoa oculta sai da lista, mas recebe o aviso do mesmo jeito).
    const antigo = semCamposNovos(docFlash);
    if (e?.code !== "permission-denied" || !antigo) throw e;
    const eraTeste = antigo._eraTeste, semAlvo = antigo._semAlvo, semCt = antigo._semContagem;
    delete antigo._eraTeste; delete antigo._semAlvo; delete antigo._semContagem;
    ref = await criar(antigo);
    setTimeout(() => toast(semCt ? "A contagem regressiva aparece depois da publicação das regras novas (o flash foi sem ela)."
      : semAlvo ? "O público do flash vale depois da publicação das regras novas: este foi para todos."
      : eraTeste ? "O teste foi como enquete: ele passa a funcionar depois da publicação das regras novas." : "Algumas figurinhas ficam tocáveis depois da publicação das regras novas."), 2600);
  }
  avisarFlashNegocio(extra.negocios);
  toast(amigos ? "⚡ Flash publicado para os Amigos próximos." : extra.negocios?.length ? `⚡ Flash publicado${extra.perfil === false ? " só" : ""} ${extra.negocios.length === 1 ? "no perfil do negócio" : `em ${extra.negocios.length} perfis de negócio`}${extra.perfil === false ? "" : " e no seu perfil"}! Fica 24 horas.` : "⚡ Flash publicado! Fica 24 horas.");
  // Quem foi mencionado recebe uma mensagem (como no Instagram).
  (extra.mencoes || []).forEach((u) => mandarMensagem(u, msgFlash({ id: ref.id, autorId: eu.uid, nome: dados.nome }, "mencao"), "Mencionou você no flash").catch(() => {}));
  // Salvar no aparelho (Configurações do Flash).
  if (cfg.salvarAparelho && imagem) { const a = document.createElement("a"); a.href = imagem; a.download = `flash-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.jpg`; document.body.appendChild(a); a.click(); a.remove(); }
  carregar();
  const depois = depoisDePublicar; depoisDePublicar = null;
  try { depois?.(); } catch {}
  return ref;
}

// Cópia do flash sem os campos que as regras antigas recusam (null = não tinha nenhum).
function semCamposNovos(d) {
  const c = { ...d }; let mudou = false;
  if ("toques" in c) { delete c.toques; mudou = true; }
  if (c.mencoesOcultas) {
    const oc = c.mencoesOcultas; delete c.mencoesOcultas; mudou = true;
    const vis = (c.mencoes || []).filter((u) => !oc.includes(u));
    if (vis.length) c.mencoes = vis; else delete c.mencoes;
  }
  if ("alvo" in c) { delete c.alvo; c._semAlvo = true; mudou = true; }
  if ("contagem" in c) { delete c.contagem; c._semContagem = true; mudou = true; }
  ["enquete", "caixa"].forEach((k) => { if (c[k]?.cor) { const { cor, ...resto } = c[k]; c[k] = resto; mudou = true; } });
  // tamanho das figurinhas interativas (k, 09/11/2026): sem as regras novas vão no tamanho de sempre
  ["enquete", "caixa", "link"].forEach((k) => { if (c[k] && "k" in c[k]) { const { k: _k, ...resto } = c[k]; c[k] = resto; mudou = true; } });
  // Teste (quiz) sem as regras novas: vai como enquete comum, com prazo de 24 h.
  if (c.enquete && "certa" in c.enquete) { const { certa, ...resto } = c.enquete; c.enquete = { ...resto, fimEm: c.enquete.fimEm || fb.Timestamp.fromMillis(Date.now() + 864e5) }; c._eraTeste = true; mudou = true; }
  return mudou ? c : null;
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
    arquivo: c.arquivo !== false,                     // guardar os flashes no arquivo depois das 24 h (só você vê)
    cameraDireto: c.cameraDireto !== false,           // abre a câmera do app direto (quando já tem permissão)
    somVideo: c.somVideo === true,                    // vídeos dos flashes começam com som
    modoInicial: c.modoInicial === "texto" ? "texto" : "foto", // o criador abre em Foto ou em Texto
    perguntarRascunho: c.perguntarRascunho !== false, // ao sair com algo feito, pergunta se guarda como rascunho
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
  let meusNeg = null, ativos = null, nRasc = null;
  lerRascunhos().then((l) => { nRasc = l.length; if (corpo.isConnected) pintar(); });
  const pintar = () => {
    const c = configFlash();
    const salvar = async (mud) => { await salvarConfigFlash({ ...configFlash(), ...mud }); pintar(); };
    corpo.replaceChildren();
    const cartao = (ic, cor, titulo, sub) => {
      const k = el("section", "cfg2-card");
      const cab = el("div", "cfg2-cab");
      const t = el("span", "cfg2-ic"); t.appendChild(icone(ic, "i s"));
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
    const k1 = cartao("olho", "#00adee", "Quem vê os seus flashes", "Cada flash começa para todos que seguem você. Para mandar só para os Amigos próximos, toque na estrela verde no alto do criador (vale só para aquele flash).");
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

    // 4) Criar flash: como o criador abre, figurinhas e rascunhos
    const kc = cartao("lapis", "", "Criar flash", "Figurinhas: Enquete, Teste (quiz com a resposta certa), Perguntas, Menção, Link do negócio, Localização, Hashtag, Emoji, Horário e Data. Desfazer e refazer guardam até 40 passos.");
    opcoes(kc, [["foto", "Começar em Foto", "Câmera ou galeria"], ["texto", "Começar em Texto", "Fundo colorido para escrever"]], c.modoInicial, (v) => salvar({ modoInicial: v }));
    kc.append(
      linha("Perguntar antes de sair", "Ao fechar com algo feito: salvar como rascunho, descartar ou continuar. Desligado, fecha e descarta direto", chave(c.perguntarRascunho, (on) => salvar({ perguntarRascunho: on }))),
      linha("Rascunhos", nRasc == null ? "Carregando..." : nRasc ? `${nRasc} ${nRasc === 1 ? "rascunho guardado" : "rascunhos guardados"} neste aparelho (até 10)` : "Nenhum rascunho neste aparelho", seta(), () => {
        fecharLista(); setTimeout(() => abrirRascunhos((rr) => abrirCriador({ rascunho: rr })), 280);
      })
    );
    if (nRasc) {
      const ap = el("button", "btn sec mini", "Apagar todos os rascunhos"); ap.type = "button";
      ap.addEventListener("click", async () => {
        if (!await confirmarHF({ titulo: "Apagar todos os rascunhos?", texto: `Os ${nRasc} rascunhos deste aparelho somem. Não dá para desfazer.`, ok: "Apagar", icone: "lixo" })) return;
        for (const x of await lerRascunhos()) await apagarRascunho(x.id).catch(() => {});
        nRasc = 0; toast("Rascunhos apagados"); pintar();
      });
      const w = el("div", "cfg2-acoes"); w.appendChild(ap); kc.appendChild(w);
    }

    // 5) Respostas e reações
    const k3 = cartao("chat", "#7c5cff", "Respostas e reações", "Respostas e reações chegam no Mensagens como cartão do flash. Votos da enquete, respostas do teste e da caixa de perguntas ficam na Atividade do flash (toque em Visualizações).");
    opcoes(k3, [["todos", "Todos que veem"], ["seguindo", "Só quem você segue"], ["ninguem", "Ninguém", "Desliga respostas e reações"]], c.respostas, (v) => salvar({ respostas: v }));

    // 5) Câmera e vídeo
    const k4 = cartao("camera", "#ff3d7f", "Câmera e vídeo");
    k4.append(
      linha("Abrir a câmera direto", "Ao criar um flash, já abre a câmera do app (se você deu permissão)", chave(c.cameraDireto, (on) => salvar({ cameraDireto: on }))),
      linha("Vídeos com som", "Os vídeos dos flashes começam com o som ligado", chave(c.somVideo, (on) => salvar({ somVideo: on })))
    );

    // 6) Arquivo, destaques e salvar no aparelho
    const k5 = cartao("relogio", "", "Arquivo e destaques", "Depois de 24 horas o flash sai do Diário e fica guardado no seu arquivo. Só você vê o arquivo.");
    k5.append(
      linha("Guardar no arquivo", "Desligado, os flashes são apagados depois de 24 horas (menos os que estão num destaque)", chave(c.arquivo, (on) => salvar({ arquivo: on }))),
      linha("Ver o arquivo", "Seus flashes antigos, para ver de novo ou pôr num destaque", seta(), () => { fecharLista(); setTimeout(() => abrirArquivo(), 280); }),
      linha("Novo destaque", "Junte flashes num destaque do seu perfil (fica para sempre)", seta(), () => { fecharLista(); setTimeout(() => novoDestaque(), 280); }),
      linha("Salvar no aparelho", "Guarda uma cópia de cada flash de foto ou texto que você publicar", chave(c.salvarAparelho, (on) => salvar({ salvarAparelho: on })))
    );

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
  flashesNoArDe(eu.uid).then((docs) => {
    ativos = docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })).filter(ativo).sort((a, b) => ms(a.criadoEm) - ms(b.criadoEm));
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
// lista: flashes dados à parte (um destaque, o arquivo); destaque: {id, nome, uid} mostra o nome dele no topo.
// Abrir um perfil de uma folha por cima do flash (Visualizações, respostas, mencionados): passa pelo visor, que
// cuida de o "voltar" trazer o flash de novo.
function perfilDoFlash(uid) {
  const v = document.querySelector(".story-visor");
  if (v?._irParaPerfil) v._irParaPerfil(uid); else ganchos.abrirPerfil(uid);
}
function abrirVisor(uidInicial, { so = false, aoFechar = null, comecarEm = null, lista = null, destaque = null, negocio = null, aoVitrine = null } = {}) {
  const mapa = lista ? new Map([[uidInicial, lista]]) : porAutor;
  const ordem = so || lista ? [uidInicial] : [eu.uid, ...ordemAutores()].filter((u) => mapa.get(u)?.length);
  let ai = Math.max(0, ordem.indexOf(uidInicial)), si = 0;
  // Começa no primeiro flash ainda não visto desse autor.
  const inicioDo = (u) => { if (lista) return 0; const l = mapa.get(u) || []; const k = l.findIndex((x) => !vistosLocal.has(x.id)); return k < 0 ? 0 : k; };
  si = inicioDo(ordem[ai]);
  if (comecarEm) { const k = (mapa.get(ordem[ai]) || []).findIndex((x) => x.id === comecarEm); if (k >= 0) si = k; }
  // Segurar o flash pausa (não abre o menu do navegador de "baixar imagem"; para salvar há o ⋯ → Salvar foto).
  const fundo = el("div", "story-visor"); fundo.addEventListener("contextmenu", (e) => { if (!e.target.closest("input, textarea, a")) e.preventDefault(); }); fundo.setAttribute("role", "dialog"); fundo.setAttribute("aria-modal", "true"); fundo.setAttribute("aria-label", "Flash");
  fundo._flashAtual = () => (lista ? null : atual());
  // Aberto de dentro de uma folha (ex.: foto de outra pessoa no perfil, na página de perfis): fica por cima dela
  // (antes abria por baixo do perfil e parecia que nada acontecia); folhas abertas depois continuam por cima do flash.
  const zFolhas = Math.max(0, ...[...document.querySelectorAll(".folha.aberta")].map((f) => Number(f.style.zIndex) || 5000));
  if (zFolhas) fundo.style.zIndex = String(zFolhas + 1);
  const caixa = el("div", "story-caixa");
  const barras = el("div", "story-barras");
  const topo = el("div", "story-topo");
  const av = el("span", "avatar"); const nome = el("strong"); const quando = el("small");
  const bSom = el("button", "story-btn"); bSom.type = "button"; bSom.setAttribute("aria-label", "Ligar o som"); bSom.textContent = "🔇"; bSom.hidden = true;
  const bMais = el("button", "story-btn"); bMais.type = "button"; bMais.setAttribute("aria-label", "Opções"); bMais.appendChild(icone("pontos", "i s"));
  const bX = el("button", "story-btn"); bX.type = "button"; bX.setAttribute("aria-label", "Fechar"); bX.appendChild(icone("fechar", "i s"));
  const quem = el("div", "story-quem"); const txtQuem = el("div");
  // Como no Instagram: o tempo fica na mesma linha do nome ("Ana  3 h").
  const linhaNome = el("div", "story-nome"); linhaNome.append(nome, quando); // sem o selo "Flash" (pedido dele: já se sabe que é um flash)
  txtQuem.className = "story-quem-tx";
  // As linhas extras ("Flash de X", "Também em 1 negócio") ficam penduradas embaixo do nome, sem empurrar o nome para
  // cima: ele fica sempre na altura da foto (pedido de 02/11).
  const subQuem = el("div", "story-quem-sub");
  txtQuem.append(linhaNome, subQuem); quem.append(av, txtQuem);
  // Foto e nome abrem o perfil de quem publicou (como no Instagram).
  [av, nome].forEach((x) => {
    x.classList.add("story-vai-perfil"); x.setAttribute("role", "link"); x.tabIndex = 0;
    ["pointerdown", "pointerup"].forEach((ev) => x.addEventListener(ev, (e) => e.stopPropagation()));
    // No perfil de um negócio, a foto e o nome são do negócio: abrem o perfil dele.
    x.addEventListener("click", (e) => { e.stopPropagation(); if (negocio?.id && PAGINA_NEGOCIO[negocio.tipo]) { location.href = linkNegocio({ negocioId: negocio.id, tipo: negocio.tipo }); return; } const s = atual(); if (s?.autorId) irParaPerfil(s.autorId); });
    x.addEventListener("keydown", (e) => { if (e.key === "Enter") x.click(); });
  });
  // Enviar o flash para alguém (vai como cartão no Mensagens)
  const bEnv = el("button", "story-btn"); bEnv.type = "button"; bEnv.setAttribute("aria-label", "Enviar este flash"); bEnv.title = "Enviar"; bEnv.appendChild(icone("enviar", "i s"));
  topo.append(quem, bSom, bEnv, bMais, bX);
  const palco = el("div", "story-palco");
  const legenda = el("div", "story-legenda");
  const rodape = el("div", "story-rodape");
  const esq = el("button", "story-toque esq"); esq.type = "button"; esq.setAttribute("aria-label", "Anterior");
  const dir = el("button", "story-toque dir"); dir.type = "button"; dir.setAttribute("aria-label", "Próximo");
  // O flash fica num quadro 9:16 (a imagem inteira, sem cortar as laterais, como foi feita no criador); as figurinhas
  // interativas vão dentro do quadro, no mesmo lugar e no mesmo tamanho do criador. No celular comprido, o campo de
  // responder fica embaixo do quadro (como no Instagram), e não por cima da foto.
  const quadro = el("div", "story-quadro");
  quadro.append(palco, el("div", "story-sombra"), legenda);
  caixa.append(quadro, esq, dir, barras, topo, rodape);
  fundo.appendChild(caixa);
  document.body.appendChild(fundo);
  setTimeout(tirarCapa, 120);
  // Teclado aberto (responder, caixa de perguntas): o quadro NÃO encolhe junto com a tela (antes o flash diminuía e
  // a enquete e as perguntas se embolavam). O tamanho fica preso enquanto um campo está em uso; o teclado cobre
  // a parte de baixo, e o campo de responder sobe junto com a tela.
  const toqueVisor = matchMedia("(pointer: coarse)").matches;
  const campoAtivo = () => { const a = document.activeElement; return !!a && fundo.contains(a) && a.matches("input, textarea"); };
  fundo.addEventListener("focusin", (e) => {
    if (!toqueVisor || !e.target.matches?.("input, textarea") || caixa.classList.contains("teclado-preso")) return;
    quadro.style.width = quadro.offsetWidth + "px"; quadro.style.height = quadro.offsetHeight + "px";
    caixa.classList.add("teclado-preso");
  });
  fundo.addEventListener("focusout", () => setTimeout(() => {
    if (campoAtivo() || !caixa.classList.contains("teclado-preso")) return;
    quadro.style.width = ""; quadro.style.height = ""; caixa.classList.remove("teclado-preso");
    window.dispatchEvent(new Event("resize"));
  }, 250));
  document.body.classList.add("travado");
  let timer = null, inicio = 0, restante = 0, pausado = false, video = null, digitando = false, fechado = false;
  const fechar = () => {
    if (fechado) return; fechado = true;
    clearTimeout(timer); cancelAnimationFrame(rafBarra); video?.pause(); fundo.remove(); document.body.classList.remove("travado");
    document.removeEventListener("keydown", tecla, true); document.removeEventListener("visibilitychange", aoEsconder);
    window.removeEventListener("resize", reencaixar);
    pintarBarra(); if (!vaiReabrir) aoFechar?.();
  };
  let vaiReabrir = false; // fechou só para abrir um perfil na mesma página: volta depois (o aoFechar fica para o fim)
  const atual = () => mapa.get(ordem[ai])?.[si];
  // Abrir um perfil de dentro do flash: guarda o flash para o "voltar" trazer ele de novo (se a página mudar).
  // Na página de perfis o perfil abre ali mesmo (sem trocar de página): não precisa.
  // Outra página: o flash fica aberto (pausado) enquanto a página muda — antes ele fechava primeiro e o passo do
  // histórico era desfeito junto com a troca de página (no celular o "voltar" não achava mais o flash).
  // Página de perfis (o perfil abre numa folha ali mesmo): fechar o perfil (voltar ou X) reabre este mesmo flash,
  // também nos destaques.
  const irParaPerfil = (uid) => {
    if (!uid) return;
    const s = atual();
    if (!/usuarios\.html$/.test(location.pathname)) {
      const navegar = () => { pausar(true); if (!lista) lembrarFlash(s); ganchos.abrirPerfil(uid); };
      // Veio de uma lista por cima do flash (Mencionados, Visualizações...): fecha a lista e espera o passo dela sair
      // do histórico antes de trocar de página, para o "voltar" cair direto no flash.
      if (document.getElementById("folhaLista")?.classList.contains("aberta")) fecharFolha("folhaLista");
      if ((history.state?.hfCamadas || 0) > 1) {
        let feito = false;
        const ir = () => { if (feito) return; feito = true; removeEventListener("popstate", ir); setTimeout(navegar, 0); };
        addEventListener("popstate", ir); setTimeout(ir, 500);
      } else navegar();
      return;
    }
    vaiReabrir = !!s?.id && uid !== eu.uid && !!document.getElementById("folhaPerfil");
    if (document.getElementById("folhaLista")?.classList.contains("aberta")) fecharFolha("folhaLista");
    fechar(); ganchos.abrirPerfil(uid);
    const fp = document.getElementById("folhaPerfil");
    if (!s?.id || uid === eu.uid || !fp) return;
    const reabrir = () => { fp.removeEventListener("fechada", reabrir); setTimeout(() => abrirVisor(ordem[ai], { so, aoFechar, comecarEm: s.id, lista, destaque, negocio }), 60); };
    fp.addEventListener("fechada", reabrir);
  };
  fundo._irParaPerfil = irParaPerfil;

  // Rodapé de quem vê: responder (vai para o Mensagens) e reações rápidas.
  const form = el("form", "story-responder");
  const campo = el("input"); campo.type = "text"; campo.maxLength = 300; campo.setAttribute("aria-label", "Responder");
  const bEnviar = el("button", "story-env"); bEnviar.type = "submit"; bEnviar.setAttribute("aria-label", "Enviar"); bEnviar.appendChild(icone("enviar", "i s"));
  // Estrela: curtir o flash (antes era um raio que mandava uma reação pelo Mensagens).
  const bEstrela = el("button", "story-raio story-estrela"); bEstrela.type = "button"; bEstrela.setAttribute("aria-label", "Dar uma estrela");
  // Estrela própria (o ícone do site é sempre cheio): só o contorno quando apagada, cheia e dourada quando dada.
  bEstrela.innerHTML = '<svg class="i est-curtir" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8z"/></svg>';
  form.append(campo, bEnviar, bEstrela);
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
    const s = atual();
    // A reação vai pelo Mensagens (como no Instagram) e fica na lista de visualizações do autor.
    if (s) gravarReacao(s, { emoji: r }).catch(() => {});
    if (await enviarResposta("reacao", { emoji: r }, `Reagiu ao seu flash: ${r}`)) toast("Reação enviada");
  }
  const pintarEstrela = () => {
    const s = atual(), on = !!s && curtidos.has(s.id);
    bEstrela.classList.toggle("on", on); bEstrela.setAttribute("aria-pressed", String(on));
    bEstrela.setAttribute("aria-label", on ? "Tirar a estrela" : "Dar uma estrela");
  };
  function estrelaVoa() {
    const e = el("span", "story-estrela-voa"); e.appendChild(icone("estrela", "i"));
    caixa.appendChild(e); setTimeout(() => e.remove(), 900);
  }
  // Sem as regras novas a estrela vai pelo Mensagens: uma vez por flash (tirar e dar de novo não manda outra).
  const estrelaAvisada = new Set();
  async function curtir() {
    const s = atual(); if (!s || s.autorId === eu.uid) return;
    const vai = !curtidos.has(s.id);
    if (vai) curtidos.add(s.id); else curtidos.delete(s.id);
    guardarCurtidos(); pintarEstrela();
    if (vai) { estrelaVoa(); navigator.vibrate?.(10); }
    try { await gravarReacao(s, { curtiu: vai }); }
    catch (e) {
      // Regras antigas (sem reacoes): a estrela vai como reação pelo Mensagens, para o autor saber.
      if (e?.code === "permission-denied") {
        if (vai && !estrelaAvisada.has(s.id)) { estrelaAvisada.add(s.id); enviarResposta("reacao", { emoji: "⭐" }, "Deu uma estrela no seu flash ⭐"); }
        return;
      }
      if (vai) curtidos.delete(s.id); else curtidos.add(s.id);
      guardarCurtidos(); pintarEstrela(); toast("Não foi possível: " + erroAmigavel(e));
    }
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
  bEstrela.addEventListener("click", (e) => { e.stopPropagation(); curtir(); });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const t = campo.value.trim(); if (!t) return;
    bEnviar.disabled = true;
    if (await enviarResposta("resposta", { texto: t.slice(0, 300) }, `Respondeu ao seu flash: ${t}`)) { campo.value = ""; toast("Resposta enviada pelo Mensagens"); campo.blur(); }
    bEnviar.disabled = false;
  });
  campo.addEventListener("focus", () => { digitando = true; caixa.classList.add("digitando"); pausar(true); });
  campo.addEventListener("blur", () => { digitando = false; setTimeout(() => { if (!digitando) { caixa.classList.remove("digitando"); pausar(false); } }, 150); });

  // Figurinha interativa (enquete, perguntas): desenhada numa largura fixa e escalada para ocupar a mesma fração do
  // quadro que ocupava no criador (74%); o centro fica onde a pessoa pôs, sem cobrir o nome em cima nem o rodapé.
  const LARG_FIG = 300, FRAC_FIG = 0.74;
  // Onde as figurinhas param embaixo: a faixa de sempre e, se o rodapé ficou por cima da foto, 10 px acima dele.
  let topoRodape = Infinity;
  const baixoFig = (H) => Math.min(H - Math.max(H * 0.1, 70), topoRodape - 10);
  // escala: o tamanho que o autor escolheu com dois dedos (k, 0,6 a 1,3; sem = 1)
  function encaixar(w, fx, fy, escala) {
    w.dataset.fx = fx; w.dataset.fy = fy;
    if (escala !== undefined) w.dataset.k = Math.min(1.3, Math.max(0.6, Number(escala) || 1));
    const ke = Number(w.dataset.k || 1);
    const W = quadro.offsetWidth, H = quadro.offsetHeight; if (!W || !H) return;
    const k = ((W * FRAC_FIG) / LARG_FIG) * ke;
    w.style.width = LARG_FIG + "px"; w.style.setProperty("--k", k.toFixed(4));
    const h = w.offsetHeight * k, lw = W * FRAC_FIG * ke;
    const cima = H * 0.11 + h / 2, baixo = baixoFig(H) - h / 2;
    const cy = Math.min(Math.max(fy * H, cima), Math.max(cima, baixo));
    const cx = Math.min(Math.max(fx * W, lw / 2 + 6), W - lw / 2 - 6);
    w.style.left = cx + "px"; w.style.top = cy + "px";
    w._cy = cy; w._h = h;
    agendarSeparar();
    if (window.ResizeObserver && !w._ro) { w._ro = new ResizeObserver(() => { if (w.parentElement === quadro) encaixar(w, Number(w.dataset.fx), Number(w.dataset.fy)); }); w._ro.observe(w); }
  }
  // Duas figurinhas interativas no mesmo flash (enquete + perguntas, contagem...) podiam ficar uma por cima da outra
  // (no visor a altura de cada uma é a real, maior que a prévia do criador, e os limites são os do quadro). Aqui elas
  // ficam empilhadas com 10 px entre elas, na ordem de cima para baixo em que foram postas; se não cabem embaixo,
  // o grupo sobe.
  let separarQuadro = 0;
  function agendarSeparar() { if (!separarQuadro) separarQuadro = requestAnimationFrame(separar); }
  function separar() {
    separarQuadro = 0;
    const W = quadro.offsetWidth, H = quadro.offsetHeight; if (!W || !H) return;
    const l = [];
    for (const w of quadro.children) {
      if (w.classList?.contains("story-enq") && Number.isFinite(w._cy)) l.push({ w, cy: w._cy, h: w._h, cx: parseFloat(w.style.left) || W / 2, w2: W * FRAC_FIG });
      else if (w.matches?.("a.story-link:not(.story-post)") && w.dataset.fy) l.push({ w, cy: Number(w.dataset.fy) * H, h: w.offsetHeight, cx: Number(w.dataset.fx) * W, w2: w.offsetWidth });
    }
    if (!l.length) return;
    empilhar(l.map((x) => Object.assign(x, { w: x.w2, el: x.w })), H * 0.11, baixoFig(H))
      .forEach((x) => { x.el.style.top = x.cy + "px"; });
  }
  // Rodapé organizado: cada linha (Mencionados, Visualizações/Destacar, campo de responder) fica INTEIRA embaixo da
  // foto ou INTEIRA por cima dela, 10 px acima da beirada; nunca metade dentro, metade fora (o tamanho da foto muda com
  // o celular e com a barra do navegador). Medido pelo layout (offsetTop/offsetHeight): durante a animação de abrir e o
  // giro do cubo o visor está com transform e o getBoundingClientRect dava números errados.
  // `topoRodape` = onde (no quadro) começa o que do rodapé ficou por cima da foto: as figurinhas param acima dele.
  function organizarRodape() {
    const filhos = [...rodape.children].filter((c) => getComputedStyle(c).position !== "absolute");
    filhos.forEach((c) => { c.style.marginBottom = ""; });
    const Hq = quadro.offsetHeight, qb = quadro.offsetTop + quadro.offsetHeight, Hc = caixa.offsetHeight;
    if (!Hq || !Hc) return;
    const limite = Hc - qb; // distância do fim da tela até a beirada de baixo da foto
    const cs = getComputedStyle(rodape), gap = parseFloat(cs.rowGap) || 0;
    let pos = parseFloat(cs.paddingBottom) || 0, maisAlto = 0;
    for (let i = filhos.length - 1; i >= 0; i--) {
      const c = filhos[i], h = c.offsetHeight; if (!h) continue;
      // cortaria a beirada (ou ficaria colada nela): sobe para dentro da foto
      if (pos < limite + 10 && pos + h > limite - 6) { const extra = Math.ceil(limite + 10 - pos); c.style.marginBottom = extra + "px"; pos += extra; }
      if (pos + h > limite) maisAlto = Math.max(maisAlto, pos + h);
      pos += h + gap;
    }
    const novo = maisAlto ? Hq - (maisAlto - limite) : Infinity;
    if (novo !== topoRodape) { topoRodape = novo; quadro.querySelectorAll(".story-enq").forEach((w) => encaixar(w, Number(w.dataset.fx), Number(w.dataset.fy))); agendarSeparar(); }
  }
  // Refaz quando o visor muda de tamanho (teclado, girar o celular, barra do navegador) ou o rodapé muda.
  try { const ro = new ResizeObserver(() => organizarRodape()); ro.observe(caixa); ro.observe(rodape); } catch {}
  const reencaixar = () => { quadro.querySelectorAll(".story-enq").forEach((w) => encaixar(w, Number(w.dataset.fx), Number(w.dataset.fy))); organizarRodape(); };
  // ---------- responder a caixa de perguntas em foco ----------
  let focoCx = null;
  function medirFoco() {
    if (!focoCx) return;
    const vv = window.visualViewport;
    focoCx.style.top = (vv ? vv.offsetTop : 0) + "px";
    focoCx.style.height = (vv ? vv.height : innerHeight) + "px";
    const w = focoCx.firstElementChild; if (!w) return;
    const k = Math.min(1.12, (Math.min(innerWidth, 420) * 0.9) / LARG_FIG);
    w.style.setProperty("--k", k.toFixed(4));
  }
  function focarCaixa(w, t) {
    if (focoCx) return;
    focoCx = el("div", "story-cx-foco");
    focoCx.addEventListener("pointerdown", (e) => { if (e.target === focoCx) { e.preventDefault(); t.blur(); soltarCaixa(w, true); } });
    ["pointerup", "click"].forEach((ev) => focoCx.addEventListener(ev, (e) => e.stopPropagation()));
    w.classList.add("em-foco");
    focoCx.appendChild(w); fundo.appendChild(focoCx);
    caixa.classList.add("cx-foco");
    medirFoco();
    window.visualViewport?.addEventListener("resize", medirFoco);
    window.visualViewport?.addEventListener("scroll", medirFoco);
    requestAnimationFrame(() => { if (document.activeElement !== t) t.focus({ preventScroll: true }); });
  }
  function soltarCaixa(w, ja = false) {
    if (!focoCx || (!ja && w.contains(document.activeElement))) return;
    window.visualViewport?.removeEventListener("resize", medirFoco);
    window.visualViewport?.removeEventListener("scroll", medirFoco);
    w.classList.remove("em-foco");
    if (!fechado && w.isConnected) { quadro.appendChild(w); encaixar(w, Number(w.dataset.fx), Number(w.dataset.fy)); }
    focoCx.remove(); focoCx = null;
    caixa.classList.remove("cx-foco");
  }
  window.addEventListener("resize", reencaixar);
  function mostrar(dirAnim = 0) {
    if (fechado) return;
    clearTimeout(timer); video?.pause(); video = null;
    const lista = mapa.get(ordem[ai]) || [];
    const s = lista[si]; if (!s) { fechar(); return; }
    const meu = s.autorId === eu.uid;
    // Flash guardado só com o id: baixa agora (rodinha no lugar da foto) e mostra; se sumiu/venceu, pula.
    if (s._leve) {
      clearTimeout(timer);
      const r = el("div", "story-lendo"); r.append(el("span", "story-roda"));
      palco.replaceChildren(r);
      carregarFlash(s).then((ok) => { if (fechado || atual() !== s) return; if (!ok) { pularFlash(s, false); return; } mostrar(dirAnim); });
      return;
    }
    // Flash de uma publicação que foi apagada: o seu sai junto; o de outra pessoa é pulado (confere uma vez).
    if (s.postDe?.postId && s._postOk === undefined) {
      clearTimeout(timer); palco.replaceChildren();
      publicacaoExiste(s.postDe.postId).then((ok) => { s._postOk = ok; if (!fechado && atual() === s) mostrar(dirAnim); });
      return;
    }
    if (s._postOk === false) { pularFlash(s, meu); return; }
    // Repost (quem foi marcado pôs no flash dele): as figurinhas do flash ORIGINAL vão junto e continuam funcionando
    // (votar na enquete, responder a caixa, lembrete da contagem, link, lugar, # e @). Os votos e as respostas contam
    // no original, como no Instagram. Lê o original uma vez.
    if (s.repostDe?.storyId && s._orig === undefined) {
      clearTimeout(timer); palco.replaceChildren();
      fb.getDoc(fb.doc(fb.db, "stories", s.repostDe.storyId)).then((d) => { s._orig = d.exists() ? { id: d.id, ...d.data({ serverTimestamps: "estimate" }) } : null; })
        .catch(() => { s._orig = null; }).finally(() => { if (!fechado && atual() === s) mostrar(dirAnim); });
      return;
    }
    pausado = false; caixa.classList.remove("pausado");
    // O próximo flash (desta pessoa ou o 1º não visto da próxima) já vem por trás.
    adiantar(lista[si + 1] || (ordem[ai + 1] ? (mapa.get(ordem[ai + 1]) || [])[inicioDo(ordem[ai + 1])] : null));
    if (dirAnim && !semEntrada) entrarCubo(dirAnim);
    semEntrada = false;
    barras.replaceChildren(...lista.map((_, k) => { const b = el("span", "story-barra"); const i = el("i"); if (k < si) i.style.width = "100%"; b.appendChild(i); return b; }));
    obterPerfil(s.autorId).then((p) => {
      // Flash no perfil de um negócio (como no Instagram): o topo mostra o negócio e, embaixo, quem publicou.
      if (negocio) {
        nome.textContent = negocio.nome || "Negócio";
        pintarAvatar(av, negocio.foto, negocio.nome);
        subQuem.querySelector(".story-por")?.remove();
        subQuem.prepend(el("span", "story-por", meu ? "Publicado por você" : `por ${String(p.nome || s.nome || "").split(" ")[0] || "quem cuida do negócio"}`));
      } else {
        nome.textContent = destaque ? destaque.nome : meu ? "Seu flash" : (p.nome || s.nome || "Usuário");
        pintarAvatar(av, p.fotoPerfil, p.nome || s.nome);
      }
      campo.placeholder = `Responder a ${String((negocio ? negocio.nome : "") || p.nome || s.nome || "").split(" ")[0] || "esta pessoa"}...`;
    }).catch(() => { nome.textContent = negocio?.nome || s.nome || "Usuário"; });
    // Destaque e arquivo: a data do flash ("12 out"); no ar: há quanto tempo ("3 h").
    quando.textContent = destaque || !ativo(s) ? dataCurta(ms(s.criadoEm)) : tempoRelativo(new Date(ms(s.criadoEm) || Date.now()));
    palco.replaceChildren();
    // Legenda com @ e # tocáveis (abrem o perfil e a hashtag).
    comMencoes(legenda, s.texto || "", irParaPerfil); legenda.hidden = !s.texto;
    legenda.querySelectorAll("a").forEach((a) => { ["pointerdown", "pointerup"].forEach((ev) => a.addEventListener(ev, (e) => e.stopPropagation())); a.addEventListener("click", () => pausar(true)); });
    rodape.replaceChildren();
    form.appendChild(bEstrela); pintarEstrela();
    // Sem o campo de responder (respostas desligadas), a estrela fica sozinha no rodapé.
    const estrelaSozinha = () => { const w = el("div", "story-so-estrela"); w.appendChild(bEstrela); rodape.appendChild(w); };
    // Enquete por cima do flash, no lugar escolhido (quem vê vota; o autor vê o resultado).
    caixa.querySelector(".story-enq")?.remove();
    const fig = figurinhasDe(s);
    const enq = fig.enquete ? blocoEnquete(fig.enquete, { tipo: "f", escura: true }) : null;
    // No seu flash, "Ver votos" e "N respostas · ver" abrem a atividade do flash na aba certa (como no Instagram).
    const paraAtividade = (w) => w.addEventListener("click", (e) => {
      const b = e.target.closest(".cx-ver, .enq-ver"); if (!b || !meu) return;
      e.stopPropagation(); e.preventDefault(); pausar(true);
      verQuemViu(s, () => pausar(false), mapa.get(eu.uid), irPara, { aoApagar: tirarDaLista, aba: b.matches(".cx-ver") ? "respostas" : "enquete" });
    }, true);
    if (enq) {
      const w = el("div", "story-enq"); if (fig.enquete === s) paraAtividade(w);
      w.appendChild(enq); quadro.appendChild(w); encaixar(w, fig.enquete.enquete.x ?? 0.5, fig.enquete.enquete.y ?? 0.6, fig.enquete.enquete.k);
      ["pointerdown", "pointerup", "click"].forEach((ev) => w.addEventListener(ev, (e) => e.stopPropagation()));
    }
    // Caixa de perguntas por cima do flash (quem vê responde; o autor vê as respostas).
    // Contagem regressiva: números andando; quem vê toca em "Lembrar-me"; o autor vê quem pediu lembrete.
    caixa.querySelector(".story-ct")?.remove();
    if (fig.contagem) ((s) => {
      const meu = s.autorId === eu.uid; // contagem do original (repost): o autor é quem criou
      const fimMs = ms(s.contagem.fim);
      const card = cartaoContagem({ titulo: s.contagem.titulo, fim: fimMs, cor: s.contagem.cor });
      const w = el("div", "story-enq story-ct");
      w.appendChild(card); quadro.appendChild(w); encaixar(w, s.contagem.x ?? 0.5, s.contagem.y ?? 0.32, s.contagem.k);
      ["pointerdown", "pointerup", "click"].forEach((ev) => w.addEventListener(ev, (e) => e.stopPropagation()));
      if (meu) {
        const q = el("button", "ctg-lembrar quem"); q.type = "button"; q.append(icone("sino", "i xs"), el("span", null, "Lembretes…"));
        card._acoes.appendChild(q);
        const consulta = fb.query(fb.collection(fb.db, "contagem_lembretes"), fb.where("flashId", "==", s.id), fb.where("autorId", "==", eu.uid));
        fb.getCountFromServer(consulta).then((c) => { const n = c.data().count; q.lastChild.textContent = n ? `${n} ${n === 1 ? "pessoa pediu" : "pessoas pediram"} lembrete` : "Ninguém pediu lembrete ainda"; q.disabled = !n; }).catch(() => { q.lastChild.textContent = "Lembretes depois das regras novas"; q.disabled = true; });
        q.addEventListener("click", async () => {
          pausar(true);
          const corpo = abrirLista("Pediram lembrete");
          const f = $("folhaLista"); const volta = () => { f?.removeEventListener("fechada", volta); if (document.querySelector(".story-visor")) document.body.classList.add("travado"); pausar(false); }; f?.addEventListener("fechada", volta);
          corpo.replaceChildren(el("div", "lista-vazia", "Carregando..."));
          const l = await fb.getDocs(fb.query(consulta, fb.limit(200))).catch(() => ({ docs: [] }));
          const ps = await Promise.all(l.docs.map((d) => obterPerfil(d.data().uid).then((p) => ({ uid: d.data().uid, ...p })).catch(() => ({ uid: d.data().uid }))));
          corpo.replaceChildren(...(ps.length ? ps.map((p) => linhaPessoa({ uid: p.uid, nome: p.nome || "Usuário", foto: p.fotoPerfil, sub: p.nickname ? "@" + p.nickname : "", semSeguir: true, aoClicar: () => perfilDoFlash(p.uid) })) : [el("div", "lista-vazia", "Ninguém pediu lembrete ainda.")]));
        });
      } else if (fimMs > Date.now()) {
        const lref = fb.doc(fb.db, "contagem_lembretes", `${s.id}_${eu.uid}`);
        const b = el("button", "ctg-lembrar"); b.type = "button";
        let on = false, ocupado = false;
        const pintarB = () => { b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); b.replaceChildren(icone(on ? "check" : "sino", "i xs"), document.createTextNode(on ? "Vou lembrar você" : "Lembrar-me")); };
        pintarB();
        card._acoes.appendChild(b);
        fb.getDoc(lref).then((d) => { on = d.exists(); pintarB(); }).catch(() => {});
        b.addEventListener("click", async () => {
          if (ocupado) return; ocupado = true;
          try {
            if (on) { await fb.deleteDoc(lref); on = false; toast("Lembrete desligado"); }
            else {
              await fb.setDoc(lref, { flashId: s.id, autorId: s.autorId, uid: eu.uid, titulo: s.contagem.titulo, fim: s.contagem.fim, criadoEm: fb.serverTimestamp() });
              on = true; navigator.vibrate?.(10);
              toast(`Pronto! Avisamos você quando “${s.contagem.titulo}” acabar.`);
            }
            pintarB();
          } catch (e) { toast(e?.code === "permission-denied" ? "O lembrete começa a funcionar quando as regras novas forem publicadas." : "Não foi possível: " + erroAmigavel(e)); }
          finally { ocupado = false; }
        });
      }
    })(fig.contagem);
    caixa.querySelector(".story-cx")?.remove();
    const cx = fig.caixa ? blocoCaixa(fig.caixa, { tipo: "f", escura: true }) : null;
    if (cx) {
      const w = el("div", "story-enq story-cx"); if (fig.caixa === s) paraAtividade(w);
      w.appendChild(cx); quadro.appendChild(w); encaixar(w, fig.caixa.caixa.x ?? 0.5, fig.caixa.caixa.y ?? 0.42, fig.caixa.caixa.k);
      ["pointerdown", "pointerup", "click", "keydown"].forEach((ev) => w.addEventListener(ev, (e) => e.stopPropagation()));
      // escrever a resposta (ou abrir as respostas) pausa o flash
      const t = cx.querySelector("textarea");
      t?.addEventListener("focus", () => { digitando = true; pausar(true); focarCaixa(w, t); });
      t?.addEventListener("blur", () => { digitando = false; setTimeout(() => { if (!digitando) pausar(false); soltarCaixa(w); }, 200); });
      // Toque no campo: a caixa sai do lugar dela e vai para o meio da parte que o teclado deixa à vista (antes, com a
      // caixa embaixo, o teclado cobria e o campo de responder subia por cima de tudo).
      t?.addEventListener("pointerdown", (e) => { if (w.parentElement === quadro) { e.preventDefault(); focarCaixa(w, t); } });
      cx.querySelector(".cx-ver")?.addEventListener("click", () => {
        pausar(true);
        const f = $("folhaLista"); const volta = () => { f?.removeEventListener("fechada", volta); if (document.querySelector(".story-visor")) document.body.classList.add("travado"); pausar(false); }; f?.addEventListener("fechada", volta);
      });
    }
    // Uma linha só para "1 pessoa mencionada" e "Adicionar ao seu flash" (não empilham por cima da foto).
    const linhaAcoes = () => rodape.querySelector(".story-linha-acoes") || rodape.appendChild(el("div", "story-linha-acoes"));
    // Repost: sem o selo "⚡ Flash de X" no topo (pedido dele, 02/11/2026).
    topo.querySelector(".story-repost")?.remove();
    // Também nos perfis de negócio (o dono escolheu ao publicar)
    topo.querySelector(".story-onde")?.remove();
    // Visto pelo perfil de um negócio, só quem publicou vê onde mais o flash saiu (para quem visita é informação demais).
    if (Array.isArray(s.negocios) && s.negocios.length && (!negocio || meu)) {
      // Uma linha curta; tocar abre a lista dos negócios (cada um leva ao perfil dele).
      const n = s.negocios.length;
      const outros = negocio ? s.negocios.filter((id) => id !== negocio.id).length + (s.perfil === false ? 0 : 1) : 0;
      const texto = negocio ? (outros ? `Também em mais ${outros} ${outros === 1 ? "lugar" : "lugares"}` : "Só neste negócio")
        : `${s.perfil === false ? "Só em" : "Também em"} ${n === 1 ? "1 negócio" : `${n} negócios`}`;
      const o = el("button", "story-repost story-onde"); o.type = "button";
      o.append(icone("loja", "i xs"), el("span", null, texto), icone("avancar", "i xs"));
      o.setAttribute("aria-label", `Publicado também em ${n} ${n === 1 ? "perfil de negócio" : "perfis de negócio"}: ver quais`);
      ["pointerdown", "pointerup"].forEach((ev) => o.addEventListener(ev, (e) => e.stopPropagation()));
      o.addEventListener("click", async (e) => {
        e.stopPropagation(); pausar(true);
        const corpo = abrirLista(n === 1 ? "Também neste negócio" : "Também nestes negócios");
        const f = $("folhaLista");
        const volta = () => { f?.removeEventListener("fechada", volta); if (document.querySelector(".story-visor")) document.body.classList.add("travado"); pausar(false); };
        f?.addEventListener("fechada", volta);
        corpo.replaceChildren(el("div", "lista-vazia", "Carregando..."));
        const docs = await Promise.all(s.negocios.map((id) => fb.getDoc(fb.doc(fb.db, "negocios", id)).then((d) => (d.exists() ? { id, ...d.data() } : null)).catch(() => null)));
        const l = docs.filter(Boolean);
        corpo.replaceChildren(...(l.length ? l.map((ng) => {
          const a = el("a", "linha-neg-flash"); a.href = `${PAGINA_NEGOCIO[ng.tipo] || "servicos.html"}?negocio=${encodeURIComponent(ng.id)}&de=flash`;
          const av = el("span", "avatar neg-av " + ng.tipo);
          if (ng.foto && /^(data:image|https:)/.test(ng.foto)) pintarAvatar(av, ng.foto, ng.nome); else av.appendChild(icone(ICONE_NEGOCIO[ng.tipo] || "loja", "i xs"));
          const tx = el("span", "tx"); tx.append(el("strong", null, ng.nome || "Negócio"), el("small", null, { servicos: "Freelances", delivery: "Delivery", lojinha: "Shopping", imoveis: "Imóveis", saude: "Saúde" }[ng.tipo] || "Negócio"));
          a.append(av, tx, icone("avancar", "i xs"));
          return a;
        }) : [el("div", "lista-vazia", "Esses negócios não estão mais no ar.")]));
      });
      subQuem.appendChild(o);
    }
    // Flash visto pelo perfil de um negócio: botão para a vitrine (ver produtos, cardápio, serviços...), que é o motivo de
    // a pessoa estar ali. Na página de perfis abre o perfil do negócio por cima; nas outras, vai para a vitrine dele.
    if (negocio?.id && PAGINA_NEGOCIO[negocio.tipo]) {
      const NOMES_CTA = { servicos: "Ver serviços", delivery: "Ver cardápio", lojinha: "Ver produtos", imoveis: "Ver imóveis", saude: "Ver perfil e agendar" };
      const cta = el("button", "story-vitrine"); cta.type = "button";
      cta.append(icone(ICONE_NEGOCIO[negocio.tipo] || "loja", "i s"), el("span", null, NOMES_CTA[negocio.tipo] || "Ver vitrine"), icone("avancar", "i xs"));
      cta.setAttribute("aria-label", `${NOMES_CTA[negocio.tipo] || "Ver vitrine"} de ${negocio.nome || "este negócio"}`);
      ["pointerdown", "pointerup"].forEach((ev) => cta.addEventListener(ev, (e) => e.stopPropagation()));
      cta.addEventListener("click", (e) => {
        e.stopPropagation();
        if (aoVitrine) { fechar(); setTimeout(() => aoVitrine(), 80); return; }
        pausar(true); location.href = linkNegocio({ negocioId: negocio.id, tipo: negocio.tipo });
      });
      rodape.prepend(cta);
    }
    // Publicação do Diário compartilhada (como no Instagram): tocar na publicação mostra o balão "Ver publicação";
    // tocar no balão abre a publicação POR CIMA do flash, e o "voltar" retorna ao flash de onde parou.
    caixa.querySelectorAll(".story-post, .story-post-area").forEach((x) => x.remove());
    if (s.postDe?.postId) {
      const area = el("button", "story-post-area"); area.type = "button";
      area.setAttribute("aria-label", s.postDe.autorId === s.autorId ? "Publicação: toque para ver" : `Publicação de ${String(s.postDe.nome || "alguém")}: toque para ver`);
      const a = el("a", "story-link story-post balao"); a.href = `feed.html?post=${encodeURIComponent(s.postDe.postId)}`; a.hidden = true;
      a.append(el("span", null, "Ver publicação"), icone("avancar", "i xs"));
      a.setAttribute("aria-label", s.postDe.autorId === s.autorId ? "Ver publicação" : `Ver a publicação de ${String(s.postDe.nome || "quem publicou")}`);
      const esconder = () => { if (a.hidden) return; a.hidden = true; pausar(false); };
      // Só um toque RÁPIDO e parado mostra o balão: segurar pausa (como no resto do flash) e deslizar troca de pessoa.
      let tSeg = null, segurou = false, p0 = null;
      area.addEventListener("pointerdown", (e) => { e.stopPropagation(); segurou = false; p0 = { x: e.clientX, y: e.clientY, t: Date.now() }; tSeg = setTimeout(() => { segurou = true; esconder(); pausar(true); caixa.classList.add("limpo"); }, 260); });
      area.addEventListener("pointermove", (e) => { if (p0 && Math.hypot(e.clientX - p0.x, e.clientY - p0.y) > 10) clearTimeout(tSeg); });
      area.addEventListener("pointerup", (e) => {
        e.stopPropagation(); clearTimeout(tSeg); caixa.classList.remove("limpo");
        if (segurou) { segurou = false; pausar(false); return; }
        const mexeu = !p0 || Math.hypot(e.clientX - p0.x, e.clientY - p0.y) > 10 || Date.now() - p0.t > 350 || arrastou;
        p0 = null;
        if (mexeu) return;
        if (!a.hidden) { esconder(); return; }
        // O balão aparece em cima de onde tocou (sem sair da tela).
        const r = quadro.getBoundingClientRect();
        a.style.left = `${Math.min(80, Math.max(20, ((e.clientX - r.left) / r.width) * 100))}%`;
        a.style.top = `${Math.max(14, ((e.clientY - r.top) / r.height) * 100 - 6)}%`;
        a.hidden = false; pausar(true);
      });
      area.addEventListener("pointercancel", () => { clearTimeout(tSeg); caixa.classList.remove("limpo"); if (segurou) { segurou = false; pausar(false); } });
      area.addEventListener("click", (e) => { e.stopPropagation(); if (e.detail === 0) { a.hidden = false; pausar(true); a.focus(); } });
      ["pointerdown", "pointerup"].forEach((ev) => a.addEventListener(ev, (e) => e.stopPropagation()));
      a.addEventListener("click", (e) => {
        e.stopPropagation(); pausar(true);
        if (!ganchos.abrirPublicacao) return; // fora do Diário: segue o link
        e.preventDefault(); a.hidden = true;
        ganchos.abrirPublicacao(s.postDe.postId, { sobreFlash: true, aoFechar: () => { if (!fechado && document.querySelector(".story-visor")) { document.body.classList.add("travado"); pausar(false); } } });
      });
      quadro.append(area, a);
    }
    // Link para o perfil de um negócio (figurinha): tocar vai para o perfil.
    caixa.querySelector(".story-link:not(.story-post)")?.remove();
    if (fig.link) {
      const lk = fig.link;
      const a = el("a", "story-link"); a.href = linkNegocio(lk);
      a.style.left = `${(lk.x ?? 0.5) * 100}%`; a.style.top = `${(lk.y ?? 0.68) * 100}%`;
      a.dataset.fx = lk.x ?? 0.5; a.dataset.fy = lk.y ?? 0.68;
      if (lk.k) a.style.transform = `translate(-50%, -50%) scale(${Math.min(1.3, Math.max(0.6, Number(lk.k) || 1))})`;
      a.append(icone(ICONE_NEGOCIO[lk.tipo] || "loja", "i s"), el("span", null, lk.nome || "Ver o negócio"), icone("avancar", "i xs"));
      a.setAttribute("aria-label", `Abrir o perfil de ${lk.nome || "negócio"}`);
      ["pointerdown", "pointerup"].forEach((ev) => a.addEventListener(ev, (e) => e.stopPropagation()));
      a.addEventListener("click", (e) => { e.stopPropagation(); pausar(true); });
      quadro.appendChild(a); agendarSeparar();
    }
    // Figurinhas tocáveis: localização (publicações de lá), hashtag e menção (perfil). Um toque mostra o balão
    // (como no Instagram); tocar no balão abre.
    caixa.querySelectorAll(".story-fig-toque, .story-fig-balao").forEach((x) => x.remove());
    fig.toques.forEach((f) => {
      const area = el("button", "story-fig-toque"); area.type = "button"; area.setAttribute("aria-label", f.rot);
      const w = Math.max(f.w, 0.12), h = Math.max(f.h, 0.045);
      area.style.left = `${(f.x - w / 2) * 100}%`; area.style.top = `${(f.y - h / 2) * 100}%`; area.style.width = `${w * 100}%`; area.style.height = `${h * 100}%`;
      const balao = el("a", "story-fig-balao"); balao.hidden = true; balao.href = f.href || "#";
      const rot = el("span", null, f.rot);
      balao.append(icone(f.ic, "i xs"), rot, icone("avancar", "i xs"));
      balao.style.left = `${Math.min(80, Math.max(20, f.x * 100))}%`; balao.style.top = `${Math.max(12, (f.y - h / 2) * 100 - 5)}%`;
      if (f.uid) obterPerfil(f.uid).then((p) => { rot.textContent = `Ver o perfil de ${String(p.nome || "@" + (p.nickname || "")).split(" ")[0]}`; }).catch(() => {});
      let tEsc = null;
      const esconder = () => { clearTimeout(tEsc); if (balao.hidden) return; balao.hidden = true; pausar(false); };
      ["pointerdown", "pointerup"].forEach((ev) => { area.addEventListener(ev, (e) => e.stopPropagation()); balao.addEventListener(ev, (e) => e.stopPropagation()); });
      area.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!balao.hidden) { esconder(); return; }
        quadro.querySelectorAll(".story-fig-balao:not([hidden])").forEach((b) => { b.hidden = true; });
        balao.hidden = false; pausar(true); clearTimeout(tEsc); tEsc = setTimeout(esconder, 4000);
      });
      balao.addEventListener("click", (e) => {
        e.stopPropagation(); clearTimeout(tEsc);
        if (f.uid) { e.preventDefault(); irParaPerfil(f.uid); return; }
        // Lugar e hashtag abrem uma folha por cima do flash (como no Instagram); fechar volta ao flash.
        if (f.lugar || f.tag) {
          e.preventDefault(); balao.hidden = true; pausar(true);
          const volta = () => { if (document.querySelector(".story-visor")) document.body.classList.add("travado"); pausar(false); };
          if (f.lugar) abrirLugarFlash(f.lugar, volta); else abrirHashtagFlash(f.tag, volta);
        }
      });
      quadro.append(area, balao);
    });
    // Fui mencionado: posso repostar no meu flash.
    if (!meu && Array.isArray(s.mencoes) && s.mencoes.includes(eu.uid) && s.tipo !== "video") {
      const rp = el("button", "story-repostar"); rp.type = "button";
      rp.append(icone("mais", "i xs"), document.createTextNode("Adicionar ao seu flash"));
      rp.addEventListener("click", (e) => { e.stopPropagation(); fechar(); abrirCriador({ repost: s }); });
      linhaAcoes().appendChild(rp);
    }
    // Pessoas mencionadas: chip que abre a lista (tocar leva ao perfil).
    // Menção oculta: a pessoa foi avisada, mas não aparece para quem vê (o autor vê todas).
    const ocultas = Array.isArray(s.mencoesOcultas) ? s.mencoesOcultas : [];
    const visiveis = (Array.isArray(s.mencoes) ? s.mencoes : []).filter((u) => meu || !ocultas.includes(u));
    if (visiveis.length) {
      const bm = pessoasEmPilha(visiveis, { classe: "story-mencoes escuro", prefixo: "", titulo: visiveis.length === 1 ? "Mencionado" : "Mencionados", abrirPerfil: irParaPerfil,
        aoAbrir: () => pausar(true), aoFechar: () => { if (document.querySelector(".story-visor")) document.body.classList.add("travado"); pausar(false); } });
      linhaAcoes().prepend(bm);
    }
    organizarRodape(); requestAnimationFrame(organizarRodape); setTimeout(organizarRodape, 400);
    if (meu) {
      const v = el("button", "story-vistos"); v.type = "button";
      const rostos = el("span", "rostos");
      v.append(icone("olho", "i xs"), el("span", null, "Visualizações"), rostos);
      v.addEventListener("click", (e) => { e.stopPropagation(); pausar(true); verQuemViu(s, () => pausar(false), mapa.get(eu.uid), irPara, { aoApagar: tirarDaLista }); });
      // Destacar (como no Instagram): guarda o flash num destaque do perfil, que fica para sempre.
      const bd = el("button", "story-destacar"); bd.type = "button"; bd.setAttribute("aria-label", "Destacar no perfil");
      bd.append(icone("destaque", "i s"), el("span", null, "Destacar"));
      bd.addEventListener("click", (e) => { e.stopPropagation(); pausar(true); adicionarAoDestaque(s, () => { if (document.querySelector(".story-visor")) document.body.classList.add("travado"); pausar(false); }); });
      const linhaMeu = el("div", "story-meu-rodape"); linhaMeu.append(v, bd);
      rodape.appendChild(linhaMeu);
      // Quantas pessoas viram e as 3 últimas fotos.
      // Estrelas que o flash recebeu (só o autor lê).
      const est = el("span", "story-vistos-est"); est.hidden = true; v.insertBefore(est, rostos);
      fb.getDocs(fb.query(fb.collection(fb.db, "stories", s.id, "reacoes"), fb.where("curtiu", "==", true), fb.limit(300))).then((x) => {
        if (!x.size) return; est.replaceChildren(icone("estrela", "i xs"), document.createTextNode(String(x.size))); est.hidden = false;
      }).catch(() => {});
      fb.getDocs(fb.query(fb.collection(fb.db, "stories", s.id, "vistos"), fb.limit(300))).then((x) => {
        v.children[1].textContent = x.size ? `Visto por ${x.size}` : "Ninguém viu ainda";
        x.docs.sort((a, b) => ms(b.data().criadoEm) - ms(a.data().criadoEm)).slice(0, 3).forEach((d) => {
          const r = el("span", "avatar"); rostos.appendChild(r);
          obterPerfil(d.id).then((p) => pintarAvatar(r, p.fotoPerfil, p.nome)).catch(() => {});
        });
      }).catch(() => {});
    } else {
      // Respostas: conforme a escolha do autor (todos, só quem ele segue, ninguém).
      if (s.respostas === "ninguem") { rodape.appendChild(el("p", "story-sem-resposta", "Respostas desativadas")); estrelaSozinha(); }
      else if (s.respostas === "seguindo") {
        rodape.append(bandeja, form); form.hidden = true; bandeja.hidden = true;
        autorMeSegue(s.autorId).then((ok) => { if (atual() !== s) return; form.hidden = !ok; bandeja.hidden = !ok; if (!ok) { rodape.appendChild(el("p", "story-sem-resposta", "Só quem essa pessoa segue pode responder")); estrelaSozinha(); } });
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
      const dur = tempoDoFlash(s);
      inicio = Date.now(); restante = dur;
      animarBarra(dur);
      timer = setTimeout(proximo, dur);
    }
    // Já carrega o próximo (troca sem piscar).
    const prox = lista[si + 1] || mapa.get(ordem[ai + 1])?.[0];
    if (prox && prox.tipo !== "video") { const pre = new Image(); pre.src = prox.midia; }
    // Visto (no aparelho e para o autor contar)
    if (!vistosLocal.has(s.id)) { vistosLocal.add(s.id); guardarVistos(); }
    if (!meu && ativo(s)) fb.setDoc(fb.doc(fb.db, "stories", s.id, "vistos", eu.uid), { criadoEm: fb.serverTimestamp() }).catch(() => {});
  }
  let somDesligado = !configFlash().somVideo;
  const pintarSom = () => { bSom.textContent = somDesligado ? "🔇" : "🔊"; bSom.setAttribute("aria-label", somDesligado ? "Ligar o som" : "Desligar o som"); };
  bSom.addEventListener("click", (e) => { e.stopPropagation(); somDesligado = !somDesligado; if (video) video.muted = somDesligado; pintarSom(); });
  // A barra do tempo anda quadro a quadro (requestAnimationFrame), e não por animação do CSS: assim ela aparece mesmo
  // com "remover animações" ligado no celular (o site desliga as transições nesse caso).
  let rafBarra = 0, durAtual = 1;
  function animarBarra(dur) {
    cancelAnimationFrame(rafBarra);
    durAtual = Math.max(1, dur);
    const i = barras.children[si]?.firstChild; if (!i) return;
    i.style.transition = "none";
    const passo = () => {
      if (fechado || !i.isConnected) return;
      const f = video ? (video.duration ? video.currentTime / video.duration : 0)
        : 1 - Math.max(0, pausado ? restante : restante - (Date.now() - inicio)) / durAtual;
      i.style.width = Math.min(100, Math.max(0, f * 100)) + "%";
      rafBarra = requestAnimationFrame(passo);
    };
    passo();
  }
  // A lista de uma pessoa cresceu por trás (abriu pelo link com um flash só; abrirFlashPorId → completarLista): troca
  // sem mexer no flash que está na tela; a barra de cima passa a mostrar os outros e o tempo continua de onde estava.
  fundo._trocarLista = (uid, nova) => {
    const l = mapa.get(uid);
    if (fechado || !l) { if (!fechado) mapa.set(uid, nova); return; }
    const cur = atual();
    l.splice(0, l.length, ...nova);
    if (ordem[ai] !== uid) return;
    const k = l.indexOf(cur);
    if (k < 0) { l.splice(Math.min(si, l.length), 0, cur); return; }
    si = k;
    barras.replaceChildren(...l.map((_, j) => { const b = el("span", "story-barra"); const i = el("i"); if (j < si) i.style.width = "100%"; b.appendChild(i); return b; }));
    animarBarra(durAtual);
    adiantar(l[si + 1]);
  };
  // Flash apagado pela lixeira das Visualizações: sai da lista do visor.
  function tirarDaLista(x) {
    const l = mapa.get(eu.uid) || [], j = l.findIndex((y) => y.id === x.id);
    if (j < 0) return;
    l.splice(j, 1);
    if (!l.length) { mapa.delete(eu.uid); fechar(); return; }
    if (ordem[ai] === eu.uid) { si = Math.min(si, l.length - 1); mostrar(); pausar(true); }
  }
  // Ir para um dos seus flashes (a fita das Visualizações troca o flash que está por trás, como no Instagram).
  function irPara(x) {
    const k = ordem.indexOf(eu.uid), l = mapa.get(eu.uid) || [], j = l.findIndex((y) => y.id === x.id);
    if (k < 0 || j < 0) return;
    ai = k; si = j; mostrar(); pausar(true);
  }
  function proximo() {
    const lista = mapa.get(ordem[ai]) || [];
    if (si < lista.length - 1) { si++; mostrar(); return; }
    proximoAutor();
  }
  // Tira o flash da lista (publicação apagada) e segue para o próximo; o seu é apagado de vez.
  function pularFlash(s, meu) {
    const l = mapa.get(ordem[ai]) || [];
    const k = l.indexOf(s); if (k >= 0) l.splice(k, 1);
    if (meu) fb.deleteDoc(fb.doc(fb.db, "stories", s.id)).then(() => avisarFlashNegocio(s.negocios)).catch(() => {});
    if (si < l.length) { mostrar(); return; }
    si = Math.max(0, l.length - 1);
    proximoAutor();
  }
  // Troca de pessoa em CUBO (como o Instagram), feita em JavaScript: funciona também com as animações do celular
  // desligadas (elas só desligam as animações do CSS).
  let semEntrada = false;
  const PERSP_F = 1000;
  function entrarCubo(dir) {
    try {
      const o = dir > 0 ? "0% 50%" : "100% 50%", g = dir > 0 ? 90 : -90;
      caixa.style.transformOrigin = o;
      const an = caixa.animate([{ transform: `perspective(${PERSP_F}px) translate3d(${dir > 0 ? "100%" : "-100%"},0,0) rotateY(${g}deg)`, opacity: 0.7 }, { transform: "none", opacity: 1 }], { duration: 300, easing: "cubic-bezier(.2,.8,.25,1)" });
      an.onfinish = an.oncancel = () => { caixa.style.transformOrigin = ""; };
    } catch {}
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
    if (!sim && (digitando || document.querySelector(".folha.aberta, .hfc.on"))) return;
    pausado = sim;
    caixa.classList.toggle("pausado", sim);
    const i = barras.children[si]?.firstChild;
    if (sim) {
      clearTimeout(timer); video?.pause();
      if (!video) restante = Math.max(300, restante - (Date.now() - inicio));
    } else {
      if (video) video.play().catch(() => {});
      else { inicio = Date.now(); timer = setTimeout(proximo, restante); }
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
        try { await fb.deleteDoc(fb.doc(fb.db, "stories", s.id)); avisarFlashNegocio(s.negocios); const l = mapa.get(s.autorId); l.splice(si, 1); if (!l.length) mapa.delete(s.autorId); toast("Flash apagado"); if (!mapa.get(s.autorId)) fechar(); else { si = Math.min(si, l.length - 1); mostrar(); } }
        catch (e) { toast("Não foi possível apagar: " + erroAmigavel(e)); }
      } },
      meu && destaque && { rotulo: "Tirar deste destaque", sub: destaque.nome, icone: "destaque", perigo: true, fn: async () => {
        if (!await confirmarHF({ titulo: "Tirar do destaque?", texto: `O flash sai de "${destaque.nome}". Ele continua no seu arquivo.`, ok: "Tirar", icone: "lixo" })) return;
        try {
          const ficou = await tirarDoDestaque(destaque, s.id);
          const l = mapa.get(s.autorId); l.splice(si, 1);
          toast(ficou ? "Tirado do destaque" : "Destaque apagado (estava vazio)");
          if (!l.length) fechar(); else { si = Math.min(si, l.length - 1); mostrar(); }
        } catch (e) { toast("Não foi possível: " + erroAmigavel(e)); }
      } },
      meu && { rotulo: destaque ? "Pôr em outro destaque" : "Destacar no perfil", sub: "O destaque fica no seu perfil para sempre", icone: "destaque", fn: () => setTimeout(() => { pausar(true); adicionarAoDestaque(s, () => { if (document.querySelector(".story-visor")) document.body.classList.add("travado"); pausar(false); }); }, 260) },
      meu && ativo(s) && { rotulo: "Visualizações", sub: "Quem viu, deu estrela ou reagiu", icone: "olho", fn: () => setTimeout(() => { pausar(true); verQuemViu(s, () => pausar(false), mapa.get(eu.uid), irPara, { aoApagar: tirarDaLista }); }, 260) },
      meu && s.tipo !== "video" && { rotulo: "Salvar foto", sub: "Guarda o flash no aparelho", icone: "imagem", fn: () => salvarFotoFlash(s) },
      { rotulo: "Compartilhar", sub: meu ? "Manda o link do flash (fica 24 h)" : "Manda o link do flash", icone: "compartilhar", fn: () => compartilharLinkFlash(s) },
      meu && { rotulo: "Configurações do Flash", sub: "Quem vê, respostas, amigos próximos", icone: "config", fn: () => setTimeout(() => { pausar(true); abrirConfigFlash(); const f = $("folhaLista"); const v = () => { f?.removeEventListener("fechada", v); if (document.querySelector(".story-visor")) document.body.classList.add("travado"); pausar(false); }; f?.addEventListener("fechada", v); }, 260) },
      meu && { rotulo: "Novo flash", icone: "camera", fn: () => { fechar(); abrirCriador(); } },
      !meu && { rotulo: "Ver perfil", icone: "olho", fn: () => irParaPerfil(s.autorId) },
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
  // Arrastar: para baixo fecha; para o lado troca de pessoa; para cima (no seu) mostra quem viu. O cartão acompanha o
  // dedo (gira um pouco para o lado em que vai) e, se o gesto foi curto, volta para o lugar. Um toque rápido para o lado
  // (sem chegar a 70 px) também troca.
  let x0 = null, y0 = null, t0 = 0, eixo = null, pausouArrasto = false;
  const largura = () => caixa.offsetWidth || innerWidth;
  const voltarLugar = (anim) => {
    if (anim && caixa.style.transform && caixa.animate) {
      const de = caixa.style.transform, op = caixa.style.opacity || "1";
      caixa.style.transform = ""; caixa.style.opacity = "";
      try { caixa.animate([{ transform: de, opacity: op }, { transform: "none", opacity: 1 }], { duration: 220, easing: "cubic-bezier(.2,.9,.3,1)" }); } catch {}
      return;
    }
    caixa.style.transition = "none"; caixa.style.transform = ""; caixa.style.opacity = "";
  };
  // A face da próxima pessoa (a 1ª foto dela) entra girando ao lado, como num cubo.
  let face = null;
  function faceDe(dir) {
    const u = ordem[ai + (dir > 0 ? 1 : -1)];
    if (!u) return null;
    if (face && face._u === u) return face;
    face?.remove();
    const l = mapa.get(u) || [], x = l[inicioDo(u)] || l[0];
    const r = caixa.getBoundingClientRect();
    face = el("div", "story-face");
    Object.assign(face.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", borderRadius: getComputedStyle(caixa).borderRadius });
    if (x?.midia && x.tipo !== "video" && /^(data:image\/|https:)/.test(x.midia)) { const im = document.createElement("img"); im.src = x.midia; im.alt = ""; face.appendChild(im); }
    face._u = u;
    fundo.appendChild(face);
    return face;
  }
  function pintarFaces(p, dir) {
    const w = largura();
    if (dir > 0) {
      caixa.style.transformOrigin = "100% 50%";
      caixa.style.transform = `perspective(${PERSP_F}px) translate3d(${-p * w}px,0,0) rotateY(${-90 * p}deg)`;
      if (face) { face.style.transformOrigin = "0% 50%"; face.style.transform = `perspective(${PERSP_F}px) translate3d(${(1 - p) * w}px,0,0) rotateY(${90 * (1 - p)}deg)`; }
    } else {
      caixa.style.transformOrigin = "0% 50%";
      caixa.style.transform = `perspective(${PERSP_F}px) translate3d(${p * w}px,0,0) rotateY(${90 * p}deg)`;
      if (face) { face.style.transformOrigin = "100% 50%"; face.style.transform = `perspective(${PERSP_F}px) translate3d(${-(1 - p) * w}px,0,0) rotateY(${-90 * (1 - p)}deg)`; }
    }
    caixa.style.opacity = String(1 - 0.35 * p);
    if (face) face.style.opacity = String(0.65 + 0.35 * p);
  }
  // Termina o giro (quadro a quadro) e chama fim no final.
  function girarAte(p0, p1, dir, fim) {
    const dur = Math.round(Math.max(150, Math.min(320, Math.abs(p1 - p0) * 340))), t0 = performance.now();
    const passo = (agora) => {
      const t = Math.min(1, (agora - t0) / dur), e = 1 - Math.pow(1 - t, 3);
      pintarFaces(p0 + (p1 - p0) * e, dir);
      if (t < 1) { requestAnimationFrame(passo); return; }
      fim();
    };
    requestAnimationFrame(passo);
  }
  const tirarFace = () => { face?.remove(); face = null; caixa.style.transform = ""; caixa.style.transformOrigin = ""; caixa.style.opacity = ""; caixa.style.transition = ""; };
  caixa.addEventListener("touchstart", (e) => {
    if (e.target.closest("form, .story-bandeja, .story-cx, .story-enq") || e.touches.length > 1) { x0 = null; return; }
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); eixo = null; arrastou = false; pausouArrasto = false;
  }, { passive: true });
  caixa.addEventListener("touchmove", (e) => {
    if (x0 == null) return;
    const dx = e.touches[0].clientX - x0, dy = e.touches[0].clientY - y0;
    if (!eixo) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 12) return;
      eixo = Math.abs(dx) > Math.abs(dy) ? "x" : "y"; arrastou = true; clearTimeout(tSeg);
      if (!pausado) { pausar(true); pausouArrasto = true; }
    }
    caixa.style.transition = "none";
    if (eixo === "x") {
      const W = largura(), tem = dx < 0 ? ai < ordem.length - 1 : ai > 0;
      if (tem) { const dir = dx < 0 ? 1 : -1; if (face && face._dir !== dir) { face.remove(); face = null; } const f = faceDe(dir); if (f) f._dir = dir; pintarFaces(Math.min(1, Math.abs(dx) / W), dir); }
      else { face?.remove(); face = null; caixa.style.transformOrigin = ""; caixa.style.opacity = ""; caixa.style.transform = `translateX(${dx * 0.25}px)`; } // sem ninguém do lado: resiste
    } else if (dy > 0) {
      caixa.style.transform = `translateY(${dy * 0.85}px) scale(${1 - Math.min(dy, 500) / 2500})`;
      caixa.style.opacity = String(1 - Math.min(dy, 500) / 1200);
    }
  }, { passive: true });
  const fimArrasto = (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0, rapido = Date.now() - t0 < 260;
    x0 = null;
    const ex = eixo; eixo = null;
    if (ex === "y" && (dy > 110 || (rapido && dy > 50))) { fechar(); return; }
    const tem = dx < 0 ? ai < ordem.length - 1 : ai > 0, dir = dx < 0 ? 1 : -1, p = Math.min(1, Math.abs(dx) / largura());
    if (ex === "x" && (Math.abs(dx) > 70 || (rapido && Math.abs(dx) > 35))) {
      clearTimeout(tSeg); segurou = false; caixa.classList.remove("limpo");
      if (tem) { girarAte(p, 1, dir, () => { tirarFace(); semEntrada = true; if (dir > 0) proximoAutor(); else anteriorAutor(); }); return; }
      tirarFace();
      if (dx < 0) proximoAutor(); else { voltarLugar(true); if (pausouArrasto) pausar(false); }
      return;
    }
    if (ex === "x" && tem && face) { girarAte(p, 0, dir, tirarFace); if (pausouArrasto) { pausouArrasto = false; pausar(false); } return; }
    voltarLugar(!!ex);
    if (ex === "y" && dy < -90 && atual()?.autorId === eu.uid) { verQuemViu(atual(), () => pausar(false), mapa.get(eu.uid), irPara, { aoApagar: tirarDaLista }); return; }
    if (pausouArrasto) { pausouArrasto = false; pausar(false); }
  };
  caixa.addEventListener("touchend", fimArrasto, { passive: true });
  caixa.addEventListener("touchcancel", (e) => { if (x0 == null) return; x0 = null; eixo = null; tirarFace(); voltarLugar(true); if (pausouArrasto) { pausouArrasto = false; pausar(false); } }, { passive: true });
  mostrar();
}
// Visualizações (só o autor): quem viu, quem deu a estrela e quem reagiu (o emoji no canto da foto), com filtros.
// Em cima, a fita dos seus flashes no ar (miniatura + quantas pessoas viram) para trocar de flash sem sair da folha.
// Em cada pessoa, o "⋯" abre as ações ali mesmo: mandar mensagem, ver o perfil e ocultar os seus flashes dela.
async function verQuemViu(sInicial, aoFechar, flashes, aoTrocar, { aoApagar = null, aba: abaInicial = "vistos" } = {}) {
  const corpo = abrirLista("Visualizações");
  const f = $("folhaLista");
  // Segurar a miniatura não abre o menu do navegador ("baixar imagem").
  corpo.addEventListener("contextmenu", (e) => { if (e.target.closest("img, .vv-mini")) e.preventDefault(); });
  const volta = () => { f?.removeEventListener("fechada", volta); if (document.querySelector(".story-visor")) document.body.classList.add("travado"); aoFechar?.(); };
  f?.addEventListener("fechada", volta);
  const meus = (Array.isArray(flashes) && flashes.length ? flashes : [sInicial]).filter(Boolean);
  if (!meus.some((x) => x.id === sInicial.id)) meus.unshift(sInicial);
  let s = sInicial, vez = 0;
  const conteudo = el("div", "vv-conteudo");
  if (meus.length > 1) {
    const fita = el("div", "vv-fita"); fita.setAttribute("role", "tablist"); fita.setAttribute("aria-label", "Seus flashes no ar");
    meus.forEach((x, k) => {
      const b = el("button", "vv-mini"); b.type = "button"; b.setAttribute("role", "tab");
      const capa = el("span", "vv-mini-capa");
      if (x.tipo === "video") capa.appendChild(icone("play", "i s"));
      else { const im = document.createElement("img"); im.src = x.midia; im.alt = ""; im.loading = "lazy"; im.decoding = "async"; capa.appendChild(im); }
      const n = el("small", "vv-mini-n"); n.append(icone("olho", "i xs"), el("span", null, "…"));
      b.append(capa, n);
      b.setAttribute("aria-label", `Flash ${k + 1} de ${meus.length}, ${tempoRelativo(new Date(ms(x.criadoEm) || Date.now()))}`);
      fb.getCountFromServer(fb.query(fb.collection(fb.db, "stories", x.id, "vistos"))).then((c) => { n.lastChild.textContent = String(c.data().count); }).catch(() => { n.lastChild.textContent = "–"; });
      b.addEventListener("click", () => { if (s.id === x.id) return; s = x; aba = "vistos"; pintarFita(); carregar(); aoTrocar?.(x); });
      fita.appendChild(b);
    });
    const pintarFita = () => [...fita.children].forEach((b, k) => { const on = meus[k].id === s.id; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); if (on) b.scrollIntoView({ inline: "center", block: "nearest" }); });
    corpo.appendChild(fita);
    requestAnimationFrame(pintarFita);
  }
  // Barra do flash (como no Instagram): quantos viram + Destacar + Apagar; abas quando tem enquete ou perguntas.
  const barra = el("div", "vv-barra");
  const nVistos = el("span", "vv-barra-n"); nVistos.append(icone("olho", "i s"), el("strong", null, "…"));
  const bDest = el("button", "vv-barra-btn"); bDest.type = "button"; bDest.title = "Destacar no perfil"; bDest.setAttribute("aria-label", "Destacar no perfil"); bDest.appendChild(icone("destaque", "i s"));
  const bLixo = el("button", "vv-barra-btn perigo"); bLixo.type = "button"; bLixo.title = "Apagar este flash"; bLixo.setAttribute("aria-label", "Apagar este flash"); bLixo.appendChild(icone("lixo", "i s"));
  barra.append(nVistos, el("span", "esp"), bDest, bLixo);
  bDest.addEventListener("click", () => adicionarAoDestaque(s, () => {}));
  bLixo.addEventListener("click", async () => {
    if (!await confirmarHF({ titulo: "Apagar este flash?", texto: "Ele some para todo mundo, também das visualizações.", ok: "Apagar", icone: "lixo" })) return;
    try {
      await fb.deleteDoc(fb.doc(fb.db, "stories", s.id));
      avisarFlashNegocio(s.negocios);
      toast("Flash apagado");
      const x = s; const k = meus.findIndex((y) => y.id === x.id); if (k >= 0) meus.splice(k, 1);
      aoApagar?.(x);
      if (!meus.length) { f?.querySelector("[data-fechar]")?.click(); return; }
      s = meus[Math.min(k, meus.length - 1)];
      corpo.querySelector(".vv-fita")?.children[k]?.remove();
      aoTrocar?.(s); carregar();
    } catch (e) { toast("Não foi possível apagar: " + erroAmigavel(e)); }
  });
  const abas = el("div", "vv-abas"); abas.setAttribute("role", "tablist");
  let aba = abaInicial;
  corpo.append(barra, abas, conteudo);
  function pintarAbas() {
    const l = [["vistos", "Visualizações"], ...(s.enquete ? [["enquete", "Enquete"]] : []), ...(s.caixa ? [["respostas", "Respostas"]] : [])];
    if (!l.some(([k]) => k === aba)) aba = "vistos";
    abas.hidden = l.length < 2;
    abas.replaceChildren(...l.map(([k, rot]) => {
      const b = el("button", "vv-aba" + (k === aba ? " on" : ""), rot); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(k === aba));
      b.addEventListener("click", () => { if (aba === k) return; aba = k; carregar(); });
      return b;
    }));
  }
  async function carregar() {
    pintarAbas();
    fb.getCountFromServer(fb.query(fb.collection(fb.db, "stories", s.id, "vistos"))).then((c) => { nVistos.lastChild.textContent = String(c.data().count); }).catch(() => { nVistos.lastChild.textContent = "–"; });
    if (aba === "enquete") return carregarEnquete();
    if (aba === "respostas") return carregarRespostas();
    const minha = ++vez;
    conteudo.replaceChildren(el("div", "lista-vazia", "Carregando..."));
    try {
      const [v, r] = await Promise.all([
        fb.getDocs(fb.query(fb.collection(fb.db, "stories", s.id, "vistos"), fb.limit(300))),
        fb.getDocs(fb.query(fb.collection(fb.db, "stories", s.id, "reacoes"), fb.limit(300))).catch(() => ({ docs: [] }))
      ]);
      if (minha !== vez) return;
      const reac = new Map(r.docs.map((d) => [d.id, d.data()]));
      const pessoas = new Map(v.docs.map((d) => [d.id, { uid: d.id, quando: ms(d.data().criadoEm) }]));
      reac.forEach((x, uid) => { if (!pessoas.has(uid)) pessoas.set(uid, { uid, quando: ms(x.em) }); });
      const lista = [...pessoas.values()].filter((x) => x.uid !== eu.uid && !escondido(x.uid)).map((x) => ({ ...x, curtiu: !!reac.get(x.uid)?.curtiu, emoji: reac.get(x.uid)?.emoji || "" }));
      const quando = el("p", "vv-quando", `Publicado ${tempoRelativo(new Date(ms(s.criadoEm) || Date.now()))} · ${restaTexto(s)}`);
      if (!lista.length) { conteudo.replaceChildren(quando, el("div", "lista-vazia", "Ninguém viu ainda. Quem vir aparece aqui, com a estrela e as reações.")); return; }
      const nEst = lista.filter((x) => x.curtiu).length, nReac = lista.filter((x) => x.emoji).length;
      const peso = (x) => (x.curtiu ? 2 : 0) + (x.emoji ? 1 : 0);
      lista.sort((a, b) => peso(b) - peso(a) || b.quando - a.quando);
      // Resumo e filtros: Todos · Estrelas · Reações
      const resumo = el("div", "vv-resumo");
      const num = (ic, n, rot) => { const b = el("span", "vv-num"); b.append(icone(ic, "i s"), el("strong", null, String(n)), el("small", null, rot)); return b; };
      resumo.append(num("olho", lista.length, lista.length === 1 ? "visualização" : "visualizações"), num("estrela", nEst, nEst === 1 ? "estrela" : "estrelas"), num("coracao", nReac, nReac === 1 ? "reação" : "reações"));
      const filtros = el("div", "vv-filtros"); filtros.setAttribute("role", "tablist");
      const box = el("div", "vv-lista");
      let filtro = "todos";
      const FILT = [["todos", "Todos", lista.length], ["estrelas", "Estrelas", nEst], ["reacoes", "Reações", nReac]];
      const pintarFiltros = () => filtros.replaceChildren(...FILT.filter(([k, , n]) => k === "todos" || n).map(([k, nome, n]) => {
        const b = el("button", null, `${nome} · ${n}`); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(k === filtro));
        b.addEventListener("click", () => { filtro = k; pintarFiltros(); desenhar(); });
        return b;
      }));
      const perfis = await Promise.all(lista.map((x) => obterPerfil(x.uid).catch(() => ({}))));
      if (minha !== vez) return;
      const desenhar = () => {
        box.replaceChildren();
        const ocultos = new Set(configFlash().ocultarDe);
        lista.forEach((x, i) => {
          if (filtro === "estrelas" && !x.curtiu) return;
          if (filtro === "reacoes" && !x.emoji) return;
          const p = perfis[i], nome = p.nome || "Usuário", primeiro = nome.split(" ")[0];
          const l = el("div", "vv-pessoa");
          const av = el("div", "avatar"); pintarAvatar(av, p.fotoPerfil, nome);
          const fotoBox = el("div", "vv-foto"); fotoBox.appendChild(av);
          // Estrela e reação viram selos na foto (a estrela embaixo, o emoji em cima).
          if (x.curtiu) { const e = el("span", "vv-est"); e.appendChild(icone("estrela", "i xs")); e.title = "Deu uma estrela"; fotoBox.appendChild(e); }
          if (x.emoji) fotoBox.appendChild(el("span", "vv-emoji", x.emoji));
          const tx = el("div", "vv-tx");
          const sub = [p.nickname ? "@" + p.nickname : "", x.quando ? tempoRelativo(new Date(x.quando)) : ""].filter(Boolean).join(" · ");
          tx.append(el("strong", null, nome), el("small", null, sub));
          if (ocultos.has(x.uid)) tx.appendChild(el("small", "vv-oculto", "Não vê mais os seus flashes"));
          const mais = el("button", "icone-btn vv-opcoes"); mais.type = "button"; mais.setAttribute("aria-label", `Opções para ${nome}`); mais.setAttribute("aria-expanded", "false"); mais.appendChild(icone("pontos", "i s"));
          l.append(fotoBox, tx, mais);
          [fotoBox, tx].forEach((a) => a.addEventListener("click", () => perfilDoFlash(x.uid)));
          // ⋯ = menu organizado (o mesmo das outras telas do site), por cima das Visualizações.
          mais.addEventListener("click", () => {
            box.querySelectorAll(".vv-escrever").forEach((z) => z.remove());
            abrirOpcoes(nome, [
              { rotulo: "Enviar mensagem", sub: `Escreva para ${primeiro} aqui mesmo`, icone: "chat", fn: () => escrever() },
              { rotulo: "Ver perfil", sub: p.nickname ? "@" + p.nickname : "", icone: "pessoa", fn: () => perfilDoFlash(x.uid) },
              ocultos.has(x.uid)
                ? { rotulo: "Mostrar os seus flashes", sub: `${primeiro} volta a ver os próximos flashes`, icone: "olho", fn: () => mudarOculto(false) }
                : { rotulo: "Ocultar os seus flashes", sub: "A pessoa não vê os próximos e não fica sabendo", icone: "olho-off", perigo: true, fn: () => mudarOculto(true) }
            ]);
            async function mudarOculto(ocultar) {
              const c = configFlash(), set = new Set(c.ocultarDe);
              if (ocultar) {
                if (!await confirmarHF({ titulo: `Ocultar os seus flashes de ${primeiro}?`, texto: "A pessoa não vê os próximos flashes e não fica sabendo. Dá para desfazer aqui ou nas Configurações do Flash.", ok: "Ocultar", icone: "olhoOff", cor: "normal" })) return;
                set.add(x.uid);
              } else set.delete(x.uid);
              try { await salvarConfigFlash({ ...c, ocultarDe: [...set] }); toast(ocultar ? `${primeiro} não vê mais os seus flashes` : `${primeiro} volta a ver os seus flashes`); desenhar(); }
              catch (e) { toast("Não foi possível: " + erroAmigavel(e)); }
            }
            function escrever() {
              const form = el("form", "vv-escrever");
              const campo = el("input"); campo.type = "text"; campo.maxLength = 900; campo.placeholder = `Mensagem para ${primeiro}...`;
              const env = el("button", "cx-enviar"); env.type = "submit"; env.setAttribute("aria-label", "Enviar"); env.appendChild(icone("enviar", "i s"));
              form.append(campo, env); l.after(form); setTimeout(() => campo.focus(), 200);
              form.addEventListener("submit", async (e) => {
                e.preventDefault(); const t = campo.value.trim(); if (!t) return;
                env.disabled = true;
                try { await mandarMensagem(x.uid, { texto: t.slice(0, 900) }, t); form.replaceWith(el("small", "cx-nota vv-enviado", "Enviado no Mensagens ✓")); }
                catch (err) { env.disabled = false; if (err?.message !== "e-mail") toast("Não foi possível enviar: " + erroAmigavel(err)); }
              });
            }
          });
          box.appendChild(l);
        });
        if (!box.children.length) box.appendChild(el("div", "lista-vazia", "Ninguém por aqui ainda."));
      };
      pintarFiltros(); desenhar();
      conteudo.replaceChildren(quando, resumo, filtros, box, el("small", "vv-nota", "Respostas e reações também chegam no Mensagens. Só você vê esta lista."));
    } catch (e) { if (minha === vez) conteudo.replaceChildren(el("div", "lista-vazia", "Não foi possível carregar: " + erroAmigavel(e))); }
  }
  // Resultado da enquete: cada opção com a barra, a porcentagem e quem votou nela (anônima: só os números).
  async function carregarEnquete() {
    const minha = ++vez, e = s.enquete, alvo = "f_" + s.id;
    conteudo.replaceChildren(el("div", "lista-vazia", "Carregando..."));
    try {
      const [contas, votos] = await Promise.all([
        lerContasEnquete(fb, fb.db, alvo, e.opcoes.length, { fresco: true }).catch(() => e.opcoes.map(() => 0)),
        e.anonima ? Promise.resolve([]) : fb.getDocs(fb.query(fb.collection(fb.db, "enquete_votos"), fb.where("alvo", "==", alvo), fb.limit(300))).then((x) => x.docs.map((d) => d.data())).catch(() => [])
      ]);
      if (minha !== vez) return;
      const porOp = contas.some((n) => n > 0) ? contas : e.opcoes.map((_, i) => votos.filter((v) => Number(v.opcao) === i).length);
      const total = porOp.reduce((a, n) => a + n, 0), maior = Math.max(...porOp);
      const topo = el("div", "vv-enq-topo" + temaFig(e.cor));
      const fim = fimDaEnquete(e);
      topo.append(el("small", null, e.anonima ? "ENQUETE · ANÔNIMA" : "ENQUETE"), el("strong", null, e.pergunta),
        el("span", null, `${total} ${total === 1 ? "voto" : "votos"}${fim ? " · " + (encerrada(e) ? "encerrada" : faltaTexto(fim)) : ""}`));
      const lista = el("div", "vv-enq");
      const perfis = new Map();
      await Promise.all([...new Set(votos.map((v) => v.uid))].filter((u) => !escondido(u)).map(async (u) => perfis.set(u, await obterPerfil(u).catch(() => ({})))));
      if (minha !== vez) return;
      e.opcoes.forEach((o, i) => {
        const pct = total ? Math.round((porOp[i] / total) * 100) : 0;
        const bl = el("div", "vv-enq-op" + (total && porOp[i] === maior ? " lider" : ""));
        const cab = el("div", "vv-enq-cab"); cab.append(el("strong", null, o), el("span", null, `${pct}% · ${porOp[i]}`));
        const br = el("div", "vv-enq-barra"); const i2 = el("i"); i2.style.width = pct + "%"; br.appendChild(i2);
        bl.append(cab, br);
        const quem = votos.filter((v) => Number(v.opcao) === i && perfis.has(v.uid)).sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
        quem.forEach((v) => {
          const p = perfis.get(v.uid), l = el("button", "vv-enq-pessoa"); l.type = "button";
          const av = el("span", "avatar"); pintarAvatar(av, p.fotoPerfil, p.nome);
          l.append(av, el("span", null, p.nome || "Usuário"), el("small", null, tempoRelativo(new Date(ms(v.criadoEm) || Date.now()))));
          l.addEventListener("click", () => perfilDoFlash(v.uid));
          bl.appendChild(l);
        });
        lista.appendChild(bl);
      });
      conteudo.replaceChildren(topo, lista, el("small", "vv-nota", e.anonima ? "Votação anônima: ninguém vê quem votou, nem você." : "Só você vê quem votou em cada opção."));
    } catch (err) { if (minha === vez) conteudo.replaceChildren(el("div", "lista-vazia", "Não foi possível carregar: " + erroAmigavel(err))); }
  }
  // Respostas da caixa de perguntas em cartões (como no Instagram): tocar mostra Pôr no flash, Responder e Apagar.
  async function carregarRespostas() {
    const minha = ++vez, c = s.caixa, alvo = "f_" + s.id;
    conteudo.replaceChildren(el("div", "lista-vazia", "Carregando..."));
    try {
      const x = await fb.getDocs(fb.query(fb.collection(fb.db, "caixa_respostas"), fb.where("autorId", "==", eu.uid), fb.where("alvo", "==", alvo), fb.limit(200)));
      if (minha !== vez) return;
      const lista = x.docs.map((d) => ({ id: d.id, ...d.data() })).filter((r) => !r.uid || !escondido(r.uid)).sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
      const topo = el("div", "vv-enq-topo" + temaFig(c.cor));
      topo.append(el("small", null, c.anonima ? "PERGUNTAS · ANÔNIMAS" : "CAIXA DE PERGUNTAS"), el("strong", null, c.pergunta), el("span", null, `${lista.length} ${lista.length === 1 ? "resposta" : "respostas"}`));
      if (!lista.length) { conteudo.replaceChildren(topo, el("div", "lista-vazia", "Ainda sem respostas. Quando alguém responder, aparece aqui.")); return; }
      const grade = el("div", "vv-resp-grade");
      lista.forEach((r) => {
        const card = el("button", "vv-resp" + temaFig(c.cor)); card.type = "button";
        card.append(el("small", "vv-resp-p", c.pergunta), el("p", null, r.texto), el("span", "vv-resp-quem", r.anonima ? "Anônimo" : (r.nome || "Usuário").split(" ")[0] + " · " + tempoRelativo(new Date(ms(r.criadoEm) || Date.now()))));
        card.addEventListener("click", () => {
          const aberto = card.nextElementSibling?.classList.contains("vv-resp-acoes");
          grade.querySelectorAll(".vv-resp-acoes").forEach((z) => z.remove());
          if (aberto) return;
          const ac = el("div", "vv-resp-acoes");
          const acao = (ic, rot, fn, perigo) => { const b = el("button", "vv-acao" + (perigo ? " perigo" : "")); b.type = "button"; b.append(icone(ic, "i s"), el("span", null, rot)); b.addEventListener("click", fn); return b; };
          ac.append(acao("raio", "Pôr no flash", () => { f?.querySelector("[data-fechar]")?.click(); document.querySelector(".story-visor [aria-label='Fechar']")?.click(); setTimeout(() => compartilharRespostaNoFlash({ pergunta: c.pergunta, texto: r.texto, cor: c.cor || "" }), 300); }));
          // Responder no chat (como no Instagram): a conversa abre por cima com a pergunta e a resposta prontas.
          if (!r.anonima && r.uid) ac.append(acao("chat", "Responder", () => responderNoChat(r.uid, cartaoRespostaCaixa(c, r, alvo))), acao("pessoa", "Ver perfil", () => perfilDoFlash(r.uid)));
          ac.append(acao("lixo", "Apagar", async () => {
            if (!await confirmarHF({ titulo: "Apagar esta resposta?", texto: "Ela some das suas respostas.", ok: "Apagar", icone: "lixo" })) return;
            try { await fb.deleteDoc(fb.doc(fb.db, "caixa_respostas", r.id)); carregar(); } catch (e2) { toast("Não foi possível apagar: " + erroAmigavel(e2)); }
          }, true));
          card.after(ac);
        });
        grade.appendChild(card);
      });
      conteudo.replaceChildren(topo, grade, el("small", "vv-nota", c.anonima ? "Respostas anônimas: você não vê quem respondeu." : "Toque numa resposta para responder no chat, pôr no seu flash, ver o perfil ou apagar."));
    } catch (err) { if (minha === vez) conteudo.replaceChildren(el("div", "lista-vazia", "Não foi possível carregar: " + erroAmigavel(err))); }
  }
  carregar();
}
// =====================================================
// Destaques e arquivo (como no Instagram). Os flashes continuam guardados depois das 24 h: o ARQUIVO mostra os seus
// (só você vê). Um DESTAQUE junta flashes e fica no perfil para sempre:
// destaques/{id} {uid, nome ≤30, ids [flashes, ≤100], capa (id do flash da capa), capaMini (miniatura JPEG), criadoEm, atualizadoEm}.
// =====================================================
const MAX_DESTAQUES = 30, MAX_NO_DESTAQUE = 100;
const MESES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
function dataCurta(t) {
  const d = new Date(t || Date.now());
  return `${d.getDate()} ${MESES_CURTO[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? " " + d.getFullYear() : ""}`;
}
const erroDestaque = (e) => (e?.code === "permission-denied" ? "os destaques passam a funcionar depois da publicação das regras novas" : erroAmigavel(e));
const cacheDestaques = new Map();
function lerDestaques(uid, novo = false) {
  if (novo) cacheDestaques.delete(uid);
  if (!cacheDestaques.has(uid)) cacheDestaques.set(uid, fb.getDocs(fb.query(fb.collection(fb.db, "destaques"), fb.where("uid", "==", uid), fb.limit(MAX_DESTAQUES)))
    .then((x) => x.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })).sort((a, b) => ms(b.atualizadoEm || b.criadoEm) - ms(a.atualizadoEm || a.criadoEm)))
    .catch(() => []));
  return cacheDestaques.get(uid);
}
const avisarDestaques = () => { cacheDestaques.delete(eu.uid); dispatchEvent(new CustomEvent("hf:destaques")); };
// Os flashes de um destaque, na ordem em que foram publicados (os apagados e os que você não pode ver ficam de fora).
async function flashesDoDestaque(d) {
  const docs = await Promise.all((d.ids || []).slice(0, MAX_NO_DESTAQUE).map((id) => fb.getDoc(fb.doc(fb.db, "stories", id)).catch(() => null)));
  return docs.filter((x) => x?.exists()).map((x) => ({ id: x.id, ...x.data({ serverTimestamps: "estimate" }) }))
    .filter((x) => x.autorId === d.uid && (d.uid === eu.uid || podeVer(x))).sort((a, b) => ms(a.criadoEm) - ms(b.criadoEm));
}
// Miniatura redonda da capa (132 px, ~5 KB): o perfil mostra os destaques sem baixar os flashes.
function miniaturaFlash(midia) {
  return new Promise((ok) => {
    if (!midia || !/^(data:image|https:)/.test(midia)) { ok(""); return; }
    const im = new Image(); im.crossOrigin = "anonymous";
    im.onload = () => {
      try {
        const c = document.createElement("canvas"); c.width = c.height = 132; const g = c.getContext("2d");
        const k = Math.max(132 / im.naturalWidth, 132 / im.naturalHeight), w = im.naturalWidth * k, h = im.naturalHeight * k;
        g.drawImage(im, (132 - w) / 2, (132 - h) / 2, w, h); ok(c.toDataURL("image/jpeg", 0.72));
      } catch { ok(""); }
    };
    im.onerror = () => ok(""); im.src = midia;
  });
}
// Marca "destacado" nos flashes que entraram num destaque e tira dos que não estão em mais nenhum (os de fora das
// 24 h só continuam visíveis para os outros com essa marca).
async function marcarDestacados(antes, depois) {
  const todos = await lerDestaques(eu.uid, true);
  const emAlgum = new Set(todos.flatMap((d) => d.ids || []));
  const mudar = [...depois.filter((id) => !antes.includes(id)).map((id) => [id, true]), ...antes.filter((id) => !emAlgum.has(id)).map((id) => [id, false])];
  await Promise.all(mudar.map(([id, v]) => fb.updateDoc(fb.doc(fb.db, "stories", id), { destacado: v }).catch(() => {})));
}
async function gravarDestaque(d) {
  const antes = d.id ? ((await lerDestaques(eu.uid)).find((x) => x.id === d.id)?.ids || []) : [];
  const campos = { uid: eu.uid, nome: String(d.nome || "").trim().slice(0, 30) || "Destaque", ids: [...new Set(d.ids)].slice(0, MAX_NO_DESTAQUE), atualizadoEm: fb.serverTimestamp() };
  if (d.capa) campos.capa = String(d.capa).slice(0, 64);
  if (d.capaMini) campos.capaMini = d.capaMini; else if (d.id) campos.capaMini = fb.deleteField(); // capa de vídeo: sem miniatura
  if (d.id) await fb.updateDoc(fb.doc(fb.db, "destaques", d.id), campos);
  else d.id = (await fb.addDoc(fb.collection(fb.db, "destaques"), { ...campos, criadoEm: fb.serverTimestamp() })).id;
  await marcarDestacados(antes, campos.ids);
  avisarDestaques();
  return d;
}
// Tira um flash do destaque; se ficar vazio, o destaque é apagado. Devolve false quando apagou.
async function tirarDoDestaque(d, id) {
  const ids = (d.ids || []).filter((x) => x !== id);
  if (!ids.length) { await fb.deleteDoc(fb.doc(fb.db, "destaques", d.id)); await marcarDestacados(d.ids || [], []); avisarDestaques(); return false; }
  const novo = { ...d, ids };
  if (d.capa === id) { novo.capa = ids[ids.length - 1]; const f = await fb.getDoc(fb.doc(fb.db, "stories", novo.capa)).catch(() => null); novo.capaMini = f?.exists() ? await miniaturaFlash(f.data().tipo === "video" ? "" : f.data().midia) : ""; }
  Object.assign(d, await gravarDestaque(novo)); d.ids = ids;
  return true;
}
// Bolinha de um destaque (capa + nome).
function bolinhaDestaque(rot, capaMini, ic) {
  const b = el("button", "pf-dq"); b.type = "button";
  const c = el("span", "pf-dq-capa");
  if (capaMini && /^data:image\/jpeg;base64,/.test(capaMini)) { const im = document.createElement("img"); im.src = capaMini; im.alt = ""; c.appendChild(im); }
  else c.appendChild(icone(ic || "destaque", "i s"));
  b.append(c, el("span", "pf-dq-nome", rot));
  return b;
}
// Fileira de destaques no perfil (embaixo dos números, como no Instagram). No seu: "Novo" e "Arquivo".
export async function destaquesNoPerfil(corpo, uid) {
  if (!corpo || !uid) return;
  let fila = corpo.querySelector(".pf-destaques");
  if (!fila) { fila = el("div", "pf-destaques"); fila.setAttribute("aria-label", "Destaques"); corpo.appendChild(fila); }
  if (!fila._ouvindo) { fila._ouvindo = true; addEventListener("hf:destaques", () => { if (fila.isConnected) destaquesNoPerfil(corpo, uid); }); }
  const meu = uid === eu.uid;
  const ds = escondido(uid) ? [] : await lerDestaques(uid);
  if (!fila.isConnected) return;
  fila.replaceChildren();
  fila.hidden = !meu && !ds.length;
  if (meu) {
    const novo = bolinhaDestaque("Novo", "", "mais"); novo.classList.add("novo"); novo.setAttribute("aria-label", "Novo destaque");
    novo.addEventListener("click", () => novoDestaque());
    fila.appendChild(novo);
  }
  ds.forEach((d) => {
    const b = bolinhaDestaque(d.nome, d.capaMini);
    b.setAttribute("aria-label", `Destaque ${d.nome}`);
    b.addEventListener("click", () => abrirDestaque(d));
    if (meu) {
      // Segurar (ou botão direito) abre a edição, como no Instagram.
      let t = null;
      b.addEventListener("pointerdown", () => { t = setTimeout(() => { t = "foi"; navigator.vibrate?.(10); editarDestaque(d); }, 520); });
      ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, () => { if (t !== "foi") clearTimeout(t); }));
      b.addEventListener("click", (e) => { if (t === "foi") { e.stopImmediatePropagation(); t = null; } }, true);
      b.addEventListener("contextmenu", (e) => { e.preventDefault(); editarDestaque(d); });
    }
    fila.appendChild(b);
  });
  if (meu) {
    const arq = bolinhaDestaque("Arquivo", "", "relogio"); arq.classList.add("arquivo"); arq.setAttribute("aria-label", "Arquivo dos seus flashes");
    arq.addEventListener("click", () => abrirArquivo());
    fila.appendChild(arq);
  }
}
async function abrirDestaque(d) {
  toast("Abrindo o destaque...");
  const lista = await flashesDoDestaque(d);
  if (!lista.length) { toast(d.uid === eu.uid ? "Esse destaque não tem mais flashes." : "Esse destaque não está disponível."); return; }
  abrirVisor(d.uid, { lista, destaque: d });
}
// Adicionar um flash a um destaque (ou criar um novo com ele).
function adicionarAoDestaque(s, aoFechar) {
  const corpo = abrirLista("Destacar no perfil");
  const f = $("folhaLista"); const volta = () => { f?.removeEventListener("fechada", volta); aoFechar?.(); }; f?.addEventListener("fechada", volta);
  const fila = el("div", "dq-fila"); const form = el("div", "dq-form"); form.hidden = true;
  corpo.append(fila, form, el("p", "dq-nota", "Os destaques ficam no seu perfil, embaixo dos números, mesmo depois das 24 horas. Toque de novo para tirar."));
  fila.appendChild(el("div", "lista-vazia", "Carregando..."));
  const mini = miniaturaFlash(s.tipo === "video" ? "" : s.midia);
  const pintar = async () => {
    const ds = await lerDestaques(eu.uid);
    if (!corpo.isConnected) return;
    fila.replaceChildren();
    const novo = bolinhaDestaque("Novo", "", "mais"); novo.classList.add("novo");
    novo.addEventListener("click", async () => {
      if (ds.length >= MAX_DESTAQUES) { toast(`Você chegou ao máximo de ${MAX_DESTAQUES} destaques.`); return; }
      form.hidden = false; form.replaceChildren();
      const capa = el("span", "pf-dq-capa grande"); mini.then((m) => { if (m) { const im = document.createElement("img"); im.src = m; im.alt = ""; capa.replaceChildren(im); } });
      const campo = el("input", "dq-campo"); campo.type = "text"; campo.maxLength = 30; campo.placeholder = "Nome do destaque"; campo.setAttribute("aria-label", "Nome do destaque");
      const criar = el("button", "btn pri", "Criar"); criar.type = "button";
      form.append(capa, campo, criar); campo.focus();
      const ir = async () => {
        const nome = campo.value.trim(); if (!nome) { campo.focus(); return; }
        criar.disabled = true;
        try { await gravarDestaque({ nome, ids: [s.id], capa: s.id, capaMini: await mini }); toast(`Destacado em "${nome}"`); f?.querySelector("[data-fechar]")?.click(); }
        catch (e) { criar.disabled = false; toast("Não foi possível: " + erroDestaque(e)); }
      };
      criar.addEventListener("click", ir); campo.addEventListener("keydown", (e) => { if (e.key === "Enter") ir(); });
    });
    fila.appendChild(novo);
    ds.forEach((d) => {
      const tem = (d.ids || []).includes(s.id);
      const b = bolinhaDestaque(d.nome, d.capaMini); b.classList.toggle("on", tem); b.setAttribute("aria-pressed", String(tem));
      b.addEventListener("click", async () => {
        b.disabled = true;
        try {
          if (tem) { await tirarDoDestaque(d, s.id); toast(`Tirado de "${d.nome}"`); }
          else {
            if ((d.ids || []).length >= MAX_NO_DESTAQUE) { toast(`Esse destaque já tem ${MAX_NO_DESTAQUE} flashes.`); b.disabled = false; return; }
            await gravarDestaque({ ...d, ids: [...(d.ids || []), s.id] }); toast(`Destacado em "${d.nome}"`);
          }
          pintar();
        } catch (e) { b.disabled = false; toast("Não foi possível: " + erroDestaque(e)); }
      });
      fila.appendChild(b);
    });
  };
  pintar();
}
// Arquivo: os seus flashes (os de agora e os que já saíram do ar), 12 por vez. Com "selecionar", devolve os escolhidos.
function abrirArquivo({ selecionar = false, marcados = [], titulo = "Arquivo do Flash", botao = "Próximo" } = {}) {
  return new Promise((resolver) => {
    const corpo = abrirLista(titulo);
    const sel = new Map(); let concluiu = false;
    const f = $("folhaLista"); const fim = () => { f?.removeEventListener("fechada", fim); if (!concluiu) resolver(null); }; f?.addEventListener("fechada", fim);
    const grade = el("div", "dq-grade");
    const mais = el("button", "btn sec dq-mais", "Ver mais"); mais.type = "button"; mais.hidden = true;
    const ok = el("button", "btn pri dq-ok", botao); ok.type = "button"; ok.hidden = !selecionar; ok.disabled = true;
    corpo.append(el("p", "dq-nota", selecionar ? "Escolha os flashes. Eles aparecem no destaque na ordem em que foram publicados." : "Só você vê o arquivo. Os flashes saem do Diário depois de 24 horas, mas ficam guardados aqui para você ver de novo ou pôr num destaque."), grade, mais, ok);
    let ultimo = null; const todos = [];
    const pintarOk = () => { ok.disabled = !sel.size; ok.textContent = sel.size ? `${botao} (${sel.size})` : botao; };
    const tile = (x) => {
      const b = el("button", "dq-tile"); b.type = "button";
      if (x.tipo === "video") b.appendChild(icone("play", "i"));
      else { const im = document.createElement("img"); im.src = x.midia; im.alt = ""; im.loading = "lazy"; im.decoding = "async"; b.appendChild(im); }
      b.appendChild(el("span", "dq-data", dataCurta(ms(x.criadoEm))));
      if (ativo(x)) b.appendChild(el("span", "dq-ar", "No ar"));
      if (selecionar) {
        const marca = el("span", "dq-marca"); b.appendChild(marca);
        const pintarM = () => { const k = [...sel.keys()].indexOf(x.id); b.classList.toggle("on", k >= 0); marca.textContent = k >= 0 ? String(k + 1) : ""; };
        b.addEventListener("click", () => { if (sel.has(x.id)) sel.delete(x.id); else if (sel.size >= MAX_NO_DESTAQUE) toast(`No máximo ${MAX_NO_DESTAQUE} flashes por destaque.`); else sel.set(x.id, x); grade.querySelectorAll(".dq-tile").forEach((t) => t._pintar?.()); pintarOk(); });
        b._pintar = pintarM; pintarM();
      } else b.addEventListener("click", () => {
        // O visor fica por baixo das folhas: fecha o arquivo e volta para ele quando o flash fechar.
        const l = todos.slice().sort((a, c) => ms(a.criadoEm) - ms(c.criadoEm));
        f?.querySelector("[data-fechar]")?.click();
        setTimeout(() => abrirVisor(eu.uid, { lista: l, comecarEm: x.id, aoFechar: () => setTimeout(() => abrirArquivo(), 200) }), 260);
      });
      return b;
    };
    const pagina = async () => {
      mais.disabled = true;
      let docs = [], acabou = false;
      try {
        const x = await fb.getDocs(fb.query(fb.collection(fb.db, "stories"), fb.where("autorId", "==", eu.uid), fb.orderBy("criadoEm", "desc"), ...(ultimo ? [fb.startAfter(ultimo)] : []), fb.limit(12)));
        docs = x.docs; ultimo = x.docs[x.docs.length - 1] || ultimo; acabou = x.docs.length < 12;
      } catch {
        // Sem o índice (stories: autorId + criadoEm), lê os 60 mais recentes de uma vez.
        if (!ultimo) { const x = await fb.getDocs(fb.query(fb.collection(fb.db, "stories"), fb.where("autorId", "==", eu.uid), fb.limit(60))).catch(() => ({ docs: [] })); docs = x.docs.slice().sort((a, b) => ms(b.data().criadoEm) - ms(a.data().criadoEm)); }
        acabou = true;
      }
      const novos = docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })).filter((x) => !todos.some((y) => y.id === x.id));
      todos.push(...novos);
      novos.forEach((x) => { if (marcados.includes(x.id)) sel.set(x.id, x); });
      if (!todos.length) grade.replaceChildren(el("div", "lista-vazia", "Você ainda não publicou flashes."));
      else { grade.querySelector(".lista-vazia")?.remove(); novos.forEach((x) => grade.appendChild(tile(x))); grade.querySelectorAll(".dq-tile").forEach((t) => t._pintar?.()); }
      mais.hidden = acabou; mais.disabled = false; pintarOk();
    };
    grade.appendChild(el("div", "lista-vazia", "Carregando..."));
    mais.addEventListener("click", pagina);
    ok.addEventListener("click", () => { concluiu = true; resolver([...sel.values()]); f?.querySelector("[data-fechar]")?.click(); });
    pagina();
  });
}
// Novo destaque: escolhe os flashes no arquivo, depois o nome (a capa é o último escolhido; dá para trocar na edição).
async function novoDestaque() {
  const ds = await lerDestaques(eu.uid);
  if (ds.length >= MAX_DESTAQUES) { toast(`Você chegou ao máximo de ${MAX_DESTAQUES} destaques.`); return; }
  const escolhidos = await abrirArquivo({ selecionar: true, titulo: "Novo destaque" });
  if (!escolhidos?.length) return;
  await new Promise((r) => setTimeout(r, 280));
  const capaF = escolhidos[escolhidos.length - 1];
  const corpo = abrirLista("Novo destaque");
  const capa = el("span", "pf-dq-capa grande"); const mini = miniaturaFlash(capaF.tipo === "video" ? "" : capaF.midia);
  mini.then((m) => { if (m) { const im = document.createElement("img"); im.src = m; im.alt = ""; capa.replaceChildren(im); } });
  const campo = el("input", "dq-campo"); campo.type = "text"; campo.maxLength = 30; campo.placeholder = "Nome do destaque"; campo.setAttribute("aria-label", "Nome do destaque");
  const salvar = el("button", "btn pri dq-ok", "Salvar destaque"); salvar.type = "button";
  const form = el("div", "dq-form dq-form-col"); form.append(capa, campo);
  corpo.append(form, el("p", "dq-nota", `${escolhidos.length} ${escolhidos.length === 1 ? "flash" : "flashes"} · fica no seu perfil para sempre`), salvar);
  setTimeout(() => campo.focus(), 60);
  const ir = async () => {
    const nome = campo.value.trim(); if (!nome) { campo.focus(); toast("Dê um nome ao destaque."); return; }
    salvar.disabled = true;
    try {
      const ids = escolhidos.slice().sort((a, b) => ms(a.criadoEm) - ms(b.criadoEm)).map((x) => x.id);
      await gravarDestaque({ nome, ids, capa: capaF.id, capaMini: await mini });
      toast(`Destaque "${nome}" criado`); $("folhaLista")?.querySelector("[data-fechar]")?.click();
    } catch (e) { salvar.disabled = false; toast("Não foi possível: " + erroDestaque(e)); }
  };
  salvar.addEventListener("click", ir); campo.addEventListener("keydown", (e) => { if (e.key === "Enter") ir(); });
}
// Editar: nome, capa (um dos flashes), tirar flashes, pôr mais do arquivo e apagar o destaque.
async function editarDestaque(d) {
  const corpo = abrirLista("Editar destaque");
  corpo.appendChild(el("div", "lista-vazia", "Carregando..."));
  let lista = await flashesDoDestaque(d);
  if (!corpo.isConnected) return;
  let capa = d.capa, capaMini = d.capaMini || "";
  const capaEl = el("span", "pf-dq-capa grande");
  const pintarCapa = () => { capaEl.replaceChildren(); if (capaMini) { const im = document.createElement("img"); im.src = capaMini; im.alt = ""; capaEl.appendChild(im); } else capaEl.appendChild(icone("destaque", "i s")); };
  const campo = el("input", "dq-campo"); campo.type = "text"; campo.maxLength = 30; campo.value = d.nome || ""; campo.setAttribute("aria-label", "Nome do destaque");
  const form = el("div", "dq-form dq-form-col"); form.append(capaEl, campo);
  const grade = el("div", "dq-grade");
  const pintarGrade = () => {
    grade.replaceChildren(...lista.map((x) => {
      const b = el("div", "dq-tile" + (x.id === capa ? " capa" : ""));
      if (x.tipo === "video") b.appendChild(icone("play", "i")); else { const im = document.createElement("img"); im.src = x.midia; im.alt = ""; im.loading = "lazy"; b.appendChild(im); }
      const bCapa = el("button", "dq-bt-capa", x.id === capa ? "Capa" : "Usar como capa"); bCapa.type = "button";
      bCapa.addEventListener("click", async () => { capa = x.id; capaMini = await miniaturaFlash(x.tipo === "video" ? "" : x.midia); pintarCapa(); pintarGrade(); });
      const bTirar = el("button", "dq-bt-tirar"); bTirar.type = "button"; bTirar.setAttribute("aria-label", "Tirar do destaque"); bTirar.appendChild(icone("fechar", "i xs"));
      bTirar.addEventListener("click", () => { if (lista.length === 1) { toast("Um destaque precisa de pelo menos 1 flash. Para tirar tudo, apague o destaque."); return; } lista = lista.filter((y) => y.id !== x.id); if (capa === x.id) { const c = lista[lista.length - 1]; capa = c.id; miniaturaFlash(c.tipo === "video" ? "" : c.midia).then((m) => { capaMini = m; pintarCapa(); }); } pintarGrade(); });
      b.append(bTirar, bCapa);
      return b;
    }));
  };
  const add = el("button", "btn sec", "Pôr mais flashes"); add.type = "button";
  const salvar = el("button", "btn pri dq-ok", "Salvar"); salvar.type = "button";
  const apagar = el("button", "btn perigo dq-apagar", "Apagar destaque"); apagar.type = "button";
  corpo.replaceChildren(form, el("p", "dq-sec", "Flashes"), grade, add, salvar, apagar);
  pintarCapa(); pintarGrade();
  add.addEventListener("click", async () => {
    const dados0 = { nome: campo.value, lista, capa, capaMini };
    const esc = await abrirArquivo({ selecionar: true, marcados: lista.map((x) => x.id), titulo: "Pôr mais flashes", botao: "Pronto" });
    await new Promise((r) => setTimeout(r, 280));
    if (esc) { lista = esc.slice().sort((a, b) => ms(a.criadoEm) - ms(b.criadoEm)); if (!lista.some((x) => x.id === capa) && lista.length) { capa = lista[lista.length - 1].id; capaMini = await miniaturaFlash(lista[lista.length - 1].midia); } }
    editarDestaque({ ...d, nome: dados0.nome, ids: lista.map((x) => x.id), capa: capa || dados0.capa, capaMini: capaMini || dados0.capaMini });
  });
  salvar.addEventListener("click", async () => {
    salvar.disabled = true;
    try { await gravarDestaque({ ...d, nome: campo.value, ids: lista.map((x) => x.id), capa, capaMini }); toast("Destaque salvo"); $("folhaLista")?.querySelector("[data-fechar]")?.click(); }
    catch (e) { salvar.disabled = false; toast("Não foi possível: " + erroDestaque(e)); }
  });
  apagar.addEventListener("click", async () => {
    if (!await confirmarHF({ titulo: `Apagar "${d.nome}"?`, texto: "O destaque sai do seu perfil. Os flashes continuam no seu arquivo.", ok: "Apagar", icone: "lixo" })) return;
    try { await fb.deleteDoc(fb.doc(fb.db, "destaques", d.id)); await marcarDestacados(d.ids || [], []); avisarDestaques(); toast("Destaque apagado"); $("folhaLista")?.querySelector("[data-fechar]")?.click(); }
    catch (e) { toast("Não foi possível: " + erroDestaque(e)); }
  });
}

// Salvar a foto do flash no aparelho.
function salvarFotoFlash(s) {
  try {
    const a = document.createElement("a"); a.href = s.midia; a.download = `flash-${new Date(ms(s.criadoEm) || Date.now()).toISOString().slice(0, 16).replace(/[:T]/g, "-")}.jpg`;
    a.target = "_blank"; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove();
    toast("Foto do flash salva");
  } catch { toast("Não foi possível salvar a foto."); }
}
// Link do flash (feed.html?flash=ID): compartilha pelo celular ou copia.
async function compartilharLinkFlash(s) {
  const url = new URL(`feed.html?flash=${encodeURIComponent(s.id)}`, location.href).href;
  const nome = String(s.nome || "").split(" ")[0];
  try {
    if (navigator.share) { await navigator.share({ title: "Flash no Help Floripa", text: nome ? `Flash de ${nome} no Help Floripa` : "Flash no Help Floripa", url }); return; }
  } catch (e) { if (e?.name === "AbortError") return; }
  try { await navigator.clipboard.writeText(url); toast("Link do flash copiado"); } catch { toast(url); }
}
// "some em 5 h": quanto falta para o flash sair do ar (24 h depois de publicado).
function restaTexto(s) {
  const falta = (ms(s.criadoEm) || Date.now()) + 24 * 3600e3 - Date.now();
  if (falta <= 0) return "já saiu do ar";
  const h = Math.floor(falta / 3600e3);
  return h >= 1 ? `some em ${h} h` : `some em ${Math.max(1, Math.round(falta / 60e3))} min`;
}

// Resposta da caixa de perguntas no seu flash (como no Instagram): a pergunta em cima e a resposta embaixo, sem o nome
// de quem respondeu. Abre o criador com a imagem pronta (dá para escrever por cima e pôr figurinhas).
export async function compartilharRespostaNoFlash({ pergunta, texto, cor = "" }) {
  // A resposta vira uma FIGURINHA por cima do fundo (como no Instagram): dá para trocar o fundo, mover, aumentar e girar.
  const W = 1080, H = 1920, CW = 860;
  const medir = document.createElement("canvas").getContext("2d");
  medir.font = `800 50px ${FONTE}`; const lp = linhasDe(medir, pergunta, CW - 120, 4);
  medir.font = `600 54px ${FONTE}`; const lr = linhasDe(medir, texto, CW - 120, 8);
  const hP = 110 + lp.length * 64, hR = 70 + lr.length * 70, CH = hP + hR, M = 40;
  const c = document.createElement("canvas"); c.width = CW + M * 2; c.height = CH + M * 2;
  const g = c.getContext("2d");
  if (!g.roundRect) g.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };
  const COR = { escuro: ["#2a3540", "#151b21"], azul: ["#19b8f2", "#0052d4"], rosa: ["#ff5f95", "#c2185b"], laranja: ["#ffb347", "#ff6a00"], verde: ["#34d399", "#0f8a5f"], roxo: ["#a855f7", "#5b21b6"] }[cor] || ["#00c2ff", "#0066d6"];
  g.save(); g.shadowColor = "rgba(0,0,0,.28)"; g.shadowBlur = 36; g.shadowOffsetY = 12;
  g.fillStyle = "#fff"; g.beginPath(); g.roundRect(M, M, CW, CH, 44); g.fill(); g.restore();
  g.save(); g.beginPath(); g.roundRect(M, M, CW, CH, 44); g.clip();
  const faixa = g.createLinearGradient(M, M, M + CW, M + hP); faixa.addColorStop(0, COR[0]); faixa.addColorStop(1, COR[1]);
  g.fillStyle = faixa; g.fillRect(M, M, CW, hP); g.restore();
  g.textAlign = "center"; g.fillStyle = "rgba(255,255,255,.85)"; g.font = `800 30px ${FONTE}`;
  g.fillText("CAIXA DE PERGUNTAS", M + CW / 2, M + 62);
  g.fillStyle = "#fff"; g.font = `800 50px ${FONTE}`;
  lp.forEach((t, i) => g.fillText(t, M + CW / 2, M + 122 + i * 64));
  g.fillStyle = TINTA; g.font = `600 54px ${FONTE}`;
  lr.forEach((t, i) => g.fillText(t, M + CW / 2, M + hP + 80 + i * 70));
  const cartao = await new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.src = c.toDataURL("image/png"); });
  // Fundo inicial (degradê na cor da caixa); "Fotos → Trocar o fundo" troca só ele.
  const f = document.createElement("canvas"); f.width = W; f.height = H;
  const gf = f.getContext("2d"), gr = gf.createLinearGradient(0, 0, W, H);
  gr.addColorStop(0, "#0b1620"); gr.addColorStop(1, COR[1]);
  gf.fillStyle = gr; gf.fillRect(0, 0, W, H);
  const imagem = f.toDataURL("image/jpeg", 0.9);
  // Fecha as janelas por cima (respostas e o visor do flash) antes de abrir o criador.
  document.querySelector("#folhaLista.aberta [data-fechar]")?.click();
  document.querySelector(".story-visor .story-btn[aria-label='Fechar']")?.click();
  setTimeout(() => abrirCriador({ imagem, selo: "Resposta da caixa de perguntas", figuras: [{ img: cartao, tam: (CW + M * 2) / W }] }), 250);
}
