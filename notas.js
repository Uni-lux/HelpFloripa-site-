// =====================================================
// Notas (notas.html, 12/11/2026, pedido do dono): anotações pessoais, ideias e estratégias. Só a própria pessoa vê.
// - Pastas (Pessoal, Ideias, Estratégias, Trabalho + as que a pessoa criar), fixar, cores, arquivo e lixeira (30 dias).
// - Texto com marcações simples: "[ ] tarefa" / "[x] feita" (caixinhas que se marcam tocando, também no cartão),
//   "• item", "# Título", "**negrito**", "---" (divisor) e #etiquetas. Enter continua a lista sozinho.
// - Prazo (com aviso de atrasada/hoje/amanhã) e sugestão de prazo quando o texto fala "amanhã", "sexta", "14/11"...
// - Modelos prontos (estratégia, plano da semana, reunião, metas, ideia de negócio, compras), corretor de texto,
//   busca sem acento, ordenar, duplicar, copiar, exportar .txt e compartilhar.
// Guardadas NO APARELHO na hora (localStorage hf-notas-<uid>, funciona sem internet) e copiadas para a conta em
// notas/{uid}/itens/{id} (regra própria: só o dono). Sem a regra publicada, ficam só no aparelho e a página avisa.
// =====================================================
import { $, toast, fb, eu, iniciarRede, montarBarraRede } from "./rede.js?v=148";
import { confirmarHF } from "./confirmar.js?v=6";

const PASTAS_PADRAO = ["Pessoal", "Ideias", "Estratégias", "Trabalho"];
const CORES = [["", "Padrão"], ["azul", "Azul"], ["verde", "Verde"], ["amarelo", "Amarelo"], ["laranja", "Laranja"], ["rosa", "Rosa"], ["roxo", "Roxo"]];
const ORDENS = [["em", "Recentes"], ["criadoEm", "Criadas"], ["prazo", "Prazo"], ["az", "A–Z"]];
const DIAS_LIXEIRA = 30;
const MAX_TEXTO = 20000;
const MODELOS = [
  ["estrategia", "Estratégia", "Objetivo, ações, prazos e como medir", "Estratégia: ", "# Objetivo\nO que quero alcançar e até quando.\n\n# Situação de hoje\n• Pontos fortes:\n• O que falta:\n\n# Ações\n[ ] \n[ ] \n[ ] \n\n# Como vou medir\n• \n\n# Riscos e plano B\n• "],
  ["semana", "Plano da semana", "Tarefas de segunda a domingo", "Semana", "# Prioridades\n[ ] \n[ ] \n[ ] \n\n# Segunda\n[ ] \n# Terça\n[ ] \n# Quarta\n[ ] \n# Quinta\n[ ] \n# Sexta\n[ ] \n# Fim de semana\n[ ] "],
  ["reuniao", "Reunião", "Pauta, decisões e próximos passos", "Reunião", "Data: {data}\nCom: \n\n# Pauta\n• \n\n# Decisões\n• \n\n# Próximos passos\n[ ] \n[ ] "],
  ["metas", "Metas do mês", "Metas com tarefas e progresso", "Metas de {mes}", "# Metas\n[ ] \n[ ] \n[ ] \n\n# Hábitos\n[ ] \n\n# Como foi\n"],
  ["negocio", "Ideia de negócio", "Cliente, oferta, preço e divulgação", "Ideia: ", "# Para quem é\n\n# Problema que resolve\n\n# O que vou oferecer\n• \n\n# Preço e custos\n• Preço:\n• Custos:\n\n# Como divulgar\n[ ] Perfil no Help Floripa\n[ ] Instagram\n[ ] Indicações\n\n# Primeiros passos\n[ ] "],
  ["compras", "Lista de compras", "Itens para marcar no mercado", "Compras", "[ ] \n[ ] \n[ ] "]
];

let notas = [], pastas = [...PASTAS_PADRAO], apagadas = [], semNuvem = false;
let filtro = "todas", ordem = "em", busca = "";
const chave = () => `hf-notas-${eu?.uid}`;
const agora = () => Date.now();
const semAcento = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const novoId = () => agora().toString(36) + Math.random().toString(36).slice(2, 8);

// ---------- Ícones (traço, sem emoji) ----------
const IC = {
  mais: '<path d="M12 5v14M5 12h14"/>', voltar: '<path d="M15 5l-7 7 7 7"/>', pin: '<path d="M9 4h6l-1 6 3 3v1H7v-1l3-3z"/><path d="M12 14v6"/>',
  cor: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16 3 3 0 0 0 0-6 2 2 0 0 1 0-4h4a4 4 0 0 0 4-4"/>', menu: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  tarefa: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>', lista: '<path d="M9 7h11M9 12h11M9 17h11"/><circle cx="4.5" cy="7" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="17" r="1"/>',
  titulo: '<path d="M5 5v14M15 5v14M5 12h10M19 19v-6l-2 1"/>', negrito: '<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/>', divisor: '<path d="M4 12h16"/><path d="M8 7h8M8 17h8" opacity=".4"/>',
  data: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/>', varinha: '<path d="M4 20l11-11M13 7l2-2 4 4-2 2"/><path d="M8 3v3M6.5 4.5h3M19 13v3M17.5 14.5h3"/>',
  modelo: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><path d="M16.5 13v7M13 16.5h7"/>',
  pasta: '<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>', arquivo: '<rect x="3.5" y="4.5" width="17" height="5" rx="1.5"/><path d="M5.5 9.5v8a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-8M10 13.5h4"/>',
  lixo: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>', copiar: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  enviar: '<path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/>', baixar: '<path d="M12 4v11M8 11l4 4 4-4"/><path d="M5 19h14"/>',
  duplicar: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M14 11v6M11 14h6"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  restaurar: '<path d="M4 12a8 8 0 1 0 2.5-5.8"/><path d="M4 4v4h4"/>', ok: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
  ordenar: '<path d="M7 5v14M4 16l3 3 3-3M17 19V5M14 8l3-3 3 3"/>', nuvem: '<path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 18z"/>',
  cadeado: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', estrela: '<path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z"/>',
  nota: '<path d="M6 3.5h9l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1-1.5z"/><path d="M14.5 3.5V8H19M8.5 12h7M8.5 15.5h5"/>'
};
const ic = (k, cls = "") => `<svg class="nt-i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${IC[k] || ""}</svg>`;

