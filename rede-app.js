// =====================================================
// Casca da rede social (rede.html): as 5 abas da barra de baixo abertas ao mesmo tempo, como nos apps grandes.
// - Cada aba é a página de sempre num quadro (iframe) que carrega UMA vez: Diário e Explorar = feed.html (o feed troca
//   entre os dois por dentro), Comunidade = mural.html, Mensagens = mensagens.html, Perfil = usuarios.html.
// - Trocar de aba só mostra outro quadro: nada recarrega, a rolagem e o que estava aberto ficam como estavam.
// - Deslizar o dedo (deslizar-flash.js, dentro do quadro) mostra a aba vizinha de verdade ao lado e a arrasta junto.
// - Os quadros que ainda não foram abertos carregam sozinhos depois, um de cada vez, quando a tela está parada.
// - Link para uma página que não é aba (vitrine, perfil de outra pessoa, configurações...) abre no próprio quadro;
//   link para outra aba troca de aba. Login e saída mexem na página inteira.
// API para os quadros: window.__hfShell (quadro-rede.js e deslizar-flash.js usam).
// =====================================================
import { guardarSaida } from "./confirmar.js?v=6";
import { criarMini } from "./chamada-mini.js?v=2";

const ABAS = ["diario", "explorar", "comunidade", "mensagens", "perfil"];
const NOMES = { diario: "Diário", explorar: "Explorar", comunidade: "Comunidade", mensagens: "Mensagens", perfil: "Perfil" };
const QUADRO_DE = { diario: "feed", explorar: "feed", comunidade: "mural", mensagens: "mensagens", perfil: "perfil" };
const PAGINA = { feed: "feed.html", mural: "mural.html", mensagens: "mensagens.html", perfil: "usuarios.html" };
const S = window.__hfShell;
let conteudoOk; const conteudo = new Promise((ok) => { conteudoOk = ok; });
S.conteudoPronto = () => conteudoOk();
const quadros = {};
let atual = null;
const inicial = new URLSearchParams(location.search).get("aba");
const primeira = ABAS.includes(inicial) ? inicial : "diario";
const W = () => innerWidth;
const nomeArq = (u) => u.pathname.split("/").pop() || "index.html";

// Endereço → aba (ou null quando não é aba: abre no próprio quadro).
function abaDaUrl(u) {
  const p = nomeArq(u);
  if (p === "feed.html") {
    if ([...u.searchParams.keys()].some((k) => k !== "aba")) return null;
    return u.searchParams.get("aba") === "explorar" ? "explorar" : "diario";
  }
  if (u.search || u.hash) return null; // ex.: usuarios.html?perfil=... é o perfil de outra pessoa
  return { "mural.html": "comunidade", "mensagens.html": "mensagens", "usuarios.html": "perfil" }[p] || null;
}
// O quadro está na página dele (e não numa vitrine, perfil de outra pessoa...)?
function emCasa(id) {
  try { const l = quadros[id]?.contentWindow?.location; return !!l && nomeArq(l) === PAGINA[id] && (id === "feed" || !l.search); } catch { return false; }
}
function visivel(id, sim) {
  try { const w = quadros[id]?.contentWindow; if (!w) return; w.__hfGavetaAberta = sim; w.dispatchEvent(new Event("hf:gaveta")); } catch {}
}

// rede.html?aba=comunidade&item=ID / &novo=TIPO (links da Comunidade): só na 1ª carga do Mural, que abre a janela.
let paramsCom = (() => { const q = new URLSearchParams(location.search), r = new URLSearchParams(); ["item", "novo"].forEach((k) => { if (q.get(k)) r.set(k, q.get(k)); }); return r.toString(); })();
const paramsComunidade = () => { const x = paramsCom; paramsCom = ""; return x ? "?" + x : ""; };
function quadro(id, aba) {
  if (quadros[id]) return quadros[id];
  const f = document.createElement("iframe");
  f.className = "hf-quadro";
  f.dataset.id = id;
  f.title = id === "feed" ? "Diário" : NOMES[Object.keys(QUADRO_DE).find((k) => QUADRO_DE[k] === id)];
  f.setAttribute("allow", "camera; microphone; geolocation; clipboard-read; clipboard-write; fullscreen; autoplay; web-share");
  f.setAttribute("allowfullscreen", "");
  f.src = PAGINA[id] + (aba === "explorar" ? "?aba=explorar" : "") + (id === "mural" ? paramsComunidade() : "");
  f.addEventListener("load", () => carregou(id));
  quadros[id] = f;
  document.body.appendChild(f);
  return f;
}

