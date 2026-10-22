// =====================================================
// Notificações agrupadas, como nas redes sociais (painel do sino e notificacoes.html):
// - estrelas na mesma publicação viram uma linha só ("Ana, Bruno e mais 3 deram estrelas");
// - seguidores do mesmo período também ("Ana e mais 4 começaram a seguir você");
// - as linhas ficam em Novas, Hoje, Ontem, Últimos 7 dias, Últimos 30 dias e Anteriores.
// Sem dependências.
// =====================================================
const DIA = 864e5;

export function periodo(t) {
  const h = new Date(); h.setHours(0, 0, 0, 0);
  const d = h.getTime();
  if (t >= d) return "Hoje";
  if (t >= d - DIA) return "Ontem";
  if (t >= d - 6 * DIA) return "Últimos 7 dias";
  if (t >= d - 29 * DIA) return "Últimos 30 dias";
  return "Anteriores";
}

// itens: do mais novo ao mais velho. ehNova(i): se a linha é nova (não mistura nova com vista).
// Devolve as linhas; uma linha agrupada tem `grupo` (todos os itens, o mais novo primeiro).
export function agrupar(itens, ehNova) {
  const linhas = [], mapa = new Map();
  for (const i of itens) {
    const nova = ehNova(i) ? "n" : periodo(i.quando);
    const k = i.tipo === "curtida" && i.postId ? `c|${i.postId}|${nova}` : i.tipo === "seguidor" ? `s|${nova}` : null;
    if (k && mapa.has(k)) { const g = mapa.get(k); if (!g.grupo.some((x) => x.uid === i.uid)) g.grupo.push(i); continue; }
    const linha = k ? { ...i, grupo: [i] } : i;
    if (k) mapa.set(k, linha);
    linhas.push(linha);
  }
  linhas.forEach((l) => { if (l.grupo && l.grupo.length < 2) delete l.grupo; });
  return linhas;
}

// Separa as linhas em seções: [["Novas", [...]], ["Hoje", [...]], ...]
export function secoes(linhas, ehNova) {
  const ordem = ["Novas", "Hoje", "Ontem", "Últimos 7 dias", "Últimos 30 dias", "Anteriores"];
  const m = new Map(ordem.map((t) => [t, []]));
  linhas.forEach((l) => m.get(ehNova(l) ? "Novas" : periodo(l.quando)).push(l));
  return ordem.map((t) => [t, m.get(t)]).filter(([, l]) => l.length);
}

// "Ana", "Ana e Bruno", "Ana, Bruno e mais 3"
export function nomesDoGrupo(l) {
  if (!l.grupo) return l.nome || "Usuário";
  const n = l.grupo.map((x) => String(x.nome || "Usuário").split(" ")[0]);
  if (n.length === 2) return `${n[0]} e ${n[1]}`;
  return `${n[0]}, ${n[1]} e mais ${n.length - 2}`;
}
export function textoDoGrupo(l) {
  if (l.tipo === "curtida") {
    const m = l.grupo.reduce((s, x) => s + (Number(x.nota) || 0), 0) / l.grupo.length;
    return `deram estrelas na sua publicação · média ${m.toFixed(1).replace(".", ",")}`;
  }
  if (l.tipo === "seguidor") return "começaram a seguir você";
  return "";
}
