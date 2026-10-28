// Quanto cada página custa: leituras, contagens, gravações e bytes que o Firebase cobraria.
// Precisa: emulador + servidor-csp.mjs + proxy-contador.mjs (8086) + seed.mjs + carga-seed.mjs.
// Uso: FS_PORTA=8086 node t-leituras.mjs [saida/arquivo.json]
// Cada página é aberta num navegador novo (1ª visita, sem nada no aparelho) e depois de novo na
// mesma aba (2ª visita, com o cache do aparelho), como alguém que volta à página.
import { navegador, entrar, BASE } from "./nav.mjs";
import { writeFileSync } from "node:fs";
if (process.env.FS_PORTA !== "8086") { console.error("Rode com FS_PORTA=8086 (medidor de leituras)."); process.exit(1); }

const TODAS = [["Início", "index.html"], ["Diário", "feed.html"], ["Explorar", "feed.html?aba=explorar"], ["Serviços", "servicos.html"], ["Imóveis", "imoveis.html"], ["Delivery", "delivery.html"], ["Shopping", "shopping.html"], ["Saúde", "saude.html"], ["Comunidade", "comunidade.html"], ["Reclamações", "reclamacoes.html"], ["Perfil", "usuarios.html"], ["Mensagens", "mensagens.html"], ["Notificações", "notificacoes.html"]];
const PAGINAS = process.env.SO ? TODAS.filter(([n]) => process.env.SO.split(",").includes(n)) : TODAS;
const contador = (c) => fetch("http://127.0.0.1:8086/__" + c).then((r) => (c === "contagem" ? r.json() : r.text()));
const ESPERA = Number(process.env.ESPERA || 9000);

async function medir(page, url) {
  await contador("zerar");
  await page.goto(BASE + url);
  await page.waitForTimeout(ESPERA);
  // Rola até o fim duas vezes (rolagem infinita e "marcar como vista" contam).
  for (let i = 0; i < 2; i++) { await page.mouse.wheel(0, 4000); await page.waitForTimeout(1500); }
  await page.waitForTimeout(1500);
  return contador("contagem");
}

const res = [];
for (const [nome, url] of process.env.SO_SESSAO ? [] : PAGINAS) {
  const { browser, ctx } = await navegador({ mobile: true });
  const page = await entrar(ctx, "ana", "sobre.html");
  await page.waitForTimeout(3000);
  const a = await medir(page, url);
  await page.goto(BASE + "sobre.html"); await page.waitForTimeout(1500);
  const b = await medir(page, url);
  const top = Object.entries(a.colecoes).sort((x, y) => y[1] - x[1]).slice(0, 6).map(([k, v]) => `${k} ${v}`).join(", ");
  console.log(`${nome.padEnd(13)} 1ª: ${String(a.leituras).padStart(4)} leituras, ${a.contagens} contagens, ${a.gravacoes} gravações, ${(a.bytes / 1e6).toFixed(2)} MB | 2ª: ${String(b.leituras).padStart(4)} leituras, ${(b.bytes / 1e6).toFixed(2)} MB | ${top}`);
  res.push({ nome, url, primeira: a, segunda: b });
  await browser.close();
}
// Sessão de verdade: a mesma pessoa, no mesmo aparelho, passando pelas páginas (o que uma página já leu
// fica guardado para a outra).
{
  const { browser, ctx } = await navegador({ mobile: true });
  const page = await entrar(ctx, "ana", "sobre.html");
  await page.waitForTimeout(3000);
  await contador("zerar");
  for (const url of ["index.html", "feed.html", "feed.html?aba=explorar", "servicos.html", "usuarios.html", "notificacoes.html", "feed.html", "index.html"]) {
    await page.goto(BASE + url); await page.waitForTimeout(ESPERA);
  }
  const s = await contador("contagem");
  console.log(`Sessão (Início → Diário → Explorar → Serviços → Perfil → Notificações → Diário → Início): ${s.leituras} leituras, ${s.contagens} contagens, ${s.gravacoes} gravações, ${(s.bytes / 1e6).toFixed(2)} MB`);
  res.push({ nome: "Sessão", sessao: s });
  // "Ver mais" no fim dos Principais busca as publicações mais antigas (não para no que veio primeiro).
  await page.goto(BASE + "feed.html"); await page.waitForTimeout(ESPERA);
  const ids = async () => page.$$eval("#listaFeed .post-card", (l) => l.length);
  let antes = 0, n = await ids();
  for (let i = 0; i < 25 && n !== antes; i++) {
    antes = n;
    if (await page.locator("#maisFeed").isHidden()) break;
    await page.locator("#maisFeed").click();
    await page.waitForFunction((k) => document.querySelectorAll("#listaFeed .post-card").length > k, antes, { timeout: 8000 }).catch(() => {});
    n = await ids();
  }
  console.log(`Diário com "Ver mais": ${n} publicações na tela`);
  if (process.env.CONFERIR_MAIS && n <= 130) { console.error("FALHOU: o Ver mais parou cedo"); process.exitCode = 1; }
  await browser.close();
}
const tot = res.filter((r) => r.primeira).reduce((s, r) => s + r.primeira.leituras, 0);
console.log(`Total da 1ª visita nas ${res.filter((r) => r.primeira).length} páginas: ${tot} leituras`);
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(res, null, 1));
