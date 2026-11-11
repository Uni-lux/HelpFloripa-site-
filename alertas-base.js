// =====================================================
// SOS e alertas — base sem dependências (alertas.js, Mensagens, faixa do Mural e testes).
// SOS (pedido de ajuda para o Social e para quem está perto), roubos/furtos (ocorrências, anônimas se a pessoa quiser,
// e consulta de IMEI/placa/série antes de comprar usado) e RG do pet (cadastro, perdido, achado e semelhança).
// =====================================================
export const TIPOS_SOS = {
  saude: ["Mal-estar ou saúde", "🩺", "192"],
  acidente: ["Acidente", "🚑", "193"],
  seguranca: ["Estou em perigo", "🚨", "190"],
  violencia: ["Violência ou ameaça", "🛡️", "190"],
  perdido: ["Estou perdido ou sem ajuda", "🧭", ""],
  carro: ["Carro quebrado", "🚗", ""],
  outro: ["Outra ajuda", "🙋", ""]
};
export const EMERGENCIAS = [["190", "Polícia"], ["192", "SAMU"], ["193", "Bombeiros"], ["180", "Mulher"], ["100", "Direitos humanos"]];
export const STATUS_SOS = { aberto: ["Pedindo ajuda", "vermelho"], atendido: ["Alguém está ajudando", "amarelo"], resolvido: ["Resolvido", "verde"], cancelado: ["Cancelado", "cinza"] };
// SOS some da área depois de 3 horas sem resolver (quem pediu pode pedir de novo).
export const SOS_HORAS = 3;
const tsMs = (t) => (t?.toMillis ? t.toMillis() : typeof t === "number" ? t : t instanceof Date ? t.getTime() : 0);
export const sosVivo = (s, agora = Date.now()) => !!s && ["aberto", "atendido"].includes(s.status) && agora - tsMs(s.criadoEm) < SOS_HORAS * 3600e3;

export const TIPOS_OCORRENCIA = { roubo: "Roubo", furto: "Furto", golpe: "Golpe", suspeita: "Atividade suspeita" };
export const OBJETOS = {
  celular: ["Celular", "IMEI (15 números)"], bike: ["Bicicleta", "Número do quadro"], carro: ["Carro", "Placa"], moto: ["Moto", "Placa"],
  notebook: ["Notebook ou tablet", "Número de série"], documento: ["Documentos ou cartões", ""], pet: ["Animal", ""], outro: ["Outro", "Número de série"]
};
// Identificador comparável (sem espaços, traços, pontos; maiúsculas).
export const normalizarId = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 40);
export function identificadorOk(objeto, id) {
  const x = normalizarId(id);
  if (!x) return true;
  if (objeto === "celular") return /^\d{15}$/.test(x);
  if (objeto === "carro" || objeto === "moto") return /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(x);
  return x.length >= 4;
}
export const DICAS_OCORRENCIA = {
  celular: ["Faça o boletim de ocorrência (pode ser online, na Delegacia Virtual do seu estado).", "Peça à operadora o bloqueio do chip e do aparelho pelo IMEI (*#06# mostra o número).", "Troque as senhas do e-mail, bancos e redes sociais.", "Pix: avise o seu banco; o MED (Mecanismo Especial de Devolução) pode ajudar em transferências feitas sem você."],
  carro: ["Ligue 190 na hora e faça o boletim de ocorrência.", "Avise a seguradora e o rastreador, se tiver."],
  moto: ["Ligue 190 na hora e faça o boletim de ocorrência.", "Avise a seguradora e o rastreador, se tiver."],
  bike: ["Faça o boletim de ocorrência com o número do quadro.", "Avise grupos de ciclistas e lojas de bicicleta da região."],
  documento: ["Faça o boletim de ocorrência e peça a segunda via.", "Bloqueie os cartões pelo app do banco."],
  outro: ["Faça o boletim de ocorrência com o número de série, se tiver."]
};

