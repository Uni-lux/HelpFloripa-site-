// Flash (02/11/2026): enquete e caixa de perguntas editadas na própria figurinha (acima do teclado), atalho de rascunho
// que pergunta antes, "Rascunhos · N" que acompanha quando apaga, e voltar ao flash depois de abrir o perfil de quem foi
// mencionado (lista Mencionados no Diário e na página de perfis).
// Uso: node t-flash-editor-vivo.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, garantirImagem } from "./nav.mjs";
import { readFileSync } from "node:fs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const PX = "data:image/png;base64," + readFileSync(garantirImagem("saida/foto-ev.png", 900, 1600)).toString("base64");
for (const u of [U.ana, U.bruno]) for (const s of (await db.collection("stories").where("autorId", "==", u).get()).docs) await s.ref.delete();
const f1 = (await db.collection("stories").add({ autorId: U.bruno, nome: "Bruno Reparos", tipo: "imagem", midia: PX, mencoes: [U.ana, U.dani], criadoEm: Timestamp.now() })).id;
await db.doc(`relacoes/${U.ana}_${U.bruno}`).set({ tipo: "seguir", seguidorId: U.ana, alvoId: U.bruno, criadoEm: Timestamp.now() });

const { browser, ctx } = await navegador({ mobile: true });
const p = await entrar(ctx, "ana", "feed.html");
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForTimeout(3500);
const abrirCriador = async () => { await p.locator(".story-circ").first().locator(".mais").tap(); await p.waitForSelector(".flash-criar", { timeout: 8000 }); await p.waitForTimeout(600); };
const figurinha = async (nome) => { await p.locator(".flash-ferr-btn[aria-label^='Figurinhas']").tap(); await p.waitForTimeout(300); await p.locator(".fig-pilula", { hasText: nome }).tap(); await p.waitForTimeout(400); };


// ---------- 1) enquete na própria figurinha ----------
await abrirCriador();
await p.locator(".flash-modos button", { hasText: "Texto" }).tap(); await p.waitForTimeout(300);
await p.keyboard.type("Oi"); await p.locator(".flash-texto").blur();
await figurinha("Enquete");
ok(await p.locator(".flash-fig-viva .fv-card .fv-faixa .fv-perg").count() === 1, "enquete abre o cartão editável (pergunta na faixa colorida)");
ok(await p.evaluate(() => document.activeElement?.classList.contains("fv-perg")), "a pergunta já vem com o cursor");
await p.keyboard.type("Pizza ou lanche?");
// teclado aberto: a tela encolhe (como no celular) e o cartão continua inteiro à vista
await p.setViewportSize({ width: 390, height: 420 }); await p.waitForTimeout(500);
const caixa = await p.locator(".flash-fig-viva .fv-card").boundingBox();
ok(caixa && caixa.y >= 0 && caixa.y + caixa.height <= 420 + 1, `com o teclado aberto o cartão fica à vista (${Math.round(caixa?.y)}–${Math.round((caixa?.y || 0) + (caixa?.height || 0))} de 420)`);
await p.screenshot({ path: "saida/ev-enquete-teclado.png" });
await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400);
await p.locator(".fv-op input").nth(0).fill("Pizza");
await p.locator(".fv-op input").nth(1).fill("Lanche");
await p.locator(".fv-nova").type("Os dois");
ok(await p.locator(".fv-op input").count() === 3 && await p.evaluate(() => document.activeElement?.value) === "Os dois", "escrever na opção tracejada cria a 3ª (cursor continua nela)");
const cor0 = await p.locator(".fv-card").getAttribute("class");
await p.locator(".fv-cor").tap(); await p.waitForTimeout(150);
const cor1 = await p.locator(".fv-card").getAttribute("class");
ok(cor0 !== cor1 && /tema-escuro/.test(cor1), `o botão colorido troca a cor na hora (${cor1})`);
await p.locator(".fv-cor").tap(); await p.waitForTimeout(150); // azul
await p.screenshot({ path: "saida/ev-enquete.png" });
await p.locator(".fv-chip", { hasText: "Termina em" }).tap(); await p.waitForTimeout(400);
await p.locator("#folhaOpcoes.aberta button", { hasText: "6 h" }).tap(); await p.waitForTimeout(400);
ok((await p.locator(".fv-chip", { hasText: "Termina em" }).textContent()).includes("6 h"), "duração escolhida na pílula");
await p.locator(".flash-fig-viva .fe-pronto").tap(); await p.waitForTimeout(500);
const enq = await p.evaluate(() => { const e = document.querySelector(".flash-camada .fe-enq"); return e ? e.className + " | " + e.textContent : ""; });
ok(/tema-azul/.test(enq) && enq.includes("Pizza ou lanche?") && enq.includes("Os dois"), `enquete no cartão com a cor e as 3 opções (${enq.slice(0, 80)})`);

