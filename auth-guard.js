/**
 * auth-guard.js
 *
 * Protege uma página exigindo que o usuário esteja logado no Firebase Auth.
 * Se não estiver, redireciona imediatamente para login.html.
 *
 * COMO USAR (em cada página protegida: servicos.html, delivery.html,
 * shopping.html, imoveis.html):
 *
 * 1. Logo no início do <head>, ANTES de qualquer outro conteúdo, adicione:
 *
 *      <style>html.hf-auth-checking { visibility: hidden; }</style>
 *      <script>document.documentElement.classList.add('hf-auth-checking');</script>
 *
 * 2. Depois do firebase.js, carregue este arquivo como módulo:
 *
 *      <script type="module" src="firebase.js"></script>
 *      <script type="module" src="auth-guard.js"></script>
 *
 * Isso evita mostrar o conteúdo da página (mesmo por um instante) antes de
 * confirmar que o usuário está logado.
 */
(function () {
  const LOGIN_URL = "login.html";
  const MAX_WAIT_RETRIES = 40; // ~4s no total esperando o firebase.js inicializar
  const RETRY_DELAY_MS = 100;

  function currentPageFileName() {
    return window.location.pathname.split("/").pop() || "index.html";
  }

  function redirectToLogin() {
    const redirect = encodeURIComponent(currentPageFileName() + window.location.search);
    window.location.replace(`${LOGIN_URL}?redirect=${redirect}`);
  }

  function revealPage() {
    document.documentElement.classList.remove("hf-auth-checking");
  }

  function checkAuth() {
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js")
      .then(({ onAuthStateChanged }) => {
        onAuthStateChanged(window.firebaseAuth, (user) => {
          if (user) {
            revealPage();
          } else {
            redirectToLogin();
          }
        });
      })
      .catch((error) => {
        console.error("[AuthGuard] Erro ao verificar autenticação.", error);
        redirectToLogin();
      });
  }

  function waitForFirebaseAuth(retriesLeft) {
    if (window.firebaseAuth) {
      checkAuth();
      return;
    }

    if (retriesLeft <= 0) {
      console.error("[AuthGuard] Firebase Auth não inicializou. Bloqueando acesso por segurança.");
      redirectToLogin();
      return;
    }

    setTimeout(() => waitForFirebaseAuth(retriesLeft - 1), RETRY_DELAY_MS);
  }

  waitForFirebaseAuth(MAX_WAIT_RETRIES);
})();
