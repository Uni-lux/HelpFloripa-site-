// =====================================================
// Painel do administrador — seções
// =====================================================
import { confirmarHF } from "./confirmar.js?v=4";
import { cartaoComunicado } from "./comunicados.js?v=1";
import { linha, linhaComparada, barras, cartao, destaque, num, baixarCSV } from "./graficos.js?v=7";
import { baixarPlanilhaMulti } from "./planilha.js?v=5";
import { buscarPessoas } from "./pessoas.js?v=3";
import { montarChat } from "./admin-chat.js?v=15";
import { verConteudoDenuncia } from "./admin-denuncia.js?v=7";
import { resolverCidade, textoCidade, NOME_UF } from "./endereco.js?v=1";
import {
  C, D, h, ms, DIA, agora, data, dataHora, relativo, idade, nomeCidade, avatar, pessoaCel, selo, toast, modal, estado, ativoHa,
  TIPOS_NEG, MOTIVOS_DEN, MOTIVOS_QX, registrar, enviarAviso, fluxoAviso, fluxoSancao, tirarSancao, definirSelo, abrirFicha,
  PAPEIS, DESC_PAPEIS, pode, semPermissao, nomeEquipe, vendoAgora, marcarItem, seloResp, confirmarItem, controlesResp, espera,
  PRIORIDADES, editarTarefa, moverTarefa, garantirNegocios, garantirTodasPessoas, carregarPessoas, guardarPessoas
} from "./admin-base.js?v=14";

const cab = (titulo, sub, extra) => { const c = h("div", "ad-cab"); const t = h("div"); t.append(h("h1", null, titulo)); if (sub) t.append(h("p", null, sub)); c.appendChild(t); if (extra) c.appendChild(extra); return c; };
const bloco = (titulo, sub) => { const b = h("section", "ad-bloco"); const t = h("div", "ad-bloco-topo"); const tt = h("div"); tt.append(h("h3", null, titulo)); if (sub) tt.append(h("p", null, sub)); t.appendChild(tt); b.appendChild(t); b.topo = t; return b; };
function chips(opcoes, atual, aoMudar) {
  const w = h("div", "ad-filtros");
  opcoes.forEach(([v, t]) => { const b = h("button", "ad-chip", t); b.type = "button"; b.setAttribute("aria-pressed", String(v === atual)); b.addEventListener("click", () => { w.querySelectorAll(".ad-chip").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); aoMudar(v); }); w.appendChild(b); });
  return w;
}
const btn = (t, cls, fn) => { const b = h("button", "ad-bt " + (cls || ""), t); b.type = "button"; b.addEventListener("click", async (e) => { e.stopPropagation(); b.disabled = true; try { await fn(b); } catch (err) { console.error(err); toast("Não foi possível: " + (err.code || err.message)); } finally { b.disabled = false; } }); return b; };
const pessoa = (uid) => D.pessoas.get(uid) || { uid, nome: "" }; // ainda não lida: quem chama usa o nome guardado no item ou o ID
// Contas que existem (as já apagadas só aparecem pelo nome em denúncias e chamados antigos).
const pessoas = () => [...D.pessoas.values()].filter((p) => !p.removido);

// Local de cada conta no padrão novo (estado + cidade do IBGE). Contas antigas com a cidade em
// texto ("Florianópolis", "Florianópolis/SC") são reconhecidas pela mesma conversão do site,
// então aparecem juntas. Calculado uma vez por texto diferente.
const locaisTexto = new Map();
function localDe(p) {
  if (p.uf && p.cidadeIbge) return { uf: p.uf, cidade: p.cidade, cidadeIbge: Number(p.cidadeIbge) };
  const t = String(p.cidade || p.cidadeNome || "").trim();
  if (!t) return null;
  const r = locaisTexto.get(t);
  return r === undefined ? null : r || { uf: "", cidade: nomeCidade(t), cidadeIbge: null };
}
async function prepararLocais(ps) {
  const faltam = [...new Set(ps.filter((p) => !(p.uf && p.cidadeIbge)).map((p) => String(p.cidade || p.cidadeNome || "").trim()).filter((t) => t && !locaisTexto.has(t)))];
  await Promise.all(faltam.map(async (t) => locaisTexto.set(t, await resolverCidade(t).catch(() => null) || false)));
}
const locaisProntos = (ps) => ps.every((p) => (p.uf && p.cidadeIbge) || !String(p.cidade || p.cidadeNome || "").trim() || locaisTexto.has(String(p.cidade || p.cidadeNome).trim()));
const rotuloLocal = (l) => (l ? (l.uf ? textoCidade(l) : `${l.cidade} (sem estado)`) : null);
const contarPor = (lista, chave) => { const m = new Map(); lista.forEach((x) => { const k = chave(x); if (k == null || k === "") return; m.set(k, (m.get(k) || 0) + 1); }); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
function serieDiaria(datas, dias) {
  const fim = new Date(); fim.setHours(0, 0, 0, 0);
  const ini = fim.getTime() - (dias - 1) * DIA;
  const cont = new Array(dias).fill(0);
  datas.forEach((t) => { const v = ms(t); if (v >= ini) { const i = Math.floor((v - ini) / DIA); if (i >= 0 && i < dias) cont[i]++; } });
  return cont.map((valor, i) => ({ rotulo: new Date(ini + i * DIA).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), valor }));
}
function serieMensal(datas, meses) {
  const hj = new Date(); const pts = [];
  for (let k = meses - 1; k >= 0; k--) { const d = new Date(hj.getFullYear(), hj.getMonth() - k, 1); pts.push({ ini: d.getTime(), fim: new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(), rotulo: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(". de ", "/").replace(".", ""), valor: 0 }); }
  datas.forEach((t) => { const v = ms(t); const p = pts.find((x) => v >= x.ini && v < x.fim); if (p) p.valor++; });
  return pts.map(({ rotulo, valor }) => ({ rotulo, valor }));
}
const acumulada = (serie, base) => { let t = base; return serie.map((p) => ({ rotulo: p.rotulo, valor: (t += p.valor) })); };
const noPeriodo = (t, dias, desloc = 0) => { const v = ms(t); return v > agora() - (dias + desloc) * DIA && v <= agora() - desloc * DIA; };

// ---------- período (7 / 30 / 90 / 365 / personalizado) ----------
// Um período é um número de dias OU { de, ate } em ms. janela() normaliza os dois.
function janela(p) {
  if (p && typeof p === "object") { const ini = p.de, fim = p.ate, dias = Math.max(1, Math.round((fim - ini) / DIA)); return { ini, fim, dias, mensal: dias > 92, rotulo: `${new Date(ini).toLocaleDateString("pt-BR")} a ${new Date(fim).toLocaleDateString("pt-BR")}` }; }
  const fim = agora(), ini = fim - p * DIA; return { ini, fim, dias: p, mensal: p > 92, rotulo: p >= 365 ? "últimos 12 meses" : `últimos ${p} dias` };
}
const dentro = (t, ini, fim) => { const v = ms(t); return v > ini && v <= fim; };
// No período escolhido (anterior = o período de mesmo tamanho logo antes, para comparar).
function noPeriodoP(t, p, anterior = false) { const { ini, fim } = janela(p); const dur = fim - ini; return anterior ? dentro(t, ini - dur, ini) : dentro(t, ini, fim); }
// Série por dia (até ~3 meses) ou por mês (períodos longos), entre ini e fim.
function serieEntre(datas, ini, fim, mensal) {
  if (mensal) {
    const pts = []; let d = new Date(ini); d = new Date(d.getFullYear(), d.getMonth(), 1);
    while (d.getTime() <= fim) { const prox = new Date(d.getFullYear(), d.getMonth() + 1, 1); pts.push({ ini: d.getTime(), fim: prox.getTime(), rotulo: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(". de ", "/").replace(".", ""), valor: 0 }); d = prox; }
    datas.forEach((t) => { const v = ms(t); const p = pts.find((x) => v >= x.ini && v < x.fim); if (p) p.valor++; });
    return pts.map(({ rotulo, valor }) => ({ rotulo, valor }));
  }
  const base = new Date(ini); base.setHours(0, 0, 0, 0);
  const dias = Math.max(1, Math.round((fim - base.getTime()) / DIA)), cont = new Array(dias).fill(0);
  datas.forEach((t) => { const v = ms(t); const i = Math.floor((v - base.getTime()) / DIA); if (i >= 0 && i < dias) cont[i]++; });
  return cont.map((valor, i) => ({ rotulo: new Date(base.getTime() + i * DIA).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), valor }));
}
// Linha de botões: 7 / 30 / 90 / 12 meses / Personalizado (abre duas datas).
function seletorPeriodo(atual, aoMudar) {
  const w = h("div", "ad-periodo");
  const opcoes = [[7, "7 dias"], [30, "30 dias"], [90, "90 dias"], [365, "12 meses"], ["custom", "Personalizado"]];
  const ehCustom = atual && typeof atual === "object";
  const chip = (v, t) => { const b = h("button", "ad-chip", t); b.type = "button"; const sel = v === "custom" ? ehCustom : !ehCustom && atual === v; b.setAttribute("aria-pressed", String(sel)); return b; };
  const linhaChips = h("div", "ad-filtros");
  const caixa = h("div", "ad-periodo-datas"); caixa.hidden = !ehCustom;
  const hoje = new Date().toISOString().slice(0, 10);
  const di = h("input"); di.type = "date"; di.max = hoje; di.value = ehCustom ? new Date(atual.de).toISOString().slice(0, 10) : new Date(agora() - 30 * DIA).toISOString().slice(0, 10);
  const df = h("input"); df.type = "date"; df.max = hoje; df.value = ehCustom ? new Date(atual.ate).toISOString().slice(0, 10) : hoje;
  const ap = h("button", "ad-bt pri", "Aplicar"); ap.type = "button";
  caixa.append(rotuloData("De", di), rotuloData("até", df), ap);
  ap.addEventListener("click", () => { if (!di.value || !df.value) return toast("Escolha as duas datas."); const de = new Date(di.value + "T00:00:00").getTime(), ate = new Date(df.value + "T23:59:59").getTime(); if (ate < de) return toast("A data final é antes da inicial."); aoMudar({ de, ate }); });
  opcoes.forEach(([v, t]) => { const b = chip(v, t); b.addEventListener("click", () => { if (v === "custom") { caixa.hidden = !caixa.hidden; linhaChips.querySelectorAll(".ad-chip").forEach((x) => x.setAttribute("aria-pressed", String(x === b && caixa.hidden === false))); } else aoMudar(v); }); linhaChips.appendChild(b); });
  w.append(linhaChips, caixa);
  return w;
}
function rotuloData(txt, input) { const l = h("label", "ad-data"); l.append(h("span", null, txt), input); return l; }

// ======================================================= VISÃO GERAL
export function visao(el) {
  // Totais contados no servidor (o painel não lê todas as contas ao abrir).
  const cp = D.contPessoas, n = (v) => v ?? 0;
  const novos7 = n(cp.novos7), novos7a = n(cp.novos7a), novos30 = n(cp.novos30), novos30a = n(cp.novos30a);
  const kp = h("div", "ad-kpis");
  kp.append(
    destaque({ rotulo: "Usuários", valor: n(cp.total), dica: `${num(n(cp.verificados))} verificados` }),
    destaque({ rotulo: "Novos (7 dias)", valor: novos7, antes: novos7a }),
    destaque({ rotulo: "Novos (30 dias)", valor: novos30, antes: novos30a }),
    destaque({ rotulo: "Ativos hoje", valor: n(cp.ativos1), dica: "abriram o site nas últimas 24 h" }),
    destaque({ rotulo: "Ativos (7 dias)", valor: n(cp.ativos7), dica: `${cp.total ? Math.round((n(cp.ativos7) / cp.total) * 100) : 0}% da base` }),
    destaque({ rotulo: "Ativos (30 dias)", valor: n(cp.ativos30) }),
    destaque({ rotulo: "Negócios", valor: D.contNeg.total ?? 0, dica: `${D.contNeg.anuncios ?? 0} anúncios de imóvel` }),
    destaque({ rotulo: "Publicações", valor: D.contagens.diario ?? D.posts.length, dica: `${D.contagens.diario7 ?? D.posts.filter((p) => noPeriodo(p.criadoEm, 7)).length} nos últimos 7 dias` })
  );
  const hora = new Date().getHours(); const saud = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  el.append(cab("Visão geral", `${saud}, ${C.nome.split(" ")[0] || "equipe"}. Este é o retrato do Help Floripa agora.`), minhaFila(), kp);

  const g = h("div", "ad-grade");
  // precisa de atenção
  const at = bloco("Precisa de atenção", "Toque para ir direto ao que está esperando a equipe.");
  const lista = h("div", "ad-atencao");
  const semResp = D.queixas.filter((q) => q.status === "aberta" && !q.resposta && ms(q.abertaEm) < agora() - 7 * DIA).length;
  [[D.denuncias.filter((d) => d.status === "nova").length, "Denúncias novas", "Golpes, perfis falsos e ofensas para analisar", "denuncias"],
   [D.suporte.filter((s) => s.status === "aberto").length, "Chamados de suporte esperando", "Pessoas aguardando resposta", "suporte"],
   [D.reportes.filter((r) => r.status === "novo").length, "Reportes do suporte", "Atendimentos reportados por usuários ou pela equipe", "denuncias:reportes"],
   [D.pendVerif.length, "Pedidos de verificação", "Selo de perfil verificado", "verificacoes"],
   [semResp, "Reclamações sem resposta há +7 dias", "O negócio não respondeu no prazo", "reclamacoes"],
   [D.parcerias.filter((p) => p.status === "novo").length, "Propostas de parceria novas", "Sócios, investidores e parceiros", "parcerias"],
   [D.exclusoes.size, "Exclusões de conta agendadas", "Dentro dos 30 dias para recuperar", "usuarios:exclusao"]
  ].forEach(([n, t, sub, sec]) => { const b = h("button"); b.type = "button"; const v = h("b", null, num(n)); if (n) v.style.color = "var(--st-critico)"; const s = h("span"); s.append(document.createTextNode(t), h("small", null, sub)); b.append(v, s); b.addEventListener("click", () => C.irPara(sec)); lista.appendChild(b); });
  at.appendChild(lista); g.appendChild(at);
  // crescimento
  const s30 = serieDiaria(D.novos30, 30);
  g.appendChild(cartao({ titulo: "Novos usuários por dia", sub: "Últimos 30 dias", cabecalho: ["Dia", "Novos usuários"], linhas: s30.map((p) => [p.rotulo, p.valor]), desenhar: (a) => linha(a, { pontos: s30 }), nomeArquivo: "novos-usuarios-30d" }));
  // negócios por tipo
  const porTipo = Object.entries(TIPOS_NEG).map(([k, rot], i) => ({ rotulo: rot, valor: D.contNeg[k] ?? 0, cor: `var(--viz-${i + 1})` }));
  g.appendChild(cartao({ titulo: "Perfis de negócio por tipo", sub: `${D.contNeg.total ?? 0} no total`, cabecalho: ["Tipo", "Perfis"], linhas: porTipo.map((x) => [x.rotulo, x.valor]), desenhar: (a) => barras(a, { itens: porTipo }), nomeArquivo: "negocios-por-tipo" }));
  // confiança
  const conf = bloco("Confiança da plataforma", "Moderação e qualidade do atendimento.");
  const mk = h("div", "ad-kpis"); mk.style.marginBottom = "0";
  const negNotas = [...D.notas.entries()].filter(([k]) => k.startsWith("neg_")).map(([, v]) => v);
  const tot = negNotas.reduce((a, b) => a + (b.total || 0), 0), soma = negNotas.reduce((a, b) => a + (b.soma || 0), 0);
  mk.append(
    destaque({ rotulo: "Nota média dos negócios", valor: tot ? soma / tot : 0, formato: (v) => (v ? v.toFixed(2).replace(".", ",") + "★" : "—"), dica: `${num(tot)} avaliações` }),
    destaque({ rotulo: "Reclamações abertas", valor: D.queixas.filter((q) => q.status === "aberta").length, alerta: semResp > 0, dica: `${semResp} sem resposta no prazo` }),
    destaque({ rotulo: "Contas suspensas/banidas", valor: [...D.sancoes.values()].filter((s) => s.tipo === "banimento" || ms(s.ate) > agora()).length })
  );
  conf.appendChild(mk); g.appendChild(conf);
  el.appendChild(g);
}

// Minha fila: o que está com você (tarefas, denúncias, chamados, propostas) e o que ninguém pegou.
function minhaFila() {
  const b = bloco("Minha fila", `Seu papel: ${PAPEIS[C.papel]} · ${DESC_PAPEIS[C.papel]}`);
  b.classList.add("ad-fila");
  const lista = h("div", "ad-fila-lista");
  const pintar = () => {
    if (!b.isConnected && lista.childElementCount) { C.aoMudarTarefas = null; return; }
    const eu = C.eu.uid;
    const itens = [];
    C.tarefas.filter((t) => t.status !== "feito" && t.responsavel === eu).sort((a, b2) => (ms(a.prazo) || 9e15) - (ms(b2.prazo) || 9e15)).forEach((t) => itens.push({ tipo: "Tarefa", t: t.titulo, sub: `${PRIORIDADES[t.prioridade] || ""}${ms(t.prazo) ? " · prazo " + data(t.prazo) : ""}`, alerta: ms(t.prazo) && ms(t.prazo) < agora(), ir: "tarefas" }));
    if (pode("moderar")) D.denuncias.filter((d) => d.responsavel === eu && ["nova", "em_analise"].includes(d.status)).forEach((d) => itens.push({ tipo: "Denúncia", t: `${MOTIVOS_DEN[d.motivo] || d.motivo} · ${pessoa(d.alvoId).nome || ""}`, sub: relativo(d.criadoEm), ir: "denuncias:minhas" }));
    D.suporte.filter((x) => x.responsavel === eu && x.status === "aberto").forEach((x) => itens.push({ tipo: "Chamado", t: x.assunto, sub: relativo(x.atualizadoEm), alerta: ms(x.atualizadoEm) < agora() - DIA, ir: "suporte:minhas" }));
    if (pode("comercial")) D.parcerias.filter((x) => x.responsavel === eu && !["fechado", "recusado"].includes(x.status || "novo")).forEach((x) => itens.push({ tipo: "Proposta", t: x.empresa || x.nome, sub: x.status || "novo", ir: "parcerias" }));
    const livres = [pode("moderar") && [D.denuncias.filter((d) => d.status === "nova" && !d.responsavel).length, "denúncias sem responsável", "denuncias:livres"],
      [D.suporte.filter((x) => x.status === "aberto" && !x.responsavel).length, "chamados sem responsável", "suporte:livres"],
      [C.tarefas.filter((t) => t.status !== "feito" && !t.responsavel).length, "tarefas sem responsável", "tarefas"]].filter((x) => x && x[0]);
    lista.replaceChildren();
    if (!itens.length) lista.appendChild(h("div", "ad-vazio mini", "Nada com você agora."));
    itens.slice(0, 8).forEach((x) => { const bt = h("button", "ad-fila-item" + (x.alerta ? " atrasado" : "")); bt.type = "button"; bt.append(h("span", "tipo", x.tipo), h("strong", null, x.t), h("small", null, x.sub)); bt.addEventListener("click", () => C.irPara(x.ir)); lista.appendChild(bt); });
    if (itens.length > 8) lista.appendChild(h("div", "meta", `+ ${itens.length - 8} itens`));
    if (livres.length) { const l = h("div", "ad-fila-livres"); livres.forEach(([n, t, ir]) => { const a = h("button", "ad-chip", `${n} ${t}`); a.type = "button"; a.addEventListener("click", () => C.irPara(ir)); l.appendChild(a); }); lista.appendChild(l); }
  };
  const nova = btn("Nova tarefa", "", async () => { await editarTarefa(); });
  b.topo.appendChild(nova);
  b.appendChild(lista); C.aoMudarTarefas = pintar; pintar();
  return b;
}

