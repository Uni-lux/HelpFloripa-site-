// Rede (rede.html): cache do aparelho nos quadros (Diário e Flash aparecem antes do servidor), troca de aba em cubo,
// troca de pessoa no Flash em cubo (também com "reduzir movimento"), avisos só quando sai algo escrito e nome "Vídeos".
// Uso: node t-rede-cubo.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const PX = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
for (let k = 0; k < 6; k++) await db.doc(`diario/cubo${k}`).set({ autorId: k % 2 ? U.bruno : U.edu, nome: "Teste", texto: `Publicação do cubo ${k}`, tipo: "texto", autorUf: "SC", autorIbge: 4205407, criadoEm: Timestamp.fromMillis(Date.now() - k * 600000) });
for (const u of [U.bruno, U.edu]) await db.doc(`relacoes/${U.ana}_${u}`).set({ tipo: "seguir", seguidorId: U.ana, alvoId: u, criadoEm: Timestamp.now() });
await db.doc("stories/cuboB").set({ autorId: U.bruno, nome: "Bruno", tipo: "foto", mediaUrl: PX, criadoEm: Timestamp.now() });
await db.doc("stories/cuboE").set({ autorId: U.edu, nome: "Edu", tipo: "foto", mediaUrl: PX, criadoEm: Timestamp.fromMillis(Date.now() - 60000) });
const erros = [];
const A = await navegador({ mobile: true, rede: true });
await A.ctx.addInitScript(() => { try { Object.defineProperty(window, "matchMedia", { value: ((mm) => (q) => (/reduced-motion/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : mm(q)))(window.matchMedia.bind(window)) }); } catch {} });
const p = await entrar(A.ctx, "ana", "feed.html");
await p.emulateMedia({ reducedMotion: "reduce" });
p.on("pageerror", (e) => erros.push(e.message));
await p.waitForURL(/rede\.html/, { timeout: 15000 }).catch(() => {});
const feed = () => p.frames().find((f) => f.parentFrame() && /feed\.html/.test(f.url()));
await p.waitForTimeout(3000);
await feed().waitForSelector("#listaFeed .post-card", { timeout: 20000 });
await feed().waitForSelector("#storiesFeed .story-circ:not(.meu)", { timeout: 20000 });
await p.waitForTimeout(4000);
// 1) cache do aparelho dentro do quadro: com o servidor atrasado 4 s, Diário e Flash aparecem antes
await A.ctx.route(/127\.0\.0\.1:8085\/.*(Listen|Write)\/channel/, async (r) => { await new Promise((ok) => setTimeout(ok, 4000)); r.continue().catch(() => {}); });
const t0 = Date.now();
await p.goto("http://127.0.0.1:5057/rede.html?aba=diario", { waitUntil: "commit" });
for (let i = 0; i < 100 && !feed(); i++) await p.waitForTimeout(50);
const tPost = await feed().waitForSelector("#listaFeed .post-card", { timeout: 20000 }).then(() => Date.now() - t0).catch(() => null);
const tFlash = await feed().waitForSelector("#storiesFeed .story-circ:not(.meu) .avatar", { timeout: 20000 }).then(() => Date.now() - t0).catch(() => null);
ok(tPost !== null && tPost < 9000, `dentro da rede, as primeiras publicações chegam logo depois do servidor (${tPost} ms com o servidor atrasado 4 s; os quadros usam só a memória)`);
ok(tFlash !== null && tFlash < 3800, `dentro da rede, fileira do Flash antes do servidor (${tFlash} ms)`);
const nomeAnel = await feed().evaluate(() => [...document.querySelectorAll("#storiesFeed .story-circ:not(.meu) .nome")].map((x) => x.textContent).join(","));
ok(!/^\.\.\./.test(nomeAnel) && nomeAnel.length > 0, `anel guardado já com o nome (${nomeAnel})`);
await A.ctx.unroute(/127\.0\.0\.1:8085\/.*(Listen|Write)\/channel/);
await p.waitForTimeout(6000);