// Faixas do sistema (barra de gestos do Android, entalhe do iPhone). Com viewport-fit=cover a rede desenha até o fim da
// tela, por baixo dessas faixas, mas dentro de um iframe o env(safe-area-inset-*) vale 0: a casca mede e passa como
// --sab/--sat para cada quadro (as barras usam var(--sab, env(...))).
const sonda = document.createElement("div");
sonda.style.cssText = "position:fixed;left:0;top:0;width:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)";
document.body.appendChild(sonda);
function medidas() { const c = getComputedStyle(sonda); return { t: parseFloat(c.paddingTop) || 0, b: parseFloat(c.paddingBottom) || 0 }; }
function pintarInsets(w) {
  try {
    const m = medidas(), r = w.document.documentElement.style;
    r.setProperty("--sat", m.t + "px"); r.setProperty("--sab", m.b + "px");
  } catch {}
}
window.__hfShell.insets = pintarInsets;
const repintarInsets = () => Object.values(quadros).forEach((f) => { try { pintarInsets(f.contentWindow); } catch {} });
addEventListener("resize", repintarInsets);
addEventListener("orientationchange", () => setTimeout(repintarInsets, 300));

// Cada carga de página dentro de um quadro.
function carregou(id) {
  const f = quadros[id];
  let w, l;
  try { w = f.contentWindow; l = w.location; } catch { return; }
  document.getElementById("carregandoRede")?.remove();
  const p = nomeArq(l);
  // Login, conta e saída: a página inteira.
  if (/^(login|cadastre-se|conta|verificar-email)\.html$/.test(p)) { location.href = l.href; return; }
  f.dataset.carregou = "1";
  pintarInsets(w);
  if (QUADRO_DE[atual] === id) document.title = w.document.title || "Help Floripa";
  // Toques dentro do quadro contam como "mexeu na página" para a proteção de saída (confirmar.js).
  try {
    w.addEventListener("pointerdown", () => dispatchEvent(new Event("pointerdown")), { capture: true });
    w.addEventListener("keydown", () => dispatchEvent(new Event("keydown")), { capture: true });
  } catch {}
  visivel(id, QUADRO_DE[atual] === id);
  // As outras abas só começam a carregar depois que a 1ª mostrou conteúdo (o Diário avisa por conteudoPronto) ou 10 s:
  // antes elas baixavam junto e a internet do celular era dividida entre as 4.
  if (!S.pronto) { S.pronto = true; Promise.race([conteudo, new Promise((ok) => setTimeout(ok, id === "feed" ? 10000 : 1500))]).then(() => setTimeout(carregarOutros, 1200)); }
}

// Os outros quadros carregam aos poucos, com a tela parada, para a troca e o deslize já mostrarem a aba pronta.
function carregarOutros() {
  const falta = ["feed", "mural", "mensagens", "perfil"].filter((id) => !quadros[id]);
  if (!falta.length) return;
  const vai = () => { if (document.hidden) { setTimeout(carregarOutros, 3000); return; } quadro(falta[0], "diario"); setTimeout(carregarOutros, 2500); };
  (window.requestIdleCallback || ((fn) => setTimeout(fn, 300)))(vai, { timeout: 4000 });
}

function marcarHistorico(k) {
  const url = `rede.html?aba=${k}`;
  const st = { ...(history.state || {}), hfAba: k };
  delete st.hfCamadas;
  // Saindo da aba em que a rede abriu entra UM passo (o "voltar" traz de volta para ela, como no Instagram);
  // entre as outras abas, só troca o endereço.
  if (k !== primeira && !history.state?.hfPasso) { delete st.hfBase; delete st.hfGuarda; history.pushState({ ...st, hfPasso: true }, "", url); }
  else history.replaceState(st, "", url);
}