// ======================================================= USUÁRIOS
// Paginado: 50 por vez, filtros e busca feitos no servidor (o painel não lê todas as contas).
let filtroUsuarios = "todos", ordemUsuarios = "recentes";
const POR_PAG_USU = 50;
export function usuarios(el, termo = "") {
  if (termo) filtroUsuarios = "todos";
  const { fb } = C;
  const cp = D.contPessoas;
  const busca = h("input"); busca.type = "search"; busca.placeholder = "Buscar por nome, @, e-mail, telefone ou ID"; busca.value = termo;
  Object.assign(busca.style, { width: "min(420px,100%)", height: "40px", borderRadius: "12px", border: "1px solid var(--line)", background: "var(--input)", padding: "0 12px" });
  // A planilha usa todas as contas (lidas só ao baixar).
  const exportar = btn("Baixar Excel", "", async (b) => {
    b.textContent = "Preparando...";
    try { await Promise.all([garantirTodasPessoas(), garantirNegocios()]); } finally { b.textContent = "Baixar Excel"; }
    const l = filtrarTodas();
    baixarCSV("usuarios", ["ID", "Nome", "@", "E-mail", "Telefone", "Cidade", "Idade", "Cadastro", "Último acesso", "Situação", "Verificado", "Negócios"], l.map((p) => [p.uid, p.nome || "", p.nickname || "", p.email || "", p.telefone || "", nomeCidade(p.cidade), idade(p.dataNascimento) ?? "", data(p.criadoEm), data(p.ultimoAcesso), estado(p).t, p.verificado ? "sim" : "não", D.negocios.filter((n) => n.donoId === p.uid).length]));
    registrar("exportar", "usuarios", `${l.length} linhas`);
  });
  const topoAcoes = h("div", "ad-acoes"); topoAcoes.append(busca, exportar);
  el.append(cab("Usuários", `${num(cp.total ?? 0)} contas. Toque numa pessoa para ver a ficha completa e agir.`, topoAcoes));
  const qtd = (v) => (v != null ? ` (${num(v)})` : "");
  const sancoesAtivas = [...D.sancoes.values()].filter((x) => x.tipo === "banimento" || ms(x.ate) > agora());
  const filtros = chips([["todos", "Todos" + qtd(cp.total)], ["novos", "Novos (7 dias)" + qtd(cp.novos7)], ["ativos", "Ativos (7 dias)" + qtd(cp.ativos7)], ["inativos", "Sumidos (+30 dias)"], ["negocio", "Com negócio"], ["verificados", "Verificados" + qtd(cp.verificados)], ["desativado", "Desativados"], ["exclusao", "Exclusão agendada" + qtd(D.exclusoes.size)], ["sancao", "Suspensos/banidos" + qtd(sancoesAtivas.length)]], filtroUsuarios, (v) => { filtroUsuarios = v; busca.value = ""; recomecar(); });
  const ordem = chips([["recentes", "Mais recentes"], ["acesso", "Último acesso"], ["nome", "Nome A–Z"]], ordemUsuarios, (v) => { ordemUsuarios = v; if (filtroUsuarios === "todos" && !busca.value.trim()) recomecar(); else pintar(); });
  const linhaF = h("div", "ad-acoes"); linhaF.style.justifyContent = "space-between"; linhaF.style.marginBottom = "12px"; linhaF.append(filtros, ordem);
  const tab = h("div", "ad-tabela"); const info = h("p"); info.style.color = "var(--muted)";
  const mais = h("div", "ad-acoes"); mais.style.justifyContent = "center"; mais.style.marginTop = "12px";
  el.append(linhaF, info, tab, mais);
  const pub = fb.collection(fb.db, "perfis_publicos");
  const dias = (n) => fb.Timestamp.fromMillis(Date.now() - n * DIA);
  let lista = [], cursor = null, acabou = false, pedido = 0;
  // Filtro que vira consulta no servidor (ou null quando a lista vem de outro lugar).
  function consulta() {
    const depois = cursor ? [fb.startAfter(cursor)] : [], lim = fb.limit(POR_PAG_USU);
    switch (filtroUsuarios) {
      case "todos": return fb.query(pub, ordemUsuarios === "nome" ? fb.orderBy("nome") : fb.orderBy(ordemUsuarios === "acesso" ? "ultimoAcesso" : "criadoEm", "desc"), ...depois, lim);
      case "novos": return fb.query(pub, fb.where("criadoEm", ">=", dias(7)), fb.orderBy("criadoEm", "desc"), ...depois, lim);
      case "ativos": return fb.query(pub, fb.where("ultimoAcesso", ">=", dias(7)), fb.orderBy("ultimoAcesso", "desc"), ...depois, lim);
      case "inativos": return fb.query(pub, fb.where("ultimoAcesso", "<", dias(30)), fb.orderBy("ultimoAcesso", "desc"), ...depois, lim);
      case "verificados": return fb.query(pub, fb.where("verificado", "==", true), ...depois, lim);
      case "desativado": return fb.query(pub, fb.where("desativadaAte", ">", fb.Timestamp.now()), fb.orderBy("desativadaAte", "desc"), ...depois, lim);
      default: return null;
    }
  }
  async function idsFixos() {
    if (filtroUsuarios === "negocio") { await garantirNegocios(); return [...new Set(D.negocios.map((n) => n.donoId))]; }
    if (filtroUsuarios === "exclusao") return [...D.exclusoes.keys()];
    if (filtroUsuarios === "sancao") return sancoesAtivas.map((x) => x.id);
    return [];
  }
  async function pagina() {
    const q = consulta();
    if (!q) {
      const ids = await idsFixos();
      const fatia = ids.slice(lista.length, lista.length + POR_PAG_USU);
      await carregarPessoas(fatia);
      return { itens: fatia.map(pessoa), fim: lista.length + fatia.length >= ids.length };
    }
    const snap = await fb.getDocs(q);
    cursor = snap.docs.at(-1) || cursor;
    return { itens: await guardarPessoas(snap.docs), fim: snap.size < POR_PAG_USU };
  }
  async function carregarMais() {
    const meu = ++pedido;
    mais.replaceChildren(h("span", null, "Carregando..."));
    try { const r = await pagina(); if (meu !== pedido) return; lista.push(...r.itens); acabou = r.fim; }
    catch (e) { if (meu !== pedido) return; console.warn("Usuários:", e); acabou = true; toast("Não foi possível carregar: " + (e.code || e.message)); }
    pintar();
  }
  function recomecar() { lista = []; cursor = null; acabou = false; tab.replaceChildren(); carregarMais(); }
  // Busca no servidor: começo do @ e do nome, qualquer palavra do nome, e-mail, telefone e ID exatos.
  async function buscar(t) {
    const meu = ++pedido;
    mais.replaceChildren(h("span", null, "Buscando..."));
    const minus = t.toLowerCase().replace(/^@/, "");
    const titulo = minus.replace(/(^|\s)\S/g, (x) => x.toUpperCase());
    const ler = (q) => fb.getDocs(q).then((sn) => sn.docs).catch(() => []);
    const prefixo = (campo, v) => ler(fb.query(pub, fb.orderBy(campo), fb.startAt(v), fb.endAt(v + ""), fb.limit(25)));
    const palavra = minus.normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/).filter((x) => x.length >= 2)[0];
    const digitos = t.replace(/\D/g, "");
    const usu = fb.collection(fb.db, "usuarios");
    const [porPub, porConta, porId] = await Promise.all([
      Promise.all([prefixo("nickname", minus.replace(/\s+/g, "")), ...[...new Set([t, minus, titulo])].map((v) => prefixo("nome", v)),
        palavra ? ler(fb.query(pub, fb.where("busca", "array-contains", palavra), fb.limit(25))) : []]).then((g) => g.flat()),
      pode("moderar") ? Promise.all([
        t.includes("@") ? ler(fb.query(usu, fb.where("email", "in", [...new Set([t, minus])]), fb.limit(10))) : [],
        digitos.length >= 8 ? ler(fb.query(usu, fb.where("telefone", "in", [...new Set([t, digitos])]), fb.limit(10))) : []
      ]).then((g) => g.flat().map((d) => d.id)) : [],
      /^[A-Za-z0-9]{6,}$/.test(t) ? fb.getDoc(fb.doc(pub, t)).then((d) => (d.exists() ? [d] : [])).catch(() => []) : []
    ]);
    const unicos = new Map(); [...porPub, ...porId].forEach((d) => unicos.set(d.id, d));
    await guardarPessoas([...unicos.values()]);
    await carregarPessoas(porConta);
    if (meu !== pedido) return;
    lista = [...new Set([...unicos.keys(), ...porConta])].map(pessoa);
    acabou = true;
    pintar();
    info.textContent = `${num(lista.length)} resultado(s) para "${t}".`;
  }
  function ordenar(l) {
    return [...l].sort(ordemUsuarios === "nome" ? (a, b) => String(a.nome || "").localeCompare(String(b.nome || "")) : ordemUsuarios === "acesso" ? (a, b) => ms(b.ultimoAcesso) - ms(a.ultimoAcesso) : (a, b) => ms(b.criadoEm) - ms(a.criadoEm));
  }
  function pintar() {
    // "Todos" já vem na ordem escolhida do servidor; os outros filtros são ordenados aqui.
    const l = filtroUsuarios === "todos" && !busca.value.trim() ? lista : ordenar(lista);
    const total = { todos: cp.total, novos: cp.novos7, ativos: cp.ativos7, verificados: cp.verificados }[filtroUsuarios];
    info.textContent = l.length ? `Mostrando ${num(l.length)}${total != null && !busca.value.trim() ? ` de ${num(total)}` : ""} ${l.length === 1 ? "pessoa" : "pessoas"}.` : "";
    const t = document.createElement("table");
    const th = h("tr"); ["Pessoa", "E-mail", "Cidade", "Idade", "Cadastro", "Último acesso", "Situação"].forEach((x) => th.appendChild(h("th", null, x)));
    const thead = h("thead"); thead.appendChild(th); const tb = h("tbody");
    l.forEach((p) => {
      const tr = h("tr", "clicavel"); tr.tabIndex = 0;
      const c1 = h("td"); c1.appendChild(pessoaCel(p));
      const st = estado(p); const c7 = h("td"); c7.appendChild(selo(st.t, st.c)); if (p.verificado) c7.append(" ", selo("Verificado", "info"));
      tr.append(c1, h("td", null, p.email || "—"), h("td", null, nomeCidade(p.cidade) || "—"), h("td", null, idade(p.dataNascimento) ?? "—"), h("td", null, data(p.criadoEm)), h("td", null, relativo(p.ultimoAcesso)), c7);
      const abrir = () => abrirFicha(p.uid);
      tr.addEventListener("click", abrir); tr.addEventListener("keydown", (e) => { if (e.key === "Enter") abrir(); });
      tb.appendChild(tr);
    });
    t.append(thead, tb); tab.replaceChildren(l.length ? t : h("div", "ad-vazio", "Ninguém encontrado com esses filtros."));
    mais.replaceChildren();
    if (!acabou) mais.appendChild(btn("Carregar mais", "", carregarMais));
  }
  // Planilha: mesmos filtros, sobre todas as contas.
  function filtrarTodas() {
    const comNegocio = new Set(D.negocios.map((n) => n.donoId));
    return ordenar(pessoas().filter((p) => {
      const st = estado(p).k;
      if (filtroUsuarios === "novos") return noPeriodo(p.criadoEm, 7);
      if (filtroUsuarios === "ativos") return ativoHa(p, 7);
      if (filtroUsuarios === "inativos") return !ativoHa(p, 30) && !!p.ultimoAcesso;
      if (filtroUsuarios === "negocio") return comNegocio.has(p.uid);
      if (filtroUsuarios === "verificados") return !!p.verificado;
      if (filtroUsuarios === "desativado") return st === "desativado";
      if (filtroUsuarios === "exclusao") return st === "exclusao";
      if (filtroUsuarios === "sancao") return ["suspenso", "banido"].includes(st);
      return true;
    }));
  }
  let tempo; busca.addEventListener("input", () => {
    clearTimeout(tempo);
    tempo = setTimeout(() => { const t = busca.value.trim(); if (t.length >= 2) buscar(t); else if (!t) recomecar(); }, 400);
  });
  if (termo.trim().length >= 2) buscar(termo.trim()); else recomecar();
  if (termo) busca.focus();
}

