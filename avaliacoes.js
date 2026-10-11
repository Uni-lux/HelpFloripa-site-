// =====================================================
// Avaliações do Help Floripa
// - avaliacoes/{id}: uma avaliação (1 a 5 estrelas + comentário)
//     n_{negocio}_{cliente}  cliente avalia o negócio  (UMA por cliente em cada negócio; pode editar)
//     c_{negocio}_{cliente}  negócio avalia o cliente  (UMA por cliente em cada negócio; pode editar)
//     d_{post}_{uid}         alguém avalia uma publicação (1 vez por publicação)
//     p_{pedido}_c / p_{pedido}_v: modelo antigo (1 por pedido), só leitura — continuam contando.
// Quem pode avaliar um negócio (conferido aqui e nas regras do Firestore):
//   - conversou com o dono pelo chat e o dono respondeu (conversas.falaram);
//   - e-mail confirmado e conta com pelo menos 3 dias;
//   - não é o dono, não tem vínculo aceito no Social com ele e não há bloqueio.
// Pedido de avaliação enviado pelo negócio só marca "Atendimento confirmado": não libera notas extras.
// - notas/{chave}: resumo (total, soma, n1..n5) de cada negócio (neg_),
//   de cada cliente (cli_), das publicações de alguém (pub_) e de cada publicação (post_).
// As regras do Firestore conferem que o resumo soma exatamente a avaliação nova.
// =====================================================
import { docComValidade, esquecer } from "./leituras.js?v=1";

const TIPOS_NEGOCIO = { servicos: "Freelances", delivery: "Delivery", lojinha: "Loja", imoveis: "Imóveis" };
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
// As notas mudam pouco: a cópia do aparelho vale por 20 min (sem custo de leitura).
const cache = new Map();
const NOTAS_VALIDADE = 20 * 60000;
export function lerResumo(fbx, chave, { recarregar = false } = {}) {
  if (!fbx?.db || !chave) return Promise.resolve(null);
  if (recarregar || !cache.has(chave)) {
    if (recarregar) esquecer("d:notas/" + chave);
    cache.set(chave, docComValidade(fbx, ["notas", chave], NOTAS_VALIDADE).then((s) => (s.exists() ? s.data() : null)).catch(() => null));
  }
  return cache.get(chave);
}
export async function lerResumos(fbx, chaves, opcoes) {
  const valores = await Promise.all(chaves.map((c) => lerResumo(fbx, c, opcoes)));
  return Object.fromEntries(chaves.map((c, i) => [c, valores[i]]));
}
export const esquecerResumo = (chave) => { cache.delete(chave); esquecer("d:notas/" + chave); };

// Nota geral do perfil: média de todas as avaliações dos perfis de negócio.
// Sem nenhuma avaliação de negócio, vale a média das publicações.
// Estrelas que as publicações de alguém receberam (curtidas/{post}_{uid}, nota 1 a 5).
// A nota pode mudar, então a conta é feita na hora: quantas de cada estrela.
const cacheEstrelas = new Map();
export function estrelasDoAutor(fbx, uid, { recarregar = false } = {}) {
  if (!fbx?.db || !uid) return Promise.resolve(null);
  if (recarregar || !cacheEstrelas.has(uid)) {
    const col = fbx.collection(fbx.db, "curtidas");
    cacheEstrelas.set(uid, Promise.all([1, 2, 3, 4, 5].map((n) =>
      fbx.getCountFromServer(fbx.query(col, fbx.where("postAutorId", "==", uid), fbx.where("nota", "==", n))).then((x) => x.data().count).catch(() => 0)
    )).then((c) => {
      const r = { total: 0, soma: 0, n1: c[0], n2: c[1], n3: c[2], n4: c[3], n5: c[4] };
      c.forEach((q, i) => { r.total += q; r.soma += q * (i + 1); });
      return r;
    }));
  }
  return cacheEstrelas.get(uid);
}
export const esquecerEstrelasDoAutor = (uid) => cacheEstrelas.delete(uid);

