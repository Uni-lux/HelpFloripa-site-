// Flash (11/11/2026, prints dele):
// - Mencionar várias pessoas de uma vez: entram na lista "Mencionados" (sem @ na foto); olho cortado = oculta.
// - @ escrito pelo teclado aparece sublinhado (no criador e na foto).
// - Negócios: até 10 por flash (na tela, na lista "Negócios" ou ocultos), gravados em toques ("n|..."); o dono do negócio
//   de outra pessoa recebe o aviso.
// - Quem criou vê as menções ocultas com o olho cortado; quem vê não vê as ocultas.
// - Anti-spam: até 5 hashtags, letras repetidas cortadas.
// - Configurações do Flash: Público padrão; a página Público do flash sem números de alcance e sem "só quem não segue".
// Uso: node t-flash-lote.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, garantirImagem } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
garantirImagem("saida/foto-fl.png", 900, 1600);
for (const u of [U.ana, U.bruno, U.edu]) for (const s of (await db.collection("stories").where("autorId", "==", u).get()).docs) await s.ref.delete();
for (const [a, b] of [[U.ana, U.bruno], [U.bruno, U.ana], [U.ana, U.edu]]) await db.doc(`relacoes/${a}_${b}`).set({ tipo: "seguir", seguidorId: a, alvoId: b, criadoEm: Timestamp.now() });
await db.doc(`usuarios/${U.ana}`).set({ flashConfig: {} }, { merge: true });

const { browser, ctx } = await navegador({ mobile: true });
const p = await entrar(ctx, "ana", "feed.html");
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.setViewportSize({ width: 390, height: 844 });
await p.waitForTimeout(3000);
const toastTxt = () => p.locator(".toast").last().textContent().then((t) => t.replace(/\u00a0/g, " ")).catch(() => "");

// ---------- criador com foto ----------
await p.locator(".story-circ").first().locator(".mais").tap();
await p.waitForSelector(".flash-criar", { timeout: 8000 }); await p.waitForTimeout(600);
const [fc] = await Promise.all([p.waitForEvent("filechooser", { timeout: 8000 }), p.locator(".flash-esc-btn", { hasText: "Galeria" }).click()]);
await fc.setFiles("saida/foto-fl.png");
await p.waitForTimeout(1200);

// ---------- 1) mencionar várias pessoas de uma vez ----------
await p.locator(".flash-arroba").tap(); await p.waitForTimeout(300);
ok(await p.locator(".fm-add", { hasText: "Mencionar pessoas" }).count() === 1, "lista Menções: botão “Mencionar pessoas”");
await p.locator(".fm-add").tap(); await p.waitForTimeout(900);
await p.locator(".fm-escolher .fm-usar", { hasText: "brunoreparos" }).first().tap(); await p.waitForTimeout(200);
await p.locator(".fm-escolher .fe-local").fill("edu"); await p.waitForTimeout(1200);
await p.locator(".fm-escolher .fm-linha", { hasText: "edulima" }).locator(".fa-oculta").tap(); await p.waitForTimeout(300);
ok(await p.locator(".fm-escolher .fm-linha.marcada").count() === 2, "2 pessoas marcadas (a marcada continua à vista com a busca)");
ok((await p.locator(".fm-usar-todos").textContent()).includes("Mencionar 2 pessoas"), "botão “Mencionar 2 pessoas”");
await p.screenshot({ path: "saida/fl-escolher.png" });
await p.locator(".fm-usar-todos").tap(); await p.waitForTimeout(500);
ok(await p.locator(".flash-fig.fig-mencao").count() === 0, "nenhum @ foi para a foto");
ok((await p.locator(".flash-arroba .flash-onde-n").textContent()) === "2", "botão @ mostra 2 menções");
await p.locator(".flash-arroba").tap(); await p.waitForTimeout(800);
ok(await p.locator(".flash-mencoes .figs-sec", { hasText: "Na lista" }).count() === 1 && await p.locator(".flash-mencoes .figs-sec", { hasText: "Ocultas" }).count() === 1, "lista: seções Na lista e Ocultas");
ok(await p.locator(".flash-mencoes .fm-linha.fm-oculta").count() === 1, "a oculta aparece marcada para quem cria");
await p.screenshot({ path: "saida/fl-mencoes.png" });
await p.locator(".flash-mencoes .fe-pronto").tap(); await p.waitForTimeout(200);

