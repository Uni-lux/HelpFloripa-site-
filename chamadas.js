// =====================================================
// Ligações de voz e de vídeo (1 a 1) entre quem já conversa no chat — WebRTC, sem dependência do rede.js.
// O áudio e o vídeo vão direto de um aparelho para o outro; o Firestore só faz a "campainha" (sinalização):
//   chamadas/{id} {de, para, conv, tipo audio|video, status chamando|aceita|recusada|encerrada|perdida|cancelada,
//                  oferta {type, sdp}, resposta {type, sdp}, criadoEm, aceitaEm, fimEm, encerradaPor}
//   chamadas/{id}/candidatos/{auto} {de, c {candidate, sdpMid, sdpMLineIndex}, em}
// Quem liga cria a chamada com a oferta; quem recebe vê a tela de chamada (em qualquer página do site, ouvirChamadas
// é ligado pelo firebase.js) e responde. Nada é gravado: o registro guarda só quem, quando e quanto durou.
// Redes que não deixam a conexão direta (alguns 4G e redes de empresa) precisam de um servidor TURN: pôr em ICE.turn.
// =====================================================
import { collection, doc, setDoc, updateDoc, getDoc, onSnapshot, addDoc, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Servidores que ajudam os aparelhos a se acharem (grátis). TURN (repasse) fica vazio até ter um serviço contratado.
export const ICE = {
  stun: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun.cloudflare.com:3478"] }],
  turn: []
};
const TOCANDO_MS = 45000; // sem atender em 45 s = chamada perdida
const db = () => window.firebaseDb, auth = () => window.firebaseAuth;
let atual = null; // a chamada em andamento (uma por vez)

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
  const tocar = () => {
    if (recebendo && navigator.vibrate) navigator.vibrate([400, 200, 400]);
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
  return () => { clearInterval(timer); try { navigator.vibrate?.(0); } catch {} try { ctx?.close(); } catch {} };
}

function erroMidia(e, tipo) {
  if (e?.name === "NotAllowedError") return tipo === "video" ? "Libere a câmera e o microfone para fazer a chamada de vídeo." : "Libere o microfone para fazer a ligação.";
  if (e?.name === "NotFoundError") return tipo === "video" ? "Não encontramos câmera ou microfone neste aparelho." : "Não encontramos microfone neste aparelho.";
  return "Não foi possível usar o microfone/câmera agora.";
}
const pedirMidia = (tipo, frente = true) => navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: tipo === "video" ? { facingMode: frente ? "user" : "environment", width: { ideal: 1280 }, height: { ideal: 720 } } : false });

// ---------- motor comum (os dois lados) ----------
function iniciarConexao(ref, eu, tela, tipo, midia) {
  const pc = new RTCPeerConnection({ iceServers: [...ICE.stun, ...ICE.turn] });
  midia.getTracks().forEach((tr) => pc.addTrack(tr, midia));
  if (tipo === "video") { tela.local.srcObject = midia; tela.local.hidden = false; }
  const remota = new MediaStream();
  pc.ontrack = (ev) => {
    ev.streams[0]?.getTracks().forEach((tr) => { if (!remota.getTracks().includes(tr)) remota.addTrack(tr); });
    if (tipo === "video") { tela.remoto.srcObject = remota; tela.remoto.hidden = false; tela.t.classList.add("com-video"); }
    else tela.somRemoto.srcObject = remota;
  };
  // Candidatos: os meus vão para a subcoleção; os do outro lado entram na conexão.
  const fila = []; let pronto = false;
  pc.onicecandidate = (ev) => {
    if (!ev.candidate) return;
    const c = ev.candidate.toJSON(); const dados = { de: eu, c: { candidate: c.candidate, sdpMid: c.sdpMid ?? null, sdpMLineIndex: c.sdpMLineIndex ?? null }, em: serverTimestamp() };
    if (pronto) addDoc(collection(ref, "candidatos"), dados).catch(() => {}); else fila.push(dados);
  };
  const liberarFila = () => { pronto = true; fila.splice(0).forEach((d) => addDoc(collection(ref, "candidatos"), d).catch(() => {})); };
  const pendentes = []; let temRemota = false;
  const pararCand = onSnapshot(collection(ref, "candidatos"), (s) => s.docChanges().forEach((ch) => {
    if (ch.type !== "added") return; const d = ch.doc.data(); if (d.de === eu || !d.c) return;
    if (temRemota) pc.addIceCandidate(d.c).catch(() => {}); else pendentes.push(d.c);
  }), () => {});
  const remotaPronta = () => { temRemota = true; pendentes.splice(0).forEach((c) => pc.addIceCandidate(c).catch(() => {})); };
  return { pc, liberarFila, remotaPronta, pararCand };
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
    const virar = botao("", "virar", "Virar", async () => {
      try {
        const nova = await pedirMidia("video", !frente); frente = !frente;
        const nv = nova.getVideoTracks()[0]; const velha = midiaRef.m.getVideoTracks()[0];
        await pc.getSenders().find((s) => s.track?.kind === "video")?.replaceTrack(nv);
        velha?.stop(); midiaRef.m.removeTrack(velha); midiaRef.m.addTrack(nv); nova.getAudioTracks().forEach((t) => t.stop());
        tela.local.srcObject = midiaRef.m; tela.local.style.transform = frente ? "scaleX(-1)" : "none";
      } catch {}
    });
    tela.bts.append(cam, virar);
  }
  tela.bts.appendChild(botao("fim", "tel", "Encerrar", () => encerrar("encerrada")));
}

