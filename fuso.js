// =====================================================
// Fuso horário de cada estado (o site é nacional).
// "Aberto agora", "Atendendo agora" e o horário de atendimento usam o relógio do LUGAR do negócio,
// não o de quem está olhando: um negócio de Manaus que abre às 8h aparece aberto às 8h de Manaus
// (9h em Brasília). Sem estado conhecido, vale o horário de Brasília. Sem dependências.
// =====================================================
const FUSOS = {
  AC: "America/Rio_Branco", AM: "America/Manaus", RR: "America/Boa_Vista", RO: "America/Porto_Velho",
  MT: "America/Cuiaba", MS: "America/Campo_Grande"
};
export const fusoDaUF = (uf) => FUSOS[String(uf || "").toUpperCase()] || "America/Sao_Paulo";

// Estado de um negócio/perfil: campo uf ou o final de "Cidade/UF".
export function ufDe(o) {
  if (!o) return "";
  if (typeof o.uf === "string" && /^[A-Za-z]{2}$/.test(o.uf)) return o.uf.toUpperCase();
  const m = /\/([A-Za-z]{2})\s*$/.exec(String(o.cidade || ""));
  return m ? m[1].toUpperCase() : "";
}

// Um Date cujo getDay/getHours/getMinutes são o relógio de parede do estado (para as contas de horário).
const formatos = new Map();
export function relogioDe(uf, agora = new Date()) {
  const fuso = fusoDaUF(uf);
  try {
    let f = formatos.get(fuso);
    if (!f) {
      f = new Intl.DateTimeFormat("en-US", { timeZone: fuso, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
      formatos.set(fuso, f);
    }
    const p = Object.fromEntries(f.formatToParts(agora).map((x) => [x.type, x.value]));
    return new Date(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  } catch { return agora; }
}
