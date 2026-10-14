// Comentários estilo rede social (fixado, ordem por engajamento, reações, dono: quem comenta/fixar/ocultar),
// "Enviar" para amigos (cartão no Mensagens + link direto) e "quem deu estrelas" com prioridade da sua rede.
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => console.log(c ? "  ✔" : "  ✘", t);
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const T = (min) => Timestamp.fromMillis(Date.now() - min * 60000);
await db.doc("diario/pc").set({ autorId: U.bruno, nome: "Bruno", texto: "Reforma do banheiro", criadoEm: T(120) });
await db.doc("comentarios/k1").set({ postId: "pc", postAutorId: U.bruno, autorId: U.edu, nome: "Edu", texto: "Primeiro!", criadoEm: T(60) });
await db.doc("comentarios/k2").set({ postId: "pc", postAutorId: U.bruno, autorId: U.fabi, nome: "Fabi", texto: "Comentário sem engajamento", criadoEm: T(50) });
await db.doc("comentarios/k3").set({ postId: "pc", postAutorId: U.bruno, autorId: U.gui, nome: "Gui", texto: "Comentário famoso", criadoEm: T(40) });
await db.doc("comentarios/k4").set({ postId: "pc", postAutorId: U.bruno, autorId: U.bruno, nome: "Bruno", texto: "Obrigado!", respostaA: "k3", respostaAutorId: U.gui, criadoEm: T(30) });
for (const u of [U.edu, U.fabi, U.hele]) await db.doc(`curtidas_comentarios/k3_${u}`).set({ comentarioId: "k3", uid: u, reacao: "❤️" });
// estrelas na publicação: bruno segue fabi; fabi segue hele; ana e gui não têm ligação
await db.doc(`relacoes/${U.bruno}_${U.fabi}`).set({ tipo: "seguir", seguidorId: U.bruno, alvoId: U.fabi });
await db.doc(`relacoes/${U.fabi}_${U.hele}`).set({ tipo: "seguir", seguidorId: U.fabi, alvoId: U.hele });
const notas = [[U.ana, 5], [U.gui, 4], [U.hele, 3], [U.fabi, 5]];
for (const [u, n] of notas) await db.doc(`curtidas/pc_${u}`).set({ postId: "pc", uid: u, postAutorId: U.bruno, nota: n });
await db.doc("diario_notas/pc").set({ total: 4, soma: 17, n1: 0, n2: 0, n3: 1, n4: 1, n5: 2 });