// ======================================================= DENÚNCIAS
let filtroDen = "nova";
export function denuncias(el) {
  if (filtroDen === "reportes") return reportesSuporte(el);
  const porAlvo = contarPor(D.denuncias, (d) => d.alvoId);
  el.appendChild(cab("Denúncias", "Analise, veja o conteúdo e decida: descartar, avisar, remover, suspender ou banir."));
  const g = h("div", "ad-grade"); g.style.marginBottom = "14px";
  const top = porAlvo.slice(0, 8).map(([uid, n]) => ({ rotulo: pessoa(uid).nome || uid, valor: n }));
  g.appendChild(cartao({ titulo: "Mais denunciados", sub: "Reincidência é sinal de alerta", cabecalho: ["Pessoa", "Denúncias"], linhas: top.map((x) => [x.rotulo, x.valor]), desenhar: (a) => barras(a, { itens: top, horizontal: true, cor: "var(--viz-2)" }), nomeArquivo: "mais-denunciados" }));
  const mot = contarPor(D.denuncias, (d) => MOTIVOS_DEN[d.motivo] || d.motivo).map(([rotulo, valor]) => ({ rotulo, valor }));
  g.appendChild(cartao({ titulo: "Denúncias por motivo", cabecalho: ["Motivo", "Denúncias"], linhas: mot.map((x) => [x.rotulo, x.valor]), desenhar: (a) => barras(a, { itens: mot, horizontal: true }), nomeArquivo: "denuncias-por-motivo" }));
  el.appendChild(g);
  if (pode("moderar")) {
    const nRep = D.reportes.filter((r) => r.status === "novo").length;
    const ir = h("button", "ad-bt" + (nRep ? " pri" : ""), `Reportes do suporte${nRep ? ` (${nRep} novos)` : ""}`); ir.type = "button";
    ir.style.marginBottom = "12px";
    ir.addEventListener("click", () => { filtroDen = "reportes"; C.irPara("denuncias"); });
    el.appendChild(ir);
  }
  const fil = chips([["nova", `Novas (${D.denuncias.filter((d) => d.status === "nova").length})`], ["em_analise", "Em análise"], ["minhas", "Comigo"], ["livres", "Sem responsável"], ["resolvida", "Resolvidas"], ["descartada", "Descartadas"], ["todas", "Todas"]], filtroDen, (v) => { filtroDen = v; pintar(); });
  if (!pode("moderar")) el.appendChild(h("div", "ad-aviso-papel", `Seu papel (${PAPEIS[C.papel]}) pode ver as denúncias, mas quem age é a moderação.`));
  fil.style.marginBottom = "12px";
  const lista = h("div", "ad-lista"); el.append(fil, lista);
  const contAlvo = new Map(porAlvo);
  function pintar() {
    const aberta = (d) => d.status === "nova" || d.status === "em_analise";
    const l = D.denuncias.filter((d) => filtroDen === "todas" || (filtroDen === "minhas" ? d.responsavel === C.eu.uid && aberta(d) : filtroDen === "livres" ? !d.responsavel && aberta(d) : d.status === filtroDen)).sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
    lista.replaceChildren(...(l.length ? l.slice(0, 200).map(item) : [h("div", "ad-vazio", "Nenhuma denúncia aqui.")]));
  }
  function item(d) {
    const c = h("article", "ad-item"); c.dataset.item = `denuncia:${d.id}`;
    const top = h("div", "cab");
    top.append(selo(MOTIVOS_DEN[d.motivo] || d.motivo, d.motivo === "golpe" || d.motivo === "menor" ? "critico" : "serio"), selo({ perfil: "Perfil", publicacao: "Publicação", comentario: "Comentário", mensagem: "Mensagem", negocio: "Negócio" }[d.tipo] || d.tipo, "neutro"));
    if ((contAlvo.get(d.alvoId) || 0) >= 3) top.append(selo(`${contAlvo.get(d.alvoId)} denúncias contra`, "critico"));
    if (d.status === "nova" || d.status === "em_analise") top.append(seloResp(d), espera(d.criadoEm, 24));
    top.append(h("span", "quando", dataHora(d.criadoEm)));
    const alvo = pessoa(d.alvoId), autor = pessoa(d.autorId);
    const quem = h("div", "meta");
    const a1 = h("a", null, alvo.nome || d.alvoId); a1.href = "#"; a1.addEventListener("click", (e) => { e.preventDefault(); abrirFicha(d.alvoId); });
    const a2 = h("a", null, autor.nome || d.autorId); a2.href = "#"; a2.addEventListener("click", (e) => { e.preventDefault(); abrirFicha(d.autorId); });
    quem.append("Denunciado: ", a1, " · por ", a2);
    c.append(top, quem);
    if (d.trecho) c.appendChild(h("div", "trecho", d.trecho));
    if (d.detalhe) c.appendChild(h("div", "meta", `Relato: ${d.detalhe}`));
    if (d.status !== "nova") c.appendChild(h("div", "meta", `${d.status === "resolvida" ? "Resolvida" : d.status === "descartada" ? "Descartada" : "Em análise"}${d.acao ? " · ação: " + d.acao : ""}${d.nota ? " · " + d.nota : ""} · ${dataHora(d.analisadaEm)}`));
    const ac = h("div", "ad-acoes");
    const item = `denuncia:${d.id}`;
    const nomeItem = `Denúncia: ${MOTIVOS_DEN[d.motivo] || d.motivo} · ${alvo.nome || ""}`;
    ac.append(btn("Ver conteúdo denunciado", "", () => { marcarItem(item, nomeItem); return verConteudo(d); }));
    const mod = pode("moderar");
    if (mod && d.status === "nova") ac.append(btn("Em análise", "", async () => { if (!(await confirmarItem(d, item))) return; marcarItem(item, nomeItem); await atualizar(d, { status: "em_analise", ...(d.responsavel ? {} : { responsavel: C.eu.uid }) }); }));
    if (mod && d.status !== "resolvida" && d.status !== "descartada") {
      ac.append(btn("Descartar", "", async () => { if (!(await confirmarItem(d, item))) return; marcarItem(item, nomeItem); const v = await modal({ titulo: "Descartar denúncia", campos: [{ nome: "nota", rotulo: "Por quê? (só a equipe vê)", tipo: "textarea" }], botao: "Descartar" }); if (v) await atualizar(d, { status: "descartada", acao: "nenhuma", nota: v.nota }); }));
      ac.append(btn("Resolver com ação", "pri", async () => { if (!(await confirmarItem(d, item))) return; marcarItem(item, nomeItem); return resolver(d); }));
    }
    c.appendChild(ac);
    if (d.status === "nova" || d.status === "em_analise") c.appendChild(controlesResp("denuncias", d, { permitido: mod, aoMudar: pintar }));
    return c;
  }
  async function atualizar(d, campos) {
    const { fb } = C;
    const dados = { ...campos, analisadaEm: fb.serverTimestamp(), analisadaPor: C.eu.uid };
    if (campos.responsavel) Object.assign(dados, { responsavelNome: nomeEquipe(campos.responsavel), assumidoEm: fb.serverTimestamp() });
    await fb.updateDoc(fb.doc(fb.db, "denuncias", d.id), dados);
    Object.assign(d, campos, campos.responsavel ? { responsavelNome: nomeEquipe(campos.responsavel) } : {}, { analisadaEm: { toMillis: () => agora() } });
    marcarItem(null);
    await registrar("denuncia_" + campos.status, d.alvoId, `${d.id}${campos.acao ? " · " + campos.acao : ""}`);
    toast("Denúncia atualizada"); pintar();
  }
  async function resolver(d) {
    const v = await modal({ titulo: "Resolver denúncia", texto: "Escolha o que fazer. Tudo fica no registro de ações.", campos: [
      { nome: "acao", rotulo: "Ação", tipo: "select", opcoes: [["aviso", "Enviar aviso à pessoa"], ["remover", "Remover o conteúdo (publicação/comentário) ou esconder o negócio"], ["suspensao", "Suspender a conta"], ["banimento", "Banir a conta"], ["nenhuma", "Nenhuma (só marcar como resolvida)"]] },
      { nome: "nota", rotulo: "Anotação interna", tipo: "textarea" }
    ], botao: "Continuar" });
    if (!v) return;
    const { fb } = C;
    if (v.acao === "aviso" && !(await fluxoAviso(d.alvoId))) return;
    if ((v.acao === "suspensao" || v.acao === "banimento") && !(await fluxoSancao(d.alvoId, v.acao))) return;
    if (v.acao === "remover") {
      if (d.tipo === "publicacao") { await fb.deleteDoc(fb.doc(fb.db, "diario", d.itemId)); D.posts = D.posts.filter((x) => x.id !== d.itemId); }
      else if (d.tipo === "comentario") await fb.deleteDoc(fb.doc(fb.db, "comentarios", d.itemId));
      else if (d.tipo === "negocio") { await fb.updateDoc(fb.doc(fb.db, "negocios", d.itemId), { ocultoAte: fb.Timestamp.fromDate(new Date("2999-12-31")), ocultoPelaEquipe: true }); const n = D.negocios.find((x) => x.id === d.itemId); if (n) n.ocultoAte = { toMillis: () => new Date("2999-12-31").getTime() }; }
      else { toast("Perfis e mensagens não são removidos: use aviso, suspensão ou banimento."); return; }
      await registrar("remover_conteudo", d.alvoId, `${d.tipo} ${d.itemId}`);
    }
    await atualizar(d, { status: "resolvida", acao: v.acao, nota: v.nota });
  }
  // Conteúdo como apareceu (mensagem com as de antes e depois, foto, áudio, cartões).
  const verConteudo = (d) => verConteudoDenuncia(d);
  pintar();
}

// ======================================================= RECLAMAÇÕES
export function reclamacoes(el) {
  const q = D.queixas;
  const abertas = q.filter((x) => x.status === "aberta"), semResp = abertas.filter((x) => !x.resposta && ms(x.abertaEm) < agora() - 7 * DIA);
  const resp = q.filter((x) => x.respondidaEm && x.abertaEm);
  const tempoMedio = resp.length ? resp.reduce((a, x) => a + (ms(x.respondidaEm) - ms(x.abertaEm)), 0) / resp.length / DIA : 0;
  const ver = h("a", "ad-bt", "Abrir página de Reclamações"); ver.href = "reclamacoes.html"; ver.target = "_blank";
  el.appendChild(cab("Reclamações", "Reclamações abertas por clientes contra negócios.", ver));
  const kp = h("div", "ad-kpis");
  kp.append(destaque({ rotulo: "Total", valor: q.length }), destaque({ rotulo: "Abertas", valor: abertas.length }), destaque({ rotulo: "Sem resposta (+7 dias)", valor: semResp.length, alerta: semResp.length > 0 }),
    destaque({ rotulo: "Resolvidas", valor: q.filter((x) => x.status === "resolvida").length }), destaque({ rotulo: "Tempo médio de resposta", valor: tempoMedio, formato: (v) => (v ? `${v.toFixed(1).replace(".", ",")} dias` : "—") }),
    destaque({ rotulo: "Taxa de resposta", valor: q.length ? q.filter((x) => x.resposta).length / q.length : 0, formato: (v) => `${Math.round(v * 100)}%` }));
  el.appendChild(kp);
  const g = h("div", "ad-grade"); g.style.marginBottom = "14px";
  const porNeg = contarPor(q, (x) => x.negocioId).slice(0, 8).map(([id, n]) => ({ rotulo: D.negocios.find((x) => x.id === id)?.nome || q.find((x) => x.negocioId === id)?.negocioNome || id, valor: n }));
  g.appendChild(cartao({ titulo: "Negócios com mais reclamações", cabecalho: ["Negócio", "Reclamações"], linhas: porNeg.map((x) => [x.rotulo, x.valor]), desenhar: (a) => barras(a, { itens: porNeg, horizontal: true, cor: "var(--viz-2)" }), nomeArquivo: "negocios-mais-reclamados" }));
  const mot = contarPor(q, (x) => MOTIVOS_QX[x.motivo] || x.motivo).map(([rotulo, valor]) => ({ rotulo, valor }));
  g.appendChild(cartao({ titulo: "Reclamações por motivo", cabecalho: ["Motivo", "Reclamações"], linhas: mot.map((x) => [x.rotulo, x.valor]), desenhar: (a) => barras(a, { itens: mot, horizontal: true }), nomeArquivo: "reclamacoes-por-motivo" }));
  el.appendChild(g);
  const tab = h("div", "ad-tabela"); const t = document.createElement("table");
  const th = h("tr"); ["Aberta em", "Cliente", "Negócio", "Motivo", "Situação", "Relato", ""].forEach((x) => th.appendChild(h("th", null, x)));
  const thead = h("thead"); thead.appendChild(th); const tb = h("tbody");
  // Cobranças já feitas (de qualquer pessoa da equipe), lidas do registro de ações.
  const cobradas = new Map(), pintores = [];
  lerCobrancas().then((m) => { m.forEach((v, k) => cobradas.set(k, v)); pintores.forEach((f) => f()); });
  [...q].sort((a, b) => ms(b.abertaEm) - ms(a.abertaEm)).slice(0, 300).forEach((x) => {
    const tr = h("tr", "clicavel");
    const atras = x.status === "aberta" && !x.resposta && ms(x.abertaEm) < agora() - 7 * DIA;
    const st = h("td"); st.appendChild(selo(x.status === "resolvida" ? "Resolvida" : atras ? "Sem resposta" : x.resposta ? "Respondida" : "Aguardando", x.status === "resolvida" ? "bom" : atras ? "critico" : x.resposta ? "info" : "atencao"));
    const acao = h("td");
    if (x.status === "aberta" && !x.resposta) {
      // A cobrança fica guardada no registro de ações (admin_log): sair e voltar mostra quem cobrou e quando.
      const b = btn("Cobrar resposta", "mini", async () => {
        const ult = cobradas.get(x.id);
        if (ult && !(await confirmarHF({ titulo: "Cobrar de novo?", texto: `${ult.porNome || nomeEquipe(ult.por) || "Alguém da equipe"} já cobrou ${relativo(ult.em)}. O negócio recebe outro aviso.`, ok: "Cobrar de novo", icone: "alerta", cor: "normal" }))) return;
        await enviarAviso(x.alvoId, { titulo: "Você tem uma reclamação sem resposta", texto: `Um cliente abriu uma reclamação sobre "${x.negocioNome || "seu negócio"}" em ${data(x.abertaEm)} e ainda não teve resposta.\n\nResponda pela página Reclamações. Reclamações sem resposta pesam na confiança do seu perfil.`, tipo: "alerta" });
        await registrar("cobrar_reclamacao", x.alvoId, `queixa:${x.id} ${x.negocioNome || ""}`);
        cobradas.set(x.id, { por: C.eu.uid, porNome: C.nome, em: { toMillis: () => Date.now() } });
        pintarCobranca(); toast("Negócio avisado");
      });
      const info = h("small", "ad-cobrado");
      const pintarCobranca = () => {
        const ult = cobradas.get(x.id);
        b.textContent = ult ? "Cobrar de novo" : "Cobrar resposta";
        info.textContent = ult ? `Cobrado ${relativo(ult.em)} · ${ult.porNome || nomeEquipe(ult.por) || "equipe"}` : "";
        info.hidden = !ult;
      };
      pintores.push(pintarCobranca); pintarCobranca();
      const w = h("div", "ad-cobrar"); w.append(b, info); acao.appendChild(w);
    }
    tr.append(h("td", null, data(x.abertaEm)), h("td", null, pessoa(x.autorId).nome || x.autorNome || "—"), h("td", null, x.negocioNome || x.negocioId), h("td", null, MOTIVOS_QX[x.motivo] || x.motivo), st, h("td", null, String(x.texto || "").slice(0, 80)), acao);
    tr.addEventListener("click", (e) => { if (!e.target.closest("button")) abrirFicha(x.alvoId); });
    tb.appendChild(tr);
  });
  t.append(thead, tb); tab.appendChild(q.length ? t : h("div", "ad-vazio", "Nenhuma reclamação ainda."));
  el.appendChild(tab);
}

// ======================================================= SANÇÕES
export function sancoes(el) {
  el.appendChild(cab("Suspensões e banimentos", "Contas com restrição ativa e o histórico de sanções."));
  const ativos = [...D.sancoes.entries()].filter(([, s]) => s.tipo === "banimento" || ms(s.ate) > agora());
  const lista = h("div", "ad-lista");
  if (!ativos.length) lista.appendChild(h("div", "ad-vazio", "Nenhuma conta suspensa ou banida agora."));
  ativos.forEach(([uid, s]) => {
    const c = h("article", "ad-item"); const top = h("div", "cab"); top.append(pessoaCel(pessoa(uid)), selo(s.tipo === "banimento" ? "Banida" : `Suspensa até ${data(s.ate)}`, s.tipo === "banimento" ? "critico" : "serio"));
    c.append(top, h("div", "meta", `Motivo: ${s.motivo || "—"} · desde ${dataHora(s.em)}`));
    const ac = h("div", "ad-acoes"); ac.append(btn("Ver ficha", "", () => abrirFicha(uid))); if (pode("moderar")) ac.append(btn("Remover sanção", "pri", async () => { if (!(await confirmarHF({ titulo: "Remover a restrição?", texto: "A conta volta a usar o site normalmente.", ok: "Remover", icone: "escudo", cor: "normal" }))) return; await tirarSancao(uid); toast("Sanção removida"); await C.recarregar(false); C.irPara("sancoes"); }));
    c.appendChild(ac); lista.appendChild(c);
  });
  el.appendChild(lista);
  const hist = [...D.sancoes.entries()].flatMap(([uid, s]) => (s.historico || []).map((x) => ({ uid, ...x }))).sort((a, b) => Date.parse(b.em) - Date.parse(a.em));
  if (hist.length) {
    const b = bloco("Histórico de sanções", `${hist.length} registros`); b.style.marginTop = "14px";
    const l = h("div", "ad-hist"); hist.slice(0, 100).forEach((x) => l.appendChild(h("div", null, `${new Date(x.em).toLocaleDateString("pt-BR")} · ${pessoa(x.uid).nome || x.uid} · ${x.tipo === "removida" ? "removida" : x.tipo}${x.ate ? " até " + new Date(x.ate).toLocaleDateString("pt-BR") : ""} · ${x.motivo || ""} · ${x.por || ""}`)));
    b.appendChild(l); el.appendChild(b);
  }
}

