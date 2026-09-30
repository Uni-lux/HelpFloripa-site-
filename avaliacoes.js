// =====================================================
// Avaliações do Help Floripa
// - avaliacoes/{id}: uma avaliação (1 a 5 estrelas + comentário)
//     p_{pedido}_c  cliente avalia o negócio      (1 vez por pedido)
//     p_{pedido}_v  negócio avalia o cliente      (1 vez por pedido)
//     d_{post}_{uid} alguém avalia uma publicação  (1 vez por publicação)
// - notas/{chave}: resumo (total, soma, n1..n5) de cada negócio (neg_),
//   de cada cliente (cli_), das publicações de alguém (pub_) e de cada publicação (post_).
// As regras do Firestore conferem que o resumo soma exatamente a avaliação nova.
// =====================================================

const TIPOS_NEGOCIO = { servicos: "Serviços", delivery: "Delivery", lojinha: "Loja", imoveis: "Imóveis" };
export const CHAVES_NEGOCIO = (uid) => Object.keys(TIPOS_NEGOCIO).map((t) => `neg_${uid}_${t}`);

// ---------- números ----------
export const media = (r) => (r && r.total ? r.soma / r.total : 0);
export const notaTexto = (v) => Number(v || 0).toFixed(1).replace(".", ",");
export function somar(lista) {
  const r = { total: 0, soma: 0, n1: 0, n2: 0, n3: 0, n4: 0, n5: 0 };
  lista.filter(Boolean).forEach((x) => {
    r.total += Number(x.total) || 0;
    r.soma += Number(x.soma) || 0;
    for (let i = 1; i <= 5; i++) r["n" + i] += Number(x["n" + i]) || 0;
  });
  return r;
}

// ---------- leitura dos resumos (com cache) ----------
const cache = new Map();
export function lerResumo(fbx, chave, { recarregar = false } = {}) {
  if (!fbx?.db || !chave) return Promise.resolve(null);
  if (recarregar || !cache.has(chave)) {
    cache.set(chave, fbx.getDoc(fbx.doc(fbx.db, "notas", chave)).then((s) => (s.exists() ? s.data() : null)).catch(() => null));
  }
  return cache.get(chave);
}
export async function lerResumos(fbx, chaves, opcoes) {
  const valores = await Promise.all(chaves.map((c) => lerResumo(fbx, c, opcoes)));
  return Object.fromEntries(chaves.map((c, i) => [c, valores[i]]));
}
export const esquecerResumo = (chave) => cache.delete(chave);

// Nota geral do perfil: média de todas as avaliações dos perfis de negócio.
// Sem nenhuma avaliação de negócio, vale a média das publicações.
export async function notaDoPerfil(fbx, uid) {
  const chaves = [...CHAVES_NEGOCIO(uid), `pub_${uid}`, `cli_${uid}`];
  const r = await lerResumos(fbx, chaves);
  const negocios = somar(CHAVES_NEGOCIO(uid).map((c) => r[c]));
  const pub = somar([r[`pub_${uid}`]]);
  const geral = negocios.total ? negocios : pub;
  return { geral, origem: negocios.total ? "negocios" : pub.total ? "publicacoes" : "", resumos: r, negocios, pub, cliente: somar([r[`cli_${uid}`]]) };
}

