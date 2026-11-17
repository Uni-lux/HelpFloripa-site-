// =====================================================
// Rede de Help (17/11/2026, pedido dele: "o botão de SOS vira o Help; conecte as pessoas e a rede que a pessoa usa para
// chamar quando estiver em perigo, e como vai alertar"). Sem dependências: o Social e a página de alertas usam.
// Guardado em usuarios/{uid}.help (o dono grava a própria conta; sem regra nova):
//   social     [uids] = quem do Social recebe no Mensagens (null = todo o Social aceito)
//   contatos   [{nome, tel}] até 5 = gente de FORA do app (mãe, vizinho...): recebe por WhatsApp/SMS com o mapa
//   whats, sms = como avisar os contatos de fora (o navegador não envia sozinho: abre o WhatsApp/SMS pronto, 1 toque)
//   ligar      "" | "190" | "192" | "193" | "c0" (1º contato) = ligar depois de enviar
//   perto      depois | agora | nao  = quem está perto (se ninguém do Social aceitar em 3 min / na hora / não)
//   equipe     avisar a equipe de segurança do Help Floripa como urgente
//   rapido     segurar o botão Help envia sozinho (com 5 s para cancelar), tipo = tipoRapido
//   msg        recado pronto que vai junto (até 200)
// =====================================================
export const HELP_PADRAO = { social: null, contatos: [], whats: true, sms: true, ligar: "", perto: "depois", equipe: true, rapido: true, tipoRapido: "seguranca", msg: "", ficha: null };
// Parentesco de cada contato de fora (17/11/2026) e ficha de emergência: usuarios.help.ficha {sangue, alergias, condicoes,
// remedios, incluir} — com "incluir", vai junto na mensagem do Help (quem socorre precisa saber).
export const PARENTESCOS = ["Mãe", "Pai", "Irmão(ã)", "Cônjuge", "Filho(a)", "Amigo(a)", "Vizinho(a)", "Outro"];
export const SANGUE = ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"];
const FICHA_VAZIA = { sangue: "", alergias: "", condicoes: "", remedios: "", incluir: true };
export const MAX_CONTATOS = 5;
export const TIPOS_RAPIDO = { seguranca: "Estou em perigo", violencia: "Violência ou ameaça", saude: "Mal-estar ou saúde", acidente: "Acidente" };
export const LIGAR = { "": "Não ligar", "190": "190 · Polícia", "192": "192 · SAMU", "193": "193 · Bombeiros" };

export function lerHelp(dados) {
  const h = { ...HELP_PADRAO, ...((dados && dados.help) || {}) };
  h.contatos = (Array.isArray(h.contatos) ? h.contatos : []).filter((c) => c && telOk(c.tel)).slice(0, MAX_CONTATOS);
  if (!Array.isArray(h.social)) h.social = null;
  if (!["depois", "agora", "nao"].includes(h.perto)) h.perto = "depois";
  if (!TIPOS_RAPIDO[h.tipoRapido]) h.tipoRapido = "seguranca";
  h.ficha = { ...FICHA_VAZIA, ...(h.ficha && typeof h.ficha === "object" ? h.ficha : {}) };
  if (!SANGUE.includes(h.ficha.sangue)) h.ficha.sangue = "";
  return h;
}
export async function salvarHelp(fb, uid, h) {
  const limpo = {
    social: Array.isArray(h.social) ? h.social.slice(0, 30) : null,
    contatos: (h.contatos || []).slice(0, MAX_CONTATOS).map((c) => ({ nome: String(c.nome || "").trim().slice(0, 40), tel: soNumeros(c.tel), ...(PARENTESCOS.includes(c.rel) ? { rel: c.rel } : {}) })),
    whats: !!h.whats, sms: !!h.sms, ligar: String(h.ligar || "").slice(0, 3), perto: h.perto, equipe: h.equipe !== false,
    rapido: !!h.rapido, tipoRapido: h.tipoRapido, msg: String(h.msg || "").trim().slice(0, 200),
    ficha: {
      sangue: SANGUE.includes(h.ficha?.sangue) ? h.ficha.sangue : "", alergias: String(h.ficha?.alergias || "").trim().slice(0, 80),
      condicoes: String(h.ficha?.condicoes || "").trim().slice(0, 80), remedios: String(h.ficha?.remedios || "").trim().slice(0, 80), incluir: h.ficha?.incluir !== false
    }
  };
  await fb.setDoc(fb.doc(fb.db, "usuarios", uid), { help: limpo }, { merge: true });
  return limpo;
}
// Quem do Social recebe: a escolha (só quem ainda está no Social) ou todos.
export const avisadosDe = (h, socialUids) => (Array.isArray(h.social) ? socialUids.filter((u) => h.social.includes(u)) : socialUids).slice(0, 30);

