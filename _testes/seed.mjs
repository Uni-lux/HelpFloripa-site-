// Dados de exemplo no emulador (projeto demo-hf). APAGA e recria tudo do demo-hf.
// Usuários: ana, bruno (negócio), admin (equipe), dani (equipe, moderação), edu (SP), fabi
// (cidade antiga "florianopolis"), gui (sem cidade), hele (cidade que não existe). Senha: teste123
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
initializeApp({ projectId: "demo-hf" });
const db = getFirestore(), auth = getAuth();
await fetch("http://127.0.0.1:8085/emulator/v1/projects/demo-hf/databases/(default)/documents", { method: "DELETE" });
await fetch("http://127.0.0.1:9099/emulator/v1/projects/demo-hf/accounts", { method: "DELETE" });
const T = (dias, h = 0) => Timestamp.fromMillis(Date.now() - dias * 864e5 - h * 36e5);
const U = {};
for (const [k, nome, nick, cidade] of [["ana", "Ana Souza", "anasouza", "Florianópolis"], ["bruno", "Bruno Reparos", "brunoreparos", "Florianópolis/SC"], ["admin", "Carla Equipe", "carlaequipe", "São José"], ["dani", "Daniel Moderação", "danimod", "Palhoça"]]) {
  const u = await auth.createUser({ email: `${k}@teste.com`, password: "teste123", emailVerified: true, displayName: nome });
  U[k] = u.uid;
  await db.doc(`usuarios/${u.uid}`).set({ uid: u.uid, nome, nickname: nick, email: `${k}@teste.com`, cidade, criadoEm: T(20), aceiteTermos: true });
  await db.doc(`perfis_publicos/${u.uid}`).set({ uid: u.uid, nome, nickname: nick, cidade, fotoPerfil: "", criadoEm: T(20), busca: [nome.split(" ")[0].toLowerCase(), nick] });
  await db.doc(`nicknames/${nick}`).set({ uid: u.uid });
}
for (const [k, nome, nick, extra] of [["edu", "Eduardo Lima", "edulima", { cidade: "São Paulo", uf: "SP", cidadeIbge: 3550308 }], ["fabi", "Fabiana Rocha", "fabirocha", { cidade: "florianopolis" }], ["gui", "Guilherme Alves", "guialves", { cidade: "" }], ["hele", "Helena Prado", "heleprado", { cidade: "Cidade Inventada" }]]) {
  const u = await auth.createUser({ email: `${k}@teste.com`, password: "teste123", emailVerified: true, displayName: nome });
  U[k] = u.uid;
  await db.doc(`usuarios/${u.uid}`).set({ uid: u.uid, nome, nickname: nick, email: `${k}@teste.com`, criadoEm: T(20), aceiteTermos: true, ...extra });
  await db.doc(`perfis_publicos/${u.uid}`).set({ uid: u.uid, nome, nickname: nick, criadoEm: T(20), ...extra });
  await db.doc(`nicknames/${nick}`).set({ uid: u.uid });
}
await db.doc(`usuarios/${U.ana}`).set({ endereco: { cep: "88010001", uf: "SC", cidade: "Florianópolis", bairro: "Centro", rua: "Rua Felipe Schmidt", numero: "10" } }, { merge: true });
await db.doc(`usuarios/${U.bruno}`).set({ endereco: { cidade: "Florianópolis", uf: "SC", bairro: "Trindade", rua: "Rua Lauro Linhares", numero: "500" } }, { merge: true });
await db.doc(`admins/${U.admin}`).set({ nome: "Carla Equipe" });
await db.doc(`admins/${U.dani}`).set({ nome: "Daniel Moderação", papel: "moderacao" });
// Áudio de teste (WAV 8 kHz): "fala" com sílabas de volumes diferentes.
function wav(seg, semente) {
  const sr = 8000, n = sr * seg, b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) { const t = i / sr; const env = Math.max(0, Math.sin(t * Math.PI * (2.3 + semente))) * (0.35 + 0.65 * Math.abs(Math.sin(t * 0.9 + semente))); b.writeInt16LE(Math.round(Math.sin(2 * Math.PI * 220 * t) * env * 26000), 44 + i * 2); }
  return "data:audio/wav;base64," + b.toString("base64");
}
await db.doc(`perfis_publicos/${U.bruno}`).set({ atendimento: { ausente: true, mensagem: "Estou de férias até dia 20. Respondo assim que voltar!", horario: { dias: [1, 2, 3, 4, 5], inicio: "08:00", fim: "18:00" } } }, { merge: true });
const negId = `${U.bruno}_servicos`;
await db.doc(`negocios/${negId}`).set({ donoId: U.bruno, tipo: "servicos", nome: "Bruno Reparos", cidade: "Florianópolis", categorias: ["reparos"], criadoEm: T(15), atualizadoEm: T(1) });
await db.doc(`negocios/${U.edu}_servicos`).set({ donoId: U.edu, tipo: "servicos", nome: "Edu Pinturas", cidade: "São Paulo", uf: "SP", cidadeIbge: 3550308, bairro: "Pinheiros", rua: "Rua dos Pinheiros", numero: "900", categorias: ["pintura"], criadoEm: T(10), atualizadoEm: T(0, 2) });
await db.doc(`negocios/${U.fabi}_servicos`).set({ donoId: U.fabi, tipo: "servicos", nome: "Fabi Faxina", cidade: "Florianópolis/SC", categorias: ["limpeza"], criadoEm: T(9), atualizadoEm: T(0, 3) });
await db.doc(`negocios/${U.bruno}_imoveis`).set({ donoId: U.bruno, tipo: "imoveis", nome: "Bruno Imóveis", cidade: "Florianópolis", criadoEm: T(6), atualizadoEm: T(1) });
await db.doc(`anuncios/an1`).set({ donoId: U.bruno, tipo: "imovel", ativo: true, titulo: "Apto na Trindade", finalidade: "aluguel", categoria: "apartamento", preco: 2500, bairro: "Trindade", cidade: "Florianópolis", fotos: [], criadoEm: T(5), atualizadoEm: T(1) });
await db.doc(`anuncios/an2`).set({ donoId: U.edu, tipo: "imovel", ativo: true, titulo: "Studio em Pinheiros", finalidade: "aluguel", categoria: "apartamento", preco: 3900, bairro: "Pinheiros", cidade: "São Paulo", uf: "SP", cidadeIbge: 3550308, fotos: [], criadoEm: T(4), atualizadoEm: T(0, 5) });
const conv = [U.ana, U.bruno].sort().join("_");
await db.doc(`conversas/${conv}`).set({ participantes: [U.ana, U.bruno], contexto: { tipo: "servicos", titulo: "Conserto de chuveiro" }, falaram: { [U.ana]: true, [U.bruno]: true }, ultimaMensagem: "Pedido de avaliação", ultimaMensagemRemetenteId: U.bruno, atualizadoEm: T(0, 1) });
const msgs = [];
for (let i = 0; i < 14; i++) msgs.push({ remetenteId: i % 2 ? U.bruno : U.ana, texto: `Mensagem antiga ${i + 1}: ` + "texto de exemplo para preencher a conversa. ".repeat(1 + (i % 3)), criadoEm: T(3 - Math.floor(i / 5), 5 - (i % 5)) });
msgs.push({ remetenteId: U.ana, texto: "Oi! O chuveiro ficou ótimo, obrigada.", criadoEm: T(0, 3) });
await db.doc("pedidos/ped1").set({ vendedorId: U.bruno, clienteId: U.ana, negocioId: negId, tipo: "servicos", titulo: "Conserto de chuveiro", conversaId: conv, criadoEm: T(0, 2) });
msgs.push({ remetenteId: U.bruno, texto: "", tipoArquivo: "avaliacao", avaliacao: { pedidoId: "ped1", titulo: "Conserto de chuveiro", tipo: "servicos", negocioNome: "Bruno Reparos" }, criadoEm: T(0, 2) });
msgs.push({ remetenteId: U.bruno, texto: "Qualquer coisa é só chamar.", criadoEm: T(0, 1) });
msgs.push({ remetenteId: U.ana, texto: "", arquivoUrl: wav(6, 0.3), tipoArquivo: "audio", nomeArquivo: "audio", criadoEm: T(0, 0.5) });
for (const [i, m] of msgs.entries()) await db.doc(`conversas/${conv}/mensagens/m${String(i).padStart(3, "0")}`).set(m);
await db.collection("denuncias").add({ tipo: "perfil", alvoId: U.bruno, itemId: U.bruno, autorId: U.ana, motivo: "spam", status: "nova", criadoEm: T(0, 4) });
await db.collection("suporte").add({ uid: U.ana, nome: "Ana Souza", email: "ana@teste.com", assunto: "Não consigo mudar a foto", categoria: "conta", status: "aberto", criadoEm: T(1), atualizadoEm: T(1), ultimaDe: "usuario" });
await db.collection("suporte").add({ uid: U.ana, nome: "Ana Souza", email: "ana@teste.com", assunto: "Dúvida resolvida", categoria: "outro", status: "fechado", criadoEm: T(2), atualizadoEm: T(2), ultimaDe: "equipe" });
// Chat da equipe: grupo e individual, com áudio, foto, arquivo, citação e reações.
const anexo = async (conversa, dados, autor) => (await db.collection("equipe_anexos").add({ autorId: autor, conversa, dados, em: T(0, 1) })).id;
const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const grupo = [
  { autorId: U.dani, nome: "Daniel Moderação", texto: "Bom dia, equipe! Hoje tem 3 denúncias novas para olhar.", em: T(0, 5) },
  { autorId: U.admin, nome: "Carla Equipe", texto: "Bom dia! Pego as duas primeiras. @Daniel fica com a terceira?", mencoes: [U.dani], em: T(0, 4.9) },
  { autorId: U.dani, nome: "Daniel Moderação", texto: "", tipoArquivo: "audio", anexo: await anexo("equipe", wav(9, 1.1), U.dani), nomeArquivo: "audio", tamanho: 140000, duracao: 9, em: T(0, 4.8), reacoes: { [U.admin]: "👍" } },
  { autorId: U.admin, nome: "Carla Equipe", texto: "Combinado 👍", resposta: { id: "x", autorId: U.dani, nome: "Daniel Moderação", texto: "Áudio" }, em: T(0, 4.7) },
  { autorId: U.dani, nome: "Daniel Moderação", texto: "Print da denúncia", tipoArquivo: "imagem", anexo: await anexo("equipe", png, U.dani), miniatura: png, nomeArquivo: "print.png", tamanho: 900, em: T(0, 4.6) },
  { autorId: U.admin, nome: "Carla Equipe", texto: "", tipoArquivo: "arquivo", anexo: await anexo("equipe", "data:application/pdf;base64,JVBERi0xLjQK", U.admin), nomeArquivo: "relatorio-semanal.pdf", tamanho: 48211, em: T(0, 4.5) },
];
for (const m of grupo) await db.collection("equipe_chat").add(m);
const par = [U.admin, U.dani].sort().join("_");
await db.doc(`equipe_dm/${par}`).set({ participantes: par.split("_"), ultimaEm: T(0, 2), ultimaTexto: "Pode revisar o chamado da Ana?", ultimoAutor: U.dani, lidoEm: {} });
await db.collection(`equipe_dm/${par}/mensagens`).add({ autorId: U.dani, nome: "Daniel Moderação", texto: "Pode revisar o chamado da Ana?", em: T(0, 2) });
await db.collection(`equipe_dm/${par}/mensagens`).add({ autorId: U.admin, nome: "Carla Equipe", texto: "", tipoArquivo: "audio", anexo: await anexo(par, wav(4, 2.2), U.admin), nomeArquivo: "audio", tamanho: 64000, duracao: 4, em: T(0, 1.9) });
import("node:fs").then((fs) => { fs.mkdirSync(new URL("saida/", import.meta.url), { recursive: true }); fs.writeFileSync(new URL("saida/seed.json", import.meta.url), JSON.stringify({ ...U, conv })); });
console.log(JSON.stringify({ ...U, conv }));
