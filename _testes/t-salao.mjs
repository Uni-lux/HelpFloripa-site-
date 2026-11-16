// Salão (16/11/2026): o Social vira a galeria da vida da pessoa. Momentos com foto (em exposição, galeria por categoria),
// lembranças na linha da vida, "quem vê" de cada um, destaques do Flash (abrem o visor pelo feed.html?destaque=), visor
// em tela cheia e o cartão do Salão no perfil (no lugar da fileira de destaques).
// Uso: node seed.mjs | tail -1 > saida/seed-ids.json && FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 node dados-perfil.mjs && node t-salao.mjs
import { navegador, entrar, BASE } from "./nav.mjs";
import { readFileSync } from "node:fs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8085";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const ids = JSON.parse(readFileSync("saida/seed-ids.json", "utf8"));
initializeApp({ projectId: "demo-hf" });
const db = getFirestore();
// limpa o salão da Ana; o Bruno NÃO segue a Ana (vê só o "todos")
for (const d of (await db.collection("momentos").where("uid", "==", ids.ana).get()).docs) await d.ref.delete();
await db.doc(`relacoes/${ids.bruno}_${ids.ana}`).delete().catch(() => {});
// destaque do Flash da Ana com um flash antigo (destacado)
const jpg = "data:image/jpeg;base64," + readFileSync("saida/retrato.jpg").toString("base64");
const mini = jpg.length < 30000 ? jpg : "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==";
await db.doc("stories/st_salao").set({ autorId: ids.ana, nome: "Ana Souza", midia: jpg, tipo: "foto", criadoEm: Timestamp.fromMillis(Date.now() - 30 * 3600e3), destacado: true, restrito: false });
await db.doc("destaques/dq_salao").set({ uid: ids.ana, nome: "Viagens", ids: ["st_salao"], capa: "st_salao", capaMini: mini, criadoEm: Timestamp.now(), atualizadoEm: Timestamp.now() });

const erros = [];
const A = await navegador({ mobile: true });
const p = await entrar(A.ctx, "ana", "social.html");
p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector("#painelSalao:not([hidden])", { timeout: 25000 }); await p.waitForTimeout(2500);
ok(await p.locator("#abaSalao[aria-selected=true]").count() === 1 && await p.locator("#painelConexoes[hidden]").count() === 1, "abre na aba Salão");
ok(await p.locator("#dqf a[href*='destaque=dq_salao']").count() === 1, "destaque do Flash no Salão");
ok(await p.locator("#slNovo .sl-add").count() === 1 && await p.locator("#slNovo .sl-med").count() === 2, "barra do dono: quanto cabe (fotos, exposição) + Adicionar");

