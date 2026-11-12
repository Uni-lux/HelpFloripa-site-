// Corretor na tela (12/11/2026): Diário "Corrigir e formatar" com o dicionário (sugestões, não encontradas, adicionar ao
// dicionário) e o "Corrigir · N" do Mensagens contando também os erros de digitação.
// Uso: node seed.mjs && node t-corretor-tela.mjs
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const { browser, ctx } = await navegador({ mobile: true });
const p = await entrar(ctx, "ana", "feed.html");
await p.emulateMedia({ colorScheme: "dark" });
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
let ctxOk = false; p.on("response", (r) => { if (/corretor\/contexto\.json/.test(r.url()) && r.ok()) ctxOk = true; });
await p.evaluate(() => { localStorage.removeItem("hf-dicionario"); localStorage.removeItem("hf-corretor-gosto"); Object.keys(localStorage).filter((k) => k.startsWith("hf-pub-auto-")).forEach((k) => localStorage.removeItem(k)); });
await p.waitForSelector("#btnComporFeed", { timeout: 30000 }); await p.waitForTimeout(1200);
await p.locator("#btnComporFeed").click(); await p.waitForSelector("#folhaPublicar.aberta"); await p.waitForTimeout(300);
const texto = "oi gente tudo bem? ontem eu fui no restaurnte do Zeca e a esperiencia foi otima. a gente vamos voltar as 20h com os amigo. me avisa por favor se der. obrigado pela atencao vlw";
await p.locator("#pubTexto").fill(texto);
await p.locator("#pubFormatar").click();
await p.locator(".cr-fundo [data-ok]").waitFor({ timeout: 15000 });
const cab = await p.textContent(".cr-cab p");
ok(/correç/.test(cab), "revisão abriu com o dicionário: " + cab);
ok(await p.locator(".cr-item", { hasText: "restaurnte" }).count() === 1, "erro de digitação: restaurnte → restaurante");
ok(await p.locator(".cr-item", { hasText: "experiência" }).count() === 1, "erro pelo som: esperiencia → experiência");
ok(await p.locator(".cr-item", { hasText: "às 20" }).count() === 1, "crase na hora: às 20h");
ok(await p.locator(".cr-item", { hasText: "a gente vai" }).count() === 1, "concordância: a gente vai");
ok(await p.locator(".cr-item:not(.sug)", { hasText: "amigos" }).count() === 1, "plural corrigido: os amigos");
ok(await p.locator(".cr-item.sug", { hasText: "por favor" }).count() === 1, "sugestão (desligada): “por favor” entre vírgulas");
ok(/Zeca/.test(await p.textContent(".cr-prev")) && await p.locator(".cr-item", { hasText: "Zeca" }).count() === 0, "nome próprio no meio da frase não é mexido");
await p.screenshot({ path: "saida/corretor-revisar.png" });
await p.locator(".cr-item.sug", { hasText: "por favor" }).click();
await p.waitForTimeout(200); ok((await p.locator(".cr-prev ins").allTextContents()).some((t) => /favor,/.test(t)), "ligar a sugestão aplica na prévia");
await p.locator(".cr-fundo [data-ok]").click(); await p.waitForTimeout(300);
const v = await p.locator("#pubTexto").inputValue();
ok(/Oi, gente, tudo bem\? Ontem eu fui ao restaurante do Zeca e a experiência foi ótima\. A gente vai voltar às 20h com os amigos\. Me avisa, por favor, se der\. Obrigado pela atenção,? valeu\.?/.test(v), "texto final: " + v);
ok(ctxOk, "corretor que aprende: contexto.json carregado junto com o dicionário");
ok(await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("hf-corretor-gosto") || "{}")).length > 3), "aprende com a escolha: guardado no aparelho");
// palavra inventada → não encontrada → adicionar ao dicionário
await p.locator("#pubTexto").fill("o brigadeiro da Tia Lú é bombastiquissimo demais");
await p.locator("#pubFormatar").click(); await p.locator(".cr-fundo [data-ok]").waitFor({ timeout: 15000 });
const desc = await p.locator(".cr-add").count();
ok(desc >= 1 || await p.locator(".cr-item.sug").count() >= 1, "palavra inventada aparece para conferir");
if (desc) { await p.locator(".cr-add").first().click(); await p.waitForTimeout(300); ok(await p.locator(".cr-add").count() === desc - 1, "+ dicionário tira da lista"); }
await p.screenshot({ path: "saida/corretor-desconhecidas.png" });
await p.locator(".cr-fundo [data-fechar]").first().click();
// Mensagens: chip conta os erros de digitação
const m = await ctx.newPage(); m.on("pageerror", (e) => erros.push(e.message));
await m.goto(p.url().replace(/feed\.html.*/, `mensagens.html?conversa=${U.conv}`)); await m.waitForSelector("#texto", { timeout: 20000 });
await m.locator("#texto").click(); await m.waitForTimeout(2500);
await m.locator("#texto").fill("vamos amrcar o horario pra amanha");
await m.waitForTimeout(1200);
ok(await m.locator("#chipCorretor").isVisible() && Number(await m.textContent("#chipCorretorN")) >= 3, "chip do Mensagens: " + (await m.textContent("#chipCorretorN").catch(() => "")) + " correções");
await m.locator("#chipCorretor").click(); await m.locator(".cr-fundo [data-ok]").waitFor({ timeout: 15000 });
await m.screenshot({ path: "saida/corretor-chat.png" });
await m.locator(".cr-fundo [data-ok]").click(); await m.waitForTimeout(300);
ok(/marcar o horário pra amanhã/.test(await m.locator("#texto").inputValue()), "chat corrigido: " + await m.locator("#texto").inputValue());
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await browser.close();
