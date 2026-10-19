// Explorar (Social etapa 4): busca com abas (Pessoas, Negócios, Hashtags, Publicações) e buscas recentes,
// hashtags subindo, enquetes abertas, negócios da cidade, sugestões com motivo (e dispensar) e filtros dos destaques.
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
let falhas = 0;
const ok = (c, t) => { if (!c) falhas++; console.log(c ? "  ✔" : "  ✘", t); };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const agora = Date.now();
const PX = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";
const post = (id, autor, nome, texto, horas, extra = {}) => db.doc(`diario/${id}`).set({ autorId: U[autor], nome, texto, tags: [], criadoEm: Timestamp.fromMillis(agora - horas * 3600e3), ...extra });
// Ana segue Bruno; Bruno segue Fabi (Fabi = "Seguido por Bruno"); Edu segue Ana ("Segue você").
for (const [a, b] of [["ana", "bruno"], ["bruno", "fabi"], ["edu", "ana"]]) await db.doc(`relacoes/${U[a]}_${U[b]}`).set({ tipo: "seguir", seguidorId: U[a], alvoId: U[b], criadoEm: Timestamp.now() });
for (const [k, m] of [["edu", 1], ["fabi", 2], ["hele", 3], ["gui", 4]]) await db.doc(`perfis_publicos/${U[k]}`).set({ ultimoAcesso: Timestamp.fromMillis(agora - m * 60e3) }, { merge: true });
await post("xFoto1", "edu", "Eduardo Lima", "Bolo de cenoura #confeitaria", 1, { tags: ["confeitaria"], mediaUrl: PX, mediaTipo: "image" });
await post("xFoto2", "fabi", "Fabiana Rocha", "Doces da semana #confeitaria", 2, { tags: ["confeitaria"], mediaUrl: PX, mediaTipo: "image" });
await post("xFoto3", "bruno", "Bruno Reparos", "Reforma do banheiro #reforma", 40, { tags: ["reforma"], mediaUrl: PX, mediaTipo: "image" });
await post("xTexto1", "hele", "Helena Prado", "Alguém indica um bom eletricista no Centro?", 3);
await post("xEnq1", "edu", "Eduardo Lima", "", 1, { enquete: { pergunta: "Qual o melhor doce?", opcoes: ["Brigadeiro", "Beijinho"], fimEm: Timestamp.fromMillis(agora + 5 * 3600e3) } });
await post("xEnq2", "fabi", "Fabiana Rocha", "", 30, { enquete: { pergunta: "Enquete que já acabou", opcoes: ["Sim", "Não"], fimEm: Timestamp.fromMillis(agora - 3600e3) } });

const B = await navegador({ mobile: true });
const p = await entrar(B.ctx, "ana", "feed.html?aba=explorar");
await p.evaluate(() => { localStorage.removeItem("hf-buscas"); localStorage.removeItem("hf-sug-dispensados"); localStorage.removeItem("hf-explorar-filtro"); });
await p.reload(); await p.waitForTimeout(4500);