// ---------- Datas ----------
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hojeIso = () => iso(new Date());
const deIso = (s) => { const [a, m, d] = String(s).split("-").map(Number); return new Date(a, m - 1, d); };
const DIAS = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
function infoPrazo(p) {
  if (!p) return null;
  const dif = Math.round((deIso(p) - deIso(hojeIso())) / 864e5), d = deIso(p);
  const curto = `${DIAS[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  if (dif < 0) return { tx: `Atrasada · ${curto}`, cls: "atrasada", dif };
  if (dif === 0) return { tx: "Hoje", cls: "hoje", dif };
  if (dif === 1) return { tx: "Amanhã", cls: "logo", dif };
  if (dif < 7) return { tx: curto, cls: "logo", dif };
  return { tx: curto, cls: "", dif };
}
function haQuanto(ms) {
  const s = (agora() - ms) / 1000;
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  const d = new Date(ms); if (s < 6 * 86400) return DIAS[d.getDay()];
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}
// Sugestão de prazo pelo texto ("amanhã", "sexta", "14/11", "dia 20").
export function prazoNoTexto(texto) {
  const t = semAcento(texto), h = deIso(hojeIso());
  const somar = (n) => { const d = new Date(h); d.setDate(d.getDate() + n); return iso(d); };
  let m = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (m) {
    const dia = +m[1], mes = +m[2]; let ano = m[3] ? +m[3] : h.getFullYear(); if (ano < 100) ano += 2000;
    if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12) { const d = new Date(ano, mes - 1, dia); if (!m[3] && d < h) d.setFullYear(ano + 1); return iso(d); }
  }
  if (/\bdepois de amanha\b/.test(t)) return somar(2);
  if (/\bamanha\b/.test(t)) return somar(1);
  if (/\bhoje\b/.test(t)) return somar(0);
  const nomes = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
  const k = nomes.findIndex((n) => new RegExp(`\\b${n}(-feira)?\\b`).test(t));
  if (k >= 0) { let n = (k - h.getDay() + 7) % 7; if (n === 0) n = 7; return somar(n); }
  m = t.match(/\bdia (\d{1,2})\b/);
  if (m && +m[1] >= 1 && +m[1] <= 31) { const d = new Date(h.getFullYear(), h.getMonth(), +m[1]); if (d < h) d.setMonth(d.getMonth() + 1); return iso(d); }
  if (/\bproxima semana\b|\bsemana que vem\b/.test(t)) return somar(7);
  return "";
}

// ---------- Texto: tarefas, etiquetas, título ----------
const RE_TAREFA = /^(\s*)\[( |x|X)\]\s?/;
export function tarefas(texto) {
  let total = 0, feitas = 0;
  for (const l of String(texto || "").split("\n")) { const m = l.match(RE_TAREFA); if (m && l.replace(RE_TAREFA, "").trim()) { total++; if (m[2] !== " ") feitas++; } }
  return { total, feitas, abertas: total - feitas };
}
const etiquetas = (texto) => [...new Set([...String(texto || "").matchAll(/(?:^|\s)#([\p{L}\p{N}_]{2,30})/gu)].map((m) => m[1]))].slice(0, 6);
const tituloDe = (n) => n.titulo?.trim() || String(n.texto || "").split("\n").map((l) => l.replace(RE_TAREFA, "").replace(/^#+\s*|^[•\-*]\s+/, "").trim()).find(Boolean) || "Nota sem título";
function inline(s) {
  return esc(s).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/(^|\s)#([\p{L}\p{N}_]{2,30})/gu, '$1<span class="nt-tag">#$2</span>')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}
// Texto → HTML (cartão e modo "Ver"). As caixinhas levam data-linha para marcar tocando.
function desenharTexto(texto, maxLinhas = 0) {
  const linhas = String(texto || "").split("\n");
  const out = []; let n = 0;
  linhas.forEach((l, i) => {
    if (maxLinhas && n >= maxLinhas) return;
    const t = l.trim();
    if (!t) { if (out.length && out[out.length - 1] !== '<div class="nt-esp"></div>') out.push('<div class="nt-esp"></div>'); return; }
    n++;
    const m = l.match(RE_TAREFA);
    if (m) { const feita = m[2] !== " "; out.push(`<label class="nt-chk${feita ? " feita" : ""}" data-linha="${i}"><input type="checkbox"${feita ? " checked" : ""} data-linha="${i}" aria-label="Marcar tarefa"><span>${inline(l.replace(RE_TAREFA, "")) || "&nbsp;"}</span></label>`); return; }
    if (/^#{1,3}\s/.test(t)) { out.push(`<h4>${inline(t.replace(/^#+\s*/, ""))}</h4>`); return; }
    if (/^(-{3,}|_{3,})$/.test(t)) { out.push("<hr>"); return; }
    if (/^[•\-*]\s+/.test(t)) { out.push(`<div class="nt-bul">${inline(t.replace(/^[•\-*]\s+/, ""))}</div>`); return; }
    if (/^\d+[.)]\s+/.test(t)) { out.push(`<div class="nt-num"><b>${t.match(/^\d+/)[0]}.</b> ${inline(t.replace(/^\d+[.)]\s+/, ""))}</div>`); return; }
    out.push(`<p>${inline(l)}</p>`);
  });
  if (maxLinhas && linhas.filter((l) => l.trim()).length > maxLinhas) out.push('<div class="nt-mais">…</div>');
  return out.join("");
}
function alternarTarefa(texto, linha) {
  const ls = String(texto).split("\n");
  if (!ls[linha]) return texto;
  ls[linha] = ls[linha].replace(RE_TAREFA, (m, esp, x) => `${esp}[${x === " " ? "x" : " "}] `);
  return ls.join("\n");
}

