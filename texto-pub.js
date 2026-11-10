// =====================================================
// Texto das publicações do Diário (10/11/2026, pedido do dono): título em cima, descrição embaixo (até 1.000) e as
// #hashtags SEMPRE no fim, organizadas numa linha só. "Formatar texto" arruma espaços, linhas em branco, letra
// maiúscula no começo das frases e espaço depois da pontuação, sem mexer em links, @menções e números.
// Sem dependências (usado no formulário de publicar, no cartão do Diário e nos testes).
// =====================================================
export const MAX_TITULO = 90;
export const MAX_TAGS = 10;
const TAG = /(^|[^\p{L}\p{N}_#])#([\p{L}\p{N}_]{1,30})(?![\p{L}\p{N}_])/gu;
const ehEspecial = (tok) => /^(https?:\/\/|www\.)|^[@#]|\.[a-z]{2,}(\/|$)/i.test(tok) || /\d[.,:]\d/.test(tok);

// Hashtags do texto, na ordem em que aparecem (sem repetir, sem diferenciar maiúsculas).
export function hashtagsDe(texto) {
  const vistas = new Set(), lista = [];
  for (const m of String(texto || "").matchAll(TAG)) {
    const k = m[2].toLowerCase();
    if (!vistas.has(k)) { vistas.add(k); lista.push(m[2]); }
  }
  return lista;
}

// Tira as hashtags do corpo: as que estão no meio de uma frase viram a palavra normal ("adoro #floripa no verão" →
// "adoro floripa no verão"); as soltas (no fim da linha ou numa linha só delas) saem.
export function semHashtags(texto) {
  return String(texto || "").split("\n").map((linha) => {
    // grupo de hashtags no fim da linha (com espaços e pontuação leve entre elas)
    let l = linha.replace(/(?:(?:^|\s+)#[\p{L}\p{N}_]{1,30}[,;.!]*)+\s*$/u, "");
    l = l.replace(TAG, (m, antes, tag) => antes + tag);
    return l.replace(/\s+$/, "");
  }).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// Corpo + uma linha com as hashtags no fim (até 10). Sem descrição: só as hashtags.
export function organizarHashtags(texto) {
  const tags = hashtagsDe(texto).slice(0, MAX_TAGS);
  const corpo = semHashtags(texto);
  if (!tags.length) return corpo;
  const linha = tags.map((t) => "#" + t).join(" ");
  return corpo ? corpo + "\n\n" + linha : linha;
}

// Separa para mostrar: { corpo, tags } (as hashtags viram etiquetas embaixo da descrição).
export function partesDoTexto(texto) {
  const tags = hashtagsDe(texto).slice(0, MAX_TAGS);
  return { corpo: tags.length ? semHashtags(texto) : String(texto || "").trim(), tags };
}

function frasesComMaiuscula(linha, comecaFrase) {
  // Maiúscula no começo da linha (se a linha anterior acabou a frase) e depois de . ! ? (… também)
  let novaFrase = comecaFrase;
  return linha.split(/(\s+)/).map((tok) => {
    if (!tok || /^\s+$/.test(tok)) return tok;
    let t = tok;
    if (/^[-•*–]$/.test(t)) return t; // marcador de lista: a palavra seguinte começa com maiúscula
    if (novaFrase && !ehEspecial(t)) t = t.replace(/^(["“'(¿¡]*)(\p{Ll})/u, (m, a, l) => a + l.toUpperCase());
    novaFrase = /[.!?…]["”')]*$/.test(t) && !/^(sr|sra|dr|dra|av|ex|etc|obs|vs|n[º°o]?)\.$/i.test(t) && !ehEspecial(t);
    return t;
  }).join("");
}

// Deixa o texto bonito e organizado. Devolve o texto novo (igual ao de entrada se não havia nada para arrumar).
export function formatarTexto(texto, { hashtagsNoFim = true } = {}) {
  let s = String(texto || "").replace(/\r\n?/g, "\n").replace(/[\t ]+/g, " ");
  const linhas = s.split("\n").map((l) => {
    let x = l.replace(/ {2,}/g, " ").trim();
    // tokens com link, @, # e números (1,5 / 10:30 / 3.000) ficam como estão
    x = x.split(" ").map((tok) => {
      if (ehEspecial(tok)) return tok;
      return tok
        .replace(/([,;:])(?=\p{L})/gu, "$1 ")        // "oi,tudo" → "oi, tudo"
        .replace(/([!?])(?=\p{L})/gu, "$1 ")           // "oi!tudo" → "oi! tudo"
        .replace(/(\p{Ll}{2,})\.(?=\p{L}{2,})/gu, "$1. "); // "fim.Começo" → "fim. Começo"
    }).join(" ");
    x = x.replace(/\s+([,;:!?.…])(?=\s|$)/g, "$1")   // "oi ," → "oi,"
      .replace(/([!?]){3,}/g, "$1$1$1")                 // "!!!!!!" → "!!!"
      .replace(/\.{4,}/g, "...")
      .replace(/ {2,}/g, " ");
    return x;
  });
  // no máximo uma linha em branco entre os parágrafos; sem linhas em branco no começo e no fim
  const juntas = [];
  for (const l of linhas) { if (!l && (!juntas.length || !juntas[juntas.length - 1])) continue; juntas.push(l); }
  while (juntas.length && !juntas[juntas.length - 1]) juntas.pop();
  let fim = true;
  const prontas = juntas.map((l) => { if (!l) { fim = true; return l; } const r = frasesComMaiuscula(l, fim || /^[-•*–]\s/.test(l)); fim = /[.!?…:]["”')]*$/.test(r) || /^[-•*–]\s/.test(l); return r; });
  // listas: "- item" / "* item" viram "• item"
  s = prontas.map((l) => l.replace(/^[-*–]\s+/, "• ")).join("\n");
  return hashtagsNoFim ? organizarHashtags(s) : s;
}

// Título: uma linha, sem espaços sobrando, até 90 letras.
export const limparTitulo = (t) => String(t || "").replace(/\s+/g, " ").trim().slice(0, MAX_TITULO);
