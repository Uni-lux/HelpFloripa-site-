// =====================================================
// Limite diário (anti-spam): mensagens, publicações, comentários, propostas de parceria e flashes.
// ritmo/{uid} = janela de 24 h a partir da primeira ação, com um contador por tipo.
// Cada envio grava o item e soma 1 no contador NA MESMA operação; as regras do
// Firestore recusam o item sem essa soma ou acima do limite.
// =====================================================
export const LIMITES = { msg: 500, pub: 20, com: 200, parc: 3, flash: 50 };
const NOMES = { msg: "mensagens", pub: "publicações", com: "comentários", parc: "propostas de parceria", flash: "flashes" };
const DIA = 86400000;
let estado = null; // { uid, inicio (ms), msg, pub, com, parc, flash }

async function ler(fb, uid) {
  try {
    const s = await fb.getDoc(fb.doc(fb.db, "ritmo", uid));
    const d = s.exists() ? s.data() : {};
    estado = { uid, inicio: d.inicio?.toMillis?.() ?? 0, msg: d.msg || 0, pub: d.pub || 0, com: d.com || 0, parc: d.parc || 0, flash: d.flash || 0 };
  } catch { estado = { uid, inicio: 0, msg: 0, pub: 0, com: 0, parc: 0, flash: 0 }; }
}

export class LimiteDiario extends Error {
  constructor(tipo) { super(`Você chegou ao limite de ${LIMITES[tipo]} ${NOMES[tipo]} por dia. Tente de novo mais tarde.`); this.code = "limite-diario"; }
}

// escrever(lote) põe no lote a gravação do item (lote.set(ref, dados)) e devolve o que quiser.
export async function comRitmo(fb, uid, tipo, escrever) {
  if (!estado || estado.uid !== uid) await ler(fb, uid);
  const ref = fb.doc(fb.db, "ritmo", uid);
  let nova = !estado.inicio || Date.now() - estado.inicio >= DIA;
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    if (!nova && estado[tipo] >= LIMITES[tipo]) throw new LimiteDiario(tipo);
    const lote = fb.writeBatch(fb.db);
    const resultado = escrever(lote);
    // "flash" só vai quando é um flash (as regras de antes não conhecem o campo e recusariam as outras ações).
    if (nova) lote.set(ref, { inicio: fb.serverTimestamp(), msg: tipo === "msg" ? 1 : 0, pub: tipo === "pub" ? 1 : 0, com: tipo === "com" ? 1 : 0, parc: tipo === "parc" ? 1 : 0, ...(tipo === "flash" ? { flash: 1 } : {}), ultimaEm: fb.serverTimestamp(), ultimoTipo: tipo });
    else lote.set(ref, { [tipo]: fb.increment(1), ultimaEm: fb.serverTimestamp(), ultimoTipo: tipo }, { merge: true });
    try {
      await lote.commit();
      if (nova) estado = { uid, inicio: Date.now(), msg: 0, pub: 0, com: 0, parc: 0, flash: 0 };
      estado[tipo]++;
      return resultado;
    } catch (e) {
      if (e?.code !== "permission-denied" || tentativa > 0) throw e;
      // O relógio do aparelho ou outra aba pode ter mudado a janela: relê e tenta do outro jeito.
      await ler(fb, uid);
      const novaLida = !estado.inicio || Date.now() - estado.inicio >= DIA;
      nova = novaLida === nova ? !nova : novaLida;
    }
  }
}
