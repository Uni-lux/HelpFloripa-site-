// Flash nos perfis de negócio: o anel das bolinhas de negócio do perfil aparece sem recarregar a página quando sai um flash
// (aviso de outra página/quadro) e some quando ele sai do ar; tocar no anel abre o flash com o botão para a vitrine
// ("Ver serviços"), que abre o perfil do negócio; "Também em ..." curto e só para quem publicou.
// Uso: node t-flash-negocio-anel.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
let falhas = 0; const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) falhas++; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const PX = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
await db.doc(`planos/${U.bruno}`).set({ plano: "plus", meses: 1, ate: Timestamp.fromMillis(Date.now() + 30 * 864e5) });
for (const d of (await db.collection("stories").where("autorId", "==", U.bruno).get()).docs) await d.ref.delete();
const negs = (await db.collection("negocios").where("donoId", "==", U.bruno).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const neg = negs.find((n) => n.tipo === "servicos") || negs[0];
ok(!!neg, `Bruno tem negócio (${neg?.id})`);

const B = await navegador({ mobile: true });
const pb = await entrar(B.ctx, "bruno", "usuarios.html");
const bolinha = `#meuPerfil .vinculo[data-cat="${neg.tipo}"] .avatar`;
await pb.waitForSelector(bolinha, { timeout: 30000 }); await pb.waitForTimeout(1500);
ok(!(await pb.locator(bolinha).evaluate((e) => e.classList.contains("fn-anel"))), "sem flash: bolinha do negócio sem anel");

// Flash novo no negócio, publicado "por outra página" (o Diário, na rede): aviso pelo localStorage de outra aba.
await db.doc("stories/anelNeg1").set({ restrito: false, autorId: U.bruno, nome: "Bruno", tipo: "foto", midia: PX, negocios: [neg.id], perfil: true, criadoEm: Timestamp.now() });
const outra = await B.ctx.newPage(); await outra.goto(pb.url().replace(/usuarios\.html.*/, "ajuda.html"));
await outra.evaluate((id) => localStorage.setItem("hf-flash-negocio-mudou", JSON.stringify({ ids: [id], em: Date.now() })), neg.id);
await pb.waitForFunction((s) => document.querySelector(s)?.classList.contains("fn-anel"), bolinha, { timeout: 8000 }).catch(() => {});
ok(await pb.locator(bolinha).evaluate((e) => e.classList.contains("fn-anel")), "flash novo: o anel aparece sem recarregar a página");
await outra.close();

// Tocar no anel: abre o flash do negócio, com o botão da vitrine.
await pb.locator(bolinha).tap();
await pb.waitForSelector(".story-visor .story-vitrine", { timeout: 10000 }).catch(() => {});
const cta = await pb.locator(".story-visor .story-vitrine").textContent().catch(() => "");
ok(/Ver serviços|Ver cardápio|Ver produtos|Ver imóveis|Ver perfil/.test(cta), `flash do negócio com o botão da vitrine (“${cta}”)`);
const onde = await pb.evaluate(() => { const o = document.querySelector(".story-onde"); return o ? { t: o.textContent, f: getComputedStyle(o).fontSize, cabe: o.querySelector("span").scrollWidth <= o.querySelector("span").clientWidth + 1 } : null; });
ok(onde && /Também em mais 1 lugar/.test(onde.t) && parseFloat(onde.f) <= 12.5 && onde.cabe, `dono vê “${onde?.t}” em ${onde?.f}, sem cortar`);
await pb.screenshot({ path: "saida/flash-negocio-vitrine.png" });
await pb.locator(".story-visor .story-vitrine").tap();
await pb.waitForSelector(".vt-modal", { timeout: 8000 }).catch(() => {});
ok(await pb.evaluate(() => !document.querySelector(".story-visor") && !!document.querySelector(".vt-modal")), "o botão fecha o flash e abre o perfil do negócio (vitrine)");
await pb.evaluate(() => document.querySelectorAll(".vt-modal").forEach((m) => m.remove()));

// Flash sai do ar (apagado em outro aparelho): ao voltar para a página, o anel some.
await db.doc("stories/anelNeg1").delete();
await pb.evaluate((id) => { localStorage.removeItem("hf-flash-negocio-mudou"); window.dispatchEvent(new StorageEvent("storage", { key: "hf-flash-negocio-mudou", newValue: JSON.stringify({ ids: [id], em: Date.now() }) })); }, neg.id);
await pb.waitForFunction((s) => !document.querySelector(s)?.classList.contains("fn-anel"), bolinha, { timeout: 8000 }).catch(() => {});
ok(!(await pb.locator(bolinha).evaluate((e) => e.classList.contains("fn-anel"))), "flash fora do ar: o anel some");
await pb.locator(bolinha).tap();
await pb.waitForSelector(".vt-modal", { timeout: 8000 }).catch(() => {});
ok(await pb.evaluate(() => !document.querySelector(".story-visor") && !!document.querySelector(".vt-modal")), "sem flash: tocar na foto abre o perfil do negócio");
await B.browser.close();

// Visitante: vê o anel, o botão da vitrine e NÃO vê "Também em ...".
await db.doc("stories/anelNeg2").set({ restrito: false, autorId: U.bruno, nome: "Bruno", tipo: "foto", midia: PX, negocios: negs.map((n) => n.id), perfil: true, criadoEm: Timestamp.now() });
const A = await navegador({ mobile: true });
const pa = await entrar(A.ctx, "ana", `usuarios.html?perfil=${U.bruno}`);
const bol2 = `.vinculo[data-cat="${neg.tipo}"] .avatar.fn-anel`;
await pa.waitForSelector(bol2, { timeout: 30000 }).catch(() => {});
ok(await pa.locator(bol2).count() > 0, "visitante: bolinha do negócio com anel");
await pa.locator(bol2).first().tap();
await pa.waitForSelector(".story-visor .story-vitrine", { timeout: 10000 }).catch(() => {});
ok(await pa.locator(".story-visor .story-vitrine").count() === 1, "visitante: botão da vitrine no flash");
ok(await pa.locator(".story-visor .story-onde").count() === 0, "visitante: sem “Também em ...” no flash do negócio");
await A.browser.close();
await db.doc("stories/anelNeg2").delete();
console.log(falhas ? `${falhas} falha(s)` : "tudo certo"); process.exit(falhas ? 1 : 0);
