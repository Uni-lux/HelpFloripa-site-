// =====================================================
// Casca da rede social (rede.html): as 5 abas da barra de baixo abertas ao mesmo tempo, como nos apps grandes.
// - Cada aba é a página de sempre num quadro (iframe) que carrega UMA vez: Diário e Explorar = feed.html (o feed troca
//   entre os dois por dentro), Comunidade = mural.html, Mensagens = mensagens.html, Perfil = usuarios.html.
// - Trocar de aba só mostra outro quadro: nada recarrega, a rolagem e o que estava aberto ficam como estavam.
// - Deslizar o dedo (deslizar-flash.js, dentro do quadro) mostra a aba vizinha de verdade ao lado e a arrasta junto.
// - Os quadros que ainda não foram abertos carregam sozinhos depois, um de cada vez, quando a tela está parada.
// - Link para uma página que não é aba (vitrine, perfil de outra pessoa, configurações...) abre no próprio quadro;
//   link para outra aba troca de aba. Login e saída mexem na página inteira.
// API para os quadros: window.__hfShell (quadro-rede.js e deslizar-flash.js usam).
// =====================================================
import { guardarSaida } from "./confirmar.js?v=5";

const ABAS = ["diario", "explorar", "comunidade", "mensagens", "perfil"];
const NOMES = { diario: "Diário", explorar: "Explorar", comunidade: "Comunidade", mensagens: "Mensagens", perfil: "Perfil" };
const QUADRO_DE = { diario: "feed", explorar: "feed", comunidade: "mural", mensagens: "mensagens", perfil: "perfil" };
const PAGINA = { feed: "feed.html", mural: "mural.html", mensagens: "mensagens.html", perfil: "usuarios.html" };
const S = window.__hfShell;
const quadros = {};
let atual = null;
const inicial = new URLSearchParams(location.search).get("aba");
const primeira = ABAS.includes(inicial) ? inicial : "diario";
const W = () => innerWidth;
const nomeArq = (u) => u.pathname.split("/").pop() || "index.html";

// Endereço → aba (ou null quando não é aba: abre no próprio quadro).
function abaDaUrl(u) {
  const p = nomeArq(u);
  if (p === "feed.html") {
    if ([...u.searchParams.keys()].some((k) => k !== "aba")) return null;
    return u.searchParams.get("aba") === "explorar" ? "explorar" : "diario";
  }
  if (u.search || u.hash) return null; // ex.: usuarios.html?perfil=... é o perfil de outra pessoa
  return { "mural.html": "comunidade", "mensagens.html": "mensagens", "usuarios.html": "perfil" }[p] || null;
}
// O quadro está na página dele (e não numa vitrine, perfil de outra pessoa...)?
function emCasa(id) {
  try { const l = quadros[id]?.contentWindow?.location; return !!l && nomeArq(l) === PAGINA[id] && (id === "feed" || !l.search); } catch { return false; }
}
function visivel(id, sim) {
  try { const w = quadros[id]?.contentWindow; if (!w) return; w.__hfGavetaAberta = sim; w.dispatchEvent(new Event("hf:gaveta")); } catch {}
}

function quadro(id, aba) {
  if (quadros[id]) return quadros[id];
  const f = document.createElement("iframe");
  f.className = "hf-quadro";
  f.dataset.id = id;
  f.title = id === "feed" ? "Diário" : NOMES[Object.keys(QUADRO_DE).find((k) => QUADRO_DE[k] === id)];
  f.setAttribute("allow", "camera; microphone; geolocation; clipboard-read; clipboard-write; fullscreen; autoplay; web-share");
  f.setAttribute("allowfullscreen", "");
  f.src = PAGINA[id] + (aba === "explorar" ? "?aba=explorar" : "");
  f.addEventListener("load", () => carregou(id));
  quadros[id] = f;
  document.body.appendChild(f);
  return f;
}

// Cada carga de página dentro de um quadro.
function carregou(id) {
  const f = quadros[id];
  let w, l;
  try { w = f.contentWindow; l = w.location; } catch { return; }
  document.getElementById("carregandoRede")?.remove();
  const p = nomeArq(l);
  // Login, conta e saída: a página inteira.
  if (/^(login|cadastre-se|conta|verificar-email)\.html$/.test(p)) { location.href = l.href; return; }
  f.dataset.carregou = "1";
  if (QUADRO_DE[atual] === id) document.title = w.document.title || "Help Floripa";
  // Toques dentro do quadro contam como "mexeu na página" para a proteção de saída (confirmar.js).
  try {
    w.addEventListener("pointerdown", () => dispatchEvent(new Event("pointerdown")), { capture: true });
    w.addEventListener("keydown", () => dispatchEvent(new Event("keydown")), { capture: true });
  } catch {}
  visivel(id, QUADRO_DE[atual] === id);
  if (!S.pronto) { S.pronto = true; setTimeout(carregarOutros, 2500); }
}

// Os outros quadros carregam aos poucos, com a tela parada, para a troca e o deslize já mostrarem a aba pronta.
function carregarOutros() {
  const falta = ["feed", "mural", "mensagens", "perfil"].filter((id) => !quadros[id]);
  if (!falta.length) return;
  const vai = () => { if (document.hidden) { setTimeout(carregarOutros, 3000); return; } quadro(falta[0], "diario"); setTimeout(carregarOutros, 2500); };
  (window.requestIdleCallback || ((fn) => setTimeout(fn, 300)))(vai, { timeout: 4000 });
}

