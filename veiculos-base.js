// =====================================================
// Veículos — base sem dependências (alertas.js, negocios.js, vitrine.js, painel e testes). 18/11/2026, pedido do dono:
// "registrar seu carro/moto" e "requisito obrigatório para vender carro ou moto: a placa, oculta, para cruzar informações".
//
// Como funciona (sem servidor):
// - veiculos/{id}: o carro/moto da pessoa, com a placa. Só o dono e a moderação leem.
// - veiculos_venda/{negocioId}_{16 letras do hash}: índice público de cada carro/moto anunciado no Shopping ou no
//   Automotivo, com o HASH da placa (SHA-256 da placa no padrão Mercosul), nunca a placa. Quem tem a placa (o dono do
//   carro roubado, a equipe, quem vai comprar) acha o anúncio; quem só olha o anúncio não vê a placa.
// - A placa antiga (ABC1234) e a Mercosul (ABC1C34) são o MESMO carro: o hash usa sempre a forma Mercosul.
// - Ao anunciar, o site confere se a placa tem ocorrência de roubo/furto ativa: se tem, não deixa e avisa quem registrou
//   (pista automática). Ao registrar roubo, procura anúncios com a mesma placa e parecidos (marca, modelo, cor, ano, lugar).
// =====================================================
export const TIPOS_VEICULO = { carro: ["Carro", "carro"], moto: ["Moto", "moto"] };
export const STATUS_VEICULO = { ok: ["Com você", "verde"], roubado: ["Roubado ou furtado", "vermelho"], recuperado: ["Recuperado", "ciano"] };
export const MARCAS = {
  carro: ["Chevrolet", "Fiat", "Volkswagen", "Ford", "Toyota", "Hyundai", "Renault", "Honda", "Jeep", "Nissan", "Peugeot", "Citroën", "Mitsubishi", "Kia", "BYD", "Caoa Chery", "BMW", "Mercedes-Benz", "Audi", "Volvo", "Land Rover", "Suzuki", "RAM", "GWM"],
  moto: ["Honda", "Yamaha", "Suzuki", "Kawasaki", "BMW", "Triumph", "Harley-Davidson", "Royal Enfield", "Dafra", "Shineray", "Haojue", "Ducati", "KTM", "Bajaj", "Avelloz", "Mottu"]
};
export const CORES_VEICULO = ["Branco", "Preto", "Prata", "Cinza", "Vermelho", "Azul", "Verde", "Amarelo", "Marrom", "Bege", "Dourado", "Laranja", "Vinho", "Outra"];

// ---------- placa ----------
export const normalizarPlaca = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
export const placaOk = (s) => /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(normalizarPlaca(s));
// Mercosul: o 5º caractere da placa antiga vira letra (0→A ... 9→J). Assim ABC1234 e ABC1C34 são o mesmo carro.
export function placaMercosul(s) {
  const p = normalizarPlaca(s);
  if (!/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(p)) return p;
  return /\d/.test(p[4]) ? p.slice(0, 4) + "ABCDEFGHIJ"[Number(p[4])] + p.slice(5) : p;
}
// A forma antiga (só existe se o 5º caractere for de A a J).
export function placaAntiga(s) {
  const p = placaMercosul(s);
  const i = "ABCDEFGHIJ".indexOf(p[4]);
  return i >= 0 ? p.slice(0, 4) + i + p.slice(5) : "";
}
// As duas formas da placa (para procurar ocorrências registradas de um jeito ou de outro).
export const formasPlaca = (s) => [...new Set([placaMercosul(s), placaAntiga(s)].filter(Boolean))];
export function formatarPlaca(s) {
  const p = normalizarPlaca(s);
  if (/^[A-Z]{3}\d{4}$/.test(p)) return `${p.slice(0, 3)}-${p.slice(3)}`;
  return p;
}
// Só o começo e o fim (para listas e o painel): "ABC•••3".
export const placaEscondida = (s) => { const p = normalizarPlaca(s); return p.length === 7 ? `${p.slice(0, 3)}•••${p.slice(6)}` : "•••"; };
async function sha256(txt) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
export const hashPlaca = (s) => sha256("hf-veiculo:" + placaMercosul(s));
export const idVenda = (negocioId, hash) => `${negocioId}_${String(hash).slice(0, 16)}`;

