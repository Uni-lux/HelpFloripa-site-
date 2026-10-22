// =====================================================
// Firebase Storage para módulos sem o rede.js (Comunidade e outros).
// Com o Storage ligado (USAR_STORAGE no firebase.js), a foto vai para o Storage e o documento guarda só o link;
// desligado, devolve a própria foto ("data:") para ficar dentro do documento, como antes. Sem dependências.
// =====================================================
let fns = null;
export const temStorage = () => !!window.firebaseStorage;
async function storage() {
  if (!window.firebaseStorage) return null;
  if (!fns) { try { fns = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js"); } catch { fns = null; } }
  return fns;
}
// "data:" vira arquivo sem fetch (a CSP das páginas bloqueia fetch de data:).
function dataParaBlob(d) {
  const [cab, b64] = d.split(","); const bin = atob(b64); const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return new Blob([u], { type: cab.slice(5).split(";")[0] });
}
// caminho sem extensão, ex.: "comunidade/UID/abc" → "comunidade/UID/abc_lz3k9.jpg" (nome único: cache de 1 ano).
export async function subirFoto(dataUrl, caminho) {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) return dataUrl;
  const st = await storage();
  if (!st) return dataUrl;
  try {
    const r = st.ref(window.firebaseStorage, `${caminho}_${Date.now().toString(36)}.jpg`);
    await st.uploadBytes(r, dataParaBlob(dataUrl), { contentType: "image/jpeg", cacheControl: "public, max-age=31536000, immutable" });
    return await st.getDownloadURL(r);
  } catch (e) { console.warn("Storage indisponível, a foto fica no documento:", e?.message || e); return dataUrl; }
}