// ---------- gravação (transação: avaliação + resumos) ----------
export async function avaliar(fbx, euX, id, dados, chaves, autor = {}) {
  const nota = Math.max(1, Math.min(5, Math.round(Number(dados.nota) || 0)));
  const foto = String(autor.foto || "");
  const fotoOk = /^(data:image\/(jpeg|png|webp);base64,|https:\/\/firebasestorage\.googleapis\.com\/|https:\/\/lh3\.googleusercontent\.com\/)/i.test(foto) && foto.length < 200000;
  await fbx.runTransaction(fbx.db, async (tx) => {
    const refAval = fbx.doc(fbx.db, "avaliacoes", id);
    const ja = await tx.get(refAval);
    if (ja.exists()) throw Object.assign(new Error("Você já avaliou."), { code: "ja-avaliado" });
    const refs = chaves.map((k) => fbx.doc(fbx.db, "notas", k));
    const atuais = await Promise.all(refs.map((r) => tx.get(r)));
    tx.set(refAval, {
      ...dados, nota, comentario: String(dados.comentario || "").trim().slice(0, 500),
      autorId: euX.uid, autorNome: String(autor.nome || "").slice(0, 80), autorFoto: fotoOk ? foto : "",
      chaves, criadoEm: fbx.serverTimestamp()
    });
    refs.forEach((r, i) => {
      const a = atuais[i].exists() ? atuais[i].data() : null;
      if (!a) tx.set(r, { total: 1, soma: nota, n1: 0, n2: 0, n3: 0, n4: 0, n5: 0, [`n${nota}`]: 1, ultima: id, atualizadoEm: fbx.serverTimestamp() });
      else tx.set(r, { total: (a.total || 0) + 1, soma: (a.soma || 0) + nota, [`n${nota}`]: (a[`n${nota}`] || 0) + 1, ultima: id, atualizadoEm: fbx.serverTimestamp() }, { merge: true });
    });
  });
  chaves.forEach(esquecerResumo);
  return nota;
}
export async function jaAvaliou(fbx, id) {
  try { return (await fbx.getDoc(fbx.doc(fbx.db, "avaliacoes", id))).exists(); } catch { return false; }
}
export const linkAvaliacao = (pedidoId) => `${location.origin}/usuarios.html?avaliar=${encodeURIComponent(pedidoId)}`;
export function whatsAvaliacao(pedidoId, nomeNegocio) {
  const txt = `Olá! Obrigado por escolher ${nomeNegocio || "a gente"} no Help Floripa. Pode avaliar o atendimento? Leva 10 segundos: ${linkAvaliacao(pedidoId)}`;
  return `https://wa.me/?text=${encodeURIComponent(txt)}`;
}

