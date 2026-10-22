// Suporte em nível nacional. (1) Quem pede ajuda: prioridade e prazo antes de enviar (golpe = urgente 2 h,
// pagamento = alta 8 h), respostas da Central de Ajuda pelo que escreve ("Resolveu" fecha sem abrir chamado),
// chamado gravado com a prioridade, previsão na conversa e limite de 3 em andamento.
// (2) Painel: KPIs da fila, filas por setor, "Pegar o próximo" (atrasado primeiro, nunca o de outra pessoa),
// nota interna, transferir, escalar, 1ª resposta gravada e resposta pronta da equipe.
// Uso: node t-suporte-nacional.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
let falhas = 0;
const ok = (c, t) => { if (!c) falhas++; console.log(c ? "  ✔" : "  ✘", t); };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const H = (h) => Timestamp.fromMillis(Date.now() - h * 3600e3);

// Limpa os chamados da fabi e do edu (de testes anteriores) e as respostas prontas.
for (const uid of [U.fabi, U.edu]) for (const d of (await db.collection("suporte").where("uid", "==", uid).get()).docs) await d.ref.delete();
for (const d of (await db.collection("suporte_respostas").get()).docs) await d.ref.delete();
// Os chamados abertos de outros testes saem da fila durante este teste e voltam no fim.
const outrosAbertos = (await db.collection("suporte").where("status", "==", "aberto").get()).docs;
for (const d of outrosAbertos) await d.ref.update({ status: "fechado" });

// ---------- 1) Quem pede ajuda ----------
const B = await navegador({ mobile: true });
const p = await entrar(B.ctx, "fabi", "suporte.html");
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
const nativos = []; p.on("dialog", (d) => { nativos.push(d.message()); d.dismiss().catch(() => {}); });
await p.waitForSelector("#supLista:not([hidden])", { timeout: 20000 }); await p.waitForTimeout(800);
await p.locator("#btnNovo").tap(); await p.waitForTimeout(400);
await p.locator("#supCats .sup-cat", { hasText: "Pagamento" }).tap(); await p.waitForTimeout(200);
let prev = await p.locator("#supPrevisao").innerText();
ok(/alta/i.test(prev) && prev.includes("8 h"), "pagamento: prioridade alta, resposta em até 8 h → " + prev.replace(/\s+/g, " "));
await p.locator("#supCats .sup-cat", { hasText: "Golpe" }).tap(); await p.waitForTimeout(200);
prev = await p.locator("#supPrevisao").innerText();
ok(/urgente/i.test(prev) && prev.includes("2 h"), "golpe: prioridade urgente, resposta em até 2 h");
// Central de Ajuda antes de abrir
await p.locator("#supCats .sup-cat", { hasText: "Conta" }).first().tap();
await p.locator("#supAssunto").fill("Esqueci minha senha");
await p.locator("#supTexto").fill("Não lembro a senha e não consigo trocar.");
await p.waitForSelector("#supSugestoes:not([hidden]) details", { timeout: 8000 }).catch(() => {});
const sug = await p.locator("#supSugestoes summary").allTextContents();
ok(sug.some((x) => /senha/i.test(x)), "sugestões da Central pelo que a pessoa escreve → " + sug.join(" | "));
await p.screenshot({ path: "saida/supn-sugestoes.png" });
await p.locator("#supSugestoes summary").first().tap(); await p.waitForTimeout(200);
await p.locator("#supSugestoes .sup-resolveu").first().tap(); await p.waitForTimeout(600);
const resolvidos = await p.evaluate(() => localStorage.getItem("hf-sup-resolvidos"));
const semChamado = (await db.collection("suporte").where("uid", "==", U.fabi).get()).size === 0;
ok(resolvidos === "1" && semChamado && !(await p.locator("#folhaNovo.aberta").count()), "\"Resolveu\": fecha sem abrir chamado (contado no aparelho)");
// Chamado de golpe
await p.locator("#btnNovo").tap(); await p.waitForTimeout(400);
await p.locator("#supCats .sup-cat", { hasText: "Golpe" }).tap();
await p.locator("#supAssunto").fill("Pediram Pix adiantado");
await p.locator("#supTexto").fill("Um perfil pediu Pix antes do serviço e sumiu.");
await p.locator("#supEnviar").tap(); await p.waitForTimeout(2000);
const g = (await db.collection("suporte").where("uid", "==", U.fabi).get()).docs[0];
ok(g?.data().prioridade === "urgente" && g?.data().categoria === "golpe", "chamado gravado com prioridade urgente");
await p.locator(".sup-item", { hasText: "Pediram Pix" }).tap();
await p.waitForSelector("#folhaChamado.aberta", { timeout: 8000 });
ok((await p.locator("#chMeta").innerText()).includes("Resposta em até 2 h"), "conversa mostra a previsão: " + (await p.locator("#chMeta").innerText()));
await p.locator("#folhaChamado [data-fechar]").tap(); await p.waitForTimeout(300);
// Limite de 3 em andamento
for (const a of ["Dúvida A", "Dúvida B"]) await db.collection("suporte").add({ uid: U.fabi, nome: "Fabi", assunto: a, categoria: "outro", status: "aberto", prioridade: "normal", criadoEm: H(1), atualizadoEm: H(1), ultimaDe: "usuario" });
await p.reload(); await p.waitForSelector("#supLista:not([hidden])"); await p.waitForTimeout(800);
await p.locator("#btnNovo").tap(); await p.waitForTimeout(400);
await p.locator("#supAssunto").fill("Quarta dúvida"); await p.locator("#supTexto").fill("Mais uma pergunta sobre o site.");
await p.locator("#supEnviar").tap(); await p.waitForTimeout(1500);
ok((await db.collection("suporte").where("uid", "==", U.fabi).get()).size === 3, "4º chamado em andamento é barrado (máximo 3)");
ok(!erros.length && !nativos.length, "sem erro nem janela do navegador " + [...erros, ...nativos].join(" | "));
await B.browser.close();

