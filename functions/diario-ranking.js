// =====================================================
// Ranking do Diário montado no servidor (Etapa A do nível nacional).
// A cada 15 min (montarRankingDiario em index.js) lê as publicações das últimas 48 h, as estrelas (diario_notas),
// o alcance (quantas pessoas viram: diario/{id}/vistas) e os comentários, e grava listas prontas:
//   ranking_diario/br        → as melhores do Brasil
//   ranking_diario/uf_SC     → as melhores de cada estado + cidades: { "4205407": [...] }
// Cada item é um texto compacto (o Firestore não aceita lista dentro de lista):
//   "id|autorId|nota×1e6|estrelas|soma|comentários|vistas|criadoEm(ms)|ibge".
// O site (feed.js) lê 2 documentos (Brasil + seu estado) no lugar de 60 recentes do país + 30 do estado, e já recebe
// os números (não precisa ler as estrelas nem contar comentários de cada uma). Sem o documento (sem Blaze, sem a
// regra ou função parada), o Diário continua como sempre.
// Aqui só a CONTA (sem Firebase), para dar para testar sozinha.
// =====================================================

export const HORAS = 48;          // janela das publicações consideradas
export const MAX_POSTS = 1500;    // no máximo por rodada (as mais novas)
export const CONTAR = 400;        // quantas (as mais promissoras) têm o alcance e os comentários contados
export const POR_AUTOR = 3;       // no máximo por pessoa em cada lista
export const TAM = { br: 150, uf: 100, cidade: 40 };

// Engajamento das estrelas: quantas notas + o quanto passam de 3 (mesma conta do feed.js).
export const engEstrelas = (total, soma) => total + Math.max(0, soma - 3 * total) * 0.4;

// Nota de uma publicação, sem nada da pessoa que lê (quem ela segue, gosto, já vista: isso o feed.js põe por cima).
// - Engajamento com retorno decrescente (log): 30 estrelas não valem 30× uma publicação nova.
// - TAXA: interações ÷ quem viu. Uma publicação vista por 20 com 8 estrelas vale mais que uma vista por 2 mil com 10.
//   Com poucas vistas a taxa vale pouco (prior de 30 vistas), para uma estrela sozinha não virar "viral".
// - Idade divide: (horas + 2)^1,3, como no feed.
export function notaServidor({ total = 0, soma = 0, comentarios = 0, vistas = 0, horas = 0 }) {
  const eng = engEstrelas(total, soma) + 2 * comentarios;
  const taxa = (eng + 0.5) / (vistas + 30);
  const fatorTaxa = 0.6 + 0.9 * Math.min(1, taxa * 6);
  return ((1 + 1.2 * Math.log1p(eng)) * fatorTaxa) / Math.pow(Math.max(0, horas) + 2, 1.3);
}

// Pré-nota (antes de contar alcance e comentários): só estrelas e idade, para escolher quais contar.
export const preNota = (p, agora) => notaServidor({ total: p.total, soma: p.soma, vistas: 0, horas: (agora - p.criadoEm) / 3600e3 });

// Publicação que pode entrar: já apareceu (agendada só depois da hora) e é pública para todo o Brasil.
// Público por idade/gênero/lugar continua sendo conferido no aparelho de quem lê (postOculto do feed.js).
export function entra(p, agora) {
  if (!p || !p.autorId || !p.criadoEm) return false;
  if (p.agendadoPara && p.agendadoPara > agora) return false;
  if (p.oculto || p.removido) return false;
  return true;
}

// Ordena e corta com no máximo POR_AUTOR de cada pessoa.
export function topo(lista, n) {
  const vezes = new Map(), out = [];
  for (const p of lista) {
    const k = vezes.get(p.autorId) || 0;
    if (k >= POR_AUTOR) continue;
    vezes.set(p.autorId, k + 1);
    out.push(p);
    if (out.length >= n) break;
  }
  return out;
}

const compacto = (p) => [p.id, p.autorId, Math.round(p.nota * 1e6), p.total, p.soma, p.comentarios, p.vistas, p.criadoEm, p.ibge || 0].join("|");

// Monta os documentos a gravar: { br: {...}, uf_SC: {...}, ... }.
export function montarListas(posts, agora) {
  const ord = posts.slice().sort((a, b) => b.nota - a.nota);
  const docs = { br: { itens: topo(ord, TAM.br).map(compacto), total: posts.length } };
  const porUf = new Map();
  ord.forEach((p) => { if (/^[A-Z]{2}$/.test(p.uf || "")) { if (!porUf.has(p.uf)) porUf.set(p.uf, []); porUf.get(p.uf).push(p); } });
  for (const [uf, l] of porUf) {
    const cidades = {}, porCidade = new Map();
    l.forEach((p) => { if (p.ibge) { if (!porCidade.has(p.ibge)) porCidade.set(p.ibge, []); porCidade.get(p.ibge).push(p); } });
    // Até 200 cidades por estado (as com mais publicações), para o documento não passar de 1 MB.
    [...porCidade.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 200)
      .forEach(([ibge, lc]) => { cidades[String(ibge)] = topo(lc, TAM.cidade).map(compacto); });
    docs["uf_" + uf] = { itens: topo(l, TAM.uf).map(compacto), cidades, total: l.length };
  }
  Object.values(docs).forEach((d) => { d.atualizadoEm = agora; d.versao = 1; });
  return docs;
}

// Lê uma linha compacta de volta (usado pelos testes; o site tem a mesma em ranking-diario.js).
export function lerItem(t) {
  const x = String(t).split("|"), n = (i) => Number(x[i]) || 0;
  return { id: x[0], autorId: x[1], nota: n(2) / 1e6, total: n(3), soma: n(4), comentarios: n(5), vistas: n(6), criadoEm: n(7), ibge: n(8) };
}
