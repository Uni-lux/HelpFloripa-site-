// =====================================================
// Painel de notificações (gaveta lateral)
// O sino do topo abre este painel na própria página, em vez de sair para
// notificacoes.html. Mostra o mesmo que a página de notificações:
// mensagens, seguidores (com Seguir de volta), pedidos do social (com Aceitar/Recusar), estrelas,
// comentários, respostas, avaliações, reclamações e o plano perto de vencer. Como nas redes
// sociais: estrelas na mesma publicação e seguidores viram uma linha só, as linhas ficam em
// Novas/Hoje/Ontem/Últimos 7 dias e a miniatura da publicação aparece à direita.
// Ao abrir, os avisos contam como vistos (continuam destacados até fechar).
// Funciona em qualquer página com o sino no topo (a[href="notificacoes.html"]
// dentro de .topo), menos na própria página de notificações.
// =====================================================
import { buscarReclamacoes, TEXTO_RECLAMACAO, linkReclamacao } from "./avisos-reclamacoes.js?v=16";
import { fotoSegura } from "./seguranca.js?v=1";
import { buscarItensEquipe, TEXTO_EQUIPE, linkEquipe, seloOficial, SUPORTE } from "./avisos-equipe.js?v=1";
import { enquetesEncerradas, textoEnqueteFim } from "./enquetes.js?v=3";
import { avisoPlano, textoPlano, PLANOS } from "./planos-base.js?v=3";
import { docsComValidade, esquecer } from "./leituras.js?v=1";
import { agrupar, secoes, nomesDoGrupo, textoDoGrupo } from "./avisos-agrupar.js?v=1";

