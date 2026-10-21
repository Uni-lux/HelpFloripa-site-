// Saúde e Comunidade: criar o perfil de Saúde (profissão, registro, especialidades, convênios, valor), a vitrine
// saude.html (cartão, filtros, detalhe com registro + "Conferir no CRP" + aviso de emergência), o pedido de agendamento
// como cartão no chat; a Comunidade: aviso de proibido vender, anúncio recusado com "vendo", doação e quarto
// compartilhado publicados, "Quero receber" abrindo a conversa, denúncia de venda, painel banindo do programa e a
// pessoa banida sem conseguir anunciar. Meus negócios com o lugar da Comunidade. Uso: node t-saude-comunidade.mjs
// (precisa das regras do repositório: tipo saude, comunidade e programa_banidos)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore } from "firebase-admin/firestore";
import { navegador, entrar, garantirImagem, USUARIOS as U, BASE } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const db = getFirestore(initializeApp({ projectId: "demo-hf" }));
for (const c of ["comunidade", "programa_banidos"]) for (const d of (await db.collection(c).get()).docs) await d.ref.delete();
for (const d of (await db.collection("avisos").where("uid", "==", U.ana).get()).docs) await d.ref.delete();
await db.doc(`negocios/${U.bruno}_saude`).delete().catch(() => {});
await db.doc(`planos/${U.bruno}`).delete().catch(() => {});

// ---------- 1) Bruno cria o perfil de Saúde ----------
const BR = await navegador({ mobile: true });
const b = await entrar(BR.ctx, "bruno", "negocios.html?tipo=saude");
await b.waitForSelector("#folhaNegocio.aberta #negX_profissao", { timeout: 20000 });
ok(await b.locator("#folhaNegocio .ng-tipo.saude").count() === 1, "Meus negócios: tipo Saúde no formulário");
await b.fill("#negNome", "Bruno Lima · Psicólogo");
await b.selectOption("#negX_profissao", "psicologo"); await b.waitForTimeout(300);
await b.fill("#negX_registro", "12/34567");
await b.locator("#negExtras .marca-op", { hasText: "Ansiedade e depressão" }).click();
await b.locator("#negExtras .marca-op", { hasText: "Terapia cognitivo-comportamental" }).click();
await b.fill("#negX_espOutra", "Adolescentes"); await b.locator(".neg-esp-outra .btn").click();
await b.locator("#negExtras .marca-op", { hasText: "No consultório" }).click();
await b.locator("#negExtras .marca-op", { hasText: "Online (teleconsulta)" }).click();
await b.fill("#negX_valorConsulta", "180"); await b.fill("#negX_duracao", "50");
await b.locator("#negExtras .marca-op", { hasText: "Unimed" }).click();
await b.fill("#negDesc", "Atendo adolescentes e adultos com ansiedade, depressão e questões de relacionamento, online e no consultório.");
await b.locator("#negExtras .neg-registro").scrollIntoViewIfNeeded(); await b.screenshot({ path: "saida/sc-form-saude.png" });
await b.click("#negSalvar"); await b.waitForTimeout(3500);
const ns = (await db.doc(`negocios/${U.bruno}_saude`).get()).data();
ok(ns?.tipo === "saude" && ns.categoria === "psicologo" && ns.saude?.registro === "12/34567" && ns.saude.registroUf === "SC" && ns.saude.especialidades.includes("Adolescentes") && ns.saude.modalidades.length === 2 && ns.saude.valorConsulta === 180 && ns.saude.convenios[0] === "Unimed",
  "perfil de Saúde gravado: " + JSON.stringify({ cat: ns?.categoria, reg: ns?.saude?.registro, esp: ns?.saude?.especialidades, mod: ns?.saude?.modalidades, valor: ns?.saude?.valorConsulta }));
