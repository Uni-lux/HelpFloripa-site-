// Código da página (saiu de dentro do HTML para ficar guardado no aparelho pelo service worker: a página abre mais rápido).
import { ligarPuxar } from "./puxar-atualizar.js?v=6";
import {
  $, ms, paraData, LIMITE_DOC, el, icone, iniciais, urlSegura, pintarAvatar, pintarCapa, nomeCidade, numero, tempoRelativo, dataCompleta,
  toast, erroAmigavel, notificar, abrirFolha, fecharFolha, pilha, abrirOpcoes, abrirLista, confirmarHF,
  fb, authFns, storageFns, eu, refUsuario, dados, perfis, meusSeguindo, meusBloqueios, bloqueadoPor, restritos, escondido, ganchos,
  obterPerfil, lerOrdenado, editarPublicacao, comMencoes, salvarImagem, iniciarRede, meusSeguindoPronto, carregarMeusSeguindo, alternarSeguir, botaoSeguir, linhaPessoa, pessoasEmPilha, blocoCasado,
  removerSeguidor, bloquear, desbloquear, alternarRestricao, compartilharPerfil,
  barraInteracao, montarComentarios, abrirCompositor, montarBarraRede, pintarBarraRede, ouvirAvisos, editarImagem, conferirEmail,
  fotosDoPost, carrosselFotos, idsSalvos, listaColecoes, gravarColecoes, novaColecao, escolherColecao, alternarSalvo, contadorEstrelas, silenciado, alternarSilenciar, marcarVista, definirOrigem, lerResumosEstrelas, contarComentarios, blocoEnquete, blocoCaixa, atualizarMinhasPublicacoes, apagarFlashesDaPublicacao
} from "./rede.js?v=161";
import { buscarPessoas, palavrasBusca } from "./pessoas.js?v=6";
import { abrirDenuncia } from "./denuncias.js?v=7";
import { camposEndereco, gravarComLocal, NOVOS, textoCidade } from "./endereco.js?v=1";
import { avaliarNegocio, avaliarCliente, lerResumo, estrelas, pintarEstrelas } from "./avaliacoes.js?v=20";
import { lerLinks, pintarLinks, pintarProfissao, gravarLinks, esquecerLinks, montarEditorLinks, TIPOS_LINK } from "./links-perfil.js?v=4";
import { abrirDetalhe as abrirPerfilNegocio, prepararConversa } from "./vitrine.js?v=100";
import { anelNegocio, esquecerFlashesNegocio } from "./flash-negocio.js?v=23";
import { semPausados } from "./planos-base.js?v=16";
import { anelNoPerfil, novoFlash, destaquesNoPerfil, voltarAoFlash, novoDestaque, abrirArquivo } from "./stories.js?v=133";
import { abrirVerificacao, explicarSelo } from "./verificacao.js?v=118";
import { completarGuardados, apagarComGuardado, motivoTexto } from "./guardar.js?v=1";

// ======================================================
// Estado desta página (o resto vem de rede.js)
// ======================================================
let meusPosts = [];
let meusVinculos = [];

// ======================================================
// Cabeçalho de perfil (seu e dos outros)
// ======================================================
function montarCabecalho(raiz) {
  raiz.replaceChildren($("tplPerfil").content.cloneNode(true));
  const el = (n) => raiz.querySelector(`[data-el="${n}"]`);
  const stat = (n) => raiz.querySelector(`[data-stat="${n}"]`);
  return { raiz, el, stat };
}

// ---------- O que aparece no perfil (12/11/2026, pedido dele: perfil enxuto, o resto só se a pessoa ativar) ----------
// pref_publicas/{uid}: negociosNoPerfil (já existia) e perfil {cidade, nota, destaques}. Padrão: tudo aparece.
const cachePref = new Map();
function prefPublicas(uid) {
  if (!cachePref.has(uid)) cachePref.set(uid, fb.getDoc(fb.doc(fb.db, "pref_publicas", uid)).then((d) => (d.exists() ? d.data() : {})).catch(() => ({})));
  return cachePref.get(uid);
}
const mostraNoPerfil = (pref, k) => k === "negocios" ? pref?.negociosNoPerfil !== false : pref?.perfil?.[k] !== false;
async function salvarPref(campos) {
  const atual = await prefPublicas(eu.uid);
  const novo = { ...atual, ...campos, perfil: { ...(atual.perfil || {}), ...(campos.perfil || {}) } };
  if (!campos.perfil) delete novo.perfil;
  cachePref.set(eu.uid, Promise.resolve(novo));
  try {
    await fb.setDoc(fb.doc(fb.db, "pref_publicas", eu.uid), { ...campos, atualizadoEm: fb.serverTimestamp() }, { merge: true });
    return true;
  } catch (e) {
    cachePref.set(eu.uid, Promise.resolve(atual));
    toast(e?.code === "permission-denied" ? "Essa escolha passa a valer depois da publicação das regras novas." : "Não foi possível salvar agora.");
    return false;
  }
}
// Cidade, avaliação e destaques seguem a escolha (também no seu perfil: você vê como os outros veem).
function aplicarPref(h, pref) {
  h.raiz.querySelectorAll(".pf-handle .pf-cidade").forEach((x) => { x.hidden = !mostraNoPerfil(pref, "cidade"); });
  h.raiz.querySelector(".pf-corpo")?.classList.toggle("sem-destaques", !mostraNoPerfil(pref, "destaques"));
  // Pronomes e profissão (opcionais). No seu perfil vale também a cópia da conta (antes das regras novas).
  const meu = h === meuCab;
  const pron = String(pref?.pronomes || (meu ? dados.pronomes : "") || "").trim(), prof = String(pref?.profissao || (meu ? dados.profissao : "") || "").trim();
  const ep = h.el("pron"), ef = h.el("prof");
  if (ep) { ep.textContent = pron; ep.hidden = !pron; }
  h._prof = prof;
  if (ef) pintarProfissao(ef, prof, h._linkedin, { proprio: meu });
}

function preencherCabecalho(h, p, { posts = 0, seguidores = 0, seguindo = 0 } = {}) {
  pintarCapa(h.el("capa"), p.fotoCapa);
  pintarAvatar(h.el("avatar"), p.fotoPerfil, p.nome);
  h.el("nome").textContent = p.nome || "Usuário";
  h.el("selo").hidden = !p.verificado;
  // Tocar no selo: o que ele quer dizer (como nas outras redes).
  const selo = h.el("selo"); selo.setAttribute("role", "button"); selo.tabIndex = 0;
  selo.onclick = (e) => { e.stopPropagation(); explicarSelo(p.nome || ""); };
  const handle = h.el("handle");
  handle.replaceChildren();
  // O @ fica no topo (o seu e o de quem você visita): embaixo do nome só a cidade. Sem topo (outros lugares), mostra.
  if (p.nickname && h !== meuCab && h !== ppCab) {
    const s = document.createElement("span");
    s.textContent = "@" + p.nickname;
    handle.appendChild(s);
  }
  const cidade = textoCidade({ cidade: nomeCidade(p.cidade || p.cidadeNome), uf: p.uf });
  if (cidade) {
    const s = document.createElement("span"); s.className = "pf-cidade";
    s.append(icone("pin", "i xs"), document.createTextNode(cidade));
    handle.appendChild(s);
  }
  const bio = h.el("bio");
  bio.textContent = p.bio || "";
  bio.classList.remove("vazia");
  bio.hidden = !p.bio;
  h.stat("posts").querySelector(".num").textContent = numero(posts);
  h.stat("seguidores").querySelector(".num").textContent = numero(seguidores);
  h.stat("seguindo").querySelector(".num").textContent = numero(seguindo);
}
// Perfil pessoal sem a média das estrelas (13/11/2026, pedido dele): a avaliação fica só nos perfis de negócio.
// Links (Instagram/WhatsApp) em ícones pequenos embaixo da bio; cada um com "quem pode ver" (links-perfil.js).
function pintarLinksPerfil(h, uid, { proprio = false } = {}) {
  const alvo = h?.el("links");
  if (!alvo) return;
  h._linkedin = null;
  // pref_publicas.redes diz quais redes a pessoa tem: lê só essas (sem o campo, tenta todas).
  prefPublicas(uid).then((pref) => lerLinks(fb, uid, { proprio, dados: proprio ? dados : null, redes: pref?.redes }))
    .then((l) => {
      if (h.el("links") !== alvo) return;
      pintarLinks(alvo, l, { proprio });
      h._linkedin = l.linkedin || null;
      pintarProfissao(h.el("prof"), h._prof || "", h._linkedin, { proprio });
    })
    .catch(() => {});
}

// ---------- meu perfil ----------
let meuCab = null;
function renderizarMeuPerfil() {
  if (!meuCab) {
    meuCab = montarCabecalho($("meuPerfil"));
    // Botões de foto e capa
    const btnCapa = document.createElement("button");
    btnCapa.type = "button";
    btnCapa.className = "pf-editar-capa so-icone";
    btnCapa.setAttribute("aria-label", "Trocar a capa"); btnCapa.title = "Trocar a capa";
    btnCapa.append(icone("camera", "i xs"));
    btnCapa.addEventListener("click", () => escolherImagem("capa", true));
    meuCab.el("capa").appendChild(btnCapa);
    // Sem o "+" na foto (13/11/2026, pedido dele): o novo flash fica no Diário e na foto grande (tocar e segurar).
    segurarFoto(meuCab.raiz.querySelector(".pf-avatar-wrap"), () => ({ uid: eu.uid, p: dados, proprio: true }));
    anelNoPerfil(meuCab.el("avatar"), eu.uid);
    voltarAoFlash(); // voltou de um link aberto de dentro de um flash
    // Destaques do Flash (embaixo dos números, como no Instagram)
    destaquesNoPerfil(meuCab.raiz.querySelector(".pf-corpo"), eu.uid);
    // Ações
    const acoes = meuCab.el("acoes");
    const bEditar = document.createElement("button");
    bEditar.type = "button"; bEditar.className = "btn pri";
    bEditar.textContent = "Editar perfil";
    bEditar.addEventListener("click", abrirEditar);
    // Perfil enxuto (12/11/2026): Editar perfil · Compartilhar · ⋯ (Social, estatísticas, negócios, destaques, selo e o
    // que aparece no perfil ficam no ⋯).
    const bComp = document.createElement("button");
    bComp.type = "button"; bComp.className = "btn sec";
    bComp.textContent = "Compartilhar";
    bComp.addEventListener("click", () => compartilharPerfil(eu.uid, dados.nome));
    const bMais = document.createElement("button");
    bMais.type = "button"; bMais.className = "btn sec icone"; bMais.id = "meuPerfilMais";
    bMais.setAttribute("aria-label", "Mais opções do perfil"); bMais.title = "Mais opções";
    bMais.appendChild(icone("pontos", "i s"));
    bMais.addEventListener("click", menuMeuPerfil);
    acoes.append(bEditar, bComp, bMais);
    // Estatísticas
    meuCab.stat("posts").addEventListener("click", () => $("painelPosts").scrollIntoView({ behavior: "smooth", block: "start" }));
    meuCab.stat("seguidores").addEventListener("click", () => abrirListaRelacoes(eu.uid, "seguidores"));
    meuCab.stat("seguindo").addEventListener("click", () => abrirListaRelacoes(eu.uid, "seguindo"));
  }
  pintarMeuSocial();
  preencherCabecalho(meuCab, dados, { posts: meusPosts.length, seguidores: contagem.seguidores, seguindo: contagem.seguindo });
  pintarLinksPerfil(meuCab, eu.uid, { proprio: true });
  // Sem bio ou sem links o perfil fica limpo, como nas outras redes (adiciona-se em Editar perfil).
  // Estatísticas, selo e o resto ficam no ⋯ e no ícone ao lado dos números (antes eram cartões grandes aqui).
  meuCab.el("extra").replaceChildren();
  prefPublicas(eu.uid).then((pref) => aplicarPref(meuCab, pref));
  desenharDuoCapa(meuCab, eu.uid, dados, meusVinculos, (dados.duoCapa || "clicavel") === "clicavel");
  renderizarNegocios(meuCab.el("negocios"), meusNegocios, { proprio: true, dono: dados });
  pintarAvatar($("comporAvatar"), dados.fotoPerfil, dados.nome);
  document.title = `${dados.nome || "Meu perfil"} | Help Floripa`;
  // @nome no topo, com a letra da marca (12/11/2026, pedido dele)
  const tn = $("topoNick");
  if (tn) {
    tn.replaceChildren();
    const n = document.createElement("span"); n.className = "tn-nome";
    if (dados.nickname) { const a = document.createElement("i"); a.textContent = "@"; n.append(a, document.createTextNode(dados.nickname)); }
    else n.textContent = dados.nome || "";
    tn.append(n);
    if (dados.verificado) { const v = icone("selo", "i tn-selo"); v.setAttribute("aria-label", "Verificado"); tn.append(v); }
    tn.title = n.textContent;
  }
}

// ⋯ do seu perfil: tudo o que não precisa ficar à mostra.
function menuMeuPerfil() {
  const ops = [
    { rotulo: "O que aparece no perfil", sub: "Cidade, negócios e destaques", icone: "olho", fn: personalizarPerfil },
    { rotulo: "Redes e contatos", sub: "Instagram, WhatsApp, TikTok, X e YouTube", icone: "link", fn: () => abrirEditar("links") },
    { rotulo: "Estatísticas do perfil", sub: "Alcance, interações, seguidores e público", icone: "graf", fn: abrirInsightsPerfil },
    { rotulo: "Social", sub: "Duo, família e amigos", icone: "teia", fn: () => { location.href = "social.html"; } },
    { rotulo: "Novo destaque", sub: "Junte flashes num destaque do perfil", icone: "estrela", fn: () => novoDestaque() },
    { rotulo: "Arquivo do Flash", sub: "Seus flashes que já saíram", icone: "relogio", fn: () => abrirArquivo() },
    { rotulo: meusNegocios.length ? "Meus negócios" : "Criar um negócio", sub: meusNegocios.length ? "Editar, planos e estatísticas" : "Serviços, delivery, loja, imóveis...", icone: "maleta", fn: () => { location.href = meusNegocios.length ? "negocios.html" : "negocios.html?novo=1"; } }
  ];
  if (!dados.verificado) ops.push({ rotulo: dados.solicitacaoVerificacao ? "Verificação em análise" : "Pedir o selo de verificado", icone: "selo", fn: solicitarVerificacao });
  abrirOpcoes("Seu perfil", ops);
}
// O que aparece no perfil para quem visita (e para você, igual): só o essencial fica sempre.
async function personalizarPerfil() {
  const pref = await prefPublicas(eu.uid);
  const itens = [
    ["cidade", "Cidade", "pin"], ["negocios", "Atalhos dos negócios", "maleta"], ["destaques", "Destaques do Flash", "raio"]
  ];
  abrirOpcoes("O que aparece no seu perfil", itens.map(([k, rot, ic]) => {
    const on = mostraNoPerfil(pref, k);
    return { rotulo: rot, sub: on ? "Aparece · tocar para esconder" : "Escondido · tocar para mostrar", icone: on ? ic : "olho-off",
      fn: async () => {
        const ok = k === "negocios" ? await salvarPref({ negociosNoPerfil: !on }) : await salvarPref({ perfil: { [k]: !on } });
        if (!ok) return;
        toast(`${rot}: ${on ? "escondido do perfil" : "aparece no perfil"}`);
        renderizarMeuPerfil();
        setTimeout(personalizarPerfil, 250);
      } };
  }));
}

function abrirInsightsPerfil() {
  import("./insights.js?v=125").then((m) => m.abrirInsights()).catch((e) => toast("Não foi possível abrir as estatísticas: " + erroAmigavel(e)));
}

