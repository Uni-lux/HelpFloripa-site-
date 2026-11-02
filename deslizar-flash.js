// Deslizar o dedo para o lado nas páginas da barra de baixo (Diário, Explorar, Comunidade, Mensagens, Perfil):
// - para a ESQUERDA vai para a próxima aba (Diário → Explorar → Comunidade → Mensagens → Perfil);
// - para a DIREITA volta para a aba anterior; no Diário (a primeira) abre o criador do Flash, como a câmera dos stories.
// Sem dependências. Ligado pela barra de baixo (barra-rede.js) e pelo Mensagens (barra no HTML).
// A aba atual é o link com aria-current="page" na #barraRede; trocar de aba = clicar nele (o Diário troca para o
// Explorar sem recarregar). O Flash abre por window.__hfAbrirFlash (feed.js).
// Não atrapalha: começa a 28 px das bordas (o "voltar" do celular usa as bordas), ignora campos, vídeos, listas que
// rolam para o lado e qualquer janela aberta; só segue quando o gesto é claramente para o lado.

const CAMADAS = [
  ".folha.aberta", ".story-visor", ".flash-criar", ".visor-exp", ".reels", "div.hfc", ".hf-confirma-fundo",
  ".pa-pagina", ".foto-grande", ".hfe-fundo", ".esc-lista", ".pv-fundo", ".pl-fundo", ".vt-local-fundo",
  ".vt-modal", ".hf-den", ".hf-aval", ".gaveta.aberta", ".chat-gaveta.aberta", ".painel.aberto", "dialog[open]", "[aria-modal='true']",
].join(",");
const BORDA = 28, ABRE = 110, TRAVA = 16;

const CSS = `
.df-puxar { position: fixed; top: 50%; z-index: 9400; display: grid; justify-items: center; gap: 8px;
  pointer-events: none; opacity: 0; will-change: transform, opacity; }
.df-puxar.esq { left: 0; transform: translate(-100%, -50%); }
.df-puxar.dir { right: 0; transform: translate(100%, -50%); }
.df-puxar .df-bola { position: relative; width: 58px; height: 58px; border-radius: 50%; display: grid; place-items: center; color: #fff;
  background: linear-gradient(135deg, #5ad8ff, #00adee 45%, #0062d6); box-shadow: 0 8px 26px rgba(0, 140, 238, .55);
  border: 3px solid rgba(255,255,255,.9); transition: transform .15s ease; }
.df-puxar.aba .df-bola { width: 50px; height: 50px; background: rgba(14,19,24,.92); border-color: rgba(255,255,255,.22); box-shadow: 0 8px 22px rgba(0,0,0,.4); }
.df-puxar .df-bola > svg:not(.df-anel) { width: 24px; height: 24px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.df-puxar .df-txt { padding: 5px 11px; border-radius: 999px; background: rgba(10,14,18,.9); color: #fff; font: 800 12.5px/1.2 system-ui, sans-serif;
  white-space: nowrap; box-shadow: 0 4px 14px rgba(0,0,0,.35); }
.df-puxar.pronto .df-bola { transform: scale(1.12); }
.df-puxar.aba.pronto .df-bola { background: #00adee; border-color: #fff; }
.df-puxar.solta { transition: transform .22s ease, opacity .22s ease; }
.df-anel { position: absolute; inset: -7px; width: calc(100% + 14px); height: calc(100% + 14px); }
.df-anel circle { fill: none; stroke: #fff; stroke-width: 3; stroke-linecap: round; transform: rotate(-90deg); transform-origin: 50% 50%; }
html.df-puxando, html.df-puxando body { overscroll-behavior-x: none; }
@media (prefers-reduced-motion: reduce) { .df-puxar.solta { transition: none; } }
`;
const SETA_ESQ = '<path d="M15 5 8 12l7 7"/>', SETA_DIR = '<path d="m9 5 7 7-7 7"/>', RAIO = '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>';

let ligado = false;

// Campos, vídeos etc. bloqueiam; listas que rolam para o lado ficam guardadas para decidir depois (só bloqueiam se
// ainda puderem rolar para o lado do gesto: no começo de um carrossel, deslizar para a direita troca de aba).
function examinar(n) {
  const rolam = [];
  for (let x = n; x && x !== document.body && x.nodeType === 1; x = x.parentElement) {
    if (x.matches?.("[data-sem-deslizar], #barraRede")) return null;
    if (/^(INPUT|TEXTAREA|SELECT|VIDEO|CANVAS|AUDIO|IFRAME)$/.test(x.tagName) || x.isContentEditable) return null;
    if (x.scrollWidth > x.clientWidth + 4) {
      const ox = getComputedStyle(x).overflowX;
      if (ox === "auto" || ox === "scroll") rolam.push(x);
    }
  }
  return rolam;
}
const podeRolar = (els, lado) => els.some((x) => (lado === "dir" ? x.scrollLeft > 8 : x.scrollLeft < x.scrollWidth - x.clientWidth - 8));

// Abas da barra de baixo e a atual.
function abas() {
  const links = [...document.querySelectorAll("#barraRede a")];
  const i = links.findIndex((a) => a.getAttribute("aria-current") === "page");
  return { links, i };
}
const nomeDe = (a) => (a?.querySelector("span:last-child")?.textContent || a?.textContent || "").trim();

