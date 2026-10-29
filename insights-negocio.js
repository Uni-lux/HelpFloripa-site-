// =====================================================
// Estatísticas do negócio (só o dono vê), no estilo do Google Meu Negócio, do painel profissional
// do Instagram e do portal do iFood: visitas, contatos, taxa de contato, funil, ações dos clientes,
// de onde vieram, quando visitam (mapa de calor), itens mais vistos, avaliações e dicas.
// Período de 7, 30 ou 90 dias, sempre comparando com o período anterior; relatório em Excel.
// Dados: neg_stats (estat-negocio.js), avaliacoes, reclamacoes e anuncios.
// Abrir: abrirInsightsNegocio(negocio, { aoEditar }) · negocios.html?insights=ID
// =====================================================
import { $, el, icone, fb, eu, dados, toast, numero, criarFolha, abrirFolha, urlSegura, pintarAvatar } from "./rede.js?v=78";
import { lerPlano, ehPago, abrirPlanos } from "./planos.js?v=33";
import { lerStats, listaDias, somarPeriodo, dataDoDia, chaveItem, chaveAnuncio, ORIGENS, ACOES, CONTATOS } from "./estat-negocio.js?v=1";
import { baixarPlanilhaMulti } from "./planilha.js?v=5";

const PERIODOS = [[7, "7 dias"], [30, "30 dias"], [90, "90 dias"]];
const ROTULO_TIPO = { servicos: "Freelances", delivery: "Delivery", lojinha: "Lojinha", imoveis: "Imóveis", saude: "Saúde" };
const DIAS_SEM = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DIAS_SEM_LONGO = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const ICONE_ACAO = { whats: "whats", mensagem: "chat", orcamento: "doc", pedido: "loja", rota: "local", site: "link", instagram: "imagem", compartilhar: "compartilhar", cupom: "selo", avaliar: "estrela" };
const ICONE_ORIGEM = { vitrine: "grade", busca: "lupa", explorar: "bussola", inicio: "casa", perfil: "pessoa-mais", link: "link", flash: "raio", mensagens: "chat", outro: "mais" };
// Etapa final do funil em cada tipo: o que vale como "negócio fechado" no Help Floripa.
const FINAL = { servicos: ["orcamento", "Pedidos de orçamento"], delivery: ["pedido", "Pedidos enviados"], lojinha: ["pedido", "Pedidos enviados"], imoveis: ["mensagem", "Conversas iniciadas"], saude: ["orcamento", "Pedidos de agendamento"] };
const pct = (v) => `${(v * 100).toFixed(v > 0 && v < 0.1 ? 1 : 0).replace(".", ",")}%`;
const ms = (t) => t?.toMillis?.() ?? 0;
const lerTodos = (q) => fb.getDocs(q).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() })));

// Variação contra o período anterior: "▲ 25%" / "▼ 10%" / "novo".
function variacao(atual, antes) {
  if (!antes) return atual ? { txt: "novo no período", cls: "sobe" } : { txt: "sem dados antes", cls: "" };
  const d = (atual - antes) / antes;
  if (Math.abs(d) < 0.03) return { txt: "= período anterior", cls: "" };
  return { txt: `${d > 0 ? "▲" : "▼"} ${pct(Math.abs(d))}`, cls: d > 0 ? "sobe" : "desce" };
}
const dataCurta = (dia) => dataDoDia(dia).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" }).replace(".", "");

let cacheStats = null;
async function carregar(n) {
  const r = { stats: null, semRegras: false, avaliacoes: [], respondidas: new Set(), anuncios: [] };
  const tarefas = [
    (cacheStats && Date.now() - cacheStats.em < 120000 ? Promise.resolve(cacheStats.lista) : lerStats(fb, eu.uid).then((l) => { cacheStats = { em: Date.now(), lista: l }; return l; }))
      .then((l) => { r.stats = l; }).catch((e) => { r.semRegras = e?.code === "permission-denied"; r.stats = []; }),
    lerTodos(fb.query(fb.collection(fb.db, "avaliacoes"), fb.where("alvoId", "==", eu.uid), fb.limit(500)))
      .then((l) => { r.avaliacoes = l.filter((a) => a.tipo === "negocio" && a.negocioId === n.id); }).catch(() => {})
  ];
  if (n.tipo === "imoveis") tarefas.push(lerTodos(fb.query(fb.collection(fb.db, "anuncios"), fb.where("donoId", "==", eu.uid), fb.limit(40))).then((l) => { r.anuncios = l; }).catch(() => {}));
  await Promise.all(tarefas);
  // Reclamações (nota até 2) já respondidas pelo negócio.
  await Promise.all(r.avaliacoes.filter((a) => a.nota <= 2).map(async (a) => { try { if ((await fb.getDoc(fb.doc(fb.db, "reclamacoes", a.id))).exists()) r.respondidas.add(a.id); } catch {} }));
  return r;
}

