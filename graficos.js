// =====================================================
// Gráficos do painel (SVG, sem bibliotecas)
// - linha/área: crescimento ao longo do tempo (cruz + dica ao passar)
// - barras: comparar quantidades (horizontal para nomes longos), com o
//   valor escrito na barra e dica ao passar
// - cada cartão tem "Tabela" (os números por trás) e "Excel" (baixar)
// Cores: variáveis --viz-* do admin.css (paleta validada para daltonismo,
// claro e escuro). Uma escala só por gráfico; nada de dois eixos.
// =====================================================
import { baixarPlanilha } from "./planilha.js?v=1";
const NS = "http://www.w3.org/2000/svg";
const s = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
export const num = (v) => Number(v || 0).toLocaleString("pt-BR");
const pct = (v) => `${(v * 100).toFixed(v < 0.1 ? 1 : 0).replace(".", ",")}%`;

// Escala "bonita" para o eixo: 0 até um teto redondo, 4 divisões.
function escala(max) {
  if (max <= 0) return { teto: 4, passo: 1 };
  const bruto = max / 4, mag = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((p) => p >= bruto) || 10 * mag;
  return { teto: passo * 4, passo };
}

let dica = null;
function mostrarDica(html, x, y) {
  if (!dica) { dica = h("div", "viz-dica"); dica.setAttribute("role", "status"); document.body.appendChild(dica); }
  dica.replaceChildren(...html);
  dica.hidden = false;
  const r = dica.getBoundingClientRect();
  dica.style.left = Math.min(window.innerWidth - r.width - 8, Math.max(8, x + 12)) + "px";
  dica.style.top = Math.max(8, y - r.height - 12) + "px";
}
const esconderDica = () => { if (dica) dica.hidden = true; };
const linhaDica = (rotulo, valor, cor) => { const l = h("div", "l"); if (cor) { const b = h("i"); b.style.background = cor; l.appendChild(b); } l.append(h("span", null, rotulo), h("b", null, valor)); return l; };

