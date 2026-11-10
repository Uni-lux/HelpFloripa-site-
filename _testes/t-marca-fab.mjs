// Marca metálica com o slogan em faixa, "+" só o sinal no Diário e na Comunidade, fundo escuro de sempre (sem o preto puro)
// e celular sem a barrinha de rolagem (10/11/2026). Uso: node t-marca-fab.mjs (rodar seed.mjs antes)
import { navegador, entrar } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const erros = [];
const A = await navegador({ mobile: true });
await A.ctx.addInitScript(() => { try { localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" })); } catch {} });
const p = await entrar(A.ctx, "ana", "feed.html");
p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector("#btnComporFeed", { timeout: 30000 }); await p.waitForTimeout(1500);
const d = await p.evaluate(() => {
  const s = getComputedStyle(document.querySelector(".marca strong")), sl = getComputedStyle(document.querySelector(".marca small"), "::before");
  const fab = getComputedStyle(document.getElementById("btnComporFeed"));
  const sb = getComputedStyle(document.documentElement).scrollbarWidth;
  return { clip: s.backgroundClip || s.webkitBackgroundClip, faixa: sl.content !== "none" && sl.borderTopColor, fabBg: fab.backgroundColor, fabCor: fab.color, bg: getComputedStyle(document.body).backgroundColor, sb };
});
ok(d.clip === "text", "HELP FLORIPA com efeito metálico (texto em degradê)");
ok(d.faixa === "rgb(0, 173, 238)", "slogan numa faixa com filete ciano");
ok(d.fabBg === "rgba(0, 0, 0, 0)" && d.fabCor === "rgb(0, 173, 238)", `Diário: só o "+" em ciano, sem o círculo (${d.fabBg})`);
ok(d.bg !== "rgb(0, 0, 0)", "fundo escuro de sempre (sem o preto puro): " + d.bg);
ok(d.sb === "none", "sem barra de rolagem no celular");
await p.screenshot({ path: "saida/marca-diario.png" });
await p.goto("http://127.0.0.1:5057/mural.html"); await p.waitForSelector("#muFab", { timeout: 20000 }); await p.waitForTimeout(1200);
const m = await p.evaluate(() => { const r = document.getElementById("muFab").getBoundingClientRect(); return { dir: innerWidth - r.right, vis: r.width > 40 }; });
ok(m.vis && m.dir < 30, 'Comunidade: "+" embaixo à direita');
await p.screenshot({ path: "saida/marca-mural.png" });
await p.locator("#muFab").click(); await p.waitForURL(/comunidade\.html\?novo=/, { timeout: 10000 }).catch(() => {});
ok(/comunidade\.html\?novo=/.test(p.url()), "tocar no + da Comunidade abre o publicar");
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close();
