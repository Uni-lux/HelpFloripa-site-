// =====================================================
// Notificações com o app fechado (Etapa B): liga/desliga neste aparelho e guarda o token do Firebase Cloud Messaging
// em usuarios/{uid}.pushTokens [{t, em, app}] (até 5 aparelhos; o dono grava a própria conta, sem regra nova).
// As escolhas ficam em usuarios/{uid}.pushPref {ligado, mensagens, chamadas, seguidores, publicacoes, social, avisos}.
// Quem manda são as Cloud Functions (functions/push.js + index.js); o sw.js mostra a notificação e abre a página.
// Sem a chave PUSH_VAPID (servidor.js) não oferece nada. Nos testes: localStorage hf-push-teste = "1" (token de mentira).
// Sem dependências do rede.js: recebe as funções do Firestore (fb) e o usuário (eu).
// =====================================================
import { PUSH_VAPID, REGIAO_FUNCOES } from "./servidor.js?v=3";

export const CATEGORIAS_PUSH = [
  ["mensagens", "Mensagens", "Conversas e pedidos no chat"],
  ["chamadas", "Ligações", "Ligação de voz e vídeo tocando e ligações perdidas"],
  ["seguidores", "Seguidores", "Quem começou a seguir você"],
  ["publicacoes", "Publicações", "Estrelas, comentários, respostas e marcações"],
  ["social", "Social", "Pedidos para o seu social"],
  ["avisos", "Avisos e suporte", "Respostas do suporte e avisos da equipe"]
];
const MAX_APARELHOS = 5;
const CH_TOKEN = (uid) => "hf-push-token-" + uid;
const teste = () => { try { return localStorage.getItem("hf-push-teste") === "1"; } catch { return false; } };

// O aparelho consegue? (navegador com push + service worker + a chave do site)
export function pushDisponivel() {
  if (!("serviceWorker" in navigator) || !("Notification" in window)) return false;
  if (teste()) return true;
  return !!PUSH_VAPID && "PushManager" in window;
}
// iPhone/iPad: só funciona com o site instalado na tela de início (iOS 16.4+).
export const precisaInstalar = () => /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.matchMedia?.("(display-mode: standalone)").matches && !navigator.standalone;

export function tokenDoAparelho(uid) { try { return localStorage.getItem(CH_TOKEN(uid)) || ""; } catch { return ""; } }

// Ligado neste aparelho = permissão dada + token guardado + não desligado na conta.
export function estadoPush(uid, dados = {}) {
  if (!pushDisponivel()) return precisaInstalar() ? "instalar" : "indisponivel";
  if (Notification.permission === "denied") return "bloqueado";
  const t = tokenDoAparelho(uid);
  if (Notification.permission === "granted" && t && (dados.pushTokens || []).some((x) => x?.t === t) && dados.pushPref?.ligado !== false) return "ligado";
  return "desligado";
}

async function pegarToken() {
  if (teste()) return "teste-" + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + "-aparelho";
  const reg = await navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(() => navigator.serviceWorker.ready);
  const m = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js");
  const messaging = m.getMessaging(window.firebaseApp);
  return m.getToken(messaging, { vapidKey: PUSH_VAPID, serviceWorkerRegistration: reg });
}
const nomeAparelho = () => {
  const ua = navigator.userAgent;
  const so = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iPhone" : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "Mac" : "Computador";
  const app = window.matchMedia?.("(display-mode: standalone)").matches ? "app" : "navegador";
  return `${so} · ${app}`;
};

// Guarda o token deste aparelho na conta (tira repetidos e deixa os 5 mais novos).
async function gravarToken(fb, uid, dados, token) {
  const lista = (dados.pushTokens || []).filter((x) => x?.t && x.t !== token && x.t !== tokenDoAparelho(uid));
  lista.unshift({ t: token, em: Date.now(), app: nomeAparelho() });
  const pushTokens = lista.slice(0, MAX_APARELHOS);
  const pushPref = { ...(dados.pushPref || {}), ligado: true };
  await fb.setDoc(fb.doc(fb.db, "usuarios", uid), { pushTokens, pushPref }, { merge: true });
  dados.pushTokens = pushTokens; dados.pushPref = pushPref;
  try { localStorage.setItem(CH_TOKEN(uid), token); localStorage.setItem("hf-push-renovado-" + uid, String(Date.now())); } catch {}
}

// Liga neste aparelho (pede a permissão do navegador). Devolve o estado novo.
export async function ativarPush(fb, uid, dados) {
  if (!pushDisponivel()) return estadoPush(uid, dados);
  const p = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (p !== "granted") return p === "denied" ? "bloqueado" : "desligado";
  const token = await pegarToken();
  if (!token) throw new Error("O navegador não entregou o endereço de notificação.");
  await gravarToken(fb, uid, dados, token);
  return "ligado";
}

// Desliga só neste aparelho (os outros continuam).
export async function desativarPush(fb, uid, dados) {
  const t = tokenDoAparelho(uid);
  const pushTokens = (dados.pushTokens || []).filter((x) => x?.t && x.t !== t);
  await fb.setDoc(fb.doc(fb.db, "usuarios", uid), { pushTokens }, { merge: true });
  dados.pushTokens = pushTokens;
  try { localStorage.removeItem(CH_TOKEN(uid)); } catch {}
  if (!teste() && PUSH_VAPID) {
    try { const m = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js"); await m.deleteToken(m.getMessaging(window.firebaseApp)); } catch {}
  }
  return "desligado";
}

// O que receber (vale para todos os aparelhos da conta).
export async function salvarPrefPush(fb, uid, dados, pref) {
  const pushPref = { ...(dados.pushPref || {}), ...pref };
  await fb.setDoc(fb.doc(fb.db, "usuarios", uid), { pushPref }, { merge: true });
  dados.pushPref = pushPref;
  return pushPref;
}

// Uma vez por dia (firebase.js): o token pode mudar; se mudou, grava o novo.
export async function renovarPush(fb, uid, dados) {
  try {
    if (!pushDisponivel() || Notification.permission !== "granted" || !tokenDoAparelho(uid) || dados.pushPref?.ligado === false) return;
    const ultimo = Number(localStorage.getItem("hf-push-renovado-" + uid) || 0);
    if (Date.now() - ultimo < 864e5) return;
    const token = teste() ? tokenDoAparelho(uid) : await pegarToken();
    if (token && (token !== tokenDoAparelho(uid) || !(dados.pushTokens || []).some((x) => x?.t === token))) await gravarToken(fb, uid, dados, token);
    else localStorage.setItem("hf-push-renovado-" + uid, String(Date.now()));
  } catch (e) { console.warn("[Notificações]", e?.message || e); }
}

// "Enviar um teste": a Cloud Function pushTeste manda para os aparelhos da pessoa.
export async function enviarTeste() {
  const f = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js");
  const fns = f.getFunctions(window.firebaseApp, REGIAO_FUNCOES);
  if (window.__hfFuncoesEmulador) f.connectFunctionsEmulator(fns, "127.0.0.1", window.__hfFuncoesEmulador); // só nos testes
  const fn = f.httpsCallable(fns, "pushTeste");
  return (await fn({})).data;
}
