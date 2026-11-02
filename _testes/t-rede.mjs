// Rede social numa página só (rede.html): abas sem recarregar, rolagem guardada, deslize mostrando a aba vizinha,
// "voltar" entre abas e links que não são abas abrindo no próprio quadro (02/11/2026).
// Uso: node t-rede.mjs (rodar seed.mjs antes)
import { navegador, entrar } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const erros = [];
const A = await navegador({ mobile: true, rede: true });
const p = await entrar(A.ctx, "ana", "feed.html");
p.on("pageerror", (e) => erros.push(e.message));
await p.waitForURL(/rede\.html\?aba=diario/, { timeout: 15000 }).catch(() => {});
ok(/rede\.html\?aba=diario/.test(p.url()), `feed.html aberto sozinho vai para a rede (${p.url().split("/").pop()})`);
const quadro = (id) => p.frames().find((f) => f.parentFrame() && new RegExp(id).test(f.url()));
const ativo = () => p.evaluate(() => document.querySelector(".hf-quadro.ativo")?.dataset.id);
await p.waitForTimeout(4000);
const feed = quadro("feed\\.html");
ok(!!feed && await ativo() === "feed", "o Diário aparece dentro da rede");
await feed.waitForSelector("#listaFeed > :not(.esqueleto-post)", { timeout: 15000 }).catch(() => {});
ok(await feed.evaluate(() => document.documentElement.classList.contains("na-rede")), "a página sabe que está na rede");
// as outras abas carregam sozinhas depois
for (let i = 0; i < 40 && (await p.evaluate(() => document.querySelectorAll(".hf-quadro").length)) < 4; i++) await p.waitForTimeout(500);
ok(await p.evaluate(() => document.querySelectorAll(".hf-quadro").length) === 4, "Comunidade, Mensagens e Perfil carregaram sozinhos por trás");
await p.waitForTimeout(3000);

// marca no Diário para saber se recarregou; rola a página
await feed.evaluate(() => { window.__marca = 123; document.body.style.minHeight = "3000px"; scrollTo(0, 400); });
await p.waitForTimeout(300);
const rolagem = await feed.evaluate(() => scrollY);
// barra: Mensagens
await feed.locator("#barraRede [data-barra=mensagens]").tap();
await p.waitForTimeout(500);
ok(await ativo() === "mensagens" && /aba=mensagens/.test(p.url()), "tocar em Mensagens mostra a aba na hora (sem recarregar a página)");
const msgs = quadro("mensagens\\.html");
ok(await msgs.evaluate(() => document.documentElement.classList.contains("na-rede") && !document.documentElement.classList.contains("embutido")), "Mensagens na rede não vira a gaveta");
ok(await msgs.locator("#listaConversas > *").count() > 0, "lista de conversas já pronta");
// volta ao Diário pela barra do Mensagens
await msgs.locator("#barraRede a").first().tap();
await p.waitForTimeout(500);
ok(await ativo() === "feed", "Diário de novo");
ok(await feed.evaluate(() => window.__marca) === 123, "o Diário não recarregou");
ok(Math.abs((await feed.evaluate(() => scrollY)) - rolagem) < 5, `a rolagem ficou onde estava (${rolagem} px)`);

// Explorar (mesmo quadro do Diário)
await feed.locator("#barraRede [data-barra=explorar]").tap();
await p.waitForTimeout(800);
ok(/aba=explorar/.test(p.url()) && await feed.evaluate(() => !document.getElementById("painelExplorar").hidden), "Explorar troca dentro do Diário e o endereço acompanha");

// deslize do Explorar para a Comunidade: a Comunidade aparece de verdade ao lado
const cdp = await A.ctx.newCDPSession(p);
const toque = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
const y = await feed.evaluate(() => {
  for (let y = 560; y > 140; y -= 20) {
    const ok = [330, 200].every((x) => { for (let n = document.elementFromPoint(x, y); n && n !== document.body; n = n.parentElement) { const o = getComputedStyle(n).overflowX; if (n.scrollWidth > n.clientWidth + 4 && (o === "auto" || o === "scroll")) return false; } return true; });
    if (ok) return y;
  }
  return 560;
});
await toque("touchStart", [[330, y]]);
for (let k = 1; k <= 8; k++) { await toque("touchMove", [[330 - k * 15, y + 1]]); await p.waitForTimeout(20); }
const meio = await p.evaluate(() => { const m = document.querySelector('.hf-quadro[data-id="mural"]'); return { cls: m.className, tr: m.style.transform }; });
ok(/movendo/.test(meio.cls) && /translate3d\(\d+/.test(meio.tr), `durante o deslize a Comunidade aparece ao lado (${meio.tr})`);
for (let k = 9; k <= 16; k++) { await toque("touchMove", [[330 - k * 15, y + 1]]); await p.waitForTimeout(20); }
await toque("touchEnd", []);
await p.waitForTimeout(700);
ok(await ativo() === "mural" && /aba=comunidade/.test(p.url()), "soltou: Comunidade");
await p.screenshot({ path: "saida/rede-comunidade.png" });

// voltar: volta para o Diário (o passo de quando saiu dele)
await p.evaluate(() => history.back()); await p.waitForTimeout(900);
ok(await ativo() === "feed", `"voltar" volta para o Diário (${p.url().split("/").pop()})`);

// link que não é aba abre no próprio quadro (a rede continua)
await feed.evaluate(() => { const a = document.createElement("a"); a.href = "notificacoes.html"; a.id = "teste-link"; a.textContent = "x"; a.style.cssText = "position:fixed;top:120px;left:120px;z-index:99999;padding:20px;background:red"; document.body.appendChild(a); });
await feed.locator("#teste-link").tap();
await p.waitForTimeout(2500);
ok(/rede\.html/.test(p.url()) && p.frames().some((f) => /notificacoes\.html/.test(f.url())), "link para outra página abre dentro da rede");
// "voltar" sai das notificações e volta ao Diário, ainda dentro da rede
await p.evaluate(() => history.back());
await p.waitForTimeout(3500);
ok(p.frames().some((f) => /feed\.html/.test(f.url())) && await ativo() === "feed", "voltar traz o Diário de novo, dentro da rede");

ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close();
