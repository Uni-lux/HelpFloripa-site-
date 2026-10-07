// =====================================================
// Painel do administrador — seções
// =====================================================
import { linha, barras, cartao, destaque, num, baixarCSV } from "./graficos.js?v=2";
import {
  C, D, h, ms, DIA, agora, data, dataHora, relativo, idade, nomeCidade, avatar, pessoaCel, selo, toast, modal, estado, ativoHa,
  TIPOS_NEG, MOTIVOS_DEN, MOTIVOS_QX, registrar, enviarAviso, fluxoAviso, fluxoSancao, tirarSancao, definirSelo, abrirFicha
} from "./admin-base.js?v=3";

const cab = (titulo, sub, extra) => { const c = h("div", "ad-cab"); const t = h("div"); t.append(h("h1", null, titulo)); if (sub) t.append(h("p", null, sub)); c.appendChild(t); if (extra) c.appendChild(extra); return c; };
const bloco = (titulo, sub) => { const b = h("section", "ad-bloco"); const t = h("div", "ad-bloco-topo"); const tt = h("div"); tt.append(h("h3", null, titulo)); if (sub) tt.append(h("p", null, sub)); t.appendChild(tt); b.appendChild(t); b.topo = t; return b; };
function chips(opcoes, atual, aoMudar) {
  const w = h("div", "ad-filtros");
  opcoes.forEach(([v, t]) => { const b = h("button", "ad-chip", t); b.type = "button"; b.setAttribute("aria-pressed", String(v === atual)); b.addEventListener("click", () => { w.querySelectorAll(".ad-chip").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); aoMudar(v); }); w.appendChild(b); });
  return w;
}
const btn = (t, cls, fn) => { const b = h("button", "ad-bt " + (cls || ""), t); b.type = "button"; b.addEventListener("click", async (e) => { e.stopPropagation(); b.disabled = true; try { await fn(b); } catch (err) { console.error(err); toast("Não foi possível: " + (err.code || err.message)); } finally { b.disabled = false; } }); return b; };
const pessoa = (uid) => D.pessoas.get(uid) || { uid, nome: "Usuário removido" };
const pessoas = () => [...D.pessoas.values()];
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

// ======================================================= VISÃO GERAL
export function visao(el) {
  const ps = pessoas();
  const novos7 = ps.filter((p) => noPeriodo(p.criadoEm, 7)).length, novos7a = ps.filter((p) => noPeriodo(p.criadoEm, 7, 7)).length;
  const novos30 = ps.filter((p) => noPeriodo(p.criadoEm, 30)).length, novos30a = ps.filter((p) => noPeriodo(p.criadoEm, 30, 30)).length;
  const kp = h("div", "ad-kpis");
  kp.append(
    destaque({ rotulo: "Usuários", valor: ps.length, dica: `${ps.filter((p) => p.verificado).length} verificados` }),
    destaque({ rotulo: "Novos (7 dias)", valor: novos7, antes: novos7a }),
    destaque({ rotulo: "Novos (30 dias)", valor: novos30, antes: novos30a }),
    destaque({ rotulo: "Ativos hoje", valor: ps.filter((p) => ativoHa(p, 1)).length, dica: "abriram o site nas últimas 24 h" }),
    destaque({ rotulo: "Ativos (7 dias)", valor: ps.filter((p) => ativoHa(p, 7)).length, dica: `${ps.length ? Math.round((ps.filter((p) => ativoHa(p, 7)).length / ps.length) * 100) : 0}% da base` }),
    destaque({ rotulo: "Ativos (30 dias)", valor: ps.filter((p) => ativoHa(p, 30)).length }),
    destaque({ rotulo: "Negócios", valor: D.negocios.length, dica: `${D.anuncios.length} anúncios de imóvel` }),
    destaque({ rotulo: "Publicações", valor: D.contagens.diario ?? D.posts.length, dica: `${D.posts.filter((p) => noPeriodo(p.criadoEm, 7)).length} nos últimos 7 dias` })
  );
  el.append(cab("Visão geral", `Bom dia, ${C.nome.split(" ")[0] || "equipe"}. Este é o retrato do Help Floripa agora.`), kp);

  const g = h("div", "ad-grade");
  // precisa de atenção
  const at = bloco("Precisa de atenção", "Toque para ir direto ao que está esperando a equipe.");
  const lista = h("div", "ad-atencao");
  const semResp = D.queixas.filter((q) => q.status === "aberta" && !q.resposta && ms(q.abertaEm) < agora() - 7 * DIA).length;
  [[D.denuncias.filter((d) => d.status === "nova").length, "Denúncias novas", "Golpes, perfis falsos e ofensas para analisar", "denuncias"],
   [D.suporte.filter((s) => s.status === "aberto").length, "Chamados de suporte esperando", "Pessoas aguardando resposta", "suporte"],
   [ps.filter((p) => p.solicitacaoVerificacao && !p.verificado).length, "Pedidos de verificação", "Selo de perfil verificado", "verificacoes"],
   [semResp, "Reclamações sem resposta há +7 dias", "O negócio não respondeu no prazo", "reclamacoes"],
   [D.parcerias.filter((p) => p.status === "novo").length, "Propostas de parceria novas", "Sócios, investidores e parceiros", "parcerias"],
   [D.exclusoes.size, "Exclusões de conta agendadas", "Dentro dos 30 dias para recuperar", "usuarios:exclusao"]
  ].forEach(([n, t, sub, sec]) => { const b = h("button"); b.type = "button"; const v = h("b", null, num(n)); if (n) v.style.color = "var(--st-critico)"; const s = h("span"); s.append(document.createTextNode(t), h("small", null, sub)); b.append(v, s); b.addEventListener("click", () => C.irPara(sec)); lista.appendChild(b); });
  at.appendChild(lista); g.appendChild(at);
  // crescimento
  const s30 = serieDiaria(ps.map((p) => p.criadoEm), 30);
  g.appendChild(cartao({ titulo: "Novos usuários por dia", sub: "Últimos 30 dias", cabecalho: ["Dia", "Novos usuários"], linhas: s30.map((p) => [p.rotulo, p.valor]), desenhar: (a) => linha(a, { pontos: s30 }), nomeArquivo: "novos-usuarios-30d" }));
  // negócios por tipo
  const porTipo = Object.entries(TIPOS_NEG).map(([k, rot], i) => ({ rotulo: rot, valor: D.negocios.filter((n) => n.tipo === k).length, cor: `var(--viz-${i + 1})` }));
  g.appendChild(cartao({ titulo: "Perfis de negócio por tipo", sub: `${D.negocios.length} no total`, cabecalho: ["Tipo", "Perfis"], linhas: porTipo.map((x) => [x.rotulo, x.valor]), desenhar: (a) => barras(a, { itens: porTipo }), nomeArquivo: "negocios-por-tipo" }));
  // confiança
  const conf = bloco("Confiança da plataforma", "Moderação e qualidade do atendimento.");
  const mk = h("div", "ad-kpis"); mk.style.marginBottom = "0";
  const negNotas = [...D.notas.entries()].filter(([k]) => k.startsWith("neg_")).map(([, v]) => v);
  const tot = negNotas.reduce((a, b) => a + (b.total || 0), 0), soma = negNotas.reduce((a, b) => a + (b.soma || 0), 0);
  mk.append(
    destaque({ rotulo: "Nota média dos negócios", valor: tot ? soma / tot : 0, formato: (v) => (v ? v.toFixed(2).replace(".", ",") + "★" : "—"), dica: `${num(tot)} avaliações` }),
    destaque({ rotulo: "Reclamações abertas", valor: D.queixas.filter((q) => q.status === "aberta").length, alerta: semResp > 0, dica: `${semResp} sem resposta no prazo` }),
    destaque({ rotulo: "Contas suspensas/banidas", valor: ps.filter((p) => ["suspenso", "banido"].includes(estado(p).k)).length })
  );
  conf.appendChild(mk); g.appendChild(conf);
  el.appendChild(g);
}

