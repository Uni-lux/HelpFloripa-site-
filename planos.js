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
import { PIX, PAGAMENTO, PLANOS, ORDEM_PLANOS, PRECO_MIN, PERIODOS, descontoDe, valorPeriodo, DIAS_TESTE, DIAS_BONUS, BENEFICIOS, DESTAQUES_PLANO, nivelPlano, ehPago, ehPro, nomePlano, emTeste, diasRestantes, textoFalta, reais, creditoDias, lerPlano, esquecerPlano, seloPlano, seloPro, emTolerancia, fimComTolerancia, NOMES_PERFIL, TIPOS_PERFIL, LIMITES_GRATIS } from "./planos-base.js?v=14";
export { PIX, PAGAMENTO, PLANOS, ORDEM_PLANOS, PRECO_MIN, PERIODOS, descontoDe, valorPeriodo, DIAS_TESTE, DIAS_BONUS, BENEFICIOS, nivelPlano, ehPago, ehPro, nomePlano, emTeste, diasRestantes, textoFalta, reais, creditoDias, lerPlano, esquecerPlano, seloPlano, seloPro, emTolerancia, fimComTolerancia, negocioPausado, NOMES_PERFIL, TIPOS_PERFIL, perfisDoPlano, mostraSelo } from "./planos-base.js?v=14";
import { codigoPix as codigoPixBase } from "./pix.js?v=1";
const ms = (t) => t?.toMillis?.() ?? (t?.seconds ? t.seconds * 1000 : typeof t === "number" ? t : 0);
const DIA = 864e5;
const MAX_DESC = Math.round(Math.max(...PERIODOS.map((x) => x[2])) * 100);

// ---------- Pix "copia e cola" (BR Code do Banco Central, EMV com CRC16): pix.js, com a chave do Help Floripa ----------
export const codigoPix = ({ chave = PIX.chave, nome = PIX.nome, cidade = PIX.cidade, valor, txid = "***" } = {}) => codigoPixBase({ chave, nome, cidade, valor, txid });
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