export async function notaDoPerfil(fbx, uid) {
  const chaves = [...CHAVES_NEGOCIO(uid), `pub_${uid}`, `cli_${uid}`];
  const [r, est] = await Promise.all([lerResumos(fbx, chaves), estrelasDoAutor(fbx, uid)]);
  const negocios = somar(CHAVES_NEGOCIO(uid).map((c) => r[c]));
  const pub = somar([r[`pub_${uid}`], est]);
  const geral = negocios.total ? negocios : pub;
  return { geral, origem: negocios.total ? "negocios" : pub.total ? "publicacoes" : "", resumos: r, negocios, pub, cliente: somar([r[`cli_${uid}`]]) };
}

// ---------- gravação (transação: avaliação + resumos) ----------
// Avaliação nova: soma no resumo. Avaliação "n_"/"c_" que já existe (do mesmo autor):
// é uma EDIÇÃO — troca a nota antiga pela nova no resumo, sem contar de novo.
export async function avaliar(fbx, euX, id, dados, chaves, autor = {}) {
  const nota = Math.max(1, Math.min(5, Math.round(Number(dados.nota) || 0)));
  const foto = String(autor.foto || "");
  const fotoOk = /^(data:image\/(jpeg|png|webp);base64,|https:\/\/firebasestorage\.googleapis\.com\/|https:\/\/lh3\.googleusercontent\.com\/)/i.test(foto) && foto.length < 200000;
  const editavel = /^[nc]_/.test(id);
  await fbx.runTransaction(fbx.db, async (tx) => {
    const refAval = fbx.doc(fbx.db, "avaliacoes", id);
    const ja = await tx.get(refAval);
    const antes = ja.exists() ? ja.data() : null;
    if (antes && (!editavel || antes.autorId !== euX.uid)) throw Object.assign(new Error("Você já avaliou."), { code: "ja-avaliado" });
    const refs = chaves.map((k) => fbx.doc(fbx.db, "notas", k));
    const atuais = await Promise.all(refs.map((r) => tx.get(r)));
    const comentario = String(dados.comentario || "").trim().slice(0, 500);
    if (antes) {
      const mud = { nota, comentario, atualizadoEm: fbx.serverTimestamp() };
      if (dados.pedidoId && !antes.pedidoId) mud.pedidoId = dados.pedidoId;
      tx.update(refAval, mud);
      if (antes.nota !== nota) refs.forEach((r, i) => {
        const a = atuais[i].exists() ? atuais[i].data() : null;
        if (!a) return;
        tx.set(r, { soma: (a.soma || 0) - antes.nota + nota, [`n${antes.nota}`]: Math.max(0, (a[`n${antes.nota}`] || 0) - 1), [`n${nota}`]: (a[`n${nota}`] || 0) + 1, ultima: id, atualizadoEm: fbx.serverTimestamp() }, { merge: true });
      });
      return;
    }
    tx.set(refAval, {
      ...dados, nota, comentario,
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

// ---------- quem pode avaliar / reclamar ----------
export const DIAS_CONTA = 3;
export const idConversa = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);
// Confere, antes de abrir a janela, o mesmo que as regras do Firestore conferem.
// Devolve { ok, motivo, existente (avaliação n_ do cliente), confirmado }.
export async function podeAvaliarNegocio(fbx, euX, n, { exigirResposta = true } = {}) {
  const donoId = n.donoId || String(n.id || "").split("_")[0];
  const negocioId = n.id || `${donoId}_${n.tipo}`;
  if (donoId === euX.uid) return { ok: false, motivo: "Você não pode avaliar o seu próprio negócio." };
  if (!euX.emailVerified) return { ok: false, motivo: "Confirme seu e-mail para avaliar ou reclamar." };
  const nome = n.nome || "este negócio";
  const [usuario, conversa, vinculo, bloq1, bloq2, existente, legado] = await Promise.all([
    fbx.getDoc(fbx.doc(fbx.db, "usuarios", euX.uid)).catch(() => null),
    fbx.getDoc(fbx.doc(fbx.db, "conversas", idConversa(euX.uid, donoId))).catch(() => null),
    fbx.getDoc(fbx.doc(fbx.db, "vinculos", idConversa(euX.uid, donoId))).catch(() => null),
    fbx.getDoc(fbx.doc(fbx.db, "bloqueios", `${euX.uid}_${donoId}`)).catch(() => null),
    fbx.getDoc(fbx.doc(fbx.db, "bloqueios", `${donoId}_${euX.uid}`)).catch(() => null),
    fbx.getDoc(fbx.doc(fbx.db, "avaliacoes", `n_${negocioId}_${euX.uid}`)).catch(() => null),
    fbx.getDocs(fbx.query(fbx.collection(fbx.db, "avaliacoes"), fbx.where("autorId", "==", euX.uid), fbx.where("negocioId", "==", negocioId), fbx.limit(5))).catch(() => ({ docs: [] }))
  ]);
  const criado = usuario?.exists() ? usuario.data().criadoEm?.toMillis?.() : 0;
  if (usuario?.exists() && !criado) {
    // Cadastro antigo sem a data: começa a contar agora (as regras só aceitam a data de agora).
    fbx.setDoc(fbx.doc(fbx.db, "usuarios", euX.uid), { criadoEm: fbx.serverTimestamp() }, { merge: true }).catch(() => {});
    return { ok: false, motivo: `Para evitar contas falsas, avaliar e reclamar fica liberado ${DIAS_CONTA} dias depois do cadastro. Sua conta começou a contar agora.` };
  }
  if (!criado || Date.now() - criado < DIAS_CONTA * 864e5) {
    const falta = Math.max(1, Math.ceil((DIAS_CONTA * 864e5 - (Date.now() - criado)) / 864e5));
    return { ok: false, motivo: `Para evitar contas falsas, contas novas podem avaliar e reclamar depois de ${DIAS_CONTA} dias. Falta${falta > 1 ? "m" : ""} ${falta} ${falta === 1 ? "dia" : "dias"}.` };
  }
  if (bloq1?.exists() || bloq2?.exists()) return { ok: false, motivo: "Não é possível avaliar: há um bloqueio entre vocês." };
  if (vinculo?.exists() && vinculo.data().status === "aceito") return { ok: false, motivo: "Vocês estão ligados no Social. Para ser justo, avaliações entre conhecidos não contam." };
  const falaram = conversa?.exists() ? conversa.data().falaram || {} : {};
  if (!falaram[euX.uid] || (exigirResposta && !falaram[donoId])) {
    return { ok: false, motivo: exigirResposta
      ? `Para avaliar, converse com ${nome} pelo chat do Help Floripa e espere a resposta. Assim só avalia quem foi atendido de verdade.`
      : `Para reclamar, mande antes uma mensagem para ${nome} pelo chat do Help Floripa.` };
  }
  if (legado.docs.some((d) => d.id.startsWith("p_") && d.data().tipo === "negocio")) return { ok: false, motivo: "Você já avaliou este negócio." };
  const ex = existente?.exists() ? existente.data() : null;
  return { ok: true, existente: ex, negocioId, donoId };
}

// Fluxo completo de "Avaliar" um negócio (perfil, chat ou link). pedidoId marca "Atendimento confirmado".
export async function avaliarNegocio(fbx, euX, n, { pedidoId = "", autor = {}, aoAvaliar } = {}) {
  const r = await podeAvaliarNegocio(fbx, euX, n);
  if (!r.ok) { avisar(r.motivo); return false; }
  const ex = r.existente;
  abrirAvaliar({
    titulo: ex ? `Editar sua avaliação de ${n.nome || "o negócio"}` : `Avalie ${n.nome || "o atendimento"}`,
    sub: ex ? "Você já avaliou. A nota nova substitui a anterior (cada cliente conta uma vez)." : "Cada cliente avalia uma vez cada negócio. Se voltar a comprar, você pode atualizar a nota.",
    reclamacao: true, notaInicial: ex?.nota || 0, comentarioInicial: ex?.comentario || "",
    textoBotao: ex ? "Salvar nova nota" : "Enviar avaliação",
    aoEnviar: async ({ nota, comentario }) => {
      const dados = { tipo: "negocio", alvoId: r.donoId, negocioId: r.negocioId, nota, comentario };
      if (pedidoId) dados.pedidoId = pedidoId;
      await avaliar(fbx, euX, `n_${r.negocioId}_${euX.uid}`, dados, [`neg_${r.negocioId}`], autor);
      aoAvaliar?.(nota, !!ex);
    }
  });
  return true;
}
// Negócio avalia o cliente: também uma por cliente em cada negócio (pode editar).
export async function avaliarCliente(fbx, euX, negocioId, clienteId, { nomeCliente = "cliente", pedidoId = "", autor = {}, aoAvaliar } = {}) {
  let ex = null;
  try { const s = await fbx.getDoc(fbx.doc(fbx.db, "avaliacoes", `c_${negocioId}_${clienteId}`)); ex = s.exists() ? s.data() : null; } catch {}
  abrirAvaliar({
    titulo: ex ? `Editar avaliação de ${nomeCliente}` : `Avaliar ${nomeCliente}`,
    sub: "Como foi atender este cliente? Cada negócio avalia cada cliente uma vez (dá para atualizar).",
    notaInicial: ex?.nota || 0, comentarioInicial: ex?.comentario || "", textoBotao: ex ? "Salvar nova nota" : "Enviar avaliação",
    aoEnviar: async ({ nota, comentario }) => {
      const dados = { tipo: "cliente", alvoId: clienteId, negocioId, nota, comentario };
      if (pedidoId) dados.pedidoId = pedidoId;
      await avaliar(fbx, euX, `c_${negocioId}_${clienteId}`, dados, [`cli_${clienteId}`], autor);
      aoAvaliar?.(nota, !!ex);
    }
  });
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
  .hf-aval .hf-aval-topo { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
  .hf-aval .x { border: 0; background: rgba(140,160,171,.15); color: inherit; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-size: 18px; flex-shrink: 0; }
  .hf-aval .grande { display: flex; justify-content: center; gap: 6px; }
  .hf-aval .grande button { border: 0; background: none; font-size: 42px; line-height: 1; cursor: pointer; color: rgba(140,160,171,.4); padding: 2px; transition: transform .1s; }
  .hf-aval .grande button.on { color: #f5b700; }
  .hf-aval .grande button:active { transform: scale(.9); }
  .hf-aval .aviso { padding: 10px 12px; border-radius: 12px; font-size: 13px; line-height: 1.4; background: rgba(245,165,36,.14); color: inherit; border: 1px solid rgba(245,165,36,.4); }
  .hf-aval .aviso[hidden] { display: none; }
  .hf-aval .link-rec { justify-self: start; font-size: 13.5px; font-weight: 800; color: #f5a524; text-decoration: none; }
  .hf-aval .link-rec:hover { text-decoration: underline; }
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
  // Esc fecha só esta janela (e não o perfil/painel que está por baixo).
  const fechar = () => { fundo.remove(); document.removeEventListener("keydown", tecla, true); };
  const tecla = (e) => { if (e.key === "Escape") { e.stopPropagation(); fechar(); } };
  fundo.addEventListener("click", (e) => { if (e.target === fundo) fechar(); });
  document.addEventListener("keydown", tecla, true);
  document.body.appendChild(fundo);
  return { caixa, fechar };
}
function topo(caixa, titulo, sub, fechar) {
  const t = document.createElement("div");
  t.className = "hf-aval-topo";
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
// reclamacao: true nas avaliações de negócio (notas 1 e 2 vão para a página de Reclamações).
export function abrirAvaliar({ titulo, sub, placeholder = "Conte como foi (opcional)", aoEnviar, reclamacao = false, notaInicial = 0, comentarioInicial = "", textoBotao = "Enviar avaliação" }) {
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
    b.addEventListener("click", () => {
      nota = n; bots.forEach((x, i) => x.classList.toggle("on", i < n)); legenda.textContent = LEGENDAS[n]; enviar.disabled = false;
      aviso.hidden = !(reclamacao && n <= 2);
      if (reclamacao && n <= 2) txt.placeholder = "Conte o que aconteceu. Sua avaliação aparece em Reclamações e o negócio pode responder.";
    });
    return b;
  });
  grande.append(...bots);
  const txt = document.createElement("textarea");
  txt.maxLength = 500; txt.placeholder = placeholder;
  const aviso = document.createElement("div");
  aviso.className = "aviso"; aviso.hidden = true;
  aviso.textContent = "Notas de 1 e 2 estrelas viram uma reclamação pública na página Reclamações. O negócio pode responder e você marca quando for resolvido.";
  const acoes = document.createElement("div");
  acoes.className = "acoes";
  const cancelar = document.createElement("button"); cancelar.type = "button"; cancelar.className = "sec"; cancelar.textContent = "Agora não";
  cancelar.addEventListener("click", fechar);
  const enviar = document.createElement("button"); enviar.type = "button"; enviar.className = "pri"; enviar.textContent = textoBotao; enviar.disabled = true;
  enviar.addEventListener("click", async () => {
    if (!nota) return;
    enviar.disabled = true; enviar.textContent = "Enviando...";
    try { await aoEnviar({ nota, comentario: txt.value.trim() }); fechar(); }
    catch (e) { enviar.disabled = false; enviar.textContent = textoBotao; alert(e?.code === "ja-avaliado" ? "Você já avaliou." : e?.code === "permission-denied" ? "Não foi possível avaliar. Confirme seu e-mail e tente de novo." : "Não foi possível enviar agora. Tente de novo."); }
  });
  acoes.append(cancelar, enviar);
  caixa.append(grande, legenda, aviso, txt, acoes);
  if (comentarioInicial) txt.value = comentarioInicial;
  if (notaInicial >= 1 && notaInicial <= 5) bots[notaInicial - 1].click();
}
// Aviso simples (quando não pode avaliar ou reclamar), no mesmo visual da janela.
export function avisar(texto, titulo = "Ainda não dá") {
  const { caixa, fechar } = janela();
  topo(caixa, titulo, "", fechar);
  const p = document.createElement("p"); p.textContent = texto; p.style.color = "inherit"; p.style.lineHeight = "1.5";
  const acoes = document.createElement("div"); acoes.className = "acoes";
  const ok = document.createElement("button"); ok.type = "button"; ok.className = "pri"; ok.textContent = "Entendi";
  ok.addEventListener("click", fechar);
  acoes.appendChild(ok);
  caixa.append(p, acoes);
  ok.focus();
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
  if (negocioId) {
    const a = document.createElement("a");
    a.className = "link-rec"; a.href = `reclamacoes.html?negocio=${encodeURIComponent(negocioId)}`;
    a.textContent = "Ver reclamações e respostas deste negócio";
    caixa.appendChild(a);
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
        // O nome gravado na avaliação é escrito por quem avaliou: mostra o nome real do perfil.
        if (a.autorId) fbx.getDoc(fbx.doc(fbx.db, "perfis_publicos", a.autorId)).then((s) => { if (!s.exists()) { nome.textContent = "Ex-usuário"; return; } const n = s.data().nome; if (n) nome.textContent = n; }).catch(() => {});
        const info = document.createElement("span");
        const data = a.criadoEm?.toDate?.();
        info.textContent = [a.pedidoId ? "✓ Atendimento confirmado" : rot[a.tipo], data ? data.toLocaleDateString("pt-BR") : "", a.atualizadoEm ? "editada" : ""].filter(Boolean).join(" · ");
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
