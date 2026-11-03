// Etapa D: fotos antigas (data:image dentro dos documentos) → Storage. Conta (functions/migrar-fotos.js), função
// migrarFotos no emulador (Firestore + Storage + Functions: FUNCOES=1 ./emulador.sh), botão do painel (só donos):
// simula, mostra quantas fotos e MB, passa, e os documentos ficam só com o link; o arquivo existe com a mesma foto.
// Roda: FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199 node t-migrar-fotos.mjs
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
import { fotosDoDoc, documentoNovo, lerData, ehData } from "../functions/migrar-fotos.js";
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
let falhas = 0; const ok = (c, t) => { console.log((c ? "  ✔ " : "  ✘ ") + t); if (!c) falhas++; };
const ts = (m) => Timestamp.fromMillis(m), criados = [];
const pôr = async (c, id, d) => { await db.doc(`${c}/${id}`).set(d); criados.push(`${c}/${id}`); };
// JPEG de 1×1 de verdade (o mesmo que os testes de regras usam), repetido com um comentário para ter tamanho.
const JPEG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";
const foto = (n) => JPEG.slice(0, -2) + "A".repeat(n * 4) + "==";

// ---------- 1) conta ----------
console.log("Conta");
const neg = { donoId: "u1", nome: "Loja", foto: foto(1), capa: "https://x/y.jpg", fotos: [foto(2), "https://ja/no/storage.jpg"], itens: [{ nome: "Pastel", preco: 10, foto: foto(3) }, { nome: "Suco", preco: 5 }] };
const fs1 = fotosDoDoc("negocios", "u1_delivery", neg, "x");
ok(fs1.length === 3 && fs1.every((f) => f.pasta.startsWith("negocios/u1_delivery")), "negócio: foto, galeria e itens (o que já é link fica)");
const novo = documentoNovo(neg, fs1, new Map(fs1.map((f, i) => [f.valor, "L" + i])));
ok(novo.foto === "L0" && novo.fotos[0] === "L1" && novo.fotos[1] === "https://ja/no/storage.jpg" && novo.itens[0].foto === "L2" && novo.itens[0].preco === 10 && novo.itens[1].nome === "Suco" && !("capa" in novo), "documento novo: troca só as fotos, o resto igual");
const post = { autorId: "u2", mediaUrl: foto(4), midias: [foto(4), foto(5)] };
const fp = fotosDoDoc("diario", "p1", post, "x");
ok(new Set(fp.map((f) => f.valor)).size === 2 && fp.every((f) => f.pasta.startsWith("diario/u2/")), "Diário: a 1ª foto repetida em mediaUrl e midias[0] é uma foto só, na pasta do autor");
ok(lerData(JPEG).tipo === "image/jpeg" && lerData(JPEG).bytes[0] === 0xff && !ehData("https://x") && !ehData("data:text/html;base64,AAAA"), "lê a foto e ignora o que não é imagem");

// ---------- 2) dados no emulador ----------
const agora = Date.now();
const antes = {};
for (const [c, id] of [["usuarios", U.ana], ["perfis_publicos", U.ana], [`negocios`, `${U.bruno}_servicos`]]) antes[`${c}/${id}`] = (await db.doc(`${c}/${id}`).get()).data() || null;
await db.doc(`usuarios/${U.ana}`).set({ fotoPerfil: foto(6) }, { merge: true });
await db.doc(`perfis_publicos/${U.ana}`).set({ fotoPerfil: foto(6) }, { merge: true });
await db.doc(`negocios/${U.bruno}_servicos`).set({ foto: foto(7), fotos: [foto(8)], itens: [{ nome: "Conserto", preco: 80, foto: foto(9) }] }, { merge: true });
await pôr("diario", "migrPost", { autorId: U.edu, nome: "Eduardo", texto: "foto antiga (migração)", mediaUrl: foto(10), midias: [foto(10), foto(11)], criadoEm: ts(agora) });
await pôr("comunidade", "migrCom", { donoId: U.fabi, categoria: "doacao", titulo: "Sofá", fotos: [foto(12)], criadoEm: ts(agora), atualizadoEm: ts(agora) });

// ---------- 3) quem não é dono não consegue ----------
console.log("Função");
const N = await navegador({ mobile: false });
await N.ctx.addInitScript(() => { window.__hfFuncoesEmulador = 5001; });
const chamar = (p, dados) => p.evaluate(async (dados) => {
  const m = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js");
  const f = m.getFunctions(window.firebaseApp, "southamerica-east1"); m.connectFunctionsEmulator(f, "127.0.0.1", 5001);
  try { return (await m.httpsCallable(f, "migrarFotos")(dados)).data; } catch (e) { return { erro: e.code }; }
}, dados);
const pa = await entrar(N.ctx, "ana", "sobre.html"); await pa.waitForTimeout(1500);
ok((await chamar(pa, { colecao: "diario", simular: true })).erro === "functions/permission-denied", "pessoa comum: recusado");
const pd = await entrar((await navegador()).ctx, "dani", "sobre.html"); await pd.waitForTimeout(1500);
ok((await chamar(pd, { colecao: "diario", simular: true })).erro === "functions/permission-denied", "moderação (não dono): recusado");

