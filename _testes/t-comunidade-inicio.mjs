// Saúde e Comunidade no Início e no Explorar: carrossel "Saúde perto de você", "Na Comunidade" com filtro por tipo e aviso
// de não vender, seção da Comunidade no Explorar e a aba Comunidade na busca. Uso: node seed.mjs && node t-comunidade-inicio.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { navegador, entrar, USUARIOS as U, BASE } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const F = JSON.parse(readFileSync("saida/fotos-previa.json", "utf8"));
const agora = Date.now(), h = 3600e3;
const base = { status: "disponivel", uf: "SC", cidade: "Florianópolis", cidadeIbge: 4205407, aceiteRegras: true };
const itens = [
  { id: "pv1", donoId: U.ana, categoria: "doacao", titulo: "Berço de madeira com colchão", bairro: "Trindade", fotos: [], tipoItem: "bebe", estado: "usado", h: 2 },
  { id: "pv2", donoId: U.fabi, categoria: "quarto", titulo: "Quarto para dividir perto da UFSC", bairro: "Carvoeira", fotos: [F.quarto], quarto: { vaga: "individual", rateio: 650, contasInclusas: true, mobiliado: true, vagas: 1, para: "todos" }, h: 5 },
  { id: "pv3", donoId: U.gui, categoria: "achados", titulo: "Encontrei uma chave com chaveiro azul", bairro: "Centro", fotos: [], achado: { tipo: "encontrado", local: "Praça XV" }, h: 9 },
  { id: "pv4", donoId: U.hele, categoria: "doacao", titulo: "Roupas de inverno tamanho M", bairro: "Estreito", fotos: [F.roupas], tipoItem: "roupas", estado: "usado", h: 20 },
  { id: "pv5", donoId: U.edu, categoria: "troca", titulo: "Troco bicicleta aro 26 por patinete", bairro: "Coqueiros", fotos: [], tipoItem: "outros", h: 30 },
  { id: "pv6", donoId: U.ana, categoria: "pedido", titulo: "Preciso de cadeira de rodas emprestada", bairro: "Saco dos Limões", fotos: [], tipoItem: "acessibilidade", h: 48 },
  { id: "pv7", donoId: U.fabi, categoria: "achados", titulo: "Perdi um gato cinza, atende por Tom", bairro: "Lagoa da Conceição", fotos: [], achado: { tipo: "perdido", local: "Av. das Rendeiras" }, h: 60 }
];
for (const it of itens) { const { id, h: hh, ...d } = it; await db.doc(`comunidade/${id}`).set({ ...base, ...d, descricao: "Teste de prévia", busca: [], criadoEm: Timestamp.fromMillis(agora - hh * h), atualizadoEm: Timestamp.fromMillis(agora - hh * h) }); }
for (let i = 0; i < 35; i++) await db.doc(`comunidade/sp${i}`).set({ status: "disponivel", uf: "SP", cidade: "São Paulo", cidadeIbge: 3550308, donoId: U.edu, categoria: "doacao", titulo: `Doação em São Paulo ${i}`, descricao: "Teste", fotos: [], busca: [], aceiteRegras: true, criadoEm: Timestamp.fromMillis(agora - i * 60000), atualizadoEm: Timestamp.fromMillis(agora - i * 60000) });
await db.doc(`usuarios/${U.bruno}`).set({ uf: "SC", cidade: "Florianópolis", cidadeIbge: 4205407 }, { merge: true });
const saude = [
  [U.gui, "Dra. Marina Psicologia", "psicologia", "Trindade"], [U.hele, "Clínica Sorriso Ilha", "odontologia", "Centro"], [U.edu, "Fisio Movimento", "fisioterapia", "Estreito"]
];
for (const [uid, nome, cat, bairro] of saude) await db.doc(`negocios/${uid}_saude`).set({ tipo: "saude", donoId: uid, nome, categoria: cat, bairro, cidade: "Florianópolis", uf: "SC", cidadeIbge: 4205407, fotos: [F.saude], descricao: "Atendimento particular e convênios.", atualizadoEm: Timestamp.fromMillis(agora - 5 * h), criadoEm: Timestamp.fromMillis(agora - 30 * 24 * h) });
const B = await navegador({ mobile: true });
await B.ctx.addInitScript(() => { try { localStorage.setItem("hf-busca-local", JSON.stringify({ uf: "SC", cidade: "Florianópolis", cidadeIbge: 4205407 })); } catch {} });
const p = await entrar(B.ctx, "bruno", "index.html");
await p.emulateMedia({ colorScheme: "dark" });
await p.waitForTimeout(2500);
const lidosAntes = await p.locator("#trilhoComunidade .cm-mini").count();
ok(lidosAntes === 0, "Comunidade só carrega quando a seção chega perto da tela (antes de rolar: " + lidosAntes + ")");
await p.locator("#secComunidade").scrollIntoViewIfNeeded();
await p.waitForSelector("#secComunidade:not([hidden]) .cm-mini", { timeout: 30000 });
await p.waitForTimeout(1500);
await p.locator("#secSaude").scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
await p.screenshot({ path: "saida/previa-inicio-saude.png" });
ok(await p.locator("#trilhoSaude .mini").count() === 3, "Início: carrossel Saúde com os 3 perfis de saúde");
await p.locator("#secComunidade").scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
await p.evaluate(() => window.scrollBy(0, -40));
await p.screenshot({ path: "saida/previa-inicio-comunidade.png" });
const titulos = (await p.locator("#trilhoComunidade .cm-mini strong").allTextContents());
ok(titulos.slice(0, 7).every((t) => !t.includes("São Paulo")) && titulos.length === 20 && (await p.textContent("#t-secComunidade")).includes("Florianópolis") && (await p.textContent("#secComunidade")).includes("Proibido vender"), "nacional: os 7 de Florianópolis primeiro, mesmo com 35 mais novos em SP (" + titulos.length + " cartões)");
await p.locator("#filtrosComunidade button", { hasText: "Achados e perdidos" }).click();
ok(await p.locator("#trilhoComunidade .cm-mini").count() === 2, "filtro Achados e perdidos: 2");
await p.goto(BASE + "feed.html"); await p.waitForTimeout(2500);
await p.locator("[data-aba=explorar]").first().click();
await p.waitForSelector("#secComunidade:not([hidden]) .cm-mini", { timeout: 30000 }); await p.waitForTimeout(1500);
await p.locator("#secComunidade").scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollBy(0, -60)); await p.waitForTimeout(500);
await p.screenshot({ path: "saida/previa-explorar-comunidade.png" });
const tExp = await p.locator("#exploraComunidade .cm-mini strong").allTextContents();
ok((await p.textContent("#titComunidade")).includes("Florianópolis") && tExp.slice(0, 7).every((t) => !t.includes("São Paulo")), "Explorar: Comunidade da cidade da pessoa primeiro");
await p.fill("#buscaPessoas", "quarto"); await p.waitForTimeout(3500);
await p.screenshot({ path: "saida/previa-explorar-busca.png" });
ok(await p.locator("#listaPessoas .cm-mini").count() === 1 && (await p.textContent("#abasBusca")).includes("Comunidade"), "busca \"quarto\": aba Comunidade e a vaga encontrada");
await B.browser.close();
for (const id of ["pv1","pv2","pv3","pv4","pv5","pv6","pv7", ...Array.from({ length: 35 }, (_, i) => "sp" + i)]) await db.doc(`comunidade/${id}`).delete();
for (const u of [U.gui, U.hele, U.edu]) await db.doc(`negocios/${u}_saude`).delete();
