// Flash, etapa "figurinhas no padrão do Instagram" (02/11/2026): enquete e caixa de perguntas com a faixa colorida em cima
// (pergunta em branco), opções em pílulas, resultado com barra animada; prévia do criador igual ao visor; lugar/#/@ com
// texto em degradê no 1º estilo.
// Uso: node t-flash-figurinhas.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, garantirImagem } from "./nav.mjs";
import { readFileSync } from "node:fs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const PX = "data:image/png;base64," + readFileSync(garantirImagem("saida/foto-ff.png", 900, 1600)).toString("base64");
for (const u of [U.ana, U.bruno]) for (const s of (await db.collection("stories").where("autorId", "==", u).get()).docs) await s.ref.delete();
await db.doc(`relacoes/${U.ana}_${U.bruno}`).set({ tipo: "seguir", seguidorId: U.ana, alvoId: U.bruno, criadoEm: Timestamp.now() });
const fim = Timestamp.fromMillis(Date.now() + 20 * 3600e3);
const f1 = (await db.collection("stories").add({ restrito: false, autorId: U.bruno, nome: "Bruno Reparos", tipo: "imagem", midia: PX,
  enquete: { pergunta: "Qual serviço você precisa?", opcoes: ["Pintura", "Elétrica", "Hidráulica"], x: 0.5, y: 0.66, fimEm: fim, cor: "roxo" },
  caixa: { pergunta: "Me pergunte sobre reformas", anonima: false, x: 0.5, y: 0.28, cor: "laranja" }, criadoEm: Timestamp.now() })).id;
await db.doc(`enquete_votos/f_${f1}_${U.ana}x`).set({ alvo: `f_${f1}`, tipo: "f", itemId: f1, uid: U.edu, opcao: 1, fatia: 2, fimEm: fim, criadoEm: Timestamp.now() });
await db.doc(`enquete_contas/f_${f1}_2`).set({ n1: 3, n0: 1 });

const { browser, ctx } = await navegador({ mobile: true });
const p = await entrar(ctx, "ana", `feed.html?flash=${f1}`);
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector(".story-visor .story-enq", { timeout: 15000 }).catch(() => {});
await p.waitForTimeout(1500);
const est = await p.evaluate(() => {
  const enq = document.querySelector(".story-enq .enquete"), perg = enq.querySelector(".enq-perg"), op = enq.querySelector(".enq-op");
  const cx = document.querySelector(".story-cx .caixa-perg"), cperg = cx.querySelector(".cx-perg");
  return {
    faixaEmCima: perg.getBoundingClientRect().top <= enq.getBoundingClientRect().top + 2,
    faixaCor: getComputedStyle(perg).backgroundImage.includes("gradient"), perguntaBranca: getComputedStyle(perg).color === "rgb(255, 255, 255)",
    cartaoBranco: getComputedStyle(enq).backgroundColor === "rgb(255, 255, 255)", pilula: parseFloat(getComputedStyle(op).borderRadius) >= 14,
    caixaFaixa: cperg.getBoundingClientRect().top <= cx.getBoundingClientRect().top + 2 && getComputedStyle(cperg).backgroundImage.includes("gradient")
  };
});
ok(est.faixaEmCima && est.faixaCor && est.perguntaBranca, "enquete: pergunta numa faixa colorida em cima, em branco");
ok(est.cartaoBranco && est.pilula, "enquete: cartão branco com opções em pílulas");
ok(est.caixaFaixa, "caixa de perguntas: pergunta na faixa colorida em cima");
await p.screenshot({ path: "saida/ff-visor.png" });
await p.locator(".story-enq .enq-op").first().click(); await p.waitForTimeout(1500);
ok(await p.locator(".story-enq .enquete.votou").count() === 1, "votar marca a opção escolhida");
await p.screenshot({ path: "saida/ff-votou.png" });
await p.keyboard.press("Escape"); await p.waitForTimeout(400);

// autor vê o resultado (barra na cor, % em destaque)
const nb = await navegador({ mobile: true });
const b = await entrar(nb.ctx, "bruno", `feed.html?flash=${f1}`);
await b.waitForSelector(".story-visor .story-enq", { timeout: 15000 }).catch(() => {});
await b.waitForTimeout(2500);
const res = await b.evaluate(() => ({ pct: document.querySelectorAll(".story-enq .enq-pct").length, barra: getComputedStyle(document.querySelector(".story-enq .enq-barra")).backgroundImage.includes("gradient") }));
ok(res.pct === 3 && res.barra, `autor: resultado com % e barra na cor da enquete (${res.pct} opções)`);
await b.screenshot({ path: "saida/ff-autor.png" });
await nb.browser.close();

// criador: prévia igual ao visor + lugar com degradê
await p.goto(p.url().split("?")[0]); await p.waitForTimeout(3500);
await p.locator(".story-circ").first().locator(".mais").tap();
await p.waitForSelector(".flash-criar", { timeout: 8000 }); await p.waitForTimeout(600);
await p.locator(".flash-modos button", { hasText: "Foto" }).tap(); await p.waitForTimeout(300);
const [fc] = await Promise.all([p.waitForEvent("filechooser"), p.locator(".flash-esc-btn", { hasText: "Galeria" }).click()]);
await fc.setFiles("saida/foto-ff.png"); await p.waitForTimeout(1200);
await p.locator(".flash-ferr-btn[aria-label^='Figurinhas']").tap(); await p.waitForTimeout(300);
await p.locator(".fig-pilula", { hasText: "Enquete" }).tap(); await p.waitForTimeout(300);
await p.locator(".fv-perg").fill("Praia ou piscina?");
await p.evaluate((c) => { for (let i = 0; i < 8 && !document.querySelector(".fv-card").classList.contains("tema-" + c); i++) document.querySelector(".fv-cor").click(); }, "verde"); await p.waitForTimeout(200);
ok(await p.evaluate(() => getComputedStyle(document.querySelector(".fv-card .fv-faixa")).backgroundImage.includes("gradient")), "editor: o próprio cartão com a faixa colorida");
await p.screenshot({ path: "saida/ff-editor.png" });
await p.locator(".flash-fig-viva .fe-pronto").tap(); await p.waitForTimeout(300);
await p.locator(".flash-ferr-btn[aria-label^='Figurinhas']").tap(); await p.waitForTimeout(300);
await p.locator(".fig-pilula", { hasText: "Hashtag" }).tap(); await p.waitForTimeout(200);
await p.locator(".fe-local").fill("#reforma"); await p.locator(".fe-linha-local .fe-pronto").tap(); await p.waitForTimeout(300);
ok(await p.locator(".flash-fig.fig-hashtag .fig-grad").count() === 1, "hashtag com texto em degradê (1º estilo)");
await p.screenshot({ path: "saida/ff-criador.png" });

ok(!erros.length, "sem erros na página" + (erros.length ? ": " + erros.slice(0, 3).join(" | ") : ""));
await browser.close();