// ======================================================= NEGÓCIOS
// Paginado: lê 50 por vez do servidor (não carrega todos os negócios ao abrir o painel).
let filtroNeg = "todos";
const POR_PAGINA = 50;
export function negocios(el) {
  const cn = D.contNeg;
  const busca = h("input"); busca.type = "search"; busca.placeholder = "Buscar por nome do negócio, dono, @ ou ID";
  Object.assign(busca.style, { width: "min(420px,100%)", height: "40px", borderRadius: "12px", border: "1px solid var(--line)", background: "var(--input)", padding: "0 12px" });
  el.appendChild(cab("Negócios e anúncios", `${num(cn.total ?? 0)} perfis de negócio e ${num(cn.anuncios ?? 0)} anúncios de imóvel.`, busca));
  const rot = (k, t) => (cn[k] != null ? `${t} (${num(cn[k])})` : t);
  const fil = chips([["todos", rot("total", "Todos")], ...Object.entries(TIPOS_NEG).map(([k, t]) => [k, rot(k, t)]), ["escondidos", "Escondidos"], ["mal", "Nota abaixo de 3"]], filtroNeg, (v) => { filtroNeg = v; recomecar(); });
  fil.style.marginBottom = "12px";
  const tab = h("div", "ad-tabela");
  const info = h("p"); info.style.color = "var(--muted)";
  const mais = h("div", "ad-acoes"); mais.style.justifyContent = "center"; mais.style.marginTop = "12px";
  el.append(fil, info, tab, mais);
  const queixasPor = new Map(contarPor(D.queixas, (x) => x.negocioId));
  let lista = [], cursor = null, acabou = false, pedido = 0;
  const { fb } = C;
  const neg = fb.collection(fb.db, "negocios");
  const doc = (d) => ({ id: d.id, ...d.data() });
  // Uma página do filtro atual. Sem o índice (tipo + atualizadoEm) criado ainda, busca sem ordenar.
  async function pagina() {
    if (filtroNeg === "mal") {
      // As notas já estão no painel: pega só os negócios com média abaixo de 3.
      const ids = [...D.notas.entries()].filter(([k, r]) => k.startsWith("neg_") && r?.total && r.soma / r.total < 3).map(([k]) => k.slice(4));
      const fatia = ids.slice(lista.length, lista.length + POR_PAGINA);
      const docs = (await Promise.all(fatia.map((id) => fb.getDoc(fb.doc(fb.db, "negocios", id)).catch(() => null)))).filter((s) => s?.exists());
      return { itens: docs.map(doc), fim: lista.length + fatia.length >= ids.length };
    }
    const depois = cursor ? [fb.startAfter(cursor)] : [];
    let q;
    if (filtroNeg === "escondidos") q = fb.query(neg, fb.where("ocultoAte", ">", fb.Timestamp.now()), fb.orderBy("ocultoAte", "desc"), ...depois, fb.limit(POR_PAGINA));
    else if (filtroNeg === "todos") q = fb.query(neg, fb.orderBy("atualizadoEm", "desc"), ...depois, fb.limit(POR_PAGINA));
    else q = fb.query(neg, fb.where("tipo", "==", filtroNeg), fb.orderBy("atualizadoEm", "desc"), ...depois, fb.limit(POR_PAGINA));
    let snap;
    try { snap = await fb.getDocs(q); }
    catch (e) {
      if (e?.code !== "failed-precondition" || filtroNeg === "escondidos") throw e;
      snap = await fb.getDocs(fb.query(neg, fb.where("tipo", "==", filtroNeg), ...depois, fb.limit(POR_PAGINA)));
    }
    cursor = snap.docs.at(-1) || cursor;
    return { itens: snap.docs.map(doc), fim: snap.size < POR_PAGINA };
  }
  async function carregarMais() {
    const meu = ++pedido;
    mais.replaceChildren(h("span", null, "Carregando..."));
    try {
      const r = await pagina();
      if (meu !== pedido) return;
      await carregarPessoas(r.itens.map((n) => n.donoId)); // nomes dos donos desta página
      if (meu !== pedido) return;
      lista.push(...r.itens); acabou = r.fim;
    } catch (e) {
      if (meu !== pedido) return;
      console.warn("Negócios:", e); acabou = true;
      toast("Não foi possível carregar os negócios: " + (e.code || e.message));
    }
    pintar();
  }
  function recomecar() { busca.value = ""; lista = []; cursor = null; acabou = false; tab.replaceChildren(); carregarMais(); }
  // Busca no servidor: começo do nome (como digitado e com iniciais maiúsculas), donos com esse nome/@ e o ID exato.
  async function buscar(t) {
    const meu = ++pedido;
    mais.replaceChildren(h("span", null, "Buscando..."));
    const titulo = t.toLowerCase().replace(/(^|\s)\S/g, (x) => x.toUpperCase());
    const variantes = [...new Set([t, titulo, t[0].toUpperCase() + t.slice(1)])];
    const tl = t.toLowerCase().replace(/^@/, "");
    const donos = (await buscarPessoas(fb, t, { limite: 30 }).catch(() => [])).map((x) => x.uid).slice(0, 30);
    const ler = (q) => fb.getDocs(q).then((sn) => sn.docs).catch(() => []);
    const grupos = await Promise.all([
      ...variantes.map((v) => ler(fb.query(neg, fb.where("nome", ">=", v), fb.where("nome", "<=", v + "\uf8ff"), fb.limit(25)))),
      donos.length ? ler(fb.query(neg, fb.where("donoId", "in", donos), fb.limit(60))) : [],
      /^[\w-]{6,}$/.test(t) ? fb.getDoc(fb.doc(fb.db, "negocios", t)).then((d) => (d.exists() ? [d] : [])).catch(() => []) : []
    ]);
    if (meu !== pedido) return;
    const vistos = new Set();
    lista = grupos.flat().filter((d) => !vistos.has(d.id) && vistos.add(d.id)).map(doc).sort((a, b) => ms(b.atualizadoEm) - ms(a.atualizadoEm));
    await carregarPessoas(lista.map((n) => n.donoId));
    if (meu !== pedido) return;
    acabou = true;
    pintar();
    info.textContent = `${num(lista.length)} resultado(s) para "${t}".`;
  }
  let tempoBusca;
  busca.addEventListener("input", () => {
    clearTimeout(tempoBusca);
    tempoBusca = setTimeout(() => {
      const t = busca.value.trim();
      if (t.length >= 2) buscar(t);
      else if (!t) { lista = []; cursor = null; acabou = false; carregarMais(); }
    }, 400);
  });
  function pintar() {
    const total = filtroNeg === "todos" ? cn.total : TIPOS_NEG[filtroNeg] ? cn[filtroNeg] : null;
    info.textContent = lista.length ? `Mostrando ${num(lista.length)}${total != null ? ` de ${num(total)}` : ""}, dos atualizados mais recentemente.` : "";
    const t = document.createElement("table");
    const th = h("tr"); ["Negócio", "Tipo", "Dono", "Cidade", "Nota", "Reclamações", "Atualizado", ""].forEach((x) => th.appendChild(h("th", null, x)));
    const thead = h("thead"); thead.appendChild(th); const tb = h("tbody");
    lista.forEach((n) => {
      const r = D.notas.get("neg_" + n.id); const esc = ms(n.ocultoAte) > agora();
      const tr = h("tr");
      const c0 = h("td"); c0.appendChild(pessoaCel({ nome: n.nome, fotoPerfil: n.foto }, n.categoria || "")); if (esc) c0.appendChild(selo("Escondido", "neutro"));
      const dono = h("td"); const a = h("a", null, pessoa(n.donoId).nome || n.donoId); a.href = "#"; a.addEventListener("click", (e) => { e.preventDefault(); abrirFicha(n.donoId); }); dono.appendChild(a);
      const ac = h("td"); const w = h("div", "ad-acoes"); w.style.flexWrap = "nowrap";
      const link = h("a", "ad-bt", "Ver"); link.href = `${n.tipo === "imoveis" ? "imoveis.html" : ({ servicos: "servicos.html", delivery: "delivery.html", lojinha: "shopping.html" }[n.tipo])}?negocio=${encodeURIComponent(n.id)}`; link.target = "_blank";
      w.append(link); if (pode("moderar")) w.append(btn(esc ? "Mostrar" : "Esconder", esc ? "" : "perigo", async () => {
        if (!esc && !(await confirmarHF({ titulo: "Esconder da vitrine?", texto: `"${n.nome}" deixa de aparecer para todos até ser mostrado de novo.`, ok: "Esconder", icone: "olhoOff" }))) return;
        await fb.updateDoc(fb.doc(fb.db, "negocios", n.id), { ocultoAte: esc ? null : fb.Timestamp.fromDate(new Date("2999-12-31")), ocultoPelaEquipe: !esc });
        n.ocultoAte = esc ? null : { toMillis: () => new Date("2999-12-31").getTime() };
        const m = D.negocios.find((x) => x.id === n.id); if (m) m.ocultoAte = n.ocultoAte;
        await registrar(esc ? "mostrar_negocio" : "esconder_negocio", n.donoId, n.id); toast(esc ? "Negócio visível de novo" : "Negócio escondido"); pintar();
      }));
      ac.appendChild(w);
      tr.append(c0, h("td", null, TIPOS_NEG[n.tipo] || n.tipo), dono, h("td", null, nomeCidade(n.cidade) || "—"), h("td", null, r?.total ? `${(r.soma / r.total).toFixed(1).replace(".", ",")}★ (${r.total})` : "—"), h("td", null, String(queixasPor.get(n.id) || 0)), h("td", null, data(n.atualizadoEm)), ac);
      tb.appendChild(tr);
    });
    t.append(thead, tb); tab.replaceChildren(lista.length ? t : h("div", "ad-vazio", "Nenhum negócio com esse filtro."));
    mais.replaceChildren();
    if (!acabou) mais.appendChild(btn("Carregar mais", "", carregarMais));
  }
  recomecar();
}

// ======================================================= REPORTES DO SUPORTE
// reportes/{atendimento|usuario}_{chamado}_{uid}: só a moderação e os donos veem (quem atendeu, não).
export const protocolo = (id) => "#" + String(id || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase();
const MOTIVOS_REP = { demora: "Demorou para responder", grosseria: "Grosseria", nao_resolveu: "Não resolveu", errado: "Informação errada", dados: "Pediu senha ou dados pessoais",
  ofensa: "Ofendeu a equipe", ameaca: "Ameaça", golpe: "Tentativa de golpe", spam: "Spam / abuso do suporte", outro: "Outro" };
let filtroRep = "novo";
const notaTxt = (v) => (v == null ? "—" : `${v.toFixed(1).replace(".", ",")} ★`);
function reportesSuporte(el) {
  const volta = h("button", "ad-bt", "← Denúncias"); volta.type = "button"; volta.addEventListener("click", () => { filtroDen = "nova"; C.irPara("denuncias"); });
  el.appendChild(cab("Reportes do suporte", "Atendimentos reportados por quem abriu o chamado e pessoas reportadas pela equipe. Só a moderação e os donos veem esta lista.", volta));
  if (!pode("moderar")) { el.appendChild(h("div", "ad-aviso-papel", "Só a moderação e os donos veem os reportes do suporte.")); return; }
  const kp = h("div", "ad-kpis");
  const notas = D.notasSuporte.filter((n) => n.nota >= 1);
  const media = notas.length ? notas.reduce((a, n) => a + n.nota, 0) / notas.length : 0;
  kp.append(
    destaque({ rotulo: "Reportes novos", valor: D.reportes.filter((r) => r.status === "novo").length }),
    destaque({ rotulo: "Sobre atendimentos", valor: D.reportes.filter((r) => r.tipo === "atendimento").length }),
    destaque({ rotulo: "Pessoas reportadas pela equipe", valor: D.reportes.filter((r) => r.tipo === "usuario").length }),
    destaque({ rotulo: "Nota média do atendimento", valor: notas.length ? media : null, formato: notaTxt, dica: `${notas.length} ${notas.length === 1 ? "avaliação" : "avaliações"}` })
  );
  el.appendChild(kp);
  const fil = chips([["novo", `Novos (${D.reportes.filter((r) => r.status === "novo").length})`], ["em_analise", "Em análise"], ["resolvido", "Resolvidos"], ["descartado", "Descartados"], ["todos", "Todos"]], filtroRep, (v) => { filtroRep = v; pintar(); });
  fil.style.marginBottom = "12px";
  const lista = h("div", "ad-lista"); el.append(fil, lista);
  function pintar() {
    const l = D.reportes.filter((r) => filtroRep === "todos" || r.status === filtroRep).sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
    lista.replaceChildren(...(l.length ? l.map(item) : [h("div", "ad-vazio", "Nenhum reporte aqui.")]));
  }
  const link = (uid, nome) => { const a = h("a", null, nome || pessoa(uid).nome || uid); a.href = "#"; a.addEventListener("click", (e) => { e.preventDefault(); abrirFicha(uid); }); return a; };
  function item(r) {
    const c = h("article", "ad-item");
    const top = h("div", "cab");
    top.append(selo(r.tipo === "atendimento" ? "Atendimento reportado" : "Pessoa reportada pela equipe", r.tipo === "atendimento" ? "atencao" : "serio"),
      selo(MOTIVOS_REP[r.motivo] || r.motivo, ["dados", "ameaca", "golpe", "grosseria"].includes(r.motivo) ? "critico" : "neutro"),
      selo(protocolo(r.chamadoId), "info"));
    if (r.status === "novo") top.append(espera(r.criadoEm, 24));
    top.append(h("span", "quando", dataHora(r.criadoEm)));
    const quem = h("div", "meta");
    if (r.tipo === "atendimento") quem.append("Reportado por ", link(r.autorId), r.alvoId ? " · atendente: " : " · ainda sem atendente", ...(r.alvoId ? [h("b", null, nomeEquipe(r.alvoId))] : []));
    else quem.append("Pessoa: ", link(r.alvoId, r.alvoNome), " · reportada por ", h("b", null, nomeEquipe(r.autorId)));
    c.append(top, h("strong", null, r.assunto || "Chamado"), quem);
    if (r.detalhe) c.appendChild(h("div", "trecho", r.detalhe));
    if (r.status !== "novo") c.appendChild(h("div", "meta", `${{ em_analise: "Em análise", resolvido: "Resolvido", descartado: "Descartado" }[r.status] || r.status}${r.analisadaPor ? " por " + nomeEquipe(r.analisadaPor) : ""}${r.nota ? " · " + r.nota : ""}`));
    const ac = h("div", "ad-acoes");
    const ch = D.suporte.find((x) => x.id === r.chamadoId);
    if (ch) ac.append(btn("Ver conversa", "", () => abrirChamadoSuporte?.(ch)));
    if (r.status === "novo") ac.append(btn("Em análise", "", () => atualizarRep(r, { status: "em_analise" })));
    if (r.status === "novo" || r.status === "em_analise") {
      ac.append(btn("Descartar", "", async () => { const v = await modal({ titulo: "Descartar reporte", campos: [{ nome: "nota", rotulo: "Por quê? (só a moderação vê)", tipo: "textarea" }], botao: "Descartar" }); if (v) await atualizarRep(r, { status: "descartado", nota: v.nota }); }));
      ac.append(btn("Resolver", "pri", async () => { const v = await modal({ titulo: "Resolver reporte", campos: [{ nome: "nota", rotulo: "O que foi feito? (só a moderação vê)", tipo: "textarea" }], botao: "Resolver" }); if (v) await atualizarRep(r, { status: "resolvido", nota: v.nota }); }));
    }
    c.appendChild(ac);
    return c;
  }
  async function atualizarRep(r, mud) {
    const { fb } = C;
    const dadosMud = { ...mud, ...(mud.nota != null ? { nota: String(mud.nota || "").slice(0, 1000) } : {}), analisadaPor: C.eu.uid, analisadaEm: fb.serverTimestamp() };
    await fb.updateDoc(fb.doc(fb.db, "reportes", r.id), dadosMud);
    Object.assign(r, dadosMud, { analisadaEm: { toMillis: () => Date.now() } });
    await registrar("reporte_" + mud.status, r.tipo === "usuario" ? r.alvoId : r.autorId, `${protocolo(r.chamadoId)} ${MOTIVOS_REP[r.motivo] || r.motivo}`);
    toast("Reporte atualizado"); pintar();
  }
  pintar();
}
let abrirChamadoSuporte = null; // ligado pela seção Suporte (abrir a conversa a partir de um reporte)

// "Cobrar resposta" das reclamações: a última cobrança de cada uma (admin_log, acao cobrar_reclamacao).
let cobrancasP = null;
function lerCobrancas() {
  const { fb } = C;
  return (cobrancasP ||= fb.getDocs(fb.query(fb.collection(fb.db, "admin_log"), fb.where("acao", "==", "cobrar_reclamacao"), fb.limit(2000))).then((s) => {
    const m = new Map();
    s.docs.forEach((d) => { const x = d.data(); const id = (String(x.detalhe || "").match(/^queixa:([\w-]+)/) || [])[1]; if (id && (!m.has(id) || ms(x.em) > ms(m.get(id).em))) m.set(id, x); });
    return m;
  }).catch((e) => { cobrancasP = null; console.warn("Cobranças:", e.code || e); return new Map(); }));
}

// ======================================================= SUPORTE
let filtroSup = "aberto";
export function suporte(el) {
  el.appendChild(cab("Suporte", "Chamados abertos pelos usuários (inclui contestações de suspensão). Para falar com alguém, abra a ficha da pessoa e toque em \"Abrir conversa de suporte\"."));
  const notaDe = (id) => D.notasSuporte.find((n) => n.id === id);
  const notas = D.notasSuporte.filter((n) => n.nota >= 1);
  const kp = h("div", "ad-kpis");
  kp.append(
    destaque({ rotulo: "Esperando a equipe", valor: D.suporte.filter((s) => s.status === "aberto").length, dica: `${D.suporte.filter((s) => s.status === "aberto" && !s.responsavel).length} sem responsável` }),
    destaque({ rotulo: "Esperando há +24 h", valor: D.suporte.filter((s) => s.status === "aberto" && ms(s.atualizadoEm) < agora() - DIA).length }),
    destaque({ rotulo: "Comigo", valor: D.suporte.filter((s) => s.responsavel === C.eu.uid && s.status !== "fechado").length }),
    destaque({ rotulo: "Nota do atendimento", valor: notas.length ? notas.reduce((a, n) => a + n.nota, 0) / notas.length : null, formato: notaTxt, dica: `${notas.length} ${notas.length === 1 ? "avaliação" : "avaliações"}` })
  );
  el.appendChild(kp);
  const fil = chips([["aberto", `Esperando (${D.suporte.filter((s) => s.status === "aberto").length})`], ["minhas", "Comigo"], ["livres", "Sem responsável"], ["respondido", "Respondidos"], ["fechado", "Fechados"], ["todos", "Todos"]], filtroSup, (v) => { filtroSup = v; pintar(); });
  fil.style.marginBottom = "12px";
  const lista = h("div", "ad-lista"); el.append(fil, lista);
  const CAT = { conta: "Conta", pagamento: "Pagamento", golpe: "Golpe", denuncia: "Denúncia", contestacao: "Contestação", negocio: "Negócio", sugestao: "Sugestão", outro: "Outro" };
  function pintar() {
    const abertoOu = (s) => s.status !== "fechado";
    const l = D.suporte.filter((s) => filtroSup === "todos" || (filtroSup === "minhas" ? s.responsavel === C.eu.uid && abertoOu(s) : filtroSup === "livres" ? !s.responsavel && abertoOu(s) : s.status === filtroSup)).sort((a, b) => (filtroSup === "aberto" ? ms(a.atualizadoEm) - ms(b.atualizadoEm) : ms(b.atualizadoEm) - ms(a.atualizadoEm)));
    lista.replaceChildren(...(l.length ? l.map((s) => {
      const c = h("article", "ad-item clicavel"); c.dataset.item = `suporte:${s.id}`; c.tabIndex = 0;
      const top = h("div", "cab"); top.append(selo(CAT[s.categoria] || s.categoria, s.categoria === "contestacao" || s.categoria === "golpe" ? "serio" : "neutro"), selo(s.status === "aberto" ? "Esperando a equipe" : s.status === "respondido" ? "Respondido" : "Fechado", s.status === "aberto" ? "atencao" : s.status === "respondido" ? "info" : "bom"));
      if (s.abertoPor) top.append(selo(`Aberto pela equipe (${nomeEquipe(s.abertoPor)})`, "info"));
      if (s.status !== "fechado") top.append(seloResp(s));
      if (s.status === "aberto") top.append(espera(s.atualizadoEm, 24));
      if (s.status === "aberto" && s.ultimaDe === "usuario" && s.atendidoPor) top.append(selo("Nova mensagem da pessoa", "info"));
      const nt = notaDe(s.id); if (nt) top.append(selo(`${"★".repeat(nt.nota)} ${nt.nota}/5`, nt.nota <= 2 ? "critico" : "bom"));
      top.append(selo(protocolo(s.id), "neutro"));
      top.append(h("span", "quando", relativo(s.atualizadoEm)));
      c.append(top, h("strong", null, s.assunto), h("div", "meta", `${pessoa(s.uid).nome || s.nome || s.uid} · aberto em ${dataHora(s.criadoEm)}`));
      if (s.status !== "fechado") c.appendChild(controlesResp("suporte", s, { aoMudar: pintar }));
      c.addEventListener("click", (e) => { if (!e.target.closest("button,select,a")) abrirChamado(s); });
      c.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target === c) abrirChamado(s); });
      return c;
    }) : [h("div", "ad-vazio", "Nenhum chamado aqui.")]));
  }
  // A equipe reporta a pessoa do chamado para a moderação (ofensas, ameaça, golpe...).
  async function reportarPessoa(s) {
    const v = await modal({ titulo: "Reportar à moderação", texto: "A moderação e os donos recebem o reporte com a conversa deste chamado.", campos: [
      { nome: "motivo", rotulo: "O que aconteceu", tipo: "select", opcoes: [["ofensa", "Ofendeu a equipe"], ["ameaca", "Ameaça"], ["golpe", "Tentativa de golpe"], ["spam", "Spam / abuso do suporte"], ["outro", "Outro"]] },
      { nome: "detalhe", rotulo: "Detalhes (opcional)", tipo: "textarea" }], botao: "Enviar reporte", perigo: true });
    if (!v) return;
    const { fb } = C;
    try {
      await fb.setDoc(fb.doc(fb.db, "reportes", `usuario_${s.id}_${C.eu.uid}`), { tipo: "usuario", chamadoId: s.id, assunto: String(s.assunto || "").slice(0, 120), autorId: C.eu.uid, alvoId: s.uid,
        alvoNome: String(pessoa(s.uid).nome || s.nome || "").slice(0, 80), motivo: v.motivo, ...(String(v.detalhe || "").trim() ? { detalhe: String(v.detalhe).trim().slice(0, 1000) } : {}), status: "novo", criadoEm: fb.serverTimestamp() });
      await registrar("reporte_novo", s.uid, `${protocolo(s.id)} ${MOTIVOS_REP[v.motivo] || v.motivo}`);
      toast("Reporte enviado para a moderação");
    } catch (e) { toast(e?.code === "permission-denied" ? "Os reportes ainda não estão liberados (falta publicar as regras)." : "Não foi possível reportar: " + (e.code || e.message)); }
  }
  const PRONTAS = [
    ["", "Respostas prontas…"],
    ["Olá! Recebemos seu chamado e já estamos verificando. Respondemos por aqui assim que tivermos novidades.", "Recebido, estamos verificando"],
    ["Olá! Já resolvemos. Pode tentar de novo? Se ainda der problema, responda aqui que continuamos.", "Resolvido, pode testar"],
    ["Olá! Para ajudar, preciso de mais detalhes: o que você estava fazendo, em qual página e, se possível, um print da tela.", "Pedir mais detalhes"],
    ["Olá! Analisamos sua contestação. A decisão foi mantida porque a conta descumpriu os Termos de Uso. Obrigado pela compreensão.", "Contestação negada"],
    ["Olá! Analisamos sua contestação e removemos a restrição da sua conta. Obrigado pela paciência.", "Contestação aceita"],
    ["Olá! Para a sua segurança, combine pagamentos e entregas sempre pelo chat do Help Floripa e desconfie de pedidos de pagamento adiantado.", "Dica de segurança"],
    ["Olá! Vamos encerrar este chamado. Se precisar de algo mais, é só abrir um novo. Obrigado!", "Encerrar"]
  ];
  abrirChamadoSuporte = (s) => abrirChamado(s);
  async function abrirChamado(s) {
    const { fb } = C;
    const item = `suporte:${s.id}`;
    if (!(await confirmarItem(s, item))) return;
    marcarItem(item, `Chamado: ${s.assunto}`);
    const fundo = h("div", "ad-modal-fundo"), cx = h("div", "ad-modal"); cx.style.width = "min(620px,100%)";
    const topoCh = h("div", "cab"); topoCh.append(seloResp(s)); const vendo = vendoAgora(item); if (vendo.length) topoCh.append(selo(`${vendo.join(", ")} também está aqui`, "atencao"));
    topoCh.prepend(selo(protocolo(s.id), "neutro"));
    const nt = notaDe(s.id); if (nt) topoCh.append(selo(`Nota ${nt.nota}/5${nt.comentario ? " · " + nt.comentario.slice(0, 60) : ""}`, nt.nota <= 2 ? "critico" : "bom"));
    cx.append(topoCh, h("h3", null, s.assunto), h("p", null, `${pessoa(s.uid).nome || s.nome || s.uid}${s.email ? " · " + s.email : ""} · ${CAT[s.categoria] || s.categoria} · aberto em ${dataHora(s.criadoEm)}`));
    const chat = h("div", "ad-chat"); chat.appendChild(h("div", "ad-vazio", "Carregando..."));
    const txt = document.createElement("textarea"); txt.maxLength = 2000; txt.placeholder = "Escreva a resposta da equipe..."; Object.assign(txt.style, { width: "100%", minHeight: "90px", padding: "10px 12px", borderRadius: "10px", border: "1px solid var(--line)", background: "var(--input)" });
    const pr = document.createElement("select"); pr.className = "ad-sel-mini"; pr.setAttribute("aria-label", "Inserir resposta pronta");
    PRONTAS.forEach(([v, t]) => pr.appendChild(new Option(t, v)));
    pr.addEventListener("change", () => { if (pr.value) { const nome = (pessoa(s.uid).nome || s.nome || "").split(" ")[0]; txt.value = (txt.value ? txt.value + "\n\n" : "") + (nome ? pr.value.replace(/^Olá!/, `Olá, ${nome}!`) : pr.value); pr.value = ""; txt.focus(); } });
    const ac = h("div", "ad-acoes");
    const fechar = () => { fundo.remove(); marcarItem(null); };
    ac.append(btn("Ver ficha", "", () => { fechar(); abrirFicha(s.uid); }), btn(s.status === "fechado" ? "Reabrir" : "Fechar chamado", "", async () => {
      const novo = s.status === "fechado" ? "aberto" : "fechado";
      await fb.updateDoc(fb.doc(fb.db, "suporte", s.id), { status: novo, atualizadoEm: fb.serverTimestamp(), ultimaDe: "equipe", atendidoPor: C.eu.uid });
      s.status = novo; await registrar("suporte_" + novo, s.uid, s.assunto); toast("Chamado atualizado"); fechar(); pintar();
    }), btn("Reportar à moderação", "perigo", () => reportarPessoa(s)), btn("Sair", "", fechar), btn("Responder e encerrar", "", async () => {
      const t = txt.value.trim(); if (!t) { toast("Escreva a resposta."); return; }
      await fb.addDoc(fb.collection(fb.db, "suporte", s.id, "mensagens"), { autorId: C.eu.uid, equipe: true, texto: t, em: fb.serverTimestamp() });
      await fb.updateDoc(fb.doc(fb.db, "suporte", s.id), { status: "fechado", atualizadoEm: fb.serverTimestamp(), ultimaDe: "equipe", atendidoPor: C.eu.uid });
      s.status = "fechado"; await registrar("suporte_resposta", s.uid, s.assunto); await registrar("suporte_fechado", s.uid, s.assunto); toast("Resposta enviada e chamado encerrado"); fechar(); pintar();
    }), btn("Responder", "pri", async () => {
      const t = txt.value.trim(); if (!t) { toast("Escreva a resposta."); return; }
      await fb.addDoc(fb.collection(fb.db, "suporte", s.id, "mensagens"), { autorId: C.eu.uid, equipe: true, texto: t, em: fb.serverTimestamp() });
      const assumir = !s.responsavel ? { responsavel: C.eu.uid, responsavelNome: nomeEquipe(C.eu.uid), assumidoEm: fb.serverTimestamp() } : {};
      await fb.updateDoc(fb.doc(fb.db, "suporte", s.id), { status: "respondido", atualizadoEm: fb.serverTimestamp(), ultimaDe: "equipe", atendidoPor: C.eu.uid, ...assumir });
      if (assumir.responsavel) Object.assign(s, { responsavel: C.eu.uid, responsavelNome: assumir.responsavelNome });
      // A pessoa é avisada pelas Notificações, pelo sino e por Mensagens (Suporte Help Floripa).
      s.status = "respondido"; await registrar("suporte_resposta", s.uid, s.assunto); toast("Resposta enviada"); fechar(); pintar();
    }));
    cx.append(chat, pr, txt, ac); fundo.appendChild(cx); document.body.appendChild(fundo);
    fundo.addEventListener("click", (e) => { if (e.target === fundo) fechar(); });
    const msgs = await fb.getDocs(fb.query(fb.collection(fb.db, "suporte", s.id, "mensagens"), fb.orderBy("em", "asc"))).catch(() => ({ docs: [] }));
    chat.replaceChildren(...msgs.docs.map((d) => { const m = d.data(); const b = h("div", "ad-msg" + (m.equipe ? " equipe" : ""), m.texto); b.appendChild(h("small", null, `${m.equipe ? `Suporte Help Floripa (${nomeEquipe(m.autorId)})` : pessoa(s.uid).nome || "Usuário"} · ${dataHora(m.em)}`)); return b; }));
    if (!msgs.docs.length) chat.appendChild(h("div", "ad-vazio", "Sem mensagens."));
    chat.scrollTop = chat.scrollHeight;
  }
  pintar();
}