// ======================================================
// Foto de perfil ampliada: tocar e SEGURAR na foto (como no Instagram), com as opções do Help Floripa.
// ======================================================
function segurarFoto(wrap, dadosFoto) {
  if (wrap._segurar) return;
  wrap._segurar = true;
  let tempo = null, x0 = 0, y0 = 0;
  const parar = () => { clearTimeout(tempo); tempo = null; wrap.classList.remove("segurando"); };
  wrap.addEventListener("pointerdown", (e) => {
    if (e.button || e.target.closest(".pf-editar-foto, .pf-rosa, .pf-duo-bolha")) return;
    x0 = e.clientX; y0 = e.clientY; wrap.classList.add("segurando");
    tempo = setTimeout(() => { tempo = null; wrap.classList.remove("segurando"); wrap._segurou = true; setTimeout(() => { wrap._segurou = false; }, 700); navigator.vibrate?.(12); abrirFotoGrande(dadosFoto()); }, 420);
  });
  wrap.addEventListener("pointermove", (e) => { if (tempo && Math.hypot(e.clientX - x0, e.clientY - y0) > 10) parar(); });
  ["pointerup", "pointercancel", "pointerleave"].forEach((t) => wrap.addEventListener(t, () => { if (tempo) parar(); }));
  wrap.addEventListener("contextmenu", (e) => e.preventDefault());
  // Depois de segurar, o toque não abre o flash (o clique que vem junto é engolido aqui).
  wrap.addEventListener("click", (e) => { if (wrap._segurou) { wrap._segurou = false; e.stopPropagation(); e.preventDefault(); } }, true);
}
function abrirFotoGrande({ uid, p, proprio }) {
  document.querySelector(".foto-grande")?.remove();
  const tela = el("div", "foto-grande"); tela.setAttribute("role", "dialog"); tela.setAttribute("aria-modal", "true"); tela.setAttribute("aria-label", `Foto de ${p.nome || "perfil"}`);
  const fechar = () => { tela.classList.add("saindo"); document.removeEventListener("keydown", tecla); setTimeout(() => tela.remove(), 200); };
  const tecla = (e) => { if (e.key === "Escape") fechar(); };
  const bX = el("button", "fg-fechar"); bX.type = "button"; bX.setAttribute("aria-label", "Fechar"); bX.appendChild(icone("fechar", "i"));
  bX.addEventListener("click", fechar);
  const centro = el("div", "fg-centro");
  const foto = el("div", "fg-foto");
  const av = el("div", "avatar"); pintarAvatar(av, p.fotoPerfil, p.nome);
  foto.appendChild(av);
  if (proprio) {
    const lap = el("button", "fg-lapis"); lap.type = "button"; lap.setAttribute("aria-label", "Trocar a foto de perfil"); lap.appendChild(icone("lapis", "i"));
    lap.addEventListener("click", () => { fechar(); escolherImagem("foto", true); });
    foto.appendChild(lap);
  }
  const nome = el("div", "fg-nome"); nome.append(el("strong", null, p.nome || "Usuário"));
  if (p.nickname) nome.append(el("span", null, "@" + p.nickname));
  centro.append(foto, nome);
  const url = `${location.origin}${location.pathname.replace(/[^/]*$/, "")}usuarios.html?perfil=${encodeURIComponent(uid)}`;
  const copiar = async () => { try { await navigator.clipboard.writeText(url); toast("Link do perfil copiado"); } catch { toast("Não foi possível copiar."); } };
  const temFlash = !!document.querySelector(proprio ? "#meuPerfil .pf-anel.com-flash" : "#ppCabecalho .pf-anel.com-flash");
  const ops = proprio
    ? [["mais", "Novo flash", () => { fechar(); novoFlash(() => anelNoPerfil(meuCab.el("avatar"), eu.uid)); }], ["compartilhar", "Compartilhar perfil", () => compartilharPerfil(uid, p.nome)],
       ["link", "Copiar link", copiar], ["lapis", "Editar perfil", () => { fechar(); abrirEditar(); }]]
    : [["chat", "Mensagem", () => { fechar(); iniciarConversa(uid); }], ["compartilhar", "Compartilhar perfil", () => compartilharPerfil(uid, p.nome)], ["link", "Copiar link", copiar],
       temFlash ? ["raio", "Ver flash", () => { fechar(); $("ppCabecalho").querySelector(".pf-anel .avatar")?.click(); }]
                : ["teia", "Social", () => { location.href = `social.html?uid=${encodeURIComponent(uid)}`; }]];
  const barra = el("div", "fg-acoes");
  ops.forEach(([ic, rot, fn]) => {
    const b = el("button", "fg-acao"); b.type = "button";
    const c = el("span", "fg-circ"); c.appendChild(icone(ic, "i"));
    b.append(c, el("span", "fg-rot", rot));
    b.addEventListener("click", fn);
    barra.appendChild(b);
  });
  tela.append(bX, centro, barra);
  tela.addEventListener("click", (e) => { if (e.target === tela || e.target === centro) fechar(); });
  document.addEventListener("keydown", tecla);
  document.body.appendChild(tela);
}

const contagem = { seguidores: 0, seguindo: 0 };
const ppContagem = { seguidores: 0, seguindo: 0 }; // do perfil aberto (abas da lista)
async function contarRelacoes(campo, uid) {
  const q = fb.query(fb.collection(fb.db, "relacoes"), fb.where("tipo", "==", "seguir"), fb.where(campo, "==", uid));
  try { return (await fb.getCountFromServer(q)).data().count; }
  catch { return (await fb.getDocs(q)).size; }
}
async function atualizarContagens() {
  try {
    const [a, b] = await Promise.all([contarRelacoes("alvoId", eu.uid), contarRelacoes("seguidorId", eu.uid)]);
    contagem.seguidores = a; contagem.seguindo = b;
    renderizarMeuPerfil();
  } catch (e) { console.warn("Contagens indisponíveis:", e); }
}

// ======================================================
// Publicações
// ======================================================
async function buscarPosts(uid) {
  const col = fb.collection(fb.db, "diario");
  const snap = await lerOrdenado(
    fb.query(col, fb.where("autorId", "==", uid), fb.orderBy("criadoEm", "desc"), fb.limit(120)),
    fb.query(col, fb.where("autorId", "==", uid), fb.limit(120)));
  let lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (uid === eu.uid) {
    // As suas escondidas de verdade (esqueletos sem criadoEm não vêm na consulta ordenada) e as agendadas
    // (agendadas/{id}, só você vê): guardar.js e agendadas.js.
    const [esq, ag] = await Promise.all([
      fb.getDocs(fb.query(col, fb.where("autorId", "==", uid), fb.where("guardado", "==", true), fb.limit(60))).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }))).catch(() => []),
      import("./agendadas.js?v=2").then(async (m) => {
        // Agendadas antigas (no Diário com data futura): passam para o lugar novo.
        for (const x of lista.filter((p) => (p.agendadoPara?.toMillis?.() ?? 0) > Date.now())) await m.moverAntiga(fb, uid, x).catch(() => {});
        return m.minhasAgendadas(fb, uid);
      }).catch(() => [])
    ]);
    const agIds = new Set(ag.map((x) => x.id)), ja = new Set(lista.map((x) => x.id));
    lista = [...ag, ...(await completarGuardados(fb, "diario", [...lista.filter((x) => !agIds.has(x.id)), ...esq.filter((x) => !ja.has(x.id))]))];
  }
  return lista.filter((x) => uid === eu.uid || ((x.ocultoAte?.toMillis?.() ?? 0) <= Date.now() && (x.agendadoPara?.toMillis?.() ?? 0) <= Date.now())).sort((a, b) => (ms(b.criadoEm) || Date.now()) - (ms(a.criadoEm) || Date.now()));
}