export const soNumeros = (t) => String(t || "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "").slice(0, 11);
export const telOk = (t) => /^\d{10,11}$/.test(soNumeros(t));
export function formatarTel(t) {
  const n = soNumeros(t);
  if (n.length < 3) return n;
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}
const mapa = (lat, lng) => `https://maps.google.com/?q=${lat},${lng}`;
// Texto que chega aos contatos de fora. Sem emoji (pedido dele em outras telas).
export function textoFicha(f) {
  if (!f || f.incluir === false) return "";
  return [f.sangue ? `Tipo sanguíneo ${f.sangue}` : "", f.alergias ? `Alergias: ${f.alergias}` : "", f.condicoes ? `Saúde: ${f.condicoes}` : "", f.remedios ? `Remédios: ${f.remedios}` : ""].filter(Boolean).join(" · ");
}
export function textoHelp({ nome, tipo, msg, lat, lng, precisao, id, ficha }) {
  const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return [
    `HELP · ${nome || "Alguém"} pediu ajuda pelo Help Floripa às ${hora}.`,
    tipo ? `O que está acontecendo: ${tipo}.` : "",
    msg ? `Recado: ${msg}` : "",
    textoFicha(ficha) ? `Ficha de emergência: ${textoFicha(ficha)}` : "",
    Number.isFinite(lat) ? `Onde está agora: ${mapa(lat, lng)}${precisao ? ` (precisão de ${precisao} m)` : ""}` : "",
    id ? `Acompanhar (com conta): https://helpfloripa.com.br/alertas.html?sos=${id}` : "",
    "Se for grave, ligue 190 (Polícia), 192 (SAMU) ou 193 (Bombeiros)."
  ].filter(Boolean).join("\n");
}
export const textoTudoBem = (nome) => `${nome || "Eu"}: estou bem agora. Obrigado por estar na minha rede de Help. (Help Floripa)`;
export const linkWhats = (tel, texto) => `https://wa.me/55${soNumeros(tel)}?text=${encodeURIComponent(texto)}`;
export function linkSms(tels, texto) {
  const nums = (Array.isArray(tels) ? tels : [tels]).map((t) => "+55" + soNumeros(t)).join(",");
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent || "");
  return `sms:${nums}${ios ? "&" : "?"}body=${encodeURIComponent(texto)}`;
}
export function numeroLigar(h) {
  if (!h.ligar) return "";
  if (h.ligar === "c0") return h.contatos[0] ? soNumeros(h.contatos[0].tel) : "";
  return /^\d{3}$/.test(h.ligar) ? h.ligar : "";
}
export function resumoHelp(h, nSocial) {
  const s = Array.isArray(h.social) ? avisadosDe(h, h.social).length : nSocial;
  const partes = [`${s} do Social`];
  if (h.contatos.length) partes.push(`${h.contatos.length} ${h.contatos.length === 1 ? "contato" : "contatos"}`);
  return partes.join(" · ");
}

// ---------------- botões "avisar fora do app" (usados depois de enviar o Help e no "estou bem") ----------------
// Devolve um bloco com 1 botão de WhatsApp por contato + SMS para todos + ligar. O toque da pessoa abre cada app.
export function blocoAvisarFora(h, texto, { ligar = true, titulo = "Avisar quem está fora do app" } = {}) {
  css();
  const box = el("div", "hp-fora");
  if (!h.contatos.length && !(ligar && numeroLigar(h))) return null;
  box.appendChild(el("b", "hp-fora-t", titulo));
  if (h.contatos.length) box.appendChild(el("small", "hp-fora-s", "O celular não deixa enviar sozinho: toque em cada um para mandar a mensagem pronta com a sua localização."));
  const lista = el("div", "hp-fora-l");
  if (h.whats) h.contatos.forEach((c, i) => {
    const a = el("a", "hp-fora-b"); a.href = linkWhats(c.tel, texto); a.target = "_blank"; a.rel = "noopener"; a.dataset.contato = String(i);
    a.append(svg(IC.whats), el("span", null, `WhatsApp · ${c.nome || formatarTel(c.tel)}`));
    a.addEventListener("click", () => a.classList.add("feito"));
    lista.appendChild(a);
  });
  if (h.sms && h.contatos.length) {
    const a = el("a", "hp-fora-b"); a.href = linkSms(h.contatos.map((c) => c.tel), texto); a.dataset.sms = "";
    a.append(svg(IC.sms), el("span", null, h.contatos.length > 1 ? `SMS para os ${h.contatos.length} contatos` : `SMS · ${h.contatos[0].nome || "contato"}`));
    a.addEventListener("click", () => a.classList.add("feito"));
    lista.appendChild(a);
  }
  const n = ligar ? numeroLigar(h) : "";
  if (n) { const a = el("a", "hp-fora-b ligar"); a.href = `tel:${n}`; a.append(svg(IC.tel), el("span", null, `Ligar para ${h.ligar === "c0" ? h.contatos[0].nome || formatarTel(n) : LIGAR[n] || n}`)); lista.appendChild(a); }
  box.appendChild(lista);
  return box;
}

