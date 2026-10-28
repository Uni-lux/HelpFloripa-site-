// Perfil grátis limitado e Plus mais atraente: gaveta dos planos com a coluna Grátis e o topo que muda com o plano
// tocado (nome, preço do mês e por dia, o que libera); vitrine do perfil grátis (3 itens, 1 foto, sem capa, sem links,
// sem pedidos pelo site) e Plus antes dos grátis; para anunciar a conta precisa ser verificada; painel: contas ligadas
// (mesmo WhatsApp) e "Punir má-fé" (1ª vez: perfis fora do ar, 30 dias sem anunciar, sem o selo, aviso grave).
// Uso: node seed.mjs && node t-gratis-plus.mjs  (precisa das regras do repositório)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { navegador, entrar, USUARIOS as U, BASE } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const dia = 864e5;
const FOTO = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AN//Z";
const NEG = `${U.bruno}_servicos`;
const CAPA = "data:image/jpeg;base64,Q0FQQURPQlJVTk9DQVBBRE9CUlVOTw==";
await db.doc(`planos/${U.bruno}`).delete().catch(() => {});
await db.doc(`negocios/${NEG}`).set({
  whatsapp: "(48) 99999-1111", instagram: "brunoreparos", site: "https://bruno.com.br", capa: CAPA, fotos: [FOTO, FOTO, FOTO],
  itens: Array.from({ length: 6 }, (_, i) => ({ nome: `Serviço ${i + 1}`, preco: 50 + i, categoria: "reparos" })), principal: "servicos", atualizadoEm: Timestamp.now()
}, { merge: true });
// Edu: mesmo WhatsApp do Bruno (conta ligada) e com plano Plus (aparece antes dos grátis).
await db.doc(`negocios/${U.edu}_servicos`).set({ whatsapp: "(48) 99999-1111", ocultoAte: null, ocultoPelaEquipe: false, atualizadoEm: Timestamp.now() }, { merge: true });
await db.doc(`planos/${U.edu}`).set({ plano: "plus", meses: 1, ate: Timestamp.fromMillis(Date.now() + 20 * dia) });
for (const t of ["servicos", "delivery", "lojinha", "imoveis", "saude"]) await db.doc(`programa_banidos/${U.edu}_${t}`).delete().catch(() => {});

// ---------- 1) gaveta dos planos ----------
const B = await navegador({ mobile: true });
const b = await entrar(B.ctx, "bruno", "negocios.html?planos=1");
await b.waitForSelector(".pl-card", { timeout: 20000 });
const cab = (await b.locator(".pl-tabela .pl-lin.cab span").allTextContents()).join(" | ");
ok(cab === "Recursos | Grátis | Plus | Pro | Premium", "tabela com a coluna Grátis: " + cab);
const linhaItens = (await b.locator(".pl-tabela .pl-lin", { hasText: "Itens" }).first().textContent()).replace(/\s+/g, " ");
ok(linhaItens.includes("3") && linhaItens.includes("12"), "linha dos itens: grátis 3, planos 12 → " + linhaItens);
await b.locator(".pl-card[data-plano='plus']").click(); await b.waitForTimeout(300);
const heroPlus = (await b.textContent(".pl-hero")).replace(/\s+/g, " ");
ok(heroPlus.includes("Plano Plus") && heroPlus.includes("29,90") && heroPlus.includes("por dia") && heroPlus.includes("Espaços de destaque nas vitrines"), "tocar no Plus: o topo fala do Plus (R$ 29,90, por dia, o que libera)");
await b.screenshot({ path: "saida/gp-plus.png" });
await b.locator(".pl-card[data-plano='premium']").click(); await b.waitForTimeout(300);
const heroPrem = (await b.textContent(".pl-hero")).replace(/\s+/g, " ");
ok(heroPrem.includes("Plano Premium") && heroPrem.includes("59,90") && heroPrem.includes("1º lugar de cada vitrine") && await b.locator(".pl-hero[data-plano='premium']").count() === 1, "tocar no Premium: o topo muda para o Premium (R$ 59,90)");
await b.locator(".pl-tabela").scrollIntoViewIfNeeded(); await b.screenshot({ path: "saida/gp-tabela.png" });
const larg = await b.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
ok(larg[0] <= larg[1], `tabela de 5 colunas cabe no celular (${larg[0]} ≤ ${larg[1]})`);

// ---------- 2) editor: o que é do Plus ----------
await b.goto(BASE + "negocios.html"); await b.waitForSelector("#neg-servicos", { timeout: 20000 }); await b.waitForTimeout(1500);
ok((await b.textContent("#neg-servicos .ng-est")).includes("PLUS"), "estatísticas travadas no grátis (PLUS)");
ok((await b.$eval("#neg-servicos .capa", (e) => getComputedStyle(e).getPropertyValue("--img"))).includes("Q0FQQURP") && (await b.textContent("#neg-servicos .ng-capa-plus")).includes("Capa visível com plano"), "cartão em Meus negócios mostra a capa escolhida (e avisa que é do plano)");
await b.locator("#neg-servicos").scrollIntoViewIfNeeded(); await b.screenshot({ path: "saida/gp-cartao-capa.png" });
await b.locator("#neg-servicos .ng-pri").click(); await b.waitForSelector("#folhaNegocio.aberta", { timeout: 8000 }); await b.waitForTimeout(600);
ok(await b.locator("#folhaNegocio .neg-item.so-plano").count() === 3 && await b.locator("#folhaNegocio .neg-foto.so-plano").count() === 2, "itens 4–6 e fotos 2–3 marcados PLUS (guardados, não aparecem)");
ok(await b.locator("#folhaNegocio .ng-plus-campo").count() === 2, "capa e links com o aviso do plano");
await b.locator("#folhaNegocio .neg-item.so-plano").first().scrollIntoViewIfNeeded(); await b.screenshot({ path: "saida/gp-editor.png" });
await B.browser.close();

