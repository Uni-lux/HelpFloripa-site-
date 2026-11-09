// =====================================================
// Ligações de voz e de vídeo (1 a 1) entre quem já conversa no chat — WebRTC, sem dependência do rede.js.
// O áudio e o vídeo vão direto de um aparelho para o outro; o Firestore só faz a "campainha" (sinalização):
//   chamadas/{id} {de, para, conv, tipo audio|video, status chamando|aceita|recusada|encerrada|perdida|cancelada,
//                  oferta {type, sdp}, resposta {type, sdp}, criadoEm, aceitaEm, fimEm, encerradaPor}
//   chamadas/{id}/candidatos/{auto} {de, c {candidate, sdpMid, sdpMLineIndex}, em}
// Quem liga cria a chamada com a oferta; quem recebe vê a tela de chamada (em qualquer página do site, ouvirChamadas
// é ligado pelo firebase.js) e responde. Nada é gravado: o registro guarda só quem, quando e quanto durou.
// Redes que não deixam a conexão direta (alguns 4G e redes de empresa) precisam de um servidor TURN (repasse): o
// Cloudflare Realtime TURN, com credenciais de 4 h pedidas à Cloud Function credenciaisTurn (servidoresIce, Etapa C).
// =====================================================
import { collection, doc, setDoc, updateDoc, getDoc, onSnapshot, addDoc, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TURN_LIGADO, REGIAO_FUNCOES } from "./servidor.js?v=3";

// Servidores que ajudam os aparelhos a se acharem (grátis). O TURN vem do servidor (servidoresIce).
export const ICE = {
  stun: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun.cloudflare.com:3478"] }],
  turn: []
};
// Credenciais do TURN: pedidas uma vez e guardadas nesta aba até perto de vencer (4 h). Se a função falhar, a ligação
// segue sem TURN (conexão direta) e só tenta de novo em 10 min. Nunca segura a ligação mais de 3,5 s.
const CH_TURN = "hf-turn";
let turnPedido = null;
export function servidoresIce() {
  if (!TURN_LIGADO && !window.__hfTurnTeste) return Promise.resolve([]);
  try {
    const c = JSON.parse(sessionStorage.getItem(CH_TURN) || "null");
    if (c?.ate > Date.now() && Array.isArray(c.iceServers)) return Promise.resolve(c.iceServers);
    if (c?.falhou > Date.now()) return Promise.resolve([]);
  } catch {}
  turnPedido ||= (async () => {
    const f = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js");
    const fns = f.getFunctions(window.firebaseApp, REGIAO_FUNCOES);
    if (window.__hfFuncoesEmulador) f.connectFunctionsEmulator(fns, "127.0.0.1", window.__hfFuncoesEmulador); // só nos testes
    const r = (await f.httpsCallable(fns, "credenciaisTurn", { timeout: 8000 })({})).data;
    const lista = Array.isArray(r?.iceServers) ? r.iceServers.filter((x) => x && x.urls) : [];
    try { sessionStorage.setItem(CH_TURN, JSON.stringify({ iceServers: lista, ate: Number(r?.ate) || Date.now() + 3 * 3600e3 })); } catch {}
    return lista;
  })().catch((e) => {
    console.warn("[Chamada] TURN indisponível:", e?.code || e?.message || e);
    try { sessionStorage.setItem(CH_TURN, JSON.stringify({ falhou: Date.now() + 600000 })); } catch {}
    return [];
  }).finally(() => { turnPedido = null; });
  return Promise.race([turnPedido, new Promise((ok) => setTimeout(() => ok([]), 3500))]);
}
const TOCANDO_MS = 45000;   // sem atender em 45 s = chamada perdida
const CONECTAR_MS = 30000;  // atendeu mas a rede não liga os dois em 30 s = "A rede não deixou conectar"
const QUEDA_MS = 15000;     // caiu no meio (troca de rede, túnel): espera 15 s voltar antes de encerrar
const db = () => window.firebaseDb, auth = () => window.firebaseAuth;
let atual = null; // a chamada em andamento nesta janela (uma por vez)

