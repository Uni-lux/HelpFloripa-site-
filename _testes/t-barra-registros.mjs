// Barra de baixo com 5 itens (Diário, Explorar, Comunidade, Mensagens, Perfil) e abas do topo Diário | Registros:
// Diário = publicações com foto ou vídeo; Registros = textos, enquetes e caixas de perguntas. O Explorar da barra abre no
// próprio Diário, sem recarregar; a Comunidade também mostra a barra. Uso: node seed.mjs && node t-barra-registros.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, BASE } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const T = (h) => Timestamp.fromMillis(Date.now() - h * 36e5);
const FOTO = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";
const base = { autorId: U.bruno, nome: "Bruno", fotoPerfil: "", tags: [], autorUf: "SC", autorIbge: 4205407 };
await db.doc("diario/br_foto").set({ ...base, texto: "Trabalho de hoje com foto", mediaUrl: FOTO, mediaTipo: "image", criadoEm: T(1) });
await db.doc("diario/br_texto").set({ ...base, texto: "Dica rápida só em texto", criadoEm: T(2) });
await db.doc("diario/br_enquete").set({ ...base, texto: "Qual horário vocês preferem?", enquete: { pergunta: "Melhor horário?", opcoes: ["Manhã", "Tarde"] }, criadoEm: T(3) });

const { browser, ctx } = await navegador({ mobile: true });
const erros = [];
const p = await entrar(ctx, "ana", "feed.html");
p.on("pageerror", (e) => erros.push(String(e)));
await p.waitForSelector("#barraRede a", { timeout: 20000 });
const itens = await p.$$eval("#barraRede a", (as) => as.map((a) => [...a.querySelectorAll(":scope > span")].pop()?.textContent.trim()));
ok(itens.join("|") === "Diário|Explorar|Comunidade|Mensagens|Perfil", "barra de baixo: " + itens.join(" · "));
const abas = await p.$$eval("#abasFeed [data-aba]", (bs) => bs.map((b) => b.textContent.trim()));
ok(abas.join("|") === "Diário|Registros", "abas do topo: " + abas.join(" | "));
const textos = async () => { await p.waitForSelector(".post-card, #listaFeed .vazio, #listaFeed [class*=vazio]", { timeout: 20000 }); await p.waitForTimeout(2500); return p.$$eval(".post-card", (cs) => cs.map((c) => c.textContent)); };
const d = await textos();
ok(d.some((t) => t.includes("Trabalho de hoje com foto")) && !d.some((t) => t.includes("Dica rápida") || t.includes("Melhor horário")), `Diário: só a publicação com foto (${d.length})`);
await p.locator("#abasFeed [data-aba=registros]").click();
const r = await textos();
ok(r.some((t) => t.includes("Dica rápida")) && r.some((t) => t.includes("Melhor horário")) && !r.some((t) => t.includes("Trabalho de hoje")), `Registros: texto e enquete, sem a foto (${r.length})`);
ok(p.url().includes("aba=registros") && await p.locator("#storiesFeed").isHidden(), "Registros: endereço próprio e sem a fileira do Flash");
await p.evaluate(() => { window.__semRecarregar = 1; });
await p.locator("#barraRede [data-barra=explorar]").click(); await p.waitForTimeout(1200);
ok(await p.locator("#painelExplorar").isVisible() && await p.evaluate(() => window.__semRecarregar === 1), "Explorar da barra abre no próprio Diário (sem recarregar)");
ok(await p.locator('#barraRede [data-barra=explorar][aria-current="page"]').count() === 1 && await p.locator("#abasFeed").isHidden(), "Explorar marcado na barra e sem as abas do topo");
await p.goBack(); await p.waitForTimeout(1200);
ok(await p.locator("#painelFeed").isVisible() && await p.locator('#barraRede [data-barra=diario][aria-current="page"]').count() === 1, "voltar: volta para o Diário/Registros");
ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "a barra cabe no celular (sem rolar para o lado)");
await p.screenshot({ path: "saida/barra-registros.png" });
await p.goto(BASE + "comunidade.html"); await p.waitForSelector("#barraRede a", { timeout: 20000 });
ok(await p.locator('#barraRede [data-barra=comunidade][aria-current="page"]').count() === 1, "Comunidade: barra de baixo com a Comunidade marcada");
await p.screenshot({ path: "saida/barra-comunidade.png" });
await p.goto(BASE + "mensagens.html"); await p.waitForSelector("#barraRede a", { timeout: 20000 });
ok((await p.$$eval("#barraRede a", (as) => as.length)) === 5, "Mensagens: a mesma barra de 5 itens");
ok(!erros.length, "sem erro nas páginas " + erros.join(" | "));
await browser.close();
for (const id of ["br_foto", "br_texto", "br_enquete"]) await db.doc(`diario/${id}`).delete();
process.exit();
