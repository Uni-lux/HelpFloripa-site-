// =====================================================
// Salão (Social, 16/11/2026): a galeria da vida da pessoa.
// Momentos com foto, lembranças (linha da vida) e os destaques do Flash. Cada momento tem "quem vê"
// (todos, seguidores, amigos = os dois se seguem, ou só eu), conferido nas regras (match /momentos).
// Sem dependências: usado pelo social.html (o Salão inteiro) e pelo perfil (cartão com a prévia).
// =====================================================
export const CATEGORIAS = {
  conquista: ["Conquista", "trofeu", "#f5b301"], viagem: ["Viagem", "aviao", "#00adee"], familia: ["Família", "casa", "#f59e0b"],
  amor: ["Amor", "coracao", "#ff4d6d"], amizade: ["Amizade", "pessoas", "#2fbf71"], trabalho: ["Trabalho", "maleta", "#94a3b8"],
  estudo: ["Estudo", "livro", "#b066ff"], pet: ["Pet", "pata", "#c98a4b"], festa: ["Festa", "festa", "#ff7aa8"],
  fe: ["Fé", "vela", "#facc15"], esporte: ["Esporte", "bola", "#22c55e"], outro: ["Outro", "estrela", "#38bdf8"]
};
export const catDe = (k) => CATEGORIAS[k] || CATEGORIAS.outro;
export const VER_MOMENTO = {
  todos: ["Todos", "Qualquer pessoa com conta"],
  seguidores: ["Seguidores", "Só quem segue você"],
  amigos: ["Amigos", "Quem você segue e segue você"],
  eu: ["Só eu", "Guardado só para você"]
};
export const MAX_MOMENTOS = 80;
// Limites do salão (16/11/2026, pedido dele): uma galeria escolhida a dedo, não um álbum sem fim.
// Conferidos no aparelho (as regras não contam documentos). Lembrança com foto conta como foto.
export const LIMITES_SALAO = { fotos: 24, lembrancas: 20, exposicao: 8 };
export const contarSalao = (lista) => ({
  fotos: lista.filter((m) => fotoOk(m.foto)).length,
  lembrancas: lista.filter((m) => m.tipo === "lembranca" && !fotoOk(m.foto)).length,
  exposicao: lista.filter((m) => m.fixado && fotoOk(m.foto)).length
});
// Modelos da galeria (16/11/2026): o dono escolhe e quem visita vê igual (pref_publicas.salaoModelo; conta guarda também).
export const MODELOS_GALERIA = {
  mosaico: { nome: "Mosaico", texto: "Uma foto grande e as outras em volta." },
  grade: { nome: "Grade", texto: "Todas do mesmo tamanho, em quadrados." },
  revista: { nome: "Revista", texto: "Uma larga, duas lado a lado, como num editorial." },
  polaroid: { nome: "Polaroid", texto: "Fotos reveladas, com moldura e legenda." },
  filme: { nome: "Filme", texto: "Uma faixa de cinema que desliza para o lado." }
};
export const modeloGaleria = (v) => (MODELOS_GALERIA[v] ? v : "mosaico");
// Desenho pequeno de cada modelo (para os botões de escolher).
export const DESENHO_MODELO = {
  mosaico: '<rect x="1" y="1" width="27" height="21" rx="2.5"/><rect x="30" y="1" width="15" height="10" rx="2"/><rect x="30" y="12" width="15" height="10" rx="2"/><rect x="1" y="24" width="14" height="9" rx="2"/><rect x="17" y="24" width="28" height="9" rx="2"/>',
  grade: '<rect x="1" y="1" width="14" height="10" rx="1.5"/><rect x="16" y="1" width="14" height="10" rx="1.5"/><rect x="31" y="1" width="14" height="10" rx="1.5"/><rect x="1" y="12" width="14" height="10" rx="1.5"/><rect x="16" y="12" width="14" height="10" rx="1.5"/><rect x="31" y="12" width="14" height="10" rx="1.5"/><rect x="1" y="23" width="14" height="10" rx="1.5"/><rect x="16" y="23" width="14" height="10" rx="1.5"/><rect x="31" y="23" width="14" height="10" rx="1.5"/>',
  revista: '<rect x="1" y="1" width="44" height="15" rx="2.5"/><rect x="1" y="18" width="21" height="15" rx="2"/><rect x="24" y="18" width="21" height="15" rx="2"/>',
  polaroid: '<g transform="rotate(-6 12 16)"><rect x="3" y="3" width="18" height="24" rx="1.5"/><rect x="5.5" y="5.5" width="13" height="13" rx=".8"/></g><g transform="rotate(5 34 16)"><rect x="25" y="4" width="18" height="24" rx="1.5"/><rect x="27.5" y="6.5" width="13" height="13" rx=".8"/></g>',
  filme: '<rect x="0" y="3" width="46" height="2.5"/><rect x="0" y="28.5" width="46" height="2.5"/><rect x="2" y="8" width="12" height="18" rx="1.5"/><rect x="17" y="8" width="12" height="18" rx="1.5"/><rect x="32" y="8" width="12" height="18" rx="1.5"/>'
};
export const LIMITE_FOTO = 170000; // letras do JPEG em data: (a regra aceita até 240 mil)