// ---------- uma campainha por aparelho ----------
// Na rede numa página só (rede.html) as 4 abas são quadros e cada uma carrega o firebase.js; a gaveta do chat também.
// Antes cada janela ouvia as chamadas sozinha: uma ligação tocava 4 vezes (3 delas em quadros escondidos, que
// continuavam tocando por 45 s depois de atender). Agora as janelas do site combinam pela janela de cima:
// - só UMA ouve (a página de cima quando ela tem o site; senão o 1º quadro, e outro assume se ele sair);
// - "ocupado" vale para todas (uma ligação em andamento num quadro recusa a que chega em outro);
// - na rede, o quadro que recebe sobe por cima das abas (__hfShell.porCima) para a tela da chamada aparecer.
function comum() {
  const novo = () => ({ dono: null, emChamada: null });
  try { const t = window.top; void t.location.href; return (t.__hfLig ||= novo()); } catch { return (window.__hfLig ||= novo()); }
}
const vivo = (w, campo, valor) => { try { return !!w && !w.closed && w[campo] === valor; } catch { return false; } };
const ocupado = () => !!atual || (comum().emChamada !== window && vivo(comum().emChamada, "__hfEmChamada", true));
function marcarOcupado(sim) {
  window.__hfEmChamada = sim;
  const R = comum();
  if (sim) R.emChamada = window; else if (R.emChamada === window) R.emChamada = null;
}
const casca = () => { try { return window.parent !== window && window.parent === window.top ? window.top.__hfShell || null : null; } catch { return null; } };
const porCima = (sim) => { try { casca()?.porCima?.(window, sim); } catch {} };
// Foto do perfil: só links do site/Storage ou data:image, e sem aspas (vai dentro de url("...") no estilo).
const fotoSegura = (f) => (typeof f === "string" && f.length < 900000 && /^(https:\/\/|data:image\/)/.test(f) ? f.replace(/["\\\n\r]/g, "") : "");

// ---------- visual ----------
const CSS = `
.hfl { position: fixed; inset: 0; z-index: 6000; display: grid; grid-template-rows: auto 1fr auto; color: #fff; background: #05080b; font-family: inherit; overflow: hidden; }
.hfl-fundo { position: absolute; inset: -40px; background: var(--foto, linear-gradient(135deg, #0b3a52, #071017)) center / cover; filter: blur(34px) brightness(.45); transform: scale(1.1); }
.hfl-topo, .hfl-meio, .hfl-bts { position: relative; z-index: 1; }
.hfl audio { display: none; }
.hfl-remoto { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; background: #000; z-index: 0; }
.hfl-remoto[hidden] { display: none; }
.hfl-local { position: absolute !important; z-index: 2; top: calc(env(safe-area-inset-top, 0px) + 84px); right: 14px; width: 104px; aspect-ratio: 3 / 4; border-radius: 16px; object-fit: cover; background: #111; border: 2px solid rgba(255, 255, 255, .35); box-shadow: 0 12px 30px rgba(0, 0, 0, .5); transform: scaleX(-1); }
.hfl-local[hidden] { display: none; }
.hfl-topo { display: grid; justify-items: center; gap: 4px; padding: calc(env(safe-area-inset-top, 0px) + 18px) 20px 10px; text-align: center; background: linear-gradient(rgba(0, 0, 0, .55), transparent); }
.hfl-topo small { font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; opacity: .8; }
.hfl-topo b { font-size: 22px; } .hfl-topo span { font-size: 14px; opacity: .85; font-variant-numeric: tabular-nums; }
.hfl-meio { display: grid; place-items: center; align-content: center; gap: 14px; }
.hfl-foto { width: 128px; height: 128px; border-radius: 50%; background: #0b3a52 center / cover; display: grid; place-items: center; font-size: 42px; font-weight: 800; box-shadow: 0 0 0 8px rgba(0, 173, 238, .14), 0 0 0 18px rgba(0, 173, 238, .07); }
.hfl.tocando .hfl-foto { animation: hflPulso 1.6s ease-out infinite; }
@keyframes hflPulso { 0% { box-shadow: 0 0 0 0 rgba(0, 173, 238, .45), 0 0 0 0 rgba(0, 173, 238, .25); } 100% { box-shadow: 0 0 0 26px rgba(0, 173, 238, 0), 0 0 0 46px rgba(0, 173, 238, 0); } }
.hfl.com-video .hfl-meio { visibility: hidden; }
.hfl-aviso { max-width: 300px; font-size: 13px; line-height: 1.45; text-align: center; opacity: .8; }
.hfl-bts { display: flex; justify-content: center; align-items: flex-start; gap: 18px; padding: 18px 16px calc(env(safe-area-inset-bottom, 0px) + 26px); background: linear-gradient(transparent, rgba(0, 0, 0, .6)); }
.hfl-bt { display: grid; justify-items: center; gap: 6px; padding: 0; border: 0; background: none; color: #fff; font: inherit; font-size: 11.5px; font-weight: 700; cursor: pointer; }
.hfl-bt i { display: grid; place-items: center; width: 60px; height: 60px; border-radius: 50%; background: rgba(255, 255, 255, .16); backdrop-filter: blur(8px); font-style: normal; transition: transform .12s, background .15s; }
.hfl-bt:active i { transform: scale(.92); }
.hfl-bt.off i { background: #fff; color: #05080b; }
.hfl-bt.fim i { background: #e5484d; } .hfl-bt.atender i { background: #22c55e; }
.hfl-bt svg { width: 26px; height: 26px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.hfl-bt.fim svg { transform: rotate(135deg); }
@media (prefers-reduced-motion: reduce) { .hfl.tocando .hfl-foto { animation: none; } }`;
let cssOk = false;
function css() { if (cssOk) return; cssOk = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); }
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const SVG = {
  tel: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21"/>',
  micOff: '<path d="M3 3l18 18M9 9v2a3 3 0 005 2.2M15 9.3V6a3 3 0 00-6-.3M5.5 11a6.5 6.5 0 0010.6 5M18.5 11a6.4 6.4 0 01-.6 2.7M12 17.5V21"/>',
  cam: '<rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="M16 10.5l5-3v9l-5-3"/>',
  camOff: '<path d="M3 3l18 18M8 6h5.5A2.5 2.5 0 0116 8.5V11l5-3v9l-3.5-2M16 16v-.5a2.5 2.5 0 01-2.5 2.5h-8A2.5 2.5 0 013 15.5v-7A2.5 2.5 0 015 6.1"/>',
  virar: '<path d="M4 9a8 8 0 0114-3l2 2M20 15a8 8 0 01-14 3l-2-2M20 4v4h-4M4 20v-4h4"/>',
  som: '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12"/>'
};
const svg = (nome) => `<svg viewBox="0 0 24 24" aria-hidden="true">${SVG[nome]}</svg>`;
function botao(cls, icone, rotulo, fn) {
  const b = el("button", "hfl-bt " + cls); b.type = "button"; b.setAttribute("aria-label", rotulo);
  const i = el("i"); i.innerHTML = svg(icone); b.append(i, el("span", null, rotulo));
  b.addEventListener("click", fn); return b;
}
const iniciais = (n) => String(n || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0] || "").join("").toUpperCase();
const relogio = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };

