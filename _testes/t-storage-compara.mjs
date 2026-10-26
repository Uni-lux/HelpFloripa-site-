// Compara o site com as fotos dentro dos documentos (hoje) e no Storage (USAR_STORAGE = true), com a mesma carga.
// Mede por página, num celular com 4G simulado: leituras do Firestore, MB do Firestore, MB de fotos do Storage,
// MB total baixado, tempo até o maior conteúdo aparecer (LCP), memória da página e o que fica guardado no aparelho.
// 1ª visita (aparelho vazio) e 2ª visita (mesma aba, com o cache do navegador e do site).
// Preparar: ./emulador.sh, servidor-csp.mjs, proxy-contador.mjs (8086), seed.mjs, carga-seed.mjs, python3 gerar-fotos.py
// Uso: node carga-fotos.mjs doc     && FS_PORTA=8086 node t-storage-compara.mjs saida/cmp-doc.json
//      node carga-fotos.mjs storage && STORAGE=1 FS_PORTA=8086 node t-storage-compara.mjs saida/cmp-storage.json
import { navegador, entrar, BASE } from "./nav.mjs";
import { writeFileSync } from "node:fs";
if (process.env.FS_PORTA !== "8086") { console.error("Rode com FS_PORTA=8086 (medidor de leituras)."); process.exit(1); }
const PAGINAS = [["Início", "index.html"], ["Diário", "feed.html"], ["Explorar", "feed.html?aba=explorar"], ["Freelances", "servicos.html"], ["Delivery", "delivery.html"], ["Imóveis", "imoveis.html"]];
const ESPERA = Number(process.env.ESPERA || 10000);
// 4G comum no Brasil: 10 Mbit/s para baixar, 3 Mbit/s para enviar, 70 ms de ida e volta.
const REDE = { offline: false, latency: 70, downloadThroughput: (10e6 / 8), uploadThroughput: (3e6 / 8) };
const contador = (c) => fetch("http://127.0.0.1:8086/__" + c).then((r) => (c === "contagem" ? r.json() : r.text()));

async function preparar(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", REDE);
  const urls = new Map(), bytes = { site: 0, firestore: 0, storage: 0, outros: 0 };
  cdp.on("Network.requestWillBeSent", (e) => urls.set(e.requestId, e.request.url));
  const somar = (id, n) => { const u = urls.get(id) || ""; const k = /:9199\//.test(u) ? "storage" : /:808[56]\//.test(u) ? "firestore" : /:505[67]\//.test(u) ? "site" : "outros"; bytes[k] += n; };
  cdp.on("Network.dataReceived", (e) => somar(e.requestId, e.encodedDataLength || 0));
  return { zerar: () => { for (const k in bytes) bytes[k] = 0; }, ler: () => ({ ...bytes }) };
}
async function medir(page, rede, url) {
  await contador("zerar"); rede.zerar();
  const t0 = Date.now();
  await page.goto(BASE + url);
  await page.waitForTimeout(ESPERA);
  for (let i = 0; i < 2; i++) { await page.mouse.wheel(0, 3000); await page.waitForTimeout(1500); }
  const lcp = await page.evaluate(() => new Promise((r) => { try { new PerformanceObserver((l) => r(l.getEntries().at(-1)?.startTime || 0)).observe({ type: "largest-contentful-paint", buffered: true }); } catch { r(0); } setTimeout(() => r(0), 1500); }));
  const mem = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);
  const guardado = await page.evaluate(() => { let t = 0; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); t += k.length + (localStorage.getItem(k) || "").length; } } catch {} return t * 2; });
  const fs = await contador("contagem");
  const b = rede.ler();
  return { leituras: fs.leituras, fsMB: fs.bytes / 1e6, storageMB: b.storage / 1e6, totalMB: (b.site + b.firestore + b.storage + b.outros) / 1e6, lcp: Math.round(lcp), memMB: mem / 1e6, guardadoMB: guardado / 1e6, ms: Date.now() - t0 };
}
const fmt = (m) => `${String(m.leituras).padStart(4)} leit. | Firestore ${m.fsMB.toFixed(2).padStart(6)} MB | fotos Storage ${m.storageMB.toFixed(2).padStart(5)} MB | total ${m.totalMB.toFixed(2).padStart(6)} MB | LCP ${(m.lcp / 1000).toFixed(1).padStart(4)} s | memória ${m.memMB.toFixed(0).padStart(4)} MB | aparelho ${m.guardadoMB.toFixed(2)} MB`;

const res = [];
for (const [nome, url] of PAGINAS) {
  const { browser, ctx } = await navegador({ mobile: true });
  const page = await entrar(ctx, "ana", "sobre.html");
  const rede = await preparar(page);
  await page.waitForTimeout(2500);
  const a = await medir(page, rede, url);
  await page.goto(BASE + "sobre.html"); await page.waitForTimeout(1500);
  const b = await medir(page, rede, url);
  console.log(`${nome.padEnd(11)} 1ª: ${fmt(a)}\n${"".padEnd(11)} 2ª: ${fmt(b)}`);
  res.push({ nome, url, primeira: a, segunda: b });
  await browser.close();
}
// Sessão: a mesma pessoa passando pelas páginas no mesmo aparelho.
{
  const { browser, ctx } = await navegador({ mobile: true });
  const page = await entrar(ctx, "ana", "sobre.html");
  const rede = await preparar(page);
  await page.waitForTimeout(2500);
  await contador("zerar"); rede.zerar();
  for (const url of ["index.html", "feed.html", "feed.html?aba=explorar", "servicos.html", "delivery.html", "imoveis.html", "feed.html", "index.html"]) { await page.goto(BASE + url); await page.waitForTimeout(ESPERA); }
  const fs = await contador("contagem"), b = rede.ler();
  const s = { leituras: fs.leituras, fsMB: fs.bytes / 1e6, storageMB: b.storage / 1e6, totalMB: (b.site + b.firestore + b.storage + b.outros) / 1e6 };
  console.log(`Sessão (Início → Diário → Explorar → Freelances → Delivery → Imóveis → Diário → Início): ${s.leituras} leituras | Firestore ${s.fsMB.toFixed(2)} MB | fotos Storage ${s.storageMB.toFixed(2)} MB | total ${s.totalMB.toFixed(2)} MB`);
  res.push({ nome: "Sessão", sessao: s });
  await browser.close();
}
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(res, null, 1));
