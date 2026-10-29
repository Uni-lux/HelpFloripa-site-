// =====================================================
// Quantas mensagens não lidas há numa conversa (não só "a conversa tem novidade").
// Usado pelo número das Mensagens (rede.js e categoria.js), pelo sino (painel-avisos.js) e pela página de
// notificações: "Fulano enviou 26 mensagens". Conta no servidor (1 contagem por conversa com novidade) as
// mensagens do outro depois da sua última leitura; guarda pela data da última mensagem (não conta de novo
// enquanto nada mudar). Sem dependências.
// =====================================================
const cache = new Map(); // "conversa:atualizadoEm" -> Promise<número>
const ms = (t) => (t?.toMillis ? t.toMillis() : t?.seconds ? t.seconds * 1000 : Number(t) || 0);
const CHAVE = "hf-msg-novas";
function guardado() { try { return JSON.parse(sessionStorage.getItem(CHAVE) || "{}"); } catch { return {}; } }
function guardar(k, n) { try { const g = guardado(); g[k] = n; const ks = Object.keys(g); if (ks.length > 120) delete g[ks[0]]; sessionStorage.setItem(CHAVE, JSON.stringify(g)); } catch {} }

// Momento da sua última leitura da conversa (confirmação de leitura, contador ou conversa apagada para você).
export const lidoDe = (c, uid) => Math.max(ms(c.lidoEm?.[uid]), ms(c.vistoEm?.[uid]), ms(c.ocultaPara?.[uid]));
export const temNovas = (c, uid) => !!c.ultimaMensagemRemetenteId && c.ultimaMensagemRemetenteId !== uid && ms(c.atualizadoEm) > lidoDe(c, uid);

// fs = funções do Firestore (collection, query, where, getCountFromServer, Timestamp), db, conversa {id, ...dados}
export function contarNovas(fs, db, uid, c) {
  if (!temNovas(c, uid)) return Promise.resolve(0);
  const k = `${c.id}:${ms(c.atualizadoEm)}`;
  if (cache.has(k)) return cache.get(k);
  const g = guardado();
  if (g[k] != null) { const p = Promise.resolve(g[k]); cache.set(k, p); return p; }
  const lido = lidoDe(c, uid);
  const col = fs.collection(db, "conversas", c.id, "mensagens");
  const q = lido ? fs.query(col, fs.where("criadoEm", ">", fs.Timestamp.fromMillis(lido))) : fs.query(col, fs.where("remetenteId", "==", (c.participantes || []).find((x) => x !== uid) || ""));
  const p = fs.getCountFromServer(q).then((r) => Math.max(1, r.data().count)).catch(() => 1);
  p.then((n) => guardar(k, n));
  cache.set(k, p);
  return p;
}
export const textoMensagens = (n) => (n > 1 ? `enviou ${n > 99 ? "99+" : n} mensagens` : "enviou uma mensagem");
