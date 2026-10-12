// =====================================================
// Painel — chat da equipe
// - "Equipe" (todos juntos) e uma conversa individual com cada membro
// - texto, @menção, foto, arquivo (até 680 KB) e áudio (até 2 min)
// - o conteúdo do anexo fica em equipe_anexos/{id} e só é baixado quando
//   alguém abre (foto, áudio, arquivo): a lista de mensagens continua leve
// - busca na conversa, som de aviso e "virar tarefa" em cada mensagem
// Grupo: equipe_chat/{id} · individual: equipe_dm/{uidA_uidB}/mensagens/{id}
// =====================================================
import { C, D, h, ms, toast, avatar, selo, relativo, editarTarefa, nomeEquipe, PAPEIS } from "./admin-base.js?v=9";

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
  if (m.texto) return String(m.texto).slice(0, 120);
  return m.tipoArquivo === "imagem" ? "📷 Foto" : m.tipoArquivo === "audio" ? `🎤 Áudio${m.duracao ? " " + seg(m.duracao) : ""}` : m.tipoArquivo === "arquivo" ? `📎 ${m.nomeArquivo || "Arquivo"}` : "";
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
async function enviarMensagem(conv, { texto = "", anexo = null, mencoes = [] }) {
  const { fb } = C;
  const lote = fb.writeBatch(fb.db);
  const dados = { autorId: C.eu.uid, nome: String(C.nome || "").slice(0, 80), texto: String(texto).slice(0, 2000), em: fb.serverTimestamp() };
  if (mencoes.length) dados.mencoes = [...new Set(mencoes)].slice(0, 10);
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

// =====================================================
// Monta o chat dentro de "el"
// =====================================================
export function montarChat(el) {
  const { fb } = C;
  let conv = C.conversaAberta && (C.conversaAberta === "equipe" || C.conversaAberta.includes(C.eu.uid)) ? C.conversaAberta : "equipe";
  let msgsDm = [], pararDm = null, termo = "";
  const raiz = h("div", "ad-chat2");
  // ---------- lista de conversas ----------
  const lado = h("aside", "ad-conversas"); lado.setAttribute("aria-label", "Conversas da equipe");
  const ladoTopo = h("div", "ad-conversas-topo"); ladoTopo.append(h("h3", null, "Conversas"));
  const listaConv = h("div", "ad-conversas-lista");
  lado.append(ladoTopo, listaConv);
  // ---------- conversa aberta ----------
  const painel = h("section", "ad-conversa"); painel.setAttribute("aria-label", "Conversa");
  const topo = h("div", "ad-conversa-topo");
  const voltar = h("button", "ad-icone ad-conversa-voltar", "‹"); voltar.type = "button"; voltar.setAttribute("aria-label", "Voltar às conversas");
  const quem = h("div", "ad-conversa-quem");
  const acoes = h("div", "ad-conversa-acoes");
  const bBusca = h("button", "ad-icone", "🔍"); bBusca.type = "button"; bBusca.title = "Buscar na conversa"; bBusca.setAttribute("aria-label", "Buscar na conversa");
  const bSom = h("button", "ad-icone"); bSom.type = "button";
  const pintarSom = () => { const on = somAtivo(); bSom.textContent = on ? "🔔" : "🔕"; bSom.title = on ? "Som de aviso ligado" : "Som de aviso desligado"; bSom.setAttribute("aria-pressed", String(on)); };
  bSom.addEventListener("click", () => { try { localStorage.setItem("hf-equipe-som", somAtivo() ? "0" : "1"); } catch {} pintarSom(); toast(somAtivo() ? "Som de aviso ligado" : "Som de aviso desligado"); });
  pintarSom();
  acoes.append(bBusca, bSom);
  topo.append(voltar, quem, acoes);
  const barraBusca = h("div", "ad-chat-busca"); barraBusca.hidden = true;
  const inBusca = h("input"); inBusca.type = "search"; inBusca.placeholder = "Buscar nesta conversa…"; inBusca.setAttribute("aria-label", "Buscar nesta conversa");
  const resBusca = h("span", "ad-chat-busca-res");
  barraBusca.append(inBusca, resBusca);
  const chat = h("div", "ad-chat"); chat.setAttribute("aria-live", "polite");
  // ---------- campo de envio ----------
  const form = h("form", "ad-chat-form");
  const sugest = h("div", "ad-mencao-lista"); sugest.hidden = true; sugest.setAttribute("role", "listbox");
  const barra = h("div", "ad-chat-barra");
  const inArq = h("input"); inArq.type = "file"; inArq.hidden = true;
  inArq.accept = "image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,.zip";
  const bAnexo = h("button", "ad-icone ad-chat-ferr", "📎"); bAnexo.type = "button"; bAnexo.title = "Enviar foto ou arquivo"; bAnexo.setAttribute("aria-label", "Enviar foto ou arquivo");
  const bMencao = h("button", "ad-icone ad-chat-ferr", "@"); bMencao.type = "button"; bMencao.title = "Mencionar alguém"; bMencao.setAttribute("aria-label", "Mencionar alguém da equipe");
  const campo = h("div", "ad-chat-campo");
  const txt = document.createElement("textarea"); txt.maxLength = 2000; txt.rows = 1; txt.placeholder = "Escreva uma mensagem…"; txt.setAttribute("aria-label", "Mensagem");
  const conta = h("span", "ad-chat-conta"); conta.setAttribute("aria-hidden", "true");
  campo.append(txt, conta);
  const bAudio = h("button", "ad-icone ad-chat-ferr", "🎤"); bAudio.type = "button"; bAudio.title = "Gravar áudio"; bAudio.setAttribute("aria-label", "Gravar áudio");
  const env = h("button", "ad-bt pri", "Enviar"); env.type = "submit"; env.disabled = true;
  barra.append(bAnexo, bMencao, campo, bAudio, env, inArq);
  const gravando = h("div", "ad-chat-gravando"); gravando.hidden = true;
  const gTempo = h("span", "ad-gravando-tempo", "0:00");
  const gCancelar = h("button", "ad-bt", "Cancelar"); gCancelar.type = "button";
  const gEnviar = h("button", "ad-bt pri", "Enviar áudio"); gEnviar.type = "button";
  gravando.append(h("span", "ad-gravando-ponto"), h("span", null, "Gravando"), gTempo, gCancelar, gEnviar);
  const dica = h("p", "ad-chat-dica", "Enter envia · Shift+Enter quebra a linha · @ para mencionar · 📎 foto ou arquivo (até 680 KB) · 🎤 áudio (até 2 min)");
  form.append(sugest, barra, gravando, dica);
  painel.append(topo, barraBusca, chat, form);
  raiz.append(lado, painel);
  el.appendChild(raiz);

  // ---------- lista de conversas ----------
  const dmDe = (par) => C.dms?.get(par);
  const naoLidaDm = (par) => { const d = dmDe(par); return !!d && d.ultimoAutor !== C.eu.uid && ms(d.ultimaEm) > ms(d.lidoEm?.[C.eu.uid]); };
  function pintarLista() {
    const itens = [];
    // grupo
    const ultG = C.chat.at(-1);
    itens.push({ id: "equipe", nome: "Equipe", sub: ultG ? `${ultG.autorId === C.eu.uid ? "Você" : primeiro(ultG.nome || nomeDe(ultG.autorId))}: ${previa(ultG)}` : "Conversa com todos", quando: ultG?.em, nao: C.chatNaoLidas || 0, grupo: true });
    D.admins.filter((a) => a.id !== C.eu.uid).forEach((a) => {
      const par = idPar(C.eu.uid, a.id), d = dmDe(par);
      itens.push({ id: par, uid: a.id, nome: a.nome || nomeDe(a.id), sub: d?.ultimaTexto ? `${d.ultimoAutor === C.eu.uid ? "Você: " : ""}${d.ultimaTexto}` : (PAPEIS[a.papel] || PAPEIS.dono), quando: d?.ultimaEm, nao: naoLidaDm(par) ? 1 : 0, on: C.online(a.id) });
    });
    const grupo = itens.shift();
    itens.sort((x, y) => ms(y.quando) - ms(x.quando) || (y.on - x.on) || x.nome.localeCompare(y.nome));
    listaConv.replaceChildren(...[grupo, ...itens].map((it) => {
      const b = h("button", "ad-conv" + (it.id === conv ? " ativa" : "") + (it.nao ? " nao-lida" : "")); b.type = "button";
      b.setAttribute("aria-current", it.id === conv ? "true" : "false");
      let av;
      if (it.grupo) { av = h("div", "ad-av ad-av-grupo", "👥"); }
      else { av = avatar({ ...pessoa(it.uid), nome: it.nome }); av.classList.add("com-ponto"); const pt = h("i", "ad-ponto" + (it.on ? " on" : "")); pt.setAttribute("aria-hidden", "true"); av.appendChild(pt); }
      const tx = h("div", "tx");
      const l1 = h("div", "l1"); l1.append(h("strong", null, it.nome), h("small", null, it.quando ? relativoCurto(it.quando) : ""));
      const l2 = h("div", "l2"); l2.append(h("span", null, it.sub)); if (it.nao) l2.append(h("b", "ad-conv-nao", it.grupo ? String(it.nao > 99 ? "99+" : it.nao) : "●"));
      tx.append(l1, l2);
      b.append(av, tx);
      b.addEventListener("click", () => abrir(it.id));
      return b;
    }));
  }
  const relativoCurto = (t) => { const d = Date.now() - ms(t); if (d < 60000) return "agora"; if (d < 3600000) return `${Math.floor(d / 60000)} min`; if (new Date(ms(t)).toDateString() === new Date().toDateString()) return hora(t); return new Date(ms(t)).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }); };

  // ---------- cabeçalho ----------
  function pintarTopo() {
    quem.replaceChildren();
    if (conv === "equipe") {
      const nOn = D.admins.filter((a) => C.online(a.id)).length;
      const av = h("div", "ad-av ad-av-grupo", "👥");
      const tx = h("div", "tx"); tx.append(h("strong", null, "Equipe"), h("small", null, `${D.admins.length} pessoas · ${nOn} online agora`));
      quem.append(av, tx);
    } else {
      const uid = outroDoPar(conv), a = D.admins.find((x) => x.id === uid) || {};
      const on = C.online(uid), pr = C.presenca.get(uid);
      const av = avatar({ ...pessoa(uid), nome: a.nome || nomeDe(uid) }); av.classList.add("com-ponto"); const pt = h("i", "ad-ponto" + (on ? " on" : "")); av.appendChild(pt);
      const carga = [D.denuncias.filter((d) => d.responsavel === uid && ["nova", "em_analise"].includes(d.status)).length, D.suporte.filter((x) => x.responsavel === uid && x.status !== "fechado").length, C.tarefas.filter((t) => t.responsavel === uid && t.status !== "feito").length];
      const tx = h("div", "tx"); tx.append(h("strong", null, a.nome || nomeDe(uid)), h("small", null, `${on ? "Online" : pr?.em ? "Visto " + relativo(pr.em) : "Ainda não abriu o painel"} · ${PAPEIS[a.papel] || PAPEIS.dono} · com ele(a): ${carga[0]} denúncia(s), ${carga[1]} chamado(s), ${carga[2]} tarefa(s)`));
      quem.append(av, tx);
    }
  }

  // ---------- mensagens ----------
  const hoje = () => new Date().toLocaleDateString("pt-BR");
  function mensagensAtuais() { return conv === "equipe" ? C.chat : msgsDm; }
  function pintarChat() {
    const perto = chat.scrollHeight - chat.scrollTop - chat.clientHeight < 80;
    let lista = mensagensAtuais();
    const t = termo.trim().toLowerCase();
    if (t) lista = lista.filter((m) => `${m.texto || ""} ${m.nomeArquivo || ""} ${m.nome || ""}`.toLowerCase().includes(t));
    resBusca.textContent = t ? `${lista.length} resultado(s)` : "";
    if (!lista.length) {
      const v = h("div", "ad-vazio ad-chat-vazio");
      if (t) v.append(h("strong", null, "Nada encontrado"), h("span", null, `Nenhuma mensagem com "${termo.trim()}".`));
      else v.append(h("strong", null, conv === "equipe" ? "Comece a conversa" : `Conversa com ${nomeDe(outroDoPar(conv))}`), h("span", null, conv === "equipe" ? "As mensagens aqui ficam só entre a equipe." : "Só vocês dois veem esta conversa."));
      chat.replaceChildren(v); return;
    }
    let diaAnt = "", autorAnt = "", msAnt = 0;
    const nos = [];
    lista.forEach((m) => {
      const dia = ms(m.em) ? new Date(ms(m.em)).toLocaleDateString("pt-BR") : hoje();
      if (dia !== diaAnt) { nos.push(h("div", "ad-chat-dia", dia === hoje() ? "Hoje" : dia)); diaAnt = dia; autorAnt = ""; }
      const meu = m.autorId === C.eu.uid;
      const junto = !t && m.autorId === autorAnt && ms(m.em) - msAnt < 5 * 60000;
      const p = pessoa(m.autorId);
      const linha = h("div", "ad-chat-linha" + (meu ? " meu" : "") + (junto ? " junto" : ""));
      if (!meu) { const av = avatar({ ...p, nome: m.nome || p.nome }); av.classList.add("ad-chat-av"); if (junto) av.style.visibility = "hidden"; linha.appendChild(av); }
      const mencionaMe = (m.mencoes || []).includes(C.eu.uid) && !meu;
      const bm = h("div", "ad-msg" + (meu ? " equipe" : "") + (mencionaMe ? " mencao-eu" : ""));
      if (!meu && !junto && conv === "equipe") bm.appendChild(h("b", "ad-msg-autor", m.nome || p.nome || "Equipe"));
      if (m.tipoArquivo === "imagem") {
        const f = h("button", "ad-msg-foto"); f.type = "button"; f.setAttribute("aria-label", "Abrir foto");
        if (m.miniatura) { const im = document.createElement("img"); im.src = m.miniatura; im.alt = m.nomeArquivo || "Foto"; im.loading = "lazy"; f.appendChild(im); } else f.textContent = "📷 Abrir foto";
        f.addEventListener("click", () => verFoto(m)); bm.appendChild(f);
      } else if (m.tipoArquivo === "audio") {
        const a = h("button", "ad-msg-audio"); a.type = "button"; a.append(h("span", "play", "▶"), h("span", null, `Áudio ${m.duracao ? seg(m.duracao) : ""}`));
        a.addEventListener("click", async () => {
          a.disabled = true; a.lastChild.textContent = "Carregando…";
          try { const d = await obterAnexo(m.anexo); const au = document.createElement("audio"); au.controls = true; au.src = d; au.className = "ad-msg-player"; a.replaceWith(au); au.play().catch(() => {}); }
          catch (e) { a.disabled = false; a.lastChild.textContent = "Tentar de novo"; toast("Não foi possível tocar o áudio."); }
        });
        bm.appendChild(a);
      } else if (m.tipoArquivo === "arquivo") {
        const a = h("button", "ad-msg-arquivo"); a.type = "button";
        a.append(h("span", "ic", "📄"), (() => { const d = h("span", "tx"); d.append(h("strong", null, m.nomeArquivo || "Arquivo"), h("small", null, `${m.tamanho ? kb(m.tamanho) + " · " : ""}Baixar`)); return d; })());
        a.addEventListener("click", () => baixarAnexo(m)); bm.appendChild(a);
      }
      if (m.texto) { const p2 = h("div", "ad-msg-texto"); p2.appendChild(textoComMencoes(m.texto, m.mencoes)); if (t) marcar(p2, t); bm.appendChild(p2); }
      const rod = h("small", null, hora(m.em));
      bm.appendChild(rod);
      // ações: virar tarefa / copiar
      const mais = h("div", "ad-msg-acoes");
      const bt = h("button", "ad-msg-acao", "Criar tarefa"); bt.type = "button";
      bt.addEventListener("click", () => editarTarefa({ titulo: (m.texto || m.nomeArquivo || "Mensagem do chat").slice(0, 140), descricao: `Do chat ${conv === "equipe" ? "da equipe" : "com " + nomeDe(outroDoPar(conv))} — ${m.nome || nomeDe(m.autorId)} (${hora(m.em)}): ${m.texto || previa(m)}`.slice(0, 2000) }));
      mais.appendChild(bt);
      if (m.texto && navigator.clipboard) { const bc = h("button", "ad-msg-acao", "Copiar"); bc.type = "button"; bc.addEventListener("click", () => navigator.clipboard.writeText(m.texto).then(() => toast("Mensagem copiada"))); mais.appendChild(bc); }
      bm.appendChild(mais);
      linha.appendChild(bm);
      nos.push(linha);
      autorAnt = m.autorId; msAnt = ms(m.em);
    });
    chat.replaceChildren(...nos);
    if (t) chat.scrollTop = 0; else if (perto || !pintarChat.feito) chat.scrollTop = chat.scrollHeight;
    pintarChat.feito = true;
  }
  function marcar(no, t) {
    const txt0 = no.textContent; const i = txt0.toLowerCase().indexOf(t); if (i < 0) return;
    no.replaceChildren(document.createTextNode(txt0.slice(0, i)), h("mark", null, txt0.slice(i, i + t.length)), document.createTextNode(txt0.slice(i + t.length)));
  }

  // ---------- abrir conversa ----------
  function abrir(id) {
    conv = id; C.conversaAberta = id; termo = ""; inBusca.value = ""; barraBusca.hidden = true;
    pararDm?.(); pararDm = null; msgsDm = []; pintarChat.feito = false;
    raiz.classList.add("aberta");
    if (id === "equipe") { C.marcarChatVisto?.(); }
    else {
      chat.replaceChildren(h("div", "ad-vazio", "Carregando…"));
      pararDm = fb.onSnapshot(fb.query(fb.collection(fb.db, "equipe_dm", id, "mensagens"), fb.orderBy("em", "desc"), fb.limit(150)), (s) => {
        msgsDm = s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })).reverse();
        if (conv === id) { pintarChat(); if (naoLidaDm(id)) marcarLidaDm(id); }
      }, (e) => { console.warn("Conversa:", e.code || e.message); chat.replaceChildren(h("div", "ad-vazio", "Não foi possível abrir esta conversa.")); });
      if (naoLidaDm(id)) marcarLidaDm(id);
    }
    pintarTopo(); pintarLista();
    if (id === "equipe") pintarChat();
    C.contadores?.();
    txt.focus({ preventScroll: true });
  }
  voltar.addEventListener("click", () => { raiz.classList.remove("aberta"); });
  bBusca.addEventListener("click", () => { barraBusca.hidden = !barraBusca.hidden; if (!barraBusca.hidden) inBusca.focus(); else { termo = ""; inBusca.value = ""; pintarChat(); } });
  let tBusca; inBusca.addEventListener("input", () => { clearTimeout(tBusca); tBusca = setTimeout(() => { termo = inBusca.value; pintarChat(); }, 150); });

  // ---------- campo, @menção ----------
  const mencoes = new Map(); // primeiro nome (minúsculo) -> uid
  const ajustar = () => { txt.style.height = "auto"; txt.style.height = Math.min(140, txt.scrollHeight) + "px"; };
  const atualizarCampo = () => { const n = txt.value.trim().length; env.disabled = !n; conta.textContent = txt.value.length > 1600 ? `${2000 - txt.value.length}` : ""; ajustar(); };
  function candidatos(q) {
    return D.admins.filter((a) => a.id !== C.eu.uid).map((a) => ({ uid: a.id, nome: a.nome || nomeDe(a.id) })).filter((a) => primeiro(a.nome).toLowerCase().startsWith(q.toLowerCase()) || a.nome.toLowerCase().includes(q.toLowerCase()));
  }
  function tokenAtual() { const ate = txt.value.slice(0, txt.selectionStart); const m = ate.match(/(^|\s)@([^\s@]{0,20})$/); return m ? { q: m[2], ini: ate.length - m[2].length - 1 } : null; }
  function mostrarSugestoes() {
    const tk = tokenAtual(); if (!tk) { sugest.hidden = true; return; }
    const cs = candidatos(tk.q); if (!cs.length) { sugest.hidden = true; return; }
    sugest.replaceChildren(...cs.slice(0, 6).map((c, i) => { const b = h("button", "ad-mencao-op" + (i === 0 ? " sel" : "")); b.type = "button"; b.setAttribute("role", "option"); const av = avatar({ ...pessoa(c.uid), nome: c.nome }); av.classList.add("ad-chat-av"); b.append(av, h("span", null, c.nome)); b.addEventListener("mousedown", (e) => { e.preventDefault(); escolher(c, tk); }); return b; }));
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
  bMencao.addEventListener("click", () => { const p0 = txt.selectionStart ?? txt.value.length; const antes = txt.value.slice(0, p0); const sep = antes && !/\s$/.test(antes) ? " " : ""; txt.value = antes + sep + "@" + txt.value.slice(p0); const pos = (antes + sep + "@").length; txt.focus(); txt.setSelectionRange(pos, pos); mostrarSugestoes(); });
  const mencoesDoTexto = (t) => {
    const r = [];
    for (const m of t.matchAll(/@([^\s@.,!?;:]{1,20})/g)) {
      const k = m[1].toLowerCase();
      const uid = mencoes.get(k) || D.admins.find((a) => primeiro(a.nome || nomeDe(a.id)).toLowerCase() === k)?.id;
      if (uid && uid !== C.eu.uid) r.push(uid);
    }
    return r;
  };
  async function enviar() {
    const t = txt.value.trim(); if (!t) return;
    env.disabled = true;
    try { await enviarMensagem(conv, { texto: t, mencoes: mencoesDoTexto(t) }); txt.value = ""; mencoes.clear(); }
    catch (e) { console.error(e); toast("Não foi possível enviar: " + (e.code || e.message)); }
    finally { atualizarCampo(); txt.focus(); chat.scrollTop = chat.scrollHeight; }
  }
  form.addEventListener("submit", (e) => { e.preventDefault(); enviar(); });
  txt.addEventListener("keydown", (e) => {
    if (!sugest.hidden) {
      const ops = [...sugest.querySelectorAll(".ad-mencao-op")]; const i = ops.findIndex((o) => o.classList.contains("sel"));
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
    bAnexo.disabled = true; const aviso = toast(`Enviando ${arquivo.name || "arquivo"}…`);
    try {
      const anexo = await prepararArquivo(arquivo);
      const legenda = txt.value.trim();
      await enviarMensagem(conv, { texto: legenda, anexo, mencoes: mencoesDoTexto(legenda) });
      if (legenda) { txt.value = ""; mencoes.clear(); atualizarCampo(); }
      chat.scrollTop = chat.scrollHeight;
    } catch (e) { console.error(e); toast(e.message && !e.code ? e.message : "Não foi possível enviar: " + (e.code || e.message)); }
    finally { bAnexo.disabled = false; aviso?.remove?.(); inArq.value = ""; }
  }
  inArq.addEventListener("change", () => enviarArquivo(inArq.files?.[0]));
  // Colar uma imagem (Ctrl+V) ou arrastar um arquivo para dentro do chat.
  txt.addEventListener("paste", (e) => { const f = [...(e.clipboardData?.files || [])][0]; if (f) { e.preventDefault(); enviarArquivo(f); } });
  painel.addEventListener("dragover", (e) => { if (e.dataTransfer?.types?.includes("Files")) { e.preventDefault(); painel.classList.add("arrastando"); } });
  painel.addEventListener("dragleave", (e) => { if (e.target === painel) painel.classList.remove("arrastando"); });
  painel.addEventListener("drop", (e) => { const f = e.dataTransfer?.files?.[0]; painel.classList.remove("arrastando"); if (f) { e.preventDefault(); enviarArquivo(f); } });

  // ---------- áudio ----------
  let gravador = null, partes = [], inicio = 0, relogio = null, descartar = false;
  const podeGravar = () => !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
  if (!podeGravar()) { bAudio.disabled = true; bAudio.title = "Este navegador não grava áudio"; }
  async function iniciarGravacao() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      partes = []; descartar = false;
      try { gravador = new MediaRecorder(stream, { audioBitsPerSecond: 16000 }); } catch { gravador = new MediaRecorder(stream); }
      gravador.ondataavailable = (e) => { if (e.data.size) partes.push(e.data); };
      gravador.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const tipo = gravador?.mimeType || "audio/webm"; const dur = (Date.now() - inicio) / 1000;
        gravador = null; clearInterval(relogio); gravando.hidden = true; barra.hidden = false;
        if (descartar || !partes.length) return;
        try {
          const dados = await lerDataUrl(new Blob(partes, { type: tipo }));
          if (dados.length > 900000) throw new Error("Áudio longo demais. Grave até 2 minutos.");
          await enviarMensagem(conv, { anexo: { tipo: "audio", dados: dados.replace(/^data:audio\/([a-z0-9.+-]+);[^,]*,/i, "data:audio/$1;base64,"), nome: "audio", tamanho: Math.round(dados.length * 0.75), duracao: dur } });
          chat.scrollTop = chat.scrollHeight;
        } catch (e) { console.error(e); toast(e.message && !e.code ? e.message : "Não foi possível enviar o áudio."); }
      };
      gravador.start(); inicio = Date.now();
      barra.hidden = true; gravando.hidden = false; gTempo.textContent = "0:00";
      relogio = setInterval(() => { const s = (Date.now() - inicio) / 1000; gTempo.textContent = seg(s); if (s >= LIMITE_AUDIO_SEG) parar(false); }, 250);
    } catch (e) { console.warn(e); toast("Não foi possível usar o microfone. Libere a permissão do navegador."); }
  }
  function parar(cancelar) { descartar = cancelar; if (gravador && gravador.state !== "inactive") gravador.stop(); }
  bAudio.addEventListener("click", iniciarGravacao);
  gCancelar.addEventListener("click", () => parar(true));
  gEnviar.addEventListener("click", () => parar(false));

  // ---------- ao vivo ----------
  C.aoMudarEquipe = () => {
    if (!el.isConnected) { C.aoMudarEquipe = null; C.conversaAberta = null; pararDm?.(); return; }
    pintarLista(); pintarTopo();
    if (conv === "equipe") { pintarChat(); C.marcarChatVisto?.(); }
  };
  abrir(conv);
  raiz.classList.remove("aberta"); // no celular começa pela lista
}
