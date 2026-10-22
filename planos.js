// =====================================================
// Planos dos perfis profissionais: Plus, Pro e Premium (não existe plano Grátis).
// - Primeira assinatura: a pessoa paga o período e ganha mais 30 dias grátis (DIAS_BONUS), em qualquer plano; o dono do
//   site soma os dias ao confirmar o Pix. Testes grátis antigos (planos/{uid} com teste: true) continuam valendo até o fim.
// - Pagamento por Pix (manual): a pessoa escolhe o plano e o período, o pedido fica em planos_pedidos/{id}
//   e aparece o Pix (copia e cola + QR Code). O dono do site confere o pagamento no painel e ativa: planos/{uid}
//   { plano: "plus" | "pro" | "premium", ate } — vale para todos os negócios da conta e vence sozinho na data.
// - Quem não consegue pagar agora (baixa renda) pede uma condição especial; parceria ou negociação (valor, prazo,
//   troca) é aberta a qualquer pessoa — a gente aceita negociar:
//   planos_negociacoes/{uid} (uma por pessoa); só os donos do site leem e negociam.
// - Preços, benefícios e a chave Pix ficam aqui em cima (mudar o ?v= de quem importa ao editar).
// Sem dependência do rede.js.
// =====================================================

// Preços, nível, selo e leitura do plano ficam no planos-base.js (as páginas que só mostram o selo não baixam este arquivo).
import { PIX, PLANOS, ORDEM_PLANOS, PRECO_MIN, PERIODOS, descontoDe, valorPeriodo, DIAS_TESTE, DIAS_BONUS, BENEFICIOS, nivelPlano, ehPago, ehPro, nomePlano, emTeste, diasRestantes, textoFalta, reais, creditoDias, lerPlano, esquecerPlano, seloPlano, seloPro } from "./planos-base.js?v=2";
export { PIX, PLANOS, ORDEM_PLANOS, PRECO_MIN, PERIODOS, descontoDe, valorPeriodo, DIAS_TESTE, DIAS_BONUS, BENEFICIOS, nivelPlano, ehPago, ehPro, nomePlano, emTeste, diasRestantes, textoFalta, reais, creditoDias, lerPlano, esquecerPlano, seloPlano, seloPro } from "./planos-base.js?v=2";
const ms = (t) => t?.toMillis?.() ?? (t?.seconds ? t.seconds * 1000 : typeof t === "number" ? t : 0);
const DIA = 864e5;
const MAX_DESC = Math.round(Math.max(...PERIODOS.map((x) => x[2])) * 100);

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
.pl-per { position: relative; }
.pl-per .off { position: absolute; top: -9px; right: 10px; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 900; color: #fff; background: #16a34a; }
.pl-per s { font-size: 12px; color: var(--muted, #8fa0ab); opacity: .8; }
.pl-per .mes { font-size: 12px; font-weight: 700; color: #2fbf71; }
.pl-economia { margin: 10px 2px 0; text-align: center; font-size: 13px; font-weight: 700; color: #2fbf71; }
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
.pl-bonus { display: flex; align-items: center; gap: 10px; margin-top: 14px; padding: 10px 12px; border-radius: 14px; background: rgba(255, 255, 255, .14); border: 1px solid rgba(255, 255, 255, .28); font-size: 13px; line-height: 1.35; }
.pl-bonus b { flex: none; padding: 6px 10px; border-radius: 10px; background: linear-gradient(135deg, #16a34a, #2fbf71); color: #fff; font-size: 13px; font-weight: 900; white-space: nowrap; }
.pl-per .bonus { display: block; margin-top: 4px; font-size: 10.5px; font-weight: 800; color: #16a34a; }
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
.pl-prova { display: grid; gap: 8px; padding: 14px; border-radius: 18px; border: 1px solid color-mix(in srgb, #2fbf71 45%, var(--line, #22313a)); background: color-mix(in srgb, #2fbf71 6%, transparent); }
.pl-prova-tit { font-size: 14px; font-weight: 800; } .pl-prova-sub { font-size: 12.5px; color: var(--muted, #8fa0ab); line-height: 1.4; }
.pl-docs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
@media (max-width: 380px) { .pl-docs { grid-template-columns: 1fr; } }
.pl-doc { display: grid; gap: 2px; align-content: start; padding: 10px 12px; border-radius: 14px; border: 1.5px solid var(--line, #22313a); background: var(--panel-2, #162128); color: inherit; font: inherit; text-align: left; cursor: pointer; }
.pl-doc b { font-size: 13.5px; } .pl-doc small { font-size: 11.5px; line-height: 1.35; color: var(--muted, #8fa0ab); }
.pl-doc.on { border-color: #2fbf71; background: color-mix(in srgb, #2fbf71 14%, var(--panel-2, #162128)); }
.pl-doc[data-doc="depois"] { grid-column: 1 / -1; border-style: dashed; }
.pl-btn.pl-anexar { margin-top: 2px; min-height: 46px; font-size: 14px; }
.pl-decl { display: flex !important; grid-template-columns: none; align-items: flex-start; gap: 10px !important; font-weight: 500 !important; font-size: 13px !important; line-height: 1.45; cursor: pointer; }
.pl-decl input { width: 20px !important; height: 20px; flex: none; margin: 1px 0 0; padding: 0 !important; accent-color: #2fbf71; }
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
export const TIPOS_NEG = { apoio: "Condição especial", parceria: "Parceria ou negociação" };
// Documentos que costumam provar baixa renda (a pessoa escolhe um; "depois" = manda pelo Suporte).
export const DOCS_RENDA = [
  ["cadunico", "Folha resumo do CadÚnico", "Cadastro Único com o seu NIS (app Meu CadÚnico ou no CRAS)"],
  ["bolsa", "Bolsa Família", "Extrato ou tela do app Bolsa Família ou Caixa Tem"],
  ["bpc", "BPC/LOAS", "Carta de concessão ou extrato do benefício no Meu INSS"],
  ["cnis", "Carteira de trabalho ou CNIS", "CTPS Digital ou extrato do Meu INSS com a renda (ou sem vínculo)"],
  ["renda", "Comprovante de renda", "Holerite, extrato ou recibo de até 2 salários mínimos"],
  ["desemprego", "Seguro-desemprego", "Comprovante das parcelas ou do pedido"],
  ["tarifa", "Conta de luz com Tarifa Social", "Conta de energia com o desconto da Tarifa Social"],
  ["mei", "Declaração anual do MEI", "DASN-SIMEI com o faturamento do ano"],
  ["isento", "Isento do Imposto de Renda", "Consulta na Receita mostrando que você não declarou"],
  ["depois", "Mando o documento depois", "Você envia pelo Suporte, conversando com a equipe"]
];
export const nomeDocRenda = (k) => DOCS_RENDA.find((d) => d[0] === k)?.[1] || "";
export const STATUS_NEG = { novo: "Recebido · em análise", em_conversa: "Em conversa com a equipe", aprovado: "Aprovado", recusado: "Não aprovado", cancelado: "Cancelado" };
export async function lerNegociacao(fb, uid) {
  try { const s = await fb.getDoc(fb.doc(fb.db, "planos_negociacoes", uid)); return s.exists() ? { id: s.id, ...s.data() } : null; } catch { return null; }
}
// Telefone com DDD formatado enquanto digita (tira o +55 colado de outro lugar).
export function formatarTelefone(v) {
  const d = String(v || "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "").slice(0, 11);
  if (!d) return "";
  return d.length <= 2 ? `(${d}` : d.length <= 6 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d.length <= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
const negAberta = (n) => n && (n.status === "novo" || n.status === "em_conversa");
// Primeira assinatura: quem nunca pagou um plano paga o período e ganha mais 30 dias grátis (o dono do site soma os
// dias ao confirmar o Pix). Sem leitura possível (regras ainda não publicadas), mostra a oferta: quem decide é o painel.
export async function primeiraAssinatura(fb, uid) {
  try { const s = await fb.getDoc(fb.doc(fb.db, "planos", uid)); return !s.exists() || (!s.data().pedidoId && !s.data().negociacaoId); }
  catch { return true; }
}
export const testeDisponivel = primeiraAssinatura; // nome antigo (Meus negócios)
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
  let [plano, pedido, neg, primeira] = await Promise.all([lerPlano(fb, eu.uid), pedidoAberto(fb, eu.uid), lerNegociacao(fb, eu.uid), primeiraAssinatura(fb, eu.uid)]);
  if (pedido) { mostrarPix(pedido); return; }
  if (op.negociar) { mostrarNegociacao(op.negociar); return; }
  pintarEscolha();

  function pintarEscolha() {
    corpo.replaceChildren(); cx.scrollTop = 0;
    const hero = el("div", "pl-hero");
    hero.append(el("small", null, primeira ? `Primeira assinatura: +${DIAS_BONUS} dias grátis` : "Planos Help Floripa"), el("h3", null, "Mais clientes para o seu negócio"),
      el("p", null, "Selo no perfil, destaque nas vitrines e no Perto de você, estatísticas completas e atendimento prioritário."));
    const preco = el("div", "pl-preco");
    preco.append(el("span", "de", "A partir de"), el("b", null, reais(PRECO_MIN)), el("span", null, `por mês · até ${MAX_DESC}% de desconto no plano anual · vale para todos os seus negócios`));
    hero.appendChild(preco);
    // Bônus da primeira assinatura, bem à vista.
    if (primeira) { const bn = el("div", "pl-bonus"); bn.append(el("b", null, `+${DIAS_BONUS} dias grátis`), el("span", null, "na sua primeira assinatura: você paga o período escolhido e usa 30 dias a mais, em qualquer plano.")); hero.appendChild(bn); }
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

    const secPer = el("div", "pl-sec"); corpo.appendChild(secPer);
    const per = el("div", "pl-periodos");
    PERIODOS.forEach(([m, rot, d]) => {
      const b = el("button", "pl-per"); b.type = "button"; b.dataset.m = m;
      b.append(el("b", null, rot), el("small", "total"));
      if (d) b.append(el("s"), el("span", "mes"), el("span", "off", `-${Math.round(d * 100)}%`));
      if (primeira) b.append(el("span", "bonus", `+${DIAS_BONUS} dias grátis`));
      b.addEventListener("click", () => { meses = m; pintarSel(); });
      per.appendChild(b);
    });
    corpo.appendChild(per);
    const economia = el("p", "pl-economia"); economia.hidden = true; corpo.appendChild(economia);
    const credito = el("p", "pl-credito"); credito.hidden = true; corpo.appendChild(credito);
    const btn = el("button", "pl-btn"); btn.type = "button";
    function pintarSel() {
      const P = PLANOS[escolhido];
      cards.querySelectorAll(".pl-card").forEach((b) => { const on = b.dataset.plano === escolhido; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
      tab.style.setProperty("--c", P.cor);
      tab.querySelectorAll("[data-col]").forEach((c) => c.classList.toggle("sel", c.dataset.col === escolhido));
      per.querySelectorAll(".pl-per").forEach((b) => {
        const m = Number(b.dataset.m), v = valorPeriodo(escolhido, m);
        b.classList.toggle("on", m === meses);
        b.querySelector(".total").textContent = reais(v);
        if (b.querySelector("s")) { b.querySelector("s").textContent = reais(P.preco * m); b.querySelector(".mes").textContent = `${reais(v / m)} por mês`; }
      });
      const eco = Math.round((P.preco * meses - valorPeriodo(escolhido, meses)) * 100) / 100;
      secPer.textContent = `${escolhido === atual && !plano?.teste ? "Renovar o" : "Assinar o"} ${P.nome} por`;
      // Primeira assinatura: mostra até quando vale com os 30 dias a mais.
      const fim = new Date(Date.now() + (meses * 30 + (primeira ? DIAS_BONUS : 0)) * DIA);
      economia.hidden = false;
      economia.textContent = [eco ? `Você economiza ${reais(eco)} (${Math.round(descontoDe(meses) * 100)}% de desconto).` : "",
        primeira ? `Primeira assinatura: ${meses === 1 ? "1 mês" : meses + " meses"} + ${DIAS_BONUS} dias grátis, até ${fim.toLocaleDateString("pt-BR")}.` : ""].filter(Boolean).join(" ");
      if (!economia.textContent) economia.hidden = true;
      btn.textContent = `Pagar ${reais(valorPeriodo(escolhido, meses))} com Pix`;
      const cr = creditoDias(plano, escolhido);
      credito.hidden = !atual || escolhido === atual;
      credito.textContent = cr > 0 && plano?.teste ? `Você ainda tem ${cr} ${cr === 1 ? "dia" : "dias"} de teste grátis: o ${P.nome} já começa agora e os meses que você pagar contam depois disso.` : cr > 0 ? `Trocar de plano: os ${diasRestantes(plano)} dias que sobram do ${nomePlano(atual)} viram ${cr} ${cr === 1 ? "dia" : "dias"} a mais no ${P.nome}, somados aos meses que você pagar.` : "";
      if (!cr) credito.hidden = true;
    }
    pintarSel();
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        const txid = ("HF" + eu.uid.slice(0, 6) + Date.now().toString(36)).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 25);
        const dados = { uid: eu.uid, nome: String(op.dados?.nome || "").slice(0, 80), email: String(eu.email || "").slice(0, 120), plano: escolhido, meses, valor: valorPeriodo(escolhido, meses), txid, status: "pendente", criadoEm: fb.serverTimestamp() };
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
      aj.append(el("b", null, "Não dá para pagar agora?"), el("p", null, "A gente aceita negociar. Se você tem baixa renda ou está num momento difícil, peça uma condição especial. Quer propor outro valor, outro prazo, uma troca ou uma parceria? Mande a sua proposta."));
      const bts = el("div", "bts");
      const a1 = el("button", "pl-btn verde"); a1.type = "button"; a1.textContent = "Pedir condição especial"; a1.addEventListener("click", () => mostrarNegociacao("apoio"));
      const a2 = el("button", "pl-btn sec"); a2.type = "button"; a2.textContent = "Parceria ou negociação"; a2.addEventListener("click", () => mostrarNegociacao("parceria"));
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
      if (neg.tipo === "apoio" && neg.comprovanteTipo) c.appendChild(el("small", "pl-nota", `Comprovante: ${nomeDocRenda(neg.comprovanteTipo)}${neg.comprovante ? " · documento anexado" : neg.comprovanteTipo === "depois" ? " · mande pelo Suporte" : ""}`));
      if (neg.status === "aprovado") c.appendChild(el("div", "resp", `Plano ${nomePlano(neg.planoConcedido || neg.plano)} por ${neg.meses || 1} ${neg.meses === 1 ? "mês" : "meses"}${neg.valorAcordado ? ` · ${reais(neg.valorAcordado)} combinado` : " · sem custo"}.${neg.resposta ? "\n" + neg.resposta : ""}`));
      else if (neg.resposta) c.appendChild(el("div", "resp", neg.resposta));
      corpo.appendChild(c);
      const sup = el("a", "pl-btn sec"); sup.href = "suporte.html"; sup.textContent = "Falar com a equipe pelo Suporte"; corpo.appendChild(sup);
      if (negAberta(neg)) {
        const can = el("button", "pl-btn sec"); can.type = "button"; can.textContent = "Cancelar o pedido";
        can.addEventListener("click", async () => {
          can.disabled = true;
          try { await fb.updateDoc(fb.doc(fb.db, "planos_negociacoes", eu.uid), { status: "cancelado", comprovante: fb.deleteField() }); neg = { ...neg, status: "cancelado", comprovante: null }; toast("Pedido cancelado"); pintarEscolha(); }
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
    Object.entries(TIPOS_NEG).forEach(([k, rot]) => { const b = el("button", "pl-per"); b.type = "button"; b.dataset.t = k; b.append(el("b", null, rot), el("small", null, k === "apoio" ? "Baixa renda ou momento difícil" : "Outro valor, prazo, troca ou parceria")); b.addEventListener("click", () => { tipo = k; pintarTipo(); }); tipos.appendChild(b); });
    const lp = el("label"); lp.appendChild(document.createTextNode("Plano que você quer"));
    const chipsP = el("div", "pl-chips");
    ORDEM_PLANOS.forEach((k) => { const b = el("button", "pl-chip", `${PLANOS[k].nome} · ${reais(PLANOS[k].preco)}`); b.type = "button"; b.dataset.p = k; b.addEventListener("click", () => { planoQ = k; chipsP.querySelectorAll(".pl-chip").forEach((z) => z.classList.toggle("on", z.dataset.p === planoQ)); }); chipsP.appendChild(b); });
    lp.appendChild(chipsP);
    const lv = el("label"); const lvTxt = el("span"); const valor = el("input"); valor.type = "text"; valor.inputMode = "decimal"; valor.placeholder = "Ex.: 15,00"; valor.maxLength = 8; valor.id = "plNegValor";
    lv.append(lvTxt, valor);
    const lm = el("label"); const lmTxt = el("span"); const msg = el("textarea"); msg.maxLength = 1500; msg.id = "plNegMsg";
    lm.append(lmTxt, msg);
    const lc = el("label"); const lcTxt = el("span"); lcTxt.append(document.createTextNode("WhatsApp ou telefone para contato "), el("small", null, "(opcional)"));
    const contato = el("input"); contato.type = "tel"; contato.inputMode = "tel"; contato.autocomplete = "tel"; contato.maxLength = 15; contato.placeholder = "(48) 99999-9999"; contato.id = "plNegContato";
    // Mesmo formato do WhatsApp de Meus negócios: (DD) 9999-9999 ou (DD) 99999-9999 enquanto digita.
    contato.addEventListener("input", () => { contato.value = formatarTelefone(contato.value); });
    lc.append(lcTxt, contato);
    const enviar = el("button", "pl-btn"); enviar.type = "submit"; enviar.textContent = "Enviar para a equipe";
    const nota = el("p", "pl-nota", "Só os responsáveis pelo Help Floripa leem o seu pedido. A resposta chega nas notificações e pelo Suporte.");
    // Prova de baixa renda (só na condição especial): qual documento, o arquivo e a declaração.
    const prova = el("div", "pl-prova");
    let docEscolhido = "", anexo = null;
    const docs = el("div", "pl-docs"); docs.setAttribute("role", "radiogroup"); docs.setAttribute("aria-label", "Documento que comprova a baixa renda");
    DOCS_RENDA.forEach(([k, rot, dica]) => {
      const b = el("button", "pl-doc"); b.type = "button"; b.dataset.doc = k; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", "false");
      b.append(el("b", null, rot), el("small", null, dica));
      b.addEventListener("click", () => { docEscolhido = k; pintarDoc(); });
      docs.appendChild(b);
    });
    const arq = el("input"); arq.type = "file"; arq.accept = "image/*,application/pdf"; arq.hidden = true; arq.id = "plNegArquivo";
    const btArq = el("button", "pl-btn sec pl-anexar"); btArq.type = "button"; btArq.textContent = "Anexar foto ou PDF do documento";
    const previa = el("div");
    btArq.addEventListener("click", () => arq.click());
    arq.addEventListener("change", async () => {
      const a = arq.files?.[0]; arq.value = ""; if (!a) return;
      btArq.disabled = true; btArq.textContent = "Preparando o documento...";
      try {
        const { prepararAnexo, previaAnexo } = await import("./anexos-suporte.js?v=2");
        const x = await prepararAnexo(a, `negociacoes/${eu.uid}`);
        if (x.tipo === "video") throw new Error("Envie uma foto ou um PDF do documento.");
        anexo = x; previa.replaceChildren(previaAnexo(x, () => { anexo = null; previa.replaceChildren(); pintarDoc(); }));
      } catch (e) { toast(e?.message || "Não foi possível usar esse arquivo."); }
      btArq.disabled = false; pintarDoc();
    });
    const decl = el("label", "pl-decl"); const ck = el("input"); ck.type = "checkbox"; ck.id = "plNegDecl";
    decl.append(ck, el("span", null, "Declaro que as informações são verdadeiras e sei que a equipe pode pedir outro documento para confirmar."));
    prova.append(el("span", "pl-prova-tit", "Como você comprova a baixa renda?"), el("small", "pl-prova-sub", "Escolha um dos documentos mais usados. O documento só é visto pelos responsáveis do Help Floripa e é apagado depois da análise."), docs, btArq, previa, arq, decl);
    function pintarDoc() {
      docs.querySelectorAll(".pl-doc").forEach((b) => { const on = b.dataset.doc === docEscolhido; b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on)); });
      const depois = docEscolhido === "depois";
      btArq.hidden = !docEscolhido || depois || !!anexo; previa.hidden = depois;
      btArq.textContent = `Anexar foto ou PDF: ${nomeDocRenda(docEscolhido) || "documento"}`;
    }
    pintarDoc();
    f.append(tit, intro, tipos, lp, lv, prova, lm, lc, enviar, nota);
    corpo.appendChild(f);
    function pintarTipo() {
      tipos.querySelectorAll(".pl-per").forEach((b) => b.classList.toggle("on", b.dataset.t === tipo));
      const ap = tipo === "apoio";
      prova.hidden = !ap;
      tit.textContent = ap ? "Pedir condição especial" : "Parceria ou negociação";
      intro.textContent = ap ? "Conte um pouco da sua situação e quanto consegue pagar hoje. Cada pedido é visto com cuidado e pode virar um desconto, um prazo maior ou um período sem custo." : "A gente aceita negociar: proponha um valor, um prazo de pagamento, uma troca (divulgação, serviços) ou uma parceria. A equipe responde com uma proposta.";
      lvTxt.replaceChildren(document.createTextNode(ap ? "Quanto você consegue pagar por mês? " : "Valor que você propõe por mês "), el("small", null, "(opcional)"));
      lmTxt.replaceChildren(document.createTextNode(ap ? "Sua situação" : "Sua proposta"), el("small", null, " (pelo menos 20 letras)"));
      msg.placeholder = ap ? "Ex.: Sou autônoma, faço doces em casa e a renda caiu este mês. Consigo pagar um valor menor por enquanto..." : "Ex.: Consigo pagar R$ 30 por mês no Pro se for o ano todo. Ou posso divulgar o Help Floripa na minha loja em troca do plano...";
    }
    chipsP.querySelector('[data-p="pro"]').classList.add("on");
    pintarTipo();
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const texto = msg.value.trim();
      if (tipo === "apoio") {
        if (!docEscolhido) { toast("Escolha o documento que comprova a baixa renda."); docs.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
        if (docEscolhido !== "depois" && !anexo) { toast("Anexe a foto ou o PDF do documento (ou escolha \"Mando o documento depois\")."); btArq.focus(); return; }
        if (!ck.checked) { toast("Confirme a declaração para enviar."); ck.focus(); return; }
      }
      if (texto.length < 20) { toast("Conte um pouco mais (pelo menos 20 letras)."); msg.focus(); return; }
      const digitos = contato.value.replace(/\D/g, "");
      if (digitos && (digitos.length < 10 || digitos.length > 11)) { toast("Confira o telefone: DDD + número, como (48) 99999-9999."); contato.focus(); return; }
      const v = Number(String(valor.value).replace(/[^\d,.]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".")) || 0;
      if (v < 0 || v > 1000) { toast("Confira o valor."); valor.focus(); return; }
      enviar.disabled = true;
      const dados = { uid: eu.uid, nome: String(op.dados?.nome || "").slice(0, 80), email: String(eu.email || "").slice(0, 120), tipo, plano: planoQ, valorProposto: Math.round(v * 100) / 100, contato: contato.value.trim().slice(0, 40), mensagem: texto.slice(0, 1500), status: "novo", criadoEm: fb.serverTimestamp(),
        ...(tipo === "apoio" ? { comprovanteTipo: docEscolhido, declaracao: true, ...(anexo && docEscolhido !== "depois" ? { comprovante: { tipo: anexo.tipo, url: anexo.url, nome: String(anexo.nome || "").slice(0, 120) } } : {}) } : {}) };
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
    box.append(el("small", null, `Pedido #${String(p.id).slice(-6).toUpperCase()} · Plano ${nomePlano(p.plano)} · ${p.meses} ${p.meses === 1 ? "mês" : "meses"}${descontoDe(p.meses) ? ` com ${Math.round(descontoDe(p.meses) * 100)}% de desconto` : ""}`), el("b", "valor", reais(p.valor)));
    if (primeira) box.append(el("p", "pl-nota pl-bonus-pix", `Primeira assinatura: quando o pagamento for confirmado, você ganha mais ${DIAS_BONUS} dias grátis.`));
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
