// Código da página (saiu de dentro do HTML para ficar guardado no aparelho pelo service worker: a página abre mais rápido).
import "./sem-menu-imagem.js?v=5";
import "./fotos-suaves.js?v=1";
import { FUNCOES_LIGADAS, respostaDoPerfil } from "./servidor.js?v=3";
import { docRapido, docsRapido } from "./rapido.js?v=1";
import { ligarDeslizarFlash, camadaAberta } from "./deslizar-flash.js?v=10";
import { ligarPuxar } from "./puxar-atualizar.js?v=4";
import { ligarQuadro, casca } from "./quadro-rede.js?v=2";
import { textoDoFlash, guardarParaAbrir } from "./flash-direto.js?v=1";
ligarQuadro(); // dentro da rede (rede.html): os itens da barra trocam de aba sem recarregar
ligarDeslizarFlash(); // deslizar para o lado na lista de conversas troca de aba da barra de baixo
import { conferirEmail, emailPendente, MSG_EMAIL, midiaSegura, mostrarAvisoEmail } from "./seguranca.js?v=1";
import { confirmarHF } from "./confirmar.js?v=6";
import { relogioDe, ufDe } from "./fuso.js?v=1";
import { textoChamada, descreverChamada, duracaoTexto } from "./chamadas.js?v=7";
import { avaliarNegocio, avaliarCliente, estrelas, whatsAvaliacao, TIPOS_NEGOCIO, lerResumos, media, notaTexto } from "./avaliacoes.js?v=19";
import { buscarPessoas } from "./pessoas.js?v=6";
import { docComValidade, docsComValidade, docsPorIds } from "./leituras.js?v=4";
import { codigoPix, tipoChavePix } from "./pix.js?v=1";
import { semPausados, lerPlano, nivelPlano } from "./planos-base.js?v=16";
import { comRitmo } from "./ritmo.js?v=3";
import { criarPlayerAudio } from "./audio-ondas.js?v=5";
import { lerConversa, guardarConversa, juntar, maisRecente, FOLGA_MS, CHEIO_MS } from "./cache-msgs.js?v=1";
import { EMOJI_CATS, buscarEmojis, listaDa, emojisRecentes, usarEmoji, soEmojis } from "./emojis.js?v=1";
import { NOME_FIG, ehFigurinha, minhasFigurinhas, guardarFigurinha, atualizarFigurinha, apagarFigurinha, usarFigurinha, jaGuardada, pacoteHelp, paraDataUrl, prepararArquivo, criarFigurinha } from "./figurinhas.js?v=2";
import { editarImagem, dataUrlParaBlob } from "./editor-imagem.js?v=7";
import { abrirQueixa } from "./queixas.js?v=19";
import { ouvirItensEquipe, linkEquipe, seloOficial, TEXTO_EQUIPE } from "./avisos-equipe.js?v=1";
import { escolherApagar, editarTextoHF, verEdicoesHF, janelaHF, horaCurta, noPrazo, tempoRestante, podeMexer } from "./msg-acoes.js?v=2";
// ======================================================
// Configurações (salvas no aparelho)
// ======================================================
const CHAVE_CONFIG = "hf-chat-config";
// Papel de parede padrão: Pontilhado (09/11/2026, pedido do dono: a Ponte saiu do padrão e virou só uma opção).
const CONFIG_PADRAO = { tema: "sistema", fundo: "padrao", fonte: "media", veu: 0.55, enterEnvia: true, sons: true, vibrar: true, previaNotificacao: true, mostrarOnline: true, mostrarDigitando: true, confirmacaoLeitura: true };
const CHAVE_FUNDO_FOTO = "hf-chat-fundo-foto";
let config = { ...CONFIG_PADRAO };
try { config = { ...CONFIG_PADRAO, ...JSON.parse(localStorage.getItem(CHAVE_CONFIG) || "{}") }; } catch {}
// Quem estava com a Ponte só porque era o padrão antigo (nunca escolheu um fundo) passa para o padrão novo; quem escolheu
// a Ponte de propósito (fundoEscolhido) continua com ela.
// A Ponte saiu da lista (09/11/2026: o dono não tem autorização da imagem): quem estava com ela vai para o Pontilhado.
if (config.fundo === "ponte") config.fundo = CONFIG_PADRAO.fundo;

const temaEscuroSistema = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
function aplicarConfig() {
  const escuro = config.tema === "escuro" || (config.tema === "sistema" && !!temaEscuroSistema?.matches);
  const raiz = document.documentElement;
  raiz.dataset.theme = escuro ? "dark" : "light";
  raiz.dataset.fundo = config.fundo;
  raiz.dataset.fonte = config.fonte;
  raiz.style.setProperty("--veu", String(config.veu));
  let fotoFundo = null;
  try { fotoFundo = localStorage.getItem(CHAVE_FUNDO_FOTO); } catch {}
  if (fotoFundo) raiz.style.setProperty("--papel", `url("${fotoFundo}")`);
  const opFoto = document.getElementById("opFundoFoto");
  if (opFoto) opFoto.style.backgroundImage = fotoFundo ? `url("${fotoFundo}")` : "";
  const acoesFoto = document.getElementById("acoesFundoFoto");
  if (acoesFoto) acoesFoto.hidden = !(config.fundo === "foto" && fotoFundo);
  const veu = document.getElementById("cfgVeu");
  if (veu) veu.hidden = config.fundo !== "foto";
  const faixa = document.getElementById("veuFundo");
  if (faixa) faixa.value = String(config.veu);
  document.querySelector('meta[name="theme-color"]').content = escuro ? "#10181d" : "#ffffff";
  document.querySelectorAll("[data-cfg]").forEach((grupo) => {
    grupo.querySelectorAll("[data-valor]").forEach((b) => {
      const on = b.dataset.valor === config[grupo.dataset.cfg];
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  });
  document.querySelectorAll("[data-cfg-bool]").forEach((inp) => { inp.checked = !!config[inp.dataset.cfgBool]; });
}
function salvarConfig() {
  try { localStorage.setItem(CHAVE_CONFIG, JSON.stringify(config)); } catch {}
  aplicarConfig();
}
temaEscuroSistema?.addEventListener?.("change", aplicarConfig);
aplicarConfig();
// Tema trocado em outra página/aba (Configurações, menu, outra aba da rede): o Mensagens acompanha na hora. Antes ele só lia
// o tema ao abrir e, na rede (que deixa o Mensagens aberto), continuava escuro com o site claro (10/11/2026).
window.addEventListener("storage", (e) => {
  if (e.key !== CHAVE_CONFIG) return;
  try { config = { ...config, ...JSON.parse(e.newValue || "{}") }; } catch { return; }
  if (config.fundo === "ponte") config.fundo = CONFIG_PADRAO.fundo;
  aplicarConfig();
});

// ======================================================
// Utilitários
// ======================================================
const $ = (id) => document.getElementById(id);
// Nome e sobrenome (primeira e última palavra, sem "da/de/dos"): "Bianca suelane da Silva Dantas" → "Bianca Dantas".
// Usado na lista, nas Chamadas e no topo da conversa; o nome completo continua no perfil e na prévia.
const PARTICULAS = /^(d[aeo]s?|e|del|van|von|di)$/i;
function nomeCurto(nome) {
  const p = String(nome || "").trim().split(/\s+/).filter(Boolean);
  if (p.length <= 2) return p.join(" ") || "Usuário";
  const cap = (w) => (w === w.toLowerCase() ? w.charAt(0).toUpperCase() + w.slice(1) : w);
  let ult = p[p.length - 1];
  if (PARTICULAS.test(ult)) ult = p[p.length - 2];
  return `${p[0]} ${cap(ult)}`;
}
// Na gaveta de mensagens de outra página, ir para outra página troca a página inteira (não só a gaveta).
const embutido = document.documentElement.classList.contains("embutido");
function irPara(url) { (embutido ? window.top : window).location.href = url; }
if (embutido) document.addEventListener("click", (e) => {
  const a = e.target.closest?.("a[href]");
  if (a && !/^mensagens\.html/.test(a.getAttribute("href")) && !a.hasAttribute("download")) a.target = "_top";
}, true);
const ms = (ts) => ts?.toMillis?.() ?? 0;
const paraData = (ts) => ts?.toDate?.() ?? null;
const MINUTO = 60 * 1000;

function icone(nome, classe = "i s") {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", classe);
  const use = document.createElementNS(ns, "use");
  use.setAttribute("href", "#i-" + nome);
  svg.appendChild(use);
  return svg;
}

function iniciais(nome) {
  const partes = String(nome || "?").trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] || "?") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

// Fotos, áudios e vídeos só do próprio site (seguranca.js).
const urlSegura = (url) => midiaSegura(url);

function pintarAvatar(el, foto, nome) {
  el.replaceChildren();
  const url = urlSegura(foto);
  if (url) {
    const img = document.createElement("img");
    img.src = url;
    img.alt = "";
    img.loading = "lazy";
    img.onerror = () => { el.replaceChildren(document.createTextNode(iniciais(nome))); };
    el.appendChild(img);
  } else {
    el.textContent = iniciais(nome);
  }
}

function mesmoDia(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
const hora = (d) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

function rotuloDia(d) {
  const hoje = new Date();
  const ontem = new Date(); ontem.setDate(hoje.getDate() - 1);
  if (mesmoDia(d, hoje)) return "Hoje";
  if (mesmoDia(d, ontem)) return "Ontem";
  if (hoje - d < 6 * 24 * 60 * MINUTO) {
    const s = d.toLocaleDateString("pt-BR", { weekday: "long" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function dataLista(d) {
  if (!d) return "";
  const hoje = new Date();
  const ontem = new Date(); ontem.setDate(hoje.getDate() - 1);
  if (mesmoDia(d, hoje)) return hora(d);
  if (mesmoDia(d, ontem)) return "Ontem";
  if (hoje - d < 6 * 24 * 60 * MINUTO) return d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

// "Visto": de 1 min a 1 h mostra quanto tempo faz ("há 5 min"); depois disso a hora ("18:16"), "ontem 18:16",
// o dia da semana ("seg. 18:16") ou a data. O olho na frente (statusTopo) diz que é a última vez que a pessoa esteve aqui.
function vistoPorUltimo(d) {
  if (!d) return "";
  const agora = new Date(), dif = agora - d;
  if (dif < MINUTO) return "agora";
  if (dif < 60 * MINUTO) return `há ${Math.floor(dif / MINUTO)} min`;
  const ontem = new Date(); ontem.setDate(agora.getDate() - 1);
  if (mesmoDia(d, agora)) return hora(d);
  if (mesmoDia(d, ontem)) return `ontem ${hora(d)}`;
  if (dif < 6 * 24 * 60 * MINUTO) return `${d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}. ${hora(d)}`;
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: agora.getFullYear() === d.getFullYear() ? undefined : "2-digit" })}`;
}
// Texto do topo da conversa (online, digitando, visto). Com um símbolo na frente: bolinha verde (online), três
// pontinhos (digitando) ou o olho (visto). Quando não cabe, desliza devagar; com "reduzir movimento", fica parado.
function statusTopo(el, texto, cls = "", simbolo = "") {
  el.className = cls;
  if (!texto) { el.replaceChildren(); el.dataset.texto = ""; el.removeAttribute("title"); return; }
  const chave = simbolo + "|" + texto;
  if (el.dataset.texto === chave && el.firstChild) return;
  el.dataset.texto = chave;
  const sp = document.createElement("span"); sp.className = "st-rola"; sp.textContent = texto;
  const nos = [];
  if (simbolo === "online") nos.push(Object.assign(document.createElement("i"), { className: "st-ponto" }));
  else if (simbolo === "visto") nos.push(icone("olho-visto", "i st-ic"));
  el.replaceChildren(...nos, sp);
  el.title = simbolo === "visto" ? `Visto por último: ${texto}` : texto;
  if (simbolo === "visto") sp.setAttribute("aria-label", `Visto por último ${texto}`); else sp.removeAttribute("aria-label");
  requestAnimationFrame(() => {
    if (!sp.isConnected) return;
    const falta = sp.scrollWidth - el.clientWidth + (nos.length ? 18 : 0);
    el.classList.toggle("rolando", falta > 4);
    if (falta > 4) { sp.style.setProperty("--falta", `-${falta + 6}px`); sp.style.setProperty("--dur", `${Math.max(5, falta / 18 + 4)}s`); }
  });
}

// Assunto da conversa: pessoal ou ligado a um perfil de negócio (mesmas cores dos perfis).
const ASSUNTOS = {
  pessoal: { nome: "Pessoais", cor: "#8b9ba6" },
  servicos: { nome: "Freelances", cor: "#00adee" },
  delivery: { nome: "Delivery", cor: "#ff7a1a" },
  lojinha: { nome: "Lojinha", cor: "#b066ff" },
  imoveis: { nome: "Imóveis", cor: "#2fbf71" },
  saude: { nome: "Saúde", cor: "#0fb5a6" },
  automotivo: { nome: "Automotivo", cor: "#f5b301" },
  comunidade: { nome: "Comunidade", cor: "#e5487f" },
  publicacao: { nome: "Publicação", cor: "#f5b301" }
};
// Ícone do selinho no canto da foto, por tipo de negócio
const ICONE_ASSUNTO = { servicos: "maleta", delivery: "pedido", lojinha: "loja", imoveis: "casa", saude: "saude", automotivo: "automotivo", comunidade: "comunidade", publicacao: "feed" };
const reais = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
// Lista do pedido (itens, unidades e total) dentro do cartão.
function blocoPedido(p) {
  const box = document.createElement("div");
  box.className = "cm-pedido";
  const linha = (a, b, cls) => {
    const d = document.createElement("div");
    if (cls) d.className = cls;
    const x = document.createElement("span"); x.textContent = a;
    const y = document.createElement("span"); y.textContent = b;
    d.append(x, y);
    box.appendChild(d);
  };
  p.itens.slice(0, 30).forEach((i) => {
    const qtd = Math.max(0, Math.min(999, parseInt(i?.qtd, 10) || 0));
    const preco = Number(i?.preco) > 0 ? Number(i.preco) : 0;
    linha(`${qtd}× ${String(i?.nome || "Item").slice(0, 60)}`, preco ? reais(qtd * preco) : "a combinar", "it");
  });
  if (Number(p.taxa) > 0) linha("Entrega", reais(p.taxa), "sub");
  linha("Total", reais(p.total), "tot");
  if (p.cupom && typeof p.cupom === "object") linha(p.cupom.codigo ? "Cupom" : "Promoção", [p.cupom.codigo, p.cupom.titulo].filter(Boolean).map((x) => String(x).slice(0, 60)).join(" · "), "cupom");
  const PAG = { pix: "Pix", credito: "Cartão de crédito", debito: "Cartão de débito", dinheiro: "Dinheiro", vale: "Vale-refeição" };
  if (p.modo) linha(p.modo === "retirada" ? "Recebimento" : "Entrega em", p.modo === "retirada" ? "Retirada no local" : String(p.endereco || "a combinar").slice(0, 200), "info");
  if (p.pagamento) linha("Pagamento", (PAG[p.pagamento] || String(p.pagamento).slice(0, 20)) + (Number(p.troco) > 0 ? ` · troco p/ ${reais(p.troco)}` : ""), "info");
  if (p.obs) {
    const o = document.createElement("p");
    o.className = "obs";
    o.textContent = "Obs.: " + String(p.obs).slice(0, 300);
    box.appendChild(o);
  }
  return box;
}
// Pedido de orçamento de serviço: tudo o que o cliente escolheu.
const PERIODOS_MSG = { manha: "Manhã", tarde: "Tarde", noite: "Noite" };
function textoQuandoMsg(q) {
  if (!q?.tipo) return "";
  if (q.tipo === "urgente") return "Urgente (hoje)";
  if (q.tipo === "flexivel") return "Flexível";
  let dia = "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(q.data || "")) { const [a, mm, d] = q.data.split("-").map(Number); dia = new Date(a, mm - 1, d).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }); }
  return ["Agendado", dia, PERIODOS_MSG[q.periodo] || ""].filter(Boolean).join(" · ");
}
function blocoSolicitacao(so) {
  const box = document.createElement("div");
  box.className = "cm-pedido cm-orc";
  const linha = (a, b, cls) => {
    if (!b) return;
    const d = document.createElement("div");
    d.className = "info" + (cls ? " " + cls : "");
    const x = document.createElement("span"); x.textContent = a;
    const y = document.createElement("span"); y.textContent = b;
    d.append(x, y);
    box.appendChild(d);
  };
  const sd = so.saude && typeof so.saude === "object" ? so.saude : null;
  linha(sd ? "Atendimento" : "Serviço", (Array.isArray(so.servicos) ? so.servicos : []).slice(0, 12).map((x) => String(x).slice(0, 60)).join(", "));
  if (sd) { linha("Para", String(sd.quem || "").slice(0, 80)); linha("Como", String(sd.atendimento || "").slice(0, 40)); linha("Pagamento", String(sd.convenio || "").slice(0, 40)); }
  linha("Quando", sd?.primeiro ? "Primeiro horário livre" : textoQuandoMsg(so.quando), so.quando?.tipo === "urgente" ? "urgente" : "");
  if (!sd || so.local) linha("Local", String(so.local || "").slice(0, 80) || (so.modo === "online" ? "Online" : so.modo === "local" ? "No local do profissional" : ""));
  if (so.cupom && typeof so.cupom === "object") linha(so.cupom.codigo ? "Cupom" : "Promoção", [so.cupom.codigo, so.cupom.titulo].filter(Boolean).map((x) => String(x).slice(0, 60)).join(" · "), "cupom");
  if (so.descricao) {
    const o = document.createElement("p");
    o.className = "obs";
    o.textContent = String(so.descricao).slice(0, 600);
    box.appendChild(o);
  }
  return box;
}
// Player de áudio próprio: play/pausa, barra de progresso e tempo (sem o player branco do navegador).
// Só um áudio toca por vez. O arquivo só é carregado quando a pessoa aperta play.
// Áudio: player com ondas de voz e velocidade (audio-ondas.js). A onda sai do próprio áudio,
// calculada quando a mensagem aparece na tela, e fica guardada no aparelho.
function criarAudioMsg(m, url) {
  // Modelo do WhatsApp: foto de quem gravou com o microfone (a sua à direita, a da outra pessoa à esquerda).
  const minha = m.remetenteId === eu?.uid;
  const foto = document.createElement("div");
  if (minha) pintarAvatar(foto, meuPerfil.fotoPerfil, meuPerfil.nome || eu?.displayName || "");
  else pintarAvatar(foto, ativa?.foto, ativa?.nome || "");
  return criarPlayerAudio({ chave: "m:" + m.id, fonte: url, carregarJa: true, foto, lado: minha ? "dir" : "esq", aoErro: () => toast("Não foi possível tocar o áudio.") });
}

// ---------- status do pedido (delivery e lojinha) ----------
// Ícone SVG (mesmo traço do resto da página) em vez de emoji, para ficar igual em todo aparelho.
function iconeSvg(id, cls = "i") {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("class", cls); s.setAttribute("aria-hidden", "true");
  const u = document.createElementNS("http://www.w3.org/2000/svg", "use");
  u.setAttribute("href", "#i-" + id); s.appendChild(u);
  return s;
}
const ETAPAS = {
  delivery: [["recebido", "Pedido recebido", "st-recebido"], ["preparando", "Preparando", "st-preparando"], ["saiu", "Saiu para entrega", "st-saiu"], ["entregue", "Entregue", "st-entregue"]],
  lojinha: [["recebido", "Pedido recebido", "st-recebido"], ["separando", "Separando os produtos", "st-separando"], ["enviado", "Enviado ou pronto para retirar", "st-enviado"], ["entregue", "Entregue", "st-entregue"]]
};
const CANCELADO = ["cancelado", "Cancelado", "st-cancelado"];
const etapasDe = (tipo) => ETAPAS[tipo] || ETAPAS.delivery;
function infoStatus(tipo, k) { return k === "cancelado" ? CANCELADO : etapasDe(tipo).find((e) => e[0] === k) || null; }
const corStatus = (k) => (k === "cancelado" ? "#e5484d" : k === "entregue" ? "#2fbf71" : "#00adee");
function statusAtual(refId) {
  for (let i = mensagens.length - 1; i >= 0; i--) {
    const x = mensagens[i];
    if (x.tipoArquivo === "cartao" && x.cartao?.refMsg === refId && x.cartao?.status) return x.cartao.status;
  }
  return "";
}
function statusPedido(m, tipo) {
  const box = document.createElement("div");
  box.dataset.statusDe = m.id;
  pintarStatusPedido(box, m, tipo);
  return box;
}
// Andamento do pedido: situação em destaque, etapas com nome e, para o negócio, o botão da próxima etapa.
const ETAPA_CURTA = { recebido: "Recebido", preparando: "Preparando", saiu: "A caminho", separando: "Separando", enviado: "Enviado", entregue: "Entregue" };
function pintarStatusPedido(box, m, tipo) {
  const k = statusAtual(m.id);
  const etapas = etapasDe(tipo);
  const idx = etapas.findIndex((e) => e[0] === k);
  const souNegocio = m.remetenteId !== eu.uid;
  box.replaceChildren();
  box.className = "pd-status";
  box.style.setProperty("--cor-st", k ? corStatus(k) : "#f5a524");
  const st = infoStatus(tipo, k);
  const topo = document.createElement("div"); topo.className = "pd-st-topo";
  const ic = document.createElement("span"); ic.className = "pd-st-ic"; ic.appendChild(iconeSvg(st ? st[2] : "relogio"));
  const tx = document.createElement("div");
  const b = document.createElement("b"); b.textContent = st ? st[1] : souNegocio ? "Novo pedido" : "Aguardando confirmação";
  const sm = document.createElement("small");
  sm.textContent = k === "cancelado" ? "Este pedido foi cancelado."
    : k === "entregue" ? "Pedido concluído. Obrigado!"
    : !k ? (souNegocio ? "Confirme para o cliente saber que você recebeu." : "O negócio ainda vai confirmar o seu pedido.")
    : m.cartao?.pedido?.prazo && tipo === "delivery" && k !== "entregue" ? `Previsão: ${String(m.cartao.pedido.prazo).slice(0, 20)}` : "O andamento aparece aqui.";
  tx.append(b, sm);
  topo.append(ic, tx);
  box.appendChild(topo);
  if (k !== "cancelado") {
    const passos = document.createElement("ol"); passos.className = "pd-passos";
    etapas.forEach(([chave], i) => {
      const li = document.createElement("li");
      if (i < idx) li.className = "feito"; else if (i === idx) li.className = "atual";
      const bola = document.createElement("i"); if (i <= idx) bola.appendChild(iconeSvg("check"));
      const nome = document.createElement("span"); nome.textContent = ETAPA_CURTA[chave] || chave;
      li.append(bola, nome);
      passos.appendChild(li);
    });
    box.appendChild(passos);
  }
  const acoes = document.createElement("div"); acoes.className = "pd-acoes";
  if (souNegocio && k !== "entregue" && k !== "cancelado") {
    const prox = etapas[idx + 1];
    const pri = document.createElement("button"); pri.type = "button"; pri.className = "pri";
    pri.textContent = !k ? "Confirmar pedido" : `Marcar: ${ETAPA_CURTA[prox[0]] || prox[1]}`;
    pri.addEventListener("click", (e) => { e.stopPropagation(); mudarStatusPedido(m, tipo, prox[0]); });
    const mais = document.createElement("button"); mais.type = "button"; mais.className = "ic"; mais.setAttribute("aria-label", "Outras opções do pedido");
    mais.appendChild(iconeSvg("mais"));
    mais.addEventListener("click", (e) => { e.stopPropagation(); escolherStatus(m, tipo, e.clientX, e.clientY); });
    acoes.append(pri, mais);
  } else if (!souNegocio && !k) {
    // O cliente pode desistir enquanto o negócio não confirmou.
    const c = document.createElement("button"); c.type = "button"; c.className = "sec"; c.textContent = "Cancelar pedido";
    c.addEventListener("click", (e) => { e.stopPropagation(); mudarStatusPedido(m, tipo, "cancelado"); });
    acoes.appendChild(c);
  }
  if (acoes.children.length) box.appendChild(acoes);
}
async function mudarStatusPedido(m, tipo, k) {
  if (!ativa) return;
  if (k === "cancelado" && !(await confirmarHF({ titulo: "Cancelar este pedido?", texto: m.remetenteId === eu.uid ? "O negócio vê na conversa que você desistiu." : "Ele fica marcado como cancelado e o cliente vê na conversa.", ok: "Cancelar pedido", cancelar: "Voltar", icone: "alerta" }))) return;
  try {
    await publicarMensagem(ativa.id, { remetenteId: eu.uid, texto: "", criadoEm: fb.serverTimestamp(), tipoArquivo: "cartao",
      cartao: { tipo, status: k, refMsg: m.id, titulo: String(m.cartao?.titulo || "").slice(0, 80) } });
    // Entregue pelo negócio: o pedido de avaliação vai junto (uma vez por pedido).
    if (k === "entregue" && m.remetenteId !== eu.uid) await avaliacaoAoConcluir(tipo, `Pedido #${String(m.id || "").slice(-6).toUpperCase()} · ${String(m.cartao?.titulo || "").replace(/^Pedido · /, "")}`.slice(0, 120), ms(m.criadoEm));
  } catch (erro) { console.error(erro); toast(erro?.code === "limite-diario" ? erro.message : "Não foi possível atualizar o pedido."); }
}
// Cartão do pedido (delivery e lojinha), como nos apps de pedido: número, negócio, andamento,
// itens, valores (com cupom), entrega, pagamento e observações.
const PAG_MSG = { pix: "Pix", credito: "Cartão de crédito", debito: "Cartão de débito", dinheiro: "Dinheiro", vale: "Vale-refeição" };
function cartaoPedido(m, c, tipo, href) {
  const p = c.pedido;
  const box = document.createElement("div"); box.className = "pd";
  const cab = document.createElement("div"); cab.className = "pd-cab";
  const logo = document.createElement("span"); logo.className = "pd-logo";
  const foto = urlSegura(c.foto);
  if (foto) logo.style.backgroundImage = `url("${foto}")`; else logo.appendChild(iconeSvg(tipo === "delivery" ? "st-preparando" : "st-separando"));
  const ct = document.createElement("div"); ct.className = "pd-cab-tx";
  const nomeNeg = String(c.titulo || "").replace(/^Pedido · /, "") || ASSUNTOS[tipo].nome;
  const sm = document.createElement("small"); sm.textContent = `${ASSUNTOS[tipo].nome} · Pedido #${String(m.id || "").slice(-6).toUpperCase()}`;
  const st = document.createElement("strong"); st.textContent = nomeNeg;
  ct.append(sm, st);
  cab.append(logo, ct);
  box.appendChild(cab);
  box.appendChild(statusPedido(m, tipo));

  // Itens: os 4 primeiros e "ver todos".
  const itens = p.itens.slice(0, 30);
  const lista = document.createElement("ul"); lista.className = "pd-itens";
  const unidades = itens.reduce((t, i) => t + (Math.max(0, parseInt(i?.qtd, 10) || 0)), 0);
  const pintarItens = (todos) => {
    lista.replaceChildren();
    (todos ? itens : itens.slice(0, 4)).forEach((i) => {
      const qtd = Math.max(0, Math.min(999, parseInt(i?.qtd, 10) || 0));
      const preco = Number(i?.preco) > 0 ? Number(i.preco) : 0;
      const li = document.createElement("li");
      const q = document.createElement("span"); q.className = "q"; q.textContent = `${qtd}×`;
      const n = document.createElement("span"); n.className = "n";
      n.append(document.createTextNode(String(i?.nome || "Item").slice(0, 60)));
      if (preco && qtd > 1) { const u = document.createElement("small"); u.textContent = `${reais(preco)} cada`; n.appendChild(u); }
      const v = document.createElement("span"); v.className = "v"; v.textContent = preco ? reais(qtd * preco) : "a combinar";
      li.append(q, n, v);
      lista.appendChild(li);
    });
    if (itens.length > 4) {
      const mais = document.createElement("button"); mais.type = "button"; mais.className = "pd-mais";
      mais.textContent = todos ? "Mostrar menos" : `Ver todos os ${itens.length} itens`;
      mais.addEventListener("click", (e) => { e.stopPropagation(); pintarItens(!todos); });
      lista.appendChild(mais);
    }
  };
  pintarItens(false);
  const titItens = document.createElement("div"); titItens.className = "pd-sec"; titItens.textContent = `${unidades} ${unidades === 1 ? "item" : "itens"}`;
  box.append(titItens, lista);

  // Valores
  const val = document.createElement("div"); val.className = "pd-valores";
  const linha = (a, b, cls) => { const d = document.createElement("div"); if (cls) d.className = cls; const x = document.createElement("span"); x.textContent = a; const y = document.createElement("span"); y.textContent = b; d.append(x, y); val.appendChild(d); };
  const subtotal = Number(p.subtotal) >= 0 && p.subtotal != null ? Number(p.subtotal) : itens.reduce((t, i) => t + (Number(i?.preco) || 0) * (parseInt(i?.qtd, 10) || 0), 0);
  linha("Subtotal", reais(subtotal));
  if (tipo === "delivery" || Number(p.taxa) > 0) linha(p.modo === "retirada" ? "Retirada" : "Entrega", p.modo === "retirada" ? "Sem taxa" : Number(p.taxa) > 0 ? reais(p.taxa) : "Grátis", Number(p.taxa) > 0 ? "" : "gratis");
  if (p.cupom && typeof p.cupom === "object") linha(p.cupom.codigo ? `Cupom ${String(p.cupom.codigo).slice(0, 20)}` : "Promoção", String(p.cupom.titulo || "a combinar").slice(0, 60), "cupom");
  linha("Total", reais(p.total) + (itens.some((i) => !(Number(i?.preco) > 0)) ? " + a combinar" : ""), "tot");
  box.appendChild(val);
  // Conferência: o cartão é montado no aparelho de quem pede. Total tem que ser itens + entrega e, para o negócio,
  // os preços e o cupom iguais aos de agora (alguém pode mandar um pedido com valores mexidos).
  const alerta = document.createElement("div"); alerta.className = "pd-alerta"; alerta.setAttribute("role", "status"); alerta.hidden = true;
  box.appendChild(alerta);
  const somaItens = Math.round(itens.reduce((t, i) => t + (Number(i?.preco) > 0 ? Number(i.preco) : 0) * Math.max(0, parseInt(i?.qtd, 10) || 0), 0) * 100) / 100;
  const totalCerto = Math.round((somaItens + (Number(p.taxa) > 0 ? Number(p.taxa) : 0)) * 100) / 100;
  // Conferido no servidor (Cloud Function conferirMensagem, com o Blaze): vale o resultado de lá, para os dois lados.
  const cf = m.conferencia && typeof m.conferencia === "object" ? m.conferencia : null;
  if (cf && cf.ok) {
    const ok = document.createElement("div"); ok.className = "pd-conferido"; ok.setAttribute("role", "status");
    ok.append(iconeSvg("check"), document.createTextNode("Valores conferidos com o cardápio pelo Help Floripa"));
    box.insertBefore(ok, alerta);
  } else if (cf) {
    alerta.textContent = `Atenção: ${(Array.isArray(cf.avisos) ? cf.avisos : []).map((x) => String(x).slice(0, 200)).slice(0, 5).join(" ") || "os valores deste pedido não conferem com o negócio."} Confira antes de confirmar.`;
    alerta.hidden = false;
  } else if (Math.abs(totalCerto - (Number(p.total) || 0)) > 0.009 || Math.abs(subtotal - somaItens) > 0.009) {
    alerta.textContent = `Atenção: os valores deste pedido não batem com os itens (itens + entrega = ${reais(totalCerto)}). Confira antes de confirmar.`;
    alerta.hidden = false;
  } else if (m.remetenteId !== eu.uid) {
    conferirCardapio(c, p, itens).then((avisos) => { if (avisos.length) { alerta.textContent = `Confira antes de confirmar. ${avisos.join(" ")}`; alerta.hidden = false; } }).catch(() => {});
  }

  // Entrega, pagamento e observação
  const info = document.createElement("div"); info.className = "pd-info";
  const item = (icone, rot, txt) => {
    if (!txt) return;
    const d = document.createElement("div");
    const i = document.createElement("span"); i.className = "pd-info-ic"; i.appendChild(iconeSvg(icone));
    const t = document.createElement("div"); const s1 = document.createElement("small"); s1.textContent = rot; const s2 = document.createElement("span"); s2.textContent = txt;
    t.append(s1, s2); d.append(i, t); info.appendChild(d);
  };
  if (p.modo) item(p.modo === "retirada" ? "st-recebido" : "local", p.modo === "retirada" ? "Recebimento" : "Entregar em", p.modo === "retirada" ? "Retirada no local" : String(p.endereco || "A combinar").slice(0, 200));
  if (p.pagamento) item("cartao", "Pagamento", (PAG_MSG[p.pagamento] || String(p.pagamento).slice(0, 20)) + (Number(p.troco) > 0 ? ` · troco para ${reais(p.troco)}` : "") + " · na entrega/retirada");
  if (p.obs) item("chat", "Observação", String(p.obs).slice(0, 300));
  if (info.children.length) box.appendChild(info);

  const ver = document.createElement("a"); ver.className = "pd-ver"; ver.href = href;
  ver.textContent = tipo === "delivery" ? (m.remetenteId === eu.uid ? "Pedir mais · ver cardápio" : "Ver cardápio") : (m.remetenteId === eu.uid ? "Ver mais produtos" : "Ver loja");
  box.appendChild(ver);
  return box;
}
// Preços do pedido × cardápio de agora (só para o dono do negócio; um documento lido por negócio, guardado).
const cardapios = new Map();
async function conferirCardapio(c, p, itens) {
  const id = (String(c.link || "").match(/[?&]negocio=([^&]+)/) || [])[1];
  if (!id) return [];
  const neg = decodeURIComponent(id);
  if (!cardapios.has(neg)) cardapios.set(neg, fb.getDoc(fb.doc(fb.db, "negocios", neg)).then((d) => (d.exists() ? d.data() : null)).catch(() => null));
  const n = await cardapios.get(neg);
  if (!n || n.donoId !== eu.uid) return [];
  const lista = (n.itens || []).filter((i) => i?.nome);
  const diferentes = [];
  itens.forEach((it) => {
    const nome = String(it?.nome || ""), preco = Number(it?.preco) || 0;
    const x = lista.find((i) => nome === String(i.nome).slice(0, 60) || nome.startsWith(String(i.nome).slice(0, 60) + " ("));
    if (x && Number(x.preco) > 0 && Math.abs(Number(x.preco) - preco) > 0.009) diferentes.push(`${nome.slice(0, 40)} (${reais(preco)}, no cardápio ${reais(Number(x.preco))})`);
  });
  const avisos = [];
  if (diferentes.length) avisos.push(`Preço diferente do seu cardápio de agora: ${diferentes.slice(0, 3).join(", ")}${diferentes.length > 3 ? "…" : ""}.`);
  const cod = p.cupom && typeof p.cupom === "object" ? String(p.cupom.codigo || "") : "";
  if (cod && String(n.promocao?.codigo || "") !== cod) avisos.push(`O cupom ${cod.slice(0, 20)} não é o da sua promoção atual.`);
  return avisos;
}
function atualizarStatusNaTela(refId) {
  const m = mensagens.find((x) => x.id === refId);
  if (!m) return;
  const tipo = ASSUNTOS[m.cartao?.tipo] ? m.cartao.tipo : "delivery";
  document.querySelectorAll(`[data-status-de="${CSS.escape(refId)}"]`).forEach((b) => pintarStatusPedido(b, m, tipo));
}
function escolherStatus(m, tipo, x, y) {
  const atual = statusAtual(m.id);
  const menu = $("menuMsg");
  menu.replaceChildren();
  const cab = document.createElement("div"); cab.className = "menu-titulo"; cab.textContent = "Andamento do pedido";
  menu.appendChild(cab);
  [...etapasDe(tipo), CANCELADO].forEach(([k, rot, ic]) => {
    if (k === atual) return;
    const b = document.createElement("button"); b.type = "button"; b.setAttribute("role", "menuitem");
    if (k === "cancelado") b.className = "perigo";
    b.append(iconeSvg(ic), document.createTextNode(rot));
    b.addEventListener("click", async (e) => {
      e.stopPropagation(); fecharMenu();
      if (k === "cancelado" && !(await confirmarHF({ titulo: "Cancelar este pedido?", texto: "Ele fica marcado como cancelado e o cliente vê na conversa.", ok: "Marcar cancelado", cancelar: "Voltar", icone: "alerta" }))) return;
      try {
        await publicarMensagem(ativa.id, { remetenteId: eu.uid, texto: "", criadoEm: fb.serverTimestamp(), tipoArquivo: "cartao",
          cartao: { tipo, status: k, refMsg: m.id, titulo: String(m.cartao?.titulo || "").slice(0, 80) } });
      } catch (erro) { console.error(erro); toast(erro?.code === "limite-diario" ? erro.message : "Não foi possível atualizar o pedido."); }
    });
    menu.appendChild(b);
  });
  menu.hidden = false;
  const r = menu.getBoundingClientRect();
  menu.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + "px";
  menu.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + "px";
}

// ---------- pedido de avaliação ----------
// O que já se sabe de cada pedido de avaliação (quem avaliou). Fica guardado nesta aba do
// navegador: reabrir a conversa ou chegar mensagem nova mostra na hora, sem "Carregando...".
const AVAL_VALIDADE = 5 * 60000;
const CHAVE_AVAL = "hf-aval-situacao";
const situacaoAval = new Map();
try { for (const [k, v] of Object.entries(JSON.parse(sessionStorage.getItem(CHAVE_AVAL) || "{}"))) situacaoAval.set(k, v); } catch {}
function guardarSituacaoAval(chave, dados) {
  // Só o necessário para desenhar o cartão (a nota e se existe), não a avaliação inteira.
  const enxuto = (a) => (a ? { nota: Number(a.nota) || 0 } : null);
  situacaoAval.set(chave, { em: Date.now(), dados: { nC: enxuto(dados.nC), nV: enxuto(dados.nV), pC: enxuto(dados.pC), pV: enxuto(dados.pV) } });
  try { sessionStorage.setItem(CHAVE_AVAL, JSON.stringify(Object.fromEntries([...situacaoAval].slice(-60)))); } catch {}
}
// Promessa com prazo: se o Firebase não responder, desiste em vez de esperar para sempre.
const comPrazo = (promessa, ms) => Promise.race([promessa, new Promise((_, rej) => setTimeout(() => rej(new Error("tempo esgotado")), ms))]);

function cartaoAvaliacao(m) {
  const a = m.avaliacao;
  const souVendedor = m.remetenteId === eu.uid;
  const pid = String(a.pedidoId);
  const tipo = TIPOS_NEGOCIO[a.tipo] ? a.tipo : "servicos";
  const negocioId = `${m.remetenteId}_${tipo}`;
  const box = document.createElement("div");
  box.className = "cm-tx aval";
  const tp = document.createElement("span"); tp.className = "cm-tipo"; tp.textContent = "Avaliação";
  const ti = document.createElement("strong");
  ti.textContent = souVendedor ? "Você pediu uma avaliação" : `Como foi com ${a.negocioNome || "o atendimento"}?`;
  const sub = document.createElement("small");
  sub.textContent = [a.negocioNome, a.titulo].filter(Boolean).join(" · ");
  const status = document.createElement("div"); status.className = "aval-status"; status.textContent = "Carregando...";
  const acoes = document.createElement("div"); acoes.className = "aval-acoes";
  box.append(tp, ti, sub, status, acoes);
  // Botão com retorno: mostra "Abrindo..." enquanto confere se pode avaliar e avisa se algo falhar.
  const botao = (texto, cls, fn) => {
    const b = document.createElement("button"); b.type = "button"; b.className = cls; b.textContent = texto;
    b.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (b.disabled) return;
      b.disabled = true; b.textContent = "Abrindo...";
      const demora = setTimeout(() => toast("Está demorando... confira sua internet e tente de novo."), 10000);
      try { await fn(); }
      catch (erro) { console.error(erro); toast("Não foi possível abrir agora. Tente de novo."); }
      finally { clearTimeout(demora); b.disabled = false; b.textContent = texto; }
    });
    return b;
  };
  const autor = () => ({ nome: meuPerfil.nome || eu.displayName || "", foto: meuPerfil.fotoPerfil || "" });
  // Uma nota por cliente em cada negócio (n_ / c_). O pedido só marca "Atendimento confirmado".
  const clienteId = souVendedor ? ativa?.outroId : eu.uid;
  const ler = (id) => fb.getDoc(fb.doc(fb.db, "avaliacoes", id)).then((s) => (s.exists() ? s.data() : null));
  const chaveSit = `${pid}|${negocioId}|${clienteId}`;
  // forcar: depois de avaliar. Sem forcar: usa o que já foi lido (abrir a conversa ou chegar
  // mensagem não busca de novo) e, passados alguns minutos, confere em segundo plano.
  const pintar = async (forcar = false) => {
    const guardada = situacaoAval.get(chaveSit);
    let sit = !forcar && guardada ? guardada.dados : null;
    const conferirDepois = !forcar && guardada && Date.now() - guardada.em > AVAL_VALIDADE;
    if (!sit || conferirDepois) {
      const busca = Promise.all([ler(`n_${negocioId}_${clienteId}`), ler(`c_${negocioId}_${clienteId}`), ler(`p_${pid}_c`), ler(`p_${pid}_v`)])
        .then(([nC, nV, pC, pV]) => ({ nC, nV, pC, pV }));
      if (sit) {
        // Já tem o que mostrar: atualiza calado se algo mudou.
        busca.then((nova) => { guardarSituacaoAval(chaveSit, nova); if (JSON.stringify(nova) !== JSON.stringify(sit) && box.isConnected) pintar(); }).catch(() => {});
      } else {
        sit = await comPrazo(busca, 12000).catch((e) => { console.warn("Avaliação não carregou:", e?.code || e?.message || e); return null; });
        if (!sit) {
          // Nunca fica em "Carregando..." para sempre: mostra o motivo e deixa tentar de novo.
          status.replaceChildren(document.createTextNode("Não foi possível carregar a avaliação agora."));
          acoes.replaceChildren(botao("Tentar de novo", "sec", () => pintar(true)));
          // Tenta sozinho mais algumas vezes (ex.: a internet voltou).
          if ((box._tentativas = (box._tentativas || 0) + 1) <= 4) setTimeout(() => { if (box.isConnected && !situacaoAval.has(chaveSit)) pintar(true); }, 15000);
          return;
        }
        guardarSituacaoAval(chaveSit, sit);
      }
    }
    const { nC, nV, pC, pV } = sit;
    acoes.replaceChildren();
    const doCliente = nC || pC, doVendedor = nV || pV;
    status.replaceChildren();
    if (souVendedor) {
      // A nota não aparece aqui: ela entra no perfil do negócio (o cliente avalia com liberdade).
      status.textContent = doCliente ? "O cliente respondeu ✓ A nota entra no seu perfil." : "Aguardando a resposta do cliente";
      const avaliarCli = () => avaliarCliente(fb, eu, negocioId, clienteId, { nomeCliente: ativa?.nome || "cliente", pedidoId: pid, autor: autor(), aoAvaliar: () => { toast("Avaliação do cliente salva"); pintar(true); } });
      if (!doVendedor) acoes.appendChild(botao("Avaliar cliente", "sec", avaliarCli));
      else {
        const d = document.createElement("span"); d.className = "aval-feito"; d.append("Você avaliou o cliente ", estrelas({ total: 1, soma: doVendedor.nota }, { soEstrelas: true }));
        acoes.appendChild(d);
        if (nV || !pV) acoes.appendChild(botao("Editar", "sec", avaliarCli));
      }
      const w = document.createElement("a");
      w.className = "sec"; w.textContent = "Enviar pelo WhatsApp"; w.target = "_blank"; w.rel = "noopener noreferrer";
      w.href = whatsAvaliacao(pid, a.negocioNome);
      w.addEventListener("click", (e) => e.stopPropagation());
      if (!doCliente) acoes.appendChild(w);
    } else {
      const abrir = () => avaliarNegocio(fb, eu, { id: negocioId, donoId: m.remetenteId, tipo, nome: a.negocioNome }, {
        pedidoId: pid, autor: autor(),
        // A nota não vira mensagem no chat: vai direto para o perfil do negócio.
        aoAvaliar: (nota, editou) => {
          toast(editou ? "Avaliação atualizada" : nota <= 2 ? "Avaliação enviada. Se quiser, você pode abrir uma reclamação." : "Obrigado pela avaliação!");
          pintar(true);
        }
      });
      if (doCliente) {
        status.append("Você avaliou: ", estrelas({ total: 1, soma: doCliente.nota }, { soEstrelas: true }));
        if (nC) acoes.appendChild(botao("Editar minha nota", "sec", abrir));
        // Nota ruim: a reclamação é opcional (só se o cliente quiser).
        if (Number(doCliente.nota) <= 2) {
          const dica = document.createElement("div"); dica.className = "aval-dica";
          dica.textContent = "Teve um problema? Se quiser, abra uma reclamação: o negócio é avisado e tem 7 dias para responder.";
          status.appendChild(dica);
          acoes.appendChild(botao("Abrir reclamação (opcional)", "sec", () => abrirQueixa(fb, eu, { id: negocioId, donoId: m.remetenteId, tipo, nome: a.negocioNome }, {
            autor: autor(), aoAbrir: () => toast("Reclamação enviada. Acompanhe em Reclamações.")
          })));
        }
      } else {
        status.textContent = "Leva 10 segundos e ajuda outros clientes. Cada cliente avalia uma vez cada negócio.";
        acoes.appendChild(botao("★ Avaliar agora", "pri", abrir));
      }
    }
  };
  pintar();
  return box;
}
let meusNegociosChat = null;
async function negociosDoUsuario() {
  if (meusNegociosChat) return meusNegociosChat;
  try {
    const snap = await fb.getDocs(fb.query(fb.collection(fb.db, "negocios"), fb.where("donoId", "==", eu.uid)));
    meusNegociosChat = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch { meusNegociosChat = []; }
  return meusNegociosChat;
}
async function pedirAvaliacao(n, tituloPedido = "", aviso = "Pedido de avaliação enviado") {
  if (!ativa) return;
  if (emailPendente(eu)) { mostrarAvisoEmail(eu); toast(MSG_EMAIL); return; }
  const titulo = (tituloPedido || ativa.dados?.contexto?.titulo || `Atendimento de ${new Date().toLocaleDateString("pt-BR")}`).slice(0, 120);
  try {
    const ref = await fb.addDoc(fb.collection(fb.db, "pedidos"), {
      vendedorId: eu.uid, clienteId: ativa.outroId, negocioId: n.id, tipo: n.tipo, titulo, conversaId: ativa.id, criadoEm: fb.serverTimestamp()
    });
    await publicarMensagem(ativa.id, {
      remetenteId: eu.uid, texto: "", criadoEm: fb.serverTimestamp(), tipoArquivo: "avaliacao",
      avaliacao: { pedidoId: ref.id, titulo, tipo: n.tipo, negocioNome: String(n.nome || "").slice(0, 80) }
    });
    toast(aviso);
  } catch (e) { console.error(e); toast("Não foi possível pedir a avaliação."); }
}
// Avaliação pedida sozinha quando o negócio conclui: pedido marcado como Entregue (Delivery e Lojinha) ou
// "Serviço/Atendimento concluído" no cartão do orçamento ou do agendamento (Freelances e Saúde).
const avaliacaoJaPedida = (desde) => mensagens.some((x) => x.tipoArquivo === "avaliacao" && x.remetenteId === eu.uid && ms(x.criadoEm) >= desde);
async function avaliacaoAoConcluir(tipo, titulo, desde) {
  if (avaliacaoJaPedida(desde)) return;
  const n = (await negociosDoUsuario()).find((x) => x.tipo === tipo);
  if (n) await pedirAvaliacao(n, titulo, "Concluído. Pedimos ao cliente que avalie o atendimento.");
}
async function escolherNegocioParaAvaliacao() {
  const lista = await negociosDoUsuario();
  if (!lista.length) { toast("Crie um perfil de negócio no seu perfil para receber avaliações."); return; }
  if (lista.length === 1) return pedirAvaliacao(lista[0]);
  const menu = $("menuMsg");
  menu.replaceChildren();
  const cab = document.createElement("div"); cab.className = "menu-titulo"; cab.textContent = "Avaliação de qual perfil?";
  menu.appendChild(cab);
  lista.forEach((n) => {
    const b = document.createElement("button");
    b.type = "button"; b.setAttribute("role", "menuitem");
    b.append(icone("estrela", "i"), document.createTextNode(`${n.nome || TIPOS_NEGOCIO[n.tipo]} · ${TIPOS_NEGOCIO[n.tipo] || ""}`));
    b.addEventListener("click", (e) => { e.stopPropagation(); fecharMenu(); pedirAvaliacao(n); });
    menu.appendChild(b);
  });
  menu.hidden = false;
  const r = $("btnMenuConversa").getBoundingClientRect(), mr = menu.getBoundingClientRect();
  menu.style.left = Math.max(8, r.right - mr.width) + "px";
  menu.style.top = (r.bottom + 4) + "px";
}

const assuntoDe = (dados) => (dados?.contexto?.tipo && ASSUNTOS[dados.contexto.tipo] ? dados.contexto.tipo : "pessoal");

// Texto com links clicáveis, sem usar innerHTML.
function textoComLinks(texto) {
  const frag = document.createDocumentFragment();
  const re = /\bhttps?:\/\/[^\s<>"']+/gi;
  let ultimo = 0, m;
  while ((m = re.exec(texto))) {
    if (m.index > ultimo) frag.appendChild(document.createTextNode(texto.slice(ultimo, m.index)));
    const a = document.createElement("a");
    a.href = m[0];
    a.textContent = m[0];
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    frag.appendChild(a);
    ultimo = m.index + m[0].length;
  }
  if (ultimo < texto.length) frag.appendChild(document.createTextNode(texto.slice(ultimo)));
  return frag;
}

function resumoMensagem(m) {
  if (!m) return "";
  if (m.apagada) return "Mensagem apagada";
  if (m.texto) return m.texto;
  if (ehFigurinha(m)) return "Figurinha";
  if (m.tipoArquivo === "imagem") return "Foto";
  if (m.tipoArquivo === "video") return "Vídeo";
  if (m.tipoArquivo === "audio") return "Mensagem de voz";
  if (m.tipoArquivo === "cartao" && Array.isArray(m.cartao?.pedido?.itens)) {
    const n = m.cartao.pedido.itens.reduce((s, i) => s + (Number(i?.qtd) || 0), 0);
    return `Pedido: ${n} ${n === 1 ? "item" : "itens"} · ${reais(m.cartao.pedido.total)}`;
  }
  if (m.tipoArquivo === "cartao" && m.cartao?.tipo === "local") return "📍 Localização";
  if (m.tipoArquivo === "cartao" && m.cartao?.tipo === "endereco") return "🏠 Endereço";
  if (m.tipoArquivo === "cartao" && m.cartao?.tipo === "chamada") return (m.cartao.modo === "video" ? "🎥 " : "📞 ") + textoChamada(m.cartao, m.remetenteId === eu?.uid);
  if (m.tipoArquivo === "cartao" && m.cartao?.tipo === "pix") return `Pix${Number(m.cartao.valor) > 0 ? ": " + reais(m.cartao.valor) : ""}`;
  if (m.tipoArquivo === "avaliacao") return "Pedido de avaliação";
  if (m.tipoArquivo === "cartao" && m.cartao?.status) return `Pedido: ${(infoStatus(m.cartao.tipo, m.cartao.status) || [0, "status atualizado"])[1]}`;
  if (m.tipoArquivo === "cartao" && m.cartao?.solicitacao) {
    const so = m.cartao.solicitacao;
    return `${so.saude ? "Agendamento" : "Orçamento"}: ${(Array.isArray(so.servicos) && so.servicos.length ? so.servicos.join(", ") : so.saude ? "consulta" : "serviço")}${so.quando?.tipo === "urgente" ? " · Urgente" : ""}`;
  }
  if (m.tipoArquivo === "cartao" && m.cartao?.tipo === "flash") return `⚡ ${rotuloFlash(m.cartao, m.remetenteId === eu.uid)}${m.cartao.emoji ? " " + m.cartao.emoji : m.cartao.texto ? ": " + m.cartao.texto : ""}`;
  if (m.tipoArquivo === "cartao" && m.cartao?.tipo === "caixa") return `💬 Caixa de perguntas: ${m.cartao.resposta || ""}`.trim();
  if (m.tipoArquivo === "cartao" && m.cartao?.tipo === "publicacao") return `Publicação: ${m.cartao?.titulo || ""}`.trim();
  if (m.tipoArquivo === "cartao") return `Interesse: ${m.cartao?.titulo || "portfólio"}`;
  return m.arquivoUrl ? "Arquivo" : "";
}

// Prévia da última mensagem na lista, como no WhatsApp: ícone no lugar do emoji (📍, 📞, 🎥...) e nome do tipo
// ("Foto", "Mensagem de voz"...). O texto vem do resumoMensagem gravado em conversas.ultimaMensagem.
const PREVIAS = [
  [/^📍\s*/, "local"], [/^🏠\s*/, "casa"], [/^🎥\s*/, "videochamada"], [/^📞\s*/, "telefone"], [/^⚡\s*/, "feed"],
  [/^💬\s*/, "chat"], [/^📷\s*/, "camera"], [/^🎤\s*/, "mic"]
];
const PREVIAS_TIPO = [
  [/^Foto$/, "imagem"], [/^Figurinha$/, "figurinha"], [/^Vídeo$/, "videochamada"], [/^Mensagem de voz/, "mic"], [/^Arquivo$/, "clipe"],
  [/^Pix\b/, "pix"], [/^Pedido de avaliação$/, "estrela"], [/^Pedido\b/, "pedido"], [/^(Orçamento|Agendamento):/, "nota"],
  [/^Publicação:/, "imagem"], [/^Interesse:/, "loja"], [/^Mensagem apagada$/, "bloquear"]
];
function previaLista(texto) {
  const t = String(texto || "").trim();
  if (!t) return { ic: null, txt: "Nova conversa", cls: "pv-nova" };
  for (const [re, ic] of PREVIAS) if (re.test(t)) {
    const txt = t.replace(re, "");
    return { ic, txt, cls: /perdida|não atendeu/i.test(txt) ? "pv-perdida" : "" };
  }
  for (const [re, ic] of PREVIAS_TIPO) if (re.test(t)) return { ic, txt: t, cls: ic === "bloquear" ? "pv-apagada" : "" };
  return { ic: null, txt: t, cls: "" };
}

function toast(texto, aoClicar) {
  document.querySelectorAll(".toast").forEach((t) => t.remove());
  const t = document.createElement("div");
  t.className = "toast";
  t.setAttribute("role", "status");
  t.textContent = String(texto ?? "").replace(/(R\$|\d)\s+(?=\S)/g, "$1\u00a0");
  t.addEventListener("click", () => { t.remove(); aoClicar?.(); });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4500);
}

let audioCtx = null;
function tocarSom() {
  if (!config.sons) return;
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return; // o navegador só deixa tocar depois de um toque na página
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime;
    [[880, 0], [1320, 0.09]].forEach(([freq, atraso]) => {
      const osc = audioCtx.createOscillator();
      const ganho = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      ganho.gain.setValueAtTime(0.0001, t + atraso);
      ganho.gain.exponentialRampToValueAtTime(0.12, t + atraso + 0.02);
      ganho.gain.exponentialRampToValueAtTime(0.0001, t + atraso + 0.18);
      osc.connect(ganho).connect(audioCtx.destination);
      osc.start(t + atraso);
      osc.stop(t + atraso + 0.2);
    });
  } catch {}
}

function notificar(titulo, corpo, aoClicar) {
  // Gaveta fechada: quem avisa é a página de fora (sino e número das Mensagens).
  if (window.top !== window.self && window.__hfGavetaAberta === false) return;
  tocarSom();
  if (config.vibrar !== false) { try { navigator.vibrate?.([60, 40, 60]); } catch {} }
  if (config.previaNotificacao === false) corpo = "Nova mensagem";
  if (document.hidden && "Notification" in window && Notification.permission === "granted") {
    try {
      const n = new Notification(titulo, { body: corpo, icon: "android-chrome-192x192.png", tag: titulo });
      n.onclick = () => { window.focus(); n.close(); aoClicar?.(); };
      return;
    } catch {}
  }
  toast(`${titulo}: ${corpo}`, aoClicar);
}

function comprimirImagem(arquivo, maxLado, qualidade) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    leitor.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Formato de imagem não suportado."));
      img.onload = () => {
        const escala = Math.min(maxLado / img.width, maxLado / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * escala));
        canvas.height = Math.max(1, Math.round(img.height * escala));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", qualidade));
      };
      img.src = leitor.result;
    };
    leitor.readAsDataURL(arquivo);
  });
}

// ======================================================
// Estado
// ======================================================
let fb = {};                 // funções do Firestore
let eu = null;               // usuário logado
let meuPerfil = {};
let storageFns = null;       // funções do Storage (se ativo)
let authMod = null;          // funções do Firebase Auth (para sair da conta)
const perfis = new Map();
let conversas = [];
let filtro = "todas";
// Pessoal ou Negócios (conversas ligadas a um perfil de negócio). Lembra a última escolha.
let modo = "pessoal";
try { if (localStorage.getItem("hf-chat-modo") === "negocios") modo = "negocios"; } catch {}
const modoDe = (c) => (assuntoDe(c.dados) === "pessoal" ? "pessoal" : "negocios");
function trocarModo(novo) {
  if (novo === modo) return;
  modo = novo;
  document.body.classList.toggle("modo-chamadas", modo === "chamadas");
  pintarFab();
  // A lupa do topo serve às duas listas: conversas ou chamadas.
  const bc = $("buscaConversas");
  bc.value = modo === "chamadas" ? buscaChamadas : "";
  bc.placeholder = modo === "chamadas" ? "Pesquisar chamadas" : "Pesquisar conversa";
  bc.setAttribute("aria-label", bc.placeholder);
  if (modo === "chamadas") { pintarModos(); renderizarChamadas(); return; }
  try { localStorage.setItem("hf-chat-modo", modo); } catch {}
  if (filtro.startsWith("assunto:")) filtro = "todas";
  document.querySelectorAll(".pill[data-filtro]").forEach((x) => { const sel = x.dataset.filtro === filtro; x.classList.toggle("on", sel); x.setAttribute("aria-selected", sel ? "true" : "false"); });
  renderizarLista();
}
const ultimaAtualizacaoVista = new Map();
const contagens = new Map();

let ativa = null;            // { id, outroId, nome, foto, dados }
let pararMensagens = null, pararConversa = null, pararPresenca = null;
let mensagens = [];
let perfilOutroAtual = {};
let respondendo = null;
let anexo = null;
let primeiraRender = true;
let novasAbaixo = 0;
let timerDigitando = null;
let restritos = new Set();
let ocultasMsg = {};         // "apagar para mim": { idDaConversa: [ids] } (usuarios/{uid}.ocultasMsg)
const bloqueios = { meus: new Set(), deles: new Set() };
const bloqueado = (uid) => bloqueios.meus.has(uid) || bloqueios.deles.has(uid);

function obterPerfil(uid) {
  if (!uid) return Promise.resolve({});
  if (!perfis.has(uid)) {
    // Nome e foto de quem está na lista: cópia do aparelho por 10 min (a conversa aberta acompanha ao vivo).
    perfis.set(uid, (uid === eu?.uid ? docRapido(fb, fb.doc(fb.db, "perfis_publicos", uid), (s) => { if (s.exists()) Object.assign(meuPerfil || {}, s.data()); }) : docComValidade(fb, ["perfis_publicos", uid], 10 * 60000))
      .then((s) => (s.exists() ? s.data() : {}))
      .catch(() => ({})));
  }
  return perfis.get(uid);
}

const refConversa = (id) => fb.doc(fb.db, "conversas", id);

// ---------- publicação enviada (cartão com a foto) ----------
// O cartão guarda só o link (feed.html?post=ID; os antigos, usuarios.html?post=ID); a foto, o autor e a legenda vêm da publicação
// (cópia do aparelho por 10 min). Publicação apagada: "Publicação indisponível".
const postsLidos = new Map();
function lerPublicacao(id) {
  if (!postsLidos.has(id)) postsLidos.set(id, docComValidade(fb, ["diario", id], 10 * 60000).then((s) => (s.exists() ? { id, ...s.data() } : null)).catch(() => undefined));
  return postsLidos.get(id);
}
// Resumo das estrelas da publicação (diario_notas), lido uma vez por publicação.
const notasLidas = new Map();
function lerNotas(id) {
  if (!notasLidas.has(id)) notasLidas.set(id, docComValidade(fb, ["diario_notas", id], 10 * 60000).then((s) => (s.exists() ? s.data() : null)).catch(() => null));
  return notasLidas.get(id);
}
const SVG_PC = {
  diario: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="7" rx="2"/><rect x="4" y="13" width="16" height="7" rx="2"/></svg>',
  seta: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>',
  estrela: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.4-4.2 6-.9z"/></svg>',
  enquete: '<svg viewBox="0 0 24 24" aria-hidden="true" style="width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2.4"><path d="M5 6h9M5 12h14M5 18h6"/></svg>',
  sumiu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 6.1A9.7 9.7 0 0112 6c5 0 8.5 4.2 9.5 6-.5.9-1.6 2.5-3.2 3.8M6.4 7.6C4.6 8.9 3.2 10.8 2.5 12c1 1.8 4.5 6 9.5 6 1.5 0 2.9-.4 4.1-1"/></svg>'
};
const tomDe = (id) => { let h = 0; for (const ch of String(id || "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % 5; };
function cartaoPublicacao(c) {
  const id = (String(c.link || "").match(/[?&]post=([\w-]+)/) || [])[1] || "";
  const a = document.createElement("a"); a.className = "pc"; a.href = id ? `feed.html?post=${encodeURIComponent(id)}` : "#";
  a.setAttribute("aria-label", "Abrir a publicação");
  const cab = document.createElement("div"); cab.className = "pc-cab";
  const av = document.createElement("span"); av.className = "avatar pc-av";
  const nomeIni = String(c.sub || "").replace(/^Publicação de /, "") || "Publicação";
  pintarAvatar(av, "", nomeIni);
  const quemBox = document.createElement("span"); quemBox.className = "pc-quem";
  const quem = document.createElement("strong"); quem.textContent = nomeIni;
  const sub = document.createElement("small"); sub.textContent = "Publicação no Diário";
  quemBox.append(quem, sub);
  const selo = document.createElement("span"); selo.className = "pc-selo"; selo.innerHTML = SVG_PC.diario; selo.append("Diário");
  cab.append(av, quemBox, selo);
  const midia = document.createElement("div"); midia.className = "pc-midia carregando";
  const foto0 = urlSegura(c.foto);
  if (foto0) { const im = document.createElement("img"); im.src = foto0; im.alt = ""; im.loading = "lazy"; midia.appendChild(im); }
  const corpo = document.createElement("div"); corpo.className = "pc-corpo";
  const info = document.createElement("div"); info.className = "pc-info";
  const leg = document.createElement("div"); leg.className = "pc-leg";
  const titulo = String(c.titulo || "");
  leg.textContent = /^Publicação de /.test(titulo) ? "" : titulo;
  corpo.append(info, leg);
  const ver = document.createElement("span"); ver.className = "pc-ver"; ver.append("Ver publicação"); ver.insertAdjacentHTML("beforeend", SVG_PC.seta);
  a.append(cab, midia, corpo, ver);
  if (!id) { midia.classList.remove("carregando"); return a; }
  lerPublicacao(id).then((p) => {
    midia.classList.remove("carregando");
    if (p === null) {
      a.classList.add("sumiu"); midia.replaceChildren(); midia.insertAdjacentHTML("afterbegin", SVG_PC.sumiu); midia.append("Publicação indisponível");
      leg.textContent = "Ela foi apagada ou não está mais disponível."; ver.remove(); a.removeAttribute("href"); return;
    }
    if (!p) return; // sem internet: fica o que veio no cartão
    const fotos = (Array.isArray(p.midias) && p.midias.length ? p.midias : [p.mediaUrl]).map((u) => urlSegura(u)).filter(Boolean);
    if (p.mediaTipo === "video" && fotos[0]) {
      const v = document.createElement("video"); v.src = fotos[0]; v.muted = true; v.playsInline = true; v.preload = "metadata";
      const play = document.createElement("span"); play.className = "pc-play"; play.innerHTML = SVG_PC.play;
      midia.replaceChildren(v, play);
    } else if (fotos[0]) {
      const im = document.createElement("img"); im.src = fotos[0]; im.alt = p.texto ? String(p.texto).slice(0, 80) : "Foto da publicação"; im.loading = "lazy"; im.decoding = "async";
      // Mesma proporção da publicação (entre 4:5 e 1,91:1), sem cortar de novo.
      im.addEventListener("load", () => { const r = im.naturalWidth / Math.max(1, im.naturalHeight); midia.style.setProperty("--prop", String(Math.min(1.91, Math.max(0.8, r)))); }, { once: true });
      midia.replaceChildren(im);
      if (fotos.length > 1) {
        const n = document.createElement("span"); n.className = "pc-n"; n.textContent = `1/${fotos.length}`;
        const pts = document.createElement("span"); pts.className = "pc-pontos"; for (let i = 0; i < Math.min(fotos.length, 5); i++) pts.appendChild(document.createElement("i"));
        midia.append(n, pts);
      }
    } else {
      // Só texto (ou enquete): cartão com aspas, como no perfil.
      midia.classList.add("so-texto"); midia.dataset.tom = String(tomDe(id));
      const cit = document.createElement("div"); cit.className = "pc-citacao";
      if (p.enquete?.pergunta) {
        const e = document.createElement("span"); e.className = "pc-enq"; e.innerHTML = SVG_PC.enquete; e.append("Enquete");
        const t = document.createElement("p"); t.textContent = p.enquete.pergunta;
        const ops = document.createElement("div"); ops.className = "pc-ops";
        (p.enquete.opcoes || []).slice(0, 4).forEach((o) => { const x = document.createElement("span"); x.textContent = String(o?.texto ?? o ?? ""); ops.appendChild(x); });
        cit.append(e, t, ops);
      } else { const t = document.createElement("p"); t.textContent = String(p.texto || "").slice(0, 400); cit.appendChild(t); }
      midia.replaceChildren(cit);
    }
    // Legenda como no Instagram: nome em negrito e o texto ao lado (no cartão de texto, o texto já está em cima).
    const autor = p.nome || nomeIni;
    if (fotos[0] && p.texto) { const b = document.createElement("b"); b.textContent = autor; leg.replaceChildren(b, document.createTextNode(String(p.texto))); }
    else leg.textContent = "";
    const quando = ms(p.criadoEm) ? tempoRel(ms(p.criadoEm)) : "";
    obterPerfil(p.autorId).then((pf) => {
      quem.textContent = pf.nome || p.nome || "Usuário"; pintarAvatar(av, pf.fotoPerfil, pf.nome || p.nome);
      sub.textContent = [pf.nickname ? "@" + pf.nickname : "", quando].filter(Boolean).join(" · ") || "Publicação no Diário";
      if (leg.firstChild?.tagName === "B") leg.firstChild.textContent = pf.nome || autor;
    }).catch(() => {});
    lerNotas(id).then((r) => {
      if (!r?.total) return;
      const b = document.createElement("b"); b.innerHTML = SVG_PC.estrela; b.append((r.soma / r.total).toFixed(1).replace(".", ","));
      info.replaceChildren(b, document.createTextNode(`${r.total} ${r.total === 1 ? "nota" : "notas"}`));
    });
  });
  return a;
}
// "há 3 h", "há 2 d" (curto, para o cartão).
function tempoRel(t) {
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 3600) return `há ${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86400) return `há ${Math.round(s / 3600)} h`;
  if (s < 7 * 86400) return `há ${Math.round(s / 86400)} d`;
  return new Date(t).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}
// ---------- flash (resposta, reação, menção, enviado ou repostado): cartão com a miniatura ----------
// O cartão guarda só o id do flash; a foto vem do flash enquanto ele existe (24 h). Depois: "Flash indisponível".
const flashesLidos = new Map();
function lerFlash(id) {
  if (!flashesLidos.has(id)) flashesLidos.set(id, fb.getDoc(fb.doc(fb.db, "stories", id)).then((s) => {
    if (!s.exists()) return null;
    const d = s.data({ serverTimestamps: "estimate" });
    return Date.now() - (ms(d.criadoEm) || Date.now()) < 864e5 ? { id, ...d } : null;
  }).catch((e) => (e?.code === "permission-denied" ? null : undefined))); // depois das 24 h o flash vai para o arquivo (só o autor lê)
  return flashesLidos.get(id);
}
// Tocar num flash do chat (resposta, reação, menção, enviado, resposta da caixa) abre o visor JÁ, como o Instagram:
// - na rede (rede.html): no quadro do Diário, que já está carregado, por cima do chat (rede-app.js abrirFlash);
//   fechar volta para a conversa como estava;
// - fora da rede: troca de página como antes, mas o flash que o chat já leu vai junto (não baixa de novo) e fechar
//   volta para cá.
// Antes: a página do Diário inteira carregava no lugar do chat e o visor ainda esperava baixar todos os flashes da pessoa.
function ligarFlashDireto(a, id, { repostar = false } = {}) {
  if (!a || !id) return;
  const tocar = (e) => {
    if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || !a.getAttribute("href")) return;
    e.preventDefault(); e.stopPropagation();
    abrirFlashDireto(id, a.href, { repostar });
  };
  a.addEventListener("click", tocar);
  // O dedo encostou: já começa a ler (se ainda não leu) para o visor abrir com a foto pronta.
  a.addEventListener("pointerdown", () => { lerFlash(id); }, { passive: true });
}
let abrindoFlash = false;
async function abrirFlashDireto(id, href, { repostar = false } = {}) {
  if (abrindoFlash) return;
  abrindoFlash = true;
  try {
    const f = await Promise.race([lerFlash(id), new Promise((ok) => setTimeout(() => ok(undefined), 4000))]);
    if (f === null) { toast("Esse flash não está mais disponível (passou de 24 horas)."); return; }
    const texto = f ? textoDoFlash(f) : "";
    const S = casca();
    if (S?.abrirFlash && await S.abrirFlash(id, texto, { repostar })) return;
    if (!repostar) guardarParaAbrir(texto);
    // Na rede o link abre neste quadro; fora dela, na página de cima (a gaveta do chat fica dentro de outra página).
    if (S) location.href = href; else (window.top || window).location.href = href;
  } finally { setTimeout(() => { abrindoFlash = false; }, 600); }
}
function rotuloFlash(c, meu) {
  const quem = String(c.nome || "alguém").split(" ")[0];
  switch (c.acao) {
    case "resposta": return meu ? `Você respondeu ao flash de ${quem}` : "Respondeu ao seu flash";
    case "reacao":
      if (c.emoji === "⭐") return meu ? `Você deu uma estrela no flash de ${quem}` : "Deu uma estrela no seu flash";
      return meu ? `Você reagiu ao flash de ${quem}` : "Reagiu ao seu flash";
    case "mencao": return meu ? "Você mencionou no seu flash" : "Mencionou você no flash";
    case "repost": return meu ? "Você repostou o flash" : "Repostou o seu flash";
    default: return meu ? `Você enviou o flash de ${quem}` : `Enviou o flash de ${quem}`;
  }
}
const SVG_FC = {
  raio: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 2L4 14h7l-1.5 8L20 10h-7z"/></svg>',
  olho: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/></svg>',
  mais: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  sumiu: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>'
};
// Resposta da caixa de perguntas (o dono da caixa respondeu a quem escreveu, como no Instagram):
// cartao {tipo:"caixa", pergunta, resposta, cor, itemTipo f|d, itemId, autorId (dono da caixa)}.
const FAIXA_CX = { branco: "linear-gradient(135deg, #00c2ff, #0066d6)", escuro: "linear-gradient(135deg, #2a3540, #151b21)", azul: "linear-gradient(135deg, #19b8f2, #0052d4)",
  rosa: "linear-gradient(135deg, #ff5f95, #c2185b)", laranja: "linear-gradient(135deg, #ffb347, #ff6a00)", verde: "linear-gradient(135deg, #34d399, #0f8a5f)", roxo: "linear-gradient(135deg, #a855f7, #5b21b6)" };
const SVG_CX = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M9.6 9.6a2.4 2.4 0 1 1 3.4 2.2c-.6.3-1 .8-1 1.5M12 16h.01"/></svg>';
function cartaoCaixa(c, m) {
  const meu = m.remetenteId === eu.uid;
  const box = document.createElement("div"); box.className = "rsp";
  const rot = document.createElement("span"); rot.className = "rsp-rot";
  rot.textContent = meu ? "Você respondeu a uma resposta da sua caixa" : "Respondeu à sua resposta";
  const id = /^[A-Za-z0-9]{1,64}$/.test(String(c.itemId || "")) ? c.itemId : "";
  // O cartão inteiro abre o flash / a publicação (sem botão a mais embaixo).
  const card = document.createElement(id ? "a" : "div"); card.className = "rsp-cx" + (c.cor === "escuro" ? " escuro" : "");
  card.style.setProperty("--cxm", FAIXA_CX[c.cor] || FAIXA_CX.branco);
  if (id) { card.target = "_top"; card.href = c.itemTipo === "f" ? `feed.html?flash=${encodeURIComponent(id)}` : `feed.html?post=${encodeURIComponent(id)}`; card.setAttribute("aria-label", c.itemTipo === "f" ? "Ver o flash" : "Ver a publicação"); if (c.itemTipo === "f") ligarFlashDireto(card, id); }
  const perg = document.createElement("strong"); perg.className = "cxm-perg"; perg.textContent = String(c.pergunta || "Caixa de perguntas").slice(0, 120);
  const resp = document.createElement("span"); resp.className = "cxm-resp"; resp.textContent = String(c.resposta || "").slice(0, 300);
  card.append(perg, resp);
  box.append(rot, card);
  return box;
}
// Resposta, reação, menção, envio e repost de flash: linha pequena + miniatura compacta + texto num balão comum.
function cartaoFlash(c, m) {
  const meu = m.remetenteId === eu.uid;
  const id = /^[A-Za-z0-9]{1,64}$/.test(String(c.flashId || "")) ? c.flashId : "";
  const box = document.createElement("div"); box.className = "rsp";
  const rot = document.createElement("span"); rot.className = "rsp-rot";
  rot.innerHTML = SVG_FC.raio; rot.append(rotuloFlash(c, meu));
  const quadro = document.createElement("div"); quadro.className = "rsp-quadro";
  const mini = document.createElement("a"); mini.className = "rsp-mini carregando"; mini.target = "_top";
  if (id) { mini.href = `feed.html?flash=${encodeURIComponent(id)}`; ligarFlashDireto(mini, id); }
  mini.setAttribute("aria-label", "Ver o flash");
  const topo = document.createElement("div"); topo.className = "fc-topo";
  const av = document.createElement("span"); av.className = "avatar"; pintarAvatar(av, "", c.nome || "Flash");
  const quem = document.createElement("b"); quem.textContent = String(c.nome || "Flash").split(" ")[0];
  const tempo = document.createElement("span"); tempo.className = "fc-tempo";
  topo.append(av, quem, tempo);
  mini.appendChild(topo);
  quadro.appendChild(mini);
  if (c.acao === "reacao" && c.emoji) { const e = document.createElement("span"); e.className = "rsp-emoji"; e.textContent = String(c.emoji).slice(0, 8); quadro.appendChild(e); }
  box.append(rot, quadro);
  if (c.texto) { const t = document.createElement("div"); t.className = "rsp-txt"; t.textContent = String(c.texto).slice(0, 300); box.appendChild(t); }
  let botao = null;
  if (c.acao === "mencao" && !meu && id) {
    botao = document.createElement("a"); botao.className = "rsp-btn"; botao.target = "_top"; botao.href = `feed.html?repostar=${encodeURIComponent(id)}`;
    ligarFlashDireto(botao, id, { repostar: true });
    botao.innerHTML = SVG_FC.mais; botao.append("Adicionar ao seu flash"); box.appendChild(botao);
  }
  if (!id) { mini.classList.remove("carregando"); return box; }
  obterPerfil(c.autorId).then((p) => { if (p?.nome) quem.textContent = String(p.nome).split(" ")[0]; pintarAvatar(av, p?.fotoPerfil, p?.nome || c.nome); }).catch(() => {});
  lerFlash(id).then((f) => {
    mini.classList.remove("carregando");
    if (f === undefined) return; // sem internet
    if (!f || f.tipo === "video" && !/^https:/.test(String(f.midia || ""))) {
      mini.classList.add("sumiu"); mini.removeAttribute("href"); mini.replaceChildren(); mini.insertAdjacentHTML("afterbegin", SVG_FC.sumiu);
      const t = document.createElement("span"); t.textContent = "Flash indisponível";
      const n = document.createElement("small"); n.textContent = "Fica no ar por 24 horas";
      mini.append(t, n);
      botao?.remove();
      return;
    }
    if (f.tipo === "video") { const v = document.createElement("video"); v.src = f.midia; v.muted = true; v.playsInline = true; v.preload = "metadata"; mini.prepend(v); }
    else if (urlSegura(f.midia)) { const im = document.createElement("img"); im.src = urlSegura(f.midia); im.alt = "Miniatura do flash"; im.loading = "lazy"; im.decoding = "async"; mini.prepend(im); }
    const resta = 864e5 - (Date.now() - (ms(f.criadoEm) || Date.now()));
    tempo.textContent = resta > 3600e3 ? `${Math.floor(resta / 3600e3)} h` : `${Math.max(1, Math.round(resta / 60e3))} min`;
    tempo.title = "Tempo até o flash sair do ar";
  });
  return box;
}
const estaDigitando = (dados, uid) => Date.now() - ms(dados?.digitando?.[uid]) < 6000;

// "lidoEm" é visto pelo outro (confirmação de leitura); "vistoEm" é só para o contador.
// Página fora da vista: aba escondida OU a gaveta do chat fechada (o iframe continua carregado por trás).
const escondida = () => document.hidden || (window.top !== window.self && window.__hfGavetaAberta === false);
const minhaLeitura = (dados) => Math.max(ms(dados?.lidoEm?.[eu.uid]), ms(dados?.vistoEm?.[eu.uid]));
const campoLeitura = (outroId) => (config.confirmacaoLeitura !== false && !restritos.has(outroId) ? "lidoEm" : "vistoEm");
const verLeituraDosOutros = () => config.confirmacaoLeitura !== false;

function calcularNaoLida(dados) {
  return !!dados.ultimaMensagemRemetenteId
    && dados.ultimaMensagemRemetenteId !== eu.uid
    && ms(dados.atualizadoEm) > minhaLeitura(dados);
}

// ======================================================
// Lista de conversas
// ======================================================
// Filtros por assunto (Pessoais, Serviços, Delivery...), só dos que existem nas suas conversas.
function pintarPillsAssunto() {
  const box = $("pillsAssunto");
  // Só na aba Negócios: as categorias que existem nas suas conversas de negócio.
  const presentes = Object.keys(ASSUNTOS).filter((k) => k !== "pessoal" && conversas.some((c) => assuntoDe(c.dados) === k && !restritos.has(c.outroId)));
  const mostrar = modo === "negocios" && filtro !== "restritas" && filtro !== "arquivadas" ? presentes : [];
  const chave = mostrar.join(",") + "|" + filtro;
  if (box.dataset.chave === chave) return;
  box.dataset.chave = chave;
  box.replaceChildren();
  mostrar.forEach((k) => {
    const b = document.createElement("button");
    b.type = "button";
    const on = filtro === "assunto:" + k;
    b.className = "pill assunto" + (on ? " on" : "");
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", on ? "true" : "false");
    b.style.setProperty("--assunto", ASSUNTOS[k].cor);
    const bola = document.createElement("i");
    b.append(bola, document.createTextNode(ASSUNTOS[k].nome));
    b.addEventListener("click", () => {
      filtro = on ? "todas" : "assunto:" + k;
      document.querySelectorAll(".pill").forEach((x) => { const sel = x.dataset.filtro === filtro; x.classList.toggle("on", sel); x.setAttribute("aria-selected", sel ? "true" : "false"); });
      renderizarLista();
    });
    box.appendChild(b);
  });
}

const conversaArquivada = (c) => !!c.dados?.arquivadaPara?.[eu?.uid];
function conversaOculta(c) {
  const t = ms(c.dados?.ocultaPara?.[eu?.uid]);
  return !!t && ms(c.dados?.atualizadoEm) <= t;
}
// Segurar (celular) seleciona a conversa, como no WhatsApp; clique direito (computador) abre as opções.
// aoSegurar(x, y, porToque). No Android o segurar também dispara "contextmenu": conta como toque.
// Depois de um "segurar", o dedo ainda está na tela: a lista muda (entra a seleção) e o "contextmenu"/"click" que o
// celular manda em seguida caía na conversa de baixo (marcava 2). Até o dedo sair (+350 ms) esses eventos são ignorados.
let toqueTravadoAte = 0;
const toqueTravado = () => Date.now() < toqueTravadoAte;
function travarToque() {
  toqueTravadoAte = Date.now() + 5000;
  const soltar = () => { toqueTravadoAte = Date.now() + 350; ["pointerup", "pointercancel", "touchend", "touchcancel"].forEach((ev) => document.removeEventListener(ev, soltar, true)); };
  ["pointerup", "pointercancel", "touchend", "touchcancel"].forEach((ev) => document.addEventListener(ev, soltar, true));
}
function ligarToqueLongo(el, aoSegurar) {
  let timer = null, x0 = 0, y0 = 0, tipo = "mouse";
  const cancelar = () => { clearTimeout(timer); timer = null; };
  el.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    x0 = e.clientX; y0 = e.clientY; tipo = e.pointerType || "mouse";
    delete el.dataset.segurou;
    cancelar();
    timer = setTimeout(() => { timer = null; el.dataset.segurou = "1"; travarToque(); if (navigator.userActivation?.hasBeenActive !== false) navigator.vibrate?.(15); aoSegurar(x0, y0, tipo !== "mouse"); }, 450);
  });
  el.addEventListener("pointermove", (e) => { if (timer && Math.hypot(e.clientX - x0, e.clientY - y0) > 10) cancelar(); });
  ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => el.addEventListener(ev, cancelar));
  el.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    if (toqueTravado()) return;
    const toque = (e.pointerType && e.pointerType !== "mouse") || (tipo !== "mouse" && !e.button);
    if (toque) { if (!el.dataset.segurou) { cancelar(); el.dataset.segurou = "1"; travarToque(); aoSegurar(e.clientX, e.clientY, true); } return; }
    cancelar(); aoSegurar(e.clientX, e.clientY, false);
  });
}

function abrirMenuItemConversa(c, x, y) {
  const menu = $("menuMsg");
  menu.replaceChildren();
  const arquivada = conversaArquivada(c);
  [
    { rotulo: "Selecionar", icone: "selecionar", acao: () => entrarSelecao(c.id) },
    { rotulo: modoDe(c) === "pessoal" ? "Classificar: Pessoal" : `Classificar: ${ASSUNTOS[assuntoDe(c.dados)].nome}`, icone: "etiqueta", acao: () => setTimeout(() => abrirMenuAssunto(c, x, y), 0) },
    { rotulo: fixada(c) ? "Desafixar" : "Fixar no topo", icone: "pin", acao: () => marcarConversa(c, "fixadaPara", !fixada(c)) },
    { rotulo: silenciada(c) ? "Reativar avisos" : "Silenciar avisos", icone: "relogio", acao: () => marcarConversa(c, "silenciadaPara", !silenciada(c)) },
    { rotulo: arquivada ? "Desarquivar" : "Arquivar", icone: "arquivo", acao: () => arquivarConversa(c, !arquivada) },
    { rotulo: "Apagar conversa", icone: "lixo", perigo: true, acao: () => apagarConversaParaMim(c) }
  ].forEach((op) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "menuitem");
    if (op.perigo) b.className = "perigo";
    b.append(icone(op.icone, "i"), document.createTextNode(op.rotulo));
    b.addEventListener("click", (e) => { e.stopPropagation(); fecharMenu(); op.acao(); });
    menu.appendChild(b);
  });
  menu.hidden = false;
  const r = menu.getBoundingClientRect();
  menu.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + "px";
  menu.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + "px";
  setTimeout(() => menu.querySelector("button")?.focus(), 0);
}
// Fixar no topo / silenciar: cada pessoa marca só para si (regras: soMinhaChave).
const fixada = (c) => !!c.dados?.fixadaPara?.[eu.uid];
const silenciada = (c) => !!c.dados?.silenciadaPara?.[eu.uid];
async function marcarConversa(c, campo, ligar) {
  try {
    await fb.setDoc(refConversa(c.id), { [campo]: { [eu.uid]: ligar ? true : null } }, { merge: true });
    toast(campo === "fixadaPara" ? (ligar ? "Conversa fixada no topo" : "Conversa desafixada") : (ligar ? "Avisos silenciados para esta conversa" : "Avisos reativados"));
  } catch (e) { console.error(e); toast("Não foi possível alterar agora."); }
}
async function arquivarConversa(c, arquivar) {
  try {
    await fb.setDoc(refConversa(c.id), { arquivadaPara: { [eu.uid]: arquivar ? fb.serverTimestamp() : null } }, { merge: true });
    toast(arquivar ? "Conversa arquivada" : "Conversa desarquivada");
  } catch (e) { console.error(e); toast("Não foi possível arquivar agora."); }
}
async function apagarConversaParaMim(c) {
  if (!(await confirmarHF({ titulo: `Apagar a conversa com ${c.nome}?`, ok: "Apagar", icone: "lixo", texto: `Ela some da sua lista e as mensagens antigas ficam ocultas só para você. A outra pessoa continua vendo.` }))) return;
  try {
    await fb.setDoc(refConversa(c.id), { ocultaPara: { [eu.uid]: fb.serverTimestamp() }, arquivadaPara: { [eu.uid]: null } }, { merge: true });
    if (ativa?.id === c.id) fecharConversa();
    toast("Conversa apagada");
  } catch (e) { console.error(e); toast("Não foi possível apagar agora."); }
}

// ---------- seleção de várias conversas ----------
let selecionando = false;
const selecionadas = new Set();
let visiveisNaLista = [];
function entrarSelecao(id) {
  selecionando = true;
  selecionadas.clear();
  if (id) selecionadas.add(id);
  document.body.classList.add("selecionando");
  $("barraSelecao").hidden = false;
  renderizarLista();
}
function sairSelecao() {
  selecionando = false;
  selecionadas.clear();
  document.body.classList.remove("selecionando");
  $("barraSelecao").hidden = true;
  renderizarLista();
}
function alternarSelecao(id) {
  if (selecionadas.has(id)) selecionadas.delete(id); else selecionadas.add(id);
  if (!selecionadas.size) { sairSelecao(); return; }
  renderizarLista();
}
function pintarSelecao() {
  const n = selecionadas.size;
  $("selConta").textContent = String(n);
  const rot = $("selRotulo"); if (rot) rot.textContent = n === 1 ? "selecionada" : "selecionadas";
  ["selArquivar", "selApagar", "selFixar", "selSilenciar"].forEach((id) => { $(id).disabled = !n; });
  const arq = filtro === "arquivadas";
  $("selArquivar").setAttribute("aria-label", arq ? "Desarquivar selecionadas" : "Arquivar selecionadas");
  $("selArquivar").title = arq ? "Desarquivar" : "Arquivar";
  const sel = conversas.filter((c) => selecionadas.has(c.id));
  const todasFix = sel.length && sel.every(fixada), todasSil = sel.length && sel.every(silenciada);
  $("selFixar").title = todasFix ? "Desafixar" : "Fixar"; $("selFixar").setAttribute("aria-label", $("selFixar").title);
  $("selFixar").classList.toggle("on", !!todasFix);
  $("selSilenciar").title = todasSil ? "Reativar avisos" : "Silenciar"; $("selSilenciar").setAttribute("aria-label", $("selSilenciar").title);
  $("selSilenciar").classList.toggle("on", !!todasSil);
  $("selSilenciar").querySelector("use")?.setAttribute("href", todasSil ? "#i-sino" : "#i-sino-off");
  $("selFixar").querySelector("use")?.setAttribute("href", todasFix ? "#i-pin-off" : "#i-pin");
}
// Uma conversa com bloqueio não pode ser alterada (regras): faz as outras e avisa.
function avisarLote(resultados, acao, sair = true) {
  const ok = resultados.filter((x) => x.status === "fulfilled").length;
  const falhou = resultados.length - ok;
  resultados.filter((x) => x.status === "rejected").forEach((x) => console.warn("Conversa não alterada:", x.reason?.code || x.reason));
  const plural = (n) => `${n} ${n === 1 ? "conversa" : "conversas"} ${acao}${n === 1 ? "" : "s"}`;
  if (!falhou) toast(plural(ok));
  else if (ok) toast(`${plural(ok)}. ${falhou} não ${falhou === 1 ? "pôde" : "puderam"} ser alterada${falhou === 1 ? "" : "s"} (conta bloqueada).`);
  else toast("Não foi possível alterar: conversas com contas bloqueadas não podem ser mexidas.");
  if (sair) sairSelecao(); else renderizarLista();
}
$("selSair").addEventListener("click", sairSelecao);
// "Voltar" do celular / Esc saem da seleção (voltar.js trata a barra como uma janela aberta).
$("barraSelecao").addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); sairSelecao(); } });
// Fixar / silenciar em lote: se todas já estão, desfaz; senão liga em todas.
async function marcarLote(campo, teste, acao) {
  const lista = conversas.filter((c) => selecionadas.has(c.id));
  if (!lista.length) return;
  const ligar = !lista.every(teste);
  // Fixar e silenciar NÃO saem da seleção (pedido do dono): dá para fixar, silenciar e arquivar as mesmas de uma vez.
  // Muda na hora na lista (sem esperar o servidor), o que falhar volta quando a conversa atualizar.
  lista.forEach((c) => { c.dados[campo] = { ...(c.dados[campo] || {}), [eu.uid]: ligar ? true : null }; });
  renderizarLista();
  const r = await Promise.allSettled(lista.map((c) => fb.setDoc(refConversa(c.id), { [campo]: { [eu.uid]: ligar ? true : null } }, { merge: true })));
  avisarLote(r, ligar ? acao[0] : acao[1], false);
}
$("selFixar").addEventListener("click", () => marcarLote("fixadaPara", fixada, ["fixada", "desafixada"]));
$("selSilenciar").addEventListener("click", () => marcarLote("silenciadaPara", silenciada, ["silenciada", "reativada"]));
$("selMais").addEventListener("click", (e) => {
  e.stopPropagation();
  const r = $("selMais").getBoundingClientRect();
  const sel = conversas.filter((c) => selecionadas.has(c.id));
  const todas = visiveisNaLista.length && visiveisNaLista.every((c) => selecionadas.has(c.id));
  const ops = [{ rotulo: todas ? "Desmarcar todas" : "Selecionar todas", icone: "selecionar", acao: () => {
    visiveisNaLista.forEach((c) => (todas ? selecionadas.delete(c.id) : selecionadas.add(c.id)));
    if (!selecionadas.size) sairSelecao(); else renderizarLista();
  } }];
  if (sel.length === 1) {
    const c = sel[0];
    ops.push({ rotulo: modoDe(c) === "pessoal" ? "Classificar: Pessoal" : `Classificar: ${ASSUNTOS[assuntoDe(c.dados)].nome}`, icone: "etiqueta", acao: () => { sairSelecao(); setTimeout(() => abrirMenuAssunto(c, r.right - 220, r.bottom + 4), 0); } });
    ops.push({ rotulo: "Abrir conversa", icone: "chat", acao: () => { sairSelecao(); abrirConversa(c.id); } });
  }
  const menu = $("menuMsg");
  menu.replaceChildren();
  ops.forEach((op) => {
    const b = document.createElement("button");
    b.type = "button"; b.setAttribute("role", "menuitem");
    b.append(icone(op.icone, "i"), document.createTextNode(op.rotulo));
    b.addEventListener("click", (ev) => { ev.stopPropagation(); fecharMenu(); op.acao(); });
    menu.appendChild(b);
  });
  menu.hidden = false;
  const m = menu.getBoundingClientRect();
  menu.style.left = Math.max(8, Math.min(r.right - m.width, innerWidth - m.width - 8)) + "px";
  menu.style.top = Math.max(8, Math.min(r.bottom + 4, innerHeight - m.height - 8)) + "px";
});
$("selArquivar").addEventListener("click", async () => {
  const lista = conversas.filter((c) => selecionadas.has(c.id));
  if (!lista.length) return;
  const arquivar = filtro !== "arquivadas";
  const r = await Promise.allSettled(lista.map((c) => fb.setDoc(refConversa(c.id), { arquivadaPara: { [eu.uid]: arquivar ? fb.serverTimestamp() : null } }, { merge: true })));
  avisarLote(r, arquivar ? "arquivada" : "desarquivada");
});
$("selApagar").addEventListener("click", async () => {
  const lista = conversas.filter((c) => selecionadas.has(c.id));
  if (!lista.length) return;
  if (!(await confirmarHF({ titulo: `Apagar ${lista.length} ${lista.length === 1 ? "conversa" : "conversas"}?`, texto: "Elas somem da sua lista e as mensagens antigas ficam ocultas só para você. A outra pessoa continua vendo.", ok: "Apagar", icone: "lixo" }))) return;
  const r = await Promise.allSettled(lista.map((c) => fb.setDoc(refConversa(c.id), { ocultaPara: { [eu.uid]: fb.serverTimestamp() }, arquivadaPara: { [eu.uid]: null } }, { merge: true })));
  if (ativa && r.some((x, i) => x.status === "fulfilled" && lista[i].id === ativa.id)) fecharConversa();
  avisarLote(r, "apagada");
});

function pintarModos() {
  const visiveis = conversas.filter((c) => !conversaOculta(c) && !conversaArquivada(c) && !restritos.has(c.outroId));
  document.querySelectorAll(".modos [data-modo]").forEach((b) => {
    b.setAttribute("aria-selected", b.dataset.modo === modo ? "true" : "false");
    const n = b.dataset.modo === "chamadas" ? perdidasNovas() : visiveis.filter((c) => c.naoLida && modoDe(c) === b.dataset.modo).length;
    const bd = b.querySelector(".modo-n");
    bd.hidden = !n || b.dataset.modo === modo;
    bd.textContent = n > 99 ? "99+" : String(n);
  });
}
document.querySelectorAll(".modos [data-modo]").forEach((b) => b.addEventListener("click", () => trocarModo(b.dataset.modo)));

// ---------- Online agora (como o chat do antigo Facebook, 10/11/2026) ----------
// Uma consulta só: perfis_publicos com ultimoAcesso nos últimos 10 min (até 80; presenca.js grava a cada 4 min com a página
// à vista), relida de 2 em 2 min enquanto a lista aparece. Na lista de conversas entram só os SEUS contatos (as pessoas das
// suas conversas e quem você segue); em "Nova conversa", todos os online (os contatos primeiro). Quem escondeu o online
// (ultimoAcesso null, Configurações) não aparece, e quem escondeu o próprio não vê o dos outros (como no WhatsApp).
const ONLINE_MS = 10 * 60000;
let onlineTodos = [], onlineEm = 0, onlineLendo = null, seguindoChat = null;
const onlineSet = () => new Set(onlineTodos.filter((p) => Date.now() - ms(p.ultimoAcesso) < ONLINE_MS).map((p) => p.uid));
function lerOnline(forcar = false) {
  if (!eu || config.mostrarOnline === false) { onlineTodos = []; return Promise.resolve(onlineTodos); }
  if (!forcar && Date.now() - onlineEm < 2 * 60000) return Promise.resolve(onlineTodos);
  if (onlineLendo) return onlineLendo;
  seguindoChat ||= docsComValidade(fb, "seguindo-" + eu.uid, fb.query(fb.collection(fb.db, "relacoes"), fb.where("tipo", "==", "seguir"), fb.where("seguidorId", "==", eu.uid), fb.limit(500)), 15 * 60000)
    .then((s) => new Set(s.docs.map((d) => d.data().alvoId))).catch(() => new Set());
  const desde = fb.Timestamp.fromMillis(Date.now() - ONLINE_MS);
  onlineLendo = Promise.all([
    fb.getDocs(fb.query(fb.collection(fb.db, "perfis_publicos"), fb.where("ultimoAcesso", ">=", desde), fb.orderBy("ultimoAcesso", "desc"), fb.limit(80))),
    seguindoChat
  ]).then(([s, seg]) => {
    const contatos = new Set([...conversas.map((c) => c.outroId), ...seg]);
    onlineTodos = s.docs.map((d) => ({ uid: d.id, ...d.data() }))
      .filter((p) => p.uid !== eu.uid && p.nome && !bloqueado(p.uid) && !restritos.has(p.uid))
      .map((p) => ({ ...p, contato: contatos.has(p.uid), conv: conversas.find((c) => c.outroId === p.uid && !conversaOculta(c)) }))
      .sort((a, b) => (b.conv ? 1 : 0) - (a.conv ? 1 : 0) || (b.contato ? 1 : 0) - (a.contato ? 1 : 0) || ms(b.conv?.dados.atualizadoEm) - ms(a.conv?.dados.atualizadoEm) || ms(b.ultimoAcesso) - ms(a.ultimoAcesso));
    onlineEm = Date.now();
    return onlineTodos;
  }).catch((e) => { console.warn("Online agora:", e); return onlineTodos; }).finally(() => { onlineLendo = null; });
  return onlineLendo;
}
function pintarOnline() {
  const box = $("onlineAgora"); if (!box) return;
  const termo = $("buscaPessoas").value.trim();
  const vivos = onlineSet();
  const lista = onlineTodos.filter((p) => vivos.has(p.uid));
  box.hidden = !lista.length || !!termo || config.mostrarOnline === false;
  if (box.hidden) return;
  const topo = document.createElement("div"); topo.className = "oa-topo";
  const t = document.createElement("strong"); t.append(Object.assign(document.createElement("i"), { className: "oa-pt" }), document.createTextNode("Online agora"));
  const nc = lista.filter((p) => p.contato).length;
  const n = document.createElement("small"); n.textContent = (lista.length === 1 ? "1 pessoa" : `${lista.length} pessoas`) + (nc ? ` · ${nc} ${nc === 1 ? "contato" : "contatos"}` : "");
  topo.append(t, n);
  const trilho = document.createElement("div"); trilho.className = "oa-trilho";
  lista.slice(0, 30).forEach((p) => {
    const b = document.createElement("button"); b.type = "button"; b.className = "oa-pessoa";
    b.setAttribute("aria-label", `Conversar com ${p.nome} (online agora)`);
    if (p.contato) b.classList.add("contato");
    const av = document.createElement("div"); av.className = "avatar"; pintarAvatar(av, p.fotoPerfil, p.nome);
    const f = document.createElement("span"); f.className = "oa-foto"; f.append(av, Object.assign(document.createElement("i"), { className: "oa-on" }));
    const nm = document.createElement("span"); nm.className = "oa-nome"; nm.textContent = nomeCurto(p.nome).split(" ")[0];
    b.append(f, nm);
    b.addEventListener("click", () => (p.conv ? abrirConversa(p.conv.id) : iniciarConversaCom(p.uid)));
    trilho.appendChild(b);
  });
  box.replaceChildren(topo, trilho);
}
// Relê de 2 em 2 min com a lista à vista (e na hora em que a página volta a aparecer).
setInterval(() => { if (eu && !document.hidden && !escondida()) lerOnline().then(() => { if ($("painelNova")?.classList.contains("aberto")) pintarOnline(); renderizarListaLeve(); }); }, 60000);
document.addEventListener("visibilitychange", () => { if (eu && !document.hidden) lerOnline().then(() => renderizarListaLeve()); });
// Só a bolinha verde nas fotos da lista (sem desenhar a lista de novo).
function renderizarListaLeve() {
  const vivos = onlineSet();
  document.querySelectorAll("#listaConversas .conv-item[data-outro]").forEach((it) => it.classList.toggle("on", vivos.has(it.dataset.outro) && config.mostrarOnline !== false));
}
function renderizarLista() {
  if (modo === "chamadas") { pintarModos(); return; }
  const lista = $("listaConversas");
  const termo = $("buscaConversas").value.trim().toLowerCase();
  let itens = conversas.filter((c) => !termo || c.nome.toLowerCase().includes(termo) || (c.nick || "").toLowerCase().includes(termo));
  // Apagada "só para mim": some até chegar mensagem nova. Arquivada: só no filtro Arquivadas.
  itens = itens.filter((c) => !conversaOculta(c));
  itens = filtro === "arquivadas" ? itens.filter(conversaArquivada) : itens.filter((c) => !conversaArquivada(c));
  itens = filtro === "restritas" ? itens.filter((c) => restritos.has(c.outroId)) : itens.filter((c) => !restritos.has(c.outroId));
  if (filtro === "naoLidas") itens = itens.filter((c) => c.naoLida);
  if (filtro.startsWith("assunto:")) itens = itens.filter((c) => assuntoDe(c.dados) === filtro.slice(8));
  // Restritas e arquivadas mostram tudo; o resto fica na aba escolhida.
  if (filtro !== "restritas" && filtro !== "arquivadas") itens = itens.filter((c) => modoDe(c) === modo);
  pintarModos();
  visiveisNaLista = itens;
  if (selecionando) { [...selecionadas].forEach((id) => { if (!itens.some((c) => c.id === id)) selecionadas.delete(id); }); pintarSelecao(); }
  $("pillRestritas").hidden = !conversas.some((c) => restritos.has(c.outroId)) && filtro !== "restritas";
  $("pillArquivadas").hidden = !conversas.some((c) => conversaArquivada(c) && !conversaOculta(c)) && filtro !== "arquivadas";
  pintarPillsAssunto();
  // Número de não lidas na pílula (da aba atual)
  const pNl = document.querySelector('.pill[data-filtro="naoLidas"]');
  if (pNl) {
    const n = conversas.filter((c) => c.naoLida && !conversaOculta(c) && !conversaArquivada(c) && !restritos.has(c.outroId) && modoDe(c) === modo).length;
    let q = pNl.querySelector(".pill-n");
    if (!q) { q = document.createElement("b"); q.className = "pill-n"; pNl.appendChild(q); }
    q.textContent = n > 99 ? "99+" : String(n); q.hidden = !n;
  }
  const resumo = $("sideResumo");
  if (resumo) {
    const nl = conversas.filter((c) => c.naoLida && !conversaOculta(c) && !conversaArquivada(c) && !restritos.has(c.outroId)).length;
    resumo.replaceChildren(document.createTextNode("Help Floripa"));
    if (nl) { const b = document.createElement("b"); b.textContent = ` · ${nl > 99 ? "99+" : nl} não ${nl === 1 ? "lida" : "lidas"}`; resumo.appendChild(b); }
  }
  lista.replaceChildren();
  const vivosLista = config.mostrarOnline === false ? new Set() : onlineSet();

  if (!itens.length) {
    const vazio = document.createElement("div");
    vazio.className = "lista-vazia";
    const titulo = document.createElement("strong");
    if (termo) {
      titulo.textContent = "Nenhuma conversa encontrada";
      vazio.append(titulo, "Tente outro nome.");
    } else if (filtro === "restritas") {
      titulo.textContent = "Nenhuma conversa restrita";
      vazio.append(titulo, "Conversas de contas que você restringiu aparecem aqui, sem notificações.");
    } else if (filtro === "arquivadas") {
      titulo.textContent = "Nenhuma conversa arquivada";
      vazio.append(titulo, "Segure uma conversa na lista e toque em Arquivar.");
    } else if (filtro === "naoLidas") {
      titulo.textContent = "Tudo em dia";
      vazio.append(titulo, modo === "negocios" ? "Nenhuma mensagem de negócio sem ler." : "Nenhuma mensagem pessoal sem ler.");
    } else if (modo === "negocios") {
      titulo.textContent = "Nenhuma conversa de negócio";
      vazio.append(titulo, "Quando alguém falar com você por um perfil de negócio (Freelances, Delivery, Lojinha, Imóveis ou Saúde) ou por um anúncio da Comunidade, ou você falar com um, a conversa aparece aqui com a categoria.");
    } else {
      titulo.textContent = "Nenhuma conversa ainda";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-primario";
      btn.textContent = "Começar uma conversa";
      btn.addEventListener("click", () => abrirPainel("painelNova"));
      vazio.append(titulo, "Converse com clientes e profissionais do Help Floripa.", document.createElement("br"), btn);
    }
    lista.appendChild(vazio);
    return;
  }

  // Com conversa fixada: títulos "Fixadas" e "Conversas" separando os dois grupos.
  const temFixada = filtro !== "arquivadas" && itens.some(fixada);
  const secao = (txt) => { const h = document.createElement("div"); h.className = "conv-secao"; h.textContent = txt; lista.appendChild(h); };
  itens.forEach((c, i) => {
    if (temFixada && i === 0) secao("Fixadas");
    if (temFixada && !fixada(c) && fixada(itens[i - 1] || c)) secao("Conversas");
    const item = document.createElement("button");
    item.type = "button";
    item.className = "conv-item" + (c.naoLida ? " nao-lida" : "") + (ativa?.id === c.id ? " ativa" : "");
    item.dataset.outro = c.outroId;
    if (vivosLista.has(c.outroId)) item.classList.add("on");
    const assunto = assuntoDe(c.dados);
    item.style.setProperty("--assunto", ASSUNTOS[assunto].cor);
    if (assunto !== "pessoal") item.classList.add("com-assunto");
    if (selecionadas.has(c.id)) item.classList.add("marcada");
    item.addEventListener("click", (e) => {
      if (item.dataset.segurou || toqueTravado()) { delete item.dataset.segurou; e.preventDefault(); return; }
      if (selecionando) { alternarSelecao(c.id); return; }
      abrirConversa(c.id);
    });
    ligarToqueLongo(item, (x, y, toque) => {
      if (selecionando) alternarSelecao(c.id);
      else if (toque) entrarSelecao(c.id);
      else abrirMenuItemConversa(c, x, y);
    });

    const av = document.createElement("div");
    av.className = "avatar";
    pintarAvatar(av, c.foto, c.nome);
    let avBox = av;
    if (assunto !== "pessoal") {
      // Negócio: o tipo vai num selinho no canto da foto (cor + ícone), sem anel e sem faixa do lado
      avBox = document.createElement("div"); avBox.className = "conv-av";
      const sl = document.createElement("span"); sl.className = "conv-tipo-ic"; sl.appendChild(icone(ICONE_ASSUNTO[assunto] || "maleta", "i"));
      sl.setAttribute("aria-hidden", "true");
      avBox.append(av, sl);
    }

    const main = document.createElement("div");
    main.className = "conv-main";
    const l1 = document.createElement("div");
    l1.className = "conv-linha";
    const nome = document.createElement("div");
    nome.className = "conv-nome";
    nome.title = c.nome;
    const nm = document.createElement("span"); nm.className = "conv-nm"; nm.textContent = nomeCurto(c.nome);
    nome.appendChild(nm);
    if (c.verificado) { const v = icone("selo", "i selo-v"); v.setAttribute("aria-label", "Perfil verificado"); nome.appendChild(v); }
    if (fixada(c)) { const f = icone("pin", "i xs"); f.setAttribute("aria-label", "Fixada"); f.style.cssText = "margin-left:4px;opacity:.7;vertical-align:-2px"; nome.appendChild(f); }
    if (silenciada(c)) { const m = icone("sino-off", "i xs"); m.setAttribute("aria-label", "Silenciada"); m.style.cssText = "margin-left:4px;opacity:.6;vertical-align:-2px"; nome.appendChild(m); }
    const quando = document.createElement("div");
    quando.className = "conv-hora";
    quando.textContent = dataLista(paraData(c.dados.atualizadoEm));
    l1.append(nome, quando);

    const l2 = document.createElement("div");
    l2.className = "conv-linha";
    const previa = document.createElement("div");
    previa.className = "conv-previa";
    if (config.mostrarDigitando && estaDigitando(c.dados, c.outroId)) {
      const d = document.createElement("span");
      d.className = "digitando";
      d.textContent = "digitando...";
      previa.appendChild(d);
    } else {
      if (c.dados.ultimaMensagemRemetenteId === eu.uid && c.dados.ultimaMensagem) {
        const lida = verLeituraDosOutros() && ms(c.dados.lidoEm?.[c.outroId]) >= ms(c.dados.atualizadoEm);
        const chk = document.createElement("span");
        chk.className = "check" + (lida ? " lida" : "");
        chk.appendChild(icone(lida ? "check2" : "check"));
        previa.appendChild(chk);
      }
      const pv = previaLista(c.dados.ultimaMensagem);
      if (pv.ic) { const ic = icone(pv.ic, "i xs pv-ic"); if (pv.cls) ic.classList.add(pv.cls); previa.appendChild(ic); }
      const t = document.createElement("span");
      t.textContent = pv.txt;
      if (pv.cls) t.className = pv.cls;
      previa.appendChild(t);
    }
    l2.appendChild(previa);
    if (c.naoLida) {
      const b = document.createElement("span");
      b.className = "conv-badge";
      const n = contagens.get(c.id)?.n;
      b.textContent = n ? (n > 99 ? "99+" : String(n)) : "";
      if (!n) { b.style.minWidth = "12px"; b.style.height = "12px"; b.style.padding = "0"; }
      b.setAttribute("aria-label", "Mensagens não lidas");
      l2.appendChild(b);
    }
    main.append(l1, l2);
    const etq = modoDe(c) === "negocios" ? notasClientes.get(c.outroId)?.etiquetas : null;
    if (assunto !== "pessoal") {
      // Negócio em 2 linhas (pedido do dono): "Nome ✓ · Delivery" + hora / prévia. O nome do perfil/anúncio fica no title.
      const t = document.createElement("span"); t.className = "conv-tipo-nm"; t.textContent = ASSUNTOS[assunto].nome;
      const tit = String(c.dados.contexto?.titulo || "").trim();
      t.title = tit ? `${ASSUNTOS[assunto].nome} · ${tit}` : ASSUNTOS[assunto].nome;
      nome.appendChild(t);
    }
    if (etq?.length) {
      const meta = document.createElement("div"); meta.className = "conv-meta";
      etq.slice(0, 3).forEach((t) => { const e = document.createElement("span"); e.className = "conv-etq"; e.textContent = t; meta.appendChild(e); });
      main.appendChild(meta);
    }
    const marca = document.createElement("span");
    marca.className = "sel-marca";
    marca.appendChild(icone("check", "i"));
    item.append(marca, avBox, main);
    lista.appendChild(item);
  });
}

function atualizarTitulo() {
  const total = conversas.filter((c) => c.naoLida).length;
  const total2 = conversas.filter((c) => c.naoLida && !restritos.has(c.outroId)).length;
  document.title = (total2 ? `(${total2}) ` : "") + "Mensagens | Help Floripa";
}

async function contarNaoLidas(c) {
  const chave = ms(c.dados.atualizadoEm);
  if (contagens.get(c.id)?.chave === chave) return;
  contagens.set(c.id, { chave, n: 0 });
  try {
    const col = fb.collection(fb.db, "conversas", c.id, "mensagens");
    const a = c.dados.lidoEm?.[eu.uid], b = c.dados.vistoEm?.[eu.uid];
    const lido = a && b ? (ms(a) >= ms(b) ? a : b) : (a || b);
    const q = lido ? fb.query(col, fb.where("criadoEm", ">", lido)) : fb.query(col, fb.where("remetenteId", "==", c.outroId));
    const n = (await fb.getCountFromServer(q)).data().count;
    contagens.set(c.id, { chave, n });
    renderizarLista();
  } catch {}
}

function ouvirConversas() {
  let primeiraCarga = true;
  const q = fb.query(fb.collection(fb.db, "conversas"), fb.where("participantes", "array-contains", eu.uid), fb.limit(300));
  fb.onSnapshot(q, async (snap) => {
    const lista = await Promise.all(snap.docs.map(async (d) => {
      const dados = d.data({ serverTimestamps: "estimate" });
      const outroId = (dados.participantes || []).find((p) => p !== eu.uid) || eu.uid;
      const perfil = await obterPerfil(outroId);
      const naoLida = calcularNaoLida(dados) && !(ativa?.id === d.id && !escondida());
      return { id: d.id, dados, outroId, nome: perfil.nome || "Usuário", nick: perfil.nickname || "", verificado: !!perfil.verificado, foto: perfil.fotoPerfil || "", naoLida };
    }));
    // Fixadas primeiro; depois a mais recente.
    lista.sort((a, b) => (Number(!!b.dados.fixadaPara?.[eu.uid]) - Number(!!a.dados.fixadaPara?.[eu.uid])) || (ms(b.dados.atualizadoEm) - ms(a.dados.atualizadoEm)));

    lista.forEach((c) => {
      const agora = ms(c.dados.atualizadoEm);
      const antes = ultimaAtualizacaoVista.get(c.id);
      const nova = !primeiraCarga && (antes === undefined || agora > antes) && calcularNaoLida(c.dados);
      if (nova && !restritos.has(c.outroId) && !bloqueado(c.outroId) && !c.dados.silenciadaPara?.[eu.uid] && (ativa?.id !== c.id || escondida())) {
        notificar(c.nome, c.dados.ultimaMensagem || "Nova mensagem", () => abrirConversa(c.id));
      }
      ultimaAtualizacaoVista.set(c.id, agora);
      if (c.naoLida) contarNaoLidas(c);
    });

    primeiraCarga = false;
    conversas = lista;
    renderizarLista();
    if (!onlineEm) lerOnline().then(() => renderizarLista());
    atualizarTitulo();
  }, (erro) => {
    console.error("Erro ao carregar conversas:", erro);
    $("listaConversas").innerHTML = "";
    const v = document.createElement("div");
    v.className = "lista-vazia";
    v.textContent = "Não foi possível carregar suas conversas. Verifique sua conexão e as regras do Firestore.";
    $("listaConversas").appendChild(v);
  });
}

// Puxar para atualizar na lista de conversas (como o Instagram): as conversas já chegam ao vivo, então o "puxar" só
// redesenha na hora; de 10 em 10 min ele também traz o nome e a foto de agora de quem está no topo da lista (30, numa
// leitura em lote). Dentro de uma conversa ou com um painel aberto não puxa.
let perfisRenovadosEm = Date.now();
function ligarPuxarConversas() {
  const lista = $("listaConversas");
  ligarPuxar({
    area: lista, rolagem: lista, conteudo: lista,
    topo: () => lista.getBoundingClientRect().top,
    ativo: () => !document.body.classList.contains("chat-aberto") && !document.querySelector(".painel.aberto") && !camadaAberta(),
    aoAtualizar: async () => {
      if (Date.now() - perfisRenovadosEm > 10 * 60000) {
        const ids = [...new Set(conversas.slice(0, 30).map((c) => c.outroId))].filter((u) => u && u !== eu.uid);
        const r = await docsPorIds(fb, "perfis_publicos", ids, 0).catch(() => null);
        if (r) {
          perfisRenovadosEm = Date.now();
          ids.forEach((u) => { const p = r.get(u); if (!p) return; perfis.set(u, Promise.resolve(p)); conversas.filter((c) => c.outroId === u).forEach((c) => { c.nome = p.nome || c.nome; c.nick = p.nickname || ""; c.verificado = !!p.verificado; c.foto = p.fotoPerfil || ""; }); });
        }
      }
      renderizarLista(); atualizarTitulo();
    },
  });
}

// Atualiza "digitando..." na lista sem esperar nova escrita.
setInterval(() => {
  if (conversas.some((c) => c.dados.digitando)) renderizarLista();
}, 3000);

// ======================================================
// Abrir / fechar conversa
// ======================================================
function pararOuvintes() {
  pararMensagens?.(); pararConversa?.(); pararPresenca?.();
  pararMensagens = pararConversa = pararPresenca = null;
  clearTimeout(timerDigitando);
}

async function abrirConversa(id, { historico = true } = {}) {
  if (!id) return;
  if (ativa?.id === id) { document.body.classList.add("chat-aberto"); return; }
  pararOuvintes();
  fecharBuscaChat();
  cancelarResposta();
  removerAnexo();
  fecharPaineis();

  let c = conversas.find((x) => x.id === id);
  if (!c) {
    try {
      const s = await fb.getDoc(refConversa(id));
      if (!s.exists()) { toast("Conversa não encontrada."); return; }
      const dados = s.data();
      if (!(dados.participantes || []).includes(eu.uid)) { toast("Você não participa desta conversa."); return; }
      const outroId = dados.participantes.find((p) => p !== eu.uid) || eu.uid;
      const perfil = await obterPerfil(outroId);
      c = { id, dados, outroId, nome: perfil.nome || "Usuário", foto: perfil.fotoPerfil || "", verificado: !!perfil.verificado };
    } catch (erro) {
      console.error(erro);
      toast("Não foi possível abrir esta conversa.");
      return;
    }
  }

  ativa = { id, outroId: c.outroId, nome: c.nome, foto: c.foto, dados: c.dados };
  // Ligar só numa conversa entre duas pessoas (não com você mesmo).
  $("btnLigar").hidden = $("btnVideo").hidden = !c.outroId || c.outroId === eu.uid;
  // A lista acompanha a conversa aberta (ex.: link de uma conversa de negócio).
  if (!restritos.has(c.outroId) && !conversaArquivada(c)) trocarModo(modoDe(c));
  mensagens = [];
  limparNosConversa();
  limiteMsgs = MSGS_INICIAIS; temMaisMsgs = false; voltarAoPonto = null;
  perfilOutroAtual = {}; // não herda o status da conversa anterior
  $("faixaAtend").classList.remove("aberta");
  primeiraRender = true;
  novasAbaixo = 0;
  $("topNome").textContent = nomeCurto(c.nome); $("topNome").title = c.nome;
  $("topSelo").toggleAttribute("hidden", !c.verificado);
  $("topStatus").textContent = "";
  $("topStatus").className = "";
  pintarAvatar($("topAvatar"), c.foto, c.nome);
  $("chatVazio").hidden = true;
  $("chatPane").hidden = false;
  document.body.classList.add("chat-aberto");
  window.__hfMedirTela?.(); // confere se o campo de mensagem cabe na tela (app instalado)
  const status = document.createElement("div");
  status.className = "msgs-status";
  status.textContent = "Carregando mensagens...";
  $("msgs").replaceChildren(status);
  renderizarLista();

  const url = `mensagens.html?conversa=${encodeURIComponent(id)}`;
  // Vindo de um painel (ex.: Nova conversa), a conversa toma o lugar dele no histórico.
  if (historico && !history.state?.painel) history.pushState({ conversa: id }, "", url);
  else history.replaceState({ conversa: id }, "", url);

  aplicarBloqueio();
  pintarAssuntoTopo();
  carregarCartaoPendente(id);
  ouvirConversaAtiva();
  ouvirPresenca();
  ouvirMensagens();
  if (matchMedia("(min-width: 821px)").matches) $("texto").focus();
}

function fecharConversa({ historico = true } = {}) {
  fecharMenu();
  fecharPainelEmoji();
  pararOuvintes();
  ativa = null;
  document.body.classList.remove("chat-aberto");
  $("chatPane").hidden = true;
  $("chatVazio").hidden = false;
  renderizarLista();
  if (historico) history.pushState({}, "", "mensagens.html");
}

// Botão "voltar" do celular: fecha primeiro o painel aberto (configurações, nova conversa),
// depois a conversa, e só então sai das mensagens.
window.addEventListener("popstate", (e) => {
  // Ajuda e suporte: se há uma janela aberta lá dentro (Novo chamado, Denunciar...), o voltar fecha só ela.
  if (!e.state?.painel && $("painelSuporte").classList.contains("aberto")) {
    let fechouDentro = false;
    try { fechouDentro = !!$("quadroSuporte").contentWindow?.__hfFecharTopo?.(); } catch {}
    if (fechouDentro) { history.pushState({ ...(history.state || {}), painel: "painelSuporte" }, "", location.href); return; }
  }
  if (!e.state?.painel && document.querySelector(".painel.aberto")) fecharPaineis();
  const id = new URLSearchParams(location.search).get("conversa");
  if (id) { if (ativa?.id !== id) abrirConversa(id, { historico: false }); }
  else if (ativa) fecharConversa({ historico: false });
});

// ======================================================
// Bloquear e restringir
// ======================================================
async function carregarPrivacidade() {
  // Da cópia do aparelho na hora e do servidor por trás (rapido.js): a lista não espera a rede.
  const daConta = (u) => {
    restritos = new Set(Array.isArray(u.data()?.restritos) ? u.data().restritos : []);
    ocultasMsg = u.data()?.ocultasMsg && typeof u.data().ocultasMsg === "object" ? u.data().ocultasMsg : {};
    atendimentoPrivado = u.data()?.atendimento || null;
    // Online e confirmação de leitura são da conta (valem em todos os aparelhos).
    const pv = u.data()?.privacidade;
    if (pv) { config.mostrarOnline = pv.mostrarOnline !== false; config.confirmacaoLeitura = pv.confirmacaoLeitura !== false; salvarConfig(); }
  };
  const col = fb.collection(fb.db, "bloqueios");
  const meusDe = (x) => { bloqueios.meus = new Set(x ? x.docs.map((d) => d.data().bloqueadoId) : []); };
  const delesDe = (x) => { bloqueios.deles = new Set(x ? x.docs.map((d) => d.data().bloqueadorId) : []); };
  const depois = () => { aplicarBloqueio(); if (conversas.length) renderizarLista(); };
  const [u, meus, deles] = await Promise.all([
    docRapido(fb, fb.doc(fb.db, "usuarios", eu.uid), (x) => { try { daConta(x); depois(); } catch {} }).catch(() => null),
    docsRapido(fb, fb.query(col, fb.where("bloqueadorId", "==", eu.uid)), "bloq-meus-" + eu.uid, (x) => { meusDe(x); depois(); }).catch(() => null),
    docsRapido(fb, fb.query(col, fb.where("bloqueadoId", "==", eu.uid)), "bloq-deles-" + eu.uid, (x) => { delesDe(x); depois(); }).catch(() => null)
  ]);
  try { if (u) daConta(u); } catch {}
  meusDe(meus); delesDe(deles);
}

function aplicarBloqueio() {
  if (!ativa) return;
  const eu_bloqueei = bloqueios.meus.has(ativa.outroId);
  const fui_bloqueado = bloqueios.deles.has(ativa.outroId);
  // Conta desativada (conta.js): as regras também recusam a mensagem.
  const desativado = (perfilOutroAtual?.desativadaAte?.toMillis?.() ?? 0) > Date.now();
  const travado = eu_bloqueei || fui_bloqueado || desativado;
  $("barraBloqueio").hidden = !travado;
  $("rodapeConversa").hidden = travado;
  $("barraBloqueioTxt").textContent = eu_bloqueei ? "Você bloqueou este contato."
    : desativado ? "Esta pessoa desativou a conta. Você poderá escrever quando ela reativar." : "Não é possível enviar mensagens para este contato.";
  $("barraBloqueioBtn").hidden = !eu_bloqueei;
}

async function alternarBloqueio() {
  if (!ativa) return;
  const uid = ativa.outroId, nome = ativa.nome || "este contato";
  const ref = fb.doc(fb.db, "bloqueios", `${eu.uid}_${uid}`);
  try {
    if (bloqueios.meus.has(uid)) {
      await fb.deleteDoc(ref);
      bloqueios.meus.delete(uid);
      toast(`${nome} desbloqueado`);
    } else {
      if (!(await confirmarHF({ titulo: `Bloquear ${nome}?`, texto: "Vocês deixam de se seguir e ninguém consegue enviar mensagens nesta conversa. A pessoa não é avisada.", ok: "Bloquear", icone: "bloquear" }))) return;
      await fb.setDoc(ref, { bloqueadorId: eu.uid, bloqueadoId: uid, criadoEm: fb.serverTimestamp() });
      await Promise.all([
        fb.deleteDoc(fb.doc(fb.db, "relacoes", `${eu.uid}_${uid}`)).catch(() => {}),
        fb.deleteDoc(fb.doc(fb.db, "relacoes", `${uid}_${eu.uid}`)).catch(() => {})
      ]);
      bloqueios.meus.add(uid);
      toast(`${nome} bloqueado`);
    }
    aplicarBloqueio();
  } catch (e) {
    console.error(e);
    toast("Não foi possível alterar o bloqueio.");
  }
}
$("barraBloqueioBtn").addEventListener("click", alternarBloqueio);

async function alternarRestricao() {
  if (!ativa) return;
  const uid = ativa.outroId, restringir = !restritos.has(uid);
  if (restringir && !(await confirmarHF({ titulo: `Restringir ${ativa.nome || "este contato"}?`, texto: "A conversa vai para \"Restritas\", sem notificações, e a pessoa não vê quando você leu. Ela não é avisada.", ok: "Restringir", icone: "escudo" }))) return;
  try {
    await fb.setDoc(fb.doc(fb.db, "usuarios", eu.uid), { restritos: restringir ? fb.arrayUnion(uid) : fb.arrayRemove(uid) }, { merge: true });
    if (restringir) restritos.add(uid); else restritos.delete(uid);
    toast(restringir ? "Contato restrito" : "Restrição removida");
    renderizarLista();
    atualizarTitulo();
  } catch (e) {
    console.error(e);
    toast("Não foi possível alterar a restrição.");
  }
}

function marcarComoLida() {
  if (!ativa || escondida() || !calcularNaoLida(ativa.dados || {})) return;
  fb.setDoc(refConversa(ativa.id), { [campoLeitura(ativa.outroId)]: { [eu.uid]: fb.serverTimestamp() } }, { merge: true })
    .catch((e) => console.warn("Não foi possível marcar como lida:", e));
}
document.addEventListener("visibilitychange", () => { if (!escondida()) marcarComoLida(); });
// Dentro da gaveta: abrir a gaveta conta como "à vista"; fechada, nada é marcado como lido.
addEventListener("hf:gaveta", () => { if (!escondida()) marcarComoLida(); renderizarLista(); });

function ouvirConversaAtiva() {
  const id = ativa.id;
  pararConversa = fb.onSnapshot(refConversa(id), (s) => {
    if (!ativa || ativa.id !== id || !s.exists()) return;
    ativa.dados = s.data({ serverTimestamps: "estimate" });
    pintarAssuntoTopo();
    if (!s.metadata.hasPendingWrites) marcarComoLida();
    atualizarStatusTopo();
    atualizarChecks();
  }, (e) => console.warn("Conversa indisponível:", e));
}

function ouvirPresenca() {
  const id = ativa.id;
  pararPresenca = fb.onSnapshot(fb.doc(fb.db, "perfis_publicos", ativa.outroId), (s) => {
    if (!ativa || ativa.id !== id) return;
    perfilOutroAtual = s.exists() ? s.data() : {};
    if (perfilOutroAtual.nome) {
      ativa.nome = perfilOutroAtual.nome;
      $("topNome").textContent = nomeCurto(perfilOutroAtual.nome); $("topNome").title = perfilOutroAtual.nome;
      $("topSelo").toggleAttribute("hidden", !perfilOutroAtual.verificado);
      pintarAvatar($("topAvatar"), perfilOutroAtual.fotoPerfil, perfilOutroAtual.nome);
    }
    aplicarBloqueio();
    atualizarStatusTopo();
    pintarAtendimento();
  }, () => {});
}

function atualizarStatusTopo() {
  if (!ativa) return;
  const el = $("topStatus");
  clearTimeout(timerDigitando);
  if (config.mostrarDigitando && estaDigitando(ativa.dados, ativa.outroId)) {
    statusTopo(el, "digitando...", "digitando");
    timerDigitando = setTimeout(atualizarStatusTopo, 2000);
    return;
  }
  if (!config.mostrarOnline) {
    statusTopo(el, "");
    return;
  }
  const ultimo = paraData(perfilOutroAtual.ultimoAcesso);
  if (ultimo && Date.now() - ultimo.getTime() < 9 * MINUTO) {
    statusTopo(el, "online", "online", "online");
    timerDigitando = setTimeout(atualizarStatusTopo, 30000);
  } else {
    statusTopo(el, ultimo ? vistoPorUltimo(ultimo) : "", "", ultimo ? "visto" : "");
    timerDigitando = setTimeout(atualizarStatusTopo, 30000); // "há 4 min" → "há 5 min" e "hoje" → "ontem" sem reabrir
  }
}

// ======================================================
// Mensagens
// ======================================================
// Carrega as últimas mensagens; "Carregar mensagens anteriores" busca mais 200 de cada vez.
const MSGS_INICIAIS = 150;
let limiteMsgs = MSGS_INICIAIS, temMaisMsgs = false, voltarAoPonto = null;
function carregarAnteriores() {
  const caixa = $("msgs");
  voltarAoPonto = caixa.scrollHeight - caixa.scrollTop; // mantém a mesma mensagem na tela
  limiteMsgs += 200;
  pararMensagens?.();
  ouvirMensagens();
}
// Mensagens guardadas no aparelho (cache-msgs.js): aparecem na hora e o servidor só manda o que é novo desde a última
// guardada (com folga de 15 min). Uma vez por dia, ou ao carregar anteriores, a leitura é completa (como antes).
async function ouvirMensagens() {
  const id = ativa.id;
  const dono = eu.uid;
  const guardada = limiteMsgs === MSGS_INICIAIS ? await lerConversa(dono, id, fb.Timestamp) : null;
  if (!ativa || ativa.id !== id) return;
  const apagadaEm0 = ms(ativa.dados?.ocultaPara?.[eu.uid]);
  const filtrar = (lista, apagadaEm) => lista.filter((m) => (!apagadaEm || ms(m.criadoEm) > apagadaEm || m.pendente) && !ocultaParaMim(id, m.id));
  if (guardada && primeiraRender && !mensagens.length) {
    temMaisMsgs = guardada.temMais;
    mensagens = filtrar(guardada.msgs, apagadaEm0);
    if (mensagens.length) renderizarMensagens(false);
  }
  const soNovas = !!guardada && Date.now() - guardada.cheioEm < CHEIO_MS;
  const corte = soNovas ? maisRecente(guardada.msgs) - FOLGA_MS : 0;
  const col = fb.collection(fb.db, "conversas", id, "mensagens");
  const q = soNovas
    ? fb.query(col, fb.where("criadoEm", ">", fb.Timestamp.fromMillis(corte)), fb.orderBy("criadoEm", "asc"))
    : fb.query(col, fb.orderBy("criadoEm", "asc"), fb.limitToLast(limiteMsgs));
  let primeiroDoServidor = true;
  pararMensagens?.();
  pararMensagens = fb.onSnapshot(q, { includeMetadataChanges: true }, (snap) => {
    if (!ativa || ativa.id !== id) return;
    const doServidor = snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }), pendente: d.metadata.hasPendingWrites }));
    const todas = soNovas ? juntar(guardada.msgs, doServidor, corte) : doServidor;
    if (!soNovas) temMaisMsgs = snap.size >= limiteMsgs;
    const antes = voltarAoPonto != null ? Infinity : mensagens.length;
    mensagens = filtrar(todas, ms(ativa.dados?.ocultaPara?.[eu.uid]));
    limparApagadasVencidas(id);
    // a 1ª resposta do servidor traz o que chegou enquanto a conversa estava fechada: sem som
    const chegouDoOutro = !primeiraRender && !primeiroDoServidor && mensagens.length > antes && mensagens[mensagens.length - 1]?.remetenteId !== eu.uid;
    if (!snap.metadata.fromCache) primeiroDoServidor = false;
    renderizarMensagens(chegouDoOutro);
    if (chegouDoOutro && !escondida() && !restritos.has(ativa.outroId) && !ativa.dados?.silenciadaPara?.[eu.uid]) tocarSom();
    marcarComoLida();
    if (!snap.metadata.fromCache && limiteMsgs === MSGS_INICIAIS) guardarConversa(dono, id, todas, { cheio: !soNovas, temMais: temMaisMsgs });
  }, (erro) => {
    console.error("Erro no chat:", erro);
    if (mensagens.length) { toast("Sem conexão: mostrando as mensagens guardadas no aparelho."); return; }
    const s = document.createElement("div");
    s.className = "msgs-status erro";
    s.textContent = "Não foi possível carregar as mensagens desta conversa.";
    limparNosConversa();
    $("msgs").replaceChildren(s);
  });
}

function pertoDoFim() {
  const el = $("msgs");
  return el.scrollHeight - el.scrollTop - el.clientHeight < 160;
}

function irParaFim(suave = false) {
  const el = $("msgs");
  el.scrollTo({ top: el.scrollHeight, behavior: suave ? "smooth" : "auto" });
  novasAbaixo = 0;
  $("irFimQtd").textContent = "";
}

function statusCheck(m) {
  if (m.pendente) return { icone: "relogio", lida: false, rotulo: "Enviando" };
  const lida = verLeituraDosOutros() && ms(ativa?.dados?.lidoEm?.[ativa.outroId]) >= ms(m.criadoEm);
  return lida ? { icone: "check2", lida: true, rotulo: "Lida" } : { icone: "check", lida: false, rotulo: "Enviada" };
}

function atualizarChecks() {
  document.querySelectorAll(".linha-msg.minha").forEach((linha) => {
    const m = mensagens.find((x) => x.id === linha.dataset.id);
    const alvo = linha.querySelector(".meta .check");
    if (!m || !alvo) return;
    const st = statusCheck(m);
    alvo.className = "check" + (st.lida ? " lida" : "");
    alvo.setAttribute("aria-label", st.rotulo);
    alvo.replaceChildren(icone(st.icone));
  });
}

// A conversa é desenhada aos poucos: cada mensagem guarda o seu elemento e só é refeita quando
// muda de verdade. Assim enviar ou receber não recria a tela inteira (o campo de texto não perde
// o foco, o teclado do celular não fecha e os cartões não voltam a "Carregando...").
const nosConversa = new Map(); // chave -> { assinatura, el }
function limparNosConversa() { nosConversa.clear(); }
function noFixo(chave, criar) {
  let n = nosConversa.get(chave);
  if (!n) { n = { el: criar() }; nosConversa.set(chave, n); }
  return n.el;
}
function assinaturaMsg(m, data, primeira) {
  const original = m.resposta?.id ? mensagens.find((x) => x.id === m.resposta.id) : null;
  return JSON.stringify([primeira, hora(data), m.texto || "", m.arquivoUrl || "", m.tipoArquivo || "", m.cartao || null, m.avaliacao || null,
    m.resposta || null, original ? resumoMensagem(original) : "", ativa?.nome || "", ms(m.apagada?.em) || (m.apagada ? 1 : 0), ms(m.editadaEm),
    m.apagada ? noPrazo(m.apagada.em) : 0, m.conferencia ? (m.conferencia.ok ? 1 : 2) : 0, m.apagada ? "" : textoReacoes(m)]);
}
// ---------- reações nas mensagens (como no WhatsApp): reacoes.{uid} = emoji ----------
const REACOES_MSG = ["❤️", "👍", "😂", "😮", "😢", "🙏", "🔥", "👏"];
const reacoesDe = (m) => Object.entries(m?.reacoes && typeof m.reacoes === "object" ? m.reacoes : {}).filter(([, e]) => REACOES_MSG.includes(e));
const textoReacoes = (m) => reacoesDe(m).sort().map((x) => x.join(":")).join(",");
async function reagirMensagem(m, emoji) {
  if (!ativa || m.pendente || m.apagada) return;
  const atual = mensagens.find((x) => x.id === m.id) || m;
  const antes = atual.reacoes ? { ...atual.reacoes } : null;
  const tirar = antes?.[eu.uid] === emoji;
  const novo = { ...(antes || {}) };
  if (tirar) delete novo[eu.uid]; else novo[eu.uid] = emoji;
  atual.reacoes = novo; renderizarMensagens(false);
  if (!tirar) navigator.vibrate?.(10);
  try { await fb.updateDoc(refMsg(m.id), { ["reacoes." + eu.uid]: tirar ? fb.deleteField() : emoji }); }
  catch (e) {
    atual.reacoes = antes; renderizarMensagens(false);
    toast(e?.code === "permission-denied" ? "Reações nas mensagens começam a funcionar quando as regras novas forem publicadas." : "Não foi possível reagir agora.");
  }
}
// Pílula embaixo do balão: os emojis (até 3) e quantos; tocar mostra quem reagiu e tira a sua.
function pilulaReacoes(m) {
  const lista = reacoesDe(m);
  if (!lista.length) return null;
  const b = document.createElement("button");
  b.type = "button"; b.className = "msg-reacoes" + (lista.some(([u]) => u === eu.uid) ? " minha" : "");
  const unicos = [...new Set(lista.map(([, e]) => e))].slice(0, 3);
  b.append(...unicos.map((e) => { const s = document.createElement("span"); s.className = "mr-e"; s.textContent = e; return s; }));
  if (lista.length > 1) { const n = document.createElement("span"); n.className = "mr-n"; n.textContent = String(lista.length); b.appendChild(n); }
  b.setAttribute("aria-label", "Reações: " + lista.map(([u, e]) => `${u === eu.uid ? "você" : (ativa?.nome || "contato")} ${e}`).join(", "));
  b.addEventListener("click", (e) => {
    e.stopPropagation();
    const menu = $("menuMsg"); menu.replaceChildren();
    const r = b.getBoundingClientRect();
    const ops = lista.map(([u, em]) => ({ rotulo: `${em}  ${u === eu.uid ? "Você · toque para tirar" : (ativa?.nome || "Contato")}`, icone: u === eu.uid ? "lixo" : "pessoa", acao: () => { if (u === eu.uid) reagirMensagem(m, em); } }));
    montarMenu(menu, ops, r.left, r.bottom + 4);
  });
  return b;
}

function renderizarMensagens(chegouDoOutro) {
  const caixa = $("msgs");
  const estavaPerto = pertoDoFim();
  const topoAntes = caixa.scrollTop;
  const desejados = [];
  const usados = new Set();
  const usar = (chave, el) => { usados.add(chave); desejados.push(el); return el; };

  usar("fixo:aviso", noFixo("fixo:aviso", () => {
    const aviso = document.createElement("div");
    aviso.className = "aviso-cripto";
    aviso.textContent = "Só você e a outra pessoa conseguem abrir esta conversa no site. As mensagens não têm criptografia de ponta a ponta: não compartilhe senhas, códigos ou dados de cartão.";
    return aviso;
  }));

  if (temMaisMsgs) {
    // Refeito a cada carga de mensagens anteriores (o botão volta ao texto normal).
    const chaveMais = "fixo:mais:" + limiteMsgs;
    usar(chaveMais, noFixo(chaveMais, () => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "msgs-anteriores"; b.textContent = "Carregar mensagens anteriores";
      b.addEventListener("click", () => { b.disabled = true; b.textContent = "Carregando..."; carregarAnteriores(); });
      return b;
    }));
  }

  if (!mensagens.length) {
    usar("fixo:vazio", noFixo("fixo:vazio", () => {
      const s = document.createElement("div");
      s.className = "msgs-status";
      s.textContent = "Nenhuma mensagem ainda. Diga olá!";
      return s;
    }));
  }

  let diaAnterior = null;
  mensagens.forEach((m, i) => {
    const data = paraData(m.criadoEm) || new Date();
    if (!diaAnterior || !mesmoDia(data, diaAnterior)) {
      const chaveDia = `dia:${data.getFullYear()}-${data.getMonth()}-${data.getDate()}`;
      const sep = usar(chaveDia, noFixo(chaveDia, () => { const d = document.createElement("div"); d.className = "dia"; return d; }));
      const rot = rotuloDia(data);
      if (sep.textContent !== rot) sep.textContent = rot;
    }
    const anterior = mensagens[i - 1];
    const agrupada = anterior && diaAnterior && mesmoDia(data, diaAnterior) && anterior.remetenteId === m.remetenteId
      && (data - (paraData(anterior.criadoEm) || data)) < 5 * MINUTO;
    diaAnterior = data;
    const chave = "msg:" + m.id;
    const ass = assinaturaMsg(m, data, !agrupada);
    let n = nosConversa.get(chave);
    if (!n || n.assinatura !== ass) {
      n = { assinatura: ass, el: criarLinhaMensagem(m, data, !agrupada) };
      nosConversa.set(chave, n);
    } else {
      // "Enviando" -> enviada: só troca a marca, sem refazer a mensagem.
      n.el.classList.toggle("pendente", !!m.pendente);
    }
    usar(chave, n.el);
  });

  // Põe cada elemento no lugar, mexendo só no que mudou.
  let atual = caixa.firstChild;
  for (const no of desejados) {
    if (no === atual) { atual = atual.nextSibling; continue; }
    caixa.insertBefore(no, atual);
  }
  while (atual) { const prox = atual.nextSibling; atual.remove(); atual = prox; }
  for (const chave of [...nosConversa.keys()]) if (!usados.has(chave)) nosConversa.delete(chave);
  atualizarChecks();

  if (voltarAoPonto != null) {
    caixa.scrollTop = caixa.scrollHeight - voltarAoPonto;
    voltarAoPonto = null;
  } else if (primeiraRender || estavaPerto || mensagens[mensagens.length - 1]?.remetenteId === eu.uid && mensagens[mensagens.length - 1]?.pendente) {
    irParaFim(false);
  } else {
    caixa.scrollTop = topoAntes;
    if (chegouDoOutro) {
      novasAbaixo++;
      $("irFimQtd").textContent = String(novasAbaixo);
    }
  }
  primeiraRender = false;
  atualizarBotaoFim();
  if (!$("buscaChat").hidden) executarBuscaChat(false);
}

function criarLinhaMensagem(m, data, primeira) {
  const minha = m.remetenteId === eu.uid;
  const linha = document.createElement("div");
  linha.className = `linha-msg ${minha ? "minha" : "outra"}${primeira ? " primeira" : ""}${m.pendente ? " pendente" : ""}`;
  linha.dataset.id = m.id;

  const bolha = document.createElement("div");
  bolha.className = "bolha";
  bolha.tabIndex = 0;

  if (m.apagada) {
    montarApagada(bolha, m, data);
    ligarMenuBolha(bolha, m);
    linha.appendChild(bolha);
    return linha;
  }

  if (m.resposta && (m.resposta.texto || m.resposta.id)) {
    const cit = document.createElement("button");
    cit.type = "button";
    cit.className = "citacao";
    // Mostra a mensagem citada de verdade (quando está carregada), não o texto gravado junto.
    const original = mensagens.find((x) => x.id === m.resposta.id);
    const autorCitado = original ? original.remetenteId : m.resposta.remetenteId;
    const quem = document.createElement("strong");
    quem.textContent = autorCitado === eu.uid ? "Você" : (ativa?.nome || "Contato");
    const txt = document.createElement("span");
    txt.textContent = original ? resumoMensagem(original) : (m.resposta.texto || "Mensagem");
    cit.append(quem, txt);
    cit.addEventListener("click", (e) => { e.stopPropagation(); irParaMensagem(m.resposta.id); });
    bolha.appendChild(cit);
  }

  // Cartão do portfólio (serviço, delivery, loja ou imóvel) que o cliente enviou junto.
  if (m.tipoArquivo === "avaliacao" && m.avaliacao?.pedidoId) {
    bolha.classList.add("cartao-msg", "aval-msg");
    bolha.style.setProperty("--assunto", (ASSUNTOS[m.avaliacao.tipo] || ASSUNTOS.servicos).cor);
    bolha.appendChild(cartaoAvaliacao(m));
  }
  if (m.tipoArquivo === "cartao" && m.cartao?.status) {
    // Atualização de status de um pedido (enviada pelo negócio).
    const c = m.cartao;
    const st = infoStatus(c.tipo, c.status) || ["", "Status atualizado", "relogio"];
    bolha.classList.add("status-msg");
    const l = document.createElement("div"); l.className = "status-linha";
    l.style.setProperty("--cor-st", corStatus(c.status));
    const ic = document.createElement("span"); ic.className = "ic"; ic.appendChild(iconeSvg(st[2]));
    const tx = document.createElement("div");
    const forte = document.createElement("strong"); forte.textContent = `Pedido: ${st[1]}`;
    const sub = document.createElement("small"); sub.textContent = c.titulo || "";
    tx.append(forte, sub);
    l.append(ic, tx);
    bolha.appendChild(l);
    queueMicrotask(() => atualizarStatusNaTela(c.refMsg));
  } else if (m.tipoArquivo === "cartao" && (m.cartao?.tipo === "local" || m.cartao?.tipo === "endereco")) {
    bolha.classList.add("cartao-msg", "local-msg");
    bolha.appendChild(cartaoLocal(m.cartao, m.remetenteId === eu.uid));
  } else if (m.tipoArquivo === "cartao" && m.cartao?.tipo === "chamada") {
    bolha.classList.add("cartao-msg", "chamada-msg");
    bolha.appendChild(cartaoChamada(m.cartao, m.remetenteId === eu.uid));
  } else if (m.tipoArquivo === "cartao" && m.cartao?.tipo === "pix") {
    bolha.classList.add("cartao-msg", "pix-msg");
    bolha.appendChild(cartaoPix(m.cartao, m.remetenteId === eu.uid));
  } else if (m.tipoArquivo === "cartao" && m.cartao?.tipo === "caixa") {
    bolha.classList.add("cartao-msg", "caixa-msg");
    bolha.appendChild(cartaoCaixa(m.cartao, m));
  } else if (m.tipoArquivo === "cartao" && m.cartao?.tipo === "flash") {
    bolha.classList.add("cartao-msg", "flash-msg");
    bolha.appendChild(cartaoFlash(m.cartao, m));
  } else if (m.tipoArquivo === "cartao" && m.cartao?.tipo === "publicacao") {
    // Publicação enviada do Diário: aparece como no Instagram (quem publicou, a foto e a legenda).
    bolha.classList.add("cartao-msg", "pub-msg");
    bolha.appendChild(cartaoPublicacao(m.cartao));
  } else if (m.tipoArquivo === "cartao" && Array.isArray(m.cartao?.pedido?.itens) && m.cartao.pedido.itens.length) {
    // Pedido de delivery ou lojinha: cartão completo, como nos apps de pedido.
    const c = m.cartao;
    const tipo = ASSUNTOS[c.tipo] ? c.tipo : "delivery";
    const href = /^((servicos|delivery|shopping|imoveis|saude|automotivo|comunidade)\.html|usuarios\.html)\?[\w=&%.-]+$/.test(String(c.link || "")) ? c.link : "#";
    bolha.classList.add("cartao-msg", "pedido", "pedido-pro");
    bolha.style.setProperty("--assunto", ASSUNTOS[tipo].cor);
    bolha.appendChild(cartaoPedido(m, c, tipo, href));
  } else if (m.tipoArquivo === "cartao" && m.cartao) {
    const c = m.cartao;
    const tipo = ASSUNTOS[c.tipo] ? c.tipo : "servicos";
    bolha.classList.add("cartao-msg");
    bolha.style.setProperty("--assunto", ASSUNTOS[tipo].cor);
    const ehPedido = Array.isArray(c.pedido?.itens) && c.pedido.itens.length;
    const ehOrc = !!(c.solicitacao && typeof c.solicitacao === "object");
    const href = /^((servicos|delivery|shopping|imoveis|saude|automotivo|comunidade)\.html|usuarios\.html)\?[\w=&%.-]+$/.test(String(c.link || "")) ? c.link : "#";
    // Pedido e orçamento mostram tudo na própria mensagem; só o rodapé leva ao perfil.
    const link = document.createElement(ehPedido || ehOrc ? "div" : "a");
    link.className = "cm-link";
    if (!(ehPedido || ehOrc)) link.href = href;
    const foto = urlSegura(c.foto);
    if (foto) { const ft = document.createElement("div"); ft.className = "cm-ft"; ft.style.backgroundImage = `url("${foto}")`; link.appendChild(ft); }
    const tx = document.createElement("div");
    tx.className = "cm-tx";
    const tp = document.createElement("span"); tp.className = "cm-tipo"; tp.textContent = ASSUNTOS[tipo].nome;
    const ti = document.createElement("strong"); ti.textContent = c.titulo || "";
    tx.append(tp, ti);
    if (c.sub) { const s = document.createElement("small"); s.textContent = c.sub; tx.appendChild(s); }
    if (c.preco && !ehPedido && !ehOrc) { const p = document.createElement("span"); p.className = "cm-preco"; p.textContent = c.preco; tx.appendChild(p); }

    if (ehOrc) { bolha.classList.add("pedido"); tp.textContent = tipo === "saude" ? "Pedido de agendamento" : "Pedido de orçamento"; tx.appendChild(blocoSolicitacao(c.solicitacao)); }
    const ver = document.createElement(ehPedido || ehOrc ? "a" : "span");
    ver.className = "cm-ver";
    if (ehPedido || ehOrc) ver.href = href;
    ver.textContent = ehPedido ? (tipo === "delivery" ? "Ver cardápio" : "Ver loja") : ehOrc ? (tipo === "saude" ? "Ver perfil de saúde" : "Ver perfil de serviços") : tipo === "publicacao" ? "Ver publicação" : tipo === "comunidade" ? "Ver anúncio" : "Ver detalhes";
    link.append(tx, ver);
    bolha.appendChild(link);
    // Quem recebeu o orçamento/agendamento (o negócio) marca como concluído: a conversa ganha o pedido de avaliação.
    if (ehOrc && m.remetenteId !== eu.uid && (tipo === "servicos" || tipo === "saude" || tipo === "automotivo")) {
      const concl = document.createElement("div"); concl.className = "orc-concluir";
      const pintarConcl = () => {
        concl.replaceChildren();
        if (avaliacaoJaPedida(ms(m.criadoEm))) { const ok = document.createElement("span"); ok.className = "orc-ok"; ok.textContent = "✓ Concluído · avaliação pedida ao cliente"; concl.appendChild(ok); return; }
        const b = document.createElement("button"); b.type = "button"; b.className = "orc-bt";
        b.append(icone("estrela", "i s"), document.createTextNode(tipo === "saude" ? "Atendimento concluído · pedir avaliação" : "Serviço concluído · pedir avaliação"));
        b.addEventListener("click", async (e) => {
          e.stopPropagation();
          if (!(await confirmarHF({ titulo: tipo === "saude" ? "Atendimento concluído?" : "Serviço concluído?", texto: "O cliente recebe na conversa o pedido para avaliar. Avaliações reais ajudam o seu perfil a aparecer e a conquistar novos clientes.", ok: "Concluir e pedir avaliação", icone: "check", cor: "normal" }))) return;
          b.disabled = true;
          await avaliacaoAoConcluir(tipo, String(c.titulo || "").slice(0, 120), ms(m.criadoEm));
          pintarConcl();
        });
        concl.appendChild(b);
      };
      pintarConcl();
      bolha.appendChild(concl);
    }
  }

  const url = m.tipoArquivo === "cartao" ? "" : urlSegura(m.arquivoUrl);
  if (url) {
    bolha.classList.add("midia");
    if (!m.texto) bolha.classList.add("so-midia");
    if (m.tipoArquivo === "video") {
      const v = document.createElement("video");
      v.src = url; v.controls = true; v.playsInline = true; v.preload = "metadata";
      bolha.appendChild(v);
    } else if (m.tipoArquivo === "audio") {
      bolha.appendChild(criarAudioMsg(m, url));
      bolha.classList.remove("so-midia");
      if (!m.texto) bolha.classList.add("so-audio");
    } else if (ehFigurinha(m)) {
      // Figurinha: sem balão, como no WhatsApp; tocar mostra e deixa guardar nas suas
      bolha.classList.add("figurinha-msg"); bolha.classList.remove("midia", "so-midia");
      const img = document.createElement("img");
      img.className = "figurinha"; img.decoding = "async"; img.loading = "lazy";
      img.src = url; img.alt = "Figurinha"; img.dataset.semSuave = "1";
      img.addEventListener("click", (e) => { e.stopPropagation(); abrirFigurinhaRecebida(url, minha); });
      bolha.appendChild(img);
    } else {
      const img = document.createElement("img");
      img.className = "foto";
      img.loading = "lazy"; img.decoding = "async";
      img.src = url;
      img.alt = "Foto enviada";
      img.loading = "lazy";
      img.addEventListener("click", (e) => { e.stopPropagation(); abrirVisualizador(url); });
      bolha.appendChild(img);
    }
  }

  // Localização mandada como texto (versão anterior): vira o cartão com mapa.
  const locTexto = !m.tipoArquivo && /^📍 Minha localização: https:\/\/maps\.google\.com\/\?q=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)$/.exec(m.texto || "");
  if (locTexto) {
    bolha.classList.add("cartao-msg", "local-msg");
    bolha.appendChild(cartaoLocal({ tipo: "local", lat: Number(locTexto[1]), lng: Number(locTexto[2]) }, m.remetenteId === eu.uid));
  } else if (m.texto) {
    const nEmo = !m.tipoArquivo && !m.resposta ? soEmojis(m.texto) : 0;
    if (nEmo) bolha.classList.add("so-emoji", "e" + nEmo);
    const t = document.createElement("div");
    t.className = "texto";
    t.appendChild(textoComLinks(m.texto));
    bolha.appendChild(t);
  }

  const meta = document.createElement("span");
  meta.className = "meta";
  if (m.editadaEm) {
    const ed = document.createElement("button");
    ed.type = "button"; ed.className = "editada"; ed.textContent = "editada";
    ed.title = "Ver o que foi editado"; ed.setAttribute("aria-label", "Mensagem editada: ver a original");
    ed.addEventListener("click", (e) => { e.stopPropagation(); const a = mensagens.find((x) => x.id === m.id) || m; verEdicoesHF({ atual: a.texto || "", editadaEm: a.editadaEm, edicoes: a.edicoes }); });
    meta.appendChild(ed);
  }
  meta.appendChild(document.createTextNode(hora(data)));
  if (minha) {
    const st = statusCheck(m);
    const chk = document.createElement("span");
    chk.className = "check" + (st.lida ? " lida" : "");
    chk.setAttribute("aria-label", st.rotulo);
    chk.appendChild(icone(st.icone));
    meta.appendChild(chk);
  }
  if (m.texto && bolha.querySelector(".texto")) bolha.querySelector(".texto").appendChild(meta);
  else bolha.appendChild(meta);

  ligarMenuBolha(bolha, m);
  linha.appendChild(bolha);
  const pr = pilulaReacoes(m);
  if (pr) { linha.classList.add("com-reacao"); linha.appendChild(pr); }
  // Toque duplo no balão = ❤️ (de novo tira), como no Instagram.
  bolha.addEventListener("dblclick", (e) => { if (e.target.closest("a, button, audio, video, input")) return; e.preventDefault(); window.getSelection?.()?.removeAllRanges?.(); reagirMensagem(mensagens.find((x) => x.id === m.id) || m, "❤️"); });
  return linha;
}

// "Fulano apagou esta mensagem · 14:32" no lugar da mensagem (+ "Ver mensagem apagada" por 24 h).
function montarApagada(bolha, m, data) {
  bolha.classList.add("apagada");
  const quem = m.apagada.por === eu.uid ? "Você" : (String(ativa?.nome || "Contato").trim().split(/\s+/)[0]);
  const t = document.createElement("div");
  t.className = "texto";
  const tx = document.createElement("span");
  tx.textContent = `${quem} apagou esta mensagem · ${horaCurta(m.apagada.em)}`;
  t.append(icone("lixo"), tx);
  bolha.appendChild(t);
  if (noPrazo(m.apagada.em)) {
    const ver = document.createElement("button");
    ver.type = "button"; ver.className = "ver-apagada";
    ver.append(icone("olho"), document.createTextNode("Ver mensagem apagada"));
    ver.title = `Dá para abrir por mais ${tempoRestante(m.apagada.em)}`;
    ver.addEventListener("click", (e) => { e.stopPropagation(); verApagada(m); });
    bolha.appendChild(ver);
  }
  const meta = document.createElement("span");
  meta.className = "meta";
  meta.textContent = `enviada ${hora(data)}`;
  bolha.appendChild(meta);
}

function ligarMenuBolha(bolha, m) {
  // O elemento é reaproveitado entre atualizações: o menu usa sempre a versão atual da mensagem
  // (ex.: depois de "Enviando", já aparece "Apagar").
  const msgAtual = () => mensagens.find((x) => x.id === m.id) || m;
  const btnOp = document.createElement("button");
  btnOp.type = "button";
  btnOp.className = "btn-opcoes";
  btnOp.setAttribute("aria-label", "Opções da mensagem");
  btnOp.appendChild(icone("seta-baixo"));
  btnOp.addEventListener("click", (e) => {
    e.stopPropagation();
    const r = btnOp.getBoundingClientRect();
    abrirMenuMensagem(msgAtual(), r.left, r.bottom + 4);
  });
  bolha.appendChild(btnOp);

  bolha.addEventListener("contextmenu", (e) => { e.preventDefault(); abrirMenuMensagem(msgAtual(), e.clientX, e.clientY); });
  bolha.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === "ContextMenu") {
      e.preventDefault();
      const r = bolha.getBoundingClientRect();
      abrirMenuMensagem(msgAtual(), r.left + 10, r.bottom);
    }
  });
  // Toque longo no celular abre o menu.
  let timerToque = null;
  bolha.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    timerToque = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(15);
      abrirMenuMensagem(msgAtual(), t.clientX, t.clientY);
    }, 480);
  }, { passive: true });
  ["touchend", "touchmove", "touchcancel"].forEach((ev) => bolha.addEventListener(ev, () => clearTimeout(timerToque), { passive: true }));
  ligarDeslizarResponder(bolha, msgAtual);
}

// Deslizar o balão para a direita responde a mensagem (como no WhatsApp). O balão acompanha o dedo com
// resistência, o ícone de responder aparece atrás e cresce; passou de LIMITE_RESP vibra uma vez e, ao soltar,
// abre a resposta. Só no toque; o gesto só "pega" se o dedo andar mais para o lado do que para cima/baixo
// (rolar a conversa continua igual). Balão com touch-action: pan-y para o navegador não roubar o gesto.
const LIMITE_RESP = 58;
function ligarDeslizarResponder(bolha, msgAtual) {
  const linha = () => bolha.closest(".linha-msg");
  let x0 = 0, y0 = 0, dx = 0, estado = "", passou = false, ic = null;
  const soltar = (responde) => {
    if (estado === "lado") {
      bolha.style.transition = "transform .22s cubic-bezier(.2,.8,.2,1)";
      bolha.style.transform = "";
      if (ic) { ic.style.transition = "opacity .18s, transform .18s"; ic.style.opacity = "0"; ic.style.transform = "translateY(-50%) scale(.4)"; }
      const i = ic; setTimeout(() => { i?.remove(); bolha.style.transition = ""; }, 240);
      linha()?.classList.remove("deslizando");
      if (responde && passou) { const m = msgAtual(); if (m && !m.apagada) responder(m); }
    }
    estado = ""; ic = null; passou = false; dx = 0;
  };
  bolha.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1 || bolha.classList.contains("apagada") || msgAtual()?.pendente) { estado = "nao"; return; }
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; estado = "?"; dx = 0; passou = false;
  }, { passive: true });
  bolha.addEventListener("touchmove", (e) => {
    if (!estado || estado === "nao" || estado === "vertical") return;
    const t = e.touches[0], mx = t.clientX - x0, my = t.clientY - y0;
    if (estado === "?") {
      if (Math.abs(mx) < 10 && Math.abs(my) < 10) return;
      if (mx > 0 && Math.abs(mx) > Math.abs(my) * 1.4) {
        estado = "lado";
        ic = document.createElement("span");
        ic.className = "desliza-resp"; ic.setAttribute("aria-hidden", "true");
        ic.appendChild(icone("responder"));
        linha()?.classList.add("deslizando");
        linha()?.prepend(ic);
        bolha.style.transition = "";
      } else { estado = "vertical"; return; }
    }
    // resistência: anda igual ao dedo até o limite e depois cada vez menos (máximo ~96 px)
    const d = Math.max(0, mx);
    dx = d <= LIMITE_RESP ? d : LIMITE_RESP + Math.min(38, (d - LIMITE_RESP) * 0.35);
    bolha.style.transform = `translateX(${dx}px)`;
    const f = Math.min(1, dx / LIMITE_RESP);
    if (ic) { ic.style.opacity = String(f); ic.style.transform = `translateY(-50%) scale(${0.4 + f * 0.6})`; ic.classList.toggle("pronto", f >= 1); }
    if (f >= 1 && !passou) { passou = true; if (navigator.vibrate && navigator.userActivation?.hasBeenActive !== false) navigator.vibrate(12); }
    else if (f < 1 && passou) passou = false;
  }, { passive: true });
  bolha.addEventListener("touchend", () => soltar(true), { passive: true });
  bolha.addEventListener("touchcancel", () => soltar(false), { passive: true });
}

function irParaMensagem(id) {
  const linha = id && document.querySelector(`.linha-msg[data-id="${CSS.escape(id)}"]`);
  if (!linha) { toast("Essa mensagem não está mais disponível."); return; }
  linha.scrollIntoView({ behavior: "smooth", block: "center" });
  const b = linha.querySelector(".bolha");
  b.classList.remove("destaque");
  void b.offsetWidth;
  b.classList.add("destaque");
}

function atualizarBotaoFim() {
  $("irFim").hidden = pertoDoFim();
  if (pertoDoFim()) { novasAbaixo = 0; $("irFimQtd").textContent = ""; }
}
$("msgs").addEventListener("scroll", atualizarBotaoFim, { passive: true });
// Etiqueta do dia durante a rolagem: mostra o dia das mensagens do topo da tela e some 1,2 s depois.
let timerDiaFlutuante = null, ultimoTopoMsgs = 0;
$("msgs").addEventListener("scroll", () => {
  const caixa = $("msgs"), chip = $("diaFlutuante");
  const topo = caixa.scrollTop;
  const mexeu = Math.abs(topo - ultimoTopoMsgs) > 2;
  ultimoTopoMsgs = topo;
  if (!mexeu) return;
  let dia = null;
  for (const d of caixa.querySelectorAll(".dia")) { if (d.offsetTop - 6 <= topo) dia = d; else break; }
  clearTimeout(timerDiaFlutuante);
  if (!dia) { chip.classList.remove("on"); return; }
  chip.textContent = dia.textContent;
  chip.style.top = (caixa.offsetTop + 8) + "px";
  chip.classList.add("on");
  timerDiaFlutuante = setTimeout(() => chip.classList.remove("on"), 1200);
}, { passive: true });
$("irFim").addEventListener("click", () => irParaFim(true));

// ======================================================
// Menu da mensagem
// ======================================================
function fecharMenu() { $("menuMsg").hidden = true; }
// O menu (⋮ da conversa, segurar mensagem...) vira "janela aberta" para o voltar.js: o voltar do celular fecha só o
// menu, como no WhatsApp (antes voltava para a lista com o menu ainda aberto por cima). A classe acompanha o hidden.
new MutationObserver(() => $("menuMsg").classList.toggle("aberto", !$("menuMsg").hidden))
  .observe($("menuMsg"), { attributes: true, attributeFilter: ["hidden"] });

function abrirMenuMensagem(m, x, y) {
  const menu = $("menuMsg");
  menu.replaceChildren();
  const fixadaAqui = ativa?.dados?.mensagemFixada?.id === m.id;
  const minha = m.remetenteId === eu.uid;
  if (m.apagada) {
    // Apagada para todos: abrir o conteúdo (24 h) e tirar o aviso só da minha tela.
    const ops = [];
    if (noPrazo(m.apagada.em)) ops.push({ rotulo: "Ver mensagem apagada", icone: "olho", acao: () => verApagada(m) });
    ops.push({ rotulo: "Apagar para mim", icone: "lixo", perigo: true, acao: () => perguntarApagar(m) });
    return montarMenu(menu, ops, x, y);
  }
  // Reações rápidas em cima do menu (a sua fica marcada; tocar de novo tira).
  if (!m.pendente) {
    const barra = document.createElement("div"); barra.className = "menu-reacoes"; barra.setAttribute("role", "group"); barra.setAttribute("aria-label", "Reagir");
    const minhaR = m.reacoes?.[eu.uid];
    REACOES_MSG.forEach((e, k) => {
      const b = document.createElement("button"); b.type = "button"; b.textContent = e; b.style.setProperty("--k", k);
      if (minhaR === e) b.className = "eu";
      b.setAttribute("aria-label", (minhaR === e ? "Tirar a reação " : "Reagir com ") + e);
      b.addEventListener("click", (ev) => { ev.stopPropagation(); fecharMenu(); reagirMensagem(m, e); });
      barra.appendChild(b);
    });
    menu.appendChild(barra);
  }
  const opcoes = [
    { rotulo: "Responder", icone: "responder", acao: () => responder(m) },
    !m.pendente && { rotulo: fixadaAqui ? "Desafixar" : "Fixar no topo", icone: "pin", acao: () => fixarMensagem(fixadaAqui ? null : m) },
  ].filter(Boolean);
  if (m.texto) opcoes.push({ rotulo: "Copiar texto", icone: "copiar", acao: () => copiar(m.texto) });
  if (m.tipoArquivo === "imagem" && urlSegura(m.arquivoUrl)) opcoes.push({ rotulo: "Ver foto", icone: "imagem", acao: () => abrirVisualizador(m.arquivoUrl) });
  if (minha && !m.pendente && podeEditar(m) && podeMexer(m.criadoEm)) opcoes.push({ rotulo: "Editar", icone: "lapis", acao: () => editarMensagem(m) });
  if (m.editadaEm && Array.isArray(m.edicoes) && m.edicoes.length) opcoes.push({ rotulo: "Ver original", icone: "relogio", acao: () => verEdicoesHF({ atual: m.texto || "", editadaEm: m.editadaEm, edicoes: m.edicoes }) });
  if (!m.pendente) opcoes.push({ rotulo: "Apagar", icone: "lixo", perigo: true, acao: () => perguntarApagar(m) });
  if (!minha) opcoes.push({ rotulo: "Denunciar", icone: "alerta", perigo: true, acao: () => denunciarMensagem(m) });
  montarMenu(menu, opcoes, x, y);
}
function montarMenu(menu, opcoes, x, y) {
  opcoes.forEach((op) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "menuitem");
    if (op.perigo) b.className = "perigo";
    b.append(icone(op.icone, "i"), document.createTextNode(op.rotulo));
    b.addEventListener("click", () => { fecharMenu(); op.acao(); });
    menu.appendChild(b);
  });
  menu.hidden = false;
  const r = menu.getBoundingClientRect();
  menu.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + "px";
  menu.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + "px";
  menu.querySelector("button")?.focus();
}

// Denunciar uma mensagem recebida (a pessoa não é avisada).
async function denunciarMensagem(m) {
  if (!ativa) return;
  const { abrirDenuncia } = await import("./denuncias.js?v=7");
  const outro = ativa.outroId;
  // Contexto para a equipe: até 5 mensagens antes e 5 depois (só os ids; o painel lê do servidor).
  const salvas = mensagens.filter((x) => !x.pendente);
  const i = salvas.findIndex((x) => x.id === m.id);
  const contexto = i < 0 ? [] : salvas.slice(Math.max(0, i - 5), i + 6).map((x) => x.id).filter((id) => id !== m.id);
  abrirDenuncia({ fb, eu, tipo: "mensagem", alvoId: m.remetenteId, itemId: m.id, conversaId: ativa.id, trecho: resumoMensagem(m), contexto, nomeAlvo: ativa.nome || "",
    podeBloquear: !bloqueios.meus.has(outro), aoBloquear: () => { if (!bloqueios.meus.has(outro)) return alternarBloqueio(); } });
}

// Etiqueta colorida do assunto no topo do chat
// Mensagem fixada no topo da conversa (endereço, combinado...). Qualquer um dos dois fixa ou tira.
async function fixarMensagem(m) {
  if (!ativa) return;
  try {
    await fb.setDoc(refConversa(ativa.id), { mensagemFixada: m ? { id: m.id, texto: resumoMensagem(m).slice(0, 200), por: eu.uid, em: fb.serverTimestamp() } : null }, { merge: true });
    toast(m ? "Mensagem fixada no topo" : "Mensagem desafixada");
  } catch (e) { console.error(e); toast("Não foi possível fixar agora."); }
}
function pintarFixada() {
  const f = ativa?.dados?.mensagemFixada;
  $("faixaFixada").hidden = !f?.id;
  if (f?.id) $("fixadaTexto").textContent = f.texto || "Mensagem";
}
$("faixaFixada").addEventListener("click", (e) => {
  if (e.target.closest("#fixadaTirar")) { fixarMensagem(null); return; }
  const id = ativa?.dados?.mensagemFixada?.id;
  if (id) irParaMensagem(id);
});

// Atendimento do negócio: horário de cada dia, pausa de almoço, ausência (com data de volta) e
// tempo médio de resposta. Aparece no topo de TODAS as conversas com quem tem negócio (inclusive
// de quem tem vínculo no Social); o tempo de resposta, só nas conversas de negócio.
// atendimento.semana: 7 textos "HH:MM-HH:MM" ou "" (domingo a sábado). Perfis antigos só têm
// atendimento.horario { dias, inicio, fim }: vale o mesmo horário nos dias marcados.
const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const DIAS_LONGOS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const hm = (t) => { const [h, m] = String(t || "").split(":").map(Number); return (h || 0) * 60 + (m || 0); };
const horaTxt = (t) => { const [h, m] = String(t || "").split(":"); return `${Number(h)}h${m && m !== "00" ? m : ""}`; };
const FAIXA_RE = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/;
const faixa = (txt) => (FAIXA_RE.test(String(txt || "")) ? { ini: txt.slice(0, 5), fim: txt.slice(6) } : null);
function semanaDe(a) {
  const h = a?.horario;
  if (Array.isArray(a?.semana) && a.semana.length === 7) {
    const s = a.semana.map(faixa);
    // Um aparelho com o site antigo grava só o resumo: se os dias não batem, o resumo é o mais novo.
    const abertos = s.map((f, i) => (f ? i : null)).filter((x) => x != null).join();
    if (s.some(Boolean) && (!h?.dias?.length || [...h.dias].map(Number).sort().join() === abertos)) return s;
    if (!h?.dias?.length) return null;
  }
  if (!h?.dias?.length || !h.inicio || !h.fim) return null;
  const dias = h.dias.map(Number);
  return Array.from({ length: 7 }, (_, i) => (dias.includes(i) ? { ini: h.inicio, fim: h.fim } : null));
}
// Ausente vale até a data de volta (no dia da volta o aviso sai sozinho).
const ausenteAgora = (a) => !!a?.ausente && !(ms(a.volta) && ms(a.volta) <= Date.now());
const dataVoltaTxt = (t) => {
  const d = new Date(ms(t)), hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const dias = Math.round((new Date(d).setHours(0, 0, 0, 0) - hoje) / 864e5);
  return dias === 1 ? "amanhã" : `${DIAS_CURTOS[d.getDay()]}, ${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;
};
function resumoSemana(sem, almoco) {
  const grupos = [];
  [1, 2, 3, 4, 5, 6, 0].forEach((d) => {
    const f = sem[d], k = f ? `${f.ini}-${f.fim}` : "";
    const ult = grupos[grupos.length - 1];
    if (ult && ult.k === k) ult.dias.push(d); else grupos.push({ k, f, dias: [d] });
  });
  const partes = grupos.filter((g) => g.f).map((g) => `${g.dias.length > 2 ? `${DIAS_CURTOS[g.dias[0]]} a ${DIAS_CURTOS[g.dias[g.dias.length - 1]]}` : g.dias.map((x) => DIAS_CURTOS[x]).join(" e ")} ${horaTxt(g.f.ini)}–${horaTxt(g.f.fim)}`);
  const al = faixa(almoco);
  if (al) partes.push(`almoço ${horaTxt(al.ini)}–${horaTxt(al.fim)}`);
  return partes.join(", ");
}
function situacaoHorario(sem, almoco, agora = new Date()) {
  const min = agora.getHours() * 60 + agora.getMinutes();
  const hoje = sem[agora.getDay()], al = faixa(almoco);
  if (hoje && min >= hm(hoje.ini) && min < hm(hoje.fim)) {
    if (al && min >= hm(al.ini) && min < hm(al.fim)) return { cls: "almoco", txt: `Pausa para almoço · volta às ${horaTxt(al.fim)}` };
    return { cls: "aberto", txt: `Atendendo agora · até ${horaTxt(hoje.fim)}` };
  }
  for (let i = 0; i < 8; i++) {
    const d = new Date(agora); d.setDate(agora.getDate() + i);
    const f = sem[d.getDay()];
    if (!f || (i === 0 && min >= hm(f.ini))) continue;
    const quando = i === 0 ? "hoje" : i === 1 ? "amanhã" : DIAS_CURTOS[d.getDay()];
    return { cls: "fechado", txt: `Fora do horário · volta ${quando} às ${horaTxt(f.ini)}` };
  }
  return { cls: "fechado", txt: "Fora do horário" };
}
const tempoTxt = (min) => (min < 1 ? "menos de 1 min" : min < 60 ? `~${Math.round(min)} min` : min < 1440 ? `~${Math.round(min / 60)} h` : "~1 dia");
function pintarAtendimento() {
  const box = $("faixaAtend");
  const a = perfilOutroAtual?.atendimento;
  if (!ativa || !a) { box.hidden = true; return; }
  const deNegocio = assuntoDe(ativa.dados) !== "pessoal";
  box.replaceChildren();
  const add = (cls, txt, forte) => {
    if (box.children.length) { const sp = document.createElement("span"); sp.className = "sep" + (cls === "aus" ? " aus-sep" : ""); sp.textContent = "·"; box.appendChild(sp); }
    const s = document.createElement("span");
    if (cls && cls !== "aus") { const p = document.createElement("i"); p.className = "ponto " + cls; s.appendChild(p); }
    if (cls === "aus") s.className = "aus";
    if (forte) { const b = document.createElement("b"); b.textContent = forte; s.append(b, txt ? " " : ""); }
    s.append(txt); box.appendChild(s); return s;
  };
  // Faixa compacta (pedido do dono, 09/11/2026: não poluir a conversa): só a situação de agora numa pílula;
  // horário da semana, tempo de resposta e recado ficam na gaveta (tocar).
  const ausente = ausenteAgora(a), sem = semanaDe(a);
  const respOutro = respostaDoPerfil(perfilOutroAtual);
  if (ausente) add("ausente", ms(a.volta) ? `volta ${dataVoltaTxt(a.volta)}` : "", ms(a.volta) ? "Ausente ·" : "Ausente no momento");
  else if (sem) { const st = situacaoHorario(sem, a.almoco, relogioDe(ufDe(perfilOutroAtual))); add(st.cls, "", st.txt); }
  else if (deNegocio && respOutro) add("aberto", `em ${tempoTxt(respOutro.media)}`, "Costuma responder");
  box.hidden = !box.children.length;
  // A faixa é um resumo de uma linha; tocar abre a gaveta com tudo organizado.
  box.setAttribute("role", "button"); box.tabIndex = 0; box.setAttribute("aria-label", "Ver o atendimento: " + box.textContent);
}
function alternarFaixaAtend(e) {
  if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
  e.preventDefault();
  abrirGavetaAtendimento();
}
$("faixaAtend").addEventListener("click", alternarFaixaAtend);
$("faixaAtend").addEventListener("keydown", alternarFaixaAtend);

// ---------- gavetas do chat (atendimento e prévia do perfil) ----------
// Sobem de baixo, por cima da conversa. O "voltar" do celular fecha (voltar.js: .pv-fundo).
const usar = (n, cls = "i s") => { const sv = document.createElementNS("http://www.w3.org/2000/svg", "svg"); sv.setAttribute("class", cls); const u = document.createElementNS("http://www.w3.org/2000/svg", "use"); u.setAttribute("href", "#i-" + n); sv.appendChild(u); return sv; };
const elm = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
function abrirGaveta(titulo) {
  document.querySelector(".pv-fundo")?._fechar?.();
  const fundo = elm("div", "pv-fundo");
  const g = elm("div", "pv-gaveta"); g.setAttribute("role", "dialog"); g.setAttribute("aria-modal", "true"); g.setAttribute("aria-label", titulo); g.tabIndex = -1;
  const cab = elm("div", "pv-cab"); const x = elm("button", "pv-x"); x.type = "button"; x.setAttribute("aria-label", "Fechar"); x.appendChild(usar("fechar"));
  cab.append(elm("strong", null, titulo), x);
  const corpo = elm("div", "pv-corpo");
  g.append(cab, corpo); fundo.appendChild(g);
  const fechar = () => { if (!fundo.isConnected || fundo._saindo) return; fundo._saindo = true; fundo.dataset.semVoltar = ""; fundo.classList.remove("on"); setTimeout(() => fundo.remove(), 250); };
  fundo._fechar = fechar;
  x.addEventListener("click", fechar);
  fundo.addEventListener("click", (e) => { if (e.target === fundo) fechar(); });
  fundo.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); fechar(); } });
  // Arrastar a gaveta para baixo (pelo topo) fecha.
  let y0 = null;
  cab.addEventListener("touchstart", (e) => { y0 = e.touches[0].clientY; }, { passive: true });
  cab.addEventListener("touchend", (e) => { if (y0 != null && e.changedTouches[0].clientY - y0 > 60) fechar(); y0 = null; }, { passive: true });
  document.body.appendChild(fundo);
  requestAnimationFrame(() => { fundo.classList.add("on"); g.focus({ preventScroll: true }); });
  return { corpo, fechar };
}
function abrirGavetaAtendimento() {
  const a = perfilOutroAtual?.atendimento;
  if (!ativa || !a) return;
  const { corpo, fechar } = abrirGaveta("Atendimento");
  const ausente = ausenteAgora(a), sem = semanaDe(a);
  const st = ausente ? { cls: "ausente", txt: "Ausente no momento", sub: ms(a.volta) ? `Volta ${dataVoltaTxt(a.volta)}` : "Sem data de volta" }
    : sem ? { ...situacaoHorario(sem, a.almoco, relogioDe(ufDe(perfilOutroAtual))) } : { cls: "fechado", txt: "Sem horário definido" };
  const box = elm("div", "pv-status " + st.cls);
  const pt = elm("span", "pt"); pt.appendChild(usar(st.cls === "aberto" ? "check" : st.cls === "fechado" ? "relogio" : "relogio", "i"));
  const tx = elm("div", "tx"); tx.append(elm("b", null, st.txt.split(" · ")[0]));
  const sub = st.sub || st.txt.split(" · ").slice(1).join(" · ");
  if (sub) tx.appendChild(elm("small", null, maiusc(sub)));
  box.append(pt, tx);
  corpo.appendChild(box);
  if (ausente && a.mensagem) { const av = elm("div", "pv-aviso"); av.append(elm("small", null, "Aviso"), document.createTextNode(String(a.mensagem).slice(0, 200))); corpo.appendChild(av); }
  if (sem) {
    const sec = elm("div", "pv-sec"); sec.appendChild(elm("h4", null, "Horário de atendimento"));
    const dias = elm("div", "pv-dias");
    const hoje = new Date().getDay();
    [1, 2, 3, 4, 5, 6, 0].forEach((d) => {
      const f = sem[d];
      const l = elm("div", "pv-dia" + (f ? "" : " fech") + (d === hoje ? " hoje" : ""));
      l.append(elm("span", null, DIAS_LONGOS[d]), elm("span", null, f ? `${horaTxt(f.ini)} às ${horaTxt(f.fim)}` : "Fechado"));
      dias.appendChild(l);
    });
    sec.appendChild(dias);
    const al = faixa(a.almoco);
    if (al) { const i = elm("div", "pv-info"); i.append(usar("relogio"), document.createTextNode(`Pausa para almoço das ${horaTxt(al.ini)} às ${horaTxt(al.fim)}`)); sec.appendChild(i); }
    corpo.appendChild(sec);
  }
  const respPv = respostaDoPerfil(perfilOutroAtual);
  if (respPv) { const i = elm("div", "pv-info"); i.append(usar("chat"), document.createTextNode(`Costuma responder em ${tempoTxt(respPv.media)}`)); corpo.appendChild(i); }
  const ver = elm("button", "pv-btn"); ver.type = "button"; ver.append(usar("pessoa"), document.createTextNode("Ver perfil e negócios"));
  ver.addEventListener("click", () => { fechar(); setTimeout(abrirPreviaPerfil, 260); });
  corpo.appendChild(ver);
}
const maiusc = (t) => String(t).charAt(0).toUpperCase() + String(t).slice(1);

// Prévia do perfil (tocar e SEGURAR o nome no topo): foto, nome, bio e os negócios da pessoa.
// Tocar num negócio abre o perfil dele aqui mesmo (cardápio, loja, pedir orçamento); o pedido
// volta para esta conversa como cartão, sem sair do chat.
let vitrineMod = null;
function carregarVitrine() {
  if (!document.querySelector("link[data-vitrine]")) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "vitrine.css?v=44"; l.dataset.vitrine = ""; document.head.appendChild(l); }
  return (vitrineMod ||= import("./vitrine.js?v=94"));
}
function usarCartaoNaConversa(uid, cartao) {
  document.querySelectorAll(".vt-modal").forEach((m) => m.remove());
  document.querySelector(".pv-fundo")?._fechar?.();
  if (!ativa || uid !== ativa.outroId) return;
  cartaoPendente = cartao;
  try { sessionStorage.setItem("hf-cartao-pendente", JSON.stringify({ conversaId: ativa.id, cartao })); } catch {}
  pintarCartaoPendente();
  setTimeout(() => $("texto")?.focus({ preventScroll: true }), 300);
  toast("Pronto: é só enviar.");
}
async function abrirPreviaPerfil() {
  if (!ativa || ativa.equipe) return;
  const uid = ativa.outroId;
  try { window.getSelection()?.removeAllRanges(); } catch {}
  const { corpo, fechar } = abrirGaveta("Perfil");
  const p = perfilOutroAtual || (await obterPerfil(uid)) || {};
  const topo = elm("div", "pv-perfil");
  const av = elm("div", "avatar"); pintarAvatar(av, p.fotoPerfil, p.nome || ativa.nome);
  const h = elm("h3", null, p.nome || ativa.nome || "Usuário");
  if (p.verificado) { const sv = usar("selo"); sv.setAttribute("aria-label", "Perfil verificado"); h.appendChild(sv); }
  topo.append(av, h);
  // @ e cidade numa linha só, cada um no seu "chip" (o @ ficava solto e parecia quebrado).
  const linhaId = elm("div", "pv-id");
  if (p.nickname) { const a = elm("span", "pv-chip"); a.append(elm("b", null, "@"), document.createTextNode(String(p.nickname).replace(/^@/, ""))); linhaId.appendChild(a); }
  if (p.cidade) { const c = elm("span", "pv-chip"); c.append(usar("local"), document.createTextNode(String(p.cidade).split("/")[0].trim())); linhaId.appendChild(c); }
  if (linhaId.children.length) topo.appendChild(linhaId);
  if (p.verificado) { const v = elm("span", "pv-verif"); v.append(usar("selo"), document.createTextNode("Perfil verificado")); topo.appendChild(v); }
  const notaGeral = elm("div", "pv-nota-geral"); notaGeral.hidden = true;
  topo.appendChild(notaGeral);
  if (p.bio) topo.appendChild(elm("p", null, String(p.bio).slice(0, 220)));
  corpo.appendChild(topo);
  const verPerfilBtn = elm("button", "pv-btn"); verPerfilBtn.type = "button";
  verPerfilBtn.append(usar("pessoa"), document.createTextNode("Ver perfil completo"));
  verPerfilBtn.addEventListener("click", () => { fechar(); verPerfil(); });
  const sec = elm("div", "pv-sec"); sec.appendChild(elm("h4", null, "Negócios"));
  const lista = elm("div", "pv-negs"); lista.appendChild(elm("div", "pv-vazio", "Carregando..."));
  sec.appendChild(lista);
  corpo.append(sec, verPerfilBtn);
  let negs = [];
  try {
    const snap = await fb.getDocs(fb.query(fb.collection(fb.db, "negocios"), fb.where("donoId", "==", uid)));
    negs = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((n) => !(ms(n.ocultoAte) > Date.now()));
    // Sem plano: só o perfil principal aparece e sem promoção (planos-base.js).
    if (uid !== eu?.uid) negs = await semPausados(fb, negs);
    if (!nivelPlano(await lerPlano(fb, uid))) negs.forEach((n) => { delete n.promocao; });
  } catch (e) { console.warn(e); }
  if (!negs.length) { sec.remove(); return; }
  // Estrelas de cada negócio e a média de todos (mesmos resumos das vitrines).
  let resumos = {};
  try { resumos = await lerResumos(fb, negs.map((n) => "neg_" + n.id)); } catch {}
  lista.replaceChildren();
  const tot = Object.values(resumos).reduce((t, x) => ({ total: t.total + (x?.total || 0), soma: t.soma + (x?.soma || 0) }), { total: 0, soma: 0 });
  notaGeral.replaceChildren();
  if (tot.total) {
    notaGeral.append(usar("estrela"), elm("b", null, notaTexto(media(tot))), document.createTextNode(` · ${tot.total} ${tot.total === 1 ? "avaliação" : "avaliações"}`));
  } else notaGeral.append(document.createTextNode("Ainda sem avaliações"));
  notaGeral.hidden = false;
  const ORDEM = ["servicos", "delivery", "lojinha", "imoveis", "saude", "automotivo"];
  negs.sort((x, y) => ORDEM.indexOf(x.tipo) - ORDEM.indexOf(y.tipo));
  const IR = { servicos: "Orçamento", delivery: "Pedir", lojinha: "Ver loja", imoveis: "Ver imóveis", saude: "Agendar", automotivo: "Orçamento" };
  negs.forEach((n) => {
    const b = elm("button", "pv-neg"); b.type = "button";
    b.style.setProperty("--cor", (ASSUNTOS[n.tipo] || ASSUNTOS.servicos).cor);
    const ft = elm("span", "ft");
    if (urlSegura(n.foto)) ft.style.backgroundImage = `url("${urlSegura(n.foto)}")`; else ft.textContent = String(n.nome || "?").trim().charAt(0).toUpperCase();
    const tx = elm("span", "tx");
    tx.append(elm("small", null, (ASSUNTOS[n.tipo] || ASSUNTOS.servicos).nome), elm("b", null, n.nome || (ASSUNTOS[n.tipo] || {}).nome));
    const pr = n.promocao?.titulo && ms(n.promocao.ate) > Date.now() ? n.promocao : null;
    const info = elm("span", pr ? "promo" : null, pr ? (pr.codigo ? `Cupom ${pr.codigo} · ${pr.titulo}` : pr.titulo) : [n.bairro, String(n.cidade || "").split("/")[0]].filter(Boolean).join(", ") || (n.descricao || "").slice(0, 60));
    const rs = resumos["neg_" + n.id];
    const nota = elm("span", "pv-nota");
    if (rs?.total) nota.append(usar("estrela"), elm("b", null, notaTexto(media(rs))), document.createTextNode(` (${rs.total})`));
    else nota.append(elm("em", null, "Novo"));
    tx.append(nota, info);
    b.append(ft, tx, elm("span", "ir", IR[n.tipo] || "Abrir"));
    b.addEventListener("click", async () => {
      b.disabled = true;
      try {
        const v = await carregarVitrine();
        v.abrirDetalhe(n, { fb, eu, dono: p, proprio: false, origem: "mensagens", aoMensagem: usarCartaoNaConversa, aoPerfil: () => { document.querySelectorAll(".vt-modal").forEach((m) => m.remove()); } });
      } catch (e) { console.error(e); toast("Não foi possível abrir agora."); }
      finally { b.disabled = false; }
    });
    lista.appendChild(b);
  });
  corpo.insertBefore(elm("p", "pv-dica", "Peça, compre ou peça orçamento por aqui: tudo volta para esta conversa."), verPerfilBtn);
}
// Segurar o nome no topo abre a prévia; tocar continua abrindo o perfil.
(() => {
  const b = $("btnQuem");
  let t = 0, x0 = 0, y0 = 0, segurou = false;
  const parar = () => clearTimeout(t);
  b.addEventListener("pointerdown", (e) => {
    segurou = false; x0 = e.clientX; y0 = e.clientY; parar();
    t = setTimeout(() => { segurou = true; try { navigator.vibrate?.(12); } catch {} abrirPreviaPerfil(); }, 450);
  });
  b.addEventListener("pointermove", (e) => { if (Math.hypot(e.clientX - x0, e.clientY - y0) > 10) parar(); });
  ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => b.addEventListener(ev, parar));
  b.addEventListener("contextmenu", (e) => e.preventDefault());
  b.addEventListener("click", (e) => { if (segurou) { e.preventDefault(); e.stopImmediatePropagation(); segurou = false; } }, true);
})();

function pintarAssuntoTopo() {
  pintarFixada();
  pintarAtendimento();
  const sub = $("topSub");
  sub.querySelector(".assunto-topo")?.remove();
  if (!ativa) return;
  const k = assuntoDe(ativa.dados);
  if (k === "pessoal") return;
  const tag = document.createElement("span");
  tag.className = "assunto-topo";
  tag.style.setProperty("--assunto", ASSUNTOS[k].cor);
  tag.textContent = ASSUNTOS[k].nome;
  const titulo = ativa.dados?.contexto?.titulo;
  if (titulo) tag.title = titulo;
  sub.prepend(tag);
}

// alvo: a conversa (padrão: a aberta). x/y: posição do menu (toque longo na lista).
function abrirMenuAssunto(alvo = ativa, x = null, y = null) {
  const menu = $("menuMsg");
  menu.replaceChildren();
  const atual = assuntoDe(alvo?.dados);
  Object.entries(ASSUNTOS).forEach(([k, a]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "menuitemradio");
    b.setAttribute("aria-checked", String(k === atual));
    const bol = document.createElement("span");
    bol.style.cssText = `display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:10px;background:${a.cor};flex:none`;
    b.append(bol, document.createTextNode((k === "pessoal" ? "Pessoal" : a.nome) + (k === atual ? "  ✓" : "")));
    b.addEventListener("click", async (e) => {
      e.stopPropagation();
      fecharMenu();
      if (!alvo) return;
      const titulo = k === atual ? (alvo.dados?.contexto?.titulo || "") : "";
      try {
        await fb.setDoc(refConversa(alvo.id), { contexto: k === "pessoal" ? null : { tipo: k, titulo } }, { merge: true });
        toast(`Conversa marcada como ${k === "pessoal" ? "Pessoal" : a.nome}`);
      } catch (e) {
        console.error(e);
        toast("Não foi possível classificar a conversa.");
      }
    });
    menu.appendChild(b);
  });
  const titulo = document.createElement("div");
  titulo.className = "menu-titulo";
  titulo.textContent = "Esta conversa é";
  menu.prepend(titulo);
  menu.hidden = false;
  const mr = menu.getBoundingClientRect();
  if (x != null) {
    menu.style.left = Math.max(8, Math.min(x, innerWidth - mr.width - 8)) + "px";
    menu.style.top = Math.max(8, Math.min(y, innerHeight - mr.height - 8)) + "px";
  } else {
    const r = $("btnMenuConversa").getBoundingClientRect();
    menu.style.left = Math.max(8, r.right - mr.width) + "px";
    menu.style.top = (r.bottom + 4) + "px";
  }
}

// Fechar o menu ⋮ tira o passo dele do histórico (voltar.js faz history.go(-1), que chega um instante depois). Se a ação
// abrisse um painel/janela nesse meio-tempo, o "voltar" atrasado fechava o que acabou de abrir: "Configurações do chat"
// abria e sumia na hora (10/11/2026). Agora a ação espera esse passo sair (no máximo 450 ms).
function depoisDoMenu(fn) {
  if (!history.state?.hfCamadas) { fn(); return; }
  let feito = false;
  const vai = () => { if (feito) return; feito = true; removeEventListener("popstate", aoVoltar); fn(); };
  const aoVoltar = () => setTimeout(vai, 0);
  addEventListener("popstate", aoVoltar);
  setTimeout(vai, 450);
}
function abrirMenuConversa() {
  const menu = $("menuMsg");
  menu.replaceChildren();
  // Seções com título: conversa · atendimento · organizar · configurações · privacidade (ações perigosas por último).
  const c = () => conversas.find((x) => x.id === ativa?.id);
  const grupos = [
    ["Conversa", [
      { rotulo: "Ver perfil", icone: "perfil", acao: verPerfil },
      { rotulo: "Pesquisar na conversa", icone: "lupa", acao: abrirBuscaChat },
      window.innerWidth > 820 && { rotulo: "Fechar conversa", icone: "fechar", acao: () => fecharConversa() }
    ]],
    ["Atendimento", [
      { rotulo: "Respostas rápidas", icone: "responder", acao: () => setTimeout(abrirRespostasRapidas, 0) },
      meusNegociosChat?.length && assuntoDe(ativa?.dados) !== "pessoal" && { rotulo: "Notas do cliente", icone: "nota", acao: abrirNotas },
      { rotulo: "Pedir avaliação", icone: "estrela", acao: () => setTimeout(escolherNegocioParaAvaliacao, 0) },
      { rotulo: "Mandar cartão de Pix", icone: "pix", acao: () => setTimeout(abrirCartaoPix, 0) }
    ]],
    ["Organizar", [
      { rotulo: "Classificar conversa", icone: "etiqueta", acao: () => setTimeout(() => abrirMenuAssunto(), 0) },
      { rotulo: ativa && conversaArquivada({ dados: ativa.dados }) ? "Desarquivar" : "Arquivar conversa", icone: "arquivo", acao: () => { const x = c(); if (x) arquivarConversa(x, !conversaArquivada(x)); } }
    ]],
    ["Configurações", [
      { rotulo: "Configurações do chat", icone: "config", acao: () => abrirPainel("painelConfig") },
      { rotulo: "Configurações de pagamento", icone: "pix", acao: () => setTimeout(abrirConfigPagamento, 0) }
    ]],
    ["Privacidade e segurança", [
      { rotulo: restritos.has(ativa?.outroId) ? "Remover restrição" : "Restringir", icone: "restringir", acao: alternarRestricao },
      { rotulo: bloqueios.meus.has(ativa?.outroId) ? "Desbloquear" : "Bloquear", icone: "bloquear", perigo: !bloqueios.meus.has(ativa?.outroId), acao: alternarBloqueio },
      { rotulo: "Apagar conversa", icone: "lixo", perigo: true, acao: () => { const x = c(); if (x) apagarConversaParaMim(x); } }
    ]]
  ];
  grupos.forEach(([titulo, itens], gi) => {
    if (gi) { const hr = document.createElement("hr"); hr.setAttribute("role", "separator"); menu.appendChild(hr); }
    const t = document.createElement("div"); t.className = "menu-sec"; t.setAttribute("role", "presentation"); t.textContent = titulo; menu.appendChild(t);
    itens.filter(Boolean).forEach((op) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "menuitem");
      if (op.perigo) b.className = "perigo";
      b.append(icone(op.icone, "i"), document.createTextNode(op.rotulo));
      b.addEventListener("click", () => { fecharMenu(); depoisDoMenu(op.acao); });
      menu.appendChild(b);
    });
  });
  menu.hidden = false;
  const r = $("btnMenuConversa").getBoundingClientRect();
  // Menu maior que a tela: rola por dentro.
  menu.style.maxHeight = Math.max(220, innerHeight - r.bottom - 14) + "px";
  const mr = menu.getBoundingClientRect();
  menu.style.left = Math.max(8, r.right - mr.width) + "px";
  menu.style.top = (r.bottom + 4) + "px";
}

document.addEventListener("click", (e) => { if (!$("menuMsg").contains(e.target)) fecharMenu(); });
window.addEventListener("resize", fecharMenu);

async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); toast("Texto copiado"); }
  catch { toast("Não foi possível copiar."); }
}

function verPerfil() {
  if (ativa) irPara(`usuarios.html?perfil=${encodeURIComponent(ativa.outroId)}`);
}

// ======================================================
// Editar e apagar (para todos / para mim)
// ======================================================
// Texto e legenda de foto, vídeo e áudio se editam; cartões de pedido e de avaliação, não.
const podeEditar = (m) => !m.apagada && ["", "imagem", "video", "audio"].includes(m.tipoArquivo || "");
const ocultaParaMim = (conv, id) => Array.isArray(ocultasMsg[conv]) && ocultasMsg[conv].includes(id);
const refMsg = (id) => fb.doc(fb.db, "conversas", ativa.id, "mensagens", id);
const ultimaDaConversa = (m) => mensagens.filter((x) => !x.pendente).at(-1)?.id === m.id;

async function perguntarApagar(m) {
  const minha = m.remetenteId === eu.uid && !m.apagada && !m.pendente;
  const modo = await escolherApagar({ podeTodos: minha && podeMexer(m.criadoEm), prazoPassou: minha && !podeMexer(m.criadoEm), jaApagada: !!m.apagada });
  if (modo === "todos") apagarParaTodos(m);
  else if (modo === "mim") apagarParaMim(m);
}

// Some só da minha tela (fica guardado na minha conta, vale em todos os aparelhos).
async function apagarParaMim(m) {
  if (!ativa) return;
  const conv = ativa.id;
  ocultasMsg = { ...ocultasMsg, [conv]: [...new Set([...(ocultasMsg[conv] || []), m.id])].slice(-500) };
  mensagens = mensagens.filter((x) => x.id !== m.id);
  renderizarMensagens(false);
  toast("Mensagem apagada para você");
  try { await fb.setDoc(fb.doc(fb.db, "usuarios", eu.uid), { ocultasMsg: { [conv]: fb.arrayUnion(m.id) } }, { merge: true }); }
  catch (e) { console.error(e); toast("Não foi possível guardar. A mensagem pode voltar ao recarregar."); }
}

// Para todos: a mensagem vira o aviso "apagou esta mensagem" e o conteúdo vai, na mesma gravação,
// para apagadas/{id} (os dois abrem por 24 horas). Com as regras antigas no servidor, apaga de vez.
async function apagarParaTodos(m) {
  if (!ativa) return;
  const conv = ativa.id, ultima = ultimaDaConversa(m), fixada = ativa.dados?.mensagemFixada?.id === m.id;
  const conteudo = {};
  for (const k of ["texto", "tipoArquivo", "arquivoUrl", "nomeArquivo", "cartao", "avaliacao", "resposta", "edicoes"]) if (m[k] !== undefined && m[k] !== null) conteudo[k] = m[k];
  try {
    const lote = fb.writeBatch(fb.db);
    lote.set(fb.doc(fb.db, "conversas", conv, "mensagens", m.id), { remetenteId: m.remetenteId, criadoEm: m.criadoEm, apagada: { por: eu.uid, em: fb.serverTimestamp() } });
    lote.set(fb.doc(fb.db, "conversas", conv, "apagadas", m.id), { remetenteId: eu.uid, conteudo, apagadaEm: fb.serverTimestamp() });
    await lote.commit();
    toast("Mensagem apagada para todos");
  } catch (e) {
    if (e?.code !== "permission-denied") { console.error(e); toast("Não foi possível apagar a mensagem."); return; }
    if (!podeMexer(m.criadoEm)) { toast("Passaram 10 minutos do envio: agora só dá para apagar para você."); return; }
    // Regras novas ainda não publicadas: o jeito antigo (some de vez, sem o aviso).
    try { await fb.deleteDoc(fb.doc(fb.db, "conversas", conv, "mensagens", m.id)); toast("Mensagem apagada"); }
    catch (e2) { console.error(e2); toast("Não foi possível apagar a mensagem."); return; }
  }
  const extra = {};
  if (ultima) extra.ultimaMensagem = "Mensagem apagada";
  if (fixada) extra.mensagemFixada = null;
  if (Object.keys(extra).length) fb.setDoc(refConversa(conv), extra, { merge: true }).catch(() => {});
}

// Editar: o texto novo e, em "edicoes", o de antes com a hora dele (quem conversa vê "editada").
async function editarMensagem(m) {
  const novo = await editarTextoHF({ titulo: m.tipoArquivo ? "Editar legenda" : "Editar mensagem", texto: m.texto || "", max: 4000, permiteVazio: !!m.arquivoUrl });
  if (novo == null || !ativa) return;
  const atual = mensagens.find((x) => x.id === m.id) || m;
  if (atual.apagada || novo === (atual.texto || "")) return;
  const edicoes = [...(Array.isArray(atual.edicoes) ? atual.edicoes : []), { texto: atual.texto || "", em: atual.editadaEm || atual.criadoEm }].slice(-20);
  if (edicoes.length >= 20 && (atual.edicoes || []).length >= 19) { toast("Esta mensagem já foi editada muitas vezes."); return; }
  try {
    await fb.updateDoc(refMsg(m.id), { texto: novo, editadaEm: fb.serverTimestamp(), edicoes });
    toast("Mensagem editada");
    if (ultimaDaConversa(m)) fb.setDoc(refConversa(ativa.id), { ultimaMensagem: resumoMensagem({ ...atual, texto: novo }).slice(0, 200) }, { merge: true }).catch(() => {});
    if (ativa.dados?.mensagemFixada?.id === m.id) fb.setDoc(refConversa(ativa.id), { mensagemFixada: { id: m.id, texto: resumoMensagem({ ...atual, texto: novo }).slice(0, 200), por: eu.uid, em: fb.serverTimestamp() } }, { merge: true }).catch(() => {});
  } catch (e) {
    console.error(e);
    toast(e?.code !== "permission-denied" ? "Não foi possível editar a mensagem."
      : !podeMexer(atual.criadoEm) ? "Passaram 10 minutos do envio: a mensagem não pode mais ser editada."
      : "Editar mensagens começa a funcionar quando as regras novas forem publicadas.");
  }
}

// "Ver mensagem apagada": o conteúdo guardado (24 h). Quem recebeu pode denunciar.
async function verApagada(m) {
  if (!ativa) return;
  const conv = ativa.id;
  let d = null;
  try { const s = await fb.getDoc(fb.doc(fb.db, "conversas", conv, "apagadas", m.id)); d = s.exists() ? s.data() : null; } catch (e) { console.warn(e); }
  if (!d) { toast(noPrazo(m.apagada?.em) ? "Não foi possível abrir a mensagem apagada." : "Já passaram 24 horas: esta mensagem foi apagada de vez."); return; }
  const c = d.conteudo || {};
  const caixa = document.createElement("div");
  const url = c.tipoArquivo === "cartao" ? "" : urlSegura(c.arquivoUrl);
  if (url && c.tipoArquivo === "imagem") { const im = document.createElement("img"); im.className = "hf-ma-midia"; im.src = url; im.alt = "Foto apagada"; caixa.appendChild(im); }
  else if (url && c.tipoArquivo === "video") { const v = document.createElement("video"); v.className = "hf-ma-midia"; v.src = url; v.controls = true; v.playsInline = true; caixa.appendChild(v); }
  else if (url && c.tipoArquivo === "audio") caixa.appendChild(criarAudioMsg({ id: "apagada-" + m.id, ...c }, url));
  const tx = resumoMensagem({ ...c, apagada: null });
  if (tx && !(url && !c.texto)) {
    const v = document.createElement("div"); v.className = "hf-ma-versao";
    const b = document.createElement("b"); b.append(Object.assign(document.createElement("span"), { textContent: m.remetenteId === eu.uid ? "Você" : (ativa.nome || "Contato") }), Object.assign(document.createElement("span"), { textContent: `enviada ${hora(paraData(m.criadoEm) || new Date())}` }));
    const t = document.createElement("div"); t.textContent = tx;
    v.append(b, t); caixa.appendChild(v);
  }
  if (Array.isArray(c.edicoes) && c.edicoes.length) {
    const ed = document.createElement("p"); ed.className = "hf-ma-aviso"; ed.textContent = `Antes de apagar, ela tinha sido editada. Original: “${String(c.edicoes[0]?.texto || "").slice(0, 300)}”`;
    caixa.appendChild(ed);
  }
  const prazo = document.createElement("p"); prazo.className = "hf-ma-aviso";
  prazo.textContent = `Só vocês dois veem. Some de vez em ${tempoRestante(d.apagadaEm) || "instantes"}.`;
  caixa.appendChild(prazo);
  const acoes = [];
  if (m.remetenteId !== eu.uid) acoes.push({ rotulo: "Denunciar", classe: "perigo", acao: async () => {
    // Guarda o conteúdo para a equipe (só a moderação apaga depois) e abre a denúncia.
    fb.updateDoc(fb.doc(fb.db, "conversas", conv, "apagadas", m.id), { denunciada: true }).catch(() => {});
    denunciarMensagem({ ...m, ...c, apagada: null });
  } });
  acoes.push({ rotulo: "Fechar", classe: "pri" });
  janelaHF({ titulo: "Mensagem apagada", sub: `${m.apagada.por === eu.uid ? "Você apagou" : (ativa.nome || "Contato") + " apagou"} ${horaCurta(m.apagada.em)}.`, conteudo: caixa, acoes });
}

// Passadas 24 horas, o conteúdo guardado é apagado de vez por quem abrir a conversa primeiro.
const apagadasLimpas = new Set();
function limparApagadasVencidas(conv) {
  for (const m of mensagens) {
    if (!m.apagada || noPrazo(m.apagada.em) || apagadasLimpas.has(conv + "/" + m.id)) continue;
    apagadasLimpas.add(conv + "/" + m.id);
    fb.deleteDoc(fb.doc(fb.db, "conversas", conv, "apagadas", m.id)).catch(() => {});
  }
}

// ======================================================
// Responder
// ======================================================
function responder(m) {
  respondendo = m;
  $("respostaQuem").textContent = m.remetenteId === eu.uid ? "Você" : (ativa?.nome || "Contato");
  $("respostaTexto").textContent = resumoMensagem(m);
  $("barraResposta").hidden = false;
  $("texto").focus();
}
function cancelarResposta() {
  respondendo = null;
  $("barraResposta").hidden = true;
}
$("cancelarResposta").addEventListener("click", cancelarResposta);

// ======================================================
// Anexos (foto sem Storage; foto/vídeo/áudio com Storage)
// ======================================================
function removerAnexo() {
  if (anexo?.previa) URL.revokeObjectURL(anexo.previa);
  anexo = null;
  $("barraAnexo").hidden = true;
  $("inputArquivo").value = "";
  atualizarBotaoEnviar();
}
$("cancelarAnexo").addEventListener("click", removerAnexo);
$("btnAnexar").addEventListener("click", abrirAnexar);
// Câmera: a foto entra no mesmo caminho da galeria (prévia, legenda e envio).
$("inputCamera").addEventListener("change", () => {
  const f = $("inputCamera").files?.[0];
  $("inputCamera").value = "";
  if (!f) return;
  const dt = new DataTransfer(); dt.items.add(f);
  $("inputArquivo").files = dt.files;
  $("inputArquivo").dispatchEvent(new Event("change"));
});
// Gaveta "Anexar" (como nos mensageiros): galeria, câmera, localização, endereço e os cartões de negócio.
async function abrirAnexar() {
  if (!ativa) return;
  const { corpo, fechar } = abrirGaveta("Anexar");
  const grade = elm("div", "ax-grade");
  const op = (icone, rot, cor, fn, sub) => {
    const b = elm("button", "ax-op"); b.type = "button"; b.style.setProperty("--ax", cor);
    const ic = elm("span", "ax-ic"); ic.appendChild(usar(icone, "i"));
    b.append(ic, elm("b", null, rot));
    if (sub) b.appendChild(elm("small", null, sub));
    b.addEventListener("click", () => { fechar(); setTimeout(fn, 200); });
    grade.appendChild(b);
    return b;
  };
  op("imagem", "Galeria", "#8b5cf6", () => $("inputArquivo").click(), storageFns ? "Fotos e vídeos" : "Fotos");
  op("camera", "Câmera", "#ec4899", () => $("inputCamera").click(), "Tirar foto");
  op("local", "Localização", "#22c55e", enviarLocalizacao, "Onde estou agora");
  op("casa", "Endereço", "#f59e0b", usarMeuEndereco, "O seu, salvo");
  op("pix", "Pix", "#32bcad", abrirCartaoPix, "Cobrar ou receber");
  corpo.appendChild(grade);
  // Cartões de negócio: o meu (para mandar a quem conversa) e os da pessoa (para pedir sem sair daqui).
  const sec = elm("div", "pv-sec"); sec.appendChild(elm("h4", null, "Negócios"));
  const g2 = elm("div", "ax-grade");
  sec.appendChild(g2);
  corpo.appendChild(sec);
  const add2 = (icone, rot, cor, fn, sub) => { const b = op(icone, rot, cor, fn, sub); g2.appendChild(b); };
  add2("loja", "Fazer pedido", "#ff7a1a", abrirPreviaPerfil, "Negócios da pessoa");
  const meus = await negociosDoUsuario().catch(() => []);
  (meus || []).forEach((n) => add2("cartao-neg", n.nome || ASSUNTOS[n.tipo]?.nome || "Meu negócio", (ASSUNTOS[n.tipo] || ASSUNTOS.servicos).cor, async () => {
    try { const v = await carregarVitrine(); cartaoPendente = v.cartaoDeNegocio(n); try { sessionStorage.setItem("hf-cartao-pendente", JSON.stringify({ conversaId: ativa.id, cartao: cartaoPendente })); } catch {} pintarCartaoPendente(); $("texto")?.focus({ preventScroll: true }); }
    catch { toast("Não foi possível preparar o cartão."); }
  }, `Enviar ${(ASSUNTOS[n.tipo] || {}).nome || "perfil"}`));
}
// ---------- localização e endereço (cartão com mapa, como no WhatsApp) ----------
// cartao { tipo: "local", lat, lng, precisao?, endereco? } ou { tipo: "endereco", endereco, linha2?, lat?, lng? }.
// O mapa é montado com os "azulejos" do OpenStreetMap (sem chave); o nome da rua vem do Nominatim só na hora de enviar.
const coordOk = (la, lo) => Number.isFinite(la) && Number.isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180;
function mapaEstatico(la, lo, z = 16) {
  const box = elm("div", "lc-mapa");
  const n = 2 ** z, rad = (la * Math.PI) / 180;
  const px = ((lo + 180) / 360) * n * 256, py = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n * 256;
  const meio = elm("div", "lc-meio");
  for (let tx = Math.floor((px - 360) / 256); tx <= Math.floor((px + 360) / 256); tx++) {
    for (let ty = Math.floor((py - 160) / 256); ty <= Math.floor((py + 160) / 256); ty++) {
      const img = document.createElement("img"); img.alt = ""; img.loading = "lazy"; img.decoding = "async"; img.draggable = false;
      img.onerror = () => img.remove(); // sem internet para o mapa: fica o fundo desenhado
      img.src = `https://tile.openstreetmap.org/${z}/${((tx % n) + n) % n}/${ty}.png`;
      img.style.left = `${tx * 256 - px}px`; img.style.top = `${ty * 256 - py}px`;
      meio.appendChild(img);
    }
  }
  const pino = elm("span", "lc-pino"); pino.appendChild(usar("local", "i"));
  box.append(meio, pino, elm("span", "lc-cred", "© OpenStreetMap"));
  return box;
}
const linkMapa = (c) => (coordOk(c.lat, c.lng) ? `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.endereco || "")}`);
const linkRota = (c) => `https://www.google.com/maps/dir/?api=1&destination=${coordOk(c.lat, c.lng) ? `${c.lat},${c.lng}` : encodeURIComponent(c.endereco || "")}`;
function cartaoLocal(c, minha) {
  const box = elm("div", "lc");
  const local = c.tipo === "local";
  const temCoord = coordOk(Number(c.lat), Number(c.lng));
  const abrir = document.createElement("a"); abrir.className = "lc-abrir"; abrir.href = linkMapa(c); abrir.target = "_blank"; abrir.rel = "noopener";
  if (temCoord) abrir.appendChild(mapaEstatico(Number(c.lat), Number(c.lng)));
  else { const sem = elm("div", "lc-mapa lc-sem"); const pino = elm("span", "lc-pino"); pino.appendChild(usar("casa", "i")); sem.appendChild(pino); abrir.appendChild(sem); }
  const tx = elm("div", "lc-tx");
  const ic = elm("span", "lc-ic"); ic.appendChild(usar(local ? "local" : "casa", "i"));
  const t2 = elm("div");
  t2.append(elm("b", null, local ? (minha ? "Minha localização" : "Localização") : "Endereço"),
    elm("span", null, String(c.endereco || (temCoord ? `${Number(c.lat).toFixed(5)}, ${Number(c.lng).toFixed(5)}` : "")).slice(0, 200)));
  if (c.linha2) t2.appendChild(elm("small", null, String(c.linha2).slice(0, 120)));
  else if (local && Number(c.precisao) > 0) t2.appendChild(elm("small", null, `Precisão de ${Math.round(c.precisao)} m`));
  tx.append(ic, t2);
  abrir.appendChild(tx);
  const acoes = elm("div", "lc-acoes");
  const rota = document.createElement("a"); rota.href = linkRota(c); rota.target = "_blank"; rota.rel = "noopener"; rota.append(usar("rota", "i s"), document.createTextNode("Como chegar"));
  const copiar = elm("button"); copiar.type = "button"; copiar.append(usar("copiar", "i s"), document.createTextNode("Copiar"));
  copiar.addEventListener("click", (e) => { e.stopPropagation(); const t = [c.endereco, c.linha2].filter(Boolean).join(" · ") || `${c.lat}, ${c.lng}`; navigator.clipboard?.writeText(t).then(() => toast("Copiado"), () => toast(t)); });
  acoes.append(rota, copiar);
  box.append(abrir, acoes);
  return box;
}
// Nome da rua a partir das coordenadas (só quem envia consulta; quem recebe já vê pronto).
async function enderecoDe(la, lo) {
  try {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${la}&lon=${lo}&zoom=18&addressdetails=1&accept-language=pt-BR`, { signal: ctrl.signal });
    clearTimeout(t);
    const a = (await r.json())?.address || {};
    const rua = [a.road || a.pedestrian || a.footway, a.house_number].filter(Boolean).join(", ");
    return [rua, a.suburb || a.neighbourhood || a.quarter, a.city || a.town || a.village].filter(Boolean).join(" · ");
  } catch { return ""; }
}
async function coordDe(texto) {
  try {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=${encodeURIComponent(texto)}`, { signal: ctrl.signal });
    clearTimeout(t);
    const x = (await r.json())?.[0];
    return x ? { lat: Number(Number(x.lat).toFixed(6)), lng: Number(Number(x.lon).toFixed(6)) } : null;
  } catch { return null; }
}
// ---------- cartão de Pix ----------
// cartao { tipo: "pix", chave, tipoChave, nome, cidade, valor?, descricao? }: quem recebe manda a chave Pix na conversa;
// quem paga copia o código "copia e cola" (BR Code, pix.js) ou lê o QR Code no app do banco. O site não intermedia
// o pagamento. A chave fica guardada na conta (usuarios.pix) para a próxima vez.
const reaisPix = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
// Golpe comum: cobrar "em nome do Help Floripa" pelo chat. Os planos se pagam só na tela de Planos.
const fingeHelpFloripa = (c) => /help\s*floripa/i.test(`${c?.nome || ""} ${c?.descricao || ""}`) || String(c?.chave || "").replace(/\D/g, "") === "61935934000100";
function cartaoPix(c, minha) {
  const box = elm("div", "px");
  if (fingeHelpFloripa(c)) box.appendChild(elm("p", "px-golpe", "Cuidado: o Help Floripa nunca cobra pelo chat. Planos só se pagam em Meus negócios → Planos. Não pague este Pix e denuncie a conversa."));
  const cab = elm("div", "px-cab");
  const ic = elm("span", "px-ic"); ic.appendChild(usar("pix", "i"));
  const t = elm("div"); t.append(elm("small", null, minha ? "Você enviou um Pix para receber" : "Pix para pagamento"), elm("b", null, Number(c.valor) > 0 ? reaisPix(c.valor) : "Valor a combinar"));
  cab.append(ic, t);
  box.appendChild(cab);
  const dados = elm("div", "px-dados");
  const linha = (rot, val) => { if (!val) return; const d = elm("div"); d.append(elm("span", null, rot), elm("strong", null, String(val).slice(0, 120))); dados.appendChild(d); };
  linha("Para", c.nome); linha(c.tipoChave || "Chave", c.chave); linha("Referente a", c.descricao);
  box.appendChild(dados);
  const codigo = codigoPix({ chave: c.chave, nome: c.nome, cidade: c.cidade, valor: Number(c.valor) > 0 ? c.valor : undefined, descricao: c.descricao });
  const acoes = elm("div", "px-acoes");
  const copiarTxt = (txt, aviso) => (e) => { e.stopPropagation(); navigator.clipboard?.writeText(txt).then(() => toast(aviso), () => toast(txt)); };
  const b1 = elm("button", "pri"); b1.type = "button"; b1.append(usar("copiar", "i s"), document.createTextNode("Copiar código Pix")); b1.addEventListener("click", copiarTxt(codigo, "Código Pix copiado: cole no app do banco"));
  const b2 = elm("button"); b2.type = "button"; b2.append(usar("copiar", "i s"), document.createTextNode("Copiar chave")); b2.addEventListener("click", copiarTxt(c.chave, "Chave Pix copiada"));
  const b3 = elm("button"); b3.type = "button"; b3.append(usar("pix", "i s"), document.createTextNode("QR Code"));
  const qrBox = elm("div", "px-qr"); qrBox.hidden = true;
  b3.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (!qrBox.childElementCount) { try { const { qrSvg } = await import("./qr.js?v=1"); qrBox.appendChild(await qrSvg(codigo, "QR Code do Pix")); } catch { toast("Não foi possível mostrar o QR Code."); return; } }
    qrBox.hidden = !qrBox.hidden;
  });
  acoes.append(b1, b2, b3);
  box.append(acoes, qrBox, elm("p", "px-aviso", "Confira o nome de quem recebe no app do banco antes de pagar. O Help Floripa não intermedia pagamentos."));
  return box;
}
async function abrirCartaoPix() {
  if (!ativa) return;
  const { corpo, fechar } = abrirGaveta("Cartão de Pix");
  let salvo = {};
  try { salvo = (await fb.getDoc(fb.doc(fb.db, "usuarios", eu.uid))).data()?.pix || {}; } catch {}
  const campoPx = (rot, attrs, dica) => {
    const l = elm("label", "px-campo"); l.appendChild(elm("span", null, rot));
    const i = document.createElement("input"); Object.assign(i, attrs); l.appendChild(i);
    if (dica) l.appendChild(elm("small", null, dica));
    return [l, i];
  };
  const [lChave, iChave] = campoPx("Sua chave Pix", { value: salvo.chave || "", placeholder: "E-mail, celular, CPF, CNPJ ou chave aleatória", maxLength: 77, autocapitalize: "off", spellcheck: false });
  const [lNome, iNome] = campoPx("Nome de quem recebe", { value: salvo.nome || meuPerfil.nome || eu.displayName || "", placeholder: "Como aparece no banco", maxLength: 60 });
  const [lCid, iCid] = campoPx("Cidade", { value: salvo.cidade || String(meuPerfil.cidade || "").split("/")[0] || "", placeholder: "Florianópolis", maxLength: 40 });
  const [lVal, iVal] = campoPx("Valor (opcional)", { inputMode: "decimal", placeholder: "Ex.: 50,00", maxLength: 12 }, "Sem valor, quem paga digita no banco.");
  const [lDesc, iDesc] = campoPx("Referente a (opcional)", { placeholder: "Ex.: Pedido #A1B2C3, conserto do chuveiro", maxLength: 60 });
  const prev = elm("div", "lc-previa");
  const lerCartao = () => {
    const tk = tipoChavePix(iChave.value);
    const v = Number(String(iVal.value).replace(/\./g, "").replace(",", "."));
    return tk ? { tipo: "pix", chave: tk.chave, tipoChave: tk.tipo, nome: iNome.value.trim().slice(0, 60), cidade: iCid.value.trim().slice(0, 40), valor: v > 0 && v < 1e6 ? Math.round(v * 100) / 100 : null, descricao: iDesc.value.trim().slice(0, 60) } : null;
  };
  const pintarPrevia = () => { const c = lerCartao(); prev.replaceChildren(c ? cartaoPix(c, true) : elm("p", "px-vazio", "Digite uma chave Pix válida para ver o cartão.")); };
  [iChave, iNome, iCid, iVal, iDesc].forEach((i) => i.addEventListener("input", pintarPrevia));
  const enviar = elm("button", "pv-btn pri"); enviar.type = "button"; enviar.append(usar("enviar", "i s"), document.createTextNode("Enviar cartão de Pix"));
  enviar.addEventListener("click", async () => {
    const c = lerCartao();
    if (!c) { toast("Confira a chave Pix: e-mail, celular com DDD, CPF, CNPJ ou chave aleatória."); iChave.focus(); return; }
    if (c.nome.length < 3) { toast("Escreva o nome de quem recebe, como aparece no banco."); iNome.focus(); return; }
    if (fingeHelpFloripa(c)) { toast("Cartão de Pix é para receber em seu nome. Cobranças do Help Floripa não passam pelo chat."); iNome.focus(); return; }
    enviar.disabled = true;
    try {
      await publicarMensagem(ativa.id, { remetenteId: eu.uid, texto: "", criadoEm: fb.serverTimestamp(), tipoArquivo: "cartao", cartao: c });
      fb.setDoc(fb.doc(fb.db, "usuarios", eu.uid), { pix: { chave: c.chave, nome: c.nome, cidade: c.cidade } }, { merge: true }).catch(() => {});
      fechar();
    } catch (e) { console.error(e); enviar.disabled = false; toast(e?.code === "limite-diario" ? e.message : "Não foi possível enviar agora."); }
  });
  corpo.append(lChave, lNome, lCid, lVal, lDesc, prev, enviar);
  pintarPrevia();
}
// Configurações de pagamento (⋯ da conversa): a chave Pix guardada na conta (usuarios.pix), usada no cartão de Pix.
async function abrirConfigPagamento() {
  const { corpo, fechar } = abrirGaveta("Configurações de pagamento");
  let salvo = {};
  try { salvo = (await fb.getDoc(fb.doc(fb.db, "usuarios", eu.uid))).data()?.pix || {}; } catch {}
  const campo = (rot, attrs, dica) => {
    const l = elm("label", "px-campo"); l.appendChild(elm("span", null, rot));
    const i = document.createElement("input"); Object.assign(i, attrs); l.appendChild(i);
    if (dica) l.appendChild(elm("small", null, dica));
    return [l, i];
  };
  const intro = elm("p", "px-aviso", "Sua chave Pix fica guardada na sua conta e já vem preenchida quando você manda um cartão de Pix (clipe → Pix). Só aparece para quem recebe o cartão.");
  const [lChave, iChave] = campo("Sua chave Pix", { value: salvo.chave || "", placeholder: "E-mail, celular, CPF, CNPJ ou chave aleatória", maxLength: 77, autocapitalize: "off", spellcheck: false });
  const [lNome, iNome] = campo("Nome de quem recebe", { value: salvo.nome || meuPerfil.nome || eu.displayName || "", placeholder: "Como aparece no banco", maxLength: 60 }, "Use o mesmo nome que o banco mostra, para o cliente conferir antes de pagar.");
  const [lCid, iCid] = campo("Cidade", { value: salvo.cidade || String(meuPerfil.cidade || "").split("/")[0] || "", placeholder: "Florianópolis", maxLength: 40 });
  const tipo = elm("small", "px-tipo");
  const mostrarTipo = () => { const tk = tipoChavePix(iChave.value); tipo.textContent = !iChave.value.trim() ? "" : tk ? `Tipo da chave: ${tk.tipo}` : "Chave inválida: confira e-mail, celular com DDD, CPF, CNPJ ou chave aleatória."; tipo.classList.toggle("erro", !!iChave.value.trim() && !tk); };
  iChave.addEventListener("input", mostrarTipo); lChave.appendChild(tipo); mostrarTipo();
  const salvar = elm("button", "pv-btn pri"); salvar.type = "button"; salvar.append(usar("check", "i s"), document.createTextNode("Salvar"));
  salvar.addEventListener("click", async () => {
    const tk = tipoChavePix(iChave.value);
    if (!tk) { toast("Confira a chave Pix: e-mail, celular com DDD, CPF, CNPJ ou chave aleatória."); iChave.focus(); return; }
    if (iNome.value.trim().length < 3) { toast("Escreva o nome de quem recebe, como aparece no banco."); iNome.focus(); return; }
    salvar.disabled = true;
    try { await fb.setDoc(fb.doc(fb.db, "usuarios", eu.uid), { pix: { chave: tk.chave, nome: iNome.value.trim().slice(0, 60), cidade: iCid.value.trim().slice(0, 40) } }, { merge: true }); toast("Chave Pix salva"); fechar(); }
    catch { salvar.disabled = false; toast("Não foi possível salvar agora."); }
  });
  const btns = [salvar];
  if (ativa) { const env = elm("button", "pv-btn"); env.type = "button"; env.append(usar("pix", "i s"), document.createTextNode("Mandar um cartão de Pix nesta conversa")); env.addEventListener("click", () => { fechar(); setTimeout(abrirCartaoPix, 0); }); btns.push(env); }
  if (salvo.chave) {
    const rem = elm("button", "pv-btn perigo"); rem.type = "button"; rem.append(usar("lixo", "i s"), document.createTextNode("Remover a chave salva"));
    rem.addEventListener("click", async () => { try { await fb.setDoc(fb.doc(fb.db, "usuarios", eu.uid), { pix: fb.deleteField() }, { merge: true }); toast("Chave removida"); fechar(); } catch { toast("Não foi possível remover agora."); } });
    btns.push(rem);
  }
  corpo.append(intro, lChave, lNome, lCid, ...btns, elm("p", "px-aviso", "O Help Floripa não intermedia pagamentos entre clientes e negócios: o dinheiro vai direto para a sua conta."));
}
// Gaveta de confirmação: mostra o cartão como vai chegar e envia com um toque.
function confirmarEnvioLocal(titulo, cartao, rotuloBotao) {
  const { corpo, fechar } = abrirGaveta(titulo);
  const prev = elm("div", "lc-previa"); prev.appendChild(cartaoLocal(cartao, true));
  const enviar = elm("button", "pv-btn pri"); enviar.type = "button"; enviar.append(usar("enviar", "i s"), document.createTextNode(rotuloBotao));
  enviar.addEventListener("click", async () => {
    if (!ativa) return;
    enviar.disabled = true;
    try {
      await publicarMensagem(ativa.id, { remetenteId: eu.uid, texto: "", criadoEm: fb.serverTimestamp(), tipoArquivo: "cartao", cartao });
      fechar();
    } catch (e) { console.error(e); enviar.disabled = false; toast(e?.code === "limite-diario" ? e.message : "Não foi possível enviar agora."); }
  });
  corpo.append(prev, enviar);
  return { corpo, prev };
}
function enviarLocalizacao() {
  if (!navigator.geolocation) { toast("Este aparelho não informa a localização."); return; }
  toast("Pegando a sua localização...");
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const la = Number(pos.coords.latitude.toFixed(6)), lo = Number(pos.coords.longitude.toFixed(6));
    const cartao = { tipo: "local", lat: la, lng: lo, precisao: Math.round(pos.coords.accuracy || 0) };
    const { prev } = confirmarEnvioLocal("Enviar localização", cartao, "Enviar localização atual");
    const end = await enderecoDe(la, lo);
    if (end && prev.isConnected) { cartao.endereco = end.slice(0, 200); prev.replaceChildren(cartaoLocal(cartao, true)); }
  }, () => toast("Não deu para pegar a localização. Confira a permissão do navegador."), { enableHighAccuracy: true, timeout: 12000 });
}
async function usarMeuEndereco() {
  try {
    const e = (await fb.getDoc(fb.doc(fb.db, "usuarios", eu.uid))).data()?.endereco;
    if (!e?.rua && !e?.bairro) { toast("Você ainda não salvou um endereço. Cadastre em Configurações > Endereço."); return; }
    const rua = [[e.rua, e.numero].filter(Boolean).join(", "), e.complemento].filter(Boolean).join(" · ");
    const cartao = { tipo: "endereco", endereco: [rua, e.bairro].filter(Boolean).join(" · ").slice(0, 200), linha2: [[e.cidade, e.uf].filter(Boolean).join("/"), e.cep ? `CEP ${String(e.cep).replace(/^(\d{5})(\d{3})$/, "$1-$2")}` : "", e.referencia ? `Ref.: ${e.referencia}` : ""].filter(Boolean).join(" · ").slice(0, 120) };
    const { prev } = confirmarEnvioLocal("Enviar endereço", cartao, "Enviar endereço");
    const c = await coordDe([e.rua, e.numero, e.bairro, e.cidade, e.uf].filter(Boolean).join(", "));
    if (c && prev.isConnected) { Object.assign(cartao, c); prev.replaceChildren(cartaoLocal(cartao, true)); }
  } catch { toast("Não foi possível ler o seu endereço agora."); }
}

$("inputArquivo").addEventListener("change", () => {
  const arquivo = $("inputArquivo").files?.[0];
  if (!arquivo) return;
  const ehVideo = arquivo.type.startsWith("video/");
  const ehImagem = arquivo.type.startsWith("image/");
  if (!ehImagem && !ehVideo) { toast("Escolha uma foto ou um vídeo."); $("inputArquivo").value = ""; return; }
  if (ehVideo && !storageFns) { toast("Envio de vídeos estará disponível em breve."); $("inputArquivo").value = ""; return; }
  if (arquivo.size > 50 * 1024 * 1024) { toast("O arquivo deve ter até 50 MB."); $("inputArquivo").value = ""; return; }
  removerAnexo();
  anexo = { arquivo, tipo: ehVideo ? "video" : "imagem", previa: URL.createObjectURL(arquivo) };
  const thumb = $("anexoThumb");
  thumb.replaceChildren();
  if (ehImagem) {
    const img = document.createElement("img");
    img.src = anexo.previa;
    img.alt = "";
    thumb.appendChild(img);
  } else {
    thumb.appendChild(icone("imagem", "i"));
  }
  $("anexoTipo").textContent = ehVideo ? "Vídeo" : "Foto";
  $("anexoNome").textContent = `${arquivo.name} · ${(arquivo.size / 1024 / 1024).toFixed(1)} MB`;
  $("barraAnexo").hidden = false;
  atualizarBotaoEnviar();
  $("texto").focus();
});

async function enviarParaStorage(arquivo, extensao) {
  const { ref, uploadBytes, getDownloadURL } = storageFns;
  const caminho = `mensagens/${ativa.id}/${eu.uid}/${Date.now()}.${extensao}`;
  const destino = ref(window.firebaseStorage, caminho);
  await uploadBytes(destino, arquivo, { contentType: arquivo.type || "application/octet-stream", cacheControl: "public, max-age=31536000, immutable" });
  return getDownloadURL(destino);
}

async function prepararImagem(arquivo) {
  if (storageFns) {
    try {
      // Reduzida para até 1600 px em JPEG antes de subir: a foto de 10 MB do celular vira ~300 KB
      // (abre rápido no 4G e gasta menos Storage). HEIC e outros formatos viram JPEG também.
      const reduzida = dataUrlParaBlob(await comprimirImagem(arquivo, 1600, 0.82));
      return await enviarParaStorage(reduzida, "jpg");
    } catch (e) {
      console.warn("Storage indisponível, enviando foto comprimida:", e);
    }
  }
  // Sem Storage: foto comprimida dentro da própria mensagem (limite de 1 MB por documento).
  // Fotos mais leves: abrem rápido e gastam menos internet (até o Storage ser ativado).
  for (const [lado, q] of [[1080, 0.68], [900, 0.6], [720, 0.55]]) {
    const dataUrl = await comprimirImagem(arquivo, lado, q);
    if (dataUrl.length < 900000) return dataUrl;
  }
  throw new Error("A foto é grande demais. Tente outra imagem.");
}

// ======================================================
// Enviar
// ======================================================
let enviando = false;
// ---------- cartão pendente (vem da vitrine ou do perfil de negócio) ----------
let cartaoPendente = null;
function carregarCartaoPendente(conversaId) {
  cartaoPendente = null;
  try {
    const salvo = JSON.parse(sessionStorage.getItem("hf-cartao-pendente") || "null");
    if (salvo && salvo.conversaId === conversaId && salvo.cartao) cartaoPendente = salvo.cartao;
  } catch {}
  pintarCartaoPendente();
}
function pintarCartaoPendente() {
  const barra = $("barraCartao");
  barra.hidden = !cartaoPendente;
  if (!cartaoPendente) return;
  const c = cartaoPendente;
  barra.classList.toggle("caixa", c.tipo === "caixa");
  if (c.tipo === "caixa") {
    // Resposta da caixa de perguntas: a pergunta e a resposta vão junto, e a pessoa escreve a mensagem.
    barra.style.setProperty("--cxm", FAIXA_CX[c.cor] || FAIXA_CX.branco);
    const th = $("cartaoThumb"); th.style.background = ""; th.innerHTML = SVG_CX;
    $("cartaoTipo").textContent = `Respondendo: “${String(c.pergunta || "").slice(0, 60)}”`;
    $("cartaoTitulo").textContent = String(c.resposta || "");
    atualizarBotaoEnviar();
    return;
  }
  const cor = (ASSUNTOS[c.tipo] || ASSUNTOS.servicos).cor;
  barra.style.setProperty("--assunto", cor);
  const th = $("cartaoThumb");
  th.replaceChildren();
  th.style.background = urlSegura(c.foto) ? `center / cover url("${urlSegura(c.foto)}")` : "";
  $("cartaoTipo").textContent = `${(ASSUNTOS[c.tipo] || ASSUNTOS.servicos).nome} · ${c.pedido ? "pedido vai" : c.solicitacao ? "orçamento vai" : "vai"} junto na mensagem`;
  $("cartaoTitulo").textContent = [c.titulo, c.preco].filter(Boolean).join(" · ");
  atualizarBotaoEnviar();
}
function descartarCartao() {
  cartaoPendente = null;
  try { sessionStorage.removeItem("hf-cartao-pendente"); } catch {}
  pintarCartaoPendente();
}
$("cancelarCartao").addEventListener("click", descartarCartao);

// No celular (teclado Android), o texto que ainda está "sendo escrito" pelo teclado volta para o campo logo
// depois de limpar, e um segundo toque em enviar mandava a mesma mensagem duas vezes. Guardamos o que acabou
// de ir: se o teclado devolver o mesmo texto em até 2 s, o campo é limpo de novo, e o mesmo texto na mesma
// conversa não sai duas vezes seguidas.
let ultimoEnviado = null;
const acabouDeIr = (conv, texto) => !!ultimoEnviado && ultimoEnviado.conv === conv && ultimoEnviado.texto === texto && Date.now() < ultimoEnviado.ate;
function limparEco() {
  const c = $("texto");
  if (c.value && ultimoEnviado && Date.now() < ultimoEnviado.ate && c.value.trim() === ultimoEnviado.texto) { c.value = ""; ajustarAltura(); }
}
["input", "compositionend", "keyup"].forEach((ev) => $("texto").addEventListener(ev, () => setTimeout(limparEco, 0)));

async function enviar() {
  if (emailPendente(eu)) { mostrarAvisoEmail(eu); toast(MSG_EMAIL); return; }
  if (gravador) { pararGravacao(true); return; }
  const campo = $("texto");
  const texto = campo.value.trim();
  if ((!texto && !anexo && !cartaoPendente) || !ativa || enviando) return;
  if (texto && !anexo && !cartaoPendente && acabouDeIr(ativa.id, texto)) { campo.value = ""; ajustarAltura(); return; }
  if (texto) ultimoEnviado = { conv: ativa.id, texto, ate: Date.now() + 2000 };

  const conversaId = ativa.id;
  // Cartão do portfólio vai antes do texto, como assunto da conversa.
  if (cartaoPendente) {
    const cartao = cartaoPendente;
    descartarCartao();
    try {
      await publicarMensagem(conversaId, { remetenteId: eu.uid, texto: "", criadoEm: fb.serverTimestamp(), tipoArquivo: "cartao", cartao });
    } catch (erro) {
      console.error(erro);
      toast("Não foi possível enviar o cartão.");
    }
    if (!texto && !anexo) return;
  }
  const anexoAtual = anexo;
  const resposta = respondendo;
  const dados = { remetenteId: eu.uid, texto, criadoEm: fb.serverTimestamp() };
  if (resposta) dados.resposta = { id: resposta.id, texto: resumoMensagem(resposta).slice(0, 160), remetenteId: resposta.remetenteId };

  campo.value = "";
  ajustarAltura();
  // limpa de novo logo depois (o teclado pode devolver a palavra que estava escrevendo)
  requestAnimationFrame(limparEco); setTimeout(limparEco, 120); setTimeout(limparEco, 400);
  cancelarResposta();
  if (anexoAtual) { enviando = true; $("btnEnviar").disabled = true; }

  try {
    if (anexoAtual) {
      toast(anexoAtual.tipo === "video" ? "Enviando vídeo..." : "Enviando foto...");
      if (anexoAtual.tipo === "video") {
        const ext = (anexoAtual.arquivo.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "mp4";
        dados.arquivoUrl = await enviarParaStorage(anexoAtual.arquivo, ext);
      } else {
        dados.arquivoUrl = await prepararImagem(anexoAtual.arquivo);
      }
      dados.tipoArquivo = anexoAtual.tipo;
      dados.nomeArquivo = anexoAtual.arquivo.name.slice(0, 120);
      removerAnexo();
      document.querySelectorAll(".toast").forEach((t) => t.remove());
    }
    await publicarMensagem(conversaId, dados);
  } catch (erro) {
    console.error("Erro ao enviar:", erro);
    ultimoEnviado = null;
    if (!campo.value) campo.value = texto;
    ajustarAltura();
    toast(erro.message && (!erro.code || erro.code === "limite-diario") ? erro.message : "Não foi possível enviar a mensagem. Tente novamente.");
  } finally {
    enviando = false;
    $("btnEnviar").disabled = false;
    atualizarBotaoEnviar();
  }
}

async function registrarTempoResposta(desde) {
  if (FUNCOES_LIGADAS) return; // o servidor calcula (functions/seguranca-chat.js)
  try {
    if (!(await negociosDoUsuario()).length) return;
    const min = Math.min(1440, Math.max(0, (Date.now() - desde) / 60000));
    const r = meuPerfil.atendimento?.resposta || { media: 0, n: 0 };
    const peso = Math.min(r.n, 49); // média das últimas ~50 respostas
    const media = Math.round(((r.media * peso + min) / (peso + 1)) * 10) / 10;
    const resposta = { media, n: Math.min(r.n + 1, 1000) };
    await fb.setDoc(fb.doc(fb.db, "perfis_publicos", eu.uid), { uid: eu.uid, atendimento: { resposta } }, { merge: true });
    meuPerfil.atendimento = { ...(meuPerfil.atendimento || {}), resposta };
  } catch (e) { console.warn("Tempo de resposta não salvo:", e?.code || e); }
}

async function publicarMensagem(conversaId, dados) {
  const ref = refConversa(conversaId);
  // Cliente esperando resposta numa conversa de negócio? Qualquer resposta conta para o tempo médio.
  const c = ativa?.id === conversaId ? ativa : null;
  const esperandoDesde = c && assuntoDe(c.dados) !== "pessoal" && c.dados?.ultimaMensagemRemetenteId === c.outroId ? ms(c.dados.atualizadoEm) : 0;
  if (esperandoDesde) c.dados.ultimaMensagemRemetenteId = eu.uid; // não conta duas vezes a mesma espera
  const envio = comRitmo(fb, eu.uid, "msg", (lote) => lote.set(fb.doc(fb.collection(ref, "mensagens")), dados));
  const resumo = resumoMensagem(dados).slice(0, 120);
  fb.setDoc(ref, {
    ultimaMensagem: resumo,
    ultimaMensagemRemetenteId: eu.uid,
    atualizadoEm: fb.serverTimestamp(),
    [campoLeitura(ativa?.outroId)]: { [eu.uid]: fb.serverTimestamp() },
    digitando: { [eu.uid]: null },
    falaram: { [eu.uid]: true } // "já escreveu nesta conversa": libera avaliação e reclamação
  }, { merge: true }).catch((e) => console.warn("Resumo da conversa não atualizado:", e));
  ultimoDigitando = 0;
  await envio;
  if (esperandoDesde) registrarTempoResposta(esperandoDesde);
}

// ======================================================
// Caixa de texto, "digitando..." e botão enviar/gravar
// ======================================================
const podeGravar = () => !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
// Sem Storage o áudio vai dentro da mensagem, então limitamos a duração.
const LIMITE_AUDIO_SEG = () => (storageFns ? 300 : 120);

// Teclado do celular: a conversa encolhe junto com a área visível (o campo nunca fica atrás do teclado).
// O "interactive-widget=resizes-content" do viewport já faz isso no Chrome; aqui é a reserva (Safari e afins).
// No app instalado (Android) o "100dvh" às vezes passa da área visível e o campo de mensagem ficava escondido
// embaixo da tela: a altura agora é sempre a da área que aparece de verdade (a menor entre a janela e a parte
// visível), e se mesmo assim o rodapé sair da tela, a conversa encolhe o que faltar.
if (window.visualViewport) {
  const vv = window.visualViewport;
  const raiz = document.documentElement.style;
  const acompanhar = () => {
    if (vv.scale > 1.05) return; // com zoom de pinça, não mexe
    const teclado = innerHeight - vv.height > 120;
    const alt = Math.round(Math.min(innerHeight, vv.height));
    raiz.setProperty("--vv", alt + "px");
    if (teclado && (scrollY || vv.offsetTop)) scrollTo(0, 0);
    if (teclado && document.activeElement?.id === "texto" && pertoDoFim()) irParaFim();
    requestAnimationFrame(() => {
      const rod = $("rodapeConversa");
      if (!rod || rod.hidden || !document.body.classList.contains("chat-aberto")) return;
      const fora = rod.getBoundingClientRect().bottom - (vv.height + vv.offsetTop);
      if (fora > 1) raiz.setProperty("--vv", Math.max(320, alt - Math.ceil(fora)) + "px");
    });
  };
  vv.addEventListener("resize", acompanhar);
  vv.addEventListener("scroll", acompanhar);
  addEventListener("resize", acompanhar);
  addEventListener("orientationchange", () => setTimeout(acompanhar, 300));
  addEventListener("pageshow", acompanhar);
  window.__hfMedirTela = acompanhar;
  acompanhar();
}
function ajustarAltura() {
  const t = $("texto");
  t.style.height = "42px";
  t.style.height = Math.min(t.scrollHeight, 140) + "px";
  atualizarBotaoEnviar();
}

function atualizarBotaoEnviar() {
  const temConteudo = !!$("texto").value.trim() || !!anexo || !!cartaoPendente;
  $("btnEnviar").setAttribute("aria-label", gravador ? "Enviar áudio" : "Enviar");
  $("btnEnviar").classList.toggle("vazio", !temConteudo && !gravador);
  $("btnAudio").hidden = !podeGravar();
}

let ultimoDigitando = 0;
function avisarDigitando() {
  if (!ativa || !config.mostrarDigitando || restritos.has(ativa.outroId) || bloqueado(ativa.outroId)) return;
  const agora = Date.now();
  if (agora - ultimoDigitando < 3500) return;
  ultimoDigitando = agora;
  fb.setDoc(refConversa(ativa.id), { digitando: { [eu.uid]: fb.serverTimestamp() } }, { merge: true }).catch(() => {});
}

$("texto").addEventListener("input", () => { ajustarAltura(); if ($("texto").value.trim()) avisarDigitando(); });
$("texto").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && config.enterEnvia && !e.isComposing) {
    e.preventDefault();
    enviar();
  }
});
$("texto").addEventListener("paste", (e) => {
  const arquivo = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith("image/"));
  if (!arquivo) return;
  e.preventDefault();
  const dt = new DataTransfer();
  dt.items.add(arquivo);
  $("inputArquivo").files = dt.files;
  $("inputArquivo").dispatchEvent(new Event("change"));
});
$("btnEnviar").addEventListener("click", () => enviar());
// Tocar em "enviar" não tira o foco do campo: no celular o teclado continua aberto
// (antes ele fechava e abria de novo a cada mensagem).
["pointerdown", "mousedown"].forEach((ev) => $("btnEnviar").addEventListener(ev, (e) => {
  if (document.activeElement === $("texto")) e.preventDefault();
}));
$("btnAudio").addEventListener("click", () => { if (!gravador) iniciarGravacao(); });

// ======================================================
// Áudio: com Storage vai como arquivo; sem Storage vai dentro da mensagem
// ======================================================
let gravador = null, partes = [], inicioGravacao = 0, timerGravacao = null, descartar = false;

async function iniciarGravacao() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    partes = [];
    descartar = false;
    try {
      gravador = new MediaRecorder(stream, storageFns ? undefined : { audioBitsPerSecond: 16000 });
    } catch {
      gravador = new MediaRecorder(stream);
    }
    gravador.ondataavailable = (e) => { if (e.data.size) partes.push(e.data); };
    gravador.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const tipo = gravador.mimeType || "audio/webm";
      gravador = null;
      clearInterval(timerGravacao);
      $("gravacao").hidden = true;
      $("caixaTexto").hidden = false;
      atualizarBotaoEnviar();
      if (descartar || !partes.length || !ativa) return;
      const blob = new Blob(partes, { type: tipo });
      try {
        toast("Enviando áudio...");
        let url;
        if (storageFns) {
          url = await enviarParaStorage(blob, tipo.includes("ogg") ? "ogg" : tipo.includes("mp4") ? "m4a" : "webm");
        } else {
          url = await new Promise((ok, falha) => {
            const leitor = new FileReader();
            leitor.onload = () => ok(leitor.result);
            leitor.onerror = () => falha(new Error("Não foi possível ler o áudio."));
            leitor.readAsDataURL(blob);
          });
          if (url.length > 900000) throw new Error("Áudio longo demais. Grave até 2 minutos.");
        }
        await publicarMensagem(ativa.id, { remetenteId: eu.uid, texto: "", criadoEm: fb.serverTimestamp(), arquivoUrl: url, tipoArquivo: "audio", nomeArquivo: "audio" });
        document.querySelectorAll(".toast").forEach((t) => t.remove());
      } catch (e) {
        console.error(e);
        toast(e.message && !e.code ? e.message : "Não foi possível enviar o áudio.");
      }
    };
    gravador.start();
    inicioGravacao = Date.now();
    $("caixaTexto").hidden = true;
    $("gravacao").hidden = false;
    $("gravacaoTempo").textContent = "0:00";
    atualizarBotaoEnviar();
    timerGravacao = setInterval(() => {
      const s = Math.floor((Date.now() - inicioGravacao) / 1000);
      $("gravacaoTempo").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
      if (s >= LIMITE_AUDIO_SEG()) pararGravacao(true);
    }, 250);
  } catch {
    toast("Permita o uso do microfone para gravar áudio.");
  }
}
function pararGravacao(enviarAudio) {
  if (!gravador) return;
  descartar = !enviarAudio;
  gravador.stop();
}
$("cancelarGravacao").addEventListener("click", () => pararGravacao(false));

// ======================================================
// Pesquisa dentro da conversa
// ======================================================
let achados = [], achadoAtual = -1;
function abrirBuscaChat() {
  $("buscaChat").hidden = false;
  $("buscaChatInput").focus();
}
function fecharBuscaChat() {
  $("buscaChat").hidden = true;
  $("buscaChatInput").value = "";
  document.querySelectorAll(".bolha.achada").forEach((b) => b.classList.remove("achada", "atual"));
  achados = []; achadoAtual = -1;
  $("buscaChatContador").textContent = "";
}
function executarBuscaChat(rolar = true) {
  const termo = $("buscaChatInput").value.trim().toLowerCase();
  document.querySelectorAll(".bolha.achada").forEach((b) => b.classList.remove("achada", "atual"));
  achados = [];
  if (termo) {
    document.querySelectorAll(".linha-msg").forEach((linha) => {
      const t = linha.querySelector(".texto");
      if (t && t.textContent.toLowerCase().includes(termo)) achados.push(linha.querySelector(".bolha"));
    });
  }
  achados.forEach((b) => b.classList.add("achada"));
  if (rolar) achadoAtual = achados.length - 1;
  else achadoAtual = Math.min(achadoAtual, achados.length - 1);
  mostrarAchado(rolar);
}
function mostrarAchado(rolar = true) {
  document.querySelectorAll(".bolha.atual").forEach((b) => b.classList.remove("atual"));
  const termo = $("buscaChatInput").value.trim();
  $("buscaChatContador").textContent = termo ? (achados.length ? `${achadoAtual + 1} de ${achados.length}` : "0 de 0") : "";
  const alvo = achados[achadoAtual];
  if (alvo) {
    alvo.classList.add("atual");
    if (rolar) alvo.scrollIntoView({ block: "center", behavior: "smooth" });
  }
}
function passoBusca(delta) {
  if (!achados.length) return;
  achadoAtual = (achadoAtual + delta + achados.length) % achados.length;
  mostrarAchado();
}
$("buscaChatInput").addEventListener("input", () => executarBuscaChat(true));
$("buscaChatInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); passoBusca(e.shiftKey ? 1 : -1); }
  if (e.key === "Escape") fecharBuscaChat();
});
$("buscaAnterior").addEventListener("click", () => passoBusca(-1));
$("buscaProxima").addEventListener("click", () => passoBusca(1));
$("buscaFechar").addEventListener("click", fecharBuscaChat);
$("btnBuscarNaConversa").addEventListener("click", () => ($("buscaChat").hidden ? abrirBuscaChat() : fecharBuscaChat()));

// ---------- ligações de voz e vídeo (chamadas.js) ----------
// Liga para a pessoa da conversa aberta; quando acaba, fica um cartão na conversa ("Ligação de voz · 3 min",
// "Chamada de vídeo perdida"). Quem recebe vê a tela de chamada em qualquer página (firebase.js → ouvirChamadas).
async function fazerLigacao(modo) {
  if (!ativa?.outroId) return;
  if (bloqueios.meus.has(ativa.outroId) || bloqueios.deles?.has?.(ativa.outroId)) { toast("Não é possível ligar para esta pessoa."); return; }
  const conv = ativa.id;
  const { ligar } = await import("./chamadas.js?v=7");
  const r = await ligar({ para: ativa.outroId, nome: ativa.nome, foto: ativa.foto, conv, tipo: modo });
  if (r.status === "erro") { toast(r.erro); return; }
  try { await publicarMensagem(conv, { remetenteId: eu.uid, texto: "", criadoEm: fb.serverTimestamp(), tipoArquivo: "cartao", cartao: { tipo: "chamada", modo, resultado: r.status, duracao: r.duracaoSeg || 0 } }); }
  catch (e) { console.warn("[Chamada] cartão", e); }
}
$("btnLigar").addEventListener("click", () => fazerLigacao("audio"));
$("btnVideo").addEventListener("click", () => fazerLigacao("video"));
// ---------- Registro de chamadas (aba Chamadas) ----------
// Lê chamadas/{id} em que a pessoa ligou (de) ou recebeu (para). Com o índice (de/para + criadoEm) vêm as 50 mais
// recentes de cada lado; sem ele, lê sem ordem e ordena aqui. "Limpar", "tirar do registro" e "visto" ficam no aparelho.
// Tela (09/11/2026): Nova chamada, filtros Todas · Perdidas · Recebidas · Feitas com contagem, busca por nome, ligações
// seguidas da mesma pessoa juntas numa linha ("Ana (3)"), e tocar na linha abre o histórico com aquela pessoa
// (Mensagem · Voz · Vídeo, cada ligação com hora e duração e o tempo total em ligação).
let chamadasLidas = null, filtroChamadas = "todas", buscaChamadas = "";
const chaveCham = () => `hf-chamadas-${eu?.uid}`;
const lerCfgCham = () => { try { return JSON.parse(localStorage.getItem(chaveCham()) || "{}"); } catch { return {}; } };
const gravarCfgCham = (x) => { try { localStorage.setItem(chaveCham(), JSON.stringify({ ...lerCfgCham(), ...x })); } catch {} };
const FILTROS_CHAM = [["todas", "Todas"], ["perdidas", "Perdidas"], ["recebidas", "Recebidas"], ["feitas", "Feitas"]];
// Duração pela sinalização (aceitaEm → fimEm): a mesma para os dois lados.
function situacaoChamada(c) {
  const saiu = c.de === eu.uid, falou = !!c.aceitaEm;
  const dur = falou && c.fimEm ? Math.max(0, Math.round((ms(c.fimEm) - ms(c.aceitaEm)) / 1000)) : 0;
  const resultado = falou ? (c.status === "aceita" ? "aceita" : "encerrada") : c.status;
  return { saiu, dur, ...descreverChamada({ modo: c.tipo, resultado, duracao: dur, saiu }) };
}
const outroDa = (c) => (c.de === eu.uid ? c.para : c.de);
function chamadasVisiveis() {
  const cfg = lerCfgCham(), tirados = cfg.tirados || {};
  return (chamadasLidas || []).filter((c) => ms(c.criadoEm) > (cfg.limpo || 0) && ms(c.criadoEm) > (tirados[outroDa(c)] || 0));
}
function perdidasNovas() {
  if (!chamadasLidas) return 0;
  const visto = lerCfgCham().visto || 0;
  return chamadasVisiveis().filter((c) => ms(c.criadoEm) > visto && situacaoChamada(c).perdida).length;
}
async function lerChamadas() {
  const col = fb.collection(fb.db, "chamadas");
  const lado = async (campo) => {
    try { return (await fb.getDocs(fb.query(col, fb.where(campo, "==", eu.uid), fb.orderBy("criadoEm", "desc"), fb.limit(50)))).docs; }
    catch (e) { if (e?.code === "permission-denied") return []; try { return (await fb.getDocs(fb.query(col, fb.where(campo, "==", eu.uid), fb.limit(150)))).docs; } catch { return []; } }
  };
  const [a, b] = await Promise.all([lado("de"), lado("para")]);
  const vistos = new Set();
  chamadasLidas = [...a, ...b].filter((d) => !vistos.has(d.id) && vistos.add(d.id)).map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }))
    .sort((x, y) => ms(y.criadoEm) - ms(x.criadoEm));
  return chamadasLidas;
}
// Nome e foto de quem está na ligação: da conversa (já carregada) ou do perfil público.
function pessoaDaChamada(c) {
  const conv = conversas.find((x) => x.id === c.conv) || conversas.find((x) => x.outroId === outroDa(c));
  return { uid: outroDa(c), conv, nome: conv?.nome || "", foto: conv?.foto || "" };
}
async function completarNomes(itens) {
  const faltam = [...new Set(itens.map((c) => pessoaDaChamada(c)).filter((p) => !p.nome).map((p) => p.uid))];
  const lidos = await Promise.all(faltam.map((u) => obterPerfil(u).then((p) => [u, p]).catch(() => [u, {}])));
  return new Map(lidos);
}
const diaDaChamada = (t) => { const d = new Date(t), hoje = new Date(), ontem = new Date(); ontem.setDate(hoje.getDate() - 1); return mesmoDia(d, hoje) ? "Hoje" : mesmoDia(d, ontem) ? "Ontem" : d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }); };
function setaChamada(sit) {
  const seta = document.createElementNS("http://www.w3.org/2000/svg", "svg"); seta.setAttribute("viewBox", "0 0 24 24");
  seta.setAttribute("class", "rc-seta " + (sit.perdida ? "perdida" : sit.saiu ? "saiu" : "entrou")); seta.setAttribute("aria-hidden", "true");
  seta.innerHTML = sit.saiu ? '<path d="M7 17L17 7M9 7h8v8"/>' : '<path d="M17 7L7 17M15 17H7V9"/>';
  return seta;
}
// Liga para a pessoa (abre a conversa e chama): da lista, do histórico e da Nova chamada.
async function ligarPara(convId, tipo) {
  if (!convId) { toast("Converse com a pessoa antes de ligar."); return; }
  await abrirConversa(convId);
  fazerLigacao(tipo === "video" ? "video" : "audio");
}
function botaoLigar(tipo, nome, convId, outro, cls = "rc-ligar") {
  const bt = elm("button", cls); bt.type = "button"; bt.appendChild(usar(tipo === "video" ? "videochamada" : "telefone", "i"));
  bt.setAttribute("aria-label", `${tipo === "video" ? "Chamada de vídeo" : "Chamada de voz"} para ${nome || "esta pessoa"}`);
  bt.disabled = !convId || bloqueado(outro);
  bt.addEventListener("click", (e) => { e.stopPropagation(); ligarPara(convId, tipo); });
  return bt;
}
// Ao trocar para Chamadas a lista de conversas some NA HORA (antes ficava alguns segundos até o servidor responder):
// com chamadas já lidas, desenha com elas primeiro e depois atualiza; sem elas, mostra o esqueleto.
let geracaoCham = 0;
async function renderizarChamadas(ler = true) {
  const lista = $("listaConversas");
  const minha = ler ? ++geracaoCham : geracaoCham;
  if (ler) {
    if (chamadasLidas) renderizarChamadas(false).catch(() => {});
    else {
      const esq = elm("div", "rc-esqueleto"); for (let i = 0; i < 5; i++) { const l = elm("div", "rc-sk"); l.append(elm("i", "sk-av"), elm("i", "sk-l1"), elm("i", "sk-l2")); esq.appendChild(l); }
      esq.setAttribute("aria-label", "Carregando as chamadas"); lista.replaceChildren(esq);
    }
    await lerChamadas();
    if (minha !== geracaoCham) return;
  }
  if (modo !== "chamadas") return;
  const visto = lerCfgCham().visto || 0;
  gravarCfgCham({ visto: Date.now() }); pintarModos();
  const todas = chamadasVisiveis();
  const extras = await completarNomes(todas);
  if (modo !== "chamadas" || minha !== geracaoCham) return;
  const quem = (c) => { const p = pessoaDaChamada(c), x = extras.get(p.uid) || {}; return { ...p, nome: p.nome || x.nome || "Usuário", foto: p.foto || x.fotoPerfil || "" }; };
  // Número na pílula Perdidas = só as perdidas NOVAS (desde a última vez que a aba foi aberta), como um aviso: some
  // depois de ver (antes ficava o total de perdidas para sempre).
  const conta = { todas: todas.length, perdidas: 0, recebidas: 0, feitas: 0, novas: 0 };
  todas.forEach((c) => { const s = situacaoChamada(c); if (s.perdida) { conta.perdidas++; if (ms(c.criadoEm) > visto) conta.novas++; } if (s.saiu) conta.feitas++; else conta.recebidas++; });
  const passa = (c) => { const s = situacaoChamada(c); return filtroChamadas === "perdidas" ? s.perdida : filtroChamadas === "recebidas" ? !s.saiu : filtroChamadas === "feitas" ? s.saiu : true; };
  const termo = semAcentoCham(buscaChamadas.trim());
  const itens = todas.filter(passa).filter((c) => !termo || semAcentoCham(quem(c).nome).includes(termo));

  // Topo: Nova chamada + limpar; filtros com contagem; busca (com várias ligações).
  const topo = elm("div", "rc-topo");
  const nova = elm("button", "rc-nova"); nova.type = "button"; nova.append(usar("telefone", "i s"), document.createTextNode("Nova chamada"));
  nova.addEventListener("click", abrirNovaChamada);
  topo.appendChild(nova);
  if (todas.length) {
    const limpar = elm("button", "rc-limpar"); limpar.type = "button"; limpar.setAttribute("aria-label", "Limpar o registro de chamadas"); limpar.title = "Limpar registro";
    limpar.append(usar("lixo", "i s"), document.createTextNode("Limpar"));
    limpar.addEventListener("click", async () => {
      if (!(await confirmarHF({ titulo: "Limpar o registro de chamadas?", texto: "As ligações somem desta lista só neste aparelho. Os cartões das ligações nas conversas continuam.", ok: "Limpar", icone: "lixo" }))) return;
      gravarCfgCham({ limpo: Date.now() }); renderizarChamadas();
    });
    topo.appendChild(limpar);
  }
  const filtros = elm("div", "rc-filtros"); filtros.setAttribute("role", "tablist"); filtros.setAttribute("aria-label", "Filtrar chamadas");
  FILTROS_CHAM.forEach(([k, rot]) => {
    const b = elm("button", "pill" + (filtroChamadas === k ? " on" : "") + (k === "perdidas" ? " perd" : "")); b.type = "button";
    b.setAttribute("role", "tab"); b.setAttribute("aria-selected", filtroChamadas === k ? "true" : "false");
    b.append(document.createTextNode(rot));
    if (k === "perdidas" && conta.novas) { b.appendChild(elm("span", "rc-num", String(conta.novas))); b.title = `${conta.novas} ${conta.novas === 1 ? "nova" : "novas"} de ${conta.perdidas}`; }
    else if (k !== "todas") b.title = `${conta[k]} ${conta[k] === 1 ? "chamada" : "chamadas"}`;
    b.addEventListener("click", () => { filtroChamadas = k; renderizarChamadas(); });
    filtros.appendChild(b);
  });
  const nos = [topo, filtros];
  if (!itens.length) {
    const vazio = elm("div", "rc-vazio");
    const ic = elm("span", "rc-vazio-ic"); ic.appendChild(usar(filtroChamadas === "perdidas" ? "check" : "telefone", "i"));
    const tit = termo ? "Ninguém com esse nome" : { perdidas: "Nenhuma chamada perdida", recebidas: "Nenhuma chamada recebida", feitas: "Você ainda não ligou" }[filtroChamadas] || "Nenhuma chamada ainda";
    vazio.append(ic, elm("strong", null, tit), elm("span", null, termo ? "Confira o nome ou limpe a busca." : "Ligações de voz e vídeo com quem você conversa aparecem aqui."));
    if (!termo && filtroChamadas === "todas") { const b = elm("button", "rc-nova"); b.type = "button"; b.append(usar("telefone", "i s"), document.createTextNode("Fazer uma chamada")); b.addEventListener("click", abrirNovaChamada); vazio.appendChild(b); }
    nos.push(vazio);
  }
  // Uma linha por pessoa (pedido do dono, 09/11/2026): todas as ligações com ela viram uma só, na posição da mais
  // recente, com quantas foram ("(13)"), como foi a última e um resumo (quantas perdidas). Tocar abre o histórico.
  const porPessoa = new Map();
  for (const c of itens) {
    const uid = outroDa(c);
    if (!porPessoa.has(uid)) porPessoa.set(uid, { uid, lista: [] });
    porPessoa.get(uid).lista.push(c);
  }
  let ultimoDia = "";
  for (const g of porPessoa.values()) {
    const c = g.lista[0], sit = situacaoChamada(c), p = quem(c);
    const dia = diaDaChamada(ms(c.criadoEm));
    if (dia !== ultimoDia) { nos.push(elm("div", "rc-dia", dia)); ultimoDia = dia; }
    const perdidas = g.lista.filter((x) => situacaoChamada(x).perdida);
    const novas = perdidas.filter((x) => x.de !== eu.uid && ms(x.criadoEm) > visto).length;
    const item = elm("div", "rc-item" + (sit.perdida ? " perdida" : "") + (novas ? " nova" : ""));
    item.tabIndex = 0; item.setAttribute("role", "button");
    const av = elm("div", "avatar"); pintarAvatar(av, p.foto, p.nome);
    const tx = elm("div", "rc-tx");
    // Linha 1: nome e sobrenome. Linha 2: seta + ícone, situação (cor própria), hora e duração numa pílula.
    // Linha 3 (várias ligações): "13 chamadas" e "2 perdidas" em etiquetas pequenas.
    const nome = elm("b", "rc-nome"); nome.title = p.nome; nome.append(elm("span", "rc-nm", nomeCurto(p.nome)));
    const linha = elm("small", "rc-linha");
    const tipoIc = usar(c.tipo === "video" ? "videochamada" : "telefone", "i rc-tipo");
    const sitTx = sit.perdida ? "Perdida" : sit.direcao === "Feita" ? (sit.falou ? "Feita" : sit.estado) : (sit.falou ? "Recebida" : sit.estado);
    const cls = sit.perdida ? "perdida" : sit.saiu ? "saiu" : "entrou";
    linha.append(setaChamada(sit), tipoIc, elm("span", "rc-sit " + cls, sitTx), elm("span", "rc-ponto", "·"), elm("span", "rc-hora", hora(new Date(ms(c.criadoEm)))));
    if (sit.falou && sit.dur) { const d = elm("span", "rc-dur"); d.append(usar("relogio", "i"), document.createTextNode(duracaoTexto(sit.dur))); linha.appendChild(d); }
    const partes = [sitTx, hora(new Date(ms(c.criadoEm)))]; if (sit.falou && sit.dur) partes.push(duracaoTexto(sit.dur));
    tx.append(nome, linha);
    if (g.lista.length > 1) {
      const res = elm("span", "rc-resumo");
      res.appendChild(elm("span", "rc-etq", `${g.lista.length} chamadas`));
      if (perdidas.length) res.appendChild(elm("span", "rc-etq perd", `${perdidas.length} ${perdidas.length === 1 ? "perdida" : "perdidas"}`));
      tx.appendChild(res);
    }
    item.setAttribute("aria-label", `${p.nome}, ${g.lista.length} ${g.lista.length === 1 ? "chamada" : "chamadas"}; a última: ${partes.join(", ")}. Ver histórico`);
    const lado = elm("div", "rc-lado");
    if (novas) lado.appendChild(elm("span", "rc-novas", String(novas)));
    lado.appendChild(botaoLigar(c.tipo, p.nome, p.conv?.id || c.conv, p.uid));
    item.append(av, tx, lado);
    const abrir = () => abrirDetalheChamadas(p);
    item.addEventListener("click", abrir);
    item.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(); } });
    nos.push(item);
  }
  lista.replaceChildren(...nos);
}
const semAcentoCham = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
// Histórico com uma pessoa: Mensagem · Voz · Vídeo, totais e cada ligação (dia, hora, tipo, situação e duração).
function abrirDetalheChamadas(p) {
  const { corpo, fechar } = abrirGaveta("Histórico de chamadas");
  corpo.classList.add("rcd");
  const minhas = chamadasVisiveis().filter((c) => outroDa(c) === p.uid);
  const convId = p.conv?.id || minhas[0]?.conv;
  // Cabeçalho: foto grande, nome e quando foi a última ligação.
  const cab = elm("div", "rcd-cab");
  const av = elm("div", "avatar"); pintarAvatar(av, p.foto, p.nome);
  const ultima = minhas[0] ? `Última: ${diaDaChamada(ms(minhas[0].criadoEm)).toLowerCase()} às ${hora(new Date(ms(minhas[0].criadoEm)))}` : "";
  cab.append(av, elm("strong", null, nomeCurto(p.nome)), elm("small", null, ultima));
  const acoes = elm("div", "rcd-acoes");
  const acao = (icone, rot, fn, off) => { const b = elm("button", "rcd-acao"); b.type = "button"; b.disabled = !!off; const ic = elm("span"); ic.appendChild(usar(icone, "i")); b.append(ic, elm("b", null, rot)); b.addEventListener("click", () => { fechar(); setTimeout(fn, 220); }); acoes.appendChild(b); };
  const sem = !convId || bloqueado(p.uid);
  acao("chat", "Mensagem", () => abrirConversa(convId), !convId);
  acao("telefone", "Voz", () => ligarPara(convId, "audio"), sem);
  acao("videochamada", "Vídeo", () => ligarPara(convId, "video"), sem);
  corpo.append(cab, acoes);
  if (sem && convId) corpo.appendChild(elm("p", "rcd-aviso", "Não é possível ligar para esta pessoa."));
  // Números: total, feitas, recebidas, perdidas e o tempo em ligação.
  const sits = minhas.map(situacaoChamada);
  const tot = sits.reduce((t, s) => t + s.dur, 0);
  const numeros = elm("div", "rcd-nums");
  [[minhas.length, minhas.length === 1 ? "Chamada" : "Chamadas", ""], [sits.filter((s) => s.saiu).length, "Feitas", "saiu"], [sits.filter((s) => !s.saiu && !s.perdida).length, "Recebidas", "entrou"], [sits.filter((s) => s.perdida).length, "Perdidas", "perdida"]]
    .forEach(([n, rot, cls]) => { const d = elm("div", "rcd-num " + cls); d.append(elm("b", null, String(n)), elm("span", null, rot)); numeros.appendChild(d); });
  corpo.appendChild(numeros);
  if (tot) { const t = elm("div", "rcd-total"); t.append(usar("relogio", "i s"), document.createTextNode(`${duracaoTexto(tot)} em ligação`)); corpo.appendChild(t); }
  // Cada ligação, por dia, num cartão.
  let ultimo = "", cartao = null;
  const box = elm("div", "rcd-lista");
  minhas.forEach((c, i) => {
    const dia = diaDaChamada(ms(c.criadoEm));
    if (dia !== ultimo) { box.appendChild(elm("div", "rcd-dia", dia)); cartao = elm("div", "rcd-cartao"); box.appendChild(cartao); ultimo = dia; }
    const s = sits[i];
    const tom = s.perdida ? "perdida" : s.saiu ? "saiu" : "entrou";
    const l = elm("div", "rcd-item " + tom);
    const ic = elm("span", "rcd-ic"); ic.appendChild(usar(c.tipo === "video" ? "videochamada" : "telefone", "i")); ic.appendChild(setaChamada(s));
    const t = elm("div", "rcd-t");
    const tipo = c.tipo === "video" ? "vídeo" : "voz";
    const titulo = s.perdida ? `Chamada de ${tipo} perdida` : `Chamada de ${tipo} ${s.saiu ? "feita" : "recebida"}`;
    t.append(elm("b", null, titulo), elm("small", null, s.falou ? hora(new Date(ms(c.criadoEm))) : `${hora(new Date(ms(c.criadoEm)))} · ${s.estado}`));
    l.append(ic, t, elm("span", "rcd-dur", s.falou ? s.estado : ""));
    cartao.appendChild(l);
  });
  corpo.appendChild(box);
  const tirar = elm("button", "pv-btn perigo rcd-tirar"); tirar.type = "button"; tirar.append(usar("lixo", "i s"), document.createTextNode("Tirar do registro"));
  tirar.addEventListener("click", async () => {
    if (!(await confirmarHF({ titulo: `Tirar as chamadas com ${p.nome}?`, texto: "Somem desta lista só neste aparelho. A conversa e os cartões das ligações continuam.", ok: "Tirar", icone: "lixo" }))) return;
    const cfg = lerCfgCham(); gravarCfgCham({ tirados: { ...(cfg.tirados || {}), [p.uid]: Date.now() } });
    fechar(); renderizarChamadas();
  });
  corpo.appendChild(tirar);
}
// Nova chamada: escolher alguém das suas conversas (busca pelo nome) e ligar por voz ou vídeo.
function abrirNovaChamada() {
  const { corpo, fechar } = abrirGaveta("Nova chamada");
  const busca = elm("label", "rc-busca"); busca.appendChild(usar("lupa", "i s"));
  const campo = elm("input"); campo.type = "search"; campo.placeholder = "Buscar nas suas conversas"; campo.setAttribute("aria-label", "Buscar pessoa");
  busca.appendChild(campo);
  const box = elm("div", "rcn-lista");
  corpo.append(busca, box);
  const pessoas = conversas.filter((c) => c.outroId && c.outroId !== eu.uid && !c.dados?.suporte && !c.dados?.equipe)
    .sort((a, b) => ms(b.dados?.atualizadoEm) - ms(a.dados?.atualizadoEm));
  const pintar = () => {
    const t = semAcentoCham(campo.value.trim());
    const l = pessoas.filter((c) => !t || semAcentoCham(c.nome).includes(t)).slice(0, 60);
    box.replaceChildren();
    if (!l.length) { box.appendChild(elm("div", "lista-vazia", pessoas.length ? "Ninguém com esse nome nas suas conversas." : "Você ainda não tem conversas. Mande uma mensagem para alguém e depois ligue.")); return; }
    for (const c of l) {
      const li = elm("div", "rcn-item");
      const av = elm("div", "avatar"); pintarAvatar(av, c.foto || "", c.nome || "Usuário");
      const tx = elm("div", "rc-tx"); tx.append(elm("b", null, nomeCurto(c.nome)));
      if (bloqueado(c.outroId)) tx.appendChild(elm("small", null, "Não é possível ligar"));
      const ligar = (tipo) => { const b = botaoLigar(tipo, c.nome, c.id, c.outroId); b.addEventListener("click", () => fechar(), true); return b; };
      li.append(av, tx, ligar("audio"), ligar("video"));
      box.appendChild(li);
    }
  };
  campo.addEventListener("input", pintar);
  pintar();
  if (!matchMedia("(pointer: coarse)").matches) setTimeout(() => campo.focus(), 250);
}
// Cartão da ligação na conversa (neutro dos dois lados, como os outros cartões): ícone, tipo, quem ligou e a situação
// (duração, Cancelada, Sem resposta, Perdida) e o botão para ligar de volta (em destaque quando é perdida).
function cartaoChamada(c, minha) {
  const d = descreverChamada({ modo: c.modo, resultado: c.resultado, duracao: c.duracao, saiu: minha });
  const box = elm("div", "lig " + d.tom); // "lig" (não "lg": .avatar.lg é o avatar grande)
  const cab = elm("div", "lg-cab");
  const ic = elm("span", "lg-ic"); ic.appendChild(usar(c.modo === "video" ? "videochamada" : "telefone", "i"));
  const tx = elm("div", "lg-tx");
  const lin = elm("small"); lin.append(setaChamada({ saiu: minha, perdida: d.perdida }), document.createTextNode(d.perdida ? "Você não atendeu" : `${minha ? "Você ligou" : "Ligou para você"} · ${d.estado}`));
  tx.append(elm("b", null, d.titulo), lin);
  cab.append(ic, tx);
  const de_novo = elm("button", "lg-bt"); de_novo.type = "button";
  de_novo.append(usar(c.modo === "video" ? "videochamada" : "telefone", "i s"), document.createTextNode(d.perdida ? "Retornar a chamada" : minha ? "Ligar de novo" : "Retornar"));
  de_novo.addEventListener("click", (e) => { e.stopPropagation(); fazerLigacao(c.modo === "video" ? "video" : "audio"); });
  box.append(cab, de_novo);
  return box;
}

// ======================================================
// Visualizador de fotos
// ======================================================
function abrirVisualizador(url) {
  const segura = urlSegura(url);
  if (!segura) return;
  $("visualizadorImg").src = segura;
  $("visualizadorBaixar").href = segura;
  $("visualizador").hidden = false;
  $("visualizadorFechar").focus();
}
function fecharVisualizador() {
  $("visualizador").hidden = true;
  $("visualizadorImg").removeAttribute("src");
}
$("visualizadorFechar").addEventListener("click", fecharVisualizador);
$("visualizador").addEventListener("click", (e) => { if (e.target.id === "visualizador") fecharVisualizador(); });

// ======================================================
// Painéis: nova conversa e configurações
// ======================================================
function abrirPainel(id) {
  fecharPaineis();
  $(id).classList.add("aberto");
  const corpo = $(id).querySelector(".painel-corpo"); if (corpo) corpo.scrollTop = 0; // abre sempre do começo
  // Uma entrada no histórico: o "voltar" do celular fecha o painel em vez de sair da página.
  const estado = { ...(history.state || {}), painel: id };
  if (history.state?.painel) history.replaceState(estado, "", location.href);
  else history.pushState(estado, "", location.href);
  if (id === "painelNova") { carregarPessoas(); setTimeout(() => $("buscaPessoas").focus(), 200); }
  if (id === "painelConfig") { pintarStatusNotificacao(); pintarRespostas(); pintarBloqueados(); pintarConfigAtendimento(); }
}
function fecharPaineis() { document.querySelectorAll(".painel.aberto").forEach((p) => p.classList.remove("aberto")); }
// Fechar pelo botão da tela desfaz a entrada do histórico criada ao abrir.
function voltarDoPainel() {
  if (history.state?.painel) history.back();
  else fecharPaineis();
}
document.querySelectorAll("[data-fechar-painel]").forEach((b) => b.addEventListener("click", voltarDoPainel));
// Botão "+" flutuante (como o WhatsApp): nova conversa; na aba Chamadas, nova chamada.
$("btnNovaConversa").addEventListener("click", () => (modo === "chamadas" ? abrirNovaChamada() : abrirPainel("painelNova")));
function pintarFab() {
  const b = $("btnNovaConversa"); if (!b) return;
  const ch = modo === "chamadas";
  b.querySelector("use")?.setAttribute("href", ch ? "#i-telefone" : "#i-nova");
  b.setAttribute("aria-label", ch ? "Nova chamada" : "Nova conversa"); b.title = b.getAttribute("aria-label");
}
$("btnConfig").addEventListener("click", () => abrirPainel("painelConfig"));

// Busca no Firebase só quem combina com o que foi digitado (pessoas.js).
let pessoasCache = [];
async function carregarPessoas() {
  const lista = $("listaPessoas");
  const termo = $("buscaPessoas").value.trim();
  if (!lista.children.length) {
    const s = document.createElement("div");
    s.className = "lista-vazia";
    s.textContent = "Carregando pessoas...";
    lista.replaceChildren(s);
  }
  const [achados] = await Promise.all([buscarPessoas(fb, termo, { limite: 30 }), termo ? null : lerOnline()]);
  if ($("buscaPessoas").value.trim() !== termo) return;
  const vivos = onlineSet();
  // Sem busca: quem está online agora vem primeiro (os seus contatos antes), depois quem esteve ativo.
  // Sem busca: quem está online fica na fileira "Online agora" em cima; a lista mostra o resto.
  const ja = new Set(termo || config.mostrarOnline === false ? [] : onlineTodos.filter((p) => vivos.has(p.uid)).map((p) => p.uid));
  pessoasCache = achados.filter((p) => p.uid !== eu.uid && !ja.has(p.uid) && !bloqueado(p.uid)).map((p) => ({ ...p, _on: vivos.has(p.uid) }));
  pintarOnline();
  renderizarPessoas();
}
function renderizarPessoas() {
  const lista = $("listaPessoas");
  const termo = $("buscaPessoas").value.trim();
  const itens = pessoasCache.slice(0, 60);
  lista.replaceChildren();
  if (!itens.length && !termo && !$("onlineAgora").hidden) return;
  if (!itens.length) {
    const v = document.createElement("div");
    v.className = "lista-vazia";
    v.textContent = termo ? "Ninguém encontrado com esse nome." : "Nenhuma pessoa para mostrar.";
    lista.appendChild(v);
    return;
  }
  if (!termo && !$("onlineAgora").hidden) { const h = document.createElement("div"); h.className = "conv-secao"; h.textContent = "Pessoas no Help Floripa"; lista.appendChild(h); }
  itens.forEach((p) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "conv-item" + (p._on && config.mostrarOnline !== false ? " on" : "");
    const av = document.createElement("div");
    av.className = "avatar";
    pintarAvatar(av, p.fotoPerfil, p.nome);
    const main = document.createElement("div");
    main.className = "conv-main";
    const nome = document.createElement("div");
    nome.className = "conv-nome";
    nome.textContent = p.nome || "Usuário";
    const sub = document.createElement("div");
    sub.className = "conv-previa";
    sub.textContent = p._on && config.mostrarOnline !== false ? (p.contato ? "Online agora · seu contato" : "Online agora") : p.nickname ? `@${p.nickname}` : (p.cidade || "");
    if (p._on && config.mostrarOnline !== false) sub.classList.add("oa-sub");
    main.append(nome, sub);
    item.append(av, main);
    item.addEventListener("click", () => iniciarConversaCom(p.uid));
    lista.appendChild(item);
  });
}
let tempoBuscaPessoas = null;
$("buscaPessoas").addEventListener("input", () => { clearTimeout(tempoBuscaPessoas); tempoBuscaPessoas = setTimeout(carregarPessoas, 300); });

async function iniciarConversaCom(uid) {
  const ids = [eu.uid, uid].sort();
  const id = `${ids[0]}_${ids[1]}`;
  try {
    let existe = false;
    try { existe = (await fb.getDoc(refConversa(id))).exists(); } catch {}
    if (!existe) await fb.setDoc(refConversa(id), { participantes: ids, ultimaMensagem: "", atualizadoEm: fb.serverTimestamp() }, { merge: true });
    fecharPaineis();
    abrirConversa(id);
  } catch (e) {
    console.error(e);
    toast("Não foi possível iniciar a conversa.");
  }
}

// Configurações
document.querySelectorAll("[data-cfg]").forEach((grupo) => {
  grupo.addEventListener("click", (e) => {
    const b = e.target.closest("[data-valor]");
    if (!b) return;
    if (grupo.dataset.cfg === "fundo" && b.dataset.valor === "foto") {
      let temFoto = false;
      try { temFoto = !!localStorage.getItem(CHAVE_FUNDO_FOTO); } catch {}
      if (!temFoto) { $("inputFundoFoto").click(); return; }
    }
    config[grupo.dataset.cfg] = b.dataset.valor;
    if (grupo.dataset.cfg === "fundo") config.fundoEscolhido = true;
    salvarConfig();
  });
});

$("btnTrocarFundoFoto").addEventListener("click", () => $("inputFundoFoto").click());
$("btnRemoverFundoFoto").addEventListener("click", () => {
  try { localStorage.removeItem(CHAVE_FUNDO_FOTO); } catch {}
  document.documentElement.style.removeProperty("--papel");
  config.fundo = CONFIG_PADRAO.fundo;
  salvarConfig();
});
$("inputFundoFoto").addEventListener("change", async () => {
  const arquivo = $("inputFundoFoto").files?.[0];
  $("inputFundoFoto").value = "";
  if (!arquivo) return;
  try {
    const { editarImagem } = await import("./editor-imagem.js?v=7");
    // A moldura tem o formato da área da conversa nesta tela.
    const area = document.querySelector(".chat");
    const larg = area.offsetWidth || window.innerWidth;
    const alt = area.offsetHeight || window.innerHeight;
    const proporcao = Math.min(2, Math.max(0.45, (larg || 390) / (alt || 844)));
    const dataUrl = await editarImagem(arquivo, {
      titulo: "Papel de parede da conversa",
      dica: "A moldura mostra a área da conversa nesta tela. Arraste e dê zoom; o que ficar fora da moldura não aparece.",
      proporcao,
      larguraSaida: proporcao < 1 ? 900 : 1600,
      qualidade: 0.72,
      limiteBytes: 1500000
    });
    if (!dataUrl) return;
    localStorage.setItem(CHAVE_FUNDO_FOTO, dataUrl);
    config.fundo = "foto";
    salvarConfig();
    toast("Papel de parede atualizado");
  } catch (e) {
    console.error(e);
    toast(e.name === "QuotaExceededError" ? "A foto é grande demais para salvar neste aparelho." : (e.message || "Não foi possível usar essa foto."));
  }
});
$("veuFundo").addEventListener("input", () => {
  config.veu = Number($("veuFundo").value);
  salvarConfig();
});
document.querySelectorAll("[data-cfg-bool]").forEach((inp) => {
  inp.addEventListener("change", () => {
    config[inp.dataset.cfgBool] = inp.checked;
    salvarConfig();
    if (inp.dataset.cfgBool === "mostrarOnline" || inp.dataset.cfgBool === "confirmacaoLeitura") {
      fb.setDoc(fb.doc(fb.db, "usuarios", eu.uid), { privacidade: { mostrarOnline: config.mostrarOnline !== false, confirmacaoLeitura: config.confirmacaoLeitura !== false } }, { merge: true })
        .then(() => toast("Salvo em todos os seus aparelhos")).catch(() => toast("Não foi possível salvar na sua conta."));
    }
    if (inp.dataset.cfgBool === "mostrarOnline") { marcarPresenca(); atualizarStatusTopo(); }
    if (inp.dataset.cfgBool === "mostrarDigitando") { renderizarLista(); atualizarStatusTopo(); }
    if (inp.dataset.cfgBool === "confirmacaoLeitura") { renderizarLista(); atualizarChecks(); }
  });
});

function pintarStatusNotificacao() {
  const btn = $("btnNotif");
  const st = $("notifStatus");
  if (!("Notification" in window)) { btn.hidden = true; st.textContent = "Este navegador não suporta notificações."; return; }
  if (Notification.permission === "granted") { btn.hidden = true; st.textContent = "Ativadas neste navegador."; }
  else if (Notification.permission === "denied") { btn.hidden = true; st.textContent = "Bloqueadas. Libere nas configurações do navegador."; }
  else { btn.hidden = false; st.textContent = "Avisos quando a aba estiver em segundo plano."; }
}
$("btnNotif").addEventListener("click", async () => {
  try { await Notification.requestPermission(); } catch {}
  pintarStatusNotificacao();
});

// ======================================================
// Presença (online / visto por último)
// ======================================================
function marcarPresenca() {
  if (!eu || document.hidden) return;
  const ref = fb.doc(fb.db, "perfis_publicos", eu.uid);
  const valor = config.mostrarOnline ? fb.serverTimestamp() : null;
  fb.setDoc(ref, { uid: eu.uid, ultimoAcesso: valor }, { merge: true }).catch(() => {});
}
// A cada 4 minutos (gravar todo minuto gastava a cota grátis do Firebase).
setInterval(marcarPresenca, 4 * 60000);
document.addEventListener("visibilitychange", marcarPresenca);

// ======================================================
// Sair da conta (fim das configurações), com confirmação
// ======================================================
// A mesma janela "Sair da conta?" do menu e das configurações do perfil (confirmar.js).
$("btnSairConta").addEventListener("click", () => import("./confirmar.js?v=6").then((m) => m.sairDaConta({ antes: () => { try { sessionStorage.removeItem(CHAVE_AVAL); } catch {} } })));

// ======================================================
// Atendimento do negócio (configurações)
// ======================================================
// Campos novos (horário por dia, almoço e data de volta) só são aceitos pelas regras novas do
// Firestore. Com as regras antigas no servidor, o perfil público recebe a versão compatível
// (horário resumido; a data de volta vai junto do aviso) e o atendimento completo fica na parte
// privada da conta (usuarios/{uid}.atendimento). Depois da publicação, completarAtendimento()
// grava o completo no perfil público sozinho.
const NOVOS_ATEND = ["semana", "almoco", "volta"];
let atendimentoPrivado = null;   // usuarios/{uid}.atendimento (lido em carregarPrivacidade)
let semanaEdit = [null, { ini: "09:00", fim: "18:00" }, { ini: "09:00", fim: "18:00" }, { ini: "09:00", fim: "18:00" }, { ini: "09:00", fim: "18:00" }, { ini: "09:00", fim: "18:00" }, null];
const refMeuPerfil = () => fb.doc(fb.db, "perfis_publicos", eu.uid);
// Lê o atendimento direto do servidor. Com o cache do aparelho, uma conexão lenta fazia a tela
// mostrar uma cópia antiga (os dias "voltavam") e, ao salvar de novo, a cópia antiga era regravada.
async function lerAtendimentoDoServidor() {
  const s = await comPrazo(fb.getDocFromServer(refMeuPerfil()), 9000);
  const at = s.exists() ? (s.data().atendimento || null) : null;
  meuPerfil.atendimento = at || undefined;
  return at;
}
// O que vale para editar: o público; se o completo (privado) tiver os campos novos que o
// público ainda não tem, vale o completo (salvo com as regras antigas no servidor).
// Só vale se o público ainda é a versão compatível DESTE completo (mesmo resumo e mesma
// ausência); se o público mudou depois (outro aparelho), o público é o mais novo.
const mesmoResumo = (a, b) => (!a && !b) || (!!a && !!b && a.inicio === b.inicio && a.fim === b.fim && [...(a.dias || [])].map(Number).sort().join() === [...(b.dias || [])].map(Number).sort().join());
const temNovosAtend = (x) => NOVOS_ATEND.some((k) => x?.[k] != null);
const privadoValeAtend = (pub, priv) => temNovosAtend(priv) && !temNovosAtend(pub)
  && mesmoResumo(pub.horario, priv.horario) && !!pub.ausente === !!priv.ausente;
function atendimentoParaEditar() {
  const pub = meuPerfil.atendimento || {}, priv = atendimentoPrivado || {};
  return privadoValeAtend(pub, priv) ? { ...pub, ...priv, resposta: pub.resposta } : pub;
}
const dataInput = (t) => { if (!ms(t)) return ""; const d = new Date(ms(t)); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
async function pintarConfigAtendimento() {
  const tem = (await negociosDoUsuario()).length > 0;
  $("secaoAtend").hidden = !tem;
  if (!tem) return;
  const sec = $("secaoAtend");
  sec.classList.add("carregando");
  definirStatusAtend("", "Carregando...");
  $("atendTempo").textContent = "Carregando o atendimento salvo...";
  let semServidor = false;
  try { await lerAtendimentoDoServidor(); }
  catch (e) { semServidor = true; console.warn("Atendimento lido do aparelho:", e?.code || e?.message); }
  sec.classList.remove("carregando");
  definirStatusAtend("", "As mudanças são salvas sozinhas.");
  const a = atendimentoParaEditar();
  const sem = semanaDe(a);
  $("atendHorarioLig").checked = !!sem;
  if (sem) semanaEdit = sem.map((f) => (f ? { ...f } : null));
  const al = faixa(a.almoco);
  $("atendAlmocoLig").checked = !!al;
  $("atendAlmocoIni").value = al?.ini || "12:00";
  $("atendAlmocoFim").value = al?.fim || "13:00";
  $("atendAusente").checked = !!a.ausente;
  $("atendVolta").value = dataInput(a.volta);
  $("atendMensagem").value = a.mensagem || "";
  $("atendTempo").textContent = semServidor
    ? "Sem conexão com o servidor agora: mostrando a última cópia deste aparelho. Confira antes de salvar."
    : respostaDoPerfil(meuPerfil) ? `Seu tempo médio de resposta: ${tempoTxt(respostaDoPerfil(meuPerfil).media)} (aparece nas conversas de negócio).` : "Todos que conversam com você veem isso no topo da conversa. O tempo médio de resposta aparece depois de 3 respostas.";
  pintarDiasAtend();
}
// Uma linha por dia (segunda primeiro): liga/desliga e horário de início e fim.
function pintarDiasAtend() {
  $("atendHorario").hidden = !$("atendHorarioLig").checked;
  $("atendAusencia").hidden = !$("atendAusente").checked;
  $("atendAlmoco").hidden = !$("atendAlmocoLig").checked;
  const box = $("atendSemana");
  box.replaceChildren();
  [1, 2, 3, 4, 5, 6, 0].forEach((d) => {
    const f = semanaEdit[d];
    const linha = document.createElement("div"); linha.className = "dia-linha" + (f ? " on" : ""); linha.dataset.dia = String(d);
    const tog = document.createElement("button"); tog.type = "button"; tog.className = "dia-tog";
    tog.setAttribute("aria-pressed", String(!!f)); tog.setAttribute("aria-label", `${DIAS_LONGOS[d]}: ${f ? "aberto" : "fechado"}`);
    tog.append(document.createElement("i"), DIAS_LONGOS[d].slice(0, 3));
    tog.addEventListener("click", () => {
      const modelo = semanaEdit.find(Boolean) || { ini: "09:00", fim: "18:00" };
      semanaEdit[d] = semanaEdit[d] ? null : { ...modelo };
      pintarDiasAtend(); agendarSalvarAtend();
    });
    const horas = document.createElement("div"); horas.className = "dia-horas";
    if (f) {
      const ini = document.createElement("input"); ini.type = "time"; ini.value = f.ini; ini.className = "ini"; ini.setAttribute("aria-label", `${DIAS_LONGOS[d]}: abre`);
      const fim = document.createElement("input"); fim.type = "time"; fim.value = f.fim; fim.className = "fim"; fim.setAttribute("aria-label", `${DIAS_LONGOS[d]}: fecha`);
      ini.addEventListener("change", () => { semanaEdit[d].ini = ini.value || "09:00"; pintarPreviaAtend(); agendarSalvarAtend(); });
      fim.addEventListener("change", () => { semanaEdit[d].fim = fim.value || "18:00"; pintarPreviaAtend(); agendarSalvarAtend(); });
      horas.append(ini, "às", fim);
    } else horas.appendChild(Object.assign(document.createElement("span"), { className: "fechado", textContent: "Fechado" }));
    linha.append(tog, horas);
    box.appendChild(linha);
  });
  pintarPreviaAtend();
}
// Atendimento escolhido na tela (completo, com os campos novos).
function atendimentoDaTela() {
  const lig = $("atendHorarioLig").checked && semanaEdit.some(Boolean);
  const semana = lig ? semanaEdit.map((f) => (f ? `${f.ini}-${f.fim}` : "")) : null;
  const abertos = lig ? semanaEdit.map((f, i) => (f ? i : null)).filter((x) => x != null) : [];
  const horario = lig ? { dias: abertos, inicio: abertos.map((i) => semanaEdit[i].ini).sort()[0], fim: abertos.map((i) => semanaEdit[i].fim).sort().pop() } : null;
  const almoco = lig && $("atendAlmocoLig").checked ? `${$("atendAlmocoIni").value || "12:00"}-${$("atendAlmocoFim").value || "13:00"}` : null;
  const ausente = $("atendAusente").checked;
  const v = ausente && $("atendVolta").value ? new Date($("atendVolta").value + "T00:00:00") : null;
  return { horario, semana, almoco, ausente, mensagem: $("atendMensagem").value.trim().slice(0, 200), volta: v && !isNaN(v) ? fb.Timestamp.fromDate(v) : null };
}
// Prévia: exatamente o que quem conversa com você vai ver agora.
function pintarPreviaAtend() {
  const a = atendimentoDaTela();
  const box = $("atendPrevia");
  box.replaceChildren();
  const sem = semanaDe(a);
  let txt = "";
  if (ausenteAgora(a)) txt = `Ausente${ms(a.volta) ? ` · volta ${dataVoltaTxt(a.volta)}` : " no momento"}${a.mensagem ? ` · ${a.mensagem}` : ""}${sem ? ` · Horário: ${resumoSemana(sem, a.almoco)}` : ""}`;
  else if (sem) { const st = situacaoHorario(sem, a.almoco); txt = `${st.txt} · ${resumoSemana(sem, a.almoco)}`; }
  if (!txt) return;
  box.append(Object.assign(document.createElement("b"), { textContent: "Como aparece agora: " }), txt);
}
// Tudo no atendimento salva sozinho (como o resto das configurações): antes era preciso tocar em
// "Salvar atendimento" lá embaixo, e quem saía sem tocar perdia o que tinha mudado.
["atendHorarioLig", "atendAusente", "atendAlmocoLig"].forEach((id) => $(id).addEventListener("change", () => { pintarDiasAtend(); agendarSalvarAtend(); }));
["atendAlmocoIni", "atendAlmocoFim", "atendVolta"].forEach((id) => $(id).addEventListener("input", () => { pintarPreviaAtend(); agendarSalvarAtend(); }));
$("atendMensagem").addEventListener("input", () => { pintarPreviaAtend(); agendarSalvarAtend(1500); });
$("atendVoltaLimpar").addEventListener("click", () => { $("atendVolta").value = ""; pintarPreviaAtend(); agendarSalvarAtend(); });
$("atendCopiar").addEventListener("click", () => {
  const modelo = semanaEdit[[1, 2, 3, 4, 5, 6, 0].find((d) => semanaEdit[d])];
  if (!modelo) { toast("Abra pelo menos um dia primeiro."); return; }
  semanaEdit = semanaEdit.map((f) => (f ? { ...modelo } : null));
  pintarDiasAtend(); agendarSalvarAtend();
  toast(`Horário ${horaTxt(modelo.ini)}–${horaTxt(modelo.fim)} em todos os dias abertos`);
});
// Versão que as regras antigas aceitam: sem os campos novos; a data de volta vai no aviso.
function atendimentoCompativel(a) {
  const c = { horario: a.horario, ausente: a.ausente, mensagem: a.mensagem };
  if (a.ausente && ms(a.volta)) {
    const extra = `Volto em ${new Date(ms(a.volta)).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}.`;
    c.mensagem = (a.mensagem ? `${a.mensagem} ${extra}` : extra).slice(0, 200);
  }
  return c;
}
// Grava no perfil público: completo; se o servidor recusar (regras antigas), a versão compatível.
// Devolve true quando o completo foi aceito.
async function gravarAtendimentoPublico(a) {
  try { await comPrazo(fb.setDoc(refMeuPerfil(), { uid: eu.uid, atendimento: a }, { merge: true }), 15000); return true; }
  catch (e) {
    if (e?.code !== "permission-denied") throw e;
    await comPrazo(fb.setDoc(refMeuPerfil(), { uid: eu.uid, atendimento: atendimentoCompativel(a) }, { merge: true }), 15000);
    try { localStorage.setItem("hf-atend-antigas-" + eu.uid, String(Date.now())); } catch {}
    return false;
  }
}
function definirStatusAtend(cls, texto) { const st = $("atendStatus"); st.className = "atend-status" + (cls ? " " + cls : ""); st.textContent = texto; }
// Salva logo depois da última mudança (um salvamento por vez; o que mudar durante entra no próximo).
let tempoAtend = null, salvandoAtend = false, deNovoAtend = false;
function agendarSalvarAtend(espera = 700) {
  clearTimeout(tempoAtend);
  definirStatusAtend("", "Alterações ainda não salvas...");
  tempoAtend = setTimeout(salvarAtendimento, espera);
}
// Saiu da página (ou trocou de app) logo depois de mudar: salva na hora.
addEventListener("visibilitychange", () => { if (document.hidden && tempoAtend) { clearTimeout(tempoAtend); tempoAtend = null; salvarAtendimento(); } });
async function salvarAtendimento() {
  tempoAtend = null;
  if (salvandoAtend) { deNovoAtend = true; return; }
  const atendimento = atendimentoDaTela();
  const errado = semanaEdit.findIndex((f) => f && hm(f.fim) <= hm(f.ini));
  const al = faixa(atendimento.almoco);
  const problema = $("atendHorarioLig").checked && !atendimento.semana ? "Abra pelo menos um dia ou desligue o horário."
    : atendimento.semana && errado >= 0 ? `${DIAS_LONGOS[errado]}: o horário de fechar precisa ser depois do de abrir.`
    : al && hm(al.fim) <= hm(al.ini) ? "O fim do almoço precisa ser depois do início."
    : atendimento.volta && ms(atendimento.volta) <= Date.now() ? "A data de volta precisa ser depois de hoje." : "";
  if (problema) { definirStatusAtend("erro", problema + " (não salvo)"); return; }
  salvandoAtend = true;
  definirStatusAtend("salvando", "Salvando...");
  try {
    // Cópia completa na parte privada da conta (sempre aceita) e depois o perfil público.
    await comPrazo(fb.setDoc(fb.doc(fb.db, "usuarios", eu.uid), { atendimento }, { merge: true }), 15000).catch((e) => console.warn("Cópia do atendimento não salva:", e?.code || e));
    atendimentoPrivado = atendimento;
    const completo = await gravarAtendimentoPublico(atendimento);
    // Confere no servidor o que ficou gravado.
    const gravado = await lerAtendimentoDoServidor().catch(() => null);
    const esperado = completo ? atendimento : atendimentoCompativel(atendimento);
    const igual = gravado && mesmoResumo(gravado.horario, esperado.horario) && !!gravado.ausente === esperado.ausente
      && (!completo || (JSON.stringify(gravado.semana || null) === JSON.stringify(atendimento.semana) && (gravado.almoco || null) === atendimento.almoco));
    if (!gravado) definirStatusAtend("ok", "✓ Salvo neste aparelho. Aparece para os clientes quando a conexão voltar.");
    else if (!igual && !deNovoAtend) definirStatusAtend("erro", "Não ficou salvo como você escolheu. Mude de novo para tentar outra vez.");
    else definirStatusAtend("ok", completo ? "✓ Salvo" : "✓ Salvo (por enquanto os clientes veem o horário resumido)");
  } catch (e) {
    console.error(e);
    definirStatusAtend("erro", e?.code === "permission-denied" ? "O servidor recusou o atendimento. Fale com o suporte." : "Não foi possível salvar. Confira sua internet; vamos tentar de novo na próxima mudança.");
  } finally {
    salvandoAtend = false;
    if (deNovoAtend) { deNovoAtend = false; salvarAtendimento(); }
  }
}
// Atendimento salvo com as regras antigas no servidor: assim que as regras novas estiverem
// publicadas, grava o completo no perfil público (tenta no máximo uma vez por dia).
async function completarAtendimento() {
  const priv = atendimentoPrivado, pub = meuPerfil.atendimento || {};
  if (!priv || !privadoValeAtend(pub, priv)) return;
  let ultima = 0; try { ultima = Number(localStorage.getItem("hf-atend-antigas-" + eu.uid) || 0); } catch {}
  if (Date.now() - ultima < 864e5) return;
  if (!(await negociosDoUsuario()).length) return;
  try {
    const { resposta, ...semResposta } = priv;
    if (await gravarAtendimentoPublico(semResposta)) { meuPerfil.atendimento = { ...pub, ...semResposta }; console.info("[Atendimento] Perfil público completado."); }
  } catch (e) { console.warn("[Atendimento] Não completou:", e?.code || e?.message); }
}

// ======================================================
// Notas do negócio sobre o cliente (só o dono vê)
// ======================================================
const ETIQUETAS_PADRAO = ["Cliente fiel", "Cliente novo", "VIP", "Pagamento pendente", "Atenção", "Indicou amigos"];
const notasClientes = new Map();
async function carregarNotasClientes() {
  if (!(await negociosDoUsuario()).length) return;
  try {
    const snap = await fb.getDocs(fb.query(fb.collection(fb.db, "notas_clientes"), fb.where("donoId", "==", eu.uid), fb.limit(300)));
    snap.docs.forEach((d) => notasClientes.set(d.data().clienteId, d.data()));
    renderizarLista();
  } catch (e) { console.warn("Notas dos clientes indisponíveis:", e?.code || e); }
}
let notasEtiquetas = [];
async function abrirNotas() {
  if (!ativa) return;
  const n = notasClientes.get(ativa.outroId) || {};
  notasEtiquetas = Array.isArray(n.etiquetas) ? [...n.etiquetas] : [];
  const quem = $("notasQuem");
  quem.replaceChildren();
  const av = document.createElement("div"); av.className = "avatar sm"; pintarAvatar(av, ativa.foto, ativa.nome);
  const tx = document.createElement("div"); const nm = document.createElement("strong"); nm.textContent = ativa.nome || "Cliente";
  const sb = document.createElement("small"); sb.textContent = "Anotações particulares do seu negócio";
  tx.append(nm, sb); quem.append(av, tx);
  $("notasTexto").value = n.nota || "";
  pintarEtiquetas();
  abrirPainel("painelNotas");
}
function pintarEtiquetas() {
  const box = $("notasEtiquetas");
  box.replaceChildren();
  [...new Set([...ETIQUETAS_PADRAO, ...notasEtiquetas])].forEach((t) => {
    const b = document.createElement("button"); b.type = "button"; b.textContent = t;
    const on = notasEtiquetas.includes(t);
    b.className = on ? "on" : ""; b.setAttribute("aria-pressed", String(on));
    b.addEventListener("click", () => {
      if (on) notasEtiquetas = notasEtiquetas.filter((x) => x !== t);
      else if (notasEtiquetas.length >= 8) { toast("Até 8 etiquetas por cliente."); return; }
      else notasEtiquetas.push(t);
      pintarEtiquetas();
    });
    box.appendChild(b);
  });
}
function adicionarEtiqueta() {
  const t = $("notasNovaEtiqueta").value.trim().slice(0, 24);
  if (!t) return;
  if (!notasEtiquetas.includes(t)) { if (notasEtiquetas.length >= 8) { toast("Até 8 etiquetas por cliente."); return; } notasEtiquetas.push(t); }
  $("notasNovaEtiqueta").value = "";
  pintarEtiquetas();
}
$("notasAddEtiqueta").addEventListener("click", adicionarEtiqueta);
$("notasNovaEtiqueta").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); adicionarEtiqueta(); } });
$("notasSalvar").addEventListener("click", async () => {
  if (!ativa) return;
  const clienteId = ativa.outroId;
  const dados = { donoId: eu.uid, clienteId, etiquetas: notasEtiquetas.slice(0, 8), nota: $("notasTexto").value.trim().slice(0, 1000), atualizadoEm: fb.serverTimestamp() };
  try {
    await fb.setDoc(fb.doc(fb.db, "notas_clientes", `${eu.uid}_${clienteId}`), dados);
    notasClientes.set(clienteId, dados);
    renderizarLista();
    toast("Notas salvas");
    voltarDoPainel();
  } catch (e) { console.error(e); toast("Não foi possível salvar as notas."); }
});

// ======================================================
// Ajuda e suporte sem sair das mensagens
// ======================================================
// link: abre direto um chamado ou aviso (suporte.html?chamado=... / ?aviso=...).
function abrirSuporte(link = "") {
  const q = $("quadroSuporte");
  if (typeof link === "string" && link) q.src = link;
  else if (!q.getAttribute("src")) q.src = "suporte.html";
  abrirPainel("painelSuporte");
}
$("btnSuporte").addEventListener("click", () => abrirSuporte(itensSuporte.find((i) => i.naoLida) ? "suporte.html" : ""));

// Suporte Help Floripa: respostas do suporte e avisos da equipe ainda não abertos aparecem
// numa faixa no topo da lista (conta oficial, com selo) e no número do botão de suporte.
let itensSuporte = [];
function pintarFaixaSuporte(itens) {
  itensSuporte = itens;
  const novos = itens.filter((i) => i.naoLida);
  const b = $("badgeSuporte");
  b.hidden = !novos.length; b.textContent = novos.length > 9 ? "9+" : String(novos.length);
  const f = $("faixaSuporte");
  f.hidden = !novos.length;
  if (!novos.length) return;
  const nome = $("fsNome"); nome.replaceChildren("Suporte Help Floripa", seloOficial());
  const i = novos[0];
  $("fsTexto").textContent = `${TEXTO_EQUIPE(i).replace(/^./, (c) => c.toUpperCase())}: ${i.tipo === "aviso" ? i.titulo : i.detalhe}`;
  $("fsQtd").textContent = String(novos.length);
  f.setAttribute("aria-label", `Suporte Help Floripa, conta oficial: ${novos.length} ${novos.length === 1 ? "novidade" : "novidades"}`);
  f.onclick = () => abrirSuporte(novos.length === 1 ? linkEquipe(i) : "suporte.html");
}
document.querySelectorAll("[data-suporte]").forEach((a) => a.addEventListener("click", (e) => {
  if (e.ctrlKey || e.metaKey || e.shiftKey) return;
  e.preventDefault();
  abrirSuporte();
}));

// ======================================================
// Foto de perfil (pelas configurações): mesma moldura do perfil
// ======================================================
const OPCOES_FOTO = { titulo: "Foto de perfil", dica: "O círculo mostra exatamente como sua foto aparece. Deixe o rosto dentro da linha tracejada.", proporcao: 1, circulo: true, larguraSaida: 480, qualidade: 0.86, limiteBytes: 250000 };
async function trocarFotoPerfil(arquivo) {
  try {
    const dataUrl = await editarImagem(arquivo, OPCOES_FOTO);
    if (!dataUrl) return;
    toast("Salvando foto...");
    let url = dataUrl;
    if (storageFns && window.firebaseStorage) {
      try {
        const r = storageFns.ref(window.firebaseStorage, `fotosPerfil/${eu.uid}_${Date.now().toString(36)}.jpg`);
        await storageFns.uploadBytes(r, dataUrlParaBlob(dataUrl), { contentType: "image/jpeg", cacheControl: "public, max-age=31536000, immutable" });
        url = await storageFns.getDownloadURL(r);
      } catch (e) { console.warn("Storage indisponível, salvando no documento:", e); }
    }
    await Promise.all([
      fb.setDoc(fb.doc(fb.db, "usuarios", eu.uid), { fotoPerfil: url }, { merge: true }),
      fb.setDoc(fb.doc(fb.db, "perfis_publicos", eu.uid), { uid: eu.uid, fotoPerfil: url }, { merge: true })
    ]);
    meuPerfil.fotoPerfil = url;
    perfis.delete(eu.uid);
    const nome = meuPerfil.nome || eu.displayName || "Você";
    pintarAvatar($("cfgAvatar"), url, nome);
    pintarAvatar($("barraAvatar"), url, nome);
    toast("Foto de perfil atualizada");
  } catch (e) { console.error(e); toast("Não foi possível salvar a foto."); }
}
["cfgTrocarFoto", "cfgFotoBt"].forEach((id) => $(id).addEventListener("click", () => $("cfgArquivoFoto").click()));
$("cfgArquivoFoto").addEventListener("change", () => {
  const f = $("cfgArquivoFoto").files?.[0];
  $("cfgArquivoFoto").value = "";
  if (f) trocarFotoPerfil(f);
});

// ======================================================
// Configurações: respostas rápidas, contas bloqueadas, atalhos e restaurar
// ======================================================
const CHAVE_RESPOSTAS = "hf-chat-respostas";
function lerRespostas() {
  try { const r = JSON.parse(localStorage.getItem(CHAVE_RESPOSTAS) || "[]"); return Array.isArray(r) ? r.filter((x) => typeof x === "string") : []; } catch { return []; }
}
function gravarRespostas(lista) { try { localStorage.setItem(CHAVE_RESPOSTAS, JSON.stringify(lista.slice(0, 20))); } catch {} }
function pintarRespostas() {
  const lista = lerRespostas();
  $("rrResumo").textContent = lista.length ? `${lista.length} ${lista.length === 1 ? "resposta salva" : "respostas salvas"} · use no menu ⋮ da conversa.` : "Textos prontos para responder com um toque (no menu ⋮ da conversa).";
  const box = $("rrLista");
  box.replaceChildren();
  if (!lista.length) { const v = document.createElement("div"); v.className = "vazio"; v.textContent = "Nenhuma resposta ainda. Escreva abaixo e toque em Adicionar."; box.appendChild(v); return; }
  lista.forEach((t, i) => {
    const l = document.createElement("div"); l.className = "item";
    const tx = document.createElement("span"); tx.className = "tx"; tx.textContent = t;
    const rm = document.createElement("button"); rm.type = "button"; rm.className = "btn-sec"; rm.textContent = "Remover";
    rm.addEventListener("click", () => { const nova = lerRespostas(); nova.splice(i, 1); gravarRespostas(nova); pintarRespostas(); });
    l.append(tx, rm);
    box.appendChild(l);
  });
}
$("btnRespostas").addEventListener("click", () => {
  const abrir = $("rrBox").hidden;
  $("rrBox").hidden = !abrir;
  $("btnRespostas").setAttribute("aria-expanded", String(abrir));
  $("btnRespostas").textContent = abrir ? "Fechar" : "Gerenciar";
  if (abrir) { pintarRespostas(); $("rrTexto").focus(); }
});
function adicionarResposta() {
  const t = $("rrTexto").value.trim();
  if (!t) { $("rrTexto").focus(); return; }
  const lista = lerRespostas();
  if (lista.length >= 20) { toast("Máximo de 20 respostas rápidas."); return; }
  if (!lista.includes(t)) { lista.push(t); gravarRespostas(lista); }
  $("rrTexto").value = "";
  pintarRespostas();
  toast("Resposta rápida salva");
}
$("rrAdd").addEventListener("click", adicionarResposta);
$("rrTexto").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); adicionarResposta(); } });
// Na conversa: escolhe uma resposta e ela vai para o campo de texto (a pessoa ainda pode editar).
function abrirRespostasRapidas() {
  const lista = lerRespostas();
  const menu = $("menuMsg");
  menu.replaceChildren();
  const item = (rotulo, ic, acao) => {
    const b = document.createElement("button"); b.type = "button"; b.setAttribute("role", "menuitem");
    b.append(icone(ic, "i"), document.createTextNode(rotulo));
    b.addEventListener("click", () => { fecharMenu(); acao(); });
    menu.appendChild(b);
  };
  lista.forEach((t) => item(t.length > 60 ? t.slice(0, 58) + "…" : t, "responder", () => {
    const campo = $("texto");
    campo.value = campo.value ? campo.value.trimEnd() + " " + t : t;
    campo.dispatchEvent(new Event("input", { bubbles: true }));
    campo.focus();
  }));
  if (lista.length) menu.appendChild(document.createElement("hr"));
  item(lista.length ? "Gerenciar respostas" : "Criar respostas rápidas", "config", () => { abrirPainel("painelConfig"); if ($("rrBox").hidden) $("btnRespostas").click(); setTimeout(() => $("rrBox").scrollIntoView({ block: "center" }), 250); });
  menu.hidden = false;
  const r = $("btnMenuConversa").getBoundingClientRect();
  const mr = menu.getBoundingClientRect();
  menu.style.left = Math.max(8, r.right - mr.width) + "px";
  menu.style.top = (r.bottom + 4) + "px";
}

// Contas bloqueadas: lista com desbloquear.
async function pintarBloqueados() {
  const uids = [...bloqueios.meus];
  $("blqResumo").textContent = uids.length ? `${uids.length} ${uids.length === 1 ? "conta bloqueada" : "contas bloqueadas"}` : "Ninguém bloqueado.";
  const box = $("blqBox");
  if (box.hidden) return;
  box.replaceChildren();
  if (!uids.length) { const v = document.createElement("div"); v.className = "vazio"; v.textContent = "Você não bloqueou ninguém."; box.appendChild(v); return; }
  const perfisB = await Promise.all(uids.map((u) => obterPerfil(u).catch(() => ({}))));
  uids.forEach((u, i) => {
    const p = perfisB[i] || {};
    const l = document.createElement("div"); l.className = "item";
    const av = document.createElement("div"); av.className = "avatar sm"; pintarAvatar(av, p.fotoPerfil, p.nome);
    const tx = document.createElement("span"); tx.className = "tx"; tx.textContent = p.nome || "Usuário";
    const b = document.createElement("button"); b.type = "button"; b.className = "btn-sec"; b.textContent = "Desbloquear";
    b.addEventListener("click", async () => {
      b.disabled = true;
      try {
        await fb.deleteDoc(fb.doc(fb.db, "bloqueios", `${eu.uid}_${u}`));
        bloqueios.meus.delete(u);
        if (ativa?.outroId === u) aplicarBloqueio();
        renderizarLista();
        toast(`${p.nome || "Contato"} desbloqueado`);
        pintarBloqueados();
      } catch { b.disabled = false; toast("Não foi possível desbloquear."); }
    });
    l.append(av, tx, b);
    box.appendChild(l);
  });
}
$("btnBloqueados").addEventListener("click", () => {
  const abrir = $("blqBox").hidden;
  $("blqBox").hidden = !abrir;
  $("btnBloqueados").setAttribute("aria-expanded", String(abrir));
  pintarBloqueados();
});

// Atalhos para as conversas restritas e arquivadas.
document.querySelectorAll("[data-ir-filtro]").forEach((b) => b.addEventListener("click", () => {
  const f = b.dataset.irFiltro;
  const pill = document.querySelector(`.pill[data-filtro="${f}"]`);
  if (pill) pill.hidden = false;
  voltarDoPainel();
  setTimeout(() => { if (ativa) fecharConversa(); pill?.click(); }, 60);
}));

// Restaurar padrões deste aparelho (online e confirmação de leitura são da conta: ficam como estão).
$("btnRestaurar").addEventListener("click", async () => {
  if (!(await confirmarHF({ titulo: "Restaurar o padrão?", texto: "Tema, papel de parede, tamanho do texto, sons e atalhos voltam ao padrão. Suas respostas rápidas continuam salvas.", ok: "Restaurar", icone: "recarregar", cor: "normal" }))) return;
  config = { ...CONFIG_PADRAO, mostrarOnline: config.mostrarOnline, confirmacaoLeitura: config.confirmacaoLeitura };
  salvarConfig();
  toast("Padrões restaurados");
});
if (!("vibrate" in navigator)) $("linhaVibrar").hidden = true;

// ======================================================
// Atalhos e botões gerais
// ======================================================
$("btnFecharConversa").addEventListener("click", () => {
  if (history.state?.conversa) history.back();
  else fecharConversa();
});
$("btnQuem").addEventListener("click", verPerfil);
$("btnMenuConversa").addEventListener("click", (e) => { e.stopPropagation(); abrirMenuConversa(); });
$("buscaConversas").addEventListener("input", () => {
  // Na aba Chamadas a mesma lupa procura nas ligações (pelo nome).
  if (modo === "chamadas") { buscaChamadas = $("buscaConversas").value; clearTimeout(window.__hfBuscaCham); window.__hfBuscaCham = setTimeout(renderizarChamadas, 200); return; }
  renderizarLista();
});
document.querySelectorAll(".pill").forEach((p) => p.addEventListener("click", () => {
  filtro = p.dataset.filtro;
  document.querySelectorAll(".pill").forEach((x) => {
    x.classList.toggle("on", x === p);
    x.setAttribute("aria-selected", x === p ? "true" : "false");
  });
  renderizarLista();
}));
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!$("visualizador").hidden) return fecharVisualizador();
  if (!$("menuMsg").hidden) return fecharMenu();
  if (document.querySelector(".painel.aberto")) return voltarDoPainel();
  if (selecionando) return sairSelecao();
  if (!$("buscaChat").hidden) return fecharBuscaChat();
  if (respondendo) return cancelarResposta();
});

// ======================================================
// Inicialização
// ======================================================
function falhaGeral(texto) {
  $("carregandoApp").hidden = true;
  $("chatVazioTexto").textContent = texto;
  $("listaConversas").replaceChildren();
  const v = document.createElement("div");
  v.className = "lista-vazia";
  v.textContent = texto;
  $("listaConversas").appendChild(v);
}

async function iniciar() {
  for (let i = 0; i < 100 && (!window.firebaseAuth || !window.firebaseDb); i++) {
    await new Promise((r) => setTimeout(r, 50));
  }
  if (!window.firebaseAuth || !window.firebaseDb) {
    falhaGeral("Não foi possível conectar ao Help Floripa. Abra esta página pelo site (helpfloripa.com.br) e verifique sua internet.");
    return;
  }

  const [auth, firestore] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"),
  ]);
  fb = { ...firestore, db: window.firebaseDb };
  authMod = auth;
  if (window.firebaseStorage) {
    try {
      storageFns = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js");
      $("inputArquivo").accept = "image/*,video/*";
      $("btnAnexar").setAttribute("aria-label", "Anexar foto ou vídeo");
    } catch { storageFns = null; }
  }

  auth.onAuthStateChanged(window.firebaseAuth, async (usuario) => {
    if (!usuario) { if (window.__hfIrLogin) window.__hfIrLogin(); else irPara("login.html"); return; }
    if (eu?.uid === usuario.uid) return;
    eu = usuario;
    conferirEmail(eu);
    // As duas leituras juntas (antes uma esperava a outra) e da cópia do aparelho quando houver.
    [meuPerfil] = await Promise.all([obterPerfil(eu.uid), carregarPrivacidade()]);
    const meuNome = meuPerfil.nome || eu.displayName || "Você";
    pintarAvatar($("cfgAvatar"), meuPerfil.fotoPerfil || eu.photoURL, meuNome);
    $("cfgNome").textContent = meuNome;
    $("cfgNick").textContent = meuPerfil.nickname ? `@${meuPerfil.nickname}` : (eu.email || "");
    pintarAvatar($("barraAvatar"), meuPerfil.fotoPerfil || eu.photoURL, meuNome);

    atualizarBotaoEnviar();
    marcarPresenca();
    ouvirConversas();
    ligarPuxarConversas();
    ouvirItensEquipe(fb, fb.db, eu.uid, pintarFaixaSuporte);
    setTimeout(completarAtendimento, 4000);
    carregarNotasClientes(); // etiquetas dos clientes (para quem tem negócio)
    $("carregandoApp").hidden = true;

    // A lista fica no histórico, então "voltar" na conversa retorna para ela.
    const inicial = new URLSearchParams(location.search).get("conversa");
    if (inicial) {
      // Na gaveta (por cima de outra página, ex.: "Responder" de dentro de um flash), a conversa abre sem passo
      // novo no histórico: um "voltar" fecha a gaveta e a pessoa volta para onde estava.
      let naGaveta = false; try { naGaveta = window.top !== window.self && window.top.location.origin === location.origin && !document.documentElement.classList.contains("na-rede"); } catch {}
      // Vindo de outra página do site para responder (ex.: caixa de perguntas do flash, &volta=1): também sem passo
      // novo, então UM "voltar" (ou a seta do topo) volta para lá — e o flash reabre.
      const volta = new URLSearchParams(location.search).get("volta") === "1";
      if (naGaveta || volta) abrirConversa(inicial, { historico: false });
      else { history.replaceState({}, "", "mensagens.html"); abrirConversa(inicial); }
    }
  });
}

iniciar().catch((e) => {
  console.error(e);
  falhaGeral("Não foi possível carregar as mensagens agora. Tente novamente em instantes.");
});

// ======================================================
// Emojis e figurinhas (09/11/2026): painel no lugar do teclado, como no WhatsApp.
// Emojis: recentes + categorias + busca em português (emojis.js). Figurinhas (figurinhas.js): criar de uma foto,
// importar .webp do WhatsApp, favoritas, recentes, as suas e o pacote da Help Floripa. Tocar envia na hora.
// ======================================================
const painelE = $("painelEmoji"), corpoE = $("peCorpo"), catsE = $("peCats"), buscaE = $("peBusca");
let abaE = "emojis", selTexto = null;
function painelAberto() { return !painelE.hidden; }
function abrirPainelEmoji(aba) {
  const campo = $("texto");
  selTexto = { ini: campo.selectionStart ?? campo.value.length, fim: campo.selectionEnd ?? campo.value.length };
  if (document.activeElement === campo) campo.blur(); // fecha o teclado
  if (aba) abaE = aba;
  painelE.hidden = false; painelE.classList.add("aberto");
  $("btnEmoji").setAttribute("aria-expanded", "true");
  pintarPainelE();
  requestAnimationFrame(() => window.__hfMedirTela?.());
}
function fecharPainelEmoji() {
  if (painelE.hidden) return;
  painelE.hidden = true; painelE.classList.remove("aberto", "expandido"); painelE.style.removeProperty("--pe-h"); fecharMenuFig();
  $("btnEmoji").setAttribute("aria-expanded", "false");
  buscaE.value = "";
  requestAnimationFrame(() => window.__hfMedirTela?.());
}
// Arrastar para cima = painel maior (como no WhatsApp); para baixo = volta ao tamanho normal ou fecha.
// Vale pela alça, pelo topo do painel e pela própria lista (puxando para cima no começo, ou para baixo no topo dela).
(() => {
  const normal = () => Math.round(Math.min(320, innerHeight * 0.42));
  const maximo = () => Math.max(normal() + 60, Math.round((window.visualViewport?.height || innerHeight) - 150));
  let ar = null, semClique = false;
  const altura = () => painelE.getBoundingClientRect().height;
  const aplicar = (h) => { painelE.style.setProperty("--pe-h", Math.round(h) + "px"); window.__hfMedirTela?.(); };
  const comecar = (y) => { ar = { y0: y, h0: altura(), ult: y, t: performance.now(), v: 0, ativo: false }; };
  const mover = (y) => {
    if (!ar) return false;
    if (!ar.ativo) { if (Math.abs(y - ar.y0) < 8) return false; ar.ativo = true; painelE.classList.add("arrastando"); }
    const agora = performance.now(); ar.v = (y - ar.ult) / Math.max(1, agora - ar.t); ar.ult = y; ar.t = agora;
    aplicar(Math.max(110, Math.min(maximo(), ar.h0 + (ar.y0 - y))));
    return true;
  };
  const terminar = () => {
    if (!ar) return; const a = ar; ar = null;
    painelE.classList.remove("arrastando");
    if (!a.ativo) return;
    semClique = true; setTimeout(() => { semClique = false; }, 60);
    const h = altura(), n = normal(), mx = maximo(), estava = painelE.classList.contains("expandido");
    if (a.v < -0.45 || (a.v <= 0.45 && h > (n + mx) / 2)) expandir(true);
    else if ((a.v > 0.45 && !estava) || h < n * 0.62) { fecharPainelEmoji(); }
    else expandir(false);
  };
  function expandir(sim) {
    painelE.classList.toggle("expandido", sim);
    aplicar(sim ? maximo() : normal());
    $("peAlca").setAttribute("aria-label", sim ? "Arraste para baixo para diminuir" : "Arraste para cima para ver mais");
  }
  window.__hfPeExpandir = expandir;
  painelE.addEventListener("pointerdown", (e) => {
    if (!e.target.closest(".pe-alca, .pe-topo") || e.target.closest("input")) return;
    comecar(e.clientY);
    const mv = (ev) => { if (mover(ev.clientY)) ev.preventDefault(); };
    const up = () => { terminar(); removeEventListener("pointermove", mv); removeEventListener("pointerup", up); removeEventListener("pointercancel", up); };
    addEventListener("pointermove", mv, { passive: false }); addEventListener("pointerup", up); addEventListener("pointercancel", up);
  });
  painelE.addEventListener("click", (e) => { if (semClique) { e.preventDefault(); e.stopPropagation(); } }, true);
  $("peAlca").addEventListener("click", () => expandir(!painelE.classList.contains("expandido")));
  // pela lista: puxar para cima quando ainda não está grande; puxar para baixo estando no topo
  let tq = null;
  corpoE.addEventListener("touchstart", (e) => { if (e.touches.length !== 1) { tq = null; return; } tq = { y: e.touches[0].clientY, x: e.touches[0].clientX, decidido: false, painel: false }; }, { passive: true });
  corpoE.addEventListener("touchmove", (e) => {
    if (!tq) return;
    const y = e.touches[0].clientY, dy = y - tq.y, dx = e.touches[0].clientX - tq.x;
    if (!tq.decidido) {
      if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;
      tq.decidido = true;
      const exp = painelE.classList.contains("expandido");
      tq.painel = Math.abs(dy) > Math.abs(dx) && ((!exp && dy < 0) || (corpoE.scrollTop <= 0 && dy > 0));
      if (tq.painel) comecar(tq.y);
    }
    if (tq.painel) { e.preventDefault(); mover(y); }
  }, { passive: false });
  const fimToque = () => { if (tq?.painel) terminar(); tq = null; };
  corpoE.addEventListener("touchend", fimToque); corpoE.addEventListener("touchcancel", fimToque);
  addEventListener("resize", () => { if (!painelE.hidden && painelE.classList.contains("expandido")) aplicar(maximo()); });
})();
$("btnEmoji").addEventListener("click", () => { if (painelAberto()) { fecharPainelEmoji(); $("texto").focus(); } else abrirPainelEmoji(); });
// tocar no campo de texto = volta o teclado (o painel sai)
$("texto").addEventListener("pointerdown", () => fecharPainelEmoji());
painelE.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); if (menuFig) fecharMenuFig(); else fecharPainelEmoji(); } });
painelE.querySelectorAll("[data-pe]").forEach((b) => b.addEventListener("click", () => { abaE = b.dataset.pe; buscaE.value = ""; pintarPainelE(); }));
buscaE.addEventListener("input", () => pintarCorpoE());
// Apagar (⌫): tira o último caractere/emoji antes do cursor, sem abrir o teclado
$("peApagar").addEventListener("click", () => {
  const campo = $("texto"); const ini = selTexto?.ini ?? campo.value.length, fim = selTexto?.fim ?? ini;
  let antes = campo.value.slice(0, ini);
  if (fim === ini && antes) {
    const partes = typeof Intl !== "undefined" && Intl.Segmenter ? [...new Intl.Segmenter("pt", { granularity: "grapheme" }).segment(antes)].map((x) => x.segment) : [...antes];
    partes.pop(); antes = partes.join("");
  }
  campo.value = antes + campo.value.slice(fim);
  selTexto = { ini: antes.length, fim: antes.length };
  campo.dispatchEvent(new Event("input", { bubbles: true }));
  ajustarAltura(); atualizarBotaoEnviar();
});
function porEmoji(e) {
  const campo = $("texto"); const ini = selTexto?.ini ?? campo.value.length, fim = selTexto?.fim ?? ini;
  campo.value = campo.value.slice(0, ini) + e + campo.value.slice(fim);
  selTexto = { ini: ini + e.length, fim: ini + e.length };
  campo.dispatchEvent(new Event("input", { bubbles: true }));
  ajustarAltura(); atualizarBotaoEnviar();
  usarEmoji(eu?.uid, e);
}
function pintarPainelE() {
  painelE.querySelectorAll("[data-pe]").forEach((b) => b.setAttribute("aria-selected", b.dataset.pe === abaE ? "true" : "false"));
  painelE.classList.toggle("figs", abaE === "figurinhas");
  buscaE.placeholder = abaE === "emojis" ? "Pesquisar emoji" : "Pesquisar figurinha";
  buscaE.parentElement.hidden = false;
  $("peApagar").hidden = abaE !== "emojis";
  pintarCorpoE();
}
function botaoEmoji(e) {
  const b = elm("button", null, e); b.type = "button"; b.setAttribute("aria-label", e);
  b.addEventListener("click", () => porEmoji(e));
  return b;
}
function secaoE(id, titulo, extra) {
  const h = elm("div", "pe-sec", titulo); h.dataset.sec = id;
  if (extra) h.appendChild(elm("small", null, extra));
  return h;
}
function pintarCorpoE() {
  fecharMenuFig();
  if (abaE === "figurinhas") { pintarFigurinhas(); return; }
  const termo = buscaE.value.trim();
  corpoE.replaceChildren(); catsE.replaceChildren();
  if (termo) {
    const achados = buscarEmojis(termo);
    if (!achados.length) { corpoE.appendChild(elm("div", "pe-vazio", "Nenhum emoji para “" + termo + "”. Tente outra palavra, como feliz, amor ou festa.")); return; }
    const g = elm("div", "pe-grade"); achados.forEach((e) => g.appendChild(botaoEmoji(e)));
    corpoE.append(secaoE("busca", "Resultados"), g);
    return;
  }
  const recentes = emojisRecentes(eu?.uid);
  const grupos = [];
  if (recentes.length) grupos.push(["recentes", "Recentes", null, recentes]);
  EMOJI_CATS.forEach(([id, nome, ic]) => grupos.push([id, nome, ic, listaDa(id)]));
  for (const [id, nome, , lista] of grupos) {
    const g = elm("div", "pe-grade");
    lista.forEach((e) => g.appendChild(botaoEmoji(e)));
    corpoE.append(secaoE(id, nome), g);
  }
  grupos.forEach(([id, nome, ic]) => {
    const b = elm("button"); b.type = "button"; b.dataset.cat = id; b.setAttribute("aria-label", nome); b.title = nome;
    if (ic) b.textContent = ic; else b.appendChild(usar("relogio", "i"));
    b.addEventListener("click", () => { const h = corpoE.querySelector(`[data-sec="${id}"]`); if (h) corpoE.scrollTo({ top: h.offsetTop - 4, behavior: "smooth" }); });
    catsE.appendChild(b);
  });
  marcarCatE();
}
// categoria acesa conforme a rolagem
function marcarCatE() {
  const secs = [...corpoE.querySelectorAll("[data-sec]")];
  let atualId = secs[0]?.dataset.sec;
  const off = 30 + (corpoE.querySelector(".pe-humor")?.offsetHeight || 0);
  for (const h of secs) if (h.offsetTop - corpoE.scrollTop <= off) atualId = h.dataset.sec;
  catsE.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.cat === atualId));
}
corpoE.addEventListener("scroll", () => requestAnimationFrame(marcarCatE), { passive: true });

// ---------- figurinhas ----------
let menuFig = null;
function fecharMenuFig() {
  if (!menuFig) return;
  const m = menuFig; menuFig = null;
  document.querySelectorAll(".pe-fig.segurada").forEach((x) => x.classList.remove("segurada"));
  m.classList.add("saindo"); setTimeout(() => m.remove(), 160);
}
// Atalhos de humor (como "Oi", "Haha", "Amor" do WhatsApp): filtram pelo texto das figurinhas.
const HUMORES = [["👋", "Oi", /\boi\b|ol[aá]|bom dia|boa (noite|tarde)|e a[ií]/], ["😂", "Haha", /k{3,}|haha|rs\b|rindo/], ["❤️", "Amor", /ame[il]|amo|amor|lind/],
  ["🙏", "Valeu", /valeu|obrigad|parab[eé]ns/], ["👍", "Ok", /combinado|fechado|\bok\b|beleza|pix|chegando|volto/], ["😮", "Uau", /s[eé]rio|uau|nossa|hmm/], ["😢", "Triste", /poxa|triste|chor/]];
let humorE = null;
async function pintarFigurinhas() {
  const termo = semAcentoCham(buscaE.value.trim());
  const [minhas, pacote] = await Promise.all([eu ? minhasFigurinhas(eu.uid) : [], pacoteHelp()]);
  if (abaE !== "figurinhas") return;
  const topoAntes = corpoE.scrollTop;
  corpoE.replaceChildren(); catsE.replaceChildren();
  const daConta = minhas.filter((x) => !x.pacote);
  const favoritas = minhas.filter((x) => x.fav);
  const recentes = minhas.filter((x) => x.usadoEm).sort((a, b) => b.usadoEm - a.usadoEm).slice(0, 15);
  const grade = (lista, opc = {}) => {
    const g = elm("div", "pe-figs");
    if (opc.criar) {
      const c = elm("button", "pe-criar"); c.type = "button";
      const ic = elm("span", "pe-criar-ic"); ic.appendChild(usar("adicionar", "i"));
      c.append(ic, elm("b", null, "Criar"), elm("small", null, "figurinha"));
      c.addEventListener("click", (e) => { e.stopPropagation(); abrirMenuCriar(); });
      g.appendChild(c);
    }
    lista.forEach((it) => g.appendChild(tileFig(it)));
    return g;
  };
  // fileira de humores (fica presa no alto ao rolar)
  const hum = elm("div", "pe-humor"); hum.setAttribute("role", "toolbar"); hum.setAttribute("aria-label", "Filtrar por humor");
  HUMORES.forEach(([e, n, re]) => {
    const b = elm("button", "pe-chip" + (humorE === n ? " on" : "")); b.type = "button"; b.append(elm("span", "pe-chip-e", e), document.createTextNode(n));
    b.addEventListener("click", () => { humorE = humorE === n ? null : n; buscaE.value = ""; corpoE.scrollTop = 0; pintarFigurinhas(); });
    hum.appendChild(b);
  });
  corpoE.appendChild(hum);
  const re = humorE ? HUMORES.find((h) => h[1] === humorE)?.[2] : null;
  if (termo || re) {
    const todas = [...pacote.itens, ...daConta];
    const achadas = todas.filter((x) => { const t = semAcentoCham(x.texto || ""); return termo ? t.includes(termo) : re.test(t); });
    if (!achadas.length) corpoE.appendChild(elm("div", "pe-vazio", termo ? "Nenhuma figurinha com “" + buscaE.value.trim() + "”." : `Nenhuma figurinha de “${humorE}” ainda. Crie uma com texto!`));
    else corpoE.append(secaoE("busca", termo ? "Resultados" : `${HUMORES.find((h) => h[1] === humorE)[0]} ${humorE}`, `${achadas.length}`), grade(achadas));
    pintarCatsFig([]);
    return;
  }
  const secoes = [];
  if (recentes.length) secoes.push(["recentes", "Recentes", "relogio", recentes]);
  if (favoritas.length) secoes.push(["favoritas", "Favoritas", "estrela-c", favoritas]);
  secoes.push(["minhas", "Suas figurinhas", "figurinha", daConta, true]);
  secoes.push(["helpfloripa", pacote.nome || "Help Floripa", null, pacote.itens]);
  for (const [id, nome, , lista, criar] of secoes) {
    corpoE.append(secaoE(id, nome, id === "minhas" ? `${daConta.length}` : id === "helpfloripa" ? `Pacote · ${lista.length}` : ""), grade(lista, { criar }));
    if (id === "minhas" && !daConta.length) corpoE.appendChild(elm("p", "pe-dica", "Crie figurinhas das suas fotos (recortar, tirar o fundo, contorno, texto, emojis e desenho) ou importe do WhatsApp (.webp 512×512). Segure uma figurinha para favoritar, editar ou apagar."));
  }
  pintarCatsFig(secoes);
  corpoE.scrollTop = topoAntes;
  marcarCatE();
}
// Barra de baixo das figurinhas: uma por seção + "Criar" sempre à mão
function pintarCatsFig(secoes) {
  catsE.replaceChildren();
  secoes.forEach(([id, nome, ic]) => {
    const b = elm("button"); b.type = "button"; b.dataset.cat = id; b.setAttribute("aria-label", nome); b.title = nome;
    if (ic) b.appendChild(usar(ic, "i")); else { const im = elm("img"); im.src = "figurinhas/capa.png"; im.alt = ""; im.dataset.semSuave = "1"; im.style.cssText = "width:24px;height:24px;object-fit:contain"; b.appendChild(im); }
    b.addEventListener("click", () => { const h = corpoE.querySelector(`[data-sec="${id}"]`); if (h) corpoE.scrollTo({ top: h.offsetTop - 50, behavior: "smooth" }); });
    catsE.appendChild(b);
  });
  const novo = elm("button", "pe-novo"); novo.type = "button"; novo.setAttribute("aria-label", "Criar figurinha"); novo.title = "Criar figurinha";
  novo.appendChild(usar("adicionar", "i"));
  novo.addEventListener("click", (e) => { e.stopPropagation(); abrirMenuCriar(); });
  catsE.appendChild(novo);
}
// Criar: da galeria, da câmera (selfie) ou importar uma pronta
function abrirMenuCriar() {
  fecharMenuFig();
  const m = elm("div", "pe-menu"); m.setAttribute("role", "menu");
  m.appendChild(elm("div", "pe-menu-tit", "Nova figurinha"));
  const op = (ic, txt, sub, fn) => { const b = elm("button"); b.type = "button"; b.setAttribute("role", "menuitem"); const t = elm("span", "pe-menu-tx"); t.append(elm("b", null, txt), elm("small", null, sub)); b.append(usar(ic, "i"), t); b.addEventListener("click", () => { fecharMenuFig(); fn(); }); m.appendChild(b); };
  op("imagem", "Criar de uma foto", "Recorte, tire o fundo, escreva e desenhe", () => $("inputFigurinha").click());
  op("camera", "Tirar uma foto", "Abre a câmera e depois o editor", () => $("inputFigCamera").click());
  op("baixar", "Importar figurinha", "Arquivo .webp do WhatsApp (animada também)", () => $("inputFigurinha").click());
  op("fechar", "Cancelar", "", () => {});
  painelE.appendChild(m); menuFig = m;
}
function tileFig(it) {
  const b = elm("button", "pe-fig"); b.type = "button"; b.setAttribute("aria-label", it.texto ? `Figurinha ${it.texto}` : "Figurinha");
  const im = elm("img"); im.src = it.url; im.alt = ""; im.loading = "lazy"; im.decoding = "async"; im.dataset.semSuave = "1";
  b.appendChild(im);
  if (it.fav) { const f = usar("estrela-c", "fav"); b.appendChild(f); }
  let segurou = false, t = null;
  b.addEventListener("pointerdown", () => { segurou = false; clearTimeout(t); t = setTimeout(() => { segurou = true; navigator.vibrate?.(12); abrirMenuFig(it, b); }, 450); });
  ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, () => clearTimeout(t)));
  b.addEventListener("contextmenu", (e) => { e.preventDefault(); if (!segurou) { segurou = true; abrirMenuFig(it, b); } });
  b.addEventListener("click", () => { if (segurou) { segurou = false; return; } enviarFigurinha(it.url, !it.id || it.pacote); });
  return b;
}
// Segurar uma figurinha (como no WhatsApp): a figurinha fica marcada na grade e abre uma folha por cima do painel com
// ela grande, de onde ela vem e as opções. Tocar fora (no fundo escurecido), em Fechar ou voltar fecha.
async function abrirMenuFig(it, tile) {
  fecharMenuFig();
  document.querySelector(".pe-folha-fundo")?.remove();
  tile?.classList.add("segurada");
  const fundo = elm("div", "pe-menu pe-folha-fundo"); fundo.setAttribute("role", "dialog"); fundo.setAttribute("aria-label", "Opções da figurinha");
  const folha = elm("div", "pe-folha");
  const fechar = elm("button", "pe-folha-x"); fechar.type = "button"; fechar.setAttribute("aria-label", "Fechar"); fechar.appendChild(usar("fechar", "i"));
  fechar.addEventListener("click", fecharMenuFig);
  const prev = elm("div", "pe-folha-fig"); const im = elm("img"); im.src = it.url; im.alt = it.texto ? `Figurinha ${it.texto}` : "Figurinha"; im.dataset.semSuave = "1"; prev.appendChild(im);
  const origem = it.pacote || !it.id ? "Pacote Help Floripa" : "Suas figurinhas";
  const leg = elm("div", "pe-folha-leg"); leg.append(elm("b", null, it.texto || "Figurinha"), elm("span", null, " · " + origem));
  const topo = elm("div", "pe-folha-topo"); topo.append(fechar, prev, leg);
  const lista = elm("div", "pe-folha-ops"); lista.setAttribute("role", "menu");
  const op = (ic, txt, fn, perigo) => { const b = elm("button", perigo ? "perigo" : ""); b.type = "button"; b.setAttribute("role", "menuitem"); b.append(usar(ic, "i"), document.createTextNode(txt)); b.addEventListener("click", async () => { fecharMenuFig(); await fn(); pintarFigurinhas(); }); lista.appendChild(b); };
  op("enviar", "Enviar", () => enviarFigurinha(it.url, !it.id || it.pacote));
  const guardado = it.id ? it : await usarFigurinhaSemUso(it.url);
  op("estrela-c", guardado?.fav ? "Tirar das favoritas" : "Adicionar às favoritas", async () => { const g = guardado || await guardarFigurinha(eu.uid, it.url, { pacote: true }); await atualizarFigurinha(g.id, { fav: !g.fav }); toast(g.fav ? "Tirada das favoritas" : "Adicionada às favoritas"); });
  op("lapis", "Editar (salva uma nova)", async () => { await editarFigurinha(it.url); });
  if (it.id && !it.pacote) op("lixo", "Remover das suas figurinhas", async () => { await apagarFigurinha(it.id); toast("Figurinha removida"); }, true);
  folha.append(elm("span", "pe-folha-alca"), topo, lista);
  fundo.appendChild(folha);
  // tocar fora da folha (no fundo) fecha
  fundo.addEventListener("pointerdown", (e) => { if (e.target === fundo) { e.preventDefault(); fecharMenuFig(); } });
  // folha na tela toda (como no WhatsApp): o fundo escuro cobre a conversa e o painel; tocar em qualquer parte fora fecha
  fundo.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); fecharMenuFig(); } });
  document.body.appendChild(fundo); menuFig = fundo;
  requestAnimationFrame(() => fechar.focus({ preventScroll: true }));
}
// já está guardada (como recente/favorita)? (não marca uso)
async function usarFigurinhaSemUso(url) { try { const l = await minhasFigurinhas(eu.uid); return l.find((x) => x.url === url) || null; } catch { return null; } }

async function enviarFigurinha(url, doPacote) {
  if (!ativa || !eu) return;
  if (emailPendente(eu)) { mostrarAvisoEmail(eu); toast(MSG_EMAIL); return; }
  try {
    const dado = await paraDataUrl(url);
    const resposta = respondendo;
    const dados = { remetenteId: eu.uid, texto: "", criadoEm: fb.serverTimestamp(), tipoArquivo: "imagem", arquivoUrl: dado, nomeArquivo: NOME_FIG };
    if (resposta) dados.resposta = { id: resposta.id, texto: resumoMensagem(resposta).slice(0, 160), remetenteId: resposta.remetenteId };
    cancelarResposta();
    usarFigurinha(eu.uid, url, doPacote).then(() => { if (abaE === "figurinhas" && painelAberto()) pintarFigurinhas(); });
    await publicarMensagem(ativa.id, dados);
  } catch (e) {
    console.error("Figurinha:", e);
    toast(e?.code === "limite-diario" || (e?.message && !e?.code) ? e.message : "Não foi possível enviar a figurinha.");
  }
}
// Escolheu um arquivo: WebP 512×512 (do WhatsApp) entra direto; foto abre o editor.
async function editarFigurinha(url) {
  try {
    const img = await new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = url; });
    const r = await criarFigurinha(img, { forma: "livre", contorno: false, titulo: "Editar figurinha" });
    if (!r) return;
    await guardarFigurinha(eu.uid, r.url, r.texto ? { texto: r.texto } : {});
    toast("Nova figurinha salva");
  } catch (e) { console.warn(e); toast("Não foi possível editar esta figurinha."); }
}
["inputFigurinha", "inputFigCamera"].forEach((id) => $(id).addEventListener("change", async () => {
  const arq = $(id).files?.[0]; $(id).value = "";
  if (!arq) return;
  try {
    const r = await prepararArquivo(arq);
    const feito = r.pronta ? { url: r.url } : await criarFigurinha(r.img);
    const url = feito?.url;
    if (!url) return;
    await guardarFigurinha(eu.uid, url, feito.texto ? { texto: feito.texto } : {});
    toast(r.pronta ? "Figurinha importada" : "Figurinha criada");
    abaE = "figurinhas"; humorE = null; if (!painelAberto()) abrirPainelEmoji("figurinhas"); else pintarPainelE();
  } catch (e) { console.warn(e); toast(e?.message === "Escolha uma imagem." ? e.message : "Não foi possível usar essa imagem."); }
}));
// Figurinha recebida: ver grande, guardar nas suas e favoritar
async function abrirFigurinhaRecebida(url, minha) {
  const { corpo, fechar } = abrirGaveta("Figurinha");
  const box = elm("div", "fgv");
  const im = elm("img"); im.src = url; im.alt = "Figurinha"; im.dataset.semSuave = "1";
  box.appendChild(im);
  const ja = eu ? await jaGuardada(eu.uid, url) : null;
  if (ja) {
    box.appendChild(elm("small", null, "Já está nas suas figurinhas."));
    const fav = elm("button", "pv-btn"); fav.type = "button"; fav.append(usar("estrela-c", "i s"), document.createTextNode(ja.fav ? "Tirar das favoritas" : "Favoritar"));
    fav.addEventListener("click", async () => { await atualizarFigurinha(ja.id, { fav: !ja.fav }); toast(ja.fav ? "Tirada das favoritas" : "Adicionada às favoritas"); fechar(); });
    box.appendChild(fav);
  } else {
    box.appendChild(elm("small", null, minha ? "Você enviou esta figurinha." : "Guarde para usar nas suas conversas. Fica salva neste aparelho."));
    const add = elm("button", "pv-btn pri"); add.type = "button"; add.append(usar("adicionar", "i s"), document.createTextNode("Adicionar às suas figurinhas"));
    add.addEventListener("click", async () => { try { await guardarFigurinha(eu.uid, url, {}); toast("Figurinha guardada"); } catch { toast("Não foi possível guardar neste aparelho."); } fechar(); });
    const fav = elm("button", "pv-btn"); fav.type = "button"; fav.append(usar("estrela-c", "i s"), document.createTextNode("Adicionar às favoritas"));
    fav.addEventListener("click", async () => { try { await guardarFigurinha(eu.uid, url, { fav: true }); toast("Adicionada às favoritas"); } catch { toast("Não foi possível guardar neste aparelho."); } fechar(); });
    box.append(add, fav);
  }
  corpo.appendChild(box);
}
