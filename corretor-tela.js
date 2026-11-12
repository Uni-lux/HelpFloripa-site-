// =====================================================
// Tela "Revisar texto" do corretor (12/11/2026). Mostra o texto como vai ficar (o que saiu riscado, o que entrou
// destacado), as correções agrupadas por tipo com uma chave para cada uma (desligar = manter como a pessoa escreveu) e
// "Aplicar". Nada sai do aparelho. Sem dependências além do corretor.js; CSS próprio (classes .cr-), cores do tema.
//   revisarTexto(texto, { modo, titulo, depois }) → Promise<string | null>   (null = manteve como estava)
//   depois(texto) é aplicado ao resultado final (ex.: formatarTexto do Diário).
// =====================================================
import { corrigirTexto, resumoCorrecoes, diferenca, TIPOS_CORRECAO, carregarLexico, adicionarAoDicionario, aprenderEscolhas } from "./corretor.js?v=5";

const ICONES = {
  varinha: '<path d="M4 20l11-11M13 7l2-2 4 4-2 2"/><path d="M8 3v3M6.5 4.5h3M19 13v3M17.5 14.5h3"/>',
  fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
  acento: '<path d="M7 20l5-12 5 12M9 15h6M11 5l3-2"/>',
  ortografia: '<path d="M4 18l4-12 4 12M5.5 14h5"/><path d="M14 15l2.5 2.5L21 12"/>',
  abreviacao: '<path d="M4 7h10M4 12h7M4 17h10"/><path d="M17 9l3 3-3 3"/>',
  concordancia: '<path d="M7 7h10M7 12h10M7 17h6"/><circle cx="4" cy="7" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="17" r="1"/>',
  pontuacao: '<path d="M8 6v8M8 18v.5M15 15a2 2 0 1 1 0 .1M15 17l-1 3"/>',
  maiuscula: '<path d="M3 19l5-14 5 14M4.8 14h6.4"/><path d="M15 19v-6.5a2.5 2.5 0 0 1 5 0V19M15 15.5h5"/>',
  crase: '<path d="M7 20l5-12 5 12M9 15h6M10 3l3 3"/>',
  repeticao: '<rect x="4" y="4" width="11" height="11" rx="2"/><rect x="9" y="9" width="11" height="11" rx="2"/>',
  cadeado: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  ok: '<path d="M5 12.5l4.5 4.5L19 7.5"/>'
};
const svg = (k, cls = "") => `<svg class="cr-i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONES[k] || ""}</svg>`;