// O que o gesto faz para cada lado (ou null).
function destino(lado) {
  const { links, i } = abas();
  if (i < 0) return null;
  if (lado === "dir") { // dedo indo para a direita
    if (i === 0) return typeof window.__hfAbrirFlash === "function" ? { flash: true, nome: "Novo flash", ir: () => window.__hfAbrirFlash() } : null;
    return { nome: nomeDe(links[i - 1]), ir: () => links[i - 1].click() };
  }
  if (i >= links.length - 1) return null;
  return { nome: nomeDe(links[i + 1]), ir: () => links[i + 1].click() };
}

export function ligarDeslizarFlash() {
  if (ligado || window.top !== window) return;
  if (!matchMedia("(pointer: coarse)").matches) return; // só no toque
  ligado = true;
  const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
  let ini = null, ind = null, alvo = null, lado = "", pronto = false;

  const indicador = () => {
    if (ind) return ind;
    ind = document.createElement("div");
    ind.className = `df-puxar ${lado === "dir" ? "esq" : "dir"}${alvo.flash ? "" : " aba"}`;
    ind.setAttribute("aria-hidden", "true");
    const ic = alvo.flash ? RAIO : lado === "dir" ? SETA_ESQ : SETA_DIR;
    ind.innerHTML = `<span class="df-bola"><svg class="df-anel" viewBox="0 0 70 70"><circle cx="35" cy="35" r="32" stroke-dasharray="201" stroke-dashoffset="201"/></svg>`
      + `<svg viewBox="0 0 24 24">${ic}</svg></span><span class="df-txt"></span>`;
    ind.querySelector(".df-txt").textContent = alvo.nome;
    document.body.appendChild(ind);
    return ind;
  };
  const zerar = () => { ini = null; alvo = null; lado = ""; pronto = false; };
  const soltar = (foi) => {
    document.documentElement.classList.remove("df-puxando");
    const i = ind; ind = null;
    if (!i) return;
    const esq = i.classList.contains("esq");
    i.classList.add("solta");
    i.style.transform = foi ? `translate(${esq ? "40vw" : "-40vw"}, -50%) scale(.6)` : `translate(${esq ? "-100%" : "100%"}, -50%)`;
    i.style.opacity = "0";
    setTimeout(() => i.remove(), 260);
  };

  document.addEventListener("touchstart", (e) => {
    zerar();
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    if (t.clientX < BORDA || t.clientX > innerWidth - BORDA) return;
    if (!window.firebaseAuth?.currentUser) return;
    if (abas().i < 0) return;
    if (document.querySelector(CAMADAS) || document.documentElement.classList.contains("hf-volta-flash")) return;
    if (document.body.classList.contains("chat-aberto")) return; // conversa aberta no Mensagens
    const rolam = examinar(e.target);
    if (!rolam) return;
    if ((getSelection?.() || "").toString()) return;
    ini = { x: t.clientX, y: t.clientY, rolam, esq0: rolam.map((x) => x.scrollLeft) };
  }, { passive: true, capture: true });

  document.addEventListener("touchmove", (e) => {
    if (!ini || e.touches.length !== 1) return;
    const t = e.touches[0], dx = t.clientX - ini.x, dy = t.clientY - ini.y;
    if (!lado) {
      if (Math.abs(dy) > 12 && Math.abs(dy) >= Math.abs(dx)) { zerar(); return; } // está rolando a página
      if (Math.abs(dx) <= TRAVA || Math.abs(dx) <= Math.abs(dy) * 1.6) return;
      lado = dx > 0 ? "dir" : "esq";
      // carrossel que ainda rola para esse lado (ou que já começou a rolar) fica com o gesto
      if (podeRolar(ini.rolam, lado) || ini.rolam.some((x, k) => Math.abs(x.scrollLeft - ini.esq0[k]) > 2)) { zerar(); return; }
      // o gesto precisa ter espaço: para a direita começando já no canto direito (ou o contrário) não conta
      if ((lado === "dir" && ini.x > innerWidth * 0.75) || (lado === "esq" && ini.x < innerWidth * 0.25)) { zerar(); return; }
      alvo = destino(lado);
      if (!alvo) { zerar(); return; }
      document.documentElement.classList.add("df-puxando");
    }
    if ((lado === "dir" && dx < 0) || (lado === "esq" && dx > 0)) { soltar(false); zerar(); return; }
    if (e.cancelable) e.preventDefault();
    const d = Math.abs(dx) - TRAVA;
    const p = Math.max(0, Math.min(1, d / ABRE));
    const i = indicador();
    const passo = Math.min(d, ABRE + 40) * 0.95 + 14;
    i.style.opacity = String(Math.min(1, p * 2.2));
    i.style.transform = lado === "dir" ? `translate(calc(-100% + ${passo}px), -50%)` : `translate(calc(100% - ${passo}px), -50%)`;
    i.querySelector("circle").style.strokeDashoffset = String(201 * (1 - p));
    const agora = p >= 1;
    if (agora !== pronto) {
      pronto = agora; i.classList.toggle("pronto", agora);
      if (agora && navigator.userActivation?.hasBeenActive) navigator.vibrate?.(12);
    }
  }, { passive: false, capture: true });

  const fim = () => {
    if (!ini) return;
    const vai = lado && pronto ? alvo : null;
    zerar();
    soltar(!!vai);
    vai?.ir();
  };
  document.addEventListener("touchend", fim, { capture: true });
  document.addEventListener("touchcancel", () => { zerar(); soltar(false); }, { capture: true });
}
