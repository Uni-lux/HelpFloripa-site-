// =====================================================
// Figurinhas do chat (09/11/2026, pedido do dono): no formato das figurinhas do WhatsApp (WebP 512×512, fundo
// transparente). Sem dependências e SEM regra nova: a figurinha vai como imagem (tipoArquivo "imagem",
// arquivoUrl data:image/webp, nomeArquivo "figurinha.webp") e o chat desenha sem o balão. Quem tem a versão antiga
// do site vê como uma foto comum.
// - Pacote da Help Floripa: figurinhas/hf-XX.webp (scripts/arte/gerar-figurinhas.py).
// - "Minhas figurinhas": guardadas NO APARELHO (IndexedDB hf-figurinhas), por conta, com favoritas e recentes.
// - Criar: editor completo (formas, remover fundo, borracha, contorno, textos, emojis, desenho, ajustes) → WebP 512×512 até 100 KB.
// - Importar: arquivo .webp/.png (ex.: figurinha salva do WhatsApp); 512×512 em WebP fica como está (inclusive animada).
// =====================================================
export const NOME_FIG = "figurinha.webp";
export const ehFigurinha = (m) => m?.tipoArquivo === "imagem" && /^figurinha/i.test(String(m.nomeArquivo || ""));
const LIMITE = 100_000, LIMITE_ANIMADA = 500_000;

// ---------- guardadas no aparelho ----------
let dbP = null;
function abrirDb() {
  if (dbP) return dbP;
  dbP = new Promise((ok, erro) => {
    if (!("indexedDB" in self)) return erro(new Error("sem IndexedDB"));
    const r = indexedDB.open("hf-figurinhas", 1);
    r.onupgradeneeded = () => { const s = r.result.createObjectStore("itens", { keyPath: "id" }); s.createIndex("uid", "uid"); };
    r.onsuccess = () => ok(r.result); r.onerror = () => erro(r.error);
  });
  return dbP;
}
async function loja(modo) { const db = await abrirDb(); return db.transaction("itens", modo).objectStore("itens"); }
const req = (r) => new Promise((ok, erro) => { r.onsuccess = () => ok(r.result); r.onerror = () => erro(r.error); });
async function chaveDe(url) {
  try { const b = new TextEncoder().encode(url); const h = await crypto.subtle.digest("SHA-1", b); return [...new Uint8Array(h)].slice(0, 10).map((x) => x.toString(16).padStart(2, "0")).join(""); }
  catch { let h = 0; for (let i = 0; i < url.length; i += 7) h = (h * 31 + url.charCodeAt(i)) | 0; return "x" + (h >>> 0).toString(16) + url.length; }
}
export async function minhasFigurinhas(uid) {
  try { const s = await loja("readonly"); const lista = await req(s.index("uid").getAll(uid)); return lista.sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0)); }
  catch { return []; }
}
// Guarda (sem repetir a mesma imagem). Devolve o item.
export async function guardarFigurinha(uid, url, extra = {}) {
  const id = uid + ":" + (await chaveDe(url));
  const s = await loja("readwrite");
  const ja = await req(s.get(id));
  const item = { ...(ja || {}), id, uid, url, criadoEm: ja?.criadoEm || Date.now(), ...extra };
  await req(s.put(item));
  return item;
}
export async function atualizarFigurinha(id, campos) {
  const s = await loja("readwrite"); const ja = await req(s.get(id)); if (!ja) return null;
  const novo = { ...ja, ...campos }; await req(s.put(novo)); return novo;
}
export async function apagarFigurinha(id) { const s = await loja("readwrite"); await req(s.delete(id)); }
// Recentes: as do pacote também (guardadas como "pacote" para não aparecerem em "Minhas").
export async function usarFigurinha(uid, url, pacote = false) {
  try { return await guardarFigurinha(uid, url, { usadoEm: Date.now(), ...(pacote ? { pacote: true } : {}) }); } catch { return null; }
}
export async function jaGuardada(uid, url) {
  try { const s = await loja("readonly"); const it = await req(s.get(uid + ":" + (await chaveDe(url)))); return it && !it.pacote ? it : null; } catch { return null; }
}

// ---------- pacote da Help Floripa ----------
let pacoteP = null;
export function pacoteHelp() {
  pacoteP ||= fetch("figurinhas/pacote.json").then((r) => r.json())
    .then((p) => ({ ...p, itens: (p.itens || []).map((x) => ({ ...x, url: "figurinhas/" + x.arquivo })) }))
    .catch(() => ({ id: "helpfloripa", nome: "Help Floripa", itens: [] }));
  return pacoteP;
}
// Arquivo do site (figurinhas/hf-01.webp) → data: para ir dentro da mensagem (a regra só aceita data:/Storage).
export async function paraDataUrl(url) {
  if (/^data:/.test(url)) return url;
  const b = await (await fetch(url)).blob();
  return blobParaUrl(b);
}
const blobParaUrl = (b) => new Promise((ok, erro) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => erro(r.error); r.readAsDataURL(b); });
const carregarImg = (src) => new Promise((ok, erro) => { const i = new Image(); i.decoding = "async"; i.onload = () => ok(i); i.onerror = () => erro(new Error("imagem")); i.src = src; });

// ---------- deixar no formato das figurinhas ----------
function codificar(canvas) {
  let q = 0.92, url = canvas.toDataURL("image/webp", q);
  if (!url.startsWith("data:image/webp")) {
    // Safari não grava WebP: vai em PNG (encolhe se ficar grande)
    url = canvas.toDataURL("image/png");
    if (url.length * 0.75 > 280_000) { const c2 = document.createElement("canvas"); c2.width = c2.height = 384; c2.getContext("2d").drawImage(canvas, 0, 0, 384, 384); url = c2.toDataURL("image/png"); }
    return url;
  }
  while (url.length * 0.75 > LIMITE && q > 0.4) { q -= 0.08; url = canvas.toDataURL("image/webp", q); }
  return url;
}
// Arquivo escolhido (de qualquer tamanho) → figurinha 512×512. WebP 512×512 até o limite fica como veio (animadas também).
export async function prepararArquivo(arquivo) {
  if (!/^image\//.test(arquivo?.type || "")) throw new Error("Escolha uma imagem.");
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await carregarImg(url);
    if (arquivo.type === "image/webp" && img.naturalWidth === 512 && img.naturalHeight === 512 && arquivo.size <= LIMITE_ANIMADA) return { url: await blobParaUrl(arquivo), pronta: true };
    return { img, pronta: false };
  } finally { setTimeout(() => URL.revokeObjectURL(url), 30000); }
}

