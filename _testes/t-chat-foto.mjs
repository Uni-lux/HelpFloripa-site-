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
if (process.env.STORAGE !== "1") ok(/^data:image\/jpeg/.test(msg?.arquivoUrl || ""), "foto enviada (JPEG dentro da mensagem, sem Storage)");
ok(!(await p.locator(".toast, .vt-toast").filter({ hasText: "ler a imagem" }).count()), "sem o aviso 'Não foi possível ler a imagem'");
// STORAGE=1: uma foto que o aparelho não consegue desenhar (PNG quebrado) vai como veio para o Storage.
if (process.env.STORAGE === "1") {
  const { writeFileSync } = await import("node:fs");
  const { execSync } = await import("node:child_process");
  const RG = new URL("saida/regras-storage-teste.rules", import.meta.url).pathname;
  writeFileSync(RG, readFileSync(new URL("../firestore.rules", import.meta.url), "utf8").replaceAll("https://firebasestorage[.]googleapis[.]com/", "(https://firebasestorage[.]googleapis[.]com|http://127[.]0[.]0[.]1:9199)/"));
  execSync(`node trocar-regras.mjs ${RG}`);
  try {
    const ruim = new URL("saida/quebrada.png", import.meta.url).pathname;
    writeFileSync(ruim, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(4000, 7)]));
    await p.reload(); await p.waitForSelector("#btnAnexar", { timeout: 20000 }); await p.waitForTimeout(2500);
    await p.setInputFiles("#inputArquivo", ruim); await p.waitForTimeout(600);
    await p.locator("#btnEnviar").click(); await p.waitForTimeout(5000);
    const m2 = (await db.collection(`conversas/${conv}/mensagens`).orderBy("criadoEm", "desc").limit(1).get()).docs[0]?.data();
    ok(/127\.0\.0\.1:9199.*\.png/.test(m2?.arquivoUrl || ""), "foto que não abre no aparelho vai como veio para o Storage");
  } finally { execSync("node trocar-regras.mjs main"); }
}
await B.browser.close();
console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
