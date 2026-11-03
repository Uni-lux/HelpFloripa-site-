// Tempo para o painel do sino mostrar a lista, com 4G simulado (150 ms, 1,6 Mbit/s): 1ª abertura (sem cópia no aparelho)
// e abertura numa página nova (com a cópia). Usa os dados do t-sino.mjs (rode ele antes).
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const agora = Date.now(), ts = (m) => Timestamp.fromMillis(m), criados = [];
const pôr = async (c, id, d) => { await db.doc(`${c}/${id}`).set(d); criados.push(`${c}/${id}`); };
const POST = "sinoRapido1";
await pôr("diario", POST, { autorId: U.ana, nome: "Ana Souza", texto: "Publicação do teste de velocidade do sino", criadoEm: ts(agora - 5 * 3600e3) });
for (const [k, quem] of ["bruno", "edu", "fabi"].entries()) await pôr("curtidas", `${POST}_${U[quem]}`, { uid: U[quem], postId: POST, postAutorId: U.ana, nota: 5, criadoEm: ts(agora - (k + 1) * 60e3) });
for (const quem of ["gui", "hele"]) await pôr("relacoes", `${U[quem]}_${U.ana}`, { tipo: "seguir", seguidorId: U[quem], alvoId: U.ana, criadoEm: ts(agora - 10 * 60e3) });
await pôr("avaliacoes", "sinoRapRec", { tipo: "negocio", autorId: U.edu, autorNome: "Edu", alvoId: U.ana, negocioId: `${U.ana}_servicos`, nota: 1, comentario: "Demorou", criadoEm: ts(agora - 30 * 60e3) });
const { browser, ctx } = await navegador({ mobile: true });
const p = await entrar(ctx, "ana", "sobre.html");
const cdp = await ctx.newCDPSession(p);
await cdp.send("Network.enable");
await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: Number(process.env.LAT || 150), downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
async function medir(rotulo) {
  await p.waitForSelector('.topo a[href="notificacoes.html"][data-painel]', { timeout: 30000 });
  await p.waitForTimeout(2500);
  const t0 = Date.now();
  await p.locator('.topo a[href="notificacoes.html"]').first().tap();
  await p.waitForSelector(".pa .nt2-item", { timeout: 60000 });
  const lista = Date.now() - t0;
  await p.waitForFunction(() => !/atualizando|Carregando/.test(document.querySelector(".pa-cab p")?.textContent || ""), null, { timeout: 60000 });
  const tudo = Date.now() - t0;
  const n = await p.locator(".pa .nt2-item").count();
  console.log(`${rotulo}: lista em ${lista} ms, atualizada em ${tudo} ms (${n} linhas)`);
  return lista;
}
await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("hf-sino-lista-")).forEach((k) => localStorage.removeItem(k)));
await p.reload();
const a = await medir("1ª abertura (sem cópia)");
await p.goto(p.url().replace("sobre.html", "ajuda.html"));
const b = await medir("outra página (com cópia)");
if (!process.env.SEM_LIMITE && b > 1500) { console.log("✘ com a cópia deveria abrir em menos de 1,5 s"); process.exitCode = 1; }
await browser.close();
for (const c of criados) await db.doc(c).delete().catch(() => {});
process.exit(process.exitCode || 0);
