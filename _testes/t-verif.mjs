// Verificação do perfil: requisitos, pedido em passos com a foto do documento, "em análise", painel
// (documento, conferências, aprovar/recusar apagando a foto), selo no perfil e "não aprovado" com motivo.
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, BASE, garantirImagem } from "./nav.mjs";
garantirImagem("saida/capa-teste.jpg");
let falhas = 0;
const ok = (c, t) => { if (!c) falhas++; console.log(c ? "  ✔" : "  ✘", t); };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const PX = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";
// O seed deixa o Bruno verificado (para anunciar); aqui ele começa sem o selo.
await db.doc(`usuarios/${U.bruno}`).set({ verificado: false }, { merge: true });
await db.doc(`perfis_publicos/${U.bruno}`).set({ verificado: false }, { merge: true });
await db.doc(`usuarios/${U.ana}`).set({ fotoPerfil: PX, bio: "Confeiteira em Florianópolis há 8 anos." }, { merge: true });
await db.doc(`perfis_publicos/${U.ana}`).set({ fotoPerfil: PX }, { merge: true });
// Edu já tem um pedido esperando (para o teste de "não aprovado")
await db.doc(`verificacoes/${U.edu}`).set({ uid: U.edu, categoria: "profissional", nomeLegal: "Carlos Pereira", conhecidoComo: "Eduardo Lima", documentoTipo: "cnh", documento: PX, links: [], motivo: "", status: "pendente", criadoEm: Timestamp.now(), atualizadoEm: Timestamp.now() });
await db.doc(`usuarios/${U.edu}`).set({ solicitacaoVerificacao: true, solicitacaoVerificacaoEm: Timestamp.now() }, { merge: true });

// Fabi: 17 anos, com tudo o mais em dia e um pedido antigo esperando (feito antes de a idade ser conferida)
const n17 = new Date(); n17.setFullYear(n17.getFullYear() - 17); n17.setMonth(n17.getMonth() - 2);
const nasc17 = n17.toISOString().slice(0, 10);
await db.doc(`usuarios/${U.fabi}`).set({ fotoPerfil: PX, bio: "Estudante e fotógrafa nas horas vagas.", dataNascimento: nasc17 }, { merge: true });
await db.doc(`verificacoes/${U.fabi}`).set({ uid: U.fabi, categoria: "pessoa", nomeLegal: "Fabiana Rocha", conhecidoComo: "", documentoTipo: "rg", documento: PX, links: [], motivo: "", status: "pendente", criadoEm: Timestamp.now(), atualizadoEm: Timestamp.now() });
await db.doc(`usuarios/${U.fabi}`).set({ solicitacaoVerificacao: true, solicitacaoVerificacaoEm: Timestamp.now() }, { merge: true });

const B = await navegador({ mobile: true });
// Bruno: sem foto e sem bio → requisitos faltando, sem formulário
let p = await entrar(B.ctx, "bruno", "configuracoes.html");
await p.waitForTimeout(2000);
await p.locator("#cfgVerificacao").tap(); await p.waitForSelector("#folhaVerif.aberta .vf-req", { timeout: 10000 });
ok(await p.locator(".vf-req li.falta").count() >= 1 && await p.locator(".vf-enviar").count() === 0, "requisitos faltando: aparecem marcados e o pedido não abre → " + (await p.locator(".vf-req li.falta").allTextContents()).join(", "));
await p.close();

// Fabi (17 anos): requisito da idade faltando, explicação e sem formulário (mesmo com pedido antigo, cancela antes)
await db.doc(`verificacoes/${U.fabi}`).update({ status: "cancelada" });
p = await entrar(B.ctx, "fabi", "configuracoes.html");
await p.waitForTimeout(2000);
await p.locator("#cfgVerificacao").tap(); await p.waitForSelector("#folhaVerif.aberta .vf-req", { timeout: 10000 });
const fIdade = p.locator(".vf-req li.falta", { hasText: "18 anos" });
ok(await fIdade.count() === 1 && /A partir de \d+ de/.test(await fIdade.textContent()), "menor de 18: requisito da idade faltando, com a data em que poderá pedir → " + (await fIdade.textContent().catch(() => "")));
ok(await p.locator(".vf-idade").count() === 1 && await p.locator(".vf-enviar").count() === 0, "menor de 18: explicação (por que e o que fazer contra imitações) e sem formulário");
await p.locator(".vf-idade").scrollIntoViewIfNeeded(); await p.screenshot({ path: "saida/verif-menor.png" });
await p.close();
await db.doc(`verificacoes/${U.fabi}`).update({ status: "pendente" });

