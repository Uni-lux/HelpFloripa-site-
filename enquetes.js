// =====================================================
// Enquetes: duração (fimEm), prazo na tela e resultado nas notificações.
// - Publicação: 1 h, 6 h, 12 h, 1 dia (padrão) ou personalizado (até 7 dias a partir de quando aparece).
// - Flash: até 24 h (acaba junto com o flash).
// - Quando termina, o dono e quem votou recebem o resultado (Notificações, sino e painel).
//   O dono: usuarios/{uid}.enquetes = [{ a: alvo, p: pergunta, o: opcoes, f: fim em ms }] (só ele vê, sem regra nova).
//   Quem votou: enquete_votos com uid == eu e fimEm (o mesmo fim da enquete, conferido nas regras).
//   O resultado final não muda (depois do fim ninguém vota): fica guardado no aparelho (hf-enq-res).
// Sem dependência do rede.js: o painel de notificações (painel-avisos.js) também usa.
// =====================================================

export const MIN = 60000, HORA = 3600e3, DIA = 864e5;
export const DURACOES = [[60, "1 h"], [360, "6 h"], [720, "12 h"], [1440, "1 dia"]];
export const MAX_PUB_MIN = 7 * 1440;   // personalizado na publicação: até 7 dias
export const MAX_FLASH_MIN = 1440;     // no flash: até 24 h

const msDe = (t) => (t?.toMillis ? t.toMillis() : t instanceof Date ? t.getTime() : typeof t === "number" ? t : t?.seconds ? t.seconds * 1000 : 0);
export const fimDaEnquete = (e) => msDe(e?.fimEm);
export const encerrada = (e) => { const f = fimDaEnquete(e); return !!f && f <= Date.now(); };

// "termina em 5 h", "termina em 12 min", "termina em 2 dias"
export function faltaTexto(fim) {
  const r = fim - Date.now();
  if (r <= 0) return "Encerrada";
  if (r < HORA) return `termina em ${Math.max(1, Math.ceil(r / MIN))} min`;
  if (r < DIA) return `termina em ${Math.round(r / HORA)} h`;
  const d = Math.round(r / DIA);
  return `termina em ${d} ${d === 1 ? "dia" : "dias"}`;
}
export function dataCurta(ms) {
  return new Date(ms).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(".", "");
}

// Quem venceu (ou empate) em texto curto.
export function resumoResultado(opcoes, contas) {
  const total = contas.reduce((a, n) => a + n, 0);
  if (!total) return { total, texto: "terminou sem votos", vencedoras: [] };
  const maior = Math.max(...contas);
  const venc = contas.map((n, i) => (n === maior ? i : -1)).filter((i) => i >= 0);
  const pct = Math.round((maior / total) * 100);
  const votos = `${total} ${total === 1 ? "voto" : "votos"}`;
  const texto = venc.length > 1
    ? `empate entre ${venc.map((i) => `“${opcoes[i]}”`).join(" e ")} (${pct}% cada · ${votos})`
    : `“${opcoes[venc[0]]}” venceu com ${pct}% (${votos})`;
  return { total, texto, vencedoras: venc, pct };
}

