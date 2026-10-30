// Flash como no Instagram, parte 2: arquivo, destaques no perfil, pincel, emoji, hashtag, fundo do texto e o sino.
// - Arquivo: depois de 24 h o flash fica guardado (só o autor vê); "Ver o arquivo" no perfil e nas configurações.
// - Destaques: Novo (escolhe no arquivo + nome), Destacar no visor, editar (segurar), quem visita vê e abre.
// - Criador: pincel (caneta/marca-texto/neon/borracha, desfazer), figurinhas Emoji e Hashtag, fundo do texto em 3 estilos.
// - Sino: estrela no seu flash aparece nas notificações ("deu uma estrela no seu flash").
// Uso: node t-flash-destaques.mjs (rodar seed.mjs antes; regras do repositório no emulador)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, BASE, garantirImagem } from "./nav.mjs";
import { readFileSync } from "node:fs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const PX = "data:image/png;base64," + readFileSync(garantirImagem("saida/foto-fd.png", 1080, 1920)).toString("base64");
for (const u of [U.ana, U.bruno]) {
  for (const s of (await db.collection("stories").where("autorId", "==", u).get()).docs) await s.ref.delete();
  for (const s of (await db.collection("destaques").where("uid", "==", u).get()).docs) await s.ref.delete();
}
const velhos = [];
for (let k = 0; k < 2; k++) velhos.push((await db.collection("stories").add({ autorId: U.ana, nome: "Ana Souza", tipo: "imagem", midia: PX, criadoEm: Timestamp.fromMillis(Date.now() - (50 - k) * 3600e3) })).id);
const noAr = (await db.collection("stories").add({ autorId: U.ana, nome: "Ana Souza", tipo: "imagem", midia: PX, criadoEm: Timestamp.fromMillis(Date.now() - 30 * 60000) })).id;
await db.doc(`relacoes/${U.bruno}_${U.ana}`).set({ tipo: "seguir", seguidorId: U.bruno, alvoId: U.ana, criadoEm: Timestamp.now() });

const A = await navegador({ mobile: true });
const p = await entrar(A.ctx, "ana", "usuarios.html");
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector("#meuPerfil .pf-destaques", { timeout: 20000 }); await p.waitForTimeout(800);

// ---------- 1) arquivo ----------
ok(await p.locator("#meuPerfil .pf-dq.novo").count() === 1 && await p.locator("#meuPerfil .pf-dq.arquivo").count() === 1, "perfil: fileira de destaques com Novo e Arquivo");
await p.locator("#meuPerfil .pf-dq.arquivo").tap();
await p.waitForSelector(".dq-grade .dq-tile", { timeout: 8000 }); await p.waitForTimeout(500);
ok(await p.locator(".dq-tile").count() === 3, `arquivo: os 3 flashes (2 de mais de 24 h) → ${await p.locator(".dq-tile").count()}`);
ok(await p.locator(".dq-tile .dq-ar").count() === 1, "arquivo: o que está no ar tem o selo 'No ar'");
await p.screenshot({ path: "saida/fd-arquivo.png" });
await p.locator(".dq-tile").nth(2).tap(); await p.waitForSelector(".story-visor", { timeout: 8000 }); await p.waitForTimeout(500);
ok(/\d+ [a-z]{3}/.test(await p.locator(".story-nome small").textContent()), "arquivo: abre o flash antigo com a data → " + await p.locator(".story-nome small").textContent());
await p.locator(".story-btn[aria-label='Fechar']").tap(); await p.waitForTimeout(700);
ok(await p.locator("#folhaLista.aberta .dq-grade").count() === 1, "fechar o flash volta para o arquivo");
await p.locator("#folhaLista.aberta [data-fechar]").first().click().catch(() => {}); await p.waitForTimeout(400);

