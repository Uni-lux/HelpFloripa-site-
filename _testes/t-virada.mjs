// Conta convertida com as regras antigas; depois de publicar as novas, o perfil público se completa sozinho.
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { execSync } from "node:child_process";
import { navegador, entrar, USUARIOS } from "./nav.mjs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
initializeApp({ projectId: "demo-hf" });
const db = getFirestore();
const pub = async () => { const d = (await db.doc(`perfis_publicos/${USUARIOS.fabi}`).get()).data(); const n = (await db.doc(`negocios/${USUARIOS.fabi}_servicos`).get()).data(); return JSON.stringify({ publico: [d.cidade, d.uf, d.cidadeIbge], negocio: [n.cidade, n.uf, n.cidadeIbge, n.atualizadoEm?.toMillis?.()] }); };
console.log(execSync("node trocar-regras.mjs pr25", { cwd: new URL(".", import.meta.url).pathname }).toString().trim());
let { browser, ctx } = await navegador({ mobile: true });
let p = await entrar(ctx, "fabi", "index.html"); await p.waitForTimeout(5000);
console.log("com as regras antigas:", await pub());
await browser.close();
console.log(execSync("node trocar-regras.mjs main", { cwd: new URL(".", import.meta.url).pathname }).toString().trim());
({ browser, ctx } = await navegador({ mobile: true }));
p = await entrar(ctx, "fabi", "index.html"); await p.waitForTimeout(5000);
console.log("depois de publicar:", await pub());
await browser.close(); process.exit(0);
