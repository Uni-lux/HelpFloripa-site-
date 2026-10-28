// Publicação no Flash ("Adicionar ao seu flash"): abre rápido mesmo num celular lento (CPU 6× mais devagar) e o
// cartão segue o mesmo modelo para cada tipo: enquete (só texto, com foto, encerrada com resultado), citação (só
// texto longo), várias fotos (1/N, bolinhas e estrelas) e caixa de perguntas. Capturas em saida/ef-*.png.
// Uso: node t-enquete-flash.mjs   (emulador + servidor-csp + seed; regras do repositório)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, BASE, garantirImagem } from "./nav.mjs";
import { readFileSync, writeFileSync } from "node:fs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const FOTO = "data:image/png;base64," + readFileSync(garantirImagem("saida/foto-ef.png", 1080, 1350)).toString("base64");
const agora = Date.now(), T = (h) => Timestamp.fromMillis(agora + h * 3600e3);
await db.doc(`perfis_publicos/${U.ana}`).set({ fotoPerfil: "" }, { merge: true });
const casos = [
  ["efTexto", { texto: "E aí quem ganha", enquete: { pergunta: "Funciona", opcoes: ["Sim", "Não"], fimEm: T(20) } }, "texto"],
  ["efFoto", { texto: "Reforma da cozinha pronta! Qual acabamento vocês preferem para a bancada nova?", mediaUrl: FOTO, mediaTipo: "image", enquete: { pergunta: "Qual bancada?", opcoes: ["Granito preto", "Quartzo branco", "Madeira"], fimEm: T(20) } }, "foto"],
  ["efFim", { texto: "Resultado da votação", enquete: { pergunta: "Abre domingo?", opcoes: ["Sim", "Não", "Só de manhã"], fimEm: T(-1) } }, "encerrada"],
  ["efCitacao", { texto: "Hoje fechei o meu primeiro serviço pelo Help Floripa! Obrigado a todos que indicaram, foi uma reforma de banheiro completa em três dias, com acabamento novo e tudo limpinho no final. Sigo aceitando novos clientes na região." }, "citacao"],
  ["efFotos", { texto: "Antes e depois da pintura da fachada", mediaUrl: FOTO, mediaTipo: "image", midias: [FOTO, FOTO, FOTO] }, "fotos"],
  ["efCaixa", { texto: "Tirem suas dúvidas sobre reformas", caixa: { pergunta: "O que vocês querem saber?", anonima: true } }, "caixa"]
];
for (const [id, d] of casos) await db.doc(`diario/${id}`).set({ autorId: U.ana, nome: "Ana Souza", fotoPerfil: "", criadoEm: T(-2 - casos.findIndex((c) => c[0] === id)), ...d });
for (let f = 0; f < 10; f++) await db.doc(`enquete_contas/d_efFim_${f}`).set({ n0: 6, n1: 3, n2: 1 });
await db.doc("diario_notas/efFotos").set({ total: 12, soma: 56, n1: 0, n2: 0, n3: 1, n4: 2, n5: 9 });
// Na enquete encerrada, o resultado final pode estar guardado no aparelho: começa sem nada guardado.

const { browser, ctx } = await navegador({ mobile: true });
const page = await entrar(ctx, "bruno", "feed.html?aba=registros");
const cdp = await ctx.newCDPSession(page);
await page.waitForSelector(".post-card", { timeout: 30000 });
const tempos = {};
for (const [id, dadosPost, nome] of casos) {
  // Com foto, a publicação fica no Diário; texto, enquete e pergunta ficam em Registros.
  await page.goto(BASE + (dadosPost.mediaUrl ? "feed.html" : "feed.html?aba=registros")); await page.waitForTimeout(3000);
  const texto = casos.find((c) => c[0] === id)[1].texto.slice(0, 18);
  const card = page.locator("article.post-card", { hasText: texto }).first();
  await card.waitFor({ timeout: 30000 }); await card.scrollIntoViewIfNeeded(); await page.waitForTimeout(1000);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  await card.locator(".acoes-post button", { hasText: "Compartilhar" }).click();
  await page.locator("#opcoesCorpo button", { hasText: "Adicionar ao seu flash" }).click();
  const t0 = Date.now();
  await page.waitForSelector(".flash-fotobox .flash-foto", { timeout: 60000 }).catch(() => {});
  tempos[nome] = Date.now() - t0;
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  const src = await page.locator(".flash-fotobox .flash-foto").first().getAttribute("src").catch(() => null);
  if (src?.startsWith("data:image/jpeg")) writeFileSync(`saida/ef-${nome}.jpg`, Buffer.from(src.split(",")[1], "base64"));
  ok(tempos[nome] < 4000, `${nome}: criador do flash aberto com o cartão em ${(tempos[nome] / 1000).toFixed(1)} s (celular 6× mais lento)`);
  await page.screenshot({ path: `saida/ef-criador-${nome}.png` });
  const selo = await page.locator(".flash-repost-selo").textContent().catch(() => "");
  const esperado = nome === "caixa" ? "Caixa de perguntas de" : ["texto", "foto", "encerrada"].includes(nome) ? "Enquete de" : "Publicação de";
  ok(selo.includes(esperado), `${nome}: selo do criador "${selo.trim()}"`);
  await page.keyboard.press("Escape"); await page.waitForTimeout(600);
  await page.locator(".flash-criar [data-fechar], .flash-criar .flash-fechar").first().click({ timeout: 2000 }).catch(() => {});
}
console.log("tempos (ms):", JSON.stringify(tempos));
await browser.close();
