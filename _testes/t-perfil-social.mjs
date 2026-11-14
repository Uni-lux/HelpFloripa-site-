// Perfil e Social elegantes (14/11/2026): segurar uma publicação = prévia; tocar = lista rolando; capa 3:1 igual no seu
// perfil e no de quem visita; negócios em cartões; Social, Configurações e Notificações com o topo de app.
// Uso: node seed.mjs | tail -1 > saida/seed-ids.json && FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 node dados-perfil.mjs && node t-perfil-social.mjs
import { navegador, entrar } from "./nav.mjs";
import { readFileSync } from "node:fs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const ids = JSON.parse(readFileSync("saida/seed-ids.json", "utf8"));
const erros = [];
const A = await navegador({ mobile: true });
const p = await entrar(A.ctx, "ana", "usuarios.html");
p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector("#meuPerfil .pf-nome", { timeout: 25000 }); await p.waitForTimeout(3000);
const capa = await p.evaluate(() => { const r = document.querySelector("#meuPerfil .pf-capa").getBoundingClientRect(); return r.width / r.height; });
ok(Math.abs(capa - 3) < 0.05, "capa 3:1 no seu perfil (" + capa.toFixed(2) + ")");
ok(await p.locator("#meuPerfil .pf-rosa").count() === 1, "rosinha do duo no seu perfil");
// segurar uma publicação
await p.evaluate(() => document.querySelector("#gradePosts .tile").scrollIntoView({ block: "center" })); await p.waitForTimeout(300);
const b = await p.locator("#gradePosts .tile").first().boundingBox();
await p.mouse.move(b.x + 30, b.y + 30); await p.mouse.down(); await p.waitForTimeout(650); await p.mouse.up(); await p.waitForTimeout(400);
ok(await p.locator(".pp-previa .ppv-cartao").count() === 1, "segurar abre a prévia grande");
ok(await p.locator(".pp-previa .ppv-acao").count() === 4, "prévia com Abrir, Salvar, Compartilhar e Copiar link");
ok(await p.locator("#folhaFeed.aberta").count() === 0, "segurar não abre a lista junto");
await p.goBack(); await p.waitForTimeout(500);
ok(await p.locator(".pp-previa").count() === 0, "voltar fecha a prévia");
// tocar: lista rolando
await p.locator("#gradePosts .tile").nth(2).click(); await p.waitForTimeout(1500);
const f = await p.evaluate(() => {
  const c = document.querySelector("#folhaFeed .folha-corpo"), it = [...document.querySelectorAll("#feedLista .pfd-item")];
  const r = it[2]?.getBoundingClientRect(), cr = c.getBoundingClientRect();
  return { n: it.length, terceira: r && Math.abs(r.top - cr.top) < 4, barra: !!it[2]?.querySelector(".interacoes") };
});
ok(f.n === 4, "lista com as 4 publicações (" + f.n + ")");
ok(f.terceira, "a lista abre na publicação tocada");
ok(f.barra, "a publicação aberta tem estrelas e ações");
await p.locator("#feedLista .pfd-item").nth(2).locator(".pfd-mais").click(); await p.waitForTimeout(400);
ok(await p.locator("text=Estatísticas").count() >= 1, "⋯ da sua publicação: Editar, Estatísticas, Apagar...");
await p.keyboard.press("Escape"); await p.waitForTimeout(300);
await p.goBack(); await p.waitForTimeout(600);
ok(await p.locator("#folhaFeed.aberta").count() === 0, "voltar fecha a lista");
// perfil de outra pessoa: capa igual e negócios em cartões
await p.goto(`http://127.0.0.1:5057/usuarios.html?perfil=${ids.bruno}`); await p.waitForSelector("#ppCabecalho .pf-nome", { timeout: 20000 }); await p.waitForTimeout(3000);
const v = await p.evaluate(() => {
  const r = document.querySelector("#ppCabecalho .pf-capa").getBoundingClientRect();
  const neg = [...document.querySelectorAll("#ppCabecalho [data-el=negocios] .vinculo")].map((x) => { const s = getComputedStyle(x.querySelector(".nome")); return { tipo: x.querySelector(".papel").textContent, nome: s.display !== "none" }; });
  return { capa: r.width / r.height, neg, sw: document.documentElement.scrollWidth, vw: innerWidth };
});
ok(Math.abs(v.capa - 3) < 0.05, "capa 3:1 no perfil de quem visita (" + v.capa.toFixed(2) + ")");
ok(v.neg.length >= 1 && v.neg.every((n) => n.nome && n.tipo), "negócios em bolinhas com nome e tipo (" + v.neg.map((n) => n.tipo).join(", ") + ")");
ok(v.sw <= v.vw, "sem passar da largura");
// Social, Configurações e Notificações: topo de app, sem a marca antiga
for (const [pg, tit] of [["social.html", "Meu social"], ["configuracoes.html", "Configurações"], ["notificacoes.html", "Notificações"]]) {
  await p.goto("http://127.0.0.1:5057/" + pg); await p.waitForTimeout(3500);
  const t = await p.evaluate(() => ({ app: !!document.querySelector(".topo.topo-app"), marca: !!document.querySelector(".topo .marca"), tit: document.querySelector(".topo-tit")?.textContent || "",
    voltar: !!document.querySelector(".topo-app .icone-btn use[href='#i-voltar']"), sw: document.documentElement.scrollWidth, vw: innerWidth }));
  ok(t.app && !t.marca && t.tit.startsWith(tit) && t.voltar && t.sw <= t.vw, `${pg}: topo voltar · ${tit} (${t.tit})`);
  if (pg === "social.html") {
    const ceu = await p.evaluate(() => ({ astros: document.querySelectorAll("#orbita .astro:not(.centro)").length, retratos: document.querySelectorAll("#grupos .retrato:not(.add)").length,
      filtros: document.querySelectorAll("#filtros button").length }));
    ok(ceu.astros === 3 && ceu.retratos === 3 && ceu.filtros === 5, `Social: 3 conexões em órbita, 3 retratos e 5 filtros (${JSON.stringify(ceu)})`);
    await p.locator('#filtros button[data-cat="familia"]').click(); await p.waitForTimeout(300);
    ok(await p.locator("#orbita .astro.apagado").count() === 2 && await p.locator("#grupos .grupo").count() === 1 && await p.locator("#duo").isHidden(), "Social: filtro Família apaga os outros no céu e mostra só o grupo");
    await p.locator('#filtros button:not([data-cat])').click(); await p.waitForTimeout(300);
  }
  if (pg === "social.html") ok(await p.locator("#duo:not([hidden]) .akai-par").count() === 1, "Social: cartão do duo (Akai Ito)");
}
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close();
