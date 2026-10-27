// Planos dos negócios (Grátis + Plus, Pro e Premium, Pix manual): cartão do plano em Meus negócios (com os dias que
// faltam), gaveta com os 3 planos, tabela e períodos, pedido + Pix (código copia e cola com CRC certo e QR Code),
// estatísticas de 90 dias/Excel travadas no Grátis, painel → Planos (só donos: confirmar pagamento e ativar,
// condição especial/parceria aprovada com plano, receita), selo e "Pro primeiro" na vitrine, moderação sem Planos
// nem Registro e o histórico do dia de cada pessoa da equipe.
// Uso: node t-planos.mjs  (precisa das regras do repositório: planos_pedidos, planos e planos_negociacoes)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore } from "firebase-admin/firestore";
import { navegador, entrar, garantirImagem, USUARIOS as U, BASE } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
for (const c of ["planos_pedidos", "planos_negociacoes"]) for (const d of (await db.collection(c).get()).docs) await d.ref.delete();
for (const u of [U.bruno, U.ana, U.edu]) await db.doc(`planos/${u}`).delete().catch(() => {});

const { browser, ctx } = await navegador({ mobile: true });
// ---------- 1) Meus negócios: Grátis ----------
const p = await entrar(ctx, "bruno", "negocios.html");
await p.waitForSelector("#planoBox:not([hidden])", { timeout: 20000 });
ok((await p.textContent("#planoBox")).includes("Primeira assinatura: +30 dias grátis"), "cartão do plano (primeira assinatura): " + (await p.textContent("#planoBox")).replace(/\s+/g, " "));
await p.screenshot({ path: "saida/pl-meus-negocios.png" });

// Estatísticas no perfil grátis: fazem parte dos planos (tocar abre a gaveta dos planos).
await p.click("#atalhoEstat"); await p.waitForTimeout(800);
ok(await p.locator(".pl-fundo").count() === 1, "grátis: Estatísticas abre os planos");
await p.screenshot({ path: "saida/pl-gaveta.png" });
await p.goBack(); await p.waitForTimeout(500);
ok(await p.locator(".pl-fundo").count() === 0, "voltar fecha a gaveta dos planos");
await p.goto(BASE + "negocios.html"); await p.waitForSelector("#planoBox:not([hidden])", { timeout: 20000 });

