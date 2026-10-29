// Suporte refeito: atalhos, novo chamado em cartões, conversa com etapas, reportar atendimento (moderação),
// nota do atendimento, denunciar pela busca; painel: KPIs, reportar a pessoa e a lista de reportes;
// e o cartão da publicação enviada no chat.
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, BASE } from "./nav.mjs";
let falhas = 0;
const ok = (c, t) => { if (!c) falhas++; console.log(c ? "  ✔" : "  ✘", t); };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const PX = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";

// ---------- 1) Usuário ----------
const B = await navegador({ mobile: true });
const p = await entrar(B.ctx, "fabi", "suporte.html");
const nativos = []; p.on("dialog", (d) => { nativos.push(d.message()); d.dismiss().catch(() => {}); });
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector("#supLista:not([hidden])", { timeout: 20000 }); await p.waitForTimeout(800);
ok(await p.locator(".sup-atalho").count() === 4, "início: 4 atalhos (Novo chamado, Central de ajuda, Denunciar, Contestar)");
await p.screenshot({ path: "saida/sup-inicio.png" });
await p.locator("#btnNovo").tap(); await p.waitForTimeout(400);
ok(await p.locator("#supCats .sup-cat").count() === 8, "novo chamado: 8 assuntos em cartões");
await p.locator("#supCats .sup-cat", { hasText: "Golpe" }).tap();
ok((await p.locator('#supCats .sup-cat[aria-checked="true"]').textContent()).includes("Golpe") && (await p.locator("#supDica").textContent()).includes("Não pague nada adiantado"), "escolher Golpe marca o cartão e mostra a dica");
await p.screenshot({ path: "saida/sup-novo.png" });
await p.locator("#supAssunto").fill("Cobrança adiantada no chat");
await p.locator("#supTexto").fill("Um perfil pediu Pix adiantado para fazer a limpeza.");
await p.locator("#supEnviar").tap(); await p.waitForTimeout(2000);
const ch = (await db.collection("suporte").where("uid", "==", U.fabi).get()).docs.find((d) => d.data().assunto === "Cobrança adiantada no chat");
ok(!!ch && ch.data().categoria === "golpe", "chamado gravado com a categoria escolhida");
const proto = "#" + ch.id.replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase();
ok((await p.locator(".sup-item", { hasText: "Cobrança adiantada" }).textContent()).includes(proto), "lista mostra o protocolo " + proto);
// Equipe responde e a pessoa abre a conversa
await db.collection(`suporte/${ch.id}/mensagens`).doc("r1").set({ autorId: U.admin, equipe: true, texto: "Olá! Não pague nada adiantado. Vamos analisar o perfil.", em: Timestamp.now() });
await ch.ref.update({ status: "respondido", ultimaDe: "equipe", atendidoPor: U.admin, atualizadoEm: Timestamp.now() });
await p.reload(); await p.waitForSelector("#supLista:not([hidden])"); await p.waitForTimeout(800);
ok((await p.locator(".sup-item", { hasText: "Cobrança adiantada" }).textContent()).includes("Nova resposta"), "resposta da equipe: selo Nova resposta");
await p.locator(".sup-item", { hasText: "Cobrança adiantada" }).tap();
await p.waitForSelector("#folhaChamado.aberta .sup-msg.equipe", { timeout: 10000 });
ok(await p.locator("#chEtapas li.feito").count() === 3, "etapas: Recebido → Em atendimento → Respondido");
ok((await p.locator(".sup-msg.equipe b").first().textContent()).includes("Suporte Help Floripa"), "resposta aparece como Suporte Help Floripa");
await p.screenshot({ path: "saida/sup-conversa.png" });
await p.locator("#chTexto").fill("Obrigada! Era o perfil @golpista.");
await p.locator("#chEnviar").tap(); await p.waitForTimeout(1800);
ok(await p.locator(".sup-msg.meu", { hasText: "@golpista" }).count() === 1, "resposta da pessoa no balão dela");
// Reportar o atendimento
await p.locator("#chMais").tap(); await p.waitForTimeout(300);
await p.locator("#opcoesCorpo button", { hasText: "Reportar este atendimento" }).tap(); await p.waitForTimeout(300);
await p.locator("#repMotivos .sup-motivo", { hasText: "grosseria" }).tap();
await p.locator("#repDetalhe").fill("Achei a resposta seca.");
await p.locator("#repEnviar").tap(); await p.waitForTimeout(1500);
const r = await db.doc(`reportes/atendimento_${ch.id}_${U.fabi}`).get();
ok(r.exists && r.data().motivo === "grosseria" && r.data().alvoId === U.admin, "reporte gravado para a moderação (com quem atendeu)");
// Encerrar e dar nota
await p.locator("#chMais").tap(); await p.waitForTimeout(300);
await p.locator("#opcoesCorpo button", { hasText: "Encerrar chamado" }).tap(); await p.waitForTimeout(1800);
ok(await p.locator("#chFechadoBox").isVisible() && await p.locator("#chResponder").isHidden(), "encerrado: some o campo e aparece Reabrir");
await p.waitForSelector(".sup-nota .sup-estrelas button", { timeout: 8000 }).catch(() => {});
await p.locator(".sup-estrelas button").nth(3).tap();
await p.locator(".sup-nota textarea").fill("Ajudou bastante.");
await p.screenshot({ path: "saida/sup-nota.png" });
await p.locator(".sup-nota .btn.pri").tap(); await p.waitForTimeout(1500);
const nt = await db.doc(`suporte_notas/${ch.id}`).get();
ok(nt.exists && nt.data().nota === 4, "nota 4 gravada");
ok((await p.locator(".sup-nota.feita").textContent()).includes("★★★★☆"), "depois de avaliar: mostra a nota dada");
await p.locator("#folhaChamado [data-fechar]").tap(); await p.waitForTimeout(400);
// Denunciar pela busca
await p.locator("#btnDenunciar").tap(); await p.waitForTimeout(300);
await p.locator("#denBusca").fill("bruno"); await p.waitForTimeout(1500);
await p.locator("#denLista .linha", { hasText: "Bruno" }).first().locator("button", { hasText: "Denunciar" }).tap();
await p.waitForSelector(".hf-den", { timeout: 6000 }).catch(() => {});
ok(await p.locator(".hf-den").count() === 1, "Denunciar: busca a pessoa e abre a denúncia do perfil");
await p.screenshot({ path: "saida/sup-denunciar.png" });
ok(!nativos.length && !erros.length, "sem janela do navegador nem erro " + [...nativos, ...erros].join(" | "));
await B.browser.close();

