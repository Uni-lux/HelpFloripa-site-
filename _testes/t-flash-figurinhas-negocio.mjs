// Figurinhas do Flash fora do flash de quem criou: (1) flash publicado no PERFIL DE UM NEGÓCIO (vitrine e bolinhas do
// perfil) abre o visor completo com enquete, caixa de perguntas, contagem, # e link; votar conta no flash; (2) REPOST de
// quem foi marcado leva as figurinhas do original (os votos contam no original) e a foto do original fica parada.
// Roda: FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 node t-flash-figurinhas-negocio.mjs  (rode o seed.mjs antes)
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, BASE, USUARIOS as U } from "./nav.mjs";
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
let falhas = 0; const ok = (c, t) => { console.log((c ? "  ✔ " : "  ✘ ") + t); if (!c) falhas++; };
const agora = Date.now(), ts = (m) => Timestamp.fromMillis(m), criados = [];
const pôr = async (c, id, d) => { await db.doc(`${c}/${id}`).set(d); criados.push(`${c}/${id}`); };
const JPEG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";
const NEG = `${U.bruno}_servicos`;
const planoAntes = (await db.doc(`planos/${U.bruno}`).get()).data() || null;
await db.doc(`planos/${U.bruno}`).set({ plano: "plus", meses: 1, ate: ts(agora + 30 * 864e5) });
// Limpa flashes antigos do Bruno e da Ana (de outros testes)
for (const u of [U.bruno, U.ana]) for (const d of (await db.collection("stories").where("autorId", "==", u).get()).docs) await d.ref.delete();
const figurinhas = (pergunta) => ({
  enquete: { pergunta, opcoes: ["Sim", "Não"], x: 0.5, y: 0.62, fimEm: ts(agora + 20 * 3600e3) },
  caixa: { pergunta: "Qual serviço você quer?", anonima: false, x: 0.5, y: 0.4 },
  contagem: { titulo: "Promoção acaba", fim: ts(agora + 5 * 864e5), x: 0.5, y: 0.22 },
  toques: ["h|reforma|0.5|0.8|0.3|0.05"]
});
await pôr("stories", "fnFig1", { restrito: false, autorId: U.bruno, nome: "Bruno Reparos", tipo: "imagem", midia: JPEG, negocios: [NEG], perfil: false, criadoEm: ts(agora - 3600e3), ...figurinhas("Faz orçamento no sábado?") });

// ---------- 1) vitrine do negócio ----------
console.log("Perfil do negócio (vitrine)");
const A = await navegador({ mobile: true });
const erros = [];
const pa = await entrar(A.ctx, "ana", "sobre.html");
pa.on("pageerror", (x) => erros.push(x.message));
await pa.goto(BASE + `servicos.html?negocio=${NEG}`);
await pa.waitForSelector(".vd-logo.fn-anel", { timeout: 20000 }).catch(() => {});
ok(await pa.locator(".vd-logo.fn-anel").count() === 1, "anel do flash na foto do negócio");
await pa.locator(".vd-logo").click();
await pa.waitForSelector(".story-visor .story-enq", { timeout: 25000 }).catch(() => {});
await pa.waitForTimeout(1200);
ok((await pa.locator(".story-visor .story-nome strong").textContent().catch(() => "")).includes("Bruno Reparos") && /por Bruno/.test(await pa.locator(".story-por").textContent().catch(() => "")), "topo com o negócio e \"por Bruno\"");
ok(await pa.locator(".story-visor .story-enq:not(.story-ct):not(.story-cx)").count() === 1, "enquete aparece");
ok(await pa.locator(".story-visor .story-cx").count() === 1, "caixa de perguntas aparece");
ok(await pa.locator(".story-visor .story-ct").count() === 1 && /Promoção acaba/.test(await pa.locator(".story-visor .story-ct").textContent()), "contagem regressiva aparece");
ok(await pa.locator(".story-visor .story-fig-toque").count() === 1, "hashtag tocável aparece");
await pa.screenshot({ path: "saida/fn-figurinhas-negocio.png" });
await pa.locator(".story-visor .story-enq:not(.story-ct):not(.story-cx) button", { hasText: "Sim" }).first().click();
await pa.waitForTimeout(2000);
const votoA = (await db.collection("enquete_votos").where("uid", "==", U.ana).where("itemId", "==", "fnFig1").get()).docs.map((d) => d.data());
ok(votoA.length === 1 && votoA[0].alvo === "f_fnFig1" && votoA[0].opcao === 0, "votar na enquete do flash do negócio conta (" + (votoA[0]?.alvo || "nenhum voto") + ")");
await pa.keyboard.press("Escape");
await pa.waitForURL(/servicos\.html/, { timeout: 10000 }).catch(() => {});
ok(/servicos\.html/.test(pa.url()), "fechar volta para a vitrine");

// ---------- 2) bolinha do negócio no perfil do Bruno (abre ali mesmo) ----------
console.log("Bolinha do negócio no perfil");
await pa.goto(BASE + `usuarios.html?perfil=${U.bruno}`);
await pa.waitForSelector("#ppCabecalho [data-el=negocios] .vinculo .avatar.fn-anel", { timeout: 20000 }).catch(() => {});
const url0 = pa.url();
await pa.locator("#ppCabecalho [data-el=negocios] .vinculo .avatar.fn-anel").first().click();
await pa.waitForSelector(".story-visor .story-cx", { timeout: 15000 }).catch(() => {});
ok(await pa.locator(".story-visor .story-cx").count() === 1 && pa.url() === url0, "abre o visor completo na própria página do perfil");
ok(await pa.locator(".fn-visor").count() === 0, "o visor leve antigo não é usado");
await pa.keyboard.press("Escape"); await pa.waitForTimeout(400);

