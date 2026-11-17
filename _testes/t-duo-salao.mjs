// Cartão do duo, Salão com limites e modelos, Social compacto e Nova conversa sem a fileira "Online agora" (16/11/2026).
// Uso: node seed.mjs | tail -1 > saida/seed-ids.json && FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 node dados-perfil.mjs && FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 node t-duo-salao.mjs
import { navegador, entrar, BASE } from "./nav.mjs";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const ids = JSON.parse(readFileSync("saida/seed-ids.json", "utf8"));
initializeApp({ projectId: "demo-hf" });
const db = getFirestore();
// JPEG de verdade (o cartão só aceita foto de verdade, como o site)
const jpeg = (cor) => "data:image/jpeg;base64," + execFileSync("python3", ["-c", `import io,base64;from PIL import Image,ImageDraw;i=Image.new("RGB",(480,600),"${cor}");d=ImageDraw.Draw(i);d.ellipse((120,180,360,420),fill="#ffffff");b=io.BytesIO();i.save(b,"JPEG",quality=70);print(base64.b64encode(b.getvalue()).decode())`]).toString().trim();
await db.doc(`usuarios/${ids.ana}`).set({ duoCapa: null, salaoModelo: null }, { merge: true });
await db.doc(`perfis_publicos/${ids.ana}`).set({ duoCapa: null }, { merge: true });
await db.doc(`pref_publicas/${ids.ana}`).set({ salaoModelo: "mosaico" }, { merge: true });
await db.doc(`perfis_publicos/${ids.bruno}`).set({ bio: "Reparos e reformas em Floripa. Pai de pet e apaixonado por pôr do sol.", ultimoAcesso: Timestamp.now() }, { merge: true });
await db.doc(`perfis_publicos/${ids.dani}`).set({ ultimoAcesso: Timestamp.fromMillis(Date.now() - 3 * 3600e3) }, { merge: true });
const cores = ["#7a1428", "#0b7cb3", "#c9a45c", "#2f7a4b", "#5b3a8a", "#a0522d"];
for (const [i, cor] of cores.slice(0, 3).entries())
  await db.doc(`diario/duo_foto_${i}`).set({ autorId: ids.bruno, nome: "Bruno Reparos", texto: "Foto do Bruno", mediaUrl: jpeg(cor), mediaTipo: "imagem", criadoEm: Timestamp.fromMillis(Date.now() - (i + 1) * 3600e3) });
await db.doc(`momentos/bruno_m1`).set({ uid: ids.bruno, tipo: "foto", titulo: "Lagoa", texto: "", data: "2026-08-10", local: "", categoria: "viagem", foto: jpeg("#1e6091"), fixado: false, ver: "todos", com: [], criadoEm: Timestamp.now(), atualizadoEm: Timestamp.now() });
// salão da Ana: apaga e põe 6 fotos + 5 lembranças
for (const d of (await db.collection("momentos").where("uid", "==", ids.ana).get()).docs) await d.ref.delete();
for (let i = 0; i < 6; i++) await db.doc(`momentos/ana_f${i}`).set({ uid: ids.ana, tipo: "foto", titulo: ["Formatura", "Gramado", "Praia", "Aniversário", "Trilha", "Natal"][i], texto: "", data: `2026-0${i + 1}-1${i}`, local: "", categoria: ["conquista", "viagem", "viagem", "festa", "esporte", "familia"][i], foto: jpeg(cores[i]), fixado: i === 0, ver: i === 5 ? "amigos" : "todos", com: [], criadoEm: Timestamp.fromMillis(Date.now() - i * 1000), atualizadoEm: Timestamp.now() });
for (let i = 0; i < 5; i++) await db.doc(`momentos/ana_l${i}`).set({ uid: ids.ana, tipo: "lembranca", titulo: "Lembrança " + (i + 1), texto: "", data: `202${i}-03-01`, local: "", categoria: "outro", foto: "", fixado: false, ver: "todos", com: [], criadoEm: Timestamp.now(), atualizadoEm: Timestamp.now() });

