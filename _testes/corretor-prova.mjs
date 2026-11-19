// Prova independente do corretor (19/11/2026): erros REAIS do português do Brasil, marcados à mão por linguistas.
// Corpus: NILC UGC Spelling Corpus (Duran, Mendonça et al., 2014; CC0) — 1.699 frases de avaliações de produtos da web,
// 4.083 erros (digitação, som, acento, outros), em corretor-prova/nilc-ugc.json (convertido do XML original).
// As frases de número ÍMPAR são a parte de ajuste (pode olhar os erros e melhorar o corretor por elas);
// as de número PAR são a PROVA: nunca olhar caso a caso, só a nota. Assim a nota mede o que o corretor faz com texto novo.
// Uso: node corretor-prova.mjs            → notas das duas partes
//      VER=typo node corretor-prova.mjs   → mostra os erros perdidos da parte de ajuste (typo|phono|diac|other|estragos)
//      MIN=nota node corretor-prova.mjs   → falha (exit 1) se a nota da prova ficar abaixo de MIN (ex.: MIN=55)
import fs from "node:fs";
const raiz = new URL("../", import.meta.url).pathname;
const C = await import(raiz + "corretor.js");
C.definirLexico(fs.readFileSync(raiz + "corretor/lexico2.txt", "utf8"));
C.definirContexto(fs.readFileSync(raiz + "corretor/contexto3.json", "utf8"), fs.readFileSync(raiz + "corretor/pesos3.bin"));
const corpus = JSON.parse(fs.readFileSync(new URL("corretor-prova/nilc-ugc.json", import.meta.url), "utf8"));

