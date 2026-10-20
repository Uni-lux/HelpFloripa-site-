// =====================================================
// Anexos do suporte (fotos, vídeos e arquivos) — usado pela página de suporte e pelo painel da equipe.
// - Foto: reduzida no aparelho (até 1600 px, JPEG) e gravada na própria mensagem, ou no Storage quando houver.
// - Vídeo: só com o Firebase Storage (até 50 MB).
// - Arquivo (PDF): até 700 KB na mensagem; com Storage, até 20 MB.
// A mensagem guarda anexo: { tipo: "imagem" | "video" | "arquivo", url, nome }. Sem dependência do rede.js.
// =====================================================
const LIMITE_DOC = 700000;          // bytes do texto "data:" dentro da mensagem (o documento tem limite de 1 MB)
let storageFns = null;
async function storage() {
  if (!window.firebaseStorage) return null;
  if (!storageFns) { try { storageFns = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js"); } catch { storageFns = null; } }
  return storageFns;
}
export const temStorage = () => !!window.firebaseStorage;
// O que o seletor de arquivos aceita (sem Storage, vídeo fica de fora).
export const aceitos = () => (temStorage() ? "image/*,video/*,application/pdf" : "image/*,application/pdf");

// "data:" vira arquivo sem fetch (a CSP das páginas bloqueia fetch de data:).
function dataParaBlob(d) { const [cab, b64] = d.split(","); const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: cab.slice(5).split(";")[0] }); }
const lerDataUrl = (blob) => new Promise((ok, erro) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => erro(r.error); r.readAsDataURL(blob); });
async function reduzirFoto(arquivo, lado = 1600, qualidade = 0.82) {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => erro(new Error("Não foi possível abrir a foto.")); i.src = url; });
    let q = qualidade, l = lado, dados = "";
    for (let tentativa = 0; tentativa < 6; tentativa++) {
      const k = Math.min(1, l / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
      dados = c.toDataURL("image/jpeg", q);
      if (dados.length <= LIMITE_DOC) return dados;
      q = Math.max(0.5, q - 0.1); l = Math.round(l * 0.82);
    }
    return dados;
  } finally { URL.revokeObjectURL(url); }
}
// Prepara o arquivo escolhido. Devolve { tipo, url, nome } ou lança um erro com a explicação para a pessoa.
export async function prepararAnexo(arquivo, pasta) {
  const nome = String(arquivo.name || "arquivo").slice(0, 120);
  const st = await storage();
  const subir = async (blob, ext) => {
    const r = st.ref(window.firebaseStorage, `${pasta}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`);
    await st.uploadBytes(r, blob, { contentType: blob.type || undefined });
    return st.getDownloadURL(r);
  };
  if (arquivo.type.startsWith("image/")) {
    const dados = await reduzirFoto(arquivo);
    if (st) return { tipo: "imagem", url: await subir(dataParaBlob(dados), "jpg"), nome };
    if (dados.length > LIMITE_DOC) throw new Error("A foto ficou grande demais. Tente outra ou um recorte menor.");
    return { tipo: "imagem", url: dados, nome };
  }
  if (arquivo.type.startsWith("video/")) {
    if (!st) throw new Error("O envio de vídeos ainda não está disponível. Mande uma foto ou um print da tela.");
    if (arquivo.size > 50 * 1024 * 1024) throw new Error("O vídeo deve ter até 50 MB.");
    return { tipo: "video", url: await subir(arquivo, (arquivo.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "mp4"), nome };
  }
  if (arquivo.type === "application/pdf") {
    if (st) { if (arquivo.size > 20 * 1024 * 1024) throw new Error("O arquivo deve ter até 20 MB."); return { tipo: "arquivo", url: await subir(arquivo, "pdf"), nome }; }
    const dados = await lerDataUrl(arquivo);
    if (dados.length > LIMITE_DOC) throw new Error("O PDF deve ter até 500 KB. Mande uma foto da página que importa.");
    return { tipo: "arquivo", url: dados, nome };
  }
  throw new Error("Envie uma foto, um vídeo ou um PDF.");
}
// Só o que o próprio site grava (data: de foto/PDF ou o Storage do Firebase).
const urlOk = (a) => typeof a?.url === "string" && /^(data:(image\/jpeg|application\/pdf);base64,|https:\/\/firebasestorage\.googleapis\.com\/)/.test(a.url);
const tamanho = (url) => (url.startsWith("data:") ? Math.round((url.length * 3) / 4 / 1024) : 0);

const CSS = `
.ax-anexo { display: block; margin-top: 6px; max-width: 260px; border-radius: 14px; overflow: hidden; }
.ax-anexo img, .ax-anexo video { display: block; width: 100%; max-height: 320px; object-fit: cover; background: #0004; cursor: zoom-in; }
.ax-anexo video { cursor: auto; object-fit: contain; background: #000; }
.ax-doc { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 14px; background: color-mix(in srgb, currentColor 10%, transparent); color: inherit; text-decoration: none; }
.ax-doc .ic { flex: none; width: 38px; height: 44px; border-radius: 8px; display: grid; place-items: center; background: #e5484d; color: #fff; font-size: 11px; font-weight: 900; letter-spacing: .03em; }
.ax-doc .tx { min-width: 0; display: grid; gap: 1px; }
.ax-doc b { font-size: 13.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ax-doc small { font-size: 11.5px; opacity: .7; }
.ax-ver { position: fixed; inset: 0; z-index: 9900; display: grid; place-items: center; background: rgba(0, 0, 0, .92); }
.ax-ver img { max-width: 100%; max-height: 100%; object-fit: contain; }
.ax-ver button { position: absolute; top: calc(12px + env(safe-area-inset-top)); right: 12px; width: 44px; height: 44px; border-radius: 50%; border: 0; background: #ffffff22; color: #fff; font-size: 26px; cursor: pointer; }
.ax-previa { display: flex; align-items: center; gap: 10px; padding: 8px 10px; margin: 0 0 8px; border-radius: 14px; border: 1px solid var(--line, #2a3a44); background: var(--panel-2, #162128); font-size: 13px; }
.ax-previa .ft { flex: none; width: 46px; height: 46px; border-radius: 10px; background: #0004 center / cover no-repeat; display: grid; place-items: center; font-size: 11px; font-weight: 900; color: #fff; }
.ax-previa .tx { flex: 1; min-width: 0; display: grid; } .ax-previa .tx b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .ax-previa .tx small { opacity: .7; }
.ax-previa button { flex: none; width: 34px; height: 34px; border-radius: 50%; border: 0; background: color-mix(in srgb, currentColor 12%, transparent); color: inherit; font-size: 20px; cursor: pointer; }
`;
let cssPronto = false;
function css() { if (cssPronto) return; cssPronto = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); }