// ---------- visual ----------
let cssPronto = false;
function css() {
  if (cssPronto || document.getElementById("hfAvalCss")) { cssPronto = true; return; }
  cssPronto = true;
  const st = document.createElement("style");
  st.id = "hfAvalCss";
  st.textContent = `
  .hf-estrelas { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 800; color: var(--text, #eef3f5); white-space: nowrap; line-height: 1; }
  .hf-estrelas .e { position: relative; display: inline-block; font-size: 1.05em; letter-spacing: 1px; color: rgba(140,160,171,.45); }
  .hf-estrelas .e b { position: absolute; inset: 0 auto 0 0; overflow: hidden; color: #f5b700; font-weight: inherit; }
  .hf-estrelas small { font-weight: 600; color: var(--muted, #8fa0ab); font-size: .92em; }
  .hf-estrelas.novo { color: var(--muted, #8fa0ab); font-weight: 700; }
  .hf-estrelas.clicavel { cursor: pointer; border-radius: 8px; padding: 2px 4px; margin: -2px -4px; }
  .hf-estrelas.clicavel:hover { background: rgba(245,183,0,.1); }
  .hf-aval-fundo { position: fixed; inset: 0; z-index: 9600; display: grid; place-items: center; padding: 20px; background: rgba(2,6,9,.78); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
  .hf-aval { width: min(480px, 100%); max-height: 90vh; overflow-y: auto; background: var(--panel, #10181d); color: var(--text, #eef3f5); border: 1px solid var(--line, #22313a); border-radius: 24px; padding: 20px; display: grid; gap: 14px; box-shadow: 0 30px 80px rgba(0,0,0,.6); }
  .hf-aval h3 { margin: 0; font-size: 20px; }
  .hf-aval p { margin: 0; color: var(--muted, #8fa0ab); font-size: 14px; }
  .hf-aval .topo { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
  .hf-aval .x { border: 0; background: rgba(140,160,171,.15); color: inherit; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-size: 18px; flex-shrink: 0; }
  .hf-aval .grande { display: flex; justify-content: center; gap: 6px; }
  .hf-aval .grande button { border: 0; background: none; font-size: 42px; line-height: 1; cursor: pointer; color: rgba(140,160,171,.4); padding: 2px; transition: transform .1s; }
  .hf-aval .grande button.on { color: #f5b700; }
  .hf-aval .grande button:active { transform: scale(.9); }
  .hf-aval .legenda { text-align: center; font-weight: 800; min-height: 20px; color: #f5b700; }
  .hf-aval textarea { width: 100%; box-sizing: border-box; min-height: 80px; resize: vertical; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--line, #22313a); background: var(--panel-2, #162128); color: inherit; font: inherit; font-size: 14px; }
  .hf-aval .acoes { display: flex; gap: 8px; }
  .hf-aval .acoes button, .hf-aval .acoes a { flex: 1; min-height: 44px; border-radius: 12px; border: 0; font: inherit; font-weight: 800; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; text-decoration: none; }
  .hf-aval .pri { background: #f5b700; color: #2b1d00; }
  .hf-aval .pri:disabled { opacity: .5; cursor: default; }
  .hf-aval .sec { background: rgba(140,160,171,.15); color: inherit; }
  .hf-aval .media { display: flex; align-items: center; gap: 16px; }
  .hf-aval .media .num { font-size: 44px; font-weight: 900; line-height: 1; }
  .hf-aval .media .hf-estrelas { font-size: 18px; }
  .hf-aval .barras { display: grid; gap: 6px; }
  .hf-aval .barra { display: grid; grid-template-columns: 28px 1fr 34px; align-items: center; gap: 8px; font-size: 13px; }
  .hf-aval .barra i { display: block; height: 8px; border-radius: 99px; background: rgba(140,160,171,.2); overflow: hidden; }
  .hf-aval .barra i b { display: block; height: 100%; background: #f5b700; border-radius: 99px; }
  .hf-aval .barra span:last-child { text-align: right; color: var(--muted, #8fa0ab); }
  .hf-aval h4 { margin: 4px 0 0; font-size: 12.5px; letter-spacing: .6px; text-transform: uppercase; color: var(--muted, #8fa0ab); }
  .hf-aval .fontes { display: grid; gap: 6px; }
  .hf-aval .fonte { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border-radius: 12px; background: var(--panel-2, #162128); font-size: 14px; }
  .hf-aval .fonte.principal { outline: 1px solid rgba(245,183,0,.5); }
  .hf-aval .fonte span:first-child { font-weight: 700; }
  .hf-aval .fonte em { font-style: normal; font-size: 11px; color: #f5b700; margin-left: 6px; font-weight: 800; }
  .hf-aval .coment { display: grid; gap: 4px; padding: 10px 0; border-bottom: 1px solid var(--line, #22313a); font-size: 14px; }
  .hf-aval .coment:last-child { border-bottom: 0; }
  .hf-aval .coment .quem { display: flex; justify-content: space-between; gap: 8px; color: var(--muted, #8fa0ab); font-size: 12.5px; }
  .hf-aval .coment .quem strong { color: var(--text, #eef3f5); }
  .hf-aval .vazio { color: var(--muted, #8fa0ab); font-size: 14px; text-align: center; padding: 8px 0; }
  @media (max-width: 560px) { .hf-aval-fundo { padding: 0; align-items: end; } .hf-aval { border-radius: 22px 22px 0 0; max-height: 92vh; } }`;
  document.head.appendChild(st);
}

// Estrelas (com meia estrela) + nota e quantidade. Sem avaliações: "Novo".
export function estrelas(resumo, { aoClicar, compacto = false, soEstrelas = false } = {}) {
  css();
  const el = document.createElement("span");
  el.className = "hf-estrelas";
  pintarEstrelas(el, resumo, { compacto, soEstrelas });
  if (aoClicar) {
    el.classList.add("clicavel");
    el.setAttribute("role", "button");
    el.tabIndex = 0;
    el.addEventListener("click", (e) => { e.stopPropagation(); aoClicar(); });
    el.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.stopPropagation(); aoClicar(); } });
  }
  return el;
}
export function pintarEstrelas(el, resumo, { compacto = false, soEstrelas = false } = {}) {
  el.replaceChildren();
  const total = Number(resumo?.total) || 0;
  const m = media(resumo);
  el.classList.toggle("novo", !total);
  const e = document.createElement("span");
  e.className = "e";
  e.textContent = compacto ? "★" : "★★★★★";
  const cheio = document.createElement("b");
  cheio.textContent = e.textContent;
  cheio.style.width = total ? `${compacto ? 100 : (m / 5) * 100}%` : "0%";
  e.appendChild(cheio);
  el.appendChild(e);
  if (!total) { el.appendChild(document.createTextNode(compacto ? "Novo" : "Sem avaliações")); el.title = "Ainda sem avaliações"; return; }
  if (soEstrelas) { el.title = `${Math.round(m)} de 5`; return; }
  el.appendChild(document.createTextNode(notaTexto(m)));
  const s = document.createElement("small");
  s.textContent = `(${total})`;
  el.appendChild(s);
  el.title = `Nota ${notaTexto(m)} de 5 · ${total} ${total === 1 ? "avaliação" : "avaliações"}`;
}

