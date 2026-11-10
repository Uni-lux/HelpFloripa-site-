// =====================================================
// Mapa ao vivo (entregas e corridas): mapa que arrasta e dá zoom, marcadores que andam suaves, rota desenhada,
// busca de endereço e rota pela rua. Usa o Leaflet (mapa/leaflet.js, BSD-2) e o serviço de mapa de mapa-config.js
// (OpenStreetMap hoje; Mapbox quando houver o token).
// =====================================================
import { MAPA, usaMapbox } from "./mapa-config.js?v=1";

let carregando = null;
export function carregarLeaflet() {
  if (window.L?.map) return Promise.resolve(window.L);
  if (carregando) return carregando;
  carregando = new Promise((ok, erro) => {
    if (!document.querySelector('link[data-leaflet]')) {
      const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "mapa/leaflet.css?v=1"; l.dataset.leaflet = "";
      document.head.appendChild(l);
    }
    const s = document.createElement("script"); s.src = "mapa/leaflet.js?v=1"; s.async = true;
    s.onload = () => (window.L?.map ? ok(window.L) : erro(new Error("mapa")));
    s.onerror = () => { carregando = null; erro(new Error("Não foi possível carregar o mapa.")); };
    document.head.appendChild(s);
  });
  return carregando;
}

// ---------- desenhos dos marcadores ----------
const SVG = {
  moto: '<path d="M5 17.5a2.5 2.5 0 105 0 2.5 2.5 0 00-5 0zM14 17.5a2.5 2.5 0 105 0 2.5 2.5 0 00-5 0z"/><path d="M10 17.5h4l2-5h-4l-1.5-3H8M16 12.5l-1.5-4H17"/>',
  carro: '<path d="M5 16V12l1.8-4.2A2 2 0 018.6 6.5h6.8a2 2 0 011.8 1.3L19 12v4"/><rect x="3.5" y="11.5" width="17" height="5" rx="1.6"/><circle cx="7.5" cy="16.8" r="1.5"/><circle cx="16.5" cy="16.8" r="1.5"/>',
  bike: '<circle cx="6" cy="16" r="3.2"/><circle cx="18" cy="16" r="3.2"/><path d="M6 16l4-7h5l3 7M10 9l-1.5-2.5H7M12.5 16l2.5-7"/>',
  utilitario: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="17" r="1.7"/><circle cx="17" cy="17" r="1.7"/>',
  pacote: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
  pessoa: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0114 0"/>'
};
export const svgIcone = (n, cls = "mv-svg") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${SVG[n] || SVG.pacote}</svg>`;

function icone(L, tipo, extra = {}) {
  let html = "", tam = [36, 36], ancora = [18, 18];
  if (tipo === "origem" || tipo === "destino") {
    html = `<span class="mv-pino ${tipo}"><b>${tipo === "origem" ? "A" : "B"}</b></span>`;
    tam = [34, 44]; ancora = [17, 42];
  } else if (tipo === "eu") {
    html = '<span class="mv-eu"><i></i></span>'; tam = [22, 22]; ancora = [11, 11];
  } else if (tipo === "veiculo") {
    html = `<span class="mv-veic ${extra.classe || ""}" style="--rumo:${extra.rumo || 0}deg">${svgIcone(extra.veiculo || "carro")}${extra.rotulo ? `<em>${extra.rotulo}</em>` : ""}</span>`;
    tam = [40, 40]; ancora = [20, 20];
  } else if (tipo === "pacote") {
    html = `<span class="mv-veic pacote">${svgIcone("pacote")}</span>`;
  }
  return L.divIcon({ html, className: "mv-icone", iconSize: tam, iconAnchor: ancora });
}

const escuro = () => document.documentElement.dataset.theme === "dark";
function camadaDeAzulejos(L) {
  if (usaMapbox()) {
    const estilo = escuro() ? MAPA.estiloEscuro : MAPA.estiloClaro;
    return L.tileLayer(`https://api.mapbox.com/styles/v1/${estilo}/tiles/512/{z}/{x}/{y}@2x?access_token=${encodeURIComponent(MAPA.mapboxToken)}`, {
      tileSize: 512, zoomOffset: -1, maxZoom: 20,
      attribution: '© <a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noopener">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
    });
  }
  return L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, className: "mv-osm",
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
  });
}

