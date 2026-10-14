// =====================================================
// Rede social do Help Floripa: base comum
// Usada por usuarios.html (perfil), feed.html, notificacoes.html,
// configuracoes.html e negocios.html.
// - Ícones, tema, utilitários, painéis (folhas), estado da conta.
// - Seguir, bloquear, restringir, lista de pessoas.
// - Estrelas (1 a 5) e comentários das publicações.
// - Nova publicação (foto ou texto).
// - Barra inferior, avisos (notificações) e presença online.
// =====================================================
import { gravarComLocal, NOVOS } from "./endereco.js?v=1";
import { comRitmo } from "./ritmo.js?v=2";
import { editarImagem, dataUrlParaBlob } from "./editor-imagem.js?v=5";
import { conferirEmail, emailPendente, MSG_EMAIL, midiaSegura } from "./seguranca.js?v=1";
import { ouvirReclamacoes, TEXTO_RECLAMACAO, linkReclamacao } from "./avisos-reclamacoes.js?v=15";
import { ouvirItensEquipe, TEXTO_EQUIPE, linkEquipe } from "./avisos-equipe.js?v=1";
import "./painel-avisos.js?v=15";
import { docComValidade, docsComValidade } from "./leituras.js?v=1";
import { palavrasBusca } from "./pessoas.js?v=3"; // o sino abre o painel de notificações na própria página

// ---------- ícones ----------
const SIMBOLOS = `<symbol id="i-casa" viewBox="0 0 24 24"><path d="M4 10.5L12 4l8 6.5V19a1.5 1.5 0 01-1.5 1.5H15v-6h-6v6H5.5A1.5 1.5 0 014 19z"/></symbol>
<symbol id="i-fio" viewBox="0 0 24 24"><path d="M3 15c3-6 6 4 9-2s6 4 9-2"/><circle cx="12" cy="13" r="1.6" fill="currentColor"/></symbol>
<symbol id="i-coracao" viewBox="0 0 24 24"><path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0112 7.3 4.3 4.3 0 0119.5 10c0 5.6-7.5 10-7.5 10z"/></symbol>
<symbol id="i-bloquear" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/></symbol>
<symbol id="i-restringir" viewBox="0 0 24 24"><path d="M12 3.5l7 3v5.2c0 4.2-2.9 7.6-7 8.8-4.1-1.2-7-4.6-7-8.8V6.5z"/><path d="M9 12h6"/></symbol>
<symbol id="i-pessoa-menos" viewBox="0 0 24 24"><circle cx="10" cy="8.5" r="3.8"/><path d="M3.5 20c1-3.4 3.6-5.3 6.5-5.3 1.4 0 2.7.4 3.8 1.2M15 16h6"/></symbol>
<symbol id="i-enviar" viewBox="0 0 24 24"><path d="M21 3.5L10.5 14M21 3.5l-6.5 17-4-6.5-6.5-4z"/></symbol>
<symbol id="i-tacha" viewBox="0 0 24 24"><path d="M9 4h6l-1 6 3 3H7l3-3z"/><path d="M12 13v7"/></symbol>
<symbol id="i-relogio" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></symbol>
<symbol id="i-rascunho" viewBox="0 0 24 24"><path d="M6 3.5h8l4 4v13H6z"/><path d="M14 3.5v4h4M9 13h6M9 16.5h4"/></symbol>
<symbol id="i-salvo" viewBox="0 0 24 24"><path d="M6.5 4.5h11v15.5L12 16l-5.5 4z"/></symbol>
<symbol id="i-fotos" viewBox="0 0 24 24"><rect x="7" y="7" width="13" height="13" rx="2.2"/><path d="M4 16V6.2A2.2 2.2 0 016.2 4H16"/></symbol>
<symbol id="i-pontos" viewBox="0 0 24 24"><circle cx="5.5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor"/></symbol>
<symbol id="i-link" viewBox="0 0 24 24"><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/></symbol>
<symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></symbol>
<symbol id="i-rosa" viewBox="0 0 24 24"><path d="M12 13.2c-2.7 0-4.6-2-4.6-4.5 0-1.6.8-2.9 1.9-3.7.3 1.1 1.3 1.9 2.7 1.9s2.4-.8 2.7-1.9c1.1.8 1.9 2.1 1.9 3.7 0 2.5-1.9 4.5-4.6 4.5z" fill="currentColor" stroke="none"/><path d="M12 13.2V21M12 17.2c-1.4-1.9-3.4-2.2-5-1.6 1 1.9 3.1 2.5 5 1.6zM12 16.2c1.2-1.5 2.9-1.7 4.2-1.2-.8 1.5-2.5 2-4.2 1.2z"/></symbol>
<symbol id="i-teia" viewBox="0 0 24 24"><circle cx="12" cy="12" r="2.6"/><circle cx="5" cy="6" r="1.8"/><circle cx="19" cy="6" r="1.8"/><circle cx="5" cy="18" r="1.8"/><circle cx="19" cy="18" r="1.8"/><path d="M9.8 10.6L6.5 7.2M14.2 10.6l3.3-3.4M9.8 13.4l-3.3 3.4M14.2 13.4l3.3 3.4"/></symbol>
<symbol id="i-loja" viewBox="0 0 24 24"><path d="M4 9.5l1.5-5h13l1.5 5M4 9.5h16M4 9.5c0 1.5 1.2 2.5 2.7 2.5S9.3 11 9.3 9.5c0 1.5 1.2 2.5 2.7 2.5s2.7-1 2.7-2.5c0 1.5 1.2 2.5 2.6 2.5S20 11 20 9.5M5.5 12v7.5h13V12M10 19.5v-4h4v4"/></symbol>
<symbol id="i-whats" viewBox="0 0 24 24"><path d="M20.5 11.7a8.5 8.5 0 01-12.6 7.5L3.5 20.5l1.3-4.2A8.5 8.5 0 1120.5 11.7z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .8a4.5 4.5 0 01-2.4-2.4l.8-1-1-2z"/></symbol>
<symbol id="i-lupa" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></symbol>
<symbol id="i-chat" viewBox="0 0 24 24"><path d="M20.5 11.6c0 4.3-3.8 7.6-8.5 7.6-1.2 0-2.3-.2-3.3-.6L4 20l1.2-3.6c-1.1-1.3-1.7-3-1.7-4.8C3.5 7.4 7.3 4 12 4s8.5 3.4 8.5 7.6z"/></symbol>
<symbol id="i-sino" viewBox="0 0 24 24"><path d="M18 9.5a6 6 0 00-12 0c0 6.5-2.5 8-2.5 8h17S18 16 18 9.5z"/><path d="M10.2 20.5a2 2 0 003.6 0"/></symbol>
<symbol id="i-fechar" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></symbol>
<symbol id="i-voltar" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></symbol>
<symbol id="i-avancar" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></symbol>
<symbol id="i-camera" viewBox="0 0 24 24"><path d="M4 8.5A2.5 2.5 0 016.5 6h1.8l1.5-2h4.4l1.5 2h1.8A2.5 2.5 0 0120 8.5v9a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 17.5z"/><circle cx="12" cy="13" r="3.6"/></symbol>
<symbol id="i-config" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></symbol>
<symbol id="i-compartilhar" viewBox="0 0 24 24"><path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M5 13v5.5A1.5 1.5 0 006.5 20h11a1.5 1.5 0 001.5-1.5V13"/></symbol>
<symbol id="i-lapis" viewBox="0 0 24 24"><path d="M4 20h4L19 9a2.8 2.8 0 00-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></symbol>
<symbol id="i-pin" viewBox="0 0 24 24"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/></symbol>
<symbol id="i-grade" viewBox="0 0 24 24"><rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/></symbol>
<symbol id="i-bussola" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></symbol>
<symbol id="i-mais" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
<symbol id="i-imagem" viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5-8.5 8.5"/></symbol>
<symbol id="i-video" viewBox="0 0 24 24"><rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="M16 10.5l5-3v9l-5-3z"/></symbol>
<symbol id="i-play" viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></symbol>
<symbol id="i-lixo" viewBox="0 0 24 24"><path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5"/></symbol>
<symbol id="i-estrela" viewBox="0 0 24 24"><path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8z" fill="currentColor" stroke="none"/></symbol>
<symbol id="i-selo" viewBox="0 0 24 24"><path d="M12 2.5l2.4 1.8 3-.2.9 2.9 2.5 1.7-1 2.8 1 2.8-2.5 1.7-.9 2.9-3-.2L12 21.5l-2.4-1.8-3 .2-.9-2.9-2.5-1.7 1-2.8-1-2.8 2.5-1.7.9-2.9 3 .2z" fill="currentColor" stroke="none"/><path d="M8.3 12.2l2.5 2.5 5-5.2" stroke="#fff" stroke-width="2.2"/></symbol>
<symbol id="i-sair" viewBox="0 0 24 24"><path d="M15 4h3.5A1.5 1.5 0 0120 5.5v13a1.5 1.5 0 01-1.5 1.5H15M10 16.5L14.5 12 10 7.5M14.5 12H4"/></symbol>
<symbol id="i-cadeado" viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V7.5a3.5 3.5 0 017 0v3"/></symbol>
<symbol id="i-lua" viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/></symbol>
<symbol id="i-olho" viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></symbol>
<symbol id="i-ajuda" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 014.8.9c0 1.7-2.4 2.2-2.4 3.7M12 17h.01"/></symbol>
<symbol id="i-doc" viewBox="0 0 24 24"><path d="M7 3.5h7l4 4V19a1.5 1.5 0 01-1.5 1.5h-9.5A1.5 1.5 0 015.5 19V5A1.5 1.5 0 017 3.5z"/><path d="M14 3.5V8h4M8.5 12.5h7M8.5 16h5"/></symbol>
<symbol id="i-chave" viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><path d="M11 12l8.5-8.5M16 7l2.5 2.5M14 9l2 2"/></symbol>
<symbol id="i-pessoa-mais" viewBox="0 0 24 24"><circle cx="10" cy="8.5" r="3.8"/><path d="M3.5 20c1-3.4 3.6-5.3 6.5-5.3 1.4 0 2.7.4 3.8 1.2M18 13v6M15 16h6"/></symbol>
<symbol id="i-servicos" viewBox="0 0 24 24"><rect x="3.5" y="7" width="17" height="12.5" rx="2"/><path d="M9 7V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7M3.5 12.5h17"/></symbol>
<symbol id="i-feed" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="7" rx="2"/><rect x="4" y="13" width="16" height="7" rx="2"/></symbol>
<symbol id="i-maleta" viewBox="0 0 24 24"><rect x="3.5" y="7" width="17" height="12.5" rx="2"/><path d="M9 7V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7M3.5 12.5h17"/></symbol>
<symbol id="i-alerta" viewBox="0 0 24 24"><path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.5h.01"/></symbol>
<symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h10"/></symbol>
<symbol id="i-delivery" viewBox="0 0 24 24"><path d="M3 10h18M4 10a8 8 0 0116 0M2 14h20M4 14l1 6h14l1-6"/></symbol>
<symbol id="i-lojinha" viewBox="0 0 24 24"><path d="M6 8h12l-1 12H7L6 8zM9 8V6a3 3 0 016 0v2"/></symbol>
<symbol id="i-imoveis" viewBox="0 0 24 24"><path d="M4 11.5L12 4l8 7.5M6 10v9.5h12V10M10 19.5v-5h4v5"/></symbol>
<symbol id="i-envelope" viewBox="0 0 24 24"><rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/></symbol>`;
if (!document.getElementById("hfSprite")) {
  const d = document.createElement("div");
  d.innerHTML = `<svg id="hfSprite" width="0" height="0" style="position:absolute" aria-hidden="true">${SIMBOLOS}</svg>`;
  document.body.prepend(d.firstChild);
}

// ---------- preferências (compartilhadas com as mensagens) ----------
export const CHAVE_CONFIG = "hf-chat-config";
export const config = { tema: "sistema", sons: true, mostrarOnline: true, confirmacaoLeitura: true };
try { Object.assign(config, JSON.parse(localStorage.getItem(CHAVE_CONFIG) || "{}")); } catch {}
const temaSistema = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
export function aplicarTema() {
  const escuro = config.tema === "escuro" || (config.tema === "sistema" && !!temaSistema?.matches);
  document.documentElement.dataset.theme = escuro ? "dark" : "light";
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = escuro ? "#0f161b" : "#ffffff";
}
export function salvarConfig() {
  try {
    const atual = JSON.parse(localStorage.getItem(CHAVE_CONFIG) || "{}");
    localStorage.setItem(CHAVE_CONFIG, JSON.stringify({ ...atual, tema: config.tema, sons: config.sons, mostrarOnline: config.mostrarOnline, confirmacaoLeitura: config.confirmacaoLeitura }));
  } catch {}
  aplicarTema();
}
// "Mostrar online" e "Confirmação de leitura" valem para a conta inteira (todos os aparelhos):
// ficam em usuarios/{uid}.privacidade, que só a própria pessoa lê.
export async function salvarPrivacidadeConta() {
  salvarConfig();
  if (!refUsuario) return;
  await fb.setDoc(refUsuario, { privacidade: { mostrarOnline: config.mostrarOnline !== false, confirmacaoLeitura: config.confirmacaoLeitura !== false } }, { merge: true });
}
temaSistema?.addEventListener?.("change", aplicarTema);
// O menu lateral também troca o tema: acompanha a mudança.
window.addEventListener("storage", (e) => { if (e.key === CHAVE_CONFIG) { try { Object.assign(config, JSON.parse(e.newValue || "{}")); } catch {} aplicarTema(); } });
aplicarTema();

// ---------- utilitários ----------
export const $ = (id) => document.getElementById(id);
export const ms = (ts) => ts?.toMillis?.() ?? 0;
export const paraData = (ts) => ts?.toDate?.() ?? (ts instanceof Date ? ts : null);
export const LIMITE_DOC = 900000;
export function el(tag, cls, texto) { const e = document.createElement(tag); if (cls) e.className = cls; if (texto != null) e.textContent = texto; return e; }
export function icone(nome, classe = "i s") {
  const ns = "http://www.w3.org/2000/svg";
  const s = document.createElementNS(ns, "svg");
  s.setAttribute("class", classe);
  s.setAttribute("aria-hidden", "true");
  const u = document.createElementNS(ns, "use");
  u.setAttribute("href", "#i-" + nome);
  s.appendChild(u);
  return s;
}
export function iniciais(nome) {
  const p = String(nome || "?").trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] || "?") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}
// Fotos e vídeos só do próprio site (seguranca.js).
export const urlSegura = (u) => midiaSegura(u);
export function pintarAvatar(alvo, foto, nome) {
  alvo.replaceChildren();
  const url = urlSegura(foto);
  if (url) {
    const img = document.createElement("img");
    img.src = url; img.alt = ""; img.loading = "lazy";
    img.onerror = () => { alvo.textContent = iniciais(nome); };
    alvo.appendChild(img);
  } else {
    alvo.textContent = iniciais(nome);
  }
}
export function pintarCapa(alvo, url) {
  alvo.querySelector("img")?.remove();
  const u = urlSegura(url);
  alvo.classList.toggle("sem-foto", !u);
  if (u) { const img = document.createElement("img"); img.src = u; img.alt = ""; alvo.prepend(img); }
}
export function nomeCidade(v) {
  if (v === "florianopolis") return "Florianópolis";
  if (v === "saojose") return "São José";
  return v || "";
}
export const numero = (n) => {
  n = Number(n) || 0;
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(".", ",").replace(",0", "") + " mi";
  if (n >= 1e4) return (n / 1e3).toFixed(1).replace(".", ",").replace(",0", "") + " mil";
  return n.toLocaleString("pt-BR");
};
export function tempoRelativo(d) {
  if (!d) return "";
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return "agora";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
export function dataCompleta(d) {
  return d ? d.toLocaleString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
}
export function toast(texto, aoClicar) {
  document.querySelectorAll(".toast").forEach((t) => t.remove());
  const t = document.createElement("div");
  t.className = "toast";
  t.setAttribute("role", "status");
  t.textContent = texto;
  t.addEventListener("click", () => { t.remove(); aoClicar?.(); });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4500);
}
export function erroAmigavel(e) {
  if (e?.code === "limite-diario") return e.message;
  if (e?.code === "permission-denied") return emailPendente(eu) ? MSG_EMAIL : "Sem permissão para fazer isso.";
  if (e?.code === "unavailable") return "Sem conexão com o servidor. Verifique sua internet.";
  return e?.message && !e.code ? e.message : "Algo deu errado. Tente novamente.";
}
let audioCtx = null;
export function tocarSom() {
  if (config.sons === false) return;
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return; // o navegador só deixa tocar depois de um toque na página
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime;
    [[880, 0], [1320, .09]].forEach(([f, a]) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(.0001, t + a);
      g.gain.exponentialRampToValueAtTime(.12, t + a + .02);
      g.gain.exponentialRampToValueAtTime(.0001, t + a + .18);
      o.connect(g).connect(audioCtx.destination);
      o.start(t + a); o.stop(t + a + .2);
    });
  } catch {}
}
export function notificar(titulo, corpo, aoClicar) {
  tocarSom();
  if (document.hidden && "Notification" in window && Notification.permission === "granted") {
    try {
      const n = new Notification(titulo, { body: corpo, icon: "android-chrome-192x192.png" });
      n.onclick = () => { window.focus(); n.close(); aoClicar?.(); };
      return;
    } catch {}
  }
  toast(`${titulo}: ${corpo}`, aoClicar);
}