// Em alta: #confeitaria subindo (2 publicações hoje)
ok(await p.locator("#exploraTags .exp-tag.subindo", { hasText: "#confeitaria" }).count() === 1, "Em alta: #confeitaria marcada como subindo");
// Enquetes abertas: só a que ainda não terminou
const enqs = await p.locator("#exploraEnquetes .exp-enq").allTextContents();
ok(enqs.length === 1 && enqs[0].includes("Qual o melhor doce?") && /Termina em 5 h/.test(enqs[0]) && enqs[0].includes("Brigadeiro"), "Enquetes abertas: só a que está aberta, com prazo e opções → " + enqs.join(" | ").slice(0, 90));
ok((await p.locator("#exploraEnquetes .exp-enq").getAttribute("href")) === "usuarios.html?post=xEnq1", "enquete leva à publicação");
// Negócios da cidade
ok((await p.locator("#titNegocios").textContent()) === "Negócios em Florianópolis", "negócios: título com a cidade dela → " + await p.locator("#titNegocios").textContent());
const negs = await p.locator("#exploraNegocios .exp-neg strong").allTextContents();
ok(negs.length >= 3 && !negs.includes("Edu Pinturas"), "negócios: só os de Florianópolis (sem o de São Paulo) → " + negs.join(", "));
// Sugestões com motivo
const motivo = async (nome) => (await p.locator("#exploraSugestoes .exp-pessoa", { hasText: nome }).locator(".sug-motivo").textContent().catch(() => "")) || "";
ok((await motivo("Eduardo")) === "Segue você", "sugestão: Edu → \"Segue você\"");
ok((await motivo("Fabiana")) === "Seguido por Bruno", "sugestão: Fabi → \"Seguido por Bruno\"");
ok(await p.locator("#exploraSugestoes .exp-pessoa", { hasText: "Eduardo" }).locator("button", { hasText: "Seguir de volta" }).count() === 1, "quem segue você: botão \"Seguir de volta\"");
const ordemSug = await p.locator("#exploraSugestoes .exp-pessoa strong").allTextContents();
ok(ordemSug[0].startsWith("Eduardo") && ordemSug[1].startsWith("Fabiana"), "sugestões: os da rede vêm primeiro → " + ordemSug.join(", "));
await p.locator("#exploraSugestoes .exp-pessoa", { hasText: "Helena" }).locator(".sug-tirar").tap(); await p.waitForTimeout(400);
ok(await p.locator("#exploraSugestoes .exp-pessoa", { hasText: "Helena" }).count() === 0, "dispensar sugestão tira o cartão");
// Destaques: filtros
const filtros = await p.locator("#filtrosDestaque button").allTextContents();
ok(filtros.join(",") === "Tudo,Fotos,Textos", "destaques: filtros só dos tipos que existem → " + filtros.join(","));
await p.screenshot({ path: "saida/explorar-etapa4.png", fullPage: true });
await p.locator("#filtrosDestaque button", { hasText: "Textos" }).tap(); await p.waitForTimeout(300);
const textos = await p.locator("#exploraGrade .exp-tile.texto").allTextContents();
ok(textos.length === 3 && await p.locator("#exploraGrade .exp-tile img").count() === 0 && textos.some((t) => t.includes("eletricista")), "Textos: só cartões de texto (texto e as 2 enquetes) → " + textos.length);
await p.screenshot({ path: "saida/explorar-textos.png", fullPage: true });
await p.locator("#filtrosDestaque button", { hasText: "Fotos" }).tap(); await p.waitForTimeout(300);
ok(await p.locator("#exploraGrade .exp-tile.texto").count() === 0 && await p.locator("#exploraGrade .exp-tile img").count() === 3, "Fotos: só fotos");

// Tocar numa publicação: abre a tela do Explorar (como no Instagram), com a tocada em cima e as parecidas embaixo.
await p.locator("#filtrosDestaque button", { hasText: "Tudo" }).tap(); await p.waitForTimeout(300);
await p.locator("#exploraGrade .exp-tile", { hasText: "eletricista" }).tap();
await p.waitForSelector(".visor-exp .post-card", { timeout: 8000 }); await p.waitForTimeout(800);
ok(p.url().includes("feed.html") && await p.locator(".visor-exp").isVisible(), "tocar na publicação não sai para o perfil: abre a tela da publicação");
ok((await p.locator(".visor-exp .post-card").first().textContent()).includes("eletricista"), "a publicação tocada vem primeiro");
const nCards = await p.locator(".visor-exp .post-card").count();
ok(nCards >= 5, "embaixo vêm mais publicações (" + nCards + " cartões)");
ok(await p.locator(".visor-exp .post-card .enquete, .visor-exp .post-card .enq-opcoes").count() >= 1 && await p.locator(".visor-exp .post-card .post-midia-f").count() >= 1, "tem foto e enquete na mesma rolagem");
await p.screenshot({ path: "saida/explorar-visor.png" });
await p.locator(".visor-exp .ve-rolagem").evaluate((r) => r.scrollTo(0, r.scrollHeight)); await p.waitForTimeout(1500);
ok((await p.locator(".visor-exp .ve-fim").textContent()).includes("Você viu tudo"), "rolando até o fim: carrega o resto e avisa quando acabou");
const ids = await p.locator(".visor-exp .post-card").evaluateAll((cs) => cs.map((c) => c._post?.id));
ok(new Set(ids).size === ids.length, "sem repetir publicação (" + ids.length + ")");
await p.goBack(); await p.waitForTimeout(500);
ok(await p.locator(".visor-exp").count() === 0 && p.url().includes("feed.html") && await p.locator("#painelExplorar").isVisible(), "voltar do celular fecha a tela e fica no Explorar");
await p.locator("#exploraGrade .exp-tile").first().tap(); await p.waitForSelector(".visor-exp .post-card", { timeout: 8000 });
await p.locator(".visor-exp .ve-topo .icone-btn").tap(); await p.waitForTimeout(500);
ok(await p.locator(".visor-exp").count() === 0 && await p.locator("#painelExplorar").isVisible(), "seta de voltar fecha a tela");

