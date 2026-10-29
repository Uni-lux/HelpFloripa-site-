// Público da publicação (idade, gênero, lugar, seguidores) e Reels (vídeos em tela cheia).
// - Quem lê só vê no Diário as publicações em que está no público; no link continua vendo.
// - Formulário: "Público: Todos ▾" → escolher e gravar diario.publico; ⋯ → mudar depois; aviso no cartão do autor.
// - Configurações → Gênero (privado).
// - Ícone de vídeo do filtro abre os Reels: toca, ações na lateral, voltar fecha.
// Uso: node t-publico-reels.mjs (rodar seed.mjs antes; precisa das regras do repositório)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, BASE } from "./nav.mjs";
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
if (!existsSync("saida/reel.webm")) execSync(`ffmpeg -y -loglevel error -f lavfi -i "testsrc=size=270x480:rate=15" -t 3 -c:v libvpx -b:v 150k saida/reel.webm`);
const VIDEO = "data:video/webm;base64," + readFileSync("saida/reel.webm").toString("base64");
const T = (min) => Timestamp.fromMillis(Date.now() - min * 60000);
// Ana: 36 anos, mulher, de SC, segue o Bruno.
await db.doc(`usuarios/${U.ana}`).set({ dataNascimento: "1990-05-01", genero: "f", uf: "SC", cidadeIbge: 4205407 }, { merge: true });
await db.doc(`relacoes/${U.ana}_${U.bruno}`).set({ tipo: "seguir", seguidorId: U.ana, alvoId: U.bruno, criadoEm: Timestamp.now() });
const casos = [
  ["paMulheres", { genero: "f" }, true],
  ["paJovens", { idadeMin: 18, idadeMax: 24 }, false],
  ["paRS", { local: "estados", ufs: ["RS"] }, false],
  ["paSC", { local: "estados", ufs: ["SC", "PR"] }, true],
  ["paSeguidores", { seguidores: "seguidores" }, true],
  ["paNovos", { seguidores: "novos" }, false],
  ["paHomens", { genero: "m" }, false],
  ["paLonge", { local: "perto", perto: { lat: -3.73, lng: -38.52, km: 25, nome: "Fortaleza" } }, false],
  ["paTodos", null, true]
];
let k = 0;
for (const [id, publico] of casos) await db.doc(`diario/${id}`).set({ autorId: U.bruno, nome: "Bruno Reparos", texto: `Teste público ${id}`, criadoEm: T(5 + k++), ...(publico ? { publico } : {}) });
await db.doc("diario/reel1").set({ autorId: U.bruno, nome: "Bruno Reparos", texto: "Antes e depois da obra #reforma", mediaUrl: VIDEO, mediaTipo: "video", criadoEm: T(2) });
await db.doc("diario/reel2").set({ autorId: U.bruno, nome: "Bruno Reparos", texto: "Segundo vídeo", mediaUrl: VIDEO, mediaTipo: "video", criadoEm: T(3) });
await db.doc("diario/reelHomens").set({ autorId: U.bruno, nome: "Bruno Reparos", texto: "Vídeo só para homens", mediaUrl: VIDEO, mediaTipo: "video", criadoEm: T(1), publico: { genero: "m" } });

// Escala nacional: perfis em vários estados para o alcance estimado (contagem no servidor, em lotes de 30).
const NAC = [["PR", 4106902, 40], ["BA", 2927408, 25], ["AM", 1302603, 12], ["RS", 4314902, 18]];
let lote = db.batch(), nNac = 0;
for (const [uf, ibge, n] of NAC) for (let i = 0; i < n; i++) { lote.set(db.doc(`perfis_publicos/paNac_${uf}_${i}`), { nome: `Teste ${uf} ${i}`, uf, cidadeIbge: ibge }); nNac++; }
await lote.commit();
const { browser, ctx } = await navegador({ mobile: true });
const p = await entrar(ctx, "ana", "feed.html");
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector(".post-card", { timeout: 30000 }); await p.waitForTimeout(2500);
// mostra tudo o que foi lido (o Diário mostra 10 por vez)
for (let i = 0; i < 4 && await p.locator("#maisFeed:not([hidden])").count(); i++) { await p.locator("#maisFeed").click(); await p.waitForTimeout(800); }
const txt = (await p.locator(".post-card").allTextContents()).join(" | ");
for (const [id, , ve] of casos) ok(txt.includes(`Teste público ${id}`) === ve, `${ve ? "vê" : "não vê"} ${id}`);

// link direto: aparece mesmo fora do público
await p.goto(BASE + "feed.html?post=paHomens"); await p.waitForTimeout(3500);
ok(await p.locator(".visor-exp .post-card", { hasText: "Teste público paHomens" }).count() === 1, "pelo link, a publicação fora do público aparece");

