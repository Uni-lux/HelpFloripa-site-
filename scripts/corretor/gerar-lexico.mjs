// Gera corretor/lexico.txt: palavras do português do Brasil, da mais usada para a menos usada (uma por linha).
// Fontes (baixar antes, fora do repositório):
//   - dicionário VERO pt-BR (LibreOffice), pacote npm dictionary-pt-br 2.0.1 — LGPL-3.0 / MPL-2.0 (confere se a palavra existe)
//   - FrequencyWords pt_br_full.txt (Hermit Dave, legendas do OpenSubtitles) — conteúdo CC-BY-SA 4.0 (ordem de uso)
// Uso: npm install nspell dictionary-pt-br (numa pasta temporária) e
//      node gerar-lexico.mjs <pasta com index.aff/index.dic> <pt_br_full.txt> <saida.txt>
import fs from "node:fs";
import { createRequire } from "node:module";
const [, , pastaDic, freq, saida] = process.argv;
const require = createRequire(import.meta.url + "/../");
const nspell = require(process.env.NSPELL || "nspell");
const sp = nspell({ aff: fs.readFileSync(pastaDic + "/index.aff"), dic: fs.readFileSync(pastaDic + "/index.dic") });
// Palavras do dia a dia que o dicionário formal não traz, mas que estão certas no português falado/escrito no Brasil.
const COLOQUIAIS = ["pra", "pro", "pros", "pras", "tá", "tô", "né", "cê", "tava", "tavam", "tão", "num", "numa", "dum", "duma",
  "vamo", "bora", "oi", "olá", "tchau", "valeu", "beleza", "show", "ok", "blz", "kkk", "rs", "aí", "pô", "uai", "ué", "tipo",
  "whatsapp", "instagram", "pix", "online", "delivery", "app", "site", "link", "post", "story", "stories", "flash", "help", "floripa"];
const linhas = fs.readFileSync(freq, "utf8").split("\n");
const vistas = new Set(), lista = [];
for (const l of linhas) {
  const [w, n] = l.trim().split(/\s+/);
  if (!w || Number(n) < 3) continue;
  if (!/^[a-záàâãéêíóôõúüç]+(-[a-záàâãéêíóôõúüç]+)*$/.test(w) || w.length > 24) continue;
  if (vistas.has(w)) continue;
  if (!sp.correct(w)) continue;
  vistas.add(w); lista.push(w);
}
for (const w of COLOQUIAIS) if (!vistas.has(w)) { vistas.add(w); lista.push(w); }
fs.writeFileSync(saida, lista.join("\n") + "\n");
console.log(lista.length, "palavras,", fs.statSync(saida).size, "bytes");