const ms = (ts) => ts?.toMillis?.() ?? (typeof ts === "number" ? ts : 0);
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const iniciais = (n) => { const p = String(n || "?").trim().split(/\s+/); return ((p[0]?.[0] || "?") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase(); };

const ICONES = {
  sino: '<path d="M18 9.5a6 6 0 00-12 0c0 6.5-2.5 8-2.5 8h17S18 16 18 9.5z"/><path d="M10.2 20.5a2 2 0 003.6 0"/>',
  fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
  checks: '<path d="M2.5 12.5l4 4L15 8M9.5 16.5l1 1L21.5 7"/>',
  seta: '<path d="M9 5l7 7-7 7"/>',
  pessoa: '<circle cx="10" cy="8.5" r="3.8"/><path d="M3.5 20c1-3.4 3.6-5.3 6.5-5.3s5.5 1.9 6.5 5.3M18.5 8v6M15.5 11h6"/>',
  estrela: '<path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8z"/>',
  chat: '<path d="M20.5 11.6c0 4.3-3.8 7.6-8.5 7.6-1.2 0-2.3-.2-3.3-.6L4 20l1.2-3.6c-1.1-1.3-1.7-3-1.7-4.8C3.5 7.4 7.3 4 12 4s8.5 3.4 8.5 7.6z"/>',
  fio: '<path d="M3 15c3-6 6 4 9-2s6 4 9-2"/><circle cx="12" cy="13" r="1.6" fill="currentColor"/>',
  envelope: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
  alerta: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.5h.01"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  suporte: '<path d="M4.5 13v-1.5a7.5 7.5 0 0115 0V13"/><rect x="3.5" y="13" width="4" height="6" rx="1.5"/><rect x="16.5" y="13" width="4" height="6" rx="1.5"/><path d="M18.5 19c0 1.4-1.6 2-4 2h-1.5"/>',
  caixa: '<path d="M5 4.5h14a1.5 1.5 0 011.5 1.5v10a1.5 1.5 0 01-1.5 1.5h-6.5L8 21v-3.5H5A1.5 1.5 0 013.5 16V6A1.5 1.5 0 015 4.5z"/><path d="M10 9.2a2 2 0 113 1.7c-.6.4-1 .8-1 1.5M12 14.6h.01"/>',
  enquete: '<rect x="4" y="5" width="16" height="3.5" rx="1.75"/><rect x="4" y="10.25" width="11" height="3.5" rx="1.75"/><rect x="4" y="15.5" width="7" height="3.5" rx="1.75"/>',
  megafone: '<path d="M4 10v4h3l6 4V6L7 10H4z"/><path d="M16.5 9a4 4 0 010 6M19 6.5a7.5 7.5 0 010 11"/>',
  selo: '<path d="M12 3l2.4 1.8 3-.2.9 2.9 2.4 1.8-1 2.8 1 2.8-2.4 1.8-.9 2.9-3-.2L12 21l-2.4-1.8-3 .2-.9-2.9-2.4-1.8 1-2.8-1-2.8 2.4-1.8.9-2.9 3 .2z"/><path d="M9 12l2 2 4-4"/>'
};
const svg = (nome, cls = "") => {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true");
  s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", "2");
  s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round");
  if (cls) s.setAttribute("class", cls);
  s.innerHTML = ICONES[nome] || "";
  return s;
};

// Tipo de aviso -> cor, ícone e filtro (aba)
const TIPOS = {
  mensagem: { cor: "#1fa855", ic: "envelope", aba: "mensagens" },
  seguidor: { cor: "#00adee", ic: "pessoa", aba: "social" },
  social: { cor: "#e0457b", ic: "fio", aba: "social" },
  curtida: { cor: "#f5b700", ic: "estrela", aba: "publicacoes" },
  comentario: { cor: "#7c5cff", ic: "chat", aba: "publicacoes" },
  resposta: { cor: "#7c5cff", ic: "chat", aba: "publicacoes" },
  reacao: { cor: "#e0457b", ic: "chat", aba: "publicacoes" },
  marcacao: { cor: "#00adee", ic: "pessoa", aba: "publicacoes" },
  enquete: { cor: "#7c5cff", ic: "enquete", aba: "publicacoes" },
  caixa: { cor: "#ff7a1a", ic: "caixa", aba: "publicacoes" },
  reclamacao: { cor: "#ef4444", ic: "alerta", aba: "negocios" },
  "reclamacao-resp": { cor: "#ff7a1a", ic: "chat", aba: "negocios" },
  "reclamacao-ok": { cor: "#2fbf71", ic: "check", aba: "negocios" },
  avaliacao: { cor: "#f5b700", ic: "estrela", aba: "negocios" },
  plano: { cor: "#7c3aed", ic: "selo", aba: "negocios" },
  suporte: { cor: "#00adee", ic: "suporte", aba: "suporte" },
  aviso: { cor: "#7c5cff", ic: "megafone", aba: "suporte" }
};
const ABAS = [["tudo", "Tudo"], ["mensagens", "Mensagens"], ["publicacoes", "Publicações"], ["social", "Social"], ["negocios", "Negócios"], ["suporte", "Suporte"]];
const VINCULOS = { duo: "Duo", namoro: "Namorado(a)", casamento: "Cônjuge", melhor_amigo: "Melhor amigo(a)", amigo: "Amigo(a)", irmao: "Irmão(ã)", pai_mae: "Pai/Mãe", filho: "Filho(a)", primo: "Primo(a)", tio: "Tio(a)", sobrinho: "Sobrinho(a)", avo: "Avô/Avó", neto: "Neto(a)", parceiro: "Parceiro(a) de trabalho" };
const TIPOS_DUO = ["duo", "namoro", "casamento"];

function texto(i) {
  switch (i.tipo) {
    case "mensagem": return "enviou uma mensagem";
    case "seguidor": return "começou a seguir você";
    case "social":
      if (i.pendente) return `quer adicionar você como ${(VINCULOS[i.tipoParaMim] || "vínculo").toLowerCase()}`;
      return i.aceitoPorMim ? `agora está no seu social: ${VINCULOS[i.tipoParaMim] || "vínculo"}` : `aceitou seu pedido: ${VINCULOS[i.tipoParaMim] || "vínculo"}`;
    case "curtida": return `deu ${"★".repeat(i.nota)}${"☆".repeat(Math.max(0, 5 - i.nota))} na sua publicação`;
    case "comentario": return "comentou na sua publicação";
    case "resposta": return "respondeu seu comentário";
    case "reacao": return `reagiu com ${i.reacao || "❤️"} ao seu comentário`;
    case "marcacao": return "marcou você numa publicação";
    case "caixa": return "respondeu sua caixa de perguntas";
    case "enquete": return i.souAutor ? "terminou. Veja o resultado." : textoEnqueteFim(i).titulo;
    case "aviso": case "suporte": return TEXTO_EQUIPE(i);
    case "plano": return textoPlano(i);
    default: return TEXTO_RECLAMACAO[i.tipo] ? TEXTO_RECLAMACAO[i.tipo](i) : "";
  }
}
function tempo(t) {
  if (!t) return "";
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  if (s < 604800) return `${Math.floor(s / 86400)} d`;
  return new Date(t).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

// ---------- dados ----------
let fs = null, db = null, eu = null;
async function prontoFirebase() {
  for (let i = 0; i < 100 && (!window.firebaseAuth || !window.firebaseDb); i++) await new Promise((r) => setTimeout(r, 50));
  if (!window.firebaseAuth || !window.firebaseDb) return false;
  if (!fs) {
    const [auth, firestore] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
    ]);
    fs = firestore; db = window.firebaseDb;
    eu = await new Promise((ok) => { const parar = auth.onAuthStateChanged(window.firebaseAuth, (u) => { parar(); ok(u); }); });
  }
  return !!eu;
}
async function carregar() {
  const uid = eu.uid;
  const ler = (col, ...f) => fs.getDocs(fs.query(fs.collection(db, col), ...f, fs.limit(60))).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }))).catch(() => []);
  const usuario = await fs.getDoc(fs.doc(db, "usuarios", uid)).catch(() => null);
  const [seg, curt, com, resp, vin, conv, recl, equipe, reac, marc, caixas] = await Promise.all([
    ler("relacoes", fs.where("tipo", "==", "seguir"), fs.where("alvoId", "==", uid)),
    ler("curtidas", fs.where("postAutorId", "==", uid)),
    ler("comentarios", fs.where("postAutorId", "==", uid)),
    ler("comentarios", fs.where("respostaAutorId", "==", uid)),
    ler("vinculos", fs.where("participantes", "array-contains", uid)),
    ler("conversas", fs.where("participantes", "array-contains", uid)),
    buscarReclamacoes(fs, db, uid).catch(() => []),
    buscarItensEquipe(fs, db, uid, (usuario?.exists() ? usuario.data().suporteLido : null) || {}).catch(() => []),
    ler("curtidas_comentarios", fs.where("comentarioAutorId", "==", uid)),
    ler("diario", fs.where("marcados", "array-contains", uid)),
    ler("caixa_respostas", fs.where("autorId", "==", uid))
  ]);
  const dados = usuario?.exists() ? usuario.data() : {};
  const restritos = new Set(dados.restritos || []);
  const itens = [];
  caixas.forEach((r) => itens.push({ tipo: "caixa", id: "x_" + r.id, anonima: !!r.anonima, uid: r.anonima ? "" : r.uid, nome: r.anonima ? "Anônimo" : r.nome, foto: r.anonima ? "" : r.foto, detalhe: r.texto, quando: ms(r.criadoEm) }));
  // Enquetes que terminaram (minhas e em que votei)
  (await enquetesEncerradas(fs, db, uid, dados).catch(() => [])).forEach((x) => itens.push({ ...x, ...(x.souAutor ? { nome: "Sua enquete", foto: dados.fotoPerfil || "" } : {}), detalhe: textoEnqueteFim(x).detalhe }));
  seg.forEach((r) => itens.push({ tipo: "seguidor", id: "s_" + r.id, uid: r.seguidorId, quando: ms(r.criadoEm) }));
  curt.filter((c) => c.uid !== uid && Number(c.nota) > 0).forEach((c) => itens.push({ tipo: "curtida", id: "c_" + c.id, uid: c.uid, nota: Number(c.nota), postId: c.postId, quando: Math.max(ms(c.criadoEm), ms(c.atualizadoEm)) }));
  com.filter((c) => c.autorId !== uid).forEach((c) => itens.push({ tipo: "comentario", id: "m_" + c.id, uid: c.autorId, nome: c.nome, foto: c.foto, detalhe: c.texto, postId: c.postId, quando: ms(c.criadoEm) }));
  reac.filter((r) => r.uid !== uid).forEach((r) => itens.push({ tipo: "reacao", id: "e_" + r.id, uid: r.uid, reacao: r.reacao || "❤️", quando: ms(r.criadoEm) }));
  marc.filter((p) => p.autorId !== uid && (p.agendadoPara?.toMillis?.() ?? 0) <= Date.now()).forEach((p) => itens.push({ tipo: "marcacao", id: "k_" + p.id, uid: p.autorId, postId: p.id, quando: ms(p.criadoEm) }));
  resp.filter((c) => c.autorId !== uid && c.postAutorId !== uid).forEach((c) => itens.push({ tipo: "resposta", id: "r_" + c.id, uid: c.autorId, nome: c.nome, foto: c.foto, detalhe: c.texto, postId: c.postId, quando: ms(c.criadoEm) }));
  vin.forEach((v) => {
    const outro = (v.participantes || []).find((x) => x !== uid);
    const pendente = v.status !== "aceito";
    if (pendente && v.para === uid) itens.push({ tipo: "social", id: v.id, vinculoId: v.id, uid: outro, pendente: true, tipoParaMim: v.tipoPara, quando: ms(v.criadoEm) });
    else if (!pendente && v.de === uid) itens.push({ tipo: "social", id: v.id, vinculoId: v.id, uid: outro, pendente: false, tipoParaMim: v.tipoDe, quando: ms(v.aceitoEm) });
  });
  conv.forEach((c) => {
    const outro = (c.participantes || []).find((x) => x !== uid) || uid;
    const lido = Math.max(ms(c.lidoEm?.[uid]), ms(c.vistoEm?.[uid]), ms(c.ocultaPara?.[uid]));
    if (c.ultimaMensagemRemetenteId && c.ultimaMensagemRemetenteId !== uid && ms(c.atualizadoEm) > lido) itens.push({ tipo: "mensagem", id: c.id, conversaId: c.id, uid: outro, detalhe: c.ultimaMensagem || "", quando: ms(c.atualizadoEm), naoLida: true });
  });
  recl.forEach((x) => itens.push({ ...x }));
  equipe.forEach((x) => itens.push({ ...x }));
  const plano = await avisoPlano({ ...fs, db }, uid).catch(() => null);
  if (plano) itens.push(plano);
  // Miniatura da publicação (estrelas, comentários, respostas, marcações): até 20 publicações.
  const posts = [...new Set(itens.filter((i) => i.postId).sort((a, b) => b.quando - a.quando).map((i) => i.postId))].slice(0, 20);
  const minis = new Map();
  await Promise.all(posts.map(async (id) => {
    try { const s = await fs.getDoc(fs.doc(db, "diario", id)); const p = s.exists() ? s.data() : null; const u = p && p.mediaTipo !== "video" ? fotoSegura(p.mediaUrl || p.midias?.[0]) : ""; minis.set(id, p ? { foto: u, texto: p.texto || "" } : null); } catch {}
  }));
  itens.forEach((i) => { if (i.postId && minis.has(i.postId)) i.mini = minis.get(i.postId); });
  // Quem eu já sigo (para o "Seguir de volta"): a mesma cópia de 15 min das páginas da rede.
  try {
    const snap = await docsComValidade({ ...fs, db }, "seguindo-" + uid, fs.query(fs.collection(db, "relacoes"), fs.where("tipo", "==", "seguir"), fs.where("seguidorId", "==", uid), fs.limit(500)), 15 * 60000);
    sigo = new Set(snap.docs.map((d) => d.data().alvoId));
  } catch { sigo = null; }
  // Nomes e fotos de quem ainda não veio junto
  const faltam = [...new Set(itens.filter((i) => i.uid && !i.nome).map((i) => i.uid))].slice(0, 40);
  const perfis = new Map();
  await Promise.all(faltam.map(async (u) => { try { const s = await fs.getDoc(fs.doc(db, "perfis_publicos", u)); perfis.set(u, s.exists() ? s.data() : {}); } catch { perfis.set(u, {}); } }));
  itens.forEach((i) => { const p = perfis.get(i.uid); if (p) { i.nome = i.nome || p.nome; i.foto = i.foto || p.fotoPerfil; } i.nome = i.nome || "Usuário"; });
  return { visto: ms(dados.notificacoesVistasEm), itens: itens.filter((i) => i.quando && !restritos.has(i.uid)).sort((a, b) => b.quando - a.quando) };
}

