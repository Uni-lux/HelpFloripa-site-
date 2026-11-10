// Mensagens (10/11/2026, prints do dono): figurinha segurada fica marcada e abre folha (tocar fora fecha), Chamadas sem a
// lista de conversas aparecendo ao trocar de aba e Negócios em 2 linhas (nome ✓ · tipo / prévia).
// Uso: node seed.mjs && node t-mensagens-ajustes2.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { navegador, entrar } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const esperar = async (fn, ms = 10000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn().catch(() => false)) return true; await new Promise((r) => setTimeout(r, 50)); } return false; };

const A = await navegador({ mobile: true });
const p = await entrar(A.ctx, "ana", "mensagens.html");
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector('.modos [data-modo="negocios"]'); await p.waitForTimeout(1200);

// Negócios em 2 linhas
await p.locator('.modos [data-modo="negocios"]').tap();
await p.waitForSelector(".conv-item", { timeout: 20000 }); await p.waitForTimeout(500);
const it = p.locator(".conv-item").first();
ok(await it.locator(".conv-nome .conv-tipo-nm").count() === 1, "tipo do negócio na linha do nome: " + (await it.locator(".conv-nome").textContent()));
ok(await it.locator(".conv-meta .conv-tipo").count() === 0, "sem a 3ª linha do tipo");
const linhas = await it.locator(".conv-main > *").count();
ok(linhas === 2, `2 linhas (${linhas})`);
await p.screenshot({ path: "saida/negocios-2linhas.png" });

// Chamadas: troca de aba some com a lista de conversas na hora (servidor lento)
await A.ctx.route(/127\.0\.0\.1:8085\/.*Listen\/channel/, async (r) => { await new Promise((ok) => setTimeout(ok, 2500)); r.continue().catch(() => {}); });
await p.locator('.modos [data-modo="chamadas"]').tap();
await p.waitForTimeout(120);
const restou = await p.locator("#listaConversas .conv-item").count();
ok(restou === 0, `ao trocar para Chamadas a lista de conversas some na hora (${restou} sobrando)`);
await A.ctx.unroute(/127\.0\.0\.1:8085\/.*Listen\/channel/);
await esperar(async () => (await p.locator(".rc-topo").count()) === 1, 15000);
// volta e vai de novo: desenha com o que já tinha
await p.locator('.modos [data-modo="pessoal"]').tap(); await p.waitForTimeout(400);
await A.ctx.route(/127\.0\.0\.1:8085\/.*Listen\/channel/, async (r) => { await new Promise((ok) => setTimeout(ok, 2500)); r.continue().catch(() => {}); });
await p.locator('.modos [data-modo="chamadas"]').tap();
ok(await esperar(async () => (await p.locator(".rc-topo").count()) === 1 && (await p.locator("#listaConversas .conv-item").count()) === 0, 900), "2ª vez: Chamadas aparecem na hora com o que já foi lido");
await A.ctx.unroute(/127\.0\.0\.1:8085\/.*Listen\/channel/);

// Figurinha segurada
await p.locator('.modos [data-modo="negocios"]').tap();
await p.waitForSelector(".conv-item"); await p.locator(".conv-item").first().tap();
await p.waitForSelector("body.chat-aberto"); await p.waitForTimeout(800);
await p.locator("#btnEmoji").tap(); await p.locator('[data-pe="figurinhas"]').tap();
await p.waitForSelector(".pe-fig");
const fig = p.locator('.pe-sec[data-sec="helpfloripa"] + .pe-figs .pe-fig').nth(3);
await fig.dispatchEvent("contextmenu");
await p.waitForSelector(".pe-folha", { timeout: 3000 });
ok(await fig.evaluate((e) => e.classList.contains("segurada")), "a figurinha segurada fica marcada na grade");
ok(await p.locator(".pe-folha-fig img").count() === 1 && /Combinado/.test(await p.locator(".pe-folha-leg").textContent()), "folha mostra a figurinha grande e o nome: " + (await p.locator(".pe-folha-leg").textContent()));
await p.screenshot({ path: "saida/figurinha-folha.png" });
const caixa = await p.locator(".pe-folha-fundo").boundingBox(), folha = await p.locator(".pe-folha").boundingBox();
await p.touchscreen.tap(caixa.x + caixa.width / 2, Math.max(caixa.y + 20, folha.y - 60)); // na conversa, fora da folha
await p.waitForTimeout(400);
ok(await p.locator(".pe-folha").count() === 0 && !(await fig.evaluate((e) => e.classList.contains("segurada"))), "tocar fora fecha a folha e desmarca");
ok(await p.locator("#painelEmoji.aberto").count() === 1, "o painel continua aberto");
// voltar do celular também fecha só a folha
await fig.dispatchEvent("pointerdown"); await fig.dispatchEvent("pointerup"); await fig.dispatchEvent("contextmenu"); await p.waitForSelector(".pe-folha");
await p.goBack().catch(() => {}); await p.waitForTimeout(500);
ok(await p.locator(".pe-folha").count() === 0 && await p.locator("#painelEmoji.aberto").count() === 1, "voltar fecha só a folha");
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close(); process.exit();