export async function abrirInsightsNegocio(n, opcoes = {}) {
  const f = criarFolha("folhaInsNeg", { titulo: "Estatísticas", classe: "cheia ni-folha", corpoClasse: "folha-corpo ni-corpo" });
  f.dataset.tipo = n.tipo;
  $("t_folhaInsNeg").textContent = "Estatísticas do negócio";
  const corpo = $("c_folhaInsNeg");
  corpo.replaceChildren(el("div", "ni-carregando", "Calculando as estatísticas..."));
  abrirFolha("folhaInsNeg");
  let D;
  try { const [d, pl] = await Promise.all([carregar(n), lerPlano(fb, n.donoId || eu.uid)]); D = d; D.pro = ehPago(pl); } // pro = qualquer plano pago (90 dias e Excel)
  catch (e) { corpo.replaceChildren(el("div", "lista-vazia", "Não foi possível calcular agora. Tente de novo em instantes.")); return; }
  let dias = 30;
  const pintar = () => { corpo.replaceChildren(); montar(corpo, n, D, dias, (d) => { dias = d; pintar(); corpo.scrollTop = 0; }, opcoes); };
  pintar();
}

function secao(titulo, sub, ic) {
  const s = el("section", "ni-secao");
  const cab = el("div", "ni-secao-cab");
  if (ic) { const i = el("span", "ni-secao-ic"); i.appendChild(icone(ic, "i s")); cab.appendChild(i); }
  const tx = el("div"); tx.append(el("h3", null, titulo)); if (sub) tx.appendChild(el("p", null, sub));
  cab.appendChild(tx);
  s.appendChild(cab);
  return s;
}
function barra(rot, valor, total, { ic = "", extra = "", destaque = false } = {}) {
  const l = el("div", "ni-barra" + (destaque ? " top" : ""));
  const nome = el("span", "ni-barra-nome");
  if (ic) nome.appendChild(icone(ic, "i xs"));
  nome.appendChild(document.createTextNode(rot));
  const tr = el("span", "ni-barra-trilho"); const i = el("i"); i.style.width = `${total ? Math.max(2, (valor / total) * 100) : 0}%`; tr.appendChild(i);
  const num = el("span", "ni-barra-num"); num.append(el("b", null, numero(valor)));
  if (extra) num.appendChild(el("small", null, extra));
  l.append(nome, tr, num);
  return l;
}

