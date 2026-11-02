// Deslizar o dedo: no Diário, para a direita abre o Flash; nas abas da barra, para o lado troca de aba. Avisos (toasts) sem quebra ruim,
// regiões no Público e o cartão da contagem sem corte (02/11/2026).
// Uso: node t-deslizar-flash.mjs (rodar seed.mjs antes)
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const CONV = [U.ana, U.bruno].sort().join("_");
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

// 2) indicador segue o dedo e abre
await toque("touchStart", [[60, 520]]);
for (let k = 1; k <= 6; k++) { await toque("touchMove", [[60 + k * 14, 521]]); await p.waitForTimeout(16); }
const meio = await p.evaluate(() => { const i = document.querySelector(".df-painel"); const m = document.querySelector("main.pagina"); return i ? { w: i.getBoundingClientRect().width, txt: i.textContent, tr: getComputedStyle(m).transform } : null; });
ok(meio && meio.w > 40 && meio.txt.includes("Novo flash") && /matrix\(1, 0, 0, 1, [1-9]/.test(meio.tr), `a página acompanha o dedo e “Novo flash” aparece ao lado (${meio && Math.round(meio.w)} px)`);
ok(await p.locator(".story-chip").count() === 0, "visor/criador sem o selo “Flash”");
await toque("touchMove", [[260, 524]]); await p.waitForTimeout(40);
ok(await p.locator(".df-painel.pronto").count() === 1, "painel fica “pronto” quando passou de 1/3 da tela");
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
ok(await criador() === temCriador && !(await p.locator(".df-painel").count()), "começando na borda (voltar do celular) não puxa o Flash");
await A.browser.close();

// 6) abas: Diário ← → Explorar (sem recarregar), Comunidade, Mensagens, Perfil; Início não tem gesto
const B = await navegador({ mobile: true });
const q = await entrar(B.ctx, "ana", "feed.html");
q.on("pageerror", (e) => erros.push(`abas: ${e.message}`));
await q.waitForTimeout(3500);
const c2 = await B.ctx.newCDPSession(q);
const t2 = (type, pts) => c2.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
async function lado(para) { // "esq" = dedo para a esquerda (próxima aba), "dir" = volta
  const [x0, x1] = para === "esq" ? [330, 60] : [60, 330];
  const y = await yLivre(x0, x1);
  await t2("touchStart", [[x0, y]]);
  for (let k = 1; k <= 12; k++) { await t2("touchMove", [[x0 + ((x1 - x0) * k) / 12, y + 2]]); await q.waitForTimeout(16); }
  await t2("touchEnd", []); await q.waitForTimeout(400);
}
// altura fora de carrossel (carrossel que ainda rola fica com o gesto)
async function yLivre(x0, x1) {
  return q.evaluate(([a, b]) => {
    for (let y = 560; y > 140; y -= 20) {
      const ok = [a, b].every((x) => { for (let n = document.elementFromPoint(x, y); n && n !== document.body; n = n.parentElement) { const o = getComputedStyle(n).overflowX; if (n.scrollWidth > n.clientWidth + 4 && (o === "auto" || o === "scroll")) return false; } return true; });
      if (ok) return y;
    }
    return 560;
  }, [x0, (x0 + x1) / 2]);
}
const atual = () => q.evaluate(() => { const a = [...document.querySelectorAll("#barraRede a")].find((x) => x.getAttribute("aria-current") === "page"); return a?.textContent.trim() || ""; });
const esperar = async (nome) => { for (let k = 0; k < 40; k++) { if ((await atual()).includes(nome)) return true; await q.waitForTimeout(300); } return false; };
// arrasto curto e lento volta para o lugar
const yl = await yLivre(300, 230);
await t2("touchStart", [[300, yl]]);
for (let k = 1; k <= 10; k++) { await t2("touchMove", [[300 - k * 7, yl + 1]]); await q.waitForTimeout(40); }
await q.waitForTimeout(200); await t2("touchEnd", []); await q.waitForTimeout(500);
ok((await atual()).includes("Diário") && (await q.evaluate(() => getComputedStyle(document.querySelector("main.pagina")).transform)) === "none", "arrasto curto e lento: a página volta para o lugar");
// deslize rápido e curto (70 px em ~50 ms) já troca
await q.evaluate(async (y) => { // toques sintéticos na velocidade de um deslize de verdade (~1,4 px/ms)
  const alvo = document.elementFromPoint(300, y);
  const toque = (x) => new Touch({ identifier: 7, target: alvo, clientX: x, clientY: y });
  const ev = (tipo, x) => { const t = x == null ? [] : [toque(x)]; alvo.dispatchEvent(new TouchEvent(tipo, { bubbles: true, cancelable: true, touches: t, targetTouches: t, changedTouches: [toque(x ?? 230)] })); };
  ev("touchstart", 300);
  for (let k = 1; k <= 5; k++) { await new Promise((r) => setTimeout(r, 10)); ev("touchmove", 300 - k * 14); }
  ev("touchend", null);
}, yl);
ok(await esperar("Explorar") && /aba=explorar/.test(q.url()), "deslize rápido para a esquerda: Diário → Explorar");
await q.waitForTimeout(1500);
await lado("dir"); ok(await esperar("Diário") && (await q.locator(".flash-criar").count()) === 0, "Explorar → para a direita volta ao Diário (sem abrir o Flash)");
await q.waitForTimeout(1000);
await lado("esq"); await esperar("Explorar"); await q.waitForTimeout(1500);
await lado("esq"); ok(await esperar("Comunidade") && /mural\.html/.test(q.url()), "Explorar → Comunidade (mural)");
await q.waitForTimeout(2500);
await lado("esq"); ok(await esperar("Mensagens") && /mensagens\.html/.test(q.url()), "Comunidade → Mensagens");
await q.waitForTimeout(2500);
await lado("esq"); ok(await esperar("Perfil") && /usuarios\.html/.test(q.url()), "Mensagens → Perfil");
await q.waitForTimeout(3000);
await lado("esq"); await q.waitForTimeout(1200); ok(/usuarios\.html/.test(q.url()), "Perfil é a última: para a esquerda não faz nada");
await lado("dir"); ok(await esperar("Mensagens") && /mensagens\.html/.test(q.url()), "Perfil → para a direita volta para Mensagens");
await q.waitForTimeout(2500);
// conversa aberta: sem gesto, e o campo de mensagem aparece inteiro na tela
// conversa aberta pelo link (o mesmo caminho do "Responder" da caixa de perguntas)
await q.goto(`http://127.0.0.1:5057/mensagens.html?conversa=${CONV}&volta=1`);
await q.waitForSelector("body.chat-aberto", { timeout: 12000 }).catch(() => {});
const conv = q.locator("body.chat-aberto");
if (await conv.count()) {
  await q.waitForTimeout(1500);
  const r = await q.evaluate(() => { const b = document.getElementById("rodapeConversa").getBoundingClientRect(); return { b: b.bottom, h: innerHeight, vis: !document.getElementById("rodapeConversa").hidden }; });
  ok(r.vis && r.b <= r.h + 1, `campo de mensagem dentro da tela (${Math.round(r.b)} de ${r.h})`);
  const u0 = q.url(); await lado("esq"); await q.waitForTimeout(1000);
  ok(q.url() === u0, "com a conversa aberta, deslizar não troca de aba");
} else ok(false, "abrir a conversa");
await q.goto("http://127.0.0.1:5057/index.html"); await q.waitForTimeout(3000);
await t2("touchStart", [[60, 560]]);
for (let k = 1; k <= 12; k++) { await t2("touchMove", [[60 + k * 22, 562]]); await q.waitForTimeout(16); }
const semInd = (await q.locator(".df-painel").count()) === 0;
await t2("touchEnd", []); await q.waitForTimeout(800);
ok(semInd && (await q.locator(".flash-criar").count()) === 0, "Início: sem gesto");
await B.browser.close();
ok(!erros.length, "sem erros na página" + (erros.length ? `: ${erros.join(" | ")}` : ""));
