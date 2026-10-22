// Sino de notificações: estrelas agrupadas, seguidores agrupados, avaliação boa do negócio, plano vencendo,
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
const planoAntes = (await db.doc(`planos/${U.ana}`).get()).data() || null;
await db.doc(`planos/${U.ana}`).set({ plano: "pro", meses: 1, ate: ts(agora + 2.5 * 864e5) });
await db.doc(`usuarios/${U.ana}`).set({ notificacoesVistasEm: ts(agora - 3600e3) }, { merge: true });

const { browser, ctx } = await navegador({ mobile: true });
const erros = [];
const p = await entrar(ctx, "ana", "sobre.html");
p.on("pageerror", (e) => erros.push(e.message));
await p.evaluate((u) => localStorage.removeItem("hf-sino-" + u), U.ana); await p.reload(); await p.waitForTimeout(4000);
const n = Number(await p.textContent("#badgeAvisos").catch(() => "0"));
ok(n >= 6, `número do sino conta as novas (estrelas, seguidores, avaliação e plano): ${n}`);
await p.tap('.topo a[href="notificacoes.html"]');
await p.waitForSelector(".pa-item", { timeout: 15000 });
await p.waitForTimeout(800);
const linhas = await p.evaluate(() => [...document.querySelectorAll(".pa-item .pa-tx")].map((t) => (t.firstChild.textContent + " " + t.childNodes[1].textContent).replace(/\s+/g, " ").trim()));
console.log("  linhas:", JSON.stringify(linhas.slice(0, 8)));
ok(linhas.some((l) => /e mais 1 deram estrelas na sua publicação · média 4,7/.test(l)), "estrelas na mesma publicação viram uma linha (média 4,7)");
ok(linhas.some((l) => /começaram a seguir você/.test(l)), "seguidores agrupados");
ok(linhas.some((l) => /Dani avaliou seu negócio com 5 estrelas/.test(l)), "avaliação boa do negócio");
ok(linhas.some((l) => /Plano Pro vence em 3 dias/.test(l)), "plano perto de vencer");
ok(await p.locator(".pa-item .pa-mini").count() >= 1, "miniatura da publicação");
const grupos = await p.evaluate(() => [...document.querySelectorAll(".pa-grupo")].map((g) => g.textContent));
ok(grupos[0] === "Novas", "seções: " + grupos.join(", "));
await p.screenshot({ path: "saida/sino-painel.png" });
await p.tap('.pa-aba[data-aba="negocios"]'); await p.waitForTimeout(300);
const neg = await p.evaluate(() => [...document.querySelectorAll(".pa-item .pa-tx b")].map((b) => b.textContent));
ok(neg.includes("Dani") && neg.includes("Plano Pro"), "aba Negócios: " + neg.join(", "));
await p.screenshot({ path: "saida/sino-negocios.png" });
// estrelas abrem a publicação
await p.tap('.pa-aba[data-aba="tudo"]'); await p.waitForTimeout(300);
const href = await p.evaluate(() => { const l = [...document.querySelectorAll(".pa-item")].find((d) => /deram estrelas/.test(d.textContent)); return l ? l.getAttribute("aria-label") : ""; });
ok(!!href, "linha das estrelas acessível: " + href);
// página de notificações
await p.goto(BASE + "notificacoes.html"); await p.waitForTimeout(5000);
const pag = await p.evaluate(() => [...document.querySelectorAll("#listaAvisos .notif .tx")].map((t) => t.textContent.replace(/\s+/g, " ").trim()));
ok(pag.some((l) => /deram estrelas na sua publicação/.test(l)) && pag.some((l) => /Plano Pro vence em/.test(l)) && pag.some((l) => /avaliou seu negócio/.test(l)), "página: agrupado, plano e avaliação");
ok((await p.textContent('#abasAvisos [data-filtro="reclamacao"]')).startsWith("Negócios"), "página: aba Negócios");
await p.screenshot({ path: "saida/sino-pagina.png" });
ok(!erros.length, "sem erros " + (erros.join(" | ") || ""));
await browser.close();
for (const c of criados) await db.doc(c).delete().catch(() => {});
if (planoAntes) await db.doc(`planos/${U.ana}`).set(planoAntes); else await db.doc(`planos/${U.ana}`).delete();
console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
