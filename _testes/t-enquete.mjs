// Enquete na publicação (criar e votar), configurações do Diário e Flash e estatísticas do perfil.
// Ana publica uma enquete; Bruno vota e troca o voto; Ana vê os números e abre as estatísticas do perfil.
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => console.log(c ? "  ✔" : "  ✘", t);
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const agora = Date.now();
// Para as estatísticas: uma publicação antiga da Ana com alcance, estrela e seguidor novo.
await db.doc("diario/pInsAna").set({ autorId: U.ana, nome: "Ana Souza", texto: "Reforma da cozinha", criadoEm: Timestamp.fromMillis(agora - 3 * 864e5) });
await db.doc(`diario/pInsAna/vistas/${U.bruno}`).set({ origem: "principais", criadoEm: Timestamp.fromMillis(agora - 2 * 864e5) });
await db.doc(`curtidas/pInsAna_${U.bruno}`).set({ postId: "pInsAna", uid: U.bruno, postAutorId: U.ana, nota: 4, criadoEm: Timestamp.fromMillis(agora - 2 * 864e5) });
await db.doc(`relacoes/${U.bruno}_${U.ana}`).set({ tipo: "seguir", seguidorId: U.bruno, alvoId: U.ana, criadoEm: Timestamp.fromMillis(agora - 864e5) });

