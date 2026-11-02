// Deslizar o dedo para a direita abre o Flash (Diário, Mural, Mensagens, Início), avisos (toasts) sem quebra ruim,
// regiões no Público e o cartão da contagem sem corte (02/11/2026).
// Uso: node t-deslizar-flash.mjs (rodar seed.mjs antes)
import { navegador, entrar } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const erros = [];
const A = await navegador({ mobile: true });
const p = await entrar(A.ctx, "ana", "feed.html");
p.on("pageerror", (e) => erros.push(e.message));
const cdp = await A.ctx.newCDPSession(p);
const toque = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
async function arrastar(x0, y0, x1, y1, passos = 12) {
  await toque("touchStart", [[x0, y0]]);
  for (let k = 1; k <= passos; k++) { await toque("touchMove", [[x0 + ((x1 - x0) * k) / passos, y0 + ((y1 - y0) * k) / passos]]); await p.waitForTimeout(16); }
  await toque("touchEnd", []); await p.waitForTimeout(700);
}
const criador = () => p.locator(".flash-criar").count();
async function fecharCriador() { await p.keyboard.press("Escape"); await p.waitForTimeout(600); }
await p.waitForTimeout(3500);
ok(await p.evaluate(() => matchMedia("(pointer: coarse)").matches), "celular (toque)");

// 1) gestos que NÃO abrem
await arrastar(60, 520, 120, 522); ok(await criador() === 0, "arrasto curto não abre");
await arrastar(200, 600, 210, 300); ok(await criador() === 0, "rolar para cima não abre");
await arrastar(300, 520, 60, 522); ok(await criador() === 0, "para a esquerda não abre");

// 2) indicador segue o dedo e abre
await toque("touchStart", [[60, 520]]);
for (let k = 1; k <= 6; k++) { await toque("touchMove", [[60 + k * 14, 521]]); await p.waitForTimeout(16); }
const meio = await p.evaluate(() => { const i = document.querySelector(".df-puxar"); return i ? { op: Number(getComputedStyle(i).opacity), txt: i.textContent } : null; });
ok(meio && meio.op > 0 && meio.txt.includes("Novo flash"), "indicador “Novo flash” aparece seguindo o dedo");
await toque("touchMove", [[260, 524]]); await p.waitForTimeout(40);
ok(await p.locator(".df-puxar.pronto").count() === 1, "indicador fica “pronto” quando passou do ponto");
await toque("touchEnd", []); await p.waitForTimeout(900);
ok(await criador() === 1, "deslizar para a direita no Diário abre o criador do Flash");
await p.screenshot({ path: "saida/deslizar-criador.png" });

// 3) aviso (toast) no criador: largo, centralizado, sem quebrar "1 pessoa"
await p.evaluate(() => { const t = document.createElement("div"); t.className = "toast"; t.textContent = "Contagem salva (1 pessoa pediu lembrete) e o público continua só para mulheres"; document.body.appendChild(t); });
await p.waitForTimeout(300);
const tt = await p.evaluate(() => { const t = document.querySelector(".toast"); const r = t.getBoundingClientRect(); const lh = parseFloat(getComputedStyle(t).lineHeight); return { w: r.width, l: r.left, r: innerWidth - r.right, linhas: Math.round((r.height - 22) / lh), vw: innerWidth }; });
ok(tt.w > tt.vw * 0.6 && Math.abs(tt.l - tt.r) < 2, `aviso largo e no meio (${Math.round(tt.w)} de ${tt.vw} px, ${tt.linhas} linhas)`);
ok(tt.linhas <= 3, "aviso em no máximo 3 linhas");
await p.screenshot({ path: "saida/deslizar-toast.png" });
await p.evaluate(() => document.querySelectorAll(".toast").forEach((t) => t.remove()));

