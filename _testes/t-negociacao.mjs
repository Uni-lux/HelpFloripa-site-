// Condição especial / negociação depois do plano grátis: formulário com o aviso do grátis, perfis e tempo pedidos e
// documentos recolhidos no celular; painel: responsável (assumir), aprovar escolhendo o tempo (dias), os perfis no ar e
// esconder o selo; a pessoa vê quem cuida do pedido; vitrine sem o selo e com o perfil desmarcado pausado; "Ajustar".
// Uso: node seed.mjs && node t-negociacao.mjs  (precisa das regras do repositório)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, garantirImagem, USUARIOS as U, BASE } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
for (const c of ["planos_pedidos", "planos_negociacoes"]) for (const d of (await db.collection(c).get()).docs) await d.ref.delete();
await db.doc(`planos/${U.bruno}`).delete().catch(() => {});
// Bruno: Freelances (principal) + Delivery.
await db.doc(`negocios/${U.bruno}_servicos`).set({ principal: "servicos", ocultoAte: null, atualizadoEm: Timestamp.now() }, { merge: true });
const DEL = `${U.bruno}_delivery`;
const base = (await db.doc(`negocios/${U.bruno}_servicos`).get()).data();
await db.doc(`negocios/${DEL}`).set({ ...base, tipo: "delivery", nome: "Lanches do Bruno", categoria: "lanches", itens: [], principal: "servicos", ocultoAte: null, criadoEm: Timestamp.now(), atualizadoEm: Timestamp.now() });

// ---------- 1) formulário ----------
const B = await navegador({ mobile: true });
const p = await entrar(B.ctx, "bruno", "negocios.html?planos=1");
await p.waitForSelector(".pl-ajuda", { timeout: 20000 });
ok((await p.textContent(".pl-ajuda")).includes("continua no ar de graça"), "convite lembra que o negócio continua no ar de graça");
await p.locator(".pl-ajuda .pl-btn", { hasText: "condição especial" }).click(); await p.waitForSelector(".pl-form");
const gr = (await p.textContent(".pl-neg-gratis")).replace(/\s+/g, " ");
ok(gr.includes("de graça") && gr.includes("1 perfil no ar") && gr.includes("3 itens"), "aviso do grátis: " + gr.slice(0, 90));
const visiveis = await p.locator(".pl-doc:visible").count();
ok(visiveis === 4 && await p.locator(".pl-doc[data-doc='depois']").count() === 0, `4 documentos mais usados à vista, sem "mando depois" (${visiveis})`);
ok((await p.textContent(".pl-fixo")).replace(/\s+/g, " ").includes("Plano Plus por R$ 15,00/mês"), "baixa renda: Plus por R$ 15,00/mês fixo");
await p.locator(".pl-prova").scrollIntoViewIfNeeded(); await p.screenshot({ path: "saida/neg-form-docs.png" });
await p.locator(".pl-mais-docs").click();
ok(await p.locator(".pl-doc:visible").count() === 9, "\"Ver outros documentos\" mostra os 9");
await p.locator(".pl-chip", { hasText: /^2$/ }).click();
await p.locator(".pl-chip", { hasText: "6 meses" }).click();
await p.locator(".pl-doc[data-doc='bolsa']").click();
await p.setInputFiles("#plNegArquivo", garantirImagem("saida/doc-bolsa.png", 900, 1200));
await p.waitForSelector(".pl-prova .ax-previa", { timeout: 10000 });
await p.fill("#plNegMsg", "Sou autônomo, a renda caiu e preciso do delivery e dos freelances no ar.");
await p.check("#plNegDecl");
await p.locator(".pl-form").screenshot({ path: "saida/neg-form.png" });
const larg = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
ok(larg[0] <= larg[1], `formulário cabe no celular (${larg[0]} ≤ ${larg[1]})`);
await p.locator(".pl-form button[type=submit]").click(); await p.waitForTimeout(2000);
let ng = (await db.doc(`planos_negociacoes/${U.bruno}`).get()).data();
ok(ng?.perfisPedidos === 2 && ng.mesesPedidos === 6 && ng.comprovanteTipo === "bolsa" && !!ng.comprovante && ng.plano === "plus" && ng.valorProposto === 15, "pedido gravado com 2 perfis e 6 meses: " + JSON.stringify({ p: ng?.perfisPedidos, m: ng?.mesesPedidos }));
ok((await p.textContent(".pl-neg")).includes("2 perfis no ar por 6 meses"), "situação do pedido mostra os perfis e o tempo");

