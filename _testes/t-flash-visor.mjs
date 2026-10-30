// Flash igual ao que foi feito (comparado com o Instagram):
// - Visor com o quadro 9:16 (imagem inteira, sem cortar as laterais); no celular comprido, o campo de responder fica
//   embaixo do quadro. Enquete e perguntas no mesmo lugar e tamanho do criador, sem cobrir o nome nem o rodapé.
// - Tempo ao lado do nome; foto dura 5 s (mais com enquete/perguntas).
// - ⋯ do seu flash: Visualizações, Salvar foto, Compartilhar, Configurações. A fita das Visualizações troca o flash de trás.
// - Criador: ferramentas em coluna, estrela dos Amigos próximos por flash, texto perto da borda sem quebrar letra a letra.
// Uso: node t-flash-visor.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, BASE, garantirImagem } from "./nav.mjs";
import { readFileSync } from "node:fs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const PX = "data:image/png;base64," + readFileSync(garantirImagem("saida/foto-fv.png", 1080, 1920)).toString("base64");
for (const u of [U.ana, U.bruno]) for (const s of (await db.collection("stories").where("autorId", "==", u).get()).docs) await s.ref.delete();
const fim = Timestamp.fromMillis(Date.now() + 20 * 3600e3);
const fa = [];
fa.push((await db.collection("stories").add({ autorId: U.ana, nome: "Ana Souza", tipo: "imagem", midia: PX, criadoEm: Timestamp.fromMillis(Date.now() - 3 * 3600e3) })).id);
// figurinhas nas pontas: perguntas lá em cima (cobriria o nome) e enquete lá embaixo (cobriria o responder)
fa.push((await db.collection("stories").add({ autorId: U.ana, nome: "Ana Souza", tipo: "imagem", midia: PX, criadoEm: Timestamp.fromMillis(Date.now() - 20 * 60000),
  caixa: { pergunta: "Me faça uma pergunta", anonima: false, x: 0.5, y: 0.02 },
  enquete: { pergunta: "Cor?", opcoes: ["Sim", "Não"], x: 0.5, y: 0.98, fimEm: fim } })).id);
await db.doc(`usuarios/${U.ana}`).set({ flashConfig: { amigos: [U.bruno], publico: "todos" } }, { merge: true });

const { browser, ctx } = await navegador({ mobile: true });
const p = await entrar(ctx, "ana", "feed.html");
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.setViewportSize({ width: 390, height: 844 });
await p.waitForTimeout(2500);

// ---------- 1) visor do Bruno vendo o flash da Ana (com as figurinhas) ----------
const B = await navegador({ mobile: true });
const pb = await entrar(B.ctx, "bruno", `feed.html?flash=${fa[1]}`);
await pb.setViewportSize({ width: 390, height: 844 });
await pb.waitForSelector(".story-visor .story-enq", { timeout: 15000 }); await pb.waitForTimeout(1200);
const geo = await pb.evaluate(() => {
  const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { t: b.top, b: b.bottom, l: b.left, r: b.right, w: b.width, h: b.height }; };
  const img = document.querySelector(".story-palco img");
  return { quadro: r(".story-quadro"), caixa: r(".story-caixa"), form: r(".story-responder"), topo: r(".story-quem"), cx: r(".story-cx"), enq: r(".story-enq:not(.story-cx)"), fit: img && getComputedStyle(img).objectFit, hora: document.querySelector(".story-nome small")?.textContent };
});
ok(geo.quadro && Math.abs(geo.quadro.w / geo.quadro.h - 9 / 16) < 0.01, `quadro 9:16 (${Math.round(geo.quadro.w)}×${Math.round(geo.quadro.h)}) e foto inteira (${geo.fit})`);
ok(geo.fit === "contain", "a foto não é cortada nas laterais");
ok(geo.form && geo.form.t >= geo.quadro.b - 8, `celular comprido: o campo de responder fica embaixo do quadro (campo em ${Math.round(geo.form.t)}, quadro termina em ${Math.round(geo.quadro.b)})`);
ok(geo.cx && geo.cx.t >= geo.topo.b - 2, `perguntas lá em cima não cobrem o nome (${Math.round(geo.cx.t)} ≥ ${Math.round(geo.topo.b)})`);
ok(geo.enq && geo.enq.b <= geo.form.t + 2, `enquete lá embaixo não cobre o responder (${Math.round(geo.enq.b)} ≤ ${Math.round(geo.form.t)})`);
ok(Math.abs(geo.enq.w - geo.quadro.w * 0.74) < 3, `enquete com a mesma largura do criador (74% do quadro: ${Math.round(geo.enq.w)} px)`);
ok(/h|min|agora/.test(geo.hora || ""), "tempo ao lado do nome → " + geo.hora);
await pb.screenshot({ path: "saida/fv-visor.png" });
// tempo da foto: com enquete/perguntas fica mais (7,5 s), simples 5 s
const dur = await pb.evaluate(() => document.querySelector(".story-barra i")?.style.transition || "");
ok(/7500ms/.test(dur) || /7500ms/.test(await pb.evaluate(() => [...document.querySelectorAll(".story-barra i")].map((i) => i.style.transition).join(" "))), "com enquete/perguntas o flash fica 7,5 s → " + dur);
await B.browser.close();

