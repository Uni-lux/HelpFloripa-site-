// =====================================================
// Mensagens guardadas no aparelho (09/11/2026, pedido do dono: "como no WhatsApp"). Sem dependências.
// Ao abrir uma conversa, as últimas mensagens aparecem NA HORA a partir do aparelho (IndexedDB hf-msgs, por conta) e o
// servidor só manda o que é novo: o mensagens-app.js escuta apenas as mensagens criadas depois da última guardada
// (com 15 min de folga, porque editar/apagar só vale até 10 min do envio). Assim cada abertura lê poucas mensagens
// em vez das 150 de sempre. Uma vez por dia a conversa é relida inteira (pega o que foi apagado de vez depois de 24 h).
// =====================================================
const BANCO = "hf-msgs", LOJA = "conversas";
export const GUARDAR = 200;               // mensagens guardadas por conversa
export const MAX_CONVERSAS = 80;          // as menos usadas saem
export const FOLGA_MS = 15 * 60 * 1000;   // janela do "só o que é novo"
export const CHEIO_MS = 24 * 60 * 60 * 1000;

let dbP = null;
function abrir() {
  if (dbP) return dbP;
  dbP = new Promise((ok, erro) => {
    if (!("indexedDB" in self)) return erro(new Error("sem IndexedDB"));
    const r = indexedDB.open(BANCO, 1);
    r.onupgradeneeded = () => { const s = r.result.createObjectStore(LOJA, { keyPath: "k" }); s.createIndex("uid", "uid"); };
    r.onsuccess = () => ok(r.result); r.onerror = () => erro(r.error);
  }).catch((e) => { dbP = null; throw e; });
  return dbP;
}
const req = (r) => new Promise((ok, erro) => { r.onsuccess = () => ok(r.result); r.onerror = () => erro(r.error); });
async function loja(modo) { const db = await abrir(); return db.transaction(LOJA, modo).objectStore(LOJA); }

const ehData = (v) => !!v && typeof v === "object" && typeof v.toMillis === "function" && typeof v.seconds === "number";
function paraTexto(lista) {
  return JSON.stringify(lista, function (k, v) {
    const orig = this[k];
    if (ehData(orig)) return { __ts: [orig.seconds, orig.nanoseconds || 0] };
    return v;
  });
}
function deTexto(texto, Timestamp) {
  return JSON.parse(texto, (k, v) => (v && typeof v === "object" && Array.isArray(v.__ts) && Object.keys(v).length === 1
    ? new Timestamp(Number(v.__ts[0]) || 0, Number(v.__ts[1]) || 0) : v));
}
const msDe = (t) => t?.toMillis?.() ?? 0;

// { msgs, salvoEm, cheioEm, temMais } ou null
export async function lerConversa(uid, conv, Timestamp) {
  try {
    const s = await loja("readonly");
    const it = await req(s.get(uid + "|" + conv));
    if (!it?.texto) return null;
    const msgs = deTexto(it.texto, Timestamp);
    return Array.isArray(msgs) && msgs.length ? { msgs, salvoEm: it.salvoEm || 0, cheioEm: it.cheioEm || 0, temMais: !!it.temMais } : null;
  } catch { return null; }
}

// Guarda as últimas (sem as que ainda estão saindo). cheio = veio da leitura completa (vale por 24 h).
const pendentes = new Map();
export function guardarConversa(uid, conv, msgs, { cheio = false, temMais = false } = {}) {
  const k = uid + "|" + conv;
  const antes = pendentes.get(k);
  clearTimeout(antes?.t);
  const dados = { msgs, cheio: cheio || !!antes?.cheio, temMais };
  const t = setTimeout(() => { pendentes.delete(k); gravar(uid, conv, dados).catch(() => {}); }, 600);
  pendentes.set(k, { t, cheio: dados.cheio });
}
async function gravar(uid, conv, { msgs, cheio, temMais }) {
  const lista = msgs.filter((m) => !m.pendente && msDe(m.criadoEm)).slice(-GUARDAR).map(({ pendente, ...m }) => m);
  if (!lista.length) return;
  const s = await loja("readwrite");
  const k = uid + "|" + conv;
  const ja = await req(s.get(k));
  await req(s.put({ k, uid, conv, texto: paraTexto(lista), salvoEm: Date.now(), cheioEm: cheio ? Date.now() : (ja?.cheioEm || 0), temMais: !!temMais }));
  podar(uid).catch(() => {});
}
let podadoEm = 0;
async function podar(uid) {
  if (Date.now() - podadoEm < 60000) return; podadoEm = Date.now();
  const s = await loja("readwrite");
  const todas = await req(s.index("uid").getAll(uid));
  if (todas.length <= MAX_CONVERSAS) return;
  todas.sort((a, b) => (b.salvoEm || 0) - (a.salvoEm || 0)).slice(MAX_CONVERSAS).forEach((x) => s.delete(x.k));
}
export async function esquecerConversa(uid, conv) { try { const s = await loja("readwrite"); await req(s.delete(uid + "|" + conv)); } catch {} }

// Junta o que está guardado com o que o servidor mandou da janela "só o novo": as antigas ficam, as da janela vêm
// do servidor (assim uma editada/apagada na janela aparece certa e uma apagada de vez some).
export function juntar(guardadas, doServidor, corteMs) {
  const antigas = guardadas.filter((m) => msDe(m.criadoEm) <= corteMs);
  const ids = new Set(doServidor.map((m) => m.id));
  return antigas.filter((m) => !ids.has(m.id)).concat(doServidor);
}
export const maisRecente = (msgs) => msgs.reduce((x, m) => Math.max(x, msDe(m.criadoEm)), 0);
