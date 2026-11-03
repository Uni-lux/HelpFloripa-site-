// E-mail confirmado obrigatório + painel. (1) Conta que não confirmou o e-mail é levada para verificar-email.html ao
// entrar e ao abrir qualquer página da plataforma (as de ler continuam abertas); sem "continuar sem confirmar"; confirmou =
// entra. (2) A conta anota usuarios.emailConfirmado (valor do login). (3) Painel: selo e filtro "E-mail não confirmado",
// ficha com a confirmação e "Apagar conta" (Cloud Function apagarConta). (4) Logo nova no login (escuro e claro).
// Precisa de FUNCOES=1 ./emulador.sh. Roda: FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 node t-email-confirmado.mjs
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
import { readFileSync } from "node:fs";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore"; import { getAuth } from "firebase-admin/auth";
import { navegador, entrar, BASE } from "./nav.mjs";
initializeApp({ projectId: "demo-hf" }); const db = getFirestore(); const auth = getAuth();
let falhas = 0; const ok = (c, t) => { console.log((c ? "  ✔ " : "  ✘ ") + t); if (!c) falhas++; };
const esperar = async (f, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const r = await f(); if (r) return r; await new Promise((x) => setTimeout(x, 300)); } return null; };

async function contaNova(apelido, confirmado) {
  const email = `${apelido}@teste.com`;
  const velho = await auth.getUserByEmail(email).catch(() => null);
  if (velho) await auth.deleteUser(velho.uid);
  const u = await auth.createUser({ email, password: "teste123", emailVerified: confirmado, displayName: apelido });
  const agora = Timestamp.now();
  await db.doc(`usuarios/${u.uid}`).set({ uid: u.uid, nome: "Teste " + apelido, email, aceiteTermos: true, criadoEm: agora });
  await db.doc(`perfis_publicos/${u.uid}`).set({ uid: u.uid, nome: "Teste " + apelido, criadoEm: agora, ultimoAcesso: agora });
  return u.uid;
}

// ---------- 1) quem não confirmou não entra ----------
console.log("Sem e-mail confirmado");
const uidSem = await contaNova("semconfirmar", false);
const A = await navegador({ mobile: true });
const erros = [];
const p = await A.ctx.newPage();
p.on("pageerror", (x) => erros.push(x.message));
await p.goto(BASE + "login.html");
await p.waitForSelector(".logo-acesso img", { timeout: 15000 });
const logo = await p.evaluate(() => { const i = document.querySelector(".logo-acesso img"); return { w: i.getBoundingClientRect().width, ok: i.complete && i.naturalWidth > 0 }; });
ok(logo.ok && logo.w > 200, `logo nova no login (${Math.round(logo.w)} px)`);
await p.screenshot({ path: "saida/email-login-escuro.png" });
await p.fill("#email", "semconfirmar@teste.com"); await p.fill("#senha", "teste123");
await p.locator("button", { hasText: /^Entrar$/ }).click();
await p.waitForURL(/verificar-email\.html/, { timeout: 15000 }).catch(() => {});
ok(/verificar-email\.html/.test(p.url()), "entrar sem confirmar leva para Confirmar e-mail");
await p.waitForTimeout(1500);
const txt = await p.textContent("body");
ok(/só entra no Help Floripa quem confirmou o e-mail/.test(txt) && !/Continuar sem confirmar/.test(txt), "a página explica e não tem mais \"Continuar sem confirmar\"");
await p.screenshot({ path: "saida/email-verificar.png" });
for (const pag of ["feed.html", "index.html", "mensagens.html", "servicos.html"]) {
  await p.goto(BASE + pag);
  await p.waitForURL(/verificar-email\.html/, { timeout: 15000 }).catch(() => {});
  ok(/verificar-email\.html/.test(p.url()), `${pag}: barrado → Confirmar e-mail`);
}
await p.goto(BASE + "ajuda.html"); await p.waitForTimeout(3000);
ok(/ajuda\.html/.test(p.url()), "Ajuda continua aberta (páginas de ler)");
const anotado = await esperar(async () => (await db.doc(`usuarios/${uidSem}`).get()).get("emailConfirmado") === false, 10000);
ok(!!anotado, "a conta anota emailConfirmado: false");

