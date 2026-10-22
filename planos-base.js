// =====================================================
// Planos: o básico que as vitrines, o início e o painel usam (preços, nível, selo e leitura do plano).
// Separado do planos.js (gaveta de assinatura, Pix, negociação) para as páginas não baixarem tudo:
// a gaveta só carrega quando alguém abre os planos. Sem dependências.
// =====================================================
// Chave Pix que recebe os pagamentos (e-mail, telefone com +55, CPF/CNPJ só números ou chave aleatória).
// Vazia: o pedido é criado e a equipe manda a chave pelo Suporte.
export const PIX = { chave: "", nome: "HELP FLORIPA", cidade: "FLORIANOPOLIS" };
// Planos pagos (nível: quanto maior, mais destaque). Preço por mês.
export const PLANOS = {
  plus: { nome: "Plus", nivel: 1, preco: 29.9, frase: "Selo no perfil e estatísticas completas", cor: "#0ea5e9" },
  pro: { nome: "Pro", nivel: 2, preco: 39.9, frase: "Destaque nas vitrines e atendimento prioritário", cor: "#7c3aed" },
  premium: { nome: "Premium", nivel: 3, preco: 59.9, frase: "O topo das vitrines e o máximo de destaque", cor: "#f59e0b" }
};
export const ORDEM_PLANOS = ["plus", "pro", "premium"];
export const PRECO_MIN = Math.min(...ORDEM_PLANOS.map((k) => PLANOS[k].preco));
// [meses, nome, desconto] — quanto mais tempo, mais barato o mês.
export const PERIODOS = [[1, "1 mês", 0], [3, "3 meses", 0.1], [6, "6 meses", 0.15], [12, "12 meses", 0.2]];
export const descontoDe = (meses) => PERIODOS.find(([m]) => m === Number(meses))?.[2] || 0;
// Valor total do período com o desconto (centavos arredondados).
export const valorPeriodo = (k, meses) => Math.round((PLANOS[k]?.preco || 0) * meses * (1 - descontoDe(meses)) * 100) / 100;
export const DIAS_TESTE = 30; // dias grátis a mais na primeira assinatura paga (bônus)
export const DIAS_BONUS = DIAS_TESTE;
// O que cada plano tem: [benefício, Plus, Pro, Premium] (tudo o que está marcado o site já faz).
export const BENEFICIOS = [
  ["Perfil de negócio (Freelances, Delivery, Shopping, Imóveis e Saúde)", true, true, true],
  ["Pedidos, orçamentos e conversas pelo chat", true, true, true],
  ["Avaliações, cupons e promoções", true, true, true],
  ["Selo do plano no perfil e nos cartões", true, true, true],
  ["Estatísticas de 90 dias e relatório em Excel", true, true, true],
  ["Aparece antes nas vitrines e no Perto de você", false, true, true],
  ["Atendimento prioritário no Suporte", false, true, true],
  ["Topo das vitrines (antes de todos) e destaque máximo", false, false, true]
];

const ms = (t) => t?.toMillis?.() ?? (t?.seconds ? t.seconds * 1000 : typeof t === "number" ? t : 0);
const DIA = 864e5;
// Nível do plano ativo (0 = sem plano ou vencido). Planos antigos "pro" continuam valendo.
export const nivelPlano = (p) => (PLANOS[p?.plano] && ms(p.ate) > Date.now() ? PLANOS[p.plano].nivel : 0);
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

// Aviso do sino quando o plano está perto de vencer (7 dias) ou venceu há pouco (15 dias).
// O id muda a cada período (data de fim), então cada renovação gera um aviso novo.
export async function avisoPlano(fb, uid) {
  const p = await lerPlano(fb, uid);
  const fim = ms(p?.ate);
  if (!p || !PLANOS[p.plano] || !fim) return null;
  const agora = Date.now(), dias = Math.ceil((fim - agora) / DIA), nome = (p.teste ? "Teste grátis do " : "Plano ") + PLANOS[p.plano].nome;
  if (dias > 7 || agora - fim > 15 * DIA) return null;
  const venceu = fim <= agora;
  return {
    // Volta a contar como nova com 7, 3 e 1 dia(s) para vencer e no dia em que vence.
    tipo: "plano", id: `pl_${p.plano}_${Math.round(fim / 1000)}`, nome, plano: p.plano, venceu, dias,
    quando: venceu ? fim : fim - (dias <= 1 ? 1 : dias <= 3 ? 3 : 7) * DIA,
    detalhe: venceu ? "Renove para voltar a ter o selo, o destaque e as estatísticas completas." : "Renove para não perder o selo e o destaque nas vitrines."
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
.selo-pro.pl-plus { background: linear-gradient(135deg, #0ea5e9, #2563eb); }
.selo-pro.pl-premium { background: linear-gradient(135deg, #f59e0b, #d97706); }`;
  document.head.appendChild(s);
}
