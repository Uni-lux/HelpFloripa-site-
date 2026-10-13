// Etapa 4: suporte e avisos nas notificações, conversa aberta pela equipe, denúncia com o
// conteúdo e o contexto no painel, e atendimento (horário por dia, almoço e volta).
// Uso: node t-etapa4.mjs   (roda com as regras que estiverem no emulador: pr25 ou main)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { navegador, entrar, USUARIOS as U, BASE } from "./nav.mjs";
import { readFileSync } from "node:fs";
// Mesma versão que o painel usa (senão o navegador carrega outra cópia do módulo, sem os dados).
const VBASE = "./admin-base.js?v=" + readFileSync(new URL("../admin.js", import.meta.url), "utf8").match(/admin-base\.js\?v=(\d+)/)[1];
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
initializeApp({ projectId: "demo-hf" });
const db = getFirestore();
const { browser, ctx } = await navegador({ mobile: true });
const txt = async (p, sel) => (await p.locator(sel).first().textContent().catch(() => "")).replace(/\s+/g, " ").trim();
const badge = async (p, sel) => p.evaluate((s) => { const b = document.querySelector(s); return b && !b.hidden ? b.textContent : "0"; }, sel);

// ---------- 1) Suporte respondeu + avisos da equipe ----------
const chamados = await db.collection("suporte").where("uid", "==", U.ana).get();
const aberto = chamados.docs.find((d) => d.data().status === "aberto");
await db.collection(`suporte/${aberto.id}/mensagens`).doc("r1").set({ autorId: U.admin, equipe: true, texto: "Olá, Ana! Já ajustamos a foto. Pode testar?", em: Timestamp.now() });
await aberto.ref.update({ status: "respondido", ultimaDe: "equipe", atualizadoEm: Timestamp.now() });
await db.collection("avisos").add({ uid: U.ana, titulo: "Novidade no Help Floripa", texto: "Agora dá para marcar o horário de cada dia.", tipo: "info", por: U.admin, em: Timestamp.now(), lidoEm: null });
let p = await entrar(ctx, "ana", "index.html");
await p.waitForTimeout(5000);
console.log("index: sino =", await badge(p, "#badgeAvisos"), "| atalho Mensagens =", await badge(p, "#atalhoBadgeMensagens"));
await p.goto(BASE + "notificacoes.html");
await p.waitForSelector(".notif", { timeout: 20000 });
await p.waitForTimeout(2500);
const linhasSup = await p.locator(".notif", { hasText: "Suporte Help Floripa" }).allTextContents();
console.log("notificações do suporte:", linhasSup.length, "|", linhasSup.map((t) => t.replace(/\s+/g, " ").trim().slice(0, 90)));
console.log("selo oficial:", await p.locator(".notif .hf-oficial").count(), "| barra Mensagens =", await badge(p, "#badgeMensagens"));
await p.locator(".notif", { hasText: "respondeu seu chamado" }).first().click();
await p.waitForURL(/suporte\.html\?chamado=/, { timeout: 10000 });
await p.waitForSelector("#folhaChamado.aberta", { timeout: 15000 });
await p.waitForTimeout(1500);
console.log("abriu o chamado:", await txt(p, "#tChamado"), "| equipe aparece como:", await txt(p, ".sup-msg.equipe b"));
await p.screenshot({ path: "saida/e4-suporte-chamado.png" });
const lido = (await db.doc(`usuarios/${U.ana}`).get()).data().suporteLido || {};
console.log("leitura guardada:", !!lido[aberto.id]);
await p.goto(BASE + "index.html"); await p.waitForTimeout(4000);
console.log("depois de abrir: atalho Mensagens =", await badge(p, "#atalhoBadgeMensagens"), "(fica o aviso ainda não aberto)");
await p.goto(BASE + "mensagens.html");
await p.waitForSelector("#faixaSuporte:not([hidden])", { timeout: 15000 }).catch(() => {});
console.log("faixa nas mensagens:", await txt(p, "#faixaSuporte"), "| botão suporte =", await badge(p, "#badgeSuporte"));
await p.screenshot({ path: "saida/e4-faixa-suporte.png" });
await p.goto(BASE + "notificacoes.html");
await p.waitForSelector(".notif", { timeout: 20000 }); await p.waitForTimeout(2000);
await p.locator(".notif", { hasText: "enviou um aviso" }).first().click();
await p.waitForSelector("#folhaAviso.aberta", { timeout: 15000 });
console.log("aviso aberto:", await txt(p, "#avTitulo"), "|", await txt(p, "#avTexto"));
await p.waitForTimeout(1500);
const av = await db.collection("avisos").where("uid", "==", U.ana).get();
console.log("aviso marcado como lido:", av.docs.every((d) => d.data().lidoEm));
await p.screenshot({ path: "saida/e4-aviso.png" });
await p.close();

