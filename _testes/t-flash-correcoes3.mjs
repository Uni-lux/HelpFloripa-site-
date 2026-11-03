// Flash, prints de 03/11/2026 (2ª leva):
// 1) zoom da página travado com o criador aberto (os botões ficavam gigantes) e solto ao fechar
// 2) link do negócio: "Fechar" não apaga mais; tocar na figurinha mostra o negócio atual + "Tirar o link"; ↶ desfaz
// 3) repostar abre o criador direto (tela preta por cima, sem o Diário carregando) e mostra as figurinhas do original
// 4) menção oculta com as regras antigas: explica por que não dá para repostar
// 5) visor: enquete e caixa de perguntas não ficam uma por cima da outra
// Uso: node t-flash-correcoes3.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, BASE, USUARIOS as U } from "./nav.mjs";
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
let falhas = 0; const ok = (c, t) => { console.log((c ? "  ✔ " : "  ✘ ") + t); if (!c) { falhas++; process.exitCode = 1; } };
const agora = Date.now(), ts = (m) => Timestamp.fromMillis(m);
const JPEG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";
for (const u of [U.bruno, U.ana]) for (const d of (await db.collection("stories").where("autorId", "==", u).get()).docs) await d.ref.delete();
await db.doc(`relacoes/${U.ana}_${U.bruno}`).set({ tipo: "seguir", seguidorId: U.ana, alvoId: U.bruno, criadoEm: Timestamp.now() });
const base = { autorId: U.bruno, nome: "Bruno Reparos", tipo: "imagem", midia: JPEG, perfil: true };
// enquete e caixa quase no mesmo lugar (o que aconteceu no print)
await db.doc("stories/fc3Junto").set({ ...base, criadoEm: ts(agora - 3600e3), mencoes: [U.ana],
  enquete: { pergunta: "Jjj", opcoes: ["Sim", "Não"], x: 0.5, y: 0.5, fimEm: ts(agora + 20 * 3600e3) },
  caixa: { pergunta: "Me faça uma pergunta", anonima: false, x: 0.55, y: 0.58 },
  link: { negocioId: `${U.bruno}_servicos`, nome: "Bruno Reparos", tipo: "servicos", x: 0.5, y: 0.85 } });
// menção oculta gravada com as regras antigas: a Ana não ficou em `mencoes`
await db.doc("stories/fc3Oculta").set({ ...base, criadoEm: ts(agora - 1800e3) });

const { browser, ctx } = await navegador({ mobile: true });
const p = await entrar(ctx, "ana", "feed.html");
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForTimeout(3000);
const cdp = await ctx.newCDPSession(p);
const toque = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
const tocar = async (b) => { const x = b.x + b.width / 2, y = b.y + b.height / 2; await toque("touchStart", [[x, y]]); await p.waitForTimeout(50); await toque("touchEnd", []); await p.waitForTimeout(400); };

// ---------- 1) zoom ----------
console.log("Zoom da página");
await p.locator(".story-circ").first().locator(".mais").tap();
await p.waitForSelector(".flash-criar", { timeout: 8000 }); await p.waitForTimeout(600);
const vp = () => p.evaluate(() => document.querySelector('meta[name="viewport"]').content);
ok(/maximum-scale=1, user-scalable=no/.test(await vp()), "criador aberto: zoom travado");
ok(await p.evaluate(() => getComputedStyle(document.querySelector(".flash-criar")).touchAction) === "pan-x pan-y", "criador sem pinça da página (touch-action)");

