// =====================================================
// Campos no visual do site, no lugar das janelas do celular/navegador
// - <select>: painel com as opções (sobe de baixo no celular, janela no computador),
//   com busca quando a lista é grande (ex.: os 27 estados) e grupos (<optgroup>).
// - <input type="time">: seletor de horário com duas rodas (horas e minutos).
// - <input type="date">: calendário do mês (respeita min/max), atalhos e escolha rápida de mês e ano.
// Funciona em todas as páginas (ligado no firebase.js), inclusive nos campos criados
// depois pelo JavaScript: os toques são ouvidos no documento inteiro. O campo original
// continua no lugar (mesmo visual, mesmo valor) e recebe "input"/"change" como antes.
// Para deixar um campo com a janela nativa: data-nativo.
// =====================================================
const CSS = `
.hfc-fundo { position: fixed; inset: 0; z-index: 9800; background: rgba(2, 8, 14, .55); opacity: 0; transition: opacity .2s; -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px); }
.hfc-fundo.on { opacity: 1; }
.hfc { position: fixed; z-index: 9801; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; max-height: min(78vh, 640px);
  background: var(--panel, #0f161b); color: var(--text, #eaf0f3); border-top: 1px solid var(--line, #213038);
  border-radius: 24px 24px 0 0; box-shadow: 0 -18px 60px rgba(0, 0, 0, .4); padding: 0 0 env(safe-area-inset-bottom);
  transform: translateY(100%); transition: transform .28s cubic-bezier(.2, .8, .2, 1); font-family: inherit; outline: none; }
.hfc.on { transform: none; }
:root[data-theme="light"] .hfc { background: var(--panel, #fff); color: var(--text, #0f1b22); border-color: var(--line, #e2e8ec); }
.hfc::before { content: ""; display: block; flex: none; width: 42px; height: 5px; margin: 8px auto 2px; border-radius: 99px; background: var(--line, #2a3a44); }
@media (min-width: 600px) {
  .hfc { left: 50%; right: auto; bottom: auto; top: 50%; width: min(420px, calc(100% - 32px)); border: 1px solid var(--line, #213038);
    border-radius: 22px; transform: translate(-50%, -46%) scale(.98); opacity: 0; transition: transform .2s, opacity .2s; padding-bottom: 0; }
  .hfc.on { transform: translate(-50%, -50%); opacity: 1; }
  .hfc::before { display: none; }
}
.hfc-cab { flex: none; display: flex; align-items: center; gap: 10px; padding: 12px 16px 10px 20px; }
.hfc-cab strong { flex: 1; min-width: 0; font-size: 17px; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hfc-x { flex: none; width: 38px; height: 38px; display: grid; place-items: center; border: 0; border-radius: 50%; background: color-mix(in srgb, var(--muted, #8c9ca7) 14%, transparent); color: inherit; cursor: pointer; }
.hfc-x svg, .hfc-busca svg, .hfc-op .hfc-ok svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.hfc-busca { flex: none; display: flex; align-items: center; gap: 8px; margin: 0 16px 8px; padding: 0 14px; height: 44px; border-radius: 14px; border: 1px solid var(--line, #213038); background: var(--bg, #0b1014); color: var(--muted, #8c9ca7); }
.hfc-busca input { flex: 1; min-width: 0; height: 100%; border: 0; outline: 0; background: none; color: var(--text, #eaf0f3); font: inherit; font-size: 15.5px; }
:root[data-theme="light"] .hfc-busca { background: var(--bg, #f3f6f8); }
:root[data-theme="light"] .hfc-busca input { color: var(--text, #0f1b22); }
.hfc-lista { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 2px 10px 12px; margin: 0; list-style: none; }
.hfc-grupo { padding: 12px 10px 6px; font-size: 11.5px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: var(--muted, #8c9ca7); }
.hfc-op { display: flex; align-items: center; gap: 12px; min-height: 50px; padding: 8px 12px; border-radius: 14px; cursor: pointer; font-size: 15.5px; font-weight: 650; transition: background .12s; }
.hfc-op + .hfc-op { margin-top: 2px; }
.hfc-op:hover, .hfc-op.ativo { background: var(--hover, color-mix(in srgb, var(--muted, #8c9ca7) 12%, transparent)); }
.hfc-op[aria-selected="true"] { background: color-mix(in srgb, var(--accent, #00adee) 14%, transparent); color: var(--accent, #00adee); font-weight: 800; }
.hfc-op[aria-disabled="true"] { opacity: .45; cursor: default; }
.hfc-op .hfc-tx { flex: 1; min-width: 0; }
.hfc-op .hfc-sig { flex: none; margin-left: auto; padding: 2px 8px; border-radius: 8px; font-size: 12px; font-weight: 800; color: var(--muted, #8c9ca7); background: color-mix(in srgb, var(--muted, #8c9ca7) 12%, transparent); }
.hfc-op .hfc-ok { flex: none; width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; border: 2px solid color-mix(in srgb, var(--muted, #8c9ca7) 45%, transparent); color: #fff; }
.hfc-op[aria-selected="true"] .hfc-ok { border-color: var(--accent, #00adee); background: var(--accent, #00adee); }
.hfc-op:not([aria-selected="true"]) .hfc-ok svg { display: none; }
.hfc-op .hfc-ok svg { width: 13px; height: 13px; stroke-width: 3.2; }
.hfc-vazio { padding: 26px 12px; text-align: center; color: var(--muted, #8c9ca7); font-size: 14px; }
/* horário */
.hfc-hora { flex: none; padding: 2px 16px 0; }
.hfc-visor { display: flex; justify-content: center; align-items: baseline; gap: 4px; padding: 2px 0 10px; font-size: 44px; font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: .02em; }
.hfc-visor span { color: var(--muted, #8c9ca7); font-weight: 700; }
.hfc-rodas { position: relative; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; height: 220px; }
.hfc-rodas::before { content: ""; position: absolute; left: 0; right: 0; top: 88px; height: 44px; border-radius: 14px; background: color-mix(in srgb, var(--accent, #00adee) 14%, transparent); border: 1px solid color-mix(in srgb, var(--accent, #00adee) 35%, transparent); pointer-events: none; }
.hfc-rodas::after { content: ":"; position: absolute; left: 50%; top: 88px; height: 44px; line-height: 42px; transform: translateX(-50%); font-size: 22px; font-weight: 800; color: var(--accent, #00adee); pointer-events: none; }
.hfc-roda { position: relative; overflow-y: auto; scroll-snap-type: y mandatory; scrollbar-width: none; overscroll-behavior: contain; padding: 88px 0;
  -webkit-mask-image: linear-gradient(transparent, #000 30%, #000 70%, transparent); mask-image: linear-gradient(transparent, #000 30%, #000 70%, transparent); }
.hfc-roda::-webkit-scrollbar { display: none; }
.hfc-roda button { display: block; width: 100%; height: 44px; border: 0; background: none; color: inherit; font: inherit; font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; scroll-snap-align: center; cursor: pointer; opacity: .45; transition: opacity .12s, transform .12s; }
.hfc-roda button.on { opacity: 1; color: var(--accent, #00adee); transform: scale(1.08); }
.hfc-rotulos { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 6px 0 2px; text-align: center; font-size: 12px; font-weight: 750; color: var(--muted, #8c9ca7); }
.hfc-atalhos { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; padding: 10px 0 2px; }
.hfc-atalhos::-webkit-scrollbar { display: none; }
.hfc-atalhos button { flex: none; height: 34px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--line, #213038); background: none; color: inherit; font: inherit; font-size: 13.5px; font-weight: 750; cursor: pointer; }
.hfc-rodape { flex: none; display: flex; gap: 10px; padding: 12px 16px 14px; }
.hfc-rodape button { flex: 1; min-height: 48px; border-radius: 14px; font: inherit; font-size: 15.5px; font-weight: 800; cursor: pointer; }
.hfc-rodape .sec { border: 1px solid var(--line, #213038); background: none; color: inherit; }
.hfc-rodape .pri { border: 0; background: var(--accent, #00adee); color: var(--accent-ink, #001a24); }
.hfc button:focus-visible, .hfc-op:focus-visible { outline: 2px solid var(--accent, #00adee); outline-offset: 2px; }
/* calendário */
.hfc-cal { flex: none; padding: 0 14px; }
.hfc-dia-visor { padding: 0 6px 10px; font-size: 22px; font-weight: 800; letter-spacing: -.01em; }
.hfc-dia-visor small { display: block; font-size: 12.5px; font-weight: 700; color: var(--muted, #8c9ca7); letter-spacing: 0; }
.hfc-mes { display: flex; align-items: center; gap: 6px; padding: 0 0 6px; }
.hfc-mes-tit { flex: 1; display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 10px; border: 0; border-radius: 12px; background: none; color: inherit; font: inherit; font-size: 15.5px; font-weight: 800; cursor: pointer; text-align: left; }
.hfc-mes-tit::after { content: ""; width: 7px; height: 7px; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: rotate(45deg); margin: -4px 0 0 4px; opacity: .7; }
.hfc-mes-tit.aberto::after { transform: rotate(-135deg); margin-top: 3px; }
.hfc-nav { width: 40px; height: 40px; display: grid; place-items: center; border: 0; border-radius: 50%; background: color-mix(in srgb, var(--muted, #8c9ca7) 12%, transparent); color: inherit; cursor: pointer; }
.hfc-nav svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.hfc-nav:disabled { opacity: .3; cursor: default; }
.hfc-semana, .hfc-dias { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.hfc-semana span { padding: 6px 0; text-align: center; font-size: 12px; font-weight: 800; color: var(--muted, #8c9ca7); }
.hfc-dias button { aspect-ratio: 1; max-height: 46px; width: 100%; display: grid; place-items: center; border: 0; border-radius: 50%; background: none; color: inherit; font: inherit; font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; cursor: pointer; }
.hfc-dias button:hover:not(:disabled) { background: color-mix(in srgb, var(--muted, #8c9ca7) 14%, transparent); }
.hfc-dias button.hoje { box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--accent, #00adee) 70%, transparent); color: var(--accent, #00adee); }
.hfc-dias button.on { background: var(--accent, #00adee); color: var(--accent-ink, #001a24); box-shadow: none; font-weight: 900; }
.hfc-dias button:disabled { opacity: .28; cursor: default; }
.hfc-dias .fora { visibility: hidden; }
.hfc-grade { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; max-height: 286px; overflow-y: auto; overscroll-behavior: contain; padding: 2px; }
.hfc-grade button { min-height: 46px; border: 1px solid var(--line, #213038); border-radius: 14px; background: none; color: inherit; font: inherit; font-size: 15px; font-weight: 750; text-transform: capitalize; cursor: pointer; }
.hfc-grade button.on { background: var(--accent, #00adee); border-color: var(--accent, #00adee); color: var(--accent-ink, #001a24); }
.hfc-grade button:disabled { opacity: .3; cursor: default; }
@media (prefers-reduced-motion: reduce) { .hfc, .hfc-fundo { transition: none !important; } }
`;
const ICONE = {
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  lupa: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  esq: '<path d="M15 6l-6 6 6 6"/>',
  dir: '<path d="M9 6l6 6-6 6"/>'
};
const svg = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONE[n]}</svg>`;
let cssPronto = false;
function css() {
  if (cssPronto) return;
  cssPronto = true;
  const s = document.createElement("style"); s.id = "hfCamposCss"; s.textContent = CSS;
  document.head.appendChild(s);
}
const semAcento = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const disparar = (campo) => { campo.dispatchEvent(new Event("input", { bubbles: true })); campo.dispatchEvent(new Event("change", { bubbles: true })); };

// Nome do campo para o título: <label for>, label em volta, aria-label ou o texto da 1ª opção vazia.
function tituloDe(campo, padrao) {
  const rot = (campo.id && document.querySelector(`label[for="${CSS_ESC(campo.id)}"]`)) || campo.closest("label");
  const t = campo.getAttribute("aria-label") || campo.dataset.titulo || (rot ? [...rot.childNodes].filter((n) => n.nodeType === 3 || (n.nodeType === 1 && !n.matches("select, input, textarea, button"))).map((n) => n.textContent).join(" ") : "");
  const limpo = String(t || "").replace(/\s+/g, " ").replace(/\s*[*:]\s*$/, "").trim();
  return limpo.slice(0, 60) || padrao;
}
const CSS_ESC = (s) => (window.CSS?.escape ? window.CSS.escape(s) : String(s).replace(/"/g, '\\"'));

// ---------- painel (comum aos dois) ----------
let aberto = null;
function painel(titulo, aoFechar) {
  css();
  fecharPainel();
  const fundo = document.createElement("div"); fundo.className = "hfc-fundo";
  const cx = document.createElement("div"); cx.className = "hfc"; cx.setAttribute("role", "dialog"); cx.setAttribute("aria-modal", "true"); cx.tabIndex = -1;
  const cab = document.createElement("div"); cab.className = "hfc-cab";
  const t = document.createElement("strong"); t.textContent = titulo; t.id = "hfcTit" + Date.now();
  cx.setAttribute("aria-labelledby", t.id);
  const x = document.createElement("button"); x.type = "button"; x.className = "hfc-x"; x.setAttribute("aria-label", "Fechar"); x.innerHTML = svg("x");
  cab.append(t, x); cx.appendChild(cab);
  document.body.append(fundo, cx);
  const anterior = document.activeElement;
  const fechar = () => {
    if (aberto?.cx !== cx) return;
    aberto = null;
    document.removeEventListener("keydown", tecla, true);
    fundo.classList.remove("on"); cx.classList.remove("on");
    setTimeout(() => { fundo.remove(); cx.remove(); }, 260);
    aoFechar?.();
    try { anterior?.focus?.({ preventScroll: true }); } catch {}
  };
  const tecla = (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); fechar(); } };
  document.addEventListener("keydown", tecla, true);
  fundo.addEventListener("click", fechar); x.addEventListener("click", fechar);
  aberto = { cx, fechar };
  requestAnimationFrame(() => { fundo.classList.add("on"); cx.classList.add("on"); });
  return { cx, fechar };
}
function fecharPainel() { aberto?.fechar(); }

// ---------- lista de opções ----------
export function abrirSelect(select) {
  const itens = [];
  [...select.children].forEach((n) => {
    if (n.tagName === "OPTGROUP") { itens.push({ grupo: n.label }); [...n.children].forEach((o) => itens.push({ o, dis: o.disabled || n.disabled })); }
    else if (n.tagName === "OPTION") itens.push({ o: n, dis: n.disabled });
  });
  // Opção vazia desabilitada ("Escolha...") não entra na lista.
  const visiveis = itens.filter((x) => x.grupo || !(x.o.value === "" && x.dis) && !x.o.hidden);
  const { cx, fechar } = painel(tituloDe(select, "Escolha uma opção"));
  let filtro = "";
  const ops = visiveis.filter((x) => x.o);
  if (ops.length > 12) {
    const b = document.createElement("label"); b.className = "hfc-busca";
    b.innerHTML = svg("lupa");
    const inp = document.createElement("input"); inp.type = "search"; inp.placeholder = "Buscar"; inp.setAttribute("aria-label", "Buscar na lista"); inp.autocomplete = "off";
    inp.addEventListener("input", () => { filtro = semAcento(inp.value.trim()); pintar(); });
    inp.addEventListener("keydown", (e) => { if (e.key === "ArrowDown") { e.preventDefault(); lista.querySelector(".hfc-op:not([aria-disabled=true])")?.focus(); } if (e.key === "Enter") { e.preventDefault(); lista.querySelector(".hfc-op:not([aria-disabled=true])")?.click(); } });
    b.appendChild(inp); cx.appendChild(b);
  }
  const lista = document.createElement("ul"); lista.className = "hfc-lista"; lista.setAttribute("role", "listbox");
  cx.appendChild(lista);
  function pintar() {
    lista.replaceChildren();
    let grupo = null, n = 0;
    visiveis.forEach((x) => {
      if (x.grupo) { grupo = x.grupo; return; }
      const txt = x.o.textContent.trim();
      if (filtro && !semAcento(txt + " " + x.o.value).includes(filtro)) return;
      if (grupo) { const g = document.createElement("li"); g.className = "hfc-grupo"; g.setAttribute("role", "presentation"); g.textContent = grupo; lista.appendChild(g); grupo = null; }
      const li = document.createElement("li"); li.className = "hfc-op"; li.setAttribute("role", "option"); li.tabIndex = 0;
      const sel = x.o.value === select.value && x.o.selected !== false;
      li.setAttribute("aria-selected", String(sel));
      if (x.dis) li.setAttribute("aria-disabled", "true");
      // "Santa Catarina (SC)": a sigla vai para o canto, como etiqueta.
      const m = txt.match(/^(.*\S)\s*\(([A-Z]{2})\)$/);
      const tx = document.createElement("span"); tx.className = "hfc-tx"; tx.textContent = m ? m[1] : (txt || "—");
      li.appendChild(tx);
      if (m) { const s = document.createElement("span"); s.className = "hfc-sig"; s.textContent = m[2]; li.appendChild(s); }
      const ok = document.createElement("span"); ok.className = "hfc-ok"; ok.innerHTML = svg("check"); li.appendChild(ok);
      const escolher = () => {
        if (x.dis) return;
        if (select.value !== x.o.value) { select.value = x.o.value; disparar(select); }
        fechar();
      };
      li.addEventListener("click", escolher);
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); escolher(); }
        if (e.key === "ArrowDown") { e.preventDefault(); li.nextElementSibling?.focus(); }
        if (e.key === "ArrowUp") { e.preventDefault(); (li.previousElementSibling?.matches(".hfc-op") ? li.previousElementSibling : cx.querySelector(".hfc-busca input"))?.focus(); }
      });
      lista.appendChild(li); n++;
    });
    if (!n) { const v = document.createElement("li"); v.className = "hfc-vazio"; v.textContent = "Nada encontrado."; lista.appendChild(v); }
  }
  pintar();
  // A escolhida aparece no meio da lista.
  requestAnimationFrame(() => {
    const atual = lista.querySelector('.hfc-op[aria-selected="true"]');
    if (atual) lista.scrollTop = atual.offsetTop - lista.clientHeight / 2 + atual.offsetHeight / 2;
    (matchMedia("(min-width: 600px)").matches && cx.querySelector(".hfc-busca input") || atual || lista.querySelector(".hfc-op") || cx).focus({ preventScroll: true });
  });
}

// ---------- horário ----------
const dois = (n) => String(n).padStart(2, "0");
export function abrirHora(input) {
  const passo = Math.max(1, Math.round((Number(input.step) || 300) / 60)); // em minutos (padrão: de 5 em 5)
  const minutos = []; for (let m = 0; m < 60; m += passo) minutos.push(m);
  const [h0, m0] = (/^\d{2}:\d{2}/.test(input.value) ? input.value : (input.dataset.padrao || "09:00")).split(":").map(Number);
  if (!minutos.includes(m0)) { minutos.push(m0); minutos.sort((a, b) => a - b); }
  let h = h0, m = m0;
  const { cx, fechar } = painel(tituloDe(input, "Horário"));
  const caixa = document.createElement("div"); caixa.className = "hfc-hora";
  const visor = document.createElement("div"); visor.className = "hfc-visor"; visor.setAttribute("aria-live", "polite");
  const rot = document.createElement("div"); rot.className = "hfc-rotulos"; rot.innerHTML = "<span>Hora</span><span>Minuto</span>";
  const rodas = document.createElement("div"); rodas.className = "hfc-rodas";
  const roda = (valores, atual, aoMudar, nome) => {
    const r = document.createElement("div"); r.className = "hfc-roda"; r.setAttribute("role", "listbox"); r.setAttribute("aria-label", nome); r.tabIndex = 0;
    valores.forEach((v) => { const b = document.createElement("button"); b.type = "button"; b.textContent = dois(v); b.dataset.v = v; b.tabIndex = -1; b.addEventListener("click", () => ir(v, true)); r.appendChild(b); });
    let tempo = 0;
    const marcar = (v) => r.querySelectorAll("button").forEach((b) => b.classList.toggle("on", Number(b.dataset.v) === v));
    function ir(v, suave) {
      const i = valores.indexOf(v); if (i < 0) return;
      r.scrollTo({ top: i * 44, behavior: suave ? "smooth" : "auto" });
      marcar(v); aoMudar(v);
    }
    r.addEventListener("scroll", () => {
      clearTimeout(tempo);
      const i = Math.max(0, Math.min(valores.length - 1, Math.round(r.scrollTop / 44)));
      marcar(valores[i]);
      tempo = setTimeout(() => aoMudar(valores[i]), 60);
    }, { passive: true });
    r.addEventListener("keydown", (e) => {
      const i = valores.indexOf(r._v ?? atual);
      if (e.key === "ArrowDown") { e.preventDefault(); ir(valores[Math.min(valores.length - 1, i + 1)], true); }
      if (e.key === "ArrowUp") { e.preventDefault(); ir(valores[Math.max(0, i - 1)], true); }
    });
    r._ir = ir;
    requestAnimationFrame(() => ir(atual, false));
    return r;
  };
  const pintarVisor = () => { visor.innerHTML = `${dois(h)}<span>:</span>${dois(m)}`; };
  const rh = roda([...Array(24).keys()], h, (v) => { h = v; rh._v = v; pintarVisor(); }, "Hora");
  const rm = roda(minutos, m, (v) => { m = v; rm._v = v; pintarVisor(); }, "Minuto");
  rodas.append(rh, rm);
  // Atalhos dos horários mais usados.
  const at = document.createElement("div"); at.className = "hfc-atalhos";
  ["08:00", "09:00", "12:00", "13:00", "14:00", "18:00", "19:00", "22:00"].forEach((x) => {
    const b = document.createElement("button"); b.type = "button"; b.textContent = x;
    b.addEventListener("click", () => { const [a, c] = x.split(":").map(Number); rh._ir(a, true); if (minutos.includes(c)) rm._ir(c, true); });
    at.appendChild(b);
  });
  caixa.append(visor, rot, rodas, at);
  cx.appendChild(caixa);
  const rod = document.createElement("div"); rod.className = "hfc-rodape";
  const limpar = document.createElement("button"); limpar.type = "button"; limpar.className = "sec"; limpar.textContent = input.required ? "Cancelar" : "Limpar";
  const pronto = document.createElement("button"); pronto.type = "button"; pronto.className = "pri"; pronto.textContent = "Pronto";
  limpar.addEventListener("click", () => { if (!input.required && input.value) { input.value = ""; disparar(input); } fechar(); });
  pronto.addEventListener("click", () => {
    const v = `${dois(h)}:${dois(m)}`;
    if (input.value !== v) { input.value = v; disparar(input); }
    fechar();
  });
  rod.append(limpar, pronto); cx.appendChild(rod);
  pintarVisor();
  requestAnimationFrame(() => rh.focus({ preventScroll: true }));
}

// ---------- data ----------
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const maiuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const isoDia = (d) => `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
const lerDia = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
export function abrirData(input) {
  const min = lerDia(input.min), max = lerDia(input.max);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const dentro = (d) => (!min || d >= min) && (!max || d <= max);
  let escolhido = lerDia(input.value);
  // Começa no dia escolhido; sem valor, em hoje (ou no limite mais perto, se hoje não pode).
  let base = escolhido || (dentro(hoje) ? hoje : min && hoje < min ? min : max || hoje);
  let ano = base.getFullYear(), mes = base.getMonth(), modo = "dias"; // dias | anos | meses
  const { cx, fechar } = painel(tituloDe(input, "Escolha a data"));
  const caixa = document.createElement("div"); caixa.className = "hfc-cal";
  const visor = document.createElement("div"); visor.className = "hfc-dia-visor"; visor.setAttribute("aria-live", "polite");
  const topo = document.createElement("div"); topo.className = "hfc-mes";
  const tit = document.createElement("button"); tit.type = "button"; tit.className = "hfc-mes-tit"; tit.setAttribute("aria-label", "Escolher mês e ano");
  const ant = document.createElement("button"); ant.type = "button"; ant.className = "hfc-nav"; ant.innerHTML = svg("esq"); ant.setAttribute("aria-label", "Mês anterior");
  const prox = document.createElement("button"); prox.type = "button"; prox.className = "hfc-nav"; prox.innerHTML = svg("dir"); prox.setAttribute("aria-label", "Próximo mês");
  topo.append(tit, ant, prox);
  const corpo = document.createElement("div");
  caixa.append(visor, topo, corpo);
  cx.appendChild(caixa);
  const pintarVisor = () => {
    visor.innerHTML = "";
    const sm = document.createElement("small"); sm.textContent = escolhido ? maiuscula(SEMANA[escolhido.getDay()]) + (SEMANA[escolhido.getDay()].endsWith("o") ? "" : "-feira") : "Nenhuma data escolhida";
    visor.append(sm, document.createTextNode(escolhido ? `${escolhido.getDate()} de ${MESES[escolhido.getMonth()]} de ${escolhido.getFullYear()}` : "Toque num dia"));
  };
  const mesPode = (a, m) => (!min || new Date(a, m + 1, 0) >= min) && (!max || new Date(a, m, 1) <= max);
  function pintar() {
    corpo.replaceChildren();
    tit.classList.toggle("aberto", modo !== "dias");
    tit.textContent = modo === "anos" ? "Escolha o ano" : modo === "meses" ? String(ano) : `${maiuscula(MESES[mes])} de ${ano}`;
    ant.hidden = prox.hidden = modo !== "dias";
    ant.disabled = !mesPode(mes ? ano : ano - 1, mes ? mes - 1 : 11);
    prox.disabled = !mesPode(mes === 11 ? ano + 1 : ano, mes === 11 ? 0 : mes + 1);
    if (modo === "anos") {
      const g = document.createElement("div"); g.className = "hfc-grade";
      const a0 = min ? min.getFullYear() : hoje.getFullYear() - 100, a1 = max ? max.getFullYear() : hoje.getFullYear() + 10;
      for (let a = a1; a >= a0; a--) {
        const b = document.createElement("button"); b.type = "button"; b.textContent = a; b.classList.toggle("on", a === ano);
        b.addEventListener("click", () => { ano = a; modo = "meses"; pintar(); });
        g.appendChild(b);
      }
      corpo.appendChild(g);
      requestAnimationFrame(() => g.querySelector(".on")?.scrollIntoView({ block: "center" }));
      return;
    }
    if (modo === "meses") {
      const g = document.createElement("div"); g.className = "hfc-grade";
      MESES.forEach((nome, m) => {
        const b = document.createElement("button"); b.type = "button"; b.textContent = nome.slice(0, 3); b.setAttribute("aria-label", nome);
        b.classList.toggle("on", m === mes); b.disabled = !mesPode(ano, m);
        b.addEventListener("click", () => { mes = m; modo = "dias"; pintar(); });
        g.appendChild(b);
      });
      corpo.appendChild(g);
      return;
    }
    const sem = document.createElement("div"); sem.className = "hfc-semana";
    ["D", "S", "T", "Q", "Q", "S", "S"].forEach((l, i) => { const s = document.createElement("span"); s.textContent = l; s.title = SEMANA[i]; sem.appendChild(s); });
    const dias = document.createElement("div"); dias.className = "hfc-dias"; dias.setAttribute("role", "grid");
    const pri = new Date(ano, mes, 1).getDay(), total = new Date(ano, mes + 1, 0).getDate();
    for (let i = 0; i < pri; i++) { const v = document.createElement("span"); v.className = "fora"; dias.appendChild(v); }
    for (let d = 1; d <= total; d++) {
      const dt = new Date(ano, mes, d);
      const b = document.createElement("button"); b.type = "button"; b.textContent = d;
      b.setAttribute("aria-label", `${SEMANA[dt.getDay()]}, ${d} de ${MESES[mes]}`);
      b.disabled = !dentro(dt);
      b.classList.toggle("hoje", +dt === +hoje);
      b.classList.toggle("on", !!escolhido && +dt === +escolhido);
      b.addEventListener("click", () => { escolhido = dt; pintarVisor(); pintar(); });
      dias.appendChild(b);
    }
    corpo.append(sem, dias);
  }
  const mudarMes = (n) => { const d = new Date(ano, mes + n, 1); ano = d.getFullYear(); mes = d.getMonth(); pintar(); };
  ant.addEventListener("click", () => mudarMes(-1));
  prox.addEventListener("click", () => mudarMes(1));
  tit.addEventListener("click", () => { modo = modo === "dias" ? "anos" : "dias"; pintar(); });
  // Arrastar para o lado troca o mês.
  let x0 = null;
  corpo.addEventListener("touchstart", (e) => { x0 = modo === "dias" ? e.touches[0].clientX : null; }, { passive: true });
  corpo.addEventListener("touchend", (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50) { const b = dx < 0 ? prox : ant; if (!b.disabled) mudarMes(dx < 0 ? 1 : -1); } }, { passive: true });
  // Atalhos (só os que cabem entre min e max). Datas longe de hoje (ex.: nascimento) não ganham atalhos.
  const at = document.createElement("div"); at.className = "hfc-atalhos";
  [["Hoje", 0], ["Amanhã", 1], ["Em 7 dias", 7], ["Em 15 dias", 15], ["Em 30 dias", 30]].forEach(([rot, n]) => {
    const d = new Date(hoje); d.setDate(d.getDate() + n);
    if (!dentro(d)) return;
    const b = document.createElement("button"); b.type = "button"; b.textContent = rot;
    b.addEventListener("click", () => { escolhido = d; ano = d.getFullYear(); mes = d.getMonth(); modo = "dias"; pintarVisor(); pintar(); });
    at.appendChild(b);
  });
  if (at.children.length > 1) caixa.appendChild(at);
  const rod = document.createElement("div"); rod.className = "hfc-rodape";
  const limpar = document.createElement("button"); limpar.type = "button"; limpar.className = "sec"; limpar.textContent = input.required || !input.value ? "Cancelar" : "Limpar";
  const pronto = document.createElement("button"); pronto.type = "button"; pronto.className = "pri"; pronto.textContent = "Pronto";
  limpar.addEventListener("click", () => { if (!input.required && input.value) { input.value = ""; disparar(input); } fechar(); });
  pronto.addEventListener("click", () => {
    if (!escolhido) { fechar(); return; }
    const v = isoDia(escolhido);
    if (input.value !== v) { input.value = v; disparar(input); }
    fechar();
  });
  rod.append(limpar, pronto); cx.appendChild(rod);
  pintarVisor(); pintar();
  requestAnimationFrame(() => (corpo.querySelector(".on") || corpo.querySelector(".hoje:not(:disabled)") || cx).focus({ preventScroll: true }));
}