// ---------------- tela de configuração ----------------
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const svg = (d) => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true"); s.innerHTML = d; return s; };
const IC = {
  fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
  whats: '<path d="M4.5 19.5l1.2-3.6A8 8 0 1112 20a8 8 0 01-3.9-1z"/><path d="M9.2 8.6c.2-.5.6-.5.9-.5l.6 1.4-.6.8a5 5 0 002.6 2.6l.8-.6 1.4.6c0 .3 0 .7-.5.9-1.6.8-6-3.5-5.2-5.2z"/>',
  sms: '<path d="M4 5.5h16v10.5H9l-5 4z"/><path d="M8 10h8M8 13h5"/>',
  tel: '<path d="M5 4.5h3.5l1.6 4-2.2 1.4a11 11 0 005.2 5.2l1.4-2.2 4 1.6V18a2 2 0 01-2 2A15.5 15.5 0 013 6.5a2 2 0 012-2z"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  lixo: '<path d="M5 7h14M10 11v6M14 11v6M6.5 7l1 12.5h9l1-12.5M9.5 7V4.5h5V7"/>',
  escudo: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>'
};
let estilo = false;
function css() {
  if (estilo) return; estilo = true;
  const s = document.createElement("style");
  s.textContent = `
.hp-fundo{position:fixed;inset:0;z-index:5300;display:flex;align-items:flex-end;justify-content:center;background:var(--overlay,rgba(0,0,0,.6))}
.hp{width:min(480px,100%);max-height:92dvh;display:flex;flex-direction:column;background:var(--panel,#0f161b);color:var(--text,#fff);border-radius:22px 22px 0 0;overflow:hidden;animation:hpSobe .26s cubic-bezier(.2,.9,.2,1)}
@keyframes hpSobe{from{transform:translateY(40px);opacity:.5}}
@media (min-width:700px){.hp-fundo{align-items:center}.hp{border-radius:22px}}
.hp svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;flex:none}
.hp-topo{display:flex;align-items:center;gap:10px;padding:12px 10px 12px 18px;border-bottom:1px solid var(--line,rgba(255,255,255,.1))}
.hp-topo h3{flex:1;margin:0;font-size:16px}
.hp-x{width:38px;height:38px;border:0;border-radius:50%;display:grid;place-items:center;background:none;color:var(--text,#fff);cursor:pointer}
.hp-corpo{overflow-y:auto;padding:4px 0 8px}
.hp-res{display:flex;align-items:center;gap:12px;margin:14px 16px 4px;padding:14px;border-radius:16px;background:var(--panel-2,#182029);border:1px solid var(--line,rgba(255,255,255,.1))}
.hp-res > svg{width:26px;height:26px;color:var(--text,#fff)}
.hp-res b{display:block;font-size:14.5px}
.hp-res small{display:block;margin-top:2px;font-size:12px;color:var(--muted,#9aa7b4);line-height:1.4}
.hp-sec{padding:14px 16px 2px}
.hp-sec > h4{margin:0 4px 8px;font-size:11.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted,#9aa7b4)}
.hp-lista{border-radius:16px;border:1px solid var(--line,rgba(255,255,255,.1));background:var(--panel-2,#182029);overflow:hidden}
.hp-l{display:flex;align-items:center;gap:12px;min-height:52px;padding:8px 14px;width:100%;border:0;background:none;color:inherit;font:inherit;text-align:left}
.hp-l + .hp-l{border-top:1px solid var(--line,rgba(255,255,255,.1))}
.hp-l .tx{flex:1;min-width:0;display:grid;gap:2px}
.hp-l .tx b{font-size:14px;font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hp-l .tx small{font-size:12px;color:var(--muted,#9aa7b4)}
.hp-av{width:36px;height:36px;border-radius:50%;overflow:hidden;display:grid;place-items:center;flex:none;background:var(--panel,#0f161b);font-weight:800;font-size:13px}
.hp-av img{width:100%;height:100%;object-fit:cover}
.hp-ck{flex:none;width:22px;height:22px;border-radius:7px;border:2px solid color-mix(in srgb,var(--muted,#9aa7b4) 70%,transparent);display:grid;place-items:center;color:transparent}
.hp-l.on .hp-ck{background:var(--accent,#00adee);border-color:var(--accent,#00adee);color:#fff}
.hp-ck svg{width:14px;height:14px;stroke-width:2.6}
.hp-l.sel{cursor:pointer}
.hp-del{flex:none;width:34px;height:34px;border:0;border-radius:50%;background:none;color:var(--muted,#9aa7b4);display:grid;place-items:center;cursor:pointer}
.hp-add{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr) 44px;gap:8px;padding:10px}
.hp-add input{min-width:0;height:42px;padding:0 12px;border-radius:12px;border:1px solid var(--line,rgba(255,255,255,.12));background:var(--panel,#0f161b);color:var(--text,#fff);font:inherit;font-size:14px}
.hp-add button{height:42px;border:0;border-radius:12px;background:var(--text,#fff);color:var(--panel,#0f161b);display:grid;place-items:center;cursor:pointer}
.hp-add button:disabled{opacity:.35}
.hp-seg{display:grid;grid-template-columns:repeat(var(--n,3),minmax(0,1fr));gap:4px;padding:4px;border-radius:14px;background:var(--panel-2,#182029);border:1px solid var(--line,rgba(255,255,255,.1))}
.hp-seg button{min-height:40px;padding:4px 6px;border:0;border-radius:11px;background:none;color:var(--muted,#9aa7b4);font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;line-height:1.2}
.hp-seg button[aria-pressed="true"]{background:var(--panel,#0f161b);color:var(--text,#fff);box-shadow:0 1px 4px rgba(0,0,0,.25)}
.hp-chave{position:relative;width:46px;height:28px;flex:none}
.hp-chave input{position:absolute;opacity:0;width:0;height:0}
.hp-chave span{position:absolute;inset:0;border-radius:99px;background:color-mix(in srgb,var(--muted,#9aa7b4) 45%,transparent);transition:background .2s}
.hp-chave span::after{content:"";position:absolute;left:3px;top:3px;width:22px;height:22px;border-radius:50%;background:#fff;transition:transform .2s}
.hp-chave input:checked + span{background:var(--accent,#00adee)}
.hp-chave input:checked + span::after{transform:translateX(18px)}
.hp-sel{flex:none;max-width:48%;height:36px;padding:0 8px;border-radius:10px;border:1px solid var(--line,rgba(255,255,255,.12));background:var(--panel,#0f161b);color:var(--text,#fff);font:inherit;font-size:13px}
.hp-msg{width:100%;min-height:76px;padding:10px 12px;border-radius:14px;border:1px solid var(--line,rgba(255,255,255,.12));background:var(--panel-2,#182029);color:var(--text,#fff);font:inherit;font-size:14px;resize:vertical}
.hp-prev{margin:0;padding:12px 14px;border-radius:14px;border:1px dashed var(--line,rgba(255,255,255,.15));font-size:12.5px;line-height:1.5;color:var(--muted,#9aa7b4);white-space:pre-wrap;overflow-wrap:anywhere}
.hp-nota{margin:8px 4px 0;font-size:12px;line-height:1.45;color:var(--muted,#9aa7b4)}
.hp-pe{padding:12px 16px calc(14px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--line,rgba(255,255,255,.1))}
.hp-salvar{width:100%;height:48px;border:0;border-radius:14px;background:var(--accent,#00adee);color:#001a24;font:inherit;font-size:15px;font-weight:800;cursor:pointer}
.hp-salvar:disabled{opacity:.6}
.hp-fora{display:grid;gap:8px;padding:14px;border-radius:16px;background:var(--panel-2,#182029);border:1px solid var(--line,rgba(255,255,255,.12))}
.hp-fora-t{font-size:14px}
.hp-fora-s{font-size:12px;line-height:1.4;color:var(--muted,#9aa7b4)}
.hp-fora-l{display:grid;gap:6px}
.hp-fora-b{display:flex;align-items:center;gap:10px;min-height:46px;padding:0 14px;border-radius:12px;border:1px solid var(--line,rgba(255,255,255,.14));background:var(--panel,#0f161b);color:var(--text,#fff);text-decoration:none;font-size:14px;font-weight:700}
.hp-fora-b svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.hp-fora-b.feito{opacity:.55}
.hp-fora-b.feito::after{content:"enviado";margin-left:auto;font-size:11px;font-weight:700;color:var(--muted,#9aa7b4)}
.hp-fora-b.ligar{border-color:color-mix(in srgb,#e5484d 60%,transparent);color:#ff6b6f}
`;
  document.head.appendChild(s);
}