// ---------- 2) painel: responsável e aprovar ----------
const ADM = await navegador({ mobile: true });
const a = await entrar(ADM.ctx, "admin", "admin.html#planos");
await a.waitForSelector(".ad-chip", { timeout: 30000 });
await a.locator(".ad-chip", { hasText: "Negociações" }).click();
await a.waitForSelector(".ad-neg", { timeout: 10000 });
const card = (await a.textContent(".ad-neg")).replace(/\s+/g, " ");
ok(card.includes("Precisa de 2 perfis no ar") && card.includes("Por 6 meses") && card.includes("Sem responsável"), "cartão: o que a pessoa precisa e \"Sem responsável\"");
await a.locator(".ad-neg .ad-bt", { hasText: "Assumir" }).click(); await a.waitForTimeout(1500);
ng = (await db.doc(`planos_negociacoes/${U.bruno}`).get()).data();
ok(ng.responsavel === U.admin && !!ng.responsavelNome, "Assumir grava o responsável: " + ng.responsavelNome);
await a.waitForSelector(".ad-neg"); await a.screenshot({ path: "saida/neg-painel.png" });
ok((await a.textContent(".ad-neg")).includes("Com você"), "selo \"Com você\"");
// a pessoa vê quem cuida
await p.reload(); await p.waitForSelector(".pl-ajuda .pl-btn, #planoBox", { timeout: 20000 });
await p.goto(BASE + "negocios.html?planos=1"); await p.waitForSelector(".pl-ajuda", { timeout: 20000 });
await p.locator(".pl-ajuda .pl-btn", { hasText: "Ver o meu pedido" }).click(); await p.waitForSelector(".pl-resp-neg", { timeout: 8000 });
ok((await p.textContent(".pl-resp-neg")).includes("está cuidando do seu pedido"), "a pessoa vê quem da equipe cuida do pedido: " + (await p.textContent(".pl-resp-neg")));
await p.locator(".pl-neg").screenshot({ path: "saida/neg-situacao.png" });

await a.locator(".ad-neg .ad-bt", { hasText: "Aprovar e dar o plano" }).click(); await a.waitForSelector(".ad-modal");
ok(await a.locator(".ad-modal .ad-campo", { hasText: "Vale até" }).isHidden(), "data só aparece com \"Até uma data…\"");
await a.selectOption(".ad-modal .ad-campo:has-text('Por quanto tempo') select", "data");
ok(await a.locator(".ad-modal .ad-campo", { hasText: "Vale até" }).isVisible(), "escolher \"Até uma data…\" mostra o campo da data");
await a.selectOption(".ad-modal .ad-campo:has-text('Por quanto tempo') select", "15");
await a.selectOption(".ad-modal .ad-campo:has-text('Plano') select", "plus");
await a.locator(".ad-modal .ad-multi-op", { hasText: "Delivery" }).locator("input").uncheck();
await a.selectOption(".ad-modal .ad-campo:has-text('Selo do plano') select", "esconder");
ok(await a.inputValue(".ad-modal .ad-campo:has-text('Valor combinado') input") === "90", "valor sugerido: R$ 15 × 6 meses = 90");
await a.locator(".ad-modal .ad-campo", { hasText: "Valor combinado" }).locator("input").fill("0");
await a.locator(".ad-modal").screenshot({ path: "saida/neg-aprovar.png" });
await a.locator(".ad-modal .ad-bt.pri", { hasText: "Aprovar" }).click(); await a.waitForTimeout(2500);
const pl = (await db.doc(`planos/${U.bruno}`).get()).data(); ng = (await db.doc(`planos_negociacoes/${U.bruno}`).get()).data();
const diasPl = Math.round((pl.ate.toMillis() - Date.now()) / 864e5);
ok(pl.plano === "plus" && pl.dias === 15 && diasPl === 15 && pl.semSelo === true && JSON.stringify(pl.tipos) === JSON.stringify(["servicos", "lojinha", "imoveis", "saude"]), "plano: Plus por 15 dias, sem selo, Delivery fora: " + JSON.stringify({ dias: pl.dias, tipos: pl.tipos, semSelo: pl.semSelo }));
ok(ng.status === "aprovado" && ng.dias === 15 && ng.semSelo === true && ng.responsavel === U.admin, "negociação aprovada com os mesmos dados e o responsável");

