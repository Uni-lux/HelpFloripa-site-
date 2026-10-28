// =====================================================
// Janela de confirmação do Help Floripa (o mesmo visual em todo o site)
// - confirmarHF({ titulo, texto, ok, cancelar, icone }) -> Promise<boolean>
// - sairDaConta(): "Sair da conta?" igual nos três lugares (menu, configurações e mensagens)
// - guardarSaida(): o botão "voltar" que tiraria a pessoa do site pergunta antes
//   ("Sair do Help Floripa?"). Só vale para quem entrou de fora; voltar entre páginas do
//   próprio site continua normal.
// =====================================================
const ICONES = {
  sair: '<path d="M10 4.5H6.5A1.5 1.5 0 005 6v12a1.5 1.5 0 001.5 1.5H10"/><path d="M14 8l-4 4 4 4M10 12h10"/>',
  porta: '<path d="M14 4.5h3.5A1.5 1.5 0 0119 6v12a1.5 1.5 0 01-1.5 1.5H14"/><path d="M10 8l4 4-4 4M14 12H4"/>',
  lixo: '<path d="M4.5 7h15M9.5 7V5a1 1 0 011-1h3a1 1 0 011 1v2M6.5 7l.8 12a1.5 1.5 0 001.5 1.4h6.4a1.5 1.5 0 001.5-1.4l.8-12M10 11v6M14 11v6"/>',
  bloquear: '<circle cx="12" cy="12" r="8"/><path d="M6.5 6.5l11 11"/>',
  pessoa: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.6-3.6 3.4-5.5 7-5.5s6.4 1.9 7 5.5"/>',
  alerta: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.2v.1"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.1"/>',
  check: '<circle cx="12" cy="12" r="8.5"/><path d="M8.3 12.2l2.6 2.6 5-5.3"/>',
  carrinho: '<path d="M3.5 4.5h2l2.1 10.2a1.5 1.5 0 001.5 1.2h7.6a1.5 1.5 0 001.5-1.1L20 8H6.4"/><circle cx="9.5" cy="19.5" r="1.2"/><circle cx="17" cy="19.5" r="1.2"/>',
  recarregar: '<path d="M19.5 12a7.5 7.5 0 11-2.2-5.3"/><path d="M19.5 4.5v4h-4"/>',
  escudo: '<path d="M12 3.5l7 3v5.2c0 4.2-2.9 7.6-7 8.8-4.1-1.2-7-4.6-7-8.8V6.5z"/><path d="M9 12l2 2 4-4"/>',
  olhoOff: '<path d="M3 3l18 18"/><path d="M10.6 6.1A9.7 9.7 0 0112 6c5 0 8.5 4.2 9.5 6-.5.9-1.6 2.5-3.2 3.8M6.4 7.6C4.6 8.9 3.2 10.8 2.5 12c1 1.8 4.5 6 9.5 6 1.5 0 2.9-.4 4.1-1"/><path d="M9.9 9.9a3 3 0 004.2 4.2"/>',
  selo: '<path d="M12 3l2.4 1.8 3 .2.9 2.9 2.2 2-1 2.9 1 2.9-2.2 2-.9 2.9-3 .2L12 21l-2.4-1.8-3-.2-.9-2.9-2.2-2 1-2.9-1-2.9 2.2-2 .9-2.9 3-.2z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>'
};