// ---------- Guardar (aparelho + conta) ----------
function lerLocal() {
  try {
    const g = JSON.parse(localStorage.getItem(chave()) || "null");
    if (g) { notas = g.notas || []; pastas = g.pastas?.length ? g.pastas : [...PASTAS_PADRAO]; apagadas = g.apagadas || []; ordem = g.ordem || "em"; }
  } catch {}
}
function gravarLocal() {
  try { localStorage.setItem(chave(), JSON.stringify({ notas, pastas, apagadas, ordem })); }
  catch { toast("O aparelho está sem espaço para guardar as notas."); }
}
const refNota = (id) => fb.doc(fb.db, "notas", eu.uid, "itens", id);
const paraNuvem = (n) => ({ titulo: String(n.titulo || "").slice(0, 120), texto: String(n.texto || "").slice(0, MAX_TEXTO), cor: n.cor || "", pasta: (n.pasta || "").slice(0, 40), fixada: !!n.fixada, arquivada: !!n.arquivada, lixeira: n.lixeira || 0, prazo: n.prazo || "", criadoEm: n.criadoEm || n.em, em: n.em });
const pendentes = new Map(); let tNuvem = 0;
function enviarDepois(n) {
  pendentes.set(n.id, n); clearTimeout(tNuvem);
  tNuvem = setTimeout(enviarPendentes, 700);
}
async function enviarPendentes() {
  if (semNuvem) return;
  const lista = [...pendentes.values()]; pendentes.clear();
  for (const n of lista) {
    try { await fb.setDoc(refNota(n.id), paraNuvem(n)); n.nuvem = n.em; }
    catch (e) { if (e?.code === "permission-denied") { marcarSemNuvem(); return; } pendentes.set(n.id, n); }
  }
  for (const id of [...apagadas]) {
    try { await fb.deleteDoc(refNota(id)); apagadas = apagadas.filter((x) => x !== id); }
    catch (e) { if (e?.code === "permission-denied") { marcarSemNuvem(); return; } }
  }
  gravarLocal();
}
function marcarSemNuvem() {
  semNuvem = true;
  const a = $("ntAviso"); if (!a) return;
  a.hidden = false;
  a.innerHTML = `${ic("cadeado")}<span><b>Guardadas neste aparelho.</b> A cópia na conta liga sozinha com a próxima atualização.</span>`;
}
async function sincronizar() {
  try {
    const s = await fb.getDocs(fb.collection(fb.db, "notas", eu.uid, "itens"));
    const nuvem = new Map(s.docs.map((d) => [d.id, { id: d.id, ...d.data() }]));
    const locais = new Map(notas.map((n) => [n.id, n]));
    for (const [id, nv] of nuvem) {
      if (apagadas.includes(id)) continue;
      const l = locais.get(id);
      if (!l || (nv.em || 0) > (l.em || 0)) locais.set(id, { ...nv, nuvem: nv.em });
    }
    for (const n of locais.values()) if (!nuvem.has(n.id) || (n.em || 0) > (nuvem.get(n.id).em || 0)) pendentes.set(n.id, n);
    notas = [...locais.values()];
    gravarLocal(); pintar();
    await enviarPendentes();
  } catch (e) {
    if (e?.code === "permission-denied") marcarSemNuvem();
  }
}
function limparLixeira() {
  const limite = agora() - DIAS_LIXEIRA * 864e5;
  const velhas = notas.filter((n) => n.lixeira && n.lixeira < limite);
  if (!velhas.length) return;
  notas = notas.filter((n) => !velhas.includes(n)); apagadas.push(...velhas.map((n) => n.id)); gravarLocal();
}
function salvar(n, { silencioso = false } = {}) {
  n.em = agora();
  const i = notas.findIndex((x) => x.id === n.id);
  if (i < 0) notas.unshift(n); else notas[i] = n;
  gravarLocal(); enviarDepois(n);
  if (!silencioso) pintar();
}
function apagarDeVez(n) { notas = notas.filter((x) => x.id !== n.id); pendentes.delete(n.id); apagadas.push(n.id); gravarLocal(); clearTimeout(tNuvem); tNuvem = setTimeout(enviarPendentes, 300); pintar(); }