function montar(corpo, n, D, dias, trocar, opcoes) {
  const atual = somarPeriodo(D.stats, n.id, listaDias(dias));
  const antes = somarPeriodo(D.stats, n.id, listaDias(dias, 1));
  const fimPer = Date.now(), iniPer = fimPer - (dias - 1) * 864e5;
  const avPer = D.avaliacoes.filter((a) => ms(a.criadoEm) >= iniPer - 864e5);
  const avAntes = D.avaliacoes.filter((a) => ms(a.criadoEm) >= iniPer - dias * 864e5 && ms(a.criadoEm) < iniPer - 864e5);
  const mediaDe = (l) => (l.length ? l.reduce((t, a) => t + (Number(a.nota) || 0), 0) / l.length : 0);
  const [chaveFinal, rotFinal] = FINAL[n.tipo] || FINAL.servicos;

  // ---------- topo: negócio + período ----------
  const topo = el("div", "ni-topo");
  const quem = el("div", "ni-quem");
  const av = el("div", "avatar"); pintarAvatar(av, n.foto, n.nome);
  const qt = el("div"); qt.append(el("strong", null, n.nome || ROTULO_TIPO[n.tipo]), el("span", "ni-tipo", ROTULO_TIPO[n.tipo] || ""));
  quem.append(av, qt);
  const per = el("div", "ni-periodo"); per.setAttribute("role", "tablist");
  // 90 dias e o Excel vêm em todos os planos pagos (a partir do Plus): sem plano o botão mostra a etiqueta e abre os planos.
  const verPlanos = () => abrirPlanos({ fb, eu, dados, toast, plano: "plus" });
  PERIODOS.forEach(([d, rot]) => {
    const travado = d > 30 && !D.pro;
    const b = el("button", travado ? "travado" : null, rot); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(d === dias));
    if (travado) { b.appendChild(el("span", "ni-pro", "PLUS")); b.title = "Disponível a partir do plano Plus"; }
    b.addEventListener("click", () => (travado ? verPlanos() : trocar(d)));
    per.appendChild(b);
  });
  const intervalo = el("small", "ni-intervalo", `${dataCurta(listaDias(dias)[0])} – ${dataCurta(listaDias(dias)[dias - 1])} · comparado com os ${dias} dias anteriores`);
  topo.append(quem, per, intervalo);
  corpo.appendChild(topo);
  if (D.semRegras) {
    const a = el("div", "ni-aviso");
    a.append(icone("ajuda", "i s"), el("span", null, "As visitas e os contatos começam a ser contados quando as regras novas do Firebase forem publicadas. As avaliações já aparecem abaixo."));
    corpo.appendChild(a);
  }

  // ---------- números principais ----------
  const taxa = atual.v ? atual.contatos / atual.v : 0, taxaAntes = antes.v ? antes.contatos / antes.v : 0;
  const kpis = el("div", "ni-kpis");
  const kpi = (ic, rot, valor, cmp, dica, principal = false) => {
    const c = el("div", "ni-kpi" + (principal ? " principal" : ""));
    const r = el("span", "rot"); r.append(icone(ic, "i xs"), document.createTextNode(rot));
    c.append(r, el("strong", null, valor));
    if (cmp) c.appendChild(el("small", "cmp " + cmp.cls, cmp.txt));
    if (dica) c.appendChild(el("small", "dica", dica));
    kpis.appendChild(c);
  };
  kpi("olho", "Visitas ao perfil", numero(atual.v), variacao(atual.v, antes.v), "pessoas por dia, somadas", true);
  kpi("chat", "Contatos", numero(atual.contatos), variacao(atual.contatos, antes.contatos), "WhatsApp, chat, pedidos e orçamentos");
  const difTaxa = (taxa - taxaAntes) * 100;
  kpi("graf", "Taxa de contato", atual.v ? pct(taxa) : "—", atual.v && antes.v ? { txt: Math.abs(difTaxa) < 0.5 ? "= período anterior" : `${difTaxa > 0 ? "▲" : "▼"} ${Math.abs(difTaxa).toFixed(1).replace(".", ",")} p.p.`, cls: Math.abs(difTaxa) < 0.5 ? "" : difTaxa > 0 ? "sobe" : "desce" } : null, "de cada 100 visitas");
  const mediaGeral = mediaDe(D.avaliacoes);
  kpi("estrela", "Avaliação", D.avaliacoes.length ? mediaGeral.toFixed(1).replace(".", ",") : "—", avPer.length ? { txt: `+${avPer.length} ${avPer.length === 1 ? "nova" : "novas"} no período`, cls: "sobe" } : null, `${numero(D.avaliacoes.length)} ${D.avaliacoes.length === 1 ? "avaliação" : "avaliações"} no total`);
  corpo.appendChild(kpis);

  // ---------- gráfico: visitas e contatos por dia ----------
  {
    const s = secao("Visitas e contatos", "dia a dia, com o período anterior pontilhado", "graf");
    const leg = el("div", "ni-legenda");
    leg.append(el("span", "v", "Visitas"), el("span", "c", "Contatos"), el("span", "p", "Visitas no período anterior"));
    s.append(leg, graficoDias(atual.serie, antes.serie));
    corpo.appendChild(s);
  }

  // ---------- funil ----------
  {
    const s = secao("Funil de conversão", "de quem viu o perfil até quem chamou você", "graf");
    const etapas = n.tipo === "imoveis"
      ? [["Visitas ao perfil", atual.v], ["Viram um imóvel", Object.entries(atual.it).filter(([k]) => k.startsWith("an_")).reduce((t, [, q]) => t + q, 0)], ["Contatos", atual.contatos]]
      : [["Visitas ao perfil", atual.v], ["Contatos", atual.contatos], [rotFinal, Number(atual.a[chaveFinal]) || 0]];
    const max = Math.max(1, etapas[0][1]);
    const funil = el("div", "ni-funil");
    etapas.forEach(([rot, q], i) => {
      const l = el("div", "ni-funil-etapa");
      const b = el("div", "ni-funil-barra"); b.style.width = `${Math.max(8, Math.min(100, (q / max) * 100))}%`;
      b.append(el("b", null, numero(q)), el("span", null, rot));
      l.appendChild(b);
      if (i) { const prev = etapas[i - 1][1]; l.appendChild(el("small", null, prev ? `${pct(Math.min(1, q / prev))} da etapa anterior` : "—")); }
      funil.appendChild(l);
    });
    s.appendChild(funil);
    corpo.appendChild(s);
  }

  // ---------- ações dos clientes ----------
  {
    const s = secao("O que os clientes fizeram", "cada pessoa conta uma vez por dia em cada ação", "pontos");
    const lista = Object.keys(ACOES).map((k) => [k, Number(atual.a[k]) || 0, Number(antes.a[k]) || 0]).filter(([, q, qa]) => q || qa);
    if (!lista.length) s.appendChild(el("p", "ni-vazio", "Ainda sem ações no período. Elas aparecem quando alguém toca no WhatsApp, manda mensagem, pede orçamento, abre a rota, o site ou o Instagram, copia o cupom ou compartilha o perfil."));
    else {
      const max = Math.max(...lista.map(([, q]) => q), 1);
      lista.sort((a, b) => b[1] - a[1]).forEach(([k, q, qa]) => {
        const cmp = variacao(q, qa);
        s.appendChild(barra(ACOES[k], q, max, { ic: ICONE_ACAO[k], extra: cmp.txt, destaque: CONTATOS.includes(k) }));
      });
    }
    corpo.appendChild(s);
  }

  // ---------- de onde vieram ----------
  {
    const s = secao("Como encontraram você", "onde a pessoa estava quando abriu o perfil", "bussola");
    const tot = Object.values(atual.o).reduce((t, q) => t + q, 0);
    if (!tot) s.appendChild(el("p", "ni-vazio", "Ainda sem visitas no período."));
    else Object.entries(atual.o).sort((a, b) => b[1] - a[1]).forEach(([k, q]) => s.appendChild(barra(ORIGENS[k] || k, q, tot, { ic: ICONE_ORIGEM[k] || "mais", extra: pct(q / tot) })));
    corpo.appendChild(s);
  }

  // ---------- quando visitam ----------
  const pico = melhorHorario(atual);
  {
    const s = secao("Quando visitam", "dia da semana × horário (Brasília)", "relogio");
    if (!atual.v) s.appendChild(el("p", "ni-vazio", "Ainda sem visitas no período."));
    else {
      if (pico) {
        const d = el("div", "ni-pico");
        d.append(icone("raio", "i s"), el("span", null, `Pico: ${DIAS_SEM_LONGO[pico.dia]}, das ${pico.de}h às ${pico.ate}h. Dia mais forte: ${DIAS_SEM_LONGO[pico.diaForte]}.`));
        s.appendChild(d);
      }
      s.appendChild(mapaCalor(atual.calor));
    }
    corpo.appendChild(s);
  }

  // ---------- itens mais vistos ----------
  {
    const nomes = new Map();
    (n.itens || []).forEach((i) => { const k = chaveItem(i.nome); if (k) nomes.set(k, { nome: i.nome, foto: i.foto, preco: i.preco }); });
    D.anuncios.forEach((a) => { const k = chaveAnuncio(a.id); if (k) nomes.set(k, { nome: a.titulo || "Imóvel", foto: (a.fotos || [])[0], preco: a.preco }); });
    const top = Object.entries(atual.it).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const titulo = { servicos: "Serviços mais procurados", delivery: "Pratos mais vistos", lojinha: "Produtos mais vistos", imoveis: "Imóveis mais vistos", saude: "Atendimentos mais procurados" }[n.tipo];
    const s = secao(titulo, n.tipo === "servicos" ? "serviços tocados em \"Pedir\"" : n.tipo === "delivery" ? "pratos colocados no carrinho" : "abertos pelos clientes", "fotos");
    if (!top.length) s.appendChild(el("p", "ni-vazio", "Ainda sem itens vistos no período."));
    else {
      const max = top[0][1];
      top.forEach(([k, q], i) => {
        const info = nomes.get(k);
        const l = el("div", "ni-item");
        l.appendChild(el("span", "pos", String(i + 1)));
        const ft = el("span", "ft"); const u = urlSegura(info?.foto);
        if (u) ft.style.backgroundImage = `url("${u}")`; else ft.appendChild(icone(n.tipo === "imoveis" ? "casa" : "imagem", "i xs"));
        const tx = el("span", "tx"); tx.append(el("strong", null, info?.nome || "Item removido"));
        const tr = el("span", "ni-barra-trilho"); const b = el("i"); b.style.width = `${(q / max) * 100}%`; tr.appendChild(b); tx.appendChild(tr);
        l.append(ft, tx, el("b", null, numero(q)));
        s.appendChild(l);
      });
    }
    corpo.appendChild(s);
  }

  // ---------- avaliações e reclamações ----------
  {
    const s = secao("Avaliações", "o que os clientes acham do seu atendimento", "estrela");
    if (!D.avaliacoes.length) s.appendChild(el("p", "ni-vazio", "Ainda sem avaliações. Depois de cada atendimento, peça uma pelo chat (menu ⋮ › Pedir avaliação)."));
    else {
      const resumo = el("div", "ni-aval");
      const grande = el("div", "ni-aval-media");
      grande.append(el("strong", null, mediaGeral.toFixed(1).replace(".", ",")), el("span", "estrelas", "★★★★★".slice(0, Math.round(mediaGeral)) + "☆☆☆☆☆".slice(0, 5 - Math.round(mediaGeral))), el("small", null, `${numero(D.avaliacoes.length)} ${D.avaliacoes.length === 1 ? "avaliação" : "avaliações"}`));
      const dist = el("div", "ni-aval-dist");
      [5, 4, 3, 2, 1].forEach((k) => {
        const q = D.avaliacoes.filter((a) => a.nota === k).length;
        const l = el("div"); const tr = el("span", "ni-barra-trilho"); const i = el("i"); i.style.width = `${(q / D.avaliacoes.length) * 100}%`; tr.appendChild(i);
        l.append(el("span", null, `${k}★`), tr, el("small", null, numero(q)));
        dist.appendChild(l);
      });
      resumo.append(grande, dist);
      s.appendChild(resumo);
      const mPer = mediaDe(avPer), mAntes = mediaDe(avAntes);
      const linha = el("div", "ni-aval-per");
      linha.append(
        el("span", null, `No período: ${numero(avPer.length)} ${avPer.length === 1 ? "nova" : "novas"}${avPer.length ? ` · média ${mPer.toFixed(1).replace(".", ",")}` : ""}`),
        el("span", null, avAntes.length ? `Antes: ${numero(avAntes.length)} · média ${mAntes.toFixed(1).replace(".", ",")}` : "")
      );
      s.appendChild(linha);
      const recl = D.avaliacoes.filter((a) => a.nota <= 2);
      const pend = recl.filter((a) => !D.respondidas.has(a.id)).length;
      if (recl.length) {
        const r = el("a", "ni-recl" + (pend ? " pend" : ""));
        r.href = `reclamacoes.html?negocio=${encodeURIComponent(n.id)}`;
        r.append(icone("alerta", "i s"), el("span", null, pend ? `${pend} ${pend === 1 ? "reclamação esperando" : "reclamações esperando"} sua resposta` : `${recl.length} ${recl.length === 1 ? "reclamação respondida" : "reclamações respondidas"}`), icone("avancar", "i xs"));
        s.appendChild(r);
      }
      const ultimas = [...D.avaliacoes].filter((a) => String(a.comentario || "").trim()).sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm)).slice(0, 3);
      ultimas.forEach((a) => {
        const c = el("div", "ni-coment");
        c.append(el("span", "estrelas", "★".repeat(a.nota) + "☆".repeat(5 - a.nota)), el("p", null, `“${String(a.comentario).trim().slice(0, 220)}”`), el("small", null, new Date(ms(a.criadoEm)).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })));
        s.appendChild(c);
      });
    }
    corpo.appendChild(s);
  }

  // ---------- dicas automáticas ----------
  {
    const dicas = gerarDicas(n, atual, antes, D, pico, taxa);
    if (dicas.length) {
      const s = secao("Dicas para crescer", "geradas a partir dos seus números", "trofeu");
      dicas.slice(0, 5).forEach(([ic, titulo, texto, acao]) => {
        const d = el("div", "ni-dica");
        const i = el("span", "ic"); i.appendChild(icone(ic, "i s"));
        const tx = el("div"); tx.append(el("strong", null, titulo), el("p", null, texto));
        d.append(i, tx);
        if (acao && opcoes.aoEditar) {
          const b = el("button", "btn sec mini", acao); b.type = "button";
          b.addEventListener("click", () => { history.back(); setTimeout(() => opcoes.aoEditar(n), 250); });
          tx.appendChild(b);
        }
        s.appendChild(d);
      });
      corpo.appendChild(s);
    }
  }

  // ---------- relatório ----------
  const rodape = el("div", "ni-rodape");
  const bx = el("button", "btn ni-baixar"); bx.type = "button";
  bx.append(icone("doc", "i s"), document.createTextNode("Baixar relatório (Excel)"));
  if (!D.pro) { bx.classList.add("travado"); bx.appendChild(el("span", "ni-pro", "PLUS")); bx.title = "Disponível a partir do plano Plus"; }
  bx.addEventListener("click", () => (D.pro ? baixarRelatorio(n, atual, antes, dias, D, avPer, avAntes) : verPlanos()));
  rodape.append(bx, el("p", null, "Como contamos: cada pessoa conta uma vez por dia (visita e cada ação). Você não entra nas contas, e o Help Floripa não mostra quem visitou, só quantos. Dias e horários no horário de Brasília."));
  corpo.appendChild(rodape);
}

