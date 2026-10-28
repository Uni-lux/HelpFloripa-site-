// Diário → Principais (gosto da pessoa + quem ela segue) e Amigos; anel do Flash no perfil.
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => console.log(c ? "  ✔" : "  ✘", t);
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const agora = Date.now();
const PX = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";
const post = (id, autor, nome, texto, horas, tags = [], foto = true) => db.doc(`diario/${id}`).set({ autorId: U[autor], nome, texto, tags, criadoEm: Timestamp.fromMillis(agora - horas * 3600e3), ...(foto ? { mediaUrl: PX } : {}) });
// Bruno segue Ana. Edu e Fabi: ninguém segue. Mesmo engajamento (nenhum) para todos.
await db.doc(`relacoes/${U.bruno}_${U.ana}`).set({ tipo: "seguir", seguidorId: U.bruno, alvoId: U.ana });
// "Ativos recentemente" (sugestões do Explorar) vem de perfis_publicos.ultimoAcesso
for (const [k, m] of [["edu", 1], ["fabi", 2], ["ana", 3]]) await db.doc(`perfis_publicos/${U[k]}`).set({ ultimoAcesso: Timestamp.fromMillis(agora - m * 60e3) }, { merge: true });
await post("pEdu1", "edu", "Edu", "Bolo de cenoura #confeitaria", 2, ["confeitaria"]);
await post("pFabi1", "fabi", "Fabi", "Pintura da sala", 2);
await post("pAna1", "ana", "Ana Souza", "Novidade da Ana", 2);
await post("pAna2", "ana", "Ana Souza", "Outra da Ana", 2.1);
await post("pFabi2", "fabi", "Fabi", "Muro novo", 2.2);
// Flash da Ana (para o anel no perfil)
const px = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";
await db.collection("stories").add({ autorId: U.ana, nome: "Ana Souza", tipo: "imagem", midia: px, criadoEm: Timestamp.fromMillis(agora - 600e3) });

const B = await navegador({ mobile: true });
const pb = await entrar(B.ctx, "bruno", "feed.html");
// Gosto: Bruno gosta muito do Edu e de #confeitaria (como se tivesse dado estrelas e salvado antes).
await pb.evaluate(([edu]) => localStorage.setItem("hf-gosto", JSON.stringify({ a: { [edu]: { v: 40, t: Date.now() } }, t: { confeitaria: { v: 20, t: Date.now() } } })), [U.edu]);
await pb.evaluate(() => localStorage.setItem("hf-filtro-diario", "seguindo")); // "Quem eu sigo" saiu: vira Principais
await pb.reload();
await pb.waitForSelector(".post-card", { timeout: 30000 }); await pb.waitForTimeout(2500);
ok((await pb.locator("#filtroAtual").textContent()) === "Principais", "filtro antigo \"Quem eu sigo\" abre como Principais");
const ordem = await pb.locator(".post-card .post-texto").allTextContents();
console.log("    ordem:", ordem.join(" | "));
const i = (t) => ordem.findIndex((x) => x.startsWith(t));
ok(i("Bolo") === 0, "gosto: a publicação do autor/hashtag que ele curte vem primeiro (sem seguir)");
const primeiraAna = Math.min(i("Novidade da Ana"), i("Outra da Ana")), primeiraFabi = Math.min(i("Pintura"), i("Muro"));
ok(primeiraAna >= 0 && primeiraAna < primeiraFabi, "quem ele segue vem antes de quem ele não segue (mesmo engajamento)");
const autores = await pb.locator(".post-card").evaluateAll((cs) => cs.map((c) => c.dataset.autor));
ok(autores.every((a, k) => !k || a !== autores[k - 1]), "nunca duas seguidas do mesmo autor");
await pb.locator("#filtroFeedBtn").tap(); await pb.waitForTimeout(400);
const opcoes = await pb.locator("#opcoesCorpo button").allTextContents();
ok(opcoes.length === 2 && opcoes[0].includes("Principais") && opcoes[1].includes("Amigos"), "filtros: só Principais e Amigos → " + opcoes.map((o) => o.replace(/\s+/g, " ").slice(0, 30)).join(" / "));
await pb.screenshot({ path: "saida/filtros-diario.png" });
await pb.locator("#opcoesCorpo button", { hasText: "Amigos" }).tap(); await pb.waitForTimeout(2500);
ok((await pb.locator("#listaFeed").textContent()).includes("Seus amigos ainda não publicaram"), "Amigos: sem amigos (Ana não segue o Bruno de volta)");
// Interagir conta no gosto: salvar a publicação da Fabi dá pontos para ela e fica no aparelho.
await pb.locator("#filtroFeedBtn").tap(); await pb.locator("#opcoesCorpo button", { hasText: "Principais" }).tap(); await pb.waitForTimeout(2500);
await pb.locator(".post-card", { hasText: "Pintura da sala" }).locator(".acao.salvar").tap(); await pb.waitForTimeout(1200);
const g = await pb.evaluate(() => JSON.parse(localStorage.getItem("hf-gosto") || "{}"));
ok((g.a?.[U.fabi]?.v || 0) >= 3, "salvar soma no gosto do autor → " + JSON.stringify(g.a?.[U.fabi]));
// Explorar: busca no topo, Em alta, Destaques (mosaico) e Sugestões
await pb.locator("#barraRede [data-barra=explorar]").tap(); await pb.waitForTimeout(3000);
ok((await pb.locator("#exploraTags").textContent()).includes("#confeitaria"), "Explorar → Em alta: #confeitaria");
ok(await pb.locator("#exploraGrade .exp-tile").count() >= 3 && await pb.locator("#exploraGrade .exp-tile.grande").count() === 1, "Explorar → Destaques em mosaico (" + await pb.locator("#exploraGrade .exp-tile").count() + " fotos, a 1ª grande)");
const sug = await pb.locator("#exploraSugestoes .exp-pessoa strong").allTextContents();
ok(sug.length > 0 && !sug.some((n) => n.includes("Ana")), "Explorar → Sugestões só de quem ele não segue → " + sug.join(", ").slice(0, 80));
await pb.screenshot({ path: "saida/explorar.png", fullPage: true });
await pb.locator("#buscaPessoas").fill("edu"); await pb.waitForTimeout(1500);
ok(await pb.locator("#exploraConteudo").isHidden() && (await pb.locator("#titPessoas").textContent()) === "Resultados", "buscando: esconde o resto e mostra só os resultados");
// Perfil da Ana: anel do Flash em volta da foto; tocar abre o flash.
await pb.goto(new URL(`usuarios.html?perfil=${U.ana}`, pb.url()).href);
await pb.waitForSelector("#ppCabecalho .pf-anel.com-flash", { timeout: 20000 }).catch(() => {});
ok(await pb.locator("#ppCabecalho .pf-anel.com-flash").count() === 1, "perfil da Ana: anel do Flash na foto");
await pb.screenshot({ path: "saida/perfil-anel-flash.png" });
await pb.locator("#ppCabecalho .pf-anel.com-flash .avatar").tap();
await pb.waitForSelector(".story-visor", { timeout: 5000 }).catch(() => {});
ok(await pb.locator(".story-visor .story-chip").count() === 1, "tocar na foto abre o flash");
await B.browser.close();
process.exit(0);