// Tela da chamada (a mesma para quem liga e para quem recebe).
function montarTela({ nome, foto, tipo, recebendo }) {
  css();
  const t = el("div", "hfl tocando"); t.setAttribute("role", "dialog"); t.setAttribute("aria-modal", "true"); t.setAttribute("aria-label", `Chamada com ${nome}`);
  t.dataset.semVoltar = "1";
  foto = fotoSegura(foto);
  const fundo = el("div", "hfl-fundo"); if (foto) fundo.style.setProperty("--foto", `url("${foto}")`);
  const remoto = el("video", "hfl-remoto"); remoto.autoplay = true; remoto.playsInline = true; remoto.hidden = true;
  const somRemoto = el("audio"); somRemoto.autoplay = true;
  const local = el("video", "hfl-local"); local.autoplay = true; local.playsInline = true; local.muted = true; local.hidden = true; // aparece com a câmera ligada
  const topo = el("div", "hfl-topo"); const rotTipo = el("small", null, tipo === "video" ? "Chamada de vídeo" : "Chamada de voz");
  const situacao = el("span", null, recebendo ? "Chamando você…" : "Chamando…");
  topo.append(rotTipo, el("b", null, nome), situacao);
  const meio = el("div", "hfl-meio"); const ft = el("div", "hfl-foto");
  if (foto) ft.style.backgroundImage = `url("${foto}")`; else ft.textContent = iniciais(nome);
  const aviso = el("p", "hfl-aviso", "Ligação pelo Help Floripa: nada é gravado. Não passe senhas nem códigos por ligação.");
  meio.append(ft, aviso);
  const bts = el("div", "hfl-bts");
  t.append(fundo, remoto, somRemoto, local, topo, meio, bts);
  document.body.appendChild(t);
  return { t, remoto, somRemoto, local, situacao, bts, aviso };
}

// Campainha: tom curto repetido (WebAudio) + vibração; para quando atende, recusa ou some.
function campainha(recebendo) {
  let ctx = null, timer = null;
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
  // Num quadro que ainda não recebeu toque o navegador cria o som "suspenso": tenta liberar (e de novo a cada toque).
  const liberar = () => { try { if (ctx?.state === "suspended") ctx.resume().catch(() => {}); } catch {} };
  liberar(); addEventListener("pointerdown", liberar, true);
  const tocar = () => {
    liberar();
    // Vibrar só depois de algum toque na página (sem isso o navegador recusa e anota erro no console).
    if (recebendo && navigator.vibrate && navigator.userActivation?.hasBeenActive !== false) navigator.vibrate([400, 200, 400]);
    if (!ctx) return;
    const t0 = ctx.currentTime;
    [0, 0.45].forEach((d) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = recebendo ? 660 : 440; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, t0 + d); g.gain.exponentialRampToValueAtTime(recebendo ? 0.18 : 0.08, t0 + d + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.35);
      o.start(t0 + d); o.stop(t0 + d + 0.4);
    });
  };
  tocar(); timer = setInterval(tocar, recebendo ? 2200 : 3000);
  return () => { clearInterval(timer); removeEventListener("pointerdown", liberar, true); try { navigator.vibrate?.(0); } catch {} try { if (ctx && ctx.state !== "closed") ctx.close().catch(() => {}); } catch {} };
}

function erroMidia(e, tipo) {
  if (e?.name === "NotAllowedError") return tipo === "video" ? "Libere a câmera e o microfone para fazer a chamada de vídeo." : "Libere o microfone para fazer a ligação.";
  if (e?.name === "NotFoundError") return tipo === "video" ? "Não encontramos câmera ou microfone neste aparelho." : "Não encontramos microfone neste aparelho.";
  return "Não foi possível usar o microfone/câmera agora.";
}
const pedirMidia = (tipo, frente = true) => navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: tipo === "video" ? { facingMode: frente ? "user" : "environment", width: { ideal: 1280 }, height: { ideal: 720 } } : false });