// ---------- Reels ----------
await p.goto(BASE + "feed.html"); await p.waitForSelector(".post-card", { timeout: 30000 }); await p.waitForTimeout(1500);
await p.locator('#tiposFeed [data-tipo="reels"]').click();
await p.waitForSelector(".reels .reel", { timeout: 10000 }); await p.waitForTimeout(1500);
ok(await p.locator(".reels .reel").count() === 2, "Reels: os 2 vídeos (o 'só para homens' não aparece)");
const tocando = await p.locator(".reels .reel video").first().evaluate((v) => !v.paused && v.readyState >= 2);
ok(tocando, "Reels: o primeiro vídeo toca sozinho");
ok(await p.locator(".reels .reel").first().locator(".reel-lado .acao").count() === 5 && await p.locator(".reels .reel").first().locator(".reel-info .int-topo").count() === 1, "Reels: ações na lateral e estrelas embaixo");
ok((await p.locator(".reels .reel").first().locator(".reel-legenda").textContent()).includes("Antes e depois"), "Reels: legenda do vídeo");
await p.screenshot({ path: "saida/reels.png" });
await p.locator(".reels .reel").first().locator("video").click(); await p.waitForTimeout(700);
ok(await p.locator(".reels .reel.parado").count() === 1, "Reels: tocar pausa");
await p.locator(".reels-lista").evaluate((l) => l.scrollBy(0, l.clientHeight)); await p.waitForTimeout(1500);
ok(await p.locator(".reels .reel").nth(1).locator("video").evaluate((v) => !v.paused), "Reels: deslizar passa para o próximo e ele toca");
await p.goBack(); await p.waitForTimeout(700);
ok(await p.locator(".reels").count() === 0 && /feed\.html/.test(p.url()), "Reels: voltar fecha e fica no Diário");

// ---------- formulário: escolher o público ----------
await p.locator("#btnComporFeed").click(); await p.waitForTimeout(600);
ok((await p.locator("#pubPublicoTxt").textContent()).includes("Todos"), "formulário: 'Público: Todos'");
ok(await p.locator("button#pubPublicoBtn").count() === 0 && await p.locator("#pubPublicoFerr").count() === 1, "público na grade 'Adicionar à publicação'; no topo só o rótulo");
await p.locator("#pubPublicoFerr").click(); await p.waitForSelector(".pa-pagina .pa-opcao", { timeout: 5000 });
await p.waitForSelector(".pa-alc-n:not(:has-text('…'))", { timeout: 8000 });
const todos = Number((await p.locator(".pa-alc-n").textContent()).replace(/\D/g, ""));
ok(todos >= 1, "alcance com todos: " + todos);
await p.screenshot({ path: "saida/publico-tela.png" });
await p.locator(".pa-opcao", { hasText: "Personalizado" }).click();
await p.locator(".pa-chip", { hasText: "Mulheres" }).click();
await p.locator(".pa-chip", { hasText: "25–34" }).click();
await p.locator(".pa-aba", { hasText: "Estados" }).click();
await p.locator(".pa-ufs .pa-chip", { hasText: "SC" }).click();
await p.locator(".pa-ufs .pa-chip", { hasText: "PR" }).click();
await p.waitForTimeout(1200);
const resumo = await p.locator(".pa-resumo > strong").textContent();
ok(/Mulheres/.test(resumo) && /25–34/.test(resumo) && /SC, PR/.test(resumo), "resumo do público: " + resumo);
const alc = await p.locator(".pa-alcance").textContent();
ok(Number(alc.replace(/\D/g, "")) >= 40, "alcance SC+PR conta os 40 perfis do PR: " + alc);
ok(/até/.test(alc), "alcance com idade/gênero diz 'até': " + alc);
ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 390 && await p.locator(".pa-corpo").evaluate((c) => c.scrollWidth <= c.clientWidth + 1), "página de público cabe na tela do celular");
await p.screenshot({ path: "saida/publico-escolhido.png", fullPage: false });
// Cidades em outros estados (Salvador e Manaus) e raio de 25 km a partir de Porto Alegre
await p.locator(".pa-aba", { hasText: "Cidades" }).click();
await p.locator(".pa-cid-linha select").selectOption("BA"); await p.locator(".pa-cid-linha .pa-busca").fill("Salvador"); await p.locator(".pa-sug-it", { hasText: "Salvador/BA" }).first().click();
await p.locator(".pa-cid-linha select").selectOption("AM"); await p.locator(".pa-cid-linha .pa-busca").fill("Manaus"); await p.locator(".pa-sug-it", { hasText: "Manaus/AM" }).first().click();
await p.waitForTimeout(1500);
ok(Number((await p.locator(".pa-alc-n").textContent()).replace(/\D/g, "")) === 37, "alcance Salvador + Manaus = 37: " + await p.locator(".pa-alcance").textContent());
await p.locator(".pa-aba", { hasText: "Estados" }).click();
// salvar o público para usar de novo
await p.locator(".pa-salvar input").fill("Clientes do Sul");
await p.locator(".pa-salvar button").click(); await p.waitForTimeout(1200);
ok(((await db.doc(`usuarios/${U.ana}`).get()).data().publicosSalvos || []).some((x) => x.nome === "Clientes do Sul"), "público salvo na conta");
await p.locator(".pa-ok").click(); await p.waitForTimeout(500);
ok((await p.locator("#pubPublicoTxt").textContent()).includes("Mulheres") && await p.locator("#pubPublicoBtn.ativo").count() === 1 && await p.locator("#pubPublicoFerr.ativo").count() === 1, "topo mostra o público escolhido");
await p.locator("#pubTexto").fill("Promoção só para quem é de SC e PR");
await p.locator("#pubEnviar").click(); await p.waitForTimeout(3000);
const meu = (await db.collection("diario").where("autorId", "==", U.ana).get()).docs.map((d) => ({ id: d.id, ...d.data() })).find((x) => x.texto?.startsWith("Promoção só"));
ok(meu?.publico?.genero === "f" && meu.publico.idadeMin === 25 && meu.publico.idadeMax === 34 && meu.publico.local === "estados" && meu.publico.ufs.join() === "SC,PR", "gravado: " + JSON.stringify(meu?.publico));
await p.waitForTimeout(1500);
const meuCard = p.locator(".post-card", { hasText: "Promoção só" }).first();
ok(await meuCard.locator(".post-publico").count() === 1, "no seu cartão aparece o público (só para você)");
await meuCard.locator(".post-cab .icone-btn").dispatchEvent("click"); await p.waitForTimeout(300);
await p.locator("#opcoesCorpo button", { hasText: "Público da publicação" }).click(); await p.waitForSelector(".pa-pagina .pa-opcao", { timeout: 5000 });
ok(await p.locator(".pa-salvo", { hasText: "Clientes do Sul" }).count() === 1, "público salvo aparece para usar de novo");
await p.locator(".pa-opcao", { hasText: "Automático" }).click(); await p.locator(".pa-ok").click(); await p.waitForTimeout(1500);
ok((await db.doc(`diario/${meu.id}`).get()).data().publico == null, "⋯ → Público → 'Para todos' tira o público");

