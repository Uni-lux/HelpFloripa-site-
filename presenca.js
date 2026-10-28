// =====================================================
// Presença em todas as páginas: grava perfis_publicos.ultimoAcesso (o mesmo campo do "online" do chat)
// no máximo a cada 4 minutos, com a página à vista. Quem desligou "Mostrar quando estou online"
// (ultimoAcesso = null, gravado pelas configurações do chat) continua escondido.
// Usado pela bolinha verde "online agora" (vitrines) e pelo topo das conversas.
// =====================================================
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const INTERVALO = 4 * 60000;
export const ONLINE_MS = 10 * 60000; // até 10 min depois do último sinal conta como "online agora"
export const estaOnline = (ultimoAcesso) => {
  const t = ultimoAcesso?.toMillis?.() ?? (ultimoAcesso?.seconds ? ultimoAcesso.seconds * 1000 : 0);
  return !!t && Date.now() - t < ONLINE_MS;
};

export function ligarPresenca(db, uid) {
  if (!db || !uid || window.__hfPresenca === uid) return;
  window.__hfPresenca = uid;
  const chave = "hf-presenca-" + uid;
  let gravando = false;
  const marcar = async () => {
    if (document.hidden || gravando) return;
    let ultimo = 0;
    try { ultimo = Number(localStorage.getItem(chave)) || 0; } catch {}
    if (Date.now() - ultimo < INTERVALO) return;
    gravando = true;
    try { localStorage.setItem(chave, String(Date.now())); } catch {}
    try {
      const ref = doc(db, "perfis_publicos", uid);
      const s = await getDoc(ref);
      if (s.exists() && s.data().ultimoAcesso === null) return; // escolheu não mostrar quando está online
      await setDoc(ref, { uid, ultimoAcesso: serverTimestamp() }, { merge: true });
    } catch (e) { console.warn("[Presença]", e?.code || e); }
    finally { gravando = false; }
  };
  marcar();
  setInterval(marcar, 60000);
  document.addEventListener("visibilitychange", marcar);
}
