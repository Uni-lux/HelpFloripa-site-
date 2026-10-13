// Serve o site na porta 5057 com a CSP real de cada página, só liberando o emulador (127.0.0.1).
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
const SITE = fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, "");
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".webp": "image/webp", ".ico": "image/x-icon", ".svg": "image/svg+xml", ".json": "application/json", ".xml": "application/xml", ".txt": "text/plain" };
http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "") || "index.html";
    const f = normalize(join(SITE, p));
    if (!f.startsWith(SITE)) throw new Error("fora");
    let corpo = await readFile(f);
    if (extname(f) === ".html") corpo = corpo.toString("utf8").replace(/(<meta http-equiv="Content-Security-Policy" content=")([^"]*)"/, (_, a, c) => a + c.replace("connect-src", "connect-src http://127.0.0.1:8085 http://127.0.0.1:9099").replace(/;\s*upgrade-insecure-requests/, "") + '"');
    res.writeHead(200, { "content-type": TIPOS[extname(f)] || "application/octet-stream", "cache-control": "no-store" });
    res.end(corpo);
  } catch { res.writeHead(404); res.end("404"); }
}).listen(5057, "127.0.0.1");
