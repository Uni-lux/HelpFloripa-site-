// Deslizar o dedo para a direita abre o criador do Flash (como a câmera dos stories).
// Sem dependências. Ligado pela barra de baixo (barra-rede.js), pelo Mensagens e pelo Início.
// Na página do Diário e no perfil abre na hora (window.__hfAbrirFlash); nas outras vai para feed.html?novoFlash=1.
// Não atrapalha: começa a 28 px da borda (o "voltar" do celular usa a borda), ignora campos, vídeos,
// listas que rolam para o lado e qualquer janela aberta; só segue quando o gesto é claramente para a direita.

const CAMADAS = [
  ".folha.aberta", ".story-visor", ".flash-criar", ".visor-exp", ".reels", "div.hfc", ".hf-confirma-fundo",
  ".pa-pagina", ".foto-grande", ".hfe-fundo", ".esc-lista", ".pv-fundo", ".pl-fundo", ".vt-local-fundo",
  ".vt-modal", ".hf-den", ".hf-aval", ".gaveta.aberta", ".chat-gaveta.aberta", "dialog[open]", "[aria-modal='true']",
].join(",");
const BORDA = 28, ABRE = 110;

const CSS = `
.df-puxar { position: fixed; left: 0; top: 50%; z-index: 9400; display: grid; justify-items: center; gap: 8px;
  transform: translate(-100%, -50%); pointer-events: none; opacity: 0; will-change: transform, opacity; }
.df-puxar .df-bola { position: relative; width: 58px; height: 58px; border-radius: 50%; display: grid; place-items: center; color: #fff;
  background: linear-gradient(135deg, #5ad8ff, #00adee 45%, #0062d6); box-shadow: 0 8px 26px rgba(0, 140, 238, .55);
  border: 3px solid rgba(255,255,255,.9); transition: transform .15s ease; }
.df-puxar .df-bola > svg:not(.df-anel) { width: 26px; height: 26px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.df-puxar .df-txt { padding: 5px 11px; border-radius: 999px; background: rgba(10,14,18,.88); color: #fff; font: 800 12.5px/1.2 system-ui, sans-serif;
  white-space: nowrap; box-shadow: 0 4px 14px rgba(0,0,0,.35); }
.df-puxar.pronto .df-bola { transform: scale(1.12); }
.df-puxar.solta { transition: transform .22s ease, opacity .22s ease; }
.df-anel { position: absolute; inset: -7px; width: calc(100% + 14px); height: calc(100% + 14px); }
.df-anel circle { fill: none; stroke: #fff; stroke-width: 3; stroke-linecap: round; transform: rotate(-90deg); transform-origin: 50% 50%; }
html.df-puxando, html.df-puxando body { overscroll-behavior-x: none; }
@media (prefers-reduced-motion: reduce) { .df-puxar.solta { transition: none; } }
`;

let ligado = false;

function ehRolagemLateral(n) {
  for (let x = n; x && x !== document.body && x.nodeType === 1; x = x.parentElement) {
    if (x.closest?.("[data-sem-deslizar]")) return true;
    if (/^(INPUT|TEXTAREA|SELECT|VIDEO|CANVAS|AUDIO|IFRAME)$/.test(x.tagName) || x.isContentEditable) return true;
    if (x.scrollWidth > x.clientWidth + 4) {
      const ox = getComputedStyle(x).overflowX;
      if (ox === "auto" || ox === "scroll") return true;
    }
  }
  return false;
}

function abrir() {
  if (typeof window.__hfAbrirFlash === "function") { window.__hfAbrirFlash(); return; }
  location.href = "feed.html?novoFlash=1";
}

export function ligarDeslizarFlash() {
  if (ligado || window.top !== window) return;
  if (!matchMedia("(pointer: coarse)").matches) return; // só no toque
  ligado = true;
  const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
  let ini = null, ind = null, travado = false, pronto = false;

  const indicador = () => {
    if (ind) return ind;
    ind = document.createElement("div"); ind.className = "df-puxar"; ind.setAttribute("aria-hidden", "true");
    ind.innerHTML = `<span class="df-bola"><svg class="df-anel" viewBox="0 0 70 70"><circle cx="35" cy="35" r="32" stroke-dasharray="201" stroke-dashoffset="201"/></svg>`
      + `<svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg></span><span class="df-txt">Novo flash</span>`;
    document.body.appendChild(ind);
    return ind;
  };
  const soltar = (abriu) => {
    document.documentElement.classList.remove("df-puxando");
    const i = ind; ind = null;
    if (!i) return;
    i.classList.add("solta");
    i.style.transform = abriu ? "translate(40vw, -50%) scale(.6)" : "translate(-100%, -50%)";
    i.style.opacity = "0";
    setTimeout(() => i.remove(), 260);
  };

  document.addEventListener("touchstart", (e) => {
    ini = null; travado = false; pronto = false;
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    if (t.clientX < BORDA || t.clientX > innerWidth * 0.7) return;
    if (!window.firebaseAuth?.currentUser) return;
    if (document.querySelector(CAMADAS) || document.documentElement.classList.contains("hf-volta-flash")) return;
    if (document.body.classList.contains("chat-aberto")) return; // conversa aberta no Mensagens
    if (ehRolagemLateral(e.target)) return;
    if ((getSelection?.() || "").toString()) return;
    ini = { x: t.clientX, y: t.clientY, em: Date.now() };
  }, { passive: true, capture: true });

  document.addEventListener("touchmove", (e) => {
    if (!ini || e.touches.length !== 1) return;
    const t = e.touches[0], dx = t.clientX - ini.x, dy = t.clientY - ini.y;
    if (!travado) {
      if (Math.abs(dy) > 12 && Math.abs(dy) >= Math.abs(dx)) { ini = null; return; } // está rolando a página
      if (dx < -10) { ini = null; return; }
      if (dx > 16 && dx > Math.abs(dy) * 1.6) { travado = true; document.documentElement.classList.add("df-puxando"); }
      else return;
    }
    if (e.cancelable) e.preventDefault();
    const p = Math.max(0, Math.min(1, (dx - 16) / ABRE));
    const i = indicador();
    i.style.opacity = String(Math.min(1, p * 2.2));
    i.style.transform = `translate(calc(-100% + ${Math.min(dx - 16, ABRE + 40) * 0.95 + 14}px), -50%)`;
    i.querySelector("circle").style.strokeDashoffset = String(201 * (1 - p));
    const agora = p >= 1;
    if (agora !== pronto) { pronto = agora; i.classList.toggle("pronto", agora); if (agora && navigator.userActivation?.hasBeenActive) navigator.vibrate?.(12); }
  }, { passive: false, capture: true });

  const fim = () => {
    if (!ini) return;
    const abre = travado && pronto;
    ini = null; travado = false; pronto = false;
    soltar(abre);
    if (abre) abrir();
  };
  document.addEventListener("touchend", fim, { capture: true });
  document.addEventListener("touchcancel", () => { ini = null; travado = false; pronto = false; soltar(false); }, { capture: true });
}