// ---------- folhas (painéis) ----------
export const pilha = [];
export function abrirFolha(id) {
  const f = $(id);
  if (!pilha.includes(id)) pilha.push(id);
  f.style.zIndex = String(5000 + pilha.length);
  f.classList.add("aberta");
  document.body.classList.add("travado");
  setTimeout(() => f.querySelector("[autofocus], input:not([disabled]), textarea, button")?.focus({ preventScroll: true }), 60);
}
export function fecharFolha(id) {
  const f = $(id);
  if (!f) return;
  f.classList.remove("aberta");
  const i = pilha.indexOf(id);
  if (i >= 0) pilha.splice(i, 1);
  if (!pilha.length) document.body.classList.remove("travado");
  f.dispatchEvent(new Event("fechada"));
}
export function ligarFolha(f) {
  if (f.dataset.ligada) return;
  f.dataset.ligada = "1";
  f.addEventListener("click", (e) => { if (e.target === f || e.target.closest("[data-fechar]")) fecharFolha(f.id); });
}
document.querySelectorAll(".folha").forEach(ligarFolha);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && pilha.length && !document.querySelector(".hfe-fundo, .hf-aval-fundo")) fecharFolha(pilha[pilha.length - 1]);
});
// Cria uma folha quando a página não tem (lista, opções, comentários, publicar).
export function criarFolha(id, { titulo = "", classe = "", corpoClasse = "folha-corpo", rodape = false } = {}) {
  if ($(id)) return $(id);
  const f = el("div", "folha " + classe);
  f.id = id; f.setAttribute("role", "dialog"); f.setAttribute("aria-modal", "true"); f.setAttribute("aria-labelledby", "t_" + id);
  const cx = el("div", "folha-caixa");
  const topo = el("div", "folha-topo");
  const h = el("h2", null, titulo); h.id = "t_" + id;
  const x = el("button", "icone-btn"); x.type = "button"; x.dataset.fechar = ""; x.setAttribute("aria-label", "Fechar"); x.appendChild(icone("fechar", "i"));
  topo.append(h, x);
  const corpo = el("div", corpoClasse); corpo.id = "c_" + id;
  cx.append(topo, corpo);
  if (rodape) { const r = el("div", "folha-rodape"); r.id = "r_" + id; cx.appendChild(r); }
  f.appendChild(cx);
  document.body.appendChild(f);
  ligarFolha(f);
  return f;
}
// Lista e opções: mesmos ids que o perfil sempre usou.
function garantirLista() {
  if ($("folhaLista")) return;
  const f = criarFolha("folhaLista", { titulo: "Lista" });
  f.querySelector("h2").id = "tLista"; f.setAttribute("aria-labelledby", "tLista");
  f.querySelector(".folha-corpo").id = "listaCorpo";
}
function garantirOpcoes() {
  if ($("folhaOpcoes")) return;
  const f = criarFolha("folhaOpcoes", { titulo: "Opções", corpoClasse: "folha-corpo opcoes" });
  f.querySelector("h2").id = "tOpcoes"; f.setAttribute("aria-labelledby", "tOpcoes");
  f.querySelector(".folha-corpo").id = "opcoesCorpo";
}
export function abrirLista(titulo) {
  garantirLista();
  $("tLista").textContent = titulo;
  const corpo = $("listaCorpo");
  corpo.replaceChildren();
  abrirFolha("folhaLista");
  return corpo;
}
export function abrirOpcoes(titulo, opcoes) {
  garantirOpcoes();
  $("tOpcoes").textContent = titulo;
  const corpo = $("opcoesCorpo");
  corpo.replaceChildren();
  opcoes.filter(Boolean).forEach((o) => {
    const b = document.createElement("button");
    b.type = "button";
    if (o.perigo) b.className = "perigo";
    const t = document.createElement("span");
    t.textContent = o.rotulo;
    if (o.sub) { const sm = document.createElement("small"); sm.textContent = o.sub; t.appendChild(sm); }
    b.append(icone(o.icone, "i"), t);
    b.addEventListener("click", async () => { fecharFolha("folhaOpcoes"); await o.fn(); });
    corpo.appendChild(b);
  });
  abrirFolha("folhaOpcoes");
}

// ---------- estado da conta ----------
export let fb = {}, authFns = {}, storageFns = null;
export let eu = null, refUsuario = null, dados = {};
export const perfis = new Map();
export let meusSeguindo = new Set();
export let meusBloqueios = new Set();   // quem eu bloqueei
export let bloqueadoPor = new Set();    // quem me bloqueou
export let restritos = new Set();       // quem eu restringi
export const escondido = (uid) => meusBloqueios.has(uid) || bloqueadoPor.has(uid);
// Silenciados: continua seguindo, mas as publicações e os stories da pessoa não aparecem no Diário (usuarios.silenciados).
export let silenciados = new Set();
export const silenciado = (uid) => silenciados.has(uid);
export async function alternarSilenciar(uid, nome = "") {
  const ja = silenciados.has(uid);
  try {
    await fb.setDoc(refUsuario, { silenciados: ja ? fb.arrayRemove(uid) : fb.arrayUnion(uid) }, { merge: true });
    if (ja) silenciados.delete(uid); else silenciados.add(uid);
    dados.silenciados = [...silenciados];
    toast(ja ? `${nome || "Pessoa"} voltou a aparecer no seu Diário` : `${nome || "Pessoa"} silenciada: você continua seguindo, mas não vê as publicações e os stories no Diário`);
    return !ja;
  } catch (e) { toast("Não foi possível: " + erroAmigavel(e)); return ja; }
}
// Ganchos que cada página pode trocar.
export const ganchos = {
  abrirPerfil: (uid) => { if (uid) location.href = uid === eu?.uid ? "usuarios.html" : `usuarios.html?perfil=${encodeURIComponent(uid)}`; },
  aposSeguir: () => {},
  aposBloqueio: () => {}
};

// Consulta com ordem por data. Precisa de um índice no Firebase; enquanto ele não existir,
// usa a consulta simples (sem ordem) para a página não ficar vazia.
export async function lerOrdenado(ordenada, simples) {
  try { return await fb.getDocs(ordenada); }
  catch (e) { if (e?.code !== "failed-precondition") throw e; console.warn("Índice do Firebase ainda não criado:", e.message); return fb.getDocs(simples); }
}

export function obterPerfil(uid) {
  if (!uid) return Promise.resolve({});
  // Nome e foto de outras pessoas: a cópia do aparelho vale por 30 min (o próprio perfil sempre do servidor).
  if (!perfis.has(uid)) perfis.set(uid, (uid === eu?.uid ? fb.getDoc(fb.doc(fb.db, "perfis_publicos", uid)) : docComValidade(fb, ["perfis_publicos", uid], 30 * 60000)).then((s) => (s.exists() ? s.data() : {})).catch(() => ({})));
  return perfis.get(uid);
}
// Roda fn uma vez, quando o elemento chega perto da tela (contadores de cada publicação
// só são lidos para o que a pessoa realmente vê).
const vigiaTela = "IntersectionObserver" in window ? new IntersectionObserver((itens) => itens.forEach((i) => {
  if (!i.isIntersecting) return;
  vigiaTela.unobserve(i.target); const fn = i.target.__aoAparecer; delete i.target.__aoAparecer; fn?.();
}), { rootMargin: "400px 0px" }) : null;
export function quandoVisivel(elemento, fn) {
  if (!vigiaTela) { fn(); return; }
  elemento.__aoAparecer = fn;
  vigiaTela.observe(elemento);
}

// Salva uma imagem: no Storage se estiver ativo, senão dentro do documento.
export async function salvarImagem(dataUrl, caminho) {
  if (storageFns && window.firebaseStorage) {
    try {
      const r = storageFns.ref(window.firebaseStorage, caminho);
      await storageFns.uploadBytes(r, dataUrlParaBlob(dataUrl), { contentType: "image/jpeg" });
      return await storageFns.getDownloadURL(r);
    } catch (e) { console.warn("Storage indisponível, salvando no documento:", e); }
  }
  if (dataUrl.length > LIMITE_DOC) throw new Error("Imagem grande demais. Tente outra foto.");
  return dataUrl;
}

// Conecta ao Firebase, confere o login e carrega a conta.
// sincronizar: mantém o perfil público em dia (feito pelo perfil).
export async function iniciarRede({ sincronizar = false } = {}) {
  for (let i = 0; i < 100 && (!window.firebaseAuth || !window.firebaseDb); i++) await new Promise((r) => setTimeout(r, 50));
  if (!window.firebaseAuth || !window.firebaseDb) throw new Error("Não foi possível conectar ao Help Floripa. Abra esta página pelo site e verifique sua internet.");
  const [auth, firestore] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
  ]);
  authFns = auth;
  fb = { ...firestore, db: window.firebaseDb };
  if (window.firebaseStorage) { try { storageFns = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js"); } catch { storageFns = null; } }
  const usuario = await new Promise((ok) => {
    const parar = auth.onAuthStateChanged(window.firebaseAuth, (u) => { parar(); ok(u); });
  });
  if (!usuario) { location.href = "login.html?redirect=" + encodeURIComponent(location.pathname.split("/").pop() + location.search); throw new Error("Entre na sua conta."); }
  eu = usuario;
  refUsuario = fb.doc(fb.db, "usuarios", eu.uid);
  const snap = await fb.getDoc(refUsuario);
  dados = snap.exists() ? snap.data() : {};
  dados.nome = dados.nome || eu.displayName || "Usuário";
  // E-mail trocado pelo link de confirmação: atualiza a cópia guardada na conta.
  if (eu.email && snap.exists() && dados.email && dados.email !== eu.email) fb.setDoc(refUsuario, { email: eu.email }, { merge: true }).catch(() => {});
  dados.email = eu.email || dados.email || "";
  dados.cidade = dados.cidade || dados.cidadeNome || "";
  if (dados.privacidade) {
    config.mostrarOnline = dados.privacidade.mostrarOnline !== false;
    config.confirmacaoLeitura = dados.privacidade.confirmacaoLeitura !== false;
    salvarConfig();
  }
  // Privacidade do social e do duo ficam no perfil público: lê ANTES de sincronizar,
  // senão a leitura pega só os campos da gravação pendente e volta tudo para o padrão.
  const pubSnap = await fb.getDoc(fb.doc(fb.db, "perfis_publicos", eu.uid)).catch(() => null);
  const pub = pubSnap?.exists() ? pubSnap.data() : {};
  if (pub.socialVisibilidade) dados.socialVisibilidade = pub.socialVisibilidade;
  if (pub.duoCapa) dados.duoCapa = pub.duoCapa;
  if (!dados.nickname && pub.nickname) dados.nickname = pub.nickname;
  if (sincronizar) {
    const publico = {
      uid: eu.uid, nome: dados.nome, nickname: pub.nickname || dados.nickname || "", cidade: dados.cidade,
      fotoPerfil: dados.fotoPerfil || "", fotoCapa: dados.fotoCapa || "", bio: dados.bio || ""
    };
    // Estado e cidade do IBGE (padrão novo do endereço) vão junto quando a conta já tem.
    if (dados.uf && dados.cidadeIbge) Object.assign(publico, { uf: dados.uf, cidadeIbge: dados.cidadeIbge });
    gravarComLocal((d) => fb.setDoc(fb.doc(fb.db, "perfis_publicos", eu.uid), d, { merge: true }), publico, NOVOS.perfil)
      .catch((e) => console.warn("Perfil público não sincronizado:", e));
  }
  // Palavras do nome e do @ para a busca de pessoas (gravação separada: se falhar, nada mais quebra).
  const busca = palavrasBusca(pub.nome || dados.nome, pub.nickname || dados.nickname);
  if (pubSnap?.exists() && JSON.stringify(pub.busca || []) !== JSON.stringify(busca)) {
    fb.setDoc(fb.doc(fb.db, "perfis_publicos", eu.uid), { uid: eu.uid, busca }, { merge: true }).catch(() => {});
  }
  conferirEmail(eu);
  await carregarPrivacidade().catch((e) => console.warn("Bloqueios:", e));
  marcarPresenca();
  return { eu, dados };
}

// ---------- bloqueios e restrições ----------
export async function carregarPrivacidade() {
  const col = fb.collection(fb.db, "bloqueios");
  const [meus, deles] = await Promise.all([
    // Válidos por 10 min no aparelho (quem você bloqueia muda na hora; as regras do Firestore valem sempre).
    docsComValidade(fb, "bloq-meus-" + eu.uid, fb.query(col, fb.where("bloqueadorId", "==", eu.uid)), 10 * 60000).catch(() => null),
    docsComValidade(fb, "bloq-deles-" + eu.uid, fb.query(col, fb.where("bloqueadoId", "==", eu.uid)), 10 * 60000).catch(() => null)
  ]);
  meusBloqueios = new Set(meus ? meus.docs.map((d) => d.data().bloqueadoId) : []);
  bloqueadoPor = new Set(deles ? deles.docs.map((d) => d.data().bloqueadorId) : []);
  restritos = new Set(Array.isArray(dados.restritos) ? dados.restritos : []);
  silenciados = new Set(Array.isArray(dados.silenciados) ? dados.silenciados : []);
}
export async function removerSeguidor(uid, nome) {
  if (!confirm(`Remover ${nome || "esta pessoa"} dos seus seguidores? Ela não será avisada.`)) return false;
  try {
    await fb.deleteDoc(fb.doc(fb.db, "relacoes", `${uid}_${eu.uid}`));
    ganchos.aposSeguir();
    toast("Seguidor removido");
    return true;
  } catch (e) { toast("Não foi possível remover: " + erroAmigavel(e)); return false; }
}
export async function bloquear(uid, nome) {
  if (!confirm(`Bloquear ${nome || "esta pessoa"}?\n\nVocês deixam de se seguir. Ela não consegue abrir seu perfil, seguir você nem enviar mensagens, e suas publicações deixam de aparecer para ela. Ela não será avisada.`)) return false;
  try {
    await fb.setDoc(fb.doc(fb.db, "bloqueios", `${eu.uid}_${uid}`), { bloqueadorId: eu.uid, bloqueadoId: uid, criadoEm: fb.serverTimestamp() });
    const ids = [eu.uid, uid].sort();
    await Promise.all([
      fb.deleteDoc(fb.doc(fb.db, "relacoes", `${eu.uid}_${uid}`)).catch(() => {}),
      fb.deleteDoc(fb.doc(fb.db, "relacoes", `${uid}_${eu.uid}`)).catch(() => {}),
      fb.deleteDoc(fb.doc(fb.db, "vinculos", `${ids[0]}_${ids[1]}`)).catch(() => {})
    ]);
    meusBloqueios.add(uid);
    meusSeguindo.delete(uid);
    ganchos.aposSeguir(); ganchos.aposBloqueio();
    toast(`${nome || "Conta"} bloqueada`);
    return true;
  } catch (e) { toast("Não foi possível bloquear: " + erroAmigavel(e)); return false; }
}
export async function desbloquear(uid) {
  try {
    await fb.deleteDoc(fb.doc(fb.db, "bloqueios", `${eu.uid}_${uid}`));
    meusBloqueios.delete(uid);
    ganchos.aposBloqueio();
    toast("Conta desbloqueada");
    return true;
  } catch (e) { toast("Não foi possível desbloquear: " + erroAmigavel(e)); return false; }
}
export async function alternarRestricao(uid, nome) {
  const restringir = !restritos.has(uid);
  if (restringir && !confirm(`Restringir ${nome || "esta pessoa"}?\n\nAs mensagens dela vão para "Restritas", sem notificação, e ela não vê quando você leu. Ela não será avisada.`)) return false;
  try {
    await fb.setDoc(refUsuario, { restritos: restringir ? fb.arrayUnion(uid) : fb.arrayRemove(uid) }, { merge: true });
    if (restringir) restritos.add(uid); else restritos.delete(uid);
    dados.restritos = [...restritos];
    ganchos.aposBloqueio();
    toast(restringir ? "Conta restrita" : "Restrição removida");
    return true;
  } catch (e) { toast("Não foi possível alterar: " + erroAmigavel(e)); return false; }
}

// ---------- seguir ----------
export let meusSeguindoPronto = Promise.resolve();
export function carregarMeusSeguindo() {
  // Quem você segue: cópia do aparelho por 15 min (seguir/deixar de seguir atualiza a cópia na hora).
  meusSeguindoPronto = docsComValidade(fb, "seguindo-" + eu.uid, fb.query(fb.collection(fb.db, "relacoes"), fb.where("tipo", "==", "seguir"), fb.where("seguidorId", "==", eu.uid), fb.limit(500)), 15 * 60000)
    .then((snap) => { meusSeguindo = new Set(snap.docs.map((d) => d.data().alvoId)); })
    .catch((e) => console.warn("Quem você segue:", e));
  return meusSeguindoPronto;
}
export async function alternarSeguir(uid) {
  const ref = fb.doc(fb.db, "relacoes", `${eu.uid}_${uid}`);
  if (meusSeguindo.has(uid)) { await fb.deleteDoc(ref); meusSeguindo.delete(uid); }
  else { await fb.setDoc(ref, { tipo: "seguir", seguidorId: eu.uid, alvoId: uid, criadoEm: fb.serverTimestamp() }); meusSeguindo.add(uid); }
  ganchos.aposSeguir();
  return meusSeguindo.has(uid);
}
export function botaoSeguir(uid, { meSegue = false, mini = true } = {}) {
  const b = document.createElement("button");
  b.type = "button";
  b.dataset.seguir = uid;
  b.pintar = () => {
    const sigo = meusSeguindo.has(uid);
    b.className = `btn ${mini ? "mini " : ""}${sigo ? "seguindo" : "pri"}`;
    b.textContent = sigo ? "Seguindo" : (meSegue ? "Seguir de volta" : "Seguir");
  };
  b.pintar();
  b.addEventListener("click", async (e) => {
    e.stopPropagation();
    b.disabled = true;
    try { await alternarSeguir(uid); }
    catch (err) { toast("Não foi possível seguir: " + erroAmigavel(err)); }
    finally { b.disabled = false; document.querySelectorAll("[data-seguir]").forEach((x) => x.pintar?.()); }
  });
  return b;
}
export function linhaPessoa({ uid, nome, foto, sub, quando, nova, meSegue, aoClicar, semSeguir, acoes }) {
  const l = document.createElement("div");
  l.className = "linha" + (nova ? " nova" : "");
  l.tabIndex = 0;
  l.setAttribute("role", "button");
  const av = document.createElement("div");
  av.className = "avatar";
  pintarAvatar(av, foto, nome);
  const t = document.createElement("div");
  t.className = "txt";
  const s = document.createElement("strong");
  s.textContent = nome || "Usuário";
  t.appendChild(s);
  if (sub) { const sm = document.createElement("small"); sm.textContent = sub; t.appendChild(sm); }
  l.append(av, t);
  if (quando) { const q = document.createElement("span"); q.className = "quando"; q.textContent = quando; l.appendChild(q); }
  if ((uid && uid !== eu.uid && !semSeguir) || acoes?.length) {
    const box = document.createElement("div");
    box.className = "acoes-linha";
    if (uid && uid !== eu.uid && !semSeguir) box.appendChild(botaoSeguir(uid, { meSegue }));
    (acoes || []).forEach((a) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `btn mini ${a.classe || "sec"}`;
      b.textContent = a.rotulo;
      b.addEventListener("click", async (e) => { e.stopPropagation(); b.disabled = true; try { await a.fn(b, l); } finally { b.disabled = false; } });
      box.appendChild(b);
    });
    l.appendChild(box);
  }
  const abrir = aoClicar || (() => ganchos.abrirPerfil(uid));
  l.addEventListener("click", abrir);
  l.addEventListener("keydown", (e) => { if (e.target === l && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); abrir(); } });
  return l;
}
export async function compartilharPerfil(uid, nome) {
  const url = `${location.origin}${location.pathname.replace(/[^/]*$/, "")}usuarios.html?perfil=${encodeURIComponent(uid)}`;
  try {
    if (navigator.share) { await navigator.share({ title: `${nome || "Perfil"} no Help Floripa`, url }); return; }
    await navigator.clipboard.writeText(url);
    toast("Link do perfil copiado");
  } catch (e) { if (e?.name !== "AbortError") toast("Não foi possível compartilhar."); }
}

