// =====================================================
// Flash "direto" (como o Instagram): o Mensagens já leu o flash para desenhar a miniatura no chat; ao tocar, o visor
// usa esse mesmo flash em vez de baixar de novo (cada flash pode ter quase 1 MB com a foto dentro do documento).
// Sem dependências: usado pelo mensagens-app.js (quem já leu) e pelo stories.js (quem abre o visor).
// - Na rede (rede.html) o flash vai como texto para o quadro do Diário (outra janela: as datas do Firestore de uma
//   janela não valem na outra, por isso vão marcadas e são refeitas com o Timestamp de quem abre).
// - Fora da rede o Mensagens troca de página (feed.html?flash=ID) e deixa o flash guardado na aba por 2 min.
// =====================================================
const CHAVE = "hf-flash-pronto";
const MAX = 2500000; // letras: o sessionStorage tem uns 5 MB por site

const ehData = (v) => !!v && typeof v === "object" && typeof v.toMillis === "function" && typeof v.seconds === "number";

// Flash (objeto lido do Firestore, com o id) → texto. As datas viram {"__ts": [segundos, nanossegundos]}.
export function textoDoFlash(f) {
  if (!f?.id) return "";
  try {
    return JSON.stringify(f, function (k, v) {
      const orig = this[k];
      if (ehData(orig)) return { __ts: [orig.seconds, orig.nanoseconds || 0] };
      return v;
    });
  } catch { return ""; }
}

// Texto → flash, com as datas refeitas pelo Timestamp de quem vai usar. Só devolve se for o flash pedido.
export function lerFlashTexto(texto, id, Timestamp) {
  if (!texto || typeof texto !== "string") return null;
  try {
    const f = JSON.parse(texto, (k, v) => (v && typeof v === "object" && Array.isArray(v.__ts) && Object.keys(v).length === 1
      ? new Timestamp(Number(v.__ts[0]) || 0, Number(v.__ts[1]) || 0) : v));
    return f && f.id === id && typeof f.autorId === "string" ? f : null;
  } catch { return null; }
}

// Guarda na aba antes de trocar de página (feed.html?flash=ID lê com pegarGuardado).
export function guardarParaAbrir(texto) {
  try {
    sessionStorage.removeItem(CHAVE);
    if (!texto || texto.length > MAX) return;
    const id = JSON.parse(texto).id;
    sessionStorage.setItem(CHAVE, JSON.stringify({ id, em: Date.now(), texto }));
  } catch {}
}
export function pegarGuardado(id) {
  try {
    const x = JSON.parse(sessionStorage.getItem(CHAVE) || "null");
    if (!x || x.id !== id) return "";
    sessionStorage.removeItem(CHAVE);
    return Date.now() - Number(x.em || 0) < 120000 ? String(x.texto || "") : "";
  } catch { return ""; }
}
