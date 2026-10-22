// Comunicado no início e aviso da equipe com o visual novo, registro de ações legível,
// "voltar" dentro de Ajuda e suporte nas Mensagens e as opções da rosinha do duo.
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, BASE } from "./nav.mjs";
let falhas = 0;
const ok = (c, t) => { if (!c) falhas++; console.log(c ? "  ✔" : "  ✘", t); };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
await db.collection("comunicados").doc("cmTeste").set({ titulo: "Nova área de Explorar", texto: "Agora dá para buscar negócios, hashtags e publicações num lugar só.", tipo: "novidade", ativo: true, link: "feed.html?aba=explorar", por: U.admin, em: Timestamp.now() });
await db.collection("avisos").doc("avTeste").set({ uid: U.ana, titulo: "Sua publicação foi escondida", texto: "Ela descumpriu os Termos de Uso. Se achar que foi um engano, responda ao suporte.", tipo: "alerta", por: U.admin, em: Timestamp.now(), lidoEm: null });
await db.collection("avisos").doc("avTeste2").set({ uid: U.ana, titulo: "Último aviso", texto: "Na próxima vez a conta pode ser suspensa.", tipo: "grave", por: U.admin, em: Timestamp.now(), lidoEm: null });
const ch = db.collection("suporte").doc("chReg");
await ch.set({ uid: U.ana, nome: "Ana Souza", assunto: "Não consigo editar o cardápio", categoria: "negocio", status: "aberto", criadoEm: Timestamp.now(), atualizadoEm: Timestamp.now(), ultimaDe: "usuario" });
await db.collection("admin_log").add({ acao: "assumiu", alvo: "suporte:chReg", detalhe: "Chamado: Não consigo editar o cardápio", por: U.admin, porNome: "Carla Equipe", em: Timestamp.now() });
await db.collection("admin_log").add({ acao: "exportar", alvo: "usuarios", detalhe: "", por: U.admin, porNome: "Carla Equipe", em: Timestamp.now() });
// formato antigo: resposta de chamado (alvo = pessoa, detalhe = assunto) e denúncia com o ID comprido no detalhe
await db.collection("admin_log").add({ acao: "suporte_resposta", alvo: U.ana, detalhe: "Não consigo editar o cardápio", por: U.admin, porNome: "Carla Equipe", em: Timestamp.fromMillis(Date.now() - 1000) });
const idDen = `mensagem_BKzhGblc9TR1WEuW2z2k_${U.ana}`;
await db.doc(`denuncias/${idDen}`).set({ tipo: "mensagem", alvoId: U.bruno, itemId: "BKzhGblc9TR1WEuW2z2k", conversaId: U.conv, autorId: U.ana, motivo: "golpe", trecho: "Me manda o Pix adiantado", status: "resolvida", criadoEm: Timestamp.now() });
await db.collection("admin_log").add({ acao: "denuncia_resolvida", alvo: U.bruno, detalhe: `${idDen} · aviso`, por: U.admin, porNome: "Carla Equipe", em: Timestamp.fromMillis(Date.now() - 2000) });
// duo da Ana com o Bruno
const par = [U.ana, U.bruno].sort().join("_");
await db.doc(`vinculos/${par}`).set({ participantes: [U.ana, U.bruno], de: U.ana, para: U.bruno, tipoDe: "duo", tipoPara: "duo", status: "aceito", criadoEm: Timestamp.now() });

const B = await navegador({ mobile: true });
const p = await entrar(B.ctx, "ana", "index.html");
await p.waitForSelector(".hfav", { timeout: 20000 }).catch(() => {});
ok((await p.locator(".hfav h3").textContent().catch(() => "")).includes("escondida") && (await p.locator(".hfav-tag").textContent()) === "Alerta", "aviso de alerta abre na janela nova (tipo e título)");
ok(await p.locator(".hfav-pontos i").count() === 2 && (await p.locator(".hfav-acoes button").textContent()).includes("1 de 2"), "dois avisos: bolinhas e \"Entendi (1 de 2)\"");
await p.screenshot({ path: "saida/aviso-janela.png" });
await p.locator(".hfav-acoes button").tap(); await p.waitForTimeout(300);
ok((await p.locator(".hfav-tag").textContent()) === "Aviso importante", "segundo aviso: grave → Aviso importante");
await p.locator(".hfav-acoes button").tap(); await p.waitForTimeout(1200);
ok((await db.doc("avisos/avTeste").get()).data().lidoEm && (await db.doc("avisos/avTeste2").get()).data().lidoEm, "os dois marcados como lidos");
await p.waitForSelector(".hfcom", { timeout: 15000 }).catch(() => {});
const com = p.locator(".hfcom").first();
ok((await com.locator("strong").textContent()) === "Nova área de Explorar" && (await com.locator(".hfcom-tag").textContent()) === "Novidade" && await com.locator(".hfcom-cta").count() === 1, "comunicado no início: tipo, título e Saiba mais");
await com.screenshot({ path: "saida/comunicado.png" });
await com.locator(".hfcom-x").tap(); await p.waitForTimeout(500);
await p.reload(); await p.waitForTimeout(3500);
ok(await p.locator(".hfcom", { hasText: "Nova área de Explorar" }).count() === 0, "fechado não volta");

