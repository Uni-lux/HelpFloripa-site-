// Flash (02/11/2026): topo organizado (nome e foto abrem o perfil, "Também em 1 negócio" não passa por baixo do
// avião), caixa de perguntas em foco acima do teclado, criador sem a tela de escolher antes da câmera e voltar de um
// perfil com a tela preta até o flash reabrir (sem mostrar o Diário no meio).
// Uso: node t-flash-topo-volta.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, garantirImagem } from "./nav.mjs";
import { readFileSync } from "node:fs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const PX = "data:image/png;base64," + readFileSync(garantirImagem("saida/foto-tv.png", 900, 1600)).toString("base64");
for (const u of [U.ana, U.bruno]) for (const s of (await db.collection("stories").where("autorId", "==", u).get()).docs) await s.ref.delete();
const f1 = (await db.collection("stories").add({ autorId: U.bruno, nome: "Bruno Reparos", tipo: "imagem", midia: PX, negocios: [`${U.bruno}_servicos`], perfil: true,
  caixa: { pergunta: "Me faça uma pergunta", anonima: false, x: 0.5, y: 0.86 }, criadoEm: Timestamp.now() })).id;

const { browser, ctx } = await navegador({ mobile: true, camera: true });
const p = await entrar(ctx, "ana", `feed.html?flash=${f1}`);
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector(".story-visor", { timeout: 15000 }); await p.waitForTimeout(1200);

// ---------- 1) topo ----------
const lay = await p.evaluate(() => {
  const onde = document.querySelector(".story-onde")?.getBoundingClientRect(), env = document.querySelector(".story-btn[aria-label='Enviar este flash']").getBoundingClientRect();
  return { ondeDir: onde?.right, envEsq: env.left, temOnde: !!onde };
});
ok(lay.temOnde && lay.ondeDir <= lay.envEsq + 1, `“Também em 1 negócio” termina antes do avião (${Math.round(lay.ondeDir)} ≤ ${Math.round(lay.envEsq)})`);
await p.screenshot({ path: "saida/tv-topo.png" });

// ---------- 2) caixa de perguntas em foco ----------
await p.locator(".story-cx textarea").tap(); await p.waitForTimeout(400);
ok(await p.locator(".story-cx-foco .story-cx").count() === 1, "tocar no campo leva a caixa para o meio da tela (modo foco)");
await p.setViewportSize({ width: 390, height: 430 }); await p.waitForTimeout(500); // teclado aberto
const cx = await p.locator(".story-cx-foco .story-cx").boundingBox();
ok(cx && cx.y >= 0 && cx.y + cx.height <= 431, `com o teclado, a caixa inteira fica à vista (${Math.round(cx?.y)}–${Math.round((cx?.y || 0) + (cx?.height || 0))} de 430)`);
ok(await p.evaluate(() => getComputedStyle(document.querySelector(".story-rodape")).opacity) === "0", "o campo de responder do flash sai da frente");
await p.screenshot({ path: "saida/tv-caixa.png" });
await p.locator(".story-cx-foco").click({ position: { x: 10, y: 10 } }); await p.waitForTimeout(500);
await p.setViewportSize({ width: 390, height: 780 }); await p.waitForTimeout(400);
ok(await p.locator(".story-cx-foco").count() === 0 && await p.locator(".story-quadro .story-cx").count() === 1, "tocar fora devolve a caixa ao lugar dela");

// ---------- 3) nome abre o perfil; voltar = tela preta e o flash de novo ----------
await Promise.all([p.waitForURL(/usuarios\.html/, { timeout: 10000 }), p.locator(".story-quem strong").click()]);
ok(/usuarios\.html/.test(p.url()), "tocar no nome abre o perfil");
await p.waitForTimeout(1500);
const fotos = [];
const t0 = Date.now();
await p.goBack({ waitUntil: "commit" });
for (let i = 0; i < 60; i++) {
  const r = await p.evaluate(() => ({ capa: document.documentElement.classList.contains("hf-volta-flash"), visor: !!document.querySelector(".story-visor"), lista: !!document.querySelector("#listaFeed .post") })).catch(() => null);
  if (r) fotos.push(r);
  if (r?.visor) break;
  await p.waitForTimeout(100);
}
const viu = fotos.some((r) => r.lista && !r.capa && !r.visor);
ok(fotos.at(-1)?.visor, `voltou para o flash (${Date.now() - t0} ms)`);
ok(!viu, "sem mostrar o Diário antes do flash (tela preta no meio)");
await p.keyboard.press("Escape"); await p.waitForTimeout(600);

// ---------- 4) criador: câmera direto, sem a tela de escolher ----------
await p.evaluate(() => { try { localStorage.setItem("hf-cam-ok", "1"); } catch {} });
await p.goto(p.url().split("?")[0]); await p.waitForTimeout(3500);
await p.locator(".story-circ").first().locator(".mais").tap();
let apareceu = false;
for (let i = 0; i < 25; i++) {
  const v = await p.evaluate(() => { const e = document.querySelector(".flash-escolher"); return !!e && e.offsetParent !== null && getComputedStyle(e).visibility === "visible" && !document.querySelector(".flash-criar .flash-cam-ui:not([hidden])"); });
  if (v) apareceu = true;
  await p.waitForTimeout(60);
}
const camOn = await p.evaluate(() => document.querySelector(".flash-cam")?.videoWidth > 0);
ok(camOn, "a câmera abre direto");
ok(!apareceu, "a tela “Mostre o que está acontecendo” não aparece antes da câmera");

ok(!erros.length, "sem erros na página " + erros.join(" | "));
await browser.close();