// ---------- motor comum (os dois lados) ----------
function iniciarConexao(ref, eu, tela, tipo, midia, turn = []) {
  const pc = new RTCPeerConnection({ iceServers: [...ICE.stun, ...ICE.turn, ...turn] });
  midia.getTracks().forEach((tr) => pc.addTrack(tr, midia));
  if (tipo === "video") { tela.local.srcObject = midia; tela.local.hidden = false; }
  const remota = new MediaStream();
  // Alguns navegadores mandam a trilha sem a "stream" junto (ev.streams vazio): usa a própria trilha.
  pc.ontrack = (ev) => {
    (ev.streams[0]?.getTracks() || [ev.track]).forEach((tr) => { if (tr && !remota.getTracks().includes(tr)) remota.addTrack(tr); });
    const alvo = tipo === "video" ? tela.remoto : tela.somRemoto;
    if (tipo === "video") { tela.remoto.hidden = false; tela.t.classList.add("com-video"); }
    if (alvo.srcObject !== remota) alvo.srcObject = remota;
    alvo.play?.().catch(() => {}); // o autoplay sozinho falha no iPhone quando a trilha chega depois
  };
  // Candidatos: os meus vão para a subcoleção; os do outro lado entram na conexão.
  const fila = []; let pronto = false;
  // Para explicar uma falha: que caminhos este aparelho achou (host = rede local, srflx = internet pelo STUN,
  // relay = servidor de repasse/TURN) e se chegou algum do outro lado.
  const diag = { tipos: new Set(), remotos: 0 };
  pc.onicecandidate = (ev) => {
    if (!ev.candidate) return;
    const tipo = ev.candidate.type || (/ typ (\w+)/.exec(ev.candidate.candidate || "") || [])[1]; if (tipo) diag.tipos.add(tipo);
    const c = ev.candidate.toJSON(); const dados = { de: eu, c: { candidate: c.candidate, sdpMid: c.sdpMid ?? null, sdpMLineIndex: c.sdpMLineIndex ?? null }, em: serverTimestamp() };
    if (pronto) addDoc(collection(ref, "candidatos"), dados).catch(() => {}); else fila.push(dados);
  };
  const liberarFila = () => { pronto = true; fila.splice(0).forEach((d) => addDoc(collection(ref, "candidatos"), d).catch(() => {})); };
  const pendentes = []; let temRemota = false;
  // Ouvir os caminhos do outro lado. BUG ANTIGO (09/11/2026): quem ligava começava a ouvir ANTES de a chamada existir
  // no banco; a regra (que lê a chamada) recusava, a escuta morria calada e quem ligou NUNCA recebia os caminhos de
  // quem atendeu. No Wi-Fi às vezes conectava assim mesmo; no 4G/5G ficava em "Conectando…". Agora quem liga só começa
  // a ouvir depois de gravar a chamada (ouvirCandidatos), e uma escuta recusada tenta de novo (até 5 vezes).
  let pararCand = () => {}, tentativas = 0, parado = false;
  const ouvirCandidatos = () => {
    if (parado) return;
    pararCand = onSnapshot(collection(ref, "candidatos"), (s) => s.docChanges().forEach((ch) => {
      if (ch.type !== "added") return; const d = ch.doc.data(); if (d.de === eu || !d.c) return;
      diag.remotos++;
      if (temRemota) pc.addIceCandidate(d.c).catch(() => {}); else pendentes.push(d.c);
    }), (e) => {
      console.warn("[Chamada] caminhos do outro lado:", e?.code || e);
      if (!parado && ++tentativas <= 5) setTimeout(ouvirCandidatos, 600 * tentativas);
    });
  };
  const remotaPronta = () => { temRemota = true; pendentes.splice(0).forEach((c) => pc.addIceCandidate(c).catch(() => {})); };
  return { pc, liberarFila, remotaPronta, ouvirCandidatos, pararCand: () => { parado = true; pararCand(); }, diag };
}

// Controles durante a chamada: microfone, câmera, virar a câmera (vídeo) e encerrar.
function controles(tela, tipo, midiaRef, pc, encerrar) {
  tela.bts.replaceChildren();
  const mic = botao("", "mic", "Microfone", () => {
    const tr = midiaRef.m.getAudioTracks()[0]; if (!tr) return; tr.enabled = !tr.enabled;
    mic.classList.toggle("off", !tr.enabled); mic.querySelector("i").innerHTML = svg(tr.enabled ? "mic" : "micOff"); mic.lastChild.textContent = tr.enabled ? "Microfone" : "Mudo";
  });
  tela.bts.appendChild(mic);
  if (tipo === "video") {
    const cam = botao("", "cam", "Câmera", () => {
      const tr = midiaRef.m.getVideoTracks()[0]; if (!tr) return; tr.enabled = !tr.enabled;
      cam.classList.toggle("off", !tr.enabled); cam.querySelector("i").innerHTML = svg(tr.enabled ? "cam" : "camOff"); tela.local.style.opacity = tr.enabled ? "1" : ".25";
    });
    let frente = true;
    // Virar: o celular não abre as duas câmeras ao mesmo tempo, então a de agora para ANTES de pedir a outra (antes o
    // pedido falhava calado na maioria dos Android). Só a câmera é pedida de novo (o microfone continua o mesmo).
    let virando = false;
    const virar = botao("", "virar", "Virar", async () => {
      if (virando) return; virando = true;
      const velha = midiaRef.m.getVideoTracks()[0], ligada = velha ? velha.enabled : true;
      const sender = pc.getSenders().find((s) => s.track?.kind === "video" || (!s.track && velha));
      const trocar = async (paraFrente) => {
        const nv = (await navigator.mediaDevices.getUserMedia({ video: { facingMode: paraFrente ? "user" : "environment", width: { ideal: 1280 }, height: { ideal: 720 } } })).getVideoTracks()[0];
        nv.enabled = ligada;
        await sender?.replaceTrack(nv);
        midiaRef.m.getVideoTracks().forEach((t) => midiaRef.m.removeTrack(t)); midiaRef.m.addTrack(nv);
        tela.local.srcObject = midiaRef.m; tela.local.style.transform = paraFrente ? "scaleX(-1)" : "none";
      };
      try { velha?.stop(); await trocar(!frente); frente = !frente; }
      catch { try { await trocar(frente); } catch {} tela.situacao.dataset.aviso = "Não foi possível trocar de câmera"; setTimeout(() => delete tela.situacao.dataset.aviso, 2500); }
      finally { virando = false; }
    });
    tela.bts.append(cam, virar);
  }
  tela.bts.appendChild(botao("fim", "tel", "Encerrar", () => encerrar("encerrada")));
}