// pontos: [{ rotulo, valor }] em ordem de tempo
export function linha(el, { pontos, formato = num, cor = "var(--viz-1)", altura = 220, area = true }) {
  el.replaceChildren();
  const W = Math.max(300, el.clientWidth || 600), H = altura, m = { t: 12, r: 12, b: 26, l: 44 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const max = Math.max(...pontos.map((p) => p.valor), 0);
  const { teto, passo } = escala(max);
  const X = (i) => m.l + (pontos.length <= 1 ? iw / 2 : (i / (pontos.length - 1)) * iw);
  const Y = (v) => m.t + ih - (v / teto) * ih;
  const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", height: H, role: "img" });
  for (let v = 0; v <= teto + 1e-9; v += passo) {
    svg.appendChild(s("line", { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), class: v === 0 ? "viz-base" : "viz-grade" }));
    const t = s("text", { x: m.l - 6, y: Y(v) + 4, class: "viz-eixo", "text-anchor": "end" }); t.textContent = formato(v); svg.appendChild(t);
  }
  // Datas no eixo: no máximo ~1 a cada 70 px; a última sempre aparece, sem encostar na anterior.
  const maxRot = Math.max(2, Math.floor(iw / 70));
  const passoX = Math.max(1, Math.ceil(pontos.length / maxRot));
  const u = pontos.length - 1;
  const marcas = pontos.map((_, i) => i).filter((i) => i % passoX === 0 && (u - i) * (iw / Math.max(1, u)) >= 56);
  if (u >= 0) marcas.push(u);
  marcas.forEach((i) => { const t = s("text", { x: X(i), y: H - 8, class: "viz-eixo", "text-anchor": i === 0 ? "start" : i === u ? "end" : "middle" }); t.textContent = pontos[i].rotulo; svg.appendChild(t); });
  if (pontos.length) {
    const d = pontos.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p.valor).toFixed(1)}`).join("");
    if (area) svg.appendChild(s("path", { d: `${d}L${X(pontos.length - 1)},${Y(0)}L${X(0)},${Y(0)}Z`, fill: cor, opacity: ".12" }));
    svg.appendChild(s("path", { d, fill: "none", stroke: cor, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }));
    const u = pontos.length - 1;
    svg.appendChild(s("circle", { cx: X(u), cy: Y(pontos[u].valor), r: 4, fill: cor, stroke: "var(--viz-superficie)", "stroke-width": 2 }));
  }
  const cruz = s("line", { y1: m.t, y2: m.t + ih, class: "viz-cruz", visibility: "hidden" });
  const ponto = s("circle", { r: 5, fill: cor, stroke: "var(--viz-superficie)", "stroke-width": 2, visibility: "hidden" });
  svg.append(cruz, ponto);
  const alvo = s("rect", { x: m.l, y: m.t, width: iw, height: ih, fill: "transparent" });
  const mover = (cx, cy) => {
    const r = svg.getBoundingClientRect();
    const x = ((cx - r.left) / r.width) * W;
    const i = Math.max(0, Math.min(pontos.length - 1, Math.round(((x - m.l) / iw) * (pontos.length - 1))));
    const p = pontos[i]; if (!p) return;
    cruz.setAttribute("x1", X(i)); cruz.setAttribute("x2", X(i)); cruz.setAttribute("visibility", "visible");
    ponto.setAttribute("cx", X(i)); ponto.setAttribute("cy", Y(p.valor)); ponto.setAttribute("visibility", "visible");
    mostrarDica([h("strong", null, p.rotulo), linhaDica(p.serie || "Total", formato(p.valor), cor)], cx, cy);
  };
  alvo.addEventListener("pointermove", (e) => mover(e.clientX, e.clientY));
  alvo.addEventListener("pointerleave", () => { cruz.setAttribute("visibility", "hidden"); ponto.setAttribute("visibility", "hidden"); esconderDica(); });
  svg.appendChild(alvo);
  el.appendChild(svg);
}

// itens: [{ rotulo, valor, cor? }] · horizontal para nomes (cidades); vertical para faixas (idades)
export function barras(el, { itens, formato = num, horizontal = false, cor = "var(--viz-1)", total = null }) {
  el.replaceChildren();
  const soma = total ?? itens.reduce((a, b) => a + b.valor, 0);
  const max = Math.max(...itens.map((i) => i.valor), 0) || 1;
  if (horizontal) {
    const lista = h("div", "viz-hbar");
    itens.forEach((it) => {
      const l = h("div", "linha");
      const nome = h("span", "nome", it.rotulo); nome.title = it.rotulo;
      const trilho = h("span", "trilho");
      const b = h("i"); b.style.width = `${Math.max(it.valor ? 2 : 0, (it.valor / max) * 100)}%`; b.style.background = it.cor || cor;
      trilho.appendChild(b);
      const v = h("span", "valor", formato(it.valor));
      l.append(nome, trilho, v);
      l.addEventListener("pointermove", (e) => mostrarDica([h("strong", null, it.rotulo), linhaDica("Quantidade", formato(it.valor), it.cor || cor), soma ? linhaDica("Do total", pct(it.valor / soma)) : ""].filter(Boolean), e.clientX, e.clientY));
      l.addEventListener("pointerleave", esconderDica);
      lista.appendChild(l);
    });
    el.appendChild(lista);
    return;
  }
  const W = Math.max(300, el.clientWidth || 600), H = 220, m = { t: 18, r: 8, b: 30, l: 8 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const bw = iw / Math.max(1, itens.length), gap = Math.min(10, bw * 0.25);
  const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", height: H, role: "img" });
  svg.appendChild(s("line", { x1: m.l, x2: W - m.r, y1: m.t + ih, y2: m.t + ih, class: "viz-base" }));
  itens.forEach((it, i) => {
    const hgt = (it.valor / max) * ih, x = m.l + i * bw + gap / 2, w = Math.max(2, bw - gap), y = m.t + ih - hgt;
    const r = Math.min(4, w / 2, hgt);
    const d = hgt <= 0 ? "" : `M${x},${m.t + ih}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${m.t + ih}Z`;
    if (d) svg.appendChild(s("path", { d, fill: it.cor || cor }));
    const v = s("text", { x: x + w / 2, y: y - 5, class: "viz-valor", "text-anchor": "middle" }); v.textContent = formato(it.valor); svg.appendChild(v);
    const t = s("text", { x: x + w / 2, y: H - 10, class: "viz-eixo", "text-anchor": "middle" }); t.textContent = it.rotulo; svg.appendChild(t);
    const alvo = s("rect", { x: m.l + i * bw, y: m.t, width: bw, height: ih, fill: "transparent" });
    alvo.addEventListener("pointermove", (e) => mostrarDica([h("strong", null, it.rotulo), linhaDica("Quantidade", formato(it.valor), it.cor || cor), soma ? linhaDica("Do total", pct(it.valor / soma)) : ""].filter(Boolean), e.clientX, e.clientY));
    alvo.addEventListener("pointerleave", esconderDica);
    svg.appendChild(alvo);
  });
  el.appendChild(svg);
}

// Cartão com título, gráfico, "Tabela" e "Excel".
// desenhar(el) desenha o gráfico · linhas: [[col1, col2...], ...] com cabecalho
export function cartao({ titulo, sub = "", cabecalho = [], linhas = [], desenhar, largo = false, nomeArquivo = "dados" }) {
  const c = h("section", "viz-cartao" + (largo ? " largo" : ""));
  const topo = h("div", "viz-topo");
  const tt = h("div"); tt.append(h("h3", null, titulo)); if (sub) tt.append(h("p", null, sub));
  const bts = h("div", "viz-bts");
  const bT = h("button", "viz-bt", "Tabela"); bT.type = "button"; bT.setAttribute("aria-pressed", "false");
  const bC = h("button", "viz-bt", "Excel"); bC.type = "button";
  bts.append(bT, bC);
  topo.append(tt, bts);
  const area = h("div", "viz-area");
  const tab = h("div", "viz-tabela"); tab.hidden = true;
  const table = h("table"); const th = h("tr"); cabecalho.forEach((x) => th.appendChild(h("th", null, x)));
  const thead = h("thead"); thead.appendChild(th); const tb = h("tbody");
  linhas.forEach((ln) => { const tr = h("tr"); ln.forEach((x) => tr.appendChild(h("td", null, String(x)))); tb.appendChild(tr); });
  table.append(thead, tb); tab.appendChild(table);
  bT.addEventListener("click", () => { const on = tab.hidden; tab.hidden = !on; area.hidden = on; bT.setAttribute("aria-pressed", String(on)); });
  bC.addEventListener("click", () => baixarCSV(nomeArquivo, cabecalho, linhas));
  c.append(topo, area, tab);
  // Tudo zerado: mostra o aviso em vez de barras vazias.
  if (linhas.length && linhas.every((l) => l.slice(1).every((v) => !Number(v)))) linhas = [];
  if (!linhas.length) { area.appendChild(h("p", "viz-vazio", "Ainda não há dados para este gráfico.")); bT.disabled = bC.disabled = true; }
  else requestAnimationFrame(() => desenhar(area));
  c.redesenhar = () => { if (linhas.length) desenhar(area); };
  return c;
}

// Número em destaque (sem gráfico): valor + variação contra o período anterior.
export function destaque({ rotulo, valor, formato = num, antes = null, dica: textoDica = "", alerta = false }) {
  const c = h("div", "viz-kpi" + (alerta ? " alerta" : ""));
  c.append(h("span", "rot", rotulo), h("strong", null, formato(valor)));
  if (antes != null) {
    const dif = valor - antes;
    const t = h("small", "var " + (dif > 0 ? "sobe" : dif < 0 ? "desce" : ""), `${dif > 0 ? "▲" : dif < 0 ? "▼" : "■"} ${dif > 0 ? "+" : ""}${formato(dif)} vs. período anterior`);
    c.appendChild(t);
  } else if (textoDica) c.appendChild(h("small", null, textoDica));
  return c;
}

// Planilhas saem em Excel (.xlsx): abrem como tabela no celular e no computador.
export function baixarCSV(nome, cabecalho, linhas) { baixarPlanilha(nome, cabecalho, linhas); }