// ---------- 2) Painel ----------
const D = await navegador({ mobile: false });
const pa = await entrar(D.ctx, "admin", "admin.html#suporte");
const errosP = []; pa.on("pageerror", (e) => errosP.push(e.message));
await pa.waitForSelector(".ad-kpis", { timeout: 30000 }); await pa.waitForTimeout(1500);
ok((await pa.locator(".ad-kpis").first().textContent()).includes("Nota do atendimento") && !(await pa.locator(".ad-kpis").first().textContent()).includes("NaN"), "Suporte no painel: KPIs com a nota do atendimento → " + (await pa.locator(".ad-kpis").first().textContent()).replace(/\s+/g, " "));
await pa.locator(".ad-chip", { hasText: "Todos" }).click(); await pa.waitForTimeout(300);
const itemCh = pa.locator(".ad-item", { hasText: "Cobrança adiantada" });
ok((await itemCh.textContent()).includes(proto) && (await itemCh.textContent()).includes("4/5"), "chamado com protocolo e a nota dada");
await itemCh.locator("strong").click(); await pa.waitForSelector(".ad-modal .ad-chat .ad-msg", { timeout: 10000 });
await pa.screenshot({ path: "saida/sup-painel-chamado.png" });
await pa.locator(".ad-modal .ad-bt", { hasText: "Reportar à moderação" }).click(); await pa.waitForTimeout(400);
await pa.locator(".ad-modal").last().locator("textarea").fill("Insistiu em ofender.");
await pa.locator(".ad-modal").last().locator("button[type=submit]").click(); await pa.waitForTimeout(1500);
const ru = await db.doc(`reportes/usuario_${ch.id}_${U.admin}`).get();
ok(ru.exists && ru.data().alvoId === U.fabi, "equipe reportou a pessoa do chamado");
await pa.goto(BASE + "admin.html"); await pa.waitForSelector(".ad-kpis", { timeout: 30000 }); await pa.waitForTimeout(1500);
await pa.locator('.ad-nav[data-secao="denuncias"]').click(); await pa.waitForTimeout(800);
await pa.locator(".ad-bt", { hasText: "Reportes do suporte" }).first().click(); await pa.waitForTimeout(800);
const reps = await pa.locator(".ad-item").allTextContents();
ok(reps.some((x) => x.includes("Atendimento reportado") && x.includes("Grosseria")) && reps.some((x) => x.includes("Pessoa reportada pela equipe")), "Reportes do suporte: os dois reportes na lista da moderação");
ok(!(await pa.locator(".ad-kpis").first().textContent()).includes("NaN"), "Reportes: nota média sem NaN");
await pa.screenshot({ path: "saida/sup-reportes.png" });
await pa.locator(".ad-item", { hasText: "Atendimento reportado" }).locator(".ad-bt", { hasText: "Resolver" }).click(); await pa.waitForTimeout(300);
await pa.locator(".ad-modal textarea").fill("Conversamos com a equipe.");
await pa.locator(".ad-modal button[type=submit]").click(); await pa.waitForTimeout(1500);
ok((await db.doc(`reportes/atendimento_${ch.id}_${U.fabi}`).get()).data().status === "resolvido", "moderação resolve o reporte");
ok(!errosP.length, "painel sem erro " + errosP.join(" | "));
await D.browser.close();

