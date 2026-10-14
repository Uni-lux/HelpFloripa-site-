// Diário, parte 2: hashtags e busca, marcar pessoas (com aviso), rascunho, agendar, estatísticas, silenciar,
// stories (publicar, ver, quem viu) e aviso de reação no comentário.
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => console.log(c ? "  ✔" : "  ✘", t);
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const arq = new URL("saida/foto1.png", import.meta.url).pathname;
// Bruno segue Ana (para ver os stories dela); Ana segue Bruno
await db.doc(`relacoes/${U.bruno}_${U.ana}`).set({ tipo: "seguir", seguidorId: U.bruno, alvoId: U.ana });
await db.doc(`relacoes/${U.ana}_${U.bruno}`).set({ tipo: "seguir", seguidorId: U.ana, alvoId: U.bruno });
const A = await navegador({ mobile: true }), B = await navegador({ mobile: true });
const pa = await entrar(A.ctx, "ana", "feed.html");
await pa.waitForSelector("#btnComporFeed", { timeout: 30000 }); await pa.waitForTimeout(1500);
// 1) Publicação com hashtag e pessoa marcada
await pa.locator("#btnComporFeed").tap();
await pa.locator("#pubTexto").fill("Banheiro novinho #Reforma #floripa");
await pa.locator("#pubMarcar").tap();
await pa.waitForSelector("#folhaLista.aberta", { timeout: 5000 }); await pa.waitForTimeout(1200);
await pa.locator("#listaCorpo .linha", { hasText: "Bruno" }).first().locator("button", { hasText: "Marcar" }).tap();
await pa.keyboard.press("Escape"); await pa.waitForTimeout(300);
ok((await pa.locator("#pubMarcados").textContent()).includes("Bruno"), "compor: Bruno marcado");
await pa.locator("#pubEnviar").tap(); await pa.waitForTimeout(2500);
const pubs = (await db.collection("diario").where("autorId", "==", U.ana).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const p1 = pubs.find((p) => p.texto.startsWith("Banheiro"));
ok(p1 && JSON.stringify(p1.tags) === JSON.stringify(["reforma", "floripa"]) && p1.marcados?.[0] === U.bruno, "publicou com tags e marcados → " + JSON.stringify({ tags: p1?.tags, marcados: p1?.marcados?.length }));
// 2) Rascunho: salvar e abrir de novo
await pa.locator("#btnComporFeed").tap();
await pa.locator("#pubTexto").fill("Ideia para depois");
await pa.locator("#pubSalvarRascunho").tap(); await pa.waitForTimeout(1500);
await pa.keyboard.press("Escape"); await pa.waitForTimeout(400);
await pa.locator("#btnComporFeed").tap(); await pa.waitForTimeout(300);
ok(!(await pa.locator("#pubTexto").inputValue()), "fechou: compositor limpo");
await pa.locator("#pubRascunhos").tap(); await pa.waitForTimeout(1500);
await pa.locator("#listaCorpo .rascunho", { hasText: "Ideia para depois" }).locator("button", { hasText: "Abrir" }).tap(); await pa.waitForTimeout(400);
ok((await pa.locator("#pubTexto").inputValue()) === "Ideia para depois", "rascunho abre de volta no compositor");
// 3) Agendar para daqui a 2 h
await pa.locator("#pubTexto").fill("Promoção de amanhã #oferta");
await pa.locator("#pubAgendar").tap(); await pa.waitForTimeout(500);
const quando = new Date(Date.now() + 2 * 3600e3); const iso = new Date(quando.getTime() - quando.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
await pa.locator("#listaCorpo input[type=datetime-local]").fill(iso);
await pa.locator("#listaCorpo button", { hasText: "Agendar" }).tap(); await pa.waitForTimeout(300);
ok((await pa.locator("#pubEnviar").textContent()) === "Agendar" && (await pa.locator("#pubAgenda").textContent()).includes("Agendada"), "compor: agendado (botão vira Agendar)");
await pa.locator("#pubEnviar").tap(); await pa.waitForTimeout(2500);
const agendada = (await db.collection("diario").where("autorId", "==", U.ana).get()).docs.map((d) => d.data()).find((p) => p.texto.startsWith("Promoção"));
ok(agendada?.agendadoPara && agendada.agendadoPara.toMillis() > Date.now(), "gravou agendada");
ok((await db.collection(`rascunhos/${U.ana}/itens`).get()).size === 0, "rascunho usado foi apagado ao publicar");
// 4) Story da Ana
const escolha = pa.waitForEvent("filechooser");
await pa.locator(".story-circ").first().tap();
const fc = await escolha; await fc.setFiles(arq);
await pa.locator(".hfe-btn.pri").click({ timeout: 15000 });
await pa.waitForSelector("#folhaLista.aberta .story-previa", { timeout: 8000 });
await pa.locator("#listaCorpo input[type=text]").fill("Bom dia!");
await pa.locator("#listaCorpo button", { hasText: "Publicar story" }).tap(); await pa.waitForTimeout(2500);
ok((await db.collection("stories").where("autorId", "==", U.ana).get()).size === 1, "story publicado");
// 5) Bruno: vê o post (alcance), não vê a agendada, tem aviso de marcação, vê o story
const pb = await entrar(B.ctx, "bruno", "feed.html");
await pb.waitForSelector(".post-card", { timeout: 30000 }); await pb.waitForTimeout(2500);
ok(!(await pb.locator("#listaFeed").textContent()).includes("Promoção de amanhã"), "agendada não aparece para os outros");
const cardB = pb.locator(".post-card", { hasText: "Banheiro novinho" }).first();
await cardB.scrollIntoViewIfNeeded(); await pb.waitForTimeout(2200);
ok((await cardB.locator(".post-com").textContent()).includes("Bruno"), "post mostra \"com Bruno\"");
ok(await cardB.locator("a.hashtag").count() === 2, "hashtags viram link");
ok((await db.doc(`diario/${p1.id}/vistas/${U.bruno}`).get()).exists, "alcance: a vista do Bruno foi contada");
await cardB.locator(".estrela").nth(3).tap(); await pb.waitForTimeout(1500);
await cardB.locator(".acoes-post .acao").first().tap(); await pb.waitForTimeout(1500);
await pb.locator("#folhaComentarios .pub-acao", { hasText: "Salvar" }).tap(); await pb.waitForTimeout(1200);
await pb.keyboard.press("Escape"); await pb.waitForTimeout(300);
ok(await pb.locator(".story-circ.novo").count() === 1, "story da Ana aparece com o anel colorido");
await pb.locator(".story-circ.novo").first().tap();
await pb.waitForSelector(".story-visor img", { timeout: 8000 }); await pb.waitForTimeout(500);
ok((await pb.locator(".story-legenda").textContent()) === "Bom dia!", "story abre em tela cheia com a legenda");
await pb.screenshot({ path: "saida/story-visor.png" });
await pb.waitForTimeout(1500);
await pb.locator(".story-visor .story-btn[aria-label=Fechar]").tap(); await pb.waitForTimeout(500);
ok(await pb.locator(".story-circ.novo").count() === 0, "depois de ver, o anel fica cinza");
// busca por hashtag
await pb.goto(new URL("feed.html?tag=reforma", pb.url()).href); await pb.waitForTimeout(3500);
ok((await pb.locator("#filtroAtual").textContent()) === "#reforma" && await pb.locator(".post-card", { hasText: "Banheiro novinho" }).count() === 1, "feed.html?tag=reforma mostra a publicação");
// silenciar a Ana
await pb.goto(new URL("feed.html", pb.url()).href); await pb.waitForSelector(".post-card", { timeout: 30000 }); await pb.waitForTimeout(1500);
await pb.locator(".post-card", { hasText: "Banheiro novinho" }).first().locator(".post-cab .icone-btn").dispatchEvent("click");
await pb.locator("#opcoesCorpo button", { hasText: "Silenciar" }).tap(); await pb.waitForTimeout(1200);
ok(await pb.locator(".post-card", { hasText: "Banheiro novinho" }).count() === 0, "silenciou: as publicações da Ana somem do Diário");
await pb.reload(); await pb.waitForTimeout(4000);
ok(await pb.locator(".post-card", { hasText: "Banheiro novinho" }).count() === 0 && await pb.locator(".story-circ", { hasText: "Ana" }).count() === 0, "continua silenciada depois de recarregar (posts e stories)");
// 6) Ana: aviso, estatísticas, quem viu o story
await pa.goto(new URL("notificacoes.html", pa.url()).href); await pa.waitForTimeout(3500);
await pa.goto(new URL("usuarios.html", pa.url()).href); await pa.waitForSelector("#gradePosts .tile", { timeout: 30000 }); await pa.waitForTimeout(1200);
ok(await pa.locator("#gradePosts .tile.agendada .selo-agendada").count() === 1, "perfil da Ana: a agendada aparece com o selo");
await pa.locator("#gradePosts .tile", { hasText: "Banheiro" }).first().tap(); await pa.waitForTimeout(1500);
await pa.locator("#postExtras button", { hasText: "Estatísticas" }).tap();
await pa.waitForSelector("#folhaEstat.aberta .estat-card", { timeout: 10000 }); await pa.waitForTimeout(1500);
const cards = await pa.locator(".estat-card").allTextContents();
ok(cards[0].includes("1") && cards[1].includes("1") && cards[3].includes("1"), "estatísticas: alcance 1, estrelas 1, salvos 1 → " + cards.map((c) => c.replace(/\s+/g, " ").slice(0, 22)).join(" | "));
ok((await pa.locator("#folhaEstat").textContent()).includes("Principais"), "estatísticas: de onde vieram (Principais)");
await pa.screenshot({ path: "saida/estatisticas.png" });
// notificação da marcação para o Bruno
const pb2 = pb; await pb.goto(new URL("notificacoes.html", pb.url()).href); await pb2.waitForFunction(() => document.getElementById("listaAvisos")?.textContent.includes("marcou você"), null, { timeout: 15000 }).catch(() => {});
const txtN = await pb2.locator("#listaAvisos").textContent().catch(() => "(sem lista)");
ok(txtN.includes("marcou você"), "Bruno recebe \"marcou você numa publicação\" → " + txtN.slice(0, 120));
await A.browser.close(); await B.browser.close();
