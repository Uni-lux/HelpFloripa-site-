// Links do perfil (13/11/2026; 14/11 com Telegram, Kwai, Facebook e LinkedIn): redes em ícones pequenos no perfil, cada uma com
// "quem pode ver" (todos · seguidores · amigos = vocês se seguem). Sem dependência do rede.js.
// Guardado em contatos_perfil/{uid}_{tipo} {uid, tipo, valor, ver, em}: as regras escondem de quem não pode ver (a leitura é
// recusada). pref_publicas.redes = lista dos tipos que a pessoa tem (sem os valores), para ler só esses. Com as regras de antes,
// fica em usuarios/{uid}.linksPerfil e só o próprio dono vê, até a publicação.
// O LinkedIn não vai na fileira de ícones: fica na linha da profissão (tocar abre o perfil do LinkedIn).

export const TIPOS_LINK = ["instagram", "whatsapp", "telegram", "tiktok", "kwai", "youtube", "facebook", "x", "linkedin"];
export const NOMES_LINK = { instagram: "Instagram", whatsapp: "WhatsApp", telegram: "Telegram", tiktok: "TikTok", kwai: "Kwai", youtube: "YouTube",
  facebook: "Facebook", x: "X", linkedin: "LinkedIn" };
export const VER_LINK = { todos: "Todos", seguidores: "Seguidores", amigos: "Amigos (vocês se seguem)" };
const OPCOES_VER = [["todos", "Todos"], ["seguidores", "Seguidores"], ["amigos", "Amigos"]];
const PADRAO_VER = { whatsapp: "seguidores", telegram: "seguidores" };
const padrao = (t) => PADRAO_VER[t] || "todos";
// "ninguem" era a opção antiga (só eu): passa a valer como Amigos, a mais fechada de agora.
const verOk = (v, t) => (v === "ninguem" ? "amigos" : VER_LINK[v] ? v : padrao(t));
// Fileira do perfil (o LinkedIn fica na profissão); no editor, as 3 primeiras sempre aparecem e as outras com "+".
const FILEIRA = TIPOS_LINK.filter((t) => t !== "linkedin");
const SEMPRE = ["instagram", "whatsapp", "tiktok"];

