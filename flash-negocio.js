// =====================================================
// Flash no perfil de negócio: anel em volta da foto do negócio e visor em tela cheia.
// O dono escolhe, ao publicar o flash, em quais perfis de negócio ele aparece (stories.negocios = [uid_tipo]).
// Funciona nas vitrines (servicos/delivery/shopping/imoveis) e no perfil, sem depender do rede.js.
// Quem vê: as mesmas escolhas do autor (Amigos próximos e "Ocultar de") e 24 h.
// =====================================================
const DIA = 864e5, TEMPO_FOTO = 6000;
const ms = (t) => (t?.toMillis ? t.toMillis() : t?.seconds ? t.seconds * 1000 : typeof t === "number" ? t : 0);
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const seguro = (u) => (typeof u === "string" && /^(data:image\/(jpeg|png|webp);base64,|https:\/\/firebasestorage\.googleapis\.com\/)/.test(u) ? u : "");
const ativo = (s) => Date.now() - (ms(s.criadoEm) || Date.now()) < DIA;
const podeVer = (s, uid) => s.autorId === uid || (!(Array.isArray(s.ocultoPara) && s.ocultoPara.includes(uid)) && (s.publico !== "amigos" || (Array.isArray(s.lista) && s.lista.includes(uid))));
const vistosChave = "hf-stories-vistos";
const vistos = () => { try { return new Set(JSON.parse(localStorage.getItem(vistosChave) || "[]")); } catch { return new Set(); } };
const marcarVisto = (id) => { try { const v = vistos(); v.add(id); localStorage.setItem(vistosChave, JSON.stringify([...v].slice(-600))); } catch {} };

