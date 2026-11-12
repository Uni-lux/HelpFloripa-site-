// =====================================================
// Ícones de traço do Help Floripa para SOS, presentes, pets, entregas e corridas (12/11/2026, pedido do dono: tirar os
// emojis das telas e deixar com cara profissional). Sem dependências; CSS próprio (.hf-ic).
//   iconeHtml(nome, { cor, tam, fundo })  → texto <span class="hf-ic">…</span>
//   iconeEl(nome, opções)                 → elemento
//   iconeSos(tipo), iconeMimo(k), iconePresente(p), iconeEspecie(k) → nome do ícone
// =====================================================
const P = {
  // SOS
  coracaoPulso: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M4.5 12.5h3.5l1.5-2.5 2 4 1.5-2h6"/>',
  ambulancia: '<path d="M3 16.5V8.5a1.5 1.5 0 0 1 1.5-1.5H14v9.5"/><path d="M14 10h3.5l3 3.5v3H14"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/><path d="M8.5 9.5v4M6.5 11.5h4"/>',
  sirene: '<path d="M7 17v-5a5 5 0 0 1 10 0v5"/><path d="M5 17h14v3H5zM12 4V2.5M5.6 6.6 4.5 5.5M18.4 6.6l1.1-1.1M3 12H1.5M22.5 12H21"/><path d="M10 13a2 2 0 0 1 2-2"/>',
  escudo: '<path d="M12 3l7 3v5.5c0 4.3-2.9 7.9-7 9.5-4.1-1.6-7-5.2-7-9.5V6z"/><path d="M12 8v5M12 16v.5"/>',
  bussola: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  carroChave: '<path d="M5 15.5V12l1.6-4a1.5 1.5 0 0 1 1.4-1h6a1.5 1.5 0 0 1 1.4 1l1 2.5"/><path d="M3.5 15.5h9M5 15.5v2M11 15.5v2"/><circle cx="7.5" cy="12.5" r=".6"/><path d="M15.5 13.5l4.5 4.5M18.5 12a2.5 2.5 0 0 0-3 3.2l-1 1 1.8 1.8 1-1A2.5 2.5 0 0 0 20.5 14"/>',
  maoAjuda: '<path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12M11 11V5a1.5 1.5 0 0 1 3 0v6M14 11V6.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-.5a6 6 0 0 1-4.6-2.2L3.6 15a1.5 1.5 0 0 1 2.3-1.9L8 15"/>',
  sos: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16v.5"/>',
  // presentes
  presente: '<rect x="3.5" y="9" width="17" height="11.5" rx="1.5"/><path d="M2.5 9h19v-1a1 1 0 0 0-1-1h-17a1 1 0 0 0-1 1zM12 7v13.5M12 7c-1.5-3-5-3.5-5-1.2C7 7 9.5 7 12 7zM12 7c1.5-3 5-3.5 5-1.2C17 7 14.5 7 12 7z"/>',
  dinheiro: '<rect x="2.5" y="6.5" width="19" height="11" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>',
  sacola: '<path d="M5 8h14l-1 12H6z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/>',
  carro: '<path d="M4 16.5V12l2-5a1.5 1.5 0 0 1 1.4-1h9.2a1.5 1.5 0 0 1 1.4 1l2 5v4.5"/><path d="M3 12h18v4.5H3zM5.5 16.5v2M18.5 16.5v2"/><circle cx="7.5" cy="14.2" r=".8"/><circle cx="16.5" cy="14.2" r=".8"/>',
  caixa: '<path d="M3.5 7.5L12 3.5l8.5 4v9L12 20.5l-8.5-4z"/><path d="M3.5 7.5L12 11.5l8.5-4M12 11.5v9M7.8 5.5l8.5 4"/>',
  moto: '<circle cx="6" cy="16" r="3"/><circle cx="18" cy="16" r="3"/><path d="M6 16l4-6h4l4 6M13 6h3l1 4M9 10h-3"/>',
  // mimos
  rosa: '<path d="M12 11c-2.5 0-4-1.7-4-4 1.2.6 2 .5 2.6-.5C11 5.6 11.5 5 12 5s1 .6 1.4 1.5c.6 1 1.4 1.1 2.6.5 0 2.3-1.5 4-4 4z"/><path d="M12 11v9M12 15c-2 0-3.5-1-4-2.5 1.7-.4 3.2.2 4 1.5M12 17c1.6-.2 3-1.1 3.5-2.5-1.6-.3-3 .3-3.5 1.5"/>',
  buque: '<circle cx="9" cy="7" r="2.3"/><circle cx="15" cy="7" r="2.3"/><circle cx="12" cy="4.8" r="2.3"/><path d="M8 10.5l4 10 4-10M7.5 12h9"/>',
  cafe: '<path d="M4.5 9h12v5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z"/><path d="M16.5 10.5h1.5a2.5 2.5 0 0 1 0 5h-1.6M8 3.5c-.8 1 .8 2-.1 3M12 3.5c-.8 1 .8 2-.1 3"/><path d="M3 21h16"/>',
  chocolate: '<rect x="6" y="3.5" width="12" height="17" rx="1.5"/><path d="M6 9h12M6 14.5h12M12 3.5v17"/>',
  bolo: '<path d="M4 20.5h16M5 20.5v-7h14v7M5 16.5c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 5 0"/><path d="M8 13.5v-3M12 13.5v-3M16 13.5v-3M8 8.5c-.6-.8.4-1.6 0-2.5M12 8.5c-.6-.8.4-1.6 0-2.5M16 8.5c-.6-.8.4-1.6 0-2.5"/>',
  ursinho: '<circle cx="12" cy="13" r="6.5"/><circle cx="6.5" cy="6.8" r="2.2"/><circle cx="17.5" cy="6.8" r="2.2"/><circle cx="9.6" cy="12" r=".7"/><circle cx="14.4" cy="12" r=".7"/><ellipse cx="12" cy="15.5" rx="2.3" ry="1.8"/>',
  estrela: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8L3.5 9.7l5.9-.8z"/>',
  abraco: '<path d="M8.5 19.5s-5-3-5-7a2.8 2.8 0 0 1 5-1.7 2.8 2.8 0 0 1 5 1.7c0 4-5 7-5 7z"/><path d="M15.5 16.5s4.5-2.6 4.5-6a2.5 2.5 0 0 0-4.5-1.5"/>',
  festa: '<path d="M4 20l4.5-11 6.5 6.5z"/><path d="M13 5.5c.6-1 1.6-1.4 2.6-1M17.5 8.5c1-.6 2-.6 3 0M15.5 3v1.5M19.5 12h1.5M18 5l1.2-1.2M10 9.5c.5-1.6.2-3-.8-4.2"/>',
  coracao: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z"/>',
  trofeu: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 5.5H5a2.5 2.5 0 0 0 3 4M16 5.5h3a2.5 2.5 0 0 1-3 4M12 13v3.5M8.5 20.5h7M9.5 20.5l.5-4h4l.5 4"/>',
  sorvete: '<path d="M8 11l4 10 4-10"/><path d="M7 11a5 5 0 0 1 10 0z"/><path d="M9.5 6.5a3 3 0 0 1 5 0"/>',
  // pets
  cachorro: '<path d="M6 10.5L4.5 5.5l4 2h7l4-2-1.5 5"/><path d="M6 10.5c0 5 2.7 8 6 8s6-3 6-8"/><circle cx="9.5" cy="11.5" r=".7"/><circle cx="14.5" cy="11.5" r=".7"/><path d="M11 14.5h2l-1 1.2z"/>',
  gato: '<path d="M5.5 11V4.5l3.5 3h6l3.5-3V11"/><path d="M5.5 11c0 4.5 2.9 7.5 6.5 7.5s6.5-3 6.5-7.5"/><circle cx="9.5" cy="11.5" r=".7"/><circle cx="14.5" cy="11.5" r=".7"/><path d="M11.2 14h1.6l-.8 1zM3 13.5l4 .5M3.5 16l3.6-.7M21 13.5l-4 .5M20.5 16l-3.6-.7"/>',
  ave: '<path d="M4 14c3 0 5-1.5 6-4a4 4 0 0 1 8 0l2.5 1-2.5 1c0 4.5-3.5 7.5-8 7.5-2.5 0-4.5-1.5-6-5.5z"/><circle cx="14.5" cy="9.5" r=".7"/><path d="M9 16.5l-1.5 4M12 17.5l-.5 3"/>',
  pata: '<ellipse cx="12" cy="15.5" rx="4" ry="3.5"/><circle cx="6.5" cy="10.5" r="1.8"/><circle cx="17.5" cy="10.5" r="1.8"/><circle cx="9.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/>',
  // gerais
  pessoas: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9.5" r="2.4"/><path d="M15.5 14a4.5 4.5 0 0 1 5.5 4.5"/>',
  alvo: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  equipe: '<path d="M12 3l7 3v5.5c0 4.3-2.9 7.9-7 9.5-4.1-1.6-7-5.2-7-9.5V6z"/><path d="M9 12l2 2 4-4"/>',
  relogio: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  loja: '<path d="M4 9.5V20h16V9.5M3 9.5l2-5h14l2 5c0 1.5-1.2 2.5-2.6 2.5S16 11 16 9.5c0 1.5-1.4 2.5-3 2.5S10 11 10 9.5c0 1.5-1.4 2.5-3 2.5S3 11 3 9.5z"/><path d="M10 20v-5h4v5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>'
};
export const NOMES_ICONES = Object.keys(P);

