// Comunidade enxuta e abas da rede com as cores do Mensagens (10/11/2026): sem o painel do topo, busca + lugar numa linha,
// filtros só com o nome, regra numa linha, "+" do topo abre a folha de publicar; fundo do Mensagens nas abas da rede e a
// barrinha de rolagem do Android fora da tela (quadro 6 px mais largo e a página devolvendo os 6 px).
// Uso: node seed.mjs | tail -1 > saida/seed-ids.json && node t-mural-enxuto.mjs
import { navegador, entrar } from "./nav.mjs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8085";
const db = getFirestore(initializeApp({ projectId: "demo-hf" }, "me"));
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const ids = JSON.parse(readFileSync("saida/seed-ids.json", "utf8"));
for (const [i, cat] of ["doacao", "troca", "pedido"].entries()) await db.doc(`comunidade/me${i}`).set({ donoId: ids.bruno, categoria: cat, titulo: ["Sofá de dois lugares", "Bicicleta aro 26", "Roupas de bebê"][i], descricao: "Retirar no bairro.", tipoItem: "moveis", estado: "usado", entrega: "combinar", fotos: [], status: "disponivel", uf: "SC", cidade: "Florianópolis", cidadeIbge: 4205407, bairro: "Centro", aceiteRegras: true, criadoEm: Timestamp.now(), atualizadoEm: Timestamp.now() });
const erros = [];
const A = await navegador({ mobile: true, rede: true });
await A.ctx.addInitScript(() => { try { if (!sessionStorage.getItem("t")) { sessionStorage.setItem("t", "1"); localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" })); } } catch {} });
const p = await entrar(A.ctx, "ana", "feed.html");
p.on("pageerror", (e) => erros.push(e.message));
await p.waitForURL(/rede\.html/, { timeout: 15000 }).catch(() => {});
for (let i = 0; i < 60 && (await p.evaluate(() => [...document.querySelectorAll(".hf-quadro")].filter((q) => q.dataset.carregou).length)) < 4; i++) await p.waitForTimeout(500);
await p.waitForTimeout(1200);
const quadro = (re) => p.frames().find((f) => f.parentFrame() && re.test(f.url()));
// cores do Mensagens nas abas
const corDe = (f) => f.evaluate(() => getComputedStyle(document.body).backgroundColor);
ok(await corDe(quadro(/feed\.html/)) === "rgb(0, 0, 0)", "Diário com o preto do X");
ok(await corDe(quadro(/usuarios\.html/)) === "rgb(0, 0, 0)", "Perfil com o preto do X");
ok(await p.evaluate(() => document.querySelector('meta[name="theme-color"]').content) === "#000000", "barra do celular na cor do topo do Mensagens");
// barrinha fora da tela
const larg = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll(".hf-quadro")].map((q) => [q.dataset.id, q.getBoundingClientRect().width - innerWidth])));
ok(larg.feed === 6 && larg.mural === 6 && larg.perfil === 6 && larg.mensagens === 0, "quadros 6 px mais largos (menos o Mensagens): " + JSON.stringify(larg));
const feed = quadro(/feed\.html/);
const comp = await feed.evaluate(() => ({ c: document.documentElement.classList.contains("hf-corte"), pad: getComputedStyle(document.documentElement).paddingRight, topo: document.querySelector(".topo").getBoundingClientRect().right, w: innerWidth }));
ok(comp.c && comp.pad === "6px" && comp.topo === comp.w - 6, "Diário devolve os 6 px (topo termina na borda da tela): " + JSON.stringify(comp));
const msg = quadro(/mensagens\.html/);
ok(!(await msg.evaluate(() => document.documentElement.classList.contains("hf-corte"))), "Mensagens sem o corte");
// Comunidade
await p.evaluate(() => window.__hfShell.ir("comunidade")); await p.waitForTimeout(1200);
const m = quadro(/mural\.html/);
await m.waitForSelector(".mu-post", { timeout: 20000 });
const t = await m.evaluate(() => ({ painel: !!document.querySelector(".mu-topo, .mu-compor, .mu-numeros, .mu-gratis"), linha: !!document.querySelector(".mu-linha .mu-busca") && !!document.querySelector(".mu-linha .mu-local"),
  chips: [...document.querySelectorAll("#muFiltros .mu-chip")].map((b) => b.textContent), aviso: document.querySelector(".mu-aviso")?.textContent, local: document.querySelector("#muLocal").textContent,
  altura: document.querySelector(".mu-lista").getBoundingClientRect().top, cor: getComputedStyle(document.body).backgroundColor }));
ok(!t.painel && t.linha, "sem o painel do topo; busca e lugar numa linha");
ok(t.chips[0] === "Tudo" && t.chips.every((c) => !/\d/.test(c)), "filtros só com o nome: " + t.chips.join(" · "));
ok(/Proibido vender/.test(t.aviso) && /Regras/.test(t.aviso), "regra numa linha só");
ok(t.altura < 360, "a 1ª publicação aparece logo (topo da lista em " + Math.round(t.altura) + " px)");
ok(t.cor === "rgb(0, 0, 0)", "Comunidade com o preto do X");
await p.screenshot({ path: "saida/me-comunidade.png" });
await m.locator(".mu-chip", { hasText: "Trocas" }).tap(); await p.waitForTimeout(300);
ok((await m.locator(".mu-post").count()) >= 1 && (await m.locator(".mu-post").allTextContents()).every((x) => /troca/i.test(x)), "filtro Trocas");
await m.locator(".mu-chip", { hasText: "Tudo" }).tap();
await m.locator("#btnPublicarMural").tap(); await p.waitForTimeout(500);
const f = await m.evaluate(() => ({ aberta: document.querySelector("#folhaPublicar").classList.contains("aberta"), n: document.querySelectorAll("#folhaPublicar .mu-pub").length, b: document.querySelector("#folhaPublicar .folha-caixa").getBoundingClientRect().bottom, h: innerHeight }));
ok(f.aberta && f.n === 5 && Math.abs(f.b - f.h) < 2, "+ abre a folha de publicar embaixo com os 5 tipos");
await p.screenshot({ path: "saida/me-publicar.png" });
await m.locator("#folhaPublicar .mu-pub", { hasText: "Doar" }).tap(); await p.waitForTimeout(1500);
ok(await m.evaluate(() => !document.querySelector("#folhaPublicar").classList.contains("aberta") && !!document.querySelector(".cm-modal")), "escolher Doar fecha a folha e abre o formulário por cima");
await p.screenshot({ path: "saida/me-form.png" });
ok(!erros.length, "sem erros na página " + erros.join(" | "));
await A.browser.close();