// ======================================================= USUÁRIOS
let filtroUsuarios = "todos", ordemUsuarios = "recentes";
export function usuarios(el, termo = "") {
  if (termo) filtroUsuarios = "todos";
  const busca = h("input"); busca.type = "search"; busca.placeholder = "Filtrar por nome, @, e-mail, telefone, cidade ou ID"; busca.value = termo;
  Object.assign(busca.style, { width: "min(420px,100%)", height: "40px", borderRadius: "12px", border: "1px solid var(--line)", background: "var(--input)", padding: "0 12px" });
  const exportar = btn("Baixar Excel", "", () => { const l = filtrar(); baixarCSV("usuarios", ["ID", "Nome", "@", "E-mail", "Telefone", "Cidade", "Idade", "Cadastro", "Último acesso", "Situação", "Verificado", "Negócios"], l.map((p) => [p.uid, p.nome || "", p.nickname || "", p.email || "", p.telefone || "", nomeCidade(p.cidade), idade(p.dataNascimento) ?? "", data(p.criadoEm), data(p.ultimoAcesso), estado(p).t, p.verificado ? "sim" : "não", D.negocios.filter((n) => n.donoId === p.uid).length])); registrar("exportar", "usuarios", `${l.length} linhas`); });
  const topoAcoes = h("div", "ad-acoes"); topoAcoes.append(busca, exportar);
  el.append(cab("Usuários", `${num(D.pessoas.size)} contas. Toque numa pessoa para ver a ficha completa e agir.`, topoAcoes));
  const filtros = chips([["todos", "Todos"], ["novos", "Novos (7 dias)"], ["ativos", "Ativos (7 dias)"], ["inativos", "Sumidos (+30 dias)"], ["negocio", "Com negócio"], ["verificados", "Verificados"], ["desativado", "Desativados"], ["exclusao", "Exclusão agendada"], ["sancao", "Suspensos/banidos"]], filtroUsuarios, (v) => { filtroUsuarios = v; pintar(); });
  const ordem = chips([["recentes", "Mais recentes"], ["acesso", "Último acesso"], ["nome", "Nome A–Z"]], ordemUsuarios, (v) => { ordemUsuarios = v; pintar(); });
  const linhaF = h("div", "ad-acoes"); linhaF.style.justifyContent = "space-between"; linhaF.style.marginBottom = "12px"; linhaF.append(filtros, ordem);
  const tab = h("div", "ad-tabela"); const info = h("p"); info.style.color = "var(--muted)";
  el.append(linhaF, info, tab);
  const comNegocio = new Set(D.negocios.map((n) => n.donoId));
  function filtrar() {
    const t = busca.value.trim().toLowerCase().replace(/^@/, "");
    const tel = t.replace(/\D/g, "");
    let l = pessoas().filter((p) => {
      const st = estado(p).k;
      if (filtroUsuarios === "novos" && !noPeriodo(p.criadoEm, 7)) return false;
      if (filtroUsuarios === "ativos" && !ativoHa(p, 7)) return false;
      if (filtroUsuarios === "inativos" && (ativoHa(p, 30) || !p.ultimoAcesso)) return false;
      if (filtroUsuarios === "negocio" && !comNegocio.has(p.uid)) return false;
      if (filtroUsuarios === "verificados" && !p.verificado) return false;
      if (filtroUsuarios === "desativado" && st !== "desativado") return false;
      if (filtroUsuarios === "exclusao" && st !== "exclusao") return false;
      if (filtroUsuarios === "sancao" && !["suspenso", "banido"].includes(st)) return false;
      if (!t) return true;
      return [p.nome, p.nickname, p.email, nomeCidade(p.cidade), p.uid].some((x) => String(x || "").toLowerCase().includes(t)) || (tel.length >= 4 && String(p.telefone || "").replace(/\D/g, "").includes(tel));
    });
    l.sort(ordemUsuarios === "nome" ? (a, b) => String(a.nome || "").localeCompare(String(b.nome || "")) : ordemUsuarios === "acesso" ? (a, b) => ms(b.ultimoAcesso) - ms(a.ultimoAcesso) : (a, b) => ms(b.criadoEm) - ms(a.criadoEm));
    return l;
  }
  function pintar() {
    const l = filtrar();
    info.textContent = `${num(l.length)} ${l.length === 1 ? "pessoa" : "pessoas"}${l.length > 300 ? " (mostrando 300; refine a busca)" : ""}`;
    const t = document.createElement("table");
    const th = h("tr"); ["Pessoa", "E-mail", "Cidade", "Idade", "Cadastro", "Último acesso", "Situação"].forEach((x) => th.appendChild(h("th", null, x)));
    const thead = h("thead"); thead.appendChild(th); const tb = h("tbody");
    l.slice(0, 300).forEach((p) => {
      const tr = h("tr", "clicavel"); tr.tabIndex = 0;
      const c1 = h("td"); c1.appendChild(pessoaCel(p));
      const st = estado(p); const c7 = h("td"); c7.appendChild(selo(st.t, st.c)); if (p.verificado) c7.append(" ", selo("Verificado", "info"));
      tr.append(c1, h("td", null, p.email || "—"), h("td", null, nomeCidade(p.cidade) || "—"), h("td", null, idade(p.dataNascimento) ?? "—"), h("td", null, data(p.criadoEm)), h("td", null, relativo(p.ultimoAcesso)), c7);
      const abrir = () => abrirFicha(p.uid);
      tr.addEventListener("click", abrir); tr.addEventListener("keydown", (e) => { if (e.key === "Enter") abrir(); });
      tb.appendChild(tr);
    });
    t.append(thead, tb); tab.replaceChildren(l.length ? t : h("div", "ad-vazio", "Ninguém encontrado com esses filtros."));
  }
  let tempo; busca.addEventListener("input", () => { clearTimeout(tempo); tempo = setTimeout(pintar, 200); });
  pintar();
  if (termo) busca.focus();
}