function janela() {
  css();
  const fundo = document.createElement("div");
  fundo.className = "hf-aval-fundo";
  fundo.setAttribute("role", "dialog");
  fundo.setAttribute("aria-modal", "true");
  const caixa = document.createElement("div");
  caixa.className = "hf-aval";
  fundo.appendChild(caixa);
  const fechar = () => { fundo.remove(); document.removeEventListener("keydown", tecla); };
  const tecla = (e) => { if (e.key === "Escape") fechar(); };
  fundo.addEventListener("click", (e) => { if (e.target === fundo) fechar(); });
  document.addEventListener("keydown", tecla);
  document.body.appendChild(fundo);
  return { caixa, fechar };
}
function topo(caixa, titulo, sub, fechar) {
  const t = document.createElement("div");
  t.className = "topo";
  const tx = document.createElement("div");
  const h = document.createElement("h3"); h.textContent = titulo;
  tx.appendChild(h);
  if (sub) { const p = document.createElement("p"); p.textContent = sub; tx.appendChild(p); }
  const x = document.createElement("button"); x.type = "button"; x.className = "x"; x.setAttribute("aria-label", "Fechar"); x.textContent = "✕";
  x.addEventListener("click", fechar);
  t.append(tx, x);
  caixa.appendChild(t);
}

const LEGENDAS = ["", "Muito ruim", "Ruim", "Regular", "Bom", "Excelente"];
// Janela para dar a nota. aoEnviar({nota, comentario}) grava; se der erro, a janela continua aberta.
export function abrirAvaliar({ titulo, sub, placeholder = "Conte como foi (opcional)", aoEnviar }) {
  const { caixa, fechar } = janela();
  topo(caixa, titulo, sub, fechar);
  let nota = 0;
  const grande = document.createElement("div");
  grande.className = "grande";
  const legenda = document.createElement("div");
  legenda.className = "legenda";
  const bots = [1, 2, 3, 4, 5].map((n) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = "★"; b.setAttribute("aria-label", `${n} ${n === 1 ? "estrela" : "estrelas"}`);
    b.addEventListener("click", () => { nota = n; bots.forEach((x, i) => x.classList.toggle("on", i < n)); legenda.textContent = LEGENDAS[n]; enviar.disabled = false; });
    return b;
  });
  grande.append(...bots);
  const txt = document.createElement("textarea");
  txt.maxLength = 500; txt.placeholder = placeholder;
  const acoes = document.createElement("div");
  acoes.className = "acoes";
  const cancelar = document.createElement("button"); cancelar.type = "button"; cancelar.className = "sec"; cancelar.textContent = "Agora não";
  cancelar.addEventListener("click", fechar);
  const enviar = document.createElement("button"); enviar.type = "button"; enviar.className = "pri"; enviar.textContent = "Enviar avaliação"; enviar.disabled = true;
  enviar.addEventListener("click", async () => {
    if (!nota) return;
    enviar.disabled = true; enviar.textContent = "Enviando...";
    try { await aoEnviar({ nota, comentario: txt.value.trim() }); fechar(); }
    catch (e) { enviar.disabled = false; enviar.textContent = "Enviar avaliação"; alert(e?.code === "ja-avaliado" ? "Você já avaliou." : e?.code === "permission-denied" ? "Não foi possível avaliar. Confirme seu e-mail e tente de novo." : "Não foi possível enviar agora. Tente de novo."); }
  });
  acoes.append(cancelar, enviar);
  caixa.append(grande, legenda, txt, acoes);
}

