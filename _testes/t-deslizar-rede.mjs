// Deslizar entre as abas da rede (rede.html) em todas as abas, inclusive o Perfil (as janelas fechadas do perfil têm
// aria-modal e travavam o gesto), barra de baixo parada durante o deslize, item acendendo e velocidade (04/11/2026).
// Uso: node t-deslizar-rede.mjs (rodar seed.mjs antes)
import { navegador, entrar } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const erros = [];
const A = await navegador({ mobile: true, rede: true });
const p = await entrar(A.ctx, "ana", "feed.html");
p.on("pageerror", (e) => erros.push(e.message));
await p.waitForURL(/rede\.html/, { timeout: 15000 }).catch(() => {});
const ativo = () => p.evaluate(() => document.querySelector(".hf-quadro.ativo")?.dataset.id);
for (let i = 0; i < 50 && (await p.evaluate(() => [...document.querySelectorAll(".hf-quadro")].filter((q) => q.dataset.carregou).length)) < 4; i++) await p.waitForTimeout(500);
await p.waitForTimeout(2500);
const cdp = await A.ctx.newCDPSession(p);
const toque = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
const W = await p.evaluate(() => innerWidth);
// um ponto da tela sem nada que role para o lado
async function pontoLivre() {
  const id = await ativo();
  const f = p.frames().find((x) => x.parentFrame() && x.name() === "" && x === p.frames().find((y) => y.parentFrame() && y.url().includes({ feed: "feed", mural: "mural", mensagens: "mensagens", perfil: "usuarios" }[id])));
  return await f.evaluate(() => {
    for (let y = 600; y > 140; y -= 20) {
      const ok = [innerWidth * 0.8, innerWidth * 0.5, innerWidth * 0.2].every((x) => { for (let n = document.elementFromPoint(x, y); n && n !== document.body; n = n.parentElement) { if (/^(INPUT|TEXTAREA|VIDEO|CANVAS)$/.test(n.tagName)) return false; const o = getComputedStyle(n).overflowX; if (n.scrollWidth > n.clientWidth + 4 && (o === "auto" || o === "scroll")) return false; } return true; });
      if (ok) return y;
    }
    return 600;
  });
}
async function deslizar(lado, { checar = false } = {}) {
  const y = await pontoLivre();
  const x0 = lado === "esq" ? W - 40 : 40, passo = lado === "esq" ? -18 : 18;
  await toque("touchStart", [[x0, y]]);
  let meio = null;
  for (let k = 1; k <= 14; k++) {
    await toque("touchMove", [[x0 + k * passo, y + 1]]); await p.waitForTimeout(18);
    if (checar && k === 10) meio = await p.evaluate(() => {
      const copia = [...document.body.children].find((x) => x.classList?.contains("barra-rede"));
      const ent = document.querySelector(".hf-quadro.entra");
      const de = document.querySelector(".hf-quadro.movendo:not(.entra)");
      const bDe = de?.contentDocument.getElementById("barraRede");
      return { copia: !!copia, r: copia?.getBoundingClientRect().toJSON(), acesa: copia?.querySelector('[data-barra][style*="color"]') && [...copia.querySelectorAll("[data-barra]")].map((a) => a.style.color), escondida: bDe && getComputedStyle(bDe).visibility, ent: ent?.style.transform };
    });
  }
  await toque("touchEnd", []);
  await p.waitForTimeout(600);
  return meio;
}
ok(await ativo() === "feed", "começa no Diário");
// Diário → Explorar → Comunidade → Mensagens → Perfil (dedo para a esquerda)
await deslizar("esq"); ok(/aba=explorar/.test(p.url()), "Diário → Explorar");
const rBarra = await p.evaluate(() => document.querySelector(".hf-quadro.ativo").contentDocument.getElementById("barraRede").getBoundingClientRect().toJSON());
const m = await deslizar("esq", { checar: true });
ok(await ativo() === "mural", "Explorar → Comunidade");
ok(m?.copia && Math.abs(m.r.left - rBarra.left) < 2 && Math.abs(m.r.top - rBarra.top) < 2, `barra de baixo parada no lugar durante o deslize (${m && Math.round(m.r.left)},${m && Math.round(m.r.top)})`);
ok(m?.escondida === "hidden", "a barra de dentro da página que sai fica escondida (não é cortada)");
ok(/translate3d\(\d/.test(m?.ent || ""), `a aba vizinha entra junto (${m?.ent})`);
ok(await p.evaluate(() => ![...document.body.children].some((x) => x.classList?.contains("barra-rede"))), "a cópia da barra some no fim");
ok(await p.evaluate(() => getComputedStyle(document.querySelector(".hf-quadro.ativo").contentDocument.getElementById("barraRede")).visibility) === "visible", "a barra da aba nova aparece");
await deslizar("esq"); ok(await ativo() === "mensagens", "Comunidade → Mensagens");
await deslizar("esq"); ok(await ativo() === "perfil", "Mensagens → Perfil");
await p.screenshot({ path: "saida/deslizar-rede-perfil.png" });
// No Perfil: para a esquerda não tem aba (estica e volta), para a direita volta ao Mensagens
await deslizar("esq"); ok(await ativo() === "perfil", "no Perfil, para a esquerda não sai (última aba)");
const m2 = await deslizar("dir", { checar: true });
ok(await ativo() === "mensagens", "Perfil → Mensagens deslizando (antes o gesto não funcionava no Perfil)");
ok(m2?.copia, "barra parada também saindo do Perfil");
// soltar antes de 1/3 e devagar: volta
{
  const y = await pontoLivre();
  await toque("touchStart", [[W - 40, y]]);
  for (let k = 1; k <= 5; k++) { await toque("touchMove", [[W - 40 - k * 12, y]]); await p.waitForTimeout(60); }
  await p.waitForTimeout(200);
  await toque("touchEnd", []); await p.waitForTimeout(600);
  ok(await ativo() === "mensagens", "arrasto curto e devagar volta para o lugar");
}
// deslize rápido e curto troca (velocidade)
{
  const y = await pontoLivre();
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 60, y, id: 0 }] });
  for (const dx of [16, 40, 70, 100]) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 60 + dx, y, id: 0 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await p.waitForTimeout(700);
  ok(await ativo() === "mural", "deslize rápido e curto troca de aba (Mensagens → Comunidade)");
}
// Perfil com uma janela ABERTA (Editar perfil): o gesto não troca de aba
await p.evaluate(() => window.__hfShell.ir("perfil")); await p.waitForTimeout(800);
const perfil = p.frames().find((f) => f.parentFrame() && /usuarios\.html/.test(f.url()));
await perfil.evaluate(() => document.getElementById("folhaEditar").classList.add("aberta"));
await deslizar("dir"); ok(await ativo() === "perfil", "com uma janela aberta no Perfil, o gesto não troca de aba");
await perfil.evaluate(() => document.getElementById("folhaEditar").classList.remove("aberta"));
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close();
