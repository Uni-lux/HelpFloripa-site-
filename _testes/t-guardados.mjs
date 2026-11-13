// Conteúdo escondido de verdade (guardar.js) e publicações agendadas fora do Diário (agendadas.js), 13/11/2026.
//  - a equipe esconde um negócio: no lugar fica um esqueleto vazio e o conteúdo vai para guardados/;
//  - quem visita não abre; o dono vê o cartão em Meus negócios (com o conteúdo guardado) e não consegue editar;
//  - mostrar de novo devolve o documento igual;
//  - agendada que já passou da hora vai para o Diário quando o autor entra; "Publicar agora" no perfil;
//  - agendada antiga (no Diário com data futura) passa para agendadas/ quando o autor abre o perfil.
// Uso: node seed.mjs && node t-guardados.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const esperar = async (fn, ms = 15000) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };
const texto = async (p, re, ms = 20000) => { try { await p.waitForFunction((r) => new RegExp(r).test(document.body.innerText), re.source, { timeout: ms }); return true; } catch { return false; } };

const negId = `${U.bruno}_servicos`;
const neg = await db.doc(`negocios/${negId}`).get();
if (!neg.exists) { console.log("  ✘ seed sem o negócio de serviços do Bruno"); process.exit(1); }
const nomeNeg = neg.data().nome;
await db.doc(`guardados/negocios_${negId}`).delete().catch(() => {});

const erros = [];
// Roda guardar.js na página de quem está logado (a mesma função que o painel usa).
const naPagina = (p, fn, args) => p.evaluate(async ({ fn, args }) => {
  const f = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  const g = await import("./guardar.js?v=1");
  const fb = { ...f, db: window.firebaseDb };
  return g[fn](fb, ...args);
}, { fn, args });

// 1) A equipe esconde o negócio do Bruno.
const A = await navegador({ mobile: true });
const pa = await entrar(A.ctx, "admin", "index.html"); pa.on("pageerror", (e) => erros.push("admin: " + e.message));
await naPagina(pa, "guardarItem", ["negocios", negId, { motivo: "moderacao", por: U.admin }]);
const esq = (await db.doc(`negocios/${negId}`).get()).data();
const g = await db.doc(`guardados/negocios_${negId}`).get();
ok(esq.guardado === true && !esq.nome && !esq.descricao && Object.keys(esq).length <= 5, "o negócio vira esqueleto vazio: " + Object.keys(esq).join(","));
ok(g.exists && g.data().dados.nome === nomeNeg && g.data().motivo === "moderacao", "o conteúdo está em guardados/");

// 2) Quem visita não abre.
const V = await navegador({ mobile: true });
const pv = await entrar(V.ctx, "ana", `servicos.html?negocio=${encodeURIComponent(negId)}`); pv.on("pageerror", (e) => erros.push("ana: " + e.message));
ok(await texto(pv, /não está mais disponível/), "visitante: \"não está mais disponível\"");
ok(!(await pv.locator(`text=${nomeNeg}`).count()), "visitante não vê o nome do negócio");

// 3) O dono vê o cartão com o conteúdo guardado e não edita.
const B = await navegador({ mobile: true });
const pb = await entrar(B.ctx, "bruno", "negocios.html"); pb.on("pageerror", (e) => erros.push("bruno: " + e.message));
ok(await texto(pb, new RegExp(nomeNeg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))), "Meus negócios mostra o nome (conteúdo guardado)");
ok(await texto(pb, /Fora do ar/), "Meus negócios: \"Fora do ar\"");
await pb.screenshot({ path: "saida/guardados-meus-negocios.png" });

// 4) Mostrar de novo devolve igual.
await naPagina(pa, "devolverItem", ["negocios", negId]);
const volta = (await db.doc(`negocios/${negId}`).get()).data();
ok(volta.nome === nomeNeg && !volta.guardado && !(await db.doc(`guardados/negocios_${negId}`).get()).exists, "mostrar devolve o negócio igual e o guardado sai");
ok(JSON.stringify(Object.keys(volta).sort()) === JSON.stringify(Object.keys(neg.data()).filter((k) => !["ocultoAte", "ocultoPelaEquipe", "guardado"].includes(k)).sort()), "mesmos campos de antes");