// "+" do topo: escolher o que adicionar
await p.locator("#btnAdd").click(); await p.waitForTimeout(400);
ok(await p.locator(".folha.aberta #crFoto, .folha.aberta #crDq, .folha.aberta #crPessoa").count() === 3 && await p.locator("#crLemb").count() === 0, "\"+\" mostra as opções");
await p.locator("#crFoto").click(); await p.waitForTimeout(400);
// momento com foto, em exposição
await p.locator("#edmArquivo").setInputFiles("saida/retrato.jpg"); await p.waitForTimeout(1200);
ok(await p.locator("#edmFoto img").count() === 1, "foto escolhida na prévia");
await p.locator("#edmTitulo").fill("Viagem a Gramado");
await p.locator("#edmTexto").fill("Primeira viagem com a família inteira.");
await p.evaluate(() => { const d = document.querySelector("#edmData"); d.value = "2024-07-12"; d.dispatchEvent(new Event("change", { bubbles: true })); });
await p.locator("#edmLocal").fill("Gramado/RS");
await p.locator('#edmCats button[data-cat="viagem"]').click();
await p.locator(".ed-fix").scrollIntoViewIfNeeded(); await p.locator(".ed-fix").click();
await p.locator(".folha.aberta").screenshot({ path: "saida/salao-editor.png" });
await p.locator("#edmSalvar").click(); await p.waitForTimeout(1800);
let ms = (await db.collection("momentos").where("uid", "==", ids.ana).get()).docs.map((d) => d.data());
ok(ms.length === 1 && ms[0].fixado === true && ms[0].categoria === "viagem" && ms[0].data === "2024-07-12" && ms[0].foto.startsWith("data:image/jpeg"), "momento gravado (exposição, viagem, data, foto)");
ok(await p.locator("#expo .expo-card").count() === 1 && (await p.locator("#expo").textContent()).includes("Gramado"), "Em exposição");
ok(await p.locator("#galeria .g-tile:not(.novo)").count() === 1, "na galeria");
// lembrança só para seguidores e um momento "só eu"
await p.locator("#btnAdd").click(); await p.waitForTimeout(300); await p.locator("#crFoto").click(); await p.waitForTimeout(400);
await p.locator("#edmArquivo").setInputFiles("saida/retrato.jpg"); await p.waitForTimeout(1000);
await p.locator("#edmTitulo").fill("Primeiro emprego");
await p.locator('#edmCats button[data-cat="trabalho"]').click();
await p.locator('#edmVer button[data-v="seguidores"]').click();
await p.evaluate(() => { const d = document.querySelector("#edmData"); d.value = "2019-03-01"; d.dispatchEvent(new Event("change", { bubbles: true })); });
await p.locator("#edmSalvar").click(); await p.waitForTimeout(1500);
await p.locator("#slNovoFoto").click(); await p.waitForTimeout(300); await p.locator("#crFoto").click(); await p.waitForTimeout(400);
await p.locator("#edmArquivo").setInputFiles("saida/retrato.jpg"); await p.waitForTimeout(1000);
await p.locator("#edmTitulo").fill("Só minha");
await p.locator('#edmVer button[data-v="eu"]').click();
await p.locator("#edmSalvar").click(); await p.waitForTimeout(1500);
ms = (await db.collection("momentos").where("uid", "==", ids.ana).get()).docs.map((d) => d.data());
ok(ms.length === 3 && ms.some((m) => m.categoria === "trabalho" && m.ver === "seguidores") && ms.some((m) => m.ver === "eu"), "fotos para seguidores e só eu gravadas");
ok(await p.locator("#galeria .g-tranca").count() === 2, "cadeado na foto que não é para todos");
ok(await p.locator("#stMom").textContent() === "3", "número de momentos no topo");
// visor
await p.locator("#expo .expo-card").first().click(); await p.waitForTimeout(500);
ok(await p.locator(".mv .mv-slide").count() === 1 && (await p.locator(".mv").textContent()).includes("Primeira viagem"), "visor em tela cheia com a história");
await p.screenshot({ path: "saida/salao-visor.png" });
await p.goBack(); await p.waitForTimeout(500);
ok(await p.locator(".mv").count() === 0, "voltar do celular fecha o visor");
const larg = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
ok(larg, "sem passar da largura");
await p.screenshot({ path: "saida/salao-dono.png", fullPage: true });
// Conexões continua na outra aba
await p.locator("#abaConexoes").click(); await p.waitForTimeout(300);
ok(await p.locator("#rede .pessoa").count() >= 2 && await p.locator("#painelSalao[hidden]").count() === 1, "aba Conexões com os cartões");
// perfil: cartão do Salão no lugar da fileira de destaques
await p.goto(BASE + "usuarios.html"); await p.waitForSelector("#meuPerfil .pf-salao:not([hidden])", { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(800);
const pf = await p.evaluate(() => ({ cartao: document.querySelector("#meuPerfil .pf-salao")?.textContent || "", fileira: document.querySelectorAll("#meuPerfil .pf-destaques:not([hidden])").length, fotos: document.querySelectorAll("#meuPerfil .pf-salao .ps-fotos i").length }));
ok(pf.cartao.includes("Seu salão") && pf.cartao.includes("3 momentos") && /\d destaques? do Flash/.test(pf.cartao), "perfil: cartão \"Seu salão\" com os números (" + pf.cartao + ")");
ok(pf.fileira === 0 && pf.fotos >= 2, "perfil sem a fileira de destaques e com a prévia");
await p.locator("#meuPerfil .pf-salao").screenshot({ path: "saida/salao-perfil.png" });
ok(!erros.length, "sem erro na página " + erros.join(" | "));
await A.browser.close();

// Visitante que não segue: só o que é para todos
const B = await navegador({ mobile: true });
const q = await entrar(B.ctx, "bruno", `social.html?uid=${ids.ana}`);
q.on("pageerror", (e) => erros.push(e.message));
await q.waitForSelector("#painelSalao:not([hidden])", { timeout: 25000 }); await q.waitForTimeout(2500);
const t = await q.locator("#painelSalao").textContent();
ok(t.includes("Gramado") && !t.includes("Primeiro emprego") && !t.includes("Só minha"), "visitante vê só o \"todos\"");
ok(await q.locator("#slNovo:not([hidden]), #galNovo, .mv-acoes").count() === 0, "visitante sem botões de editar");
ok(await q.locator("#stMom").textContent() === "1", "visitante: 1 momento");
await q.goto(BASE + `usuarios.html?perfil=${ids.ana}`); await q.waitForTimeout(3500);
ok((await q.locator("#ppCabecalho .pf-salao").textContent().catch(() => "")).includes("Salão de Ana"), "perfil da Ana: \"Salão de Ana\" para quem visita");
// destaque abre o visor do Flash
await q.goto(BASE + `social.html?uid=${ids.ana}`); await q.waitForSelector("#dqf a", { timeout: 20000 }); await q.waitForTimeout(800);
await q.locator("#dqf a").first().click();
ok(await q.waitForSelector(".story-visor", { timeout: 15000 }).then(() => true).catch(() => false), "destaque do Flash abre o visor");
await B.browser.close();
// quem segue passa a ver a lembrança dos seguidores
await db.doc(`relacoes/${ids.bruno}_${ids.ana}`).set({ tipo: "seguir", seguidorId: ids.bruno, alvoId: ids.ana, criadoEm: Timestamp.now() });
const C = await navegador({ mobile: true });
const r = await entrar(C.ctx, "bruno", `social.html?uid=${ids.ana}`);
await r.waitForSelector("#painelSalao:not([hidden])", { timeout: 25000 }); await r.waitForTimeout(2500);
const t2 = await r.locator("#painelSalao").textContent();
const rot2 = (await r.locator("#galeria .g-tile").evaluateAll((l) => l.map((e) => e.getAttribute("aria-label")))).join("|");
ok(rot2.includes("Primeiro emprego") && !rot2.includes("Só minha") && !t2.includes("Só minha"), "seguidor vê também o \"seguidores\" (e nunca o \"só eu\")");
await C.browser.close();
await db.doc(`relacoes/${ids.bruno}_${ids.ana}`).delete();
ok(!erros.length, "sem erros " + erros.join(" | "));