function estilo() {
  if (document.getElementById("cr-estilo")) return;
  const st = document.createElement("style"); st.id = "cr-estilo";
  st.textContent = `
.cr-fundo { position: fixed; inset: 0; z-index: 5600; background: rgba(0, 0, 0, .55); display: flex; align-items: flex-end; justify-content: center; -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px); }
@media (min-width: 700px) { .cr-fundo { align-items: center; } }
.cr-folha { width: min(560px, 100%); max-height: min(88dvh, 760px); display: flex; flex-direction: column; background: var(--panel, #0f161b); color: var(--text, #e8eef2);
  border: 1px solid var(--line, rgba(255,255,255,.08)); border-radius: 22px 22px 0 0; box-shadow: 0 -12px 40px rgba(0,0,0,.4); overflow: hidden; font: 15px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
@media (min-width: 700px) { .cr-folha { border-radius: 22px; } }
.cr-i { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; flex: none; }
.cr-cab { display: flex; align-items: center; gap: 12px; padding: 16px 16px 10px; }
.cr-cab .cr-ic { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: color-mix(in srgb, var(--accent, #00adee) 16%, transparent); color: var(--accent, #00adee); }
.cr-cab h2 { margin: 0; font-size: 17px; }
.cr-cab p { margin: 2px 0 0; font-size: 13px; color: var(--muted, #8fa1ad); }
.cr-cab .cr-x { margin-left: auto; width: 40px; height: 40px; border-radius: 50%; border: 0; background: transparent; color: inherit; display: grid; place-items: center; cursor: pointer; }
.cr-corpo { overflow: auto; padding: 0 16px 8px; overscroll-behavior: contain; }
.cr-prev { white-space: pre-wrap; overflow-wrap: anywhere; padding: 14px; border-radius: 14px; background: var(--panel-2, rgba(255,255,255,.04)); border: 1px solid var(--line, rgba(255,255,255,.08)); max-height: 34dvh; overflow: auto; }
.cr-prev del { color: #ff7b7b; text-decoration: line-through; text-decoration-thickness: 1.5px; opacity: .8; font-size: .92em; }
.cr-prev ins { text-decoration: none; background: color-mix(in srgb, #2fbf71 22%, transparent); color: inherit; border-radius: 4px; box-shadow: inset 0 -2px 0 #2fbf71; padding: 0 1px; }
.cr-modo { display: flex; gap: 6px; margin: 12px 0 4px; }
.cr-modo button { flex: 1; min-height: 36px; border-radius: 10px; border: 1px solid var(--line, rgba(255,255,255,.1)); background: transparent; color: var(--muted, #8fa1ad); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
.cr-modo button.on { color: var(--text, #fff); background: var(--panel-2, rgba(255,255,255,.06)); border-color: color-mix(in srgb, var(--accent, #00adee) 50%, transparent); }
.cr-grupo { margin-top: 14px; }
.cr-grupo h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 6px; font-size: 12px; letter-spacing: .04em; text-transform: uppercase; color: var(--muted, #8fa1ad); }
.cr-grupo h3 .cr-i { width: 16px; height: 16px; }
.cr-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; background: var(--panel-2, rgba(255,255,255,.04)); margin-bottom: 6px; cursor: pointer; user-select: none; }
.cr-item .cr-txt { flex: 1; min-width: 0; }
.cr-item .cr-par { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px; }
.cr-item .cr-de { color: #ff8a8a; text-decoration: line-through; overflow-wrap: anywhere; }
.cr-item .cr-para { color: #43d48a; font-weight: 600; overflow-wrap: anywhere; }
.cr-item .cr-seta { color: var(--muted, #8fa1ad); }
.cr-item small { display: block; color: var(--muted, #8fa1ad); font-size: 12px; margin-top: 1px; }
.cr-item .cr-n { color: var(--muted, #8fa1ad); font-size: 12px; }
.cr-item.off .cr-de { color: var(--text, #fff); text-decoration: none; }
.cr-item.off .cr-para { color: var(--muted, #8fa1ad); text-decoration: line-through; font-weight: 400; }
.cr-chave { width: 42px; height: 24px; border-radius: 12px; background: var(--line, rgba(255,255,255,.18)); position: relative; flex: none; transition: background .15s; }
.cr-chave::after { content: ""; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: transform .15s; }
.cr-item:not(.off) .cr-chave { background: var(--accent, #00adee); }
.cr-item:not(.off) .cr-chave::after { transform: translateX(18px); }
.cr-nota { display: flex; gap: 8px; align-items: flex-start; font-size: 12px; color: var(--muted, #8fa1ad); margin: 14px 2px 4px; }
.cr-nota .cr-i { width: 15px; height: 15px; margin-top: 1px; }
.cr-pe { display: flex; gap: 10px; padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); border-top: 1px solid var(--line, rgba(255,255,255,.08)); }
.cr-pe button { flex: 1; min-height: 46px; border-radius: 14px; font: inherit; font-weight: 700; cursor: pointer; }
.cr-pe .cr-sec { background: transparent; color: var(--text, #fff); border: 1px solid var(--line, rgba(255,255,255,.14)); }
.cr-pe .cr-pri { background: var(--accent, #00adee); color: #fff; border: 0; display: flex; align-items: center; justify-content: center; gap: 8px; }
.cr-ajuda { margin: -2px 0 8px; font-size: 12px; color: var(--muted, #8fa1ad); }
.cr-etq { font-size: 10.5px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; padding: 2px 7px; border-radius: 999px; background: color-mix(in srgb, #f5b301 18%, transparent); color: #f5b301; }
.cr-item.sug.off .cr-de { color: var(--text, #fff); }
.cr-desc { display: flex; flex-wrap: wrap; gap: 8px; }
.cr-add { display: inline-flex; align-items: center; gap: 8px; min-height: 36px; padding: 0 12px; border-radius: 999px; border: 1px dashed color-mix(in srgb, #ff7b7b 60%, transparent); background: transparent; color: var(--text, #fff); font: inherit; font-size: 13px; cursor: pointer; }
.cr-add b { text-decoration: underline wavy #ff7b7b; text-underline-offset: 3px; font-weight: 600; }
.cr-add span { color: var(--muted, #8fa1ad); font-size: 12px; }
.cr-roda { display: inline-block; width: 30px; height: 30px; border-radius: 50%; border: 3px solid color-mix(in srgb, var(--accent, #00adee) 25%, transparent); border-top-color: var(--accent, #00adee); animation: cr-gira .8s linear infinite; }
@keyframes cr-gira { to { transform: rotate(360deg); } }
.cr-vazio { text-align: center; padding: 26px 10px 8px; color: var(--muted, #8fa1ad); }
.cr-vazio .cr-i { width: 40px; height: 40px; color: #43d48a; }
:root[data-theme="light"] .cr-prev del, :root[data-theme="light"] .cr-item .cr-de { color: #d33; }
:root[data-theme="light"] .cr-item .cr-para { color: #138a4a; }
`;
  document.head.appendChild(st);
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const ORDEM = ["ortografia", "acento", "concordancia", "crase", "abreviacao", "pontuacao", "maiuscula", "repeticao"];

export function revisarTexto(texto, { modo = "pub", titulo = "Revisar texto", depois = (t) => t } = {}) {
  estilo();
  return new Promise((resolver) => {
    const pular = new Set(), aceitar = new Set();
    let abreviacoes = true, base = null;
    const fundo = document.createElement("div"); fundo.className = "cr-fundo"; fundo.setAttribute("data-sem-deslizar", ""); fundo.setAttribute("data-sem-puxar", "");
    const folha = document.createElement("div"); folha.className = "cr-folha"; folha.setAttribute("role", "dialog"); folha.setAttribute("aria-modal", "true"); folha.setAttribute("aria-label", titulo);
    fundo.appendChild(folha);
    const fim = (valor) => { fundo.remove(); removeEventListener("keydown", tecla, true); resolver(valor); };
    const tecla = (e) => { if (e.key === "Escape") { e.stopPropagation(); fim(null); } };
    addEventListener("keydown", tecla, true);
    fundo.addEventListener("click", (e) => { if (e.target === fundo) fim(null); });
    const cab = (sub) => `<div class="cr-cab"><span class="cr-ic">${svg("varinha")}</span><div><h2>${esc(titulo)}</h2><p>${sub}</p></div><button type="button" class="cr-x" data-fechar aria-label="Fechar">${svg("fechar")}</button></div>`;
    // a correção está valendo? (sugestão = desligada até a pessoa ligar)
    const ligada = (m) => (m.conf === "media" ? aceitar.has(m.chave) : !pular.has(m.chave)) && (abreviacoes || m.tipo !== "abreviacao");

    const pintar = () => {
      base = corrigirTexto(texto, { modo });
      const atual = corrigirTexto(texto, { modo, pular, aceitar, abreviacoes });
      const final = depois(atual.texto);
      const n = base.mudancas.filter(ligada).reduce((a, m) => a + m.n, 0);
      const sug = base.mudancas.filter((m) => m.conf === "media").length;
      const desc = base.desconhecidas || [];
      if (!base.mudancas.length && !desc.length) {
        folha.innerHTML = `${cab("Corretor do Help Floripa")}
          <div class="cr-corpo"><div class="cr-vazio">${svg("ok")}<p><b>Nenhum erro encontrado.</b><br>${final !== texto ? "Só organizamos espaços e pontuação." : "O texto já está certinho."}</p></div></div>
          <div class="cr-pe"><button type="button" class="cr-pri" data-ok>${svg("ok")}${final !== texto ? "Organizar" : "Fechar"}</button></div>`;
      } else {
        const partes = diferenca(texto, final).map((p) => p.tipo === "igual" ? esc(p.t) : p.tipo === "saiu" ? (p.t.trim() ? `<del>${esc(p.t)}</del>` : "") : `<ins>${esc(p.t)}</ins>`).join("");
        const temAbrev = base.mudancas.some((m) => m.tipo === "abreviacao");
        const item = (m) => {
          const off = !ligada(m);
          return `<div class="cr-item${off ? " off" : ""}${m.conf === "media" ? " sug" : ""}" role="switch" tabindex="0" aria-checked="${!off}" data-chave="${esc(m.chave)}"><div class="cr-txt"><div class="cr-par"><span class="cr-de">${esc(m.de.trim() || "␣")}</span><span class="cr-seta">→</span><span class="cr-para">${esc(m.para.trim())}</span>${m.n > 1 ? `<span class="cr-n">${m.n}×</span>` : ""}${m.conf === "media" ? `<span class="cr-etq">Sugestão</span>` : ""}</div><small>${esc(m.motivo)}</small></div><span class="cr-chave" aria-hidden="true"></span></div>`;
        };
        const certas = base.mudancas.filter((m) => m.conf !== "media"), sugeridas = base.mudancas.filter((m) => m.conf === "media");
        const grupos = ORDEM.map((tipo) => {
          const itens = certas.filter((m) => m.tipo === tipo);
          return itens.length ? `<div class="cr-grupo"><h3>${svg(tipo)}${TIPOS_CORRECAO[tipo]}</h3>${itens.map(item).join("")}</div>` : "";
        }).join("")
          + (sugeridas.length ? `<div class="cr-grupo"><h3>${svg("varinha")}Sugestões para conferir</h3><p class="cr-ajuda">Podem estar certas do jeito que você escreveu. Toque para aplicar.</p>${sugeridas.map(item).join("")}</div>` : "")
          + (desc.length ? `<div class="cr-grupo"><h3>${svg("ortografia")}Não encontradas no dicionário</h3><p class="cr-ajuda">Confira a escrita. Se estiver certa (um nome, uma gíria, uma marca), adicione ao seu dicionário.</p><div class="cr-desc">${desc.map((w) => `<button type="button" class="cr-add" data-add="${esc(w)}"><b>${esc(w)}</b><span>+ dicionário</span></button>`).join("")}</div></div>` : "");
        const sub = [n ? `${n} ${n > 1 ? "correções" : "correção"}` : "Nenhuma correção escolhida", sug ? `${sug} ${sug > 1 ? "sugestões" : "sugestão"}` : "", desc.length ? `${desc.length} não ${desc.length > 1 ? "encontradas" : "encontrada"}` : ""].filter(Boolean).join(" · ");
        folha.innerHTML = `${cab(esc(sub))}
          <div class="cr-corpo"><div class="cr-prev" aria-label="Como vai ficar">${partes}</div>
          ${temAbrev && modo === "chat" ? `<div class="cr-modo" role="group" aria-label="Estilo"><button type="button" data-abrev="1" class="${abreviacoes ? "on" : ""}">Escrever por inteiro</button><button type="button" data-abrev="0" class="${abreviacoes ? "" : "on"}">Manter abreviações</button></div>` : ""}
          ${grupos}
          <p class="cr-nota">${svg("cadeado")}<span>${base.dicionario ? "Corretor com dicionário de português (mais de 200 mil palavras), acentos, digitação, concordância, crase e pontuação." : "Corretor sem o dicionário completo (sem internet agora)."} Funciona no seu aparelho: o texto não é enviado. Toque numa correção para manter como você escreveu e confira antes de ${modo === "chat" ? "enviar" : "publicar"}.</span></p></div>
          <div class="cr-pe"><button type="button" class="cr-sec" data-fechar>Manter como estava</button><button type="button" class="cr-pri" data-ok>${svg("ok")}${n ? `Aplicar ${n}` : "Usar assim"}</button></div>`;
      }
      folha.querySelectorAll("[data-fechar]").forEach((b) => b.addEventListener("click", () => fim(null)));
      folha.querySelector("[data-ok]").addEventListener("click", () => {
        // o corretor aprende com a escolha (o que a pessoa ligou e desligou), menos as abreviações quando ela escolheu mantê-las
        try { aprenderEscolhas(base.mudancas.filter((m) => abreviacoes || m.tipo !== "abreviacao").map((m) => [m.chave, ligada(m)])); } catch {}
        fim(final);
      });
      const repintar = () => { const rol = folha.querySelector(".cr-corpo")?.scrollTop || 0; pintar(); const c = folha.querySelector(".cr-corpo"); if (c) c.scrollTop = rol; };
      folha.querySelectorAll(".cr-item").forEach((it) => {
        const trocar = () => {
          const k = it.dataset.chave;
          const m = base.mudancas.find((x) => x.chave === k);
          if (m?.tipo === "abreviacao" && !abreviacoes) { abreviacoes = true; base.mudancas.filter((x) => x.tipo === "abreviacao").forEach((x) => pular.add(x.chave)); pular.delete(k); }
          else if (m?.conf === "media") { if (aceitar.has(k)) aceitar.delete(k); else aceitar.add(k); }
          else if (pular.has(k)) pular.delete(k); else pular.add(k);
          repintar();
        };
        it.addEventListener("click", trocar);
        it.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); trocar(); } });
      });
      folha.querySelectorAll("[data-add]").forEach((b) => b.addEventListener("click", () => { adicionarAoDicionario(b.dataset.add); repintar(); }));
      folha.querySelectorAll("[data-abrev]").forEach((b) => b.addEventListener("click", () => { abreviacoes = b.dataset.abrev === "1"; pintar(); }));
    };
    // Mostra a folha na hora e carrega o dicionário (fica guardado no aparelho depois da 1ª vez)
    folha.innerHTML = `${cab("Conferindo o texto...")}<div class="cr-corpo"><div class="cr-vazio"><span class="cr-roda" aria-hidden="true"></span><p>Carregando o dicionário de português...</p></div></div>`;
    document.body.appendChild(fundo);
    Promise.race([carregarLexico(), new Promise((r) => setTimeout(r, 8000))]).finally(() => {
      if (!fundo.isConnected) return;
      pintar();
      folha.querySelector("[data-ok]")?.focus({ preventScroll: true });
    });
  });
}

// Correções do texto sem abrir a tela (para mostrar "3 correções" no campo do chat).
export function contarCorrecoes(texto, modo = "chat") {
  if (!String(texto || "").trim()) return 0;
  const r = corrigirTexto(texto, { modo });
  return r.total + r.sugestoes + r.desconhecidas.length;
}
