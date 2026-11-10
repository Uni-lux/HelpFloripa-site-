// Tema claro/escuro trocado numa aba da rede vale também no Mensagens (que fica aberto noutro quadro) e Comunidade neutra
// com fundo preto nas abas (10/11/2026). Uso: node t-tema-rede.mjs (rodar seed.mjs antes)
import { navegador, entrar } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const A = await navegador({ mobile: true, rede: true });
await A.ctx.addInitScript(() => { try { if (!localStorage.getItem("hf-t-tema")) { localStorage.setItem("hf-t-tema", "1"); localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" })); } } catch {} });
const p = await entrar(A.ctx, "ana", "feed.html");
await p.waitForURL(/rede\.html/, { timeout: 15000 }).catch(() => {});
for (let i = 0; i < 60 && (await p.evaluate(() => [...document.querySelectorAll(".hf-quadro")].filter((q) => q.dataset.carregou).length)) < 4; i++) await p.waitForTimeout(500);
await p.waitForTimeout(2000);
const quadro = (re) => p.frames().find((f) => f.parentFrame() && re.test(f.url()));
const tema = (re) => quadro(re).evaluate(() => document.documentElement.dataset.theme);
ok(await tema(/mensagens/) === "dark", "Mensagens começa escuro");
const fundo = await quadro(/feed/).evaluate(() => getComputedStyle(document.body).backgroundColor);
ok(fundo === "rgb(11, 16, 20)", "abas da rede com o fundo do Mensagens (#0b1014): " + fundo);
await p.evaluate(() => window.__hfShell.ir("comunidade")); await p.waitForTimeout(1200);
await p.screenshot({ path: "saida/tema-comunidade-escuro.png" });
// troca o tema pelo menu de outra aba (grava hf-chat-config) — como em Configurações → Tema
await quadro(/feed/).evaluate(() => { const c = JSON.parse(localStorage.getItem("hf-chat-config") || "{}"); c.tema = "claro"; localStorage.setItem("hf-chat-config", JSON.stringify(c)); document.documentElement.dataset.theme = "light"; });
await p.waitForTimeout(700);
ok(await tema(/mensagens/) === "light", "Mensagens acompanha o tema claro sem recarregar");
ok(await tema(/mural/) === "light", "Comunidade acompanha o tema claro");
await p.evaluate(() => window.__hfShell.ir("mensagens")); await p.waitForTimeout(800);
await p.screenshot({ path: "saida/tema-mensagens-claro.png" });
await quadro(/feed/).evaluate(() => { const c = JSON.parse(localStorage.getItem("hf-chat-config") || "{}"); c.tema = "escuro"; localStorage.setItem("hf-chat-config", JSON.stringify(c)); });
await p.waitForTimeout(700);
ok(await tema(/mensagens/) === "dark", "e volta para o escuro");
await p.screenshot({ path: "saida/tema-mensagens-escuro.png" });
await A.browser.close();
