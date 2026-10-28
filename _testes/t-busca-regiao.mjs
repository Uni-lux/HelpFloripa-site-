// Busca nacional e Diário por região. (1) 210 negócios mais novos no país + 1 eletricista antiga: a busca do Explorar
// e a da vitrine acham "eletric" (pergunta ao Firebase pelo campo `busca`, não só nos 200/48 mais recentes);
// a Comunidade acha "bicicleta" além dos 150 recentes. (2) O dono abre Meus negócios e o perfil antigo ganha `busca`.
// (3) Publicação do Diário guarda autorUf/autorIbge; com 130 publicações novas de SP, quem é de SC vê a de SC nos
// Principais (as recentes do estado entram junto). Uso: node t-busca-regiao.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
import { termosBusca } from "../busca.js";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const db = getFirestore(initializeApp({ projectId: "demo-hf" }));
const agora = Date.now(), T = (min) => Timestamp.fromMillis(agora - min * 60000);
async function emLotes(itens) { for (let i = 0; i < itens.length; i += 400) { const b = db.batch(); itens.slice(i, i + 400).forEach(([ref, d]) => (d ? b.set(ref, d) : b.delete(ref))); await b.commit(); } }

// ---------- dados ----------
const neg = Array.from({ length: 210 }, (_, i) => [db.doc(`negocios/bx_${i}_servicos`), { donoId: `bx_${i}`, tipo: "servicos", nome: `Faxina Rápida ${i}`, cidade: "São Paulo", uf: "SP", categorias: ["limpeza"], atualizadoEm: T(i), criadoEm: T(i) }]);
neg.push([db.doc("negocios/bx_rita_servicos"), { donoId: "bx_rita", tipo: "servicos", nome: "Rita Eletricista", cidade: "Recife", uf: "PE", cidadeIbge: 2611606, categorias: ["eletrica"],
  busca: termosBusca(["Rita Eletricista", "Elétrica", "Recife"]), atualizadoEm: T(60 * 24 * 30), criadoEm: T(60 * 24 * 40) }]);
const com = Array.from({ length: 155 }, (_, i) => [db.doc(`comunidade/bx_c${i}`), { donoId: U.edu, categoria: "doacao", tipoItem: "casa", titulo: `Panela ${i}`, descricao: "", fotos: [], status: "disponivel", cidade: "São Paulo", uf: "SP", aceiteRegras: true, atualizadoEm: T(i), criadoEm: T(i) }]);
com.push([db.doc("comunidade/bx_bike"), { donoId: U.edu, categoria: "doacao", tipoItem: "outros", titulo: "Bicicleta aro 26", descricao: "", fotos: [], status: "disponivel", cidade: "Recife", uf: "PE", aceiteRegras: true,
  busca: termosBusca(["Bicicleta aro 26", "Recife"]), atualizadoEm: T(60 * 24 * 3), criadoEm: T(60 * 24 * 3) }]);
const posts = Array.from({ length: 130 }, (_, i) => [db.doc(`diario/bx_p${i}`), { autorId: U.edu, nome: "Eduardo Lima", fotoPerfil: "", texto: `Bom dia de SP ${i}`, autorUf: "SP", criadoEm: T(i) }]);
posts.push([db.doc("diario/bx_sc"), { autorId: U.edu, nome: "Eduardo Lima", fotoPerfil: "", texto: "Notícia boa de Santa Catarina", autorUf: "SC", autorIbge: 4205407, criadoEm: T(140) }]);
await emLotes([...neg, ...com, ...posts]);
await db.doc(`usuarios/${U.ana}`).set({ uf: "SC", cidadeIbge: 4205407 }, { merge: true });
await db.doc(`negocios/${U.bruno}_servicos`).update({ busca: (await import("firebase-admin/firestore")).FieldValue.delete() }).catch(() => {});

