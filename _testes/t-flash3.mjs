// Flash completo: menção vira cartão no Mensagens com "Adicionar ao seu flash" (repost com crédito), figurinha de link
// para o perfil de um negócio, reação/resposta/enviar como cartão com a miniatura e abrir pelo link (feed.html?flash=ID).
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, BASE } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const seguir = (a, b) => db.doc(`relacoes/${U[a]}_${U[b]}`).set({ tipo: "seguir", seguidorId: U[a], alvoId: U[b], criadoEm: Timestamp.now() });
await seguir("ana", "bruno"); await seguir("bruno", "ana"); await seguir("dani", "bruno"); await seguir("bruno", "dani");
const par = (a, b) => [U[a], U[b]].sort().join("_");
const cartoes = async (a, b) => (await db.collection(`conversas/${par(a, b)}/mensagens`).get()).docs.map((d) => d.data()).filter((m) => m.cartao?.tipo === "flash");

const A = await navegador({ mobile: true, camera: true }), B = await navegador({ mobile: true, camera: true }), D = await navegador({ mobile: true });
// 1) Ana: flash com menção ao Bruno e link para o negócio dele
const pa = await entrar(A.ctx, "ana", "usuarios.html");
await pa.waitForSelector("#meuPerfil .pf-mais-flash", { timeout: 30000 });
await pa.locator("#meuPerfil .pf-mais-flash").tap();
await pa.waitForSelector(".flash-criar .flash-cam-ui .flash-disparo", { timeout: 10000 });
await pa.waitForFunction(() => document.querySelector(".flash-cam")?.videoWidth > 0, null, { timeout: 8000 });
await pa.locator(".flash-disparo").tap();
await pa.waitForSelector(".flash-fotobox canvas.flash-foto", { timeout: 8000 }); await pa.waitForTimeout(500);
await pa.locator(".flash-ferr-btn[aria-label^='Figurinhas']").tap();
await pa.locator(".fig-op", { hasText: "Menção" }).tap();
await pa.locator(".mencao-item", { hasText: "Bruno" }).first().tap(); await pa.waitForTimeout(300);
await pa.locator(".flash-ferr-btn[aria-label^='Figurinhas']").tap();
await pa.locator(".fig-op", { hasText: "Link do negócio" }).tap();
await pa.waitForSelector(".mencao-item", { timeout: 8000 });
await pa.locator(".flash-figs .fe-local").fill("reparos"); await pa.waitForTimeout(300);
ok(await pa.locator(".mencao-item", { hasText: "Bruno Reparos" }).count() === 1, "link: a busca acha o negócio 'Bruno Reparos'");
await pa.screenshot({ path: "saida/f3-escolher-negocio.png" });
await pa.locator(".mencao-item", { hasText: "Bruno Reparos" }).tap(); await pa.waitForTimeout(300);
ok(await pa.locator(".flash-camada .fe-link").count() === 1, "figurinha do negócio no cartão");
await pa.screenshot({ path: "saida/f3-criar.png" });
await pa.locator(".flash-publicar").tap(); await pa.waitForTimeout(3500);
const sa = (await db.collection("stories").where("autorId", "==", U.ana).get()).docs.map((d) => ({ id: d.id, ...d.data() }))[0];
ok(sa?.link?.negocioId === `${U.bruno}_servicos` && sa.mencoes?.includes(U.bruno), "flash publicado com link para o negócio e menção ao Bruno");
const cm = await cartoes("ana", "bruno");
ok(cm.some((m) => m.cartao.acao === "mencao" && m.cartao.flashId === sa.id), "menção vai como cartão do flash para o Bruno");
// 2) Bruno: cartão no Mensagens com a miniatura e "Adicionar ao seu flash"
const pbm = await entrar(B.ctx, "bruno", `mensagens.html?conversa=${par("ana", "bruno")}`);
await pbm.waitForSelector(".flash-msg .fc-mini img", { timeout: 20000 }).catch(() => {});
ok(await pbm.locator(".flash-msg .fc-mini img").count() >= 1 && (await pbm.locator(".flash-msg .fc-cab").first().textContent()).includes("Mencionou você no flash"), "Bruno vê o cartão 'Mencionou você no flash' com a miniatura");
ok(await pbm.locator(".flash-msg .fc-btn", { hasText: "Adicionar ao seu flash" }).count() === 1, "cartão da menção tem 'Adicionar ao seu flash'");
await pbm.screenshot({ path: "saida/f3-msg-mencao.png" });
// 3) Repostar
await pbm.locator(".flash-msg .fc-btn").click();
await pbm.waitForURL(/feed\.html\?repostar=/, { timeout: 15000 });
await pbm.waitForSelector(".flash-criar .flash-repost-selo", { timeout: 15000 });
await pbm.waitForSelector(".flash-fotobox .flash-foto", { timeout: 10000 }); await pbm.waitForTimeout(600);
ok((await pbm.locator(".flash-repost-selo").textContent()).includes("Repostando o flash de Ana"), "repostar abre o criador com a foto e o selo 'Repostando o flash de Ana'");
await pbm.screenshot({ path: "saida/f3-repostar.png" });
await pbm.locator(".flash-publicar").tap(); await pbm.waitForTimeout(3500);
const sb = (await db.collection("stories").where("autorId", "==", U.bruno).get()).docs.map((d) => ({ id: d.id, ...d.data() }))[0];
ok(sb?.repostDe?.storyId === sa.id && sb.repostDe.autorId === U.ana, "repost publicado com o crédito do flash original");
ok((await cartoes("ana", "bruno")).some((m) => m.cartao.acao === "repost" && m.remetenteId === U.bruno), "Ana recebe 'Repostou o seu flash'");
// 4) Bruno vê o flash da Ana: link, reagir, responder, enviar para a Dani
await pbm.goto(BASE + "feed.html"); await pbm.waitForSelector(".story-circ", { timeout: 30000 }); await pbm.waitForTimeout(1500);
await pbm.locator(".story-circ:not(.meu)").first().tap();
await pbm.waitForSelector(".story-visor .story-link", { timeout: 10000 });
ok((await pbm.locator(".story-visor .story-link").getAttribute("href")) === `servicos.html?negocio=${encodeURIComponent(U.bruno + "_servicos")}`, "visor: figurinha do negócio leva ao perfil (servicos.html?negocio=...)");
ok(await pbm.locator(".story-visor .story-repostar").count() === 1, "visor: quem foi mencionado vê 'Adicionar ao seu flash'");
await pbm.waitForTimeout(700); await pbm.screenshot({ path: "saida/f3-visor-link.png" });
await pbm.locator(".story-responder input").tap(); await pbm.waitForTimeout(300);
await pbm.locator(".story-bandeja button", { hasText: "🔥" }).tap(); await pbm.waitForTimeout(1200);
await pbm.locator(".story-responder input").fill("Que legal!"); await pbm.locator(".story-env").tap();
await pbm.locator(".story-responder input").blur().catch(() => {}); await pbm.waitForTimeout(300); await pbm.waitForTimeout(1500);
const cr = await cartoes("ana", "bruno");
ok(cr.some((m) => m.cartao.acao === "reacao" && m.cartao.emoji === "🔥") && cr.some((m) => m.cartao.acao === "resposta" && m.cartao.texto === "Que legal!"), "reação e resposta vão como cartão do flash");
await pbm.locator(".story-btn[aria-label='Enviar este flash']").tap();
await pbm.waitForSelector("#listaCorpo .linha", { timeout: 10000 });
await pbm.locator("#listaCorpo .linha", { hasText: "Dani" }).locator("button", { hasText: "Enviar" }).tap(); await pbm.waitForTimeout(1500);
ok((await cartoes("bruno", "dani")).some((m) => m.cartao.acao === "enviar" && m.cartao.flashId === sa.id), "Enviar: o flash vai para a Dani como cartão");
// 5) Ana vê no Mensagens os cartões com a reação e a resposta
await pa.close(); // uma aba por navegador (o Firestore do teste trava com duas)
const pam = await entrar(A.ctx, "ana", `mensagens.html?conversa=${par("ana", "bruno")}`);
await pam.waitForSelector(".flash-msg .fc-emoji", { timeout: 20000 }).catch(() => {});
ok((await pam.locator(".flash-msg .fc-emoji").first().textContent()) === "🔥" && (await pam.locator(".flash-msg .fc-texto").first().textContent()) === "Que legal!", "Ana vê o cartão com o 🔥 e o cartão com a resposta");
ok((await pam.locator(".flash-msg .fc-cab", { hasText: "Repostou o seu flash" }).count()) === 1, "Ana vê 'Repostou o seu flash'");
await pam.screenshot({ path: "saida/f3-msg-ana.png" });
// 6) Dani abre o cartão: feed.html?flash=ID abre o flash da Ana direto; Ana vê o repost do Bruno com o crédito
const pdm = await entrar(D.ctx, "dani", `mensagens.html?conversa=${par("bruno", "dani")}`);
await pdm.waitForSelector(".flash-msg .fc-mini[href]", { timeout: 20000 });
await pdm.locator(".flash-msg .fc-mini").click();
await pdm.waitForSelector(".story-visor", { timeout: 15000 }).catch(() => {});
ok(await pdm.locator(".story-visor").count() === 1, "Dani abre o flash enviado direto pelo cartão");
await pdm.screenshot({ path: "saida/f3-dani-abre.png" });
await pam.goto(BASE + `feed.html?flash=${sb.id}`);
await pam.waitForSelector(".story-visor .story-repost", { timeout: 15000 }).catch(() => {});
ok((await pam.locator(".story-visor .story-repost").textContent().catch(() => "")).includes("Flash de Ana"), "repost mostra o crédito 'Flash de Ana'");
await pam.screenshot({ path: "saida/f3-repost-credito.png" });
await A.browser.close(); await B.browser.close(); await D.browser.close();
