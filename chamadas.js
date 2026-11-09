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
import { criarMini } from "./chamada-mini.js?v=2";

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
// Tela da ligação (09/11/2026, refeita no padrão dos apps grandes, com as cores da Help Floripa): topo com Minimizar,
// nome, situação e o selo de criptografia; no meio a foto (ou o vídeo); um aviso quando a outra pessoa silencia ou
// desliga a câmera; embaixo um cartão com Câmera · Silenciar · Virar · Encerrar. Minimizar vira uma pílula no alto
// (chamada-mini.js) e a pessoa continua usando o site; tocar na pílula volta para a ligação.
const CSS = `
.hfl { position: fixed; inset: 0; z-index: 6000; display: grid; grid-template-rows: auto 1fr auto; color: #fff; background: #03070a; font-family: inherit; overflow: hidden; -webkit-tap-highlight-color: transparent; }
.hfl.minimizada { display: none; }
.hfl-fundo { position: absolute; inset: -40px; background: var(--foto, radial-gradient(120% 80% at 50% 20%, #0a4a63 0%, #04141c 55%, #020508 100%)) center / cover; filter: blur(36px) brightness(.42) saturate(1.2); transform: scale(1.12); }
.hfl::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(90% 60% at 50% 0%, rgba(0, 173, 238, .16), transparent 70%); }
.hfl-topo, .hfl-meio, .hfl-rodape { position: relative; z-index: 2; }
.hfl audio { display: none; }
.hfl-remoto { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; background: #000; z-index: 0; }
.hfl-remoto[hidden] { display: none; }
.hfl-local { position: absolute !important; z-index: 3; top: calc(env(safe-area-inset-top, 0px) + 92px); right: 14px; width: 104px; aspect-ratio: 3 / 4; border-radius: 18px; object-fit: cover; background: #111; border: 2px solid rgba(255, 255, 255, .5); box-shadow: 0 12px 30px rgba(0, 0, 0, .5); transform: scaleX(-1); touch-action: none; }
.hfl-local[hidden] { display: none; }
.hfl-topo { display: grid; grid-template-columns: 48px 1fr 48px; align-items: start; gap: 6px; padding: calc(env(safe-area-inset-top, 0px) + 12px) 12px 14px; background: linear-gradient(rgba(0, 0, 0, .55), transparent); }
.hfl-min { width: 46px; height: 46px; border-radius: 50%; border: 0; display: grid; place-items: center; background: rgba(255, 255, 255, .14); color: #fff; cursor: pointer; backdrop-filter: blur(10px); }
.hfl-min svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.hfl-cab { display: grid; justify-items: center; gap: 3px; text-align: center; min-width: 0; }
.hfl-cab b { font-size: 21px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hfl-cab small { font-size: 11.5px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #7fe0ff; }
.hfl-cab .hfl-sit { font-size: 14px; opacity: .9; font-variant-numeric: tabular-nums; }
.hfl-cripto { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; opacity: .72; }
.hfl-cripto svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 2.2; }
.hfl-meio { display: grid; place-items: center; align-content: center; gap: 16px; padding: 0 20px; }
.hfl-foto { position: relative; width: 156px; height: 156px; border-radius: 50%; background: #0b3a52 center / cover; display: grid; place-items: center; font-size: 52px; font-weight: 800;
  box-shadow: 0 0 0 6px rgba(0, 173, 238, .18), 0 0 0 14px rgba(0, 173, 238, .07), 0 20px 50px rgba(0, 0, 0, .5); }
.hfl.tocando .hfl-foto { animation: hflPulso 1.6s ease-out infinite; }
@keyframes hflPulso { 0% { box-shadow: 0 0 0 0 rgba(0, 173, 238, .5), 0 0 0 0 rgba(0, 173, 238, .25), 0 20px 50px rgba(0, 0, 0, .5); } 100% { box-shadow: 0 0 0 26px rgba(0, 173, 238, 0), 0 0 0 48px rgba(0, 173, 238, 0), 0 20px 50px rgba(0, 0, 0, .5); } }
.hfl.com-video .hfl-meio { visibility: hidden; }
.hfl.com-video .hfl-fundo { display: none; }
.hfl-outro { position: absolute; z-index: 3; left: 50%; top: calc(env(safe-area-inset-top, 0px) + 112px); transform: translateX(-50%); display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 999px; background: rgba(0, 0, 0, .62); backdrop-filter: blur(10px); font-size: 13px; font-weight: 700; white-space: nowrap; border: 1px solid rgba(255, 255, 255, .14); }
.hfl-outro[hidden] { display: none; }
.hfl-outro svg { width: 16px; height: 16px; fill: none; stroke: #ff6b6b; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.hfl-aviso { max-width: 320px; font-size: 13px; line-height: 1.45; text-align: center; opacity: .82; }
.hfl-rodape { padding: 0 14px calc(env(safe-area-inset-bottom, 0px) + 18px); }
.hfl-bts { display: flex; justify-content: center; align-items: flex-start; gap: 14px; flex-wrap: wrap; max-width: 420px; margin: 0 auto; padding: 18px 14px 16px; border-radius: 28px;
  background: rgba(14, 22, 28, .78); border: 1px solid rgba(255, 255, 255, .08); backdrop-filter: blur(16px); box-shadow: 0 18px 40px rgba(0, 0, 0, .4); }
.hfl-bt { display: grid; justify-items: center; gap: 7px; min-width: 64px; padding: 0; border: 0; background: none; color: #fff; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
.hfl-bt i { display: grid; place-items: center; width: 58px; height: 58px; border-radius: 50%; background: rgba(255, 255, 255, .14); font-style: normal; transition: transform .12s, background .15s; }
.hfl-bt:active i { transform: scale(.92); }
.hfl-bt.off i { background: #fff; color: #05080b; }
.hfl-bt.on i { background: #00adee; color: #fff; }
.hfl-bt.fim i { background: #e5484d; } .hfl-bt.atender i { background: #22c55e; }
.hfl-bt[hidden] { display: none; }
.hfl-bt svg { width: 25px; height: 25px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.hfl-bt.fim svg { transform: rotate(135deg); }
/* Topo sempre em 3 colunas fixas: antes, com o Minimizar escondido (páginas com [hidden]{display:none!important}),
   o nome caía na 1ª coluna de 48 px e ficava espremido à esquerda. */
.hfl-min { grid-column: 1; } .hfl-cab { grid-column: 2; }
.hfl-min[hidden] { display: grid !important; visibility: hidden; }
/* Recebendo: arrastar para atender (direita) ou recusar (esquerda), como nos celulares; tocar nas pontas também vale. */
.hfl-entrada { display: grid; gap: 18px; justify-items: center; max-width: 420px; margin: 0 auto; }
.hfl-entrada[hidden], .hfl-bts[hidden] { display: none !important; }
.hfl-rapidos { display: flex; gap: 34px; justify-content: center; }
.hfl-rapido { display: grid; justify-items: center; gap: 6px; border: 0; background: none; color: #fff; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; padding: 0; opacity: .92; }
.hfl-rapido i { width: 50px; height: 50px; border-radius: 50%; display: grid; place-items: center; background: rgba(255, 255, 255, .13); backdrop-filter: blur(10px); }
.hfl-rapido.on i { background: #fff; color: #05080b; }
.hfl-rapido svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.hfl-desliza { --p: 0; position: relative; width: min(340px, calc(100vw - 32px)); height: 78px; border-radius: 999px; touch-action: none; user-select: none; -webkit-user-select: none;
  background: linear-gradient(90deg, rgba(229, 72, 77, calc(.15 + max(0, -1 * var(--p)) * .7)), rgba(255, 255, 255, .08) 50%, rgba(34, 197, 94, calc(.15 + max(0, var(--p)) * .7)));
  border: 1px solid rgba(255, 255, 255, .14); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); box-shadow: 0 16px 40px rgba(0, 0, 0, .4); }
.hfl-desliza .hfl-bt { position: absolute; top: 7px; min-width: 0; gap: 0; }
.hfl-desliza .hfl-bt i { width: 62px; height: 62px; }
.hfl-desliza .hfl-bt span { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.hfl-desliza .hfl-bt.fim { left: 7px; } .hfl-desliza .hfl-bt.atender { right: 7px; }
.hfl-ds-dica { position: absolute; top: 50%; transform: translateY(-50%); font-size: 12.5px; font-weight: 700; color: rgba(255, 255, 255, .75); display: flex; align-items: center; gap: 2px; pointer-events: none; transition: opacity .15s; }
.hfl-ds-dica.esq { left: 74px; } .hfl-ds-dica.dir { right: 74px; }
.hfl-ds-dica svg:nth-child(2) { animation-delay: .15s; } .hfl-ds-dica svg:nth-child(3) { animation-delay: .3s; }
.hfl-ds-dica.esq svg:nth-child(1) { animation-delay: .3s; } .hfl-ds-dica.esq svg:nth-child(3) { animation-delay: 0s; }
.hfl-ds-dica svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; animation: hflSeta 1.4s ease-in-out infinite; }
.hfl-ds-dica.esq svg { animation-name: hflSetaE; }
@keyframes hflSeta { 0%, 100% { transform: translateX(0); opacity: .4; } 50% { transform: translateX(4px); opacity: 1; } }
@keyframes hflSetaE { 0%, 100% { transform: translateX(0); opacity: .4; } 50% { transform: translateX(-4px); opacity: 1; } }
.hfl-ds-bola { position: absolute; left: 50%; top: 7px; width: 62px; height: 62px; margin-left: -31px; border-radius: 50%; display: grid; place-items: center; cursor: grab;
  background: #fff; color: #0a8fd0; box-shadow: 0 8px 22px rgba(0, 0, 0, .35); transform: translateX(var(--x, 0px)); touch-action: none; }
.hfl-ds-bola.volta { transition: transform .28s cubic-bezier(.3, 1.5, .5, 1); }
.hfl-ds-bola svg { width: 28px; height: 28px; fill: none; stroke: currentColor; stroke-width: 2.1; stroke-linecap: round; stroke-linejoin: round; }
.hfl.tocando .hfl-ds-bola:not(.mexendo) svg { animation: hflTreme 1.6s ease-in-out infinite; }
@keyframes hflTreme { 0%, 60%, 100% { transform: rotate(0); } 65% { transform: rotate(-14deg); } 70% { transform: rotate(14deg); } 75% { transform: rotate(-10deg); } 80% { transform: rotate(10deg); } 85% { transform: rotate(0); } }
.hfl-ds-bola.p-ok { color: #16a34a; } .hfl-ds-bola.p-fim { color: #e5484d; }
.hfl-ds-bola.p-fim svg { transform: rotate(135deg); }
.hfl-ds-ajuda { width: min(340px, calc(100vw - 32px)); display: grid; grid-template-columns: 76px 1fr 76px; align-items: center; margin-top: -8px; font-size: 12px; text-align: center; }
.hfl-ds-ajuda span { opacity: .6; } .hfl-ds-ajuda .fim, .hfl-ds-ajuda .ok { opacity: 1; font-weight: 800; font-size: 12.5px; }
.hfl-ds-ajuda .fim { color: #ff8a8d; } .hfl-ds-ajuda .ok { color: #6ee7a0; }
/* Respostas rápidas (recusar e mandar uma mensagem) */
.hfl-msgs { position: absolute; z-index: 5; left: 0; right: 0; bottom: 0; padding: 10px 14px calc(env(safe-area-inset-bottom, 0px) + 16px); border-radius: 24px 24px 0 0;
  background: rgba(14, 22, 28, .97); border-top: 1px solid rgba(255, 255, 255, .1); box-shadow: 0 -18px 40px rgba(0, 0, 0, .45); animation: hflSobe .2s ease-out; }
@keyframes hflSobe { from { transform: translateY(30px); opacity: 0; } }
.hfl-msgs h3 { margin: 6px 4px 10px; font-size: 15px; }
.hfl-msgs button { display: block; width: 100%; text-align: left; padding: 14px 14px; margin: 0 0 6px; border: 0; border-radius: 14px; background: rgba(255, 255, 255, .07); color: #fff; font: inherit; font-size: 14.5px; cursor: pointer; }
.hfl-msgs button:active { background: rgba(255, 255, 255, .14); }
.hfl-msgs .cancelar { text-align: center; background: none; color: #7fe0ff; font-weight: 700; }
.hfl.recebendo .hfl-aviso { display: none; }
@media (prefers-reduced-motion: reduce) { .hfl.tocando .hfl-foto { animation: none; } .hfl-ds-dica svg, .hfl.tocando .hfl-ds-bola svg { animation: none !important; } }`;
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
  minimizar: '<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>',
  cadeado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
  msg: '<path d="M4 5.5h16v10H9l-5 4z"/>',
  sino: '<path d="M6 16.5V11a6 6 0 0112 0v5.5l1.5 1.5h-15zM10 20a2 2 0 004 0"/>',
  sinoOff: '<path d="M3 3l18 18M8.5 5.6A6 6 0 0118 11v4M6 11v5.5L4.5 18H17M10 20a2 2 0 004 0"/>',
  seta: '<path d="M9 6l6 6-6 6"/>', setaE: '<path d="M15 6l-6 6 6 6"/>'
};
const svg = (nome) => `<svg viewBox="0 0 24 24" aria-hidden="true">${SVG[nome]}</svg>`;
function botao(cls, icone, rotulo, fn) {
  const b = el("button", "hfl-bt " + cls); b.type = "button"; b.setAttribute("aria-label", rotulo);
  const i = el("i"); i.innerHTML = svg(icone); b.append(i, el("span", null, rotulo));
  b.addEventListener("click", fn); return b;
}
function trocarBotao(b, icone, rotulo) { b.querySelector("i").innerHTML = svg(icone); b.lastChild.textContent = rotulo; b.setAttribute("aria-label", rotulo); }
const iniciais = (n) => String(n || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0] || "").join("").toUpperCase();
const relogio = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600); const mm = String(Math.floor(s / 60) % 60).padStart(2, "0"), ss = String(s % 60).padStart(2, "0"); return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`; };

// Tela da chamada (a mesma para quem liga e para quem recebe).
function montarTela({ nome, foto, tipo, recebendo }) {
  css();
  foto = fotoSegura(foto);
  const t = el("div", "hfl tocando"); t.setAttribute("role", "dialog"); t.setAttribute("aria-modal", "true"); t.setAttribute("aria-label", `Chamada com ${nome}`);
  t.dataset.semVoltar = "1";
  const fundo = el("div", "hfl-fundo"); if (foto) fundo.style.setProperty("--foto", `url("${foto}")`);
  const remoto = el("video", "hfl-remoto"); remoto.autoplay = true; remoto.playsInline = true; remoto.muted = true; remoto.hidden = true; // o som vai pelo <audio>
  const somRemoto = el("audio"); somRemoto.autoplay = true;
  const local = el("video", "hfl-local"); local.autoplay = true; local.playsInline = true; local.muted = true; local.hidden = true; // aparece com a câmera ligada
  const topo = el("div", "hfl-topo");
  const bMin = el("button", "hfl-min"); bMin.type = "button"; bMin.innerHTML = svg("minimizar"); bMin.setAttribute("aria-label", "Minimizar a ligação"); bMin.title = "Minimizar"; bMin.hidden = true;
  const cab = el("div", "hfl-cab");
  const rotTipo = el("small", null, tipo === "video" ? "Chamada de vídeo" : "Chamada de voz");
  const nomeEl = el("b", null, nome);
  const situacao = el("span", "hfl-sit", recebendo ? "Chamando você…" : "Chamando…");
  const cripto = el("span", "hfl-cripto"); cripto.innerHTML = svg("cadeado"); cripto.append("Criptografada de aparelho a aparelho");
  cab.append(rotTipo, nomeEl, situacao, cripto);
  topo.append(bMin, cab, el("span"));
  const outro = el("div", "hfl-outro"); outro.hidden = true; outro.setAttribute("role", "status");
  const meio = el("div", "hfl-meio"); const ft = el("div", "hfl-foto");
  if (foto) ft.style.backgroundImage = `url("${foto}")`; else ft.textContent = iniciais(nome);
  const aviso = el("p", "hfl-aviso", "Ligação pelo Help Floripa: nada é gravado. Não passe senhas nem códigos por ligação.");
  meio.append(ft, aviso);
  const rodape = el("div", "hfl-rodape"); const bts = el("div", "hfl-bts"); rodape.appendChild(bts);
  if (recebendo) t.classList.add("recebendo");
  t.append(fundo, remoto, somRemoto, local, topo, outro, meio, rodape);
  document.body.appendChild(t);
  return { t, remoto, somRemoto, local, situacao, bts, aviso, outro, bMin, nome, foto, ft, nomeEl, fundo, rodape };
}

// Tela de quem RECEBE: Mensagem · Silenciar o toque em cima e, embaixo, a bola para arrastar: direita atende,
// esquerda recusa (passou de 62% do caminho = vale; menos que isso a bola volta). As pontas também são botões
// (tocar nelas atende/recusa), para quem usa leitor de tela ou mouse.
function montarEntrada(tela, { video, aoAtender, aoRecusar, aoMensagem, aoSilenciar }) {
  const caixa = el("div", "hfl-entrada");
  const rapidos = el("div", "hfl-rapidos");
  const rapido = (icone, rotulo, fn) => { const b = el("button", "hfl-rapido"); b.type = "button"; b.setAttribute("aria-label", rotulo); const i = el("i"); i.innerHTML = svg(icone); b.append(i, el("span", null, rotulo)); b.addEventListener("click", () => fn(b)); return b; };
  const bMsg = rapido("msg", "Mensagem", () => aoMensagem());
  const bSil = rapido("sinoOff", "Silenciar", (b) => { aoSilenciar(); b.classList.add("on"); b.lastChild.textContent = "Silenciado"; b.disabled = true; });
  rapidos.append(bMsg, bSil);
  const trilho = el("div", "hfl-desliza"); trilho.setAttribute("role", "group"); trilho.setAttribute("aria-label", "Arraste para a direita para atender ou para a esquerda para recusar");
  const bFim = botao("fim", "tel", "Recusar", () => aoRecusar());
  const bOk = botao("atender", video ? "cam" : "tel", "Atender", () => aoAtender());
  const dE = el("span", "hfl-ds-dica esq"); dE.innerHTML = svg("setaE") + svg("setaE") + svg("setaE");
  const dD = el("span", "hfl-ds-dica dir"); dD.innerHTML = svg("seta") + svg("seta") + svg("seta");
  const bola = el("div", "hfl-ds-bola"); bola.innerHTML = svg(video ? "cam" : "tel"); bola.setAttribute("aria-hidden", "true");
  trilho.append(bFim, dE, bola, dD, bOk);
  const ajuda = el("div", "hfl-ds-ajuda"); ajuda.append(el("span", "fim", "Recusar"), el("span", null, "Arraste para o lado"), el("span", "ok", "Atender"));
  caixa.append(rapidos, trilho, ajuda);
  tela.rodape.insertBefore(caixa, tela.bts); tela.bts.hidden = true;
  // Arrastar a bola
  let arr = null, feito = false;
  const max = () => trilho.clientWidth / 2 - 38;
  const pos = (x) => { bola.style.setProperty("--x", x + "px"); const p = Math.max(-1, Math.min(1, x / max())); trilho.style.setProperty("--p", p.toFixed(3));
    bola.classList.toggle("p-ok", p > .25); bola.classList.toggle("p-fim", p < -.25); dE.style.opacity = dD.style.opacity = String(1 - Math.min(1, Math.abs(p) * 2)); };
  bola.addEventListener("pointerdown", (e) => { if (feito) return; arr = { x0: e.clientX, id: e.pointerId }; bola.classList.remove("volta"); bola.classList.add("mexendo"); try { bola.setPointerCapture(e.pointerId); } catch {} });
  bola.addEventListener("pointermove", (e) => { if (!arr || e.pointerId !== arr.id) return; pos(Math.max(-max(), Math.min(max(), e.clientX - arr.x0))); });
  const soltar = (e) => {
    if (!arr || e.pointerId !== arr.id) return;
    const x = Math.max(-max(), Math.min(max(), e.clientX - arr.x0)); arr = null; bola.classList.remove("mexendo");
    const p = x / max();
    if (Math.abs(p) >= .62) { feito = true; pos(p > 0 ? max() : -max()); try { navigator.vibrate?.(20); } catch {} (p > 0 ? aoAtender : aoRecusar)(); return; }
    bola.classList.add("volta"); pos(0);
  };
  bola.addEventListener("pointerup", soltar); bola.addEventListener("pointercancel", soltar);
  return {
    // Atendeu: some a entrada e aparecem os controles da ligação (no mesmo cartão de quem ligou).
    fechar() { caixa.remove(); tela.bts.hidden = false; },
    travar() { feito = true; trilho.style.pointerEvents = "none"; bMsg.disabled = true; }
  };
}

// Recusar com uma mensagem pronta (vai para a conversa, como nos celulares). Só nas conversas do site.
const RESPOSTAS = ["Não posso falar agora. Te ligo daqui a pouco.", "Agora não consigo atender. Pode mandar mensagem?", "Estou dirigindo, já te retorno.", "Estou numa reunião, falo com você depois."];
function escolherResposta(tela) {
  return new Promise((ok) => {
    const f = el("div", "hfl-msgs"); f.setAttribute("role", "dialog"); f.setAttribute("aria-label", "Recusar com uma mensagem");
    f.appendChild(el("h3", null, "Recusar com uma mensagem"));
    const sair = (v) => { f.remove(); ok(v); };
    RESPOSTAS.forEach((r) => { const b = el("button", null, r); b.type = "button"; b.addEventListener("click", () => sair(r)); f.appendChild(b); });
    const c = el("button", "cancelar", "Voltar"); c.type = "button"; c.addEventListener("click", () => sair(null)); f.appendChild(c);
    tela.t.appendChild(f);
  });
}
async function mandarResposta(conv, eu, texto) {
  const fb = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  const { comRitmo } = await import("./ritmo.js?v=3");
  const f = { ...fb, db: db() };
  const ref = doc(db(), "conversas", conv);
  await comRitmo(f, eu, "msg", (lote) => lote.set(doc(collection(db(), "conversas", conv, "mensagens")), { remetenteId: eu, texto, criadoEm: serverTimestamp() }));
  setDoc(ref, { ultimaMensagem: texto.slice(0, 120), ultimaMensagemRemetenteId: eu, atualizadoEm: serverTimestamp(), vistoEm: { [eu]: serverTimestamp() }, falaram: { [eu]: true } }, { merge: true }).catch(() => {});
}

// Junta os caminhos (ICE) no próprio SDP antes de mandar, por até "ms": assim a outra ponta recebe os caminhos JUNTO com a
// oferta/resposta, mesmo que a escuta dos candidatos falhe ou o outro aparelho esteja com uma versão antiga do site
// (09/11/2026: quem ligava com o app aberto há horas ficava preso em "Conectando…" quando a outra pessoa atendia).
// Os caminhos continuam indo também um a um pela subcoleção (os que chegam depois).
function esperarCaminhos(pc, ms) {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((ok) => {
    const t = setTimeout(fim, ms);
    function fim() { clearTimeout(t); pc.removeEventListener("icegatheringstatechange", ver); ok(); }
    function ver() { if (pc.iceGatheringState === "complete") fim(); }
    pc.addEventListener("icegatheringstatechange", ver);
  });
}
const sdpDe = (pc, d) => { const l = pc.localDescription; return l?.sdp && l.sdp.length <= 30000 ? { type: l.type, sdp: l.sdp } : { type: d.type, sdp: d.sdp }; };

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
// Câmera: 720p a 30 quadros e foco/exposição/balanço de branco automáticos e contínuos onde o aparelho deixa (antes a
// câmera ficava com o foco travado em alguns Android e a imagem "não focava").
const VIDEO = (frente) => ({ facingMode: frente ? "user" : "environment", width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } });
async function ajustarCamera(track) {
  try {
    const c = track?.getCapabilities?.() || {}, adv = {};
    if (c.focusMode?.includes("continuous")) adv.focusMode = "continuous";
    if (c.exposureMode?.includes("continuous")) adv.exposureMode = "continuous";
    if (c.whiteBalanceMode?.includes("continuous")) adv.whiteBalanceMode = "continuous";
    if (Object.keys(adv).length) await track.applyConstraints({ advanced: [adv] });
  } catch {}
}
const pedirMidia = async (tipo, frente = true) => {
  const m = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: tipo === "video" ? VIDEO(frente) : false });
  m.getVideoTracks().forEach(ajustarCamera);
  return m;
};

// ---------- motor comum (os dois lados) ----------
// ctx: a chamada (tela, tipo, estado do outro lado). quemLiga: cria a oferta.
function iniciarConexao(ref, eu, ctx, midia, turn = [], quemLiga = false) {
  const tela = ctx.tela, tipo = ctx.tipo;
  const pc = new RTCPeerConnection({ iceServers: [...ICE.stun, ...ICE.turn, ...turn] });
  midia.getTracks().forEach((tr) => pc.addTrack(tr, midia));
  // Ligação de voz já nasce com um lugar para vídeo (sem câmera): assim dá para ligar a câmera no meio da ligação sem
  // renegociar pelo banco (replaceTrack). Quem atende abre o mesmo lugar nos dois sentidos (veja receber).
  if (tipo !== "video" && quemLiga) pc.addTransceiver("video", { direction: "sendrecv" });
  // Canal direto entre os aparelhos (não passa pelo banco): avisa quando um silencia o microfone ou liga/desliga a câmera.
  // "negotiated" com o mesmo id dos dois lados (um aparelho antigo sem o canal só não recebe os avisos).
  try {
    const canal = pc.createDataChannel("hf", { negotiated: true, id: 0 });
    canal.onopen = () => ctx.enviarEstado?.();
    canal.onmessage = (ev) => { try { const d = JSON.parse(ev.data); if (d?.t === "estado") { ctx.outro = { mic: d.mic !== false, cam: !!d.cam }; pintarOutro(ctx); } } catch {} };
    ctx.canal = canal;
  } catch {}
  if (tipo === "video") { tela.local.srcObject = midia; tela.local.hidden = false; }
  const remota = new MediaStream();
  ctx.remota = remota;
  // O som do outro lado vai SEMPRE pelo <audio> (o vídeo fica mudo): antes, na chamada de vídeo, o som ia pelo <video>
  // e ligar a câmera numa ligação de voz tocaria o som duas vezes. Alguns navegadores mandam a trilha sem a "stream".
  pc.ontrack = (ev) => {
    (ev.streams[0]?.getTracks() || [ev.track]).forEach((tr) => { if (tr && !remota.getTracks().includes(tr)) remota.addTrack(tr); });
    if (tela.somRemoto.srcObject !== remota) tela.somRemoto.srcObject = remota;
    tela.somRemoto.play?.().catch(() => {}); // o autoplay sozinho falha no iPhone quando a trilha chega depois
    if (ev.track.kind === "video") {
      if (tela.remoto.srcObject !== remota) tela.remoto.srcObject = remota;
      ev.track.onunmute = () => pintarOutro(ctx);
      ev.track.onmute = () => pintarOutro(ctx);
      pintarOutro(ctx);
    }
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
  return { pc, liberarFila, remotaPronta, ouvirCandidatos, pararCand: () => { parado = true; pararCand(); }, diag, remota };
}

// O que a outra pessoa está fazendo: vídeo dela na tela quando a câmera está ligada (e chegando imagem), foto quando
// está desligada, e o aviso "Fulano silenciou o microfone" / "desligou a câmera".
function pintarOutro(ctx) {
  const tela = ctx.tela; if (!tela) return;
  const o = ctx.outro || {};
  const vid = ctx.remota?.getVideoTracks()[0];
  const camOutro = o.cam !== undefined ? o.cam : ctx.tipo === "video";
  const mostra = !!vid && camOutro && !vid.muted && ctx.conectado !== false;
  tela.remoto.hidden = !mostra;
  tela.t.classList.toggle("com-video", mostra);
  if (mostra) tela.remoto.play?.().catch(() => {});
  const primeiro = String(tela.nome || "").split(" ")[0] || "A pessoa";
  const avisos = [];
  if (o.mic === false) avisos.push(`${primeiro} silenciou o microfone`);
  else if (ctx.tipo === "video" && o.cam === false) avisos.push(`${primeiro} desligou a câmera`);
  tela.outro.hidden = !avisos.length;
  tela.outro.innerHTML = avisos.length ? svg(o.mic === false ? "micOff" : "camOff") : "";
  if (avisos.length) tela.outro.append(avisos[0]);
  ctx.mini?.video(mostra ? ctx.remota : null);
}

// Controles durante a chamada: Câmera · Silenciar · Virar (com a câmera ligada) · Encerrar, e Minimizar no topo.
// O estado (microfone e câmera) vai para o outro lado pelo canal direto.
function controles(ctx, encerrar) {
  const tela = ctx.tela, pc = ctx.conexao.pc, midiaRef = ctx.midia;
  tela.bts.replaceChildren();
  const micLigado = () => midiaRef.m.getAudioTracks()[0]?.enabled !== false;
  const camLigada = () => { const v = midiaRef.m.getVideoTracks()[0]; return !!v && v.readyState === "live" && v.enabled; };
  ctx.enviarEstado = () => { try { if (ctx.canal?.readyState === "open") ctx.canal.send(JSON.stringify({ t: "estado", mic: micLigado(), cam: camLigada() })); } catch {} };
  const senderVideo = () => pc.getTransceivers().find((t) => t.receiver?.track?.kind === "video" && t.sender && !t.stopped)?.sender
    || pc.getSenders().find((s) => s.track?.kind === "video");
  let frente = true, ocupadoCam = false;
  const pintar = () => {
    const m = micLigado(), c = camLigada();
    mic.classList.toggle("off", !m); trocarBotao(mic, m ? "mic" : "micOff", m ? "Silenciar" : "Mudo");
    cam.classList.toggle("on", c); trocarBotao(cam, c ? "cam" : "camOff", c ? "Câmera" : "Câmera");
    cam.setAttribute("aria-label", c ? "Desligar a câmera" : "Ligar a câmera"); cam.setAttribute("aria-pressed", c ? "true" : "false");
    virar.hidden = !c;
    tela.local.hidden = !c; tela.local.style.opacity = "1";
    ctx.mini?.mic(!m);
  };
  ctx.alternarMic = () => { const tr = midiaRef.m.getAudioTracks()[0]; if (!tr) return; tr.enabled = !tr.enabled; pintar(); ctx.enviarEstado(); };
  const mic = botao("", "mic", "Silenciar", () => ctx.alternarMic());
  // Câmera: na chamada de vídeo liga/desliga a imagem; na ligação de voz pede a câmera e passa a mandar vídeo.
  const cam = botao("", "camOff", "Câmera", async () => {
    if (ocupadoCam) return; ocupadoCam = true;
    try {
      const v = midiaRef.m.getVideoTracks()[0];
      if (v && v.readyState === "live") {
        if (ctx.tipo === "video") v.enabled = !v.enabled;
        else { v.stop(); midiaRef.m.removeTrack(v); await senderVideo()?.replaceTrack(null); }
      } else {
        const nv = (await navigator.mediaDevices.getUserMedia({ video: VIDEO(frente) })).getVideoTracks()[0];
        await ajustarCamera(nv);
        const sd = senderVideo();
        if (!sd) { nv.stop(); throw new Error("sem-video"); }
        await sd.replaceTrack(nv);
        midiaRef.m.addTrack(nv);
        tela.local.srcObject = midiaRef.m; tela.local.style.transform = frente ? "scaleX(-1)" : "none";
      }
    } catch (e) {
      tela.situacao.dataset.aviso = e?.message === "sem-video" ? "A outra pessoa está com uma versão antiga do site" : "Não foi possível ligar a câmera";
      setTimeout(() => delete tela.situacao.dataset.aviso, 2600);
    } finally { ocupadoCam = false; pintar(); ctx.enviarEstado(); }
  });
  // Virar: o celular não abre as duas câmeras ao mesmo tempo, então a de agora para ANTES de pedir a outra. Só a câmera
  // é pedida de novo (o microfone continua o mesmo).
  let virando = false;
  const virar = botao("", "virar", "Virar", async () => {
    if (virando) return; virando = true;
    const velha = midiaRef.m.getVideoTracks()[0], ligada = velha ? velha.enabled : true;
    const sender = senderVideo();
    const trocar = async (paraFrente) => {
      const nv = (await navigator.mediaDevices.getUserMedia({ video: VIDEO(paraFrente) })).getVideoTracks()[0];
      await ajustarCamera(nv);
      nv.enabled = ligada;
      await sender?.replaceTrack(nv);
      midiaRef.m.getVideoTracks().forEach((t) => midiaRef.m.removeTrack(t)); midiaRef.m.addTrack(nv);
      tela.local.srcObject = midiaRef.m; tela.local.style.transform = paraFrente ? "scaleX(-1)" : "none";
    };
    try { velha?.stop(); await trocar(!frente); frente = !frente; }
    catch { try { await trocar(frente); } catch {} tela.situacao.dataset.aviso = "Não foi possível trocar de câmera"; setTimeout(() => delete tela.situacao.dataset.aviso, 2500); }
    finally { virando = false; pintar(); }
  });
  tela.bts.append(cam, mic, virar, botao("fim", "tel", "Encerrar", () => encerrar("encerrada")));
  tela.bMin.hidden = false;
  tela.bMin.onclick = () => minimizar(ctx);
  pintar();
}

// ---------- minimizar (usar o site durante a ligação) ----------
// Fora da rede: pílula na própria página (a tela da ligação some e a página volta). Na rede (rede.html): a pílula é
// desenhada pela casca na página de cima, por cima de todas as abas, e o quadro da ligação desce (porCima).
function minimizar(ctx) {
  if (ctx.mini || !ctx.tela) return;
  const tela = ctx.tela;
  const dados = {
    nome: tela.nome, foto: tela.foto, mudo: ctx.midia?.m?.getAudioTracks()[0]?.enabled === false,
    aoAbrir: () => expandir(ctx), aoMic: () => ctx.alternarMic?.(), aoEncerrar: () => ctx.encerrarJa?.()
  };
  let mini = null;
  try { mini = casca()?.chamadaMini?.(dados) || null; } catch {}
  ctx.mini = mini || criarMini(document, dados);
  tela.t.classList.add("minimizada");
  if (ctx.subiu) { ctx.subiu = false; porCima(false); }
  const texto = () => ctx.mini?.atualizar(tela.situacao.dataset.aviso || tela.situacao.textContent);
  ctx.miniObs = new MutationObserver(texto); ctx.miniObs.observe(tela.situacao, { childList: true, characterData: true, subtree: true });
  texto(); pintarOutro(ctx);
}
function expandir(ctx) {
  ctx.miniObs?.disconnect(); ctx.miniObs = null;
  ctx.mini?.fechar(); ctx.mini = null;
  ctx.tela?.t.classList.remove("minimizada");
  // Na rede o quadro da ligação pode estar atrás de outra aba: sobe por cima de novo.
  if (casca() && !ctx.subiu) { porCima(true); ctx.subiu = true; }
}
// Saindo da página com a ligação em andamento, o navegador pergunta antes (sair encerra a ligação).
function avisoSaida(e) { if (atual?.conectado) { e.preventDefault(); e.returnValue = ""; } }

function finalizarLocal(ctx) {
  ctx.pararCampainha?.(); clearTimeout(ctx.timeout); clearInterval(ctx.cronometro); ctx.pararVigia?.();
  ctx.miniObs?.disconnect(); ctx.mini?.fechar(); ctx.mini = null; removeEventListener("beforeunload", avisoSaida);
  try { ctx.canal?.close(); } catch {}
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
  addEventListener("beforeunload", avisoSaida);
  ctx.enviarEstado?.(); pintarOutro(ctx);
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
    ctx.conexao = iniciarConexao(ctx.ref, eu, ctx, ctx.midia.m, turn, true);
    const { pc } = ctx.conexao;
    controles(ctx, (s) => encerrar(ctx.conectado ? s : "cancelada"));
    ctx.pararCampainha = campainha(false);
    try {
      const oferta = await pc.createOffer(); await pc.setLocalDescription(oferta);
      await esperarCaminhos(pc, 1500);
      if (fim) return;
      await setDoc(ctx.ref, { de: eu, para, conv, tipo, status: "chamando", oferta: sdpDe(pc, oferta), criadoEm: serverTimestamp() });
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
    ctx.tela.nomeEl.textContent = q.nome; ctx.tela.nome = q.nome; ctx.tela.t.setAttribute("aria-label", `Chamada com ${q.nome}`);
    if (q.foto) ctx.tela.foto = q.foto;
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
  let atendendo = false, entrada = null;
  const atender = async () => {
    if (atendendo || fim) return; atendendo = true;
    entrada.travar(); entrada.fechar(); ctx.tela.t.classList.remove("recebendo");
    ctx.pararCampainha(); ctx.tela.t.classList.remove("tocando"); ctx.tela.situacao.textContent = "Conectando…";
    let m;
    try { m = await pedirMidia(ctx.tipo); }
    catch (e) { if (fim) return; ctx.tela.aviso.textContent = erroMidia(e, ctx.tipo); setTimeout(() => encerrar("recusada"), 2500); return; }
    // Quem ligou desistiu enquanto o celular pedia o microfone: antes o microfone ficava ligado sem chamada nenhuma.
    if (fim) { m.getTracks().forEach((t) => t.stop()); return; }
    ctx.midia = { m };
    const turn = await turnRecebida;
    if (fim) { m.getTracks().forEach((t) => t.stop()); return; }
    ctx.conexao = iniciarConexao(ref, eu, ctx, ctx.midia.m, turn, false);
    ctx.conexao.ouvirCandidatos();
    const { pc } = ctx.conexao;
    clearTimeout(ctx.timeout);
    vigiar(ctx, pc, encerrar);
    try {
      await pc.setRemoteDescription(d.oferta); ctx.conexao.remotaPronta();
      // O lugar de vídeo da ligação de voz também manda daqui (para ligar a câmera depois sem renegociar).
      pc.getTransceivers().forEach((t) => { if (t.receiver?.track?.kind === "video" && !t.sender.track && t.direction === "recvonly") t.direction = "sendrecv"; });
      const resp = await pc.createAnswer(); await pc.setLocalDescription(resp);
      await esperarCaminhos(pc, 2500);
      if (fim) return;
      await updateDoc(ref, { status: "aceita", resposta: sdpDe(pc, resp), aceitaEm: serverTimestamp() });
      ctx.conexao.liberarFila();
    } catch (e) {
      if (fim) return;
      console.warn("[Chamada] atender", e?.code || e);
      ctx.tela.situacao.textContent = e?.code === "permission-denied" ? "A chamada já terminou" : "Não foi possível atender";
      setTimeout(() => encerrar("encerrada", e?.code !== "permission-denied"), 1500); return;
    }
    controles(ctx, encerrar);
  };
  entrada = montarEntrada(ctx.tela, {
    video: ctx.tipo === "video",
    aoAtender: atender,
    aoRecusar: () => { entrada.travar(); encerrar("recusada"); },
    aoSilenciar: () => ctx.pararCampainha?.(),
    aoMensagem: async () => {
      ctx.pararCampainha?.();
      const texto = await escolherResposta(ctx.tela);
      if (!texto || fim || atendendo) return;
      entrada.travar(); ctx.tela.situacao.textContent = "Recusada · mensagem enviada";
      mandarResposta(d.conv, eu, texto).catch((e) => console.warn("[Chamada] resposta rápida", e?.code || e));
      setTimeout(() => encerrar("recusada"), 900);
    }
  });
  ctx.timeout = setTimeout(() => { if (!ctx.conectado && !ctx.conexao) encerrar("perdida", false); }, Math.max(3000, TOCANDO_MS - (Date.now() - (d.criadoEm?.toMillis?.() ?? Date.now()))));
  ctx.pararDoc = onSnapshot(ref, (s) => {
    const x = s.data(); if (!x) return;
    if (["cancelada", "perdida"].includes(x.status) || (x.status === "encerrada" && x.encerradaPor !== eu)) encerrar(x.status, false);
    // Atendida ou recusada em OUTRO aparelho da mesma conta (celular e computador tocam juntos): este para de tocar.
    else if (!ctx.conexao && (x.status === "aceita" || (x.status === "recusada" && x.encerradaPor === eu))) {
      ctx.pararCampainha?.(); ctx.tela.situacao.textContent = x.status === "aceita" ? "Atendida em outro aparelho" : "Recusada";
      entrada?.travar(); setTimeout(() => encerrar(x.status, false), 1500);
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
