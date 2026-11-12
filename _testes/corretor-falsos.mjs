// Falsos alarmes do corretor: 6 mil frases CERTAS de cada fonte; conta as mudanças automáticas (o ideal é perto de zero).
import fs from "node:fs";
const C = await import(new URL("../", import.meta.url).pathname + "corretor.js");
C.definirLexico(fs.readFileSync(new URL("../", import.meta.url).pathname + "corretor/lexico.txt","utf8"));
C.definirContexto(fs.readFileSync(new URL("../", import.meta.url).pathname + "corretor/contexto.json","utf8"));
// Uso: node corretor-falsos.mjs PASTA (com machado.txt e modernos.txt, ver scripts/corretor/gerar-contexto.py); VER=texto mostra as frases
const D = (process.argv[2] || ".") + "/";
for (const [arq, n] of [["modernos.txt", 6000], ["machado.txt", 6000]]) {
  const linhas = fs.readFileSync(D+arq,"utf8").split("\n").filter(l => l.split(" ").length > 4 && !/^RT|@|#|http/.test(l));
  const amostra = []; for (let i = 0; i < linhas.length && amostra.length < n; i += Math.floor(linhas.length / n)) amostra.push(linhas[i]);
  const cont = {}; let frases = 0;
  for (const l of amostra) { const r = C.corrigirTexto(l, { modo: "pub" }); let teve = false;
    for (const m of r.mudancas) if (m.ligada && (m.motivo.includes("em volta") || m.tipo === "acento" && /é$|está$/.test(m.para) || m.tipo === "concordancia")) { const k = m.motivo.slice(0,40)+" | "+m.chave; cont[k] = (cont[k]||0)+1; teve = true; if (process.env.VER && m.chave.includes(process.env.VER)) console.log("   >>", l.slice(0,160)); }
    if (teve) frases++; }
  console.log(arq, amostra.length, "frases certas;", frases, "com mudança automática");
  Object.entries(cont).sort((a,b)=>b[1]-a[1]).slice(0,25).forEach(([k,v])=>console.log("  ",v,k));
}