// Voltar dentro de Ajuda e suporte (nas Mensagens)
await p.goto(BASE + "mensagens.html"); await p.waitForFunction(() => document.getElementById("carregandoApp")?.hidden, null, { timeout: 20000 }).catch(() => {});
await p.waitForTimeout(1200);
await p.locator("#btnSuporte").tap(); await p.waitForTimeout(2500);
const f = p.frameLocator("#quadroSuporte");
await f.locator("#btnNovo").tap(); await f.locator("#folhaNovo.aberta").waitFor({ timeout: 8000 });
await p.evaluate(() => history.back()); await p.waitForTimeout(700);
ok(await f.locator("#folhaNovo.aberta").count() === 0 && await p.locator("#painelSuporte.aberto").count() === 1, "suporte nas Mensagens: voltar fecha o Novo chamado e continua no suporte");
await f.locator("#lnkAjuda").tap(); await p.waitForTimeout(2500);
const urlQuadro = () => p.evaluate(() => document.getElementById("quadroSuporte").contentWindow.location.pathname.split("/").pop());
ok((await urlQuadro()) === "ajuda.html" && await p.locator("#painelSuporte.aberto").count() === 1 && await f.locator(".volta-suporte").isVisible(), "Central de ajuda abre dentro do suporte (com Voltar ao suporte)");
await p.screenshot({ path: "saida/ajuda-embutida.png" });
await p.evaluate(() => history.back()); await p.waitForTimeout(1500);
ok((await urlQuadro()) === "suporte.html" && await p.locator("#painelSuporte.aberto").count() === 1, "voltar da Central de ajuda volta para o suporte (não para as Mensagens)");

// Reserva: se o "voltar" chega direto nas Mensagens (o celular pula o passo de dentro), fecha só a janela do suporte.
await f.locator("#btnDenunciar").tap(); await f.locator("#folhaDenunciar.aberta").waitFor({ timeout: 8000 });
await p.evaluate(() => window.dispatchEvent(new PopStateEvent("popstate", { state: {} })));
await p.waitForTimeout(600);
ok(await f.locator("#folhaDenunciar.aberta").count() === 0 && await p.locator("#painelSuporte.aberto").count() === 1, "voltar que chega nas Mensagens fecha só o Denunciar (o suporte continua aberto)");
await f.locator("#btnContestar").tap(); await f.locator("#folhaNovo.aberta").waitFor({ timeout: 8000 });
await p.evaluate(() => history.back()); await p.waitForTimeout(700);
ok(await f.locator("#folhaNovo.aberta").count() === 0 && await p.locator("#painelSuporte.aberto").count() === 1, "Contestar decisão: voltar fecha e continua no suporte");