// ---------- visual ----------
const CSS = `
.pa-fundo { position: fixed; inset: 0; z-index: 9500; background: rgba(2, 8, 14, .5); opacity: 0; transition: opacity .25s; -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px); }
.pa-fundo.on { opacity: 1; pointer-events: auto; }
.pa-fundo:not(.on) { pointer-events: none; } /* fechado: não pode cobrir a página */
.pa { position: fixed; top: 0; right: 0; bottom: 0; z-index: 9501; width: min(420px, 100vw); display: flex; flex-direction: column;
  background: var(--panel, #0f161b); color: var(--text, #eaf0f3); border-left: 1px solid var(--line, #213038); box-shadow: -24px 0 60px rgba(0, 0, 0, .4);
  transform: translateX(100%); transition: transform .3s cubic-bezier(.2, .8, .2, 1); outline: none; font-family: inherit; }
.pa.on { transform: none; }
.pa-cab { display: flex; align-items: center; gap: 10px; padding: calc(14px + env(safe-area-inset-top)) 14px 10px 18px; }
.pa-cab .pa-ic { width: 40px; height: 40px; border-radius: 13px; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, #00adee, #0077b6); box-shadow: 0 8px 20px rgba(0, 173, 238, .35); flex-shrink: 0; }
.pa-cab .pa-ic svg { width: 21px; height: 21px; }
.pa-cab .pa-tit { flex: 1; min-width: 0; }
.pa-cab h2 { margin: 0; font-size: 19px; font-weight: 850; letter-spacing: -.3px; }
.pa-cab p { margin: 1px 0 0; font-size: 12.5px; color: var(--muted, #8c9ca7); }
.pa-btn { width: 38px; height: 38px; border-radius: 12px; border: 0; display: grid; place-items: center; cursor: pointer; color: var(--text, #eaf0f3); background: transparent; transition: background .2s; flex-shrink: 0; }
.pa-btn:hover { background: var(--hover, #19252c); }
.pa-btn:focus-visible, .pa-aba:focus-visible, .pa-item:focus-visible, .pa-acao:focus-visible, .pa-rodape a:focus-visible { outline: 2px solid #00adee; outline-offset: 2px; }
.pa-btn svg { width: 20px; height: 20px; }
.pa-btn[disabled] { opacity: .4; cursor: default; }
.pa-abas { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; padding: 4px 16px 12px; border-bottom: 1px solid var(--line, #213038); }
.pa-abas::-webkit-scrollbar { display: none; }
.pa-aba { flex-shrink: 0; display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 999px; border: 1px solid var(--line, #213038); cursor: pointer;
  font: inherit; font-size: 13px; font-weight: 700; color: var(--muted, #8c9ca7); background: var(--panel-2, #151f25); transition: background .2s, color .2s, border-color .2s; }
.pa-aba[aria-selected="true"] { color: #fff; background: #00adee; border-color: #00adee; }
.pa-aba em { font-style: normal; font-size: 11px; font-weight: 800; padding: 1px 6px; border-radius: 999px; background: rgba(255, 255, 255, .16); }
.pa-aba em:empty { display: none; }
.pa-corpo { flex: 1; overflow-y: auto; overscroll-behavior: contain; padding: 6px 8px 12px; }
.pa-grupo { padding: 14px 10px 6px; font-size: 11.5px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; color: var(--muted, #8c9ca7); }
.pa-item { position: relative; display: flex; gap: 12px; align-items: flex-start; padding: 10px; border-radius: 16px; cursor: pointer; transition: background .15s; animation: pa-entra .3s ease both; }
.pa-item + .pa-item { margin-top: 3px; }
.pa-item:hover { background: var(--hover, #19252c); }
.pa-item.nova { background: color-mix(in srgb, #00adee 9%, transparent); }
.pa-item.nova::after { content: ""; position: absolute; top: 16px; right: 10px; width: 8px; height: 8px; border-radius: 50%; background: #00adee; box-shadow: 0 0 0 3px color-mix(in srgb, #00adee 25%, transparent); }
@keyframes pa-entra { from { opacity: 0; transform: translateX(10px); } }
.pa-av { position: relative; flex-shrink: 0; width: 46px; height: 46px; }
.pa-av .f { width: 46px; height: 46px; border-radius: 50%; overflow: hidden; display: grid; place-items: center; font-weight: 800; font-size: 15px; color: #fff; background: linear-gradient(135deg, #0a3140, #00adee); }
.pa-av .f img { width: 100%; height: 100%; object-fit: cover; }
.pa-av .t { position: absolute; right: -3px; bottom: -3px; width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; color: #fff; border: 2px solid var(--panel, #0f161b); }
.pa-av .t svg { width: 12px; height: 12px; }
.pa-tx { flex: 1; min-width: 0; font-size: 14px; line-height: 1.4; padding-right: 14px; }
.pa-tx b { font-weight: 800; }
.pa-nl { display: inline-block; margin-left: 6px; padding: 1px 7px; border-radius: 999px; font-size: 11px; font-weight: 800; color: #1fa855; background: color-mix(in srgb, #1fa855 14%, transparent); vertical-align: 1px; }
.pa-btn:disabled { opacity: .45; cursor: default; }
.pa-tx .q { margin-left: 4px; font-size: 12px; color: var(--muted, #8c9ca7); white-space: nowrap; }
.pa-tx small { display: block; margin-top: 3px; font-size: 12.5px; color: var(--muted, #8c9ca7); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pa-acoes { display: flex; gap: 8px; margin-top: 8px; }
.pa-acao { border: 0; border-radius: 10px; padding: 7px 14px; font: inherit; font-size: 13px; font-weight: 800; cursor: pointer; }
.pa-acao.pri { background: #00adee; color: #fff; }
.pa-acao.sec { background: var(--panel-2, #151f25); color: var(--text, #eaf0f3); border: 1px solid var(--line, #213038); }
.pa-acao[disabled] { opacity: .5; cursor: default; }
.pa-vazio { display: grid; justify-items: center; gap: 8px; text-align: center; padding: 48px 24px; color: var(--muted, #8c9ca7); }
.pa-vazio .pa-ic { width: 64px; height: 64px; border-radius: 20px; display: grid; place-items: center; color: #00adee; background: color-mix(in srgb, #00adee 12%, transparent); }
.pa-vazio .pa-ic svg { width: 30px; height: 30px; }
.pa-vazio strong { color: var(--text, #eaf0f3); font-size: 16px; }
.pa-esq { display: flex; gap: 12px; align-items: center; padding: 10px; }
.pa-esq i { display: block; border-radius: 10px; background: linear-gradient(90deg, var(--panel-2, #151f25), var(--hover, #19252c), var(--panel-2, #151f25)); background-size: 200% 100%; animation: pa-brilho 1.2s linear infinite; }
.pa-esq i:first-child { width: 46px; height: 46px; border-radius: 50%; flex-shrink: 0; }
.pa-esq div { flex: 1; display: grid; gap: 6px; }
@keyframes pa-brilho { to { background-position: -200% 0; } }
.pa-notif { margin: 8px 10px 0; display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 14px; font-size: 12.5px; background: color-mix(in srgb, #00adee 10%, transparent); color: var(--text, #eaf0f3); }
.pa-notif span { flex: 1; }
.pa-rodape { padding: 10px 16px calc(12px + env(safe-area-inset-bottom)); border-top: 1px solid var(--line, #213038); }
.pa-rodape a { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 11px; border-radius: 14px; text-decoration: none; font-weight: 800; font-size: 14px; color: #00adee; background: color-mix(in srgb, #00adee 10%, transparent); }
.pa-rodape a svg { width: 16px; height: 16px; }
.pa-toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 9600; padding: 11px 16px; border-radius: 12px; font-weight: 700; font-size: 13.5px; background: var(--text, #eaf0f3); color: var(--panel, #0f161b); max-width: 90vw; }
html.pa-aberto { overflow: hidden; }
.pa-av.duplo .f { position: absolute; width: 34px; height: 34px; font-size: 12px; border: 2px solid var(--panel, #0f161b); }
.pa-av.duplo .f:first-child { top: 0; left: 0; }
.pa-av.duplo .f + .f { right: 0; bottom: 0; }
.pa-av .f.plano { background: linear-gradient(135deg, var(--pc, #7c3aed), color-mix(in srgb, var(--pc, #7c3aed) 55%, #000)); }
.pa-av .f.plano svg { width: 22px; height: 22px; }
.pa-mini { flex-shrink: 0; width: 46px; height: 46px; border-radius: 10px; object-fit: cover; background: var(--panel-2, #151f25); align-self: center; }
.pa-mini.tx { display: grid; place-items: center; padding: 4px; font-size: 8.5px; line-height: 1.2; color: var(--muted, #8c9ca7); overflow: hidden; border: 1px solid var(--line, #213038); text-align: center; }
.pa-seguir { flex-shrink: 0; align-self: center; border: 0; border-radius: 10px; padding: 8px 12px; font: inherit; font-size: 12.5px; font-weight: 800; cursor: pointer; background: #00adee; color: #fff; }
.pa-seguir.on { background: var(--panel-2, #151f25); color: var(--text, #eaf0f3); border: 1px solid var(--line, #213038); }
.pa-item.tem-lado .pa-tx { padding-right: 4px; }
.pa-item.tem-lado.nova::after { right: 4px; top: 6px; }
@media (prefers-reduced-motion: reduce) { .pa, .pa-fundo, .pa-item { transition: none !important; animation: none !important; } }
`;
let cssPronto = false;
function css() { if (cssPronto) return; cssPronto = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); }
function toast(t) { const d = el("div", "pa-toast", t); document.body.appendChild(d); setTimeout(() => d.remove(), 3000); }

