// Sair da conta (a mesma janela nos três lugares), aviso ao "voltar" que sai do site e do painel,
// foto da equipe e minha foto no chat da equipe.
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { navegador, entrar, USUARIOS as U, BASE } from "./nav.mjs";
import { readFileSync } from "node:fs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
initializeApp({ projectId: "demo-hf" });
const db = getFirestore();
const FOTO = new URL("saida/foto-teste.png", import.meta.url).pathname;
const VBASE = "./admin-base.js?v=" + readFileSync(new URL("../admin.js", import.meta.url), "utf8").match(/admin-base\.js\?v=(\d+)/)[1];
const janela = async (p) => (await p.locator(".hf-confirma").textContent().catch(() => "")).replace(/\s+/g, " ").trim();
const logado = (p) => p.evaluate(() => window.firebaseAuth?.currentUser?.email || null);

// ---------- 1) Sair da conta: menu, configurações do perfil e mensagens ----------
let { browser, ctx } = await navegador({ mobile: true });
let p = await entrar(ctx, "ana", "index.html");
await p.waitForTimeout(2500);
await p.tap("#btnMenu"); await p.waitForTimeout(800);
await p.locator("#gavetaSair").scrollIntoViewIfNeeded(); await p.tap("#gavetaSair"); await p.waitForTimeout(600);
const j1 = await janela(p);
await p.locator(".hf-confirma .nao").tap(); await p.waitForTimeout(300);
console.log("menu:", j1, "| cancelar mantém:", await logado(p));
await p.goto(BASE + "configuracoes.html"); await p.waitForTimeout(2500);
await p.locator("#cfgSair").scrollIntoViewIfNeeded(); await p.tap("#cfgSair"); await p.waitForTimeout(600);
const j2 = await janela(p);
await p.keyboard.press("Escape"); await p.waitForTimeout(300);
console.log("configurações:", j2, "| esc mantém:", await logado(p));
await p.goto(BASE + "mensagens.html");
await p.waitForFunction(() => document.getElementById("carregandoApp").hidden, null, { timeout: 20000 });
await p.tap("#btnConfig"); await p.waitForTimeout(600);
await p.locator("#btnSairConta").scrollIntoViewIfNeeded(); await p.tap("#btnSairConta"); await p.waitForTimeout(600);
const j3 = await janela(p);
console.log("mensagens:", j3, "| iguais:", j1 === j2 && j2 === j3);
await p.screenshot({ path: "saida/sair-igual.png" });
await p.locator(".hf-confirma .sim").tap();
await p.waitForURL(/login\.html/, { timeout: 15000 }).catch(() => {});
await p.waitForTimeout(1500);
console.log("depois de sair:", p.url().split("/").pop(), "| usuário:", await logado(p));
await browser.close();

// ---------- 2) "Voltar" que sairia do site ----------
({ browser, ctx } = await navegador({ mobile: true }));
p = await entrar(ctx, "ana");
await p.goto("about:blank"); // uma página "de fora" antes do site
await p.goto(BASE + "index.html"); await p.waitForTimeout(2500);
await p.mouse.click(5, 300); // primeira interação (o Chrome exige), num canto sem link
await p.waitForTimeout(300);
await p.evaluate(() => { location.href = "servicos.html"; });
await p.waitForTimeout(2500);
await p.goBack(); await p.waitForTimeout(1500);
console.log("voltar entre páginas do site:", p.url().split("/").pop(), "| janela:", (await janela(p)) || "(nenhuma)");
await p.goBack(); await p.waitForTimeout(800);
console.log("voltar que sai do site:", await janela(p));
await p.screenshot({ path: "saida/sair-site.png" });
await p.locator(".hf-confirma .nao").tap(); await p.waitForTimeout(500);
console.log("ficar:", p.url().split("/").pop());
await p.goBack(); await p.waitForTimeout(800);
await p.locator(".hf-confirma .sim").tap(); await p.waitForTimeout(1500);
console.log("sair:", p.url());
await browser.close();
({ browser, ctx } = await navegador({ mobile: true }));
p = await entrar(ctx, "admin");
await p.goto("about:blank"); await p.goto(BASE + "admin.html");
await p.waitForFunction((v) => import(v).then((m) => m.D.carregadoEm > 0), VBASE, { timeout: 30000, polling: 1000 });
await p.mouse.click(5, 400); await p.waitForTimeout(300);
await p.goBack(); await p.waitForTimeout(800);
console.log("painel:", await janela(p));
await p.locator(".hf-confirma .nao").tap(); await p.waitForTimeout(300);

// ---------- 3) Fotos no chat da equipe ----------
for (let i = 0; i < 6 && !(await p.locator(".eq-chat").count()); i++) { await p.evaluate((v) => import(v).then((m) => m.C.irPara("equipe")), VBASE); await p.waitForTimeout(2000); }
const usarFoto = async (abrir) => { const [fc] = await Promise.all([p.waitForEvent("filechooser", { timeout: 10000 }), abrir()]); await fc.setFiles(FOTO); await p.locator(".hfe-btn.pri").click({ timeout: 10000 }); await p.waitForTimeout(2500); };
await usarFoto(() => p.locator(".eq-eu").click());
const minha = (await db.doc(`perfis_publicos/${U.admin}`).get()).data().fotoPerfil || "";
console.log("minha foto salva:", minha.startsWith("data:image/"), "| aparece no topo:", await p.locator(".eq-eu img").count());
await p.locator(".eq-modos [data-modo=equipe]").click(); await p.locator(".eq-lista-itens .eq-item").first().click(); await p.waitForTimeout(800);
await usarFoto(() => p.locator(".eq-foto-grupo").click());
const grupo = (await db.doc("equipe_info/grupo").get()).data()?.foto || "";
console.log("foto da equipe salva:", grupo.startsWith("data:image/"), "| aparece no topo:", await p.locator(".eq-quem .eq-av-grupo img").count());
await p.screenshot({ path: "saida/foto-equipe.png" });
await browser.close();
