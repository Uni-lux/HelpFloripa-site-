// =====================================================
// Entregas e corridas (Help Floripa Leva) — base sem dependências
// Modalidades, valores SUGERIDOS (estimativa: quem pede decide quanto oferece), etapas, geohash para achar quem
// está perto, distância e textos. Usado pela tela de quem pede (entregas.js), pelo painel do entregador
// (entregador.js), pelo cartão no Mensagens e pelos testes.
// =====================================================

// Serviços: "entrega" (encomenda vai sozinha) e "corrida" (a pessoa vai junto).
export const SERVICOS = {
  entrega: { nome: "Entrega", acao: "Enviar entrega", quem: "entregador", quemPlural: "entregadores" },
  corrida: { nome: "Corrida", acao: "Pedir corrida", quem: "motorista", quemPlural: "motoristas" }
};

// Veículos que a pessoa cadastra no painel do entregador.
export const VEICULOS = {
  bike: { nome: "Bicicleta", placa: false, cnh: false, velocidade: 14 },
  moto: { nome: "Moto", placa: true, cnh: true, velocidade: 28 },
  carro: { nome: "Carro", placa: true, cnh: true, velocidade: 24 },
  utilitario: { nome: "Utilitário", placa: true, cnh: true, velocidade: 22 }
};

// Modalidades que quem pede escolhe. tarifa = SUGESTÃO para ajudar a oferecer um valor justo (não é preço fixo):
// base + km + minuto, com um mínimo. Os números podem ser ajustados aqui a qualquer momento.
export const MODALIDADES = {
  entrega_bike: { servico: "entrega", veiculo: "bike", nome: "Bike", desc: "Pequenos volumes, até 6 km", maxKm: 6, tamanhos: ["P", "M"], tarifa: { base: 4, km: 1.2, min: 0.12, minimo: 7 } },
  entrega_moto: { servico: "entrega", veiculo: "moto", nome: "Moto", desc: "Rápida, cabe na mochila (até 10 kg)", maxKm: 60, tamanhos: ["P", "M"], tarifa: { base: 5, km: 1.5, min: 0.2, minimo: 9 } },
  entrega_carro: { servico: "entrega", veiculo: "carro", nome: "Carro", desc: "Caixas e volumes maiores (até 30 kg)", maxKm: 120, tamanhos: ["P", "M", "G"], tarifa: { base: 7, km: 2, min: 0.3, minimo: 14 } },
  entrega_frete: { servico: "entrega", veiculo: "utilitario", nome: "Frete", desc: "Utilitário: móveis, mudanças pequenas", maxKm: 300, tamanhos: ["P", "M", "G", "GG"], tarifa: { base: 25, km: 3.2, min: 0.5, minimo: 45 } },
  corrida_moto: { servico: "corrida", veiculo: "moto", nome: "Moto", desc: "1 passageiro, com capacete", maxKm: 60, tarifa: { base: 3.5, km: 1.4, min: 0.2, minimo: 7 } },
  corrida_carro: { servico: "corrida", veiculo: "carro", nome: "Carro", desc: "Até 4 passageiros", maxKm: 300, tarifa: { base: 5, km: 1.9, min: 0.3, minimo: 10 } }
};
export const modalidadesDe = (servico) => Object.entries(MODALIDADES).filter(([, m]) => m.servico === servico).map(([k, m]) => ({ k, ...m }));

// Tamanho da encomenda (entrega).
export const TAMANHOS = {
  P: { nome: "Pequeno", desc: "Envelope, chave, documento, celular" },
  M: { nome: "Médio", desc: "Caixa de sapato, sacola, marmita" },
  G: { nome: "Grande", desc: "Caixa grande, mala, até 30 kg" },
  GG: { nome: "Muito grande", desc: "Móvel, eletrodoméstico, mudança" }
};

export const PAGAMENTOS = {
  pix: "Pix direto para quem leva",
  dinheiro: "Dinheiro",
  cartao: "Cartão na maquininha de quem leva"
};