// ---------- criar figurinha (editor) ----------
// Editor completo (09/11/2026, pedido do dono: "ferramentas bem profissionais"): Recortar (formas, girar, espelhar,
// tamanho), Fundo (remover fundo liso, varinha mágica, borracha e restaurar), Contorno (cor, espessura, sombra),
// Texto (vários, fonte, estilo, cor, tamanho, arrastar), Emoji (por cima, arrastar/pinça/girar), Desenhar (pincel,
// neon) e Ajustes (brilho, contraste, saturação). Desfazer/refazer. Tudo no aparelho, sai WebP 512×512.
const CSS = `
.fg-ed { position: fixed; inset: 0; z-index: 5600; background: #05090c; color: #fff; display: grid; grid-template-rows: auto minmax(0, 1fr) auto; grid-template-columns: minmax(0, 1fr); font-family: inherit; -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }
.fg-topo { display: flex; align-items: center; gap: 4px; padding: calc(env(safe-area-inset-top, 0px) + 8px) 10px 6px; }
.fg-topo b { flex: 1; font-size: 16.5px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fg-topo button { flex: none; min-width: 40px; height: 40px; border: 0; border-radius: 999px; background: none; color: #fff; font: inherit; font-weight: 700; font-size: 14.5px; cursor: pointer; padding: 0 10px; display: grid; place-items: center; }
.fg-topo button:disabled { opacity: .3; cursor: default; }
.fg-topo .ok { background: linear-gradient(135deg, #22c3f5, #0093cc); color: #fff; padding: 0 18px; box-shadow: 0 4px 14px rgba(0, 173, 238, .35); }
.fg-topo svg, .fg-ic { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.fg-meio { display: grid; place-items: center; padding: 6px 10px; min-height: 0; position: relative; }
.fg-caixa { display: grid; justify-items: center; gap: 8px; min-height: 0; }
.fg-palco { position: relative; width: min(84vw, 40vh, 400px); aspect-ratio: 1; border-radius: 20px; touch-action: none; overflow: hidden;
  background: repeating-conic-gradient(#1b252b 0 25%, #11191e 0 50%) 0 0 / 20px 20px; box-shadow: 0 0 0 1px rgba(255,255,255,.08), 0 18px 40px rgba(0,0,0,.45); }
.fg-palco.claro { background: repeating-conic-gradient(#e9eef1 0 25%, #fff 0 50%) 0 0 / 20px 20px; }
.fg-palco canvas { width: 100%; height: 100%; display: block; }
.fg-dica { font-size: 12px; opacity: .62; text-align: center; min-height: 16px; padding: 0 12px; }
.fg-fundo-bt { position: absolute; right: 14px; top: 8px; width: 34px; height: 34px; border-radius: 50%; border: 1px solid rgba(255,255,255,.15); background: rgba(255,255,255,.06); color: #fff; display: grid; place-items: center; cursor: pointer; }
.fg-baixo { display: grid; grid-template-columns: minmax(0, 1fr); background: #0b1217; border-top: 1px solid rgba(255,255,255,.07); padding-bottom: env(safe-area-inset-bottom, 0px); }
.fg-baixo > * { min-width: 0; }
.fg-opcoes { display: grid; gap: 10px; padding: 12px 14px 10px; min-height: 118px; align-content: start; }
.fg-opcoes > * { min-width: 0; }
.fg-ferr { display: flex; gap: 2px; overflow-x: auto; scrollbar-width: none; padding: 4px 6px 8px; border-top: 1px solid rgba(255,255,255,.06); }
.fg-ferr::-webkit-scrollbar, .fg-linha::-webkit-scrollbar { display: none; }
.fg-ferr button { flex: 1 0 52px; display: grid; justify-items: center; gap: 3px; padding: 8px 4px 6px; border: 0; border-radius: 12px; background: none; color: rgba(255,255,255,.62); font: inherit; font-size: 11.5px; font-weight: 700; cursor: pointer; }
.fg-ferr button svg { width: 22px; height: 22px; }
.fg-ferr button.on { color: #22c3f5; background: rgba(0,173,238,.1); }
.fg-linha { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; align-items: center; }
.fg-op { flex: none; display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 38px; padding: 0 13px; border-radius: 999px; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.05); color: #fff; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; }
.fg-op.on { background: #00adee; border-color: #00adee; color: #001a24; }
.fg-op.perigo { color: #ff6b6b; border-color: rgba(255,107,107,.35); }
.fg-op svg { width: 17px; height: 17px; }
.fg-op .forma { width: 18px; height: 18px; }
.fg-cores { display: flex; gap: 9px; align-items: center; overflow-x: auto; scrollbar-width: none; padding: 3px 2px; }
.fg-cor { flex: none; width: 30px; height: 30px; border-radius: 50%; border: 2px solid rgba(255,255,255,.25); cursor: pointer; padding: 0; }
.fg-cor.nenhum { background: linear-gradient(135deg, transparent 45%, #ff5a5a 45% 55%, transparent 55%), rgba(255,255,255,.08) !important; }
.fg-cor.on { box-shadow: 0 0 0 3px #0b1217, 0 0 0 5px #00adee; }
.fg-reg { display: grid; grid-template-columns: 86px minmax(0, 1fr) 38px; align-items: center; gap: 10px; font-size: 12.5px; color: rgba(255,255,255,.75); }
.fg-reg input { width: 100%; accent-color: #00adee; }
.fg-reg output { text-align: right; font-variant-numeric: tabular-nums; opacity: .7; }
.fg-texto { width: 100%; height: 42px; border-radius: 12px; border: 1px solid rgba(255,255,255,.16); background: rgba(255,255,255,.06); color: #fff; font: inherit; font-size: 15px; padding: 0 12px; -webkit-user-select: text; user-select: text; box-sizing: border-box; }
.fg-nota { font-size: 12px; color: rgba(255,255,255,.6); line-height: 1.35; }
.fg-emojis { display: grid; grid-template-columns: repeat(auto-fill, minmax(38px, 1fr)); gap: 2px; max-height: 92px; overflow-y: auto; }
.fg-emojis button { aspect-ratio: 1; border: 0; background: none; font-size: 24px; border-radius: 10px; cursor: pointer; padding: 0; font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif; }
.fg-emojis button:active { background: rgba(255,255,255,.1); }
.fg-conf { position: absolute; inset: 0; z-index: 3; display: grid; place-items: center; background: rgba(0,0,0,.6); padding: 20px; }
.fg-conf > div { width: min(320px, 100%); display: grid; gap: 10px; padding: 18px; border-radius: 18px; background: #111a20; border: 1px solid rgba(255,255,255,.1); text-align: center; }
.fg-conf strong { font-size: 16px; } .fg-conf p { margin: 0; font-size: 13px; opacity: .7; }
.fg-conf button { min-height: 42px; border-radius: 12px; border: 0; font: inherit; font-weight: 700; cursor: pointer; background: rgba(255,255,255,.08); color: #fff; }
.fg-conf button.perigo { background: #e5484d; }
.fg-aviso { position: absolute; left: 50%; bottom: 10px; transform: translateX(-50%); padding: 7px 14px; border-radius: 999px; background: rgba(0,0,0,.75); font-size: 12.5px; white-space: nowrap; pointer-events: none; opacity: 0; transition: opacity .2s; }
.fg-aviso.on { opacity: 1; }
@media (max-height: 640px) { .fg-palco { width: min(80vw, 34vh, 400px); } .fg-opcoes { min-height: 100px; padding-top: 8px; } }`;