const ms = (t) => (t?.toMillis ? t.toMillis() : typeof t === "number" ? t : 0);
export const deISO = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s || "") ? new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) : null);
// Quando o momento aconteceu (a data escolhida ou, sem ela, quando foi posto no salão).
export const quando = (m) => deISO(m.data)?.getTime() ?? ms(m.criadoEm);
export const ordenar = (lista) => [...lista].sort((a, b) => Number(!!b.fixado) - Number(!!a.fixado) || quando(b) - quando(a));

// Você segue a pessoa? Ela segue você? (relacoes/{seguidor}_{alvo})
export async function relacaoCom(fb, eu, uid) {
  if (eu === uid) return { euSigo: true, meSegue: true };
  const tem = (id) => fb.getDoc(fb.doc(fb.db, "relacoes", id)).then((s) => s.exists()).catch(() => false);
  const [euSigo, meSegue] = await Promise.all([tem(`${eu}_${uid}`), tem(`${uid}_${eu}`)]);
  return { euSigo, meSegue };
}
// As consultas que a pessoa pode fazer (uma por "quem vê": a regra confere cada uma).
function niveis(eu, uid, rel) {
  if (eu === uid) return [null];
  const l = ["todos"];
  if (rel.euSigo) l.push("seguidores");
  if (rel.euSigo && rel.meSegue) l.push("amigos");
  return l;
}
export async function lerMomentos(fb, eu, uid, rel, { limite = 60 } = {}) {
  const col = fb.collection(fb.db, "momentos");
  const res = await Promise.all(niveis(eu, uid, rel).map((v) => fb.getDocs(fb.query(col, fb.where("uid", "==", uid), ...(v ? [fb.where("ver", "==", v)] : []), fb.limit(limite)))
    .then((s) => s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }))).catch(() => [])));
  const mapa = new Map(res.flat().map((m) => [m.id, m]));
  return ordenar([...mapa.values()]);
}
export async function contarMomentos(fb, eu, uid, rel) {
  const col = fb.collection(fb.db, "momentos");
  const ns = await Promise.all(niveis(eu, uid, rel).map((v) => fb.getCountFromServer(fb.query(col, fb.where("uid", "==", uid), ...(v ? [fb.where("ver", "==", v)] : []))).then((r) => r.data().count).catch(() => 0)));
  return ns.reduce((a, b) => a + b, 0);
}
export function lerDestaquesFlash(fb, uid) {
  return fb.getDocs(fb.query(fb.collection(fb.db, "destaques"), fb.where("uid", "==", uid), fb.limit(30)))
    .then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => ms(b.atualizadoEm || b.criadoEm) - ms(a.atualizadoEm || a.criadoEm)))
    .catch(() => []);
}
export const fotoOk = (u) => typeof u === "string" && /^(data:image\/jpeg;base64,|https:\/\/firebasestorage\.googleapis\.com\/)/.test(u) ? u : "";

// Foto reduzida para o salão (JPEG, até LIMITE_FOTO letras).
export function reduzirFotoSalao(arquivo, limite = LIMITE_FOTO) {
  return new Promise((ok, erro) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let lado = 1280, q = 0.82, saida = "";
      for (let i = 0; i < 10; i++) {
        const k = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        saida = c.toDataURL("image/jpeg", q);
        if (saida.length <= limite) break;
        if (q > 0.62) q -= 0.08; else lado = Math.round(lado * 0.8);
      }
      saida.length <= limite ? ok(saida) : erro(new Error("grande"));
    };
    img.onerror = () => { URL.revokeObjectURL(url); erro(new Error("imagem")); };
    img.src = url;
  });
}

