// =====================================================
// Busca nacional: preenche de uma vez o campo `busca` (palavras para a busca do Explorar, das vitrines e da Comunidade)
// em negócios, anúncios de imóveis e anúncios da Comunidade que ainda não têm. O site já preenche sozinho quando o dono
// abre Meus negócios ou salva; este script resolve os perfis de quem não entra há tempo.
// Mesmas palavras do busca.js do site (nome, categorias, profissão de saúde, cidade, bairro, descrição).
// Por padrão só SIMULA. Para gravar: node preencher-busca.mjs --aplicar. Não mexe em atualizadoEm.
// Usa o Admin SDK (ignora as regras). Credencial: segredo FIREBASE_SERVICE_ACCOUNT. Teste local: FIRESTORE_EMULATOR_HOST.
// =====================================================
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { termosBusca } from "../../busca.js";

const emulador = !!process.env.FIRESTORE_EMULATOR_HOST;
const conta = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!conta && !emulador) { console.error("Falta o segredo FIREBASE_SERVICE_ACCOUNT."); process.exit(1); }
initializeApp(conta ? { credential: cert(JSON.parse(conta)) } : { projectId: process.env.GCLOUD_PROJECT || "demo-hf" });
const db = getFirestore();
const aplicar = process.argv.includes("--aplicar");
const TIPOS = { servicos: "Freelances", delivery: "Delivery", lojinha: "Lojinha", imoveis: "Imóveis", saude: "Saúde" };
const cidade = (c) => String(c || "").replace(/\s*\/\s*[A-Za-z]{2}$/, "");

const PALAVRAS = {
  negocios: (d) => [d.nome, d.categoriaPersonalizada, d.categorias || d.categoria, d.saude?.profissaoOutra, d.saude?.profissao, d.saude?.especialidades || [], TIPOS[d.tipo], cidade(d.cidade), d.bairro, d.descricao],
  anuncios: (d) => [d.titulo, d.categoriaPersonalizada, d.categoria, d.finalidade, "imóvel", d.bairro, cidade(d.cidade), d.descricao],
  comunidade: (d) => [d.titulo, d.tipoItem, d.categoria, d.bairro, cidade(d.cidade), d.descricao]
};
for (const [col, palavras] of Object.entries(PALAVRAS)) {
  let n = 0, total = 0, ultimo = null;
  for (;;) {
    let q = db.collection(col).orderBy("__name__").limit(400);
    if (ultimo) q = q.startAfter(ultimo);
    const s = await q.get();
    if (s.empty) break;
    const lote = db.batch();
    for (const d of s.docs) {
      total++;
      if (Array.isArray(d.data().busca)) continue;
      const busca = termosBusca(palavras(d.data()).flat().filter((x) => typeof x === "string"));
      if (!busca.length) continue;
      n++; lote.update(d.ref, { busca });
    }
    if (aplicar && n) await lote.commit();
    ultimo = s.docs.at(-1);
    if (s.size < 400) break;
  }
  console.log(`${col}: ${n} de ${total} ${aplicar ? "preenchidos" : "seriam preenchidos (simulação)"}`);
}