// ---------- 2) Painel ----------
const atrasado = await db.collection("suporte").add({ uid: U.edu, nome: "Eduardo Lima", assunto: "Não recebi o reembolso", categoria: "outro", status: "aberto", prioridade: "normal", criadoEm: H(30), atualizadoEm: H(30), ultimaDe: "usuario" });
const doDani = await db.collection("suporte").add({ uid: U.edu, nome: "Eduardo Lima", assunto: "Já com o Daniel", categoria: "golpe", status: "aberto", prioridade: "urgente", criadoEm: H(40), atualizadoEm: H(40), ultimaDe: "usuario", responsavel: U.dani, responsavelNome: "Daniel Moderação" });
const D = await navegador({ mobile: false });
const pa = await entrar(D.ctx, "admin", "admin.html#suporte");
const errosP = []; pa.on("pageerror", (e) => errosP.push(e.message));
await pa.waitForSelector(".ad-sup-proximo", { timeout: 30000 }); await pa.waitForTimeout(1200);
const kpi = (await pa.locator(".ad-kpis").first().innerText()).replace(/\s+/g, " ");
ok(/Na fila/.test(kpi) && /Prazo estourado/.test(kpi) && /Urgentes/.test(kpi) && !/NaN/.test(kpi), "KPIs da fila → " + kpi);
const filas = await pa.locator(".ad-sup-filas .ad-chip").allTextContents();
ok(filas.length === 7 && filas.some((x) => /Segurança \(\d+\)/.test(x)), "filas por setor: " + filas.join(" · "));
const item = pa.locator(".ad-item", { hasText: "Não recebi o reembolso" });
ok(/atrasado há/.test(await item.innerText()), "chamado de 30 h: selo \"atrasado há ...\"");
await pa.screenshot({ path: "saida/supn-painel.png", fullPage: true });
await pa.locator(".ad-sup-proximo button").click();
await pa.waitForSelector(".ad-modal .ad-sup-notas", { timeout: 10000 });
ok((await pa.locator(".ad-modal h3").first().innerText()).includes("Não recebi o reembolso"), "Pegar o próximo: abre o atrasado (antes do urgente novo)");
ok((await atrasado.get()).data().responsavel === U.admin && (await doDani.get()).data().responsavel === U.dani, "chamado travado para quem pegou; o do Daniel continua com ele");
// Nota interna
await pa.locator(".ad-sup-notas summary").click();
await pa.locator(".ad-sup-notas textarea").fill("Pedi o comprovante do pagamento.");
await pa.locator(".ad-sup-notas button", { hasText: "Salvar nota" }).click(); await pa.waitForTimeout(1200);
const notas = await atrasado.collection("notas").get();
ok(notas.size === 1 && notas.docs[0].data().texto.includes("comprovante") && (await pa.locator(".ad-sup-nota").count()) === 1, "nota interna gravada e listada");
// Resposta → 1ª resposta gravada; resposta pronta
await pa.locator(".ad-modal textarea[placeholder^='Escreva a resposta']").fill("Olá! Já pedimos o reembolso ao negócio, responda com o comprovante.");
await pa.locator(".ad-modal .ad-bt", { hasText: "Salvar como resposta pronta" }).click(); await pa.waitForTimeout(300);
await pa.locator(".ad-modal").last().locator("input").fill("Reembolso pedido");
await pa.locator(".ad-modal").last().locator("button[type=submit]").click(); await pa.waitForTimeout(1200);
const prontas = await db.collection("suporte_respostas").get();
ok(prontas.size === 1 && prontas.docs[0].data().titulo === "Reembolso pedido", "resposta pronta salva para a equipe");
await pa.locator(".ad-modal .ad-bt.pri", { hasText: /^Responder$/ }).click(); await pa.waitForTimeout(1500);
const depois = (await atrasado.get()).data();
ok(depois.status === "respondido" && !!depois.primeiraRespostaEm, "responder grava a hora da 1ª resposta");
// Transferir e escalar o chamado do Daniel
await pa.locator(".ad-chip", { hasText: "Todos" }).last().click(); await pa.waitForTimeout(300);
await pa.locator(".ad-item", { hasText: "Já com o Daniel" }).locator("strong").first().click();
await pa.locator(".hf-confirma-fundo button", { hasText: "Continuar" }).click({ timeout: 5000 }); // "Daniel assumiu este item"
await pa.waitForSelector(".ad-modal .ad-sup-fila-acoes", { timeout: 10000 });
const prontaNoSelect = await pa.locator(".ad-modal select.ad-sel-mini optgroup[label='Da equipe'] option").allTextContents();
ok(prontaNoSelect.includes("Reembolso pedido"), "resposta pronta aparece no chamado seguinte (Da equipe)");
await pa.locator(".ad-sup-fila-acoes .ad-bt", { hasText: "Transferir" }).click(); await pa.waitForTimeout(300);
await pa.locator(".ad-modal").last().locator("select").first().selectOption("pagamento");
await pa.locator(".ad-modal").last().locator("select").nth(1).selectOption("alta");
await pa.locator(".ad-modal").last().locator("button[type=submit]").click(); await pa.waitForTimeout(1500);
let dd = (await doDani.get()).data();
ok(dd.categoria === "pagamento" && dd.prioridade === "alta", "transferido para Pagamentos com prioridade alta");
await pa.locator(".ad-item", { hasText: "Já com o Daniel" }).locator("strong").first().click();
await pa.locator(".hf-confirma-fundo button", { hasText: "Continuar" }).click({ timeout: 5000 }); // "Daniel assumiu este item"
await pa.waitForSelector(".ad-modal .ad-sup-fila-acoes", { timeout: 10000 });
await pa.locator(".ad-sup-fila-acoes .ad-bt", { hasText: "Escalar" }).click(); await pa.waitForTimeout(300);
await pa.locator(".ad-modal").last().locator("select").selectOption("donos");
await pa.locator(".ad-modal").last().locator("button[type=submit]").click(); await pa.waitForTimeout(1500);
dd = (await doDani.get()).data();
ok(dd.escalonadoPara === "donos", "escalado para os donos");
await pa.locator(".ad-chip", { hasText: "Escalados para mim" }).click(); await pa.waitForTimeout(300);
ok(await pa.locator(".ad-item", { hasText: "Já com o Daniel" }).count() === 1, "aparece em \"Escalados para mim\" (dono)");
const log = (await db.collection("admin_log").where("por", "==", U.admin).get()).docs.map((d) => d.data().acao);
ok(log.includes("suporte_pegar") && log.includes("suporte_fila"), "registro de ações: pegou e transferiu/escalou");
ok(!errosP.length, "painel sem erro " + errosP.join(" | "));
await pa.setViewportSize({ width: 390, height: 844 }); await pa.waitForTimeout(400);
await pa.screenshot({ path: "saida/supn-painel-celular.png" });
await D.browser.close();
// Deixa a fabi e o edu sem chamados (outros testes abrem chamados com eles).
for (const uid of [U.fabi, U.edu]) for (const d of (await db.collection("suporte").where("uid", "==", uid).get()).docs) await d.ref.delete();
for (const d of outrosAbertos) await d.ref.update({ status: "aberto" }).catch(() => {});
console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
