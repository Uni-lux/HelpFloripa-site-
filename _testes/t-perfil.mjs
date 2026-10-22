// Perfil no modelo enviado: cabeçalho limpo (tema escuro), rosinha do duo no lugar do fio e da foto na capa,
// Seguir · Mensagem · ⋯ no perfil dos outros, negócios em uma linha só, enquete na aba Textos e toque duplo no texto.
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => console.log(c ? "  ✔" : "  ✘", t);
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const agora = Date.now();
await db.doc("vinculos/duoAnaBruno").set({ participantes: [U.ana, U.bruno], de: U.ana, para: U.bruno, tipoDe: "duo", tipoPara: "duo", status: "aceito", criadoEm: Timestamp.fromMillis(agora - 864e5) });
for (const t of ["servicos", "delivery", "lojinha", "imoveis"]) await db.doc(`negocios/${U.ana}_${t}`).set({ donoId: U.ana, tipo: t, nome: "Ana " + t, criadoEm: Timestamp.now() });
await db.doc(`perfis_publicos/${U.ana}`).set({ bio: "Tudo é possível quando você está com Deus!", verificado: true }, { merge: true });
await db.doc(`usuarios/${U.ana}`).set({ bio: "Tudo é possível quando você está com Deus!", verificado: true }, { merge: true });
await db.doc("diario/pTxtEnq").set({ autorId: U.ana, nome: "Ana Souza", texto: "Qual vocês preferem?", enquete: { pergunta: "Cor da fachada", opcoes: ["Azul", "Verde"] }, criadoEm: Timestamp.fromMillis(agora - 3600e3) });

