// =====================================================
// Ligação minimizada (09/11/2026): pílula flutuante no alto da tela enquanto a pessoa usa o resto do site.
// Sem dependências: chamadas.js usa na própria página e, na rede numa página só (rede.html), a casca (rede-app.js)
// desenha a pílula na página de CIMA, por cima de todas as abas (a ligação continua no quadro em que começou).
// criarMini(doc, { nome, foto, video, mudo, aoAbrir, aoMic, aoEncerrar }) → { atualizar(texto), mic(mudo), video(stream), fechar() }
// Fica logo abaixo do topo das páginas (não tampa o "voltar") e dá para arrastar para cima ou para baixo; a altura
// escolhida fica guardada na aba (hf-lig-mini-y).
// =====================================================
const CSS = `
.hfm { position: fixed; z-index: 7000; top: calc(env(safe-area-inset-top, 0px) + 74px); left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 10px; max-width: min(420px, calc(100vw - 16px)); padding: 6px 6px 6px 6px;
  border-radius: 999px; background: linear-gradient(135deg, rgba(8, 22, 30, .96), rgba(4, 12, 18, .96)); color: #fff;
  border: 1px solid rgba(0, 173, 238, .45); box-shadow: 0 10px 30px rgba(0, 0, 0, .45), 0 0 0 4px rgba(0, 173, 238, .10);
  font: 600 13px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; cursor: pointer;
  animation: hfmEntra .25s ease; -webkit-tap-highlight-color: transparent; user-select: none; touch-action: none; }
@keyframes hfmEntra { from { opacity: 0; transform: translate(-50%, -12px); } }
@media (prefers-reduced-motion: reduce) { .hfm { animation: none; } .hfm-pulso { animation: none !important; } }
.hfm-av { position: relative; flex: none; width: 38px; height: 38px; border-radius: 50%; overflow: hidden; display: grid; place-items: center;
  background: linear-gradient(135deg, #0a4a63, #00adee); font-weight: 800; font-size: 13px; }
.hfm-av img, .hfm-av video { width: 100%; height: 100%; object-fit: cover; display: block; }
.hfm-av.video { border-radius: 12px; width: 34px; height: 46px; }
.hfm-pulso { position: absolute; inset: 0; border-radius: inherit; box-shadow: 0 0 0 2px #2fbf71; animation: hfmPulso 1.8s ease-out infinite; pointer-events: none; }
@keyframes hfmPulso { 0% { box-shadow: 0 0 0 0 rgba(47, 191, 113, .7); } 100% { box-shadow: 0 0 0 8px rgba(47, 191, 113, 0); } }
.hfm-tx { min-width: 0; flex: 1; display: grid; gap: 2px; padding-right: 2px; }
.hfm-tx b { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13.5px; }
.hfm-tx small { display: flex; align-items: center; gap: 5px; color: #7fe0ff; font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
.hfm-tx small::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: #2fbf71; box-shadow: 0 0 6px #2fbf71; }
.hfm-bt { flex: none; width: 40px; height: 40px; border-radius: 50%; border: 0; display: grid; place-items: center; cursor: pointer;
  background: rgba(255, 255, 255, .12); color: #fff; }
.hfm-bt.off { background: #fff; color: #05080b; }
.hfm-bt.fim { background: #e5484d; }
.hfm-bt svg { width: 19px; height: 19px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.hfm-bt.fim svg { transform: rotate(135deg); }`;
const ICONE = {
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21"/>',
  micOff: '<path d="M3 3l18 18M9 9v2a3 3 0 005 2.2M15 9.3V6a3 3 0 00-6-.3M5.5 11a6.5 6.5 0 0010.6 5M18.5 11a6.4 6.4 0 01-.6 2.7M12 17.5V21"/>',
  tel: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2"/>'
};
const svg = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONE[n]}</svg>`;
const iniciais = (n) => String(n || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0] || "").join("").toUpperCase();

export function criarMini(doc, { nome = "", foto = "", video = null, mudo = false, aoAbrir, aoMic, aoEncerrar } = {}) {
  if (!doc.getElementById("hfm-css")) { const s = doc.createElement("style"); s.id = "hfm-css"; s.textContent = CSS; doc.head.appendChild(s); }
  doc.querySelectorAll(".hfm").forEach((x) => x.remove());
  const el = (tag, cls) => { const e = doc.createElement(tag); if (cls) e.className = cls; return e; };
  const p = el("div", "hfm"); p.setAttribute("role", "button"); p.tabIndex = 0;
  p.setAttribute("aria-label", `Ligação com ${nome} em andamento. Toque para voltar à ligação`);
  const av = el("span", "hfm-av");
  const pintarFoto = () => {
    av.replaceChildren(); av.classList.remove("video");
    if (foto) { const i = el("img"); i.src = foto; i.alt = ""; av.appendChild(i); } else av.textContent = iniciais(nome);
    av.appendChild(el("span", "hfm-pulso"));
  };
  pintarFoto();
  const tx = el("span", "hfm-tx"); const b = el("b"); b.textContent = nome; const sm = el("small"); sm.textContent = "Em ligação"; tx.append(b, sm);
  const bMic = el("button", "hfm-bt"); bMic.type = "button";
  const pintarMic = (m) => { bMic.classList.toggle("off", !!m); bMic.innerHTML = svg(m ? "micOff" : "mic"); bMic.setAttribute("aria-label", m ? "Ligar o microfone" : "Silenciar"); };
  pintarMic(mudo);
  const bFim = el("button", "hfm-bt fim"); bFim.type = "button"; bFim.innerHTML = svg("tel"); bFim.setAttribute("aria-label", "Encerrar a ligação");
  [bMic, bFim].forEach((x) => x.addEventListener("pointerdown", (e) => e.stopPropagation()));
  bMic.addEventListener("click", (e) => { e.stopPropagation(); aoMic?.(); });
  bFim.addEventListener("click", (e) => { e.stopPropagation(); aoEncerrar?.(); });
  // Arrastar (na vertical) muda a altura; arrastou = não abre a ligação.
  const CH = "hf-lig-mini-y";
  const limitar = (y) => Math.max(6, Math.min((doc.defaultView?.innerHeight || 600) - 70, y));
  try { const y = Number(sessionStorage.getItem(CH)); if (y > 0) p.style.top = limitar(y) + "px"; } catch {}
  let arr = null, arrastou = false;
  p.addEventListener("pointerdown", (e) => { arr = { y0: e.clientY, t0: p.getBoundingClientRect().top, id: e.pointerId }; arrastou = false; });
  p.addEventListener("pointermove", (e) => {
    if (!arr || e.pointerId !== arr.id) return;
    const dy = e.clientY - arr.y0;
    if (!arrastou && Math.abs(dy) < 6) return;
    if (!arrastou) { arrastou = true; try { p.setPointerCapture(e.pointerId); } catch {} }
    p.style.top = limitar(arr.t0 + dy) + "px";
  });
  const soltar = () => { if (arr && arrastou) { try { sessionStorage.setItem(CH, String(parseFloat(p.style.top) || 74)); } catch {} } arr = null; };
  p.addEventListener("pointerup", soltar); p.addEventListener("pointercancel", soltar);
  p.addEventListener("click", () => { if (arrastou) { arrastou = false; return; } aoAbrir?.(); });
  p.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); aoAbrir?.(); } });
  p.append(av, tx, bMic, bFim);
  doc.body.appendChild(p);
  const api = {
    atualizar(texto) { if (texto) sm.textContent = texto; },
    mic(m) { pintarMic(m); },
    video(stream) {
      if (!stream) { pintarFoto(); return; }
      try { const v = el("video"); v.muted = true; v.playsInline = true; v.autoplay = true; v.srcObject = stream; av.replaceChildren(v); av.classList.add("video"); v.play?.().catch(() => {}); }
      catch { pintarFoto(); }
    },
    fechar() { p.remove(); }
  };
  if (video) api.video(video);
  return api;
}