// ======================================================= DENÚNCIAS
let filtroDen = "nova";
export function denuncias(el) {
  const porAlvo = contarPor(D.denuncias, (d) => d.alvoId);
  el.appendChild(cab("Denúncias", "Analise, veja o conteúdo e decida: descartar, avisar, remover, suspender ou banir."));
  const g = h("div", "ad-grade"); g.style.marginBottom = "14px";
  const top = porAlvo.slice(0, 8).map(([uid, n]) => ({ rotulo: pessoa(uid).nome || uid, valor: n }));
  g.appendChild(cartao({ titulo: "Mais denunciados", sub: "Reincidência é sinal de alerta", cabecalho: ["Pessoa", "Denúncias"], linhas: top.map((x) => [x.rotulo, x.valor]), desenhar: (a) => barras(a, { itens: top, horizontal: true, cor: "var(--viz-2)" }), nomeArquivo: "mais-denunciados" }));
  const mot = contarPor(D.denuncias, (d) => MOTIVOS_DEN[d.motivo] || d.motivo).map(([rotulo, valor]) => ({ rotulo, valor }));
  g.appendChild(cartao({ titulo: "Denúncias por motivo", cabecalho: ["Motivo", "Denúncias"], linhas: mot.map((x) => [x.rotulo, x.valor]), desenhar: (a) => barras(a, { itens: mot, horizontal: true }), nomeArquivo: "denuncias-por-motivo" }));
  el.appendChild(g);
  const fil = chips([["nova", `Novas (${D.denuncias.filter((d) => d.status === "nova").length})`], ["em_analise", "Em análise"], ["resolvida", "Resolvidas"], ["descartada", "Descartadas"], ["todas", "Todas"]], filtroDen, (v) => { filtroDen = v; pintar(); });
  fil.style.marginBottom = "12px";
  const lista = h("div", "ad-lista"); el.append(fil, lista);
  const contAlvo = new Map(porAlvo);
  function pintar() {
    const l = D.denuncias.filter((d) => filtroDen === "todas" || d.status === filtroDen).sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
    lista.replaceChildren(...(l.length ? l.slice(0, 200).map(item) : [h("div", "ad-vazio", "Nenhuma denúncia aqui.")]));
  }
  function item(d) {
    const c = h("article", "ad-item");
    const top = h("div", "cab");
    top.append(selo(MOTIVOS_DEN[d.motivo] || d.motivo, d.motivo === "golpe" || d.motivo === "menor" ? "critico" : "serio"), selo({ perfil: "Perfil", publicacao: "Publicação", comentario: "Comentário", mensagem: "Mensagem", negocio: "Negócio" }[d.tipo] || d.tipo, "neutro"));
    if ((contAlvo.get(d.alvoId) || 0) >= 3) top.append(selo(`${contAlvo.get(d.alvoId)} denúncias contra`, "critico"));
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
    ac.append(btn("Ver conteúdo atual", "", () => verConteudo(d)));
    if (d.status === "nova") ac.append(btn("Em análise", "", async () => { await atualizar(d, { status: "em_analise" }); }));
    if (d.status !== "resolvida" && d.status !== "descartada") {
      ac.append(btn("Descartar", "", async () => { const v = await modal({ titulo: "Descartar denúncia", campos: [{ nome: "nota", rotulo: "Por quê? (só a equipe vê)", tipo: "textarea" }], botao: "Descartar" }); if (v) await atualizar(d, { status: "descartada", acao: "nenhuma", nota: v.nota }); }));
      ac.append(btn("Resolver com ação", "pri", () => resolver(d)));
    }
    c.appendChild(ac);
    return c;
  }
  async function atualizar(d, campos) {
    const { fb } = C;
    const dados = { ...campos, analisadaEm: fb.serverTimestamp(), analisadaPor: C.eu.uid };
    await fb.updateDoc(fb.doc(fb.db, "denuncias", d.id), dados);
    Object.assign(d, campos, { analisadaEm: { toMillis: () => agora() } });
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
      else if (d.tipo === "negocio") { await fb.updateDoc(fb.doc(fb.db, "negocios", d.itemId), { ocultoAte: fb.Timestamp.fromDate(new Date("2999-12-31")) }); const n = D.negocios.find((x) => x.id === d.itemId); if (n) n.ocultoAte = { toMillis: () => new Date("2999-12-31").getTime() }; }
      else { toast("Perfis e mensagens não são removidos: use aviso, suspensão ou banimento."); return; }
      await registrar("remover_conteudo", d.alvoId, `${d.tipo} ${d.itemId}`);
    }
    await atualizar(d, { status: "resolvida", acao: v.acao, nota: v.nota });
  }
  async function verConteudo(d) {
    const { fb } = C;
    let txt = "";
    try {
      if (d.tipo === "publicacao") { const s = await fb.getDoc(fb.doc(fb.db, "diario", d.itemId)); txt = s.exists() ? `Publicação: ${s.data().texto || "(só mídia)"}` : "A publicação já foi apagada."; }
      else if (d.tipo === "comentario") { const s = await fb.getDoc(fb.doc(fb.db, "comentarios", d.itemId)); txt = s.exists() ? `Comentário: ${s.data().texto}` : "O comentário já foi apagado."; }
      else if (d.tipo === "mensagem") { const s = await fb.getDoc(fb.doc(fb.db, "conversas", d.conversaId, "mensagens", d.itemId)); txt = s.exists() ? `Mensagem (${dataHora(s.data().criadoEm)}): ${s.data().texto || "(" + (s.data().tipoArquivo || "anexo") + ")"}` : "A mensagem já foi apagada por quem enviou. Use o trecho guardado na denúncia."; }
      else if (d.tipo === "negocio") { const n = D.negocios.find((x) => x.id === d.itemId); txt = n ? `Negócio: ${n.nome} — ${n.descricao || ""}` : "O negócio não existe mais."; window.open(`${n?.tipo === "imoveis" ? "imoveis.html" : ({ servicos: "servicos.html", delivery: "delivery.html", lojinha: "shopping.html" }[n?.tipo] || "servicos.html")}?negocio=${encodeURIComponent(d.itemId)}`, "_blank"); }
      else { abrirFicha(d.alvoId); return; }
    } catch (e) { txt = "Não foi possível abrir: " + (e.code || e.message); }
    await modal({ titulo: "Conteúdo denunciado", texto: txt, botao: "Fechar" });
  }
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
  const th = h("tr"); ["Aberta em", "Cliente", "Negócio", "Motivo", "Situação", "Relato"].forEach((x) => th.appendChild(h("th", null, x)));
  const thead = h("thead"); thead.appendChild(th); const tb = h("tbody");
  [...q].sort((a, b) => ms(b.abertaEm) - ms(a.abertaEm)).slice(0, 300).forEach((x) => {
    const tr = h("tr", "clicavel");
    const atras = x.status === "aberta" && !x.resposta && ms(x.abertaEm) < agora() - 7 * DIA;
    const st = h("td"); st.appendChild(selo(x.status === "resolvida" ? "Resolvida" : atras ? "Sem resposta" : x.resposta ? "Respondida" : "Aguardando", x.status === "resolvida" ? "bom" : atras ? "critico" : x.resposta ? "info" : "atencao"));
    tr.append(h("td", null, data(x.abertaEm)), h("td", null, pessoa(x.autorId).nome || x.autorNome || "—"), h("td", null, x.negocioNome || x.negocioId), h("td", null, MOTIVOS_QX[x.motivo] || x.motivo), st, h("td", null, String(x.texto || "").slice(0, 80)));
    tr.addEventListener("click", () => abrirFicha(x.alvoId));
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
    const ac = h("div", "ad-acoes"); ac.append(btn("Ver ficha", "", () => abrirFicha(uid)), btn("Remover sanção", "pri", async () => { if (!confirm("Remover a restrição desta conta?")) return; await tirarSancao(uid); toast("Sanção removida"); await C.recarregar(false); C.irPara("sancoes"); }));
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
let filtroNeg = "todos";
export function negocios(el) {
  el.appendChild(cab("Negócios e anúncios", `${D.negocios.length} perfis de negócio e ${D.anuncios.length} anúncios de imóvel.`));
  const fil = chips([["todos", "Todos"], ...Object.entries(TIPOS_NEG), ["escondidos", "Escondidos"], ["mal", "Nota abaixo de 3"]], filtroNeg, (v) => { filtroNeg = v; pintar(); });
  fil.style.marginBottom = "12px";
  const tab = h("div", "ad-tabela"); el.append(fil, tab);
  const queixasPor = new Map(contarPor(D.queixas, (x) => x.negocioId));
  function pintar() {
    const l = D.negocios.filter((n) => {
      const r = D.notas.get("neg_" + n.id);
      if (filtroNeg === "escondidos") return ms(n.ocultoAte) > agora();
      if (filtroNeg === "mal") return r?.total && r.soma / r.total < 3;
      return filtroNeg === "todos" || n.tipo === filtroNeg;
    }).sort((a, b) => ms(b.atualizadoEm) - ms(a.atualizadoEm));
    const t = document.createElement("table");
    const th = h("tr"); ["Negócio", "Tipo", "Dono", "Cidade", "Nota", "Reclamações", "Atualizado", ""].forEach((x) => th.appendChild(h("th", null, x)));
    const thead = h("thead"); thead.appendChild(th); const tb = h("tbody");
    l.slice(0, 400).forEach((n) => {
      const r = D.notas.get("neg_" + n.id); const esc = ms(n.ocultoAte) > agora();
      const tr = h("tr");
      const c0 = h("td"); c0.appendChild(pessoaCel({ nome: n.nome, fotoPerfil: n.foto }, n.categoria || "")); if (esc) c0.appendChild(selo("Escondido", "neutro"));
      const dono = h("td"); const a = h("a", null, pessoa(n.donoId).nome || n.donoId); a.href = "#"; a.addEventListener("click", (e) => { e.preventDefault(); abrirFicha(n.donoId); }); dono.appendChild(a);
      const ac = h("td"); const w = h("div", "ad-acoes"); w.style.flexWrap = "nowrap";
      const link = h("a", "ad-bt", "Ver"); link.href = `${n.tipo === "imoveis" ? "imoveis.html" : ({ servicos: "servicos.html", delivery: "delivery.html", lojinha: "shopping.html" }[n.tipo])}?negocio=${encodeURIComponent(n.id)}`; link.target = "_blank";
      w.append(link, btn(esc ? "Mostrar" : "Esconder", esc ? "" : "perigo", async () => {
        const { fb } = C;
        if (!esc && !confirm(`Esconder "${n.nome}" da vitrine?`)) return;
        await fb.updateDoc(fb.doc(fb.db, "negocios", n.id), { ocultoAte: esc ? null : fb.Timestamp.fromDate(new Date("2999-12-31")) });
        n.ocultoAte = esc ? null : { toMillis: () => new Date("2999-12-31").getTime() };
        await registrar(esc ? "mostrar_negocio" : "esconder_negocio", n.donoId, n.id); toast(esc ? "Negócio visível de novo" : "Negócio escondido"); pintar();
      }));
      ac.appendChild(w);
      tr.append(c0, h("td", null, TIPOS_NEG[n.tipo] || n.tipo), dono, h("td", null, nomeCidade(n.cidade) || "—"), h("td", null, r?.total ? `${(r.soma / r.total).toFixed(1).replace(".", ",")}★ (${r.total})` : "—"), h("td", null, String(queixasPor.get(n.id) || 0)), h("td", null, data(n.atualizadoEm)), ac);
      tb.appendChild(tr);
    });
    t.append(thead, tb); tab.replaceChildren(l.length ? t : h("div", "ad-vazio", "Nenhum negócio com esse filtro."));
  }
  pintar();
}

// ======================================================= SUPORTE
let filtroSup = "aberto";
export function suporte(el) {
  el.appendChild(cab("Suporte", "Chamados abertos pelos usuários (inclui contestações de suspensão)."));
  const fil = chips([["aberto", `Esperando (${D.suporte.filter((s) => s.status === "aberto").length})`], ["respondido", "Respondidos"], ["fechado", "Fechados"], ["todos", "Todos"]], filtroSup, (v) => { filtroSup = v; pintar(); });
  fil.style.marginBottom = "12px";
  const lista = h("div", "ad-lista"); el.append(fil, lista);
  const CAT = { conta: "Conta", pagamento: "Pagamento", golpe: "Golpe", denuncia: "Denúncia", contestacao: "Contestação", negocio: "Negócio", sugestao: "Sugestão", outro: "Outro" };
  function pintar() {
    const l = D.suporte.filter((s) => filtroSup === "todos" || s.status === filtroSup).sort((a, b) => ms(b.atualizadoEm) - ms(a.atualizadoEm));
    lista.replaceChildren(...(l.length ? l.map((s) => {
      const c = h("article", "ad-item"); c.style.cursor = "pointer";
      const top = h("div", "cab"); top.append(selo(CAT[s.categoria] || s.categoria, s.categoria === "contestacao" || s.categoria === "golpe" ? "serio" : "neutro"), selo(s.status === "aberto" ? "Esperando a equipe" : s.status === "respondido" ? "Respondido" : "Fechado", s.status === "aberto" ? "atencao" : s.status === "respondido" ? "info" : "bom"), h("span", "quando", relativo(s.atualizadoEm)));
      c.append(top, h("strong", null, s.assunto), h("div", "meta", `${pessoa(s.uid).nome || s.nome || s.uid} · aberto em ${dataHora(s.criadoEm)}`));
      c.addEventListener("click", () => abrirChamado(s));
      return c;
    }) : [h("div", "ad-vazio", "Nenhum chamado aqui.")]));
  }
  async function abrirChamado(s) {
    const { fb } = C;
    const fundo = h("div", "ad-modal-fundo"), cx = h("div", "ad-modal"); cx.style.width = "min(620px,100%)";
    cx.append(h("h3", null, s.assunto), h("p", null, `${pessoa(s.uid).nome || s.uid} · ${CAT[s.categoria] || s.categoria} · ${dataHora(s.criadoEm)}`));
    const chat = h("div", "ad-chat"); chat.appendChild(h("div", "ad-vazio", "Carregando..."));
    const txt = document.createElement("textarea"); txt.maxLength = 2000; txt.placeholder = "Escreva a resposta da equipe..."; Object.assign(txt.style, { width: "100%", minHeight: "90px", padding: "10px 12px", borderRadius: "10px", border: "1px solid var(--line)", background: "var(--input)" });
    const ac = h("div", "ad-acoes");
    const fechar = () => fundo.remove();
    ac.append(btn("Ver ficha", "", () => { fechar(); abrirFicha(s.uid); }), btn(s.status === "fechado" ? "Reabrir" : "Fechar chamado", "", async () => {
      const novo = s.status === "fechado" ? "aberto" : "fechado";
      await fb.updateDoc(fb.doc(fb.db, "suporte", s.id), { status: novo, atualizadoEm: fb.serverTimestamp(), ultimaDe: "equipe", atendidoPor: C.eu.uid });
      s.status = novo; await registrar("suporte_" + novo, s.uid, s.assunto); toast("Chamado atualizado"); fechar(); pintar();
    }), btn("Sair", "", fechar), btn("Responder", "pri", async () => {
      const t = txt.value.trim(); if (!t) { toast("Escreva a resposta."); return; }
      await fb.addDoc(fb.collection(fb.db, "suporte", s.id, "mensagens"), { autorId: C.eu.uid, equipe: true, texto: t, em: fb.serverTimestamp() });
      await fb.updateDoc(fb.doc(fb.db, "suporte", s.id), { status: "respondido", atualizadoEm: fb.serverTimestamp(), ultimaDe: "equipe", atendidoPor: C.eu.uid });
      await enviarAviso(s.uid, { titulo: "O suporte respondeu", texto: `Respondemos seu chamado "${s.assunto}". Toque em "Falar com o suporte" aqui embaixo para ver a resposta.`, tipo: "info" }).catch(() => {});
      s.status = "respondido"; await registrar("suporte_resposta", s.uid, s.assunto); toast("Resposta enviada"); fechar(); pintar();
    }));
    cx.append(chat, txt, ac); fundo.appendChild(cx); document.body.appendChild(fundo);
    fundo.addEventListener("click", (e) => { if (e.target === fundo) fechar(); });
    const msgs = await fb.getDocs(fb.query(fb.collection(fb.db, "suporte", s.id, "mensagens"), fb.orderBy("em", "asc"))).catch(() => ({ docs: [] }));
    chat.replaceChildren(...msgs.docs.map((d) => { const m = d.data(); const b = h("div", "ad-msg" + (m.equipe ? " equipe" : ""), m.texto); b.appendChild(h("small", null, `${m.equipe ? "Equipe" : "Usuário"} · ${dataHora(m.em)}`)); return b; }));
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
      const c = h("article", "ad-item");
      c.append(h("div", "cab"), h("strong", null, p.empresa ? `${p.empresa} · ${p.nome}` : p.nome), h("div", "meta", `${TIPO[p.tipo] || p.tipo} · ${data(p.criadoEm)}${p.cidade ? " · " + p.cidade : ""}`), h("div", "trecho", String(p.mensagem || "").length > 160 ? String(p.mensagem).slice(0, 160) + "…" : p.mensagem), h("div", "meta", "Toque para ver tudo"));
      c.querySelector(".cab").append(selo(TIPO[p.tipo] || p.tipo, "info"));
      if (p.notas) c.appendChild(h("div", "meta", `Notas: ${p.notas}`));
      const ac = h("div", "ad-acoes");
      if (p.email) { const a = h("a", "ad-bt", "E-mail"); a.href = `mailto:${p.email}?subject=Help Floripa — ${encodeURIComponent(TIPO[p.tipo] || "Parceria")}`; ac.appendChild(a); }
      const tel = String(p.telefone || "").replace(/\D/g, ""); if (tel.length >= 10) { const w = h("a", "ad-bt", "WhatsApp"); w.href = `https://wa.me/${tel.length <= 11 ? "55" + tel : tel}`; w.target = "_blank"; ac.appendChild(w); }
      ac.appendChild(btn("Atualizar", "pri", () => atualizarProposta(p)));
      c.appendChild(ac); col.appendChild(c);
      c.classList.add("clicavel"); c.tabIndex = 0; c.setAttribute("role", "button"); c.setAttribute("aria-label", `Abrir proposta de ${p.nome}`);
      c.addEventListener("click", (e) => { if (!e.target.closest("a,button")) abrirProposta(p); });
      c.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target === c) abrirProposta(p); });
    });
    if (!itens.length) col.appendChild(h("div", "meta", "—"));
    k.appendChild(col);
  });
  el.appendChild(k);

  async function atualizarProposta(p) {
    const v = await modal({ titulo: "Atualizar proposta", campos: [{ nome: "status", rotulo: "Etapa", tipo: "select", opcoes: COLS, valor: p.status || "novo" }, { nome: "notas", rotulo: "Notas internas", tipo: "textarea", valor: p.notas || "", max: 3000 }], botao: "Salvar" });
    if (!v) return;
    const { fb } = C;
    await fb.updateDoc(fb.doc(fb.db, "parcerias", p.id), { status: v.status, notas: v.notas, atualizadoEm: fb.serverTimestamp(), responsavel: C.eu.uid });
    Object.assign(p, v, { responsavel: C.eu.uid, atualizadoEm: { toMillis: () => agora() } }); await registrar("parceria", p.email || p.nome, `${v.status}`); toast("Proposta atualizada"); C.irPara("parcerias");
  }

  function abrirProposta(p) {
    const fundo = h("div", "ad-modal-fundo"), cx = h("div", "ad-modal ad-proposta"); cx.setAttribute("role", "dialog"); cx.setAttribute("aria-modal", "true");
    const fechar = () => { fundo.remove(); document.removeEventListener("keydown", tecla); };
    const tecla = (e) => { if (e.key === "Escape") fechar(); };
    document.addEventListener("keydown", tecla);
    fundo.addEventListener("click", (e) => { if (e.target === fundo) fechar(); });
    const etapa = Object.fromEntries(COLS)[p.status || "novo"];
    const topo = h("div", "cab"); topo.append(selo(TIPO[p.tipo] || p.tipo, "info"), selo(etapa, p.status === "fechado" ? "bom" : p.status === "recusado" ? "neutro" : "atencao"));
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
    par("Responsável", p.responsavel ? (pessoa(p.responsavel).nome || D.admins.find((a) => a.id === p.responsavel)?.nome || p.responsavel) : "");
    par("Atualizada", p.atualizadoEm ? dataHora(p.atualizadoEm) : "");
    const msg = h("div", "ad-proposta-msg", p.mensagem || "");
    cx.append(h("h4", null, "Proposta"), msg, dl);
    if (p.notas) cx.append(h("h4", null, "Notas internas"), h("div", "ad-proposta-msg", p.notas));
    const ac = h("div", "ad-acoes");
    if (p.uid) ac.append(btn("Ver ficha", "", () => { fechar(); abrirFicha(p.uid); }));
    if (p.email) { const a = h("a", "ad-bt", "E-mail"); a.href = `mailto:${p.email}?subject=Help Floripa — ${encodeURIComponent(TIPO[p.tipo] || "Parceria")}`; ac.appendChild(a); }
    if (tel.length >= 10) { const w = h("a", "ad-bt", "WhatsApp"); w.href = `https://wa.me/${tel.length <= 11 ? "55" + tel : tel}`; w.target = "_blank"; w.rel = "noopener"; ac.appendChild(w); }
    ac.append(btn("Apagar", "perigo", async () => { if (!confirm("Apagar esta proposta? Não dá para desfazer.")) return; const { fb } = C; await fb.deleteDoc(fb.doc(fb.db, "parcerias", p.id)); D.parcerias = D.parcerias.filter((x) => x !== p); await registrar("parceria_apagar", p.email || p.nome, p.empresa || ""); toast("Proposta apagada"); fechar(); C.irPara("parcerias"); }),
      btn("Fechar", "", fechar),
      btn("Mudar etapa / notas", "pri", async () => { fechar(); await atualizarProposta(p); }));
    cx.appendChild(ac); fundo.appendChild(cx); document.body.appendChild(fundo);
    cx.querySelector(".ad-acoes .ad-bt.pri")?.focus();
  }
}

