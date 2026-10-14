// =====================================================
// Flash ⚡ (dura 24 horas) — barra no topo do Diário, criador e visor em tela cheia.
// stories/{id} = { autorId, nome, tipo: imagem|video, midia, texto?, duracao?, criadoEm }
// (a coleção continua "stories": as regras já existem; na tela o nome é Flash)
// - Foto: dentro do documento (até ~900 KB) ou no Storage; vídeo curto só com o Storage ligado.
// - Flash de texto: desenhado num quadro 1080×1920 (fundo e letra escolhidos) e salvo como foto.
// - Somem para todos depois de 24 h (o site filtra; a própria pessoa apaga os vencidos ao abrir).
// - stories/{id}/vistos/{uid}: quem viu (só o autor lista).
// - Responder e reagir vão como mensagem para a conversa com o autor (Mensagens), sem regra nova.
// =====================================================
import {
  $, el, icone, ms, pintarAvatar, toast, erroAmigavel, tempoRelativo, fb, eu, dados, storageFns,
  meusSeguindo, escondido, silenciado, alternarSilenciar, obterPerfil, abrirOpcoes, abrirLista, linhaPessoa, editarImagem,
  salvarImagem, mandarMensagem, ganchos
} from "./rede.js?v=35";

const DIA = 24 * 3600e3;
const TEMPO_FOTO = 6000;
const REACOES = ["🔥", "😍", "😂", "😮", "👏", "💯"];
let porAutor = new Map();   // uid -> [flashes em ordem de criação]
let barra = null;
const vistosLocal = new Set((() => { try { return JSON.parse(localStorage.getItem("hf-stories-vistos") || "[]"); } catch { return []; } })());
const guardarVistos = () => { try { localStorage.setItem("hf-stories-vistos", JSON.stringify([...vistosLocal].slice(-600))); } catch {} };
const ativo = (s) => Date.now() - (ms(s.criadoEm) || Date.now()) < DIA;
const comStorage = () => !!(storageFns && window.firebaseStorage);
const erroPublicar = (e) => (e?.code === "permission-denied" ? "O Flash começa a funcionar quando as regras novas forem publicadas." : "Não foi possível publicar: " + erroAmigavel(e));

export async function montarStories(alvo) {
  if (!alvo) return;
  barra = alvo;
  await carregar();
}
async function carregar() {
  const desde = fb.Timestamp.fromMillis(Date.now() - DIA);
  let docs = [];
  try {
    const s = await fb.getDocs(fb.query(fb.collection(fb.db, "stories"), fb.where("criadoEm", ">=", desde), fb.orderBy("criadoEm", "asc"), fb.limit(400)));
    docs = s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }));
  } catch (e) { console.warn("Flash:", e?.code || e?.message); }
  porAutor = new Map();
  docs.filter((x) => ativo(x) && (x.autorId === eu.uid || (meusSeguindo.has(x.autorId) && !escondido(x.autorId) && !silenciado(x.autorId))))
    .forEach((x) => { if (!porAutor.has(x.autorId)) porAutor.set(x.autorId, []); porAutor.get(x.autorId).push(x); });
  limparVencidos();
  pintarBarra();
}
// A própria pessoa apaga os flashes que já passaram de 24 h.
async function limparVencidos() {
  try {
    const s = await fb.getDocs(fb.query(fb.collection(fb.db, "stories"), fb.where("autorId", "==", eu.uid), fb.limit(50)));
    s.docs.filter((d) => !ativo(d.data({ serverTimestamps: "estimate" }))).forEach((d) => fb.deleteDoc(d.ref).catch(() => {}));
  } catch {}
}
const todosVistos = (uid) => (porAutor.get(uid) || []).every((x) => vistosLocal.has(x.id));
function ordemAutores() {
  const outros = [...porAutor.keys()].filter((u) => u !== eu.uid);
  const ultimo = (u) => ms(porAutor.get(u).at(-1)?.criadoEm);
  return outros.sort((a, b) => (todosVistos(a) - todosVistos(b)) || ultimo(b) - ultimo(a));
}

