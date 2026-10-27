// =====================================================
// Cartões da Comunidade (doações, trocas, pedidos de ajuda, quartos compartilhados, achados e perdidos) para o Início
// e o Explorar. Sem dependências: quem chama passa a leitura (docsComValidade). Toque abre comunidade.html?item=ID.
// =====================================================
import { lerPorLocal } from "./por-local.js?v=1";

export const CAT_COM = {
  doacao: { nome: "Doação", plural: "Doações", cor: "#e5487f", emoji: "🎁" },
  troca: { nome: "Troca", plural: "Trocas", cor: "#8b5cf6", emoji: "🔄" },
  pedido: { nome: "Preciso de", plural: "Pedidos de ajuda", cor: "#f59e0b", emoji: "🙏" },
  quarto: { nome: "Quarto", plural: "Quartos para dividir", cor: "#0ea5e9", emoji: "🛏️" },
  achados: { nome: "Achados e perdidos", plural: "Achados e perdidos", cor: "#10b981", emoji: "🔎" }
};
const VALIDADE_DIAS = 60; // igual à página da Comunidade: depois disso o anúncio precisa ser renovado
const ms = (t) => t?.toMillis?.() ?? (t?.seconds ? t.seconds * 1000 : 0);
const fotoOk = (u) => typeof u === "string" && (/^data:image\/(jpeg|png|webp);base64,/.test(u) || /^https:\/\/firebasestorage\.googleapis\.com\//.test(u));
const moeda = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const relativo = (t) => { const d = Math.floor((Date.now() - ms(t)) / 864e5); return d <= 0 ? "hoje" : d === 1 ? "ontem" : d < 30 ? `há ${d} dias` : "há mais de um mês"; };

// No ar: disponível, não escondido pela equipe e dentro dos 60 dias.
export const comunidadeNoAr = (a) => a && a.status === "disponivel" && ms(a.ocultoAte) <= Date.now() && Date.now() - ms(a.atualizadoEm || a.criadoEm) <= VALIDADE_DIAS * 864e5;

// Nacional: a cidade escolhida primeiro, depois o estado e só então o Brasil (por-local.js; cada nível 10 min no aparelho).
// loc = { uf, cidadeIbge } (vazio = Brasil). Devolve { lista, nivel }.
export async function lerComunidade(fb, docsComValidade, loc = {}) {
  return lerPorLocal(fb, docsComValidade, { colecao: "comunidade", chave: "com", loc, limite: 30, minimo: 10, noAr: comunidadeNoAr });
}

// Selo no canto da foto: o que mais importa em cada tipo.
function selo(a) {
  if (a.categoria === "doacao") return "De graça";
  if (a.categoria === "troca") return "Troca";
  if (a.categoria === "quarto") return Number(a.quarto?.rateio) > 0 ? `${moeda(a.quarto.rateio)}/mês` : "Dividir contas";
  if (a.categoria === "achados") return a.achado?.tipo === "encontrado" ? "Encontrado" : "Perdido";
  return "Precisa";
}

export function cartaoComunidade(a, origem = "inicio") {
  css();
  const c = CAT_COM[a.categoria] || CAT_COM.doacao;
  const link = el("a", "cm-mini"); link.href = `comunidade.html?item=${encodeURIComponent(a.id)}&de=${origem}`;
  link.style.setProperty("--cc", c.cor);
  const capa = el("div", "cm-mini-capa");
  const foto = (a.fotos || []).find(fotoOk);
  if (foto) capa.style.backgroundImage = `url("${foto}")`; else { capa.classList.add("sem-foto"); capa.appendChild(el("span", "cm-mini-emoji", c.emoji)); }
  capa.append(el("span", "cm-mini-cat", c.nome), el("span", "cm-mini-selo", selo(a)));
  const tx = el("div", "cm-mini-tx");
  // a._dist: distância já em texto ("3,4 km", "Na sua cidade"), quando quem chama sabe onde a pessoa está.
  tx.append(el("strong", null, a.titulo || c.nome), el("small", null, [a.bairro, a.cidade].filter(Boolean).join(" · ") || "Local não informado"), el("span", "cm-mini-quando", [a._dist, relativo(a.atualizadoEm || a.criadoEm)].filter(Boolean).join(" · ")));
  link.append(capa, tx);
  return link;
}

// Chips de filtro (Tudo + os tipos que têm anúncio); devolve o elemento e chama aoMudar(lista filtrada).
export function filtrosComunidade(lista, aoMudar) {
  css();
  const w = el("div", "cm-mini-filtros"); w.setAttribute("role", "tablist");
  const tipos = Object.keys(CAT_COM).filter((k) => lista.some((a) => a.categoria === k));
  let atual = "";
  const pintar = () => w.querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.k === atual)));
  [["", "Tudo"], ...tipos.map((k) => [k, CAT_COM[k].plural])].forEach(([k, nome]) => {
    const b = el("button", null, nome); b.type = "button"; b.setAttribute("role", "tab"); b.dataset.k = k;
    if (k) b.style.setProperty("--cc", CAT_COM[k].cor);
    b.addEventListener("click", () => { atual = k; pintar(); aoMudar(k ? lista.filter((a) => a.categoria === k) : lista); });
    w.appendChild(b);
  });
  pintar();
  return tipos.length > 1 ? w : el("div");
}