// =====================================================
// Estrelas e comentários das publicações
// curtidas/{postId}_{uid}        { postId, uid, postAutorId, nota (1 a 5), criadoEm, atualizadoEm? }
// comentarios/{auto}             { postId, postAutorId, autorId, nome, foto, texto, respostaA?, respostaAutorId?, criadoEm, editadoEm?, oculto? }
// curtidas_comentarios/{cId}_{uid} { comentarioId, uid, criadoEm }
// =====================================================
const cacheEstrelas = new Map();   // postId -> { media, n, minha }
const cacheNComent = new Map();    // postId -> n
// Estrelas e nº de comentários de cada publicação: guardados no aparelho por 5 min
// (voltar ao diário não lê tudo de novo). O que a própria pessoa faz atualiza na hora.
const CONTADORES = "hf-contadores", CONT_VALIDADE = 5 * 60000;
let contadores = null;
function contador(k) {
  if (!contadores) { try { contadores = JSON.parse(localStorage.getItem(CONTADORES) || "{}") || {}; } catch { contadores = {}; } }
  const c = contadores[k];
  return c && Date.now() - c.em < CONT_VALIDADE ? c.v : undefined;
}
let gravandoCont = 0;
function guardarContador(k, v) {
  contador(k); contadores[k] = { v, em: Date.now() };
  clearTimeout(gravandoCont);
  gravandoCont = setTimeout(() => {
    const agora = Date.now();
    contadores = Object.fromEntries(Object.entries(contadores).filter(([, c]) => agora - c.em < CONT_VALIDADE).slice(-400));
    try { localStorage.setItem(CONTADORES, JSON.stringify(contadores)); } catch {}
  }, 300);
}
async function precisaEmail() {
  if (!emailPendente(eu)) return false;
  if (await conferirEmail(eu)) return false;
  toast(MSG_EMAIL);
  return true;
}
// ---------- estrelas das publicações ----------
// diario_notas/{postId} = { total, soma, n1..n5 }: o resumo muda junto com cada nota (mesma gravação) e as
// regras conferem a conta. Uma leitura mostra a média e a distribuição, com 10 ou 1 milhão de notas.
// Publicação sem resumo (de antes): conta no servidor quantas notas de cada (5 contagens, sem ler as notas).
const refResumo = (postId) => fb.doc(fb.db, "diario_notas", postId);
function resumoDe(d) {
  const dist = [1, 2, 3, 4, 5].map((k) => Math.max(0, Math.round(Number(d?.["n" + k]) || 0)));
  const total = dist.reduce((a, b) => a + b, 0);
  const soma = dist.reduce((a, q, i) => a + q * (i + 1), 0);
  return { total, soma, dist, media: total ? soma / total : 0 };
}
async function contarNotas(postId) {
  const col = fb.collection(fb.db, "curtidas");
  const c = await Promise.all([1, 2, 3, 4, 5].map((n) => fb.getCountFromServer(fb.query(col, fb.where("postId", "==", postId), fb.where("nota", "==", n))).then((x) => x.data().count)));
  return resumoDe({ n1: c[0], n2: c[1], n3: c[2], n4: c[3], n5: c[4] });
}
export async function lerResumoEstrelas(postId) {
  const s = await fb.getDoc(refResumo(postId)).catch(() => null);
  return s?.exists() ? { ...resumoDe(s.data()), comResumo: true } : { ...(await contarNotas(postId).catch(() => resumoDe({}))), comResumo: false };
}
// Vários resumos de uma vez (Principais): 30 por consulta. Sem resumo (publicação antiga) = sem notas.
export async function lerResumosEstrelas(ids) {
  const r = new Map();
  for (let i = 0; i < ids.length; i += 30) {
    const lote = ids.slice(i, i + 30);
    try {
      const s = await fb.getDocs(fb.query(fb.collection(fb.db, "diario_notas"), fb.where(fb.documentId(), "in", lote)));
      s.docs.forEach((d) => r.set(d.id, resumoDe(d.data())));
    } catch {}
  }
  return r;
}
export async function infoEstrelas(postId, { recarregar = false } = {}) {
  if (!recarregar && cacheEstrelas.has(postId)) return cacheEstrelas.get(postId);
  const guardado = recarregar ? undefined : contador("r:" + postId);
  const ref = fb.doc(fb.db, "curtidas", `${postId}_${eu.uid}`);
  const [res, minha] = await Promise.all([
    guardado ? guardado : lerResumoEstrelas(postId).then((r) => { guardarContador("r:" + postId, r); return r; }),
    // A sua nota: muda só quando você mesmo dá estrelas (a cópia do aparelho se atualiza na hora).
    (recarregar ? fb.getDoc(ref) : docComValidade(fb, ["curtidas", ref.id], 30 * 60000)).then((s) => (s.exists() ? Number(s.data().nota) || 0 : 0)).catch(() => 0)
  ]);
  const r = { media: res.media, n: res.total, dist: res.dist, comResumo: res.comResumo, minha };
  cacheEstrelas.set(postId, r);
  return r;
}
// De onde a pessoa está vendo (estatísticas do autor): principais, seguindo, amigos, perfil, link, tag, salvos.
export let origemAtual = "perfil";
export const definirOrigem = (o) => { origemAtual = o; };
// Alcance: marca uma vez por publicação (no aparelho e no servidor) que esta conta viu.
const vistasFeitas = new Set((() => { try { return JSON.parse(localStorage.getItem("hf-vistas") || "[]"); } catch { return []; } })());
export function marcarVista(post) {
  if (!post?.id || !eu || post.autorId === eu.uid || vistasFeitas.has(post.id)) return;
  vistasFeitas.add(post.id);
  try { localStorage.setItem("hf-vistas", JSON.stringify([...vistasFeitas].slice(-800))); } catch {}
  fb.setDoc(fb.doc(fb.db, "diario", post.id, "vistas", eu.uid), { criadoEm: fb.serverTimestamp(), origem: origemAtual }).catch(() => {});
}
// Dá, troca ou tira (nota 0) as estrelas: a nota e o resumo da publicação mudam na mesma gravação.
export async function darEstrelas(post, nota) {
  const ref = fb.doc(fb.db, "curtidas", `${post.id}_${eu.uid}`);
  if (nota && await precisaEmail()) return infoEstrelas(post.id);
  const velha = await fb.getDoc(ref).catch(() => null);
  const antes = velha?.exists() ? Number(velha.data().nota) || 0 : 0;
  if (antes === nota) return infoEstrelas(post.id, { recarregar: true });
  const gravarNota = (lote, comOrigem = true) => {
    if (!nota) lote.delete(ref);
    else if (antes) lote.update(ref, { nota, atualizadoEm: fb.serverTimestamp() });
    else lote.set(ref, { postId: post.id, uid: eu.uid, postAutorId: post.autorId, nota, criadoEm: fb.serverTimestamp(), ...(comOrigem ? { origem: origemAtual } : {}) });
  };
  const conta = { total: fb.increment((nota ? 1 : 0) - (antes ? 1 : 0)), soma: fb.increment(nota - antes) };
  if (antes) conta["n" + antes] = fb.increment(-1);
  if (nota) conta["n" + nota] = fb.increment(1);
  try {
    const lote = fb.writeBatch(fb.db);
    gravarNota(lote);
    lote.set(refResumo(post.id), conta, { merge: true });
    await lote.commit();
  } catch (e) {
    // Regras de antes no servidor (sem o resumo): grava só a nota, como era.
    if (e?.code !== "permission-denied") throw e;
    const lote = fb.writeBatch(fb.db);
    gravarNota(lote, false);
    await lote.commit();
  }
  return infoEstrelas(post.id, { recarregar: true });
}
export async function contarComentarios(postId, { recarregar = false } = {}) {
  if (!recarregar && cacheNComent.has(postId)) return cacheNComent.get(postId);
  const guardado = recarregar ? undefined : contador("c:" + postId);
  if (guardado !== undefined) { cacheNComent.set(postId, guardado); return guardado; }
  const n = await fb.getCountFromServer(fb.query(fb.collection(fb.db, "comentarios"), fb.where("postId", "==", postId))).then((s) => s.data().count).catch(() => 0);
  cacheNComent.set(postId, n); guardarContador("c:" + postId, n);
  return n;
}

// Cinco estrelas clicáveis: toque na 3ª = 3 estrelas; toque de novo na mesma = tira.
export function seletorEstrelas(post, { aoMudar } = {}) {
  const proprio = post.autorId === eu.uid;
  const box = el("div", "estrelas-post" + (proprio ? " proprio-post" : ""));
  // Todo mundo dá estrelas, inclusive na própria publicação ("se curtir"). As estrelas mostram a SUA nota;
  // ao lado, a média e quantas notas — tocar abre o resumo (quantas de 5 a 1 estrela).
  const linha = el("div", "estrelas-linha"); linha.setAttribute("role", "group");
  linha.setAttribute("aria-label", "Dar estrelas");
  const bots = [1, 2, 3, 4, 5].map((n) => {
    const b = el("button", "estrela", "★"); b.type = "button";
    b.setAttribute("aria-label", `${n} ${n === 1 ? "estrela" : "estrelas"}`);
    linha.appendChild(b);
    return b;
  });
  const txt = el("button", "estrelas-txt", ""); txt.type = "button";
  box.append(linha, txt);
  let info = { media: 0, n: 0, dist: [0, 0, 0, 0, 0], minha: 0 };
  const pintar = (i, previa = 0) => {
    info = i;
    const alvo = previa || i.minha;
    bots.forEach((b, k) => {
      b.classList.toggle("on", k < alvo);
      b.classList.toggle("minha", !previa && k < i.minha);
      b.setAttribute("aria-pressed", i.minha === k + 1 ? "true" : "false");
    });
    // A sua nota já entra na conta: nunca "Sem notas" com nota dada.
    const n = Math.max(i.n, i.minha ? 1 : 0), med = i.n ? i.media : i.minha;
    txt.replaceChildren();
    if (n) {
      txt.append(el("b", "med", med.toFixed(1).replace(".", ",")), el("span", "est-m", "★"), el("span", "qtd", `${numero(n)} ${n === 1 ? "nota" : "notas"}`), icone("avancar", "i xs"));
      txt.setAttribute("aria-label", `Média ${med.toFixed(1).replace(".", ",")} de 5, ${n} ${n === 1 ? "nota" : "notas"}${i.minha ? `, a sua: ${i.minha}` : ""}. Ver o resumo das estrelas`);
    } else {
      txt.append(el("span", "qtd", "Sem notas ainda"));
      txt.setAttribute("aria-label", "Sem notas ainda. Ver o resumo das estrelas");
    }
  };
  quandoVisivel(box, () => infoEstrelas(post.id).then((i) => pintar(i)));
  const erroEstrelas = (e) => (proprio && e?.code === "permission-denied"
    ? "Dar estrelas na própria publicação começa a funcionar quando as regras novas forem publicadas."
    : "Não foi possível salvar: " + erroAmigavel(e));
  const dar = async (nova, avisar = true) => {
    linha.classList.add("salvando");
    try {
      pintar(await darEstrelas(post, nova));
      if (avisar) toast(nova ? `Você deu ${nova} ${nova === 1 ? "estrela" : "estrelas"}` : "Nota removida");
      aoMudar?.(info);
      return true;
    } catch (e) { toast(erroEstrelas(e)); pintar(info); return false; }
    finally { linha.classList.remove("salvando"); }
  };
  bots.forEach((b, k) => {
    // Prévia só com mouse: no toque o "hover" fica preso e confundiria a nota.
    b.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") pintar(info, k + 1); });
    b.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") pintar(info); });
    b.addEventListener("click", () => dar(info.minha === k + 1 ? 0 : k + 1));
  });
  txt.addEventListener("click", () => abrirResumoEstrelas(post, { info, aoDar: (nova) => dar(nova) }));
  box.recarregar = () => infoEstrelas(post.id, { recarregar: true }).then((i) => pintar(i));
  // Toque duplo na foto: 5 estrelas de uma vez (nunca tira a nota, como o coração do Instagram).
  box.darRapido = async () => (info.minha === 5 ? true : (await dar(5, false)) && info.minha === 5);
  box.darNota = async (n) => (info.minha === n ? true : (await dar(n, false)) && info.minha === n);
  return box;
}