let painel = null, fundo = null, aba = "tudo", estado = null, vistoAntes = 0, quemAbriu = null, carregadoEm = 0, sigo = null;
// Nova = chegou depois da última vez que a pessoa viu as notificações (ou é um pedido esperando resposta).
// Mensagem não lida continua com a etiqueta "não lida", mas não volta a contar como nova:
// ela some quando a conversa é aberta, na página de mensagens.
const ehNova = (i) => i.quando > vistoAntes || !!i.pendente;

function foto(i) {
  const f = el("div", "f");
  const u = i.oficial ? SUPORTE.foto : fotoSegura(i.foto);
  if (u) { const img = document.createElement("img"); img.src = u; img.alt = ""; img.loading = "lazy"; img.onerror = () => { f.textContent = iniciais(i.nome); }; f.appendChild(img); } else f.textContent = iniciais(i.nome);
  return f;
}
function avatar(i) {
  const w = el("div", "pa-av" + (i.grupo ? " duplo" : ""));
  if (i.grupo) w.append(foto(i.grupo[1]), foto(i.grupo[0]));
  else if (i.tipo === "plano") { const f = el("div", "f plano"); f.style.setProperty("--pc", PLANOS[i.plano]?.cor || "#7c3aed"); f.appendChild(svg("selo")); w.appendChild(f); }
  else w.appendChild(foto(i));
  const tp = TIPOS[i.tipo] || TIPOS.mensagem;
  const t = el("span", "t"); t.style.background = tp.cor; t.appendChild(svg(tp.ic));
  w.appendChild(t);
  return w;
}
function destino(i) {
  if (i.tipo === "mensagem") return `mensagens.html?conversa=${encodeURIComponent(i.conversaId)}`;
  if (i.oficial) return linkEquipe(i);
  if (i.tipo.startsWith("reclamacao") || i.tipo === "avaliacao") return linkReclamacao(i, eu.uid);
  if (i.tipo === "plano") return "negocios.html?planos=1";
  if (i.grupo && i.tipo === "seguidor") return "notificacoes.html";
  if (i.tipo === "seguidor" || i.tipo === "social") return `usuarios.html?perfil=${encodeURIComponent(i.uid)}`;
  // Estrelas, comentários, respostas e marcações: abre a própria publicação.
  if (i.postId && ["curtida", "comentario", "resposta", "marcacao"].includes(i.tipo)) return `usuarios.html?post=${encodeURIComponent(i.postId)}`;
  if (i.tipo === "enquete") return `notificacoes.html?enquete=${encodeURIComponent(i.alvo)}`;
  return "notificacoes.html"; // estrelas e comentários abrem a publicação na página de notificações
}
async function responderVinculo(i, aceitar, botoes) {
  botoes.forEach((b) => { b.disabled = true; });
  try {
    if (aceitar && TIPOS_DUO.includes(i.tipoParaMim)) {
      const s = await fs.getDocs(fs.query(fs.collection(db, "vinculos"), fs.where("participantes", "array-contains", eu.uid), fs.limit(60)));
      const ja = s.docs.map((d) => ({ id: d.id, ...d.data() })).find((x) => x.id !== i.vinculoId && x.status === "aceito" && TIPOS_DUO.includes(x.de === eu.uid ? x.tipoDe : x.tipoPara));
      if (ja) { toast("Você já tem um duo no seu social. Desfaça antes de aceitar."); botoes.forEach((b) => { b.disabled = false; }); return; }
    }
    if (aceitar) await fs.updateDoc(fs.doc(db, "vinculos", i.vinculoId), { status: "aceito", aceitoEm: fs.serverTimestamp() });
    else await fs.deleteDoc(fs.doc(db, "vinculos", i.vinculoId));
    estado.itens = estado.itens.filter((x) => x !== i);
    if (aceitar) estado.itens.unshift({ ...i, pendente: false, aceitoPorMim: true, quando: Date.now() });
    toast(aceitar ? "Vínculo aceito" : "Pedido recusado");
    pintar();
  } catch { toast("Não foi possível responder agora."); botoes.forEach((b) => { b.disabled = false; }); }
}
function linha(i) {
  const nova = ehNova(i);
  const d = el("div", "pa-item" + (nova ? " nova" : ""));
  d.tabIndex = 0; d.setAttribute("role", "link");
  const tx = el("div", "pa-tx");
  const nome = el("b", null, nomesDoGrupo(i));
  if (i.oficial) nome.appendChild(seloOficial());
  const frase = i.grupo ? textoDoGrupo(i) : texto(i);
  tx.append(nome, document.createTextNode(" " + frase), el("span", "q", tempo(i.quando)));
  if (i.naoLida) tx.appendChild(el("span", "pa-nl", i.oficial ? "nova" : "não lida"));
  if (i.detalhe) tx.appendChild(el("small", null, i.tipo === "mensagem" || i.tipo === "enquete" || i.tipo === "plano" || i.oficial ? i.detalhe : `"${i.detalhe}"`));
  if (i.tipo === "social" && i.pendente) {
    const box = el("div", "pa-acoes");
    const sim = el("button", "pa-acao pri", "Aceitar"), nao = el("button", "pa-acao sec", "Recusar");
    sim.type = nao.type = "button";
    sim.addEventListener("click", (e) => { e.stopPropagation(); responderVinculo(i, true, [sim, nao]); });
    nao.addEventListener("click", (e) => { e.stopPropagation(); responderVinculo(i, false, [sim, nao]); });
    box.append(sim, nao);
    tx.appendChild(box);
  }
  d.append(avatar(i), tx);
  // Do lado direito: miniatura da publicação ou "Seguir de volta"
  if (i.mini) {
    d.classList.add("tem-lado");
    if (i.mini.foto) { const img = document.createElement("img"); img.className = "pa-mini"; img.src = i.mini.foto; img.alt = ""; img.loading = "lazy"; d.appendChild(img); }
    else d.appendChild(el("span", "pa-mini tx", String(i.mini.texto || "").slice(0, 60)));
  } else if (i.tipo === "seguidor" && !i.grupo && sigo) {
    d.classList.add("tem-lado");
    d.appendChild(botaoSeguir(i.uid));
  }
  d.setAttribute("aria-label", `${nomesDoGrupo(i)} ${frase}, ${tempo(i.quando)}`);
  const ir = () => { location.href = destino(i); };
  d.addEventListener("click", (e) => { if (!e.target.closest("button")) ir(); });
  d.addEventListener("keydown", (e) => { if (e.target === d && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); ir(); } });
  return d;
}
// "Seguir de volta" / "Seguindo" (mesmo documento que as páginas da rede: relacoes/{eu}_{alvo}).
function botaoSeguir(alvo) {
  const b = el("button", "pa-seguir"); b.type = "button";
  const pintarB = () => { const on = sigo.has(alvo); b.classList.toggle("on", on); b.textContent = on ? "Seguindo" : "Seguir de volta"; };
  pintarB();
  b.addEventListener("click", async (e) => {
    e.stopPropagation(); b.disabled = true;
    const ref = fs.doc(db, "relacoes", `${eu.uid}_${alvo}`);
    try {
      if (sigo.has(alvo)) { await fs.deleteDoc(ref); sigo.delete(alvo); }
      else { await fs.setDoc(ref, { tipo: "seguir", seguidorId: eu.uid, alvoId: alvo, criadoEm: fs.serverTimestamp() }); sigo.add(alvo); }
      esquecer("seguindo-" + eu.uid);
      painel.querySelectorAll(".pa-seguir").forEach((x) => x.pintar?.());
    } catch { toast("Não foi possível seguir agora."); }
    finally { b.disabled = false; pintarB(); }
  });
  b.pintar = pintarB;
  return b;
}
function pintar() {
  const corpo = painel.querySelector(".pa-corpo");
  const todos = estado.itens;
  const novos = todos.filter(ehNova).length;
  const naoLidasMsg = todos.filter((i) => i.naoLida && !i.oficial).length, doSuporte = todos.filter((i) => i.naoLida && i.oficial).length;
  painel.querySelector(".pa-cab p").textContent = (novos ? `${novos} ${novos === 1 ? "nova" : "novas"}` : "Tudo em dia") + (naoLidasMsg ? ` · ${naoLidasMsg} ${naoLidasMsg === 1 ? "mensagem não lida" : "mensagens não lidas"}` : "") + (doSuporte ? ` · ${doSuporte} do suporte` : "");
  painel.querySelector(".pa-vistas").disabled = !novos;
  painel.querySelectorAll(".pa-aba").forEach((b) => {
    const n = b.dataset.aba === "tudo" ? todos.length : todos.filter((i) => TIPOS[i.tipo]?.aba === b.dataset.aba).length;
    b.querySelector("em").textContent = n ? String(n > 99 ? "99+" : n) : "";
    b.setAttribute("aria-selected", b.dataset.aba === aba ? "true" : "false");
  });
  const lista = aba === "tudo" ? todos : todos.filter((i) => TIPOS[i.tipo]?.aba === aba);
  corpo.replaceChildren();
  if (!lista.length) {
    const v = el("div", "pa-vazio");
    const ic = el("div", "pa-ic"); ic.appendChild(svg("sino"));
    v.append(ic, el("strong", null, "Nada por aqui ainda"), el("span", null, aba === "tudo" ? "Mensagens, seguidores, estrelas, comentários, avaliações, avisos do suporte e do seu plano aparecem aqui." : "Nenhuma notificação deste tipo."));
    corpo.appendChild(v);
    return;
  }
  secoes(agrupar(lista, ehNova), ehNova).forEach(([t, l]) => {
    corpo.appendChild(el("div", "pa-grupo", t));
    l.slice(0, 80).forEach((i) => corpo.appendChild(linha(i)));
  });
}
function esqueleto() {
  const corpo = painel.querySelector(".pa-corpo");
  corpo.replaceChildren(...Array.from({ length: 6 }, () => {
    const e = el("div", "pa-esq");
    const b = el("div"); const l1 = el("i"); l1.style.height = "12px"; l1.style.width = "80%"; const l2 = el("i"); l2.style.height = "10px"; l2.style.width = "45%";
    b.append(l1, l2); e.append(el("i"), b);
    return e;
  }));
}
function marcarVistos() {
  if (!eu) return;
  fs.setDoc(fs.doc(db, "usuarios", eu.uid), { notificacoesVistasEm: fs.serverTimestamp() }, { merge: true }).catch(() => {});
  try { localStorage.setItem("hf-sino-" + eu.uid, JSON.stringify({ n: 0, visto: Date.now(), em: Date.now() })); } catch {}
  // O sino do topo e as páginas da rede social atualizam o contador
  window.dispatchEvent(new CustomEvent("hf:avisos-vistos"));
}
function montar() {
  css();
  fundo = el("div", "pa-fundo");
  fundo.addEventListener("click", fechar);
  painel = el("aside", "pa");
  painel.setAttribute("role", "dialog"); painel.setAttribute("aria-modal", "true"); painel.setAttribute("aria-labelledby", "paTitulo");
  painel.tabIndex = -1;
  const cab = el("div", "pa-cab");
  const ic = el("div", "pa-ic"); ic.appendChild(svg("sino"));
  const tit = el("div", "pa-tit"); const h = el("h2", null, "Notificações"); h.id = "paTitulo"; tit.append(h, el("p", null, "Carregando..."));
  const vistos = el("button", "pa-btn pa-vistas"); vistos.type = "button"; vistos.title = "Marcar todas como vistas"; vistos.setAttribute("aria-label", "Marcar todas como vistas"); vistos.appendChild(svg("checks"));
  vistos.addEventListener("click", () => { vistoAntes = Date.now(); if (estado) estado.visto = vistoAntes; marcarVistos(); if (estado) pintar(); toast("Notificações marcadas como vistas"); });
  const x = el("button", "pa-btn"); x.type = "button"; x.setAttribute("aria-label", "Fechar notificações"); x.appendChild(svg("fechar"));
  x.addEventListener("click", fechar);
  cab.append(ic, tit, vistos, x);
  const abas = el("div", "pa-abas"); abas.setAttribute("role", "tablist"); abas.setAttribute("aria-label", "Filtrar notificações");
  ABAS.forEach(([k, r]) => {
    const b = el("button", "pa-aba"); b.type = "button"; b.dataset.aba = k; b.setAttribute("role", "tab");
    b.append(document.createTextNode(r), el("em"));
    b.addEventListener("click", () => { aba = k; if (estado) pintar(); });
    abas.appendChild(b);
  });
  const corpo = el("div", "pa-corpo");
  const rod = el("div", "pa-rodape");
  const a = el("a"); a.href = "notificacoes.html"; a.append(document.createTextNode("Ver todas as notificações"), svg("seta"));
  rod.appendChild(a);
  painel.append(cab, abas);
  if ("Notification" in window && Notification.permission === "default") {
    const n = el("div", "pa-notif");
    const b = el("button", "pa-acao pri", "Ativar"); b.type = "button";
    b.addEventListener("click", async () => { try { await Notification.requestPermission(); } catch {} n.remove(); });
    n.append(el("span", null, "Receba avisos mesmo com o site em segundo plano."), b);
    painel.appendChild(n);
  }
  painel.append(corpo, rod);
  // Esc fecha mesmo quando o foco saiu do painel (ex.: o botão clicado sumiu da lista)
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && painel.classList.contains("on")) { e.preventDefault(); fechar(); } });
  painel.addEventListener("keydown", (e) => {
    if (e.key === "Tab") { // mantém o foco dentro do painel
      const f = [...painel.querySelectorAll("button, a, [tabindex='0']")].filter((x) => !x.disabled && x.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  document.body.append(fundo, painel);
}
async function abrir(origem) {
  quemAbriu = origem;
  if (!painel) montar();
  aba = "tudo";
  document.documentElement.classList.add("pa-aberto");
  requestAnimationFrame(() => { fundo.classList.add("on"); painel.classList.add("on"); painel.focus({ preventScroll: true }); });
  origem?.setAttribute("aria-expanded", "true");
  if (!(await prontoFirebase())) { location.href = "login.html"; return; }
  // Reabriu logo depois: mostra o que já foi carregado, sem ler tudo de novo.
  if (estado && Date.now() - carregadoEm < 60000) { vistoAntes = estado.visto; pintar(); return; }
  esqueleto();
  try {
    estado = await carregar();
    carregadoEm = Date.now();
    vistoAntes = estado.visto;
    pintar();
    setTimeout(() => { if (painel?.classList.contains("on")) { estado.visto = Date.now(); marcarVistos(); } }, 1200);
  } catch (e) {
    console.warn("[Avisos]", e);
    painel.querySelector(".pa-corpo").replaceChildren(el("div", "pa-vazio", "Não foi possível carregar as notificações agora."));
  }
}
function fechar() {
  if (!painel?.classList.contains("on")) return;
  painel.classList.remove("on"); fundo.classList.remove("on");
  document.documentElement.classList.remove("pa-aberto");
  quemAbriu?.setAttribute("aria-expanded", "false");
  quemAbriu?.focus({ preventScroll: true });
}

// ---------- liga o sino do topo ----------
function ligar() {
  if (/(^|\/)notificacoes\.html$/.test(location.pathname)) return; // a própria página já é a lista completa
  document.querySelectorAll('.topo a[href="notificacoes.html"]').forEach((a) => {
    if (a.dataset.painel) return;
    a.dataset.painel = "1";
    a.setAttribute("aria-haspopup", "dialog");
    a.setAttribute("aria-expanded", "false");
    a.addEventListener("click", (e) => {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return; // nova aba continua indo para a página
      e.preventDefault();
      abrir(a);
    });
  });
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ligar); else ligar();
