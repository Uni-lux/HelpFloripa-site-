// =====================================================
// Seletor bonito no lugar do <select> nativo (busca da página inicial e 404)
// - Celular: painel que sobe de baixo, com ícone, nome e descrição de cada opção.
// - Computador: lista logo abaixo do botão.
// - O <select> original continua na página (escondido) e recebe o valor e o
//   evento "change", então o resto do código não muda.
// - Teclado: Enter/Espaço abre, setas navegam, Esc fecha.
// =====================================================
const ICONES = {
  servicos: '<rect x="3.5" y="7" width="17" height="12.5" rx="2"/><path d="M9 7V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7M3.5 12.5h17"/>',
  delivery: '<path d="M3 10h18M4 10a8 8 0 0116 0M2 14h20M4 14l1 6h14l1-6"/>',
  lojinha: '<path d="M6 8h12l-1 12H7L6 8zM9 8V6a3 3 0 016 0v2"/>',
  imoveis: '<path d="M4 11.5L12 4l8 7.5M6 10v9.5h12V10M10 19.5v-5h4v5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  seta: '<path d="M6 9l6 6 6-6"/>'
};
const svg = (nome, cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONES[nome] || ""}</svg>`;

export const CLASSES_BUSCA = {
  servicos: { cor: "#00adee", desc: "Profissionais avaliados" },
  delivery: { cor: "#ff7a1a", desc: "Comida perto de você" },
  lojinha: { cor: "#b066ff", desc: "Produtos das lojas da cidade" },
  imoveis: { cor: "#2fbf71", desc: "Aluguel, venda e temporada" }
};

const CSS = `
.esc { position: relative; flex-shrink: 0; margin-right: 10px; }
.esc-btn { --c: #00adee; display: inline-flex; align-items: center; gap: 7px; height: 42px; padding: 0 10px 0 8px; border: 0; border-radius: 13px; cursor: pointer;
  font: inherit; font-size: 13.5px; font-weight: 800; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); transition: background .2s; }