function finalizarLocal(ctx) {
  ctx.pararCampainha?.(); clearTimeout(ctx.timeout); clearInterval(ctx.cronometro); ctx.pararVigia?.();
  try { ctx.tela && (ctx.tela.remoto.srcObject = null, ctx.tela.somRemoto.srcObject = null, ctx.tela.local.srcObject = null); } catch {}
  ctx.wake?.release?.().catch(() => {}); ctx.wake = null;
  ctx.pararDoc?.(); ctx.conexao?.pararCand?.();
  try { ctx.conexao?.pc.close(); } catch {}
  ctx.midia?.m?.getTracks().forEach((t) => t.stop());
  ctx.tela?.t.remove();
  if (atual === ctx) { atual = null; marcarOcupado(false); }
  if (ctx.subiu) { ctx.subiu = false; porCima(false); }
}

// Quando conecta: some a campainha, começa o cronômetro.
function conectou(ctx, inicio) {
  if (ctx.conectado) return; ctx.conectado = true; ctx.inicio = inicio || Date.now();
  ctx.pararCampainha?.(); ctx.tela.t.classList.remove("tocando");
  ctx.tela.aviso.textContent = ctx.tipo === "video" ? "" : "Ligação pelo Help Floripa: nada é gravado.";
  const pintar = () => { const s = ctx.tela.situacao; s.textContent = s.dataset.aviso || (ctx.caiu ? "Reconectando…" : relogio(Date.now() - ctx.inicio)); };
  pintar(); ctx.cronometro = setInterval(pintar, 1000);
  // Chamada de vídeo: a tela não apaga sozinha enquanto a conversa dura (onde o navegador deixa).
  if (ctx.tipo === "video") navigator.wakeLock?.request?.("screen").then((w) => { if (atual === ctx) ctx.wake = w; else w.release().catch(() => {}); }).catch(() => {});
}
// Explicação de uma ligação que não conectou, pelo que cada aparelho achou.
function motivoFalha(d) {
  if (!d) return "Confira a internet e tente de novo.";
  if (!d.remotos) return "O outro aparelho não respondeu à conexão. Confiram a internet dos dois e tentem de novo.";
  if (d.tipos.has("relay")) return "A conexão não fechou mesmo pelo servidor de repasse. Tentem de novo em instantes.";
  return "A rede de um de vocês bloqueou a ligação direta (é comum no 4G/5G). Tentem com os dois no Wi-Fi.";
}
// Estado da conexão (os dois lados). Antes: atendida mas sem conexão ficava em "Conectando…" para sempre, e uma queda
// rápida de rede (trocar do Wi-Fi para o 4G) encerrava na hora. Agora: 30 s para conectar; caiu = "Reconectando…" e
// 15 s para voltar sozinha. O Safari antigo não tem connectionState: usa o estado do ICE.
function vigiar(ctx, pc, encerrar) {
  let queda = null;
  // Não conectou: diz o porquê (o mais provável) e fecha depois de dar tempo de ler.
  const desistir = (texto) => {
    if (ctx.desistiu) return; ctx.desistiu = true;
    ctx.tela.situacao.dataset.aviso = texto; ctx.tela.situacao.textContent = texto;
    if (!ctx.conectado) ctx.tela.aviso.textContent = motivoFalha(ctx.conexao?.diag);
    setTimeout(() => encerrar("encerrada"), ctx.conectado ? 1800 : 5000);
  };
  const prazo = setTimeout(() => { if (!ctx.conectado) desistir("Não foi possível conectar"); }, CONECTAR_MS);
  // Demorando: avisa (antes ficava só "Conectando…" sem explicação).
  const demora = setTimeout(() => { if (!ctx.conectado && !ctx.desistiu) ctx.tela.aviso.textContent = "Está demorando para conectar. Redes móveis (4G/5G) às vezes bloqueiam a ligação direta entre os aparelhos; no Wi-Fi costuma funcionar."; }, 9000);
  ctx.pararVigia = () => { clearTimeout(prazo); clearTimeout(queda); clearTimeout(demora); };
  const mudou = () => {
    const st = pc.connectionState || ({ completed: "connected", checking: "connecting" }[pc.iceConnectionState] || pc.iceConnectionState);
    if (st === "connected") { clearTimeout(prazo); clearTimeout(queda); queda = null; ctx.caiu = false; conectou(ctx); }
    else if (st === "disconnected" && ctx.conectado) {
      ctx.caiu = true; ctx.tela.situacao.textContent = "Reconectando…";
      clearTimeout(queda); queda = setTimeout(() => desistir("A ligação caiu"), QUEDA_MS);
    } else if (st === "failed") desistir(ctx.conectado ? "A ligação caiu" : "Não foi possível conectar");
  };
  pc.onconnectionstatechange = mudou;
  pc.oniceconnectionstatechange = () => { if (!("connectionState" in pc)) mudou(); };
}

