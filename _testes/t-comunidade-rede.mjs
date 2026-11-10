// Comunidade numa página só com a rede (o anúncio e o publicar abrem por cima do Mural, comunidade.html leva para a rede),
// "+" de volta no topo, marca em Sora e barras do celular no tema escolhido (10/11/2026).
// Uso: node seed.mjs | tail -1 > saida/seed-ids.json && node t-comunidade-rede.mjs
import { navegador, entrar } from "./nav.mjs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8085";
const db = getFirestore(initializeApp({ projectId: "demo-hf" }, "cr"));
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const ids = JSON.parse(readFileSync("saida/seed-ids.json", "utf8"));
await db.doc("comunidade/crteste1").set({ donoId: ids.bruno, categoria: "doacao", titulo: "Sofá de dois lugares", descricao: "Bom estado, retirar no bairro.", tipoItem: "moveis", estado: "usado", entrega: "combinar", fotos: [], status: "disponivel", uf: "SC", cidade: "Florianópolis", cidadeIbge: 4205407, bairro: "Centro", aceiteRegras: true, criadoEm: Timestamp.now(), atualizadoEm: Timestamp.now() });
const erros = [];
const A = await navegador({ mobile: true, rede: true });
await A.ctx.addInitScript(() => { try { if (!sessionStorage.getItem("t")) { sessionStorage.setItem("t", "1"); localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" })); } } catch {} });
const p = await entrar(A.ctx, "ana", "feed.html");
p.on("pageerror", (e) => erros.push(e.message));
await p.waitForURL(/rede\.html/, { timeout: 15000 }).catch(() => {});
for (let i = 0; i < 60 && (await p.evaluate(() => [...document.querySelectorAll(".hf-quadro")].filter((q) => q.dataset.carregou).length)) < 4; i++) await p.waitForTimeout(500);
await p.waitForTimeout(1500);
const quadro = (re) => p.frames().find((f) => f.parentFrame() && re.test(f.url()));
const feed = quadro(/feed\.html/);
const topo = await feed.evaluate(() => ({ mais: !!document.querySelector(".topo #btnComporFeed.topo-criar"), fab: !!document.querySelector(".fab-criar"), fonte: getComputedStyle(document.querySelector(".marca strong")).fontFamily, ital: getComputedStyle(document.querySelector(".marca strong")).fontStyle }));
ok(topo.mais && !topo.fab, "Diário: + de volta no topo, sem o botão flutuante");
ok(/HF Marca/.test(topo.fonte) && topo.ital === "normal", "marca em Sora, sem itálico");
ok(await p.evaluate(() => document.querySelector('meta[name="theme-color"]').content) === "#0f161b", "tema escuro: barra do celular escura");
await p.screenshot({ path: "saida/cr-diario-escuro.png" });
// tema claro: a casca acompanha
await feed.evaluate(() => { const c = JSON.parse(localStorage.getItem("hf-chat-config") || "{}"); c.tema = "claro"; localStorage.setItem("hf-chat-config", JSON.stringify(c)); });
await p.waitForTimeout(600);
ok(await p.evaluate(() => [document.documentElement.dataset.theme, document.querySelector('meta[name="theme-color"]').content, getComputedStyle(document.body).backgroundColor].join(" ")) === "light #ffffff rgb(241, 244, 246)", "tema claro: barra do celular e fundo claros");
await p.screenshot({ path: "saida/cr-diario-claro.png" });
// Comunidade
await p.evaluate(() => window.__hfShell.ir("comunidade")); await p.waitForTimeout(1500);
const mural = quadro(/mural\.html/);
ok(await mural.evaluate(() => !!document.querySelector(".topo #btnPublicarMural")), "Comunidade: + no topo");
await mural.waitForSelector(".mu-post", { timeout: 20000 });
await mural.locator(".mu-post", { hasText: "Sofá de dois lugares" }).locator(".mu-corpo").tap(); await p.waitForTimeout(1500);
ok(/mural\.html/.test(mural.url()) && await mural.evaluate(() => !!document.querySelector(".cm-modal")), "tocar no anúncio abre ele por cima do Mural (sem trocar de página)");
await p.screenshot({ path: "saida/cr-item.png" });
await mural.evaluate(() => document.querySelector(".cm-modal .cm-x").click()); await p.waitForTimeout(400);
await mural.locator("#btnPublicarMural").tap(); await p.waitForTimeout(1500);
ok(/mural\.html/.test(mural.url()) && await mural.evaluate(() => !!document.querySelector(".cm-modal .cm-form")), "+ abre o formulário de publicar ali mesmo");
await p.screenshot({ path: "saida/cr-form.png" });
await mural.evaluate(() => document.querySelector(".cm-modal .cm-x").click()); await p.waitForTimeout(300);
// página antiga leva para a rede
const p2 = await A.ctx.newPage();
await p2.addInitScript(() => { try { localStorage.removeItem("hf-sem-rede"); } catch {} });
await p2.goto("http://127.0.0.1:5057/comunidade.html?item=crteste1"); await p2.waitForTimeout(2500);
ok(/rede\.html\?aba=comunidade/.test(p2.url()), "comunidade.html leva para a Comunidade da rede: " + p2.url());
for (let i = 0; i < 30; i++) { const f = p2.frames().find((x) => x.parentFrame() && /mural/.test(x.url())); if (f && await f.evaluate(() => !!document.querySelector(".cm-modal")).catch(() => false)) break; await p2.waitForTimeout(500); }
const f2 = p2.frames().find((x) => x.parentFrame() && /mural/.test(x.url()));
ok(!!f2 && await f2.evaluate(() => !!document.querySelector(".cm-modal")), "o anúncio do link abre dentro do Mural");
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await db.doc("comunidade/crteste1").delete();
await A.browser.close(); process.exit();