// 5) Agendadas: a que venceu é publicada quando a autora entra; a outra fica guardada.
const agora = Date.now();
for (const id of ["agVenc", "agFut", "agVelho"]) { await db.doc(`agendadas/${id}`).delete().catch(() => {}); await db.doc(`diario/${id}`).delete().catch(() => {}); }
await db.doc("ritmo/" + U.ana).delete().catch(() => {});
const base = { autorId: U.ana, nome: "Ana", fotoPerfil: "", mediaUrl: "", mediaTipo: "" };
await db.doc("agendadas/agVenc").set({ autorId: U.ana, quando: Timestamp.fromMillis(agora - 60000), dados: { ...base, texto: "Agendada que já venceu" }, criadoEm: Timestamp.fromMillis(agora - 864e5) });
await db.doc("agendadas/agFut").set({ autorId: U.ana, quando: Timestamp.fromMillis(agora + 3 * 3600e3), dados: { ...base, texto: "Agendada para daqui a pouco" }, criadoEm: Timestamp.now() });
await db.doc("diario/agVelho").set({ ...base, texto: "Agendada do jeito antigo", agendadoPara: Timestamp.fromMillis(agora + 5 * 3600e3), criadoEm: Timestamp.now() });
const N = await navegador({ mobile: true });
const pn = await entrar(N.ctx, "ana", "usuarios.html"); pn.on("pageerror", (e) => erros.push("ana2: " + e.message));
ok(await esperar(async () => (await db.doc("diario/agVenc").get()).exists && !(await db.doc("agendadas/agVenc").get()).exists), "agendada que venceu foi para o Diário ao entrar");
const pub = (await db.doc("diario/agVenc").get()).data() || {};
ok(pub.texto === "Agendada que já venceu" && pub.criadoEm && !pub.agendadoPara, "publicada com data de agora e sem agendadoPara");
ok(!(await db.doc("diario/agFut").get()).exists, "a agendada do futuro continua guardada");
ok(await esperar(async () => !(await db.doc("diario/agVelho").get()).exists && (await db.doc("agendadas/agVelho").get()).exists), "agendada antiga saiu do Diário e foi para agendadas/");
await pn.waitForSelector(".selo-agendada", { timeout: 20000 }).catch(() => {});
ok(await pn.locator(".selo-agendada").count() >= 2, "perfil mostra as agendadas com o selo");
await pn.screenshot({ path: "saida/guardados-perfil-agendadas.png" });
// "Publicar agora" na agendada do futuro.
await pn.locator(".selo-agendada").first().evaluate((e) => (e.closest("button, a, [role=button], .tile, .texto-item, li, article") || e.parentElement).click());
await pn.locator("button", { hasText: "Publicar agora" }).first().click({ timeout: 15000 }).catch((e) => erros.push("publicar agora: " + e.message));
ok(await esperar(async () => (await db.doc("diario/agFut").get()).exists || (await db.doc("diario/agVelho").get()).exists), "\"Publicar agora\" publica no Diário");

// 6) Conta desativada (conta.js): tudo da pessoa vira esqueleto com motivo "conta" e volta ao reativar.
const negs = (await db.collection("negocios").where("donoId", "==", U.bruno).get()).docs.map((d) => d.id);
await pb.evaluate(async (uid) => {
  const f = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  const c = await import("./conta.js?v=9");
  await c.desativarConta({ ...f, db: window.firebaseDb }, uid, { motivo: "pausa" });
}, U.bruno);
const esqs = await Promise.all(negs.map((id) => db.doc(`negocios/${id}`).get()));
const gs = await Promise.all(negs.map((id) => db.doc(`guardados/negocios_${id}`).get()));
ok(negs.length > 0 && esqs.every((d) => d.data().guardado === true && !d.data().nome), `desativar: os ${negs.length} negócio(s) viram esqueleto`);
ok(gs.every((g) => g.exists && g.data().motivo === "conta" && g.data().porEquipe === false), "desativar: guardados com motivo conta");
await pb.evaluate(async (uid) => {
  const f = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  const c = await import("./conta.js?v=9");
  await c.reativarConta({ ...f, db: window.firebaseDb }, uid);
}, U.bruno);
const voltas = await Promise.all(negs.map((id) => db.doc(`negocios/${id}`).get()));
ok(voltas.every((d) => d.data().nome && !d.data().guardado), "reativar: os negócios voltam com o conteúdo");
ok(!(await db.collection("guardados").where("dono", "==", U.bruno).get()).size, "reativar: não sobra guardado");

ok(!erros.length, "sem erros na página: " + erros.join(" | "));
for (const x of [A, V, B, N]) await x.browser.close();
console.log(process.exitCode ? "Falhou" : "Tudo certo");