const PAL = /[\p{L}\p{N}][\p{L}\p{N}'’\-]*/gu;
const baixo = (s) => String(s || "").toLowerCase().replace(/’/g, "'");
const montar = (toks) => toks.map((t) => (Array.isArray(t) ? t[0] : t)).reduce((a, t) => (!a ? t : /^[.,;:!?)%]/.test(t) || /[(]$/.test(a) ? a + t : a + " " + t), "");

// alinha as palavras de entrada com as de saída (maior sequência em comum); trecho diferente = troca
function alinhar(a, b) {
  const n = a.length, m = b.length, dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = baixo(a[i]) === baixo(b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const saida = new Array(n).fill(null); let i = 0, j = 0;
  const fechar = (i0, i1, j0, j1) => {
    if (i1 - i0 === j1 - j0) for (let k = 0; k < i1 - i0; k++) saida[i0 + k] = b[j0 + k];
    else for (let k = i0; k < i1; k++) saida[k] = k === i0 ? b.slice(j0, j1).join(" ") : "";
  };
  let ia = 0, ja = 0;
  while (i < n && j < m) {
    if (baixo(a[i]) === baixo(b[j])) { fechar(ia, i, ja, j); saida[i] = b[j]; i++; j++; ia = i; ja = j; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  fechar(ia, n, ja, m);
  return saida;
}

function rodar(frase, aceitarTudo) {
  const texto = montar(frase);
  let r = C.corrigirTexto(texto, { modo: "chat" });
  if (aceitarTudo) r = C.corrigirTexto(texto, { modo: "chat", aceitar: new Set(r.mudancas.map((x) => x.chave)) });
  // cada token do corpus pode ter mais de uma palavra ("300,00", "10,0m²"): alinha pedaço a pedaço e junta de volta
  const pedacos = [], dono = [];
  frase.forEach((t, k) => { for (const p of (Array.isArray(t) ? t[0] : t).match(PAL) || []) { pedacos.push(p); dono.push(k); } });
  const saiP = alinhar(pedacos, r.texto.match(PAL) || []);
  const ent = [], idx = [], sai = [];
  pedacos.forEach((p, i) => {
    if (i && dono[i] === dono[i - 1]) { ent[ent.length - 1] += " " + p; sai[sai.length - 1] += " " + (saiP[i] ?? p); return; }
    ent.push(p); idx.push(dono[i]); sai.push(saiP[i] ?? p);
  });
  const abrev = new Set(r.mudancas.filter((x) => x.tipo === "abreviacao" && x.ligada).map((x) => baixo(x.de)));
  return { r, ent, idx, sai, desc: new Set(r.desconhecidas.map(baixo)), abrev };
}

const TIPOS = ["typo", "phono", "diac", "other"];
const NOMES = { typo: "Digitação", phono: "Pelo som", diac: "Acento", other: "Outros" };
function avaliar(parte) {
  const z = () => ({ erros: 0, auto: 0, sug: 0, marcados: 0 });
  const por = Object.fromEntries(TIPOS.map((t) => [t, z()])); por.ctx = z();
  let certas = 0, abrevs = 0, estragos = 0, estragosSug = 0, trocasAuto = 0, trocaErrada = 0;
  const perdidos = [], estragosLista = [];
  for (const [id, frase] of parte) {
    const A = rodar(frase, false), S = rodar(frase, true);
    A.ent.forEach((w, p) => {
      const tok = frase[A.idx[p]], errado = Array.isArray(tok);
      const sa = A.sai[p] ?? w, ss = S.sai[p] ?? w;
      const mudouA = baixo(sa) !== baixo(w), mudouS = baixo(ss) !== baixo(w);
      if (mudouA) trocasAuto++;
      if (!errado) {
        certas++;
        // "vc" → "você": o corpus não marcou gíria da internet como erro; conta à parte (não é estrago)
        if (mudouA && A.abrev.has(baixo(w))) { abrevs++; return; }
        if (mudouA) { estragos++; estragosLista.push([id, w, sa, montar(frase)]); }
        else if (mudouS) estragosSug++;
        return;
      }
      const [, certo, tipo, contextual] = tok, alvo = baixo((String(certo || "").match(PAL) || []).join(" "));
      for (const g of [por[tipo] || por.other, ...(contextual ? [por.ctx] : [])]) {
        g.erros++;
        if (baixo(sa) === alvo) g.auto++;
        if (baixo(ss) === alvo) g.sug++;
        if (mudouS || A.desc.has(baixo(w))) g.marcados++;
      }
      if (mudouA && baixo(sa) !== alvo) trocaErrada++;
      if (baixo(ss) !== alvo) perdidos.push([tipo, w, certo, ss, montar(frase)]);
    });
  }
  const erros = TIPOS.reduce((a, t) => a + por[t].erros, 0), auto = TIPOS.reduce((a, t) => a + por[t].auto, 0);
  const sug = TIPOS.reduce((a, t) => a + por[t].sug, 0), marc = TIPOS.reduce((a, t) => a + por[t].marcados, 0);
  const prec = trocasAuto - abrevs ? (auto / (trocasAuto - abrevs)) * 100 : 100;
  const rec = (auto / erros) * 100;
  // nota: F0.5 (acertar sem estragar pesa o dobro de pegar tudo — é o que importa num corretor que muda sozinho)
  const f05 = prec + rec ? (1.25 * prec * rec) / (0.25 * prec + rec) : 0;
  return { por, erros, auto, sug, marc, certas, abrevs, estragos, estragosSug, trocaErrada, prec, rec, f05, perdidos, estragosLista };
}

const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1).replace(".", ",") + "%" : "—");
const mostrar = (titulo, v) => {
  console.log(`\n== ${titulo}: ${v.erros} erros reais em ${v.erros + v.certas} palavras`);
  console.log(`   Corrigidos sozinhos:          ${v.auto} (${pct(v.auto, v.erros)})`);
  console.log(`   Corrigidos aceitando sugestões: ${v.sug} (${pct(v.sug, v.erros)})`);
  console.log(`   Encontrados (marcados):        ${v.marc} (${pct(v.marc, v.erros)})`);
  console.log(`   Erro trocado pela palavra errada: ${v.trocaErrada}`);
  console.log(`   Palavras CERTAS estragadas:    ${v.estragos} (${pct(v.estragos, v.certas)}) · sugestões erradas em palavras certas: ${v.estragosSug}`);
  console.log(`   Abreviações escritas por inteiro (vc → você; o corpus não marca): ${v.abrevs}`);
  console.log(`   Precisão das mudanças sozinhas: ${v.prec.toFixed(1).replace(".", ",")}% · NOTA (F0,5): ${v.f05.toFixed(1).replace(".", ",")}`);
  for (const t of [...TIPOS, "ctx"]) { const g = v.por[t]; if (g.erros) console.log(`     ${(NOMES[t] || "Dependem do contexto").padEnd(22)} ${String(g.erros).padStart(5)} · sozinho ${pct(g.auto, g.erros).padStart(6)} · com sugestões ${pct(g.sug, g.erros).padStart(6)} · marcados ${pct(g.marcados, g.erros).padStart(6)}`); }
};

const t0 = performance.now();
const ajuste = corpus.filter(([id]) => id % 2 === 1), prova = corpus.filter(([id]) => id % 2 === 0);
const va = avaliar(ajuste), vp = avaliar(prova);
mostrar("Parte de ajuste (frases ímpares)", va);
mostrar("PROVA (frases pares, nunca olhadas)", vp);
console.log(`\n(${((performance.now() - t0) / 1000).toFixed(1)} s)`);
if (process.env.VER) {
  const lista = process.env.VER === "estragos" ? va.estragosLista.map((e) => `   ${e[1]} → ${e[2]}   | ${e[3].slice(0, 120)}`)
    : va.perdidos.filter((p) => p[0] === process.env.VER).map((p) => `   ${p[1]} → ${p[2]} (saiu: ${p[3]})   | ${p[4].slice(0, 110)}`);
  console.log(`\nParte de ajuste — ${process.env.VER} (${lista.length}):`); console.log(lista.slice(0, +process.env.N || 80).join("\n"));
}
if (process.env.MIN && vp.f05 < +process.env.MIN) { console.log(`\n✘ nota da prova ${vp.f05.toFixed(1)} abaixo de ${process.env.MIN}`); process.exitCode = 1; }