// ---------- escolher a duração (compositor da publicação e criador do Flash) ----------
// estado = { dur: minutos } ou { fim: ms } (personalizado). base() = quando a enquete começa (agora ou a data agendada).
export function seletorDuracao(estado, { maxMin = MAX_PUB_MIN, base = () => Date.now(), escuro = false, aoMudar } = {}) {
  const box = document.createElement("div");
  box.className = "enq-dur" + (escuro ? " escuro" : "");
  const tit = document.createElement("div"); tit.className = "enq-dur-tit";
  const rot = document.createElement("span"); rot.textContent = "Duração";
  const quando = document.createElement("small");
  tit.append(rot, quando);
  const chips = document.createElement("div"); chips.className = "enq-dur-chips"; chips.setAttribute("role", "radiogroup"); chips.setAttribute("aria-label", "Duração da enquete");
  const campo = document.createElement("input"); campo.type = "datetime-local"; campo.className = "enq-dur-campo"; campo.hidden = true; campo.setAttribute("aria-label", "Quando a enquete termina");
  const paraCampo = (ms) => { const d = new Date(ms - new Date(ms).getTimezoneOffset() * MIN); return d.toISOString().slice(0, 16); };
  const opcoes = [...DURACOES.filter(([m]) => m <= maxMin), ["perso", "Personalizar"]];
  const fimAtual = () => (estado.fim ? estado.fim : base() + (estado.dur || 1440) * MIN);
  const pintar = () => {
    chips.replaceChildren(...opcoes.map(([m, r]) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "enq-dur-chip"; b.textContent = r; b.setAttribute("role", "radio");
      const sel = m === "perso" ? !!estado.fim : !estado.fim && (estado.dur || 1440) === m;
      b.setAttribute("aria-checked", String(sel)); if (sel) b.classList.add("on");
      b.addEventListener("click", () => {
        if (m === "perso") { estado.fim = Math.min(base() + maxMin * MIN, Math.max(base() + 2 * HORA, fimAtual())); delete estado.dur; }
        else { estado.dur = m; delete estado.fim; }
        pintar(); aoMudar?.();
        if (m === "perso") setTimeout(() => { try { campo.showPicker?.(); } catch {} campo.focus(); }, 30);
      });
      return b;
    }));
    campo.hidden = !estado.fim;
    campo.min = paraCampo(base() + 15 * MIN); campo.max = paraCampo(base() + maxMin * MIN);
    if (estado.fim) campo.value = paraCampo(estado.fim);
    quando.textContent = `Termina ${dataCurta(fimAtual())}`;
  };
  campo.addEventListener("change", () => {
    const v = new Date(campo.value).getTime();
    if (!v) return;
    estado.fim = Math.min(base() + maxMin * MIN, Math.max(base() + 15 * MIN, v));
    pintar(); aoMudar?.();
  });
  box.append(tit, chips, campo);
  pintar();
  box.atualizar = pintar;
  return box;
}
// Fim em ms a partir do estado do seletor; confere os limites (lança erro com texto para o usuário).
export function fimEscolhido(estado, { maxMin = MAX_PUB_MIN, base = Date.now() } = {}) {
  const fim = estado.fim || base + (estado.dur || 1440) * MIN;
  if (fim <= base) throw new Error("O fim da enquete precisa ser depois de ela aparecer. Ajuste a duração.");
  if (fim < base + 10 * MIN) throw new Error("A enquete precisa durar pelo menos 15 minutos.");
  if (fim > base + maxMin * MIN) throw new Error(maxMin <= 1440 ? "No flash a enquete dura no máximo 24 horas." : "A enquete dura no máximo 7 dias.");
  return fim;
}

// ---------- resultado guardado no aparelho ----------
const CH_RES = "hf-enq-res", CH_INFO = "hf-enq-info";
const lerLocal = (k) => { try { return JSON.parse(localStorage.getItem(k) || "{}") || {}; } catch { return {}; } };
const gravarLocal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
// Pergunta e opções de uma enquete em que votei (o flash some depois de 24 h; o resultado ainda precisa delas).
export function guardarInfoEnquete(alvo, item) {
  const m = lerLocal(CH_INFO);
  m[alvo] = { p: item.enquete.pergunta, o: item.enquete.opcoes, f: fimDaEnquete(item.enquete), u: item.autorId, n: item.nome || "" };
  const ks = Object.keys(m); if (ks.length > 120) ks.slice(0, ks.length - 120).forEach((k) => delete m[k]);
  gravarLocal(CH_INFO, m);
}
async function contarVotos(fs, db, alvo, n, anon = false) {
  const res = lerLocal(CH_RES);
  if (res[alvo]) return res[alvo].c;
  const col = fs.collection(db, "enquete_votos");
  const c = anon
    ? await fs.getDoc(fs.doc(db, "enquete_contas", alvo)).then((d) => Array.from({ length: n }, (_, i) => Number(d.exists() ? d.data()["n" + i] || 0 : 0)))
    : await Promise.all(Array.from({ length: n }, (_, i) => fs.getCountFromServer(fs.query(col, fs.where("alvo", "==", alvo), fs.where("opcao", "==", i))).then((x) => x.data().count)));
  res[alvo] = { c, em: Date.now() };
  const ks = Object.keys(res); if (ks.length > 200) ks.slice(0, ks.length - 200).forEach((k) => delete res[k]);
  gravarLocal(CH_RES, res);
  return c;
}

