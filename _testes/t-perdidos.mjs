// Pedido de 18/11/2026: Help e alertas com o MESMO formulário de pet do Social (sem cores nos ícones), página compacta,
// telefones que ligam, "Perdidos" com Pets | Pessoas (desaparecidos com boletim, conferidos pela equipe, pistas) e as
// Regras da Comunidade numa janela na própria página.
// Uso: node seed.mjs | tail -1 > saida/seed-ids.json && node t-perdidos.mjs
import { navegador, entrar, BASE, USUARIOS } from "./nav.mjs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8085";
const db = getFirestore(initializeApp({ projectId: "demo-hf" }));
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const uid = (k) => USUARIOS[k]?.uid || USUARIOS[k];
for (const c of ["desaparecidos", "pistas_desap_autoria"]) for (const d of (await db.collection(c).get()).docs) await db.recursiveDelete(d.ref);
const erros = [];
const A = await navegador({ mobile: true });
await A.ctx.addInitScript(() => { window.__hfFuncoesEmulador = 5001; }); // desaparecidos pela função "roubos"
await A.ctx.grantPermissions(["geolocation"]); await A.ctx.setGeolocation({ latitude: -27.5954, longitude: -48.548 });
const p = await entrar(A.ctx, "ana", "alertas.html?aba=pets");
p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector('[data-acao="pet"]', { timeout: 25000 });
const tels = await p.locator(".al-tel").evaluateAll((l) => l.map((a) => a.getAttribute("href")));
ok(tels.join() === "tel:190,tel:192,tel:193,tel:180,tel:100", "telefones de emergência ligam (links tel:)");
const caberam = await p.locator(".al-tels").evaluate((e) => e.scrollWidth <= e.clientWidth + 1);
ok(caberam, "os 5 telefones cabem numa linha");
ok((await p.locator('.al-abas [data-aba="pets"]').textContent()) === "Perdidos" && await p.locator(".al-seg [data-quem]").count() === 2, "aba Perdidos com Pets | Pessoas");
await p.locator('[data-acao="pet"]').click(); await p.waitForSelector(".pc #pcNome");
ok(await p.locator(".pc .pc-rg").count() === 1, "cadastrar pet abre o MESMO formulário do Social (RG do pet)");
const cores = await p.locator(".pc-especies .hf-ic").evaluateAll((l) => [...new Set(l.map((i) => getComputedStyle(i).color))]);
ok(cores.length <= 2, `ícones das espécies sem cores próprias (${cores.length} cor/cores: texto e a marcada)`);
await p.keyboard.press("Escape"); await p.waitForTimeout(300);
await p.locator('[data-acao="achei"]').click(); await p.waitForSelector(".pc #pcOnde");
ok(await p.locator(".pc #pcNome").count() === 0 && (await p.locator(".pc-topo h3").textContent()) === "Encontrei um animal", "Encontrei um animal no mesmo modelo (sem nome, com 'onde encontrou')");
await p.keyboard.press("Escape"); await p.waitForTimeout(300);
// Pessoas
await p.locator('.al-seg [data-quem="pessoas"]').click(); await p.waitForSelector('[data-acao="desaparecido"]');
await p.locator('[data-acao="desaparecido"]').click(); await p.waitForSelector("#alDesNome");
await p.locator("#alDesNome").fill("Joana Silva"); await p.locator("#alDesIdade").fill("8");
await p.locator('[data-condicao="crianca"]').click();
await p.locator("#alDesDesc").fill("Cabelo cacheado, camiseta amarela e short jeans");
await p.locator("#alDesVisto").fill("Praça XV");
await p.locator('[data-parentesco="pais"]').click();
await p.locator("#alDesOk").click(); await p.waitForTimeout(500);
ok(/boletim/i.test(await p.locator(".toast").last().textContent().catch(() => "")), "sem boletim não envia");
await p.locator("#alDesBo").fill("2026/123456"); await p.locator("#alDesDeclaro").check();
await p.locator("#alDesOk").click(); await p.waitForTimeout(3000);
const des = (await db.collection("desaparecidos").get()).docs[0];
ok(des?.data().status === "analise" && des.data().bo === "2026/123456" && des.data().idade === 8, "aviso gravado em análise, com o boletim");
const sup = (await db.collection("suporte").where("uid", "==", uid("ana")).get()).docs.map((d) => d.data()).find((x) => /Desaparecimento/.test(x.assunto));
ok(sup?.prioridade === "urgente" && sup.categoria === "sos", "chamado urgente para a equipe conferir");
// Bruno não vê enquanto está em análise
const B = await navegador({ mobile: true });
await B.ctx.addInitScript(() => { window.__hfFuncoesEmulador = 5001; }); // desaparecidos pela função "roubos"
await B.ctx.grantPermissions(["geolocation"]); await B.ctx.setGeolocation({ latitude: -27.5954, longitude: -48.548 });
const pb = await entrar(B.ctx, "bruno", "alertas.html?aba=pets&quem=pessoas");
pb.on("pageerror", (e) => erros.push("bruno: " + e.message));
await pb.waitForSelector('[data-acao="desaparecido"]', { timeout: 25000 }); await pb.waitForTimeout(2000);
ok(await pb.locator(`[data-desaparecido="${des.id}"]`).count() === 0, "em análise: quem está perto ainda não vê");
// Painel publica
const C = await navegador({ mobile: false });
await C.ctx.addInitScript(() => { window.__hfFuncoesEmulador = 5001; }); // desaparecidos pela função "roubos"
const pa = await entrar(C.ctx, "admin", "admin.html#seguranca");
pa.on("pageerror", (e) => erros.push("painel: " + e.message));
await pa.waitForSelector('.ad-chip[data-aba="desaparecidos"]', { timeout: 30000 });
await pa.locator('.ad-chip[data-aba="desaparecidos"]').click(); await pa.waitForTimeout(400);
ok(/Conferir boletim/.test(await pa.locator("#principal").textContent()), "painel mostra o aviso para conferir o boletim");
await pa.locator(".ad-bt", { hasText: "Boletim conferido" }).click(); await pa.waitForTimeout(2000);
ok((await db.doc(`desaparecidos/${des.id}`).get()).data().status === "ativo", "equipe publicou");
await pb.reload(); await pb.waitForSelector(`[data-desaparecido="${des.id}"]`, { timeout: 20000 });
ok(true, "publicado: Bruno vê em Desaparecidos perto");
await pb.locator(`[data-desaparecido="${des.id}"]`).click(); await pb.waitForSelector("#alDesVi");
await pb.locator("#alDesVi").click(); await pb.locator("#alDesPista").fill("Vi perto do terminal, de mãos dadas com uma senhora");
await pb.locator("#alDesPistaOk").click(); await pb.waitForTimeout(2500);
const pis = (await db.collection(`desaparecidos/${des.id}/pistas`).get()).docs.map((d) => d.data());
ok(pis.length === 1 && pis[0].anonimo && Number.isFinite(pis[0].lat), "pista anônima com a localização aproximada");
ok((await db.doc(`pistas_desap_autoria/${des.id}_${(await db.collection(`desaparecidos/${des.id}/pistas`).get()).docs[0].id}`).get()).data()?.uid === uid("bruno"), "a equipe sabe quem mandou");
await p.reload(); await p.waitForSelector(`[data-desaparecido="${des.id}"]`, { timeout: 20000 });
await p.locator(`[data-desaparecido="${des.id}"]`).click(); await p.waitForTimeout(2500);
ok(/terminal/.test(await p.locator(".ent-folha").last().textContent()), "a família vê a pista");
// Regras da Comunidade na própria página
await p.goto(BASE + "mural.html"); await p.waitForSelector("#muRegras", { timeout: 20000 });
await p.locator("#muRegras").click(); await p.waitForTimeout(500);
ok(/mural\.html/.test(p.url()) && await p.locator("#folhaRegras.aberta").count() === 1, "Regras abrem numa janela na própria Comunidade");
ok(!erros.length, "sem erros: " + erros.join(" | "));
process.exit(process.exitCode || 0);
