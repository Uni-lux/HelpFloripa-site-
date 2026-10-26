// Pedido de delivery de ponta a ponta: cliente monta o carrinho, aplica o cupom e envia; o cartão no chat
// mostra número, etapas, itens, valores, entrega e pagamento; o negócio confirma e avança as etapas; o cliente
// vê o andamento. Uso: node t-pedido.mjs  (precisa das regras do main: campo promocao)
import { navegador, entrar, BASE, USUARIOS as U } from "./nav.mjs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
const db = getFirestore(initializeApp({ projectId: "demo-hf" }));
// Promoção/cupom aparece só com plano ativo do dono (sem plano, só um perfil no ar e sem promoção).
await db.doc(`planos/${U.bruno}`).set({ plano: "plus", meses: 1, ate: Timestamp.fromMillis(Date.now() + 30 * 864e5) });
const ok = (c, m) => console.log(c ? "  ✔" : "  ✘", m);
const NEG = `${U.bruno}_delivery`;
await db.doc(`negocios/${NEG}`).set({
  donoId: U.bruno, tipo: "delivery", nome: "Lanches do Bruno", cidade: "Florianópolis", uf: "SC", categoria: "hamburguer",
  taxaEntrega: 6, tempoMin: 30, tempoMax: 45, pedidoMinimo: 0, opcoesEntrega: ["entrega", "retirada"], pagamentos: ["pix", "dinheiro"],
  itens: [{ nome: "X-Salada", preco: 22, foto: "", secao: "Lanches" }, { nome: "Batata frita", preco: 14, foto: "", secao: "Porções" }, { nome: "Refri lata", preco: 6, foto: "", secao: "Bebidas" }],
  promocao: { titulo: "Batata grátis acima de R$ 50", texto: "", codigo: "BATATA", ate: Timestamp.fromMillis(Date.now() + 5 * 864e5) },
  criadoEm: Timestamp.now(), atualizadoEm: Timestamp.now()
});
const conv = [U.ana, U.bruno].sort().join("_");
const { browser, ctx } = await navegador({ mobile: true });
await ctx.addInitScript(() => { try { localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" })); } catch {} });

// ---------- cliente ----------
const a = await entrar(ctx, "ana", `delivery.html?negocio=${NEG}`);
await a.waitForSelector(".vd-add", { timeout: 20000 }); await a.waitForTimeout(1000);
const add = async (nome, vezes = 1) => { for (let i = 0; i < vezes; i++) { await a.locator(".vd-item, li, .vd-prato", { hasText: nome }).locator(".vd-add, .vd-qtd button").last().click(); await a.waitForTimeout(250); } };
await add("X-Salada", 2); await add("Batata frita"); await add("Refri lata");
await a.locator(".vd-carrinho .vt-btn.pri").click(); await a.waitForTimeout(700);
await a.locator(".vd-cupom-linha input").fill("batata"); await a.locator(".vd-cupom-linha .vt-btn").click(); await a.waitForTimeout(300);
ok(await a.locator(".vd-cupom-ped.ok").count() === 1, "cupom aplicado no pedido");
await a.locator(".vd-pedido textarea.vd-obs.curto").fill("Rua das Flores, 120, Trindade");
await a.locator(".vd-chip", { hasText: "Dinheiro" }).click(); await a.waitForTimeout(200);
await a.locator(".vd-pedido input.vd-input[inputmode=decimal]").fill("100");
await a.locator(".vd-pedido textarea.vd-obs:not(.curto)").fill("Sem cebola, por favor");
await a.locator(".vt-btn", { hasText: "Enviar pedido" }).click(); await a.waitForTimeout(3000);
const fr = a.frames().find((f) => f.url().includes("mensagens.html"));
ok(!!fr, "pedido abre a conversa na gaveta");
await fr.waitForSelector("#btnEnviar", { timeout: 20000 }); await a.waitForTimeout(1200);
await fr.click("#btnEnviar"); await a.waitForTimeout(3000);
const ms = await db.collection(`conversas/${conv}/mensagens`).orderBy("criadoEm", "desc").limit(1).get();
const ped = ms.docs[0]?.data()?.cartao?.pedido;
console.log("  pedido:", JSON.stringify({ itens: ped?.itens?.length, total: ped?.total, taxa: ped?.taxa, cupom: ped?.cupom?.codigo, prazo: ped?.prazo, troco: ped?.troco, pagamento: ped?.pagamento }));
ok(ped?.itens?.length === 3 && ped.total === 70 && ped.taxa === 6 && ped.cupom?.codigo === "BATATA" && ped.prazo === "30–45 min" && ped.troco === 100, "pedido gravado completo (itens, taxa, total, cupom, previsão, troco)");
const card = fr.locator(".pedido-pro").last();
ok(await card.count() === 1, "cartão do pedido novo no chat");
const txt = await card.textContent();
ok(/Pedido #[A-Z0-9]{6}/.test(txt) && txt.includes("Aguardando confirmação") && txt.includes("Cupom BATATA") && txt.includes("troco para") && txt.includes("Sem cebola"), "cartão: número, situação, cupom, pagamento e observação");
ok(await card.locator(".pd-passos li").count() === 4, "etapas com nome (Recebido, Preparando, A caminho, Entregue)");
ok(await card.locator(".pd-acoes .sec", { hasText: "Cancelar pedido" }).count() === 1, "cliente pode cancelar antes da confirmação");
await card.scrollIntoViewIfNeeded(); await a.screenshot({ path: "saida/pedido-cliente.png" });
await card.screenshot({ path: "saida/pedido-cartao-cliente.png" });

// ---------- negócio ----------
const b = await entrar(ctx, "bruno", `mensagens.html?conversa=${conv}`);
await b.waitForSelector(".pedido-pro", { timeout: 20000 }); await b.waitForTimeout(1500);
const cb = b.locator(".pedido-pro").last();
ok((await cb.textContent()).includes("Novo pedido") && await cb.locator(".pd-acoes .pri", { hasText: "Confirmar pedido" }).count() === 1, "negócio vê Novo pedido com Confirmar");
await cb.screenshot({ path: "saida/pedido-cartao-negocio.png" });
await cb.locator(".pd-acoes .pri").click(); await b.waitForTimeout(2500);
ok((await b.locator(".pedido-pro").last().locator(".pd-acoes .pri").textContent()).includes("Preparando"), "confirmado: próximo botão é Preparando");
await b.locator(".pedido-pro").last().locator(".pd-acoes .pri").click(); await b.waitForTimeout(2500);
const cb2 = b.locator(".pedido-pro").last();
ok(await cb2.locator(".pd-passos li.feito").count() === 1 && await cb2.locator(".pd-passos li.atual").count() === 1, "etapas marcadas (recebido feito, preparando atual)");
await cb2.scrollIntoViewIfNeeded(); await cb2.screenshot({ path: "saida/pedido-cartao-preparando.png" });

// ---------- cliente vê o andamento ----------
await a.waitForTimeout(2000);
const ca = fr.locator(".pedido-pro").last();
ok((await ca.textContent()).includes("Preparando") && (await ca.textContent()).includes("Previsão: 30–45 min"), "cliente vê Preparando com a previsão");
ok(await ca.locator(".pd-acoes .sec").count() === 0, "depois de confirmado o cliente não cancela mais pelo cartão");
await ca.screenshot({ path: "saida/pedido-cartao-cliente-2.png" });
await browser.close();
process.exit(0);