// Resumo das estrelas: média grande, quantas pessoas deram 5, 4, 3, 2 e 1 estrela (barras com %),
// a sua nota e, na sua publicação, quem deu cada nota (filtro por estrela, 30 por vez).
export async function abrirResumoEstrelas(post, { info = null, aoDar = null } = {}) {
  const f = criarFolha("folhaEstrelas", { titulo: "Estrelas da publicação", corpoClasse: "folha-corpo pad" });
  const corpo = $("c_folhaEstrelas");
  corpo.replaceChildren(el("div", "lista-vazia", "Carregando..."));
  abrirFolha("folhaEstrelas");
  const proprio = post.autorId === eu.uid;
  let r;
  try { r = await infoEstrelas(post.id, { recarregar: true }); }
  catch (e) { corpo.replaceChildren(el("div", "lista-vazia", "Não foi possível carregar: " + erroAmigavel(e))); return; }
  const total = r.n, minha = r.minha || info?.minha || 0;
  corpo.replaceChildren();
  // topo: média e total
  const topo = el("div", "est-topo");
  const grande = el("div", "est-grande");
  grande.append(el("strong", null, total ? r.media.toFixed(1).replace(".", ",") : "–"));
  const cinco = el("div", "est-cinco"); cinco.setAttribute("aria-hidden", "true");
  const cheio = el("div", "est-cheio"); cheio.style.width = `${(total ? r.media / 5 : 0) * 100}%`;
  cinco.append(el("span", null, "★★★★★"), cheio); cheio.appendChild(el("span", null, "★★★★★"));
  grande.append(cinco, el("small", null, total ? `${total.toLocaleString("pt-BR")} ${total === 1 ? "nota" : "notas"}` : "Ninguém deu estrelas ainda"));
  // barras 5 → 1
  const barras = el("div", "est-barras"); barras.setAttribute("role", "list");
  for (let k = 5; k >= 1; k--) {
    const q = r.dist[k - 1] || 0, pct = total ? Math.round((q / total) * 100) : 0;
    const l = el("button", "est-barra" + (proprio ? " clicavel" : "")); l.type = "button"; l.setAttribute("role", "listitem");
    l.setAttribute("aria-label", `${k} ${k === 1 ? "estrela" : "estrelas"}: ${q.toLocaleString("pt-BR")} (${pct}%)`);
    if (!proprio) l.disabled = true;
    const trilho = el("span", "trilho"); const enchido = el("i"); enchido.style.width = `${total ? (q / total) * 100 : 0}%`; trilho.appendChild(enchido);
    l.append(el("span", "rot", `${k} ★`), trilho, el("span", "qt", numero(q)), el("span", "pc", `${pct}%`));
    if (proprio) l.addEventListener("click", () => listarQuem(k));
    barras.appendChild(l);
  }
  topo.append(grande, barras);
  corpo.appendChild(topo);
  // a sua nota (dá para dar ou trocar daqui)
  const sua = el("div", "est-sua");
  sua.appendChild(el("span", null, minha ? `Sua nota: ${minha} ${minha === 1 ? "estrela" : "estrelas"}` : "Você ainda não deu estrelas"));
  if (aoDar) {
    const mini = el("div", "est-sua-btns");
    [1, 2, 3, 4, 5].forEach((k) => { const b = el("button", "estrela" + (k <= minha ? " on minha" : ""), "★"); b.type = "button"; b.setAttribute("aria-label", `Dar ${k} ${k === 1 ? "estrela" : "estrelas"}`); b.addEventListener("click", async () => { if (await aoDar(minha === k ? 0 : k)) abrirResumoEstrelas(post, { aoDar }); }); mini.appendChild(b); });
    sua.appendChild(mini);
  }
  corpo.appendChild(sua);
  if (!proprio) return;
  // Quem deu (só na sua publicação): primeiro quem você segue, depois quem é da sua rede (seguido por quem
  // você segue ou por seus seguidores), depois os demais. Vai carregando sozinho ao rolar.
  const titulo = el("h3", "est-quem-tit", "Quem deu estrelas");
  const chips = el("div", "est-chips"); chips.setAttribute("role", "group"); chips.setAttribute("aria-label", "Filtrar por estrelas");
  const lista = el("div", "est-quem");
  const fimLista = el("div", "est-fim"); fimLista.setAttribute("aria-hidden", "true");
  corpo.append(titulo, chips, lista, fimLista);
  const opcoes = [[0, "Todas"], [5, "5 ★"], [4, "4 ★"], [3, "3 ★"], [2, "2 ★"], [1, "1 ★"]];
  const bChips = opcoes.map(([k, rot]) => { const b = el("button", null, rot); b.type = "button"; b.addEventListener("click", () => listarQuem(k)); chips.appendChild(b); return [k, b]; });
  const rede = await minhaRede();
  let filtro = 0, fase = 0, mostrados = new Set(), ultimo = null, acabou = false, carregando = false, geracao = 0;
  const col = fb.collection(fb.db, "curtidas");
  const base = () => [fb.where("postId", "==", post.id), ...(filtro ? [fb.where("nota", "==", filtro)] : [])];
  async function porGrupo(uids) {
    const out = [];
    for (let i = 0; i < uids.length && i < 300; i += 30) {
      const s = await fb.getDocs(fb.query(col, ...base(), fb.where("uid", "in", uids.slice(i, i + 30)))).catch(() => ({ docs: [] }));
      out.push(...s.docs.map((d) => d.data()));
    }
    return out;
  }
  async function linhas(notas, por) {
    const novas = notas.filter((d) => d.uid && !mostrados.has(d.uid) && !escondido(d.uid));
    novas.forEach((d) => mostrados.add(d.uid));
    const perfis = await Promise.all(novas.map((d) => (d.uid === eu.uid ? Promise.resolve({ nome: "Você", fotoPerfil: dados.fotoPerfil }) : obterPerfil(d.uid).catch(() => ({})))));
    const pontes = await Promise.all(novas.map((d) => (rede.has(d.uid) && !meusSeguindo.has(d.uid) ? obterPerfil(rede.get(d.uid)).then((p) => String(p.nome || "alguém").split(" ")[0]).catch(() => "alguém") : "")));
    novas.forEach((d, i) => {
      const n = Math.max(0, Math.min(5, Number(d.nota) || 0));
      const quem = d.uid === eu.uid ? "" : meusSeguindo.has(d.uid) ? "Você segue" : pontes[i] ? `Seguido por ${pontes[i]}` : "";
      const l = linhaPessoa({ uid: d.uid, nome: perfis[i].nome || "Usuário", foto: perfis[i].fotoPerfil, sub: `${"★".repeat(n)}${"☆".repeat(5 - n)}  ${n} ${n === 1 ? "estrela" : "estrelas"}${quem ? " · " + quem : ""}`, semSeguir: d.uid === eu.uid });
      if (por) l.classList.add("da-rede");
      lista.appendChild(l);
    });
    return novas.length;
  }
  async function carregarMais() {
    if (carregando || acabou) return;
    carregando = true; const g = geracao;
    try {
      let n = 0;
      if (fase === 0) { const r = await porGrupo([...meusSeguindo]); if (g !== geracao) return; n += await linhas(r, true); fase = 1; }
      if (fase === 1 && n < 15) { const r = await porGrupo([...rede.keys()].filter((u) => !meusSeguindo.has(u))); if (g !== geracao) return; n += await linhas(r, true); fase = 2; }
      if (fase === 2) {
        while (n < 15 && !acabou) {
          const s = await fb.getDocs(fb.query(col, ...base(), ...(ultimo ? [fb.startAfter(ultimo)] : []), fb.limit(30)));
          if (g !== geracao) return;
          ultimo = s.docs.at(-1) || ultimo;
          n += await linhas(s.docs.map((d) => d.data()), false);
          if (s.size < 30) acabou = true;
        }
      }
      if (!lista.children.length) lista.appendChild(el("div", "lista-vazia", filtro ? `Ninguém deu ${filtro} ${filtro === 1 ? "estrela" : "estrelas"}.` : "Ninguém deu estrelas ainda."));
      fimLista.textContent = acabou ? "" : "Carregando...";
    } catch (e) { if (g === geracao) { lista.appendChild(el("div", "lista-vazia", "Não foi possível carregar: " + erroAmigavel(e))); acabou = true; } }
    finally { if (g === geracao) carregando = false; }
    // Ainda cabe na tela: carrega mais sem esperar rolar.
    if (!acabou && fimLista.getBoundingClientRect().top < innerHeight + 200) carregarMais();
  }
  function listarQuem(k) {
    filtro = k; fase = 0; mostrados = new Set(); ultimo = null; acabou = false; carregando = false; geracao++;
    bChips.forEach(([v, b]) => b.setAttribute("aria-pressed", String(v === k)));
    lista.replaceChildren();
    fimLista.textContent = "Carregando...";
    carregarMais();
    if (k) titulo.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const vigia = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) carregarMais(); }, { rootMargin: "300px" });
  vigia.observe(fimLista);
  f.addEventListener("fechada", () => vigia.disconnect(), { once: true });
  listarQuem(0);
}
// Sua rede (2º grau): quem é seguido por quem você segue ou por seus seguidores → uid de quem liga vocês.
let redeCache = null;
async function minhaRede() {
  if (redeCache) return redeCache;
  const r = new Map();
  try {
    const seguidores = await docsComValidade(fb, "seguidores-" + eu.uid, fb.query(fb.collection(fb.db, "relacoes"), fb.where("tipo", "==", "seguir"), fb.where("alvoId", "==", eu.uid), fb.limit(500)), 15 * 60000).then((s) => s.docs.map((d) => d.data().seguidorId)).catch(() => []);
    const ponte = [...new Set([...meusSeguindo].slice(0, 30).concat(seguidores.slice(0, 30)))].filter((u) => u !== eu.uid);
    for (let i = 0; i < ponte.length; i += 30) {
      const s = await fb.getDocs(fb.query(fb.collection(fb.db, "relacoes"), fb.where("tipo", "==", "seguir"), fb.where("seguidorId", "in", ponte.slice(i, i + 30)), fb.limit(400))).catch(() => ({ docs: [] }));
      for (const d of s.docs) {
        const { seguidorId, alvoId } = d.data();
        if (alvoId === eu.uid || r.has(alvoId)) continue;
        r.set(alvoId, seguidorId);
      }
    }
  } catch {}
  redeCache = r;
  return r;
}

// Toque duplo na foto: contagem de estrelas por cima da foto (1, 2, 3, 4...). Tocar de novo para parar: a
// nota é onde parou. Sem parar, na 5ª as estrelas se juntam numa estrela grande no meio da foto.
export function contadorEstrelas(alvo, darNota) {
  if (alvo.querySelector(".contagem")) return Promise.resolve(0);
  return new Promise((resolver) => {
    const box = el("div", "contagem"); box.setAttribute("role", "status"); box.setAttribute("aria-live", "polite");
    const linha = el("div", "cont-linha");
    const estrelas = [0, 1, 2, 3, 4].map((k) => { const e = el("span", null, "★"); e.style.setProperty("--dx", `${(2 - k) * 52}px`); linha.appendChild(e); return e; });
    const rotulo = el("div", "cont-rotulo", "Toque para parar");
    const grande = el("span", "estrela-pulo", "★"); grande.setAttribute("aria-hidden", "true");
    box.append(linha, rotulo);
    alvo.appendChild(box);
    let n = 0, timer = null, fim = false;
    const finalizar = async (nota, fundir) => {
      if (fim) return; fim = true; clearTimeout(timer);
      rotulo.textContent = `${nota} ${nota === 1 ? "estrela" : "estrelas"}`;
      box.classList.add(fundir ? "fundir" : "parou");
      if (fundir) { box.appendChild(grande); navigator.vibrate?.([10, 40, 20]); }
      const ok = await darNota(nota).catch(() => false);
      setTimeout(() => { box.classList.add("saindo"); setTimeout(() => box.remove(), 260); }, fundir ? 950 : 700);
      resolver(ok ? nota : 0);
    };
    const passo = () => {
      n++;
      estrelas[n - 1].classList.add("acesa");
      navigator.vibrate?.(6);
      if (n === 5) { setTimeout(() => finalizar(5, true), 260); return; }
      rotulo.textContent = `${n} · toque para parar`;
      timer = setTimeout(passo, 420);
    };
    box.addEventListener("click", (e) => { e.stopPropagation(); if (n > 0) finalizar(n, false); });
    timer = setTimeout(passo, 90);
  });
}

// Estrela grande que aparece no meio da foto (toque duplo).
export function estrelaNaFoto(alvo) {
  const s = el("span", "estrela-pulo", "★"); s.setAttribute("aria-hidden", "true");
  alvo.appendChild(s);
  setTimeout(() => s.remove(), 900);
}

// ---------- várias fotos numa publicação ----------
// midias: lista de fotos (2 a 4); mediaUrl continua sendo a primeira (telas antigas mostram ela).
export function fotosDoPost(post) {
  if (post.mediaTipo === "video") return [];
  const lista = Array.isArray(post.midias) && post.midias.length > 1 ? post.midias : [post.mediaUrl];
  return lista.map((u) => urlSegura(u)).filter(Boolean);
}
// Fotos lado a lado (deslizar), com pontinhos e "1/3". Toque simples e duplo separados.
export function carrosselFotos(urls, { alt = "Foto da publicação", aoToque, aoToqueDuplo } = {}) {
  const box = el("div", "carrossel" + (urls.length > 1 ? " varias" : ""));
  const trilho = el("div", "car-trilho");
  urls.forEach((u, i) => {
    const img = document.createElement("img"); img.src = u; img.alt = urls.length > 1 ? `${alt} (${i + 1} de ${urls.length})` : alt; img.loading = i ? "lazy" : "eager"; img.decoding = "async"; img.draggable = false;
    trilho.appendChild(img);
  });
  box.appendChild(trilho);
  if (urls.length > 1) {
    const cont = el("span", "car-cont", `1/${urls.length}`);
    const pontos = el("div", "car-pontos");
    const ps = urls.map((_, i) => { const p = el("i", i ? "" : "on"); pontos.appendChild(p); return p; });
    const seta = (dir) => { const b = el("button", "car-seta " + (dir < 0 ? "esq" : "dir")); b.type = "button"; b.setAttribute("aria-label", dir < 0 ? "Foto anterior" : "Próxima foto"); b.appendChild(icone(dir < 0 ? "voltar" : "avancar", "i s")); b.addEventListener("click", (e) => { e.stopPropagation(); trilho.scrollBy({ left: dir * trilho.clientWidth, behavior: "smooth" }); }); return b; };
    const esq = seta(-1), dir = seta(1);
    box.append(cont, pontos, esq, dir);
    const atual = () => Math.round(trilho.scrollLeft / Math.max(1, trilho.clientWidth));
    const pintar = () => { const i = Math.min(urls.length - 1, atual()); cont.textContent = `${i + 1}/${urls.length}`; ps.forEach((p, k) => p.classList.toggle("on", k === i)); esq.hidden = i === 0; dir.hidden = i === urls.length - 1; };
    trilho.addEventListener("scroll", () => requestAnimationFrame(pintar), { passive: true });
    pintar();
    box.indice = atual;
  }
  // Um toque espera um instante para ver se vem o segundo (toque duplo).
  let ultimo = 0, timer = null;
  trilho.addEventListener("click", (e) => {
    const agora = Date.now();
    if (agora - ultimo < 320) { clearTimeout(timer); ultimo = 0; aoToqueDuplo?.(e); return; }
    ultimo = agora;
    clearTimeout(timer);
    timer = setTimeout(() => aoToque?.(e), aoToqueDuplo ? 300 : 0);
  });
  return box;
}

// ---------- publicações salvas (usuarios/{uid}.salvos: só a própria pessoa vê) ----------
let salvos = null;
const listaSalvos = () => { if (!salvos) salvos = Array.isArray(dados?.salvos) ? dados.salvos.slice(-300) : []; return salvos; };
export const estaSalvo = (id) => listaSalvos().includes(id);
export const idsSalvos = () => listaSalvos().slice().reverse(); // mais recentes primeiro
export async function alternarSalvo(post) {
  const ja = estaSalvo(post.id);
  salvos = ja ? listaSalvos().filter((x) => x !== post.id) : [...listaSalvos(), post.id];
  try {
    await fb.setDoc(refUsuario, { salvos: ja ? fb.arrayRemove(post.id) : fb.arrayUnion(post.id) }, { merge: true });
    // Registro para o autor contar quantos salvaram (ele não vê quem). Sem as regras novas, só não conta.
    const reg = fb.doc(fb.db, "salvamentos", `${post.id}_${eu.uid}`);
    (ja ? fb.deleteDoc(reg) : fb.setDoc(reg, { postId: post.id, uid: eu.uid, postAutorId: post.autorId, criadoEm: fb.serverTimestamp() })).catch(() => {});
    toast(ja ? "Removida dos salvos" : "Publicação salva. Veja no seu Perfil → Salvos.");
    return !ja;
  } catch (e) {
    salvos = ja ? [...listaSalvos(), post.id] : listaSalvos().filter((x) => x !== post.id);
    toast("Não foi possível salvar: " + erroAmigavel(e));
    return ja;
  }
}

// Barra da publicação: estrelas, comentar e compartilhar.
export function barraInteracao(post, { aoComentar } = {}) {
  const barra = el("div", "interacoes");
  const est = seletorEstrelas(post);
  const bM = el("button", "acao"); bM.type = "button"; bM.setAttribute("aria-label", "Comentários");
  const nM = el("span", "n", "");
  bM.append(icone("chat", "i s"), nM);
  const bS = el("button", "acao"); bS.type = "button"; bS.setAttribute("aria-label", "Compartilhar");
  bS.append(icone("compartilhar", "i s"));
  const acoes = el("div", "acoes-post"); acoes.append(bM, bS);
  barra.append(est, acoes);
  const pintarN = (n) => { nM.textContent = n ? numero(n) : ""; };
  quandoVisivel(barra, () => contarComentarios(post.id).then(pintarN));
  bM.addEventListener("click", () => (aoComentar ? aoComentar() : abrirComentarios(post, { aoMudar: pintarN })));
  bS.addEventListener("click", () => compartilharPerfil(post.autorId, post.nome));
  barra.atualizarComentarios = pintarN;
  barra.estrelas = est;
  return barra;
}

