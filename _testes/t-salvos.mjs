// Perfil (parte 9): "+" do Flash na foto, lista de seguidores com abas/busca/filtros, Salvos com coleções e
// ícone dos atalhos do Explorar sem cobrir o nome.
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const agora = Date.now();
const seguir = (a, b, h) => db.doc(`relacoes/${U[a]}_${U[b]}`).set({ tipo: "seguir", seguidorId: U[a], alvoId: U[b], criadoEm: Timestamp.fromMillis(agora - h * 3600e3) });
await seguir("bruno", "ana", 1); await seguir("dani", "ana", 2); await seguir("ana", "bruno", 3); await seguir("ana", "edu", 4); await seguir("ana", "fabi", 5); await seguir("fabi", "ana", 6);
const foto = "data:image/svg+xml;base64," + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="50"><rect width="40" height="50" fill="#2a7"/></svg>').toString("base64");
for (let i = 0; i < 5; i++) await db.doc(`diario/sv${i}`).set({ autorId: U.bruno, nome: "Bruno Lima", texto: i === 4 ? "Texto salvo para ler depois" : "Foto " + i, ...(i < 4 ? { mediaUrl: foto, mediaTipo: "imagem" } : {}), criadoEm: Timestamp.fromMillis(agora - i * 3600e3) });
await db.doc(`usuarios/${U.ana}`).set({ salvos: ["sv4", "sv3", "sv2", "sv1", "sv0"], colecoes: [] }, { merge: true });