// Republicados (13/11/2026, pedido dele): as publicações de outras pessoas que a pessoa republicou (republicacoes/{post}_{uid}),
// da mais nova para a mais antiga. Lidas só quando a aba abre.
const repubCache = new Map();
async function buscarRepublicados(uid) {
  const col = fb.collection(fb.db, "republicacoes");
  const snap = await lerOrdenado(
    fb.query(col, fb.where("uid", "==", uid), fb.orderBy("criadoEm", "desc"), fb.limit(60)),
    fb.query(col, fb.where("uid", "==", uid), fb.limit(60))).catch(() => ({ docs: [] }));
  const reps = snap.docs.map((d) => d.data()).filter((r) => r.postId).sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
  const posts = await Promise.all(reps.map((r) => fb.getDoc(fb.doc(fb.db, "diario", r.postId)).then((d) => (d.exists() ? { id: d.id, ...d.data(), _repubEm: r.criadoEm } : null)).catch(() => null)));
  return posts.filter((x) => x && x.autorId !== uid && !escondido(x.autorId) && (x.ocultoAte?.toMillis?.() ?? 0) <= Date.now() && (x.agendadoPara?.toMillis?.() ?? 0) <= Date.now());
}
const temMidia = (p) => !!urlSegura(p.mediaUrl);
// Abas do perfil (13/11/2026, pedido dele): Publicações (fotos, textos e enquetes juntos, na ordem) · Vídeos ·
// Republicados · Salvos (só você). Textos e Marcados saíram (os textos vão na grade, como cartão).
const ABAS_PERFIL = [["posts", "Publicações", "grade"], ["reels", "Vídeos", "reels"], ["repub", "Republicados", "republicar"], ["salvos", "Salvos", "salvo"]];
const abaDaGrade = new WeakMap();
function renderizarGrade(container, posts, opcoes) {
  const { uid, proprio } = opcoes;
  if (!uid) { desenharGrade(container, posts, opcoes); return; }
  let barra = opcoes.barra || container.previousElementSibling;
  if (!barra?.classList.contains("abas-perfil")) { barra = el("div", "abas-perfil"); barra.setAttribute("role", "tablist"); barra.setAttribute("aria-label", "Conteúdo do perfil"); container.before(barra); }
  let atual = abaDaGrade.get(container) || "posts";
  if (!ABAS_PERFIL.some(([k]) => k === atual) || (atual === "salvos" && !proprio)) atual = "posts";
  if (atual === "repub" && !repubCache.has(uid)) {
    repubCache.set(uid, null);
    buscarRepublicados(uid).then((l) => { repubCache.set(uid, l); if (container.isConnected && abaDaGrade.get(container) === "repub") renderizarGrade(container, posts, opcoes); })
      .catch(() => repubCache.set(uid, []));
  }
  const grupos = {
    posts,
    reels: posts.filter((p) => temMidia(p) && p.mediaTipo === "video"),
    repub: (repubCache.get(uid) || []).map((p) => ({ ...p, _marcacao: true, _repub: true }))
  };
  ultimaGrade = { container, posts, opcoes }; if (!abaInicial) abaInicial = atual;
  barra.replaceChildren(...ABAS_PERFIL.filter(([k]) => k !== "salvos" || proprio).map(([k, rot, ic]) => {
    const b = el("button"); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(k === atual)); b.dataset.aba = k;
    b.setAttribute("aria-label", rot); b.title = rot;
    if (k === "salvos") b.id = "abaSalvos";
    b.append(icone(ic, "i s"), el("span", null, rot));
    b.addEventListener("click", () => {
      if (k === atual) return;
      abaDaGrade.set(container, k); renderizarGrade(container, posts, opcoes);
      // Cada aba é um passo: o "voltar" volta para a aba anterior.
      const st = { ...(history.state || {}), hfAbaPerfil: k }; delete st.hfBase; delete st.hfGuarda; delete st.hfCamadas;
      history.pushState(st, "", location.href);
    });
    return b;
  }));
  // Salvos (só você): grade própria
  const salvosEl = $("gradeSalvos"), notaS = $("notaSalvos");
  if (proprio) { salvosEl.hidden = atual !== "salvos"; notaS.hidden = atual !== "salvos"; $("btnCompor").hidden = atual !== "posts"; }
  container.hidden = atual === "salvos";
  if (atual === "salvos") { mostrarSalvos(); return; }
  const vazios = {
    posts: proprio ? "Fotos, textos e enquetes que você publicar aparecem aqui." : "Quando essa pessoa publicar, aparece aqui.",
    reels: proprio ? "Os vídeos que você publicar aparecem aqui." : "Nenhum vídeo ainda.",
    repub: proprio ? "Toque em Republicar numa publicação do Diário para mostrar aqui." : "Nenhuma publicação republicada ainda."
  };
  if (atual === "repub" && repubCache.get(uid) === null) { container.replaceChildren(el("div", "vazio-grade", "Carregando...")); return; }
  desenharGrade(container, grupos[atual], { ...opcoes, vazio: vazios[atual] });
}
let ultimaGrade = null, abaInicial = "";
addEventListener("popstate", () => {
  if (!ultimaGrade) return;
  const k = history.state?.hfAbaPerfil || abaInicial;
  if (k && abaDaGrade.get(ultimaGrade.container) !== k) { abaDaGrade.set(ultimaGrade.container, k); renderizarGrade(ultimaGrade.container, ultimaGrade.posts, ultimaGrade.opcoes); }
});
// Quadradinho no modelo do cartão (Salvos): selo + pergunta + opções/campo, ou citação; quem publicou embaixo.
function miniModelo(post, autor) {
  const box = el("span", "mm");
  const e = post.enquete?.pergunta && Array.isArray(post.enquete.opcoes) ? post.enquete : null;
  const cx = !e && post.caixa?.pergunta ? post.caixa : null;
  if (e || cx) {
    box.classList.add(e ? "mm-enq" : "mm-cx");
    const selo = el("span", "mm-selo"); selo.append(icone(e ? "enquete" : "caixa", "i xs"), el("span", null, e ? "Enquete" : "Perguntas"));
    box.append(selo, el("strong", "mm-perg", (e || cx).pergunta));
    if (e) {
      const ops = el("span", "mm-ops");
      e.opcoes.slice(0, 2).forEach((o) => { const op = el("span", "mm-op"); op.append(el("i"), el("span", null, o)); ops.appendChild(op); });
      if (e.opcoes.length > 2) ops.appendChild(el("span", "mm-mais", `+${e.opcoes.length - 2} ${e.opcoes.length - 2 === 1 ? "opção" : "opções"}`));
      box.appendChild(ops);
    } else box.appendChild(el("span", "mm-campo", "Escreva sua resposta…"));
  } else {
    const txt = String(post.texto || "Publicação");
    box.classList.add("mm-cit", txt.length <= 60 ? "t-curto" : txt.length <= 160 ? "t-medio" : "t-longo");
    box.append(el("span", "mm-aspas", "“"), el("p", null, txt));
  }
  const rod = el("span", "mm-rodape"); const av = el("span", "avatar");
  pintarAvatar(av, autor?.fotoPerfil || post.fotoPerfil, autor?.nome || post.nome);
  rod.append(av, el("span", null, tempoRelativo(paraData(post.criadoEm))));
  box.appendChild(rod);
  return box;
}
function desenharGrade(container, posts, { proprio, autor, vazio, salvo }) {
  container.replaceChildren();
  if (!posts.length) {
    const v = document.createElement("div");
    v.className = "vazio-grade";
    const t = document.createElement("strong");
    t.textContent = proprio ? "Sua vitrine começa aqui" : "Nada por aqui ainda";
    v.append(t, vazio || (proprio ? "Publique fotos dos seus trabalhos, novidades e avisos para seus seguidores." : "Quando essa pessoa publicar, aparece aqui."));
    container.appendChild(v);
    return;
  }
  posts.forEach((post, i) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "tile";
    const url = urlSegura(post.mediaUrl);
    if (url && post.mediaTipo === "video") {
      tile.classList.add("video");
      const v = document.createElement("video");
      v.src = url; v.muted = true; v.playsInline = true; v.preload = "metadata";
      tile.appendChild(v);
      const m = el("span", "selo-video"); m.appendChild(icone("play", "i xs")); tile.appendChild(m);
    } else if (url) {
      const img = document.createElement("img");
      img.src = url; img.alt = post.texto ? post.texto.slice(0, 80) : "Publicação"; img.loading = "lazy";
      tile.appendChild(img);
      if (fotosDoPost(post).length > 1) { tile.appendChild(icone("fotos", "i s marca-fotos")); tile.setAttribute("data-fotos", String(fotosDoPost(post).length)); }
    } else if (salvo || post.enquete?.pergunta || post.caixa?.pergunta) {
      // Salvos: o mesmo modelo do Diário e do Flash — enquete, caixa de perguntas ou citação.
      tile.appendChild(miniModelo(post, autor));
    } else {
      // Texto: cartão com aspas, o texto em destaque (maior quando é curto) e quem escreveu embaixo.
      const txt = String(post.texto || "Publicação");
      tile.classList.add("texto", txt.length <= 60 ? "t-curto" : txt.length <= 160 ? "t-medio" : "t-longo");
      tile.dataset.tom = String(tomDoTexto(post.id));
      const p = el("p", null, txt);
      const rod = el("span", "tt-rodape");
      const av = el("span", "avatar");
      const quem = post._marcacao ? { foto: post.fotoPerfil, nome: post.nome } : { foto: autor?.fotoPerfil || post.fotoPerfil, nome: autor?.nome || post.nome };
      pintarAvatar(av, quem.foto, quem.nome);
      rod.append(av, el("span", null, tempoRelativo(paraData(post.criadoEm))));
      tile.append(el("span", "tt-aspas", "“"), p, rod);
    }
    // Foto com enquete ou caixa de perguntas: selo no canto (nos Salvos).
    if (salvo && url && (post.enquete?.pergunta || post.caixa?.pergunta)) {
      const sb = el("span", "sv-tipo"); sb.append(icone(post.enquete?.pergunta ? "enquete" : "caixa", "i xs"), el("span", null, post.enquete?.pergunta ? "Enquete" : "Perguntas"));
      tile.appendChild(sb);
    }
    if (url && post.texto) {
      const l = document.createElement("span");
      l.className = "legenda";
      l.textContent = post.texto;
      tile.appendChild(l);
    }
    if (post._marcacao) {
      // Republicada: a foto de quem publicou no canto.
      tile.classList.add("marcacao");
      const s = el("span", "selo-marcado"); const av = el("span", "avatar"); pintarAvatar(av, post.fotoPerfil, post.nome);
      s.append(av, icone(post._repub ? "republicar" : "pessoa-mais", "i xs")); s.title = post._repub ? `Republicada de ${post.nome || "outra pessoa"}` : `Publicação de ${post.nome || "outra pessoa"} com você`;
      tile.appendChild(s);
      obterPerfil(post.autorId).then((pp) => { if (pp.fotoPerfil || pp.nome) pintarAvatar(av, pp.fotoPerfil, pp.nome); }).catch(() => {});
    }
    if (salvo) {
      // Salvos: quem publicou embaixo e o marcador no canto (coleções, remover).
      tile.classList.add("salvo-tile");
      tile.querySelector(".legenda")?.remove();
      if (url) {
        const q = el("span", "sv-autor"); const av = el("span", "avatar"); pintarAvatar(av, post.fotoPerfil, post.nome);
        const nm = el("span", null, String(post.nome || "Usuário").split(" ")[0]);
        q.append(av, nm); tile.appendChild(q);
        obterPerfil(post.autorId).then((pp) => { if (pp.fotoPerfil || pp.nome) { pintarAvatar(av, pp.fotoPerfil, pp.nome); nm.textContent = String(pp.nome || post.nome || "Usuário").split(" ")[0]; } }).catch(() => {});
      }
      const mk = el("span", "sv-marca"); mk.setAttribute("role", "button"); mk.tabIndex = 0; mk.setAttribute("aria-label", "Opções do salvo"); mk.appendChild(icone("salvo", "i xs"));
      const opc = (e) => {
        e.stopPropagation(); e.preventDefault();
        const naCol = listaColecoes().find((c) => c.id === salvosVista.colecao);
        abrirOpcoes("Salvo", [
          { rotulo: "Salvar em uma coleção", sub: "Escolha ou crie uma pasta", icone: "fotos", fn: () => escolherColecao(post, () => mostrarSalvos()) },
          naCol && { rotulo: `Tirar de “${naCol.nome}”`, sub: "Continua em Todos os salvos", icone: "fechar", fn: async () => { if (await gravarColecoes(listaColecoes().map((c) => (c.id === naCol.id ? { ...c, ids: c.ids.filter((x) => x !== post.id) } : c)))) mostrarSalvos(); } },
          { rotulo: "Remover dos salvos", icone: "lixo", perigo: true, fn: async () => { await alternarSalvo(post); mostrarSalvos(); } }
        ]);
      };
      mk.addEventListener("click", opc);
      mk.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") opc(e); });
      tile.appendChild(mk);
    }
    if ((post.agendadoPara?.toMillis?.() ?? 0) > Date.now()) { tile.classList.add("agendada"); tile.appendChild(el("span", "selo-agendada", "Agendada")); }
    tile.setAttribute("aria-label", post._repub ? `Publicação republicada de ${post.nome || "outra pessoa"}` : post._marcacao ? `Publicação de ${post.nome || "outra pessoa"} com marcação` : "Abrir publicação");
    // Tocar: as publicações em lista, rolando para baixo (como no Instagram). Segurar: a prévia grande.
    tile.addEventListener("click", () => abrirFeedPerfil(posts, i, { proprio, autor }));
    segurarTile(tile, () => abrirPreviaPub(post, { autor, abrir: () => abrirFeedPerfil(posts, i, { proprio, autor }) }));
    container.appendChild(tile);
  });
}
// ======================================================
// Publicações do perfil (14/11/2026, pedido dele): tocar abre a lista rolando para baixo; segurar abre a prévia grande.
// ======================================================
function segurarTile(tile, fn) {
  let tempo = null, x0 = 0, y0 = 0;
  const parar = () => { clearTimeout(tempo); tempo = null; tile.classList.remove("segurando"); };
  tile.addEventListener("pointerdown", (e) => {
    if (e.button || e.target.closest(".sv-marca")) return;
    x0 = e.clientX; y0 = e.clientY; tile.classList.add("segurando");
    tempo = setTimeout(() => { tempo = null; tile.classList.remove("segurando"); tile._segurou = true; setTimeout(() => { tile._segurou = false; }, 700); navigator.vibrate?.(12); fn(); }, 430);
  });
  tile.addEventListener("pointermove", (e) => { if (tempo && Math.hypot(e.clientX - x0, e.clientY - y0) > 10) parar(); });
  ["pointerup", "pointercancel", "pointerleave"].forEach((t) => tile.addEventListener(t, () => { if (tempo) parar(); }));
  tile.addEventListener("contextmenu", (e) => e.preventDefault());
  tile.addEventListener("click", (e) => { if (tile._segurou) { tile._segurou = false; e.stopImmediatePropagation(); e.preventDefault(); } }, true);
}
const linkPub = (id) => `${location.origin}${location.pathname.replace(/[^/]*$/, "")}feed.html?post=${encodeURIComponent(id)}`;
async function compartilharPub(post, nome) {
  const url = linkPub(post.id);
  try { if (navigator.share) { await navigator.share({ title: `Publicação de ${nome || "Help Floripa"}`, url }); return; } } catch (e) { if (e?.name === "AbortError") return; }
  try { await navigator.clipboard.writeText(url); toast("Link da publicação copiado"); } catch { toast("Não foi possível copiar."); }
}
function quemPublicou(post, autor) {
  return post._marcacao || !autor ? { uid: post.autorId, nome: post.nome, foto: post.fotoPerfil } : { uid: autor.uid || post.autorId, nome: autor.nome || post.nome, foto: autor.fotoPerfil || post.fotoPerfil };
}
// Conteúdo da publicação (mídia, texto ou modelo de enquete/caixa) para a prévia.
function miolo(post) {
  const url = urlSegura(post.mediaUrl);
  if (url && post.mediaTipo === "video") {
    const v = document.createElement("video"); v.src = url; v.muted = true; v.autoplay = true; v.loop = true; v.playsInline = true; return v;
  }
  if (url) { const i = document.createElement("img"); i.src = url; i.alt = post.texto ? post.texto.slice(0, 80) : "Publicação"; return i; }
  const c = el("div", "ppv-texto");
  if (post.enquete?.pergunta) {
    c.classList.add("enq");
    c.append(el("span", "ppv-selo", post.caixa ? "Perguntas" : "Enquete"), el("strong", null, post.enquete.pergunta));
    (post.enquete.opcoes || []).slice(0, 4).forEach((o) => c.appendChild(el("span", "ppv-op", String(o))));
  } else if (post.caixa?.pergunta) {
    c.classList.add("enq");
    c.append(el("span", "ppv-selo", "Caixa de perguntas"), el("strong", null, post.caixa.pergunta), el("span", "ppv-op campo", "Escreva sua resposta…"));
  } else {
    if (post.titulo) c.appendChild(el("strong", "ppv-tit", post.titulo));
    c.append(el("b", "ppv-aspas", "“"), el("p", null, String(post.texto || "").slice(0, 600)));
  }
  return c;
}
function abrirPreviaPub(post, { autor, abrir }) {
  document.querySelector(".pp-previa")?.remove();
  const q = quemPublicou(post, autor);
  const tela = el("div", "pp-previa"); tela.setAttribute("role", "dialog"); tela.setAttribute("aria-modal", "true"); tela.setAttribute("aria-label", "Prévia da publicação");
  const cartao = el("div", "ppv-cartao");
  const cab = el("div", "ppv-cab");
  const av = el("div", "avatar"); pintarAvatar(av, q.foto, q.nome);
  const tx = el("div", "ppv-quem"); tx.append(el("strong", null, q.nome || "Usuário"), el("small", null, tempoRelativo(paraData(post.criadoEm))));
  const bX = el("button", "ppv-x"); bX.type = "button"; bX.dataset.fechar = ""; bX.setAttribute("aria-label", "Fechar"); bX.appendChild(icone("fechar", "i s"));
  cab.append(av, tx, bX);
  const midia = el("div", "ppv-midia"); midia.appendChild(miolo(post));
  const n = fotosDoPost(post).length; if (urlSegura(post.mediaUrl) && n > 1) midia.appendChild(el("span", "ppv-n", `1/${n}`));
  cartao.append(cab, midia);
  if (urlSegura(post.mediaUrl) && post.texto) cartao.appendChild(el("p", "ppv-legenda", post.texto));
  const fechar = () => { tela.classList.add("saindo"); document.removeEventListener("keydown", tecla); setTimeout(() => tela.remove(), 180); };
  const tecla = (e) => { if (e.key === "Escape") fechar(); };
  const salvo = () => idsSalvos().includes(post.id);
  const acoes = el("div", "ppv-acoes");
  const acao = (ic, rot, fn) => { const b = el("button", "ppv-acao"); b.type = "button"; b.append(icone(ic, "i s"), el("span", null, rot)); b.addEventListener("click", fn); acoes.appendChild(b); return b; };
  acao("olho", "Abrir", () => { fechar(); abrir(); });
  const bSalvar = acao("salvo", salvo() ? "Salvo" : "Salvar", async () => { await alternarSalvo(post); bSalvar.lastChild.textContent = salvo() ? "Salvo" : "Salvar"; bSalvar.classList.toggle("on", salvo()); });
  bSalvar.classList.toggle("on", salvo());
  acao("compartilhar", "Compartilhar", () => compartilharPub(post, q.nome));
  acao("link", "Copiar link", async () => { try { await navigator.clipboard.writeText(linkPub(post.id)); toast("Link da publicação copiado"); } catch { toast("Não foi possível copiar."); } });
  tela.append(cartao, acoes);
  bX.addEventListener("click", fechar);
  tela.addEventListener("click", (e) => { if (e.target === tela) fechar(); });
  document.addEventListener("keydown", tecla);
  document.body.appendChild(tela);
}