await b.goto(BASE + "negocios.html"); await b.waitForSelector(".neg-card.saude", { timeout: 20000 }); await b.waitForTimeout(800);
ok((await b.textContent(".neg-card.saude")).includes("CRP"), "cartão em Meus negócios mostra a profissão e o CRP");
ok(await b.locator(".ng-slot.saude.feito").count() === 1 && await b.locator(".ng-slot.comunidade").count() === 1, "topo: lugar da Saúde aceso e o da Comunidade");
await b.screenshot({ path: "saida/sc-meus-negocios.png", fullPage: true });

// ---------- 2) Ana vê na vitrine e pede um agendamento ----------
const AN = await navegador({ mobile: true });
const a = await entrar(AN.ctx, "ana", "saude.html");
await a.waitForSelector(".vt-saude", { timeout: 20000 }); await a.waitForTimeout(800);
await a.evaluate(() => document.querySelector(".hfman-x")?.click());
ok((await a.textContent(".vt-saude")).includes("CRP-SC 12/34567") && (await a.textContent(".vt-saude")).includes("180"), "cartão da vitrine: registro e valor da consulta");
ok(await a.locator(".aviso-saude").count() === 1 && await a.locator(".classe-link.saude[aria-current=page]").count() === 1, "página com aviso de emergência e a classe Saúde marcada");
await a.screenshot({ path: "saida/sc-vitrine-saude.png" });
await a.locator(".chip[data-filter=psicologo]").click(); await a.waitForTimeout(400);
ok(await a.locator("#vtGrade .vt-saude").count() >= 1, "filtro Psicólogos mostra o perfil");
await a.locator("#vtGrade .vt-saude").first().click(); await a.waitForSelector(".vd-saude", { timeout: 10000 });
const det = await a.textContent(".vd-saude");
ok(det.includes("CRP-SC 12/34567") && det.includes("Conferir no CRP") && det.includes("192"), "detalhe: registro, link para conferir e aviso de emergência");
await a.screenshot({ path: "saida/sc-detalhe-saude.png" });
await a.locator(".vt-modal .vt-btn", { hasText: "Agendar consulta" }).first().click(); await a.waitForSelector(".vd-pedido .vd-cab h3", { timeout: 10000 });
await a.locator(".vd-pedido .vd-chip", { hasText: "Online (teleconsulta)" }).click();
await a.locator(".vd-pedido .vd-chip", { hasText: "Unimed" }).click();
await a.locator(".vd-pedido .vd-chip", { hasText: "Primeiro horário livre" }).click();
await a.fill(".vd-pedido textarea.vd-obs", "Primeira consulta.");
await a.screenshot({ path: "saida/sc-agendar.png" });
await a.locator(".vd-pedido .vt-btn", { hasText: "Enviar pedido de agendamento" }).click(); await a.waitForTimeout(3000);
const conv = [U.ana, U.bruno].sort().join("_");
ok((await db.doc(`conversas/${conv}`).get()).data()?.contexto?.tipo === "saude", "conversa aberta com o assunto Saúde");
const fr = a.frames().find((f) => f.url().includes("mensagens.html"));
if (fr) {
  await fr.waitForSelector("#btnEnviar", { timeout: 20000 }); await a.waitForTimeout(1000);
  await fr.click("#btnEnviar"); await a.waitForTimeout(2500);
  const m = (await db.collection(`conversas/${conv}/mensagens`).orderBy("criadoEm", "desc").limit(1).get()).docs[0]?.data();
  ok(m?.cartao?.solicitacao?.saude?.convenio === "Unimed" && m.cartao.solicitacao.saude.atendimento.includes("Online"), "pedido de agendamento gravado no chat (convênio e online)");
  const card = fr.locator(".cartao-msg").last();
  ok((await card.textContent()).includes("Pedido de agendamento") && (await card.textContent()).includes("Primeiro horário livre"), "cartão do chat: Pedido de agendamento");
  await card.screenshot({ path: "saida/sc-cartao-agendamento.png" });
} else ok(false, "a conversa abriu na gaveta");