// ---------- 2) novo destaque ----------
await p.locator("#meuPerfil .pf-dq.novo").tap();
await p.waitForSelector(".dq-tile", { timeout: 8000 }); await p.waitForTimeout(400);
await p.locator(".dq-tile").nth(1).tap(); await p.locator(".dq-tile").nth(2).tap();
ok((await p.locator(".dq-ok").textContent()).includes("(2)"), "novo destaque: escolheu 2 flashes no arquivo");
await p.locator(".dq-ok").tap(); await p.waitForSelector(".dq-campo", { timeout: 5000 });
await p.locator(".dq-campo").fill("Viagem"); await p.locator(".dq-ok").tap(); await p.waitForTimeout(1800);
const dqs = (await db.collection("destaques").where("uid", "==", U.ana).get()).docs.map((d) => d.data());
ok(dqs.length === 1 && dqs[0].nome === "Viagem" && dqs[0].ids.length === 2 && /^data:image\/jpeg/.test(dqs[0].capaMini || ""), "destaque gravado com 2 flashes e a miniatura da capa");
const marc = await Promise.all(velhos.map((id) => db.doc(`stories/${id}`).get().then((d) => d.data().destacado)));
ok(marc.every(Boolean), "os flashes do destaque ficam marcados como destacados (visíveis depois das 24 h)");
await p.waitForTimeout(600);
ok(await p.locator("#meuPerfil .pf-dq", { hasText: "Viagem" }).count() === 1 && await p.locator("#meuPerfil .pf-dq", { hasText: "Viagem" }).locator("img").count() === 1, "perfil: o destaque 'Viagem' aparece com a capa");
await p.screenshot({ path: "saida/fd-perfil.png" });

// ---------- 3) destacar pelo visor ----------
await p.goto(BASE + `feed.html?flash=${noAr}`); await p.waitForSelector(".story-visor .story-destacar", { timeout: 10000 });
await p.locator(".story-destacar").tap(); await p.waitForSelector(".dq-fila .pf-dq", { timeout: 8000 }); await p.waitForTimeout(400);
await p.locator(".dq-fila .pf-dq", { hasText: "Viagem" }).tap(); await p.waitForTimeout(1500);
ok((await db.collection("destaques").where("uid", "==", U.ana).get()).docs[0].data().ids.includes(noAr), "Destacar no visor: o flash entrou em 'Viagem'");
await p.screenshot({ path: "saida/fd-destacar.png" });
await p.locator("#folhaLista.aberta [data-fechar]").first().click(); await p.waitForTimeout(400);

// ---------- 4) editar (segurar) ----------
await p.goto(BASE + "usuarios.html"); await p.waitForSelector("#meuPerfil .pf-dq", { hasText: "Viagem", timeout: 15000 }); await p.waitForTimeout(800);
await p.locator("#meuPerfil .pf-dq", { hasText: "Viagem" }).scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
const bv = await p.locator("#meuPerfil .pf-dq", { hasText: "Viagem" }).boundingBox();
await p.mouse.move(bv.x + bv.width / 2, bv.y + 20); await p.mouse.down(); await p.waitForTimeout(700); await p.mouse.up();
await p.waitForSelector(".dq-campo", { timeout: 8000 }); await p.waitForTimeout(600);
ok(await p.locator(".dq-grade .dq-tile").count() === 3, "segurar o destaque abre a edição com os 3 flashes");
await p.locator(".dq-campo").fill("Viagens 2026"); await p.locator(".dq-ok").tap(); await p.waitForTimeout(1500);
ok((await db.collection("destaques").where("uid", "==", U.ana).get()).docs[0].data().nome === "Viagens 2026", "editar: nome trocado");
await A.browser.close();

// ---------- 5) Bruno visita a Ana ----------
await db.doc(`stories/${noAr}/reacoes/${U.bruno}`).set({ curtiu: true, emoji: "🔥", em: Timestamp.now() });
const B = await navegador({ mobile: true });
const pb = await entrar(B.ctx, "bruno", `usuarios.html?perfil=${U.ana}`);
pb.on("pageerror", (e) => erros.push("bruno: " + e.message));
await pb.waitForSelector("#folhaPerfil .pf-dq", { timeout: 20000 }); await pb.waitForTimeout(800);
ok(await pb.locator("#folhaPerfil .pf-dq.novo, #folhaPerfil .pf-dq.arquivo").count() === 0 && await pb.locator("#folhaPerfil .pf-dq", { hasText: "Viagens 2026" }).count() === 1, "visitante vê o destaque (sem Novo/Arquivo)");
ok(await pb.locator("#folhaPerfil .com-flash").count() >= 1, "visitante vê o anel do flash no ar");
await pb.locator("#folhaPerfil .pf-dq", { hasText: "Viagens 2026" }).tap();
await pb.waitForSelector(".story-visor", { timeout: 10000 }); await pb.waitForTimeout(800);
ok((await pb.locator(".story-nome strong").textContent()) === "Viagens 2026" && await pb.locator(".story-barra").count() === 3, "visitante abre o destaque: nome no topo e os 3 flashes");
await pb.screenshot({ path: "saida/fd-visitante.png" });
await B.browser.close();