// Detalhamento: nota geral, quantas de cada estrela, de onde vêm as notas e comentários recentes.
// fontes: [{ rotulo, resumo, principal }]
export async function abrirDetalhamento({ fbx, titulo = "Avaliações", sub, geral, fontes = [], alvoId, filtroTipos = null, negocioId = null }) {
  const { caixa, fechar } = janela();
  topo(caixa, titulo, sub, fechar);
  const m = document.createElement("div");
  m.className = "media";
  const num = document.createElement("div"); num.className = "num"; num.textContent = geral?.total ? notaTexto(media(geral)) : "–";
  const lado = document.createElement("div");
  lado.style.display = "grid"; lado.style.gap = "6px";
  lado.appendChild(estrelas(geral));
  const qt = document.createElement("p");
  qt.textContent = geral?.total ? `${geral.total} ${geral.total === 1 ? "avaliação" : "avaliações"}` : "Ainda sem avaliações";
  lado.appendChild(qt);
  m.append(num, lado);
  caixa.appendChild(m);
  const barras = document.createElement("div");
  barras.className = "barras";
  for (let i = 5; i >= 1; i--) {
    const n = Number(geral?.["n" + i]) || 0;
    const b = document.createElement("div"); b.className = "barra";
    const l = document.createElement("span"); l.textContent = `${i}★`;
    const trilho = document.createElement("i"); const cheio = document.createElement("b");
    cheio.style.width = geral?.total ? `${(n / geral.total) * 100}%` : "0%";
    trilho.appendChild(cheio);
    const c = document.createElement("span"); c.textContent = String(n);
    b.append(l, trilho, c);
    barras.appendChild(b);
  }
  caixa.appendChild(barras);
  if (fontes.length) {
    const h = document.createElement("h4"); h.textContent = "De onde vêm as notas";
    const lista = document.createElement("div"); lista.className = "fontes";
    fontes.forEach((f) => {
      const d = document.createElement("div"); d.className = "fonte" + (f.principal ? " principal" : "");
      const r = document.createElement("span"); r.textContent = f.rotulo;
      if (f.principal) { const em = document.createElement("em"); em.textContent = "conta na nota"; r.appendChild(em); }
      d.append(r, estrelas(f.resumo));
      lista.appendChild(d);
    });
    caixa.append(h, lista);
  }
  if (fbx && alvoId) {
    const h = document.createElement("h4"); h.textContent = "Comentários recentes";
    const box = document.createElement("div");
    box.appendChild(Object.assign(document.createElement("div"), { className: "vazio", textContent: "Carregando..." }));
    caixa.append(h, box);
    try {
      const snap = await fbx.getDocs(fbx.query(fbx.collection(fbx.db, "avaliacoes"), fbx.where("alvoId", "==", alvoId), fbx.limit(60)));
      let lista = snap.docs.map((d) => d.data());
      if (filtroTipos) lista = lista.filter((a) => filtroTipos.includes(a.tipo));
      if (negocioId) lista = lista.filter((a) => a.negocioId === negocioId);
      lista.sort((a, b) => (b.criadoEm?.toMillis?.() ?? 0) - (a.criadoEm?.toMillis?.() ?? 0));
      box.replaceChildren();
      const rot = { negocio: "Atendimento", cliente: "Como cliente", publicacao: "Publicação" };
      const comTexto = lista.slice(0, 20);
      if (!comTexto.length) box.appendChild(Object.assign(document.createElement("div"), { className: "vazio", textContent: "Nenhum comentário ainda." }));
      comTexto.forEach((a) => {
        const c = document.createElement("div"); c.className = "coment";
        const quem = document.createElement("div"); quem.className = "quem";
        const nome = document.createElement("strong"); nome.textContent = a.autorNome || "Usuário";
        const info = document.createElement("span");
        const data = a.criadoEm?.toDate?.();
        info.textContent = [rot[a.tipo], data ? data.toLocaleDateString("pt-BR") : ""].filter(Boolean).join(" · ");
        quem.append(nome, info);
        c.appendChild(quem);
        c.appendChild(estrelas({ total: 1, soma: a.nota }, { soEstrelas: true }));
        if (a.comentario) { const p = document.createElement("div"); p.textContent = a.comentario; c.appendChild(p); }
        box.appendChild(c);
      });
    } catch { box.replaceChildren(Object.assign(document.createElement("div"), { className: "vazio", textContent: "Não foi possível carregar os comentários." })); }
  }
}

export { TIPOS_NEGOCIO };