// ---------- 3) repost de quem foi marcado ----------
console.log("Repost");
await pôr("stories", "fnOrig", { restrito: false, autorId: U.bruno, nome: "Bruno Reparos", tipo: "imagem", midia: JPEG, mencoes: [U.ana], criadoEm: ts(agora - 1800e3), ...figurinhas("Gostou do serviço?") });
await pôr("stories", "fnRepost", { restrito: false, autorId: U.ana, nome: "Ana Souza", tipo: "imagem", midia: JPEG, repostDe: { storyId: "fnOrig", autorId: U.bruno, nome: "Bruno Reparos" }, criadoEm: ts(agora - 600e3) });
const E = await navegador({ mobile: true });
const pe = await entrar(E.ctx, "edu", "feed.html?flash=fnRepost");
pe.on("pageerror", (x) => erros.push(x.message));
await pe.waitForSelector(".story-visor .story-enq", { timeout: 25000 }).catch(() => {});
await pe.waitForTimeout(1200);
ok(await pe.locator(".story-visor .story-enq:not(.story-ct):not(.story-cx)").count() === 1 && /Gostou do serviço/.test(await pe.locator(".story-visor").textContent()), "repost mostra a enquete do flash original");
ok(await pe.locator(".story-visor .story-cx").count() === 1 && await pe.locator(".story-visor .story-ct").count() === 1 && await pe.locator(".story-visor .story-fig-toque").count() === 1, "e a caixa, a contagem e a hashtag");
await pe.screenshot({ path: "saida/fn-figurinhas-repost.png" });
await pe.locator(".story-visor .story-enq:not(.story-ct):not(.story-cx) button", { hasText: "Não" }).first().click();
await pe.waitForTimeout(2000);
const votoE = (await db.collection("enquete_votos").where("uid", "==", U.edu).get()).docs.map((d) => d.data()).filter((v) => /fn/.test(v.itemId));
ok(votoE.length === 1 && votoE[0].alvo === "f_fnOrig", "o voto no repost conta na enquete do ORIGINAL (" + (votoE[0]?.alvo || "nenhum") + ")");
const cx = pe.locator(".story-visor .story-cx textarea");
// Como no celular: toca no campo (a caixa vai para o meio, acima do teclado), digita e toca em enviar.
await cx.tap(); await pe.waitForTimeout(400); await pe.keyboard.type("Pintura da sala"); await pe.waitForTimeout(200);
await pe.locator(".story-cx .cx-enviar").first().tap().catch(() => {});
await pe.waitForTimeout(2000);
const resp = (await db.collection("caixa_respostas").where("itemId", "==", "fnOrig").get()).docs.map((d) => d.data());
if (!resp.length) console.log("    (toast:", (await pe.locator(".toast").allTextContents().catch(() => [])).join(" | "), "· botão desligado:", await pe.locator(".story-visor .story-cx .cx-enviar").isDisabled().catch(() => "?"), ")");
ok(resp.length === 1 && resp[0].itemId === "fnOrig" && resp[0].autorId === U.bruno, "a resposta da caixa vai para o original (o Bruno recebe)");

// ---------- 4) criador do repost: foto parada + aviso ----------
console.log("Criador do repost");
const pa2 = await entrar(A.ctx, "ana", "feed.html?repostar=fnOrig");
await pa2.waitForSelector(".flash-criar", { timeout: 20000 }).catch(() => {});
await pa2.waitForTimeout(1500);
const toast = await pa2.locator(".toast").allTextContents().catch(() => []);
ok(toast.some((t) => /figurinhas do flash original vão junto/.test(t)), "avisa que as figurinhas do original vão junto: " + toast.join(" | "));
const antes = await pa2.evaluate(() => document.querySelector(".flash-fotobox")?.style.cssText || "");
const caixaM = await pa2.locator(".flash-midia").boundingBox();
if (caixaM) { await pa2.mouse.move(caixaM.x + caixaM.width / 2, caixaM.y + caixaM.height / 2); await pa2.mouse.down(); await pa2.mouse.move(caixaM.x + caixaM.width / 2 + 80, caixaM.y + caixaM.height / 2 + 60, { steps: 6 }); await pa2.mouse.up(); }
await pa2.waitForTimeout(300);
ok(await pa2.evaluate(() => document.querySelector(".flash-fotobox")?.style.cssText || "") === antes, "a foto do original não sai do lugar (as figurinhas ficam certas)");
ok(!erros.length, "sem erros " + erros.join(" | "));

// ---------- limpeza ----------
await A.browser.close(); await E.browser.close();
for (const c of criados) await db.doc(c).delete().catch(() => {});
for (const d of (await db.collection("enquete_votos").get()).docs) if (/^fn/.test(d.data().itemId || "")) await d.ref.delete();
for (const d of (await db.collection("caixa_respostas").get()).docs) if (/^fn/.test(d.data().itemId || "")) await d.ref.delete();
if (planoAntes) await db.doc(`planos/${U.bruno}`).set(planoAntes); else await db.doc(`planos/${U.bruno}`).delete();
console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
