// =====================================================
// Meus negócios (negocios.html)
// - Painel com os perfis de negócio da pessoa: nota, avaliações,
//   reclamações aguardando resposta e atalhos.
// - Formulário completo de cada tipo (serviços, delivery, lojinha, imóveis)
//   e os anúncios de imóveis.
// Links: negocios.html?tipo=servicos (abre o formulário) · ?novo=1
// =====================================================
import { confirmarHF } from "./confirmar.js?v=5";
import {
  $, el, icone, pintarAvatar, urlSegura, nomeCidade, toast, erroAmigavel, abrirFolha, fecharFolha,
  fb, eu, dados, salvarImagem, editarImagem, iniciarRede, montarBarraRede, pintarBarraRede, ouvirAvisos, criarFolha
} from "./rede.js?v=68";
import { lerResumos, estrelas, media, notaTexto } from "./avaliacoes.js?v=15";
import { camposEndereco, gravarComLocal, NOVOS, textoCidade, semAcento } from "./endereco.js?v=1";
import { lerStats, listaDias, somarPeriodo } from "./estat-negocio.js?v=1";
import { geocodificar, geoOk } from "./perto.js?v=2";
import { LIMITES_GRATIS, perfisDoPlano } from "./planos-base.js?v=9";
import { compartilharPerfil, baixarArte, desenharQr } from "./qr.js?v=1";
import { abrirPlanos, lerPlano, esquecerPlano, nivelPlano, emTolerancia, pedidoAberto, lerNegociacao, testeDisponivel, seloPlano, nomePlano, diasRestantes, textoFalta, PRECO_MIN, DIAS_TESTE, reais } from "./planos.js?v=25";
import { termosBusca } from "./busca.js?v=1";
import { PROFISSOES_SAUDE, CATEGORIAS_SAUDE, MODALIDADES_SAUDE, PUBLICO_SAUDE, PUBLICO_VET, CONVENIOS, IDIOMAS, UFS, conselhoDe, ehVet, textoRegistro } from "./saude-dados.js?v=1";
import { buscarAnuncios, PAGAMENTOS, UNIDADES_SERV, DIFERENCIAIS_SERV, CONDICAO, SECOES_CARDAPIO, CARACT_IMOVEL, CONDICOES_IMOVEL, PAGINA_TIPO, CATEGORIAS, GRUPOS_SERV, PALAVRAS_SERV, prazoPromo } from "./vitrine.js?v=66";

// Cada tipo com a cor da sua classe na página inicial (inicio.css: --c-servicos etc.) e uma chamada própria.
const NEGOCIOS = {
  servicos: {
    rotulo: "Freelances", img: "servicos.webp", pagina: "servicos.html", desc: "Portfólio, preços, horários e pedidos de orçamento.",
    chamada: "Ofereça seus serviços", frase: "Trabalhe por conta e receba pedidos de orçamento pelo chat.", cta: "Oferecer serviços",
    pontos: ["Portfólio com fotos", "Preços e orçamentos", "Região e dias de atendimento"],
    phNome: "Ex.: Marido de Aluguel do João", phDesc: "Que serviços você faz, sua experiência e a região que atende..."
  },
  delivery: {
    rotulo: "Delivery", img: "lanchonetes.webp", pagina: "delivery.html", desc: "Cardápio com fotos, taxa, horário e pedidos prontos.",
    chamada: "Abra seu delivery", frase: "Cardápio bonito e pedidos chegando direto nas mensagens.", cta: "Abrir delivery",
    pontos: ["Cardápio com fotos e seções", "Taxa, pedido mínimo e tempo", "Entrega ou retirada"],
    phNome: "Ex.: Burger da Ilha", phDesc: "Sua especialidade, o que deixa a comida de vocês especial, bairros onde entregam..."
  },
  lojinha: {
    rotulo: "Lojinha", img: "shopping.webp", pagina: "shopping.html", desc: "Produtos com fotos, tamanhos, cores e estoque.",
    chamada: "Monte sua lojinha", frase: "Venda seus produtos no Shopping do Help Floripa.", cta: "Montar lojinha",
    pontos: ["Produtos com fotos e promoções", "Tamanhos, cores e estoque", "Entrega ou retirada"],
    phNome: "Ex.: Ateliê da Maria", phDesc: "O que você vende, marcas, como funciona a entrega e as trocas..."
  },
  imoveis: {
    rotulo: "Imóveis", img: "imoveis.webp", pagina: "imoveis.html", desc: "Anúncios de aluguel, venda e temporada.",
    chamada: "Anuncie imóveis", frase: "Alugue, venda ou ofereça temporada para quem busca na região.", cta: "Anunciar imóveis",
    pontos: ["Aluguel, venda ou temporada", "Até 5 fotos por imóvel", "Quantos anúncios quiser"],
    phNome: "Ex.: João Imóveis", phDesc: "Quem você é, a região onde atua e como prefere ser procurado..."
  },
  saude: {
    rotulo: "Saúde", img: "saude.svg", pagina: "saude.html", desc: "Registro no conselho, convênios, consultas e agendamentos.",
    chamada: "Atenda pela saúde", frase: "Médicos, enfermagem, psicólogos, veterinários e mais recebendo agendamentos pelo chat.", cta: "Criar perfil de saúde",
    pontos: ["Registro do conselho à vista", "Convênios, valor e online ou em casa", "Pedidos de agendamento no chat"],
    phNome: "Ex.: Dra. Ana Souza · Psicóloga", phDesc: "Sua formação, como é o seu atendimento, o que você trata e para quem..."
  }
};
let meusNegocios = [];
// Comunidade (doações, trocas, quartos...): não é perfil de negócio, mas aparece aqui com os anúncios da pessoa.
let meusComunidade = null;
async function carregarComunidade() {
  try {
    const s = await fb.getDocs(fb.query(fb.collection(fb.db, "comunidade"), fb.where("donoId", "==", eu.uid), fb.limit(50)));
    meusComunidade = s.docs.map((d) => d.data()).filter((a) => a.status !== "concluido");
  } catch { meusComunidade = []; }
  pintarPainel();
}

