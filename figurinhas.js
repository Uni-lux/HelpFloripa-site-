// =====================================================
// Figurinhas do chat (09/11/2026, pedido do dono): no formato das figurinhas do WhatsApp (WebP 512×512, fundo
// transparente). Sem dependências e SEM regra nova: a figurinha vai como imagem (tipoArquivo "imagem",
// arquivoUrl data:image/webp, nomeArquivo "figurinha.webp") e o chat desenha sem o balão. Quem tem a versão antiga
// do site vê como uma foto comum.
// - Pacote da Help Floripa: figurinhas/hf-XX.webp (scripts/arte/gerar-figurinhas.py).
// - "Minhas figurinhas": guardadas NO APARELHO (IndexedDB hf-figurinhas), por conta, com favoritas e recentes.
// - Criar: de uma foto (formato quadrado/redondo/livre, contorno branco, texto) → WebP 512×512 até 100 KB.
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
const CSS = `
.fg-ed { position: fixed; inset: 0; z-index: 5600; background: #05090c; color: #fff; display: grid; grid-template-rows: auto 1fr auto; grid-template-columns: minmax(0, 1fr); font-family: inherit; -webkit-user-select: none; user-select: none; }
.fg-topo { display: flex; align-items: center; gap: 8px; padding: calc(env(safe-area-inset-top, 0px) + 10px) 12px 8px; }
.fg-topo b { flex: 1; font-size: 17px; text-align: center; }
.fg-topo button { min-width: 44px; height: 40px; border: 0; border-radius: 999px; background: none; color: #fff; font: inherit; font-weight: 700; cursor: pointer; padding: 0 12px; }
.fg-topo .ok { background: #00adee; color: #001a24; }
.fg-meio { display: grid; place-items: center; padding: 8px; min-height: 0; }
.fg-palco { position: relative; width: min(82vw, 46vh, 380px); aspect-ratio: 1; border-radius: 22px; touch-action: none;
  background: repeating-conic-gradient(#1a2329 0 25%, #121a1f 0 50%) 0 0 / 22px 22px; box-shadow: 0 0 0 1px rgba(255,255,255,.08); }
.fg-palco canvas { width: 100%; height: 100%; display: block; }
.fg-dica { font-size: 12px; opacity: .6; text-align: center; margin-top: 10px; }
.fg-baixo > * { min-width: 0; }
.fg-baixo { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; padding: 10px 14px calc(env(safe-area-inset-bottom, 0px) + 14px); background: #0b1217; border-top: 1px solid rgba(255,255,255,.07); }
.fg-linha { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; }
.fg-linha::-webkit-scrollbar { display: none; }
.fg-op { flex: none; display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 14px; border-radius: 999px; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.05); color: #fff; font: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer; }
.fg-op.on { background: #00adee; border-color: #00adee; color: #001a24; }
.fg-op svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; }
.fg-texto { display: flex; gap: 8px; align-items: center; }
.fg-cores { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.fg-cores .fg-op { margin-left: auto; }
.fg-texto input { flex: 1; min-width: 0; height: 44px; border-radius: 12px; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.06); color: #fff; font: inherit; font-size: 15px; padding: 0 12px; -webkit-user-select: text; user-select: text; }
.fg-cor { flex: none; width: 32px; height: 32px; border-radius: 50%; border: 2px solid rgba(255,255,255,.25); cursor: pointer; padding: 0; }
.fg-cor.on { box-shadow: 0 0 0 3px #05090c, 0 0 0 5px #00adee; }
.fg-zoom { display: flex; align-items: center; gap: 10px; font-size: 12px; opacity: .85; }
.fg-zoom input { flex: 1; accent-color: #00adee; }`;
const FORMAS = [["quadrada", "Quadrada"], ["redonda", "Redonda"], ["livre", "Inteira"]];
const CORES_TXT = [["#ffffff", "#000"], ["#ffd23f", "#000"], ["#00adee", "#fff"], ["#111111", "#fff"], ["#ff4d8d", "#fff"]];

