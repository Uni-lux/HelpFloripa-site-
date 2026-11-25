// Funções guardadas para a próxima atualização (em-breve.js): roubos/veículos e desaparecidos mostram "Em breve" ou
// somem, sem erro na tela. Corridas/entregas voltaram em 25/11/2026 (pelo servidor): aparecem de novo. Uso: node seed.mjs && node t-em-breve.mjs
import { navegador, entrar, BASE } from "./nav.mjs";
let falhas = 0;
const ok = (c, m) => { if (!c) falhas++; console.log(c ? "  ✔" : "  ✘", m); };
const { browser: nav, ctx } = await navegador({ mobile: true });
const p = await entrar(ctx, "ana", "index.html");
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.goto(BASE + "entregas.html", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(3500);
ok(await p.locator(".hf-em-breve").count() === 0, "Entregas e corridas: abre (sem Em breve)");
await p.goto(BASE + "entregador.html", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(3500);
ok(await p.locator(".hf-em-breve").count() === 0, "Seja entregador: abre (sem Em breve)");
await p.goto(BASE + "alertas.html?aba=roubos", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(4000);
ok(await p.locator('[data-aba="roubos"]').count() === 0 && await p.locator('[data-aba="veiculos"]').count() === 0, "Help e alertas: sem as abas Roubos e Veículos");
ok(await p.locator('[data-aba="sos"][aria-selected="true"]').count() === 1, "link antigo de Roubos abre no Help");
await p.click('[data-aba="pets"]'); await p.waitForTimeout(1500);
ok(await p.locator('[data-quem="pessoas"]').count() === 0, "Perdidos: sem Pessoas (desaparecidos)");
ok(await p.getByText("Cadastrar meu pet").count() > 0, "Pets continua");
await p.goto(BASE + "index.html", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(2500);
ok(await p.locator(".mob-chip.corrida, .mob-chip.entrega").count() === 2 && await p.locator(".mob-chip.presente").count() === 1, "Início: corrida, entrega e presente");
await p.goto(BASE + "automotivo.html", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(2000);
ok(await p.locator(".mob-op").count() > 0, "Automotivo: com o bloco de corridas");
await p.goto(BASE + "presentes.html?aba=enviar", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(3500);
ok((await p.content()).includes(">Mobilidade<"), "Presentes: com o grupo Mobilidade");
await p.goto(BASE + "mural.html", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(3000);
ok(await p.locator(".mu-al.roubos").count() === 0, "Comunidade: sem o cartão Alertas de roubos");
// Painel dos admins: Segurança e alertas só com Help e Pets
const B = await navegador({ mobile: true }); // outro navegador: duas abas no mesmo travam o Firestore do teste
const pa = await entrar(B.ctx, "admin", "admin.html#seguranca");
pa.on("pageerror", (e) => erros.push("painel: " + e.message));
await pa.waitForFunction(() => document.querySelectorAll(".ad-chip[data-aba]").length >= 3, null, { timeout: 30000 }).catch(() => {});
const abas = await pa.locator(".ad-chip[data-aba]").evaluateAll((l) => l.map((b) => b.dataset.aba));
ok(abas.includes("help") && abas.includes("pets") && !abas.some((a) => ["ocorrencias", "vendas", "desaparecidos"].includes(a)), "Painel › Segurança: só Cruzamentos, Help e Pets (" + abas.join(", ") + ")");
ok(erros.length === 0, "sem erro de JavaScript" + (erros.length ? ": " + erros.join(" | ").slice(0, 300) : ""));
await nav.close(); await B.browser.close();
console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo");
process.exit(falhas ? 1 : 0);