// ---------- 4) painel do dono ----------
console.log("Painel");
const A = await navegador({ mobile: false });
await A.ctx.addInitScript(() => { window.__hfFuncoesEmulador = 5001; });
const erros = [];
const p = await entrar(A.ctx, "admin", "admin.html#publicacoes");
p.on("pageerror", (x) => erros.push(x.message));
await p.waitForSelector(".ad-bt", { hasText: "Passar fotos" , timeout: 30000 }).catch(() => {});
const bt = p.locator(".ad-bt", { hasText: "Passar fotos para o Storage" });
ok(await bt.count() === 1, "botão \"Passar fotos para o Storage\" para o dono");
await bt.click();
await p.waitForSelector(".hf-confirma", { timeout: 60000 });
const conf = (await p.textContent(".hf-confirma")).replace(/\s+/g, " ");
ok(/Passar até \d+ fotos para o Storage\?/.test(conf) && /Diário: 2/.test(conf) && /Negócios: 3/.test(conf), "simulação mostra quantas fotos e onde: " + conf.slice(0, 160));
const antesSim = (await db.doc("diario/migrPost").get()).data();
ok(ehData(antesSim.mediaUrl), "simular não mexe em nada");
await p.locator(".hf-confirma .sim").click();
await p.waitForFunction(() => !/Passando|Contando/.test([...document.querySelectorAll(".ad-bt")].map((b) => b.textContent).join(" ")), null, { timeout: 120000 });
await p.waitForTimeout(1000);

// ---------- 5) resultado ----------
const d = (await db.doc("diario/migrPost").get()).data();
const ehLink = (v) => typeof v === "string" && /^http:\/\/127\.0\.0\.1:9199\/v0\/b\/[^/]+\/o\/[^?]+\?alt=media&token=[0-9a-f-]{36}$/.test(v);
ok(ehLink(d.mediaUrl) && d.midias[0] === d.mediaUrl && ehLink(d.midias[1]) && d.midias[1] !== d.mediaUrl, "Diário: links do Storage (a 1ª foto é o mesmo link nos dois campos)");
ok(d.texto === "foto antiga (migração)" && d.autorId === U.edu, "resto da publicação igual");
const baixada = await fetch(d.midias[1]).then((r) => r.arrayBuffer()).then((b) => Buffer.from(b)).catch(() => null);
ok(baixada && baixada.equals(lerData(foto(11)).bytes), "o arquivo do Storage é a mesma foto");
ok(decodeURIComponent(d.mediaUrl).includes(`/o/diario/${U.edu}/migrPost_`), "na pasta do autor (diario/uid/)");
const n = (await db.doc(`negocios/${U.bruno}_servicos`).get()).data();
ok(ehLink(n.foto) && ehLink(n.fotos[0]) && ehLink(n.itens[0].foto) && n.itens[0].preco === 80, "negócio: foto, galeria e item");
const u = (await db.doc(`usuarios/${U.ana}`).get()).data(), pp = (await db.doc(`perfis_publicos/${U.ana}`).get()).data();
ok(ehLink(u.fotoPerfil) && pp.fotoPerfil === u.fotoPerfil, "foto de perfil: a conta e o perfil público com o mesmo link (um envio só)");
ok(ehLink((await db.doc("comunidade/migrCom").get()).data().fotos[0]), "Comunidade");
const log = (await db.collection("admin_log").where("acao", "==", "migrar_fotos").get()).docs.map((x) => x.data());
ok(log.length >= 1, "registro de ações: " + (log.at(-1)?.detalhe || ""));
// 2ª vez: não tem mais nada
await bt.click();
await p.waitForTimeout(8000);
ok(await p.locator(".hf-confirma").count() === 0, "rodar de novo: nada para passar (só aviso)");
await p.screenshot({ path: "saida/migrar-fotos.png" });
ok(!erros.length, "sem erros " + erros.join(" | "));

// ---------- limpeza ----------
for (const c of criados) await db.doc(c).delete().catch(() => {});
for (const [k, v] of Object.entries(antes)) if (v) await db.doc(k).set(v); else await db.doc(k).delete().catch(() => {});
for (const x of (await db.collection("admin_log").where("acao", "==", "migrar_fotos").get()).docs) await x.ref.delete();
console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