// ---------- 2) link do negócio ----------
console.log("Link do negócio");
await p.locator(".flash-modos button", { hasText: "Texto" }).tap(); await p.waitForTimeout(300);
await p.keyboard.type("Oi"); await p.locator(".flash-texto").blur();
await p.locator(".flash-ferr-btn[aria-label^='Figurinhas']").tap(); await p.waitForTimeout(300);
await p.locator(".fig-pilula", { hasText: "Link do negócio" }).tap();
await p.waitForSelector(".mencao-item", { timeout: 8000 });
ok(await p.locator(".figs-dica", { hasText: "o de outra pessoa" }).count() === 1, "explica que pode ser o seu negócio ou o de outra pessoa");
await p.locator(".mencao-item").first().tap(); await p.waitForTimeout(400);
const lk = p.locator(".flash-camada .flash-link");
ok(await lk.count() === 1, "figurinha de link posta");
await tocar(await lk.boundingBox());
ok(await p.locator(".figs-tit", { hasText: "Trocar o negócio do link" }).count() === 1 && await p.locator(".lk-atual").count() === 1, "tocar na figurinha mostra o negócio atual");
await p.locator(".flash-figs .fe-pronto", { hasText: "Fechar" }).tap(); await p.waitForTimeout(300);
ok(await lk.count() === 1, "Fechar não apaga o link (antes o botão era “Tirar”)");
await tocar(await lk.boundingBox());
await p.locator(".lk-tirar").tap(); await p.waitForTimeout(300);
ok(await lk.count() === 0, "“Tirar o link” tira");
await p.locator(".flash-desfazer").first().tap(); await p.waitForTimeout(300);
ok(await lk.count() === 1, "↶ traz o link de volta");
await p.keyboard.press("Escape"); await p.waitForTimeout(400);
const descartar = p.locator("button", { hasText: "Descartar" });
if (await descartar.count()) { await descartar.first().tap(); await p.waitForTimeout(400); }
ok(await p.locator(".flash-criar").count() === 0, "criador fechou");
ok(!/user-scalable=no/.test(await vp()), "ao fechar, o zoom volta ao normal");

// ---------- 3) repost: direto e com as figurinhas ----------
console.log("Repostar");
await p.goto(BASE + "feed.html?repostar=fc3Junto");
const capaNoInicio = await p.evaluate(() => document.documentElement.classList.contains("hf-volta-flash"));
ok(capaNoInicio, "tela preta por cima enquanto abre (sem o Diário carregando)");
await p.waitForSelector(".flash-criar", { timeout: 12000 });
await p.waitForTimeout(1200);
ok(!(await p.evaluate(() => document.documentElement.classList.contains("hf-volta-flash"))), "a tela preta sai quando o criador abre");
ok(await p.locator(".flash-camada .flash-orig").count() === 3, "as figurinhas do original aparecem na hora (enquete, perguntas, link)");
ok(await p.locator(".flash-orig.flash-enq", { hasText: "Jjj" }).count() === 1, "com o texto do original");
const prev = await p.locator(".flash-camada .flash-orig").evaluateAll((l) => l.map((e) => { const r = e.getBoundingClientRect(); return [r.top, r.bottom]; }).sort((a, b) => a[0] - b[0]));
ok(prev.every((c, i) => !i || prev[i - 1][1] <= c[0] + 1), "no criador as prévias também não se cobrem");
await p.screenshot({ path: "saida/fc3-repost.png" });
await p.keyboard.press("Escape"); await p.waitForTimeout(400);
if (await descartar.count()) { await descartar.first().tap(); await p.waitForTimeout(400); }

// ---------- 4) menção oculta (regras antigas) ----------
console.log("Menção oculta");
await p.goto(BASE + "feed.html?repostar=fc3Oculta"); await p.waitForTimeout(3500);
ok(await p.locator(".flash-criar").count() === 0, "não abre o criador");
const msg = await p.locator(".toast").last().textContent().catch(() => "");
ok(/oculta/.test(msg || ""), `explica o motivo (“${(msg || "").trim().slice(0, 70)}…”)`);
ok(!(await p.evaluate(() => document.documentElement.classList.contains("hf-volta-flash"))), "a tela preta sai");

// ---------- 5) visor sem sobreposição ----------
console.log("Visor");
await p.goto(BASE + "feed.html?flash=fc3Junto");
await p.waitForSelector(".story-visor .story-enq", { timeout: 12000 }); await p.waitForTimeout(1500);
const caixas = await p.locator(".story-visor .story-quadro > .story-enq, .story-visor .story-quadro > a.story-link:not(.story-post)").evaluateAll((l) => l.map((e) => { const r = e.getBoundingClientRect(); return [r.top, r.bottom]; }));
caixas.sort((a, b) => a[0] - b[0]);
ok(caixas.length === 3 && caixas.every((c, i) => !i || caixas[i - 1][1] <= c[0] + 1), `enquete, perguntas e link sem uma cobrir a outra (${caixas.map((c) => c.map(Math.round).join("–")).join(" · ")})`);
const q = await p.locator(".story-quadro").boundingBox();
ok(caixas.every(([a, b]) => a >= q.y - 1 && b <= q.y + q.height + 1), "as duas dentro do quadro");
await p.screenshot({ path: "saida/fc3-visor.png" });

ok(!erros.length, "sem erros na página" + (erros.length ? ": " + erros.slice(0, 3).join(" | ") : ""));
for (const id of ["fc3Junto", "fc3Oculta"]) await db.doc(`stories/${id}`).delete();
await browser.close();
console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
