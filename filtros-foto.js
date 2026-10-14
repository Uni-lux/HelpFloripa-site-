// =====================================================
// Filtros de foto (Flash): os mesmos na prévia (CSS) e na foto gravada (canvas).
// - Cor: brilho, contraste, saturação, sépia, preto e branco e matiz, como no CSS.
//   Onde o canvas não aceita "filter" (Safari antigo), a mesma conta é feita pixel a pixel
//   com uma matriz só (todas essas operações são lineares).
// - "Pele suave": uma cópia desfocada por cima, bem leve, que suaviza manchas e poros
//   sem apagar olhos e contornos (desfoque por redução, funciona em qualquer navegador).
// =====================================================
export const FILTROS = [
  { id: "normal", nome: "Normal" },
  { id: "suave", nome: "Pele suave", b: 1.05, c: 0.96, s: 1.04, suave: 0.42 },
  { id: "luz", nome: "Luz", b: 1.12, c: 1.04, s: 1.06 },
  { id: "vivido", nome: "Vívido", c: 1.12, s: 1.38 },
  { id: "quente", nome: "Quente", b: 1.03, s: 1.18, sep: 0.22 },
  { id: "frio", nome: "Frio", b: 1.02, c: 1.03, s: 0.92, h: -12 },
  { id: "retro", nome: "Retrô", b: 1.05, c: 0.94, s: 0.85, sep: 0.45 },
  { id: "pb", nome: "P&B", c: 1.12, g: 1 }
];
export const filtroPorId = (id) => FILTROS.find((f) => f.id === id) || FILTROS[0];

// Texto do filtro em CSS (mesma ordem da conta do canvas).
export function cssFiltro(f) {
  if (!f || f.id === "normal") return "none";
  const p = [];
  if (f.b != null) p.push(`brightness(${f.b})`);
  if (f.c != null) p.push(`contrast(${f.c})`);
  if (f.s != null) p.push(`saturate(${f.s})`);
  if (f.sep != null) p.push(`sepia(${f.sep})`);
  if (f.g != null) p.push(`grayscale(${f.g})`);
  if (f.h != null) p.push(`hue-rotate(${f.h}deg)`);
  return p.join(" ") || "none";
}

let temFiltroCanvas = null;
export function canvasAceitaFiltro() {
  if (temFiltroCanvas != null) return temFiltroCanvas;
  try { const g = document.createElement("canvas").getContext("2d"); g.filter = "blur(2px)"; temFiltroCanvas = g.filter === "blur(2px)"; }
  catch { temFiltroCanvas = false; }
  return temFiltroCanvas;
}

// ---------- matriz de cor (afim: M·rgb + t), composta na ordem do CSS ----------
const id3 = () => ({ m: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] });
function compor(atual, a, off = [0, 0, 0]) { // aplica "a" depois de "atual"
  const m = new Array(9), t = new Array(3);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) m[i * 3 + j] = a[i * 3] * atual.m[j] + a[i * 3 + 1] * atual.m[3 + j] + a[i * 3 + 2] * atual.m[6 + j];
    t[i] = a[i * 3] * atual.t[0] + a[i * 3 + 1] * atual.t[1] + a[i * 3 + 2] * atual.t[2] + off[i];
  }
  return { m, t };
}
const saturar = (s) => [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s, 0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s, 0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s];
const sepia = (a) => { const k = 1 - a; return [0.393 + 0.607 * k, 0.769 - 0.769 * k, 0.189 - 0.189 * k, 0.349 - 0.349 * k, 0.686 + 0.314 * k, 0.168 - 0.168 * k, 0.272 - 0.272 * k, 0.534 - 0.534 * k, 0.131 + 0.869 * k]; };
function matiz(graus) {
  const r = (graus * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return [0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
    0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.140, 0.072 - c * 0.072 - s * 0.283,
    0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072];
}
function matrizDo(f) {
  let x = id3();
  if (f.b != null) x = compor(x, [f.b, 0, 0, 0, f.b, 0, 0, 0, f.b]);
  if (f.c != null) { const o = (0.5 - 0.5 * f.c) * 255; x = compor(x, [f.c, 0, 0, 0, f.c, 0, 0, 0, f.c], [o, o, o]); }
  if (f.s != null) x = compor(x, saturar(f.s));
  if (f.sep != null) x = compor(x, sepia(f.sep));
  if (f.g != null) x = compor(x, saturar(1 - f.g));
  if (f.h != null) x = compor(x, matiz(f.h));
  return x;
}
function corPixelAPixel(canvas, f) {
  const g = canvas.getContext("2d");
  const d = g.getImageData(0, 0, canvas.width, canvas.height), p = d.data;
  const { m, t } = matrizDo(f);
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i], gr = p[i + 1], b = p[i + 2];
    p[i] = m[0] * r + m[1] * gr + m[2] * b + t[0];
    p[i + 1] = m[3] * r + m[4] * gr + m[5] * b + t[1];
    p[i + 2] = m[6] * r + m[7] * gr + m[8] * b + t[2];
  }
  g.putImageData(d, 0, 0);
}
// Desfoque por redução (rápido e igual em todo navegador).
function desfocado(canvas, fator = 10) {
  const w = Math.max(8, Math.round(canvas.width / fator)), h = Math.max(8, Math.round(canvas.height / fator));
  const p = document.createElement("canvas"); p.width = w; p.height = h;
  const gp = p.getContext("2d"); gp.imageSmoothingQuality = "high"; gp.drawImage(canvas, 0, 0, w, h);
  // duas passadas deixam o desfoque mais macio (sem "quadradinhos")
  const p2 = document.createElement("canvas"); p2.width = Math.round(w * 2.5); p2.height = Math.round(h * 2.5);
  const g2 = p2.getContext("2d"); g2.imageSmoothingQuality = "high"; g2.drawImage(p, 0, 0, p2.width, p2.height);
  return p2;
}

// Aplica o filtro no canvas inteiro (depois de desenhar a foto e antes dos textos).
export function aplicarFiltro(canvas, f) {
  if (!f || f.id === "normal") return;
  const g = canvas.getContext("2d");
  const temCor = ["b", "c", "s", "sep", "g", "h"].some((k) => f[k] != null);
  if (temCor) {
    if (canvasAceitaFiltro()) {
      const copia = document.createElement("canvas"); copia.width = canvas.width; copia.height = canvas.height;
      copia.getContext("2d").drawImage(canvas, 0, 0);
      g.save(); g.filter = cssFiltro(f); g.clearRect(0, 0, canvas.width, canvas.height); g.drawImage(copia, 0, 0); g.restore();
    } else corPixelAPixel(canvas, f);
  }
  if (f.suave) {
    const borrado = desfocado(canvas, 11);
    g.save(); g.globalAlpha = f.suave; g.imageSmoothingQuality = "high"; g.drawImage(borrado, 0, 0, canvas.width, canvas.height); g.restore();
  }
}