function forma(g, tipo, m, t) {
  g.beginPath();
  if (tipo === "redonda") g.arc(256, 256, 256 - m, 0, Math.PI * 2);
  else if (g.roundRect) g.roundRect(m, m, 512 - 2 * m, 512 - 2 * m, t);
  else g.rect(m, m, 512 - 2 * m, 512 - 2 * m);
}
// Desenha a figurinha num canvas 512×512 com o estado do editor.
function desenhar(c, img, st) {
  const g = c.getContext("2d");
  g.clearRect(0, 0, 512, 512);
  const M = st.contorno ? 22 : 6;
  const camada = document.createElement("canvas"); camada.width = camada.height = 512;
  const k = camada.getContext("2d");
  const base = st.forma === "livre" ? Math.min((512 - 2 * M) / img.naturalWidth, (512 - 2 * M) / img.naturalHeight) : Math.max(512 / img.naturalWidth, 512 / img.naturalHeight);
  const s = base * st.zoom, w = img.naturalWidth * s, h = img.naturalHeight * s;
  if (st.forma !== "livre") { k.save(); forma(k, st.forma, M, 70); k.clip(); }
  k.drawImage(img, 256 - w / 2 + st.x, 256 - h / 2 + st.y, w, h);
  if (st.forma !== "livre") k.restore();
  if (st.contorno) {
    // contorno branco: a silhueta repetida em volta (vale para forma livre e recortes transparentes)
    const sil = document.createElement("canvas"); sil.width = sil.height = 512;
    const sg = sil.getContext("2d"); sg.drawImage(camada, 0, 0); sg.globalCompositeOperation = "source-in"; sg.fillStyle = "#fff"; sg.fillRect(0, 0, 512, 512);
    g.save(); g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 16; g.shadowOffsetY = 6;
    for (let a = 0; a < 24; a++) { const r = 12; g.drawImage(sil, Math.cos(a / 24 * Math.PI * 2) * r, Math.sin(a / 24 * Math.PI * 2) * r); if (a === 0) { g.shadowColor = "transparent"; } }
    g.restore();
  }
  g.drawImage(camada, 0, 0);
  if (st.texto) {
    let tam = 66; g.font = `900 ${tam}px Inter, "Segoe UI", Roboto, Arial, sans-serif`;
    while (g.measureText(st.texto).width > 452 && tam > 26) { tam -= 4; g.font = `900 ${tam}px Inter, "Segoe UI", Roboto, Arial, sans-serif`; }
    const y = st.lugar === "cima" ? 30 + tam : 512 - 34;
    g.textAlign = "center"; g.lineJoin = "round";
    g.lineWidth = tam * 0.26; g.strokeStyle = st.cor[1]; g.strokeText(st.texto, 256, y);
    g.fillStyle = st.cor[0]; g.fillText(st.texto, 256, y);
  }
}