// ---------- Configurações → Gênero ----------
// voltar do celular fecha a página de público sem mudar
await meuCard.locator(".post-cab .icone-btn").dispatchEvent("click"); await p.waitForTimeout(300);
await p.locator("#opcoesCorpo button", { hasText: "Público da publicação" }).click(); await p.waitForSelector(".pa-pagina", { timeout: 5000 });
await p.goBack(); await p.waitForTimeout(700);
ok(await p.locator(".pa-pagina").count() === 0 && /feed\.html/.test(p.url()), "voltar fecha a página de público e fica no Diário");
await db.doc(`usuarios/${U.ana}`).update({ publicosSalvos: [] });
await p.goto(BASE + "configuracoes.html"); await p.waitForSelector("#cfgGenero", { timeout: 20000 }); await p.waitForTimeout(800);
ok(await p.locator('#cfgGenero [data-valor="f"].on').count() === 1, "Configurações: gênero já marcado (Feminino)");
await p.locator('#cfgGenero [data-valor="m"]').click(); await p.waitForTimeout(1200);
ok((await db.doc(`usuarios/${U.ana}`).get()).data().genero === "m", "Configurações: gênero salvo");
await p.locator('#cfgGenero [data-valor=""]').click(); await p.waitForTimeout(1200);
ok(!("genero" in (await db.doc(`usuarios/${U.ana}`).get()).data()), "Configurações: 'Prefiro não dizer' apaga o gênero");
await p.screenshot({ path: "saida/cfg-genero.png" });

ok(!erros.length, "sem erros na página: " + erros.join(" | ").slice(0, 300));
for (const [id] of casos) await db.doc(`diario/${id}`).delete();
for (const [uf, , n] of NAC) for (let i = 0; i < n; i++) await db.doc(`perfis_publicos/paNac_${uf}_${i}`).delete();
for (const id of ["reel1", "reel2", "reelHomens"]) await db.doc(`diario/${id}`).delete();
await browser.close();
process.exit(process.exitCode || 0);
