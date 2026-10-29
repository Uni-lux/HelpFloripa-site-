// Correções pedidas em 29/10 (prints do celular):
// - "Já vi" do Flash é POR CONTA: outra conta no mesmo aparelho vê o flash como novo.
// - Mensagens: o número conta MENSAGENS (não conversas) e o sino diz "enviou 3 mensagens".
// - Gaveta do chat fechada não marca como lidas as mensagens que chegam na conversa que estava aberta.
// - Enquete antiga (votos de antes da contagem em pedaços, sem prazo): conta os votos e mostra o resultado final.
// - Local da publicação numa linha só embaixo do nome ("📍 Local · 3 h"), sem quebrar o nome.
// - Publicação com pessoas marcadas no Flash: o cartão é desenhado (com as fotinhas) sem erro.
// Uso: node t-correcoes-social.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, BASE, garantirImagem } from "./nav.mjs";
import { readFileSync } from "node:fs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const T = (min) => Timestamp.fromMillis(Date.now() - min * 60000);
const PX = "data:image/png;base64," + readFileSync(garantirImagem("saida/foto-cs.png", 800, 1000)).toString("base64");

// Dados
for (const s of (await db.collection("stories").where("autorId", "==", U.ana).get()).docs) await s.ref.delete();
const flash = await db.collection("stories").add({ autorId: U.ana, nome: "Ana", tipo: "imagem", midia: PX, criadoEm: Timestamp.now() });
await db.doc(`relacoes/${U.bruno}_${U.ana}`).set({ tipo: "seguir", seguidorId: U.bruno, alvoId: U.ana, criadoEm: Timestamp.now() });
await db.doc("diario/csLocal").set({ autorId: U.bruno, nome: "Bruno Reparos", texto: "Pôr do sol na obra", tipo: "texto", local: { nome: "Tapera da Base, Florianópolis, Santa Catarina", lat: -27.68, lng: -48.56 }, marcados: [U.ana, U.dani], criadoEm: T(1) });
// Enquete antiga: sem prazo, de 10 dias atrás, com votos só em enquete_votos (antes da contagem em pedaços).
await db.doc("diario/csEnqVelha").set({ autorId: U.bruno, nome: "Bruno Reparos", texto: "Qual cor?", enquete: { pergunta: "Qual cor da fachada?", opcoes: ["Azul", "Verde"] }, criadoEm: T(10 * 1440) });
for (const [q, op] of [["ana", 1], ["dani", 1], ["edu", 0]]) await db.doc(`enquete_votos/d_csEnqVelha_${U[q]}`).set({ alvo: "d_csEnqVelha", tipo: "d", itemId: "csEnqVelha", uid: U[q], opcao: op, criadoEm: T(9 * 1440) });
for (let f = 0; f < 10; f++) await db.doc(`enquete_contas/d_csEnqVelha_${f}`).delete().catch(() => {});
// Conversa Ana → Bruno com 3 mensagens novas
const conv = [U.ana, U.bruno].sort().join("_");
for (const d of (await db.collection(`conversas/${conv}/mensagens`).get()).docs) await d.ref.delete();
await db.doc(`conversas/${conv}`).set({ participantes: [U.ana, U.bruno].sort(), ultimaMensagem: "oi", ultimaMensagemRemetenteId: U.bruno, atualizadoEm: T(30), lidoEm: { [U.bruno]: T(30), [U.ana]: T(30) }, vistoEm: FieldValue.delete() }, { merge: true });
for (let i = 0; i < 3; i++) await db.collection(`conversas/${conv}/mensagens`).add({ remetenteId: U.ana, texto: `Mensagem ${i + 1}`, criadoEm: T(10 - i) });
await db.doc(`conversas/${conv}`).set({ ultimaMensagem: "Mensagem 3", ultimaMensagemRemetenteId: U.ana, atualizadoEm: T(8) }, { merge: true });

const { browser, ctx } = await navegador({ mobile: true });
// ---------- 1) Flash visto pela Ana não conta como visto para o Bruno (mesmo aparelho) ----------
const pa = await entrar(ctx, "ana", "feed.html");
await pa.waitForSelector(".post-card", { timeout: 30000 });
await pa.evaluate(([id, uid]) => { localStorage.setItem(`hf-stories-vistos-${uid}`, JSON.stringify([id])); localStorage.setItem("hf-stories-vistos", JSON.stringify([id])); }, [flash.id, U.ana]);
await pa.close();
const pb = await entrar(ctx, "bruno", "feed.html");
const erros = []; pb.on("pageerror", (e) => erros.push(e.message));
await pb.waitForSelector(".post-card", { timeout: 30000 }); await pb.waitForTimeout(2500);
ok(await pb.locator(".story-circ.novo").count() >= 1, "outra conta no mesmo aparelho vê o flash como NOVO");

