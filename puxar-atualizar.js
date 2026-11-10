// =====================================================
// Puxar para atualizar (como no Instagram): no topo da página, puxar o dedo para baixo faz aparecer um círculo que vai
// se completando; soltando depois do ponto, ele gira e a página busca o que é novo no servidor (aoAtualizar).
// Usado no Diário, Explorar, Vídeos, Comunidade (mural) e Perfil. Sem dependências.
// Só no toque (celular). Não liga com uma janela aberta (folha, flash, visor...) nem dentro de campo de texto.
// O "puxar" do próprio navegador (que recarrega a página inteira) fica desligado onde este está ligado.
// =====================================================
import { camadaAberta } from "./deslizar-flash.js?v=9";
import { buscarDeNovo } from "./leituras.js?v=4";

const PONTO = 72, MAX = 120, TAM = 36;
const CSS = `
.pa-ind { position: fixed; left: 50%; z-index: 1200; width: ${TAM}px; height: ${TAM}px; margin-left: -${TAM / 2}px; border-radius: 50%;
  display: grid; place-items: center; pointer-events: none; opacity: 0; background: var(--panel, #0f161b);
  border: 1px solid var(--line, rgba(255,255,255,.12)); box-shadow: 0 6px 18px rgba(0,0,0,.28); }
.pa-ind svg { width: 22px; height: 22px; overflow: visible; }
.pa-ind circle { fill: none; stroke: var(--accent, #00adee); stroke-width: 2.6; stroke-linecap: round; }
.pa-ind .pa-fundo { stroke: var(--line, rgba(255,255,255,.14)); }
.pa-ind.escuro { background: rgba(0,0,0,.55); border-color: rgba(255,255,255,.18); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
.pa-ind.escuro circle { stroke: #fff; }
.pa-ind.escuro .pa-fundo { stroke: rgba(255,255,255,.22); }
`;
let cssPronto = false;
function css() {
  if (cssPronto) return; cssPronto = true;
  const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
}
const R = 9, VOLTA = 2 * Math.PI * R;
const ehToque = () => matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
const CAMPOS = "input, textarea, select, [contenteditable='true'], video, canvas, [data-sem-puxar]";