/**
 * Abre "Rede de Help" (17/11/2026, refeita a pedido dele: "estamos mexendo com vidas"). Sem listas do celular: tudo em
 * cartões de escolha. Partes: situação da rede (o que falta), quem recebe (Social + contatos de fora com parentesco),
 * como avisar, se ninguém responder, Help rápido, ficha de emergência, recado e a prévia de como chega.
 * Fechar com algo mudado pergunta antes.
 * op: { fb, uid, dados (a conta), social: [{uid, nome, foto, papel}], toast, aoSalvar(h), confirmar? }
 */
export function abrirConfigHelp(op) {
  css(); css2();
  const { fb, uid, toast } = op;
  const h = lerHelp(op.dados);
  const social = op.social || [];
  const marcados = new Set(Array.isArray(h.social) ? h.social : social.map((p) => p.uid));
  let contatos = h.contatos.map((c) => ({ ...c }));
  const ficha = { ...h.ficha };
  document.querySelectorAll(".hp-fundo").forEach((x) => x.remove());
  const fundo = el("div", "hp-fundo");
  const c = el("div", "hp hp2"); c.setAttribute("role", "dialog"); c.setAttribute("aria-modal", "true"); c.setAttribute("aria-label", "Rede de Help");
  fundo.appendChild(c);
  document.documentElement.classList.add("hp-travado");
  const sair = () => { fundo.remove(); document.removeEventListener("keydown", tecla); if (!document.querySelector(".hp-fundo")) document.documentElement.classList.remove("hp-travado"); };
  const foto = () => JSON.stringify([h, [...marcados].sort(), contatos, ficha]);
  let inicial = "", perguntando = false;
  const tentarSair = async () => {
    if (perguntando) return;
    if (inicial && foto() !== inicial) {
      perguntando = true;
      let ok = true;
      try { const { confirmarHF } = await import("./confirmar.js?v=6"); ok = await confirmarHF({ titulo: "Sair sem salvar?", texto: "As mudanças na sua Rede de Help não serão guardadas.", ok: "Sair sem salvar", cancelar: "Continuar editando", icone: "alerta" }); } catch {}
      perguntando = false;
      if (!ok) return;
    }
    sair();
  };
  const tecla = (e) => { if (e.key === "Escape" && !document.querySelector(".hf-confirma-fundo")) tentarSair(); };
  document.addEventListener("keydown", tecla);
  fundo.addEventListener("click", (e) => { if (e.target === fundo) tentarSair(); });

  const topo = el("div", "hp-topo");
  const tt = el("div", "hp-tt"); tt.append(el("h3", null, "Rede de Help"), el("small", null, "Quem é avisado e como, quando você pede ajuda"));
  const x = el("button", "hp-x"); x.type = "button"; x.dataset.fechar = ""; x.setAttribute("aria-label", "Fechar"); x.appendChild(svg(IC.fechar)); x.addEventListener("click", tentarSair);
  topo.append(tt, x);
  const corpo = el("div", "hp-corpo");

  // ---- situação da rede: o que já está pronto e o que falta ----
  const st = el("div", "hp-status");
  const anel = el("div", "hp-anel"); const anelN = el("b"); anel.appendChild(anelN);
  const stTx = el("div", "hp-st-tx"); const stT = el("b"); const stS = el("small"); stTx.append(stT, stS);
  const stLista = el("div", "hp-st-lista");
  st.append(anel, stTx, stLista);
  corpo.appendChild(st);
  const secoes = {};
  const pintarStatus = () => {
    const itens = [
      ["social", "Alguém do Social", marcados.size > 0],
      ["fora", "Contato fora do app", contatos.length > 0],
      ["ficha", "Ficha de emergência", !!(ficha.sangue || ficha.alergias || ficha.condicoes || ficha.remedios)],
      ["rapido", "Help rápido ligado", !!h.rapido]
    ];
    const feitos = itens.filter((i) => i[2]).length;
    anel.style.setProperty("--p", String(feitos / itens.length));
    anelN.textContent = `${feitos}/${itens.length}`;
    stT.textContent = feitos === itens.length ? "Sua rede está pronta" : feitos >= 2 ? "Falta pouco" : "Monte a sua rede";
    stS.textContent = `${marcados.size} do Social · ${contatos.length} ${contatos.length === 1 ? "contato" : "contatos"} de fora`;
    stLista.replaceChildren(...itens.map(([k, n, ok]) => {
      const b = el("button", "hp-st-i" + (ok ? " ok" : "")); b.type = "button";
      b.append(svg(ok ? IC.check : IC.mais), el("span", null, n));
      b.addEventListener("click", () => secoes[k]?.scrollIntoView({ behavior: "smooth", block: "start" }));
      return b;
    }));
  };
  const secao = (titulo, sub, chave) => {
    const sc = el("section", "hp-sec"); const cab = el("div", "hp-sec-cab");
    cab.appendChild(el("h4", null, titulo)); if (sub) cab.appendChild(el("p", null, sub));
    sc.appendChild(cab); corpo.appendChild(sc); if (chave) secoes[chave] = sc; return sc;
  };
  const caixa = (sc) => { const l = el("div", "hp-lista"); sc.appendChild(l); return l; };
  // cartões de escolha (no lugar das listas do celular)
  const escolha = (lista, atual, aoMudar, colunas, id) => {
    const g = el("div", "hp-esc"); g.style.setProperty("--n", String(colunas)); g.setAttribute("role", "radiogroup"); if (id) g.id = id;
    const pintar = (v) => g.querySelectorAll("button").forEach((b) => { const on = b.dataset.v === v; b.setAttribute("aria-checked", String(on)); });
    lista.forEach(([v, t, sub]) => {
      const b = el("button", "hp-op"); b.type = "button"; b.dataset.v = v; b.setAttribute("role", "radio");
      b.appendChild(el("b", null, t)); if (sub) b.appendChild(el("small", null, sub));
      b.addEventListener("click", () => { aoMudar(v); pintar(v); pintarStatus(); });
      g.appendChild(b);
    });
    pintar(atual); g.pintar = pintar; return g;
  };
  const chave = (lista, txt, sub, val, id, aoMudar) => {
    const r = el("label", "hp-l"); const tx = el("span", "tx"); tx.append(el("b", null, txt)); if (sub) tx.appendChild(el("small", null, sub));
    const ch = el("span", "hp-chave"); const i = el("input"); i.type = "checkbox"; i.checked = val; i.id = id; ch.append(i, el("span"));
    i.addEventListener("change", () => { aoMudar(i.checked); pintarStatus(); });
    r.append(tx, ch); lista.appendChild(r); return i;
  };

  // ---- 1) quem recebe ----
  const s1 = secao("Quem recebe o seu Help", "Pessoas do seu Social recebem no Mensagens. Contatos de fora recebem por WhatsApp ou SMS.", "social");
  const subSoc = el("div", "hp-sub"); subSoc.append(el("span", null, "No Help Floripa"));
  const todosBt = el("button", "hp-link"); todosBt.type = "button";
  subSoc.appendChild(todosBt); s1.appendChild(subSoc);
  const l1 = caixa(s1);
  const pintarTodos = () => { todosBt.hidden = !social.length; todosBt.textContent = marcados.size === social.length ? "Desmarcar todos" : "Marcar todos"; };
  const pintarSocial = () => {
    l1.replaceChildren();
    if (!social.length) { const v = el("div", "hp-vazio"); v.append(el("b", null, "Ninguém no seu Social ainda"), el("span", null, "Adicione família, amigos e o seu duo no Social para eles receberem o seu Help.")); l1.appendChild(v); return; }
    social.forEach((p) => {
      const b = el("button", "hp-l sel" + (marcados.has(p.uid) ? " on" : "")); b.type = "button"; b.dataset.uid = p.uid; b.setAttribute("aria-pressed", String(marcados.has(p.uid)));
      const av = el("span", "hp-av"); if (p.foto) { const i = el("img"); i.src = p.foto; i.alt = ""; av.appendChild(i); } else av.textContent = String(p.nome || "?").trim()[0]?.toUpperCase() || "?";
      const nmc = String(p.nome || "Usuário").trim().split(/\s+/); const curto = nmc.length <= 2 ? nmc.join(" ") : `${nmc[0]} ${nmc[nmc.length - 1]}`;
      const tx = el("span", "tx"); tx.append(el("b", null, curto), el("small", null, p.papel || "Social"));
      const ck = el("span", "hp-ck"); ck.appendChild(svg(IC.check));
      b.append(av, tx, ck);
      b.addEventListener("click", () => { if (marcados.has(p.uid)) marcados.delete(p.uid); else marcados.add(p.uid); b.classList.toggle("on", marcados.has(p.uid)); b.setAttribute("aria-pressed", String(marcados.has(p.uid))); pintarTodos(); pintarStatus(); });
      l1.appendChild(b);
    });
  };
  todosBt.addEventListener("click", () => { if (marcados.size === social.length) marcados.clear(); else social.forEach((p) => marcados.add(p.uid)); pintarSocial(); pintarTodos(); pintarStatus(); });
  pintarSocial(); pintarTodos();

  const subFora = el("div", "hp-sub"); const nFora = el("small"); subFora.append(el("span", null, "Fora do app"), nFora); s1.appendChild(subFora);
  secoes.fora = subFora;
  const l2 = caixa(s1);
  let novoAberto = false, relNovo = "";
  const pintarContatos = () => {
    nFora.textContent = `${contatos.length} de ${MAX_CONTATOS}`;
    l2.replaceChildren();
    contatos.forEach((ct, i) => {
      const r = el("div", "hp-l"); r.dataset.contato = String(i);
      const av = el("span", "hp-av", String(ct.nome || "?").trim()[0]?.toUpperCase() || "?");
      const tx = el("span", "tx"); tx.append(el("b", null, ct.nome || "Contato"), el("small", null, [ct.rel, formatarTel(ct.tel)].filter(Boolean).join(" · ")));
      const del = el("button", "hp-del"); del.type = "button"; del.setAttribute("aria-label", `Tirar ${ct.nome || "contato"}`); del.appendChild(svg(IC.lixo));
      del.addEventListener("click", () => { contatos.splice(i, 1); pintarContatos(); pintarLigar(); pintarStatus(); pintarPrev(); });
      r.append(av, tx, del); l2.appendChild(r);
    });
    if (!contatos.length && !novoAberto) { const v = el("div", "hp-vazio"); v.append(el("b", null, "Nenhum contato de fora"), el("span", null, "Quem não usa o Help Floripa (mãe, vizinho, colega) também pode receber, com o mapa de onde você está.")); l2.appendChild(v); }
    if (contatos.length >= MAX_CONTATOS) return;
    if (!novoAberto) {
      const b = el("button", "hp-l hp-addbt"); b.type = "button"; b.id = "hpNovoContato"; b.append(el("span", "hp-av mais"), el("span", "tx")); b.firstChild.appendChild(svg(IC.mais)); b.lastChild.appendChild(el("b", null, "Adicionar contato"));
      b.addEventListener("click", () => { novoAberto = true; relNovo = ""; pintarContatos(); setTimeout(() => document.getElementById("hpNome")?.focus(), 30); });
      l2.appendChild(b); return;
    }
    const f = el("div", "hp-novo");
    const nm = el("input"); nm.placeholder = "Nome"; nm.maxLength = 40; nm.id = "hpNome"; nm.autocomplete = "off";
    const tel = el("input"); tel.placeholder = "(48) 99999-9999"; tel.inputMode = "tel"; tel.id = "hpTel"; tel.autocomplete = "off";
    const rels = el("div", "hp-chips");
    PARENTESCOS.forEach((p) => { const b = el("button", null, p); b.type = "button"; b.setAttribute("aria-pressed", "false"); b.addEventListener("click", () => { relNovo = relNovo === p ? "" : p; rels.querySelectorAll("button").forEach((y) => y.setAttribute("aria-pressed", String(y.textContent === relNovo))); }); rels.appendChild(b); });
    const bts = el("div", "hp-novo-bts");
    const cancelar = el("button", "hp-sec-bt", "Cancelar"); cancelar.type = "button"; cancelar.addEventListener("click", () => { novoAberto = false; pintarContatos(); });
    const add = el("button", "hp-pri", "Adicionar"); add.type = "button"; add.id = "hpAdd";
    const ok = () => { add.disabled = !(nm.value.trim() && telOk(tel.value)); };
    tel.addEventListener("input", () => { tel.value = formatarTel(tel.value); ok(); }); nm.addEventListener("input", ok); ok();
    add.addEventListener("click", () => {
      if (contatos.some((y) => soNumeros(y.tel) === soNumeros(tel.value))) { toast?.("Esse número já está na rede."); return; }
      contatos.push({ nome: nm.value.trim().slice(0, 40), tel: soNumeros(tel.value), ...(relNovo ? { rel: relNovo } : {}) });
      novoAberto = false; pintarContatos(); pintarLigar(); pintarStatus(); pintarPrev();
    });
    bts.append(cancelar, add);
    f.append(el("label", "hp-rot", "Nome"), nm, el("label", "hp-rot", "Celular com DDD"), tel, el("label", "hp-rot", "É seu(sua)"), rels, bts);
    l2.appendChild(f);
  };
  pintarContatos();

  // ---- 2) como avisar ----
  const s2 = secao("Como avisar", "O celular não deixa mandar WhatsApp ou SMS sozinho: depois do Help, um toque em cada contato envia a mensagem pronta.");
  const l3 = caixa(s2);
  const fixo = el("div", "hp-l on"); const ftx = el("span", "tx"); ftx.append(el("b", null, "Mensagem no Help Floripa"), el("small", null, "Sempre ligada para o seu Social"));
  const fck = el("span", "hp-ck"); fck.appendChild(svg(IC.check)); fixo.append(ftx, fck); l3.appendChild(fixo);
  chave(l3, "WhatsApp", "Mensagem pronta para os contatos de fora", h.whats, "hpWhats", (v) => (h.whats = v));
  chave(l3, "SMS", "Chega mesmo sem internet do outro lado", h.sms, "hpSms", (v) => (h.sms = v));
  s2.appendChild(el("div", "hp-sub")).appendChild(el("span", null, "Depois de enviar, ligar para"));
  const ligarBox = el("div"); s2.appendChild(ligarBox);
  const pintarLigar = () => {
    const ops = [["", "Não ligar", "só mandar o aviso"], ["190", "190", "Polícia"], ["192", "192", "SAMU"], ["193", "193", "Bombeiros"]];
    if (contatos[0]) ops.push(["c0", contatos[0].nome || "1º contato", contatos[0].rel || "seu 1º contato"]);
    if (h.ligar === "c0" && !contatos[0]) h.ligar = "";
    ligarBox.replaceChildren(escolha(ops, h.ligar, (v) => (h.ligar = v), ops.length > 4 ? 3 : 2, "hpLigar"));
  };
  pintarLigar();

  // ---- 3) se ninguém responder ----
  const s3 = secao("Se ninguém do Social responder", "Quem está perto de você recebe o pedido e pode tocar em \"Vou ajudar\".");
  s3.appendChild(escolha([["depois", "Depois de 3 min", "Se ninguém do Social aceitar"], ["agora", "Na hora", "Junto com o Social"], ["nao", "Não avisar", "Só o Social e os contatos"]], h.perto, (v) => (h.perto = v), 3, "hpPerto"));
  const l4 = caixa(s3); l4.style.marginTop = "10px";
  chave(l4, "Equipe de segurança do Help Floripa", "Abre um chamado urgente com a sua localização", h.equipe, "hpEquipe", (v) => (h.equipe = v));

  // ---- 4) help rápido ----
  const s4 = secao("Help rápido", "Segure o botão HELP por 1 segundo: ele conta 5 segundos para você cancelar e envia sozinho.", "rapido");
  const l5 = caixa(s4);
  chave(l5, "Segurar o botão envia sozinho", "Para quando não dá para escrever nada", h.rapido, "hpRapido", (v) => { h.rapido = v; tipoBox.classList.toggle("off", !v); });
  s4.appendChild(el("div", "hp-sub")).appendChild(el("span", null, "O que vai no Help rápido"));
  const tipoBox = escolha(Object.entries(TIPOS_RAPIDO).map(([k, n]) => [k, n]), h.tipoRapido, (v) => { h.tipoRapido = v; pintarPrev(); }, 2, "hpTipoRapido");
  tipoBox.classList.toggle("off", !h.rapido);
  s4.appendChild(tipoBox);

  // ---- 5) ficha de emergência ----
  const s5 = secao("Ficha de emergência", "Ajuda quem for te socorrer. Só vai junto no Help, nunca aparece no seu perfil.", "ficha");
  s5.appendChild(el("div", "hp-sub")).appendChild(el("span", null, "Tipo sanguíneo"));
  const sangue = el("div", "hp-chips sangue"); sangue.id = "hpSangue";
  [...SANGUE, "Não sei"].forEach((t) => { const v = t === "Não sei" ? "" : t; const b = el("button", null, t); b.type = "button"; b.dataset.v = v; b.setAttribute("aria-pressed", String(ficha.sangue === v && (v || false) !== false)); b.addEventListener("click", () => { ficha.sangue = v; sangue.querySelectorAll("button").forEach((y) => y.setAttribute("aria-pressed", String(y.dataset.v === v && !!v))); pintarStatus(); pintarPrev(); }); sangue.appendChild(b); });
  s5.appendChild(sangue);
  const campo = (rot, ph, k, id) => {
    const l = el("label", "hp-campo"); l.appendChild(el("span", "hp-rot", rot));
    const i = el("input"); i.id = id; i.maxLength = 80; i.placeholder = ph; i.value = ficha[k] || ""; i.autocomplete = "off";
    i.addEventListener("input", () => { ficha[k] = i.value; pintarStatus(); pintarPrev(); });
    l.appendChild(i); s5.appendChild(l);
  };
  campo("Alergias", "Ex.: dipirona, amendoim", "alergias", "hpAlergias");
  campo("Condições de saúde", "Ex.: diabetes, asma, epilepsia", "condicoes", "hpCondicoes");
  campo("Remédios de uso contínuo", "Ex.: insulina", "remedios", "hpRemedios");
  const l6 = caixa(s5); l6.style.marginTop = "10px";
  chave(l6, "Mandar a ficha junto no Help", "Vai na mensagem para o Social e para os contatos de fora", ficha.incluir !== false, "hpFichaIncluir", (v) => { ficha.incluir = v; pintarPrev(); });

  // ---- 6) recado + prévia ----
  const s6 = secao("Recado pronto", "Vai em todo Help que você mandar.");
  const msgBox = el("div", "hp-msgbox");
  const msg = el("textarea", "hp-msg"); msg.maxLength = 200; msg.id = "hpMsg"; msg.value = h.msg; msg.placeholder = "Ex.: Se eu não responder, liguem para o meu irmão.";
  const cont = el("small", "hp-cont");
  msg.addEventListener("input", () => { h.msg = msg.value; cont.textContent = `${msg.value.length}/200`; pintarPrev(); });
  cont.textContent = `${msg.value.length}/200`;
  msgBox.append(msg, cont); s6.appendChild(msgBox);
  const s7 = secao("Como chega", "A localização de verdade vai na hora do pedido.");
  const balao = el("div", "hp-balao"); const prev = el("p", "hp-prev"); prev.id = "hpPrevia"; const hora = el("small", "hp-hora", "agora");
  balao.append(prev, hora); s7.appendChild(balao);
  const pintarPrev = () => { prev.textContent = textoHelp({ nome: op.dados?.nome, tipo: TIPOS_RAPIDO[h.tipoRapido], msg: h.msg.trim(), lat: -27.5954, lng: -48.548, precisao: 12, ficha }); };
  pintarPrev(); pintarStatus();

  const pe = el("div", "hp-pe");
  const salvar = el("button", "hp-salvar", "Salvar rede de Help"); salvar.type = "button"; salvar.id = "hpSalvar";
  salvar.addEventListener("click", async () => {
    salvar.disabled = true; salvar.textContent = "Salvando...";
    try {
      const todos = social.length && marcados.size === social.length;
      const gravado = await salvarHelp(fb, uid, { ...h, social: todos ? null : [...marcados], contatos, ficha });
      if (op.dados) op.dados.help = gravado;
      toast?.("Rede de Help salva"); op.aoSalvar?.(lerHelp({ help: gravado })); sair();
    } catch { salvar.disabled = false; salvar.textContent = "Salvar rede de Help"; toast?.("Não foi possível salvar."); }
  });
  pe.appendChild(salvar);
  c.append(topo, corpo, pe);
  document.body.appendChild(fundo);
  inicial = foto();
  x.focus({ preventScroll: true });
  return { fechar: sair };
}

