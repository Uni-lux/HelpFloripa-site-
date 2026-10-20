// Planos dos negócios (Grátis e Pro, Pix manual): cartão do plano em Meus negócios, gaveta com benefícios e
// períodos, pedido + Pix (código copia e cola com CRC certo e QR Code), estatísticas de 90 dias/Excel travadas no
// Grátis, painel → Planos (confirmar pagamento e ativar), selo Pro e "Pro primeiro" na vitrine.
// Uso: node t-planos.mjs  (precisa das regras do repositório: planos_pedidos e planos)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, BASE } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
for (const d of (await db.collection("planos_pedidos").get()).docs) await d.ref.delete();
await db.doc(`planos/${U.bruno}`).delete().catch(() => {});

const { browser, ctx } = await navegador({ mobile: true });
// ---------- 1) Meus negócios: Grátis ----------
const p = await entrar(ctx, "bruno", "negocios.html");
await p.waitForSelector("#planoBox:not([hidden])", { timeout: 20000 });
ok((await p.textContent("#planoBox")).includes("Seu plano: Grátis"), "cartão do plano: " + (await p.textContent("#planoBox")).replace(/\s+/g, " "));
await p.screenshot({ path: "saida/pl-meus-negocios.png" });

// Estatísticas no Grátis: 90 dias e Excel com "PRO" abrem os planos
await p.click("#atalhoEstat"); await p.waitForTimeout(400);
if (await p.locator("#folhaEscolherEst.aberta").count()) await p.locator("#folhaEscolherEst .ng-escolha").first().click();
await p.waitForSelector(".ni-periodo button.travado", { timeout: 15000 });
ok((await p.textContent(".ni-periodo button.travado")).includes("90 dias") && await p.locator(".ni-baixar.travado .ni-pro").count() === 1, "Grátis: 90 dias e Excel marcados como Pro");
await p.locator(".ni-periodo button.travado").click(); await p.waitForTimeout(800);
ok(await p.locator(".pl-fundo").count() === 1, "tocar em 90 dias abre os planos");
await p.screenshot({ path: "saida/pl-gaveta.png" });
await p.goBack(); await p.waitForTimeout(500);
ok(await p.locator(".pl-fundo").count() === 0, "voltar fecha a gaveta dos planos");
await p.goto(BASE + "negocios.html"); await p.waitForSelector("#planoBox:not([hidden])", { timeout: 20000 });

// ---------- 2) pedido + Pix ----------
await p.click("#planoBox"); await p.waitForSelector(".pl-per", { timeout: 10000 });
ok(await p.locator(".pl-lin").count() >= 8 && (await p.textContent(".pl-hero")).includes("39,90"), "gaveta: preço e tabela Grátis × Pro");
await p.locator(".pl-per", { hasText: "3 meses" }).click();
ok((await p.textContent(".pl-btn")).includes("119,70"), "3 meses: " + await p.textContent(".pl-btn"));
await p.locator(".pl-btn", { hasText: "Pagar" }).click(); await p.waitForSelector(".pl-pix", { timeout: 10000 });
const ped = (await db.collection("planos_pedidos").where("uid", "==", U.bruno).get()).docs.map((d) => ({ id: d.id, ...d.data() }))[0];
ok(ped?.status === "pendente" && ped.meses === 3 && ped.valor === 119.7 && /^[A-Z0-9]+$/.test(ped.txid), "pedido gravado: " + JSON.stringify({ meses: ped?.meses, valor: ped?.valor, txid: ped?.txid }));
await p.screenshot({ path: "saida/pl-pix.png" });
// Código Pix (BR Code): com uma chave de exemplo, o CRC16 confere e o QR Code sai.
const pix = await p.evaluate(async () => {
  const m = await import("./planos.js?v=1");
  const cod = m.codigoPix({ chave: "contato@helpfloripa.com.br", valor: 119.7, txid: "HFTESTE1" });
  const { default: qr } = await import("./qrcode-gerador.js?v=1");
  const q = qr(0, "M"); q.addData(cod); q.make();
  return { cod, modulos: q.getModuleCount() };
});
const crc = (t) => { let c = 0xffff; for (let i = 0; i < t.length; i++) { c ^= t.charCodeAt(i) << 8; for (let k = 0; k < 8; k++) c = c & 0x8000 ? (c << 1) ^ 0x1021 : c << 1; c &= 0xffff; } return c.toString(16).toUpperCase().padStart(4, "0"); };
ok(pix.cod.startsWith("000201") && pix.cod.includes("br.gov.bcb.pix") && pix.cod.includes("5406119.70") && crc(pix.cod.slice(0, -4)) === pix.cod.slice(-4) && pix.modulos >= 25, `código Pix válido (CRC ${pix.cod.slice(-4)}, QR ${pix.modulos}×${pix.modulos})`);
// fechar e reabrir: mostra o pedido em aberto
await p.locator(".pl-x").click(); await p.waitForTimeout(600);
await p.goto(BASE + "negocios.html"); await p.waitForSelector("#planoBox:not([hidden])", { timeout: 20000 }); await p.waitForTimeout(800);
ok((await p.textContent("#planoBox")).includes("aguardando o Pix"), "cartão mostra o pedido aguardando o Pix");