// ---------- IMEI (celular) ----------
// 15 números e o último confere a soma (algoritmo de Luhn): pega número digitado errado antes de registrar/consultar.
export function imeiOk(s) {
  const x = String(s || "").replace(/\D/g, "");
  if (!/^\d{15}$/.test(x)) return false;
  let soma = 0;
  for (let i = 0; i < 15; i++) { let d = Number(x[14 - i]); if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; } soma += d; }
  return soma % 10 === 0;
}

// ---------- anúncio parece um carro/moto? ----------
// Usado para exigir a placa: produto com nome de carro ou moto e preço de veículo precisa ser marcado como veículo.
const PALAVRAS_VEICULO = /\b(carro|automovel|veiculo|moto|motocicleta|motoneta|scooter|sedan|hatch|picape|pickup|caminhonete|suv|onix|celta|corsa|prisma|gol|polo|virtus|fox|up|voyage|saveiro|palio|uno|mobi|argo|cronos|strada|toro|siena|ka|fiesta|ecosport|ranger|corolla|etios|yaris|hilux|hb20|creta|tucson|sandero|logan|kwid|duster|civic|fit|city|hr-?v|renegade|compass|kicks|versa|march|208|2008|3008|c3|cg ?1[2-6]0|titan|fan|biz|pop ?1[01]0|bros|fazer|factor|lander|xre|nmax|pcx|cb ?(250|300|500)|hornet|ninja|z ?(400|900)|yes|intruder)\b/;
export function pareceVeiculo(nome, preco) {
  const t = String(nome || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (!PALAVRAS_VEICULO.test(t)) return false;
  if (/\b(miniatura|brinquedo|capa|capacete|pneu|roda|peca|pecas|tapete|som|retrovisor|bateria|oleo|lampada|chaveiro|adesivo|kit|suporte|carregador|controle)\b/.test(t)) return false;
  return !(Number(preco) > 0) || Number(preco) >= 1500;
}

// ---------- semelhança entre um veículo roubado e um anúncio (0 a 100, como os pets) ----------
const sem = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const tsMs = (t) => (t?.toMillis ? t.toMillis() : typeof t === "number" ? t : 0);
export function semelhancaVeiculo(roubado, anuncio) {
  if (!roubado || !anuncio) return 0;
  if (roubado.placaHash && anuncio.placaHash) { if (roubado.placaHash === anuncio.placaHash) return 100; }
  if (roubado.tipo && anuncio.tipo && roubado.tipo !== anuncio.tipo) return 0;
  let n = 10;
  const ma = sem(roubado.marca), mb = sem(anuncio.marca);
  if (ma && mb) { if (ma === mb) n += 22; else return Math.min(n, 15); }
  const oa = sem(roubado.modelo), ob = sem(anuncio.modelo);
  if (oa && ob) n += oa === ob ? 28 : (oa.includes(ob) || ob.includes(oa)) ? 18 : oa.split(/\s+/)[0] === ob.split(/\s+/)[0] ? 10 : -12;
  const ca = sem(roubado.cor), cb = sem(anuncio.cor);
  if (ca && cb) n += ca === cb ? 14 : -10;
  const aa = Number(roubado.ano), ab = Number(anuncio.ano);
  if (aa && ab) { const d = Math.abs(aa - ab); n += d === 0 ? 14 : d === 1 ? 6 : d > 2 ? -12 : 0; }
  if (roubado.uf && anuncio.uf) n += roubado.uf === anuncio.uf ? 6 : -6;
  if (roubado.cidade && anuncio.cidade && sem(roubado.cidade) === sem(anuncio.cidade)) n += 6;
  const quando = tsMs(roubado.quando || roubado.roubadoEm), anunciado = tsMs(anuncio.criadoEm);
  if (quando && anunciado && anunciado < quando - 2 * 864e5) n -= 25; // anunciado antes do roubo
  return Math.max(0, Math.min(99, n));
}
export const textoSemelhancaVeiculo = (n) => (n >= 100 ? "Mesma placa" : n >= 75 ? "Muito parecido" : n >= 55 ? "Parecido" : "Pouco parecido");
export const PARECIDO_A_PARTIR = 60;
export const nomeVeiculo = (v) => [v?.marca, v?.modelo, v?.ano].filter(Boolean).join(" ") || (v?.tipo === "moto" ? "Moto" : "Carro");
