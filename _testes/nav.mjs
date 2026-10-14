// Abre páginas do site (direto do disco) num Chromium ligado ao emulador demo-hf.
import { chromium } from "playwright-core";
import { readFileSync, existsSync } from "node:fs";
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
