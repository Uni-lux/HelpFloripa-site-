// "Voltar" do celular: fecha a janela de cima (folha, confirmação, lista), volta para a aba anterior
// (Diário/Explorar, abas do perfil, seções do painel) e só depois sai da página.
// Também: "Cobrar resposta" das reclamações fica guardado, e os cartões de publicação e de flash no chat.
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, BASE } from "./nav.mjs";
let falhas = 0;
const ok = (c, t) => { if (!c) falhas++; console.log(c ? "  ✔" : "  ✘", t); };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const PX = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";
await db.doc("diario/vtPost").set({ autorId: U.bruno, nome: "Bruno Reparos", texto: "Pintura nova", mediaUrl: PX, mediaTipo: "image", criadoEm: Timestamp.now() });

const B = await navegador({ mobile: true });
const p = await entrar(B.ctx, "ana", "index.html");
await p.waitForTimeout(1500);
await p.evaluate(() => { location.href = "feed.html"; }); await p.waitForSelector(".post-card", { timeout: 30000 }); await p.waitForTimeout(1200); // como um link do site (veio do início)
// 1) Folha de comentários: voltar fecha a folha e continua no Diário
await p.locator(".post-card .acao.comentar").first().tap(); await p.waitForSelector("#folhaComentarios.aberta", { timeout: 5000 });
await p.goBack(); await p.waitForTimeout(500);
ok(p.url().includes("feed.html") && await p.locator("#folhaComentarios.aberta").count() === 0, "voltar fecha os comentários e fica no Diário");
// 2) Fechar pelo X não deixa passo sobrando: o próximo voltar sai da página (volta para o início)
await p.locator(".post-card .acao.comentar").first().tap(); await p.waitForSelector("#folhaComentarios.aberta");
await p.locator("#folhaComentarios [data-fechar]").tap(); await p.waitForTimeout(500);
ok((await p.evaluate(() => history.state?.hfCamadas || 0)) === 0, "fechar pelo X desfaz o passo do histórico");
// 3) Abas: Explorar → voltar → Diário
await p.locator("#abasFeed [data-aba=explorar]").tap(); await p.waitForTimeout(800);
ok(await p.locator("#painelExplorar").isVisible(), "abriu o Explorar");
await p.goBack(); await p.waitForTimeout(800);
ok(p.url().includes("feed.html") && await p.locator("#painelFeed").isVisible() && await p.locator("#painelExplorar").isHidden(), "voltar do Explorar volta para o Diário");
await p.goBack(); await p.waitForTimeout(1500);
ok(p.url().includes("index.html"), "mais um voltar: página anterior (início) → " + p.url().split("/").pop());
// 4) Configurações: folha do endereço + confirmação por cima → voltar fecha uma de cada vez
await p.goto(BASE + "configuracoes.html"); await p.waitForTimeout(2500);
await p.locator("#cfgEndereco").tap(); await p.waitForSelector("#folhaEndereco.aberta");
await p.locator("#endRemover").tap(); await p.waitForSelector(".hf-confirma");
await p.goBack(); await p.waitForTimeout(500);
ok(await p.locator(".hf-confirma").count() === 0 && await p.locator("#folhaEndereco.aberta").count() === 1, "voltar fecha a confirmação e deixa o endereço aberto");
await p.goBack(); await p.waitForTimeout(500);
ok(await p.locator("#folhaEndereco.aberta").count() === 0 && p.url().includes("configuracoes.html"), "voltar de novo fecha o endereço e fica nas Configurações");
// 5) Lista de opções (select) e horário
await p.locator("#cfgEndereco").tap(); await p.waitForSelector("#folhaEndereco.aberta");
await p.locator("#folhaEndereco select").first().tap(); await p.waitForSelector(".hfc");
await p.goBack(); await p.waitForTimeout(500);
ok(await p.locator(".hfc").count() === 0 && await p.locator("#folhaEndereco.aberta").count() === 1, "voltar fecha a lista de Estados (o endereço continua aberto)");
await p.goBack(); await p.waitForTimeout(400);
// 6) Perfil: abas
await p.goto(BASE + "usuarios.html"); await p.waitForSelector(".abas-perfil button", { timeout: 20000 }); await p.waitForTimeout(800);
await p.locator(".abas-perfil button[data-aba=textos]").tap(); await p.waitForTimeout(400);
await p.goBack(); await p.waitForTimeout(600);
ok((await p.locator('.abas-perfil button[aria-selected="true"]').getAttribute("data-aba")) !== "textos" && p.url().includes("usuarios.html"), "perfil: voltar volta para a aba anterior");
await B.browser.close();