// Etapas: procurando → aceita → chegou → em_rota → concluida (ou cancelada).
export const ETAPAS = ["procurando", "aceita", "chegou", "em_rota", "concluida"];
export const ATIVAS = ["aceita", "chegou", "em_rota"];
const TEXTOS = {
  entrega: {
    procurando: "Procurando entregador",
    aceita: "Entregador a caminho da coleta",
    chegou: "Entregador no local da coleta",
    em_rota: "Encomenda a caminho",
    concluida: "Entregue",
    cancelada: "Cancelada"
  },
  corrida: {
    procurando: "Procurando motorista",
    aceita: "Motorista a caminho",
    chegou: "Motorista chegou",
    em_rota: "Em viagem",
    concluida: "Viagem concluída",
    cancelada: "Cancelada"
  }
};
export const NOMES_ETAPA = {
  entrega: ["Pedido", "Aceito", "Na coleta", "A caminho", "Entregue"],
  corrida: ["Pedido", "Aceito", "Chegou", "Em viagem", "Concluída"]
};
export function textoStatus(c) {
  const s = c?.servico === "corrida" ? "corrida" : "entrega";
  if (c?.status === "procurando" && expirada(c)) return "Ninguém aceitou a tempo";
  return TEXTOS[s][c?.status] || "Atualizado";
}
export const passo = (status) => Math.max(0, ETAPAS.indexOf(status));
// O PIN confirma que é a pessoa certa: na corrida, o passageiro mostra para EMBARCAR; na entrega, quem recebe passa
// para o entregador finalizar.
export const pinEm = (servico) => (servico === "corrida" ? "embarque" : "entrega");

// Pedido sem ninguém aceitar some da lista dos entregadores depois de 40 minutos.
export const VALIDADE_MIN = 40;
const tsMs = (t) => (t?.toMillis ? t.toMillis() : typeof t === "number" ? t : t instanceof Date ? t.getTime() : 0);
export const expirada = (c, agora = Date.now()) => c?.status === "procurando" && tsMs(c.criadoEm) > 0 && agora - tsMs(c.criadoEm) > VALIDADE_MIN * 60000;

// Raio de busca: começa perto e aumenta sozinho se ninguém aceitar (quem pede pode aumentar também).
export const RAIOS = [5, 10, 20, 40];
export const proximoRaio = (r) => RAIOS.find((x) => x > (Number(r) || 0)) || RAIOS[RAIOS.length - 1];

