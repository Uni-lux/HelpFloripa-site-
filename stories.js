// =====================================================
// Stories (24 horas) — barra no topo do Diário e tela cheia para ver.
// stories/{id} = { autorId, nome, tipo: imagem|video, midia, texto?, duracao?, criadoEm }
// - foto: dentro do documento (até ~900 KB) ou no Storage; vídeo curto só com o Storage ligado
// - somem para todos depois de 24 h (o site filtra; a própria pessoa apaga os vencidos ao abrir)
// - stories/{id}/vistos/{uid}: quem viu (só o autor lista)
// =====================================================
import {
  $, el, icone, ms, pintarAvatar, toast, erroAmigavel, tempoRelativo, fb, eu, dados, storageFns,
  meusSeguindo, escondido, silenciado, alternarSilenciar, obterPerfil, abrirOpcoes, abrirLista, linhaPessoa, editarImagem,
  salvarImagem, fecharFolha
} from "./rede.js?v=34";

const DIA = 24 * 3600e3;
const TEMPO_FOTO = 5000;
let porAutor = new Map();   // uid -> [stories em ordem de criação]
let barra = null;
const vistosLocal = new Set((() => { try { return JSON.parse(localStorage.getItem("hf-stories-vistos") || "[]"); } catch { return []; } })());
const guardarVistos = () => { try { localStorage.setItem("hf-stories-vistos", JSON.stringify([...vistosLocal].slice(-600))); } catch {} };
const ativo = (s) => Date.now() - (ms(s.criadoEm) || Date.now()) < DIA;

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
  } catch (e) { console.warn("Stories:", e?.code || e?.message); }
  porAutor = new Map();
  docs.filter((x) => ativo(x) && (x.autorId === eu.uid || (meusSeguindo.has(x.autorId) && !escondido(x.autorId) && !silenciado(x.autorId))))
    .forEach((x) => { if (!porAutor.has(x.autorId)) porAutor.set(x.autorId, []); porAutor.get(x.autorId).push(x); });
  limparVencidos();
  pintarBarra();
}
// A própria pessoa apaga os stories que já passaram de 24 h.
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
function pintarBarra() {
  if (!barra) return;
  barra.replaceChildren();
  // Seu story: + para publicar (e ver os seus, se tiver)
  const meus = porAutor.get(eu.uid) || [];
  barra.appendChild(circulo({ uid: eu.uid, nome: "Seu story", foto: dados.fotoPerfil, nomeReal: dados.nome, meu: true, tem: meus.length, visto: !meus.length || todosVistos(eu.uid) }));
  ordemAutores().forEach((u) => {
    const c = circulo({ uid: u, nome: "...", tem: porAutor.get(u).length, visto: todosVistos(u) });
    obterPerfil(u).then((p) => { c.querySelector(".nome").textContent = String(p.nome || "Usuário").split(" ")[0]; pintarAvatar(c.querySelector(".avatar"), p.fotoPerfil, p.nome); }).catch(() => {});
    barra.appendChild(c);
  });
  barra.hidden = false;
}
function circulo({ uid, nome, foto, nomeReal, meu = false, tem = 0, visto = true }) {
  const b = el("button", "story-circ" + (tem && !visto ? " novo" : "") + (tem ? " tem" : "")); b.type = "button";
  b.setAttribute("aria-label", meu ? (tem ? "Seus stories" : "Publicar um story") : `Story de ${nome}`);
  const anel = el("span", "anel"); const av = el("span", "avatar"); pintarAvatar(av, foto, nomeReal || nome); anel.appendChild(av);
  if (meu) { const mais = el("span", "mais", "+"); anel.appendChild(mais); }
  b.append(anel, el("span", "nome", nome));
  b.addEventListener("click", () => {
    if (meu && !tem) { novoStory(); return; }
    if (meu) { abrirOpcoes("Seu story", [{ rotulo: "Ver meus stories", icone: "olho", fn: () => abrirVisor(eu.uid) }, { rotulo: "Novo story", icone: "camera", fn: () => novoStory() }]); return; }
    abrirVisor(uid);
  });
  return b;
}

