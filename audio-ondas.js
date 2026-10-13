// =====================================================
// Player de áudio com ondas de voz (chat dos usuários e chat da equipe)
// - barras que se pintam enquanto toca; tocar ou arrastar na onda pula para o ponto
// - velocidade 1x / 1,5x / 2x (lembrada no aparelho)
// - só um áudio toca por vez
// - as ondas saem do próprio áudio (sem campo novo no Firestore): enquanto o áudio
//   não foi baixado aparecem barras neutras; depois de tocar uma vez, a onda real fica
//   guardada no aparelho e aparece direto nas próximas vezes.
//
// criarPlayerAudio({ chave, fonte, duracao, carregarJa })
//   chave: id estável (da mensagem/anexo) para guardar a onda
//   fonte: URL do áudio ou função async que devolve a URL (data: ou https:)
//   duracao: segundos, se já souber (mostra antes de tocar)
//   carregarJa: true para já calcular a onda (ex.: áudio que veio dentro da mensagem)
// =====================================================
const BARRAS = 34;
const VELOCIDADES = [1, 1.5, 2];
const CHAVE_ONDAS = "hf-ondas";
const CHAVE_VEL = "hf-audio-vel";

let tocando = null; // { audio, parar }
let ctxAudio = null;
const ondasMem = new Map();

function lerOndasGuardadas() {
  try { return JSON.parse(localStorage.getItem(CHAVE_ONDAS) || "{}") || {}; } catch { return {}; }
}
function ondaGuardada(chave) {
  if (!chave) return null;
  if (ondasMem.has(chave)) return ondasMem.get(chave);
  const o = lerOndasGuardadas()[chave];
  if (o && typeof o.p === "string") { const v = { picos: [...o.p].map((c) => (c.charCodeAt(0) - 48) / 40), dur: o.d || 0 }; ondasMem.set(chave, v); return v; }
  return null;
}
function guardarOnda(chave, picos, dur) {
  if (!chave) return;
  ondasMem.set(chave, { picos, dur });
  try {
    const todas = lerOndasGuardadas();
    // 0..1 vira um caractere ("0".."X"): ~40 bytes por áudio. Guarda as 300 mais recentes.
    todas[chave] = { p: picos.map((v) => String.fromCharCode(48 + Math.round(Math.max(0, Math.min(1, v)) * 40))).join(""), d: Math.round(dur * 10) / 10 };
    const chaves = Object.keys(todas);
    if (chaves.length > 300) chaves.slice(0, chaves.length - 300).forEach((k) => delete todas[k]);
    localStorage.setItem(CHAVE_ONDAS, JSON.stringify(todas));
  } catch {}
}

// Barras neutras (parecidas com fala) enquanto a onda real não existe. Sempre iguais para a mesma chave.
function ondaProvisoria(chave) {
  let s = 2166136261;
  for (const c of String(chave || "audio")) s = Math.imul(s ^ c.charCodeAt(0), 16777619);
  const r = () => { s = Math.imul(s ^ (s >>> 15), 2246822507); s = Math.imul(s ^ (s >>> 13), 3266489909); return ((s ^= s >>> 16) >>> 0) / 4294967296; };
  return Array.from({ length: BARRAS }, (_, i) => 0.28 + 0.5 * Math.abs(Math.sin(i * 0.55 + r() * 2)) * (0.6 + r() * 0.4));
}

// Lê o áudio e calcula o volume de cada trecho (RMS), normalizado de 0 a 1.
async function calcularOnda(url) {
  ctxAudio = ctxAudio || new (window.AudioContext || window.webkitAudioContext)();
  // data: não passa pelo fetch (a CSP do site não permite): decodifica o base64 aqui mesmo.
  let buf;
  if (String(url).startsWith("data:")) {
    const bin = atob(String(url).slice(String(url).indexOf(",") + 1));
    const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    buf = u8.buffer;
  } else buf = await (await fetch(url)).arrayBuffer();
  const audio = await new Promise((ok, falha) => { const p = ctxAudio.decodeAudioData(buf, ok, falha); if (p?.then) p.then(ok, falha); });
  const dados = audio.getChannelData(0);
  const passo = Math.max(1, Math.floor(dados.length / BARRAS));
  const picos = [];
  for (let b = 0; b < BARRAS; b++) {
    let soma = 0, n = 0;
    for (let i = b * passo; i < Math.min(dados.length, (b + 1) * passo); i += 4) { soma += dados[i] * dados[i]; n++; }
    picos.push(n ? Math.sqrt(soma / n) : 0);
  }
  const max = Math.max(...picos, 0.0001);
  // Curva suave: falas baixas não somem e picos não estouram.
  return { picos: picos.map((v) => Math.max(0.08, Math.pow(v / max, 0.7))), dur: audio.duration };
}

