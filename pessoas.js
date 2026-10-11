// =====================================================
// Busca de pessoas (Explorar, Nova conversa, pedidos do Social)
// Antes: baixava os 500 primeiros perfis por ordem alfabética e filtrava na tela
// (caro e, com mais de 500 contas, quem estava no fim do alfabeto não aparecia).
// Agora: o Firebase devolve só quem combina com o que foi digitado.
//   - começo do @usuário   (nickname, sempre minúsculo)
//   - começo do nome       ("ana" acha "Ana Paula")
//   - qualquer palavra     ("silva" acha "Ana Silva") — perfis_publicos.busca
// Sem nada digitado: pessoas ativas recentemente.
// =====================================================
import { docsComValidade } from "./leituras.js?v=1";

// Palavras do nome e do @, minúsculas e sem acento (gravadas em perfis_publicos.busca).
export const semAcento = (v) => String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export function palavrasBusca(nome, nickname) {
  const p = semAcento(nome).split(/[^a-z0-9]+/).filter((x) => x.length >= 2);
  if (nickname) p.push(semAcento(nickname));
  return [...new Set(p)].slice(0, 12).map((x) => x.slice(0, 30));
}

const cache = new Map();
const lembrar = (chave, promessa) => {
  const c = cache.get(chave);
  if (c && Date.now() - c.em < 60000) return c.p;
  cache.set(chave, { em: Date.now(), p: promessa });
  return promessa;
};
// Contas desativadas (conta.js) não aparecem na busca.
const ativa = (p) => (p?.desativadaAte?.toMillis?.() ?? 0) <= Date.now();
const lista = (snap) => snap.docs.map((d) => ({ uid: d.id, ...d.data() })).filter(ativa);

// Quem esteve no site por último (sugestões quando a busca está vazia).
export function pessoasRecentes(fb, { limite = 30 } = {}) {
  // "Ativos recentemente" vale por 10 min no aparelho.
  return lembrar("recentes" + limite, docsComValidade(fb, "recentes-" + limite, fb.query(fb.collection(fb.db, "perfis_publicos"), fb.orderBy("ultimoAcesso", "desc"), fb.limit(limite)), 10 * 60000)
    .then(lista).catch(() => []));
}

export function buscarPessoas(fb, termo, { limite = 20 } = {}) {
  const t = String(termo || "").trim().replace(/^@/, "");
  if (!t) return pessoasRecentes(fb, { limite });
  return lembrar("b:" + t.toLowerCase() + limite, (async () => {
    const col = fb.collection(fb.db, "perfis_publicos");
    const prefixo = (campo, v) => fb.getDocs(fb.query(col, fb.orderBy(campo), fb.startAt(v), fb.endAt(v + ""), fb.limit(limite))).then(lista).catch(() => []);
    const minus = t.toLowerCase();
    const cap = (s) => s.replace(/(^|\s)\S/g, (l) => l.toUpperCase());
    const variantes = [...new Set([t, minus, cap(minus), minus.charAt(0).toUpperCase() + minus.slice(1)])];
    const palavra = semAcento(t).split(/[^a-z0-9]+/).filter((x) => x.length >= 2)[0];
    const res = await Promise.all([
      prefixo("nickname", minus.replace(/\s+/g, "")),
      ...variantes.map((v) => prefixo("nome", v)),
      palavra ? fb.getDocs(fb.query(col, fb.where("busca", "array-contains", palavra), fb.limit(limite))).then(lista).catch(() => []) : []
    ]);
    // Junta sem repetir e confere de novo na tela (a busca por palavra é exata).
    const vistos = new Map();
    const palavras = semAcento(t).split(/\s+/).filter(Boolean);
    res.flat().forEach((p) => {
      if (vistos.has(p.uid)) return;
      const nome = semAcento(p.nome), nick = semAcento(p.nickname);
      if (palavras.every((x) => nome.includes(x) || nick.includes(x))) vistos.set(p.uid, p);
    });
    return [...vistos.values()].slice(0, limite * 2);
  })());
}
