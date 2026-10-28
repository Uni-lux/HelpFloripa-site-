// Reclamações em nível nacional: as 100 mais recentes do Brasil com "Carregar mais" buscando as próximas no servidor,
// o seu painel lido por consulta própria (antes só via o que estava entre as carregadas do país), o total contado no
// servidor e "Onde" (Todo o Brasil · estado · cidade) pelo lugar escolhido no site.
// Uso: node seed.mjs && node carga-seed.mjs && node t-reclamacoes-nacional.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, BASE } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const T = (h) => Timestamp.fromMillis(Date.now() - h * 36e5);
// Bem antigas (depois das 300 da carga): uma recebida pelo Bruno e uma enviada pela Ana.
await db.doc("avaliacoes/rn_bruno").set({ tipo: "negocio", nota: 1, negocioId: `${U.bruno}_servicos`, alvoId: U.bruno, autorId: U.edu, autorNome: "Edu", comentario: "Antiga, do Bruno.", criadoEm: T(5000) });
await db.doc("queixas/rn_ana").set({ negocioId: `${U.edu}_servicos`, alvoId: U.edu, autorId: U.ana, autorNome: "Ana", motivo: "atraso", texto: "Antiga, da Ana.", status: "aberta", abertaEm: T(5000), criadoEm: T(5000) });
const [ca, cq] = await Promise.all([db.collection("avaliacoes").where("tipo", "==", "negocio").where("nota", "in", [1, 2]).count().get(), db.collection("queixas").count().get()]);
const total = ca.data().count + cq.data().count;
ok(total > 250, `há ${total} reclamações no emulador (rode o carga-seed.mjs antes)`);

const { browser, ctx } = await navegador({ mobile: true });
const erros = [];
const b = await entrar(ctx, "bruno", "sobre.html");
b.on("pageerror", (e) => erros.push(String(e)));
await b.evaluate(() => { localStorage.setItem("hf-busca-local", JSON.stringify({ uf: "PE", cidade: "Recife", cidadeIbge: 2611606 })); localStorage.setItem("hf-local-manual", "1"); });
await b.goto(BASE + "reclamacoes.html");
await b.waitForSelector("#listaRec .rec-card, #listaRec article, #listaRec .lista-vazia:not(:empty)", { timeout: 20000 });
await b.waitForFunction((t) => document.getElementById("nTotal").textContent === String(t), total, { timeout: 10000 }).catch(() => {});
ok((await b.textContent("#nTotal")) === String(total), `total do Brasil contado no servidor: ${await b.textContent("#nTotal")} (esperado ${total})`);
ok(!(await b.isHidden("#nNota")), "nota explica que os números contam as mais recentes: " + (await b.textContent("#nNota")));
ok((await b.textContent("#mpRec")) === "1", `painel do Bruno acha a recebida antiga (fora das 100 do Brasil): ${await b.textContent("#mpRec")}`);
const nCards = () => b.evaluate(() => document.getElementById("listaRec").children.length);
const antes = await b.evaluate(() => document.getElementById("nTotal").textContent);
ok(await nCards() === 18, "18 na primeira página");
for (let i = 0; i < 12; i++) { if (await b.isHidden("#maisRec")) break; await b.click("#maisRec"); await b.waitForTimeout(400); }
await b.waitForTimeout(800);
const vistos = await nCards();
ok(vistos > 200, `"Carregar mais" busca as próximas no servidor: ${vistos} na tela (antes parava nas carregadas)`);
// Onde: com Recife escolhido aparecem os chips e o filtro pelo negócio.
const chips = await b.locator("#ondeRec .chip").allTextContents();
ok(chips.join("|") === "Todo o Brasil|PE|Recife/PE", "chips de lugar: " + chips.join(" · "));
await b.locator("#ondeRec .chip", { hasText: "Recife" }).click();
await b.waitForTimeout(500);
const tx = await b.textContent("#nTotalTx"), nRec = Number(await b.textContent("#nTotal"));
ok(/Recife/.test(tx) && nRec > 0 && nRec < Number(antes), `filtro Recife: ${nRec} ${tx}`);
const cidades = await b.evaluate(() => [...document.querySelectorAll("#listaRec > *")].length);
ok(cidades > 0, `lista de Recife com ${cidades} itens`);
await b.screenshot({ path: "saida/reclamacoes-nacional.png", fullPage: false });
// Painel de outra pessoa (Ana) direto pelo link: lê as dela.
await b.goto(BASE + `reclamacoes.html?pessoa=${U.ana}&lado=enviadas`);
await b.waitForFunction(() => document.getElementById("ppEnv").textContent !== "0", null, { timeout: 15000 }).catch(() => {});
ok((await b.textContent("#ppEnv")) === "1", `painel da Ana (enviadas) acha a antiga: ${await b.textContent("#ppEnv")}`);
ok(!erros.length, "sem erro na página " + erros.join(" | "));
await browser.close();
await db.doc("avaliacoes/rn_bruno").delete(); await db.doc("queixas/rn_ana").delete();
