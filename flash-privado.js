// Leitura dos flashes de OUTRAS pessoas respeitando a privacidade (13/11/2026, sem dependências).
//
// As regras (match /stories) só deixam CONSULTAR:
//   - os flashes "para todos" (restrito == false);
//   - os de Amigos próximos em que você está na lista (lista array-contains você).
// Os "para todos, menos quem foi ocultado" a consulta não consegue separar: a fileira acha esses pelo índice
// stories_restritos (só autor, hora e negócios) e abre um por um; quem foi ocultado é recusado ao abrir.
//
// Antes da publicação das regras novas (e com flashes antigos, sem o campo "restrito") vale a consulta de sempre: ela
// é tentada primeiro e, quando as regras novas a recusam, a página passa a usar só o jeito novo (guardado no aparelho).
// Devolve DocumentSnapshots (d.id, d.data()), como o getDocs.

const CHAVE = "hf-flash-privado";
const DIA = 864e5;
const regrasNovas = () => { try { return localStorage.getItem(CHAVE) === "1"; } catch { return false; } };
const marcarNovas = () => { try { localStorage.setItem(CHAVE, "1"); } catch {} };
const lotes = (l, n = 30) => { const r = []; for (let i = 0; i < l.length; i += n) r.push(l.slice(i, i + n)); return r; };

// Amigos próximos em que você está: uma consulta por página, guardada 60 s.
let amigosCache = null;
function amigosDe(fb, uid, desde) {
  if (amigosCache && amigosCache.uid === uid && Date.now() - amigosCache.em < 60000) return amigosCache.p;
  const p = fb.getDocs(fb.query(fb.collection(fb.db, "stories"), fb.where("lista", "array-contains", uid), fb.where("criadoEm", ">=", desde), fb.orderBy("criadoEm", "desc"), fb.limit(100)))
    .then((s) => s.docs).catch((e) => { console.warn("Flash (amigos):", e?.code || e?.message); return []; });
  amigosCache = { uid, em: Date.now(), p };
  return p;
}
export function esquecerAmigosFlash() { amigosCache = null; }

// Os "para todos menos os ocultados": índice → abre cada um (o que for recusado fica de fora).
async function restritos(fb, consultas) {
  const ids = new Set();
  await Promise.all(consultas.map((q) => fb.getDocs(q).then((s) => s.docs.forEach((d) => ids.add(d.id)))
    .catch((e) => console.warn("Flash (restritos):", e?.code || e?.message))));
  const abertos = await Promise.all([...ids].map((id) => fb.getDoc(fb.doc(fb.db, "stories", id)).catch(() => null)));
  return abertos.filter((d) => d?.exists());
}

// { autores: [uids] } ou { negocio: "uid_tipo" }. limite por consulta.
export async function lerFlashesVisiveis(fb, uid, { autores = null, negocio = null, limite = 150 } = {}) {
  const desde = fb.Timestamp.fromMillis(Date.now() - DIA);
  const col = fb.collection(fb.db, "stories");
  const filtros = autores ? lotes(autores).map((l) => [fb.where("autorId", "in", l)]) : [[fb.where("negocios", "array-contains", negocio)]];
  const montar = (c, extra = []) => fb.query(c, ...extra, fb.where("criadoEm", ">=", desde), fb.orderBy("criadoEm", "desc"), fb.limit(limite));

  if (!regrasNovas()) {
    try { return (await Promise.all(filtros.map((f) => fb.getDocs(montar(col, f))))).flatMap((s) => s.docs); }
    catch (e) { if (e?.code !== "permission-denied") throw e; marcarNovas(); }
  }
  const [publicos, amigos, outros] = await Promise.all([
    Promise.all(filtros.map((f) => fb.getDocs(montar(col, [...f, fb.where("restrito", "==", false)])))).then((r) => r.flatMap((s) => s.docs)),
    amigosDe(fb, uid, desde),
    restritos(fb, filtros.map((f) => montar(fb.collection(fb.db, "stories_restritos"), f)))
  ]);
  const meus = autores ? new Set(autores) : null;
  const dosAmigos = amigos.filter((d) => { const x = d.data(); return meus ? meus.has(x.autorId) : (x.negocios || []).includes(negocio); });
  const vistos = new Set(), todos = [];
  for (const d of [...publicos, ...dosAmigos, ...outros]) if (!vistos.has(d.id)) { vistos.add(d.id); todos.push(d); }
  return todos;
}

// O que vai junto com o flash: "restrito" e, para todos com gente ocultada, o índice stories_restritos.
// Amigos próximos levam só a lista (sem quem foi ocultado); para todos não levam lista.
export function privacidadeDoFlash(d) {
  const x = { ...d };
  const amigos = x.publico === "amigos";
  if (amigos) {
    x.lista = (x.lista || []).filter((u) => !(x.ocultoPara || []).includes(u));
    delete x.ocultoPara;
  } else delete x.lista;
  if (!amigos && !(x.ocultoPara || []).length) delete x.ocultoPara;
  x.restrito = amigos || (x.ocultoPara || []).length > 0;
  const indice = x.restrito && !amigos ? { autorId: x.autorId, criadoEm: x.criadoEm, ...(x.negocios ? { negocios: x.negocios } : {}), ...(x.perfil === false ? { perfil: false } : {}) } : null;
  return { doc: x, indice };
}
