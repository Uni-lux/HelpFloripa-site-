// =====================================================
// Planos: o básico que as vitrines, o início e o painel usam (preços, nível, selo e leitura do plano).
// Separado do planos.js (gaveta de assinatura, Pix, negociação) para as páginas não baixarem tudo:
// a gaveta só carrega quando alguém abre os planos. Sem dependências.
// =====================================================
// Chave Pix que recebe os pagamentos (e-mail, telefone com +55, CPF/CNPJ só números ou chave aleatória).
// Vazia: o pedido é criado e a equipe manda a chave pelo Suporte.
export const PIX = { chave: "61935934000100", nome: "HELP FLORIPA", cidade: "FLORIANOPOLIS" };
// Pagamento automático pelo Mercado Pago (Pix com QR que confirma sozinho + cartão de crédito/débito), feito pelas
// Cloud Functions (functions/). automatico: false = o Pix acima, conferido à mão no painel. Ligar só depois de publicar
// as funções e os segredos (_regras/PAGAMENTO-LEIA-ME.md). publicKey: a do Mercado Pago (TEST- = testes; APP_USR- = de verdade).
export const PAGAMENTO = { automatico: false, publicKey: "TEST-1855e5db-1f54-4020-a318-98f3f6187f73", regiao: "southamerica-east1" };
// Planos pagos (nível: quanto maior, mais destaque). Preço por mês.
export const PLANOS = {
  plus: { nome: "Plus", nivel: 1, preco: 29.9, frase: "Libera tudo no seu perfil e você aparece antes dos perfis grátis", cor: "#2563ff",
    titulo: "Seu negócio completo", pitch: "Tudo liberado no perfil e você aparece antes de quem não tem plano." },
  pro: { nome: "Pro", nivel: 2, preco: 39.9, frase: "Tudo do Plus, destaque nas vitrines e no Perto de você", cor: "#7c3aed",
    titulo: "Mais clientes chegando", pitch: "Tudo do Plus e o seu negócio aparece antes, nas vitrines e no Perto de você." },
  premium: { nome: "Premium", nivel: 3, preco: 59.9, frase: "O topo das vitrines e o máximo de destaque", cor: "#f59e0b",
    titulo: "O primeiro que o cliente vê", pitch: "O topo das vitrines, antes de todos, e o maior destaque no Perto de você." }
};
// O que cada plano libera (aparece no topo da gaveta quando a pessoa toca no plano).
export const DESTAQUES_PLANO = {
  plus: ["Todos os seus perfis de negócio no ar", "Até 12 itens e 5 fotos, com capa", "Pedidos, orçamentos e agendamentos pelo site", "Cupons e promoções", "Estatísticas de 90 dias", "Aparece antes dos perfis grátis"],
  pro: ["Tudo do Plus", "Aparece antes do Plus nas vitrines", "Mais perto no Perto de você", "Atendimento prioritário no Suporte"],
  premium: ["Tudo do Pro", "Topo das vitrines, antes de todos", "O maior destaque no Perto de você", "Atendimento prioritário no Suporte"]
};
// Perfil grátis (sem plano): o básico para ser encontrado e conversar. O que passa disso continua guardado e volta com um plano.
export const LIMITES_GRATIS = { itens: 3, fotos: 1, anuncios: 1 };
export const ORDEM_PLANOS = ["plus", "pro", "premium"];
export const PRECO_MIN = Math.min(...ORDEM_PLANOS.map((k) => PLANOS[k].preco));
// [meses, nome, desconto] — quanto mais tempo, mais barato o mês.
export const PERIODOS = [[1, "1 mês", 0], [3, "3 meses", 0.1], [6, "6 meses", 0.15], [12, "12 meses", 0.2]];
export const descontoDe = (meses) => PERIODOS.find(([m]) => m === Number(meses))?.[2] || 0;
// Valor total do período com o desconto (centavos arredondados).
export const valorPeriodo = (k, meses) => Math.round((PLANOS[k]?.preco || 0) * meses * (1 - descontoDe(meses)) * 100) / 100;
export const DIAS_TESTE = 30; // dias grátis a mais na primeira assinatura paga (bônus)
export const DIAS_BONUS = DIAS_TESTE;
// O que cada plano tem: [benefício, Grátis, Plus, Pro, Premium] (true/false ou um texto curto).
export const BENEFICIOS = [
  ["Perfis de negócio no ar", "1", "Todos", "Todos", "Todos"],
  ["Itens (serviços, cardápio ou produtos)", "3", "12", "12", "12"],
  ["Fotos do negócio", "1", "5", "5", "5"],
  ["Anúncios de imóvel", "1", "Sem limite", "Sem limite", "Sem limite"],
  ["Conversa pelo chat e WhatsApp", true, true, true, true],
  ["Pedidos, orçamentos e agendamentos pelo site", false, true, true, true],
  ["Capa e links (Instagram e site)", false, true, true, true],
  ["Cupons e promoções (menos Saúde)", false, true, true, true],
  ["Flash nos perfis de negócio", false, true, true, true],
  ["Estatísticas de 90 dias e Excel", false, true, true, true],
  ["Selo do plano no perfil e nos cartões", false, true, true, true],
  ["Aparece antes dos perfis grátis", false, true, true, true],
  ["Aparece antes do Plus e mais perto no Perto de você", false, false, true, true],
  ["Atendimento prioritário no Suporte", false, false, true, true],
  ["Topo das vitrines (antes de todos)", false, false, false, true]
];

