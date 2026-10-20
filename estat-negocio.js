// =====================================================
// Estatísticas dos negócios: conta visitas e ações dos clientes (sem dependência do rede.js).
// - neg_visitas/{negocio}_{uid}_{dia}: a visita da pessoa no dia (só ela lê), com origem, hora,
//   ações (WhatsApp, rota, site...) e itens vistos.
// - neg_stats/{negocio}_{dia}: os números do dia (só o dono lê). Cada número sobe +1 na MESMA
//   gravação da visita/ação (as regras conferem), então o dono vê quantos, nunca quem.
// Dia e hora no horário de Brasília (UTC-3), iguais aos que as regras calculam.
// Sem as regras publicadas, tudo falha em silêncio (o site segue normal).
// =====================================================
export const ORIGENS = {
  vitrine: "Vitrine da categoria", busca: "Busca", explorar: "Explorar", inicio: "Página inicial",
  perfil: "Seu perfil pessoal", link: "Link compartilhado", flash: "Flash", mensagens: "Mensagens", outro: "Outros"
};
export const ACOES = {
  whats: "WhatsApp", mensagem: "Mensagem no chat", orcamento: "Pedido de orçamento", pedido: "Pedido enviado",
  rota: "Como chegar", site: "Site", instagram: "Instagram", compartilhar: "Compartilhou", cupom: "Copiou o cupom", avaliar: "Avaliou"
};
// Ações que viram contato direto com o negócio (o que mais importa, como no Google Meu Negócio).
export const CONTATOS = ["whats", "mensagem", "orcamento", "pedido"];

export function agoraBR(t = Date.now()) {
  const d = new Date(t - 3 * 3600e3);
  return { dia: `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`, hora: d.getUTCHours() };
}
// Chave do item: o nome sem acento (sobrevive a mudar a ordem do cardápio/produtos).
export function chaveItem(nome) {
  const s = String(nome || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 30);
  return s ? "p_" + s : "";
}
export const chaveAnuncio = (id) => { const s = String(id || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 30); return s ? "an_" + s : ""; };

let ctx = { fb: null, eu: null };
// Quem chama informa o Firebase e a conta (a vitrine pode estar no perfil, no feed...).
export function usarEstat(fb, eu) { if (fb) ctx.fb = fb; if (eu) ctx.eu = eu; }

const visitas = new Map(); // "negocio|dia" -> Promise<{ ref, st, acoes, itens, fila } | null>
const idDe = (n) => n.id || `${n.donoId}_${n.tipo}`;

function garantirVisita(n, origem) {
  const { fb, eu } = ctx;
  if (!fb || !eu || !n?.donoId || eu.uid === n.donoId) return Promise.resolve(null);
  const negId = idDe(n);
  const { dia, hora } = agoraBR();
  const k = `${negId}|${dia}`;
  if (visitas.has(k)) return visitas.get(k);
  const p = (async () => {
    const ref = fb.doc(fb.db, "neg_visitas", `${negId}_${eu.uid}_${dia}`);
    const st = fb.doc(fb.db, "neg_stats", `${negId}_${dia}`);
    let snap;
    try { snap = await fb.getDoc(ref); } catch { return null; } // regras ainda não publicadas
    if (snap.exists()) { const d = snap.data(); return { ref, st, acoes: [...(d.acoes || [])], itens: [...(d.itens || [])], fila: Promise.resolve() }; }
    const o = ORIGENS[origem] ? origem : "outro";
    const visita = { negocioId: negId, uid: eu.uid, dia, hora, origem: o, acoes: [], itens: [] };
    // O dia normalmente já existe (outra pessoa visitou antes): sobe os números.
    try {
      const b = fb.writeBatch(fb.db);
      b.set(ref, visita);
      b.update(st, { v: fb.increment(1), [`o.${o}`]: fb.increment(1), [`h.${hora}`]: fb.increment(1) });
      await b.commit();
    } catch {
      // Primeira visita do dia: cria os números.
      try {
        const b = fb.writeBatch(fb.db);
        b.set(ref, visita);
        b.set(st, { negocioId: negId, donoId: n.donoId, dia, v: 1, o: { [o]: 1 }, h: { [String(hora)]: 1 }, a: {}, it: {} });
        await b.commit();
      } catch (e) { console.info("[Estatística] visita não contada:", e?.code || e?.message); visitas.delete(k); return null; }
    }
    return { ref, st, acoes: [], itens: [], fila: Promise.resolve() };
  })();
  visitas.set(k, p);
  return p;
}

