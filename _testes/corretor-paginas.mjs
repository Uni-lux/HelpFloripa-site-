// Falsos alarmes nas páginas do site (textos CERTOS, escritos com cuidado): o corretor não deveria mexer em nada.
// Conta as mudanças automáticas e as sugestões (que aparecem desligadas para a pessoa) frase por frase.
// Uso: node corretor-paginas.mjs        → números e as sugestões mais comuns
//      VER=1 node corretor-paginas.mjs  → mostra cada frase com mudança
//      MAX_AUTO=0 MAX_SUG=10 node corretor-paginas.mjs → falha (exit 1) se passar desses números
import fs from "node:fs";
const raiz = new URL("../", import.meta.url).pathname;
const C = await import(raiz + "corretor.js");
C.definirLexico(fs.readFileSync(raiz + "corretor/lexico2.txt", "utf8"));
C.definirContexto(fs.readFileSync(raiz + "corretor/contexto3.json", "utf8"), fs.readFileSync(raiz + "corretor/pesos3.bin"));
const PAGINAS = ["termos", "ajuda", "sobre", "privacidade", "diretrizes", "seguranca", "como-ordenamos", "clientes", "profissionais"];
const ent = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&rsquo;": "’", "&ldquo;": "“", "&rdquo;": "”", "&mdash;": "—", "&ndash;": "–", "&hellip;": "…" };
const frases = [];
for (const p of PAGINAS) {
  const html = fs.readFileSync(raiz + p + ".html", "utf8").replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, "");
  for (const m of html.matchAll(/<(p|li|h[1-6]|td|th|summary|dd|figcaption)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
    const t = m[2].replace(/<[^>]+>/g, " ").replace(/&[#\w]+;/g, (e) => ent[e] ?? " ").replace(/\s+/g, " ").replace(/ ([.,;:!?)])/g, "$1").replace(/\( /g, "(").trim();
    if (t.split(" ").length < 4) continue;
    for (const f of t.split(/(?<=[.!?])\s+(?=\p{Lu})/u)) if (f.split(" ").length >= 4) frases.push([p, f]);
  }
}
let auto = 0, sug = 0, fAuto = 0, fSug = 0;
const cont = {};
for (const [p, f] of frases) {
  const r = C.corrigirTexto(f, { modo: "pub" });
  // maiúscula/ponto final de pedaço de lista não contam (a frase foi tirada do meio do HTML)
  const ms = r.mudancas.filter((m) => !(m.tipo === "pontuacao" && /ponto final|pergunta/.test(m.motivo)) && m.tipo !== "maiuscula");
  const a = ms.filter((m) => m.ligada), s = ms.filter((m) => !m.ligada);
  auto += a.length; sug += s.length; if (a.length) fAuto++; if (s.length) fSug++;
  for (const m of ms) { const k = (m.ligada ? "AUTO " : "sug  ") + m.chave; cont[k] = (cont[k] || 0) + 1; }
  if (process.env.VER && ms.length) console.log(`[${p}] ${ms.map((m) => (m.ligada ? "AUTO " : "sug ") + m.de + " → " + m.para).join(" ; ")}\n    ${f.slice(0, 160)}`);
}
console.log(`${frases.length} frases certas de ${PAGINAS.length} páginas`);
console.log(`Mudanças automáticas: ${auto} (em ${fAuto} frases) · sugestões: ${sug} (em ${fSug} frases)`);
Object.entries(cont).sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([k, v]) => console.log("  ", v, k));
if (process.env.MAX_AUTO && auto > +process.env.MAX_AUTO) { console.log("✘ automáticas demais"); process.exitCode = 1; }
if (process.env.MAX_SUG && sug > +process.env.MAX_SUG) { console.log("✘ sugestões demais"); process.exitCode = 1; }
