// Aba Chamadas em Mensagens (refeita em 09/11/2026) + cartão da ligação no chat.
// Registro: Nova chamada, filtros Todas · Perdidas · Recebidas · Feitas com contagem, ligações seguidas da mesma
// pessoa juntas ("(2)"), situação igual nos dois lados (Cancelada, Sem resposta, Perdida, duração), dias, tocar abre o
// histórico com a pessoa (Mensagem · Voz · Vídeo, tempo total), "Tirar do registro" e "Limpar" (só no aparelho).
// Chat: cartão neutro com o tipo, quem ligou e a situação; perdida em vermelho com "Retornar a chamada".
// Uso: node seed.mjs && node t-registro-chamadas.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085"; process.env.TZ = "America/Sao_Paulo"; // o mesmo fuso do navegador do teste
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const conv = [U.ana, U.bruno].sort().join("_");
for (const d of (await db.collection("chamadas").get()).docs) await d.ref.delete();
// Horários relativos a agora, mas sempre dentro de hoje (antes o teste falhava de madrugada).
const meiaNoite = new Date(); meiaNoite.setHours(0, 0, 0, 0);
const hojeMin = Math.max(0, (Date.now() - meiaNoite) / 60000);
const T = (min) => Timestamp.fromMillis(Date.now() - min * 60000);
const hoje = (frac) => T(hojeMin * frac); // frac 0..1 do dia que já passou
const ch = (x) => db.collection("chamadas").add({ conv, oferta: { type: "offer", sdp: "x" }, ...x });
await ch({ de: U.bruno, para: U.ana, tipo: "video", status: "encerrada", criadoEm: hoje(0.6), aceitaEm: hoje(0.59), fimEm: T(hojeMin * 0.59 - 3) });
await ch({ de: U.ana, para: U.bruno, tipo: "audio", status: "perdida", criadoEm: hoje(0.2) });
await ch({ de: U.ana, para: U.bruno, tipo: "audio", status: "cancelada", criadoEm: hoje(0.1) });
await ch({ de: U.bruno, para: U.ana, tipo: "audio", status: "cancelada", criadoEm: T(hojeMin + 60 * 20) });
// Cartões das ligações no chat (como o site grava: quem ligou publica o cartão).
const msgs = db.collection(`conversas/${conv}/mensagens`);
await msgs.add({ remetenteId: U.ana, texto: "", tipoArquivo: "cartao", cartao: { tipo: "chamada", modo: "audio", resultado: "cancelada", duracao: 0 }, criadoEm: Timestamp.now() });
await msgs.add({ remetenteId: U.bruno, texto: "", tipoArquivo: "cartao", cartao: { tipo: "chamada", modo: "video", resultado: "encerrada", duracao: 125 }, criadoEm: Timestamp.now() });
await msgs.add({ remetenteId: U.bruno, texto: "", tipoArquivo: "cartao", cartao: { tipo: "chamada", modo: "audio", resultado: "perdida", duracao: 0 }, criadoEm: Timestamp.now() });
await db.doc(`conversas/${conv}`).set({ atualizadoEm: Timestamp.now() }, { merge: true });

const B = await navegador({ mobile: true });
const p = await entrar(B.ctx, "bruno", "mensagens.html");
await p.waitForSelector(".modos [data-modo='chamadas']", { timeout: 20000 }); await p.waitForTimeout(1500);
await p.locator(".modos [data-modo='chamadas']").click();
await p.waitForSelector(".rc-item", { timeout: 10000 }); await p.waitForTimeout(800);
const itens = (await p.locator(".rc-item").allTextContents()).map((t) => t.replace(/\s+/g, " "));
ok(itens.length === 3, "3 linhas (as 2 perdidas seguidas da Ana viraram uma): " + itens.join(" | "));
ok(itens[0].includes("(2)") && await p.locator(".rc-item").first().evaluate((e) => e.classList.contains("perdida") && e.classList.contains("nova")), "perdidas agrupadas \"(2)\", em vermelho e marcadas como novas");
ok(itens[1].includes("3 min"), "chamada de vídeo atendida com a duração: " + itens[1]);
ok(itens[2].includes("Cancelada"), "ligação feita e cancelada antes de atender: " + itens[2]);
const dias = await p.locator(".rc-dia").allTextContents();
ok(dias.length === 2 && dias[0] === "Hoje", "separado por dia: " + dias.join(", "));
const pills = (await p.locator(".rc-filtros .pill").allTextContents()).map((t) => t.replace(/\s+/g, ""));
ok(pills.join(",") === "Todas,Perdidas2,Recebidas,Feitas", "filtros (número só nas perdidas): " + pills.join(","));
ok(await p.locator("#buscaConversas").isHidden(), "a busca das conversas some na aba");
ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "sem rolagem para o lado (390 px)");
await p.setViewportSize({ width: 360, height: 760 }); await p.waitForTimeout(300);
ok(await p.evaluate(() => [...document.querySelectorAll(".rc-filtros .pill")].every((b) => b.scrollWidth <= b.clientWidth + 1)), "os 4 filtros cabem inteiros em 360 px");
await p.setViewportSize({ width: 390, height: 780 }); await p.waitForTimeout(300);
await p.screenshot({ path: "saida/registro-chamadas.png" });
await p.locator(".rc-filtros .pill", { hasText: "Perdidas" }).click(); await p.waitForTimeout(600);
ok(await p.locator(".rc-item").count() === 1, "filtro Perdidas");
await p.locator(".rc-filtros .pill", { hasText: "Feitas" }).click(); await p.waitForTimeout(600);
ok(await p.locator(".rc-item").count() === 2, "filtro Feitas (a cancelada de hoje e a de ontem)");
await p.locator(".rc-filtros .pill", { hasText: "Todas" }).click(); await p.waitForTimeout(600);
ok(await p.locator(".rc-item .rc-ligar:not([disabled])").count() === 3, "botão de ligar de volta em cada linha");

