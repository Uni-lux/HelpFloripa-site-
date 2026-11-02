// =====================================================
// Fotos sem o menu do navegador (pedido do dono, 02/11/2026): segurar uma foto, vídeo ou desenho em qualquer página
// do site NÃO abre "Copiar / Baixar / Compartilhar imagem / Abrir no Chrome" (nem arrasta a foto no computador).
// Campos de texto e links de texto continuam normais. Salvar o próprio flash fica no ⋯ → "Salvar foto".
// Ligado pelo firebase.js, rede.js e categoria.js (uma vez só por página).
// =====================================================
const ALVOS = "img, picture, video, canvas, svg, [style*='background-image'], .avatar, .foto, .midia";
if (!window.__hfSemMenuImagem) {
  window.__hfSemMenuImagem = true;
  const css = document.createElement("style");
  css.textContent = `img, picture, video, canvas, svg { -webkit-touch-callout: none; -webkit-user-drag: none; user-drag: none; }
    img { -webkit-user-select: none; user-select: none; }`;
  (document.head || document.documentElement).appendChild(css);
  const naFoto = (e) => { const t = e.target; return t?.closest && !t.closest("input, textarea, [contenteditable='true']") && !!t.closest(ALVOS); };
  document.addEventListener("contextmenu", (e) => { if (naFoto(e)) e.preventDefault(); }, true);
  document.addEventListener("dragstart", (e) => { if (e.target?.closest?.("img, picture, video, canvas, svg")) e.preventDefault(); }, true);
}
export {};
