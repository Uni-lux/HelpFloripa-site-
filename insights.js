// =====================================================
// Estatísticas do perfil (como o painel do Instagram e do TikTok) — só a própria pessoa vê.
// Período: 7, 30 ou 90 dias. Tudo calculado a partir do que já existe no Firebase:
// - alcance: diario/{id}/vistas (uma por conta, com a origem e a hora)
// - interações: curtidas (estrelas), comentarios e salvamentos com postAutorId = você
// - seguidores: relacoes (tipo seguir, alvoId = você) com a data
// - público: cidades de quem viu (perfis públicos), seguidores × não seguidores, horários e dias
// Sem as regras novas publicadas, alcance e salvos aparecem como "—".
// =====================================================
import {
  $, el, icone, fb, eu, dados, numero, toast, erroAmigavel, criarFolha, abrirFolha, fotosDoPost, ms, paraData,
  tempoRelativo, obterPerfil, nomeCidade, ganchos
} from "./rede.js?v=76";
import { secaoGrafico, secaoHoras } from "./estatisticas-post.js?v=43";
import { lerStats, listaDias, somarPeriodo } from "./estat-negocio.js?v=1";
import { lerPlano, nivelPlano } from "./planos-base.js?v=15";

const DIA = 864e5;
const PERIODOS = [[7, "7 dias"], [30, "30 dias"], [90, "90 dias"]];
const ORIGENS = { principais: "Principais", seguindo: "Quem segue você", amigos: "Amigos", perfil: "Seu perfil", link: "Link compartilhado", tag: "Hashtags", salvos: "Salvos" };
const fmtPct = (v) => `${Math.round(v * 100)}%`;
const lerTodos = (q) => fb.getDocs(q).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }))).catch(() => null);

let cache = null;
async function carregarDados() {
  if (cache && Date.now() - cache.em < 5 * 60000) return cache;
  const meus = (await lerTodos(fb.query(fb.collection(fb.db, "diario"), fb.where("autorId", "==", eu.uid), fb.limit(120)))) || [];
  meus.sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
  const [vistasPorPost, curtidas, comentarios, salvos, seguidores] = await Promise.all([
    Promise.all(meus.slice(0, 60).map((p) => lerTodos(fb.query(fb.collection(fb.db, "diario", p.id, "vistas"), fb.limit(1000))).then((l) => (l ? l.map((v) => ({ ...v, uid: v.id, postId: p.id })) : null)))),
    lerTodos(fb.query(fb.collection(fb.db, "curtidas"), fb.where("postAutorId", "==", eu.uid), fb.limit(3000))),
    lerTodos(fb.query(fb.collection(fb.db, "comentarios"), fb.where("postAutorId", "==", eu.uid), fb.limit(3000))),
    lerTodos(fb.query(fb.collection(fb.db, "salvamentos"), fb.where("postAutorId", "==", eu.uid), fb.limit(3000))),
    lerTodos(fb.query(fb.collection(fb.db, "relacoes"), fb.where("tipo", "==", "seguir"), fb.where("alvoId", "==", eu.uid), fb.limit(3000)))
  ]);
  const semAlcance = vistasPorPost.every((l) => l === null) && meus.length > 0;
  cache = {
    em: Date.now(), meus,
    vistas: semAlcance ? null : vistasPorPost.flat().filter(Boolean).filter((v) => v.uid !== eu.uid),
    curtidas: (curtidas || []).filter((c) => c.uid !== eu.uid),
    comentarios: (comentarios || []).filter((c) => c.autorId !== eu.uid),
    salvos, seguidores: seguidores || []
  };
  return cache;
}

