// Notas como conversa fixa no Mensagens (12/11/2026): linha "Notas" no alto da aba Pessoal, abre no lugar da conversa
// (sem sair das Mensagens), prévia acompanha a última nota, "voltar" volta para a lista; também dentro da rede.
// Uso: node seed.mjs && node t-notas-chat.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
initializeApp({ projectId: "demo-hf" });
for (const d of (await getFirestore().collection(`notas/${U.ana}/itens`).get()).docs) await d.ref.delete();
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const N = await navegador({ mobile: true });
const p = await entrar(N.ctx, "ana", "mensagens.html");
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.setViewportSize({ width: 390, height: 844 });
await p.emulateMedia({ colorScheme: "dark" });
await p.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith("hf-notas-")) localStorage.removeItem(k); });
await p.reload(); await p.locator("#convNotas").waitFor({ timeout: 20000 });
const primeiro = await p.locator("#listaConversas > .conv-item").first().getAttribute("id");
ok(primeiro === "convNotas", "Notas é a primeira conversa da aba Pessoal");
ok((await p.locator("#convNotas").innerText()).includes("Só você"), "selo “Só você”");
await p.screenshot({ path: "saida/notas-chat-lista.png" });
await p.locator("#convNotas").click(); await p.waitForTimeout(600);
ok(await p.locator("#notasPane").isVisible() && !(await p.locator(".sidebar").isVisible()), "abre no lugar da conversa (tela cheia no celular)");
ok(p.url().includes("mensagens.html?notas=1"), "continua nas Mensagens");
const q = p.frameLocator("#quadroMinhasNotas");
await q.locator("#ntNova").waitFor({ timeout: 20000 });
const fr = p.frame({ url: /notas\.html/ });
ok(await fr.evaluate(() => document.documentElement.classList.contains("embutido")), "notas em modo embutido");
ok(!(await q.locator(".topo").isVisible()) && !(await q.locator("#barraRede").count()), "sem o topo do site e sem a barra de baixo");
await q.locator("#ntNova").click(); await q.locator(".nt-op", { hasText: "Nota em branco" }).click(); await p.waitForTimeout(400);
await q.locator("#edTitulo").fill("Lista do mercado");
await q.locator("#edTexto").fill("[ ] arroz\n[ ] feijão\n[x] café");
await p.waitForTimeout(900);
await p.screenshot({ path: "saida/notas-chat-editor.png" });
await p.evaluate(() => history.back()); await p.waitForTimeout(500); // fecha o editor dentro do quadro
ok(await p.locator("#notasPane").isVisible(), "voltar fecha só o editor da nota");
await p.screenshot({ path: "saida/notas-chat-aberto.png" });
await p.evaluate(() => history.back()); await p.waitForTimeout(600);
ok(!(await p.locator("#notasPane").isVisible()) && await p.locator(".sidebar").isVisible(), "voltar de novo: lista de conversas");
const linha = await p.locator("#convNotas").innerText();
ok(linha.includes("Lista do mercado") && +(await p.locator("#convNotas .notas-tarefas").innerText()) >= 2, "prévia com a última nota e as tarefas abertas");
await p.screenshot({ path: "saida/notas-chat-previa.png" });
// pela seta do topo
await p.locator("#convNotas").click(); await p.waitForTimeout(500);
await p.locator("#btnFecharNotas").click(); await p.waitForTimeout(500);
ok(!(await p.locator("#notasPane").isVisible()), "seta do topo volta para a lista");
// abrir uma conversa depois esconde as notas
await p.locator("#convNotas").click(); await p.waitForTimeout(400);
await p.goto(p.url().replace(/mensagens\.html.*/, "mensagens.html?notas=1")); await p.locator("#notasPane").waitFor({ state: "visible", timeout: 20000 });
ok(true, "link direto mensagens.html?notas=1 abre as notas");
// computador: lista à esquerda e notas no lugar da conversa
await p.setViewportSize({ width: 1280, height: 800 }); await p.waitForTimeout(500);
ok(await p.locator(".sidebar").isVisible() && await p.locator("#notasPane").isVisible(), "computador: lista e notas lado a lado");
await p.screenshot({ path: "saida/notas-chat-pc.png" });
// busca "notas"
await p.locator("#buscaConversas").fill("notas"); await p.waitForTimeout(300);
ok(await p.locator("#convNotas").count() === 1, "busca por “notas” acha a conversa");
ok(!erros.length, "sem erros na página " + erros.join(" | "));
await N.browser.close();
// dentro da rede (rede.html): o quadro das notas não pode tirar a pessoa da rede
const R = await navegador({ mobile: true, rede: true });
const r = await entrar(R.ctx, "ana", "rede.html?aba=mensagens");
await r.waitForTimeout(4000);
const msgs = r.frames().find((f) => /mensagens\.html/.test(f.url()));
await msgs.locator("#convNotas").waitFor({ timeout: 20000 });
await msgs.locator("#convNotas").click(); await r.waitForTimeout(3000);
ok(/rede\.html/.test(r.url()), "na rede, abrir as notas não sai da rede");
ok(!!r.frames().find((f) => /notas\.html/.test(f.url())), "notas carregadas dentro do quadro das Mensagens");
await r.screenshot({ path: "saida/notas-chat-rede.png" });
process.exit();