// ======================================================= PARCERIAS
export function parcerias(el) {
  el.appendChild(cab("Sócios e parcerias", "Propostas enviadas pelo formulário da página Sócios e parcerias."));
  const TIPO = { socio: "Sócio", investidor: "Investidor", parceiro: "Parceiro", anunciante: "Anunciante", imprensa: "Imprensa", outro: "Outro" };
  const COLS = [["novo", "Novas"], ["em_conversa", "Em conversa"], ["proposta", "Proposta enviada"], ["fechado", "Fechadas"], ["recusado", "Recusadas"]];
  const k = h("div", "ad-kanban");
  COLS.forEach(([st, rot]) => {
    const itens = D.parcerias.filter((p) => (p.status || "novo") === st).sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
    const col = h("div", "ad-coluna"); const t = h("h4"); t.append(h("span", null, rot), h("span", null, String(itens.length))); col.appendChild(t);
    itens.forEach((p) => {
      const c = h("article", "ad-item"); c.dataset.item = `parceria:${p.id}`;
      c.append(h("div", "cab"), h("strong", null, p.empresa ? `${p.empresa} · ${p.nome}` : p.nome), h("div", "meta", `${TIPO[p.tipo] || p.tipo} · ${data(p.criadoEm)}${p.cidade ? " · " + p.cidade : ""}`), h("div", "trecho", String(p.mensagem || "").length > 160 ? String(p.mensagem).slice(0, 160) + "…" : p.mensagem), h("div", "meta", "Toque para ver tudo"));
      c.querySelector(".cab").append(selo(TIPO[p.tipo] || p.tipo, "info"));
      if (!["fechado", "recusado"].includes(p.status || "novo")) c.querySelector(".cab").append(seloResp(p));
      if (p.notas) c.appendChild(h("div", "meta", `Notas: ${p.notas}`));
      const ac = h("div", "ad-acoes");
      if (p.email) { const a = h("a", "ad-bt", "E-mail"); a.href = `mailto:${p.email}?subject=Help Floripa — ${encodeURIComponent(TIPO[p.tipo] || "Parceria")}`; ac.appendChild(a); }
      const tel = String(p.telefone || "").replace(/\D/g, ""); if (tel.length >= 10) { const w = h("a", "ad-bt", "WhatsApp"); w.href = `https://wa.me/${tel.length <= 11 ? "55" + tel : tel}`; w.target = "_blank"; ac.appendChild(w); }
      if (pode("comercial")) ac.appendChild(btn("Atualizar", "pri", () => atualizarProposta(p)));
      c.appendChild(ac);
      if (!["fechado", "recusado"].includes(p.status || "novo")) c.appendChild(controlesResp("parcerias", p, { permitido: pode("comercial"), aoMudar: () => C.irPara("parcerias") }));
      col.appendChild(c);
      c.classList.add("clicavel"); c.tabIndex = 0; c.setAttribute("role", "button"); c.setAttribute("aria-label", `Abrir proposta de ${p.nome}`);
      c.addEventListener("click", (e) => { if (!e.target.closest("a,button")) abrirProposta(p); });
      c.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target === c) abrirProposta(p); });
    });
    if (!itens.length) col.appendChild(h("div", "meta", "—"));
    k.appendChild(col);
  });
  el.appendChild(k);

  async function atualizarProposta(p) {
    if (!pode("comercial")) { semPermissao(); return; }
    if (!(await confirmarItem(p, `parceria:${p.id}`))) return;
    const v = await modal({ titulo: "Atualizar proposta", campos: [{ nome: "status", rotulo: "Etapa", tipo: "select", opcoes: COLS, valor: p.status || "novo" }, { nome: "notas", rotulo: "Notas internas", tipo: "textarea", valor: p.notas || "", max: 3000 }], botao: "Salvar" });
    if (!v) return;
    const { fb } = C;
    const dono = p.responsavel ? {} : { responsavel: C.eu.uid, responsavelNome: nomeEquipe(C.eu.uid), assumidoEm: fb.serverTimestamp() };
    await fb.updateDoc(fb.doc(fb.db, "parcerias", p.id), { status: v.status, notas: v.notas, atualizadoEm: fb.serverTimestamp(), ...dono });
    Object.assign(p, v, dono.responsavel ? { responsavel: C.eu.uid, responsavelNome: dono.responsavelNome } : {}, { atualizadoEm: { toMillis: () => agora() } }); await registrar("parceria", p.email || p.nome, `${v.status}`); toast("Proposta atualizada"); C.irPara("parcerias");
  }

  function abrirProposta(p) {
    marcarItem(`parceria:${p.id}`, `Proposta: ${p.empresa || p.nome}`);
    const fundo = h("div", "ad-modal-fundo"), cx = h("div", "ad-modal ad-proposta"); cx.setAttribute("role", "dialog"); cx.setAttribute("aria-modal", "true");
    const fechar = () => { fundo.remove(); document.removeEventListener("keydown", tecla); marcarItem(null); };
    const tecla = (e) => { if (e.key === "Escape") fechar(); };
    document.addEventListener("keydown", tecla);
    fundo.addEventListener("click", (e) => { if (e.target === fundo) fechar(); });
    const etapa = Object.fromEntries(COLS)[p.status || "novo"];
    const topo = h("div", "cab"); topo.append(selo(TIPO[p.tipo] || p.tipo, "info"), selo(etapa, p.status === "fechado" ? "bom" : p.status === "recusado" ? "neutro" : "atencao"), seloResp(p));
    const vendoP = vendoAgora(`parceria:${p.id}`); if (vendoP.length) topo.append(selo(`${vendoP.join(", ")} também está aqui`, "atencao"));
    cx.append(topo, h("h3", null, p.empresa ? `${p.empresa}` : p.nome), h("p", null, `${p.empresa ? p.nome + " · " : ""}enviada em ${dataHora(p.criadoEm)}`));
    const dl = h("dl", "ad-dados");
    const par = (k, v, link) => { if (!v) return; const d = h("div"); d.append(h("dt", null, k)); const dd = h("dd"); if (link) { const a = h("a", null, v); a.href = link; if (/^https?:/.test(link)) { a.target = "_blank"; a.rel = "noopener noreferrer"; } dd.appendChild(a); } else dd.textContent = v; d.appendChild(dd); dl.appendChild(d); };
    const tel = String(p.telefone || "").replace(/\D/g, "");
    const site = String(p.site || "").trim();
    const linkSite = /^https?:\/\//i.test(site) ? site : /^@[\w.]+$/.test(site) ? `https://instagram.com/${site.slice(1)}` : /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(site) ? `https://${site}` : "";
    par("Nome", p.nome); par("Empresa", p.empresa); par("E-mail", p.email, p.email ? `mailto:${p.email}` : "");
    par("WhatsApp / telefone", p.telefone, tel.length >= 10 ? `https://wa.me/${tel.length <= 11 ? "55" + tel : tel}` : "");
    par("Cidade", p.cidade); par("Site ou Instagram", site, linkSite); par("Tipo", TIPO[p.tipo] || p.tipo);
    if (p.uid) par("Conta no site", pessoa(p.uid).nome || p.uid);
    par("Responsável", p.responsavel ? (p.responsavelNome || nomeEquipe(p.responsavel)) : "");
    par("Atualizada", p.atualizadoEm ? dataHora(p.atualizadoEm) : "");
    const msg = h("div", "ad-proposta-msg", p.mensagem || "");
    cx.append(h("h4", null, "Proposta"), msg, dl);
    if (p.notas) cx.append(h("h4", null, "Notas internas"), h("div", "ad-proposta-msg", p.notas));
    const ac = h("div", "ad-acoes");
    if (p.uid) ac.append(btn("Ver ficha", "", () => { fechar(); abrirFicha(p.uid); }));
    if (p.email) { const a = h("a", "ad-bt", "E-mail"); a.href = `mailto:${p.email}?subject=Help Floripa — ${encodeURIComponent(TIPO[p.tipo] || "Parceria")}`; ac.appendChild(a); }
    if (tel.length >= 10) { const w = h("a", "ad-bt", "WhatsApp"); w.href = `https://wa.me/${tel.length <= 11 ? "55" + tel : tel}`; w.target = "_blank"; w.rel = "noopener"; ac.appendChild(w); }
    if (pode("comercial")) ac.append(btn("Apagar", "perigo", async () => { if (!(await confirmarHF({ titulo: "Apagar esta proposta?", texto: "Não dá para desfazer.", ok: "Apagar", icone: "lixo" }))) return; const { fb } = C; await fb.deleteDoc(fb.doc(fb.db, "parcerias", p.id)); D.parcerias = D.parcerias.filter((x) => x !== p); await registrar("parceria_apagar", p.email || p.nome, p.empresa || ""); toast("Proposta apagada"); fechar(); C.irPara("parcerias"); }));
    ac.append(btn("Fechar", "", fechar));
    if (pode("comercial")) ac.append(btn("Mudar etapa / notas", "pri", async () => { fechar(); await atualizarProposta(p); }));
    cx.appendChild(ac); fundo.appendChild(cx); document.body.appendChild(fundo);
    cx.querySelector(".ad-acoes .ad-bt.pri")?.focus();
  }
}

// ======================================================= VERIFICAÇÕES
export function verificacoes(el) {
  el.appendChild(cab("Verificações", "Pedidos de selo de perfil verificado. Confira se é quem diz ser antes de aprovar."));
  const pend = D.pendVerif.map(pessoa).filter((p) => !p.verificado).sort((a, b) => ms(a.solicitacaoVerificacaoEm) - ms(b.solicitacaoVerificacaoEm));
  const lista = h("div", "ad-lista");
  if (!pend.length) lista.appendChild(h("div", "ad-vazio", "Nenhum pedido de verificação esperando."));
  pend.forEach((p) => {
    const negs = D.negocios.filter((n) => n.donoId === p.uid);
    const den = D.denuncias.filter((d) => d.alvoId === p.uid).length;
    const c = h("article", "ad-item"); const top = h("div", "cab"); top.append(pessoaCel(p), h("span", "quando", `pediu ${relativo(p.solicitacaoVerificacaoEm)}`));
    c.append(top, h("div", "meta", `Conta desde ${data(p.criadoEm)} · ${negs.length} negócio(s) · ${den} denúncia(s) · último acesso ${relativo(p.ultimoAcesso)}`));
    const ac = h("div", "ad-acoes");
    ac.append(btn("Ver ficha", "", () => abrirFicha(p.uid)));
    if (pode("moderar")) ac.append(btn("Recusar", "perigo", async () => { const v = await modal({ titulo: "Recusar verificação", campos: [{ nome: "motivo", rotulo: "Motivo (a pessoa vai ver)", tipo: "textarea", obrigatorio: true }], botao: "Recusar" }); if (!v) return; await definirSelo(p.uid, false); await enviarAviso(p.uid, { titulo: "Pedido de verificação recusado", texto: v.motivo, tipo: "info" }); toast("Pedido recusado"); C.irPara("verificacoes"); }),
      btn("Aprovar", "pri", async () => { await definirSelo(p.uid, true); await enviarAviso(p.uid, { titulo: "Seu perfil foi verificado", texto: "Parabéns! Seu perfil agora tem o selo de verificado.", tipo: "info" }); toast("Perfil verificado"); C.irPara("verificacoes"); }));
    c.appendChild(ac); lista.appendChild(c);
  });
  el.appendChild(lista);
}

