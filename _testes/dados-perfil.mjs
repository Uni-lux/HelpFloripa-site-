// Dados de teste para o perfil/social: duo Ana–Bruno, amizade Ana–Dani, publicações da Ana e capa.
// Uso: FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 node dados-perfil.mjs
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8085";
const ids = JSON.parse(readFileSync(new URL("saida/seed-ids.json", import.meta.url), "utf8"));
initializeApp({ projectId: "demo-hf" });
const db = getFirestore();
const par = (a, b) => [a, b].sort();
const agora = Date.now();
async function vinc(a, b, tipoDe, tipoPara) {
  const p = par(a, b);
  await db.doc(`vinculos/${p.join("_")}`).set({ participantes: p, de: a, para: b, tipoDe, tipoPara, status: "aceito", criadoEm: Timestamp.now(), aceitoEm: Timestamp.fromMillis(agora - 40 * 864e5) });
}
await vinc(ids.ana, ids.bruno, "duo", "duo");
if (ids.dani) await vinc(ids.ana, ids.dani, "amigo", "amigo");
if (ids.edu) await vinc(ids.ana, ids.edu, "irmao", "irmao");
const foto = (cor) => `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900"><rect width="900" height="900" fill="${cor}"/><circle cx="450" cy="450" r="260" fill="#fff" opacity=".35"/></svg>`).toString("base64")}`;
const posts = [
  { texto: "Bom dia, Floripa! Primeiro post com foto.", mediaUrl: foto("#0b7cb3"), mediaTipo: "imagem" },
  { texto: "Um texto só, sem foto, para ver como fica a lista do perfil. #teste" },
  { texto: "Qual o melhor bairro para morar?", enquete: { pergunta: "Qual o melhor bairro para morar?", opcoes: ["Centro", "Lagoa", "Campeche"] } },
  { texto: "Pôr do sol na ponte", mediaUrl: foto("#e07a1a"), mediaTipo: "imagem" }
];
let n = 0;
for (const p of posts) {
  n++;
  await db.doc(`diario/perfil_teste_${n}`).set({ autorId: ids.ana, nome: "Ana Souza", fotoPerfil: "", criadoEm: Timestamp.fromMillis(agora - n * 3600e3), ...p });
}
console.log("ok", n, "publicações");
