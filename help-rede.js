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
export const HELP_PADRAO = { social: null, contatos: [], whats: true, sms: true, ligar: "", perto: "depois", equipe: true, rapido: true, tipoRapido: "seguranca", msg: "" };
export const MAX_CONTATOS = 5;
export const TIPOS_RAPIDO = { seguranca: "Estou em perigo", violencia: "Violência ou ameaça", saude: "Mal-estar ou saúde", acidente: "Acidente" };
export const LIGAR = { "": "Não ligar", "190": "190 · Polícia", "192": "192 · SAMU", "193": "193 · Bombeiros" };

export function lerHelp(dados) {
  const h = { ...HELP_PADRAO, ...((dados && dados.help) || {}) };
  h.contatos = (Array.isArray(h.contatos) ? h.contatos : []).filter((c) => c && telOk(c.tel)).slice(0, MAX_CONTATOS);
  if (!Array.isArray(h.social)) h.social = null;
  if (!["depois", "agora", "nao"].includes(h.perto)) h.perto = "depois";
  if (!TIPOS_RAPIDO[h.tipoRapido]) h.tipoRapido = "seguranca";
  return h;
}
export async function salvarHelp(fb, uid, h) {
  const limpo = {
    social: Array.isArray(h.social) ? h.social.slice(0, 30) : null,
    contatos: (h.contatos || []).slice(0, MAX_CONTATOS).map((c) => ({ nome: String(c.nome || "").trim().slice(0, 40), tel: soNumeros(c.tel) })),
    whats: !!h.whats, sms: !!h.sms, ligar: String(h.ligar || "").slice(0, 3), perto: h.perto, equipe: h.equipe !== false,
    rapido: !!h.rapido, tipoRapido: h.tipoRapido, msg: String(h.msg || "").trim().slice(0, 200)
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
export function textoHelp({ nome, tipo, msg, lat, lng, precisao, id }) {
  const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return [
    `HELP · ${nome || "Alguém"} pediu ajuda pelo Help Floripa às ${hora}.`,
    tipo ? `O que está acontecendo: ${tipo}.` : "",
    msg ? `Recado: ${msg}` : "",
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
 * Abre "Rede de Help".
 * op: { fb, uid, dados (a conta), social: [{uid, nome, foto, papel}], toast, aoSalvar(h) }
 */
export function abrirConfigHelp(op) {
  css();
  const { fb, uid, toast } = op;
  const h = lerHelp(op.dados);
  const social = op.social || [];
  const marcados = new Set(Array.isArray(h.social) ? h.social : social.map((p) => p.uid));
  let contatos = h.contatos.map((c) => ({ ...c }));
  document.querySelectorAll(".hp-fundo").forEach((x) => x.remove());
  const fundo = el("div", "hp-fundo");
  const c = el("div", "hp"); c.setAttribute("role", "dialog"); c.setAttribute("aria-modal", "true"); c.setAttribute("aria-label", "Rede de Help");
  fundo.appendChild(c);
  const sair = () => { fundo.remove(); document.removeEventListener("keydown", tecla); };
  const tecla = (e) => { if (e.key === "Escape") sair(); };
  document.addEventListener("keydown", tecla);
  fundo.addEventListener("click", (e) => { if (e.target === fundo) sair(); });
  const topo = el("div", "hp-topo"); const x = el("button", "hp-x"); x.type = "button"; x.dataset.fechar = ""; x.setAttribute("aria-label", "Fechar"); x.appendChild(svg(IC.fechar)); x.addEventListener("click", sair);
  topo.append(el("h3", null, "Rede de Help"), x);
  const corpo = el("div", "hp-corpo");
  const res = el("div", "hp-res"); const resTx = el("div"); res.append(svg(IC.escudo), resTx);
  const pintarRes = () => { resTx.replaceChildren(el("b", null, `${marcados.size} do Social · ${contatos.length} ${contatos.length === 1 ? "contato" : "contatos"} de fora`), el("small", null, "Recebem o seu Help na hora, com a sua localização.")); };
  corpo.appendChild(res);
  const secao = (titulo) => { const s = el("section", "hp-sec"); s.appendChild(el("h4", null, titulo)); corpo.appendChild(s); return s; };

  // 1) Social
  const s1 = secao("No Help Floripa (Mensagens)");
  const l1 = el("div", "hp-lista"); s1.appendChild(l1);
  if (!social.length) l1.appendChild(el("div", "hp-l", "")).append(el("span", "tx", "Ninguém no seu Social ainda. Adicione família, amigos e o seu duo."));
  social.forEach((p) => {
    const b = el("button", "hp-l sel" + (marcados.has(p.uid) ? " on" : "")); b.type = "button"; b.dataset.uid = p.uid; b.setAttribute("aria-pressed", String(marcados.has(p.uid)));
    const av = el("span", "hp-av"); if (p.foto) { const i = el("img"); i.src = p.foto; i.alt = ""; av.appendChild(i); } else av.textContent = String(p.nome || "?").trim()[0]?.toUpperCase() || "?";
    const tx = el("span", "tx"); tx.append(el("b", null, p.nome || "Usuário"), el("small", null, p.papel || ""));
    const ck = el("span", "hp-ck"); ck.appendChild(svg(IC.check));
    b.append(av, tx, ck);
    b.addEventListener("click", () => { if (marcados.has(p.uid)) marcados.delete(p.uid); else marcados.add(p.uid); b.classList.toggle("on", marcados.has(p.uid)); b.setAttribute("aria-pressed", String(marcados.has(p.uid))); pintarRes(); });
    l1.appendChild(b);
  });

  // 2) Contatos de fora
  const s2 = secao(`Fora do app · até ${MAX_CONTATOS}`);
  const l2 = el("div", "hp-lista"); s2.appendChild(l2);
  const pintarContatos = () => {
    l2.replaceChildren();
    contatos.forEach((ct, i) => {
      const r = el("div", "hp-l"); r.dataset.contato = String(i);
      const av = el("span", "hp-av", String(ct.nome || "?").trim()[0]?.toUpperCase() || "?");
      const tx = el("span", "tx"); tx.append(el("b", null, ct.nome || "Contato"), el("small", null, formatarTel(ct.tel)));
      const del = el("button", "hp-del"); del.type = "button"; del.setAttribute("aria-label", `Tirar ${ct.nome || "contato"}`); del.appendChild(svg(IC.lixo));
      del.addEventListener("click", () => { contatos.splice(i, 1); pintarContatos(); pintarRes(); pintarLigar(); });
      r.append(av, tx, del); l2.appendChild(r);
    });
    if (contatos.length < MAX_CONTATOS) {
      const f = el("div", "hp-add");
      const nm = el("input"); nm.placeholder = "Nome (ex.: Mãe)"; nm.maxLength = 40; nm.id = "hpNome"; nm.autocomplete = "off";
      const tel = el("input"); tel.placeholder = "(48) 99999-9999"; tel.inputMode = "tel"; tel.id = "hpTel"; tel.autocomplete = "off";
      const add = el("button"); add.type = "button"; add.setAttribute("aria-label", "Adicionar contato"); add.id = "hpAdd"; add.appendChild(svg(IC.mais));
      const ok = () => { add.disabled = !(nm.value.trim() && telOk(tel.value)); };
      tel.addEventListener("input", () => { tel.value = formatarTel(tel.value); ok(); }); nm.addEventListener("input", ok); ok();
      add.addEventListener("click", () => {
        if (contatos.some((x) => soNumeros(x.tel) === soNumeros(tel.value))) { toast?.("Esse número já está na rede."); return; }
        contatos.push({ nome: nm.value.trim().slice(0, 40), tel: soNumeros(tel.value) }); pintarContatos(); pintarRes(); pintarLigar(); pintarPrev();
      });
      f.append(nm, tel, add); l2.appendChild(f);
    }
  };
  pintarContatos();

  // 3) Como alertar
  const s3 = secao("Como alertar");
  const l3 = el("div", "hp-lista"); s3.appendChild(l3);
  const chave = (txt, sub, val, id, aoMudar) => {
    const r = el("label", "hp-l"); const tx = el("span", "tx"); tx.append(el("b", null, txt)); if (sub) tx.appendChild(el("small", null, sub));
    const ch = el("span", "hp-chave"); const i = el("input"); i.type = "checkbox"; i.checked = val; i.id = id; ch.append(i, el("span"));
    i.addEventListener("change", () => aoMudar(i.checked));
    r.append(tx, ch); l3.appendChild(r); return i;
  };
  const fixo = el("div", "hp-l"); const ftx = el("span", "tx"); ftx.append(el("b", null, "Mensagem no Help Floripa"), el("small", null, "Sempre ligado para o Social"));
  const fck = el("span", "hp-ck"); fck.appendChild(svg(IC.check)); fixo.classList.add("on"); fixo.append(ftx, fck); l3.appendChild(fixo);
  chave("WhatsApp", "Mensagem pronta para os contatos de fora", h.whats, "hpWhats", (v) => (h.whats = v));
  chave("SMS", "Funciona mesmo sem internet do outro lado", h.sms, "hpSms", (v) => (h.sms = v));
  const lig = el("label", "hp-l"); const ltx = el("span", "tx"); ltx.append(el("b", null, "Depois de enviar, ligar para"));
  const sel = el("select", "hp-sel"); sel.id = "hpLigar"; sel.dataset.nativo = "";
  const pintarLigar = () => {
    const atual = sel.value || h.ligar;
    sel.replaceChildren(...Object.entries(LIGAR).map(([k, n]) => new Option(n, k)));
    if (contatos[0]) sel.appendChild(new Option(`${contatos[0].nome || "1º contato"}`, "c0"));
    sel.value = [...sel.options].some((o) => o.value === atual) ? atual : "";
    h.ligar = sel.value;
  };
  sel.addEventListener("change", () => (h.ligar = sel.value));
  lig.append(ltx, sel); l3.appendChild(lig); pintarLigar();

  // 4) Se ninguém responder
  const s4 = secao("Quem está perto");
  const seg = el("div", "hp-seg"); seg.style.setProperty("--n", "3"); seg.setAttribute("role", "group");
  [["depois", "Após 3 min"], ["agora", "Na hora"], ["nao", "Não avisar"]].forEach(([k, n]) => {
    const b = el("button", null, n); b.type = "button"; b.dataset.perto = k; b.setAttribute("aria-pressed", String(h.perto === k));
    b.addEventListener("click", () => { h.perto = k; seg.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); });
    seg.appendChild(b);
  });
  s4.append(seg, el("p", "hp-nota", "\"Após 3 min\": se ninguém do seu Social aceitar ajudar, quem está perto é avisado."));
  const l4 = el("div", "hp-lista"); l4.style.marginTop = "8px"; s4.appendChild(l4);
  const eqR = el("label", "hp-l"); const eqT = el("span", "tx"); eqT.append(el("b", null, "Equipe de segurança"), el("small", null, "Chamado urgente no Help Floripa"));
  const eqC = el("span", "hp-chave"); const eqI = el("input"); eqI.type = "checkbox"; eqI.checked = h.equipe; eqI.id = "hpEquipe"; eqC.append(eqI, el("span")); eqI.addEventListener("change", () => (h.equipe = eqI.checked));
  eqR.append(eqT, eqC); l4.appendChild(eqR);

  // 5) Help rápido
  const s5 = secao("Help rápido");
  const l5 = el("div", "hp-lista"); s5.appendChild(l5);
  const rR = el("label", "hp-l"); const rT = el("span", "tx"); rT.append(el("b", null, "Segurar o botão Help"), el("small", null, "Envia sozinho depois de 5 s para cancelar"));
  const rC = el("span", "hp-chave"); const rI = el("input"); rI.type = "checkbox"; rI.checked = h.rapido; rI.id = "hpRapido"; rC.append(rI, el("span")); rI.addEventListener("change", () => (h.rapido = rI.checked));
  rR.append(rT, rC); l5.appendChild(rR);
  const tR = el("label", "hp-l"); const tT = el("span", "tx"); tT.append(el("b", null, "Como"));
  const tS = el("select", "hp-sel"); tS.id = "hpTipoRapido"; tS.dataset.nativo = ""; Object.entries(TIPOS_RAPIDO).forEach(([k, n]) => tS.appendChild(new Option(n, k, false, k === h.tipoRapido)));
  tS.addEventListener("change", () => { h.tipoRapido = tS.value; pintarPrev(); });
  tR.append(tT, tS); l5.appendChild(tR);

  // 6) Recado + prévia
  const s6 = secao("Recado pronto");
  const msg = el("textarea", "hp-msg"); msg.maxLength = 200; msg.id = "hpMsg"; msg.value = h.msg; msg.placeholder = "Ex.: Tenho diabetes. Se eu não responder, liguem para o meu irmão.";
  msg.addEventListener("input", () => { h.msg = msg.value; pintarPrev(); });
  const prev = el("p", "hp-prev"); prev.id = "hpPrevia";
  const pintarPrev = () => { prev.textContent = textoHelp({ nome: op.dados?.nome, tipo: TIPOS_RAPIDO[h.tipoRapido], msg: h.msg.trim(), lat: -27.5954, lng: -48.548, precisao: 12 }); };
  s6.append(msg, el("p", "hp-nota", "Assim chega para os contatos de fora (com a sua localização de verdade):"), prev);
  pintarPrev(); pintarRes();

  const pe = el("div", "hp-pe");
  const salvar = el("button", "hp-salvar", "Salvar rede de Help"); salvar.type = "button"; salvar.id = "hpSalvar";
  salvar.addEventListener("click", async () => {
    salvar.disabled = true;
    try {
      const todos = social.length && marcados.size === social.length;
      const gravado = await salvarHelp(fb, uid, { ...h, social: todos ? null : [...marcados], contatos });
      if (op.dados) op.dados.help = gravado;
      toast?.("Rede de Help salva"); op.aoSalvar?.(lerHelp({ help: gravado })); sair();
    } catch { salvar.disabled = false; toast?.("Não foi possível salvar."); }
  });
  pe.appendChild(salvar);
  c.append(topo, corpo, pe);
  document.body.appendChild(fundo);
  x.focus({ preventScroll: true });
  return { fechar: sair };
}
