// Sino de notificações: estrelas agrupadas, seguidores agrupados, avaliação boa do negócio, plano vencendo,
// Os nomes aparecem como estão no perfil agora (não os guardados no aviso): Dani = "Daniel Moderação", Edu = "Eduardo Lima".
// miniatura, seções Hoje/Ontem, aba Negócios; o mesmo na página notificacoes.html; número do sino.
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, BASE, USUARIOS as U } from "./nav.mjs";
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
let falhas = 0; const ok = (c, t) => { console.log((c ? "  ✔ " : "  ✘ ") + t); if (!c) falhas++; };
const agora = Date.now(), ts = (m) => Timestamp.fromMillis(m);
const POST = "sinoPost1", criados = [];
const pôr = async (c, id, d) => { await db.doc(`${c}/${id}`).set(d); criados.push(`${c}/${id}`); };
await pôr("diario", POST, { autorId: U.ana, nome: "Ana Souza", texto: "Minha primeira publicação do teste do sino", criadoEm: ts(agora - 5 * 3600e3) });
for (const [k, quem] of ["bruno", "edu", "fabi"].entries()) await pôr("curtidas", `${POST}_${U[quem]}`, { uid: U[quem], postId: POST, postAutorId: U.ana, nota: [5, 4, 5][k], criadoEm: ts(agora - (k + 1) * 60e3) });
for (const quem of ["gui", "hele"]) await pôr("relacoes", `${U[quem]}_${U.ana}`, { tipo: "seguir", seguidorId: U[quem], alvoId: U.ana, criadoEm: ts(agora - 10 * 60e3) });
await pôr("avaliacoes", "sinoAval1", { tipo: "negocio", autorId: U.dani, autorNome: "Dani", alvoId: U.ana, negocioId: `${U.ana}_servicos`, nota: 5, comentario: "Ótimo atendimento", criadoEm: ts(agora - 20 * 60e3) });
await pôr("avaliacoes", "sinoRec1", { tipo: "negocio", autorId: U.edu, autorNome: "Edu Reclama", alvoId: U.ana, negocioId: `${U.ana}_servicos`, nota: 1, comentario: "Demorou muito para chegar", criadoEm: ts(agora - 30 * 60e3) });
await pôr("reclamacoes", "sinoRec1", { texto: "Pedimos desculpas, já resolvemos.", criadoEm: ts(agora - 25 * 60e3), negocioDonoId: U.ana });
await pôr("avaliacoes", "sinoRec2", { tipo: "negocio", autorId: U.fabi, autorNome: "Fabi Reclama", alvoId: U.ana, negocioId: `${U.ana}_servicos`, nota: 2, comentario: "Não gostei", criadoEm: ts(agora - 40 * 60e3) });
const planoAntes = (await db.doc(`planos/${U.ana}`).get()).data() || null;
await db.doc(`planos/${U.ana}`).set({ plano: "pro", meses: 1, ate: ts(agora + 2.5 * 864e5) });
await db.doc(`usuarios/${U.ana}`).set({ notificacoesVistasEm: ts(agora - 3600e3) }, { merge: true });