// Foto em tela cheia (toque para fechar).
function verFoto(url) {
  const v = document.createElement("div"); v.className = "ax-ver"; v.setAttribute("role", "dialog"); v.setAttribute("aria-label", "Foto");
  const img = document.createElement("img"); img.src = url; img.alt = "Foto enviada";
  const x = document.createElement("button"); x.type = "button"; x.setAttribute("aria-label", "Fechar"); x.textContent = "×";
  const fechar = () => { v.remove(); document.removeEventListener("keydown", tecla); };
  const tecla = (e) => { if (e.key === "Escape") fechar(); };
  v.addEventListener("click", fechar); document.addEventListener("keydown", tecla);
  v.append(img, x); document.body.appendChild(v);
}
// Anexo dentro do balão da mensagem.
export function blocoAnexo(a) {
  if (!a || !urlOk(a)) return null;
  css();
  if (a.tipo === "imagem") {
    const b = document.createElement("div"); b.className = "ax-anexo";
    const img = document.createElement("img"); img.src = a.url; img.alt = a.nome || "Foto enviada"; img.loading = "lazy";
    img.addEventListener("click", (e) => { e.stopPropagation(); verFoto(a.url); });
    b.appendChild(img); return b;
  }
  if (a.tipo === "video") {
    const b = document.createElement("div"); b.className = "ax-anexo";
    const v = document.createElement("video"); v.src = a.url; v.controls = true; v.playsInline = true; v.preload = "metadata";
    b.appendChild(v); return b;
  }
  const d = document.createElement("a"); d.className = "ax-doc"; d.href = a.url; d.download = a.nome || "arquivo.pdf"; d.target = "_blank"; d.rel = "noopener";
  const ic = document.createElement("span"); ic.className = "ic"; ic.textContent = "PDF";
  const tx = document.createElement("span"); tx.className = "tx";
  const b = document.createElement("b"); b.textContent = a.nome || "Arquivo";
  const s = document.createElement("small"); const kb = tamanho(a.url); s.textContent = (kb ? `${kb} KB · ` : "") + "Toque para baixar";
  tx.append(b, s); d.append(ic, tx);
  return d;
}
// Prévia do anexo escolhido, antes de enviar (com X para tirar).
export function previaAnexo(a, aoTirar) {
  css();
  const p = document.createElement("div"); p.className = "ax-previa";
  const ft = document.createElement("span"); ft.className = "ft";
  if (a.tipo === "imagem") ft.style.backgroundImage = `url("${a.url}")`; else { ft.textContent = a.tipo === "video" ? "VÍDEO" : "PDF"; ft.style.background = a.tipo === "video" ? "#6d28d9" : "#e5484d"; }
  const tx = document.createElement("span"); tx.className = "tx";
  const b = document.createElement("b"); b.textContent = a.nome || "Anexo";
  const s = document.createElement("small"); s.textContent = a.tipo === "imagem" ? "Foto" : a.tipo === "video" ? "Vídeo" : "PDF";
  tx.append(b, s);
  const x = document.createElement("button"); x.type = "button"; x.setAttribute("aria-label", "Tirar o anexo"); x.textContent = "×"; x.addEventListener("click", aoTirar);
  p.append(ft, tx, x);
  return p;
}