const ms = (t) => t?.toMillis?.() ?? (t?.seconds ? t.seconds * 1000 : typeof t === "number" ? t : 0);
const DIA = 864e5;
// Depois de vencer, o plano continua valendo por mais 3 dias (tempo para renovar sem perder nada).
export const TOLERANCIA_DIAS = 3;
export const fimComTolerancia = (p) => (ms(p?.ate) ? ms(p.ate) + TOLERANCIA_DIAS * DIA : 0);
// Nível do plano ativo (0 = sem plano ou vencido há mais de 3 dias). Planos antigos "pro" continuam valendo.
export const nivelPlano = (p) => (PLANOS[p?.plano] && fimComTolerancia(p) > Date.now() ? PLANOS[p.plano].nivel : 0);
export const emTolerancia = (p) => nivelPlano(p) > 0 && ms(p.ate) <= Date.now();
export const ehPago = (p) => nivelPlano(p) >= 1;   // 90 dias, Excel e selo
export const ehPro = (p) => nivelPlano(p) >= 2;    // destaque nas vitrines e suporte prioritário
export const nomePlano = (k) => PLANOS[k]?.nome || "Sem plano";
export const emTeste = (p) => !!p?.teste && nivelPlano(p) > 0;
// Dias que faltam para o plano vencer (arredondado para cima; 0 quando já venceu).
export const diasRestantes = (p) => Math.max(0, Math.ceil((ms(p?.ate) - Date.now()) / DIA));
export const textoFalta = (d) => (d <= 0 ? "vence hoje" : d === 1 ? "falta 1 dia" : `faltam ${d} dias`);
export const reais = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
// Troca de plano com dias sobrando: o que sobrou vira dias do plano novo, na proporção do preço.
export function creditoDias(atual, novoPlano) {
  if (!nivelPlano(atual) || atual.plano === novoPlano) return 0;
  if (atual.teste) return diasRestantes(atual); // no teste grátis, os meses pagos começam quando o teste acaba
  return Math.floor((diasRestantes(atual) * PLANOS[atual.plano].preco) / PLANOS[novoPlano].preco);
}