// Ana: tudo certo → pedido em passos
p = await entrar(B.ctx, "ana", "configuracoes.html");
await p.waitForTimeout(2000);
await p.locator("#cfgVerificacao").tap(); await p.waitForSelector("#folhaVerif.aberta .vf-tipos", { timeout: 10000 });
ok(await p.locator(".vf-req li.falta").count() === 0 && await p.locator(".vf-req li").count() === 7, "requisitos: 7 conferidos, todos ok");
ok(await p.locator(".vf-beneficios li").count() >= 4, "o que o selo traz (benefícios)");
await p.screenshot({ path: "saida/verif-inicio.png" });
ok(await p.locator(".vf-enviar").isDisabled(), "Enviar só libera com tudo preenchido");
await p.locator(".vf-tipo", { hasText: "Profissional" }).tap();
await p.locator(".vf input").first().fill("Ana Paula Souza");
await p.locator(".vf-doc input[type=file]").setInputFiles("saida/capa-teste.jpg"); await p.waitForSelector(".vf-doc-area.com-foto img", { timeout: 8000 });
await p.locator(".vf-links input").first().fill("instagram.com/anadoces");
await p.locator(".vf textarea").fill("Já encontrei perfis falsos usando as fotos dos meus bolos.");
await p.locator(".vf-decl input").check();
ok(!(await p.locator(".vf-enviar").isDisabled()), "com tudo preenchido, Enviar libera");
await p.locator(".vf-doc-area").scrollIntoViewIfNeeded(); await p.screenshot({ path: "saida/verif-form.png" });
await p.locator(".vf-enviar").tap();
await p.waitForSelector(".vf-hero.espera", { timeout: 10000 }).catch(() => {});
const ped = (await db.doc(`verificacoes/${U.ana}`).get()).data();
ok(ped && ped.status === "pendente" && ped.categoria === "profissional" && ped.documento?.startsWith("data:image/jpeg") && ped.links[0] === "https://instagram.com/anadoces", "pedido gravado (tipo, documento, link com https)");
ok((await db.doc(`usuarios/${U.ana}`).get()).data().solicitacaoVerificacao === true, "conta marcada como pedido em análise");
ok((await p.locator(".vf-hero.espera").textContent()).includes("Pedido em análise") && (await p.locator(".vf-proto").textContent()).startsWith("Protocolo #V"), "tela de em análise com protocolo e etapas");
await p.screenshot({ path: "saida/verif-analise.png" });
await p.close();

