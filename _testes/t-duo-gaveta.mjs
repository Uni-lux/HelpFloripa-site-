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
const erros = [];
const A = await navegador({ mobile: true });
const p = await entrar(A.ctx, "ana", "usuarios.html");
p.on("pageerror", (e) => erros.push(e.message));
const abrirRosa = async () => {
  await p.waitForSelector("#meuPerfil .pf-rosa", { timeout: 25000 }); await p.waitForTimeout(1200);
  await p.locator("#meuPerfil .pf-rosa").tap(); await p.waitForTimeout(800);
};
// 1) padrão = gaveta que abre o perfil
await abrirRosa();
const g = p.locator("#meuPerfil .pf-duo-gaveta.aberta");
ok(await g.count() === 1, "padrão: tocar na rosinha abre a gaveta");
ok((await g.locator(".dg-nome").textContent()).includes("Bruno") && (await g.locator(".dg-rot").textContent()).includes("Akai Ito"), "gaveta mostra o nome do duo e o Akai Ito");
const caixa = await g.boundingBox(), rosa = await p.locator("#meuPerfil .pf-rosa").boundingBox(), larg = await p.evaluate(() => innerWidth);
ok(caixa.x <= rosa.x + rosa.width && caixa.x + caixa.width <= larg && caixa.width > 180, "gaveta sai da rosinha e cabe na tela (" + Math.round(caixa.x) + "–" + Math.round(caixa.x + caixa.width) + " de " + larg + ")");
ok(await g.locator(".dg-ir").count() === 1, "gaveta com \"Ver perfil\"");
await p.screenshot({ path: "saida/duo-gaveta.png" });
await p.locator("#meuPerfil .pf-nome").tap(); await p.waitForTimeout(500);
ok(await p.locator("#meuPerfil .pf-duo-gaveta.aberta").count() === 0, "tocar fora fecha a gaveta");
await p.locator("#meuPerfil .pf-rosa").tap(); await p.waitForTimeout(700);
await p.locator("#meuPerfil .pf-duo-gaveta .dg-corpo").tap();
await p.waitForSelector("#folhaPerfil.aberta", { timeout: 10000 }).catch(() => {});
ok((await p.locator("#ppCabecalho .pf-nome").textContent()).includes("Bruno"), "tocar na gaveta abre o perfil do duo");