// ---------- 2) pedido + Pix ----------
await p.click("#planoBox"); await p.waitForSelector(".pl-per", { timeout: 10000 });
const precos = await p.locator(".pl-card .pv").allTextContents();
ok(await p.locator(".pl-card").count() === 3 && precos[0].includes("29,90") && precos[1].includes("39,90") && await p.locator(".pl-lin").count() >= 9 && (await p.textContent(".pl-hero")).includes("Plano Pro") && (await p.textContent(".pl-hero")).includes("39,90"), "gaveta: 3 planos, topo do Pro (marcado) e tabela (" + precos.map((x) => x.replace(/\s+/g, " ")).join(" | ") + ") e tabela");
ok(await p.locator(".pl-card.on[data-plano='pro']").count() === 1 && await p.locator(".pl-lin.cab span.sel").textContent() === "Pro", "Pro vem marcado e destacado na tabela");
await p.locator(".pl-card[data-plano='premium']").click();
ok(await p.locator(".pl-tabela .pl-lin.cab span").count() === 5 && (await p.locator(".pl-tabela .pl-lin.cab span").nth(1).textContent()) === "Grátis", "tabela com a coluna Grátis (para comparar) e os 3 planos");
ok((await p.textContent(".pl-hero .pl-bonus")).includes("+30 dias grátis") && await p.locator(".pl-teste").count() === 0 && await p.locator(".pl-per .bonus").count() === 4 && (await p.locator(".pl-btn", { hasText: "Pagar" }).textContent()).includes("59,90") && (await p.locator(".pl-lin.cab span.sel").textContent()) === "Premium", "primeira assinatura: +30 dias grátis à vista (sem teste sem pagar); Premium troca o preço e a coluna: " + (await p.textContent(".pl-hero .pl-bonus")).replace(/\s+/g, " "));
ok(await p.locator(".pl-ajuda .pl-btn", { hasText: "condição especial" }).count() === 1 && await p.locator(".pl-ajuda .pl-btn", { hasText: "Parceria ou negociação" }).count() === 1 && (await p.textContent(".pl-ajuda")).includes("A gente aceita negociar"), "botões de condição especial e de parceria ou negociação");
await p.locator(".pl-ajuda .pl-btn", { hasText: "Parceria ou negociação" }).click(); await p.waitForSelector(".pl-form");
ok((await p.textContent(".pl-form h3")) === "Parceria ou negociação" && (await p.textContent(".pl-form")).includes("aceita negociar") && await p.locator(".pl-prova").isHidden(), "formulário de negociação (sem pedir comprovante de renda)");
await p.screenshot({ path: "saida/pl-negociacao.png" });
await p.locator(".pl-volta").click(); await p.waitForSelector(".pl-card");
await p.screenshot({ path: "saida/pl-gaveta-3planos.png", fullPage: false });
await p.locator(".pl-card[data-plano='pro']").click();
await p.locator(".pl-per", { hasText: "3 meses" }).click();
const per3 = (await p.locator(".pl-per", { hasText: "3 meses" }).textContent()).replace(/\s+/g, " ");
ok((await p.locator(".pl-btn", { hasText: "Pagar" }).textContent()).includes("107,73") && per3.includes("-10%") && per3.includes("119,70") && per3.includes("35,91 por mês"), "3 meses com 10% de desconto: " + per3);
ok((await p.textContent(".pl-economia")).includes("11,97"), "mostra a economia: " + await p.textContent(".pl-economia"));
const descontos = await p.locator(".pl-per .off").allTextContents();
ok(descontos.join(" ") === "-10% -15% -20%", "descontos de 3, 6 e 12 meses: " + descontos.join(" "));
await p.locator(".pl-per", { hasText: "12 meses" }).click();
ok((await p.locator(".pl-btn", { hasText: "Pagar" }).textContent()).includes("383,04"), "12 meses do Pro com 20%: " + await p.locator(".pl-btn", { hasText: "Pagar" }).textContent());
await p.locator(".pl-per", { hasText: "12 meses" }).scrollIntoViewIfNeeded(); await p.screenshot({ path: "saida/pl-descontos.png" });
await p.locator(".pl-per", { hasText: "3 meses" }).click();
await p.locator(".pl-btn", { hasText: "Pagar" }).click(); await p.waitForSelector(".pl-pix", { timeout: 10000 });
const ped = (await db.collection("planos_pedidos").where("uid", "==", U.bruno).get()).docs.map((d) => ({ id: d.id, ...d.data() }))[0];
ok(ped?.status === "pendente" && ped.meses === 3 && ped.valor === 107.73 && /^[A-Z0-9]+$/.test(ped.txid), "pedido gravado: " + JSON.stringify({ meses: ped?.meses, valor: ped?.valor, txid: ped?.txid }));
await p.screenshot({ path: "saida/pl-pix.png" });
ok(await p.locator(".pl-pix svg").count() === 1 && /0114619359340001005204.*5406107\.73/.test(await p.textContent(".pl-pix .pl-codigo")), "pedido com QR Code e copia e cola na chave CNPJ do Help Floripa e o valor certo");
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
ok((await a.textContent(".ad-item[data-item^='plano:']")).includes("107,73 (10% de desconto)") && (await a.textContent(".ad-item[data-item^='plano:']")).includes("ganha mais 30 dias grátis"), "painel → Planos: pedido esperando o Pix, com o desconto e o bônus da primeira assinatura");
ok((await a.textContent('[data-cont="planos"]')) === "1", "número no menu do painel");
await a.screenshot({ path: "saida/pl-painel.png" });
await a.locator(".ad-item[data-item^='plano:'] .ad-bt", { hasText: "Confirmar pagamento" }).click();
await a.waitForSelector(".hf-confirma .sim", { timeout: 5000 }); await a.locator(".hf-confirma .sim").click(); await a.waitForTimeout(2500);
const pl = (await db.doc(`planos/${U.bruno}`).get()).data();
const dias = pl ? Math.round((pl.ate.toMillis() - Date.now()) / 864e5) : 0;
ok(pl?.plano === "pro" && dias >= 119 && dias <= 120 && (await db.doc(`planos_pedidos/${ped.id}`).get()).data().status === "pago", `primeira assinatura: Pro por ${dias} dias (3 meses + 30 grátis) e pedido pago`);
const aviso = (await db.collection("avisos").where("uid", "==", U.bruno).get()).docs.map((d) => d.data()).find((x) => x.titulo.includes("Pro"));
ok(!!aviso, "a pessoa recebe o aviso 'Seu plano Pro está ativo'");
await a.locator(".ad-chip", { hasText: "Ativos" }).click(); await a.waitForTimeout(300);
ok((await a.textContent("#principal")).includes("Encerrar o plano agora") && /Faltam 120 dias/.test(await a.textContent("#principal")), "aba Ativos lista o negócio com os dias que faltam");
await a.screenshot({ path: "saida/pl-painel-ativos.png" });

