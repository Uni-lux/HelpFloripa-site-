// =====================================================
// Ligação minimizada (09/11/2026): flutua por cima do site enquanto a pessoa usa o resto das páginas.
// Sem dependências: chamadas.js usa na própria página e, na rede numa página só (rede.html), a casca (rede-app.js)
// desenha na página de CIMA, por cima de todas as abas (a ligação continua no quadro em que começou).
// criarMini(doc, { nome, foto, video, mudo, aoAbrir, aoMic, aoEncerrar }) → { atualizar(texto), mic(mudo), video(stream), fechar() }
// Dois tamanhos: PÍLULA (foto, nome, tempo, microfone, encerrar e recolher) e BOLHA (só a foto com o tempo, no canto,
// como os apps de mensagem). Tocar na pílula ou na bolha volta para a ligação. Os dois arrastam; a bolha gruda no canto
// mais perto. Tamanho e lugar ficam guardados na aba (hf-lig-mini).
// =====================================================
const CSS = `
.hfm { position: fixed; z-index: 7000; top: calc(env(safe-area-inset-top, 0px) + 74px); left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 8px; width: max-content; max-width: min(360px, calc(100vw - 20px)); padding: 5px;
  border-radius: 999px; background: rgba(12, 20, 26, .94); color: #fff; backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, .10); box-shadow: 0 10px 28px rgba(0, 0, 0, .45);
  font: 600 13px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; cursor: pointer;
  animation: hfmEntra .22s ease; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; touch-action: none; }
@keyframes hfmEntra { from { opacity: 0; transform: translate(-50%, -10px) scale(.96); } }
.hfm.bolha { left: auto; right: 10px; transform: none; width: 64px; max-width: none; padding: 0; gap: 0; flex-direction: column; border-radius: 22px;
  background: rgba(12, 20, 26, .94); padding: 6px 0 5px; animation: hfmBolha .22s ease; }
.hfm.bolha.esq { right: auto; left: 10px; }
@keyframes hfmBolha { from { opacity: 0; transform: scale(.7); } }
.hfm.solto { transition: none !important; }
.hfm.gruda { transition: left .2s ease, right .2s ease; }
@media (prefers-reduced-motion: reduce) { .hfm, .hfm.bolha { animation: none; } .hfm-anel { animation: none !important; } }
.hfm-av { position: relative; flex: none; width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center;
  background: linear-gradient(135deg, #0a4a63, #00adee); font-weight: 800; font-size: 12px; }
.hfm-av > img, .hfm-av > video { width: 100%; height: 100%; object-fit: cover; display: block; border-radius: inherit; }
.hfm.bolha .hfm-av { width: 46px; height: 46px; font-size: 15px; }
.hfm-av.video { border-radius: 10px; width: 30px; height: 40px; }
.hfm.bolha .hfm-av.video { width: 46px; height: 60px; border-radius: 14px; }
.hfm-anel { position: absolute; inset: -3px; border-radius: inherit; border: 2px solid #2fbf71; animation: hfmAnel 2s ease-out infinite; pointer-events: none; }
@keyframes hfmAnel { 0% { opacity: .9; transform: scale(1); } 100% { opacity: 0; transform: scale(1.25); } }
.hfm.mudo .hfm-anel { border-color: #ffb020; animation: none; opacity: .9; }
.hfm-tx { min-width: 0; display: grid; gap: 1px; padding: 0 2px; }
.hfm-tx b { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13px; max-width: 132px; }
.hfm-tx small { display: flex; align-items: center; gap: 5px; color: #8af0b5; font-size: 11.5px; font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
.hfm-tx small::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: #2fbf71; }
.hfm.mudo .hfm-tx small { color: #ffcf70; } .hfm.mudo .hfm-tx small::before { background: #ffb020; }
.hfm.bolha .hfm-tx { padding: 4px 0 0; justify-items: center; }
.hfm.bolha .hfm-tx b { display: none; }
.hfm.bolha .hfm-tx small { font-size: 11px; color: #fff; } .hfm.bolha .hfm-tx small::before { display: none; }
.hfm-bt { flex: none; width: 36px; height: 36px; border-radius: 50%; border: 0; display: grid; place-items: center; cursor: pointer;
  background: rgba(255, 255, 255, .10); color: #fff; padding: 0; transition: transform .1s; }
.hfm-bt:active { transform: scale(.9); }
.hfm-bt.off { background: #fff; color: #05080b; }
.hfm-bt.fim { background: #e5484d; }
.hfm-bt.rec { background: none; width: 30px; color: rgba(255, 255, 255, .7); }
.hfm-bt svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.hfm-bt.fim svg { transform: rotate(135deg); }
.hfm.bolha .hfm-bt { display: none; }`;
const ICONE = {
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21"/>',
  micOff: '<path d="M3 3l18 18M9 9v2a3 3 0 005 2.2M15 9.3V6a3 3 0 00-6-.3M5.5 11a6.5 6.5 0 0010.6 5M18.5 11a6.4 6.4 0 01-.6 2.7M12 17.5V21"/>',
  tel: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2"/>',
  recolher: '<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>'
};
const svg = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONE[n]}</svg>`;
const iniciais = (n) => String(n || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0] || "").join("").toUpperCase();
const CH = "hf-lig-mini";
const lerPos = () => { try { return JSON.parse(sessionStorage.getItem(CH)) || {}; } catch { return {}; } };
const gravarPos = (o) => { try { sessionStorage.setItem(CH, JSON.stringify({ ...lerPos(), ...o })); } catch {} };

export function criarMini(doc, { nome = "", foto = "", video = null, mudo = false, aoAbrir, aoMic, aoEncerrar } = {}) {
  if (!doc.getElementById("hfm-css")) { const s = doc.createElement("style"); s.id = "hfm-css"; s.textContent = CSS; doc.head.appendChild(s); }
  doc.querySelectorAll(".hfm").forEach((x) => x.remove());
  const win = doc.defaultView || window;
  const el = (tag, cls) => { const e = doc.createElement(tag); if (cls) e.className = cls; return e; };
  const p = el("div", "hfm"); p.setAttribute("role", "button"); p.tabIndex = 0;
  p.setAttribute("aria-label", `Ligação com ${nome} em andamento. Toque para voltar à ligação`);
  const av = el("span", "hfm-av");
  const pintarFoto = () => {
    av.replaceChildren(); av.classList.remove("video");
    if (foto) { const i = el("img"); i.src = foto; i.alt = ""; i.dataset.semSuave = "1"; av.appendChild(i); } else av.textContent = iniciais(nome);
    av.appendChild(el("span", "hfm-anel"));
  };
  pintarFoto();
  const tx = el("span", "hfm-tx"); const b = el("b"); b.textContent = nome; const sm = el("small"); sm.textContent = "Em ligação"; tx.append(b, sm);
  const bMic = el("button", "hfm-bt"); bMic.type = "button";
  const pintarMic = (m) => { p.classList.toggle("mudo", !!m); bMic.classList.toggle("off", !!m); bMic.innerHTML = svg(m ? "micOff" : "mic"); bMic.setAttribute("aria-label", m ? "Ligar o microfone" : "Silenciar"); };
  pintarMic(mudo);
  const bFim = el("button", "hfm-bt fim"); bFim.type = "button"; bFim.innerHTML = svg("tel"); bFim.setAttribute("aria-label", "Encerrar a ligação");
  const bRec = el("button", "hfm-bt rec"); bRec.type = "button"; bRec.innerHTML = svg("recolher"); bRec.setAttribute("aria-label", "Recolher no canto"); bRec.title = "Recolher";
  [bMic, bFim, bRec].forEach((x) => x.addEventListener("pointerdown", (e) => e.stopPropagation()));
  bMic.addEventListener("click", (e) => { e.stopPropagation(); aoMic?.(); });
  bFim.addEventListener("click", (e) => { e.stopPropagation(); aoEncerrar?.(); });

  const limitarY = (y) => Math.max(6, Math.min((win.innerHeight || 600) - (p.offsetHeight || 60) - 6, y));
  // Bolha no canto (esquerdo ou direito); pílula no meio.
  const modo = (bolha) => {
    p.classList.toggle("bolha", bolha);
    p.style.left = p.style.right = "";
    const pos = lerPos();
    p.classList.toggle("esq", bolha && pos.lado === "esq");
    const y = Number(bolha ? pos.yb : pos.y);
    p.style.top = y > 0 ? limitarY(y) + "px" : "";
    p.setAttribute("aria-label", bolha ? `Ligação com ${nome}: ${sm.textContent}. Toque para voltar à ligação` : `Ligação com ${nome} em andamento. Toque para voltar à ligação`);
    gravarPos({ bolha });
  };
  bRec.addEventListener("click", (e) => { e.stopPropagation(); modo(true); });

  // Arrastar: a pílula só sobe/desce; a bolha anda livre e gruda no canto mais perto ao soltar.
  let arr = null, arrastou = false;
  p.addEventListener("pointerdown", (e) => { const r = p.getBoundingClientRect(); arr = { x0: e.clientX, y0: e.clientY, t0: r.top, l0: r.left, id: e.pointerId }; arrastou = false; });
  p.addEventListener("pointermove", (e) => {
    if (!arr || e.pointerId !== arr.id) return;
    const dx = e.clientX - arr.x0, dy = e.clientY - arr.y0;
    if (!arrastou && Math.hypot(dx, dy) < 6) return;
    if (!arrastou) { arrastou = true; p.classList.add("solto"); p.classList.remove("gruda"); try { p.setPointerCapture(e.pointerId); } catch {} }
    p.style.top = limitarY(arr.t0 + dy) + "px";
    if (p.classList.contains("bolha")) { p.style.right = "auto"; p.style.left = Math.max(4, Math.min(win.innerWidth - p.offsetWidth - 4, arr.l0 + dx)) + "px"; }
  });
  const soltar = () => {
    if (arr && arrastou) {
      p.classList.remove("solto");
      const top = parseFloat(p.style.top) || 74;
      if (p.classList.contains("bolha")) {
        const r = p.getBoundingClientRect(); const esq = r.left + r.width / 2 < win.innerWidth / 2;
        p.classList.add("gruda");
        p.style.left = esq ? "10px" : (win.innerWidth - r.width - 10) + "px";
        setTimeout(() => { p.style.left = p.style.right = ""; p.classList.toggle("esq", esq); p.classList.remove("gruda"); }, 220);
        gravarPos({ yb: top, lado: esq ? "esq" : "dir" });
      } else gravarPos({ y: top });
    }
    arr = null;
  };
  p.addEventListener("pointerup", soltar); p.addEventListener("pointercancel", soltar);
  p.addEventListener("click", () => { if (arrastou) { arrastou = false; return; } aoAbrir?.(); });
  p.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); aoAbrir?.(); } });
  p.append(av, tx, bMic, bFim, bRec);
  doc.body.appendChild(p);
  modo(!!lerPos().bolha);
  const api = {
    atualizar(texto) { if (texto) sm.textContent = texto; },
    mic(m) { pintarMic(m); },
    video(stream) {
      if (!stream) { pintarFoto(); return; }
      try { const v = el("video"); v.muted = true; v.playsInline = true; v.autoplay = true; v.srcObject = stream; av.replaceChildren(v, el("span", "hfm-anel")); av.classList.add("video"); v.play?.().catch(() => {}); }
      catch { pintarFoto(); }
    },
    fechar() { p.remove(); }
  };
  if (video) api.video(video);
  return api;
}
