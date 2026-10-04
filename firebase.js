import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, getDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";

// App Check: prova para o Firebase que o acesso vem do seu site (e não de um robô).
// Usa o reCAPTCHA v3, que é grátis e funciona no plano Spark.
// Cole aqui a CHAVE DO SITE do reCAPTCHA v3 (passo a passo no guia de segurança).
// Enquanto estiver vazia, o site funciona normalmente, só que sem App Check.
const RECAPTCHA_V3_SITE_KEY = "";

const statusElement = document.getElementById("firebase-status");

function setStatus(message, type = "info") {
  if (!statusElement) return;
  statusElement.textContent = message;
  statusElement.dataset.status = type;
}

const firebaseConfig = {
  apiKey: "AIzaSyBbRxwW0RdSNxRtdC6vKt3Ql66Y1lyVvO8",
  authDomain: "helpfloripa-61e0d.firebaseapp.com",
  projectId: "helpfloripa-61e0d",
  storageBucket: "helpfloripa-61e0d.firebasestorage.app",
  messagingSenderId: "1011152435942",
  appId: "1:1011152435942:web:4746d789487866c9861927"
};

const app = initializeApp(firebaseConfig);
if (RECAPTCHA_V3_SITE_KEY) {
  try {
    initializeAppCheck(app, { provider: new ReCaptchaV3Provider(RECAPTCHA_V3_SITE_KEY), isTokenAutoRefreshEnabled: true });
  } catch (e) { console.warn("[Firebase] App Check não iniciou:", e); }
}
const auth = getAuth(app);
const db = getFirestore(app);

window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDb = db;
console.info("[Firebase] Inicializado com sucesso:", app.name, firebaseConfig.projectId);
setStatus(`Firebase conectado (${firebaseConfig.projectId})`, "ok");

// Portão da conta: quem entra com a conta desativada ou com a exclusão pedida vai para
// conta.html (reativar / recuperar). Confere uma vez por sessão do navegador.
const PAGINAS_LIVRES = ["conta.html", "login.html", "cadastre-se.html", "verificar-email.html", "termos.html", "privacidade.html", "ajuda.html", "contato.html"];
onAuthStateChanged(auth, async (u) => {
  if (!u) return;
  const pagina = location.pathname.split("/").pop() || "index.html";
  if (PAGINAS_LIVRES.includes(pagina)) return;
  const chave = "hf-conta-ok-" + u.uid;
  try { if (sessionStorage.getItem(chave) === "1") return; } catch {}
  try {
    const s = await getDoc(doc(db, "usuarios", u.uid));
    const d = s.exists() ? s.data() : {};
    const ate = d.desativacao?.ate?.toMillis?.();
    const pendente = !!d.exclusao?.pedidaEm || (!!d.desativacao && (!d.desativacao.ate || ate > Date.now()));
    if (pendente || d.desativacao) {
      location.replace("conta.html?continuar=" + encodeURIComponent(pagina + location.search));
      return;
    }
    try { sessionStorage.setItem(chave, "1"); } catch {}
  } catch (e) { console.warn("[Conta] Não foi possível conferir o estado da conta:", e); }
});

export { app, auth, db };
