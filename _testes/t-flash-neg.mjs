// Flash nos perfis de negócio: ao publicar, "Publicar em" (seu perfil e/ou um, alguns ou todos os seus negócios).
// O perfil do negócio ganha o anel e o visor do flash; "só no negócio" não aparece no perfil pessoal.
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, BASE } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
await db.doc(`relacoes/${U.ana}_${U.bruno}`).set({ tipo: "seguir", seguidorId: U.ana, alvoId: U.bruno, criadoEm: Timestamp.now() });
const B = await navegador({ mobile: true, camera: true }), A = await navegador({ mobile: true });
const pb = await entrar(B.ctx, "bruno", "usuarios.html");
async function novoFlash(escolher) {
  await pb.waitForSelector("#meuPerfil .pf-mais-flash", { timeout: 30000 });
  await pb.locator("#meuPerfil .pf-mais-flash").tap();
  await pb.waitForSelector(".flash-criar .flash-cam-ui .flash-disparo", { timeout: 10000 });
  await pb.waitForFunction(() => document.querySelector(".flash-cam")?.videoWidth > 0, null, { timeout: 8000 });
  await pb.locator(".flash-disparo").tap();
  await pb.waitForSelector(".flash-fotobox canvas.flash-foto", { timeout: 8000 });
  await pb.waitForSelector(".flash-ferr .flash-onde", { timeout: 8000 });
  await pb.locator(".flash-ferr .flash-onde").tap();
  await pb.waitForSelector(".flash-figs .flash-dest-item", { timeout: 5000 });
  await escolher();
  await pb.locator(".flash-figs .fe-pronto").tap();
  await pb.waitForTimeout(300);
}
// 1) Só no negócio "Bruno Reparos"
await novoFlash(async () => {
  { const d = await pb.locator(".flash-dest-item strong").allTextContents(); ok(d[0] === "Seu perfil" && d.length === 3 && d.includes("Bruno Reparos") && d.includes("Bruno Imóveis"), "Publicar em: seu perfil e os 2 negócios → " + d.join(" / ")); }
  await pb.locator(".flash-dest-item", { hasText: "Bruno Reparos" }).tap();
  await pb.locator(".flash-dest-item", { hasText: "Seu perfil" }).tap();
  ok((await pb.locator(".flash-dica").textContent()).includes("no perfil de Bruno Reparos"), "dica: 'Fica 24 h no perfil de Bruno Reparos'");
  await pb.screenshot({ path: "saida/fn-publicar-em.png" });
});
const pub = await pb.locator(".flash-publicar").boundingBox();
ok(pub && pub.y + pub.height <= (pb.viewportSize()?.height || 800), "o botão Compartilhar fica inteiro na tela");
await pb.screenshot({ path: "saida/fn-criador.png" });
await pb.locator(".flash-publicar").tap(); await pb.waitForTimeout(3000);
// 2) No perfil e nos dois negócios
await novoFlash(async () => {
  await pb.locator(".flash-dest-item", { hasText: "Bruno Reparos" }).tap();
  await pb.locator(".flash-dest-item", { hasText: "Bruno Imóveis" }).tap();
});
await pb.locator(".flash-publicar").tap(); await pb.waitForTimeout(3000);
const st = (await db.collection("stories").where("autorId", "==", U.bruno).get()).docs.map((d) => d.data()).sort((a, b) => a.criadoEm.toMillis() - b.criadoEm.toMillis());
ok(st.length === 2 && st[0].perfil === false && st[0].negocios.join() === `${U.bruno}_servicos`, "1º flash: só no Bruno Reparos (perfil: false)");
ok(st[1].perfil === undefined && st[1].negocios.sort().join() === [`${U.bruno}_imoveis`, `${U.bruno}_servicos`].sort().join(), "2º flash: no perfil e nos dois negócios");
// 3) Ana: no Diário só aparece o flash do perfil pessoal
const pa = await entrar(A.ctx, "ana", "feed.html");
await pa.waitForSelector(".story-circ:not(.meu)", { timeout: 30000 }); await pa.waitForTimeout(1200);
await pa.locator(".story-circ:not(.meu)").first().tap();
await pa.waitForSelector(".story-visor .story-barra", { timeout: 10000 });
ok(await pa.locator(".story-visor .story-barra").count() === 1 && (await pa.locator(".story-visor .story-onde").textContent()).includes("Também no perfil de 2 negócios"), "Diário: só o flash do perfil (1), com 'Também no perfil de 2 negócios'");
await pa.keyboard.press("Escape"); await pa.waitForTimeout(300);
// 4) Perfil do negócio Bruno Reparos: anel e os 2 flashes
await pa.goto(BASE + `servicos.html?negocio=${U.bruno}_servicos`);
await pa.waitForSelector(".vd-logo.fn-anel", { timeout: 20000 }).catch(() => {});
ok(await pa.locator(".vd-logo.fn-anel").count() === 1, "perfil do negócio: anel do flash na foto");
await pa.screenshot({ path: "saida/fn-perfil-negocio.png" });
await pa.locator(".vd-logo").click();
await pa.waitForSelector(".fn-visor .fn-barra", { timeout: 8000 });
ok(await pa.locator(".fn-visor .fn-barra").count() === 2 && (await pa.locator(".fn-visor .fn-quem strong").textContent()).includes("Bruno Reparos"), "visor do negócio: 2 flashes com o nome do negócio");
ok(await pa.locator(".fn-visor .fn-rodape button", { hasText: "Enviar mensagem" }).count() === 1, "visor do negócio: botão Enviar mensagem");
await pa.waitForTimeout(500); await pa.screenshot({ path: "saida/fn-visor-negocio.png" });
await pa.keyboard.press("Escape"); await pa.waitForTimeout(300);
ok((await db.collection(`stories`).get()).docs.length >= 2, "ok");
// 5) Bruno Imóveis: só o 2º
await pa.goto(BASE + `imoveis.html?negocio=${U.bruno}_imoveis`);
await pa.waitForSelector(".vd-logo.fn-anel", { timeout: 20000 }).catch(() => {});
await pa.locator(".vd-logo").click();
await pa.waitForSelector(".fn-visor .fn-barra", { timeout: 8000 }).catch(() => {});
ok(await pa.locator(".fn-visor .fn-barra").count() === 1, "Bruno Imóveis: só o flash marcado para ele");
// 6) No perfil do Bruno, as bolinhas dos negócios têm o anel
await pa.goto(BASE + `usuarios.html?perfil=${U.bruno}`);
await pa.waitForSelector("#ppCabecalho [data-el=negocios] .vinculo .avatar.fn-anel", { timeout: 20000 }).catch(() => {});
ok(await pa.locator("#ppCabecalho [data-el=negocios] .vinculo .avatar.fn-anel").count() === 2, "perfil do Bruno: as 2 bolinhas de negócio com anel");
await pa.screenshot({ path: "saida/fn-bolinhas.png" });
await A.browser.close(); await B.browser.close();
