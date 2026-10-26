// =====================================================
// QR Code e arte do perfil (sem dependências do site; o gerador MIT é carregado só quando precisa).
// - qrSvg(texto, rotulo): QR em SVG (Pix do chat e dos planos).
// - artePerfil({ nome, rotulo, cor, url, foto }): imagem PNG 1080×1350 nas cores do site (foto/logo, nome, tipo,
//   QR Code e o link) para imprimir ou mandar no WhatsApp.
// - compartilharPerfil(...): manda a arte JUNTO com o texto e o link (WhatsApp e outros apps recebem a imagem);
//   onde o aparelho não manda arquivo, manda só o texto com o link; sem compartilhar, copia o link.
// =====================================================
let gerador = null;
async function qr(texto) {
  gerador ||= import("./qrcode-gerador.js?v=1").then((m) => m.default);
  const q = (await gerador)(0, "M"); q.addData(texto); q.make();
  return q;
}

export async function qrSvg(texto, rotulo = "QR Code") {
  const q = await qr(texto);
  const n = q.getModuleCount(), m = 4, t = n + m * 2;
  let d = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) d += `M${x + m} ${y + m}h1v1h-1z`;
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg"); svg.setAttribute("viewBox", `0 0 ${t} ${t}`); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", rotulo);
  const fundo = document.createElementNS(ns, "rect"); fundo.setAttribute("width", t); fundo.setAttribute("height", t); fundo.setAttribute("fill", "#fff");
  const p = document.createElementNS(ns, "path"); p.setAttribute("d", d); p.setAttribute("fill", "#0f1b22");
  svg.append(fundo, p);
  return svg;
}

// Desenha o QR num canvas (com a margem branca obrigatória).
export async function desenharQr(ctx, x, y, tam, texto) {
  const q = await qr(texto);
  const k = q.getModuleCount(), m = tam / (k + 8);
  ctx.fillStyle = "#fff"; ctx.fillRect(x, y, tam, tam);
  ctx.fillStyle = "#0b1014";
  for (let r = 0; r < k; r++) for (let c = 0; c < k; c++) if (q.isDark(r, c)) ctx.fillRect(Math.floor(x + (c + 4) * m), Math.floor(y + (r + 4) * m), Math.ceil(m), Math.ceil(m));
}

