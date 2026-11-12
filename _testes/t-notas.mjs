// Notas (12/11/2026): criar com modelo, tarefas que se marcam no cartão, prazo sugerido pelo texto, pastas, fixar,
// corretor, busca, lixeira com desfazer, guardar no aparelho e na conta (notas/{uid}/itens).
// Uso: node seed.mjs && node t-notas.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
for (const d of (await db.collection(`notas/${U.ana}/itens`).get()).docs) await d.ref.delete();
const N = await navegador({ mobile: true });
const p = await entrar(N.ctx, "ana", "notas.html");
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(2500);
await p.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith("hf-notas-")) localStorage.removeItem(k); }); await p.reload(); await p.waitForTimeout(2500);
ok(await p.locator(".nt-vazio .nt-mm").count() >= 3, "sem notas: convite com modelos");
await p.screenshot({ path: "saida/notas-vazio.png" });
// 1) modelo Estratégia
await p.locator("#ntNova").click(); await p.locator(".nt-op", { hasText: "Estratégia" }).click(); await p.waitForTimeout(400);
ok(await p.locator(".nt-ed").isVisible() && (await p.locator("#edTexto").inputValue()).includes("# Objetivo"), "modelo Estratégia preenchido");
await p.locator("#edTitulo").fill("Estratégia: lançar o delivery");
await p.locator("#edTexto").fill("# Objetivo\nVender 50 marmitas por semana ate sexta\n\n# Ações\n[ ] fazer cardapio\n[ ] fotos dos pratos\n[x] abrir perfil no Help Floripa");
await p.waitForTimeout(700);
ok(await p.locator("#edSug").isVisible(), "texto fala “sexta”: sugere o prazo");
await p.locator("#edSug").click(); await p.waitForTimeout(300);
ok(await p.locator("#edPrazo.tem").isVisible(), "prazo definido pela sugestão");
await p.locator("[data-m=ver]").click(); await p.waitForTimeout(200);
ok(await p.locator("#edVer .nt-chk").count() === 3, "modo Ver: 3 tarefas com caixinha");
await p.locator("#edVer .nt-chk input").first().click(); await p.waitForTimeout(200);
ok((await p.locator("#edTexto").inputValue()).includes("[x] fazer cardapio"), "marcar no modo Ver muda o texto");
await p.screenshot({ path: "saida/notas-editor.png" });
// corretor dentro da nota
await p.locator("[data-m=editar]").click();
await p.locator("[data-t=corrigir]").click(); await p.locator(".cr-fundo").waitFor();
ok(await p.locator(".cr-item", { hasText: "cardápio" }).count() >= 1, "Corrigir acha “cardapio → cardápio”");
await p.screenshot({ path: "saida/notas-corretor.png" });
await p.locator(".cr-fundo [data-ok]").click(); await p.waitForTimeout(300);
ok((await p.locator("#edTexto").inputValue()).includes("cardápio"), "correção aplicada na nota");
// Enter continua a lista
await p.locator("#edTexto").click(); await p.keyboard.press("Control+End"); await p.keyboard.press("Enter"); await p.keyboard.type("divulgar");
ok((await p.locator("#edTexto").inputValue()).endsWith("[ ] divulgar"), "Enter continua a lista de tarefas");
await p.locator("#edPin").click(); await p.waitForTimeout(800);
await p.locator(".nt-ed [data-fechar]").click(); await p.waitForTimeout(500);
ok(await p.locator(".nt-card").count() === 1 && await p.locator(".nt-card .nt-pin").count() === 1, "nota salva e fixada");
ok(await p.locator(".nt-card .nt-prog").isVisible(), "cartão mostra o progresso das tarefas");
// 2) marcar tarefa no cartão
const antes = await p.locator(".nt-card .nt-prog > span:last-child").textContent();
await p.locator(".nt-card .nt-chk input").first().click(); await p.waitForTimeout(400);
ok(await p.locator(".nt-card .nt-prog > span:last-child").textContent() !== antes, "marcar tarefa direto no cartão");
// 3) segunda nota, nova pasta
await p.locator("#ntNova").click(); await p.locator(".nt-op", { hasText: "Nota em branco" }).click(); await p.waitForTimeout(300);
await p.locator("#edTitulo").fill("Ideias de presente"); await p.locator("#edTexto").fill("• livro\n• perfume #aniversario");
await p.locator("#edPasta").click(); await p.locator(".nt-op", { hasText: "Ideias" }).click(); await p.waitForTimeout(800);
await p.locator(".nt-ed [data-fechar]").click(); await p.waitForTimeout(400);
ok(await p.locator(".nt-secao", { hasText: "Fixadas" }).isVisible() && await p.locator(".nt-card").count() === 2, "fixadas em cima, as outras embaixo");
await p.locator(".nt-chip", { hasText: "Ideias" }).click(); await p.waitForTimeout(200);
ok(await p.locator(".nt-card").count() === 1, "filtro por pasta");
await p.locator(".nt-chip", { hasText: "Todas" }).click();
await p.locator("#ntBusca").fill("perfume"); await p.waitForTimeout(300);
ok(await p.locator(".nt-card").count() === 1, "busca no texto");
await p.locator("#ntBusca").fill(""); await p.waitForTimeout(300);
await p.screenshot({ path: "saida/notas-lista.png" });
// 4) na conta
await p.waitForTimeout(1500);
const nuvem = await db.collection(`notas/${U.ana}/itens`).get();
ok(nuvem.size === 2, `copiadas para a conta (${nuvem.size})`);
// 5) lixeira + desfazer
await p.locator(".nt-card", { hasText: "Ideias de presente" }).click(); await p.waitForTimeout(300);
await p.locator("#edMais").click(); await p.locator(".nt-op", { hasText: "Mover para a lixeira" }).click(); await p.waitForTimeout(300);
ok(await p.locator(".nt-card").count() === 1 && await p.locator(".nt-snack").isVisible(), "lixeira com Desfazer");
await p.locator(".nt-snack button").click(); await p.waitForTimeout(300);
ok(await p.locator(".nt-card").count() === 2, "Desfazer volta a nota");
// 6) outro aparelho: lê da conta
const M = await navegador({ mobile: false });
const p2 = await entrar(M.ctx, "ana", "notas.html"); await p2.waitForTimeout(3500);
ok(await p2.locator(".nt-card").count() === 2, "no computador as mesmas notas aparecem (da conta)");
await p2.screenshot({ path: "saida/notas-computador.png" });
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await Promise.all([N.browser.close(), M.browser.close()]);
