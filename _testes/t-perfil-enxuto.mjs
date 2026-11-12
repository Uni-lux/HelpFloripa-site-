// Perfil enxuto (12/11/2026): números numa linha + ícone das estatísticas, Editar perfil · Compartilhar · ⋯,
// sem os cartões grandes, negócios em pílulas e "O que aparece no perfil" (cidade, avaliação, negócios, destaques).
// Uso: node seed.mjs | tail -1 > saida/seed-ids.json && node t-perfil-enxuto.mjs
import { navegador, entrar } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const erros = [];
const A = await navegador({ mobile: true });
const p = await entrar(A.ctx, "bruno", "usuarios.html");
p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector("#meuPerfil .pf-nome", { timeout: 25000 }); await p.waitForTimeout(2500);
const info = await p.evaluate(() => {
  const r = document.querySelector("#meuPerfil");
  const ordem = [...r.querySelector(".pf-corpo").children].map((x) => x.className || x.dataset.el);
  return { ordem, acoes: [...r.querySelectorAll(".pf-acoes > *")].map((b) => b.textContent.trim() || b.getAttribute("aria-label")),
    painel: !!r.querySelector(".pf-painel"), chip: !!r.querySelector(".chip-verif"), social: !!r.querySelector("#meuSocial"),
    ins: !!r.querySelector('[data-stat="insights"]:not([hidden]) use[href="#i-graf"]'), novoNeg: !!r.querySelector(".vinculo.novo"), visib: !!r.querySelector(".neg-visib"),
    capaTx: r.querySelector(".pf-editar-capa")?.textContent.trim(), sw: document.documentElement.scrollWidth, vw: innerWidth };
});
ok(info.ordem[0] === "pf-stats", "números logo depois da bio (" + info.ordem.join(" > ") + ")");
ok(info.acoes.length === 3 && /Editar perfil/.test(info.acoes[0]) && /Compartilhar/.test(info.acoes[1]), "ações: Editar perfil · Compartilhar · ⋯ (" + info.acoes.join(" | ") + ")");
ok(!info.painel && !info.chip && !info.social, "sem o cartão de estatísticas, o pedido de selo e o botão Social soltos");
ok(info.ins, "ícone das estatísticas ao lado dos números");
ok(!info.novoNeg && !info.visib, "negócios sem o 'Novo' tracejado e sem a pílula de visibilidade");
ok(info.capaTx === "", "trocar a capa é só um ícone");
ok(info.sw <= info.vw, "sem passar da largura");
await p.screenshot({ path: "saida/pe-perfil.png" });
// ⋯
await p.locator("#meuPerfilMais").click(); await p.waitForTimeout(400);
const ops = await p.locator("#opcoesCorpo").innerText().catch(() => "");
ok(/O que aparece no perfil/.test(ops) && /Estatísticas do perfil/.test(ops) && /Social/.test(ops) && /Arquivo do Flash/.test(ops), "⋯ com O que aparece, Estatísticas, Social e Arquivo");
await p.screenshot({ path: "saida/pe-menu.png" });
await p.locator("#opcoesCorpo button", { hasText: "O que aparece no perfil" }).click(); await p.waitForTimeout(500);
await p.screenshot({ path: "saida/pe-personalizar.png" });
await p.locator("#opcoesCorpo button", { hasText: "Cidade" }).click(); await p.waitForTimeout(1200);
ok(await p.evaluate(() => document.querySelector("#meuPerfil .pf-cidade")?.hidden === true), "esconder a cidade some do perfil");
await p.keyboard.press("Escape"); await p.waitForTimeout(400);
// visitante (Ana) não vê a cidade do Bruno
const B = await navegador({ mobile: true });
const q = await entrar(B.ctx, "ana", "usuarios.html");
q.on("pageerror", (e) => erros.push(e.message));
const ids = JSON.parse((await import("node:fs")).readFileSync("saida/seed-ids.json", "utf8"));
await q.goto(`http://127.0.0.1:5057/usuarios.html?perfil=${ids.bruno}`); await q.waitForSelector("#ppCabecalho .pf-nome", { timeout: 25000 }); await q.waitForTimeout(2500);
const vis = await q.evaluate(() => ({ cid: document.querySelector("#ppCabecalho .pf-cidade")?.hidden, acoes: document.querySelectorAll("#ppCabecalho .pf-acoes > *").length }));
ok(vis.cid === true, "quem visita também não vê a cidade escondida");
ok(vis.acoes === 3, "visitante: Seguir · Mensagem · ⋯");
await q.screenshot({ path: "saida/pe-visitante.png" });
// volta a cidade
await p.locator("#meuPerfilMais").click(); await p.waitForTimeout(300);
await p.locator("#opcoesCorpo button", { hasText: "O que aparece no perfil" }).click(); await p.waitForTimeout(400);
await p.locator("#opcoesCorpo button", { hasText: "Cidade" }).click(); await p.waitForTimeout(1000);
ok(await p.evaluate(() => document.querySelector("#meuPerfil .pf-cidade")?.hidden === false), "mostrar a cidade de novo");
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close(); await B.browser.close();
