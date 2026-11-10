// Automotivo (tipo novo de negócio, no lugar do cartão Comunidade das classes do Início): o Bruno cria o perfil pelo
// formulário (categoria, a partir de, como atende, serviço com preço), a vitrine automotivo.html mostra o cartão e o
// filtro, o detalhe tem "Pedir orçamento" com o campo do veículo, e o Início mostra o cartão Automotivo no lugar da
// Comunidade. Uso: node t-automotivo.mjs (regras do repositório: tipo automotivo).
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, BASE } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const db = getFirestore(initializeApp({ projectId: "demo-hf" }));
await db.doc(`negocios/${U.bruno}_automotivo`).delete().catch(() => {});
await db.doc(`planos/${U.bruno}`).set({ plano: "plus", meses: 1, ate: Timestamp.fromMillis(Date.now() + 30 * 864e5) });

// ---------- 1) Bruno cria o perfil Automotivo ----------
const BR = await navegador({ mobile: true });
const b = await entrar(BR.ctx, "bruno", "negocios.html?tipo=automotivo");
await b.waitForSelector("#folhaNegocio.aberta #negX_categoria", { timeout: 20000 });
ok(await b.locator("#folhaNegocio .ng-tipo.automotivo").count() === 1, "Meus negócios: tipo Automotivo no formulário");
await b.fill("#negNome", "Oficina do Bruno");
await b.selectOption("#negX_categoria", "mecanica"); await b.waitForTimeout(300);
await b.fill("#negX_precoDesde", "90");
await b.locator("#negExtras .marca-op", { hasText: "Na oficina/loja" }).click();
await b.locator("#negExtras .marca-op", { hasText: "Busca e leva o carro" }).click();
await b.locator("#negExtras .neg-add").first().click(); await b.waitForTimeout(200);
await b.locator("#negExtras .neg-item input").first().fill("Troca de óleo");
await b.locator("#negExtras .neg-item input").nth(1).fill("120");
await b.fill("#negDesc", "Mecânica geral, injeção eletrônica e revisão com garantia. Atendemos todas as marcas.");
await b.screenshot({ path: "saida/au-form.png" });
await b.click("#negSalvar"); await b.waitForTimeout(3500);
const n = (await db.doc(`negocios/${U.bruno}_automotivo`).get()).data();
ok(n?.tipo === "automotivo" && n.categoria === "mecanica" && n.precoDesde === 90 && n.atendimento?.includes("leva") && n.itens?.[0]?.nome === "Troca de óleo" && n.itens[0].preco === 120 && n.itens[0].unidade === "fixo",
  "perfil gravado: " + JSON.stringify({ cat: n?.categoria, desde: n?.precoDesde, at: n?.atendimento, it: n?.itens?.[0] }));
ok((n?.busca || []).includes("oficina") && (n?.busca || []).includes("revisao"), "busca do perfil com as palavras da categoria");
await b.goto(BASE + "negocios.html"); await b.waitForSelector(".neg-card.automotivo", { timeout: 20000 }); await b.waitForTimeout(800);
ok(await b.locator(".ng-slot.automotivo.feito").count() === 1 && await b.locator(".ng-slot").count() === 7, "topo do painel: 6 tipos + Comunidade, Automotivo aceso");
await b.screenshot({ path: "saida/au-meus-negocios.png", fullPage: true });

// ---------- 2) Ana vê na vitrine e pede orçamento ----------
const AN = await navegador({ mobile: true });
const a = await entrar(AN.ctx, "ana", "automotivo.html");
await a.waitForSelector(".vt-cv", { timeout: 20000 }); await a.waitForTimeout(1000);
await a.evaluate(() => document.querySelector(".hfman-x")?.click());
const cartao = await a.textContent(".vt-cv");
ok(cartao.includes("Oficina do Bruno") && cartao.includes("Oficina mecânica") && cartao.includes("90"), "cartão da vitrine: nome, categoria e a partir de");
ok(await a.locator(".classe-link.automotivo[aria-current=page]").count() === 1 && await a.locator(".classe-link.comunidade").count() === 0, "classes da página: Automotivo marcado no lugar da Comunidade");
await a.screenshot({ path: "saida/au-vitrine.png" });
await a.locator(".chip[data-filter=mecanica]").click(); await a.waitForTimeout(400);
ok(await a.locator("#vtGrade .vt-cv").count() >= 1, "filtro Mecânica mostra o perfil");
await a.locator(".chip[data-filter=guincho]").click(); await a.waitForTimeout(400);
ok(await a.locator("#vtGrade .vt-cv").count() === 0, "filtro Guincho não mostra a oficina");
await a.locator(".chip[data-filter=todos]").click(); await a.waitForTimeout(400);
await a.locator("#vtGrade .vt-cv").first().click(); await a.waitForSelector(".vt-modal .vd-servicos", { timeout: 10000 });
const det = await a.textContent(".vt-modal");
ok(det.includes("Troca de óleo") && det.includes("Busca e leva o carro") && det.includes("Serviços e preços"), "detalhe: serviço com preço e como atende");
await a.screenshot({ path: "saida/au-detalhe.png" });
await a.locator(".vt-modal .vt-btn", { hasText: "Pedir orçamento" }).first().click(); await a.waitForSelector(".vd-pedido textarea.vd-obs", { timeout: 10000 });
ok((await a.getAttribute(".vd-pedido textarea.vd-obs", "placeholder")).includes("Veículo"), "pedido de orçamento pede o veículo");
await a.screenshot({ path: "saida/au-orcamento.png" });

// ---------- 3) Início: cartão Automotivo no lugar da Comunidade ----------
const i = await entrar(AN.ctx, "ana", "index.html");
await i.waitForSelector(".classe-card.automotivo", { timeout: 20000 }); await i.waitForTimeout(2500);
ok(await i.locator(".classes-grade .classe-card").count() === 6 && await i.locator(".classes-grade .classe-card.comunidade").count() === 0, "Início: 6 cartões, Automotivo no lugar da Comunidade");
ok((await i.textContent("#conta-automotivo")).includes("1 perfil"), "Início: contagem do Automotivo: " + (await i.textContent("#conta-automotivo")));
await i.locator(".classes-grade").screenshot({ path: "saida/au-inicio.png" });
const DK = await navegador({ mobile: false });
const d = await entrar(DK.ctx, "ana", "automotivo.html"); await d.waitForSelector(".vt-cv", { timeout: 20000 }); await d.waitForTimeout(1200);
await d.evaluate(() => document.querySelector(".hfman-x")?.click());
ok(await d.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "computador: sem rolagem para o lado");
await d.screenshot({ path: "saida/au-vitrine-pc.png" });
ok(await a.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "celular: sem rolagem para o lado");
await Promise.all([BR, AN, DK].map((x) => x.browser.close()));
