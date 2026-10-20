// Estatísticas dos negócios + campos novos do perfil de negócio (Instagram, site, CNPJ, horário por dia, promoção).
// 1) bruno preenche os campos novos; 2) ana e dani visitam (link do Explorar e link direto), tocam no WhatsApp,
// Instagram, cupom, Pedir orçamento e abrem um imóvel; 3) bruno vê os números no cartão, nas estatísticas do
// negócio (e baixa o Excel) e nas estatísticas do perfil. Uso: node t-insights-neg.mjs  (precisa das regras do main)
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
import { mkdirSync } from "node:fs";
mkdirSync("saida/excel-neg", { recursive: true });
const NEG = `${U.bruno}_servicos`;
// O relatório em Excel é do plano Pro: o Bruno tem o Pro neste teste.
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
const { initializeApp } = await import("firebase-admin/app"); const { getFirestore, Timestamp } = await import("firebase-admin/firestore");
await getFirestore(initializeApp({ projectId: "demo-hf" })).doc(`planos/${U.bruno}`).set({ plano: "pro", ate: Timestamp.fromMillis(Date.now() + 30 * 864e5), ativadoEm: Timestamp.now(), ativadoPor: U.admin });
const { browser, ctx } = await navegador({ mobile: true });
await ctx.addInitScript(() => { try { localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" })); } catch {} });
const ok = (c, m) => console.log(c ? "  ✔" : "  ✘", m);

// ---------- 1) dono preenche ----------
let p = await entrar(ctx, "bruno", "negocios.html");
await p.waitForSelector(".neg-card.servicos .ng-pri", { timeout: 20000 });
await p.click(".neg-card.servicos .ng-pri"); await p.waitForTimeout(700);
await p.fill("#negAreasBusca", "reforma"); await p.locator("#negExtras .marca-op", { hasText: "Reformas" }).click();
await p.fill("#negWhats", "48999887766");
await p.fill("#negInsta", "@bruno.reparos");
await p.fill("#negSite", "brunoreparos.com.br");
await p.fill("#negCnpj", "11222333000180");
ok((await p.textContent("#negCnpjAjuda")).includes("não é válido"), "CNPJ errado avisa na hora");
await p.fill("#negCnpj", "11222333000181");
ok((await p.textContent("#negCnpjAjuda")).includes("válido"), "CNPJ certo: " + await p.textContent("#negCnpjAjuda"));
await p.locator("#negHorario .ng-chip", { hasText: "Seg a sex" }).click();
await p.locator("#negHorario .ng-hor-dia").nth(5).locator("input[type=checkbox]").check({ force: true }); // sábado
await p.locator("#negPromo .ng-chave input").check({ force: true });
await p.fill("#negPromo_titulo", "10% no primeiro serviço");
await p.fill("#negPromo_texto", "Vale para pedidos feitos pelo Help Floripa.");
await p.fill("#negPromo_codigo", "bem vindo10");
ok(await p.inputValue("#negPromo_codigo") === "BEMVINDO10", "código do cupom fica em maiúsculas sem espaço");
await p.screenshot({ path: "saida/ins-form.png", fullPage: false });
await p.locator("#negHorario").scrollIntoViewIfNeeded(); await p.screenshot({ path: "saida/ins-form-horario.png" });
await p.locator("#negPromo").scrollIntoViewIfNeeded(); await p.screenshot({ path: "saida/ins-form-promo.png" });
await p.click("#negSalvar"); await p.waitForTimeout(2500);
const toast1 = await p.locator(".toast, .hf-toast, [class*=toast]").allTextContents();
console.log("  toast:", toast1.join(" | ").slice(0, 160));
const salvo = await p.evaluate(async (id) => { const { getDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"); const d = (await getDoc(doc(window.firebaseDb, "negocios", id))).data(); return { instagram: d.instagram, site: d.site, cnpj: d.cnpj, semana: d.semana, promo: d.promocao?.codigo, dias: d.dias, horario: d.horario }; }, NEG);
console.log("  salvo:", JSON.stringify(salvo));
ok(salvo.instagram === "bruno.reparos" && salvo.site === "https://brunoreparos.com.br" && salvo.cnpj === "11222333000181" && salvo.promo === "BEMVINDO10", "campos novos gravados no perfil do negócio");
ok(salvo.semana?.[1] === "08:00-18:00" && salvo.semana?.[0] === "" && salvo.semana?.[6] === "08:00-18:00", "horário por dia (seg a sáb) gravado");
await p.close();

// ---------- 2) clientes visitam ----------
async function visitar(quem, url) {
  const pg = await entrar(ctx, quem, url);
  await pg.waitForSelector(".vd-promo", { timeout: 20000 });
  await pg.waitForTimeout(1500);
  return pg;
}
let a = await visitar("ana", `servicos.html?negocio=${NEG}&de=explorar`);
await a.screenshot({ path: "saida/ins-perfil-topo.png" });
ok(await a.locator(".vd-selo-cnpj").count() === 1, "perfil mostra o CNPJ");
ok(await a.locator(".vd-horario-dia").count() === 7, "perfil mostra o horário de cada dia");
ok(await a.locator(".vd-link", { hasText: "@bruno.reparos" }).count() === 1, "link do Instagram");
await a.locator(".vd-horario").scrollIntoViewIfNeeded(); await a.screenshot({ path: "saida/ins-perfil-horario.png" });
await a.click(".vd-cupom"); await a.waitForTimeout(600);
const popInsta = a.waitForEvent("popup").catch(() => null);
await a.locator(".vd-link", { hasText: "@bruno.reparos" }).click(); (await popInsta)?.close();
const popW = a.waitForEvent("popup").catch(() => null);
await a.locator(".vd-acoes .vt-btn.whats").first().click(); (await popW)?.close();
await a.waitForTimeout(1500);
await a.goto(`http://127.0.0.1:5057/imoveis.html?anuncio=an1`); await a.waitForTimeout(3500);
await a.close();
let d = await visitar("dani", `servicos.html?negocio=${NEG}`);
const popW2 = d.waitForEvent("popup").catch(() => null);
await d.locator(".vd-acoes .vt-btn.whats").first().click(); (await popW2)?.close();
await d.waitForTimeout(1500);
await d.close();

// ---------- 3) dono vê os números ----------
p = await entrar(ctx, "bruno", "negocios.html");
await p.waitForSelector(".neg-card.servicos .ng-est-n", { timeout: 20000 });
await p.waitForTimeout(800);
const nums = await p.locator(".neg-card.servicos .ng-est-n b").allTextContents();
console.log("  cartão (visitas, contatos, taxa):", nums.join(" · "));
ok(nums[0] === "2" && nums[1] === "2", "cartão: 2 visitas e 2 contatos (WhatsApp de cada uma)");
const numsIm = await p.locator(".neg-card.imoveis .ng-est-n b").allTextContents();
ok(numsIm[0] === "1", "imóveis: 1 visita (a ana abriu um anúncio)");
await p.screenshot({ path: "saida/ins-meus-negocios.png" });
await p.click(".neg-card.servicos .ng-est"); await p.waitForSelector(".ni-kpi", { timeout: 15000 }); await p.waitForTimeout(800);
const kpis = await p.locator(".ni-kpi strong").allTextContents();
console.log("  KPIs:", kpis.join(" · "));
ok(kpis[0] === "2" && kpis[1] === "2" && kpis[2] === "100%", "estatísticas: 2 visitas, 2 contatos, 100%");
const acoes = await p.locator(".ni-barra .ni-barra-nome").allTextContents();
console.log("  ações/origens:", acoes.join(" | "));
ok(acoes.includes("WhatsApp") && acoes.includes("Instagram") && acoes.includes("Copiou o cupom"), "ações: WhatsApp, Instagram e cupom");
ok(acoes.includes("Explorar") && acoes.includes("Link compartilhado"), "origens: Explorar e link");
await p.screenshot({ path: "saida/ins-1.png" });
const corpo = p.locator("#c_folhaInsNeg");
for (let i = 2; i <= 6; i++) { await corpo.evaluate((e, k) => { e.scrollTop = e.clientHeight * 0.9 * (k - 1); }, i); await p.waitForTimeout(250); await p.screenshot({ path: `saida/ins-${i}.png` }); }
const baixa = p.waitForEvent("download");
await p.click(".ni-baixar");
const arq = await baixa; await arq.saveAs("saida/excel-neg/" + arq.suggestedFilename());
console.log("  Excel:", arq.suggestedFilename());
await p.close();

// ---------- estatísticas do perfil → seus negócios ----------
p = await entrar(ctx, "bruno", "usuarios.html");
await p.waitForTimeout(3000);
await p.evaluate(() => import("./insights.js?v=10").then((m) => m.abrirInsights()));
await p.waitForSelector(".ins-neg", { timeout: 20000 });
await p.locator(".ins-negs").scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
await p.screenshot({ path: "saida/ins-perfil-negocios.png" });
ok(await p.locator(".ins-neg").count() === 2, "estatísticas do perfil mostram os 2 negócios");
await browser.close();
