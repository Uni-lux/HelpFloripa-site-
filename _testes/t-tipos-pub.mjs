// Tipos de publicação (Texto · Foto · Vídeo · Enquete · Perguntas), cada um com as suas regras e ajustes.
// - Texto com UMA imagem = cartão "casado" (diario.tipo texto + estilo casada), também na aba Textos do perfil.
// - No Texto, uma 2ª imagem muda para Foto; trocar de tipo tira o que não cabe (enquete ↔ caixa, fotos a mais).
// - Ajustes: quem pode comentar e ocultar o número de estrelas (gravados na publicação); outra pessoa não vê o número.
// - Hashtag põe "#" no texto. Marcados aparecem com as fotinhas empilhadas (até 3 e +N).
// Uso: node t-tipos-pub.mjs (rodar seed.mjs antes; precisa das regras do repositório)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, BASE, garantirImagem } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const meus = async () => (await db.collection("diario").where("autorId", "==", U.ana).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const antes = new Set((await meus()).map((p) => p.id));
const novo = async (txt) => (await meus()).find((p) => !antes.has(p.id) && (p.texto || "").startsWith(txt));
const fotos = [0, 1, 2].map((i) => garantirImagem(`saida/tp-foto${i}.png`, 1000 + i * 10, 700));

const { browser, ctx } = await navegador({ mobile: true });
const p = await entrar(ctx, "ana", "feed.html");
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector("#btnComporFeed", { timeout: 30000 }); await p.waitForTimeout(1500);
const abrirForm = async () => { await p.locator("#btnComporFeed").click(); await p.waitForSelector("#folhaPublicar.aberta"); await p.waitForTimeout(300); };
const foto = async (f) => { await p.setInputFiles("#pubArquivoFoto", f); await p.locator(".hfe-btn.pri").click({ timeout: 15000 }); await p.waitForTimeout(500); };
const publicar = async () => { await p.locator("#pubEnviar").click(); await p.waitForFunction(() => !document.getElementById("folhaPublicar")?.classList.contains("aberta"), null, { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(1500); };

// ---------- 1) Texto com imagem casada ----------
await abrirForm();
await p.locator("#pubTexto").fill("Toda reforma começa com um bom planejamento.");
await p.locator("#pubHashtag").click(); await p.keyboard.type("dica");
ok((await p.locator("#pubTexto").inputValue()).endsWith(" #dica"), "Hashtag põe o # no texto");
await foto(fotos[0]);
ok(await p.locator("#pubPrevia .casada .casada-foto img").count() === 1 && (await p.locator("#pubPrevia .casada-texto").textContent()).includes("bom planejamento"), "prévia do texto com imagem casada");
ok((await p.locator("#pubCont").textContent()).endsWith("/500"), "com imagem, o contador vai até 500: " + await p.locator("#pubCont").textContent());
await p.screenshot({ path: "saida/tp-casada-form.png" });
// Ajustes: quem comenta e ocultar estrelas
await p.locator("#pubAjustes").click(); await p.waitForSelector("#folhaLista.aberta .pub-ajustes");
ok((await p.locator("#tLista").textContent()).includes("Texto") && await p.locator(".pub-regras li").count() >= 3, "Ajustes mostram as regras do tipo Texto");
await p.locator(".pub-ajustes .pa-chip", { hasText: "Seguidores" }).click();
await p.locator(".pub-ajustes .enq-chave", { hasText: "Ocultar o número" }).click();
await p.screenshot({ path: "saida/tp-ajustes.png" });
await p.locator("#folhaLista [data-fechar]").first().click(); await p.waitForTimeout(400);
ok(await p.locator("#pubAjustes.ativo").count() === 1, "Ajustes ficam marcados");
await publicar();
const casada = await novo("Toda reforma");
ok(casada?.tipo === "texto" && casada.estilo === "casada" && casada.mediaUrl && !casada.midias && casada.quemComenta === "seguidores" && casada.ocultarNotas === true, "gravado: " + JSON.stringify({ tipo: casada?.tipo, estilo: casada?.estilo, qc: casada?.quemComenta, on: casada?.ocultarNotas }));
await p.waitForSelector(".post-card .casada", { timeout: 10000 });
const card = p.locator(".post-card", { has: p.locator(".casada") }).first();
ok(await card.locator(".post-midia-f").count() === 0 && await card.locator(".post-texto").count() === 0 && await card.locator(".casada-texto a.hashtag").count() === 1, "Diário: um cartão só (imagem + texto), com a #hashtag como link");
await card.scrollIntoViewIfNeeded(); await p.screenshot({ path: "saida/tp-casada-diario.png" });

// ---------- 2) Foto: a 2ª imagem no Texto muda para Foto ----------
await abrirForm();
await p.locator("#pubTexto").fill("Antes e depois da cozinha");
await foto(fotos[0]); await foto(fotos[1]);
ok(await p.locator("#pubTipoFoto.ativo").count() === 1 && await p.locator("#pubPrevia .pub-foto").count() === 2, "no Texto, a 2ª imagem muda para Foto (2 miniaturas)");
await foto(fotos[2]);
// marcar 4 pessoas → fotinhas empilhadas
for (const [uid, nome] of [[U.bruno, "Bruno"], ["mod1", "Moderador"], ["dono1", "Dono"], ["carla1", "Carla"]]) await db.doc(`perfis_publicos/${uid}`).set({ nome }, { merge: true });
await p.evaluate(() => 0);
await publicar();
const pf = await novo("Antes e depois");
ok(pf?.tipo === "foto" && pf.midias?.length === 3 && !pf.estilo, "gravado como Foto com 3 fotos");
await db.doc(`diario/${pf.id}`).update({ marcados: [U.bruno, "mod1", "dono1", "carla1"] });

// ---------- 3) Enquete ↔ Perguntas: um tipo por vez ----------
await abrirForm();
await p.locator("#pubEnqueteBtn").click();
await p.locator("#pubEnquete .pe-pergunta").fill("Qual cor para a fachada?");
const ops = p.locator("#pubEnquete .pe-opcao input"); await ops.nth(0).fill("Branca"); await ops.nth(1).fill("Cinza");
await p.locator("#pubCaixaBtn").click(); await p.waitForTimeout(300);
ok(!(await p.locator("#pubEnquete").isVisible()) && await p.locator("#pubCaixa").isVisible(), "trocar para Perguntas tira a enquete");
await p.locator("#pubEnqueteBtn").click();
await p.locator("#pubEnquete .pe-pergunta").fill("Qual cor para a fachada?");
await ops.nth(0).fill("Branca"); await ops.nth(1).fill("Cinza");
await p.locator("#pubAjustes").click(); await p.waitForSelector("#folhaLista.aberta .pub-ajustes");
await p.locator(".pub-ajustes .enq-chave", { hasText: "Votação anônima" }).click();
await p.locator("#folhaLista [data-fechar]").first().click(); await p.waitForTimeout(300);
ok(await p.locator("#pubEnquete .enq-chave input:checked").count() === 1, "Ajustes → votação anônima liga a chave da enquete");
await publicar();
const pe = (await meus()).find((x) => !antes.has(x.id) && x.enquete?.pergunta === "Qual cor para a fachada?");
ok(pe?.tipo === "enquete" && pe.enquete.anonima === true && !pe.caixa, "gravado como Enquete anônima");

// ---------- 4) Perguntas sem texto ----------
await abrirForm();
await p.locator("#pubCaixaBtn").click();
await p.locator("#pubCaixa .pe-pergunta").fill("O que você quer saber sobre reformas?");
await publicar();
const pc = (await meus()).find((x) => !antes.has(x.id) && x.caixa?.pergunta?.startsWith("O que você quer"));
ok(pc?.tipo === "caixa" && !pc.enquete, "gravado como Perguntas");

// ---------- 5) validações ----------
await abrirForm();
await p.locator("#pubTipoFoto").click({ noWaitAfter: true }).catch(() => {}); await p.waitForTimeout(300);
await p.locator("#pubTexto").fill("Foto sem foto");
await p.locator("#pubEnviar").click(); await p.waitForTimeout(600);
ok((await p.locator(".toast").allTextContents()).join(" ").includes("pelo menos uma foto"), "Foto sem foto avisa");
await p.locator("#pubTipoTexto").click();
await p.locator("#pubTexto").fill("x".repeat(600)); await foto(fotos[0]);
await p.locator("#pubEnviar").click(); await p.waitForTimeout(600);
ok((await p.locator(".toast").allTextContents()).join(" ").includes("500 letras") && await p.locator("#folhaPublicar.aberta").count() === 1, "Texto com imagem e mais de 500 letras avisa e não publica");
await p.locator("#folhaPublicar [data-fechar]").first().click(); await p.waitForTimeout(400);

// ---------- 6) quem vê: estrelas ocultas, marcados empilhados, perfil ----------
const B = await navegador({ mobile: true });
const pb = await entrar(B.ctx, "bruno", `feed.html?post=${casada.id}`);
await pb.waitForSelector(".visor-exp .post-card .casada", { timeout: 20000 }); await pb.waitForTimeout(1200);
ok(await pb.locator(".visor-exp .post-card").first().locator(".int-topo.sem-notas").count() === 1, "outra pessoa não vê o número de estrelas (ocultado)");
await pb.goto(BASE + `feed.html?post=${pf.id}`); await pb.waitForSelector(".visor-exp .post-card .pilha-pessoas", { timeout: 20000 }); await pb.waitForTimeout(1500);
const pil = pb.locator(".visor-exp .post-card").first().locator(".pilha-pessoas");
ok(await pil.locator(".pilha-rostos .avatar").count() === 3 && (await pil.locator(".pilha-mais").textContent()) === "+1" && /e mais 3 pessoas/.test(await pil.textContent()), "4 marcados: 3 fotinhas + '+1' e 'com X e mais 3 pessoas': " + await pil.textContent());
await pb.screenshot({ path: "saida/tp-marcados.png" });
await pil.click(); await pb.waitForSelector("#folhaLista.aberta .linha", { timeout: 8000 });
ok(await pb.locator("#folhaLista.aberta .linha").count() === 4, "tocar abre a lista das 4 pessoas");
await B.browser.close();
await p.goto(BASE + "usuarios.html"); await p.waitForSelector(".abas-perfil", { timeout: 20000 }); await p.waitForTimeout(1500);
await p.locator('.abas-perfil [data-aba="textos"]').click(); await p.waitForTimeout(1200);
ok(await p.locator(".texto-item .casada").count() >= 1, "perfil: o texto casado fica na aba Textos (com a imagem)");
await p.screenshot({ path: "saida/tp-perfil-textos.png" });

ok(!erros.length, "sem erros na página: " + erros.join(" | ").slice(0, 300));
for (const x of await meus()) if (!antes.has(x.id)) await db.doc(`diario/${x.id}`).delete();
await browser.close();
process.exit(process.exitCode || 0);
