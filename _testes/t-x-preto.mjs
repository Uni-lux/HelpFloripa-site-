// Preto do X nas abas da rede, topo que some ao descer, perfil com o nome fora da capa e sem o sino (12/11/2026).
// Uso: node seed.mjs | tail -1 > saida/seed-ids.json && node t-x-preto.mjs
import { navegador, entrar } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const erros = [];
const A = await navegador({ mobile: true, rede: true });
await A.ctx.addInitScript(() => { try { if (!sessionStorage.getItem("t")) { sessionStorage.setItem("t", "1"); localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" })); } } catch {} });
const p = await entrar(A.ctx, "bruno", "feed.html");
await p.emulateMedia({ reducedMotion: "reduce" }); // "remover animações" ligado: o topo e a barra têm de andar mesmo assim
p.on("pageerror", (e) => erros.push(e.message));
await p.waitForURL(/rede\.html/, { timeout: 15000 }).catch(() => {});
for (let i = 0; i < 60 && (await p.evaluate(() => [...document.querySelectorAll(".hf-quadro")].filter((q) => q.dataset.carregou).length)) < 4; i++) await p.waitForTimeout(500);
await p.waitForTimeout(1500);
const quadro = (re) => p.frames().find((f) => f.parentFrame() && re.test(f.url()));
const feed = quadro(/feed\.html/), perfil = quadro(/usuarios\.html/);
const cores = await feed.evaluate(() => {
  const b = document.querySelector("#barraRede"), at = b.querySelector('[aria-current="page"]');
  return { bg: getComputedStyle(document.body).backgroundColor, linha: getComputedStyle(at, "::before").backgroundColor, cor: getComputedStyle(at).color,
    larg: b.getBoundingClientRect().width, vw: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth, bbg: getComputedStyle(b).backgroundColor, rotulo: getComputedStyle(at.querySelector("span:not(.mini-av)")).width };
});
ok(cores.bg === "rgb(0, 0, 0)", "Diário: fundo preto (" + cores.bg + ")");
ok(cores.linha === "rgb(255, 255, 255)" && cores.cor === "rgb(255, 255, 255)", "barra de baixo: ativo branco com a linha branca");
ok(cores.sw <= cores.vw && Math.abs(cores.larg - cores.vw) < 5 && cores.bbg === "rgb(0, 0, 0)" && cores.rotulo === "1px", "barra de baixo de ponta a ponta, preta e só com ícones (" + cores.bbg + ")");
{
  const v = await feed.evaluate(() => {
    const t = getComputedStyle(document.querySelector("header.topo")), b = document.getElementById("barraRede"), h0 = b.offsetHeight;
    const sab = getComputedStyle(document.documentElement).getPropertyValue("--sab");
    document.documentElement.style.setProperty("--sab", "24px"); const h1 = b.offsetHeight; document.documentElement.style.setProperty("--sab", sab);
    return { tbg: t.backgroundColor, tblur: t.backdropFilter, bblur: getComputedStyle(b).backdropFilter, sab, h0, h1 };
  });
  ok(v.tbg === "rgb(0, 0, 0)" && /blur/.test(v.tblur) && /blur/.test(v.bblur), "topo e barra pretos (iguais às faixas do celular)");
  ok(v.sab.trim() === "0px" && v.h1 - v.h0 === 24, "a casca passa a faixa do sistema (--sab) e a barra cresce por baixo dela");
}
ok(await p.evaluate(() => document.querySelector('meta[name="theme-color"]').content) === "#000000", "barra do celular preta");
await p.screenshot({ path: "saida/xp-diario.png" });
// topo some ao descer e volta ao subir (precisa de conteúdo alto)
await feed.evaluate(() => { const d = document.createElement("div"); d.style.height = "3000px"; document.querySelector("main").appendChild(d); });
const desce = async (y) => { await feed.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(120); };
for (const y of [100, 200, 300, 450]) await desce(y);
await p.waitForTimeout(400);
ok(await feed.evaluate(() => document.body.classList.contains("topo-some") && document.querySelector("header.topo").getBoundingClientRect().bottom <= 1), "descer: o topo some (com animações desligadas)");
ok(await feed.evaluate(() => document.getElementById("barraRede").getBoundingClientRect().top >= innerHeight - 1), "descer: a barra de baixo some também (tela cheia)");
await p.screenshot({ path: "saida/xp-rolando.png" });
for (const y of [400, 340, 280]) await desce(y);
await p.waitForTimeout(400);
ok(await feed.evaluate(() => !document.body.classList.contains("topo-some") && document.querySelector("header.topo").getBoundingClientRect().top >= -1), "subir: o topo volta");
// meio do caminho: termina sozinho (sem ficar pela metade)
await desce(360); await p.waitForTimeout(500);
const meio = await feed.evaluate(() => { const r = document.querySelector("header.topo").getBoundingClientRect(); return r.bottom <= 1 || r.top >= -1; });
ok(meio, "parou no meio: o topo termina de aparecer ou de sumir");
// Explorar: busca no topo, sem casinha e sino
await desce(0); await p.waitForTimeout(400);
await feed.locator('#barraRede [data-barra="explorar"]').click(); await p.waitForTimeout(1200);
const ex = await feed.evaluate(() => ({ busca: !!document.querySelector(".topo #buscaPessoas") && getComputedStyle(document.querySelector(".topo .topo-exp-busca")).display !== "none",
  casa: [...document.querySelectorAll('.topo a[href="index.html"], .topo a[href="notificacoes.html"]')].some((a) => getComputedStyle(a).display !== "none") }));
ok(ex.busca && !ex.casa, "Explorar: lupa no topo, sem a casinha e o sino");
await p.screenshot({ path: "saida/xp-explorar.png" });
// Comunidade: busca no topo
await p.evaluate(() => window.__hfShell.ir("comunidade")); await p.waitForTimeout(1500);
const mural = quadro(/mural\.html/);
ok(await mural.evaluate(() => !!document.querySelector("header.topo #muBusca") && !document.querySelector('.topo a[href="index.html"]')), "Comunidade: busca e lugar no topo, sem a casinha e o sino");
await p.screenshot({ path: "saida/xp-comunidade.png" });
// perfil
await p.evaluate(() => window.__hfShell.ir("perfil")); await p.waitForTimeout(1500);
ok(/^@/.test(await perfil.evaluate(() => document.getElementById("topoNick")?.textContent || "")), "Perfil: @nome no topo");
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
ok(await ms.evaluate(() => { const b = document.getElementById("barraRede"), l = document.getElementById("listaConversas");
  return ["absolute", "fixed"].includes(getComputedStyle(b).position) && b.getBoundingClientRect().bottom >= innerHeight - 1 && l.getBoundingClientRect().bottom > b.getBoundingClientRect().top; }),
  "Mensagens: a lista passa por baixo da barra (que vai até o fim da tela)");
await p.screenshot({ path: "saida/xp-mensagens.png" });
// Tema claro: barra e faixa do celular brancas (antes a faixa ficava preta)
await p.evaluate(() => { localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "claro" })); });
await p.reload(); await p.waitForTimeout(500);
for (let i = 0; i < 40 && !(await p.evaluate(() => document.querySelector('.hf-quadro[data-carregou]'))); i++) await p.waitForTimeout(500);
await p.waitForTimeout(2000);
ok(await p.evaluate(() => document.querySelector('meta[name="theme-color"]').content) === "#ffffff", "tema claro: faixa do celular branca");
const fc = quadro(/feed\.html/) || quadro(/mensagens\.html/);
const claro = await fc.evaluate(() => ({ t: document.documentElement.dataset.theme, b: getComputedStyle(document.getElementById("barraRede")).backgroundColor }));
ok(claro.t === "light" && /rgba\(255, 255, 255, 0\.9/.test(claro.b), "tema claro: barra de baixo branca (" + claro.b + ")");
await p.screenshot({ path: "saida/xp-claro.png" });
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close();
