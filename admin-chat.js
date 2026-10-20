// =====================================================
// Painel — chat da equipe
// - "Equipe" (todos juntos) e uma conversa individual com cada membro
// - texto, @menção, foto, arquivo (até 680 KB) e áudio (até 2 min)
// - o conteúdo do anexo fica em equipe_anexos/{id} e só é baixado quando
//   alguém abre (foto, áudio, arquivo): a lista de mensagens continua leve
// - busca na conversa, som de aviso e "virar tarefa" em cada mensagem
// - visual de mensageiro: balões, botão redondo (microfone/enviar), menu da mensagem
//   com reações e ações (toque longo no celular), áudio com ondas de voz
// Grupo: equipe_chat/{id} · individual: equipe_dm/{uidA_uidB}/mensagens/{id}
// =====================================================
import { C, D, h, ms, toast, avatar, relativo, editarTarefa, nomeEquipe, PAPEIS } from "./admin-base.js?v=17";
import { criarPlayerAudio } from "./audio-ondas.js?v=1";
import { escolherApagar, editarTextoHF, verEdicoesHF, janelaHF, horaCurta, noPrazo, tempoRestante, podeMexer } from "./msg-acoes.js?v=2";

const pessoa = (uid) => D.pessoas.get(uid) || { uid, nome: "" };
export const idPar = (a, b) => [a, b].sort().join("_");
const outroDoPar = (par) => par.split("_").find((u) => u !== C.eu.uid) || C.eu.uid;
const nomeDe = (uid) => D.admins.find((a) => a.id === uid)?.nome || pessoa(uid).nome || nomeEquipe(uid);
const primeiro = (n) => String(n || "").trim().split(/\s+/)[0] || "";
const LIMITE_ARQUIVO = 680 * 1024;   // ~900 mil caracteres em base64 (cabe num documento)
const LIMITE_AUDIO_SEG = 120;
const kb = (b) => (b >= 1024 * 1024 ? `${(b / 1048576).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const hora = (t) => (ms(t) ? new Date(ms(t)).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "enviando…");
const seg = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// Prévia curta (lista de conversas, avisos).
export function previa(m) {
  if (m.apagada) return "Mensagem apagada";
  if (m.texto) return String(m.texto).slice(0, 120);
  return m.tipoArquivo === "imagem" ? "Foto" : m.tipoArquivo === "audio" ? `Áudio${m.duracao ? " (" + seg(m.duracao) + ")" : ""}` : m.tipoArquivo === "arquivo" ? `Arquivo: ${m.nomeArquivo || "sem nome"}` : "";
}

// ---------- anexos ----------
const lerDataUrl = (blob) => new Promise((ok, falha) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => falha(new Error("Não foi possível ler o arquivo.")); r.readAsDataURL(blob); });
function imagemJpeg(arquivo, maxLado, qualidade) {
  return new Promise((ok, falha) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onerror = () => { URL.revokeObjectURL(url); falha(new Error("Formato de imagem não suportado.")); };
    img.onload = () => {
      const e = Math.min(maxLado / img.width, maxLado / img.height, 1);
      const cv = document.createElement("canvas"); cv.width = Math.max(1, Math.round(img.width * e)); cv.height = Math.max(1, Math.round(img.height * e));
      const cx = cv.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url); ok(cv.toDataURL("image/jpeg", qualidade));
    };
    img.src = url;
  });
}
async function prepararImagem(arquivo) {
  let dados = null;
  for (const [lado, q] of [[1600, 0.82], [1280, 0.72], [1024, 0.62], [800, 0.55]]) { dados = await imagemJpeg(arquivo, lado, q); if (dados.length <= 900000) break; }
  if (dados.length > 900000) throw new Error("Foto grande demais.");
  let miniatura = await imagemJpeg(arquivo, 360, 0.6);
  if (miniatura.length > 30000) miniatura = await imagemJpeg(arquivo, 220, 0.5);
  return { tipo: "imagem", dados, miniatura: miniatura.length <= 30000 ? miniatura : null, nome: arquivo.name || "foto.jpg", tamanho: Math.round(dados.length * 0.75) };
}
async function prepararArquivo(arquivo) {
  if (/^image\/(jpeg|png|webp|gif|heic|heif)$/i.test(arquivo.type)) return prepararImagem(arquivo);
  if (arquivo.size > LIMITE_ARQUIVO) throw new Error(`Arquivo grande demais (${kb(arquivo.size)}). O limite é ${kb(LIMITE_ARQUIVO)} por enquanto.`);
  let dados = await lerDataUrl(arquivo);
  // Tipo vazio ou estranho: vira "application/octet-stream" (download comum).
  if (!/^data:[a-z]+\/[-+.a-z0-9]{1,80}(;[^,]{0,80})?,/.test(dados)) dados = "data:application/octet-stream;base64," + dados.split(",").pop();
  return { tipo: "arquivo", dados, nome: arquivo.name || "arquivo", tamanho: arquivo.size };
}
const cacheAnexos = new Map();
function obterAnexo(id) {
  if (!cacheAnexos.has(id)) {
    const { fb } = C;
    cacheAnexos.set(id, fb.getDoc(fb.doc(fb.db, "equipe_anexos", id)).then((s) => { if (!s.exists()) throw new Error("Anexo não encontrado."); return s.data().dados; }).catch((e) => { cacheAnexos.delete(id); throw e; }));
  }
  return cacheAnexos.get(id);
}
function dataUrlParaBlob(url) {
  const [cab, b64] = url.split(","); const tipo = (cab.match(/^data:([^;,]+)/) || [])[1] || "application/octet-stream";
  const bin = atob(b64); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: tipo });
}
async function baixarAnexo(m) {
  try {
    const blob = dataUrlParaBlob(await obterAnexo(m.anexo));
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = m.nomeArquivo || "arquivo";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } catch (e) { toast("Não foi possível baixar: " + (e.code || e.message)); }
}
function verFoto(m) {
  const fundo = h("div", "ad-modal-fundo ad-foto-fundo"); fundo.setAttribute("role", "dialog"); fundo.setAttribute("aria-label", "Foto");
  const img = document.createElement("img"); img.className = "ad-foto-grande"; img.alt = m.nomeArquivo || "Foto"; if (m.miniatura) img.src = m.miniatura;
  const bar = h("div", "ad-foto-barra");
  const bx = h("button", "ad-bt", "Baixar"); bx.type = "button"; bx.addEventListener("click", (e) => { e.stopPropagation(); baixarAnexo(m); });
  const fx = h("button", "ad-bt", "Fechar"); fx.type = "button";
  bar.append(bx, fx); fundo.append(img, bar); document.body.appendChild(fundo);
  const fechar = () => { fundo.remove(); document.removeEventListener("keydown", tecla); };
  const tecla = (e) => { if (e.key === "Escape") fechar(); };
  fx.addEventListener("click", fechar); fundo.addEventListener("click", (e) => { if (e.target === fundo) fechar(); }); document.addEventListener("keydown", tecla);
  obterAnexo(m.anexo).then((d) => { img.src = d; }).catch(() => toast("Não foi possível abrir a foto."));
}

// ---------- envio ----------
async function enviarMensagem(conv, { texto = "", anexo = null, mencoes = [], resposta = null }) {
  const { fb } = C;
  const lote = fb.writeBatch(fb.db);
  const dados = { autorId: C.eu.uid, nome: String(C.nome || "").slice(0, 80), texto: String(texto).slice(0, 2000), em: fb.serverTimestamp() };
  if (mencoes.length) dados.mencoes = [...new Set(mencoes)].slice(0, 10);
  if (resposta && resposta.id) dados.resposta = { id: String(resposta.id), autorId: String(resposta.autorId || ""), nome: String(resposta.nome || "").slice(0, 80), texto: String(resposta.texto || "").slice(0, 200) };
  if (anexo) {
    const ref = fb.doc(fb.collection(fb.db, "equipe_anexos"));
    lote.set(ref, { autorId: C.eu.uid, conversa: conv, dados: anexo.dados, em: fb.serverTimestamp() });
    Object.assign(dados, { tipoArquivo: anexo.tipo, anexo: ref.id, nomeArquivo: String(anexo.nome || "").slice(0, 120), tamanho: Math.round(anexo.tamanho || 0) });
    if (anexo.miniatura) dados.miniatura = anexo.miniatura;
    if (anexo.duracao) dados.duracao = Math.round(anexo.duracao);
  }
  if (conv === "equipe") lote.set(fb.doc(fb.collection(fb.db, "equipe_chat")), dados);
  else {
    lote.set(fb.doc(fb.collection(fb.db, "equipe_dm", conv, "mensagens")), dados);
    lote.set(fb.doc(fb.db, "equipe_dm", conv), { participantes: conv.split("_"), ultimaEm: fb.serverTimestamp(), ultimaTexto: previa(dados).slice(0, 140), ultimoAutor: C.eu.uid, lidoEm: { [C.eu.uid]: fb.serverTimestamp() } }, { merge: true });
  }
  await lote.commit();
}
function marcarLidaDm(par) {
  const { fb } = C;
  fb.setDoc(fb.doc(fb.db, "equipe_dm", par), { participantes: par.split("_"), lidoEm: { [C.eu.uid]: fb.serverTimestamp() } }, { merge: true }).catch(() => {});
}
export const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
// Alterna a reação de quem está logado numa mensagem (uma reação por pessoa).
async function alternarReacao(conv, m, emoji) {
  const { fb } = C;
  const ref = conv === "equipe" ? fb.doc(fb.db, "equipe_chat", m.id) : fb.doc(fb.db, "equipe_dm", conv, "mensagens", m.id);
  const atual = (m.reacoes || {})[C.eu.uid];
  const valor = atual === emoji ? fb.deleteField() : emoji;
  await fb.updateDoc(ref, { ["reacoes." + C.eu.uid]: valor });
}

// ---------- editar e apagar ----------
// Editar: texto novo + o de antes em "edicoes". Apagar para todos: fica "apagou esta mensagem" e o
// conteúdo vai para equipe_apagadas/{id} (abre por 24 horas). Apagar para mim: usuarios/{uid}.ocultasMsg.
const refMsgEq = (conv, id) => (conv === "equipe" ? C.fb.doc(C.fb.db, "equipe_chat", id) : C.fb.doc(C.fb.db, "equipe_dm", conv, "mensagens", id));
let ocultasEq = null; // { "eq_<conversa>": [ids] }
async function carregarOcultasEq() {
  if (ocultasEq) return ocultasEq;
  try { const s = await C.fb.getDoc(C.fb.doc(C.fb.db, "usuarios", C.eu.uid)); const o = s.data()?.ocultasMsg; ocultasEq = o && typeof o === "object" ? o : {}; }
  catch { ocultasEq = {}; }
  return ocultasEq;
}
const ocultaEq = (conv, id) => Array.isArray(ocultasEq?.["eq_" + conv]) && ocultasEq["eq_" + conv].includes(id);
async function apagarEqParaMim(conv, m) {
  const k = "eq_" + conv;
  ocultasEq = { ...(ocultasEq || {}), [k]: [...new Set([...(ocultasEq?.[k] || []), m.id])].slice(-500) };
  toast("Mensagem apagada para você");
  try { await C.fb.setDoc(C.fb.doc(C.fb.db, "usuarios", C.eu.uid), { ocultasMsg: { [k]: C.fb.arrayUnion(m.id) } }, { merge: true }); }
  catch (e) { console.error(e); toast("Não foi possível guardar. A mensagem pode voltar ao recarregar."); }
}
async function apagarEqParaTodos(conv, m, ultima) {
  const { fb } = C;
  const conteudo = {};
  for (const k of ["texto", "tipoArquivo", "anexo", "nomeArquivo", "tamanho", "miniatura", "duracao", "resposta", "mencoes", "edicoes"]) if (m[k] !== undefined && m[k] !== null) conteudo[k] = m[k];
  try {
    const lote = fb.writeBatch(fb.db);
    lote.set(refMsgEq(conv, m.id), { autorId: m.autorId, nome: m.nome || "", em: m.em, apagada: { por: C.eu.uid, em: fb.serverTimestamp() } });
    lote.set(fb.doc(fb.db, "equipe_apagadas", m.id), { autorId: C.eu.uid, conversa: conv, conteudo, apagadaEm: fb.serverTimestamp() });
    await lote.commit();
    toast("Mensagem apagada para todos");
    if (ultima && conv !== "equipe") fb.setDoc(fb.doc(fb.db, "equipe_dm", conv), { participantes: conv.split("_"), ultimaTexto: "Mensagem apagada" }, { merge: true }).catch(() => {});
  } catch (e) {
    console.error(e);
    toast(e?.code !== "permission-denied" ? "Não foi possível apagar: " + (e.code || e.message)
      : !podeMexer(m.em) ? "Passaram 10 minutos do envio: agora só dá para apagar para você."
      : "Apagar para todos começa a funcionar quando as regras novas forem publicadas.");
  }
}
async function editarEq(conv, m, ultima) {
  const novo = await editarTextoHF({ titulo: m.tipoArquivo ? "Editar legenda" : "Editar mensagem", texto: m.texto || "", max: 2000, permiteVazio: !!m.anexo, dica: "Quem está na conversa vê “editada” e pode abrir o texto original." });
  if (novo == null || novo === (m.texto || "")) return;
  if ((m.edicoes || []).length >= 19) { toast("Esta mensagem já foi editada muitas vezes."); return; }
  const { fb } = C;
  try {
    await fb.updateDoc(refMsgEq(conv, m.id), { texto: novo, editadaEm: fb.serverTimestamp(), edicoes: [...(m.edicoes || []), { texto: m.texto || "", em: m.editadaEm || m.em }] });
    toast("Mensagem editada");
    if (ultima && conv !== "equipe") fb.setDoc(fb.doc(fb.db, "equipe_dm", conv), { participantes: conv.split("_"), ultimaTexto: previa({ ...m, texto: novo }).slice(0, 140) }, { merge: true }).catch(() => {});
  } catch (e) {
    console.error(e);
    toast(e?.code !== "permission-denied" ? "Não foi possível editar: " + (e.code || e.message)
      : !podeMexer(m.em) ? "Passaram 10 minutos do envio: a mensagem não pode mais ser editada."
      : "Editar mensagens começa a funcionar quando as regras novas forem publicadas.");
  }
}
async function verApagadaEq(m) {
  const { fb } = C;
  let d = null;
  try { const s = await fb.getDoc(fb.doc(fb.db, "equipe_apagadas", m.id)); d = s.exists() ? s.data() : null; } catch (e) { console.warn(e); }
  if (!d) { toast(noPrazo(m.apagada?.em) ? "Não foi possível abrir a mensagem apagada." : "Já passaram 24 horas: esta mensagem foi apagada de vez."); return; }
  const c = { id: m.id, ...(d.conteudo || {}) };
  const caixa = document.createElement("div");
  if (c.tipoArquivo === "imagem" && c.anexo) { const im = document.createElement("img"); im.className = "hf-ma-midia"; im.alt = c.nomeArquivo || "Foto"; if (c.miniatura) im.src = c.miniatura; obterAnexo(c.anexo).then((u) => { im.src = u; }).catch(() => {}); caixa.appendChild(im); }
  else if (c.tipoArquivo === "audio" && c.anexo) caixa.appendChild(criarPlayerAudio({ chave: "eqap:" + c.anexo, fonte: () => obterAnexo(c.anexo), duracao: c.duracao || 0, aoErro: () => toast("Não foi possível tocar o áudio.") }));
  else if (c.tipoArquivo === "arquivo" && c.anexo) { const b = h("button", "ad-bt", `Baixar ${c.nomeArquivo || "arquivo"}${c.tamanho ? " (" + kb(c.tamanho) + ")" : ""}`); b.type = "button"; b.addEventListener("click", () => baixarAnexo(c)); caixa.appendChild(b); }
  if (c.texto) {
    const v = h("div", "hf-ma-versao"); const t = h("b"); t.append(h("span", null, m.autorId === C.eu.uid ? "Você" : (m.nome || nomeDe(m.autorId))), h("span", null, `enviada ${hora(m.em)}`));
    v.append(t, h("div", null, c.texto)); caixa.appendChild(v);
  }
  if (Array.isArray(c.edicoes) && c.edicoes.length) caixa.appendChild(h("p", "hf-ma-aviso", `Antes de apagar, ela tinha sido editada. Original: “${String(c.edicoes[0]?.texto || "").slice(0, 300)}”`));
  caixa.appendChild(h("p", "hf-ma-aviso", `Só quem está nesta conversa vê. Some de vez em ${tempoRestante(d.apagadaEm) || "instantes"}.`));
  janelaHF({ titulo: "Mensagem apagada", sub: `${m.apagada.por === C.eu.uid ? "Você apagou" : primeiro(m.nome || nomeDe(m.autorId)) + " apagou"} ${horaCurta(m.apagada.em)}.`, conteudo: caixa });
}
// Passadas 24 horas, o conteúdo guardado é apagado de vez por quem abrir a conversa.
const eqLimpas = new Set();
function limparApagadasEq(lista) {
  for (const m of lista) {
    if (!m.apagada || noPrazo(m.apagada.em) || eqLimpas.has(m.id)) continue;
    eqLimpas.add(m.id);
    C.fb.deleteDoc(C.fb.doc(C.fb.db, "equipe_apagadas", m.id)).catch(() => {});
  }
}

// ---------- som de aviso ----------
let audioCtx = null;
export function somAtivo() { try { return localStorage.getItem("hf-equipe-som") !== "0"; } catch { return true; } }
export function tocarSom() {
  if (!somAtivo()) return;
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime;
    [[740, 0], [988, 0.1]].forEach(([f, a]) => { const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.frequency.value = f; g.gain.setValueAtTime(0.0001, t + a); g.gain.exponentialRampToValueAtTime(0.1, t + a + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + a + 0.18); o.connect(g).connect(audioCtx.destination); o.start(t + a); o.stop(t + a + 0.2); });
  } catch {}
}

// ---------- texto com @menções destacadas ----------
function textoComMencoes(texto, mencoes = []) {
  const frag = document.createDocumentFragment();
  const nomes = D.admins.map((a) => primeiro(a.nome || nomeDe(a.id))).filter(Boolean).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!nomes.length || !texto.includes("@")) { frag.appendChild(document.createTextNode(texto)); return frag; }
  const re = new RegExp(`@(${nomes.join("|")})\\b`, "gi");
  let ultimo = 0, m;
  while ((m = re.exec(texto))) {
    if (m.index > ultimo) frag.appendChild(document.createTextNode(texto.slice(ultimo, m.index)));
    const eu = primeiro(C.nome).toLowerCase() === m[1].toLowerCase();
    frag.appendChild(h("span", "ad-mencao" + (eu ? " eu" : ""), m[0]));
    ultimo = m.index + m[0].length;
  }
  if (ultimo < texto.length) frag.appendChild(document.createTextNode(texto.slice(ultimo)));
  return frag;
}

// ---------- ícones (SVG no traço do painel, iguais em todo aparelho) ----------
const ICONES = {
  // Os mesmos ícones da página de Mensagens (mensagens.html), para o chat da equipe ter a mesma cara.
  voltar: '<path d="M15 5l-7 7 7 7"/>',
  lupa: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  mais: '<circle cx="12" cy="5.5" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="18.5" r="1.2" fill="currentColor"/>',
  sino: '<path d="M18 9.5a6 6 0 00-12 0c0 6.5-2.5 8-2.5 8h17S18 16 18 9.5z"/><path d="M10.2 20.5a2 2 0 003.6 0"/>',
  semSom: '<path d="M18 9.5a6 6 0 00-9.7-4.7M6 9.5c0 6.5-2.5 8-2.5 8H17"/><path d="M10.2 20.5a2 2 0 003.6 0M3 3l18 18"/>',
  clipe: '<path d="M21 11.5l-8.6 8.6a5.5 5.5 0 01-7.8-7.8l8.6-8.6a3.7 3.7 0 015.2 5.2l-8.6 8.6a1.8 1.8 0 01-2.6-2.6l7.9-7.9"/>',
  arroba: '<circle cx="12" cy="12" r="3.6"/><path d="M15.6 12v1.3a2.6 2.6 0 005.2 0V12a8.8 8.8 0 10-3.5 7"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21"/>',
  enviar: '<path d="M12 19.5V5M5.5 11.2L12 4.7l6.5 6.5" stroke-width="2.4"/>',
  lixo: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5"/>',
  responder: '<path d="M10 8V4.5L3 11l7 6.5V14c5 0 8.5 1.5 11 5.5-1-5-4-10.5-11-11.5z"/>',
  tarefa: '<rect x="4.5" y="4.5" width="15" height="15" rx="3"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  copiar: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/>',
  sorriso: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14a4.2 4.2 0 007 0M9.3 9.6h.01M14.7 9.6h.01"/>',
  perfil: '<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5c1.2-3.6 4.1-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/>',
  grupo: '<circle cx="9" cy="9" r="3.2"/><circle cx="17" cy="10" r="2.5"/><path d="M3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5M15 15c2.6-.4 4.6.8 5.5 3.5"/>',
  documento: '<path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4M9.5 12.5h6M9.5 16h6"/>',
  baixar: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
  fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
  seta: '<path d="M6.5 9.5L12 15l5.5-5.5"/>',
  olho: '<path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z"/><circle cx="12" cy="12" r="2.8"/>',
  relogio: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8h.01"/>',
  lapis: '<path d="M4 20h4L19 9a2.8 2.8 0 00-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  camera: '<path d="M4 8.5A2.5 2.5 0 016.5 6h1.8l1.5-2h4.4l1.5 2h1.8A2.5 2.5 0 0120 8.5v9a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 17.5z"/><circle cx="12" cy="13" r="3.6"/>',
  foto: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5-8.5 8.5"/>'
};
function ic(nome, tam = 22) {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("width", tam); s.setAttribute("height", tam); s.setAttribute("aria-hidden", "true"); s.setAttribute("class", "eq-ic");
  s.innerHTML = ICONES[nome] || "";
  return s;
}
function botaoIcone(nome, rotulo, cls = "eq-icone") {
  const b = h("button", cls); b.type = "button"; b.setAttribute("aria-label", rotulo); b.title = rotulo; b.appendChild(ic(nome));
  return b;
}

// ---------- fotos: a minha (perfil) e a do grupo "Equipe" ----------
const OPCOES_FOTO = { proporcao: 1, circulo: true, larguraSaida: 480, qualidade: 0.86, limiteBytes: 240000 };
function escolherImagem() {
  return new Promise((ok) => {
    const i = document.createElement("input"); i.type = "file"; i.accept = "image/*";
    i.addEventListener("change", () => ok(i.files?.[0] || null), { once: true });
    i.click();
  });
}
async function editarFoto(titulo, dica) {
  const arquivo = await escolherImagem(); if (!arquivo) return null;
  const { editarImagem } = await import("./editor-imagem.js?v=7");
  return editarImagem(arquivo, { ...OPCOES_FOTO, titulo, dica });
}
// Minha foto de perfil (a mesma do site: aparece no perfil, nas mensagens e aqui).
async function trocarMinhaFoto(aoMudar) {
  const { fb } = C;
  try {
    const url = await editarFoto("Sua foto de perfil", "É a mesma foto do seu perfil no site. Deixe o rosto dentro do círculo.");
    if (!url) return;
    toast("Salvando foto...");
    await Promise.all([
      fb.setDoc(fb.doc(fb.db, "usuarios", C.eu.uid), { fotoPerfil: url }, { merge: true }),
      fb.setDoc(fb.doc(fb.db, "perfis_publicos", C.eu.uid), { uid: C.eu.uid, fotoPerfil: url }, { merge: true })
    ]);
    const p = D.pessoas.get(C.eu.uid); if (p) p.fotoPerfil = url; else D.pessoas.set(C.eu.uid, { uid: C.eu.uid, nome: C.nome, fotoPerfil: url });
    toast("Foto de perfil atualizada"); aoMudar?.();
  } catch (e) { console.error(e); toast("Não foi possível salvar a foto: " + (e.code || e.message)); }
}
// Foto do grupo "Equipe" (equipe_info/grupo): qualquer pessoa da equipe troca.
async function trocarFotoGrupo(tirar = false) {
  const { fb } = C;
  try {
    const url = tirar ? null : await editarFoto("Foto da equipe", "Aparece no grupo \"Equipe\" do chat, para todos da equipe.");
    if (!tirar && !url) return;
    await fb.setDoc(fb.doc(fb.db, "equipe_info", "grupo"), { foto: url, por: C.eu.uid, em: fb.serverTimestamp() });
    toast(tirar ? "Foto da equipe removida" : "Foto da equipe atualizada");
  } catch (e) {
    console.error(e);
    toast(e?.code === "permission-denied" ? "Para trocar a foto da equipe, falta publicar a atualização das regras do Firestore." : "Não foi possível salvar a foto: " + (e.code || e.message));
  }
}

// =====================================================
// Monta o chat dentro de "el" (visual de mensageiro: lista à esquerda, conversa à direita;
// no celular, uma tela de cada vez)
// =====================================================
export function montarChat(el) {
  const { fb } = C;
  let conv = C.conversaAberta && (C.conversaAberta === "equipe" || C.conversaAberta.includes(C.eu.uid)) ? C.conversaAberta : "equipe";
  let msgsDm = [], pararDm = null, termo = "", respondendo = null;
  const raiz = h("div", "eq-chat");
  // ---------- lista de conversas ----------
  // (mesmo desenho da página de Mensagens: título, abas, busca e a lista)
  const lado = h("aside", "eq-lista"); lado.setAttribute("aria-label", "Conversas da equipe");
  const ladoTopo = h("div", "eq-lista-topo");
  const tit = h("h3"); tit.append(h("span", null, "Equipe Help Floripa"), document.createTextNode("Conversas"));
  const bInfo = botaoIcone("info", "Como adicionar alguém à equipe");
  bInfo.addEventListener("click", () => C.infoEquipe?.());
  // Minha foto (com lápis para trocar): a mesma do perfil no site.
  const bEu = h("button", "eq-eu"); bEu.type = "button"; bEu.title = "Trocar minha foto de perfil"; bEu.setAttribute("aria-label", "Trocar minha foto de perfil");
  const pintarEu = () => { const av = avatar({ ...pessoa(C.eu.uid), nome: C.nome || pessoa(C.eu.uid).nome }); const lp = h("span", "eq-eu-lapis"); lp.appendChild(ic("lapis", 13)); bEu.replaceChildren(av, lp); };
  pintarEu();
  bEu.addEventListener("click", () => trocarMinhaFoto(() => { pintarEu(); pintarLista(); pintarTopo(); nos.clear(); pintarChat(); }));
  ladoTopo.append(bEu, tit, bInfo);
  let modoLista = C.modoChatEquipe || (conv === "equipe" ? "equipe" : "individual");
  const modos = h("div", "eq-modos"); modos.setAttribute("role", "tablist"); modos.setAttribute("aria-label", "Tipo de conversa");
  const botaoModo = (k, icone, rotulo) => { const b = h("button"); b.type = "button"; b.setAttribute("role", "tab"); b.dataset.modo = k; b.append(ic(icone, 17), document.createTextNode(rotulo), h("b", "eq-modo-n")); b.addEventListener("click", () => { modoLista = C.modoChatEquipe = k; pintarLista(); }); return b; };
  modos.append(botaoModo("individual", "perfil", "Individual"), botaoModo("equipe", "grupo", "Equipe"));
  const pesquisa = h("label", "eq-pesquisa"); const inPesq = h("input"); inPesq.type = "search"; inPesq.placeholder = "Pesquisar conversa"; inPesq.setAttribute("aria-label", "Pesquisar conversa"); inPesq.autocomplete = "off";
  pesquisa.append(ic("lupa", 16), inPesq);
  inPesq.addEventListener("input", () => pintarLista());
  const listaConv = h("div", "eq-lista-itens");
  lado.append(ladoTopo, modos, pesquisa, listaConv);
  // ---------- conversa aberta ----------
  const painel = h("section", "eq-conversa"); painel.setAttribute("aria-label", "Conversa");
  const topo = h("header", "eq-topo");
  const voltar = botaoIcone("voltar", "Voltar às conversas", "eq-icone eq-voltar");
  const quem = h("div", "eq-quem");
  const bBusca = botaoIcone("lupa", "Buscar na conversa");
  const bMais = botaoIcone("mais", "Mais opções");
  topo.append(voltar, quem, bBusca, bMais);
  const barraBusca = h("div", "eq-busca"); barraBusca.hidden = true;
  const inBusca = h("input"); inBusca.type = "search"; inBusca.placeholder = "Buscar nesta conversa"; inBusca.setAttribute("aria-label", "Buscar nesta conversa");
  const resBusca = h("span", "eq-busca-res");
  const fBusca = botaoIcone("fechar", "Fechar busca");
  barraBusca.append(ic("lupa", 18), inBusca, resBusca, fBusca);
  const chat = h("div", "eq-msgs"); chat.setAttribute("aria-live", "polite");
  // ---------- campo de envio ----------
  const form = h("form", "eq-rodape");
  const sugest = h("div", "eq-mencoes"); sugest.hidden = true; sugest.setAttribute("role", "listbox");
  const respBarra = h("div", "eq-resp"); respBarra.hidden = true;
  const respTx = h("div", "tx");
  const respX = botaoIcone("fechar", "Cancelar resposta");
  respBarra.append(respTx, respX);
  const barra = h("div", "eq-compor");
  const inArq = h("input"); inArq.type = "file"; inArq.hidden = true;
  inArq.accept = "image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,.zip";
  const bAnexo = botaoIcone("clipe", "Enviar foto ou arquivo (até 680 KB)");
  const caixa = h("div", "eq-caixa");
  const txt = document.createElement("textarea"); txt.maxLength = 2000; txt.rows = 1; txt.placeholder = "Mensagem"; txt.setAttribute("aria-label", "Mensagem");
  const bMencao = botaoIcone("arroba", "Mencionar alguém da equipe");
  const bMic = botaoIcone("mic", "Gravar áudio");
  const conta = h("span", "eq-conta"); conta.setAttribute("aria-hidden", "true");
  caixa.append(bAnexo, txt, conta, bMencao, bMic);
  // Gravando: no lugar do campo (ponto vermelho, tempo e lixeira); a seta do botão redondo envia o áudio.
  const gravando = h("div", "eq-gravando"); gravando.hidden = true;
  const gTempo = h("span", "eq-grav-tempo", "0:00");
  const gCancelar = botaoIcone("lixo", "Descartar áudio", "eq-icone eq-perigo");
  gravando.append(h("span", "eq-grav-ponto"), gTempo, h("span", "eq-grav-txt", "Toque na seta para enviar · até 2 min"), gCancelar);
  // Botão redondo com a seta (como em Mensagens): fica claro enquanto não há o que enviar.
  const bPrincipal = h("button", "eq-principal"); bPrincipal.type = "button"; bPrincipal.appendChild(ic("enviar"));
  barra.append(caixa, gravando, bPrincipal, inArq);
  form.append(sugest, respBarra, barra);
  painel.append(topo, barraBusca, chat, form);
  // Menu de uma mensagem (reações + ações): um só para a conversa toda.
  const menu = h("div", "eq-menu"); menu.hidden = true; menu.setAttribute("role", "menu");
  raiz.append(lado, painel, menu);
  el.appendChild(raiz);

  // ---------- lista de conversas ----------
  const dmDe = (par) => C.dms?.get(par);
  const naoLidaDm = (par) => { const d = dmDe(par); return !!d && d.ultimoAutor !== C.eu.uid && ms(d.ultimaEm) > ms(d.lidoEm?.[C.eu.uid]); };
  const avGrupo = () => {
    const a = h("div", "ad-av eq-av-grupo");
    if (C.fotoGrupo) { const im = document.createElement("img"); im.src = C.fotoGrupo; im.alt = ""; a.appendChild(im); } else a.appendChild(ic("grupo", 24));
    return a;
  };
  // Foto do grupo ao vivo (com as regras antigas no servidor a leitura é recusada: fica o ícone).
  const pararFotoGrupo = fb.onSnapshot(fb.doc(fb.db, "equipe_info", "grupo"), (sn) => {
    const f = sn.exists() ? sn.data().foto : null;
    C.fotoGrupo = typeof f === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(f) ? f : null;
    if (el.isConnected) { pintarLista(); pintarTopo(); } else pararFotoGrupo();
  }, () => {});
  function pintarLista() {
    const itens = [];
    const ultG = C.chat.at(-1);
    itens.push({ id: "equipe", nome: "Equipe", sub: ultG ? `${ultG.autorId === C.eu.uid ? "Você" : primeiro(ultG.nome || nomeDe(ultG.autorId))}: ${previa(ultG)}` : "Conversa com todos", quando: ultG?.em, nao: C.chatNaoLidas || 0, grupo: true });
    D.admins.filter((a) => a.id !== C.eu.uid).forEach((a) => {
      const par = idPar(C.eu.uid, a.id), d = dmDe(par);
      itens.push({ id: par, uid: a.id, nome: a.nome || nomeDe(a.id), sub: d?.ultimaTexto ? `${d.ultimoAutor === C.eu.uid ? "Você: " : ""}${d.ultimaTexto}` : (PAPEIS[a.papel] || PAPEIS.dono), quando: d?.ultimaEm, nao: naoLidaDm(par) ? 1 : 0, on: C.online(a.id) });
    });
    const grupo = itens.shift();
    itens.sort((x, y) => ms(y.quando) - ms(x.quando) || (y.on - x.on) || x.nome.localeCompare(y.nome));
    // Abas Individual | Equipe com o número de não lidas de cada uma.
    const nInd = itens.filter((i) => i.nao).length, nEq = grupo.nao;
    modos.querySelectorAll("button").forEach((b) => {
      b.setAttribute("aria-selected", String(b.dataset.modo === modoLista));
      const n = b.dataset.modo === "equipe" ? nEq : nInd, bd = b.querySelector(".eq-modo-n");
      bd.hidden = !n; bd.textContent = n > 99 ? "99+" : String(n || "");
    });
    const termoL = inPesq.value.trim().toLowerCase();
    const visiveis = (modoLista === "equipe" ? [grupo] : itens).filter((it) => !termoL || it.nome.toLowerCase().includes(termoL));
    if (!visiveis.length) {
      const v = h("div", "eq-lista-vazia");
      v.append(h("strong", null, termoL ? "Nada encontrado" : "Ninguém mais na equipe ainda"), h("span", null, termoL ? `Nenhuma conversa com "${inPesq.value.trim()}".` : "Quando alguém entrar na equipe, a conversa com essa pessoa aparece aqui."));
      listaConv.replaceChildren(v); return;
    }
    listaConv.replaceChildren(...visiveis.map((it) => {
      const b = h("button", "eq-item" + (it.id === conv ? " ativa" : "") + (it.nao ? " nao-lida" : "")); b.type = "button";
      b.setAttribute("aria-current", it.id === conv ? "true" : "false");
      let av;
      if (it.grupo) {
        // Lápis na foto da equipe (como na minha foto): troca a foto sem abrir a conversa.
        av = h("span", "eq-av-com-lapis"); av.appendChild(avGrupo());
        const lp = h("span", "eq-eu-lapis eq-lapis-p"); lp.setAttribute("role", "button"); lp.tabIndex = 0; lp.title = "Trocar foto da equipe"; lp.setAttribute("aria-label", "Trocar foto da equipe"); lp.appendChild(ic("lapis", 11));
        const trocar = (e) => { e.stopPropagation(); e.preventDefault(); trocarFotoGrupo(); };
        lp.addEventListener("click", trocar); lp.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") trocar(e); });
        av.appendChild(lp);
      }
      else { av = avatar({ ...pessoa(it.uid), nome: it.nome }); av.classList.add("com-ponto"); const pt = h("i", "ad-ponto" + (it.on ? " on" : "")); pt.setAttribute("aria-hidden", "true"); av.appendChild(pt); }
      const tx = h("div", "tx");
      const l1 = h("div", "l1"); l1.append(h("strong", null, it.nome), h("small", null, it.quando ? relativoCurto(it.quando) : ""));
      const l2 = h("div", "l2"); l2.append(h("span", null, it.sub)); if (it.nao) l2.append(h("b", "eq-nao", it.grupo ? String(it.nao > 99 ? "99+" : it.nao) : "1"));
      tx.append(l1, l2);
      b.append(av, tx);
      b.addEventListener("click", () => abrir(it.id));
      return b;
    }));
  }
  const relativoCurto = (t) => { const d = Date.now() - ms(t); if (d < 60000) return "agora"; if (d < 3600000) return `${Math.floor(d / 60000)} min`; if (new Date(ms(t)).toDateString() === new Date().toDateString()) return hora(t); return new Date(ms(t)).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }); };

  // ---------- cabeçalho compacto ----------
  function pintarTopo() {
    quem.replaceChildren();
    quem.removeAttribute("title");
    if (conv === "equipe") {
      const nOn = D.admins.filter((a) => C.online(a.id)).length;
      const tx = h("div", "tx"); tx.append(h("strong", null, "Equipe"), h("small", null, `${D.admins.length} pessoas · ${nOn} online`));
      const bFoto = h("button", "eq-foto-grupo"); bFoto.type = "button"; bFoto.title = "Trocar foto da equipe"; bFoto.setAttribute("aria-label", "Trocar foto da equipe");
      const lpG = h("span", "eq-eu-lapis eq-lapis-p"); lpG.appendChild(ic("lapis", 11));
      bFoto.append(avGrupo(), lpG); bFoto.addEventListener("click", () => trocarFotoGrupo());
      quem.append(bFoto, tx);
    } else {
      const uid = outroDoPar(conv), a = D.admins.find((x) => x.id === uid) || {};
      const on = C.online(uid), pr = C.presenca.get(uid);
      const av = avatar({ ...pessoa(uid), nome: a.nome || nomeDe(uid) }); av.classList.add("com-ponto"); av.appendChild(h("i", "ad-ponto" + (on ? " on" : "")));
      const carga = [D.denuncias.filter((d) => d.responsavel === uid && ["nova", "em_analise"].includes(d.status)).length, D.suporte.filter((x) => x.responsavel === uid && x.status !== "fechado").length, C.tarefas.filter((t) => t.responsavel === uid && t.status !== "feito").length];
      const status = h("small", on ? "on" : null, `${on ? "online" : pr?.em ? "visto " + relativo(pr.em) : "ainda não abriu o painel"} · ${PAPEIS[a.papel] || PAPEIS.dono}`);
      const tx = h("div", "tx"); tx.append(h("strong", null, a.nome || nomeDe(uid)), status);
      quem.append(av, tx);
      quem.title = `Com ${primeiro(a.nome || nomeDe(uid))}: ${carga[0]} denúncia(s), ${carga[1]} chamado(s) e ${carga[2]} tarefa(s)`;
    }
  }

  // ---------- mensagens (cada uma guarda o seu elemento: um áudio tocando não para quando chega outra) ----------
  const hoje = () => new Date().toLocaleDateString("pt-BR");
  const ontem = () => new Date(Date.now() - 864e5).toLocaleDateString("pt-BR");
  function mensagensAtuais() {
    const l = conv === "equipe" ? C.chat : msgsDm;
    limparApagadasEq(l);
    return ocultasEq ? l.filter((m) => !ocultaEq(conv, m.id)) : l;
  }
  carregarOcultasEq().then(() => { if (el.isConnected) { nos.clear(); pintarChat(); } });
  const nos = new Map(); // chave -> { ass, el }
  function criarBalao(m, junto, t) {
    const meu = m.autorId === C.eu.uid;
    const p = pessoa(m.autorId);
    const linha = h("div", "eq-linha" + (meu ? " meu" : "") + (junto ? " junto" : "")); if (m.id) linha.dataset.id = m.id;
    if (!meu && conv === "equipe") { const av = avatar({ ...p, nome: m.nome || p.nome }); av.classList.add("eq-av-msg"); if (junto) av.classList.add("oculto"); linha.appendChild(av); }
    const mencionaMe = (m.mencoes || []).includes(C.eu.uid) && !meu;
    const bm = h("div", "eq-balao" + (meu ? " meu" : "") + (mencionaMe ? " mencao-eu" : "") + (m.tipoArquivo ? " tem-" + m.tipoArquivo : "") + (!m.texto && m.tipoArquivo ? " so-anexo" : ""));
    bm.tabIndex = 0;
    if (!meu && !junto && conv === "equipe") bm.appendChild(h("b", "eq-autor", m.nome || p.nome || "Equipe"));
    if (m.apagada) {
      // "Fulano apagou esta mensagem · 14:32" (+ "Ver mensagem apagada" por 24 horas).
      bm.classList.add("apagada");
      const quemApagou = m.apagada.por === C.eu.uid ? "Você" : primeiro(m.nome || nomeDe(m.autorId)) || "Alguém";
      const tx = h("div", "eq-texto eq-apagada-tx"); tx.append(ic("lixo", 16), h("span", null, `${quemApagou} apagou esta mensagem · ${horaCurta(m.apagada.em)}`));
      bm.appendChild(tx);
      if (noPrazo(m.apagada.em)) {
        const ver = h("button", "eq-ver-apagada"); ver.type = "button"; ver.append(ic("olho", 15), h("span", null, "Ver mensagem apagada"));
        ver.title = `Dá para abrir por mais ${tempoRestante(m.apagada.em)}`;
        ver.addEventListener("click", (e) => { e.stopPropagation(); verApagadaEq(m); });
        bm.appendChild(ver);
      }
      bm.appendChild(h("span", "eq-hora", `enviada ${hora(m.em)}`));
    } else {
    if (m.resposta && m.resposta.id) {
      const cit = h("button", "eq-cit"); cit.type = "button";
      cit.append(h("b", null, m.resposta.autorId === C.eu.uid ? "Você" : (m.resposta.nome || nomeDe(m.resposta.autorId) || "Equipe")), h("span", null, m.resposta.texto || "Anexo"));
      cit.addEventListener("click", (e) => { e.stopPropagation(); irParaMensagem(m.resposta.id); });
      bm.appendChild(cit);
    }
    if (m.tipoArquivo === "imagem") {
      const f = h("button", "eq-foto"); f.type = "button"; f.setAttribute("aria-label", "Abrir foto");
      if (m.miniatura) { const im = document.createElement("img"); im.src = m.miniatura; im.alt = m.nomeArquivo || "Foto"; im.loading = "lazy"; f.appendChild(im); }
      else f.append(ic("foto"), h("span", null, "Abrir foto"));
      f.addEventListener("click", (e) => { e.stopPropagation(); verFoto(m); }); bm.appendChild(f);
    } else if (m.tipoArquivo === "audio") {
      bm.appendChild(criarPlayerAudio({ chave: "eq:" + m.anexo, fonte: () => obterAnexo(m.anexo), duracao: m.duracao || 0, aoErro: () => toast("Não foi possível tocar o áudio.") }));
    } else if (m.tipoArquivo === "arquivo") {
      const a = h("button", "eq-arquivo"); a.type = "button"; a.setAttribute("aria-label", `Baixar ${m.nomeArquivo || "arquivo"}`);
      const ext = (String(m.nomeArquivo || "").split(".").pop() || "").slice(0, 4).toUpperCase();
      const icA = h("span", "ic"); icA.append(ic("documento", 26), h("b", null, ext));
      const d = h("span", "tx"); d.append(h("strong", null, m.nomeArquivo || "Arquivo"), h("small", null, m.tamanho ? kb(m.tamanho) : "Arquivo"));
      const bx = h("span", "bx"); bx.appendChild(ic("baixar", 18));
      a.append(icA, d, bx);
      a.addEventListener("click", (e) => { e.stopPropagation(); baixarAnexo(m); }); bm.appendChild(a);
    }
    const hr = h("span", "eq-hora");
    if (m.editadaEm) {
      const ed = h("button", "eq-editada", "editada"); ed.type = "button"; ed.title = "Ver o que foi editado"; ed.setAttribute("aria-label", "Mensagem editada: ver a original");
      ed.addEventListener("click", (e) => { e.stopPropagation(); verEdicoesHF({ atual: m.texto || "", editadaEm: m.editadaEm, edicoes: m.edicoes }); });
      hr.appendChild(ed);
    }
    hr.appendChild(document.createTextNode(hora(m.em)));
    if (m.texto) { const p2 = h("div", "eq-texto"); p2.appendChild(textoComMencoes(m.texto, m.mencoes)); if (t) marcar(p2, t); p2.appendChild(hr); bm.appendChild(p2); }
    else bm.appendChild(hr);
    // reações já dadas (agrupadas por emoji, com contagem)
    const reacoes = m.reacoes || {};
    const chavesReacao = Object.keys(reacoes);
    if (chavesReacao.length) {
      const cont = new Map();
      chavesReacao.forEach((uid) => { const e = reacoes[uid]; cont.set(e, (cont.get(e) || 0) + 1); });
      const linhaReac = h("div", "eq-reacoes");
      [...cont.entries()].forEach(([e, n]) => {
        const ch = h("button", "eq-reac" + (reacoes[C.eu.uid] === e ? " eu" : "")); ch.type = "button";
        ch.append(h("span", "em", e), h("span", "n", String(n)));
        ch.title = chavesReacao.filter((u) => reacoes[u] === e).map((u) => (u === C.eu.uid ? "Você" : nomeDe(u))).join(", ");
        ch.addEventListener("click", (ev) => { ev.stopPropagation(); reagir(m, e); });
        linhaReac.appendChild(ch);
      });
      bm.appendChild(linhaReac);
    }
    }
    // Botão do menu (aparece ao passar o mouse; no celular: toque longo na mensagem).
    const bMenu = h("button", "eq-balao-menu"); bMenu.type = "button"; bMenu.setAttribute("aria-label", "Opções da mensagem"); bMenu.appendChild(ic("seta", 18));
    bMenu.addEventListener("click", (e) => { e.stopPropagation(); const r = bMenu.getBoundingClientRect(); abrirMenu(m, r.left, r.bottom + 4, meu); });
    bm.appendChild(bMenu);
    bm.addEventListener("contextmenu", (e) => { e.preventDefault(); abrirMenu(m, e.clientX, e.clientY, meu); });
    bm.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === "ContextMenu") { e.preventDefault(); const r = bm.getBoundingClientRect(); abrirMenu(m, r.left + 12, r.bottom, meu); } });
    let timerToque = null;
    bm.addEventListener("touchstart", (e) => { const tq = e.touches[0]; timerToque = setTimeout(() => { navigator.vibrate?.(12); abrirMenu(m, tq.clientX, tq.clientY, meu); }, 480); }, { passive: true });
    ["touchend", "touchmove", "touchcancel"].forEach((ev) => bm.addEventListener(ev, () => clearTimeout(timerToque), { passive: true }));
    linha.appendChild(bm);
    return linha;
  }
  // "Grudado no fim": quem está lendo as últimas mensagens continua no fim mesmo quando uma foto
  // termina de carregar depois (antes o chat parava no meio da conversa).
  let grudado = true;
  chat.addEventListener("scroll", () => { grudado = chat.scrollHeight - chat.scrollTop - chat.clientHeight < 80; }, { passive: true });
  chat.addEventListener("load", (e) => { if (e.target.tagName === "IMG" && grudado && !termo.trim()) chat.scrollTop = chat.scrollHeight; }, true);
  function pintarChat() {
    const perto = chat.scrollHeight - chat.scrollTop - chat.clientHeight < 80;
    let lista = mensagensAtuais();
    const t = termo.trim().toLowerCase();
    if (t) lista = lista.filter((m) => `${m.texto || ""} ${m.nomeArquivo || ""} ${m.nome || ""}`.toLowerCase().includes(t));
    resBusca.textContent = t ? `${lista.length} resultado${lista.length === 1 ? "" : "s"}` : "";
    if (!lista.length) {
      const v = h("div", "eq-vazio");
      if (t) v.append(h("strong", null, "Nada encontrado"), h("span", null, `Nenhuma mensagem com "${termo.trim()}".`));
      else v.append(h("strong", null, conv === "equipe" ? "Comece a conversa" : `Conversa com ${nomeDe(outroDoPar(conv))}`), h("span", null, conv === "equipe" ? "As mensagens aqui ficam só entre a equipe." : "Só vocês dois veem esta conversa."));
      nos.clear(); chat.replaceChildren(v); return;
    }
    let diaAnt = "", autorAnt = "", msAnt = 0;
    const desejados = [], usados = new Set();
    lista.forEach((m) => {
      const dia = ms(m.em) ? new Date(ms(m.em)).toLocaleDateString("pt-BR") : hoje();
      if (dia !== diaAnt) {
        const k = "dia:" + dia; usados.add(k);
        let n = nos.get(k); if (!n) { n = { el: h("div", "eq-dia") }; nos.set(k, n); }
        const rot = dia === hoje() ? "Hoje" : dia === ontem() ? "Ontem" : dia;
        if (n.el.textContent !== rot) n.el.textContent = rot;
        desejados.push(n.el); diaAnt = dia; autorAnt = "";
      }
      const junto = !t && m.autorId === autorAnt && ms(m.em) - msAnt < 5 * 60000;
      const k = "m:" + (m.id || ms(m.em) + m.autorId); usados.add(k);
      const ass = JSON.stringify([junto, t, hora(m.em), m.texto || "", m.reacoes || null, m.resposta || null, m.tipoArquivo || "", m.anexo || "", m.miniatura ? 1 : 0, m.nome || "",
        ms(m.apagada?.em) || (m.apagada ? 1 : 0), m.apagada ? noPrazo(m.apagada.em) : 0, ms(m.editadaEm)]);
      let n = nos.get(k);
      if (!n || n.ass !== ass) { n = { ass, el: criarBalao(m, junto, t) }; nos.set(k, n); }
      desejados.push(n.el);
      autorAnt = m.autorId; msAnt = ms(m.em);
    });
    let atual = chat.firstChild;
    for (const no of desejados) { if (no === atual) { atual = atual.nextSibling; continue; } chat.insertBefore(no, atual); }
    while (atual) { const prox = atual.nextSibling; atual.remove(); atual = prox; }
    for (const k of [...nos.keys()]) if (!usados.has(k)) nos.delete(k);
    if (t) chat.scrollTop = 0; else if (perto || !pintarChat.feito) { chat.scrollTop = chat.scrollHeight; grudado = true; }
    pintarChat.feito = true;
  }
  function marcar(no, t) {
    const txt0 = no.textContent; const i = txt0.toLowerCase().indexOf(t); if (i < 0) return;
    no.replaceChildren(document.createTextNode(txt0.slice(0, i)), h("mark", null, txt0.slice(i, i + t.length)), document.createTextNode(txt0.slice(i + t.length)));
  }
  const reagir = (m, e) => alternarReacao(conv, m, e).catch((err) => toast("Não foi possível reagir: " + (err.code || err.message)));
  // ⋮ do topo da conversa: buscar e som de aviso.
  bMais.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.replaceChildren();
    const item = (icone, rotulo, fn) => { const b = h("button", "eq-menu-item"); b.type = "button"; b.setAttribute("role", "menuitem"); b.append(ic(icone, 19), h("span", null, rotulo)); b.addEventListener("click", () => { fecharMenu(); fn(); }); menu.appendChild(b); };
    item("lupa", "Buscar na conversa", () => { barraBusca.hidden = false; inBusca.focus(); });
    if (conv === "equipe") {
      item("camera", C.fotoGrupo ? "Trocar foto da equipe" : "Pôr foto na equipe", () => trocarFotoGrupo());
      if (C.fotoGrupo) item("lixo", "Tirar foto da equipe", () => trocarFotoGrupo(true));
    }
    const on = somAtivo();
    item(on ? "semSom" : "sino", on ? "Desligar som de aviso" : "Ligar som de aviso", () => { try { localStorage.setItem("hf-equipe-som", on ? "0" : "1"); } catch {} toast(on ? "Som de aviso desligado" : "Som de aviso ligado"); });
    menu.hidden = false;
    const r = bMais.getBoundingClientRect(), rm = menu.getBoundingClientRect();
    menu.style.left = Math.max(8, Math.min(r.right - rm.width, innerWidth - rm.width - 8)) + "px";
    menu.style.top = Math.min(r.bottom + 4, innerHeight - rm.height - 8) + "px";
  });

  // ---------- menu da mensagem: reações + responder, criar tarefa, copiar, baixar ----------
  function fecharMenu() { menu.hidden = true; }
  function abrirMenu(m, x, y, meu) {
    // O balão é reaproveitado: usa a versão atual da mensagem (a hora do servidor já chegou, edições...).
    m = (conv === "equipe" ? C.chat : msgsDm).find((x) => x.id === m.id) || m;
    menu.replaceChildren();
    const item = (icone, rotulo, fn, perigo) => { const b = h("button", "eq-menu-item" + (perigo ? " perigo" : "")); b.type = "button"; b.setAttribute("role", "menuitem"); b.append(ic(icone, 19), h("span", null, rotulo)); b.addEventListener("click", () => { fecharMenu(); fn(); }); menu.appendChild(b); };
    const lista = mensagensAtuais(), ultima = lista.at(-1)?.id === m.id;
    const apagar = async () => {
      const minha = meu && !m.apagada && !!ms(m.em);
      const modo = await escolherApagar({ podeTodos: minha && podeMexer(m.em), prazoPassou: minha && !podeMexer(m.em), jaApagada: !!m.apagada });
      if (modo === "todos") apagarEqParaTodos(conv, m, ultima);
      else if (modo === "mim") { await apagarEqParaMim(conv, m); nos.clear(); pintarChat(); }
    };
    if (m.apagada) {
      if (noPrazo(m.apagada.em)) item("olho", "Ver mensagem apagada", () => verApagadaEq(m));
      item("lixo", "Apagar para mim", apagar, true);
      return posicionarMenu(x, y, meu);
    }
    const reacoes = m.reacoes || {};
    const linhaE = h("div", "eq-menu-emojis");
    EMOJIS.forEach((e) => {
      const be = h("button", "eq-menu-emoji" + (reacoes[C.eu.uid] === e ? " eu" : "")); be.type = "button"; be.textContent = e; be.setAttribute("aria-label", "Reagir com " + e);
      be.addEventListener("click", () => { fecharMenu(); reagir(m, e); });
      linhaE.appendChild(be);
    });
    menu.appendChild(linhaE);
    item("responder", "Responder", () => definirResposta(m));
    item("tarefa", "Criar tarefa", () => editarTarefa({ titulo: (m.texto || m.nomeArquivo || "Mensagem do chat").slice(0, 140), descricao: `Do chat ${conv === "equipe" ? "da equipe" : "com " + nomeDe(outroDoPar(conv))} — ${m.nome || nomeDe(m.autorId)} (${hora(m.em)}): ${m.texto || previa(m)}`.slice(0, 2000) }));
    if (m.texto && navigator.clipboard) item("copiar", "Copiar texto", () => navigator.clipboard.writeText(m.texto).then(() => toast("Mensagem copiada")));
    if (m.anexo && m.tipoArquivo !== "audio") item("baixar", m.tipoArquivo === "imagem" ? "Baixar foto" : "Baixar arquivo", () => baixarAnexo(m));
    if (meu && ms(m.em) && podeMexer(m.em)) item("lapis", "Editar", () => editarEq(conv, m, ultima));
    if (m.editadaEm && Array.isArray(m.edicoes) && m.edicoes.length) item("relogio", "Ver original", () => verEdicoesHF({ atual: m.texto || "", editadaEm: m.editadaEm, edicoes: m.edicoes }));
    if (m.id) item("lixo", "Apagar", apagar, true);
    posicionarMenu(x, y, meu);
  }
  function posicionarMenu(x, y, meu) {
    menu.hidden = false;
    const r = menu.getBoundingClientRect();
    menu.style.left = Math.max(8, Math.min(meu ? x - r.width + 30 : x, innerWidth - r.width - 8)) + "px";
    menu.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + "px";
    menu.querySelector("button")?.focus({ preventScroll: true });
  }
  document.addEventListener("click", (e) => { if (!menu.hidden && !menu.contains(e.target)) fecharMenu(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) fecharMenu(); });
  chat.addEventListener("scroll", () => { if (!menu.hidden) fecharMenu(); }, { passive: true });

  // ---------- responder / citar ----------
  function pintarResposta() {
    if (!respondendo) { respBarra.hidden = true; respTx.replaceChildren(); return; }
    respBarra.hidden = false;
    respTx.replaceChildren(h("b", null, "Respondendo a " + (respondendo.autorId === C.eu.uid ? "você" : (respondendo.nome || nomeDe(respondendo.autorId)))), h("span", null, respondendo.texto || "Anexo"));
  }
  function definirResposta(m) {
    respondendo = { id: m.id, autorId: m.autorId, nome: m.nome || nomeDe(m.autorId), texto: (m.texto || previa(m) || "").slice(0, 200) };
    pintarResposta(); txt.focus();
  }
  respX.addEventListener("click", () => { respondendo = null; pintarResposta(); txt.focus(); });
  function irParaMensagem(id) {
    const alvo = chat.querySelector(`.eq-linha[data-id="${CSS.escape(id)}"]`);
    if (!alvo) { toast("Mensagem fora da conversa carregada"); return; }
    alvo.scrollIntoView({ behavior: "smooth", block: "center" });
    alvo.classList.add("destacada"); setTimeout(() => alvo.classList.remove("destacada"), 1600);
  }

  // ---------- abrir conversa ----------
  function abrir(id) {
    conv = id; C.conversaAberta = id; modoLista = C.modoChatEquipe = id === "equipe" ? "equipe" : "individual"; termo = ""; inBusca.value = ""; barraBusca.hidden = true; respondendo = null; pintarResposta(); fecharMenu();
    pararDm?.(); pararDm = null; msgsDm = []; pintarChat.feito = false; nos.clear();
    raiz.classList.add("aberta");
    if (id === "equipe") { C.marcarChatVisto?.(); }
    else {
      chat.replaceChildren(h("div", "eq-vazio", "Carregando…"));
      pararDm = fb.onSnapshot(fb.query(fb.collection(fb.db, "equipe_dm", id, "mensagens"), fb.orderBy("em", "desc"), fb.limit(150)), (s) => {
        msgsDm = s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })).reverse();
        if (conv === id) { pintarChat(); if (naoLidaDm(id)) marcarLidaDm(id); }
      }, (e) => { console.warn("Conversa:", e.code || e.message); nos.clear(); chat.replaceChildren(h("div", "eq-vazio", "Não foi possível abrir esta conversa.")); });
      if (naoLidaDm(id)) marcarLidaDm(id);
    }
    pintarTopo(); pintarLista();
    if (id === "equipe") pintarChat();
    C.contadores?.();
    if (matchMedia("(min-width: 761px)").matches) txt.focus({ preventScroll: true });
  }
  voltar.addEventListener("click", () => { raiz.classList.remove("aberta"); });
  const fecharBusca = () => { barraBusca.hidden = true; termo = ""; inBusca.value = ""; pintarChat(); };
  bBusca.addEventListener("click", () => { if (barraBusca.hidden) { barraBusca.hidden = false; inBusca.focus(); } else fecharBusca(); });
  fBusca.addEventListener("click", fecharBusca);
  inBusca.addEventListener("keydown", (e) => { if (e.key === "Escape") fecharBusca(); });
  let tBusca; inBusca.addEventListener("input", () => { clearTimeout(tBusca); tBusca = setTimeout(() => { termo = inBusca.value; pintarChat(); }, 150); });

  // ---------- campo, botão redondo, @menção ----------
  const mencoes = new Map(); // primeiro nome (minúsculo) -> uid
  const ajustar = () => { txt.style.height = "auto"; txt.style.height = Math.min(140, txt.scrollHeight) + "px"; };
  function pintarPrincipal() {
    const grav = !!gravador, temTexto = !!txt.value.trim();
    bPrincipal.classList.toggle("vazio", !temTexto && !grav);
    const rot = grav ? "Enviar áudio" : "Enviar";
    bPrincipal.setAttribute("aria-label", rot); bPrincipal.title = rot;
    bMic.hidden = !podeGravar();
  }
  const atualizarCampo = () => { conta.textContent = txt.value.length > 1600 ? `${2000 - txt.value.length}` : ""; ajustar(); pintarPrincipal(); };
  function candidatos(q) {
    return D.admins.filter((a) => a.id !== C.eu.uid).map((a) => ({ uid: a.id, nome: a.nome || nomeDe(a.id) })).filter((a) => primeiro(a.nome).toLowerCase().startsWith(q.toLowerCase()) || a.nome.toLowerCase().includes(q.toLowerCase()));
  }
  function tokenAtual() { const ate = txt.value.slice(0, txt.selectionStart); const m = ate.match(/(^|\s)@([^\s@]{0,20})$/); return m ? { q: m[2], ini: ate.length - m[2].length - 1 } : null; }
  function mostrarSugestoes() {
    const tk = tokenAtual(); if (!tk) { sugest.hidden = true; return; }
    const cs = candidatos(tk.q); if (!cs.length) { sugest.hidden = true; return; }
    sugest.replaceChildren(...cs.slice(0, 6).map((c, i) => { const b = h("button", "eq-mencao-op" + (i === 0 ? " sel" : "")); b.type = "button"; b.setAttribute("role", "option"); const av = avatar({ ...pessoa(c.uid), nome: c.nome }); av.classList.add("eq-av-msg"); b.append(av, h("span", null, c.nome)); b.addEventListener("mousedown", (e) => { e.preventDefault(); escolher(c, tk); }); return b; }));
    sugest.hidden = false;
  }
  function escolher(c, tk = tokenAtual()) {
    if (!tk) return;
    const nome = primeiro(c.nome); const antes = txt.value.slice(0, tk.ini), depois = txt.value.slice(txt.selectionStart);
    txt.value = `${antes}@${nome} ${depois}`; const pos = (antes + "@" + nome + " ").length; txt.setSelectionRange(pos, pos);
    mencoes.set(nome.toLowerCase(), c.uid); sugest.hidden = true; atualizarCampo(); txt.focus();
  }
  txt.addEventListener("input", () => { atualizarCampo(); mostrarSugestoes(); });
  txt.addEventListener("blur", () => setTimeout(() => { sugest.hidden = true; }, 150));
  bMencao.addEventListener("click", () => { const p0 = txt.selectionStart ?? txt.value.length; const antes = txt.value.slice(0, p0); const sep = antes && !/\s$/.test(antes) ? " " : ""; txt.value = antes + sep + "@" + txt.value.slice(p0); const pos = (antes + sep + "@").length; txt.focus(); txt.setSelectionRange(pos, pos); mostrarSugestoes(); atualizarCampo(); });
  const mencoesDoTexto = (t) => {
    const r = [];
    for (const m of t.matchAll(/@([^\s@.,!?;:]{1,20})/g)) {
      const k = m[1].toLowerCase();
      const uid = mencoes.get(k) || D.admins.find((a) => primeiro(a.nome || nomeDe(a.id)).toLowerCase() === k)?.id;
      if (uid && uid !== C.eu.uid) r.push(uid);
    }
    return r;
  };
  let enviando = false;
  async function enviar() {
    const t = txt.value.trim(); if (!t || enviando) return;
    enviando = true;
    const resp = respondendo, menc = mencoesDoTexto(t);
    // Limpa na hora (como num mensageiro); se falhar, o texto volta para o campo.
    txt.value = ""; mencoes.clear(); respondendo = null; pintarResposta(); atualizarCampo();
    try { await enviarMensagem(conv, { texto: t, mencoes: menc, resposta: resp }); chat.scrollTop = chat.scrollHeight; }
    catch (e) { console.error(e); if (!txt.value) { txt.value = t; respondendo = resp; pintarResposta(); atualizarCampo(); } toast("Não foi possível enviar: " + (e.code || e.message)); }
    finally { enviando = false; }
  }
  form.addEventListener("submit", (e) => { e.preventDefault(); enviar(); });
  bPrincipal.addEventListener("click", () => { if (gravador) parar(false); else if (txt.value.trim()) enviar(); else txt.focus(); });
  bMic.addEventListener("click", () => { if (podeGravar()) iniciarGravacao(); else toast("Este navegador não grava áudio."); });
  // Tocar no botão não tira o foco do campo (o teclado do celular continua aberto).
  ["pointerdown", "mousedown"].forEach((ev) => bPrincipal.addEventListener(ev, (e) => { if (document.activeElement === txt && txt.value.trim()) e.preventDefault(); }));
  txt.addEventListener("keydown", (e) => {
    if (!sugest.hidden) {
      const ops = [...sugest.querySelectorAll(".eq-mencao-op")]; const i = ops.findIndex((o) => o.classList.contains("sel"));
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); ops[i]?.classList.remove("sel"); ops[(i + (e.key === "ArrowDown" ? 1 : ops.length - 1)) % ops.length]?.classList.add("sel"); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); ops[Math.max(0, i)]?.dispatchEvent(new MouseEvent("mousedown")); return; }
      if (e.key === "Escape") { sugest.hidden = true; return; }
    }
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); enviar(); }
  });

  // ---------- foto / arquivo ----------
  bAnexo.addEventListener("click", () => inArq.click());
  async function enviarArquivo(arquivo) {
    if (!arquivo) return;
    bAnexo.disabled = true; toast(`Enviando ${arquivo.name || "arquivo"}…`);
    try {
      const anexo = await prepararArquivo(arquivo);
      const legenda = txt.value.trim();
      await enviarMensagem(conv, { texto: legenda, anexo, mencoes: mencoesDoTexto(legenda), resposta: respondendo });
      respondendo = null; pintarResposta();
      if (legenda) { txt.value = ""; mencoes.clear(); atualizarCampo(); }
      chat.scrollTop = chat.scrollHeight;
      document.querySelector(".ad-toast")?.remove();
    } catch (e) { console.error(e); toast(e.message && !e.code ? e.message : "Não foi possível enviar: " + (e.code || e.message)); }
    finally { bAnexo.disabled = false; inArq.value = ""; }
  }
  inArq.addEventListener("change", () => enviarArquivo(inArq.files?.[0]));
  // Colar uma imagem (Ctrl+V) ou arrastar um arquivo para dentro do chat.
  txt.addEventListener("paste", (e) => { const f = [...(e.clipboardData?.files || [])][0]; if (f) { e.preventDefault(); enviarArquivo(f); } });
  painel.addEventListener("dragover", (e) => { if (e.dataTransfer?.types?.includes("Files")) { e.preventDefault(); painel.classList.add("arrastando"); } });
  painel.addEventListener("dragleave", (e) => { if (e.target === painel) painel.classList.remove("arrastando"); });
  painel.addEventListener("drop", (e) => { const f = e.dataTransfer?.files?.[0]; painel.classList.remove("arrastando"); if (f) { e.preventDefault(); enviarArquivo(f); } });

  // ---------- áudio ----------
  let gravador = null, partes = [], inicio = 0, relogio = null, descartar = false;
  function podeGravar() { return !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined"; }
  async function iniciarGravacao() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      partes = []; descartar = false;
      try { gravador = new MediaRecorder(stream, { audioBitsPerSecond: 16000 }); } catch { gravador = new MediaRecorder(stream); }
      gravador.ondataavailable = (e) => { if (e.data.size) partes.push(e.data); };
      gravador.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const tipo = gravador?.mimeType || "audio/webm"; const dur = (Date.now() - inicio) / 1000;
        gravador = null; clearInterval(relogio); gravando.hidden = true; caixa.hidden = false; pintarPrincipal();
        if (descartar || !partes.length) return;
        try {
          const dados = await lerDataUrl(new Blob(partes, { type: tipo }));
          if (dados.length > 900000) throw new Error("Áudio longo demais. Grave até 2 minutos.");
          await enviarMensagem(conv, { anexo: { tipo: "audio", dados: dados.replace(/^data:audio\/([a-z0-9.+-]+);[^,]*,/i, "data:audio/$1;base64,"), nome: "audio", tamanho: Math.round(dados.length * 0.75), duracao: dur } });
          chat.scrollTop = chat.scrollHeight;
        } catch (e) { console.error(e); toast(e.message && !e.code ? e.message : "Não foi possível enviar o áudio."); }
      };
      gravador.start(); inicio = Date.now();
      caixa.hidden = true; gravando.hidden = false; gTempo.textContent = "0:00"; pintarPrincipal();
      relogio = setInterval(() => { const s = (Date.now() - inicio) / 1000; gTempo.textContent = seg(s); if (s >= LIMITE_AUDIO_SEG) parar(false); }, 250);
    } catch (e) { console.warn(e); toast("Não foi possível usar o microfone. Libere a permissão do navegador."); }
  }
  function parar(cancelar) { descartar = cancelar; if (gravador && gravador.state !== "inactive") gravador.stop(); }
  gCancelar.addEventListener("click", () => parar(true));

  // ---------- ao vivo ----------
  C.aoMudarEquipe = () => {
    if (!el.isConnected) { C.aoMudarEquipe = null; C.conversaAberta = null; pararDm?.(); return; }
    pintarLista(); pintarTopo();
    if (conv === "equipe") { pintarChat(); C.marcarChatVisto?.(); }
  };
  atualizarCampo();
  abrir(conv);
  raiz.classList.remove("aberta"); // no celular começa pela lista
}
