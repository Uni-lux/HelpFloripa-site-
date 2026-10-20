// =====================================================
// Visual dos comunicados e dos avisos da equipe
// - cartaoComunicado(c): o comunicado da equipe (faixa do início e prévia no painel):
//   ícone do tipo, "Help Floripa · Novidade · data", título, texto com "ver mais",
//   botão "Saiba mais" quando tem link e X para fechar.
// - janelaAvisos(lista): os avisos de alerta e graves que abrem ao entrar no site (firebase.js),
//   com o selo do Suporte, o tipo, a data, "1 de 3" e os botões Responder ao suporte / Entendi.
// Sem dependência do rede.js (a página inicial e o firebase.js usam sem carregar o resto).
// =====================================================
const ICONES = {
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.1"/>',
  novidade: '<path d="M12 3.5l1.9 4.6 4.6 1.9-4.6 1.9L12 16.5l-1.9-4.6L5.5 10l4.6-1.9z"/><path d="M18.5 15.5l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8z"/>',
  alerta: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.2v.1"/>',
  grave: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5.5M12 16.2v.1"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  seta: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  selo: '<path d="M12 2.8l2.3 1.7 2.9.1.9 2.8 2.3 1.8-.9 2.8.9 2.8-2.3 1.8-.9 2.8-2.9.1L12 21.2l-2.3-1.7-2.9-.1-.9-2.8-2.3-1.8.9-2.8-.9-2.8 2.3-1.8.9-2.8 2.9-.1z" fill="#1d9bf0" stroke="none"/><path d="M8.4 12.2l2.4 2.4 4.8-5" stroke="#fff"/>'
};
const svg = (n, cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONES[n] || ""}</svg>`;
export const TIPOS_COMUNICADO = { info: ["Informativo", "#00adee"], novidade: ["Novidade", "#2fbf71"], alerta: ["Alerta", "#ec835a"] };
const TIPOS_AVISO = { info: ["Aviso da equipe", "#00adee"], alerta: ["Alerta", "#ec835a"], grave: ["Aviso importante", "#e5484d"] };
const ms = (t) => t?.toMillis?.() ?? (t instanceof Date ? t.getTime() : 0);
const dataCurta = (t) => (ms(t) ? new Date(ms(t)).toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "") : "");
const linkOk = (l) => typeof l === "string" && /^[\w./?=&#-]+$/.test(l) && !l.startsWith("//");

const CSS = `
.hfcom { --c: #00adee; position: relative; display: flex; gap: 12px; align-items: flex-start; margin: 0 0 14px; padding: 14px 14px 14px 12px; border-radius: 18px; overflow: hidden;
  background: radial-gradient(120% 140% at 0% 0%, color-mix(in srgb, var(--c) 20%, transparent), transparent 60%), var(--panel, #0f161b);
  border: 1px solid color-mix(in srgb, var(--c) 35%, var(--line, #213038)); color: var(--text, #eaf0f3); box-shadow: 0 10px 30px rgba(0,0,0,.14);
  animation: hfcomEntra .35s cubic-bezier(.2,.8,.2,1); font-family: inherit; }
:root[data-theme="light"] .hfcom { background: radial-gradient(120% 140% at 0% 0%, color-mix(in srgb, var(--c) 14%, transparent), transparent 60%), var(--panel, #fff); color: var(--text, #0f1b22); }
.hfcom::before { content: ""; position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px; border-radius: 0 3px 3px 0; background: var(--c); }
.hfcom.saindo { animation: hfcomSai .25s ease-in forwards; }
@keyframes hfcomEntra { from { opacity: 0; transform: translateY(-8px); } }
@keyframes hfcomSai { to { opacity: 0; transform: translateY(-8px); height: 0; margin: 0; padding: 0; } }
.hfcom-ic { flex: none; width: 42px; height: 42px; margin-left: 4px; border-radius: 14px; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, color-mix(in srgb, var(--c) 75%, #fff 25%), var(--c)); box-shadow: 0 6px 16px color-mix(in srgb, var(--c) 40%, transparent); }
.hfcom-ic svg { width: 21px; height: 21px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.hfcom-tx { flex: 1; min-width: 0; display: grid; gap: 3px; }
.hfcom-kick { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 11.5px; font-weight: 750; color: var(--muted, #8c9ca7); }
.hfcom-kick img { width: 16px; height: 16px; border-radius: 50%; background: #fff; object-fit: cover; }
.hfcom-tag { padding: 1px 8px; border-radius: 999px; background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--c); font-weight: 800; letter-spacing: .02em; }
.hfcom strong { font-size: 15.5px; line-height: 1.3; }
.hfcom p { margin: 0; font-size: 13.5px; line-height: 1.5; color: color-mix(in srgb, var(--text, #eaf0f3) 82%, transparent); white-space: pre-line; overflow-wrap: anywhere; }
.hfcom p.curto { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.hfcom-mais { justify-self: start; border: 0; background: none; padding: 0; color: var(--c); font: inherit; font-size: 12.5px; font-weight: 800; cursor: pointer; }
.hfcom-cta { justify-self: start; display: inline-flex; align-items: center; gap: 6px; margin-top: 6px; padding: 7px 14px; border-radius: 999px; background: var(--c); color: #fff; font-size: 13px; font-weight: 800; text-decoration: none; }
.hfcom-cta svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.hfcom-x { flex: none; width: 32px; height: 32px; margin: -4px -4px 0 0; display: grid; place-items: center; border: 0; border-radius: 50%; background: none; color: var(--muted, #8c9ca7); cursor: pointer; }
.hfcom-x:hover { background: color-mix(in srgb, var(--muted, #8c9ca7) 15%, transparent); color: inherit; }
.hfcom-x svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; }
/* janela de aviso */
.hfav-fundo { position: fixed; inset: 0; z-index: 9800; display: grid; place-items: center; padding: 18px; background: rgba(2,6,9,.7); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); animation: hfavF .2s ease-out; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
@keyframes hfavF { from { opacity: 0; } }
.hfav { --c: #ec835a; width: min(440px, 100%); max-height: calc(100vh - 36px); overflow: auto; border-radius: 24px; background: var(--panel, #0f161b); color: var(--text, #eaf0f3); border: 1px solid var(--line, #213038); box-shadow: 0 30px 80px rgba(0,0,0,.55); animation: hfavC .25s cubic-bezier(.2,.8,.2,1); }
:root[data-theme="light"] .hfav { background: var(--panel, #fff); color: var(--text, #0f1b22); border-color: var(--line, #e2e8ec); }
@keyframes hfavC { from { opacity: 0; transform: translateY(14px) scale(.97); } }
.hfav-topo { position: relative; padding: 22px 20px 16px; background: radial-gradient(130% 120% at 50% 0%, color-mix(in srgb, var(--c) 30%, transparent), transparent 70%); text-align: center; }
.hfav-ic { width: 60px; height: 60px; margin: 0 auto 12px; border-radius: 50%; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, color-mix(in srgb, var(--c) 70%, #fff 30%), var(--c)); box-shadow: 0 10px 26px color-mix(in srgb, var(--c) 45%, transparent); }
.hfav-ic svg { width: 28px; height: 28px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.hfav-tag { display: inline-block; padding: 3px 10px; border-radius: 999px; background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--c); font-size: 11.5px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
.hfav h3 { margin: 10px 0 0; font-size: 19px; line-height: 1.3; }
.hfav-de { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 8px; font-size: 12.5px; color: var(--muted, #8c9ca7); }
.hfav-de img { width: 20px; height: 20px; border-radius: 50%; background: #fff; object-fit: cover; }
.hfav-de b { display: inline-flex; align-items: center; gap: 3px; color: var(--text, #eaf0f3); }
:root[data-theme="light"] .hfav-de b { color: var(--text, #0f1b22); }
.hfav-de svg { width: 15px; height: 15px; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.hfav-corpo { padding: 4px 22px 4px; }
.hfav-corpo p { margin: 0; white-space: pre-wrap; line-height: 1.6; font-size: 15px; color: color-mix(in srgb, var(--text, #eaf0f3) 88%, transparent); overflow-wrap: anywhere; }
.hfav-pontos { display: flex; justify-content: center; gap: 5px; padding: 14px 0 0; }
.hfav-pontos i { width: 7px; height: 7px; border-radius: 50%; background: color-mix(in srgb, var(--muted, #8c9ca7) 40%, transparent); }
.hfav-pontos i.on { width: 20px; border-radius: 4px; background: var(--c); }
.hfav-acoes { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 16px 20px 20px; }
.hfav-acoes a, .hfav-acoes button { min-height: 48px; display: grid; place-items: center; border-radius: 14px; font: inherit; font-size: 15px; font-weight: 800; text-decoration: none; cursor: pointer; }
.hfav-acoes a { border: 1px solid var(--line, #213038); color: inherit; }
.hfav-acoes button { border: 0; background: var(--accent, #00adee); color: var(--accent-ink, #001a24); }
.hfav-acoes button:focus-visible, .hfav-acoes a:focus-visible { outline: 2px solid var(--accent, #00adee); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .hfcom, .hfav, .hfav-fundo { animation: none !important; } }
`;
let cssPronto = false;
function css() {
  if (cssPronto || document.getElementById("hfComCss")) { cssPronto = true; return; }
  cssPronto = true;
  const s = document.createElement("style"); s.id = "hfComCss"; s.textContent = CSS;
  document.head.appendChild(s);
}
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

// Comunicado da equipe (faixa). aoFechar: some com animação e avisa quem chamou.
export function cartaoComunicado(c, { aoFechar = null } = {}) {
  css();
  const [nomeTipo, cor] = TIPOS_COMUNICADO[c.tipo] || TIPOS_COMUNICADO.info;
  const f = el("div", "hfcom"); f.setAttribute("role", "status"); f.style.setProperty("--c", cor);
  const ic = el("span", "hfcom-ic"); ic.innerHTML = svg(c.tipo === "alerta" ? "alerta" : c.tipo === "novidade" ? "novidade" : "info");
  const tx = el("div", "hfcom-tx");
  const kick = el("div", "hfcom-kick");
  const logo = document.createElement("img"); logo.src = "logo.png"; logo.alt = "";
  kick.append(logo, document.createTextNode("Help Floripa"), el("span", "hfcom-tag", nomeTipo));
  if (dataCurta(c.em)) kick.append(document.createTextNode("· " + dataCurta(c.em)));
  tx.append(kick, el("strong", null, c.titulo || "Comunicado"));
  if (c.texto) {
    const p = el("p", null, c.texto); tx.appendChild(p);
    if (String(c.texto).length > 170) {
      p.classList.add("curto");
      const m = el("button", "hfcom-mais", "ver mais"); m.type = "button";
      m.addEventListener("click", () => { p.classList.toggle("curto"); m.textContent = p.classList.contains("curto") ? "ver mais" : "ver menos"; });
      tx.appendChild(m);
    }
  }
  if (linkOk(c.link)) { const a = el("a", "hfcom-cta"); a.href = c.link; a.append("Saiba mais"); a.insertAdjacentHTML("beforeend", svg("seta")); tx.appendChild(a); }
  f.append(ic, tx);
  if (aoFechar) {
    const x = el("button", "hfcom-x"); x.type = "button"; x.setAttribute("aria-label", "Fechar comunicado"); x.innerHTML = svg("x");
    x.addEventListener("click", () => { f.classList.add("saindo"); setTimeout(() => f.remove(), 250); aoFechar(); });
    f.appendChild(x);
  }
  return f;
}

// Avisos que abrem ao entrar no site (alerta e grave), um depois do outro.
// lista: [{ id, titulo, texto, tipo, em }]; aoLer(aviso) marca como lido.
export function janelaAvisos(lista, { aoLer = () => {} } = {}) {
  css();
  let i = 0;
  const mostrar = () => {
    const a = lista[i]; if (!a) return;
    const [nomeTipo, cor] = TIPOS_AVISO[a.tipo] || TIPOS_AVISO.info;
    const fundo = el("div", "hfav-fundo"); fundo.dataset.semVoltar = ""; // precisa do "Entendi": o voltar não fecha
    fundo.setAttribute("role", "alertdialog"); fundo.setAttribute("aria-modal", "true");
    const cx = el("div", "hfav"); cx.style.setProperty("--c", cor);
    const topo = el("div", "hfav-topo");
    const ic = el("div", "hfav-ic"); ic.innerHTML = svg(a.tipo === "grave" ? "grave" : a.tipo === "alerta" ? "alerta" : "info");
    const h = el("h3", null, a.titulo || "Aviso"); h.id = "hfavT" + i; fundo.setAttribute("aria-labelledby", h.id);
    const de = el("div", "hfav-de");
    const logo = document.createElement("img"); logo.src = "logo.png"; logo.alt = "";
    const nome = el("b", null, "Suporte Help Floripa"); nome.insertAdjacentHTML("beforeend", svg("selo"));
    de.append(logo, nome); if (dataCurta(a.em)) de.append(document.createTextNode("· " + dataCurta(a.em)));
    topo.append(ic, el("span", "hfav-tag", nomeTipo), h, de);
    const corpo = el("div", "hfav-corpo"); corpo.appendChild(el("p", null, a.texto || ""));
    if (lista.length > 1) { const pts = el("div", "hfav-pontos"); pts.setAttribute("aria-label", `Aviso ${i + 1} de ${lista.length}`); lista.forEach((_, k) => pts.appendChild(el("i", k === i ? "on" : ""))); corpo.appendChild(pts); }
    const ac = el("div", "hfav-acoes");
    const sup = el("a", null, "Responder"); sup.href = "suporte.html?aviso=" + encodeURIComponent(a.id);
    const ok = el("button", null, lista.length - i > 1 ? `Entendi (${i + 1} de ${lista.length})` : "Entendi"); ok.type = "button";
    sup.addEventListener("click", () => aoLer(a));
    ok.addEventListener("click", () => { fundo.remove(); aoLer(a); i++; mostrar(); });
    ac.append(sup, ok);
    cx.append(topo, corpo, ac); fundo.appendChild(cx); document.body.appendChild(fundo);
    setTimeout(() => ok.focus(), 40);
  };
  mostrar();
}
