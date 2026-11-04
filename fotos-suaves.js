// =====================================================
// Fotos que aparecem aos poucos (como os apps grandes): enquanto a foto chega, o lugar dela mostra um brilho suave; quando
// ela chega, entra desfocada e fica nítida (0,45 s). Foto que já estava pronta (do aparelho) aparece direto, sem efeito.
// Vale para todas as <img> do site (Diário, Explorar, vitrines, Início, perfil, sino, Mensagens...), menos as pequenas
// (ícones e fotinhas de até 40 px), logos e o que tem data-sem-suave. Fundos (background-image) usam fundoSuave().
// Sem dependências. Ligado pelo firebase.js, rede.js, categoria.js e mensagens-app.js (uma vez só por página).
// Com "remover animações" do celular, só troca o brilho pela foto, sem desfoque.
// =====================================================
const CSS = `
img.hf-suave { background: linear-gradient(100deg, rgba(127,127,127,.12) 30%, rgba(127,127,127,.24) 50%, rgba(127,127,127,.12) 70%) 0 0 / 220% 100%;
  animation: hf-suave-brilho 1.2s linear infinite; filter: blur(14px); opacity: .55; transform: scale(1.015); }
img.hf-suave.hf-pronta { animation: none; background: none; filter: none; opacity: 1; transform: none;
  transition: filter .45s ease, opacity .35s ease, transform .45s ease; }
.hf-fundo-suave { background-color: rgba(127,127,127,.12) !important; }
.hf-fundo-suave.hf-pronta { animation: hf-suave-entra .45s ease; }
@keyframes hf-suave-brilho { to { background-position: -220% 0; } }
@keyframes hf-suave-entra { from { filter: blur(12px); opacity: .6; } }
@media (prefers-reduced-motion: reduce) {
  img.hf-suave { filter: none; transform: none; animation: none; opacity: .001; }
  img.hf-suave.hf-pronta { transition: opacity .2s; opacity: 1; }
  .hf-fundo-suave.hf-pronta { animation: none; }
}`;
const FORA = "[data-sem-suave], .logo, [class*='logo'], .topo, .flash-criar, .hfe-fundo, .story-visor, .reels, canvas";

function pronta(img) {
  img.classList.add("hf-pronta");
  setTimeout(() => img.classList.remove("hf-suave", "hf-pronta"), 520);
}
function tratar(img) {
  if (img._hfSuave || !img.getAttribute("src")) return; // sem endereço ainda: decide quando ele chegar
  img._hfSuave = true;
  if (img.closest(FORA)) return;
  // Já pronta (veio do aparelho): aparece direto.
  if (img.complete && img.naturalWidth) return;
  // Pequena (ícone, fotinha do sino ou do chat): sem efeito. Sem tamanho ainda (não está na tela): decide pelo atributo.
  const w = img.width || Number(img.getAttribute("width")) || 0, h = img.height || Number(img.getAttribute("height")) || 0;
  if ((w && w <= 40) || (h && h <= 40)) return;
  img.classList.add("hf-suave");
  const fim = () => { img.removeEventListener("load", fim); img.removeEventListener("error", fim); pronta(img); };
  img.addEventListener("load", fim); img.addEventListener("error", fim);
  // Segurança: nunca fica desfocada (foto que nunca termina, troca de src sem novo load).
  setTimeout(() => { if (img.classList.contains("hf-suave") && !img.classList.contains("hf-pronta")) pronta(img); }, 15000);
}
function varrer(no) {
  if (no.nodeType !== 1) return;
  if (no.tagName === "IMG") tratar(no);
  else if (no.getElementsByTagName) for (const i of no.getElementsByTagName("img")) tratar(i);
}

if (!window.__hfFotosSuaves && typeof MutationObserver === "function") {
  window.__hfFotosSuaves = true;
  const st = document.createElement("style"); st.textContent = CSS; (document.head || document.documentElement).appendChild(st);
  const ligar = () => {
    varrer(document.body);
    new MutationObserver((ms) => {
      for (const m of ms) {
        if (m.type === "attributes") { if (m.target.tagName === "IMG") tratar(m.target); continue; }
        for (const n of m.addedNodes) varrer(n);
      }
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
  };
  if (document.body) ligar(); else document.addEventListener("DOMContentLoaded", ligar);
}

// Fundo com foto (capas do Início e dos cartões): o brilho fica até a foto chegar e ela entra suave. Já no aparelho: direto.
export function fundoSuave(div, url) {
  if (!div || !url) return;
  const im = new Image();
  im.decoding = "async";
  im.src = url;
  if (im.complete && im.naturalWidth) { div.style.backgroundImage = `url("${url}")`; return; }
  div.classList.add("hf-fundo-suave");
  const fim = () => { div.style.backgroundImage = `url("${url}")`; div.classList.add("hf-pronta"); setTimeout(() => div.classList.remove("hf-fundo-suave", "hf-pronta"), 500); };
  im.onload = fim; im.onerror = fim;
}
