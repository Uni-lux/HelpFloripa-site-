// Publicações bem formatadas (10/11/2026, pedido do dono): título em cima, descrição com "ver mais / ver menos",
// #hashtags SEMPRE no fim (etiquetas), "Formatar texto", modelos (texto, texto + imagem, fotos, enquete), prévia,
// rascunho automático (sair do app no meio) e "Sair da publicação?".
// Uso: node seed.mjs && node t-pub-formatada.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const meus = async () => (await db.collection("diario").where("autorId", "==", U.ana).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const antes = new Set((await meus()).map((p) => p.id));
const novo = async (f) => (await meus()).find((p) => !antes.has(p.id) && f(p));
const F = (n) => `saida/fotos-pub/${n}.jpg`;

const { browser, ctx } = await navegador({ mobile: true });
const p = await entrar(ctx, "ana", "feed.html");
if (process.env.CLARO !== "1") await p.emulateMedia({ colorScheme: "dark" }); // prints no tema escuro
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("hf-pub-auto-")).forEach((k) => localStorage.removeItem(k)));
await p.waitForSelector("#btnComporFeed", { timeout: 30000 }); await p.waitForTimeout(1500);
const abrirForm = async () => { await p.locator("#btnComporFeed").click(); await p.waitForSelector("#folhaPublicar.aberta"); await p.waitForTimeout(300); };
const foto = async (f) => {
  const n = await p.locator("#pubPrevia img").count();
  await p.setInputFiles("#pubArquivoFoto", f); await p.locator(".hfe-btn.pri").click({ timeout: 15000 });
  await p.waitForFunction((k) => document.querySelectorAll("#pubPrevia img").length > k || !document.querySelector(".hfe-fundo"), n, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(400);
};
const publicar = async () => { await p.locator("#pubEnviar").click(); await p.waitForFunction(() => !document.getElementById("folhaPublicar")?.classList.contains("aberta"), null, { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(1500); };
const modelo = (k) => p.locator(`#pubModelos [data-modelo="${k}"]`).click();
const cartao = (txt) => p.locator(".post-card", { hasText: txt }).first();

// ---------- 1) Título + Formatar texto + hashtags no fim + "ver mais / ver menos" ----------
await abrirForm();
ok(await p.locator("#pubTitulo").count() === 1, "campo de título em cima");
await p.locator("#pubTitulo").fill("reforma da cozinha: antes e depois");
const bagunca = "bom dia galera!hoje terminei a reforma da cozinha,ficou linda .   #reforma #Floripa\n\n\n\nquem quiser o contato do pedreiro chama no privado!!!!!! #obra\n- armários novos\n- bancada de granito\n- iluminação de led embaixo dos armários\nvaleu demais pela ajuda de todo mundo que indicou o pessoal aqui no Help Floripa, foi tudo muito rápido e o preço ficou dentro do combinado";
await p.locator("#pubTexto").fill(bagunca);
ok(await p.locator("#pubTagsPrev b").count() === 3, "mostra as hashtags que vão para o fim");
await p.screenshot({ path: "saida/pf-01-antes-formatar.png" });
await p.locator("#pubFormatar").click(); await p.locator(".cr-fundo [data-ok]").waitFor(); await p.screenshot({ path: "saida/pf-01b-corretor.png" }); await p.locator(".cr-fundo [data-ok]").click(); await p.waitForTimeout(300);
const formatado = await p.locator("#pubTexto").inputValue();
ok(formatado.startsWith("Bom dia, galera! Hoje terminei a reforma da cozinha, ficou linda.") && formatado.endsWith("#reforma #Floripa #obra") && formatado.includes("• Armários novos") && !/\n{3}/.test(formatado), "Formatar texto arruma o texto e leva as #hashtags para o fim");
ok(await p.locator("#pubTitulo").inputValue() === "Reforma da cozinha: antes e depois", "título com letra maiúscula");
ok(await p.locator("#pubDesfazerFmt").isVisible(), "aparece o Desfazer");
await p.locator("#pubDesfazerFmt").click();
ok(await p.locator("#pubTexto").inputValue() === bagunca, "Desfazer volta o texto como estava");
await p.locator("#pubFormatar").click(); await p.locator(".cr-fundo [data-ok]").click(); await p.waitForTimeout(200);
await p.screenshot({ path: "saida/pf-02-formatado.png" });
// modelos do texto sem imagem
ok(await p.locator("#pubModelos .pub-modelo").count() === 3, "texto: 3 modelos (Citação, Simples, Destaque)");
await modelo("simples");
await publicar();
const p1 = await novo((x) => x.titulo === "Reforma da cozinha: antes e depois");
ok(p1 && p1.layout === "simples" && p1.texto.endsWith("#reforma #Floripa #obra") && JSON.stringify(p1.tags) === '["reforma","floripa","obra"]', "gravado com título, modelo e hashtags no fim");
await p.waitForSelector(".post-card .post-titulo", { timeout: 10000 });
const c1 = cartao("Reforma da cozinha: antes e depois");
ok(await c1.locator(".post-titulo").textContent() === "Reforma da cozinha: antes e depois", "Diário: título em cima");
ok(await c1.locator(".post-tags .tag-chip").count() === 3 && !(await c1.locator(".post-texto .pt-c").textContent()).includes("#reforma"), "Diário: hashtags em etiquetas no fim (fora da descrição)");
ok(await c1.locator(".post-texto.curto .ver-mais").count() === 1, "texto longo com \"ver mais\"");
// a descrição cortada não deixa meia linha aparecendo: o fim do recorte é o fim de uma linha
const corte = await c1.locator(".post-texto .pt-c").evaluate((e) => { const lh = parseFloat(getComputedStyle(e).lineHeight); return Math.abs(e.clientHeight / lh - Math.round(e.clientHeight / lh)); });
ok(corte < 0.05, "texto cortado em linhas inteiras (" + corte.toFixed(3) + ")");
await c1.scrollIntoViewIfNeeded(); await p.screenshot({ path: "saida/pf-03-diario-titulo-tags.png" });
await c1.locator(".ver-mais").click();
ok(await c1.locator(".post-texto.curto").count() === 0 && (await c1.locator(".ver-mais").textContent()) === "ver menos", "\"ver mais\" abre e vira \"ver menos\"");
await p.screenshot({ path: "saida/pf-04-ver-menos.png" });
await c1.locator(".ver-mais").click();
ok(await c1.locator(".post-texto.curto").count() === 1, "\"ver menos\" fecha de novo");

// ---------- 2) Texto + imagem: modelo "Ao lado" e "No fundo" ----------
await abrirForm();
await p.locator("#pubTexto").fill("pôr do sol na praia mole hoje #floripa #verao");
await foto(F("praia"));
ok(await p.locator("#pubModelos .pub-modelo").count() === 3 && await p.locator('#pubModelos [data-modelo="lado"]').count() === 1, "texto com imagem: Em cima · Ao lado · No fundo");
await modelo("fundo");
await p.locator("#pubVerPrevia").click(); await p.waitForSelector("#folhaLista.aberta .pub-previa-post .casada.fundo");
ok(true, "prévia mostra o cartão com o texto por cima da imagem");
await p.screenshot({ path: "saida/pf-05-previa-fundo.png" });
await p.locator("#folhaLista [data-fechar]").first().click(); await p.waitForTimeout(300);
await modelo("lado");
await p.screenshot({ path: "saida/pf-06-form-modelos.png" });
await publicar();
await p.waitForSelector(".post-card .casada.lado", { timeout: 10000 });
await cartao("pôr do sol").scrollIntoViewIfNeeded(); await p.screenshot({ path: "saida/pf-07-casada-lado.png" });

// ---------- 3) Fotos: pizza, baralho, grade ----------
for (const [k, n, leg] of [["pizza", 4, "Fim de semana em Floripa"], ["baralho", 3, "Minhas fotos favoritas da viagem"], ["grade", 3, "Antes e depois da obra"], ["mosaico", 3, "Passeio de domingo"]]) {
  await abrirForm();
  await p.locator("#pubTipoFoto").click();
  await p.locator("#pubTitulo").fill(leg);
  for (const f of ["praia", "ponte", "montanha", "cozinha"].slice(0, n)) await foto(F(f));
  await p.locator("#pubTexto").fill(`legenda das fotos de ${k} #fotografia`);
  ok(await p.locator("#pubModelos .pub-modelo").count() === 5, `${k}: 5 modelos de fotos`);
  await modelo(k);
  await publicar();
  const pp = await novo((x) => x.titulo === leg);
  ok(pp?.layout === k && pp.midias?.length === n, `${k}: gravado com ${n} fotos`);
  await p.waitForSelector(`.post-card .md-${k}`, { timeout: 10000 });
  const cc = cartao(leg); await cc.scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
  await p.screenshot({ path: `saida/pf-08-fotos-${k}.png` });
}
// baralho: tocar passa a carta
const bar = p.locator(".post-card .md-baralho").first();
await bar.click(); await p.waitForTimeout(700);
ok((await bar.locator(".md-cont").textContent()) === "2/3", "baralho: tocar passa para a próxima carta");
// pizza: tocar numa fatia abre a foto em tela cheia
await p.locator(".post-card .md-pizza").first().click({ position: { x: 60, y: 60 } }); await p.waitForSelector(".md-visor", { timeout: 3000 });
await p.screenshot({ path: "saida/pf-09-visor.png" });
await p.keyboard.press("Escape"); await p.waitForTimeout(300);
ok(await p.locator(".md-visor").count() === 0, "pizza: tocar numa fatia abre a foto e Esc fecha");

// ---------- 4) Texto destaque e enquete duelo ----------
await abrirForm();
await p.locator("#pubTexto").fill("Quem aí também acha que Floripa no inverno é ainda mais bonita?");
await modelo("destaque"); await publicar();
await p.waitForSelector(".post-card .post-texto.destaque"); await cartao("inverno é ainda").scrollIntoViewIfNeeded(); await p.screenshot({ path: "saida/pf-10-destaque.png" });
await abrirForm();
await p.locator("#pubEnqueteBtn").click(); await p.waitForTimeout(200);
await p.locator("#pubEnquete .pe-pergunta").fill("Praia ou montanha?");
const ops = p.locator("#pubEnquete .pe-opcao input, #pubEnquete input.pe-op, #pubEnquete .pe-opcoes input");
await ops.nth(0).fill("Praia"); await ops.nth(1).fill("Montanha"); await p.waitForTimeout(200);
ok(await p.locator('#pubModelos [data-modelo="duelo"]').count() === 1, "enquete com 2 opções: modelo Duelo");
await modelo("duelo"); await publicar();
await p.waitForSelector(".post-card .enquete.enq-duelo", { timeout: 10000 }); await cartao("Praia ou montanha").scrollIntoViewIfNeeded(); await p.screenshot({ path: "saida/pf-11-duelo.png" });

// ---------- 5) Rascunho automático e "Sair da publicação?" ----------
await abrirForm();
await p.locator("#pubTitulo").fill("Texto que não terminei");
await p.locator("#pubTexto").fill("Começando a escrever e o celular tocou...");
await p.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
await p.waitForTimeout(800);
const guardado = await p.evaluate(() => Object.entries(localStorage).find(([k]) => k.startsWith("hf-pub-auto-"))?.[1] || "");
ok(guardado.includes("Texto que não terminei"), "guardado no aparelho enquanto escreve");
await p.locator("#folhaPublicar [data-fechar]").first().click(); await p.waitForTimeout(500);
ok(await p.locator("#folhaOpcoes.aberta").count() === 1 && (await p.locator("#tOpcoes").textContent()).includes("Sair da publicação"), "fechar pergunta: Sair da publicação?");
await p.screenshot({ path: "saida/pf-12-sair.png" });
await p.locator("#folhaOpcoes .opcao, #folhaOpcoes button", { hasText: "Continuar editando" }).first().click(); await p.waitForTimeout(400);
ok(await p.locator("#folhaPublicar.aberta").count() === 1, "Continuar editando: o formulário fica");
// o app "fecha" no meio: recarrega a página
await p.reload(); await p.waitForSelector("#btnComporFeed", { timeout: 30000 });
await p.waitForSelector(".pub-guardada", { timeout: 12000 });
ok((await p.locator(".pub-guardada").textContent()).includes("Texto que não terminei"), "ao entrar de novo, o Diário avisa da publicação não terminada");
await p.screenshot({ path: "saida/pf-13-aviso-guardada.png" });
await p.locator(".pub-guardada .btn").click(); await p.waitForSelector("#folhaPublicar.aberta"); await p.waitForTimeout(300);
ok(await p.locator("#pubTitulo").inputValue() === "Texto que não terminei" && await p.locator("#pubRecuperado").isVisible(), "Continuar abre o formulário com o que estava escrito");
await p.screenshot({ path: "saida/pf-14-recuperado.png" });
await p.locator("#folhaPublicar [data-fechar]").first().click(); await p.waitForSelector("#folhaOpcoes.aberta");
await p.locator("#folhaOpcoes button", { hasText: "Descartar" }).first().click(); await p.waitForTimeout(500);
ok(await p.locator("#folhaPublicar.aberta").count() === 0 && !(await p.evaluate(() => Object.keys(localStorage).some((k) => k.startsWith("hf-pub-auto-")))), "Descartar fecha e apaga o guardado");

ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await browser.close(); process.exit();
