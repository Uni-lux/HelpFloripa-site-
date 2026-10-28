// Condição especial aprovada COM valor: o documento anexado acompanha o tipo escolhido (trocar o tipo tira o arquivo),
// a aprovação com valor fica "esperando o pagamento" (sem plano), a pessoa vê "Condição aprovada" e paga o valor combinado
// pelo Pix, o painel confirma e o plano liga com o que foi combinado; receita conta uma vez; pedido com valor fora da
// tabela mostra alerta no painel.
// Uso: node seed.mjs && node t-cobranca.mjs  (precisa das regras do repositório)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, garantirImagem, USUARIOS as U, BASE } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
for (const c of ["planos_pedidos", "planos_negociacoes"]) for (const d of (await db.collection(c).get()).docs) await d.ref.delete();
await db.doc(`planos/${U.bruno}`).delete().catch(() => {});

// ---------- 1) formulário: documento e arquivo andam juntos ----------
const B = await navegador({ mobile: true });
const p = await entrar(B.ctx, "bruno", "negocios.html?planos=1");
await p.waitForSelector(".pl-ajuda", { timeout: 20000 });
await p.locator(".pl-ajuda .pl-tipo", { hasText: "Baixa renda" }).click(); await p.waitForSelector(".pl-form");
await p.locator(".pl-pn[data-p='pro']").click();
await p.locator(".pl-per-neg .pl-per[data-m='3']").click();
await p.locator(".pl-doc[data-doc='bpc']").click();
await p.setInputFiles("#plNegArquivo", garantirImagem("saida/doc-bpc.png", 900, 1200));
await p.waitForSelector(".pl-prova .ax-previa", { timeout: 10000 });
// trocar o tipo com arquivo anexado pergunta; "Cancelar" mantém tudo
await p.locator(".pl-mais-docs").click();
await p.locator(".pl-doc[data-doc='isento']").click();
await p.waitForSelector(".hf-confirma", { timeout: 5000 });
ok((await p.textContent(".hf-confirma")).includes("BPC/LOAS"), "trocar o documento com arquivo anexado pergunta antes (cita o documento do arquivo)");
await p.screenshot({ path: "saida/cob-trocar-doc.png" });
await p.locator(".hf-confirma .nao").click(); await p.waitForTimeout(400);
ok(await p.locator(".pl-doc.on[data-doc='bpc']").count() === 1 && await p.locator(".pl-prova .ax-previa").count() === 1, "\"Cancelar\" mantém o BPC/LOAS e o arquivo");
// confirmar a troca tira o arquivo
await p.locator(".pl-doc[data-doc='isento']").click(); await p.waitForSelector(".hf-confirma");
await p.locator(".hf-confirma .sim").click(); await p.waitForTimeout(400);
ok(await p.locator(".pl-doc.on[data-doc='isento']").count() === 1 && await p.locator(".pl-prova .ax-previa").count() === 0 && await p.locator(".pl-anexar").isVisible(), "trocar tira o arquivo e pede o novo documento");
await p.fill("#plNegMsg", "Sou autônomo, a renda caiu e preciso dos freelances no ar com o plano.");
await p.check("#plNegDecl");
await p.locator(".pl-form button[type=submit]").click(); await p.waitForTimeout(800);
ok(!(await db.doc(`planos_negociacoes/${U.bruno}`).get()).exists, "sem o arquivo do novo documento o pedido não é enviado");
await p.setInputFiles("#plNegArquivo", garantirImagem("saida/doc-isento.png", 900, 1200));
await p.waitForSelector(".pl-prova .ax-previa", { timeout: 10000 });
await p.locator(".pl-form button[type=submit]").click(); await p.waitForTimeout(2000);
let ng = (await db.doc(`planos_negociacoes/${U.bruno}`).get()).data();
ok(ng?.comprovanteTipo === "isento" && !!ng.comprovante, "pedido gravado com o documento certo (isento) e o arquivo dele");

// ---------- 2) painel: aprovar com valor = esperando o pagamento ----------
const ADM = await navegador({ mobile: true });
const a = await entrar(ADM.ctx, "admin", "admin.html#planos");
await a.waitForSelector(".ad-chip", { timeout: 30000 });
await a.locator(".ad-chip", { hasText: "Negociações" }).click();
await a.waitForSelector(".ad-neg", { timeout: 10000 });
await a.locator(".ad-neg .ad-bt", { hasText: "Aprovar e dar o plano" }).click(); await a.waitForSelector(".ad-modal");
ok((await a.textContent(".ad-modal")).includes("o plano só liga quando você confirmar o pagamento"), "janela de aprovar explica que o plano espera o pagamento");
await a.selectOption(".ad-modal .ad-campo:has-text('Por quanto tempo') select", "90");
ok(await a.inputValue(".ad-modal .ad-campo:has-text('Valor combinado') input") === "59,85", "valor sugerido 59,85");
await a.locator(".ad-modal .ad-bt.pri", { hasText: "Aprovar" }).click(); await a.waitForTimeout(2500);
ng = (await db.doc(`planos_negociacoes/${U.bruno}`).get()).data();
ok(ng.status === "aguardando_pagamento" && ng.valorAcordado === 59.85 && ng.dias === 90 && !ng.comprovante, "negociação esperando o pagamento (59,85, 90 dias, documento apagado)");
ok(!(await db.doc(`planos/${U.bruno}`).get()).exists, "o plano NÃO liga antes do pagamento");
const av = (await db.collection("avisos").where("uid", "==", U.bruno).get()).docs.map((d) => d.data()).find((x) => /pague/i.test(x.titulo));
ok(!!av && av.texto.includes("Meus negócios") && av.titulo.includes("59,85"), "aviso diz quanto pagar e onde: " + av?.titulo);
await a.waitForSelector(".ad-neg");
ok((await a.textContent(".ad-neg")).includes("esperando o pagamento") && await a.locator(".ad-neg .ad-bt", { hasText: "Cancelar a cobrança" }).count() === 1, "painel: \"esperando o pagamento\" + Cancelar a cobrança");