// Cria o mapa num elemento. Devolve um objeto com as ações que as telas usam.
export async function criarMapa(alvo, { centro = { lat: -27.5954, lng: -48.548 }, zoom = 14 } = {}) {
  const L = await carregarLeaflet();
  alvo.classList.add("mv-mapa");
  const map = L.map(alvo, { zoomControl: false, attributionControl: true, center: [centro.lat, centro.lng], zoom, tap: true });
  map.attributionControl.setPrefix(false);
  let azulejos = camadaDeAzulejos(L).addTo(map);
  // Tema trocado: no Mapbox troca o estilo; no OpenStreetMap o CSS escurece os azulejos.
  const obs = new MutationObserver(() => { if (!usaMapbox()) return; map.removeLayer(azulejos); azulejos = camadaDeAzulejos(L).addTo(map); });
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const marcas = new Map();
  let rota = null, rotaFundo = null;

  const api = {
    L, map,
    // Marcador com nome (cria ou move).
    marcar(nome, tipo, pos, extra = {}) {
      if (!pos) { api.tirar(nome); return null; }
      let m = marcas.get(nome);
      if (m && m._tipo === tipo) { m.setLatLng([pos.lat, pos.lng]); if (tipo === "veiculo") api.girar(nome, extra.rumo); return m; }
      api.tirar(nome);
      m = L.marker([pos.lat, pos.lng], { icon: icone(L, tipo, extra), keyboard: false, zIndexOffset: tipo === "veiculo" ? 600 : tipo === "eu" ? 400 : 500 }).addTo(map);
      m._tipo = tipo; m._pos = { ...pos };
      marcas.set(nome, m);
      return m;
    },
    tirar(nome) { const m = marcas.get(nome); if (m) { m._anim && cancelAnimationFrame(m._anim); map.removeLayer(m); marcas.delete(nome); } },
    tirarTodosMenos(nomes) { [...marcas.keys()].forEach((k) => { if (!nomes.includes(k)) api.tirar(k); }); },
    nomes: () => [...marcas.keys()],
    girar(nome, rumo) {
      const el = marcas.get(nome)?.getElement()?.querySelector(".mv-veic");
      if (el && Number.isFinite(rumo)) el.style.setProperty("--rumo", `${Math.round(rumo)}deg`);
    },
    // Anda até a posição nova em `ms` (o GPS chega aos saltos; aqui o carrinho desliza).
    mover(nome, pos, { ms = 1800, rumo } = {}) {
      const m = marcas.get(nome);
      if (!m || !pos) return;
      const de = m.getLatLng(), para = L.latLng(pos.lat, pos.lng);
      if (Number.isFinite(rumo)) api.girar(nome, rumo);
      else if (de.distanceTo(para) > 3) api.girar(nome, rumoEntre({ lat: de.lat, lng: de.lng }, pos));
      if (m._anim) cancelAnimationFrame(m._anim);
      const t0 = performance.now(), reduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduzido || de.distanceTo(para) > 3000) { m.setLatLng(para); return; }
      const passo = (t) => {
        const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
        m.setLatLng([de.lat + (para.lat - de.lat) * e, de.lng + (para.lng - de.lng) * e]);
        if (k < 1) m._anim = requestAnimationFrame(passo); else m._anim = null;
      };
      m._anim = requestAnimationFrame(passo);
    },
    posicao(nome) { const p = marcas.get(nome)?.getLatLng(); return p ? { lat: p.lat, lng: p.lng } : null; },
    // Linha da rota (com uma borda por baixo, como nos apps de mapa).
    desenharRota(pontos, { cor } = {}) {
      api.tirarRota();
      if (!Array.isArray(pontos) || pontos.length < 2) return;
      rotaFundo = L.polyline(pontos, { color: escuro() ? "#001a24" : "#ffffff", weight: 9, opacity: .9, lineCap: "round", interactive: false }).addTo(map);
      rota = L.polyline(pontos, { color: cor || "#00adee", weight: 5, opacity: 1, lineCap: "round", interactive: false, className: "mv-rota" }).addTo(map);
    },
    tirarRota() { if (rota) map.removeLayer(rota); if (rotaFundo) map.removeLayer(rotaFundo); rota = rotaFundo = null; },
    // Enquadra os pontos deixando espaço para o painel de baixo.
    enquadrar(pontos, { baixo = 0, cima = 70, zoomMax = 16 } = {}) {
      const ok = pontos.filter(Boolean).map((p) => [p.lat, p.lng]);
      if (!ok.length) return;
      if (ok.length === 1) { map.setView(ok[0], Math.min(zoomMax, 16), { animate: true }); return; }
      map.fitBounds(L.latLngBounds(ok), { paddingTopLeft: [40, cima], paddingBottomRight: [40, baixo + 30], maxZoom: zoomMax, animate: true });
    },
    centro: () => { const c = map.getCenter(); return { lat: c.lat, lng: c.lng }; },
    irPara(pos, zoom) { if (pos) map.setView([pos.lat, pos.lng], zoom || map.getZoom(), { animate: true }); },
    // Raio de busca (círculo que pulsa enquanto procura).
    radar(pos, km) {
      api.tirarRadar();
      if (!pos) return;
      api._radar = L.circle([pos.lat, pos.lng], { radius: km * 1000, color: "#00adee", weight: 1.5, fillColor: "#00adee", fillOpacity: .07, className: "mv-radar", interactive: false }).addTo(map);
    },
    tirarRadar() { if (api._radar) map.removeLayer(api._radar); api._radar = null; },
    ajustar() { map.invalidateSize(); },
    destruir() { obs.disconnect(); map.remove(); }
  };
  // O mapa muda de tamanho quando o painel de baixo sobe/desce.
  if ("ResizeObserver" in window) new ResizeObserver(() => map.invalidateSize()).observe(alvo);
  return api;
}

