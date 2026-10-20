// =====================================================
// Planos dos perfis profissionais: Grátis e Pro.
// - Pagamento por Pix (manual): a pessoa escolhe o plano e o período, o pedido fica em planos_pedidos/{id}
//   e aparece o Pix (copia e cola + QR Code). A equipe confere o pagamento no painel e ativa: planos/{uid}
//   { plano: "pro", ate } — vale para todos os negócios da conta e vence sozinho na data.
// - Preço, benefícios e a chave Pix ficam aqui em cima (mudar o ?v= de quem importa ao editar).
// Sem dependência do rede.js.
// =====================================================

// Chave Pix que recebe os pagamentos (e-mail, telefone com +55, CPF/CNPJ só números ou chave aleatória).
// Vazia: o pedido é criado e a equipe manda a chave pelo Suporte.
export const PIX = { chave: "", nome: "HELP FLORIPA", cidade: "FLORIANOPOLIS" };
export const PRECO_PRO = 39.9; // por mês
export const PERIODOS = [[1, "1 mês"], [3, "3 meses"], [6, "6 meses"], [12, "12 meses"]];
// O que cada plano tem (o que está em "pro: true" o site já faz).
export const BENEFICIOS = [
  ["Perfil de negócio (Freelances, Delivery, Shopping e Imóveis)", true, true],
  ["Pedidos, orçamentos e conversas pelo chat", true, true],
  ["Avaliações, cupons e promoções", true, true],
  ["Estatísticas dos últimos 7 e 30 dias", true, true],
  ["Selo Pro no perfil e nos cartões", false, true],
  ["Aparece primeiro nas vitrines e no Perto de você", false, true],
  ["Estatísticas de 90 dias e relatório em Excel", false, true],
  ["Atendimento prioritário no Suporte", false, true]
];

const ms = (t) => t?.toMillis?.() ?? (t?.seconds ? t.seconds * 1000 : 0);
export const ehPro = (p) => p?.plano === "pro" && ms(p.ate) > Date.now();
export const reais = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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

// Selo "Pro" (cartões e perfil do negócio).
export function seloPro(classe = "selo-pro") {
  css();
  const s = document.createElement("span"); s.className = classe; s.textContent = "PRO"; s.title = "Negócio com plano Pro";
  return s;
}

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