// ---------- 2) negócios: 3 de uma vez, um oculto, um na tela ----------
await p.locator(".flash-ferr-btn[aria-label^='Figurinhas']").tap(); await p.waitForTimeout(300);
await p.locator(".fig-pilula", { hasText: "Negócios" }).tap(); await p.waitForTimeout(1500);
ok(await p.locator(".fm-escolher .figs-tit", { hasText: "Marcar negócios" }).count() === 1, "abre “Marcar negócios”");
await p.locator(".fm-escolher .fm-usar", { hasText: "Bruno Reparos" }).tap();
await p.locator(".fm-escolher .fm-usar", { hasText: "Bruno Imóveis" }).tap();
await p.locator(".fm-escolher .fm-linha", { hasText: "Edu Pinturas" }).locator(".fa-oculta").tap(); await p.waitForTimeout(200);
await p.locator(".fm-usar-todos").tap(); await p.waitForTimeout(500);
ok(await p.locator(".flash-mencoes .figs-tit", { hasText: "Links de negócios" }).count() === 1, "volta para “Links de negócios”");
ok((await p.locator(".flash-mencoes .fm-total").textContent()).includes("3 de 10"), "3 de 10 negócios marcados");
await p.locator(".fm-bloco", { hasText: "Bruno Reparos" }).locator(".fm-seg-op", { hasText: "Na tela" }).tap(); await p.waitForTimeout(400);
ok(await p.locator(".flash-txt.flash-link").count() === 1, "Bruno Reparos virou figurinha na foto");
await p.screenshot({ path: "saida/fl-negocios.png" });
await p.locator(".flash-mencoes .fe-pronto").tap(); await p.waitForTimeout(200);

// ---------- 3) anti-spam: 6ª hashtag não entra ----------
for (let i = 0; i < 6; i++) {
  await p.locator(".flash-ferr-btn[aria-label^='Figurinhas']").tap(); await p.waitForTimeout(200);
  await p.locator(".fig-pilula", { hasText: "Hashtag" }).tap(); await p.waitForTimeout(150);
  await p.locator(".fe-local").fill("#tag" + i); await p.locator(".fe-linha-local .fe-pronto").tap(); await p.waitForTimeout(250);
}
ok(await p.locator(".flash-fig.fig-hashtag").count() === 5, `só 5 hashtags (${await p.locator(".flash-fig.fig-hashtag").count()})`);
ok((await toastTxt()).includes("5 hashtags"), "aviso das 5 hashtags");

// ---------- 4) Aa com @ sublinhado e letras repetidas ----------
await p.locator(".flash-ferr-btn.letra, .flash-ferr-btn[aria-label^='Texto']").first().tap(); await p.waitForTimeout(300);
await p.locator(".fe-campo").fill("Valeu @brunoreparos kkkkkkkkkkkk");
await p.locator(".flash-edtxt .fe-pronto").tap(); await p.waitForTimeout(300);
const aa = p.locator(".flash-txt").filter({ has: p.locator(".fe-arroba-u") });
ok(await aa.count() === 1, "@ escrito no texto aparece sublinhado no criador");
ok((await aa.textContent()).includes("kkkkk") && !(await aa.textContent()).includes("kkkkkk"), "letras repetidas cortadas em 5");
await p.screenshot({ path: "saida/fl-cartao.png" });

// ---------- 5) publicar ----------
await p.locator(".flash-publicar").tap();
await p.waitForSelector(".flash-criar", { state: "detached", timeout: 15000 }).catch(() => {});
await p.waitForTimeout(2000);
const novo = (await db.collection("stories").where("autorId", "==", U.ana).get()).docs.map((d) => ({ id: d.id, ...d.data() }))[0] || {};
const neg = (novo.toques || []).filter((t) => t.startsWith("n|"));
ok(neg.length === 3, `3 negócios nos toques (${neg.map((t) => t.split("|").slice(1, 3).join(":")).join(", ")})`);
ok(neg.some((t) => t.startsWith(`n|${U.bruno}_servicos|t|`)) && neg.some((t) => t.startsWith(`n|${U.bruno}_imoveis|l|`)) && neg.some((t) => t.startsWith(`n|${U.edu}_servicos|o|`)), "na tela, na lista e oculto gravados certo");
ok(novo.link?.negocioId === `${U.bruno}_servicos`, "o da tela também em “link” (versões antigas)");
ok(JSON.stringify([...(novo.mencoes || [])].sort()) === JSON.stringify([U.bruno, U.edu].sort()) && JSON.stringify(novo.mencoesOcultas) === JSON.stringify([U.edu]), "menções: Bruno na lista, Edu oculto");
ok((novo.toques || []).filter((t) => t.startsWith("h|")).length === 5, "5 hashtags tocáveis");
ok((novo.toques || []).some((t) => t.startsWith(`m|${U.bruno}|`)), "@ escrito no Aa virou área tocável");
await p.waitForTimeout(1500);
const cartoes = [];
for (const c of (await db.collection("conversas").where("participantes", "array-contains", U.ana).get()).docs) {
  for (const m of (await c.ref.collection("mensagens").get()).docs) if (m.data().cartao?.acao === "negocio") cartoes.push(c.data().participantes.find((x) => x !== U.ana));
}
ok(cartoes.includes(U.bruno) && cartoes.includes(U.edu) && cartoes.length === 2, `donos dos negócios avisados uma vez cada (${cartoes.length})`);