// ======================================================= VERIFICAÇÕES
export function verificacoes(el) {
  el.appendChild(cab("Verificações", "Pedidos de selo de perfil verificado. Confira se é quem diz ser antes de aprovar."));
  const pend = pessoas().filter((p) => p.solicitacaoVerificacao && !p.verificado).sort((a, b) => ms(a.solicitacaoVerificacaoEm) - ms(b.solicitacaoVerificacaoEm));
  const lista = h("div", "ad-lista");
  if (!pend.length) lista.appendChild(h("div", "ad-vazio", "Nenhum pedido de verificação esperando."));
  pend.forEach((p) => {
    const negs = D.negocios.filter((n) => n.donoId === p.uid);
    const den = D.denuncias.filter((d) => d.alvoId === p.uid).length;
    const c = h("article", "ad-item"); const top = h("div", "cab"); top.append(pessoaCel(p), h("span", "quando", `pediu ${relativo(p.solicitacaoVerificacaoEm)}`));
    c.append(top, h("div", "meta", `Conta desde ${data(p.criadoEm)} · ${negs.length} negócio(s) · ${den} denúncia(s) · último acesso ${relativo(p.ultimoAcesso)}`));
    const ac = h("div", "ad-acoes");
    ac.append(btn("Ver ficha", "", () => abrirFicha(p.uid)),
      btn("Recusar", "perigo", async () => { const v = await modal({ titulo: "Recusar verificação", campos: [{ nome: "motivo", rotulo: "Motivo (a pessoa vai ver)", tipo: "textarea", obrigatorio: true }], botao: "Recusar" }); if (!v) return; await definirSelo(p.uid, false); await enviarAviso(p.uid, { titulo: "Pedido de verificação recusado", texto: v.motivo, tipo: "info" }); toast("Pedido recusado"); C.irPara("verificacoes"); }),
      btn("Aprovar", "pri", async () => { await definirSelo(p.uid, true); await enviarAviso(p.uid, { titulo: "Seu perfil foi verificado", texto: "Parabéns! Seu perfil agora tem o selo de verificado.", tipo: "info" }); toast("Perfil verificado"); C.irPara("verificacoes"); }));
    c.appendChild(ac); lista.appendChild(c);
  });
  el.appendChild(lista);
}