// ---------- (1) busca ----------
const A = await navegador({ mobile: true });
const p = await entrar(A.ctx, "ana", "feed.html?aba=registros");
await p.waitForSelector("#btnComporFeed", { timeout: 30000 }); await p.waitForTimeout(1500);
// (3) região: a publicação de SC (mais antiga que as 130 de SP) aparece nos Principais de quem é de SC
await p.waitForFunction(() => document.querySelectorAll(".post-card").length > 3, null, { timeout: 30000 }).catch(() => {});
// Fora das 120 mais recentes do país: só entra pelas recentes do estado. Vai pedindo "Ver mais" até achar.
for (let i = 0; i < 20 && !(await p.locator("#listaFeed").innerText()).includes("Santa Catarina") && await p.locator("#maisFeed:not([hidden])").count(); i++) { await p.locator("#maisFeed").click(); await p.waitForTimeout(400); }
const feedTxt = await p.locator("#listaFeed").innerText();
ok(feedTxt.includes("Notícia boa de Santa Catarina"), "Diário (Principais): quem é de SC vê a publicação de SC, mesmo com 130 mais novas de SP");
await p.locator("#barraRede [data-barra=explorar]").tap(); await p.waitForTimeout(1200);
await p.fill("#buscaPessoas", "eletric"); await p.waitForTimeout(2500);
ok((await p.locator("#listaPessoas").innerText()).includes("Rita Eletricista"), "Explorar: \"eletric\" acha a eletricista de Recife (fora dos 200 mais recentes)");
await p.screenshot({ path: "saida/busca-explorar.png" });

// Publicar no Diário grava a região de quem publica
await p.locator("#barraRede [data-barra=diario]").tap(); await p.waitForTimeout(800);
await p.locator("#btnComporFeed").tap(); await p.locator("#pubTexto").fill("Publicação com região"); await p.locator("#pubEnviar").click(); await p.waitForTimeout(2500);
const minha = (await db.collection("diario").where("autorId", "==", U.ana).get()).docs.map((d) => d.data()).find((x) => x.texto === "Publicação com região");
ok(minha?.autorUf === "SC" && minha?.autorIbge === 4205407, "publicação guarda o estado e a cidade de quem publica: " + JSON.stringify({ uf: minha?.autorUf, ibge: minha?.autorIbge }));
await A.browser.close();

const V = await navegador({ mobile: true });
const v = await entrar(V.ctx, "ana", "servicos.html?q=eletric");
await v.waitForFunction(() => /Rita Eletricista/.test(document.getElementById("vtGrade")?.innerText || ""), null, { timeout: 30000 }).catch(() => {});
ok((await v.locator("#vtGrade").innerText()).includes("Rita Eletricista"), "vitrine Freelances: ?q=eletric acha a eletricista (fora dos 48 carregados)");
await V.browser.close();

const C = await navegador({ mobile: true });
const c = await entrar(C.ctx, "ana", "comunidade.html?q=bicicleta");
await c.waitForFunction(() => /Bicicleta aro 26/.test(document.body.innerText), null, { timeout: 30000 }).catch(() => {});
ok((await c.locator("body").innerText()).includes("Bicicleta aro 26"), "Comunidade: \"bicicleta\" acha a doação fora dos 150 recentes");
await C.browser.close();

// ---------- (2) perfil antigo ganha a busca ----------
const B = await navegador({ mobile: true });
const b = await entrar(B.ctx, "bruno", "negocios.html");
await b.waitForTimeout(5000);
const br = (await db.doc(`negocios/${U.bruno}_servicos`).get()).data();
ok(Array.isArray(br?.busca) && br.busca.includes("bruno") && br.busca.includes("rep"), "Meus negócios: perfil antigo ganhou as palavras da busca → " + (br?.busca || []).slice(0, 8).join(", "));
await B.browser.close();

await emLotes([...neg, ...com, ...posts].map(([ref]) => [ref, null]));
process.exit(process.exitCode || 0);