const { browser, ctx } = await navegador({ mobile: true });
const erros = [];
const p = await entrar(ctx, "ana", "sobre.html");
p.on("pageerror", (e) => erros.push(e.message));
await p.evaluate((u) => { localStorage.removeItem("hf-sino-" + u); localStorage.removeItem("hf-notif-" + u); }, U.ana); await p.reload(); await p.waitForTimeout(4000);
const n = Number(await p.textContent("#badgeAvisos").catch(() => "0"));
ok(n >= 6, `número do sino conta as novas (estrelas, seguidores, avaliação e plano): ${n}`);
await p.tap('.topo a[href="notificacoes.html"]');
await p.waitForSelector(".pa .nt2-item", { timeout: 15000 });
await p.waitForTimeout(800);
const linhas = await p.evaluate(() => [...document.querySelectorAll(".pa .nt2-item .nt2-frase")].map((t) => t.textContent.replace(/\s+/g, " ").trim()));
console.log("  linhas:", JSON.stringify(linhas.slice(0, 8)));
ok(linhas.some((l) => /e mais 1 deram estrelas na sua publicação · média 4,7/.test(l)), "estrelas na mesma publicação viram uma linha (média 4,7)");
ok(linhas.some((l) => /começaram a seguir você/.test(l)), "seguidores agrupados");
ok(linhas.some((l) => /Daniel Moderação avaliou seu negócio com 5 estrelas/.test(l)), "avaliação boa do negócio");
ok(linhas.some((l) => /Plano Pro vence em 3 dias/.test(l)), "plano perto de vencer");
ok(await p.locator(".pa .nt2-mini").count() >= 1, "miniatura da publicação");
const secs = await p.evaluate(() => [...document.querySelectorAll(".pa .nt2-sec")].map((g) => g.firstChild.textContent));
ok(secs[0] === "Novas", "seções: " + secs.join(", "));
const botoes = await p.evaluate(() => [...document.querySelectorAll(".pa .nt2-acoes button")].map((b) => b.textContent));
ok(botoes.includes("Renovar agora") && botoes.includes("Ver avaliação") && botoes.includes("Ver publicação") && botoes.includes("Responder"), "botões de ação: " + [...new Set(botoes)].join(", "));
ok(await p.locator(".pa .nt2-tag").count() >= 4, "etiqueta do tipo em cada linha");
await p.screenshot({ path: "saida/sino-painel.png" });
// reclamação já respondida: sem "Responder publicamente", com "Respondida"; a outra continua pedindo resposta
const rec1 = await p.locator(".pa .nt2-item", { hasText: "Eduardo Lima" }).textContent();
const rec2 = await p.locator(".pa .nt2-item", { hasText: "Fabiana Rocha" }).textContent();
ok(/Respondida/.test(rec1) && /Ver sua resposta/.test(rec1) && !/Responder publicamente/.test(rec1), "reclamação respondida: " + rec1.replace(/\s+/g, " ").slice(0, 120));
ok(/Responder publicamente/.test(rec2) && !/Respondida/.test(rec2), "reclamação sem resposta continua pedindo resposta");
// prévia: corte de 3 linhas no texto de dentro (nada pela metade)
const corte = await p.evaluate(() => { const sp = document.querySelector(".pa .nt2-prev span"); const cs = getComputedStyle(sp); return { clamp: cs.webkitLineClamp, sobra: sp.parentElement.scrollHeight - sp.parentElement.clientHeight }; });
ok(corte.clamp === "3" && corte.sobra === 0, "prévia corta em 3 linhas sem sobrar pedaço: " + JSON.stringify(corte));
// Não lidas
const naoLidasN = await p.textContent(".pa .nt2-seg em");
ok(Number(naoLidasN) >= 4, "Não lidas: " + naoLidasN);
// categoria Negócios
await p.locator(".pa .nt2-chip", { hasText: "Negócios" }).tap(); await p.waitForTimeout(300);
const neg = await p.evaluate(() => [...document.querySelectorAll(".pa .nt2-item .nt2-frase b")].map((b) => b.textContent));
ok(neg.includes("Daniel Moderação") && neg.includes("Plano Pro"), "filtro Negócios: " + neg.join(", "));
await p.screenshot({ path: "saida/sino-negocios.png" });
await p.locator(".pa .nt2-chip", { hasText: "Tudo" }).tap(); await p.waitForTimeout(300);
// menu ⋯: marcar como lida e remover
const antes = await p.locator(".pa .nt2-item.nova").count();
await p.locator(".pa .nt2-item", { hasText: "Daniel Moderação avaliou" }).locator(".nt2-mais").tap(); await p.waitForTimeout(200);
await p.screenshot({ path: "saida/sino-menu.png" });
const opcoes = await p.evaluate(() => [...document.querySelectorAll(".nt2-menu button")].map((b) => b.textContent));
ok(opcoes.length === 3 && opcoes[0] === "Marcar como lida", "menu ⋯: " + opcoes.join(" | "));
await p.locator(".nt2-menu button", { hasText: "Marcar como lida" }).tap(); await p.waitForTimeout(200);
ok(await p.locator(".pa .nt2-item.nova").count() === antes - 1, "marcou como lida");
await p.locator(".pa .nt2-item", { hasText: "Daniel Moderação avaliou" }).locator(".nt2-mais").tap(); await p.waitForTimeout(200);
await p.locator(".nt2-menu button", { hasText: "Remover" }).tap(); await p.waitForTimeout(200);
ok(!(await p.locator(".pa .nt2-item", { hasText: "Daniel Moderação avaliou" }).count()), "removida da lista");
// preferências: desligar Seguidores
await p.tap('.pa .nt2-ib[aria-label="Preferências de notificação"]'); await p.waitForTimeout(300);
await p.screenshot({ path: "saida/sino-prefs.png" });
await p.locator(".nt2-op", { hasText: "Seguidores" }).locator(".nt2-sw").tap();
await p.tap(".nt2-salvar"); await p.waitForTimeout(1200);
ok(!(await p.locator(".pa .nt2-item", { hasText: "começaram a seguir" }).count()), "Seguidores desligado some da lista");
const pref = (await db.doc(`usuarios/${U.ana}`).get()).data().prefNotif;
ok(pref && pref.seguidores === false, "preferência gravada: " + JSON.stringify(pref));
// página de notificações (mesma lista, e o item removido continua removido)
await p.goto(BASE + "notificacoes.html"); await p.waitForTimeout(5000);
const pag = await p.evaluate(() => [...document.querySelectorAll("#listaAvisos .nt2-frase")].map((t) => t.textContent.replace(/\s+/g, " ").trim()));
ok(pag.some((l) => /deram estrelas na sua publicação/.test(l)) && pag.some((l) => /Plano Pro vence em/.test(l)), "página: agrupado e plano");
ok(!pag.some((l) => /Daniel Moderação avaliou/.test(l)) && !pag.some((l) => /começaram a seguir/.test(l)), "página respeita removida e preferência");
await p.screenshot({ path: "saida/sino-pagina.png" });
// religa
await p.tap('#listaAvisos .nt2-ib[aria-label="Preferências de notificação"]'); await p.waitForTimeout(300);
await p.locator(".nt2-op", { hasText: "Seguidores" }).locator(".nt2-sw").tap();
await p.tap(".nt2-salvar"); await p.waitForTimeout(1500);
ok(await p.locator("#listaAvisos .nt2-frase", { hasText: "começaram a seguir" }).count() === 1, "religou Seguidores");
ok(!erros.length, "sem erros " + (erros.join(" | ") || ""));
await browser.close();
for (const c of criados) await db.doc(c).delete().catch(() => {});
await db.doc(`usuarios/${U.ana}`).update({ prefNotif: (await import("firebase-admin/firestore")).FieldValue.delete() }).catch(() => {});
if (planoAntes) await db.doc(`planos/${U.ana}`).set(planoAntes); else await db.doc(`planos/${U.ana}`).delete();
console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