// 7) Painel: seções e "Cobrar resposta" guardado
await db.collection("queixas").doc("qxVoltar").set({ alvoId: U.bruno, autorId: U.ana, autorNome: "Ana Souza", negocioId: `${U.bruno}_servicos`, negocioNome: "Bruno Reparos", motivo: "atraso", texto: "Não apareceu no dia marcado", status: "aberta", abertaEm: Timestamp.fromMillis(Date.now() - 9 * 864e5) });
const D = await navegador({ mobile: false });
const pa = await entrar(D.ctx, "admin", "admin.html");
await pa.waitForSelector(".ad-kpis", { timeout: 30000 }); await pa.waitForTimeout(1200);
await pa.locator('.ad-nav[data-secao="suporte"]').click(); await pa.waitForTimeout(500);
await pa.locator('.ad-nav[data-secao="reclamacoes"]').click(); await pa.waitForTimeout(800);
await pa.goBack(); await pa.waitForTimeout(800);
ok(pa.url().endsWith("#suporte") && (await pa.locator("#principal h1").first().textContent()).includes("Suporte"), "painel: voltar volta para a seção anterior (Suporte)");
await pa.goForward(); await pa.waitForTimeout(1200);
const linha = pa.locator("tr", { hasText: "Não apareceu no dia" });
await linha.locator(".ad-bt", { hasText: "Cobrar resposta" }).click(); await pa.waitForTimeout(1500);
ok((await linha.locator(".ad-cobrado").textContent()).includes("Cobrado"), "cobrar: mostra quem cobrou e quando");
await pa.reload(); await pa.waitForSelector(".ad-kpis", { timeout: 30000 }); await pa.waitForTimeout(1500);
if (!pa.url().endsWith("#reclamacoes")) { await pa.locator('.ad-nav[data-secao="reclamacoes"]').click(); await pa.waitForTimeout(1500); }
await pa.waitForTimeout(1000);
const l2 = pa.locator("tr", { hasText: "Não apareceu no dia" });
ok((await l2.locator(".ad-cobrado").textContent().catch(() => "")).includes("Cobrado") && (await l2.locator(".ad-bt").first().textContent()).includes("Cobrar de novo"), "depois de sair e voltar: continua \"Cobrado\" (Cobrar de novo)");
await l2.scrollIntoViewIfNeeded(); await pa.screenshot({ path: "saida/cobrado.png" });
await D.browser.close();

// 8) Cartões no chat: publicação e flash enviados por MIM (não pegam o azul do balão)
await db.doc("stories/vtFlash").set({ autorId: U.bruno, nome: "Bruno Reparos", tipo: "imagem", midia: PX, criadoEm: Timestamp.fromMillis(Date.now() - 5 * 3600e3) });
const msgs = [
  { remetenteId: U.ana, tipoArquivo: "cartao", cartao: { tipo: "publicacao", titulo: "Publicação de Bruno Reparos", sub: "Publicação de Bruno Reparos", link: "usuarios.html?post=vtPost" } },
  { remetenteId: U.ana, tipoArquivo: "cartao", cartao: { tipo: "flash", acao: "enviar", flashId: "vtFlash", autorId: U.bruno, nome: "Bruno Reparos" } },
  { remetenteId: U.bruno, tipoArquivo: "cartao", cartao: { tipo: "flash", acao: "reacao", flashId: "vtFlash", autorId: U.ana, nome: "Ana Souza", emoji: "🔥" } },
  { remetenteId: U.bruno, tipoArquivo: "cartao", cartao: { tipo: "flash", acao: "mencao", flashId: "vtFlash", autorId: U.bruno, nome: "Bruno Reparos" } },
  { remetenteId: U.bruno, tipoArquivo: "cartao", cartao: { tipo: "flash", acao: "resposta", flashId: "naoExiste", autorId: U.ana, nome: "Ana Souza", texto: "Que lindo!" } }
];
for (const [i, m] of msgs.entries()) await db.collection(`conversas/${U.conv}/mensagens`).doc("vt" + i).set({ texto: "", ...m, criadoEm: Timestamp.fromMillis(Date.now() + i * 1000) });
const M = await navegador({ mobile: true });
const pm = await entrar(M.ctx, "ana", `mensagens.html?conversa=${U.conv}`);
await pm.waitForSelector(".flash-msg .fc-mini img", { timeout: 20000 }).catch(() => {}); await pm.waitForTimeout(2500);
const fundo = (sel) => pm.locator(sel).first().evaluate((e) => getComputedStyle(e).backgroundColor);
const balao = await pm.locator(".minha .bolha:not(.cartao-msg)").first().evaluate((e) => getComputedStyle(e).backgroundColor).catch(() => "");
const pubMeu = await fundo(".minha .bolha.pub-msg"), flashMeu = await fundo(".minha .bolha.flash-msg");
ok(pubMeu !== balao && flashMeu !== balao && pubMeu === flashMeu, `cartões meus com fundo próprio (cartão ${pubMeu}, balão ${balao})`);
const env = pm.locator(".minha .flash-msg").first();
ok((await env.locator(".fc-topo b").textContent()).includes("Bruno") && /\d+ h/.test(await env.locator(".fc-tempo").textContent()) && await env.locator(".fc-ver").count() === 1, "flash enviado: autor, tempo restante e Ver flash");
ok(await pm.locator(".flash-msg .fc-emoji", { hasText: "🔥" }).count() === 1, "reação: emoji grande no cartão");
ok(await pm.locator(".flash-msg .fc-btn", { hasText: "Adicionar ao seu flash" }).count() === 1, "menção: botão Adicionar ao seu flash");
ok(await pm.locator(".flash-msg .fc-mini.sumiu", { hasText: "Flash indisponível" }).count() === 1, "flash que acabou: Flash indisponível");
await env.scrollIntoViewIfNeeded(); await pm.screenshot({ path: "saida/flash-cartao.png" });
await pm.locator(".flash-msg .fc-emoji").first().scrollIntoViewIfNeeded(); await pm.screenshot({ path: "saida/flash-cartao2.png" });
await M.browser.close();
console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