// Gráfico de colunas (visitas) + linha (contatos) + linha pontilhada (visitas no período anterior).
function graficoDias(serie, anterior) {
  const W = 340, H = 170, P = { l: 6, r: 6, t: 14, b: 22 };
  const n = serie.length;
  const max = Math.max(1, ...serie.map((d) => d.v), ...anterior.map((d) => d.v), ...serie.map((d) => d.contatos));
  const larg = (W - P.l - P.r) / n;
  const x = (i) => P.l + larg * i + larg / 2, y = (v) => H - P.b - (v / max) * (H - P.t - P.b);
  const colunas = serie.map((d, i) => `<rect class="col" x="${(x(i) - Math.max(1, larg * 0.32)).toFixed(1)}" y="${y(d.v).toFixed(1)}" width="${Math.max(2, larg * 0.64).toFixed(1)}" height="${(H - P.b - y(d.v)).toFixed(1)}" rx="${Math.min(3, larg * 0.25).toFixed(1)}"/>`).join("");
  const caminho = (lista, f) => lista.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(f(d)).toFixed(1)}`).join(" ");
  const box = el("div", "ni-graf");
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Visitas por dia: ${serie.reduce((t, d) => t + d.v, 0)} no período">
    <line class="eixo" x1="${P.l}" x2="${W - P.r}" y1="${H - P.b}" y2="${H - P.b}"/>
    <line class="guia" x1="${P.l}" x2="${W - P.r}" y1="${y(max)}" y2="${y(max)}"/>
    <line class="guia" x1="${P.l}" x2="${W - P.r}" y1="${y(max / 2)}" y2="${y(max / 2)}"/>
    ${colunas}
    <path class="ant" d="${caminho(anterior, (d) => d.v)}"/>
    <path class="cont" d="${caminho(serie, (d) => d.contatos)}"/>
    <line class="mira" x1="0" x2="0" y1="${P.t}" y2="${H - P.b}" visibility="hidden"/>
  </svg>`;
  const eixo = el("div", "ni-graf-eixo");
  eixo.append(el("span", null, dataCurta(serie[0].dia)), el("span", null, dataCurta(serie[Math.floor(n / 2)].dia)), el("span", null, "hoje"));
  const topo = el("span", "ni-graf-max", numero(max));
  const dica = el("div", "ni-graf-dica"); dica.hidden = true;
  box.append(topo, dica, eixo);
  const svg = box.querySelector("svg"), mira = svg.querySelector(".mira");
  const mover = (ev) => {
    const r = svg.getBoundingClientRect();
    const k = Math.min(n - 1, Math.max(0, Math.floor(((ev.clientX - r.left) / r.width * W - P.l) / larg)));
    mira.setAttribute("x1", x(k)); mira.setAttribute("x2", x(k)); mira.setAttribute("visibility", "visible");
    const d = serie[k], a = anterior[k];
    dica.replaceChildren(el("strong", null, dataDoDia(d.dia).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" })),
      el("span", "v", `${numero(d.v)} ${d.v === 1 ? "visita" : "visitas"}`), el("span", "c", `${numero(d.contatos)} ${d.contatos === 1 ? "contato" : "contatos"}`), el("span", "p", `antes: ${numero(a?.v || 0)}`));
    dica.hidden = false;
    dica.style.left = `${Math.min(80, Math.max(20, (x(k) / W) * 100))}%`;
  };
  svg.addEventListener("pointermove", mover);
  svg.addEventListener("pointerdown", mover);
  svg.addEventListener("pointerleave", () => { mira.setAttribute("visibility", "hidden"); dica.hidden = true; });
  return box;
}

