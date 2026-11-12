// Notas (12/11/2026): caixa de digitação como numa conversa, atalho nas Mensagens com alfinete (tira) e
// Configurações das Mensagens → "Atalho para as Notas" (põe de volta); sem as pílulas Todas/Não lidas.
// Uso: node seed.mjs | tail -1 > saida/seed-ids.json && node t-notas-rapida.mjs
import { navegador, entrar } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const erros = [];
const marca = Date.now().toString(36);
const A = await navegador({ mobile: true });
const p = await entrar(A.ctx, "ana", "mensagens.html");
p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector("#convNotas", { timeout: 25000 }); await p.waitForTimeout(800);
ok(await p.locator('.pill[data-filtro="naoLidas"]').count() === 0 && await p.locator('.pill[data-filtro="todas"]').isHidden(), "sem as pílulas Todas e Não lidas");
const av = await p.evaluate(() => getComputedStyle(document.querySelector("#convNotas .notas-av")).backgroundImage);
ok(/gradient/.test(av), "foto das Notas no mesmo jeito das conversas");
await p.screenshot({ path: "saida/nr-lista.png" });
// alfinete tira o atalho
await p.locator("#convNotas .notas-pin").tap(); await p.waitForTimeout(400);
await p.locator(".hf-confirma-fundo button", { hasText: "Tirar da lista" }).click(); await p.waitForTimeout(600);
ok(await p.locator("#convNotas").count() === 0, "alfinete tira as Notas da lista");
// Configurações → Atalho para as Notas
await p.evaluate(() => document.querySelector('[data-cfg-bool="atalhoNotas"]').closest("label").scrollIntoView());
const cb = p.locator('[data-cfg-bool="atalhoNotas"]');
ok(await cb.count() === 1 && !(await cb.isChecked()), "configuração 'Atalho para as Notas' desligada");
await p.evaluate(() => { const i = document.querySelector('[data-cfg-bool="atalhoNotas"]'); i.checked = true; i.dispatchEvent(new Event("change")); });
await p.waitForTimeout(600);
ok(await p.locator("#convNotas").count() === 1, "ligar nas configurações põe as Notas de volta");
// página das notas: caixa de digitação
const q = await A.ctx.newPage(); q.on("pageerror", (e) => erros.push(e.message));
await q.setViewportSize({ width: 390, height: 844 });
await q.goto("http://127.0.0.1:5057/notas.html"); await q.waitForSelector("#ntRapida", { timeout: 20000 }); await q.waitForTimeout(800);
ok(await q.locator("#ntRapidaEnviar").isDisabled(), "botão de enviar desligado sem texto");
await q.locator("#ntRapida").fill(`Comprar tinta ${marca}\nfalar com o pintor amanhã`);
ok(!(await q.locator("#ntRapidaEnviar").isDisabled()), "com texto o botão liga");
await q.locator("#ntRapidaEnviar").click(); await q.waitForTimeout(700);
ok(await q.locator(".nt-card", { hasText: `Comprar tinta ${marca}` }).count() === 1, "enviar cria a nota na lista");
ok(await q.locator("#ntRapida").inputValue() === "", "a caixa fica vazia depois de salvar");
await q.locator("#ntRapidaLista").click(); await q.keyboard.type(`pão ${marca}`);
ok((await q.locator("#ntRapida").inputValue()).startsWith(`[ ] pão ${marca}`), "botão de lista começa uma tarefa");
await q.locator("#ntRapidaEnviar").click(); await q.waitForTimeout(600);
ok(await q.locator(".nt-card", { hasText: `pão ${marca}` }).count() === 1, "lista de tarefas salva pela caixa");
const r = await q.evaluate(() => { const c = document.getElementById("ntComp").getBoundingClientRect(); return { b: c.bottom, h: innerHeight, w: c.width, sw: document.documentElement.scrollWidth, vw: innerWidth }; });
ok(r.b <= r.h && r.sw <= r.vw, `caixa embaixo e sem passar da largura (${Math.round(r.b)}/${r.h})`);
await q.screenshot({ path: "saida/nr-notas.png" });
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close();
