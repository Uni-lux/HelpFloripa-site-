// =====================================================
// "Perto de você": onde a pessoa está e a distância até negócios, imóveis e pessoas.
// - Posição da pessoa: o GPS do aparelho (só se ela tocar em "Usar minha localização"; fica SÓ no
//   aparelho, nunca vai para o servidor) ou, sem isso, o centro da cidade do perfil.
// - Posição das coisas: o ponto do endereço (`geo`, gravado ao salvar o negócio/anúncio) ou o centro
//   da cidade (código do IBGE, geo-cidades.json com os 5.571 municípios).
// Sem dependência do rede.js.
// =====================================================
import { resolverCidade, cidadePorCodigo } from "./endereco.js?v=1";

const CHAVE = "hf-perto";
let cidades = null;
// Centro de cada município: { "4205407": [-27.5945, -48.5477], ... } (carrega uma vez, ~60 KB).
export function carregarCidades() {
  if (!cidades) cidades = fetch("geo-cidades.json").then((r) => r.json()).catch(() => ({}));
  return cidades;
}
const ok = (la, lo) => Number.isFinite(la) && Number.isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180 && !(la === 0 && lo === 0);
export const geoOk = (g) => !!g && ok(Number(g.lat), Number(g.lng));

// Distância em km (fórmula de haversine).
export function distanciaKm(a, b) {
  if (!a || !b) return Infinity;
  const r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lng - a.lng) * r;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
}
// "800 m", "3,4 km", "12 km". Pela cidade (sem ponto exato) a distância é aproximada.
export function textoDistancia(km, aprox = false) {
  if (!Number.isFinite(km)) return "";
  if (aprox && km < 4) return "Na sua cidade";
  const t = km < 1 ? `${Math.max(100, Math.round((km * 1000) / 100) * 100)} m` : km < 10 ? `${km.toFixed(1).replace(".", ",")} km` : `${Math.round(km)} km`;
  return aprox ? `~${t}` : t;
}

// ---------- posição da pessoa ----------
export function posicaoGuardada() {
  try { const p = JSON.parse(localStorage.getItem(CHAVE) || "null"); if (p && ok(p.lat, p.lng)) return p; } catch {}
  return null;
}
function guardar(p) { try { localStorage.setItem(CHAVE, JSON.stringify(p)); } catch {} avisar(); }
export function esquecerPosicao() { try { localStorage.removeItem(CHAVE); } catch {} avisar(); }
const ouvintes = new Set();
function avisar() { ouvintes.forEach((f) => { try { f(); } catch {} }); }
export function aoMudarPosicao(fn) { ouvintes.add(fn); return () => ouvintes.delete(fn); }

// Cidade mais perto de um ponto (para o rótulo "Perto de Florianópolis"), entre as cidades do arquivo.
async function cidadeMaisPerto(p) {
  const c = await carregarCidades();
  let melhor = null, dm = Infinity;
  for (const [ibge, [la, lo]] of Object.entries(c)) { const d = distanciaKm(p, { lat: la, lng: lo }); if (d < dm) { dm = d; melhor = ibge; } }
  return melhor;
}
// Pede o GPS. Arredonda para ~100 m (não precisa de mais para "perto de você").
export function pedirLocalizacao() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error("Este aparelho não informa a localização.")); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const p = { lat: Number(pos.coords.latitude.toFixed(3)), lng: Number(pos.coords.longitude.toFixed(3)), origem: "gps", em: Date.now() };
      p.cidadeIbge = Number(await cidadeMaisPerto(p)) || null;
      guardar(p); resolve(p);
    }, (e) => reject(new Error(e?.code === 1 ? "Permissão de localização negada. Libere nas configurações do navegador." : "Não deu para pegar a sua localização agora.")), { enableHighAccuracy: false, timeout: 12000, maximumAge: 10 * 60000 });
  });
}
// Posição para usar agora: GPS guardado (até 12 h), a cidade escolhida em "Você está em"
// (`hf-busca-local`, local-escolhido.js) ou o centro da cidade do perfil (dados da conta).
export async function minhaPosicao(perfil = {}) {
  const g = posicaoGuardada();
  if (g && g.origem === "gps" && Date.now() - (g.em || 0) < 12 * 3600e3) return g;
  let escolhida = null;
  try { escolhida = JSON.parse(localStorage.getItem("hf-busca-local") || "null"); } catch {}
  if (escolhida?.cidadeIbge) { const c = await posicaoDe({ cidadeIbge: escolhida.cidadeIbge }); if (c) return { ...c, origem: "cidade", escolhida: true, cidadeIbge: Number(escolhida.cidadeIbge) }; }
  const p = await posicaoDe(perfil);
  return p ? { ...p, origem: "cidade", cidadeIbge: Number(perfil.cidadeIbge) || p.cidadeIbge || null } : g || null;
}

// ---------- posição de um negócio, anúncio ou perfil ----------
const porNome = new Map();
export async function posicaoDe(x) {
  if (!x) return null;
  if (geoOk(x.geo)) return { lat: Number(x.geo.lat), lng: Number(x.geo.lng), exata: true };
  const c = await carregarCidades();
  let ibge = Number(x.cidadeIbge) || 0;
  if (!ibge && x.cidade) {
    const k = `${x.cidade}|${x.uf || ""}`;
    if (!porNome.has(k)) porNome.set(k, resolverCidade(x.cidade, x.uf).then((r) => r?.cidadeIbge || 0).catch(() => 0));
    ibge = await porNome.get(k);
  }
  const ll = c[String(ibge)];
  return ll ? { lat: ll[0], lng: ll[1], exata: false, cidadeIbge: ibge } : null;
}
// Distância de cada item até a pessoa: devolve os itens com _km e _aprox (pela cidade).
export async function comDistancia(itens, eu) {
  if (!eu) return itens.map((x) => ({ ...x, _km: Infinity }));
  await carregarCidades();
  return Promise.all(itens.map(async (x) => {
    const p = await posicaoDe(x);
    return Object.assign(x, { _km: p ? distanciaKm(eu, p) : Infinity, _aprox: !!p && (!p.exata || eu.origem === "cidade") });
  }));
}
// Rótulo de onde a pessoa está: "Florianópolis" (nome vem da lista de cidades do IBGE).
export async function rotuloPosicao(p) {
  if (!p) return "";
  try { const c = await cidadePorCodigo(p.cidadeIbge || (await cidadeMaisPerto(p))); return c?.cidade || ""; } catch { return ""; }
}
// Ponto do endereço (para gravar em `geo` ao salvar um negócio/anúncio). Nominatim do OpenStreetMap.
// Arredondado para ~100 m: suficiente para a distância e não expõe a porta exata.
export async function geocodificar({ rua, numero, bairro, cidade, uf, cep } = {}) {
  const q = [[rua, numero].filter(Boolean).join(" "), bairro, cidade, uf].filter(Boolean).join(", ");
  if (!rua && !cep) return null;
  const tentar = async (consulta) => {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 7000);
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&${consulta}`, { signal: ctrl.signal });
      const x = (await r.json())?.[0];
      return x ? { lat: Number(Number(x.lat).toFixed(3)), lng: Number(Number(x.lon).toFixed(3)) } : null;
    } catch { return null; } finally { clearTimeout(t); }
  };
  return (rua ? await tentar(`q=${encodeURIComponent(q)}`) : null) || (cep ? await tentar(`postalcode=${encodeURIComponent(String(cep).replace(/\D/g, ""))}&country=Brasil`) : null);
}