// Lista das publicações (folha em tela cheia): cada uma com quem publicou, a mídia, o texto e a barra de estrelas e ações.
let feedPerfil = null;
function abrirFeedPerfil(lista, indice, opcoes) {
  const corpo = $("feedLista");
  feedPerfil?.obs?.disconnect();
  feedPerfil = { lista, opcoes, obs: null };
  corpo.replaceChildren();
  const q0 = quemPublicou(lista[indice] || {}, opcoes.autor);
  $("feedSub").textContent = opcoes.proprio ? "Suas publicações" : q0.nome ? q0.nome : "";
  const itens = lista.map((p, i) => itemFeed(p, i));
  corpo.append(...itens);
  // A barra de estrelas e a vista só quando a publicação aparece (não lê tudo de uma vez).
  feedPerfil.obs = new IntersectionObserver((ents) => ents.forEach((e) => {
    const it = e.target;
    if (e.isIntersecting) { it._ligar?.(); }
    else it.querySelector("video")?.pause();
  }), { root: corpo.closest(".folha-corpo"), rootMargin: "300px 0px" });
  itens.forEach((it) => feedPerfil.obs.observe(it));
  abrirFolha("folhaFeed");
  requestAnimationFrame(() => { const alvo = itens[indice]; const c = corpo.closest(".folha-corpo"); if (alvo && c) c.scrollTop = alvo.offsetTop - corpo.offsetTop; });
}
function itemFeed(post, i) {
  const { lista, opcoes } = feedPerfil;
  const proprio = opcoes.proprio && !post._marcacao;
  const q = quemPublicou(post, opcoes.autor);
  const art = el("article", "pfd-item");
  const cab = el("div", "pfd-cab");
  const av = el("div", "avatar"); pintarAvatar(av, q.foto, q.nome);
  const tx = el("div", "pfd-quem");
  const nm = el("strong", null, q.nome || "Usuário");
  const sub = el("small", null, tempoRelativo(paraData(post.criadoEm)) + (post.local?.nome ? ` · ${post.local.nome}` : "") + (post.editadoEm ? " · editada" : ""));
  tx.append(nm, sub);
  if (post._marcacao) obterPerfil(post.autorId).then((pp) => { if (pp.nome) nm.textContent = pp.nome; if (pp.fotoPerfil || pp.nome) pintarAvatar(av, pp.fotoPerfil, pp.nome); }).catch(() => {});
  const mais = el("button", "icone-btn pfd-mais"); mais.type = "button"; mais.setAttribute("aria-label", "Opções da publicação"); mais.appendChild(icone("pontos", "i"));
  cab.append(av, tx, mais);
  if (q.uid && q.uid !== eu.uid) { const ir = () => abrirPerfilPublico(q.uid); av.addEventListener("click", ir); nm.addEventListener("click", ir); av.style.cursor = nm.style.cursor = "pointer"; }
  art.appendChild(cab);
  const url = urlSegura(post.mediaUrl);
  const casada = post.estilo === "casada" && url && post.mediaTipo !== "video";
  let barra = null;
  const darCinco = async (alvo) => { if (!barra?.estrelas?.darNota) return; await contadorEstrelas(alvo, (nota) => barra.estrelas.darNota(nota)); };
  if (post.titulo) art.appendChild(el("h3", "pfd-titulo", post.titulo));
  if (casada) { const m = el("div", "pfd-midia"); m.appendChild(blocoCasado(post.texto, url, { verMais: true })); art.appendChild(m); }
  else if (url && post.mediaTipo === "video") { const m = el("div", "pfd-midia"); const v = document.createElement("video"); v.src = url; v.controls = true; v.playsInline = true; v.preload = "metadata"; m.appendChild(v); art.appendChild(m); }
  else if (url) { const m = el("div", "pfd-midia"); m.appendChild(carrosselFotos(fotosDoPost(post), { alt: "Imagem da publicação", aoToqueDuplo: () => darCinco(m) })); art.appendChild(m); }
  const repete = post.texto && [post.enquete?.pergunta, post.caixa?.pergunta].includes(post.texto.trim());
  if (post.texto && !casada && !repete) {
    const t = el("p", "pfd-texto" + (url ? "" : " so-texto"));
    comMencoes(t, post.texto);
    if (!url) { let ult = 0; t.addEventListener("click", (e) => { if (e.target.closest("a, button")) return; const ag = Date.now(); if (ag - ult < 320) { ult = 0; barra?.estrelas?.pular?.(); barra?.estrelas?.darNota?.(5); } else ult = ag; }); }
    art.appendChild(t);
  }
  const extra = el("div", "pfd-extras");
  const enq = blocoEnquete(post); if (enq) extra.appendChild(enq);
  const cx = blocoCaixa(post); if (cx) extra.appendChild(cx);
  if (Array.isArray(post.marcados) && post.marcados.length) extra.appendChild(pessoasEmPilha(post.marcados, { classe: "post-com", aoPerfil: () => fecharFolha("folhaFeed") }));
  if (extra.children.length) art.appendChild(extra);
  const social = el("div", "pfd-social"); art.appendChild(social);
  let ligado = false;
  art._ligar = () => {
    if (ligado || post._agendada) return; ligado = true;
    const p2 = { ...post, autorId: post.autorId || q.uid };
    barra = barraInteracao(p2, { aoComentar: () => abrirPost(lista, i, opcoes) });
    social.appendChild(barra);
    if (!proprio) marcarVista(p2);
  };
  if (post._agendada || (post.agendadoPara?.toMillis?.() ?? 0) > Date.now()) social.appendChild(el("p", "pfd-aviso", "Agendada: só você vê até a hora marcada."));
  mais.addEventListener("click", () => opcoesPublicacao(post, art, i));
  return art;
}
function opcoesPublicacao(post, art, i) {
  const { lista, opcoes } = feedPerfil;
  const proprio = opcoes.proprio && !post._marcacao;
  const q = quemPublicou(post, opcoes.autor);
  const itens = proprio
    ? [
        { rotulo: "Editar", icone: "lapis", fn: () => {
          if (post._agendada) { toast("Para mudar uma publicação agendada, apague e agende de novo (ou publique agora e edite)."); return; }
          if (post.guardado) { toast(`${motivoTexto(post)}: enquanto isso não dá para editar.`); return; }
          editarPublicacao(post, () => { const novo = itemFeed(post, i); art.replaceWith(novo); feedPerfil.obs?.observe(novo); renderizarGrade($("gradePosts"), meusPosts, { proprio: true, autor: dados, uid: eu.uid, barra: $("abasMeuPerfil") }); });
        } },
        { rotulo: "Estatísticas", icone: "estrela", fn: () => import("./estatisticas-post.js?v=128").then((m) => m.abrirEstatisticas(post)) },
        { rotulo: "Comentários", icone: "chat", fn: () => abrirPost(lista, i, opcoes) },
        { rotulo: "Copiar link", icone: "link", fn: async () => { try { await navigator.clipboard.writeText(linkPub(post.id)); toast("Link da publicação copiado"); } catch { toast("Não foi possível copiar."); } } },
        { rotulo: "Apagar", icone: "lixo", perigo: true, fn: async () => { if (await apagarPublicacao(post)) { art.remove(); lista.splice(lista.indexOf(post), 1); if (!lista.length) fecharFolha("folhaFeed"); } } }
      ]
    : [
        { rotulo: "Comentários", icone: "chat", fn: () => abrirPost(lista, i, opcoes) },
        { rotulo: "Compartilhar", icone: "compartilhar", fn: () => compartilharPub(post, q.nome) },
        { rotulo: "Copiar link", icone: "link", fn: async () => { try { await navigator.clipboard.writeText(linkPub(post.id)); toast("Link da publicação copiado"); } catch { toast("Não foi possível copiar."); } } },
        { rotulo: "Denunciar", icone: "alerta", perigo: true, fn: () => denunciarPublicacao(post, opcoes.autor) }
      ];
  abrirOpcoes("Publicação", itens);
}
// Apagar e denunciar: usados pela folha da publicação e pela lista.
async function apagarPublicacao(post) {
  if (!await confirmarHF({ titulo: post._agendada ? "Apagar esta publicação agendada?" : "Apagar esta publicação?", texto: post._agendada ? "Ela não vai ser publicada. Não dá para desfazer." : "Ela some do seu perfil e do Diário. Não dá para desfazer.", ok: "Apagar", icone: "lixo" })) return false;
  try {
    if (post._agendada) await fb.deleteDoc(fb.doc(fb.db, "agendadas", post.id));
    else if (post.guardado) await apagarComGuardado(fb, "diario", post.id); // escondida: o esqueleto e o conteúdo guardado juntos
    else await fb.deleteDoc(fb.doc(fb.db, "diario", post.id));
    apagarFlashesDaPublicacao(post.id);
    meusPosts = meusPosts.filter((p) => p.id !== post.id);
    renderizarGrade($("gradePosts"), meusPosts, { proprio: true, autor: dados, uid: eu.uid, barra: $("abasMeuPerfil") });
    renderizarMeuPerfil();
    toast("Publicação apagada");
    return true;
  } catch (e) {
    console.error(e);
    toast("Não foi possível apagar: " + erroAmigavel(e));
    return false;
  }
}
function denunciarPublicacao(post, autor) {
  const autorId = post.autorId || autor?.uid;
  const nomeA = (post._marcacao ? post.nome : autor?.nome) || post.nome || "";
  abrirDenuncia({ fb, eu, tipo: "publicacao", alvoId: autorId, itemId: post.id, trecho: post.texto || "", nomeAlvo: nomeA,
    aoBloquear: async () => { if (await bloquear(autorId, nomeA)) { fecharFolha("folhaPost"); fecharFolha("folhaFeed"); abrirPerfilPublico(autorId); } } });
}
$("folhaFeed")?.addEventListener("fechada", () => { feedPerfil?.obs?.disconnect(); $("feedLista").querySelectorAll("video").forEach((v) => v.pause()); });

// Tom do cartão de texto (sempre o mesmo para a mesma publicação).
function tomDoTexto(id) { let h = 0; for (const c of String(id || "")) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 5; }

async function carregarMeusPosts() {
  try {
    meusPosts = await buscarPosts(eu.uid);
  } catch (e) {
    console.warn("Publicações indisponíveis:", e);
    meusPosts = [];
  }
  renderizarGrade($("gradePosts"), meusPosts, { proprio: true, autor: dados, uid: eu.uid, barra: $("abasMeuPerfil") });
  renderizarMeuPerfil();
}

// ---------- ver publicação ----------
let postCtx = null;
function abrirPost(lista, indice, opcoes) {
  postCtx = { lista, indice, ...opcoes };
  mostrarPost();
  abrirFolha("folhaPost");
}
function mostrarPost() {
  const { lista, indice } = postCtx;
  const post = lista[indice];
  // Marcação (publicação de outra pessoa no seu perfil): sem editar/apagar e com o autor verdadeiro.
  const proprio = postCtx.proprio && !post._marcacao;
  const autor = post._marcacao ? null : postCtx.autor;
  if (post._marcacao) obterPerfil(post.autorId).then((pp) => { if (postCtx.lista[postCtx.indice] !== post) return; if (pp.nome) $("postNome").textContent = pp.nome; pintarAvatar($("postAvatar"), pp.fotoPerfil || post.fotoPerfil, pp.nome || post.nome); }).catch(() => {});
  const midia = $("postMidia");
  midia.replaceChildren();
  const url = urlSegura(post.mediaUrl);
  midia.hidden = !url;
  const casada = post.estilo === "casada" && url && post.mediaTipo !== "video";
  if (casada) {
    // Texto com imagem casada: o cartão inteiro no lugar da foto + texto.
    midia.appendChild(blocoCasado(post.texto, url, { verMais: true }));
  } else if (url && post.mediaTipo === "video") {
    const v = document.createElement("video");
    v.src = url; v.controls = true; v.playsInline = true;
    midia.appendChild(v);
  } else if (url) {
    // Uma ou várias fotos (deslizar); toque duplo dá 5 estrelas.
    midia.appendChild(carrosselFotos(fotosDoPost(post), { alt: "Imagem da publicação", aoToqueDuplo: () => toqueDuploPost(midia) }));
  }
  pintarAvatar($("postAvatar"), autor?.fotoPerfil || post.fotoPerfil, autor?.nome || post.nome);
  $("postNome").textContent = autor?.nome || post.nome || "Usuário";
  $("postData").textContent = dataCompleta(paraData(post.criadoEm));
  comMencoes($("postTexto"), casada ? "" : post.texto || "");
  $("postTexto").hidden = !post.texto || casada;
  $("postApagar").hidden = !proprio;
  $("postEditar").hidden = !proprio;
  $("postDenunciar").hidden = proprio;
  $("postData").textContent = dataCompleta(paraData(post.criadoEm)) + (post.editadoEm ? " · editada" : "");
  // Pessoas marcadas, agendamento e estatísticas (do autor).
  const extra = $("postExtras"); extra.replaceChildren();
  const enq = blocoEnquete(post);
  if (enq) extra.appendChild(enq);
  const cx = blocoCaixa(post);
  if (cx) extra.appendChild(cx);
  if (Array.isArray(post.marcados) && post.marcados.length) extra.appendChild(pessoasEmPilha(post.marcados, { classe: "post-com", aoPerfil: () => fecharFolha("folhaPost") }));
  const agenda = post.agendadoPara?.toMillis?.() ?? 0;
  if (proprio && agenda > Date.now()) {
    const a = el("div", "aviso-agendada"); a.append(icone("relogio", "i xs"), document.createTextNode(`Agendada para ${new Date(agenda).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}. Só você vê até lá.`));
    const ja = el("button", "btn pri mini", "Publicar agora"); ja.type = "button";
    ja.addEventListener("click", async () => { try { if (post._agendada) { ja.disabled = true; const m = await import("./agendadas.js?v=2"); await m.publicarAgendada(fb, eu.uid, post.id, { perfil: dados }); delete post._agendada; post.agendadoPara = null; post.criadoEm = { toMillis: () => Date.now() }; toast("Publicada agora"); fecharFolha("folhaPost"); carregarMeusPosts(); return; } await fb.updateDoc(fb.doc(fb.db, "diario", post.id), { agendadoPara: fb.serverTimestamp() }); post.agendadoPara = { toMillis: () => Date.now() }; toast("Publicada agora"); mostrarPost(); carregarMeusPosts(); } catch (e) { toast("Não foi possível: " + erroAmigavel(e)); } });
    a.appendChild(ja); extra.appendChild(a);
  }
  if (proprio) { const st = el("button", "btn sec mini"); st.type = "button"; st.append(icone("estrela", "i xs"), document.createTextNode("Estatísticas")); st.addEventListener("click", () => import("./estatisticas-post.js?v=128").then((m) => m.abrirEstatisticas(post))); extra.appendChild(st); }
  extra.hidden = !extra.children.length;
  if (!proprio) marcarVista({ ...post, autorId: post.autorId || autor?.uid });
  $("postAnterior").disabled = indice <= 0;
  $("postProximo").disabled = indice >= lista.length - 1;
  pintarSocialPost({ ...post, autorId: post.autorId || autor?.uid });
}
let barraPost = null;
// Toque duplo na foto ou no texto: 5 estrelas na hora (como no Diário).
async function toqueDuploPost(alvo, simples = false) {
  if (!barraPost?.estrelas?.darNota) return;
  if (simples) { barraPost.estrelas.pular?.(); await barraPost.estrelas.darNota(5); return; }
  await contadorEstrelas(alvo, (nota) => barraPost.estrelas.darNota(nota));
}
// Texto da publicação aberta: dois toques também dão as estrelas (links continuam com um toque).
{ let ult = 0; $("postTexto").addEventListener("click", (e) => { if (e.target.closest("a, button, .enquete") || !$("postMidia").hidden) return; const ag = Date.now(); if (ag - ult < 320) { ult = 0; toqueDuploPost($("postTexto"), true); } else ult = ag; }); }
function pintarSocialPost(post) {
  const box = $("postSocial");
  box.replaceChildren();
  if (post._agendada) return; // ainda não está no Diário: sem estrelas nem comentários
  const lista = el("div");
  const barra = barraPost = barraInteracao(post, { aoComentar: () => lista.querySelector("textarea")?.focus() });
  box.append(barra, lista);
  montarComentarios(lista, post, { aoMudar: (n) => barra.atualizarComentarios(n) });
}
$("postAnterior").addEventListener("click", () => { if (postCtx.indice > 0) { postCtx.indice--; mostrarPost(); } });
$("postProximo").addEventListener("click", () => { if (postCtx.indice < postCtx.lista.length - 1) { postCtx.indice++; mostrarPost(); } });
$("folhaPost").addEventListener("fechada", () => $("postMidia").querySelector("video")?.pause());
$("postApagar").addEventListener("click", async () => {
  if (await apagarPublicacao(postCtx.lista[postCtx.indice])) fecharFolha("folhaPost");
});

$("postEditar").addEventListener("click", () => {
  const post = postCtx.lista[postCtx.indice];
  if (post._agendada) { toast("Para mudar uma publicação agendada, apague e agende de novo (ou publique agora e edite)."); return; }
  if (post.guardado) { toast(`${motivoTexto(post)}: enquanto isso não dá para editar.`); return; }
  editarPublicacao(post, () => { mostrarPost(); if (postCtx.proprio) renderizarGrade($("gradePosts"), meusPosts, { proprio: true, autor: dados, uid: eu.uid, barra: $("abasMeuPerfil") }); });
});
$("postDenunciar").addEventListener("click", () => {
  const post = postCtx.lista[postCtx.indice];
  denunciarPublicacao(post, post._marcacao ? null : postCtx.autor);
});

