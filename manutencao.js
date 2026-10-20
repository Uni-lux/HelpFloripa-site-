// =====================================================
// Aviso de manutenção (temporário), em todas as páginas que carregam o firebase.js.
// Para LIGAR ou DESLIGAR: mude ATIVO abaixo (true/false) e aumente o ?v= do manutencao.js
// no firebase.js (senão o celular pode seguir com a versão antiga em cache). Texto novo
// aparece de novo para quem já tinha fechado o anterior.
// Não bloqueia nada: é só um cartão embaixo da tela com X para fechar. Fechado, só volta
// numa nova visita (sessão do navegador).
// =====================================================
const ATIVO = true;
const TITULO = "Estamos em manutenção";
const TEXTO = "Estamos fazendo melhorias na plataforma. Algumas funções podem ficar lentas ou fora do ar por alguns instantes. Obrigado pela paciência!";
const PREVISAO = ""; // ex.: "Previsão de volta: hoje, às 18h" (vazio = não mostra)

const CSS = `
.hfman { --c: #ec835a; position: fixed; z-index: 9700; left: 50%; bottom: calc(14px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%);
  width: min(520px, calc(100% - 32px)); display: flex; gap: 12px; align-items: flex-start; padding: 14px 12px 14px 14px; border-radius: 20px;
  background: radial-gradient(120% 160% at 0% 0%, color-mix(in srgb, var(--c) 22%, transparent), transparent 62%), var(--panel, #0f161b);
  border: 1px solid color-mix(in srgb, var(--c) 40%, var(--line, #213038)); color: var(--text, #eaf0f3); box-shadow: 0 18px 50px rgba(0,0,0,.4);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; animation: hfmanEntra .4s cubic-bezier(.2,.8,.2,1); box-sizing: border-box; }
:root[data-theme="light"] .hfman { background: radial-gradient(120% 160% at 0% 0%, color-mix(in srgb, var(--c) 15%, transparent), transparent 62%), var(--panel, #fff);
  color: var(--text, #0f1b22); border-color: color-mix(in srgb, var(--c) 35%, var(--line, #e2e8ec)); box-shadow: 0 18px 50px rgba(15,27,34,.18); }
.hfman.saindo { animation: hfmanSai .25s ease-in forwards; }
@keyframes hfmanEntra { from { opacity: 0; transform: translate(-50%, 16px); } }
@keyframes hfmanSai { to { opacity: 0; transform: translate(-50%, 16px); } }
.hfman-ic { flex: none; width: 42px; height: 42px; border-radius: 14px; display: grid; place-items: center; color: #fff;
  background: linear-gradient(135deg, color-mix(in srgb, var(--c) 72%, #fff 28%), var(--c)); box-shadow: 0 6px 16px color-mix(in srgb, var(--c) 42%, transparent); }
.hfman-ic svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.hfman-tx { flex: 1; min-width: 0; display: grid; gap: 3px; }
.hfman-tag { justify-self: start; display: inline-flex; align-items: center; gap: 6px; padding: 1px 9px; border-radius: 999px; font-size: 11px; font-weight: 800;
  letter-spacing: .04em; text-transform: uppercase; color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); }
.hfman-tag i { width: 6px; height: 6px; border-radius: 50%; background: var(--c); animation: hfmanPisca 1.6s ease-in-out infinite; }
@keyframes hfmanPisca { 50% { opacity: .25; } }
.hfman strong { font-size: 15px; line-height: 1.3; }
.hfman p { margin: 0; font-size: 13.5px; line-height: 1.45; color: color-mix(in srgb, currentColor 80%, transparent); overflow-wrap: anywhere; }
.hfman-prev { display: flex; align-items: center; gap: 6px; margin-top: 3px; font-size: 12.5px; font-weight: 750; color: var(--c); }
.hfman-prev svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.hfman-x { flex: none; width: 32px; height: 32px; margin: -4px -2px 0 0; display: grid; place-items: center; border: 0; border-radius: 50%; background: none;
  color: var(--muted, #8c9ca7); cursor: pointer; }
.hfman-x:hover { background: color-mix(in srgb, var(--muted, #8c9ca7) 15%, transparent); color: inherit; }
.hfman-x svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; }
@media (prefers-reduced-motion: reduce) { .hfman, .hfman.saindo, .hfman-tag i { animation: none; } }`;

const ICONE_CHAVE = '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L4 16.8V20h3.2l5.3-5.3a4 4 0 0 0 5.2-5.4l-2.5 2.5-2.6-.6-.6-2.6z"/>';
const ICONE_RELOGIO = '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>';
const X = '<path d="M6 6l12 12M18 6L6 18"/>';
const svg = (p) => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;

export function avisoManutencao() {
  // Dentro da gaveta de mensagens (iframe) a página de fora já mostra o aviso.
  if (!ATIVO || window.top !== window.self) return;
  // A chave muda junto com o texto: aviso novo aparece de novo para quem fechou o anterior.
  let n = 0; for (const c of TITULO + TEXTO + PREVISAO) n = (n * 31 + c.charCodeAt(0)) | 0;
  const chave = "hf-manutencao-" + (n >>> 0).toString(36);
  try { if (sessionStorage.getItem(chave) === "fechado") return; } catch {}
  const mostrar = () => {
    if (document.querySelector(".hfman")) return;
    const st = document.createElement("style"); st.textContent = CSS; document.head.append(st);
    const el = document.createElement("div");
    el.className = "hfman"; el.setAttribute("role", "status");
    el.innerHTML = `<div class="hfman-ic">${svg(ICONE_CHAVE)}</div>
      <div class="hfman-tx"><span class="hfman-tag"><i></i>Manutenção</span><strong></strong><p></p>
      ${PREVISAO ? `<span class="hfman-prev">${svg(ICONE_RELOGIO)}<span></span></span>` : ""}</div>
      <button type="button" class="hfman-x" aria-label="Fechar aviso">${svg(X)}</button>`;
    el.querySelector("strong").textContent = TITULO;
    el.querySelector("p").textContent = TEXTO;
    if (PREVISAO) el.querySelector(".hfman-prev span").textContent = PREVISAO;
    el.querySelector(".hfman-x").addEventListener("click", () => {
      try { sessionStorage.setItem(chave, "fechado"); } catch {}
      el.classList.add("saindo");
      setTimeout(() => el.remove(), 260);
    });
    document.body.append(el);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mostrar); else mostrar();
}
