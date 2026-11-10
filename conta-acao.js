// =====================================================
// Link dos e-mails da conta (conta-acao.html), no lugar da página padrão do Firebase:
// - mode=resetPassword: confere o link, mostra de qual conta é e cria a senha nova (requisitos do senha-forte.js e confirmação).
// - mode=verifyEmail: confirma o e-mail e segue para o site.
// - mode=recoverEmail: desfaz uma troca de e-mail que a pessoa não pediu e oferece trocar a senha.
// Para valer, no Firebase: Authentication → Templates → Personalizar o URL de ação →
// https://helpfloripa.com.br/conta-acao.html (passo a passo em _regras/EMAILS-LEIA-ME.md).
// Segurança: o código sai do endereço assim que é lido (não fica no histórico nem vai para outro site),
// e o "continuar" só leva a páginas do próprio site.
// =====================================================
import { $, mensagemErro, firebasePronto } from "./acesso.js?v=6";
import { senhaForte, primeiroProblema, ligarSenhaForte } from "./senha-forte.js?v=1";

const q = new URLSearchParams(location.search);
const modo = q.get("mode") || "", codigo = q.get("oobCode") || "";
const destino = (() => {
  // continueUrl vindo do e-mail: só uma página deste site (sem domínio de fora).
  const c = q.get("continueUrl");
  if (!c) return "";
  try {
    const u = new URL(c, location.href);
    const nosso = u.origin === location.origin || /^https:\/\/(www\.)?helpfloripa\.com\.br$/.test(u.origin);
    return nosso && /^\/[a-z_-]+\.html$/i.test(u.pathname) ? u.pathname.slice(1) + u.search : "";
  } catch { return ""; }
})();
try { history.replaceState(history.state, "", location.pathname); } catch {}

const ICONE = {
  ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.2 4.2L19 7"/></svg>',
  erro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 7v6"/><circle cx="12" cy="16.8" r=".6" fill="currentColor"/><path d="M10.3 3.9L2.6 17.5A2 2 0 004.3 20.5h15.4a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" stroke-linejoin="round"/></svg>',
  escudo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6z"/><path d="M8.8 12l2.2 2.2 4.2-4.4"/></svg>',
};
function mostrar(id) { ["telaCarregando", "telaSenha", "telaResultado"].forEach((t) => { $(t).hidden = t !== id; }); }
function resultado({ tipo = "ok", titulo, texto, botoes = [] }) {
  const ic = $("resIcone"); ic.className = "acao-icone " + tipo; ic.innerHTML = ICONE[tipo] || ICONE.ok;
  $("resTitulo").textContent = titulo; $("resTexto").textContent = texto;
  $("resBotoes").replaceChildren(...botoes.map(([rotulo, href, sec]) => { const a = document.createElement("a"); a.className = "botao" + (sec ? " sec" : ""); a.href = href; a.textContent = rotulo; return a; }));
  mostrar("telaResultado");
  document.title = titulo + " | Help Floripa";
  $("resTitulo").focus?.();
}
const vencido = (c) => c === "auth/expired-action-code" || c === "auth/invalid-action-code";
const linkRuim = (texto, botao) => resultado({ tipo: "erro", titulo: "Este link não vale mais", texto, botoes: [botao, ["Voltar ao início", "index.html", true]] });

function aviso(texto, tipo = "erro") { const el = $("avisoAcao"); el.hidden = !texto; el.className = "aviso " + tipo; el.textContent = texto || ""; }