// ---------- 2) confirmou: entra ----------
console.log("Confirmou");
await p.goto(BASE + "verificar-email.html?continuar=feed.html");
await p.waitForTimeout(1500);
await auth.updateUser(uidSem, { emailVerified: true });
await p.waitForURL(/feed\.html/, { timeout: 20000 }).catch(() => {});
ok(/feed\.html/.test(p.url()), "depois de confirmar, a página libera sozinha e vai para onde a pessoa queria");
await p.evaluate(() => sessionStorage.clear());
await p.goto(BASE + "feed.html"); await p.waitForTimeout(3000);
ok(/feed\.html/.test(p.url()), "agora abre o Diário normalmente");
const anotado2 = await esperar(async () => (await db.doc(`usuarios/${uidSem}`).get()).get("emailConfirmado") === true, 12000);
ok(!!anotado2, "a conta passa a anotar emailConfirmado: true");
// tema claro: logo num cartão escuro
const L = await A.ctx.newPage();
await L.addInitScript(() => { try { localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "claro" })); } catch {} });
await L.goto(BASE + "login.html"); await L.waitForSelector(".logo-acesso img"); await L.waitForTimeout(800);
const fundoLogo = await L.evaluate(() => getComputedStyle(document.querySelector(".logo-acesso")).backgroundColor);
ok(/rgb\(5, 8, 11\)/.test(fundoLogo), "tema claro: logo num cartão escuro (" + fundoLogo + ")");
await L.screenshot({ path: "saida/email-login-claro.png" });
await A.browser.close();

// ---------- 3) painel ----------
console.log("Painel");
const uidOutro = await contaNova("naoconfirmou", false);
await db.doc(`usuarios/${uidOutro}`).set({ emailConfirmado: false, emailConferidoEm: Timestamp.now() }, { merge: true });
const ADM = await navegador({ mobile: false });
await ADM.ctx.addInitScript(() => { window.__hfFuncoesEmulador = 5001; });
const pa = await entrar(ADM.ctx, "admin", "admin.html#usuarios");
pa.on("pageerror", (x) => erros.push(x.message));
await pa.waitForSelector(".ad-tabela table, .ad-vazio", { timeout: 30000 }).catch(() => {});
await pa.waitForTimeout(1500);
// A conta de teste do admin não tem cidade no padrão novo: a janela "complete sua cidade" (local-conta.js) fica por cima.
await pa.evaluate(() => document.getElementById("hfLocalJanela")?.remove());
const chip = pa.locator("button", { hasText: "E-mail não confirmado" }).first();
ok(await chip.count() === 1, "filtro \"E-mail não confirmado\" na lista de usuários");
await chip.click(); await pa.waitForTimeout(2500);
const linhas = await pa.locator(".ad-tabela tbody tr").allTextContents();
ok(linhas.some((l) => /naoconfirmou@teste\.com/.test(l) && /E-mail não confirmado/.test(l)), "a conta aparece com o selo \"E-mail não confirmado\"");
await pa.screenshot({ path: "saida/email-painel.png" });
await pa.locator(".ad-tabela tbody tr", { hasText: "naoconfirmou@teste.com" }).first().click();
await pa.waitForSelector(".ad-gaveta", { timeout: 15000 });
await pa.waitForTimeout(800);
ok(/NÃO confirmado/.test(await pa.textContent(".ad-gaveta")), "ficha mostra a confirmação do e-mail");
const bAp = pa.locator(".ad-gaveta .ad-bt", { hasText: "Apagar conta" });
ok(await bAp.count() === 1, "ficha tem \"Apagar conta\" (dono)");
await bAp.click();
await pa.waitForSelector(".hf-confirma", { timeout: 5000 }); await pa.locator(".hf-confirma .sim").click();
await pa.waitForSelector(".ad-modal", { timeout: 5000 });
await pa.locator(".ad-modal input").last().fill("APAGAR");
await pa.locator(".ad-modal button[type=submit]").click();
const sumiu = await esperar(async () => !(await auth.getUser(uidOutro).catch(() => null)) && !(await db.doc(`usuarios/${uidOutro}`).get()).exists, 30000);
ok(!!sumiu, "conta apagada: login e dados");
ok(!(await db.doc(`perfis_publicos/${uidOutro}`).get()).exists, "perfil público apagado");
const log = (await db.collection("admin_log").where("acao", "==", "apagar_conta").get()).docs.map((d) => d.data()).find((x) => x.alvo === uidOutro);
ok(!!log && /naoconfirmou@teste\.com/.test(log.detalhe), "fica no registro de ações");
// moderação não apaga (só donos)
const r = await pa.evaluate(async () => {
  const m = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js");
  const f = m.getFunctions(window.firebaseApp, "southamerica-east1"); m.connectFunctionsEmulator(f, "127.0.0.1", 5001);
  try { await m.httpsCallable(f, "apagarConta")({ uid: window.firebaseAuth.currentUser.uid }); return "apagou"; } catch (e) { return e.code; }
});
ok(r === "functions/failed-precondition", "não apaga a própria conta (" + r + ")");
ok(!erros.length, "sem erros " + erros.join(" | "));
await ADM.browser.close();

// limpeza
await auth.deleteUser(uidSem).catch(() => {}); await db.doc(`usuarios/${uidSem}`).delete(); await db.doc(`perfis_publicos/${uidSem}`).delete();
for (const d of (await db.collection("admin_log").where("acao", "==", "apagar_conta").get()).docs) await d.ref.delete();
console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