export async function listarComentarios(postId) {
  const snap = await fb.getDocs(fb.query(fb.collection(fb.db, "comentarios"), fb.where("postId", "==", postId), fb.limit(300)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })).filter((c) => !escondido(c.autorId)).sort((a, b) => ms(a.criadoEm) - ms(b.criadoEm));
}
// Reações dos comentários (curtidas_comentarios/{comentarioId}_{uid}; sem "reacao" = curtida antiga, conta ❤️).
export const REACOES = ["❤️", "👍", "😂", "😮", "😢", "👏"];
async function reacoesDosComentarios(ids) {
  const r = new Map(ids.map((id) => [id, { n: 0, eu: null, por: new Map() }]));
  for (let i = 0; i < ids.length; i += 30) {
    const lote = ids.slice(i, i + 30);
    try {
      const s = await fb.getDocs(fb.query(fb.collection(fb.db, "curtidas_comentarios"), fb.where("comentarioId", "in", lote)));
      s.docs.forEach((d) => {
        const x = r.get(d.data().comentarioId); if (!x) return;
        const e = REACOES.includes(d.data().reacao) ? d.data().reacao : "❤️";
        x.n++; x.por.set(e, (x.por.get(e) || 0) + 1);
        if (d.data().uid === eu.uid) x.eu = e;
      });
    } catch {}
  }
  return r;
}
// Quem pode comentar (escolha do autor da publicação). As regras do servidor conferem a mesma coisa.
export const QUEM_COMENTA = { todos: "Todos", seguidores: "Só seguidores", mutuos: "Seguidores que você segue", ninguem: "Ninguém (comentários desativados)" };
const quemComentaDe = (post) => (post.comentariosOcultos === true ? "ninguem" : (QUEM_COMENTA[post.quemComenta] ? post.quemComenta : "todos"));
async function possoComentar(post) {
  const q = quemComentaDe(post);
  if (post.autorId === eu.uid || q === "todos") return { ok: true };
  if (q === "ninguem") return { ok: false, msg: "Os comentários desta publicação estão desativados." };
  const sigo = meusSeguindo.has(post.autorId);
  if (q === "seguidores") return sigo ? { ok: true } : { ok: false, msg: "Só seguidores podem comentar. Siga para comentar." };
  const meSegue = sigo && (await fb.getDoc(fb.doc(fb.db, "relacoes", `${post.autorId}_${eu.uid}`)).then((x) => x.exists()).catch(() => false));
  return meSegue ? { ok: true } : { ok: false, msg: "Só seguidores que o autor segue de volta podem comentar." };
}

// Comentários no estilo das redes sociais: o fixado no topo (o primeiro comentário fica fixado sozinho, até o
// autor escolher outro), depois os com mais engajamento (reações + respostas). Reações com emoji, respostas em
// fio, e o autor da publicação oculta, apaga, fixa e escolhe quem pode comentar.
export function montarComentarios(alvo, post, { aoMudar } = {}) {
  alvo.replaceChildren();
  const dono = post.autorId === eu.uid;
  const config = el("div", "coment-config");
  const aviso = el("div", "coment-aviso"); aviso.hidden = true;
  const lista = el("div", "comentarios");
  lista.appendChild(el("div", "lista-vazia", "Carregando comentários..."));
  const form = el("form", "novo-comentario");
  const resp = el("div", "respondendo"); resp.hidden = true;
  const respTx = el("span");
  const respX = el("button", "icone-btn"); respX.type = "button"; respX.setAttribute("aria-label", "Cancelar resposta"); respX.appendChild(icone("fechar", "i xs"));
  resp.append(respTx, respX);
  const linhaForm = el("div", "linha-form");
  const meuAv = el("div", "avatar"); pintarAvatar(meuAv, dados.fotoPerfil, dados.nome);
  const tx = el("textarea"); tx.maxLength = 500; tx.rows = 1; tx.placeholder = "Adicione um comentário...";
  tx.setAttribute("aria-label", "Seu comentário");
  const env = el("button", "coment-enviar"); env.type = "submit"; env.setAttribute("aria-label", "Publicar comentário"); env.textContent = "Publicar"; env.disabled = true;
  linhaForm.append(meuAv, tx, env);
  form.append(resp, linhaForm);
  alvo.append(config, aviso, lista, form);
  let respondendo = null;
  const ajustar = () => { tx.style.height = "auto"; tx.style.height = Math.min(140, tx.scrollHeight) + "px"; env.disabled = !tx.value.trim(); };
  tx.addEventListener("input", ajustar);
  const cancelarResposta = () => { respondendo = null; resp.hidden = true; tx.placeholder = "Adicione um comentário..."; };
  respX.addEventListener("click", cancelarResposta);

  // Configuração do autor: quem pode comentar.
  const pintarConfig = async () => {
    config.replaceChildren();
    const q = quemComentaDe(post);
    if (dono) {
      const b = el("button", "coment-quem"); b.type = "button";
      b.append(icone("chat", "i xs"), el("span", null, "Quem pode comentar: "), el("strong", null, QUEM_COMENTA[q].replace(" (comentários desativados)", "")), icone("avancar", "i xs"));
      b.addEventListener("click", () => abrirOpcoes("Quem pode comentar", Object.entries(QUEM_COMENTA).map(([k, rot]) => ({
        rotulo: rot + (k === q ? "  ✓" : ""), icone: k === "ninguem" ? "bloquear" : k === "todos" ? "teia" : "pessoa-mais",
        sub: k === "mutuos" ? "Quem segue você e você segue de volta" : k === "ninguem" ? "Ninguém comenta; os comentários ficam escondidos" : "",
        fn: async () => {
          try {
            await fb.updateDoc(fb.doc(fb.db, "diario", post.id), { quemComenta: k, comentariosOcultos: k === "ninguem" });
            post.quemComenta = k; post.comentariosOcultos = k === "ninguem";
            toast(k === "ninguem" ? "Comentários desativados" : `Agora: ${rot.toLowerCase()}`);
            pintarConfig().then(pintar);
          } catch (e) {
            // Regras de antes: só dá para desativar/ativar tudo.
            if (e?.code === "permission-denied" && (k === "ninguem" || k === "todos")) {
              try { await fb.updateDoc(fb.doc(fb.db, "diario", post.id), { comentariosOcultos: k === "ninguem" }); post.comentariosOcultos = k === "ninguem"; toast(k === "ninguem" ? "Comentários desativados" : "Comentários ativados"); pintarConfig().then(pintar); return; } catch {}
            }
            toast(e?.code === "permission-denied" ? "Essa opção começa a funcionar quando as regras novas forem publicadas." : "Não foi possível alterar: " + erroAmigavel(e));
          }
        }
      }))));
      config.appendChild(b);
      if (q === "ninguem") config.appendChild(el("span", "coment-nota", "Só você vê os comentários desta publicação."));
    }
    const pode = await possoComentar(post);
    form.hidden = !pode.ok;
    aviso.hidden = pode.ok || dono;
    aviso.textContent = pode.ok ? "" : pode.msg;
  };

  let reacoes = new Map();
  const pintar = async () => {
    let itens = [];
    try { itens = await listarComentarios(post.id); } catch { lista.replaceChildren(el("div", "lista-vazia", "Não foi possível carregar os comentários.")); return; }
    cacheNComent.set(post.id, itens.length); guardarContador("c:" + post.id, itens.length);
    const fechados = quemComentaDe(post) === "ninguem" && !dono;
    const visiveis = itens.filter((c) => dono || c.autorId === eu.uid || !c.oculto);
    aoMudar?.(fechados ? 0 : visiveis.filter((c) => !c.oculto).length);
    if (fechados) { lista.replaceChildren(); return; }
    if (!visiveis.length) { lista.replaceChildren(el("div", "lista-vazia coment-vazio", "Ainda não há comentários. Comece a conversa.")); return; }
    const porId = new Map(itens.map((c) => [c.id, c]));
    const raiz = (c) => { let x = c, k = 0; while (x.respostaA && porId.has(x.respostaA) && k++ < 20) x = porId.get(x.respostaA); return x; };
    reacoes = await reacoesDosComentarios(visiveis.map((c) => c.id));
    const raizes = visiveis.filter((c) => raiz(c) === c);
    const respostasDe = new Map(raizes.map((r) => [r.id, visiveis.filter((c) => c !== r && raiz(c) === r)]));
    // Fixado: o escolhido pelo autor; sem escolha, o primeiro comentário. "" = o autor tirou o fixado.
    const primeiro = raizes.slice().sort((a, b) => ms(a.criadoEm) - ms(b.criadoEm))[0];
    const fixoId = post.comentarioFixo === "" ? null : (post.comentarioFixo && raizes.some((r) => r.id === post.comentarioFixo) ? post.comentarioFixo : primeiro?.id);
    const engaj = (c) => (reacoes.get(c.id)?.n || 0) + 2 * (respostasDe.get(c.id)?.length || 0);
    raizes.sort((a, b) => (b.id === fixoId) - (a.id === fixoId) || engaj(b) - engaj(a) || ms(b.criadoEm) - ms(a.criadoEm));
    lista.replaceChildren();
    raizes.forEach((r) => {
      const fixo = r.id === fixoId;
      const bloco = el("div", "fio-coment" + (fixo ? " fixado" : ""));
      bloco.appendChild(linhaComentario(r, null, { fixo, autoFixo: fixo && !post.comentarioFixo }));
      const respostas = respostasDe.get(r.id).sort((a, b) => ms(a.criadoEm) - ms(b.criadoEm));
      if (respostas.length) {
        const sub = el("div", "respostas");
        const mostrar = (todas) => {
          sub.replaceChildren();
          (todas ? respostas : respostas.slice(0, 2)).forEach((c) => sub.appendChild(linhaComentario(c, c.respostaA !== r.id ? porId.get(c.respostaA) : null)));
          if (!todas && respostas.length > 2) { const mais = el("button", "ver-respostas", `Ver mais ${respostas.length - 2} ${respostas.length - 2 === 1 ? "resposta" : "respostas"}`); mais.type = "button"; mais.addEventListener("click", () => mostrar(true)); sub.appendChild(mais); }
        };
        mostrar(false);
        bloco.appendChild(sub);
      }
      lista.appendChild(bloco);
    });
  };

  async function reagir(c, emoji, pintarReacao) {
    const ref = fb.doc(fb.db, "curtidas_comentarios", `${c.id}_${eu.uid}`);
    const r = reacoes.get(c.id) || { n: 0, eu: null, por: new Map() };
    const antes = r.eu;
    const tirar = antes === emoji;
    try {
      if (tirar) await fb.deleteDoc(ref);
      else {
        if (await precisaEmail()) return;
        try {
          if (antes) await fb.updateDoc(ref, { reacao: emoji });
          else await fb.setDoc(ref, { comentarioId: c.id, uid: eu.uid, reacao: emoji, comentarioAutorId: c.autorId, criadoEm: fb.serverTimestamp() });
        } catch (e) {
          // Regras de antes: só curtida (sem emoji).
          if (e?.code !== "permission-denied" || antes) throw e;
          await fb.setDoc(ref, { comentarioId: c.id, uid: eu.uid, criadoEm: fb.serverTimestamp() });
          emoji = "❤️"; toast("Por enquanto conta como curtida. Os outros emojis chegam quando as regras novas forem publicadas.");
        }
      }
      if (antes) { r.por.set(antes, Math.max(0, (r.por.get(antes) || 1) - 1)); r.n--; }
      if (!tirar) { r.por.set(emoji, (r.por.get(emoji) || 0) + 1); r.n++; r.eu = emoji; } else r.eu = null;
      reacoes.set(c.id, r);
      pintarReacao();
    } catch (e) { toast("Não foi possível reagir: " + erroAmigavel(e)); }
  }

  function seletorReacao(c, ancora, pintarReacao) {
    document.querySelector(".reacao-pop")?.remove();
    const pop = el("div", "reacao-pop"); pop.setAttribute("role", "menu");
    REACOES.forEach((e, k) => {
      const b = el("button", (reacoes.get(c.id)?.eu === e ? "eu" : ""), e); b.type = "button"; b.style.setProperty("--k", k);
      b.setAttribute("aria-label", "Reagir com " + e);
      b.addEventListener("click", (ev) => { ev.stopPropagation(); pop.remove(); reagir(c, e, pintarReacao); });
      pop.appendChild(b);
    });
    document.body.appendChild(pop);
    const r = ancora.getBoundingClientRect(), rp = pop.getBoundingClientRect();
    pop.style.left = Math.max(8, Math.min(r.left, innerWidth - rp.width - 8)) + "px";
    pop.style.top = Math.max(8, r.top - rp.height - 8) + "px";
    const fora = (ev) => { if (!pop.contains(ev.target)) { pop.remove(); document.removeEventListener("pointerdown", fora, true); } };
    setTimeout(() => document.addEventListener("pointerdown", fora, true), 0);
  }

  function linhaComentario(c, paraQuem, { fixo = false, autoFixo = false } = {}) {
    const meu = c.autorId === eu.uid;
    const linha = el("div", "comentario" + (c.oculto ? " oculto" : ""));
    linha.dataset.id = c.id;
    const av = el("div", "avatar"); pintarAvatar(av, c.foto, c.nome);
    av.addEventListener("click", () => ganchos.abrirPerfil(c.autorId));
    const col = el("div", "col");
    const topo = el("div", "coment-topo");
    const nm = el("button", "coment-nome", c.nome || "Usuário"); nm.type = "button"; nm.addEventListener("click", () => ganchos.abrirPerfil(c.autorId));
    topo.appendChild(nm);
    if (c.autorId === post.autorId) topo.appendChild(el("span", "selo-autor", "Autor"));
    if (paraQuem) topo.appendChild(el("span", "para", `↪ ${paraQuem.nome || "usuário"}`));
    topo.appendChild(el("span", "coment-quando", tempoRelativo(paraData(c.criadoEm)) + (c.editadoEm ? " · editado" : "")));
    if (c.oculto) topo.appendChild(el("span", "etiqueta", meu && !dono ? "Oculto pelo autor" : "Oculto"));
    obterPerfil(c.autorId).then((p) => { if ((p.desativadaAte?.toMillis?.() ?? 0) > Date.now()) { linha.remove(); return; } if (p.nome) nm.textContent = p.nome; if (p.nome || p.fotoPerfil) pintarAvatar(av, p.fotoPerfil || c.foto, p.nome || c.nome); });
    const mais = el("button", "icone-btn coment-mais"); mais.type = "button"; mais.setAttribute("aria-label", "Opções do comentário"); mais.appendChild(icone("pontos", "i xs"));
    topo.appendChild(mais);
    const texto = comMencoes(el("p", "coment-texto"), c.texto);
    const acoes = el("div", "coment-acoes");
    const bReagir = el("button", "coment-reagir"); bReagir.type = "button";
    const resumo = el("button", "coment-reacoes"); resumo.type = "button"; resumo.setAttribute("aria-label", "Reações");
    const pintarReacao = () => {
      const r = reacoes.get(c.id) || { n: 0, eu: null, por: new Map() };
      bReagir.textContent = r.eu ? `${r.eu} Reagiu` : "Reagir";
      bReagir.classList.toggle("ativo", !!r.eu);
      const top = [...r.por.entries()].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
      resumo.hidden = !r.n;
      resumo.replaceChildren(el("span", "emojis", top.map(([e]) => e).join("")), el("span", "n", numero(r.n)));
    };
    pintarReacao();
    // Toque: escolher o emoji (ou tirar a reação); segurar / clique direito também abre a escolha.
    let segurar = null, abriu = false;
    bReagir.addEventListener("pointerdown", () => { abriu = false; segurar = setTimeout(() => { abriu = true; navigator.vibrate?.(12); seletorReacao(c, bReagir, pintarReacao); }, 420); });
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => bReagir.addEventListener(ev, () => clearTimeout(segurar)));
    bReagir.addEventListener("contextmenu", (e) => { e.preventDefault(); abriu = true; seletorReacao(c, bReagir, pintarReacao); });
    bReagir.addEventListener("click", () => { if (abriu) { abriu = false; return; } const r = reacoes.get(c.id); if (r?.eu) reagir(c, r.eu, pintarReacao); else seletorReacao(c, bReagir, pintarReacao); });
    resumo.addEventListener("click", () => seletorReacao(c, bReagir, pintarReacao));
    acoes.appendChild(bReagir);
    if (!form.hidden || dono) { const b = el("button", "coment-responder", "Responder"); b.type = "button"; b.addEventListener("click", () => { respondendo = c; respTx.textContent = `Respondendo a ${nm.textContent}`; resp.hidden = false; tx.placeholder = `Responder a ${nm.textContent}...`; tx.focus(); }); acoes.appendChild(b); }
    acoes.appendChild(resumo);
    // Menu ⋯: o que cada um pode fazer.
    mais.addEventListener("click", () => abrirOpcoes("Comentário", [
      dono && !c.respostaA && { rotulo: fixo ? "Tirar do topo" : "Fixar no topo", icone: "tacha", fn: async () => {
        const novo = fixo ? "" : c.id;
        try { await fb.updateDoc(fb.doc(fb.db, "diario", post.id), { comentarioFixo: novo }); post.comentarioFixo = novo; toast(novo ? "Comentário fixado no topo" : "Comentário tirado do topo"); pintar(); }
        catch (e) { toast(e?.code === "permission-denied" ? "Fixar começa a funcionar quando as regras novas forem publicadas." : "Não foi possível: " + erroAmigavel(e)); }
      } },
      meu && { rotulo: "Editar", icone: "lapis", fn: () => editar() },
      dono && !meu && { rotulo: c.oculto ? "Mostrar comentário" : "Ocultar comentário", sub: c.oculto ? "" : "Só você e quem escreveu continuam vendo", icone: c.oculto ? "olho" : "restringir", fn: async () => {
        try { await fb.updateDoc(fb.doc(fb.db, "comentarios", c.id), { oculto: !c.oculto }); toast(c.oculto ? "Comentário visível" : "Comentário oculto"); pintar(); }
        catch (e) { toast("Não foi possível alterar: " + erroAmigavel(e)); }
      } },
      !meu && { rotulo: "Denunciar", sub: "Ofensa, golpe, spam...", icone: "alerta", perigo: true, fn: () => abrirDenunciaComentario(c) },
      (meu || dono) && { rotulo: "Apagar comentário", icone: "lixo", perigo: true, fn: async () => {
        if (!confirm("Apagar este comentário?")) return;
        try { await fb.deleteDoc(fb.doc(fb.db, "comentarios", c.id)); toast("Comentário apagado"); pintar(); } catch (e) { toast("Não foi possível apagar: " + erroAmigavel(e)); }
      } }
    ]));
    function editar() {
      const ed = el("textarea", "editar"); ed.maxLength = 500; ed.value = c.texto;
      const ok = el("button", "btn pri mini", "Salvar"); ok.type = "button";
      const no = el("button", "btn sec mini", "Cancelar"); no.type = "button";
      const ae = el("div", "acoes-editar"); ae.append(ok, no);
      texto.replaceWith(ed); acoes.hidden = true; col.appendChild(ae);
      ed.focus();
      no.addEventListener("click", () => { ed.replaceWith(texto); ae.remove(); acoes.hidden = false; });
      ok.addEventListener("click", async () => {
        const novo = ed.value.trim();
        if (!novo) { ed.focus(); return; }
        ok.disabled = true;
        try { await fb.updateDoc(fb.doc(fb.db, "comentarios", c.id), { texto: novo, editadoEm: fb.serverTimestamp() }); toast("Comentário editado"); pintar(); }
        catch (e) { toast("Não foi possível salvar: " + erroAmigavel(e)); ok.disabled = false; }
      });
    }
    if (fixo) { const f = el("div", "coment-fixo"); f.append(icone("tacha", "i xs"), document.createTextNode(autoFixo ? "Primeiro comentário" : `Fixado por ${dono ? "você" : "o autor"}`)); col.appendChild(f); }
    col.append(topo, texto, acoes);
    linha.append(av, col);
    return linha;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const texto = tx.value.trim();
    if (!texto) return;
    if (await precisaEmail()) return;
    env.disabled = true;
    try {
      // A foto mostrada vem do perfil; aqui só um link curto (nunca a imagem inteira).
      const foto = urlSegura(dados.fotoPerfil).startsWith("https://") ? dados.fotoPerfil : "";
      const doc = { postId: post.id, postAutorId: post.autorId, autorId: eu.uid, nome: String(dados.nome || "Usuário").slice(0, 80), foto, texto: texto.slice(0, 500), criadoEm: fb.serverTimestamp() };
      if (respondendo) { doc.respostaA = respondendo.id; doc.respostaAutorId = respondendo.autorId; }
      await comRitmo(fb, eu.uid, "com", (lote) => lote.set(fb.doc(fb.collection(fb.db, "comentarios")), doc));
      tx.value = ""; ajustar();
      cancelarResposta();
      await pintar();
    } catch (err) { toast(err?.code === "permission-denied" ? "Você não pode comentar nesta publicação." : "Não foi possível comentar: " + erroAmigavel(err)); }
    finally { env.disabled = !tx.value.trim(); }
  });
  // A publicação pode ter vindo da cópia do aparelho: lê de novo as escolhas do autor (quem comenta, fixado).
  fb.getDoc(fb.doc(fb.db, "diario", post.id)).then((d) => {
    if (d.exists()) { const x = d.data(); post.quemComenta = x.quemComenta; post.comentarioFixo = x.comentarioFixo; post.comentariosOcultos = x.comentariosOcultos; }
  }).catch(() => {}).then(() => pintarConfig()).then(pintar);
  return { recarregar: pintar, focar: () => { if (!form.hidden) tx.focus(); } };
}
export function abrirComentarios(post, { aoMudar } = {}) {
  const f = criarFolha("folhaComentarios", { titulo: "Comentários", corpoClasse: "folha-corpo pad" });
  const corpo = $("c_folhaComentarios");
  corpo.replaceChildren();
  const area = el("div");
  corpo.append(acoesPublicacao(post), area);
  const c = montarComentarios(area, post, { aoMudar });
  abrirFolha("folhaComentarios");
  setTimeout(() => c.focar(), 160);
  return f;
}