function finalizarLocal(ctx) {
  ctx.pararCampainha?.(); clearTimeout(ctx.timeout); clearInterval(ctx.cronometro);
  ctx.pararDoc?.(); ctx.conexao?.pararCand?.();
  try { ctx.conexao?.pc.close(); } catch {}
  ctx.midia?.m?.getTracks().forEach((t) => t.stop());
  ctx.tela?.t.remove();
  if (atual === ctx) atual = null;
}

// Quando conecta: some a campainha, começa o cronômetro.
function conectou(ctx, inicio) {
  if (ctx.conectado) return; ctx.conectado = true; ctx.inicio = inicio || Date.now();
  ctx.pararCampainha?.(); ctx.tela.t.classList.remove("tocando");
  ctx.tela.aviso.textContent = ctx.tipo === "video" ? "" : "Ligação pelo Help Floripa: nada é gravado.";
  const pintar = () => { ctx.tela.situacao.textContent = relogio(Date.now() - ctx.inicio); };
  pintar(); ctx.cronometro = setInterval(pintar, 1000);
}

// ---------- quem liga ----------
// ligar({ para, nome, foto, conv, tipo }) → resolve com { status, duracaoSeg } quando a chamada acaba.
export function ligar({ para, nome, foto, conv, tipo = "audio" }) {
  return new Promise(async (resolver) => {
    const eu = auth()?.currentUser?.uid;
    if (!eu || !db()) return resolver({ status: "erro", erro: "Entre na sua conta para ligar." });
    if (atual) return resolver({ status: "erro", erro: "Você já está numa chamada." });
    if (!window.RTCPeerConnection || !navigator.mediaDevices?.getUserMedia) return resolver({ status: "erro", erro: "Este navegador não faz ligações. Atualize o navegador ou use outro." });
    const ctx = { tipo, para }; atual = ctx;
    ctx.tela = montarTela({ nome, foto, tipo, recebendo: false });
    let fim = false;
    const encerrar = async (status, porMim = true) => {
      if (fim) return; fim = true;
      const duracaoSeg = ctx.conectado ? Math.round((Date.now() - ctx.inicio) / 1000) : 0;
      if (porMim && ctx.ref) await updateDoc(ctx.ref, { status, fimEm: serverTimestamp(), encerradaPor: eu }).catch(() => {});
      finalizarLocal(ctx);
      resolver({ status, duracaoSeg });
    };
    ctx.tela.bts.appendChild(botao("fim", "tel", "Cancelar", () => encerrar(ctx.conectado ? "encerrada" : "cancelada")));
    try { ctx.midia = { m: await pedirMidia(tipo) }; }
    catch (e) { finalizarLocal(ctx); return resolver({ status: "erro", erro: erroMidia(e, tipo) }); }
    if (fim) { ctx.midia.m.getTracks().forEach((t) => t.stop()); return; }
    ctx.ref = doc(collection(db(), "chamadas"));
    ctx.conexao = iniciarConexao(ctx.ref, eu, ctx.tela, tipo, ctx.midia.m);
    const { pc } = ctx.conexao;
    controles(ctx.tela, tipo, ctx.midia, pc, (s) => encerrar(ctx.conectado ? s : "cancelada"));
    ctx.pararCampainha = campainha(false);
    try {
      const oferta = await pc.createOffer(); await pc.setLocalDescription(oferta);
      await setDoc(ctx.ref, { de: eu, para, conv, tipo, status: "chamando", oferta: { type: oferta.type, sdp: oferta.sdp }, criadoEm: serverTimestamp() });
    } catch (e) {
      console.warn("[Chamada]", e?.code || e);
      fim = true; finalizarLocal(ctx);
      return resolver({ status: "erro", erro: e?.code === "permission-denied" ? "As ligações começam a funcionar quando a atualização do sistema for publicada." : "Não foi possível ligar agora." });
    }
    ctx.conexao.liberarFila();
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") conectou(ctx);
      if (pc.connectionState === "failed") { ctx.tela.situacao.textContent = "A rede não deixou conectar"; setTimeout(() => encerrar("encerrada"), 1800); }
    };
    ctx.timeout = setTimeout(() => { if (!ctx.conectado && !ctx.respondida) encerrar("perdida"); }, TOCANDO_MS);
    ctx.pararDoc = onSnapshot(ctx.ref, async (s) => {
      const d = s.data(); if (!d) return;
      if (d.resposta && !ctx.respondida) {
        ctx.respondida = true; ctx.tela.situacao.textContent = "Conectando…";
        try { await pc.setRemoteDescription(d.resposta); ctx.conexao.remotaPronta(); } catch (e) { console.warn("[Chamada] resposta", e); }
      }
      if (d.status === "recusada") { ctx.tela.situacao.textContent = "Não atendeu"; setTimeout(() => encerrar("recusada", false), 1200); }
      else if (d.status === "encerrada" && d.encerradaPor !== eu) encerrar("encerrada", false);
    }, () => {});
  });
}

