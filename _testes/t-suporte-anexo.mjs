// Suporte com anexos: abrir chamado com print, responder com PDF, a equipe vê no painel e responde com foto;
// com as regras antigas, o texto vai e o anexo avisa. Uso: node t-suporte-anexo.mjs  (precisa das regras do main)
import { navegador, entrar, garantirImagem, USUARIOS as U } from "./nav.mjs";
import { writeFileSync } from "node:fs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
const db = getFirestore(initializeApp({ projectId: "demo-hf" }));
const ok = (c, m) => console.log(c ? "  ✔" : "  ✘", m);
const foto = garantirImagem("saida/foto1.png");
const pdf = "saida/comprovante.pdf";
writeFileSync(pdf, "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");

const B = await navegador({ mobile: true });
const p = await entrar(B.ctx, "ana", "suporte.html");
await p.waitForSelector("#btnNovo", { timeout: 20000 }); await p.waitForTimeout(1500);
await p.locator("#btnNovo").click(); await p.waitForTimeout(400);
await p.locator("#supCats .sup-cat").first().click();
await p.fill("#supAssunto", "Erro ao salvar o cardápio");
await p.fill("#supTexto", "Aparece uma mensagem de erro quando salvo. Segue o print.");
const esc = p.waitForEvent("filechooser"); await p.click("#supAnexar"); await (await esc).setFiles(foto); await p.waitForTimeout(1500);
ok(await p.locator("#supAnexos .ax-previa").count() === 1, "novo chamado: prévia do print");
await p.locator("#supAnexos").scrollIntoViewIfNeeded(); await p.screenshot({ path: "saida/sup-anexo-novo.png" });
await p.click("#supEnviar"); await p.waitForTimeout(3000);
const ch = (await db.collection("suporte").where("uid", "==", U.ana).get()).docs.find((d) => d.data().assunto === "Erro ao salvar o cardápio");
const msgs = ch ? (await db.collection(`suporte/${ch.id}/mensagens`).get()).docs.map((d) => d.data()) : [];
ok(msgs.some((m) => m.anexo?.tipo === "imagem" && m.anexo.url.startsWith("data:image/jpeg")), "print gravado no chamado (foto reduzida em JPEG)");

// abrir o chamado: foto aparece; responder com PDF
await p.locator(".sup-item, .sup-chamado, [data-chamado]", { hasText: "Erro ao salvar o cardápio" }).first().click().catch(async () => { await p.getByText("Erro ao salvar o cardápio").first().click(); });
await p.waitForSelector("#chMsgs .ax-anexo img", { timeout: 10000 }).catch(() => {});
ok(await p.locator("#chMsgs .ax-anexo img").count() === 1, "a foto aparece na conversa");
const esc2 = p.waitForEvent("filechooser"); await p.click("#chAnexar"); await (await esc2).setFiles(pdf); await p.waitForTimeout(1000);
ok(await p.locator("#chAnexoPrevia .ax-previa").count() === 1, "prévia do PDF antes de enviar");
await p.click("#chEnviar"); await p.waitForTimeout(2500);
ok(await p.locator("#chMsgs .ax-doc").count() === 1, "PDF enviado sem texto aparece para baixar");
await p.screenshot({ path: "saida/sup-anexo-conversa.png" });
await B.browser.close();

// painel da equipe
const D = await navegador({ mobile: false });
const pa = await entrar(D.ctx, "admin", "admin.html#suporte");
await pa.waitForSelector(".ad-kpis", { timeout: 30000 }); await pa.waitForTimeout(1500);
await pa.locator(".ad-chip", { hasText: "Todos" }).click().catch(() => {}); await pa.waitForTimeout(300);
await pa.locator(".ad-item", { hasText: "Erro ao salvar o cardápio" }).locator("strong").first().click();
await pa.waitForSelector(".ad-modal .ad-chat .ad-msg", { timeout: 10000 }); await pa.waitForTimeout(800);
ok(await pa.locator(".ad-modal .ad-msg .ax-anexo img").count() === 1 && await pa.locator(".ad-modal .ad-msg .ax-doc").count() === 1, "painel: a equipe vê a foto e o PDF");
const esc3 = pa.waitForEvent("filechooser"); await pa.locator(".ad-modal .ad-bt", { hasText: "Anexar foto ou PDF" }).click(); await (await esc3).setFiles(foto); await pa.waitForTimeout(1500);
await pa.locator(".ad-modal textarea").fill("Veja aqui onde fica o botão de salvar.");
await pa.screenshot({ path: "saida/sup-anexo-painel.png" });
await pa.locator(".ad-modal .ad-bt.pri", { hasText: "Responder" }).click(); await pa.waitForTimeout(2500);
const resp = (await db.collection(`suporte/${ch.id}/mensagens`).where("equipe", "==", true).get()).docs.map((d) => d.data());
ok(resp.some((m) => m.anexo?.tipo === "imagem" && m.texto.includes("botão de salvar")), "resposta da equipe com foto gravada");
await D.browser.close();
process.exit(0);
