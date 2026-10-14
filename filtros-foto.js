// =====================================================
// Filtros de foto do Flash (como os apps de câmera): processados pixel a pixel no canvas,
// então a prévia ao vivo e a foto gravada são exatamente iguais, em qualquer navegador.
//
// Etapas (cada filtro liga as que precisa):
//  1. beleza   – pele lisa: mistura uma cópia bem desfocada SÓ onde é pele (tom de pele em YCbCr)
//                e onde não há contorno (olhos, sobrancelhas, boca e cabelo continuam nítidos)
//  2. nitidez  – "HD": realça os detalhes finos (máscara de nitidez na luminância)
//  3. brilho   – glow suave nas partes claras (luz de estúdio)
//  4. exposição, temperatura (quente/frio), contraste, saturação
//  5. desbotado (pretos levantados, como filme), tons de cinema (sombras azuladas, luzes douradas)
//  6. preto e branco e vinheta (cantos um pouco mais escuros)
// =====================================================
export const FILTROS = [
  { id: "original", nome: "Original" },
  { id: "beleza", nome: "Beleza", beleza: 0.6, exp: 0.04, temp: 0.03, sat: 1.03, brilho: 0.08 },
  { id: "beleza2", nome: "Beleza+", beleza: 0.9, exp: 0.07, temp: 0.04, sat: 1.02, cont: 0.97, brilho: 0.14 },
  { id: "radiante", nome: "Radiante", beleza: 0.35, exp: 0.08, sat: 1.1, temp: 0.03, brilho: 0.28, cont: 1.02 },
  { id: "hd", nome: "HD", nitidez: 0.75, cont: 1.07, sat: 1.1, vinheta: 0.12 },
  { id: "dourado", nome: "Dourado", temp: 0.13, sat: 1.12, cont: 1.05, luzes: [255, 196, 120, 0.1], vinheta: 0.18, beleza: 0.25 },
  { id: "brisa", nome: "Brisa", temp: -0.08, exp: 0.06, sat: 0.94, desbotado: 0.06, luzes: [200, 230, 255, 0.06] },
  { id: "cinema", nome: "Cinema", cont: 1.12, sat: 1.04, sombras: [0, 110, 140, 0.16], luzes: [255, 170, 90, 0.12], vinheta: 0.3, nitidez: 0.25 },
  { id: "retro", nome: "Retrô", desbotado: 0.14, temp: 0.08, sat: 0.8, cont: 0.95, sombras: [70, 40, 90, 0.08], vinheta: 0.25 },
  { id: "pb", nome: "P&B", mono: true, cont: 1.16, nitidez: 0.35, vinheta: 0.15 }
];
export const filtroPorId = (id) => FILTROS.find((f) => f.id === id) || FILTROS[0];
export const semFiltro = (f) => !f || f.id === "original";

// Cópia desfocada (redução e ampliação em 2 passos: macio e igual em todo navegador).
function desfocar(fonte, w, h, fator) {
  const pw = Math.max(4, Math.round(w / fator)), ph = Math.max(4, Math.round(h / fator));
  const p = document.createElement("canvas"); p.width = pw; p.height = ph;
  const gp = p.getContext("2d"); gp.imageSmoothingQuality = "high"; gp.drawImage(fonte, 0, 0, pw, ph);
  const m = document.createElement("canvas"); m.width = Math.round(pw * 2.2); m.height = Math.round(ph * 2.2);
  const gm = m.getContext("2d"); gm.imageSmoothingQuality = "high"; gm.drawImage(p, 0, 0, m.width, m.height);
  const o = document.createElement("canvas"); o.width = w; o.height = h;
  const go = o.getContext("2d", { willReadFrequently: true }); go.imageSmoothingQuality = "high"; go.drawImage(m, 0, 0, w, h);
  return go.getImageData(0, 0, w, h).data;
}

