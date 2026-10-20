import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getDoc, doc, getDocs, collection, query, where, limit, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
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
// Cache no aparelho (IndexedDB): ao trocar de página, o Firebase retoma as consultas e cobra só o
// que mudou (até 30 min), em vez de ler tudo de novo. Vale para várias abas abertas ao mesmo tempo.
let db;
// Dentro da gaveta de mensagens (a página de mensagens aberta por cima de outra página do site),
// o cache fica só na memória: a página de fora já usa o cache do aparelho, e dois "donos" do mesmo
// cache na mesma aba podiam deixar consultas presas (ex.: o "Avaliar agora" não abria).
const embutidaNoSite = window.top !== window.self;
try { db = embutidaNoSite ? getFirestore(app) : initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); }
catch (e) { console.warn("[Firebase] Cache local indisponível, seguindo sem ele:", e?.message); db = getFirestore(app); }

window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDb = db;
console.info("[Firebase] Inicializado com sucesso:", app.name, firebaseConfig.projectId);
setStatus(`Firebase conectado (${firebaseConfig.projectId})`, "ok");

// Listas (<select>) e horários no visual do site, no lugar das janelas do celular (campos.js).
import("./campos.js?v=1").then((m) => m.ligarCampos()).catch((e) => console.warn("[Campos]", e?.message || e));
// "Voltar" fecha a janela que está aberta por cima, em vez de sair da página (voltar.js).
import("./voltar.js?v=3").then((m) => m.ligarVoltar()).catch((e) => console.warn("[Voltar]", e?.message || e));
// "Voltar" que tiraria a pessoa do site pergunta antes ("Sair do Help Floripa?").
import("./confirmar.js?v=4").then((m) => m.guardarSaida()).catch((e) => console.warn("[Saída]", e?.message || e));

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
    // Cidade no padrão novo (estado + cidade do IBGE): converte a antiga ou pede para completar.
    import("./local-conta.js?v=1").then((m) => m.conferirLocal(db, u, d)).catch((e) => console.warn("[Local]", e?.message || e));
  } catch (e) { console.warn("[Conta] Não foi possível conferir o estado da conta:", e); }
});

// Avisos da equipe (painel do administrador): todos aparecem nas Notificações, no sino e em
// Mensagens (avisos-equipe.js). Os de alerta e os graves também abrem numa janela até a pessoa
// tocar em "Entendi". Confere no máximo a cada 10 minutos por aba.
async function avisosDaEquipe(u) {
  const chave = "hf-avisos-" + u.uid;
  try { if (Date.now() - Number(sessionStorage.getItem(chave) || 0) < 600000) return; sessionStorage.setItem(chave, String(Date.now())); } catch {}
  try {
    const s = await getDocs(query(collection(db, "avisos"), where("uid", "==", u.uid), where("lidoEm", "==", null), limit(10)));
    const docs = s.docs.filter((d) => d.data().tipo === "alerta" || d.data().tipo === "grave");
    if (!docs.length) return;
    const lista = docs.sort((a, b) => (a.data().em?.toMillis?.() ?? 0) - (b.data().em?.toMillis?.() ?? 0));
    // Janela no visual do site (comunicados.js): tipo, Suporte Help Floripa com selo, "1 de 3", Responder / Entendi.
    const { janelaAvisos } = await import("./comunicados.js?v=1");
    const abrir = () => janelaAvisos(lista.map((d) => ({ id: d.id, ...d.data() })), { aoLer: (a) => { const d = lista.find((x) => x.id === a.id); if (d) updateDoc(d.ref, { lidoEm: serverTimestamp() }).catch(() => {}); } });
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", abrir); else abrir();
  } catch (e) { console.warn("[Avisos]", e); }
}

export { app, auth, db };
