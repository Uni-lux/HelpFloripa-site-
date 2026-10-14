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

// =====================================================
// Placa de vídeo (WebGL): o mesmo filtro, mas calculado pela GPU — ao vivo na câmera e instantâneo na foto.
// A pele lisa aqui é um filtro bilateral de verdade (média só dos vizinhos de cor parecida: suaviza a pele
// e não borra olhos, boca e contornos). Sem WebGL, cai no cálculo acima (mais lento, mesmo resultado).
// =====================================================
const VS = `attribute vec2 p; varying vec2 v; varying vec2 qv; uniform vec4 rec; uniform float esp;
void main(){ vec2 q = p * 0.5 + 0.5; qv = p * 0.5; v = rec.xy + vec2(esp > 0.5 ? 1.0 - q.x : q.x, 1.0 - q.y) * rec.zw; gl_Position = vec4(p, 0.0, 1.0); }`;
const FS = `precision mediump float;
varying vec2 v; varying vec2 qv; uniform sampler2D t; uniform vec2 texel; uniform vec2 raio;
uniform float beleza, nit, brilho, expo, temp, cont, sat, desb, vin, mono;
uniform vec4 somb, luz;
vec3 px(vec2 o){ return texture2D(t, v + o).rgb; }
void main(){
  vec3 c = px(vec2(0.0));
  vec3 media = vec3(0.0), soma = vec3(0.0); float pesos = 0.0;
  if (beleza > 0.0 || brilho > 0.0) {
    for (int i = 0; i < 12; i++) {
      float a = float(i) * 0.5235988;
      vec2 d = vec2(cos(a), sin(a));
      for (int r = 1; r <= 2; r++) {
        vec3 s = px(d * raio * float(r) * 0.5);
        media += s;
        vec3 dd = s - c; float w = exp(-dot(dd, dd) * 45.0);
        soma += s * w; pesos += w;
      }
    }
    media /= 24.0;
  }
  if (beleza > 0.0) {
    vec3 bil = (soma + c) / (pesos + 1.0);
    float cb = (0.5 - 0.168736 * c.r - 0.331264 * c.g + 0.5 * c.b) * 255.0;
    float cr = (0.5 + 0.5 * c.r - 0.418688 * c.g - 0.081312 * c.b) * 255.0;
    float pele = clamp(1.0 - max(0.0, abs(cb - 108.0) - 14.0) / 14.0, 0.0, 1.0) * clamp(1.0 - max(0.0, abs(cr - 152.0) - 16.0) / 14.0, 0.0, 1.0);
    float a = beleza * pele;
    c = mix(c, bil, a) * (1.0 + 0.05 * beleza * pele);
  }
  if (nit > 0.0) {
    vec3 b4 = (px(vec2(texel.x, 0.0)) + px(vec2(-texel.x, 0.0)) + px(vec2(0.0, texel.y)) + px(vec2(0.0, -texel.y))) * 0.25;
    c += dot(c - b4, vec3(0.299, 0.587, 0.114)) * nit * 1.6;
  }
  if (brilho > 0.0) c = 1.0 - (1.0 - c) * (1.0 - media * brilho);
  c *= expo * vec3(1.0 + temp, 1.0 + temp * 0.15, 1.0 - temp);
  c = (c - 0.5) * cont + 0.5;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mono > 0.5 ? vec3(l) : mix(vec3(l), c, sat);
  c = desb + c * (1.0 - desb);
  float tt = clamp(l, 0.0, 1.0);
  c += (somb.rgb - c) * somb.a * (1.0 - tt) * (1.0 - tt) + (luz.rgb - c) * luz.a * tt * tt;
  c *= 1.0 - vin * dot(qv, qv) * 2.0;
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;
export class FiltroGL {
  constructor(canvas = document.createElement("canvas")) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false }) || canvas.getContext("experimental-webgl", { preserveDrawingBuffer: true });
    if (!gl) throw new Error("sem WebGL");
    const sh = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error("WebGL: programa");
    gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const lp = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach((k) => gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    this.gl = gl; this.u = {};
    ["rec", "esp", "texel", "raio", "beleza", "nit", "brilho", "expo", "temp", "cont", "sat", "desb", "vin", "mono", "somb", "luz"].forEach((n) => { this.u[n] = gl.getUniformLocation(pr, n); });
  }
  // Desenha a fonte (foto, vídeo ou canvas) com o filtro. recorte = parte da fonte (em px); espelho = selfie.
  desenhar(fonte, f, largura, altura, { recorte = null, espelho = false } = {}) {
    const gl = this.gl, u = this.u;
    const fw = fonte.naturalWidth || fonte.videoWidth || fonte.width, fh = fonte.naturalHeight || fonte.videoHeight || fonte.height;
    if (!fw || !fh) return this.canvas;
    if (this.canvas.width !== largura || this.canvas.height !== altura) { this.canvas.width = largura; this.canvas.height = altura; }
    gl.viewport(0, 0, largura, altura);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fonte);
    const r = recorte || { x: 0, y: 0, w: fw, h: fh };
    gl.uniform4f(u.rec, r.x / fw, r.y / fh, r.w / fw, r.h / fh);
    gl.uniform1f(u.esp, espelho ? 1 : 0);
    // nitidez: vizinho a ~1 px da saída; pele/brilho: raio proporcional ao tamanho (como no cálculo pela CPU)
    const pxSaida = Math.max(r.w / largura, r.h / altura);
    gl.uniform2f(u.texel, (1.4 * pxSaida) / fw, (1.4 * pxSaida) / fh);
    const R = Math.max(r.w, r.h) / 90;
    gl.uniform2f(u.raio, R / fw, R / fh);
    const g = semFiltro(f) ? {} : f;
    gl.uniform1f(u.beleza, g.beleza || 0); gl.uniform1f(u.nit, g.nitidez || 0); gl.uniform1f(u.brilho, g.brilho || 0);
    gl.uniform1f(u.expo, 1 + (g.exp || 0)); gl.uniform1f(u.temp, g.temp || 0); gl.uniform1f(u.cont, g.cont ?? 1); gl.uniform1f(u.sat, g.sat ?? 1);
    gl.uniform1f(u.desb, g.desbotado || 0); gl.uniform1f(u.vin, g.vinheta || 0); gl.uniform1f(u.mono, g.mono ? 1 : 0);
    const cor = (a) => (a ? [a[0] / 255, a[1] / 255, a[2] / 255, a[3]] : [0, 0, 0, 0]);
    gl.uniform4f(u.somb, ...cor(g.sombras)); gl.uniform4f(u.luz, ...cor(g.luzes));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return this.canvas;
  }
}
let glFora = null, semGL = false;
// Um renderizador "fora da tela" (fotos, amostras, foto final). null = aparelho sem WebGL.
export function filtroGLFora() {
  if (semGL) return null;
  try { return (glFora ||= new FiltroGL()); } catch (e) { console.warn("Filtros sem WebGL:", e?.message || e); semGL = true; return null; }
}

// Copia uma imagem/vídeo para um canvas novo (com tamanho máximo) e aplica o filtro (pela GPU quando dá).
export function imagemFiltrada(fonte, f, { max = 1440, larg, alt } = {}) {
  const fw = larg || fonte.naturalWidth || fonte.videoWidth || fonte.width, fh = alt || fonte.naturalHeight || fonte.videoHeight || fonte.height;
  const k = Math.min(1, max / Math.max(fw, fh));
  const c = document.createElement("canvas"); c.width = Math.round(fw * k); c.height = Math.round(fh * k);
  const g = c.getContext("2d", { willReadFrequently: true }); g.imageSmoothingQuality = "high";
  const r = semFiltro(f) ? null : filtroGLFora();
  if (r) { g.drawImage(r.desenhar(fonte, f, c.width, c.height), 0, 0); return c; }
  g.drawImage(fonte, 0, 0, c.width, c.height);
  return aplicarFiltro(c, f);
}
