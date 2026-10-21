// =====================================================
// Planos dos perfis profissionais: Plus, Pro e Premium (não existe plano Grátis).
// - Primeiro acesso: 30 dias grátis no plano que a pessoa escolher (uma vez por conta; ela mesma grava
//   planos/{uid} com teste: true, só se a conta nunca teve plano).
// - Pagamento por Pix (manual): a pessoa escolhe o plano e o período, o pedido fica em planos_pedidos/{id}
//   e aparece o Pix (copia e cola + QR Code). O dono do site confere o pagamento no painel e ativa: planos/{uid}
//   { plano: "plus" | "pro" | "premium", ate } — vale para todos os negócios da conta e vence sozinho na data.
// - Quem não consegue pagar agora (baixa renda) ou quer fazer parceria pede uma condição especial:
//   planos_negociacoes/{uid} (uma por pessoa); só os donos do site leem e negociam.
// - Preços, benefícios e a chave Pix ficam aqui em cima (mudar o ?v= de quem importa ao editar).
// Sem dependência do rede.js.
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
export const PERIODOS = [[1, "1 mês"], [3, "3 meses"], [6, "6 meses"], [12, "12 meses"]];
export const DIAS_TESTE = 30; // teste grátis no primeiro acesso
// O que cada plano tem: [benefício, Plus, Pro, Premium] (tudo o que está marcado o site já faz).
export const BENEFICIOS = [
  ["Perfil de negócio (Freelances, Delivery, Shopping e Imóveis)", true, true, true],
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

// Selo do plano (cartões e perfil do negócio): "PLUS", "PRO" ou "PREMIUM" na cor do plano.
export function seloPlano(p, classe = "selo-pro") {
  css();
  const k = typeof p === "string" ? p : p?.plano;
  const s = document.createElement("span"); s.className = classe + " pl-" + (PLANOS[k] ? k : "pro"); s.textContent = (PLANOS[k]?.nome || "Pro").toUpperCase(); s.title = `Negócio com plano ${PLANOS[k]?.nome || "Pro"}`;
  return s;
}
export const seloPro = (classe) => seloPlano("pro", classe);

// ---------- Pix "copia e cola" (BR Code do Banco Central, EMV com CRC16) ----------
const campo = (id, v) => id + String(v.length).padStart(2, "0") + v;
const limpo = (t, n) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 .-]/g, "").toUpperCase().slice(0, n);
function crc16(t) {
  let c = 0xffff;
  for (let i = 0; i < t.length; i++) { c ^= t.charCodeAt(i) << 8; for (let k = 0; k < 8; k++) c = c & 0x8000 ? (c << 1) ^ 0x1021 : c << 1; c &= 0xffff; }
  return c.toString(16).toUpperCase().padStart(4, "0");
}
export function codigoPix({ chave = PIX.chave, nome = PIX.nome, cidade = PIX.cidade, valor, txid = "***" } = {}) {
  if (!chave) return "";
  const conta = campo("00", "br.gov.bcb.pix") + campo("01", String(chave).trim());
  const corpo = campo("00", "01") + campo("26", conta) + campo("52", "0000") + campo("53", "986") +
    (valor ? campo("54", Number(valor).toFixed(2)) : "") + campo("58", "BR") + campo("59", limpo(nome, 25) || "HELP FLORIPA") +
    campo("60", limpo(cidade, 15) || "FLORIANOPOLIS") + campo("62", campo("05", String(txid).replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***")) + "6304";
  return corpo + crc16(corpo);
}
// QR Code desenhado em SVG (gerador MIT carregado só aqui).
async function qrSvg(texto) {
  const { default: qrcode } = await import("./qrcode-gerador.js?v=1");
  const q = qrcode(0, "M"); q.addData(texto); q.make();
  const n = q.getModuleCount(), m = 4, t = n + m * 2;
  let d = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) d += `M${x + m} ${y + m}h1v1h-1z`;
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg"); svg.setAttribute("viewBox", `0 0 ${t} ${t}`); svg.setAttribute("class", "pl-qr"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "QR Code do Pix");
  const fundo = document.createElementNS(ns, "rect"); fundo.setAttribute("width", t); fundo.setAttribute("height", t); fundo.setAttribute("fill", "#fff");
  const p = document.createElementNS(ns, "path"); p.setAttribute("d", d); p.setAttribute("fill", "#0f1b22");
  svg.append(fundo, p);
  return svg;
}

// ---------- tela dos planos (gaveta) ----------
const CSS = `
.pl-fundo { position: fixed; inset: 0; z-index: 5600; display: flex; align-items: flex-end; justify-content: center; background: rgba(2, 8, 14, .6); }
.pl-caixa { width: min(560px, 100%); max-height: 92vh; overflow-y: auto; overscroll-behavior: contain; background: var(--panel, #10181d); color: var(--text, #eef3f5); border-radius: 24px 24px 0 0; padding: 0 18px calc(18px + env(safe-area-inset-bottom)); box-shadow: 0 -18px 60px rgba(0,0,0,.45); }
@media (min-width: 700px) { .pl-fundo { align-items: center; } .pl-caixa { border-radius: 24px; } }
.pl-topo { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 0 10px; background: var(--panel, #10181d); }
.pl-topo strong { font-size: 18px; }
.pl-x { width: 38px; height: 38px; border: 0; border-radius: 50%; background: color-mix(in srgb, var(--muted, #8fa0ab) 14%, transparent); color: inherit; font-size: 22px; cursor: pointer; }
.pl-hero { position: relative; overflow: hidden; padding: 20px; border-radius: 20px; color: #fff; background: radial-gradient(120% 140% at 100% 0%, #7c3aed 0%, #2563eb 45%, #0b3d5c 100%); }
.pl-hero small { font-size: 11.5px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; opacity: .85; }
.pl-hero h3 { margin: 4px 0 6px; font-size: 24px; letter-spacing: -.02em; }
.pl-hero p { margin: 0; font-size: 14px; opacity: .9; line-height: 1.45; }
.pl-preco { display: flex; align-items: baseline; gap: 6px; margin-top: 12px; }
.pl-preco b { font-size: 32px; letter-spacing: -.02em; }
.pl-preco span { font-size: 14px; opacity: .85; }
.pl-tabela { margin-top: 14px; border: 1px solid var(--line, #22313a); border-radius: 18px; overflow: hidden; }
.pl-lin { display: grid; grid-template-columns: 1fr 64px 64px; align-items: center; gap: 6px; padding: 10px 12px; font-size: 13.5px; }
.pl-lin + .pl-lin { border-top: 1px solid var(--line, #22313a); }
.pl-lin.cab { background: var(--panel-2, #162128); font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: var(--muted, #8fa0ab); }
.pl-lin.cab span:last-child { color: #7c3aed; }
.pl-lin span:nth-child(n+2) { text-align: center; font-weight: 800; }
.pl-sim { color: #2fbf71; } .pl-nao { color: var(--muted, #8fa0ab); opacity: .6; }
.pl-sec { margin: 16px 2px 8px; font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--muted, #8fa0ab); }
.pl-periodos { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.pl-per { display: grid; gap: 2px; padding: 12px; border-radius: 16px; border: 1.5px solid var(--line, #22313a); background: var(--panel-2, #162128); color: inherit; font: inherit; text-align: left; cursor: pointer; }
.pl-per b { font-size: 14.5px; } .pl-per small { font-size: 12.5px; color: var(--muted, #8fa0ab); }
.pl-per.on { border-color: #7c3aed; background: color-mix(in srgb, #7c3aed 14%, var(--panel-2, #162128)); }
.pl-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; box-sizing: border-box; text-decoration: none; min-height: 50px; margin-top: 14px; border: 0; border-radius: 16px; background: linear-gradient(135deg, #7c3aed, #2563eb); color: #fff; font: inherit; font-size: 15.5px; font-weight: 800; cursor: pointer; box-shadow: 0 12px 26px -12px #7c3aed; }
.pl-btn.sec { background: none; border: 1px solid var(--line, #22313a); color: inherit; box-shadow: none; }
.pl-btn:disabled { opacity: .6; cursor: default; }
.pl-nota { margin: 10px 2px 0; font-size: 12.5px; color: var(--muted, #8fa0ab); line-height: 1.45; text-align: center; }
.pl-ativo { display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: 18px; border: 1px solid color-mix(in srgb, #2fbf71 45%, transparent); background: color-mix(in srgb, #2fbf71 10%, transparent); margin-top: 12px; }
.pl-ativo b { display: block; } .pl-ativo small { color: var(--muted, #8fa0ab); }
.pl-pix { display: grid; justify-items: center; gap: 10px; padding: 16px; border-radius: 20px; background: var(--panel-2, #162128); border: 1px solid var(--line, #22313a); margin-top: 12px; text-align: center; }
.pl-qr { width: 220px; height: 220px; border-radius: 12px; }
.pl-codigo { width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 12px; border: 1px dashed var(--line, #22313a); background: var(--bg, #0b1115); color: inherit; font: 12px ui-monospace, SFMono-Regular, Menlo, monospace; word-break: break-all; text-align: left; max-height: 84px; overflow: auto; }
.pl-pix b.valor { font-size: 24px; }
.pl-passos { margin: 6px 0 0; padding-left: 18px; text-align: left; font-size: 13px; line-height: 1.6; color: var(--muted, #8fa0ab); }
.selo-pro { display: inline-flex; align-items: center; height: 18px; padding: 0 6px; border-radius: 6px; font-size: 10px; font-weight: 900; letter-spacing: .06em; color: #fff; background: linear-gradient(135deg, #7c3aed, #2563eb); vertical-align: middle; }
.pl-hero h3 + p { max-width: 36ch; }
.pl-preco { flex-wrap: wrap; column-gap: 8px; row-gap: 0; }
.pl-preco .de { flex-basis: 100%; font-size: 12.5px; font-weight: 700; opacity: .8; }
.pl-cards { display: grid; gap: 10px; margin-top: 14px; }
.pl-card { --c: #7c3aed; position: relative; display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 2px 12px; width: 100%; padding: 14px 16px; border-radius: 18px; border: 1.5px solid var(--line, #22313a); background: var(--panel-2, #162128); color: inherit; font: inherit; text-align: left; cursor: pointer; }
.pl-card b { font-size: 16px; display: flex; align-items: center; gap: 8px; }
.pl-card b::before { content: ""; width: 10px; height: 10px; border-radius: 50%; background: var(--c); box-shadow: 0 0 0 4px color-mix(in srgb, var(--c) 22%, transparent); }
.pl-card small { grid-column: 1; font-size: 12.5px; color: var(--muted, #8fa0ab); line-height: 1.35; }
.pl-card .pv { grid-row: 1 / span 2; grid-column: 2; text-align: right; font-size: 18px; font-weight: 900; letter-spacing: -.01em; }
.pl-card .pv span { display: block; font-size: 11.5px; font-weight: 600; color: var(--muted, #8fa0ab); }
.pl-card.on { border-color: var(--c); background: color-mix(in srgb, var(--c) 13%, var(--panel-2, #162128)); box-shadow: 0 10px 24px -16px var(--c); }
.pl-card .tag { position: absolute; top: -9px; right: 14px; padding: 2px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 900; letter-spacing: .04em; text-transform: uppercase; color: #fff; background: var(--c); }
.pl-card .atual { grid-column: 1 / -1; margin-top: 4px; font-size: 12px; font-weight: 800; color: #2fbf71; }
.pl-tabela.c3 .pl-lin { grid-template-columns: 1fr repeat(3, 58px); gap: 4px; padding: 10px; font-size: 13px; }
.pl-tabela.c3 .pl-lin.cab { font-size: 11px; letter-spacing: .02em; }
.pl-btn.pl-teste { background: linear-gradient(135deg, #16a34a, #2fbf71); box-shadow: 0 12px 26px -12px #16a34a; }
.pl-lin.cab span:last-child { color: inherit; }
.pl-lin span.sel { background: color-mix(in srgb, var(--c, #7c3aed) 14%, transparent); border-radius: 8px; }
.pl-lin.cab span.sel { color: var(--c, #7c3aed); }
.pl-status { display: grid; gap: 8px; padding: 14px 16px; border-radius: 18px; margin-top: 12px; border: 1px solid color-mix(in srgb, #2fbf71 45%, transparent); background: color-mix(in srgb, #2fbf71 9%, transparent); }
.pl-status .lin { display: flex; align-items: center; gap: 10px; }
.pl-status .lin > div:not(.dias) { flex: 1; min-width: 0; }
.pl-status b { display: block; font-size: 15px; } .pl-status small { color: var(--muted, #8fa0ab); font-size: 12.5px; }
.pl-status .dias { flex: none; text-align: center; min-width: 58px; padding: 6px 8px; border-radius: 14px; background: color-mix(in srgb, #2fbf71 18%, transparent); }
.pl-status .dias strong { display: block; font-size: 22px; line-height: 1; } .pl-status .dias span { font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; }
.pl-barra { height: 8px; border-radius: 999px; background: color-mix(in srgb, var(--muted, #8fa0ab) 22%, transparent); overflow: hidden; }
.pl-barra i { display: block; height: 100%; border-radius: inherit; background: #2fbf71; }
.pl-status.perto { border-color: color-mix(in srgb, #f5a524 55%, transparent); background: color-mix(in srgb, #f5a524 10%, transparent); }
.pl-status.perto .dias { background: color-mix(in srgb, #f5a524 22%, transparent); } .pl-status.perto .pl-barra i { background: #f5a524; }
.pl-status.vencido { border-color: color-mix(in srgb, #ef4444 50%, transparent); background: color-mix(in srgb, #ef4444 9%, transparent); }
.pl-credito { margin: 10px 2px 0; padding: 10px 12px; border-radius: 14px; font-size: 12.5px; line-height: 1.45; background: color-mix(in srgb, #2563eb 12%, transparent); }
.pl-ajuda { display: grid; gap: 10px; margin-top: 18px; padding: 16px; border-radius: 20px; border: 1px dashed color-mix(in srgb, #2fbf71 55%, var(--line, #22313a)); background: color-mix(in srgb, #2fbf71 6%, transparent); }
.pl-ajuda b { font-size: 15.5px; } .pl-ajuda p { margin: 0; font-size: 13px; line-height: 1.5; color: var(--muted, #8fa0ab); }
.pl-ajuda .bts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.pl-ajuda .pl-btn { margin-top: 0; min-height: 46px; font-size: 14px; }
.pl-ajuda .pl-btn.verde { background: #2fbf71; box-shadow: none; }
.pl-volta { display: inline-flex; align-items: center; gap: 4px; margin: 2px 0 10px; padding: 6px 0; border: 0; background: none; color: var(--muted, #8fa0ab); font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
.pl-form { display: grid; gap: 12px; }
.pl-form h3 { margin: 0; font-size: 20px; } .pl-form > p { margin: 0; font-size: 13.5px; line-height: 1.5; color: var(--muted, #8fa0ab); }
.pl-form label { display: grid; gap: 6px; font-size: 13px; font-weight: 700; }
.pl-form label small { font-weight: 500; color: var(--muted, #8fa0ab); }
.pl-form input, .pl-form textarea { width: 100%; box-sizing: border-box; padding: 12px 14px; border-radius: 14px; border: 1px solid var(--line, #22313a); background: var(--bg, #0b1115); color: inherit; font: inherit; font-size: 15px; }
.pl-form textarea { min-height: 120px; resize: vertical; }
.pl-tipos { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.pl-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.pl-chip { padding: 8px 14px; border-radius: 999px; border: 1.5px solid var(--line, #22313a); background: none; color: inherit; font: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer; }
.pl-chip.on { border-color: #2fbf71; background: color-mix(in srgb, #2fbf71 14%, transparent); }
.pl-neg { display: grid; gap: 6px; padding: 14px 16px; border-radius: 18px; border: 1px solid var(--line, #22313a); background: var(--panel-2, #162128); }
.pl-neg .st { justify-self: start; padding: 3px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 800; background: color-mix(in srgb, #f5a524 20%, transparent); color: #f5a524; }
.pl-neg .st.ok { background: color-mix(in srgb, #2fbf71 20%, transparent); color: #2fbf71; } .pl-neg .st.nao { background: color-mix(in srgb, #ef4444 18%, transparent); color: #ef4444; }
.pl-neg q { display: block; font-size: 13px; color: var(--muted, #8fa0ab); white-space: pre-wrap; }
.pl-neg .resp { padding: 10px 12px; border-radius: 12px; background: color-mix(in srgb, #2563eb 12%, transparent); font-size: 13.5px; white-space: pre-wrap; }
.selo-pro.pl-plus { background: linear-gradient(135deg, #0ea5e9, #2563eb); }
.selo-pro.pl-premium { background: linear-gradient(135deg, #f59e0b, #d97706); }
`;
let cssPronto = false;
function css() { if (cssPronto) return; cssPronto = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); }
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
async function copiar(t, toast) { try { await navigator.clipboard.writeText(t); toast?.("Código Pix copiado. Cole no app do seu banco."); } catch { toast?.("Copie o código manualmente."); } }

