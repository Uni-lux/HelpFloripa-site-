// Lado de dentro da rede social numa página só (rede.html, rede-app.js). Sem dependências.
// As páginas das abas (feed, mural, mensagens, usuarios) chamam `ligarQuadro()`:
// - dentro da casca: link para outra aba troca de aba na casca (sem recarregar); o resto abre no próprio quadro;
// - fora da casca (página aberta sozinha): os itens da barra de baixo levam para a rede (rede.html?aba=...).
// `casca()` devolve a API da casca (window.top.__hfShell) ou null.

const ORDEM = ["diario", "explorar", "comunidade", "mensagens", "perfil"];

export function casca() {
  try {
    if (window.top === window || window.parent !== window.top) return null;
    return window.top.__hfShell || null;
  } catch { return null; }
}
const semRede = () => { try { return localStorage.getItem("hf-sem-rede") === "1"; } catch { return false; } };

let ligado = false;
export function ligarQuadro() {
  if (ligado) return;
  ligado = true;
  const S = casca();
  if (!S) {
    // Página aberta sozinha: a barra leva para a rede (lá a troca de aba é instantânea).
    if (semRede() || window.top !== window) return;
    // Diário e Explorar continuam trocando aqui mesmo no feed (feed.js cuida); os outros vão para a rede.
    document.addEventListener("click", (e) => {
      if (e.defaultPrevented) return;
      const a = e.target.closest?.("#barraRede a");
      if (!a) return;
      const i = [...document.querySelectorAll("#barraRede a")].indexOf(a);
      const k = a.dataset.barra || ORDEM[i];
      if (!ORDEM.includes(k)) return;
      e.preventDefault();
      location.href = `rede.html?aba=${k}`;
    });
    return;
  }
  document.documentElement.classList.add("na-rede");
  // Sem barra de rolagem nas abas da rede (o "tracinho" cinza aparecia na beirada durante o deslize entre abas).
  { const st = document.createElement("style"); st.textContent = "html.na-rede{scrollbar-width:none}html.na-rede::-webkit-scrollbar{display:none}"; document.head.appendChild(st); }
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const a = e.target.closest?.("a[href]");
    if (!a || a.hasAttribute("download")) return;
    if (a.target && !["_self", "_top", "_parent"].includes(a.target)) return; // nova aba/janela: segue normal
    const d = S.destinoDe(a.href, window);
    if (d === "aqui") { if (a.target === "_top" || a.target === "_parent") { e.preventDefault(); location.href = a.href; } return; }
    if (d) { e.preventDefault(); S.ir(d); return; }
    // Página que não é aba: abre neste quadro (o "_top" das gavetas tiraria a pessoa da rede).
    if (a.target === "_top" || a.target === "_parent") {
      let u; try { u = new URL(a.href, location.href); } catch { return; }
      if (u.origin === location.origin) { e.preventDefault(); location.href = u.href; }
    }
  });
}