// 4) contagem: campos de dia e hora dentro do cartão (360 px)
await p.setViewportSize({ width: 360, height: 740 }); await p.waitForTimeout(300);
await p.locator(".flash-modos button", { hasText: "Texto" }).tap(); await p.waitForTimeout(300);
await p.keyboard.type("Vem aí"); await p.locator(".flash-texto").blur();
await p.locator(".flash-ferr-btn[aria-label^='Figurinhas']").tap(); await p.waitForTimeout(300);
await p.locator(".fig-pilula", { hasText: "Contagem" }).tap(); await p.waitForTimeout(500);
const caixa = await p.evaluate(() => {
  const c = document.querySelector(".fv-ctg").getBoundingClientRect();
  return [...document.querySelectorAll(".fv-ctg .ctg-campo input")].every((i) => { const r = i.getBoundingClientRect(); return r.left >= c.left - 0.5 && r.right <= c.right + 0.5; });
});
ok(caixa, "dia e hora cabem dentro do cartão da contagem (360 px)");
await p.screenshot({ path: "saida/deslizar-contagem.png" });
await p.locator(".flash-fig-viva .fe-pronto").tap(); await p.waitForTimeout(400);
const av = await p.evaluate(() => document.querySelector(".toast")?.textContent || "");
ok(/nome/.test(av), `sem nome, avisa (“${av}”)`);

// 5) Público: regiões
await p.locator(".flash-fig-viva .fv-perg").fill("Feira"); await p.locator(".flash-fig-viva .fe-pronto").tap(); await p.waitForTimeout(400);
await p.locator(".flash-alvo").tap(); await p.waitForSelector(".pa-pagina .pa-opcao", { timeout: 6000 });
await p.locator(".pa-opcao", { hasText: "Personalizado" }).click();
await p.locator(".pa-aba", { hasText: "Estados" }).click();
const regs = await p.locator(".pa-regiao").allTextContents();
ok(["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"].every((r) => regs.includes(r)), `as 5 regiões (${regs.join(", ")})`);
await p.locator(".pa-regiao", { hasText: "Nordeste" }).click();
ok(await p.locator(".pa-ufs .pa-chip[aria-pressed=true]").count() === 9, "Nordeste marca os 9 estados");
await p.locator(".pa-regiao", { hasText: /^Norte$/ }).click();
ok(await p.locator(".pa-ufs .pa-chip[aria-pressed=true]").count() === 16, "Norte soma mais 7");
ok(await p.locator(".pa-regiao[aria-pressed=true]").count() === 2, "regiões cheias ficam acesas");
await p.screenshot({ path: "saida/deslizar-regioes.png" });
await p.locator(".pa-regiao", { hasText: "Nordeste" }).click();
ok(await p.locator(".pa-ufs .pa-chip[aria-pressed=true]").count() === 7, "tocar de novo tira a região");
// borda: fica para o "voltar" do celular (o navegador pergunta "Sair?"), o Flash não abre
await p.keyboard.press("Escape"); await p.waitForTimeout(500); await p.keyboard.press("Escape"); await p.waitForTimeout(600);
const temCriador = await criador();
await arrastar(8, 520, 260, 522);
ok(await criador() === temCriador && !(await p.locator(".df-puxar").count()), "começando na borda (voltar do celular) não puxa o Flash");
await A.browser.close();

// 6) outras páginas: Mural, Mensagens e Início levam ao criador no Diário
for (const pg of ["mural.html", "mensagens.html", "index.html"]) {
  const B = await navegador({ mobile: true });
  const q = await entrar(B.ctx, "ana", pg);
  q.on("pageerror", (e) => erros.push(`${pg}: ${e.message}`));
  await q.waitForTimeout(3500);
  const c2 = await B.ctx.newCDPSession(q);
  const t2 = (type, pts) => c2.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
  await t2("touchStart", [[60, 560]]);
  for (let k = 1; k <= 12; k++) { await t2("touchMove", [[60 + k * 18, 562]]); await q.waitForTimeout(16); }
  await t2("touchEnd", []);
  await q.waitForSelector(".flash-criar", { timeout: 15000 }).catch(() => {});
  ok(await q.locator(".flash-criar").count() === 1 && /feed\.html/.test(q.url()) && !/novoFlash/.test(q.url()), `${pg}: deslizar abre o Flash (${q.url().split("/").pop()})`);
  await B.browser.close();
}
ok(!erros.length, "sem erros na página" + (erros.length ? `: ${erros.join(" | ")}` : ""));
