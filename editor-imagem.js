// =====================================================
// Editor de imagem do Help Floripa
// Mostra a moldura exata de como a foto vai aparecer (perfil, capa,
// publicação, fundo do chat) e deixa a pessoa arrastar, dar zoom e girar.
//
// Uso:
//   import { editarImagem } from "./editor-imagem.js";
//   const dataUrl = await editarImagem(arquivo, { titulo: "Foto de perfil", proporcao: 1, circulo: true, larguraSaida: 480 });
//   if (dataUrl) { ...salvar... }   // null = cancelado
// =====================================================

const ESTILO_ID = "hf-editor-imagem-estilo";

function injetarEstilo() {
  if (document.getElementById(ESTILO_ID)) return;
  const css = `
  .hfe-fundo { position: fixed; inset: 0; z-index: 9000; background: rgba(0, 0, 0, .78); display: grid; place-items: center; padding: 16px; -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); animation: hfeEntra .2s ease-out; }
  @keyframes hfeEntra { from { opacity: 0; } }
  .hfe-caixa { width: min(560px, 100%); max-height: calc(100dvh - 32px); display: flex; flex-direction: column; background: #0b0f12; color: #f2f5f7; border: 1px solid rgba(255,255,255,.08); border-radius: 20px; overflow: hidden; box-shadow: 0 30px 90px rgba(0,0,0,.6); font-family: var(--font, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif); }
  .hfe-topo { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; padding: 10px 10px; padding-top: calc(10px + env(safe-area-inset-top)); }
  .hfe-topo h2 { margin: 0; font-size: 16px; font-weight: 750; letter-spacing: .01em; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .hfe-topo .hfe-icone { justify-self: start; border: 0; }
  .hfe-topo .hfe-btn.pri { justify-self: end; }
  .hfe-palco { position: relative; flex: 1 1 auto; min-height: 0; overflow: hidden; background: #000; touch-action: none; cursor: grab; user-select: none; -webkit-user-select: none; }
  .hfe-palco:active { cursor: grabbing; }
  .hfe-palco canvas { display: block; width: 100%; height: 100%; }
  .hfe-moldura { position: absolute; pointer-events: none; box-shadow: 0 0 0 9999px rgba(0, 0, 0, .72); outline: 1px solid rgba(255,255,255,.55); transition: box-shadow .25s, outline-color .25s; border-radius: 4px; }
  .hfe-palco.movendo .hfe-moldura { box-shadow: 0 0 0 9999px rgba(0, 0, 0, .5); outline-color: rgba(255,255,255,.9); }
  .hfe-moldura.circulo { border-radius: 50%; }
  .hfe-moldura::before, .hfe-moldura::after { content: ""; position: absolute; inset: 0; pointer-events: none; border-radius: inherit; }
  /* grade dos terços: só enquanto a pessoa mexe na foto */
  .hfe-moldura::before { background:
      linear-gradient(to right, transparent calc(33.33% - .5px), rgba(255,255,255,.4) calc(33.33% - .5px), rgba(255,255,255,.4) calc(33.33% + .5px), transparent calc(33.33% + .5px), transparent calc(66.66% - .5px), rgba(255,255,255,.4) calc(66.66% - .5px), rgba(255,255,255,.4) calc(66.66% + .5px), transparent calc(66.66% + .5px)),
      linear-gradient(to bottom, transparent calc(33.33% - .5px), rgba(255,255,255,.4) calc(33.33% - .5px), rgba(255,255,255,.4) calc(33.33% + .5px), transparent calc(33.33% + .5px), transparent calc(66.66% - .5px), rgba(255,255,255,.4) calc(66.66% - .5px), rgba(255,255,255,.4) calc(66.66% + .5px), transparent calc(66.66% + .5px));
    opacity: 0; transition: opacity .2s; }
  .hfe-palco.movendo .hfe-moldura::before { opacity: 1; }
  /* margem de segurança: aparece fraquinha ao mexer, como as guias do Instagram */
  .hfe-moldura::after { inset: var(--margem, 6%); border: 1px dashed rgba(255,255,255,.7); opacity: 0; transition: opacity .2s; }
  .hfe-palco.movendo .hfe-moldura::after { opacity: .75; }
  /* faixas de cima e de baixo (vertical 9:16): onde ficam o nome e o campo de resposta */
  .hfe-faixa { position: absolute; left: 0; right: 0; height: 13%; pointer-events: none; opacity: 0; transition: opacity .2s; display: grid; place-items: center; color: rgba(255,255,255,.9); font-size: 10.5px; font-weight: 750; letter-spacing: .03em; text-transform: uppercase; }
  .hfe-faixa.cima { top: 0; background: linear-gradient(to bottom, rgba(0,0,0,.45), transparent); }
  .hfe-faixa.baixo { bottom: 0; height: 16%; background: linear-gradient(to top, rgba(0,0,0,.45), transparent); }
  .hfe-palco.movendo .hfe-faixa { opacity: 1; }
  /* guias do meio: aparecem quando a foto fica centralizada (encaixa) */
  .hfe-guia { position: absolute; background: #ff3d7f; opacity: 0; pointer-events: none; transition: opacity .12s; box-shadow: 0 0 4px rgba(255,61,127,.6); }
  .hfe-guia.v { top: 0; bottom: 0; left: 50%; width: 1px; }
  .hfe-guia.h { left: 0; right: 0; top: 50%; height: 1px; }
  .hfe-guia.on { opacity: 1; }
  .hfe-mini { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); border: 1.5px dotted #7de3ff; pointer-events: none; }
  .hfe-mini span { position: absolute; right: 4px; bottom: 4px; padding: 2px 6px; border-radius: 6px; background: rgba(0, 60, 80, .8); color: #fff; font-size: 10.5px; font-weight: 700; white-space: nowrap; }
  .hfe-rotulo { position: absolute; left: 50%; transform: translateX(-50%); bottom: 8px; padding: 4px 10px; border-radius: 999px; background: rgba(0,0,0,.6); color: #fff; font-size: 11.5px; font-weight: 600; white-space: nowrap; pointer-events: none; }
  .hfe-extra { position: absolute; pointer-events: none; }
  .hfe-extra.avatar-capa { width: 22%; aspect-ratio: 1; left: 5%; bottom: -11%; border-radius: 50%; border: 2px dashed rgba(255,255,255,.7); background: rgba(0,0,0,.35); }
  /* marcas do site por cima da foto (capa: foto de perfil e nome) */
  .hfe-moldura.com-marcas { border-radius: 14px; overflow: visible; }
  .hfe-escuro { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: linear-gradient(180deg, rgba(0,0,0,.18) 0%, transparent 28%, rgba(4,8,11,.5) 62%, rgba(4,8,11,.85) 100%); opacity: .9; transition: opacity .2s; }
  .hfe-palco.movendo .hfe-escuro { opacity: .45; }
  .hfe-marca { position: absolute; pointer-events: none; display: grid; place-items: center; transition: opacity .2s, border-color .2s; opacity: .8; }
  .hfe-palco.movendo .hfe-marca { opacity: 1; }
  .hfe-marca.circulo { border-radius: 50%; border: 2px dashed rgba(255,255,255,.85); background: rgba(0,0,0,.28); box-shadow: 0 6px 20px rgba(0,0,0,.35); }
  .hfe-marca.texto { border-radius: 10px; border: 1.5px dashed rgba(255,255,255,.55); background: repeating-linear-gradient(180deg, rgba(255,255,255,.18) 0 7px, transparent 7px 16px) left 10px top 10px / 70% calc(100% - 20px) no-repeat; }
  .hfe-marca span { padding: 3px 8px; border-radius: 999px; background: rgba(0,0,0,.6); color: #fff; font-size: 10.5px; font-weight: 750; white-space: nowrap; }
  .hfe-dica { margin: 0; padding: 10px 18px 0; font-size: 12px; color: rgba(255,255,255,.6); line-height: 1.4; text-align: center; }
  .hfe-formatos { display: flex; justify-content: center; gap: 4px; margin: 10px auto 0; padding: 4px; border-radius: 999px; background: rgba(255,255,255,.08); width: max-content; max-width: calc(100% - 24px); flex-wrap: wrap; }
  .hfe-formatos[hidden] { display: none; }
  .hfe-formatos button { border: 0; background: transparent; color: rgba(255,255,255,.75); border-radius: 999px; padding: 7px 14px; font: inherit; font-size: 12.5px; font-weight: 750; cursor: pointer; }
  .hfe-formatos button.on { background: #fff; color: #0b0f12; }
  .hfe-controles { display: flex; align-items: center; gap: 10px; padding: 10px 16px; padding-bottom: calc(14px + env(safe-area-inset-bottom)); }
  .hfe-controles input[type=range] { flex: 1; height: 28px; accent-color: #fff; background: transparent; }
  .hfe-icone { width: 40px; height: 40px; border-radius: 50%; border: 0; background: rgba(255,255,255,.08); color: inherit; display: grid; place-items: center; cursor: pointer; flex-shrink: 0; transition: background .15s, transform .12s; }
  .hfe-icone:hover { background: rgba(255,255,255,.16); }
  .hfe-icone:active { transform: scale(.9); }
  .hfe-icone svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }
  .hfe-topo .hfe-icone { background: transparent; }
  .hfe-btn { border: 0; border-radius: 999px; padding: 9px 18px; font: inherit; font-weight: 800; font-size: 14px; cursor: pointer; }
  .hfe-btn.pri { background: var(--accent, #00adee); color: var(--accent-ink, #001a24); }
  .hfe-btn:disabled { opacity: .6; cursor: default; }
  .hfe-zoom-txt { min-width: 40px; text-align: right; font-size: 12px; font-weight: 750; color: rgba(255,255,255,.7); font-variant-numeric: tabular-nums; }
  @media (max-width: 640px) {
    .hfe-fundo { padding: 0; background: #000; }
    .hfe-caixa { width: 100%; max-height: none; height: 100dvh; border-radius: 0; border: 0; background: #000; }
  }
  @media (min-width: 641px) { .hfe-palco { min-height: min(62vh, 560px); } }
  @media (prefers-reduced-motion: reduce) { .hfe-fundo { animation: none; } }
  `;
  const style = document.createElement("style");
  style.id = ESTILO_ID;
  style.textContent = css;
  document.head.appendChild(style);
}

