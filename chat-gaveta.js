// =====================================================
// Gaveta de mensagens: nas páginas do site (início, vitrines, ajuda...), o link
// "Mensagens" abre as conversas por cima da página atual, sem sair dela.
// No celular ocupa a tela; no computador fica à direita. O "voltar" fecha.
// Ctrl/Cmd + clique continua abrindo a página de mensagens normalmente.
// =====================================================
const CSS = `
.hfc-fundo { position: fixed; inset: 0; z-index: 9400; background: rgba(2, 8, 14, .55); opacity: 0; transition: opacity .25s; pointer-events: none; }
.hfc-fundo.on { opacity: 1; pointer-events: auto; } /* fechada: não cobre a página */
.hfc { position: fixed; z-index: 9401; top: 0; right: 0; bottom: 0; width: min(440px, 100vw); display: flex; flex-direction: column;
  background: var(--panel, #10181d); box-shadow: -24px 0 60px rgba(0, 0, 0, .45); transform: translateX(102%); transition: transform .3s cubic-bezier(.2, .8, .2, 1); }
.hfc.on { transform: none; }
.hfc:not(.on) { visibility: hidden; transition: transform .3s cubic-bezier(.2, .8, .2, 1), visibility 0s .3s; }
.hfc-topo { display: flex; align-items: center; gap: 4px; padding: 6px 6px 6px 14px; padding-top: max(6px, env(safe-area-inset-top)); border-bottom: 1px solid var(--line, #22313a);
  color: var(--text, #e9eef1); font: 700 14px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
.hfc-topo span { flex: 1; letter-spacing: .3px; color: var(--muted, #8b9ba6); font-size: 12px; text-transform: uppercase; }
.hfc-topo a, .hfc-topo button { width: 38px; height: 38px; border: 0; border-radius: 50%; background: none; color: inherit; display: grid; place-items: center; cursor: pointer; }
.hfc-topo a:hover, .hfc-topo button:hover { background: rgba(127, 127, 127, .15); }
.hfc-topo svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.hfc iframe { flex: 1; width: 100%; border: 0; background: var(--bg, #0b1014); }
html.hfc-aberto { overflow: hidden; }
@media (max-width: 640px) { .hfc { width: 100vw; } }
`;
let gaveta = null, fundo = null, quadro = null, aberta = false;

function montar() {
  const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
  fundo = document.createElement("div"); fundo.className = "hfc-fundo";
  gaveta = document.createElement("aside"); gaveta.className = "hfc";
  gaveta.setAttribute("role", "dialog"); gaveta.setAttribute("aria-label", "Mensagens"); gaveta.tabIndex = -1;
  const topo = document.createElement("div"); topo.className = "hfc-topo";
  const rot = document.createElement("span"); rot.textContent = "Mensagens";
  const cheia = document.createElement("a"); cheia.href = "mensagens.html"; cheia.title = "Abrir em tela cheia"; cheia.setAttribute("aria-label", "Abrir em tela cheia");
  cheia.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7"/></svg>';
  cheia.addEventListener("click", (e) => { e.preventDefault(); location.href = quadro.contentWindow?.location?.href || "mensagens.html"; });
  const x = document.createElement("button"); x.type = "button"; x.title = "Fechar"; x.setAttribute("aria-label", "Fechar mensagens");
  x.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  x.addEventListener("click", () => fechar());
  topo.append(rot, cheia, x);
  quadro = document.createElement("iframe"); quadro.title = "Mensagens";
  gaveta.append(topo, quadro);
  fundo.addEventListener("click", () => fechar());
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && aberta && document.activeElement !== quadro) fechar(); });
  window.addEventListener("popstate", () => { if (aberta && !history.state?.hfChat) fechar(false); });
  document.body.append(fundo, gaveta);
}

export function abrirChat(url = "mensagens.html") {
  if (!gaveta) montar();
  if (quadro.dataset.url !== url) { quadro.src = url; quadro.dataset.url = url; }
  if (!aberta) {
    aberta = true;
    history.pushState({ ...(history.state || {}), hfChat: true }, "", location.href); // o "voltar" fecha a gaveta
    document.documentElement.classList.add("hfc-aberto");
    requestAnimationFrame(() => { fundo.classList.add("on"); gaveta.classList.add("on"); gaveta.focus({ preventScroll: true }); });
  }
}
function fechar(voltarHistorico = true) {
  if (!aberta) return;
  aberta = false;
  fundo.classList.remove("on"); gaveta.classList.remove("on");
  document.documentElement.classList.remove("hfc-aberto");
  // Desfaz a entrada criada ao abrir (as conversas abertas dentro da gaveta também ficam no histórico).
  if (voltarHistorico && history.state?.hfChat) history.back();
}

// Liga os links "Mensagens" da página (menu, atalhos, rodapé).
document.addEventListener("click", (e) => {
  const a = e.target.closest?.('a[href^="mensagens.html"]');
  if (!a || e.defaultPrevented || e.ctrlKey || e.metaKey || e.shiftKey || e.button > 0 || a.target === "_blank") return;
  e.preventDefault();
  abrirChat(a.getAttribute("href"));
});
window.hfAbrirChat = abrirChat;
