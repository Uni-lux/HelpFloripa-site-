// Abas da rede (rede.html) iguais entre si e trocando do mesmo jeito (13/11/2026, relato do dono: "o Mensagens encolhe" e
// "a passagem do Mensagens para o Perfil é diferente"). Confere, dentro da casca, no celular: barra de baixo, ícones,
// topo, "+" e o deslize entre todas as abas vizinhas (topos parados por cima). Uso: node t-rede-igual.mjs (seed antes)
import { navegador, entrar } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const A = await navegador({ mobile: true, rede: true });
await A.ctx.addInitScript(() => { try { localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" })); } catch {} });
const p = await entrar(A.ctx, "ana", "feed.html");
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForURL(/rede\.html/, { timeout: 15000 }).catch(() => {});
for (let i = 0; i < 60 && (await p.evaluate(() => document.querySelectorAll(".hf-quadro").length)) < 4; i++) await p.waitForTimeout(500);
await p.waitForTimeout(4000);
const larg = await p.evaluate(() => innerWidth);
const quadro = (re) => p.frames().find((f) => f.parentFrame() && re.test(f.url()));
const ABAS = [["diario", /feed\.html/], ["explorar", /feed\.html/], ["comunidade", /mural\.html/], ["mensagens", /mensagens\.html/], ["perfil", /usuarios\.html/]];
const med = {};
for (const [k, re] of ABAS) {
  await p.evaluate((k) => window.__hfShell.ir(k), k); await p.waitForTimeout(1300);
  const f = quadro(re);
  med[k] = await f.evaluate(() => {
    const b = document.getElementById("barraRede"), rb = b.getBoundingClientRect();
    const t = document.querySelector("header.topo") || document.querySelector(".sidebar .side-top"), rt = t.getBoundingClientRect();
    const fab = [...document.querySelectorAll(".fab-hf, .fab-nova")].find((e) => e.getBoundingClientRect().width);
    return { esq: Math.round(rb.left), dir: Math.round(rb.right), alt: Math.round(rb.height), topoAlt: Math.round(rt.height),
      icones: [...b.querySelectorAll("a")].map((a) => { const s = (a.querySelector(".mini-av") || a.querySelector("svg")).getBoundingClientRect(); return Math.round(s.left + s.width / 2); }),
      fab: fab ? Math.round(fab.getBoundingClientRect().right) : null };
  });
}
const m0 = med.mensagens;
for (const [k] of ABAS) {
  const m = med[k];
  ok(m.esq === 0 && m.dir === larg, `${k}: barra de baixo do tamanho da tela (${m.esq}–${m.dir} de ${larg})`);
  ok(m.alt === m0.alt && JSON.stringify(m.icones) === JSON.stringify(m0.icones), `${k}: ícones nos mesmos lugares do Mensagens (${m.icones.join(",")})`);
  ok(m.topoAlt === m0.topoAlt, `${k}: topo da mesma altura (${m.topoAlt} px)`);
  if (m.fab != null && k !== "explorar") ok(Math.abs(m.fab - m0.fab) <= 1, `${k}: "+" no mesmo lugar do Mensagens (${m.fab} × ${m0.fab})`);
}
// deslize entre vizinhas: topo e barra parados (cópias por cima dos quadros) nos dois sentidos
const pares = [["diario", "esq"], ["explorar", "esq"], ["comunidade", "esq"], ["mensagens", "esq"], ["perfil", "dir"], ["mensagens", "dir"], ["comunidade", "dir"]];
for (const [k, lado] of pares) {
  await p.evaluate((k) => window.__hfShell.ir(k), k); await p.waitForTimeout(900);
  const r = await p.evaluate(([k, lado]) => {
    const S = window.__hfShell, alvo = S.vizinho(k, lado);
    if (!S.comecar(k, lado)) return { alvo, ok: false };
    S.mover(lado === "esq" ? -innerWidth / 2 : innerWidth / 2);
    const fixos = [...document.body.children].filter((e) => e.getAttribute("aria-hidden") === "true" && getComputedStyle(e).position === "fixed");
    const topos = fixos.filter((e) => e.getBoundingClientRect().top < 5).length, barras = fixos.filter((e) => e.getBoundingClientRect().top > 300).length;
    S.terminar(false);
    return { alvo, ok: true, topos, barras };
  }, [k, lado]);
  await p.waitForTimeout(500);
  if (!r.alvo || r.alvo === k || (k === "diario" && r.alvo === "explorar") || (k === "explorar" && r.alvo === "diario")) continue;
  ok(r.ok && r.topos === 2 && r.barras === 1, `${k} → ${r.alvo}: os dois topos e a barra ficam parados no deslize (${r.topos} topos, ${r.barras} barra)`);
}
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros[0] : ""));
process.exit(process.exitCode || 0);
