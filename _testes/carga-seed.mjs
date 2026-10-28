// Volume de site grande no emulador (por cima do seed.mjs, sem apagar): 60 pessoas, 400 publicações
// (1 em 3 com foto de ~80 KB dentro do documento, como hoje sem o Storage), comentários, estrelas,
// quem segue quem, 400 negócios dos 5 tipos, 120 imóveis, 300 anúncios da Comunidade e 300 reclamações. Usado pelo t-leituras.mjs.
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
initializeApp({ projectId: "demo-hf" });
const db = getFirestore();
const U = JSON.parse(readFileSync(new URL("saida/seed.json", import.meta.url), "utf8"));
const T = (horas) => Timestamp.fromMillis(Date.now() - horas * 36e5);
const FOTO = "data:image/jpeg;base64," + Buffer.alloc(60000, 7).toString("base64"); // ~80 KB
const CIDADES = [["Florianópolis", "SC", 4205407], ["São José", "SC", 4216602], ["São Paulo", "SP", 3550308], ["Curitiba", "PR", 4106902], ["Recife", "PE", 2611606]];

let lote = db.batch(), n = 0;
async function por(ref, dados) { lote.set(ref, dados); if (++n % 100 === 0) { await lote.commit(); lote = db.batch(); } }

const pessoas = Array.from({ length: 60 }, (_, i) => `cg_u${i}`);
for (const [i, uid] of pessoas.entries()) {
  const [cidade, uf, ibge] = CIDADES[i % 5];
  const p = { uid, nome: `Pessoa ${i}`, nickname: `pessoa${i}`, cidade, uf, cidadeIbge: ibge, fotoPerfil: "", criadoEm: T(500), busca: [`pessoa`, `pessoa${i}`] };
  await por(db.doc(`usuarios/${uid}`), { ...p, aceiteTermos: true });
  await por(db.doc(`perfis_publicos/${uid}`), p);
}
// Ana segue 40, 30 seguem a Ana.
for (const uid of pessoas.slice(0, 40)) await por(db.doc(`relacoes/${U.ana}_${uid}`), { tipo: "seguir", seguidorId: U.ana, alvoId: uid, criadoEm: T(100) });
for (const uid of pessoas.slice(20, 50)) await por(db.doc(`relacoes/${uid}_${U.ana}`), { tipo: "seguir", seguidorId: uid, alvoId: U.ana, criadoEm: T(100) });

for (let i = 0; i < 400; i++) {
  const autor = pessoas[i % 60], [, uf, ibge] = CIDADES[(i % 60) % 5], id = `cg_p${i}`;
  const comFoto = i % 3 === 0;
  await por(db.doc(`diario/${id}`), {
    autorId: autor, nome: `Pessoa ${i % 60}`, fotoPerfil: "", texto: `Publicação de carga ${i} #floripa`, tags: ["floripa"],
    ...(comFoto ? { mediaUrl: FOTO, mediaTipo: "image" } : {}), autorUf: uf, autorIbge: ibge, criadoEm: T(i * 0.6)
  });
  if (i < 150) {
    for (let k = 0; k < 3; k++) await por(db.doc(`comentarios/cg_c${i}_${k}`), { postId: id, postAutorId: autor, autorId: pessoas[(i + k + 1) % 60], nome: "Alguém", texto: `Comentário ${k}`, criadoEm: T(i * 0.6 - 0.1) });
    const notas = [5, 4, 5];
    for (const [k, nota] of notas.entries()) await por(db.doc(`curtidas/${id}_${pessoas[(i + k + 7) % 60]}`), { postId: id, postAutorId: autor, uid: pessoas[(i + k + 7) % 60], nota, criadoEm: T(i * 0.6) });
    await por(db.doc(`diario_notas/${id}`), { total: 3, soma: 14, n1: 0, n2: 0, n3: 0, n4: 1, n5: 2 });
  }
}
const TIPOS = ["servicos", "delivery", "lojinha", "imoveis", "saude"];
for (let i = 0; i < 400; i++) {
  const tipo = TIPOS[i % 5], dono = `cg_n${i}`, [cidade, uf, ibge] = CIDADES[i % 5];
  await por(db.doc(`negocios/${dono}_${tipo}`), {
    donoId: dono, tipo, nome: `Negócio ${tipo} ${i}`, cidade, uf, cidadeIbge: ibge, bairro: "Centro", categorias: tipo === "servicos" ? ["limpeza"] : [],
    descricao: "Descrição de um negócio de carga com algumas palavras.", busca: ["negocio", tipo, String(i)], criadoEm: T(i * 2), atualizadoEm: T(i)
  });
}
for (let i = 0; i < 120; i++) {
  const [cidade, uf, ibge] = CIDADES[i % 5];
  await por(db.doc(`anuncios/cg_a${i}`), { donoId: `cg_n${i}`, tipo: "imovel", ativo: true, titulo: `Imóvel ${i}`, finalidade: "aluguel", categoria: "apartamento", preco: 1500 + i * 10, bairro: "Centro", cidade, uf, cidadeIbge: ibge, fotos: [], criadoEm: T(i * 3), atualizadoEm: T(i * 3) });
}
// Comunidade (300 anúncios em 5 cidades) e reclamações (200 avaliações baixas + 100 queixas).
const CATS = ["doacao", "troca", "pedido", "quarto", "achados"];
for (let i = 0; i < 300; i++) {
  const [cidade, uf, ibge] = CIDADES[i % 5];
  await por(db.doc(`comunidade/cg_c${i}`), { autorId: `cg_u${i % 60}`, categoria: CATS[i % 5], titulo: `Anúncio ${i}`, descricao: "Doação de carga.", status: "disponivel", fotos: [], cidade, uf, cidadeIbge: ibge, bairro: "Centro", busca: ["anuncio", String(i)], criadoEm: T(i), atualizadoEm: T(i) });
}
for (let i = 0; i < 200; i++) {
  const tipo = TIPOS[i % 5], n = `cg_n${i}_${tipo}`;
  await por(db.doc(`avaliacoes/cg_av${i}`), { tipo: "negocio", nota: 1 + (i % 2), negocioId: n, alvoId: `cg_n${i}`, autorId: `cg_u${i % 60}`, autorNome: `Pessoa ${i % 60}`, comentario: "Não gostei do atendimento.", criadoEm: T(i) });
}
for (let i = 0; i < 100; i++) {
  const tipo = TIPOS[i % 5];
  await por(db.doc(`queixas/cg_q${i}`), { negocioId: `cg_n${i}_${tipo}`, alvoId: `cg_n${i}`, autorId: `cg_u${i % 60}`, autorNome: `Pessoa ${i % 60}`, motivo: "atraso", texto: "Atrasou muito.", status: "aberta", abertaEm: T(i), criadoEm: T(i) });
}
await lote.commit();
console.log(`Carga gravada: ${n} documentos.`);
