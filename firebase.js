import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getDoc, doc, getDocs, collection, query, where, limit, updateDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";

// App Check: prova para o Firebase que o acesso vem do seu site (e não de um robô).
// Usa o reCAPTCHA v3, que é grátis e funciona no plano Spark.
// Cole aqui a CHAVE DO SITE do reCAPTCHA v3 (passo a passo no guia de segurança).
// Enquanto estiver vazia, o site funciona normalmente, só que sem App Check.
const RECAPTCHA_V3_SITE_KEY = "";

// Firebase Storage: fotos, vídeos e arquivos guardados fora dos documentos (sem o limite de 1 MB por documento,
// com vídeos no Diário, no Flash, no chat e no suporte). DESLIGADO até ativar o plano Blaze e o Storage no console.
// Para ligar: siga _regras/STORAGE-LEIA-ME.md (publicar o storage.rules) e troque para true.
// Desligado, o site guarda as fotos dentro dos documentos, como hoje. Ligado, tudo o que é novo vai para o Storage.
const USAR_STORAGE = false;

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
// Os quadros da rede social numa página só (rede.html) NÃO contam como gaveta: a casca não usa o Firebase, então cada
// aba (quadro) usa o cache do aparelho como uma aba normal. Antes ficavam só com a memória e liam TUDO do servidor a cada
// abertura (era por isso que o Diário e o Explorar demoravam dentro da rede e eram rápidos abertos sozinhos).
const naCascaDaRede = (() => { try { return window.parent !== window && window.parent === window.top && !!window.parent.__hfShell; } catch { return false; } })();
const embutidaNoSite = window.top !== window.self && !naCascaDaRede;
try { db = embutidaNoSite ? getFirestore(app) : initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); }
catch (e) { console.warn("[Firebase] Cache local indisponível, seguindo sem ele:", e?.message); db = getFirestore(app); }

// O Storage fica pronto ANTES de o site começar (as páginas conferem window.firebaseStorage ao iniciar).
// Desligado, nem o código do Storage é baixado.
if (USAR_STORAGE) {
  try {
    const { getStorage } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js");
    const storage = getStorage(app);
    window.firebaseStorage = storage;
  } catch (e) { console.warn("[Firebase] Storage indisponível, seguindo sem ele:", e?.message || e); }
}

window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDb = db;
console.info("[Firebase] Inicializado com sucesso:", app.name, firebaseConfig.projectId);
setStatus(`Firebase conectado (${firebaseConfig.projectId})`, "ok");

// Listas (<select>) e horários no visual do site, no lugar das janelas do celular (campos.js).
import("./campos.js?v=3").then((m) => m.ligarCampos()).catch((e) => console.warn("[Campos]", e?.message || e));
// "Voltar" fecha a janela que está aberta por cima, em vez de sair da página (voltar.js).
import("./voltar.js?v=9").then((m) => m.ligarVoltar()).catch((e) => console.warn("[Voltar]", e?.message || e));
// "Voltar" que tiraria a pessoa do site pergunta antes ("Sair do Help Floripa?").
import("./confirmar.js?v=6").then((m) => m.guardarSaida()).catch((e) => console.warn("[Saída]", e?.message || e));

// Aviso temporário de manutenção (liga e desliga no próprio manutencao.js).
// App instalado (PWA): service worker simples (sw.js) — páginas sempre da rede, offline.html sem internet.
// Service worker (sw.js): guarda no aparelho os arquivos com ?v= (não mudam) e deixa as páginas mais rápidas.
if ("serviceWorker" in navigator && (location.protocol === "https:" || /^(127\.0\.0\.1|localhost)$/.test(location.hostname)))
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).catch((e) => console.warn("[App]", e?.message || e));
import("./sem-menu-imagem.js?v=1").catch(() => {});
import("./manutencao.js?v=1").then((m) => m.avisoManutencao()).catch((e) => console.warn("[Manutenção]", e?.message || e));

