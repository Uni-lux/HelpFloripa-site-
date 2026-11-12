// Preto do X nas abas da rede, topo que some ao descer, perfil com o nome fora da capa e sem o sino (12/11/2026).
// Uso: node seed.mjs | tail -1 > saida/seed-ids.json && node t-x-preto.mjs
import { navegador, entrar } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const erros = [];
const A = await navegador({ mobile: true, rede: true });
await A.ctx.addInitScript(() => { try { if (!sessionStorage.getItem("t")) { sessionStorage.setItem("t", "1"); localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" })); } } catch {} });
const p = await entrar(A.ctx, "bruno", "feed.html");
p.on("pageerror", (e) => erros.push(e.message));
await p.waitForURL(/rede\.html/, { timeout: 15000 }).catch(() => {});
for (let i = 0; i < 60 && (await p.evaluate(() => [...document.querySelectorAll(".hf-quadro")].filter((q) => q.dataset.carregou).length)) < 4; i++) await p.waitForTimeout(500);
await p.waitForTimeout(1500);
const quadro = (re) => p.frames().find((f) => f.parentFrame() && re.test(f.url()));
const feed = quadro(/feed\.html/), perfil = quadro(/usuarios\.html/);
const cores = await feed.evaluate(() => {
  const b = document.querySelector("#barraRede"), at = b.querySelector('[aria-current="page"]');
  return { bg: getComputedStyle(document.body).backgroundColor, sombra: getComputedStyle(at).boxShadow, cor: getComputedStyle(at).color };
});
ok(cores.bg === "rgb(0, 0, 0)", "Diário: fundo preto (" + cores.bg + ")");
ok(/rgba\(255, 255, 255, 0\.78\)/.test(cores.sombra) && cores.cor === "rgb(255, 255, 255)", "barra de baixo: ativo com linha branca");
ok(await p.evaluate(() => document.querySelector('meta[name="theme-color"]').content) === "#000000", "barra do celular preta");
await p.screenshot({ path: "saida/xp-diario.png" });
// topo some ao descer e volta ao subir (precisa de conteúdo alto)
await feed.evaluate(() => { const d = document.createElement("div"); d.style.height = "3000px"; document.querySelector("main").appendChild(d); });
const desce = async (y) => { await feed.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(120); };
for (const y of [100, 200, 300, 450]) await desce(y);
await p.waitForTimeout(400);
ok(await feed.evaluate(() => document.body.classList.contains("topo-some") && document.querySelector("header.topo").getBoundingClientRect().bottom <= 1), "descer: o topo some");
await p.screenshot({ path: "saida/xp-rolando.png" });
for (const y of [400, 340, 280]) await desce(y);
await p.waitForTimeout(400);
ok(await feed.evaluate(() => !document.body.classList.contains("topo-some") && document.querySelector("header.topo").getBoundingClientRect().top >= -1), "subir: o topo volta");
// perfil
await p.evaluate(() => window.__hfShell.ir("perfil")); await p.waitForTimeout(1500);
const pf = await perfil.evaluate(() => {
  const capa = document.querySelector("#meuPerfil .pf-capa").getBoundingClientRect(), nome = document.querySelector("#meuPerfil .pf-nome").getBoundingClientRect();
  return { sino: !!document.querySelector('.topo a[href="notificacoes.html"]'), gear: !!document.querySelector('.topo a[href="configuracoes.html"]'),
    abaixo: nome.top >= capa.bottom - 1, cor: getComputedStyle(document.querySelector("#meuPerfil .pf-nome")).color, bg: getComputedStyle(document.body).backgroundColor };
});
ok(!pf.sino && pf.gear, "Perfil: sem o sino, com a engrenagem");
ok(pf.abaixo, "Perfil: nome embaixo da capa (fora da foto)");
ok(pf.bg === "rgb(0, 0, 0)", "Perfil: fundo preto");
await p.screenshot({ path: "saida/xp-perfil.png" });
await perfil.locator("#meuPerfilMais").click(); await p.waitForTimeout(400);
ok(!(await perfil.locator("#opcoesCorpo").innerText()).includes("Configurações"), "⋯ do perfil sem Configurações");
await p.screenshot({ path: "saida/xp-menu.png" });
// Mensagens preto
await p.keyboard.press("Escape"); await p.waitForTimeout(300);
await p.evaluate(() => window.__hfShell.ir("mensagens")); await p.waitForTimeout(1500);
const ms = quadro(/mensagens\.html/);
ok(await ms.evaluate(() => getComputedStyle(document.body).backgroundColor) === "rgb(0, 0, 0)", "Mensagens: fundo preto");
await p.screenshot({ path: "saida/xp-mensagens.png" });
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close();