export function rumoEntre(a, b) {
  const r = Math.PI / 180;
  const y = Math.sin((b.lng - a.lng) * r) * Math.cos(b.lat * r);
  const x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lng - a.lng) * r);
  return ((Math.atan2(y, x) / r) + 360) % 360;
}

// ---------- serviços de mapa (com limite de tempo e guardados por um tempo) ----------
async function buscarJson(url, ms = 7000) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms);
  try { const r = await fetch(url, { signal: ctrl.signal }); if (!r.ok) throw new Error("http " + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}
const cacheRotas = new Map();
// Rota pela rua: { pontos: [[lat,lng]...], km, min, real } — sem o serviço, linha reta × 1,3 (real: false).
export async function buscarRota(a, b, veiculo = "carro") {
  const chave = `${a.lat.toFixed(4)},${a.lng.toFixed(4)}>${b.lat.toFixed(4)},${b.lng.toFixed(4)}:${veiculo}`;
  if (cacheRotas.has(chave)) return cacheRotas.get(chave);
  let res = null;
  try {
    if (usaMapbox()) {
      const perfil = veiculo === "bike" ? "cycling" : "driving-traffic";
      const j = await buscarJson(`https://api.mapbox.com/directions/v5/mapbox/${perfil}/${a.lng},${a.lat};${b.lng},${b.lat}?geometries=geojson&overview=full&language=pt&access_token=${encodeURIComponent(MAPA.mapboxToken)}`);
      const r = j?.routes?.[0];
      if (r) res = { pontos: r.geometry.coordinates.map(([lo, la]) => [la, lo]), km: r.distance / 1000, min: r.duration / 60, real: true };
    } else {
      const j = await buscarJson(`https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`);
      const r = j?.routes?.[0];
      if (r) res = { pontos: r.geometry.coordinates.map(([lo, la]) => [la, lo]), km: r.distance / 1000, min: r.duration / 60, real: true };
    }
  } catch { res = null; }
  if (!res) {
    const { distanciaKm } = await import("./corridas-base.js?v=1");
    const km = distanciaKm(a, b) * 1.3;
    res = { pontos: [[a.lat, a.lng], [b.lat, b.lng]], km, min: km / 24 * 60, real: false };
  } else {
    // Moto e bike andam diferente do carro no trânsito.
    if (veiculo === "moto") res.min *= .85;
    if (veiculo === "bike" && !usaMapbox()) res.min = res.km / 14 * 60;
    if (cacheRotas.size > 60) cacheRotas.clear();
    cacheRotas.set(chave, res);
  }
  return res;
}

// Busca de endereço: [{ nome, sub, lat, lng }]. `perto` dá preferência ao que está perto da pessoa.
export async function buscarEndereco(texto, perto) {
  const q = String(texto || "").trim();
  if (q.length < 3) return [];
  try {
    if (usaMapbox()) {
      const prox = perto ? `&proximity=${perto.lng},${perto.lat}` : "";
      const j = await buscarJson(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?country=br&language=pt&limit=6&types=address,poi,place,neighborhood,locality${prox}&access_token=${encodeURIComponent(MAPA.mapboxToken)}`);
      return (j?.features || []).map((f) => ({ nome: f.text + (f.address ? `, ${f.address}` : ""), sub: String(f.place_name || "").replace(/^[^,]+,\s*/, "").replace(/, Brasil$/, ""), lat: f.center[1], lng: f.center[0] }));
    }
    const vb = perto ? `&viewbox=${perto.lng - .4},${perto.lat + .3},${perto.lng + .4},${perto.lat - .3}` : "";
    const j = await buscarJson(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=br&accept-language=pt-BR${vb}&q=${encodeURIComponent(q)}`);
    return (j || []).map((r) => {
      const a = r.address || {};
      const rua = [a.road || a.pedestrian || r.name, a.house_number].filter(Boolean).join(", ");
      return { nome: rua || r.name || String(r.display_name || "").split(",")[0], sub: [a.suburb || a.neighbourhood, a.city || a.town || a.village, a.state].filter(Boolean).join(" · "), lat: Number(r.lat), lng: Number(r.lon) };
    }).filter((r) => Number.isFinite(r.lat));
  } catch { return []; }
}
// Endereço de um ponto (para "minha localização" e "escolher no mapa").
export async function enderecoDoPonto(p) {
  try {
    if (usaMapbox()) {
      const j = await buscarJson(`https://api.mapbox.com/geocoding/v5/mapbox.places/${p.lng},${p.lat}.json?language=pt&types=address,poi&limit=1&access_token=${encodeURIComponent(MAPA.mapboxToken)}`, 6000);
      const f = j?.features?.[0];
      return f ? { nome: f.text + (f.address ? `, ${f.address}` : ""), sub: String(f.place_name || "").replace(/^[^,]+,\s*/, "").replace(/, Brasil$/, "") } : null;
    }
    const j = await buscarJson(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${p.lat}&lon=${p.lng}&zoom=18&addressdetails=1&accept-language=pt-BR`, 6000);
    const a = j?.address || {};
    const rua = [a.road || a.pedestrian || a.footway, a.house_number].filter(Boolean).join(", ");
    return { nome: rua || String(j?.display_name || "").split(",")[0] || "Ponto no mapa", sub: [a.suburb || a.neighbourhood, a.city || a.town || a.village].filter(Boolean).join(" · ") };
  } catch { return null; }
}
// Abrir a navegação no app de mapas do celular.
export const linkNavegar = (p, app = "google") => app === "waze"
  ? `https://waze.com/ul?ll=${p.lat},${p.lng}&navigate=yes`
  : `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=driving`;
