// =====================================================
// Verificação do perfil (selo azul), no modelo das grandes redes
// - abrirVerificacao(): tela própria com a situação do pedido (não verificado, em análise com as
//   etapas, verificado ou não aprovado com o motivo), os requisitos conferidos na hora e o pedido
//   em passos: tipo de perfil, nome como no documento, foto do documento, links e motivo.
// - explicarSelo(nome): o que o selo significa (ao tocar no selo de qualquer perfil).
// Pedido em verificacoes/{uid} (só a pessoa e a moderação leem). A foto do documento é apagada
// quando a moderação decide. Com as regras antigas, o pedido vai sem a foto em usuarios/{uid}.verificacaoPedido.
// usuarios.solicitacaoVerificacao continua marcando o pedido (o painel lista por ele).
// =====================================================
import { $, el, icone, toast, erroAmigavel, criarFolha, abrirFolha, fecharFolha, fb, eu, dados, refUsuario, confirmarHF } from "./rede.js?v=82";

export const TIPOS_VERIF = [
  ["pessoa", "Pessoa", "Seu perfil pessoal", "pessoa-mais"],
  ["profissional", "Profissional", "Autônomo ou prestador de serviço", "maleta"],
  ["negocio", "Negócio ou marca", "Loja, restaurante, empresa", "loja"],
  ["publica", "Figura pública", "Artista, influenciador, jornalista", "estrela"],
  ["organizacao", "Organização", "ONG, órgão público, associação", "teia"]
];
export const DOCUMENTOS = [["rg", "RG (identidade)"], ["cnh", "CNH (carteira de motorista)"], ["passaporte", "Passaporte"], ["rne", "RNE / CRNM (estrangeiro)"], ["cnpj", "Cartão CNPJ (negócio)"]];
const DIA = 864e5, CONTA_MIN_DIAS = 7, ESPERA_DIAS = 30, IDADE_MIN = 18;
const ms = (t) => t?.toMillis?.() ?? (t instanceof Date ? t.getTime() : 0);
const dataLonga = (t) => (ms(t) ? new Date(ms(t)).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }) : "");
export const protocoloVerif = (uid) => "#V" + String(uid || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 5).toUpperCase();

// Selo grande (o do ícone tem o "✓" branco fixo, que some no fundo branco do círculo).
function seloGrande() {
  const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("class", "i"); svg.setAttribute("aria-hidden", "true");
  const a = document.createElementNS(ns, "path");
  a.setAttribute("d", "M12 2.5l2.4 1.8 3-.2.9 2.9 2.5 1.7-1 2.8 1 2.8-2.5 1.7-.9 2.9-3-.2L12 21.5l-2.4-1.8-3 .2-.9-2.9-2.5-1.7 1-2.8-1-2.8 2.5-1.7.9-2.9 3 .2z"); a.setAttribute("fill", "#fff");
  const b = document.createElementNS(ns, "path");
  b.setAttribute("d", "M8.3 12.2l2.5 2.5 5-5.2"); b.setAttribute("fill", "none"); b.setAttribute("stroke", "#1d9bf0");
  b.setAttribute("stroke-width", "2.4"); b.setAttribute("stroke-linecap", "round"); b.setAttribute("stroke-linejoin", "round");
  svg.append(a, b); return svg;
}

