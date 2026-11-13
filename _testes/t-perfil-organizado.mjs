// Perfil organizado (13/11/2026): sem o "+" na foto, bio inteira, sem a média de estrelas no perfil pessoal,
// botões baixos, @ limpo no topo e links (Instagram/WhatsApp) em ícones com "quem pode ver".
// Uso: node seed.mjs | tail -1 > saida/seed-ids.json && node t-perfil-organizado.mjs
import { navegador, entrar } from "./nav.mjs";
import { readFileSync } from "node:fs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const erros = [];
const ids = JSON.parse(readFileSync("saida/seed-ids.json", "utf8"));
const A = await navegador({ mobile: true });
const p = await entrar(A.ctx, "bruno", "usuarios.html");
p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector("#meuPerfil .pf-nome", { timeout: 25000 }); await p.waitForTimeout(2500);
// bio comprida para conferir que aparece inteira
await p.evaluate(() => { const b = document.querySelector("#meuPerfil .pf-bio"); b.hidden = false; b.classList.remove("vazia"); b.textContent = "Tudo é possível quando você está com Deus! Estudante de Engenharia Química na UFSC, empreendedor e apaixonado por tecnologia e inovação. Atendo em toda a Grande Florianópolis, com orçamento sem compromisso e muito capricho."; });
const info = await p.evaluate(() => {
  const r = document.querySelector("#meuPerfil"), bio = r.querySelector(".pf-bio");
  const bt = [...r.querySelectorAll(".pf-acoes > .btn")].map((b) => b.getBoundingClientRect().height);
  return { mais: !!r.querySelector(".pf-mais-flash"), nota: !!r.querySelector('[data-stat="nota"]'),
    bioInteira: bio.scrollHeight <= bio.clientHeight + 1, bioLinhas: Math.round(bio.clientHeight / parseFloat(getComputedStyle(bio).lineHeight)),
    botoes: bt, add: r.querySelector(".pf-link.add")?.textContent.trim(), topo: document.querySelector("#topoNick")?.textContent,
    gradiente: getComputedStyle(document.querySelector("#topoNick")).backgroundImage, sw: document.documentElement.scrollWidth, vw: innerWidth };
});
ok(!info.mais, "sem o \"+\" na foto de perfil");
ok(!info.nota, "sem a média de estrelas no perfil pessoal");
ok(info.bioInteira, `bio inteira (${info.bioLinhas} linhas, sem corte)`);
ok(info.botoes.length === 3 && info.botoes.every((h) => h <= 36), "botões baixos (" + info.botoes.join(", ") + " px)");
ok(info.add === "Links", "sem links: convite \"+ Links\"");
ok(/^@/.test(info.topo || "") && info.gradiente === "none", "@ no topo, limpo (" + info.topo + ")");
ok(info.sw <= info.vw, "sem passar da largura");
await p.screenshot({ path: "saida/po-antes.png" });
// adicionar os links pelo convite
await p.locator("#meuPerfil .pf-link.add").click(); await p.waitForTimeout(700);
ok(await p.locator("#folhaEditar.aberta #edLinks").isVisible(), "convite abre o Editar perfil nos links");
await p.fill("#edInsta", "https://www.instagram.com/Help.Floripa/?igsh=abc");
await p.fill("#edWhats", "(48) 99684-9431");
await p.evaluate(() => { const s = document.querySelector("#edWhatsVer"); s.value = "ninguem"; s.dispatchEvent(new Event("change")); });
await p.locator("#edSalvar").click(); await p.waitForTimeout(2500);
const depois = await p.evaluate(() => [...document.querySelectorAll("#meuPerfil .pf-link")].map((a) => ({ cls: a.className, href: a.getAttribute("href"), priv: !!a.querySelector(".pf-link-priv") })));
const ig = depois.find((x) => /instagram/.test(x.cls)), wa = depois.find((x) => /whatsapp/.test(x.cls));
ok(ig?.href === "https://instagram.com/Help.Floripa" && !ig.priv, "Instagram vira ícone com o link limpo");
ok(wa?.href === "https://wa.me/5548996849431" && wa.priv, "WhatsApp com o cadeado (só eu)");
ok(depois.some((x) => /add so-icone/.test(x.cls)), "com links: o \"+\" fica só como ícone");
await p.screenshot({ path: "saida/po-depois.png" });
// visitante
const B = await navegador({ mobile: true });
const q = await entrar(B.ctx, "ana", "usuarios.html");
q.on("pageerror", (e) => erros.push(e.message));
await q.goto(`http://127.0.0.1:5057/usuarios.html?perfil=${ids.bruno}`); await q.waitForSelector("#ppCabecalho .pf-nome", { timeout: 25000 }); await q.waitForTimeout(3000);
const vis = await q.evaluate(() => ({ links: [...document.querySelectorAll("#ppCabecalho .pf-link")].map((a) => a.className), nota: !!document.querySelector('#ppCabecalho [data-stat="nota"]') }));
ok(vis.links.length === 1 && /instagram/.test(vis.links[0]), "visitante vê o Instagram e não o WhatsApp 'só eu' (" + vis.links.join(",") + ")");
ok(!vis.nota, "visitante também não vê média de estrelas no perfil pessoal");
await q.screenshot({ path: "saida/po-visitante.png" });
// limpa os links
await p.locator("#meuPerfil .pf2 .pf-acoes .btn.pri").click(); await p.waitForTimeout(600);
await p.fill("#edInsta", ""); await p.fill("#edWhats", "");
await p.locator("#edSalvar").click(); await p.waitForTimeout(2000);
ok(await p.evaluate(() => document.querySelector("#meuPerfil .pf-link.add")?.textContent.trim() === "Links"), "apagar os links volta ao convite");
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close(); await B.browser.close();