// ---------- Lista ----------
function filtrados() {
  const b = semAcento(busca.trim());
  let l = notas.filter((n) => {
    if (filtro === "lixeira") return !!n.lixeira;
    if (n.lixeira) return false;
    if (filtro === "arquivo") return !!n.arquivada;
    if (n.arquivada && filtro !== "todas") return false;
    if (n.arquivada) return false;
    if (filtro === "fixadas") return n.fixada;
    if (filtro === "tarefas") return tarefas(n.texto).abertas > 0;
    if (filtro === "prazo") return !!n.prazo;
    if (filtro.startsWith("p:")) return (n.pasta || "") === filtro.slice(2);
    return true;
  });
  if (b) l = l.filter((n) => semAcento(`${n.titulo} ${n.texto} ${n.pasta}`).includes(b));
  const por = {
    em: (a, c) => c.em - a.em, criadoEm: (a, c) => (c.criadoEm || 0) - (a.criadoEm || 0), az: (a, c) => tituloDe(a).localeCompare(tituloDe(c), "pt-BR"),
    prazo: (a, c) => (a.prazo || "9999") .localeCompare(c.prazo || "9999") || c.em - a.em
  }[ordem] || ((a, c) => c.em - a.em);
  l.sort(por);
  if (filtro !== "lixeira" && filtro !== "arquivo" && ordem !== "prazo") l.sort((a, c) => (c.fixada ? 1 : 0) - (a.fixada ? 1 : 0));
  return l;
}
function pintarFiltros() {
  const vivas = notas.filter((n) => !n.lixeira && !n.arquivada);
  const conta = (f) => f(vivas);
  const itens = [
    ["todas", "Todas", vivas.length, "nota"], ["fixadas", "Fixadas", conta((l) => l.filter((n) => n.fixada).length), "pin"],
    ["tarefas", "Tarefas", conta((l) => l.filter((n) => tarefas(n.texto).abertas).length), "tarefa"], ["prazo", "Com prazo", conta((l) => l.filter((n) => n.prazo).length), "data"],
    ...[...new Set([...pastas, ...vivas.map((n) => n.pasta).filter(Boolean)])].map((p) => ["p:" + p, p, vivas.filter((n) => n.pasta === p).length, "pasta"]),
    ["arquivo", "Arquivo", notas.filter((n) => n.arquivada && !n.lixeira).length, "arquivo"], ["lixeira", "Lixeira", notas.filter((n) => n.lixeira).length, "lixo"]
  ];
  const f = $("ntFiltros");
  f.innerHTML = itens.map(([k, nome, n, i]) => `<button type="button" role="tab" class="nt-chip${filtro === k ? " on" : ""}" data-f="${esc(k)}" aria-selected="${filtro === k}">${ic(i)}<span>${esc(nome)}</span>${n ? `<b>${n}</b>` : ""}</button>`).join("")
    + `<button type="button" class="nt-chip nt-chip-nova" id="ntNovaPasta">${ic("mais")}<span>Pasta</span></button>`;
  f.querySelectorAll("[data-f]").forEach((b) => b.addEventListener("click", () => { filtro = b.dataset.f; pintar(); }));
  $("ntNovaPasta").addEventListener("click", () => novaPasta());
  f.querySelector(".on")?.scrollIntoView({ block: "nearest", inline: "nearest" });
}
function pintarPainel() {
  const p = $("ntPainel");
  const vivas = notas.filter((n) => !n.lixeira && !n.arquivada);
  if (filtro !== "todas" || busca || !vivas.length) { p.hidden = true; return; }
  const abertas = vivas.reduce((a, n) => a + tarefas(n.texto).abertas, 0);
  const atras = vivas.filter((n) => n.prazo && infoPrazo(n.prazo).dif < 0).length;
  const hoje = vivas.filter((n) => n.prazo && infoPrazo(n.prazo).dif === 0).length;
  const semana = vivas.filter((n) => n.prazo && infoPrazo(n.prazo).dif > 0 && infoPrazo(n.prazo).dif < 7).length;
  const cards = [
    ["tarefas", abertas, abertas === 1 ? "tarefa aberta" : "tarefas abertas", "tarefa", ""],
    ["prazo", atras, atras === 1 ? "atrasada" : "atrasadas", "data", atras ? "ruim" : ""],
    ["prazo", hoje, "para hoje", "data", hoje ? "hoje" : ""],
    ["prazo", semana, "nesta semana", "data", ""]
  ];
  p.hidden = false;
  p.innerHTML = cards.map(([f, n, tx, i, cls]) => `<button type="button" class="nt-kpi ${cls}" data-f="${f}">${ic(i)}<b>${n}</b><span>${tx}</span></button>`).join("");
  p.querySelectorAll("[data-f]").forEach((b) => b.addEventListener("click", () => { filtro = b.dataset.f; if (b.dataset.f === "prazo") ordem = "prazo"; pintar(); }));
}
function cartao(n) {
  const a = document.createElement("article");
  a.className = `nt-card${n.cor ? " cor-" + n.cor : ""}${n.fixada ? " fixada" : ""}`; a.dataset.id = n.id; a.tabIndex = 0;
  a.setAttribute("role", "button"); a.setAttribute("aria-label", "Abrir nota: " + tituloDe(n));
  const tf = tarefas(n.texto), pz = infoPrazo(n.prazo), tags = etiquetas(n.texto);
  const corpoTx = n.titulo?.trim() ? n.texto : String(n.texto || "").split("\n").slice(1).join("\n");
  a.innerHTML = `${n.fixada ? `<span class="nt-pin" aria-label="Fixada">${ic("pin")}</span>` : ""}
    <h3>${esc(tituloDe(n))}</h3>
    <div class="nt-prev">${desenharTexto(corpoTx, 8)}</div>
    ${tf.total ? `<div class="nt-prog" aria-label="${tf.feitas} de ${tf.total} tarefas feitas"><span class="nt-trilho"><i style="width:${Math.round((tf.feitas / tf.total) * 100)}%"></i></span><span>${tf.feitas}/${tf.total}</span></div>` : ""}
    <footer>${pz ? `<span class="nt-prazo ${pz.cls}">${ic("data")}${esc(pz.tx)}</span>` : ""}${n.pasta ? `<span class="nt-pasta">${esc(n.pasta)}</span>` : ""}${tags.slice(0, 2).map((t) => `<span class="nt-tag">#${esc(t)}</span>`).join("")}<time>${n.lixeira ? "na lixeira" : haQuanto(n.em)}</time></footer>`;
  a.addEventListener("click", (e) => {
    const chk = e.target.closest("input[data-linha]");
    if (chk) { e.stopPropagation(); if (n.lixeira) return; n.texto = alternarTarefa(n.texto, +chk.dataset.linha); salvar(n); return; }
    if (e.target.closest("a")) return;
    abrirEditor(n);
  });
  a.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target === a) abrirEditor(n); });
  return a;
}
function pintar() {
  pintarFiltros(); pintarPainel();
  const g = $("ntGrade"), l = filtrados();
  const vivas = notas.filter((n) => !n.lixeira && !n.arquivada);
  $("ntResumo").textContent = vivas.length ? `${vivas.length} ${vivas.length === 1 ? "nota" : "notas"} · só você vê` : "Suas anotações, ideias e estratégias. Só você vê.";
  $("ntOrdemTx").textContent = ORDENS.find(([k]) => k === ordem)?.[1] || "Recentes";
  g.replaceChildren();
  if (!l.length) {
    const v = document.createElement("div"); v.className = "nt-vazio";
    if (busca) v.innerHTML = `${ic("nota", "grande")}<p><b>Nada encontrado para “${esc(busca)}”.</b></p>`;
    else if (filtro === "lixeira") v.innerHTML = `${ic("lixo", "grande")}<p><b>A lixeira está vazia.</b><br>Notas apagadas ficam aqui por ${DIAS_LIXEIRA} dias.</p>`;
    else if (filtro === "arquivo") v.innerHTML = `${ic("arquivo", "grande")}<p><b>Nada arquivado.</b><br>Arquive o que não precisa ver todo dia.</p>`;
    else {
      v.innerHTML = `${ic("nota", "grande")}<p><b>${filtro === "todas" ? "Comece sua primeira nota" : "Nenhuma nota aqui ainda"}</b><br>Anote ideias, metas e estratégias. Use um modelo para começar mais rápido.</p><div class="nt-modelos-mini"></div>`;
      const mm = v.querySelector(".nt-modelos-mini");
      MODELOS.slice(0, 4).forEach(([k, nome]) => { const b = document.createElement("button"); b.type = "button"; b.className = "nt-mm"; b.innerHTML = `${ic("modelo")}<span>${esc(nome)}</span>`; b.addEventListener("click", () => abrirEditor(null, { modelo: k })); mm.appendChild(b); });
    }
    g.appendChild(v); return;
  }
  if (filtro === "lixeira") {
    const top = document.createElement("div"); top.className = "nt-lixo-topo";
    top.innerHTML = `<span>Apagadas há mais de ${DIAS_LIXEIRA} dias somem sozinhas.</span><button type="button" class="nt-lnk">Esvaziar lixeira</button>`;
    top.querySelector("button").addEventListener("click", async () => {
      if (!(await confirmarHF({ titulo: "Esvaziar a lixeira?", texto: `${l.length} ${l.length === 1 ? "nota será apagada" : "notas serão apagadas"} de vez. Não dá para desfazer.`, ok: "Esvaziar", icone: "lixo" }))) return;
      l.forEach((n) => { notas = notas.filter((x) => x.id !== n.id); apagadas.push(n.id); }); gravarLocal(); enviarPendentes(); pintar(); toast("Lixeira esvaziada.");
    });
    g.appendChild(top);
  }
  const fix = l.filter((n) => n.fixada && filtro !== "lixeira" && filtro !== "arquivo" && ordem !== "prazo"), resto = l.filter((n) => !fix.includes(n));
  const bloco = (titulo, itens) => {
    if (!itens.length) return;
    if (titulo) { const h = document.createElement("h2"); h.className = "nt-secao"; h.textContent = titulo; g.appendChild(h); }
    const col = document.createElement("div"); col.className = "nt-colunas"; itens.forEach((n) => col.appendChild(cartao(n))); g.appendChild(col);
  };
  if (fix.length && resto.length) { bloco("Fixadas", fix); bloco("Outras", resto); } else bloco("", l);
}