// Mapa de calor: 7 linhas (seg a dom) × 8 faixas de 3 horas.
function mapaCalor(calor) {
  const faixas = Array.from({ length: 8 }, (_, f) => f * 3);
  const val = (d, f) => calor[d][f] + calor[d][f + 1] + calor[d][f + 2];
  const max = Math.max(1, ...[0, 1, 2, 3, 4, 5, 6].flatMap((d) => faixas.map((f) => val(d, f))));
  const g = el("div", "ni-calor");
  g.appendChild(el("span", "canto"));
  faixas.forEach((f) => g.appendChild(el("span", "hora", `${f}h`)));
  [1, 2, 3, 4, 5, 6, 0].forEach((d) => {
    g.appendChild(el("span", "dia", DIAS_SEM[d]));
    faixas.forEach((f) => {
      const v = val(d, f);
      const c = el("span", "cel");
      c.style.setProperty("--a", v ? (0.15 + 0.85 * (v / max)).toFixed(2) : "0");
      c.title = `${DIAS_SEM_LONGO[d]}, ${f}h–${f + 3}h: ${v} ${v === 1 ? "visita" : "visitas"}`;
      if (v === max) c.classList.add("top");
      g.appendChild(c);
    });
  });
  const leg = el("div", "ni-calor-leg"); leg.append(el("span", null, "menos"), el("i"), el("span", null, "mais visitas"));
  const box = el("div"); box.append(g, leg);
  return box;
}
function melhorHorario(r) {
  if (!r.v) return null;
  let melhor = { v: -1 };
  for (let d = 0; d < 7; d++) for (let f = 0; f < 24; f += 3) {
    const v = r.calor[d][f] + r.calor[d][f + 1] + r.calor[d][f + 2];
    if (v > melhor.v) melhor = { v, dia: d, de: f, ate: f + 3 };
  }
  const porDia = r.calor.map((h) => h.reduce((t, q) => t + q, 0));
  return { ...melhor, diaForte: porDia.indexOf(Math.max(...porDia)) };
}