// ---------- 6) sino da Ana: estrela no flash ----------
const A2 = await navegador({ mobile: true });
const pn = await entrar(A2.ctx, "ana", "notificacoes.html");
await pn.waitForTimeout(4000);
const txt = await pn.locator("body").innerText();
ok(/estrela e reagiu com 🔥 ao seu flash|deu uma estrela no seu flash/.test(txt), "Notificações: 'deu uma estrela e reagiu com 🔥 ao seu flash'");
await pn.screenshot({ path: "saida/fd-sino.png" });

// ---------- 7) criador: pincel, emoji, hashtag, fundo do texto ----------
await pn.goto(BASE + "feed.html"); await pn.waitForTimeout(3000);
await pn.locator(".story-circ").first().locator(".mais").tap();
await pn.waitForSelector(".flash-criar", { timeout: 8000 });
const [fc] = await Promise.all([pn.waitForEvent("filechooser", { timeout: 8000 }), pn.locator(".flash-esc-btn", { hasText: "Galeria" }).click()]);
await fc.setFiles("saida/foto-fd.png"); await pn.waitForSelector(".flash-fotobox", { timeout: 8000 }); await pn.waitForTimeout(600);
await pn.locator(".flash-ferr-btn[aria-label='Desenhar']").tap(); await pn.waitForSelector(".flash-pincel", { timeout: 4000 });
ok(await pn.locator(".fp-modo").count() === 4, "pincel: caneta, marca-texto, neon e borracha");
const pal = await pn.locator(".flash-palco").boundingBox();
await pn.locator(".fp-modo[data-modo='neon']").tap(); await pn.locator(".fp-cores button").nth(5).tap();
await pn.mouse.move(pal.x + 80, pal.y + 300); await pn.mouse.down();
for (let k = 1; k <= 10; k++) await pn.mouse.move(pal.x + 80 + k * 18, pal.y + 300 + k * 6);
await pn.mouse.up(); await pn.waitForTimeout(200);
const tinta = await pn.locator(".flash-desenho").evaluate((c) => { const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; });
ok(tinta > 200, "pincel: o traço aparece no cartão (" + tinta + " pontos)");
await pn.screenshot({ path: "saida/fd-pincel.png" });
await pn.locator(".flash-pincel .fe-pronto").tap(); await pn.waitForTimeout(200);
// emoji e hashtag
await pn.locator(".flash-ferr-btn[aria-label^='Figurinhas']").tap(); await pn.waitForTimeout(300);
await pn.locator(".fig-op", { hasText: "Emoji" }).tap(); await pn.locator(".fig-emojis button").first().tap(); await pn.waitForTimeout(200);
ok(await pn.locator(".flash-camada .flash-txt", { hasText: "😍" }).count() === 1, "figurinha de emoji no cartão");
await pn.locator(".flash-ferr-btn[aria-label^='Figurinhas']").tap(); await pn.waitForTimeout(300);
await pn.locator(".fig-op", { hasText: "Hashtag" }).tap(); await pn.locator(".flash-figs .fe-local").fill("#floripa"); await pn.locator(".fe-linha-local .fe-pronto").tap(); await pn.waitForTimeout(200);
ok(await pn.locator(".flash-camada .fig-hashtag", { hasText: "#floripa" }).count() === 1, "figurinha de hashtag no cartão");
// fundo do texto: cor cheia → escuro transparente
await pn.locator(".flash-ferr-btn[aria-label='Escrever na foto']").tap();
await pn.locator(".fe-campo").fill("Bom dia");
await pn.locator(".flash-ferr-btn.destaque").tap(); await pn.locator(".flash-ferr-btn.destaque").tap();
ok(await pn.locator(".flash-ferr-btn.destaque.vidro").count() === 1, "fundo do texto: 3º estilo (escuro transparente)");
await pn.locator(".flash-edtxt .fe-pronto").tap(); await pn.waitForTimeout(200);
await pn.screenshot({ path: "saida/fd-criador.png" });
await pn.locator(".flash-publicar").tap();
await pn.waitForSelector(".flash-criar", { state: "detached", timeout: 15000 }).catch(() => {});
const novo = (await db.collection("stories").where("autorId", "==", U.ana).get()).docs.map((d) => d.data()).sort((a, b) => b.criadoEm.toMillis() - a.criadoEm.toMillis())[0];
ok(novo && /^data:image\/jpeg/.test(novo.midia) && Date.now() - novo.criadoEm.toMillis() < 60000, "publicou o flash com o desenho e as figurinhas");

ok(!erros.length, "sem erros na página " + erros.join(" | "));
await A2.browser.close();