// ---------- 3) vitrine: perfil grátis limitado e Plus antes ----------
const A = await navegador({ mobile: true });
const a = await entrar(A.ctx, "ana", "servicos.html");
await a.waitForSelector("#vtGrade .vt-conta", { timeout: 20000 }); await a.waitForTimeout(2500);
const txt = await a.textContent("#vtGrade");
const iEdu = txt.indexOf("Edu Pinturas"), iBruno = txt.indexOf("Bruno Reparos");
ok(iEdu >= 0 && iBruno >= 0 && iEdu < iBruno, `Plus (Edu) aparece antes do grátis (Bruno): ${iEdu} < ${iBruno}`);
await a.goto(BASE + `servicos.html?negocio=${NEG}`); await a.waitForSelector(".vd-servicos", { timeout: 20000 }); await a.waitForTimeout(800);
ok(await a.locator(".vd-serv").count() === 3, "perfil grátis: só 3 serviços (" + await a.locator(".vd-serv").count() + ")");
ok(await a.locator(".vd-pedir").count() === 0, "perfil grátis: sem botão de pedir orçamento pelo site");
ok(await a.locator(".vd-galeria img").count() === 1, "perfil grátis: 1 foto na galeria");
ok(await a.locator(".vd-link", { hasText: "@brunoreparos" }).count() === 0 && await a.locator(".vd-link", { hasText: "Site" }).count() === 0, "perfil grátis: sem Instagram e site");
ok(!(await a.evaluate(() => getComputedStyle(document.querySelector(".vd-capa")).backgroundImage)).includes("Q0FQQURP"), "perfil grátis: sem a capa (fica a 1ª foto, como antes)");
ok((await a.textContent(".conteudo")).includes("Conversar pelo chat"), "contato pelo chat (e WhatsApp)");
await a.screenshot({ path: "saida/gp-vitrine-gratis.png", fullPage: true });

// ---------- 4) para anunciar: conta verificada ----------
await a.goto(BASE + "negocios.html"); await a.waitForSelector(".ng-novo", { timeout: 20000 }); await a.waitForTimeout(800);
await a.locator(".ng-novo.servicos").click();
await a.waitForSelector(".hf-confirma", { timeout: 5000 });
ok((await a.textContent(".hf-confirma")).includes("Verifique sua conta para anunciar"), "conta não verificada: pede a verificação antes de criar o perfil");
await a.screenshot({ path: "saida/gp-verificar.png" });
await A.browser.close();

// ---------- 5) painel: contas ligadas e punir má-fé ----------
const versaoBase = readFileSync(new URL("../admin-secoes.js", import.meta.url), "utf8").match(/admin-base\.js\?v=(\d+)/)[1];
const ADM = await navegador({ mobile: false });
const p = await entrar(ADM.ctx, "admin", "admin.html");
await p.waitForSelector(".ad-kpis, .ad-item, .ad-bloco", { timeout: 30000 }); await p.waitForTimeout(1500);
await p.evaluate(async ([v, uid]) => { const m = await import(`./admin-base.js?v=${v}`); m.abrirFicha(uid); }, [versaoBase, U.edu]);
await p.waitForSelector(".ad-ligadas", { timeout: 15000 });
ok((await p.textContent(".ad-ligadas")).includes("Bruno") && (await p.textContent(".ad-ligadas")).includes("mesmo WhatsApp"), "ficha: contas ligadas pelo mesmo WhatsApp");
await p.locator(".ad-bt", { hasText: "Punir má-fé" }).click();
await p.waitForSelector(".ad-modal select", { timeout: 5000 });
ok((await p.locator(".ad-modal select").first().inputValue()) === "1", "nível sugerido: 1ª vez");
await p.screenshot({ path: "saida/gp-punir.png" });
await p.locator(".ad-modal .ad-bt.perigo, .ad-modal button[type=submit]").last().click(); await p.waitForTimeout(4000);
const ban = (await db.doc(`programa_banidos/${U.edu}_servicos`).get()).data();
ok(ban && ban.motivo.startsWith("Má-fé ao anunciar") && ban.ate && ban.ate.toMillis() > Date.now() + 29 * dia, "30 dias sem poder anunciar (programa_banidos com prazo)");
const negEdu = (await db.doc(`negocios/${U.edu}_servicos`).get()).data();
ok(negEdu.ocultoPelaEquipe === true, "perfil de negócio fora do ar");
const avisos = (await db.collection("avisos").where("uid", "==", U.edu).get()).docs.map((d) => d.data());
ok(avisos.some((x) => x.tipo === "grave" && String(x.titulo).includes("saíram do ar")), "aviso grave para a pessoa");
await ADM.browser.close();

// limpa
for (const t of ["servicos", "delivery", "lojinha", "imoveis", "saude"]) await db.doc(`programa_banidos/${U.edu}_${t}`).delete().catch(() => {});
await db.doc(`negocios/${U.edu}_servicos`).set({ ocultoAte: null, ocultoPelaEquipe: false }, { merge: true });
await db.doc(`planos/${U.edu}`).delete().catch(() => {});
process.exit(process.exitCode || 0);