// Pedido em aberto da pessoa (o último pendente).
export async function pedidoAberto(fb, uid) {
  try {
    const s = await fb.getDocs(fb.query(fb.collection(fb.db, "planos_pedidos"), fb.where("uid", "==", uid), fb.limit(20)));
    return s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => p.status === "pendente").sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm))[0] || null;
  } catch { return null; }
}
// Pedido de condição especial ou parceria da pessoa (planos_negociacoes/{uid}).
export const TIPOS_NEG = { apoio: "Condição especial", parceria: "Parceria" };
export const STATUS_NEG = { novo: "Recebido · em análise", em_conversa: "Em conversa com a equipe", aprovado: "Aprovado", recusado: "Não aprovado", cancelado: "Cancelado" };
export async function lerNegociacao(fb, uid) {
  try { const s = await fb.getDoc(fb.doc(fb.db, "planos_negociacoes", uid)); return s.exists() ? { id: s.id, ...s.data() } : null; } catch { return null; }
}
const negAberta = (n) => n && (n.status === "novo" || n.status === "em_conversa");
// Teste grátis: só para quem nunca teve plano (planos/{uid} não existe). Erro de leitura = não oferece.
export async function testeDisponivel(fb, uid) {
  try { return !(await fb.getDoc(fb.doc(fb.db, "planos", uid))).exists(); } catch { return false; }
}
export async function comecarTeste(fb, uid, plano) {
  const dados = { plano, teste: true, meses: 1, ate: fb.Timestamp.fromMillis(Date.now() + DIAS_TESTE * DIA), ativadoEm: fb.serverTimestamp(), ativadoPor: uid };
  await fb.setDoc(fb.doc(fb.db, "planos", uid), dados);
  esquecerPlano(uid);
  return dados;
}
const dataLonga = (t) => new Date(ms(t)).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