// Mostra a aba k.
function ir(k, { historico = true } = {}) {
  if (!ABAS.includes(k)) return;
  const id = QUADRO_DE[k];
  const novo = !quadros[id];
  const f = quadro(id, k);
  if (!novo && f.dataset.carregou && !emCasa(id)) {
    // O quadro estava numa vitrine/perfil de outra pessoa: volta para a página da aba.
    f.src = PAGINA[id] + (k === "explorar" ? "?aba=explorar" : "");
  } else if (id === "feed" && f.dataset.carregou) {
    try { f.contentWindow.__hfTrocarAba?.(k); } catch {}
  }
  for (const [qid, q] of Object.entries(quadros)) {
    q.classList.toggle("ativo", qid === id);
    q.classList.remove("movendo", "anima");
    q.style.transform = "";
    if (qid !== id) visivel(qid, false);
  }
  visivel(id, true);
  atual = k;
  try { if (f.dataset.carregou) document.title = f.contentWindow.document.title || "Help Floripa"; } catch {}
  if (historico) marcarHistorico(k);
}

// ---------- quadro por cima das abas ----------
// Um quadro escondido mostra algo em tela cheia por cima da aba atual, sem trocar de aba: a tela de uma ligação que
// chegou (chamadas.js ouve num quadro só) e o flash aberto de dentro do Mensagens (abrirFlash). Conta por quadro:
// o flash e uma ligação podem estar por cima ao mesmo tempo.
const cimas = new Map(); // id do quadro → quantas coisas por cima
function porCima(w, sim) {
  const id = Object.keys(quadros).find((k) => { try { return quadros[k].contentWindow === w; } catch { return false; } });
  if (!id) return;
  const n = Math.max(0, (cimas.get(id) || 0) + (sim ? 1 : -1));
  if (n) cimas.set(id, n); else cimas.delete(id);
  quadros[id].classList.toggle("por-cima", n > 0);
  visivel(id, n > 0 || QUADRO_DE[atual] === id);
}

// ---------- flash aberto de dentro do Mensagens (como o Instagram) ----------
// Antes, tocar num flash (resposta, reação, menção, enviado) trocava o quadro do Mensagens pela página do Diário
// inteira (feed.html?flash=ID): baixava tudo de novo, demorava, e para voltar ao chat recarregava o Mensagens.
// Agora o visor abre no quadro do Diário, que já está carregado, por cima da aba do Mensagens; fechar volta para a
// conversa como estava. `texto` = o flash que o chat já leu (o visor não precisa baixar de novo).
// Devolve false quando não deu (o Diário saiu para outra página e não respondeu): o Mensagens abre o link como antes.
function janelaDoFeed(espera) {
  const f = quadro("feed", "diario");
  const pronta = () => { try { const w = f.contentWindow; return emCasa("feed") && w.__hfAbrirFlashId ? w : null; } catch { return null; } };
  return new Promise((ok) => {
    const t0 = Date.now();
    const passo = () => { const w = pronta(); if (w || Date.now() - t0 > espera) ok(w); else setTimeout(passo, 80); };
    passo();
  });
}
let espera = null;
function mostrarEspera(sim) {
  if (!sim) { clearTimeout(espera?.t); espera?.el?.remove(); espera = null; return; }
  if (espera) return;
  espera = { t: setTimeout(() => {
    const e = document.createElement("div"); e.className = "hf-flash-espera"; e.setAttribute("role", "status"); e.setAttribute("aria-label", "Abrindo o flash");
    e.innerHTML = "<span></span>"; document.body.appendChild(e); if (espera) espera.el = e;
  }, 140) };
}
async function abrirFlash(id, texto, { repostar = false } = {}) {
  if (!/^[A-Za-z0-9]{1,64}$/.test(String(id || ""))) return false;
  mostrarEspera(true);
  const w = await janelaDoFeed(quadros.feed?.dataset.carregou ? 1500 : 12000);
  if (!w) { mostrarEspera(false); return false; }
  let subiu = false;
  const descer = () => { if (subiu) { subiu = false; porCima(w, false); } };
  try {
    const ok = repostar
      ? await w.__hfRepostarFlash?.(id, { aoAbrir: () => { subiu = true; porCima(w, true); mostrarEspera(false); }, aoFechar: descer })
      : await w.__hfAbrirFlashId(id, {
        texto,
        aoAbrir: () => { subiu = true; porCima(w, true); mostrarEspera(false); },
        aoFechar: descer,
        aviso: (m) => avisar(m)
      });
    mostrarEspera(false);
    if (!ok) descer(); // não abriu (saiu do ar...): o aviso já apareceu, o chat continua como estava
    return true;
  } catch (e) { console.warn("[Rede] flash", e); mostrarEspera(false); descer(); return false; }
}
// Aviso curto da casca (quando o flash não abre: saiu do ar, sem permissão...).
function avisar(m) {
  const t = document.createElement("div"); t.className = "hf-aviso-rede"; t.setAttribute("role", "status"); t.textContent = m;
  document.body.appendChild(t); setTimeout(() => t.classList.add("sai"), 2600); setTimeout(() => t.remove(), 3000);
}

