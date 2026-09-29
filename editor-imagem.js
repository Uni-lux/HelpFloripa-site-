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
  .hfe-fundo { position: fixed; inset: 0; z-index: 9000; background: rgba(4, 8, 11, .82); display: grid; place-items: center; padding: 16px; -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
  .hfe-caixa { width: min(620px, 100%); max-height: calc(100dvh - 32px); display: flex; flex-direction: column; background: var(--panel, #10181d); color: var(--text, #e9eef1); border: 1px solid var(--line, #22313a); border-radius: 20px; overflow-x: hidden; overflow-y: auto; box-shadow: 0 24px 80px rgba(0,0,0,.5); font-family: var(--font, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif); }
  .hfe-topo { display: flex; align-items: center; gap: 8px; padding: 12px 12px 12px 18px; border-bottom: 1px solid var(--line, #22313a); }
  .hfe-topo h2 { flex: 1; margin: 0; font-size: 17px; font-weight: 700; }
  .hfe-dica { margin: 0; padding: 10px 18px 0; font-size: 12.5px; color: var(--muted, #8b9ba6); line-height: 1.45; }
  .hfe-palco { position: relative; flex-shrink: 0; margin: 12px 18px 0; border-radius: 14px; overflow: hidden; background: repeating-conic-gradient(#1a2329 0 25%, #121a1f 0 50%) 0 0 / 22px 22px; touch-action: none; cursor: grab; user-select: none; }
  .hfe-palco:active { cursor: grabbing; }
  .hfe-palco canvas { display: block; width: 100%; height: 100%; }
  .hfe-moldura { position: absolute; pointer-events: none; box-shadow: 0 0 0 9999px rgba(4, 8, 11, .62); border: 2px solid rgba(255,255,255,.95); }
  .hfe-moldura.circulo { border-radius: 50%; }
  .hfe-moldura::before, .hfe-moldura::after { content: ""; position: absolute; inset: 0; pointer-events: none; }
  .hfe-moldura::before { background:
      linear-gradient(to right, transparent calc(33.33% - .5px), rgba(255,255,255,.35) calc(33.33% - .5px), rgba(255,255,255,.35) calc(33.33% + .5px), transparent calc(33.33% + .5px), transparent calc(66.66% - .5px), rgba(255,255,255,.35) calc(66.66% - .5px), rgba(255,255,255,.35) calc(66.66% + .5px), transparent calc(66.66% + .5px)),
      linear-gradient(to bottom, transparent calc(33.33% - .5px), rgba(255,255,255,.35) calc(33.33% - .5px), rgba(255,255,255,.35) calc(33.33% + .5px), transparent calc(33.33% + .5px), transparent calc(66.66% - .5px), rgba(255,255,255,.35) calc(66.66% - .5px), rgba(255,255,255,.35) calc(66.66% + .5px), transparent calc(66.66% + .5px));
    opacity: 0; transition: opacity .2s; }
  .hfe-palco.movendo .hfe-moldura::before { opacity: 1; }
  .hfe-moldura::after { inset: 7%; border: 1.5px dashed rgba(255,255,255,.8); border-radius: inherit; box-shadow: 0 0 0 1px rgba(0,0,0,.35); }
  .hfe-margem { position: absolute; left: 7%; top: 7%; transform: translate(6px, 6px); padding: 2px 7px; border-radius: 6px; background: rgba(0,0,0,.6); color: #fff; font-size: 10.5px; font-weight: 700; pointer-events: none; white-space: nowrap; }
  .hfe-moldura.circulo .hfe-margem { left: 50%; top: 7%; transform: translate(-50%, 6px); }
  .hfe-canto { position: absolute; width: 18px; height: 18px; border-color: #fff; border-style: solid; pointer-events: none; }
  .hfe-canto.a { left: -2px; top: -2px; border-width: 4px 0 0 4px; }
  .hfe-canto.b { right: -2px; top: -2px; border-width: 4px 4px 0 0; }
  .hfe-canto.c { left: -2px; bottom: -2px; border-width: 0 0 4px 4px; }
  .hfe-canto.d { right: -2px; bottom: -2px; border-width: 0 4px 4px 0; }
  .hfe-moldura.circulo .hfe-canto { display: none; }
  .hfe-mini { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); border: 2px dotted #7de3ff; pointer-events: none; }
  .hfe-mini span { position: absolute; right: 4px; bottom: 4px; padding: 2px 6px; border-radius: 6px; background: rgba(0, 60, 80, .8); color: #fff; font-size: 10.5px; font-weight: 700; white-space: nowrap; }
  @media (max-width: 640px) {
    .hfe-fundo { padding: 0; }
    .hfe-caixa { width: 100%; max-height: 100dvh; height: 100dvh; border-radius: 0; border: 0; }
    .hfe-palco { margin: 10px 10px 0; }
    .hfe-dica { font-size: 12px; padding: 8px 14px 0; }
    .hfe-formatos, .hfe-legenda, .hfe-controles { padding-left: 14px; padding-right: 14px; }
    .hfe-rodape { padding: 12px 14px calc(14px + env(safe-area-inset-bottom)); }
  }
  .hfe-legenda { display: flex; flex-wrap: wrap; gap: 6px 14px; padding: 8px 18px 0; font-size: 11.5px; color: var(--muted, #8b9ba6); }
  .hfe-legenda i { display: inline-block; width: 18px; height: 0; vertical-align: middle; margin-right: 6px; border-top: 2px solid #fff; }
  .hfe-legenda i.tr { border-top-style: dashed; }
  .hfe-legenda i.mi { border-top: 2px dotted #7de3ff; }
  .hfe-rotulo { position: absolute; left: 50%; transform: translateX(-50%); bottom: 8px; padding: 4px 10px; border-radius: 999px; background: rgba(0,0,0,.6); color: #fff; font-size: 11.5px; font-weight: 600; white-space: nowrap; pointer-events: none; }
  .hfe-extra { position: absolute; pointer-events: none; }
  .hfe-extra.avatar-capa { width: 22%; aspect-ratio: 1; left: 5%; bottom: -11%; border-radius: 50%; border: 2px dashed rgba(255,255,255,.7); background: rgba(0,0,0,.35); }
  .hfe-controles { display: flex; align-items: center; gap: 12px; padding: 14px 18px 4px; }
  .hfe-controles input[type=range] { flex: 1; accent-color: var(--accent, #00adee); height: 28px; }
  .hfe-icone { width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--line, #22313a); background: transparent; color: inherit; display: grid; place-items: center; cursor: pointer; flex-shrink: 0; }
  .hfe-icone:hover { background: var(--hover, #1a262e); }
  .hfe-icone svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }
  .hfe-formatos { display: flex; gap: 6px; padding: 10px 18px 0; flex-wrap: wrap; }
  .hfe-formatos button { border: 1px solid var(--line, #22313a); background: transparent; color: var(--muted, #8b9ba6); border-radius: 999px; padding: 6px 12px; font-size: 12.5px; font-weight: 600; cursor: pointer; }
  .hfe-formatos button.on { border-color: var(--accent, #00adee); color: var(--accent, #00adee); background: color-mix(in srgb, var(--accent, #00adee) 12%, transparent); }
  .hfe-rodape { display: flex; gap: 10px; justify-content: flex-end; padding: 14px 18px 18px; }
  .hfe-btn { border: 0; border-radius: 12px; padding: 11px 18px; font-weight: 700; font-size: 14px; cursor: pointer; }
  .hfe-btn.sec { background: transparent; color: inherit; border: 1px solid var(--line, #22313a); }
  .hfe-btn.pri { background: var(--accent, #00adee); color: var(--accent-ink, #001a24); }
  .hfe-btn:disabled { opacity: .6; cursor: default; }
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
        <h2></h2>
        <button type="button" class="hfe-icone" data-acao="cancelar" aria-label="Fechar">${svg('<path d="M6 6l12 12M18 6L6 18"/>')}</button>
      </div>
      <p class="hfe-dica"></p>
      <div class="hfe-formatos" hidden></div>
      <div class="hfe-palco">
        <canvas></canvas>
        <div class="hfe-moldura"><span class="hfe-canto a"></span><span class="hfe-canto b"></span><span class="hfe-canto c"></span><span class="hfe-canto d"></span><span class="hfe-margem">Margem segura</span><div class="hfe-mini" hidden><span>Miniatura na grade</span></div><span class="hfe-rotulo"></span></div>
      </div>
      <div class="hfe-legenda"><span><i></i>Borda: o que aparece</span><span><i class="tr"></i>Margem segura: deixe o importante aqui dentro</span><span class="lg-mini" hidden><i class="mi"></i>Recorte da miniatura no perfil</span></div>
      <div class="hfe-controles">
        <button type="button" class="hfe-icone" data-acao="menos" aria-label="Diminuir zoom">${svg('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2M8 11h6"/>')}</button>
        <input type="range" min="1" max="4" step="0.01" value="1" aria-label="Zoom" />
        <button type="button" class="hfe-icone" data-acao="mais" aria-label="Aumentar zoom">${svg('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2M8 11h6M11 8v6"/>')}</button>
        <button type="button" class="hfe-icone" data-acao="girar" aria-label="Girar 90 graus">${svg('<path d="M20 11a8 8 0 10-2.3 5.7M20 4v7h-7"/>')}</button>
      </div>
      <div class="hfe-rodape">
        <button type="button" class="hfe-btn sec" data-acao="cancelar">Cancelar</button>
        <button type="button" class="hfe-btn pri" data-acao="ok">Usar foto</button>
      </div>
    </div>`;
  fundo.querySelector("h2").textContent = op.titulo || "Ajustar foto";
  const dica = fundo.querySelector(".hfe-dica");
  dica.textContent = op.dica || "Arraste para posicionar e use o zoom. A área dentro da moldura é o que vai aparecer; a linha tracejada marca a margem de segurança.";
  const palco = fundo.querySelector(".hfe-palco");
  const canvas = palco.querySelector("canvas");
  const moldura = palco.querySelector(".hfe-moldura");
  const rotulo = moldura.querySelector(".hfe-rotulo");
  const zoom = fundo.querySelector('input[type="range"]');
  if (circulo) moldura.classList.add("circulo");
  if (op.rotulo) rotulo.textContent = op.rotulo; else rotulo.remove();
  if (op.extra === "avatar-capa") {
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
    fundo.querySelector(".lg-mini").hidden = !mostra;
    if (!mostra) return;
    // recorte central que a grade do perfil usa
    let w = fw, h = fw / m;
    if (h > fh) { h = fh; w = fh * m; }
    mini.style.width = w + "px";
    mini.style.height = h + "px";
  }

  function medir() {
    const caixa = palco.parentElement;
    const larguraDisp = palco.clientWidth || caixa.clientWidth - 20;
    // Área grande para enxergar a margem; se não couber tudo, o editor rola.
    const alturaMax = Math.max(300, Math.min(window.innerHeight * 0.64, 640));
    W = larguraDisp;
    H = Math.min(alturaMax, Math.max(260, W / Math.max(proporcao, 0.6) + 24));
    fw = Math.min(W - 16, (H - 16) * proporcao);
    fh = fw / proporcao;
    palco.style.height = H + "px";
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    moldura.style.width = fw + "px";
    moldura.style.height = fh + "px";
    moldura.style.left = (W - fw) / 2 + "px";
    moldura.style.top = (H - fh) / 2 + "px";
    const zoomAtual = escalaMin ? escala / escalaMin : 1;
    escalaMin = Math.max(fw / fonte.width, fh / fonte.height);
    escala = escalaMin * Math.max(1, zoomAtual || 1);
    zoom.value = String(escala / escalaMin);
    limitar();
    desenhar();
    pintarMiniatura();
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
    if (!ponteiros.size) palco.classList.remove("movendo");
  };
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
