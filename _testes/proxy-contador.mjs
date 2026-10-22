// Medidor de leituras: fica entre o site e o emulador do Firestore (8086 → 8085) e conta o que o
// Firebase cobraria: cada documento que o servidor manda (documentChange / batchGet / runQuery),
// cada contagem (runAggregationQuery) e cada gravação (update/delete no canal Write), além dos bytes.
// Uso: node proxy-contador.mjs  →  GET http://127.0.0.1:8086/__contagem (lê)  /__zerar (zera)
// Guarda também quantos documentos de cada coleção (para achar quem lê demais).
import http from "node:http";

const ALVO = { host: "127.0.0.1", port: 8085 };
let c = zero();
function zero() { return { leituras: 0, contagens: 0, gravacoes: 0, bytes: 0, colecoes: {}, contagensPor: {} }; }

const RE_DOC = /"(?:documentChange|found)"\s*:\s*\{\s*"document"\s*:\s*\{\s*"name"\s*:\s*"projects\/[^/]+\/databases\/[^/]+\/documents\/([^"]+)"/g;
const RE_QUERY_DOC = /"document"\s*:\s*\{\s*"name"\s*:\s*"projects\/[^/]+\/databases\/[^/]+\/documents\/([^"]+)"/g;
const colecaoDe = (caminho) => caminho.split("/").filter((_, i) => i % 2 === 0).join("/");

// Conta os documentos completos do texto e devolve onde terminou o último (o resto pode ter um pela metade).
function contarResposta(texto, rest) {
  // Canal Listen (WebChannel): "documentChange"; batchGet: "found". runQuery (REST): cada "document".
  const re = rest ? RE_QUERY_DOC : RE_DOC;
  re.lastIndex = 0;
  let m, fim = 0;
  while ((m = re.exec(texto))) { fim = re.lastIndex; c.leituras++; const k = colecaoDe(m[1]); c.colecoes[k] = (c.colecoes[k] || 0) + 1; }
  return fim;
}

http.createServer((req, res) => {
  if (req.url.startsWith("/__contagem")) { res.setHeader("content-type", "application/json"); res.setHeader("access-control-allow-origin", "*"); return res.end(JSON.stringify(c)); }
  if (req.url.startsWith("/__zerar")) { c = zero(); res.setHeader("access-control-allow-origin", "*"); return res.end("ok"); }
  const corpoReq = [];
  req.on("data", (d) => corpoReq.push(d));
  req.on("end", () => {
    const corpo = Buffer.concat(corpoReq);
    const url = req.url;
    if (/runAggregationQuery/.test(url)) {
      c.contagens++;
      const k = (corpo.toString().match(/"collectionId"\s*:\s*"([^"]+)"/) || [])[1] || "?";
      c.contagensPor[k] = (c.contagensPor[k] || 0) + 1;
    }
    if (/Firestore\/Write\/channel/.test(url) && corpo.length) {
      const t = decodeURIComponent(corpo.toString("utf8").replace(/\+/g, " "));
      c.gravacoes += (t.match(/"(update|delete|transform)"\s*:/g) || []).filter((x) => !x.includes("transform")).length;
    }
    if (/:commit\b/.test(url) && corpo.length) c.gravacoes += (corpo.toString().match(/"(update|delete)"\s*:/g) || []).length;
    const p = http.request({ ...ALVO, method: req.method, path: url, headers: { ...req.headers, host: "127.0.0.1:8085" } }, (r) => {
      res.writeHead(r.statusCode, r.headers);
      const rest = /:runQuery\b/.test(url);
      let resto = "";
      r.on("data", (d) => {
        c.bytes += d.length;
        // Junta o fim do pedaço anterior: um documento pode chegar partido em dois pedaços.
        const t = resto + d.toString("utf8");
        const fim = contarResposta(t, rest);
        resto = t.slice(Math.max(fim, t.length - 600));
        res.write(d);
      });
      r.on("end", () => { contarResposta(resto, rest); res.end(); });
    });
    p.on("error", () => { try { res.writeHead(502); res.end(); } catch {} });
    p.end(corpo);
  });
}).listen(8086, "127.0.0.1", () => console.log("Medidor de leituras em http://127.0.0.1:8086 → 8085"));