const carregar = (src) => new Promise((ok) => {
  if (!src) return ok(null);
  const i = new Image(); i.crossOrigin = "anonymous";
  const t = setTimeout(() => ok(null), 4000);
  i.onload = () => { clearTimeout(t); ok(i); }; i.onerror = () => { clearTimeout(t); ok(null); };
  i.src = src;
});
function texto(g, t, x, y, max) { let s = String(t || ""); while (s.length > 1 && g.measureText(s).width > max) s = s.slice(0, -2) + "…"; g.fillText(s, x, y); }
function redondo(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// Arte do perfil: fundo preto, painel #111, marca, foto/logo com anel na cor do tipo, nome, etiqueta do tipo,
// QR Code num cartão branco, o link e "Aponte a câmera". Devolve um Blob PNG.
export async function artePerfil({ nome = "", rotulo = "", cor = "#00ADEE", url = "", foto = "" } = {}) {
  const W = 1080, H = 1350, a = document.createElement("canvas"); a.width = W; a.height = H;
  const g = a.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
  // brilho suave na cor do tipo
  const brilho = g.createRadialGradient(W / 2, 0, 40, W / 2, 0, 900); brilho.addColorStop(0, cor + "55"); brilho.addColorStop(1, "transparent");
  g.fillStyle = brilho; g.fillRect(0, 0, W, H);
  g.fillStyle = "#111"; redondo(g, 56, 56, W - 112, H - 112, 48); g.fill();
  g.strokeStyle = cor + "66"; g.lineWidth = 3; redondo(g, 56, 56, W - 112, H - 112, 48); g.stroke();
  g.textAlign = "center"; g.textBaseline = "alphabetic";
  g.font = "900 46px Arial, sans-serif"; const larg = g.measureText("HELP FLORIPA").width;
  g.fillStyle = "#fff"; g.textAlign = "left"; g.fillText("HELP ", W / 2 - larg / 2, 150);
  g.fillStyle = "#00ADEE"; g.fillText("FLORIPA", W / 2 - larg / 2 + g.measureText("HELP ").width, 150);
  g.textAlign = "center";
  // foto ou iniciais
  const cx = W / 2, cy = 300, r = 92;
  g.beginPath(); g.arc(cx, cy, r + 10, 0, Math.PI * 2); g.fillStyle = cor; g.fill();
  const img = await carregar(foto);
  g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
  if (img) { const s = Math.max((2 * r) / img.width, (2 * r) / img.height); g.drawImage(img, cx - (img.width * s) / 2, cy - (img.height * s) / 2, img.width * s, img.height * s); }
  else { g.fillStyle = "#0b2a38"; g.fillRect(cx - r, cy - r, 2 * r, 2 * r); g.fillStyle = "#fff"; g.font = "800 72px Arial, sans-serif"; g.textBaseline = "middle"; g.fillText(String(nome).trim().split(/\s+/).map((p) => p[0] || "").slice(0, 2).join("").toUpperCase() || "HF", cx, cy + 4); g.textBaseline = "alphabetic"; }
  g.restore();
  g.fillStyle = "#fff"; g.font = "800 56px Arial, sans-serif"; texto(g, nome, W / 2, 478, W - 220);
  if (rotulo) {
    g.font = "800 30px Arial, sans-serif"; const w = g.measureText(rotulo).width + 52;
    g.fillStyle = cor + "33"; redondo(g, W / 2 - w / 2, 506, w, 54, 27); g.fill();
    g.fillStyle = cor; g.fillText(rotulo, W / 2, 543);
  }
  // QR num cartão branco
  const q = 520, qx = (W - q) / 2, qy = 600;
  g.fillStyle = "#fff"; redondo(g, qx - 24, qy - 24, q + 48, q + 48, 36); g.fill();
  await desenharQr(g, qx, qy, q, url);
  g.fillStyle = "#00ADEE"; g.font = "800 38px Arial, sans-serif"; texto(g, url.replace(/^https?:\/\//, ""), W / 2, 1218, W - 200);
  g.fillStyle = "#b7c3ca"; g.font = "500 30px Arial, sans-serif"; g.fillText("Aponte a câmera do celular para abrir o perfil", W / 2, 1270);
  return new Promise((ok) => a.toBlob((b) => ok(b), "image/png"));
}

// Compartilhar o perfil com a arte (imagem + texto com o link). Devolve "imagem", "texto", "copiado" ou "" (cancelado).
export async function compartilharPerfil({ nome = "", rotulo = "", cor, url, foto = "", arquivo = "perfil-help-floripa.png" } = {}) {
  const msg = `Conheça ${nome || "este perfil"}${rotulo ? ` (${rotulo})` : ""} no Help Floripa 👉 ${url}`;
  try {
    if (navigator.share) {
      const blob = await artePerfil({ nome, rotulo, cor, url, foto }).catch(() => null);
      const file = blob ? new File([blob], arquivo, { type: "image/png" }) : null;
      if (file && navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: nome, text: msg }); return "imagem"; }
      await navigator.share({ title: nome, text: msg, url }); return "texto";
    }
    await navigator.clipboard.writeText(url); return "copiado";
  } catch (e) { if (e?.name === "AbortError") return ""; throw e; }
}

// Baixar a arte (para imprimir).
export async function baixarArte(opcoes, nomeArquivo) {
  const blob = await artePerfil(opcoes);
  const l = document.createElement("a"); l.href = URL.createObjectURL(blob); l.download = nomeArquivo;
  document.body.appendChild(l); l.click(); l.remove();
  setTimeout(() => URL.revokeObjectURL(l.href), 5000);
}
