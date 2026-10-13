// Painel no celular: contagens das Estatísticas sem contas falsas (registro de ações guarda textos
// como "usuarios" e "suporte:ID"), nomes do gráfico "Último acesso" sem sobrepor e chat da equipe
// em tela cheia com o campo de digitar à vista e a conversa no fim.
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { navegador, entrar } from "./nav.mjs";
import { readFileSync } from "node:fs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
initializeApp({ projectId: "demo-hf" });
const db = getFirestore();
const VBASE = "./admin-base.js?v=" + readFileSync(new URL("../admin.js", import.meta.url), "utf8").match(/admin-base\.js\?v=(\d+)/)[1];
const U = JSON.parse(readFileSync(new URL("saida/seed.json", import.meta.url), "utf8"));
for (const [acao, alvo] of [["exportar", "usuarios"], ["exportar", "denuncias"], ["assumiu", "suporte:abc123"], ["parceria", "contato@empresa.com"], ["aviso", U.ana]])
  await db.collection("admin_log").add({ acao, alvo, detalhe: "", por: U.admin, porNome: "Carla", em: Timestamp.now() });
const contas = new Set([...(await db.collection("perfis_publicos").get()).docs.map((d) => d.id), ...(await db.collection("usuarios").get()).docs.map((d) => d.id)]).size;
const { browser, ctx } = await navegador({ mobile: true });
const p = await entrar(ctx, "admin", "admin.html");
await p.waitForFunction((v) => import(v).then((m) => m.D.carregadoEm > 0), VBASE, { timeout: 30000, polling: 1000 });
const ir = async (sec, sel) => { for (let i = 0; i < 6 && !(await p.locator(sel).count()); i++) { await p.evaluate(([v, s]) => import(v).then((m) => m.C.irPara(s)), [VBASE, sec]); await p.waitForTimeout(2500); } };
await ir("estatisticas", ".ad-cab h1:text-is('Estatísticas')");
await p.locator(".viz-cartao h3", { hasText: "Último acesso" }).waitFor({ timeout: 40000 });
await p.waitForTimeout(1000);
const tab = async (titulo) => p.evaluate((t) => { const c = [...document.querySelectorAll(".viz-cartao")].find((x) => x.querySelector("h3")?.textContent === t); return c ? [...c.querySelectorAll(".viz-tabela tbody tr")].map((tr) => [...tr.children].map((td) => td.textContent).join(": ")) : null; }, titulo);
const pub = await tab("Público"), ac = await tab("Último acesso");
const soma = (l) => (l || []).reduce((a, x) => a + Number(x.split(": ").pop()), 0);
console.log("contas de verdade:", contas, "| Público:", pub, "→", soma(pub), "| Último acesso soma:", soma(ac));
const fantasmas = await p.evaluate((v) => import(v).then((m) => [...m.D.pessoas.values()].filter((x) => x.removido).map((x) => x.uid)), VBASE);
console.log("contas falsas na memória do painel:", fantasmas);
// Nomes do gráfico "Último acesso": nenhum texto do eixo pode encostar no vizinho.
const cartao = p.locator(".viz-cartao", { has: p.locator("h3", { hasText: "Último acesso" }) });
await cartao.scrollIntoViewIfNeeded();
const sobre = await cartao.evaluate((c) => { const r = [...c.querySelectorAll("svg text.viz-eixo")].map((t) => t.getBoundingClientRect()); let n = 0; for (let i = 1; i < r.length; i++) if (r[i].left < r[i - 1].right - 1 && Math.abs(r[i].top - r[i - 1].top) < 8) n++; return { textos: r.length, sobrepostos: n, deitado: !!c.querySelector(".viz-hbar") }; });
console.log("gráfico Último acesso:", JSON.stringify(sobre));
await cartao.screenshot({ path: "saida/p2-ultimo-acesso.png" });
// Chat da equipe: abrir conversa no celular.
await ir("equipe", ".eq-chat");
await p.locator(".eq-lista-itens > *").first().click();
await p.waitForTimeout(2500);
const pos = await p.evaluate(() => { const f = document.querySelector(".eq-rodape").getBoundingClientRect(), c = document.querySelector(".eq-msgs"); return { rodapeFim: Math.round(f.bottom), tela: innerHeight, faltaRolar: Math.round(c.scrollHeight - c.scrollTop - c.clientHeight) }; });
console.log("chat aberto:", JSON.stringify(pos), pos.rodapeFim <= pos.tela && pos.faltaRolar < 80 ? "OK" : "PROBLEMA");
await p.screenshot({ path: "saida/p2-chat.png" });
await p.locator(".eq-voltar").click(); await p.waitForTimeout(500);
console.log("voltar mostra a lista:", await p.locator(".eq-lista").isVisible());
const ordem = await p.locator(".ad-nav").evaluateAll((l) => l.slice(0, 3).map((b) => b.dataset.secao));
console.log("menu (3 primeiros):", ordem);
await browser.close();
