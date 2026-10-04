// =====================================================
// Entrar (login.html)
// =====================================================
import { $, destinoSeguro, mensagemErro, aviso, firebasePronto } from "./acesso.js?v=2";

const destino = destinoSeguro("index.html");
if (new URLSearchParams(location.search).get("redirect")) aviso("avisoLogin", "Entre na sua conta para continuar.", "info");
// O link de cadastro leva o mesmo destino.
if (destino !== "index.html") $("linkCadastro").href = `cadastre-se.html?continuar=${encodeURIComponent(destino)}`;

(async function iniciar() {
  let auth;
  try { ({ auth } = await firebasePronto()); } catch (e) { aviso("avisoLogin", e.message, "erro"); return; }
  const A = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");

  // Já conectado: mostra quem é e oferece continuar.
  const parar = A.onAuthStateChanged(auth, (u) => {
    parar();
    if (!u) return;
    $("jaConectado").hidden = false;
    $("jaNome").textContent = u.displayName || u.email || "sua conta";
    $("formLogin").hidden = true;
    $("continuar").href = destino;
  });
  $("trocarConta").addEventListener("click", async () => {
    await A.signOut(auth).catch(() => {});
    $("jaConectado").hidden = true;
    $("formLogin").hidden = false;
    $("email").focus();
  });

  $("formLogin").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("email").value.trim(), senha = $("senha").value;
    if (!email || !senha) { aviso("avisoLogin", "Preencha e-mail e senha.", "erro"); return; }
    const b = $("entrar");
    b.disabled = true; b.textContent = "Entrando...";
    aviso("avisoLogin", "");
    try {
      const cred = await A.signInWithEmailAndPassword(auth, email, senha);
      // Confere de novo se a conta está desativada ou com exclusão pedida (portão em firebase.js).
      try { sessionStorage.removeItem("hf-conta-ok-" + cred.user.uid); } catch {}
      location.href = destino;
    } catch (err) {
      console.error("[Login]", err);
      aviso("avisoLogin", mensagemErro(err.code), "erro");
      b.disabled = false; b.textContent = "Entrar";
    }
  });

  $("esqueci").addEventListener("click", async () => {
    const email = $("email").value.trim();
    if (!email) { aviso("avisoLogin", "Digite seu e-mail acima e toque de novo em \"Esqueci minha senha\".", "info"); $("email").focus(); return; }
    try {
      await A.sendPasswordResetEmail(auth, email);
      aviso("avisoLogin", `Se existir uma conta com ${email}, enviamos um link para criar uma nova senha. Veja também a caixa de spam.`, "ok");
    } catch (err) { aviso("avisoLogin", mensagemErro(err.code), "erro"); }
  });
})();