let cssPronto = false;
function css() {
  if (cssPronto) return; cssPronto = true;
  const st = document.createElement("style");
  st.textContent = `
.fn-anel { cursor: pointer; box-shadow: 0 0 0 3px var(--vt-card, var(--panel, #0f161b)), 0 0 0 6px #ff3d7f, 0 0 0 7.5px #ff8a00, 0 6px 22px rgba(255, 61, 127, .45) !important; animation: fn-pulsa 2.4s ease-in-out infinite; }
.fn-anel.visto { box-shadow: 0 0 0 3px var(--vt-card, var(--panel, #0f161b)), 0 0 0 5px rgba(140, 150, 160, .7) !important; animation: none; }
@keyframes fn-pulsa { 50% { box-shadow: 0 0 0 3px var(--vt-card, var(--panel, #0f161b)), 0 0 0 6px #ff8a00, 0 0 0 7.5px #ff3d7f, 0 6px 26px rgba(255, 138, 0, .55); } }
@media (prefers-reduced-motion: reduce) { .fn-anel { animation: none; } }
.fn-visor { position: fixed; inset: 0; z-index: 9800; background: #000; display: grid; place-items: center; touch-action: none; animation: fn-entra .2s ease; }
@keyframes fn-entra { from { opacity: 0; transform: scale(.98); } }
.fn-caixa { position: relative; width: min(100vw, calc(100vh * 9 / 16)); height: min(100vh, calc(100vw * 16 / 9)); max-height: 100dvh; background: #111; overflow: hidden; border-radius: 0; }
@media (min-width: 700px) { .fn-caixa { border-radius: 16px; height: min(94vh, 900px); width: calc(min(94vh, 900px) * 9 / 16); } }
.fn-palco { position: absolute; inset: 0; display: grid; place-items: center; }
.fn-palco img, .fn-palco video { width: 100%; height: 100%; object-fit: cover; }
.fn-sombra { position: absolute; inset: 0 0 auto 0; height: 140px; background: linear-gradient(rgba(0,0,0,.55), transparent); pointer-events: none; }
.fn-barras { position: absolute; top: calc(10px + env(safe-area-inset-top)); left: 10px; right: 10px; display: flex; gap: 4px; z-index: 3; }
.fn-barra { flex: 1; height: 3px; border-radius: 3px; background: rgba(255,255,255,.35); overflow: hidden; }
.fn-barra i { display: block; height: 100%; width: 0; background: #fff; }
.fn-topo { position: absolute; top: calc(22px + env(safe-area-inset-top)); left: 12px; right: 8px; display: flex; align-items: center; gap: 10px; z-index: 3; color: #fff; }
.fn-av { width: 38px; height: 38px; border-radius: 12px; overflow: hidden; flex: none; display: grid; place-items: center; background: #00adee; font-weight: 800; border: 2px solid rgba(255,255,255,.9); }
.fn-av img { width: 100%; height: 100%; object-fit: cover; }
.fn-quem { flex: 1; min-width: 0; display: grid; text-shadow: 0 1px 4px rgba(0,0,0,.5); }
.fn-quem strong { font-size: 14.5px; display: flex; align-items: center; gap: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fn-quem small { font-size: 12px; opacity: .85; }
.fn-chip { flex: none; padding: 2px 7px; border-radius: 999px; background: rgba(255,255,255,.18); font-size: 10.5px; font-weight: 800; text-shadow: none; }
.fn-x { width: 40px; height: 40px; border: 0; border-radius: 50%; background: none; color: #fff; font-size: 26px; line-height: 1; cursor: pointer; }
.fn-toque { position: absolute; top: 80px; bottom: 90px; width: 50%; z-index: 2; border: 0; background: none; cursor: pointer; }
.fn-toque.esq { left: 0; } .fn-toque.dir { right: 0; }
.fn-legenda { position: absolute; left: 14px; right: 14px; bottom: 96px; z-index: 3; color: #fff; font-size: 15px; font-weight: 650; text-shadow: 0 1px 6px rgba(0,0,0,.7); text-align: center; }
.fn-rodape { position: absolute; left: 12px; right: 12px; bottom: calc(16px + env(safe-area-inset-bottom)); z-index: 3; display: flex; gap: 8px; }
.fn-rodape button, .fn-rodape a { flex: 1; height: 46px; border-radius: 999px; border: 1.5px solid rgba(255,255,255,.6); background: rgba(0,0,0,.3); color: #fff; font: inherit; font-size: 14px; font-weight: 800; cursor: pointer; display: grid; place-items: center; text-decoration: none; -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
.fn-rodape .pri { background: #fff; color: #111; border-color: #fff; }
.fn-caixa.pausado .fn-barra i { transition: none !important; }
.fn-link { position: absolute; z-index: 4; transform: translate(-50%, -50%); display: inline-flex; align-items: center; gap: 8px; max-width: 82%; padding: 10px 14px; border-radius: 14px; background: rgba(255,255,255,.96); color: #111; text-decoration: none; font-weight: 850; font-size: 15px; box-shadow: 0 8px 24px rgba(0,0,0,.3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;
  document.head.appendChild(st);
}

const PAGINA = { servicos: "servicos.html", delivery: "delivery.html", lojinha: "shopping.html", imoveis: "imoveis.html", saude: "saude.html" };
const cache = new Map();
// Flashes ativos que o dono colocou neste perfil de negócio (o que a pessoa pode ver), do mais antigo ao mais novo.
export function flashesDoNegocio(fbx, euX, negId) {
  if (!cache.has(negId)) cache.set(negId, fbx.getDocs(fbx.query(fbx.collection(fbx.db, "stories"), fbx.where("negocios", "array-contains", negId), fbx.limit(30)))
    .then((s) => s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })).filter((x) => ativo(x) && podeVer(x, euX?.uid)).sort((a, b) => ms(a.criadoEm) - ms(b.criadoEm)))
    .catch(() => []));
  return cache.get(negId);
}

// Anel no avatar do negócio: tocar abre o visor. Devolve a lista (vazia se não tem flash).
export async function anelNegocio(fbx, euX, alvo, n, opcoes = {}) {
  if (!alvo || !n?.id || !euX) return [];
  const lista = await flashesDoNegocio(fbx, euX, n.id);
  if (!lista.length || !alvo.isConnected) return lista;
  css();
  const pintar = () => { const v = vistos(); alvo.classList.toggle("visto", lista.every((x) => v.has(x.id))); };
  alvo.classList.add("fn-anel");
  alvo.setAttribute("role", "button"); alvo.tabIndex = 0; alvo.setAttribute("aria-label", `Ver o flash de ${n.nome || "negócio"}`);
  pintar();
  if (!alvo._fnLigado) {
    alvo._fnLigado = true;
    const abrir = (e) => { e.stopPropagation(); e.preventDefault(); abrirVisorNegocio(fbx, euX, n, lista, { ...opcoes, aoFechar: () => { pintar(); opcoes.aoFechar?.(); } }); };
    alvo.addEventListener("click", abrir);
    alvo.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") abrir(e); });
  }
  return lista;
}

// Visor em tela cheia: foto/vídeo, barras, tocar para avançar/voltar, segurar para pausar, arrastar para baixo fecha.
export function abrirVisorNegocio(fbx, euX, n, lista, { aoMensagem = null, aoPerfil = null, aoFechar = null } = {}) {
  css();
  const v0 = vistos();
  let i = Math.max(0, lista.findIndex((x) => !v0.has(x.id)));
  const fundo = el("div", "fn-visor"); fundo.setAttribute("role", "dialog"); fundo.setAttribute("aria-modal", "true"); fundo.setAttribute("aria-label", `Flash de ${n.nome || "negócio"}`);
  const caixa = el("div", "fn-caixa");
  const palco = el("div", "fn-palco");
  const barras = el("div", "fn-barras");
  const topo = el("div", "fn-topo");
  const av = el("div", "fn-av");
  const foto = seguro(n.foto); if (foto) { const im = document.createElement("img"); im.src = foto; im.alt = ""; av.appendChild(im); } else av.textContent = String(n.nome || "N").slice(0, 1).toUpperCase();
  const quem = el("div", "fn-quem"); const nome = el("strong"); nome.append(document.createTextNode(n.nome || "Negócio"), el("span", "fn-chip", "⚡ Flash")); const quando = el("small");
  quem.append(nome, quando);
  const bX = el("button", "fn-x", "×"); bX.type = "button"; bX.setAttribute("aria-label", "Fechar");
  topo.append(av, quem, bX);
  const esq = el("button", "fn-toque esq"); esq.type = "button"; esq.setAttribute("aria-label", "Anterior");
  const dir = el("button", "fn-toque dir"); dir.type = "button"; dir.setAttribute("aria-label", "Próximo");
  const legenda = el("div", "fn-legenda");
  const rodape = el("div", "fn-rodape");
  caixa.append(palco, el("div", "fn-sombra"), legenda, esq, dir, barras, topo, rodape);
  fundo.appendChild(caixa);
  document.body.appendChild(fundo);
  const travar = document.body.style.overflow; document.body.style.overflow = "hidden";
  let timer = null, inicio = 0, restante = 0, pausado = false, video = null, fechado = false;
  const fechar = () => { if (fechado) return; fechado = true; clearTimeout(timer); video?.pause(); fundo.remove(); document.body.style.overflow = travar; document.removeEventListener("keydown", tecla, true); aoFechar?.(); };
  const tempo = (t) => { const s = Math.max(0, (Date.now() - t) / 1000); return s < 3600 ? `${Math.max(1, Math.floor(s / 60))} min` : `${Math.floor(s / 3600)} h`; };
  const animar = (dur) => {
    const b = barras.children[i]?.firstChild; if (!b) return;
    b.style.transition = "none"; b.style.width = "0%";
    requestAnimationFrame(() => requestAnimationFrame(() => { if (pausado) return; b.style.transition = `width ${dur}ms linear`; b.style.width = "100%"; }));
  };
  function mostrar() {
    if (fechado) return;
    clearTimeout(timer); video?.pause(); video = null; pausado = false; caixa.classList.remove("pausado");
    const s = lista[i]; if (!s) { fechar(); return; }
    barras.replaceChildren(...lista.map((_, k) => { const b = el("span", "fn-barra"); const x = el("i"); if (k < i) x.style.width = "100%"; b.appendChild(x); return b; }));
    quando.textContent = `${s.nome ? "por " + String(s.nome).split(" ")[0] + " · " : ""}${tempo(ms(s.criadoEm) || Date.now())}`;
    legenda.textContent = s.texto || ""; legenda.hidden = !s.texto;
    palco.replaceChildren();
    caixa.querySelector(".fn-link")?.remove();
    if (s.link?.negocioId && PAGINA[s.link.tipo]) {
      const a = el("a", "fn-link", "↗ " + (s.link.nome || "Ver o negócio")); a.href = `${PAGINA[s.link.tipo]}?negocio=${encodeURIComponent(s.link.negocioId)}&de=flash`;
      a.style.left = `${(s.link.x ?? 0.5) * 100}%`; a.style.top = `${(s.link.y ?? 0.68) * 100}%`;
      caixa.appendChild(a);
    }
    if (s.tipo === "video" && seguro(s.midia)) {
      video = document.createElement("video"); video.src = s.midia; video.playsInline = true; video.autoplay = true; video.muted = true;
      video.addEventListener("ended", proximo);
      video.addEventListener("loadedmetadata", () => animar((video.duration || 15) * 1000));
      video.play().catch(() => {});
      palco.appendChild(video);
    } else {
      const im = document.createElement("img"); im.src = seguro(s.midia); im.alt = s.texto || `Flash de ${n.nome || "negócio"}`; im.decoding = "async";
      palco.appendChild(im);
      animar(TEMPO_FOTO); restante = TEMPO_FOTO; inicio = Date.now();
      timer = setTimeout(proximo, TEMPO_FOTO);
    }
    marcarVisto(s.id);
    if (euX?.uid && s.autorId !== euX.uid) fbx.setDoc(fbx.doc(fbx.db, "stories", s.id, "vistos", euX.uid), { criadoEm: fbx.serverTimestamp() }).catch(() => {});
  }
  const proximo = () => { if (i < lista.length - 1) { i++; mostrar(); } else fechar(); };
  const anterior = () => { if (i > 0) i--; mostrar(); };
  function pausar(sim) {
    if (fechado || sim === pausado) return;
    pausado = sim; caixa.classList.toggle("pausado", sim);
    const b = barras.children[i]?.firstChild;
    if (sim) { clearTimeout(timer); video?.pause(); if (b) { const w = getComputedStyle(b).width; b.style.transition = "none"; b.style.width = w; } if (!video) restante = Math.max(300, restante - (Date.now() - inicio)); }
    else if (video) { video.play().catch(() => {}); if (b) { b.style.transition = `width ${Math.max(200, ((video.duration || 15) - video.currentTime) * 1000)}ms linear`; b.style.width = "100%"; } }
    else { inicio = Date.now(); timer = setTimeout(proximo, restante); if (b) { b.style.transition = `width ${restante}ms linear`; b.style.width = "100%"; } }
  }
  // Rodapé: mensagem para o negócio e o perfil de quem postou (quando a página oferece).
  if (lista[0]?.autorId !== euX?.uid) {
    if (aoMensagem) { const b = el("button", "pri", "Enviar mensagem"); b.type = "button"; b.addEventListener("click", () => { fechar(); aoMensagem(); }); rodape.appendChild(b); }
    if (aoPerfil) { const b = el("button", null, "Ver quem postou"); b.type = "button"; b.addEventListener("click", () => { const u = lista[i]?.autorId; fechar(); if (u) aoPerfil(u); }); rodape.appendChild(b); }
  } else rodape.appendChild(el("button", null, "Você vê quem viu no Diário → Seu flash")).type = "button";
  let segurou = false, tSeg = null, y0 = null;
  [esq, dir].forEach((b) => {
    b.addEventListener("pointerdown", (e) => { y0 = e.clientY; segurou = false; tSeg = setTimeout(() => { segurou = true; pausar(true); }, 220); });
    b.addEventListener("pointerup", (e) => {
      clearTimeout(tSeg);
      if (y0 != null && e.clientY - y0 > 90) { fechar(); return; }
      if (segurou) { segurou = false; pausar(false); return; }
      (b === dir ? proximo : anterior)();
    });
    b.addEventListener("pointercancel", () => { clearTimeout(tSeg); if (segurou) { segurou = false; pausar(false); } });
  });
  bX.addEventListener("click", fechar);
  const tecla = (e) => { if (e.key === "Escape") fechar(); else if (e.key === "ArrowRight") proximo(); else if (e.key === "ArrowLeft") anterior(); else if (e.key === " ") { e.preventDefault(); pausar(!pausado); } };
  document.addEventListener("keydown", tecla, true);
  setTimeout(() => bX.focus({ preventScroll: true }), 50);
  mostrar();
}