// Busca: abas e resultados
await p.locator("#buscaPessoas").fill("faxina"); await p.waitForTimeout(1800);
ok(await p.locator("#abasBusca").isVisible() && await p.locator("#exploraConteudo").isHidden(), "buscando: abas aparecem e o resto some");
ok((await p.locator("#listaPessoas .linha-neg").first().textContent()).includes("Fabi Faxina"), "busca \"faxina\" acha o negócio Fabi Faxina");
ok((await p.locator("#listaPessoas .linha-neg").first().getAttribute("href")) === `servicos.html?negocio=${U.fabi}_servicos`, "negócio leva à vitrine");
await p.locator("#buscaPessoas").press("Enter"); await p.waitForTimeout(300);
await p.locator("#buscaPessoas").fill("bolo"); await p.waitForTimeout(1800);
ok(await p.locator("#listaPessoas .exp-tile").count() === 1, "busca \"bolo\" acha a publicação pela legenda");
await p.locator("#abasBusca button", { hasText: "Pessoas" }).tap(); await p.waitForTimeout(200);
ok((await p.locator("#listaPessoas").textContent()).includes("Nada nesta aba"), "aba Pessoas sem resultado avisa");
await p.locator("#buscaPessoas").fill("#conf"); await p.waitForTimeout(1800);
ok((await p.locator("#abasBusca button[aria-selected=true]").textContent()).startsWith("Hashtags") && (await p.locator("#listaPessoas .linha-tag").first().textContent()).includes("#confeitaria"), "\"#conf\" abre na aba Hashtags com #confeitaria em primeiro");
await p.locator("#buscaPessoas").fill("#confeitaria"); await p.waitForTimeout(2200);
ok((await p.locator("#listaPessoas .linha-tag").first().textContent()).includes("2 publicações"), "hashtag exata conta no servidor → " + (await p.locator("#listaPessoas .linha-tag").first().textContent()));
await p.locator("#buscaPessoas").fill("edu"); await p.waitForTimeout(1800);
ok((await p.locator("#listaPessoas .linha:not(.linha-neg)").first().textContent()).includes("Eduardo"), "busca \"edu\": pessoa Eduardo");
await p.screenshot({ path: "saida/explorar-busca.png", fullPage: true });
// Buscas recentes
await p.locator("#buscaPessoas").fill(""); await p.locator("#buscaPessoas").focus(); await p.waitForTimeout(500);
const rec = await p.locator("#buscaRecentes .br-usar").allTextContents();
ok(await p.locator("#buscaRecentes").isVisible() && rec[0] === "faxina", "buscas recentes ao tocar na busca vazia → " + rec.join(", "));
await p.screenshot({ path: "saida/explorar-recentes.png" });
await p.locator("#buscaRecentes .br-tirar").first().tap(); await p.waitForTimeout(300);
ok(await p.locator("#buscaRecentes .br-usar", { hasText: "faxina" }).count() === 0 && (await p.evaluate(() => localStorage.getItem("hf-buscas"))) === "[]", "X tira a busca da lista (e do aparelho)");
// Dispensar vale depois de recarregar
await p.reload(); await p.waitForTimeout(4500);
ok(await p.locator("#exploraSugestoes .exp-pessoa", { hasText: "Helena" }).count() === 0, "sugestão dispensada continua fora depois de recarregar");

// Tema claro também
await p.evaluate(() => { document.documentElement.dataset.theme = "light"; });
await p.screenshot({ path: "saida/explorar-claro.png", fullPage: true });
const erros = [];
p.on("pageerror", (e) => erros.push(e.message));
await p.reload(); await p.waitForTimeout(3000);
ok(!erros.length, "sem erro de JavaScript na página " + erros.join(" | "));
await B.browser.close();
console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
