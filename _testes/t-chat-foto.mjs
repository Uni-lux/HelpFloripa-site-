// Foto no chat (23/11/2026): a foto escolhida é copiada para a memória na hora (no Android a permissão de ler a
// foto da galeria podia acabar antes de enviar: "Não foi possível ler a imagem"). Sem Storage vai comprimida no doc.
process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { navegador, entrar, garantirImagem } from "./nav.mjs";
const db = getFirestore(initializeApp({ projectId: "demo-hf" }));
let falhas = 0; const ok = (c, m) => { console.log((c ? "  ✔ " : "  ✘ ") + m); if (!c) falhas++; };
const ids = JSON.parse(readFileSync(new URL("saida/seed-ids.json", import.meta.url)));
const conv = [ids.ana, ids.bruno].sort().join("_");
await db.doc(`conversas/${conv}`).set({ participantes: [ids.ana, ids.bruno], criadoEm: new Date(), atualizadoEm: new Date() }, { merge: true });
const B = await navegador({ mobile: true });
const p = await entrar(B.ctx, "bruno", `mensagens.html?conversa=${conv}`);
await p.waitForSelector("#btnAnexar", { timeout: 20000 }); await p.waitForTimeout(2500);
await p.setInputFiles("#inputArquivo", garantirImagem("saida/chat-foto.png", 2400, 1800));
await p.waitForSelector("#barraAnexo:not([hidden])", { timeout: 8000 });
ok(await p.locator("#anexoThumb img").count() === 1, "prévia da foto aparece");
// O campo de arquivo é limpo antes de enviar: a foto tem que sair da cópia guardada.
await p.evaluate(() => { document.getElementById("inputArquivo").value = ""; });
await p.locator("#btnEnviar").click(); await p.waitForTimeout(4000);
const msg = (await db.collection(`conversas/${conv}/mensagens`).orderBy("criadoEm", "desc").limit(1).get()).docs[0]?.data();
ok(/^data:image\/jpeg/.test(msg?.arquivoUrl || ""), "foto enviada (JPEG dentro da mensagem, sem Storage)");
ok(!(await p.locator(".toast, .vt-toast").filter({ hasText: "ler a imagem" }).count()), "sem o aviso 'Não foi possível ler a imagem'");
await B.browser.close();
console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