async function buscarNegocios(uid) {
  const snap = await fb.getDocs(fb.query(fb.collection(fb.db, "negocios"), fb.where("donoId", "==", uid), fb.limit(8)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => Object.keys(NEGOCIOS).indexOf(a.tipo) - Object.keys(NEGOCIOS).indexOf(b.tipo));
}
async function carregarMeusNegocios() {
  try { meusNegocios = await buscarNegocios(eu.uid); } catch (e) { console.warn("Negócios indisponíveis:", e); meusNegocios = []; }
  pintarPainel();
  sincronizarExtras();
  completarBusca();
  sincronizarPrincipal();
  pintarPlano();
  if (meusComunidade === null) carregarComunidade();
}
// Cartão do plano (primeira assinatura com +30 dias grátis / plano ou teste com os dias que faltam / pedido esperando o Pix /
// pedido de condição especial / sem plano). Link direto: negocios.html?planos=1
async function pintarPlano() {
  const box = $("planoBox");
  esquecerPlano(eu.uid);
  const [plano, pedido, neg, teste] = await Promise.all([lerPlano(fb, eu.uid), pedidoAberto(fb, eu.uid), lerNegociacao(fb, eu.uid), testeDisponivel(fb, eu.uid)]);
  const pago = nivelPlano(plano) > 0, nome = nomePlano(plano?.plano), dias = pago ? diasRestantes(plano) : 0;
  const mudou = planoEu === undefined || !!nivelPlano(planoEu) !== pago || String(perfisDoPlano(planoEu)) !== String(perfisDoPlano(plano));
  planoEu = plano || null;
  if (mudou) pintarPainel();
  const negAberta = neg && (neg.status === "novo" || neg.status === "em_conversa");
  // Condição aprovada com valor: falta pagar para o plano ligar (vem antes de tudo, menos de um Pix já gerado).
  const pagarNeg = !pedido && neg?.status === "aguardando_pagamento" && Number(neg.valorAcordado) > 0;
  if (pagarNeg) {
    const ic = el("span", "ng-plano-ic"); ic.appendChild(icone("estrela", "i"));
    const tx = el("span", "ng-plano-tx");
    tx.append(el("strong", null, `Condição aprovada: plano ${nomePlano(neg.planoConcedido)}`), el("small", null, `Falta pagar ${reais(neg.valorAcordado)} para ativar · toque para pagar`));
    const cta = el("span", "ng-plano-cta"); cta.append(document.createTextNode("Pagar"), icone("avancar", "i xs"));
    box.className = "ng-plano espera";
    box.replaceChildren(ic, tx, cta);
    box.hidden = false;
    box.onclick = () => abrirPlanos({ fb, eu, dados, toast, aoMudar: () => pintarPlano(), negociar: neg.tipo });
    return;
  }
  const ic = el("span", "ng-plano-ic"); ic.appendChild(pago ? seloPlano(plano) : icone("estrela", "i"));
  const tx = el("span", "ng-plano-tx");
  const ate = pago ? new Date(plano.ate.toMillis()).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "";
  tx.append(
    el("strong", null, pago && emTolerancia(plano) ? `Plano ${nome} venceu` : pago ? (plano.teste ? `Teste grátis do ${nome}` : `Plano ${nome} ativo`) : pedido ? `Pedido do ${nomePlano(pedido.plano)} aguardando o Pix` : negAberta ? "Pedido de condição especial enviado" : teste ? `Primeira assinatura: +${DIAS_TESTE} dias grátis` : plano?.teste ? "Seu teste grátis terminou" : "Sem plano ativo"),
    el("small", null, pago && emTolerancia(plano) ? "Renove em até 3 dias para não perder o selo, o destaque e os outros perfis no ar" : pago ? `${plano.teste ? "Termina" : "Vence"} em ${ate}` : pedido ? `${reais(pedido.valor)} · toque para ver o código Pix` : negAberta ? "A equipe está avaliando · toque para ver" : teste ? `${meusNegocios.length > 1 ? "Sem plano, só um perfil fica no ar. " : ""}Assine o Plus, o Pro ou o Premium e ganhe ${DIAS_TESTE} dias a mais, grátis` : `Sem plano, só um perfil de negócio fica no ar. Assine a partir de ${reais(PRECO_MIN)}/mês para ter todos, o selo e o destaque`)
  );
  if (pago) {
    const f = el("span", "ng-plano-falta" + (dias <= 7 ? " perto" : ""), emTolerancia(plano) ? "Venceu" : textoFalta(dias).replace(/^./, (c) => c.toUpperCase()));
    const barra = el("span", "ng-plano-barra"); const i = el("i"); i.style.width = Math.max(3, Math.min(100, (dias / Math.max(dias, (Number(plano.meses) || 1) * 30)) * 100)) + "%"; barra.appendChild(i);
    tx.append(f, barra);
  }
  const cta = el("span", "ng-plano-cta"); cta.append(document.createTextNode(pago ? (plano.teste ? "Assinar" : "Renovar") : pedido ? "Ver Pix" : negAberta ? "Ver" : "Ver planos"), icone("avancar", "i xs"));
  box.className = "ng-plano" + (pago ? " pro" + (dias <= 7 ? " perto" : "") : pedido || negAberta ? " espera" : "");
  box.replaceChildren(ic, tx, cta);
  box.hidden = false;
  box.onclick = () => abrirPlanos({ fb, eu, dados, toast, aoMudar: () => pintarPlano(), negociar: !pago && !pedido && negAberta ? neg.tipo : undefined });
}
// ---------- um perfil no ar sem plano ----------
// Sem plano ativo, só o perfil "principal" aparece para os clientes (os outros ficam pausados, nada é apagado).
// O dono escolhe qual (usuarios.negocioPrincipal); sem escolha vale o mais antigo. Cada perfil guarda o tipo escolhido
// em negocios.principal, que as vitrines leem: assim o plano pode vencer sem o dono abrir o site.
let planoEu; // undefined = ainda não leu; null = sem plano
const msN = (t) => t?.toMillis?.() ?? (t?.seconds || 0) * 1000;
function principalEscolhido(lista = meusNegocios) {
  const tipos = lista.map((n) => n.tipo);
  if (tipos.includes(dados.negocioPrincipal)) return dados.negocioPrincipal;
  const marcado = lista.find((n) => tipos.includes(n.principal))?.principal;
  if (marcado) return marcado;
  return [...lista].sort((a, b) => (msN(a.criadoEm) || Infinity) - (msN(b.criadoEm) || Infinity))[0]?.tipo || null;
}
const semPlano = () => planoEu !== undefined && !nivelPlano(planoEu);
// Plano combinado com a equipe pode liberar só alguns perfis (planos.tipos): os outros ficam pausados como sem plano.
const foraDoPlano = (n) => { const t = perfisDoPlano(planoEu); return !!t && !t.includes(n.tipo); };
const pausadoAqui = (n) => meusNegocios.length > 1 && n.tipo !== principalEscolhido() && (semPlano() || foraDoPlano(n));
// Leva a escolha para todos os perfis (sem as regras novas, a gravação é recusada e tenta de novo na próxima visita).
function sincronizarPrincipal() {
  const p = principalEscolhido();
  if (!p) return;
  for (const n of meusNegocios) if (n.principal !== p) fb.updateDoc(fb.doc(fb.db, "negocios", n.id), { principal: p }).then(() => { n.principal = p; }).catch(() => {});
}
async function deixarNoAr(n) {
  const atual = meusNegocios.find((x) => x.tipo === principalEscolhido());
  const ok = await confirmarHF({
    titulo: `Deixar "${n.nome || NEGOCIOS[n.tipo].rotulo}" no ar?`,
    texto: `Sem plano, só um perfil de negócio fica no ar.${atual ? ` "${atual.nome || NEGOCIOS[atual.tipo].rotulo}" fica pausado: sai das vitrines e da busca, mas nada é apagado.` : ""} Com um plano, todos voltam ao ar.`,
    ok: "Deixar no ar", icone: "check", cor: "normal"
  });
  if (!ok) return;
  try {
    await fb.setDoc(fb.doc(fb.db, "usuarios", eu.uid), { negocioPrincipal: n.tipo }, { merge: true });
    dados.negocioPrincipal = n.tipo;
    sincronizarPrincipal();
    pintarPainel();
    toast(`"${n.nome || NEGOCIOS[n.tipo].rotulo}" está no ar`);
  } catch (e) { toast("Não foi possível trocar: " + erroAmigavel(e)); }
}
const verPlanos = (plano) => abrirPlanos({ fb, eu, dados, toast, plano: typeof plano === "string" ? plano : undefined, aoMudar: () => pintarPlano() });
// Aviso "isso é do Plus" com o atalho para assinar (perfil grátis: o que passa do limite fica guardado e não aparece).
function notaPlus(texto, classe = "") {
  const d = el("div", "ng-plus-nota" + (classe ? " " + classe : ""));
  const b = el("button", "ng-plus-bt"); b.type = "button"; b.append(el("b", null, "PLUS"), document.createTextNode("Ver o Plus"));
  b.addEventListener("click", () => verPlanos("plus"));
  d.append(icone("estrela", "i xs"), el("span", null, texto), b);
  return d;
}
// Para anunciar é preciso ter a conta verificada (selo azul): documento conferido pela equipe.
async function exigirVerificacao() {
  if (dados.verificado) return true;
  const ok = await confirmarHF({
    titulo: "Verifique sua conta para anunciar",
    texto: "Para criar perfis de negócio e anúncios, a conta precisa ser verificada: a equipe confere seu documento e você ganha o selo azul. Isso protege os clientes contra golpes e perfis falsos.",
    ok: "Verificar agora", icone: "selo", cor: "normal"
  });
  if (ok) import("./verificacao.js?v=25").then((m) => m.abrirVerificacao({ aoMudar: () => { pintarPainel(); } })).catch((e) => toast(erroAmigavel(e)));
  return false;
}

// Campos novos guardados na conta enquanto as regras não estavam publicadas: tenta levar para o perfil.
async function sincronizarExtras() {
  for (const n of meusNegocios) {
    const p = extrasPendentes(n.id);
    if (!p) continue;
    try {
      await fb.setDoc(fb.doc(fb.db, "negocios", n.id), { ...p, atualizadoEm: fb.serverTimestamp() }, { merge: true });
      Object.assign(n, p);
      await fb.setDoc(fb.doc(fb.db, "usuarios", eu.uid), { negociosExtras: { [n.id]: fb.deleteField() } }, { merge: true });
      delete dados.negociosExtras[n.id];
    } catch { return; } // ainda sem as regras novas
  }
}

// ---------- painel ----------
let numeros = { resumos: {}, reclamacoes: {}, anuncios: 0, stats: null };
async function carregarNumeros() {
  try {
    const [resumos, avs, resp, ans] = await Promise.all([
      lerResumos(fb, meusNegocios.map((n) => "neg_" + n.id), { recarregar: true }),
      fb.getDocs(fb.query(fb.collection(fb.db, "avaliacoes"), fb.where("alvoId", "==", eu.uid), fb.limit(300))).catch(() => ({ docs: [] })),
      Promise.resolve(null),
      meusNegocios.some((n) => n.tipo === "imoveis") ? buscarAnuncios(fb, eu.uid).catch(() => []) : Promise.resolve([])
    ]);
    const recl = avs.docs.map((d) => ({ id: d.id, ...d.data() })).filter((a) => a.tipo === "negocio" && a.nota <= 2);
    const respondidas = new Set();
    await Promise.all(recl.map(async (r) => { try { if ((await fb.getDoc(fb.doc(fb.db, "reclamacoes", r.id))).exists()) respondidas.add(r.id); } catch {} }));
    const porNeg = {};
    recl.forEach((r) => { porNeg[r.negocioId] = porNeg[r.negocioId] || { total: 0, pendentes: 0 }; porNeg[r.negocioId].total++; if (!respondidas.has(r.id)) porNeg[r.negocioId].pendentes++; });
    const stats = await lerStats(fb, eu.uid).catch(() => null);
    numeros = { resumos, reclamacoes: porNeg, anuncios: ans.length, stats };
  } catch (e) { console.warn("Números dos negócios:", e); }
  pintarPainel();
}
// O que falta para o perfil ficar completo (o que mais pesa para o cliente escolher).
function completude(n) {
  const itens = n.itens || [], fotos = n.fotos || [];
  const temSemana = Array.isArray(n.semana) && n.semana.some(Boolean);
  const lista = [
    ["Foto ou logo", !!urlSegura(n.foto)],
    ["Descrição", String(n.descricao || "").trim().length >= 40],
    ["WhatsApp", !!String(n.whatsapp || "").trim()],
    ["Bairro", !!n.bairro]
  ];
  if (n.tipo === "servicos") lista.push(["Serviços com preço", itens.some((i) => Number(i.preco) > 0)], ["Fotos de trabalhos", fotos.length > 0], ["Horário", temSemana || !!n.horario]);
  if (n.tipo === "delivery") lista.push(["3 itens no cardápio", itens.length >= 3], ["Fotos dos pratos", itens.some((i) => urlSegura(i.foto))], ["Foto de capa", fotos.length > 0], ["Horário", temSemana || !!(n.horaAbre && n.horaFecha)]);
  if (n.tipo === "lojinha") lista.push(["3 produtos", itens.length >= 3], ["Fotos dos produtos", itens.length > 0 && itens.every((i) => urlSegura(i.foto))], ["Formas de pagamento", (n.pagamentos || []).length > 0], ["Horário", temSemana]);
  if (n.tipo === "imoveis") lista.push(["Um imóvel anunciado", numeros.anuncios > 0], ["CRECI", n.tipoAnunciante === "proprietario" || !!n.creci]);
  if (n.tipo === "saude") {
    const sd = n.saude || {};
    lista.push(["Registro no conselho", !conselhoDe(sd) || !!textoRegistro(sd)], ["Especialidades", (sd.especialidades || []).length > 0], ["Valor ou convênios", Number(sd.valorConsulta) > 0 || (sd.convenios || []).length > 0], ["Consultas e procedimentos", itens.length > 0], ["Horário", temSemana]);
  }
  const feitos = lista.filter((x) => x[1]).length;
  return { pct: Math.round((feitos / lista.length) * 100), faltam: lista.filter((x) => !x[1]).map((x) => x[0]) };
}
const linkNegocio = (n) => new URL(`${PAGINA_TIPO[n.tipo]}?negocio=${encodeURIComponent(n.id)}`, location.href).href;
// Link curto: helpfloripa.com.br/@seunome/tipo (404.html → link.html descobre de quem é o @). Sem @, o link longo.
const SLUG_TIPO = { servicos: "servicos", delivery: "delivery", lojinha: "loja", imoveis: "imoveis", saude: "saude" };
const meuNick = () => String(dados.nickname || "").toLowerCase();
const linkCurto = (n) => (/^[a-z0-9._]{3,30}$/.test(meuNick()) ? `${location.origin}/@${meuNick()}/${SLUG_TIPO[n.tipo]}` : linkNegocio(n));
// Compartilhar manda a arte (foto, nome, QR e link) junto com o texto: no WhatsApp chega a imagem com o link.
const COR_TIPO = { servicos: "#00adee", delivery: "#ff7a1a", lojinha: "#b066ff", imoveis: "#2fbf71", saude: "#0fb5a6" };
const dadosArte = (n) => ({ nome: n.nome || NEGOCIOS[n.tipo].rotulo, rotulo: NEGOCIOS[n.tipo].rotulo, cor: COR_TIPO[n.tipo] || "#00adee", url: linkCurto(n), foto: urlSegura(n.foto) });
async function compartilharNegocio(n) {
  try {
    const r = await compartilharPerfil({ ...dadosArte(n), arquivo: `${SLUG_TIPO[n.tipo]}-${meuNick() || "perfil"}.png` });
    if (r === "copiado") toast("Link do perfil copiado");
  } catch { toast("Não foi possível compartilhar agora."); }
}
// Folha "Link e QR Code": link curto para copiar/compartilhar e o QR Code (para cartão de visita, adesivo, cardápio...)
// com uma arte pronta para baixar e imprimir (PNG 1080×1350 nas cores do site).
async function abrirLinkQr(n) {
  const url = linkCurto(n), curto = url !== linkNegocio(n), t = NEGOCIOS[n.tipo];
  criarFolha("folhaLinkQr", { titulo: "Link e QR Code do perfil", corpoClasse: "folha-corpo pad" });
  const corpo = $("c_folhaLinkQr");
  corpo.replaceChildren();
  const caixa = el("div", "lq-caixa"); caixa.dataset.tipo = n.tipo;
  const lk = el("div", "lq-link"); lk.append(el("small", null, curto ? "Seu link curto" : "Link do perfil"), el("strong", null, url.replace(/^https?:\/\//, "")));
  const acoes = el("div", "lq-acoes");
  const bCop = btnIc("btn pri mini", "link", "Copiar link");
  bCop.addEventListener("click", async () => { try { await navigator.clipboard.writeText(url); toast("Link copiado"); } catch { toast(url); } });
  const bComp = btnIc("btn sec mini", "compartilhar", "Enviar com o QR");
  bComp.addEventListener("click", () => compartilharNegocio(n));
  acoes.append(bCop, bComp);
  const qrBox = el("div", "lq-qr"); qrBox.setAttribute("aria-label", "QR Code do perfil");
  const bBaixar = btnIc("btn sec mini", "imagem", "Baixar para imprimir");
  caixa.append(lk, acoes, qrBox, el("p", "lq-dica", "Use no cartão de visita, no balcão, no cardápio ou no Instagram: quem aponta a câmera do celular abre o seu perfil."), bBaixar);
  if (!curto) caixa.appendChild(el("p", "lq-aviso", "Crie o seu @ em Editar perfil para ter um link curto, como helpfloripa.com.br/@seunome."));
  corpo.appendChild(caixa);
  abrirFolha("folhaLinkQr");
  try {
    const cv = document.createElement("canvas"); cv.width = cv.height = 600;
    await desenharQr(cv.getContext("2d"), 0, 0, 600, url);
    qrBox.appendChild(cv);
    bBaixar.addEventListener("click", async () => {
      try { await baixarArte(dadosArte(n), `qr-${SLUG_TIPO[n.tipo]}-${meuNick() || "perfil"}.png`); toast("Arte com o QR Code baixada"); }
      catch { toast("Não foi possível baixar agora."); }
    });
  } catch (e) { qrBox.replaceChildren(el("p", "lq-aviso", "Não foi possível gerar o QR Code agora.")); console.warn(e); }
}
function btnIc(classe, ic, texto, tag = "button") {
  const b = el(tag, classe);
  if (tag === "button") b.type = "button";
  b.append(icone(ic, "i xs"));
  if (texto) b.append(document.createTextNode(texto));
  return b;
}
// Quem já anunciava sem conta verificada tem até esta data para verificar; depois a equipe tira os perfis do ar.
const PRAZO_VERIFICACAO = new Date("2026-11-30T23:59:00-03:00");
function avisoVerificacao() {
  document.getElementById("ngVerif")?.remove();
  if (dados.verificado || !meusNegocios.length) return;
  const d = el("div", "ng-verif"); d.id = "ngVerif";
  const b = btnIc("btn pri mini", "selo", "Verificar minha conta");
  b.addEventListener("click", () => import("./verificacao.js?v=25").then((m) => m.abrirVerificacao({ aoMudar: () => pintarPainel() })));
  d.append(el("strong", null, "Verifique sua conta para continuar anunciando"),
    el("span", null, `Agora todo anunciante do Help Floripa tem a conta verificada (selo azul). Verifique até ${PRAZO_VERIFICACAO.toLocaleDateString("pt-BR")}: depois disso, perfis de contas não verificadas saem do ar. Nada é apagado.`), b);
  $("painelNegocios").before(d);
}
function pintarPainel() {
  avisoVerificacao();
  const grade = $("painelNegocios"), criar = $("criarNegocios"), slots = $("slotsNegocios");
  grade.replaceChildren(); criar.replaceChildren(); slots.replaceChildren();
  Object.entries(NEGOCIOS).forEach(([tipo, t]) => {
    const n = meusNegocios.find((x) => x.tipo === tipo);
    // Faixa do topo: um lugar por tipo, aceso quando criado.
    const sl = el(n ? "a" : "button", `ng-slot ${tipo}${n ? " feito" : ""}`);
    const slIc = el("span", "ic"); slIc.appendChild(icone(tipo, "i xs"));
    sl.append(slIc, el("span", null, t.rotulo), el("small", "st" + (n && pausadoAqui(n) ? " pausa" : ""), n ? (pausadoAqui(n) ? "Pausado" : "No ar") : "+ Criar"));
    if (n) { sl.href = "#neg-" + tipo; sl.title = `${t.rotulo}: criado`; }
    else { sl.type = "button"; sl.title = `Criar ${t.rotulo}`; sl.addEventListener("click", () => novoNegocio(tipo)); }
    slots.appendChild(sl);

    if (!n) {
      // Cartão de criar: foto e cor da classe, chamada e o que o perfil oferece.
      const c = el("button", `ng-novo ${tipo}`); c.type = "button";
      c.style.setProperty("--img", `url("${t.img}")`);
      const ic = el("span", "ng-novo-ic"); ic.appendChild(icone(tipo, "i"));
      const topo = el("div", "ng-novo-topo"); topo.append(ic, el("span", "ng-novo-tag", t.rotulo));
      const pts = el("ul", "ng-novo-pts");
      t.pontos.forEach((p) => { const li = el("li"); li.append(icone("check", "i xs"), document.createTextNode(p)); pts.appendChild(li); });
      const cta = el("span", "ng-novo-cta"); cta.append(document.createTextNode(t.cta), icone("avancar", "i xs"));
      c.append(topo, el("strong", null, t.chamada), el("small", null, t.frase), pts, cta);
      c.addEventListener("click", () => novoNegocio(tipo));
      criar.appendChild(c);
      return;
    }
    const c = el("article", `neg-card ${tipo}`);
    c.id = "neg-" + tipo;
    const capa = el("div", "capa");
    // A capa escolhida pelo dono (ou a guardada na conta enquanto as regras não estavam no ar); sem capa, a 1ª foto.
    const capaN = urlSegura(n.capa || extrasPendentes(n.id)?.capa);
    const f = capaN || urlSegura((n.fotos || [])[0]) || t.img;
    capa.style.setProperty("--img", `url("${f}")`);
    if (capaN && semPlano()) { const cp = el("span", "ng-capa-plus"); cp.append(el("b", null, "PLUS"), document.createTextNode("Capa visível com plano")); capa.appendChild(cp); }
    const tag = el("span", "tag"); tag.append(icone(tipo, "i xs"), document.createTextNode(t.rotulo));
    capa.appendChild(tag);
    const oculto = (n.ocultoAte?.toMillis?.() ?? 0) > Date.now(), pausado = !oculto && pausadoAqui(n);
    const st = el("span", "ng-status" + (oculto ? " off" : pausado ? " pausa" : ""));
    st.append(el("i"), document.createTextNode(oculto ? "Fora do ar" : pausado ? "Pausado" : "No ar"));
    capa.appendChild(st);
    const corpo = el("div", "corpo");
    const av = el("div", "avatar"); pintarAvatar(av, n.foto, n.nome);
    const resumo = numeros.resumos["neg_" + n.id];
    const rec = numeros.reclamacoes[n.id] || { total: 0, pendentes: 0 };
    const nums = el("div", "nums");
    const bloco = (valor, rot, alerta) => { const d = el("div", alerta ? "alerta" : null); d.append(el("b", null, valor), el("span", null, rot)); return d; };
    const qtd = (n.itens || []).length;
    nums.append(
      bloco(resumo?.total ? notaTexto(media(resumo)) : "–", "nota"),
      bloco(String(resumo?.total || 0), resumo?.total === 1 ? "avaliação" : "avaliações"),
      tipo === "imoveis" ? bloco(String(numeros.anuncios), numeros.anuncios === 1 ? "anúncio" : "anúncios")
        : bloco(String(qtd), { servicos: qtd === 1 ? "serviço" : "serviços", delivery: qtd === 1 ? "item" : "itens", lojinha: qtd === 1 ? "produto" : "produtos", saude: qtd === 1 ? "atendimento" : "atendimentos" }[tipo])
    );
    // Quanto do perfil está preenchido e o que falta.
    const comp = completude(n);
    const cp = el("div", "ng-comp" + (comp.pct === 100 ? " ok" : ""));
    const cpTopo = el("div", "ng-comp-topo");
    cpTopo.append(el("strong", null, comp.pct === 100 ? "Perfil completo" : `Perfil ${comp.pct}% completo`), el("span", null, comp.pct === 100 ? "" : `${comp.faltam.length} ${comp.faltam.length === 1 ? "item" : "itens"}`));
    const barra = el("div", "ng-comp-barra"); const enc = el("i"); enc.style.width = comp.pct + "%"; barra.appendChild(enc);
    cp.append(cpTopo, barra);
    if (comp.faltam.length) {
      const falta = el("button", "ng-comp-falta"); falta.type = "button";
      falta.append(el("span", null, "Falta: " + comp.faltam.slice(0, 3).join(", ") + (comp.faltam.length > 3 ? "…" : "")), icone("avancar", "i xs"));
      falta.addEventListener("click", () => abrirFormNegocio(n));
      cp.appendChild(falta);
    }
    // Últimos 30 dias (estat-negocio.js): visitas e contatos, com a variação.
    const est = el("button", "ng-est"); est.type = "button";
    const at = numeros.stats ? somarPeriodo(numeros.stats, n.id, listaDias(30)) : null;
    const an = numeros.stats ? somarPeriodo(numeros.stats, n.id, listaDias(30, 1)) : null;
    const varTxt = (a, b) => (!b ? (a ? "novo" : "") : `${a >= b ? "▲" : "▼"} ${Math.round(Math.abs((a - b) / b) * 100)}%`);
    const blocoE = (valor, rot, v) => { const d = el("span", "ng-est-n"); d.append(el("b", null, valor), el("small", null, rot)); if (v) d.appendChild(el("i", v.startsWith("▼") ? "desce" : "sobe", v)); return d; };
    if (semPlano()) {
      // Perfil grátis: sem números (as visitas já são contadas e aparecem ao assinar).
      est.classList.add("travado");
      est.append(el("span", "ng-est-vazio", "Quantas pessoas viram, de onde vieram e os horários de pico. Suas visitas já estão sendo contadas."), el("span", "ng-so-plus", "PLUS"));
    } else if (at) est.append(blocoE(String(at.v), at.v === 1 ? "visita" : "visitas", varTxt(at.v, an.v)), blocoE(String(at.contatos), at.contatos === 1 ? "contato" : "contatos", varTxt(at.contatos, an.contatos)), blocoE(at.v ? `${Math.round((at.contatos / at.v) * 100)}%` : "–", "taxa de contato"));
    else est.append(el("span", "ng-est-vazio", "Visitas, contatos, horários de pico e mais"));
    const estFim = el("span", "ng-est-ver"); estFim.append(icone("graf", "i xs"), document.createTextNode("Estatísticas"), icone("avancar", "i xs"));
    est.append(estFim);
    est.title = "Últimos 30 dias";
    est.addEventListener("click", () => (semPlano() ? verPlanos("plus") : abrirEstatisticas(n)));
    const acoes = el("div", "acoes");
    const bE = btnIc("btn mini ng-pri", "lapis", tipo === "imoveis" ? "Editar e anúncios" : "Editar");
    bE.addEventListener("click", () => abrirFormNegocio(n));
    const bV = btnIc("btn sec mini", "olho", "Vitrine", "a");
    bV.href = `${PAGINA_TIPO[tipo]}?negocio=${encodeURIComponent(n.id)}`;
    const bC = btnIc("btn sec mini ng-so-ic", "compartilhar", "");
    bC.setAttribute("aria-label", "Link e QR Code do perfil"); bC.title = "Link e QR Code do perfil";
    bC.addEventListener("click", () => abrirLinkQr(n));
    acoes.append(bE, bV, bC);
    if (rec.total) {
      const bR = btnIc("btn sec mini" + (rec.pendentes ? " ng-alerta" : ""), "alerta", rec.pendentes ? `Responder ${rec.pendentes} ${rec.pendentes === 1 ? "reclamação" : "reclamações"}` : "Reclamações", "a");
      bR.href = `reclamacoes.html?negocio=${encodeURIComponent(n.id)}`;
      acoes.appendChild(bR);
    }
    const cab = el("div", "ng-cab");
    const cabTx = el("div");
    cabTx.append(el("h3", null, n.nome || t.rotulo), el("div", "meta", [[n.bairro, n.cidade].filter(Boolean).join(", "), tipo === "servicos" && (n.categorias || []).length ? (n.categorias || []).map((k) => (k === "outros" ? n.categoriaPersonalizada : CATS_NEGOCIO.servicos[k])).filter(Boolean).slice(0, 2).join(" · ") : tipo === "saude" ? [n.saude?.profissao === "outros" ? n.saude.profissaoOutra : PROFISSOES_SAUDE[n.saude?.profissao]?.nome, textoRegistro(n.saude)].filter(Boolean).join(" · ") : n.categoria === "outros" ? n.categoriaPersonalizada || "" : CATS_NEGOCIO[tipo]?.[n.categoria] || ""].filter(Boolean).join(" · ") || t.desc));
    if (resumo?.total) cabTx.appendChild(estrelas(resumo));
    cab.append(av, cabTx);
    corpo.appendChild(cab);
    const stPromo = situacaoPromo(n);
    if (stPromo) corpo.appendChild(stPromo);
    // Sem plano e com mais de um perfil: este está pausado (escolher deixar este no ar ou assinar).
    if (pausado) {
      const av3 = el("div", "neg-aviso pausa");
      const bts = el("div", "neg-aviso-bts");
      const bAr = btnIc("btn mini ng-pri", "check", "Deixar este no ar"); bAr.addEventListener("click", () => deixarNoAr(n));
      const bPl = btnIc("btn sec mini", "estrela", "Ver planos"); bPl.addEventListener("click", verPlanos);
      bts.append(bAr, bPl);
      av3.append(el("strong", null, "Pausado: não aparece para os clientes"),
        el("span", null, foraDoPlano(n) ? "O plano combinado com a equipe libera só alguns perfis, e este não está entre eles. Nada foi apagado: fale com a equipe pelo Suporte, assine um plano ou troque qual fica no ar." : "Sem plano, só um perfil de negócio fica no ar. Nada foi apagado: assine um plano para ter todos no ar ou troque qual fica."), bts);
      corpo.appendChild(av3);
    }
    // Escondido da vitrine: pela equipe (moderação) ou porque a conta está desativada.
    if (oculto) {
      const av2 = el("div", "neg-aviso");
      const ln = el("a", null, "Falar com o suporte"); ln.href = "suporte.html";
      // Data-marca do painel (Verificações): fora do ar até a conta ser verificada; volta sozinho na aprovação.
      const semVerif = msN(n.ocultoAte) === new Date("2999-11-30T00:00:00Z").getTime();
      if (semVerif) { ln.textContent = "Verificar minha conta"; ln.href = "#ngVerif"; }
      av2.append(el("strong", null, semVerif ? "Fora do ar: verifique sua conta" : n.ocultoPelaEquipe ? "Escondido pela equipe" : "Escondido da vitrine"),
        el("span", null, semVerif ? "Para anunciar, a conta precisa ser verificada. Assim que a verificação for aprovada, o perfil volta sozinho. " : n.ocultoPelaEquipe ? "Este perfil não aparece para os clientes por violar os Termos de Uso. " : "Este perfil não aparece para os clientes enquanto a conta estiver desativada. "), ln);
      corpo.appendChild(av2);
    }
    const estTit = el("div", "ng-est-tit"); estTit.append(el("span", null, "Últimos 30 dias"));
    corpo.append(nums, estTit, est, cp, acoes);
    c.append(capa, corpo);
    grade.appendChild(c);
  });
  cartaoComunidade(grade, criar, slots);
  const total = meusNegocios.length;
  const nTipos = Object.keys(NEGOCIOS).length;
  $("resumoNegocios").textContent = total === nTipos ? `Você tem os ${nTipos} tipos de perfil. Mantenha todos completos e atualizados.`
    : total ? `${total} de ${nTipos} perfis criados · você pode ter um de cada tipo` : "Crie seu primeiro perfil e apareça para quem procura na sua região.";
  $("titSeus").hidden = !total;
  // Resumo dos 30 dias de todos os negócios, no topo.
  const resumo = $("resumoEstat");
  resumo.replaceChildren();
  if (total && numeros.stats && !semPlano()) {
    const soma = (desl) => meusNegocios.reduce((t, n) => { const r = somarPeriodo(numeros.stats, n.id, listaDias(30, desl)); return { v: t.v + r.v, c: t.c + r.contatos }; }, { v: 0, c: 0 });
    const a = soma(0), b = soma(1);
    const item = (valor, rot, antes) => { const d = el("div", "ng-res-item"); d.append(el("b", null, valor.toLocaleString("pt-BR")), el("span", null, rot)); if (antes || valor) d.appendChild(el("small", valor >= antes ? "sobe" : "desce", !antes ? "novo" : `${valor >= antes ? "▲" : "▼"} ${Math.round(Math.abs((valor - antes) / antes) * 100)}%`)); return d; };
    resumo.append(item(a.v, "visitas em 30 dias", b.v), item(a.c, "contatos", b.c));
    const ver = el("button", "ng-res-ver"); ver.type = "button"; ver.append(icone("graf", "i xs"), document.createTextNode("Ver estatísticas"));
    ver.addEventListener("click", () => escolherEstatisticas());
    resumo.appendChild(ver);
  }
  resumo.hidden = !resumo.children.length;
  $("titCriar").hidden = total >= nTipos;
  $("titCriarTx").textContent = total ? "Crie mais um perfil" : "Escolha por onde começar";
}
// Comunidade no painel: lugar no topo, cartão de criar (com o aviso de que é proibido vender) ou o resumo dos anúncios.
function cartaoComunidade(grade, criar, slots) {
  const n = (meusComunidade || []).length;
  const sl = el("a", `ng-slot comunidade${n ? " feito" : ""}`);
  const slIc = el("span", "ic"); slIc.appendChild(icone("comunidade", "i xs"));
  sl.append(slIc, el("span", null, "Comunidade"), el("small", "st", n ? `${n} ${n === 1 ? "anúncio" : "anúncios"}` : "+ Anunciar"));
  sl.href = n ? "comunidade.html?meus=1" : "comunidade.html?novo=doacao"; sl.title = n ? "Comunidade: seus anúncios" : "Anunciar na Comunidade";
  slots.appendChild(sl);
  const aviso = () => { const a = el("div", "ng-com-aviso"); a.append(icone("alerta", "i xs"), el("span", null, "Proibido vender ou cobrar. Quem descumpre é banido da Comunidade.")); return a; };
  if (!n) {
    const c = el("a", "ng-novo comunidade"); c.href = "comunidade.html?novo=doacao";
    c.style.setProperty("--img", 'url("comunidade.svg")');
    const ic = el("span", "ng-novo-ic"); ic.appendChild(icone("comunidade", "i"));
    const topo = el("div", "ng-novo-topo"); topo.append(ic, el("span", "ng-novo-tag", "Comunidade"));
    const pts = el("ul", "ng-novo-pts");
    ["Doações e trocas de graça", "Pedidos de ajuda e achados e perdidos", "Vagas em quarto compartilhado"].forEach((p) => { const li = el("li"); li.append(icone("check", "i xs"), document.createTextNode(p)); pts.appendChild(li); });
    const cta = el("span", "ng-novo-cta"); cta.append(document.createTextNode("Abrir a Comunidade"), icone("avancar", "i xs"));
    const av = aviso(); av.classList.add("ng-novo-aviso");
    c.append(topo, el("strong", null, "Doe, troque e ajude"), el("small", null, "O mural do bairro: o que sobra na sua casa pode ser o que falta na do vizinho."), pts, av, cta);
    criar.appendChild(c);
    return;
  }
  const c = el("article", "neg-card comunidade");
  const capa = el("div", "capa"); capa.style.setProperty("--img", 'url("comunidade.svg")');
  const tag = el("span", "tag"); tag.append(icone("comunidade", "i xs"), document.createTextNode("Comunidade")); capa.appendChild(tag);
  const corpo = el("div", "corpo");
  const cab = el("div", "ng-cab"); const tx = el("div");
  tx.append(el("h3", null, `${n} ${n === 1 ? "anúncio ativo" : "anúncios ativos"}`), el("div", "meta", "Doações, trocas, pedidos, quartos e achados e perdidos"));
  cab.appendChild(tx);
  const acoes = el("div", "acoes");
  const bV = btnIc("btn mini ng-pri", "olho", "Meus anúncios", "a"); bV.href = "comunidade.html?meus=1";
  const bN = btnIc("btn sec mini", "mais", "Novo anúncio", "a"); bN.href = "comunidade.html?novo=doacao";
  acoes.append(bV, bN);
  const av = aviso(); av.classList.add("ng-com-aviso");
  corpo.append(cab, av, acoes);
  c.append(capa, corpo);
  grade.appendChild(c);
}
// Anunciar é permitido a partir de 18 anos (a data vem do cadastro).
function maiorDeIdade() {
  const d = dados.dataNascimento;
  if (!d) return true;
  const n = new Date(d + "T00:00:00"), h = new Date();
  if (isNaN(n.getTime())) return true;
  let i = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) i--;
  return i >= 18;
}
// Estatísticas do negócio (insights-negocio.js, carregado só quando abre).
// Quem chega pelo link (negocios.html?insights=ID) pode chegar antes do plano ser lido: lê antes de decidir.
async function garantirPlano() { if (planoEu === undefined) planoEu = (await lerPlano(fb, eu.uid).catch(() => null)) || null; }
async function abrirEstatisticas(n) {
  await garantirPlano();
  if (semPlano()) { verPlanos("plus"); return; } // estatísticas fazem parte dos planos
  try {
    const { abrirInsightsNegocio } = await import("./insights-negocio.js?v=36");
    abrirInsightsNegocio(n, { aoEditar: (neg) => abrirFormNegocio(meusNegocios.find((x) => x.id === neg.id) || neg) });
  } catch (e) { toast("Não foi possível abrir as estatísticas: " + erroAmigavel(e)); }
}
async function escolherEstatisticas() {
  await garantirPlano();
  if (semPlano()) { verPlanos("plus"); return; }
  if (!meusNegocios.length) { toast("Crie um perfil de negócio para ver as estatísticas."); return; }
  if (meusNegocios.length === 1) { abrirEstatisticas(meusNegocios[0]); return; }
  criarFolha("folhaEscolherEst", { titulo: "Estatísticas de qual negócio?", corpoClasse: "folha-corpo pad" });
  const corpo = $("c_folhaEscolherEst");
  corpo.replaceChildren();
  meusNegocios.forEach((n) => {
    const b = el("button", `ng-escolha ${n.tipo}`); b.type = "button";
    const av = el("div", "avatar"); pintarAvatar(av, n.foto, n.nome);
    const r = numeros.stats ? somarPeriodo(numeros.stats, n.id, listaDias(30)) : null;
    const tx = el("span", "tx"); tx.append(el("strong", null, n.nome || NEGOCIOS[n.tipo].rotulo), el("small", null, NEGOCIOS[n.tipo].rotulo + (r ? ` · ${r.v} visitas em 30 dias` : "")));
    b.append(av, tx, icone("avancar", "i xs"));
    b.addEventListener("click", () => { fecharFolha("folhaEscolherEst"); setTimeout(() => abrirEstatisticas(n), 200); });
    corpo.appendChild(b);
  });
  abrirFolha("folhaEscolherEst");
}
$("atalhoEstat").addEventListener("click", () => escolherEstatisticas());
async function novoNegocio(tipo) {
  if (!maiorDeIdade()) { toast("Para criar um perfil de negócio é preciso ter 18 anos ou mais."); return; }
  if (!(await exigirVerificacao())) return;
  if (semPlano() && meusNegocios.length) {
    const atual = meusNegocios.find((x) => x.tipo === principalEscolhido());
    const ok = await confirmarHF({
      titulo: "Sem plano, só um perfil fica no ar",
      texto: `"${atual?.nome || "Seu perfil atual"}" continua no ar. O novo perfil fica pausado (fora das vitrines e da busca) até você assinar um plano ou escolher deixá-lo no ar no lugar do outro. Nada é apagado.`,
      ok: "Criar pausado", icone: "info", cor: "normal"
    });
    if (!ok) return;
  }
  abrirFormNegocio(null);
  if (tipo && NEGOCIOS[tipo]) escolherTipo(tipo);
}

// =====================================================
// Formulário (o mesmo que ficava no perfil)
// =====================================================
let negEditando = null, negTipo = "servicos", negFoto = "", negCapa = "", negSemana = ["", "", "", "", "", "", ""], negPromo = null;
// Campos novos (Instagram, site, CNPJ, capa, horário por dia e promoção): sem as regras novas publicadas,
// ficam guardados na conta (usuarios.negociosExtras) e vão para o perfil sozinhos depois (sincronizarExtras).
const NOVOS_NEG = ["instagram", "site", "cnpj", "capa", "semana", "promocao", "geo", "busca", "principal"];
// Palavras da busca nacional (busca.js): nome, áreas/categorias, profissão de saúde, tipo, cidade, bairro e descrição.
function buscaDoNegocio(d) {
  const ks = Array.isArray(d.categorias) && d.categorias.length ? d.categorias : d.categoria ? [d.categoria] : [];
  const cats = ks.map((k) => (k === "outros" ? d.categoriaPersonalizada : CATS_NEGOCIO[d.tipo]?.[k] || ""));
  const sd = d.saude || {};
  const saude = d.tipo === "saude" ? [sd.profissao === "outros" ? sd.profissaoOutra : PROFISSOES_SAUDE[sd.profissao]?.nome, ...(sd.especialidades || [])] : [];
  const sinonimos = d.tipo === "servicos" ? ks.map((k) => PALAVRAS_SERV[k] || "") : [];
  return termosBusca([d.nome, cats, saude, NEGOCIOS[d.tipo]?.rotulo, d.cidade, d.bairro, sinonimos, d.descricao]);
}
const buscaDoAnuncio = (a) => termosBusca([a.titulo, a.categoriaPersonalizada || CATS_NEGOCIO.imoveis[a.categoria], FINALIDADES[a.finalidade], "imóvel", a.bairro, a.cidade, a.descricao]);
// Perfis e anúncios criados antes da busca nacional ganham as palavras sozinhos quando o dono abre Meus negócios.
// Sem as regras novas publicadas a gravação é recusada em silêncio e tenta de novo na próxima visita.
async function completarBusca() {
  for (const n of meusNegocios) if (!Array.isArray(n.busca) && n.nome) fb.updateDoc(fb.doc(fb.db, "negocios", n.id), { busca: buscaDoNegocio(n) }).then(() => { n.busca = true; }).catch(() => {});
  if (!meusNegocios.some((n) => n.tipo === "imoveis")) return;
  for (const a of await buscarAnuncios(fb, eu.uid).catch(() => [])) if (!Array.isArray(a.busca)) fb.updateDoc(fb.doc(fb.db, "anuncios", a.id), { busca: buscaDoAnuncio(a) }).catch(() => {});
}
// Ponto do endereço para o "Perto de você": reaproveita o anterior se o endereço não mudou; senão procura
// (OpenStreetMap). Sem rua nem CEP, fica sem ponto e vale o centro da cidade.
const MESMO_END = ["rua", "numero", "bairro", "cidadeIbge", "cep"];
async function pontoDoEndereco(loc, antigo) {
  if (antigo && geoOk(antigo.geo) && MESMO_END.every((k) => String(antigo[k] ?? "") === String(loc[k] ?? ""))) return antigo.geo;
  return (await geocodificar(loc).catch(() => null)) || null;
}
const extrasPendentes = (id) => (dados.negociosExtras && typeof dados.negociosExtras === "object" ? dados.negociosExtras[id] : null) || null;
function abrirFormNegocio(n, { promo = false } = {}) {
  if (n) { const p = extrasPendentes(n.id); if (p) n = { ...n, ...Object.fromEntries(Object.entries(p).filter(([k]) => NOVOS_NEG.includes(k) && !n[k])) }; }
  negEditando = n;
  areasBusca = ""; areasAbertos = null;
  const usados = new Set(meusNegocios.map((x) => x.tipo));
  negTipo = n ? n.tipo : Object.keys(NEGOCIOS).find((k) => !usados.has(k)) || "servicos";
  negFoto = n?.foto || "";
  pintarTipos(n ? [n.tipo] : Object.keys(NEGOCIOS), n ? new Set() : usados);
  $("negTipoAjuda").textContent = n ? "O tipo não pode ser trocado depois de criado." : semPlano() && meusNegocios.length ? "Você pode ter um perfil de cada tipo. Sem plano, só um fica no ar." : "Você pode ter um perfil de cada tipo.";
  $("tNegocio").textContent = n ? "Editar perfil de negócio" : "Novo perfil de negócio";
  $("negNome").value = n?.nome || "";
  aplicarTipoNoForm();
  $("negDesc").value = n?.descricao || "";
  $("negDescCont").textContent = `${$("negDesc").value.length}/500`;
  // Local do negócio: começa pelo do próprio negócio ou, num perfil novo, pela cidade da conta.
  $("negLocal").replaceChildren();
  negLocal = camposEndereco($("negLocal"), {
    campos: ["cep", "uf", "cidade", "bairro", "rua", "numero", "complemento"],
    valor: n ? { cep: n.cep, uf: n.uf, cidade: n.cidade, cidadeIbge: n.cidadeIbge, bairro: n.bairro, rua: n.rua, numero: n.numero, complemento: n.complemento } : { uf: dados.uf, cidade: nomeCidade(dados.cidade), cidadeIbge: dados.cidadeIbge },
    dicaCep: "Opcional: o CEP preenche estado, cidade, bairro e rua"
  });
  $("negWhats").value = n?.whatsapp || "";
  $("negInsta").value = n?.instagram || "";
  $("negSite").value = n?.site || "";
  $("negCnpj").value = mascaraCnpj(n?.cnpj || "");
  conferirCnpj();
  negCapa = n?.capa || "";
  pintarCapaNegocio();
  negSemana = semanaInicial(n);
  montarHorario();
  const pr = n?.promocao;
  // Promoção vencida: fica desligada, com a data de fim anterior à vista; ao religar, começa com um prazo novo.
  const fimPr = msPromo(pr?.ate), prNoAr = fimPr > Date.now();
  negPromo = pr?.titulo ? { titulo: pr.titulo, texto: pr.texto || "", codigo: pr.codigo || "", ate: prNoAr ? dataInput(new Date(fimPr)) : dataInput(null), ativa: prNoAr, terminou: prNoAr ? 0 : fimPr } : null;
  montarPromo();
  $("negExcluir").hidden = !n;
  negExtra = JSON.parse(JSON.stringify({ ...(n || {}), criadoEm: null, atualizadoEm: null }));
  negExtra.fotos = Array.isArray(negExtra.fotos) ? negExtra.fotos : [];
  negExtra.itens = Array.isArray(negExtra.itens) ? negExtra.itens : [];
  pintarFotoNegocio();
  montarExtras();
  abrirFolha("folhaNegocio");
  if (promo) setTimeout(() => $("negPromo")?.scrollIntoView({ block: "center", behavior: "smooth" }), 300);
}

// ---------- campos próprios de cada tipo ----------
const CATS_NEGOCIO = {
  servicos: { ...CATEGORIAS.servicos, outros: "Outra (escrever)" },
  delivery: { hamburguer: "Hambúrguer", pizza: "Pizza", sushi: "Sushi", doces: "Doces", bebidas: "Bebidas", outros: "Outra (escrever)" },
  lojinha: { roupas: "Moda e roupas", calcados: "Calçados", acessorios: "Acessórios", beleza: "Beleza", eletronicos: "Eletrônicos", casa: "Casa e decoração", mercado: "Mercado", artesanato: "Artesanato", infantil: "Infantil", esportes: "Esportes", outros: "Outra (escrever)" },
  imoveis: { apartamento: "Apartamento", casa: "Casa", kitnet: "Kitnet", terreno: "Terreno", comercial: "Comercial", outros: "Outro (escrever)" },
  saude: CATEGORIAS_SAUDE
};
// "Outra (escrever)": o que a pessoa escreve vira um filtro próprio na página (até 30 letras).
const CAT_PROPRIA = {
  servicos: ["Qual é a sua área?", "Ex.: Pianista, Fotógrafo, Aulas de inglês", "Aparece no seu perfil e vira um filtro próprio em Freelances."],
  delivery: ["Qual é a sua comida?", "Ex.: Açaí, Marmitas, Comida árabe", "Aparece no seu perfil e vira um filtro próprio no Delivery."],
  lojinha: ["Sua categoria", "Ex.: Papelaria, Plantas, Suplementos", "Vira um filtro próprio na página do Shopping."],
  imoveis: ["Qual é o tipo do imóvel?", "Ex.: Chácara, Galpão, Sítio, Cobertura", "Aparece no anúncio e vira um filtro próprio em Imóveis."]
};
const textoCatPropria = (v) => String(v || "").replace(/\s+/g, " ").trim().slice(0, 30);
const CONFIG_EXTRAS = {
  servicos: { itens: { titulo: "Serviços e preços", dica: "Cada serviço que você faz, com preço e como cobra. O cliente escolhe na hora de pedir orçamento.", max: 12, foto: false, rotulo: "Nome do serviço" }, fotos: { titulo: "Portfólio: fotos de trabalhos", max: 3, proporcao: 4 / 3 } },
  delivery: { itens: { titulo: "Cardápio", dica: "Cada prato com foto, preço, seção (Lanches, Bebidas...) e descrição.", max: 12, foto: true, proporcao: 1, rotulo: "Nome do prato" }, fotos: { titulo: "Foto de capa", max: 1, proporcao: 2 } },
  lojinha: { itens: { titulo: "Produtos", dica: "Toque em \"Detalhes do produto\" para tamanho, cor, marca, estado e ficha técnica.", max: 12, foto: true, proporcao: 3 / 4, rotulo: "Nome do produto" }, fotos: null },
  imoveis: { itens: null, fotos: null },
  saude: { itens: { titulo: "Consultas e procedimentos", dica: "Cada atendimento com valor (opcional) e duração. O paciente escolhe ao pedir o agendamento.", max: 12, foto: false, rotulo: "Ex.: Consulta, Retorno, Curativo" }, fotos: { titulo: "Fotos do local de atendimento", max: 3, proporcao: 4 / 3 } }
};
let negExtra = {};
let negMaisAberto = false;
const numeroBR = (v) => { const t = String(v ?? "").replace(/[^\d,.-]/g, ""); if (!t) return null; const milhar = !t.includes(",") && /^-?\d{1,3}(\.\d{3})+$/.test(t); const n = Number(t.includes(",") || milhar ? t.replace(/\./g, "").replace(",", ".") : t); return Number.isFinite(n) ? n : null; };
const mostrarNumero = (v) => (v === null || v === undefined || v === "" ? "" : String(v).replace(".", ","));

function campo(rotulo, input, ajuda) {
  const c = document.createElement("div");
  c.className = "campo";
  const l = document.createElement("label");
  l.textContent = rotulo;
  if (input.id) l.htmlFor = input.id;
  c.append(l, input);
  if (ajuda) { const a = document.createElement("div"); a.className = "ajuda"; a.appendChild(document.createElement("span")).textContent = ajuda; c.appendChild(a); }
  return c;
}
function entrada(chave, { tipo = "text", placeholder = "", numero = false, max = 60 } = {}) {
  const i = document.createElement("input");
  i.type = tipo; i.id = "negX_" + chave; i.placeholder = placeholder; i.maxLength = max;
  if (numero) i.inputMode = "decimal";
  i.value = numero ? mostrarNumero(negExtra[chave]) : (negExtra[chave] ?? "");
  i.addEventListener("input", () => { negExtra[chave] = numero ? numeroBR(i.value) : i.value.trim(); });
  return i;
}
function seletor(chave, opcoes, aoMudar) {
  const s = document.createElement("select");
  s.id = "negX_" + chave;
  Object.entries(opcoes).forEach(([v, t]) => { const o = document.createElement("option"); o.value = v; o.textContent = t; s.appendChild(o); });
  if (!negExtra[chave] || !opcoes[negExtra[chave]]) negExtra[chave] = Object.keys(opcoes)[0];
  s.value = negExtra[chave];
  s.addEventListener("change", () => { negExtra[chave] = s.value; aoMudar?.(); });
  return s;
}
function marcas(chave, opcoes, aoMudar, alvo = negExtra) {
  const box = document.createElement("div");
  box.className = "marcas";
  const atual = new Set(Array.isArray(alvo[chave]) ? alvo[chave] : []);
  Object.entries(opcoes).forEach(([v, t]) => {
    const l = document.createElement("label");
    l.className = "marca-op";
    const c = document.createElement("input");
    c.type = "checkbox"; c.checked = atual.has(v);
    l.classList.toggle("on", c.checked);
    c.addEventListener("change", () => { c.checked ? atual.add(v) : atual.delete(v); l.classList.toggle("on", c.checked); alvo[chave] = Object.keys(opcoes).filter((k) => atual.has(k)); aoMudar?.(); });
    l.append(c, document.createTextNode(t));
    box.appendChild(l);
  });
  return box;
}
// Áreas de atuação dos Freelances: escolhidas em cima (a 1ª é a principal), busca e grupos que abrem e fecham.
const MAX_AREAS = 6;
let areasBusca = "", areasAbertos = null;
function seletorAreas() {
  const box = el("div", "campo areas");
  const cats = negExtra.categorias;
  const nomeArea = (k) => (k === "outros" ? (negExtra.categoriaPersonalizada || "").trim() || "Outra" : CATS_NEGOCIO.servicos[k] || k);
  if (!areasAbertos) areasAbertos = new Set(GRUPOS_SERV.filter((g) => cats.some((k) => k in g.areas)).map((g) => g.nome));
  const mudar = (k) => {
    const i = cats.indexOf(k);
    if (i >= 0) cats.splice(i, 1);
    else if (cats.length >= MAX_AREAS) { toast(`Escolha até ${MAX_AREAS} áreas. Tire uma para marcar outra.`); return; }
    else cats.push(k);
    montarExtras();
  };
  const cab = el("div", "areas-cab");
  cab.append(el("label", null, "Áreas de atuação"), el("span", "areas-conta" + (cats.length ? " on" : ""), `${cats.length} de ${MAX_AREAS}`));
  box.appendChild(cab);

  // Escolhidas: a primeira é a principal (aparece no cartão); tocar numa a torna principal.
  const esc = el("div", "areas-escolhidas");
  if (!cats.length) esc.appendChild(el("p", "areas-vazio", "Nenhuma área ainda. Escolha abaixo o que você faz."));
  cats.forEach((k, i) => {
    const c = el("div", "area-esc" + (i === 0 ? " principal" : ""));
    const b = el("button", "area-esc-nome"); b.type = "button";
    b.append(el("span", null, nomeArea(k)));
    if (i === 0) b.appendChild(el("small", null, "Principal"));
    else b.setAttribute("aria-label", `Tornar ${nomeArea(k)} a área principal`);
    b.addEventListener("click", () => { if (i) { cats.splice(i, 1); cats.unshift(k); montarExtras(); } });
    const x = el("button", "area-esc-x"); x.type = "button"; x.setAttribute("aria-label", `Tirar ${nomeArea(k)}`);
    x.appendChild(icone("fechar", "i xs"));
    x.addEventListener("click", () => mudar(k));
    c.append(b, x);
    esc.appendChild(c);
  });
  box.appendChild(esc);
  if (cats.length > 1) box.appendChild(el("div", "ajuda", "A principal aparece no seu cartão. Toque em outra para torná-la principal."));

  const busca = document.createElement("input");
  busca.type = "search"; busca.className = "areas-busca"; busca.id = "negAreasBusca";
  busca.placeholder = "Buscar: eletricista, aulas, fotógrafo..."; busca.value = areasBusca; busca.autocomplete = "off";
  const lista = el("div", "areas-grupos");
  const op = (k, nome) => {
    const l = el("label", "marca-op" + (cats.includes(k) ? " on" : ""));
    const c = document.createElement("input"); c.type = "checkbox"; c.checked = cats.includes(k);
    c.addEventListener("change", () => mudar(k));
    l.append(c, document.createTextNode(nome));
    return l;
  };
  const pintarLista = () => {
    lista.replaceChildren();
    const q = semAcento(areasBusca);
    if (q) {
      const achou = Object.keys(PALAVRAS_SERV).filter((k) => semAcento(CATS_NEGOCIO.servicos[k] + " " + PALAVRAS_SERV[k]).includes(q));
      const m = el("div", "marcas");
      achou.forEach((k) => m.appendChild(op(k, CATS_NEGOCIO.servicos[k])));
      m.appendChild(op("outros", achou.length ? "Outra (escrever)" : `Não achou? Escrever "${areasBusca.trim().slice(0, 30)}"`));
      if (!achou.length && !cats.includes("outros")) m.lastChild.querySelector("input").addEventListener("change", () => { negExtra.categoriaPersonalizada = areasBusca.trim().slice(0, 30); areasBusca = ""; }, { capture: true });
      lista.appendChild(m);
      return;
    }
    GRUPOS_SERV.forEach((g) => {
      const n = cats.filter((k) => k in g.areas).length;
      const d = document.createElement("details");
      d.className = "area-grupo"; d.open = areasAbertos.has(g.nome);
      d.addEventListener("toggle", () => { d.open ? areasAbertos.add(g.nome) : areasAbertos.delete(g.nome); });
      const sm = document.createElement("summary");
      sm.append(el("span", null, g.nome), el("small", n ? "on" : "", n ? `${n} ${n === 1 ? "escolhida" : "escolhidas"}` : `${Object.keys(g.areas).length} áreas`));
      const m = el("div", "marcas");
      Object.entries(g.areas).forEach(([k, [nome]]) => m.appendChild(op(k, nome)));
      d.append(sm, m);
      lista.appendChild(d);
    });
    const outra = el("div", "marcas area-outra");
    outra.appendChild(op("outros", "Outra (escrever)"));
    lista.appendChild(outra);
  };
  busca.addEventListener("input", () => { areasBusca = busca.value; pintarLista(); });
  pintarLista();
  box.append(busca, lista);
  if (cats.includes("outros")) box.appendChild(campo(CAT_PROPRIA.servicos[0], entrada("categoriaPersonalizada", { placeholder: CAT_PROPRIA.servicos[1], max: 30 }), CAT_PROPRIA.servicos[2]));
  box.appendChild(el("div", "ajuda", "Você aparece no filtro de cada área escolhida."));
  return box;
}
function secao(titulo, dica) {
  const s = document.createElement("div");
  s.className = "neg-secao";
  const h = document.createElement("h3"); h.textContent = titulo; s.appendChild(h);
  if (dica) { const p = document.createElement("p"); p.textContent = dica; s.appendChild(p); }
  return s;
}
function grade(classe, ...filhos) { const g = document.createElement("div"); g.className = "grade-campos " + (classe || ""); g.append(...filhos); return g; }

let escolhaFoto = null; // callback do seletor de arquivo compartilhado
function pedirFoto(opcoes, aoEscolher) { escolhaFoto = { opcoes, aoEscolher }; $("negArquivoExtra").click(); }
$("negArquivoExtra").addEventListener("change", async () => {
  const arquivo = $("negArquivoExtra").files?.[0];
  $("negArquivoExtra").value = "";
  if (!arquivo || !escolhaFoto) return;
  try {
    const d = await editarImagem(arquivo, escolhaFoto.opcoes);
    if (d) escolhaFoto.aoEscolher(d);
  } catch (e) { toast(erroAmigavel(e)); }
});

function montarExtras() {
  const box = $("negExtras");
  box.replaceChildren();
  const t = negTipo;
  const cfg = CONFIG_EXTRAS[t];
  const info = secao(t === "imoveis" ? "Sobre você como anunciante" : "Detalhes");
  // Campos opcionais ficam recolhidos: o formulário continua simples.
  const mais = document.createElement("details");
  mais.className = "neg-mais";
  mais.open = negMaisAberto;
  mais.addEventListener("toggle", () => { negMaisAberto = mais.open; });
  const sumMais = document.createElement("summary");
  sumMais.append(document.createTextNode("Mais detalhes (opcional)"), Object.assign(document.createElement("small"), { textContent: { servicos: "região, experiência, diferenciais e pagamento", delivery: "formas de pagamento", lojinha: "formas de pagamento", saude: "público, idiomas, formação e acessibilidade" }[t] || "" }));
  mais.appendChild(sumMais);
  if (t === "servicos") {
    // Várias profissões: cada área de atuação aparece no filtro da página.
    if (!Array.isArray(negExtra.categorias) || !negExtra.categorias.length) negExtra.categorias = negExtra.categoria ? [negExtra.categoria] : [];
    negExtra.categorias = negExtra.categorias.filter((k) => k in CATS_NEGOCIO.servicos).slice(0, MAX_AREAS);
    info.appendChild(seletorAreas());
    if (negExtra.categorias.includes("transporte")) {
      const mot = document.createElement("div");
      mot.className = "neg-bloco";
      const t2 = document.createElement("strong"); t2.textContent = "Motorista";
      mot.append(t2,
        campo("Categorias da CNH", marcas("cnh", { A: "A · moto", B: "B · carro", C: "C · caminhão", D: "D · ônibus", E: "E · carreta" })),
        campo("Veículo (opcional)", entrada("veiculo", { placeholder: "Ex.: Fiorino, van 15 lugares, moto", max: 60 })));
      info.appendChild(mot);
    }
    info.appendChild(campo("A partir de (R$)", entrada("precoDesde", { numero: true, placeholder: "80" }), "O menor preço que você cobra. O horário fica em \"Horário de atendimento\", mais abaixo."));
    info.appendChild(campo("Como você atende", marcas("atendimento", { domicilio: "Vou até o cliente", local: "No meu local", online: "Online" })));
    mais.appendChild(grade("", campo("Região que atende", entrada("regiao", { placeholder: "Ex.: Ilha toda, Continente", max: 80 })), campo("Anos de experiência", entrada("experiencia", { numero: true, placeholder: "5", max: 3 }))));
    mais.appendChild(campo("Diferenciais", marcas("diferenciais", DIFERENCIAIS_SERV), "Aparecem em destaque no seu perfil."));
    mais.appendChild(campo("Formas de pagamento", marcas("pagamentos", { pix: "Pix", credito: "Crédito", debito: "Débito", dinheiro: "Dinheiro" })));
  } else if (t === "saude") {
    montarSaude(info, mais);
  } else if (t === "imoveis") {
    info.appendChild(grade("", campo("Você é", seletor("tipoAnunciante", { proprietario: "Proprietário(a)", corretor: "Corretor(a)", imobiliaria: "Imobiliária" })), campo("CRECI (se tiver)", entrada("creci", { placeholder: "Ex.: 12345-J", max: 20 }))));
  } else {
    info.appendChild(campo("Categoria", seletor("categoria", CATS_NEGOCIO[t], () => montarExtras()), "Define em qual filtro da página você aparece"));
    if (negExtra.categoria === "outros") info.appendChild(campo(CAT_PROPRIA[t][0], entrada("categoriaPersonalizada", { placeholder: CAT_PROPRIA[t][1], max: 30 }), CAT_PROPRIA[t][2]));
  }
  if (t === "delivery") {
    info.appendChild(grade("quatro",
      campo("Entrega mín. (min)", entrada("tempoMin", { numero: true, placeholder: "30", max: 4 })),
      campo("Entrega máx. (min)", entrada("tempoMax", { numero: true, placeholder: "50", max: 4 })),
      campo("Taxa (R$)", entrada("taxaEntrega", { numero: true, placeholder: "0 = grátis" })),
      campo("Pedido mín. (R$)", entrada("pedidoMinimo", { numero: true, placeholder: "20" }))));
    if (!Array.isArray(negExtra.opcoesEntrega)) negExtra.opcoesEntrega = ["entrega"];
    info.appendChild(campo("Como o cliente recebe", marcas("opcoesEntrega", { entrega: "Entrega", retirada: "Retirada no local" })));
    mais.appendChild(campo("Formas de pagamento", marcas("pagamentos", PAGAMENTOS)));
  }
  if (t === "lojinha") {
    info.appendChild(campo("Formas de receber", marcas("entrega", { entrega: "Entrega", retirada: "Retirada" })));
    mais.appendChild(campo("Formas de pagamento", marcas("pagamentos", { pix: "Pix", credito: "Crédito", debito: "Débito", dinheiro: "Dinheiro" })));
  }
  if (mais.children.length > 1) info.appendChild(mais);
  box.appendChild(info);

  if (t === "imoveis") {
    // Vários imóveis: cada um é um anúncio com fotos e dados próprios.
    const sec = secao("Meus imóveis", "Cada imóvel vira um anúncio na página de Imóveis. Quem abrir seu perfil vê todos.");
    const lista = document.createElement("div");
    lista.className = "neg-anuncios";
    lista.textContent = "Carregando...";
    const add = document.createElement("button");
    add.type = "button"; add.className = "btn pri mini neg-add";
    add.append(icone("mais", "i xs"), document.createTextNode("Anunciar imóvel"));
    add.addEventListener("click", async () => { if (await exigirVerificacao()) abrirFormAnuncio(null); });
    sec.append(lista, add);
    if (semPlano()) sec.appendChild(notaPlus(`No perfil grátis, aparece ${LIMITES_GRATIS.anuncios} anúncio (o mais antigo). Com o Plus, todos.`));
    box.appendChild(sec);
    pintarMeusAnuncios(lista);
  }

  if (cfg.fotos) {
    const sec = secao(cfg.fotos.titulo, `Até ${cfg.fotos.max} ${cfg.fotos.max === 1 ? "foto" : "fotos"}. A primeira é a principal na vitrine.`);
    const fotos = document.createElement("div");
    fotos.className = "neg-fotos";
    const pintar = () => {
      fotos.replaceChildren();
      negExtra.fotos.forEach((f, i) => {
        const d = document.createElement("div");
        d.className = "neg-foto";
        d.style.backgroundImage = `url("${urlSegura(f)}")`;
        const x = document.createElement("button");
        x.type = "button"; x.className = "x"; x.setAttribute("aria-label", "Remover foto");
        x.appendChild(icone("fechar", "i xs"));
        x.addEventListener("click", () => { negExtra.fotos.splice(i, 1); pintar(); });
        d.appendChild(x);
        if (semPlano() && i >= LIMITES_GRATIS.fotos) { d.classList.add("so-plano"); d.appendChild(el("span", "ng-so-plus", "PLUS")); }
        fotos.appendChild(d);
      });
      if (semPlano()) fotos.appendChild(notaPlus(`No perfil grátis, os clientes veem ${LIMITES_GRATIS.fotos} foto. Com o Plus, até ${cfg.fotos.max}.`));
      if (negExtra.fotos.length < cfg.fotos.max) {
        const add = document.createElement("button");
        add.type = "button"; add.className = "neg-foto add"; add.setAttribute("aria-label", "Adicionar foto");
        add.appendChild(icone("mais", "i"));
        add.addEventListener("click", () => pedirFoto({ titulo: cfg.fotos.titulo, proporcao: cfg.fotos.proporcao, larguraSaida: 1080, qualidade: 0.72, limiteBytes: 170000 }, (d) => { negExtra.fotos.push(d); pintar(); }));
        fotos.appendChild(add);
      }
    };
    pintar();
    sec.appendChild(fotos);
    box.appendChild(sec);
  }

  if (cfg.itens) {
    const c = cfg.itens;
    const sec = secao(c.titulo, c.dica);
    const lista = document.createElement("div");
    lista.className = "neg-itens";
    const addBtn = document.createElement("button");
    addBtn.type = "button"; addBtn.className = "btn sec mini neg-add";
    addBtn.append(icone("mais", "i xs"), document.createTextNode("Adicionar"));
    const pintar = () => {
      lista.replaceChildren();
      negExtra.itens.forEach((it, i) => {
        const linha = document.createElement("div");
        linha.className = "neg-item" + (c.foto ? "" : " sem-foto");
        if (c.foto) {
          const ft = document.createElement("button");
          ft.type = "button"; ft.className = "ft"; ft.setAttribute("aria-label", "Foto do item");
          if (urlSegura(it.foto)) ft.style.backgroundImage = `url("${it.foto}")`; else ft.appendChild(icone("camera", "i s"));
          ft.addEventListener("click", () => pedirFoto({ titulo: c.titulo, proporcao: c.proporcao, larguraSaida: 480, qualidade: 0.72, limiteBytes: 60000 }, (d) => { it.foto = d; pintar(); }));
          linha.appendChild(ft);
        }
        const nome = document.createElement("input");
        nome.placeholder = c.rotulo; nome.maxLength = 60; nome.value = it.nome || "";
        nome.addEventListener("input", () => { it.nome = nome.value.trim(); });
        // Serviços com mais de uma área: cada serviço diz a qual área pertence.
        if (t === "servicos" && (negExtra.categorias || []).length > 1) {
          const sel = document.createElement("select");
          sel.className = "area-item"; sel.setAttribute("aria-label", "Área do serviço");
          negExtra.categorias.forEach((k) => { const o = document.createElement("option"); o.value = k; o.textContent = k === "outros" ? negExtra.categoriaPersonalizada || "Outra" : CATS_NEGOCIO.servicos[k]; sel.appendChild(o); });
          if (!negExtra.categorias.includes(it.categoria)) it.categoria = negExtra.categorias[0];
          sel.value = it.categoria;
          sel.addEventListener("change", () => { it.categoria = sel.value; });
          linha.classList.add("com-area");
          linha.appendChild(sel);
        }
        const preco = document.createElement("input");
        preco.className = "preco"; preco.placeholder = "R$"; preco.inputMode = "decimal"; preco.maxLength = 12; preco.value = mostrarNumero(it.preco);
        preco.addEventListener("input", () => { it.preco = numeroBR(preco.value); });
        const rm = document.createElement("button");
        rm.type = "button"; rm.className = "rm"; rm.setAttribute("aria-label", "Remover");
        rm.appendChild(icone("lixo", "i s"));
        rm.addEventListener("click", () => { negExtra.itens.splice(i, 1); pintar(); });
        linha.append(nome, preco, rm);
        linha.appendChild(detalhesItem(t, it));
        // Lojinha: quantas unidades tem. Com 1 unidade, ao vender o produto sai da loja.
        if (t === "lojinha") {
          const est = document.createElement("label");
          est.className = "estoque-item";
          const inp = document.createElement("input");
          inp.type = "number"; inp.min = "0"; inp.max = "9999"; inp.inputMode = "numeric"; inp.placeholder = "sem limite";
          inp.value = Number.isInteger(it.estoque) ? String(it.estoque) : "";
          inp.addEventListener("input", () => { const v = parseInt(inp.value, 10); it.estoque = Number.isInteger(v) && v >= 0 ? Math.min(v, 9999) : null; });
          const um = document.createElement("button");
          um.type = "button"; um.className = "chip-um"; um.textContent = "Peça única";
          um.addEventListener("click", () => { it.estoque = 1; inp.value = "1"; });
          est.append(document.createTextNode("Estoque"), inp, document.createTextNode("unid."), um);
          linha.appendChild(est);
        }
        if (semPlano() && i >= LIMITES_GRATIS.itens) { linha.classList.add("so-plano"); linha.appendChild(el("span", "ng-so-plus", "PLUS")); }
        lista.appendChild(linha);
      });
      addBtn.hidden = negExtra.itens.length >= c.max;
      if (semPlano() && negExtra.itens.length >= LIMITES_GRATIS.itens) lista.appendChild(notaPlus(`No perfil grátis, os clientes veem os ${LIMITES_GRATIS.itens} primeiros e pedem pelo chat ou WhatsApp. Com o Plus, até ${c.max}, com pedidos pelo site.`));
    };
    addBtn.addEventListener("click", () => { negExtra.itens.push({ nome: "", preco: null, foto: "" }); pintar(); lista.lastChild?.querySelector("input")?.focus(); });
    pintar();
    sec.append(lista, addBtn);
    box.appendChild(sec);
  }
}
// ---------- Saúde: profissão, registro no conselho, especialidades, como atende, convênios e valor ----------
// Tudo fica em negExtra.saude (vai inteiro para negocios.saude); a profissão também vira a `categoria` (filtros).
function montarSaude(info, mais) {
  const sd = negExtra.saude = (negExtra.saude && typeof negExtra.saude === "object") ? negExtra.saude : {};
  if (!PROFISSOES_SAUDE[sd.profissao]) sd.profissao = "medico";
  ["especialidades", "modalidades", "convenios", "publico", "idiomas"].forEach((k) => { if (!Array.isArray(sd[k])) sd[k] = []; });
  if (sd.particular === undefined) sd.particular = true;
  const prof = PROFISSOES_SAUDE[sd.profissao];
  const opsProf = Object.fromEntries(Object.entries(PROFISSOES_SAUDE).map(([k, p]) => [k, p.nome]));
  const sel = document.createElement("select"); sel.id = "negX_profissao";
  Object.entries(opsProf).forEach(([v, t]) => { const o = document.createElement("option"); o.value = v; o.textContent = t; sel.appendChild(o); });
  sel.value = sd.profissao;
  sel.addEventListener("change", () => { sd.profissao = sel.value; sd.especialidades = []; sd.publico = []; montarExtras(); });
  info.appendChild(campo("Profissão", sel, "Define em qual filtro da página de Saúde você aparece."));
  if (sd.profissao === "outros") {
    const o = document.createElement("input"); o.id = "negX_profissaoOutra"; o.maxLength = 40; o.placeholder = "Ex.: Acupunturista, Doula, Podólogo"; o.value = sd.profissaoOutra || "";
    o.addEventListener("input", () => { sd.profissaoOutra = o.value.replace(/\s+/g, " ").trim(); });
    info.appendChild(campo("Qual é a sua profissão?", o, "Aparece no seu perfil e vira um filtro próprio em Saúde."));
  }
  // Registro no conselho: número + estado (e RQE para médico especialista).
  const cons = conselhoDe(sd);
  const bloco = el("div", "neg-bloco neg-registro");
  const t2 = el("strong", null, cons ? `Registro no ${cons}` : "Registro profissional (se tiver)");
  const reg = document.createElement("input"); reg.id = "negX_registro"; reg.maxLength = 20; reg.inputMode = "text"; reg.placeholder = cons === "COREN" ? "Ex.: 123456-TE" : "Ex.: 12345"; reg.value = sd.registro || "";
  reg.addEventListener("input", () => { sd.registro = reg.value.replace(/[^0-9A-Za-z./ -]/g, "").trim(); });
  const uf = document.createElement("select"); uf.id = "negX_registroUf";
  ["", ...UFS].forEach((u) => { const o = document.createElement("option"); o.value = u; o.textContent = u || "UF"; uf.appendChild(o); });
  uf.value = sd.registroUf || "SC";
  if (!sd.registroUf) sd.registroUf = "SC";
  uf.addEventListener("change", () => { sd.registroUf = uf.value; });
  const g = grade("", campo("Número", reg), campo("Estado", uf));
  bloco.append(t2, g);
  if (prof.rqe) {
    const rqe = document.createElement("input"); rqe.id = "negX_rqe"; rqe.maxLength = 12; rqe.placeholder = "Ex.: 6789"; rqe.value = sd.rqe || "";
    rqe.addEventListener("input", () => { sd.rqe = rqe.value.replace(/[^0-9A-Za-z./-]/g, "").trim(); });
    bloco.appendChild(campo("RQE (especialista, opcional)", rqe));
  }
  const avReg = el("p", "neg-aviso-saude");
  avReg.textContent = cons ? `O número aparece no seu perfil com o link para o site do ${cons === "CRM" ? "CFM" : "conselho"}. Informar registro que não é seu é crime e leva ao banimento da conta.` : "Se a sua profissão não tem conselho, deixe em branco e conte sua formação em \"Mais detalhes\".";
  bloco.appendChild(avReg);
  info.appendChild(bloco);
  // Especialidades: sugestões da profissão (toque para marcar) + escrever outra. Até 6.
  const esp = el("div", "campo");
  const lE = document.createElement("label"); lE.textContent = "Especialidades e áreas de atuação"; esp.appendChild(lE);
  const chips = el("div", "marcas");
  const pintarEsp = () => {
    chips.replaceChildren();
    [...new Set([...prof.esp, ...sd.especialidades])].forEach((e) => {
      const l = document.createElement("label"); l.className = "marca-op";
      const c = document.createElement("input"); c.type = "checkbox"; c.checked = sd.especialidades.includes(e);
      l.classList.toggle("on", c.checked);
      c.addEventListener("change", () => {
        if (c.checked && sd.especialidades.length >= 6) { c.checked = false; toast("Escolha até 6 especialidades."); return; }
        sd.especialidades = c.checked ? [...sd.especialidades, e] : sd.especialidades.filter((x) => x !== e);
        l.classList.toggle("on", c.checked);
      });
      l.append(c, document.createTextNode(e));
      chips.appendChild(l);
    });
  };
  pintarEsp();
  const outra = document.createElement("input"); outra.id = "negX_espOutra"; outra.maxLength = 40; outra.placeholder = "Escrever outra e tocar em Adicionar";
  const add = el("button", "btn sec mini", "Adicionar"); add.type = "button";
  add.addEventListener("click", () => {
    const v = outra.value.replace(/\s+/g, " ").trim().slice(0, 40);
    if (v.length < 2) return;
    if (sd.especialidades.length >= 6) { toast("Escolha até 6 especialidades."); return; }
    if (!sd.especialidades.includes(v)) sd.especialidades.push(v);
    outra.value = ""; pintarEsp();
  });
  const linhaOutra = el("div", "neg-esp-outra"); linhaOutra.append(outra, add);
  esp.append(chips, linhaOutra);
  info.appendChild(esp);
  // Como atende, valor e convênios.
  info.appendChild(campo("Como você atende", marcas("modalidades", MODALIDADES_SAUDE, null, sd)));
  const valor = document.createElement("input"); valor.id = "negX_valorConsulta"; valor.inputMode = "decimal"; valor.maxLength = 10; valor.placeholder = "250"; valor.value = mostrarNumero(sd.valorConsulta);
  valor.addEventListener("input", () => { sd.valorConsulta = numeroBR(valor.value); });
  const dur = document.createElement("input"); dur.id = "negX_duracao"; dur.inputMode = "numeric"; dur.maxLength = 3; dur.placeholder = "50"; dur.value = sd.duracao ?? "";
  dur.addEventListener("input", () => { const v = parseInt(dur.value, 10); sd.duracao = Number.isInteger(v) && v > 0 ? Math.min(v, 600) : null; });
  info.appendChild(grade("", campo(ehVet(sd) ? "Consulta veterinária (R$)" : "Valor da consulta (R$)", valor), campo("Duração (min)", dur)));
  const part = el("label", "marca-op linha"); const pc = document.createElement("input"); pc.type = "checkbox"; pc.checked = !!sd.particular;
  part.classList.toggle("on", pc.checked);
  pc.addEventListener("change", () => { sd.particular = pc.checked; part.classList.toggle("on", pc.checked); });
  part.append(pc, document.createTextNode("Atendo particular"));
  const conv = el("div", "campo");
  const lC = document.createElement("label"); lC.textContent = "Convênios que aceita"; conv.appendChild(lC);
  conv.append(part, marcas("convenios", Object.fromEntries(CONVENIOS.map((c) => [c, c])), null, sd));
  info.appendChild(conv);
  // Mais detalhes: público, idiomas, formação e acessibilidade.
  const pub = ehVet(sd) ? PUBLICO_VET : PUBLICO_SAUDE;
  mais.appendChild(campo(ehVet(sd) ? "Animais que atende" : "Público que atende", marcas("publico", pub, null, sd)));
  mais.appendChild(campo("Idiomas", marcas("idiomas", Object.fromEntries(IDIOMAS.map((c) => [c, c])), null, sd)));
  const form = document.createElement("input"); form.id = "negX_formacao"; form.maxLength = 200; form.placeholder = "Ex.: Medicina UFSC · Residência em Pediatria HU"; form.value = sd.formacao || "";
  form.addEventListener("input", () => { sd.formacao = form.value.replace(/\s+/g, " ").trim(); });
  mais.appendChild(campo("Formação", form));
  const ac = el("label", "marca-op linha"); const acc = document.createElement("input"); acc.type = "checkbox"; acc.checked = !!sd.acessivel;
  ac.classList.toggle("on", acc.checked);
  acc.addEventListener("change", () => { sd.acessivel = acc.checked; ac.classList.toggle("on", acc.checked); });
  ac.append(acc, document.createTextNode("Local de atendimento com acessibilidade"));
  mais.appendChild(ac);
  mais.appendChild(el("p", "neg-aviso-saude", "Siga o código de ética da sua profissão na divulgação: nada de \"antes e depois\", promessa de resultado ou preço como chamariz."));
}
// O mapa `saude` que vai para o perfil (só o que as regras aceitam, já limpo).
function saudeParaSalvar(sd) {
  const txt = (v, m) => String(v || "").replace(/[\n\r]+/g, " ").trim().slice(0, m);
  const lista = (v, m, max) => (Array.isArray(v) ? v : []).map((x) => txt(x, m)).filter(Boolean).slice(0, max);
  const pub = ehVet(sd) ? PUBLICO_VET : PUBLICO_SAUDE;
  return {
    profissao: sd.profissao, profissaoOutra: sd.profissao === "outros" ? txt(sd.profissaoOutra, 40) : "",
    especialidades: lista(sd.especialidades, 40, 6),
    registro: txt(sd.registro, 20).replace(/[^0-9A-Za-z./ -]/g, ""), registroUf: UFS.includes(sd.registroUf) ? sd.registroUf : "",
    rqe: PROFISSOES_SAUDE[sd.profissao]?.rqe ? txt(sd.rqe, 12).replace(/[^0-9A-Za-z./-]/g, "") : "",
    modalidades: (sd.modalidades || []).filter((k) => MODALIDADES_SAUDE[k]),
    convenios: lista(sd.convenios, 30, 15), particular: !!sd.particular,
    valorConsulta: Number(sd.valorConsulta) > 0 ? Math.min(Math.round(Number(sd.valorConsulta) * 100) / 100, 100000) : null,
    duracao: Number.isInteger(sd.duracao) && sd.duracao > 0 ? Math.min(sd.duracao, 600) : null,
    publico: (sd.publico || []).filter((k) => pub[k]), idiomas: lista(sd.idiomas, 20, 7),
    acessivel: !!sd.acessivel, formacao: txt(sd.formacao, 200)
  };
}
// Detalhes de cada item (abre e fecha): muda conforme o tipo do negócio.
function detalhesItem(t, it) {
  const det = document.createElement("details");
  det.className = "item-det";
  const sum = document.createElement("summary");
  sum.textContent = { servicos: "Detalhes do serviço", delivery: "Seção e descrição", lojinha: "Detalhes do produto", saude: "Duração e o que inclui" }[t] || "Detalhes";
  det.appendChild(sum);
  const corpo = document.createElement("div");
  corpo.className = "item-det-corpo";
  const txt = (chave, rotulo, { placeholder = "", max = 60, area = false, lista = null } = {}) => {
    const i = document.createElement(area ? "textarea" : "input");
    i.maxLength = max; i.placeholder = placeholder;
    const v = it[chave];
    i.value = Array.isArray(v) ? v.join(", ") : (v ?? "");
    if (lista) { i.setAttribute("list", lista); }
    i.addEventListener("input", () => { it[chave] = i.value; });
    const c = document.createElement("label"); c.className = "mini-campo";
    c.append(document.createTextNode(rotulo), i);
    return c;
  };
  const sel = (chave, rotulo, opcoes) => {
    const s = document.createElement("select");
    Object.entries(opcoes).forEach(([v, tx]) => { const o = document.createElement("option"); o.value = v; o.textContent = tx; s.appendChild(o); });
    if (!(it[chave] in opcoes)) it[chave] = Object.keys(opcoes)[0];
    s.value = it[chave];
    s.addEventListener("change", () => { it[chave] = s.value; });
    const c = document.createElement("label"); c.className = "mini-campo";
    c.append(document.createTextNode(rotulo), s);
    return c;
  };
  const num = (chave, rotulo, placeholder) => {
    const i = document.createElement("input");
    i.inputMode = "decimal"; i.placeholder = placeholder; i.maxLength = 12; i.value = mostrarNumero(it[chave]);
    i.addEventListener("input", () => { it[chave] = numeroBR(i.value); });
    const c = document.createElement("label"); c.className = "mini-campo";
    c.append(document.createTextNode(rotulo), i);
    return c;
  };
  if (t === "servicos") {
    corpo.append(
      sel("unidade", "Como cobra", UNIDADES_SERV),
      txt("duracao", "Duração média", { placeholder: "Ex.: 2 horas", max: 30 }),
      txt("descricao", "O que está incluso", { placeholder: "Ex.: até 3 cômodos, material incluso", max: 160, area: true }));
    corpo.classList.add("dois");
  } else if (t === "saude") {
    corpo.append(
      txt("duracao", "Duração", { placeholder: "Ex.: 50 min", max: 30 }),
      txt("descricao", "O que inclui", { placeholder: "Ex.: avaliação, pedido de exames e retorno em 30 dias", max: 160, area: true }));
    corpo.classList.add("dois");
  } else if (t === "delivery") {
    if (!document.getElementById("secoesCardapio")) {
      const dl = document.createElement("datalist"); dl.id = "secoesCardapio";
      SECOES_CARDAPIO.forEach((x) => { const o = document.createElement("option"); o.value = x; dl.appendChild(o); });
      document.body.appendChild(dl);
    }
    corpo.append(
      txt("secao", "Seção do cardápio", { placeholder: "Ex.: Lanches", max: 24, lista: "secoesCardapio" }),
      num("precoAntigo", "Preço antes (promoção)", "R$"),
      txt("descricao", "Descrição / ingredientes", { placeholder: "Ex.: pão brioche, 180 g de carne, cheddar, bacon", max: 160, area: true }));
    corpo.classList.add("dois");
  } else if (t === "lojinha") {
    corpo.append(
      sel("condicao", "Estado", CONDICAO),
      txt("marca", "Marca", { placeholder: "Ex.: Nike", max: 30 }),
      num("precoAntigo", "Preço antes (promoção)", "R$"),
      txt("tamanhos", "Tamanhos (separe por vírgula)", { placeholder: "P, M, G  ou  37, 38, 39", max: 80 }),
      txt("cores", "Cores (separe por vírgula)", { placeholder: "Preto, Branco", max: 80 }),
      txt("descricao", "Descrição", { placeholder: "Conte como é o produto", max: 300, area: true }),
      txt("ficha", "Ficha técnica (uma por linha)", { placeholder: "Material: Algodão\nMedidas: 70 x 50 cm\nPeso: 200 g", max: 500, area: true }));
    corpo.classList.add("dois");
  }
  det.appendChild(corpo);
  return det;
}
const listaTexto = (v, max = 12) => (Array.isArray(v) ? v : String(v || "").split(",")).map((x) => String(x).trim().slice(0, 20)).filter(Boolean).slice(0, max);

// ---------- anúncios de imóveis (vários por pessoa) ----------
let meusAnuncios = [], anEdit = null, anEditandoId = null;
const FINALIDADES = { aluguel: "Aluguel", venda: "Venda", temporada: "Temporada" };

async function pintarMeusAnuncios(lista) {
  try { meusAnuncios = await buscarAnuncios(fb, eu.uid); } catch { meusAnuncios = []; }
  lista.replaceChildren();
  if (!meusAnuncios.length) {
    const p = document.createElement("p");
    p.className = "social-vazio";
    p.textContent = "Nenhum imóvel anunciado ainda.";
    lista.appendChild(p);
    return;
  }
  meusAnuncios.forEach((a) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "neg-anuncio";
    const ft = document.createElement("div");
    ft.className = "ft";
    if (urlSegura((a.fotos || [])[0])) ft.style.backgroundImage = `url("${a.fotos[0]}")`;
    const tx = document.createElement("div");
    tx.className = "tx";
    const t1 = document.createElement("strong");
    t1.textContent = a.titulo || `${(a.categoria === "outros" && a.categoriaPersonalizada) || CATS_NEGOCIO.imoveis[a.categoria] || "Imóvel"} · ${FINALIDADES[a.finalidade] || ""}`;
    const t2 = document.createElement("small");
    t2.textContent = [FINALIDADES[a.finalidade], moedaBR(a.preco), a.bairro].filter(Boolean).join(" · ");
    tx.append(t1, t2);
    b.append(ft, tx, icone("lapis", "i s"));
    b.addEventListener("click", () => abrirFormAnuncio(a));
    // Um toque para tirar do ar quando fechar negócio.
    const fim = document.createElement("button");
    fim.type = "button"; fim.className = "fechado";
    const rotuloFim = a.finalidade === "venda" ? "Vendido" : "Alugado";
    fim.append(icone("check", "i s"), document.createTextNode(rotuloFim));
    fim.title = `${rotuloFim}: apagar o anúncio`;
    fim.addEventListener("click", () => concluirAnuncio(a, () => pintarMeusAnuncios(lista)));
    const linha = document.createElement("div");
    linha.className = "neg-anuncio-linha";
    linha.append(b, fim);
    lista.appendChild(linha);
  });
}
async function concluirAnuncio(a, depois) {
  const rotulo = a.finalidade === "venda" ? "vendido" : "alugado";
  if (!(await confirmarHF({ titulo: `Imóvel ${rotulo}?`, texto: `O anúncio "${a.titulo || "sem título"}" será apagado e sai da vitrine.`, ok: "Apagar anúncio", icone: "check" }))) return;
  try {
    await fb.deleteDoc(fb.doc(fb.db, "anuncios", a.id));
    toast(`Parabéns! Imóvel marcado como ${rotulo} e removido.`);
    depois?.();
  } catch (e) { toast("Não foi possível apagar: " + erroAmigavel(e)); }
}
const moedaBR = (v) => (Number(v) > 0 ? Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) : "");

function abrirFormAnuncio(a) {
  anEditandoId = a?.id || null;
  anEdit = JSON.parse(JSON.stringify({ finalidade: "aluguel", categoria: "apartamento", cidade: nomeCidade(dados.cidade), fotos: [], ...(a || {}), criadoEm: null, atualizadoEm: null }));
  // Endereço do imóvel: estado, cidade (IBGE) e bairro obrigatórios; rua, número e CEP opcionais.
  const anLocalBox = document.createElement("div");
  anLocalBox.className = "neg-local";
  const anLocalTit = document.createElement("div"); anLocalTit.className = "neg-local-tit";
  anLocalTit.append(Object.assign(document.createElement("strong"), { textContent: "Endereço do imóvel" }), Object.assign(document.createElement("small"), { textContent: "Estado, cidade e bairro aparecem no anúncio e na busca. Rua e número são opcionais: só aparecem se você preencher." }));
  const anLocalCampos = document.createElement("div");
  anLocalBox.append(anLocalTit, anLocalCampos);
  anLocal = camposEndereco(anLocalCampos, {
    campos: ["cep", "uf", "cidade", "bairro", "rua", "numero", "complemento"],
    obrigatorios: ["uf", "cidade", "bairro"],
    valor: a ? { cep: a.cep, uf: a.uf, cidade: a.cidade, cidadeIbge: a.cidadeIbge, bairro: a.bairro, rua: a.rua, numero: a.numero, complemento: a.complemento } : { uf: dados.uf, cidade: nomeCidade(dados.cidade), cidadeIbge: dados.cidadeIbge },
    dicaCep: "Opcional: o CEP preenche estado, cidade, bairro e rua"
  });
  anEdit.mobiliadoLista = anEdit.mobiliado ? ["sim"] : [];
  anEdit.caracteristicas = Array.isArray(anEdit.caracteristicas) ? anEdit.caracteristicas : [];
  anEdit.condicoes = Array.isArray(anEdit.condicoes) ? anEdit.condicoes : [];
  $("tAnuncio").textContent = a ? "Editar imóvel" : "Anunciar imóvel";
  $("anExcluir").hidden = !a;
  const corpo = $("anCorpo");
  corpo.replaceChildren();
  const ent = (chave, { numero = false, placeholder = "", max = 60, tipo = "text" } = {}) => {
    const i = document.createElement("input");
    i.type = tipo; i.placeholder = placeholder; i.maxLength = max;
    if (numero) i.inputMode = "decimal";
    i.value = numero ? mostrarNumero(anEdit[chave]) : (anEdit[chave] ?? "");
    i.addEventListener("input", () => { anEdit[chave] = numero ? numeroBR(i.value) : i.value.trim(); });
    return i;
  };
  const sel = (chave, opcoes, aoMudar) => {
    const s = document.createElement("select");
    Object.entries(opcoes).forEach(([v, t]) => { const o = document.createElement("option"); o.value = v; o.textContent = t; s.appendChild(o); });
    s.value = anEdit[chave] in opcoes ? anEdit[chave] : Object.keys(opcoes)[0];
    anEdit[chave] = s.value;
    s.addEventListener("change", () => { anEdit[chave] = s.value; aoMudar?.(); });
    return s;
  };
  // "Outro (escrever)": campo para a pessoa dizer o tipo (Chácara, Galpão...).
  const tipoProprio = campo(CAT_PROPRIA.imoveis[0], ent("categoriaPersonalizada", { placeholder: CAT_PROPRIA.imoveis[1], max: 30 }), CAT_PROPRIA.imoveis[2]);
  const mostrarTipoProprio = () => { tipoProprio.hidden = anEdit.categoria !== "outros"; };
  const desc = document.createElement("textarea");
  desc.maxLength = 800; desc.placeholder = "Diferenciais, estado do imóvel, o que está incluso, regras..."; desc.value = anEdit.descricao || "";
  desc.addEventListener("input", () => { anEdit.descricao = desc.value.trim(); });

  const fotosSec = secao("Fotos do imóvel", "Até 5 fotos. A primeira é a capa do anúncio.");
  const fotos = document.createElement("div");
  fotos.className = "neg-fotos";
  const pintarFotos = () => {
    fotos.replaceChildren();
    anEdit.fotos.forEach((f, i) => {
      const d = document.createElement("div");
      d.className = "neg-foto";
      d.style.backgroundImage = `url("${urlSegura(f)}")`;
      const x = document.createElement("button");
      x.type = "button"; x.className = "x"; x.setAttribute("aria-label", "Remover foto");
      x.appendChild(icone("fechar", "i xs"));
      x.addEventListener("click", () => { anEdit.fotos.splice(i, 1); pintarFotos(); });
      d.appendChild(x);
      fotos.appendChild(d);
    });
    if (anEdit.fotos.length < 5) {
      const add = document.createElement("button");
      add.type = "button"; add.className = "neg-foto add"; add.setAttribute("aria-label", "Adicionar foto");
      add.appendChild(icone("mais", "i"));
      add.addEventListener("click", () => pedirFoto({ titulo: "Foto do imóvel", proporcao: 4 / 3, larguraSaida: 1080, qualidade: 0.7, limiteBytes: 150000 }, (d) => { anEdit.fotos.push(d); pintarFotos(); }));
      fotos.appendChild(add);
    }
  };
  pintarFotos();
  fotosSec.appendChild(fotos);

  corpo.append(
    fotosSec,
    campo("Título do anúncio", ent("titulo", { placeholder: "Ex.: Apartamento 2 quartos perto da UFSC", max: 80 })),
    grade("", campo("Finalidade", sel("finalidade", FINALIDADES)), campo("Tipo de imóvel", sel("categoria", CATS_NEGOCIO.imoveis, mostrarTipoProprio))),
    tipoProprio,
    grade("", campo("Preço (R$)", ent("preco", { numero: true, placeholder: "2500" }), "Aluguel: por mês · Temporada: por diária"), campo("Condomínio (R$)", ent("condominio", { numero: true }))),
    grade("quatro",
      campo("Quartos", ent("quartos", { numero: true, max: 3 })),
      campo("Banheiros", ent("banheiros", { numero: true, max: 3 })),
      campo("Vagas", ent("vagas", { numero: true, max: 3 })),
      campo("Área (m²)", ent("area", { numero: true, max: 7 }))),
    grade("tres",
      campo("Suítes", ent("suites", { numero: true, max: 3 })),
      campo("Andar", ent("andar", { placeholder: "Térreo, 5º", max: 12 })),
      campo("IPTU (R$/mês)", ent("iptu", { numero: true }))),
    anLocalBox,
    grade("", campo("Disponível a partir de", ent("disponivel", { placeholder: "Imediato ou 10/12", max: 20 })), campo("Hóspedes (temporada)", ent("hospedes", { numero: true, max: 3 }))),
    campo("", marcas("mobiliadoLista", { sim: "Mobiliado" }, null, anEdit)),
    campo("Características", marcas("caracteristicas", CARACT_IMOVEL, null, anEdit)),
    campo("Condições", marcas("condicoes", CONDICOES_IMOVEL, null, anEdit), "Garantias do aluguel, financiamento, pets..."),
    campo("Descrição", desc)
  );
  mostrarTipoProprio();
  abrirFolha("folhaAnuncio");
}

$("anSalvar").addEventListener("click", async () => {
  const a = anEdit;
  const erroLocal = anLocal?.validar();
  if (erroLocal) { toast(erroLocal); return; }
  const l = anLocal.ler();
  const localAn = { cidade: l.cidade, uf: l.uf, cidadeIbge: l.cidadeIbge, bairro: l.bairro, rua: l.rua, numero: l.numero, complemento: l.complemento, cep: l.cep };
  const tipoProprioTx = a.categoria === "outros" ? textoCatPropria(a.categoriaPersonalizada) : "";
  if (a.categoria === "outros" && !tipoProprioTx) { toast(`Escreva o tipo do imóvel (campo "${CAT_PROPRIA.imoveis[0]}").`); return; }
  if (!Number(a.preco) && !(await confirmarHF({ titulo: "Publicar sem preço?", texto: "O anúncio vai mostrar \"Consultar\" no lugar do preço.", ok: "Publicar", icone: "info", cor: "normal" }))) return;
  const btn = $("anSalvar");
  btn.disabled = true; btn.textContent = "Publicando...";
  try {
    const ref = anEditandoId ? fb.doc(fb.db, "anuncios", anEditandoId) : fb.doc(fb.collection(fb.db, "anuncios"));
    const fotos = [];
    for (const [i, f] of (a.fotos || []).entries()) fotos.push(f.startsWith("data:") ? await salvarImagem(f, `anuncios/${eu.uid}_${ref.id}_f${i}.jpg`) : f);
    const dadosAn = {
      donoId: eu.uid, tipo: "imovel", ativo: true, titulo: a.titulo || "", finalidade: a.finalidade, categoria: a.categoria,
      preco: a.preco ?? null, condominio: a.condominio ?? null, quartos: a.quartos ?? null, banheiros: a.banheiros ?? null,
      vagas: a.vagas ?? null, area: a.area ?? null, ...localAn,
      mobiliado: (a.mobiliadoLista || []).includes("sim"), descricao: a.descricao || "", fotos,
      suites: a.suites ?? null, andar: String(a.andar || "").slice(0, 12), iptu: a.iptu ?? null, disponivel: String(a.disponivel || "").slice(0, 20),
      hospedes: a.hospedes ?? null, caracteristicas: (a.caracteristicas || []).filter((k) => CARACT_IMOVEL[k]), condicoes: (a.condicoes || []).filter((k) => CONDICOES_IMOVEL[k]),
      criadoEm: a.criadoEm || fb.serverTimestamp(), atualizadoEm: fb.serverTimestamp()
    };
    if (tipoProprioTx) dadosAn.categoriaPersonalizada = tipoProprioTx;
    dadosAn.geo = await pontoDoEndereco(localAn, anEditandoId ? a : null);
    if (!anEditandoId) dadosAn.criadoEm = fb.serverTimestamp();
    else delete dadosAn.criadoEm;
    if (JSON.stringify(dadosAn).length > 950000) throw new Error("Fotos pesadas demais. Remova uma foto e tente de novo.");
    // Regras do ar ainda sem "categoriaPersonalizada" nos anúncios: grava sem ela e usa o tipo escrito no título.
    const gravarAn = async (d) => {
      try { await fb.setDoc(ref, d, { merge: true }); }
      catch (e) {
        if (e?.code !== "permission-denied" || !("categoriaPersonalizada" in d)) throw e;
        const { categoriaPersonalizada: cp, ...resto } = d;
        await fb.setDoc(ref, { ...resto, titulo: resto.titulo || (cp ? `${cp} para ${(FINALIDADES[resto.finalidade] || "negociar").toLowerCase()}` : "") }, { merge: true });
      }
    };
    dadosAn.busca = buscaDoAnuncio(dadosAn);
    await gravarComLocal(gravarAn, dadosAn, [...NOVOS.anuncio, "geo", "busca"]);
    fecharFolha("folhaAnuncio");
    toast(anEditandoId ? "Imóvel atualizado" : "Imóvel anunciado");
    const lista = document.querySelector("#negExtras .neg-anuncios");
    if (lista) pintarMeusAnuncios(lista);
  } catch (e) { toast("Não foi possível publicar: " + erroAmigavel(e)); }
  finally { btn.disabled = false; btn.textContent = "Publicar anúncio"; }
});
$("anExcluir").addEventListener("click", async () => {
  if (!anEditandoId || !(await confirmarHF({ titulo: "Excluir este anúncio?", texto: "Ele sai da vitrine e não dá para desfazer.", ok: "Excluir", icone: "lixo" }))) return;
  try {
    await fb.deleteDoc(fb.doc(fb.db, "anuncios", anEditandoId));
    fecharFolha("folhaAnuncio");
    toast("Anúncio excluído");
    const lista = document.querySelector("#negExtras .neg-anuncios");
    if (lista) pintarMeusAnuncios(lista);
  } catch (e) { toast("Não foi possível excluir: " + erroAmigavel(e)); }
});

// ---------- CNPJ ----------
const soNumeros = (v) => String(v || "").replace(/\D/g, "");
function mascaraCnpj(v) {
  const d = soNumeros(v).slice(0, 14);
  return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
}
// Dígitos verificadores do CNPJ (mesma conta da Receita Federal).
function cnpjValido(v) {
  const d = soNumeros(v);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const dv = (base) => { let soma = 0, peso = base.length - 7; for (const c of base) { soma += Number(c) * peso--; if (peso < 2) peso = 9; } const r = soma % 11; return r < 2 ? 0 : 11 - r; };
  return dv(d.slice(0, 12)) === Number(d[12]) && dv(d.slice(0, 13)) === Number(d[13]);
}
function conferirCnpj() {
  const v = $("negCnpj").value, d = soNumeros(v), aj = $("negCnpjAjuda");
  aj.classList.remove("ok", "erro");
  if (!d) aj.textContent = "Aparece no perfil e passa mais confiança. Conferimos se o número é válido.";
  else if (d.length < 14) aj.textContent = `Faltam ${14 - d.length} números.`;
  else if (cnpjValido(d)) { aj.textContent = "✓ CNPJ válido"; aj.classList.add("ok"); }
  else { aj.textContent = "Este CNPJ não é válido. Confira os números."; aj.classList.add("erro"); }
}
$("negCnpj").addEventListener("input", () => { $("negCnpj").value = mascaraCnpj($("negCnpj").value); conferirCnpj(); });
// Instagram: aceita @nome ou o link do perfil.
const nomeInstagram = (v) => String(v || "").trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/[/?#].*$/, "");
const siteCompleto = (v) => { const t = String(v || "").trim(); return !t ? "" : /^https?:\/\//i.test(t) ? t : "https://" + t; };

// ---------- capa ----------
function pintarCapaNegocio() {
  const box = $("negCapa");
  box.querySelector(".ng-capa-foto")?.remove();
  $("negCapaEscolher").hidden = !!negCapa;
  if (!negCapa) return;
  const f = el("div", "ng-capa-foto");
  f.style.backgroundImage = `url("${urlSegura(negCapa)}")`;
  const trocar = el("button", "btn sec mini"); trocar.type = "button"; trocar.append(icone("camera", "i xs"), document.createTextNode("Trocar"));
  trocar.addEventListener("click", () => $("negArquivoCapa").click());
  const tirar = el("button", "btn sec mini"); tirar.type = "button"; tirar.append(icone("lixo", "i xs"), document.createTextNode("Remover"));
  tirar.addEventListener("click", () => { negCapa = ""; pintarCapaNegocio(); });
  const bts = el("div", "bts"); bts.append(trocar, tirar);
  f.appendChild(bts);
  box.appendChild(f);
}
$("negCapaEscolher").addEventListener("click", () => $("negArquivoCapa").click());
$("negArquivoCapa").addEventListener("change", async () => {
  const arquivo = $("negArquivoCapa").files?.[0];
  $("negArquivoCapa").value = "";
  if (!arquivo) return;
  try {
    const d = await editarImagem(arquivo, { titulo: "Capa do perfil", dica: "A capa aparece larga no topo do perfil. Deixe o principal no meio.", proporcao: 2, larguraSaida: 1200, qualidade: 0.74, limiteBytes: 190000 });
    if (d) { negCapa = d; pintarCapaNegocio(); }
  } catch (e) { toast(erroAmigavel(e)); }
});

// ---------- horário de cada dia (domingo = 0 ... sábado = 6) ----------
const NOMES_DIA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const CHAVES_DIA = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
const FAIXA = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/;
// Começa pelo horário por dia; sem ele, monta a partir do cadastro antigo (dias + abre/fecha ou "8h às 18h").
function semanaInicial(n) {
  if (Array.isArray(n?.semana) && n.semana.length === 7) return n.semana.map((x) => (FAIXA.test(x || "") ? x : ""));
  const p2 = (v) => String(v).padStart(2, "0");
  let faixa = "";
  if (n?.horaAbre && n?.horaFecha) faixa = `${n.horaAbre}-${n.horaFecha}`;
  else if (n?.horario) {
    const m = /(\d{1,2})(?:[:h](\d{2}))?\s*h?\s*(?:às|as|a|-|–|até)\s*(\d{1,2})(?:[:h](\d{2}))?/i.exec(n.horario);
    if (m) faixa = `${p2(m[1])}:${m[2] || "00"}-${p2(m[3])}:${m[4] || "00"}`;
  }
  if (!FAIXA.test(faixa)) return ["", "", "", "", "", "", ""];
  const dias = Array.isArray(n?.dias) && n.dias.length ? n.dias : null;
  return CHAVES_DIA.map((k) => (!dias || dias.includes(k) ? faixa : ""));
}
function montarHorario() {
  const box = $("negHorario");
  box.replaceChildren();
  const tit = el("div", "ng-bloco-tit");
  const tx = el("div"); tx.append(el("strong", null, negTipo === "servicos" ? "Horário de atendimento" : "Horário de funcionamento"), el("small", null, "Seu perfil mostra \"Aberto agora\" e quando abre ou fecha"));
  const icH = el("span", "ng-bloco-ic"); icH.appendChild(icone("relogio", "i s"));
  tit.append(icH, tx);
  const atalhos = el("div", "ng-hor-atalhos");
  const atalho = (rot, fn) => { const b = el("button", "ng-chip", rot); b.type = "button"; b.addEventListener("click", () => { fn(); montarHorario(); }); atalhos.appendChild(b); };
  atalho("Seg a sex, 8h às 18h", () => { negSemana = negSemana.map((_, i) => (i >= 1 && i <= 5 ? "08:00-18:00" : "")); });
  atalho("Todos os dias", () => { const base = negSemana.find(Boolean) || "08:00-18:00"; negSemana = negSemana.map(() => base); });
  atalho("Copiar o 1º dia para todos", () => { const base = [1, 2, 3, 4, 5, 6, 0].map((i) => negSemana[i]).find(Boolean); if (base) negSemana = negSemana.map((x) => (x ? base : "")); else toast("Abra pelo menos um dia primeiro."); });
  atalho("Limpar", () => { negSemana = ["", "", "", "", "", "", ""]; });
  const lista = el("div", "ng-hor-lista");
  [1, 2, 3, 4, 5, 6, 0].forEach((i) => {
    const l = el("div", "ng-hor-dia" + (negSemana[i] ? " aberto" : ""));
    const chave = el("label", "ng-chave");
    const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = !!negSemana[i];
    cb.setAttribute("aria-label", `${NOMES_DIA[i]} aberto`);
    chave.append(cb, el("i"));
    const nome = el("span", "nome", NOMES_DIA[i].slice(0, 3));
    nome.title = NOMES_DIA[i];
    const horas = el("div", "horas");
    if (negSemana[i]) {
      const [a, f] = negSemana[i].split("-");
      const ia = document.createElement("input"); ia.type = "time"; ia.step = "900"; ia.value = a; ia.setAttribute("aria-label", `${NOMES_DIA[i]}: abre às`);
      const ifc = document.createElement("input"); ifc.type = "time"; ifc.step = "900"; ifc.value = f; ifc.setAttribute("aria-label", `${NOMES_DIA[i]}: fecha às`);
      const mudar = () => { if (ia.value && ifc.value) negSemana[i] = `${ia.value.slice(0, 5)}-${ifc.value.slice(0, 5)}`; };
      ia.addEventListener("change", mudar); ifc.addEventListener("change", mudar);
      horas.append(ia, el("span", null, "às"), ifc);
    } else horas.appendChild(el("span", "fechado", "Fechado"));
    cb.addEventListener("change", () => {
      negSemana[i] = cb.checked ? ([1, 2, 3, 4, 5, 6, 0].map((k) => negSemana[k]).find(Boolean) || "08:00-18:00") : "";
      montarHorario();
    });
    l.append(chave, nome, horas);
    lista.appendChild(l);
  });
  box.append(tit, atalhos, lista);
}

// ---------- promoção / cupom ----------
const msPromo = (ate) => ate?.toMillis?.() ?? (ate?.seconds || 0) * 1000;
// Faixa no cartão de Meus negócios: no ar (com o prazo e o cupom), aguardando a atualização ou encerrada.
function situacaoPromo(n) {
  const pend = extrasPendentes(n.id);
  const pr = pend && "promocao" in pend ? pend.promocao : n.promocao;
  if (!pr?.titulo) return null;
  const fim = msPromo(pr.ate), noAr = fim > Date.now(), guardada = noAr && ((pend && "promocao" in pend) || semPlano());
  const d = el("button", "ng-promo-st " + (!noAr ? "fim" : guardada ? "espera" : "on"));
  d.type = "button";
  const tx = el("span", "tx");
  tx.append(el("strong", null, !noAr ? "Promoção encerrada" : guardada ? "Promoção salva" : "Promoção no ar"),
    el("small", null, !noAr ? `Terminou em ${new Date(fim).toLocaleDateString("pt-BR")} · toque para criar outra`
      : semPlano() ? "Aparece para os clientes quando você tiver um plano ativo"
      : pend && "promocao" in pend ? "Aparece para os clientes assim que a atualização do sistema for publicada"
      : [pr.titulo, prazoPromo(pr.ate)].join(" · ")));
  d.append(icone("selo", "i s"), tx);
  if (noAr && pr.codigo) d.appendChild(el("span", "cupom", pr.codigo));
  d.addEventListener("click", () => abrirFormNegocio(n, { promo: true }));
  return d;
}
const dataInput = (d) => { const x = d instanceof Date && !isNaN(d) ? d : new Date(Date.now() + 14 * 864e5); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
function montarPromo() {
  const box = $("negPromo");
  box.replaceChildren();
  const tit = el("div", "ng-bloco-tit");
  const tx = el("div"); tx.append(el("strong", null, "Promoção ou cupom"), el("small", null, negPromo?.terminou && !negPromo.ativa
    ? `A última terminou em ${new Date(negPromo.terminou).toLocaleDateString("pt-BR")}. Ligue para criar outra.`
    : semPlano() ? "Faz parte dos planos: sem plano ativo, a promoção fica guardada e não aparece para os clientes"
    : "Destaque no topo do perfil e selo nos cartões, com prazo para acabar"));
  const chave = el("label", "ng-chave ng-chave-dir");
  const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = !!negPromo?.ativa; cb.setAttribute("aria-label", "Promoção ativa");
  chave.append(cb, el("i"));
  const icP = el("span", "ng-bloco-ic"); icP.appendChild(icone("selo", "i s"));
  tit.append(icP, tx, chave);
  box.appendChild(tit);
  cb.addEventListener("change", () => {
    if (cb.checked) negPromo = { titulo: "", texto: "", codigo: "", ate: dataInput(null), ...(negPromo || {}), ativa: true, terminou: 0 };
    else if (negPromo) negPromo.ativa = false;
    montarPromo();
  });
  if (!negPromo?.ativa) return;
  const p = negPromo;
  const ent = (chaveP, rot, { max = 60, area = false, ph = "", tipo = "text", ajuda = "" } = {}) => {
    const i = document.createElement(area ? "textarea" : "input");
    if (!area) i.type = tipo;
    i.maxLength = max; i.placeholder = ph; i.value = p[chaveP] || ""; i.id = "negPromo_" + chaveP;
    i.addEventListener("input", () => {
      if (chaveP === "codigo") { const pos = i.selectionStart; i.value = i.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20); try { i.setSelectionRange(pos, pos); } catch {} }
      p[chaveP] = i.value;
      pintarPrevia();
    });
    return campo(rot, i, ajuda);
  };
  const hoje = new Date(), max = new Date(Date.now() + 60 * 864e5);
  const ate = document.createElement("input"); ate.type = "date"; ate.id = "negPromo_ate"; ate.dataset.titulo = "Promoção válida até";
  ate.min = dataInput(hoje); ate.max = dataInput(max); ate.value = p.ate || dataInput(null);
  ate.addEventListener("change", () => { p.ate = ate.value; pintarPrevia(); });
  const previa = el("div", "ng-promo-previa");
  const pintarPrevia = () => {
    previa.replaceChildren();
    const ic = el("span", "ic"); ic.appendChild(icone("selo", "i s"));
    const t = el("div", "tx");
    t.append(el("small", null, "Prévia"), el("strong", null, p.titulo || "Título da promoção"));
    if (p.texto) t.appendChild(el("p", null, p.texto));
    if (p.ate) t.appendChild(el("span", "ate", "Válida até " + new Date(p.ate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })));
    previa.append(ic, t);
    if (p.codigo) previa.appendChild(el("span", "cupom", p.codigo));
  };
  pintarPrevia();
  box.append(
    ent("titulo", "Título", { max: 60, ph: "Ex.: 10% de desconto no primeiro pedido" }),
    ent("texto", "Detalhes (opcional)", { max: 200, area: true, ph: "Regras, o que está incluso, como usar..." }),
    grade("", ent("codigo", "Código do cupom (opcional)", { max: 20, ph: "BEMVINDO10", ajuda: "Letras e números. O cliente copia com um toque e ele já vai junto no pedido." }), campo("Válida até", ate, "Até o fim do dia. No máximo 60 dias.")),
    previa
  );
}

function pintarFotoNegocio() {
  const av = $("negAvatar");
  // Sem foto e sem nome: o ícone do tipo na cor dele (em vez de uma letra solta).
  if (!negFoto && !$("negNome").value.trim()) { av.replaceChildren(icone(negTipo, "i")); av.classList.add("vazio"); }
  else { av.classList.remove("vazio"); pintarAvatar(av, negFoto, $("negNome").value); }
  $("negRemoverFoto").hidden = !negFoto;
}
// Tipos em cartões com a cor de cada classe; os já criados ficam marcados e travados.
function pintarTipos(tipos, usados) {
  const box = $("negTipo");
  box.replaceChildren();
  box.classList.toggle("um", tipos.length === 1);
  tipos.forEach((tipo) => {
    const t = NEGOCIOS[tipo];
    const b = el("button", `ng-tipo ${tipo}`); b.type = "button"; b.dataset.valor = tipo;
    b.setAttribute("role", "radio");
    const ic = el("span", "ic"); ic.appendChild(icone(tipo, "i s"));
    const tx = el("span", "tx"); tx.append(el("strong", null, t.rotulo), el("small", null, usados.has(tipo) ? "Já criado" : tipos.length === 1 ? t.desc : t.chamada));
    b.append(ic, tx, el("span", "ok"));
    b.disabled = usados.has(tipo);
    box.appendChild(b);
  });
  // Comunidade não é perfil de negócio (é de graça e proibido vender): o cartão leva a criar um anúncio lá.
  if (tipos.length > 1) {
    const c = el("a", "ng-tipo comunidade"); c.href = "comunidade.html?novo=doacao";
    const ic = el("span", "ic"); ic.appendChild(icone("comunidade", "i s"));
    const tx = el("span", "tx"); tx.append(el("strong", null, "Comunidade"), el("small", null, "Doe, troque ou peça ajuda"));
    c.append(ic, tx);
    c.title = "Abre a Comunidade para anunciar de graça (doação, troca, pedido, quarto ou achados)";
    box.appendChild(c);
  }
  marcarTipo();
}
function marcarTipo() {
  document.querySelectorAll("#negTipo [data-valor]").forEach((x) => { const on = x.dataset.valor === negTipo; x.classList.toggle("on", on); x.setAttribute("aria-checked", String(on)); });
}
function aplicarTipoNoForm() {
  const t = NEGOCIOS[negTipo];
  $("folhaNegocio").dataset.tipo = negTipo;
  // Delivery já tem a "Foto de capa" no cardápio; nos outros, a capa é separada.
  $("negCapaCampo").hidden = negTipo === "delivery";
  $("negPromo").hidden = negTipo === "saude"; // Saúde não tem promoção nem cupom (como nas plataformas de saúde)
  document.querySelectorAll(".ng-plus-campo").forEach((x) => x.remove());
  if (semPlano()) {
    $("negCapaCampo").appendChild(notaPlus("A capa aparece para os clientes com um plano.", "ng-plus-campo"));
    $("negSite").closest(".campo").appendChild(notaPlus("Instagram e site aparecem no seu perfil com um plano.", "ng-plus-campo"));
  }
  if ($("negHorario").children.length) montarHorario();
  $("negNome").placeholder = t.phNome;
  $("negDesc").placeholder = t.phDesc;
  if (!negEditando) $("tNegocio").textContent = `Novo perfil · ${t.rotulo}`;
  pintarFotoNegocio();
}
function escolherTipo(tipo) {
  if (!NEGOCIOS[tipo] || tipo === negTipo) return;
  negTipo = tipo;
  marcarTipo();
  negExtra = { fotos: [], itens: [] };
  aplicarTipoNoForm();
  montarExtras();
}
$("negTipo").addEventListener("click", (e) => {
  const b = e.target.closest("[data-valor]");
  if (!b || b.disabled) return;
  escolherTipo(b.dataset.valor);
});
$("negNome").addEventListener("input", () => { if (!negFoto) pintarFotoNegocio(); });
// WhatsApp no formato (48) 99999-9999 enquanto digita.
$("negWhats").addEventListener("input", () => {
  const i = $("negWhats"), d = i.value.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "").slice(0, 11);
  if (!d) { i.value = ""; return; }
  i.value = d.length <= 2 ? `(${d}` : d.length <= 6 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d.length <= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
});
$("negDesc").addEventListener("input", () => { $("negDescCont").textContent = `${$("negDesc").value.length}/500`; });
$("negTrocarFoto").addEventListener("click", () => $("negArquivo").click());
$("negRemoverFoto").addEventListener("click", () => { negFoto = ""; pintarFotoNegocio(); });
$("negArquivo").addEventListener("change", async () => {
  const arquivo = $("negArquivo").files?.[0];
  $("negArquivo").value = "";
  if (!arquivo) return;
  try {
    const d = await editarImagem(arquivo, { titulo: "Foto do negócio", dica: "O círculo mostra como a foto ou logo aparece. Deixe o principal dentro da linha tracejada.", proporcao: 1, circulo: true, larguraSaida: 480, qualidade: 0.86, limiteBytes: 250000 });
    if (d) { negFoto = d; pintarFotoNegocio(); }
  } catch (e) { toast(erroAmigavel(e)); }
});
let negLocal = null, anLocal = null;
$("negSalvar").addEventListener("click", async () => {
  const nome = $("negNome").value.trim();
  if (nome.length < 2) { toast("Dê um nome ao seu negócio."); $("negNome").focus(); return; }
  const erroLocal = negLocal?.validar();
  if (erroLocal) { toast(erroLocal); return; }
  // Campos novos: confere antes de gravar (as regras recusam o que estiver fora do padrão).
  const insta = nomeInstagram($("negInsta").value);
  if (insta && !/^[A-Za-z0-9._]{1,30}$/.test(insta)) { toast("Instagram: use só o nome do perfil (letras, números, ponto e _)."); $("negInsta").focus(); return; }
  const site = siteCompleto($("negSite").value);
  if (site && (!/^https?:\/\/[^\s]{3,}$/.test(site) || site.length > 120)) { toast("Confira o endereço do site."); $("negSite").focus(); return; }
  const cnpj = soNumeros($("negCnpj").value);
  if (cnpj && !cnpjValido(cnpj)) { toast("O CNPJ não é válido. Confira os números ou deixe em branco."); $("negCnpj").focus(); return; }
  for (const [i, f] of negSemana.entries()) {
    if (f && (!FAIXA.test(f) || f.split("-")[0] === f.split("-")[1])) { toast(`Confira o horário de ${NOMES_DIA[i].toLowerCase()}.`); return; }
  }
  let promocao = null;
  if (negPromo?.ativa) {
    const tt = String(negPromo.titulo || "").trim();
    if (tt.length < 3) { toast("Dê um título à promoção (ou desligue a promoção)."); $("negPromo_titulo")?.focus(); return; }
    const codigo = String(negPromo.codigo || "").trim();
    if (codigo && !/^[A-Z0-9]{3,20}$/.test(codigo)) { toast("O código do cupom precisa ter de 3 a 20 letras ou números."); return; }
    const fim = new Date((negPromo.ate || dataInput(null)) + "T23:59:00");
    if (isNaN(fim) || fim.getTime() < Date.now()) { toast("A data final da promoção já passou."); return; }
    if (fim.getTime() > Date.now() + 61 * 864e5) { toast("A promoção pode durar no máximo 60 dias."); return; }
    promocao = { titulo: tt.slice(0, 60), texto: String(negPromo.texto || "").trim().slice(0, 200), codigo, ate: fb.Timestamp.fromDate(fim) };
  }
  if (negTipo === "saude") promocao = null; // Saúde não tem promoção nem cupom
  const btn = $("negSalvar");
  btn.disabled = true; btn.textContent = "Salvando...";
  try {
    const id = `${eu.uid}_${negTipo}`;
    let foto = negFoto;
    if (foto.startsWith("data:")) foto = await salvarImagem(foto, `negocios/${id}.jpg`);
    let capa = negTipo === "delivery" ? "" : negCapa;
    if (capa.startsWith("data:")) capa = await salvarImagem(capa, `negocios/${id}_capa.jpg`);
    const x = negExtra;
    if (negTipo === "servicos" && !(x.categorias || []).length) { throw new Error("Marque pelo menos uma área de atuação."); }
    if (negTipo === "saude") {
      const sd = x.saude || {};
      if (sd.profissao === "outros" && String(sd.profissaoOutra || "").trim().length < 3) { $("negX_profissaoOutra")?.focus(); throw new Error("Escreva qual é a sua profissão."); }
      if (conselhoDe(sd) && !String(sd.registro || "").trim()) { $("negX_registro")?.focus(); throw new Error(`Informe o número do seu registro no ${conselhoDe(sd)}.`); }
      if (conselhoDe(sd) && !sd.registroUf) { $("negX_registroUf")?.focus(); throw new Error("Escolha o estado do registro."); }
      if (!(sd.modalidades || []).length) throw new Error("Marque como você atende (consultório, online ou em casa).");
    }
    const temOutra = negTipo === "servicos" ? x.categorias.includes("outros") : negTipo === "saude" ? false : x.categoria === "outros";
    if (temOutra && negTipo !== "imoveis" && !textoCatPropria(x.categoriaPersonalizada)) { $("negX_categoriaPersonalizada")?.focus(); throw new Error(`Escreva ${negTipo === "servicos" ? "qual é a sua área" : "a sua categoria"} (campo "${CAT_PROPRIA[negTipo][0]}").`); }
    // Horário por dia: também preenche os campos antigos (dias, abre/fecha, resumo), que a vitrine e os filtros usam.
    const semana = negSemana.some(Boolean) ? [...negSemana] : null;
    if (semana) {
      x.dias = CHAVES_DIA.filter((_, i) => semana[i]);
      const cont = {}; semana.filter(Boolean).forEach((f) => { cont[f] = (cont[f] || 0) + 1; });
      const comum = Object.entries(cont).sort((a, b) => b[1] - a[1])[0][0].split("-");
      if (negTipo === "delivery") { x.horaAbre = comum[0]; x.horaFecha = comum[1]; }
      if (negTipo === "servicos" || negTipo === "saude") x.horario = `${comum[0]} às ${comum[1]}`;
    }
    const extras = { categoria: negTipo === "servicos" ? x.categorias[0] : negTipo === "saude" ? x.saude.profissao : (x.categoria || Object.keys(CATS_NEGOCIO[negTipo])[0]), fotos: [], itens: [] };
    const campos = {
      servicos: ["categorias", "precoDesde", "horario", "atendimento", "dias", "regiao", "experiencia", "diferenciais", "pagamentos", "categoriaPersonalizada"],
      delivery: ["horaAbre", "horaFecha", "tempoMin", "tempoMax", "taxaEntrega", "pedidoMinimo", "dias", "opcoesEntrega", "pagamentos", "categoriaPersonalizada"],
      lojinha: ["entrega", "pagamentos", "categoriaPersonalizada"],
      imoveis: ["tipoAnunciante", "creci"],
      saude: ["dias", "horario"]
    }[negTipo];
    campos.forEach((k) => { extras[k] = x[k] ?? null; });
    if (negTipo !== "imoveis" && negTipo !== "saude") extras.categoriaPersonalizada = temOutra ? textoCatPropria(x.categoriaPersonalizada) : "";
    if (negTipo === "saude") {
      extras.saude = saudeParaSalvar(x.saude);
      extras.categoriaPersonalizada = extras.saude.profissao === "outros" ? textoCatPropria(extras.saude.profissaoOutra) : "";
    }
    if (negTipo === "servicos") {
      const motorista = x.categorias.includes("transporte");
      extras.cnh = motorista ? (x.cnh || []) : [];
      extras.veiculo = motorista ? (x.veiculo || "") : "";
    }
    // Cadastro antigo de imóveis (um imóvel dentro do perfil): vira um anúncio antes de regravar o perfil.
    if (negTipo === "imoveis" && negEditando && (negEditando.preco || negEditando.quartos)) {
      const n0 = negEditando;
      await fb.addDoc(fb.collection(fb.db, "anuncios"), {
        donoId: eu.uid, tipo: "imovel", ativo: true, titulo: "", finalidade: n0.finalidade || "aluguel", categoria: n0.categoria || "outros",
        preco: n0.preco ?? null, condominio: n0.condominio ?? null, quartos: n0.quartos ?? null, banheiros: n0.banheiros ?? null,
        vagas: n0.vagas ?? null, area: n0.area ?? null, bairro: n0.bairro || "", cidade: n0.cidade || "", mobiliado: !!n0.mobiliado,
        descricao: n0.descricao || "", fotos: n0.fotos || [], criadoEm: fb.serverTimestamp(), atualizadoEm: fb.serverTimestamp()
      });
    }
    for (const [i, f] of (x.fotos || []).entries()) extras.fotos.push(f.startsWith("data:") ? await salvarImagem(f, `negocios/${id}_f${i}.jpg`) : f);
    for (const [i, it] of (x.itens || []).entries()) {
      if (!it.nome) continue;
      const fotoItem = it.foto && it.foto.startsWith("data:") ? await salvarImagem(it.foto, `negocios/${id}_i${i}.jpg`) : (it.foto || "");
      const item = { nome: it.nome, preco: it.preco ?? null, foto: fotoItem };
      const curto = (v, m) => String(v || "").trim().slice(0, m);
      if (negTipo === "lojinha") {
        item.estoque = Number.isInteger(it.estoque) && it.estoque >= 0 ? it.estoque : null;
        Object.assign(item, {
          condicao: CONDICAO[it.condicao] ? it.condicao : "novo", marca: curto(it.marca, 30), precoAntigo: Number(it.precoAntigo) > 0 ? Number(it.precoAntigo) : null,
          tamanhos: listaTexto(it.tamanhos), cores: listaTexto(it.cores), descricao: curto(it.descricao, 300), ficha: curto(it.ficha, 500)
        });
      }
      if (negTipo === "delivery") Object.assign(item, { secao: curto(it.secao, 24), descricao: curto(it.descricao, 160), precoAntigo: Number(it.precoAntigo) > 0 ? Number(it.precoAntigo) : null });
      if (negTipo === "servicos") Object.assign(item, { unidade: UNIDADES_SERV[it.unidade] ? it.unidade : "fixo", duracao: curto(it.duracao, 30), descricao: curto(it.descricao, 160) });
      if (negTipo === "servicos") item.categoria = x.categorias.includes(it.categoria) ? it.categoria : x.categorias[0];
      if (negTipo === "saude") Object.assign(item, { duracao: curto(it.duracao, 30), descricao: curto(it.descricao, 160) });
      extras.itens.push(item);
    }
    const loc = negLocal.ler();
    const geo = await pontoDoEndereco(loc, negEditando);
    const dadosNeg = {
      donoId: eu.uid, tipo: negTipo, nome, descricao: $("negDesc").value.trim(),
      cidade: loc.cidade, uf: loc.uf, cidadeIbge: loc.cidadeIbge, bairro: loc.bairro, rua: loc.rua, numero: loc.numero, complemento: loc.complemento, cep: loc.cep,
      whatsapp: $("negWhats").value.trim(), foto, ...extras, atualizadoEm: fb.serverTimestamp(),
      instagram: insta, site, cnpj, capa, semana, promocao, geo
    };
    dadosNeg.busca = buscaDoNegocio(dadosNeg);
    if (JSON.stringify(dadosNeg).length > 950000) throw new Error("Fotos demais para um perfil. Remova algumas fotos e tente de novo.");
    dadosNeg.criadoEm = negEditando?.criadoEm || fb.serverTimestamp();
    dadosNeg.principal = principalEscolhido() || negTipo;
    const gravar = (d) => gravarComLocal((dd) => fb.setDoc(fb.doc(fb.db, "negocios", id), dd), d, NOVOS.negocio);
    let pendente = false;
    // "principal" é o campo mais novo: se só ele for recusado (regras de antes), grava sem ele e tenta depois.
    const gravarTudo = (d) => gravar(d).catch((e) => { if (e?.code !== "permission-denied") throw e; const sp = { ...d }; delete sp.principal; return gravar(sp); });
    try { await gravarTudo(dadosNeg); }
    catch (e) {
      // Saúde só existe nas regras novas: sem elas, não há como guardar o perfil ainda.
      if (e?.code === "permission-denied" && negTipo === "saude") throw new Error("o perfil de Saúde começa a funcionar quando a atualização do sistema for publicada.");
      // Regras novas ainda não publicadas: grava sem os campos novos e guarda eles na conta.
      if (e?.code !== "permission-denied") throw e;
      const novos = Object.fromEntries(NOVOS_NEG.map((k) => [k, dadosNeg[k]]));
      const sem = { ...dadosNeg }; NOVOS_NEG.forEach((k) => delete sem[k]);
      await gravar(sem);
      await fb.setDoc(fb.doc(fb.db, "usuarios", eu.uid), { negociosExtras: { [id]: novos } }, { merge: true });
      dados.negociosExtras = { ...(dados.negociosExtras || {}), [id]: novos };
      pendente = true;
    }
    if (!pendente && extrasPendentes(id)) {
      fb.setDoc(fb.doc(fb.db, "usuarios", eu.uid), { negociosExtras: { [id]: fb.deleteField() } }, { merge: true }).catch(() => {});
      if (dados.negociosExtras) delete dados.negociosExtras[id];
    }
    fecharFolha("folhaNegocio");
    toast(pendente ? "Salvo. Instagram, site, CNPJ, capa, horário e promoção aparecem para os clientes assim que a atualização do sistema for publicada."
      : negEditando ? "Perfil de negócio atualizado" : "Perfil de negócio criado");
    carregarMeusNegocios().then(carregarNumeros);
  } catch (e) { toast("Não foi possível salvar: " + erroAmigavel(e)); }
  finally { btn.disabled = false; btn.textContent = "Salvar"; }
});
$("negExcluir").addEventListener("click", async () => {
  const imoveis = negEditando?.tipo === "imoveis";
  if (!negEditando || !(await confirmarHF({ titulo: `Excluir o perfil "${negEditando.nome}"?`, texto: `Ele sai da vitrine e não dá para desfazer.${imoveis ? " Todos os seus anúncios de imóveis também serão excluídos." : ""}`, ok: "Excluir", icone: "lixo" }))) return;
  try {
    // Imóveis: os anúncios saem junto (senão ficavam no ar sem anunciante).
    if (imoveis) {
      const an = await fb.getDocs(fb.query(fb.collection(fb.db, "anuncios"), fb.where("donoId", "==", eu.uid)));
      await Promise.all(an.docs.map((d) => fb.deleteDoc(d.ref)));
    }
    await fb.deleteDoc(fb.doc(fb.db, "negocios", negEditando.id));
    fecharFolha("folhaNegocio");
    toast("Perfil de negócio excluído");
    carregarMeusNegocios().then(carregarNumeros);
  } catch (e) { toast("Não foi possível excluir: " + erroAmigavel(e)); }
});

// ---------- início ----------
(async function iniciar() {
  try { await iniciarRede(); }
  catch (e) { $("painelNegocios").replaceChildren(el("div", "lista-vazia", e.message || "Não foi possível carregar.")); return; }
  montarBarraRede("");
  pintarBarraRede();
  ouvirAvisos({ notificarNovos: false });
  await carregarMeusNegocios();
  carregarNumeros();
  const p = new URLSearchParams(location.search);
  const tipo = p.get("tipo");
  if (tipo && NEGOCIOS[tipo]) {
    const n = meusNegocios.find((x) => x.tipo === tipo);
    if (n) abrirFormNegocio(n); else novoNegocio(tipo);
  } else if (p.get("novo")) novoNegocio(null);
  else if (p.get("insights")) {
    const n = meusNegocios.find((x) => x.id === p.get("insights"));
    if (n) abrirEstatisticas(n); else if (p.get("insights") === "todos") escolherEstatisticas();
  } else if (p.get("planos")) abrirPlanos({ fb, eu, dados, toast, aoMudar: () => pintarPlano() });
  if (tipo || p.get("novo") || p.get("insights") || p.get("planos")) history.replaceState(history.state, "", "negocios.html");
})();
