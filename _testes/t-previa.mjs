// Chat: tocar e segurar no nome do topo abre a prévia do perfil com os negócios; abrir um negócio e pedir
// orçamento ali mesmo (o cartão volta para esta conversa); gaveta do atendimento; "voltar" fecha uma por vez.
// Uso: node t-previa.mjs
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, m) => console.log(c ? "  ✔" : "  ✘", m);
const conv = [U.ana, U.bruno].sort().join("_");
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
const db = getFirestore(initializeApp({ projectId: "demo-hf" }));
await db.doc(`notas/neg_${U.bruno}_servicos`).set({ total: 4, soma: 18, n1: 0, n2: 0, n3: 0, n4: 2, n5: 2 });
await db.doc(`perfis_publicos/${U.bruno}`).set({ verificado: true }, { merge: true });
const { browser, ctx } = await navegador({ mobile: true });
await ctx.addInitScript(() => { try { localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" })); } catch {} });
const p = await entrar(ctx, "ana", `mensagens.html?conversa=${conv}`);
await p.waitForSelector("#btnQuem", { timeout: 20000 }); await p.waitForTimeout(2500);
const segurar = async () => {
  const b = await p.locator("#btnQuem").boundingBox();
  await p.mouse.move(b.x + 40, b.y + b.height / 2); await p.mouse.down(); await p.waitForTimeout(700); await p.mouse.up();
  await p.waitForTimeout(900);
};
const url0 = p.url();
await segurar();
ok(await p.locator(".pv-fundo.on .pv-perfil").count() === 1, "segurar o nome abre a prévia do perfil");
ok(p.url() === url0, "segurar não abriu o perfil (continua na conversa)");
await p.waitForSelector(".pv-neg", { timeout: 8000 }).catch(() => {});
ok(await p.locator(".pv-neg").count() >= 1, "negócios da pessoa na prévia: " + (await p.locator(".pv-neg .tx b").allTextContents()).join(", "));
await p.screenshot({ path: "saida/previa-perfil.png" });
const geral = await p.locator(".pv-nota-geral").textContent();
ok(geral.includes("4,5") && geral.includes("4 avaliações"), "média geral das estrelas: " + geral.trim());
ok((await p.locator(".pv-neg").first().locator(".pv-nota").textContent()).includes("4,5"), "estrelas no negócio");
ok(await p.locator(".pv-verif").count() === 1, "selo de perfil verificado");
ok((await p.locator(".pv-chip").first().textContent()) === "@brunoreparos", "@ no chip: " + await p.locator(".pv-chip").first().textContent());
ok(await p.evaluate(() => getComputedStyle(document.querySelector(".pv-fundo")).userSelect) === "none", "segurar não seleciona o texto da gaveta");

// voltar fecha só a prévia
await p.goBack(); await p.waitForTimeout(700);
ok(await p.locator(".pv-fundo").count() === 0 && !(await p.locator("#chatPane").isHidden()), "voltar fecha a prévia e a conversa continua aberta");

// negócio aberto dentro do chat; voltar fecha o negócio e depois a prévia
await segurar();
await p.locator(".pv-neg").first().click(); await p.waitForSelector(".vt-modal", { timeout: 15000 }); await p.waitForTimeout(800);
ok(await p.locator(".vt-modal").count() === 1, "tocar no negócio abre o perfil dele aqui mesmo");
await p.screenshot({ path: "saida/previa-negocio.png" });
await p.goBack(); await p.waitForTimeout(700);
ok(await p.locator(".vt-modal").count() === 0 && await p.locator(".pv-fundo.on").count() === 1, "voltar fecha o negócio e a prévia continua");
await p.goBack(); await p.waitForTimeout(700);
ok(await p.locator(".pv-fundo").count() === 0 && p.url().includes("conversa="), "voltar de novo fecha a prévia (ainda na conversa)");

// pedir orçamento pela prévia: o cartão vem para esta conversa
await segurar();
await p.locator(".pv-neg").first().click(); await p.waitForSelector(".vt-modal", { timeout: 15000 }); await p.waitForTimeout(800);
await p.locator(".vt-modal .vt-btn", { hasText: "Pedir orçamento" }).first().click(); await p.waitForTimeout(700);
await p.locator(".vd-pedido .vd-chip").first().click().catch(() => {});
await p.locator(".vd-pedido textarea").first().fill("Preciso trocar duas tomadas da sala.");
await p.locator(".vd-chip", { hasText: "Sou flexível" }).click();
await p.locator(".vt-btn", { hasText: "Enviar pedido de orçamento" }).click(); await p.waitForTimeout(1500);
ok(await p.locator(".vt-modal").count() === 0 && await p.locator(".pv-fundo").count() === 0, "depois de pedir, as janelas fecham");
ok(!(await p.locator("#barraCartao").isHidden()) && (await p.textContent("#cartaoTipo")).includes("orçamento"), "orçamento pronto para enviar nesta conversa");
await p.screenshot({ path: "saida/previa-cartao.png" });
await p.locator("#cancelarCartao").click();

// gaveta do atendimento
if (await p.locator("#faixaAtend").isVisible()) {
  await p.click("#faixaAtend"); await p.waitForTimeout(700);
  ok(await p.locator(".pv-fundo.on .pv-status").count() === 1, "faixa do atendimento abre a gaveta organizada");
  console.log("  dias:", await p.locator(".pv-dia").count(), "|", (await p.locator(".pv-status").textContent()).trim());
  await p.screenshot({ path: "saida/previa-atend.png" });
  await p.goBack(); await p.waitForTimeout(700);
  ok(await p.locator(".pv-fundo").count() === 0 && p.url().includes("conversa="), "voltar fecha a gaveta do atendimento");
} else console.log("  (sem faixa de atendimento nesta conversa)");
// tocar (sem segurar) continua abrindo o perfil completo
await p.click("#btnQuem"); await p.waitForTimeout(2500);
ok(p.url().includes("usuarios.html"), "tocar no nome abre o perfil completo: " + p.url());
await browser.close();
process.exit(0);