// ---------- 3) Cartão de publicação no chat ----------
await db.doc("diario/pcFoto").set({ autorId: U.ana, nome: "Ana Souza", texto: "Bolo de pote saindo agora! #doces", tags: ["doces"], mediaUrl: PX, mediaTipo: "image", midias: [PX, PX, PX], criadoEm: Timestamp.fromMillis(Date.now() - 3 * 3600e3) });
await db.doc("diario/pcTexto").set({ autorId: U.ana, nome: "Ana Souza", texto: "Alguém indica um bom eletricista no Centro?", criadoEm: Timestamp.now() });
await db.doc("diario_notas/pcFoto").set({ total: 3, soma: 14, n5: 2, n4: 1, n3: 0, n2: 0, n1: 0 });
for (const [i, id] of [[1, "pcFoto"], [2, "pcTexto"], [3, "pcSumiu"]]) {
  await db.collection(`conversas/${U.conv}/mensagens`).doc("pc" + i).set({ remetenteId: i === 2 ? U.ana : U.bruno, texto: "", tipoArquivo: "cartao", cartao: { tipo: "publicacao", titulo: "Publicação de Ana Souza", sub: "Publicação de Ana Souza", link: `usuarios.html?post=${id}` }, criadoEm: Timestamp.fromMillis(Date.now() + i * 1000) });
}
const M = await navegador({ mobile: true });
const pm = await entrar(M.ctx, "ana", `mensagens.html?conversa=${U.conv}`);
await pm.waitForSelector(".pub-msg .pc-cab", { timeout: 20000 }); await pm.waitForTimeout(2500);
const card = pm.locator(".pub-msg", { has: pm.locator('a[href="feed.html?post=pcFoto"]') });
ok((await card.locator(".pc-quem strong").textContent()).includes("Ana Souza") && (await card.locator(".pc-selo").textContent()).includes("Diário"), "cartão: autor e selo Diário");
ok((await card.locator(".pc-n").textContent()) === "1/3" && await card.locator(".pc-pontos i").count() === 3, "carrossel: 1/3 e bolinhas");
ok((await card.locator(".pc-info").textContent()).includes("4,7") && (await card.locator(".pc-leg b").textContent()).includes("Ana"), "estrelas (4,7 · 3 notas) e legenda com o nome em negrito");
const bg = await card.evaluate((e) => getComputedStyle(e).backgroundColor);
const bgMeu = await pm.locator(".minha .bolha:not(.cartao-msg)").first().evaluate((e) => getComputedStyle(e).backgroundColor).catch(() => "");
ok(bg !== bgMeu, "o cartão não pega a cor do balão (" + bg + ")");
ok(await pm.locator(".pub-msg .pc-midia.so-texto .pc-citacao p", { hasText: "eletricista" }).count() === 1, "publicação só de texto: cartão com aspas");
ok(await pm.locator(".pub-msg .pc.sumiu").count() === 1, "publicação apagada: \"Publicação indisponível\"");
await card.scrollIntoViewIfNeeded(); await pm.screenshot({ path: "saida/pub-cartao.png" });
await pm.locator(".pub-msg .so-texto").first().scrollIntoViewIfNeeded(); await pm.screenshot({ path: "saida/pub-cartao-texto.png" });
await M.browser.close();
console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
