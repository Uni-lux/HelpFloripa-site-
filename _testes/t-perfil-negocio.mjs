// Perfis de negócio: link curto (helpfloripa.com.br/@nome/tipo → 404.html → link.html → perfil do negócio), folha
// "Link e QR Code" em Meus negócios (link, copiar, QR e arte para imprimir), tempo de resposta (selo "Responde rápido"
// no cartão e "Responde rápido · ~25 min" no perfil) e avaliação pedida ao concluir o orçamento pelo chat.
// Uso: node seed.mjs && node t-perfil-negocio.mjs  (o servidor-csp devolve o 404.html para endereço que não existe)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, BASE } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const NEG = `${U.bruno}_servicos`, conv = [U.ana, U.bruno].sort().join("_");
await db.doc(`perfis_publicos/${U.bruno}`).set({ atendimento: { resposta: { media: 25, n: 5 }, ausente: false } }, { merge: true });

const A = await navegador({ mobile: true });
// ---------- 1) link curto ----------
const a = await entrar(A.ctx, "ana", "sobre.html");
await a.goto(BASE + "@brunoreparos/servicos");
await a.waitForURL(/servicos\.html\?negocio=/, { timeout: 20000 }).catch(() => {});
ok(a.url().includes(`servicos.html?negocio=${NEG}`), "/@brunoreparos/servicos abre o perfil de Freelances do Bruno: " + a.url().replace(BASE, ""));
await a.waitForSelector(".vd-cab h3", { timeout: 20000 });
ok((await a.textContent(".vd-cab h3")).includes("Bruno Reparos"), "o perfil do negócio abre direto");
// ---------- 2) tempo de resposta no perfil e no cartão ----------
await a.waitForSelector(".vd-selo-resp", { timeout: 10000 }).catch(() => {});
ok((await a.textContent(".vd-selo-resp").catch(() => "")).includes("Responde rápido · ~25 min") && await a.locator(".vd-selo-resp.rapido").count() === 1, "perfil: Responde rápido · ~25 min");
await a.screenshot({ path: "saida/pn-perfil.png" });
await a.goto(BASE + "@brunoreparos");
await a.waitForURL(/usuarios\.html\?perfil=/, { timeout: 20000 }).catch(() => {});
ok(a.url().includes(`usuarios.html?perfil=${U.bruno}`), "/@brunoreparos abre o perfil da pessoa");
await a.goto(BASE + "@ninguem_aqui/servicos"); await a.waitForSelector("h1", { timeout: 20000 });
ok((await a.textContent("h1")).includes("Perfil não encontrado"), "@ que não existe: Perfil não encontrado");
await a.goto(BASE + "servicos.html"); await a.waitForSelector("#vtGrade .vt-conta", { timeout: 20000 }); await a.waitForTimeout(2000);
ok(await a.locator("#vtGrade .vt-rapido").count() >= 1, "cartão da vitrine com o selo Responde rápido");
await a.locator("#vtGrade .vt-rapido").first().scrollIntoViewIfNeeded(); await a.screenshot({ path: "saida/pn-cartao.png" });

// ---------- 3) orçamento concluído → avaliação pedida ----------
await db.doc(`conversas/${conv}`).set({ contexto: { tipo: "servicos", titulo: "Conserto de chuveiro" }, atualizadoEm: Timestamp.now() }, { merge: true });
const orc = await db.collection(`conversas/${conv}/mensagens`).add({ remetenteId: U.ana, texto: "", tipoArquivo: "cartao", criadoEm: Timestamp.now(),
  cartao: { tipo: "servicos", titulo: "Orçamento · Bruno Reparos", link: `servicos.html?negocio=${NEG}`, solicitacao: { servicos: ["Conserto de chuveiro"], quando: { tipo: "flexivel" }, descricao: "Chuveiro desarmando" } } });
const B = await navegador({ mobile: true });
const b = await entrar(B.ctx, "bruno", `mensagens.html?conversa=${conv}`);
await b.waitForSelector(".orc-bt", { timeout: 20000 }); await b.waitForTimeout(800);
ok((await b.textContent(".orc-bt")).includes("Serviço concluído"), "negócio vê \"Serviço concluído · pedir avaliação\" no orçamento");
await b.locator(".orc-bt").last().scrollIntoViewIfNeeded(); await b.screenshot({ path: "saida/pn-orc.png" });
await b.locator(".orc-bt").last().click(); await b.locator(".hf-confirma .sim").click(); await b.waitForTimeout(3000);
const av = (await db.collection(`conversas/${conv}/mensagens`).where("tipoArquivo", "==", "avaliacao").get()).docs.map((d) => d.data()).filter((x) => x.criadoEm.toMillis() >= Date.now() - 60000);
ok(av.length === 1 && av[0].avaliacao.titulo.includes("Orçamento"), "avaliação pedida na conversa (1 vez)");
ok((await b.textContent(".orc-concluir")).includes("avaliação pedida"), "o cartão mostra: Concluído · avaliação pedida");
await B.browser.close();

// ---------- 4) Meus negócios: link e QR Code ----------
const B2 = await navegador({ mobile: true });
const p = await entrar(B2.ctx, "bruno", "negocios.html");
await p.waitForSelector("#neg-servicos .ng-so-ic", { timeout: 20000 }); await p.waitForTimeout(800);
await p.locator("#neg-servicos .ng-so-ic").click();
await p.waitForSelector(".lq-qr canvas", { timeout: 10000 });
ok((await p.textContent(".lq-link")).includes("/@brunoreparos/servicos"), "folha com o link curto: " + (await p.textContent(".lq-link strong")));
const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 8000 }).catch(() => null), p.locator(".lq-caixa .btn", { hasText: "Baixar" }).click()]);
ok(!!dl && /^qr-servicos-brunoreparos\.png$/.test(dl.suggestedFilename()), "baixar a arte com o QR Code: " + (dl?.suggestedFilename() || "nada"));
await p.screenshot({ path: "saida/pn-qr.png" });
if (dl) await dl.saveAs("saida/pn-qr-arte.png");
await A.browser.close(); await B2.browser.close();
process.exit(process.exitCode || 0);