// ---------- 3) vitrine ----------
const C = await navegador({ mobile: true });
const c = await entrar(C.ctx, "ana", "servicos.html");
await c.waitForSelector("#vtGrade .vt-conta", { timeout: 20000 }); await c.waitForTimeout(2500);
const nomeBruno = c.locator("#vtGrade strong.nm", { hasText: "Bruno Reparos" }).first();
ok(await nomeBruno.count() === 1 && await nomeBruno.locator(".selo-pro").count() === 0, "Freelances do Bruno no ar e sem o selo PLUS no cartão (escondido)");
await c.goto(BASE + `servicos.html?negocio=${U.bruno}_servicos`); await c.waitForTimeout(6000); await c.screenshot({ path: "saida/neg-detalhe.png" });
ok(await c.locator(".vd-capa").count() === 1 && await c.locator(".vd-selo-pro").count() === 0, "perfil do negócio aberto e sem o selo do plano");
await c.goto(BASE + "delivery.html"); await c.waitForTimeout(4000);
ok(!(await c.textContent("body")).includes("Lanches do Bruno"), "Delivery do Bruno pausado (fora dos perfis liberados)");
await C.browser.close();
await p.goto(BASE + "negocios.html"); await p.waitForSelector("#neg-delivery", { timeout: 20000 }); await p.waitForTimeout(2000);
ok((await p.textContent("#neg-delivery")).includes("Pausado") && (await p.textContent("#neg-delivery")).includes("plano combinado"), "Meus negócios: Delivery pausado explicando o plano combinado");
await p.locator("#neg-delivery").screenshot({ path: "saida/neg-pausado.png" });

// ---------- 4) ajustar o plano ativo ----------
await a.locator(".ad-chip", { hasText: "Ativos" }).click(); await a.waitForTimeout(500);
const at = a.locator(".ad-item", { hasText: "selo escondido" }).first();
ok((await at.textContent()).includes("no ar: Freelances, Lojinha, Imóveis, Saúde"), "Ativos mostra os perfis no ar e o selo escondido");
await at.locator(".ad-bt", { hasText: "Ajustar" }).click(); await a.waitForSelector(".ad-modal");
await a.selectOption(".ad-modal .ad-campo:has-text('Prazo') select", "30");
await a.locator(".ad-modal .ad-multi-op", { hasText: "Delivery" }).locator("input").check();
await a.selectOption(".ad-modal .ad-campo:has-text('Selo do plano') select", "mostrar");
await a.locator(".ad-modal .ad-bt.pri", { hasText: "Salvar" }).click(); await a.waitForTimeout(2000);
const pl2 = (await db.doc(`planos/${U.bruno}`).get()).data();
const dias2 = Math.round((pl2.ate.toMillis() - Date.now()) / 864e5);
ok(dias2 === 45 && !pl2.tipos && !pl2.semSelo && pl2.negociacaoId === U.bruno, `ajustado: +1 mês (${dias2} dias), todos os perfis, selo de volta, origem mantida`);
const log = (await db.collection("admin_log").where("acao", "==", "plano_ajustar").get()).size;
ok(log >= 1, "registro: \"Ajustou plano\"");
await ADM.browser.close(); await B.browser.close();
await db.doc(`negocios/${DEL}`).delete(); await db.doc(`planos/${U.bruno}`).delete();