// ---------- 2) número das Mensagens e sino ----------
await pb.waitForFunction(() => document.getElementById("badgeMensagens") && !document.getElementById("badgeMensagens").hidden, null, { timeout: 15000 }).catch(() => {});
ok((await pb.locator("#badgeMensagens").textContent()) === "3", "número das Mensagens = 3 mensagens (não 1 conversa): " + await pb.locator("#badgeMensagens").textContent());
await pb.goto(BASE + "notificacoes.html"); await pb.waitForSelector(".nt2-item", { timeout: 30000 }); await pb.waitForTimeout(1500);
ok((await pb.locator("#listaAvisos").textContent()).includes("enviou 3 mensagens"), "notificações: 'enviou 3 mensagens'");

// ---------- 3) gaveta fechada não marca como lida ----------
await pb.goto(BASE + "index.html"); await pb.waitForFunction(() => typeof window.hfAbrirChat === "function", null, { timeout: 30000 }); await pb.waitForTimeout(1500);
await pb.evaluate((c) => window.hfAbrirChat(`mensagens.html?conversa=${c}`), conv);
await pb.waitForTimeout(5000);
const lidoDepoisDeAbrir = (await db.doc(`conversas/${conv}`).get()).data().lidoEm?.[U.bruno]?.toMillis?.() || 0;
ok(lidoDepoisDeAbrir > Date.now() - 60000, "gaveta aberta na conversa: marca como lida");
await pb.locator(".hfc-topo button[aria-label='Fechar mensagens']").click(); await pb.waitForTimeout(800);
await db.collection(`conversas/${conv}/mensagens`).add({ remetenteId: U.ana, texto: "Chegou com a gaveta fechada", criadoEm: Timestamp.now() });
await db.doc(`conversas/${conv}`).set({ ultimaMensagem: "Chegou com a gaveta fechada", ultimaMensagemRemetenteId: U.ana, atualizadoEm: Timestamp.now() }, { merge: true });
await pb.waitForTimeout(4000);
const d = (await db.doc(`conversas/${conv}`).get()).data();
const lido = Math.max(d.lidoEm?.[U.bruno]?.toMillis?.() || 0, d.vistoEm?.[U.bruno]?.toMillis?.() || 0);
ok(lido < d.atualizadoEm.toMillis(), "gaveta FECHADA: a mensagem nova continua não lida");
const nMenu = await pb.evaluate(() => [...document.querySelectorAll("#menuBadge, #atalhoBadgeMensagens")].map((b) => b.hidden ? "" : b.textContent).join("|"));
ok(/1/.test(nMenu), "e aparece no número das Mensagens: " + nMenu);

// ---------- 4) enquete antiga ----------
await pb.goto(BASE + "feed.html?post=csEnqVelha"); await pb.waitForSelector(".visor-exp .enquete", { timeout: 30000 }); await pb.waitForTimeout(3000);
const enq = pb.locator(".visor-exp .enquete").first();
const rod = await enq.locator(".enq-rodape").textContent(), pcts = await enq.locator(".enq-pct").allTextContents();
ok(/Resultado final · 3 votos/.test(rod) && pcts.join() === "33%,67%", `enquete antiga: encerrada com os 3 votos antigos → "${rod.trim()}" ${pcts.join(" / ")}`);
await pb.screenshot({ path: "saida/cs-enquete-velha.png" });

// ---------- 5) local numa linha só ----------
await pb.goto(BASE + "feed.html?post=csLocal"); await pb.waitForSelector(".visor-exp .post-card .sub-linha", { timeout: 30000 }); await pb.waitForTimeout(1200);
const cab = await pb.locator(".visor-exp .post-card .post-cab").first().evaluate((c) => {
  const n = c.querySelector(".quem > button"), l = c.querySelector(".sub-linha");
  return { nomeAlt: n.getBoundingClientRect().height, linhaAlt: l.getBoundingClientRect().height, cabe: l.scrollWidth <= l.clientWidth + 1, txt: l.textContent };
});
ok(cab.nomeAlt < 26 && cab.linhaAlt < 22 && cab.cabe && /Tapera/.test(cab.txt) && /·/.test(cab.txt), "local: o nome numa linha e '📍 Local · tempo' numa linha só → " + JSON.stringify(cab));
await pb.screenshot({ path: "saida/cs-local.png" });

// ---------- 6) publicação com marcados no Flash ----------
const card = pb.locator(".visor-exp .post-card").first();
await card.locator(".acoes-post button", { hasText: "Compartilhar" }).click(); await pb.waitForTimeout(500);
await pb.locator("#opcoesCorpo button", { hasText: "Adicionar ao seu flash" }).click();
await pb.waitForSelector(".flash-criar .flash-fotobox .flash-foto", { timeout: 15000 }); await pb.waitForTimeout(800);
ok(await pb.locator(".flash-criar").count() === 1, "publicação com 2 marcados vira o cartão do flash");
await pb.screenshot({ path: "saida/cs-flash-marcados.png" });

ok(!erros.length, "sem erros na página: " + erros.join(" | ").slice(0, 300));
for (const id of ["csLocal", "csEnqVelha"]) await db.doc(`diario/${id}`).delete();
await flash.delete();
await browser.close();
process.exit(process.exitCode || 0);