// Enquetes que terminaram (as minhas e as em que votei), dos últimos 30 dias, mais recentes primeiro.
// Cada item: { tipo: "enquete", id, alvo, itemTipo, itemId, uid (autor), souAutor, nome, pergunta, opcoes, contas, minha, quando }
export async function enquetesEncerradas(fs, db, uid, dadosUsuario = {}) {
  const agora = Date.now(), desde = agora - 30 * DIA;
  const minhas = (Array.isArray(dadosUsuario.enquetes) ? dadosUsuario.enquetes : []).filter((x) => x?.a && x.f && x.f <= agora && x.f > desde);
  const meusAlvos = new Set(minhas.map((x) => x.a));
  let votos = [];
  try {
    const s = await fs.getDocs(fs.query(fs.collection(db, "enquete_votos"), fs.where("uid", "==", uid), fs.limit(100)));
    votos = s.docs.map((d) => d.data()).filter((v) => v.fimEm && msDe(v.fimEm) <= agora && msDe(v.fimEm) > desde && !meusAlvos.has(v.alvo));
  } catch {}
  // Votos em enquetes anônimas (cada pessoa lista só os dela)
  try {
    const s = await fs.getDocs(fs.query(fs.collection(db, "enquete_anon"), fs.where("uid", "==", uid), fs.limit(100)));
    votos.push(...s.docs.map((d) => ({ ...d.data(), anon: true })).filter((v) => v.fimEm && msDe(v.fimEm) <= agora && msDe(v.fimEm) > desde && !meusAlvos.has(v.alvo)));
  } catch {}
  const info = lerLocal(CH_INFO);
  const lista = [
    ...minhas.map((x) => ({ alvo: x.a, souAutor: true, uid, pergunta: x.p, opcoes: x.o, quando: x.f, anon: !!x.an })),
    ...votos.map((v) => ({ alvo: v.alvo, souAutor: false, minha: Number(v.opcao), quando: msDe(v.fimEm), itemTipo: v.tipo, itemId: v.itemId, info: info[v.alvo], anon: !!v.anon }))
  ].sort((a, b) => b.quando - a.quando).slice(0, 15);
  const itens = await Promise.all(lista.map(async (x) => {
    const [itemTipo, ...resto] = x.alvo.split("_"); const itemId = resto.join("_");
    let pergunta = x.pergunta, opcoes = x.opcoes, autor = x.uid, nome = "";
    if (!x.souAutor) {
      if (x.info) { pergunta = x.info.p; opcoes = x.info.o; autor = x.info.u; nome = x.info.n; }
      else {
        const d = await fs.getDoc(fs.doc(db, itemTipo === "f" ? "stories" : "diario", itemId)).catch(() => null);
        if (!d?.exists()) return null;
        const dd = d.data();
        if (!dd.enquete) return null;
        pergunta = dd.enquete.pergunta; opcoes = dd.enquete.opcoes; autor = dd.autorId; nome = dd.nome || "";
        guardarInfoEnquete(x.alvo, { enquete: dd.enquete, autorId: dd.autorId, nome: dd.nome });
      }
    }
    if (!pergunta || !Array.isArray(opcoes)) return null;
    const contas = await contarVotos(fs, db, x.alvo, opcoes.length, x.anon).catch(() => null);
    if (!contas) return null;
    return { tipo: "enquete", id: "q_" + x.alvo, alvo: x.alvo, itemTipo, itemId, uid: autor, souAutor: x.souAutor, nome, pergunta, opcoes, contas, minha: x.minha, anon: x.anon, quando: x.quando };
  }));
  return itens.filter(Boolean);
}

// Texto da notificação ("Sua enquete terminou" / "<nome> · terminou a enquete em que você votou").
export function textoEnqueteFim(i) {
  const r = resumoResultado(i.opcoes, i.contas);
  return {
    titulo: i.souAutor ? "Sua enquete terminou" : "· a enquete em que você votou terminou",
    detalhe: `“${i.pergunta}”: ${r.texto}${!i.souAutor && i.opcoes[i.minha] != null ? ` · você votou em “${i.opcoes[i.minha]}”` : ""}`
  };
}

// Chave liga/desliga (ex.: "Votação anônima"). estado[chave] vira true/false.
export function linhaChave(estado, chave, { titulo, sub = "", escuro = false, aoMudar } = {}) {
  const l = document.createElement("label");
  l.className = "enq-chave" + (escuro ? " escuro" : "");
  const tx = document.createElement("span"); tx.className = "tx";
  const t = document.createElement("strong"); t.textContent = titulo;
  tx.appendChild(t);
  if (sub) { const s = document.createElement("small"); s.textContent = sub; tx.appendChild(s); }
  const sw = document.createElement("span"); sw.className = "switch";
  const inp = document.createElement("input"); inp.type = "checkbox"; inp.checked = !!estado[chave];
  inp.setAttribute("aria-label", titulo);
  inp.addEventListener("change", () => { estado[chave] = inp.checked; aoMudar?.(inp.checked); });
  sw.append(inp, document.createElement("span"));
  l.append(tx, sw);
  return l;
}