// Cartão "Seu plano X · faltam N dias" (barra do tempo que sobra; laranja na última semana).
export function cartaoStatus(plano) {
  css();
  const nv = nivelPlano(plano), d = diasRestantes(plano), k = plano?.plano;
  const venceuHa = Math.floor((Date.now() - ms(plano?.ate)) / DIA);
  if (!nv && !(PLANOS[k] && ms(plano?.ate) && venceuHa <= 30)) return null;
  const c = el("div", "pl-status" + (!nv ? " vencido" : d <= 7 ? " perto" : ""));
  const lin = el("div", "lin"), t = el("div");
  if (nv) {
    if (plano.teste) t.append(el("b", null, `Teste grátis do ${nomePlano(k)}`), el("small", null, `Termina em ${dataLonga(plano.ate)}. ${d <= 7 ? "Assine agora para não perder o selo e o destaque." : "Assine quando quiser: os meses pagos começam depois do teste."}`));
    else t.append(el("b", null, `Seu plano ${nomePlano(k)} está ativo`), el("small", null, `Vence em ${dataLonga(plano.ate)}. ${d <= 7 ? "Renove agora para não perder o destaque." : "Renove antes para somar os dias."}`));
    const dd = el("div", "dias"); dd.append(el("strong", null, String(d)), el("span", null, d === 1 ? "dia" : "dias"));
    lin.append(seloPlano(k), t, dd); c.appendChild(lin);
    const total = Math.max(d, (Number(plano.meses) || 1) * 30);
    const b = el("div", "pl-barra"); const i = el("i"); i.style.width = Math.max(3, Math.min(100, (d / total) * 100)) + "%"; b.appendChild(i);
    b.setAttribute("role", "progressbar"); b.setAttribute("aria-label", `${textoFalta(d)} do plano`); b.setAttribute("aria-valuemin", "0"); b.setAttribute("aria-valuemax", String(total)); b.setAttribute("aria-valuenow", String(d));
    c.appendChild(b);
  } else {
    t.append(el("b", null, plano.teste ? `Seu teste grátis do ${nomePlano(k)} terminou` : `Seu plano ${nomePlano(k)} venceu`), el("small", null, `${plano.teste ? "Terminou" : "Venceu"} em ${dataLonga(plano.ate)}. Escolha um plano abaixo para voltar a ter o selo e o destaque.`));
    lin.append(seloPlano(k), t); c.appendChild(lin);
  }
  return c;
}

