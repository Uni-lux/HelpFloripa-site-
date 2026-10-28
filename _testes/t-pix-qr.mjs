// Cartão de Pix no chat (Anexar → Pix: chave, nome, valor; o cartão chega com "Copiar código Pix", "Copiar chave" e
// QR Code), compartilhar o perfil do negócio com a arte (imagem + texto, para o WhatsApp receber a foto do QR), folha
// das avaliações sem comentários (só nota e estrelas; o que o cliente diz fica nas Reclamações) e o cartão Comunidade
// sem a setinha. Uso: node seed.mjs && node t-pix-qr.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, BASE } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const conv = [U.ana, U.bruno].sort().join("_"), NEG = `${U.bruno}_servicos`;

// ---------- 1) cartão de Pix ----------
const B = await navegador({ mobile: true });
await B.ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
const b = await entrar(B.ctx, "bruno", `mensagens.html?conversa=${conv}`);
await b.waitForSelector("#btnAnexar", { timeout: 20000 }); await b.waitForTimeout(2500);
await b.click("#btnAnexar"); await b.waitForTimeout(800);
await b.locator(".ax-op", { hasText: "Pix" }).click(); await b.waitForSelector(".px-campo", { timeout: 8000 });
const campos = b.locator(".px-campo input");
await campos.nth(0).fill("bruno@exemplo"); await b.waitForTimeout(200);
ok(await b.locator(".px-vazio").count() === 1, "chave inválida: pede uma chave válida");
await campos.nth(0).fill("(48) 99999-1111"); await campos.nth(1).fill("Bruno Reparos"); await campos.nth(2).fill("Florianópolis");
await campos.nth(3).fill("150,50"); await campos.nth(4).fill("Conserto do chuveiro"); await b.waitForTimeout(300);
const prv = (await b.textContent(".lc-previa")).replace(/\s/g, " ");
ok(prv.includes("R$ 150,50") && prv.includes("+5548999991111"), "prévia: valor e chave no formato do banco (+55...)");
await b.screenshot({ path: "saida/pix-gaveta.png" });
await b.locator(".pv-btn.pri", { hasText: "Enviar cartão de Pix" }).click(); await b.waitForTimeout(3000);
const msgs = (await db.collection(`conversas/${conv}/mensagens`).orderBy("criadoEm", "desc").limit(3).get()).docs.map((d) => d.data());
const pix = msgs.find((m) => m.cartao?.tipo === "pix");
ok(pix && pix.cartao.chave === "+5548999991111" && pix.cartao.tipoChave === "Celular" && pix.cartao.valor === 150.5, "cartão gravado: " + JSON.stringify(pix?.cartao || {}));
ok(((await db.doc(`usuarios/${U.bruno}`).get()).data().pix || {}).chave === "+5548999991111", "chave guardada na conta para a próxima vez");
await b.waitForSelector(".pix-msg", { timeout: 10000 });
await b.locator(".pix-msg").last().scrollIntoViewIfNeeded(); await b.screenshot({ path: "saida/pix-enviado.png" });
await B.browser.close();

const A = await navegador({ mobile: true });
await A.ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
await A.ctx.addInitScript(() => {
  window.__comp = [];
  navigator.canShare = (d) => !!d?.files;
  navigator.share = async (d) => { window.__comp.push({ arquivos: (d.files || []).map((f) => [f.name, f.type, f.size]), text: d.text || "", url: d.url || "" }); };
});
const a = await entrar(A.ctx, "ana", `mensagens.html?conversa=${conv}`);
await a.waitForSelector(".pix-msg", { timeout: 20000 }); await a.waitForTimeout(800);
const ult = a.locator(".pix-msg").last();
ok((await ult.textContent()).includes("Pix para pagamento") && (await ult.textContent()).includes("Bruno Reparos"), "quem paga vê o Pix para pagamento com o nome");
await ult.locator("button", { hasText: "Copiar código Pix" }).click(); await a.waitForTimeout(400);
const cod = await a.evaluate(() => navigator.clipboard.readText());
ok(/^000201.*br\.gov\.bcb\.pix.*5406150\.50.*6304[0-9A-F]{4}$/.test(cod), "código Pix copia e cola com valor e CRC: " + cod.slice(0, 40) + "…");
await ult.locator("button", { hasText: "QR Code" }).click(); await a.waitForSelector(".pix-msg .px-qr svg", { timeout: 8000 });
ok(true, "QR Code do Pix aparece no cartão");
await ult.scrollIntoViewIfNeeded(); await a.screenshot({ path: "saida/pix-recebido.png" });
ok(await ult.locator(".px-golpe").count() === 0, "Pix normal: sem alerta de golpe");
// Pix "do Help Floripa" mandado pelo chat (gravado direto): quem recebe vê o alerta de golpe.
await db.collection(`conversas/${conv}/mensagens`).add({ ...pix, cartao: { ...pix.cartao, nome: "HELP FLORIPA PLANOS", descricao: "Renovação do plano" }, criadoEm: Timestamp.now() });
await a.waitForTimeout(2500);
ok((await a.locator(".pix-msg").last().locator(".px-golpe").textContent().catch(() => "")).includes("nunca cobra pelo chat"), "Pix em nome do Help Floripa: alerta de golpe");
await a.locator(".pix-msg").last().screenshot({ path: "saida/pix-golpe.png" });

// ---------- 2) compartilhar o perfil com a arte ----------
await a.goto(BASE + `servicos.html?negocio=${NEG}`); await a.waitForSelector(".vd-link", { timeout: 20000 }); await a.waitForTimeout(800);
await a.locator(".vd-link", { hasText: "Compartilhar" }).click(); await a.waitForTimeout(2500);
const comp = await a.evaluate(() => window.__comp);
ok(comp.length === 1 && comp[0].arquivos.length === 1 && comp[0].arquivos[0][1] === "image/png" && comp[0].arquivos[0][2] > 20000, "compartilha a imagem (arte com QR) junto: " + JSON.stringify(comp[0]?.arquivos));
ok(/@brunoreparos\/servicos/.test(comp[0]?.text || ""), "texto com o link curto: " + (comp[0]?.text || ""));

// ---------- 3) avaliações sem comentários ----------
await a.locator(".vd-cab .estrelas, .vd-cab [class*=estrel]").first().click().catch(() => {}); await a.waitForTimeout(1500);
const folha = await a.evaluate(() => [...document.querySelectorAll(".folha.aberta, .av-det, [class*=aval]")].map((e) => e.textContent).join(" "));
ok(!folha.includes("Comentários recentes"), "folha das avaliações sem \"Comentários recentes\"");
await a.screenshot({ path: "saida/pix-avaliacoes.png" });
await A.browser.close();

// ---------- 4) Comunidade sem a setinha ----------
const B2 = await navegador({ mobile: true });
const p = await entrar(B2.ctx, "bruno", "negocios.html");
await p.waitForSelector("#neg-servicos", { timeout: 20000 }); await p.waitForTimeout(800);
const temSeta = await p.evaluate(() => [...document.querySelectorAll("a.comunidade")].some((x) => x.querySelector(".ir")));
ok(!temSeta, "cartão Comunidade sem a setinha");
await B2.browser.close();
process.exit(process.exitCode || 0);
