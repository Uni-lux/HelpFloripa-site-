// =====================================================
// Confirmar e-mail (verificar-email.html)
// Dois jeitos de chegar aqui:
// 1) Pelo link do e-mail (?mode=verifyEmail&oobCode=...): a pessoa toca em
//    "Confirmar meu e-mail" (evita que leitores de e-mail usem o link sozinhos).
// 2) Depois do cadastro: a página confere sozinha a cada 4 segundos.
// =====================================================
import { $, destinoSeguro, aviso, firebasePronto } from "./acesso.js?v=1";

const destino = destinoSeguro("index.html");
const p = new URLSearchParams(location.search);
const oob = p.get("mode") === "verifyEmail" ? p.get("oobCode") : null;
$("pular").href = destino;

(async function iniciar() {
  let auth;
  try { ({ auth } = await firebasePronto()); } catch (e) { aviso("avisoVerif", e.message, "erro"); return; }
  const A = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");

  if (oob) {
    $("modoEspera").hidden = true;
    $("modoLink").hidden = false;
    A.checkActionCode(auth, oob).then((info) => {
      if (info?.data?.email) $("linkEmail").textContent = info.data.email;
    }).catch(() => {
      $("titulo").textContent = "Link expirado";
      $("textoLink").textContent = "Este link já foi usado ou expirou. Entre na sua conta para receber um novo.";
      $("confirmarLink").hidden = true;
      $("irLogin").hidden = false;
    });
    $("confirmarLink").addEventListener("click", async () => {
      const b = $("confirmarLink");
      b.disabled = true; b.textContent = "Confirmando...";
      try {
        await A.applyActionCode(auth, oob);
        await auth.currentUser?.reload().catch(() => {});
        await auth.currentUser?.getIdToken(true).catch(() => {});
        $("titulo").textContent = "E-mail confirmado!";
        $("textoLink").textContent = "Tudo certo. Agora você pode conversar, publicar, avaliar e anunciar.";
        b.hidden = true;
        aviso("avisoVerif", "Redirecionando...", "ok");
        setTimeout(() => { location.href = destino; }, 1600);
      } catch (err) {
        console.error(err);
        aviso("avisoVerif", err?.code === "auth/invalid-action-code" ? "Este link já foi usado ou expirou. Entre na sua conta para receber um novo." : "Não foi possível confirmar agora. Tente de novo.", "erro");
        b.disabled = false; b.textContent = "Confirmar meu e-mail";
      }
    });
    return;
  }

  let usuario = null, intervalo = null;
  A.onAuthStateChanged(auth, (u) => {
    if (!u) { location.href = "login.html"; return; }
    usuario = u;
    $("emailUsuario").textContent = u.email || "";
    if (u.emailVerified) return concluido();
    clearInterval(intervalo);
    intervalo = setInterval(conferir, 4000);
  });
  async function conferir() {
    if (!usuario) return false;
    try { await A.reload(usuario); } catch {}
    if (usuario.emailVerified) { clearInterval(intervalo); concluido(); return true; }
    return false;
  }
  function concluido() {
    // Atualiza o login para as regras do banco já enxergarem o e-mail confirmado.
    usuario?.getIdToken(true).catch(() => {});
    $("titulo").textContent = "E-mail confirmado!";
    aviso("avisoVerif", "Tudo certo. Redirecionando...", "ok");
    setTimeout(() => { location.href = destino; }, 1400);
  }
  $("jaConfirmei").addEventListener("click", async () => {
    const b = $("jaConfirmei");
    b.disabled = true; b.textContent = "Verificando...";
    if (!(await conferir())) aviso("avisoVerif", "Ainda não encontramos a confirmação. Abra o link do e-mail (veja também o spam) e tente de novo.", "erro");
    b.disabled = false; b.textContent = "Já confirmei";
  });
  $("reenviar").addEventListener("click", async () => {
    const b = $("reenviar");
    if (!usuario) return;
    b.disabled = true;
    try {
      await A.sendEmailVerification(usuario);
      aviso("avisoVerif", "E-mail reenviado! Veja sua caixa de entrada e o spam.", "ok");
      let s = 30;
      b.textContent = `Reenviar em ${s}s`;
      const t = setInterval(() => { s--; b.textContent = `Reenviar em ${s}s`; if (s <= 0) { clearInterval(t); b.disabled = false; b.textContent = "Reenviar e-mail"; } }, 1000);
    } catch (err) {
      aviso("avisoVerif", err?.code === "auth/too-many-requests" ? "Muitos envios seguidos. Espere alguns minutos." : "Não foi possível reenviar agora. Tente em instantes.", "erro");
      b.disabled = false;
    }
  });
  $("sairConta").addEventListener("click", async () => {
    await A.signOut(auth).catch(() => {});
    location.href = "login.html";
  });
})();
