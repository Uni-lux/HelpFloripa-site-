// Links do perfil (13/11/2026, pedido dele): Instagram, WhatsApp, TikTok, X e YouTube em ícones pequenos no perfil, cada um com
// "quem pode ver" (todos · só quem me segue · ninguém). Sem dependência do rede.js.
// Guardado em contatos_perfil/{uid}_{instagram|whatsapp|tiktok|x|youtube} {uid, tipo, valor, ver, em}: as regras escondem de quem não
// pode ver (a leitura é recusada). Com as regras de antes (sem a coleção), fica em usuarios/{uid}.linksPerfil e só o
// próprio dono vê, até a publicação.

export const TIPOS_LINK = ["instagram", "whatsapp", "tiktok", "x", "youtube"];
export const NOMES_LINK = { instagram: "Instagram", whatsapp: "WhatsApp", tiktok: "TikTok", x: "X", youtube: "YouTube" };
export const VER_LINK = { todos: "Todos", seguidores: "Só quem me segue", ninguem: "Ninguém (só eu)" };
const PADRAO_VER = { instagram: "todos", whatsapp: "seguidores", tiktok: "todos", x: "todos", youtube: "todos" };

// "@Help.Floripa", "instagram.com/help.floripa/" ou "https://www.instagram.com/help.floripa?igsh=..." → "help.floripa"
export function limparInstagram(t) {
  let s = String(t || "").trim();
  const m = s.match(/instagram\.com\/([^/?#\s]+)/i);
  if (m) s = m[1];
  return s.replace(/^@+/, "").replace(/[^A-Za-z0-9._]/g, "").slice(0, 30);
}
// TikTok "@nome" ou "tiktok.com/@nome"; X "@nome", "x.com/nome" ou "twitter.com/nome"; YouTube "@canal" ou "youtube.com/@canal".
function doLink(t, re) { const m = String(t || "").match(re); return m ? m[1] : String(t || "").trim(); }
export function limparTiktok(t) { return doLink(t, /tiktok\.com\/@?([^/?#\s]+)/i).replace(/^@+/, "").replace(/[^A-Za-z0-9._]/g, "").slice(0, 24); }
export function limparX(t) { return doLink(t, /(?:x|twitter)\.com\/([^/?#\s]+)/i).replace(/^@+/, "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 15); }
export function limparYoutube(t) { return doLink(t, /youtube\.com\/@([^/?#\s]+)/i).replace(/^@+/, "").replace(/[^A-Za-z0-9._-]/g, "").slice(0, 30); }
const LIMPAR = { instagram: limparInstagram, tiktok: limparTiktok, x: limparX, youtube: limparYoutube };
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
  return { instagram: `https://instagram.com/${v}`, tiktok: `https://www.tiktok.com/@${v}`, x: `https://x.com/${v}`,
    youtube: `https://www.youtube.com/@${v}` }[tipo] || `https://wa.me/${valor}`;
}
export function textoLink(tipo, valor) { return tipo === "whatsapp" ? formatarWhatsapp(valor) : "@" + valor; }

const cache = new Map();
export function esquecerLinks(uid) { cache.delete(uid); }

// Lê o que EU posso ver dos links de uid. proprio = também lê a reserva em usuarios (antes das regras).
export function lerLinks(fb, uid, { proprio = false, dados = null } = {}) {
  if (!uid) return Promise.resolve({});
  if (!cache.has(uid)) {
    cache.set(uid, (async () => {
      const out = {};
      await Promise.all(TIPOS_LINK.map(async (t) => {
        try {
          const s = await fb.getDoc(fb.doc(fb.db, "contatos_perfil", `${uid}_${t}`));
          if (s.exists() && s.data().valor) out[t] = { valor: s.data().valor, ver: s.data().ver || PADRAO_VER[t] };
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

// links = {instagram: {valor, ver}, whatsapp: {valor, ver}} (valor "" apaga). Devolve "ok" | "sem-regras".
export async function gravarLinks(fb, uid, links) {
  esquecerLinks(uid);
  let semRegras = false;
  for (const t of TIPOS_LINK) {
    const l = links[t] || {};
    const ref = fb.doc(fb.db, "contatos_perfil", `${uid}_${t}`);
    try {
      if (!l.valor) await fb.deleteDoc(ref);
      else await fb.setDoc(ref, { uid, tipo: t, valor: l.valor, ver: l.ver || PADRAO_VER[t], em: fb.serverTimestamp() });
    } catch (e) {
      if (e?.code === "permission-denied") semRegras = true; else throw e;
    }
  }
  // Cópia na conta (só o dono lê): vale como reserva antes das regras e para preencher o editor.
  const conta = {};
  for (const t of TIPOS_LINK) if (links[t]?.valor) conta[t] = { valor: links[t].valor, ver: links[t].ver || PADRAO_VER[t] };
  await fb.setDoc(fb.doc(fb.db, "usuarios", uid), { linksPerfil: conta }, { merge: true });
  return semRegras ? "sem-regras" : "ok";
}

const SVG = {
  instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".9" fill="currentColor" stroke="none"/>',
  whatsapp: '<path d="M20.5 11.7a8.5 8.5 0 01-12.6 7.5L3.5 20.5l1.3-4.2A8.5 8.5 0 1120.5 11.7z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .8a4.5 4.5 0 01-2.4-2.4l.8-1-1-2z"/>',
  tiktok: '<path d="M14 3.5v11.2a3.7 3.7 0 11-3.2-3.7"/><path d="M14 3.5c.4 2.6 2.2 4.4 5 4.6"/>',
  x: '<path d="M4.5 4.5l15 15M19.5 4.5l-15 15" stroke-width="1.6"/>',
  youtube: '<rect x="2.8" y="5.8" width="18.4" height="12.4" rx="3.6"/><path d="M10.2 9.3v5.4l4.6-2.7z" fill="currentColor" stroke="none"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  cadeado: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>'
};
export function iconeLink(nome, cls = "pl-ic") {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("class", cls); s.setAttribute("aria-hidden", "true");
  s.innerHTML = SVG[nome];
  return s;
}

// Desenha os ícones em `alvo`. No próprio perfil: cadeado pequeno quando não é para todos e "+ Links" se não tem nenhum.
export function pintarLinks(alvo, links, { proprio = false, aoEditar = null, aoAbrir = null } = {}) {
  if (!alvo) return;
  alvo.replaceChildren();
  const tem = TIPOS_LINK.filter((t) => links?.[t]?.valor);
  for (const t of tem) {
    const l = links[t];
    const a = document.createElement("a");
    a.className = `pf-link ${t}`;
    a.href = urlLink(t, l.valor); a.target = "_blank"; a.rel = "noopener noreferrer";
    const nome = `${NOMES_LINK[t]} ${textoLink(t, l.valor)}`;
    a.setAttribute("aria-label", nome); a.title = nome;
    a.appendChild(iconeLink(t));
    if (proprio && (l.ver !== "todos" || l.soAqui)) {
      const c = document.createElement("span"); c.className = "pf-link-priv";
      c.title = l.soAqui ? "Só você vê até as regras novas serem publicadas" : `Visível para: ${VER_LINK[l.ver]}`;
      c.appendChild(iconeLink("cadeado", "pl-cad"));
      a.appendChild(c);
    }
    if (aoAbrir) a.addEventListener("click", () => aoAbrir(t));
    alvo.appendChild(a);
  }
  if (proprio && aoEditar && tem.length) {
    // Só para editar o que já existe; sem links, o perfil fica limpo (adiciona-se em Editar perfil).
    const b = document.createElement("button");
    b.type = "button"; b.className = "pf-link add so-icone"; b.setAttribute("aria-label", "Editar links"); b.title = "Editar links";
    b.appendChild(iconeLink("mais"));
    b.addEventListener("click", aoEditar);
    alvo.appendChild(b);
  }
  alvo.hidden = !alvo.children.length;
}

// Editor (Editar perfil): uma linha por rede, com o campo e "quem pode ver". ler() devolve {tipo: {valor, ver}}
// ou lança Error com a mensagem para a pessoa.
const DICA = { instagram: "seunome ou link do perfil", whatsapp: "(48) 90000-0000", tiktok: "seunome ou link", x: "seunome ou link", youtube: "seucanal ou link" };
export function montarEditorLinks(box, links = {}) {
  box.replaceChildren();
  const campos = {};
  for (const t of TIPOS_LINK) {
    const l = links[t] || {};
    const linha = document.createElement("label"); linha.className = "ed-rede"; linha.dataset.rede = t;
    const ic = document.createElement("span"); ic.className = "ed-rede-ic"; ic.title = NOMES_LINK[t]; ic.appendChild(iconeLink(t));
    const inp = document.createElement("input");
    inp.id = "edLink-" + t; inp.maxLength = 80; inp.autocomplete = "off"; inp.spellcheck = false; inp.setAttribute("autocapitalize", "off");
    inp.type = t === "whatsapp" ? "tel" : "text"; inp.placeholder = `${NOMES_LINK[t]}: ${DICA[t]}`; inp.setAttribute("aria-label", NOMES_LINK[t]);
    inp.value = l.valor ? (t === "whatsapp" ? formatarWhatsapp(l.valor) : l.valor) : "";
    const sel = document.createElement("select"); sel.id = "edLinkVer-" + t; sel.setAttribute("aria-label", `Quem pode ver o ${NOMES_LINK[t]}`);
    for (const [v, rot] of [["todos", "Todos"], ["seguidores", "Quem me segue"], ["ninguem", "Só eu"]]) { const o = document.createElement("option"); o.value = v; o.textContent = rot; sel.appendChild(o); }
    sel.value = l.ver || PADRAO_VER[t];
    linha.append(ic, inp, sel);
    box.appendChild(linha);
    campos[t] = { inp, sel };
  }
  return {
    ler() {
      const out = {};
      for (const t of TIPOS_LINK) {
        const { inp, sel } = campos[t];
        const v = t === "whatsapp" ? limparWhatsapp(inp.value) : LIMPAR[t](inp.value);
        if (v === null) { inp.focus(); throw new Error("WhatsApp: informe o número com DDD."); }
        if (v && t === "tiktok" && v.length < 2) { inp.focus(); throw new Error("TikTok: nome muito curto."); }
        if (v && t === "youtube" && v.length < 3) { inp.focus(); throw new Error("YouTube: use o @ do canal (3 letras ou mais)."); }
        out[t] = { valor: v, ver: sel.value };
      }
      return out;
    },
    focar() { campos.instagram.inp.focus({ preventScroll: true }); }
  };
}