// ---------- distância, tempo e valor ----------
export function distanciaKm(a, b) {
  if (!a || !b) return 0;
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
// Sem rota calculada: a rua é em média ~30% mais longa que a linha reta.
export const kmPelaRua = (a, b) => distanciaKm(a, b) * 1.3;
export function minutosAte(km, veiculo) {
  const v = VEICULOS[veiculo]?.velocidade || 24;
  return Math.max(1, Math.round((km / v) * 60));
}
const meio = (v) => Math.round(v * 2) / 2; // de 50 em 50 centavos
export function valorSugerido(modalidade, km, min) {
  const t = MODALIDADES[modalidade]?.tarifa;
  if (!t) return 0;
  return meio(Math.max(t.minimo, t.base + t.km * (Number(km) || 0) + t.min * (Number(min) || 0)));
}
// Faixa para quem pede ver: oferta abaixo de ~85% da sugestão costuma demorar.
export function faixaValor(modalidade, km, min) {
  const v = valorSugerido(modalidade, km, min);
  return { sugerido: v, baixo: meio(v * 0.85), alto: meio(v * 1.3) };
}
export const VALOR_MIN = 3, VALOR_MAX = 3000;
export const reais = (v) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const textoKm = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0).replace(".", ",")} km`);
export const textoMin = (m) => (m < 60 ? `${Math.max(1, Math.round(m))} min` : `${Math.floor(m / 60)} h ${String(Math.round(m % 60)).padStart(2, "0")}`);

// ---------- geohash (para achar pedidos e entregadores perto sem ler o Brasil todo) ----------
const B32 = "0123456789bcdefghjkmnpqrstuvwxyz";
export function geohash(lat, lng, prec = 5) {
  let latMin = -90, latMax = 90, lngMin = -180, lngMax = 180, bit = 0, ch = 0, par = true, out = "";
  while (out.length < prec) {
    if (par) { const m = (lngMin + lngMax) / 2; if (lng >= m) { ch = (ch << 1) | 1; lngMin = m; } else { ch <<= 1; lngMax = m; } }
    else { const m = (latMin + latMax) / 2; if (lat >= m) { ch = (ch << 1) | 1; latMin = m; } else { ch <<= 1; latMax = m; } }
    par = !par;
    if (++bit === 5) { out += B32[ch]; bit = 0; ch = 0; }
  }
  return out;
}
// A célula e as 8 vizinhas (quem está na beirada de uma célula também acha quem está do outro lado).
export function vizinhos(lat, lng, prec = 4) {
  const bits = prec * 5, dLng = 360 / 2 ** Math.ceil(bits / 2), dLat = 180 / 2 ** Math.floor(bits / 2);
  const s = new Set();
  for (const i of [-1, 0, 1]) for (const j of [-1, 0, 1]) {
    const la = Math.max(-89.9, Math.min(89.9, lat + i * dLat));
    s.add(geohash(la, ((lng + j * dLng + 540) % 360) - 180, prec));
  }
  return [...s];
}

// ---------- validações (as mesmas das regras do Firestore) ----------
export const noBrasil = (p) => !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.lat >= -34 && p.lat <= 6 && p.lng >= -75 && p.lng <= -28;
export const normalizarPlaca = (p) => String(p || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
// Placa antiga (ABC1234) ou Mercosul (ABC1D23).
export const placaOk = (p) => /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(normalizarPlaca(p));
export const formatarPlaca = (p) => { const x = normalizarPlaca(p); return x.length === 7 ? `${x.slice(0, 3)}-${x.slice(3)}` : x; };
export const CNH = ["A", "B", "AB", "C", "D", "E", "AC", "AD", "AE"];
export function cnhServe(cat, veiculo) {
  if (veiculo === "bike") return true;
  const c = String(cat || "");
  if (veiculo === "moto") return c.includes("A");
  return /[BCDE]/.test(c);
}
// Corridas (passageiro) só de moto ou carro.
export const fazCorrida = (veiculo) => veiculo === "moto" || veiculo === "carro";
// Qual modalidade um veículo atende.
export function modalidadesDoVeiculo(veiculo, servicos = ["entrega", "corrida"]) {
  return Object.entries(MODALIDADES).filter(([, m]) => m.veiculo === veiculo && servicos.includes(m.servico)).map(([k]) => k);
}
export function gerarPin() {
  const a = new Uint32Array(1);
  (globalThis.crypto || {}).getRandomValues?.(a);
  return String((a[0] || Math.floor(Math.random() * 1e9)) % 10000).padStart(4, "0");
}
export const ELOGIOS = {
  entrega: ["Rápido", "Cuidadoso com a encomenda", "Educado", "Comunicação boa", "Seguiu as instruções"],
  corrida: ["Direção segura", "Carro limpo", "Educado", "Pontual", "Boa conversa"]
};
export const MOTIVOS_CANCELAR = ["Demorou demais", "Pedi por engano", "Mudei de planos", "Encontrei outra forma", "O entregador pediu para cancelar", "Outro motivo"];
// Pontuação de um pedido para o entregador (mais perto, mais valor por km e direcionado a ele primeiro).
export function notaPedido(c, minhaPos, uid) {
  const ate = minhaPos ? distanciaKm(minhaPos, c.origem) : 5;
  const porKm = (Number(c.valor) || 0) / Math.max(1, (Number(c.km) || 0) + ate);
  return (c.paraId && c.paraId === uid ? 1000 : 0) + porKm * 10 - ate * 2;
}