// ---------- 3) painel: confirmar e ativar ----------
const ADM = await navegador({ mobile: true });
const a = await entrar(ADM.ctx, "admin", "admin.html#planos");
await a.waitForSelector(".ad-item[data-item^='plano:']", { timeout: 30000 });
ok((await a.textContent(".ad-item[data-item^='plano:']")).includes("119,70"), "painel → Planos: pedido esperando o Pix");
ok((await a.textContent('[data-cont="planos"]')) === "1", "número no menu do painel");
await a.screenshot({ path: "saida/pl-painel.png" });
await a.locator(".ad-item[data-item^='plano:'] .ad-bt", { hasText: "Confirmar pagamento" }).click();
await a.waitForSelector(".hf-confirma .sim", { timeout: 5000 }); await a.locator(".hf-confirma .sim").click(); await a.waitForTimeout(2500);
const pl = (await db.doc(`planos/${U.bruno}`).get()).data();
const dias = pl ? Math.round((pl.ate.toMillis() - Date.now()) / 864e5) : 0;
ok(pl?.plano === "pro" && dias >= 89 && dias <= 90 && (await db.doc(`planos_pedidos/${ped.id}`).get()).data().status === "pago", `Pro ativado por ${dias} dias e pedido pago`);
const aviso = (await db.collection("avisos").where("uid", "==", U.bruno).get()).docs.map((d) => d.data()).find((x) => x.titulo.includes("Pro"));
ok(!!aviso, "a pessoa recebe o aviso 'Seu plano Pro está ativo'");
await a.locator(".ad-chip", { hasText: "Ativos" }).click(); await a.waitForTimeout(300);
ok((await a.textContent("#principal")).includes("Encerrar o Pro agora"), "aba Ativos lista o negócio Pro");
await a.screenshot({ path: "saida/pl-painel-ativos.png" });
await ADM.browser.close();

// ---------- 4) depois de ativar ----------
await p.goto(BASE + "negocios.html"); await p.waitForSelector("#planoBox.pro", { timeout: 20000 });
ok((await p.textContent("#planoBox")).includes("Plano Pro ativo"), "Meus negócios: " + (await p.textContent("#planoBox")).replace(/\s+/g, " "));
await p.screenshot({ path: "saida/pl-meus-negocios-pro.png" });
await p.click("#atalhoEstat"); await p.waitForTimeout(400);
if (await p.locator("#folhaEscolherEst.aberta").count()) await p.locator("#folhaEscolherEst .ng-escolha").first().click();
await p.waitForSelector(".ni-periodo button", { timeout: 15000 });
ok(await p.locator(".ni-periodo button.travado").count() === 0 && await p.locator(".ni-baixar.travado").count() === 0, "Pro: 90 dias e Excel liberados");
const pv = await entrar(ctx, "ana", "servicos.html");
await pv.waitForSelector("#vtGrade .vt-free", { timeout: 20000 }).catch(() => {}); await pv.waitForTimeout(2500);
await pv.evaluate(() => document.querySelector(".hfman-x")?.click());
const nomes = await pv.locator("#vtGrade .vt-free .nm").allTextContents();
ok(nomes[0]?.includes("Bruno") && nomes[0].includes("PRO"), "vitrine: Pro primeiro e com o selo: " + nomes.join(" | "));
await pv.locator("#vtGrade .vt-free").first().scrollIntoViewIfNeeded(); await pv.screenshot({ path: "saida/pl-vitrine.png" });
await pv.locator("#vtGrade .vt-free").first().click(); await pv.waitForTimeout(1500);
ok(await pv.locator(".vd-selo-pro").count() === 1, "perfil do negócio: selo 'Negócio Pro'");
await pv.screenshot({ path: "saida/pl-detalhe.png" });
await browser.close();
process.exit(process.exitCode || 0);