let cssOk = false;
function css() {
  if (cssOk) return; cssOk = true;
  const s = document.createElement("style");
  s.textContent = `
.cm-mini { flex: none; width: 176px; display: grid; gap: 8px; color: var(--text); text-decoration: none; scroll-snap-align: start; }
.cm-mini-capa { position: relative; aspect-ratio: 4 / 3; border-radius: 16px; overflow: hidden; background: center / cover no-repeat var(--panel-2, #162128); border: 1px solid color-mix(in srgb, var(--cc) 35%, var(--line, #22313a)); }
.cm-mini-capa.sem-foto { display: grid; place-items: center; background: radial-gradient(90% 90% at 30% 20%, color-mix(in srgb, var(--cc) 55%, transparent), transparent 70%), linear-gradient(150deg, color-mix(in srgb, var(--cc) 30%, #0b1014), #0b1014); }
.cm-mini-emoji { font-size: 40px; filter: drop-shadow(0 6px 14px rgba(0, 0, 0, .4)); }
.cm-mini-cat { position: absolute; left: 8px; top: 8px; max-width: calc(100% - 16px); padding: 3px 9px; border-radius: 999px; background: var(--cc); color: #fff; font-size: 10.5px; font-weight: 850; letter-spacing: .02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; box-shadow: 0 4px 12px -4px var(--cc); }
.cm-mini-selo { position: absolute; right: 8px; bottom: 8px; padding: 3px 9px; border-radius: 999px; background: rgba(0, 0, 0, .62); color: #fff; font-size: 11px; font-weight: 800; backdrop-filter: blur(6px); }
.cm-mini-tx { display: grid; gap: 1px; padding: 0 2px; }
.cm-mini-tx strong { font-size: 14px; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.cm-mini-tx small { font-size: 12px; color: var(--muted, #8fa0ab); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cm-mini-quando { font-size: 11px; color: var(--muted, #8fa0ab); opacity: .8; }
.cm-mini-filtros { display: flex; gap: 6px; overflow-x: auto; padding: 2px 0 10px; scrollbar-width: none; }
.cm-mini-filtros::-webkit-scrollbar { display: none; }
.cm-mini-filtros button { flex: none; padding: 7px 13px; border-radius: 999px; border: 1px solid var(--line, #22313a); background: var(--panel, #111); color: var(--text); font: inherit; font-size: 12.5px; font-weight: 750; cursor: pointer; }
.cm-mini-filtros button[aria-selected="true"] { border-color: transparent; background: var(--cc, var(--accent, #00adee)); color: #fff; }
.cm-ver-tudo { display: inline-flex; margin-top: 4px; color: var(--accent, #00adee); font-size: 13.5px; font-weight: 800; text-decoration: none; }
.cm-aviso-venda { display: inline-flex; align-items: center; gap: 6px; margin-top: 4px; padding: 3px 10px; border-radius: 999px; background: #ffe08a; color: #3d2800; font-size: 11.5px; font-weight: 750; }`;
  document.head.appendChild(s);
}
