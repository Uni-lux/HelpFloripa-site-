// =====================================================
// Cartões de escolha do Help Floripa (18/11/2026, pedido dele: "siga o padrão do último print" = cartão com o ícone
// num quadradinho, o nome em negrito e uma explicação curta embaixo). Usado no lugar das pílulas em Presentes
// (ocasião, abas), Help e alertas (o que aconteceu, o que foi levado, consultar, veículos) e na Comunidade.
//   cartaoOp({ nome, desc, icone, ativo, aoTocar, dados, cor })  → <button class="op-card">
//   grupoOps(cartões, { colunas: 1|2|3, rotulo, unico: true })     → <div class="op-grade"> (marca só um por vez)
// Sem dependências além do icones-hf.js; o CSS vem junto (uma vez por página).
// =====================================================
import { iconeEl } from "./icones-hf.js?v=3";

let estilo = false;
function css() {
  if (estilo || typeof document === "undefined") return; estilo = true;
  const s = document.createElement("style");
  s.textContent = `
.op-grade{display:grid;gap:8px;grid-template-columns:minmax(0,1fr)}
.op-grade.c2{grid-template-columns:repeat(2,minmax(0,1fr))}
.op-grade.c3{grid-template-columns:repeat(3,minmax(0,1fr))}
.op-card{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:10px;min-height:56px;padding:10px 12px;border-radius:16px;
  border:1.5px solid var(--line);background:var(--panel);color:var(--text);font:inherit;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent;
  transition:border-color .15s ease,background-color .15s ease,transform .12s ease}
.op-card:active{transform:scale(.98)}
.op-card .hf-ic.fundo{background:var(--panel-2);box-shadow:inset 0 0 0 1px var(--line);border-radius:12px}
.op-card .op-tx{display:grid;gap:1px;min-width:0}
.op-card b{font-size:14.5px;line-height:1.25;overflow-wrap:anywhere}
.op-card small{color:var(--muted);font-size:12px;line-height:1.3}
.op-grade.c1 .op-card b{font-size:15.5px}.op-grade.c1 .op-card small{font-size:12.5px}
.op-card[aria-pressed="true"],.op-card[aria-checked="true"]{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 9%,var(--panel))}
.op-card[aria-pressed="true"] .hf-ic.fundo,.op-card[aria-checked="true"] .hf-ic.fundo{color:var(--accent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 45%,var(--line))}
.op-card[aria-pressed="true"]::after{content:"";position:absolute;top:8px;right:8px;width:8px;height:8px;border-radius:50%;background:var(--accent)}
.op-card.perigo[aria-pressed="true"]{border-color:#e5484d;background:color-mix(in srgb,#e5484d 9%,var(--panel))}
.op-card.perigo[aria-pressed="true"]::after{background:#e5484d}
.op-card.perigo[aria-pressed="true"] .hf-ic.fundo{color:#e5484d}
.op-card:disabled{opacity:.45;cursor:default}
.op-card .op-n{position:absolute;top:8px;right:10px;min-width:20px;height:20px;padding:0 6px;border-radius:10px;display:grid;place-items:center;font-size:11.5px;font-weight:800;background:var(--accent);color:#001a24;font-style:normal}
.op-card .op-n:empty{display:none}
.op-sec{margin:14px 2px 6px;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
@media (max-width:360px){.op-grade.c3{grid-template-columns:repeat(2,minmax(0,1fr))}.op-card{gap:8px;padding:9px 10px}.op-card b{font-size:13.5px}}`;
  document.head.appendChild(s);
}
export function cartaoOp({ nome, desc = "", icone = "presente", ativo = false, aoTocar = null, dados = {}, cor = "", classe = "", tam = 20 }) {
  css();
  const b = document.createElement("button"); b.type = "button"; b.className = "op-card" + (classe ? " " + classe : "");
  b.setAttribute("aria-pressed", String(!!ativo));
  Object.entries(dados).forEach(([k, v]) => (b.dataset[k] = v));
  const tx = document.createElement("span"); tx.className = "op-tx";
  const n = document.createElement("b"); n.textContent = nome; tx.appendChild(n);
  if (desc) { const d = document.createElement("small"); d.textContent = desc; tx.appendChild(d); }
  b.append(iconeEl(icone, { tam, fundo: true, ...(cor ? { cor } : {}) }), tx);
  if (aoTocar) b.addEventListener("click", () => aoTocar(b));
  return b;
}
export function grupoOps(cartoes, { colunas = 2, rotulo = "", unico = true } = {}) {
  css();
  const g = document.createElement("div"); g.className = `op-grade c${colunas}`;
  g.setAttribute("role", "group"); if (rotulo) g.setAttribute("aria-label", rotulo);
  cartoes.forEach((c) => {
    if (unico) c.addEventListener("click", () => g.querySelectorAll(".op-card").forEach((x) => x.setAttribute("aria-pressed", String(x === c))), true);
    g.appendChild(c);
  });
  return g;
}
export function secaoOp(texto) { css(); const t = document.createElement("h4"); t.className = "op-sec"; t.textContent = texto; return t; }
