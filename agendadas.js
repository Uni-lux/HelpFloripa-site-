// =====================================================
// Publicações agendadas (13/11/2026).
// Antes, a agendada ficava no Diário com `agendadoPara` no futuro: o site escondia, mas um app modificado lia
// numa lista antes da hora. Agora ela fica em agendadas/{id} (só o autor lê) e, na hora, o aparelho do autor
// publica no Diário com o mesmo id, passando por todas as regras de sempre, e apaga daqui.
// Sem servidor (plano Blaze), a publicação sai quando o autor abrir o site depois da hora marcada
// (firebase.js chama publicarVencidas uma vez por sessão). Com o Blaze, uma função pode publicar na hora certa.
// Sem dependência do rede.js.
// =====================================================
import { comRitmo } from "./ritmo.js?v=3";

// Campos que as regras antigas não conhecem (mesma lista do formulário de publicar, rede.js).
export const NOVOS_PUB = ["tipo", "estilo", "titulo", "layout", "publico", "quemComenta", "ocultarNotas"];
const ms = (t) => t?.toMillis?.() ?? (t instanceof Date ? t.getTime() : Number(t) || 0);
const col = (fb) => fb.collection(fb.db, "agendadas");

// Guarda a publicação para depois. post = o que iria para o Diário (sem criadoEm e sem agendadoPara).
export async function agendar(fb, uid, post, quando) {
  const ref = fb.doc(col(fb));
  const dados = { ...post, autorId: uid };
  delete dados.criadoEm; delete dados.agendadoPara;
  await fb.setDoc(ref, { autorId: uid, quando, dados, criadoEm: fb.serverTimestamp() });
  return ref;
}

// As suas agendadas, no formato de publicação (para o perfil): agendadoPara = a hora marcada e _agendada = true.
export async function minhasAgendadas(fb, uid) {
  const s = await fb.getDocs(fb.query(col(fb), fb.where("autorId", "==", uid), fb.limit(60)));
  return s.docs.map((d) => ({ ...d.data().dados, id: d.id, autorId: uid, agendadoPara: d.data().quando, criadoEm: d.data().criadoEm, _agendada: true }))
    .sort((a, b) => ms(a.agendadoPara) - ms(b.agendadoPara));
}

export async function mudarHora(fb, id, quando) {
  await fb.updateDoc(fb.doc(fb.db, "agendadas", id), { quando, atualizadoEm: fb.serverTimestamp() });
}
export async function apagarAgendada(fb, id) {
  await fb.deleteDoc(fb.doc(fb.db, "agendadas", id));
}

// Guarda a enquete nos dados da conta: quando terminar, o resultado vem nas notificações (igual ao rede.js).
async function registrarEnquete(fb, uid, alvo, e) {
  const fim = ms(e?.fimEm);
  if (!fim || Number.isInteger(e?.certa)) return;
  try {
    const ref = fb.doc(fb.db, "usuarios", uid);
    const u = await fb.getDoc(ref);
    const lista = (Array.isArray(u.data()?.enquetes) ? u.data().enquetes : []).filter((x) => x?.a !== alvo && x.f > Date.now() - 30 * 864e5);
    lista.push({ a: alvo, p: e.pergunta, o: e.opcoes, f: fim, ...(e.anonima ? { an: true } : {}) });
    await fb.setDoc(ref, { enquetes: lista.slice(-40) }, { merge: true });
  } catch {}
}

// Publica agora (na hora marcada ou pelo "Publicar agora"). perfil: nome e foto de agora (opcional).
export async function publicarAgendada(fb, uid, id, { perfil = null } = {}) {
  const aRef = fb.doc(fb.db, "agendadas", id);
  const s = await fb.getDoc(aRef);
  if (!s.exists()) return null;
  const { dados = {}, quando } = s.data();
  const p = { ...dados, autorId: uid };
  delete p.agendadoPara; delete p.criadoEm;
  if (perfil?.nome) p.nome = perfil.nome;
  if (perfil && typeof perfil.fotoPerfil === "string" && /^https:\/\//.test(perfil.fotoPerfil)) p.fotoPerfil = perfil.fotoPerfil;
  // Enquete: a mesma duração, contada de agora (a pessoa escolheu "1 dia" a partir de quando aparece).
  if (p.enquete?.fimEm) {
    const dur = Math.min(7 * 864e5, Math.max(3600e3, ms(p.enquete.fimEm) - (ms(quando) || Date.now())));
    p.enquete = { ...p.enquete, fimEm: fb.Timestamp.fromMillis(Date.now() + dur) };
  }
  const ref = fb.doc(fb.db, "diario", id);
  const gravar = (obj) => comRitmo(fb, uid, "pub", (lote) => { lote.set(ref, { ...obj, criadoEm: fb.serverTimestamp() }); lote.delete(aRef); return ref; });
  // Regras antigas: tenta sem os campos novos (título vai junto no texto), depois só o básico.
  const meio = () => {
    const o = Object.fromEntries(Object.entries(p).filter(([k]) => !NOVOS_PUB.includes(k)));
    if (p.titulo) o.texto = `${p.titulo}\n\n${p.texto || ""}`.slice(0, 1000);
    return o;
  };
  let final = p;
  try { await gravar(p); }
  catch (e) {
    if (e?.code !== "permission-denied") throw e;
    final = meio();
    await gravar(final);
  }
  if (final.enquete) registrarEnquete(fb, uid, "d_" + id, final.enquete);
  return { ...final, id };
}

// Ao entrar: publica as que já passaram da hora (uma leitura por sessão).
export async function publicarVencidas(fb, uid, opcoes = {}) {
  let lista = [];
  try { lista = (await fb.getDocs(fb.query(col(fb), fb.where("autorId", "==", uid), fb.limit(60)))).docs; } catch { return 0; }
  let n = 0;
  for (const d of lista) {
    if (ms(d.data().quando) > Date.now()) continue;
    try { if (await publicarAgendada(fb, uid, d.id, opcoes)) n++; } catch (e) { console.warn("[Agendadas]", d.id, e?.code || e); }
  }
  return n;
}

// Agendada antiga (de antes de 13/11/2026: ficava no Diário com agendadoPara no futuro): passa para agendadas/{id},
// com o mesmo id, numa gravação só. Feito pelo autor quando abre o próprio perfil.
export async function moverAntiga(fb, uid, post) {
  const quando = post.agendadoPara;
  if (!(ms(quando) > Date.now())) return false;
  const dados = Object.fromEntries(Object.entries(post).filter(([k]) => !["id", "agendadoPara", "criadoEm", "_agendada"].includes(k) && !k.startsWith("_")));
  const lote = fb.writeBatch(fb.db);
  lote.set(fb.doc(fb.db, "agendadas", post.id), { autorId: uid, quando, dados: { ...dados, autorId: uid }, criadoEm: fb.serverTimestamp() });
  lote.delete(fb.doc(fb.db, "diario", post.id));
  await lote.commit();
  return true;
}