// Rosinha do duo
await p.goto(BASE + "configuracoes.html"); await p.waitForTimeout(2500);
ok(await p.locator("#cfgDuoCapa button").count() === 4, "rosinha: 4 opções (Foto e nome, Só a foto, Só a rosinha, Ocultar)");
await p.locator("#cfgDuoCapa button[data-valor=rosa]").tap(); await p.waitForTimeout(1200);
ok((await db.doc(`usuarios/${U.ana}`).get()).data().duoCapa === "rosa" && (await db.doc(`perfis_publicos/${U.ana}`).get()).data().duoCapa === "rosa", "Só a rosinha gravado (conta e perfil público)");
await p.goto(BASE + "usuarios.html"); await p.waitForSelector(".pf-rosa", { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(800);
await p.locator(".pf-rosa").first().tap(); await p.waitForTimeout(500);
ok(await p.locator(".pf-duo-bolha.aberta").count() === 0, "Só a rosinha: tocar não mostra foto nem nome");
await p.goto(BASE + "configuracoes.html"); await p.waitForTimeout(2500);
await p.locator("#cfgDuoCapa button[data-valor=foto]").tap(); await p.waitForTimeout(1200);
await p.goto(BASE + "usuarios.html"); await p.waitForSelector(".pf-rosa", { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(800);
await p.locator(".pf-rosa").first().tap(); await p.waitForTimeout(500);
ok(await p.locator(".pf-duo-bolha.aberta.sem-nome").count() === 1 && await p.locator(".pf-duo-bolha .nm").evaluate((e) => getComputedStyle(e).display) === "none", "Só a foto: aparece a foto sem o nome");
await p.goto(BASE + "configuracoes.html"); await p.waitForTimeout(2500);
await p.locator("#cfgDuoCapa button[data-valor=clicavel]").tap(); await p.waitForTimeout(1200);
await p.goto(BASE + "usuarios.html"); await p.waitForSelector(".pf-rosa", { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(1200);
await p.locator(".pf-rosa").first().tap(); await p.waitForTimeout(500);
const fonte = await p.locator(".pf-duo-bolha .nm").evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
ok(fonte <= 10 && (await p.locator(".pf-duo-bolha .nm").textContent()).includes("Bruno"), "Foto e nome: nome menor (" + fonte + " px)");
await p.locator(".pf-avatar-wrap").first().screenshot({ path: "saida/duo-nome.png" });
await B.browser.close();

// Painel: registro legível e prévia do comunicado
const D = await navegador({ mobile: true });
const pa = await entrar(D.ctx, "admin", "admin.html");
await pa.waitForSelector(".ad-kpis", { timeout: 30000 }); await pa.waitForTimeout(1500);
await pa.evaluate(() => document.querySelector('.ad-nav[data-secao="registro"]').click()); await pa.waitForTimeout(1000);
await pa.locator(".ad-chip", { hasText: "Todas as ações" }).click(); await pa.waitForTimeout(600); // abre em "Por pessoa (dia)"
const reg = await pa.locator(".ad-registro").textContent();
ok(reg.includes("Chamado #CHREG · Não consigo editar o cardápio") && !reg.includes("suporte:chReg") && reg.includes("Lista de usuários"), "registro: \"Chamado #CHREG · assunto\" no lugar de suporte:ID");
const larg = await pa.locator(".ad-registro tr").nth(1).evaluate((e) => e.getBoundingClientRect().width);
ok(larg <= 400, "registro no celular: cada ação num cartão (" + Math.round(larg) + " px)");
await pa.screenshot({ path: "saida/registro.png" });
ok(await pa.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "registro: nada passa da largura da tela");
ok(reg.includes("Denúncia de mensagem · aviso enviado") && !reg.includes("mensagem_BKzh"), "detalhe da denúncia legível (sem o código)");
await pa.locator(".ad-registro tr", { hasText: "Respondeu chamado" }).first().click(); await pa.waitForSelector(".ad-acao-det", { timeout: 5000 });
ok((await pa.locator(".ad-acao-det").textContent()).includes("Chamado #CHREG") && await pa.locator(".ad-acao-det .ad-bt", { hasText: "Abrir o chamado" }).count() === 1, "tocar na ação abre os detalhes com o chamado (registro antigo achado pelo assunto)");
await pa.screenshot({ path: "saida/registro-detalhe.png" });
await pa.locator(".ad-acao-det .ad-bt", { hasText: "Abrir o chamado" }).click();
await pa.waitForSelector(".ad-modal .ad-chat", { timeout: 8000 }).catch(() => {});
ok((await pa.locator(".ad-modal h3").first().textContent().catch(() => "")).includes("Não consigo editar o cardápio"), "Abrir o chamado mostra a conversa do chamado");
await pa.screenshot({ path: "saida/registro-chamado.png" });
await pa.goto(BASE + "admin.html#registro"); await pa.reload(); await pa.locator(".ad-chip", { hasText: "Todas as ações" }).click({ timeout: 30000 }); await pa.waitForSelector(".ad-registro", { timeout: 30000 }); await pa.waitForTimeout(800);
await pa.locator(".ad-registro tr", { hasText: "Resolveu denúncia" }).first().click(); await pa.waitForSelector(".ad-acao-det", { timeout: 5000 });
ok((await pa.locator(".ad-acao-det").textContent()).includes("Golpe") && await pa.locator(".ad-acao-det .ad-bt", { hasText: "Ver o conteúdo denunciado" }).count() === 1, "denúncia: detalhes com motivo, trecho e Ver o conteúdo denunciado");
await pa.locator(".ad-acao-det .ad-bt", { hasText: "Fechar" }).click();
await pa.evaluate(() => document.querySelector('.ad-nav[data-secao="comunicados"]').click()); await pa.waitForTimeout(800);
ok(await pa.locator(".ad-item .hfcom").count() >= 1, "painel → Comunicados: prévia igual à do site");
await pa.screenshot({ path: "saida/comunicados-painel.png" });
await D.browser.close();
console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