// ---------- cartão do Salão no perfil (no lugar da fileira de destaques) ----------
let estilo = false;
function css() {
  if (estilo) return; estilo = true;
  const s = document.createElement("style");
  s.textContent = `.pf-salao{display:grid;gap:10px;width:100%;margin:14px 0 2px;padding:12px;border-radius:18px;border:1px solid var(--line);background:linear-gradient(135deg,color-mix(in srgb,var(--accent,#00adee) 9%,var(--panel-2,transparent)),var(--panel-2,transparent) 60%);color:var(--text);text-align:left;text-decoration:none;font:inherit;cursor:pointer;box-sizing:border-box}
.pf-salao[hidden],.pf-corpo.sem-destaques .pf-salao{display:none}
.pf-salao .ps-cab{display:flex;align-items:center;gap:10px;min-width:0}
.pf-salao .ps-ic{flex:none;width:34px;height:34px;border-radius:11px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#00adee,#6d5bd0)}
.pf-salao .ps-ic svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.pf-salao .ps-tx{flex:1;min-width:0;display:grid;gap:1px}
.pf-salao .ps-tx b{font-size:14px;font-weight:800}
.pf-salao .ps-tx small{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pf-salao .ps-seta{flex:none;color:var(--muted);font-size:20px;line-height:1}
.pf-salao .ps-fotos{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
.pf-salao .ps-fotos i{position:relative;aspect-ratio:1;border-radius:12px;overflow:hidden;background:color-mix(in srgb,var(--text) 7%,transparent)}
.pf-salao .ps-fotos i.dq{border-radius:50%;box-shadow:0 0 0 2px var(--panel,#fff),0 0 0 3.5px color-mix(in srgb,var(--accent,#00adee) 70%,transparent)}
.pf-salao .ps-fotos img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.pf-salao .ps-fotos i.mais{display:grid;place-items:center;font-size:13px;font-weight:800;color:var(--muted)}`;
  document.head.appendChild(s);
}
const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const ICONE_SALAO = '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 15.5l5-5 4 4 3-3 6 6"/><circle cx="15.5" cy="8.5" r="1.6"/>';

// Monta (ou atualiza) o cartão dentro do .pf-corpo. "nome" = primeiro nome de quem é o perfil.
export async function salaoNoPerfil(fb, corpo, eu, uid, nome) {
  if (!corpo || !uid || !fb) return;
  css();
  let a = corpo.querySelector(".pf-salao");
  if (!a) { a = document.createElement("a"); a.className = "pf-salao"; a.hidden = true; corpo.appendChild(a); }
  a.href = eu === uid ? "social.html" : `social.html?uid=${encodeURIComponent(uid)}`;
  const rel = await relacaoCom(fb, eu, uid);
  const [lista, total, dqs] = await Promise.all([lerMomentos(fb, eu, uid, rel, { limite: 4 }), contarMomentos(fb, eu, uid, rel), lerDestaquesFlash(fb, uid)]);
  if (!a.isConnected) return;
  const meu = eu === uid;
  const fotos = lista.map((m) => fotoOk(m.foto)).filter(Boolean);
  if (!total && !dqs.length && !meu) { a.hidden = true; return; }
  const partes = [];
  if (total) partes.push(`${total} ${total === 1 ? "momento" : "momentos"}`);
  if (dqs.length) partes.push(`${dqs.length} ${dqs.length === 1 ? "destaque" : "destaques"} do Flash`);
  a.innerHTML = "";
  const cab = document.createElement("span"); cab.className = "ps-cab";
  const ic = document.createElement("span"); ic.className = "ps-ic"; ic.innerHTML = svg(ICONE_SALAO);
  const tx = document.createElement("span"); tx.className = "ps-tx";
  const b = document.createElement("b"); b.textContent = meu ? "Seu salão" : `Salão de ${nome || "Usuário"}`;
  const sm = document.createElement("small"); sm.textContent = partes.join(" · ") || (meu ? "Monte o seu: fotos favoritas e destaques do Flash" : "");
  tx.append(b, sm);
  const seta = document.createElement("span"); seta.className = "ps-seta"; seta.textContent = "›"; seta.setAttribute("aria-hidden", "true");
  cab.append(ic, tx, seta);
  a.appendChild(cab);
  const capas = [...fotos.map((u) => ["", u]), ...dqs.filter((d) => /^data:image\/jpeg;base64,/.test(d.capaMini || "")).map((d) => ["dq", d.capaMini])].slice(0, 4);
  if (capas.length) {
    const g = document.createElement("span"); g.className = "ps-fotos";
    capas.forEach(([cls, u]) => { const i = document.createElement("i"); if (cls) i.className = cls; const im = document.createElement("img"); im.src = u; im.alt = ""; im.loading = "lazy"; i.appendChild(im); g.appendChild(i); });
    const resto = total + dqs.length - capas.length;
    if (capas.length === 4 && resto > 0) { const ult = g.lastChild; ult.classList.add("mais"); ult.replaceChildren(document.createTextNode("+" + (resto + 1))); }
    a.appendChild(g);
  }
  a.setAttribute("aria-label", b.textContent + (partes.length ? ": " + partes.join(", ") : ""));
  a.hidden = false;
}
