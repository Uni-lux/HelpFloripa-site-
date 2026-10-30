// Configurações do Flash em cartões (quem vê, onde publicar por padrão, respostas, câmera e vídeo, salvar, menções),
// "+" do Flash com a mesma cor no perfil e no Diário, e foto sem borda colorida quando não tem flash.
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, BASE } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
// Flash nos perfis de negócio só com plano (desde o PR #92): o Bruno precisa de um plano para o "Publicar em".
await db.doc(`planos/${U.bruno}`).set({ plano: "plus", meses: 1, ate: Timestamp.fromMillis(Date.now() + 30 * 864e5) });
const B = await navegador({ mobile: true, camera: true });
const p = await entrar(B.ctx, "bruno", "configuracoes.html");
await p.evaluate(() => localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" }))); await p.reload();
await p.waitForSelector("#cfgFlash", { timeout: 30000 }); await p.waitForTimeout(1200);
await p.locator("#cfgFlash").click();
await p.waitForSelector("#listaCorpo .cfg2-card", { timeout: 10000 }); await p.waitForTimeout(1500);
const tits = await p.locator("#listaCorpo .cfg2-card h3").allTextContents();
ok(tits.join("|") === "Seus flashes agora|Quem vê os seus flashes|Onde publicar por padrão|Respostas e reações|Câmera e vídeo|Arquivo e destaques|Menções", "cartões das configurações → " + tits.join(" / "));
await p.screenshot({ path: "saida/cfg-flash-1.png" });
// Onde publicar por padrão: Bruno Reparos ligado
await p.locator("#listaCorpo .cfg2-linha", { hasText: "Bruno Reparos" }).locator(".switch").click(); await p.waitForTimeout(800);
await p.locator("#listaCorpo .cfg2-linha", { hasText: "Abrir a câmera direto" }).locator(".switch").click(); await p.waitForTimeout(800);
await p.locator("#listaCorpo .cfg2-op", { hasText: "Só quem você segue" }).click(); await p.waitForTimeout(800);
const fc = (await db.doc(`usuarios/${U.bruno}`).get()).data().flashConfig;
ok(fc.ondeNegocios?.includes(`${U.bruno}_servicos`) && fc.cameraDireto === false && fc.respostas === "seguindo", "salvou onde publicar, câmera direto desligada e respostas → " + JSON.stringify(fc));
await p.locator("#listaCorpo .cfg2-card").nth(3).scrollIntoViewIfNeeded(); await p.screenshot({ path: "saida/cfg-flash-2.png" });
// Criador: não abre a câmera sozinho e já vem com Bruno Reparos marcado
await p.close(); // uma aba por navegador (o Firestore do teste trava com duas)
const pf = await entrar(B.ctx, "bruno", "usuarios.html");
await pf.waitForSelector("#meuPerfil .pf-mais-flash", { timeout: 30000 }); await pf.waitForTimeout(800);
const corMais = await pf.locator("#meuPerfil .pf-mais-flash").evaluate((e) => getComputedStyle(e).backgroundImage);
const corMaisFeed = await pf.evaluate(() => { const d = document.createElement("div"); d.className = "story-circ"; const m = document.createElement("span"); m.className = "mais"; d.appendChild(m); document.body.appendChild(d); const c = getComputedStyle(m).backgroundImage; d.remove(); return c; });
ok(/gradient/.test(corMais) && /0, 173, 238/.test(corMais) && corMais === corMaisFeed, "o + do perfil e o do Diário: o mesmo degradê azul");
const anel = await pf.locator("#meuPerfil .pf-anel").evaluate((e) => getComputedStyle(e).backgroundImage);
ok(anel === "none", "sem flash, a foto do perfil não tem anel colorido → " + anel.slice(0, 40));
const bolinha = await pf.locator("#meuPerfil [data-el=negocios] .vinculo .avatar").first().evaluate((e) => getComputedStyle(e).boxShadow + " | " + getComputedStyle(e).outlineColor);
ok(!/0, 173, 238|255, 122, 26|47, 191, 113|176, 102, 255/.test(bolinha), "bolinhas de negócio sem flash: borda neutra → " + bolinha.slice(0, 60));
await pf.screenshot({ path: "saida/cfg-perfil-sem-flash.png" });
await pf.locator("#meuPerfil .pf-mais-flash").tap(); await pf.waitForTimeout(1500);
ok(await pf.locator(".flash-criar .flash-cam-ui").count() === 0 && await pf.locator(".flash-criar .flash-escolher").count() === 1, "câmera direto desligada: o criador mostra Câmera/Galeria");
await pf.waitForFunction(() => /Bruno Reparos/.test(document.querySelector(".flash-dica")?.textContent || ""), null, { timeout: 8000 }).catch(() => {});
ok((await pf.locator(".flash-dica").textContent()).includes("Bruno Reparos"), "já vem marcado o Bruno Reparos (padrão) → " + await pf.locator(".flash-dica").textContent());
await B.browser.close();