export async function abrirInsights() {
  criarFolha("folhaInsights", { titulo: "Estatísticas do perfil", corpoClasse: "folha-corpo pad" });
  const corpo = $("c_folhaInsights");
  corpo.replaceChildren(el("div", "lista-vazia", "Calculando..."));
  abrirFolha("folhaInsights");
  let dadosI;
  try { dadosI = await carregarDados(); }
  catch (e) { corpo.replaceChildren(el("div", "lista-vazia", "Não foi possível calcular: " + erroAmigavel(e))); return; }
  let dias = 30;
  const pintar = () => { corpo.replaceChildren(); montar(corpo, dadosI, dias, (d) => { dias = d; pintar(); }); };
  pintar();
}

function montar(corpo, D, dias, trocarPeriodo) {
  const fim = Date.now(), ini = fim - dias * DIA, antesIni = ini - dias * DIA;
  const no = (t, a = ini, b = fim) => t >= a && t <= b;
  const t = (x) => ms(x.criadoEm);
  // ---------- período ----------
  const topo = el("div", "ins-topo");
  const per = el("div", "ins-periodo"); per.setAttribute("role", "tablist");
  PERIODOS.forEach(([d, rot]) => { const b = el("button", null, rot); b.type = "button"; b.setAttribute("aria-selected", String(d === dias)); b.addEventListener("click", () => trocarPeriodo(d)); per.appendChild(b); });
  topo.append(per, el("small", null, `${new Date(ini).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${new Date(fim).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`));
  corpo.appendChild(topo);

  // ---------- visão geral ----------
  const vistasP = D.vistas ? D.vistas.filter((v) => no(t(v))) : null;
  const vistasA = D.vistas ? D.vistas.filter((v) => no(t(v), antesIni, ini)) : null;
  const alcP = vistasP ? new Set(vistasP.map((v) => v.uid)).size : null;
  const alcA = vistasA ? new Set(vistasA.map((v) => v.uid)).size : null;
  const curP = D.curtidas.filter((c) => no(t(c))), comP = D.comentarios.filter((c) => no(t(c))), salP = D.salvos ? D.salvos.filter((c) => no(t(c))) : null;
  const curA = D.curtidas.filter((c) => no(t(c), antesIni, ini)).length, comA = D.comentarios.filter((c) => no(t(c), antesIni, ini)).length, salA = D.salvos ? D.salvos.filter((c) => no(t(c), antesIni, ini)).length : 0;
  const interP = curP.length + comP.length + (salP?.length || 0), interA = curA + comA + salA;
  const contasInter = new Set([...curP.map((c) => c.uid), ...comP.map((c) => c.autorId), ...(salP || []).map((c) => c.uid)]).size;
  const segTotal = D.seguidores.length, segNovos = D.seguidores.filter((r) => no(t(r))).length, segNovosA = D.seguidores.filter((r) => no(t(r), antesIni, ini)).length;
  const pubsP = D.meus.filter((p) => no(t(p)));
  const variacao = (a, b) => {
    if (a == null || b == null) return null;
    if (!b) return a ? { txt: "novo no período", sobe: true } : null;
    const d = (a - b) / b;
    if (Math.abs(d) < 0.05) return { txt: "igual ao período anterior", sobe: null };
    return { txt: `${d > 0 ? "▲" : "▼"} ${fmtPct(Math.abs(d))} vs. ${dias} dias antes`, sobe: d > 0 };
  };
  const cards = el("div", "estat-cards ins-cards");
  const card = (ic, rot, val, sub, cmp) => {
    const c = el("div", "estat-card"); const r = el("span", "rot"); r.append(icone(ic, "i xs"), document.createTextNode(rot));
    c.append(r, el("strong", null, val));
    if (cmp) c.appendChild(el("small", "cmp" + (cmp.sobe === true ? " sobe" : cmp.sobe === false ? " desce" : ""), cmp.txt));
    else if (sub) c.appendChild(el("small", null, sub));
    cards.appendChild(c);
  };
  card("olho", "Contas alcançadas", alcP == null ? "—" : numero(alcP), "contas diferentes que viram", variacao(alcP, alcA));
  card("coracao", "Interações", numero(interP), `${numero(contasInter)} ${contasInter === 1 ? "conta interagiu" : "contas interagiram"}`, variacao(interP, interA));
  card("pessoa-mais", "Seguidores", numero(segTotal), `+${numero(segNovos)} no período`, segNovos || segNovosA ? variacao(segNovos, segNovosA) : null);
  card("grade", "Publicações", numero(pubsP.length), `${numero(D.meus.length)} no total`);
  corpo.appendChild(cards);
  if (D.vistas == null) corpo.appendChild(el("p", "pub-dica", "Alcance e salvos começam a contar quando as regras novas forem publicadas."));

  // ---------- interações em detalhe ----------
  const det = el("div", "ins-linha3");
  const mini = (ic, rot, n, sub) => { const b = el("div", "ins-mini"); b.append(icone(ic, "i s"), el("strong", null, n), el("span", null, rot)); if (sub) b.append(el("small", null, sub)); det.appendChild(b); };
  const media = curP.length ? curP.reduce((a, c) => a + (Number(c.nota) || 0), 0) / curP.length : 0;
  mini("estrela", "Estrelas", numero(curP.length), curP.length ? `média ${media.toFixed(1).replace(".", ",")}` : "");
  mini("chat", "Comentários", numero(comP.length));
  mini("salvo", "Salvos", salP == null ? "—" : numero(salP.length));
  corpo.appendChild(det);

  // ---------- gráficos ----------
  if (vistasP?.length) corpo.appendChild(secaoGrafico("Alcance no período", "visualizações somadas, dia a dia", vistasP.map(t), ini));
  const novosT = D.seguidores.map(t).filter((x) => no(x));
  if (novosT.length) corpo.appendChild(secaoGrafico("Novos seguidores", "somados no período", novosT, ini));
  const interT = [...curP, ...comP, ...(salP || [])].map(t).filter(Boolean);
  if (interT.length) corpo.appendChild(secaoGrafico("Interações no período", "estrelas, comentários e salvos", interT, ini));

  // ---------- melhores publicações ----------
  const pont = new Map();
  const somar = (id, n) => pont.set(id, (pont.get(id) || 0) + n);
  curP.forEach((c) => somar(c.postId, 1)); comP.forEach((c) => somar(c.postId, 2)); (salP || []).forEach((c) => somar(c.postId, 2));
  const alcPost = new Map(); (vistasP || []).forEach((v) => alcPost.set(v.postId, (alcPost.get(v.postId) || 0) + 1));
  const top = D.meus.filter((p) => pont.get(p.id) || alcPost.get(p.id)).sort((a, b) => ((pont.get(b.id) || 0) * 3 + (alcPost.get(b.id) || 0)) - ((pont.get(a.id) || 0) * 3 + (alcPost.get(a.id) || 0))).slice(0, 5);
  if (top.length) {
    const s = el("div", "estat-secao"); s.appendChild(el("h3", null, "Publicações com melhor desempenho"));
    top.forEach((p, i) => {
      const l = el("button", "ins-top"); l.type = "button";
      const th = el("span", "ins-th"); const f = fotosDoPost(p)[0];
      if (f && p.mediaTipo !== "video") th.style.backgroundImage = `url("${f}")`; else { th.classList.add("txt"); th.textContent = String(p.texto || "").slice(0, 30); }
      const tx = el("span", "tx"); tx.append(el("strong", null, String(p.texto || (f ? "Foto" : "Publicação")).split("\n")[0].slice(0, 60) || "Publicação"), el("small", null, tempoRelativo(paraData(p.criadoEm))));
      const nums = el("span", "nums");
      nums.append(el("b", null, alcPost.has(p.id) ? numero(alcPost.get(p.id)) : "—"), el("small", null, "alcance"));
      const n2 = el("span", "nums"); n2.append(el("b", null, numero(pont.get(p.id) || 0)), el("small", null, "pontos"));
      l.append(el("span", "pos", String(i + 1)), th, tx, nums, n2);
      l.title = "Pontos: estrela 1, comentário 2, salvo 2";
      l.addEventListener("click", () => { location.href = `usuarios.html?post=${encodeURIComponent(p.id)}`; });
      s.appendChild(l);
    });
    corpo.appendChild(s);
  }

  // ---------- público ----------
  if (vistasP?.length) {
    const s = el("div", "estat-secao"); s.appendChild(el("h3", null, "Seu público"));
    const segSet = new Set(D.seguidores.map((r) => r.seguidorId));
    const contas = [...new Set(vistasP.map((v) => v.uid))];
    const deSeg = contas.filter((u) => segSet.has(u)).length;
    const barra = el("div", "ins-dupla");
    const a = el("i"); a.style.width = `${(deSeg / contas.length) * 100}%`;
    barra.appendChild(a);
    const leg = el("div", "ins-leg"); leg.append(el("span", "seg", `Seguidores ${fmtPct(deSeg / contas.length)}`), el("span", "nao", `Não seguidores ${fmtPct(1 - deSeg / contas.length)}`));
    s.append(barra, leg);
    // origem do alcance
    const porOrigem = {}; vistasP.forEach((v) => { if (v.origem) porOrigem[v.origem] = (porOrigem[v.origem] || 0) + 1; });
    const totO = Object.values(porOrigem).reduce((x, n) => x + n, 0);
    if (totO) {
      s.appendChild(el("h4", null, "De onde vieram"));
      Object.entries(porOrigem).sort((x, y) => y[1] - x[1]).forEach(([k, n]) => s.appendChild(barraLinha(ORIGENS[k] || k, n, totO)));
    }
    const cidadesBox = el("div"); s.append(el("h4", null, "Cidades de quem viu"), cidadesBox);
    cidadesBox.appendChild(el("p", "pub-dica", "Carregando..."));
    Promise.all(contas.slice(0, 80).map((u) => obterPerfil(u).catch(() => ({})))).then((ps) => {
      const c = {}; ps.forEach((p) => { const n = nomeCidade(p.cidade || p.cidadeNome); if (n) c[n] = (c[n] || 0) + 1; });
      const tot = Object.values(c).reduce((x, n) => x + n, 0);
      cidadesBox.replaceChildren(...(tot ? Object.entries(c).sort((x, y) => y[1] - x[1]).slice(0, 6).map(([n, q]) => barraLinha(n, q, tot)) : [el("p", "pub-dica", "Ainda sem cidades.")]));
    });
    // dias da semana
    const dsem = new Array(7).fill(0); vistasP.forEach((v) => { dsem[new Date(t(v)).getDay()]++; });
    s.appendChild(el("h4", null, "Dias com mais visualizações"));
    ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].forEach((n, i) => s.appendChild(barraLinha(n, dsem[i], vistasP.length)));
    corpo.appendChild(s);
    if (vistasP.length >= 3) corpo.appendChild(secaoHoras(vistasP));
  }

  // ---------- conteúdo por tipo ----------
  if (D.vistas) {
    const tipos = { foto: [], video: [], texto: [] };
    D.meus.forEach((p) => { const k = p.mediaTipo === "video" ? "video" : fotosDoPost(p).length ? "foto" : "texto"; tipos[k].push(alcPost.get(p.id) || 0); });
    const linhas = [["Fotos", tipos.foto], ["Vídeos", tipos.video], ["Textos", tipos.texto]].filter(([, l]) => l.length);
    if (linhas.length > 1) {
      const s = el("div", "estat-secao"); s.appendChild(el("h3", null, "Alcance médio por tipo"));
      const medias = linhas.map(([n, l]) => [n, l.reduce((a, x) => a + x, 0) / l.length]);
      const max = Math.max(1, ...medias.map(([, m]) => m));
      medias.forEach(([n, m]) => s.appendChild(barraLinha(n, Math.round(m * 10) / 10, max, `${m.toFixed(1).replace(".", ",")} por publicação`)));
      corpo.appendChild(s);
    }
  }
  corpo.appendChild(el("p", "pub-dica", "Contas alcançadas contam cada pessoa uma vez no período. Você não entra nas contas."));
  secaoNegocios(corpo, dias);
}

