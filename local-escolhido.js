// =====================================================
// "Você está em ...": a cidade escolhida pela pessoa (como o "Entregar em" dos apps de entrega).
// - Guardada no aparelho em `hf-busca-local` {uf, cidade, cidadeIbge}, a MESMA chave do filtro
//   "Onde procurar" das vitrines: escolher aqui vale para o início, as vitrines e o "Perto de você".
// - escolherLocal() abre a folha: localização atual (GPS), cidade do perfil, Estado/Cidade ou todo o Brasil.
// Sem dependência do rede.js.
// =====================================================
import { camposEndereco, textoCidade, NOME_UF, cidadePorCodigo, semAcento } from "./endereco.js?v=1";

export const CHAVE_LOCAL = "hf-busca-local";
export function lerLocal() {
  try { const f = JSON.parse(localStorage.getItem(CHAVE_LOCAL) || "{}"); return f && NOME_UF[f.uf] ? f : {}; } catch { return {}; }
}
export function salvarLocal(f) { try { localStorage.setItem(CHAVE_LOCAL, JSON.stringify(f || {})); } catch {} }
// "Florianópolis/SC", "Santa Catarina" ou "Todo o Brasil".
export const rotuloLocal = (f = lerLocal()) => (!f.uf ? "Todo o Brasil" : f.cidadeIbge ? textoCidade(f) : NOME_UF[f.uf]);
// O item (negócio, anúncio) é do local escolhido? Sem estado no item, compara o nome da cidade.
export function noLocal(n, f = lerLocal()) {
  if (!f.uf) return true;
  const uf = n.uf || (String(n.cidade || "").match(/[\/,-]\s*([A-Za-z]{2})\s*$/)?.[1] || "").toUpperCase();
  if (uf && uf !== f.uf) return false;
  if (!f.cidadeIbge) return !!uf;
  if (n.cidadeIbge) return Number(n.cidadeIbge) === Number(f.cidadeIbge);
  return semAcento(String(n.cidade || "").replace(/\s*[\/,-]\s*[A-Za-z]{2}\s*$/, "")) === semAcento(f.cidade);
}

const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const SVG = {
  gps: '<circle cx="12" cy="12" r="3.2"/><circle cx="12" cy="12" r="7.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22"/>',
  casa: '<path d="M4 10.5L12 4l8 6.5V19a1.5 1.5 0 01-1.5 1.5H15v-6h-6v6H5.5A1.5 1.5 0 014 19z"/>',
  brasil: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.2-3.4-8.5S9.7 5.9 12 3.5z"/>'
};
const ic = (n) => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true"); s.innerHTML = SVG[n]; return s; };

function css() {
  if (document.getElementById("hfLocalCss")) return;
  const st = document.createElement("style"); st.id = "hfLocalCss";
  st.textContent = `
.hm-local { position: fixed; inset: 0; z-index: 4600; display: grid; place-items: end center; background: rgba(2, 6, 9, .55); -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px); }
.hm-local-pop { width: min(520px, 100%); max-height: 92vh; overflow-y: auto; display: grid; gap: 12px; padding: 16px 16px calc(18px + env(safe-area-inset-bottom)); border-radius: 24px 24px 0 0; background: var(--panel); border: 1px solid var(--line); box-shadow: 0 -20px 60px rgba(0, 0, 0, .35); animation: hmSobe .22s ease-out; }
@keyframes hmSobe { from { transform: translateY(30px); opacity: .4; } to { transform: none; opacity: 1; } }
@media (min-width: 700px) { .hm-local { place-items: center; } .hm-local-pop { border-radius: 24px; } }
.hm-local-topo { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.hm-local-topo strong { font-size: 18px; }
.hm-local-x { width: 38px; height: 38px; border-radius: 50%; border: 0; background: var(--panel-2); color: var(--text); font-size: 22px; cursor: pointer; }
.hm-local-pop > p { margin: -6px 0 0; color: var(--muted); font-size: 13.5px; }
.hm-local-op { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px; border-radius: 16px; border: 1px solid var(--line); background: var(--panel-2); color: var(--text); font: inherit; text-align: left; cursor: pointer; }
.hm-local-op:hover, .hm-local-op.on { border-color: var(--accent); }
.hm-local-op svg { width: 22px; height: 22px; flex-shrink: 0; fill: none; stroke: var(--accent); stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }
.hm-local-op span { display: grid; gap: 1px; }
.hm-local-op strong { font-size: 14.5px; }
.hm-local-op small { color: var(--muted); font-size: 12.5px; }
.hm-local-sep { display: flex; align-items: center; gap: 10px; color: var(--muted); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; }
.hm-local-sep::before, .hm-local-sep::after { content: ""; flex: 1; height: 1px; background: var(--line); }
.hm-local-aplicar { padding: 13px; border-radius: 14px; border: 0; background: var(--accent); color: var(--accent-ink, #fff); font: inherit; font-weight: 800; cursor: pointer; }
.hm-local-aviso { margin: 0; font-size: 13px; color: var(--danger, #e5484d); }
.hm-local .hf-end { display: grid; gap: 10px; }
.hm-local .campo { display: grid; gap: 6px; }
.hm-local .campo label { font-size: 13px; font-weight: 700; color: var(--text); }
.hm-local .campo select, .hm-local .campo input { width: 100%; box-sizing: border-box; padding: 12px 13px; border-radius: 12px; border: 1px solid var(--line); background: var(--panel-2); color: var(--text); font: inherit; font-size: 15px; }
.hm-local .campo select:focus, .hm-local .campo input:focus { outline: 2px solid color-mix(in srgb, var(--accent) 55%, transparent); border-color: var(--accent); }
.hm-local .campo .ajuda { font-size: 12px; color: var(--muted); }
`;
  document.head.appendChild(st);
}