export function registrarVisita(n, origem = "outro") { return garantirVisita(n, origem).catch(() => null); }

// Ação ou item: entra na lista da visita e sobe o número do dia, juntos. Uma vez por pessoa no dia.
async function somar(n, campo, x, origem) {
  if (!x) return;
  const v = await garantirVisita(n, origem).catch(() => null);
  if (!v) return;
  v.fila = v.fila.then(async () => {
    const lista = campo === "acoes" ? v.acoes : v.itens;
    if (lista.includes(x) || lista.length >= (campo === "acoes" ? 12 : 40)) return;
    const { fb } = ctx;
    try {
      const b = fb.writeBatch(fb.db);
      b.update(v.ref, { [campo]: [...lista, x] });
      b.update(v.st, { [`${campo === "acoes" ? "a" : "it"}.${x}`]: fb.increment(1) });
      await b.commit();
      lista.push(x);
    } catch (e) { console.info("[Estatística] não contou:", x, e?.code || e?.message); }
  });
  return v.fila;
}
export const registrarAcao = (n, acao, origem = "outro") => (ACOES[acao] ? somar(n, "acoes", acao, origem) : Promise.resolve());
export const registrarItem = (n, chave, origem = "outro") => somar(n, "itens", chave, origem);

// ---------- leitura (só o dono) ----------
// Todos os dias de todos os negócios da pessoa (a regra só deixa listar pelo donoId).
export async function lerStats(fb, uid) {
  const s = await fb.getDocs(fb.query(fb.collection(fb.db, "neg_stats"), fb.where("donoId", "==", uid), fb.limit(3000)));
  return s.docs.map((d) => d.data());
}
// Lista dos dias (AAAAMMDD, horário de Brasília), do mais antigo ao de hoje; desloca = quantos períodos para trás.
export function listaDias(n, desloca = 0) {
  const hoje = Date.now() - desloca * n * 864e5;
  return Array.from({ length: n }, (_, i) => agoraBR(hoje - (n - 1 - i) * 864e5).dia);
}
export const dataDoDia = (dia) => new Date(Date.UTC(+dia.slice(0, 4), +dia.slice(4, 6) - 1, +dia.slice(6, 8), 12));
// Soma os dias de um negócio: visitas, ações, origens, horas, itens, por dia e mapa de calor (dia da semana × hora).
export function somarPeriodo(stats, negId, dias) {
  const porDia = new Map(stats.filter((s) => s.negocioId === negId).map((s) => [s.dia, s]));
  const r = { v: 0, a: {}, o: {}, h: new Array(24).fill(0), it: {}, contatos: 0, serie: [], calor: Array.from({ length: 7 }, () => new Array(24).fill(0)) };
  const soma = (alvo, mapa) => Object.entries(mapa || {}).forEach(([k, q]) => { alvo[k] = (alvo[k] || 0) + (Number(q) || 0); });
  dias.forEach((dia) => {
    const s = porDia.get(dia);
    const v = Number(s?.v) || 0;
    const contatos = CONTATOS.reduce((t, k) => t + (Number(s?.a?.[k]) || 0), 0);
    r.serie.push({ dia, v, contatos, a: s?.a || {} });
    if (!s) return;
    r.v += v; r.contatos += contatos;
    soma(r.a, s.a); soma(r.o, s.o); soma(r.it, s.it);
    const sem = dataDoDia(dia).getUTCDay();
    Object.entries(s.h || {}).forEach(([hh, q]) => { const k = Number(hh); if (k >= 0 && k < 24) { r.h[k] += Number(q) || 0; r.calor[sem][k] += Number(q) || 0; } });
  });
  r.acoes = Object.values(r.a).reduce((t, q) => t + q, 0);
  return r;
}
