// Links do perfil (13/11/2026, pedido dele): Instagram e WhatsApp em ícones pequenos no perfil, cada um com
// "quem pode ver" (todos · só quem me segue · ninguém). Sem dependência do rede.js.
// Guardado em contatos_perfil/{uid}_{instagram|whatsapp} {uid, tipo, valor, ver, em}: as regras escondem de quem não
// pode ver (a leitura é recusada). Com as regras de antes (sem a coleção), fica em usuarios/{uid}.linksPerfil e só o
// próprio dono vê, até a publicação.

export const TIPOS_LINK = ["instagram", "whatsapp"];
export const VER_LINK = { todos: "Todos", seguidores: "Só quem me segue", ninguem: "Ninguém (só eu)" };
const PADRAO_VER = { instagram: "todos", whatsapp: "seguidores" };

// "@Help.Floripa", "instagram.com/help.floripa/" ou "https://www.instagram.com/help.floripa?igsh=..." → "help.floripa"
export function limparInstagram(t) {
  let s = String(t || "").trim();
  const m = s.match(/instagram\.com\/([^/?#\s]+)/i);
  if (m) s = m[1];
  return s.replace(/^@+/, "").replace(/[^A-Za-z0-9._]/g, "").slice(0, 30);
}
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
  if (tipo === "instagram") return `https://instagram.com/${encodeURIComponent(valor)}`;
  return `https://wa.me/${valor}`;
}

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
    const nome = t === "instagram" ? `Instagram @${l.valor}` : `WhatsApp ${formatarWhatsapp(l.valor)}`;
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
  if (proprio && aoEditar) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "pf-link add" + (tem.length ? " so-icone" : "");
    b.setAttribute("aria-label", tem.length ? "Editar links" : "Adicionar Instagram ou WhatsApp");
    b.appendChild(iconeLink("mais"));
    if (!tem.length) b.appendChild(document.createTextNode("Links"));
    b.addEventListener("click", aoEditar);
    alvo.appendChild(b);
  }
  alvo.hidden = !alvo.children.length;
}