function carregarImagem(arquivo) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Não foi possível abrir esta imagem. Tente JPG ou PNG.")); };
    img.src = url;
  });
}

function girarFonte(fonte, graus) {
  if (!graus) return fonte;
  const c = document.createElement("canvas");
  const vira = graus % 180 !== 0;
  c.width = vira ? fonte.height : fonte.width;
  c.height = vira ? fonte.width : fonte.height;
  const ctx = c.getContext("2d");
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate((graus * Math.PI) / 180);
  ctx.drawImage(fonte, -fonte.width / 2, -fonte.height / 2);
  return c;
}

const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;

/**
 * Abre o editor e devolve a imagem recortada como data URL (JPEG), ou null se cancelar.
 * @param {File|Blob} arquivo
 * @param {object} op
 * @param {string} [op.titulo]
 * @param {string} [op.dica]
 * @param {number} [op.proporcao=1] largura/altura da moldura
 * @param {Array<{rotulo:string, proporcao:number}>} [op.formatos] formatos que a pessoa pode escolher
 * @param {boolean} [op.circulo=false]
 * @param {string} [op.rotulo] texto dentro da moldura
 * @param {string} [op.extra] "avatar-capa" desenha onde a foto de perfil fica sobre a capa
 * @param {Array<{forma:"circulo"|"texto", x:number, y:number, w:number, h:number, rotulo?:string}>} [op.marcas]
 *   o que fica por cima da foto no site (frações da moldura): ex. a foto de perfil e o nome sobre a capa
 * @param {number} [op.larguraSaida=1080]
 * @param {number} [op.qualidade=0.82]
 * @param {number} [op.limiteBytes] tamanho máximo do data URL (reduz qualidade até caber)
 * @param {number} [op.miniatura] proporção da miniatura (ex.: 4/5); mostra o recorte quando o formato é outro
 */