.esc-btn:hover, .esc-btn[aria-expanded="true"] { background: color-mix(in srgb, var(--c) 22%, transparent); }
.esc-btn:focus-visible { outline: 2px solid var(--c); outline-offset: 2px; }
.esc-btn .esc-ic { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; background: var(--c); color: #fff; }
.esc-btn .esc-ic svg { width: 15px; height: 15px; }
.esc-btn .esc-seta { width: 15px; height: 15px; transition: transform .2s; }
.esc-btn[aria-expanded="true"] .esc-seta { transform: rotate(180deg); }
/* A busca das páginas estiliza "button" e "button span" (botão redondo da lupa, textos escondidos).
   Estas regras garantem que o seletor mantenha o próprio visual. */
.esc button.esc-btn { display: inline-flex !important; flex-direction: row !important; align-items: center !important; gap: 7px !important; width: auto !important; height: 42px !important; padding: 0 10px 0 7px !important; border-radius: 13px !important;
  color: var(--c) !important; background: color-mix(in srgb, var(--c) 14%, transparent) !important; box-shadow: none !important; filter: none !important; }
.esc button.esc-btn[aria-expanded="true"], .esc button.esc-btn:hover { background: color-mix(in srgb, var(--c) 22%, transparent) !important; }
.esc button.esc-btn > span { display: inline-flex !important; align-items: center; white-space: nowrap; }
.esc button.esc-btn > .esc-ic { display: grid !important; color: #fff !important; }
.esc button.esc-btn > .esc-ic svg { color: #fff !important; }
.esc button.esc-btn > .esc-seta { color: var(--c) !important; stroke-width: 2.5; }
@media (max-width: 380px) { .esc button.esc-btn > span:not(.esc-ic) { font-size: 12.5px; } }
.esc-fundo { position: fixed; inset: 0; z-index: 9400; background: rgba(2, 8, 14, .55); opacity: 0; transition: opacity .22s; -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px); }
.esc-fundo.on { opacity: 1; }
.esc-lista { position: fixed; z-index: 9401; margin: 0; padding: 8px; list-style: none; background: var(--panel, #0f161b); color: var(--text, #eaf0f3);
  border: 1px solid var(--line, #213038); box-shadow: 0 24px 60px rgba(0, 0, 0, .45); outline: none; }
.esc-lista .esc-tit { padding: 6px 10px 10px; font-size: 12px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; color: var(--muted, #8c9ca7); }
.esc-op { --c: #00adee; display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 14px; cursor: pointer; transition: background .15s; }
.esc-op + .esc-op { margin-top: 2px; }
.esc-op:hover, .esc-op.ativo { background: var(--hover, #19252c); }
.esc-op[aria-selected="true"] { background: color-mix(in srgb, var(--c) 13%, transparent); }
.esc-op .esc-ic { width: 42px; height: 42px; flex-shrink: 0; border-radius: 13px; display: grid; place-items: center; color: var(--c); background: color-mix(in srgb, var(--c) 15%, transparent); }
.esc-op[aria-selected="true"] .esc-ic { background: var(--c); color: #fff; box-shadow: 0 8px 20px color-mix(in srgb, var(--c) 40%, transparent); }
.esc-op .esc-ic svg { width: 21px; height: 21px; }
.esc-op .esc-tx { flex: 1; min-width: 0; display: grid; gap: 1px; }
.esc-op strong { font-size: 15.5px; font-weight: 800; }
.esc-op small { font-size: 12.5px; color: var(--muted, #8c9ca7); }
.esc-op .esc-ok { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; color: #fff; background: var(--c); opacity: 0; transform: scale(.6); transition: opacity .2s, transform .2s; }
.esc-op .esc-ok svg { width: 14px; height: 14px; stroke-width: 3; }
.esc-op[aria-selected="true"] .esc-ok { opacity: 1; transform: none; }
/* computador: lista abaixo do botão */
.esc-lista.flutua { width: 300px; border-radius: 18px; transform-origin: top left; animation: esc-abre .18s ease-out; }
@keyframes esc-abre { from { opacity: 0; transform: translateY(-6px) scale(.98); } }
/* celular: painel que sobe de baixo */
.esc-lista.painel { left: 0; right: 0; bottom: 0; padding: 8px 12px calc(16px + env(safe-area-inset-bottom)); border-radius: 24px 24px 0 0; border-width: 1px 0 0;
  transform: translateY(100%); transition: transform .28s cubic-bezier(.2, .8, .2, 1); }
.esc-lista.painel.on { transform: none; }
.esc-lista.painel::before { content: ""; display: block; width: 42px; height: 5px; margin: 4px auto 10px; border-radius: 99px; background: var(--line, #213038); }
.esc-lista.painel .esc-op { padding: 12px 10px; }
@media (prefers-reduced-motion: reduce) { .esc-lista, .esc-fundo { animation: none !important; transition: none !important; } }
`;
let cssPronto = false;
function css() {
  if (cssPronto) return;
  cssPronto = true;
  const s = document.createElement("style");
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function enfeitarSelect(select, { titulo = "Onde buscar", info = CLASSES_BUSCA } = {}) {
  if (!select || select.dataset.enfeitado) return null;
  select.dataset.enfeitado = "1";
  css();
  const opcoes = [...select.options].map((o) => ({ valor: o.value, nome: o.textContent.trim(), ...(info[o.value] || {}) }));
  const caixa = document.createElement("div");
  caixa.className = "esc";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "esc-btn";
  btn.setAttribute("aria-haspopup", "listbox");
  btn.setAttribute("aria-expanded", "false");
  caixa.appendChild(btn);
  select.hidden = true;
  select.tabIndex = -1;
  select.insertAdjacentElement("afterend", caixa);
  // O <label for> do select passa a apontar para o botão
  const rot = select.id && document.querySelector(`label[for="${select.id}"]`);
  if (rot) { btn.id = select.id + "Btn"; rot.htmlFor = btn.id; }

  function pintarBotao() {
    const o = opcoes.find((x) => x.valor === select.value) || opcoes[0];
    btn.style.setProperty("--c", o.cor || "var(--accent)");
    btn.innerHTML = `<span class="esc-ic">${svg(o.valor)}</span><span>${o.nome.replace(/[<>&]/g, "")}</span>${svg("seta", "esc-seta")}`;
    btn.setAttribute("aria-label", `${titulo}: ${o.nome}`);
  }

  let lista = null, fundo = null, ativo = 0;
  const celular = () => matchMedia("(max-width: 599px)").matches;
  function abrir() {
    if (lista) return;
    const ehPainel = celular();
    fundo = document.createElement("div");
    fundo.className = "esc-fundo";
    if (!ehPainel) fundo.style.background = "transparent";
    fundo.addEventListener("click", fechar);
    lista = document.createElement("ul");
    lista.className = "esc-lista " + (ehPainel ? "painel" : "flutua");
    lista.setAttribute("role", "listbox");
    lista.setAttribute("aria-label", titulo);
    lista.tabIndex = -1;
    const t = document.createElement("li");
    t.className = "esc-tit"; t.setAttribute("role", "presentation"); t.textContent = titulo;
    lista.appendChild(t);
    opcoes.forEach((o, k) => {
      const li = document.createElement("li");
      li.className = "esc-op";
      li.setAttribute("role", "option");
      li.id = `esc-${select.id || "op"}-${k}`;
      li.style.setProperty("--c", o.cor || "var(--accent)");
      li.setAttribute("aria-selected", o.valor === select.value ? "true" : "false");
      li.innerHTML = `<span class="esc-ic">${svg(o.valor)}</span><span class="esc-tx"><strong></strong><small></small></span><span class="esc-ok">${svg("check")}</span>`;
      li.querySelector("strong").textContent = o.nome;
      li.querySelector("small").textContent = o.desc || "";
      li.addEventListener("click", () => escolher(k));
      li.addEventListener("mousemove", () => marcar(k));
      lista.appendChild(li);
    });
    document.body.append(fundo, lista);
    if (!ehPainel) {
      const r = btn.getBoundingClientRect();
      lista.style.top = `${r.bottom + 8}px`;
      lista.style.left = `${Math.max(8, Math.min(r.left, innerWidth - 308))}px`;
    }
    requestAnimationFrame(() => { fundo?.classList.add("on"); lista?.classList.add("on"); });
    btn.setAttribute("aria-expanded", "true");
    marcar(Math.max(0, opcoes.findIndex((o) => o.valor === select.value)));
    lista.addEventListener("keydown", teclas);
    lista.focus({ preventScroll: true });
    addEventListener("resize", fechar, { once: true });
  }
  function fechar() {
    if (!lista) return;
    const l = lista, f = fundo;
    lista = fundo = null;
    btn.setAttribute("aria-expanded", "false");
    l.classList.remove("on"); f.classList.remove("on");
    setTimeout(() => { l.remove(); f.remove(); }, l.classList.contains("painel") ? 280 : 0);
    btn.focus({ preventScroll: true });
  }
  function marcar(k) {
    ativo = (k + opcoes.length) % opcoes.length;
    lista?.querySelectorAll(".esc-op").forEach((li, i) => li.classList.toggle("ativo", i === ativo));
    lista?.setAttribute("aria-activedescendant", `esc-${select.id || "op"}-${ativo}`);
  }
  function escolher(k) {
    const o = opcoes[k];
    if (o && o.valor !== select.value) {
      select.value = o.valor;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    pintarBotao();
    fechar();
  }
  function teclas(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); marcar(ativo + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); marcar(ativo - 1); }
    else if (e.key === "Home") { e.preventDefault(); marcar(0); }
    else if (e.key === "End") { e.preventDefault(); marcar(opcoes.length - 1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); escolher(ativo); }
    else if (e.key === "Escape" || e.key === "Tab") { e.preventDefault(); fechar(); }
  }
  btn.addEventListener("click", () => (lista ? fechar() : abrir()));
  btn.addEventListener("keydown", (e) => { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); abrir(); } });
  select.addEventListener("change", pintarBotao);
  pintarBotao();
  return { atualizar: pintarBotao };
}
