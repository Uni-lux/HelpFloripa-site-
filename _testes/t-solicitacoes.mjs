// Mensagens (12/11/2026, prints dele):
// - Solicitações de mensagem: desconhecido escreve → vira solicitação (não entra em Todas, não conta como não lida, quem
//   pediu não sabe que foi vista); quem recebe aceita/recusa; "Só quem eu sigo" nem deixa começar.
// - Configurações "Quem pode mandar mensagem" (pessoal e, para quem tem negócio, negócios).
// - Aba Negócios só para quem tem negócio; Chamadas sem "Nova chamada" no topo; filtros alinhados com a lista.
// - Perfil: sem negócio não aparece a fileira; o dono esconde/mostra os atalhos dos negócios.
// Uso: node t-solicitacoes.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const par = (a, b) => [a, b].sort().join("_");
for (const [a, b] of [[U.ana, U.edu], [U.edu, U.ana], [U.fabi, U.edu], [U.edu, U.fabi]]) await db.doc(`relacoes/${a}_${b}`).delete().catch(() => {});
for (const c of [par(U.ana, U.edu), par(U.edu, U.fabi)]) await db.doc(`conversas/${c}`).delete().catch(() => {});
await db.doc(`pref_publicas/${U.fabi}`).set({ msgPessoal: "fechado" });
await db.doc(`pref_publicas/${U.ana}`).delete().catch(() => {});
await db.doc(`pref_publicas/${U.bruno}`).delete().catch(() => {});

// ---------- 1) Edu escreve para a Ana (não se seguem) ----------
const E = await navegador({ mobile: true });
const pe = await entrar(E.ctx, "edu", "mensagens.html");
const erros = []; pe.on("pageerror", (e) => erros.push("edu: " + e.message));
await pe.setViewportSize({ width: 390, height: 844 }); await pe.waitForTimeout(2500);
await pe.locator("#btnNovaConversa").click(); await pe.waitForTimeout(500);
await pe.locator("#buscaPessoas").fill("Ana"); await pe.waitForTimeout(1500);
await pe.locator("#listaPessoas .conv-item", { hasText: "Ana" }).first().click(); await pe.waitForTimeout(1500);
let cv = (await db.doc(`conversas/${par(U.ana, U.edu)}`).get()).data() || {};
ok(cv.pedido?.status === "pendente" && cv.pedido.de === U.edu, "conversa nova com desconhecida nasce como solicitação");
ok(await pe.locator("#avisoPedido").isVisible(), "quem pede vê “Solicitação enviada”");
await pe.locator("#texto").fill("Oi Ana, vi seu anúncio"); await pe.locator("#btnEnviar").click(); await pe.waitForTimeout(1500);
ok((await db.collection(`conversas/${par(U.ana, U.edu)}/mensagens`).get()).size === 1, "quem pediu consegue escrever enquanto espera");
await pe.screenshot({ path: "saida/sol-edu.png" });

// ---------- 2) "Só quem eu sigo": a Fabi não recebe ----------
await pe.goto(pe.url().replace(/mensagens\.html.*/, "mensagens.html")); await pe.waitForTimeout(2500);
await pe.locator("#btnNovaConversa").click(); await pe.waitForTimeout(500);
await pe.locator("#buscaPessoas").fill("Fabiana"); await pe.waitForTimeout(1500);
await pe.locator("#listaPessoas .conv-item", { hasText: "Fabiana" }).first().click(); await pe.waitForTimeout(1500);
ok(((await pe.locator(".toast").last().textContent().catch(() => "")) || "").includes("só recebe mensagens de quem"), "“Só quem eu sigo”: avisa e não abre");
ok(!(await db.doc(`conversas/${par(U.edu, U.fabi)}`).get()).exists, "“Só quem eu sigo”: nenhuma conversa criada");