// ---------- quem liga ----------
// ligar({ para, nome, foto, conv, tipo }) → resolve com { status, duracaoSeg } quando a chamada acaba.
export function ligar({ para, nome, foto, conv, tipo = "audio" }) {
  return new Promise(async (resolver) => {
    const eu = auth()?.currentUser?.uid;
    if (!eu || !db()) return resolver({ status: "erro", erro: "Entre na sua conta para ligar." });
    if (ocupado()) return resolver({ status: "erro", erro: "Você já está numa chamada." });
    if (!window.RTCPeerConnection || !navigator.mediaDevices?.getUserMedia) return resolver({ status: "erro", erro: "Este navegador não faz ligações. Atualize o navegador ou use outro." });
    const ctx = { tipo, para }; atual = ctx; marcarOcupado(true);
    ctx.tela = montarTela({ nome, foto, tipo, recebendo: false });
    let fim = false;
    const encerrar = async (status, porMim = true) => {
      if (fim) return; fim = true;
      const duracaoSeg = ctx.conectado ? Math.round((Date.now() - ctx.inicio) / 1000) : 0;
      // A chamada ainda está sendo criada (cancelou logo depois de tocar em Ligar): grava o fim quando ela existir.
      if (porMim && ctx.ref) { if (ctx.criada) await updateDoc(ctx.ref, { status, fimEm: serverTimestamp(), encerradaPor: eu }).catch(() => {}); else ctx.fimPendente = status; }
      finalizarLocal(ctx);
      resolver({ status, duracaoSeg });
    };
    ctx.encerrarJa = () => encerrar(ctx.conectado ? "encerrada" : "cancelada");
    ctx.tela.bts.appendChild(botao("fim", "tel", "Cancelar", () => encerrar(ctx.conectado ? "encerrada" : "cancelada")));
    const turnP = servidoresIce(); // junto com o pedido do microfone/câmera (não atrasa)
    try { ctx.midia = { m: await pedirMidia(tipo) }; }
    catch (e) { finalizarLocal(ctx); return resolver({ status: "erro", erro: erroMidia(e, tipo) }); }
    if (fim) { ctx.midia.m.getTracks().forEach((t) => t.stop()); return; }
    const turn = await turnP;
    if (fim) { ctx.midia.m.getTracks().forEach((t) => t.stop()); return; }
    ctx.ref = doc(collection(db(), "chamadas"));
    ctx.conexao = iniciarConexao(ctx.ref, eu, ctx.tela, tipo, ctx.midia.m, turn);
    const { pc } = ctx.conexao;
    controles(ctx.tela, tipo, ctx.midia, pc, (s) => encerrar(ctx.conectado ? s : "cancelada"));
    ctx.pararCampainha = campainha(false);
    try {
      const oferta = await pc.createOffer(); await pc.setLocalDescription(oferta);
      if (fim) return;
      await setDoc(ctx.ref, { de: eu, para, conv, tipo, status: "chamando", oferta: { type: oferta.type, sdp: oferta.sdp }, criadoEm: serverTimestamp() });
      ctx.criada = true;
    } catch (e) {
      console.warn("[Chamada]", e?.code || e);
      if (fim) return;
      fim = true; finalizarLocal(ctx);
      return resolver({ status: "erro", erro: e?.code === "permission-denied" ? "As ligações começam a funcionar quando a atualização do sistema for publicada." : "Não foi possível ligar agora." });
    }
    // Cancelou enquanto a chamada era criada: antes ela ficava "chamando" e a outra pessoa via tocar por 45 s.
    if (fim) { if (ctx.fimPendente) updateDoc(ctx.ref, { status: ctx.fimPendente, fimEm: serverTimestamp(), encerradaPor: eu }).catch(() => {}); return; }
    ctx.conexao.ouvirCandidatos(); // só agora: a chamada já existe no banco (a regra lê ela)
    ctx.conexao.liberarFila();
    ctx.timeout = setTimeout(() => { if (!ctx.conectado && !ctx.respondida) encerrar("perdida"); }, TOCANDO_MS);
    ctx.pararDoc = onSnapshot(ctx.ref, async (s) => {
      const d = s.data(); if (!d) return;
      if (d.resposta && !ctx.respondida) {
        // Atendeu: o "tuu… tuu…" para NA HORA (antes só parava quando a conexão fechava; se a rede não deixava
        // conectar, quem ligou ficava ouvindo o telefone chamando com "Conectando…" na tela).
        ctx.respondida = true; clearTimeout(ctx.timeout); ctx.pararCampainha?.(); ctx.tela.t.classList.remove("tocando");
        ctx.tela.situacao.textContent = "Conectando…";
        vigiar(ctx, pc, encerrar);
        try { await pc.setRemoteDescription(d.resposta); ctx.conexao.remotaPronta(); } catch (e) { console.warn("[Chamada] resposta", e); }
      }
      if (d.status === "recusada" && !ctx.conectado) { ctx.tela.situacao.textContent = "Não atendeu"; ctx.pararCampainha?.(); setTimeout(() => encerrar("recusada", false), 1200); }
      else if (d.status === "encerrada" && d.encerradaPor !== eu) encerrar("encerrada", false);
    }, () => {});
  });
}