// ---------- quem recebe ----------
async function nomeDe(uid) {
  try { const s = await getDoc(doc(db(), "perfis_publicos", uid)); const d = s.exists() ? s.data() : {}; return { nome: d.nome || d.nickname || "Alguém", foto: typeof d.foto === "string" && d.foto.length < 900000 ? d.foto : "" }; }
  catch { return { nome: "Alguém", foto: "" }; }
}
async function receber(id, d) {
  const eu = auth()?.currentUser?.uid;
  const ref = doc(db(), "chamadas", id);
  if (atual) { updateDoc(ref, { status: "recusada", fimEm: serverTimestamp(), encerradaPor: eu }).catch(() => {}); return; } // ocupado
  const ctx = { tipo: d.tipo === "video" ? "video" : "audio", ref }; atual = ctx;
  const { nome, foto } = await nomeDe(d.de);
  if (atual !== ctx) return;
  ctx.tela = montarTela({ nome, foto, tipo: ctx.tipo, recebendo: true });
  ctx.pararCampainha = campainha(true);
  let fim = false;
  const encerrar = async (status, porMim = true) => {
    if (fim) return; fim = true;
    if (porMim) await updateDoc(ref, { status, fimEm: serverTimestamp(), encerradaPor: eu }).catch(() => {});
    finalizarLocal(ctx);
  };
  const recusar = botao("fim", "tel", "Recusar", () => encerrar("recusada"));
  const atender = botao("atender", ctx.tipo === "video" ? "cam" : "tel", "Atender", async () => {
    ctx.pararCampainha(); atender.disabled = true; ctx.tela.situacao.textContent = "Conectando…";
    try { ctx.midia = { m: await pedirMidia(ctx.tipo) }; }
    catch (e) { ctx.tela.aviso.textContent = erroMidia(e, ctx.tipo); setTimeout(() => encerrar("recusada"), 2500); return; }
    ctx.conexao = iniciarConexao(ref, eu, ctx.tela, ctx.tipo, ctx.midia.m);
    const { pc } = ctx.conexao;
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") conectou(ctx);
      if (pc.connectionState === "failed") { ctx.tela.situacao.textContent = "A rede não deixou conectar"; setTimeout(() => encerrar("encerrada"), 1800); }
    };
    try {
      await pc.setRemoteDescription(d.oferta); ctx.conexao.remotaPronta();
      const resp = await pc.createAnswer(); await pc.setLocalDescription(resp);
      await updateDoc(ref, { status: "aceita", resposta: { type: resp.type, sdp: resp.sdp }, aceitaEm: serverTimestamp() });
      ctx.conexao.liberarFila();
    } catch (e) { console.warn("[Chamada] atender", e?.code || e); ctx.tela.situacao.textContent = "Não foi possível atender"; setTimeout(() => encerrar("encerrada"), 1500); return; }
    controles(ctx.tela, ctx.tipo, ctx.midia, pc, encerrar);
  });
  ctx.tela.bts.append(recusar, atender);
  ctx.timeout = setTimeout(() => { if (!ctx.conectado && !ctx.conexao) encerrar("perdida", false); }, Math.max(3000, TOCANDO_MS - (Date.now() - (d.criadoEm?.toMillis?.() ?? Date.now()))));
  ctx.pararDoc = onSnapshot(ref, (s) => {
    const x = s.data(); if (!x) return;
    if (["cancelada", "perdida"].includes(x.status) || (x.status === "encerrada" && x.encerradaPor !== eu)) encerrar(x.status, false);
  }, () => {});
}

// Fica ouvindo chamadas para esta pessoa (em qualquer página). Uma vez por aba.
export function ouvirChamadas(uid) {
  if (!uid || window.__hfChamadas === uid || !db()) return;
  window.__hfChamadas?.parar?.();
  const vistas = new Set();
  const parar = onSnapshot(query(collection(db(), "chamadas"), where("para", "==", uid), where("status", "==", "chamando")), (s) => {
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

// Texto do cartão que fica na conversa depois da ligação.
export function textoChamada(c) {
  const qual = c?.modo === "video" ? "Chamada de vídeo" : "Ligação de voz";
  if (c?.resultado === "encerrada" && c.duracao > 0) return `${qual} · ${c.duracao < 60 ? c.duracao + " s" : Math.round(c.duracao / 60) + " min"}`;
  return { perdida: `${qual} perdida`, recusada: `${qual} não atendida`, cancelada: `${qual} cancelada` }[c?.resultado] || qual;
}
