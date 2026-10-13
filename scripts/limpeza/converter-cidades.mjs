// =====================================================
// Conversão em lote das cidades antigas para o padrão novo (estado + cidade do IBGE).
// O site já converte sozinho a conta de quem entra; este script resolve de uma vez as contas
// que não entram há tempo, além dos negócios e anúncios delas.
//   "Florianópolis", "Florianópolis/SC", "florianopolis"  ->  { cidade: "Florianópolis", uf: "SC", cidadeIbge: 4205407 }
// Coleções: usuarios, perfis_publicos, negocios, anuncios. Não mexe em atualizadoEm.
// Por padrão só SIMULA (mostra o que mudaria). Para gravar: node converter-cidades.mjs --aplicar
// Usa o Admin SDK (ignora as regras). Credencial: segredo FIREBASE_SERVICE_ACCOUNT.
// Teste local: FIRESTORE_EMULATOR_HOST (projeto demo-hf).
// =====================================================
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const emulador = !!process.env.FIRESTORE_EMULATOR_HOST;
const conta = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!conta && !emulador) { console.error("Falta o segredo FIREBASE_SERVICE_ACCOUNT."); process.exit(1); }
initializeApp(conta ? { credential: cert(JSON.parse(conta)) } : { projectId: process.env.GCLOUD_PROJECT || "demo-hf" });
const db = getFirestore();
const aplicar = process.argv.includes("--aplicar");

// Lista do IBGE do próprio site (municipios/{UF}.json).
const pasta = fileURLToPath(new URL("../../municipios/", import.meta.url));
const semAcento = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const chave = (s) => semAcento(s).replace(/[-'’`´.]/g, " ").replace(/\s+/g, " ").trim();
const porUf = {};
for (const f of readdirSync(pasta).filter((x) => /^[A-Z]{2}\.json$/.test(x))) {
  porUf[f.slice(0, 2)] = JSON.parse(readFileSync(pasta + f, "utf8")).map(([codigo, nome]) => ({ codigo, nome, k: chave(nome) }));
}
const ANTIGAS = { florianopolis: "Florianópolis", saojose: "São José" };
const APELIDOS = { assu: "acu", floripa: "florianopolis", "sao jose sc": "sao jose" };
// Mesma regra do site (endereco.js): "Cidade/UF", "Cidade - UF"...; sem estado, SC primeiro e
// depois o Brasil todo (só se o nome for único).
function resolver(texto, ufDica = "") {
  let t = String(texto ?? "").trim();
  if (!t) return null;
  if (ANTIGAS[t]) t = ANTIGAS[t];
  let uf = String(ufDica || "").toUpperCase();
  const m = t.match(/^(.*?)\s*(?:\/|-|,|\()\s*([A-Za-z]{2})\s*\)?$/);
  if (m && porUf[m[2].toUpperCase()]) { t = m[1]; uf = m[2].toUpperCase(); }
  let k = chave(t);
  if (APELIDOS[k]) k = APELIDOS[k];
  if (!k) return null;
  const achar = (u) => (porUf[u] || []).filter((c) => c.k === k).map((c) => ({ cidade: c.nome, uf: u, cidadeIbge: c.codigo }));
  if (uf) return achar(uf)[0] || null;
  const sc = achar("SC");
  if (sc.length) return sc[0];
  const todos = Object.keys(porUf).flatMap(achar);
  return todos.length === 1 ? todos[0] : null;
}

const naoReconhecidas = new Map();
let lote = db.batch(), noLote = 0;
async function gravar(ref, dados) {
  if (!aplicar) return;
  lote.set(ref, dados, { merge: true });
  if (++noLote >= 400) { await lote.commit(); lote = db.batch(); noLote = 0; }
}
for (const col of ["usuarios", "perfis_publicos", "negocios", "anuncios"]) {
  const r = { total: 0, ja: 0, convertidas: 0, semCidade: 0, naoReconhecidas: 0 };
  let ultimo = null;
  for (;;) {
    let q = db.collection(col).orderBy("__name__").limit(500);
    if (ultimo) q = q.startAfter(ultimo);
    const s = await q.get();
    if (s.empty) break;
    for (const d of s.docs) {
      r.total++;
      const x = d.data();
      const texto = x.cidade || x.cidadeNome || "";
      if (x.uf && x.cidadeIbge) { r.ja++; continue; }
      if (!String(texto).trim()) { r.semCidade++; continue; }
      const l = resolver(texto, x.uf);
      if (!l) { r.naoReconhecidas++; naoReconhecidas.set(texto, (naoReconhecidas.get(texto) || 0) + 1); continue; }
      r.convertidas++;
      await gravar(d.ref, l);
    }
    ultimo = s.docs[s.docs.length - 1];
    if (s.size < 500) break;
  }
  console.log(`${col}: ${JSON.stringify(r)}`);
}
if (aplicar && noLote) await lote.commit();
if (naoReconhecidas.size) console.log("Cidades não reconhecidas (essas pessoas veem a janela para completar ao entrar):", JSON.stringify([...naoReconhecidas].sort((a, b) => b[1] - a[1]).slice(0, 50)));
console.log(aplicar ? "Conversão gravada." : "Simulação: nada foi gravado. Rode com --aplicar para gravar.");