const A = await navegador({ mobile: true }), B = await navegador({ mobile: true });
const pa = await entrar(A.ctx, "ana", "feed.html");
const card = pa.locator(".post-card", { hasText: "Reforma do banheiro" }).first();
await card.waitFor({ timeout: 30000 }); await card.scrollIntoViewIfNeeded(); await pa.waitForTimeout(1000);
await card.locator(".acoes-post .acao").first().tap();
await pa.waitForSelector("#folhaComentarios.aberta .fio-coment", { timeout: 10000 }); await pa.waitForTimeout(800);
const ordem = await pa.locator("#c_folhaComentarios .fio-coment > .comentario .coment-texto").allTextContents();
ok(ordem[0] === "Primeiro!" && ordem[1] === "Comentário famoso" && ordem[2] === "Comentário sem engajamento", "ordem: fixado (primeiro) → mais engajamento → resto → " + ordem.join(" | "));
ok((await pa.locator(".fio-coment.fixado .coment-fixo").textContent()).includes("Primeiro comentário"), "o primeiro comentário fica fixado sozinho");
ok((await pa.locator(".fio-coment", { hasText: "Comentário famoso" }).locator(".coment-reacoes").first().textContent()).includes("3"), "reações: ❤️ 3 no comentário famoso");
ok(await pa.locator(".selo-autor").count() >= 1, "selo \"Autor\" na resposta do dono");
// reagir com emoji (abre a escolha)
await pa.locator(".fio-coment.fixado .coment-reagir").first().click();
await pa.waitForSelector(".reacao-pop", { timeout: 3000 });
await pa.screenshot({ path: "saida/coment-reacao.png" });
await pa.locator(".reacao-pop button", { hasText: "😂" }).click(); await pa.waitForTimeout(1200);
ok((await pa.locator(".fio-coment.fixado .coment-reagir").first().textContent()).includes("😂") && (await pa.locator(".fio-coment.fixado .coment-reacoes").first().textContent()).includes("😂"), "reagiu com 😂");
const rDoc = (await db.doc(`curtidas_comentarios/k1_${U.ana}`).get()).data();
ok(rDoc?.reacao === "😂", "reação gravada: " + rDoc?.reacao);
// enviar para amigos
await pa.locator("#folhaComentarios .pub-acao", { hasText: "Enviar" }).tap();
await pa.waitForSelector("#folhaLista.aberta", { timeout: 5000 }); await pa.waitForTimeout(1500);
const linhaB = pa.locator("#listaCorpo .linha", { hasText: "Bruno" }).first();
await linhaB.locator("button", { hasText: "Enviar" }).tap(); await pa.waitForTimeout(2000);
const conv = [U.ana, U.bruno].sort().join("_");
const msgs = await db.collection(`conversas/${conv}/mensagens`).where("tipoArquivo", "==", "cartao").get();
const cartao = msgs.docs.map((d) => d.data().cartao).find((c) => c?.tipo === "publicacao");
ok(cartao && cartao.link === "usuarios.html?post=pc", "Enviar: cartão da publicação no Mensagens → " + JSON.stringify(cartao || {}).slice(0, 90));
// dono: fixa outro, muda quem comenta
const pb = await entrar(B.ctx, "bruno", "usuarios.html?post=pc");
await pb.waitForSelector("#folhaPost.aberta", { timeout: 30000 }).catch(() => {});
await pb.waitForTimeout(2500);
ok(await pb.locator("#folhaPost.aberta").count() === 1 && (await pb.locator("#postTexto").textContent()).includes("Reforma"), "link direto usuarios.html?post= abre a publicação");
await pb.locator("#postSocial .fio-coment", { hasText: "Comentário famoso" }).locator(".coment-mais").first().tap();
await pb.locator("#opcoesCorpo button", { hasText: "Fixar no topo" }).tap(); await pb.waitForTimeout(1500);
ok((await pb.locator("#postSocial .fio-coment.fixado .coment-texto").first().textContent()) === "Comentário famoso" && (await pb.locator("#postSocial .coment-fixo").textContent()).includes("Fixado por você"), "dono fixa outro comentário no topo");
await pb.locator("#postSocial .coment-quem").tap();
await pb.locator("#opcoesCorpo button", { hasText: "Só seguidores" }).tap(); await pb.waitForTimeout(1200);
ok((await db.doc("diario/pc").get()).data().quemComenta === "seguidores", "dono: só seguidores comentam");
await pb.locator("#postSocial .fio-coment", { hasText: "sem engajamento" }).locator(".coment-mais").first().tap();
await pb.locator("#opcoesCorpo button", { hasText: "Ocultar comentário" }).tap(); await pb.waitForTimeout(1200);
ok((await db.doc("comentarios/k2").get()).data().oculto === true, "dono oculta comentário");
await pb.screenshot({ path: "saida/coment-dono.png" });
// Ana (não segue o Bruno) não vê o campo
await pa.keyboard.press("Escape"); await pa.reload(); await pa.waitForTimeout(3000);
const card2 = pa.locator(".post-card", { hasText: "Reforma do banheiro" }).first(); await card2.scrollIntoViewIfNeeded(); await pa.waitForTimeout(800);
await card2.locator(".acoes-post .acao").first().tap(); await pa.waitForTimeout(2500);
ok(await pa.locator("#folhaComentarios .novo-comentario").isHidden() && (await pa.locator("#folhaComentarios .coment-aviso").textContent()).includes("seguidores"), "quem não segue vê \"Só seguidores podem comentar\"");
ok(!(await pa.locator("#folhaComentarios").textContent()).includes("sem engajamento"), "comentário oculto some para os outros");
// quem deu estrelas: primeiro quem o dono segue (Fabi), depois a rede (Hele, seguida pela Fabi), depois o resto
await pb.locator("#postSocial .estrelas-txt").tap();
await pb.waitForSelector("#folhaEstrelas.aberta .est-quem .linha", { timeout: 10000 }); await pb.waitForTimeout(2500);
const quem = await pb.locator("#folhaEstrelas .est-quem .linha").allTextContents();
ok(quem.length === 4 && quem[0].includes("Fabi") && quem[0].includes("Você segue") && quem[1].includes("Hele") && quem[1].includes("Seguido por"), "quem deu: 1º quem você segue, 2º sua rede → " + quem.map((t) => t.replace(/\s+/g, " ").slice(0, 40)).join(" | "));
await pb.screenshot({ path: "saida/coment-quem.png" });
// Mensagens: o cartão da publicação leva até ela.
await pb.goto(new URL(`mensagens.html?conversa=${conv}`, pb.url()).href);
await pb.waitForSelector(".cm-ver", { timeout: 30000 }).catch(() => {});
const ver = pb.locator(".cm-ver", { hasText: "Ver publicação" }).last();
ok(await ver.count() === 1 && (await ver.evaluate((e) => e.closest("a")?.getAttribute("href"))) === "usuarios.html?post=pc", "Mensagens: cartão \"Ver publicação\" com o link da publicação");
await pb.screenshot({ path: "saida/coment-cartao.png" });
await A.browser.close(); await B.browser.close();