// ---------- Salvos (só você vê): coleções em cima, filtros e a grade com quem publicou ----------
let salvosVista = { colecao: "", tipo: "tudo" };
const tipoDoPost = (p) => (!urlSegura(p.mediaUrl) ? "textos" : p.mediaTipo === "video" ? "videos" : "fotos");
function capaColecao(posts) {
  const m = el("span", "col-capa" + (posts.length >= 4 ? " q4" : posts.length >= 2 ? " q2" : ""));
  (posts.length ? posts.slice(0, posts.length >= 4 ? 4 : posts.length >= 2 ? 2 : 1) : [null]).forEach((p) => {
    const c = el("span", "col-cel");
    const u = p && urlSegura(p.mediaUrl);
    if (u && p.mediaTipo !== "video") { const i = document.createElement("img"); i.src = u; i.alt = ""; i.loading = "lazy"; c.appendChild(i); }
    else if (u) { const v = document.createElement("video"); v.src = u; v.muted = true; v.preload = "metadata"; c.appendChild(v); }
    else if (p) {
      c.classList.add("txt", "mm-capa");
      const tipo = p.enquete?.pergunta ? "enquete" : p.caixa?.pergunta ? "caixa" : "";
      if (tipo) c.appendChild(icone(tipo, "i xs"));
      else c.appendChild(el("b", null, "“"));
      c.appendChild(el("span", null, String((p.enquete?.pergunta || p.caixa?.pergunta || p.texto || "")).slice(0, 48)));
    }
    else { c.classList.add("vazia"); c.appendChild(icone("salvo", "i s")); }
    m.appendChild(c);
  });
  return m;
}
async function mostrarSalvos() {
  const g = $("gradeSalvos");
  g.replaceChildren(el("div", "vazio-grade", "Carregando..."));
  const ids = idsSalvos().slice(0, 90);
  const docs = await Promise.all(ids.map((id) => fb.getDoc(fb.doc(fb.db, "diario", id)).catch(() => null)));
  const lista = docs.filter((d) => d?.exists()).map((d) => ({ id: d.id, ...d.data() })).filter((p) => !escondido(p.autorId) && (p.ocultoAte?.toMillis?.() ?? 0) <= Date.now());
  const porId = new Map(lista.map((p) => [p.id, p]));
  g.replaceChildren();
  g.classList.add("salvos2");
  if (!lista.length) {
    const v = el("div", "vazio-grade salvos-vazio");
    const ic = el("span", "sv-ic"); ic.appendChild(icone("salvo", "i"));
    v.append(ic, el("strong", null, "Guarde o que vale rever"), "Toque em Salvar numa publicação para guardar aqui. Depois, organize em coleções.");
    g.replaceChildren(v); return;
  }
  const cols = listaColecoes();
  const atual = cols.find((c) => c.id === salvosVista.colecao) || null;
  if (!atual) salvosVista.colecao = "";
  const base = atual ? atual.ids.slice().reverse().map((id) => porId.get(id)).filter(Boolean) : lista;

  // Cabeçalho: coleções (ou o nome da coleção aberta)
  if (!atual) {
    const tit = el("div", "sv-titulo"); tit.append(el("strong", null, "Coleções"), el("span", null, `${lista.length} ${lista.length === 1 ? "salvo" : "salvos"}`));
    const linha = el("div", "col-carrossel");
    const cartao = (nome, posts, n, fn, cls = "") => {
      const b = el("button", "col-cartao " + cls); b.type = "button";
      b.append(capaColecao(posts), el("strong", null, nome), el("small", null, n == null ? "" : `${n} ${n === 1 ? "item" : "itens"}`));
      b.addEventListener("click", fn);
      return b;
    };
    linha.appendChild(cartao("Todos os salvos", lista, lista.length, () => {}, "ativa"));
    cols.forEach((c) => { const ps = c.ids.slice().reverse().map((id) => porId.get(id)).filter(Boolean); linha.appendChild(cartao(c.nome, ps, ps.length, () => { salvosVista = { colecao: c.id, tipo: "tudo" }; mostrarSalvos(); })); });
    const nova = el("button", "col-cartao col-criar"); nova.type = "button";
    const capa = el("span", "col-capa"); const mais = el("span", "col-cel vazia"); mais.appendChild(icone("mais", "i")); capa.appendChild(mais);
    nova.append(capa, el("strong", null, "Nova coleção"), el("small", null, "Organize em pastas"));
    nova.addEventListener("click", criarColecaoSalvos);
    linha.appendChild(nova);
    g.append(tit, linha);
  } else {
    const topo = el("div", "sv-col-topo");
    const v = el("button", "icone-btn"); v.type = "button"; v.setAttribute("aria-label", "Voltar para todos os salvos"); v.appendChild(icone("voltar", "i s"));
    v.addEventListener("click", () => { salvosVista = { colecao: "", tipo: "tudo" }; mostrarSalvos(); });
    const tx = el("div", "sv-col-tx"); tx.append(el("strong", null, atual.nome), el("small", null, `${base.length} ${base.length === 1 ? "item" : "itens"} · só você vê`));
    const m = el("button", "icone-btn"); m.type = "button"; m.setAttribute("aria-label", "Opções da coleção"); m.appendChild(icone("pontos", "i s"));
    m.addEventListener("click", () => abrirOpcoes(atual.nome, [
      { rotulo: "Renomear coleção", icone: "lapis", fn: () => renomearColecao(atual) },
      { rotulo: "Apagar coleção", sub: "As publicações continuam em Todos os salvos", icone: "lixo", perigo: true, fn: async () => {
        if (!(await confirmarHF({ titulo: "Apagar a coleção?", texto: `“${atual.nome}” some, mas as publicações continuam nos seus salvos.`, ok: "Apagar", icone: "lixo" }))) return;
        if (await gravarColecoes(listaColecoes().filter((c) => c.id !== atual.id))) { salvosVista = { colecao: "", tipo: "tudo" }; toast("Coleção apagada"); mostrarSalvos(); }
      } }
    ]));
    topo.append(v, tx, m);
    g.appendChild(topo);
  }

  // Filtros por tipo (com contagem)
  const tipos = [["tudo", "Tudo"], ["fotos", "Fotos"], ["videos", "Vídeos"], ["textos", "Textos"]].filter(([k]) => k === "tudo" || base.some((p) => tipoDoPost(p) === k));
  if (!tipos.some(([k]) => k === salvosVista.tipo)) salvosVista.tipo = "tudo";
  if (tipos.length > 2) {
    const chips = el("div", "rel-chips sv-chips");
    tipos.forEach(([k, rot]) => {
      const c = el("button", "rel-chip" + (k === salvosVista.tipo ? " ativo" : "")); c.type = "button"; c.setAttribute("aria-pressed", String(k === salvosVista.tipo));
      c.append(el("span", null, rot), el("em", null, String(k === "tudo" ? base.length : base.filter((p) => tipoDoPost(p) === k).length)));
      c.addEventListener("click", () => { salvosVista.tipo = k; mostrarSalvos(); });
      chips.appendChild(c);
    });
    g.appendChild(chips);
  }
  const vis = salvosVista.tipo === "tudo" ? base : base.filter((p) => tipoDoPost(p) === salvosVista.tipo);
  const grade = el("div", "grade sv-grade");
  g.appendChild(grade);
  definirOrigem("salvos");
  if (!vis.length) {
    const v = el("div", "vazio-grade"); v.append(el("strong", null, "Coleção vazia"), "Nas publicações, toque em ⋯ → Salvar em uma coleção.");
    grade.replaceChildren(v); return;
  }
  desenharGrade(grade, vis, { proprio: false, autor: null, salvo: true });
}
async function criarColecaoSalvos() {
  const nome = await pedirTexto("Nova coleção", "Ex.: Ideias, Lugares, Receitas", "");
  if (nome == null) return;
  const c = await novaColecao(nome);
  if (c) { toast(`Coleção “${c.nome}” criada. Nas publicações, toque em ⋯ → Salvar em uma coleção.`); salvosVista = { colecao: c.id, tipo: "tudo" }; mostrarSalvos(); }
}
async function renomearColecao(c) {
  const nome = await pedirTexto("Renomear coleção", "Nome da coleção", c.nome);
  if (!nome?.trim()) return;
  if (await gravarColecoes(listaColecoes().map((x) => (x.id === c.id ? { ...x, nome: nome.trim().replace(/\s+/g, " ").slice(0, 40) } : x)))) mostrarSalvos();
}
// Campo de texto numa folha (sem o prompt() do navegador).
function pedirTexto(titulo, dica, valor) {
  return new Promise((resolve) => {
    const corpo = abrirLista(titulo);
    let feito = false;
    const form = el("form", "col-nova col-nova-folha");
    const campo = document.createElement("input"); campo.maxLength = 40; campo.placeholder = dica; campo.value = valor || ""; campo.setAttribute("aria-label", titulo);
    const bt = el("button", "btn pri"); bt.type = "submit"; bt.textContent = valor ? "Salvar" : "Criar";
    form.append(campo, bt);
    form.addEventListener("submit", (e) => { e.preventDefault(); if (!campo.value.trim()) { campo.focus(); return; } feito = true; fecharFolha("folhaLista"); resolve(campo.value); });
    corpo.appendChild(form);
    const folha = $("folhaLista");
    const obs = new MutationObserver(() => { if (!folha.classList.contains("aberta")) { obs.disconnect(); if (!feito) resolve(null); } });
    obs.observe(folha, { attributes: true, attributeFilter: ["class", "hidden"] });
    setTimeout(() => campo.focus(), 150);
  });
}

// ---------- link direto para uma publicação: usuarios.html?post=ID ----------
async function abrirPostPorLink(id) {
  definirOrigem("link");
  try {
    const s = await fb.getDoc(fb.doc(fb.db, "diario", id));
    if (!s.exists()) { toast("Essa publicação não existe mais."); return; }
    const post = { id: s.id, ...s.data() };
    if (escondido(post.autorId) || ((post.ocultoAte?.toMillis?.() ?? 0) > Date.now() && post.autorId !== eu.uid)) { toast("Essa publicação não está disponível."); return; }
    const autor = post.autorId === eu.uid ? dados : { uid: post.autorId, ...(await obterPerfil(post.autorId).catch(() => ({}))) };
    abrirPost([post], 0, { proprio: post.autorId === eu.uid, autor });
  } catch (e) { toast(e?.code === "permission-denied" ? "Essa publicação não está disponível." : "Não foi possível abrir a publicação: " + erroAmigavel(e)); }
}

// ---------- nova publicação (rede.js) ----------
$("btnCompor").addEventListener("click", () => abrirCompositor({ aoPublicar: () => carregarMeusPosts() }));

// ======================================================
// Foto de perfil e capa (com editor de moldura)
// ======================================================
const OPCOES_IMAGEM = {
  foto: { titulo: "Foto de perfil", dica: "O círculo mostra exatamente como sua foto aparece. Deixe o rosto dentro da linha tracejada.", proporcao: 1, circulo: true, larguraSaida: 480, qualidade: 0.86, limiteBytes: 250000 },
  capa: { titulo: "Foto de capa", dica: "A moldura mostra a capa inteira. O círculo tracejado marca onde sua foto de perfil fica por cima.", proporcao: 3, extra: "avatar-capa", larguraSaida: 1500, qualidade: 0.8, limiteBytes: 500000 }
};
// Capa: a moldura tem o formato da capa NESTA tela, com a foto de perfil e o nome no lugar onde ficam.
function opcoesCapa() {
  const base = { ...OPCOES_IMAGEM.capa };
  const raiz = meuCab?.raiz || document.querySelector(".pf2");
  const capa = raiz?.querySelector(".pf-capa");
  const r = capa?.getBoundingClientRect();
  if (!r || r.width < 50 || r.height < 50) return base;
  const fr = (el) => { const b = el?.getBoundingClientRect(); return b && b.width ? { x: (b.left - r.left) / r.width, y: (b.top - r.top) / r.height, w: b.width / r.width, h: b.height / r.height } : null; };
  const marcas = [];
  const foto = fr(raiz.querySelector(".pf-anel") || raiz.querySelector(".pf-avatar-wrap"));
  if (foto) marcas.push({ forma: "circulo", rotulo: "Sua foto", ...foto });
  const ident = raiz.querySelector(".pf-ident");
  const t = fr(ident);
  if (t) marcas.push({ forma: "texto", rotulo: "Nome e bio", ...t, h: Math.min(t.h, 1 - t.y) });
  return { ...base, proporcao: Math.max(1.3, Math.min(3.2, r.width / r.height)), extra: "", marcas, escurecerBaixo: true,
    dica: "A moldura é a sua capa como aparece no perfil. A foto e o nome ficam por cima, nas marcas tracejadas: deixe o principal livre." };
}
let edRascunho = null; // alterações pendentes no "Editar perfil"
let salvarDireto = false;

function escolherImagem(tipo, direto) {
  salvarDireto = !!direto;
  $(tipo === "foto" ? "edArquivoFoto" : "edArquivoCapa").click();
}
async function aoEscolherImagem(tipo, input) {
  const arquivo = input.files?.[0];
  input.value = "";
  if (!arquivo) return;
  try {
    const dataUrl = await editarImagem(arquivo, tipo === "capa" ? opcoesCapa() : OPCOES_IMAGEM[tipo]);
    if (!dataUrl) return;
    if (salvarDireto) {
      toast("Salvando...");
      const url = await salvarImagem(dataUrl, `${tipo === "foto" ? "fotosPerfil" : "fotosCapa"}/${eu.uid}.jpg`);
      const campo = tipo === "foto" ? "fotoPerfil" : "fotoCapa";
      await Promise.all([
        fb.setDoc(refUsuario, { [campo]: url }, { merge: true }),
        fb.setDoc(fb.doc(fb.db, "perfis_publicos", eu.uid), { uid: eu.uid, [campo]: url }, { merge: true })
      ]);
      dados[campo] = url;
      perfis.delete(eu.uid);
      if (campo === "fotoPerfil") atualizarMinhasPublicacoes().catch(() => {});
      renderizarMeuPerfil();
      toast(tipo === "foto" ? "Foto de perfil atualizada" : "Capa atualizada");
    } else {
      edRascunho[tipo === "foto" ? "fotoPerfil" : "fotoCapa"] = dataUrl;
      pintarEditor();
    }
  } catch (e) {
    console.error(e);
    toast("Não foi possível salvar a imagem: " + erroAmigavel(e));
  }
}
$("edArquivoFoto").addEventListener("change", () => aoEscolherImagem("foto", $("edArquivoFoto")));
$("edArquivoCapa").addEventListener("change", () => aoEscolherImagem("capa", $("edArquivoCapa")));

// ======================================================
// Editar perfil
// ======================================================
const NICK_RE = /^[a-z0-9._]{3,20}$/;
let nickDisponivel = true, timerNick = null;

let edLocal = null;
function abrirEditar(foco) {
  edRascunho = { fotoPerfil: dados.fotoPerfil || "", fotoCapa: dados.fotoCapa || "" };
  $("edNome").value = dados.nome || "";
  $("edUsuario").value = dados.nickname || "";
  $("edBio").value = dados.bio || "";
  $("edBioCont").textContent = `${$("edBio").value.length}/280`;
  // Estado + cidade da lista do IBGE (cidade antiga em texto é convertida na hora).
  $("edLocal").replaceChildren();
  edLocal = camposEndereco($("edLocal"), { campos: ["uf", "cidade"], obrigatorios: [], valor: { cidade: nomeCidade(dados.cidade || dados.cidadeNome), uf: dados.uf, cidadeIbge: dados.cidadeIbge } });
  $("edTelefone").value = dados.telefone || "";
  $("edEmail").value = dados.email || eu.email || "";
  nickDisponivel = true;
  mostrarStatusNick("3 a 20 caracteres: letras minúsculas, números, ponto e _");
  pintarEditor();
  // Links: o que está guardado (contatos_perfil ou a cópia na conta).
  edLinks = montarEditorLinks($("edLinksLista"), dados.linksPerfil || {}, { boxLinkedin: $("edLinkedin") });
  if (!dados.linksPerfil) lerLinks(fb, eu.uid, { proprio: true, dados }).then((l) => { if (Object.keys(l).length && $("folhaEditar").classList.contains("aberta")) edLinks = montarEditorLinks($("edLinksLista"), l, { boxLinkedin: $("edLinkedin") }); }).catch(() => {});
  // Pronomes e profissão (opcionais)
  const pron = dados.pronomes || "";
  const conhecido = ["", "ele/dele", "ela/dela", "elu/delu", "ele/ela"].includes(pron);
  $("edPronomes").value = conhecido ? pron : "outro";
  $("edPronomesOutro").value = conhecido ? "" : pron; $("edPronomesOutro").hidden = conhecido;
  $("edProfissao").value = dados.profissao || "";
  fecharFolha("folhaConfig");
  abrirFolha("folhaEditar");
  if (foco === "links") setTimeout(() => { $("edLinks").scrollIntoView({ behavior: "smooth", block: "start" }); edLinks.focar(); }, 160);
}
let edLinks = null;
$("edPronomes").addEventListener("change", () => { const o = $("edPronomes").value === "outro"; $("edPronomesOutro").hidden = !o; if (o) $("edPronomesOutro").focus(); });
function pintarEditor() {
  pintarAvatar($("edAvatar"), edRascunho.fotoPerfil, $("edNome").value || dados.nome);
  const capa = $("edCapa");
  capa.querySelector("img")?.remove();
  const u = urlSegura(edRascunho.fotoCapa);
  if (u) { const img = document.createElement("img"); img.src = u; img.alt = ""; capa.prepend(img); }
  $("edRemoverFoto").hidden = !edRascunho.fotoPerfil;
}
function mostrarStatusNick(texto, classe = "") {
  const s = $("edUsuarioStatus");
  s.textContent = texto;
  s.className = classe;
}
$("edTrocarFoto").addEventListener("click", () => escolherImagem("foto", false));
$("edTrocarCapa").addEventListener("click", () => escolherImagem("capa", false));
$("edRemoverFoto").addEventListener("click", () => { edRascunho.fotoPerfil = ""; pintarEditor(); });
$("edBio").addEventListener("input", () => { $("edBioCont").textContent = `${$("edBio").value.length}/280`; });
$("edUsuario").addEventListener("input", () => {
  const campo = $("edUsuario");
  campo.value = campo.value.toLowerCase().replace(/[^a-z0-9._]/g, "");
  const nick = campo.value;
  clearTimeout(timerNick);
  if (nick === (dados.nickname || "")) { nickDisponivel = true; mostrarStatusNick("Este é o seu nome de usuário atual"); return; }
  if (!NICK_RE.test(nick)) { nickDisponivel = false; mostrarStatusNick("Use de 3 a 20 caracteres: letras minúsculas, números, ponto e _", "erro"); return; }
  nickDisponivel = false;
  mostrarStatusNick("Verificando...");
  timerNick = setTimeout(async () => {
    try {
      const s = await fb.getDoc(fb.doc(fb.db, "nicknames", nick));
      if ($("edUsuario").value !== nick) return;
      nickDisponivel = !s.exists() || s.data().uid === eu.uid;
      mostrarStatusNick(nickDisponivel ? `@${nick} está disponível` : `@${nick} já está em uso`, nickDisponivel ? "ok" : "erro");
    } catch { mostrarStatusNick("Não foi possível verificar agora", "erro"); }
  }, 450);
});