// ---------- pets ----------
export const ESPECIES = { cao: ["Cachorro", "🐕"], gato: ["Gato", "🐈"], ave: ["Ave", "🦜"], outro: ["Outro", "🐾"] };
export const CORES_PET = ["preto", "branco", "marrom", "caramelo", "cinza", "dourado", "creme", "tigrado", "malhado", "tricolor", "laranja", "rajado"];
export const PORTES = { P: "Pequeno", M: "Médio", G: "Grande" };
export const STATUS_PET = { casa: ["Em casa", "verde"], perdido: ["Perdido", "vermelho"] };
export const rgPet = (id) => "HF-PET-" + String(id || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase();
const sem = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const SRD = /^(srd|vira[\s-]?lata|sem raca|mestic|nao sei|nao sabe)/;
export function distKm(a, b) {
  if (!a || !b || !Number.isFinite(a.lat) || !Number.isFinite(b.lat)) return null;
  const R = 6371, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lng - a.lng) * r;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
// Semelhança entre um pet (perdido/cadastrado) e um animal encontrado: 0 a 100.
// Microchip igual = 100. Espécie diferente = 0. Depois: cores, porte, sexo, raça, distância e tempo.
export function semelhanca(pet, achado) {
  if (!pet || !achado) return 0;
  const chipA = normalizarId(pet.microchip), chipB = normalizarId(achado.microchip);
  if (chipA && chipB) return chipA === chipB ? 100 : 0;
  if (pet.especie !== achado.especie) return 0;
  let n = 20;
  const ca = new Set(pet.cores || []), cb = new Set(achado.cores || []);
  if (ca.size && cb.size) {
    const comum = [...ca].filter((c) => cb.has(c)).length;
    n += Math.round(30 * comum / new Set([...ca, ...cb]).size);
    if (!comum) n -= 15;
  }
  if (pet.porte && achado.porte) n += pet.porte === achado.porte ? 12 : -8;
  if (pet.sexo && achado.sexo && achado.sexo !== "?") n += pet.sexo === achado.sexo ? 8 : -20;
  const ra = sem(pet.raca), rb = sem(achado.raca);
  if (ra && rb && !SRD.test(ra) && !SRD.test(rb)) n += ra === rb || ra.includes(rb) || rb.includes(ra) ? 12 : -4;
  const lugarPet = pet.perdidoLocal || pet.geo;
  const d = distKm(lugarPet, achado.local || achado.geo);
  if (d != null) n += d <= 2 ? 18 : d <= 6 ? 12 : d <= 15 ? 6 : d <= 40 ? 0 : -15;
  const quandoPerdido = tsMs(pet.perdidoEm), quandoAchado = tsMs(achado.quando) || tsMs(achado.criadoEm);
  if (quandoPerdido && quandoAchado && quandoAchado < quandoPerdido - 6 * 3600e3) n -= 20; // achado antes de sumir
  // Palavras dos sinais particulares em comum (ex.: "coleira vermelha", "orelha cortada").
  const pa = new Set(sem(pet.sinais).split(/\W+/).filter((w) => w.length >= 4)), pb = sem(achado.sinais).split(/\W+/).filter((w) => w.length >= 4);
  n += Math.min(10, pb.filter((w) => pa.has(w)).length * 4);
  return Math.max(0, Math.min(99, n));
}
export const textoSemelhanca = (n) => (n >= 100 ? "Mesmo microchip" : n >= 75 ? "Muito parecido" : n >= 55 ? "Parecido" : "Pouco parecido");
// Avisar sozinho a partir desta nota (os outros aparecem na lista com o botão "Avisar").
export const AVISO_AUTOMATICO = 70, MOSTRAR_A_PARTIR = 45;

// ---------- geohash (para achar o que está perto) ----------
const B32 = "0123456789bcdefghjkmnpqrstuvwxyz";
export function geohash(lat, lng, prec = 4) {
  let la = [-90, 90], lo = [-180, 180], bit = 0, ch = 0, par = true, out = "";
  while (out.length < prec) {
    const r = par ? lo : la, v = par ? lng : lat, m = (r[0] + r[1]) / 2;
    if (v >= m) { ch = (ch << 1) | 1; r[0] = m; } else { ch <<= 1; r[1] = m; }
    par = !par;
    if (++bit === 5) { out += B32[ch]; bit = 0; ch = 0; }
  }
  return out;
}
export function vizinhos(lat, lng, prec = 4) {
  const bits = prec * 5, dLng = 360 / 2 ** Math.ceil(bits / 2), dLat = 180 / 2 ** Math.floor(bits / 2);
  const s = new Set();
  for (const i of [-1, 0, 1]) for (const j of [-1, 0, 1]) s.add(geohash(Math.max(-89.9, Math.min(89.9, lat + i * dLat)), ((lng + j * dLng + 540) % 360) - 180, prec));
  return [...s];
}
export const RAIOS_ALERTA = [2, 5, 10, 25];
