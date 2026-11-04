// Acesso sem login: (1) todas as páginas da plataforma (também com link direto: publicação, perfil, flash, conversa,
// negócio) levam ao login sem mostrar nada; (2) só as páginas de ler abrem (termos, privacidade, ajuda, contato,
// segurança, diretrizes, institucionais); (3) nelas o menu mostra só as páginas públicas + "Criar conta grátis", sem sino;
// (4) com a conta entrada o menu volta completo; (5) regras: sem login não lê o Firestore (nicknames: um @ sim, lista não).
// Roda: FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 node t-sem-login.mjs
import { readdirSync } from "node:fs";
import { navegador, entrar, BASE, SITE, USUARIOS as U } from "./nav.mjs";
let falhas = 0; const ok = (c, t) => { console.log((c ? "  ✔ " : "  ✘ ") + t); if (!c) falhas++; };
const PUBLICAS = ["404.html", "ajuda.html", "cadastre-se.html", "cadastrar_usuarios.html", "clientes.html", "como-ordenamos.html", "contato.html", "diretrizes.html", "link.html", "login.html", "offline.html", "privacidade.html", "profissionais.html", "recuperar-senha.html", "conta-acao.html", "seguranca.html", "sobre.html", "socios-parcerias.html", "termos.html"];
const pags = readdirSync(SITE).filter((f) => f.endsWith(".html") && !/^google/.test(f));
const LINKS = [`feed.html?post=x1`, `feed.html?flash=x1`, `usuarios.html?perfil=${U.ana}`, `mensagens.html?conversa=a_b`, `servicos.html?negocio=${U.bruno}_servicos`, `negocios.html?planos=1`, `notificacoes.html?enquete=d_x`, `suporte.html?chamado=x`, `rede.html?aba=mensagens`];
const N = await navegador({ mobile: true });
const erros = [];

console.log("Páginas da plataforma sem login");
for (const pg of [...pags.filter((p) => !PUBLICAS.includes(p)), ...LINKS]) {
  const p = await N.ctx.newPage();
  p.on("pageerror", (x) => erros.push(pg + ": " + x.message));
  const log = []; p.on("console", (m) => log.push(m.text().slice(0, 150))); p.on("requestfailed", (r) => log.push("FALHOU " + r.url().slice(0, 100)));
  await p.goto(BASE + pg).catch((e) => log.push("goto " + e.message.slice(0, 100)));
  await p.waitForURL(/login\.html/, { timeout: 12000 }).catch(() => {});
  ok(/login\.html/.test(p.url()), `${pg} → login` + (/login\.html/.test(p.url()) ? "" : " (ficou em " + p.url().replace(BASE, "") + ")"));
  if (!/login\.html/.test(p.url()) && process.env.DEBUG) console.log("    " + log.join("\n    ") + "\n    " + JSON.stringify(await p.evaluate(() => ({ cls: document.documentElement.className, auth: !!window.firebaseAuth, st: document.readyState, scripts: [...document.scripts].map((x) => x.src.split("/").pop()).filter(Boolean) })).catch((e) => e.message)));
  await p.close();
}

console.log("Páginas de ler");
for (const pg of PUBLICAS.filter((p) => !/^(404|link|offline|cadastrar_usuarios)/.test(p))) {
  const p = await N.ctx.newPage();
  await p.goto(BASE + pg); await p.waitForTimeout(600);
  ok(p.url().endsWith(pg), `${pg} abre`);
  await p.close();
}

console.log("Menu e topo sem conta");
const p = await N.ctx.newPage();
p.on("pageerror", (x) => erros.push("termos: " + x.message));
await p.goto(BASE + "termos.html"); await p.waitForTimeout(2500);
ok(await p.evaluate(() => getComputedStyle(document.getElementById("badgeAvisos").closest("a")).visibility === "hidden"), "sem sino no topo");
await p.click("#btnMenu"); await p.waitForTimeout(700);
const vis = await p.evaluate(() => [...document.querySelectorAll("#gaveta .gaveta-item")].filter((a) => a.offsetWidth).map((a) => a.getAttribute("href")));
ok(vis.length > 0 && vis.every((h) => /^(profissionais|ajuda|seguranca|contato|sobre|clientes|diretrizes|como-ordenamos|socios-parcerias)\.html$/.test(h)), "menu só com páginas públicas: " + vis.join(", "));
ok(!vis.some((h) => /index|feed|mensagens|negocios|usuarios|servicos/.test(h)), "sem Início, Diário, Mensagens, vitrines, Meus negócios");
const bt = await p.evaluate(() => ({ t: document.getElementById("gavetaAnunciar").textContent, h: document.getElementById("gavetaAnunciar").getAttribute("href"), sair: document.getElementById("gavetaSair").offsetWidth, perfil: document.getElementById("gavetaPerfil").getAttribute("href") }));
ok(bt.t === "Criar conta grátis" && bt.h === "cadastre-se.html" && !bt.sair && bt.perfil === "login.html", "botão Criar conta grátis, sem Sair, perfil → login");
await p.screenshot({ path: "saida/sem-login-menu.png" });

console.log("Regras sem login");
const r = await p.evaluate(async (uid) => {
  const fs = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  const db = window.firebaseDb, t = async (f) => { try { await f(); return "ok"; } catch (e) { return e.code; } };
  return {
    perfil: await t(() => fs.getDoc(fs.doc(db, "perfis_publicos", uid))),
    negocios: await t(() => fs.getDocs(fs.query(fs.collection(db, "negocios"), fs.limit(1)))),
    diario: await t(() => fs.getDocs(fs.query(fs.collection(db, "diario"), fs.limit(1)))),
    umNick: await t(() => fs.getDoc(fs.doc(db, "nicknames", "ana"))),
    todosNicks: await t(() => fs.getDocs(fs.query(fs.collection(db, "nicknames"), fs.limit(5))))
  };
}, U.ana);
ok(r.perfil === "permission-denied" && r.negocios === "permission-denied" && r.diario === "permission-denied", "perfis, negócios e Diário recusados: " + JSON.stringify(r));
ok(r.umNick === "ok" && r.todosNicks === "permission-denied", "nicknames: conferir um @ sim, listar todos não");
await p.close();

console.log("Com a conta");
const pl = await entrar(N.ctx, "ana", "termos.html"); await pl.waitForTimeout(2500);
ok(await pl.evaluate(() => getComputedStyle(document.getElementById("badgeAvisos").closest("a")).visibility !== "hidden"), "sino volta");
await pl.click("#btnMenu"); await pl.waitForTimeout(800);
const vis2 = await pl.evaluate(() => [...document.querySelectorAll("#gaveta .gaveta-item")].filter((a) => a.offsetWidth).map((a) => a.getAttribute("href")));
ok(vis2.includes("feed.html") && vis2.includes("index.html") && vis2.includes("negocios.html"), "menu completo (" + vis2.length + " itens)");
ok(await pl.evaluate(() => document.getElementById("gavetaAnunciar").textContent) === "Anunciar no Help Floripa", "botão Anunciar");
ok(!erros.length, "sem erros " + erros.join(" | "));
await N.browser.close();
console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