// ---------- ligar no documento inteiro ----------
const alvo = (e) => {
  const c = e.target?.closest?.("select, input[type=time], input[type=date]");
  if (!c || c.disabled || c.readOnly || c.dataset.nativo != null || c.dataset.enfeitado || c.closest("[data-nativo]")) return null;
  if (c.tagName === "SELECT" && (c.multiple || c.size > 1)) return null;
  return c;
};
const abrir = (c) => {
  if (Date.now() - (c._hfcEm || 0) < 500) return;
  c._hfcEm = Date.now();
  if (c.tagName === "SELECT") abrirSelect(c); else if (c.type === "date") abrirData(c); else abrirHora(c);
};
let inicio = null;
export function ligarCampos() {
  if (window.__hfCampos) return;
  window.__hfCampos = true;
  // O toque não pode abrir a janela do celular: segura o pointerdown/mousedown e abre a do site.
  document.addEventListener("pointerdown", (e) => { const c = alvo(e); if (!c) return; if (e.pointerType === "mouse" && e.button !== 0) return; e.preventDefault(); }, true);
  document.addEventListener("mousedown", (e) => { if (alvo(e)) e.preventDefault(); }, true);
  document.addEventListener("touchstart", (e) => { inicio = alvo(e) ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null; }, { capture: true, passive: true });
  document.addEventListener("touchend", (e) => {
    const c = alvo(e); if (!c || !inicio) return;
    const t = e.changedTouches[0];
    if (Math.hypot(t.clientX - inicio.x, t.clientY - inicio.y) > 10) return; // estava rolando a página
    e.preventDefault(); abrir(c);
  }, { capture: true, passive: false });
  document.addEventListener("click", (e) => { const c = alvo(e); if (!c) return; e.preventDefault(); abrir(c); }, true);
  document.addEventListener("keydown", (e) => {
    const c = alvo(e); if (!c) return;
    if (e.key === "Enter" || e.key === " " || e.key === "F4" || (e.altKey && (e.key === "ArrowDown" || e.key === "ArrowUp"))) { e.preventDefault(); abrir(c); }
  }, true);
}