// ---------- 3) Ana recebe ----------
const A = await navegador({ mobile: true });
const pa = await entrar(A.ctx, "ana", "mensagens.html");
pa.on("pageerror", (e) => erros.push("ana: " + e.message));
await pa.setViewportSize({ width: 390, height: 844 }); await pa.waitForTimeout(3000);
ok(await pa.locator(".sol-faixa").isVisible(), "faixa “Solicitações de mensagem” no alto da lista");
ok(await pa.locator("#listaConversas .conv-item", { hasText: "Eduardo" }).count() === 0, "a solicitação não entra em Todas");
ok(!(await pa.locator('.modos [data-modo="negocios"]').isVisible()), "sem negócio: aba Negócios escondida");
// alinhamento: busca, filtros e fotos na mesma linha da esquerda
const lados = await pa.evaluate(() => [document.querySelector(".search")?.getBoundingClientRect().left, document.querySelector('.pill:not([hidden])').getBoundingClientRect().left, document.querySelector(".sol-faixa .avatar").getBoundingClientRect().left]);
ok(Math.max(...lados) - Math.min(...lados) <= 1.5, `busca, filtros e lista alinhados à esquerda (${lados.map(Math.round).join(", ")})`);
await pa.screenshot({ path: "saida/sol-ana-lista.png" });
await pa.locator(".sol-faixa").click(); await pa.waitForTimeout(500);
ok(await pa.locator("#listaConversas .conv-item", { hasText: "Eduardo" }).count() === 1, "filtro Solicitações mostra a conversa");
await pa.locator("#listaConversas .conv-item", { hasText: "Eduardo" }).click(); await pa.waitForTimeout(1500);
ok(await pa.locator("#barraPedido").isVisible() && !(await pa.locator("#rodapeConversa").isVisible()), "aberta: Aceitar/Recusar/Bloquear no lugar do campo");
await pa.screenshot({ path: "saida/sol-ana-pedido.png" });
cv = (await db.doc(`conversas/${par(U.ana, U.edu)}`).get()).data();
ok(!cv.lidoEm?.[U.ana] && !cv.vistoEm?.[U.ana], "quem pediu não fica sabendo que foi vista");
await pa.locator("#pedidoAceitar").click(); await pa.waitForTimeout(1500);
cv = (await db.doc(`conversas/${par(U.ana, U.edu)}`).get()).data();
ok(cv.pedido?.status === "aceito", "Aceitar grava a decisão");
ok(await pa.locator("#rodapeConversa").isVisible() && !(await pa.locator("#barraPedido").isVisible()), "depois de aceitar, o campo de mensagem volta");
await pa.locator("#texto").fill("Oi Edu!"); await pa.locator("#btnEnviar").click(); await pa.waitForTimeout(1500);
ok((await db.collection(`conversas/${par(U.ana, U.edu)}/mensagens`).get()).size === 2, "Ana responde depois de aceitar");

// ---------- 4) Configurações: quem pode mandar ----------
await pa.goto(pa.url().replace(/mensagens\.html.*/, "mensagens.html")); await pa.waitForTimeout(2500);
await pa.locator("#btnConfig").click(); await pa.waitForTimeout(1200);
ok(await pa.locator("#cfgMsgPessoal .cfg-msg-op").count() === 3, "Configurações: 3 opções para mensagens pessoais");
ok(await pa.locator("#cfgMsgPessoal .cfg-msg-op.on", { hasText: "Quem eu sigo" }).count() === 1, "padrão: Quem eu sigo");
ok(!(await pa.locator("#cfgMsgNegBox").isVisible()), "sem negócio: sem a parte dos negócios");
await pa.locator("#cfgMsgPessoal .cfg-msg-op", { hasText: /^Todos/ }).click(); await pa.waitForTimeout(1200);
ok((await db.doc(`pref_publicas/${U.ana}`).get()).data()?.msgPessoal === "todos", "escolha gravada em pref_publicas");
await pa.screenshot({ path: "saida/sol-config.png" });

// ---------- 5) Bruno (tem negócio): aba Negócios, parte dos negócios e atalhos do perfil ----------
const B = await navegador({ mobile: true });
const pb = await entrar(B.ctx, "bruno", "mensagens.html");
pb.on("pageerror", (e) => erros.push("bruno: " + e.message));
await pb.setViewportSize({ width: 390, height: 844 }); await pb.waitForTimeout(3000);
ok(await pb.locator('.modos [data-modo="negocios"]').isVisible(), "com negócio: aba Negócios aparece");
await pb.locator(".modos [data-modo=chamadas]").click(); await pb.waitForTimeout(1500);
ok(await pb.locator(".rc-topo, #listaConversas > .rc-nova").count() === 0, "Chamadas: sem “Nova chamada” no topo (o botão flutuante faz isso)");
await pb.locator(".modos [data-modo=pessoal]").click(); await pb.waitForTimeout(400);
await pb.locator("#btnConfig").click(); await pb.waitForTimeout(1200);
ok(await pb.locator("#cfgMsgNegBox").isVisible() && await pb.locator("#cfgMsgNegocios .cfg-msg-op").count() === 2, "com negócio: escolha separada para os negócios");
await pb.goto(pb.url().replace(/mensagens\.html.*/, "usuarios.html")); await pb.waitForTimeout(3500);
ok(await pb.locator(".neg-visib").isVisible(), "perfil do dono: botão para esconder os atalhos dos negócios");
await pb.locator(".neg-visib").click(); await pb.waitForTimeout(1500);
ok((await db.doc(`pref_publicas/${U.bruno}`).get()).data()?.negociosNoPerfil === false, "esconder grava negociosNoPerfil = false");
await pb.screenshot({ path: "saida/sol-perfil-bruno.png" });
await pa.goto(pa.url().replace(/mensagens\.html.*/, `usuarios.html?perfil=${U.bruno}`)); await pa.waitForTimeout(3500);
ok(await pa.locator("#folhaPerfil .vinculo[data-cat]").count() === 0, "visitante não vê os atalhos escondidos");
await pa.goto(pa.url().replace(/usuarios\.html.*/, "usuarios.html")); await pa.waitForTimeout(3000);
ok(await pa.locator(".vinculo.novo").count() === 0, "sem negócio: perfil sem a fileira nem o “Novo negócio”");

ok(!erros.length, "sem erros nas páginas" + (erros.length ? ": " + erros.join(" | ") : ""));
await Promise.all([E.browser.close(), A.browser.close(), B.browser.close()]);