// Painel: aprovar a Ana, não aprovar o Edu
const D = await navegador({ mobile: false });
const pa = await entrar(D.ctx, "admin", "admin.html");
await pa.waitForSelector(".ad-kpis", { timeout: 30000 }); await pa.waitForTimeout(1500);
await pa.locator('.ad-nav[data-secao="verificacoes"]').click(); await pa.waitForTimeout(800);
const cAna = pa.locator(".ad-vf", { hasText: "Ana Paula Souza" });
ok(await cAna.locator(".ad-vf-doc img").count() === 1 && await cAna.locator(".ad-vf-conf.ok", { hasText: "Nome no documento" }).count() === 1, "painel: foto do documento e nome que confere com o perfil");
const cEdu = pa.locator(".ad-vf", { hasText: "Carlos Pereira" });
ok(await cEdu.locator(".ad-vf-conf.nao", { hasText: "Nome no documento" }).count() === 1, "painel: nome do documento que não confere aparece em vermelho");
await pa.screenshot({ path: "saida/verif-painel.png", fullPage: true });
const cFabi = pa.locator(".ad-vf", { hasText: "Fabiana Rocha" });
ok(await cFabi.locator(".ad-vf-alerta").count() === 1 && await cFabi.locator(".ad-vf-conf.nao", { hasText: "menor de idade" }).count() === 1, "painel: pedido de menor de 18 com alerta e a idade em vermelho");
ok(await cFabi.locator(".ad-bt", { hasText: "Aprovar" }).isDisabled(), "painel: Aprovar travado para menor de 18");
await cFabi.screenshot({ path: "saida/verif-painel-menor.png" });
await cFabi.locator(".ad-bt", { hasText: "Recusar" }).click(); await pa.waitForTimeout(300);
ok(await pa.locator(".ad-modal select").inputValue() === "idade", "recusar menor: motivo \"idade\" já vem escolhido");
await pa.locator(".ad-modal button[type=submit]").click(); await pa.waitForTimeout(2000);
const avFabi = (await db.collection("avisos").where("uid", "==", U.fabi).get()).docs.map((d) => d.data().texto).join(" ");
ok(avFabi.includes("maiores de 18") && !avFabi.includes("30 dias"), "aviso para a menor: explica a idade, sem \"pedir em 30 dias\"");
await cAna.locator(".ad-bt", { hasText: "Aprovar" }).click(); await pa.waitForTimeout(400);
if (await pa.locator(".hf-confirma .sim").count()) await pa.locator(".hf-confirma .sim").click();
await pa.waitForTimeout(2000);
const vAna = (await db.doc(`verificacoes/${U.ana}`).get()).data();
ok((await db.doc(`usuarios/${U.ana}`).get()).data().verificado === true && vAna.status === "aprovada" && !("documento" in vAna), "aprovar: selo na conta, pedido aprovado e a foto do documento apagada");
await pa.locator('.ad-nav[data-secao="verificacoes"]').click(); await pa.waitForTimeout(600);
await pa.locator(".ad-vf", { hasText: "Carlos Pereira" }).locator(".ad-bt", { hasText: "Recusar" }).click(); await pa.waitForTimeout(300);
await pa.locator(".ad-modal select").selectOption("nome");
await pa.locator(".ad-modal button[type=submit]").click(); await pa.waitForTimeout(2000);
const vEdu = (await db.doc(`verificacoes/${U.edu}`).get()).data();
ok(vEdu.status === "recusada" && vEdu.motivoRecusa.includes("não confere") && !("documento" in vEdu), "não aprovar: motivo gravado e a foto do documento apagada");
const avEdu = (await db.collection("avisos").where("uid", "==", U.edu).get()).docs.map((d) => d.data().texto).join(" ");
ok(avEdu.includes("não confere") && avEdu.includes("30 dias"), "a pessoa recebe o aviso com o motivo");
await pa.locator(".ad-chip", { hasText: /^Aprovadas/ }).click(); await pa.waitForTimeout(300);
ok(await pa.locator(".ad-item", { hasText: "Ana" }).locator(".ad-bt", { hasText: "Tirar o selo" }).count() === 1, "aba Aprovadas: histórico com Tirar o selo");
// Ficha: o dono dá o selo direto (com motivo, fica no registro); menor de 18 não; a moderação não tem o botão
const ficha = (uid) => pa.evaluate(async (u) => { const t = await (await fetch("admin.js")).text(); const v = t.match(/admin-base\.js\?v=\d+/)[0]; (await import("./" + v)).abrirFicha(u); }, uid);
await ficha(U.hele); await pa.waitForSelector(".ad-gaveta", { timeout: 8000 });
await pa.locator(".ad-gaveta .ad-bt", { hasText: "Dar selo direto" }).click(); await pa.waitForSelector(".ad-modal", { timeout: 5000 });
await pa.locator(".ad-modal select").selectOption("parceiro");
await pa.locator(".ad-modal textarea").fill("Contrato de parceria assinado em 10/10/2026.");
await pa.screenshot({ path: "saida/verif-direto.png" });
await pa.locator(".ad-modal button[type=submit]").click(); await pa.waitForTimeout(2500);
ok((await db.doc(`usuarios/${U.hele}`).get()).data().verificado === true && (await db.doc(`perfis_publicos/${U.hele}`).get()).data().verificado === true, "dono: selo direto na conta e no perfil público");
const logH = (await db.collection("admin_log").where("alvo", "==", U.hele).get()).docs.map((d) => d.data()).find((x) => x.acao === "verificar");
ok(logH && logH.detalhe.includes("Selo direto (dono)") && logH.detalhe.includes("Contrato"), "registro: selo direto com o motivo → " + (logH?.detalhe || ""));
await pa.locator(".ad-gaveta-fundo").click({ position: { x: 5, y: 5 } }).catch(() => {}); await pa.keyboard.press("Escape"); await pa.waitForTimeout(400);
await ficha(U.fabi); await pa.waitForSelector(".ad-gaveta", { timeout: 8000 });
await pa.locator(".ad-gaveta .ad-bt", { hasText: "Dar selo direto" }).click(); await pa.waitForTimeout(600);
ok(await pa.locator(".hf-confirma", { hasText: "maiores de 18" }).count() === 1 && await pa.locator(".ad-modal").count() === 0, "dono: menor de 18 não recebe o selo direto");
await D.browser.close();

