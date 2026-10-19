// Enquete profissional: duração (1 h…1 dia ou personalizada), prazo na tela, voto só até o fim,
// resultado final com a vencedora, "Ver votos" do autor e o resultado nas notificações (dono e quem votou).
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
await db.doc(`relacoes/${U.bruno}_${U.ana}`).set({ tipo: "seguir", seguidorId: U.bruno, alvoId: U.ana, criadoEm: Timestamp.now() });
await db.doc(`relacoes/${U.dani}_${U.ana}`).set({ tipo: "seguir", seguidorId: U.dani, alvoId: U.ana, criadoEm: Timestamp.now() });

const A = await navegador({ mobile: true }), B = await navegador({ mobile: true }), D = await navegador({ mobile: true });
const pa = await entrar(A.ctx, "ana", "feed.html");
await pa.waitForSelector("#btnComporFeed", { timeout: 30000 }); await pa.waitForTimeout(1500);
await pa.locator("#btnComporFeed").tap();
await pa.locator("#pubTexto").fill("Votem na fachada!");
await pa.locator("#pubEnqueteBtn").tap();
ok((await pa.locator("#pubEnquete .enq-dur-chip").allTextContents()).join("|") === "1 h|6 h|12 h|1 dia|Personalizar" && (await pa.locator("#pubEnquete .enq-dur-chip.on").textContent()) === "1 dia", "compositor: durações com 1 dia marcado");
await pa.locator("#pubEnquete .pe-pergunta").fill("Qual cor para a fachada?");
await pa.locator("#pubEnquete .pe-opcao input").nth(0).fill("Azul");
await pa.locator("#pubEnquete .pe-opcao input").nth(1).fill("Verde");
await pa.locator("#pubEnquete .enq-dur-chip", { hasText: "6 h" }).tap();
await pa.locator("#pubEnquete").screenshot({ path: "saida/enq2-compor.png" });
await pa.locator("#pubEnquete .enq-dur-chip", { hasText: "Personalizar" }).tap();
ok(await pa.locator("#pubEnquete .enq-dur-campo:not([hidden])").count() === 1, "Personalizar mostra data e hora");
await pa.locator("#pubEnquete .enq-dur-chip", { hasText: "6 h" }).tap();
const t0 = Date.now();
await pa.locator("#pubEnviar").click();
await pa.waitForFunction(() => !document.getElementById("folhaPublicar")?.classList.contains("aberta"), null, { timeout: 30000 }).catch(() => {});
await pa.waitForTimeout(1200);
const snap = await db.collection("diario").where("autorId", "==", U.ana).get();
const post = snap.docs.map((d) => ({ id: d.id, ...d.data() })).find((p) => p.texto === "Votem na fachada!");
const fim = post?.enquete?.fimEm?.toMillis?.() || 0;
ok(Math.abs(fim - (t0 + 6 * 3600e3)) < 120000, "publicou com fim em 6 h → " + new Date(fim).toISOString());
const ua = (await db.doc(`usuarios/${U.ana}`).get()).data();
ok(ua.enquetes?.some((x) => x.a === "d_" + post.id && x.f === fim), "a enquete fica registrada na conta da Ana (para o resultado)");
// Bruno vê o prazo e vota
const pb = await entrar(B.ctx, "bruno", "feed.html");
const card = pb.locator(".post-card", { hasText: "Votem na fachada" }).first();
await card.waitFor({ timeout: 30000 }); await card.scrollIntoViewIfNeeded(); await pb.waitForTimeout(1500);
ok(/Termina em 6 h/.test(await card.locator(".enq-prazo").textContent()) && await card.locator(".enq-radio").count() === 2, "Bruno vê 'Termina em 6 h' e as opções para marcar");
await card.locator(".enquete").screenshot({ path: "saida/enq2-antes.png" });
await card.locator(".enquete .enq-op", { hasText: "Verde" }).tap(); await pb.waitForTimeout(1500);
const voto = (await db.doc(`enquete_votos/d_${post.id}_${U.bruno}`).get()).data();
ok(voto?.opcao === 1 && voto.fimEm?.toMillis() === fim, "voto gravado com o fim da enquete");
await card.locator(".enquete").screenshot({ path: "saida/enq2-votou.png" });
// A enquete termina (simulado: o fim passa a ser 1 minuto atrás)
const passado = Timestamp.fromMillis(Date.now() - 60000);
await db.doc(`diario/${post.id}`).update({ "enquete.fimEm": passado });
await db.doc(`enquete_votos/d_${post.id}_${U.bruno}`).update({ fimEm: passado });
await db.doc(`usuarios/${U.ana}`).update({ enquetes: ua.enquetes.map((x) => (x.a === "d_" + post.id ? { ...x, f: passado.toMillis() } : x)) });
// Dani chega depois do fim: vê o resultado final e não consegue votar
const pd = await entrar(D.ctx, "dani", "feed.html");
const cd = pd.locator(".post-card", { hasText: "Votem na fachada" }).first();
await cd.waitFor({ timeout: 30000 }); await cd.scrollIntoViewIfNeeded(); await pd.waitForTimeout(1800);
ok((await cd.locator(".enq-prazo").textContent()).includes("Encerrada") && /Resultado final/.test(await cd.locator(".enq-rodape").textContent()) && await cd.locator(".enq-venc").count() === 1, "depois do fim: Encerrada, resultado final e a vencedora com troféu");
await cd.locator(".enquete .enq-op", { hasText: "Azul" }).tap({ force: true }); await pd.waitForTimeout(1200);
ok(!(await db.doc(`enquete_votos/d_${post.id}_${U.dani}`).get()).exists, "depois do fim não dá para votar");
await cd.locator(".enquete").screenshot({ path: "saida/enq2-encerrada.png" });
// Ana: Ver votos
await pa.reload();
const ca = pa.locator(".post-card", { hasText: "Votem na fachada" }).first();
await ca.waitFor({ timeout: 30000 }); await ca.scrollIntoViewIfNeeded(); await pa.waitForTimeout(1800);
await ca.locator(".enq-ver").tap();
await pa.waitForSelector("#listaCorpo .vv-grupo", { timeout: 10000 });
ok(await pa.locator("#listaCorpo .vv-grupo.lider .linha").count() === 1 && (await pa.locator("#listaCorpo .vv-grupo.lider .vv-op").textContent()).includes("Verde"), "Ver votos: Bruno aparece em Verde (a vencedora)");
await pa.screenshot({ path: "saida/enq2-votos.png" });
// Notificações: quem votou e a dona
await pb.goto(pb.url().replace(/feed\.html.*/, "notificacoes.html"));
await pb.waitForSelector(".notif .nt-enq", { timeout: 30000 }).catch(() => {});
const nb = await pb.locator(".notif", { has: pb.locator(".nt-enq") }).first().textContent().catch(() => "");
ok(/a enquete em que você votou terminou/.test(nb) && /Verde/.test(nb), "Bruno: notificação com o resultado → " + nb.replace(/\s+/g, " ").slice(0, 120));
await pb.screenshot({ path: "saida/enq2-notif-bruno.png" });
await pb.locator(".notif", { has: pb.locator(".nt-enq") }).first().click();
await pb.waitForSelector("#listaCorpo .er-folha", { timeout: 6000 }).catch(() => {});
ok(/Você votou na vencedora/.test(await pb.locator("#listaCorpo").textContent()), "tocar abre o resultado: 'Você votou na vencedora!'");
await pb.screenshot({ path: "saida/enq2-resultado.png" });
await pa.goto(pa.url().replace(/feed\.html.*/, "notificacoes.html"));
await pa.waitForSelector(".notif .nt-enq", { timeout: 30000 }).catch(() => {});
const na = await pa.locator(".notif", { has: pa.locator(".nt-enq") }).first().textContent().catch(() => "");
ok(/Sua enquete terminou/.test(na), "Ana: 'Sua enquete terminou' nas notificações → " + na.replace(/\s+/g, " ").slice(0, 100));
ok(await pa.locator("#abasAvisos [data-filtro=enquete] em").textContent() === "1", "aba Enquetes com 1");
// Sino do painel (outra página)
await pa.close(); // o painel não carrega com outra aba do mesmo navegador aberta (já era assim): fecha antes
const pp = await entrar(A.ctx, "ana", "servicos.html");
await pp.waitForTimeout(2500);
await pp.locator(".topo a[href='notificacoes.html']").first().click();
await pp.waitForFunction(() => /Sua enquete/.test(document.querySelector(".pa-corpo")?.textContent || ""), null, { timeout: 20000 }).catch(() => {});
ok(/Sua enquete/.test(await pp.locator(".pa-corpo").textContent().catch(() => "")), "painel do sino mostra o resultado da enquete");
await pp.screenshot({ path: "saida/enq2-painel.png" });
// Flash: enquete com duração (até 24 h)
const C = await navegador({ mobile: true, camera: true });
const pf = await entrar(C.ctx, "ana", "usuarios.html");
await pf.waitForSelector("#meuPerfil .pf-mais-flash", { timeout: 30000 });
await pf.locator("#meuPerfil .pf-mais-flash").tap();
await pf.waitForSelector(".flash-criar .flash-cam-ui .flash-disparo", { timeout: 10000 });
await pf.waitForFunction(() => document.querySelector(".flash-cam")?.videoWidth > 0, null, { timeout: 8000 });
await pf.locator(".flash-disparo").tap();
await pf.waitForSelector(".flash-fotobox canvas.flash-foto", { timeout: 8000 }); await pf.waitForTimeout(500);
await pf.locator(".flash-ferr-btn[aria-label^='Figurinhas']").tap();
await pf.locator(".fig-op", { hasText: "Enquete" }).tap(); await pf.waitForTimeout(300);
ok((await pf.locator(".flash-criar .enq-dur-chip").allTextContents()).join("|") === "1 h|6 h|12 h|1 dia|Personalizar", "Flash: enquete com durações até 1 dia");
await pf.locator(".enq-ed-perg").fill("Funciona?");
await pf.locator(".flash-criar .enq-dur-chip", { hasText: "12 h" }).tap();
await pf.screenshot({ path: "saida/enq2-flash.png" });
await pf.locator(".flash-enq-ed .fe-pronto").tap(); await pf.waitForTimeout(300);
const t1 = Date.now();
await pf.locator(".flash-publicar").tap(); await pf.waitForTimeout(3000);
const st = (await db.collection("stories").where("autorId", "==", U.ana).get()).docs.map((d) => ({ id: d.id, ...d.data() })).find((x) => x.enquete);
ok(st && Math.abs(st.enquete.fimEm.toMillis() - (t1 + 12 * 3600e3)) < 120000, "flash publicado com a enquete terminando em 12 h");
ok(((await db.doc(`usuarios/${U.ana}`).get()).data().enquetes || []).some((x) => x.a === "f_" + st?.id), "enquete do flash registrada na conta (resultado depois)");
await A.browser.close(); await B.browser.close(); await D.browser.close(); await C.browser.close();