const mmss = (s) => (Number.isFinite(s) && s > 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00");
const NS = "http://www.w3.org/2000/svg";
function svg(caminho, tam = 18) {
  const s = document.createElementNS(NS, "svg");
  s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("width", tam); s.setAttribute("height", tam); s.setAttribute("aria-hidden", "true");
  const p = document.createElementNS(NS, "path"); p.setAttribute("d", caminho); p.setAttribute("fill", "currentColor"); s.appendChild(p);
  return s;
}
const ICONE_PLAY = "M8 5.6v12.8a1 1 0 0 0 1.5.86l10.2-6.4a1 1 0 0 0 0-1.72L9.5 4.74A1 1 0 0 0 8 5.6z";
const ICONE_PAUSA = "M7 5h3.2v14H7zM13.8 5H17v14h-3.2z";
const ICONE_CARREGANDO = "M12 4a8 8 0 1 0 8 8h-2.2A5.8 5.8 0 1 1 12 6.2z";

function velocidadeSalva() { try { const v = Number(localStorage.getItem(CHAVE_VEL)); return VELOCIDADES.includes(v) ? v : 1; } catch { return 1; } }

function css() {
  if (document.getElementById("hfOndasCss")) return;
  const st = document.createElement("style");
  st.id = "hfOndasCss";
  st.textContent = `
.hf-audio { display: flex; align-items: center; gap: 10px; width: min(264px, 68vw); padding: 3px 2px 1px 0; color: inherit; }
.hf-audio-play { width: 40px; height: 40px; flex: none; border-radius: 50%; border: 0; cursor: pointer; display: grid; place-items: center; background: var(--hf-audio-cor, #00adee); color: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.18); transition: transform .12s; }
.hf-audio-play:active { transform: scale(.94); }
.hf-audio-play:focus-visible { outline: 2px solid var(--hf-audio-cor, #00adee); outline-offset: 2px; }
.hf-audio-play svg { margin-left: 2px; }
.hf-audio.tocando .hf-audio-play svg { margin-left: 0; }
.hf-audio.carregando .hf-audio-play svg { margin-left: 0; animation: hfOndaGira .8s linear infinite; }
@keyframes hfOndaGira { to { transform: rotate(360deg); } }
.hf-audio-corpo { flex: 1; min-width: 0; display: grid; gap: 3px; }
.hf-audio-onda { height: 30px; display: flex; align-items: center; gap: 2px; cursor: pointer; touch-action: none; outline: none; border-radius: 6px; }
.hf-audio-onda:focus-visible { box-shadow: 0 0 0 2px var(--hf-audio-cor, #00adee); }
.hf-audio-onda i { flex: 1; min-width: 2px; border-radius: 2px; background: color-mix(in srgb, currentColor 30%, transparent); transition: height .3s ease, background-color .12s; }
.hf-audio-onda i.on { background: var(--hf-audio-cor, #00adee); }
.hf-audio-rodape { display: flex; align-items: center; justify-content: space-between; gap: 6px; font-size: 11.5px; line-height: 1; }
.hf-audio-tempo { font-variant-numeric: tabular-nums; opacity: .75; }
.hf-audio-vel { border: 0; cursor: pointer; font: inherit; font-size: 11px; font-weight: 800; padding: 3px 7px; border-radius: 999px; color: inherit; background: color-mix(in srgb, currentColor 14%, transparent); min-width: 34px; font-variant-numeric: tabular-nums; }
.hf-audio-vel:hover { background: color-mix(in srgb, currentColor 22%, transparent); }
@media (prefers-reduced-motion: reduce) { .hf-audio-onda i { transition: none; } .hf-audio.carregando .hf-audio-play svg { animation: none; } }
`;
  document.head.appendChild(st);
}

export function criarPlayerAudio({ chave, fonte, duracao = 0, carregarJa = false, aoErro = null } = {}) {
  css();
  const box = document.createElement("div"); box.className = "hf-audio";
  const bPlay = document.createElement("button"); bPlay.type = "button"; bPlay.className = "hf-audio-play"; bPlay.setAttribute("aria-label", "Tocar áudio");
  bPlay.appendChild(svg(ICONE_PLAY));
  const corpo = document.createElement("div"); corpo.className = "hf-audio-corpo";
  const onda = document.createElement("div"); onda.className = "hf-audio-onda";
  onda.tabIndex = 0; onda.setAttribute("role", "slider"); onda.setAttribute("aria-label", "Posição do áudio"); onda.setAttribute("aria-valuemin", "0");
  const barras = Array.from({ length: BARRAS }, () => document.createElement("i"));
  onda.append(...barras);
  const rod = document.createElement("div"); rod.className = "hf-audio-rodape";
  const tempo = document.createElement("span"); tempo.className = "hf-audio-tempo";
  const bVel = document.createElement("button"); bVel.type = "button"; bVel.className = "hf-audio-vel";
  rod.append(tempo, bVel);
  corpo.append(onda, rod);
  box.append(bPlay, corpo);

  let audio = null, url = typeof fonte === "string" ? fonte : null, dur = duracao || 0, vel = velocidadeSalva(), carregandoOnda = null;
  const guardada = ondaGuardada(chave);
  if (guardada?.dur && !dur) dur = guardada.dur;
  const pintarBarras = (picos) => picos.forEach((v, i) => { barras[i].style.height = `${Math.round(18 + v * 82)}%`; });
  pintarBarras(guardada?.picos || ondaProvisoria(chave));
  const pintarVel = () => { bVel.textContent = `${String(vel).replace(".", ",")}x`; bVel.setAttribute("aria-label", `Velocidade ${String(vel).replace(".", ",")} vezes. Tocar para mudar`); };
  pintarVel();
  const progresso = (frac) => {
    const n = Math.round(frac * BARRAS);
    barras.forEach((b, i) => b.classList.toggle("on", i < n));
    onda.setAttribute("aria-valuemax", String(Math.round(dur)));
    onda.setAttribute("aria-valuenow", String(Math.round(frac * dur)));
    onda.setAttribute("aria-valuetext", `${mmss(frac * dur)} de ${mmss(dur)}`);
  };
  const pintarTempo = () => { tempo.textContent = audio && !audio.paused || (audio && audio.currentTime > 0) ? mmss(audio.currentTime) : mmss(dur); };
  pintarTempo(); progresso(0);
  const icone = (nome) => bPlay.replaceChildren(svg(nome));

  async function obterUrl() {
    if (!url) url = typeof fonte === "function" ? await fonte() : fonte;
    return url;
  }
  async function prepararOnda() {
    if (ondaGuardada(chave)?.picos && dur) return;
    if (!carregandoOnda) carregandoOnda = obterUrl().then(calcularOnda).then(({ picos, dur: d }) => {
      if (Number.isFinite(d) && d > 0) dur = d;
      guardarOnda(chave, picos, dur);
      pintarBarras(picos); pintarTempo(); progresso(audio?.currentTime && dur ? audio.currentTime / dur : 0);
    }).catch((e) => { console.warn("Onda do áudio:", e?.message || e); });
    return carregandoOnda;
  }
  function pararEste() {
    if (!audio) return;
    audio.pause();
    box.classList.remove("tocando"); icone(ICONE_PLAY); bPlay.setAttribute("aria-label", "Tocar áudio");
    if (tocando?.audio === audio) tocando = null;
  }
  function montarAudio(u) {
      audio = new Audio(u);
      audio.preload = "auto";
      audio.playbackRate = vel;
      audio.addEventListener("loadedmetadata", () => { if (Number.isFinite(audio.duration) && audio.duration > 0 && !dur) { dur = audio.duration; pintarTempo(); } });
      audio.addEventListener("timeupdate", () => { const d = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : dur; if (d) progresso(Math.min(1, audio.currentTime / d)); pintarTempo(); });
      audio.addEventListener("ended", () => { pararEste(); audio.currentTime = 0; progresso(0); tempo.textContent = mmss(dur); });
      audio.addEventListener("error", () => { pararEste(); box.classList.remove("carregando"); (aoErro || (() => {}))(); });
      prepararOnda();
  }
  async function criarAudio() {
    // URL já conhecida: cria na hora, dentro do toque (o iPhone só deixa tocar assim).
    if (url) { montarAudio(url); return; }
    box.classList.add("carregando"); icone(ICONE_CARREGANDO); bPlay.setAttribute("aria-label", "Carregando áudio");
    try { montarAudio(await obterUrl()); }
    finally { box.classList.remove("carregando"); icone(ICONE_PLAY); bPlay.setAttribute("aria-label", "Tocar áudio"); }
  }
  async function tocar() {
    if (!audio) { try { await criarAudio(); } catch (e) { console.warn(e); (aoErro || (() => {}))(e); return; } }
    if (tocando && tocando.audio !== audio) tocando.parar();
    tocando = { audio, parar: pararEste };
    audio.playbackRate = vel;
    try {
      await audio.play();
      box.classList.add("tocando"); icone(ICONE_PAUSA); bPlay.setAttribute("aria-label", "Pausar áudio");
    } catch (e) {
      // Baixou o áudio depois do toque e o navegador bloqueou: o próximo toque já toca.
      console.warn("Não tocou:", e?.message || e);
      if (e?.name === "NotAllowedError") bPlay.setAttribute("aria-label", "Áudio pronto. Toque para ouvir");
    }
  }
  bPlay.addEventListener("click", (e) => { e.stopPropagation(); if (audio && !audio.paused) pararEste(); else tocar(); });
  bVel.addEventListener("click", (e) => {
    e.stopPropagation();
    vel = VELOCIDADES[(VELOCIDADES.indexOf(vel) + 1) % VELOCIDADES.length];
    try { localStorage.setItem(CHAVE_VEL, String(vel)); } catch {}
    if (audio) audio.playbackRate = vel;
    pintarVel();
  });

  // Tocar/arrastar na onda: pula para o ponto (e começa a tocar se ainda não estava).
  async function pular(frac) {
    frac = Math.max(0, Math.min(1, frac));
    if (!audio) await tocar();
    if (!audio) return;
    const d = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : dur;
    if (!d) return;
    audio.currentTime = frac * d;
    progresso(frac); pintarTempo();
  }
  const fracDe = (e) => { const r = onda.getBoundingClientRect(); return (e.clientX - r.left) / r.width; };
  let arrastando = false;
  onda.addEventListener("pointerdown", (e) => { e.stopPropagation(); arrastando = true; onda.setPointerCapture?.(e.pointerId); pular(fracDe(e)); });
  onda.addEventListener("pointermove", (e) => { if (arrastando && audio) pular(fracDe(e)); });
  ["pointerup", "pointercancel"].forEach((ev) => onda.addEventListener(ev, () => { arrastando = false; }));
  onda.addEventListener("click", (e) => e.stopPropagation());
  onda.addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const d = audio?.duration && Number.isFinite(audio.duration) ? audio.duration : dur;
    if (!d) return;
    const atual = audio ? audio.currentTime : 0;
    const alvo = e.key === "Home" ? 0 : e.key === "End" ? d - 0.1 : atual + (e.key === "ArrowRight" ? 5 : -5);
    pular(alvo / d);
  });
  // Toque longo (menu da mensagem) não deve disparar dentro do player.
  box.addEventListener("touchstart", (e) => e.stopPropagation(), { passive: true });

  if (carregarJa) {
    // Calcula a onda quando o player aparece na tela (não baixa nada antes disso).
    const io = "IntersectionObserver" in window ? new IntersectionObserver((ents) => { if (ents.some((x) => x.isIntersecting)) { io.disconnect(); prepararOnda(); } }) : null;
    if (io) io.observe(box); else prepararOnda();
  }
  return box;
}
