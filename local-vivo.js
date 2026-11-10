// =====================================================
// Localização em tempo real no chat (como no WhatsApp).
// locais_vivos/{id} {uid, conv, participantes, lat, lng, precisao, rumo, ate, parado}. Quem compartilha atualiza a
// posição enquanto qualquer página do Help Floripa estiver aberta (o navegador não deixa rodar com tudo fechado);
// só UMA janela atualiza (Web Locks), mesmo com várias abas e os quadros da rede.
// O aparelho guarda quais estão ativos em hf-local-vivo-<uid> [{id, ate}] para continuar ao trocar de página.
// =====================================================
export const DURACOES = [[15, "15 minutos"], [60, "1 hora"], [480, "8 horas"]];
const chave = (uid) => `hf-local-vivo-${uid}`;
const ms = (t) => (t?.toMillis ? t.toMillis() : typeof t === "number" ? t : 0);
export function ativosDoAparelho(uid) {
  try { return (JSON.parse(localStorage.getItem(chave(uid)) || "[]") || []).filter((x) => x && x.id && x.ate > Date.now()); } catch { return []; }
}
function guardar(uid, lista) {
  try { if (lista.length) localStorage.setItem(chave(uid), JSON.stringify(lista)); else localStorage.removeItem(chave(uid)); } catch {}
}
export const encerrado = (d, agora = Date.now()) => !d || d.parado === true || ms(d.ate) <= agora;
export function textoRestante(d, agora = Date.now()) {
  const f = ms(d?.ate) - agora;
  if (encerrado(d, agora)) return "Compartilhamento encerrado";
  const min = Math.ceil(f / 60000);
  const ate = new Date(ms(d.ate)).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return min < 60 ? `Ao vivo · termina em ${min} min` : `Ao vivo · até ${ate}`;
}
function lerGps(ms = 12000) {
  return new Promise((ok) => {
    if (!navigator.geolocation) { ok(null); return; }
    navigator.geolocation.getCurrentPosition((p) => ok(p.coords), () => ok(null), { enableHighAccuracy: true, timeout: ms, maximumAge: 10000 });
  });
}
const pos = (c) => ({ lat: Math.round(c.latitude * 1e5) / 1e5, lng: Math.round(c.longitude * 1e5) / 1e5, precisao: Math.round(c.accuracy || 0), rumo: Number.isFinite(c.heading) ? Math.round(c.heading) : 0 });

// Começa a compartilhar na conversa (minutos: 15, 60 ou 480). Devolve o id do documento.
// `inicial` = posição que a tela já tem ({latitude, longitude, accuracy}); sem ela, pede ao GPS.
export async function compartilharAoVivo(fb, uid, conv, minutos, inicial = null) {
  const ids = String(conv).split("_");
  if (ids.length !== 2 || !ids.includes(uid)) throw new Error("conversa");
  const c = inicial || await lerGps();
  if (!c) throw new Error("gps");
  const ate = fb.Timestamp.fromMillis(Date.now() + Math.min(480, minutos) * 60000 - 5000);
  const ref = await fb.addDoc(fb.collection(fb.db, "locais_vivos"), {
    uid, conv, participantes: [...ids].sort(), ...pos(c), ate, parado: false, criadoEm: fb.serverTimestamp(), atualizadoEm: fb.serverTimestamp()
  });
  guardar(uid, [...ativosDoAparelho(uid).filter((x) => x.id !== ref.id), { id: ref.id, ate: ate.toMillis() }]);
  continuarCompartilhando(fb, uid);
  return ref.id;
}
export async function pararCompartilhar(fb, uid, id) {
  guardar(uid, ativosDoAparelho(uid).filter((x) => x.id !== id));
  await fb.updateDoc(fb.doc(fb.db, "locais_vivos", id), { parado: true, atualizadoEm: fb.serverTimestamp() });
}

// Mantém a posição atualizada (a cada 10 s andando ou 15 m, e pelo menos a cada 60 s parado).
let rodando = false;
export function continuarCompartilhando(fb, uid) {
  if (rodando || !ativosDoAparelho(uid).length || !navigator.geolocation) return;
  rodando = true;
  const trabalho = () => new Promise((fim) => {
    let ultimo = null, ultimoEm = 0, vigia = null;
    const enviar = async (c, forcar) => {
      const lista = ativosDoAparelho(uid);
      if (!lista.length) { parar(); return; }
      const p = pos(c);
      const andou = ultimo ? Math.hypot((p.lat - ultimo.lat) * 111000, (p.lng - ultimo.lng) * 111000 * Math.cos(p.lat * Math.PI / 180)) : 999;
      if (!forcar && Date.now() - ultimoEm < 10000 && andou < 15) return;
      if (!forcar && andou < 15 && Date.now() - ultimoEm < 60000) return;
      ultimo = p; ultimoEm = Date.now();
      for (const x of lista) {
        try { await fb.updateDoc(fb.doc(fb.db, "locais_vivos", x.id), { ...p, atualizadoEm: fb.serverTimestamp() }); }
        catch (e) { if (e?.code === "permission-denied" || e?.code === "not-found") guardar(uid, ativosDoAparelho(uid).filter((y) => y.id !== x.id)); }
      }
    };
    vigia = navigator.geolocation.watchPosition((p) => enviar(p.coords, false), () => {}, { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 });
    const relogio = setInterval(async () => {
      if (!ativosDoAparelho(uid).length) { parar(); return; }
      const c = await lerGps(8000); if (c) enviar(c, true);
    }, 60000);
    function parar() { if (vigia != null) navigator.geolocation.clearWatch(vigia); clearInterval(relogio); rodando = false; fim(); }
    // Já manda uma posição ao começar (quem abriu a conversa vê na hora).
    lerGps(8000).then((c) => c && enviar(c, true));
  });
  if (navigator.locks?.request) navigator.locks.request(`hf-local-vivo-${uid}`, trabalho).catch(() => { rodando = false; });
  else trabalho();
}
// Escuta um compartilhamento (quem recebe e quem envia veem igual).
export function ouvirLocalVivo(fb, id, aoMudar) {
  return fb.onSnapshot(fb.doc(fb.db, "locais_vivos", id), (s) => aoMudar(s.exists() ? { id: s.id, ...s.data() } : null), () => aoMudar(null));
}
