// Etapa B: notificações com o app fechado. Conta (functions/push.js), tela das Configurações (liga/desliga, categorias,
// teste), gatilhos no emulador (o aviso vai para push_teste no lugar do FCM) e o sw.js mostrando a notificação.
// Precisa do emulador com as Functions: FUNCOES=1 ./emulador.sh. Roda: FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 node t-push.mjs
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { navegador, entrar, BASE, USUARIOS as U } from "./nav.mjs";
import { quer, limite, montarAviso, resumoMensagem, corpoFcm } from "../functions/push.js";
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
let falhas = 0; const ok = (c, t) => { console.log((c ? "  ✔ " : "  ✘ ") + t); if (!c) falhas++; };
const agora = Date.now(), ts = (m) => Timestamp.fromMillis(m), criados = [];
const pôr = async (c, id, d) => { await db.doc(`${c}/${id}`).set(d); criados.push(`${c}/${id}`); };
const esperar = async (f, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const r = await f(); if (r) return r; await new Promise((x) => setTimeout(x, 300)); } return null; };
const avisosPara = async (uid, desde) => (await db.collection("push_teste").where("uid", "==", uid).get()).docs.map((d) => d.data()).filter((x) => x.em >= desde);

// ---------- 1) conta ----------
console.log("Conta");
ok(quer(null, "mensagens") && !quer({ ligado: false }, "mensagens") && !quer({ seguidores: false }, "seguidores") && quer({ seguidores: false }, "mensagens"), "preferências por categoria");
let l = limite({}, "estrelas-p1", 1000, 600000);
ok(l.pode && !limite(l.estado, "estrelas-p1", 2000, 600000).pode && limite(l.estado, "estrelas-p1", 700000, 600000).pode, "estrelas na mesma publicação: 1 aviso a cada 10 min");
ok(resumoMensagem({ tipoArquivo: "audio" }) === "🎤 Mensagem de voz" && resumoMensagem({ texto: "oi" }) === "oi" && resumoMensagem({ apagada: {} }) === "", "resumo da mensagem");
const ch = montarAviso("chamada", { nome: "Bruno", modo: "video", conversa: "a_b", id: "c1" });
ok(ch.urgente && ch.ttl === 45 && /vídeo/.test(ch.titulo), "ligação: urgente e some em 45 s");
const corpo = corpoFcm(["t1"], montarAviso("seguidor", { nome: "Ana", uid: "u1" }));
ok(corpo.data.url === "usuarios.html?perfil=u1" && Object.values(corpo.data).every((v) => typeof v === "string"), "mensagem do FCM só com texto");

// ---------- 2) tela das Configurações ----------
console.log("Configurações");
const usuAntes = (await db.doc(`usuarios/${U.ana}`).get()).data() || {};
await db.doc(`usuarios/${U.ana}`).update({ pushTokens: FieldValue.delete(), pushPref: FieldValue.delete() });
const { browser, ctx } = await navegador({ mobile: true, sw: true });
await ctx.grantPermissions(["notifications"], { origin: BASE.replace(/\/$/, "") });
await ctx.addInitScript(() => { try { localStorage.setItem("hf-push-teste", "1"); } catch {} window.__hfFuncoesEmulador = 5001; });
const erros = [];
const p = await entrar(ctx, "ana", "configuracoes.html");
p.on("pageerror", (x) => erros.push(x.message));
await p.waitForSelector("#cfgNotifNavegador", { timeout: 20000 }); await p.waitForTimeout(1500);
ok(/Toque para ligar/.test(await p.textContent("#cfgNotifTxt")), "item mostra \"Toque para ligar\"");
await p.tap("#cfgNotifNavegador"); await p.waitForTimeout(500);
ok(await p.locator("#folhaPush.aberta").count() === 1, "abre a folha das notificações");
ok(await p.locator("#pushCats input").count() === 6 && await p.locator("#pushCats.off").count() === 1, "6 categorias, apagadas enquanto não liga");
await p.tap("label.push-este .switch"); await p.waitForTimeout(1500);
const u1 = (await db.doc(`usuarios/${U.ana}`).get()).data();
ok(u1.pushTokens?.length === 1 && u1.pushTokens[0].t.startsWith("teste-") && u1.pushPref?.ligado === true, "ligou: token do aparelho guardado na conta");
ok(await p.locator("#pushEste").isChecked() && /Ligadas neste aparelho/.test(await p.textContent("#pushEsteTxt")), "mostra ligado");
await p.screenshot({ path: "saida/push-config.png" });
await p.locator('#pushCats label', { hasText: "Seguidores" }).locator(".switch").tap(); await p.waitForTimeout(1000);
ok((await db.doc(`usuarios/${U.ana}`).get()).get("pushPref.seguidores") === false, "desligou Seguidores (vale para todos os aparelhos)");

