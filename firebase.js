import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, getDoc, doc, getDocs, collection, query, where, limit, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
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
const PAGINAS_LIVRES = ["conta.html", "login.html", "cadastre-se.html", "verificar-email.html", "termos.html", "privacidade.html", "ajuda.html", "contato.html", "suporte.html"];
onAuthStateChanged(auth, async (u) => {
  if (!u) return;
  const pagina = location.pathname.split("/").pop() || "index.html";
  if (PAGINAS_LIVRES.includes(pagina)) return;
  avisosDaEquipe(u);
  const chave = "hf-conta-ok-" + u.uid;
  try { if (sessionStorage.getItem(chave) === "1") return; } catch {}
  try {
    const [s, sc] = await Promise.all([getDoc(doc(db, "usuarios", u.uid)), getDoc(doc(db, "sancoes", u.uid)).catch(() => null)]);
    const d = s.exists() ? s.data() : {};
    const sancao = sc?.exists() ? sc.data() : null;
    const suspenso = sancao && (sancao.tipo === "banimento" || (sancao.ate?.toMillis?.() ?? 0) > Date.now());
    const ate = d.desativacao?.ate?.toMillis?.();
    const pendente = suspenso || !!d.exclusao?.pedidaEm || (!!d.desativacao && (!d.desativacao.ate || ate > Date.now()));
    if (pendente || d.desativacao) {
      location.replace("conta.html?continuar=" + encodeURIComponent(pagina + location.search));
      return;
    }
    try { sessionStorage.setItem(chave, "1"); } catch {}
  } catch (e) { console.warn("[Conta] Não foi possível conferir o estado da conta:", e); }
});

// Avisos da equipe (painel do administrador): aparecem numa janela até a pessoa tocar em "Entendi".
// Confere no máximo a cada 10 minutos por aba.
async function avisosDaEquipe(u) {
  const chave = "hf-avisos-" + u.uid;
  try { if (Date.now() - Number(sessionStorage.getItem(chave) || 0) < 600000) return; sessionStorage.setItem(chave, String(Date.now())); } catch {}
  try {
    const s = await getDocs(query(collection(db, "avisos"), where("uid", "==", u.uid), where("lidoEm", "==", null), limit(5)));
    if (s.empty) return;
    const lista = s.docs.sort((a, b) => (a.data().em?.toMillis?.() ?? 0) - (b.data().em?.toMillis?.() ?? 0));
    const mostrar = (i) => {
      const d = lista[i]; if (!d) return;
      const a = d.data();
      const cor = a.tipo === "grave" ? "#d03b3b" : a.tipo === "alerta" ? "#ec835a" : "#00adee";
      const fundo = document.createElement("div");
      fundo.setAttribute("role", "dialog"); fundo.setAttribute("aria-modal", "true");
      fundo.style.cssText = "position:fixed;inset:0;z-index:9800;display:grid;place-items:center;padding:18px;background:rgba(2,6,9,.78);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif";
      const cx = document.createElement("div");
      cx.style.cssText = `width:min(460px,100%);background:#0f161b;color:#eaf0f3;border:1px solid #213038;border-top:4px solid ${cor};border-radius:18px;padding:20px;display:grid;gap:10px;box-shadow:0 30px 80px rgba(0,0,0,.6)`;
      const et = document.createElement("small"); et.textContent = "Aviso da equipe Help Floripa"; et.style.cssText = `color:${cor};font-weight:800;letter-spacing:.4px;text-transform:uppercase;font-size:11.5px`;
      const t = document.createElement("strong"); t.textContent = a.titulo || "Aviso"; t.style.fontSize = "18px";
      const p = document.createElement("p"); p.textContent = a.texto || ""; p.style.cssText = "margin:0;white-space:pre-wrap;line-height:1.5;color:#c9d4da";
      const b = document.createElement("button"); b.type = "button"; b.textContent = lista.length - i > 1 ? `Entendi (${lista.length - i - 1} restante${lista.length - i - 1 > 1 ? "s" : ""})` : "Entendi";
      b.style.cssText = "min-height:44px;border:0;border-radius:12px;background:#00adee;color:#001a24;font-weight:800;font-size:15px;cursor:pointer";
      const sup = document.createElement("a"); sup.href = "suporte.html"; sup.textContent = "Falar com o suporte"; sup.style.cssText = "text-align:center;color:#8c9ca7;font-size:13px";
      b.addEventListener("click", async () => { fundo.remove(); updateDoc(d.ref, { lidoEm: serverTimestamp() }).catch(() => {}); mostrar(i + 1); });
      cx.append(et, t, p, b, sup); fundo.appendChild(cx); document.body.appendChild(fundo); b.focus();
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => mostrar(0)); else mostrar(0);
  } catch (e) { console.warn("[Avisos]", e); }
}

export { app, auth, db };