const I = {
  desfazer: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 010 11H11"/>',
  refazer: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 000 11H13"/>',
  fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
  recortar: '<path d="M6 2v14a2 2 0 002 2h14"/><path d="M18 22V8a2 2 0 00-2-2H2"/>',
  fundo: '<path d="M15 4l5 5-9.5 9.5H6l-2-2 11-12.5z"/><path d="M9 21h11"/>',
  contorno: '<circle cx="12" cy="12" r="8.5" stroke-dasharray="3 2.5"/><circle cx="12" cy="12" r="4.5"/>',
  texto: '<path d="M5 6V4.5h14V6M12 4.5V20M9 20h6"/>',
  emoji: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14a4.2 4.2 0 007 0"/><path d="M9 9.5h.01M15 9.5h.01" stroke-width="2.8"/>',
  desenhar: '<path d="M4 20c2.5 0 3.5-1 4-3l9.5-9.5a2.1 2.1 0 00-3-3L5 14c-1.5.5-1 3.5-1 6z"/>',
  ajustes: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  girar: '<path d="M20 12a8 8 0 11-2.3-5.7"/><path d="M20 4v5h-5"/>',
  espelhar: '<path d="M12 3v18M8 7L3 12l5 5V7zM16 7l5 5-5 5V7z"/>',
  centro: '<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
  varinha: '<path d="M4 20L15 9M14 4v2M19 9h2M18 5l-1.5 1.5M10 5l1 1M18 13l-1-1"/>',
  borracha: '<path d="M16 3l5 5-10 10H6l-3-3L16 3z"/><path d="M8.5 9.5l6 6M9 21h12"/>',
  restaurar: '<path d="M4 12a8 8 0 108-8 8 8 0 00-6 2.7L4 9"/><path d="M4 4v5h5"/><path d="M12 8v4l3 2"/>',
  automatico: '<path d="M12 3l1.8 4.6L18.5 9l-4.7 1.6L12 15l-1.8-4.4L5.5 9l4.7-1.4L12 3z"/><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  lixo: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  quadro: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 10h16M10 4v16" stroke-dasharray="2 2"/>',
};
const svg = (n, cls = "fg-ic") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[n] || ""}</svg>`;

const FORMAS = [["quadrada", "Quadrada", '<rect x="4" y="4" width="16" height="16" rx="4"/>'], ["redonda", "Redonda", '<circle cx="12" cy="12" r="8.5"/>'],
  ["coracao", "Coração", '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0112 7.3a4.3 4.3 0 017.5 2.5C19.5 15.4 12 20 12 20z"/>'],
  ["estrela", "Estrela", '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/>'],
  ["balao", "Balão", '<path d="M5 5h14a2 2 0 012 2v8a2 2 0 01-2 2h-8l-4 3.5V17H5a2 2 0 01-2-2V7a2 2 0 012-2z"/>'],
  ["livre", "Inteira", '<path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4"/>']];
const CORES = ["#ffffff", "#111111", "#00adee", "#ffd23f", "#ff4d8d", "#2fbf71", "#ff7a1a", "#b066ff", "#e5484d"];
const CORES_TXT = [["#ffffff", "#111111"], ["#111111", "#ffffff"], ["#ffd23f", "#111111"], ["#00adee", "#ffffff"], ["#ff4d8d", "#ffffff"], ["#2fbf71", "#ffffff"], ["#ff7a1a", "#ffffff"], ["#b066ff", "#ffffff"], ["#e5484d", "#ffffff"]];
const FONTES = [["forte", "Forte", '900 {t}px Inter, "Segoe UI", Roboto, Arial, sans-serif'], ["redonda", "Redonda", '800 {t}px "Nunito", "Arial Rounded MT Bold", "Varela Round", Inter, sans-serif'],
  ["impacto", "Impacto", '400 {t}px Impact, "Haettenschweiler", "Arial Narrow Bold", "Arial Black", sans-serif'], ["mao", "Manuscrita", '700 {t}px "Comic Sans MS", "Segoe Print", "Bradley Hand", cursive'],
  ["classica", "Clássica", '800 {t}px Georgia, "Times New Roman", serif']];
const ESTILOS_TXT = [["contorno", "Contorno"], ["fundo", "Com fundo"], ["sombra", "Sombra"]];
const EMOJIS_ED = "😂 🤣 😍 🥰 😘 😎 🤩 🥳 😭 😢 😡 🤬 😱 🤔 🙄 😴 🤯 🥺 😇 🤡 👍 👎 👏 🙏 💪 🤝 ✌️ 🤌 👀 ❤️ 💔 💙 🔥 ✨ 💯 ⭐ 🎉 🎁 ☕ 🍕 🍺 ⚽ 🏖️ 🌴 🌞 🌙 🐶 🐱 💸 📍 ✅ ❌ ‼️ ❓ 💬".split(" ");

const fonteDe = (k, t) => (FONTES.find((f) => f[0] === k) || FONTES[0])[2].replace("{t}", Math.round(t));
const novoCanvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h || w; return c; };

function caminhoForma(g, tipo, m) {
  const a = m, b = 512 - m, w = b - a;
  g.beginPath();
  if (tipo === "redonda") g.arc(256, 256, 256 - m, 0, Math.PI * 2);
  else if (tipo === "coracao") {
    const x = (v) => a + v * w, y = (v) => a + v * w;
    g.moveTo(x(.5), y(.95));
    g.bezierCurveTo(x(.12), y(.7), x(0), y(.45), x(.02), y(.3));
    g.bezierCurveTo(x(.05), y(.08), x(.36), y(-.02), x(.5), y(.2));
    g.bezierCurveTo(x(.64), y(-.02), x(.95), y(.08), x(.98), y(.3));
    g.bezierCurveTo(x(1), y(.45), x(.88), y(.7), x(.5), y(.95));
  } else if (tipo === "estrela") {
    for (let i = 0; i < 10; i++) { const r = i % 2 ? (256 - m) * .5 : 256 - m, ang = -Math.PI / 2 + i * Math.PI / 5; const px = 256 + Math.cos(ang) * r, py = 270 + Math.sin(ang) * r; i ? g.lineTo(px, py) : g.moveTo(px, py); }
    g.closePath();
  } else if (tipo === "balao") {
    const r = 56, base = b - 70;
    g.moveTo(a + r, a); g.lineTo(b - r, a); g.quadraticCurveTo(b, a, b, a + r); g.lineTo(b, base - r); g.quadraticCurveTo(b, base, b - r, base);
    g.lineTo(a + w * .42, base); g.lineTo(a + w * .2, b); g.lineTo(a + w * .26, base); g.lineTo(a + r, base); g.quadraticCurveTo(a, base, a, base - r); g.lineTo(a, a + r); g.quadraticCurveTo(a, a, a + r, a);
  } else if (g.roundRect) g.roundRect(a, a, w, w, 64);
  else g.rect(a, a, w, w);
}

// escala/posição da imagem (espaço 512)
function escalaImg(trab, st) {
  const M = margem(st);
  const base = st.forma === "livre" ? Math.min((512 - 2 * M) / trab.width, (512 - 2 * M) / trab.height) : Math.max((512 - 2 * M) / trab.width, (512 - 2 * M) / trab.height);
  return base * st.zoom;
}
const margem = (st) => (st.cont.cor ? Math.max(8, st.cont.esp + 6) : 6) + (st.sombra ? 6 : 0);
function noImg(trab, st, X, Y) {
  const s = escalaImg(trab, st);
  let dx = X - (256 + st.x), dy = Y - (256 + st.y);
  const r = -st.rot * Math.PI / 180, c = Math.cos(r), sn = Math.sin(r);
  let px = dx * c - dy * sn, py = dx * sn + dy * c;
  if (st.espelho) px = -px;
  return { u: px / s + trab.width / 2, v: py / s + trab.height / 2, s };
}
function medidaTexto(g, t) {
  g.font = fonteDe(t.fonte, t.tam);
  const w = g.measureText(t.txt || " ").width;
  return { w, h: t.tam * 1.05 };
}
function desenharTexto(g, t, sel) {
  if (!t.txt) return;
  const [cor, out] = CORES_TXT[t.cor] || CORES_TXT[0];
  g.save(); g.translate(t.x, t.y); g.rotate((t.rot || 0) * Math.PI / 180);
  g.font = fonteDe(t.fonte, t.tam); g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  const { w, h } = medidaTexto(g, t);
  if (t.estilo === "fundo") {
    const px = t.tam * .38, py = t.tam * .22;
    g.fillStyle = cor; g.beginPath(); if (g.roundRect) g.roundRect(-w / 2 - px, -h / 2 - py, w + px * 2, h + py * 2, t.tam * .36); else g.rect(-w / 2 - px, -h / 2 - py, w + px * 2, h + py * 2); g.fill();
    g.fillStyle = out; g.fillText(t.txt, 0, t.tam * .04);
  } else if (t.estilo === "sombra") {
    g.shadowColor = "rgba(0,0,0,.55)"; g.shadowBlur = t.tam * .18; g.shadowOffsetY = t.tam * .06;
    g.fillStyle = cor; g.fillText(t.txt, 0, t.tam * .04);
  } else {
    g.lineWidth = t.tam * .24; g.strokeStyle = out; g.strokeText(t.txt, 0, t.tam * .04);
    g.fillStyle = cor; g.fillText(t.txt, 0, t.tam * .04);
  }
  if (sel) { g.shadowColor = "transparent"; g.setLineDash([8, 6]); g.lineWidth = 2.5; g.strokeStyle = "#22c3f5"; const pad = t.estilo === "fundo" ? t.tam * .45 : 10; g.strokeRect(-w / 2 - pad, -h / 2 - pad, w + pad * 2, h + pad * 2); }
  g.restore();
}
function desenharEmoji(g, e, sel) {
  g.save(); g.translate(e.x, e.y); g.rotate((e.rot || 0) * Math.PI / 180);
  g.font = `${Math.round(e.tam)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(e.e, 0, e.tam * .06);
  if (sel) { g.setLineDash([8, 6]); g.lineWidth = 2.5; g.strokeStyle = "#22c3f5"; const r = e.tam * .62; g.strokeRect(-r, -r, r * 2, r * 2); }
  g.restore();
}
function desenharTracos(g, tracos) {
  for (const t of tracos) {
    if (!t.pts.length) continue;
    g.save(); g.lineCap = "round"; g.lineJoin = "round";
    const passar = (cor, esp) => { g.strokeStyle = cor; g.lineWidth = esp; g.beginPath(); t.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); if (t.pts.length === 1) g.lineTo(t.pts[0][0] + .1, t.pts[0][1]); g.stroke(); };
    if (t.neon) { g.shadowColor = t.cor; g.shadowBlur = t.esp * 1.6; passar(t.cor, t.esp); g.shadowBlur = 0; passar("#ffffff", Math.max(2, t.esp * .4)); }
    else passar(t.cor, t.esp);
    g.restore();
  }
}
// A figurinha inteira num canvas 512×512. sel = item escolhido (só na tela do editor).
function desenharTudo(c, trab, st, sel, cursor) {
  const g = c.getContext("2d");
  g.clearRect(0, 0, 512, 512);
  const M = margem(st);
  const camada = novoCanvas(512); const k = camada.getContext("2d");
  const s = escalaImg(trab, st);
  if (st.forma !== "livre") { k.save(); caminhoForma(k, st.forma, M); k.clip(); }
  k.save();
  k.translate(256 + st.x, 256 + st.y); k.rotate(st.rot * Math.PI / 180); if (st.espelho) k.scale(-1, 1);
  const aj = st.aj; if (aj.b !== 100 || aj.c !== 100 || aj.s !== 100) k.filter = `brightness(${aj.b}%) contrast(${aj.c}%) saturate(${aj.s}%)`;
  k.drawImage(trab, -trab.width * s / 2, -trab.height * s / 2, trab.width * s, trab.height * s);
  k.restore();
  if (st.forma !== "livre") k.restore();
  desenharTracos(k, st.tracos);
  // contorno: a silhueta (imagem + desenhos) repetida em volta, na cor escolhida
  if (st.cont.cor || st.sombra) {
    const sil = novoCanvas(512), sg = sil.getContext("2d");
    sg.drawImage(camada, 0, 0); sg.globalCompositeOperation = "source-in"; sg.fillStyle = st.cont.cor || "#000"; sg.fillRect(0, 0, 512, 512);
    const anel = novoCanvas(512), ag = anel.getContext("2d");
    if (st.cont.cor) {
      const r = st.cont.esp, n = Math.max(16, Math.round(r * 2.2));
      for (const rr of r > 8 ? [r, r * .55] : [r]) for (let a = 0; a < n; a++) ag.drawImage(sil, Math.cos(a / n * Math.PI * 2) * rr, Math.sin(a / n * Math.PI * 2) * rr);
      ag.drawImage(sil, 0, 0);
    } else ag.drawImage(camada, 0, 0);
    if (st.sombra) { g.save(); g.shadowColor = "rgba(0,0,0,.4)"; g.shadowBlur = 14; g.shadowOffsetY = 5; g.drawImage(anel, 0, 0); g.restore(); }
    if (st.cont.cor) g.drawImage(anel, 0, 0);
  }
  g.drawImage(camada, 0, 0);
  st.emojis.forEach((e) => desenharEmoji(g, e, sel === e));
  st.textos.forEach((t) => desenharTexto(g, t, sel === t));
  if (cursor) { g.save(); g.lineWidth = 2; g.strokeStyle = "#fff"; g.shadowColor = "rgba(0,0,0,.6)"; g.shadowBlur = 3; g.beginPath(); g.arc(cursor.x, cursor.y, cursor.r, 0, Math.PI * 2); g.stroke(); g.restore(); }
}