// Portão da conta: quem entra com a conta desativada ou com a exclusão pedida vai para
// conta.html (reativar / recuperar). Confere uma vez por sessão do navegador.
const PAGINAS_LIVRES = ["conta.html", "login.html", "cadastre-se.html", "verificar-email.html", "termos.html", "privacidade.html", "ajuda.html", "contato.html", "suporte.html", "seguranca.html", "diretrizes.html"];
// E-mail confirmado é obrigatório para entrar na plataforma (pedido do dono, 03/11/2026): quem entrou com e-mail e senha e
// ainda não confirmou vai para verificar-email.html (de qualquer página, menos as de ler: termos, ajuda, contato...).
// Antes de barrar, recarrega o login (a pessoa pode ter confirmado em outro aparelho).
const LIVRES_SEM_EMAIL = ["verificar-email.html", "login.html", "cadastre-se.html", "termos.html", "privacidade.html", "ajuda.html", "contato.html", "diretrizes.html", "seguranca.html", "sobre.html", "como-ordenamos.html", "404.html", "link.html", "offline.html"];
const pedeSenha = (u) => (u.providerData || []).some((p) => p.providerId === "password");
async function barrarSemEmail(u, pagina) {
  if (u.emailVerified || !pedeSenha(u) || LIVRES_SEM_EMAIL.includes(pagina)) return false;
  const raiz = document.documentElement; raiz.style.visibility = "hidden";
  try { await u.reload(); } catch {}
  if (auth.currentUser?.emailVerified) { raiz.style.visibility = ""; return false; }
  const alvo = "verificar-email.html?continuar=" + encodeURIComponent(pagina + location.search);
  try { (window.top && window.top.location.origin === location.origin ? window.top : window).location.replace(alvo); } catch { location.replace(alvo); }
  return true;
}
// A conta guarda se o e-mail está confirmado (usuarios.emailConfirmado), para o painel mostrar: o valor vem do login
// (token) e as regras só aceitam o valor verdadeiro. Uma gravação por sessão, só quando mudou.
async function anotarEmail(u) {
  const chave = "hf-email-anotado-" + u.uid;
  try {
    const t = await u.getIdTokenResult(u.emailVerified);
    const v = t.claims.email_verified === true;
    if (sessionStorage.getItem(chave) === String(v) + "|" + (u.email || "")) return;
    // Lê a conta ANTES de gravar: sem o documento na cópia do aparelho, a gravação (merge) deixava ali uma conta só com
    // estes 3 campos e as leituras de logo depois (nesta página e no rede.js) vinham sem nome, cidade etc.
    await getDoc(doc(db, "usuarios", u.uid)).catch(() => null);
    // Junto vai o e-mail do login (contas antigas não tinham o e-mail gravado: o painel mostrava "—").
    await setDoc(doc(db, "usuarios", u.uid), { emailConfirmado: v, emailConferidoEm: serverTimestamp(), ...(u.email ? { email: u.email } : {}) }, { merge: true });
    sessionStorage.setItem(chave, String(v) + "|" + (u.email || ""));
  } catch (e) { /* conta ainda sem documento (cadastro em andamento) ou regras antigas: tenta na próxima página */ }
}

onAuthStateChanged(auth, async (u) => {
  if (!u) return;
  const pagina = location.pathname.split("/").pop() || "index.html";
  if (await barrarSemEmail(u, pagina)) { anotarEmail(u); return; }
  const emailAnotado = anotarEmail(u);
  if (PAGINAS_LIVRES.includes(pagina)) return;
  avisosDaEquipe(u);
  // Ligações de voz e vídeo: a tela de chamada aparece em qualquer página quando alguém liga (chamadas.js).
  import("./chamadas.js?v=2").then((m) => m.ouvirChamadas(u.uid)).catch((e) => console.warn("[Chamadas]", e?.message || e));
  // Presença ("online agora"): a cada 4 min com a página à vista (presenca.js; respeita quem escondeu).
  import("./presenca.js?v=1").then((m) => m.ligarPresenca(db, u.uid)).catch((e) => console.warn("[Presença]", e?.message || e));
  const chave = "hf-conta-ok-" + u.uid;
  try { if (sessionStorage.getItem(chave) === "1") return; } catch {}
  try {
    // A conta vem DO SERVIDOR: logo depois do login o anotarEmail grava a conta (merge) e o getDoc comum devolvia só os
    // campos dessa gravação (3 campos, sem estar marcado como cópia do aparelho). Com isso a janela "complete sua cidade"
    // abria para quem tem cidade, e a conferência de conta desativada/excluída olhava um documento incompleto.
    // Sem internet, cai na leitura comum.
    // Mesmo do servidor, enquanto a gravação está pendente a leitura vem só com os campos dela: aí espera a gravação
    // terminar e lê de novo.
    const lerConta = () => import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
      .then((f) => f.getDocFromServer(doc(db, "usuarios", u.uid))).catch(() => getDoc(doc(db, "usuarios", u.uid)));
    const contaCompleta = async () => {
      let x = await lerConta();
      if (x.metadata.hasPendingWrites && !(x.exists() && x.data().uid)) { await emailAnotado; x = await lerConta(); }
      return x;
    };
    const [s, sc] = await Promise.all([contaCompleta(), getDoc(doc(db, "sancoes", u.uid)).catch(() => null)]);
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
    // Notificações com o app fechado (push.js): o endereço do aparelho pode mudar; renova 1×/dia se estiver ligado.
    import("./push.js?v=2").then(async (m) => m.renovarPush({ ...(await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")), db }, u.uid, d)).catch(() => {});
    // Cidade no padrão novo (estado + cidade do IBGE): converte a antiga ou pede para completar.
    // Cidade no padrão novo (estado + cidade do IBGE): converte a antiga ou pede para completar (só com a conta inteira).
    if (!s.metadata.fromCache && d.uid) import("./local-conta.js?v=2").then((m) => m.conferirLocal(db, u, d)).catch((e) => console.warn("[Local]", e?.message || e));
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
