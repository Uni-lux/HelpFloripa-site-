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
// 4) Flash da Ana: um de foto (com legenda) e um de texto
await pa.locator(".story-circ").first().tap();
await pa.waitForSelector(".flash-criar .flash-escolher .flash-esc-btn", { timeout: 5000 });
ok((await pa.locator(".story-circ .nome").first().textContent()) === "Seu flash", "barra: \"Seu flash\"");
await pa.screenshot({ path: "saida/flash-criar.png" });
const escolha = pa.waitForEvent("filechooser");
await pa.locator(".flash-esc-btn", { hasText: "Galeria" }).tap();
const fc = await escolha; await fc.setFiles(arq);
await pa.waitForSelector(".flash-midia img.flash-foto", { timeout: 8000 });
// arrastar a foto no cartão (sem editor separado) e escrever por cima
const pal = await pa.locator(".flash-palco").boundingBox();
await pa.mouse.move(pal.x + pal.width / 2, pal.y + pal.height / 2); await pa.mouse.down(); await pa.mouse.move(pal.x + pal.width / 2 + 3, pal.y + pal.height / 2 + 40, { steps: 5 });
ok(await pa.locator(".flash-palco.movendo .fx-faixa.cima").count() === 1, "ao mexer na foto aparecem as faixas de segurança");
await pa.mouse.up();
await pa.locator(".flash-ferr-btn[aria-label='Escrever na foto']").tap();
await pa.locator(".fe-campo").fill("Novidade!");
await pa.locator(".fe-cores button").nth(2).tap(); await pa.locator(".flash-ferr-btn.destaque").tap();
await pa.locator(".fe-pronto").tap(); await pa.waitForTimeout(300);
ok((await pa.locator(".flash-camada .flash-txt").textContent()) === "Novidade!" && await pa.locator(".flash-txt.destaque").count() === 1, "texto por cima da foto, com cor e destaque");
await pa.locator(".flash-legenda").fill("Bom dia!");
await pa.screenshot({ path: "saida/flash-criar-foto.png" });
await pa.locator(".flash-publicar").tap(); await pa.waitForTimeout(2500);
ok(await pa.locator(".flash-criar").count() === 0 && (await db.collection("stories").where("autorId", "==", U.ana).get()).size === 1, "flash de foto publicado");
await pa.locator(".story-circ").first().tap();
await pa.locator("#opcoesCorpo button", { hasText: "Novo flash" }).tap();
await pa.locator(".flash-modos button", { hasText: "Texto" }).tap();
await pa.waitForSelector(".flash-criar .flash-texto", { timeout: 5000 });
ok(await pa.locator(".flash-publicar:disabled").count() === 1, "texto vazio: não publica");
await pa.locator(".flash-texto").fill("Promoção relâmpago hoje até 18h!");
await pa.locator(".flash-ferr-btn").last().tap(); await pa.locator(".flash-ferr-btn.letra").tap(); await pa.waitForTimeout(300);
await pa.screenshot({ path: "saida/flash-criar-texto.png" });
await pa.locator(".flash-publicar").tap(); await pa.waitForTimeout(2500);
const flashes = (await db.collection("stories").where("autorId", "==", U.ana).get()).docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.criadoEm.toMillis() - b.criadoEm.toMillis());
ok(flashes.length === 2 && flashes[1].tipo === "imagem" && flashes[1].midia.startsWith("data:image/jpeg") && !flashes[1].texto, "flash de texto publicado como foto 1080×1920 (" + Math.round((flashes[1]?.midia.length || 0) / 1024) + " KB)");
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
await cardB.locator(".interacoes .acao.salvar").tap(); await pb.waitForTimeout(1200);
ok(await pb.locator(".story-circ.novo").count() === 1, "flash da Ana aparece com o anel colorido (2 pedaços)");
await pb.locator("#storiesFeed").screenshot({ path: "saida/flash-barra.png" });
await pb.locator(".story-circ.novo").first().tap();
await pb.waitForSelector(".story-visor img", { timeout: 8000 }); await pb.waitForTimeout(500);
ok((await pb.locator(".story-legenda").textContent()) === "Bom dia!" && (await pb.locator(".story-chip").textContent()).includes("Flash"), "flash abre em tela cheia com a legenda e o selo ⚡ Flash");
await pb.screenshot({ path: "saida/flash-visor.png" });
// responder e reagir: vão para o Mensagens
await pb.locator(".story-responder input").tap(); await pb.waitForTimeout(400);
ok(await pb.locator(".story-caixa.digitando .story-bandeja").count() === 1, "ao escrever: pausa e mostra as reações rápidas");
await pb.screenshot({ path: "saida/flash-responder.png" });
await pb.locator(".story-responder input").fill("Que lindo!");
await pb.locator(".story-env").tap(); await pb.waitForTimeout(2000);
await pb.locator(".story-raio").tap(); await pb.waitForTimeout(2000);
const convAB = [U.ana, U.bruno].sort().join("_");
const msgs = (await db.collection(`conversas/${convAB}/mensagens`).get()).docs.map((d) => d.data().texto);
ok(msgs.some((t) => t.includes("Respondeu ao seu flash: Que lindo!")) && msgs.some((t) => t.includes("⚡ Reagiu ao seu flash")), "resposta e reação chegaram na conversa → " + msgs.join(" | ").slice(0, 120));
await pb.locator(".story-toque.dir").tap(); await pb.waitForTimeout(800);
await pb.screenshot({ path: "saida/flash-texto.png" });
await pb.locator(".story-visor .story-btn[aria-label=Fechar]").tap(); await pb.waitForTimeout(500);
ok(await pb.locator(".story-circ.novo").count() === 0, "depois de ver os dois, o anel fica cinza");
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
// 6) Ana: quem viu o flash, aviso, estatísticas
await pa.reload(); await pa.waitForSelector(".story-circ.tem", { timeout: 30000 }); await pa.waitForTimeout(1200);
await pa.locator(".story-circ").first().tap();
await pa.locator("#opcoesCorpo button", { hasText: "Ver meus flashes" }).tap();
await pa.waitForSelector(".story-vistos", { timeout: 8000 }); await pa.waitForTimeout(1500);
ok((await pa.locator(".story-vistos").textContent()).includes("Visto por 1"), "Ana: \"Visto por 1\" no flash → " + (await pa.locator(".story-vistos").textContent()));
await pa.locator(".story-visor .story-btn[aria-label=Fechar]").tap(); await pa.waitForTimeout(300);
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