// ---------- 3) gatilhos no emulador ----------
console.log("Gatilhos");
let t0 = Date.now();
await pôr("relacoes", `${U.gui}_${U.ana}`, { tipo: "seguir", seguidorId: U.gui, alvoId: U.ana, criadoEm: ts(agora) });
await new Promise((x) => setTimeout(x, 4000));
ok(!(await avisosPara(U.ana, t0)).some((x) => x.tipo === "seguidor"), "Seguidores desligado: não avisa");
await p.locator('#pushCats label', { hasText: "Seguidores" }).locator(".switch").tap(); await p.waitForTimeout(800);
t0 = Date.now();
await pôr("relacoes", `${U.hele}_${U.ana}`, { tipo: "seguir", seguidorId: U.hele, alvoId: U.ana, criadoEm: ts(agora) });
const seg = await esperar(async () => (await avisosPara(U.ana, t0)).find((x) => x.tipo === "seguidor"));
ok(seg && /Helena/.test(seg.data.texto) && seg.data.url === `usuarios.html?perfil=${U.hele}` && seg.tokens[0] === u1.pushTokens[0].t, "novo seguidor: avisa com o nome e o link do perfil");
t0 = Date.now();
await pôr("diario", "pushPost", { autorId: U.ana, nome: "Ana", texto: "teste push", criadoEm: ts(agora) });
await pôr("curtidas", `pushPost_${U.bruno}`, { uid: U.bruno, postId: "pushPost", postAutorId: U.ana, nota: 5, criadoEm: ts(agora) });
await esperar(async () => (await avisosPara(U.ana, t0)).some((x) => x.tipo === "curtida"));
await pôr("curtidas", `pushPost_${U.edu}`, { uid: U.edu, postId: "pushPost", postAutorId: U.ana, nota: 4, criadoEm: ts(agora) });
await new Promise((x) => setTimeout(x, 4000));
ok((await avisosPara(U.ana, t0)).filter((x) => x.tipo === "curtida").length === 1, "estrelas seguidas na mesma publicação: 1 aviso só");
t0 = Date.now();
const conv = [U.ana, U.bruno].sort().join("_");
await db.doc(`conversas/${conv}`).set({ participantes: [U.ana, U.bruno].sort(), atualizadoEm: ts(agora) }, { merge: true });
await pôr(`conversas/${conv}/mensagens`, "pushMsg1", { remetenteId: U.bruno, texto: "Oi Ana, tudo certo?", criadoEm: ts(agora) });
const msg = await esperar(async () => (await avisosPara(U.ana, t0)).find((x) => x.tipo === "mensagem"));
ok(msg && /Bruno/.test(msg.data.titulo) && msg.data.texto === "Oi Ana, tudo certo?" && msg.webpush.headers.Urgency === "high", "mensagem: nome no título, texto e prioridade alta");
t0 = Date.now();
await pôr("chamadas", "pushCh1", { de: U.bruno, para: U.ana, conv, tipo: "audio", status: "chamando", criadoEm: ts(agora) });
const lig = await esperar(async () => (await avisosPara(U.ana, t0)).find((x) => x.tipo === "chamada"));
ok(lig && lig.data.urgente === "1" && lig.webpush.headers.TTL === "45", "ligação tocando: urgente, 45 s");
await db.doc("chamadas/pushCh1").update({ status: "perdida" });
ok(!!(await esperar(async () => (await avisosPara(U.ana, t0)).find((x) => x.tipo === "chamada_perdida"))), "ligação perdida avisa");
// Bloqueio: Ana bloqueou o Gui → mensagem dele não avisa
await pôr("bloqueios", `${U.ana}_${U.gui}`, { bloqueadorId: U.ana, bloqueadoId: U.gui, criadoEm: ts(agora) });
t0 = Date.now();
await pôr("curtidas", `pushPost_${U.gui}`, { uid: U.gui, postId: "pushPost2", postAutorId: U.ana, nota: 5, criadoEm: ts(agora) });
await new Promise((x) => setTimeout(x, 4000));
ok(!(await avisosPara(U.ana, t0)).length, "bloqueado não gera aviso");

