// Puxar para atualizar (como no Instagram) no Diário, Explorar, Vídeos, Comunidade e Perfil: puxar no topo mostra o
// círculo, soltar depois do ponto busca de novo no servidor (o que foi publicado depois de abrir aparece); puxar pouco
// volta sem atualizar; deslizar para o lado não puxa. Barra de baixo quase opaca (não mostra o cartão de trás).
// Uso: node t-puxar-atualizar.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
let falhas = 0; const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) falhas++; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const A = await navegador({ mobile: true });
const p = await entrar(A.ctx, "ana", "feed.html");
const cdp = await A.ctx.newCDPSession(p);
const toque = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
async function puxar(dist = 260, x = 195, y = 330, dx = 0) {
  await toque("touchStart", [[x, y]]);
  for (let k = 1; k <= 14; k++) { await toque("touchMove", [[x + (dx * k) / 14, y + (dist * k) / 14]]); await p.waitForTimeout(16); }
  const meio = await p.evaluate(() => { const i = [...document.querySelectorAll(".pa-ind")].find((e) => getComputedStyle(e).opacity !== "0"); return i ? Number(getComputedStyle(i).opacity) : 0; });
  await toque("touchEnd", []);
  return meio;
}

// Diário
await p.waitForSelector("#listaFeed .post, #listaFeed .vazio, #listaFeed .feed-vazio", { timeout: 30000 }).catch(() => {});
await p.waitForTimeout(1500);
const id = "puxarNova" + Date.now();
await db.doc(`diario/${id}`).set({ autorId: U.bruno, nome: "Bruno", texto: "Publicação depois de abrir " + id, tipo: "texto", autorUf: "SC", autorIbge: 4205407, criadoEm: Timestamp.now() });
await p.waitForTimeout(500);
ok(!(await p.content()).includes(id), "Diário: a publicação nova ainda não está na tela");
ok((await puxar(60)) > 0, "puxar pouco mostra o círculo");
await p.waitForTimeout(900);
ok(!(await p.content()).includes(id), "puxar pouco e soltar não atualiza");
ok((await puxar(40, 330, 330, -260)) === 0, "deslizar para o lado não puxa");
await p.waitForTimeout(900);
await p.evaluate(() => window.__hfTrocarAba?.("diario")); await p.waitForTimeout(1200);
await p.evaluate(() => scrollTo(0, 0));
ok((await puxar(300)) > 0.9, "puxar até o ponto: círculo inteiro");
const girou = await p.waitForFunction(() => { const s = document.querySelector(".pa-ind svg"); return s && /rotate\((?!0deg)/.test(s.style.transform); }, null, { timeout: 2000 }).then(() => true).catch(() => false);
ok(girou, "soltar: o círculo gira enquanto busca");
await p.waitForFunction((x) => document.body.textContent.includes(x), id, { timeout: 12000 }).catch(() => {});
ok((await p.content()).includes(id), "Diário: depois de puxar, a publicação nova aparece");
await p.waitForTimeout(800);
ok(await p.evaluate(() => !document.querySelector("main").style.transform), "a página volta ao lugar");

// Explorar
await p.evaluate(() => window.__hfTrocarAba?.("explorar")); await p.waitForTimeout(2500);
await p.evaluate(() => scrollTo(0, 0));
ok((await puxar(300)) > 0.9, "Explorar: puxar mostra o círculo");
await p.waitForTimeout(2500);
ok(await p.evaluate(() => !document.querySelector("main").style.transform), "Explorar: atualizou e voltou ao lugar");

// Vídeos (sem Storage não há vídeo novo: lê de novo e mostra a tela de vazio, sem erro)
await p.evaluate(() => window.__hfTrocarAba?.("diario")); await p.waitForTimeout(1000);
await p.locator('#tiposFeed [data-tipo="reels"], #tiposFeed button').nth(1).tap().catch(() => {});
await p.waitForSelector(".reels", { timeout: 8000 }).catch(() => {});
await p.waitForTimeout(1500);
ok((await puxar(300, 195, 400)) > 0.9, "Vídeos: puxar mostra o círculo (claro sobre o vídeo)");
await p.waitForTimeout(1500);
ok(await p.evaluate(() => !!document.querySelector(".reels .reels-vazio, .reels .reel")), "Vídeos: lista montada de novo");
await p.evaluate(() => document.querySelector(".reels .reels-btn")?.click()); await p.waitForTimeout(800);

// Comunidade (mural)
const p2 = await entrar(A.ctx, "ana", "mural.html");
const cdp2 = await A.ctx.newCDPSession(p2);
await p2.waitForSelector("#muLista", { timeout: 30000 }); await p2.waitForTimeout(2500);
const cid = "puxarCom" + Date.now();
await db.doc(`comunidade/${cid}`).set({ donoId: U.bruno, tipo: "doacao", titulo: "Doação nova " + cid, descricao: "Sofá em bom estado para doar", status: "disponivel", uf: "SC", cidade: "Florianópolis", cidadeIbge: 4205407, criadoEm: Timestamp.now(), atualizadoEm: Timestamp.now() });
const toque2 = (type, pts) => cdp2.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
await toque2("touchStart", [[195, 330]]); for (let k = 1; k <= 14; k++) { await toque2("touchMove", [[195, 330 + 22 * k]]); await p2.waitForTimeout(16); } await toque2("touchEnd", []);
await p2.waitForFunction((x) => document.body.textContent.includes(x), cid, { timeout: 12000 }).catch(() => {});
ok((await p2.content()).includes(cid), "Comunidade: depois de puxar, a doação nova aparece");
await p2.close();

// Perfil
const p3 = await entrar(A.ctx, "ana", "usuarios.html");
const cdp3 = await A.ctx.newCDPSession(p3);
await p3.waitForSelector("#gradePosts", { state: "attached", timeout: 30000 }); await p3.waitForSelector("#conteudo:not([hidden])", { timeout: 30000 }); await p3.waitForTimeout(2500);
const pid = "puxarMeu" + Date.now();
await db.doc(`diario/${pid}`).set({ autorId: U.ana, nome: "Ana", texto: "Minha publicação nova " + pid, tipo: "texto", autorUf: "SC", autorIbge: 4205407, criadoEm: Timestamp.now() });
await p3.waitForTimeout(800);
ok(!(await p3.evaluate((x) => document.body.innerText.includes(x), pid)), "Perfil: a publicação nova ainda não está na tela");
const toque3 = (type, pts) => cdp3.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
await toque3("touchStart", [[195, 330]]); for (let k = 1; k <= 14; k++) { await toque3("touchMove", [[195, 330 + 22 * k]]); await p3.waitForTimeout(16); } await toque3("touchEnd", []);
await p3.waitForFunction((x) => document.body.innerText.includes(x), pid, { timeout: 12000 }).catch(() => {});
ok(await p3.evaluate((x) => document.body.innerText.includes(x), pid), "Perfil: depois de puxar, a publicação nova aparece");
const barra = await p3.evaluate(() => { const cs = getComputedStyle(document.getElementById("barraRede")); return { bg: cs.backgroundColor, blur: cs.backdropFilter || cs.webkitBackdropFilter }; });
ok(/blur/.test(barra.blur) && !/ 0\.9\)/.test(barra.bg), `barra de baixo quase opaca e com desfoque (${barra.bg} · ${barra.blur})`);
await p3.screenshot({ path: "saida/puxar-perfil.png" });
await A.browser.close();
for (const x of [`diario/${id}`, `diario/${pid}`, `comunidade/${cid}`]) await db.doc(x).delete();
console.log(falhas ? `${falhas} falha(s)` : "tudo certo"); process.exit(falhas ? 1 : 0);
