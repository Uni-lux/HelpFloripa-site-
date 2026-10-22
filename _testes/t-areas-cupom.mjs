// Áreas de atuação em grupos (busca, principal, limite de 6), promoção com calendário do site, selo nos cartões
// e o cupom indo junto no pedido de orçamento até o chat. Uso: node t-areas-cupom.mjs  (precisa das regras do main)
import { navegador, entrar, BASE, USUARIOS as U } from "./nav.mjs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
const db = getFirestore(initializeApp({ projectId: "demo-hf" }));
const NEG = `${U.bruno}_servicos`;
const ok = (c, m) => console.log(c ? "  ✔" : "  ✘", m);
const { browser, ctx } = await navegador({ mobile: true });
await ctx.addInitScript(() => { try { localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" })); } catch {} });
const toastTx = async (p) => (await p.locator(".toast, [class*=toast]").allTextContents()).join(" | ");

// ---------- 1) dono escolhe as áreas e cria a promoção ----------
let p = await entrar(ctx, "bruno", "negocios.html");
await p.waitForSelector(".neg-card.servicos .ng-pri", { timeout: 20000 });
await p.click(".neg-card.servicos .ng-pri"); await p.waitForTimeout(800);
ok(await p.locator(".area-grupo").count() === 7, "7 grupos de áreas");
await p.locator(".areas-escolhidas").scrollIntoViewIfNeeded();
await p.screenshot({ path: "saida/areas-1.png" });
await p.locator(".area-grupo summary", { hasText: "Casa e reparos" }).click(); await p.waitForTimeout(200);
await p.locator(".area-grupo .marca-op", { hasText: "Eletricista" }).click(); await p.waitForTimeout(200);
await p.fill("#negAreasBusca", "pianista"); await p.waitForTimeout(200);
ok(await p.locator(".areas-grupos .marca-op", { hasText: "Música" }).count() === 1, "busca 'pianista' acha Música");
await p.locator(".areas-grupos .marca-op", { hasText: "Música" }).click(); await p.waitForTimeout(200);
ok((await p.inputValue("#negAreasBusca")) === "pianista", "a busca continua depois de marcar");
await p.fill("#negAreasBusca", ""); await p.waitForTimeout(200);
await p.locator(".area-esc-nome", { hasText: "Música" }).click(); await p.waitForTimeout(200);
ok((await p.locator(".area-esc.principal").textContent()).includes("Música"), "Música virou a principal");
for (const a of ["Limpeza e faxina", "Pintura", "Encanador", "Montagem de móveis"]) { await p.locator(".area-grupo .marca-op", { hasText: a }).click(); await p.waitForTimeout(150); }
await p.locator(".area-grupo .marca-op", { hasText: "Jardinagem" }).click(); await p.waitForTimeout(300);
ok(await p.locator(".area-esc").count() === 6 && (await toastTx(p)).includes("até 6"), "limite de 6 áreas avisa");
for (const a of ["Pintura", "Encanador", "Montagem de móveis", "Limpeza e faxina"]) { await p.locator(".area-esc", { hasText: a }).locator(".area-esc-x").click(); await p.waitForTimeout(150); }
await p.locator(".areas-escolhidas").scrollIntoViewIfNeeded();
await p.screenshot({ path: "saida/areas-2.png" });
await p.locator(".area-grupo summary", { hasText: "Casa e reparos" }).scrollIntoViewIfNeeded();
await p.screenshot({ path: "saida/areas-3.png" });

await p.locator("#negPromo .ng-chave input").check({ force: true });
await p.fill("#negPromo_titulo", "10% no primeiro serviço");
await p.fill("#negPromo_codigo", "bemvindo10");
await p.click("#negPromo_ate"); await p.waitForTimeout(500);
ok(await p.locator(".hfc .hfc-dias").count() === 1, "data da promoção abre o calendário do site");
await p.screenshot({ path: "saida/cal-promo.png" });
await p.locator(".hfc-atalhos button", { hasText: "Em 7 dias" }).click(); await p.locator(".hfc-rodape .pri").click(); await p.waitForTimeout(400);
// "Em 7 dias" no relógio do navegador (horário de Brasília), não no do computador que roda o teste.
const iso7 = await p.evaluate(() => { const d7 = new Date(); d7.setDate(d7.getDate() + 7); return `${d7.getFullYear()}-${String(d7.getMonth() + 1).padStart(2, "0")}-${String(d7.getDate()).padStart(2, "0")}`; });
ok(await p.inputValue("#negPromo_ate") === iso7, "calendário preencheu a data: " + iso7);
await p.click("#negSalvar"); await p.waitForTimeout(2500);
const s = (await db.doc(`negocios/${NEG}`).get()).data();
console.log("  salvo:", JSON.stringify({ categorias: s.categorias, categoria: s.categoria, codigo: s.promocao?.codigo }));
ok(s.categorias.join() === "musica,eletrica" && s.categoria === "musica" && s.promocao?.codigo === "BEMVINDO10", "áreas (principal primeiro) e promoção gravadas");
await p.waitForSelector(".neg-card.servicos .ng-promo-st", { timeout: 8000 }).catch(() => {});
ok((await p.locator(".neg-card.servicos .ng-promo-st").textContent().catch(() => "")).includes("Promoção no ar"), "cartão de Meus negócios mostra a promoção no ar");
await p.locator(".neg-card.servicos").screenshot({ path: "saida/promo-cartao.png" });
await p.close();

// ---------- 2) cliente: selo, filtro da área, cupom no orçamento ----------
let a = await entrar(ctx, "ana", "servicos.html");
await a.waitForTimeout(4000);
ok(await a.locator(".vt-promo-tag").count() >= 1, "selo de cupom no cartão da vitrine");
const chips = (await a.locator("#filterChips .chip").allTextContents()).map((t) => t.trim());
ok(chips.includes("Música") && chips.includes("Eletricista"), "filtros das áreas novas: " + chips.join(" | "));
await a.fill("#searchInput", "pianista"); await a.waitForTimeout(600);
ok((await a.locator("#vitrine").textContent()).includes("Bruno Reparos"), "busca 'pianista' acha o profissional de Música");
await a.screenshot({ path: "saida/areas-vitrine.png" });
await a.goto(BASE + `servicos.html?negocio=${NEG}`); await a.waitForSelector(".vd-promo", { timeout: 20000 }); await a.waitForTimeout(800);
ok((await a.locator(".vd-promo .ate").textContent()).includes("Faltam 7 dias"), "prazo da promoção: " + await a.locator(".vd-promo .ate").textContent());
await a.click(".vd-cupom"); await a.waitForTimeout(500);
ok((await toastTx(a)).includes("já entra no seu pedido"), "copiar avisa que o cupom já entra no pedido");
await a.locator(".vt-btn", { hasText: "Pedir orçamento" }).first().click(); await a.waitForTimeout(700);
ok(await a.locator(".vd-cupom-ped.ok").count() === 1, "orçamento já vem com o cupom aplicado");
await a.locator(".vd-cupom-ped .vd-link", { hasText: "Remover" }).click(); await a.waitForTimeout(200);
await a.fill(".vd-cupom-linha input", "errado1"); await a.locator(".vd-cupom-linha .vt-btn").click(); await a.waitForTimeout(300);
ok((await toastTx(a)).includes("inválido"), "cupom errado avisa");
await a.fill(".vd-cupom-linha input", "bemvindo10"); await a.locator(".vd-cupom-linha .vt-btn").click(); await a.waitForTimeout(300);
ok(await a.locator(".vd-cupom-ped.ok").count() === 1, "cupom digitado certo é aplicado");
await a.locator(".vd-chip", { hasText: "Música" }).click();
await a.locator(".vd-pedido textarea").first().fill("Aulas de piano para iniciante, 2 vezes por semana.");
await a.locator(".vd-chip", { hasText: "Agendar" }).click(); await a.waitForTimeout(300);
await a.locator(".vd-pedido input[type=date]").click(); await a.waitForTimeout(500);
ok(await a.locator(".hfc .hfc-dias").count() === 1, "data do orçamento abre o calendário do site (não o do celular)");
const ontemOff = await a.evaluate(() => { const b = [...document.querySelectorAll(".hfc-dias button")]; const h = b.find((x) => x.classList.contains("hoje")); const i = b.indexOf(h); return i > 0 ? b[i - 1].disabled : true; });
ok(ontemOff, "dias que já passaram ficam travados");
await a.screenshot({ path: "saida/cal-orcamento.png" });
await a.locator(".hfc-mes-tit").click(); await a.waitForTimeout(200);
await a.screenshot({ path: "saida/cal-anos.png" });
await a.locator(".hfc-mes-tit").click(); await a.waitForTimeout(200);
await a.locator(".hfc-atalhos button", { hasText: "Amanhã" }).click(); await a.locator(".hfc-rodape .pri").click(); await a.waitForTimeout(300);
ok(/^\d{4}-\d{2}-\d{2}$/.test(await a.inputValue(".vd-pedido input[type=date]")), "data escolhida no campo");
await a.locator(".vd-cupom-ped").scrollIntoViewIfNeeded(); await a.screenshot({ path: "saida/cupom-orcamento.png" });
await a.locator(".vt-btn", { hasText: "Enviar pedido de orçamento" }).click(); await a.waitForTimeout(2000);
const conv = [U.ana, U.bruno].sort().join("_");
// A conversa abre na gaveta de mensagens (iframe), com o cartão do orçamento pronto para enviar.
await a.waitForTimeout(2500);
const fr = a.frames().find((f) => f.url().includes("mensagens.html"));
ok(!!fr, "conversa abriu na gaveta");
await fr.waitForSelector("#btnEnviar", { timeout: 20000 }); await a.waitForTimeout(1500);
await fr.click("#btnEnviar"); await a.waitForTimeout(3000);
const ms = await db.collection(`conversas/${conv}/mensagens`).orderBy("criadoEm", "desc").limit(1).get();
const cup = ms.docs[0]?.data()?.cartao?.solicitacao?.cupom;
console.log("  cupom na mensagem:", JSON.stringify(cup));
ok(cup?.codigo === "BEMVINDO10" && cup?.titulo === "10% no primeiro serviço", "cupom vai junto no pedido de orçamento");
await a.waitForTimeout(1000);
ok(await fr.locator(".cm-pedido .cupom").count() >= 1, "chat mostra a linha do cupom no cartão");
await fr.locator(".cm-pedido .cupom").last().scrollIntoViewIfNeeded().catch(() => {});
await a.screenshot({ path: "saida/cupom-chat.png" });

// ---------- 3) data de nascimento no cadastro: escolhe o ano ----------
const c = await ctx.newPage();
await c.goto(BASE + "cadastre-se.html"); await c.waitForTimeout(2500);
await c.click("#nascimento"); await c.waitForTimeout(500);
ok(await c.locator(".hfc .hfc-dias").count() === 1, "nascimento abre o calendário do site");
await c.locator(".hfc-mes-tit").click(); await c.locator(".hfc-grade button", { hasText: "2000" }).click();
await c.locator(".hfc-grade button[aria-label=maio]").click(); await c.locator(".hfc-dias button", { hasText: /^15$/ }).click();
await c.screenshot({ path: "saida/cal-nascimento.png" });
await c.locator(".hfc-rodape .pri").click(); await c.waitForTimeout(300);
ok(await c.inputValue("#nascimento") === "2000-05-15", "nascimento: 15/05/2000 por ano → mês → dia");
await browser.close();
process.exit(0);
