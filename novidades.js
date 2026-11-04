// =====================================================
// Novidades (como os apps grandes), sem dependências:
// - maisNovo(lista, campo): o carimbo (Timestamp) mais recente do que já está na tela, com os nanossegundos (em
//   milissegundos o mais recente "voltaria" toda vez, porque o servidor guarda microssegundos).
// - haNovidade(fs, colecao, filtros, campo, marco): pergunta ao servidor se existe algo DEPOIS do marco (limit 1 = 1 leitura).
//   Usado pelo "puxar para atualizar": sem novidade, a página não relê nada.
// - pilulaNovidades({...}): a pílula "↑ Novas publicações" que aparece no topo quando chega algo novo enquanto a pessoa
//   está rolando; tocar sobe e atualiza.
// Usado no Diário, Explorar, Comunidade (mural) e Notificações.
// =====================================================
const valorTs = (t) => (t && typeof t.seconds === "number" ? t.seconds * 1e9 + (t.nanoseconds || 0) : 0);
export function maisNovo(lista, campo = "criadoEm") {
  return (lista || []).reduce((m, x) => (valorTs(x?.[campo]) > valorTs(m) ? x[campo] : m), null);
}
// Lista vazia: vale a hora em que ela foi lida (o que sair depois disso é novidade).
export const marcoOu = (marco, desdeMs) => marco || (desdeMs ? { seconds: Math.floor(desdeMs / 1000), nanoseconds: 0 } : null);
export const tsDe = (fs, t) => (t ? new fs.Timestamp(t.seconds, t.nanoseconds || 0) : null);

// true = tem algo novo (ou não deu para saber: aí a página relê, como antes).
export async function haNovidade(fs, db, colecao, filtros, campo, marco, n = 1) {
  if (!marco) return n === 1 ? true : [];
  try {
    const q = fs.query(fs.collection(db, colecao), ...filtros, fs.where(campo, ">", tsDe(fs, marco)), fs.orderBy(campo, "desc"), fs.limit(n));
    const s = await fs.getDocs(q);
    return n === 1 ? !s.empty : s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }));
  } catch (e) { console.warn("Novidades:", e?.code || e); return n === 1 ? true : []; }
}

// O que a pessoa está vendo agora "está à vista"? (aba do navegador à vista e, na rede, o quadro desta aba à mostra)
export const aVista = () => !document.hidden && window.__hfGavetaAberta !== false;

const CSS = `
.hf-novas { position: fixed; left: 50%; z-index: 1150; display: inline-flex; align-items: center; gap: 8px; max-width: calc(100vw - 32px);
  padding: 7px 14px 7px 8px; border: 0; border-radius: 999px; background: var(--accent, #00adee); color: #fff; font: inherit; font-size: 13.5px;
  font-weight: 800; letter-spacing: .1px; box-shadow: 0 8px 26px rgba(0, 0, 0, .32), 0 0 0 1px rgba(255,255,255,.08) inset; cursor: pointer;
  transform: translate(-50%, -14px) scale(.96); opacity: 0; pointer-events: none; transition: transform .28s cubic-bezier(.2,.9,.3,1.2), opacity .2s;
  -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
.hf-novas.on { transform: translate(-50%, 0) scale(1); opacity: 1; pointer-events: auto; }
.hf-novas:active { transform: translate(-50%, 0) scale(.96); }
.hf-novas .hn-seta { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; background: rgba(255,255,255,.2); flex: none; }
.hf-novas .hn-seta svg { width: 14px; height: 14px; }
.hf-novas .hn-rostos { display: inline-flex; flex: none; }
.hf-novas .hn-rostos:empty { display: none; }
.hf-novas .hn-rostos i { width: 22px; height: 22px; border-radius: 50%; background: #0a3140 center / cover no-repeat; border: 2px solid var(--accent, #00adee); margin-left: -7px; display: grid; place-items: center; font-style: normal; font-size: 10px; font-weight: 800; }
.hf-novas .hn-rostos i:first-child { margin-left: 0; }
.hf-novas .hn-tx { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
@media (prefers-reduced-motion: reduce) { .hf-novas { transition: opacity .2s; } }
`;
let cssPronto = false;
function css() { if (cssPronto) return; cssPronto = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); }
const fotoOk = (u) => (typeof u === "string" && /^(data:image\/(jpeg|png|webp);base64,|https:\/\/firebasestorage\.googleapis\.com\/|http:\/\/127\.0\.0\.1:9199\/)/.test(u) ? u : "");

// opcoes: aoTocar() (sobe e atualiza), topo() (onde ela fica: logo abaixo do topo fixo da página), sumirNoTopo (some
// sozinha quando a pessoa volta ao topo por conta própria: a lista de cima já é a nova).
export function pilulaNovidades({ aoTocar, topo, sumirNoTopo = false } = {}) {
  css();
  const b = document.createElement("button");
  b.type = "button"; b.className = "hf-novas"; b.setAttribute("aria-live", "polite");
  b.innerHTML = `<span class="hn-seta" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></span><span class="hn-rostos" aria-hidden="true"></span><span class="hn-tx"></span>`;
  document.body.appendChild(b);
  const posicao = () => {
    const h = document.querySelector("header.topo, .topo");
    const r = h?.getBoundingClientRect();
    b.style.top = ((topo ? topo() : r && r.bottom > 0 ? r.bottom : 0) + 10) + "px";
  };
  let ligada = false;
  const esconder = () => { ligada = false; b.classList.remove("on"); b.tabIndex = -1; };
  b.addEventListener("click", async () => {
    esconder();
    try { scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); } catch { scrollTo(0, 0); }
    await aoTocar?.();
  });
  if (sumirNoTopo) addEventListener("scroll", () => { if (ligada && scrollY < 40) esconder(); }, { passive: true });
  return {
    mostrar({ texto = "Novidades", fotos = [] } = {}) {
      posicao();
      b.querySelector(".hn-tx").textContent = texto;
      const rostos = b.querySelector(".hn-rostos");
      rostos.replaceChildren(...fotos.slice(0, 3).map((f) => { const i = document.createElement("i"); const u = fotoOk(f?.foto); if (u) i.style.backgroundImage = `url("${u}")`; else i.textContent = String(f?.nome || "?").trim().slice(0, 1).toUpperCase(); return i; }));
      b.setAttribute("aria-label", texto + ". Toque para ver.");
      ligada = true; b.tabIndex = 0;
      requestAnimationFrame(() => b.classList.add("on"));
    },
    esconder,
    get ligada() { return ligada; },
    elemento: b,
  };
}

// Confere de tempos em tempos (só com a página à vista). Volta uma função que para.
export function conferirDeTempos(fn, ms = 120000) {
  ms = window.__hfTesteNovidades || ms; // nos testes, de segundos em segundos
  let t = 0, parado = false;
  const rodar = async () => { if (parado) return; if (aVista()) { try { await fn(); } catch {} } t = setTimeout(rodar, ms); };
  t = setTimeout(rodar, ms);
  const voltou = () => { if (!parado && aVista()) { clearTimeout(t); t = setTimeout(rodar, 4000); } };
  document.addEventListener("visibilitychange", voltou);
  addEventListener("hf:gaveta", voltou);
  return () => { parado = true; clearTimeout(t); };
}
