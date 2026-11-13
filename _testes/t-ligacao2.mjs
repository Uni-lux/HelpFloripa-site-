// Ligações (09/11/2026, revisão pedida pelo dono) + flash direto do Mensagens (como o Instagram).
// 1) Na rede (rede.html, 4 quadros com o firebase.js cada): a ligação toca UMA vez, aparece por cima da aba em que a
//    pessoa está (o quadro que ouve sobe com .por-cima) e desce no fim. Foto de quem liga aparece.
// 2) Cancelar logo depois de tocar em Ligar não deixa a chamada "chamando" (antes a outra pessoa via tocar 45 s).
// 3) A mesma conta em dois aparelhos: atendeu num, o outro para de tocar ("Atendida em outro aparelho").
// 4) Flash no Mensagens dentro da rede: abre no quadro do Diário por cima do chat, sem trocar de página; os outros
//    flashes da pessoa entram por trás; fechar volta para a conversa como estava.
// 5) Mensagens sozinho (fora da rede): troca de página, usa o flash que o chat já leu e fechar volta para o chat.
// Uso: node seed.mjs && node t-ligacao2.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, garantirImagem } from "./nav.mjs";
import { readFileSync } from "node:fs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const limparChamadas = async () => { for (const d of (await db.collection("chamadas").get()).docs) await d.ref.delete(); };
await limparChamadas();
const PX = "data:image/png;base64," + readFileSync(garantirImagem("saida/foto-lig2.png", 540, 960)).toString("base64");
const FOTO = "data:image/png;base64," + readFileSync(garantirImagem("saida/foto-lig2-perfil.png", 120, 120)).toString("base64");
const fotoAntes = (await db.doc(`perfis_publicos/${U.bruno}`).get()).data()?.fotoPerfil || "";
await db.doc(`perfis_publicos/${U.bruno}`).set({ fotoPerfil: FOTO }, { merge: true });

// Todas as telas de chamada abertas em qualquer quadro da página.
const telas = (p) => Promise.all(p.frames().map((f) => f.locator(".hfl").count().catch(() => 0))).then((l) => l.reduce((a, b) => a + b, 0));
const quadroCom = async (p, sel) => { for (const f of p.frames()) if (await f.locator(sel).count().catch(() => 0)) return f; return null; };
const esperar = async (fn, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 200)); } return false; };

// ---------- 1) rede: toca uma vez, por cima da aba atual ----------
{
  const A = await navegador({ mobile: true, camera: true, rede: true }), B = await navegador({ mobile: true, camera: true });
  const ana = await entrar(A.ctx, "ana", "rede.html?aba=diario");
  const bru = await entrar(B.ctx, "bruno", `mensagens.html?conversa=${U.conv}`);
  await bru.waitForSelector("#btnLigar:not([hidden])", { timeout: 20000 });
  // Espera os 4 quadros carregarem (cada um com o seu firebase.js) e vai para a Comunidade: quem ouve é o Diário.
  await esperar(async () => ana.frames().filter((f) => f.parentFrame() && /(feed|mural|mensagens|usuarios)\.html/.test(f.url())).length >= 4, 40000);
  await ana.waitForTimeout(4000);
  const donos = await ana.evaluate(() => { const w = window.__hfLig?.dono; return [...document.querySelectorAll("iframe.hf-quadro")].filter((f) => f.contentWindow === w).map((f) => f.dataset.id); });
  ok(donos.length === 1, "só um quadro da rede ouve as ligações: " + donos.join(","));
  await ana.evaluate(() => window.__hfShell.ir("comunidade"));
  await ana.waitForTimeout(600);
  await bru.click("#btnLigar");
  ok(await esperar(async () => (await telas(ana)) >= 1), "Ana recebe a ligação na rede");
  await ana.waitForTimeout(1500);
  ok(await telas(ana) === 1, `a ligação toca UMA vez (telas abertas: ${await telas(ana)})`);
  const subiu = await ana.evaluate(() => { const f = document.querySelector("iframe.hf-quadro.por-cima"); return f ? [f.dataset.id, getComputedStyle(f).visibility, f.getBoundingClientRect().width] : null; });
  ok(subiu && subiu[1] === "visible" && subiu[2] > 300, "a tela da chamada sobe por cima da aba atual (Comunidade): " + JSON.stringify(subiu));
  const fq = await quadroCom(ana, ".hfl");
  const foto = await fq.evaluate(() => getComputedStyle(document.querySelector(".hfl-foto")).backgroundImage);
  ok(/data:image\/png/.test(foto), "a foto de quem liga aparece (antes lia um campo que não existe)");
  ok((await fq.textContent(".hfl-topo b")).includes("Bruno"), "nome de quem liga");
  await fq.click(".hfl-bt.atender");
  ok(await esperar(async () => /^\d\d:\d\d$/.test(((await bru.textContent(".hfl-topo span").catch(() => "")) || "").trim())), "conectou (cronômetro do Bruno)");
  await bru.locator(".hfl-bt.fim").click();
  ok(await esperar(async () => (await telas(ana)) === 0, 10000), "Bruno encerra: a tela da Ana fecha");
  ok(await ana.evaluate(() => !document.querySelector("iframe.hf-quadro.por-cima")), "o quadro desce de novo (a Comunidade volta a aparecer)");
  await ana.screenshot({ path: "saida/lig2-rede.png" });
  await A.browser.close(); await B.browser.close();
}

