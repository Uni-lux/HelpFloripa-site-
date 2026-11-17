// Duo no perfil (14/11/2026): gaveta com a prévia do perfil saindo da rosinha (padrão), bolinha, só a rosinha e nada, com
// "tocar abre o perfil"; a escolha fica no Social com a prévia de cada modelo. Social em radar futurista (sem o coração).
// Uso: node seed.mjs | tail -1 > saida/seed-ids.json && FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 node dados-perfil.mjs && FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 node t-duo-gaveta.mjs
import { navegador, entrar, BASE } from "./nav.mjs";
import { readFileSync } from "node:fs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const ids = JSON.parse(readFileSync("saida/seed-ids.json", "utf8"));
initializeApp({ projectId: "demo-hf" });
const db = getFirestore();
await db.doc(`usuarios/${ids.ana}`).set({ duoCapa: null }, { merge: true });
await db.doc(`perfis_publicos/${ids.ana}`).set({ duoCapa: null }, { merge: true });
const { Timestamp } = await import("firebase-admin/firestore");
const fotoTeste = (cor) => "data:image/svg+xml;base64," + Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="${cor}"/><circle cx="300" cy="300" r="160" fill="#fff" opacity=".4"/></svg>`).toString("base64");
for (const [i, cor] of ["#7a1428", "#0b7cb3", "#c9a45c"].entries())
  await db.doc(`diario/duo_foto_${i}`).set({ autorId: ids.bruno, nome: "Bruno Reparos", texto: "Foto do Bruno #ponte #floripa #sol", tags: ["ponte", "floripa", "sol"], mediaUrl: fotoTeste(cor), mediaTipo: "imagem", criadoEm: Timestamp.fromMillis(Date.now() - (i + 1) * 3600e3) });
const erros = [];
const A = await navegador({ mobile: true });
const p = await entrar(A.ctx, "ana", "usuarios.html");
p.on("pageerror", (e) => erros.push(e.message));
const abrirRosa = async () => {
  await p.waitForSelector("#meuPerfil .pf-rosa", { timeout: 25000 }); await p.waitForTimeout(1200);
  await p.locator("#meuPerfil .pf-rosa").tap(); await p.waitForTimeout(800);
};
// 1) padrão = cartão do duo (16/11/2026; antes a gaveta saía por cima dos números)
await abrirRosa();
await p.waitForSelector(".dp.aberta", { timeout: 8000 }).catch(() => {});
ok(await p.locator(".dp-fundo .dp").count() === 1, "padrão: tocar na rosinha abre a prévia do duo (gavetinha)");
ok((await p.locator(".dp-nome").textContent()).includes("Bruno") && (await p.locator(".dp-rot").textContent()).includes("Akai Ito"), "prévia mostra o nome do duo e o Akai Ito");
ok(await p.locator(".dp-acoes").count() === 0 && await p.locator(".dp-av.dp-toca").count() === 1, "prévia sem botões: foto abre o perfil");
await p.screenshot({ path: "saida/duo-gaveta.png" });
await p.keyboard.press("Escape"); await p.waitForTimeout(500);
ok(await p.locator(".dc-fundo").count() === 0, "Esc fecha a prévia");
await p.locator("#meuPerfil .pf-rosa").tap(); await p.waitForSelector(".dp.aberta");
await p.locator(".dp-av").tap();
await p.waitForSelector("#folhaPerfil.aberta", { timeout: 10000 }).catch(() => {});
ok((await p.locator("#ppCabecalho .pf-nome").textContent()).includes("Bruno"), "Ver perfil abre o perfil do duo");

// 2) Social: radar e os modelos
await p.goto(BASE + "social.html#duoModos"); await p.waitForSelector("#dmGrade .dm-op", { timeout: 25000 }); await p.waitForTimeout(2500);
ok(await p.locator(".folha.aberta #duoModos").count() === 1 && await p.locator(".folha-fundo.empilhada #dmGrade").count() === 1, "social.html#duoModos abre as Configurações já na Rosinha no perfil");
await p.locator(".folha-fundo.empilhada [data-fechar]").click(); await p.waitForTimeout(300);
await p.locator(".folha.aberta [data-fechar]").click(); await p.waitForTimeout(500);
ok(await p.locator("#hero .hs-stats .hs-stat").count() === 3 && await p.locator(".ceu, .orbita, #radar").count() === 0, "Social no modelo novo: cartão do perfil com 3 números (sem radar, gótico ou coração)");
await p.waitForFunction(() => document.getElementById("stSeg").textContent !== "–", null, { timeout: 8000 }).catch(() => {});
ok(/^\d+$/.test(await p.locator("#stCon").textContent()) && /^\d+$/.test(await p.locator("#stSeg").textContent()) && /^\d+$/.test(await p.locator("#stMom").textContent()), "números reais: momentos, conexões e seguidores");
ok(await p.locator("#destaques .dest:not(.novo)").count() >= 2 && await p.locator("#destaques .dest.novo").count() === 1, "conexões em destaque (+ Adicionar)");
ok(await p.locator("#rede .pessoa").count() >= 3 && await p.locator("#rede .pessoa .pe-pes button.msg").count() >= 3, "cartões das conexões com Ver perfil e Mensagem");
const tema = await p.evaluate(() => ({ fonte: getComputedStyle(document.querySelector("#heroNome")).fontFamily, ceu: !!document.querySelector(".ceu") }));
ok(/Manrope/.test(tema.fonte), "letra dos títulos (" + tema.fonte.slice(0, 30) + ")");
await p.locator("#abaConexoes").tap(); await p.waitForTimeout(300);
await p.locator("#filtros button[data-cat=amizade]").tap(); await p.waitForTimeout(400);
ok(await p.locator("#filtros button.on[data-cat=amizade]").count() === 1 && await p.locator("#rede .pessoa").count() === 1 && await p.locator("#rede .pessoa[data-cat=amizade]").count() === 1, "filtro Amizades mostra só o grupo");
await p.locator("#filtros button[data-cat=amizade]").tap(); await p.waitForTimeout(300);
await p.locator("#rede .pessoa .pe-pes button.msg").first().tap();
ok(await p.waitForSelector(".hfc.aberto, .hfc-fundo.on", { timeout: 10000 }).then(() => true).catch(() => false), "Mensagem abre a conversa na gaveta");
await p.keyboard.press("Escape"); await p.waitForTimeout(500);
const larguraOk = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
ok(larguraOk, "Social sem rolagem para o lado");
await p.locator("#conteudo").screenshot({ path: "saida/social-tema.png" });
await p.locator("#btnConfig").tap(); await p.waitForTimeout(400); await p.locator("#duoModos").tap(); await p.waitForSelector("#dmGrade .dm-op", { timeout: 10000 });
ok(await p.locator("#dmGrade .dm-op").count() === 4 && await p.locator("#dmGrade .dm-op.on[data-estilo=gaveta]").count() === 1, "4 modelos com prévia, gaveta marcada");
ok(await p.locator("#dmGrade .dm-op[data-estilo=gaveta] .dm-gav").count() === 1 && await p.locator("#dmGrade .dm-op[data-estilo=bolinha] .dm-bol").count() === 1, "prévias da gaveta e da bolinha");
await p.locator(".folha-fundo.empilhada .folha").screenshot({ path: "saida/duo-modelos.png" });
await p.locator("#dmGrade .dm-op[data-estilo=bolinha]").tap(); await p.waitForTimeout(1500);
ok((await db.doc(`usuarios/${ids.ana}`).get()).data().duoCapa === "clicavel", "escolher Bolinha grava clicavel");
await p.locator("#dmClique").tap(); await p.waitForTimeout(1500);
ok((await db.doc(`usuarios/${ids.ana}`).get()).data().duoCapa === "foto" && (await db.doc(`perfis_publicos/${ids.ana}`).get()).data().duoCapa === "foto", "desligar o toque: bolinha só para ver (foto)");
await p.goto(BASE + "usuarios.html"); await abrirRosa();
ok(await p.locator("#meuPerfil .pf-duo-bolha.aberta.so-ver").count() === 1 && await p.locator("#meuPerfil .pf-duo-gaveta").count() === 0, "perfil: bolinha só para ver");
// gaveta só para ver
await p.goto(BASE + "social.html#duoModos"); await p.waitForSelector("#dmGrade .dm-op", { timeout: 25000 }); await p.waitForTimeout(1200);
await p.locator("#dmGrade .dm-op[data-estilo=gaveta]").tap(); await p.waitForTimeout(1500);
ok((await db.doc(`usuarios/${ids.ana}`).get()).data().duoCapa === "gaveta-fixa", "gaveta mantém o toque desligado (gaveta-fixa)");
await p.locator("#dmGrade .dm-op[data-estilo=rosa]").tap(); await p.waitForTimeout(1500);
ok(await p.locator("#dmCliqueIn").isDisabled(), "Só a rosinha: a chave do toque fica desligada");
await p.locator("#dmGrade .dm-op[data-estilo=ocultar]").tap(); await p.waitForTimeout(1500);
await p.goto(BASE + "usuarios.html"); await p.waitForSelector("#meuPerfil .pf-nome", { timeout: 25000 }); await p.waitForTimeout(2500);
ok(await p.locator("#meuPerfil .pf-rosa").count() === 0, "Nada: sem rosinha no perfil");
await p.goto(BASE + "social.html#duoModos"); await p.waitForSelector("#dmGrade .dm-op", { timeout: 25000 }); await p.waitForTimeout(1200);
await p.locator("#dmGrade .dm-op[data-estilo=gaveta]").tap(); await p.waitForTimeout(1500);
ok((await db.doc(`usuarios/${ids.ana}`).get()).data().duoCapa === "gaveta", "voltar para a gaveta: toque ligado de novo");
// Configurações
await p.goto(BASE + "configuracoes.html"); await p.waitForTimeout(3000);
ok(await p.locator("#cfgDuoCapa button").count() === 4 && await p.locator("#cfgDuoCapa button.on[data-valor=gaveta]").count() === 1 && await p.locator("#cfgDuoClique").isChecked(), "Configurações: os 4 modelos e o toque");
// #hashtags num símbolo só
await p.goto(BASE + "feed.html"); await p.waitForSelector(".hf-tags-btn", { timeout: 25000 }).catch(() => {}); await p.waitForTimeout(4000);
const tg = p.locator(".post-tags.hf-tags").filter({ has: p.locator(".hf-tags-btn") }).first();
ok(await tg.locator(".hf-tags-btn").count() === 1 && !(await tg.locator(".hf-tags-pop").isVisible()), "hashtags guardadas no símbolo \"#\" com o número (" + (await tg.locator(".hf-tags-n").textContent().catch(() => "")) + ")");
await tg.locator(".hf-tags-btn").scrollIntoViewIfNeeded(); await tg.locator(".hf-tags-btn").tap(); await p.waitForTimeout(400);
ok(await tg.locator(".hf-tags-pop").isVisible() && await tg.locator(".hf-tags-pop .tag-chip").count() >= 1, "tocar no # mostra as hashtags");
await tg.screenshot({ path: "saida/hashtags-abertas.png" });
await tg.locator(".hf-tags-btn").tap(); await p.waitForTimeout(300);
ok(!(await tg.locator(".hf-tags-pop").isVisible()), "tocar de novo fecha");
// tema escuro, computador
const B = await navegador({ mobile: false });
await B.ctx.addInitScript(() => localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" })));
const q = await entrar(B.ctx, "ana", "social.html");
await q.waitForSelector("#duo:not([hidden]) .ak-linha", { timeout: 25000 }); await q.waitForTimeout(2500);
await q.screenshot({ path: "saida/social-escuro-pc.png", fullPage: true });
await q.locator("#btnConfig").click(); await q.waitForTimeout(700); await q.screenshot({ path: "saida/social-config-escuro.png" }); await q.keyboard.press("Escape"); await q.waitForTimeout(300);
await q.screenshot({ path: "saida/social-radar-pc.png", fullPage: true });
await q.goto(BASE + "usuarios.html"); await q.waitForSelector("#meuPerfil .pf-rosa", { timeout: 25000 }); await q.waitForTimeout(1200);
await q.locator("#meuPerfil .pf-rosa").click(); await q.waitForTimeout(800);
await q.screenshot({ path: "saida/duo-gaveta-escuro.png" });
ok(await q.locator(".dp-fundo .dp").count() === 1, "computador/escuro: prévia do duo abre");
ok(!erros.length, "sem erro na página" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close(); await B.browser.close();