// Abre a gaveta dos planos. op = { fb, eu, dados, toast, aoMudar }
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
  const [plano, pedido] = await Promise.all([lerPlano(fb, eu.uid), pedidoAberto(fb, eu.uid)]);
  if (pedido) { mostrarPix(pedido); return; }
  pintarEscolha(plano);

  function pintarEscolha(plano) {
    corpo.replaceChildren();
    const hero = el("div", "pl-hero");
    hero.append(el("small", null, "Plano Pro"), el("h3", null, "Mais clientes para o seu negócio"),
      el("p", null, "Selo Pro, destaque nas vitrines e no Perto de você, estatísticas completas e atendimento prioritário."));
    const preco = el("div", "pl-preco"); preco.append(el("b", null, reais(PRECO_PRO)), el("span", null, "por mês · vale para todos os seus negócios"));
    hero.appendChild(preco);
    corpo.appendChild(hero);
    if (ehPro(plano)) {
      const a = el("div", "pl-ativo"); const t = el("div");
      t.append(el("b", null, "Seu plano Pro está ativo"), el("small", null, `Até ${new Date(ms(plano.ate)).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}. Renove antes para somar os meses.`));
      a.append(seloPro(), t); corpo.appendChild(a);
    }
    const tab = el("div", "pl-tabela");
    const cab = el("div", "pl-lin cab"); cab.append(el("span", null, "O que tem"), el("span", null, "Grátis"), el("span", null, "Pro")); tab.appendChild(cab);
    BENEFICIOS.forEach(([nome, g, p]) => { const l = el("div", "pl-lin"); l.append(el("span", null, nome), el("span", g ? "pl-sim" : "pl-nao", g ? "✓" : "—"), el("span", p ? "pl-sim" : "pl-nao", p ? "✓" : "—")); tab.appendChild(l); });
    corpo.appendChild(tab);
    corpo.appendChild(el("div", "pl-sec", ehPro(plano) ? "Renovar por" : "Assinar por"));
    const per = el("div", "pl-periodos"); let meses = 1;
    const pintarPer = () => per.querySelectorAll(".pl-per").forEach((b) => b.classList.toggle("on", Number(b.dataset.m) === meses));
    PERIODOS.forEach(([m, rot]) => {
      const b = el("button", "pl-per"); b.type = "button"; b.dataset.m = m;
      b.append(el("b", null, rot), el("small", null, reais(PRECO_PRO * m)));
      b.addEventListener("click", () => { meses = m; pintarPer(); btn.lastChild.textContent = `Pagar ${reais(PRECO_PRO * meses)} com Pix`; });
      per.appendChild(b);
    });
    corpo.appendChild(per); pintarPer();
    const btn = el("button", "pl-btn"); btn.type = "button"; btn.append(document.createTextNode(`Pagar ${reais(PRECO_PRO)} com Pix`));
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        const txid = ("HF" + eu.uid.slice(0, 6) + Date.now().toString(36)).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 25);
        const dados = { uid: eu.uid, nome: String(op.dados?.nome || "").slice(0, 80), email: String(eu.email || "").slice(0, 120), plano: "pro", meses, valor: Math.round(PRECO_PRO * meses * 100) / 100, txid, status: "pendente", criadoEm: fb.serverTimestamp() };
        const ref = await fb.addDoc(fb.collection(fb.db, "planos_pedidos"), dados);
        op.aoMudar?.();
        mostrarPix({ id: ref.id, ...dados, criadoEm: null });
      } catch (e) {
        btn.disabled = false;
        toast(e?.code === "permission-denied" ? "A assinatura começa a funcionar quando a atualização do sistema for publicada." : "Não foi possível criar o pedido agora.");
      }
    });
    corpo.append(btn, el("p", "pl-nota", "Sem fidelidade: o plano vale pelo período pago e não renova sozinho. Você continua no Grátis depois."));
  }

  async function mostrarPix(p) {
    corpo.replaceChildren();
    const box = el("div", "pl-pix");
    box.append(el("small", null, `Pedido #${String(p.id).slice(-6).toUpperCase()} · Plano Pro · ${p.meses} ${p.meses === 1 ? "mês" : "meses"}`), el("b", "valor", reais(p.valor)));
    const cod = codigoPix({ valor: p.valor, txid: p.txid });
    if (cod) {
      box.appendChild(await qrSvg(cod).catch(() => el("span")));
      const c = el("div", "pl-codigo", cod); box.appendChild(c);
      const bc = el("button", "pl-btn"); bc.type = "button"; bc.textContent = "Copiar código Pix"; bc.addEventListener("click", () => copiar(cod, toast));
      box.appendChild(bc);
      const ol = el("ol", "pl-passos");
      ["Abra o app do seu banco e escolha Pix → Pix Copia e Cola (ou leia o QR Code).", "Confira o valor e o recebedor (Help Floripa) e pague.", "Pronto: a equipe confirma o pagamento e ativa o Pro (normalmente em até 1 dia útil). O selo aparece em Meus negócios."].forEach((t) => ol.appendChild(el("li", null, t)));
      box.appendChild(ol);
    } else {
      box.appendChild(el("p", "pl-nota", "Recebemos o seu pedido. A equipe vai mandar a chave Pix pelo Suporte (aparece nas suas Mensagens) e ativa o Pro assim que o pagamento chegar."));
    }
    corpo.appendChild(box);
    const sup = el("a", "pl-btn sec"); sup.href = "suporte.html"; sup.textContent = "Enviar o comprovante pelo Suporte";
    const cancelar = el("button", "pl-btn sec"); cancelar.type = "button"; cancelar.textContent = "Cancelar este pedido";
    cancelar.addEventListener("click", async () => {
      cancelar.disabled = true;
      try { await fb.updateDoc(fb.doc(fb.db, "planos_pedidos", p.id), { status: "cancelado" }); op.aoMudar?.(); pintarEscolha(await lerPlano(fb, eu.uid)); toast("Pedido cancelado"); }
      catch { cancelar.disabled = false; toast("Não foi possível cancelar agora."); }
    });
    corpo.append(sup, cancelar);
  }
}
