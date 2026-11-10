// =====================================================
// Fotos sem o menu do navegador (pedido do dono, 02/11/2026): segurar uma foto, vídeo ou desenho em qualquer página
// do site NÃO abre "Copiar / Baixar / Compartilhar imagem / Abrir no Chrome" (nem arrasta a foto no computador).
// Campos de texto e links de texto continuam normais. Salvar o próprio flash fica no ⋯ → "Salvar foto".
// Também tira o retângulo azul que o celular pinta por cima do que é tocado (pedido do dono, 04/11/2026).
// No celular (toque), segurar um texto também NÃO seleciona nem abre "Copiar / Selecionar tudo" (pedido do dono,
// 09/11/2026): só campos de texto (e o que tiver data-selecionavel) continuam selecionáveis. Copiar uma mensagem do
// chat fica no menu da própria mensagem.
// No celular, as barrinhas de rolagem também ficam escondidas em todas as páginas (pedido do dono, 10/11/2026).
// Ligado pelo firebase.js, rede.js e categoria.js (uma vez só por página).
// =====================================================
const ALVOS = "img, picture, video, canvas, svg, [style*='background-image'], .avatar, .foto, .midia";
if (!window.__hfSemMenuImagem) {
  window.__hfSemMenuImagem = true;
  const css = document.createElement("style");
  css.textContent = `img, picture, video, canvas, svg { -webkit-touch-callout: none; -webkit-user-drag: none; user-drag: none; }
    img { -webkit-user-select: none; user-select: none; }
    html, a, button, [role='button'], label, summary { -webkit-tap-highlight-color: transparent; }
    @media (pointer: coarse) {
      html, body, body * { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
      input, textarea, select, [contenteditable='true'], [contenteditable='true'] *, [data-selecionavel], [data-selecionavel] * { -webkit-user-select: text; user-select: text; -webkit-touch-callout: default; }
      /* sem a barrinha de rolagem do lado (que acompanha subindo/descendo), como nos apps (10/11/2026) */
      html, body, body * { scrollbar-width: none; }
      html::-webkit-scrollbar, body::-webkit-scrollbar, body *::-webkit-scrollbar { display: none; width: 0; height: 0; }
    }`;
  (document.head || document.documentElement).appendChild(css);
  const naFoto = (e) => { const t = e.target; return t?.closest && !t.closest("input, textarea, [contenteditable='true']") && !!t.closest(ALVOS); };
  const toque = () => window.matchMedia?.("(pointer: coarse)").matches;
  const emCampo = (t) => !!t?.closest?.("input, textarea, select, [contenteditable='true'], [data-selecionavel]");
  document.addEventListener("contextmenu", (e) => { if (naFoto(e) || (toque() && !emCampo(e.target))) e.preventDefault(); }, true);
  // Seleção que começar fora de um campo (ex.: toque duplo em texto no Android) é desfeita na hora.
  document.addEventListener("selectionchange", () => {
    if (!toque()) return;
    const sel = document.getSelection(); if (!sel || sel.isCollapsed || !sel.anchorNode) return;
    const no = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement;
    if (!emCampo(no) && !emCampo(document.activeElement)) sel.removeAllRanges();
  });
  // Barrinha de rolagem do Android na rede (10/11/2026): no celular o Chrome desenha a barra da página dentro de cada aba
  // (iframe) por cima de tudo e ignora o CSS acima. A casca (rede.html) deixa o quadro 6 px mais largo que a tela
  // (a barra fica fora da tela) e aqui a página devolve esses 6 px: margem à direita e as camadas de tela cheia
  // terminando 6 px antes. O Mensagens rola dentro de uma caixa (onde o CSS funciona) e fica de fora.
  try {
    const casca = window.parent !== window && window.parent === window.top && !!window.top.__hfShell;
    if (casca && toque() && window.frameElement?.dataset.id !== "mensagens") {
      document.documentElement.classList.add("hf-corte");
      const c = document.createElement("style");
      c.textContent = `html.hf-corte { --hf-corte: 6px; padding-right: var(--hf-corte); }
        html.hf-corte :is(.folha, .story-visor, .flash-criar, .visor-exp, .foto-grande, .pa-pagina, .reels, .md-visor, .topico, .cm-modal,
          .vt-modal, .vt-local-fundo, .hf-confirma-fundo, .hf-den-fundo, .hf-aval-fundo, .hfe-fundo, .esc-lista, .pl-fundo, .pv-fundo,
          .ad-modal-fundo, .hm-local-pop, .hfl, .hf-volta-flash) { right: var(--hf-corte) !important; }
        html.hf-corte body.com-barra::after { right: var(--hf-corte); }
        html.hf-corte .barra-rede { margin-left: calc(var(--hf-corte) / -2); }`;
      (document.head || document.documentElement).appendChild(c);
    }
  } catch {}
  document.addEventListener("dragstart", (e) => { if (e.target?.closest?.("img, picture, video, canvas, svg")) e.preventDefault(); }, true);
}
export {};
