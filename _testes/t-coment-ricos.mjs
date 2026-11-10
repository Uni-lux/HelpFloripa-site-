// Comentários com foto, áudio (microfone de teste), figurinha e enquete do autor (10/11/2026, pedido do dono).
// Uso: node seed.mjs && node t-coment-ricos.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const foto = "data:image/jpeg;base64," + readFileSync("saida/fotos-pub/montanha.jpg").toString("base64");
await db.doc("diario/pRico").set({ autorId: U.ana, nome: "Ana", tipo: "foto", titulo: "Trilha da Lagoinha do Leste", texto: "Vista incrível lá de cima!\n\n#trilha #floripa", tags: ["trilha", "floripa"], mediaUrl: foto, mediaTipo: "image", criadoEm: Timestamp.now() });
for (const d of (await db.collection("comentarios").where("postId", "==", "pRico").get()).docs) await d.ref.delete();
await db.doc("comentarios/rc1").set({ postId: "pRico", postAutorId: U.ana, autorId: U.bruno, nome: "Bruno", texto: "Que lugar lindo! Quanto tempo de trilha?", criadoEm: Timestamp.fromMillis(Date.now() - 600000) });

const A = await navegador({ mobile: true, camera: true });
const p = await entrar(A.ctx, "ana", "feed.html");
if (process.env.CLARO !== "1") await p.emulateMedia({ colorScheme: "dark" }); // prints no tema escuro
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
const card = p.locator(".post-card", { hasText: "Trilha da Lagoinha" }).first();
await card.waitFor({ timeout: 30000 }); await card.scrollIntoViewIfNeeded(); await p.waitForTimeout(800);
await card.locator(".acoes-post .acao").first().tap();
await p.waitForSelector("#folhaComentarios.aberta .fio-coment", { timeout: 10000 }); await p.waitForTimeout(600);
const F = "#folhaComentarios";
ok(await p.locator(`${F} .coment-ferr .cf-bt`).count() === 4, "ferramentas: Foto, Áudio, Figurinha e Enquete (autor)");
ok(await p.locator(`${F} .coment-emojis button`).count() === 8, "emojis rápidos");
await p.screenshot({ path: "saida/cr-01-ferramentas.png" });
const enviar = async () => { await p.locator(`${F} .coment-enviar`).tap(); await p.waitForTimeout(1500); };
const salvos = async () => (await db.collection("comentarios").where("postId", "==", "pRico").get()).docs.map((d) => d.data());

// 1) foto
await p.setInputFiles(`${F} input[type=file]`, "saida/fotos-pub/praia.jpg");
await p.waitForSelector(`${F} .coment-anexo .ca-img`);
await p.locator(`${F} .linha-form textarea`).fill("Olha o pôr do sol de ontem");
await enviar();
ok((await salvos()).some((c) => c.midia?.tipo === "imagem" && c.midia.url.startsWith("data:image/jpeg") && c.texto === "Olha o pôr do sol de ontem"), "comentário com foto gravado");
ok(await p.locator(`${F} .coment-foto`).count() === 1, "foto aparece no comentário");

// 2) figurinha (sem texto)
await p.locator(`${F} .cf-bt`, { hasText: "Figurinha" }).tap();
await p.waitForSelector("#folhaLista.aberta .cfg-fig", { timeout: 10000 });
await p.screenshot({ path: "saida/cr-02-figurinhas.png" });
await p.locator("#folhaLista .cfg-fig").nth(2).tap();
await p.waitForSelector(`${F} .coment-anexo .ca-img.fig`);
ok(await p.locator(`${F} .coment-enviar`).isEnabled(), "só a figurinha já pode publicar");
await enviar();
ok((await salvos()).some((c) => c.midia?.tipo === "figurinha" && c.texto === ""), "comentário só com figurinha gravado");

// 3) áudio
await p.locator(`${F} .cf-bt`, { hasText: "Áudio" }).tap();
await p.waitForSelector(`${F} .coment-gravando:not([hidden])`);
await p.waitForTimeout(2300);
await p.screenshot({ path: "saida/cr-03-gravando.png" });
await p.locator(`${F} .coment-gravando .btn`).tap();
await p.waitForSelector(`${F} .coment-anexo .hf-audio`, { timeout: 8000 });
await enviar();
const aud = (await salvos()).find((c) => c.midia?.tipo === "audio");
ok(aud && /^data:audio\//.test(aud.midia.url) && aud.midia.dur >= 1, "comentário de voz gravado (" + (aud?.midia?.dur || 0) + " s)");
ok(await p.locator(`${F} .coment-audio .hf-audio`).count() === 1, "player do áudio no comentário");

// 4) enquete do autor
await p.locator(`${F} .cf-bt`, { hasText: "Enquete" }).tap();
await p.waitForSelector("#folhaLista.aberta .coment-enq-ed");
await p.locator("#folhaLista .coment-enq-ed .pe-pergunta").fill("Qual a próxima trilha?");
await p.locator("#folhaLista .coment-enq-ed .pe-opcao input").nth(0).fill("Costa da Lagoa");
await p.locator("#folhaLista .coment-enq-ed .pe-opcao input").nth(1).fill("Morro das Aranhas");
await p.locator("#folhaLista .coment-enq-ed .pe-mais").tap();
await p.locator("#folhaLista .coment-enq-ed .pe-opcao input").nth(2).fill("Pântano do Sul");
await p.screenshot({ path: "saida/cr-04-enquete-editor.png" });
await p.locator("#folhaLista .coment-enq-ed .btn.pri").tap(); await p.waitForTimeout(300);
await enviar();
ok((await salvos()).some((c) => c.enquete?.opcoes?.length === 3), "enquete no comentário gravada");
await p.waitForSelector(`${F} .coment-enq .ce-op`);
await p.locator(`${F} .coment-enq .ce-op`).nth(1).tap(); await p.waitForTimeout(1200);
const votos = await db.collection("comentario_votos").get();
ok(votos.docs.some((d) => d.data().opcao === 1 && d.data().uid === U.ana), "voto gravado");
ok((await p.locator(`${F} .coment-enq .ce-op.minha .ce-pct`).textContent()) === "100%", "resultado aparece depois de votar");
await p.locator(`${F} .comentario`).first().scrollIntoViewIfNeeded();
await p.screenshot({ path: "saida/cr-05-comentarios.png", fullPage: false });
await p.locator(`${F} .coment-enq`).scrollIntoViewIfNeeded();
await p.screenshot({ path: "saida/cr-06-enquete.png" });
await p.locator(`${F} .coment-audio`).evaluate((e) => e.scrollIntoView({ block: "center" })); await p.waitForTimeout(300);
await p.screenshot({ path: "saida/cr-07-voz-figurinha.png" });
await p.locator(`${F} .coment-foto`).evaluate((e) => e.scrollIntoView({ block: "center" })); await p.waitForTimeout(300);
await p.screenshot({ path: "saida/cr-08-foto.png" });
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close(); process.exit();