// ---------- 6) a Ana vê o próprio flash: ocultos com olho cortado ----------
await p.goto(p.url().replace(/feed\.html.*/, `feed.html?flash=${novo.id}`));
await p.waitForSelector(".story-visor", { timeout: 12000 }).catch(() => {}); await p.waitForTimeout(1500);
ok(await p.locator(".story-link:not(.story-post)").count() === 1, "visor: 1 link na tela");
await p.locator(".story-mencoes:not(.story-negs)").tap(); await p.waitForTimeout(1200);
ok(await p.locator("#folhaLista .linha.linha-oculta").count() === 1, "autora vê o Edu oculto com o olho cortado");
await p.screenshot({ path: "saida/fl-visor-mencionados.png" });
await p.locator("#folhaLista [data-fechar]").first().click(); await p.waitForTimeout(500);
await p.locator(".story-negs").tap(); await p.waitForTimeout(1200);
ok(await p.locator("#folhaLista .linha-neg-flash").count() === 3 && await p.locator("#folhaLista .linha-neg-flash.oculto").count() === 1, "autora vê 3 negócios (1 oculto)");
await p.screenshot({ path: "saida/fl-visor-negocios.png" });
await p.locator("#folhaLista [data-fechar]").first().click(); await p.waitForTimeout(400);

// ---------- 7) Bruno vê: sem os ocultos ----------
const nb = await navegador({ mobile: true });
const b = await entrar(nb.ctx, "bruno", `feed.html?flash=${novo.id}`);
await b.setViewportSize({ width: 390, height: 844 });
await b.waitForSelector(".story-visor", { timeout: 12000 }).catch(() => {}); await b.waitForTimeout(1500);
ok((await b.locator(".story-negs").textContent()).includes("2 negócios"), "quem vê: chip “2 negócios” (sem o oculto)");
await b.locator(".story-mencoes:not(.story-negs)").tap(); await b.waitForTimeout(1200);
ok(await b.locator("#folhaLista .linha").count() === 1 && await b.locator("#folhaLista .linha-oculta").count() === 0, "quem vê: só o Bruno em Mencionados");
await nb.browser.close();

// ---------- 8) Configurações: público padrão sem números ----------
await p.goto(p.url().replace(/feed\.html.*/, "feed.html")); await p.waitForTimeout(2500);
await p.locator(".story-circ").first().locator(".mais").tap();
await p.waitForSelector(".flash-criar", { timeout: 8000 }); await p.waitForTimeout(600);
await p.locator(".flash-ferr-btn[aria-label='Configurações do Flash']").tap(); await p.waitForTimeout(800);
const linhaPub = p.locator("#folhaLista .cfg2-linha", { hasText: "Público padrão" });
ok(await linhaPub.count() === 1, "Configurações do Flash: “Público padrão”");
await linhaPub.tap(); await p.waitForTimeout(800);
ok(await p.locator(".pa-pagina").count() === 1, "abre a página Público");
ok(await p.locator(".pa-alc-n, .pa-alc-barra").count() === 0, "sem números de alcance nem barra");
ok(await p.locator(".pa-flash-lista li").count() >= 2, "resumo do que vale, sem contas");
await p.locator(".pa-opcao", { hasText: "Personalizado" }).tap(); await p.waitForTimeout(300);
ok(await p.locator(".pa-opcao", { hasText: "Só quem ainda não segue" }).count() === 0, "sem “só quem ainda não segue” no flash");
await p.locator(".pa-aba", { hasText: "Estados" }).tap(); await p.waitForTimeout(200);
await p.locator(".pa-ufs .pa-chip", { hasText: /^SC$/ }).tap(); await p.waitForTimeout(200);
await p.screenshot({ path: "saida/fl-publico.png" });
await p.locator(".pa-ok").tap(); await p.waitForTimeout(1500);
const cfg = (await db.doc(`usuarios/${U.ana}`).get()).data().flashConfig || {};
ok(JSON.stringify(cfg.alvo?.ufs) === '["SC"]', `público padrão gravado (${JSON.stringify(cfg.alvo)})`);
await p.goto(p.url().replace(/feed\.html.*/, "feed.html")); await p.waitForTimeout(2500);
await p.locator(".story-circ").first().locator(".mais").tap();
await p.waitForSelector(".flash-criar", { timeout: 8000 }); await p.waitForTimeout(600);
ok(await p.evaluate(() => document.querySelector(".flash-alvo")?.classList.contains("on")), "flash novo já começa com o público padrão");

ok(!erros.length, "sem erros na página" + (erros.length ? ": " + erros.join(" | ") : ""));
await browser.close();