// ---------- publicar ----------
function novoStory() {
  const inp = document.createElement("input"); inp.type = "file"; inp.accept = storageFns && window.firebaseStorage ? "image/*,video/*" : "image/*";
  inp.addEventListener("change", async () => {
    const arq = inp.files?.[0]; if (!arq) return;
    try {
      if (arq.type.startsWith("video/")) return await publicarVideo(arq);
      const midia = await editarImagem(arq, { titulo: "Story", dica: "Enquadre a foto em pé (9:16). Fica 24 horas para quem segue você.", proporcao: 9 / 16, larguraSaida: 1080, qualidade: 0.8, limiteBytes: 880000 });
      if (!midia) return;
      // Prévia com legenda opcional antes de publicar.
      const corpo = abrirLista("Novo story");
      const pv = el("div", "story-previa"); const im = document.createElement("img"); im.src = midia; im.alt = "Prévia do story"; pv.appendChild(im);
      const txt = el("input", "busca-enviar"); txt.type = "text"; txt.maxLength = 150; txt.placeholder = "Escreva algo (opcional)"; txt.setAttribute("aria-label", "Legenda do story");
      const ok = el("button", "btn pri", "Publicar story"); ok.type = "button";
      corpo.append(pv, txt, el("p", "pub-dica", "Fica 24 horas para quem segue você. Você vê quem visualizou."), ok);
      ok.addEventListener("click", async () => {
        ok.disabled = true; ok.textContent = "Publicando...";
        try {
          const url = await salvarImagem(midia, `stories/${eu.uid}/${Date.now()}.jpg`);
          const texto = txt.value.trim().slice(0, 150);
          await gravar({ tipo: "imagem", midia: url, ...(texto ? { texto } : {}) });
          fecharFolha("folhaLista");
        } catch (e) { toast(e?.code === "permission-denied" ? "Stories começam a funcionar quando as regras novas forem publicadas." : "Não foi possível publicar: " + erroAmigavel(e)); ok.disabled = false; ok.textContent = "Publicar story"; }
      });
    } catch (e) { toast(e?.code === "permission-denied" ? "Stories começam a funcionar quando as regras novas forem publicadas." : "Não foi possível publicar: " + erroAmigavel(e)); }
  });
  inp.click();
}
async function publicarVideo(arq) {
  if (!(storageFns && window.firebaseStorage)) { toast("Vídeo no story precisa do armazenamento de arquivos ligado."); return; }
  if (arq.size > 40 * 1024 * 1024) { toast("O vídeo deve ter até 40 MB."); return; }
  const dur = await new Promise((ok) => { const v = document.createElement("video"); v.preload = "metadata"; v.onloadedmetadata = () => ok(v.duration); v.onerror = () => ok(0); v.src = URL.createObjectURL(arq); });
  if (dur > 61) { toast(`O vídeo tem ${Math.round(dur)} s. Stories: até 60 segundos.`); return; }
  toast("Enviando o vídeo...");
  const ext = (arq.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "mp4";
  const r = storageFns.ref(window.firebaseStorage, `stories/${eu.uid}/${Date.now()}.${ext}`);
  await storageFns.uploadBytes(r, arq, { contentType: arq.type });
  await gravar({ tipo: "video", midia: await storageFns.getDownloadURL(r), duracao: Math.round(dur) });
}
async function gravar(extra) {
  await fb.addDoc(fb.collection(fb.db, "stories"), { autorId: eu.uid, nome: String(dados.nome || "Usuário").slice(0, 80), ...extra, criadoEm: fb.serverTimestamp() });
  toast("Story publicado! Fica 24 horas.");
  carregar();
}

// ---------- ver (tela cheia) ----------
function abrirVisor(uidInicial) {
  const ordem = [eu.uid, ...ordemAutores()].filter((u) => porAutor.get(u)?.length);
  let ai = Math.max(0, ordem.indexOf(uidInicial)), si = 0;
  // Começa no primeiro story ainda não visto desse autor.
  const lista0 = porAutor.get(ordem[ai]) || [];
  si = Math.max(0, lista0.findIndex((x) => !vistosLocal.has(x.id))); if (si < 0 || si >= lista0.length) si = 0;
  const fundo = el("div", "story-visor"); fundo.setAttribute("role", "dialog"); fundo.setAttribute("aria-modal", "true"); fundo.setAttribute("aria-label", "Stories");
  const caixa = el("div", "story-caixa");
  const barras = el("div", "story-barras");
  const topo = el("div", "story-topo");
  const av = el("span", "avatar"); const nome = el("strong"); const quando = el("small");
  const bMais = el("button", "story-btn"); bMais.type = "button"; bMais.setAttribute("aria-label", "Opções"); bMais.appendChild(icone("pontos", "i s"));
  const bX = el("button", "story-btn"); bX.type = "button"; bX.setAttribute("aria-label", "Fechar"); bX.appendChild(icone("fechar", "i s"));
  const quem = el("div", "story-quem"); quem.append(av, el("div", null)); quem.lastChild.append(nome, quando);
  topo.append(quem, bMais, bX);
  const palco = el("div", "story-palco");
  const legenda = el("div", "story-legenda");
  const rodape = el("div", "story-rodape");
  const esq = el("button", "story-toque esq"); esq.type = "button"; esq.setAttribute("aria-label", "Anterior");
  const dir = el("button", "story-toque dir"); dir.type = "button"; dir.setAttribute("aria-label", "Próximo");
  caixa.append(palco, legenda, esq, dir, barras, topo, rodape);
  fundo.appendChild(caixa);
  document.body.appendChild(fundo);
  document.body.classList.add("travado");
  let timer = null, inicio = 0, restante = 0, pausado = false, video = null;
  const fechar = () => { clearTimeout(timer); fundo.remove(); document.body.classList.remove("travado"); document.removeEventListener("keydown", tecla); pintarBarra(); };
  const atual = () => porAutor.get(ordem[ai])?.[si];
  function mostrar() {
    clearTimeout(timer); video?.pause(); video = null;
    const lista = porAutor.get(ordem[ai]) || [];
    const s = lista[si]; if (!s) { fechar(); return; }
    const meu = s.autorId === eu.uid;
    barras.replaceChildren(...lista.map((_, k) => { const b = el("span", "story-barra"); const i = el("i"); if (k < si) i.style.width = "100%"; b.appendChild(i); return b; }));
    obterPerfil(s.autorId).then((p) => { nome.textContent = meu ? "Seu story" : (p.nome || s.nome || "Usuário"); pintarAvatar(av, p.fotoPerfil, p.nome || s.nome); }).catch(() => { nome.textContent = s.nome || "Usuário"; });
    quando.textContent = tempoRelativo(new Date(ms(s.criadoEm) || Date.now()));
    palco.replaceChildren();
    legenda.textContent = s.texto || ""; legenda.hidden = !s.texto;
    rodape.replaceChildren();
    if (meu) {
      const v = el("button", "story-vistos"); v.type = "button"; v.append(icone("olho", "i xs"), el("span", null, "Visualizações"));
      v.addEventListener("click", (e) => { e.stopPropagation(); pausar(true); verQuemViu(s); });
      rodape.appendChild(v);
      fb.getCountFromServer(fb.collection(fb.db, "stories", s.id, "vistos")).then((x) => { v.lastChild.textContent = `${x.data().count} ${x.data().count === 1 ? "visualização" : "visualizações"}`; }).catch(() => {});
    }
    if (s.tipo === "video") {
      video = document.createElement("video"); video.src = s.midia; video.playsInline = true; video.autoplay = true; video.muted = false;
      video.addEventListener("ended", proximo);
      video.addEventListener("loadedmetadata", () => animarBarra((video.duration || 15) * 1000));
      video.play().catch(() => { video.muted = true; video.play().catch(() => {}); });
      palco.appendChild(video);
    } else {
      const img = document.createElement("img"); img.src = s.midia; img.alt = s.texto || "Story";
      palco.appendChild(img);
      animarBarra(TEMPO_FOTO);
      timer = setTimeout(proximo, TEMPO_FOTO);
      inicio = Date.now(); restante = TEMPO_FOTO;
    }
    // Visto (no aparelho e para o autor contar)
    if (!vistosLocal.has(s.id)) { vistosLocal.add(s.id); guardarVistos(); }
    if (!meu) fb.setDoc(fb.doc(fb.db, "stories", s.id, "vistos", eu.uid), { criadoEm: fb.serverTimestamp() }).catch(() => {});
  }
  function animarBarra(dur) {
    const i = barras.children[si]?.firstChild; if (!i) return;
    i.style.transition = "none"; i.style.width = "0%";
    requestAnimationFrame(() => requestAnimationFrame(() => { i.style.transition = `width ${dur}ms linear`; i.style.width = "100%"; }));
  }
  function proximo() {
    const lista = porAutor.get(ordem[ai]) || [];
    if (si < lista.length - 1) { si++; mostrar(); return; }
    if (ai < ordem.length - 1) { ai++; si = 0; mostrar(); return; }
    fechar();
  }
  function anterior() {
    if (si > 0) { si--; mostrar(); return; }
    if (ai > 0) { ai--; si = Math.max(0, (porAutor.get(ordem[ai]) || []).length - 1); mostrar(); return; }
    mostrar();
  }
  function pausar(sim) {
    if (sim === pausado) return;
    pausado = sim;
    const i = barras.children[si]?.firstChild;
    if (sim) {
      clearTimeout(timer); video?.pause();
      if (i) { const w = getComputedStyle(i).width; i.style.transition = "none"; i.style.width = w; }
      if (!video) restante = Math.max(300, restante - (Date.now() - inicio));
    } else {
      if (video) { video.play().catch(() => {}); if (i) { i.style.transition = `width ${Math.max(200, (video.duration - video.currentTime) * 1000)}ms linear`; i.style.width = "100%"; } }
      else { inicio = Date.now(); timer = setTimeout(proximo, restante); if (i) { i.style.transition = `width ${restante}ms linear`; i.style.width = "100%"; } }
    }
  }
  // Toques: direita = próximo, esquerda = anterior; segurar = pausa.
  let segurou = false, tSeg = null;
  [esq, dir].forEach((b) => {
    b.addEventListener("pointerdown", () => { segurou = false; tSeg = setTimeout(() => { segurou = true; pausar(true); }, 220); });
    b.addEventListener("pointerup", () => { clearTimeout(tSeg); if (segurou) { pausar(false); return; } (b === dir ? proximo : anterior)(); });
    b.addEventListener("pointerleave", () => { clearTimeout(tSeg); if (segurou) { segurou = false; pausar(false); } });
    b.addEventListener("click", (e) => { if (e.detail === 0) (b === dir ? proximo : anterior)(); }); // teclado
  });
  bX.addEventListener("click", fechar);
  bMais.addEventListener("click", () => {
    const s = atual(); if (!s) return;
    pausar(true);
    const meu = s.autorId === eu.uid;
    abrirOpcoes("Story", [
      meu && { rotulo: "Apagar este story", icone: "lixo", perigo: true, fn: async () => {
        try { await fb.deleteDoc(fb.doc(fb.db, "stories", s.id)); const l = porAutor.get(s.autorId); l.splice(si, 1); if (!l.length) porAutor.delete(s.autorId); toast("Story apagado"); if (!porAutor.get(s.autorId)) fechar(); else { si = Math.min(si, l.length - 1); mostrar(); } }
        catch (e) { toast("Não foi possível apagar: " + erroAmigavel(e)); }
      } },
      !meu && { rotulo: silenciado(s.autorId) ? "Mostrar stories de novo" : "Silenciar esta pessoa", sub: "Continua seguindo, mas não vê os stories e publicações dela", icone: "restringir", fn: async () => { await alternarSilenciar(s.autorId, nome.textContent); fechar(); carregar(); } }
    ]);
    const volta = () => { pausar(false); $("folhaOpcoes")?.removeEventListener("fechada", volta); };
    $("folhaOpcoes")?.addEventListener("fechada", volta);
  });
  const tecla = (e) => { if (e.key === "Escape") fechar(); else if (e.key === "ArrowRight") proximo(); else if (e.key === "ArrowLeft") anterior(); else if (e.key === " ") { e.preventDefault(); pausar(!pausado); } };
  document.addEventListener("keydown", tecla);
  // Arrastar para baixo fecha.
  let y0 = null;
  caixa.addEventListener("touchstart", (e) => { y0 = e.touches[0].clientY; }, { passive: true });
  caixa.addEventListener("touchend", (e) => { if (y0 != null && e.changedTouches[0].clientY - y0 > 110) fechar(); y0 = null; }, { passive: true });
  mostrar();
}
async function verQuemViu(s) {
  const corpo = abrirLista("Quem viu");
  corpo.appendChild(el("div", "lista-vazia", "Carregando..."));
  try {
    const v = await fb.getDocs(fb.query(fb.collection(fb.db, "stories", s.id, "vistos"), fb.limit(300)));
    corpo.replaceChildren();
    if (!v.size) { corpo.appendChild(el("div", "lista-vazia", "Ninguém viu ainda.")); return; }
    const l = v.docs.map((d) => ({ uid: d.id, quando: ms(d.data().criadoEm) })).sort((a, b) => b.quando - a.quando);
    const perfis = await Promise.all(l.map((x) => obterPerfil(x.uid).catch(() => ({}))));
    l.forEach((x, i) => corpo.appendChild(linhaPessoa({ uid: x.uid, nome: perfis[i].nome || "Usuário", foto: perfis[i].fotoPerfil, sub: tempoRelativo(new Date(x.quando || Date.now())) })));
  } catch (e) { corpo.replaceChildren(el("div", "lista-vazia", "Não foi possível carregar: " + erroAmigavel(e))); }
}