// ======================================================= ESTATÍSTICAS
let periodoEst = 30;
export function estatisticas(el) {
  const ps = pessoas();
  el.appendChild(cab("Estatísticas", "Quem usa o Help Floripa, de onde, e como a plataforma cresce.", chips([[30, "30 dias"], [90, "90 dias"], [365, "12 meses"]], periodoEst, (v) => { periodoEst = v; el.replaceChildren(); estatisticas(el); })));
  const g = h("div", "ad-grade");
  const mensal = periodoEst > 90;
  const datasU = ps.map((p) => p.criadoEm);
  const serieU = mensal ? serieMensal(datasU, 12) : serieDiaria(datasU, periodoEst);
  const antes = ps.filter((p) => ms(p.criadoEm) && ms(p.criadoEm) < agora() - (mensal ? 365 : periodoEst) * DIA).length;
  const acum = acumulada(serieU, antes);
  g.appendChild(cartao({ titulo: `Novos usuários por ${mensal ? "mês" : "dia"}`, cabecalho: [mensal ? "Mês" : "Dia", "Novos"], linhas: serieU.map((p) => [p.rotulo, p.valor]), desenhar: (a) => linha(a, { pontos: serieU }), nomeArquivo: "novos-usuarios" }));
  g.appendChild(cartao({ titulo: "Total de usuários", sub: "Crescimento acumulado", cabecalho: [mensal ? "Mês" : "Dia", "Total"], linhas: acum.map((p) => [p.rotulo, p.valor]), desenhar: (a) => linha(a, { pontos: acum, cor: "var(--viz-3)" }), nomeArquivo: "total-usuarios" }));
  // atividade
  const faixasAc = [["Hoje", 1], ["2 a 7 dias", 7], ["8 a 30 dias", 30], ["31 a 90 dias", 90], ["Mais de 90 dias", Infinity]];
  let ant = 0; const ac = faixasAc.map(([rot, d]) => { const v = ps.filter((p) => { const x = ms(p.ultimoAcesso); if (!x) return false; const dias = (agora() - x) / DIA; return dias <= d && dias > ant; }).length; ant = d; return { rotulo: rot, valor: v }; });
  ac.push({ rotulo: "Sem registro", valor: ps.filter((p) => !ms(p.ultimoAcesso)).length });
  g.appendChild(cartao({ titulo: "Último acesso", sub: "Quem voltou ao site e quando (\"sem registro\" inclui quem esconde o online)", cabecalho: ["Último acesso", "Pessoas"], linhas: ac.map((x) => [x.rotulo, x.valor]), desenhar: (a) => barras(a, { itens: ac }), nomeArquivo: "ultimo-acesso" }));
  // idades
  const ids = ps.map((p) => idade(p.dataNascimento));
  const fx = [["16–17", 16, 17], ["18–24", 18, 24], ["25–34", 25, 34], ["35–44", 35, 44], ["45–54", 45, 54], ["55–64", 55, 64], ["65+", 65, 200]].map(([rotulo, a, b]) => ({ rotulo, valor: ids.filter((i) => i != null && i >= a && i <= b).length }));
  const comIdade = ids.filter((i) => i != null).sort((a, b) => a - b);
  const mediana = comIdade.length ? comIdade[Math.floor(comIdade.length / 2)] : 0;
  g.appendChild(cartao({ titulo: "Faixa etária", sub: comIdade.length ? `Idade média ${(comIdade.reduce((a, b) => a + b, 0) / comIdade.length).toFixed(0)} · mediana ${mediana} · ${ps.length - comIdade.length} sem data` : "Sem datas de nascimento", cabecalho: ["Faixa", "Pessoas"], linhas: fx.map((x) => [x.rotulo, x.valor]), desenhar: (a) => barras(a, { itens: fx }), nomeArquivo: "faixa-etaria" }));
  // regiões
  const cid = contarPor(ps, (p) => nomeCidade(p.cidade) || null);
  const topC = cid.slice(0, 9).map(([rotulo, valor]) => ({ rotulo, valor })); const outrasC = cid.slice(9).reduce((a, [, v]) => a + v, 0); if (outrasC) topC.push({ rotulo: "Outras", valor: outrasC });
  g.appendChild(cartao({ titulo: "Cidades", sub: `${ps.filter((p) => !p.cidade).length} sem cidade informada`, cabecalho: ["Cidade", "Pessoas"], linhas: cid.map(([a, b]) => [a, b]), desenhar: (a) => barras(a, { itens: topC, horizontal: true }), nomeArquivo: "cidades" }));
  const bai = contarPor(ps, (p) => p.endereco?.bairro || null);
  const topB = bai.slice(0, 10).map(([rotulo, valor]) => ({ rotulo, valor }));
  g.appendChild(cartao({ titulo: "Bairros", sub: "Só de quem salvou endereço nas configurações", cabecalho: ["Bairro", "Pessoas"], linhas: bai.map(([a, b]) => [a, b]), desenhar: (a) => barras(a, { itens: topB, horizontal: true, cor: "var(--viz-3)" }), nomeArquivo: "bairros" }));
  // público
  const donos = new Set(D.negocios.map((n) => n.donoId));
  const pub = [{ rotulo: "Só clientes", valor: ps.filter((p) => !donos.has(p.uid)).length }, { rotulo: "Têm negócio", valor: ps.filter((p) => donos.has(p.uid)).length, cor: "var(--viz-2)" }];
  g.appendChild(cartao({ titulo: "Público", sub: "Clientes x quem anuncia", cabecalho: ["Grupo", "Pessoas"], linhas: pub.map((x) => [x.rotulo, x.valor]), desenhar: (a) => barras(a, { itens: pub }), nomeArquivo: "publico" }));
  const neg = Object.entries(TIPOS_NEG).map(([k2, rot], i) => ({ rotulo: rot, valor: D.negocios.filter((n) => n.tipo === k2 && noPeriodo(n.criadoEm || n.atualizadoEm, periodoEst)).length, cor: `var(--viz-${i + 1})` }));
  g.appendChild(cartao({ titulo: "Novos negócios no período", cabecalho: ["Tipo", "Novos"], linhas: neg.map((x) => [x.rotulo, x.valor]), desenhar: (a) => barras(a, { itens: neg }), nomeArquivo: "novos-negocios" }));
  // conteúdo
  const serieP = mensal ? serieMensal(D.posts.map((p) => p.criadoEm), 12) : serieDiaria(D.posts.map((p) => p.criadoEm), periodoEst);
  g.appendChild(cartao({ titulo: `Publicações no Diário por ${mensal ? "mês" : "dia"}`, cabecalho: [mensal ? "Mês" : "Dia", "Publicações"], linhas: serieP.map((p) => [p.rotulo, p.valor]), desenhar: (a) => linha(a, { pontos: serieP, cor: "var(--viz-2)" }), nomeArquivo: "publicacoes" }));
  // notas
  const negNotas = [...D.notas.entries()].filter(([k2]) => k2.startsWith("neg_")).map(([, v]) => v);
  const est = [5, 4, 3, 2, 1].map((n) => ({ rotulo: `${n}★`, valor: negNotas.reduce((a, b) => a + (b["n" + n] || 0), 0), cor: n >= 4 ? "var(--viz-3)" : n === 3 ? "var(--viz-4)" : "var(--viz-2)" }));
  g.appendChild(cartao({ titulo: "Distribuição das notas", sub: "Avaliações de negócios", cabecalho: ["Nota", "Avaliações"], linhas: est.map((x) => [x.rotulo, x.valor]), desenhar: (a) => barras(a, { itens: est }), nomeArquivo: "notas" }));
  // privacidade
  const priv = [{ rotulo: "Online visível", valor: ps.filter((p) => p.privacidade?.mostrarOnline !== false).length }, { rotulo: "Online oculto", valor: ps.filter((p) => p.privacidade?.mostrarOnline === false).length, cor: "var(--viz-4)" }];
  g.appendChild(cartao({ titulo: "Preferência de privacidade", sub: "Quem mostra quando está online", cabecalho: ["Preferência", "Pessoas"], linhas: priv.map((x) => [x.rotulo, x.valor]), desenhar: (a) => barras(a, { itens: priv }), nomeArquivo: "privacidade" }));
  // histórico automático
  if (D.estatisticas.length) {
    const s = [...D.estatisticas].sort((a, b) => a.id.localeCompare(b.id)).map((x) => ({ rotulo: x.id.slice(5).split("-").reverse().join("/"), valor: x.ativos1 || 0 }));
    g.appendChild(cartao({ titulo: "Ativos por dia (histórico)", sub: "Do relatório automático diário", cabecalho: ["Dia", "Ativos (24 h)"], linhas: s.map((p) => [p.rotulo, p.valor]), desenhar: (a) => linha(a, { pontos: s, cor: "var(--viz-3)" }), largo: true, nomeArquivo: "ativos-historico" }));
  }
  el.appendChild(g);
}