// ---------- quem recebe ----------
// Nome e foto de quem liga (antes lia o campo "foto", que não existe no perfil: a foto nunca aparecia).
// Com 2,5 s no máximo: a campainha não espera uma internet lenta (toca com "Alguém" e troca quando chegar).
async function nomeDe(uid) {
  const ler = getDoc(doc(db(), "perfis_publicos", uid)).then((s) => { const d = s.exists() ? s.data() : {}; return { nome: d.nome || (d.nickname ? "@" + d.nickname : "Alguém"), foto: fotoSegura(d.fotoPerfil || d.foto) }; })
    .catch(() => ({ nome: "Alguém", foto: "" }));
  return Promise.race([ler, new Promise((ok) => setTimeout(() => ok(null), 2500))]).then((r) => r || { nome: "Alguém", foto: "", depois: ler });
}
async function receber(id, d) {
  const eu = auth()?.currentUser?.uid;
  const ref = doc(db(), "chamadas", id);
  if (ocupado()) { updateDoc(ref, { status: "recusada", fimEm: serverTimestamp(), encerradaPor: eu }).catch(() => {}); return; } // ocupado
  const ctx = { tipo: d.tipo === "video" ? "video" : "audio", ref }; atual = ctx; marcarOcupado(true);
  const quem = await nomeDe(d.de);
  if (atual !== ctx) return;
  ctx.tela = montarTela({ nome: quem.nome, foto: quem.foto, tipo: ctx.tipo, recebendo: true });
  quem.depois?.then((q) => {
    if (atual !== ctx || !ctx.tela) return;
    ctx.tela.t.querySelector(".hfl-topo b").textContent = q.nome; ctx.tela.t.setAttribute("aria-label", `Chamada com ${q.nome}`);
    if (q.foto) { ctx.tela.t.querySelector(".hfl-fundo").style.setProperty("--foto", `url("${q.foto}")`); const ft = ctx.tela.t.querySelector(".hfl-foto"); ft.textContent = ""; ft.style.backgroundImage = `url("${q.foto}")`; }
  });
  // Na rede (rede.html) este quadro pode estar escondido atrás de outra aba: sobe por cima enquanto a chamada dura.
  porCima(true); ctx.subiu = true;
  ctx.pararCampainha = campainha(true);
  // Credenciais do TURN já pedidas enquanto toca (quando a pessoa atender, estão prontas).
  const turnRecebida = servidoresIce();
  let fim = false;
  const encerrar = async (status, porMim = true) => {
    if (fim) return; fim = true;
    if (porMim) await updateDoc(ref, { status, fimEm: serverTimestamp(), encerradaPor: eu }).catch(() => {});
    finalizarLocal(ctx);
  };
  ctx.encerrarJa = () => encerrar(ctx.conexao ? "encerrada" : "recusada");
  const recusar = botao("fim", "tel", "Recusar", () => encerrar("recusada"));
  const atender = botao("atender", ctx.tipo === "video" ? "cam" : "tel", "Atender", async () => {
    ctx.pararCampainha(); ctx.tela.t.classList.remove("tocando"); atender.disabled = true; ctx.tela.situacao.textContent = "Conectando…";
    let m;
    try { m = await pedirMidia(ctx.tipo); }
    catch (e) { if (fim) return; ctx.tela.aviso.textContent = erroMidia(e, ctx.tipo); setTimeout(() => encerrar("recusada"), 2500); return; }
    // Quem ligou desistiu enquanto o celular pedia o microfone: antes o microfone ficava ligado sem chamada nenhuma.
    if (fim) { m.getTracks().forEach((t) => t.stop()); return; }
    ctx.midia = { m };
    const turn = await turnRecebida;
    if (fim) { m.getTracks().forEach((t) => t.stop()); return; }
    ctx.conexao = iniciarConexao(ref, eu, ctx.tela, ctx.tipo, ctx.midia.m, turn);
    ctx.conexao.ouvirCandidatos();
    const { pc } = ctx.conexao;
    clearTimeout(ctx.timeout);
    vigiar(ctx, pc, encerrar);
    try {
      await pc.setRemoteDescription(d.oferta); ctx.conexao.remotaPronta();
      const resp = await pc.createAnswer(); await pc.setLocalDescription(resp);
      if (fim) return;
      await updateDoc(ref, { status: "aceita", resposta: { type: resp.type, sdp: resp.sdp }, aceitaEm: serverTimestamp() });
      ctx.conexao.liberarFila();
    } catch (e) {
      if (fim) return;
      console.warn("[Chamada] atender", e?.code || e);
      ctx.tela.situacao.textContent = e?.code === "permission-denied" ? "A chamada já terminou" : "Não foi possível atender";
      setTimeout(() => encerrar("encerrada", e?.code !== "permission-denied"), 1500); return;
    }
    controles(ctx.tela, ctx.tipo, ctx.midia, pc, encerrar);
  });
  ctx.tela.bts.append(recusar, atender);
  ctx.timeout = setTimeout(() => { if (!ctx.conectado && !ctx.conexao) encerrar("perdida", false); }, Math.max(3000, TOCANDO_MS - (Date.now() - (d.criadoEm?.toMillis?.() ?? Date.now()))));
  ctx.pararDoc = onSnapshot(ref, (s) => {
    const x = s.data(); if (!x) return;
    if (["cancelada", "perdida"].includes(x.status) || (x.status === "encerrada" && x.encerradaPor !== eu)) encerrar(x.status, false);
    // Atendida ou recusada em OUTRO aparelho da mesma conta (celular e computador tocam juntos): este para de tocar.
    else if (!ctx.conexao && (x.status === "aceita" || (x.status === "recusada" && x.encerradaPor === eu))) {
      ctx.pararCampainha?.(); ctx.tela.situacao.textContent = x.status === "aceita" ? "Atendida em outro aparelho" : "Recusada";
      ctx.tela.bts.replaceChildren(); setTimeout(() => encerrar(x.status, false), 1500);
    }
  }, () => {});
}

