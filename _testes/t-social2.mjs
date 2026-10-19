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
const A = await navegador({ mobile: true, camera: true }), B = await navegador({ mobile: true });
const pa = await entrar(A.ctx, "ana", "feed.html");
await pa.waitForSelector("#btnComporFeed", { timeout: 30000 }); await pa.waitForTimeout(1500);
// 1) Publicação com hashtag e pessoa marcada
await pa.locator("#btnComporFeed").tap();
await pa.locator("#pubTexto").fill("Banheiro novinho com @edulima #Reforma #floripa");
await pa.locator("#pubMarcar").tap();
await pa.waitForSelector("#folhaLista.aberta", { timeout: 5000 }); await pa.waitForTimeout(1200);
await pa.locator("#listaCorpo .linha", { hasText: "Bruno" }).first().locator("button", { hasText: "Marcar" }).tap();
await pa.keyboard.press("Escape"); await pa.waitForTimeout(300);
ok((await pa.locator("#pubMarcados").textContent()).includes("Bruno"), "compor: Bruno marcado");
await pa.locator("#pubEnviar").tap(); await pa.waitForTimeout(2500);
const pubs = (await db.collection("diario").where("autorId", "==", U.ana).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const p1 = pubs.find((p) => p.texto.startsWith("Banheiro"));
ok(p1 && JSON.stringify(p1.tags) === JSON.stringify(["reforma", "floripa"]) && p1.marcados?.[0] === U.bruno, "publicou com tags e marcados → " + JSON.stringify({ tags: p1?.tags, marcados: p1?.marcados?.length }));
ok(p1?.marcados?.includes(U.edu) && p1.marcados.length === 2, "@edulima mencionado no texto também fica marcado");
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
// Câmera já liberada: o criador abre direto na câmera do app (como Instagram/TikTok).
await pa.waitForSelector(".flash-criar .flash-cam-ui .flash-disparo", { timeout: 8000 });
await pa.waitForFunction(() => document.querySelector(".flash-cam")?.videoWidth > 0, null, { timeout: 8000 });
ok((await pa.locator(".story-circ .nome").first().textContent()) === "Seu flash", "barra: \"Seu flash\"");
await pa.screenshot({ path: "saida/flash-criar.png" });
ok(await pa.locator(".flash-filtro").count() === 10 && await pa.locator(".flash-filtro .amostra canvas").count() === 10, "câmera do app com 10 filtros, cada bolinha com a prévia real");
await pa.locator(".flash-filtro", { hasText: "Beleza+" }).tap(); await pa.waitForTimeout(600);
const telaCam = await pa.locator(".flash-cam.tela").evaluate((c) => { const k = document.createElement("canvas"); k.width = c.width; k.height = c.height; const g = k.getContext("2d"); g.drawImage(c, 0, 0); const d = g.getImageData(c.width / 2, c.height / 2, 1, 1).data; return { w: c.width, vis: getComputedStyle(c).display, px: d[0] + d[1] + d[2], gpu: !!(c.getContext("webgl") || c.getContext("experimental-webgl")) }; });
ok(await pa.locator(".flash-cambox.filtrada").count() === 1 && telaCam.w > 0 && telaCam.vis === "block" && telaCam.px > 0, "filtro Beleza+ processado ao vivo na câmera → " + JSON.stringify(telaCam));
await pa.screenshot({ path: "saida/flash-camera.png" });
await pa.locator(".flash-disparo").tap();
await pa.waitForSelector(".flash-fotobox canvas.flash-foto", { timeout: 8000 }); await pa.waitForTimeout(800);
ok(await pa.locator(".flash-cam-ui").count() === 0 && await pa.locator(".flash-palco[data-filtro=beleza2] .flash-fotobox canvas").count() === 1, "tirou a foto: a câmera fecha e a foto aparece com o filtro");
// fechar com coisa feita: janela do site (não a do navegador)
await pa.locator(".flash-topo .flash-ferr-btn[aria-label=Fechar]").tap();
await pa.waitForSelector(".hf-confirma", { timeout: 3000 });
ok((await pa.locator(".hf-confirma h3").textContent()) === "Descartar este flash?", "fechar pergunta \"Descartar este flash?\" na janela do site");
await pa.locator(".hf-confirma .nao").tap(); await pa.waitForTimeout(300);
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
// figurinhas: horário e localização
await pa.locator(".flash-ferr-btn[aria-label^='Figurinhas']").tap();
await pa.locator(".fig-op", { hasText: "Horário" }).tap(); await pa.waitForTimeout(200);
const hora = pa.locator(".flash-camada .flash-fig.fig-hora");
const fundo1 = await hora.evaluate((e) => e.style.background);
await hora.tap(); await pa.waitForTimeout(200);
ok(/^\d{2}:\d{2}$/.test(await hora.textContent()) && (await hora.evaluate((e) => e.style.background)) !== fundo1, "figurinha de horário (" + await hora.textContent() + "): um toque troca o estilo");
await pa.locator(".flash-ferr-btn[aria-label^='Figurinhas']").tap();
await pa.locator(".fig-op", { hasText: "Localização" }).tap();
await pa.locator(".fe-local").fill("Lagoa da Conceição"); await pa.locator(".fe-linha-local .fe-pronto").tap(); await pa.waitForTimeout(200);
ok((await pa.locator(".flash-camada .flash-fig.fig-local").textContent()) === "📍 Lagoa da Conceição", "figurinha de localização");
await pa.locator(".flash-legenda").fill("Bom dia!");
await pa.screenshot({ path: "saida/flash-criar-foto.png" });
await pa.locator(".flash-publicar").tap(); await pa.waitForTimeout(2500);
ok(await pa.locator(".flash-criar").count() === 0 && (await db.collection("stories").where("autorId", "==", U.ana).get()).size === 1, "flash de foto publicado");
// Seu flash: o "+" abre direto o criador (sem menu).
await pa.locator(".story-circ.meu .mais").tap();
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
const msgs = (await db.collection(`conversas/${convAB}/mensagens`).get()).docs.map((d) => d.data().cartao || {});
ok(msgs.some((c) => c.tipo === "flash" && c.acao === "resposta" && c.texto === "Que lindo!") && msgs.some((c) => c.tipo === "flash" && c.acao === "reacao" && c.emoji === "⚡"), "resposta e reação chegaram na conversa como cartão do flash → " + JSON.stringify(msgs).slice(0, 160));
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
// Seu flash: tocar na foto abre direto os seus flashes.
await pa.locator(".story-circ.meu .avatar").tap();
ok(await pa.locator("#opcoesCorpo button", { hasText: "Ver meus flashes" }).count() === 0, "tocar na foto do Seu flash abre direto (sem menu)");
await pa.waitForSelector(".story-vistos", { timeout: 8000 }); await pa.waitForTimeout(1500);
ok((await pa.locator(".story-vistos").textContent()).includes("Visto por 1"), "Ana: \"Visto por 1\" no flash → " + (await pa.locator(".story-vistos").textContent()));
await pa.locator(".story-visor .story-btn[aria-label=Fechar]").tap(); await pa.waitForTimeout(300);
await pa.goto(new URL("notificacoes.html", pa.url()).href); await pa.waitForTimeout(3500);
await pa.goto(new URL("usuarios.html", pa.url()).href); await pa.waitForSelector(".lista-textos .texto-item", { timeout: 30000 }); await pa.waitForTimeout(1200);
ok((await pa.locator(".abas-perfil button[aria-selected=true]").textContent()) === "Textos" && await pa.locator(".lista-textos .texto-item .selo-agendada").count() === 1, "perfil da Ana (só textos): abre na aba Textos, a agendada com o selo");
await pa.screenshot({ path: "saida/perfil-textos.png" });
await pa.locator(".lista-textos .texto-item", { hasText: "Banheiro" }).first().locator(".ti-cab").tap(); await pa.waitForTimeout(1500);
await pa.locator("#postExtras button", { hasText: "Estatísticas" }).tap();
await pa.waitForSelector("#folhaEstat.aberta .estat-card", { timeout: 10000 }); await pa.waitForTimeout(1500);
const cards = await pa.locator(".estat-card").allTextContents();
ok(cards[0].includes("1") && cards[1].includes("1") && cards[3].includes("1"), "estatísticas: alcance 1, estrelas 1, salvos 1 → " + cards.map((c) => c.replace(/\s+/g, " ").slice(0, 22)).join(" | "));
ok((await pa.locator("#folhaEstat").textContent()).includes("Principais"), "estatísticas: de onde vieram (Principais)");
ok(await pa.locator("#folhaEstat .estat-cab").count() === 1 && await pa.locator("#folhaEstat .estat-graf svg").count() >= 1, "estatísticas: cabeçalho e gráfico no tempo");
await pa.screenshot({ path: "saida/estatisticas.png" });
// notificação da marcação para o Bruno
const pb2 = pb; await pb.goto(new URL("notificacoes.html", pb.url()).href); await pb2.waitForFunction(() => document.getElementById("listaAvisos")?.textContent.includes("marcou você"), null, { timeout: 15000 }).catch(() => {});
const txtN = await pb2.locator("#listaAvisos").textContent().catch(() => "(sem lista)");
// perfil do Bruno: a publicação em que a Ana marcou ele aparece junto (filtro Marcações)
await pb.goto(new URL("usuarios.html", pb.url()).href); await pb.waitForSelector(".abas-perfil button", { timeout: 30000 }); await pb.waitForTimeout(2500);
const filtrosB = await pb.locator(".abas-perfil button").allTextContents();
await pb.locator(".abas-perfil button[data-aba=marcados]").tap(); await pb.waitForTimeout(1200);
ok(filtrosB.includes("Marcados") && await pb.locator("#gradePosts .tile.marcacao", { hasText: "Banheiro" }).count() === 1, "perfil do Bruno: a publicação da Ana com ele aparece em Marcados → " + filtrosB.join(" / "));
await pb.screenshot({ path: "saida/perfil-marcacoes.png" });
ok(txtN.includes("marcou você"), "Bruno recebe \"marcou você numa publicação\" → " + txtN.slice(0, 120));
await A.browser.close(); await B.browser.close();
