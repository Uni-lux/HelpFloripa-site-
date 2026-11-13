// Conteúdo escondido pela equipe (ocultoAte no futuro) e publicação agendada não abrem por link direto (regras novas
// de 13/11/2026: get só para o dono e a equipe). O site mostra "não está disponível" em vez de erro.
// Uso: node seed.mjs && node t-escondido-link.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const futuro = Timestamp.fromMillis(Date.now() + 9e9), agora = Timestamp.now();
await db.doc("diario/escLink1").set({ autorId: U.bruno, nome: "Bruno", texto: "Publicação escondida pela equipe", ocultoAte: futuro, ocultoPelaEquipe: true, criadoEm: agora });
await db.doc("diario/escLink2").set({ autorId: U.bruno, nome: "Bruno", texto: "Publicação agendada para depois", agendadoPara: futuro, criadoEm: agora });
await db.doc("diario/escLink3").set({ autorId: U.bruno, nome: "Bruno", texto: "Publicação normal do Bruno", criadoEm: agora });
await db.doc("negocios/escLinkDono_servicos").set({ donoId: "escLinkDono", tipo: "servicos", nome: "Negócio escondido", cidade: "Florianópolis", uf: "SC", ocultoAte: futuro, ocultoPelaEquipe: true, criadoEm: agora, atualizadoEm: agora });

const { browser, ctx } = await navegador({ mobile: true });
const erros = [];
const texto = async (p, re, ms = 15000) => { try { await p.waitForFunction((r) => new RegExp(r).test(document.body.innerText), re.source, { timeout: ms }); return true; } catch { return false; } };

let p = await entrar(ctx, "ana", "feed.html?post=escLink1"); p.on("pageerror", (e) => erros.push(e.message));
ok(await texto(p, /não está disponível/), "publicação escondida: \"não está disponível\"");
ok(!(await p.locator("text=Publicação escondida pela equipe").count()), "o texto da publicação escondida não aparece");
await p.goto(new URL("feed.html?post=escLink2", p.url()).href);
ok(await texto(p, /não está disponível/), "publicação agendada: \"não está disponível\" antes da hora");
await p.goto(new URL("feed.html?post=escLink3", p.url()).href);
ok(await texto(p, /Publicação normal do Bruno/), "publicação normal abre pelo link");
await p.goto(new URL("servicos.html?negocio=escLinkDono_servicos", p.url()).href);
ok(await texto(p, /não está mais disponível/, 25000), "negócio escondido: \"não está mais disponível\"");
ok(!(await p.locator("text=Negócio escondido").count()), "o negócio escondido não abre");

const pb = await entrar(ctx, "bruno", "feed.html?post=escLink2"); pb.on("pageerror", (e) => erros.push(e.message));
ok(await texto(pb, /Publicação agendada para depois/), "o autor abre a própria publicação agendada");
ok(!erros.length, "sem erros na página: " + erros.join(" | "));
await browser.close();
console.log(process.exitCode ? "Falhou" : "Tudo certo");