// Abre o editor com a imagem; resolve com a figurinha pronta (data:) ou null se cancelar.
export function criarFigurinha(img) {
  return new Promise((resolver) => {
    if (!document.getElementById("fg-css")) { const s = document.createElement("style"); s.id = "fg-css"; s.textContent = CSS; document.head.appendChild(s); }
    const st = { forma: "quadrada", contorno: true, zoom: 1, x: 0, y: 0, texto: "", cor: CORES_TXT[0], lugar: "baixo" };
    const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; };
    const tela = el("div", "fg-ed"); tela.setAttribute("role", "dialog"); tela.setAttribute("aria-modal", "true"); tela.setAttribute("aria-label", "Criar figurinha");
    tela.dataset.fechar = "";
    const topo = el("div", "fg-topo");
    const bVoltar = el("button", null, "Cancelar"); bVoltar.type = "button";
    const bOk = el("button", "ok", "Criar"); bOk.type = "button";
    topo.append(bVoltar, el("b", null, "Nova figurinha"), bOk);
    const meio = el("div", "fg-meio"); const caixa = el("div");
    const palco = el("div", "fg-palco"); const c = el("canvas"); c.width = c.height = 512; palco.appendChild(c);
    caixa.append(palco, el("div", "fg-dica", "Arraste para posicionar · use dois dedos para aproximar"));
    meio.appendChild(caixa);
    const baixo = el("div", "fg-baixo");
    const lFormas = el("div", "fg-linha");
    const botoesForma = FORMAS.map(([k, n]) => { const b = el("button", "fg-op", n); b.type = "button"; b.addEventListener("click", () => { st.forma = k; st.zoom = 1; st.x = st.y = 0; zoom.value = "1"; pintar(); }); lFormas.appendChild(b); return [k, b]; });
    const bCont = el("button", "fg-op", "Contorno"); bCont.type = "button"; bCont.addEventListener("click", () => { st.contorno = !st.contorno; pintar(); }); lFormas.appendChild(bCont);
    const lTexto = el("div", "fg-texto");
    const campo = el("input"); campo.type = "text"; campo.maxLength = 24; campo.placeholder = "Escrever na figurinha (opcional)"; campo.setAttribute("aria-label", "Texto da figurinha");
    campo.addEventListener("input", () => { st.texto = campo.value.trim(); pintar(); });
    lTexto.appendChild(campo);
    const lLugar = el("div", "fg-cores");
    const corBts = CORES_TXT.map((cor) => { const b = el("button", "fg-cor"); b.type = "button"; b.style.background = cor[0]; b.setAttribute("aria-label", "Cor do texto"); b.addEventListener("click", () => { st.cor = cor; pintar(); }); lLugar.appendChild(b); return [cor, b]; });
    const bLugar = el("button", "fg-op", "Texto embaixo"); bLugar.type = "button"; bLugar.addEventListener("click", () => { st.lugar = st.lugar === "baixo" ? "cima" : "baixo"; pintar(); });
    const zl = el("label", "fg-zoom"); zl.append("Tamanho"); const zoom = el("input"); zoom.type = "range"; zoom.min = "0.5"; zoom.max = "3"; zoom.step = "0.01"; zoom.value = "1"; zl.appendChild(zoom);
    zoom.addEventListener("input", () => { st.zoom = Number(zoom.value); pintar(); });
    lLugar.append(bLugar);
    baixo.append(lFormas, lTexto, lLugar, zl);
    tela.append(topo, meio, baixo);
    document.body.appendChild(tela);
    let feito = false;
    const fechar = (v) => { if (feito) return; feito = true; tela.remove(); resolver(v); };
    function pintar() {
      botoesForma.forEach(([k, b]) => b.classList.toggle("on", st.forma === k));
      bCont.classList.toggle("on", st.contorno);
      corBts.forEach(([cor, b]) => b.classList.toggle("on", cor === st.cor));
      bLugar.textContent = st.lugar === "baixo" ? "Texto embaixo" : "Texto em cima";
      desenhar(c, img, st);
    }
    pintar();
    // arrastar e pinça (posições do palco em px → px da figurinha)
    const pts = new Map(); let base = null;
    const escala = () => 512 / palco.clientWidth;
    const medir = () => { const v = [...pts.values()]; const cx = v.reduce((s, p) => s + p.x, 0) / v.length, cy = v.reduce((s, p) => s + p.y, 0) / v.length; const d = v.length > 1 ? Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y) : 0; return { cx, cy, d }; };
    palco.addEventListener("pointerdown", (e) => { palco.setPointerCapture?.(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); base = { ...medir(), x: st.x, y: st.y, zoom: st.zoom }; });
    palco.addEventListener("pointermove", (e) => {
      if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const m = medir();
      st.x = base.x + (m.cx - base.cx) * escala(); st.y = base.y + (m.cy - base.cy) * escala();
      if (m.d && base.d) { st.zoom = Math.max(0.5, Math.min(3, base.zoom * m.d / base.d)); zoom.value = String(st.zoom); }
      pintar();
    });
    const soltar = (e) => { pts.delete(e.pointerId); base = pts.size ? { ...medir(), x: st.x, y: st.y, zoom: st.zoom } : null; };
    palco.addEventListener("pointerup", soltar); palco.addEventListener("pointercancel", soltar);
    bVoltar.addEventListener("click", () => fechar(null));
    tela.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); fechar(null); } });
    bOk.addEventListener("click", () => { desenhar(c, img, st); fechar(codificar(c)); });
  });
}
// Imagem qualquer → figurinha sem passar pelo editor (formato inteiro, sem contorno).
export async function figurinhaDireta(img) {
  const c = document.createElement("canvas"); c.width = c.height = 512;
  desenhar(c, img, { forma: "livre", contorno: false, zoom: 1, x: 0, y: 0, texto: "" });
  return codificar(c);
}