// ======================================================= COMUNICADOS
export function comunicados(el) {
  const novo = btn("Novo comunicado", "pri", () => editar(null));
  el.appendChild(cab("Comunicados", "Faixa que aparece no início do site para todos (manutenção, novidades, avisos).", novo));
  const lista = h("div", "ad-lista");
  if (!D.comunicados.length) lista.appendChild(h("div", "ad-vazio", "Nenhum comunicado criado."));
  [...D.comunicados].sort((a, b) => ms(b.em) - ms(a.em)).forEach((c) => {
    const it = h("article", "ad-item"); const top = h("div", "cab");
    const vivo = c.ativo && (!c.ate || ms(c.ate) > agora());
    top.append(selo(vivo ? "No ar" : "Fora do ar", vivo ? "bom" : "neutro"), selo({ info: "Informativo", novidade: "Novidade", alerta: "Alerta" }[c.tipo] || c.tipo, "info"), h("span", "quando", dataHora(c.em)));
    it.append(top, h("strong", null, c.titulo), h("div", "meta", c.texto || ""));
    if (c.ate) it.appendChild(h("div", "meta", `Sai do ar em ${dataHora(c.ate)}`));
    const ac = h("div", "ad-acoes"); ac.append(btn("Editar", "", () => editar(c)), btn(c.ativo ? "Tirar do ar" : "Colocar no ar", "", async () => { const { fb } = C; await fb.updateDoc(fb.doc(fb.db, "comunicados", c.id), { ...limpo(c), ativo: !c.ativo, por: C.eu.uid }); c.ativo = !c.ativo; await registrar("comunicado_" + (c.ativo ? "on" : "off"), "", c.titulo); C.irPara("comunicados"); }), btn("Apagar", "perigo", async () => { if (!confirm("Apagar este comunicado?")) return; const { fb } = C; await fb.deleteDoc(fb.doc(fb.db, "comunicados", c.id)); D.comunicados = D.comunicados.filter((x) => x !== c); await registrar("comunicado_apagar", "", c.titulo); C.irPara("comunicados"); }));
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
  el.appendChild(cab("Relatórios", "Resumo do período para imprimir ou salvar em PDF, e planilhas do Excel para baixar.", chips([[7, "7 dias"], [30, "30 dias"], [90, "90 dias"], [365, "12 meses"]], periodoRel, (v) => { periodoRel = v; el.replaceChildren(); relatorios(el); })));
  const ps = pessoas(), d = periodoRel;
  const linhas = [
    ["Usuários no fim do período", ps.length, ""],
    ["Novos usuários", ps.filter((p) => noPeriodo(p.criadoEm, d)).length, ps.filter((p) => noPeriodo(p.criadoEm, d, d)).length],
    ["Ativos no período (último acesso)", ps.filter((p) => ativoHa(p, d)).length, ""],
    ["Novos perfis de negócio", D.negocios.filter((n) => noPeriodo(n.criadoEm, d)).length, D.negocios.filter((n) => noPeriodo(n.criadoEm, d, d)).length],
    ["Novos anúncios de imóvel", D.anuncios.filter((a) => noPeriodo(a.criadoEm, d)).length, D.anuncios.filter((a) => noPeriodo(a.criadoEm, d, d)).length],
    ["Publicações no Diário", D.posts.filter((p) => noPeriodo(p.criadoEm, d)).length, D.posts.filter((p) => noPeriodo(p.criadoEm, d, d)).length],
    ["Reclamações abertas", D.queixas.filter((q) => noPeriodo(q.abertaEm, d)).length, D.queixas.filter((q) => noPeriodo(q.abertaEm, d, d)).length],
    ["Reclamações resolvidas", D.queixas.filter((q) => noPeriodo(q.resolvidaEm, d)).length, ""],
    ["Denúncias recebidas", D.denuncias.filter((x) => noPeriodo(x.criadoEm, d)).length, D.denuncias.filter((x) => noPeriodo(x.criadoEm, d, d)).length],
    ["Denúncias resolvidas", D.denuncias.filter((x) => x.status === "resolvida" && noPeriodo(x.analisadaEm, d)).length, ""],
    ["Chamados de suporte", D.suporte.filter((s) => noPeriodo(s.criadoEm, d)).length, D.suporte.filter((s) => noPeriodo(s.criadoEm, d, d)).length],
    ["Propostas de parceria", D.parcerias.filter((p) => noPeriodo(p.criadoEm, d)).length, D.parcerias.filter((p) => noPeriodo(p.criadoEm, d, d)).length],
    ["Sanções aplicadas", [...D.sancoes.values()].flatMap((s) => s.historico || []).filter((x) => x.tipo !== "removida" && Date.parse(x.em) > agora() - d * DIA).length, ""]
  ];
  const rel = h("div", "ad-relatorio");
  rel.append(h("h2", null, "Relatório Help Floripa"), h("p", null, `Período: últimos ${d} dias (${new Date(agora() - d * DIA).toLocaleDateString("pt-BR")} a ${new Date().toLocaleDateString("pt-BR")}) · gerado em ${new Date().toLocaleString("pt-BR")} por ${C.nome}`));
  const t = document.createElement("table"); const th = h("tr"); ["Indicador", "Período", "Período anterior"].forEach((x) => th.appendChild(h("th", null, x)));
  t.appendChild(th); linhas.forEach((l) => { const tr = h("tr"); l.forEach((x) => tr.appendChild(h("td", null, x === "" ? "—" : num(x)))); t.appendChild(tr); });
  rel.appendChild(t);
  const topCid = contarPor(ps.filter((p) => noPeriodo(p.criadoEm, d)), (p) => nomeCidade(p.cidade) || null).slice(0, 5);
  if (topCid.length) rel.appendChild(h("p", null, `Cidades dos novos usuários: ${topCid.map(([c, n]) => `${c} (${n})`).join(", ")}.`));
  const ac = h("div", "ad-acoes"); ac.style.margin = "14px 0";
  ac.append(btn("Imprimir / salvar PDF", "pri", () => { registrar("relatorio_pdf", "", `${d} dias`); window.print(); }),
    btn("Baixar resumo (Excel)", "", () => baixarCSV(`relatorio-${d}d`, ["Indicador", "Período", "Período anterior"], linhas)),
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
    const csv = btn("Baixar histórico (Excel)", "", () => baixarCSV("historico-diario", ["Dia", "Usuários", "Novos", "Ativos 24h", "Ativos 7d", "Negócios", "Publicações", "Denúncias novas", "Reclamações abertas"], D.estatisticas.map((x) => [x.id, x.usuarios, x.novos, x.ativos1, x.ativos7, x.negocios, x.publicacoes, x.denunciasNovas, x.reclamacoesAbertas])));
    csv.style.marginTop = "10px"; auto.appendChild(csv);
  }
  el.appendChild(auto);
}

// ======================================================= REGISTRO E EQUIPE
export function registro(el) {
  el.appendChild(cab("Registro de ações", "Tudo o que a equipe faz no painel fica aqui. Não pode ser apagado."));
  const NOMES = { aviso: "Enviou aviso", suspender: "Suspendeu", banir: "Baniu", remover_sancao: "Removeu sanção", verificar: "Deu selo", tirar_selo: "Tirou/recusou selo", remover_conteudo: "Removeu conteúdo", esconder_negocio: "Escondeu negócio", mostrar_negocio: "Mostrou negócio", exportar: "Exportou dados", relatorio_pdf: "Gerou relatório", parceria: "Atualizou parceria", parceria_apagar: "Apagou parceria", suporte_resposta: "Respondeu chamado", suporte_fechado: "Fechou chamado", suporte_aberto: "Reabriu chamado", comunicado_novo: "Criou comunicado", comunicado_editar: "Editou comunicado", comunicado_on: "Pôs comunicado no ar", comunicado_off: "Tirou comunicado do ar", comunicado_apagar: "Apagou comunicado", denuncia_resolvida: "Resolveu denúncia", denuncia_descartada: "Descartou denúncia", denuncia_em_analise: "Pôs denúncia em análise", entrou: "Entrou no painel" };
  const tab = h("div", "ad-tabela"); const t = document.createElement("table"); const th = h("tr"); ["Quando", "Quem", "Ação", "Alvo", "Detalhe"].forEach((x) => th.appendChild(h("th", null, x))); t.appendChild(th);
  D.log.forEach((x) => { const tr = h("tr"); const alvo = h("td"); if (x.alvo && D.pessoas.has(x.alvo)) { const a = h("a", null, pessoa(x.alvo).nome); a.href = "#"; a.addEventListener("click", (e) => { e.preventDefault(); abrirFicha(x.alvo); }); alvo.appendChild(a); } else alvo.textContent = x.alvo || "—"; tr.append(h("td", null, dataHora(x.em)), h("td", null, x.porNome || pessoa(x.por).nome || x.por), h("td", null, NOMES[x.acao] || x.acao), alvo, h("td", null, x.detalhe || "")); t.appendChild(tr); });
  tab.appendChild(D.log.length ? t : h("div", "ad-vazio", "Nenhuma ação registrada ainda."));
  el.appendChild(tab);
}
export function equipe(el) {
  el.appendChild(cab("Equipe", "Quem está no painel agora e o chat interno da equipe."));
  const g = h("div", "ad-equipe");
  // quem está online
  const bOn = bloco("Equipe", "Online = com o painel aberto agora.");
  const lista = h("div", "ad-lista");
  bOn.appendChild(lista);
  // chat
  const bChat = bloco("Chat da equipe", "Só quem é da equipe vê. As mensagens ficam guardadas.");
  bChat.classList.add("ad-chat-equipe");
  const chat = h("div", "ad-chat"); chat.setAttribute("aria-live", "polite");
  const form = h("form", "ad-chat-form");
  const txt = document.createElement("textarea"); txt.maxLength = 2000; txt.rows = 2; txt.placeholder = "Escreva para a equipe... (Enter envia, Shift+Enter quebra a linha)"; txt.setAttribute("aria-label", "Mensagem para a equipe");
  const env = h("button", "ad-bt pri", "Enviar"); env.type = "submit";
  form.append(txt, env); bChat.append(chat, form);
  g.append(bChat, bOn); el.appendChild(g);
  const b = bloco("Adicionar alguém à equipe", "Por segurança, só pelo console do Firebase (ninguém consegue se dar acesso pelo site).");
  b.style.marginTop = "14px";
  const ol = h("ol"); ol.style.color = "var(--muted)"; ol.style.margin = "0"; ol.style.paddingLeft = "20px";
  ["Abra a ficha da pessoa aqui no painel e copie o ID da conta.", "No Firebase → Firestore Database → coleção admins → Adicionar documento.", "Use o ID copiado como ID do documento e crie o campo nome (texto).", "Para tirar o acesso, apague o documento."].forEach((x) => ol.appendChild(h("li", null, x)));
  b.appendChild(ol); el.appendChild(b);

  const NOME_SEC = { visao: "Visão geral", estatisticas: "Estatísticas", relatorios: "Relatórios", usuarios: "Usuários", verificacoes: "Verificações", suporte: "Suporte", denuncias: "Denúncias", reclamacoes: "Reclamações", sancoes: "Sanções", negocios: "Negócios", parcerias: "Parcerias", comunicados: "Comunicados", registro: "Registro", equipe: "Equipe" };
  function pintarOnline() {
    const itens = D.admins.map((a) => ({ a, pr: C.presenca.get(a.id) })).sort((x, y) => (C.online(y.a.id) - C.online(x.a.id)) || ms(y.pr?.em) - ms(x.pr?.em));
    lista.replaceChildren(...itens.map(({ a, pr }) => {
      const p = pessoa(a.id); const on = C.online(a.id);
      const c = h("article", "ad-item"); const top = h("div", "cab");
      const pc = pessoaCel({ ...p, nome: a.nome || p.nome }, on ? `Online${pr?.secao ? " · em " + (NOME_SEC[pr.secao] || pr.secao) : ""}` : pr?.em ? `Visto ${relativo(pr.em)}` : "Ainda não abriu o painel");
      const av = pc.querySelector(".ad-av"); av.classList.add("com-ponto"); const pt = h("i", "ad-ponto" + (on ? " on" : "")); pt.setAttribute("aria-hidden", "true"); av.appendChild(pt);
      top.append(pc); if (a.id === C.eu.uid) top.append(selo("Você", "info")); else if (on) top.append(selo("Online", "bom"));
      c.appendChild(top); return c;
    }));
  }
  function pintarChat() {
    const perto = chat.scrollHeight - chat.scrollTop - chat.clientHeight < 80;
    if (!C.chat.length) { chat.replaceChildren(h("div", "ad-vazio", "Nenhuma mensagem ainda. Diga oi para a equipe.")); return; }
    let diaAnt = "";
    const nos = [];
    C.chat.forEach((m) => {
      const dia = ms(m.em) ? new Date(ms(m.em)).toLocaleDateString("pt-BR") : "agora";
      if (dia !== diaAnt) { nos.push(h("div", "ad-chat-dia", dia)); diaAnt = dia; }
      const meu = m.autorId === C.eu.uid;
      const bm = h("div", "ad-msg" + (meu ? " equipe" : ""));
      if (!meu) bm.appendChild(h("b", "ad-msg-autor", m.nome || pessoa(m.autorId).nome || "Equipe"));
      bm.appendChild(document.createTextNode(m.texto));
      bm.appendChild(h("small", null, ms(m.em) ? new Date(ms(m.em)).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "enviando..."));
      nos.push(bm);
    });
    chat.replaceChildren(...nos);
    if (perto || !pintarChat.feito) chat.scrollTop = chat.scrollHeight;
    pintarChat.feito = true;
  }
  async function enviar() {
    const t = txt.value.trim(); if (!t) return;
    env.disabled = true;
    try { const { fb } = C; await fb.addDoc(fb.collection(fb.db, "equipe_chat"), { autorId: C.eu.uid, nome: C.nome, texto: t.slice(0, 2000), em: fb.serverTimestamp() }); txt.value = ""; chat.scrollTop = chat.scrollHeight; }
    catch (e) { console.error(e); toast("Não foi possível enviar: " + (e.code || e.message)); }
    finally { env.disabled = false; txt.focus(); }
  }
  form.addEventListener("submit", (e) => { e.preventDefault(); enviar(); });
  txt.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); enviar(); } });
  C.aoMudarEquipe = () => { if (!el.isConnected) { C.aoMudarEquipe = null; return; } pintarOnline(); pintarChat(); C.marcarChatVisto(); };
  pintarOnline(); pintarChat(); C.marcarChatVisto();
}