// ---------- Folha de opções (menus) ----------
function folha(titulo, itens, { sub = "" } = {}) {
  return new Promise((ok) => {
    const f = document.createElement("div"); f.className = "nt-folha-fundo"; f.dataset.semDeslizar = "";
    f.innerHTML = `<div class="nt-folha" role="dialog" aria-modal="true" aria-label="${esc(titulo)}"><div class="nt-folha-alca"></div><header><b>${esc(titulo)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}<button type="button" class="nt-x" data-fechar aria-label="Fechar">${ic("fechar")}</button></header><div class="nt-folha-lista"></div></div>`;
    const lista = f.querySelector(".nt-folha-lista");
    const fim = (v) => { f.remove(); removeEventListener("keydown", esc_, true); ok(v); };
    const esc_ = (e) => { if (e.key === "Escape") { e.stopPropagation(); fim(null); } };
    addEventListener("keydown", esc_, true);
    itens.filter(Boolean).forEach(([k, nome, icone, extra = "", cls = ""]) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "nt-op " + cls;
      b.innerHTML = `${icone?.startsWith("<") ? icone : ic(icone || "ok")}<span><b>${esc(nome)}</b>${extra ? `<small>${esc(extra)}</small>` : ""}</span>`;
      b.addEventListener("click", () => fim(k)); lista.appendChild(b);
    });
    f.addEventListener("click", (e) => { if (e.target === f) fim(null); });
    f.querySelector("[data-fechar]").addEventListener("click", () => fim(null));
    document.body.appendChild(f);
    f.querySelector(".nt-op")?.focus({ preventScroll: true });
  });
}
async function perguntarTexto(titulo, valor = "", { max = 40, placeholder = "" } = {}) {
  return new Promise((ok) => {
    const f = document.createElement("div"); f.className = "nt-folha-fundo"; f.dataset.semDeslizar = "";
    f.innerHTML = `<form class="nt-folha"><div class="nt-folha-alca"></div><header><b>${esc(titulo)}</b><button type="button" class="nt-x" data-fechar aria-label="Fechar">${ic("fechar")}</button></header><input class="nt-campo" maxlength="${max}" placeholder="${esc(placeholder)}" value="${esc(valor)}"><div class="nt-folha-pe"><button type="button" class="nt-sec" data-fechar>Cancelar</button><button class="nt-pri">Salvar</button></div></form>`;
    const fim = (v) => { f.remove(); ok(v); };
    f.querySelectorAll("[data-fechar]").forEach((b) => b.addEventListener("click", () => fim(null)));
    f.addEventListener("click", (e) => { if (e.target === f) fim(null); });
    f.querySelector("form").addEventListener("submit", (e) => { e.preventDefault(); fim(f.querySelector("input").value.trim() || null); });
    document.body.appendChild(f);
    setTimeout(() => f.querySelector("input").focus(), 60);
  });
}
async function novaPasta() {
  const nome = await perguntarTexto("Nova pasta", "", { placeholder: "Ex.: Faculdade, Viagem, Clientes" });
  if (!nome) return null;
  if (!pastas.some((p) => semAcento(p) === semAcento(nome))) pastas.push(nome);
  gravarLocal(); filtro = "p:" + nome; pintar(); return nome;
}
async function escolherPasta(atual) {
  const k = await folha("Mover para a pasta", [["", "Sem pasta", "fechar", "", atual ? "" : "on"], ...pastas.map((p) => [p, p, "pasta", "", p === atual ? "on" : ""]), ["__nova", "Nova pasta", "mais"]]);
  if (k === null) return null;
  if (k === "__nova") return await novaPasta();
  return k;
}

