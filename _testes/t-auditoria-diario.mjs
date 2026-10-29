// Auditoria do Diário: passa por cada botão, link e interação da página e das publicações (celular e computador)
// e anota o que funcionou, o que falhou e os erros da página. Resultado em saida/auditoria-diario.json.
// Uso: node seed.mjs && node t-auditoria-diario.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, BASE, garantirImagem } from "./nav.mjs";
import { readFileSync, writeFileSync } from "node:fs";
const res = [];
const ok = (c, t, area = "") => { console.log(c ? "  ✔" : "  ✘", t); res.push({ ok: !!c, t, area }); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const FOTO = "data:image/png;base64," + readFileSync(garantirImagem("saida/foto-au.png", 800, 1000)).toString("base64");
const T = (min) => Timestamp.fromMillis(Date.now() - min * 60000);
const seguir = (a, b) => db.doc(`relacoes/${U[a]}_${U[b]}`).set({ tipo: "seguir", seguidorId: U[a], alvoId: U[b], criadoEm: Timestamp.now() });
await seguir("ana", "bruno"); await seguir("bruno", "ana");
await db.doc(`nicknames/brunoreparos`).set({ uid: U.bruno }, { merge: true });
await db.doc("diario/auFotos").set({ autorId: U.bruno, nome: "Bruno Reparos", texto: "Reforma completa da cozinha #reforma #floripa com @brunoreparos. " + "Detalhes do serviço e do acabamento. ".repeat(8), mediaUrl: FOTO, mediaTipo: "image", midias: [FOTO, FOTO, FOTO], tags: ["reforma", "floripa"], marcados: [U.ana], local: { nome: "Trindade, Florianópolis", lat: -27.59, lng: -48.52 }, criadoEm: T(3) });
await db.doc("diario/auEnquete").set({ autorId: U.bruno, nome: "Bruno Reparos", texto: "Ajudem a escolher", enquete: { pergunta: "Qual cor para a fachada?", opcoes: ["Branca", "Cinza", "Azul"], fimEm: Timestamp.fromMillis(Date.now() + 864e5) }, criadoEm: T(4) });
await db.doc("diario/auCaixa").set({ autorId: U.bruno, nome: "Bruno Reparos", texto: "Perguntem o que quiserem", caixa: { pergunta: "Dúvidas sobre reforma?", anonima: false }, criadoEm: T(5) });
await db.doc("diario/auTexto").set({ autorId: U.bruno, nome: "Bruno Reparos", texto: "Dica rápida: limpe as calhas antes da chuva.", criadoEm: T(6) });
await db.doc("diario/auAna").set({ autorId: U.ana, nome: "Ana Souza", texto: "Minha publicação de teste", criadoEm: T(7) });

async function rodar(mobile) {
  const tela = mobile ? "celular" : "computador";
  console.log(`\n=== ${tela} ===`);
  const { browser, ctx } = await navegador({ mobile });
  const p = await entrar(ctx, "ana", "feed.html");
  const erros = [];
  p.on("pageerror", (e) => erros.push(e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|favicon|net::ERR/.test(m.text())) erros.push("console: " + m.text().slice(0, 160)); });
  await p.waitForSelector(".post-card", { timeout: 30000 }); await p.waitForTimeout(2500);
  const A = (t, c) => ok(c, `[${tela}] ${t}`, tela);
  const fecharFolhas = async () => { for (let i = 0; i < 3 && await p.locator(".folha.aberta").count(); i++) { await p.locator(".folha.aberta [data-fechar]").last().click().catch(() => {}); await p.waitForTimeout(300); } };
  // ---- topo ----
  A("topo: casinha leva ao Início", (await p.locator(".topo a.icone-btn").first().getAttribute("href")) === "index.html");
  A("topo: marca leva ao Início", (await p.locator(".topo .marca").getAttribute("href")) === "index.html");
  A("topo: sino leva às notificações", (await p.locator('.topo a[href="notificacoes.html"]').count()) === 1);
  A("topo: engrenagem leva às configurações", (await p.locator('.topo a[href="configuracoes.html"]').count()) === 1);
  await p.locator("#btnComporFeed").click(); await p.waitForTimeout(500);
  A("topo: + abre a nova publicação", await p.locator("#folhaPublicar.aberta").count() === 1);
  const ferr = await p.locator("#folhaPublicar .pub-ferr:visible").allTextContents();
  A("formulário: Foto, Marcar, Enquete, Perguntas, Local, Agendar, Rascunhos → " + ferr.map((x) => x.trim()).join(", "), ["Foto", "Marcar", "Enquete", "Perguntas", "Local", "Agendar", "Rascunhos"].every((n) => ferr.some((x) => x.includes(n))));
  A("formulário: botão Público", await p.locator("#pubPublicoBtn").isVisible());
  await fecharFolhas();
  // ---- flash ----
  A("flash: 'Seu flash' na fileira", await p.locator(".story-circ.meu").count() === 1);
  // ---- filtros ----
  await p.locator("#filtroFeedBtn").click(); await p.waitForTimeout(300);
  A("filtro: Principais ▾ abre Principais e Amigos", await p.locator("#opcoesCorpo button", { hasText: "Amigos" }).count() === 1);
  await p.locator("#opcoesCorpo button", { hasText: "Amigos" }).click(); await p.waitForTimeout(2000);
  A("filtro: Amigos mostra quem você segue e segue você", (await p.locator(".post-card").allTextContents()).some((x) => x.includes("Bruno")));
  await p.locator("#filtroFeedBtn").click(); await p.locator("#opcoesCorpo button", { hasText: "Principais" }).click(); await p.waitForTimeout(2000);
  for (const [k, nome] of [["textos", "Textos"], ["enquetes", "Enquetes"], ["tudo", "Tudo"]]) {
    await p.locator(`#tiposFeed [data-tipo="${k}"]`).click(); await p.waitForTimeout(400);
    A(`filtro ${nome}: aceso e com publicações`, await p.locator(`#tiposFeed [data-tipo="${k}"][aria-selected="true"]`).count() === 1 && await p.locator(".post-card").count() > 0);
  }
  await p.locator('#tiposFeed [data-tipo="reels"]').click(); await p.waitForSelector(".reels", { timeout: 8000 }).catch(() => {});
  A("filtro Reels: abre os vídeos em tela cheia", await p.locator(".reels").count() === 1);
  await p.locator(".reels-btn[aria-label^='Voltar']").click(); await p.waitForTimeout(500);
  // ---- publicação com fotos ----
  const card = p.locator(".post-card", { hasText: "Reforma completa" }).first();
  await card.scrollIntoViewIfNeeded();
  A("publicação: nome e @ do autor", (await card.locator(".post-cab").textContent()).includes("@brunoreparos"));
  A("publicação: local clicável", await card.locator(".local-post").count() === 1);
  A("publicação: 'com Ana' (marcados)", (await card.locator(".post-com").textContent().catch(() => "")).includes("Ana"));
  A("publicação: #hashtag vira link", await card.locator('.post-texto a[href*="tag=reforma"]').count() >= 1);
  A("publicação: @menção vira link", await card.locator(".post-texto a", { hasText: "@brunoreparos" }).count() >= 1);
  const vm = card.locator(".ver-mais");
  if (await vm.count()) { await vm.click(); A("publicação: 'ver mais' abre o texto inteiro", await card.locator(".post-texto.curto").count() === 0); }
  A("publicação: carrossel com 3 fotos", await card.locator(".carrossel img").count() === 3);
  // estrelas
  const est = card.locator(".interacoes .int-topo button, .interacoes .int-topo [role=radio], .interacoes .int-topo .estrela").nth(3);
  if (await est.count()) { await est.click().catch(() => {}); await p.waitForTimeout(1500); }
  const nota = (await db.doc(`curtidas/auFotos_${U.ana}`).get()).data();
  A("estrelas: dar nota grava (curtidas)" + (mobile ? "" : " (de novo na mesma estrela: tira a nota)"), mobile ? !!nota && Number(nota.nota) >= 1 : !nota || !Number(nota.nota));
  // comentar
  await card.locator(".acoes-post .acao.comentar").click(); await p.waitForTimeout(800);
  A("comentar: abre os comentários", await p.locator(".folha.aberta textarea, .folha.aberta input[type=text]").count() >= 1);
  const campoC = p.locator(".folha.aberta textarea").first();
  if (await campoC.count()) { await campoC.fill("Ficou ótimo!"); await p.locator(".folha.aberta .coment-enviar").first().click(); await p.waitForTimeout(1500); }
  A("comentar: comentário gravado", (await db.collection("comentarios").where("postId", "==", "auFotos").get()).docs.some((d) => d.data().texto === "Ficou ótimo!"));
  await fecharFolhas();
  // salvar
  await card.locator(".acoes-post .acao.salvar").click(); await p.waitForTimeout(1200);
  A(mobile ? "salvar: fica 'Salvo'" : "salvar de novo: tira dos salvos", (await card.locator(".acoes-post .acao.salvar.on").count() === 1) === mobile);
  await fecharFolhas();
  // republicar
  await card.locator(".acoes-post .acao.republicar").click(); await p.waitForTimeout(1500);
  A("republicar: grava republicacoes", (await db.doc(`republicacoes/auFotos_${U.ana}`).get()).exists);
  await card.locator(".acoes-post .acao.republicar").click(); await p.waitForTimeout(1500);
  A("republicar de novo: desfaz", !(await db.doc(`republicacoes/auFotos_${U.ana}`).get()).exists);
  // compartilhar
  await card.locator(".acoes-post .acao.compartilhar").click(); await p.waitForTimeout(500);
  const opsC = await p.locator("#opcoesCorpo button").allTextContents();
  A("compartilhar: opções → " + opsC.map((x) => x.split("\n")[0].trim()).join(" | ").slice(0, 120), opsC.some((x) => /flash/i.test(x)) && opsC.some((x) => /link/i.test(x)));
  await fecharFolhas();
  // enviar
  await card.locator(".acoes-post .acao.enviar").click(); await p.waitForTimeout(800);
  A("enviar: abre a lista para mandar no Mensagens", await p.locator(".folha.aberta").count() === 1);
  await fecharFolhas();
  // menu ⋯
  await card.locator(".post-cab .icone-btn").dispatchEvent("click"); await p.waitForTimeout(300);
  const ops = await p.locator("#opcoesCorpo button").allTextContents();
  A("⋯ de outra pessoa: Ver perfil, Salvar, Coleção, Compartilhar perfil, Silenciar, Denunciar", ["Ver perfil", "salvos", "coleção", "Compartilhar perfil", "Silenciar", "Denunciar"].every((n) => ops.some((x) => x.includes(n))));
  await fecharFolhas();
  // link da publicação
  await p.goto(BASE + "feed.html?post=auFotos"); await p.waitForTimeout(3500);
  A("link feed.html?post= abre a publicação", await p.locator(".visor-exp .post-card", { hasText: "Reforma completa" }).count() === 1);
  await p.goBack(); await p.waitForTimeout(800);
  // tocar na hashtag
  await p.goto(BASE + "feed.html"); await p.waitForSelector(".post-card", { timeout: 30000 }); await p.waitForTimeout(2000);
  await p.locator('.post-texto a[href*="tag=reforma"]').first().click(); await p.waitForTimeout(2500);
  A("hashtag: abre o Diário só com #reforma", /tag=reforma/.test(p.url()) && (await p.locator("#filtroAtual").textContent()).includes("#reforma"));
  // enquete e caixa
  await p.goto(BASE + "feed.html"); await p.waitForSelector(".post-card", { timeout: 30000 }); await p.waitForTimeout(2000);
  const enq = p.locator(".post-card", { hasText: "Qual cor para a fachada?" }).first();
  await enq.scrollIntoViewIfNeeded();
  await enq.locator(".enq-op", { hasText: "Cinza" }).click().catch(() => {}); await p.waitForTimeout(1800);
  A("enquete: votar grava o voto", (await db.collection("enquete_votos").where("itemId", "==", "auEnquete").get()).size >= 1);
  const cx = p.locator(".post-card", { hasText: "Dúvidas sobre reforma?" }).first();
  await cx.scrollIntoViewIfNeeded();
  await cx.locator(".cx-form textarea").fill("Quanto custa um orçamento?"); await cx.locator(".cx-enviar").click(); await p.waitForTimeout(1800);
  A("caixa de perguntas: resposta gravada", (await db.collection("caixa_respostas").where("itemId", "==", "auCaixa").get()).size >= 1);
  // minha publicação: ⋯
  const minha = p.locator(".post-card", { hasText: "Minha publicação de teste" }).first();
  if (await minha.count()) {
    await minha.scrollIntoViewIfNeeded();
    await minha.locator(".post-cab .icone-btn").dispatchEvent("click"); await p.waitForTimeout(300);
    const m = await p.locator("#opcoesCorpo button").allTextContents();
    A("⋯ da minha: Estatísticas, Editar, Público, Apagar", ["Estatísticas", "Editar", "Público", "Apagar"].every((n) => m.some((x) => x.includes(n))));
    await fecharFolhas();
  } else A("minha publicação aparece no Diário", false);
  // barra de baixo
  await p.locator("#barraRede [data-barra=explorar]").click(); await p.waitForTimeout(1500);
  A("barra: Explorar abre sem recarregar", !(await p.locator("#painelExplorar").getAttribute("hidden")) && /aba=explorar/.test(p.url()));
  await p.locator("#barraRede [data-barra=diario]").click(); await p.waitForTimeout(1500);
  A("barra: Diário volta", (await p.locator("#painelFeed").getAttribute("hidden")) === null);
  for (const [k, url] of [["comunidade", "mural.html"], ["mensagens", "mensagens.html"], ["perfil", "usuarios.html"]]) A(`barra: ${k} → ${url}`, ((await p.locator(`#barraRede [data-barra=${k}]`).getAttribute("href")) || "").includes(url));
  // largura e layout
  const larg = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  A("nada passa da largura da tela", larg <= 0);
  if (!mobile) {
    A("computador: coluna lateral com o seu perfil", await p.locator(".lateral .eu-card").isVisible());
    A("computador: atalhos das 6 classes na lateral", await p.locator(".lateral .atalho-mini").count() === 6);
  }
  await p.screenshot({ path: `saida/auditoria-${tela}.png` });
  A("sem erros na página" + (erros.length ? ": " + erros.slice(0, 3).join(" | ").slice(0, 300) : ""), !erros.length);
  await browser.close();
}
await rodar(true);
await rodar(false);
writeFileSync("saida/auditoria-diario.json", JSON.stringify(res, null, 1));
for (const id of ["auFotos", "auEnquete", "auCaixa", "auTexto", "auAna"]) await db.doc(`diario/${id}`).delete().catch(() => {});
process.exit(process.exitCode || 0);