$("edSalvar").addEventListener("click", async () => {
  const nome = $("edNome").value.trim();
  const nick = $("edUsuario").value.trim();
  const bio = $("edBio").value.trim();
  const erroLocal = edLocal?.validar();
  if (erroLocal) { toast(erroLocal); return; }
  const { uf, cidade, cidadeIbge } = edLocal ? edLocal.ler() : { uf: dados.uf || "", cidade: dados.cidade || "", cidadeIbge: dados.cidadeIbge || null };
  const telefone = $("edTelefone").value.trim();
  if (nome.length < 2) { toast("Informe seu nome."); $("edNome").focus(); return; }
  let linksNovos;
  try { linksNovos = edLinks.ler(); } catch (e) { toast(e.message); return; }
  const l0 = dados.linksPerfil || {};
  const linksMudaram = TIPOS_LINK.some((t) => (l0[t]?.valor || "") !== linksNovos[t].valor || (linksNovos[t].valor && (l0[t]?.ver || "") !== linksNovos[t].ver));
  const pronomes = ($("edPronomes").value === "outro" ? $("edPronomesOutro").value : $("edPronomes").value).replace(/\s+/g, " ").trim().slice(0, 24);
  const profissao = $("edProfissao").value.replace(/\s+/g, " ").trim().slice(0, 40);
  const extrasMudaram = pronomes !== (dados.pronomes || "") || profissao !== (dados.profissao || "");
  if (nick && (!NICK_RE.test(nick) || !nickDisponivel)) { toast("Escolha um nome de usuário disponível."); $("edUsuario").focus(); return; }
  const btn = $("edSalvar");
  btn.disabled = true; btn.textContent = "Salvando...";
  try {
    const publico = { uid: eu.uid, nome, bio, cidade, uf, cidadeIbge };
    const privado = { nome, bio, cidade, uf, cidadeIbge, telefone, pronomes, profissao };
    // Fotos novas
    for (const [campo, pasta] of [["fotoPerfil", "fotosPerfil"], ["fotoCapa", "fotosCapa"]]) {
      const novo = edRascunho[campo] || "";
      if (novo === (dados[campo] || "")) continue;
      const url = novo.startsWith("data:") ? await salvarImagem(novo, `${pasta}/${eu.uid}.jpg`) : novo;
      publico[campo] = url; privado[campo] = url;
    }
    // Nome de usuário: reserva o novo e libera o antigo numa transação
    const nickAntigo = dados.nickname || "";
    if (nick && nick !== nickAntigo) {
      await fb.runTransaction(fb.db, async (tx) => {
        const refNovo = fb.doc(fb.db, "nicknames", nick);
        const novo = await tx.get(refNovo);
        if (novo.exists() && novo.data().uid !== eu.uid) throw new Error("Esse nome de usuário acabou de ser escolhido por outra pessoa.");
        let antigo = null;
        if (nickAntigo) antigo = await tx.get(fb.doc(fb.db, "nicknames", nickAntigo));
        if (!novo.exists()) tx.set(refNovo, { uid: eu.uid, criadoEm: fb.serverTimestamp() });
        if (antigo?.exists() && antigo.data().uid === eu.uid) tx.delete(antigo.ref);
        // O perfil público passa a usar o novo @ na mesma transação (as regras conferem).
        tx.set(fb.doc(fb.db, "perfis_publicos", eu.uid), { uid: eu.uid, nickname: nick }, { merge: true });
      });
      publico.nickname = nick; privado.nickname = nick;
    }
    await fb.setDoc(refUsuario, privado, { merge: true });
    await gravarComLocal((d) => fb.setDoc(fb.doc(fb.db, "perfis_publicos", eu.uid), d, { merge: true }), publico, NOVOS.perfil);
    fb.setDoc(fb.doc(fb.db, "perfis_publicos", eu.uid), { uid: eu.uid, busca: palavrasBusca(publico.nome || dados.nome, publico.nickname || dados.nickname) }, { merge: true }).catch(() => {});
    try { if (authFns.updateProfile && nome !== eu.displayName) await authFns.updateProfile(eu, { displayName: nome }); } catch {}
    let avisoLinks = "";
    if (linksMudaram) {
      const r = await gravarLinks(fb, eu.uid, linksNovos);
      dados.linksPerfil = Object.fromEntries(Object.entries(linksNovos).filter(([, v]) => v.valor));
      if (r === "sem-regras") avisoLinks = " · as redes aparecem para os outros depois da publicação das regras";
    }
    // Pronomes e profissão ficam em pref_publicas (todos com conta leem); sem as regras novas, só você vê.
    if (extrasMudaram) {
      try { await fb.setDoc(fb.doc(fb.db, "pref_publicas", eu.uid), { pronomes, profissao, atualizadoEm: fb.serverTimestamp() }, { merge: true }); cachePref.delete(eu.uid); }
      catch (e) { if (e?.code === "permission-denied") avisoLinks = " · pronomes, profissão e redes aparecem para os outros depois da publicação das regras"; else throw e; }
    }
    Object.assign(dados, privado);
    perfis.delete(eu.uid);
    // As publicações antigas passam a mostrar o nome e a foto novos (Flash, Mensagens, grade, comentários).
    atualizarMinhasPublicacoes().then(() => meusPosts.forEach((p) => Object.assign(p, { nome: dados.nome, fotoPerfil: dados.fotoPerfil || "" }))).catch(() => {});
    renderizarMeuPerfil();
    renderizarGrade($("gradePosts"), meusPosts, { proprio: true, autor: dados, uid: eu.uid, barra: $("abasMeuPerfil") });
    fecharFolha("folhaEditar");
    toast("Perfil atualizado" + avisoLinks);
  } catch (e) {
    console.error(e);
    toast("Não foi possível salvar: " + erroAmigavel(e));
  } finally {
    btn.disabled = false; btn.textContent = "Salvar alterações";
  }
});

// ======================================================
// Verificação, compartilhar
// ======================================================
// Verificação: tela completa (verificacao.js) com situação, requisitos e o pedido em passos.
function solicitarVerificacao() { abrirVerificacao({ aoMudar: () => renderizarMeuPerfil() }); }
// ======================================================
// Seguir
// ======================================================
// Quem me segue (para os filtros "não segue de volta" e o selo "Segue você"): uma leitura por página.
let meusSeguidoresP = null;
const meusSeguidores = () => (meusSeguidoresP ||= fb.getDocs(fb.query(fb.collection(fb.db, "relacoes"), fb.where("tipo", "==", "seguir"), fb.where("alvoId", "==", eu.uid), fb.limit(500)))
  .then((s) => new Set(s.docs.map((d) => d.data().seguidorId))).catch(() => { meusSeguidoresP = null; return new Set(); }));
const semAcento = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Seguidores / Seguindo: abas no topo, busca por nome ou @ e filtros úteis (não segue de volta, mútuos...).
async function abrirListaRelacoes(uid, tipo) {
  const proprioL = uid === eu.uid;
  const corpo = $("listaCorpo");
  $("tLista").textContent = proprioL ? "Sua rede" : "Conexões";
  corpo.replaceChildren();
  abrirFolha("folhaLista");
  const topo = el("div", "rel-topo");
  const abas = el("div", "rel-abas"); abas.setAttribute("role", "tablist");
  const busca = el("label", "rel-busca"); busca.appendChild(icone("lupa", "i s"));
  const campo = document.createElement("input"); campo.type = "search"; campo.placeholder = "Buscar por nome ou @usuário"; campo.setAttribute("aria-label", "Buscar na lista"); campo.autocomplete = "off";
  const limpar = el("button", "rel-limpar"); limpar.type = "button"; limpar.hidden = true; limpar.setAttribute("aria-label", "Limpar busca"); limpar.appendChild(icone("fechar", "i xs"));
  busca.append(campo, limpar);
  const chips = el("div", "rel-chips");
  topo.append(abas, busca, chips);
  const lista = el("div", "rel-lista");
  corpo.append(topo, lista);
  const cache = {};
  let atual = tipo, filtro = "todos";
  const carregarTipo = (t) => (cache[t] ||= (async () => {
    await meusSeguindoPronto;
    const seg = t === "seguidores";
    const snap = await fb.getDocs(fb.query(fb.collection(fb.db, "relacoes"), fb.where("tipo", "==", "seguir"), fb.where(seg ? "alvoId" : "seguidorId", "==", uid), fb.limit(300)));
    const rel = snap.docs.map((d) => d.data()).filter((r) => r[seg ? "seguidorId" : "alvoId"] && !escondido(r[seg ? "seguidorId" : "alvoId"]))
      .sort((x, y) => ms(y.criadoEm) - ms(x.criadoEm));
    const [perfis, meSeguem] = await Promise.all([Promise.all(rel.map((r) => obterPerfil(r[seg ? "seguidorId" : "alvoId"]).catch(() => ({})))), meusSeguidores()]);
    return rel.map((r, i) => { const u = r[seg ? "seguidorId" : "alvoId"], p = perfis[i] || {}; return { uid: u, p, desde: r.criadoEm, sigo: meusSeguindo.has(u), meSegue: meSeguem.has(u), txt: semAcento(`${p.nome || ""} ${p.nickname || ""}`) }; });
  })());
  // Filtros de cada lista (contados na hora).
  const FILTROS_REL = {
    seguidores: proprioL
      ? [["todos", "Todos", () => true], ["naoSigo", "Você não segue de volta", (x) => !x.sigo], ["mutuos", "Mútuos", (x) => x.sigo]]
      : [["todos", "Todos", () => true], ["sigo", "Quem você segue", (x) => x.sigo], ["meSeguem", "Seguem você", (x) => x.meSegue]],
    seguindo: proprioL
      ? [["todos", "Todos", () => true], ["naoMeSegue", "Não seguem você de volta", (x) => !x.meSegue], ["mutuos", "Mútuos", (x) => x.meSegue]]
      : [["todos", "Todos", () => true], ["sigo", "Quem você segue", (x) => x.sigo], ["meSeguem", "Seguem você", (x) => x.meSegue]]
  };
  const pintarAbas = () => {
    abas.replaceChildren(...[["seguidores", "Seguidores"], ["seguindo", "Seguindo"]].map(([k, rot]) => {
      const b = el("button", "rel-aba" + (k === atual ? " ativa" : "")); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(k === atual));
      const n = k === "seguidores" ? (proprioL ? contagem.seguidores : ppContagem.seguidores) : (proprioL ? contagem.seguindo : ppContagem.seguindo);
      b.append(el("strong", null, String(n ?? "")), el("span", null, rot));
      b.addEventListener("click", () => { if (k === atual) return; atual = k; filtro = "todos"; pintarAbas(); desenhar(); });
      return b;
    }));
  };
  const desenhar = async () => {
    const meu = atual;
    if (!cache[meu]) lista.replaceChildren(el("div", "lista-vazia", "Carregando..."));
    let itens;
    try { itens = await carregarTipo(meu); } catch (e) { delete cache[meu]; if (meu === atual) lista.replaceChildren(el("div", "lista-vazia", "Não foi possível carregar: " + erroAmigavel(e))); return; }
    if (meu !== atual) return;
    itens.forEach((x) => { x.sigo = meusSeguindo.has(x.uid); });
    const fs = FILTROS_REL[meu];
    chips.replaceChildren(...fs.map(([k, rot, f]) => {
      const n = itens.filter(f).length;
      const c = el("button", "rel-chip" + (k === filtro ? " ativo" : "")); c.type = "button"; c.setAttribute("aria-pressed", String(k === filtro));
      c.append(el("span", null, rot), el("em", null, String(n)));
      c.addEventListener("click", () => { filtro = k; desenhar(); });
      return c;
    }));
    const termo = semAcento(campo.value.trim().replace(/^@/, ""));
    const f = (fs.find(([k]) => k === filtro) || fs[0])[2];
    const vis = itens.filter((x) => f(x) && (!termo || x.txt.includes(termo)));
    if (!itens.length) { lista.replaceChildren(el("div", "lista-vazia", meu === "seguidores" ? "Ainda sem seguidores." : "Ainda não segue ninguém.")); return; }
    if (!vis.length) { lista.replaceChildren(el("div", "lista-vazia", termo ? `Ninguém encontrado para “${campo.value.trim()}”.` : "Ninguém nesse filtro.")); return; }
    const dica = filtro === "naoMeSegue" ? "Essas contas não seguem você. Toque em Seguindo para deixar de seguir." : filtro === "naoSigo" ? "Essas pessoas seguem você, mas você não segue de volta." : "";
    lista.replaceChildren(...(dica ? [el("p", "rel-dica", dica)] : []), ...vis.map((x) => {
      const meusSeg = meu === "seguidores" && proprioL;
      const sub = [x.p.nickname ? "@" + x.p.nickname : textoCidade({ cidade: nomeCidade(x.p.cidade), uf: x.p.uf })].filter(Boolean).join("");
      const l = linhaPessoa({
        uid: x.uid, nome: x.p.nome, foto: x.p.fotoPerfil, sub, meSegue: x.meSegue,
        acoes: meusSeg ? [{ rotulo: "Remover", fn: async (_b, linha) => { if (await removerSeguidor(x.uid, x.p.nome)) { linha.remove(); const i = itens.indexOf(x); if (i >= 0) itens.splice(i, 1); contagem.seguidores = Math.max(0, contagem.seguidores - 1); pintarAbas(); } } }] : []
      });
      if (x.meSegue && x.uid !== eu.uid && !meusSeg) { const t = el("span", "rel-selo", "Segue você"); const sm = l.querySelector(".txt small"); if (sm) sm.append(t); else l.querySelector(".txt")?.append(t); }
      return l;
    }));
  };
  let espera = null;
  campo.addEventListener("input", () => { limpar.hidden = !campo.value; clearTimeout(espera); espera = setTimeout(desenhar, 120); });
  limpar.addEventListener("click", () => { campo.value = ""; limpar.hidden = true; desenhar(); campo.focus(); });
  pintarAbas();
  desenhar();
}


// Link de avaliação (usuarios.html?avaliar=ID do pedido), enviado pelo chat ou WhatsApp.
// Uma nota por cliente em cada negócio: o pedido só marca "Atendimento confirmado".
async function avaliarPorLink(pid) {
  try {
    const snap = await fb.getDoc(fb.doc(fb.db, "pedidos", pid));
    if (!snap.exists()) { toast("Pedido de avaliação não encontrado."); return; }
    const pe = snap.data();
    const souCliente = pe.clienteId === eu.uid;
    if (!souCliente && pe.vendedorId !== eu.uid) { toast("Este pedido de avaliação é de outra pessoa."); return; }
    const autor = { nome: dados?.nome, foto: dados?.fotoPerfil };
    if (souCliente) {
      const neg = await fb.getDoc(fb.doc(fb.db, "negocios", pe.negocioId)).then((s) => (s.exists() ? { id: s.id, ...s.data() } : null)).catch(() => null);
      await avaliarNegocio(fb, eu, neg || { id: pe.negocioId, donoId: pe.vendedorId, tipo: pe.tipo }, { pedidoId: pid, autor, aoAvaliar: (n, editou) => toast(editou ? "Avaliação atualizada" : "Obrigado pela avaliação!") });
    } else {
      const outro = await obterPerfil(pe.clienteId).catch(() => ({}));
      await avaliarCliente(fb, eu, pe.negocioId, pe.clienteId, { nomeCliente: outro?.nome || "cliente", pedidoId: pid, autor, aoAvaliar: () => toast("Avaliação do cliente salva") });
    }
  } catch (e) { console.error(e); toast("Não foi possível abrir a avaliação: " + erroAmigavel(e)); }
}