// Barra de ações da publicação: salvar, enviar para amigos e compartilhar.
export function acoesPublicacao(post) {
  const barra = el("div", "pub-acoes");
  const bt = (icon, rot, fn) => { const b = el("button", "pub-acao"); b.type = "button"; b.append(icone(icon, "i s"), el("span", null, rot)); b.addEventListener("click", () => fn(b)); barra.appendChild(b); return b; };
  const pintarSalvo = (b) => { const s = estaSalvo(post.id); b.classList.toggle("on", s); b.lastChild.textContent = s ? "Salvo" : "Salvar"; b.setAttribute("aria-pressed", String(s)); };
  const bS = bt("salvo", "Salvar", async (b) => { await alternarSalvo(post); pintarSalvo(b); });
  pintarSalvo(bS);
  bt("enviar", "Enviar", () => enviarParaAmigos(post));
  bt("compartilhar", "Compartilhar", () => compartilharPublicacao(post));
  return barra;
}
export const linkPublicacao = (post) => `${location.origin}${location.pathname.replace(/[^/]*$/, "")}usuarios.html?post=${encodeURIComponent(post.id)}`;
export async function compartilharPublicacao(post) {
  const url = linkPublicacao(post);
  try {
    if (navigator.share) { await navigator.share({ title: `Publicação de ${post.nome || "Help Floripa"}`, text: String(post.texto || "").slice(0, 120), url }); return; }
    await navigator.clipboard.writeText(url);
    toast("Link da publicação copiado");
  } catch (e) { if (e?.name !== "AbortError") toast("Não foi possível compartilhar."); }
}
// Enviar a publicação para alguém pelo Mensagens (vai como cartão; tocar abre a publicação).
export async function enviarParaAmigos(post) {
  const corpo = abrirLista("Enviar para");
  const busca = el("input", "busca-enviar"); busca.type = "search"; busca.placeholder = "Buscar pessoas"; busca.setAttribute("aria-label", "Buscar pessoas");
  const box = el("div");
  corpo.append(busca, box);
  box.appendChild(el("div", "lista-vazia", "Carregando..."));
  // Primeiro com quem você conversou por último, depois quem você segue.
  const conv = await fb.getDocs(fb.query(fb.collection(fb.db, "conversas"), fb.where("participantes", "array-contains", eu.uid), fb.limit(40))).catch(() => ({ docs: [] }));
  const recentes = conv.docs.map((d) => d.data()).sort((a, b) => ms(b.atualizadoEm) - ms(a.atualizadoEm)).map((c) => (c.participantes || []).find((u) => u !== eu.uid)).filter(Boolean);
  const uids = [...new Set([...recentes, ...meusSeguindo])].filter((u) => u && !escondido(u)).slice(0, 80);
  const pessoas = await Promise.all(uids.map(async (u) => ({ uid: u, ...(await obterPerfil(u).catch(() => ({}))) })));
  const pintarLista = () => {
    const t = busca.value.trim().toLowerCase();
    box.replaceChildren();
    const l = pessoas.filter((p) => !t || String(p.nome || "").toLowerCase().includes(t) || String(p.nickname || "").toLowerCase().includes(t));
    if (!l.length) { box.appendChild(el("div", "lista-vazia", t ? "Ninguém encontrado." : "Siga pessoas ou converse com alguém para enviar.")); return; }
    l.forEach((p) => box.appendChild(linhaPessoa({ uid: p.uid, nome: p.nome, foto: p.fotoPerfil, sub: p.nickname ? "@" + p.nickname : "", semSeguir: true,
      acoes: [{ rotulo: "Enviar", classe: "pri", fn: async (b) => { if (b.dataset.enviado) return; await mandarPublicacao(post, p.uid); b.dataset.enviado = "1"; b.textContent = "Enviado ✓"; b.classList.replace("pri", "sec"); } }],
      aoClicar: () => {} })));
  };
  busca.addEventListener("input", pintarLista);
  pintarLista();
}
async function mandarPublicacao(post, uid) {
  if (await precisaEmail()) throw new Error("e-mail");
  const ids = [eu.uid, uid].sort(), id = `${ids[0]}_${ids[1]}`;
  const ref = fb.doc(fb.db, "conversas", id);
  try {
    let existe = false; try { existe = (await fb.getDoc(ref)).exists(); } catch {}
    if (!existe) await fb.setDoc(ref, { participantes: ids, ultimaMensagem: "", atualizadoEm: fb.serverTimestamp() }, { merge: true });
    const foto = fotosDoPost(post)[0] || "";
    const cartao = { tipo: "publicacao", titulo: String(post.texto || `Publicação de ${post.nome || "alguém"}`).slice(0, 120), sub: post.nome ? `Publicação de ${String(post.nome).slice(0, 60)}` : "", link: `usuarios.html?post=${post.id}`, ...(foto.startsWith("https://") ? { foto } : {}) };
    await comRitmo(fb, eu.uid, "msg", (lote) => lote.set(fb.doc(fb.collection(fb.db, "conversas", id, "mensagens")), { remetenteId: eu.uid, texto: "", tipoArquivo: "cartao", cartao, criadoEm: fb.serverTimestamp() }));
    // Resumo da conversa (como o Mensagens faz depois de enviar).
    fb.setDoc(ref, { ultimaMensagem: "Publicação", ultimaMensagemRemetenteId: eu.uid, atualizadoEm: fb.serverTimestamp(), falaram: { [eu.uid]: true } }, { merge: true }).catch(() => {});
    toast("Publicação enviada");
  } catch (e) { toast("Não foi possível enviar: " + erroAmigavel(e)); throw e; }
}