const A = await navegador({ mobile: true });
const pa = await entrar(A.ctx, "ana", "usuarios.html");
await pa.evaluate(() => localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" }))); await pa.reload();
await pa.waitForSelector("#meuPerfil .pf2 .pf-acoes .btn", { timeout: 30000 }); await pa.waitForTimeout(2000);
// "+" na foto abre o criador do Flash
ok(await pa.locator("#meuPerfil .pf-mais-flash").count() === 1, "meu perfil: botão + do Flash na foto");
await pa.screenshot({ path: "saida/s-perfil-mais.png" });
await pa.locator("#meuPerfil .pf-mais-flash").tap(); await pa.waitForTimeout(800);
ok(await pa.locator(".flash-criar").count() === 1, "tocar no + abre o criador do Flash");
await pa.keyboard.press("Escape"); await pa.waitForTimeout(300);
await pa.evaluate(() => document.querySelectorAll(".flash-criar").forEach((e) => e.remove()));
// Foto grande: lápis e "Novo flash"
const ab = await pa.locator("#meuPerfil .pf-anel").boundingBox();
await pa.mouse.move(ab.x + ab.width / 2, ab.y + ab.height / 3); await pa.mouse.down(); await pa.waitForTimeout(650); await pa.mouse.up();
await pa.waitForSelector(".foto-grande", { timeout: 3000 }).catch(() => {});
const rots = await pa.locator(".foto-grande .fg-rot").allTextContents();
ok(rots[0] === "Novo flash" && await pa.locator(".foto-grande .fg-lapis").count() === 1, "foto grande: lápis + Novo flash → " + rots.join(" / "));
await pa.screenshot({ path: "saida/s-foto-grande.png" });
await pa.locator(".foto-grande .fg-fechar").click(); await pa.waitForTimeout(400);
// Seguidores: abas, chips, busca
await pa.locator("#meuPerfil [data-stat=seguidores]").tap();
await pa.waitForSelector("#listaCorpo .rel-lista .linha", { timeout: 10000 });
const nSeg = await pa.locator("#listaCorpo .rel-lista .linha").count();
ok(nSeg === 3, "seguidores: 3 pessoas → " + nSeg);
const chips = await pa.locator("#listaCorpo .rel-chip").allTextContents();
ok(chips.join("|") === "Todos3|Você não segue de volta1|Mútuos2", "chips dos seguidores → " + chips.join(" / "));
await pa.locator("#listaCorpo .rel-chip", { hasText: "não segue de volta" }).tap(); await pa.waitForTimeout(300);
ok((await pa.locator("#listaCorpo .rel-lista .linha strong").allTextContents()).join().startsWith("Dani"), "filtro 'não segue de volta' mostra só a Dani");
await pa.screenshot({ path: "saida/s-seguidores-filtro.png" });
await pa.locator("#listaCorpo .rel-chip", { hasText: "Todos" }).tap();
await pa.locator("#listaCorpo .rel-busca input").fill("bru"); await pa.waitForTimeout(400);
ok((await pa.locator("#listaCorpo .rel-lista .linha strong").allTextContents()).join().startsWith("Bruno"), "busca 'bru' acha o Bruno");
await pa.locator("#listaCorpo .rel-limpar").tap(); await pa.waitForTimeout(300);
await pa.locator("#listaCorpo .rel-aba", { hasText: "Seguindo" }).tap();
await pa.waitForSelector("#listaCorpo .rel-chip", { timeout: 8000 }); await pa.waitForTimeout(800);
const chips2 = await pa.locator("#listaCorpo .rel-chip").allTextContents();
ok(chips2.join("|") === "Todos3|Não seguem você de volta1|Mútuos2", "aba Seguindo → " + chips2.join(" / "));
ok(await pa.locator("#listaCorpo .rel-selo").count() === 2, "selo 'Segue você' em quem segue de volta");
await pa.screenshot({ path: "saida/s-seguindo.png" });
await pa.locator("#folhaLista [data-fechar]").click(); await pa.waitForTimeout(400);
// Salvos: coleções
await pa.locator(".abas-perfil button[data-aba=salvos]").tap();
await pa.waitForSelector("#gradeSalvos .col-cartao", { timeout: 10000 }); await pa.waitForTimeout(800);
ok(await pa.locator("#gradeSalvos .sv-grade .tile").count() === 5 && await pa.locator("#gradeSalvos .sv-autor").count() === 4, "Salvos: 5 itens, fotos com quem publicou");
ok((await pa.locator("#gradeSalvos .rel-chip").allTextContents()).join("|") === "Tudo5|Fotos4|Textos1", "filtros Tudo/Fotos/Textos");
await pa.screenshot({ path: "saida/s-salvos.png" });
await pa.locator("#gradeSalvos .col-criar").tap();
await pa.locator("#listaCorpo .col-nova input").fill("Ideias"); await pa.locator("#listaCorpo .col-nova button").tap();
await pa.waitForSelector("#gradeSalvos .sv-col-topo", { timeout: 6000 });
ok((await pa.locator("#gradeSalvos .sv-col-tx strong").textContent()) === "Ideias", "nova coleção criada e aberta");
await pa.locator("#gradeSalvos .icone-btn[aria-label^=Voltar]").tap(); await pa.waitForTimeout(800);
await pa.locator("#gradeSalvos .sv-grade .tile").first().locator(".sv-marca").tap();
await pa.locator("#opcoesCorpo button", { hasText: "Salvar em uma coleção" }).tap(); await pa.waitForTimeout(300);
await pa.locator("#listaCorpo .col-linha", { hasText: "Ideias" }).tap(); await pa.waitForTimeout(1200);
ok(await pa.locator("#listaCorpo .col-linha.dentro").count() === 1, "salvar em 'Ideias' marca a coleção");
await pa.screenshot({ path: "saida/s-salvar-em.png" });
await pa.locator("#folhaLista [data-fechar]").click(); await pa.waitForTimeout(900);
const salvo = await db.doc(`usuarios/${U.ana}`).get();
ok(salvo.data().colecoes?.[0]?.nome === "Ideias" && salvo.data().colecoes[0].ids.length === 1, "coleção gravada em usuarios/{uid}.colecoes");
ok((await pa.locator("#gradeSalvos .col-cartao").nth(1).locator("small").textContent()) === "1 item", "cartão da coleção mostra 1 item");
await pa.screenshot({ path: "saida/s-salvos-colecao.png" });
// Explorar: ícone do atalho não cobre o nome
const pf = await entrar(A.ctx, "ana", "feed.html");
await pf.locator("[data-aba=explorar]").first().tap(); await pf.waitForTimeout(1200);
const sobre = await pf.locator(".atalho-classe").evaluateAll((l) => l.map((a) => { const i = a.querySelector(".ic").getBoundingClientRect(), s = a.querySelector("strong").getBoundingClientRect(); return i.bottom <= s.top + 1; }));
ok(sobre.length === 6 && sobre.every(Boolean), "atalhos do Explorar: ícone acima do nome → " + sobre.join(","));
await pf.locator(".atalhos-classes").first().screenshot({ path: "saida/s-atalhos.png" });
await A.browser.close();