// ======================================================
// Perfil de outra pessoa
// ======================================================
let ppCab = null, ppMeSegue = false;
async function abrirPerfilPublico(uid) {
  definirOrigem("perfil");
  if (!uid) return;
  if (uid === eu.uid) { pilha.slice().forEach(fecharFolha); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
  esquecerLinks(uid); // seguir/deixar de seguir muda o que dá para ver
  ppCab = montarCabecalho($("ppCabecalho"));
  $("ppGrade").replaceChildren();
  perfis.delete(uid);
  const p = await obterPerfil(uid);
  preencherCabecalho(ppCab, p);
  prefPublicas(uid).then((pref) => { if (ppCab) aplicarPref(ppCab, pref); });
  pintarLinksPerfil(ppCab, uid);
  anelNoPerfil(ppCab.el("avatar"), uid);
  voltarAoFlash();
  destaquesNoPerfil(ppCab.raiz.querySelector(".pf-corpo"), uid);
  segurarFoto(ppCab.raiz.querySelector(".pf-avatar-wrap"), () => ({ uid, p, proprio: false }));
  // Topo do perfil de outra pessoa (como nos apps): voltar · @nome (e o selo) · compartilhar.
  const tp = $("tPerfilPublico"); tp.replaceChildren();
  const tn = el("span", "tn-nome");
  if (p.nickname) { const ar = el("i", null, "@"); tn.append(ar, document.createTextNode(p.nickname)); } else tn.textContent = p.nome || "Perfil";
  tp.appendChild(tn);
  if (p.verificado) tp.appendChild(icone("selo", "i tn-selo"));
  tp.title = p.nickname ? "@" + p.nickname : p.nome || "Perfil";
  $("ppCompartilhar").onclick = () => compartilharPerfil(uid, p.nome);
  abrirFolha("folhaPerfil");

  const acoesTopo = ppCab.el("acoes");
  acoesTopo.replaceChildren(botaoOpcoesPerfil(uid, p));
  if (bloqueadoPor.has(uid) || meusBloqueios.has(uid)) {
    const eu_bloqueei = meusBloqueios.has(uid);
    ppCab.raiz.querySelector(".pf-stats").hidden = true;
    const aviso = document.createElement("div");
    aviso.className = "bloqueado-aviso";
    const t = document.createElement("strong");
    t.textContent = eu_bloqueei ? "Você bloqueou esta conta" : "Perfil indisponível";
    aviso.append(t, eu_bloqueei ? "Desbloqueie para ver as publicações e trocar mensagens." : "Não é possível ver este perfil.");
    if (eu_bloqueei) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "btn sec"; b.style.marginTop = "12px"; b.textContent = "Desbloquear";
      b.addEventListener("click", async () => { if (await desbloquear(uid)) abrirPerfilPublico(uid); });
      aviso.append(document.createElement("br"), b);
    }
    ppCab.el("extra").replaceChildren(aviso);
    return;
  }
  // Conta desativada (ou com exclusão pedida): nada do perfil aparece.
  if ((p.desativadaAte?.toMillis?.() ?? 0) > Date.now()) {
    ppCab.raiz.querySelector(".pf-stats").hidden = true;
    acoesTopo.replaceChildren();
    const aviso = document.createElement("div");
    aviso.className = "bloqueado-aviso";
    const t = document.createElement("strong");
    t.textContent = "Conta desativada";
    aviso.append(t, "Esta pessoa desativou a conta por um tempo. O perfil volta a aparecer quando ela reativar.");
    ppCab.el("extra").replaceChildren(aviso);
    return;
  }

  const [c1, c2, inv, posts, vins] = await Promise.allSettled([
    contarRelacoes("alvoId", uid), contarRelacoes("seguidorId", uid),
    fb.getDoc(fb.doc(fb.db, "relacoes", `${uid}_${eu.uid}`)), buscarPosts(uid), buscarVinculos(uid)
  ]);
  await meusSeguindoPronto;
  const meSegue = inv.status === "fulfilled" && inv.value.exists();
  const lista = posts.status === "fulfilled" ? posts.value : [];
  ppContagem.seguidores = c1.status === "fulfilled" ? c1.value : 0;
  ppContagem.seguindo = c2.status === "fulfilled" ? c2.value : 0;
  preencherCabecalho(ppCab, p, { posts: lista.length, ...ppContagem });
  prefPublicas(uid).then((pref) => { if (ppCab) aplicarPref(ppCab, pref); });
  const acoes = ppCab.el("acoes");
  acoes.replaceChildren();
  ppMeSegue = meSegue;
  const bSeguir = botaoSeguir(uid, { meSegue, mini: false });
  const bMsg = document.createElement("button");
  bMsg.type = "button"; bMsg.className = "btn sec";
  bMsg.append(icone("chat", "i xs"), document.createTextNode("Mensagem"));
  bMsg.addEventListener("click", () => iniciarConversa(uid));
  // Como nas redes sociais: Seguir · Mensagem · ⋯ (Social, compartilhar, bloquear... ficam no ⋯)
  acoes.append(bSeguir, bMsg, botaoOpcoesPerfil(uid, { ...p, comSocial: (p.socialVisibilidade || "todos") !== "ocultar" }));
  // O duo na capa segue a escolha do dono: clicável, só a foto ou oculto.
  desenharDuoCapa(ppCab, uid, p, vins.status === "fulfilled" ? vins.value : [], (p.duoCapa || "clicavel") === "clicavel");
  // Atalhos dos negócios: só se a pessoa deixou aparecer no perfil (pref_publicas.negociosNoPerfil; padrão sim).
  Promise.all([buscarNegocios(uid).then((lista) => semPausados(fb, lista)), atalhosNoPerfil(uid)])
    .then(([lista, mostra]) => renderizarNegocios(ppCab.el("negocios"), mostra ? lista : [], { proprio: false, dono: { ...p, uid } })).catch(() => {});
  ppCab.stat("posts").addEventListener("click", () => $("ppGrade").scrollIntoView({ behavior: "smooth" }));
  ppCab.stat("seguidores").addEventListener("click", () => abrirListaRelacoes(uid, "seguidores"));
  ppCab.stat("seguindo").addEventListener("click", () => abrirListaRelacoes(uid, "seguindo"));
  renderizarGrade($("ppGrade"), lista, { proprio: false, autor: { ...p, uid }, uid });
}

// ======================================================
// Bloquear, restringir, remover seguidor
// ======================================================
function botaoOpcoesPerfil(uid, p) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "btn sec icone"; b.setAttribute("aria-label", "Mais opções");
  b.appendChild(icone("pontos", "i s"));
  b.addEventListener("click", () => {
    const bloq = meusBloqueios.has(uid);
    abrirOpcoes(p.nome || "Opções", [
      !bloq && !bloqueadoPor.has(uid) && { rotulo: "Adicionar ao meu social", sub: "Duo, família, amigos", icone: "fio", fn: () => abrirNovoVinculo({ uid, ...p }) },
      p.comSocial && !bloq && { rotulo: "Ver o social", sub: "Duo, família e amigos", icone: "teia", fn: () => { location.href = `social.html?uid=${encodeURIComponent(uid)}`; } },
      !bloq && !bloqueadoPor.has(uid) && { rotulo: "Enviar um presente", sub: "Mimo, lanche, roupa, dinheiro ou corrida", icone: "coracao", fn: () => { try { (window.top || window).location.href = `presentes.html?para=${encodeURIComponent(uid)}`; } catch { location.href = `presentes.html?para=${encodeURIComponent(uid)}`; } } },
      { rotulo: "Compartilhar perfil", icone: "compartilhar", fn: () => compartilharPerfil(uid, p.nome) },
      !bloq && ppMeSegue && { rotulo: "Remover seguidor", sub: "Deixa de seguir você, sem aviso", icone: "pessoa-menos", fn: async () => { if (await removerSeguidor(uid, p.nome)) { ppMeSegue = false; abrirPerfilPublico(uid); } } },
      !bloq && { rotulo: silenciado(uid) ? "Mostrar no meu Diário de novo" : "Silenciar", sub: silenciado(uid) ? "As publicações e flashes voltam a aparecer" : "Continua seguindo, mas as publicações e flashes somem do seu Diário", icone: "restringir", fn: () => alternarSilenciar(uid, p.nome) },
      !bloq && { rotulo: restritos.has(uid) ? "Remover restrição" : "Restringir", sub: restritos.has(uid) ? "Volta a receber avisos dessa pessoa" : "Mensagens vão para Restritas, sem avisos", icone: "restringir", fn: () => alternarRestricao(uid, p.nome) },
      { rotulo: "Denunciar perfil", sub: "Golpe, perfil falso, assédio...", icone: "alerta", perigo: true,
        fn: () => abrirDenuncia({ fb, eu, tipo: "perfil", alvoId: uid, itemId: uid, trecho: [p.nome, p.nickname ? "@" + p.nickname : "", p.bio].filter(Boolean).join(" · "), nomeAlvo: p.nome || "",
          podeBloquear: !bloq, aoBloquear: async () => { if (await bloquear(uid, p.nome)) abrirPerfilPublico(uid); } }) },
      { rotulo: bloq ? "Desbloquear" : "Bloquear", sub: bloq ? "" : "Ela não poderá abrir seu perfil nem falar com você", icone: "bloquear", perigo: !bloq,
        fn: async () => { const ok = bloq ? await desbloquear(uid) : await bloquear(uid, p.nome); if (ok) abrirPerfilPublico(uid); } }
    ]);
  });
  return b;
}

// ======================================================
// Social: duo (Akai Ito), família, amigos
// ======================================================
const TIPOS = {
  duo: { rotulo: "Duo", cat: "duo" },
  namoro: { rotulo: "Namorado(a)", cat: "amor" },
  casamento: { rotulo: "Cônjuge", cat: "amor" },
  melhor_amigo: { rotulo: "Melhor amigo(a)", cat: "amizade" },
  amigo: { rotulo: "Amigo(a)", cat: "amizade" },
  irmao: { rotulo: "Irmão(ã)", cat: "familia" },
  pai_mae: { rotulo: "Pai/Mãe", cat: "familia" },
  filho: { rotulo: "Filho(a)", cat: "familia" },
  primo: { rotulo: "Primo(a)", cat: "familia" },
  tio: { rotulo: "Tio(a)", cat: "familia" },
  sobrinho: { rotulo: "Sobrinho(a)", cat: "familia" },
  avo: { rotulo: "Avô/Avó", cat: "familia" },
  neto: { rotulo: "Neto(a)", cat: "familia" },
  parceiro: { rotulo: "Parceiro(a) de trabalho", cat: "trabalho" }
};
const INVERSO = { duo: "duo", namoro: "namoro", casamento: "casamento", melhor_amigo: "melhor_amigo", amigo: "amigo", irmao: "irmao", pai_mae: "filho", filho: "pai_mae", primo: "primo", tio: "sobrinho", sobrinho: "tio", avo: "neto", neto: "avo", parceiro: "parceiro" };
// Duo, namoro e casamento são o mesmo lugar: a pessoa ligada pelo Akai Ito. Só um por vez.
const TIPOS_DUO = ["duo", "namoro", "casamento"];
const EXCLUSIVOS = { duo: TIPOS_DUO, namoro: TIPOS_DUO, casamento: TIPOS_DUO };
const rotuloTipo = (t) => TIPOS[t]?.rotulo || "Vínculo";

// Do ponto de vista de "uid": quem é o outro e o que ele é para "uid".
function lerVinculo(v, uid) {
  const outro = (v.participantes || []).find((x) => x !== uid);
  const tipo = uid === v.de ? v.tipoDe : v.tipoPara;
  return { ...v, outro, tipo, pendente: v.status !== "aceito" };
}