// ---------- seus negócios: atalho para as estatísticas de cada perfil de negócio ----------
const TIPOS_NEG = { servicos: ["Freelances", "#00adee"], delivery: ["Delivery", "#ff7a1a"], lojinha: ["Lojinha", "#b066ff"], imoveis: ["Imóveis", "#2fbf71"], saude: ["Saúde", "#0fb5a6"] };
async function secaoNegocios(corpo, dias) {
  const negs = await lerTodos(fb.query(fb.collection(fb.db, "negocios"), fb.where("donoId", "==", eu.uid), fb.limit(8)));
  if (!negs?.length) return;
  // Estatísticas dos negócios são dos planos: sem plano, os atalhos levam aos planos (sem os números).
  const comPlano = !!nivelPlano(await lerPlano(fb, eu.uid).catch(() => null));
  const stats = comPlano ? await lerStats(fb, eu.uid).catch(() => null) : null;
  const s = el("div", "estat-secao ins-negs");
  const cab = el("div", "estat-graf-cab"); cab.append(el("h3", null, "Seus negócios"), el("small", null, comPlano ? `visitas e contatos nos últimos ${dias} dias` : "as estatísticas dos negócios fazem parte dos planos"));
  s.appendChild(cab);
  negs.sort((a, b) => Object.keys(TIPOS_NEG).indexOf(a.tipo) - Object.keys(TIPOS_NEG).indexOf(b.tipo)).forEach((n) => {
    const [rot, cor] = TIPOS_NEG[n.tipo] || ["Negócio", "#00adee"];
    const a = el("a", "ins-neg"); a.href = comPlano ? `negocios.html?insights=${encodeURIComponent(n.id)}` : "negocios.html?planos=1";
    a.style.setProperty("--c", cor);
    const ic = el("span", "ic"); ic.appendChild(icone(n.tipo, "i s"));
    const tx = el("span", "tx"); tx.append(el("strong", null, n.nome || rot), el("small", null, rot));
    a.append(ic, tx);
    if (stats) {
      const r = somarPeriodo(stats, n.id, listaDias(dias)), ant = somarPeriodo(stats, n.id, listaDias(dias, 1));
      const num = (v, rotN, antes) => { const b = el("span", "nums"); b.append(el("b", null, numero(v)), el("small", null, rotN)); if (antes || v) b.appendChild(el("i", v >= antes ? "sobe" : "desce", !antes ? "novo" : `${v >= antes ? "▲" : "▼"} ${fmtPct(Math.abs((v - antes) / antes))}`)); return b; };
      a.append(num(r.v, r.v === 1 ? "visita" : "visitas", ant.v), num(r.contatos, r.contatos === 1 ? "contato" : "contatos", ant.contatos));
    }
    if (!comPlano) { const pl = el("span", "ins-plus", "PLUS"); pl.style.cssText = "margin-left:auto;padding:3px 8px;border-radius:7px;font-size:10.5px;font-weight:900;letter-spacing:.06em;color:#fff;background:linear-gradient(135deg,#3b82f6,#1d4ed8)"; a.appendChild(pl); }
    a.appendChild(icone("avancar", "i xs"));
    s.appendChild(a);
  });
  if (!stats) s.appendChild(el("p", "pub-dica", "As visitas dos negócios começam a contar quando as regras novas forem publicadas."));
  corpo.appendChild(s);
}

function barraLinha(rot, n, total, texto) {
  const l = el("div", "est-barra"); const tr = el("span", "trilho"); const i = el("i"); i.style.width = `${total ? (n / total) * 100 : 0}%`; tr.appendChild(i);
  l.append(el("span", "rot largo", rot), tr, el("span", "qt", texto ? "" : numero(n)), el("span", "pc", texto || `${total ? Math.round((n / total) * 100) : 0}%`));
  return l;
}