(async function iniciar() {
  let auth;
  try { ({ auth } = await firebasePronto()); }
  catch (e) { resultado({ tipo: "erro", titulo: "Sem conexão", texto: e.message, botoes: [["Tentar de novo", location.href]] }); return; }
  const A = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
  if (!codigo || !["resetPassword", "verifyEmail", "recoverEmail", "verifyAndChangeEmail"].includes(modo)) {
    linkRuim("O endereço está incompleto. Abra de novo o link do e-mail ou peça um novo.", ["Pedir um link novo", "recuperar-senha.html"]);
    return;
  }

  // ---------- senha nova ----------
  if (modo === "resetPassword") {
    let email = "";
    try { email = await A.verifyPasswordResetCode(auth, codigo); }
    catch (e) {
      if (vencido(e.code)) linkRuim("O link para criar uma senha nova já foi usado ou venceu. Peça outro: chega em alguns minutos.", ["Pedir um link novo", "recuperar-senha.html"]);
      else resultado({ tipo: "erro", titulo: "Não deu para abrir o link", texto: mensagemErro(e.code), botoes: [["Tentar de novo", "recuperar-senha.html"]] });
      return;
    }
    $("emailConta").textContent = email;
    mostrar("telaSenha");
    $("senha").focus();
    const regras = ligarSenhaForte({ campo: $("senha"), lista: $("senhaRegras"), dados: { email } });
    $("formNova").addEventListener("submit", async (e) => {
      e.preventDefault();
      const s1 = $("senha").value, s2 = $("senha2").value;
      if (!senhaForte(s1, { email })) { regras.mostrarFaltas(); aviso(primeiroProblema(s1, { email })); $("senha").focus(); return; }
      if (s1 !== s2) { aviso("As duas senhas não são iguais. Digite de novo."); $("senha2").focus(); return; }
      const b = $("salvar"); b.disabled = true; b.textContent = "Salvando...";
      aviso("");
      try {
        await A.confirmPasswordReset(auth, codigo, s1);
        try { localStorage.removeItem("hf-senha-ate"); } catch {}
        resultado({ titulo: "Senha nova salva", texto: "Pronto! Agora é só entrar com o seu e-mail e a senha nova. Se você estava conectado em outro aparelho, entre de novo por lá também.",
          botoes: [["Entrar com a senha nova", `login.html?email=${encodeURIComponent(email)}${destino ? "&continuar=" + encodeURIComponent(destino) : ""}`]] });
      } catch (err) {
        b.disabled = false; b.textContent = "Salvar senha nova";
        if (vencido(err.code)) linkRuim("O link venceu enquanto você criava a senha. Peça outro: chega em alguns minutos.", ["Pedir um link novo", `recuperar-senha.html?email=${encodeURIComponent(email)}`]);
        else aviso(err.code === "auth/weak-password" ? "Senha fraca. Siga os requisitos da lista embaixo da senha." : mensagemErro(err.code));
      }
    });
    return;
  }

  // ---------- confirmar o e-mail ----------
  if (modo === "verifyEmail" || modo === "verifyAndChangeEmail") {
    try { await A.applyActionCode(auth, codigo); }
    catch (e) {
      if (vencido(e.code)) {
        // Já confirmado antes (o mesmo link aberto de novo): não é erro para a pessoa.
        const u = auth.currentUser;
        if (u) { await u.reload().catch(() => {}); if (u.emailVerified) { pronto(); return; } }
        linkRuim("O link de confirmação já foi usado ou venceu. Entre na sua conta e peça outro.", ["Pedir outro link", "verificar-email.html"]);
      } else resultado({ tipo: "erro", titulo: "Não deu para confirmar", texto: mensagemErro(e.code), botoes: [["Tentar de novo", "verificar-email.html"]] });
      return;
    }
    const u = auth.currentUser;
    if (u) { await u.reload().catch(() => {}); await u.getIdToken(true).catch(() => {}); try { sessionStorage.removeItem("hf-conta-ok-" + u.uid); } catch {} }
    pronto();
    function pronto() {
      const logado = !!auth.currentUser;
      resultado({ titulo: modo === "verifyEmail" ? "E-mail confirmado" : "E-mail trocado", texto: modo === "verifyEmail" ? "Tudo certo! Sua conta está confirmada e você já pode usar o Help Floripa." : "Seu e-mail novo está confirmado. Use ele para entrar daqui em diante.",
        botoes: [[logado ? "Continuar" : "Entrar", logado ? (destino || "index.html") : "login.html" + (destino ? "?continuar=" + encodeURIComponent(destino) : "")]] });
    }
    return;
  }

  // ---------- desfazer a troca de e-mail ----------
  if (modo === "recoverEmail") {
    let email = "";
    try { email = (await A.checkActionCode(auth, codigo)).data?.email || ""; await A.applyActionCode(auth, codigo); }
    catch (e) {
      if (vencido(e.code)) linkRuim("Este link já foi usado ou venceu. Se você não pediu a troca do e-mail, fale com o suporte.", ["Falar com o suporte", "contato.html#acesso"]);
      else resultado({ tipo: "erro", titulo: "Não deu para desfazer", texto: mensagemErro(e.code), botoes: [["Falar com o suporte", "contato.html#acesso"]] });
      return;
    }
    resultado({ tipo: "escudo", titulo: "E-mail de volta", texto: `A troca foi desfeita: a conta voltou a usar ${email}. Se não foi você quem pediu a troca, crie uma senha nova agora para proteger a conta.`,
      botoes: [["Criar senha nova", `recuperar-senha.html?email=${encodeURIComponent(email)}`], ["Ir para o início", "index.html", true]] });
  }
})();
