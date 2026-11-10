// Sugestões no meio do Diário (como no Instagram), Explorar sem "Ativos recentemente" e "Online agora" no Mensagens
// (como o chat do antigo Facebook) (10/11/2026, pedido do dono).
// Uso: node seed.mjs && node t-sugestoes-online.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const foto = (n) => "data:image/jpeg;base64," + readFileSync(`saida/fotos-pub/${n}.jpg`).toString("base64");
const min = (m) => Timestamp.fromMillis(Date.now() - m * 60000);
// Ana segue só o Bruno; Dani e Edu online, Fabi escondeu o online (null), Gui e Helê fora há 2 dias.
for (const d of (await db.collection("relacoes").where("seguidorId", "==", U.ana).get()).docs) await d.ref.delete();
await db.doc(`relacoes/${U.ana}_${U.bruno}`).set({ tipo: "seguir", seguidorId: U.ana, alvoId: U.bruno, criadoEm: min(999) });
await db.doc(`relacoes/${U.dani}_${U.ana}`).set({ tipo: "seguir", seguidorId: U.dani, alvoId: U.ana, criadoEm: min(999) });
const on = { [U.bruno]: min(1), [U.dani]: min(2), [U.edu]: min(3), [U.fabi]: null, [U.gui]: min(2880), [U.hele]: min(2880) };
for (const [u, t] of Object.entries(on)) await db.doc(`perfis_publicos/${u}`).set({ ultimoAcesso: t }, { merge: true });
// conversa da Ana com o Edu (contato pela conversa, sem seguir)
const convEdu = [U.ana, U.edu].sort().join("_");
await db.doc(`conversas/${convEdu}`).set({ participantes: [U.ana, U.edu].sort(), ultimaMensagem: "Até amanhã!", ultimaMensagemRemetenteId: U.edu, atualizadoEm: min(30) });
// publicações para o Diário ter mais de 4
for (const d of (await db.collection("diario").where("tags", "array-contains", "sugexp").get()).docs) await d.ref.delete();
const fotos = ["praia", "montanha", "ponte", "cozinha", "praia", "montanha"];
for (let i = 0; i < 6; i++) await db.doc(`diario/sg${i}`).set({ autorId: [U.bruno, U.gui, U.hele, U.fabi, U.edu, U.dani][i], nome: "Pessoa " + i, tipo: "foto", texto: `Publicação ${i} #sugexp`, tags: ["sugexp"], mediaUrl: foto(fotos[i]), mediaTipo: "image", criadoEm: min(10 + i * 7) });

const A = await navegador({ mobile: true });
const p = await entrar(A.ctx, "ana", "feed.html");
if (process.env.CLARO !== "1") await p.emulateMedia({ colorScheme: "dark" });
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.evaluate(() => { try { localStorage.removeItem("hf-sug-dispensados"); } catch {} });
// 1) Diário: bloco de sugestões depois da 4ª publicação
await p.waitForSelector(".feed-sug:not([hidden]) .sug-cartao, .feed-sug:not([hidden]) .sug-linha", { timeout: 30000 });
const antes = await p.evaluate(() => { const b = document.querySelector(".feed-sug"); let n = 0; for (let x = b.previousElementSibling; x; x = x.previousElementSibling) if (!x.matches(".feed-em-dia")) n++; return n; }); console.log(await p.evaluate(() => [...document.querySelector("#listaFeed").children].map((x) => x.className.split(" ")[0]).join(",")));
ok(antes >= 4, "sugestões entram depois da 4ª publicação (" + antes + " antes)");
const nomes = await p.locator(".feed-sug .sug-nome").allTextContents();
ok(!nomes.some((n) => /Bruno/.test(n)), "quem você já segue não é sugerido");
ok(await p.locator(".feed-sug .sug-motivo.segue").count() >= 1, "motivo 'Segue você' (Dani)");
ok(await p.locator(".feed-sug .sug-on").count() >= 1, "bolinha verde em quem está online");
await p.locator(".feed-sug").scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
await p.screenshot({ path: "saida/so-01-diario-sugestoes.png" });
const n0 = await p.locator(".feed-sug .sug-cartao, .feed-sug .sug-linha").count();
await p.locator(".feed-sug .sug-tirar").first().click(); await p.waitForTimeout(400);
ok(await p.locator(".feed-sug .sug-cartao, .feed-sug .sug-linha").count() === n0 - 1, "X tira a sugestão");
// 2) Explorar: sem "Ativos recentemente", sugestões no modelo novo
await p.locator("#barraRede [data-barra=explorar]").click();
await p.waitForSelector("#secSugestoes:not([hidden]) .sug-cartao, #secSugestoes:not([hidden]) .sug-linha", { timeout: 20000 });
ok(await p.locator("#titPessoas").isHidden() && await p.locator("#listaPessoas").isHidden(), "Explorar sem 'Ativos recentemente'");
ok(!(await p.locator("#painelExplorar").textContent()).includes("Ativos recentemente"), "texto 'Ativos recentemente' sumiu");
await p.locator("#secSugestoes").scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
await p.screenshot({ path: "saida/so-02-explorar-sugestoes.png" });
await p.locator("#buscaPessoas").fill("ed"); await p.waitForTimeout(1500);
ok(await p.locator("#titPessoas").isVisible() && await p.locator("#listaPessoas .linha").count() >= 1, "busca mostra os resultados");
await p.locator("#buscaPessoas").fill(""); await p.waitForTimeout(500);
// 3) Mensagens: a lista de conversas só com a bolinha verde; o "Online agora" fica no "+" (Nova conversa)
await p.goto("http://127.0.0.1:5057/mensagens.html");
await p.waitForSelector(".conv-item.on", { timeout: 25000 });
ok(await p.locator("#listaConversas .online-agora, .side > .online-agora:not([hidden])").count() === 0, "a lista de conversas não tem a fileira Online agora");
ok(await p.locator(".conv-item.on").count() >= 1, "bolinha verde na conversa de quem está online");
await p.screenshot({ path: "saida/so-03-mensagens-lista.png" });
await p.locator("#btnNovaConversa").click();
await p.waitForSelector("#painelNova #onlineAgora:not([hidden]) .oa-pessoa", { timeout: 15000 }); await p.waitForTimeout(500);
const online = await p.locator("#onlineAgora .oa-nome").allTextContents();
ok(online[0] === "Eduardo" || online[0] === "Bruno", "Nova conversa: contatos online primeiro → " + online.join(", "));
ok(online.some((x) => /Dani/.test(x)) && !online.some((x) => /Fabi|Gui|Hel/.test(x)), "online de todo o site; quem escondeu ou saiu há 2 dias fica de fora");
ok((await p.locator("#listaPessoas .conv-secao").first().textContent()) === "Pessoas no Help Floripa", "lista embaixo com o resto");
await p.screenshot({ path: "saida/so-04-nova-conversa.png" });
await p.locator("#onlineAgora .oa-pessoa", { hasText: "Eduardo" }).click();
await p.waitForTimeout(1500);
ok(/Edu/.test(await p.locator("#topNome").textContent()), "tocar abre a conversa");
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close(); process.exit();