// Histórico com a pessoa
await p.locator(".rc-item").first().click();
await p.waitForSelector(".pv-fundo.on .rcd-cab", { timeout: 5000 });
const cab = (await p.textContent(".rcd-cab")).replace(/\s+/g, " ");
ok(/Ana/.test(cab) && /4 chamadas/.test(cab) && /3 min em ligação/.test(cab), "histórico: nome, nº de chamadas e tempo total → " + cab);
ok(await p.locator(".rcd-acao").count() === 3 && await p.locator(".rcd-item").count() === 4, "Mensagem · Voz · Vídeo e as 4 ligações");
ok(await p.locator(".rcd-item.perdida").count() === 2, "as perdidas em vermelho no histórico");
await p.screenshot({ path: "saida/registro-detalhe.png" });
await p.locator(".rcd-acao", { hasText: "Mensagem" }).click(); await p.waitForTimeout(1500);
ok(await p.locator("#btnLigar").isVisible(), "Mensagem abre a conversa");

// Cartões no chat
await p.waitForSelector(".chamada-msg .lg", { timeout: 10000 });
const cartoes = (await p.locator(".chamada-msg .lg").allTextContents()).map((t) => t.replace(/\s+/g, " "));
ok(cartoes.some((t) => /Chamada de voz perdida.*Você não atendeu.*Retornar a chamada/.test(t)), "cartão: ligação perdida (Ana ligou, Bruno não atendeu) com Retornar");
ok(cartoes.some((t) => /Chamada de vídeo.*Você ligou · 2 min 05 s.*Ligar de novo/.test(t)), "cartão: vídeo de 2 min 05 s, \"Você ligou\"");
ok(await p.locator(".chamada-msg .lg.perdida").count() >= 1 && await p.locator(".minha .chamada-msg .lg.perdida").count() === 0, "vermelho só na ligação que o Bruno não atendeu (as que ele fez sem resposta ficam neutras)");
const fundo = await p.locator(".minha .chamada-msg").first().evaluate((e) => getComputedStyle(e).backgroundColor);
const painel = await p.evaluate(() => getComputedStyle(document.body).getPropertyValue("--panel").trim());
ok(!!fundo && fundo !== "rgba(0, 0, 0, 0)", "cartão neutro (fundo do painel, não o azul do balão): " + fundo + " / " + painel);
await p.locator(".chamada-msg").last().scrollIntoViewIfNeeded();
await p.screenshot({ path: "saida/registro-cartoes.png" });

// Nova chamada + Tirar do registro + Limpar
await p.goto(p.url().split("?")[0]); await p.waitForSelector(".modos [data-modo='chamadas']"); await p.waitForTimeout(1500);
await p.locator(".modos [data-modo='chamadas']").click(); await p.waitForSelector(".rc-nova");
await p.locator(".rc-topo .rc-nova").click();
await p.waitForSelector(".pv-fundo.on .rcn-item", { timeout: 5000 });
ok((await p.textContent(".rcn-lista")).includes("Ana") && await p.locator(".rcn-item .rc-ligar").count() >= 2, "Nova chamada: as suas conversas com voz e vídeo");
await p.locator(".pv-fundo.on .rc-busca input").fill("zzz"); await p.waitForTimeout(300);
ok((await p.textContent(".rcn-lista")).includes("Ninguém"), "busca na Nova chamada");
await p.screenshot({ path: "saida/registro-nova.png" });
await p.keyboard.press("Escape"); await p.waitForTimeout(500);
await p.locator(".rc-item").nth(1).click(); await p.waitForSelector(".pv-fundo.on .rcd-tirar");
await p.locator(".rcd-tirar").click(); await p.waitForSelector(".hf-confirma"); await p.locator(".hf-confirma .sim").click(); await p.waitForTimeout(900);
ok(await p.locator(".rc-item").count() === 0, "Tirar do registro (todas eram com a Ana)");
await p.evaluate((u) => { const k = "hf-chamadas-" + u; const c = JSON.parse(localStorage.getItem(k) || "{}"); delete c.tirados; localStorage.setItem(k, JSON.stringify(c)); }, U.bruno);
await p.reload(); await p.waitForSelector(".modos [data-modo='chamadas']"); await p.waitForTimeout(1500);
await p.locator(".modos [data-modo='chamadas']").click(); await p.waitForSelector(".rc-limpar");
await p.locator(".rc-limpar").click(); await p.waitForSelector(".hf-confirma"); await p.locator(".hf-confirma .sim").click(); await p.waitForTimeout(800);
ok(await p.locator(".rc-item").count() === 0 && (await p.textContent("#listaConversas")).includes("Nenhuma chamada"), "Limpar registro esvazia a lista (só no aparelho)");
ok((await db.collection("chamadas").get()).size === 4, "as chamadas continuam no banco");
await B.browser.close();
for (const d of (await db.collection("chamadas").get()).docs) await d.ref.delete();