// 2) troca de aba em cubo (com "reduzir movimento" ligado)
const cdp = await A.ctx.newCDPSession(p);
const toque = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
const W = await p.evaluate(() => innerWidth);
await p.evaluate(() => window.__hfShell.ir("explorar")); await p.waitForTimeout(1200);
const y = await feed().evaluate(() => {
  for (let y = 600; y > 140; y -= 20) {
    const ok = [innerWidth * 0.85, innerWidth * 0.5, innerWidth * 0.2].every((x) => { for (let n = document.elementFromPoint(x, y); n && n !== document.body; n = n.parentElement) { const o = getComputedStyle(n).overflowX; if (n.scrollWidth > n.clientWidth + 4 && (o === "auto" || o === "scroll")) return false; } return true; });
    if (ok) return y;
  }
  return 600;
});
await toque("touchStart", [[W - 40, y]]);
for (let k = 1; k <= 8; k++) { await toque("touchMove", [[W - 40 - k * 18, y + 1]]); await p.waitForTimeout(18); }
const meio = await p.evaluate(() => [...document.querySelectorAll(".hf-quadro.movendo")].map((q) => q.style.transform));
ok(meio.length === 2 && meio.every((t) => /rotateY\(-?\d/.test(t)), `as duas abas giram como um cubo (${meio.map((t) => (t.match(/rotateY\([^)]*\)/) || [""])[0]).join(" | ")})`);
for (let k = 9; k <= 14; k++) { await toque("touchMove", [[W - 40 - k * 18, y + 1]]); await p.waitForTimeout(18); }
await toque("touchEnd", []);
await p.waitForTimeout(150);
const animando = await p.evaluate(() => document.querySelector(".hf-quadro.movendo")?.style.transform || "");
await p.waitForTimeout(600);
ok(/rotateY/.test(animando), "o giro continua sozinho depois de soltar, mesmo com as animações desligadas");
ok(await p.evaluate(() => document.querySelector(".hf-quadro.ativo")?.dataset.id) === "mural", "chegou na Comunidade");
ok(await p.evaluate(() => !document.querySelector(".hf-quadro[style*=rotateY]")), "sem giro sobrando no fim");
// barra de baixo igual no item atual (azul com fundinho), sem o "hover" preso
const est = await p.evaluate(() => { const d = document.querySelector('.hf-quadro[data-id="mural"]').contentDocument; const a = d.querySelector("#barraRede [aria-current=page]"); const cs = getComputedStyle(a); return { cor: cs.color, fundo: cs.backgroundColor }; });
ok(est.fundo !== "rgba(0, 0, 0, 0)", `item atual da barra com o fundinho (${est.cor} · ${est.fundo})`);

// 3) Flash: deslizar para a próxima pessoa gira em cubo
await p.evaluate(() => window.__hfShell.ir("diario")); await p.waitForTimeout(1500);
const f = feed();
await f.locator("#storiesFeed .story-circ:not(.meu)").first().tap();
await f.waitForSelector(".story-visor", { timeout: 10000 });
await p.waitForTimeout(800);
const nome1 = await f.evaluate(() => document.querySelector(".story-topo strong")?.textContent);
await toque("touchStart", [[W - 80, 400]]);
for (let k = 1; k <= 8; k++) { await toque("touchMove", [[W - 80 - k * 18, 401]]); await p.waitForTimeout(18); }
const faceMeio = await f.evaluate(() => ({ face: !!document.querySelector(".story-face"), tr: document.querySelector(".story-caixa")?.style.transform || "" }));
ok(faceMeio.face && /rotateY/.test(faceMeio.tr), "deslizando no Flash, a próxima pessoa aparece ao lado e o flash gira em cubo");
for (let k = 9; k <= 12; k++) { await toque("touchMove", [[W - 80 - k * 18, 401]]); await p.waitForTimeout(18); }
await toque("touchEnd", []); await p.waitForTimeout(900);
const nome2 = await f.evaluate(() => document.querySelector(".story-topo strong")?.textContent);
ok(nome2 && nome2 !== nome1, `passou para a próxima pessoa (${nome1} → ${nome2})`);
ok(await f.evaluate(() => !document.querySelector(".story-face") && !document.querySelector(".story-caixa").style.transform), "sem face sobrando");
await p.keyboard.press("Escape"); await p.waitForTimeout(600);
await f.evaluate(() => document.querySelector(".story-visor")?.querySelector("[aria-label=Fechar], .story-fechar")?.click());
await p.waitForTimeout(600);

// 4) Nova publicação: trocar de tipo vazio não avisa nada; com algo escrito avisa; nome "Vídeos"
await f.locator("#btnComporFeed").tap(); await f.waitForSelector("#folhaPublicar.aberta");
const avisos = [];
await f.evaluate(() => { window.__avisos = []; new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.classList?.contains("toast")) window.__avisos.push(n.textContent); }))).observe(document.body, { childList: true }); });
for (const id of ["#pubEnqueteBtn", "#pubTipoFoto", "#pubCaixaBtn", "#pubEnqueteBtn", "#pubTipoTexto"]) { await f.locator(id).tap(); await p.waitForTimeout(250); }
avisos.push(...await f.evaluate(() => window.__avisos));
ok(!avisos.length, `trocar de tipo sem escrever nada não mostra aviso (${avisos.join(" | ") || "nenhum"})`);
await f.locator("#pubEnqueteBtn").tap(); await p.waitForTimeout(250);
await f.locator("#pubEnquete .pe-pergunta").fill("Qual o melhor?");
await f.locator("#pubTipoFoto").tap(); await p.waitForTimeout(300);
ok((await f.evaluate(() => window.__avisos)).some((t) => /enquete saiu/.test(t)), "com a enquete escrita, avisa que ela saiu");
const icones = await f.evaluate(() => ({ lapis: getComputedStyle(document.querySelector("#btnComporFeed .tc-ic")).backgroundImage, foto: getComputedStyle(document.querySelector("#pubEscolher .ic")).backgroundImage }));
ok(!/gradient/.test(icones.lapis) && !/gradient/.test(icones.foto), "lápis e ícone de foto sem o azul");
await p.keyboard.press("Escape"); await p.waitForTimeout(500);
const tipos = await f.evaluate(() => [...document.querySelectorAll("#tiposFeed button")].map((b) => b.title || b.getAttribute("aria-label")).join(","));
ok(/Vídeos/.test(tipos) && !/Reels/.test(tipos), `filtro sem o nome “Reels” (${tipos})`);
await p.screenshot({ path: "saida/rede-cubo.png" });
for (let k = 0; k < 6; k++) await db.doc(`diario/cubo${k}`).delete();
for (const id of ["cuboB", "cuboE"]) await db.doc(`stories/${id}`).delete();
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close();