// Moderação (papel moderacao): sem "Dar selo" na ficha; pedido sem documento não aprova
await db.doc(`admins/${U.gui}`).set({ nome: "Gui", papel: "moderacao" });
await db.doc(`usuarios/${U.gui}`).set({ cidade: "Florianópolis", uf: "SC", cidadeIbge: 4205407 }, { merge: true });
await db.doc(`perfis_publicos/${U.gui}`).set({ cidade: "Florianópolis", uf: "SC", cidadeIbge: 4205407 }, { merge: true });
await db.doc(`usuarios/${U.dani}`).set({ solicitacaoVerificacao: true, solicitacaoVerificacaoEm: Timestamp.now(), verificacaoPedido: { categoria: "pessoa", nomeLegal: "Daniela Alves", semDocumento: true, status: "pendente" } }, { merge: true });
const M = await navegador({ mobile: false });
const pm = await entrar(M.ctx, "gui", "admin.html");
await pm.waitForSelector(".ad-kpis", { timeout: 30000 }); await pm.waitForTimeout(1500);
await pm.locator('.ad-nav[data-secao="verificacoes"]').click(); await pm.waitForTimeout(800);
const cDani = pm.locator(".ad-vf", { hasText: "Daniela Alves" });
ok(await cDani.locator(".ad-bt", { hasText: "Aprovar" }).isDisabled() && await cDani.locator(".ad-vf-nota").count() === 1, "moderação: pedido sem documento não aprova (só o dono)");
await cDani.locator(".ad-bt", { hasText: "Ver ficha" }).click(); await pm.waitForSelector(".ad-gaveta .ad-bt", { timeout: 10000 });
ok(await pm.locator(".ad-gaveta .ad-bt", { hasText: /Dar selo/ }).count() === 0 && await pm.locator(".ad-gaveta .ad-bt", { hasText: "Ver pedido de verificação" }).count() === 1, "moderação: na ficha não tem \"Dar selo\", só \"Ver pedido de verificação\"");
await M.browser.close();

// Ana: selo no perfil e explicação ao tocar; Edu: "não aprovado" com motivo
p = await entrar(B.ctx, "ana", "usuarios.html");
await p.waitForSelector('.pf2 [data-el="selo"]:not([hidden])', { timeout: 20000 }).catch(() => {});
await p.locator('.pf2 [data-el="selo"]').first().tap(); await p.waitForSelector("#folhaSelo.aberta", { timeout: 5000 }).catch(() => {});
ok((await p.locator("#folhaSelo .vf-explica").textContent().catch(() => "")).includes("é verificado"), "tocar no selo explica o que ele quer dizer");
await p.screenshot({ path: "saida/verif-selo.png" });
await p.goto(BASE + "configuracoes.html"); await p.waitForTimeout(2000);
await p.locator("#cfgVerificacao").tap(); await p.waitForSelector("#folhaVerif.aberta .vf-hero.ok", { timeout: 10000 }).catch(() => {});
ok((await p.locator(".vf-hero.ok h3").textContent().catch(() => "")) === "Seu perfil é verificado", "Configurações: \"Seu perfil é verificado\"");
await p.close();
p = await entrar(B.ctx, "edu", "configuracoes.html");
await p.waitForTimeout(2000);
await p.locator("#cfgVerificacao").tap(); await p.waitForSelector("#folhaVerif.aberta .vf-hero.nao", { timeout: 10000 }).catch(() => {});
ok((await p.locator(".vf-motivo").textContent().catch(() => "")).includes("não confere") && (await p.locator(".vf-hero.nao").textContent()).includes("pedir de novo"), "não aprovado: motivo e quando pode pedir de novo");
await p.screenshot({ path: "saida/verif-recusada.png" });
await B.browser.close();
console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