// ---------- deslizar entre abas (chamado de dentro do quadro) ----------
// As duas abas andam juntas com o dedo (1:1), com uma sombra na beirada. A barra de baixo fica PARADA (como nos apps):
// uma cópia dela fica por cima dos quadros enquanto eles andam e o item acende quando passa da metade. Ao soltar, a
// animação termina na velocidade do dedo (04/11/2026; antes a barra ia embora junto com a página).
let arraste = null;
function vizinho(k, lado) {
  const i = ABAS.indexOf(k);
  const j = lado === "dir" ? i - 1 : i + 1;
  return j >= 0 && j < ABAS.length ? ABAS[j] : null;
}
const barraDe = (q) => { try { return q.contentDocument?.getElementById("barraRede") || null; } catch { return null; } };
// Cópia da barra com o estilo já calculado (a de dentro do quadro seria cortada na beirada dele).
const CORES = new Set(["color", "stroke", "fill", "-webkit-text-fill-color", "caret-color", "text-decoration-color", "text-emphasis-color", "outline-color", "column-rule-color", "-webkit-text-stroke-color"]);
function copiarEstilo(orig, copia, raiz) {
  const w = orig.ownerDocument.defaultView, cs = w.getComputedStyle(orig);
  const cor = cs.getPropertyValue("color");
  const corPai = !raiz && orig.parentElement ? w.getComputedStyle(orig.parentElement).getPropertyValue("color") : null;
  let t = "";
  for (let i = 0; i < cs.length; i++) {
    const p = cs[i];
    if (p.startsWith("--") || p.startsWith("transition") || p.startsWith("animation")) continue;
    const v = cs.getPropertyValue(p);
    // Cor igual à do item: fica "currentColor"/herdada (assim acender o item muda tudo dentro dele).
    if (corPai !== null && CORES.has(p) && v === cor) { if (p === "color" && v === corPai) continue; t += `${p}:${p === "color" ? v : "currentcolor"};`; continue; }
    t += `${p}:${v};`;
  }
  copia.style.cssText = t;
  const fo = [...orig.children], fc = [...copia.children];
  fo.forEach((x, i) => fc[i] && copiarEstilo(x, fc[i], false));
}
// Os ícones <use href="#..."> apontam para o desenho que está DENTRO do quadro: a cópia leva o desenho junto
// (sem isso a barra copiada do Mensagens, que usa <use>, ficava sem os ícones durante o deslize).
function trazerDesenhos(c, doc) {
  c.querySelectorAll("use").forEach((u) => {
    const id = (u.getAttribute("href") || u.getAttribute("xlink:href") || "").replace(/^#/, "");
    const sym = id && doc.getElementById(id), svg = u.ownerSVGElement;
    if (!sym || !svg) return;
    if (sym.getAttribute("viewBox") && !svg.getAttribute("viewBox")) svg.setAttribute("viewBox", sym.getAttribute("viewBox"));
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    for (const at of ["fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin"]) if (sym.getAttribute(at)) g.setAttribute(at, sym.getAttribute(at));
    g.innerHTML = sym.innerHTML;
    u.replaceWith(g);
  });
}
function copiaDaBarra(b) {
  try {
    const r = b.getBoundingClientRect();
    if (!r.width) return null;
    const c = b.cloneNode(true);
    c.removeAttribute("id"); c.querySelectorAll("[id]").forEach((x) => x.removeAttribute("id"));
    c.setAttribute("aria-hidden", "true");
    copiarEstilo(b, c, true);
    Object.assign(c.style, { position: "fixed", left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", right: "auto", bottom: "auto", margin: "0", transform: "none", translate: "none", zIndex: "20", pointerEvents: "none", boxSizing: "border-box" });
    const w = b.ownerDocument.defaultView;
    const cor = (sel) => { const a = b.querySelector(sel); return a ? w.getComputedStyle(a).color : ""; };
    c._corAtiva = cor("[aria-current='page']") || "#00adee";
    c._corNormal = cor("[data-barra]:not([aria-current])") || "#8fa0ab";
    const at = b.querySelector("[aria-current='page']");
    c._fundoAtivo = at ? w.getComputedStyle(at).backgroundColor : "transparent";
    trazerDesenhos(c, b.ownerDocument);
    document.body.appendChild(c);
    return c;
  } catch { return null; }
}
// O topo (header.topo) fica PARADO durante o deslize, como no X: uma cópia do topo da aba que sai fica por cima e a
// da aba que entra aparece por cima dela aos poucos (os topos do Diário, Comunidade e Perfil são iguais, então a troca
// não se vê). Os ícones <use href="#..."> apontam para o desenho que está DENTRO do quadro: a cópia leva o desenho junto.
// O Mensagens não tem header.topo: o topo dele é a .side-top (mesma altura), que também fica parada no deslize.
const topoDe = (q) => { try { const h = q.contentDocument?.querySelector("header.topo") || q.contentDocument?.querySelector(".sidebar > .side-top"); return h && h.getBoundingClientRect().height ? h : null; } catch { return null; } };
function copiaDoTopo(h) {
  const c = copiaDaBarra(h);
  if (!c) return null;
  const doc = h.ownerDocument;
  // Topo sem fundo próprio (o do Mensagens): a cópia leva o fundo da página, senão o topo de baixo aparece através dela.
  const cs = c.style.backgroundColor;
  if (!cs || cs === "transparent" || /rgba\(.*,\s*0\)$/.test(cs)) {
    const w = doc.defaultView; let fundo = "";
    for (const el of [h.parentElement, doc.body, doc.documentElement]) { const b = el && w.getComputedStyle(el).backgroundColor; if (b && !/rgba\(.*,\s*0\)$/.test(b) && b !== "transparent") { fundo = b; break; } }
    c.style.backgroundColor = fundo || "#000";
  }
  c.style.zIndex = "19";
  return c;
}
function acenderNaCopia(c, k) {
  if (!c) return;
  c.querySelectorAll("[data-barra]").forEach((a) => {
    const on = a.dataset.barra === k;
    a.style.color = on ? c._corAtiva : c._corNormal;
    a.style.backgroundColor = on ? c._fundoAtivo : "transparent";
    const av = a.querySelector(".mini-av");
    if (av) av.style.boxShadow = on ? `0 0 0 2px ${c._corAtiva}` : "none";
  });
}
// Transição das abas: deslize reto (a aba que sai vai para o lado e a vizinha entra junto, sem giro).
// O cubo ficou só no Flash (trocar de pessoa). Feita em JavaScript (quadro a quadro), então funciona mesmo com as
// animações do celular desligadas (que desligam as transições do CSS).
function pintarDeslize(a, p) {
  const { de, para, lado } = a, w = W(), s = lado === "esq" ? -1 : 1;
  const [t0, t1] = a.topos || [];
  // Um topo some e depois o outro aparece (cruzados, os dois textos ficavam um em cima do outro no meio do caminho).
  // O de quem sai fica por cima e some inteiro; o de quem entra fica embaixo, com o fundo já no lugar, e só o que está
  // dentro dele aparece aos poucos (o topo nunca fica vazio nem transparente).
  const lim = (x) => String(Math.min(1, Math.max(0, x)));
  if (t0) t0.style.opacity = t1 ? lim(1 - p / 0.45) : lim(1 - p);
  if (t1) { const o = lim(t0 ? (p - 0.45) / 0.4 : p); for (const f of t1.children) f.style.opacity = o; }
  de.style.transform = `translate3d(${s * p * w}px,0,0)`;
  para.style.transform = `translate3d(${-s * (1 - p) * w}px,0,0)`;
}
function comecar(k, lado) {
  const alvo = vizinho(k, lado);
  if (!alvo || QUADRO_DE[alvo] === QUADRO_DE[k] || arraste) return false;
  const de = quadros[QUADRO_DE[k]], para = quadro(QUADRO_DE[alvo], alvo);
  // Explorar fica no quadro do Diário: já deixa o feed no Explorar antes de aparecer.
  if (alvo === "explorar" || alvo === "diario") { try { para.contentWindow.__hfTrocarAba?.(alvo); } catch {} }
  for (const q of [de, para]) { q.classList.remove("anima"); q.classList.add("movendo"); }
  para.classList.add("entra");
  const bDe = barraDe(de), bPara = barraDe(para);
  const copia = bDe ? copiaDaBarra(bDe) : null;
  if (copia) { bDe.style.visibility = "hidden"; if (bPara) bPara.style.visibility = "hidden"; }
  const tDe = topoDe(de), tPara = topoDe(para);
  const topos = [tDe && copiaDoTopo(tDe), tPara && copiaDoTopo(tPara)];
  if (topos[0]) tDe.style.visibility = "hidden";
  if (topos[0]) topos[0].style.zIndex = "20";
  if (topos[1]) { tPara.style.visibility = "hidden"; topos[1].style.zIndex = "19"; }
  arraste = { de, para, lado, alvo, k, p: 0, bDe, bPara, copia, aceso: false, tDe, tPara, topos };
  document.body.classList.add("girando");
  pintarDeslize(arraste, 0);
  return true;
}
function mover(dx) {
  if (!arraste || arraste.fim) return;
  const d = arraste.lado === "dir" ? Math.max(0, dx) : Math.min(0, dx);
  arraste.p = Math.min(1, Math.abs(d) / W());
  pintarDeslize(arraste, arraste.p);
  const aceso = arraste.p > 0.5;
  if (aceso !== arraste.aceso) { arraste.aceso = aceso; acenderNaCopia(arraste.copia, aceso ? arraste.alvo : arraste.k); }
}
function terminar(vai, v = 0) {
  if (!arraste || arraste.fim) return;
  const a = arraste; a.fim = true;
  const { de, para, alvo, k, bDe, bPara, copia } = a;
  const p0 = a.p, p1 = vai ? 1 : 0;
  // Duração pelo que falta girar e pela velocidade do dedo (deslize rápido termina rápido), entre 160 e 360 ms.
  const falta = Math.abs(p1 - p0) * W();
  const dur = Math.round(Math.min(360, Math.max(160, falta / Math.max(Math.abs(v), 1))));
  acenderNaCopia(copia, vai ? alvo : k);
  if (vai) { try { if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(8); } catch {} }
  const t0 = performance.now(), suave = (t) => 1 - Math.pow(1 - t, 3);
  const passo = (agora) => {
    const t = Math.min(1, (agora - t0) / dur);
    pintarDeslize(a, p0 + (p1 - p0) * suave(t));
    if (t < 1) { requestAnimationFrame(passo); return; }
    for (const q of [de, para]) { q.classList.remove("anima", "movendo", "entra"); q.style.transform = ""; q.style.transformOrigin = ""; q.style.opacity = ""; }
    arraste = null;
    document.body.classList.remove("girando");
    if (vai) ir(alvo);
    for (const b of [bDe, bPara, a.tDe, a.tPara]) if (b) b.style.visibility = "";
    copia?.remove();
    for (const t of a.topos) t?.remove();
  };
  requestAnimationFrame(passo);
}

Object.assign(S, {
  ABAS, NOMES,
  ir: (k) => ir(k),
  // O feed trocou entre Diário e Explorar por dentro (barra-rede.js marcarBarra).
  marcou(k, w) { if (!ABAS.includes(k) || quadros[QUADRO_DE[k]]?.contentWindow !== w || QUADRO_DE[atual] !== QUADRO_DE[k]) return; if (k !== atual) { atual = k; marcarHistorico(k); } },
  // Link clicado dentro de um quadro: "aqui" (deixa o quadro seguir), uma aba (troca) ou null (o quadro abre a página).
  destinoDe(href, w) {
    let u; try { u = new URL(href, location.href); } catch { return null; }
    if (u.origin !== location.origin) return null;
    const k = abaDaUrl(u);
    if (!k) return null;
    const id = QUADRO_DE[k];
    if (quadros[id]?.contentWindow === w && emCasa(id)) return "aqui";
    return k;
  },
  vizinho, comecar, mover, terminar,
  nomeDe: (k) => NOMES[k] || "",
  porCima, abrirFlash,
  // Ligação minimizada: a pílula fica AQUI, na página de cima, por cima de todas as abas (chamadas.js minimizar).
  chamadaMini: (dados) => criarMini(document, dados),
});
Object.defineProperty(S, "atual", { get: () => atual }); // (Object.assign copiaria só o valor de agora)

// Sino compartilhado: só UMA aba (a primeira que abriu) ouve as fontes do sino no Firebase e repassa os avisos para as
// outras (antes as 4 abas liam tudo, 4 vezes). Se a aba dona sair (trocou de página), outra assume.
S.sino = (() => {
  let dono = null, estado = null, vistos = 0;
  const assin = new Map(); // janela → { receber, assumir, aoVistos }
  const viva = (w) => { try { return !!w && !w.closed && !!w.document; } catch { return false; } };
  const copia = (x) => { try { return structuredClone(x); } catch { return JSON.parse(JSON.stringify(x)); } };
  return {
    temDono: () => viva(dono),
    virarDono(w) { dono = w; },
    assinar(w, opc) { assin.set(w, opc); if (estado) try { opc.receber(copia(estado), vistos); } catch {} },
    publicar(w, est, v) {
      if (w !== dono) return;
      estado = copia(est); vistos = Math.max(vistos, v || 0);
      for (const [x, a] of assin) { if (!viva(x)) { assin.delete(x); continue; } try { a.receber(copia(estado), vistos); } catch {} }
    },
    marcarVistos(t) {
      vistos = Math.max(vistos, t);
      for (const [x, a] of assin) { if (viva(x)) try { a.aoVistos?.(t); } catch {} }
      try { dono?.dispatchEvent(new CustomEvent("hf:sino-vistos", { detail: t })); } catch {}
    },
    largar(w) {
      assin.delete(w);
      if (w !== dono) return;
      dono = null; estado = null;
      for (const [x, a] of assin) { if (!viva(x)) { assin.delete(x); continue; } assin.delete(x); try { a.assumir(); } catch {} break; }
    },
  };
})();

// "Voltar" entre as abas (o passo de sair do Diário).
addEventListener("popstate", () => {
  const k = history.state?.hfAba || primeira;
  if (k !== atual) ir(k, { historico: false });
});

// Tema da casca: as barras do celular (status e navegação) e o fundo atrás das abas seguem o tema escolhido. A troca é
// gravada por uma das abas (Configurações, Mensagens, menu) e chega aqui pelo evento storage.
const escuroAgora = () => { let t = "sistema"; try { t = JSON.parse(localStorage.getItem("hf-chat-config") || "{}").tema || "sistema"; } catch {} return t === "escuro" || (t === "sistema" && matchMedia("(prefers-color-scheme: dark)").matches); };
function pintarTemaCasca() {
  const e = escuroAgora(), h = document.documentElement;
  h.dataset.theme = e ? "dark" : "light"; h.style.colorScheme = e ? "dark" : "light";
  let m = document.querySelector('meta[name="theme-color"]');
  if (!m) { m = document.createElement("meta"); m.name = "theme-color"; document.head.appendChild(m); }
  m.content = e ? "#000000" : "#ffffff";
}
pintarTemaCasca();
addEventListener("storage", (e) => { if (e.key === "hf-chat-config") pintarTemaCasca(); });
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", pintarTemaCasca);
history.replaceState({ ...(history.state || {}), hfAba: primeira }, "", `rede.html?aba=${primeira}`);
ir(primeira, { historico: false });
guardarSaida();