let estilo2 = false;
function css2() {
  if (estilo2) return; estilo2 = true;
  const s = document.createElement("style");
  s.textContent = `
html.hp-travado,html.hp-travado body{overflow:hidden!important}
.hp2{max-height:94dvh}
.hp2 .hp-corpo{overscroll-behavior:contain;padding:4px 0 18px}
.hp-tt{flex:1;min-width:0;display:grid;gap:1px}
.hp-tt h3{margin:0;font-size:16.5px}
.hp-tt small{font-size:12px;color:var(--muted,#9aa7b4)}
.hp-status{display:grid;grid-template-columns:58px 1fr;gap:4px 14px;align-items:center;margin:14px 16px 2px;padding:14px;border-radius:18px;background:var(--panel-2,#182029);border:1px solid var(--line,rgba(255,255,255,.1))}
.hp-anel{width:58px;height:58px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--accent,#00adee) calc(var(--p,0)*1turn),color-mix(in srgb,var(--muted,#9aa7b4) 22%,transparent) 0);position:relative}
.hp-anel::before{content:"";position:absolute;inset:5px;border-radius:50%;background:var(--panel-2,#182029)}
.hp-anel b{position:relative;font-size:14px;font-weight:800;font-variant-numeric:tabular-nums}
.hp-st-tx{display:grid;gap:2px;min-width:0}
.hp-st-tx b{font-size:15px}
.hp-st-tx small{font-size:12px;color:var(--muted,#9aa7b4)}
.hp-st-lista{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px}
.hp-st-i{display:flex;align-items:center;gap:7px;min-height:36px;padding:6px 10px;border-radius:11px;border:1px solid var(--line,rgba(255,255,255,.12));background:var(--panel,#0f161b);color:var(--muted,#9aa7b4);font:inherit;font-size:12px;font-weight:700;text-align:left;cursor:pointer}
.hp-st-i svg{width:14px;height:14px}
.hp-st-i.ok{color:var(--text,#fff)}
.hp-st-i.ok svg{color:var(--accent,#00adee);stroke-width:2.6}
.hp2 .hp-sec{padding:20px 16px 2px;scroll-margin-top:8px}
.hp-sec-cab{margin:0 2px 10px}
.hp-sec-cab h4{margin:0;font-size:15px;font-weight:800;letter-spacing:0;text-transform:none;color:var(--text,#fff)}
.hp-sec-cab p{margin:3px 0 0;font-size:12.5px;line-height:1.45;color:var(--muted,#9aa7b4)}
.hp-sub{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:12px 4px 7px;font-size:11.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--muted,#9aa7b4)}
.hp-sub small{font-size:11.5px;letter-spacing:0;text-transform:none;font-weight:700}
.hp-link{border:0;background:none;color:var(--accent,#00adee);font:inherit;font-size:12.5px;font-weight:800;letter-spacing:0;text-transform:none;cursor:pointer;padding:4px 0}
.hp-vazio{display:grid;gap:3px;padding:14px;font-size:12.5px;color:var(--muted,#9aa7b4);line-height:1.45}
.hp-vazio b{color:var(--text,#fff);font-size:13.5px}
.hp-av.mais{border:1.5px dashed var(--line,rgba(255,255,255,.25));background:none}
.hp-addbt .tx b{color:var(--accent,#00adee)}
.hp-addbt{cursor:pointer}
.hp-novo{display:grid;gap:6px;padding:12px 14px 14px;border-top:1px solid var(--line,rgba(255,255,255,.1))}
.hp-novo input,.hp-campo input{width:100%;min-width:0;height:44px;padding:0 13px;border-radius:12px;border:1px solid var(--line,rgba(255,255,255,.12));background:var(--panel,#0f161b);color:var(--text,#fff);font:inherit;font-size:15px}
.hp-rot{font-size:12px;font-weight:750;color:var(--muted,#9aa7b4);margin-top:4px}
.hp-chips{display:flex;flex-wrap:wrap;gap:6px}
.hp-chips button{height:34px;padding:0 13px;border-radius:999px;border:1px solid var(--line,rgba(255,255,255,.14));background:var(--panel,#0f161b);color:var(--text,#fff);font:inherit;font-size:13px;font-weight:650;cursor:pointer}
.hp-chips button[aria-pressed=true]{border-color:var(--accent,#00adee);background:color-mix(in srgb,var(--accent,#00adee) 16%,var(--panel,#0f161b));color:var(--text,#fff)}
.hp-chips.sangue{display:grid;grid-template-columns:repeat(5,minmax(0,1fr))}
.hp-chips.sangue button{padding:0}
.hp-novo-bts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
.hp-sec-bt,.hp-pri{height:44px;border-radius:12px;font:inherit;font-size:14px;font-weight:800;cursor:pointer}
.hp-sec-bt{border:1px solid var(--line,rgba(255,255,255,.14));background:none;color:var(--text,#fff)}
.hp-pri{border:0;background:var(--accent,#00adee);color:#001a24}
.hp-pri:disabled{opacity:.4}
.hp-esc{display:grid;grid-template-columns:repeat(var(--n,2),minmax(0,1fr));gap:8px}
.hp-esc.off{opacity:.45;pointer-events:none}
.hp-op{position:relative;display:grid;align-content:center;gap:2px;min-height:56px;padding:9px 12px;border-radius:14px;border:1.5px solid var(--line,rgba(255,255,255,.12));background:var(--panel-2,#182029);color:var(--text,#fff);font:inherit;text-align:left;cursor:pointer}
.hp-op b{font-size:14px;font-weight:800;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:18px}
.hp-op small{font-size:11.5px;color:var(--muted,#9aa7b4);line-height:1.3}
.hp-op[aria-checked=true]{border-color:var(--accent,#00adee);background:color-mix(in srgb,var(--accent,#00adee) 12%,var(--panel-2,#182029))}
.hp-op::after{content:"";position:absolute;top:9px;right:9px;width:16px;height:16px;border-radius:50%;border:2px solid color-mix(in srgb,var(--muted,#9aa7b4) 55%,transparent);box-sizing:border-box}
.hp-op[aria-checked=true]::after{border:5px solid var(--accent,#00adee)}
.hp-campo{display:grid;gap:5px;margin-top:10px}
.hp-msgbox{position:relative}
.hp-msgbox .hp-msg{padding-bottom:22px}
.hp-cont{position:absolute;right:12px;bottom:8px;font-size:11px;color:var(--muted,#9aa7b4)}
.hp-balao{position:relative;padding:12px 14px 22px;border-radius:4px 16px 16px 16px;background:var(--panel-2,#182029);border:1px solid var(--line,rgba(255,255,255,.1))}
.hp-balao .hp-prev{margin:0;padding:0;border:0;color:var(--text,#fff);font-size:13px}
.hp-hora{position:absolute;right:12px;bottom:6px;font-size:10.5px;color:var(--muted,#9aa7b4)}
@media (max-width:360px){.hp-esc{grid-template-columns:1fr 1fr}.hp-chips.sangue{grid-template-columns:repeat(3,minmax(0,1fr))}}
`;
  document.head.appendChild(s);
}