// Dicas como as do Google Meu Negócio: o que falta e o que os números pedem.
function gerarDicas(n, atual, antes, D, pico, taxa) {
  const l = [];
  const pend = D.avaliacoes.filter((a) => a.nota <= 2 && !D.respondidas.has(a.id)).length;
  if (pend) l.push(["alerta", "Responda às reclamações", `${pend} ${pend === 1 ? "cliente espera" : "clientes esperam"} sua resposta. Responder rápido melhora a confiança de quem visita o perfil.`]);
  if (!String(n.whatsapp || "").trim()) l.push(["whats", "Adicione o WhatsApp", "O WhatsApp é o contato mais usado no Help Floripa. Com ele, quem visita chama você em um toque.", "Adicionar WhatsApp"]);
  if (atual.v >= 15 && taxa < 0.05) l.push(["chat", "Muita gente vê, pouca gente chama", `Só ${pct(taxa)} das visitas viraram contato. Revise preços, fotos e a descrição, e deixe claro como pedir.`, "Revisar o perfil"]);
  if (!n.promocao || (n.promocao.ate?.toMillis?.() ?? 0) < Date.now()) l.push(["selo", "Crie uma promoção ou cupom", "Um destaque com prazo (ex.: 10% no primeiro pedido) aparece no topo do seu perfil e dá um motivo para chamar agora.", "Criar promoção"]);
  if (!Array.isArray(n.semana) || !n.semana.some(Boolean)) l.push(["relogio", "Informe o horário de cada dia", "Com o horário, seu perfil mostra \"Aberto agora\" e quando abre ou fecha — igual ao Google.", "Informar horário"]);
  if (pico) l.push(["raio", "Publique no seu horário de pico", `Mais gente visita ${DIAS_SEM_LONGO[pico.dia]} entre ${pico.de}h e ${pico.ate}h. Publique no Diário ou um Flash pouco antes desse horário.`]);
  if (atual.v && !(atual.o.link) && !(atual.a.compartilhar)) l.push(["link", "Divulgue o link do seu perfil", "Nenhuma visita veio de link compartilhado. Coloque o link na bio do Instagram e no status do WhatsApp."]);
  if (!urlSegura(n.foto)) l.push(["camera", "Coloque sua logo ou foto", "Perfis com foto passam mais confiança e recebem mais visitas.", "Colocar foto"]);
  if (!n.instagram && !n.site) l.push(["link", "Ligue seu Instagram ou site", "Clientes gostam de ver mais trabalhos antes de chamar.", "Adicionar redes"]);
  if (antes.v >= 5 && atual.v < antes.v * 0.7) l.push(["graf", "As visitas caíram", `Foram ${numero(atual.v)} contra ${numero(antes.v)} no período anterior. Atualize fotos e itens: perfis atualizados aparecem mais.`]);
  if (!D.avaliacoes.length) l.push(["estrela", "Peça a primeira avaliação", "Depois de atender alguém pelo chat, use ⋮ › Pedir avaliação. Nota alta coloca você na frente na vitrine."]);
  return l;
}