function marcarHistorico(k) {
  const url = `rede.html?aba=${k}`;
  const st = { ...(history.state || {}), hfAba: k };
  delete st.hfCamadas;
  // Saindo da aba em que a rede abriu entra UM passo (o "voltar" traz de volta para ela, como no Instagram);
  // entre as outras abas, só troca o endereço.
  if (k !== primeira && !history.state?.hfPasso) { delete st.hfBase; delete st.hfGuarda; history.pushState({ ...st, hfPasso: true }, "", url); }
  else history.replaceState(st, "", url);
}

// Mostra a aba k.
function ir(k, { historico = true } = {}) {
  if (!ABAS.includes(k)) return;
  const id = QUADRO_DE[k];
  const novo = !quadros[id];
  const f = quadro(id, k);
  if (!novo && f.dataset.carregou && !emCasa(id)) {
    // O quadro estava numa vitrine/perfil de outra pessoa: volta para a página da aba.
    f.src = PAGINA[id] + (k === "explorar" ? "?aba=explorar" : "");
  } else if (id === "feed" && f.dataset.carregou) {
    try { f.contentWindow.__hfTrocarAba?.(k); } catch {}
  }
  for (const [qid, q] of Object.entries(quadros)) {
    q.classList.toggle("ativo", qid === id);
    q.classList.remove("movendo", "anima");
    q.style.transform = "";
    if (qid !== id) visivel(qid, false);
  }
  visivel(id, true);
  atual = k;
  try { if (f.dataset.carregou) document.title = f.contentWindow.document.title || "Help Floripa"; } catch {}
  if (historico) marcarHistorico(k);
}

// ---------- deslizar entre abas (chamado de dentro do quadro) ----------
let arraste = null;
function vizinho(k, lado) {
  const i = ABAS.indexOf(k);
  const j = lado === "dir" ? i - 1 : i + 1;
  return j >= 0 && j < ABAS.length ? ABAS[j] : null;
}
function comecar(k, lado) {
  const alvo = vizinho(k, lado);
  if (!alvo || QUADRO_DE[alvo] === QUADRO_DE[k]) return false;
  const de = quadros[QUADRO_DE[k]], para = quadro(QUADRO_DE[alvo], alvo);
  // Explorar fica no quadro do Diário: já deixa o feed no Explorar antes de aparecer.
  if (alvo === "explorar" || alvo === "diario") { try { para.contentWindow.__hfTrocarAba?.(alvo); } catch {} }
  for (const q of [de, para]) { q.classList.remove("anima"); q.classList.add("movendo"); }
  para.style.transform = `translate3d(${lado === "dir" ? -W() : W()}px,0,0)`;
  arraste = { de, para, lado, alvo, dx: 0 };
  return true;
}
function mover(dx) {
  if (!arraste) return;
  const { de, para, lado } = arraste;
  const d = lado === "dir" ? Math.max(0, dx) : Math.min(0, dx);
  arraste.dx = d;
  de.style.transform = `translate3d(${d}px,0,0)`;
  para.style.transform = `translate3d(${(lado === "dir" ? -W() : W()) + d}px,0,0)`;
}
function terminar(vai) {
  if (!arraste) return;
  const { de, para, lado, alvo } = arraste;
  arraste = null;
  for (const q of [de, para]) q.classList.add("anima");
  if (vai) {
    de.style.transform = `translate3d(${lado === "dir" ? W() : -W()}px,0,0)`;
    para.style.transform = "translate3d(0,0,0)";
  } else {
    de.style.transform = "translate3d(0,0,0)";
    para.style.transform = `translate3d(${lado === "dir" ? -W() : W()}px,0,0)`;
  }
  setTimeout(() => {
    for (const q of [de, para]) { q.classList.remove("anima", "movendo"); q.style.transform = ""; }
    if (vai) ir(alvo);
  }, 250);
}

Object.assign(S, {
  ABAS, NOMES,
  ir: (k) => ir(k),
  // O feed trocou entre Diário e Explorar por dentro (barra-rede.js marcarBarra).
  marcou(k, w) { if (!ABAS.includes(k) || quadros[QUADRO_DE[k]]?.contentWindow !== w || QUADRO_DE[atual] !== QUADRO_DE[k]) return; if (k !== atual) { atual = k; marcarHistorico(k); } },
  // Link clicado dentro de um quadro: "aqui" (deixa o quadro seguir), uma aba (troca) ou null (o quadro abre a página).
  destinoDe(href, w) {
    let u; try { u = new URL(href, location.href); } catch { return null; }
    if (u.origin !== location.origin) return null;
    const k = abaDaUrl(u);
    if (!k) return null;
    const id = QUADRO_DE[k];
    if (quadros[id]?.contentWindow === w && emCasa(id)) return "aqui";
    return k;
  },
  vizinho, comecar, mover, terminar,
  nomeDe: (k) => NOMES[k] || "",
});
Object.defineProperty(S, "atual", { get: () => atual }); // (Object.assign copiaria só o valor de agora)

// "Voltar" entre as abas (o passo de sair do Diário).
addEventListener("popstate", () => {
  const k = history.state?.hfAba || primeira;
  if (k !== atual) ir(k, { historico: false });
});

history.replaceState({ ...(history.state || {}), hfAba: primeira }, "", `rede.html?aba=${primeira}`);
ir(primeira, { historico: false });
guardarSaida();