// ---------- 2) cancelar logo depois de ligar ----------
{
  await limparChamadas();
  const B = await navegador({ mobile: true, camera: true });
  const bru = await entrar(B.ctx, "bruno", `mensagens.html?conversa=${U.conv}`);
  await bru.waitForSelector("#btnLigar:not([hidden])", { timeout: 20000 }); await bru.waitForTimeout(1500);
  // Cancela no meio da criação da chamada (antes do setDoc terminar).
  await bru.evaluate(() => { document.getElementById("btnLigar").click(); const t0 = Date.now(); const vai = () => { const b = document.querySelector(".hfl-bt.fim"); if (b && !b.dataset.f) { b.dataset.f = 1; setTimeout(() => b.click(), 30); } else if (Date.now() - t0 < 4000) requestAnimationFrame(vai); }; vai(); });
  await bru.waitForTimeout(4000);
  const ch = (await db.collection("chamadas").get()).docs.map((d) => d.data().status);
  ok(!ch.includes("chamando"), "cancelou na hora: nenhuma chamada fica tocando → " + (ch.join(",") || "nenhuma criada"));
  ok(await bru.evaluate(() => !document.querySelector(".hfl")), "a tela fecha");
  await B.browser.close();
}

// ---------- 3) dois aparelhos da mesma conta ----------
{
  await limparChamadas();
  const A1 = await navegador({ mobile: true, camera: true }), A2 = await navegador({ mobile: false, camera: true }), B = await navegador({ mobile: true, camera: true });
  const a1 = await entrar(A1.ctx, "ana", "index.html"), a2 = await entrar(A2.ctx, "ana", "index.html");
  const bru = await entrar(B.ctx, "bruno", `mensagens.html?conversa=${U.conv}`);
  await bru.waitForSelector("#btnLigar:not([hidden])", { timeout: 20000 }); await bru.waitForTimeout(3000);
  await bru.click("#btnLigar");
  await a1.waitForSelector(".hfl", { timeout: 15000 }); await a2.waitForSelector(".hfl", { timeout: 15000 });
  ok(true, "os dois aparelhos da Ana tocam");
  await a1.click(".hfl-bt.atender");
  ok(await esperar(async () => /outro aparelho/.test(await a2.textContent(".hfl").catch(() => "")), 10000), "o outro aparelho mostra \"Atendida em outro aparelho\"");
  ok(await esperar(async () => !(await a2.locator(".hfl").count()), 8000), "e para de tocar (fecha)");
  ok(await esperar(async () => /^\d\d:\d\d$/.test(((await a1.textContent(".hfl-topo span").catch(() => "")) || "").trim())), "a ligação continua no aparelho que atendeu");
  await a1.locator(".hfl-bt.fim").click(); await bru.waitForTimeout(1500);
  ok(!(await bru.locator(".hfl").count()), "a Ana encerra e a tela do Bruno fecha");
  await A1.browser.close(); await A2.browser.close(); await B.browser.close();
}

// ---------- flashes do Bruno + cartão no chat da Ana ----------
for (const s of (await db.collection("stories").where("autorId", "==", U.bruno).get()).docs) await s.ref.delete();
const agora = Date.now();
const f1 = (await db.collection("stories").add({ restrito: false, autorId: U.bruno, nome: "Bruno Reparos", tipo: "imagem", midia: PX, texto: "Primeiro", criadoEm: Timestamp.fromMillis(agora - 3600e3) })).id;
const f2 = (await db.collection("stories").add({ restrito: false, autorId: U.bruno, nome: "Bruno Reparos", tipo: "imagem", midia: PX, texto: "Segundo", contagem: { titulo: "Inauguração", fim: Timestamp.fromMillis(agora + 86400e3), x: 0.5, y: 0.5 }, criadoEm: Timestamp.fromMillis(agora - 1800e3) })).id;
const f3 = (await db.collection("stories").add({ restrito: false, autorId: U.bruno, nome: "Bruno Reparos", tipo: "imagem", midia: PX, texto: "Terceiro", criadoEm: Timestamp.fromMillis(agora - 600e3) })).id;
await db.collection(`conversas/${U.conv}/mensagens`).add({ remetenteId: U.bruno, texto: "", tipoArquivo: "cartao", cartao: { tipo: "flash", acao: "mencao", flashId: f2, autorId: U.bruno, nome: "Bruno Reparos" }, criadoEm: Timestamp.now() });
await db.doc(`conversas/${U.conv}`).set({ atualizadoEm: Timestamp.now() }, { merge: true });

