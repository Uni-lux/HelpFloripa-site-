// Testes das regras do Firestore (firestore.rules) no emulador, projeto separado "demo-regras"
// (não apaga os dados do demo-hf que o navegador usa). Uso: node testes-regras.mjs [arquivo.rules]
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { doc, setDoc, updateDoc, getDoc, Timestamp, serverTimestamp } from "firebase/firestore";

const arquivo = process.argv[2] || new URL("../firestore.rules", import.meta.url).pathname;
const env = await initializeTestEnvironment({ projectId: "demo-regras", firestore: { rules: readFileSync(arquivo, "utf8"), host: "127.0.0.1", port: 8085 } });
let ok = 0, falhou = 0;
const resultados = [];
async function t(nome, fn) {
  try { await fn(); ok++; resultados.push(["ok", nome]); }
  catch (e) { falhou++; resultados.push(["FALHOU", nome, e.message.split("\n")[0].slice(0, 200)]); }
}
const antigo = Timestamp.fromMillis(Date.now() - 10 * 864e5);
const ctx = (uid, verificado = true) => env.authenticatedContext(uid, { email: `${uid}@t.com`, email_verified: verificado }).firestore();
async function semRegras(fn) { await env.withSecurityRulesDisabled(async (c) => fn(c.firestore())); }

// ---------- dados base ----------
await env.clearFirestore();
await semRegras(async (db) => {
  for (const u of ["ana", "bia", "dono"]) await setDoc(doc(db, "usuarios", u), { uid: u, nome: u, criadoEm: antigo, aceiteTermos: true });
  await setDoc(doc(db, "perfis_publicos", "bia"), { uid: "bia", nome: "Bia", cidade: "Florianópolis" });
  await setDoc(doc(db, "admins", "adm"), { nome: "Adm" });
});

// ===================== ETAPA 3: endereço para o Brasil todo =====================
const perfil = (extra) => ({ uid: "ana", nome: "Ana", cidade: "Florianópolis", ...extra });
await t("perfil: cria com uf + cidadeIbge certos (SC/Florianópolis)", () => assertSucceeds(setDoc(doc(ctx("ana"), "perfis_publicos", "ana"), perfil({ uf: "SC", cidadeIbge: 4205407 }))));
await t("perfil: atualiza para SP/São Paulo", () => assertSucceeds(updateDoc(doc(ctx("ana"), "perfis_publicos", "ana"), { cidade: "São Paulo", uf: "SP", cidadeIbge: 3550308 })));
await t("perfil: DF/Brasília (código 5300108)", () => assertSucceeds(updateDoc(doc(ctx("ana"), "perfis_publicos", "ana"), { cidade: "Brasília", uf: "DF", cidadeIbge: 5300108 })));
await t("perfil: recusa UF inexistente", () => assertFails(updateDoc(doc(ctx("ana"), "perfis_publicos", "ana"), { uf: "XX" })));
await t("perfil: recusa código de outro estado (SC + código de SP)", () => assertFails(updateDoc(doc(ctx("ana"), "perfis_publicos", "ana"), { uf: "SC", cidadeIbge: 3550308 })));
await t("perfil: recusa código em texto", () => assertFails(updateDoc(doc(ctx("ana"), "perfis_publicos", "ana"), { uf: "SC", cidadeIbge: "4205407" })));
await t("perfil: recusa código sem estado", () => assertFails(setDoc(doc(ctx("bia"), "perfis_publicos", "bia"), { uid: "bia", nome: "Bia", cidadeIbge: 4205407 })));
await t("perfil: recusa código fora da faixa", () => assertFails(updateDoc(doc(ctx("ana"), "perfis_publicos", "ana"), { uf: "SC", cidadeIbge: 42054070 })));
await t("perfil: aceita limpar (uf vazio e código nulo)", () => assertSucceeds(updateDoc(doc(ctx("ana"), "perfis_publicos", "ana"), { cidade: "", uf: "", cidadeIbge: null })));
await t("perfil antigo sem uf continua editável (só nome)", () => assertSucceeds(updateDoc(doc(ctx("bia"), "perfis_publicos", "bia"), { nome: "Bia S." })));
await t("perfil: recusa campo desconhecido", () => assertFails(updateDoc(doc(ctx("ana"), "perfis_publicos", "ana"), { estado: "SC" })));

const neg = (extra) => ({ donoId: "dono", tipo: "servicos", nome: "Reparos", cidade: "Florianópolis", uf: "SC", cidadeIbge: 4205407, bairro: "Centro", criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(), ...extra });
await t("negócio: cria com estado, cidade, bairro e endereço", () => assertSucceeds(setDoc(doc(ctx("dono"), "negocios", "dono_servicos"), neg({ rua: "Rua Felipe Schmidt", numero: "120", complemento: "Sala 3", cep: "88010001" }))));
await t("negócio: recusa CEP com traço", () => assertFails(setDoc(doc(ctx("dono"), "negocios", "dono_delivery"), neg({ tipo: "delivery", cep: "88010-001" }))));
await t("negócio: recusa rua com mais de 100 letras", () => assertFails(setDoc(doc(ctx("dono"), "negocios", "dono_delivery"), neg({ tipo: "delivery", rua: "x".repeat(101) }))));
await t("negócio: recusa cidade de outro estado", () => assertFails(setDoc(doc(ctx("dono"), "negocios", "dono_delivery"), neg({ tipo: "delivery", uf: "RS", cidadeIbge: 4205407 }))));
await t("negócio: sem endereço detalhado continua valendo", () => assertSucceeds(setDoc(doc(ctx("dono"), "negocios", "dono_lojinha"), { donoId: "dono", tipo: "lojinha", nome: "Loja", cidade: "Palhoça" })));

const anuncio = (extra) => ({ donoId: "dono", tipo: "imovel", titulo: "Apto 2 quartos", finalidade: "aluguel", categoria: "apartamento", bairro: "Trindade", cidade: "Florianópolis", uf: "SC", cidadeIbge: 4205407, ...extra });
await t("anúncio: cria com estado, cidade, bairro, rua e CEP", () => assertSucceeds(setDoc(doc(ctx("dono"), "anuncios", "a1"), anuncio({ rua: "Rua Lauro Linhares", cep: "88036001" }))));
await t("anúncio: recusa UF errada", () => assertFails(setDoc(doc(ctx("dono"), "anuncios", "a2"), anuncio({ uf: "sc" }))));
await t("anúncio: recusa campo desconhecido", () => assertFails(setDoc(doc(ctx("dono"), "anuncios", "a3"), anuncio({ estado: "SC" }))));
await t("usuário: endereço completo na parte privada", () => assertSucceeds(setDoc(doc(ctx("ana"), "usuarios", "ana"), { cidade: "Florianópolis", uf: "SC", cidadeIbge: 4205407, endereco: { cep: "88010001", uf: "SC", cidade: "Florianópolis", cidadeIbge: 4205407, bairro: "Centro", rua: "Rua A", numero: "1", complemento: "" } }, { merge: true })));
await t("usuário: outra pessoa não lê o endereço", () => assertFails(getDoc(doc(ctx("bia"), "usuarios", "ana"))));

// ---------- resultado ----------
for (const r of resultados) console.log(r[0] === "ok" ? "  ✔" : "  ✘", r[1], r[2] ? "→ " + r[2] : "");
console.log(`\n${ok} passaram, ${falhou} falharam (${arquivo})`);
await env.cleanup();
process.exit(falhou ? 1 : 0);