// Fica ouvindo chamadas para esta pessoa (em qualquer página). Uma vez por aba.
// Só UMA janela do site ouve por aparelho/aba (veja comum()): a página de cima sempre assume; um quadro só assume se
// ninguém está ouvindo, e confere de 4 em 4 s se quem ouvia saiu (trocou de página, fechou).
export function ouvirChamadas(uid) {
  if (!uid || !db()) return;
  if (window.__hfChamadas === uid || window.__hfChamadasEspera === uid) return;
  window.__hfChamadasParar?.(); window.__hfChamadasParar = null; window.__hfChamadas = null;
  clearInterval(window.__hfChamadasVigia);
  window.__hfChamadasEspera = uid;
  const assumir = () => {
    const R = comum();
    if (window.top !== window && R.dono !== window && vivo(R.dono, "__hfChamadas", uid)) return false;
    R.dono = window;
    clearInterval(window.__hfChamadasVigia); window.__hfChamadasEspera = null;
    ligarOuvinte(uid);
    return true;
  };
  if (!assumir()) window.__hfChamadasVigia = setInterval(assumir, 4000);
}
function ligarOuvinte(uid) {
  const vistas = new Set();
  const parar = onSnapshot(query(collection(db(), "chamadas"), where("para", "==", uid), where("status", "==", "chamando")), (s) => {
    // Outra janela assumiu (a página de cima abriu o site): esta para de ouvir e volta a esperar a vez.
    if (comum().dono !== window) { parar(); window.__hfChamadas = null; window.__hfChamadasParar = null; ouvirChamadas(uid); return; }
    s.docChanges().forEach((ch) => {
      if (ch.type !== "added" || vistas.has(ch.doc.id)) return;
      vistas.add(ch.doc.id);
      const d = ch.doc.data();
      const quando = d.criadoEm?.toMillis?.() ?? Date.now();
      if (Date.now() - quando > TOCANDO_MS) return; // chamada antiga que ficou "tocando"
      receber(ch.doc.id, d);
    });
  }, (e) => console.warn("[Chamadas]", e?.code || e));
  window.__hfChamadas = uid; window.__hfChamadasParar = parar;
}
// Saiu da página (trocou de página, fechou a aba) no meio da ligação: avisa o outro lado na hora (antes ele ficava
// falando sozinho até a rede perceber) e libera a vez de ouvir para outra janela.
addEventListener("pagehide", () => {
  atual?.encerrarJa?.();
  const R = comum(); if (R.dono === window) R.dono = null;
  marcarOcupado(false);
});

// ---------- como cada ligação aparece (cartão no chat, prévia da conversa e aba Chamadas) ----------
// Um texto só para os três lugares (antes o cartão dizia "cancelada" e o registro "Não atendida" para a mesma ligação).
// saiu = eu liguei. Quem recebe vê "perdida" quando não atendeu (cancelada ou sem resposta), como nos celulares.
export function duracaoTexto(seg) {
  const s = Math.max(0, Math.round(Number(seg) || 0));
  if (s < 60) return `${s} s`;
  if (s < 3600) { const m = Math.floor(s / 60), r = s % 60; return r ? `${m} min ${String(r).padStart(2, "0")} s` : `${m} min`; }
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return m ? `${h} h ${String(m).padStart(2, "0")} min` : `${h} h`;
}
// { modo audio|video, resultado encerrada|cancelada|perdida|recusada|aceita|chamando, duracao (s), saiu }
// → { titulo, estado, tom ok|neutro|perdida, perdida, falou, direcao }
export function descreverChamada({ modo, resultado, duracao = 0, saiu = true }) {
  const qual = modo === "video" ? "Chamada de vídeo" : "Chamada de voz";
  const direcao = saiu ? "Feita" : "Recebida";
  const res = resultado === "chamando" ? "perdida" : resultado;
  if (res === "aceita" || (res === "encerrada" && duracao > 0)) {
    return { titulo: qual, estado: duracao > 0 ? duracaoTexto(duracao) : "Atendida", tom: "ok", perdida: false, falou: true, direcao };
  }
  if (res === "encerrada") return { titulo: qual, estado: "Não conectou", tom: "neutro", perdida: false, falou: false, direcao };
  if (saiu) {
    const estado = { cancelada: "Cancelada", perdida: "Sem resposta", recusada: "Não atendida" }[res] || "Não atendida";
    return { titulo: qual, estado, tom: "neutro", perdida: false, falou: false, direcao };
  }
  if (res === "recusada") return { titulo: qual, estado: "Recusada por você", tom: "neutro", perdida: false, falou: false, direcao };
  return { titulo: qual + " perdida", estado: "Perdida", tom: "perdida", perdida: true, falou: false, direcao: "Perdida" };
}
// Texto curto (prévia da conversa, registro da equipe): "Chamada de voz · 2 min 05 s", "Chamada de vídeo perdida".
export function textoChamada(c, saiu = true) {
  const d = descreverChamada({ modo: c?.modo, resultado: c?.resultado, duracao: c?.duracao, saiu });
  return d.perdida ? d.titulo : `${d.titulo} · ${d.estado}`;
}