// ---------- pagamento automático (Mercado Pago, pelas Cloud Functions) ----------
// pagarPlano({ pedidoId, metodo: "pix" | "cartao", cartao?, tentativa? }) → { status, qr?, expira?, motivo? }.
let funcoes = null;
async function chamarPagamento(dados) {
  funcoes ||= import("https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js").then((m) => {
    const f = m.getFunctions(window.firebaseApp, PAGAMENTO.regiao);
    if (window.__hfFuncoesEmulador) m.connectFunctionsEmulator(f, "127.0.0.1", window.__hfFuncoesEmulador); // só nos testes
    return { m, f };
  });
  const { m, f } = await funcoes;
  return (await m.httpsCallable(f, "pagarPlano", { timeout: 70000 })(dados)).data;
}
// Formulário de cartão do próprio Mercado Pago (o número do cartão vai direto para eles; o site só recebe um token).
let sdkMp = null;
function carregarSdkMp() {
  sdkMp ||= new Promise((ok, falha) => {
    if (window.MercadoPago) { ok(window.MercadoPago); return; }
    const sc = document.createElement("script"); sc.src = "https://sdk.mercadopago.com/js/v2"; sc.async = true;
    const t = setTimeout(() => falha(new Error("tempo")), 20000);
    sc.onload = () => { clearTimeout(t); window.MercadoPago ? ok(window.MercadoPago) : falha(new Error("sem SDK")); };
    sc.onerror = () => { clearTimeout(t); falha(new Error("SDK bloqueado")); };
    document.head.appendChild(sc);
  }).catch((e) => { sdkMp = null; throw e; });
  return sdkMp;
}
async function ouvirPedido(fb, id, aoMudar) {
  const { onSnapshot } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  return onSnapshot(fb.doc(fb.db, "planos_pedidos", id), (s) => s.exists() && aoMudar(s.data()), () => {});
}
const horaData = (t) => new Date(t).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

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
.pl-per s, .pl-per .sem { font-size: 12px; color: var(--muted, #8fa0ab); opacity: .8; }
.pl-per .mes { font-size: 12px; font-weight: 700; color: #2fbf71; }
.pl-economia { margin: 10px 2px 0; text-align: center; font-size: 13px; font-weight: 700; color: #2fbf71; }
.pl-validade { display: flex; align-items: center; gap: 12px; margin: 12px 0 0; padding: 12px 14px; border-radius: 14px; border: 1px solid var(--line, #22313a); background: var(--panel-2, #162128); }
.pl-validade .ic { flex: none; width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; color: #a78bfa; background: color-mix(in srgb, #7c3aed 18%, transparent); }
.pl-validade div { display: grid; gap: 2px; min-width: 0; }
.pl-validade small { font-size: 11.5px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; color: var(--muted, #8fa0ab); }
.pl-validade b { font-size: 15.5px; }
.pl-validade span { font-size: 12.5px; line-height: 1.4; color: var(--muted, #8fa0ab); }
.pl-validade span em { font-style: normal; font-weight: 800; color: #2fbf71; }
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
.pl-abas { display: grid; grid-template-columns: 1fr 1.6fr; gap: 6px; width: 100%; padding: 4px; box-sizing: border-box; border-radius: 14px; background: var(--bg, #0b1115); border: 1px solid var(--line, #22313a); }
.pl-aba { min-height: 42px; border: 0; border-radius: 10px; background: none; color: var(--muted, #8fa0ab); font: inherit; font-size: 13.5px; font-weight: 800; cursor: pointer; }
.pl-aba.on { background: #00adee; color: #001a24; }
.pl-area { display: grid; justify-items: center; gap: 10px; width: 100%; }
.pl-cartao { width: 100%; text-align: left; }
.pl-espera { display: flex; align-items: center; gap: 10px; width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 12px; background: color-mix(in srgb, #00adee 10%, transparent); border: 1px solid color-mix(in srgb, #00adee 30%, transparent); font-size: 13px; font-weight: 700; text-align: left; }
.pl-gira { flex: none; width: 16px; height: 16px; border-radius: 50%; border: 2px solid color-mix(in srgb, #00adee 30%, transparent); border-top-color: #00adee; animation: pl-gira .8s linear infinite; }
@keyframes pl-gira { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .pl-gira { animation: none; } }
.pl-erro { color: #f59e0b; font-weight: 700; }
.pl-seguro { text-align: center; font-size: 12px; }
.pl-aprovado { gap: 8px; }
.pl-aprovado p { margin: 0; font-size: 14px; line-height: 1.5; }
.pl-ok-ic { width: 56px; height: 56px; border-radius: 50%; display: grid; place-items: center; background: #2fbf71; color: #fff; font-size: 30px; font-weight: 900; }
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
.pl-tabela.c4 .pl-lin { grid-template-columns: minmax(0, 1fr) repeat(4, 52px); gap: 3px; padding: 10px 8px 10px 10px; font-size: 12.5px; }
.pl-tabela.c4 .pl-lin.cab { font-size: 10.5px; letter-spacing: .01em; }
.pl-tabela.c4 .pl-lin > span:first-child { overflow-wrap: anywhere; }
.pl-tabela .pl-txt { font-size: 11.5px; line-height: 1.2; }
.pl-tabela .gr { color: var(--muted, #8fa0ab); }
.pl-tabela .gr.pl-sim { color: #2fbf71; }
@media (max-width: 380px) { .pl-tabela.c4 .pl-lin { grid-template-columns: minmax(0, 1fr) repeat(4, 46px); font-size: 12px; } }
.pl-hero { transition: background .25s; }
.pl-hero[data-plano="plus"] { background: radial-gradient(120% 140% at 100% 0%, #3b82f6 0%, #1d4ed8 50%, #0b1f5c 100%); }
.pl-hero[data-plano="premium"] { background: radial-gradient(120% 140% at 100% 0%, #f59e0b 0%, #c2410c 48%, #3b1d0b 100%); }
.pl-libera { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 6px; font-size: 13.5px; font-weight: 600; }
.pl-libera li { display: flex; gap: 8px; align-items: flex-start; line-height: 1.35; }
.pl-libera li::before { content: "✓"; flex: none; display: grid; place-items: center; width: 18px; height: 18px; border-radius: 50%; background: rgba(255, 255, 255, .22); font-size: 11px; font-weight: 900; }
.pl-preco .dia { padding: 2px 8px; border-radius: 999px; background: rgba(255, 255, 255, .18); font-size: 12.5px; font-weight: 800; opacity: 1; }
.pl-bonus { display: flex; align-items: center; gap: 10px; margin-top: 14px; padding: 10px 12px; border-radius: 14px; background: rgba(255, 255, 255, .14); border: 1px solid rgba(255, 255, 255, .28); font-size: 13px; line-height: 1.35; }
.pl-bonus b { flex: none; padding: 6px 10px; border-radius: 10px; background: linear-gradient(135deg, #16a34a, #2fbf71); color: #fff; font-size: 13px; font-weight: 900; white-space: nowrap; }
.pl-per .bonus { display: block; margin-top: 4px; font-size: 10.5px; font-weight: 800; color: #16a34a; }
.pl-lin.cab span:last-child { color: inherit; }
/* Coluna do plano escolhido: uma faixa contínua de cima a baixo (antes eram pílulas soltas em cada linha). */
.pl-lin span.sel { align-self: stretch; display: grid; place-items: center; margin: -10px 0; padding: 10px 0; background: color-mix(in srgb, var(--c, #7c3aed) 14%, transparent); }
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
.pl-ajuda { display: grid; gap: 10px; margin-top: 18px; padding: 16px; border-radius: 20px; border: 1px solid var(--line, #22313a); background: var(--panel-2, #162128); }
.pl-ajuda b { font-size: 15.5px; } .pl-ajuda p { margin: 0; font-size: 13px; line-height: 1.5; color: var(--muted, #8fa0ab); }
.pl-ajuda .bts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.pl-ajuda .pl-btn { margin-top: 0; min-height: 46px; font-size: 14px; }
.pl-ajuda .pl-btn.verde { background: linear-gradient(135deg, #22c55e, #0fb5a6); box-shadow: 0 10px 22px -14px #16a34a; }
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
.pl-doc.extra { display: none; } .pl-docs.todos .pl-doc.extra { display: grid; }
@media (max-width: 520px) { .pl-doc small { display: none; } .pl-doc.on small { display: block; } }
/* pedido de condição especial / parceria: dois caminhos coloridos, passos numerados e os planos nas cores deles */
.pl-form { --tom: #16a34a; --grad: linear-gradient(135deg, #22c55e, #0fb5a6); }
.pl-form[data-tipo="parceria"] { --tom: #7c3aed; --grad: linear-gradient(135deg, #8b5cf6, #2563eb); }
.pl-tipo { position: relative; display: grid; gap: 4px; align-content: start; padding: 14px; border-radius: 18px; border: 1.5px solid var(--line, #22313a); background: var(--panel-2, #162128); color: inherit; font: inherit; text-align: left; cursor: pointer; transition: transform .15s, box-shadow .2s; }
.pl-tipo.apoio { --g: linear-gradient(135deg, #22c55e, #0fb5a6); --c: #16a34a; } .pl-tipo.parceria { --g: linear-gradient(135deg, #8b5cf6, #2563eb); --c: #7c3aed; }
.pl-tipo i { display: grid; place-items: center; width: 34px; height: 34px; margin-bottom: 4px; border-radius: 12px; background: var(--g); color: #fff; font-style: normal; font-size: 16px; font-weight: 900; }
.pl-tipo b { font-size: 15px; line-height: 1.25; } .pl-tipo small { font-size: 12.5px; line-height: 1.35; color: var(--muted, #8fa0ab); }
.pl-tipo.on { border-color: transparent; background: var(--g); color: #fff; box-shadow: 0 12px 26px -12px var(--c); }
.pl-tipo.on i { background: rgba(255, 255, 255, .22); } .pl-tipo.on small { color: rgba(255, 255, 255, .92); }
.pl-tipo:active { transform: scale(.98); }
.pl-tempo { display: grid; gap: 8px; margin-top: 4px; }
.pl-tempo-tit { font-size: 12px; font-weight: 850; letter-spacing: .06em; text-transform: uppercase; color: var(--muted, #8fa0ab); }
.pl-per-neg { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.pl-per-neg .pl-per { text-align: left; }
.pl-per-neg .pl-per .tot { font-size: 16px; font-weight: 900; }
.pl-per-neg .pl-per.on { border-color: var(--tom); background: color-mix(in srgb, var(--tom) 14%, var(--panel-2, #162128)); box-shadow: 0 0 0 3px color-mix(in srgb, var(--tom) 18%, transparent); }
.pl-tipo.pl-atalho { padding: 14px 14px 44px; min-height: 128px; }
.pl-tipo .pl-seta { position: absolute; right: 12px; bottom: 10px; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, .22); font-size: 18px; font-weight: 900; line-height: 1; }
.pl-passo { display: grid; gap: 10px; padding: 16px; border-radius: 20px; border: 1px solid var(--line, #22313a); background: var(--panel-2, #162128); }
.pl-passo-tit { display: flex; align-items: center; gap: 10px; }
.pl-passo-tit .n { display: grid; place-items: center; flex: none; width: 26px; height: 26px; border-radius: 50%; background: var(--grad); color: #fff; font-size: 13px; font-weight: 900; }
.pl-passo-tit b { font-size: 15.5px; } .pl-passo-sub { font-size: 12.5px; line-height: 1.45; color: var(--muted, #8fa0ab); }
.pl-passo.pl-prova { border-color: var(--line, #22313a); background: var(--panel-2, #162128); }
.pl-planos-neg { display: grid; gap: 8px; }
.pl-pn { position: relative; display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 2px 12px; padding: 14px 16px 14px 20px; border-radius: 16px; border: 2px solid color-mix(in srgb, var(--cor) 28%, var(--line, #22313a)); background: linear-gradient(120deg, color-mix(in srgb, var(--cor) 14%, var(--panel, #111)), var(--panel, #111) 70%); color: inherit; font: inherit; text-align: left; cursor: pointer; overflow: hidden; transition: box-shadow .2s, border-color .2s; }
.pl-pn::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 6px; background: var(--cor); }
.pl-pn-topo { display: flex; align-items: center; gap: 8px; }
.pl-pn-topo::before { content: ""; flex: none; width: 18px; height: 18px; border-radius: 50%; border: 2px solid color-mix(in srgb, var(--cor) 60%, var(--line, #22313a)); box-sizing: border-box; }
.pl-pn.on .pl-pn-topo::before { border: 5px solid var(--cor); background: #fff; }
.pl-pn-topo b { font-size: 17px; }
.pl-pn-off { padding: 2px 8px; border-radius: 999px; background: var(--grad); color: #fff; font-size: 11px; font-weight: 900; letter-spacing: .02em; }
.pl-pn-preco { grid-row: span 2; display: grid; justify-items: end; line-height: 1.1; }
.pl-pn-preco s { font-size: 12px; color: var(--muted, #8fa0ab); } .pl-pn-preco strong { font-size: 21px; font-weight: 900; } .pl-pn-preco small { font-size: 11px; color: var(--muted, #8fa0ab); }
.pl-pn-frase { padding-left: 26px; font-size: 12px; line-height: 1.35; color: var(--muted, #8fa0ab); }
.pl-pn.on { border-color: var(--cor); box-shadow: 0 0 0 3px color-mix(in srgb, var(--cor) 22%, transparent), 0 12px 26px -16px var(--cor); background: linear-gradient(120deg, color-mix(in srgb, var(--cor) 24%, var(--panel, #111)), var(--panel, #111) 75%); }
.pl-form .pl-enviar { background: var(--grad); box-shadow: 0 12px 26px -14px var(--tom); }
.pl-mais-docs { justify-self: start; padding: 4px 2px; border: 0; background: none; color: var(--accent, #00adee); font: inherit; font-size: 13px; font-weight: 800; cursor: pointer; }
.pl-neg-gratis { display: grid; gap: 4px; padding: 12px 14px; border-radius: 16px; border: 1px solid var(--line, #22313a); background: var(--panel-2, #162128); }
.pl-neg-gratis b { font-size: 14px; } .pl-neg-gratis small { font-size: 12.5px; line-height: 1.45; color: var(--muted, #8fa0ab); }
.pl-neg-gratis b::before { content: "✓"; display: inline-grid; place-items: center; width: 18px; height: 18px; margin-right: 6px; border-radius: 50%; background: #2fbf71; color: #fff; font-size: 11px; vertical-align: 1px; }
.pl-resp-neg { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 14px; background: var(--panel-2, #162128); font-size: 13px; }
.pl-resp-neg i { display: grid; place-items: center; flex: none; width: 28px; height: 28px; border-radius: 50%; background: color-mix(in srgb, var(--accent, #00adee) 18%, transparent); color: var(--accent, #00adee); font-style: normal; font-weight: 900; }
.pl-doc { display: grid; gap: 2px; align-content: start; padding: 10px 12px; border-radius: 14px; border: 1.5px solid var(--line, #22313a); background: var(--panel-2, #162128); color: inherit; font: inherit; text-align: left; cursor: pointer; }
.pl-doc b { font-size: 13.5px; } .pl-doc small { font-size: 11.5px; line-height: 1.35; color: var(--muted, #8fa0ab); }
.pl-doc.on { border-color: #2fbf71; background: color-mix(in srgb, #2fbf71 14%, var(--panel-2, #162128)); }
.pl-btn.pl-anexar { margin-top: 2px; min-height: 46px; font-size: 14px; }
.pl-decl { display: flex !important; grid-template-columns: none; align-items: flex-start; gap: 10px !important; font-weight: 500 !important; font-size: 13px !important; line-height: 1.45; cursor: pointer; }
.pl-decl input { width: 20px !important; height: 20px; flex: none; margin: 1px 0 0; padding: 0 !important; accent-color: #2fbf71; }
.selo-pro.pl-plus { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
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
  ["isento", "Isento do Imposto de Renda", "Consulta na Receita mostrando que você não declarou"]
];
// Pedidos antigos podiam escolher "mando depois"; agora o comprovante vai junto, sempre.
export const nomeDocRenda = (k) => DOCS_RENDA.find((d) => d[0] === k)?.[1] || (k === "depois" ? "Ia mandar depois (pedido antigo)" : "");
// Condição especial (baixa renda comprovada): 50% de desconto em qualquer plano, com tudo o que o plano oferece.
export const BAIXA_RENDA = { desconto: 0.5 };
export const precoBaixaRenda = (k) => Math.round((PLANOS[k]?.preco || 0) * (1 - BAIXA_RENDA.desconto) * 100) / 100;
export const STATUS_NEG = { novo: "Recebido · em análise", em_conversa: "Em conversa com a equipe", aguardando_pagamento: "Aprovado · falta pagar", aprovado: "Aprovado", recusado: "Não aprovado", cancelado: "Cancelado" };
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
// Negociação aprovada com valor: o plano só liga depois que a pessoa paga o valor combinado.
export const negPagar = (n) => !!n && n.status === "aguardando_pagamento" && Number(n.valorAcordado) > 0;
// Código que vai no Pix (txid) para achar o pagamento no extrato.
const novoTxid = (uid) => ("HF" + uid.slice(0, 6) + Date.now().toString(36)).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 25);
// Primeira assinatura: quem nunca pagou um plano paga o período e ganha mais 30 dias grátis (o dono do site soma os
// dias ao confirmar o Pix). Sem leitura possível (regras ainda não publicadas), mostra a oferta: quem decide é o painel.
// Mesma conta do painel e do pagamento automático: já teve pedido pago ou negociação aprovada = não é a primeira (antes,
// um plano encerrado pela equipe voltava a mostrar o bônus que depois não era dado).
export async function primeiraAssinatura(fb, uid) {
  try {
    const [s, pagos, n] = await Promise.all([
      fb.getDoc(fb.doc(fb.db, "planos", uid)),
      fb.getDocs(fb.query(fb.collection(fb.db, "planos_pedidos"), fb.where("uid", "==", uid), fb.where("status", "==", "pago"), fb.limit(1))),
      fb.getDoc(fb.doc(fb.db, "planos_negociacoes", uid)).catch(() => null)
    ]);
    if (s.exists() && (s.data().pedidoId || s.data().negociacaoId)) return false;
    if (!pagos.empty) return false;
    return !(n?.exists?.() && n.data().status === "aprovado");
  } catch { return true; }
}
export const testeDisponivel = primeiraAssinatura; // nome antigo (Meus negócios)
const nMesesTxt = (m) => `${m} ${m === 1 ? "mês" : "meses"}`;
const duracaoTxt = (n) => (n.dias && n.dias % 30 ? `${n.dias} dias` : nMesesTxt(n.meses || Math.round((n.dias || 30) / 30) || 1));
const dataLonga = (t) => new Date(ms(t)).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

// Cartão "Seu plano X · faltam N dias" (barra do tempo que sobra; laranja na última semana).
export function cartaoStatus(plano) {
  css();
  const nv = nivelPlano(plano), d = diasRestantes(plano), k = plano?.plano;
  const venceuHa = Math.floor((Date.now() - ms(plano?.ate)) / DIA);
  if (!nv && !(PLANOS[k] && ms(plano?.ate) && venceuHa <= 30)) return null;
  const c = el("div", "pl-status" + (!nv ? " vencido" : d <= 7 ? " perto" : ""));
  const lin = el("div", "lin"), t = el("div");
  if (nv && emTolerancia(plano)) {
    c.classList.add("perto");
    t.append(el("b", null, `Seu plano ${nomePlano(k)} venceu`), el("small", null, `Renove até ${dataLonga(fimComTolerancia(plano))} para não perder nada. Depois, só um perfil de negócio fica no ar e sem selo, destaque, promoção e flash.`));
    lin.append(seloPlano(k), t); c.appendChild(lin);
  } else if (nv) {
    if (plano.teste) t.append(el("b", null, `Teste grátis do ${nomePlano(k)}`), el("small", null, `Termina em ${dataLonga(plano.ate)}. ${d <= 7 ? "Assine agora para não perder o selo e o destaque." : "Assine quando quiser: os meses pagos começam depois do teste."}`));
    else t.append(el("b", null, `Seu plano ${nomePlano(k)} está ativo`), el("small", null, `Vence em ${dataLonga(plano.ate)}. ${d <= 7 ? "Renove agora para não perder o destaque." : "Renove antes para somar os dias."}`));
    const dd = el("div", "dias"); dd.append(el("strong", null, String(d)), el("span", null, d === 1 ? "dia" : "dias"));
    lin.append(seloPlano(k), t, dd); c.appendChild(lin);
    const total = Math.max(d, (Number(plano.meses) || 1) * 30);
    const b = el("div", "pl-barra"); const i = el("i"); i.style.width = Math.max(3, Math.min(100, (d / total) * 100)) + "%"; b.appendChild(i);
    b.setAttribute("role", "progressbar"); b.setAttribute("aria-label", `${textoFalta(d)} do plano`); b.setAttribute("aria-valuemin", "0"); b.setAttribute("aria-valuemax", String(total)); b.setAttribute("aria-valuenow", String(d));
    c.appendChild(b);
  } else {
    t.append(el("b", null, plano.teste ? `Seu teste grátis do ${nomePlano(k)} terminou` : `Seu plano ${nomePlano(k)} venceu`), el("small", null, `${plano.teste ? "Terminou" : "Venceu"} em ${dataLonga(plano.ate)}. Sem plano, só um perfil de negócio fica no ar. Escolha um plano abaixo para voltar a ter tudo.`));
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
  let pararEscuta = null, brick = null;
  const limparPagamento = () => { try { pararEscuta?.(); } catch {} pararEscuta = null; try { brick?.unmount?.(); } catch {} brick = null; };
  const fechar = () => { limparPagamento(); fundo.remove(); document.removeEventListener("keydown", tecla); };
  const tecla = (e) => { if (e.key === "Escape") fechar(); };
  document.addEventListener("keydown", tecla);
  fundo.addEventListener("click", (e) => { if (e.target === fundo) fechar(); });
  x.addEventListener("click", fechar);
  corpo.appendChild(el("p", "pl-nota", "Carregando..."));
  let [plano, pedido, neg, primeira] = await Promise.all([lerPlano(fb, eu.uid), pedidoAberto(fb, eu.uid), lerNegociacao(fb, eu.uid), primeiraAssinatura(fb, eu.uid)]);
  if (pedido) { mostrarPix(pedido); return; }
  if (op.negociar || (negPagar(neg) && !op.plano)) { mostrarNegociacao(op.negociar || neg.tipo); return; }
  pintarEscolha();

  function pintarEscolha() {
    corpo.replaceChildren(); cx.scrollTop = 0;
    // Topo: muda com o plano tocado (nome, para quem é, o que libera, preço do mês e por dia).
    const hero = el("div", "pl-hero");
    const heroTag = el("small"), heroTit = el("h3"), heroTx = el("p"), heroLista = el("ul", "pl-libera");
    const preco = el("div", "pl-preco");
    const precoB = el("b"), precoDia = el("span", "dia"), precoInfo = el("span");
    preco.append(el("span", "de", "Por mês"), precoB, precoDia, precoInfo);
    hero.append(heroTag, heroTit, heroTx, heroLista, preco);
    // Bônus da primeira assinatura, bem à vista.
    if (primeira) { const bn = el("div", "pl-bonus"); bn.append(el("b", null, `+${DIAS_BONUS} dias grátis`), el("span", null, "na sua primeira assinatura: você paga o período escolhido e usa 30 dias a mais, em qualquer plano.")); hero.appendChild(bn); }
    function pintarHero(k) {
      const P = PLANOS[k];
      hero.style.setProperty("--c", P.cor);
      hero.dataset.plano = k;
      heroTag.textContent = `Plano ${P.nome}${primeira ? ` · primeira assinatura: +${DIAS_BONUS} dias grátis` : ""}`;
      heroTit.textContent = P.titulo;
      heroTx.textContent = P.pitch;
      heroLista.replaceChildren(...DESTAQUES_PLANO[k].map((t) => el("li", null, t)));
      precoB.textContent = reais(P.preco);
      precoDia.textContent = `≈ ${reais(P.preco / 30)} por dia`;
      precoInfo.textContent = `até ${MAX_DESC}% de desconto no plano anual · vale para todos os seus negócios`;
    }
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
    const tab = el("div", "pl-tabela c4");
    const COLS = ["gratis", ...ORDEM_PLANOS];
    const cab = el("div", "pl-lin cab"); cab.append(el("span", null, "Recursos"), ...COLS.map((k) => { const c = el("span", k === "gratis" ? "gr" : null, PLANOS[k]?.nome || "Grátis"); c.dataset.col = k; return c; })); tab.appendChild(cab);
    BENEFICIOS.forEach(([nome, ...tem]) => {
      const l = el("div", "pl-lin"); l.appendChild(el("span", null, nome));
      tem.forEach((v, i) => { const c = el("span", (typeof v === "string" ? "pl-txt" : v ? "pl-sim" : "pl-nao") + (i === 0 ? " gr" : ""), typeof v === "string" ? v : v ? "✓" : "—"); c.dataset.col = COLS[i]; l.appendChild(c); });
      tab.appendChild(l);
    });
    corpo.appendChild(tab);
    corpo.appendChild(el("p", "pl-nota", "Como funciona a ordem das vitrines: 1 a cada 5 cartões é um espaço de destaque de quem tem plano (o Premium fica com o 1º lugar, depois vêm Pro e Plus). Os outros seguem a relevância, igual para todos (avaliações, atendimento, perfil completo, novidade e distância), com o bônus do plano. A ordem gira ao longo do dia, para que todos apareçam."));

    const secPer = el("div", "pl-sec"); corpo.appendChild(secPer);
    const per = el("div", "pl-periodos");
    PERIODOS.forEach(([m, rot, d]) => {
      const b = el("button", "pl-per"); b.type = "button"; b.dataset.m = m;
      b.append(el("b", null, rot), el("small", "total"));
      // Todos os cartões com as mesmas linhas (o de 1 mês ficava desalinhado dos outros).
      b.append(d ? el("s") : el("span", "sem", "Sem desconto"), el("span", "mes"));
      if (d) b.append(el("span", "off", `-${Math.round(d * 100)}%`));
      if (primeira) b.append(el("span", "bonus", `+${DIAS_BONUS} dias grátis`));
      b.addEventListener("click", () => { meses = m; pintarSel(); });
      per.appendChild(b);
    });
    corpo.appendChild(per);
    const economia = el("p", "pl-economia"); economia.hidden = true; corpo.appendChild(economia);
    // Até quando o plano vai valer (a mesma conta do painel: renovar soma ao que falta; trocar usa os dias de crédito).
    const validade = el("div", "pl-validade"); const valTx = el("div");
    const icCal = el("span", "ic"); icCal.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18M8 14h3"/></svg>';
    validade.append(icCal, valTx); corpo.appendChild(validade);
    const credito = el("p", "pl-credito"); credito.hidden = true; corpo.appendChild(credito);
    const btn = el("button", "pl-btn"); btn.type = "button";
    function pintarSel() {
      const P = PLANOS[escolhido];
      pintarHero(escolhido);
      cards.querySelectorAll(".pl-card").forEach((b) => { const on = b.dataset.plano === escolhido; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
      tab.style.setProperty("--c", P.cor);
      tab.querySelectorAll("[data-col]").forEach((c) => c.classList.toggle("sel", c.dataset.col === escolhido));
      per.querySelectorAll(".pl-per").forEach((b) => {
        const m = Number(b.dataset.m), v = valorPeriodo(escolhido, m);
        b.classList.toggle("on", m === meses);
        b.querySelector(".total").textContent = reais(v);
        if (b.querySelector("s")) b.querySelector("s").textContent = reais(P.preco * m);
        b.querySelector(".mes").textContent = `${reais(v / m)} por mês`;
      });
      const eco = Math.round((P.preco * meses - valorPeriodo(escolhido, meses)) * 100) / 100;
      secPer.textContent = `${escolhido === atual && !plano?.teste ? "Renovar o" : "Assinar o"} ${P.nome} por`;
      economia.textContent = eco ? `Você economiza ${reais(eco)} (${Math.round(descontoDe(meses) * 100)}% de desconto).` : "";
      economia.hidden = !eco;
      const mesmo = !!nivelPlano(plano) && plano.plano === escolhido && !plano.teste;
      const inicio = mesmo ? Math.max(Date.now(), ms(plano.ate)) : Date.now() + creditoDias(plano, escolhido) * DIA;
      const fim = new Date(inicio + (meses * 30 + (primeira ? DIAS_BONUS : 0)) * DIA);
      const pago = meses === 1 ? "1 mês pago" : `${meses} meses pagos`;
      const det = el("span");
      if (primeira) det.append(document.createTextNode(`${pago} `), el("em", null, `+ ${DIAS_BONUS} dias grátis`), document.createTextNode(" (presente só da primeira assinatura)."));
      else if (mesmo) det.textContent = `${pago}, somados ao que ainda falta do seu ${P.nome} (até ${new Date(ms(plano.ate)).toLocaleDateString("pt-BR")}).`;
      else det.textContent = `${pago}, contando a partir da confirmação do pagamento.`;
      valTx.replaceChildren(el("small", null, `Seu ${P.nome} vai valer até`), el("b", null, fim.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })), det);
      btn.textContent = PAGAMENTO.automatico ? `Pagar ${reais(valorPeriodo(escolhido, meses))} · Pix ou cartão` : `Pagar ${reais(valorPeriodo(escolhido, meses))} com Pix`;
      const cr = creditoDias(plano, escolhido);
      credito.hidden = !atual || escolhido === atual;
      credito.textContent = cr > 0 && plano?.teste ? `Você ainda tem ${cr} ${cr === 1 ? "dia" : "dias"} de teste grátis: o ${P.nome} já começa agora e os meses que você pagar contam depois disso.` : cr > 0 ? `Trocar de plano: os ${diasRestantes(plano)} dias que sobram do ${nomePlano(atual)} viram ${cr} ${cr === 1 ? "dia" : "dias"} a mais no ${P.nome}, somados aos meses que você pagar.` : "";
      if (!cr) credito.hidden = true;
    }
    pintarSel();
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        const txid = novoTxid(eu.uid);
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
    if (negPagar(neg)) {
      aj.append(el("b", null, `Seu pedido de ${TIPOS_NEG[neg.tipo]?.toLowerCase() || "negociação"} foi aprovado`), el("p", null, `Plano ${nomePlano(neg.planoConcedido)} por ${reais(neg.valorAcordado)} no total. Pague para ativar.`));
      const v = el("button", "pl-btn"); v.type = "button"; v.textContent = `Pagar ${reais(neg.valorAcordado)} e ativar`; v.addEventListener("click", () => mostrarNegociacao(neg.tipo));
      aj.appendChild(v);
    } else if (negAberta(neg)) {
      aj.append(el("b", null, `Seu pedido de ${TIPOS_NEG[neg.tipo]?.toLowerCase() || "negociação"} está com a equipe`), el("p", null, `${STATUS_NEG[neg.status]}. A resposta chega nas suas notificações e pelo Suporte.`));
      const v = el("button", "pl-btn sec"); v.type = "button"; v.textContent = "Ver o meu pedido"; v.addEventListener("click", () => mostrarNegociacao(neg.tipo));
      aj.appendChild(v);
    } else {
      aj.append(el("b", null, "Não dá para pagar agora?"), el("p", null, `Seu negócio continua no ar de graça, com 1 perfil. Tem baixa renda? Com um documento que comprove, você paga ${Math.round(BAIXA_RENDA.desconto * 100)}% menos em qualquer plano (o Plus sai por ${reais(precoBaixaRenda("plus"))}). Quer propor outro valor, um prazo, uma troca ou uma parceria? Mande a sua proposta.`));
      // Os dois caminhos nos mesmos cartões coloridos do formulário (já "acesos").
      const bts = el("div", "pl-tipos");
      [["apoio", "%", "Baixa renda", `50% off · Plus por ${reais(precoBaixaRenda("plus"))}`], ["parceria", "⇄", "Parceria ou negociação", "Valor, prazo, troca ou parceria"]].forEach(([k, ic, t, sub]) => {
        const b = el("button", `pl-tipo ${k} on pl-atalho`); b.type = "button"; b.dataset.t = k;
        b.append(el("i", null, ic), el("b", null, t), el("small", null, sub), el("span", "pl-seta", "›"));
        b.addEventListener("click", () => mostrarNegociacao(k)); bts.appendChild(b);
      });
      aj.appendChild(bts);
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
    if (neg && (negAberta(neg) || negPagar(neg) || ((neg.status === "aprovado" || neg.status === "recusado") && Date.now() - ms(neg.decididoEm) < 30 * DIA && !op._novoPedido))) {
      const c = el("div", "pl-neg");
      const stc = neg.status === "aprovado" || negPagar(neg) ? "st ok" : neg.status === "recusado" ? "st nao" : "st";
      c.append(el("span", stc, STATUS_NEG[neg.status] || neg.status), el("b", null, `${TIPOS_NEG[neg.tipo] || "Pedido"} · plano ${nomePlano(neg.plano)}`),
        el("small", "pl-nota", `Enviado em ${ms(neg.criadoEm) ? dataLonga(neg.criadoEm) : "agora"}${neg.valorProposto ? ` · você propôs ${reais(neg.valorProposto)} por mês` : ""}`));
      if (neg.perfisPedidos || neg.mesesPedidos) c.appendChild(el("small", "pl-nota", [neg.perfisPedidos && (neg.perfisPedidos >= TIPOS_PERFIL.length ? "Todos os perfis no ar" : `${neg.perfisPedidos} ${neg.perfisPedidos === 1 ? "perfil" : "perfis"} no ar`), neg.mesesPedidos && `por ${nMesesTxt(neg.mesesPedidos)}`].filter(Boolean).join(" ")));
      c.appendChild(el("q", null, neg.mensagem || ""));
      // Quem da equipe cuida do pedido (só o primeiro nome).
      if (neg.responsavelNome && negAberta(neg)) { const r = el("div", "pl-resp-neg"); const pn = String(neg.responsavelNome).trim().split(/\s+/)[0]; r.append(el("i", null, pn.charAt(0).toUpperCase()), el("span", null, `${pn}, da equipe Help Floripa, está cuidando do seu pedido.`)); c.appendChild(r); }
      if (neg.tipo === "apoio" && neg.comprovanteTipo) c.appendChild(el("small", "pl-nota", `Comprovante: ${nomeDocRenda(neg.comprovanteTipo)}${neg.comprovante ? " · documento anexado" : ""}`));
      if (neg.status === "aprovado") c.appendChild(el("div", "resp", `Plano ${nomePlano(neg.planoConcedido || neg.plano)} por ${duracaoTxt(neg)}${neg.valorAcordado ? ` · ${reais(neg.valorAcordado)} combinado` : " · sem custo"}${Array.isArray(neg.tipos) && neg.tipos.length ? ` · no ar: ${neg.tipos.map((t) => NOMES_PERFIL[t] || t).join(", ")}` : ""}.${neg.resposta ? "\n" + neg.resposta : ""}`));
      else if (negPagar(neg)) c.appendChild(el("div", "resp", `Aprovado: plano ${nomePlano(neg.planoConcedido)} por ${duracaoTxt(neg)}, ${reais(neg.valorAcordado)} no total${Array.isArray(neg.tipos) && neg.tipos.length ? ` · no ar: ${neg.tipos.map((t) => NOMES_PERFIL[t] || t).join(", ")}` : ""}. O plano liga assim que o pagamento for confirmado, e o tempo começa a contar a partir daí.${neg.resposta ? "\n" + neg.resposta : ""}`));
      else if (neg.resposta) c.appendChild(el("div", "resp", neg.resposta));
      corpo.appendChild(c);
      if (negPagar(neg)) {
        const pagar = el("button", "pl-btn"); pagar.type = "button"; pagar.textContent = PAGAMENTO.automatico ? `Pagar ${reais(neg.valorAcordado)} · Pix ou cartão` : `Pagar ${reais(neg.valorAcordado)} com Pix`;
        pagar.addEventListener("click", async () => {
          pagar.disabled = true;
          try {
            const dados = { uid: eu.uid, nome: String(op.dados?.nome || "").slice(0, 80), email: String(eu.email || "").slice(0, 120), plano: neg.planoConcedido, meses: neg.meses, valor: neg.valorAcordado, txid: novoTxid(eu.uid), status: "pendente", criadoEm: fb.serverTimestamp(), negociacaoId: eu.uid };
            const ref = await fb.addDoc(fb.collection(fb.db, "planos_pedidos"), dados);
            op.aoMudar?.();
            mostrarPix({ id: ref.id, ...dados, criadoEm: null });
          } catch (e) {
            pagar.disabled = false;
            toast(e?.code === "permission-denied" ? "Não foi possível criar a cobrança. Fale com a equipe pelo Suporte." : "Não foi possível criar a cobrança agora.");
          }
        });
        corpo.appendChild(pagar);
      }
      const sup = el("a", "pl-btn sec"); sup.href = "suporte.html"; sup.textContent = "Falar com a equipe pelo Suporte"; corpo.appendChild(sup);
      if (negAberta(neg) || negPagar(neg)) {
        const can = el("button", "pl-btn sec"); can.type = "button"; can.textContent = negPagar(neg) ? "Não quero mais esta condição" : "Cancelar o pedido";
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
    // Os dois caminhos em cartões coloridos: condição especial (verde) e parceria (roxo).
    const tipos = el("div", "pl-tipos"); tipos.setAttribute("role", "radiogroup");
    [["apoio", "Baixa renda", "50% de desconto em qualquer plano", "%"], ["parceria", "Parceria ou negociação", "Outro valor, prazo, troca ou parceria", "⇄"]].forEach(([k, rot, sub, ic]) => {
      const b = el("button", "pl-tipo " + k); b.type = "button"; b.dataset.t = k; b.setAttribute("role", "radio");
      b.append(el("i", null, ic), el("b", null, rot), el("small", null, sub));
      b.addEventListener("click", () => { tipo = k; pintarTipo(); }); tipos.appendChild(b);
    });
    // Sem plano o negócio já fica no ar (grátis): o pedido é pelos extras de um plano.
    const gratis = el("div", "pl-neg-gratis");
    gratis.append(el("b", null, "Seu negócio já fica no ar de graça"), el("small", null, `Sem plano: 1 perfil, até ${LIMITES_GRATIS.itens} itens e ${LIMITES_GRATIS.fotos} foto. O pedido é para ter tudo o que o plano oferece.`));
    // Passos numerados.
    const passo = (n, titulo, sub) => { const w = el("div", "pl-passo"); const h = el("div", "pl-passo-tit"); h.append(el("span", "n", String(n)), el("b", null, titulo)); w.appendChild(h); if (sub) w.appendChild(el("small", "pl-passo-sub", sub)); return w; };
    // Cartões dos planos na cor de cada um; na baixa renda com o preço cheio riscado e o de 50%.
    const cards = el("div", "pl-planos-neg"); cards.setAttribute("role", "radiogroup"); cards.setAttribute("aria-label", "Plano");
    const pintarCards = () => {
      const ap = tipo === "apoio";
      cards.replaceChildren(...ORDEM_PLANOS.map((k) => {
        const P = PLANOS[k], on = k === planoQ;
        const b = el("button", "pl-pn" + (on ? " on" : "")); b.type = "button"; b.dataset.p = k; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(on));
        b.style.setProperty("--cor", P.cor);
        const topo = el("div", "pl-pn-topo"); topo.append(el("b", null, P.nome)); if (ap) topo.appendChild(el("span", "pl-pn-off", "-50%"));
        const preco = el("div", "pl-pn-preco");
        if (ap) preco.append(el("s", null, reais(P.preco)));
        preco.append(el("strong", null, reais(ap ? precoBaixaRenda(k) : P.preco)), el("small", null, "/mês"));
        b.append(topo, preco, el("span", "pl-pn-frase", P.frase));
        b.addEventListener("click", () => { planoQ = k; pintarCards(); });
        return b;
      }));
      pintarPeriodos();
    };
    // Baixa renda: por quanto tempo (o preço do mês já tem os 50%; não soma com o desconto dos períodos).
    let mesesQ = 1;
    const periodos = el("div", "pl-periodos pl-per-neg"); periodos.setAttribute("role", "radiogroup"); periodos.setAttribute("aria-label", "Por quanto tempo");
    const pintarPeriodos = () => {
      periodos.replaceChildren(...PERIODOS.map(([m, nome]) => {
        const on = m === mesesQ, total = Math.round(precoBaixaRenda(planoQ) * m * 100) / 100;
        const b = el("button", "pl-per" + (on ? " on" : "")); b.type = "button"; b.dataset.m = String(m); b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(on));
        b.append(el("b", null, nome), el("span", "tot", reais(total)), el("s", null, reais(PLANOS[planoQ].preco * m)), el("span", "mes", `${reais(precoBaixaRenda(planoQ))} por mês`));
        b.addEventListener("click", () => { mesesQ = m; pintarPeriodos(); });
        return b;
      }));
    };
    const tempoBox = el("div", "pl-tempo");
    tempoBox.append(el("span", "pl-tempo-tit", "Por quanto tempo"), periodos, el("small", "pl-passo-sub", "Na baixa renda o desconto é sempre de 50%, em qualquer período. A equipe confere o comprovante e libera pelo tempo escolhido."));
    const pPlano = passo(1, "Escolha o plano");
    pPlano.append(cards, tempoBox);
    const lv = el("label"); const lvTxt = el("span"); const valor = el("input"); valor.type = "text"; valor.inputMode = "decimal"; valor.placeholder = "Ex.: 25,00"; valor.maxLength = 8; valor.id = "plNegValor";
    lv.append(lvTxt, valor);
    const lm = el("label"); const lmTxt = el("span"); const msg = el("textarea"); msg.maxLength = 1500; msg.id = "plNegMsg";
    lm.append(lmTxt, msg);
    const lc = el("label"); const lcTxt = el("span"); lcTxt.append(document.createTextNode("WhatsApp ou telefone para contato "), el("small", null, "(opcional)"));
    const contato = el("input"); contato.type = "tel"; contato.inputMode = "tel"; contato.autocomplete = "tel"; contato.maxLength = 15; contato.placeholder = "(48) 99999-9999"; contato.id = "plNegContato";
    // Mesmo formato do WhatsApp de Meus negócios: (DD) 9999-9999 ou (DD) 99999-9999 enquanto digita.
    contato.addEventListener("input", () => { contato.value = formatarTelefone(contato.value); });
    lc.append(lcTxt, contato);
    const pConta = el("div", "pl-passo"); // título muda com o tipo
    const pContaTit = el("div", "pl-passo-tit"); pConta.append(pContaTit, lv, lm, lc);
    const enviar = el("button", "pl-btn pl-enviar"); enviar.type = "submit";
    const nota = el("p", "pl-nota", "Só os responsáveis pelo Help Floripa leem o seu pedido. A resposta chega nas notificações e pelo Suporte.");
    // Prova de baixa renda (só na condição especial): qual documento, o arquivo e a declaração.
    const prova = passo(2, "Comprove a baixa renda", "Escolha o documento e anexe a foto ou o PDF. Só os responsáveis do Help Floripa veem, e ele é apagado depois da análise.");
    prova.classList.add("pl-prova");
    let docEscolhido = "", anexo = null;
    const docs = el("div", "pl-docs"); docs.setAttribute("role", "radiogroup"); docs.setAttribute("aria-label", "Documento que comprova a baixa renda");
    // Mostra os 4 mais usados; o resto abre em "Ver outros documentos".
    DOCS_RENDA.forEach(([k, rot, dica], i) => {
      const b = el("button", "pl-doc" + (i >= 4 ? " extra" : "")); b.type = "button"; b.dataset.doc = k; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", "false");
      b.append(el("b", null, rot), el("small", null, dica));
      b.addEventListener("click", async () => {
        if (k === docEscolhido) return;
        // O arquivo anexado é do documento escolhido antes: trocar o tipo tira o arquivo (senão o painel mostraria
        // um nome de documento e um arquivo de outro).
        if (anexo) {
          const { confirmarHF } = await import("./confirmar.js?v=5");
          const atual = nomeDocRenda(anexo.doc || docEscolhido);
          const ok = await confirmarHF({ titulo: "Trocar o documento?", texto: "O arquivo que você anexou sai. Depois é só anexar o novo.", troca: { de: atual, para: rot, rotDe: "Atual", rotPara: "Novo" }, ok: "Trocar documento", cancelar: `Manter ${atual}`, cor: "normal", icone: "alerta" });
          if (!ok) return;
          anexo = null; previa.replaceChildren();
        }
        docEscolhido = k; pintarDoc();
      });
      docs.appendChild(b);
    });
    const extras = DOCS_RENDA.length - 4;
    const maisDocs = el("button", "pl-mais-docs", `Ver outros documentos (${extras})`); maisDocs.type = "button";
    maisDocs.addEventListener("click", () => { docs.classList.add("todos"); maisDocs.hidden = true; });
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
        anexo = { ...x, doc: docEscolhido }; previa.replaceChildren(previaAnexo(x, () => { anexo = null; previa.replaceChildren(); pintarDoc(); }));
      } catch (e) { toast(e?.message || "Não foi possível usar esse arquivo."); }
      btArq.disabled = false; pintarDoc();
    });
    const decl = el("label", "pl-decl"); const ck = el("input"); ck.type = "checkbox"; ck.id = "plNegDecl";
    decl.append(ck, el("span", null, "Declaro que as informações são verdadeiras e sei que a equipe pode pedir outro documento para confirmar."));
    prova.append(docs, maisDocs, btArq, previa, arq, decl);
    function pintarDoc() {
      docs.querySelectorAll(".pl-doc").forEach((b) => { const on = b.dataset.doc === docEscolhido; b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on)); if (on && b.classList.contains("extra")) { docs.classList.add("todos"); maisDocs.hidden = true; } });
      btArq.hidden = !docEscolhido || !!anexo;
      btArq.textContent = `Anexar foto ou PDF: ${nomeDocRenda(docEscolhido) || "documento"}`;
    }
    pintarDoc();
    f.append(tit, intro, tipos, gratis, pPlano, prova, pConta, enviar, nota);
    corpo.appendChild(f);
    function pintarTipo() {
      tipos.querySelectorAll(".pl-tipo").forEach((b) => { const on = b.dataset.t === tipo; b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on)); });
      const ap = tipo === "apoio";
      f.dataset.tipo = tipo;
      prova.hidden = !ap; lv.hidden = ap; tempoBox.hidden = !ap;
      tit.textContent = ap ? "Condição especial para baixa renda" : "Parceria ou negociação";
      intro.textContent = ap ? `Quem comprova baixa renda paga a metade: ${Math.round(BAIXA_RENDA.desconto * 100)}% de desconto em qualquer plano, com tudo o que o plano oferece.` : "A gente aceita negociar: proponha um valor, um prazo de pagamento, uma troca (divulgação, serviços) ou uma parceria. A equipe responde com uma proposta.";
      pContaTit.replaceChildren(el("span", "n", ap ? "3" : "2"), el("b", null, ap ? "Conte a sua situação" : "Sua proposta"));
      lvTxt.replaceChildren(document.createTextNode("Valor que você propõe por mês "), el("small", null, "(opcional)"));
      lmTxt.replaceChildren(document.createTextNode(ap ? "Sua situação" : "Sua proposta"), el("small", null, " (pelo menos 20 letras)"));
      msg.placeholder = ap ? "Ex.: Sou autônoma, faço doces em casa e recebo o Bolsa Família. A renda caiu este mês..." : "Ex.: Consigo pagar R$ 30 por mês no Pro se for o ano todo. Ou posso divulgar o Help Floripa na minha loja em troca do plano...";
      enviar.textContent = ap ? "Enviar pedido de condição especial" : "Enviar proposta";
      pintarCards();
    }
    pintarTipo();
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const texto = msg.value.trim();
      if (tipo === "apoio") {
        if (!docEscolhido) { toast("Escolha o documento que comprova a baixa renda."); docs.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
        if (!anexo || anexo.doc !== docEscolhido) { toast("Anexe a foto ou o PDF do documento que comprova a renda."); btArq.focus(); return; }
        if (!ck.checked) { toast("Confirme a declaração para enviar."); ck.focus(); return; }
      }
      if (texto.length < 20) { toast("Conte um pouco mais (pelo menos 20 letras)."); msg.focus(); return; }
      const digitos = contato.value.replace(/\D/g, "");
      if (digitos && (digitos.length < 10 || digitos.length > 11)) { toast("Confira o telefone: DDD + número, como (48) 99999-9999."); contato.focus(); return; }
      const v = Number(String(valor.value).replace(/[^\d,.]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".")) || 0;
      if (v < 0 || v > 1000) { toast("Confira o valor."); valor.focus(); return; }
      enviar.disabled = true;
      const dados = { uid: eu.uid, nome: String(op.dados?.nome || "").slice(0, 80), email: String(eu.email || "").slice(0, 120), tipo, plano: planoQ, valorProposto: tipo === "apoio" ? precoBaixaRenda(planoQ) : Math.round(v * 100) / 100, contato: contato.value.trim().slice(0, 40), mensagem: texto.slice(0, 1500), status: "novo", criadoEm: fb.serverTimestamp(),
        ...(tipo === "apoio" ? { mesesPedidos: mesesQ, comprovanteTipo: docEscolhido, declaracao: true, ...(anexo ? { comprovante: { tipo: anexo.tipo, url: anexo.url, nome: String(anexo.nome || "").slice(0, 120) } } : {}) } : {}) };
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

  // Pedido normal: preço da tabela. Pedido de negociação: o valor combinado (as regras conferem com a negociação).
  function valorDoPedido(p) { return p.negociacaoId ? Number(p.valor) || 0 : valorPeriodo(p.plano, p.meses); }
  function cabecalhoPedido(p) {
    const ped = `Pedido #${String(p.id).slice(-6).toUpperCase()} · Plano ${nomePlano(p.plano)}`;
    if (p.negociacaoId) return `${ped} · ${TIPOS_NEG[neg?.tipo] || "Condição combinada"} · ${neg?.status === "aguardando_pagamento" ? duracaoTxt(neg) : nMesesTxt(p.meses)}`;
    return `${ped} · ${p.meses} ${p.meses === 1 ? "mês" : "meses"}${descontoDe(p.meses) ? ` com ${Math.round(descontoDe(p.meses) * 100)}% de desconto` : ""}`;
  }
  // Com o pagamento automático ligado: abas Pix | Cartão; o plano liga sozinho quando o Mercado Pago aprova.
  function mostrarPix(p) {
    limparPagamento();
    if (!PAGAMENTO.automatico) return mostrarPixManual(p);
    corpo.replaceChildren();
    const box = el("div", "pl-pix pl-pagar");
    box.append(el("small", null, cabecalhoPedido(p)), el("b", "valor", reais(valorDoPedido(p))));
    if (primeira && !p.negociacaoId) box.append(el("p", "pl-nota pl-bonus-pix", `Primeira assinatura: assim que o pagamento for aprovado, você ganha mais ${DIAS_BONUS} dias grátis.`));
    const abas = el("div", "pl-abas"); abas.setAttribute("role", "tablist");
    const area = el("div", "pl-area");
    const aba = (k, nome) => { const b = el("button", "pl-aba", nome); b.type = "button"; b.dataset.k = k; b.setAttribute("role", "tab"); b.addEventListener("click", () => escolher(k)); abas.appendChild(b); return b; };
    aba("pix", "Pix"); aba("cartao", "Cartão de crédito ou débito");
    box.append(abas, area);
    corpo.appendChild(box);
    const seguro = el("p", "pl-nota pl-seguro", "Pagamento processado pelo Mercado Pago. O Help Floripa não vê nem guarda os dados do seu cartão.");
    const cancelar = el("button", "pl-btn sec"); cancelar.type = "button"; cancelar.textContent = "Cancelar este pedido";
    cancelar.addEventListener("click", async () => {
      cancelar.disabled = true;
      try { limparPagamento(); await fb.updateDoc(fb.doc(fb.db, "planos_pedidos", p.id), { status: "cancelado" }); op.aoMudar?.(); plano = await lerPlano(fb, eu.uid); pintarEscolha(); toast("Pedido cancelado"); }
      catch { cancelar.disabled = false; toast("Não foi possível cancelar agora."); }
    });
    corpo.append(seguro, cancelar);
    let ativo = "", acabou = false;
    ouvirPedido(fb, p.id, (d) => { if (d.status === "pago" && !acabou) aprovado(d.metodo); }).then((u) => { if (acabou || !box.isConnected) u(); else pararEscuta = u; });
    async function aprovado(metodo) {
      if (acabou) return; acabou = true;
      limparPagamento();
      esquecerPlano(eu.uid);
      plano = await lerPlano(fb, eu.uid).catch(() => null);
      op.aoMudar?.();
      corpo.replaceChildren();
      const ok = el("div", "pl-pix pl-aprovado");
      const ic = el("div", "pl-ok-ic", "✓");
      ok.append(ic, el("b", "valor", "Pagamento aprovado!"), el("p", null, `Seu plano ${nomePlano(p.plano)} está ativo${plano?.ate ? ` até ${new Date(ms(plano.ate)).toLocaleDateString("pt-BR")}` : ""}${Array.isArray(plano?.tipos) && plano.tipos.length ? ` para: ${plano.tipos.map((t) => NOMES_PERFIL[t] || t).join(", ")}` : ", para todos os seus negócios"}.${metodo === "cartao" ? " O valor aparece na fatura como HELPFLORIPA." : ""}`));
      const fim = el("button", "pl-btn"); fim.type = "button"; fim.textContent = "Concluir"; fim.addEventListener("click", fechar);
      corpo.append(ok, fim);
    }
    function escolher(k) {
      if (ativo === k || acabou) return; ativo = k;
      abas.querySelectorAll(".pl-aba").forEach((b) => { const on = b.dataset.k === k; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); });
      try { brick?.unmount?.(); } catch {} brick = null;
      area.replaceChildren(el("p", "pl-nota", k === "pix" ? "Gerando o QR Code..." : "Carregando o pagamento com cartão..."));
      (k === "pix" ? abaPix : abaCartao)().catch((e) => console.warn("[Pagamento]", e));
    }
    async function abaPix() {
      let r;
      try { r = await chamarPagamento({ pedidoId: p.id, metodo: "pix" }); }
      catch (e) {
        if (ativo !== "pix") return;
        if (e?.code === "functions/failed-precondition") { area.replaceChildren(el("p", "pl-nota pl-erro", e.message)); return; }
        // Servidor fora do ar: fica o Pix conferido pela equipe.
        area.replaceChildren(el("p", "pl-nota pl-erro", "O Pix automático está indisponível agora. Pague pelo Pix abaixo: a equipe confirma e ativa o plano."));
        const cod = codigoPix({ valor: valorPeriodo(p.plano, p.meses), txid: p.txid });
        if (cod) { area.appendChild(await qrSvg(cod).catch(() => el("span"))); area.appendChild(el("div", "pl-codigo", cod)); const bc = el("button", "pl-btn"); bc.type = "button"; bc.textContent = "Copiar código Pix"; bc.addEventListener("click", () => copiar(cod, toast)); area.appendChild(bc); }
        return;
      }
      if (ativo !== "pix" || acabou) return;
      if (r.status === "approved") { aprovado("pix"); return; }
      area.replaceChildren();
      area.appendChild(await qrSvg(r.qr).catch(() => el("span")));
      const bc = el("button", "pl-btn"); bc.type = "button"; bc.textContent = "Copiar código Pix"; bc.addEventListener("click", () => copiar(r.qr, toast));
      const espera = el("div", "pl-espera"); espera.append(el("span", "pl-gira"), el("span", null, "Esperando o pagamento. O plano liga sozinho assim que o Pix cair."));
      const ol = el("ol", "pl-passos");
      ["Abra o app do seu banco e escolha Pix → Pix Copia e Cola (ou leia o QR Code).", "Confira o valor e pague. Como o Help Floripa é MEI, o banco mostra o nome do responsável pela empresa.", "Pronto: em poucos segundos esta tela muda e o selo aparece em Meus negócios."].forEach((t) => ol.appendChild(el("li", null, t)));
      area.append(el("div", "pl-codigo", r.qr), bc, espera, ol, el("p", "pl-nota", `Este QR Code vale até ${horaData(r.expira)}.`));
    }
    async function abaCartao() {
      let MP;
      try { MP = await carregarSdkMp(); }
      catch { if (ativo === "cartao") area.replaceChildren(el("p", "pl-nota pl-erro", "Não foi possível carregar o pagamento com cartão (confira a internet ou desligue o bloqueador de anúncios). Você pode pagar com Pix.")); return; }
      if (ativo !== "cartao" || acabou) return;
      const id = "plCartao" + Date.now().toString(36);
      const caixa = el("div", "pl-cartao"); caixa.id = id;
      const msg = el("p", "pl-nota pl-erro"); msg.hidden = true;
      area.replaceChildren(caixa, msg);
      const valor = valorPeriodo(p.plano, p.meses);
      const escuro = (() => { const m = getComputedStyle(cx).backgroundColor.match(/\d+/g); return !m || (Number(m[0]) + Number(m[1]) + Number(m[2])) / 3 < 128; })();
      const mp = new MP(PAGAMENTO.publicKey, { locale: "pt-BR" });
      brick = await mp.bricks().create("cardPayment", id, {
        initialization: { amount: valor, payer: { email: eu.email || "" } },
        customization: { visual: { style: { theme: escuro ? "dark" : "default", customVariables: { baseColor: "#00ADEE" } }, texts: { formSubmit: `Pagar ${reais(valor)}` } }, paymentMethods: { maxInstallments: 1 } },
        callbacks: {
          onReady: () => {},
          onError: (e) => console.warn("[Cartão]", e),
          onSubmit: (dados) => new Promise((ok, falha) => {
            msg.hidden = true;
            const tentativa = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
            chamarPagamento({ pedidoId: p.id, metodo: "cartao", cartao: dados, tentativa }).then((r) => {
              if (r.status === "approved") { ok(); aprovado("cartao"); return; }
              if (r.status === "in_process" || r.status === "pending") { ok(); area.replaceChildren(el("p", "pl-nota", "Pagamento em análise pelo Mercado Pago. Assim que for aprovado, o plano liga sozinho e você recebe um aviso.")); return; }
              falha(); msg.textContent = r.motivo || "O pagamento não foi aprovado."; msg.hidden = false;
            }, (e) => { falha(); msg.textContent = e?.code === "functions/failed-precondition" || e?.code === "functions/invalid-argument" ? e.message : "Não foi possível pagar agora. Tente de novo ou use o Pix."; msg.hidden = false; });
          })
        }
      });
    }
    escolher("pix");
  }

  async function mostrarPixManual(p) {
    corpo.replaceChildren();
    const box = el("div", "pl-pix");
    box.append(el("small", null, cabecalhoPedido(p)), el("b", "valor", reais(valorDoPedido(p))));
    if (primeira && !p.negociacaoId) box.append(el("p", "pl-nota pl-bonus-pix", `Primeira assinatura: quando o pagamento for confirmado, você ganha mais ${DIAS_BONUS} dias grátis.`));
    const cod = codigoPix({ valor: valorDoPedido(p), txid: p.txid });
    if (cod) {
      box.appendChild(await qrSvg(cod).catch(() => el("span")));
      const c = el("div", "pl-codigo", cod); box.appendChild(c);
      const bc = el("button", "pl-btn"); bc.type = "button"; bc.textContent = "Copiar código Pix"; bc.addEventListener("click", () => copiar(cod, toast));
      box.appendChild(bc);
      const ol = el("ol", "pl-passos");
      ["Abra o app do seu banco e escolha Pix → Pix Copia e Cola (ou leia o QR Code).", "Confira o valor e o CNPJ do recebedor (61.935.934/0001-00) e pague. Como a Help Floripa está registrada como MEI, o banco mostra o nome do responsável pela empresa: é normal.", `Pronto: a equipe confirma o pagamento e ativa o ${nomePlano(p.plano)} (normalmente em até 1 dia útil). O selo aparece em Meus negócios.`].forEach((t) => ol.appendChild(el("li", null, t)));
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
