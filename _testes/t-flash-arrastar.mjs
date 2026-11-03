// Flash (prints de 03/11/2026: "mal consigo mover as figurinhas"): arrastar como no Instagram.
// - a figurinha acompanha o dedo (sem pular) e NÃO é remontada a cada movimento (antes a enquete era redesenhada
//   embaixo do dedo e o arrasto travava)
// - enquete fica inteira dentro do cartão (antes ia para fora e ficava pela metade); emoji não some pela borda
// - lixeira acende pelo dedo, a figurinha encolhe por cima e some ao soltar; ↶ desfaz
// - figurinha "presa" (o dedo saiu sem o pointerup chegar) solta no próximo toque
// Uso: node t-flash-arrastar.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { navegador, entrar } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };

const { browser, ctx } = await navegador({ mobile: true });
const p = await entrar(ctx, "ana", "feed.html");
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForTimeout(3500);
const cdp = await ctx.newCDPSession(p);
const toque = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
async function arrastar(x0, y0, x1, y1, passos = 14, soltar = true) {
  await toque("touchStart", [[x0, y0]]); await p.waitForTimeout(30);
  for (let k = 1; k <= passos; k++) { await toque("touchMove", [[x0 + ((x1 - x0) * k) / passos, y0 + ((y1 - y0) * k) / passos]]); await p.waitForTimeout(16); }
  await p.waitForTimeout(40);
  if (soltar) { await toque("touchEnd", []); await p.waitForTimeout(150); }
}
const centro = (b) => [b.x + b.width / 2, b.y + b.height / 2];

await p.locator(".story-circ").first().locator(".mais").tap();
await p.waitForSelector(".flash-criar", { timeout: 8000 }); await p.waitForTimeout(600);
await p.locator(".flash-modos button", { hasText: "Texto" }).tap(); await p.waitForTimeout(400);
await p.keyboard.type("Oi"); await p.locator(".flash-texto").blur();
const pal = await p.locator(".flash-palco").boundingBox();

// enquete
await p.locator(".flash-ferr-btn[aria-label^='Figurinhas']").tap(); await p.waitForTimeout(300);
await p.locator(".fig-pilula", { hasText: "Enquete" }).tap(); await p.waitForTimeout(300);
await p.locator(".fv-perg").fill("Tá?");
await p.locator(".flash-fig-viva .fe-pronto").tap(); await p.waitForTimeout(400);
const enq = p.locator(".flash-camada .flash-enq").first();
await enq.evaluate((e) => { window.__card = e.firstChild; });
let b = await enq.boundingBox();
const [ex, ey] = centro(b);
// pega pela borda de cima da figurinha (não só pelo meio) e anda 60 px para baixo
await arrastar(ex - b.width * 0.35, b.y + 8, ex - b.width * 0.35, b.y + 8 + 60, 14, false);
const bm = await enq.boundingBox();
ok(Math.abs(bm.y - b.y - 60) < 3, `acompanha o dedo (andou ${Math.round(bm.y - b.y)} de 60 px)`);
ok(await enq.evaluate((e) => e.firstChild === window.__card), "não remonta a figurinha durante o arrasto");
ok(await p.locator(".flash-palco.arrastando-txt").count() === 1 && await enq.evaluate((e) => e.classList.contains("segurando")), "mostra que está segurando (lixeira à vista)");
await toque("touchEnd", []); await p.waitForTimeout(200);

// para o canto de baixo à esquerda (o print): continua inteira no cartão
b = await enq.boundingBox();
await arrastar(...centro(b), pal.x - 80, pal.y + pal.height + 40);
b = await enq.boundingBox();
ok(b.x >= pal.x - 1 && b.x + b.width <= pal.x + pal.width + 1 && b.y >= pal.y && b.y + b.height <= pal.y + pal.height, `enquete inteira dentro do cartão (x ${Math.round(b.x - pal.x)}, fim ${Math.round(pal.y + pal.height - b.y - b.height)} px da borda)`);

// guia do meio encaixa
await arrastar(...centro(b), pal.x + pal.width / 2 + 4, pal.y + pal.height * 0.45, 14, false);
ok(await p.locator(".fx-guia.v.on").count() === 1, "guia do meio acende e encaixa");
await toque("touchEnd", []); await p.waitForTimeout(200);
b = await enq.boundingBox();
ok(Math.abs(centro(b)[0] - (pal.x + pal.width / 2)) < 2, "ficou no meio");

// toque parado abre o editor (não confunde com arrasto)
await toque("touchStart", [centro(b)]); await p.waitForTimeout(60); await toque("touchEnd", []); await p.waitForTimeout(400);
ok(await p.locator(".flash-fig-viva").count() === 1, "tocar sem arrastar abre a edição da enquete");
await p.locator(".flash-fig-viva .fe-pronto").tap(); await p.waitForTimeout(400);

// figurinha presa: o dedo sai sem o fim do toque chegar; o próximo toque solta
b = await enq.boundingBox();
await enq.dispatchEvent("pointerdown", { pointerId: 77, isPrimary: true, clientX: centro(b)[0], clientY: centro(b)[1], pointerType: "touch" });
await p.waitForTimeout(100);
await p.locator(".flash-ferr-btn[aria-label^='Figurinhas']").tap(); await p.waitForTimeout(300);
await p.locator(".fig-pilula", { hasText: "Emoji" }).tap(); await p.waitForTimeout(200);
await p.locator(".fig-emojis button").first().tap(); await p.waitForTimeout(300);
const em = p.locator(".flash-camada .flash-txt:not(.flash-enq)").last();
const be = await em.boundingBox();
await arrastar(...centro(be), centro(be)[0] + 50, centro(be)[1] - 80);
const be2 = await em.boundingBox();
ok(Math.abs(be2.x - be.x - 50) < 3, "depois de uma figurinha presa, a outra arrasta normalmente");

// lixeira: pelo dedo, encolhe por cima e apaga ao soltar
const antes = await p.locator(".flash-camada .flash-txt").count();
const lx = await p.locator(".flash-lixo").boundingBox();
await arrastar(...centro(be2), lx.x + lx.width / 2, lx.y + lx.height / 2, 16, false);
ok(await p.locator(".flash-lixo.sobre").count() === 1 && await em.evaluate((e) => e.classList.contains("no-lixo")), "lixeira acende e a figurinha encolhe por cima");
await toque("touchEnd", []); await p.waitForTimeout(300);
ok(await p.locator(".flash-camada .flash-txt").count() === antes - 1, "soltar na lixeira apaga");
await p.locator(".flash-desfazer").first().tap().catch(() => {}); await p.waitForTimeout(300);
ok(await p.locator(".flash-camada .flash-txt").count() === antes, "↶ traz de volta");

// emoji não some pela borda
const be2b = await em.boundingBox();
await arrastar(...centro(be2b), pal.x + pal.width + 120, centro(be2b)[1]);
const be3 = await em.boundingBox();
ok(centro(be3)[0] <= pal.x + pal.width, "emoji não sai do cartão (o meio fica dentro)");
const fr = await p.locator(".flash-ferr").boundingBox();
ok(centro(be3)[0] < fr.x, "solto embaixo dos botões da direita, vai para o lado (dá para pegar de novo)");
await arrastar(...centro(be3), centro(be3)[0] - 60, centro(be3)[1] + 40);
const be4 = await em.boundingBox();
ok(Math.abs(be4.x - be3.x + 60) < 3, "e arrasta de novo");

await p.screenshot({ path: "saida/fa-final.png" });
ok(!erros.length, "sem erros na página" + (erros.length ? ": " + erros.slice(0, 3).join(" | ") : ""));
await browser.close();