let estilo = false;
function css() {
  if (estilo || typeof document === "undefined") return; estilo = true;
  const s = document.createElement("style");
  s.textContent = `.hf-ic{--c:currentColor;display:inline-grid;place-items:center;flex:none;color:var(--c)}
.hf-ic svg{width:var(--t,22px);height:var(--t,22px);fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.hf-ic.fundo{width:calc(var(--t,22px) * 1.9);height:calc(var(--t,22px) * 1.9);border-radius:32%;background:color-mix(in srgb,var(--c) 15%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 28%,transparent)}
.hf-ic.redondo{border-radius:50%}`;
  document.head.appendChild(s);
}
export function iconeHtml(nome, { cor = "", tam = 22, fundo = false, redondo = false } = {}) {
  css();
  const st = `${cor ? `--c:${cor};` : ""}--t:${tam}px`;
  return `<span class="hf-ic${fundo ? " fundo" : ""}${redondo ? " redondo" : ""}" style="${st}" aria-hidden="true"><svg viewBox="0 0 24 24">${P[nome] || P.presente}</svg></span>`;
}
export function iconeEl(nome, op) { const d = document.createElement("span"); d.innerHTML = iconeHtml(nome, op); return d.firstChild; }

export const ICONE_SOS = { saude: ["coracaoPulso", "#e5484d"], acidente: ["ambulancia", "#ff7a1a"], seguranca: ["sirene", "#e5484d"], violencia: ["escudo", "#b066ff"], perdido: ["bussola", "#00adee"], carro: ["carroChave", "#f5b301"], outro: ["maoAjuda", "#2fbf71"] };
export const iconeSos = (t) => ICONE_SOS[t] || ICONE_SOS.outro;
export const ICONE_MIMO = { rosa: ["rosa", "#e5487f"], buque: ["buque", "#e5487f"], cafe: ["cafe", "#c98a4b"], chocolate: ["chocolate", "#a0673a"], bolo: ["bolo", "#ff7aa8"], ursinho: ["ursinho", "#c98a4b"], estrela: ["estrela", "#f5b301"], abraco: ["abraco", "#ff7a1a"], festa: ["festa", "#b066ff"], coracao: ["coracao", "#00adee"], trofeu: ["trofeu", "#f5b301"], sorvete: ["sorvete", "#ff7aa8"] };
export const iconeMimo = (k) => ICONE_MIMO[k] || ICONE_MIMO.coracao;
export function iconePresente(p) {
  if (p?.tipo === "mimo") return iconeMimo(p.mimo);
  return { pix: ["dinheiro", "#32bcad"], produto: ["sacola", "#ff7a1a"], corrida: ["carro", "#00adee"], entrega: ["caixa", "#f5b301"] }[p?.tipo] || ["presente", "#e5487f"];
}
export const ICONE_ESPECIE = { cao: ["cachorro", "#c98a4b"], gato: ["gato", "#b066ff"], ave: ["ave", "#2fbf71"], outro: ["pata", "#00adee"] };
export const iconeEspecie = (k) => ICONE_ESPECIE[k] || ICONE_ESPECIE.outro;
// Atalho: [nome, cor] → html com fundo
export const chip = ([nome, cor], tam = 22) => iconeHtml(nome, { cor, tam, fundo: true });