const A = await navegador({ mobile: true }), B = await navegador({ mobile: true });
const escuro = (p) => p.evaluate(() => localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" })));
const pa = await entrar(A.ctx, "ana", "usuarios.html");
await escuro(pa); await pa.reload();
await pa.waitForSelector("#meuPerfil .pf2 .pf-acoes .btn", { timeout: 30000 }); await pa.waitForTimeout(2500);
ok(await pa.locator("#meuPerfil .fio-capa, #meuPerfil .duo-capa").count() === 0 && await pa.locator("#meuPerfil .pf-avatar-wrap .pf-rosa").count() === 1, "meu perfil: sem fio e sem foto do duo na capa; rosinha na foto de perfil");
const larg = await pa.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: innerWidth }));
ok(larg.doc <= larg.win, "nada passa da largura da tela → " + JSON.stringify(larg));
ok(await pa.locator("#meuPerfil [data-el=negocios] .vinculo").count() >= 4, "os negócios numa linha só");
const caixas = await pa.locator("#meuPerfil [data-el=negocios] .vinculo").evaluateAll((l) => l.map((e) => Math.round(e.getBoundingClientRect().top)));
ok(new Set(caixas).size === 1, "negócios alinhados na mesma linha → " + caixas.join(","));
await pa.screenshot({ path: "saida/perfil-escuro.png" });
await pa.screenshot({ path: "saida/perfil-escuro-inteiro.png", fullPage: true });
// Tocar e segurar na foto: foto grande com as opções do Help Floripa
const ab = await pa.locator("#meuPerfil .pf-anel").boundingBox();
await pa.mouse.move(ab.x + ab.width / 2, ab.y + ab.height / 3); await pa.mouse.down(); await pa.waitForTimeout(650); await pa.mouse.up();
await pa.waitForSelector(".foto-grande", { timeout: 3000 }).catch(() => {});
const rots = await pa.locator(".foto-grande .fg-rot").allTextContents();
ok(rots.join("|") === "Novo flash|Compartilhar perfil|Copiar link|Editar perfil" && await pa.locator(".foto-grande .fg-lapis").count() === 1, "segurar a foto: foto grande, lápis e opções → " + rots.join(" / "));
await pa.waitForTimeout(400);
await pa.screenshot({ path: "saida/foto-grande.png" });
await pa.keyboard.press("Escape"); await pa.waitForTimeout(400);
ok(await pa.locator(".foto-grande").count() === 0 && await pa.locator(".story-visor").count() === 0, "Esc fecha (e não abre o flash)");
// Aba Textos: a enquete aparece junto do texto
await pa.locator(".abas-perfil button[data-aba=textos]").tap(); await pa.waitForTimeout(1500);
ok(await pa.locator(".lista-textos .texto-item .enquete .enq-op").count() === 2, "aba Textos: a enquete aparece na publicação de texto");
await pa.screenshot({ path: "saida/perfil-textos-enquete.png" });
// Rosinha clicável abre o perfil do duo
await pa.locator("#meuPerfil .pf-rosa").tap(); await pa.waitForTimeout(500);
ok(await pa.locator("#meuPerfil .pf-duo-bolha.aberta .avatar").count() === 1 && (await pa.locator("#meuPerfil .pf-duo-bolha .nm").textContent()) === "Bruno", "tocar na rosinha: aparece a fotinho do duo");
await pa.screenshot({ path: "saida/rosinha-bolha.png" });
await pa.locator("#meuPerfil .pf-duo-bolha").tap();
await pa.waitForSelector("#folhaPerfil.aberta", { timeout: 10000 }).catch(() => {});
ok((await pa.locator("#tPerfilPublico").textContent()).includes("Bruno"), "tocar na fotinho do duo abre o perfil dele");
// Perfil do Bruno visto pela Ana: Seguir · Mensagem · ⋯ e a rosinha dele
await pa.waitForSelector("#ppCabecalho .pf-acoes .btn", { timeout: 15000 }); await pa.waitForTimeout(2000);
const botoes = await pa.locator("#ppCabecalho .pf-acoes > *").count();
ok(botoes === 3 && await pa.locator("#ppCabecalho .pf-rosa").count() === 1, `perfil de outra pessoa: 3 botões (Seguir, Mensagem, ⋯) e a rosinha → ${botoes}`);
const fora = await pa.locator("#ppCabecalho .pf-acoes > *").evaluateAll((l) => l.some((e) => e.getBoundingClientRect().right > innerWidth));
ok(!fora, "os botões cabem na tela");
await pa.screenshot({ path: "saida/perfil-publico-escuro.png" });
const pb0 = await pa.locator("#ppCabecalho .pf-anel").boundingBox();
await pa.mouse.move(pb0.x + pb0.width / 2, pb0.y + pb0.height / 3); await pa.mouse.down(); await pa.waitForTimeout(650); await pa.mouse.up();
await pa.waitForSelector(".foto-grande", { timeout: 3000 }).catch(() => {});
ok((await pa.locator(".foto-grande .fg-rot").allTextContents())[0] === "Mensagem" && await pa.locator(".foto-grande .fg-lapis").count() === 0, "foto de outra pessoa: Mensagem primeiro, sem lápis");
await pa.locator(".foto-grande .fg-fechar").click(); await pa.waitForTimeout(400);
await pa.locator("#ppCabecalho .pf-acoes > .btn.icone").tap(); await pa.waitForTimeout(500);
ok((await pa.locator("#opcoesCorpo").textContent()).includes("Ver o social"), "⋯: tem \"Ver o social\"");
// Toque duplo no texto: só as estrelas da barra (sem estrelas por cima do texto)
const pb = await entrar(B.ctx, "bruno", "feed.html");
await pb.waitForSelector(".post-card", { timeout: 30000 });
const card = pb.locator(".post-card", { hasText: "Qual vocês preferem" }).first();
await card.waitFor({ timeout: 20000 }); await card.scrollIntoViewIfNeeded(); await pb.waitForTimeout(1500);
const tb = await card.locator(".post-texto").boundingBox();
await pb.touchscreen.tap(tb.x + 20, tb.y + tb.height / 2); await pb.waitForTimeout(90); await pb.touchscreen.tap(tb.x + 20, tb.y + tb.height / 2);
await pb.waitForTimeout(250);
ok(await card.locator(".contagem").count() === 0 && await card.locator(".estrelas-linha.pulo").count() === 1, "toque duplo no texto: sem estrelas por cima, as da barra acendem");
await pb.waitForTimeout(1500);
ok((await card.locator(".estrelas-txt").textContent()).includes("5,0"), "e dá as 5 estrelas");
// Voto único
await card.locator(".enquete .enq-op", { hasText: "Verde" }).tap(); await pb.waitForTimeout(1500);
await card.locator(".enquete .enq-op", { hasText: "Azul" }).tap({ force: true }); await pb.waitForTimeout(1200);
const v = (await db.doc(`enquete_votos/d_pTxtEnq_${U.bruno}`).get()).data();
ok(v?.opcao === 1 && await card.locator(".enquete .enq-op.minha", { hasText: "Verde" }).count() === 1, "enquete: votou em Verde e não troca para Azul");
ok((await card.locator(".enquete .enq-rodape").textContent()).includes("registrado"), "rodapé: \"seu voto foi registrado\"");
await A.browser.close(); await B.browser.close();
process.exit(0);