// ======================================================= ESTATÍSTICAS
let periodoEst = 30, compararEst = false, ufEst = "", cidadeEst = "", bairroEst = "";
export function estatisticas(el) {
  const ps = pessoas();
  if (!locaisProntos(ps)) {
    el.appendChild(h("div", "ad-vazio", "Organizando as cidades das contas…"));
    prepararLocais(ps).then(() => { if (el.isConnected) { el.replaceChildren(); estatisticas(el); } });
    return;
  }
  const { ini, fim, mensal, rotulo } = janela(periodoEst);
  const topo = h("div", "ad-cab-acoes");
  const cmp = h("button", "ad-chip", "Comparar com período anterior"); cmp.type = "button"; cmp.setAttribute("aria-pressed", String(compararEst));
  cmp.addEventListener("click", () => { compararEst = !compararEst; el.replaceChildren(); estatisticas(el); });
  topo.append(seletorPeriodo(periodoEst, (v) => { periodoEst = v; el.replaceChildren(); estatisticas(el); }), cmp, btn("Baixar tudo (Excel)", "", () => baixarPlanilhaMulti(`estatisticas-${typeof periodoEst === "object" ? "personalizado" : periodoEst + "d"}`, abas, capa)));
  el.appendChild(cab("Estatísticas", `Quem usa o Help Floripa, de onde, e como a plataforma cresce · ${rotulo}${compararEst ? " (comparando com o período anterior)" : ""}.`, topo));
  const g = h("div", "ad-grade");
  // Filtro em cascata Estado → Cidade → Bairro (opções e números vêm de todas as contas).
  const ufDe = (p) => localDe(p)?.uf || "";
  const cidDe = (p) => rotuloLocal(localDe(p));
  const baiDe = (p) => String(p.endereco?.bairro || "").trim() || null;
  const psUf = ps.filter((p) => !ufEst || ufDe(p) === ufEst);
  const psCid = psUf.filter((p) => !cidadeEst || cidDe(p) === cidadeEst);
  const psF = psCid.filter((p) => !bairroEst || baiDe(p) === bairroEst);
  const opt = (sel, v, t) => { const o = h("option", null, t); o.value = v; if (v === sel) o.selected = true; return o; };
  const refazer = () => { el.replaceChildren(); estatisticas(el); };
  const selUf = h("select", "ad-sel"); selUf.setAttribute("aria-label", "Filtrar por estado");
  selUf.append(opt(ufEst, "", "Todos os estados"), ...contarPor(ps, (p) => ufDe(p) || null).map(([u, n]) => opt(ufEst, u, `${NOME_UF[u] || u} (${n})`)));
  selUf.addEventListener("change", () => { ufEst = selUf.value; cidadeEst = ""; bairroEst = ""; refazer(); });
  const filtros = [selUf];
  if (ufEst) {
    const selCidade = h("select", "ad-sel"); selCidade.setAttribute("aria-label", "Filtrar por cidade");
    selCidade.append(opt(cidadeEst, "", "Todas as cidades"), ...contarPor(psUf, cidDe).map(([c, n]) => opt(cidadeEst, c, `${c} (${n})`)));
    selCidade.addEventListener("change", () => { cidadeEst = selCidade.value; bairroEst = ""; refazer(); });
    filtros.push(selCidade);
  }
  if (cidadeEst) {
    const selBairro = h("select", "ad-sel"); selBairro.setAttribute("aria-label", "Filtrar por bairro");
    selBairro.append(opt(bairroEst, "", "Todos os bairros"), ...contarPor(psCid, baiDe).map(([b, n]) => opt(bairroEst, b, `${b} (${n})`)));
    selBairro.addEventListener("change", () => { bairroEst = selBairro.value; refazer(); });
    filtros.push(selBairro);
  }
  filtros.reverse().forEach((f) => topo.insertBefore(f, topo.firstChild));
  // Cada cartão também vira uma aba do "Baixar tudo (Excel)"; a capa "Resumo" traz período, filtro e números principais.
  const abas = [];
  const addCartao = (o) => { abas.push({ nome: o.titulo, titulo: o.titulo, sub: o.sub, cabecalho: o.cabecalho, linhas: o.linhas, grafico: { tipo: o.grafico || "coluna", titulo: o.titulo }, total: o.total }); return cartao(o); };
  // Série do período e a mesma do período anterior (para comparar dia a dia / mês a mês).
  const dur = fim - ini;
  const entre = (lista, campo, a, b) => lista.filter((x) => dentro(x[campo], a, b)).length;
  const capa = {
    titulo: "Estatísticas do Help Floripa",
    descricao: "Quem usa o Help Floripa, de onde, e como a plataforma cresce",
    periodo: `${rotulo} (${new Date(ini).toLocaleDateString("pt-BR")} a ${new Date(fim).toLocaleDateString("pt-BR")})`,
    filtro: ufEst ? [`Estado: ${NOME_UF[ufEst] || ufEst}`, cidadeEst ? `Cidade: ${cidadeEst}` : "", bairroEst ? `Bairro: ${bairroEst}` : ""].filter(Boolean).join(" · ") : "Nenhum (Brasil todo)",
    autor: C.nome || "",
    indicadores: [
      ["Usuários (total)", psF.length, ""],
      ["Novos usuários", entre(psF, "criadoEm", ini, fim), entre(psF, "criadoEm", ini - dur, ini)],
      ["Ativos no período (último acesso)", entre(psF, "ultimoAcesso", ini, fim), entre(psF, "ultimoAcesso", ini - dur, ini)],
      ["Novos perfis de negócio", entre(D.negocios, "criadoEm", ini, fim), entre(D.negocios, "criadoEm", ini - dur, ini)],
      ["Publicações no Diário", entre(D.posts, "criadoEm", ini, fim), entre(D.posts, "criadoEm", ini - dur, ini)]
    ]
  };
  const serieComp = (datas, titulo, cor) => {
    const atual = serieEntre(datas, ini, fim, mensal);
    if (!compararEst) return addCartao({ titulo, cabecalho: [mensal ? "Mês" : "Dia", "Novos"], linhas: atual.map((p) => [p.rotulo, p.valor]), desenhar: (a) => linha(a, { pontos: atual, cor }), grafico: "linha" });
    const ant = serieEntre(datas, ini - dur, ini, mensal);
    const series = [{ nome: "Período atual", cor, valores: atual.map((p) => p.valor) }, { nome: "Período anterior", cor: "var(--viz-4)", valores: ant.map((p) => p.valor), tracejada: true }];
    const linhas = atual.map((p, i) => [p.rotulo, p.valor, ant[i]?.valor ?? 0]);
    return addCartao({ titulo, cabecalho: [mensal ? "Mês" : "Dia", "Atual", "Anterior"], linhas, desenhar: (a) => linhaComparada(a, { rotulos: atual.map((p) => p.rotulo), series }), grafico: "linha" });
  };
  const datasU = psF.map((p) => p.criadoEm);
  const serieU = serieEntre(datasU, ini, fim, mensal);
  const antes = psF.filter((p) => ms(p.criadoEm) && ms(p.criadoEm) < ini).length;
  const acum = acumulada(serieU, antes);
  g.appendChild(serieComp(datasU, `Novos usuários por ${mensal ? "mês" : "dia"}`, "var(--viz-1)"));
  g.appendChild(addCartao({ titulo: "Total de usuários", sub: "Crescimento acumulado", cabecalho: [mensal ? "Mês" : "Dia", "Total"], linhas: acum.map((p) => [p.rotulo, p.valor]), desenhar: (a) => linha(a, { pontos: acum, cor: "var(--viz-3)" }), nomeArquivo: "total-usuarios", grafico: "linha", total: false }));
  // atividade
  const faixasAc = [["Hoje", 1], ["2 a 7 dias", 7], ["8 a 30 dias", 30], ["31 a 90 dias", 90], ["Mais de 90 dias", Infinity]];
  let ant = 0; const ac = faixasAc.map(([rot, d]) => { const v = psF.filter((p) => { const x = ms(p.ultimoAcesso); if (!x) return false; const dias = (agora() - x) / DIA; return dias <= d && dias > ant; }).length; ant = d; return { rotulo: rot, valor: v }; });
  ac.push({ rotulo: "Sem registro", valor: psF.filter((p) => !ms(p.ultimoAcesso)).length });
  g.appendChild(addCartao({ titulo: "Último acesso", sub: "Quem voltou ao site e quando (\"sem registro\" inclui quem esconde o online)", cabecalho: ["Último acesso", "Pessoas"], linhas: ac.map((x) => [x.rotulo, x.valor]), desenhar: (a) => barras(a, { itens: ac }), nomeArquivo: "ultimo-acesso" }));
  // idades
  const ids = psF.map((p) => idade(p.dataNascimento));
  const fx = [["16–17", 16, 17], ["18–24", 18, 24], ["25–34", 25, 34], ["35–44", 35, 44], ["45–54", 45, 54], ["55–64", 55, 64], ["65+", 65, 200]].map(([rotulo, a, b]) => ({ rotulo, valor: ids.filter((i) => i != null && i >= a && i <= b).length }));
  const comIdade = ids.filter((i) => i != null).sort((a, b) => a - b);
  const mediana = comIdade.length ? comIdade[Math.floor(comIdade.length / 2)] : 0;
  g.appendChild(addCartao({ titulo: "Faixa etária", sub: comIdade.length ? `Idade média ${(comIdade.reduce((a, b) => a + b, 0) / comIdade.length).toFixed(0)} · mediana ${mediana} · ${psF.length - comIdade.length} sem data` : "Sem datas de nascimento", cabecalho: ["Faixa", "Pessoas"], linhas: fx.map((x) => [x.rotulo, x.valor]), desenhar: (a) => barras(a, { itens: fx }), nomeArquivo: "faixa-etaria" }));
  // regiões
  const estados = contarPor(psF, (p) => ufDe(p) || null).map(([u, n]) => [`${NOME_UF[u] || u} (${u})`, n]);
  const semUf = psF.filter((p) => !ufDe(p)).length;
  const topE = estados.slice(0, 9).map(([rotulo, valor]) => ({ rotulo, valor })); const outrosE = estados.slice(9).reduce((a, [, v]) => a + v, 0); if (outrosE) topE.push({ rotulo: "Outros", valor: outrosE });
  g.appendChild(addCartao({ titulo: "Estados", sub: semUf ? `${semUf} sem estado informado` : "Todas as contas com estado", cabecalho: ["Estado", "Pessoas"], linhas: estados, desenhar: (a) => barras(a, { itens: topE, horizontal: true, cor: "var(--viz-2)" }), nomeArquivo: "estados", grafico: "barra" }));
  const cid = contarPor(psF, cidDe);
  const topC = cid.slice(0, 9).map(([rotulo, valor]) => ({ rotulo, valor })); const outrasC = cid.slice(9).reduce((a, [, v]) => a + v, 0); if (outrasC) topC.push({ rotulo: "Outras", valor: outrasC });
  g.appendChild(addCartao({ titulo: "Cidades", sub: `${psF.filter((p) => !cidDe(p)).length} sem cidade informada`, cabecalho: ["Cidade", "Pessoas"], linhas: cid.map(([a, b]) => [a, b]), desenhar: (a) => barras(a, { itens: topC, horizontal: true }), nomeArquivo: "cidades", grafico: "barra" }));
  const bai = contarPor(psF, baiDe);
  const topB = bai.slice(0, 10).map(([rotulo, valor]) => ({ rotulo, valor }));
  g.appendChild(addCartao({ titulo: "Bairros", sub: "Só de quem salvou endereço nas configurações", cabecalho: ["Bairro", "Pessoas"], linhas: bai.map(([a, b]) => [a, b]), desenhar: (a) => barras(a, { itens: topB, horizontal: true, cor: "var(--viz-3)" }), nomeArquivo: "bairros", grafico: "barra" }));
  // público
  const donos = new Set(D.negocios.map((n) => n.donoId));
  const pub = [{ rotulo: "Só clientes", valor: psF.filter((p) => !donos.has(p.uid)).length }, { rotulo: "Têm negócio", valor: psF.filter((p) => donos.has(p.uid)).length, cor: "var(--viz-2)" }];
  g.appendChild(addCartao({ titulo: "Público", sub: "Clientes x quem anuncia", cabecalho: ["Grupo", "Pessoas"], linhas: pub.map((x) => [x.rotulo, x.valor]), desenhar: (a) => barras(a, { itens: pub }), nomeArquivo: "publico" }));
  const neg = Object.entries(TIPOS_NEG).map(([k2, rot], i) => ({ rotulo: rot, valor: D.negocios.filter((n) => noPeriodoP(n.criadoEm || n.atualizadoEm, periodoEst)).filter((n) => n.tipo === k2).length, cor: `var(--viz-${i + 1})` }));
  g.appendChild(addCartao({ titulo: "Novos negócios no período", cabecalho: ["Tipo", "Novos"], linhas: neg.map((x) => [x.rotulo, x.valor]), desenhar: (a) => barras(a, { itens: neg }), nomeArquivo: "novos-negocios" }));
  // conteúdo
  g.appendChild(serieComp(D.posts.map((pp) => pp.criadoEm), `Publicações no Diário por ${mensal ? "mês" : "dia"}`, "var(--viz-2)"));
  // notas
  const negNotas = [...D.notas.entries()].filter(([k2]) => k2.startsWith("neg_")).map(([, v]) => v);
  const est = [5, 4, 3, 2, 1].map((n) => ({ rotulo: `${n}★`, valor: negNotas.reduce((a, b) => a + (b["n" + n] || 0), 0), cor: n >= 4 ? "var(--viz-3)" : n === 3 ? "var(--viz-4)" : "var(--viz-2)" }));
  g.appendChild(addCartao({ titulo: "Distribuição das notas", sub: "Avaliações de negócios", cabecalho: ["Nota", "Avaliações"], linhas: est.map((x) => [x.rotulo, x.valor]), desenhar: (a) => barras(a, { itens: est }), nomeArquivo: "notas" }));
  // privacidade
  const priv = [{ rotulo: "Online visível", valor: psF.filter((p) => p.privacidade?.mostrarOnline !== false).length }, { rotulo: "Online oculto", valor: psF.filter((p) => p.privacidade?.mostrarOnline === false).length, cor: "var(--viz-4)" }];
  g.appendChild(addCartao({ titulo: "Preferência de privacidade", sub: "Quem mostra quando está online", cabecalho: ["Preferência", "Pessoas"], linhas: priv.map((x) => [x.rotulo, x.valor]), desenhar: (a) => barras(a, { itens: priv }), nomeArquivo: "privacidade" }));
  // histórico automático
  if (D.estatisticas.length) {
    const s = [...D.estatisticas].sort((a, b) => a.id.localeCompare(b.id)).map((x) => ({ rotulo: x.id.slice(5).split("-").reverse().join("/"), valor: x.ativos1 || 0 }));
    g.appendChild(addCartao({ titulo: "Ativos por dia (histórico)", sub: "Do relatório automático diário", cabecalho: ["Dia", "Ativos (24 h)"], linhas: s.map((p) => [p.rotulo, p.valor]), desenhar: (a) => linha(a, { pontos: s, cor: "var(--viz-3)" }), largo: true, nomeArquivo: "ativos-historico", grafico: "linha", total: false }));
  }
  el.appendChild(g);
}

