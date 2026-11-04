// =====================================================
// Esqueceu a senha? (recuperar-senha.html): manda o link do Firebase para criar uma senha nova.
// Por segurança a resposta é sempre a mesma (não conta se o e-mail tem conta ou não). Espera de 60 s entre envios.
// =====================================================
import { $, mensagemErro, aviso, firebasePronto } from "./acesso.js?v=4";

const ESPERA = "hf-senha-ate";
const p = new URLSearchParams(location.search);
if (p.get("email")) $("email").value = p.get("email").slice(0, 120);
if (p.get("continuar")) $("linkEntrar").href = `login.html?continuar=${encodeURIComponent(p.get("continuar"))}`;

function travar() {
  const b = $("enviar");
  let ate = 0; try { ate = Number(localStorage.getItem(ESPERA) || 0); } catch {}
  const falta = Math.ceil((ate - Date.now()) / 1000);
  if (falta > 0) { b.disabled = true; b.textContent = `Enviar de novo em ${falta} s`; setTimeout(travar, 1000); }
  else { b.disabled = false; b.textContent = "Enviar link"; }
}
travar();

(async function iniciar() {
  let auth;
  try { ({ auth } = await firebasePronto()); } catch (e) { aviso("avisoSenha", e.message, "erro"); return; }
  const A = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
  $("formSenha").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("email").value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { aviso("avisoSenha", "Digite um e-mail válido.", "erro"); $("email").focus(); return; }
    const b = $("enviar");
    b.disabled = true; b.textContent = "Enviando...";
    try {
      await A.sendPasswordResetEmail(auth, email);
      aviso("avisoSenha", `Se existir uma conta com ${email}, enviamos um link para criar uma senha nova. Veja também a caixa de spam.`, "ok");
      try { localStorage.setItem(ESPERA, String(Date.now() + 60000)); } catch {}
    } catch (err) {
      // E-mail sem conta: a mesma resposta (ninguém descobre quem tem conta aqui).
      if (err.code === "auth/user-not-found") aviso("avisoSenha", `Se existir uma conta com ${email}, enviamos um link para criar uma senha nova. Veja também a caixa de spam.`, "ok");
      else aviso("avisoSenha", mensagemErro(err.code), "erro");
      if (err.code === "auth/too-many-requests") try { localStorage.setItem(ESPERA, String(Date.now() + 300000)); } catch {}
    }
    travar();
  });
})();
