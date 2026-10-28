// "Perto de você": início (carrossel com distância e "Usar minha localização"), vitrine (Mais perto, distância
// nos cartões, filtro de distância), Explorar (negócios perto e publicações da região) e o ponto do endereço
// gravado ao salvar o negócio. Uso: node t-perto.mjs  (precisa das regras do main: campo geo)
import { navegador, entrar, BASE, USUARIOS as U } from "./nav.mjs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
const db = getFirestore(initializeApp({ projectId: "demo-hf" }));
const ok = (c, m) => console.log(c ? "  ✔" : "  ✘", m);
// Publicações de quem mora em Florianópolis (bruno, fabi) e em São Paulo (edu).
for (const [i, u] of [[1, "bruno"], [2, "fabi"], [3, "bruno"], [4, "edu"], [5, "fabi"]].entries()) {
  await db.doc(`diario/perto${i}`).set({ autorId: U[u[1]], nome: u[1], texto: `Publicação ${i} de ${u[1]} na cidade`, criadoEm: Timestamp.fromMillis(Date.now() - i * 3600e3) });
}
await db.doc(`perfis_publicos/${U.fabi}`).set({ cidade: "Florianópolis", uf: "SC", cidadeIbge: 4205407 }, { merge: true });
const { browser, ctx } = await navegador({ mobile: true });
await ctx.addInitScript(() => { try { localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" })); localStorage.removeItem("hf-filtros-servicos"); } catch {} });
await ctx.grantPermissions(["geolocation"]); await ctx.setGeolocation({ latitude: -27.6, longitude: -48.55 });
await ctx.route(/nominatim\.openstreetmap\.org\/search/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify([{ lat: "-27.6001", lon: "-48.5199" }]) }));

// ---------- início ----------
const p = await entrar(ctx, "ana", "index.html");
await p.waitForSelector("#trilhoPerto .mini", { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(1500);
ok(!(await p.locator("#secPerto").isHidden()), "início: seção Perto de você");
console.log("  sub:", await p.textContent("#pertoSub"));
const nomes = await p.locator("#trilhoPerto .mini strong").allTextContents();
ok(nomes.length > 0 && !nomes.slice(0, 2).includes("Edu Pinturas"), "pela cidade do perfil: os de Florianópolis antes do de São Paulo: " + nomes.join(", "));
ok((await p.locator("#trilhoPerto .dist").first().textContent()).length > 0, "distância no cartão: " + await p.locator("#trilhoPerto .dist").first().textContent());
await p.click("#pertoLoc"); await p.waitForTimeout(2500);
ok((await p.textContent("#pertoSub")).startsWith("Do mais perto") && await p.locator("#pertoLoc").isHidden(), "Usar minha localização (GPS): " + await p.textContent("#pertoSub"));
await p.locator("#secPerto").scrollIntoViewIfNeeded(); await p.screenshot({ path: "saida/perto-inicio.png" });

// ---------- vitrine ----------
await p.goto(BASE + "servicos.html"); await p.waitForTimeout(4000);
await p.evaluate(() => document.querySelector(".hfman-x")?.click());
ok((await p.locator(".cv-onde").allTextContents()).some((x) => /km|cidade/.test(x)), "vitrine: distância nos cartões");
await p.locator(".vt-ordem button, .vt-ordem [role=tab]", { hasText: "Mais perto" }).first().click(); await p.waitForTimeout(800);
const ordem = await p.locator("#vtGrade .vt-cv .nm").allTextContents();
ok(ordem.length && ordem[ordem.length - 1] === "Edu Pinturas", "Mais perto: São Paulo por último: " + ordem.join(", "));
await p.click("#vtFiltrosBtn"); await p.waitForTimeout(400);
ok((await p.locator(".vt-filtros-pop").textContent()).includes("Distância"), "Filtros: seção Distância");
await p.locator(".vt-f-chip", { hasText: "25 km" }).click(); await p.waitForTimeout(200);
const btTx = await p.textContent(".vt-filtros-pop .vt-local-aplicar");
await p.screenshot({ path: "saida/perto-filtro.png" });
await p.locator(".vt-filtros-pop .vt-local-aplicar").click(); await p.waitForTimeout(800);
const vis = await p.locator("#vitrine").textContent();
ok(!vis.includes("Edu Pinturas") && vis.includes("Fabi Faxina") && (await p.locator(".vt-ativo").textContent()).includes("25 km"), `até 25 km: sem o de São Paulo (${btTx})`);
await p.screenshot({ path: "saida/perto-vitrine.png" });
await p.locator(".vt-ativo").first().click(); await p.waitForTimeout(300);

// ---------- Explorar ----------
await p.goto(BASE + "feed.html?aba=explorar"); await p.waitForTimeout(5000);
ok((await p.textContent("#titNegocios")) === "Perto de você", "Explorar: Perto de você (" + await p.textContent("#subNegocios") + ")");
ok(await p.locator("#exploraNegocios .dist").count() > 0, "Explorar: distância nos negócios");
ok(!(await p.locator("#secPostsPerto").isHidden()) && await p.locator("#gradePostsPerto .exp-tile").count() >= 3, "Publicações perto de você: " + await p.locator("#gradePostsPerto .exp-tile").count());
const textos = (await p.locator("#gradePostsPerto").textContent()) || "";
ok(!textos.includes("de edu"), "publicação de quem mora longe não entra");
await p.locator("#secNegocios").scrollIntoViewIfNeeded(); await p.screenshot({ path: "saida/perto-explorar.png" });
await p.locator("#secPostsPerto").scrollIntoViewIfNeeded(); await p.screenshot({ path: "saida/perto-explorar-posts.png" });
await p.close();

// ---------- ponto do endereço ao salvar ----------
const b = await entrar(ctx, "bruno", "negocios.html");
await b.waitForSelector(".neg-card.servicos .ng-pri", { timeout: 20000 });
await b.click(".neg-card.servicos .ng-pri"); await b.waitForTimeout(800);
await b.fill("#negAreasBusca", "eletric"); await b.locator("#negExtras .marca-op", { hasText: "Eletricista" }).click();
await b.locator("#negLocal input[autocomplete=address-line1]").fill("Rua Lauro Linhares").catch(() => {});
await b.click("#negSalvar"); await b.waitForTimeout(3500);
const g = (await db.doc(`negocios/${U.bruno}_servicos`).get()).data()?.geo;
ok(g && g.lat === -27.6 && g.lng === -48.52, "ponto do endereço gravado (arredondado ~100 m): " + JSON.stringify(g));
await browser.close();
process.exit(0);