// ---------- 2) Equipe abre conversa de suporte com o Bruno (pela ficha) ----------
p = await entrar(ctx, "admin", "admin.html");
await p.waitForTimeout(5000);
await p.evaluate(([v, uid]) => import(v).then((m) => m.abrirFicha(uid)), [VBASE, U.bruno]);
await p.locator(".ad-gaveta .ad-bt", { hasText: "Abrir conversa de suporte" }).click();
await p.locator(".ad-modal input").first().fill("Sobre o seu perfil de negócio");
await p.locator(".ad-modal textarea").first().fill("Olá, Bruno! Vimos que seu horário está desatualizado. Pode conferir?");
await p.locator(".ad-modal button[type=submit]").click();
await p.waitForTimeout(3000);
console.log("toast:", await txt(p, ".ad-toast, .toast"));
const supB = (await db.collection("suporte").where("uid", "==", U.bruno).get()).docs.map((d) => d.data());
const avB = (await db.collection("avisos").where("uid", "==", U.bruno).get()).docs.map((d) => d.data());
console.log("bruno: chamados abertos pela equipe =", supB.filter((c) => c.abertoPor).length, "| avisos =", avB.length);

// ---------- 3) Denúncia de mensagem com o contexto ----------
const pa = await entrar(ctx, "ana", `mensagens.html?conversa=${U.conv}`);
await pa.waitForSelector(".linha-msg", { timeout: 20000 });
await pa.waitForTimeout(1500);
const alvo = pa.locator(".linha-msg", { hasText: "Qualquer coisa é só chamar" }).first();
await alvo.locator(".bolha").click({ button: "right" });
await pa.waitForTimeout(500);
await pa.locator("#menuMsg").getByText("Denunciar").click();
await pa.waitForSelector(".hf-den input[value=spam]", { timeout: 10000 });
await pa.locator(".hf-den label.op", { hasText: "Spam" }).click();
await pa.locator(".hf-den .env").click();
await pa.waitForTimeout(2500);
console.log("denúncia:", await txt(pa, ".hf-den .ok strong"));
await pa.close();
const den = (await db.collection("denuncias").where("tipo", "==", "mensagem").get()).docs[0]?.data();
console.log("contexto guardado:", den?.contexto?.length ?? "sem contexto (regras antigas)");
await p.close();
p = await entrar(ctx, "admin", "admin.html"); // as abas dividem o login: entra de novo como equipe
await p.waitForFunction((v) => import(v).then((m) => m.D.denuncias.some((d) => d.tipo === "mensagem")), VBASE, { timeout: 30000, polling: 1000 });
// O painel termina de carregar e redesenha a seção: tenta abrir Denúncias até a lista aparecer.
for (let i = 0; i < 6 && !(await p.locator(".ad-item[data-item^='denuncia:']").count()); i++) {
  await p.evaluate((v) => import(v).then((m) => m.C.irPara("denuncias")), VBASE);
  await p.waitForTimeout(2000);
}
await p.locator(".ad-item[data-item^='denuncia:']", { hasText: "Mensagem" }).first().locator(".ad-bt", { hasText: "Ver conteúdo denunciado" }).click({ timeout: 8000 })
  .catch(async (e) => { await p.screenshot({ path: "saida/e4-erro.png" }); console.log("itens:", await p.locator(".ad-item").evaluateAll((l) => l.map((x) => x.dataset.item + " " + x.offsetParent?.tagName))); throw e; });
