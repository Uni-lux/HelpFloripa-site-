// =====================================================
// Lista de notificações (painel do sino e notificacoes.html), no padrão das redes sociais:
// - barra: "Todas | Não lidas", filtros por categoria com ícone e número, marcar tudo como lido e preferências;
// - "Pedidos do social" separados no topo (como as solicitações para seguir);
// - seções Novas / Hoje / Ontem / Últimos 7 dias / Últimos 30 dias / Anteriores, com agrupamento
//   (estrelas na mesma publicação, seguidores) — avisos-agrupar.js;
// - cada linha: foto(s) com o ícone do tipo, frase, etiqueta do tipo + tempo, prévia, botões de ação
//   (Responder, Ver publicação, Seguir de volta, Aceitar/Recusar, Renovar...), miniatura e menu ⋯
//   (marcar como lida/não lida, remover, desativar a categoria);
// - preferências por categoria (`usuarios.prefNotif`, o próprio dono grava; sem regra nova).
// Lidas e removidas uma a uma ficam no aparelho (`hf-notif-<uid>`).
// Quem usa (o "host") entrega os itens já montados e os ganchos (abrir, seguir, responder pedido, salvar preferências).
// Sem dependência do rede.js.
// =====================================================
import { fotoSegura } from "./seguranca.js?v=1";
import { seloOficial, SUPORTE } from "./avisos-equipe.js?v=1";
import { PLANOS } from "./planos-base.js?v=8";
import { agrupar, secoes, nomesDoGrupo, textoDoGrupo } from "./avisos-agrupar.js?v=1";

