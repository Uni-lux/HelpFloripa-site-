// Abre páginas do site (direto do disco) num Chromium ligado ao emulador demo-hf.
import { chromium } from "playwright-core";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
export const SITE = process.env.SITE || fileURLToPath(new URL("..", import.meta.url));
export const BASE = process.env.CSP === "0" ? "http://127.0.0.1:5056/" : "http://127.0.0.1:5057/";
const FB = fileURLToPath(new URL("node_modules/firebase/", import.meta.url));
const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".webp": "image/webp", ".ico": "image/x-icon", ".svg": "image/svg+xml", ".json": "application/json" };
export const USUARIOS = JSON.parse(readFileSync(new URL("saida/seed.json", import.meta.url), "utf8"));

function firebasePatch() {
  let s = readFileSync(join(SITE, "firebase.js"), "utf8");
  s = s.replace('projectId: "helpfloripa-61e0d"', 'projectId: "demo-hf"').replace(/apiKey: "[^"]+"/, 'apiKey: "fake-api-key"');
  s = s.replace("import { getAuth, onAuthStateChanged }", "import { getAuth, onAuthStateChanged, connectAuthEmulator, signInWithEmailAndPassword }");
  s = s.replace("import { getFirestore,", "import { connectFirestoreEmulator, getFirestore,");
  s = s.replace("const auth = getAuth(app);", 'const auth = getAuth(app); connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true }); window.__login = (e, p) => signInWithEmailAndPassword(auth, e, p);');
  s = s.replace("window.firebaseApp = app;", 'connectFirestoreEmulator(db, "127.0.0.1", 8085);\nwindow.firebaseApp = app;');
  if (!s.includes("connectFirestoreEmulator(db")) throw new Error("patch do firebase.js falhou");
  return s;
}

// CSP de verdade: só acrescenta o emulador (127.0.0.1) e tira o upgrade-insecure-requests.
function cspDeTeste(html) {
  return html.replace(/(<meta http-equiv="Content-Security-Policy" content=")([^"]*)"/, (_, a, c) => a + c.replace("connect-src", "connect-src http://127.0.0.1:8085 http://127.0.0.1:9099 ws://127.0.0.1:8085").replace(/;\s*upgrade-insecure-requests/, "") + '"');
}
// camera: true liga uma câmera de mentira (vídeo de teste do Chromium) já com permissão.
export async function navegador({ mobile = false, headless = true, csp = process.env.CSP !== "0", camera = false } = {}) {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", headless, args: ["--no-proxy-server", ...(camera ? ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] : [])] });
  const ctx = await browser.newContext({ bypassCSP: !csp, serviceWorkers: "block", ...(mobile ? { viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 860 } }), locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
  if (camera) await ctx.grantPermissions(["camera"], { origin: BASE.replace(/\/$/, "") });
  await ctx.route("https://www.gstatic.com/firebasejs/**", (r) => {
    const nome = new URL(r.request().url()).pathname.split("/").pop();
    const p = FB + nome;
    return existsSync(p) ? r.fulfill({ body: readFileSync(p), contentType: "text/javascript" }) : r.abort();
  });
  // Aviso de manutenção (manutencao.js) fora dos testes: o cartão cobre botões embaixo da tela.
  await ctx.route(/\/manutencao\.js(\?.*)?$/, (r) => r.fulfill({ body: "export function avisoManutencao() {}", contentType: "text/javascript" }));
  await ctx.route(/\/firebase\.js(\?.*)?$/, (r) => r.fulfill({ body: firebasePatch(), contentType: "text/javascript" }));
  await ctx.route(/^https?:\/\/(?!hf\.local|127\.0\.0\.1|localhost|www\.gstatic\.com)/, (r) => r.abort());
  return { browser, ctx };
}

export async function entrar(ctx, quem, pagina) {
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log(`[pageerror ${quem}]`, e.message));
  page.on("console", (m) => { if (m.type() === "error") console.log(`[console ${quem}]`, m.text().slice(0, 300)); });
  await page.goto(BASE + "login.html");
  await page.waitForFunction(() => !!window.__login, null, { timeout: 20000 });
  await page.evaluate(([e]) => window.__login(e, "teste123"), [`${quem}@teste.com`]);
  if (pagina) await page.goto(BASE + pagina);
  return page;
}

// Imagem de teste (PNG em degradê) criada na hora se ainda não existe: os testes não dependem da ordem.
export function garantirImagem(caminho, w = 1200, h = 800) {
  const arq = caminho.startsWith("/") ? caminho : fileURLToPath(new URL(caminho, import.meta.url));
  if (existsSync(arq)) return arq;
  mkdirSync(arq.replace(/\/[^/]*$/, ""), { recursive: true });
  const linhas = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { const o = y * (w * 3 + 1); for (let x = 0; x < w; x++) { linhas[o + 1 + x * 3] = (x * 255 / w) | 0; linhas[o + 2 + x * 3] = (y * 255 / h) | 0; linhas[o + 3 + x * 3] = 160; } }
  const crc = (b) => { let c = ~0; for (const v of b) { c ^= v; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
  const bloco = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  writeFileSync(arq, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloco("IHDR", ihdr), bloco("IDAT", deflateSync(linhas)), bloco("IEND", Buffer.alloc(0))]));
  return arq;
}