export async function editarImagem(arquivo, op = {}) {
  injetarEstilo();
  const { img, url } = await carregarImagem(arquivo);
  const formatos = op.formatos && op.formatos.length ? op.formatos : null;
  let proporcao = formatos ? formatos[0].proporcao : (op.proporcao || 1);
  const circulo = !!op.circulo;
  const larguraSaida = op.larguraSaida || 1080;
  let rotacao = 0;
  let fonte = img;

  const fundo = document.createElement("div");
  fundo.className = "hfe-fundo";
  fundo.setAttribute("role", "dialog");
  fundo.setAttribute("aria-modal", "true");
  fundo.innerHTML = `
    <div class="hfe-caixa">
      <div class="hfe-topo">
        <button type="button" class="hfe-icone" data-acao="cancelar" aria-label="Cancelar">${svg('<path d="M6 6l12 12M18 6L6 18"/>')}</button>
        <h2></h2>
        <button type="button" class="hfe-btn pri" data-acao="ok">Concluir</button>
      </div>
      <div class="hfe-palco">
        <canvas></canvas>
        <div class="hfe-moldura"><span class="hfe-faixa cima" hidden>Nome e hora</span><span class="hfe-faixa baixo" hidden>Responder</span><span class="hfe-guia v"></span><span class="hfe-guia h"></span><div class="hfe-mini" hidden><span>Miniatura na grade</span></div><span class="hfe-rotulo"></span></div>
      </div>
      <div class="hfe-formatos" hidden></div>
      <p class="hfe-dica"></p>
      <div class="hfe-controles">
        <button type="button" class="hfe-icone" data-acao="menos" aria-label="Diminuir zoom">${svg('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2M8 11h6"/>')}</button>
        <input type="range" min="1" max="4" step="0.01" value="1" aria-label="Zoom" />
        <span class="hfe-zoom-txt">1,0×</span>
        <button type="button" class="hfe-icone" data-acao="mais" aria-label="Aumentar zoom">${svg('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2M8 11h6M11 8v6"/>')}</button>
        <button type="button" class="hfe-icone" data-acao="girar" aria-label="Girar 90 graus">${svg('<path d="M20 11a8 8 0 10-2.3 5.7M20 4v7h-7"/>')}</button>
      </div>
    </div>`;
  fundo.querySelector("h2").textContent = op.titulo || "Ajustar foto";
  const dica = fundo.querySelector(".hfe-dica");
  dica.textContent = op.dica || "Arraste para ajustar e use dois dedos (ou o zoom) para aproximar.";
  if (op.botao) fundo.querySelector('[data-acao="ok"]').textContent = op.botao;
  const palco = fundo.querySelector(".hfe-palco");
  const canvas = palco.querySelector("canvas");
  const moldura = palco.querySelector(".hfe-moldura");
  const rotulo = moldura.querySelector(".hfe-rotulo");
  const zoom = fundo.querySelector('input[type="range"]');
  if (circulo) moldura.classList.add("circulo");
  if (op.rotulo) rotulo.textContent = op.rotulo; else rotulo.remove();
  // Marcas do que fica por cima da foto no site (medidas da tela real): ficam fraquinhas e acendem ao mexer.
  if (Array.isArray(op.marcas) && op.marcas.length) {
    moldura.classList.add("com-marcas");
    if (op.escurecerBaixo) { const g = document.createElement("div"); g.className = "hfe-escuro"; moldura.appendChild(g); }
    op.marcas.forEach((m) => {
      const e = document.createElement("div");
      e.className = "hfe-marca " + (m.forma === "circulo" ? "circulo" : "texto");
      Object.assign(e.style, { left: (m.x * 100) + "%", top: (m.y * 100) + "%", width: (m.w * 100) + "%", height: (m.h * 100) + "%" });
      if (m.rotulo) { const r = document.createElement("span"); r.textContent = m.rotulo; e.appendChild(r); }
      moldura.appendChild(e);
    });
  } else if (op.extra === "avatar-capa") {
    const extra = document.createElement("div");
    extra.className = "hfe-extra avatar-capa";
    moldura.appendChild(extra);
  }

  if (formatos) {
    const caixaFormatos = fundo.querySelector(".hfe-formatos");
    caixaFormatos.hidden = false;
    formatos.forEach((f, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = f.rotulo;
      if (i === 0) b.classList.add("on");
      b.addEventListener("click", () => {
        caixaFormatos.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
        proporcao = f.proporcao;
        medir();
      });
      caixaFormatos.appendChild(b);
    });
  }

  document.body.appendChild(fundo);
  const overflowAntes = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  // Geometria (em pixels CSS do palco)
  let W = 0, H = 0, fw = 0, fh = 0, escalaMin = 1, escala = 1, ox = 0, oy = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  function limitar() {
    const maxX = Math.max(0, (fonte.width * escala - fw) / 2);
    const maxY = Math.max(0, (fonte.height * escala - fh) / 2);
    ox = Math.min(maxX, Math.max(-maxX, ox));
    oy = Math.min(maxY, Math.max(-maxY, oy));
  }

  function desenhar() {
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const w = fonte.width * escala, h = fonte.height * escala;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(fonte, W / 2 + ox - w / 2, H / 2 + oy - h / 2, w, h);
  }

  const mini = moldura.querySelector(".hfe-mini");
  function pintarMiniatura() {
    const m = op.miniatura;
    const mostra = !!m && Math.abs(m - proporcao) > 0.01;
    mini.hidden = !mostra;
    if (!mostra) return;
    // recorte central que a grade do perfil usa
    let w = fw, h = fw / m;
    if (h > fh) { h = fh; w = fh * m; }
    mini.style.width = w + "px";
    mini.style.height = h + "px";
  }

  const zoomTxt = fundo.querySelector(".hfe-zoom-txt");
  const faixas = moldura.querySelectorAll(".hfe-faixa");
  const guiaV = moldura.querySelector(".hfe-guia.v"), guiaH = moldura.querySelector(".hfe-guia.h");
  const pintarZoom = () => { zoomTxt.textContent = (escala / escalaMin).toFixed(1).replace(".", ",") + "×"; };
  function medir() {
    // O palco ocupa o espaço que sobra na tela; a moldura é o maior recorte que cabe nele.
    W = palco.clientWidth || 320;
    H = palco.clientHeight || Math.max(300, Math.min(window.innerHeight * 0.62, 560));
    const folga = W < 420 ? 12 : 24;
    fw = Math.min(W - folga * 2, (H - folga * 2) * proporcao);
    fh = fw / proporcao;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    moldura.style.width = fw + "px";
    moldura.style.height = fh + "px";
    moldura.style.left = (W - fw) / 2 + "px";
    moldura.style.top = (H - fh) / 2 + "px";
    // Em pé (9:16): mostra onde ficam o nome em cima e o campo de resposta embaixo.
    faixas.forEach((f) => { f.hidden = !(proporcao < 0.7 && !circulo); });
    moldura.style.setProperty("--margem", proporcao < 0.7 ? "8% 6% 16%" : "6%");
    const zoomAtual = escalaMin ? escala / escalaMin : 1;
    escalaMin = Math.max(fw / fonte.width, fh / fonte.height);
    escala = escalaMin * Math.max(1, zoomAtual || 1);
    zoom.value = String(escala / escalaMin);
    limitar();
    desenhar();
    pintarMiniatura();
    pintarZoom();
  }

  function aplicarZoom(novo, cx = W / 2, cy = H / 2) {
    const z = Math.min(4, Math.max(1, novo));
    const nova = escalaMin * z;
    // mantém o ponto sob o cursor/dedos parado
    const px = cx - W / 2 - ox, py = cy - H / 2 - oy;
    ox -= px * (nova / escala - 1);
    oy -= py * (nova / escala - 1);
    escala = nova;
    zoom.value = String(z);
    limitar();
    desenhar();
    pintarZoom();
  }

  // Arrastar e pinça
  const ponteiros = new Map();
  let distInicial = 0, zoomInicial = 1;
  palco.addEventListener("pointerdown", (e) => {
    palco.setPointerCapture(e.pointerId);
    ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    palco.classList.add("movendo");
    if (ponteiros.size === 2) {
      const [a, b] = [...ponteiros.values()];
      distInicial = Math.hypot(a.x - b.x, a.y - b.y);
      zoomInicial = escala / escalaMin;
    }
  });
  palco.addEventListener("pointermove", (e) => {
    if (!ponteiros.has(e.pointerId)) return;
    const antes = ponteiros.get(e.pointerId);
    ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ponteiros.size === 1) {
      ox += e.clientX - antes.x;
      oy += e.clientY - antes.y;
      limitar();
      // Encaixa no meio (como as guias do Instagram) quando chega perto.
      const nx = Math.abs(ox) < 6, ny = Math.abs(oy) < 6;
      if (nx) ox = 0; if (ny) oy = 0;
      guiaV.classList.toggle("on", nx && Math.max(0, (fonte.width * escala - fw) / 2) > 0);
      guiaH.classList.toggle("on", ny && Math.max(0, (fonte.height * escala - fh) / 2) > 0);
      desenhar();
    } else if (ponteiros.size === 2 && distInicial) {
      const [a, b] = [...ponteiros.values()];
      const r = palco.getBoundingClientRect();
      aplicarZoom(zoomInicial * (Math.hypot(a.x - b.x, a.y - b.y) / distInicial), (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
    }
  });
  const soltar = (e) => {
    ponteiros.delete(e.pointerId);
    if (ponteiros.size < 2) distInicial = 0;
    if (!ponteiros.size) { palco.classList.remove("movendo"); guiaV.classList.remove("on"); guiaH.classList.remove("on"); }
  };
  // Toque duplo: volta ao enquadramento inicial.
  palco.addEventListener("dblclick", () => { ox = 0; oy = 0; aplicarZoom(1); });
  palco.addEventListener("pointerup", soltar);
  palco.addEventListener("pointercancel", soltar);
  palco.addEventListener("wheel", (e) => {
    e.preventDefault();
    const r = palco.getBoundingClientRect();
    aplicarZoom(escala / escalaMin * (e.deltaY < 0 ? 1.08 : 1 / 1.08), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  zoom.addEventListener("input", () => aplicarZoom(Number(zoom.value)));

  const aoRedimensionar = () => medir();
  window.addEventListener("resize", aoRedimensionar);

  function exportar() {
    const outW = larguraSaida;
    const outH = Math.round(larguraSaida / proporcao);
    const c = document.createElement("canvas");
    c.width = outW;
    c.height = outH;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, outW, outH);
    ctx.imageSmoothingQuality = "high";
    const cxFonte = fonte.width / 2 - ox / escala;
    const cyFonte = fonte.height / 2 - oy / escala;
    const sw = fw / escala, sh = fh / escala;
    ctx.drawImage(fonte, cxFonte - sw / 2, cyFonte - sh / 2, sw, sh, 0, 0, outW, outH);
    let q = op.qualidade || 0.82;
    let dataUrl = c.toDataURL("image/jpeg", q);
    if (op.limiteBytes) {
      while (dataUrl.length > op.limiteBytes && q > 0.4) {
        q -= 0.08;
        dataUrl = c.toDataURL("image/jpeg", q);
      }
      if (dataUrl.length > op.limiteBytes) {
        const menor = document.createElement("canvas");
        menor.width = Math.round(outW * 0.7);
        menor.height = Math.round(outH * 0.7);
        menor.getContext("2d").drawImage(c, 0, 0, menor.width, menor.height);
        dataUrl = menor.toDataURL("image/jpeg", 0.7);
      }
    }
    return dataUrl;
  }

  return new Promise((resolve) => {
    function fechar(resultado) {
      window.removeEventListener("resize", aoRedimensionar);
      document.removeEventListener("keydown", teclas);
      document.body.style.overflow = overflowAntes;
      URL.revokeObjectURL(url);
      fundo.remove();
      resolve(resultado);
    }
    function teclas(e) {
      if (e.key === "Escape") fechar(null);
      if (e.key === "Enter") fechar(exportar());
    }
    document.addEventListener("keydown", teclas);
    fundo.addEventListener("click", (e) => {
      const acao = e.target.closest("[data-acao]")?.dataset.acao;
      if (acao === "cancelar") fechar(null);
      if (acao === "ok") fechar(exportar());
      if (acao === "mais") aplicarZoom(escala / escalaMin + 0.25);
      if (acao === "menos") aplicarZoom(escala / escalaMin - 0.25);
      if (acao === "girar") {
        rotacao = (rotacao + 90) % 360;
        fonte = girarFonte(img, rotacao);
        ox = 0; oy = 0; escalaMin = 0;
        medir();
      }
    });
    requestAnimationFrame(medir);
    fundo.querySelector('[data-acao="ok"]').focus();
  });
}

/** Converte um data URL em Blob (para enviar ao Storage quando ele estiver ativo). */
export function dataUrlParaBlob(dataUrl) {
  const [cab, dados] = dataUrl.split(",");
  const tipo = (cab.match(/data:([^;]+)/) || [])[1] || "image/jpeg";
  const bin = atob(dados);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: tipo });
}
