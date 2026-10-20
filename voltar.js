// =====================================================
// "Voltar" do celular/navegador fecha o que está aberto por cima
// Cada janela que abre por cima da página (folha, lista, confirmação, visor do flash,
// editor de foto, perfil do negócio...) vira um passo no histórico. Voltar fecha a de
// cima e a pessoa continua onde estava, em vez de sair da página.
// Fechar pelo X ou pelo botão da tela desfaz o passo (sem a pessoa perceber).
// Ligado no firebase.js (todas as páginas). Telas que já cuidam do próprio histórico
// (painéis e conversa do Mensagens, gaveta do chat, tela de publicações do Explorar) ficam de fora.
// =====================================================
const CAMADAS = [
  ".folha.aberta", ".hfc", ".hf-confirma-fundo", ".hf-den-fundo", ".hf-aval-fundo", ".ad-modal-fundo", ".ad-gaveta-fundo",
  ".story-visor", ".fn-visor", ".flash-criar", ".hfe-fundo", ".esc-lista", ".vt-modal", ".vt-local-fundo", ".foto-grande"
].map((x) => x + ":not([data-sem-voltar])").join(", ");
const pilha = [];
let saindo = false, ligado = false;

// Estado novo sem as marcas da proteção de saída (confirmar.js): voltar até aqui não pergunta "Sair?".
const estado = (n) => { const s = { ...(history.state || {}), hfCamadas: n }; delete s.hfBase; delete s.hfGuarda; return s; };
const nivel = () => history.state?.hfCamadas || 0;

function abriu(c) {
  if (pilha.includes(c)) return;
  pilha.push(c);
  // Um passo que ia ser desfeito (outra janela acabou de fechar) é reaproveitado.
  try { if (nivel() >= pilha.length) history.replaceState(estado(pilha.length), "", location.href); else history.pushState(estado(pilha.length), "", location.href); } catch {}
}
function fechou(c) {
  const i = pilha.indexOf(c);
  if (i < 0) return;
  pilha.splice(i, 1);
  desfazer();
}
// Fechou pela tela: tira o passo que sobrou no histórico. Espera a tarefa atual terminar: se a
// pessoa tocou num link (ou o código mudou de página), não volta.
let tempo = 0;
function desfazer() {
  clearTimeout(tempo);
  tempo = setTimeout(() => { if (!saindo && nivel() > pilha.length) history.go(pilha.length - nivel()); }, 0);
}
// Fecha uma camada como se a pessoa tivesse tocado no X (ou apertado Esc).
function fechar(c) {
  if (c.matches(".folha")) {
    const x = c.querySelector("[data-fechar]");
    if (x) { x.click(); return; }
    c.classList.remove("aberta");
    c.dispatchEvent(new Event("fechada"));
    return;
  }
  const alvo = c.matches(".esc-lista") ? c : (c.querySelector("[tabindex], button, input, textarea") || c);
  alvo.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true }));
}

function conferir() {
  // Camadas que sumiram (removidas ou sem a classe "aberta").
  for (const c of [...pilha]) if (!c.isConnected || !c.matches(CAMADAS)) fechou(c);
  // Camadas novas, na ordem em que aparecem na página.
  document.querySelectorAll(CAMADAS).forEach((c) => { if (!pilha.includes(c) && !pilha.some((p) => p.contains(c))) abriu(c); });
}

// Para a página de fora (Mensagens) fechar a janela de cima desta, se o "voltar" chegar lá primeiro.
function fecharTopo() {
  const c = pilha.pop(); if (!c) return false;
  fechar(c);
  try { history.replaceState(estado(pilha.length), "", location.href); } catch {} // o passo daqui fica igual ao que sobrou aberto
  return true;
}

export function ligarVoltar() {
  // Dentro de outra página do site (ex.: Ajuda e suporte nas Mensagens) também vale: o histórico é o mesmo.
  let deFora = false;
  try { deFora = window.top !== window.self && window.top.location.origin !== location.origin; } catch { deFora = true; }
  // Um só por página, mesmo que duas cópias deste arquivo (versões diferentes) sejam carregadas.
  if (ligado || deFora || window.__hfVoltarLigado) return;
  ligado = true; window.__hfVoltarLigado = true;
  window.__hfFecharTopo = fecharTopo;
  // Chegou (ou recarregou) com passos que não existem mais: começa do zero.
  if (nivel()) { try { history.replaceState(estado(0), "", location.href); } catch {} }
  let agendado = false;
  new MutationObserver(() => { if (agendado) return; agendado = true; queueMicrotask(() => { agendado = false; conferir(); }); })
    .observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  addEventListener("popstate", () => {
    const quer = nivel();
    // Voltou: fecha as de cima até ficar igual ao passo do histórico.
    while (pilha.length > quer) fechar(pilha.pop());
  });
  addEventListener("beforeunload", () => { saindo = true; });
  addEventListener("pagehide", () => { saindo = true; });
  addEventListener("pageshow", () => { saindo = false; });
  conferir();
}