// Aplica o filtro no canvas inteiro (no lugar). Serve para a prévia (pequena) e para a foto final.
export function aplicarFiltro(canvas, f) {
  if (semFiltro(f)) return canvas;
  const w = canvas.width, h = canvas.height;
  const g = canvas.getContext("2d", { willReadFrequently: true });
  const img = g.getImageData(0, 0, w, h), p = img.data;
  const lado = Math.max(w, h);
  // Desfoque grande (pele/brilho) proporcional ao tamanho; pequeno para a nitidez.
  const grande = f.beleza || f.brilho ? desfocar(canvas, w, h, Math.max(4, lado / 90)) : null;
  const pequeno = f.nitidez ? desfocar(canvas, w, h, Math.max(1.6, lado / 640)) : null;
  const beleza = f.beleza || 0, nit = f.nitidez || 0, brilho = f.brilho || 0;
  const exp = 1 + (f.exp || 0), temp = f.temp || 0, cont = f.cont ?? 1, sat = f.sat ?? 1;
  const desb = (f.desbotado || 0) * 255;
  const [sr, sg, sb, sa] = f.sombras || [0, 0, 0, 0];
  const [lr, lg, lb, la] = f.luzes || [0, 0, 0, 0];
  const vin = f.vinheta || 0, cx = w / 2, cy = h / 2, raio2 = cx * cx + cy * cy;
  const mono = !!f.mono;
  for (let y = 0, i = 0; y < h; y++) {
    const dy = (y - cy) * (y - cy);
    for (let x = 0; x < w; x++, i += 4) {
      let r = p[i], gr = p[i + 1], b = p[i + 2];
      // 1) pele lisa: só onde é pele e onde não há contorno
      if (beleza) {
        const R = grande[i], G = grande[i + 1], B = grande[i + 2];
        const cb = 128 - 0.168736 * r - 0.331264 * gr + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * gr - 0.081312 * b;
        // tom de pele (faixa larga e suave: vale para todos os tons)
        const pele = Math.max(0, 1 - Math.max(0, Math.abs(cb - 108) - 14) / 14) * Math.max(0, 1 - Math.max(0, Math.abs(cr - 152) - 16) / 14);
        if (pele > 0) {
          const det = Math.abs((r + gr + b) - (R + G + B)) / 3; // detalhe local
          const liso = Math.max(0, 1 - det / 26);
          const a = beleza * pele * liso * liso;
          r += (R - r) * a; gr += (G - gr) * a; b += (B - b) * a;
          // um pouco mais de luz na pele (aparência descansada)
          const l = 1 + 0.05 * beleza * pele; r *= l; gr *= l; b *= l;
        }
      }
      // 2) nitidez (HD): realça o detalhe fino da luminância
      if (nit) {
        const lum = 0.299 * r + 0.587 * gr + 0.114 * b;
        const lumB = 0.299 * pequeno[i] + 0.587 * pequeno[i + 1] + 0.114 * pequeno[i + 2];
        const d = (lum - lumB) * nit * 1.6;
        r += d; gr += d; b += d;
      }
      // 3) brilho suave (screen com a cópia desfocada)
      if (brilho) {
        r = 255 - (255 - r) * (255 - grande[i] * brilho) / 255;
        gr = 255 - (255 - gr) * (255 - grande[i + 1] * brilho) / 255;
        b = 255 - (255 - b) * (255 - grande[i + 2] * brilho) / 255;
      }
      // 4) exposição, temperatura, contraste, saturação
      r *= exp * (1 + temp); gr *= exp * (1 + temp * 0.15); b *= exp * (1 - temp);
      if (cont !== 1) { r = (r - 128) * cont + 128; gr = (gr - 128) * cont + 128; b = (b - 128) * cont + 128; }
      let lum = 0.299 * r + 0.587 * gr + 0.114 * b;
      if (mono) { r = gr = b = lum; }
      else if (sat !== 1) { r = lum + (r - lum) * sat; gr = lum + (gr - lum) * sat; b = lum + (b - lum) * sat; }
      // 5) desbotado e tons de cinema
      if (desb) { r = desb + r * (1 - desb / 255); gr = desb + gr * (1 - desb / 255); b = desb + b * (1 - desb / 255); }
      if (sa || la) {
        const t = Math.min(1, Math.max(0, lum / 255));
        const ks = sa * (1 - t) * (1 - t), kl = la * t * t;
        r += (sr - r) * ks + (lr - r) * kl; gr += (sg - gr) * ks + (lg - gr) * kl; b += (sb - b) * ks + (lb - b) * kl;
      }
      // 6) vinheta
      if (vin) { const v = 1 - vin * ((x - cx) * (x - cx) + dy) / raio2; r *= v; gr *= v; b *= v; }
      p[i] = r; p[i + 1] = gr; p[i + 2] = b; // Uint8ClampedArray já limita entre 0 e 255
    }
  }
  g.putImageData(img, 0, 0);
  return canvas;
}

// Copia uma imagem/vídeo para um canvas novo (com tamanho máximo) e aplica o filtro.
export function imagemFiltrada(fonte, f, { max = 1440, larg, alt } = {}) {
  const fw = larg || fonte.naturalWidth || fonte.videoWidth || fonte.width, fh = alt || fonte.naturalHeight || fonte.videoHeight || fonte.height;
  const k = Math.min(1, max / Math.max(fw, fh));
  const c = document.createElement("canvas"); c.width = Math.round(fw * k); c.height = Math.round(fh * k);
  const g = c.getContext("2d", { willReadFrequently: true }); g.imageSmoothingQuality = "high";
  g.drawImage(fonte, 0, 0, c.width, c.height);
  return aplicarFiltro(c, f);
}