const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const iniciais = (n) => { const p = String(n || "?").trim().split(/\s+/); return ((p[0]?.[0] || "?") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase(); };

const ICONES = {
  sino: '<path d="M18 9.5a6 6 0 00-12 0c0 6.5-2.5 8-2.5 8h17S18 16 18 9.5z"/><path d="M10.2 20.5a2 2 0 003.6 0"/>',
  checks: '<path d="M2.5 12.5l4 4L15 8M9.5 16.5l1 1L21.5 7"/>',
  config: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
  mais: '<circle cx="5.5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor"/>',
  seta: '<path d="M9 5l7 7-7 7"/>',
  fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
  tudo: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  pessoa: '<circle cx="10" cy="8.5" r="3.8"/><path d="M3.5 20c1-3.4 3.6-5.3 6.5-5.3s5.5 1.9 6.5 5.3M18.5 8v6M15.5 11h6"/>',
  estrela: '<path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8z"/>',
  chat: '<path d="M20.5 11.6c0 4.3-3.8 7.6-8.5 7.6-1.2 0-2.3-.2-3.3-.6L4 20l1.2-3.6c-1.1-1.3-1.7-3-1.7-4.8C3.5 7.4 7.3 4 12 4s8.5 3.4 8.5 7.6z"/>',
  fio: '<path d="M3 15c3-6 6 4 9-2s6 4 9-2"/><circle cx="12" cy="13" r="1.6" fill="currentColor"/>',
  envelope: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
  alerta: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.5h.01"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  suporte: '<path d="M4.5 13v-1.5a7.5 7.5 0 0115 0V13"/><rect x="3.5" y="13" width="4" height="6" rx="1.5"/><rect x="16.5" y="13" width="4" height="6" rx="1.5"/><path d="M18.5 19c0 1.4-1.6 2-4 2h-1.5"/>',
  caixa: '<path d="M5 4.5h14a1.5 1.5 0 011.5 1.5v10a1.5 1.5 0 01-1.5 1.5h-6.5L8 21v-3.5H5A1.5 1.5 0 013.5 16V6A1.5 1.5 0 015 4.5z"/><path d="M10 9.2a2 2 0 113 1.7c-.6.4-1 .8-1 1.5M12 14.6h.01"/>',
  enquete: '<rect x="4" y="5" width="16" height="3.5" rx="1.75"/><rect x="4" y="10.25" width="11" height="3.5" rx="1.75"/><rect x="4" y="15.5" width="7" height="3.5" rx="1.75"/>',
  megafone: '<path d="M4 10v4h3l6 4V6L7 10H4z"/><path d="M16.5 9a4 4 0 010 6M19 6.5a7.5 7.5 0 010 11"/>',
  selo: '<path d="M12 3l2.4 1.8 3-.2.9 2.9 2.4 1.8-1 2.8 1 2.8-2.4 1.8-.9 2.9-3-.2L12 21l-2.4-1.8-3 .2-.9-2.9-2.4-1.8 1-2.8-1-2.8 2.4-1.8.9-2.9 3 .2z"/><path d="M9 12l2 2 4-4"/>',
  maleta: '<rect x="3.5" y="7" width="17" height="12.5" rx="2"/><path d="M9 7V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7M3.5 12.5h17"/>',
  coracao: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0112 7.3a4.3 4.3 0 017.5 2.5C19.5 15.4 12 20 12 20z"/>',
  mascara: '<path d="M3.5 8.5c3-1.5 14-1.5 17 0 0 5-2.5 8-5 8-1.6 0-2.4-1.6-3.5-1.6s-1.9 1.6-3.5 1.6c-2.5 0-5-3-5-8z"/><circle cx="8.5" cy="11" r="1.3" fill="currentColor"/><circle cx="15.5" cy="11" r="1.3" fill="currentColor"/>',
  olhoOff: '<path d="M3 3l18 18M10.6 6.2A9.6 9.6 0 0112 6c5.5 0 9 6 9 6a15.4 15.4 0 01-2.7 3.4M6.5 7.6A15.4 15.4 0 003 12s3.5 6 9 6a8.6 8.6 0 004.3-1.2"/><path d="M9.9 9.9a3 3 0 004.2 4.2"/>',
  lixo: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
  lida: '<circle cx="12" cy="12" r="8.5"/><path d="M8 12.5l2.7 2.7L16 10"/>'
};
export function svg(nome, cls = "") {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true");
  s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", "2");
  s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round");
  if (cls) s.setAttribute("class", cls);
  s.innerHTML = ICONES[nome] || "";
  return s;
}

// Tipo de aviso -> cor, ícone, categoria (filtro e preferência) e nome curto (etiqueta da linha)
export const TIPOS = {
  mensagem: { cor: "#1fa855", ic: "envelope", cat: "mensagens", rot: "Mensagem" },
  seguidor: { cor: "#00adee", ic: "pessoa", cat: "seguidores", rot: "Seguidor" },
  social: { cor: "#e0457b", ic: "fio", cat: "social", rot: "Social" },
  curtida: { cor: "#f5b700", ic: "estrela", cat: "publicacoes", rot: "Estrelas" },
  comentario: { cor: "#7c5cff", ic: "chat", cat: "publicacoes", rot: "Comentário" },
  resposta: { cor: "#7c5cff", ic: "chat", cat: "publicacoes", rot: "Resposta" },
  reacao: { cor: "#e0457b", ic: "coracao", cat: "publicacoes", rot: "Reação" },
  marcacao: { cor: "#00adee", ic: "pessoa", cat: "publicacoes", rot: "Marcação" },
  enquete: { cor: "#7c5cff", ic: "enquete", cat: "enquetes", rot: "Enquete" },
  caixa: { cor: "#ff7a1a", ic: "caixa", cat: "enquetes", rot: "Perguntas" },
  avaliacao: { cor: "#f5b700", ic: "estrela", cat: "negocios", rot: "Avaliação" },
  reclamacao: { cor: "#ef4444", ic: "alerta", cat: "negocios", rot: "Reclamação" },
  "reclamacao-resp": { cor: "#ff7a1a", ic: "chat", cat: "negocios", rot: "Reclamação" },
  "reclamacao-ok": { cor: "#2fbf71", ic: "check", cat: "negocios", rot: "Reclamação" },
  plano: { cor: "#7c3aed", ic: "selo", cat: "negocios", rot: "Plano" },
  suporte: { cor: "#00adee", ic: "suporte", cat: "suporte", rot: "Suporte" },
  aviso: { cor: "#7c5cff", ic: "megafone", cat: "suporte", rot: "Aviso da equipe" }
};
// Categorias: filtro em cima e preferência (Suporte não se desliga: são avisos oficiais).
export const CATEGORIAS = [
  ["mensagens", "Mensagens", "envelope", "Mensagens novas nas suas conversas."],
  ["publicacoes", "Publicações", "estrela", "Estrelas, comentários, respostas, reações e marcações."],
  ["seguidores", "Seguidores", "pessoa", "Quando alguém começa a seguir você."],
  ["enquetes", "Enquetes e perguntas", "enquete", "Resultado das enquetes e respostas da caixa de perguntas."],
  ["social", "Social", "fio", "Pedidos e vínculos aceitos no seu social."],
  ["negocios", "Negócios", "maleta", "Avaliações, reclamações e o vencimento do seu plano."],
  ["suporte", "Suporte", "suporte", "Respostas do suporte e avisos da equipe."]
];
export const categoriaDe = (tipo) => TIPOS[tipo]?.cat || "mensagens";
// Preferência: tudo ligado, a não ser o que a pessoa desligou ({ categoria: false }).
export const categoriaLigada = (prefs, cat) => cat === "suporte" || !prefs || prefs[cat] !== false;

function tempo(t) {
  if (!t) return "";
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  if (s < 604800) return `${Math.floor(s / 86400)} d`;
  return new Date(t).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

// ---------- visual ----------
const CSS = `
.nt2, .nt2-pref-fundo, .nt2-menu { --nt-ac: var(--accent, #00adee); }
.nt2 { display: flex; flex-direction: column; min-height: 0; color: var(--text, #eaf0f3); }
.nt2-barra { display: grid; gap: 10px; padding: 2px 0 10px; }
.nt2-linha1 { display: flex; align-items: center; gap: 8px; }
.nt2-seg { display: inline-flex; padding: 3px; border-radius: 12px; background: var(--panel-2, #151f25); border: 1px solid var(--line, #213038); }
.nt2-seg button { border: 0; border-radius: 9px; padding: 7px 13px; font: inherit; font-size: 13px; font-weight: 800; color: var(--muted, #8c9ca7); background: transparent; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
.nt2-seg button[aria-pressed="true"] { background: var(--panel, #0f161b); color: var(--text, #eaf0f3); box-shadow: 0 1px 4px rgba(0, 0, 0, .18); }
.nt2-seg em { font-style: normal; min-width: 18px; padding: 0 5px; border-radius: 999px; font-size: 11px; background: #ff3b5c; color: #fff; }
.nt2-seg em:empty { display: none; }
.nt2-esp { flex: 1; }
.nt2-ib { width: 36px; height: 36px; border-radius: 11px; border: 1px solid var(--line, #213038); background: var(--panel-2, #151f25); color: var(--text, #eaf0f3); display: grid; place-items: center; cursor: pointer; }
.nt2-ib:hover { border-color: var(--nt-ac); }
.nt2-ib:disabled { opacity: .45; cursor: default; }
.nt2-ib svg { width: 18px; height: 18px; }
.nt2-chips { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; margin: 0 -2px; padding: 0 2px; }
.nt2-chips::-webkit-scrollbar { display: none; }
.nt2-chip { flex-shrink: 0; display: inline-flex; align-items: center; gap: 6px; padding: 7px 11px; border-radius: 999px; border: 1px solid var(--line, #213038); background: var(--panel-2, #151f25); color: var(--muted, #8c9ca7); font: inherit; font-size: 12.5px; font-weight: 750; cursor: pointer; }
.nt2-chip svg { width: 14px; height: 14px; }
.nt2-chip b { font-size: 11px; font-weight: 800; padding: 0 6px; border-radius: 999px; background: color-mix(in srgb, var(--muted, #8c9ca7) 18%, transparent); color: inherit; }
.nt2-chip b:empty { display: none; }
.nt2-chip[aria-selected="true"] { background: var(--text, #eaf0f3); color: var(--panel, #0f161b); border-color: var(--text, #eaf0f3); }
.nt2-chip[aria-selected="true"] b { background: color-mix(in srgb, var(--panel, #0f161b) 22%, transparent); }
.nt2-chip.off { opacity: .55; text-decoration: line-through; }
.nt2-lista { display: grid; gap: 2px; }
.nt2-sec { padding: 14px 6px 6px; font-size: 11.5px; font-weight: 800; letter-spacing: 1.1px; text-transform: uppercase; color: var(--muted, #8c9ca7); display: flex; align-items: center; justify-content: space-between; }
.nt2-sec span { letter-spacing: 0; text-transform: none; font-weight: 700; }
.nt2-pedidos { display: flex; align-items: center; gap: 12px; margin: 4px 0 2px; padding: 12px; border-radius: 16px; border: 1px solid var(--line, #213038); background: var(--panel-2, #151f25); color: inherit; font: inherit; text-align: left; cursor: pointer; width: 100%; }
.nt2-pedidos .ic { width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, #e0457b, #7c3aed); flex-shrink: 0; }
.nt2-pedidos .ic svg { width: 20px; height: 20px; }
.nt2-pedidos .tx { flex: 1; display: grid; gap: 1px; min-width: 0; }
.nt2-pedidos .tx strong { font-size: 14.5px; }
.nt2-pedidos .tx small { color: var(--muted, #8c9ca7); font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nt2-pedidos .ponto { width: 9px; height: 9px; border-radius: 50%; background: #ff3b5c; }
.nt2-pedidos > svg { width: 16px; height: 16px; color: var(--muted, #8c9ca7); transition: transform .2s; }
.nt2-pedidos[aria-expanded="true"] > svg { transform: rotate(90deg); }
.nt2-item { position: relative; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 12px; align-items: start; padding: 11px 10px; border-radius: 16px; cursor: pointer; transition: background .15s; }
.nt2-item:hover { background: var(--hover, #19252c); }
.nt2-item:focus-visible { outline: 2px solid var(--nt-ac); outline-offset: 1px; }
.nt2-item.nova { background: color-mix(in srgb, var(--nt-ac) 8%, transparent); }
.nt2-item.nova:hover { background: color-mix(in srgb, var(--nt-ac) 13%, transparent); }
.nt2-av { position: relative; width: 48px; height: 48px; }
.nt2-av .f { width: 48px; height: 48px; border-radius: 50%; overflow: hidden; display: grid; place-items: center; font-weight: 800; font-size: 15px; color: #fff; background: linear-gradient(135deg, #0a3140, #00adee); }
.nt2-av .f img { width: 100%; height: 100%; object-fit: cover; }
.nt2-av .f svg { width: 22px; height: 22px; }
.nt2-av.duplo .f { position: absolute; width: 36px; height: 36px; font-size: 12px; border: 2px solid var(--panel, #0f161b); }
.nt2-av.duplo .f:first-child { top: 0; left: 0; }
.nt2-av.duplo .f:nth-child(2) { right: 0; bottom: 0; }
.nt2-av .f.plano { background: linear-gradient(135deg, var(--pc, #7c3aed), color-mix(in srgb, var(--pc, #7c3aed) 55%, #000)); }
.nt2-av .f.anon { background: linear-gradient(135deg, #3b3f46, #6b7280); }
.nt2-av .t { position: absolute; right: -3px; bottom: -3px; width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; color: #fff; border: 2px solid var(--panel, #0f161b); }
.nt2-av .t svg { width: 12px; height: 12px; }
.nt2-av.duplo .t { right: auto; left: -3px; }
.nt2-tx { min-width: 0; display: grid; gap: 4px; }
.nt2-frase { font-size: 14px; line-height: 1.4; overflow-wrap: anywhere; }
.nt2-frase b { font-weight: 800; }
.nt2-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 12px; color: var(--muted, #8c9ca7); }
.nt2-tag { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 800; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); }
.nt2-nl { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 800; color: #1fa855; background: color-mix(in srgb, #1fa855 14%, transparent); }
.nt2-prev { margin: 0; padding: 7px 10px; border-radius: 10px; border-left: 3px solid var(--c, var(--line, #213038)); background: var(--panel-2, #151f25); font-size: 13px; line-height: 1.4; color: var(--text, #eaf0f3); overflow-wrap: anywhere; }
/* o corte em 3 linhas fica no texto de dentro: com o espaçamento na caixa, a 3ª linha não aparece pela metade */
.nt2-prev span { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.nt2-ok { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 800; color: #2fbf71; background: color-mix(in srgb, #2fbf71 14%, transparent); }
.nt2-ok svg { width: 11px; height: 11px; }
.nt2-acoes { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }
.nt2-bt { border: 1px solid var(--line, #213038); border-radius: 10px; padding: 7px 12px; font: inherit; font-size: 12.5px; font-weight: 800; cursor: pointer; background: var(--panel-2, #151f25); color: var(--text, #eaf0f3); }
.nt2-bt.pri { background: var(--nt-ac); border-color: var(--nt-ac); color: #fff; }
.nt2-bt.on { background: var(--panel-2, #151f25); color: var(--text, #eaf0f3); }
.nt2-bt:disabled { opacity: .5; cursor: default; }
.nt2-lado { display: grid; justify-items: end; gap: 6px; }
.nt2-mini { width: 48px; height: 48px; border-radius: 10px; object-fit: cover; background: var(--panel-2, #151f25); }
.nt2-mini.tx { display: grid; place-items: center; padding: 4px; font-size: 8.5px; line-height: 1.2; color: var(--muted, #8c9ca7); overflow: hidden; border: 1px solid var(--line, #213038); text-align: center; box-sizing: border-box; }
.nt2-mais { width: 30px; height: 30px; border-radius: 9px; border: 0; background: transparent; color: var(--muted, #8c9ca7); display: grid; place-items: center; cursor: pointer; }
.nt2-mais:hover { background: var(--panel-2, #151f25); color: var(--text, #eaf0f3); }
.nt2-mais svg { width: 18px; height: 18px; }
.nt2-ponto { position: absolute; top: 15px; left: 3px; width: 7px; height: 7px; border-radius: 50%; background: var(--nt-ac); }
.nt2-menu { position: fixed; z-index: 9800; min-width: 230px; padding: 6px; border-radius: 14px; background: var(--panel, #0f161b); border: 1px solid var(--line, #213038); box-shadow: 0 18px 50px rgba(0, 0, 0, .35); display: grid; }
.nt2-menu button { display: flex; align-items: center; gap: 10px; padding: 10px; border: 0; border-radius: 10px; background: transparent; color: var(--text, #eaf0f3); font: inherit; font-size: 13.5px; font-weight: 650; text-align: left; cursor: pointer; }
.nt2-menu button:hover { background: var(--hover, #19252c); }
.nt2-menu button svg { width: 18px; height: 18px; color: var(--muted, #8c9ca7); }
.nt2-menu button.perigo, .nt2-menu button.perigo svg { color: #e5484d; }
.nt2-vazio { display: grid; justify-items: center; gap: 8px; text-align: center; padding: 44px 20px; color: var(--muted, #8c9ca7); }
.nt2-vazio .ic { width: 64px; height: 64px; border-radius: 20px; display: grid; place-items: center; color: var(--nt-ac); background: color-mix(in srgb, var(--nt-ac) 12%, transparent); }
.nt2-vazio .ic svg { width: 30px; height: 30px; }
.nt2-vazio strong { color: var(--text, #eaf0f3); font-size: 16px; }
.nt2-vazio button { margin-top: 4px; }
.nt2-maisbt { margin: 10px auto 4px; display: block; }
.nt2-desl { margin: 6px 0; padding: 10px 12px; border-radius: 12px; font-size: 12.5px; color: var(--muted, #8c9ca7); background: var(--panel-2, #151f25); display: flex; align-items: center; gap: 10px; }
.nt2-desl span { flex: 1; }
.nt2-desl button { border: 0; background: none; color: var(--nt-ac); font: inherit; font-weight: 800; cursor: pointer; }
/* preferências */
.nt2-pref-fundo { position: fixed; inset: 0; z-index: 9700; display: grid; place-items: end center; background: rgba(2, 6, 9, .55); -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px); }
.nt2-pref { width: min(480px, 100%); max-height: 90vh; overflow-y: auto; padding: 16px 16px calc(18px + env(safe-area-inset-bottom)); border-radius: 22px 22px 0 0; background: var(--panel, #0f161b); color: var(--text, #eaf0f3); border: 1px solid var(--line, #213038); display: grid; gap: 6px; }
@media (min-width: 700px) { .nt2-pref-fundo { place-items: center; } .nt2-pref { border-radius: 22px; } }
.nt2-pref-topo { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 4px; }
.nt2-pref-topo strong { font-size: 18px; }
.nt2-pref > p { margin: 0 0 6px; color: var(--muted, #8c9ca7); font-size: 13px; }
.nt2-op { display: flex; align-items: center; gap: 12px; padding: 11px 6px; border-bottom: 1px solid var(--line, #213038); }
.nt2-op .ic { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; background: var(--panel-2, #151f25); flex-shrink: 0; }
.nt2-op .ic svg { width: 18px; height: 18px; }
.nt2-op .tx { flex: 1; display: grid; gap: 1px; min-width: 0; }
.nt2-op .tx strong { font-size: 14px; }
.nt2-op .tx small { color: var(--muted, #8c9ca7); font-size: 12px; }
.nt2-sw { position: relative; width: 46px; height: 28px; flex-shrink: 0; border: 0; border-radius: 999px; background: var(--line, #213038); cursor: pointer; transition: background .2s; }
.nt2-sw::after { content: ""; position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; border-radius: 50%; background: #fff; transition: transform .2s; box-shadow: 0 1px 3px rgba(0, 0, 0, .3); }
.nt2-sw[aria-checked="true"] { background: var(--nt-ac); }
.nt2-sw[aria-checked="true"]::after { transform: translateX(18px); }
.nt2-sw:disabled { opacity: .6; cursor: default; }
.nt2-salvar { margin-top: 10px; padding: 13px; border-radius: 14px; border: 0; background: var(--nt-ac); color: #fff; font: inherit; font-weight: 800; cursor: pointer; }
.nt2-toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 9900; padding: 11px 16px; border-radius: 12px; font-weight: 700; font-size: 13.5px; background: var(--text, #eaf0f3); color: var(--panel, #0f161b); max-width: 90vw; box-shadow: 0 10px 30px rgba(0, 0, 0, .3); }
@media (max-width: 420px) { .nt2-item { gap: 10px; padding: 10px 6px; } .nt2-mini { width: 42px; height: 42px; } }
`;
function css() { if (document.getElementById("nt2Css")) return; const s = document.createElement("style"); s.id = "nt2Css"; s.textContent = CSS; document.head.appendChild(s); }
export function toastNt(t) { css(); const d = el("div", "nt2-toast", t); d.setAttribute("role", "status"); document.body.appendChild(d); setTimeout(() => d.remove(), 3000); }

// ---------- lidas e removidas (no aparelho) ----------
function estadoLocal(uid) {
  const chave = "hf-notif-" + uid;
  let e = { lidos: [], ocultos: [], naoLidos: [] };
  try { e = { ...e, ...JSON.parse(localStorage.getItem(chave) || "{}") }; } catch {}
  const conj = { lidos: new Set(e.lidos), ocultos: new Set(e.ocultos), naoLidos: new Set(e.naoLidos) };
  conj.gravar = () => { try { localStorage.setItem(chave, JSON.stringify({ lidos: [...conj.lidos].slice(-400), ocultos: [...conj.ocultos].slice(-400), naoLidos: [...conj.naoLidos].slice(-100) })); } catch {} };
  return conj;
}

// ---------- a lista ----------
// opcoes: { raiz, uid, ganchos: { abrir(i), botaoSeguir(uid)?, responderVinculo(i, aceitar)?, salvarPrefs(prefs)?, marcarTodasVistas()?, miniatura(i)?, extra(i)? } }
export function criarLista({ raiz, uid, ganchos = {} }) {
  css();
  const loc = estadoLocal(uid);
  let itens = [], vistoAntes = 0, prefs = {}, cat = "tudo", soNaoLidas = false, limite = 60, pedidosAbertos = false;
  const wrap = el("div", "nt2");
  const barra = el("div", "nt2-barra");
  const l1 = el("div", "nt2-linha1");
  const seg = el("div", "nt2-seg"); seg.setAttribute("role", "group"); seg.setAttribute("aria-label", "Mostrar");
  const bTodas = el("button", null, "Todas"), bNao = el("button"); bTodas.type = bNao.type = "button";
  const emNao = el("em"); bNao.append(document.createTextNode("Não lidas"), emNao);
  seg.append(bTodas, bNao);
  const bLidas = el("button", "nt2-ib"); bLidas.type = "button"; bLidas.title = "Marcar todas como lidas"; bLidas.setAttribute("aria-label", "Marcar todas como lidas"); bLidas.appendChild(svg("checks"));
  const bPref = el("button", "nt2-ib"); bPref.type = "button"; bPref.title = "Preferências de notificação"; bPref.setAttribute("aria-label", "Preferências de notificação"); bPref.appendChild(svg("config"));
  l1.append(seg, el("span", "nt2-esp"), bLidas, bPref);
  const chips = el("div", "nt2-chips"); chips.setAttribute("role", "tablist"); chips.setAttribute("aria-label", "Categorias");
  barra.append(l1, chips);
  const lista = el("div", "nt2-lista"); lista.setAttribute("aria-live", "polite");
  wrap.append(barra, lista);
  raiz.replaceChildren(wrap);

  const ehNova = (i) => !loc.lidos.has(i.id) && (loc.naoLidos.has(i.id) || i.quando > vistoAntes || !!i.pendente || !!i.naoLida);
  const visivel = (i) => !loc.ocultos.has(i.id) && categoriaLigada(prefs, categoriaDe(i.tipo));
  bTodas.addEventListener("click", () => { soNaoLidas = false; limite = 60; pintar(); });
  bNao.addEventListener("click", () => { soNaoLidas = true; limite = 60; pintar(); });
  bLidas.addEventListener("click", () => {
    itens.forEach((i) => { loc.lidos.add(i.id); loc.naoLidos.delete(i.id); });
    loc.gravar(); vistoAntes = Date.now(); ganchos.marcarTodasVistas?.(); pintar(); toastNt("Tudo marcado como lido");
  });
  bPref.addEventListener("click", abrirPreferencias);

  function pintarChips(vis) {
    const cont = { tudo: vis.length };
    vis.forEach((i) => { const c = categoriaDe(i.tipo); cont[c] = (cont[c] || 0) + 1; });
    chips.replaceChildren();
    [["tudo", "Tudo", "tudo"], ...CATEGORIAS.map(([k, r, ic]) => [k, r, ic])].forEach(([k, r, ic]) => {
      const desligada = k !== "tudo" && !categoriaLigada(prefs, k);
      if (k !== "tudo" && !cont[k] && !desligada && cat !== k) return; // só mostra categorias com alguma notificação
      const b = el("button", "nt2-chip" + (desligada ? " off" : "")); b.type = "button"; b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(cat === k));
      if (desligada) b.title = "Desativada nas preferências";
      b.append(svg(ic), document.createTextNode(r), el("b", null, cont[k] ? String(cont[k] > 99 ? "99+" : cont[k]) : ""));
      b.addEventListener("click", () => { cat = k; limite = 60; pintar(); });
      chips.appendChild(b);
    });
  }

  function foto(i) {
    const f = el("div", "f");
    const u = i.oficial ? SUPORTE.foto : fotoSegura(i.foto);
    if (u) { const img = document.createElement("img"); img.src = u; img.alt = ""; img.loading = "lazy"; img.onerror = () => { f.textContent = iniciais(i.nome); }; f.appendChild(img); } else f.textContent = iniciais(i.nome);
    return f;
  }
  function avatar(i) {
    const w = el("div", "nt2-av" + (i.grupo ? " duplo" : ""));
    if (i.grupo) w.append(foto(i.grupo[1]), foto(i.grupo[0]));
    else if (i.tipo === "plano") { const f = el("div", "f plano"); f.style.setProperty("--pc", PLANOS[i.plano]?.cor || "#7c3aed"); f.appendChild(svg("selo")); w.appendChild(f); }
    else if (i.tipo === "caixa" && i.anonima) { const f = el("div", "f anon"); f.appendChild(svg("mascara")); w.appendChild(f); }
    else w.appendChild(foto(i));
    const tp = TIPOS[i.tipo] || TIPOS.mensagem;
    const t = el("span", "t"); t.style.background = tp.cor; t.appendChild(svg(tp.ic));
    w.appendChild(t);
    return w;
  }
  // Botões de ação de cada tipo (o clique na linha também abre o destino).
  function acoes(i, d) {
    const box = el("div", "nt2-acoes");
    const bt = (rot, pri, fn) => { const b = el("button", "nt2-bt" + (pri ? " pri" : ""), rot); b.type = "button"; b.addEventListener("click", (e) => { e.stopPropagation(); fn(b); }); box.appendChild(b); return b; };
    const abrir = () => { marcarLida(i, true); ganchos.abrir(i); };
    switch (i.tipo) {
      case "social":
        if (i.pendente && ganchos.responderVinculo) {
          const sim = bt("Aceitar", true, async () => { sim.disabled = nao.disabled = true; await ganchos.responderVinculo(i, true); });
          const nao = bt("Recusar", false, async () => { sim.disabled = nao.disabled = true; await ganchos.responderVinculo(i, false); });
        } else bt("Ver perfil", false, abrir);
        break;
      case "mensagem": bt("Responder", true, abrir); break;
      case "seguidor":
        if (!i.grupo && ganchos.botaoSeguir) { const b = ganchos.botaoSeguir(i.uid); if (b) { b.classList.add("nt2-bt"); b.addEventListener("click", (e) => e.stopPropagation()); box.appendChild(b); } }
        bt(i.grupo ? "Ver todos" : "Ver perfil", false, abrir);
        break;
      case "comentario": case "resposta": bt("Responder", true, abrir); break;
      case "curtida": case "marcacao": case "reacao": bt("Ver publicação", false, abrir); break;
      case "enquete": bt("Ver resultado", true, abrir); break;
      case "caixa": bt("Ver respostas", true, abrir); break;
      case "avaliacao": bt(i.cliente ? "Ver perfil" : "Ver avaliação", false, abrir); break;
      case "reclamacao": if (i.respondida) bt("Ver sua resposta", false, abrir); else bt("Responder publicamente", true, abrir); break;
      case "reclamacao-resp": case "reclamacao-ok": bt("Ver reclamação", false, abrir); break;
      case "plano": bt(i.venceu ? "Renovar plano" : "Renovar agora", true, abrir); break;
      // Botão azul só quando ainda falta ler; depois de lido fica discreto.
      case "suporte": bt(i.abertoPelaEquipe && !i.respondeu ? "Abrir conversa" : "Ver resposta", !!i.naoLida, abrir); break;
      case "aviso": bt(i.naoLida ? "Ler aviso" : "Ver aviso", !!i.naoLida, abrir); break;
    }
    return box.childElementCount ? box : null;
  }
  function linha(i) {
    const nova = ehNova(i);
    const tp = TIPOS[i.tipo] || TIPOS.mensagem;
    const d = el("div", "nt2-item" + (nova ? " nova" : ""));
    d.tabIndex = 0; d.setAttribute("role", "article");
    d.style.setProperty("--c", tp.cor);
    if (nova) d.appendChild(el("span", "nt2-ponto"));
    const tx = el("div", "nt2-tx");
    const frase = el("div", "nt2-frase");
    const nome = el("b", null, nomesDoGrupo(i));
    if (i.oficial) nome.appendChild(seloOficial());
    const texto = i.grupo ? textoDoGrupo(i) : i.texto || "";
    frase.append(nome, document.createTextNode(" " + texto));
    const meta = el("div", "nt2-meta");
    const tag = el("span", "nt2-tag"); tag.style.setProperty("--c", tp.cor); tag.append(svg(tp.ic), document.createTextNode(i.tipo === "plano" ? "Seu plano" : tp.rot));
    tag.querySelector("svg").style.cssText = "width:11px;height:11px";
    meta.append(tag, el("span", null, tempo(i.quando)));
    if (i.naoLida) meta.appendChild(el("span", "nt2-nl", i.oficial ? "nova" : "não lida"));
    if (i.tipo === "reclamacao" && i.respondida) { const ok = el("span", "nt2-ok"); ok.append(svg("check"), document.createTextNode("Respondida")); meta.appendChild(ok); }
    tx.append(frase, meta);
    if (i.detalhe) { const pv = el("p", "nt2-prev"); pv.appendChild(el("span", null, i.detalhe)); pv.title = i.detalhe; pv.style.setProperty("--c", tp.cor); tx.appendChild(pv); }
    const ex = ganchos.extra?.(i); if (ex) tx.appendChild(ex);
    const ac = acoes(i, d); if (ac) tx.appendChild(ac);
    const lado = el("div", "nt2-lado");
    const mais = el("button", "nt2-mais"); mais.type = "button"; mais.setAttribute("aria-label", "Opções desta notificação"); mais.appendChild(svg("mais"));
    mais.addEventListener("click", (e) => { e.stopPropagation(); menuItem(i, mais); });
    lado.appendChild(mais);
    const poeMini = (m) => {
      if (!m) return;
      if (m.foto) { const img = document.createElement("img"); img.className = "nt2-mini"; img.src = m.foto; img.alt = ""; img.loading = "lazy"; lado.appendChild(img); }
      else if (m.texto) lado.appendChild(el("span", "nt2-mini tx", String(m.texto).slice(0, 60)));
    };
    if (i.mini) poeMini(i.mini);
    else if (i.postId && ganchos.miniatura) ganchos.miniatura(i).then((m) => { i.mini = m; poeMini(m); }).catch(() => {});
    d.append(avatar(i), tx, lado);
    d.setAttribute("aria-label", `${nomesDoGrupo(i)} ${texto}, ${tempo(i.quando)}${nova ? ", nova" : ""}`);
    const ir = () => { marcarLida(i, true); ganchos.abrir(i); };
    d.addEventListener("click", (e) => { if (!e.target.closest("button")) ir(); });
    d.addEventListener("keydown", (e) => { if (e.target === d && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); ir(); } });
    return d;
  }
  function marcarLida(i, sim) {
    const ids = i.grupo ? i.grupo.map((x) => x.id) : [i.id];
    ids.forEach((id) => { if (sim) { loc.lidos.add(id); loc.naoLidos.delete(id); } else { loc.lidos.delete(id); loc.naoLidos.add(id); } });
    loc.gravar();
  }
  function fecharMenus() { document.querySelectorAll(".nt2-menu").forEach((m) => m.remove()); }
  function menuItem(i, ancora) {
    fecharMenus();
    const m = el("div", "nt2-menu"); m.setAttribute("role", "menu");
    const op = (ic, rot, fn, cls = "") => { const b = el("button", cls); b.type = "button"; b.setAttribute("role", "menuitem"); b.append(svg(ic), document.createTextNode(rot)); b.addEventListener("click", (e) => { e.stopPropagation(); fecharMenus(); fn(); }); m.appendChild(b); };
    const nova = ehNova(i);
    op("lida", nova ? "Marcar como lida" : "Marcar como não lida", () => { marcarLida(i, nova); pintar(); });
    op("lixo", "Remover esta notificação", () => { (i.grupo ? i.grupo : [i]).forEach((x) => loc.ocultos.add(x.id)); loc.gravar(); pintar(); toastNt("Notificação removida"); });
    const c = categoriaDe(i.tipo);
    if (c !== "suporte" && ganchos.salvarPrefs) {
      const nomeCat = CATEGORIAS.find((x) => x[0] === c)?.[1] || "esta categoria";
      op("olhoOff", `Desativar: ${nomeCat}`, async () => { prefs = { ...prefs, [c]: false }; await ganchos.salvarPrefs(prefs); pintar(); toastNt(`${nomeCat}: desativada. Reative em ⚙.`); });
    }
    document.body.appendChild(m);
    const r = ancora.getBoundingClientRect(), w = m.offsetWidth, h = m.offsetHeight;
    m.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + "px";
    m.style.top = (r.bottom + h + 8 > innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6) + "px";
    setTimeout(() => m.querySelector("button")?.focus(), 20);
    const fora = (e) => { if (!m.contains(e.target)) { fecharMenus(); document.removeEventListener("pointerdown", fora, true); } };
    document.addEventListener("pointerdown", fora, true);
    m.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); fecharMenus(); ancora.focus(); } });
  }
  function abrirPreferencias() {
    const fundo = el("div", "nt2-pref-fundo vt-local-fundo");
    const cx = el("div", "nt2-pref"); cx.setAttribute("role", "dialog"); cx.setAttribute("aria-modal", "true"); cx.setAttribute("aria-label", "Preferências de notificação");
    const topo = el("div", "nt2-pref-topo"); topo.appendChild(el("strong", null, "Preferências de notificação"));
    const x = el("button", "nt2-ib"); x.type = "button"; x.setAttribute("aria-label", "Fechar"); x.dataset.fechar = ""; x.appendChild(svg("fechar")); topo.appendChild(x);
    cx.append(topo, el("p", null, "Escolha o que aparece no sino e conta no número. Avisos do suporte e da equipe ficam sempre ligados."));
    const novo = { ...prefs };
    CATEGORIAS.forEach(([k, r, ic, desc]) => {
      const o = el("div", "nt2-op");
      const i = el("span", "ic"); i.appendChild(svg(ic));
      const t = el("span", "tx"); t.append(el("strong", null, r), el("small", null, desc));
      const sw = el("button", "nt2-sw"); sw.type = "button"; sw.setAttribute("role", "switch"); sw.setAttribute("aria-label", r);
      const pintarSw = () => sw.setAttribute("aria-checked", String(categoriaLigada(novo, k)));
      pintarSw();
      if (k === "suporte") sw.disabled = true;
      else sw.addEventListener("click", () => { if (categoriaLigada(novo, k)) novo[k] = false; else delete novo[k]; pintarSw(); });
      o.append(i, t, sw); cx.appendChild(o);
    });
    // Avisos do navegador (com a aba em segundo plano)
    if ("Notification" in window) {
      const o = el("div", "nt2-op");
      const i = el("span", "ic"); i.appendChild(svg("sino"));
      const st = Notification.permission;
      const t = el("span", "tx"); t.append(el("strong", null, "Avisos do navegador"), el("small", null, st === "granted" ? "Ligados neste aparelho." : st === "denied" ? "Bloqueados. Libere nas configurações do navegador." : "Receba avisos mesmo com o site em segundo plano."));
      o.append(i, t);
      if (st === "default") { const b = el("button", "nt2-bt pri", "Ativar"); b.type = "button"; b.addEventListener("click", async () => { try { await Notification.requestPermission(); } catch {} t.lastChild.textContent = Notification.permission === "granted" ? "Ligados neste aparelho." : "Não foram ativados."; b.remove(); }); o.appendChild(b); }
      cx.appendChild(o);
    }
    const salvar = el("button", "nt2-salvar", "Salvar preferências"); salvar.type = "button";
    cx.appendChild(salvar);
    fundo.appendChild(cx); document.body.appendChild(fundo);
    const fechar = () => { fundo.remove(); document.removeEventListener("keydown", tecla, true); bPref.focus({ preventScroll: true }); };
    const tecla = (e) => { if (e.key === "Escape") { e.stopPropagation(); fechar(); } };
    document.addEventListener("keydown", tecla, true);
    fundo.addEventListener("click", (e) => { if (e.target === fundo) fechar(); });
    x.addEventListener("click", fechar);
    salvar.addEventListener("click", async () => {
      salvar.disabled = true; salvar.textContent = "Salvando...";
      try { prefs = novo; await ganchos.salvarPrefs?.(prefs); fechar(); pintar(); toastNt("Preferências salvas"); }
      catch { salvar.disabled = false; salvar.textContent = "Salvar preferências"; toastNt("Não foi possível salvar agora."); }
    });
    setTimeout(() => cx.querySelector(".nt2-sw:not(:disabled)")?.focus({ preventScroll: true }), 50);
  }

  function vazio(titulo, texto, botao) {
    const v = el("div", "nt2-vazio");
    const ic = el("div", "ic"); ic.appendChild(svg("sino"));
    v.append(ic, el("strong", null, titulo), el("span", null, texto));
    if (botao) { const b = el("button", "nt2-bt", botao[0]); b.type = "button"; b.addEventListener("click", botao[1]); v.appendChild(b); }
    return v;
  }
  function pintar() {
    fecharMenus();
    const vis = itens.filter(visivel);
    const naoLidas = vis.filter(ehNova).length;
    emNao.textContent = naoLidas ? String(naoLidas > 99 ? "99+" : naoLidas) : "";
    bTodas.setAttribute("aria-pressed", String(!soNaoLidas)); bNao.setAttribute("aria-pressed", String(soNaoLidas));
    bLidas.disabled = !naoLidas;
    pintarChips(vis);
    let l = cat === "tudo" ? vis : vis.filter((i) => categoriaDe(i.tipo) === cat);
    if (soNaoLidas) l = l.filter(ehNova);
    lista.replaceChildren();
    // Categoria desligada: avisa e oferece religar.
    if (cat !== "tudo" && !categoriaLigada(prefs, cat)) {
      const nomeCat = CATEGORIAS.find((x) => x[0] === cat)?.[1];
      lista.appendChild(vazio(`${nomeCat}: desativada`, "Você desligou esta categoria nas preferências.", ["Ativar de novo", async () => { const p = { ...prefs }; delete p[cat]; prefs = p; await ganchos.salvarPrefs?.(prefs); pintar(); }]));
      return;
    }
    if (!l.length) {
      lista.appendChild(soNaoLidas ? vazio("Tudo lido", "Você está em dia com as notificações.", ["Ver todas", () => { soNaoLidas = false; pintar(); }])
        : vazio("Nada por aqui ainda", cat === "tudo" ? "Mensagens, seguidores, estrelas, comentários, avaliações, avisos do suporte e do seu plano aparecem aqui." : "Nenhuma notificação desta categoria."));
      return;
    }
    // Pedidos do social pendentes ficam juntos no topo (como as solicitações para seguir).
    const pedidos = l.filter((i) => i.tipo === "social" && i.pendente);
    if (pedidos.length) {
      l = l.filter((i) => !(i.tipo === "social" && i.pendente));
      const b = el("button", "nt2-pedidos"); b.type = "button"; b.setAttribute("aria-expanded", String(pedidosAbertos));
      const ic = el("span", "ic"); ic.appendChild(svg("fio"));
      const t = el("span", "tx"); t.append(el("strong", null, `Pedidos do social · ${pedidos.length}`), el("small", null, pedidos.slice(0, 3).map((p) => String(p.nome || "").split(" ")[0]).join(", ") + (pedidos.length > 3 ? " e outros" : "")));
      b.append(ic, t, el("span", "ponto"), svg("seta"));
      b.addEventListener("click", () => { pedidosAbertos = !pedidosAbertos; pintar(); });
      lista.appendChild(b);
      if (pedidosAbertos) pedidos.forEach((i) => lista.appendChild(linha(i)));
    }
    let restam = limite;
    secoes(agrupar(l, ehNova), ehNova).forEach(([t, ls]) => {
      if (restam <= 0) return;
      const s = el("div", "nt2-sec"); s.appendChild(document.createTextNode(t));
      if (t === "Novas") s.appendChild(el("span", null, String(ls.length)));
      lista.appendChild(s);
      ls.slice(0, restam).forEach((i) => lista.appendChild(linha(i)));
      restam -= ls.length;
    });
    if (restam < 0) {
      const b = el("button", "nt2-bt nt2-maisbt", "Mostrar mais"); b.type = "button";
      b.addEventListener("click", () => { limite += 40; pintar(); });
      lista.appendChild(b);
    }
  }
  // Fecha o menu ⋯ ao rolar a lista
  addEventListener("scroll", fecharMenus, { passive: true, capture: true });
  return {
    pintar(novos, opcoes = {}) {
      itens = novos || [];
      if ("vistoAntes" in opcoes) vistoAntes = opcoes.vistoAntes || 0;
      if ("prefs" in opcoes) prefs = opcoes.prefs || {};
      pintar();
    },
    contarNaoLidas: () => itens.filter(visivel).filter(ehNova).length,
    redesenhar: pintar
  };
}