// Sem plano, só UM perfil de negócio fica no ar (o "principal", escolhido pelo dono; os outros ficam pausados) e
// sem os extras (selo, destaque, promoção/cupom, flash nos negócios, estatísticas de 90 dias). Cada perfil guarda
// em negocios.principal o tipo escolhido; com plano ativo o campo é ignorado. Anúncios de imóveis seguem o perfil Imóveis.
const tipoPerfil = (n) => (n?.tipo === "imovel" ? "imoveis" : n?.tipo);
export const podeEstarPausado = (n) => !!n?.principal && n.principal !== tipoPerfil(n);
export const NOMES_PERFIL = { servicos: "Freelances", delivery: "Delivery", lojinha: "Lojinha", imoveis: "Imóveis", saude: "Saúde" };
export const TIPOS_PERFIL = Object.keys(NOMES_PERFIL);
// Plano dado numa negociação pode liberar só alguns perfis (planos.tipos = ["servicos", "delivery"...]); sem a lista = todos.
export const perfisDoPlano = (plano) => (nivelPlano(plano) && Array.isArray(plano.tipos) && plano.tipos.length ? plano.tipos : null);
export const negocioPausado = (n, plano) => podeEstarPausado(n) && (!nivelPlano(plano) || !!perfisDoPlano(plano) && !perfisDoPlano(plano).includes(tipoPerfil(n)));
// Selo PLUS/PRO/PREMIUM à mostra (a equipe pode esconder o selo de um plano dado numa negociação: planos.semSelo).
export const mostraSelo = (plano) => !!nivelPlano(plano) && !plano.semSelo;
// Tira os pausados de uma lista de perfis (lê o plano só de quem tem outro perfil como principal).
// Anúncios de imóveis: `principalDe(donoId)` devolve o principal do dono (quando a página já conhece o perfil Imóveis).
export async function semPausados(fb, lista, principalDe = null) {
  const comP = (n) => (n?.tipo === "imovel" && principalDe ? { ...n, principal: principalDe(n.donoId) } : n);
  const donos = [...new Set(lista.filter((n) => podeEstarPausado(comP(n))).map((n) => n.donoId).filter(Boolean))];
  if (!donos.length) return lista;
  const planos = new Map(await Promise.all(donos.map(async (id) => [id, await lerPlano(fb, id).catch(() => null)])));
  return lista.filter((n) => !negocioPausado(comP(n), planos.get(n.donoId)));
}

// Plano de cada conta (planos/{uid}), guardado 10 min na página.
const cache = new Map();
export function lerPlano(fb, uid) {
  if (!fb?.db || !uid) return Promise.resolve(null);
  const c = cache.get(uid);
  if (c && Date.now() - c.em < 10 * 60000) return c.p;
  const p = fb.getDoc(fb.doc(fb.db, "planos", uid)).then((s) => (s.exists() ? s.data() : null)).catch(() => null);
  cache.set(uid, { em: Date.now(), p });
  return p;
}
export const esquecerPlano = (uid) => cache.delete(uid);
// Plano já lido em lote (vitrines): guarda no mesmo lugar do lerPlano.
export const guardarPlano = (uid, p) => { if (uid) cache.set(uid, { em: Date.now(), p: Promise.resolve(p ?? null) }); };
// Classe da cor do plano (hf-pl-plus/pro/premium; sem plano ou com o selo escondido: hf-pl-gratis).
export function classePlano(pl) { cssSelo(); const k = mostraSelo(pl) ? pl.plano : "gratis"; return "hf-pl-" + (PLANOS[k] ? k : "gratis"); }
// Pinta o cartão pela cor do plano de quem anuncia (classe hf-pl-plus/pro/premium; sem plano: hf-pl-gratis).
// Lê o plano uma vez por dono (lerPlano guarda 10 min). Devolve o plano (ou null).
export async function corDoPlano(fb, cartao, donoId) {
  cssSelo();
  const pl = await lerPlano(fb, donoId).catch(() => null);
  const k = mostraSelo(pl) ? pl.plano : "gratis";
  cartao?.classList.add("hf-pl-" + (PLANOS[k] ? k : "gratis"));
  return pl;
}

