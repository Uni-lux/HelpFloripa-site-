// =====================================================
// Relevância justa (vitrines, Início, Explorar): todos passam pelo topo, quem paga tem vantagem clara e marcada.
// - Nota de cada perfil = qualidade (média ajustada: poucas notas puxam para 3,8) × atendimento (responde rápido,
//   perfil completo, atualizado, verificado) × novidade (até 14 dias) × perto (km ou mesma cidade) ×
//   bônus do plano (Plus +10%, Pro +20%, Premium +30%) × exposição (quem você já viu muito no topo perde um pouco) ×
//   giro (mistura fixa por pessoa e por janela de 3 h: não pula a cada recarga, mas muda ao longo do dia).
// - Na lista, 1 espaço a cada 5 é de quem tem plano (com o selo do plano no cartão): Premium primeiro (o 1º cartão de cada
//   lista e fileira é de um Premium, revezando entre eles), depois Pro e depois Plus; o resto é a ordem acima.
//   O mesmo dono não aparece duas vezes seguidas.
// - Tudo no aparelho, com os dados que a página já leu: nenhuma leitura ou gravação a mais no Firebase.
// =====================================================
export const BONUS_PLANO = [1, 1.1, 1.2, 1.3];
export const A_CADA = 5;          // 1 espaço pago a cada 5 cartões
export const JANELA_H = 3;        // a mistura muda a cada 3 horas
const NOVO_DIAS = 14;
const EXPO_CHAVE = "hf-expo";
const EXPO_MEIA_VIDA = 3 * 864e5; // a exposição cai pela metade em 3 dias
const EXPO_MAX = 800;

// Número de 0 a 1 fixo para o mesmo texto (FNV-1a).
export function sorteioFixo(txt) {
  let h = 2166136261;
  for (let i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}
export const janela = (agora = Date.now()) => Math.floor(agora / (JANELA_H * 36e5));

// ---------- exposição (no aparelho) ----------
let expo = null;
function lerExpo() {
  if (expo) return expo;
  try { expo = JSON.parse(localStorage.getItem(EXPO_CHAVE) || "{}") || {}; } catch { expo = {}; }
  return expo;
}
let gravando = 0;
function gravarExpo() {
  clearTimeout(gravando);
  gravando = setTimeout(() => {
    let lista = Object.entries(lerExpo());
    if (lista.length > EXPO_MAX) lista = lista.sort((a, b) => b[1].em - a[1].em).slice(0, EXPO_MAX);
    expo = Object.fromEntries(lista);
    try { localStorage.setItem(EXPO_CHAVE, JSON.stringify(expo)); } catch {}
  }, 400);
}
// Quantas vezes a pessoa viu este perfil no topo recentemente (com o tempo vai sumindo).
// A vez da janela atual não conta: senão a ordem mudaria já na recarga seguinte.
export function exposicao(id, agora = Date.now(), { comAtual = true } = {}) {
  const e = lerExpo()[id];
  if (!e) return 0;
  const n = comAtual || e.j !== janela(agora) ? e.n : Math.max(0, e.n - 1);
  return n * Math.pow(0.5, (agora - e.em) / EXPO_MEIA_VIDA);
}
// Conta 1 vez por janela de 3 h (mexer nos filtros não conta de novo).
export function marcarExibidos(ids, agora = Date.now()) {
  const m = lerExpo(), j = janela(agora);
  let mudou = false;
  ids.filter(Boolean).forEach((id) => {
    const e = m[id];
    if (e?.j === j) return;
    m[id] = { n: exposicao(id, agora) + 1, em: agora, j };
    mudou = true;
  });
  if (mudou) gravarExpo();
}

// ---------- nota de relevância ----------
// d = { id, media, total, resposta (min), completo (0–1), atualizadoEm, criadoEm (ms), km, mesmaCidade, nivel, verificado, fator }
export function relevancia(d, { semente = "", agora = Date.now() } = {}) {
  const total = Number(d.total) || 0;
  const ajustada = total ? (Number(d.media) * total + 3.8 * 3) / (total + 3) : 3.8;
  let s = ajustada / 5;
  const r = Number(d.resposta);
  if (Number.isFinite(r)) s *= r <= 60 ? 1.1 : r > 1440 ? 0.9 : 1;
  s *= 0.85 + 0.15 * Math.max(0, Math.min(1, Number(d.completo) || 0));
  const diasAtual = d.atualizadoEm ? (agora - d.atualizadoEm) / 864e5 : 90;
  s *= diasAtual <= 30 ? 1.05 : diasAtual > 180 ? 0.85 : 1;
  const diasNovo = d.criadoEm ? (agora - d.criadoEm) / 864e5 : 999;
  if (diasNovo < NOVO_DIAS) s *= 1 + 0.25 * (1 - diasNovo / NOVO_DIAS);
  if (Number.isFinite(d.km)) s *= 0.7 + 0.3 / (1 + d.km / 20);
  else if (d.mesmaCidade) s *= 1.1;
  if (d.verificado) s *= 1.05;
  if (Number.isFinite(d.fator)) s *= d.fator; // extra da página (ex.: delivery fechado agora)
  s *= BONUS_PLANO[Math.max(0, Math.min(3, d.nivel || 0))];
  s /= 1 + 0.15 * exposicao(d.id, agora, { comAtual: false });
  return s * (0.85 + 0.3 * sorteioFixo(semente + ":" + janela(agora) + ":" + d.id));
}

// ---------- ordem da lista ----------
// itens: a lista; dados(item) → objeto do relevancia(); dono(item) → id do dono (para não repetir em seguida).
// Devolve a lista na ordem justa. marcar: quantos do começo contam como "vistos no topo" (0 = nenhum).
export function ordenarJusto(itens, dados, { dono = () => "", semente = "", agora = Date.now(), marcar = 0, aCada = A_CADA } = {}) {
  const info = itens.map((x) => { const d = dados(x); return { x, d, s: relevancia(d, { semente, agora }), dono: dono(x) }; });
  // Espaços pagos: Premium > Pro > Plus (o que os planos prometem); dentro do mesmo plano, revezam pela mesma mistura.
  const pagos = info.filter((i) => i.d.nivel > 0).sort((a, b) => b.d.nivel - a.d.nivel || b.s - a.s);
  const organico = [...info].sort((a, b) => b.s - a.s);
  const usados = new Set(), saida = [];
  let ultimoDono = null;
  const proximo = (fila) => {
    let k = fila.findIndex((i) => !usados.has(i) && (!i.dono || i.dono !== ultimoDono));
    if (k < 0) k = fila.findIndex((i) => !usados.has(i));
    return k < 0 ? null : fila[k];
  };
  while (saida.length < info.length) {
    const pago = saida.length % aCada === 0 ? proximo(pagos) : null;
    const i = pago || proximo(organico);
    if (!i) break;
    usados.add(i); saida.push(i);
    ultimoDono = i.dono;
  }
  if (marcar) marcarExibidos(saida.slice(0, marcar).map((i) => i.d.id), agora);
  return saida.map((i) => i.x);
}