function baixarRelatorio(n, atual, antes, dias, D, avPer, avAntes) {
  const ks = ["whats", "mensagem", "orcamento", "pedido", "rota", "site", "instagram", "compartilhar", "cupom", "avaliar"];
  const porDia = atual.serie.map((d) => [dataDoDia(d.dia).toLocaleDateString("pt-BR", { timeZone: "UTC" }), d.v, d.contatos, ...ks.map((k) => Number(d.a[k]) || 0)]);
  const nomes = new Map();
  (n.itens || []).forEach((i) => { const k = chaveItem(i.nome); if (k) nomes.set(k, i.nome); });
  D.anuncios.forEach((a) => nomes.set(chaveAnuncio(a.id), a.titulo || "Imóvel"));
  const taxa = (r) => (r.v ? Math.round((r.contatos / r.v) * 1000) / 10 : 0);
  const capa = {
    titulo: `Estatísticas — ${n.nome || ROTULO_TIPO[n.tipo]}`,
    descricao: `Perfil de ${ROTULO_TIPO[n.tipo] || "negócio"} no Help Floripa`,
    periodo: `Últimos ${dias} dias (${dataCurta(atual.serie[0].dia)} a ${dataCurta(atual.serie[atual.serie.length - 1].dia)})`,
    filtro: "Cada pessoa conta uma vez por dia; você não entra nas contas",
    autor: eu.displayName || "",
    indicadores: [["Visitas ao perfil", atual.v, antes.v], ["Contatos", atual.contatos, antes.contatos], ["Taxa de contato (%)", taxa(atual), taxa(antes)], ["Avaliações novas", avPer.length, avAntes.length]]
  };
  const abas = [
    { nome: "Por dia", titulo: "Visitas e contatos por dia", cabecalho: ["Dia", "Visitas", "Contatos", ...ks.map((k) => ACOES[k])], linhas: porDia, grafico: { tipo: "linha", titulo: "Visitas e contatos por dia" } },
    { nome: "Ações", titulo: "O que os clientes fizeram", cabecalho: ["Ação", "Período", "Período anterior"], linhas: ks.map((k) => [ACOES[k], Number(atual.a[k]) || 0, Number(antes.a[k]) || 0]), grafico: { tipo: "barra", titulo: "Ações dos clientes" } },
    { nome: "Origem", titulo: "Como encontraram você", cabecalho: ["Origem", "Visitas"], linhas: Object.keys(ORIGENS).map((k) => [ORIGENS[k], Number(atual.o[k]) || 0]), grafico: { tipo: "barra", titulo: "Como encontraram você" } },
    { nome: "Horários", titulo: "Visitas por horário", cabecalho: ["Hora", "Visitas"], linhas: atual.h.map((q, h) => [`${String(h).padStart(2, "0")}h`, q]), grafico: { tipo: "coluna", titulo: "Visitas por horário" } },
    { nome: "Itens", titulo: "Itens mais vistos", cabecalho: ["Item", "Vezes"], linhas: Object.entries(atual.it).sort((a, b) => b[1] - a[1]).map(([k, q]) => [nomes.get(k) || "Item removido", q]), grafico: { tipo: "barra", titulo: "Itens mais vistos" } }
  ];
  baixarPlanilhaMulti(`estatisticas-${String(n.nome || n.tipo).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").toLowerCase()}-${dias}d`, abas, capa);
}