// ---------- 2) caixa de perguntas ----------
await figurinha("Perguntas");
ok(await p.locator(".flash-fig-viva .fv-card.fe-cx .fv-campo").count() === 1, "caixa de perguntas abre no próprio cartão");
await p.keyboard.type("Me pergunte sobre o site");
await p.locator(".fv-chip", { hasText: "Com nome" }).tap(); await p.waitForTimeout(200);
ok(await p.locator(".fv-chip.on", { hasText: "Anônima" }).count() === 1, "pílula Anônima liga");
await p.screenshot({ path: "saida/ev-caixa.png" });
await p.locator(".flash-fig-viva .fe-pronto").tap(); await p.waitForTimeout(500);
ok((await p.locator(".flash-camada .fe-cx").textContent().catch(() => "")).includes("Me pergunte sobre o site"), "caixa de perguntas no cartão");

// ---------- 3) atalho do rascunho pergunta antes ----------
await p.locator(".flash-salvar-rasc").tap(); await p.waitForTimeout(500);
ok(await p.locator("#folhaOpcoes.aberta", { hasText: "Quer salvar como rascunho?" }).count() === 1, "o atalho pergunta “Quer salvar como rascunho?” (não salva direto)");
const antes = await p.evaluate(() => new Promise((ok) => { const r = indexedDB.open("hf-flash-" + window.firebaseAuth?.currentUser?.uid); r.onsuccess = () => { try { const q = r.result.transaction("rascunhos").objectStore("rascunhos").count(); q.onsuccess = () => ok(q.result); } catch { ok(0); } }; r.onerror = () => ok(0); }));
ok(antes === 0, `ainda nada salvo enquanto pergunta (${antes})`);
await p.locator("#folhaOpcoes.aberta button", { hasText: "Salvar e sair" }).tap(); await p.waitForTimeout(1200);
ok(await p.locator(".flash-criar").count() === 0, "Salvar e sair guarda e fecha");

// ---------- 4) apagar o rascunho atualiza o "Rascunhos · N" ----------
await abrirCriador();
await p.locator(".flash-modos button", { hasText: "Texto" }).tap(); await p.waitForTimeout(300); await p.locator(".flash-texto").blur();
ok((await p.locator(".flash-rasc").textContent()).includes("1") && !(await p.locator(".flash-rasc").isHidden()), "pílula “Rascunhos · 1”");
await p.locator(".flash-rasc").tap(); await p.waitForTimeout(800);
await p.locator("#folhaLista .rasc-apagar").first().tap(); await p.waitForTimeout(400);
await p.locator(".hf-confirma-fundo button", { hasText: "Apagar" }).last().tap(); await p.waitForTimeout(900);
await p.locator("#folhaLista.aberta [data-fechar]").first().tap().catch(() => {}); await p.waitForTimeout(500);
ok(await p.locator(".flash-rasc").isHidden(), "depois de apagar, a pílula some (antes ficava “Rascunhos · 1”)");
await p.keyboard.press("Escape"); await p.waitForTimeout(500);
await p.locator("#folhaOpcoes.aberta button", { hasText: "Descartar" }).tap().catch(() => {}); await p.waitForTimeout(500);

// ---------- 5) Mencionados → perfil → voltar volta ao flash ----------
await p.goto(p.url().split("?")[0].replace(/[^/]*$/, "") + `feed.html?flash=${f1}`); await p.waitForSelector(".story-visor", { timeout: 10000 }); await p.waitForTimeout(800);
await p.locator(".story-mencoes").tap(); await p.waitForTimeout(1200);
await Promise.all([p.waitForURL(/usuarios\.html\?perfil=/, { timeout: 10000 }).catch(() => {}), p.locator("#folhaLista.aberta .linha").filter({ hasText: "Daniel" }).first().tap()]);
await p.waitForTimeout(1500);
ok(/usuarios\.html\?perfil=/.test(p.url()) || /usuarios\.html/.test(p.url()), "tocar em quem foi mencionado abre o perfil");
await p.goBack(); await p.waitForTimeout(4000);
ok(await p.locator(".story-visor").count() === 1, "voltar do perfil traz o flash de volta");
await p.goBack(); await p.waitForTimeout(800);
ok(await p.locator(".story-visor").count() === 0 && /feed\.html/.test(p.url()), `um voltar a mais fecha o flash e continua no Diário (${p.url().split("/").pop()})`);

// ---------- 6) na página de perfis: o perfil abre ali, voltar reabre o flash ----------
await p.goto(p.url().replace(/feed\.html.*$/, `usuarios.html?perfil=${U.bruno}`)); await p.waitForTimeout(4500);
await p.evaluate(() => document.querySelector("#folhaPerfil .com-flash [aria-label='Ver o flash']")?.click()); await p.waitForTimeout(1500);
ok(await p.locator(".story-visor").count() === 1, "flash do Bruno aberto pela foto do perfil");
await p.locator(".story-mencoes").tap(); await p.waitForTimeout(1200);
await p.screenshot({ path: "saida/ev-lista-perfil.png" });
await p.locator("#folhaLista.aberta .linha").filter({ hasText: "Daniel" }).first().tap(); await p.waitForTimeout(2500);
ok(await p.locator(".story-visor").count() === 0 && (await p.locator("#tPerfilPublico").textContent()).includes("Daniel"), "o perfil da Dani abre na mesma página");
await p.goBack(); await p.waitForTimeout(1500);
ok(await p.locator(".story-visor").count() === 1, "voltar fecha o perfil e reabre o flash");
await p.screenshot({ path: "saida/ev-volta-perfil.png" });

ok(!erros.length, "sem erros na página " + erros.join(" | "));
await browser.close();