// ---------- 4) "Enviar um teste" (Cloud Function pushTeste) ----------
t0 = Date.now();
await p.tap("#pushTeste"); await p.waitForTimeout(3000);
ok(!!(await esperar(async () => (await avisosPara(U.ana, t0)).find((x) => x.tipo === "teste"))), "Enviar um teste chama a função");

// ---------- 5) sw.js mostra a notificação ----------
console.log("Service worker");
const cdp = await ctx.newCDPSession(p);
let regId = null;
cdp.on("ServiceWorker.workerRegistrationUpdated", (e) => { const r = e.registrations.find((x) => x.scopeURL.startsWith(BASE)); if (r) regId = r.registrationId; });
await cdp.send("ServiceWorker.enable");
await esperar(async () => regId, 8000);
ok(!!regId, "service worker registrado");
await cdp.send("ServiceWorker.deliverPushMessage", { origin: BASE.replace(/\/$/, ""), registrationId: regId, data: JSON.stringify({ data: { titulo: "Bruno Reparos", texto: "Seu pedido saiu para entrega", url: "mensagens.html?conversa=x", tag: "conv-x", categoria: "mensagens" } }) });
const nots = await esperar(async () => { const n = await p.evaluate(async () => (await (await navigator.serviceWorker.ready).getNotifications()).map((x) => ({ t: x.title, b: x.body, tag: x.tag, url: x.data?.url }))); return n.length ? n : null; }, 8000);
ok(nots?.some((n) => n.t === "Bruno Reparos" && n.b === "Seu pedido saiu para entrega" && n.tag === "conv-x" && n.url === "mensagens.html?conversa=x"), "notificação aparece com título, texto e link: " + JSON.stringify(nots));
await cdp.send("ServiceWorker.deliverPushMessage", { origin: BASE.replace(/\/$/, ""), registrationId: regId, data: JSON.stringify({ data: { titulo: "x", texto: "y", url: "https://golpe.example/roubar" } }) });
await p.waitForTimeout(1500);
const nots2 = await p.evaluate(async () => (await (await navigator.serviceWorker.ready).getNotifications()).map((x) => x.data?.url));
ok(nots2.includes("notificacoes.html") && !nots2.some((u) => /golpe/.test(u)), "link de fora do site é trocado pelas Notificações");

// Desligar neste aparelho tira o token
await p.tap("label.push-este .switch"); await p.waitForTimeout(1500);
ok(!((await db.doc(`usuarios/${U.ana}`).get()).get("pushTokens") || []).length, "desligou: token sai da conta");
ok(!erros.length, "sem erros " + erros.join(" | "));

// ---------- limpeza ----------
await browser.close();
for (const c of criados) await db.doc(c).delete().catch(() => {});
await db.doc(`usuarios/${U.ana}`).update({ pushTokens: usuAntes.pushTokens ?? FieldValue.delete(), pushPref: usuAntes.pushPref ?? FieldValue.delete() });
const pt = await db.collection("push_teste").get(); await Promise.all(pt.docs.map((d) => d.ref.delete()));
await db.doc(`push_estado/${U.ana}`).delete().catch(() => {});
console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