// ---------- 4) depois de ativar ----------
await p.goto(BASE + "negocios.html"); await p.waitForSelector("#planoBox.pro", { timeout: 20000 });
ok((await p.textContent("#planoBox")).includes("Plano Pro ativo") && (await p.textContent("#planoBox .ng-plano-falta")) === "Faltam 120 dias" && await p.locator("#planoBox .ng-plano-barra i").count() === 1, "Meus negócios: " + (await p.textContent("#planoBox")).replace(/\s+/g, " "));
await p.click("#planoBox"); await p.waitForSelector(".pl-status", { timeout: 10000 });
ok((await p.textContent(".pl-status .dias")).replace(/\s+/g, "") === "120dias" && (await p.textContent(".pl-card.on .atual")).includes("faltam 120 dias"), "gaveta: seu plano com os dias que faltam");
await p.screenshot({ path: "saida/pl-gaveta-ativo.png" });
await p.locator(".pl-x").click(); await p.waitForTimeout(400);
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

// ---------- 5) condição especial (baixa renda): Ana pede, o dono aprova com plano ----------
await browser.close(); // duas abas do mesmo navegador travam o Firestore do teste: Ana entra em outro
const ANA = await navegador({ mobile: true });
const an = await entrar(ANA.ctx, "ana", "negocios.html?planos=1");
await an.waitForSelector(".pl-ajuda", { timeout: 20000 });
await an.locator(".pl-ajuda .pl-btn", { hasText: "condição especial" }).click();
await an.waitForSelector("#plNegMsg");
await an.locator(".pl-chip[data-p='plus']").click();
await an.fill("#plNegValor", "15,00");
await an.fill("#plNegMsg", "Sou autônoma, faço doces em casa e a renda caiu bastante este mês.");
ok(await an.locator(".pl-doc").count() === 10, "10 opções de documento para provar a baixa renda");
await an.locator(".pl-form .pl-btn", { hasText: "Enviar" }).click(); await an.waitForTimeout(400);
ok(await an.locator(".pl-neg").count() === 0, "sem escolher o documento não envia");
await an.locator(".pl-doc[data-doc='cadunico']").click();
await an.setInputFiles("#plNegArquivo", garantirImagem("saida/doc-cadunico.png", 900, 1200));
await an.waitForSelector(".pl-prova .ax-previa", { timeout: 10000 });
await an.locator(".pl-form .pl-btn", { hasText: "Enviar" }).click(); await an.waitForTimeout(400);
ok(await an.locator(".pl-neg").count() === 0, "sem marcar a declaração não envia");
await an.check("#plNegDecl");
await an.locator("#plNegContato").pressSequentially("48999998888");
ok(await an.inputValue("#plNegContato") === "(48) 99999-8888", "telefone formatado enquanto digita: " + await an.inputValue("#plNegContato"));
await an.locator(".pl-prova").scrollIntoViewIfNeeded(); await an.screenshot({ path: "saida/pl-negociar.png" });
await an.locator(".pl-form .pl-btn", { hasText: "Enviar" }).click();
await an.waitForSelector(".pl-neg", { timeout: 10000 });
const ng = (await db.doc(`planos_negociacoes/${U.ana}`).get()).data();
ok(ng?.contato === "(48) 99999-8888", "telefone gravado formatado");
ok(ng?.comprovanteTipo === "cadunico" && ng.declaracao === true && /^data:image\/jpeg;base64,/.test(ng.comprovante?.url || ""), "comprovante do CadÚnico anexado e declaração");
ok(ng?.status === "novo" && ng.tipo === "apoio" && ng.plano === "plus" && ng.valorProposto === 15, "pedido de condição especial gravado: " + JSON.stringify({ tipo: ng?.tipo, plano: ng?.plano, valor: ng?.valorProposto }));
ok((await an.textContent(".pl-neg")).includes("em análise"), "a pessoa vê o pedido em análise");
await an.screenshot({ path: "saida/pl-negociar-enviado.png" });
await ANA.browser.close();
await a.reload(); await a.waitForSelector(".ad-chip", { timeout: 30000 }); await a.waitForTimeout(500);
ok((await a.textContent('[data-cont="planos"]')) === "1", "número do menu conta a negociação nova");
await a.locator(".ad-chip", { hasText: "Negociações" }).click();
await a.waitForSelector(".ad-neg", { timeout: 5000 });
ok((await a.textContent(".ad-neg")).includes("renda caiu") && (await a.textContent(".ad-neg")).includes("15,00"), "painel: negociação com a mensagem e o valor proposto");
ok((await a.textContent(".ad-neg-prova")).includes("Folha resumo do CadÚnico") && await a.locator(".ad-neg-prova img").count() === 1, "painel: o dono vê o documento do CadÚnico");
await a.screenshot({ path: "saida/pl-painel-negociacao.png" });
await a.locator(".ad-neg .ad-bt", { hasText: "Aprovar e dar o plano" }).click();
await a.waitForSelector(".ad-modal input");
await a.locator(".ad-modal input").first().fill("15");
await a.locator(".ad-modal .ad-bt.pri", { hasText: "Aprovar" }).click(); await a.waitForTimeout(2500);
const plAna = (await db.doc(`planos/${U.ana}`).get()).data(), ngA = (await db.doc(`planos_negociacoes/${U.ana}`).get()).data();
ok(!("comprovante" in ngA) && ngA.comprovanteTipo === "cadunico", "o documento é apagado depois da decisão");
ok(plAna?.plano === "plus" && plAna.negociacaoId === U.ana && ngA.status === "aprovado" && ngA.valorAcordado === 15, "aprovado: Ana ganha o Plus (" + JSON.stringify({ plano: plAna?.plano, status: ngA?.status, valor: ngA?.valorAcordado }) + ")");
ok((await db.collection("avisos").where("uid", "==", U.ana).get()).docs.some((d) => d.data().titulo.includes("aprovado")), "Ana recebe o aviso da aprovação");
await a.locator(".ad-chip", { hasText: "Receita" }).click(); await a.waitForTimeout(600);
const rec = await a.textContent(".ad-receita");
ok(rec.includes("122,73") && rec.includes("Receita por mês"), "receita: Pix (107,73) + negociado (15,00) = 122,73");
await a.screenshot({ path: "saida/pl-painel-receita.png", fullPage: true });

