// =====================================================
// Entrar e cadastros: utilidades comuns
// - destinoSeguro(): para onde ir depois de entrar (só páginas do site).
// - Mostrar/ocultar senha em todo campo .senha.
// - Mensagens de erro do Firebase em português.
// =====================================================
export const $ = (id) => document.getElementById(id);

// Só páginas locais conhecidas (evita "open redirect" para sites externos).
const PAGINAS = ["index.html", "servicos.html", "delivery.html", "shopping.html", "imoveis.html", "usuarios.html", "feed.html",
  "notificacoes.html", "configuracoes.html", "negocios.html", "mensagens.html", "social.html", "reclamacoes.html", "conta.html", "suporte.html"];
export function destinoSeguro(padrao = "index.html") {
  const pedido = new URLSearchParams(location.search).get("redirect") || new URLSearchParams(location.search).get("continuar");
  if (!pedido) return padrao;
  const m = /^([a-z_-]+\.html)(\?[\w=&%.@-]*)?$/i.exec(pedido);
  return m && PAGINAS.includes(m[1].toLowerCase()) ? pedido : padrao;
}

export function mensagemErro(codigo) {
  return {
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/wrong-password": "E-mail ou senha incorretos.",
    "auth/user-not-found": "E-mail ou senha incorretos.",
    "auth/invalid-email": "Digite um e-mail válido.",
    "auth/too-many-requests": "Muitas tentativas. Espere alguns minutos e tente de novo.",
    "auth/network-request-failed": "Sem conexão com a internet. Verifique e tente de novo.",
    "auth/email-already-in-use": "Este e-mail já tem uma conta. Entre ou use outro e-mail.",
    "auth/weak-password": "Senha fraca. Use pelo menos 6 caracteres.",
    "auth/user-disabled": "Esta conta foi desativada. Fale com o suporte.",
    "auth/operation-not-allowed": "Esse tipo de login não está ativo. Fale com o suporte."
  }[codigo] || "Não foi possível concluir agora. Tente de novo.";
}

export function aviso(alvo, texto, tipo = "info") {
  const el = typeof alvo === "string" ? $(alvo) : alvo;
  if (!el) return;
  el.hidden = !texto;
  el.className = "aviso " + tipo;
  el.textContent = texto || "";
}

const OLHO = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const OLHO_X = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 5.6c.5-.1.9-.1 1.4-.1 6.5 0 10 6.5 10 6.5s-.9 1.7-2.7 3.4M6.6 6.6C4 8.2 2 12 2 12s3.5 6.5 10 6.5c1.6 0 3-.4 4.2-1M9.9 10.1a3 3 0 004.2 4.2"/></svg>';
document.querySelectorAll(".senha").forEach((box) => {
  const input = box.querySelector("input");
  const b = document.createElement("button");
  b.type = "button"; b.className = "olho"; b.setAttribute("aria-label", "Mostrar senha"); b.setAttribute("aria-pressed", "false");
  b.innerHTML = OLHO;
  b.addEventListener("click", () => {
    const mostrar = input.type === "password";
    input.type = mostrar ? "text" : "password";
    b.innerHTML = mostrar ? OLHO_X : OLHO;
    b.setAttribute("aria-pressed", String(mostrar));
    b.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
  });
  box.appendChild(b);
});

// Espera o firebase.js preparar a conexão.
export async function firebasePronto() {
  for (let i = 0; i < 100 && (!window.firebaseAuth || !window.firebaseDb); i++) await new Promise((r) => setTimeout(r, 50));
  if (!window.firebaseAuth) throw new Error("Não foi possível conectar. Verifique sua internet e recarregue a página.");
  return { auth: window.firebaseAuth, db: window.firebaseDb };
}