// 2) Social: radar e os modelos
await p.goto(BASE + "social.html#duoModos"); await p.waitForSelector("#dmGrade .dm-op", { timeout: 25000 }); await p.waitForTimeout(2500);
ok(await p.locator(".orbita .coracao").count() === 0 && await p.locator("#radar").count() === 1 && await p.locator(".orbita .hud-b").count() === 3, "Social: radar com anéis de HUD (sem o coração)");
ok(await p.locator(".orbita .astro:not(.centro)").count() >= 2 && await p.locator(".orbita .astro.duo .rosinha").count() === 1, "conexões no radar, o duo com a rosinha");
const pos1 = await p.locator(".orbita .astro:not(.centro):not(.duo)").first().evaluate((e) => e.style.transform);
await p.waitForTimeout(1500);
const pos2 = await p.locator(".orbita .astro:not(.centro):not(.duo)").first().evaluate((e) => e.style.transform);
ok(pos1 !== pos2, "as órbitas giram");
ok(/\d\d:\d\d:\d\d/.test(await p.locator("#hudHora").textContent()), "relógio do HUD");
const larguraOk = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
ok(larguraOk, "Social sem rolagem para o lado");
await p.locator(".ceu").screenshot({ path: "saida/social-radar.png" });
ok(await p.locator("#dmGrade .dm-op").count() === 4 && await p.locator("#dmGrade .dm-op.on[data-estilo=gaveta]").count() === 1, "4 modelos com prévia, gaveta marcada");
ok(await p.locator("#dmGrade .dm-op[data-estilo=gaveta] .dm-gav").count() === 1 && await p.locator("#dmGrade .dm-op[data-estilo=bolinha] .dm-bol").count() === 1, "prévias da gaveta e da bolinha");
await p.locator("#duoModos").screenshot({ path: "saida/duo-modelos.png" });
await p.locator("#dmGrade .dm-op[data-estilo=bolinha]").tap(); await p.waitForTimeout(1500);
ok((await db.doc(`usuarios/${ids.ana}`).get()).data().duoCapa === "clicavel", "escolher Bolinha grava clicavel");
await p.locator("#dmClique").tap(); await p.waitForTimeout(1500);
ok((await db.doc(`usuarios/${ids.ana}`).get()).data().duoCapa === "foto" && (await db.doc(`perfis_publicos/${ids.ana}`).get()).data().duoCapa === "foto", "desligar o toque: bolinha só para ver (foto)");
await p.goto(BASE + "usuarios.html"); await abrirRosa();
ok(await p.locator("#meuPerfil .pf-duo-bolha.aberta.so-ver").count() === 1 && await p.locator("#meuPerfil .pf-duo-gaveta").count() === 0, "perfil: bolinha só para ver");
// gaveta só para ver
await p.goto(BASE + "social.html"); await p.waitForSelector("#dmGrade .dm-op", { timeout: 25000 }); await p.waitForTimeout(1200);
await p.locator("#dmGrade .dm-op[data-estilo=gaveta]").tap(); await p.waitForTimeout(1500);
ok((await db.doc(`usuarios/${ids.ana}`).get()).data().duoCapa === "gaveta-fixa", "gaveta mantém o toque desligado (gaveta-fixa)");
await p.locator("#dmGrade .dm-op[data-estilo=rosa]").tap(); await p.waitForTimeout(1500);
ok(await p.locator("#dmCliqueIn").isDisabled(), "Só a rosinha: a chave do toque fica desligada");
await p.locator("#dmGrade .dm-op[data-estilo=ocultar]").tap(); await p.waitForTimeout(1500);
await p.goto(BASE + "usuarios.html"); await p.waitForSelector("#meuPerfil .pf-nome", { timeout: 25000 }); await p.waitForTimeout(2500);
ok(await p.locator("#meuPerfil .pf-rosa").count() === 0, "Nada: sem rosinha no perfil");
await p.goto(BASE + "social.html"); await p.waitForSelector("#dmGrade .dm-op", { timeout: 25000 }); await p.waitForTimeout(1200);
await p.locator("#dmGrade .dm-op[data-estilo=gaveta]").tap(); await p.waitForTimeout(1500);
ok((await db.doc(`usuarios/${ids.ana}`).get()).data().duoCapa === "gaveta", "voltar para a gaveta: toque ligado de novo");
// Configurações
await p.goto(BASE + "configuracoes.html"); await p.waitForTimeout(3000);
ok(await p.locator("#cfgDuoCapa button").count() === 4 && await p.locator("#cfgDuoCapa button.on[data-valor=gaveta]").count() === 1 && await p.locator("#cfgDuoClique").isChecked(), "Configurações: os 4 modelos e o toque");
// tema escuro, computador
const B = await navegador({ mobile: false });
await B.ctx.addInitScript(() => localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" })));
const q = await entrar(B.ctx, "ana", "social.html");
await q.waitForSelector("#dmGrade .dm-op", { timeout: 25000 }); await q.waitForTimeout(2500);
await q.screenshot({ path: "saida/social-radar-pc.png", fullPage: true });
await q.goto(BASE + "usuarios.html"); await q.waitForSelector("#meuPerfil .pf-rosa", { timeout: 25000 }); await q.waitForTimeout(1200);
await q.locator("#meuPerfil .pf-rosa").click(); await q.waitForTimeout(800);
await q.locator("#meuPerfil .pf2").screenshot({ path: "saida/duo-gaveta-escuro.png" });
ok(await q.locator("#meuPerfil .pf-duo-gaveta.aberta").count() === 1, "computador/escuro: gaveta abre");
ok(!erros.length, "sem erro na página" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close(); await B.browser.close();