await p.waitForSelector(".ad-den-corpo .ad-den-linha, .ad-den-corpo .ad-den-vazio", { timeout: 15000 });
await p.waitForTimeout(1500);
console.log("painel: mensagens mostradas =", await p.locator(".ad-den-linha").count(), "| denunciada =", await txt(p, ".ad-den-linha.denunciada .ad-den-texto"), "| cartão de avaliação =", await p.locator(".ad-den-cartao.aval").count(), "| áudio =", await p.locator(".ad-den .hf-audio").count());
console.log("botões da janela:", await p.locator(".ad-den .ad-acoes button, .ad-den .ad-acoes a").allTextContents());
console.log("info:", await txt(p, ".ad-den-info"));
await p.screenshot({ path: "saida/e4-denuncia.png" });
await p.close();

// ---------- 4) Atendimento: horário por dia, almoço, ausência com volta ----------
const pb = await entrar(ctx, "bruno", "mensagens.html");
await pb.waitForSelector("#btnConfig", { state: "visible", timeout: 20000 });
await pb.waitForFunction(() => document.getElementById("carregandoApp").hidden);
await pb.tap("#btnConfig");
await pb.waitForSelector("#secaoAtend:not([hidden]):not(.carregando)", { timeout: 15000 });
await pb.waitForTimeout(500);
console.log("tela: dias abertos =", await pb.locator(".dia-linha.on").count(), "| ausente =", await pb.isChecked("#atendAusente"));
await pb.locator('.dia-linha[data-dia="6"] .dia-tog').tap();          // abre sábado
await pb.locator('.dia-linha[data-dia="6"] .fim').fill("12:00");
await pb.locator('.dia-linha[data-dia="5"] .fim').fill("17:00");      // sexta até 17h
await pb.locator("#atendAlmocoLig + span").tap();
const volta = new Date(Date.now() + 6 * 864e5); const iso = volta.toISOString().slice(0, 10);
await pb.locator("#atendVolta").fill(iso);
await pb.waitForTimeout(300);
console.log("prévia:", await txt(pb, "#atendPrevia"));
await pb.screenshot({ path: "saida/e4-atendimento-config.png", fullPage: false });
await pb.locator("#secaoAtend").screenshot({ path: "saida/e4-atendimento-secao.png" });
await pb.tap("#atendSalvar");
await pb.waitForTimeout(2500);
console.log("toast:", await txt(pb, ".toast"));
const pub = (await db.doc(`perfis_publicos/${U.bruno}`).get()).data().atendimento;
const priv = (await db.doc(`usuarios/${U.bruno}`).get()).data().atendimento;
console.log("público:", JSON.stringify({ ...pub, volta: pub.volta ? "data" : pub.volta }));
console.log("privado tem semana/almoço/volta:", !!priv?.semana, !!priv?.almoco, !!priv?.volta);
await pb.reload(); await pb.waitForFunction(() => document.getElementById("carregandoApp").hidden); await pb.tap("#btnConfig");
await pb.waitForSelector("#secaoAtend:not([hidden]):not(.carregando)", { timeout: 15000 }); await pb.waitForTimeout(500);
console.log("recarregou: sábado aberto =", await pb.locator('.dia-linha[data-dia="6"].on').count(), "| almoço =", await pb.isChecked("#atendAlmocoLig"), "| volta =", await pb.inputValue("#atendVolta"));
await pb.close();
// Ana (com vínculo, conversa pessoal) vê o aviso de ausente e o horário
const par = [U.ana, U.bruno].sort().join("_");
await db.doc(`vinculos/${par}`).set({ participantes: par.split("_"), de: U.ana, para: U.bruno, tipoDe: "amigo", tipoPara: "amigo", status: "aceito", criadoEm: Timestamp.now() });
await db.doc(`conversas/${U.conv}`).update({ contexto: FieldValue.delete() });
const pc = await entrar(ctx, "ana", `mensagens.html?conversa=${U.conv}`);
await pc.waitForSelector(".linha-msg", { timeout: 20000 }); await pc.waitForTimeout(2000);
console.log("ana (pessoal, amiga) vê:", await pc.evaluate(() => { const b = document.getElementById("faixaAtend"); return b.hidden ? "(nada)" : b.textContent.replace(/\s+/g, " ").trim(); }));
await pc.screenshot({ path: "saida/e4-faixa-atend.png" });
await browser.close();