// ---------- 4) flash direto dentro da rede ----------
{
  const A = await navegador({ mobile: true, rede: true });
  const ana = await entrar(A.ctx, "ana", "rede.html?aba=diario");
  await esperar(async () => ana.frames().filter((f) => f.parentFrame() && /(feed|mural|mensagens|usuarios)\.html/.test(f.url())).length >= 4, 40000);
  await ana.waitForTimeout(2500);
  await ana.evaluate(() => window.__hfShell.ir("mensagens"));
  const msg = ana.frames().find((f) => /mensagens\.html/.test(f.url()));
  await msg.evaluate((c) => { location.href = "mensagens.html?conversa=" + c; }, U.conv).catch(() => {});
  await ana.waitForTimeout(500);
  const m = ana.frames().find((f) => /mensagens\.html/.test(f.url()));
  await m.waitForSelector(".rsp-mini:not(.carregando) img", { timeout: 20000 });
  const urlAntes = m.url();
  const t0 = Date.now();
  await m.locator(".rsp-mini").last().click();
  const feed = () => ana.frames().find((f) => /feed\.html/.test(f.url()));
  const abriu = await esperar(async () => !!(await feed()?.locator(".story-visor").count().catch(() => 0)), 10000);
  const ms = Date.now() - t0;
  ok(abriu, `flash do chat abre na rede sem trocar de página (${ms} ms)`);
  ok(ms < 2500, "abre rápido (menos de 2,5 s; antes carregava o Diário inteiro no lugar do chat)");
  ok(ana.frames().some((f) => f.url() === urlAntes), "o quadro do Mensagens continua na conversa (não navegou)");
  const cima = await ana.evaluate(() => document.querySelector("iframe.hf-quadro.por-cima")?.dataset.id);
  ok(cima === "feed", "o Diário fica por cima do chat enquanto o flash está aberto");
  ok(/Segundo/.test(await feed().textContent(".story-legenda").catch(() => "")), "abre no flash tocado (o 2º do Bruno)");
  ok(await esperar(async () => (await feed().locator(".story-barra").count()) === 3, 8000), "os outros flashes do Bruno entram por trás (3 barras)");
  ok(await feed().evaluate(() => [...document.querySelectorAll(".story-barra i")].map((i) => i.style.width)[0] === "100%"), "a barra continua no 2º (o 1º aparece como já passado)");
  ok(await feed().locator(".story-ct, .story-enq").count() > 0, "figurinha de contagem com as datas certas (vieram do chat)");
  await ana.screenshot({ path: "saida/lig2-flash-rede.png" });
  await feed().locator(".story-btn[aria-label='Fechar']").click();
  ok(await esperar(async () => !(await feed().locator(".story-visor").count()), 5000), "fechar o flash");
  await ana.waitForTimeout(800);
  ok(await ana.evaluate(() => !document.querySelector("iframe.hf-quadro.por-cima") && window.__hfShell.atual === "mensagens"), "volta para a conversa (aba Mensagens)");
  ok(ana.frames().some((f) => f.url() === urlAntes), "a conversa continua aberta como estava");
  // "Voltar" do celular com o flash aberto: fecha o flash e fica no chat (não sai da rede).
  await m.locator(".rsp-mini").last().click();
  await esperar(async () => !!(await feed()?.locator(".story-visor").count().catch(() => 0)), 8000);
  await ana.waitForTimeout(600);
  await ana.goBack().catch(() => {});
  ok(await esperar(async () => !(await feed().locator(".story-visor").count()), 5000), "voltar do celular fecha o flash");
  await ana.waitForTimeout(800);
  ok(/rede\.html/.test(ana.url()) && await ana.evaluate(() => !document.querySelector("iframe.hf-quadro.por-cima") && window.__hfShell.atual === "mensagens"), "e fica na conversa, dentro da rede: " + ana.url());
  await A.browser.close();
}

// ---------- 5) Mensagens sozinho ----------
{
  const A = await navegador({ mobile: true });
  const ana = await entrar(A.ctx, "ana", `mensagens.html?conversa=${U.conv}`);
  await ana.waitForSelector(".rsp-mini:not(.carregando) img", { timeout: 20000 });
  let leuFlash = 0;
  ana.on("request", (r) => { if (/feed\.html/.test(ana.url()) && /stories%2F|stories\//.test(r.url()) && /Listen|commit|documents/.test(r.url())) leuFlash++; });
  await ana.locator(".rsp-mini").last().click();
  await ana.waitForURL(/feed\.html\?flash=/, { timeout: 10000 });
  ok(await esperar(async () => !!(await ana.locator(".story-visor").count()), 10000), "fora da rede: abre o flash no Diário");
  ok(/Segundo/.test(await ana.textContent(".story-legenda").catch(() => "")), "no flash tocado");
  ok(await ana.evaluate(() => !sessionStorage.getItem("hf-flash-pronto")), "o flash guardado pelo chat foi usado (e apagado da aba)");
  await ana.locator(".story-btn[aria-label='Fechar']").click();
  ok(await esperar(async () => /mensagens\.html/.test(ana.url()), 8000), "fechar volta para o chat: " + ana.url());
  await A.browser.close();
}
await db.doc(`perfis_publicos/${U.bruno}`).set({ fotoPerfil: fotoAntes }, { merge: true });
await limparChamadas();