// ======================================================= COMUNICADOS
export function comunicados(el) {
  const novo = pode("moderar") ? btn("Novo comunicado", "pri", () => editar(null)) : null;
  el.appendChild(cab("Comunicados", "Faixa que aparece no início do site para todos (manutenção, novidades, avisos).", novo));
  const lista = h("div", "ad-lista");
  if (!D.comunicados.length) lista.appendChild(h("div", "ad-vazio", "Nenhum comunicado criado."));
  [...D.comunicados].sort((a, b) => ms(b.em) - ms(a.em)).forEach((c) => {
    const it = h("article", "ad-item"); const top = h("div", "cab");
    const vivo = c.ativo && (!c.ate || ms(c.ate) > agora());
    top.append(selo(vivo ? "No ar" : "Fora do ar", vivo ? "bom" : "neutro"), selo({ info: "Informativo", novidade: "Novidade", alerta: "Alerta" }[c.tipo] || c.tipo, "info"), h("span", "quando", dataHora(c.em)));
    // Prévia: do jeito que aparece no início do site.
    const prev = cartaoComunicado(c); prev.style.margin = "4px 0 2px"; prev.style.animation = "none";
    it.append(top, prev);
    if (c.ate) it.appendChild(h("div", "meta", `Sai do ar em ${dataHora(c.ate)}`));
    const ac = h("div", "ad-acoes"); if (pode("moderar")) ac.append(btn("Editar", "", () => editar(c)), btn(c.ativo ? "Tirar do ar" : "Colocar no ar", "", async () => { const { fb } = C; await fb.updateDoc(fb.doc(fb.db, "comunicados", c.id), { ...limpo(c), ativo: !c.ativo, por: C.eu.uid }); c.ativo = !c.ativo; await registrar("comunicado_" + (c.ativo ? "on" : "off"), "", c.titulo); C.irPara("comunicados"); }), btn("Apagar", "perigo", async () => { if (!(await confirmarHF({ titulo: "Apagar este comunicado?", texto: "Ele sai do ar e não dá para desfazer.", ok: "Apagar", icone: "lixo" }))) return; const { fb } = C; await fb.deleteDoc(fb.doc(fb.db, "comunicados", c.id)); D.comunicados = D.comunicados.filter((x) => x !== c); await registrar("comunicado_apagar", "", c.titulo); C.irPara("comunicados"); }));
    it.appendChild(ac); lista.appendChild(it);
  });
  el.appendChild(lista);
  function limpo(c) { const o = { titulo: c.titulo, texto: c.texto || "", tipo: c.tipo, ativo: !!c.ativo, por: C.eu.uid, em: c.em }; if (c.link) o.link = c.link; if (c.ate) o.ate = c.ate; return o; }
  async function editar(c) {
    const v = await modal({ titulo: c ? "Editar comunicado" : "Novo comunicado", campos: [
      { nome: "titulo", rotulo: "Título", max: 120, obrigatorio: true, valor: c?.titulo }, { nome: "texto", rotulo: "Texto", tipo: "textarea", max: 600, valor: c?.texto },
      { nome: "tipo", rotulo: "Tipo", tipo: "select", opcoes: [["novidade", "Novidade"], ["info", "Informativo"], ["alerta", "Alerta (manutenção, golpe circulando...)"]], valor: c?.tipo || "novidade" },
      { nome: "link", rotulo: "Link (opcional)", valor: c?.link || "", dica: "ex.: ajuda.html" },
      { nome: "dias", rotulo: "Ficar no ar por", tipo: "select", opcoes: [...(c?.ate && ms(c.ate) > agora() ? [["manter", `Manter o prazo atual (até ${dataHora(c.ate)})`]] : []), ["0", "Até eu tirar"], ["1", "1 dia"], ["3", "3 dias"], ["7", "7 dias"], ["30", "30 dias"]], valor: c?.ate && ms(c.ate) > agora() ? "manter" : "0" }
    ], botao: "Salvar e colocar no ar" });
    if (!v) return;
    const { fb } = C;
    const dados = { titulo: v.titulo, texto: v.texto, tipo: v.tipo, ativo: true, por: C.eu.uid, em: fb.serverTimestamp() };
    if (v.link && /^[\w./?=&#-]+$/.test(v.link) && !/^\/\//.test(v.link)) dados.link = v.link;
    if (v.dias === "manter") dados.ate = c.ate;
    else if (Number(v.dias)) dados.ate = fb.Timestamp.fromDate(new Date(agora() + Number(v.dias) * DIA));
    if (c) await fb.setDoc(fb.doc(fb.db, "comunicados", c.id), dados); else await fb.addDoc(fb.collection(fb.db, "comunicados"), dados);
    await registrar(c ? "comunicado_editar" : "comunicado_novo", "", v.titulo); toast("Comunicado no ar"); await C.recarregar(false); C.irPara("comunicados");
  }
}

// ======================================================= RELATÓRIOS
let periodoRel = 30;
export function relatorios(el) {
  const { ini, fim, dias, mensal, rotulo } = janela(periodoRel);
  el.appendChild(cab("Relatórios", `Resumo do período para imprimir, salvar em PDF ou baixar em Excel (com gráfico) · ${rotulo}.`, seletorPeriodo(periodoRel, (v) => { periodoRel = v; el.replaceChildren(); relatorios(el); })));
  const ps = pessoas();
  const noP = (t, ant) => noPeriodoP(t, periodoRel, ant);
  // Indicadores do período x o período anterior de mesmo tamanho.
  const linhas = [
    ["Usuários no fim do período", ps.length, ""],
    ["Novos usuários", ps.filter((p) => noP(p.criadoEm)).length, ps.filter((p) => noP(p.criadoEm, true)).length],
    ["Ativos no período (último acesso)", ps.filter((p) => dentro(p.ultimoAcesso, ini, fim)).length, ps.filter((p) => dentro(p.ultimoAcesso, ini - (fim - ini), ini)).length],
    ["Novos perfis de negócio", D.negocios.filter((n) => noP(n.criadoEm)).length, D.negocios.filter((n) => noP(n.criadoEm, true)).length],
    ["Novos anúncios de imóvel", D.anuncios.filter((a) => noP(a.criadoEm)).length, D.anuncios.filter((a) => noP(a.criadoEm, true)).length],
    ["Publicações no Diário", D.posts.filter((p) => noP(p.criadoEm)).length, D.posts.filter((p) => noP(p.criadoEm, true)).length],
    ["Reclamações abertas", D.queixas.filter((q) => noP(q.abertaEm)).length, D.queixas.filter((q) => noP(q.abertaEm, true)).length],
    ["Reclamações resolvidas", D.queixas.filter((q) => noP(q.resolvidaEm)).length, D.queixas.filter((q) => noP(q.resolvidaEm, true)).length],
    ["Denúncias recebidas", D.denuncias.filter((x) => noP(x.criadoEm)).length, D.denuncias.filter((x) => noP(x.criadoEm, true)).length],
    ["Denúncias resolvidas", D.denuncias.filter((x) => x.status === "resolvida" && noP(x.analisadaEm)).length, D.denuncias.filter((x) => x.status === "resolvida" && noP(x.analisadaEm, true)).length],
    ["Chamados de suporte", D.suporte.filter((s) => noP(s.criadoEm)).length, D.suporte.filter((s) => noP(s.criadoEm, true)).length],
    ["Propostas de parceria", D.parcerias.filter((p) => noP(p.criadoEm)).length, D.parcerias.filter((p) => noP(p.criadoEm, true)).length],
    ["Sanções aplicadas", [...D.sancoes.values()].flatMap((s) => s.historico || []).filter((x) => x.tipo !== "removida" && dentro(Date.parse(x.em), ini, fim)).length, [...D.sancoes.values()].flatMap((s) => s.historico || []).filter((x) => x.tipo !== "removida" && dentro(Date.parse(x.em), ini - (fim - ini), ini)).length]
  ];
  // Destaques do período (com a seta de comparação).
  const kp = h("div", "ad-kpis");
  const kpi = (rot, i) => { const [, atual, antes] = linhas[i]; kp.appendChild(destaque({ rotulo: rot, valor: atual, antes: typeof antes === "number" ? antes : null })); };
  kpi("Novos usuários", 1); kpi("Novos negócios", 3); kpi("Publicações", 5); kpi("Reclamações abertas", 6); kpi("Chamados", 10); kpi("Propostas", 11);
  el.appendChild(kp);
  // Gráficos do período.
  const g = h("div", "ad-grade");
  // "Baixar tudo": capa "Resumo" com todos os indicadores (e a variação) + uma aba por gráfico.
  const abas = [];
  const capa = {
    titulo: "Relatório Help Floripa",
    descricao: "Resumo do período: crescimento, negócios, moderação e contato",
    periodo: `${rotulo} (${new Date(ini).toLocaleDateString("pt-BR")} a ${new Date(fim).toLocaleDateString("pt-BR")})`,
    filtro: "Nenhum (plataforma inteira)",
    autor: C.nome || "",
    indicadores: linhas
  };
  const addCartao = (o) => { abas.push({ nome: o.titulo, titulo: o.titulo, sub: o.sub, cabecalho: o.cabecalho, linhas: o.linhas, grafico: { tipo: o.grafico || "coluna", titulo: o.titulo }, total: o.total }); return cartao(o); };
  const serieU = serieEntre(ps.map((p) => p.criadoEm), ini, fim, mensal);
  g.appendChild(addCartao({ titulo: `Novos usuários por ${mensal ? "mês" : "dia"}`, cabecalho: [mensal ? "Mês" : "Dia", "Novos"], linhas: serieU.map((p) => [p.rotulo, p.valor]), desenhar: (a) => linha(a, { pontos: serieU }), nomeArquivo: "novos-usuarios", grafico: "linha" }));
  const negTipo = Object.entries(TIPOS_NEG).map(([k, rot], i) => ({ rotulo: rot, valor: D.negocios.filter((n) => noP(n.criadoEm)).filter((n) => n.tipo === k).length, cor: `var(--viz-${i + 1})` }));
  g.appendChild(addCartao({ titulo: "Novos negócios por tipo", sub: "No período", cabecalho: ["Tipo", "Novos"], linhas: negTipo.map((x) => [x.rotulo, x.valor]), desenhar: (a) => barras(a, { itens: negTipo }), nomeArquivo: "novos-negocios-periodo" }));
  const mov = [["Reclamações", 6, "var(--viz-2)"], ["Denúncias", 8, "var(--viz-4)"], ["Chamados", 10, "var(--viz-1)"], ["Parcerias", 11, "var(--viz-3)"]].map(([rot, i, cor]) => ({ rotulo: rot, valor: linhas[i][1], cor }));
  g.appendChild(addCartao({ titulo: "Moderação e contato no período", cabecalho: ["Área", "No período"], linhas: mov.map((x) => [x.rotulo, x.valor]), desenhar: (a) => barras(a, { itens: mov }), nomeArquivo: "moderacao-periodo" }));
  el.appendChild(g);
  const rel = h("div", "ad-relatorio");
  rel.append(h("h2", null, "Relatório Help Floripa"), h("p", null, `Período: ${rotulo} (${new Date(ini).toLocaleDateString("pt-BR")} a ${new Date(fim).toLocaleDateString("pt-BR")}) · gerado em ${new Date().toLocaleString("pt-BR")} por ${C.nome}`));
  const t = document.createElement("table"); const th = h("tr"); ["Indicador", "Período", "Período anterior"].forEach((x) => th.appendChild(h("th", null, x)));
  t.appendChild(th); linhas.forEach((l) => { const tr = h("tr"); l.forEach((x) => tr.appendChild(h("td", null, x === "" ? "—" : typeof x === "number" ? num(x) : x))); t.appendChild(tr); });
  rel.appendChild(t);
  const topCid = contarPor(ps.filter((p) => noP(p.criadoEm)), (p) => nomeCidade(p.cidade) || null).slice(0, 5);
  if (topCid.length) rel.appendChild(h("p", null, `Cidades dos novos usuários: ${topCid.map(([c, n]) => `${c} (${n})`).join(", ")}.`));
  const ac = h("div", "ad-acoes"); ac.style.margin = "14px 0";
  const nomeP = typeof periodoRel === "object" ? "personalizado" : periodoRel + "d";
  ac.append(btn("Imprimir / salvar PDF", "pri", () => { registrar("relatorio_pdf", "", rotulo); window.print(); }),
    btn("Baixar tudo (Excel)", "pri", () => baixarPlanilhaMulti(`relatorio-${nomeP}`, abas, capa)),
    btn("Baixar resumo (Excel)", "", () => baixarCSV(`relatorio-${nomeP}`, ["Indicador", "Período", "Período anterior"], linhas, { tipo: "coluna", titulo: `Relatório Help Floripa — ${rotulo}` })),
    btn("Planilha de negócios", "", () => { baixarCSV("negocios", ["ID", "Nome", "Tipo", "Dono", "Cidade", "Nota", "Avaliações", "Criado", "Atualizado"], D.negocios.map((n) => { const r = D.notas.get("neg_" + n.id); return [n.id, n.nome || "", TIPOS_NEG[n.tipo] || n.tipo, pessoa(n.donoId).nome || n.donoId, nomeCidade(n.cidade), r?.total ? (r.soma / r.total).toFixed(2) : "", r?.total || 0, data(n.criadoEm), data(n.atualizadoEm)]; })); registrar("exportar", "negocios"); }),
    btn("Planilha de denúncias", "", () => { baixarCSV("denuncias", ["Data", "Tipo", "Motivo", "Denunciado", "Por", "Situação", "Ação", "Trecho"], D.denuncias.map((x) => [dataHora(x.criadoEm), x.tipo, MOTIVOS_DEN[x.motivo] || x.motivo, pessoa(x.alvoId).nome || x.alvoId, pessoa(x.autorId).nome || x.autorId, x.status, x.acao || "", x.trecho || ""])); registrar("exportar", "denuncias"); }),
    btn("Planilha de reclamações", "", () => { baixarCSV("reclamacoes", ["Aberta", "Cliente", "Negócio", "Motivo", "Situação", "Respondida", "Relato"], D.queixas.map((q) => [data(q.abertaEm), pessoa(q.autorId).nome || "", q.negocioNome || q.negocioId, MOTIVOS_QX[q.motivo] || q.motivo, q.status, q.resposta ? "sim" : "não", q.texto || ""])); registrar("exportar", "reclamacoes"); }));
  el.append(ac, rel);
  const auto = bloco("Relatórios automáticos", D.estatisticas.length ? `${D.estatisticas.length} dias guardados pelo relatório diário (GitHub Actions).` : "Ainda não há relatórios automáticos. Eles começam quando a tarefa diária do GitHub estiver configurada (o mesmo segredo da limpeza de contas).");
  auto.style.marginTop = "14px";
  if (D.estatisticas.length) {
    const tt = h("div", "ad-tabela"); const tb = document.createElement("table"); const hr = h("tr"); ["Dia", "Usuários", "Novos", "Ativos 24 h", "Ativos 7 d", "Negócios", "Publicações", "Denúncias novas", "Reclamações abertas"].forEach((x) => hr.appendChild(h("th", null, x))); tb.appendChild(hr);
    [...D.estatisticas].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 60).forEach((x) => { const tr = h("tr"); [x.id.split("-").reverse().join("/"), x.usuarios, x.novos, x.ativos1, x.ativos7, x.negocios, x.publicacoes, x.denunciasNovas, x.reclamacoesAbertas].forEach((v) => tr.appendChild(h("td", null, v == null ? "—" : num(v)))); tb.appendChild(tr); });
    tt.appendChild(tb); auto.appendChild(tt);
    const csv = btn("Baixar histórico (Excel)", "", () => baixarCSV("historico-diario", ["Dia", "Usuários", "Novos", "Ativos 24h", "Ativos 7d", "Negócios", "Publicações", "Denúncias novas", "Reclamações abertas"], [...D.estatisticas].sort((a, b) => a.id.localeCompare(b.id)).map((x) => [x.id, x.usuarios, x.novos, x.ativos1, x.ativos7, x.negocios, x.publicacoes, x.denunciasNovas, x.reclamacoesAbertas]), { tipo: "linha", titulo: "Crescimento diário do Help Floripa" }));
    csv.style.marginTop = "10px"; auto.appendChild(csv);
  }
  el.appendChild(auto);
}

// ======================================================= REGISTRO E EQUIPE
const NOMES_ACAO = { aviso: "Enviou aviso", suspender: "Suspendeu", banir: "Baniu", remover_sancao: "Removeu sanção", verificar: "Deu selo", tirar_selo: "Tirou/recusou selo", remover_conteudo: "Removeu conteúdo", esconder_negocio: "Escondeu negócio", mostrar_negocio: "Mostrou negócio", esconder_publicacao: "Escondeu publicação", mostrar_publicacao: "Mostrou publicação", exportar: "Exportou dados", relatorio_pdf: "Gerou relatório", parceria: "Atualizou parceria", parceria_apagar: "Apagou parceria", suporte_resposta: "Respondeu chamado", suporte_conversa: "Abriu conversa de suporte", suporte_fechado: "Fechou chamado", suporte_aberto: "Reabriu chamado", reporte_novo: "Reportou pessoa do suporte", cobrar_reclamacao: "Cobrou resposta de reclamação", reporte_em_analise: "Pôs reporte em análise", reporte_resolvido: "Resolveu reporte", reporte_descartado: "Descartou reporte", comunicado_novo: "Criou comunicado", comunicado_editar: "Editou comunicado", comunicado_on: "Pôs comunicado no ar", comunicado_off: "Tirou comunicado do ar", comunicado_apagar: "Apagou comunicado", denuncia_resolvida: "Resolveu denúncia", denuncia_descartada: "Descartou denúncia", denuncia_em_analise: "Pôs denúncia em análise", assumiu: "Assumiu", passou: "Passou para outra pessoa", liberou: "Liberou", tarefa_nova: "Criou tarefa", tarefa_editar: "Editou tarefa", tarefa_a_fazer: "Voltou tarefa", tarefa_fazendo: "Começou tarefa", tarefa_feito: "Concluiu tarefa", tarefa_apagar: "Apagou tarefa", nota_interna: "Escreveu nota interna", entrou: "Entrou no painel" };
// Alvo do registro em texto de gente: a pessoa (link para a ficha), ou o item que a equipe assumiu/passou
// ("suporte:ID" vira "Chamado #ABC123 · assunto", "denuncias:..." vira "Denúncia · motivo · pessoa"), ou a lista exportada.
const LISTAS_EXPORT = { usuarios: "Lista de usuários", negocios: "Lista de negócios", denuncias: "Lista de denúncias", reclamacoes: "Lista de reclamações" };
function alvoLegivel(x) {
  const a = String(x.alvo || "");
  if (!a) return { texto: "—" };
  if (D.pessoas.has(a)) return { texto: pessoa(a).nome || "Conta", uid: a };
  const [col, id] = a.includes(":") ? [a.slice(0, a.indexOf(":")), a.slice(a.indexOf(":") + 1)] : ["", ""];
  if (col === "suporte") { const c = D.suporte.find((s) => s.id === id); return { texto: `Chamado ${protocolo(id)}${c ? " · " + c.assunto : ""}`, sub: c ? pessoa(c.uid).nome || c.nome || "" : "", ir: "suporte" }; }
  if (col === "denuncias" || col === "denuncia") { const d = D.denuncias.find((z) => z.id === id); const tipo = (id.split("_")[0] || "").replace(/^\w/, (l) => l.toUpperCase()); return { texto: `Denúncia${tipo ? " de " + tipo.toLowerCase() : ""}${d ? " · " + (MOTIVOS_DEN[d.motivo] || d.motivo) : ""}`, sub: d ? `contra ${pessoa(d.alvoId).nome || "conta"}` : "", ir: "denuncias" }; }
  if (col === "parcerias" || col === "parceria") { const pp = D.parcerias.find((z) => z.id === id); return { texto: `Proposta${pp ? " · " + (pp.empresa || pp.nome) : ""}`, ir: "parcerias" }; }
  if (col === "reportes") return { texto: "Reporte do suporte", ir: "denuncias:reportes" };
  if (LISTAS_EXPORT[a]) return { texto: LISTAS_EXPORT[a] };
  if (/^[A-Za-z0-9]{20,40}$/.test(a)) return { texto: "Conta não carregada", sub: "ID " + a.slice(0, 6) + "…", uid: a };
  if (/@/.test(a)) return { texto: a };
  return { texto: a.length > 40 ? a.slice(0, 38) + "…" : a };
}
export function registro(el) {
  const excel = btn("Baixar Excel", "", () => { const l = filtrar(); baixarCSV("registro-equipe", ["Quando", "Quem", "Ação", "Alvo", "Detalhe"], l.map((x) => [dataHora(x.em), x.porNome || nomeEquipe(x.por), NOMES_ACAO[x.acao] || x.acao, alvoLegivel(x).texto, x.detalhe || ""])); });
  el.appendChild(cab("Registro de ações", "Tudo o que a equipe faz no painel fica aqui. Não pode ser apagado.", excel));
  const linhaF = h("div", "ad-acoes"); linhaF.style.marginBottom = "12px";
  const selQuem = document.createElement("select"); selQuem.className = "ad-sel"; selQuem.setAttribute("aria-label", "Filtrar por pessoa da equipe");
  selQuem.append(new Option("Toda a equipe", ""), ...[...new Set(D.log.map((x) => x.por))].map((uid) => new Option(nomeEquipe(uid), uid)));
  const selAcao = document.createElement("select"); selAcao.className = "ad-sel"; selAcao.setAttribute("aria-label", "Filtrar por ação");
  selAcao.append(new Option("Todas as ações", ""), ...[...new Set(D.log.map((x) => x.acao))].sort().map((a) => new Option(NOMES_ACAO[a] || a, a)));
  const busca = document.createElement("input"); busca.type = "search"; busca.className = "ad-sel"; busca.placeholder = "Buscar no detalhe ou alvo"; busca.setAttribute("aria-label", "Buscar no registro");
  linhaF.append(selQuem, selAcao, busca); el.appendChild(linhaF);
  const info = h("p"); info.style.color = "var(--muted)"; const tab = h("div", "ad-tabela"); el.append(info, tab);
  function filtrar() {
    const t = busca.value.trim().toLowerCase();
    return D.log.filter((x) => (!selQuem.value || x.por === selQuem.value) && (!selAcao.value || x.acao === selAcao.value) && (!t || [x.detalhe, x.alvo, alvoLegivel(x).texto].some((v) => String(v || "").toLowerCase().includes(t))));
  }
  function pintar() {
    const l = filtrar(); info.textContent = `${num(l.length)} ${l.length === 1 ? "ação" : "ações"} (últimas 300 carregadas)`;
    const t = document.createElement("table"); const th = h("tr"); ["Quando", "Quem", "Ação", "Alvo", "Detalhe"].forEach((x) => th.appendChild(h("th", null, x))); t.appendChild(th);
    l.forEach((x) => {
      const tr = h("tr"); const alvo = h("td"); alvo.dataset.rot = "Alvo";
      const r = alvoLegivel(x);
      if (r.uid || r.ir) { const ln = h("a", null, r.texto); ln.href = "#"; ln.addEventListener("click", (e) => { e.preventDefault(); if (r.uid) abrirFicha(r.uid); else C.irPara(r.ir); }); alvo.appendChild(ln); }
      else alvo.appendChild(h("span", null, r.texto));
      if (r.sub) alvo.appendChild(h("small", "ad-alvo-sub", r.sub));
      const c1 = h("td", "ad-reg-quando", dataHora(x.em)), c2 = h("td", "ad-reg-quem", x.porNome || nomeEquipe(x.por)), c3 = h("td", "ad-reg-acao", NOMES_ACAO[x.acao] || x.acao), c5 = h("td", "ad-reg-det", x.detalhe || "");
      c1.dataset.rot = "Quando"; c2.dataset.rot = "Quem"; c3.dataset.rot = "Ação"; c5.dataset.rot = "Detalhe";
      tr.append(c1, c2, c3, alvo, c5); t.appendChild(tr);
    });
    tab.classList.add("ad-registro");
    tab.replaceChildren(l.length ? t : h("div", "ad-vazio", "Nenhuma ação com esses filtros."));
  }
  [selQuem, selAcao].forEach((e) => e.addEventListener("change", pintar)); let tempo; busca.addEventListener("input", () => { clearTimeout(tempo); tempo = setTimeout(pintar, 200); });
  pintar();
}
export function equipe(el) {
  el.appendChild(cab("Equipe e chat", "Converse com todos ou com cada pessoa da equipe. Dá para mandar foto, arquivo e áudio."));
  // "Como adicionar alguém à equipe" abre pelo ⓘ do chat (no celular o chat ocupa a tela toda).
  C.infoEquipe = () => {
    const fundo = h("div", "ad-modal-fundo"), cx = h("div", "ad-modal"); cx.setAttribute("role", "dialog"); cx.setAttribute("aria-modal", "true");
    cx.append(h("h3", null, "Adicionar alguém à equipe"), h("p", null, "Por segurança, só pelo console do Firebase (ninguém consegue se dar acesso pelo site)."));
    const ol = h("ol"); ol.style.color = "var(--muted)"; ol.style.margin = "0"; ol.style.paddingLeft = "20px";
    ["Abra a ficha da pessoa aqui no painel e copie o ID da conta.", "No Firebase → Firestore Database → coleção admins → Adicionar documento.", "Use o ID copiado como ID do documento e crie o campo nome (texto).", "Opcional: crie o campo papel (texto) com moderacao, suporte ou comercial. Sem esse campo a pessoa tem acesso total (dono).", "Para tirar o acesso, apague o documento."].forEach((x) => ol.appendChild(h("li", null, x)));
    const tp = h("div", "ad-papeis"); Object.entries(PAPEIS).forEach(([k, v]) => { const d = h("div"); d.append(h("b", null, `${v}${k === "dono" ? "" : ` (papel: ${k})`}`), h("span", null, DESC_PAPEIS[k])); tp.appendChild(d); });
    const ac = h("div", "ad-acoes"); const ok = h("button", "ad-bt pri", "Fechar"); ok.type = "button"; ac.appendChild(ok);
    cx.append(ol, tp, ac); fundo.appendChild(cx); document.body.appendChild(fundo);
    const fechar = () => { fundo.remove(); document.removeEventListener("keydown", tecla, true); };
    const tecla = (e) => { if (e.key === "Escape") { e.stopPropagation(); fechar(); } };
    document.addEventListener("keydown", tecla, true);
    ok.addEventListener("click", fechar); fundo.addEventListener("click", (e) => { if (e.target === fundo) fechar(); }); ok.focus();
  };
  montarChat(el);
}

// ======================================================= TAREFAS DA EQUIPE
let filtroTar = "todas";
export function tarefas(el) {
  el.appendChild(cab("Tarefas da equipe", "Quem faz o quê. Cada tarefa anda pelas colunas: A fazer → Fazendo → Feito.", btn("Nova tarefa", "pri", async () => { await editarTarefa(); })));
  const fil = chips([["todas", "Todas"], ["minhas", "Minhas"], ["livres", "Sem responsável"], ["atrasadas", "Atrasadas"]], filtroTar, (v) => { filtroTar = v; pintar(); });
  fil.style.marginBottom = "12px";
  const k = h("div", "ad-kanban tres"); el.append(fil, k);
  const COLS = [["a_fazer", "A fazer"], ["fazendo", "Fazendo"], ["feito", "Feito"]];
  const ORD = { urgente: 0, alta: 1, normal: 2, baixa: 3 };
  const atrasada = (t) => t.status !== "feito" && ms(t.prazo) && ms(t.prazo) < agora();
  function pintar() {
    if (!el.isConnected) { C.aoMudarTarefas = null; return; }
    const l = C.tarefas.filter((t) => filtroTar === "todas" || (filtroTar === "minhas" ? t.responsavel === C.eu.uid : filtroTar === "livres" ? !t.responsavel : atrasada(t)));
    k.replaceChildren(...COLS.map(([st, rot], i) => {
      const itens = l.filter((t) => t.status === st).sort((a, b) => st === "feito" ? ms(b.concluidaEm || b.atualizadoEm) - ms(a.concluidaEm || a.atualizadoEm) : (ORD[a.prioridade] - ORD[b.prioridade]) || ((ms(a.prazo) || 9e15) - (ms(b.prazo) || 9e15)));
      const col = h("div", "ad-coluna"); const t4 = h("h4"); t4.append(h("span", null, rot), h("span", null, String(itens.length))); col.appendChild(t4);
      (st === "feito" ? itens.slice(0, 30) : itens).forEach((t) => {
        const c = h("article", "ad-item ad-tarefa pr-" + t.prioridade + (atrasada(t) ? " atrasada" : ""));
        const top = h("div", "cab"); top.append(selo(PRIORIDADES[t.prioridade] || t.prioridade, t.prioridade === "urgente" ? "critico" : t.prioridade === "alta" ? "serio" : "neutro"), seloResp(t));
        if (ms(t.prazo)) top.append(selo(`${atrasada(t) ? "Atrasada · " : ""}até ${data(t.prazo)}`, atrasada(t) ? "critico" : "neutro"));
        c.append(top, h("strong", null, t.titulo));
        if (t.descricao) c.appendChild(h("div", "meta", t.descricao.length > 180 ? t.descricao.slice(0, 180) + "…" : t.descricao));
        if (t.ligacao) { const a = h("a", "ad-link", `Sobre: ${t.ligacaoNome || t.ligacao}`); a.href = "#"; a.addEventListener("click", (e) => { e.preventDefault(); const [tipo, id] = t.ligacao.split(":"); if (tipo === "usuario") abrirFicha(id); }); c.appendChild(a); }
        c.appendChild(h("div", "meta", `Criada por ${t.criadoPorNome || nomeEquipe(t.criadoPor)} · ${relativo(t.criadoEm)}${t.status === "feito" && t.concluidaEm ? " · concluída " + relativo(t.concluidaEm) : ""}`));
        const ac = h("div", "ad-acoes");
        if (i > 0) ac.append(btn("← " + COLS[i - 1][1], "mini", () => moverTarefa(t, COLS[i - 1][0])));
        if (i < 2) ac.append(btn(i === 0 ? "Começar →" : "Concluir ✓", "mini pri", () => moverTarefa(t, COLS[i + 1][0])));
        ac.append(btn("Editar", "mini", () => editarTarefa({}, t)));
        if (t.criadoPor === C.eu.uid || C.papel === "dono") ac.append(btn("Apagar", "mini perigo", async () => { if (!(await confirmarHF({ titulo: "Apagar esta tarefa?", texto: "Ela some para toda a equipe.", ok: "Apagar", icone: "lixo" }))) return; const { fb } = C; await fb.deleteDoc(fb.doc(fb.db, "equipe_tarefas", t.id)); await registrar("tarefa_apagar", "", t.titulo); }));
        c.appendChild(ac); col.appendChild(c);
      });
      if (!itens.length) col.appendChild(h("div", "meta", "—"));
      return col;
    }));
  }
  C.aoMudarTarefas = pintar; pintar();
}

// ======================================================= PUBLICAÇÕES (moderação do Diário)
let filtroPub = "recentes";
export function publicacoes(el) {
  const denPorPost = new Map(contarPor(D.denuncias.filter((d) => d.tipo === "publicacao"), (d) => d.itemId));
  el.appendChild(cab("Publicações", `Moderação do Diário: ${num(D.contagens.diario ?? D.posts.length)} publicações. Esconda ou remova o que viola os Termos.`));
  if (!pode("moderar")) el.appendChild(h("div", "ad-aviso-papel", `Seu papel (${PAPEIS[C.papel]}) pode ver, mas quem esconde ou remove é a moderação.`));
  const busca = document.createElement("input"); busca.type = "search"; busca.className = "ad-sel"; busca.placeholder = "Buscar no texto ou no nome do autor"; busca.setAttribute("aria-label", "Buscar publicações");
  const fil = chips([["recentes", "Recentes"], ["denunciadas", `Denunciadas (${denPorPost.size})`], ["escondidas", "Escondidas"]], filtroPub, (v) => { filtroPub = v; pintar(); });
  const linhaF = h("div", "ad-acoes"); linhaF.style.marginBottom = "12px"; linhaF.append(fil, busca);
  // Recalcular o resumo das estrelas (diario_notas) a partir das notas: corrige publicações de antes do
  // resumo e qualquer diferença. Lê só as notas (documentos pequenos), 1.000 por vez.
  if (pode("moderar")) linhaF.append(btn("Recalcular estrelas", "mini", async (b) => {
    if (!(await confirmarHF({ titulo: "Recalcular as estrelas?", texto: "Refaz o resumo das estrelas de todas as publicações. Lê todas as notas dadas.", ok: "Recalcular", icone: "recarregar", cor: "normal" }))) return;
    const { fb } = C; const por = new Map(); let ultimo = null, lidas = 0;
    for (;;) {
      const s = await fb.getDocs(fb.query(fb.collection(fb.db, "curtidas"), fb.orderBy(fb.documentId()), ...(ultimo ? [fb.startAfter(ultimo)] : []), fb.limit(1000)));
      s.docs.forEach((d) => { const x = d.data(), n = Number(x.nota) || 0; if (!x.postId || n < 1 || n > 5) return; const r = por.get(x.postId) || { total: 0, soma: 0, n1: 0, n2: 0, n3: 0, n4: 0, n5: 0 }; r.total++; r.soma += n; r["n" + n]++; por.set(x.postId, r); });
      lidas += s.size; b.textContent = `Lendo notas… ${lidas}`;
      if (s.size < 1000) break; ultimo = s.docs.at(-1);
    }
    const ids = [...por.keys()];
    for (let i = 0; i < ids.length; i += 400) { const lote = fb.writeBatch(fb.db); ids.slice(i, i + 400).forEach((id) => lote.set(fb.doc(fb.db, "diario_notas", id), por.get(id))); await lote.commit(); }
    b.textContent = "Recalcular estrelas";
    await registrar("recalcular_estrelas", "", `${ids.length} publicações, ${lidas} notas`);
    toast(`Estrelas recalculadas: ${ids.length} publicação(ões), ${lidas} nota(s).`);
  }));
  el.appendChild(linhaF);
  const lista = h("div", "ad-lista"); el.appendChild(lista);
  const escondida = (p) => ms(p.ocultoAte) > agora();
  function pintar() {
    const t = busca.value.trim().toLowerCase();
    const l = D.posts.filter((p) => (filtroPub === "denunciadas" ? denPorPost.has(p.id) : filtroPub === "escondidas" ? escondida(p) : true) && (!t || [p.texto, p.nome, pessoa(p.autorId).nome].some((v) => String(v || "").toLowerCase().includes(t))))
      .sort((a, b) => filtroPub === "denunciadas" ? (denPorPost.get(b.id) - denPorPost.get(a.id)) || ms(b.criadoEm) - ms(a.criadoEm) : ms(b.criadoEm) - ms(a.criadoEm));
    lista.replaceChildren(...(l.length ? l.slice(0, 150).map((p) => {
      const c = h("article", "ad-item"); const top = h("div", "cab");
      const a = h("a", null, pessoa(p.autorId).nome || p.nome || p.autorId); a.href = "#"; a.addEventListener("click", (e) => { e.preventDefault(); abrirFicha(p.autorId); });
      top.append(a); if (denPorPost.get(p.id)) top.append(selo(`${denPorPost.get(p.id)} denúncia(s)`, "critico")); if (escondida(p)) top.append(selo("Escondida", "neutro")); if (p.editadoEm) top.append(selo("Editada", "neutro"));
      top.append(h("span", "quando", dataHora(p.criadoEm)));
      c.append(top);
      if (p.texto) c.appendChild(h("div", "trecho", p.texto.length > 400 ? p.texto.slice(0, 400) + "…" : p.texto));
      if (p.mediaUrl && /^(data:image|https:\/\/firebasestorage)/.test(p.mediaUrl) && p.mediaTipo !== "video") {
        // Todas as fotos da publicação (várias fotos: midias).
        const fotos = (Array.isArray(p.midias) && p.midias.length > 1 ? p.midias : [p.mediaUrl]).filter((u) => /^(data:image|https:\/\/firebasestorage)/.test(String(u)));
        fotos.forEach((u, i) => { const im = document.createElement("img"); im.src = u; im.alt = fotos.length > 1 ? `Foto ${i + 1} de ${fotos.length}` : "Imagem da publicação"; im.className = "ad-pub-img"; im.loading = "lazy"; c.appendChild(im); });
      }
      else if (p.mediaUrl) c.appendChild(h("div", "meta", p.mediaTipo === "video" ? "(vídeo)" : "(mídia)"));
      const ac = h("div", "ad-acoes");
      const ver = h("a", "ad-bt mini", "Abrir no site"); ver.href = `usuarios.html?perfil=${encodeURIComponent(p.autorId)}`; ver.target = "_blank"; ver.textContent = "Ver perfil do autor"; ac.appendChild(ver);
      if (pode("moderar")) {
        ac.append(btn(escondida(p) ? "Mostrar" : "Esconder", "mini", async () => {
          const { fb } = C; const vai = !escondida(p);
          await fb.updateDoc(fb.doc(fb.db, "diario", p.id), { ocultoAte: vai ? fb.Timestamp.fromDate(new Date("2999-12-31")) : null, ocultoPelaEquipe: vai });
          p.ocultoAte = vai ? { toMillis: () => new Date("2999-12-31").getTime() } : null;
          await registrar(vai ? "esconder_publicacao" : "mostrar_publicacao", p.autorId, String(p.texto || "").slice(0, 120)); toast(vai ? "Publicação escondida" : "Publicação visível de novo"); pintar();
        }), btn("Remover", "mini perigo", async () => {
          if (!(await confirmarHF({ titulo: "Remover esta publicação?", texto: "Ela é apagada de vez. Não dá para desfazer.", ok: "Remover", icone: "lixo" }))) return;
          const { fb } = C; await fb.deleteDoc(fb.doc(fb.db, "diario", p.id));
          D.posts = D.posts.filter((x) => x !== p); await registrar("remover_conteudo", p.autorId, `publicacao ${p.id}: ${String(p.texto || "").slice(0, 100)}`); toast("Publicação removida"); pintar();
        }), btn("Avisar autor", "mini", () => fluxoAviso(p.autorId)));
      }
      c.appendChild(ac); return c;
    }) : [h("div", "ad-vazio", "Nenhuma publicação aqui.")]));
  }
  let tempo; busca.addEventListener("input", () => { clearTimeout(tempo); tempo = setTimeout(pintar, 200); });
  pintar();
}

// Atalhos com filtro (ex.: irPara("denuncias:minhas")).
export function definirFiltro(sec, f) {
  if (sec === "denuncias") filtroDen = f;
  else if (sec === "suporte") filtroSup = f;
  else if (sec === "tarefas") filtroTar = f;
  else if (sec === "publicacoes") filtroPub = f;
}