const CSS = `
.vf { display: grid; gap: 16px; }
.vf-hero { position: relative; display: grid; justify-items: center; gap: 6px; padding: 22px 16px 18px; border-radius: 22px; text-align: center; overflow: hidden;
  background: radial-gradient(120% 120% at 50% 0%, color-mix(in srgb, #1d9bf0 26%, transparent), transparent 70%), var(--panel); border: 1px solid var(--line); }
.vf-hero.ok { background: radial-gradient(120% 120% at 50% 0%, color-mix(in srgb, #1d9bf0 36%, transparent), transparent 70%), var(--panel); }
.vf-hero.nao { background: radial-gradient(120% 120% at 50% 0%, color-mix(in srgb, #ec835a 24%, transparent), transparent 70%), var(--panel); }
.vf-selo { width: 72px; height: 72px; display: grid; place-items: center; border-radius: 50%; background: linear-gradient(135deg, #5cc8ff, #1d9bf0 55%, #0a6fd6); color: #fff; box-shadow: 0 12px 30px rgba(29,155,240,.4); }
.vf-selo .i { width: 38px; height: 38px; }
.vf-hero.nao .vf-selo { background: linear-gradient(135deg, #ffb38a, #ec835a); box-shadow: 0 12px 30px rgba(236,131,90,.35); }
.vf-hero.espera .vf-selo { background: linear-gradient(135deg, #ffd66b, #f0a500); box-shadow: 0 12px 30px rgba(240,165,0,.35); }
.vf-hero h3 { margin: 6px 0 0; font-size: 20px; }
.vf-hero p { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.5; max-width: 420px; }
.vf-proto { margin-top: 4px; padding: 3px 10px; border-radius: 999px; background: color-mix(in srgb, var(--muted) 14%, transparent); font-size: 12px; font-weight: 800; letter-spacing: .04em; }
.vf-etapas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; width: 100%; margin: 10px 0 0; padding: 0; list-style: none; }
.vf-etapas li { position: relative; display: grid; justify-items: center; gap: 6px; font-size: 11.5px; font-weight: 750; color: var(--muted); }
.vf-etapas li::before { content: ""; width: 14px; height: 14px; border-radius: 50%; background: var(--panel-2); border: 2px solid var(--line); z-index: 1; }
.vf-etapas li + li::after { content: ""; position: absolute; top: 7px; right: 50%; width: 100%; height: 2px; background: var(--line); }
.vf-etapas li.feito { color: var(--text); } .vf-etapas li.feito::before { background: #1d9bf0; border-color: #1d9bf0; }
.vf-etapas li.feito + li.feito::after { background: #1d9bf0; }
.vf-etapas li.atual::before { box-shadow: 0 0 0 5px color-mix(in srgb, #1d9bf0 25%, transparent); }
.vf-sec { display: grid; gap: 10px; padding: 16px; border-radius: 18px; background: var(--panel); border: 1px solid var(--line); }
.vf-sec h4 { margin: 0; font-size: 15px; display: flex; align-items: center; gap: 8px; }
.vf-sec h4 b { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; background: #1d9bf0; color: #fff; font-size: 12px; }
.vf-sec > p, .vf-nota { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.5; }
.vf-beneficios { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
.vf-beneficios li { display: flex; gap: 10px; align-items: flex-start; font-size: 14px; line-height: 1.45; }
.vf-beneficios li .i { flex: none; width: 20px; height: 20px; color: #1d9bf0; margin-top: 1px; }
.vf-beneficios li small { display: block; color: var(--muted); font-size: 12.5px; }
.vf-req { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.vf-req li { display: flex; align-items: center; gap: 10px; font-size: 14px; }
.vf-req li .ic { flex: none; width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; background: color-mix(in srgb, #12a150 16%, transparent); color: #12a150; }
.vf-req li.falta .ic { background: color-mix(in srgb, #e5484d 14%, transparent); color: #e5484d; }
.vf-req li .ic svg { width: 14px; height: 14px; }
.vf-req li small { margin-left: auto; color: var(--muted); font-size: 12px; text-align: right; }
.vf-req li a { margin-left: auto; color: var(--accent); font-size: 12.5px; font-weight: 750; text-decoration: none; white-space: nowrap; }
.vf-tipos { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.vf-tipo { display: grid; gap: 2px; justify-items: start; padding: 11px 12px; border-radius: 14px; border: 1.5px solid var(--line); background: var(--bg); color: var(--text); text-align: left; font: inherit; cursor: pointer; }
.vf-tipo .i { width: 18px; height: 18px; color: #1d9bf0; margin-bottom: 4px; }
.vf-tipo b { font-size: 13.5px; } .vf-tipo small { color: var(--muted); font-size: 11.5px; line-height: 1.3; }
.vf-tipo[aria-checked="true"] { border-color: #1d9bf0; background: color-mix(in srgb, #1d9bf0 9%, var(--bg)); box-shadow: 0 0 0 3px color-mix(in srgb, #1d9bf0 15%, transparent); }
.vf .campo { margin: 0; }
.vf-doc { display: grid; gap: 10px; }
.vf-doc-area { position: relative; display: grid; place-items: center; gap: 6px; min-height: 140px; padding: 16px; border-radius: 16px; border: 2px dashed color-mix(in srgb, var(--muted) 45%, transparent); background: var(--bg); color: var(--muted); font-size: 13.5px; text-align: center; cursor: pointer; overflow: hidden; }
.vf-doc-area .i { width: 30px; height: 30px; color: #1d9bf0; }
.vf-doc-area img { width: 100%; max-height: 220px; object-fit: contain; border-radius: 10px; }
.vf-doc-area.com-foto { border-style: solid; border-color: #1d9bf0; padding: 8px; }
.vf-sub { margin: 4px 0 0; font-size: 13px; line-height: 1.45; color: var(--muted); }
.vf-dicas { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; }
.vf-dicas li { position: relative; padding-left: 22px; font-size: 12.5px; line-height: 1.4; color: var(--muted); }
.vf-dicas li::before { content: "✓"; position: absolute; left: 0; top: 0; color: #12a150; font-weight: 900; }
.vf-privado { display: flex; gap: 8px; padding: 10px 12px; border-radius: 12px; background: color-mix(in srgb, #12a150 9%, transparent); color: var(--text); font-size: 12.5px; line-height: 1.45; }
.vf-privado .i { flex: none; width: 16px; height: 16px; color: #12a150; margin-top: 1px; }
.vf-idade { background: color-mix(in srgb, #1d9bf0 7%, var(--panel)); border-color: color-mix(in srgb, #1d9bf0 30%, var(--line)); }
.vf-idade h4 .i { width: 20px; height: 20px; color: #1d9bf0; flex: none; }
.vf-links { display: grid; gap: 8px; }
.vf-links input { width: 100%; box-sizing: border-box; padding: 12px 14px; border: 1px solid var(--line); border-radius: 12px; background: var(--bg); color: var(--text); font: inherit; font-size: 15px; outline: none; }
.vf-links input:focus { border-color: var(--accent); }
.vf-decl { display: flex; gap: 10px; align-items: flex-start; font-size: 13.5px; line-height: 1.45; cursor: pointer; }
.vf-decl input { width: 20px; height: 20px; margin-top: 1px; accent-color: #1d9bf0; flex: none; }
.vf-enviar { width: 100%; min-height: 50px; border: 0; border-radius: 14px; background: #1d9bf0; color: #fff; font: inherit; font-size: 16px; font-weight: 800; cursor: pointer; }
.vf-enviar:disabled { opacity: .5; cursor: default; }
.vf-motivo { padding: 12px 14px; border-radius: 14px; background: color-mix(in srgb, #ec835a 10%, transparent); border: 1px solid color-mix(in srgb, #ec835a 30%, transparent); font-size: 14px; line-height: 1.5; text-align: left; width: 100%; }
.vf-motivo b { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: #ec835a; margin-bottom: 2px; }
.vf-sec-link { background: none; border: 0; padding: 0; color: var(--accent); font: inherit; font-size: 13.5px; font-weight: 750; cursor: pointer; justify-self: start; }
/* explicar o selo */
.vf-explica { display: grid; justify-items: center; gap: 8px; text-align: center; padding: 6px 4px 4px; }
.vf-explica h3 { margin: 6px 0 0; font-size: 18px; }
.vf-explica p { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.55; }
`;
let cssOk = false;
function css() { if (cssOk) return; cssOk = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); }