// =====================================================
// Nova publicação
// =====================================================
let pubMidia = null;
export function abrirCompositor({ aoPublicar } = {}) {
  if (!$("folhaPublicar")) {
    const f = criarFolha("folhaPublicar", { titulo: "Nova publicação", corpoClasse: "folha-corpo pad", rodape: true });
    $("c_folhaPublicar").innerHTML = `
      <div class="pub-autor"><div class="avatar" id="pubAvatar"></div><strong id="pubNome"></strong></div>
      <textarea class="pub-texto" id="pubTexto" maxlength="1000" placeholder="Compartilhe um trabalho, uma novidade ou uma dica..." aria-label="Texto da publicação"></textarea>
      <div class="pub-previa" id="pubPrevia" hidden></div>
      <div class="pub-extras" id="pubMarcados" hidden></div>
      <div class="pub-extras" id="pubAgenda" hidden></div>
      <div class="pub-ferramentas">
        <button type="button" class="icone-btn" id="pubFoto" aria-label="Adicionar foto (até 4)" title="Foto (até 4)"><svg class="i"><use href="#i-imagem"/></svg></button>
        <button type="button" class="icone-btn" id="pubVideo" aria-label="Adicionar vídeo curto (até 60 s)" title="Vídeo curto (até 60 s)"><svg class="i"><use href="#i-video"/></svg></button>
        <button type="button" class="icone-btn" id="pubMarcar" aria-label="Marcar pessoas" title="Marcar pessoas"><svg class="i"><use href="#i-pessoa-mais"/></svg></button>
        <button type="button" class="icone-btn" id="pubAgendar" aria-label="Agendar publicação" title="Agendar"><svg class="i"><use href="#i-relogio"/></svg></button>
        <button type="button" class="icone-btn" id="pubRascunhos" aria-label="Rascunhos" title="Rascunhos"><svg class="i"><use href="#i-rascunho"/></svg></button>
        <span class="cont" id="pubCont">0/1000</span>
      </div>
      <p class="pub-dica">Use <b>#hashtags</b> para aparecer nas buscas e <b>@nome</b> para mencionar.</p>
      <input type="file" id="pubArquivoFoto" accept="image/*" hidden />
      <input type="file" id="pubArquivoVideo" accept="video/*" hidden />`;
    $("r_folhaPublicar").innerHTML = `
      <button type="button" class="btn sec" id="pubSalvarRascunho">Salvar rascunho</button>
      <button type="button" class="btn pri" id="pubEnviar">Publicar</button>`;
    ligarCompositor();
    f.addEventListener("fechada", () => { if (!$("pubEnviar").disabled) limparPublicacao(); });
  }
  pintarAvatar($("pubAvatar"), dados.fotoPerfil, dados.nome);
  $("pubNome").textContent = dados.nome || "Você";
  $("pubVideo").hidden = !storageFns;
  $("folhaPublicar").aoPublicar = aoPublicar;
  pintarExtras();
  abrirFolha("folhaPublicar");
}
// @usuário vira link para o perfil (o @ é procurado em nicknames/ ao clicar).
// #hashtag: minúsculas, letras/números/_, até 30 (as mesmas das regras). Guardadas sem o # em diario.tags.
export function tagsDoTexto(texto) {
  const r = new Set();
  for (const m of String(texto || "").matchAll(/(^|[^\p{L}\p{N}_#])#([\p{L}\p{N}_]{1,30})/gu)) r.add(m[2].toLowerCase());
  return [...r].slice(0, 10);
}
export function comMencoes(alvo, texto) {
  alvo.replaceChildren();
  const re = /(^|[^\w@#])(?:@([a-z0-9._]{3,20})|#([\p{L}\p{N}_]{1,30}))/giu;
  let ultimo = 0, m;
  const t = String(texto || "");
  while ((m = re.exec(t))) {
    const ini = m.index + m[1].length;
    if (ini > ultimo) alvo.appendChild(document.createTextNode(t.slice(ultimo, ini)));
    if (m[3]) {
      const tag = m[3].toLowerCase();
      const a = document.createElement("a");
      a.href = `feed.html?tag=${encodeURIComponent(tag)}`; a.className = "hashtag"; a.textContent = "#" + m[3];
      a.addEventListener("click", (e) => e.stopPropagation());
      alvo.appendChild(a);
      ultimo = ini + 1 + m[3].length;
      continue;
    }
    const nick = m[2].toLowerCase().replace(/\.+$/, "");
    const a = document.createElement("a");
    a.href = "#"; a.className = "mencao"; a.textContent = "@" + nick;
    a.addEventListener("click", async (e) => {
      e.preventDefault(); e.stopPropagation();
      try { const s = await fb.getDoc(fb.doc(fb.db, "nicknames", nick)); if (s.exists()) ganchos.abrirPerfil(s.data().uid); else toast(`@${nick} não existe.`); }
      catch { toast("Não foi possível abrir o perfil."); }
    });
    alvo.appendChild(a);
    ultimo = ini + 1 + nick.length;
  }
  if (ultimo < t.length) alvo.appendChild(document.createTextNode(t.slice(ultimo)));
  return alvo;
}

// Denunciar um comentário (denuncias.js, carregado só quando precisa).
async function abrirDenunciaComentario(c) {
  const { abrirDenuncia } = await import("./denuncias.js?v=2");
  const p = await obterPerfil(c.autorId);
  abrirDenuncia({ fb, eu, tipo: "comentario", alvoId: c.autorId, itemId: c.id, trecho: c.texto || "", nomeAlvo: p.nome || c.nome || "",
    aoBloquear: () => bloquear(c.autorId, p.nome || c.nome) });
}

// Editar o texto de uma publicação própria (as regras marcam editadoEm).
export function editarPublicacao(post, aoSalvar) {
  const f = criarFolha("folhaEditarPost", { titulo: "Editar publicação", corpoClasse: "folha-corpo pad", rodape: true });
  if (!$("edPostTexto")) {
    $("c_folhaEditarPost").innerHTML = `<textarea class="pub-texto" id="edPostTexto" maxlength="1000" aria-label="Texto da publicação"></textarea><div class="pub-ferramentas"><span class="cont" id="edPostCont">0/1000</span></div>`;
    $("r_folhaEditarPost").innerHTML = `<button type="button" class="btn sec" data-fechar>Cancelar</button><button type="button" class="btn pri" id="edPostSalvar">Salvar</button>`;
    $("edPostTexto").addEventListener("input", () => { $("edPostCont").textContent = `${$("edPostTexto").value.length}/1000`; });
  }
  $("edPostTexto").value = post.texto || "";
  $("edPostCont").textContent = `${(post.texto || "").length}/1000`;
  const salvar = $("edPostSalvar").cloneNode(true);
  $("edPostSalvar").replaceWith(salvar);
  salvar.addEventListener("click", async () => {
    const texto = $("edPostTexto").value.trim();
    if (texto === (post.texto || "")) { fecharFolha("folhaEditarPost"); return; }
    if (!texto && !post.mediaUrl) { toast("A publicação não pode ficar vazia."); return; }
    salvar.disabled = true;
    try {
      await fb.updateDoc(fb.doc(fb.db, "diario", post.id), { texto, editadoEm: fb.serverTimestamp() });
      post.texto = texto; post.editadoEm = { toMillis: () => Date.now(), toDate: () => new Date() };
      fecharFolha("folhaEditarPost");
      toast("Publicação editada");
      aoSalvar?.(post);
    } catch (e) { toast("Não foi possível salvar: " + erroAmigavel(e)); }
    finally { salvar.disabled = false; }
  });
  abrirFolha("folhaEditarPost");
  setTimeout(() => $("edPostTexto").focus(), 150);
}

// Encolhe as fotos (lado e qualidade) até todas juntas caberem num documento.
async function caberNoDocumento(fotos, limite = 860000) {
  const total = () => fotos.reduce((a, f) => a + f.length, 0);
  if (total() <= limite) return fotos;
  const carregar = (u) => new Promise((ok, falha) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => falha(new Error("Não foi possível preparar a foto.")); im.src = u; });
  const imgs = await Promise.all(fotos.map(carregar));
  for (const [lado, q] of [[1080, 0.72], [960, 0.66], [840, 0.6], [720, 0.55], [600, 0.5], [480, 0.45]]) {
    fotos = imgs.map((im) => {
      const e = Math.min(1, lado / Math.max(im.naturalWidth, im.naturalHeight));
      const cv = document.createElement("canvas"); cv.width = Math.round(im.naturalWidth * e); cv.height = Math.round(im.naturalHeight * e);
      const cx = cv.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(im, 0, 0, cv.width, cv.height);
      return cv.toDataURL("image/jpeg", q);
    });
    if (total() <= limite) return fotos;
  }
  throw new Error("As fotos ficaram grandes demais juntas. Tente com menos fotos.");
}
// Extras da publicação: pessoas marcadas, data agendada e rascunho aberto.
let pubMarcados = [], pubAgenda = null, pubRascunhoId = null;
function pintarExtras() {
  const m = $("pubMarcados");
  m.replaceChildren();
  m.hidden = !pubMarcados.length;
  if (pubMarcados.length) {
    m.appendChild(el("span", "rot", "Com:"));
    pubMarcados.forEach((p, i) => {
      const c = el("span", "chip-extra"); c.append(document.createTextNode(p.nome));
      const x = el("button", null, "×"); x.type = "button"; x.setAttribute("aria-label", `Tirar ${p.nome}`);
      x.addEventListener("click", () => { pubMarcados.splice(i, 1); pintarExtras(); });
      c.appendChild(x); m.appendChild(c);
    });
  }
  const a = $("pubAgenda");
  a.replaceChildren();
  a.hidden = !pubAgenda;
  if (pubAgenda) {
    const c = el("span", "chip-extra agenda"); c.append(icone("relogio", "i xs"), document.createTextNode(`Agendada para ${pubAgenda.toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`));
    const x = el("button", null, "×"); x.type = "button"; x.setAttribute("aria-label", "Tirar o agendamento");
    x.addEventListener("click", () => { pubAgenda = null; pintarExtras(); });
    c.appendChild(x); a.appendChild(c);
  }
  $("pubEnviar").textContent = pubAgenda ? "Agendar" : "Publicar";
}
function limparPublicacao() {
  $("pubTexto").value = "";
  $("pubCont").textContent = "0/1000";
  if (pubMidia?.previa?.startsWith("blob:")) URL.revokeObjectURL(pubMidia.previa);
  pubMidia = null;
  pubMarcados = []; pubAgenda = null; pubRascunhoId = null;
  $("pubPrevia").hidden = true;
  $("pubPrevia").replaceChildren();
  pintarExtras();
}
// Marcar pessoas (até 10): quem você segue primeiro; a busca procura qualquer pessoa.
async function escolherMarcados() {
  const corpo = abrirLista("Marcar pessoas");
  const busca = el("input", "busca-enviar"); busca.type = "search"; busca.placeholder = "Buscar pessoas"; busca.setAttribute("aria-label", "Buscar pessoas");
  const box = el("div");
  corpo.append(busca, box);
  const seguindo = await Promise.all([...meusSeguindo].filter((u) => !escondido(u)).slice(0, 60).map(async (u) => ({ uid: u, ...(await obterPerfil(u).catch(() => ({}))) })));
  let tempo = null;
  const pintar = (lista) => {
    box.replaceChildren();
    if (!lista.length) { box.appendChild(el("div", "lista-vazia", busca.value.trim() ? "Ninguém encontrado." : "Busque pelo nome ou @.")); return; }
    lista.filter((p) => p.uid && p.uid !== eu.uid).forEach((p) => {
      const ja = pubMarcados.some((x) => x.uid === p.uid);
      box.appendChild(linhaPessoa({ uid: p.uid, nome: p.nome, foto: p.fotoPerfil || p.foto, sub: p.nickname ? "@" + p.nickname : "", semSeguir: true, aoClicar: () => {},
        acoes: [{ rotulo: ja ? "Marcado ✓" : "Marcar", classe: ja ? "sec" : "pri", fn: (b) => {
          const i = pubMarcados.findIndex((x) => x.uid === p.uid);
          if (i >= 0) pubMarcados.splice(i, 1);
          else { if (pubMarcados.length >= 10) { toast("No máximo 10 pessoas."); return; } pubMarcados.push({ uid: p.uid, nome: String(p.nome || "Usuário").split(" ")[0] }); }
          const marcado = i < 0;
          b.textContent = marcado ? "Marcado ✓" : "Marcar"; b.classList.toggle("pri", !marcado); b.classList.toggle("sec", marcado);
          pintarExtras();
        } }] }));
    });
  };
  pintar(seguindo);
  busca.addEventListener("input", () => {
    clearTimeout(tempo);
    const t = busca.value.trim();
    if (!t) { pintar(seguindo); return; }
    tempo = setTimeout(async () => {
      const { buscarPessoas } = await import("./pessoas.js?v=3");
      const achados = await buscarPessoas(fb, t, { limite: 20 }).catch(() => []);
      pintar(achados.map((p) => ({ uid: p.uid, nome: p.nome, fotoPerfil: p.fotoPerfil, nickname: p.nickname })));
    }, 250);
  });
}
// Agendar: data e hora (de 10 minutos a 60 dias).
function escolherAgenda() {
  const corpo = abrirLista("Agendar publicação");
  const minimo = new Date(Date.now() + 10 * 60000), maximo = new Date(Date.now() + 59 * 864e5);
  const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const campo = el("input", "busca-enviar"); campo.type = "datetime-local"; campo.min = iso(minimo); campo.max = iso(maximo);
  campo.value = iso(pubAgenda || new Date(Date.now() + 3600e3)); campo.setAttribute("aria-label", "Data e hora da publicação");
  const ok = el("button", "btn pri", "Agendar"); ok.type = "button";
  const nota = el("p", "pub-dica", "A publicação aparece para todos na hora escolhida. Até lá, só você vê (no seu perfil, marcada como agendada).");
  ok.addEventListener("click", () => {
    const d = new Date(campo.value);
    if (!(d > minimo - 60000 && d < maximo)) { toast("Escolha de 10 minutos a 59 dias a partir de agora."); return; }
    pubAgenda = d; pintarExtras(); fecharFolha("folhaLista");
  });
  corpo.append(campo, nota, ok);
}
// Rascunhos: rascunhos/{uid}/itens (texto e fotos; só você vê).
async function salvarRascunho() {
  const texto = $("pubTexto").value.trim();
  const fotos = pubMidia?.tipo === "image" ? pubMidia.fotos.slice(0, MAX_FOTOS) : [];
  if (!texto && !fotos.length) { toast("Escreva algo ou adicione uma foto para salvar o rascunho."); return; }
  const b = $("pubSalvarRascunho"); b.disabled = true;
  try {
    const cabem = fotos.length ? await caberNoDocumento(fotos, 860000) : [];
    const ref = pubRascunhoId ? fb.doc(fb.db, "rascunhos", eu.uid, "itens", pubRascunhoId) : fb.doc(fb.collection(fb.db, "rascunhos", eu.uid, "itens"));
    await fb.setDoc(ref, { texto, fotos: cabem, atualizadoEm: fb.serverTimestamp() });
    pubRascunhoId = ref.id;
    toast("Rascunho salvo. Abra em Rascunhos (ícone de folha) quando quiser.");
  } catch (e) { toast(e?.code === "permission-denied" ? "Rascunhos começam a funcionar quando as regras novas forem publicadas." : "Não foi possível salvar: " + erroAmigavel(e)); }
  finally { b.disabled = false; }
}
async function abrirRascunhos() {
  const corpo = abrirLista("Rascunhos");
  corpo.appendChild(el("div", "lista-vazia", "Carregando..."));
  try {
    const s = await fb.getDocs(fb.query(fb.collection(fb.db, "rascunhos", eu.uid, "itens"), fb.limit(30)));
    const itens = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => ms(b.atualizadoEm) - ms(a.atualizadoEm));
    corpo.replaceChildren();
    if (!itens.length) { corpo.appendChild(el("div", "lista-vazia", "Nenhum rascunho. Use \"Salvar rascunho\" para guardar uma publicação e terminar depois.")); return; }
    itens.forEach((r) => {
      const l = el("div", "rascunho");
      const th = el("div", "th"); if (r.fotos?.[0]) th.style.backgroundImage = `url("${r.fotos[0]}")`; else th.appendChild(icone("rascunho", "i"));
      const tx = el("div", "tx"); tx.append(el("strong", null, (r.texto || "Sem texto").slice(0, 80)), el("small", null, `${r.fotos?.length ? r.fotos.length + " foto(s) · " : ""}${tempoRelativo(paraData(r.atualizadoEm))}`));
      const abrir = el("button", "btn pri mini", "Abrir"); abrir.type = "button";
      const apagar = el("button", "icone-btn"); apagar.type = "button"; apagar.setAttribute("aria-label", "Apagar rascunho"); apagar.appendChild(icone("lixo", "i s"));
      abrir.addEventListener("click", () => {
        $("pubTexto").value = r.texto || ""; $("pubCont").textContent = `${(r.texto || "").length}/1000`;
        pubMidia = r.fotos?.length ? { tipo: "image", fotos: [...r.fotos] } : null;
        pubRascunhoId = r.id;
        mostrarPreviaPublicacao(); fecharFolha("folhaLista");
      });
      apagar.addEventListener("click", async () => { if (!confirm("Apagar este rascunho?")) return; await fb.deleteDoc(fb.doc(fb.db, "rascunhos", eu.uid, "itens", r.id)).catch(() => {}); l.remove(); if (pubRascunhoId === r.id) pubRascunhoId = null; });
      l.append(th, tx, abrir, apagar);
      corpo.appendChild(l);
    });
  } catch (e) { corpo.replaceChildren(el("div", "lista-vazia", e?.code === "permission-denied" ? "Rascunhos começam a funcionar quando as regras novas forem publicadas." : "Não foi possível abrir: " + erroAmigavel(e))); }
}
export const MAX_FOTOS = 4;
function mostrarPreviaPublicacao() {
  const box = $("pubPrevia");
  box.replaceChildren();
  box.classList.toggle("varias", pubMidia?.tipo === "image" && pubMidia.fotos.length > 1);
  if (!pubMidia) { box.hidden = true; return; }
  if (pubMidia.tipo === "image") {
    // Até 4 fotos: miniaturas com "x" em cada uma e o quadrado de adicionar mais.
    pubMidia.fotos.forEach((f, i) => {
      const it = el("div", "pub-foto");
      const im = document.createElement("img"); im.src = f; im.alt = `Foto ${i + 1}`;
      const x = el("button", "icone-btn"); x.type = "button"; x.setAttribute("aria-label", `Tirar a foto ${i + 1}`);
      x.appendChild(icone("fechar", "i s"));
      x.addEventListener("click", () => { pubMidia.fotos.splice(i, 1); if (!pubMidia.fotos.length) pubMidia = null; mostrarPreviaPublicacao(); });
      it.append(im, x);
      if (pubMidia.fotos.length > 1) it.appendChild(el("span", "pub-foto-n", String(i + 1)));
      box.appendChild(it);
    });
    if (pubMidia.fotos.length < MAX_FOTOS) {
      const mais = el("button", "pub-foto-mais"); mais.type = "button"; mais.setAttribute("aria-label", "Adicionar outra foto");
      mais.append(icone("mais", "i"), el("span", null, `${pubMidia.fotos.length}/${MAX_FOTOS}`));
      mais.addEventListener("click", () => $("pubArquivoFoto").click());
      box.appendChild(mais);
    }
    box.hidden = false;
    return;
  }
  const m = document.createElement(pubMidia.tipo === "video" ? "video" : "img");
  m.src = pubMidia.previa;
  if (pubMidia.tipo === "video") { m.controls = true; m.playsInline = true; } else m.alt = "Prévia";
  const x = el("button", "icone-btn"); x.type = "button"; x.setAttribute("aria-label", "Remover mídia");
  x.appendChild(icone("fechar", "i s"));
  x.addEventListener("click", () => { pubMidia = null; mostrarPreviaPublicacao(); });
  box.append(m, x);
  box.hidden = false;
}
function ligarCompositor() {
  $("pubTexto").addEventListener("input", () => { $("pubCont").textContent = `${$("pubTexto").value.length}/1000`; });
  $("pubFoto").addEventListener("click", () => $("pubArquivoFoto").click());
  $("pubVideo").addEventListener("click", () => $("pubArquivoVideo").click());
  $("pubMarcar").addEventListener("click", escolherMarcados);
  $("pubAgendar").addEventListener("click", escolherAgenda);
  $("pubRascunhos").addEventListener("click", abrirRascunhos);
  $("pubSalvarRascunho").addEventListener("click", salvarRascunho);
  $("pubArquivoFoto").addEventListener("change", async () => {
    const arquivo = $("pubArquivoFoto").files?.[0];
    $("pubArquivoFoto").value = "";
    if (!arquivo) return;
    if (pubMidia?.tipo === "image" && pubMidia.fotos.length >= MAX_FOTOS) { toast(`No máximo ${MAX_FOTOS} fotos por publicação.`); return; }
    try {
      const dataUrl = await editarImagem(arquivo, {
        titulo: "Enquadrar publicação",
        dica: "Escolha o formato e arraste a foto. A borda branca é o que aparece na publicação; deixe o principal dentro da margem segura (tracejada). Nos formatos quadrado e paisagem, o pontilhado azul mostra o recorte da miniatura no seu perfil.",
        formatos: [{ rotulo: "Retrato 4:5", proporcao: 4 / 5 }, { rotulo: "Quadrado 1:1", proporcao: 1 }, { rotulo: "Paisagem 16:9", proporcao: 16 / 9 }],
        miniatura: 4 / 5, larguraSaida: 1080, qualidade: 0.8, limiteBytes: LIMITE_DOC
      });
      if (!dataUrl) return;
      if (pubMidia?.tipo !== "image") pubMidia = { tipo: "image", fotos: [] };
      if (pubMidia.fotos.length >= MAX_FOTOS) { toast(`No máximo ${MAX_FOTOS} fotos por publicação.`); return; }
      pubMidia.fotos.push(dataUrl);
      mostrarPreviaPublicacao();
    } catch (e) { toast(erroAmigavel(e)); }
  });
  $("pubArquivoVideo").addEventListener("change", () => {
    const arquivo = $("pubArquivoVideo").files?.[0];
    $("pubArquivoVideo").value = "";
    if (!arquivo) return;
    if (arquivo.size > 50 * 1024 * 1024) { toast("O vídeo deve ter até 50 MB."); return; }
    // Vídeo curto: até 60 segundos.
    const previa = URL.createObjectURL(arquivo);
    const v = document.createElement("video"); v.preload = "metadata"; v.src = previa;
    v.onloadedmetadata = () => {
      if (v.duration > 61) { URL.revokeObjectURL(previa); toast(`O vídeo tem ${Math.round(v.duration)} s. No Diário, vídeos de até 60 segundos.`); return; }
      pubMidia = { tipo: "video", arquivo, previa, duracao: Math.round(v.duration) };
      mostrarPreviaPublicacao();
    };
    v.onerror = () => { URL.revokeObjectURL(previa); toast("Não foi possível ler este vídeo."); };
  });
  $("pubEnviar").addEventListener("click", async () => {
    const texto = $("pubTexto").value.trim();
    if (!texto && !pubMidia) { toast("Escreva algo ou adicione uma foto."); return; }
    if (await precisaEmail()) return;
    const btn = $("pubEnviar");
    btn.disabled = true; btn.textContent = "Publicando...";
    try {
      let mediaUrl = "", mediaTipo = "", midias = null;
      if (pubMidia?.tipo === "image") {
        // Sem Storage, as fotos vão dentro do documento (limite de ~1 MB): várias fotos encolhem para caber.
        let fotos = pubMidia.fotos.slice(0, MAX_FOTOS);
        if (fotos.length > 1 && !(storageFns && window.firebaseStorage)) fotos = await caberNoDocumento(fotos);
        const agora = Date.now();
        const urls = [];
        for (let i = 0; i < fotos.length; i++) urls.push(await salvarImagem(fotos[i], `diario/${eu.uid}/${agora}-${i}.jpg`));
        mediaUrl = urls[0]; mediaTipo = "image";
        if (urls.length > 1) midias = urls;
      } else if (pubMidia?.tipo === "video") {
        const ext = (pubMidia.arquivo.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "mp4";
        const r = storageFns.ref(window.firebaseStorage, `diario/${eu.uid}/${Date.now()}.${ext}`);
        await storageFns.uploadBytes(r, pubMidia.arquivo, { contentType: pubMidia.arquivo.type });
        mediaUrl = await storageFns.getDownloadURL(r);
        mediaTipo = "video";
      }
      const foto = urlSegura(dados.fotoPerfil).startsWith("https://") ? dados.fotoPerfil : "";
      const tags = tagsDoTexto(texto), marcados = pubMarcados.map((p) => p.uid);
      const agenda = pubAgenda && pubAgenda > new Date() ? fb.Timestamp.fromDate(pubAgenda) : null;
      const extras = { ...(tags.length ? { tags } : {}), ...(marcados.length ? { marcados } : {}), ...(agenda ? { agendadoPara: agenda } : {}) };
      const gravar = (novos) => comRitmo(fb, eu.uid, "pub", (lote) => {
        const r = fb.doc(fb.collection(fb.db, "diario"));
        lote.set(r, { autorId: eu.uid, nome: dados.nome || "Usuário", fotoPerfil: foto, texto, mediaUrl, mediaTipo, ...(novos && midias ? { midias } : {}), ...(novos ? extras : {}), criadoEm: fb.serverTimestamp() });
        return r;
      });
      let ref, semNovos = false;
      try { ref = await gravar(true); }
      catch (e) {
        // Regras antigas no servidor: publica sem os campos novos. Agendada não vai na hora: avisa e para.
        if (e?.code !== "permission-denied" || (!midias && !Object.keys(extras).length)) throw e;
        if (agenda) { toast("Agendar começa a funcionar quando as regras novas forem publicadas. Publique agora ou salve como rascunho."); return; }
        ref = await gravar(false); semNovos = true;
      }
      if (pubRascunhoId) fb.deleteDoc(fb.doc(fb.db, "rascunhos", eu.uid, "itens", pubRascunhoId)).catch(() => {});
      const post = { id: ref.id, autorId: eu.uid, nome: dados.nome, fotoPerfil: foto, texto, mediaUrl, mediaTipo, ...(!semNovos && midias ? { midias } : {}), ...(!semNovos ? extras : {}), criadoEm: null };
      btn.disabled = false;
      limparPublicacao();
      fecharFolha("folhaPublicar");
      toast(agenda ? `Agendada para ${agenda.toDate().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}. Até lá, só você vê.` : semNovos ? "Publicado. Várias fotos, hashtags e marcações começam a funcionar quando as regras novas forem publicadas." : "Publicado!");
      $("folhaPublicar").aoPublicar?.(post);
    } catch (e) {
      if (e?.code !== "limite-diario") console.error(e);
      toast("Não foi possível publicar: " + erroAmigavel(e));
    } finally { btn.disabled = false; btn.textContent = pubAgenda ? "Agendar" : "Publicar"; }
  });
}

// =====================================================
// Barra inferior da rede
// =====================================================
export function montarBarraRede(ativo) {
  if ($("barraRede")) return;
  const nav = el("nav", "barra-rede"); nav.id = "barraRede"; nav.setAttribute("aria-label", "Rede social");
  [["diario", "feed.html", "feed", "Diário"], ["mensagens", "mensagens.html", "chat", "Mensagens"], ["perfil", "usuarios.html", null, "Perfil"]].forEach(([k, href, ic, rot]) => {
    const a = el("a"); a.href = href;
    if (k === ativo) a.setAttribute("aria-current", "page");
    if (k === "perfil") { const av = el("span", "mini-av"); av.id = "barraAvatar"; a.append(av, el("span", null, rot)); }
    else a.append(icone(ic, "i"), el("span", null, rot));
    if (k === "mensagens") { const bd = el("b", "ponto-badge"); bd.id = "badgeMensagens"; bd.hidden = true; a.appendChild(bd); }
    nav.appendChild(a);
  });
  document.body.appendChild(nav);
  document.body.classList.add("com-barra");
}
export function pintarBarraRede() {
  const av = $("barraAvatar");
  if (av) pintarAvatar(av, dados.fotoPerfil, dados.nome);
}

// =====================================================
// Avisos (notificações): seguidores, pedidos do social, curtidas,
// comentários e mensagens. Alimenta o contador e a página de avisos.
// =====================================================
export const avisos = { seguidores: [], vinculos: [], curtidas: [], comentarios: [], respostas: [], reacoes: [], marcacoes: [], mensagens: [], reclamacoes: [], equipe: [] };
export let avisosVistosEm = 0;
const ouvintesAvisos = new Set();
export function aoMudarAvisos(fn) { ouvintesAvisos.add(fn); fn(avisos); }
function avisar() {
  const novos = contarNovos();
  const b = $("badgeAvisos");
  if (b) { b.hidden = !novos; b.textContent = novos > 99 ? "99+" : String(novos); }
  const bm = $("badgeMensagens");
  // Mensagens não lidas + respostas do suporte e avisos da equipe ainda não abertos.
  const nm = avisos.mensagens.length + avisos.equipe.filter((x) => x.naoLida).length;
  if (bm) { bm.hidden = !nm; bm.textContent = nm > 99 ? "99+" : String(nm); }
  ouvintesAvisos.forEach((fn) => fn(avisos));
}
export function contarNovos() {
  const t = (x) => x.quando > avisosVistosEm;
  return avisos.seguidores.filter(t).length + avisos.vinculos.filter((v) => v.pendente || t(v)).length + avisos.curtidas.filter(t).length + avisos.comentarios.filter(t).length + avisos.respostas.filter(t).length + avisos.reacoes.filter(t).length + avisos.marcacoes.filter(t).length + avisos.reclamacoes.filter(t).length + avisos.equipe.filter((x) => x.naoLida && t(x)).length;
}
// O painel de notificações (painel-avisos.js) marcou tudo como visto: zera o contador desta página.
addEventListener("hf:avisos-vistos", () => { avisosVistosEm = Date.now(); if (eu) avisar(); });
export function marcarAvisosVistos() {
  avisosVistosEm = Date.now();
  try { localStorage.setItem("hf-sino-" + eu.uid, JSON.stringify({ n: 0, visto: Date.now(), em: Date.now() })); } catch {} // o sino do topo fica zerado
  fb.setDoc(refUsuario, { notificacoesVistasEm: fb.serverTimestamp() }, { merge: true }).catch(() => {});
  avisar();
}
const TIPOS_VINCULO = { duo: "Duo", namoro: "Namorado(a)", casamento: "Cônjuge", melhor_amigo: "Melhor amigo(a)", amigo: "Amigo(a)", irmao: "Irmão(ã)", pai_mae: "Pai/Mãe", filho: "Filho(a)", primo: "Primo(a)", tio: "Tio(a)", sobrinho: "Sobrinho(a)", avo: "Avô/Avó", neto: "Neto(a)", parceiro: "Parceiro(a) de trabalho" };
export const rotuloVinculo = (t) => TIPOS_VINCULO[t] || "Vínculo";
let avisosLigados = false;
export function ouvirAvisos({ notificarNovos = true } = {}) {
  if (avisosLigados) return;
  avisosLigados = true;
  avisosVistosEm = ms(dados.notificacoesVistasEm);
  const perfilDe = async (uid) => { const p = await obterPerfil(uid); return { nome: p.nome || "Usuário", foto: p.fotoPerfil || "" }; };
  const ok = (uid) => uid && uid !== eu.uid && !escondido(uid) && !restritos.has(uid);
  const ouvir = (q, tratar) => {
    let primeira = true;
    fb.onSnapshot(q, async (snap) => {
      const antes = new Set();
      if (!primeira) snap.docChanges().filter((c) => c.type === "added" && !c.doc.metadata.hasPendingWrites).forEach((c) => antes.add(c.doc.id));
      await tratar(snap, primeira ? null : antes);
      primeira = false;
      avisar();
    }, (e) => console.warn("Avisos indisponíveis:", e));
  };
  // Seguidores
  ouvir(fb.query(fb.collection(fb.db, "relacoes"), fb.where("tipo", "==", "seguir"), fb.where("alvoId", "==", eu.uid), fb.limit(100)), async (snap, novos) => {
    const l = await Promise.all(snap.docs.map(async (d) => ({ id: d.id, uid: d.data().seguidorId, quando: ms(d.data().criadoEm), ...(await perfilDe(d.data().seguidorId)) })));
    avisos.seguidores = l.filter((x) => ok(x.uid));
    if (novos && notificarNovos) avisos.seguidores.filter((x) => novos.has(x.id)).forEach((x) => notificar("Novo seguidor", `${x.nome} começou a seguir você`, () => ganchos.abrirPerfil(x.uid)));
  });
  // Curtidas nas minhas publicações
  ouvir(fb.query(fb.collection(fb.db, "curtidas"), fb.where("postAutorId", "==", eu.uid), fb.limit(100)), async (snap, novos) => {
    const l = await Promise.all(snap.docs.filter((d) => Number(d.data().nota) > 0).map(async (d) => ({ id: d.id, uid: d.data().uid, postId: d.data().postId, nota: Number(d.data().nota), quando: Math.max(ms(d.data().criadoEm), ms(d.data().atualizadoEm)), ...(await perfilDe(d.data().uid)) })));
    avisos.curtidas = l.filter((x) => ok(x.uid));
    if (novos && notificarNovos) avisos.curtidas.filter((x) => novos.has(x.id)).forEach((x) => notificar("Novas estrelas", `${x.nome} deu ${x.nota} ${x.nota === 1 ? "estrela" : "estrelas"} na sua publicação`, () => { location.href = "notificacoes.html"; }));
  });
  // Comentários nas minhas publicações
  ouvir(fb.query(fb.collection(fb.db, "comentarios"), fb.where("postAutorId", "==", eu.uid), fb.limit(100)), async (snap, novos) => {
    avisos.comentarios = snap.docs.map((d) => { const c = d.data({ serverTimestamps: "estimate" }); return { id: d.id, uid: c.autorId, postId: c.postId, texto: c.texto, nome: c.nome || "Usuário", foto: c.foto || "", quando: ms(c.criadoEm) }; }).filter((x) => ok(x.uid));
    if (novos && notificarNovos) avisos.comentarios.filter((x) => novos.has(x.id)).forEach((x) => notificar("Novo comentário", `${x.nome}: ${x.texto}`, () => { location.href = "notificacoes.html"; }));
  });
  // Reações nos meus comentários
  ouvir(fb.query(fb.collection(fb.db, "curtidas_comentarios"), fb.where("comentarioAutorId", "==", eu.uid), fb.limit(100)), async (snap, novos) => {
    const l = await Promise.all(snap.docs.map(async (d) => ({ id: d.id, uid: d.data().uid, comentarioId: d.data().comentarioId, reacao: d.data().reacao || "❤️", quando: ms(d.data().criadoEm), ...(await perfilDe(d.data().uid)) })));
    avisos.reacoes = l.filter((x) => ok(x.uid));
    if (novos && notificarNovos) avisos.reacoes.filter((x) => novos.has(x.id)).forEach((x) => notificar("Reagiram ao seu comentário", `${x.nome} reagiu com ${x.reacao}`, () => { location.href = "notificacoes.html"; }));
  });
  // Publicações em que me marcaram
  ouvir(fb.query(fb.collection(fb.db, "diario"), fb.where("marcados", "array-contains", eu.uid), fb.limit(50)), async (snap, novos) => {
    const l = snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })).filter((p) => (p.agendadoPara?.toMillis?.() ?? 0) <= Date.now());
    avisos.marcacoes = (await Promise.all(l.map(async (p) => ({ id: p.id, uid: p.autorId, postId: p.id, quando: ms(p.criadoEm), ...(await perfilDe(p.autorId)) })))).filter((x) => ok(x.uid));
    if (novos && notificarNovos) avisos.marcacoes.filter((x) => novos.has(x.id)).forEach((x) => notificar("Marcaram você", `${x.nome} marcou você numa publicação`, () => { location.href = "notificacoes.html"; }));
  });
  // Respostas aos meus comentários (em qualquer publicação)
  ouvir(fb.query(fb.collection(fb.db, "comentarios"), fb.where("respostaAutorId", "==", eu.uid), fb.limit(100)), async (snap, novos) => {
    avisos.respostas = snap.docs.map((d) => { const c = d.data({ serverTimestamps: "estimate" }); return { id: d.id, uid: c.autorId, postId: c.postId, texto: c.texto, nome: c.nome || "Usuário", foto: c.foto || "", quando: ms(c.criadoEm) }; }).filter((x) => ok(x.uid));
    if (novos && notificarNovos) avisos.respostas.filter((x) => novos.has(x.id)).forEach((x) => notificar("Nova resposta", `${x.nome}: ${x.texto}`, () => { location.href = "notificacoes.html"; }));
  });
  // Pedidos do social (recebidos) e pedidos aceitos (enviados por mim)
  ouvir(fb.query(fb.collection(fb.db, "vinculos"), fb.where("participantes", "array-contains", eu.uid), fb.limit(60)), async (snap, novos) => {
    const rel = snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })).map((v) => {
      const outro = (v.participantes || []).find((x) => x !== eu.uid);
      return { ...v, outro, pendente: v.status !== "aceito" };
    }).filter((v) => !escondido(v.outro) && ((v.pendente && v.para === eu.uid) || (!v.pendente && v.de === eu.uid)));
    avisos.vinculos = await Promise.all(rel.map(async (v) => ({
      id: v.id, uid: v.outro, pendente: v.pendente, tipoParaMim: v.pendente ? v.tipoPara : v.tipoDe,
      quando: ms(v.pendente ? v.criadoEm : v.aceitoEm), ...(await perfilDe(v.outro))
    })));
    if (novos && notificarNovos) avisos.vinculos.filter((x) => novos.has(x.id) && x.pendente).forEach((x) => notificar("Novo pedido no social", `${x.nome} quer adicionar você como ${rotuloVinculo(x.tipoParaMim).toLowerCase()}`, () => { location.href = "notificacoes.html"; }));
  });
  // Reclamações: recebidas, respondidas e resolvidas.
  // Só avisa o que acontecer DEPOIS que a página abriu e ainda não foi visto, uma vez cada.
  // (As respostas chegam um pouco depois da primeira leitura; sem essa regra, as antigas
  // pareciam novas e o aviso voltava a cada página aberta.)
  const abertaEm = Date.now();
  const recAvisadas = new Set();
  ouvirReclamacoes(fb, fb.db, eu.uid, (itens) => {
    avisos.reclamacoes = itens.filter((x) => !x.uid || !escondido(x.uid));
    if (notificarNovos) avisos.reclamacoes
      .filter((x) => x.quando > abertaEm && x.quando > avisosVistosEm && !recAvisadas.has(x.id + ":" + x.quando))
      .forEach((x) => {
        recAvisadas.add(x.id + ":" + x.quando);
        notificar(x.tipo === "reclamacao" ? "Nova reclamação" : x.tipo === "reclamacao-resp" ? "Reclamação respondida" : "Reclamação resolvida",
          `${x.nome} ${TEXTO_RECLAMACAO[x.tipo](x)}`, () => { location.href = linkReclamacao(x, eu.uid); });
      });
    avisar();
  });
  // Avisos da equipe e respostas do suporte (Suporte Help Floripa)
  let primeiraEquipe = true;
  const equipeAvisadas = new Set();
  ouvirItensEquipe(fb, fb.db, eu.uid, (itens) => {
    if (!primeiraEquipe && notificarNovos) itens.filter((x) => x.naoLida && x.quando > avisosVistosEm && !equipeAvisadas.has(x.id + ":" + x.quando)).forEach((x) => {
      notificar(x.tipo === "aviso" ? "Aviso da equipe Help Floripa" : "Suporte Help Floripa", x.tipo === "aviso" ? x.titulo : `${TEXTO_EQUIPE(x)}: ${x.detalhe}`, () => { location.href = linkEquipe(x); });
    });
    itens.forEach((x) => equipeAvisadas.add(x.id + ":" + x.quando));
    primeiraEquipe = false;
    avisos.equipe = itens;
    avisar();
  });
  // Mensagens não lidas
  const vistas = new Map();
  let primeiraConv = true;
  fb.onSnapshot(fb.query(fb.collection(fb.db, "conversas"), fb.where("participantes", "array-contains", eu.uid), fb.limit(60)), async (snap) => {
    const lista = await Promise.all(snap.docs.map(async (d) => {
      const c = d.data({ serverTimestamps: "estimate" });
      const outro = (c.participantes || []).find((x) => x !== eu.uid);
      const lido = Math.max(ms(c.lidoEm?.[eu.uid]), ms(c.vistoEm?.[eu.uid]), ms(c.ocultaPara?.[eu.uid]));
      const naoLida = ok(outro) && !!c.ultimaMensagemRemetenteId && c.ultimaMensagemRemetenteId !== eu.uid && ms(c.atualizadoEm) > lido;
      return { id: d.id, uid: outro, ultimaMensagem: c.ultimaMensagem || "", quando: ms(c.atualizadoEm), naoLida, silenciada: !!c.silenciadaPara?.[eu.uid], ...(naoLida ? await perfilDe(outro) : {}) };
    }));
    lista.forEach((c) => {
      const antes = vistas.get(c.id);
      if (!primeiraConv && notificarNovos && c.naoLida && !c.silenciada && (antes === undefined || c.quando > antes)) notificar(`Mensagem de ${c.nome}`, c.ultimaMensagem, () => { location.href = `mensagens.html?conversa=${encodeURIComponent(c.id)}`; });
      vistas.set(c.id, c.quando);
    });
    primeiraConv = false;
    avisos.mensagens = lista.filter((c) => c.naoLida);
    avisar();
  }, (e) => console.warn("Mensagens indisponíveis:", e));
}

// =====================================================
// Presença (online / visto por último nas mensagens)
// =====================================================
export function marcarPresenca() {
  if (!eu || document.hidden) return;
  fb.setDoc(fb.doc(fb.db, "perfis_publicos", eu.uid), { uid: eu.uid, ultimoAcesso: config.mostrarOnline === false ? null : fb.serverTimestamp() }, { merge: true }).catch(() => {});
}
// Fora das mensagens, a cada 8 minutos (só com a aba visível); nas mensagens, a cada 4.
// "Online" nas mensagens = sinal nos últimos 9 minutos.
setInterval(marcarPresenca, 8 * 60000);
document.addEventListener("visibilitychange", marcarPresenca);

export { editarImagem, conferirEmail, emailPendente, MSG_EMAIL };