// "@Help.Floripa", "instagram.com/help.floripa/" ou "https://www.instagram.com/help.floripa?igsh=..." → "help.floripa"
export function limparInstagram(t) {
  let s = String(t || "").trim();
  const m = s.match(/instagram\.com\/([^/?#\s]+)/i);
  if (m) s = m[1];
  return s.replace(/^@+/, "").replace(/[^A-Za-z0-9._]/g, "").slice(0, 30);
}
function doLink(t, re) { const m = String(t || "").match(re); return m ? m[1] : String(t || "").trim(); }
export function limparTiktok(t) { return doLink(t, /tiktok\.com\/@?([^/?#\s]+)/i).replace(/^@+/, "").replace(/[^A-Za-z0-9._]/g, "").slice(0, 24); }
export function limparX(t) { return doLink(t, /(?:x|twitter)\.com\/([^/?#\s]+)/i).replace(/^@+/, "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 15); }
export function limparYoutube(t) { return doLink(t, /youtube\.com\/@([^/?#\s]+)/i).replace(/^@+/, "").replace(/[^A-Za-z0-9._-]/g, "").slice(0, 30); }
// Telegram "@nome", "t.me/nome" ou "telegram.me/nome"
export function limparTelegram(t) { return doLink(t, /(?:t|telegram)\.me\/([^/?#\s]+)/i).replace(/^@+/, "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 32); }
// Kwai "@nome", "kwai.com/@nome" ou o link de compartilhar "k.kwai.com/u/@nome/..."
export function limparKwai(t) { return doLink(t, /kwai\.com\/(?:u\/)?@([^/?#\s]+)/i).replace(/^@+/, "").replace(/[^A-Za-z0-9._]/g, "").slice(0, 30); }
// Facebook "facebook.com/nome", "fb.com/nome" ou "facebook.com/profile.php?id=123" (fica só o número)
export function limparFacebook(t) {
  const s = String(t || "").trim();
  const id = s.match(/profile\.php\?(?:[^#\s]*&)?id=(\d+)/i);
  if (id) return id[1].slice(0, 50);
  return doLink(s, /(?:facebook|fb)\.com\/([^/?#\s]+)/i).replace(/^@+/, "").replace(/[^A-Za-z0-9.]/g, "").slice(0, 50);
}
// LinkedIn "linkedin.com/in/nome-sobrenome-123" ou só "nome-sobrenome-123" (acentos ficam codificados, como o próprio LinkedIn faz)
export function limparLinkedin(t) {
  let s = doLink(t, /linkedin\.com\/in\/([^/?#\s]+)/i).replace(/^@+/, "");
  try { s = decodeURIComponent(s); } catch {}
  return encodeURIComponent(s.replace(/[\s/?#]/g, "")).replace(/[^A-Za-z0-9%_-]/g, "").slice(0, 100);
}
const LIMPAR = { instagram: limparInstagram, tiktok: limparTiktok, x: limparX, youtube: limparYoutube, telegram: limparTelegram,
  kwai: limparKwai, facebook: limparFacebook, linkedin: limparLinkedin };
// "(48) 99999-0000" → "5548999990000"; já com 55 fica igual.
export function limparWhatsapp(t) {
  let d = String(t || "").replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return d.length >= 12 && d.length <= 13 ? d : (d ? null : "");
}
export function formatarWhatsapp(d) {
  const m = String(d || "").match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : d || "";
}
export function urlLink(tipo, valor) {
  const v = encodeURIComponent(valor);
  if (tipo === "linkedin") return `https://www.linkedin.com/in/${String(valor).replace(/[^A-Za-z0-9%_-]/g, "")}`;
  if (tipo === "facebook" && /^\d+$/.test(valor)) return `https://www.facebook.com/profile.php?id=${valor}`;
  return { instagram: `https://instagram.com/${v}`, tiktok: `https://www.tiktok.com/@${v}`, x: `https://x.com/${v}`,
    youtube: `https://www.youtube.com/@${v}`, telegram: `https://t.me/${v}`, kwai: `https://www.kwai.com/@${v}`,
    facebook: `https://www.facebook.com/${v}` }[tipo] || `https://wa.me/${valor}`;
}
export function textoLink(tipo, valor) {
  if (tipo === "whatsapp") return formatarWhatsapp(valor);
  if (tipo === "linkedin") { try { return "in/" + decodeURIComponent(valor); } catch { return "in/" + valor; } }
  if (tipo === "facebook") return /^\d+$/.test(valor) ? "perfil do Facebook" : valor;
  return "@" + valor;
}

const cache = new Map();
export function esquecerLinks(uid) { cache.delete(uid); }

// Lê o que EU posso ver dos links de uid. redes = pref_publicas.redes (tipos que a pessoa tem; sem ela, tenta todos).
// proprio = também lê a reserva em usuarios (antes das regras).
export function lerLinks(fb, uid, { proprio = false, dados = null, redes = null } = {}) {
  if (!uid) return Promise.resolve({});
  if (!cache.has(uid)) {
    cache.set(uid, (async () => {
      const out = {};
      const tipos = Array.isArray(redes) ? TIPOS_LINK.filter((t) => redes.includes(t)) : TIPOS_LINK;
      await Promise.all(tipos.map(async (t) => {
        try {
          const s = await fb.getDoc(fb.doc(fb.db, "contatos_perfil", `${uid}_${t}`));
          if (s.exists() && s.data().valor) out[t] = { valor: s.data().valor, ver: s.data().ver || padrao(t) };
        } catch { /* sem permissão = não pode ver (ou regras antigas) */ }
      }));
      if (proprio && dados?.linksPerfil) {
        for (const t of TIPOS_LINK) if (!out[t] && dados.linksPerfil[t]?.valor) out[t] = { ...dados.linksPerfil[t], soAqui: true };
      }
      return out;
    })());
  }
  return cache.get(uid);
}

// links = {instagram: {valor, ver}, ...} (valor "" apaga). Só grava o que mudou em relação a `antes`. Devolve "ok" | "sem-regras".
export async function gravarLinks(fb, uid, links, antes = null) {
  esquecerLinks(uid);
  let semRegras = false;
  for (const t of TIPOS_LINK) {
    const l = links[t] || {}, a = antes?.[t] || {};
    if (antes && (l.valor || "") === (a.valor || "") && (!l.valor || l.ver === a.ver)) continue;
    const ref = fb.doc(fb.db, "contatos_perfil", `${uid}_${t}`);
    try {
      if (!l.valor) await fb.deleteDoc(ref);
      else await fb.setDoc(ref, { uid, tipo: t, valor: l.valor, ver: verOk(l.ver, t), em: fb.serverTimestamp() });
    } catch (e) {
      if (e?.code === "permission-denied") semRegras = true; else throw e;
    }
  }
  // Quais redes a pessoa tem (sem os valores): quem visita lê só essas.
  const redes = TIPOS_LINK.filter((t) => links[t]?.valor);
  try { await fb.setDoc(fb.doc(fb.db, "pref_publicas", uid), { redes, atualizadoEm: fb.serverTimestamp() }, { merge: true }); }
  catch (e) { if (e?.code === "permission-denied") semRegras = true; else throw e; }
  // Cópia na conta (só o dono lê): vale como reserva antes das regras e para preencher o editor.
  const conta = {};
  for (const t of redes) conta[t] = { valor: links[t].valor, ver: verOk(links[t].ver, t) };
  await fb.setDoc(fb.doc(fb.db, "usuarios", uid), { linksPerfil: conta }, { merge: true });
  return semRegras ? "sem-regras" : "ok";
}

const SVG = {
  instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".9" fill="currentColor" stroke="none"/>',
  whatsapp: '<path d="M20.5 11.7a8.5 8.5 0 01-12.6 7.5L3.5 20.5l1.3-4.2A8.5 8.5 0 1120.5 11.7z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .8a4.5 4.5 0 01-2.4-2.4l.8-1-1-2z"/>',
  telegram: '<path d="M20.8 4.2L3.4 11c-.6.2-.6 1.1 0 1.3l4.3 1.4 1.7 5.3c.2.6.9.7 1.3.3l2.5-2.4 4.4 3.2c.5.4 1.2.1 1.3-.5l2.8-13.4c.1-.6-.5-1.2-1-1z"/><path d="M7.7 13.7l9.6-6.1-7 7.4"/>',
  tiktok: '<path d="M14 3.5v11.2a3.7 3.7 0 11-3.2-3.7"/><path d="M14 3.5c.4 2.6 2.2 4.4 5 4.6"/>',
  kwai: '<rect x="3" y="6.2" width="12.6" height="11.6" rx="3.2"/><path d="M15.6 10.3l4.7-2.6c.4-.2.8.1.8.5v7.6c0 .4-.4.7-.8.5l-4.7-2.6"/><path d="M7.6 9.4v5.2M7.6 12.1l3.1-2.7M8.9 11l2 3.6"/>',
  youtube: '<rect x="2.8" y="5.8" width="18.4" height="12.4" rx="3.6"/><path d="M10.2 9.3v5.4l4.6-2.7z" fill="currentColor" stroke="none"/>',
  facebook: '<circle cx="12" cy="12" r="8.7"/><path d="M13.2 20.6v-7.3h2.3l.4-2.6h-2.7V9.1c0-.8.3-1.3 1.4-1.3h1.4V5.6a17 17 0 00-2.1-.1c-2.1 0-3.4 1.2-3.4 3.5v1.7H8.2v2.6h2.3v7.3"/>',
  x: '<path d="M4.5 4.5l15 15M19.5 4.5l-15 15" stroke-width="1.6"/>',
  linkedin: '<rect x="3.5" y="3.5" width="17" height="17" rx="3.2"/><path d="M8 10.6V16.2M8 7.7v.1M11.4 16.2v-5.6M11.4 13.1c0-1.6 1-2.6 2.3-2.6s2.2.9 2.2 2.6v3.1"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  cadeado: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  seta: '<path d="M7 17L17 7M9 7h8v8"/>',
  baixo: '<path d="M7 10l5 5 5-5"/>'
};
export function iconeLink(nome, cls = "pl-ic") {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("class", cls); s.setAttribute("aria-hidden", "true");
  s.innerHTML = SVG[nome];
  return s;
}

const MAX_ICONES = 5;
function linkA(t, l, cls, proprio) {
  const a = document.createElement("a");
  a.className = cls;
  a.href = urlLink(t, l.valor); a.target = "_blank"; a.rel = "noopener noreferrer";
  const nome = `${NOMES_LINK[t]} ${textoLink(t, l.valor)}`;
  a.setAttribute("aria-label", nome); a.title = nome;
  a.appendChild(iconeLink(t));
  if (proprio && (l.ver !== "todos" || l.soAqui)) {
    const c = document.createElement("span"); c.className = "pf-link-priv";
    c.title = l.soAqui ? "Só você vê até as regras novas serem publicadas" : `Visível para: ${VER_LINK[verOk(l.ver, t)]}`;
    c.appendChild(iconeLink("cadeado", "pl-cad"));
    a.appendChild(c);
  }
  return a;
}

// Desenha os ícones em `alvo` (sem o LinkedIn, que fica na profissão). Até 5 ícones; com mais, "+N" abre a lista.
export function pintarLinks(alvo, links, { proprio = false, aoEditar = null } = {}) {
  if (!alvo) return;
  alvo.replaceChildren();
  const tem = FILEIRA.filter((t) => links?.[t]?.valor);
  const cabem = tem.length > MAX_ICONES ? MAX_ICONES - 1 : tem.length;
  for (const t of tem.slice(0, cabem)) alvo.appendChild(linkA(t, links[t], `pf-link ${t}`, proprio));
  if (tem.length > cabem) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "pf-link pf-link-n"; b.textContent = "+" + (tem.length - cabem);
    b.setAttribute("aria-label", "Ver todas as redes"); b.title = "Ver todas as redes";
    b.addEventListener("click", () => abrirRedes(links, { proprio }));
    alvo.appendChild(b);
  }
  if (proprio && aoEditar && tem.length) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "pf-link add so-icone"; b.setAttribute("aria-label", "Editar redes"); b.title = "Editar redes";
    b.appendChild(iconeLink("mais"));
    b.addEventListener("click", aoEditar);
    alvo.appendChild(b);
  }
  alvo.hidden = !alvo.children.length;
}

// Linha da profissão: com LinkedIn vira link (ícone do LinkedIn + profissão + seta). Sem profissão: "LinkedIn".
export function pintarProfissao(el, prof, linkedin, { proprio = false } = {}) {
  if (!el) return;
  el.replaceChildren();
  if (linkedin?.valor) {
    const a = linkA("linkedin", linkedin, "pf-prof-in", proprio);
    a.title = "Ver no LinkedIn"; a.setAttribute("aria-label", `${prof || "Perfil"} no LinkedIn`);
    const t = document.createElement("span"); t.className = "pf-prof-tx"; t.textContent = prof || "LinkedIn";
    a.insertBefore(t, a.querySelector(".pf-link-priv"));
    a.appendChild(iconeLink("seta", "pl-seta"));
    el.appendChild(a);
  } else el.textContent = prof || "";
  el.hidden = !prof && !linkedin?.valor;
}

// Lista com todas as redes (quando passam de 5 no perfil).
export function abrirRedes(links, { proprio = false } = {}) {
  const fundo = document.createElement("div");
  fundo.className = "plr-fundo";
  const caixa = document.createElement("div");
  caixa.className = "plr"; caixa.setAttribute("role", "dialog"); caixa.setAttribute("aria-modal", "true"); caixa.setAttribute("aria-label", "Redes e contatos");
  const topo = document.createElement("div"); topo.className = "plr-topo";
  const h = document.createElement("strong"); h.textContent = "Redes e contatos";
  const x = document.createElement("button"); x.type = "button"; x.className = "plr-x"; x.dataset.fechar = ""; x.setAttribute("aria-label", "Fechar");
  x.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  topo.append(h, x);
  const lista = document.createElement("div"); lista.className = "plr-lista";
  for (const t of TIPOS_LINK) {
    const l = links?.[t]; if (!l?.valor) continue;
    const a = linkA(t, l, `plr-item ${t}`, proprio);
    const tx = document.createElement("span"); tx.className = "plr-tx";
    const n = document.createElement("b"); n.textContent = NOMES_LINK[t];
    const v = document.createElement("small"); v.textContent = textoLink(t, l.valor);
    tx.append(n, v);
    a.insertBefore(tx, a.querySelector(".pf-link-priv"));
    a.appendChild(iconeLink("seta", "pl-seta"));
    lista.appendChild(a);
  }
  caixa.append(topo, lista);
  fundo.appendChild(caixa);
  const fechar = () => { fundo.remove(); document.removeEventListener("keydown", tecla); };
  const tecla = (e) => { if (e.key === "Escape") fechar(); };
  fundo.addEventListener("click", (e) => { if (e.target === fundo || e.target.closest("[data-fechar]")) fechar(); });
  document.addEventListener("keydown", tecla);
  document.body.appendChild(fundo);
  x.focus({ preventScroll: true });
}

// Editor (Editar perfil): uma linha por rede (campo + "quem pode ver"). Instagram, WhatsApp e TikTok sempre aparecem; as
// outras entram pelos botões "+ Rede" (e as que já têm valor já vêm abertas). O LinkedIn vai em `boxLinkedin`, junto da
// profissão. ler() devolve {tipo: {valor, ver}} ou lança Error com a mensagem para a pessoa.
const DICA = { instagram: "seunome ou link", whatsapp: "(48) 90000-0000", telegram: "@seunome ou t.me/…", tiktok: "@seunome ou link",
  kwai: "@seunome ou link", youtube: "@seucanal ou link", facebook: "seunome ou link", x: "@seunome ou link", linkedin: "link do seu perfil (opcional)" };
export function montarEditorLinks(box, links = {}, { boxLinkedin = null } = {}) {
  box.replaceChildren();
  if (boxLinkedin) boxLinkedin.replaceChildren();
  const campos = {};
  const lista = document.createElement("div"); lista.className = "ed-redes-lista";
  const mais = document.createElement("div"); mais.className = "ed-redes-mais";
  const linha = (t) => {
    const l = links[t] || {};
    const el = document.createElement("div"); el.className = "ed-rede"; el.dataset.rede = t;
    const ic = document.createElement("span"); ic.className = "ed-rede-ic " + t; ic.title = NOMES_LINK[t]; ic.appendChild(iconeLink(t));
    const inp = document.createElement("input");
    inp.id = "edLink-" + t; inp.maxLength = 120; inp.autocomplete = "off"; inp.spellcheck = false; inp.setAttribute("autocapitalize", "off");
    inp.type = t === "whatsapp" ? "tel" : "text"; inp.placeholder = DICA[t]; inp.setAttribute("aria-label", NOMES_LINK[t]);
    inp.value = l.valor ? (t === "whatsapp" ? formatarWhatsapp(l.valor) : t === "linkedin" ? urlLink(t, l.valor).replace(/^https:\/\/www\./, "") : l.valor) : "";
    const campo = document.createElement("label"); campo.className = "ed-rede-campo";
    const nm = document.createElement("span"); nm.className = "ed-rede-nome"; nm.textContent = NOMES_LINK[t];
    campo.append(nm, inp);
    const ver = document.createElement("label"); ver.className = "ed-rede-ver";
    const sel = document.createElement("select"); sel.id = "edLinkVer-" + t; sel.setAttribute("aria-label", `Quem pode ver o ${NOMES_LINK[t]}`);
    for (const [v, rot] of OPCOES_VER) { const o = document.createElement("option"); o.value = v; o.textContent = rot; sel.appendChild(o); }
    sel.value = verOk(l.ver, t);
    ver.append(sel, iconeLink("baixo", "ed-rede-seta"));
    el.append(ic, campo, ver);
    campos[t] = { inp, sel, el };
    return el;
  };
  for (const t of FILEIRA) {
    if (SEMPRE.includes(t) || links[t]?.valor) { lista.appendChild(linha(t)); continue; }
    const b = document.createElement("button");
    b.type = "button"; b.className = "ed-rede-add"; b.dataset.rede = t;
    b.append(iconeLink("mais", "ed-rede-mais"), iconeLink(t), document.createTextNode(NOMES_LINK[t]));
    b.addEventListener("click", () => {
      lista.appendChild(linha(t)); b.remove();
      mais.hidden = !mais.children.length;
      campos[t].inp.focus();
    });
    mais.appendChild(b);
  }
  mais.hidden = !mais.children.length;
  box.append(lista, mais);
  (boxLinkedin || lista).appendChild(linha("linkedin"));
  return {
    ler() {
      const out = {};
      for (const t of TIPOS_LINK) {
        const c = campos[t];
        if (!c) { out[t] = { valor: "", ver: padrao(t) }; continue; }
        const { inp, sel } = c;
        const v = t === "whatsapp" ? limparWhatsapp(inp.value) : LIMPAR[t](inp.value);
        const erro = (m) => { inp.focus(); throw new Error(m); };
        if (v === null) erro("WhatsApp: informe o número com DDD.");
        if (v && t === "tiktok" && v.length < 2) erro("TikTok: nome muito curto.");
        if (v && t === "kwai" && v.length < 2) erro("Kwai: nome muito curto.");
        if (v && t === "youtube" && v.length < 3) erro("YouTube: use o @ do canal (3 letras ou mais).");
        if (v && t === "telegram" && v.length < 5) erro("Telegram: o nome de usuário tem pelo menos 5 letras.");
        if (v && t === "facebook" && v.length < 5) erro("Facebook: cole o link do seu perfil.");
        if (v && t === "linkedin" && v.length < 3) erro("LinkedIn: cole o link do seu perfil (linkedin.com/in/…).");
        out[t] = { valor: v, ver: sel.value };
      }
      return out;
    },
    focar() { campos.instagram.inp.focus({ preventScroll: true }); }
  };
}
