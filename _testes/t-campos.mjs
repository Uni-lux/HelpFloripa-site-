// Janelas do site no lugar das do navegador: lista de opções (<select>), horário (<input type=time>),
// confirmações (confirm/alert) e "Baixar meus dados" como relatório legível.
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
let falhas = 0;
const ok = (c, t) => { if (!c) falhas++; console.log(c ? "  ✔" : "  ✘", t); };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
await db.doc(`diario/mdPost1`).set({ autorId: U.ana, nome: "Ana Souza", texto: "Minha primeira publicação #teste", tags: ["teste"], criadoEm: Timestamp.now() });
await db.doc(`relacoes/${U.ana}_${U.bruno}`).set({ tipo: "seguir", seguidorId: U.ana, alvoId: U.bruno, criadoEm: Timestamp.now() });

const B = await navegador({ mobile: true });
const p = await entrar(B.ctx, "ana", "configuracoes.html");
const nativos = [];
p.on("dialog", (d) => { nativos.push(d.message()); d.dismiss().catch(() => {}); });
const erros = [];
p.on("pageerror", (e) => erros.push(e.message));
await p.waitForTimeout(2500);

// 1) Lista de opções: Estado do endereço
await p.locator("#cfgEndereco").tap(); await p.waitForTimeout(800);
const uf = p.locator("#folhaEndereco select").first();
await uf.tap(); await p.waitForSelector(".hfc .hfc-op", { timeout: 4000 }).catch(() => {});
ok(await p.locator(".hfc").count() === 1, "tocar no Estado abre a lista do site (não a do celular)");
ok(await p.locator(".hfc .hfc-busca input").count() === 1 && await p.locator(".hfc .hfc-op").count() >= 27, "lista com busca e os 27 estados");
ok((await p.locator('.hfc .hfc-op[aria-selected="true"]').textContent()).includes("Santa Catarina"), "o estado atual vem marcado");
ok((await p.locator('.hfc .hfc-op[aria-selected="true"] .hfc-sig').textContent()) === "SC", "sigla como etiqueta no canto");
await p.screenshot({ path: "saida/campos-estado.png" });
await p.locator(".hfc .hfc-busca input").fill("paulo"); await p.waitForTimeout(200);
ok(await p.locator(".hfc .hfc-op").count() === 1, "busca sem acento: \"paulo\" → São Paulo");
await p.locator(".hfc .hfc-op").first().tap(); await p.waitForTimeout(500);
ok(await p.locator(".hfc").count() === 0 && (await uf.inputValue()) === "SP", "escolher fecha e muda o select → " + await uf.inputValue());
// volta para SC sem salvar (fecha a folha)
await uf.tap(); await p.waitForSelector(".hfc .hfc-op"); await p.locator(".hfc .hfc-busca input").fill("santa"); await p.locator(".hfc .hfc-op").first().tap(); await p.waitForTimeout(300);

// 2) Confirmação do site no lugar do confirm(): Remover endereço
await p.locator("#endRemover").tap(); await p.waitForTimeout(400);
ok(await p.locator(".hf-confirma h3").textContent().catch(() => "") === "Remover seu endereço?" && !nativos.length, "Remover endereço: janela do site (sem \"helpfloripa.com.br diz\")");
await p.screenshot({ path: "saida/campos-confirma.png" });
await p.locator(".hf-confirma .nao").tap(); await p.waitForTimeout(300);
ok(await p.locator(".hf-confirma").count() === 0, "Cancelar fecha sem remover");
await p.keyboard.press("Escape"); await p.waitForTimeout(300);

// 3) Horário: qualquer <input type=time> (como o do atendimento) abre as rodas do site
await p.evaluate(() => { const i = document.createElement("input"); i.type = "time"; i.id = "horaTeste"; i.value = "09:00"; i.setAttribute("aria-label", "Início do almoço"); i.style.cssText = "position:fixed;top:120px;left:20px;z-index:5"; i.addEventListener("change", () => { window.__mudou = i.value; }); document.body.appendChild(i); });
await p.locator("#horaTeste").tap(); await p.waitForSelector(".hfc .hfc-rodas", { timeout: 4000 }).catch(() => {});
ok(await p.locator(".hfc .hfc-rodas").count() === 1 && (await p.locator(".hfc-cab strong").textContent()) === "Início do almoço", "horário: rodas do site com o nome do campo");
ok((await p.locator(".hfc-visor").textContent()) === "09:00", "começa no horário atual do campo");
await p.locator(".hfc-atalhos button", { hasText: "13:00" }).tap(); await p.waitForTimeout(700);
ok((await p.locator(".hfc-visor").textContent()) === "13:00", "atalho 13:00 gira as rodas");
await p.screenshot({ path: "saida/campos-hora.png" });
await p.locator(".hfc-rodape .pri").tap(); await p.waitForTimeout(300);
ok((await p.locator("#horaTeste").inputValue()) === "13:00" && (await p.evaluate(() => window.__mudou)) === "13:00", "Pronto grava 13:00 e avisa a página (change)");

// 4) Baixar meus dados → relatório legível
await p.evaluate(() => document.getElementById("horaTeste").remove());
await p.locator("#cfgBaixarDados").tap(); await p.waitForTimeout(400);
const ops = await p.locator("#opcoesCorpo button").allTextContents();
ok(ops.some((o) => o.includes("Relatório para ler")) && ops.some((o) => o.includes("JSON")), "Baixar meus dados: escolher relatório ou arquivo técnico");
const [baixa] = await Promise.all([p.waitForEvent("download", { timeout: 30000 }), p.locator("#opcoesCorpo button", { hasText: "Relatório para ler" }).tap()]);
const caminho = "saida/" + baixa.suggestedFilename(); await baixa.saveAs(caminho);
const html = readFileSync(caminho, "utf8");
ok(/^meus-dados-help-floripa-\d{4}-\d{2}-\d{2}\.html$/.test(baixa.suggestedFilename()), "arquivo .html → " + baixa.suggestedFilename());
ok(html.includes("Seus dados") && html.includes("Ana Souza") && html.includes("Minha primeira publicação") && html.includes("Quem você segue"), "relatório com nome, publicações e quem segue");
ok(html.includes("Bruno Reparos") && !/>\s*[A-Za-z0-9]{28}\s*</.test(html), "nomes no lugar dos códigos das pessoas");
ok(!/"criadoEm"|\{"|seconds/.test(html.replace(/<style[\s\S]*?<\/style>/, "")), "sem código (JSON) no relatório");
const vis = await B.ctx.newPage();
await vis.goto("file://" + new URL(caminho, import.meta.url).pathname); await vis.waitForTimeout(500);
await vis.screenshot({ path: "saida/meus-dados.png", fullPage: false });
await vis.locator("#publicacoes").scrollIntoViewIfNeeded(); await vis.screenshot({ path: "saida/meus-dados-2.png" });
await vis.close();
ok(!nativos.length, "nenhuma janela do navegador apareceu → " + nativos.join(" | "));
ok(!erros.length, "sem erro de JavaScript " + erros.join(" | "));
await B.browser.close();
console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
