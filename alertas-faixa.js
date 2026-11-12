// =====================================================
// Faixa "SOS · Pets · Alertas" no Mural da Comunidade: quantos pedidos de ajuda, pets perdidos e alertas de
// roubo há perto agora (leva para alertas.html). Lê só quando há posição guardada (GPS do aparelho).
// =====================================================
import { vizinhos, sosVivo } from "./alertas-base.js?v=1";
import { posicaoGuardada } from "./perto.js?v=3";
const ms = (t) => (t?.toMillis ? t.toMillis() : 0);
(async () => {
  const faixa = document.getElementById("muAlertas");
  if (!faixa) return;
  for (let i = 0; i < 100 && !window.firebaseDb; i++) await new Promise((r) => setTimeout(r, 100));
  const pos = posicaoGuardada();
  if (!window.firebaseDb || !pos) return;
  try {
    const fs = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const db = window.firebaseDb, perto = vizinhos(pos.lat, pos.lng, 4);
    const contar = (sel, n) => { const b = faixa.querySelector(sel + " b"); if (b) { b.textContent = n > 9 ? "9+" : String(n); b.classList.toggle("tem", n > 0); } };
    const [sos, pets, oc] = await Promise.all([
      fs.getDocs(fs.query(fs.collection(db, "sos"), fs.where("publico", "==", true), fs.where("status", "in", ["aberto", "atendido"]), fs.where("geo4", "in", perto), fs.limit(30))).catch(() => null),
      fs.getDocs(fs.query(fs.collection(db, "pets"), fs.where("visivel", "==", true), fs.where("status", "==", "perdido"), fs.where("geo4", "in", perto), fs.limit(30))).catch(() => null),
      fs.getDocs(fs.query(fs.collection(db, "ocorrencias"), fs.where("status", "==", "ativo"), fs.where("geo4", "in", perto), fs.limit(30))).catch(() => null)
    ]);
    if (sos) contar(".sos", sos.docs.map((d) => d.data()).filter((s) => sosVivo(s)).length);
    if (pets) contar(".pets", pets.size);
    if (oc) contar(".roubos", oc.docs.filter((d) => Date.now() - ms(d.data().quando) < 7 * 864e5).length);
  } catch {}
})();