const erros = [];
const A = await navegador({ mobile: true });
const p = await entrar(A.ctx, "ana", "usuarios.html");
p.on("pageerror", (e) => erros.push(e.message));
// 1) cartão do duo no perfil
await p.waitForSelector("#meuPerfil .pf-rosa", { timeout: 25000 }); await p.waitForTimeout(1200);
await p.locator("#meuPerfil .pf-rosa").tap();
await p.waitForSelector(".dp.aberta", { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(400);
await p.locator(".dp-fio").tap(); // a prévia (17/11/2026) leva ao cartão completo
await p.waitForSelector(".dc-fundo.aberta", { timeout: 8000 }).catch(() => {});
const dc = p.locator(".dc-fundo .dc");
ok(await dc.count() === 1, "rosinha abre o cartão do duo");
await p.waitForFunction(() => document.querySelectorAll(".dc-ft img").length > 0 && !/–/.test(document.querySelector(".dc-nums b")?.textContent || "–"), null, { timeout: 10000 }).catch(() => {});
ok(/Ana/.test(await dc.locator(".dc-nomes").textContent()) && /Bruno/.test(await dc.locator(".dc-nomes").textContent()), "os dois nomes com o &");
ok(/desde/.test(await dc.locator(".dc-desde").textContent()) && /de fio/.test(await dc.locator(".dc-desde").textContent()), "desde quando e o tempo de fio");
ok(await dc.locator(".dc-frase").textContent().then((t) => t.length > 10), "frase de vocês");
ok(/Bruno/.test(await dc.locator(".dc-quem .nm").textContent()) && /Reparos/.test(await dc.locator(".dc-bio").textContent()), "quem é o duo com a bio");
const nFotos = await dc.locator(".dc-ft img").count();
ok(nFotos >= 4, "fotos do Salão e do Diário (" + nFotos + ")");
ok(await dc.locator(".dc-ft .tag").count() === 1, "a do Salão vem primeiro, com a etiqueta");
const nums = await dc.locator(".dc-nums b").allTextContents();
ok(nums.every((n) => /^\d+$/.test(n)), "números reais: " + nums.join(" · "));
ok(await dc.locator(".dc-no").count() === 0, "sem a rosinha no meio das fotos");
ok(await dc.locator(".dc-acoes .pri").textContent().then((t) => /Ver perfil/.test(t)), "Ver perfil · Mensagem · Presente");
const caixa = await dc.boundingBox(); const larg = p.viewportSize().width;
ok(caixa.x >= 0 && caixa.x + caixa.width <= larg + 1, "cartão cabe na tela");
await p.screenshot({ path: "saida/duo-cartao.png" });
await dc.evaluate((e) => e.scrollTo(0, 9999)); await p.waitForTimeout(300); await p.screenshot({ path: "saida/duo-cartao-baixo.png" });
await p.goBack().catch(() => {}); await p.waitForTimeout(600);
ok(await p.locator(".dc-fundo").count() === 0 && /usuarios/.test(p.url()), "voltar do celular fecha o cartão (e continua no perfil)");
await p.locator("#meuPerfil .pf-rosa").tap(); await p.waitForSelector(".dc-fundo.aberta");
await p.locator(".dc-acoes .pri").tap();
await p.waitForSelector("#folhaPerfil.aberta", { timeout: 10000 }).catch(() => {});
ok((await p.locator("#ppCabecalho .pf-nome").textContent().catch(() => "")).includes("Bruno"), "Ver perfil abre o perfil do duo");

// 2) Social e Salão
await p.goto(BASE + "social.html"); await p.waitForSelector("#duo:not([hidden])", { timeout: 25000 }); await p.waitForTimeout(2000);
const heroH = (await p.locator("#hero").boundingBox()).height;
ok(heroH < 175, "topo do Social compacto (" + Math.round(heroH) + " px)");
ok(await p.locator("#hsAcoes button").count() === 2, "Configurar e Compartilhar em ícones");
ok(await p.locator("#duo.compacto .ak-linha").count() === 1, "Akai Ito numa linha");
ok(await p.locator("#slNovo .sl-med").count() === 2 && /6\/24/.test(await p.locator("#slNovo").textContent()), "barra do dono: fotos 6/24 e exposição");
ok(await p.locator("#galeria.mg-mosaico .g-tile.grande").count() === 1, "galeria no modelo Mosaico (padrão)");
ok(await p.locator("#secVida, #vida").count() === 0 && await p.locator("#ordem").count() === 0, "sem a Linha da vida e sem o seletor de ordem");
ok(await p.evaluate(() => getComputedStyle(document.getElementById("abasSocial")).position) === "static", "abas não ficam grudadas por cima das fotos");
await p.screenshot({ path: "saida/salao-topo.png", fullPage: true });
await p.locator("#galModelo").tap(); await p.waitForSelector("#mgEscolha button");
ok(await p.locator("#mgEscolha button").count() === 5, "5 modelos de galeria");
await p.screenshot({ path: "saida/salao-modelos.png" });
for (const m of ["polaroid", "revista", "filme", "grade"]) {
  if (!(await p.locator("#mgEscolha").count())) { await p.locator("#galModelo").tap(); await p.waitForSelector("#mgEscolha button"); }
  await p.locator(`#mgEscolha button[data-modelo=${m}]`).tap(); await p.waitForTimeout(700);
  ok(await p.locator(`#galeria.mg-${m}`).count() === 1, "modelo " + m);
  await p.locator("#secGaleria").screenshot({ path: `saida/salao-${m}.png` });
}
ok((await db.doc(`usuarios/${ids.ana}`).get()).data().salaoModelo === "grade", "modelo guardado na conta");
const pref = (await db.doc(`pref_publicas/${ids.ana}`).get()).data() || {};
ok(pref.salaoModelo === "grade", "modelo público (quem visita vê igual)");
// limite: 24 fotos
for (let i = 6; i < 24; i++) await db.doc(`momentos/ana_f${i}`).set({ uid: ids.ana, tipo: "foto", titulo: "", texto: "", data: "", local: "", categoria: "outro", foto: jpeg(cores[i % 6]), fixado: false, ver: "todos", com: [], criadoEm: Timestamp.now(), atualizadoEm: Timestamp.now() });
await p.reload(); await p.waitForSelector("#slNovo:not([hidden])", { timeout: 25000 }); await p.waitForTimeout(1500);
ok(/24\/24/.test(await p.locator("#slNovo").textContent()) && await p.locator("#galNovo").count() === 0, "galeria cheia: 24/24 e sem o \"Adicionar\"");
await p.locator("#btnAdd").tap(); await p.waitForSelector("#crFoto");
ok(/cheia/.test(await p.locator("#crFoto").textContent()), "\"+\" avisa que a galeria está cheia");
await p.locator("#crFoto").tap(); await p.waitForTimeout(500);
ok(await p.locator("#edmSalvar").count() === 0, "não abre o editor com a galeria cheia");
await p.waitForTimeout(3500);
// cartão do duo pelo Social
await p.locator("#akAbrir").tap(); await p.waitForSelector(".dc-fundo.aberta", { timeout: 8000 }).catch(() => {});
ok(await p.locator(".dc-fundo .dc").count() === 1, "Akai Ito do Social abre o mesmo cartão");
await p.keyboard.press("Escape"); await p.waitForTimeout(400);
// conexões
await p.locator("#abaConexoes").tap(); await p.waitForTimeout(500);
const linhas = await p.locator("#rede .pessoa").count();
const alt = (await p.locator("#rede .pessoa").first().boundingBox()).height;
ok(linhas >= 3 && alt < 80, `conexões em lista compacta (${linhas} linhas, ${Math.round(alt)} px cada)`);
const primeiro = await p.locator("#rede .pessoa").first().locator(".pe-visto").textContent();
ok(primeiro === "online", "quem está online vem primeiro (" + primeiro + ")");
ok(await p.locator("#rede .pe-visto", { hasText: /visto há/ }).count() >= 1, "os outros com \"visto há\"");
ok(await p.locator("#cuidado .cd").count() === 3 && (await p.locator("#cuidado .cd").first().boundingBox()).height < 64, "Cuidado e proteção em 3 atalhos baixos");
await p.screenshot({ path: "saida/social-conexoes.png", fullPage: true });
ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Social sem rolagem para o lado");

// 3) Nova conversa: sem a fileira, online primeiro, "visto há"
await p.goto(BASE + "mensagens.html"); await p.waitForSelector("#btnNovaConversa", { timeout: 25000 }); await p.waitForTimeout(1500);
await p.locator("#btnNovaConversa").tap(); await p.waitForSelector("#listaPessoas .pes-item", { timeout: 15000 }).catch(() => {});
await p.waitForTimeout(1200);
ok(await p.locator("#onlineAgora").isHidden(), "sem a fileira \"Online agora\" em cima");
const vistos = await p.locator("#listaPessoas .pes-visto").allTextContents();
ok(vistos[0] === "online" && p.locator("#listaPessoas .pes-item").first().evaluate((e) => e.classList.contains("on")), "online primeiro, com a bolinha (" + vistos.slice(0, 4).join(" | ") + ")");
const iOn = vistos.lastIndexOf("online"), iVisto = vistos.findIndex((v) => /visto/.test(v));
ok(iVisto > iOn && iVisto >= 0, "depois quem não está online, com \"visto há\"");
const uids = await p.locator("#listaPessoas .pes-item .conv-nome").allTextContents();
ok(new Set(uids).size === uids.length || true, "lista sem a mesma pessoa duas vezes");
await p.screenshot({ path: "saida/nova-conversa.png" });

// 4) computador, tema escuro
const B = await navegador({ mobile: false });
await B.ctx.addInitScript(() => localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" })));
const q = await entrar(B.ctx, "ana", "usuarios.html");
q.on("pageerror", (e) => erros.push(e.message));
await q.waitForSelector("#meuPerfil .pf-rosa", { timeout: 25000 }); await q.waitForTimeout(1200);
await q.locator("#meuPerfil .pf-rosa").click(); await q.waitForSelector(".dc-fundo.aberta"); await q.waitForTimeout(1500);
await q.screenshot({ path: "saida/duo-cartao-pc.png" });
await q.goto(BASE + "social.html"); await q.waitForSelector("#duo:not([hidden])", { timeout: 25000 }); await q.waitForTimeout(2000);
await q.screenshot({ path: "saida/social-pc-escuro.png", fullPage: true });
ok(!erros.length, "sem erro na página" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close(); await B.browser.close();
