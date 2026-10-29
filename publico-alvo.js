// =====================================================
// Público da publicação (como o "público preferencial" das redes sociais)
// diario.publico = { idadeMin?, idadeMax?, genero?, local?, ufs?, cidades?, perto?, seguidores? }
//   idadeMin/idadeMax: 16–100 · genero: "f" | "m"
//   local: "brasil" | "estados" (ufs: ["SC", ...] até 27) | "cidades" (cidades: ["4205407", ...] até 10, código IBGE)
//        | "perto" (perto: { lat, lng, km, nome }, km 5–300)
//   seguidores: "todos" (padrão) | "seguidores" (só quem segue) | "novos" (só quem ainda não segue)
// Vale no Diário, no Explorar e nos Reels. No perfil de quem publicou e pelo link a publicação continua aparecendo
// para todos (é direcionamento, não privacidade). O autor sempre vê.
// Quem lê: idade pela data de nascimento, gênero das Configurações, lugar escolhido ("Você está em") ou a cidade do
// perfil, posição (GPS/cidade). Sem o dado pedido (ex.: sem gênero informado), a publicação não aparece para a pessoa.
// Sem dependências: usado por feed.js, explorar.js, reels.js e rede.js (formulário).
// =====================================================
export const GENEROS = [["f", "Mulheres"], ["m", "Homens"]];
export const SEGUIDORES = [["todos", "Todos"], ["seguidores", "Só quem me segue"], ["novos", "Quem ainda não me segue"]];
export const IDADE_MIN = 16, IDADE_MAX = 100;
export const RAIOS = [5, 10, 25, 50, 100, 200, 300];

const num = (x) => (Number.isFinite(Number(x)) ? Number(x) : null);
// Publicação sem público ou com tudo no padrão = para todos.
export function temPublico(p) {
  const x = p?.publico;
  if (!x || typeof x !== "object") return false;
  return !!(x.idadeMin || x.idadeMax || x.genero || (x.local && x.local !== "brasil") || (x.seguidores && x.seguidores !== "todos"));
}
export function idadeDe(nasc, hoje = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(nasc || ""));
  if (!m) return null;
  let a = hoje.getFullYear() - Number(m[1]);
  if (hoje.getMonth() + 1 < Number(m[2]) || (hoje.getMonth() + 1 === Number(m[2]) && hoje.getDate() < Number(m[3]))) a--;
  return a >= 0 && a < 130 ? a : null;
}
function km(a, b) {
  const R = 6371, r = (g) => (g * Math.PI) / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
// leitor = { uid, idade, genero, uf, cidadeIbge, pos: {lat,lng} | null, segue: (autorId) => bool }
export function combinaPublico(p, leitor) {
  if (!temPublico(p) || !leitor || p.autorId === leitor.uid) return true;
  const x = p.publico;
  const min = num(x.idadeMin), max = num(x.idadeMax);
  if (min || max) {
    if (leitor.idade == null) return false;
    if (min && leitor.idade < min) return false;
    if (max && leitor.idade > max) return false;
  }
  if (x.genero && leitor.genero !== x.genero) return false;
  if (x.local === "estados" && Array.isArray(x.ufs) && x.ufs.length && !x.ufs.includes(leitor.uf)) return false;
  if (x.local === "cidades" && Array.isArray(x.cidades) && x.cidades.length && !x.cidades.includes(String(leitor.cidadeIbge || ""))) return false;
  if (x.local === "perto" && x.perto) {
    if (!leitor.pos) return false;
    if (km(leitor.pos, x.perto) > (num(x.perto.km) || 25)) return false;
  }
  const segue = !!leitor.segue?.(p.autorId);
  if (x.seguidores === "seguidores" && !segue) return false;
  if (x.seguidores === "novos" && segue) return false;
  return true;
}
// Resumo curto para o botão e para o autor ("Mulheres · 18–35 · SC, PR").
export function resumoPublico(x, nomeCidade = (c) => c) {
  if (!x || !temPublico({ publico: x })) return "Todos";
  const partes = [];
  if (x.genero) partes.push(x.genero === "f" ? "Mulheres" : "Homens");
  if (x.idadeMin || x.idadeMax) partes.push(x.idadeMin && x.idadeMax ? `${x.idadeMin}–${x.idadeMax} anos` : x.idadeMin ? `${x.idadeMin}+ anos` : `até ${x.idadeMax} anos`);
  if (x.local === "estados" && x.ufs?.length) partes.push(x.ufs.length > 3 ? `${x.ufs.length} estados` : x.ufs.join(", "));
  if (x.local === "cidades" && x.cidades?.length) partes.push(x.cidades.length > 2 ? `${x.cidades.length} cidades` : x.cidades.map(nomeCidade).join(", "));
  if (x.local === "perto" && x.perto) partes.push(`até ${x.perto.km} km de ${x.perto.nome || "um lugar"}`);
  if (x.seguidores === "seguidores") partes.push("só seguidores");
  if (x.seguidores === "novos") partes.push("quem não segue");
  return partes.join(" · ");
}
// Limpa o que veio do formulário para gravar (só o que tem valor; nada = sem público).
export function publicoParaGravar(x) {
  if (!x) return null;
  const o = {};
  const min = Math.round(num(x.idadeMin) || 0), max = Math.round(num(x.idadeMax) || 0);
  if (min > IDADE_MIN) o.idadeMin = Math.min(IDADE_MAX, min);
  if (max && max < IDADE_MAX) o.idadeMax = Math.max(IDADE_MIN, max);
  if (o.idadeMin && o.idadeMax && o.idadeMin > o.idadeMax) [o.idadeMin, o.idadeMax] = [o.idadeMax, o.idadeMin];
  if (x.genero === "f" || x.genero === "m") o.genero = x.genero;
  if (x.local === "estados" && x.ufs?.length) { o.local = "estados"; o.ufs = [...new Set(x.ufs)].filter((u) => /^[A-Z]{2}$/.test(u)).slice(0, 27); }
  if (x.local === "cidades" && x.cidades?.length) { o.local = "cidades"; o.cidades = [...new Set(x.cidades.map(String))].filter((c) => /^\d{7}$/.test(c)).slice(0, 10); }
  if (x.local === "perto" && x.perto && Number.isFinite(x.perto.lat)) {
    o.local = "perto";
    o.perto = { lat: Math.round(x.perto.lat * 100) / 100, lng: Math.round(x.perto.lng * 100) / 100, km: RAIOS.includes(Number(x.perto.km)) ? Number(x.perto.km) : 25, nome: String(x.perto.nome || "").slice(0, 60) };
  }
  if (x.seguidores === "seguidores" || x.seguidores === "novos") o.seguidores = x.seguidores;
  return Object.keys(o).length ? o : null;
}
// Quem está lendo, montado com os dados da própria conta (nada é lido de outras pessoas).
// local = lugar escolhido ("Você está em") · pos = posição (GPS, cidade escolhida ou do perfil)
export function leitorDe({ uid, dados = {}, local = {}, pos = null, segue = () => false }) {
  return {
    uid,
    idade: idadeDe(dados.dataNascimento),
    genero: dados.genero === "f" || dados.genero === "m" ? dados.genero : null,
    uf: local.uf || dados.uf || "",
    cidadeIbge: Number(local.uf ? local.cidadeIbge : dados.cidadeIbge) || 0,
    pos: pos && Number.isFinite(pos.lat) ? { lat: pos.lat, lng: pos.lng } : null,
    segue
  };
}