// ---- fundo: varinha mágica e remover fundo liso (no canvas de trabalho, em pixels da imagem) ----
function apagarParecidos(trab, sementes, tol) {
  const W = trab.width, H = trab.height, g = trab.getContext("2d", { willReadFrequently: true });
  const im = g.getImageData(0, 0, W, H), d = im.data;
  const visto = new Uint8Array(W * H), pilha = new Int32Array(W * H);
  const lim = (tol / 100) * 255 * 1.732, lim2 = lim * lim, borda2 = (lim * 1.35) ** 2;
  let topo = 0, apagados = 0;
  const cores = [];
  for (const [x, y] of sementes) {
    const i = (y * W + x); if (visto[i] || d[i * 4 + 3] < 10) continue;
    cores.push([d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]);
    visto[i] = 1; pilha[topo++] = i;
  }
  if (!cores.length) return 0;
  // poucas cores de referência (fundo liso pode ter 2–3 tons nas bordas)
  const refs = []; for (const c of cores) if (!refs.some((r) => (r[0] - c[0]) ** 2 + (r[1] - c[1]) ** 2 + (r[2] - c[2]) ** 2 < lim2 * .25) && refs.length < 6) refs.push(c);
  const dist = (p) => { let m = Infinity; for (const r of refs) { const v = (d[p] - r[0]) ** 2 + (d[p + 1] - r[1]) ** 2 + (d[p + 2] - r[2]) ** 2; if (v < m) m = v; } return m; };
  while (topo) {
    const i = pilha[--topo], p = i * 4;
    d[p + 3] = 0; apagados++;
    const x = i % W, y = (i / W) | 0;
    const viz = [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1];
    for (const j of viz) {
      if (j < 0 || visto[j]) continue;
      const q = j * 4; if (d[q + 3] < 10) { visto[j] = 1; continue; }
      const dd = dist(q);
      if (dd <= lim2) { visto[j] = 1; pilha[topo++] = j; }
      else if (dd <= borda2) { visto[j] = 1; d[q + 3] = Math.round(d[q + 3] * Math.min(1, (Math.sqrt(dd) - lim) / (lim * .35))); } // borda suave
    }
  }
  g.putImageData(im, 0, 0);
  return apagados;
}
function sementesDaBorda(trab) {
  const W = trab.width, H = trab.height, s = [];
  const passo = Math.max(1, Math.round(Math.min(W, H) / 120));
  for (let x = 0; x < W; x += passo) s.push([x, 0], [x, H - 1]);
  for (let y = 0; y < H; y += passo) s.push([0, y], [W - 1, y]);
  return s;
}

