// =====================================================
// Entregas e corridas: partes usadas pelas duas telas (quem pede e quem leva).
// =====================================================
import { svgIcone } from "./mapa-vivo.js?v=2";
import { VEICULOS, formatarPlaca } from "./corridas-base.js?v=1";

export function h(tag, cls, texto) { const e = document.createElement(tag); if (cls) e.className = cls; if (texto != null) e.textContent = texto; return e; }
export function ic(nome, cls = "i") {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("class", cls); s.setAttribute("aria-hidden", "true");
  const u = document.createElementNS("http://www.w3.org/2000/svg", "use"); u.setAttribute("href", "#i-" + nome); s.appendChild(u);
  return s;
}
// Ícones que o desenho do site ainda não tem.
const EXTRAS = {
  telefone: '<path d="M6.6 3.5h2.6l1.4 4-2 1.3a12 12 0 006.6 6.6l1.3-2 4 1.4v2.6a2 2 0 01-2.2 2A17 17 0 014.6 5.7a2 2 0 012-2.2z"/>',
  escudo: '<path d="M12 3l7 3v5.5c0 4.3-2.9 7.9-7 9.5-4.1-1.6-7-5.2-7-9.5V6z"/><path d="M9 12l2 2 4-4"/>'
};
export function icExtra(nome) { const s = document.createElement("span"); s.innerHTML = `<svg class="mv-svg" viewBox="0 0 24 24" aria-hidden="true">${EXTRAS[nome] || ""}</svg>`; return s.firstChild; }
export function veicIcone(v) { const s = document.createElement("span"); s.innerHTML = svgIcone(v || "pacote"); return s.firstChild; }
export function botao(texto, cls = "ent-btn", aoClicar) {
  const b = h("button", cls, texto); b.type = "button";
  if (aoClicar) b.addEventListener("click", aoClicar);
  return b;
}
export const ms = (t) => (t?.toMillis ? t.toMillis() : typeof t === "number" ? t : 0);
export const hora = (t) => { const d = ms(t); return d ? new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""; };
export const dataCurta = (t) => {
  const d = ms(t); if (!d) return "";
  const x = new Date(d), hoje = new Date();
  const mesmoDia = x.toDateString() === hoje.toDateString();
  return mesmoDia ? `Hoje, ${hora(t)}` : x.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) + `, ${hora(t)}`;
};
// "Moto · Honda CG preta · ABC-1D23"
export function textoVeiculo(e) {
  if (!e) return "";
  const nome = VEICULOS[e.veiculo]?.nome || "Veículo";
  return [e.modelo ? `${e.modelo}${e.cor ? " " + e.cor.toLowerCase() : ""}` : nome, e.placa ? formatarPlaca(e.placa) : ""].filter(Boolean).join(" · ");
}
export function avatar(alvo, foto, nome) {
  alvo.replaceChildren();
  const ok = /^(https:\/\/(firebasestorage\.googleapis\.com|lh3\.googleusercontent\.com)\/|data:image\/(jpeg|png|webp);base64,)/.test(String(foto || ""));
  if (ok) { const i = document.createElement("img"); i.src = foto; i.alt = ""; i.onerror = () => { alvo.textContent = iniciais(nome); }; alvo.appendChild(i); }
  else alvo.textContent = iniciais(nome);
}
export function iniciais(nome) {
  const p = String(nome || "?").trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] || "?") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}
// Beep curto e vibração (pedido novo, motorista chegou...). Só depois de um toque na página.
let ctxSom = null;
export function avisarSom(tipo = "novo") {
  try { navigator.vibrate?.(tipo === "novo" ? [120, 60, 120] : [200]); } catch {}
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try {
    ctxSom = ctxSom || new (window.AudioContext || window.webkitAudioContext)();
    const t = ctxSom.currentTime;
    (tipo === "novo" ? [[784, 0], [1046, .12], [1318, .24]] : [[880, 0], [660, .16]]).forEach(([f, a]) => {
      const o = ctxSom.createOscillator(), g = ctxSom.createGain();
      o.frequency.value = f; o.type = "sine";
      g.gain.setValueAtTime(0, t + a); g.gain.linearRampToValueAtTime(.18, t + a + .02); g.gain.exponentialRampToValueAtTime(.001, t + a + .22);
      o.connect(g).connect(ctxSom.destination); o.start(t + a); o.stop(t + a + .25);
    });
  } catch {}
}
// GPS uma vez (com limite de tempo).
export function lerGps(ms = 9000) {
  return new Promise((ok) => {
    if (!navigator.geolocation) { ok(null); return; }
    const fim = setTimeout(() => ok(null), ms + 500);
    navigator.geolocation.getCurrentPosition((p) => { clearTimeout(fim); ok({ lat: p.coords.latitude, lng: p.coords.longitude, precisao: p.coords.accuracy }); },
      () => { clearTimeout(fim); ok(null); }, { enableHighAccuracy: true, timeout: ms, maximumAge: 30000 });
  });
}
// Conversa entre duas pessoas (cria se ainda não existe), como o Mensagens faz.
export async function garantirConversa(fb, meu, outro) {
  const ids = [meu, outro].sort(), id = `${ids[0]}_${ids[1]}`;
  const ref = fb.doc(fb.db, "conversas", id);
  let existe = false; try { existe = (await fb.getDoc(ref)).exists(); } catch {}
  if (!existe) await fb.setDoc(ref, { participantes: ids, ultimaMensagem: "", atualizadoEm: fb.serverTimestamp() }, { merge: true });
  return id;
}
// Ir a outra página do site saindo da rede (entregas é tela cheia, fora dos quadros).
export function irPara(url) { try { (window.top || window).location.href = url; } catch { location.href = url; } }
// Folha em tela cheia (busca de endereço, histórico...). Esc e o "voltar" do celular fecham (voltar.js trata [data-fechar]).
export function abrirTela(titulo, { busca = false, placeholder = "" } = {}) {
  document.querySelector(".ent-folha")?.remove();
  const f = h("div", "ent-folha"); f.setAttribute("role", "dialog"); f.setAttribute("aria-modal", "true"); f.setAttribute("aria-label", titulo);
  const topo = h("div", "ent-folha-topo");
  const x = h("button", "ent-redondo"); x.type = "button"; x.dataset.fechar = ""; x.setAttribute("aria-label", "Fechar"); x.appendChild(ic("voltar"));
  topo.appendChild(x);
  let campo = null;
  if (busca) { campo = h("input"); campo.type = "search"; campo.placeholder = placeholder; campo.setAttribute("aria-label", titulo); campo.autocomplete = "off"; campo.enterKeyHint = "search"; topo.appendChild(campo); }
  else topo.appendChild(h("h2", null, titulo));
  const corpo = h("div", "ent-folha-corpo");
  f.append(topo, corpo);
  document.body.appendChild(f);
  let fechada = false;
  const fechar = () => { if (fechada) return; fechada = true; f.remove(); f.dispatchEvent(new Event("fechada")); };
  x.addEventListener("click", fechar);
  f.addEventListener("keydown", (e) => { if (e.key === "Escape") fechar(); });
  // voltar.js fecha a camada de cima clicando no [data-fechar]; aqui o clique já remove.
  f.fechar = fechar;
  setTimeout(() => (campo || x).focus({ preventScroll: true }), 50);
  return { folha: f, corpo, campo, fechar };
}
