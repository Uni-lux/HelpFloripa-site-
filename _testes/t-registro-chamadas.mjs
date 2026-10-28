// Aba Chamadas em Mensagens: registro das ligações (feitas, recebidas, perdidas), dias, filtro Perdidas, número de
// perdidas novas na aba, tocar abre a conversa, botão de ligar de volta e "Limpar registro" (só no aparelho).
// Uso: node seed.mjs && node t-registro-chamadas.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const conv = [U.ana, U.bruno].sort().join("_");
for (const d of (await db.collection("chamadas").get()).docs) await d.ref.delete();
const T = (min) => Timestamp.fromMillis(Date.now() - min * 60000);
const ch = (x) => db.collection("chamadas").add({ conv, oferta: { type: "offer", sdp: "x" }, ...x });
await ch({ de: U.bruno, para: U.ana, tipo: "video", status: "encerrada", criadoEm: T(30), aceitaEm: T(29.5), fimEm: T(26.5) });
await ch({ de: U.ana, para: U.bruno, tipo: "audio", status: "perdida", criadoEm: T(10) });
await ch({ de: U.bruno, para: U.ana, tipo: "audio", status: "cancelada", criadoEm: T(60 * 26) });

const B = await navegador({ mobile: true });
const p = await entrar(B.ctx, "bruno", "mensagens.html");
await p.waitForSelector(".modos [data-modo='chamadas']", { timeout: 20000 }); await p.waitForTimeout(1500);
await p.locator(".modos [data-modo='chamadas']").click();
await p.waitForSelector(".rc-item", { timeout: 10000 }); await p.waitForTimeout(800);
const itens = (await p.locator(".rc-item").allTextContents()).map((t) => t.replace(/\s+/g, " "));
ok(itens.length === 3, "3 ligações no registro: " + itens.join(" | "));
ok(itens[0].includes("Perdida") && await p.locator(".rc-item").first().evaluate((e) => e.classList.contains("perdida")), "a mais recente é a perdida (em vermelho)");
ok(itens[1].includes("Vídeo") && itens[1].includes("3 min"), "chamada de vídeo atendida com a duração");
ok(itens[2].includes("Não atendida"), "ligação feita que ninguém atendeu");
const dias = await p.locator(".rc-dia").allTextContents();
ok(dias.length === 2 && dias[0] === "Hoje", "separado por dia: " + dias.join(", "));
ok(await p.locator("#buscaConversas").isHidden() && await p.locator(".pill[data-filtro=todas]").isHidden(), "busca e filtros das conversas somem na aba");
await p.screenshot({ path: "saida/registro-chamadas.png" });
await p.locator(".rc-topo .pill", { hasText: "Perdidas" }).click(); await p.waitForTimeout(600);
ok(await p.locator(".rc-item").count() === 1, "filtro Perdidas mostra só a perdida");
await p.locator(".rc-topo .pill", { hasText: "Todas" }).click(); await p.waitForTimeout(600);
ok(await p.locator(".rc-ligar:not([disabled])").count() === 3, "botão de ligar de volta em cada uma");
await p.locator(".rc-item").first().click(); await p.waitForTimeout(1500);
ok(await p.locator("#btnLigar").isVisible(), "tocar na ligação abre a conversa");
await p.goBack().catch(() => {}); await p.waitForTimeout(800);
// Limpar
await p.goto(p.url().split("?")[0]); await p.waitForSelector(".modos [data-modo='chamadas']"); await p.waitForTimeout(1500);
await p.locator(".modos [data-modo='chamadas']").click(); await p.waitForSelector(".rc-limpar");
await p.locator(".rc-limpar").click(); await p.waitForSelector(".hf-confirma"); await p.locator(".hf-confirma .sim").click(); await p.waitForTimeout(800);
ok(await p.locator(".rc-item").count() === 0 && (await p.textContent("#listaConversas")).includes("Nenhuma chamada"), "Limpar registro esvazia a lista (só no aparelho)");
ok((await db.collection("chamadas").get()).size === 3, "as chamadas continuam no banco");
await B.browser.close();
for (const d of (await db.collection("chamadas").get()).docs) await d.ref.delete();