// Abre o editor com a imagem; resolve com { url, texto } ou null se cancelar.
// opc: { forma, contorno } (ex.: editar uma figurinha que já existe = inteira, sem contorno).
export function criarFigurinha(img, opc = {}) {
  return new Promise((resolver) => {
    if (!document.getElementById("fg-css")) { const s = document.createElement("style"); s.id = "fg-css"; s.textContent = CSS; document.head.appendChild(s); }
    // imagem de trabalho (até 900 px) + original para "restaurar"
    const k0 = Math.min(1, 900 / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
    const W = Math.max(1, Math.round((img.naturalWidth || img.width) * k0)), H = Math.max(1, Math.round((img.naturalHeight || img.height) * k0));
    const orig = novoCanvas(W, H); orig.getContext("2d").drawImage(img, 0, 0, W, H);
    let trab = novoCanvas(W, H); trab.getContext("2d").drawImage(orig, 0, 0);
    const st = { forma: opc.forma || "quadrada", zoom: 1, x: 0, y: 0, rot: 0, espelho: false, cont: { cor: opc.contorno === false ? null : "#ffffff", esp: 12 }, sombra: opc.contorno !== false,
      aj: { b: 100, c: 100, s: 100 }, textos: [], emojis: [], tracos: [] };
    let ferr = "recortar", sel = null, modoFundo = "varinha", tol = 22, pincel = 26, corPincel = "#ffffff", neon = false, corTraco = CORES[2], espTraco = 12, mudou = false;
    const hist = [], refeitos = [];
    const foto = () => ({ st: JSON.stringify(st), trab, sel: sel ? (st.textos.includes(sel) ? ["t", st.textos.indexOf(sel)] : ["e", st.emojis.indexOf(sel)]) : null });
    const voltarA = (f) => { const o = JSON.parse(f.st); Object.keys(o).forEach((k) => { st[k] = o[k]; }); trab = f.trab; sel = f.sel ? (f.sel[0] === "t" ? st.textos[f.sel[1]] : st.emojis[f.sel[1]]) || null : null; };
    const marcar = () => { hist.push(foto()); if (hist.length > 30) hist.shift(); refeitos.length = 0; mudou = true; pintarTopo(); };

    const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; };
    const btn = (c, html, rot, fn) => { const b = el("button", c); b.type = "button"; b.innerHTML = html; if (rot) { b.setAttribute("aria-label", rot); b.title = rot; } if (fn) b.addEventListener("click", fn); return b; };
    const tela = el("div", "fg-ed"); tela.setAttribute("role", "dialog"); tela.setAttribute("aria-modal", "true"); tela.setAttribute("aria-label", "Criar figurinha");
    const topo = el("div", "fg-topo");
    const bVoltar = btn("", svg("fechar"), "Cancelar", () => sair());
    const bDesf = btn("", svg("desfazer"), "Desfazer", () => { if (!hist.length) return; refeitos.push(foto()); voltarA(hist.pop()); pintar(true); });
    const bRef = btn("", svg("refazer"), "Refazer", () => { if (!refeitos.length) return; hist.push(foto()); voltarA(refeitos.pop()); pintar(true); });
    const bOk = btn("ok", "Concluir", null, () => {
      const c = novoCanvas(512); desenharTudo(c, trab, st, null);
      fechar({ url: codificar(c), texto: st.textos.map((t) => t.txt).filter(Boolean).join(" ") });
    });
    topo.append(bVoltar, bDesf, bRef, el("b", null, opc.titulo || "Nova figurinha"), bOk);
    const meio = el("div", "fg-meio"); const caixa = el("div", "fg-caixa");
    const palco = el("div", "fg-palco"); const c = novoCanvas(512); palco.appendChild(c);
    const aviso = el("div", "fg-aviso"); palco.appendChild(aviso);
    const dica = el("div", "fg-dica");
    caixa.append(palco, dica); meio.appendChild(caixa);
    const bFundoPalco = btn("fg-fundo-bt", svg("quadro"), "Trocar o fundo da prévia (escuro/claro)", () => palco.classList.toggle("claro"));
    meio.appendChild(bFundoPalco);
    const baixo = el("div", "fg-baixo"); const opcoes = el("div", "fg-opcoes"); const barra = el("div", "fg-ferr"); barra.setAttribute("role", "tablist");
    const FERR = [["recortar", "Recortar"], ["fundo", "Fundo"], ["contorno", "Contorno"], ["texto", "Texto"], ["emoji", "Emoji"], ["desenhar", "Desenhar"], ["ajustes", "Ajustes"]];
    const bFerr = FERR.map(([k, n]) => { const b = btn("", svg(k) + `<span>${n}</span>`, null, () => { ferr = k; if (k !== "texto" && k !== "emoji") sel = null; pintar(true); }); b.setAttribute("role", "tab"); barra.appendChild(b); return [k, b]; });
    baixo.append(opcoes, barra);
    tela.append(topo, meio, baixo);
    document.body.appendChild(tela);
    let tAviso = 0;
    const avisar = (t) => { aviso.textContent = t; aviso.classList.add("on"); clearTimeout(tAviso); tAviso = setTimeout(() => aviso.classList.remove("on"), 1800); };

    let feito = false;
    const fechar = (v) => { if (feito) return; feito = true; tela.remove(); resolver(v); };
    function sair() {
      if (!mudou) { fechar(null); return; }
      if (tela.querySelector(".fg-conf")) return;
      const f = el("div", "fg-conf"); const box = el("div");
      const des = el("button", "perigo", "Descartar"); des.type = "button"; des.addEventListener("click", () => fechar(null));
      const cont = el("button", null, "Continuar editando"); cont.type = "button"; cont.addEventListener("click", () => f.remove());
      box.append(el("strong", null, "Descartar a figurinha?"), el("p", null, "O que você fez será perdido."), des, cont);
      f.appendChild(box); tela.appendChild(f);
    }
    tela.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); const cf = tela.querySelector(".fg-conf"); if (cf) cf.remove(); else sair(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && e.target.tagName !== "INPUT") { e.preventDefault(); (e.shiftKey ? bRef : bDesf).click(); }
    });

    // ---- opções de cada ferramenta ----
    const linha = () => el("div", "fg-linha");
    const op = (rot, on, fn, extra = "") => { const b = btn("fg-op" + (on ? " on" : ""), extra + `<span>${rot}</span>`, null, fn); return b; };
    const regua = (rot, min, max, val, passo, fn, mostrar = (v) => v) => {
      const l = el("label", "fg-reg"); const i = el("input"); i.type = "range"; i.min = min; i.max = max; i.step = passo; i.value = val;
      const o = el("output", null, mostrar(val));
      let marcou = false;
      i.addEventListener("pointerdown", () => { marcou = false; });
      i.addEventListener("input", () => { if (!marcou) { marcar(); marcou = true; } fn(Number(i.value)); o.textContent = mostrar(Number(i.value)); pintar(); });
      i.addEventListener("change", () => { marcou = false; });
      l.append(el("span", null, rot), i, o); return l;
    };
    const cores = (lista, atual, fn, comNenhum) => {
      const l = el("div", "fg-cores");
      if (comNenhum) { const b = btn("fg-cor nenhum" + (atual == null ? " on" : ""), "", "Sem contorno", () => fn(null)); l.appendChild(b); }
      lista.forEach((cor, i) => { const v = Array.isArray(cor) ? i : cor; const b = btn("fg-cor" + (atual === v ? " on" : ""), "", "Cor", () => fn(v)); b.style.background = Array.isArray(cor) ? cor[0] : cor; l.appendChild(b); });
      return l;
    };
    function pintarOpcoes() {
      opcoes.replaceChildren();
      bFerr.forEach(([k, b]) => { b.classList.toggle("on", k === ferr); b.setAttribute("aria-selected", k === ferr ? "true" : "false"); });
      if (ferr === "recortar") {
        const l = linha();
        FORMAS.forEach(([k, n, d]) => l.appendChild(op(n, st.forma === k, () => { marcar(); st.forma = k; pintar(true); }, `<svg class="forma fg-ic" viewBox="0 0 24 24">${d}</svg>`)));
        const l2 = linha();
        l2.append(op("Girar", false, () => { marcar(); st.rot = (Math.round(st.rot / 90) * 90 + 90) % 360; pintar(true); }, svg("girar")),
          op("Espelhar", st.espelho, () => { marcar(); st.espelho = !st.espelho; pintar(true); }, svg("espelhar")),
          op("Centralizar", false, () => { marcar(); st.x = st.y = 0; st.zoom = 1; st.rot = 0; pintar(true); }, svg("centro")));
        opcoes.append(l, l2, regua("Tamanho", .3, 4, st.zoom, .01, (v) => { st.zoom = v; }, (v) => Math.round(v * 100) + "%"));
        dica.textContent = "Arraste para posicionar · dois dedos aproximam e giram";
      } else if (ferr === "fundo") {
        const l = linha();
        l.append(op("Remover fundo", false, () => {
          marcar(); copiarTrab();
          const n = apagarParecidos(trab, sementesDaBorda(trab), Math.max(tol, 14));
          avisar(n > trab.width * trab.height * .02 ? "Fundo removido. Refine com a borracha." : "Não achei um fundo liso. Use a varinha ou a borracha.");
          if (st.forma !== "livre" && n) { st.forma = "livre"; }
          pintar(true);
        }, svg("automatico")));
        [["varinha", "Varinha", "varinha"], ["borracha", "Borracha", "borracha"], ["restaurar", "Restaurar", "restaurar"]].forEach(([k, n, ic]) => l.appendChild(op(n, modoFundo === k, () => { modoFundo = k; pintar(true); }, svg(ic))));
        opcoes.appendChild(l);
        if (modoFundo === "varinha") opcoes.appendChild(regua("Sensibilidade", 4, 60, tol, 1, (v) => { tol = v; }, (v) => v));
        else opcoes.appendChild(regua("Pincel", 6, 90, pincel, 1, (v) => { pincel = v; }, (v) => v));
        const l2 = linha(); l2.appendChild(op("Restaurar tudo", false, () => { marcar(); trab = novoCanvas(W, H); trab.getContext("2d").drawImage(orig, 0, 0); pintar(true); }, svg("restaurar")));
        opcoes.appendChild(l2);
        dica.textContent = modoFundo === "varinha" ? "Toque numa cor do fundo para apagar a área parecida" : modoFundo === "borracha" ? "Passe o dedo para apagar · dois dedos aproximam" : "Passe o dedo para trazer de volta o que apagou";
      } else if (ferr === "contorno") {
        opcoes.appendChild(cores(CORES, st.cont.cor, (v) => { marcar(); st.cont.cor = v; pintar(true); }, true));
        opcoes.appendChild(regua("Espessura", 4, 24, st.cont.esp, 1, (v) => { st.cont.esp = v; }, (v) => v));
        const l = linha(); l.appendChild(op("Sombra", st.sombra, () => { marcar(); st.sombra = !st.sombra; pintar(true); })); opcoes.appendChild(l);
        dica.textContent = "O contorno acompanha o recorte, os desenhos e o fundo removido";
      } else if (ferr === "texto") {
        const t = st.textos.includes(sel) ? sel : null;
        const l = linha();
        l.appendChild(op("Adicionar texto", false, () => {
          if (st.textos.length >= 4) { avisar("Até 4 textos"); return; }
          marcar(); const n = { txt: "Texto", x: 256, y: st.textos.length ? 120 + st.textos.length * 90 : 452, tam: 64, cor: 0, estilo: "contorno", fonte: "forte", rot: 0 };
          st.textos.push(n); sel = n; pintar(true); setTimeout(() => { const i = opcoes.querySelector(".fg-texto"); i?.focus(); i?.select(); }, 30);
        }, svg("mais")));
        if (t) l.appendChild(op("Apagar", false, () => { marcar(); st.textos.splice(st.textos.indexOf(t), 1); sel = null; pintar(true); }, svg("lixo")));
        opcoes.appendChild(l);
        if (t) {
          const campo = el("input", "fg-texto"); campo.type = "text"; campo.maxLength = 30; campo.value = t.txt; campo.placeholder = "Escreva o texto"; campo.setAttribute("aria-label", "Texto");
          let m = false; campo.addEventListener("input", () => { if (!m) { marcar(); m = true; } t.txt = campo.value; pintar(); });
          campo.addEventListener("keydown", (e) => { if (e.key === "Enter") campo.blur(); });
          const lf = linha(); FONTES.forEach(([k, n]) => { const b = op(n, t.fonte === k, () => { marcar(); t.fonte = k; pintar(true); }); b.style.font = fonteDe(k, 13.5); lf.appendChild(b); });
          const le = linha(); ESTILOS_TXT.forEach(([k, n]) => le.appendChild(op(n, t.estilo === k, () => { marcar(); t.estilo = k; pintar(true); })));
          opcoes.append(campo, lf, cores(CORES_TXT, t.cor, (v) => { marcar(); t.cor = v; pintar(true); }), le, regua("Tamanho", 24, 140, t.tam, 1, (v) => { t.tam = v; }, (v) => v));
          dica.textContent = "Arraste o texto · dois dedos aumentam e giram";
        } else { opcoes.appendChild(el("div", "fg-nota", st.textos.length ? "Toque num texto na figurinha para editar." : "Escreva até 4 textos, com fonte, cor e estilo próprios.")); dica.textContent = ""; }
      } else if (ferr === "emoji") {
        const e = st.emojis.includes(sel) ? sel : null;
        if (e) {
          const l = linha();
          l.append(op("Girar", false, () => { marcar(); e.rot = ((e.rot || 0) + 15) % 360; pintar(true); }, svg("girar")), op("Apagar", false, () => { marcar(); st.emojis.splice(st.emojis.indexOf(e), 1); sel = null; pintar(true); }, svg("lixo")));
          opcoes.append(l, regua("Tamanho", 30, 260, e.tam, 1, (v) => { e.tam = v; }, (v) => v));
        }
        const g = el("div", "fg-emojis");
        EMOJIS_ED.forEach((x) => { const b = btn("", x, "Adicionar " + x, () => { if (st.emojis.length >= 10) { avisar("Até 10 emojis"); return; } marcar(); const n = { e: x, x: 150 + Math.random() * 212, y: 150 + Math.random() * 212, tam: 110, rot: 0 }; st.emojis.push(n); sel = n; pintar(true); }); b.textContent = x; g.appendChild(b); });
        opcoes.appendChild(g);
        dica.textContent = e ? "Arraste o emoji · dois dedos aumentam e giram" : "Toque num emoji para colocar na figurinha";
      } else if (ferr === "desenhar") {
        opcoes.appendChild(cores(CORES, corTraco, (v) => { corTraco = v; pintar(true); }));
        opcoes.appendChild(regua("Pincel", 3, 40, espTraco, 1, (v) => { espTraco = v; }, (v) => v));
        const l = linha();
        l.appendChild(op("Neon", neon, () => { neon = !neon; pintar(true); }));
        if (st.tracos.length) l.appendChild(op("Apagar desenhos", false, () => { marcar(); st.tracos = []; pintar(true); }, svg("lixo")));
        opcoes.appendChild(l);
        dica.textContent = "Desenhe com o dedo na figurinha";
      } else if (ferr === "ajustes") {
        opcoes.append(regua("Brilho", 50, 160, st.aj.b, 1, (v) => { st.aj.b = v; }, (v) => v + "%"), regua("Contraste", 50, 170, st.aj.c, 1, (v) => { st.aj.c = v; }, (v) => v + "%"),
          regua("Saturação", 0, 200, st.aj.s, 1, (v) => { st.aj.s = v; }, (v) => v + "%"));
        const l = linha(); l.appendChild(op("Redefinir", false, () => { marcar(); st.aj = { b: 100, c: 100, s: 100 }; pintar(true); }, svg("restaurar"))); opcoes.appendChild(l);
        dica.textContent = "";
      }
    }
    function pintarTopo() { bDesf.disabled = !hist.length; bRef.disabled = !refeitos.length; }
    let cursor = null;
    function pintar(tudo) { if (tudo) pintarOpcoes(); pintarTopo(); desenharTudo(c, trab, st, sel, cursor); }
    pintar(true);

    // copia o canvas de trabalho antes de mexer (o histórico guarda o de antes)
    function copiarTrab() { const n = novoCanvas(trab.width, trab.height); n.getContext("2d").drawImage(trab, 0, 0); trab = n; }

    // ---- gestos no palco ----
    const pts = new Map(); let gesto = null;
    const escala = () => 512 / palco.clientWidth;
    const pos = (e) => { const r = palco.getBoundingClientRect(); return { x: (e.clientX - r.left) * escala(), y: (e.clientY - r.top) * escala() }; };
    const medir = () => { const v = [...pts.values()]; const cx = v.reduce((s, p) => s + p.x, 0) / v.length, cy = v.reduce((s, p) => s + p.y, 0) / v.length; const d = v.length > 1 ? Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y) : 0; const a = v.length > 1 ? Math.atan2(v[1].y - v[0].y, v[1].x - v[0].x) * 180 / Math.PI : 0; return { cx, cy, d, a }; };
    function acertou(p) {
      const g = c.getContext("2d");
      for (let i = st.textos.length - 1; i >= 0; i--) { const t = st.textos[i]; const { w, h } = medidaTexto(g, t); if (Math.abs(p.x - t.x) < w / 2 + 24 && Math.abs(p.y - t.y) < h / 2 + 24) return t; }
      for (let i = st.emojis.length - 1; i >= 0; i--) { const e = st.emojis[i]; if (Math.hypot(p.x - e.x, p.y - e.y) < e.tam * .65) return e; }
      return null;
    }
    function pincelar(p, ant) {
      const { u, v, s } = noImg(trab, st, p.x, p.y); const r = (pincel / 2) / s;
      const g = trab.getContext("2d");
      const passos = ant ? Math.max(1, Math.ceil(Math.hypot(p.x - ant.x, p.y - ant.y) / (pincel / 4))) : 1;
      const a0 = ant ? noImg(trab, st, ant.x, ant.y) : { u, v };
      for (let i = 1; i <= passos; i++) {
        const uu = a0.u + (u - a0.u) * i / passos, vv = a0.v + (v - a0.v) * i / passos;
        g.save(); g.beginPath(); g.arc(uu, vv, r, 0, Math.PI * 2);
        if (modoFundo === "borracha") { g.globalCompositeOperation = "destination-out"; g.fill(); }
        else { g.clip(); g.clearRect(uu - r, vv - r, r * 2, r * 2); g.drawImage(orig, 0, 0); }
        g.restore();
      }
    }
    palco.addEventListener("pointerdown", (e) => {
      palco.setPointerCapture?.(e.pointerId);
      const p = pos(e); pts.set(e.pointerId, p);
      if (pts.size === 2) { // segundo dedo: vira pinça (cancela o pincel)
        if (gesto?.tipo === "traco") { st.tracos.pop(); }
        const alvo = gesto?.alvo && gesto.tipo === "item" ? gesto.alvo : null;
        gesto = { tipo: alvo ? "item" : "img", alvo, marcado: !!gesto?.marcado, ...medir(), base: alvo ? { x: alvo.x, y: alvo.y, tam: alvo.tam, rot: alvo.rot || 0 } : { x: st.x, y: st.y, zoom: st.zoom, rot: st.rot } };
        cursor = null; pintar(); return;
      }
      if (pts.size > 2) return;
      if (ferr === "fundo" && modoFundo === "varinha") { gesto = { tipo: "toque", ...p }; return; }
      if (ferr === "fundo") { marcar(); copiarTrab(); gesto = { tipo: "apagar", ant: p }; pincelar(p); cursor = { ...p, r: pincel / 2 }; pintar(); return; }
      if (ferr === "desenhar") { marcar(); const t = { cor: corTraco, esp: espTraco, neon, pts: [[p.x, p.y]] }; st.tracos.push(t); gesto = { tipo: "traco", t }; pintar(); return; }
      const alvo = acertou(p);
      if (alvo) {
        sel = alvo; const quer = st.textos.includes(alvo) ? "texto" : "emoji";
        if (ferr !== quer) { ferr = quer; } pintar(true);
        gesto = { tipo: "item", alvo, ...medir(), base: { x: alvo.x, y: alvo.y, tam: alvo.tam, rot: alvo.rot || 0 }, marcado: false };
      } else {
        if (sel) { sel = null; pintar(true); }
        gesto = { tipo: "img", ...medir(), base: { x: st.x, y: st.y, zoom: st.zoom, rot: st.rot }, marcado: false };
      }
    });
    palco.addEventListener("pointermove", (e) => {
      if (!pts.has(e.pointerId) || !gesto) return;
      const ant = pts.get(e.pointerId); const p = pos(e); pts.set(e.pointerId, p);
      if (gesto.tipo === "apagar") { pincelar(p, ant); cursor = { ...p, r: pincel / 2 }; pintar(); return; }
      if (gesto.tipo === "traco") { gesto.t.pts.push([p.x, p.y]); pintar(); return; }
      if (gesto.tipo === "toque") return;
      const m = medir(), b = gesto.base;
      if (!gesto.marcado) { marcar(); gesto.marcado = true; } // o histórico só entra quando algo se mexe (tocar não conta)
      if (gesto.tipo === "img") {
        st.x = b.x + (m.cx - gesto.cx); st.y = b.y + (m.cy - gesto.cy);
        if (m.d && gesto.d) { st.zoom = Math.max(.3, Math.min(4, b.zoom * m.d / gesto.d)); st.rot = b.rot + (m.a - gesto.a); }
      } else if (gesto.tipo === "item") {
        const a = gesto.alvo;
        a.x = Math.max(0, Math.min(512, b.x + (m.cx - gesto.cx))); a.y = Math.max(0, Math.min(512, b.y + (m.cy - gesto.cy)));
        if (m.d && gesto.d) { a.tam = Math.max(20, Math.min(st.textos.includes(a) ? 160 : 300, b.tam * m.d / gesto.d)); a.rot = b.rot + (m.a - gesto.a); }
      }
      pintar();
    });
    const soltar = (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      const tipo = gesto?.tipo;
      if (gesto?.tipo === "toque" && !pts.size) {
        const p = pos(e); const { u, v } = noImg(trab, st, p.x, p.y);
        if (u >= 0 && v >= 0 && u < trab.width && v < trab.height) { marcar(); copiarTrab(); const n = apagarParecidos(trab, [[Math.floor(u), Math.floor(v)]], tol); avisar(n ? "Área apagada · toque em ↶ para desfazer" : "Nada para apagar aí"); if (!n) hist.pop(); }
      }
      if (gesto?.tipo === "img" || gesto?.tipo === "item") {
        if (pts.size === 1) { gesto = { ...gesto, ...medir(), base: gesto.tipo === "item" ? { x: gesto.alvo.x, y: gesto.alvo.y, tam: gesto.alvo.tam, rot: gesto.alvo.rot || 0 } : { x: st.x, y: st.y, zoom: st.zoom, rot: st.rot } }; }
        if (gesto.tipo === "item") pintarOpcoes(); // tamanho na régua
      }
      if (!pts.size) { gesto = null; cursor = null; if (ferr === "recortar" || tipo === "traco") pintarOpcoes(); }
      pintar();
    };
    palco.addEventListener("pointerup", soltar); palco.addEventListener("pointercancel", soltar);
    palco.addEventListener("contextmenu", (e) => e.preventDefault());
    let rodaEm = 0;
    palco.addEventListener("wheel", (e) => { e.preventDefault(); if (Date.now() - rodaEm > 600) marcar(); rodaEm = Date.now(); st.zoom = Math.max(.3, Math.min(4, st.zoom * (e.deltaY < 0 ? 1.08 : .92))); pintar(); }, { passive: false });
  });
}
// Imagem qualquer → figurinha sem passar pelo editor (formato inteiro, sem contorno).
export async function figurinhaDireta(img) {
  const c = novoCanvas(512); const g = c.getContext("2d");
  const s = Math.min(500 / img.naturalWidth, 500 / img.naturalHeight), w = img.naturalWidth * s, h = img.naturalHeight * s;
  g.drawImage(img, 256 - w / 2, 256 - h / 2, w, h);
  return codificar(c);
}