let cssPronto = false;
function css() {
  if (cssPronto || document.getElementById("hfConfirmaCss")) { cssPronto = true; return; }
  cssPronto = true;
  const st = document.createElement("style"); st.id = "hfConfirmaCss";
  st.textContent = `
  .hf-confirma-fundo { position: fixed; inset: 0; z-index: 9900; display: grid; place-items: center; padding: 18px; background: rgba(2,6,9,.62); -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px); animation: hfConfFundo .18s ease-out; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
  .hf-confirma { width: min(380px, 100%); background: var(--panel, #10181d); color: var(--text, #e9eef1); border: 1px solid var(--line, #22313a); border-radius: 20px; padding: 24px 20px 18px; text-align: center; box-shadow: 0 24px 70px rgba(0,0,0,.45); animation: hfConfCaixa .2s cubic-bezier(.2,.8,.2,1); }
  :root[data-theme="light"] .hf-confirma { background: var(--panel, #fff); color: var(--text, #0f1b22); border-color: var(--line, #e2e8ec); }
  .hf-confirma-ic { width: 54px; height: 54px; margin: 0 auto 12px; border-radius: 50%; display: grid; place-items: center; color: #e5484d; background: color-mix(in srgb, #e5484d 14%, transparent); }
  .hf-confirma-ic svg { width: 24px; height: 24px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .hf-confirma h3 { margin: 0 0 6px; font-size: 18px; color: inherit; }
  .hf-confirma p { margin: 0 0 18px; color: var(--muted, #8b9ba6); font-size: 14px; line-height: 1.5; }
  .hf-confirma-acoes { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .hf-confirma-acoes button { min-height: 46px; border-radius: 12px; font: inherit; font-size: 15px; font-weight: 750; cursor: pointer; }
  .hf-confirma-acoes .nao { border: 1px solid var(--line, #22313a); background: transparent; color: inherit; }
  .hf-confirma-acoes .sim { border: 0; background: #e5484d; color: #fff; }
  .hf-confirma-acoes .sim:disabled { opacity: .7; cursor: default; }
  .hf-confirma.normal .hf-confirma-ic { color: var(--accent, #00adee); background: color-mix(in srgb, var(--accent, #00adee) 14%, transparent); }
  .hf-confirma.normal .sim { background: var(--accent, #00adee); color: var(--accent-ink, #001a24); }
  .hf-confirma-acoes.um { grid-template-columns: 1fr; }
  .hf-confirma p { white-space: pre-line; }
  .hf-confirma-acoes button:focus-visible { outline: 2px solid var(--accent, #00adee); outline-offset: 2px; }
  @keyframes hfConfFundo { from { opacity: 0; } }
  @keyframes hfConfCaixa { from { opacity: 0; transform: translateY(10px) scale(.97); } }
  .hf-confirma-troca { display: grid; gap: 6px; margin: 0 0 18px; text-align: left; }
  .hf-confirma-troca div { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--line, #22313a); background: var(--panel-2, #162128); }
  .hf-confirma-troca small { flex: none; width: 52px; font-size: 11px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; color: var(--muted, #8b9ba6); }
  .hf-confirma-troca b { min-width: 0; font-size: 14px; line-height: 1.3; overflow-wrap: anywhere; }
  .hf-confirma-troca .de b { color: var(--muted, #8b9ba6); text-decoration: line-through; }
  .hf-confirma-troca .para { border-color: color-mix(in srgb, var(--accent, #00adee) 55%, transparent); background: color-mix(in srgb, var(--accent, #00adee) 10%, var(--panel-2, #162128)); }
  .hf-confirma-troca i { justify-self: center; font-style: normal; font-size: 16px; line-height: 1; color: var(--muted, #8b9ba6); }
  :root[data-theme="light"] .hf-confirma-troca div { background: #f4f7f9; border-color: #e2e8ec; }
  .hf-confirma-acoes.empilhar { grid-template-columns: 1fr; }
  .hf-confirma-acoes.empilhar .sim { order: -1; }
  @media (prefers-reduced-motion: reduce) { .hf-confirma-fundo, .hf-confirma { animation: none; } }`;
  document.head.appendChild(st);
}