async function buscarVinculos(uid) {
  // Perfil de outra pessoa: só vínculos aceitos (pedidos pendentes são privados pelas regras).
  const filtros = [fb.where("participantes", "array-contains", uid)];
  if (uid !== eu.uid) filtros.push(fb.where("status", "==", "aceito"));
  const snap = await fb.getDocs(fb.query(fb.collection(fb.db, "vinculos"), ...filtros, fb.limit(60)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Quem pode abrir os perfis do social de alguém.
function podeAbrirSocial(p, uid, meSegue) {
  if (uid === eu.uid) return true;
  const vis = p.socialVisibilidade || "todos";
  if (vis === "todos") return true;
  if (vis === "seguidores") return meusSeguindo.has(uid);
  if (vis === "amigos") return meusSeguindo.has(uid) && !!meSegue;
  return false;
}

// No seu próprio perfil, o botão Social mostra como está a privacidade das conexões.
function pintarMeuSocial() {
  const b = $("meuSocial");
  if (!b) return;
  const vis = dados.socialVisibilidade || "todos";
  b.replaceChildren(icone(vis === "todos" ? "teia" : "cadeado", "i xs"), document.createTextNode("Social"));
  b.classList.toggle("restrito", vis !== "todos");
  b.title = {
    todos: "Todos podem abrir os perfis do seu social",
    seguidores: "Só seus seguidores abrem os perfis do seu social",
    amigos: "Só amigos (quem segue e é seguido) abrem os perfis do seu social",
    ocultar: "O botão Social não aparece para os visitantes"
  }[vis] || "";
}

function botaoSocial(uid) {
  const b = document.createElement("a");
  b.className = "btn sec";
  b.href = uid === eu.uid ? "social.html" : `social.html?uid=${encodeURIComponent(uid)}`;
  b.append(icone("teia", "i xs"), document.createTextNode("Social"));
  return b;
}

// Duo (Akai Ito): uma rosinha no canto da foto de perfil, no lugar da foto do duo e do fio na capa.
// O dono escolhe em Configurações: clicável (abre o perfil do duo), só a rosinha ou oculta.
function desenharDuoCapa(cab, uid, dono, vinculos, podeAbrir) {
  const linha = cab.raiz.querySelector(".pf-avatar-wrap");
  linha.querySelectorAll(".pf-rosa, .pf-duo-bolha").forEach((x) => x.remove());
  linha.classList.remove("com-rosa");
  const modo = dono.duoCapa || "clicavel";
  if (modo === "ocultar") return;
  const duo = vinculos.map((v) => lerVinculo(v, uid)).find((v) => TIPOS_DUO.includes(v.tipo) && !v.pendente && !escondido(v.outro));
  if (!duo) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "pf-rosa";
  btn.appendChild(icone("rosa", "i"));
  linha.appendChild(btn);
  linha.classList.add("com-rosa");
  const papel = duo.tipo === "duo" ? "Duo" : rotuloTipo(duo.tipo);
  btn.setAttribute("aria-label", papel);
  btn.setAttribute("aria-expanded", "false");
  // Tocar na rosinha: aparece a fotinho redonda do duo. "Clicável": a fotinho abre o perfil; "Só a rosinha": só mostra.
  const bolha = document.createElement("button");
  bolha.type = "button"; bolha.className = "pf-duo-bolha" + (podeAbrir ? "" : " so-ver") + (modo === "foto" ? " sem-nome" : ""); bolha.hidden = true;
  const av = document.createElement("div"); av.className = "avatar";
  const nm = document.createElement("span"); nm.className = "nm";
  bolha.append(av, nm);
  linha.appendChild(bolha);
  obterPerfil(duo.outro).then((o) => {
    pintarAvatar(av, o.fotoPerfil, o.nome);
    nm.replaceChildren(el("small", null, papel === "Duo" ? "Duo · Akai Ito" : papel), el("b", null, (o.nome || "Usuário").split(" ")[0]));
    btn.setAttribute("aria-label", `${papel}: ${o.nome || "Usuário"}`);
    bolha.setAttribute("aria-label", podeAbrir ? `Abrir o perfil de ${o.nome || "Usuário"}` : `${papel}: ${o.nome || "Usuário"}`);
  });
  let fora = null, tempo = null;
  const esconder = () => { bolha.classList.remove("aberta"); btn.setAttribute("aria-expanded", "false"); clearTimeout(tempo); document.removeEventListener("pointerdown", fora, true); setTimeout(() => { if (!bolha.classList.contains("aberta")) bolha.hidden = true; }, 200); };
  fora = (e) => { if (!bolha.contains(e.target) && !btn.contains(e.target)) esconder(); };
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    // "Só a rosinha": não mostra foto nem nome, só a rosinha pulsa.
    if (modo === "rosa") { btn.classList.remove("pulsa"); void btn.offsetWidth; btn.classList.add("pulsa"); navigator.vibrate?.(6); if (uid === eu.uid) toast("Rosinha em \"Só a rosinha\": ninguém vê a foto nem o nome do seu duo. Mude em Configurações."); return; }
    if (bolha.classList.contains("aberta")) { esconder(); return; }
    bolha.hidden = false; requestAnimationFrame(() => bolha.classList.add("aberta"));
    btn.setAttribute("aria-expanded", "true");
    navigator.vibrate?.(6);
    document.addEventListener("pointerdown", fora, true);
    clearTimeout(tempo); tempo = setTimeout(esconder, 5000);
  });
  bolha.addEventListener("click", (e) => {
    e.stopPropagation();
    if (podeAbrir) { esconder(); abrirPerfilPublico(duo.outro); }
    else if (uid === eu.uid) toast("Rosinha em \"Só a rosinha\": visitantes veem a foto, mas não abrem o perfil do seu duo. Mude em Configurações.");
  });
}

// ======================================================
// Perfis de negócio: serviços, delivery, lojinha, imóveis
// ======================================================
const NEGOCIOS = {
  servicos: { rotulo: "Freelances", img: "servicos-480.webp", pagina: "servicos.html" },
  delivery: { rotulo: "Delivery", img: "lanchonetes-480.webp", pagina: "delivery.html" },
  lojinha: { rotulo: "Lojinha", img: "shopping-480.webp", pagina: "shopping.html" },
  imoveis: { rotulo: "Imóveis", img: "imoveis-480.webp", pagina: "imoveis.html" },
  saude: { rotulo: "Saúde", img: "saude.svg", pagina: "saude.html" },
  automotivo: { rotulo: "Automotivo", img: "automotivo.svg", pagina: "automotivo.html" }
};
let meusNegocios = [];

async function buscarNegocios(uid) {
  const snap = await fb.getDocs(fb.query(fb.collection(fb.db, "negocios"), fb.where("donoId", "==", uid), fb.limit(8)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => Object.keys(NEGOCIOS).indexOf(a.tipo) - Object.keys(NEGOCIOS).indexOf(b.tipo));
}
async function carregarMeusNegocios() {
  try { meusNegocios = await buscarNegocios(eu.uid); } catch (e) { console.warn("Negócios indisponíveis:", e); meusNegocios = []; }
  renderizarMeuPerfil();
}

// Atalhos dos negócios no perfil (12/11/2026): quem tem negócio escolhe se aparecem para os visitantes; quem não tem
// não vê a fileira (nem o "Novo negócio"). Guardado em pref_publicas/{uid}.negociosNoPerfil (todos leem).
function atalhosNoPerfil(uid) { return prefPublicas(uid).then((d) => mostraNoPerfil(d, "negocios")); }
async function mudarAtalhos(mostrar) {
  if (!(await salvarPref({ negociosNoPerfil: mostrar }))) return;
  toast(mostrar ? "Seus negócios aparecem no seu perfil" : "Seus negócios saíram do seu perfil (continuam nas vitrines e na busca)");
  renderizarMeuPerfil();
}
function renderizarNegocios(box, lista, { proprio, dono }) {
  // Sem negócio: nada (o "Novo negócio" fica em Meus negócios e no menu).
  if (!lista.length) { box.hidden = true; return; }
  box.hidden = false;
  box.replaceChildren();
  const linha = document.createElement("div");
  linha.className = "vinculos";
  lista.forEach((n) => {
    const t = NEGOCIOS[n.tipo];
    if (!t) return;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "vinculo";
    b.dataset.cat = n.tipo;
    const av = document.createElement("div");
    av.className = "avatar";
    pintarAvatar(av, n.foto, n.nome);
    if (!urlSegura(n.foto)) { av.style.background = `#0a2a38 url(${t.img}) center / cover`; av.textContent = ""; }
    const nome = document.createElement("span");
    nome.className = "nome";
    nome.textContent = n.nome || t.rotulo;
    const papel = document.createElement("span");
    papel.className = "papel";
    papel.textContent = t.rotulo;
    b.append(av, nome, papel);
    const abrirNeg = () => abrirPerfilNegocio(n, {
      fb, eu, dono, proprio, origem: "perfil",
      aoMensagem: (uid, cartao) => iniciarConversa(uid, cartao),
      aoPerfil: (uid) => abrirPerfilPublico(uid),
      aoEditar: proprio ? (neg) => { location.href = `negocios.html?tipo=${encodeURIComponent(neg.tipo)}`; } : null
    });
    // Flash do negócio: anel na foto; tocar na foto abre o flash (o nome embaixo abre o perfil do negócio). No flash, o
    // botão "Ver produtos/cardápio/serviços" fecha o flash e abre aqui mesmo o perfil do negócio (vitrine e pedidos).
    anelNegocio(fb, eu, av, n, { aoPerfil: (uid) => abrirPerfilPublico(uid), aoMensagem: proprio ? null : () => iniciarConversa(n.donoId), aoVitrine: abrirNeg });
    b.addEventListener("click", abrirNeg);
    linha.appendChild(b);
  });
  box.appendChild(linha);
}


function opcoesVinculo(v, o) {
  const nome = o.nome || "Usuário";
  if (v.pendente && v.para === eu.uid) {
    abrirOpcoes(`${nome}: ${rotuloTipo(v.tipo)}`, [
      { rotulo: "Aceitar", icone: "check", fn: () => responderVinculo(v.id, true) },
      { rotulo: "Recusar", icone: "fechar", perigo: true, fn: () => responderVinculo(v.id, false) },
      { rotulo: "Ver perfil", icone: "olho", fn: () => abrirPerfilPublico(v.outro) }
    ]);
    return;
  }
  abrirOpcoes(`${nome}: ${rotuloTipo(v.tipo)}`, [
    { rotulo: "Ver perfil", icone: "olho", fn: () => abrirPerfilPublico(v.outro) },
    { rotulo: v.pendente ? "Cancelar pedido" : "Desfazer vínculo", sub: v.pendente ? "" : "Some dos dois perfis", icone: "lixo", perigo: true,
      fn: async () => {
        if (!v.pendente && !await confirmarHF({ titulo: `Desfazer o vínculo com ${nome}?`, texto: "Ele some dos dois perfis.", ok: "Desfazer", icone: "pessoa" })) return;
        try { await fb.deleteDoc(fb.doc(fb.db, "vinculos", v.id)); toast(v.pendente ? "Pedido cancelado" : "Vínculo desfeito"); }
        catch (e) { toast("Não foi possível: " + erroAmigavel(e)); }
      } }
  ]);
}

function conflitoExclusivo(tipo, ignorarId) {
  const grupo = EXCLUSIVOS[tipo];
  if (!grupo) return null;
  return meusVinculos.map((v) => lerVinculo(v, eu.uid)).find((v) => v.id !== ignorarId && !v.pendente && grupo.includes(v.tipo)) || null;
}

async function responderVinculo(id, aceitar) {
  try {
    const v = meusVinculos.find((x) => x.id === id);
    if (aceitar && v) {
      const conflito = conflitoExclusivo(lerVinculo(v, eu.uid).tipo, id);
      if (conflito) { toast(`Você já tem ${rotuloTipo(conflito.tipo).toLowerCase()} no seu social. Desfaça antes de aceitar.`); return; }
    }
    if (aceitar) await fb.updateDoc(fb.doc(fb.db, "vinculos", id), { status: "aceito", aceitoEm: fb.serverTimestamp() });
    else await fb.deleteDoc(fb.doc(fb.db, "vinculos", id));
    toast(aceitar ? "Vínculo aceito" : "Pedido recusado");
  } catch (e) { toast("Não foi possível responder: " + erroAmigavel(e)); }
}

// ---------- novo vínculo ----------
let vinTipo = "duo", vinAlvo = null;
function abrirNovoVinculo(alvo) {
  vinAlvo = alvo && alvo.uid ? alvo : null;
  vinTipo = "duo";
  const tipos = $("vinTipos");
  tipos.replaceChildren();
  Object.entries(TIPOS).forEach(([k, t]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tipo" + (k === vinTipo ? " on" : "");
    b.dataset.cat = t.cat;
    const bola = document.createElement("i");
    if (k === "duo" || k === "namoro" || k === "casamento") b.append(icone("rosa", "i s"), document.createTextNode(k === "duo" ? "Duo (Akai Ito)" : t.rotulo));
    else b.append(bola, document.createTextNode(t.rotulo));
    b.addEventListener("click", () => {
      vinTipo = k;
      tipos.querySelectorAll(".tipo").forEach((x) => x.classList.toggle("on", x === b));
    });
    tipos.appendChild(b);
  });
  pintarAlvoVinculo();
  abrirFolha("folhaVinculo");
}
function pintarAlvoVinculo() {
  const box = $("vinPessoa");
  box.replaceChildren();
  if (vinAlvo) {
    const e = document.createElement("div");
    e.className = "escolhido";
    const av = document.createElement("div");
    av.className = "avatar";
    pintarAvatar(av, vinAlvo.fotoPerfil, vinAlvo.nome);
    const n = document.createElement("strong");
    n.textContent = vinAlvo.nome || "Usuário";
    const trocar = document.createElement("button");
    trocar.type = "button"; trocar.className = "btn sec mini"; trocar.textContent = "Trocar";
    trocar.addEventListener("click", () => { vinAlvo = null; pintarAlvoVinculo(); });
    e.append(av, n, trocar);
    box.appendChild(e);
    return;
  }
  const busca = document.createElement("div");
  busca.className = "busca";
  busca.style.margin = "0 0 8px";
  busca.appendChild(icone("lupa", "i s"));
  const inp = document.createElement("input");
  inp.type = "search"; inp.placeholder = "Buscar pelo nome ou @usuário"; inp.setAttribute("aria-label", "Buscar pessoa");
  busca.appendChild(inp);
  const res = document.createElement("div");
  box.append(busca, res);
  let tempoBusca = null;
  const desenhar = async () => {
    const termo = inp.value.trim();
    const achados = await buscarPessoas(fb, termo, { limite: 15 });
    if (inp.value.trim() !== termo) return;
    res.replaceChildren();
    achados.filter((p) => p.uid !== eu.uid && !escondido(p.uid))
      .sort((a, b) => Number(meusSeguindo.has(b.uid)) - Number(meusSeguindo.has(a.uid)))
      .slice(0, 8)
      .forEach((p) => res.appendChild(linhaPessoa({ uid: p.uid, nome: p.nome, foto: p.fotoPerfil, sub: p.nickname ? "@" + p.nickname : "", semSeguir: true, aoClicar: () => { vinAlvo = p; pintarAlvoVinculo(); } })));
  };
  inp.addEventListener("input", () => { clearTimeout(tempoBusca); tempoBusca = setTimeout(desenhar, 300); });
  desenhar();
}
$("vinEnviar").addEventListener("click", async () => {
  if (!vinAlvo) { toast("Escolha a pessoa."); return; }
  const ids = [eu.uid, vinAlvo.uid].sort();
  const id = `${ids[0]}_${ids[1]}`;
  if (meusVinculos.some((v) => v.id === id)) { toast("Vocês já têm um vínculo ou pedido. Desfaça o atual para mudar."); return; }
  const conflito = conflitoExclusivo(vinTipo);
  if (conflito) { toast(`Você já tem ${rotuloTipo(conflito.tipo).toLowerCase()} no seu social.`); return; }
  const btn = $("vinEnviar");
  btn.disabled = true;
  try {
    await fb.setDoc(fb.doc(fb.db, "vinculos", id), {
      participantes: ids, de: eu.uid, para: vinAlvo.uid, tipoDe: vinTipo, tipoPara: INVERSO[vinTipo],
      status: "pendente", criadoEm: fb.serverTimestamp()
    });
    fecharFolha("folhaVinculo");
    toast(`Pedido enviado para ${vinAlvo.nome || "a pessoa"}`);
  } catch (e) { toast("Não foi possível enviar: " + erroAmigavel(e)); }
  finally { btn.disabled = false; }
});

function ouvirVinculos() {
  const q = fb.query(fb.collection(fb.db, "vinculos"), fb.where("participantes", "array-contains", eu.uid), fb.limit(60));
  fb.onSnapshot(q, (snap) => {
    meusVinculos = snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }));
    renderizarMeuPerfil();
  }, (e) => console.warn("Social indisponível:", e));
}

// Com cartão: a conversa fica marcada com o assunto (serviços, delivery...) e o cartão vai junto na mensagem.
function iniciarConversa(uid, cartao) {
  return prepararConversa(fb, eu, uid, cartao || null);
}

// ======================================================
// Inicialização
// ======================================================
function mostrarErro(texto) {
  $("estadoCarregando").hidden = true;
  $("estadoErro").hidden = false;
  $("estadoErro").textContent = texto;
}

async function iniciar() {
  try { await iniciarRede({ sincronizar: true }); }
  catch (e) { mostrarErro(e.message || "Não foi possível carregar seu perfil agora."); return; }
  ganchos.abrirPerfil = (uid) => abrirPerfilPublico(uid);
  ganchos.aposSeguir = () => atualizarContagens();
  ganchos.aoPublicar = () => carregarMeusPosts();
  montarBarraRede("perfil");
  pintarBarraRede();
  $("estadoCarregando").hidden = true;
  $("conteudo").hidden = false;
  renderizarMeuPerfil();
  carregarMeusSeguindo();
  ouvirVinculos();
  ouvirAvisos();
  carregarMeusNegocios();
  atualizarContagens();
  carregarMeusPosts();
  // Puxar para atualizar (como no Instagram): números, negócios (com o anel do flash) e publicações de novo do servidor.
  ligarPuxar({ aoAtualizar: () => { esquecerFlashesNegocio(); repubCache.clear(); esquecerLinks(eu.uid); return Promise.all([carregarMeusNegocios(), atualizarContagens(), carregarMeusPosts()]); } });

  const params = new URLSearchParams(location.search);
  // Links antigos de negócio agora vão para a página Meus negócios.
  if (params.get("acao") === "negocio") { location.replace("negocios.html" + (params.get("tipo") ? `?tipo=${encodeURIComponent(params.get("tipo"))}` : "")); return; }
  if (params.get("acao") === "social") { history.replaceState(history.state, "", "usuarios.html"); abrirNovoVinculo(null); }
  if (params.get("acao") === "editar") { history.replaceState(history.state, "", "usuarios.html"); abrirEditar(); }
  const avaliarPedido = params.get("avaliar");
  if (avaliarPedido) { history.replaceState(history.state, "", "usuarios.html"); avaliarPorLink(avaliarPedido); }
  // Link antigo de publicação (usuarios.html?post=ID): abre a própria publicação no Diário, como no Instagram
  // (antes abria o seu perfil com uma folha por cima, e o "voltar" ficava no perfil).
  const postPedido = params.get("post");
  if (postPedido && /^[A-Za-z0-9_-]{1,64}$/.test(postPedido)) { location.replace(`feed.html?post=${encodeURIComponent(postPedido)}`); return; }
  const perfilPedido = params.get("perfil");
  if (perfilPedido) {
    history.replaceState(history.state, "", "usuarios.html");
    // Veio de outra página do site (ex.: tocou no @ de alguém num flash): o perfil abre sem passo próprio no
    // histórico, então UM "voltar" volta direto para lá (antes o 1º só fechava o perfil e mostrava o seu).
    let doSite = false;
    try { const r = new URL(document.referrer); doSite = r.origin === location.origin && !/usuarios\.html$/.test(r.pathname); } catch {}
    const fp = document.getElementById("folhaPerfil");
    if (doSite && fp) { fp.dataset.semVoltar = "1"; const tirar = () => { fp.removeEventListener("fechada", tirar); delete fp.dataset.semVoltar; }; fp.addEventListener("fechada", tirar); }
    abrirPerfilPublico(perfilPedido);
  }
}

iniciar().catch((e) => { console.error(e); mostrarErro("Não foi possível carregar a página. Tente novamente."); });