// ---------- 2) a Ana no próprio flash: ⋯ e a fita das Visualizações ----------
await p.goto(BASE + `feed.html?flash=${fa[0]}`); await p.waitForSelector(".story-visor", { timeout: 10000 }); await p.waitForTimeout(900);
await p.locator(".story-btn[aria-label='Opções']").tap(); await p.waitForTimeout(400);
const opc = await p.locator("#opcoesCorpo button").allTextContents();
ok(["Apagar", "Visualizações", "Salvar foto", "Compartilhar", "Configurações do Flash", "Novo flash"].every((x) => opc.some((t) => t.includes(x))), "⋯ do seu flash: " + opc.map((t) => t.split(/[A-Z][a-z]+ [a-z]/)[0]).join(" | ").slice(0, 160));
await p.locator("#opcoesCorpo button", { hasText: "Visualizações" }).tap();
await p.waitForSelector(".vv-fita .vv-mini", { timeout: 8000 }); await p.waitForTimeout(600);
const antes = await p.locator(".story-nome small").textContent();
await p.locator(".vv-mini").nth(1).tap(); await p.waitForTimeout(900);
const depois = await p.locator(".story-nome small").textContent();
ok(antes !== depois, `tocar na fita troca o flash de trás também (${antes} → ${depois})`);
await p.locator("#folhaLista.aberta [data-fechar]").first().click(); await p.waitForTimeout(400);

// ---------- 3) criador: ferramentas em coluna, Amigos próximos e texto na borda ----------
await p.goto(BASE + "feed.html"); await p.waitForTimeout(3000);
await p.locator(".story-circ").first().locator(".mais").tap();
await p.waitForSelector(".flash-criar", { timeout: 8000 });
const [fc] = await Promise.all([p.waitForEvent("filechooser", { timeout: 8000 }), p.locator(".flash-esc-btn", { hasText: "Galeria" }).click()]);
await fc.setFiles("saida/foto-fv.png"); await p.waitForSelector(".flash-fotobox", { timeout: 8000 }); await p.waitForTimeout(600);
const ferr = await p.evaluate(() => { const pal = document.querySelector(".flash-palco").getBoundingClientRect(); return [...document.querySelectorAll(".flash-topo .flash-ferr-btn")].map((b) => b.getBoundingClientRect()).every((b) => b.right <= pal.right + 1 && b.left >= pal.left - 1); });
ok(ferr, "todas as ferramentas cabem no cartão (coluna à direita)");
await p.locator(".flash-amigos").tap(); await p.waitForTimeout(300);
ok(await p.locator(".flash-amigos.on").count() === 1 && (await p.locator(".flash-publicar").textContent()).includes("Amigos próximos"), "estrela dos Amigos próximos acende e o botão vira 'Amigos próximos'");
// texto perto da borda direita: não quebra letra por letra
await p.locator(".flash-ferr-btn[aria-label='Escrever na foto']").tap();
await p.locator(".fe-campo").fill("Isso tá ficando bom?");
await p.locator(".fe-pronto").tap(); await p.waitForTimeout(300);
const pal = await p.locator(".flash-palco").boundingBox();
const tx = p.locator(".flash-camada .flash-txt").first();
const tb = await tx.boundingBox();
await p.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2); await p.mouse.down();
await p.mouse.move(pal.x + pal.width * 0.86, tb.y + tb.height / 2, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(300);
const tb2 = await tx.boundingBox();
ok(tb2.width > tb.width * 0.8 && tb2.height < tb.height * 2.2, `texto na borda mantém as linhas (${Math.round(tb.width)}×${Math.round(tb.height)} → ${Math.round(tb2.width)}×${Math.round(tb2.height)})`);
await p.screenshot({ path: "saida/fv-criador.png" });
// figurinhas em pílulas
await p.locator(".flash-ferr-btn[aria-label^='Figurinhas']").tap(); await p.waitForTimeout(300);
ok(await p.locator(".fig-pilula").count() >= 7, "figurinhas em pílulas (" + await p.locator(".fig-pilula").count() + ")");
await p.screenshot({ path: "saida/fv-figurinhas.png" });
await p.locator(".fig-op", { hasText: "Localização" }).tap(); await p.waitForTimeout(300);
const loc = await p.evaluate(() => { const pal = document.querySelector(".flash-palco").getBoundingClientRect(); const b = document.querySelector(".fe-linha-local .fe-pronto").getBoundingClientRect(); const x = document.querySelector(".flash-figs .fe-cab .fe-pronto").getBoundingClientRect(); return b.right <= pal.right + 1 && x.right <= pal.right + 1; });
ok(loc, "Localização: 'Colocar' e 'Fechar' inteiros dentro do cartão");
await p.locator(".fe-linha-local .fe-pronto").tap(); await p.waitForTimeout(300);
await p.locator(".flash-publicar").tap();
await p.waitForSelector(".flash-criar", { state: "detached", timeout: 15000 }).catch(() => {});
const novo = (await db.collection("stories").where("autorId", "==", U.ana).get()).docs.map((d) => d.data()).sort((a, b) => b.criadoEm?.toMillis() - a.criadoEm?.toMillis())[0];
ok(novo?.publico === "amigos" && novo.lista?.includes(U.bruno), "publicou só para os Amigos próximos (escolhido no próprio flash)");

ok(!erros.length, "sem erros na página " + erros.join(" | "));
await browser.close();