// Abre a janela. aoConfirmar (opcional) roda com o botão em "aguarde"; se der erro, a janela continua.
// cor: "perigo" (vermelho, padrão) ou "normal" (azul do site), para o que não apaga nada.
// soOk: um botão só (aviso no lugar do alert() do navegador; use avisoHF).
// troca: { de, para, rotDe?, rotPara? } mostra o que sai e o que entra (riscado → destacado) e empilha os botões.
export function confirmarHF({ titulo, texto = "", ok = "Confirmar", cancelar = "Cancelar", icone = "sair", aoConfirmar = null, textoAguarde = "Aguarde...", cor = "perigo", soOk = false, semVoltar = false, troca = null } = {}) {
  css();
  return new Promise((resolver) => {
    const anterior = document.activeElement;
    const fundo = document.createElement("div"); fundo.className = "hf-confirma-fundo";
    if (semVoltar) fundo.dataset.semVoltar = ""; // a pergunta "Sair?" do voltar não vira um passo do histórico (voltar.js)
    fundo.setAttribute("role", "alertdialog"); fundo.setAttribute("aria-modal", "true");
    const cx = document.createElement("div"); cx.className = "hf-confirma" + (cor === "normal" ? " normal" : "");
    const ic = document.createElement("div"); ic.className = "hf-confirma-ic";
    ic.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONES[icone] || ICONES.sair}</svg>`;
    const h = document.createElement("h3"); h.textContent = titulo; h.id = "hfConfTit" + Date.now();
    const p = document.createElement("p"); p.textContent = texto;
    fundo.setAttribute("aria-labelledby", h.id);
    const ac = document.createElement("div"); ac.className = "hf-confirma-acoes";
    const nao = document.createElement("button"); nao.type = "button"; nao.className = "nao"; nao.textContent = cancelar;
    const sim = document.createElement("button"); sim.type = "button"; sim.className = "sim"; sim.textContent = ok;
    if (soOk) { ac.classList.add("um"); ac.append(sim); } else ac.append(nao, sim);
    cx.append(ic, h); if (texto) cx.appendChild(p);
    if (troca) {
      const t = document.createElement("div"); t.className = "hf-confirma-troca";
      const linha = (cls, rot, val) => { const d = document.createElement("div"); d.className = cls; const s = document.createElement("small"); s.textContent = rot; const b = document.createElement("b"); b.textContent = val; d.append(s, b); return d; };
      const seta = document.createElement("i"); seta.setAttribute("aria-hidden", "true"); seta.textContent = "↓";
      t.append(linha("de", troca.rotDe || "Sai", troca.de), seta, linha("para", troca.rotPara || "Entra", troca.para));
      cx.appendChild(t); ac.classList.add("empilhar");
    }
    cx.appendChild(ac);
    fundo.appendChild(cx); document.body.appendChild(fundo);
    const fechar = (v) => { fundo.remove(); document.removeEventListener("keydown", tecla, true); try { anterior?.focus?.({ preventScroll: true }); } catch {} resolver(v); };
    const tecla = (e) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); fechar(false); }
      if (e.key === "Tab") { // foco preso dentro da janela
        if (soOk) { e.preventDefault(); sim.focus(); }
        else if (e.shiftKey && document.activeElement === nao) { e.preventDefault(); sim.focus(); }
        else if (!e.shiftKey && document.activeElement === sim) { e.preventDefault(); nao.focus(); }
      }
    };
    document.addEventListener("keydown", tecla, true);
    nao.addEventListener("click", () => fechar(false));
    fundo.addEventListener("click", (e) => { if (e.target === fundo) fechar(false); });
    sim.addEventListener("click", async () => {
      if (!aoConfirmar) { fechar(true); return; }
      sim.disabled = true; nao.disabled = true; sim.textContent = textoAguarde;
      try { await aoConfirmar(); fechar(true); }
      catch (e) { console.error(e); sim.disabled = false; nao.disabled = false; sim.textContent = ok; }
    });
    setTimeout(() => (soOk ? sim : nao).focus(), 30);
  });
}

// Aviso com um botão só, no lugar do alert() do navegador ("helpfloripa.com.br diz").
export function avisoHF({ titulo, texto = "", ok = "Entendi", icone = "info", cor = "normal" } = {}) {
  return confirmarHF({ titulo, texto, ok, icone, cor, soOk: true });
}

// "Sair da conta?" — o mesmo nos três lugares do site.
export async function sairDaConta({ destino = "login.html", antes = null } = {}) {
  return confirmarHF({
    titulo: "Sair da conta?", texto: "Você vai precisar entrar de novo com seu e-mail e senha. Suas conversas continuam salvas.",
    ok: "Sair", icone: "sair", textoAguarde: "Saindo...",
    aoConfirmar: async () => {
      try { antes?.(); } catch {}
      const { signOut } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
      await signOut(window.firebaseAuth);
      location.href = destino;
    }
  });
}

// ---------- "voltar" que sairia do site ----------
// Marca a página de entrada (hfBase) e põe uma entrada de proteção (hfGuarda) por cima, na primeira
// interação (o Chrome ignora entradas criadas sem toque). Voltar até a entrada marcada abre a janela:
// "Ficar" põe a proteção de volta; "Sair" volta de verdade (e, sem página anterior, um novo "voltar" sai).
let guardaLigada = false;
export function guardarSaida() {
  if (guardaLigada || window.top !== window.self) return;
  let deFora = true;
  try { deFora = !document.referrer || new URL(document.referrer).origin !== location.origin; } catch {}
  const jaProtegida = !!history.state?.hfGuarda;
  if (!deFora && !jaProtegida && !history.state?.hfBase) return;
  guardaLigada = true;
  const painel = /(^|\/)admin\.html$/.test(location.pathname);
  let saindo = false, aberta = false;
  const armar = () => {
    if (history.state?.hfGuarda) return;
    history.replaceState({ ...(history.state || {}), hfBase: true }, "", location.href);
    history.pushState({ hfGuarda: true }, "", location.href);
  };
  // Com uma janela aberta por cima (voltar.js), espera ela fechar para marcar a página.
  const primeiraInteracao = () => { if (history.state?.hfCamadas) return; removeEventListener("pointerdown", primeiraInteracao, true); removeEventListener("keydown", primeiraInteracao, true); armar(); };
  if (!jaProtegida) { addEventListener("pointerdown", primeiraInteracao, true); addEventListener("keydown", primeiraInteracao, true); }
  addEventListener("popstate", async (e) => {
    if (saindo || aberta || !e.state?.hfBase) return;
    aberta = true;
    const sair = await confirmarHF({
      titulo: painel ? "Sair do painel?" : "Sair do Help Floripa?",
      texto: painel ? "Você vai sair do painel da equipe. Quer mesmo sair?" : "Você vai sair do site. Quer mesmo sair?",
      ok: "Sair", cancelar: "Ficar", icone: "porta", semVoltar: true
    });
    aberta = false;
    if (!sair) { history.pushState({ hfGuarda: true }, "", location.href); return; }
    saindo = true;
    history.back();
    // Sem página anterior (aberto direto): fecha a aba se o navegador deixar; senão o próximo "voltar" sai.
    setTimeout(() => { try { window.close(); } catch {} }, 400);
  });
}