// Foto do documento (até 1400 px, ~470 KB) e selfie com o documento (até 1000 px, ~360 KB): JPEG. As duas juntas
// cabem no limite de 1 MB do documento do pedido.
async function reduzirDocumento(arquivo, lado = 1400, limite = 470000) {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = url; });
    const esc = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * esc); c.height = Math.round(img.naturalHeight * esc);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    for (const q of [0.82, 0.72, 0.6, 0.5, 0.4]) { const d = c.toDataURL("image/jpeg", q); if (d.length < limite) return d; }
    const c2 = document.createElement("canvas"); c2.width = Math.round(c.width * 0.7); c2.height = Math.round(c.height * 0.7);
    c2.getContext("2d").drawImage(c, 0, 0, c2.width, c2.height);
    return c2.toDataURL("image/jpeg", 0.6);
  } finally { URL.revokeObjectURL(url); }
}

async function lerPedido() {
  const v = await fb.getDoc(fb.doc(fb.db, "verificacoes", eu.uid)).then((s) => (s.exists() ? s.data() : null)).catch(() => null);
  if (v) return v;
  if (dados.verificacaoPedido) return { ...dados.verificacaoPedido, status: dados.solicitacaoVerificacao ? "pendente" : dados.verificacaoPedido.status };
  if (dados.solicitacaoVerificacao) return { status: "pendente", criadoEm: dados.solicitacaoVerificacaoEm };
  return null;
}
async function lerSancao() {
  const s = await fb.getDoc(fb.doc(fb.db, "sancoes", eu.uid)).then((x) => (x.exists() ? x.data() : null)).catch(() => null);
  return s && (s.tipo === "banimento" || ms(s.ate) > Date.now());
}
// Dia em que a pessoa faz 18 anos (0 se o cadastro não tem a data). A equipe confere a idade no documento.
function dia18() {
  const n = String(dados.dataNascimento || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return n ? new Date(+n[1] + IDADE_MIN, +n[2] - 1, +n[3]).getTime() : 0;
}
const menorDeIdade = () => dia18() > Date.now();
function requisitos(sancao) {
  const dias = ms(dados.criadoEm) ? Math.floor((Date.now() - ms(dados.criadoEm)) / DIA) : 999;
  const nome = String(dados.nome || "").trim();
  return [
    { ok: !!eu.emailVerified, texto: "E-mail confirmado", dica: "Confirme pelo link que enviamos", link: "verificar-email.html" },
    { ok: !menorDeIdade(), texto: `Ter ${IDADE_MIN} anos ou mais`, dica: menorDeIdade() ? `A partir de ${dataLonga(new Date(dia18()))}` : "" },
    { ok: !!dados.fotoPerfil, texto: "Foto de perfil", dica: "Uma foto em que dá para ver você ou a sua marca", link: "usuarios.html?acao=editar" },
    { ok: nome.split(/\s+/).length >= 2, texto: "Nome e sobrenome no perfil", dica: "O nome como você é conhecido", link: "usuarios.html?acao=editar" },
    { ok: String(dados.bio || "").trim().length >= 10, texto: "Bio preenchida", dica: "Conte em poucas palavras quem você é", link: "usuarios.html?acao=editar" },
    { ok: dias >= CONTA_MIN_DIAS, texto: `Conta com ${CONTA_MIN_DIAS} dias ou mais`, dica: dias < CONTA_MIN_DIAS ? `Faltam ${CONTA_MIN_DIAS - dias} ${CONTA_MIN_DIAS - dias === 1 ? "dia" : "dias"}` : "" },
    { ok: !sancao, texto: "Conta sem suspensão", dica: "Contas suspensas não podem pedir o selo" }
  ];
}
const ck = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const xx = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M7 7l10 10M17 7L7 17"/></svg>';

export async function abrirVerificacao({ aoMudar } = {}) {
  css();
  criarFolha("folhaVerif", { titulo: "Verificação do perfil", classe: "cheia", corpoClasse: "folha-corpo pad" });
  const corpo = $("c_folhaVerif");
  corpo.replaceChildren(el("div", "lista-vazia", "Carregando..."));
  abrirFolha("folhaVerif");
  const [pedido, sancao] = await Promise.all([lerPedido(), lerSancao()]);
  const box = el("div", "vf");
  corpo.replaceChildren(box);
  const hero = (classe, ic, titulo, texto) => {
    const h = el("div", "vf-hero " + classe);
    const s = el("div", "vf-selo"); s.appendChild(ic === "selo" ? seloGrande() : icone(ic, "i"));
    h.append(s, el("h3", null, titulo), el("p", null, texto));
    box.appendChild(h); return h;
  };
  // ---- verificado
  if (dados.verificado) {
    const h = hero("ok", "selo", "Seu perfil é verificado", `O selo azul aparece ao lado do seu nome em todo o Help Floripa${ms(dados.verificacaoRespondidaEm) ? `, desde ${dataLonga(dados.verificacaoRespondidaEm)}` : ""}.`);
    if (pedido?.categoria) h.appendChild(el("span", "vf-proto", (TIPOS_VERIF.find((t) => t[0] === pedido.categoria) || [])[1] || "Verificado"));
    box.appendChild(secBeneficios());
    const s = el("div", "vf-sec"); s.append(el("h4", null, "Para manter o selo"), el("p", null, "Mantenha o mesmo nome e siga os Termos de Uso. Trocar o nome do perfil, se passar por outra pessoa ou ser suspenso pode fazer a equipe revisar ou tirar o selo."));
    box.appendChild(s);
    return;
  }
  // ---- em análise
  if (pedido?.status === "pendente" || pedido?.status === "em_analise") {
    const h = hero("espera", "relogio", "Pedido em análise", "A equipe está conferindo as suas informações. Você recebe um aviso assim que houver uma decisão.");
    h.appendChild(el("span", "vf-proto", `Protocolo ${protocoloVerif(eu.uid)}`));
    const et = el("ol", "vf-etapas");
    [["Enviado", true], ["Em análise", true], ["Decisão", false]].forEach(([n, f], i) => et.appendChild(el("li", (f ? "feito" : "") + (i === 1 ? " atual" : ""), n)));
    h.appendChild(et);
    if (ms(pedido.criadoEm)) h.appendChild(el("p", null, `Enviado em ${dataLonga(pedido.criadoEm)}. Costuma levar alguns dias.`));
    const s = el("div", "vf-sec");
    const tipo = TIPOS_VERIF.find((t) => t[0] === pedido.categoria);
    s.append(el("h4", null, "O que você enviou"));
    const lista = el("ul", "vf-beneficios");
    if (tipo) lista.appendChild(itemInfo("pessoa-mais", "Tipo de perfil", tipo[1]));
    if (pedido.nomeLegal) lista.appendChild(itemInfo("doc", "Nome no documento", pedido.nomeLegal));
    if (pedido.documentoTipo) lista.appendChild(itemInfo("cadeado", "Documento", (DOCUMENTOS.find((d) => d[0] === pedido.documentoTipo) || [])[1] || pedido.documentoTipo));
    (pedido.links || []).forEach((l) => lista.appendChild(itemInfo("link", "Link", l)));
    if (lista.children.length) s.appendChild(lista);
    const cancelar = el("button", "vf-sec-link", "Cancelar o pedido"); cancelar.type = "button";
    cancelar.addEventListener("click", async () => {
      if (!(await confirmarHF({ titulo: "Cancelar o pedido?", texto: "A equipe para de analisar. Você pode pedir de novo quando quiser.", ok: "Cancelar pedido", cancelar: "Voltar", icone: "alerta" }))) return;
      try {
        await fb.updateDoc(fb.doc(fb.db, "verificacoes", eu.uid), { status: "cancelada", atualizadoEm: fb.serverTimestamp(), documento: fb.deleteField(), selfie: fb.deleteField() }).catch(() => {});
        await fb.setDoc(refUsuario, { solicitacaoVerificacao: false }, { merge: true });
        dados.solicitacaoVerificacao = false;
        toast("Pedido cancelado"); aoMudar?.(); abrirVerificacao({ aoMudar });
      } catch (e) { toast("Não foi possível cancelar: " + erroAmigavel(e)); }
    });
    s.appendChild(cancelar);
    box.appendChild(s);
    return;
  }
  // ---- não aprovado (pode pedir de novo depois de 30 dias)
  let bloqueadoAte = 0;
  if (pedido?.status === "recusada") {
    const h = hero("nao", "alerta", "Pedido não aprovado", "Desta vez não foi possível verificar o seu perfil.");
    if (pedido.motivoRecusa) { const m = el("div", "vf-motivo"); m.append(el("b", null, "Motivo"), document.createTextNode(pedido.motivoRecusa)); h.appendChild(m); }
    bloqueadoAte = Math.max(ms(pedido.analisadaEm) + ESPERA_DIAS * DIA, menorDeIdade() ? dia18() : 0);
    if (bloqueadoAte > Date.now()) h.appendChild(el("p", null, `Você pode pedir de novo a partir de ${dataLonga(new Date(bloqueadoAte))}.`));
  } else {
    hero("", "selo", "Selo de perfil verificado", "O selo azul mostra que o Help Floripa confirmou que o perfil é de quem ele diz ser. Ajuda clientes e amigos a confiarem em você.");
    box.appendChild(secBeneficios());
  }
  // ---- requisitos
  const req = requisitos(sancao);
  const sr = el("div", "vf-sec");
  sr.append(el("h4", null, "Requisitos"), el("p", null, "Conferidos agora, na sua conta."));
  const ul = el("ul", "vf-req");
  req.forEach((r) => {
    const li = el("li", r.ok ? "" : "falta");
    const ic = el("span", "ic"); ic.innerHTML = r.ok ? ck : xx;
    li.append(ic, el("span", null, r.texto));
    if (!r.ok && r.link) { const a = el("a", null, "Resolver"); a.href = r.link; li.appendChild(a); }
    else if (!r.ok && r.dica) li.appendChild(el("small", null, r.dica));
    ul.appendChild(li);
  });
  sr.appendChild(ul);
  box.appendChild(sr);
  const podePedir = req.every((r) => r.ok) && bloqueadoAte <= Date.now();
  if (menorDeIdade()) box.appendChild(avisoIdade());
  if (!podePedir) { if (!menorDeIdade()) box.appendChild(el("p", "vf-nota", bloqueadoAte > Date.now() ? "Enquanto isso, deixe o perfil completo: isso ajuda na próxima análise." : "Quando todos os requisitos estiverem marcados, o pedido aparece aqui.")); return; }
  box.appendChild(formulario(aoMudar));
}

// Menor de 18: explica por que ainda não dá e o que fazer se alguém se passar por ela.
function avisoIdade() {
  const d = el("div", "vf-sec vf-idade");
  const t = el("h4"); t.append(icone("relogio", "i"), document.createTextNode(`A verificação é para maiores de ${IDADE_MIN} anos`));
  d.append(t,
    el("p", null, `Como nas outras redes sociais, o selo é só para quem já tem ${IDADE_MIN} anos, porque a equipe confere um documento de identidade. Você poderá pedir a partir de ${dataLonga(new Date(dia18()))}, e não precisa fazer nada até lá.`),
    el("p", null, "O seu perfil continua normal e protegido: se alguém se passar por você, denuncie o perfil (⋯ → Denunciar → Perfil falso). A equipe remove imitações de qualquer idade."));
  return d;
}
function itemInfo(ic, titulo, valor) { const li = el("li"); li.appendChild(icone(ic, "i")); const t = el("span"); t.append(el("b", null, titulo), el("small", null, valor)); li.appendChild(t); return li; }
function secBeneficios() {
  const s = el("div", "vf-sec");
  s.appendChild(el("h4", null, "O que o selo traz"));
  const ul = el("ul", "vf-beneficios");
  [["selo", "Selo azul ao lado do nome", "No perfil, nas publicações, nos comentários e nas conversas"], ["restringir", "Mais confiança", "Clientes sabem que o perfil é de verdade, não uma cópia"], ["alerta", "Proteção contra imitações", "Perfis que se passarem por você são removidos mais rápido"], ["ajuda", "Atendimento prioritário", "Os seus chamados no suporte são vistos primeiro"]]
    .forEach(([ic, t, d]) => { const li = el("li"); li.appendChild(icone(ic, "i")); const tx = el("span"); tx.append(el("b", null, t), el("small", null, d)); li.appendChild(tx); ul.appendChild(li); });
  s.appendChild(ul);
  s.appendChild(el("p", null, "O selo confirma a identidade. Não é um endosso do Help Floripa ao que o perfil oferece."));
  return s;
}

function formulario(aoMudar) {
  const f = el("div", "vf");
  const est = { categoria: "", documentoTipo: "rg", documento: "", selfie: "" };
  // 1) tipo
  const s1 = el("div", "vf-sec");
  const t1 = el("h4"); t1.append(el("b", null, "1"), document.createTextNode("Que tipo de perfil é?"));
  const tipos = el("div", "vf-tipos"); tipos.setAttribute("role", "radiogroup");
  TIPOS_VERIF.forEach(([v, n, d, ic]) => {
    const b = el("button", "vf-tipo"); b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", "false");
    b.append(icone(ic, "i"), el("b", null, n), el("small", null, d));
    b.addEventListener("click", () => { est.categoria = v; tipos.querySelectorAll(".vf-tipo").forEach((x) => x.setAttribute("aria-checked", String(x === b))); if ((v === "negocio" || v === "organizacao") && est.documentoTipo !== "cnpj" && !est.documento) { selDoc.value = "cnpj"; est.documentoTipo = "cnpj"; } conferir(); });
    tipos.appendChild(b);
  });
  s1.append(t1, tipos);
  // 2) identidade
  const s2 = el("div", "vf-sec");
  const t2 = el("h4"); t2.append(el("b", null, "2"), document.createTextNode("Quem é você"));
  const campo = (rot, inp, ajuda) => { const c = el("div", "campo"); const l = el("label", null, rot); inp.id = "vf" + Math.random().toString(36).slice(2, 7); l.htmlFor = inp.id; c.append(l, inp); if (ajuda) c.appendChild(el("div", "ajuda", ajuda)); return c; };
  const nomeLegal = el("input"); nomeLegal.maxLength = 120; nomeLegal.autocomplete = "name"; nomeLegal.placeholder = "Igual ao documento";
  const conhecido = el("input"); conhecido.maxLength = 80; conhecido.value = dados.nome || "";
  s2.append(t2, campo("Nome completo (ou razão social)", nomeLegal, "Só a equipe vê. Precisa ser igual ao do documento."), campo("Nome como você é conhecido", conhecido, "Como aparece no perfil."));
  // 3) documento
  const s3 = el("div", "vf-sec vf-doc");
  const t3 = el("h4"); t3.append(el("b", null, "3"), document.createTextNode("Documento com foto e selfie"));
  const selDoc = el("select"); DOCUMENTOS.forEach(([v, n]) => selDoc.appendChild(new Option(n, v))); selDoc.setAttribute("aria-label", "Tipo de documento");
  // A foto (e a selfie, que mostra o mesmo documento) são do tipo escolhido antes: trocar o tipo tira as duas, senão a
  // equipe veria "CNH" com a foto de um RG.
  selDoc.addEventListener("change", async () => {
    const novo = selDoc.value;
    if (novo === est.documentoTipo) return;
    if (est.documento || est.selfie) {
      const nome = (k) => (DOCUMENTOS.find((d) => d[0] === k) || [])[1] || k;
      selDoc.value = est.documentoTipo;
      const ok = await confirmarHF({ titulo: "Trocar o documento?", texto: "A foto do documento e a selfie saem. Depois é só enviar as do novo.", troca: { de: nome(est.documentoTipo), para: nome(novo), rotDe: "Atual", rotPara: "Novo" }, ok: "Trocar documento", cancelar: `Manter ${nome(est.documentoTipo).replace(/ \(.*\)$/, "")}`, cor: "normal", icone: "alerta" });
      if (!ok) return;
      est.documento = ""; est.selfie = ""; pintarArea(); pintarSelfie();
      selDoc.value = novo;
    }
    est.documentoTipo = novo; conferir();
  });
  const area = el("button", "vf-doc-area"); area.type = "button";
  const pintarArea = () => {
    area.replaceChildren(); area.classList.toggle("com-foto", !!est.documento);
    if (est.documento) { const im = el("img"); im.src = est.documento; im.alt = "Foto do documento"; area.append(im, el("span", null, "Toque para trocar a foto")); }
    else area.append(icone("camera", "i"), el("b", null, "Enviar foto do documento"), el("span", null, "A frente do documento, inteira, com boa luz e sem reflexo."));
  };
  const inp = el("input"); inp.type = "file"; inp.accept = "image/*"; inp.hidden = true;
  area.addEventListener("click", () => inp.click());
  inp.addEventListener("change", async () => {
    const a = inp.files?.[0]; inp.value = ""; if (!a) return;
    try { area.replaceChildren(el("span", null, "Preparando a foto...")); est.documento = await reduzirDocumento(a); } catch { toast("Não foi possível usar essa foto. Tente outra."); }
    pintarArea(); conferir();
  });
  pintarArea();
  // Selfie segurando o documento: prova que quem pede é a pessoa do documento (como fazem bancos, apps de entrega e marketplaces).
  const areaS = el("button", "vf-doc-area vf-selfie"); areaS.type = "button";
  const pintarSelfie = () => {
    areaS.replaceChildren(); areaS.classList.toggle("com-foto", !!est.selfie);
    if (est.selfie) { const im = el("img"); im.src = est.selfie; im.alt = "Selfie com o documento"; areaS.append(im, el("span", null, "Toque para tirar outra")); }
    else areaS.append(icone("camera", "i"), el("b", null, "Tirar selfie segurando o documento"), el("span", null, "O seu rosto e o documento aparecendo inteiros na mesma foto."));
  };
  const inpS = el("input"); inpS.type = "file"; inpS.accept = "image/*"; inpS.setAttribute("capture", "user"); inpS.hidden = true;
  areaS.addEventListener("click", () => inpS.click());
  inpS.addEventListener("change", async () => {
    const a = inpS.files?.[0]; inpS.value = ""; if (!a) return;
    try { areaS.replaceChildren(el("span", null, "Preparando a foto...")); est.selfie = await reduzirDocumento(a, 1000, 360000); } catch { toast("Não foi possível usar essa foto. Tente outra."); }
    pintarSelfie(); conferir();
  });
  pintarSelfie();
  const dicas = el("ul", "vf-dicas");
  ["Rosto inteiro, de frente, sem óculos escuros, boné ou máscara", "Segure o documento ao lado do rosto, com a foto dele à mostra", "Lugar claro, sem filtro e sem editar a foto"].forEach((t) => dicas.appendChild(el("li", null, t)));
  const priv = el("div", "vf-privado"); priv.append(icone("cadeado", "i"), el("span", null, "A foto do documento e a selfie só são vistas pela moderação do Help Floripa e são apagadas assim que o pedido é analisado."));
  s3.append(t3, campo("Tipo de documento", selDoc), area, inp, el("p", "vf-sub", "Agora uma selfie segurando o mesmo documento. É ela que mostra que o perfil é seu de verdade."), areaS, inpS, dicas, priv);
  // 4) links e motivo
  const s4 = el("div", "vf-sec");
  const t4 = el("h4"); t4.append(el("b", null, "4"), document.createTextNode("Mostre que é você (opcional)"));
  const links = el("div", "vf-links");
  const ls = [0, 1, 2].map((i) => { const x = el("input"); x.type = "url"; x.inputMode = "url"; x.maxLength = 200; x.placeholder = ["Instagram, Facebook ou TikTok", "Site ou Google Meu Negócio", "Notícia ou outro perfil"][i]; links.appendChild(x); return x; });
  const motivo = el("textarea"); motivo.maxLength = 500; motivo.placeholder = "Ex.: tenho uma loja no centro há 5 anos e já encontrei perfis falsos com o meu nome.";
  s4.append(t4, el("p", null, "Links de outros perfis seus, do seu site ou de notícias ajudam a equipe a confirmar."), links, campo("Por que o seu perfil deve ser verificado?", motivo));
  // envio
  const decl = el("label", "vf-decl"); const ckb = el("input"); ckb.type = "checkbox";
  decl.append(ckb, el("span", null, "Declaro que as informações são verdadeiras e que o documento é meu (ou da empresa que eu represento). Informação falsa leva à recusa e pode levar à suspensão da conta."));
  const enviar = el("button", "vf-enviar", "Enviar pedido de verificação"); enviar.type = "button";
  function conferir() { enviar.disabled = !(est.categoria && nomeLegal.value.trim().length >= 5 && est.documento && est.selfie && ckb.checked); }
  [nomeLegal, ckb].forEach((x) => x.addEventListener("input", conferir)); ckb.addEventListener("change", conferir);
  conferir();
  enviar.addEventListener("click", async () => {
    enviar.disabled = true; enviar.textContent = "Enviando...";
    const pedido = {
      uid: eu.uid, categoria: est.categoria, nomeLegal: nomeLegal.value.trim().slice(0, 120), conhecidoComo: conhecido.value.trim().slice(0, 80),
      documentoTipo: est.documentoTipo, links: ls.map((x) => x.value.trim()).filter((x) => /^https?:\/\/\S+$/i.test(x) || /^[\w.-]+\.[a-z]{2,}\S*$/i.test(x)).map((x) => (/^https?:/i.test(x) ? x : "https://" + x).slice(0, 200)).slice(0, 3),
      motivo: motivo.value.trim().slice(0, 500), status: "pendente", criadoEm: fb.serverTimestamp(), atualizadoEm: fb.serverTimestamp()
    };
    try {
      try {
        await fb.setDoc(fb.doc(fb.db, "verificacoes", eu.uid), { ...pedido, documento: est.documento, selfie: est.selfie });
      } catch (e) {
        if (e?.code !== "permission-denied") throw e;
        // Regras antigas: o pedido vai sem as fotos (a equipe pede depois, se precisar).
        await fb.setDoc(refUsuario, { verificacaoPedido: { ...pedido, criadoEm: new Date(), atualizadoEm: new Date(), semDocumento: true } }, { merge: true });
      }
      await fb.setDoc(refUsuario, { solicitacaoVerificacao: true, solicitacaoVerificacaoEm: fb.serverTimestamp() }, { merge: true });
      dados.solicitacaoVerificacao = true; dados.solicitacaoVerificacaoEm = { toMillis: () => Date.now() };
      toast("Pedido enviado. Você recebe um aviso quando a equipe decidir.");
      aoMudar?.(); abrirVerificacao({ aoMudar });
    } catch (e) { toast("Não foi possível enviar: " + erroAmigavel(e)); enviar.disabled = false; enviar.textContent = "Enviar pedido de verificação"; }
  });
  f.append(s1, s2, s3, s4, decl, enviar);
  return f;
}

// Tocar no selo de um perfil: o que ele quer dizer.
export function explicarSelo(nome = "") {
  css();
  criarFolha("folhaSelo", { titulo: "Perfil verificado", corpoClasse: "folha-corpo pad" });
  const corpo = $("c_folhaSelo");
  const b = el("div", "vf-explica");
  const s = el("div", "vf-selo"); s.appendChild(seloGrande());
  b.append(s, el("h3", null, nome ? `${nome} é verificado` : "Perfil verificado"),
    el("p", null, "A equipe do Help Floripa confirmou que este perfil pertence a quem ele representa, com documento e informações conferidas."),
    el("p", null, "O selo não é um endosso do Help Floripa. Combine sempre pelo chat do site e desconfie de pagamentos adiantados."));
  if (eu && !dados.verificado) { const a = el("button", "vf-enviar", "Quero verificar o meu perfil"); a.type = "button"; a.style.marginTop = "8px"; a.addEventListener("click", () => { fecharFolha("folhaSelo"); abrirVerificacao(); }); b.appendChild(a); }
  corpo.replaceChildren(b);
  abrirFolha("folhaSelo");
}