const A = await navegador({ mobile: true }), B = await navegador({ mobile: true });
const pa = await entrar(A.ctx, "ana", "feed.html?aba=registros");
await pa.waitForSelector("#btnComporFeed", { timeout: 30000 }); await pa.waitForTimeout(1500);
// 1) Ana cria a enquete
await pa.locator("#btnComporFeed").tap();
await pa.locator("#pubTexto").fill("Ajudem a escolher!");
await pa.locator("#pubEnqueteBtn").tap();
await pa.locator("#pubEnquete .pe-pergunta").fill("Qual cor para a fachada?");
await pa.locator("#pubEnquete .pe-opcao input").nth(0).fill("Azul");
await pa.locator("#pubEnquete .pe-opcao input").nth(1).fill("Verde");
await pa.locator("#pubEnquete .pe-mais").tap();
await pa.locator("#pubEnquete .pe-opcao input").nth(2).fill("Branco");
await pa.screenshot({ path: "saida/enquete-compor.png" });
await pa.locator("#pubEnviar").click();
await pa.waitForFunction(() => !document.getElementById("folhaPublicar")?.classList.contains("aberta"), null, { timeout: 30000 }).catch(() => {});
await pa.waitForTimeout(800);
const snap = await db.collection("diario").where("autorId", "==", U.ana).get();
const post = snap.docs.map((d) => ({ id: d.id, ...d.data() })).find((p) => p.texto === "Ajudem a escolher!");
ok(post?.enquete?.pergunta === "Qual cor para a fachada?" && post.enquete.opcoes.join("|") === "Azul|Verde|Branco", "publicou com enquete de 3 opções → " + JSON.stringify(post?.enquete));
// 2) Bruno vota e troca
const pb = await entrar(B.ctx, "bruno", "feed.html?aba=registros");
await pb.waitForSelector(".post-card", { timeout: 30000 });
const card = pb.locator(".post-card", { hasText: "Ajudem a escolher" }).first();
await card.waitFor({ timeout: 20000 }); await card.scrollIntoViewIfNeeded(); await pb.waitForTimeout(1500);
ok(await card.locator(".enquete .enq-op").count() === 3 && await card.locator(".enquete .enq-pct").count() === 0, "Bruno vê a enquete sem as porcentagens antes de votar");
await card.locator(".enquete .enq-op", { hasText: "Verde" }).tap(); await pb.waitForTimeout(1500);
const voto = (await db.doc(`enquete_votos/d_${post.id}_${U.bruno}`).get()).data();
ok(voto?.opcao === 1 && await card.locator(".enquete .enq-op.minha", { hasText: "Verde" }).count() === 1 && await card.locator(".enquete .enq-pct").count() === 0 && /resultado sai em/.test(await card.locator(".enquete .enq-rodape").textContent()), "votou em Verde: grava o voto, marca a escolha e o resultado só sai no fim → " + (await card.locator(".enquete").textContent()).replace(/\s+/g, " ").slice(0, 90));
await card.screenshot({ path: "saida/enquete-votou.png" });
await card.locator(".enquete .enq-op", { hasText: "Azul" }).tap({ force: true }); await pb.waitForTimeout(1500);
ok((await db.doc(`enquete_votos/d_${post.id}_${U.bruno}`).get()).data()?.opcao === 1, "voto único: tocar em Azul depois não troca o voto");
// 3) Ana vê os números
await pa.reload(); await pa.waitForSelector(".post-card", { timeout: 30000 });
const meu = pa.locator(".post-card", { hasText: "Ajudem a escolher" }).first();
await meu.scrollIntoViewIfNeeded(); await pa.waitForTimeout(2000);
const txtA = (await meu.locator(".enquete").textContent()).replace(/\s+/g, " ");
ok(/1 voto/.test(txtA) && txtA.includes("Verde100%"), "autora vê o resultado sem votar → " + txtA.slice(0, 90));
// 4) Configurações: quem pode me marcar e quem comenta
await pa.goto(new URL("configuracoes.html", pa.url()).href);
await pa.waitForSelector("#cfgMarcar button", { timeout: 30000 }); await pa.waitForTimeout(1500);
await pa.locator("#cfgMarcar button[data-valor=seguindo]").tap(); await pa.waitForTimeout(1200);
ok((await db.doc(`pref_publicas/${U.ana}`).get()).data()?.permiteMarcar === "seguindo", "configurações: \"Quem eu sigo\" grava em pref_publicas");
await pa.locator("#cfgComenta button[data-valor=seguidores]").tap(); await pa.waitForTimeout(1200);
ok((await db.doc(`usuarios/${U.ana}`).get()).data()?.diarioConfig?.quemComenta === "seguidores", "configurações: quem comenta = seguidores");
await pa.screenshot({ path: "saida/config-diario.png", fullPage: true });
await pa.locator("#cfgFlash").tap();
await pa.waitForSelector(".cfg2-op", { timeout: 15000 }); await pa.waitForTimeout(500);
await pa.locator(".cfg2-op", { hasText: "Só quem você segue" }).tap(); await pa.waitForTimeout(1200);
ok((await db.doc(`usuarios/${U.ana}`).get()).data()?.flashConfig?.respostas === "seguindo", "configurações do Flash: respostas só de quem segue");
await pa.screenshot({ path: "saida/config-flash.png" });
// 5) Estatísticas do perfil (pelo perfil)
await pa.goto(new URL("usuarios.html", pa.url()).href);
await pa.waitForSelector(".pf-painel", { timeout: 30000 }); await pa.waitForTimeout(1500);
ok(await pa.locator(".pf-stat-mais:not([hidden])").count() === 1, "perfil: setinha das estatísticas no cartão de números");
await pa.screenshot({ path: "saida/perfil-novo.png" });
await pa.locator(".pf-painel").tap();
await pa.waitForSelector("#folhaInsights.aberta .ins-cards", { timeout: 20000 }); await pa.waitForTimeout(800);
const ins = (await pa.locator("#c_folhaInsights").textContent()).replace(/\s+/g, " ");
ok(ins.includes("Contas alcançadas") && ins.includes("Seguidores") && await pa.locator("#c_folhaInsights .ins-top").count() >= 1, "estatísticas do perfil: cartões e melhores publicações → " + ins.slice(0, 120));
ok(await pa.locator(".ins-periodo button").count() === 3, "períodos 7, 30 e 90 dias");
await pa.screenshot({ path: "saida/insights.png" });
await pa.locator(".ins-periodo button", { hasText: "7 dias" }).tap(); await pa.waitForTimeout(500);
ok((await pa.locator(".ins-periodo button[aria-selected=true]").textContent()) === "7 dias", "trocar o período");
await A.browser.close(); await B.browser.close();
process.exit(0);