// ---------- anel ----------
// Um pedaço do anel para cada flash (como o WhatsApp): colorido = novo, cinza = já visto.
const COR_ANEL = [[255, 214, 10], [255, 138, 0], [255, 61, 127], [0, 173, 238]];
function corEm(f) {
  const x = Math.min(0.999, Math.max(0, f)) * (COR_ANEL.length - 1), i = Math.floor(x), t = x - i;
  const a = COR_ANEL[i], b = COR_ANEL[i + 1];
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * t)).join(",")})`;
}
export function fundoAnel(lista) {
  const n = lista.length;
  if (!n) return "";
  const vazio = "color-mix(in srgb, var(--muted) 38%, transparent)";
  if (n === 1) return vistosLocal.has(lista[0].id) ? vazio : `conic-gradient(from 200deg, ${COR_ANEL.map((_, i) => corEm(i / (COR_ANEL.length - 1))).join(", ")}, ${corEm(0)})`;
  const vao = Math.min(8, 60 / n), passo = 360 / n, partes = [];
  lista.forEach((s, k) => {
    const a0 = k * passo + vao / 2, a1 = (k + 1) * passo - vao / 2;
    const novo = !vistosLocal.has(s.id);
    partes.push(`transparent ${k * passo}deg ${a0}deg`);
    partes.push(novo ? `${corEm(a0 / 360)} ${a0}deg, ${corEm(a1 / 360)} ${a1}deg` : `${vazio} ${a0}deg ${a1}deg`);
    partes.push(`transparent ${a1}deg ${(k + 1) * passo}deg`);
  });
  return `conic-gradient(${partes.join(", ")})`;
}

function pintarBarra() {
  if (!barra) return;
  barra.replaceChildren();
  const meus = porAutor.get(eu.uid) || [];
  barra.appendChild(circulo({ uid: eu.uid, nome: "Seu flash", foto: dados.fotoPerfil, nomeReal: dados.nome, meu: true, lista: meus }));
  ordemAutores().forEach((u) => {
    const c = circulo({ uid: u, nome: "...", lista: porAutor.get(u) });
    obterPerfil(u).then((p) => { c.querySelector(".nome").textContent = String(p.nome || "Usuário").split(" ")[0]; c.setAttribute("aria-label", `Flash de ${p.nome || "Usuário"}${todosVistos(u) ? "" : " (novo)"}`); pintarAvatar(c.querySelector(".avatar"), p.fotoPerfil, p.nome); }).catch(() => {});
    barra.appendChild(c);
  });
  barra.hidden = false;
}
function circulo({ uid, nome, foto, nomeReal, meu = false, lista = [] }) {
  const tem = lista.length, visto = !tem || todosVistos(uid);
  const b = el("button", "story-circ" + (tem && !visto ? " novo" : "") + (tem ? " tem" : "") + (meu ? " meu" : "")); b.type = "button";
  b.setAttribute("aria-label", meu ? (tem ? "Seu flash" : "Criar um flash") : `Flash de ${nome}`);
  const anel = el("span", "anel"); if (tem) anel.style.background = fundoAnel(lista);
  const av = el("span", "avatar"); pintarAvatar(av, foto, nomeReal || nome); anel.appendChild(av);
  if (meu) { const mais = el("span", "mais"); mais.appendChild(icone("mais", "i xs")); anel.appendChild(mais); }
  if (tem && !visto && !meu) anel.appendChild(el("span", "raio", "⚡"));
  b.append(anel, el("span", "nome", nome));
  b.addEventListener("click", () => {
    if (meu && !tem) { abrirCriador(); return; }
    if (meu) {
      abrirOpcoes("Seu flash", [
        { rotulo: "Ver meus flashes", sub: `${tem} ${tem === 1 ? "ativo" : "ativos"} · quem viu e quantas vezes`, icone: "olho", fn: () => abrirVisor(eu.uid) },
        { rotulo: "Novo flash", sub: "Foto, vídeo curto ou texto", icone: "camera", fn: () => abrirCriador() }
      ]);
      return;
    }
    abrirVisor(uid);
  });
  return b;
}

// Perfil: anel em volta da foto quando a pessoa tem flash ativo (tocar abre).
export async function anelNoPerfil(avatar, uid) {
  if (!avatar || !uid || escondido(uid)) return;
  try {
    const s = await fb.getDocs(fb.query(fb.collection(fb.db, "stories"), fb.where("autorId", "==", uid), fb.limit(30)));
    const lista = s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })).filter(ativo).sort((a, b) => ms(a.criadoEm) - ms(b.criadoEm));
    if (!lista.length || !avatar.isConnected) return;
    porAutor.set(uid, lista);
    const wrap = avatar.parentElement;
    wrap.classList.add("com-flash");
    wrap.style.setProperty("--anel-flash", fundoAnel(lista));
    avatar.setAttribute("role", "button"); avatar.tabIndex = 0;
    avatar.setAttribute("aria-label", "Ver o flash");
    const abrir = (e) => { e.stopPropagation(); abrirVisor(uid, { so: true, aoFechar: () => wrap.style.setProperty("--anel-flash", fundoAnel(lista)) }); };
    avatar.addEventListener("click", abrir);
    avatar.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") abrir(e); });
  } catch {}
}

// =====================================================
// Criar um flash (tela cheia): Texto ou Foto/Vídeo
// =====================================================
const FUNDOS = [
  ["#0f2027", "#2c5364"], ["#ff512f", "#dd2476"], ["#00adee", "#0052d4"], ["#f7971e", "#ffd200"],
  ["#11998e", "#38ef7d"], ["#8e2de2", "#4a00e0"], ["#232526", "#414345"], ["#ee9ca7", "#ffdde1"]
];
const LETRAS = [
  { nome: "Moderna", css: "800 1em system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", sombra: false },
  { nome: "Clássica", css: "italic 700 1em Georgia, 'Times New Roman', serif", sombra: false },
  { nome: "Neon", css: "800 1em system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", sombra: true },
  { nome: "Máquina", css: "700 1em 'Courier New', ui-monospace, monospace", sombra: false }
];
const corTexto = (f) => (f === 3 || f === 7 ? "#1a1a1a" : "#ffffff");

function abrirCriador() {
  const fundo = el("div", "flash-criar"); fundo.setAttribute("role", "dialog"); fundo.setAttribute("aria-modal", "true"); fundo.setAttribute("aria-label", "Novo flash");
  const caixa = el("div", "flash-caixa");
  const palco = el("div", "flash-palco");
  const topo = el("div", "flash-topo");
  const bX = el("button", "story-btn"); bX.type = "button"; bX.setAttribute("aria-label", "Fechar"); bX.appendChild(icone("fechar", "i s"));
  const titulo = el("strong", "flash-titulo"); titulo.append(el("span", "raio-t", "⚡"), document.createTextNode(" Novo flash"));
  const ferramentas = el("div", "flash-ferr");
  topo.append(bX, titulo, ferramentas);
  const baixo = el("div", "flash-baixo");
  const modos = el("div", "flash-modos"); modos.setAttribute("role", "tablist");
  const mTexto = el("button", null, "Aa  Texto"); mTexto.type = "button"; mTexto.setAttribute("role", "tab");
  const mFoto = el("button"); mFoto.type = "button"; mFoto.setAttribute("role", "tab"); mFoto.append(icone("camera", "i xs"), document.createTextNode(comStorage() ? "Foto ou vídeo" : "Foto"));
  modos.append(mTexto, mFoto);
  const publicar = el("button", "flash-publicar"); publicar.type = "button";
  publicar.append(el("span", null, "Compartilhar"), el("b", null, "⚡"));
  const dica = el("small", "flash-dica", "Fica 24 horas para quem segue você · você vê quem viu");
  baixo.append(modos, publicar, dica);
  caixa.append(palco, topo, baixo);
  fundo.appendChild(caixa);
  document.body.appendChild(fundo);
  document.body.classList.add("travado");

  let modo = "foto", fundoI = Math.floor(Math.random() * FUNDOS.length), letraI = 0;
  let foto = null, video = null, enviando = false;
  // Texto
  const area = el("textarea", "flash-texto"); area.maxLength = 220; area.rows = 3; area.placeholder = "Escreva algo..."; area.setAttribute("aria-label", "Texto do flash");
  const bFundo = el("button", "flash-ferr-btn"); bFundo.type = "button"; bFundo.setAttribute("aria-label", "Trocar o fundo"); bFundo.title = "Fundo";
  const bLetra = el("button", "flash-ferr-btn letra", "Aa"); bLetra.type = "button"; bLetra.title = "Letra";
  // Foto
  const escolher = el("button", "flash-escolher"); escolher.type = "button";
  escolher.append(el("span", "ic"), el("strong", null, comStorage() ? "Escolher foto ou vídeo" : "Escolher uma foto"), el("small", null, "Da galeria ou da câmera · em pé (9:16) fica melhor"));
  escolher.firstChild.appendChild(icone("camera", "i"));
  const legenda = el("input", "flash-legenda"); legenda.type = "text"; legenda.maxLength = 150; legenda.placeholder = "Adicionar legenda..."; legenda.setAttribute("aria-label", "Legenda do flash");
  const bTrocar = el("button", "flash-ferr-btn"); bTrocar.type = "button"; bTrocar.setAttribute("aria-label", "Trocar a foto"); bTrocar.title = "Trocar"; bTrocar.appendChild(icone("imagem", "i s"));

  const ajustarLetra = () => {
    const n = area.value.length;
    area.style.fontSize = (n < 40 ? 34 : n < 90 ? 27 : n < 150 ? 22 : 19) + "px";
  };
  function pintar() {
    mTexto.setAttribute("aria-selected", String(modo === "texto")); mFoto.setAttribute("aria-selected", String(modo === "foto"));
    ferramentas.replaceChildren();
    palco.replaceChildren();
    palco.style.background = "";
    if (modo === "texto") {
      const [a, b] = FUNDOS[fundoI];
      palco.style.background = `linear-gradient(160deg, ${a}, ${b})`;
      bFundo.style.background = `linear-gradient(160deg, ${a}, ${b})`;
      const L = LETRAS[letraI];
      area.style.font = L.css; ajustarLetra();
      area.style.color = corTexto(fundoI);
      area.classList.toggle("neon", L.sombra);
      bLetra.style.font = L.css.replace("1em", "15px");
      palco.appendChild(area);
      ferramentas.append(bLetra, bFundo);
      setTimeout(() => area.focus(), 60);
    } else if (foto || video) {
      const m = foto ? Object.assign(document.createElement("img"), { src: foto, alt: "Prévia do flash" }) : video.el;
      palco.append(m, legenda);
      ferramentas.append(bTrocar);
    } else {
      palco.appendChild(escolher);
    }
    publicar.disabled = modo === "texto" ? !area.value.trim() : !(foto || video);
  }
  area.addEventListener("input", () => { ajustarLetra(); publicar.disabled = !area.value.trim(); });
  bFundo.addEventListener("click", () => { fundoI = (fundoI + 1) % FUNDOS.length; pintar(); });
  bLetra.addEventListener("click", () => { letraI = (letraI + 1) % LETRAS.length; toast(`Letra: ${LETRAS[letraI].nome}`); pintar(); });
  mTexto.addEventListener("click", () => { modo = "texto"; pintar(); });
  mFoto.addEventListener("click", () => { modo = "foto"; pintar(); if (!foto && !video) escolherArquivo(); });
  escolher.addEventListener("click", escolherArquivo);
  bTrocar.addEventListener("click", escolherArquivo);

  function escolherArquivo() {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = comStorage() ? "image/*,video/*" : "image/*";
    inp.addEventListener("change", async () => {
      const arq = inp.files?.[0]; if (!arq) return;
      try {
        if (arq.type.startsWith("video/")) {
          if (!comStorage()) { toast("Vídeo no flash precisa do armazenamento de arquivos ligado."); return; }
          if (arq.size > 40 * 1024 * 1024) { toast("O vídeo deve ter até 40 MB."); return; }
          const v = document.createElement("video"); v.preload = "metadata"; v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true;
          const url = URL.createObjectURL(arq);
          const dur = await new Promise((ok) => { v.onloadedmetadata = () => ok(v.duration); v.onerror = () => ok(0); v.src = url; });
          if (dur > 61) { toast(`O vídeo tem ${Math.round(dur)} s. Flash: até 60 segundos.`); return; }
          video = { arq, dur, el: v }; foto = null;
          v.play().catch(() => {});
        } else {
          const midia = await editarImagem(arq, { titulo: "Flash", dica: "Enquadre a foto em pé (9:16). Fica 24 horas para quem segue você.", proporcao: 9 / 16, larguraSaida: 1080, qualidade: 0.8, limiteBytes: 880000 });
          if (!midia) return;
          foto = midia; video = null;
        }
        modo = "foto"; pintar();
      } catch (e) { toast("Não foi possível abrir: " + erroAmigavel(e)); }
    });
    inp.click();
  }

  const fechar = () => { fundo.remove(); document.body.classList.remove("travado"); document.removeEventListener("keydown", tecla); };
  const tecla = (e) => { if (e.key === "Escape" && !document.querySelector(".hfe-fundo")) fechar(); };
  document.addEventListener("keydown", tecla);
  bX.addEventListener("click", () => {
    if ((area.value.trim() || foto || video) && !confirm("Descartar este flash?")) return;
    fechar();
  });
  publicar.addEventListener("click", async () => {
    if (enviando) return;
    enviando = true; publicar.disabled = true; publicar.classList.add("enviando"); publicar.firstChild.textContent = "Publicando...";
    try {
      if (modo === "texto") {
        const midia = desenharTexto(area.value.trim(), FUNDOS[fundoI], LETRAS[letraI], corTexto(fundoI));
        const url = await salvarImagem(midia, `stories/${eu.uid}/${Date.now()}.jpg`);
        await gravar({ tipo: "imagem", midia: url });
      } else if (video) {
        toast("Enviando o vídeo...");
        const ext = (video.arq.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "mp4";
        const r = storageFns.ref(window.firebaseStorage, `stories/${eu.uid}/${Date.now()}.${ext}`);
        await storageFns.uploadBytes(r, video.arq, { contentType: video.arq.type });
        const texto = legenda.value.trim().slice(0, 150);
        await gravar({ tipo: "video", midia: await storageFns.getDownloadURL(r), duracao: Math.min(60, Math.round(video.dur)), ...(texto ? { texto } : {}) });
      } else {
        const url = await salvarImagem(foto, `stories/${eu.uid}/${Date.now()}.jpg`);
        const texto = legenda.value.trim().slice(0, 150);
        await gravar({ tipo: "imagem", midia: url, ...(texto ? { texto } : {}) });
      }
      fechar();
    } catch (e) {
      toast(erroPublicar(e));
      enviando = false; publicar.disabled = false; publicar.classList.remove("enviando"); publicar.firstChild.textContent = "Compartilhar";
    }
  });
  pintar();
}

// Flash de texto: quadro 1080×1920 com o fundo e a letra escolhidos (vira uma foto JPEG).
function desenharTexto(texto, [a, b], letra, cor) {
  const W = 1080, H = 1920;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, W * 0.6, H);
  grad.addColorStop(0, a); grad.addColorStop(1, b);
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  // Brilho suave no alto (dá profundidade ao fundo).
  const luz = g.createRadialGradient(W * 0.25, H * 0.12, 0, W * 0.25, H * 0.12, W * 0.9);
  luz.addColorStop(0, "rgba(255,255,255,.18)"); luz.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = luz; g.fillRect(0, 0, W, H);
  const n = texto.length;
  const tam = n < 40 ? 104 : n < 90 ? 84 : n < 150 ? 68 : 58;
  g.font = letra.css.replace("1em", tam + "px");
  g.fillStyle = cor; g.textAlign = "center"; g.textBaseline = "middle";
  if (letra.sombra) { g.shadowColor = "rgba(255,255,255,.95)"; g.shadowBlur = 36; }
  else { g.shadowColor = "rgba(0,0,0,.18)"; g.shadowBlur = 12; g.shadowOffsetY = 4; }
  const linhas = [];
  const max = W - 180;
  texto.split(/\n/).forEach((par) => {
    let atual = "";
    par.split(/\s+/).forEach((p) => {
      const t = atual ? atual + " " + p : p;
      if (g.measureText(t).width > max && atual) { linhas.push(atual); atual = p; } else atual = t;
    });
    linhas.push(atual);
  });
  const alt = tam * 1.28, y0 = H / 2 - ((linhas.length - 1) * alt) / 2;
  linhas.slice(0, 14).forEach((l, i) => g.fillText(l, W / 2, y0 + i * alt));
  // Marca discreta embaixo.
  g.shadowBlur = 0; g.shadowOffsetY = 0;
  g.font = "700 30px system-ui, sans-serif"; g.fillStyle = cor === "#ffffff" ? "rgba(255,255,255,.55)" : "rgba(0,0,0,.45)";
  g.fillText("⚡ Help Floripa", W / 2, H - 110);
  let q = 0.9, url = c.toDataURL("image/jpeg", q);
  while (url.length > 860000 && q > 0.5) { q -= 0.1; url = c.toDataURL("image/jpeg", q); }
  return url;
}

async function gravar(extra) {
  await fb.addDoc(fb.collection(fb.db, "stories"), { autorId: eu.uid, nome: String(dados.nome || "Usuário").slice(0, 80), ...extra, criadoEm: fb.serverTimestamp() });
  toast("⚡ Flash publicado! Fica 24 horas.");
  carregar();
}

// =====================================================
// Ver (tela cheia)
// =====================================================
function abrirVisor(uidInicial, { so = false, aoFechar = null } = {}) {
  const ordem = so ? [uidInicial] : [eu.uid, ...ordemAutores()].filter((u) => porAutor.get(u)?.length);
  let ai = Math.max(0, ordem.indexOf(uidInicial)), si = 0;
  // Começa no primeiro flash ainda não visto desse autor.
  const inicioDo = (u) => { const l = porAutor.get(u) || []; const k = l.findIndex((x) => !vistosLocal.has(x.id)); return k < 0 ? 0 : k; };
  si = inicioDo(ordem[ai]);
  const fundo = el("div", "story-visor"); fundo.setAttribute("role", "dialog"); fundo.setAttribute("aria-modal", "true"); fundo.setAttribute("aria-label", "Flash");
  const caixa = el("div", "story-caixa");
  const barras = el("div", "story-barras");
  const topo = el("div", "story-topo");
  const av = el("span", "avatar"); const nome = el("strong"); const quando = el("small");
  const bSom = el("button", "story-btn"); bSom.type = "button"; bSom.setAttribute("aria-label", "Ligar o som"); bSom.textContent = "🔇"; bSom.hidden = true;
  const bMais = el("button", "story-btn"); bMais.type = "button"; bMais.setAttribute("aria-label", "Opções"); bMais.appendChild(icone("pontos", "i s"));
  const bX = el("button", "story-btn"); bX.type = "button"; bX.setAttribute("aria-label", "Fechar"); bX.appendChild(icone("fechar", "i s"));
  const quem = el("div", "story-quem"); const txtQuem = el("div");
  const linhaNome = el("div", "story-nome"); linhaNome.append(nome, el("span", "story-chip", "⚡ Flash"));
  txtQuem.append(linhaNome, quando); quem.append(av, txtQuem);
  topo.append(quem, bSom, bMais, bX);
  const palco = el("div", "story-palco");
  const legenda = el("div", "story-legenda");
  const rodape = el("div", "story-rodape");
  const esq = el("button", "story-toque esq"); esq.type = "button"; esq.setAttribute("aria-label", "Anterior");
  const dir = el("button", "story-toque dir"); dir.type = "button"; dir.setAttribute("aria-label", "Próximo");
  caixa.append(palco, el("div", "story-sombra"), legenda, esq, dir, barras, topo, rodape);
  fundo.appendChild(caixa);
  document.body.appendChild(fundo);
  document.body.classList.add("travado");
  let timer = null, inicio = 0, restante = 0, pausado = false, video = null, digitando = false, fechado = false;
  const fechar = () => {
    if (fechado) return; fechado = true;
    clearTimeout(timer); video?.pause(); fundo.remove(); document.body.classList.remove("travado");
    document.removeEventListener("keydown", tecla, true); document.removeEventListener("visibilitychange", aoEsconder);
    pintarBarra(); aoFechar?.();
  };
  const atual = () => porAutor.get(ordem[ai])?.[si];

  // Rodapé de quem vê: responder (vai para o Mensagens) e reações rápidas.
  const form = el("form", "story-responder");
  const campo = el("input"); campo.type = "text"; campo.maxLength = 300; campo.setAttribute("aria-label", "Responder");
  const bEnviar = el("button", "story-env"); bEnviar.type = "submit"; bEnviar.setAttribute("aria-label", "Enviar"); bEnviar.appendChild(icone("enviar", "i s"));
  const bRaio = el("button", "story-raio", "⚡"); bRaio.type = "button"; bRaio.setAttribute("aria-label", "Reagir com um raio");
  form.append(campo, bEnviar, bRaio);
  const bandeja = el("div", "story-bandeja"); bandeja.setAttribute("aria-label", "Reações rápidas");
  REACOES.forEach((r) => { const b = el("button", null, r); b.type = "button"; b.setAttribute("aria-label", "Reagir com " + r); b.addEventListener("pointerdown", (e) => e.preventDefault()); b.addEventListener("click", () => reagir(r, b)); bandeja.appendChild(b); });

  async function enviarResposta(texto, resumo) {
    const s = atual(); if (!s) return false;
    try { await mandarMensagem(s.autorId, { texto }, resumo); return true; }
    catch (e) { if (e?.message !== "e-mail") toast("Não foi possível enviar: " + erroAmigavel(e)); return false; }
  }
  async function reagir(r, origem) {
    voarEmoji(r, origem);
    navigator.vibrate?.(8);
    if (await enviarResposta(`${r} Reagiu ao seu flash ⚡`, `Reagiu ao seu flash: ${r}`)) toast("Reação enviada");
  }
  function voarEmoji(r, origem) {
    const box = caixa.getBoundingClientRect(), o = origem?.getBoundingClientRect?.() || { left: box.left + box.width / 2, top: box.bottom - 80, width: 0 };
    for (let k = 0; k < 7; k++) {
      const e = el("span", "story-voa", r);
      e.style.left = (o.left - box.left + o.width / 2 + (Math.random() - 0.5) * 120) + "px";
      e.style.top = (o.top - box.top) + "px";
      e.style.animationDelay = k * 70 + "ms";
      e.style.setProperty("--dx", (Math.random() - 0.5) * 140 + "px");
      caixa.appendChild(e);
      setTimeout(() => e.remove(), 1700 + k * 70);
    }
  }
  bRaio.addEventListener("click", () => reagir("⚡", bRaio));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const t = campo.value.trim(); if (!t) return;
    bEnviar.disabled = true;
    if (await enviarResposta(`⚡ Respondeu ao seu flash: ${t}`.slice(0, 400), `Respondeu ao seu flash: ${t}`)) { campo.value = ""; toast("Resposta enviada pelo Mensagens"); campo.blur(); }
    bEnviar.disabled = false;
  });
  campo.addEventListener("focus", () => { digitando = true; caixa.classList.add("digitando"); pausar(true); });
  campo.addEventListener("blur", () => { digitando = false; setTimeout(() => { if (!digitando) { caixa.classList.remove("digitando"); pausar(false); } }, 150); });

  function mostrar(dirAnim = 0) {
    if (fechado) return;
    clearTimeout(timer); video?.pause(); video = null;
    const lista = porAutor.get(ordem[ai]) || [];
    const s = lista[si]; if (!s) { fechar(); return; }
    const meu = s.autorId === eu.uid;
    pausado = false; caixa.classList.remove("pausado");
    if (dirAnim) { caixa.classList.remove("vai-dir", "vai-esq"); void caixa.offsetWidth; caixa.classList.add(dirAnim > 0 ? "vai-dir" : "vai-esq"); }
    barras.replaceChildren(...lista.map((_, k) => { const b = el("span", "story-barra"); const i = el("i"); if (k < si) i.style.width = "100%"; b.appendChild(i); return b; }));
    obterPerfil(s.autorId).then((p) => {
      nome.textContent = meu ? "Seu flash" : (p.nome || s.nome || "Usuário");
      campo.placeholder = `Responder a ${String(p.nome || s.nome || "").split(" ")[0] || "esta pessoa"}...`;
      pintarAvatar(av, p.fotoPerfil, p.nome || s.nome);
    }).catch(() => { nome.textContent = s.nome || "Usuário"; });
    quando.textContent = tempoRelativo(new Date(ms(s.criadoEm) || Date.now()));
    palco.replaceChildren();
    legenda.textContent = s.texto || ""; legenda.hidden = !s.texto;
    rodape.replaceChildren();
    if (meu) {
      const v = el("button", "story-vistos"); v.type = "button";
      const rostos = el("span", "rostos");
      v.append(icone("olho", "i xs"), el("span", null, "Visualizações"), rostos);
      v.addEventListener("click", (e) => { e.stopPropagation(); pausar(true); verQuemViu(s, () => pausar(false)); });
      rodape.appendChild(v);
      // Quantas pessoas viram e as 3 últimas fotos.
      fb.getDocs(fb.query(fb.collection(fb.db, "stories", s.id, "vistos"), fb.limit(300))).then((x) => {
        v.children[1].textContent = x.size ? `Visto por ${x.size}` : "Ninguém viu ainda";
        x.docs.sort((a, b) => ms(b.data().criadoEm) - ms(a.data().criadoEm)).slice(0, 3).forEach((d) => {
          const r = el("span", "avatar"); rostos.appendChild(r);
          obterPerfil(d.id).then((p) => pintarAvatar(r, p.fotoPerfil, p.nome)).catch(() => {});
        });
      }).catch(() => {});
    } else {
      rodape.append(bandeja, form);
    }
    bSom.hidden = s.tipo !== "video";
    if (s.tipo === "video") {
      video = document.createElement("video"); video.src = s.midia; video.playsInline = true; video.autoplay = true; video.muted = somDesligado;
      video.addEventListener("ended", proximo);
      video.addEventListener("loadedmetadata", () => animarBarra((video.duration || 15) * 1000));
      video.play().catch(() => { video.muted = somDesligado = true; pintarSom(); video.play().catch(() => {}); });
      pintarSom();
      palco.appendChild(video);
    } else {
      const img = document.createElement("img"); img.src = s.midia; img.alt = s.texto || `Flash de ${nome.textContent || "alguém"}`; img.decoding = "async";
      palco.appendChild(img);
      animarBarra(TEMPO_FOTO);
      timer = setTimeout(proximo, TEMPO_FOTO);
      inicio = Date.now(); restante = TEMPO_FOTO;
    }
    // Já carrega o próximo (troca sem piscar).
    const prox = lista[si + 1] || porAutor.get(ordem[ai + 1])?.[0];
    if (prox && prox.tipo !== "video") { const pre = new Image(); pre.src = prox.midia; }
    // Visto (no aparelho e para o autor contar)
    if (!vistosLocal.has(s.id)) { vistosLocal.add(s.id); guardarVistos(); }
    if (!meu) fb.setDoc(fb.doc(fb.db, "stories", s.id, "vistos", eu.uid), { criadoEm: fb.serverTimestamp() }).catch(() => {});
  }
  let somDesligado = false;
  const pintarSom = () => { bSom.textContent = somDesligado ? "🔇" : "🔊"; bSom.setAttribute("aria-label", somDesligado ? "Ligar o som" : "Desligar o som"); };
  bSom.addEventListener("click", (e) => { e.stopPropagation(); somDesligado = !somDesligado; if (video) video.muted = somDesligado; pintarSom(); });
  function animarBarra(dur) {
    const i = barras.children[si]?.firstChild; if (!i) return;
    i.style.transition = "none"; i.style.width = "0%";
    requestAnimationFrame(() => requestAnimationFrame(() => { if (pausado) return; i.style.transition = `width ${dur}ms linear`; i.style.width = "100%"; }));
  }
  function proximo() {
    const lista = porAutor.get(ordem[ai]) || [];
    if (si < lista.length - 1) { si++; mostrar(); return; }
    proximoAutor();
  }
  function proximoAutor() {
    if (ai < ordem.length - 1) { ai++; si = inicioDo(ordem[ai]); mostrar(1); return; }
    fechar();
  }
  function anterior() {
    if (si > 0) { si--; mostrar(); return; }
    anteriorAutor();
  }
  function anteriorAutor() {
    if (ai > 0) { ai--; si = 0; mostrar(-1); return; }
    mostrar();
  }
  function pausar(sim) {
    if (fechado || sim === pausado) return;
    if (!sim && (digitando || document.querySelector(".folha.aberta"))) return;
    pausado = sim;
    caixa.classList.toggle("pausado", sim);
    const i = barras.children[si]?.firstChild;
    if (sim) {
      clearTimeout(timer); video?.pause();
      if (i) { const w = getComputedStyle(i).width; i.style.transition = "none"; i.style.width = w; }
      if (!video) restante = Math.max(300, restante - (Date.now() - inicio));
    } else {
      if (video) { video.play().catch(() => {}); if (i) { i.style.transition = `width ${Math.max(200, ((video.duration || 15) - video.currentTime) * 1000)}ms linear`; i.style.width = "100%"; } }
      else { inicio = Date.now(); timer = setTimeout(proximo, restante); if (i) { i.style.transition = `width ${restante}ms linear`; i.style.width = "100%"; } }
    }
  }
  // Toques: direita = próximo, esquerda = anterior; segurar = pausa e esconde o que está por cima da foto.
  let segurou = false, tSeg = null, arrastou = false;
  [esq, dir].forEach((b) => {
    b.addEventListener("pointerdown", () => { segurou = false; arrastou = false; tSeg = setTimeout(() => { segurou = true; pausar(true); caixa.classList.add("limpo"); }, 220); });
    b.addEventListener("pointerup", () => {
      clearTimeout(tSeg); caixa.classList.remove("limpo");
      if (segurou) { segurou = false; pausar(false); return; }
      if (arrastou) return;
      (b === dir ? proximo : anterior)();
    });
    b.addEventListener("pointerleave", () => { clearTimeout(tSeg); caixa.classList.remove("limpo"); if (segurou) { segurou = false; pausar(false); } });
    b.addEventListener("pointercancel", () => { clearTimeout(tSeg); caixa.classList.remove("limpo"); if (segurou) { segurou = false; pausar(false); } });
    b.addEventListener("click", (e) => { if (e.detail === 0) (b === dir ? proximo : anterior)(); }); // teclado
  });
  bX.addEventListener("click", fechar);
  bMais.addEventListener("click", () => {
    const s = atual(); if (!s) return;
    pausar(true);
    const meu = s.autorId === eu.uid;
    abrirOpcoes("Flash", [
      meu && { rotulo: "Apagar este flash", icone: "lixo", perigo: true, fn: async () => {
        if (!confirm("Apagar este flash?")) return;
        try { await fb.deleteDoc(fb.doc(fb.db, "stories", s.id)); const l = porAutor.get(s.autorId); l.splice(si, 1); if (!l.length) porAutor.delete(s.autorId); toast("Flash apagado"); if (!porAutor.get(s.autorId)) fechar(); else { si = Math.min(si, l.length - 1); mostrar(); } }
        catch (e) { toast("Não foi possível apagar: " + erroAmigavel(e)); }
      } },
      meu && { rotulo: "Novo flash", icone: "camera", fn: () => { fechar(); abrirCriador(); } },
      !meu && { rotulo: "Ver perfil", icone: "olho", fn: () => { fechar(); ganchos.abrirPerfil(s.autorId); } },
      !meu && { rotulo: silenciado(s.autorId) ? "Mostrar os flashes de novo" : "Silenciar esta pessoa", sub: "Continua seguindo, mas não vê os flashes e as publicações dela", icone: "restringir", fn: async () => { await alternarSilenciar(s.autorId, nome.textContent); fechar(); carregar(); } }
    ]);
    const volta = () => { document.body.classList.add("travado"); pausar(false); $("folhaOpcoes")?.removeEventListener("fechada", volta); };
    $("folhaOpcoes")?.addEventListener("fechada", volta);
  });
  const tecla = (e) => {
    if (digitando) { if (e.key === "Escape") campo.blur(); return; }
    if (document.querySelector(".folha.aberta")) return;
    if (e.key === "Escape") fechar(); else if (e.key === "ArrowRight") proximo(); else if (e.key === "ArrowLeft") anterior(); else if (e.key === " ") { e.preventDefault(); pausar(!pausado); }
  };
  // Antes do Esc das folhas (rede.js): com uma folha aberta, o Esc fecha só a folha.
  document.addEventListener("keydown", tecla, true);
  const aoEsconder = () => { if (document.hidden) pausar(true); else pausar(false); };
  document.addEventListener("visibilitychange", aoEsconder);
  // Arrastar: para baixo fecha; para o lado troca de pessoa; para cima (no seu) mostra quem viu.
  let x0 = null, y0 = null;
  caixa.addEventListener("touchstart", (e) => { if (e.target.closest("form, .story-bandeja")) { x0 = null; return; } x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  caixa.addEventListener("touchmove", (e) => { if (x0 != null && (Math.abs(e.touches[0].clientX - x0) > 12 || Math.abs(e.touches[0].clientY - y0) > 12)) arrastou = true; }, { passive: true });
  caixa.addEventListener("touchend", (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (dy > 110 && Math.abs(dy) > Math.abs(dx)) { fechar(); return; }
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy)) { clearTimeout(tSeg); segurou = false; caixa.classList.remove("limpo"); if (dx < 0) proximoAutor(); else anteriorAutor(); return; }
    if (dy < -90 && atual()?.autorId === eu.uid) { pausar(true); verQuemViu(atual(), () => pausar(false)); }
  }, { passive: true });
  mostrar();
}
async function verQuemViu(s, aoFechar) {
  const corpo = abrirLista("Quem viu");
  const f = $("folhaLista");
  const volta = () => { f?.removeEventListener("fechada", volta); if (document.querySelector(".story-visor")) document.body.classList.add("travado"); aoFechar?.(); };
  f?.addEventListener("fechada", volta);
  corpo.appendChild(el("div", "lista-vazia", "Carregando..."));
  try {
    const v = await fb.getDocs(fb.query(fb.collection(fb.db, "stories", s.id, "vistos"), fb.limit(300)));
    corpo.replaceChildren();
    if (!v.size) { corpo.appendChild(el("div", "lista-vazia", "Ninguém viu ainda.")); return; }
    corpo.appendChild(el("div", "grupo-titulo", `${v.size} ${v.size === 1 ? "pessoa viu" : "pessoas viram"} · respostas e reações chegam no Mensagens`));
    const l = v.docs.map((d) => ({ uid: d.id, quando: ms(d.data().criadoEm) })).sort((a, b) => b.quando - a.quando);
    const perfis = await Promise.all(l.map((x) => obterPerfil(x.uid).catch(() => ({}))));
    l.forEach((x, i) => corpo.appendChild(linhaPessoa({ uid: x.uid, nome: perfis[i].nome || "Usuário", foto: perfis[i].fotoPerfil, sub: tempoRelativo(new Date(x.quando || Date.now())) })));
  } catch (e) { corpo.replaceChildren(el("div", "lista-vazia", "Não foi possível carregar: " + erroAmigavel(e))); }
}