// ---------- Editor ----------
function abrirEditor(nota, { modelo = "" } = {}) {
  const md = MODELOS.find(([k]) => k === modelo);
  const hoje = new Date();
  const preencher = (s) => s.replace("{data}", hoje.toLocaleDateString("pt-BR")).replace("{mes}", MESES[hoje.getMonth()]);
  const n = nota ? { ...nota } : { id: novoId(), titulo: md ? preencher(md[3]) : "", texto: md ? preencher(md[4]) : "", cor: "", pasta: filtro.startsWith("p:") ? filtro.slice(2) : (md && ["estrategia", "negocio"].includes(md[0]) ? "Estratégias" : ""), fixada: filtro === "fixadas", arquivada: false, lixeira: 0, prazo: "", criadoEm: agora(), em: agora() };
  let existe = !!nota, verModo = !!(nota && tarefas(nota.texto).total && !nota.lixeira), tSalvar = 0;
  const naLixeira = !!n.lixeira;
  const ed = document.createElement("div"); ed.className = `nt-ed${n.cor ? " cor-" + n.cor : ""}`; ed.dataset.semDeslizar = ""; ed.dataset.semPuxar = "";
  ed.setAttribute("role", "dialog"); ed.setAttribute("aria-modal", "true"); ed.setAttribute("aria-label", "Nota");
  ed.innerHTML = `<header class="nt-ed-topo">
      <button type="button" class="nt-ib" data-fechar aria-label="Voltar">${ic("voltar")}</button>
      <span class="nt-status" id="ntStatus">${existe ? "Salva" : "Nova nota"}</span>
      <button type="button" class="nt-ib${n.fixada ? " on" : ""}" id="edPin" aria-label="Fixar" aria-pressed="${!!n.fixada}">${ic("pin")}</button>
      <button type="button" class="nt-ib" id="edCor" aria-label="Cor">${ic("cor")}</button>
      <button type="button" class="nt-ib" id="edMais" aria-label="Mais opções">${ic("menu")}</button>
    </header>
    <div class="nt-ed-corpo">
      ${naLixeira ? `<div class="nt-ed-lixo">${ic("lixo")}<span>Esta nota está na lixeira.</span><button type="button" class="nt-lnk" id="edRestaurar">Restaurar</button></div>` : ""}
      <input class="nt-ed-titulo" id="edTitulo" maxlength="120" placeholder="Título" value="${esc(n.titulo)}" ${naLixeira ? "readonly" : ""}>
      <div class="nt-ed-meta">
        <button type="button" class="nt-meta" id="edPasta">${ic("pasta")}<span>${esc(n.pasta || "Sem pasta")}</span></button>
        <button type="button" class="nt-meta" id="edPrazo">${ic("data")}<span>Prazo</span></button>
        <button type="button" class="nt-meta nt-sug" id="edSug" hidden>${ic("estrela")}<span></span></button>
        <span class="nt-ed-modo" role="group" aria-label="Modo"><button type="button" data-m="editar">Editar</button><button type="button" data-m="ver">Ver</button></span>
      </div>
      <textarea class="nt-ed-texto" id="edTexto" maxlength="${MAX_TEXTO}" placeholder="Escreva aqui... Use [ ] para tarefas" ${naLixeira ? "readonly" : ""}>${esc(n.texto)}</textarea>
      <div class="nt-ed-ver" id="edVer" hidden></div>
      <p class="nt-ed-info" id="edInfo"></p>
    </div>
    <div class="nt-ed-barra" role="toolbar" aria-label="Ferramentas" ${naLixeira ? "hidden" : ""}>
      <button type="button" data-t="tarefa" aria-label="Tarefa">${ic("tarefa")}<span>Tarefa</span></button>
      <button type="button" data-t="lista" aria-label="Lista">${ic("lista")}<span>Lista</span></button>
      <button type="button" data-t="titulo" aria-label="Título">${ic("titulo")}<span>Título</span></button>
      <button type="button" data-t="negrito" aria-label="Negrito">${ic("negrito")}<span>Negrito</span></button>
      <button type="button" data-t="divisor" aria-label="Divisor">${ic("divisor")}<span>Divisor</span></button>
      <button type="button" data-t="data" aria-label="Data de hoje">${ic("data")}<span>Data</span></button>
      <button type="button" data-t="corrigir" aria-label="Corrigir texto">${ic("varinha")}<span>Corrigir</span></button>
      <button type="button" data-t="modelo" aria-label="Modelos">${ic("modelo")}<span>Modelos</span></button>
    </div>`;
  document.body.appendChild(ed);
  document.documentElement.classList.add("nt-travado");
  const tit = ed.querySelector("#edTitulo"), tx = ed.querySelector("#edTexto"), ver = ed.querySelector("#edVer");
  const status = (s) => { const el = ed.querySelector("#ntStatus"); if (el) el.textContent = s; };
  const crescer = () => { tx.style.height = "auto"; tx.style.height = Math.max(tx.scrollHeight, 220) + "px"; };
  const temAlgo = () => tit.value.trim() || tx.value.trim();
  const pintarMeta = () => {
    const pz = infoPrazo(n.prazo);
    const bp = ed.querySelector("#edPrazo"); bp.className = `nt-meta${pz ? " tem " + pz.cls : ""}`; bp.querySelector("span").textContent = pz ? pz.tx : "Prazo";
    ed.querySelector("#edPasta span").textContent = n.pasta || "Sem pasta";
    const sug = n.prazo ? "" : prazoNoTexto(`${tit.value}\n${tx.value}`);
    const bs = ed.querySelector("#edSug"); bs.hidden = !sug || naLixeira; if (sug) { bs.dataset.p = sug; bs.querySelector("span").textContent = "Prazo: " + infoPrazo(sug).tx; }
    const tf = tarefas(tx.value), palavras = tx.value.trim() ? tx.value.trim().split(/\s+/).length : 0;
    ed.querySelector("#edInfo").textContent = [palavras ? `${palavras} ${palavras === 1 ? "palavra" : "palavras"}` : "", tf.total ? `${tf.feitas} de ${tf.total} tarefas feitas` : "", existe ? `editada ${haQuanto(n.em)}` : ""].filter(Boolean).join(" · ");
    ed.querySelectorAll(".nt-ed-modo button").forEach((b) => b.classList.toggle("on", (b.dataset.m === "ver") === verModo));
  };
  const pintarVer = () => {
    tx.hidden = verModo; ver.hidden = !verModo;
    if (verModo) { ver.innerHTML = desenharTexto(tx.value) || '<p class="nt-ed-vazio">Nada escrito ainda.</p>'; }
    else crescer();
    pintarMeta();
  };
  const gravar = (agoraMesmo = false) => {
    clearTimeout(tSalvar);
    const fazer = () => {
      if (!temAlgo() && !existe) return;
      n.titulo = tit.value.slice(0, 120); n.texto = tx.value.slice(0, MAX_TEXTO);
      salvar(n, { silencioso: true }); existe = true; status("Salva"); pintarMeta();
    };
    if (agoraMesmo) fazer(); else { status("Salvando..."); tSalvar = setTimeout(fazer, 450); }
  };
  const mudou = () => { if (naLixeira) return; crescer(); gravar(); pintarMeta(); };
  tit.addEventListener("input", mudou); tx.addEventListener("input", mudou);
  tit.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); tx.focus(); } });
  // Enter continua a lista: "[ ] " / "• " / "- " / "1. "
  tx.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.shiftKey || e.isComposing) return;
    const ini = tx.selectionStart, antes = tx.value.slice(0, ini), linha = antes.slice(antes.lastIndexOf("\n") + 1);
    const m = linha.match(/^(\s*)(\[[ xX]\]\s|[•\-*]\s|(\d+)[.)]\s)/);
    if (!m) return;
    e.preventDefault();
    if (!linha.slice(m[0].length).trim()) { // linha vazia da lista: sai da lista
      tx.setRangeText("", ini - linha.length, ini, "end");
    } else {
      let pref = m[2]; if (/^\[/.test(pref)) pref = "[ ] "; if (m[3]) pref = `${+m[3] + 1}. `;
      tx.setRangeText("\n" + m[1] + pref, ini, tx.selectionEnd, "end");
    }
    mudou();
  });
  ver.addEventListener("click", (e) => {
    const chk = e.target.closest("input[data-linha]"); if (!chk || naLixeira) return;
    tx.value = alternarTarefa(tx.value, +chk.dataset.linha); gravar(true); pintarVer();
  });
  ed.querySelectorAll(".nt-ed-modo button").forEach((b) => b.addEventListener("click", () => { verModo = b.dataset.m === "ver"; pintarVer(); }));
  // Ferramentas
  const linhaAtual = () => { const ini = tx.selectionStart; const a = tx.value.lastIndexOf("\n", ini - 1) + 1; let f = tx.value.indexOf("\n", ini); if (f < 0) f = tx.value.length; return [a, f]; };
  const prefixar = (pref, re) => {
    if (verModo) { verModo = false; pintarVer(); }
    const [a, f] = linhaAtual(); const l = tx.value.slice(a, f);
    const nova = re.test(l) ? l.replace(re, "") : pref + l.replace(/^(\[[ xX]\]\s?|[•\-*]\s+|#+\s*)/, "");
    tx.setRangeText(nova, a, f, "end"); tx.focus(); mudou();
  };
  ed.querySelector(".nt-ed-barra").addEventListener("pointerdown", (e) => { if (e.target.closest("button") && document.activeElement === tx) e.preventDefault(); }); // não fecha o teclado
  ed.querySelectorAll("[data-t]").forEach((b) => b.addEventListener("click", async () => {
    const t = b.dataset.t;
    if (t === "tarefa") prefixar("[ ] ", /^\[[ xX]\]\s?/);
    else if (t === "lista") prefixar("• ", /^[•\-*]\s+/);
    else if (t === "titulo") prefixar("# ", /^#+\s*/);
    else if (t === "divisor") { if (verModo) { verModo = false; pintarVer(); } const [, f] = linhaAtual(); tx.setRangeText("\n---\n", f, f, "end"); tx.focus(); mudou(); }
    else if (t === "data") { if (verModo) { verModo = false; pintarVer(); } const d = new Date(); tx.setRangeText(`${d.toLocaleDateString("pt-BR")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} `, tx.selectionStart, tx.selectionEnd, "end"); tx.focus(); mudou(); }
    else if (t === "negrito") {
      if (verModo) { verModo = false; pintarVer(); }
      const a = tx.selectionStart, f = tx.selectionEnd, sel = tx.value.slice(a, f);
      if (sel) tx.setRangeText(`**${sel}**`, a, f, "end"); else { tx.setRangeText("****", a, f, "end"); tx.selectionStart = tx.selectionEnd = a + 2; }
      tx.focus(); mudou();
    } else if (t === "corrigir") {
      if (!tx.value.trim()) { toast("Escreva alguma coisa primeiro."); return; }
      const { revisarTexto } = await import("./corretor-tela.js?v=6");
      const novo = await revisarTexto(tx.value, { modo: "pub", titulo: "Corrigir a nota" });
      if (novo !== null && novo !== tx.value) { tx.value = novo; mudou(); if (verModo) pintarVer(); toast("Texto corrigido."); }
    } else if (t === "modelo") {
      const k = await folha("Usar um modelo", MODELOS.map(([k, nome, desc]) => [k, nome, "modelo", desc]), { sub: "Entra no fim da nota" });
      const md2 = MODELOS.find(([x]) => x === k); if (!md2) return;
      if (!tit.value.trim()) tit.value = preencher(md2[3]);
      tx.value = (tx.value.trim() ? tx.value.replace(/\s+$/, "") + "\n\n" : "") + preencher(md2[4]);
      if (verModo) { verModo = false; } mudou(); pintarVer();
    }
  }));
  // Topo e metadados
  ed.querySelector("#edPin").addEventListener("click", (e) => { n.fixada = !n.fixada; e.currentTarget.classList.toggle("on", n.fixada); e.currentTarget.setAttribute("aria-pressed", n.fixada); if (temAlgo()) gravar(true); toast(n.fixada ? "Nota fixada no topo." : "Nota desafixada."); });
  ed.querySelector("#edCor").addEventListener("click", async () => {
    const k = await folha("Cor da nota", CORES.map(([k, nome]) => [k, nome, `<span class="nt-bola cor-${k || "padrao"}"></span>`, "", n.cor === k ? "on" : ""]));
    if (k === null) return; n.cor = k; ed.className = `nt-ed${k ? " cor-" + k : ""}`; if (temAlgo()) gravar(true);
  });
  ed.querySelector("#edPasta").addEventListener("click", async () => { const p = await escolherPasta(n.pasta); if (p === null) return; n.pasta = p; pintarMeta(); if (temAlgo()) gravar(true); });
  ed.querySelector("#edPrazo").addEventListener("click", async () => {
    const h = deIso(hojeIso()); const mais = (d) => { const x = new Date(h); x.setDate(x.getDate() + d); return iso(x); };
    const sex = (5 - h.getDay() + 7) % 7 || 7;
    const k = await folha("Prazo", [["hoje", "Hoje", "data", infoPrazo(mais(0)).tx], ["amanha", "Amanhã", "data", infoPrazo(mais(1)).tx], ["sexta", "Sexta-feira", "data", infoPrazo(mais(sex)).tx], ["semana", "Daqui a uma semana", "data", infoPrazo(mais(7)).tx], ["escolher", "Escolher a data", "data"], n.prazo ? ["tirar", "Tirar o prazo", "fechar"] : null]);
    if (k === null) return;
    if (k === "escolher") {
      const inp = document.createElement("input"); inp.type = "date"; inp.value = n.prazo || hojeIso(); inp.className = "nt-data-oculta"; ed.appendChild(inp);
      inp.addEventListener("change", () => { if (inp.value) { n.prazo = inp.value; pintarMeta(); if (temAlgo()) gravar(true); } inp.remove(); });
      try { inp.showPicker ? inp.showPicker() : inp.click(); } catch { inp.click(); }
      return;
    }
    n.prazo = { hoje: mais(0), amanha: mais(1), sexta: mais(sex), semana: mais(7), tirar: "" }[k] ?? n.prazo;
    pintarMeta(); if (temAlgo()) gravar(true);
  });
  ed.querySelector("#edSug").addEventListener("click", (e) => { n.prazo = e.currentTarget.dataset.p; pintarMeta(); if (temAlgo()) gravar(true); toast("Prazo definido: " + infoPrazo(n.prazo).tx); });
  ed.querySelector("#edRestaurar")?.addEventListener("click", () => { n.lixeira = 0; salvar(n); fechar(); toast("Nota restaurada."); });
  ed.querySelector("#edMais").addEventListener("click", async () => {
    const tf = tarefas(tx.value);
    const k = await folha("Opções da nota", naLixeira ? [["restaurar", "Restaurar", "restaurar"], ["apagar", "Apagar de vez", "lixo", "Não dá para desfazer", "perigo"]] : [
      ["duplicar", "Duplicar", "duplicar"], ["copiar", "Copiar o texto", "copiar"], ["compartilhar", "Compartilhar", "enviar"], ["baixar", "Baixar como arquivo (.txt)", "baixar"],
      tf.feitas ? ["ordenar", "Concluídas para o fim", "ordenar"] : null, tf.feitas ? ["limpar", "Tirar as concluídas", "tarefa", `${tf.feitas} ${tf.feitas === 1 ? "tarefa" : "tarefas"}`] : null,
      [n.arquivada ? "desarquivar" : "arquivar", n.arquivada ? "Tirar do arquivo" : "Arquivar", "arquivo"], ["lixeira", "Mover para a lixeira", "lixo", `Fica ${DIAS_LIXEIRA} dias lá`, "perigo"]
    ]);
    if (!k) return;
    const textoTodo = () => `${tit.value.trim() ? tit.value.trim() + "\n\n" : ""}${tx.value}`;
    if (k === "duplicar") { gravar(true); const c = { ...n, id: novoId(), titulo: (tit.value || tituloDe(n)) + " (cópia)", texto: tx.value, criadoEm: agora(), fixada: false }; salvar(c); fechar(); abrirEditor(c); toast("Nota duplicada."); }
    else if (k === "copiar") { try { await navigator.clipboard.writeText(textoTodo()); toast("Texto copiado."); } catch { toast("Não foi possível copiar."); } }
    else if (k === "compartilhar") { try { if (navigator.share) await navigator.share({ title: tit.value || "Nota", text: textoTodo() }); else { await navigator.clipboard.writeText(textoTodo()); toast("Texto copiado para colar onde quiser."); } } catch {} }
    else if (k === "baixar") { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([textoTodo()], { type: "text/plain;charset=utf-8" })); a.download = (tituloDe({ ...n, titulo: tit.value, texto: tx.value }).replace(/[\\/:*?"<>|]+/g, "").slice(0, 60) || "nota") + ".txt"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
    else if (k === "ordenar") { const ls = tx.value.split("\n"); const blocos = []; let atual = []; ls.forEach((l) => { if (RE_TAREFA.test(l)) atual.push(l); else { if (atual.length) { blocos.push(atual); atual = []; } blocos.push(l); } }); if (atual.length) blocos.push(atual); tx.value = blocos.map((b) => Array.isArray(b) ? [...b.filter((l) => l.match(RE_TAREFA)[2] === " "), ...b.filter((l) => l.match(RE_TAREFA)[2] !== " ")].join("\n") : b).join("\n"); mudou(); pintarVer(); }
    else if (k === "limpar") { tx.value = tx.value.split("\n").filter((l) => { const m = l.match(RE_TAREFA); return !m || m[2] === " "; }).join("\n"); mudou(); pintarVer(); toast("Concluídas tiradas."); }
    else if (k === "arquivar" || k === "desarquivar") { n.arquivada = k === "arquivar"; gravar(true); fechar(); toast(n.arquivada ? "Nota arquivada." : "Nota de volta às notas."); }
    else if (k === "lixeira") { gravar(true); if (!existe) { fechar(); return; } n.lixeira = agora(); salvar(n); fechar(); avisoDesfazer("Nota na lixeira.", () => { n.lixeira = 0; salvar(n); }); }
    else if (k === "restaurar") { n.lixeira = 0; salvar(n); fechar(); toast("Nota restaurada."); }
    else if (k === "apagar") { if (!(await confirmarHF({ titulo: "Apagar de vez?", texto: "A nota some deste aparelho e da sua conta. Não dá para desfazer.", ok: "Apagar", icone: "lixo" }))) return; apagarDeVez(n); fechar(); toast("Nota apagada."); }
  });
  let fechada = false;
  function fechar() {
    if (fechada) return; fechada = true;
    if (!naLixeira && (temAlgo() || existe)) gravar(true);
    ed.remove(); document.documentElement.classList.remove("nt-travado"); removeEventListener("keydown", teclas, true);
    pintar();
  }
  ed.querySelector("[data-fechar]").addEventListener("click", fechar);
  const teclas = (e) => {
    if (e.key === "Escape" && !document.querySelector(".nt-folha-fundo, .cr-fundo")) { e.stopPropagation(); fechar(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); gravar(true); }
  };
  addEventListener("keydown", teclas, true);
  addEventListener("pagehide", () => { if (!fechada) gravar(true); }, { once: true });
  pintarVer();
  if (!nota && !md) setTimeout(() => tit.focus(), 80);
  else if (md) setTimeout(() => { tx.focus(); const p = tx.value.indexOf("[ ] ") >= 0 ? tx.value.indexOf("[ ] ") + 4 : tx.value.length; tx.setSelectionRange(p, p); }, 80);
}

// ---------- Caixa de digitação (como numa conversa): escreve e envia = nota nova ----------
// A 1ª linha vira o título na lista (tituloDe); dentro de uma pasta, a nota nova entra nela.
function ligarCaixaRapida() {
  const f = $("ntComp"), t = $("ntRapida"), env = $("ntRapidaEnviar");
  const crescer = () => { t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 160) + "px"; env.disabled = !t.value.trim(); };
  t.addEventListener("input", crescer);
  // Computador: Enter salva e Shift+Enter pula linha. Celular: Enter pula linha e salva pelo botão.
  const toque = matchMedia("(pointer: coarse)").matches;
  t.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.shiftKey || toque || e.isComposing) return;
    // numa lista de tarefas, Enter continua a lista
    const linha = t.value.slice(0, t.selectionStart).split("\n").pop();
    if (RE_TAREFA.test(linha)) { e.preventDefault(); const pos = t.selectionStart; t.setRangeText("\n[ ] ", pos, pos, "end"); crescer(); return; }
    e.preventDefault(); f.requestSubmit();
  });
  $("ntRapidaLista").addEventListener("click", () => {
    const pos = t.selectionStart, antes = t.value.slice(0, pos);
    t.setRangeText((antes && !antes.endsWith("\n") ? "\n" : "") + "[ ] ", pos, t.selectionEnd, "end");
    t.focus(); crescer();
  });
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const texto = t.value.replace(/\s+$/, "").replace(/^\s*\n/, "");
    if (!texto.trim()) return;
    const n = { id: novoId(), titulo: "", texto: texto.slice(0, MAX_TEXTO), cor: "", pasta: filtro.startsWith("p:") ? filtro.slice(2) : "", fixada: false, arquivada: false, lixeira: 0, prazo: "", criadoEm: agora() };
    if (!["todas", "fixadas", "tarefas", "prazo"].includes(filtro) && !filtro.startsWith("p:")) filtro = "todas";
    if ((filtro === "tarefas" && !tarefas(n.texto).abertas) || filtro === "fixadas" || (filtro === "prazo")) filtro = "todas";
    busca = ""; $("ntBusca").value = "";
    salvar(n);
    t.value = ""; crescer();
    scrollTo({ top: 0, behavior: "smooth" });
    document.querySelector(`.nt-card[data-id="${n.id}"]`)?.classList.add("nt-nova-chegou");
  });
  crescer();
}