// Abre a folha "Onde você está?". Devolve o local escolhido ({} = todo o Brasil) ou null se fechou.
export function escolherLocal({ perfil = {}, pedirLocalizacao, esquecerPosicao } = {}) {
  css();
  return new Promise((resolve) => {
    const atual = lerLocal();
    // .vt-local-fundo: o botão "voltar" do celular fecha a folha (voltar.js).
    const fundo = el("div", "vt-local-fundo hm-local");
    const cx = el("div", "hm-local-pop"); cx.setAttribute("role", "dialog"); cx.setAttribute("aria-modal", "true"); cx.setAttribute("aria-label", "Onde você está?");
    const topo = el("div", "hm-local-topo"); topo.append(el("strong", null, "Onde você está?"));
    const x = el("button", "hm-local-x", "×"); x.type = "button"; x.setAttribute("aria-label", "Fechar"); x.dataset.fechar = ""; topo.appendChild(x);
    const op = (icone, titulo, sub, on) => { const b = el("button", "hm-local-op" + (on ? " on" : "")); b.type = "button"; const t = el("span"); t.append(el("strong", null, titulo), el("small", null, sub)); b.append(ic(icone), t); return b; };
    const aviso = el("p", "hm-local-aviso"); aviso.hidden = true;
    const gps = op("gps", "Usar minha localização atual", "Fica só no seu aparelho, ninguém vê.");
    const doPerfil = perfil.uf && perfil.cidade ? op("casa", `Minha cidade: ${textoCidade(perfil)}`, "A cidade do seu perfil.", atual.cidadeIbge && Number(atual.cidadeIbge) === Number(perfil.cidadeIbge)) : null;
    const brasil = op("brasil", "Todo o Brasil", "Ver de todas as cidades.", !atual.uf);
    const campos = el("div");
    const local = camposEndereco(campos, { campos: ["uf", "cidade"], obrigatorios: [], valor: atual, rotuloCidade: "Cidade" });
    campos.querySelectorAll(".opcional").forEach((o) => o.remove());
    const aplicar = el("button", "hm-local-aplicar", "Ver esta cidade"); aplicar.type = "button";
    cx.append(topo, el("p", null, "Mostramos primeiro o que está na sua cidade. Vale também para as vitrines."), gps, ...(doPerfil ? [doPerfil] : []), brasil, el("div", "hm-local-sep", "ou escolha"), campos, aplicar, aviso);
    fundo.appendChild(cx); document.body.appendChild(fundo);
    setTimeout(() => gps.focus({ preventScroll: true }), 60);
    let feito = false;
    const fechar = (valor = null) => { if (feito) return; feito = true; fundo.remove(); document.removeEventListener("keydown", tecla); resolve(valor); };
    const tecla = (e) => { if (e.key === "Escape") fechar(); };
    document.addEventListener("keydown", tecla);
    fundo.addEventListener("click", (e) => { if (e.target === fundo) fechar(); });
    x.addEventListener("click", () => fechar());
    // Escolha manual de cidade: o GPS guardado deixa de valer (senão a distância seria de outro lugar).
    const escolher = (f, { manter = false } = {}) => { if (!manter && f.uf) esquecerPosicao?.(); salvarLocal(f); fechar(f); };
    gps.addEventListener("click", async () => {
      aviso.hidden = true; gps.disabled = true; gps.querySelector("strong").textContent = "Localizando...";
      try {
        const p = await pedirLocalizacao();
        const c = p?.cidadeIbge ? await cidadePorCodigo(p.cidadeIbge) : null;
        if (!c) throw new Error("Não achamos a sua cidade. Escolha na lista.");
        escolher({ uf: c.uf, cidade: c.cidade, cidadeIbge: c.cidadeIbge }, { manter: true });
      } catch (e) { aviso.textContent = e?.message || "Não deu para pegar a sua localização."; aviso.hidden = false; gps.disabled = false; gps.querySelector("strong").textContent = "Usar minha localização atual"; }
    });
    doPerfil?.addEventListener("click", () => escolher(perfil.cidadeIbge ? { uf: perfil.uf, cidade: perfil.cidade, cidadeIbge: Number(perfil.cidadeIbge) } : { uf: perfil.uf }));
    brasil.addEventListener("click", () => escolher({}));
    aplicar.addEventListener("click", () => {
      const v = local.ler();
      if (!v.uf) { aviso.textContent = "Escolha o estado (e, se quiser, a cidade)."; aviso.hidden = false; return; }
      escolher(v.cidadeIbge ? { uf: v.uf, cidade: v.cidade, cidadeIbge: v.cidadeIbge } : { uf: v.uf });
    });
  });
}