// ---------- 3) a pessoa paga ----------
await p.goto(BASE + "negocios.html"); await p.waitForSelector("#planoBox:not([hidden])", { timeout: 20000 }); await p.waitForTimeout(1500);
const box = (await p.textContent("#planoBox")).replace(/\s+/g, " ");
ok(box.includes("Condição aprovada") && box.includes("59,85"), "Meus negócios: " + box.slice(0, 80));
await p.locator("#planoBox").click(); await p.waitForSelector(".pl-neg", { timeout: 10000 });
const pagar = p.locator(".pl-btn", { hasText: "Pagar R$" });
ok((await p.textContent(".pl-neg")).includes("tempo começa a contar") && await pagar.count() === 1, "gaveta abre na condição aprovada com o botão Pagar");
await p.locator(".pl-caixa").screenshot({ path: "saida/cob-pagar.png" });
await pagar.click(); await p.waitForSelector(".pl-pix", { timeout: 10000 }); await p.waitForTimeout(800);
const pix = (await p.textContent(".pl-pix")).replace(/\s+/g, " ");
const cod = await p.textContent(".pl-codigo").catch(() => "");
ok(pix.includes("59,85") && pix.includes("Condição especial") && !pix.includes("dias grátis") && cod.includes("540559.85"), "tela do Pix com o valor combinado (59,85 no código), sem bônus de 30 dias");
await p.screenshot({ path: "saida/cob-pix.png" });
const peds = (await db.collection("planos_pedidos").where("uid", "==", U.bruno).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
ok(peds.length === 1 && peds[0].negociacaoId === U.bruno && peds[0].valor === 59.85 && peds[0].meses === 3, "pedido de pagamento ligado à negociação");

// ---------- 4) painel confirma ----------
await a.goto(BASE + "admin.html#planos"); await a.reload(); await a.waitForSelector(".ad-chip", { timeout: 30000 }); await a.waitForTimeout(1500);
const it = a.locator(".ad-item", { hasText: "aprovada" }).first();
ok((await it.textContent()).includes("59,85") && (await it.locator(".ad-vf-alerta").count()) === 0, "Esperando: pedido da negociação aprovada, sem alerta de valor");
await it.locator(".ad-bt", { hasText: "Confirmar pagamento" }).click(); await a.waitForSelector(".hf-confirma");
await a.locator(".hf-confirma .sim").click(); await a.waitForTimeout(2500);
const pl = (await db.doc(`planos/${U.bruno}`).get()).data(); ng = (await db.doc(`planos_negociacoes/${U.bruno}`).get()).data();
const diasPl = Math.round((pl.ate.toMillis() - Date.now()) / 864e5);
ok(pl.plano === "pro" && pl.dias === 90 && diasPl === 90 && pl.negociacaoId === U.bruno && pl.pedidoId === peds[0].id, `plano Pro ligado por 90 dias a partir do pagamento (${diasPl})`);
ok(ng.status === "aprovado" && ng.pedidoId === peds[0].id, "negociação aprovada e paga (com o pedido)");
await a.locator(".ad-chip", { hasText: "Receita" }).click(); await a.waitForTimeout(600);
const rec = (await a.textContent(".ad-receita")).replace(/\s+/g, " ");
ok(rec.includes("59,85") && !rec.includes("119,70"), "receita conta o pagamento uma vez só");

// ---------- 5) pedido com valor fora da tabela: alerta ----------
await db.collection("planos_pedidos").add({ uid: U.ana, nome: "Ana", email: "ana@t.com", plano: "premium", meses: 12, valor: 1, txid: "HFTESTE1", status: "pendente", criadoEm: Timestamp.now() });
await a.goto(BASE + "admin.html#planos"); await a.reload(); await a.waitForSelector(".ad-chip", { timeout: 30000 }); await a.waitForTimeout(1500);
const errado = a.locator(".ad-item", { hasText: "Premium" }).first();
ok((await errado.locator(".ad-vf-alerta").textContent().catch(() => "")).includes("diferente da tabela"), "pedido de R$ 1 no Premium anual mostra o alerta");
await errado.screenshot({ path: "saida/cob-alerta.png" });
await ADM.browser.close(); await B.browser.close();
for (const d of (await db.collection("planos_pedidos").get()).docs) await d.ref.delete();
await db.doc(`planos/${U.bruno}`).delete(); await db.doc(`planos_negociacoes/${U.bruno}`).delete();