// ---------- 3) Comunidade: anunciar (sem venda) ----------
const c = await entrar(AN.ctx, "ana", "comunidade.html");
await c.waitForSelector("#cmGrade", { timeout: 20000 }); await c.waitForTimeout(1500);
await c.evaluate(() => document.querySelector(".hfman-x")?.click());
ok((await c.textContent(".cm-proibido")).includes("proibido vender ou cobrar"), "aviso: proibido vender ou cobrar e banimento");
await c.screenshot({ path: "saida/sc-comunidade.png" });
await c.locator(".cm-atalho.doacao").click(); await c.waitForSelector(".cm-form", { timeout: 10000 });
await c.locator(".cm-campo", { hasText: "Título" }).locator("input").fill("Vendo berço de madeira");
await c.locator(".cm-campo", { hasText: "O que é" }).locator("select").selectOption("bebe");
await c.locator(".cm-campo", { hasText: "Descrição" }).locator("textarea").fill("Berço em bom estado, com colchão.");
await c.setInputFiles("#cmArquivo", garantirImagem("saida/berco.png", 900, 700)); await c.waitForTimeout(1200);
await c.check("#cmAceite");
await c.locator(".cm-form .cm-btn.pri").click(); await c.waitForTimeout(800);
ok((await c.textContent(".cm-toast")).includes("não pode vender"), "\"Vendo\" no título é barrado com explicação");
await c.locator(".cm-campo", { hasText: "Título" }).locator("input").fill("Berço de madeira com colchão");
await c.locator(".cm-form").screenshot({ path: "saida/sc-form-doacao.png" });
await c.locator(".cm-form .cm-btn.pri").click(); await c.waitForTimeout(2500);
let docs = (await db.collection("comunidade").where("donoId", "==", U.ana).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const doa = docs.find((x) => x.categoria === "doacao");
ok(doa?.titulo === "Berço de madeira com colchão" && doa.fotos.length === 1 && doa.aceiteRegras === true && doa.tipoItem === "bebe" && doa.status === "disponivel", "doação publicada com foto");
// Quarto compartilhado
await c.locator(".cm-atalho.quarto").click(); await c.waitForSelector(".cm-form", { timeout: 10000 });
await c.locator(".cm-campo", { hasText: "Título" }).locator("input").fill("Vaga em quarto no Pantanal, perto da UFSC");
await c.locator(".cm-campo", { hasText: "Divisão das despesas" }).locator("input").fill("650");
await c.locator(".cm-campo", { hasText: "Para" }).locator("select").selectOption("mulheres");
await c.locator(".cm-campo", { hasText: "Descrição" }).locator("textarea").fill("Apartamento com mais duas estudantes. Divisão do aluguel e das contas.");
await c.check("#cmAceite");
await c.locator(".cm-form .cm-btn.pri").click(); await c.waitForTimeout(2500);
docs = (await db.collection("comunidade").where("donoId", "==", U.ana).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const qua = docs.find((x) => x.categoria === "quarto");
ok(qua?.quarto?.rateio === 650 && qua.quarto.para === "mulheres", "quarto compartilhado com a divisão das despesas");
ok(await c.locator(".cm-card").count() >= 2, "anúncios aparecem na lista");
await c.screenshot({ path: "saida/sc-comunidade-lista.png" });
await AN.browser.close();

// ---------- 4) Bruno: quero receber + denúncia de venda ----------
const bc = await entrar(BR.ctx, "bruno", `comunidade.html?item=${doa.id}`);
await bc.waitForSelector(".cm-caixa .cm-acoes", { timeout: 20000 }); await bc.waitForTimeout(600);
ok((await bc.textContent(".cm-caixa")).includes("Para trocar com segurança"), "detalhe com as dicas de segurança");
await bc.screenshot({ path: "saida/sc-comunidade-detalhe.png" });
await bc.locator(".cm-caixa .cm-denunciar").click(); await bc.waitForSelector(".hf-den", { timeout: 10000 });
ok((await bc.locator(".hf-den .op").first().textContent()).includes("vendendo ou cobrando"), "denúncia: primeiro motivo é venda ou cobrança");
await bc.locator(".hf-den .op").first().click(); await bc.locator(".hf-den .env").click(); await bc.waitForTimeout(2000);
const den = (await db.doc(`denuncias/comunidade_${doa.id}_${U.bruno}`).get()).data();
ok(den?.motivo === "venda" && den.alvoId === U.ana, "denúncia de venda gravada");
await bc.goto(BASE + `comunidade.html?item=${doa.id}`); await bc.waitForSelector(".cm-caixa .cm-btn.pri", { timeout: 20000 });
await bc.locator(".cm-caixa .cm-btn.pri").click(); await bc.waitForTimeout(3000);
ok((await db.doc(`conversas/${conv}`).get()).data()?.contexto?.tipo === "comunidade", "\"Quero receber\" abre a conversa (assunto Comunidade)");
await BR.browser.close();

// ---------- 5) Painel: resolver a denúncia banindo da Comunidade ----------
const ADM = await navegador({ mobile: false });
const p = await entrar(ADM.ctx, "admin", "admin.html#denuncias");
await p.waitForSelector(".ad-item", { timeout: 30000 }); await p.waitForTimeout(1200);
const item = p.locator(".ad-item", { hasText: "Comunidade" }).first();
ok(await item.count() === 1, "denúncia da Comunidade no painel");
await item.locator(".ad-bt", { hasText: "Ver" }).first().click(); await p.waitForSelector(".ad-den-corpo .ad-den-ficha, .ad-den-corpo strong", { timeout: 10000 }); await p.waitForTimeout(800);
ok((await p.textContent(".ad-den-corpo")).includes("Berço de madeira"), "painel mostra o anúncio denunciado");
await p.screenshot({ path: "saida/sc-painel-denuncia.png" });
await p.keyboard.press("Escape"); await p.waitForTimeout(300);
await item.locator(".ad-bt", { hasText: "Resolver" }).click(); await p.waitForSelector(".ad-modal select", { timeout: 5000 });
ok(await p.locator(".ad-modal select").first().inputValue() === "programa", "ação sugerida: esconder e banir do programa");
await p.locator(".ad-modal .ad-bt.pri").click(); await p.waitForSelector(".ad-modal textarea", { timeout: 5000 });
await p.locator(".ad-modal .ad-bt.perigo, .ad-modal .ad-bt.cheio").last().click(); await p.waitForTimeout(3000);
const ban = (await db.doc(`programa_banidos/${U.ana}_comunidade`).get()).data();
ok(ban?.tipo === "comunidade" && ban.motivo.includes("Venda"), "Ana banida da Comunidade");
const esc = (await db.doc(`comunidade/${doa.id}`).get()).data();
ok(esc?.ocultoPelaEquipe === true, "anúncios dela escondidos pela equipe");
await ADM.browser.close();

// ---------- 6) Ana banida ----------
const AN2 = await navegador({ mobile: true });
const c2 = await entrar(AN2.ctx, "ana", "comunidade.html");
await c2.waitForSelector(".hfav-fundo", { timeout: 20000 });
ok((await c2.textContent(".hfav-fundo")).includes("Comunidade"), "aviso grave do banimento ao entrar");
await c2.screenshot({ path: "saida/sc-aviso-ban.png" });
while (await c2.locator(".hfav-acoes button").count()) { await c2.locator(".hfav-acoes button").last().click(); await c2.waitForTimeout(400); }
await c2.waitForSelector("#cmBanido:not([hidden])", { timeout: 20000 });
ok((await c2.textContent("#cmBanido")).includes("banido"), "aviso de banimento na Comunidade");
await c2.locator(".cm-atalho.doacao").click(); await c2.waitForTimeout(600);
ok(await c2.locator(".cm-form").count() === 0 && (await c2.textContent(".cm-caixa")).includes("não pode anunciar"), "banida não abre o formulário");
await c2.screenshot({ path: "saida/sc-banida.png" });
await AN2.browser.close();
process.exit(process.exitCode || 0);