// opcoes: aoAtualizar (async), area (onde ouvir o dedo; padrão: a página), rolagem (o que rola; padrão: a página),
// conteudo (o que desce junto com o dedo), escuro (círculo claro sobre fundo escuro, nos Vídeos), ativo() (pode puxar agora?),
// topo() (onde o círculo aparece: embaixo do topo fixo da página), campos (onde o dedo não começa o puxar).
export function ligarPuxar(opcoes = {}) {
  if (!ehToque()) return () => {};
  css();
  const area = opcoes.area || document;
  const naPagina = area === document;
  const rolagem = () => opcoes.rolagem || document.scrollingElement || document.documentElement;
  const conteudo = () => (typeof opcoes.conteudo === "function" ? opcoes.conteudo() : opcoes.conteudo) || document.querySelector("main") || null;
  const ind = document.createElement("div"); ind.className = "pa-ind" + (opcoes.escuro ? " escuro" : "");
  ind.setAttribute("aria-hidden", "true");
  ind.innerHTML = `<svg viewBox="-12 -12 24 24"><circle class="pa-fundo" r="${R}"/><circle class="pa-arco" r="${R}" stroke-dasharray="${VOLTA}" stroke-dashoffset="${VOLTA}" transform="rotate(-90)"/></svg>`;
  (opcoes.indicadorEm || document.body).appendChild(ind);
  const arco = ind.querySelector(".pa-arco"), svg = ind.querySelector("svg");
  if (naPagina) document.documentElement.style.overscrollBehaviorY = "contain";

  let y0 = 0, x0 = 0, estado = "parado", d = 0, girando = 0, ang = 0;
  const topo = () => {
    if (opcoes.topo) return opcoes.topo();
    const h = document.querySelector("header.topo, .topo, header");
    const r = h?.getBoundingClientRect();
    return r && r.top <= 1 && getComputedStyle(h).position.match(/fixed|sticky/) ? r.bottom : 0;
  };
  function pintar(dist, transicao = false) {
    d = dist;
    const c = conteudo();
    if (c) { c.style.transition = transicao ? "transform .28s cubic-bezier(.2,.9,.3,1)" : "none"; c.style.transform = dist > 0 ? `translate3d(0, ${dist}px, 0)` : ""; }
    ind.style.transition = transicao ? "top .28s cubic-bezier(.2,.9,.3,1), opacity .2s" : "none";
    ind.style.top = (topo() + Math.max(8, dist / 2 - TAM / 2 + 4)) + "px";
    ind.style.opacity = dist > 6 ? String(Math.min(1, dist / 40)) : "0";
    if (estado !== "atualizando") {
      const p = Math.min(1, dist / PONTO);
      arco.setAttribute("stroke-dashoffset", String(VOLTA * (1 - p * 0.85)));
      svg.style.transform = `rotate(${p * 270}deg)`;
    }
  }
  function girar() {
    cancelAnimationFrame(girando);
    const passo = () => { ang = (ang + 9) % 360; svg.style.transform = `rotate(${ang}deg)`; girando = requestAnimationFrame(passo); };
    arco.setAttribute("stroke-dashoffset", String(VOLTA * 0.72));
    girando = requestAnimationFrame(passo);
  }
  const noTopo = () => (opcoes.rolagem ? opcoes.rolagem.scrollTop : rolagem().scrollTop || window.scrollY) <= 0;
  const pode = (e) => estado === "parado" && e.touches?.length === 1 && noTopo() && !e.target?.closest?.(opcoes.campos || CAMPOS)
    && (opcoes.ativo ? opcoes.ativo() : !(camadaAberta() || document.body.classList.contains("travado")));

  const inicio = (e) => {
    if (!pode(e)) return;
    y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; estado = "decidindo";
  };
  const mover = (e) => {
    if (estado !== "decidindo" && estado !== "puxando") return;
    const t = e.touches[0], dy = t.clientY - y0, dx = t.clientX - x0;
    if (estado === "decidindo") {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) { estado = "parado"; return; } // gesto para o lado (trocar de aba)
      if (dy < -4 || !noTopo()) { estado = "parado"; return; }
      if (dy < 10) return;
      estado = "puxando"; y0 = t.clientY - 10;
    }
    if (e.cancelable) e.preventDefault();
    const puxado = Math.max(0, t.clientY - y0);
    pintar(Math.min(MAX, puxado * 0.55));
  };
  const fim = async () => {
    if (estado === "decidindo") { estado = "parado"; return; }
    if (estado !== "puxando") return;
    if (d < PONTO) { estado = "parado"; pintar(0, true); return; }
    estado = "atualizando";
    try { navigator.vibrate?.(8); } catch {}
    pintar(PONTO - 10, true); girar();
    const t0 = Date.now();
    buscarDeNovo();
    try { await opcoes.aoAtualizar?.(); } catch (err) { console.warn("Atualizar:", err); }
    await new Promise((ok) => setTimeout(ok, Math.max(0, 650 - (Date.now() - t0))));
    cancelAnimationFrame(girando);
    estado = "voltando"; pintar(0, true);
    setTimeout(() => { estado = "parado"; const c = conteudo(); if (c) { c.style.transition = ""; c.style.transform = ""; } }, 300);
  };
  area.addEventListener("touchstart", inicio, { passive: true });
  area.addEventListener("touchmove", mover, { passive: false });
  area.addEventListener("touchend", fim, { passive: true });
  area.addEventListener("touchcancel", fim, { passive: true });
  return () => {
    area.removeEventListener("touchstart", inicio); area.removeEventListener("touchmove", mover);
    area.removeEventListener("touchend", fim); area.removeEventListener("touchcancel", fim);
    ind.remove();
  };
}