// ---------- 6) registro e histórico do dia (só donos) ----------
await a.goto(BASE + "admin.html#registro"); await a.waitForSelector(".ad-hist-pessoa", { timeout: 30000 });
const carla = a.locator(".ad-hist-pessoa", { hasText: "Carla" });
const nCarla = Number(await carla.locator(".n strong").textContent());
ok(nCarla >= 3, `histórico: Carla com ${nCarla} ações hoje`);
await carla.click(); await a.waitForSelector(".ad-timeline li", { timeout: 5000 });
const linhaT = (await a.locator(".ad-timeline").textContent());
ok(linhaT.includes("Ativou plano") && linhaT.includes("Aprovou negociação de plano") && linhaT.includes("Entrou no painel"), "linha do tempo do dia: entrou, ativou plano, aprovou condição especial");
await a.screenshot({ path: "saida/pl-registro-pessoa.png", fullPage: true });
await a.locator(".ad-dia .ad-bt[aria-label='Dia anterior']").click(); await a.waitForTimeout(1500);
ok((await a.textContent(".ad-dia-rot")) === "Ontem", "navegar para ontem");
await a.locator(".ad-chip", { hasText: "Todas as ações" }).click(); await a.waitForTimeout(500);
ok(await a.locator(".ad-registro tr").count() >= 3, "aba Todas as ações continua");
await ADM.browser.close();

// ---------- 7) moderação não vê Planos, receita nem Registro ----------
const MOD = await navegador({ mobile: false });
const m = await entrar(MOD.ctx, "dani", "admin.html#registro");
await m.waitForSelector(".ad-nav", { timeout: 30000 }); await m.waitForTimeout(2500);
ok(await m.locator('.ad-nav[data-secao="planos"]').isHidden() && await m.locator('.ad-nav[data-secao="registro"]').isHidden(), "moderação: Planos e Registro somem do menu");
ok(!m.url().includes("#registro") && await m.locator(".ad-hist-pessoa").count() === 0, "moderação: abrir #registro volta para a Visão geral");
await m.screenshot({ path: "saida/pl-moderacao.png" });
await MOD.browser.close();

// ---------- 8) primeira assinatura: +30 dias grátis à vista (Edu nunca assinou) ----------
const EDU = await navegador({ mobile: true });
const e = await entrar(EDU.ctx, "edu", "negocios.html");
await e.waitForSelector("#planoBox:not([hidden])", { timeout: 20000 });
ok((await e.textContent("#planoBox")).includes("Primeira assinatura: +30 dias grátis"), "Edu: convite da primeira assinatura com +30 dias grátis");
await e.click("#planoBox"); await e.waitForSelector(".pl-card", { timeout: 10000 });
ok((await e.textContent(".pl-hero")).includes("+30 dias grátis") && await e.locator(".pl-teste").count() === 0, "gaveta: +30 dias grátis no topo e nenhum teste sem pagar");
await e.locator(".pl-card[data-plano='plus']").click(); await e.locator(".pl-per[data-m='3']").click();
ok((await e.textContent(".pl-economia")).includes("3 meses + 30 dias grátis"), "resumo: " + (await e.textContent(".pl-economia")));
await e.screenshot({ path: "saida/pl-bonus-oferta.png" });
await e.locator(".pl-btn", { hasText: "Pagar" }).click(); await e.waitForSelector(".pl-bonus-pix", { timeout: 10000 });
ok((await e.textContent(".pl-bonus-pix")).includes("30 dias grátis"), "tela do Pix lembra do bônus");
await EDU.browser.close();
process.exit(process.exitCode || 0);
