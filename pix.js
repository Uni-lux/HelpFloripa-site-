// =====================================================
// Pix "copia e cola" (BR Code do Banco Central: EMV com CRC16), sem dependências.
// Usado nos planos (Pix do Help Floripa) e no cartão de Pix do chat (Pix de quem recebe).
// O site só monta o código: o pagamento acontece no app do banco de quem paga.
// =====================================================
const campo = (id, v) => id + String(v.length).padStart(2, "0") + v;
const limpo = (t, n) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 .-]/g, "").toUpperCase().slice(0, n);
function crc16(t) {
  let c = 0xffff;
  for (let i = 0; i < t.length; i++) { c ^= t.charCodeAt(i) << 8; for (let k = 0; k < 8; k++) c = c & 0x8000 ? (c << 1) ^ 0x1021 : c << 1; c &= 0xffff; }
  return c.toString(16).toUpperCase().padStart(4, "0");
}
export function codigoPix({ chave, nome, cidade, valor, txid = "***", descricao = "" } = {}) {
  if (!chave) return "";
  const info = limpo(descricao, 40).trim();
  const conta = campo("00", "br.gov.bcb.pix") + campo("01", String(chave).trim()) + (info ? campo("02", info) : "");
  const corpo = campo("00", "01") + campo("26", conta) + campo("52", "0000") + campo("53", "986") +
    (Number(valor) > 0 ? campo("54", Number(valor).toFixed(2)) : "") + campo("58", "BR") + campo("59", limpo(nome, 25) || "RECEBEDOR") +
    campo("60", limpo(cidade, 15) || "BRASIL") + campo("62", campo("05", String(txid).replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***")) + "6304";
  return corpo + crc16(corpo);
}

// Tipo da chave Pix (e a chave no formato que o banco aceita). Devolve null se não parece chave.
export function tipoChavePix(bruta) {
  const s = String(bruta || "").trim();
  const dig = s.replace(/\D/g, "");
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return { tipo: "E-mail", chave: s.toLowerCase() };
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return { tipo: "Chave aleatória", chave: s.toLowerCase() };
  if (/^\+?55\d{10,11}$/.test(s.replace(/[\s()-]/g, "")) || (/^\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/.test(s) && dig.length >= 10 && dig.length <= 11)) return { tipo: "Celular", chave: "+55" + dig.replace(/^55(?=\d{10,11}$)/, "") };
  if (dig.length === 11 && /^[\d.\-\s]+$/.test(s)) return { tipo: "CPF", chave: dig };
  if (dig.length === 14 && /^[\d.\-/\s]+$/.test(s)) return { tipo: "CNPJ", chave: dig };
  return null;
}