// Aviso do sino quando o plano está perto de vencer (7 dias) ou venceu há pouco (15 dias).
// O id muda a cada período (data de fim), então cada renovação gera um aviso novo.
export async function avisoPlano(fb, uid) {
  const p = await lerPlano(fb, uid);
  const fim = ms(p?.ate);
  if (!p || !PLANOS[p.plano] || !fim) return null;
  const agora = Date.now(), dias = Math.ceil((fim - agora) / DIA), nome = (p.teste ? "Teste grátis do " : "Plano ") + PLANOS[p.plano].nome;
  if (dias > 7 || agora - fim > 15 * DIA) return null;
  const venceu = fim <= agora, tolerancia = venceu && fimComTolerancia(p) > agora;
  return {
    // Volta a contar como nova com 7, 3 e 1 dia(s) para vencer e no dia em que vence.
    tipo: "plano", id: `pl_${p.plano}_${Math.round(fim / 1000)}`, nome, plano: p.plano, venceu, dias,
    quando: venceu ? fim : fim - (dias <= 1 ? 1 : dias <= 3 ? 3 : 7) * DIA,
    detalhe: tolerancia ? `Renove até ${new Date(fimComTolerancia(p)).toLocaleDateString("pt-BR")} para não perder nada. Depois, só um perfil de negócio fica no ar e sem selo, destaque, promoção e flash.`
      : venceu ? "Sem plano, só um perfil de negócio fica no ar, sem selo, destaque, promoção e flash. Renove para voltar a ter tudo."
      : "Renove para não perder o selo, o destaque e os outros perfis de negócio no ar."
  };
}
export const textoPlano = (i) => (i.venceu ? "venceu" : i.dias <= 1 ? "vence amanhã" : `vence em ${i.dias} dias`);

// Selo do plano (cartões e perfil do negócio): "PLUS", "PRO" ou "PREMIUM" na cor do plano.
export function seloPlano(p, classe = "selo-pro") {
  cssSelo();
  const k = typeof p === "string" ? p : p?.plano;
  const s = document.createElement("span"); s.className = classe + " pl-" + (PLANOS[k] ? k : "pro"); s.textContent = (PLANOS[k]?.nome || "Pro").toUpperCase(); s.title = `Negócio com plano ${PLANOS[k]?.nome || "Pro"}`;
  return s;
}
export const seloPro = (classe) => seloPlano("pro", classe);

// Só o estilo do selo (o resto do visual dos planos fica no planos.js).
let seloPronto = false;
function cssSelo() {
  if (seloPronto) return; seloPronto = true;
  const s = document.createElement("style");
  s.textContent = `
.selo-pro { display: inline-flex; align-items: center; height: 18px; padding: 0 6px; border-radius: 6px; font-size: 10px; font-weight: 900; letter-spacing: .06em; color: #fff; background: linear-gradient(135deg, #7c3aed, #2563eb); vertical-align: middle; }
.selo-pro.pl-plus { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
.selo-pro.pl-premium { background: linear-gradient(135deg, #f59e0b, #d97706); }
/* Cartões pela cor do plano de quem anuncia (Início, Explorar): borda em degradê e brilho; grátis = azul claro. */
.hf-pl-plus, .hf-pl-pro, .hf-pl-premium { border: 1.5px solid transparent !important; background: linear-gradient(var(--hf-pl-bg, var(--panel, #10181d)), var(--hf-pl-bg, var(--panel, #10181d))) padding-box, var(--hf-pl-borda) border-box !important; }
.hf-pl-plus { --hf-pl: #2563ff; --hf-pl-borda: linear-gradient(135deg, #7cb4ff, #2563ff 45%, #1e3a8a); box-shadow: 0 12px 28px -18px #2563ff; }
.hf-pl-pro { --hf-pl: #7c3aed; --hf-pl-borda: linear-gradient(135deg, #a855f7, #7c3aed 45%, #2f6bff); box-shadow: 0 12px 28px -16px #7c3aed; }
.hf-pl-premium { --hf-pl: #f59e0b; --hf-pl-borda: linear-gradient(135deg, #fde68a, #f59e0b 35%, #b45309 60%, #fcd34d); box-shadow: 0 14px 30px -14px rgba(245, 158, 11, .6); }
.hf-pl-gratis { --hf-pl: #00adee; }`;
  document.head.appendChild(s);
}