// Abre a gaveta dos planos. op = { fb, eu, dados, toast, aoMudar, plano? (já escolhido) }
export async function abrirPlanos(op) {
  css();
  const { fb, eu, toast = () => {} } = op;
  document.querySelector(".pl-fundo")?.remove();
  const fundo = el("div", "pl-fundo"); fundo.setAttribute("role", "dialog"); fundo.setAttribute("aria-modal", "true"); fundo.setAttribute("aria-label", "Planos");
  const cx = el("div", "pl-caixa");
  const topo = el("div", "pl-topo"); const x = el("button", "pl-x", "×"); x.type = "button"; x.dataset.fechar = ""; x.setAttribute("aria-label", "Fechar");
  topo.append(el("strong", null, "Planos para negócios"), x);
  const corpo = el("div");
  cx.append(topo, corpo); fundo.appendChild(cx); document.body.appendChild(fundo);
  const fechar = () => { fundo.remove(); document.removeEventListener("keydown", tecla); };
  const tecla = (e) => { if (e.key === "Escape") fechar(); };
  document.addEventListener("keydown", tecla);
  fundo.addEventListener("click", (e) => { if (e.target === fundo) fechar(); });
  x.addEventListener("click", fechar);
  corpo.appendChild(el("p", "pl-nota", "Carregando..."));
  let [plano, pedido, neg, teste] = await Promise.all([lerPlano(fb, eu.uid), pedidoAberto(fb, eu.uid), lerNegociacao(fb, eu.uid), testeDisponivel(fb, eu.uid)]);
  if (pedido) { mostrarPix(pedido); return; }
  if (op.negociar) { mostrarNegociacao(op.negociar); return; }
  pintarEscolha();

  function pintarEscolha() {
    corpo.replaceChildren(); cx.scrollTop = 0;
    const hero = el("div", "pl-hero");
    hero.append(el("small", null, teste ? `${DIAS_TESTE} dias grátis no primeiro acesso` : "Planos Help Floripa"), el("h3", null, "Mais clientes para o seu negócio"),
      el("p", null, "Selo no perfil, destaque nas vitrines e no Perto de você, estatísticas completas e atendimento prioritário."));
    const preco = el("div", "pl-preco");
    if (teste) preco.append(el("span", "de", "Escolha qualquer plano e use"), el("b", null, `${DIAS_TESTE} dias grátis`), el("span", null, `depois a partir de ${reais(PRECO_MIN)} por mês · vale para todos os seus negócios`));
    else preco.append(el("span", "de", "A partir de"), el("b", null, reais(PRECO_MIN)), el("span", null, "por mês · vale para todos os seus negócios"));
    hero.appendChild(preco);
    corpo.appendChild(hero);
    const st = cartaoStatus(plano); if (st) corpo.appendChild(st);
    const atual = nivelPlano(plano) ? plano.plano : "";
    let escolhido = PLANOS[op.plano] ? op.plano : atual || "pro", meses = 1;

    corpo.appendChild(el("div", "pl-sec", "Escolha o plano"));
    const cards = el("div", "pl-cards");
    ORDEM_PLANOS.forEach((k) => {
      const P = PLANOS[k];
      const b = el("button", "pl-card"); b.type = "button"; b.dataset.plano = k; b.style.setProperty("--c", P.cor); b.setAttribute("aria-pressed", "false");
      const pv = el("div", "pv", reais(P.preco)); pv.appendChild(el("span", null, "por mês"));
      b.append(el("b", null, P.nome), pv, el("small", null, P.frase));
      if (k === "pro") b.appendChild(el("span", "tag", "Mais escolhido"));
      if (k === atual) b.appendChild(el("span", "atual", `${plano.teste ? "Em teste grátis" : "Seu plano atual"} · ${textoFalta(diasRestantes(plano))}`));
      b.addEventListener("click", () => { escolhido = k; pintarSel(); });
      cards.appendChild(b);
    });
    corpo.appendChild(cards);

    corpo.appendChild(el("div", "pl-sec", "O que cada plano tem"));
    const tab = el("div", "pl-tabela c3");
    const cab = el("div", "pl-lin cab"); cab.append(el("span", null, "Recursos"), ...ORDEM_PLANOS.map((k) => { const c = el("span", null, PLANOS[k].nome); c.dataset.col = k; return c; })); tab.appendChild(cab);
    BENEFICIOS.forEach(([nome, ...tem]) => {
      const l = el("div", "pl-lin"); l.appendChild(el("span", null, nome));
      tem.forEach((v, i) => { const c = el("span", v ? "pl-sim" : "pl-nao", v ? "✓" : "—"); c.dataset.col = ORDEM_PLANOS[i]; l.appendChild(c); });
      tab.appendChild(l);
    });
    corpo.appendChild(tab);

    // Primeiro acesso: começa o teste grátis no plano escolhido (sem pagar nada agora).
    const btnTeste = el("button", "pl-btn pl-teste"); btnTeste.type = "button"; btnTeste.hidden = !teste;
    btnTeste.addEventListener("click", async () => {
      btnTeste.disabled = true;
      try {
        plano = await comecarTeste(fb, eu.uid, escolhido); teste = false;
        plano = { ...plano, ativadoEm: { toMillis: () => Date.now() } };
        toast(`Pronto! ${DIAS_TESTE} dias grátis no ${nomePlano(escolhido)}.`);
        op.aoMudar?.(); pintarEscolha();
      } catch (e) {
        btnTeste.disabled = false;
        toast(e?.code === "permission-denied" ? "O teste grátis começa a funcionar quando a atualização do sistema for publicada." : "Não foi possível começar o teste agora.");
      }
    });
    if (teste) corpo.append(btnTeste, el("p", "pl-nota", `Sem pagar nada e sem compromisso. No fim dos ${DIAS_TESTE} dias você escolhe se quer assinar. O teste grátis vale uma vez por conta.`));
    const secPer = el("div", "pl-sec"); corpo.appendChild(secPer);
    const per = el("div", "pl-periodos");
    PERIODOS.forEach(([m, rot]) => {
      const b = el("button", "pl-per"); b.type = "button"; b.dataset.m = m;
      b.append(el("b", null, rot), el("small"));
      b.addEventListener("click", () => { meses = m; pintarSel(); });
      per.appendChild(b);
    });
    corpo.appendChild(per);
    const credito = el("p", "pl-credito"); credito.hidden = true; corpo.appendChild(credito);
    const btn = el("button", "pl-btn"); btn.type = "button";
    function pintarSel() {
      const P = PLANOS[escolhido];
      cards.querySelectorAll(".pl-card").forEach((b) => { const on = b.dataset.plano === escolhido; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
      tab.style.setProperty("--c", P.cor);
      tab.querySelectorAll("[data-col]").forEach((c) => c.classList.toggle("sel", c.dataset.col === escolhido));
      per.querySelectorAll(".pl-per").forEach((b) => { b.classList.toggle("on", Number(b.dataset.m) === meses); b.querySelector("small").textContent = reais(P.preco * Number(b.dataset.m)); });
      secPer.textContent = `${teste ? "Ou já assinar o" : escolhido === atual ? (plano?.teste ? "Assinar o" : "Renovar o") : "Assinar o"} ${P.nome} por`;
      btnTeste.textContent = `Começar ${DIAS_TESTE} dias grátis no ${P.nome}`;
      btn.classList.toggle("sec", teste);
      btn.textContent = `Pagar ${reais(P.preco * meses)} com Pix`;
      const cr = creditoDias(plano, escolhido);
      credito.hidden = !atual || escolhido === atual;
      credito.textContent = cr > 0 && plano?.teste ? `Você ainda tem ${cr} ${cr === 1 ? "dia" : "dias"} de teste grátis: o ${P.nome} já começa agora e os meses que você pagar contam depois disso.` : cr > 0 ? `Trocar de plano: os ${diasRestantes(plano)} dias que sobram do ${nomePlano(atual)} viram ${cr} ${cr === 1 ? "dia" : "dias"} a mais no ${P.nome}, somados aos meses que você pagar.` : "";
      if (!cr) credito.hidden = true;
    }
    pintarSel();
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        const P = PLANOS[escolhido];
        const txid = ("HF" + eu.uid.slice(0, 6) + Date.now().toString(36)).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 25);
        const dados = { uid: eu.uid, nome: String(op.dados?.nome || "").slice(0, 80), email: String(eu.email || "").slice(0, 120), plano: escolhido, meses, valor: Math.round(P.preco * meses * 100) / 100, txid, status: "pendente", criadoEm: fb.serverTimestamp() };
        const ref = await fb.addDoc(fb.collection(fb.db, "planos_pedidos"), dados);
        op.aoMudar?.();
        mostrarPix({ id: ref.id, ...dados, criadoEm: null });
      } catch (e) {
        btn.disabled = false;
        toast(e?.code === "permission-denied" ? "A assinatura começa a funcionar quando a atualização do sistema for publicada." : "Não foi possível criar o pedido agora.");
      }
    });
    corpo.append(btn, el("p", "pl-nota", "Sem fidelidade: o plano vale pelo período pago e não renova sozinho. Quando acaba, o selo e o destaque saem até você renovar."));

    // Quem não consegue pagar agora (baixa renda) ou quer fazer parceria: pedido para negociar.
    const aj = el("div", "pl-ajuda");
    if (negAberta(neg)) {
      aj.append(el("b", null, `Seu pedido de ${TIPOS_NEG[neg.tipo]?.toLowerCase() || "negociação"} está com a equipe`), el("p", null, `${STATUS_NEG[neg.status]}. A resposta chega nas suas notificações e pelo Suporte.`));
      const v = el("button", "pl-btn sec"); v.type = "button"; v.textContent = "Ver o meu pedido"; v.addEventListener("click", () => mostrarNegociacao(neg.tipo));
      aj.appendChild(v);
    } else {
      aj.append(el("b", null, "Não dá para pagar agora?"), el("p", null, "Se você está passando por um momento difícil ou tem baixa renda, conte a sua situação: a gente avalia com carinho e pode negociar um valor ou uma condição especial. Tem uma proposta de parceria? Fale com a gente também."));
      const bts = el("div", "bts");
      const a1 = el("button", "pl-btn verde"); a1.type = "button"; a1.textContent = "Pedir condição especial"; a1.addEventListener("click", () => mostrarNegociacao("apoio"));
      const a2 = el("button", "pl-btn sec"); a2.type = "button"; a2.textContent = "Propor parceria"; a2.addEventListener("click", () => mostrarNegociacao("parceria"));
      bts.append(a1, a2); aj.appendChild(bts);
    }
    corpo.appendChild(aj);
  }

  function botaoVoltar() {
    const v = el("button", "pl-volta"); v.type = "button"; v.textContent = "‹ Ver os planos"; v.addEventListener("click", pintarEscolha);
    return v;
  }

  // Formulário (ou situação do pedido já enviado) de condição especial / parceria.
  function mostrarNegociacao(tipoIni) {
    corpo.replaceChildren(botaoVoltar()); cx.scrollTop = 0;
    if (neg && (negAberta(neg) || ((neg.status === "aprovado" || neg.status === "recusado") && Date.now() - ms(neg.decididoEm) < 30 * DIA && !op._novoPedido))) {
      const c = el("div", "pl-neg");
      const stc = neg.status === "aprovado" ? "st ok" : neg.status === "recusado" ? "st nao" : "st";
      c.append(el("span", stc, STATUS_NEG[neg.status] || neg.status), el("b", null, `${TIPOS_NEG[neg.tipo] || "Pedido"} · plano ${nomePlano(neg.plano)}`),
        el("small", "pl-nota", `Enviado em ${ms(neg.criadoEm) ? dataLonga(neg.criadoEm) : "agora"}${neg.valorProposto ? ` · você propôs ${reais(neg.valorProposto)} por mês` : ""}`), el("q", null, neg.mensagem || ""));
      if (neg.status === "aprovado") c.appendChild(el("div", "resp", `Plano ${nomePlano(neg.planoConcedido || neg.plano)} por ${neg.meses || 1} ${neg.meses === 1 ? "mês" : "meses"}${neg.valorAcordado ? ` · ${reais(neg.valorAcordado)} combinado` : " · sem custo"}.${neg.resposta ? "\n" + neg.resposta : ""}`));
      else if (neg.resposta) c.appendChild(el("div", "resp", neg.resposta));
      corpo.appendChild(c);
      const sup = el("a", "pl-btn sec"); sup.href = "suporte.html"; sup.textContent = "Falar com a equipe pelo Suporte"; corpo.appendChild(sup);
      if (negAberta(neg)) {
        const can = el("button", "pl-btn sec"); can.type = "button"; can.textContent = "Cancelar o pedido";
        can.addEventListener("click", async () => {
          can.disabled = true;
          try { await fb.updateDoc(fb.doc(fb.db, "planos_negociacoes", eu.uid), { status: "cancelado" }); neg = { ...neg, status: "cancelado" }; toast("Pedido cancelado"); pintarEscolha(); }
          catch { can.disabled = false; toast("Não foi possível cancelar agora."); }
        });
        corpo.appendChild(can);
      } else {
        const novo = el("button", "pl-btn"); novo.type = "button"; novo.textContent = "Fazer um novo pedido";
        novo.addEventListener("click", () => { op._novoPedido = true; mostrarNegociacao(neg.tipo); });
        corpo.appendChild(novo);
      }
      return;
    }
    let tipo = TIPOS_NEG[tipoIni] ? tipoIni : "apoio", planoQ = "pro";
    const f = el("form", "pl-form"); f.noValidate = true;
    const tit = el("h3"), intro = el("p");
    const tipos = el("div", "pl-tipos");
    Object.entries(TIPOS_NEG).forEach(([k, rot]) => { const b = el("button", "pl-per"); b.type = "button"; b.dataset.t = k; b.append(el("b", null, rot), el("small", null, k === "apoio" ? "Baixa renda ou momento difícil" : "Empresa, projeto ou troca")); b.addEventListener("click", () => { tipo = k; pintarTipo(); }); tipos.appendChild(b); });
    const lp = el("label"); lp.appendChild(document.createTextNode("Plano que você quer"));
    const chipsP = el("div", "pl-chips");
    ORDEM_PLANOS.forEach((k) => { const b = el("button", "pl-chip", `${PLANOS[k].nome} · ${reais(PLANOS[k].preco)}`); b.type = "button"; b.dataset.p = k; b.addEventListener("click", () => { planoQ = k; chipsP.querySelectorAll(".pl-chip").forEach((z) => z.classList.toggle("on", z.dataset.p === planoQ)); }); chipsP.appendChild(b); });
    lp.appendChild(chipsP);
    const lv = el("label"); const lvTxt = el("span"); const valor = el("input"); valor.type = "text"; valor.inputMode = "decimal"; valor.placeholder = "Ex.: 15,00"; valor.maxLength = 8; valor.id = "plNegValor";
    lv.append(lvTxt, valor);
    const lm = el("label"); const lmTxt = el("span"); const msg = el("textarea"); msg.maxLength = 1500; msg.id = "plNegMsg";
    lm.append(lmTxt, msg);
    const lc = el("label"); lc.append(document.createTextNode("WhatsApp ou telefone para contato "), el("small", null, "(opcional)")); const contato = el("input"); contato.type = "tel"; contato.maxLength = 40; contato.placeholder = "(48) 99999-9999"; lc.appendChild(contato);
    const enviar = el("button", "pl-btn"); enviar.type = "submit"; enviar.textContent = "Enviar para a equipe";
    const nota = el("p", "pl-nota", "Só os responsáveis pelo Help Floripa leem o seu pedido. A resposta chega nas notificações e pelo Suporte.");
    f.append(tit, intro, tipos, lp, lv, lm, lc, enviar, nota);
    corpo.appendChild(f);
    function pintarTipo() {
      tipos.querySelectorAll(".pl-per").forEach((b) => b.classList.toggle("on", b.dataset.t === tipo));
      const ap = tipo === "apoio";
      tit.textContent = ap ? "Pedir condição especial" : "Propor uma parceria";
      intro.textContent = ap ? "Conte um pouco da sua situação e quanto consegue pagar hoje. Cada pedido é visto com cuidado e pode virar um desconto, um prazo maior ou um período sem custo." : "Conte quem você é e o que propõe (divulgação, troca de serviços, projeto social, empresa parceira...). A gente responde com uma proposta.";
      lvTxt.replaceChildren(document.createTextNode(ap ? "Quanto você consegue pagar por mês? " : "Valor que você propõe por mês "), el("small", null, "(opcional)"));
      lmTxt.replaceChildren(document.createTextNode(ap ? "Sua situação" : "Sua proposta"), el("small", null, " (pelo menos 20 letras)"));
      msg.placeholder = ap ? "Ex.: Sou autônoma, faço doces em casa e a renda caiu este mês. Consigo pagar um valor menor por enquanto..." : "Ex.: Tenho uma loja no centro e posso divulgar o Help Floripa no balcão em troca do plano Pro...";
    }
    chipsP.querySelector('[data-p="pro"]').classList.add("on");
    pintarTipo();
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const texto = msg.value.trim();
      if (texto.length < 20) { toast("Conte um pouco mais (pelo menos 20 letras)."); msg.focus(); return; }
      const v = Number(String(valor.value).replace(/[^\d,.]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".")) || 0;
      if (v < 0 || v > 1000) { toast("Confira o valor."); valor.focus(); return; }
      enviar.disabled = true;
      const dados = { uid: eu.uid, nome: String(op.dados?.nome || "").slice(0, 80), email: String(eu.email || "").slice(0, 120), tipo, plano: planoQ, valorProposto: Math.round(v * 100) / 100, contato: contato.value.trim().slice(0, 40), mensagem: texto.slice(0, 1500), status: "novo", criadoEm: fb.serverTimestamp() };
      try {
        await fb.setDoc(fb.doc(fb.db, "planos_negociacoes", eu.uid), dados);
        neg = { id: eu.uid, ...dados, criadoEm: { toMillis: () => Date.now() } }; op._novoPedido = false;
        toast("Pedido enviado. A equipe vai responder pelas notificações e pelo Suporte.");
        op.aoMudar?.();
        mostrarNegociacao(tipo);
      } catch (err) {
        enviar.disabled = false;
        toast(err?.code === "permission-denied" ? "Esse pedido começa a funcionar quando a atualização do sistema for publicada. Enquanto isso, fale com a gente pelo Suporte." : "Não foi possível enviar agora.");
      }
    });
  }

  async function mostrarPix(p) {
    corpo.replaceChildren();
    const box = el("div", "pl-pix");
    box.append(el("small", null, `Pedido #${String(p.id).slice(-6).toUpperCase()} · Plano ${nomePlano(p.plano)} · ${p.meses} ${p.meses === 1 ? "mês" : "meses"}`), el("b", "valor", reais(p.valor)));
    const cod = codigoPix({ valor: p.valor, txid: p.txid });
    if (cod) {
      box.appendChild(await qrSvg(cod).catch(() => el("span")));
      const c = el("div", "pl-codigo", cod); box.appendChild(c);
      const bc = el("button", "pl-btn"); bc.type = "button"; bc.textContent = "Copiar código Pix"; bc.addEventListener("click", () => copiar(cod, toast));
      box.appendChild(bc);
      const ol = el("ol", "pl-passos");
      ["Abra o app do seu banco e escolha Pix → Pix Copia e Cola (ou leia o QR Code).", "Confira o valor e o recebedor (Help Floripa) e pague.", `Pronto: a equipe confirma o pagamento e ativa o ${nomePlano(p.plano)} (normalmente em até 1 dia útil). O selo aparece em Meus negócios.`].forEach((t) => ol.appendChild(el("li", null, t)));
      box.appendChild(ol);
    } else {
      box.appendChild(el("p", "pl-nota", `Recebemos o seu pedido. A equipe vai mandar a chave Pix pelo Suporte (aparece nas suas Mensagens) e ativa o ${nomePlano(p.plano)} assim que o pagamento chegar.`));
    }
    corpo.appendChild(box);
    const sup = el("a", "pl-btn sec"); sup.href = "suporte.html"; sup.textContent = "Enviar o comprovante pelo Suporte";
    const cancelar = el("button", "pl-btn sec"); cancelar.type = "button"; cancelar.textContent = "Cancelar este pedido";
    cancelar.addEventListener("click", async () => {
      cancelar.disabled = true;
      try { await fb.updateDoc(fb.doc(fb.db, "planos_pedidos", p.id), { status: "cancelado" }); op.aoMudar?.(); plano = await lerPlano(fb, eu.uid); pintarEscolha(); toast("Pedido cancelado"); }
      catch { cancelar.disabled = false; toast("Não foi possível cancelar agora."); }
    });
    corpo.append(sup, cancelar);
  }
}
