// Fotografa a aba Salvos (escuro e claro) com os tipos de publicação. Uso: node salvos-tmp.mjs prefixo
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, garantirImagem } from "./nav.mjs";
import { readFileSync } from "node:fs";
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const FOTO = "data:image/png;base64," + readFileSync(garantirImagem("saida/foto-ef.png", 1080, 1350)).toString("base64");
const T = (h) => Timestamp.fromMillis(Date.now() + h * 3600e3);
const P = [
  ["svEnq", { texto: "E aí quem ganha", enquete: { pergunta: "Funciona?", opcoes: ["Sim", "Não"], fimEm: T(20) } }],
  ["svCit", { texto: "Hoje fechei o meu primeiro serviço pelo Help Floripa! Obrigado a todos que indicaram." }],
  ["svCaixa", { texto: "Tirem suas dúvidas", caixa: { pergunta: "O que vocês querem saber?", anonima: true } }],
  ["svFotos", { texto: "Antes e depois da fachada", mediaUrl: FOTO, mediaTipo: "image", midias: [FOTO, FOTO, FOTO] }],
  ["svFoto", { texto: "Cozinha nova", mediaUrl: FOTO, mediaTipo: "image" }],
  ["svCit2", { texto: "Dica: sempre peça orçamento por escrito e combine o prazo antes de começar." }]
];
for (const [i, [id, d]] of P.entries()) await db.doc(`diario/${id}`).set({ autorId: U.ana, nome: "Ana Souza", fotoPerfil: "", criadoEm: T(-1 - i), ...d });
await db.doc("diario_notas/svFotos").set({ total: 12, soma: 56, n1: 0, n2: 0, n3: 1, n4: 2, n5: 9 });
await db.doc(`usuarios/${U.bruno}`).set({ salvos: P.map(([id]) => id), colecoes: [{ id: "c1", nome: "Ideias de reforma", ids: ["svFotos", "svFoto", "svCit2"] }] }, { merge: true });
const pre = process.argv[2] || "antes";
for (const tema of ["escuro", "claro"]) {
  const { browser, ctx } = await navegador({ mobile: true });
  const page = await entrar(ctx, "bruno", "usuarios.html");
  await page.emulateMedia({ colorScheme: tema === "escuro" ? "dark" : "light" });
  await page.waitForSelector("#abaSalvos", { timeout: 30000 }); await page.waitForTimeout(1200);
  await page.locator("#abaSalvos").click(); await page.waitForTimeout(3000);
  await page.locator("#gradeSalvos").scrollIntoViewIfNeeded();
  await page.locator("#gradeSalvos").screenshot({ path: `saida/sv-${pre}-${tema}.png` });
  await page.evaluate(() => document.querySelectorAll("body *").forEach((e) => { const cs = getComputedStyle(e); if (cs.position === "fixed" && parseFloat(cs.bottom) < 40 && e.getBoundingClientRect().top > innerHeight / 2) e.style.display = "none"; }));
  const tiles = page.locator(".sv-grade .tile");
  for (let i = 0; i < await tiles.count(); i++) { await tiles.nth(i).scrollIntoViewIfNeeded(); await tiles.nth(i).screenshot({ path: `saida/sv-${pre}-${tema}-t${i}.png` }); }
  await browser.close();
}