function avisoDesfazer(texto, desfazer) {
  document.querySelectorAll(".nt-snack").forEach((x) => x.remove());
  const s = document.createElement("div"); s.className = "nt-snack"; s.setAttribute("role", "status");
  s.innerHTML = `<span>${esc(texto)}</span><button type="button">Desfazer</button>`;
  s.querySelector("button").addEventListener("click", () => { desfazer(); s.remove(); });
  document.body.appendChild(s); setTimeout(() => s.remove(), 6000);
}

// ---------- Início ----------
(async () => {
  try { await iniciarRede(); }
  catch (e) { $("ntGrade").innerHTML = `<p class="nt-vazio">${esc(e.message || "Entre na sua conta.")}</p>`; return; }
  if (!document.documentElement.classList.contains("embutido")) try { montarBarraRede(""); } catch {}
  lerLocal(); limparLixeira(); pintar();
  $("ntNova").addEventListener("click", async () => {
    const k = await folha("Nova nota", [["branco", "Nota em branco", "nota", "Começar do zero"], ["lista", "Lista de tarefas", "tarefa", "Com caixinhas para marcar"], ...MODELOS.map(([k, nome, desc]) => [k, nome, "modelo", desc])]);
    if (!k) return;
    if (k === "lista") abrirEditor(null, {}), setTimeout(() => { const t = document.getElementById("edTexto"); if (t && !t.value) { t.value = "[ ] "; t.dispatchEvent(new Event("input")); } }, 90);
    else abrirEditor(null, { modelo: k === "branco" ? "" : k });
  });
  ligarCaixaRapida();
  let tBusca = 0;
  $("ntBusca").addEventListener("input", (e) => { clearTimeout(tBusca); tBusca = setTimeout(() => { busca = e.target.value; pintar(); }, 120); });
  $("ntOrdem").addEventListener("click", async () => {
    const k = await folha("Ordenar por", ORDENS.map(([k, nome]) => [k, nome, "ordenar", "", ordem === k ? "on" : ""]));
    if (k) { ordem = k; gravarLocal(); pintar(); }
  });
  const p = new URLSearchParams(location.search);
  if (p.get("nova") !== null) abrirEditor(null, { modelo: p.get("modelo") || "" });
  else if (p.get("id")) { const n = notas.find((x) => x.id === p.get("id")); if (n) abrirEditor(n); }
  await sincronizar();
  addEventListener("online", () => enviarPendentes());
  // Outra aba mudou as notas: lê de novo
  addEventListener("storage", (e) => { if (e.key === chave() && !document.querySelector(".nt-ed")) { lerLocal(); pintar(); } });
})();
