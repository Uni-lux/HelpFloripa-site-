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
import { editarImagem, dataUrlParaBlob } from "./editor-imagem.js?v=5";
import { conferirEmail, emailPendente, MSG_EMAIL, midiaSegura } from "./seguranca.js?v=1";
import { ouvirReclamacoes, TEXTO_RECLAMACAO, linkReclamacao } from "./avisos-reclamacoes.js?v=1";

// ---------- ícones ----------
const SIMBOLOS = `<symbol id="i-casa" viewBox="0 0 24 24"><path d="M4 10.5L12 4l8 6.5V19a1.5 1.5 0 01-1.5 1.5H15v-6h-6v6H5.5A1.5 1.5 0 014 19z"/></symbol>
<symbol id="i-fio" viewBox="0 0 24 24"><path d="M3 15c3-6 6 4 9-2s6 4 9-2"/><circle cx="12" cy="13" r="1.6" fill="currentColor"/></symbol>
<symbol id="i-coracao" viewBox="0 0 24 24"><path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0112 7.3 4.3 4.3 0 0119.5 10c0 5.6-7.5 10-7.5 10z"/></symbol>
<symbol id="i-bloquear" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/></symbol>
<symbol id="i-restringir" viewBox="0 0 24 24"><path d="M12 3.5l7 3v5.2c0 4.2-2.9 7.6-7 8.8-4.1-1.2-7-4.6-7-8.8V6.5z"/><path d="M9 12h6"/></symbol>
<symbol id="i-pessoa-menos" viewBox="0 0 24 24"><circle cx="10" cy="8.5" r="3.8"/><path d="M3.5 20c1-3.4 3.6-5.3 6.5-5.3 1.4 0 2.7.4 3.8 1.2M15 16h6"/></symbol>
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
<symbol id="i-servicos" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.8-3.8a6 6 0 01-7.9 7.9l-6.9 6.9a2.1 2.1 0 01-3-3l6.9-6.9a6 6 0 017.9-7.9z"/></symbol>
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
  if (e?.code === "permission-denied") return emailPendente(eu) ? MSG_EMAIL : "Sem permissão para fazer isso.";
  if (e?.code === "unavailable") return "Sem conexão com o servidor. Verifique sua internet.";
  return e?.message && !e.code ? e.message : "Algo deu errado. Tente novamente.";
}
let audioCtx = null;
export function tocarSom() {
  if (config.sons === false) return;
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
// Ganchos que cada página pode trocar.
export const ganchos = {
  abrirPerfil: (uid) => { if (uid) location.href = uid === eu?.uid ? "usuarios.html" : `usuarios.html?perfil=${encodeURIComponent(uid)}`; },
  aposSeguir: () => {},
  aposBloqueio: () => {}
};

export function obterPerfil(uid) {
  if (!uid) return Promise.resolve({});
  if (!perfis.has(uid)) perfis.set(uid, fb.getDoc(fb.doc(fb.db, "perfis_publicos", uid)).then((s) => (s.exists() ? s.data() : {})).catch(() => ({})));
  return perfis.get(uid);
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
  dados.email = dados.email || eu.email || "";
  dados.cidade = dados.cidade || dados.cidadeNome || "";
  // Privacidade do social e do duo ficam no perfil público: lê ANTES de sincronizar,
  // senão a leitura pega só os campos da gravação pendente e volta tudo para o padrão.
  const pubSnap = await fb.getDoc(fb.doc(fb.db, "perfis_publicos", eu.uid)).catch(() => null);
  const pub = pubSnap?.exists() ? pubSnap.data() : {};
  if (pub.socialVisibilidade) dados.socialVisibilidade = pub.socialVisibilidade;
  if (pub.duoCapa) dados.duoCapa = pub.duoCapa;
  if (sincronizar) {
    fb.setDoc(fb.doc(fb.db, "perfis_publicos", eu.uid), {
      uid: eu.uid, nome: dados.nome, nickname: dados.nickname || "", cidade: dados.cidade,
      fotoPerfil: dados.fotoPerfil || "", fotoCapa: dados.fotoCapa || "", bio: dados.bio || ""
    }, { merge: true }).catch((e) => console.warn("Perfil público não sincronizado:", e));
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
    fb.getDocs(fb.query(col, fb.where("bloqueadorId", "==", eu.uid))).catch(() => null),
    fb.getDocs(fb.query(col, fb.where("bloqueadoId", "==", eu.uid))).catch(() => null)
  ]);
  meusBloqueios = new Set(meus ? meus.docs.map((d) => d.data().bloqueadoId) : []);
  bloqueadoPor = new Set(deles ? deles.docs.map((d) => d.data().bloqueadorId) : []);
  restritos = new Set(Array.isArray(dados.restritos) ? dados.restritos : []);
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
  if (!confirm(`Bloquear ${nome || "esta pessoa"}?\n\nVocês deixam de se seguir, ela não poderá ver seu perfil, seguir você nem enviar mensagens. Ela não será avisada.`)) return false;
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
  meusSeguindoPronto = fb.getDocs(fb.query(fb.collection(fb.db, "relacoes"), fb.where("tipo", "==", "seguir"), fb.where("seguidorId", "==", eu.uid), fb.limit(500)))
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
async function precisaEmail() {
  if (!emailPendente(eu)) return false;
  if (await conferirEmail(eu)) return false;
  toast(MSG_EMAIL);
  return true;
}
export async function infoEstrelas(postId, { recarregar = false } = {}) {
  if (!recarregar && cacheEstrelas.has(postId)) return cacheEstrelas.get(postId);
  const q = fb.query(fb.collection(fb.db, "curtidas"), fb.where("postId", "==", postId));
  const [ag, minha] = await Promise.all([
    fb.getAggregateFromServer(q, { soma: fb.sum("nota"), media: fb.average("nota") }).then((s) => s.data()).catch(() => ({ soma: 0, media: null })),
    fb.getDoc(fb.doc(fb.db, "curtidas", `${postId}_${eu.uid}`)).then((s) => (s.exists() ? Number(s.data().nota) || 0 : 0)).catch(() => 0)
  ]);
  const media = Number(ag.media) || 0;
  const r = { media, n: media ? Math.round((Number(ag.soma) || 0) / media) : 0, minha };
  cacheEstrelas.set(postId, r);
  return r;
}
// Dá, troca ou tira (nota 0) as estrelas de uma publicação.
export async function darEstrelas(post, nota) {
  const ref = fb.doc(fb.db, "curtidas", `${post.id}_${eu.uid}`);
  const atual = (await infoEstrelas(post.id)).minha;
  if (!nota) await fb.deleteDoc(ref);
  else {
    if (await precisaEmail()) return infoEstrelas(post.id);
    if (atual) await fb.updateDoc(ref, { nota, atualizadoEm: fb.serverTimestamp() });
    else {
      const velha = await fb.getDoc(ref).catch(() => null);
      if (velha?.exists()) await fb.updateDoc(ref, { nota, atualizadoEm: fb.serverTimestamp() });
      else await fb.setDoc(ref, { postId: post.id, uid: eu.uid, postAutorId: post.autorId, nota, criadoEm: fb.serverTimestamp() });
    }
  }
  return infoEstrelas(post.id, { recarregar: true });
}
export async function contarComentarios(postId, { recarregar = false } = {}) {
  if (!recarregar && cacheNComent.has(postId)) return cacheNComent.get(postId);
  const n = await fb.getCountFromServer(fb.query(fb.collection(fb.db, "comentarios"), fb.where("postId", "==", postId))).then((s) => s.data().count).catch(() => 0);
  cacheNComent.set(postId, n);
  return n;
}

// Cinco estrelas clicáveis: toque na 3ª = 3 estrelas; toque de novo na mesma = tira.
export function seletorEstrelas(post, { aoMudar } = {}) {
  const box = el("div", "estrelas-post");
  const proprio = post.autorId === eu.uid;
  const linha = el("div", "estrelas-linha"); linha.setAttribute("role", proprio ? "img" : "group");
  linha.setAttribute("aria-label", proprio ? "Estrelas da sua publicação" : "Dar estrelas");
  const bots = [1, 2, 3, 4, 5].map((n) => {
    const b = el("button", "estrela", "★"); b.type = "button";
    b.setAttribute("aria-label", `${n} ${n === 1 ? "estrela" : "estrelas"}`);
    if (proprio) { b.disabled = true; b.tabIndex = -1; }
    linha.appendChild(b);
    return b;
  });
  const txt = el("span", "estrelas-txt", "");
  box.append(linha, txt);
  let info = { media: 0, n: 0, minha: 0 };
  const pintar = (i, previa = 0) => {
    info = i;
    const alvo = previa || (proprio ? Math.round(i.media) : i.minha);
    bots.forEach((b, k) => {
      b.classList.toggle("on", k < alvo);
      b.classList.toggle("minha", !proprio && !previa && k < i.minha);
      b.setAttribute("aria-pressed", !proprio && i.minha === k + 1 ? "true" : "false");
    });
    const media = i.n ? `${i.media.toFixed(1).replace(".", ",")} · ${i.n} ${i.n === 1 ? "nota" : "notas"}` : "Sem notas";
    txt.textContent = !proprio && i.minha ? `Sua nota: ${i.minha} · ${media}` : media;
  };
  infoEstrelas(post.id).then((i) => pintar(i));
  if (!proprio) {
    bots.forEach((b, k) => {
      // Prévia só com mouse: no toque o "hover" fica preso e confundiria a nota.
      b.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") pintar(info, k + 1); });
      b.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") pintar(info); });
      b.addEventListener("click", async () => {
        const nova = info.minha === k + 1 ? 0 : k + 1;
        linha.classList.add("salvando");
        try {
          pintar(await darEstrelas(post, nova));
          toast(nova ? `Você deu ${nova} ${nova === 1 ? "estrela" : "estrelas"}` : "Nota removida");
          aoMudar?.(info);
        } catch (e) { toast("Não foi possível salvar: " + erroAmigavel(e)); pintar(info); }
        finally { linha.classList.remove("salvando"); }
      });
    });
  }
  box.recarregar = () => infoEstrelas(post.id, { recarregar: true }).then((i) => pintar(i));
  return box;
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
  contarComentarios(post.id).then(pintarN);
  bM.addEventListener("click", () => (aoComentar ? aoComentar() : abrirComentarios(post, { aoMudar: pintarN })));
  bS.addEventListener("click", () => compartilharPerfil(post.autorId, post.nome));
  barra.atualizarComentarios = pintarN;
  return barra;
}

export async function listarComentarios(postId) {
  const snap = await fb.getDocs(fb.query(fb.collection(fb.db, "comentarios"), fb.where("postId", "==", postId), fb.limit(300)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })).filter((c) => !escondido(c.autorId)).sort((a, b) => ms(a.criadoEm) - ms(b.criadoEm));
}
async function curtidasDosComentarios(ids) {
  const r = new Map(ids.map((id) => [id, { n: 0, eu: false }]));
  for (let i = 0; i < ids.length; i += 30) {
    const lote = ids.slice(i, i + 30);
    try {
      const s = await fb.getDocs(fb.query(fb.collection(fb.db, "curtidas_comentarios"), fb.where("comentarioId", "in", lote)));
      s.docs.forEach((d) => { const x = r.get(d.data().comentarioId); if (x) { x.n++; if (d.data().uid === eu.uid) x.eu = true; } });
    } catch {}
  }
  return r;
}

// Lista de comentários com respostas, edição, curtidas e moderação, dentro de "alvo".
export function montarComentarios(alvo, post, { aoMudar } = {}) {
  alvo.replaceChildren();
  const dono = post.autorId === eu.uid;
  const moder = el("div", "coment-moderacao");
  const aviso = el("div", "coment-aviso");
  const lista = el("div", "comentarios");
  lista.appendChild(el("div", "lista-vazia", "Carregando comentários..."));
  const form = el("form", "novo-comentario");
  const resp = el("div", "respondendo"); resp.hidden = true;
  const respTx = el("span");
  const respX = el("button", null, "Cancelar"); respX.type = "button";
  resp.append(respTx, respX);
  const linhaForm = el("div", "linha-form");
  const tx = el("textarea"); tx.maxLength = 500; tx.rows = 1; tx.placeholder = "Escreva um comentário...";
  tx.setAttribute("aria-label", "Seu comentário");
  const env = el("button", "btn pri"); env.type = "submit"; env.textContent = "Enviar";
  linhaForm.append(tx, env);
  form.append(resp, linhaForm);
  alvo.append(moder, aviso, lista, form);
  let respondendo = null;   // comentário que está sendo respondido
  tx.addEventListener("input", () => { tx.style.height = "auto"; tx.style.height = Math.min(140, tx.scrollHeight) + "px"; });
  respX.addEventListener("click", () => { respondendo = null; resp.hidden = true; tx.placeholder = "Escreva um comentário..."; });

  const pintarModeracao = () => {
    moder.replaceChildren();
    aviso.replaceChildren();
    const ocultos = post.comentariosOcultos === true;
    if (dono) {
      const b = el("button", "btn sec mini"); b.type = "button";
      b.append(icone(ocultos ? "olho" : "restringir", "i xs"), document.createTextNode(ocultos ? "Mostrar os comentários" : "Ocultar os comentários"));
      b.addEventListener("click", async () => {
        const novo = !ocultos;
        if (novo && !confirm("Ocultar os comentários desta publicação?\n\nNinguém mais vê nem comenta até você mostrar de novo.")) return;
        b.disabled = true;
        try {
          await fb.updateDoc(fb.doc(fb.db, "diario", post.id), { comentariosOcultos: novo });
          post.comentariosOcultos = novo;
          toast(novo ? "Comentários ocultos" : "Comentários visíveis de novo");
          pintarModeracao(); pintar();
        } catch (e) { toast("Não foi possível alterar: " + erroAmigavel(e)); b.disabled = false; }
      });
      moder.appendChild(b);
      if (ocultos) moder.appendChild(el("span", "coment-nota", "Só você vê os comentários desta publicação."));
    } else if (ocultos) {
      aviso.textContent = "O autor ocultou os comentários desta publicação.";
    }
    form.hidden = ocultos;
  };

  const pintar = async () => {
    let itens = [];
    try { itens = await listarComentarios(post.id); } catch { lista.replaceChildren(el("div", "lista-vazia", "Não foi possível carregar os comentários.")); return; }
    cacheNComent.set(post.id, itens.length);
    const ocultosTodos = post.comentariosOcultos === true && !dono;
    const visiveis = itens.filter((c) => dono || c.autorId === eu.uid || !c.oculto);
    aoMudar?.(ocultosTodos ? 0 : visiveis.filter((c) => !c.oculto).length);
    lista.replaceChildren();
    if (ocultosTodos) return;
    if (!visiveis.length) { lista.appendChild(el("div", "lista-vazia", "Seja o primeiro a comentar.")); return; }
    const porId = new Map(itens.map((c) => [c.id, c]));
    const raiz = (c) => { let x = c, k = 0; while (x.respostaA && porId.has(x.respostaA) && k++ < 20) x = porId.get(x.respostaA); return x; };
    const curt = await curtidasDosComentarios(visiveis.map((c) => c.id));
    const raizes = visiveis.filter((c) => raiz(c) === c);
    raizes.forEach((r) => {
      const bloco = el("div", "fio-coment");
      bloco.appendChild(linhaComentario(r, curt.get(r.id), null));
      const respostas = visiveis.filter((c) => c !== r && raiz(c) === r);
      if (respostas.length) {
        const sub = el("div", "respostas");
        respostas.forEach((c) => sub.appendChild(linhaComentario(c, curt.get(c.id), c.respostaA !== r.id ? porId.get(c.respostaA) : null)));
        bloco.appendChild(sub);
      }
      lista.appendChild(bloco);
    });
  };

  function linhaComentario(c, cur = { n: 0, eu: false }, paraQuem) {
    const meu = c.autorId === eu.uid;
    const linha = el("div", "comentario" + (c.oculto ? " oculto" : ""));
    const av = el("div", "avatar"); pintarAvatar(av, c.foto, c.nome);
    av.addEventListener("click", () => ganchos.abrirPerfil(c.autorId));
    const col = el("div", "col");
    const bolha = el("div", "bolha");
    const topo = el("div", "bolha-topo");
    const nm = el("strong", null, c.nome || "Usuário"); nm.addEventListener("click", () => ganchos.abrirPerfil(c.autorId));
    topo.appendChild(nm);
    if (paraQuem) topo.appendChild(el("span", "para", `para ${paraQuem.nome || "usuário"}`));
    if (c.oculto) topo.appendChild(el("span", "etiqueta", meu && !dono ? "Oculto pelo autor da publicação" : "Oculto"));
    const texto = el("p", null, c.texto);
    bolha.append(topo, texto);
    const meta = el("div", "meta");
    meta.appendChild(el("span", null, tempoRelativo(paraData(c.criadoEm)) + (c.editadoEm ? " · editado" : "")));
    const bt = (rot, fn, cls = "") => { const b = el("button", cls, rot); b.type = "button"; b.addEventListener("click", fn); meta.appendChild(b); return b; };
    // curtir o comentário
    const bCurtir = bt(`${cur.eu ? "Curtido" : "Curtir"}${cur.n ? ` (${cur.n})` : ""}`, async () => {
      bCurtir.disabled = true;
      const ref = fb.doc(fb.db, "curtidas_comentarios", `${c.id}_${eu.uid}`);
      try {
        if (cur.eu) { await fb.deleteDoc(ref); cur.eu = false; cur.n = Math.max(0, cur.n - 1); }
        else { if (await precisaEmail()) return; await fb.setDoc(ref, { comentarioId: c.id, uid: eu.uid, criadoEm: fb.serverTimestamp() }); cur.eu = true; cur.n++; }
        bCurtir.textContent = `${cur.eu ? "Curtido" : "Curtir"}${cur.n ? ` (${cur.n})` : ""}`;
        bCurtir.classList.toggle("ativo", cur.eu);
      } catch (e) { toast("Não foi possível curtir: " + erroAmigavel(e)); }
      finally { bCurtir.disabled = false; }
    }, cur.eu ? "ativo" : "");
    if (!post.comentariosOcultos) bt("Responder", () => {
      respondendo = c;
      respTx.textContent = `Respondendo a ${c.nome || "usuário"}`;
      resp.hidden = false;
      tx.placeholder = `Responder a ${c.nome || "usuário"}...`;
      tx.focus();
    });
    if (meu) bt("Editar", () => editar());
    if (dono && !meu) bt(c.oculto ? "Mostrar" : "Ocultar", async () => {
      try { await fb.updateDoc(fb.doc(fb.db, "comentarios", c.id), { oculto: !c.oculto }); toast(c.oculto ? "Comentário visível" : "Comentário oculto"); pintar(); }
      catch (e) { toast("Não foi possível alterar: " + erroAmigavel(e)); }
    });
    if (meu || dono) bt("Apagar", async () => {
      if (!confirm("Apagar este comentário?")) return;
      try { await fb.deleteDoc(fb.doc(fb.db, "comentarios", c.id)); pintar(); } catch (e) { toast("Não foi possível apagar: " + erroAmigavel(e)); }
    }, "perigo");
    function editar() {
      const ed = el("textarea", "editar"); ed.maxLength = 500; ed.value = c.texto;
      const ok = el("button", "btn pri mini", "Salvar"); ok.type = "button";
      const no = el("button", "btn sec mini", "Cancelar"); no.type = "button";
      const acoes = el("div", "acoes-editar"); acoes.append(ok, no);
      texto.replaceWith(ed); meta.hidden = true; bolha.appendChild(acoes);
      ed.focus();
      no.addEventListener("click", () => { ed.replaceWith(texto); acoes.remove(); meta.hidden = false; });
      ok.addEventListener("click", async () => {
        const novo = ed.value.trim();
        if (!novo) { ed.focus(); return; }
        ok.disabled = true;
        try { await fb.updateDoc(fb.doc(fb.db, "comentarios", c.id), { texto: novo, editadoEm: fb.serverTimestamp() }); toast("Comentário editado"); pintar(); }
        catch (e) { toast("Não foi possível salvar: " + erroAmigavel(e)); ok.disabled = false; }
      });
    }
    col.append(bolha, meta);
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
      const foto = urlSegura(dados.fotoPerfil) && dados.fotoPerfil.length < 200000 ? dados.fotoPerfil : "";
      const doc = { postId: post.id, postAutorId: post.autorId, autorId: eu.uid, nome: String(dados.nome || "Usuário").slice(0, 80), foto, texto: texto.slice(0, 500), criadoEm: fb.serverTimestamp() };
      if (respondendo) { doc.respostaA = respondendo.id; doc.respostaAutorId = respondendo.autorId; }
      await fb.addDoc(fb.collection(fb.db, "comentarios"), doc);
      tx.value = ""; tx.style.height = "auto";
      respondendo = null; resp.hidden = true; tx.placeholder = "Escreva um comentário...";
      await pintar();
    } catch (err) { toast("Não foi possível comentar: " + erroAmigavel(err)); }
    finally { env.disabled = false; }
  });
  pintarModeracao();
  pintar();
  return { recarregar: pintar, focar: () => tx.focus() };
}
export function abrirComentarios(post, { aoMudar } = {}) {
  const f = criarFolha("folhaComentarios", { titulo: "Comentários", corpoClasse: "folha-corpo pad" });
  const c = montarComentarios($("c_folhaComentarios"), post, { aoMudar });
  abrirFolha("folhaComentarios");
  if (!post.comentariosOcultos) setTimeout(() => c.focar(), 120);
  return f;
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
      <div class="pub-ferramentas">
        <button type="button" class="icone-btn" id="pubFoto" aria-label="Adicionar foto" title="Foto"><svg class="i"><use href="#i-imagem"/></svg></button>
        <button type="button" class="icone-btn" id="pubVideo" aria-label="Adicionar vídeo" title="Vídeo"><svg class="i"><use href="#i-video"/></svg></button>
        <span class="cont" id="pubCont">0/1000</span>
      </div>
      <input type="file" id="pubArquivoFoto" accept="image/*" hidden />
      <input type="file" id="pubArquivoVideo" accept="video/*" hidden />`;
    $("r_folhaPublicar").innerHTML = `
      <button type="button" class="btn sec" data-fechar>Cancelar</button>
      <button type="button" class="btn pri" id="pubEnviar">Publicar</button>`;
    ligarCompositor();
    f.addEventListener("fechada", () => { if (!$("pubEnviar").disabled) limparPublicacao(); });
  }
  pintarAvatar($("pubAvatar"), dados.fotoPerfil, dados.nome);
  $("pubNome").textContent = dados.nome || "Você";
  $("pubVideo").hidden = !storageFns;
  $("folhaPublicar").aoPublicar = aoPublicar;
  abrirFolha("folhaPublicar");
}
function limparPublicacao() {
  $("pubTexto").value = "";
  $("pubCont").textContent = "0/1000";
  if (pubMidia?.previa?.startsWith("blob:")) URL.revokeObjectURL(pubMidia.previa);
  pubMidia = null;
  $("pubPrevia").hidden = true;
  $("pubPrevia").replaceChildren();
}
function mostrarPreviaPublicacao() {
  const box = $("pubPrevia");
  box.replaceChildren();
  if (!pubMidia) { box.hidden = true; return; }
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
  $("pubArquivoFoto").addEventListener("change", async () => {
    const arquivo = $("pubArquivoFoto").files?.[0];
    $("pubArquivoFoto").value = "";
    if (!arquivo) return;
    try {
      const dataUrl = await editarImagem(arquivo, {
        titulo: "Enquadrar publicação",
        dica: "Escolha o formato e arraste a foto. A borda branca é o que aparece na publicação; deixe o principal dentro da margem segura (tracejada). Nos formatos quadrado e paisagem, o pontilhado azul mostra o recorte da miniatura no seu perfil.",
        formatos: [{ rotulo: "Retrato 4:5", proporcao: 4 / 5 }, { rotulo: "Quadrado 1:1", proporcao: 1 }, { rotulo: "Paisagem 16:9", proporcao: 16 / 9 }],
        miniatura: 4 / 5, larguraSaida: 1080, qualidade: 0.8, limiteBytes: LIMITE_DOC
      });
      if (!dataUrl) return;
      pubMidia = { tipo: "image", dataUrl, previa: dataUrl };
      mostrarPreviaPublicacao();
    } catch (e) { toast(erroAmigavel(e)); }
  });
  $("pubArquivoVideo").addEventListener("change", () => {
    const arquivo = $("pubArquivoVideo").files?.[0];
    $("pubArquivoVideo").value = "";
    if (!arquivo) return;
    if (arquivo.size > 50 * 1024 * 1024) { toast("O vídeo deve ter até 50 MB."); return; }
    pubMidia = { tipo: "video", arquivo, previa: URL.createObjectURL(arquivo) };
    mostrarPreviaPublicacao();
  });
  $("pubEnviar").addEventListener("click", async () => {
    const texto = $("pubTexto").value.trim();
    if (!texto && !pubMidia) { toast("Escreva algo ou adicione uma foto."); return; }
    if (await precisaEmail()) return;
    const btn = $("pubEnviar");
    btn.disabled = true; btn.textContent = "Publicando...";
    try {
      let mediaUrl = "", mediaTipo = "";
      if (pubMidia?.tipo === "image") {
        mediaUrl = await salvarImagem(pubMidia.dataUrl, `diario/${eu.uid}/${Date.now()}.jpg`);
        mediaTipo = "image";
      } else if (pubMidia?.tipo === "video") {
        const ext = (pubMidia.arquivo.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "mp4";
        const r = storageFns.ref(window.firebaseStorage, `diario/${eu.uid}/${Date.now()}.${ext}`);
        await storageFns.uploadBytes(r, pubMidia.arquivo, { contentType: pubMidia.arquivo.type });
        mediaUrl = await storageFns.getDownloadURL(r);
        mediaTipo = "video";
      }
      const foto = urlSegura(dados.fotoPerfil).startsWith("https://") ? dados.fotoPerfil : "";
      const ref = await fb.addDoc(fb.collection(fb.db, "diario"), {
        autorId: eu.uid, nome: dados.nome || "Usuário", fotoPerfil: foto, texto, mediaUrl, mediaTipo, criadoEm: fb.serverTimestamp()
      });
      btn.disabled = false;
      limparPublicacao();
      fecharFolha("folhaPublicar");
      toast("Publicado!");
      $("folhaPublicar").aoPublicar?.({ id: ref.id, autorId: eu.uid, nome: dados.nome, fotoPerfil: foto, texto, mediaUrl, mediaTipo, criadoEm: null });
    } catch (e) {
      console.error(e);
      toast("Não foi possível publicar: " + erroAmigavel(e));
    } finally { btn.disabled = false; btn.textContent = "Publicar"; }
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
export const avisos = { seguidores: [], vinculos: [], curtidas: [], comentarios: [], respostas: [], mensagens: [], reclamacoes: [] };
export let avisosVistosEm = 0;
const ouvintesAvisos = new Set();
export function aoMudarAvisos(fn) { ouvintesAvisos.add(fn); fn(avisos); }
function avisar() {
  const novos = contarNovos();
  const b = $("badgeAvisos");
  if (b) { b.hidden = !novos; b.textContent = novos > 99 ? "99+" : String(novos); }
  const bm = $("badgeMensagens");
  const nm = avisos.mensagens.length;
  if (bm) { bm.hidden = !nm; bm.textContent = nm > 99 ? "99+" : String(nm); }
  ouvintesAvisos.forEach((fn) => fn(avisos));
}
export function contarNovos() {
  const t = (x) => x.quando > avisosVistosEm;
  return avisos.seguidores.filter(t).length + avisos.vinculos.filter((v) => v.pendente || t(v)).length + avisos.curtidas.filter(t).length + avisos.comentarios.filter(t).length + avisos.respostas.filter(t).length + avisos.reclamacoes.filter(t).length;
}
export function marcarAvisosVistos() {
  avisosVistosEm = Date.now();
  try { sessionStorage.removeItem("hf-avisos-" + eu.uid); } catch {} // o sino do topo recalcula
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
  ouvir(fb.query(fb.collection(fb.db, "relacoes"), fb.where("tipo", "==", "seguir"), fb.where("alvoId", "==", eu.uid), fb.limit(200)), async (snap, novos) => {
    const l = await Promise.all(snap.docs.map(async (d) => ({ id: d.id, uid: d.data().seguidorId, quando: ms(d.data().criadoEm), ...(await perfilDe(d.data().seguidorId)) })));
    avisos.seguidores = l.filter((x) => ok(x.uid));
    if (novos && notificarNovos) avisos.seguidores.filter((x) => novos.has(x.id)).forEach((x) => notificar("Novo seguidor", `${x.nome} começou a seguir você`, () => ganchos.abrirPerfil(x.uid)));
  });
  // Curtidas nas minhas publicações
  ouvir(fb.query(fb.collection(fb.db, "curtidas"), fb.where("postAutorId", "==", eu.uid), fb.limit(200)), async (snap, novos) => {
    const l = await Promise.all(snap.docs.filter((d) => Number(d.data().nota) > 0).map(async (d) => ({ id: d.id, uid: d.data().uid, postId: d.data().postId, nota: Number(d.data().nota), quando: Math.max(ms(d.data().criadoEm), ms(d.data().atualizadoEm)), ...(await perfilDe(d.data().uid)) })));
    avisos.curtidas = l.filter((x) => ok(x.uid));
    if (novos && notificarNovos) avisos.curtidas.filter((x) => novos.has(x.id)).forEach((x) => notificar("Novas estrelas", `${x.nome} deu ${x.nota} ${x.nota === 1 ? "estrela" : "estrelas"} na sua publicação`, () => { location.href = "notificacoes.html"; }));
  });
  // Comentários nas minhas publicações
  ouvir(fb.query(fb.collection(fb.db, "comentarios"), fb.where("postAutorId", "==", eu.uid), fb.limit(200)), async (snap, novos) => {
    avisos.comentarios = snap.docs.map((d) => { const c = d.data({ serverTimestamps: "estimate" }); return { id: d.id, uid: c.autorId, postId: c.postId, texto: c.texto, nome: c.nome || "Usuário", foto: c.foto || "", quando: ms(c.criadoEm) }; }).filter((x) => ok(x.uid));
    if (novos && notificarNovos) avisos.comentarios.filter((x) => novos.has(x.id)).forEach((x) => notificar("Novo comentário", `${x.nome}: ${x.texto}`, () => { location.href = "notificacoes.html"; }));
  });
  // Respostas aos meus comentários (em qualquer publicação)
  ouvir(fb.query(fb.collection(fb.db, "comentarios"), fb.where("respostaAutorId", "==", eu.uid), fb.limit(200)), async (snap, novos) => {
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
  // Reclamações: recebidas, respondidas e resolvidas
  let primeiraRec = true;
  const recVistas = new Set();
  ouvirReclamacoes(fb, fb.db, eu.uid, (itens) => {
    avisos.reclamacoes = itens.filter((x) => !x.uid || !escondido(x.uid));
    if (!primeiraRec && notificarNovos) avisos.reclamacoes.filter((x) => !recVistas.has(x.id + ":" + x.quando)).forEach((x) => {
      notificar(x.tipo === "reclamacao" ? "Nova reclamação" : x.tipo === "reclamacao-resp" ? "Reclamação respondida" : "Reclamação resolvida",
        `${x.nome} ${TEXTO_RECLAMACAO[x.tipo](x)}`, () => { location.href = linkReclamacao(x, eu.uid); });
    });
    avisos.reclamacoes.forEach((x) => recVistas.add(x.id + ":" + x.quando));
    primeiraRec = false;
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
      return { id: d.id, uid: outro, ultimaMensagem: c.ultimaMensagem || "", quando: ms(c.atualizadoEm), naoLida, ...(naoLida ? await perfilDe(outro) : {}) };
    }));
    lista.forEach((c) => {
      const antes = vistas.get(c.id);
      if (!primeiraConv && notificarNovos && c.naoLida && (antes === undefined || c.quando > antes)) notificar(`Mensagem de ${c.nome}`, c.ultimaMensagem, () => { location.href = `mensagens.html?conversa=${encodeURIComponent(c.id)}`; });
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
setInterval(marcarPresenca, 60000);
document.addEventListener("visibilitychange", marcarPresenca);

export { editarImagem, conferirEmail, emailPendente, MSG_EMAIL };
