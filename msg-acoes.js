// =====================================================
// Editar e apagar mensagens — janelas usadas em Mensagens e no chat da equipe
// - escolherApagar(): "Apagar para todos" / "Apagar para mim" / "Cancelar"
// - editarTextoHF(): caixa para corrigir o texto (ou a legenda) de uma mensagem
// - verEdicoesHF(): a mensagem original e cada versão editada, com a hora
// - janelaHF(): janela simples com conteúdo livre e botões (ex.: "Ver mensagem apagada")
// Apagar para todos: no lugar da mensagem fica "Fulano apagou esta mensagem · 14:32" e o
// conteúdo continua abrindo por 24 horas para quem participa (depois some de vez).
// =====================================================
export const PRAZO_APAGADA = 24 * 3600 * 1000;
// Editar e apagar para todos: só até 10 minutos depois de enviar (as regras do servidor conferem).
export const PRAZO_MEXER = 10 * 60 * 1000;

const msDe = (t) => (t?.toMillis ? t.toMillis() : t instanceof Date ? t.getTime() : typeof t === "number" ? t : t?.seconds ? t.seconds * 1000 : 0);
export function horaCurta(t) {
  const v = msDe(t); if (!v) return "agora";
  const d = new Date(v), hoje = new Date();
  const hh = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === hoje.toDateString()) return hh;
  if (d.toDateString() === new Date(Date.now() - 864e5).toDateString()) return `ontem, ${hh}`;
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}, ${hh}`;
}
// Ainda dá para abrir o conteúdo? (24 horas contadas de quando foi apagada)
export const podeMexer = (enviadaEm) => { const v = msDe(enviadaEm); return !!v && Date.now() - v < PRAZO_MEXER; };
export const noPrazo = (apagadaEm) => { const v = msDe(apagadaEm); return !v || Date.now() - v < PRAZO_APAGADA; };
export function tempoRestante(apagadaEm) {
  const falta = PRAZO_APAGADA - (Date.now() - (msDe(apagadaEm) || Date.now()));
  if (falta <= 0) return "";
  const h = Math.floor(falta / 3600e3), m = Math.max(1, Math.round((falta % 3600e3) / 60000));
  return h ? `${h} h` : `${m} min`;
}

let cssPronto = false;
function css() {
  if (cssPronto || document.getElementById("hfMsgAcoesCss")) { cssPronto = true; return; }
  cssPronto = true;
  const st = document.createElement("style"); st.id = "hfMsgAcoesCss";
  st.textContent = `
  .hf-ma-fundo { position: fixed; inset: 0; z-index: 9800; display: grid; place-items: center; padding: 16px; background: rgba(2,6,9,.62); -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px); animation: hfMaFundo .16s ease-out; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
  .hf-ma { width: min(420px, 100%); max-height: min(86vh, 720px); display: flex; flex-direction: column; background: var(--panel, #10181d); color: var(--text, #e9eef1); border: 1px solid var(--line, #22313a); border-radius: 20px; box-shadow: 0 24px 70px rgba(0,0,0,.45); animation: hfMaCaixa .2s cubic-bezier(.2,.8,.2,1); overflow: hidden; }
  :root[data-theme="light"] .hf-ma { background: var(--panel, #fff); color: var(--text, #0f1b22); border-color: var(--line, #e2e8ec); }
  .hf-ma-topo { display: flex; align-items: center; gap: 10px; padding: 18px 18px 6px; }
  .hf-ma-topo h3 { margin: 0; font-size: 17px; flex: 1; color: inherit; }
  .hf-ma-x { width: 36px; height: 36px; border-radius: 50%; border: 0; background: transparent; color: var(--muted, #8b9ba6); cursor: pointer; display: grid; place-items: center; }
  .hf-ma-x:hover { background: color-mix(in srgb, var(--muted, #8b9ba6) 16%, transparent); }
  .hf-ma-x svg, .hf-ma-op svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; flex: none; }
  .hf-ma-sub { margin: 0 18px 10px; color: var(--muted, #8b9ba6); font-size: 13.5px; line-height: 1.45; }
  .hf-ma-corpo { padding: 4px 18px 6px; overflow: auto; flex: 1; }
  .hf-ma-acoes { display: flex; gap: 10px; padding: 12px 18px 18px; justify-content: flex-end; flex-wrap: wrap; }
  .hf-ma-acoes button { min-height: 44px; padding: 0 18px; border-radius: 12px; font: inherit; font-size: 15px; font-weight: 750; cursor: pointer; border: 1px solid var(--line, #22313a); background: transparent; color: inherit; }
  .hf-ma-acoes .pri { border: 0; background: var(--accent, #00adee); color: #fff; }
  .hf-ma-acoes .perigo { border: 0; background: #e5484d; color: #fff; }
  .hf-ma-acoes button:disabled { opacity: .6; cursor: default; }
  .hf-ma button:focus-visible, .hf-ma textarea:focus-visible { outline: 2px solid var(--accent, #00adee); outline-offset: 2px; }
  .hf-ma-ops { display: grid; gap: 8px; padding: 6px 18px 18px; }
  .hf-ma-op { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 52px; padding: 10px 14px; border-radius: 14px; border: 1px solid var(--line, #22313a); background: transparent; color: inherit; font: inherit; font-size: 15px; font-weight: 700; text-align: left; cursor: pointer; }
  .hf-ma-op small { display: block; font-weight: 500; font-size: 12.5px; color: var(--muted, #8b9ba6); margin-top: 2px; }
  .hf-ma-op.perigo { color: #e5484d; border-color: color-mix(in srgb, #e5484d 40%, transparent); }
  .hf-ma-op.perigo small { color: color-mix(in srgb, #e5484d 75%, var(--muted, #8b9ba6)); }
  .hf-ma-op:hover { background: color-mix(in srgb, var(--muted, #8b9ba6) 10%, transparent); }
  .hf-ma-op.cancelar { justify-content: center; font-weight: 750; }
  .hf-ma textarea { width: 100%; box-sizing: border-box; min-height: 110px; max-height: 40vh; resize: vertical; padding: 12px 14px; border-radius: 14px; border: 1px solid var(--line, #22313a); background: var(--bg, #0b1115); color: inherit; font: inherit; font-size: 15px; line-height: 1.45; }
  :root[data-theme="light"] .hf-ma textarea { background: var(--bg, #f5f8fa); }
  .hf-ma-conta { display: block; text-align: right; font-size: 12px; color: var(--muted, #8b9ba6); margin-top: 4px; }
  .hf-ma-versao { padding: 10px 12px; border-radius: 14px; border: 1px solid var(--line, #22313a); margin-bottom: 8px; }
  .hf-ma-versao.atual { border-color: color-mix(in srgb, var(--accent, #00adee) 55%, transparent); background: color-mix(in srgb, var(--accent, #00adee) 8%, transparent); }
  .hf-ma-versao b { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; color: var(--muted, #8b9ba6); font-weight: 700; margin-bottom: 4px; text-transform: uppercase; letter-spacing: .03em; }
  .hf-ma-versao div { white-space: pre-wrap; word-break: break-word; font-size: 14.5px; line-height: 1.45; }
  .hf-ma-versao div.vazio { color: var(--muted, #8b9ba6); font-style: italic; }
  .hf-ma-midia { display: block; max-width: 100%; max-height: 50vh; border-radius: 12px; margin: 0 auto 8px; background: #000; }
  .hf-ma-aviso { display: flex; gap: 8px; align-items: flex-start; font-size: 12.5px; color: var(--muted, #8b9ba6); margin: 4px 0 2px; line-height: 1.4; }
  @keyframes hfMaFundo { from { opacity: 0; } }
  @keyframes hfMaCaixa { from { opacity: 0; transform: translateY(10px) scale(.97); } }
  @media (max-width: 520px) { .hf-ma-fundo { place-items: end center; padding: 0; } .hf-ma { width: 100%; border-radius: 20px 20px 0 0; max-height: 88vh; padding-bottom: env(safe-area-inset-bottom); } }
  @media (prefers-reduced-motion: reduce) { .hf-ma-fundo, .hf-ma { animation: none; } }`;
  document.head.appendChild(st);
}

const SVG = {
  fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
  todos: '<path d="M4 7h16M9 7V5h6v2M6.5 7l1 12.5h9l1-12.5"/><path d="M10 11v5M14 11v5"/>',
  mim: '<path d="M3 3l18 18"/><path d="M10.6 5.1A9.8 9.8 0 0112 5c5 0 8.5 4.5 9.5 7a13 13 0 01-2.6 3.7M6.6 6.6A12.8 12.8 0 002.5 12c1 2.5 4.5 7 9.5 7a9.6 9.6 0 004.4-1.1"/><path d="M9.9 9.9a3 3 0 004.2 4.2"/>'
};
const svg = (n) => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true"); s.innerHTML = SVG[n]; return s; };
const el = (tag, cls, texto) => { const e = document.createElement(tag); if (cls) e.className = cls; if (texto != null) e.textContent = texto; return e; };

// Base: fundo, caixa, título, Esc e clique fora fecham, foco preso dentro.
function abrirBase({ titulo, sub = "" }) {
  css();
  const anterior = document.activeElement;
  const fundo = el("div", "hf-ma-fundo"); fundo.setAttribute("role", "dialog"); fundo.setAttribute("aria-modal", "true");
  const cx = el("div", "hf-ma");
  const topo = el("div", "hf-ma-topo"); const h = el("h3", null, titulo); h.id = "hfMa" + Math.random().toString(36).slice(2, 8);
  fundo.setAttribute("aria-labelledby", h.id);
  const x = el("button", "hf-ma-x"); x.type = "button"; x.setAttribute("aria-label", "Fechar"); x.appendChild(svg("fechar"));
  topo.append(h, x); cx.appendChild(topo);
  if (sub) cx.appendChild(el("p", "hf-ma-sub", sub));
  fundo.appendChild(cx); document.body.appendChild(fundo);
  let aoFechar = () => {};
  const fechar = (v) => { fundo.remove(); document.removeEventListener("keydown", tecla, true); try { anterior?.focus?.({ preventScroll: true }); } catch {} aoFechar(v); };
  const tecla = (e) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); fechar(null); }
    if (e.key === "Tab") {
      const f = [...cx.querySelectorAll("button:not(:disabled), textarea, a[href], video, audio")];
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  };
  document.addEventListener("keydown", tecla, true);
  x.addEventListener("click", () => fechar(null));
  fundo.addEventListener("click", (e) => { if (e.target === fundo) fechar(null); });
  return { fundo, cx, fechar, aoFechar: (fn) => { aoFechar = fn; } };
}

// "Apagar mensagem?" — para todos (só quem enviou) e para mim (qualquer mensagem).
export function escolherApagar({ podeTodos = false, jaApagada = false, prazoPassou = false } = {}) {
  return new Promise((resolver) => {
    const sub = podeTodos ? "Para todos: no lugar fica o aviso de que você apagou. Os dois ainda podem abrir a mensagem por 24 horas; depois ela some de vez."
      : jaApagada ? "O aviso some só da sua tela."
      : prazoPassou ? "Já passaram 10 minutos do envio: agora só dá para apagar para você. A outra pessoa continua vendo."
      : "A mensagem some só da sua tela. A outra pessoa continua vendo.";
    const b = abrirBase({ titulo: "Apagar mensagem?", sub });
    b.aoFechar(resolver);
    const ops = el("div", "hf-ma-ops");
    const op = (cls, icone, titulo, sub, valor) => {
      const bt = el("button", "hf-ma-op " + cls); bt.type = "button";
      const tx = el("span"); tx.append(document.createTextNode(titulo)); if (sub) tx.appendChild(el("small", null, sub));
      if (icone) bt.appendChild(svg(icone)); bt.appendChild(tx);
      bt.addEventListener("click", () => b.fechar(valor)); ops.appendChild(bt); return bt;
    };
    if (podeTodos) op("perigo", "todos", "Apagar para todos", "Fica o aviso “você apagou esta mensagem”", "todos");
    op(podeTodos ? "" : "perigo", "mim", "Apagar para mim", "Só some da sua tela", "mim");
    const c = op("cancelar", null, "Cancelar", "", null);
    b.cx.appendChild(ops);
    setTimeout(() => c.focus(), 30);
  });
}

// Corrigir o texto (ou a legenda). Devolve o texto novo, ou null se cancelou / não mudou.
export function editarTextoHF({ titulo = "Editar mensagem", texto = "", max = 4000, permiteVazio = false, dica = "Quem conversa com você vê “editada” e pode abrir o texto original." } = {}) {
  return new Promise((resolver) => {
    const b = abrirBase({ titulo, sub: dica });
    b.aoFechar(resolver);
    const corpo = el("div", "hf-ma-corpo");
    const ta = document.createElement("textarea"); ta.maxLength = max; ta.value = texto; ta.setAttribute("aria-label", "Texto da mensagem");
    const conta = el("small", "hf-ma-conta");
    corpo.append(ta, conta);
    const acoes = el("div", "hf-ma-acoes");
    const nao = el("button", null, "Cancelar"); nao.type = "button";
    const sim = el("button", "pri", "Salvar"); sim.type = "button";
    acoes.append(nao, sim);
    b.cx.append(corpo, acoes);
    const atualizar = () => {
      const v = ta.value.trim();
      sim.disabled = v === texto.trim() || (!v && !permiteVazio);
      conta.textContent = ta.value.length > max * 0.8 ? `${max - ta.value.length} restantes` : "";
    };
    ta.addEventListener("input", atualizar);
    ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !sim.disabled) { e.preventDefault(); sim.click(); } });
    nao.addEventListener("click", () => b.fechar(null));
    sim.addEventListener("click", () => b.fechar(ta.value.trim()));
    atualizar();
    setTimeout(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }, 30);
  });
}

// Histórico: versões da mais nova (atual) até a original.
export function verEdicoesHF({ atual = "", editadaEm = null, edicoes = [] } = {}) {
  const b = abrirBase({ titulo: "Mensagem editada", sub: "A original e cada versão, com a hora em que foram escritas." });
  const corpo = el("div", "hf-ma-corpo");
  const versao = (texto, rotulo, quando, eAtual) => {
    const v = el("div", "hf-ma-versao" + (eAtual ? " atual" : ""));
    const t = el("b"); t.append(el("span", null, rotulo), el("span", null, quando));
    const tx = el("div", texto ? "" : "vazio", texto || "(sem texto)");
    v.append(t, tx); corpo.appendChild(v);
  };
  versao(atual, "Agora", horaCurta(editadaEm), true);
  const lista = Array.isArray(edicoes) ? edicoes : [];
  for (let i = lista.length - 1; i >= 0; i--) versao(String(lista[i]?.texto || ""), i === 0 ? "Original" : `Versão ${i + 1}`, horaCurta(lista[i]?.em), false);
  const acoes = el("div", "hf-ma-acoes"); const ok = el("button", "pri", "Fechar"); ok.type = "button"; acoes.appendChild(ok);
  ok.addEventListener("click", () => b.fechar(null));
  b.cx.append(corpo, acoes);
  setTimeout(() => ok.focus(), 30);
}

// Janela com conteúdo livre (ex.: a mensagem apagada) e botões [{ rotulo, classe, acao }].
// acao pode devolver uma Promise: o botão fica em "Aguarde..." e a janela fecha no fim.
export function janelaHF({ titulo, sub = "", conteudo = null, acoes = [] } = {}) {
  const b = abrirBase({ titulo, sub });
  const corpo = el("div", "hf-ma-corpo"); if (conteudo) corpo.appendChild(conteudo);
  const barra = el("div", "hf-ma-acoes");
  const lista = acoes.length ? acoes : [{ rotulo: "Fechar", classe: "pri" }];
  lista.forEach((a) => {
    const bt = el("button", a.classe || "", a.rotulo); bt.type = "button";
    bt.addEventListener("click", async () => {
      if (!a.acao) { b.fechar(null); return; }
      bt.disabled = true; const r0 = bt.textContent; bt.textContent = "Aguarde...";
      try { await a.acao(); b.fechar(null); } catch (e) { console.error(e); bt.disabled = false; bt.textContent = r0; }
    });
    barra.appendChild(bt);
  });
  b.cx.append(corpo, barra);
  setTimeout(() => barra.querySelector("button:last-child")?.focus(), 30);
  return b;
}
export { el as criarEl };
