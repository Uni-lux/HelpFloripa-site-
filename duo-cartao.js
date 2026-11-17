// =====================================================
// Cartão do duo (Akai Ito), 16/11/2026, pedido dele: tocar na rosinha do perfil (ou no cartão Akai Ito do Social)
// abre uma gaveta com a prévia completa do duo: os dois com o fio vermelho, desde quando, a frase de vocês, quem é
// a pessoa (nome, selo, @, cidade, bio), as fotos dela (Salão + Diário, só o que quem vê pode ver), os números e
// Ver perfil · Mensagem · Presente. Substitui a gaveta apertada que saía por cima dos números do perfil.
// Sem dependências do rede.js: quem chama passa o fb e as funções de abrir.
// =====================================================
import { lerMomentos, contarMomentos, relacaoCom, fotoOk } from "./salao-base.js?v=3";

const FRASES = [
  "O fio pode esticar e se enrolar, mas nunca se rompe.",
  "Um fio vermelho liga quem estava destinado a se encontrar.",
  "Nem o tempo nem a distância desatam este nó.",
  "Algumas ligações já nasceram prontas."
];
const hash = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const ms = (t) => (t?.toMillis ? t.toMillis() : typeof t === "number" ? t : 0);
const deISO = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s || "") ? new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) : null);
const primeiro = (n) => String(n || "Usuário").trim().split(/\s+/)[0];
const iniciais = (n) => { const p = String(n || "?").trim().split(/\s+/); return ((p[0]?.[0] || "?") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase(); };
const fotoSeg = (u) => (typeof u === "string" && /^(data:image\/(jpeg|png|webp);base64,|https:\/\/firebasestorage\.googleapis\.com\/|https:\/\/lh3\.googleusercontent\.com\/)/.test(u) ? u : "");
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const svg = (d, cls = "") => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true"); if (cls) s.setAttribute("class", cls); s.innerHTML = d; return s; };
const IC = {
  camera: '<path d="M4 8h3l1.6-2.5h6.8L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.6"/>',
  fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
  rosa: '<path d="M12 13.2c-2.7 0-4.6-2-4.6-4.5 0-1.6.8-2.9 1.9-3.7.3 1.1 1.3 1.9 2.7 1.9s2.4-.8 2.7-1.9c1.1.8 1.9 2.1 1.9 3.7 0 2.5-1.9 4.5-4.6 4.5z" fill="currentColor" stroke="none"/><path d="M12 13.2V21M12 17.2c-1.4-1.9-3.4-2.2-5-1.6 1 1.9 3.1 2.5 5 1.6zM12 16.2c1.2-1.5 2.9-1.7 4.2-1.2-.8 1.5-2.5 2-4.2 1.2z"/>',
  chat: '<path d="M4 5.5h16v10.5H9l-5 4z"/>',
  presente: '<rect x="3.5" y="9" width="17" height="11.5" rx="1.5"/><path d="M2.5 9h19M12 9v11.5M12 9c-1.6-3.6-6-4.2-6-1.6C6 9 9.5 9 12 9zM12 9c1.6-3.6 6-4.2 6-1.6C18 9 14.5 9 12 9z"/>',
  seta: '<path d="M9 5l7 7-7 7"/>',
  selo: '<path d="M12 2.5l2.4 1.8 3-.2.9 2.9 2.5 1.7-1 2.8 1 2.8-2.5 1.7-.9 2.9-3-.2L12 21.5l-2.4-1.8-3 .2-.9-2.9-2.5-1.7 1-2.8-1-2.8 2.5-1.7.9-2.9 3 .2z" fill="currentColor" stroke="none"/><path d="M8.3 12.2l2.5 2.5 5-5.2" stroke="#fff" stroke-width="2.2" fill="none"/>',
  local: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0113 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  salao: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 15.5l5-5 4 4 3-3 6 6"/><circle cx="15.5" cy="8.5" r="1.6"/>'
};

function avatar(foto, nome, cls) {
  const d = el("span", "dc-av " + (cls || ""));
  const u = fotoSeg(foto);
  if (u) { const i = el("img"); i.src = u; i.alt = ""; i.decoding = "async"; d.appendChild(i); } else d.textContent = iniciais(nome);
  return d;
}
// Nome e sobrenome (17/11/2026, pedido dele): "Bianca suelane da Silva Dantas" → "Bianca Dantas" (o inteiro fica no title).
export const nomeCurto = (n) => { const ps = String(n || "").trim().split(/\s+/).filter(Boolean); return ps.length <= 2 ? ps.join(" ") : `${ps[0]} ${ps[ps.length - 1]}`; };
function tempoJuntos(d) {
  // [número, unidade] — "Juntos há 49 dias" (17/11/2026, pedido dele: no lugar de "49 dias de fio")
  const dias = Math.max(1, Math.floor((Date.now() - d.getTime()) / 864e5));
  if (dias < 60) return [String(dias), dias === 1 ? "dia" : "dias"];
  const meses = Math.floor(dias / 30.44);
  if (meses < 24) return [String(meses), "meses"];
  const anos = Math.floor(meses / 12);
  return [String(anos), anos === 1 ? "ano" : "anos"];
}
const mesAno = (d) => d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(/\./g, "").replace(" de ", " ");

let estiloPronto = false;
function css() {
  if (estiloPronto) return; estiloPronto = true;
  const s = document.createElement("style");
  s.textContent = `
.dc-fundo{position:fixed;inset:0;z-index:5200;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.55);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);opacity:0;transition:opacity .25s ease}
.dc-fundo.aberta{opacity:1}
.dc{--rosa:#ff4d6d;position:relative;width:min(100%,440px);max-height:min(92dvh,760px);overflow:auto;overscroll-behavior:contain;border-radius:26px 26px 0 0;background:var(--panel,#0f161b);color:var(--text,#fff);box-shadow:0 -18px 50px rgba(0,0,0,.45);transform:translateY(40px);transition:transform .32s cubic-bezier(.2,.8,.2,1);scrollbar-width:none;padding-bottom:calc(14px + env(safe-area-inset-bottom,0px))}
.dc::-webkit-scrollbar{display:none}
.dc-fundo.aberta .dc{transform:none}
@media (min-width:700px){.dc-fundo{align-items:center}.dc{border-radius:26px;padding-bottom:16px}}
.dc svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;flex:none}
.dc-hero{position:relative;height:150px;overflow:hidden;border-radius:26px 26px 0 0;background:radial-gradient(120% 90% at 50% 110%,rgba(255,77,109,.38),transparent 60%),radial-gradient(60% 70% at 15% 0%,rgba(201,24,74,.28),transparent 70%),linear-gradient(160deg,#16070c,#0b0306 70%);isolation:isolate}
.dc-hero::before{content:"";position:absolute;inset:0;z-index:-1;background-image:radial-gradient(rgba(255,255,255,.55) .6px,transparent .8px);background-size:22px 22px;opacity:.12;mask-image:linear-gradient(180deg,#000,transparent 85%)}
.dc-hero .dc-ret{position:absolute;inset:0;z-index:-1;background:var(--ret) center/cover no-repeat;opacity:0;transition:opacity .5s ease}
.dc-hero.com-retrato .dc-ret{opacity:1}
.dc-hero.com-retrato::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(8,2,5,.35),rgba(8,2,5,.15) 45%,rgba(8,2,5,.85))}
.dc-alca{position:absolute;left:50%;top:8px;width:38px;height:4px;margin-left:-19px;border-radius:4px;background:rgba(255,255,255,.28)}
.dc-rot{position:absolute;left:16px;top:18px;display:inline-flex;align-items:center;gap:6px;padding:5px 11px 5px 8px;border-radius:99px;background:rgba(255,77,109,.14);border:1px solid rgba(255,77,109,.3);color:#ffb3c1;font-size:10.5px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase}
.dc-rot svg{width:14px;height:14px;color:var(--rosa)}
.dc-x{position:absolute;right:12px;top:12px;width:36px;height:36px;border:0;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.1);color:#fff;cursor:pointer}
.dc-par{position:relative;display:flex;justify-content:center;gap:58px}
.dc-parbox{position:relative;z-index:2;height:42px}
.dc-parbox .dc-par{top:-46px}
.dc .dc-fio{width:150px;height:40px;stroke:none}
.dc .dc-no svg{width:17px;height:17px}
.dc-fio{position:absolute;left:50%;top:-24px;width:150px;height:40px;margin-left:-75px;overflow:visible}
.dc-fio path{fill:none;stroke:var(--rosa);stroke-width:2;stroke-linecap:round;filter:drop-shadow(0 0 5px rgba(255,77,109,.8))}
.dc-fio .b{opacity:.35;stroke-width:1.4}
.dc-fio .luz{stroke:#fff;stroke-width:2.2;stroke-dasharray:6 160;animation:dcLuz 3.2s linear infinite}
@keyframes dcLuz{from{stroke-dashoffset:166}to{stroke-dashoffset:0}}
.dc-no{position:absolute;z-index:1;left:50%;top:-19px;width:30px;height:30px;margin-left:-15px;border-radius:50%;display:grid;place-items:center;background:#fff;color:#e11d48;box-shadow:0 0 0 4px rgba(255,77,109,.25),0 6px 18px rgba(255,77,109,.5)}
.dc-no svg{width:17px;height:17px}
.dc-av{position:relative;width:84px;height:84px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:linear-gradient(135deg,#3a1220,#120509);color:#fff;font-weight:800;font-size:26px;line-height:1;box-shadow:0 0 0 3px var(--panel,#0f161b),0 0 0 5px rgba(255,77,109,.55),0 12px 28px rgba(0,0,0,.45)}
.dc-av img{width:100%;height:100%;object-fit:cover}
.dc-corpo{padding:14px 18px 0;display:grid;gap:14px;text-align:center}
.dc-nomes{margin:0;font-weight:800;font-size:22px;line-height:1.15;letter-spacing:-.4px}
.dc-nomes em{font-style:normal;color:var(--rosa);margin:0 8px;font-weight:600}
.dc-desde{display:flex;justify-content:center;flex-wrap:wrap;gap:6px 14px;margin-top:-6px;font-size:12.5px;color:var(--muted,#9aa7b4)}
.dc-desde b{color:var(--text,#fff);font-weight:750}
.dc-frase{margin:0;padding:0 8px;font-size:14px;font-style:italic;line-height:1.45;color:color-mix(in srgb,var(--text,#fff) 82%,transparent);text-wrap:balance}
.dc-frase::before{content:"“";color:var(--rosa);font-weight:800;margin-right:2px}
.dc-frase::after{content:"”";color:var(--rosa);font-weight:800;margin-left:2px}
.dc-quem{display:flex;align-items:center;gap:12px;padding:12px;border-radius:18px;background:var(--panel-2,#182029);border:1px solid var(--line,rgba(255,255,255,.08));text-align:left}
.dc-quem .dc-av{width:48px;height:48px;font-size:16px;box-shadow:none}
.dc-quem .tx{flex:1;min-width:0;display:grid;gap:2px}
.dc-quem .nm{display:flex;align-items:center;gap:5px;min-width:0;font-weight:800;font-size:15px}
.dc-quem .nm span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-quem .nm svg{width:16px;height:16px;color:#1d9bf0}
.dc-quem small{font-size:12px;color:var(--muted,#9aa7b4);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-papel{flex:none;padding:5px 10px;border-radius:99px;background:rgba(255,77,109,.13);color:var(--rosa);font-size:11.5px;font-weight:800}
.dc-bio{margin:-4px 2px 0;font-size:13px;line-height:1.45;color:var(--muted,#9aa7b4);text-align:left;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.dc-fotos-cab{display:flex;align-items:center;justify-content:space-between;margin-bottom:-6px;font-size:12px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted,#9aa7b4)}
.dc-fotos-cab a{color:var(--accent,#00adee);text-decoration:none;letter-spacing:0;text-transform:none;font-weight:750}
.dc-fotos{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px;border-radius:16px;overflow:hidden}
.dc-fotos .dc-ft{grid-column:span 2}
.dc-fotos.q1 .dc-ft{grid-column:1/-1;aspect-ratio:16/10}
.dc-fotos.q2 .dc-ft,.dc-fotos.q4 .dc-ft{grid-column:span 3;aspect-ratio:4/3}
.dc-fotos.q3 .dc-ft:first-child{grid-column:span 4;grid-row:span 2;aspect-ratio:auto}
.dc-fotos.q5 .dc-ft:nth-child(-n+2){grid-column:span 3;aspect-ratio:4/3}
.dc-ft{position:relative;aspect-ratio:1;padding:0;border:0;overflow:hidden;background:var(--panel-2,#182029);cursor:pointer}
.dc-ft img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .4s ease}
@media (hover:hover){.dc-ft:hover img{transform:scale(1.05)}}
.dc-ft.vazio{cursor:default;background:linear-gradient(110deg,var(--panel-2,#182029) 30%,color-mix(in srgb,var(--text,#fff) 7%,var(--panel-2,#182029)) 50%,var(--panel-2,#182029) 70%);background-size:220% 100%;animation:dcBrilho 1.3s linear infinite}
@keyframes dcBrilho{to{background-position:-220% 0}}
.dc-ft .tag{position:absolute;left:6px;top:6px;padding:3px 7px;border-radius:99px;background:rgba(0,0,0,.5);color:#fff;font-size:10px;font-weight:800}
.dc-ft .mais{position:absolute;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.52);color:#fff;font-weight:800;font-size:18px}
.dc-sem{padding:18px 12px;border-radius:16px;border:1px dashed var(--line,rgba(255,255,255,.12));font-size:12.5px;color:var(--muted,#9aa7b4)}
.dc-nums{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-radius:16px;border:1px solid var(--line,rgba(255,255,255,.08));overflow:hidden}
.dc-nums div{display:grid;gap:2px;padding:10px 4px}
.dc-nums div+div{border-left:1px solid var(--line,rgba(255,255,255,.08))}
.dc-nums b{font-weight:800;font-size:17px;line-height:1.1;font-variant-numeric:tabular-nums}
.dc-nums span{font-size:11.5px;color:var(--muted,#9aa7b4)}
.dc-acoes{display:grid;grid-template-columns:1fr 1fr 46px;gap:8px}
.dc-acoes button{height:46px;border-radius:14px;border:1px solid var(--line,rgba(255,255,255,.12));background:var(--panel-2,#182029);color:var(--text,#fff);font-family:inherit;font-weight:750;font-size:14px;line-height:1;display:inline-flex;align-items:center;justify-content:center;gap:7px;cursor:pointer}
.dc-acoes .pri{border:0;background:linear-gradient(135deg,#ff4d6d,#c9184a);color:#fff;box-shadow:0 8px 22px rgba(201,24,74,.35)}
.dc-acoes button:disabled{opacity:.5;cursor:default}
.dc-acoes.sem-ver{grid-template-columns:1fr 46px}
@media (prefers-reduced-motion:reduce){.dc-fio .luz{animation:none}.dc,.dc-fundo{transition:none}}
`;
  document.head.appendChild(s);
}

// Fotos do duo: as do Salão (momentos com foto que quem vê pode ver) e as do Diário (sem público escolhido, no ar).
async function lerFotos(fb, eu, uid, rel, fotosDoPost) {
  const [mom, diario] = await Promise.all([
    lerMomentos(fb, eu, uid, rel, { limite: 12 }).catch(() => []),
    fb.getDocs(fb.query(fb.collection(fb.db, "diario"), fb.where("autorId", "==", uid), fb.orderBy("criadoEm", "desc"), fb.limit(12)))
      .then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }))).catch(() => [])
  ]);
  const agora = Date.now();
  const doSalao = mom.filter((m) => fotoOk(m.foto)).map((m) => ({ tipo: "salao", id: m.id, foto: fotoOk(m.foto), em: ms(m.criadoEm) }));
  const doDiario = diario.filter((p) => !p.publico && !p.guardado && !(ms(p.ocultoAte) > agora) && !(ms(p.agendadoPara) > agora))
    .map((p) => { const f = (fotosDoPost ? fotosDoPost(p) : [p.mediaUrl]).map(fotoSeg).filter(Boolean); return f.length ? { tipo: "diario", id: p.id, foto: f[0], em: ms(p.criadoEm) } : null; })
    .filter(Boolean);
  // o Salão primeiro (escolhidas a dedo), depois as publicações mais recentes
  return [...doSalao, ...doDiario];
}
function contar(fb, q) { return fb.getCountFromServer(q).then((r) => r.data().count).catch(() => null); }

/**
 * Abre o cartão do duo.
 * op: { fb, eu (uid de quem vê), dono {uid, nome, fotoPerfil}, vinculo {id, outro, tipo, papel, frase, conheceram, aceitoEm},
 *       perfil (perfis_publicos do duo, se já tiver), podeAbrir, abrirPerfil(uid), abrirPost(id), fotosDoPost, aoFechar }
 */
export async function abrirCartaoDuo(op) {
  css();
  const { fb, eu, dono, vinculo: v } = op;
  document.querySelectorAll(".dc-fundo").forEach((x) => x.remove());
  const fundo = el("div", "dc-fundo");
  const c = el("div", "dc"); c.setAttribute("role", "dialog"); c.setAttribute("aria-modal", "true"); c.tabIndex = -1;
  fundo.appendChild(c);
  const sair = () => { fundo.classList.remove("aberta"); document.removeEventListener("keydown", tecla); setTimeout(() => fundo.remove(), 260); op.aoFechar?.(); };
  const tecla = (e) => { if (e.key === "Escape") sair(); };
  fundo.addEventListener("click", (e) => { if (e.target === fundo) sair(); });
  document.addEventListener("keydown", tecla);

  // ---- topo com os dois e o fio ----
  const hero = el("div", "dc-hero");
  const rot = el("span", "dc-rot"); rot.append(svg(IC.rosa), document.createTextNode((v.papel || "Duo") + " · Akai Ito"));
  const x = el("button", "dc-x"); x.type = "button"; x.setAttribute("aria-label", "Fechar"); x.dataset.fechar = ""; x.appendChild(svg(IC.fechar)); x.addEventListener("click", sair);
  const fio = document.createElementNS("http://www.w3.org/2000/svg", "svg"); fio.setAttribute("class", "dc-fio"); fio.setAttribute("viewBox", "0 0 150 40"); fio.setAttribute("preserveAspectRatio", "none");
  fio.innerHTML = '<path class="b" d="M0 28 C30 6 55 40 75 22 S120 6 150 28"/><path d="M0 28 C30 40 55 6 75 22 S120 40 150 28"/><path class="luz" d="M0 28 C30 40 55 6 75 22 S120 40 150 28"/>';
  const no = el("span", "dc-no"); no.appendChild(svg(IC.rosa));
  const par = el("div", "dc-par");
  const avOutro = avatar(op.perfil?.fotoPerfil, op.perfil?.nome || "");
  par.append(avatar(dono.fotoPerfil, dono.nome), avOutro);
  const ret = el("i", "dc-ret");
  hero.append(ret, el("i", "dc-alca"), rot, x);
  const parBox = el("div", "dc-parbox"); parBox.append(fio, par);
  // retrato dos dois (vinculos_retrato) vira o fundo do topo, quando existe
  Promise.resolve(op.retrato).then((u) => { u = fotoSeg(u); if (u) { ret.style.setProperty("--ret", `url("${u}")`); hero.classList.add("com-retrato"); } }).catch(() => {});

  // ---- corpo ----
  const corpo = el("div", "dc-corpo");
  const nomes = el("h3", "dc-nomes");
  const nmOutro = el("span", null, primeiro(op.perfil?.nome));
  nomes.append(el("span", null, primeiro(dono.nome)), el("em", null, "&"), nmOutro);
  const desde = el("div", "dc-desde");
  const d = deISO(v.conheceram) || v.aceitoEm?.toDate?.() || null;
  if (d) { const [n, txt] = tempoJuntos(d); const a = el("span"); a.append(document.createTextNode(deISO(v.conheceram) ? "Juntos desde " : "No social desde "), el("b", null, mesAno(d))); const b = el("span"); b.append(el("b", null, n), document.createTextNode(" " + txt + " juntos")); desde.append(a, b); }
  const frase = el("p", "dc-frase", v.frase || FRASES[hash(v.id || "") % FRASES.length]);

  const quem = el("div", "dc-quem");
  const avQ = avatar(op.perfil?.fotoPerfil, op.perfil?.nome || "");
  const tx = el("span", "tx"); const nm = el("span", "nm"); const nmTx = el("span", null, op.perfil?.nome || "Carregando…"); nm.appendChild(nmTx);
  const sub = el("small"); tx.append(nm, sub);
  quem.append(avQ, tx, el("span", "dc-papel", v.papel || "Duo"));
  const bio = el("p", "dc-bio"); bio.hidden = true;

  const fotosCab = el("div", "dc-fotos-cab"); fotosCab.append(el("span", null, "Fotos"));
  const verSalao = el("a", null, "Ver o salão"); verSalao.href = `social.html?uid=${encodeURIComponent(v.outro)}`; verSalao.hidden = true; fotosCab.appendChild(verSalao);
  const fotos = el("div", "dc-fotos q3"); fotos.append(...Array.from({ length: 3 }, () => el("span", "dc-ft vazio")));

  const nums = el("div", "dc-nums");
  const num = (rotulo) => { const dv = el("div"); const b = el("b", null, "–"); dv.append(b, el("span", null, rotulo)); nums.appendChild(dv); return b; };
  const nMom = num("Momentos"), nCon = num("Conexões"), nSeg = num("Seguidores");

  const acoes = el("div", "dc-acoes" + (op.podeAbrir ? "" : " sem-ver"));
  const btn = (cls, ic, txt, fn, rotulo) => { const b = el("button", cls); b.type = "button"; if (ic) b.appendChild(svg(ic)); if (txt) b.append(document.createTextNode(txt)); if (rotulo) b.setAttribute("aria-label", rotulo); b.addEventListener("click", fn); return b; };
  if (op.podeAbrir) acoes.appendChild(btn("pri", null, "Ver perfil", () => { sair(); op.abrirPerfil?.(v.outro); }));
  const msg = btn(op.podeAbrir ? "" : "pri", IC.chat, "Mensagem", async () => {
    msg.disabled = true;
    try {
      const { garantirConversa } = await import("./conversa-acesso.js?v=1");
      const id = await garantirConversa(fb, eu, v.outro);
      sair();
      const m = await import("./chat-gaveta.js?v=4");
      m.abrirChat(`mensagens.html?conversa=${encodeURIComponent(id)}`);
    } catch (e) { msg.disabled = false; const t = e?.name === "ConversaFechada" ? e.message : "Não foi possível abrir a conversa."; op.toast ? op.toast(t) : alert(t); }
  });
  const pres = btn("", IC.presente, "", () => { location.href = `presentes.html?para=${encodeURIComponent(v.outro)}`; }, "Enviar um presente");
  if (v.outro === eu) { msg.hidden = true; pres.hidden = true; acoes.style.gridTemplateColumns = "1fr"; }
  acoes.append(msg, pres);

  corpo.append(nomes, desde, frase, quem, bio, fotosCab, fotos, nums, acoes);
  if (!d) desde.remove();
  c.append(hero, parBox, corpo);
  document.body.appendChild(fundo);
  requestAnimationFrame(() => requestAnimationFrame(() => fundo.classList.add("aberta")));
  c.focus({ preventScroll: true });

  // ---- dados (em paralelo) ----
  const perfilP = op.perfil?.nome ? Promise.resolve(op.perfil) : fb.getDoc(fb.doc(fb.db, "perfis_publicos", v.outro)).then((s) => (s.exists() ? s.data() : {})).catch(() => ({}));
  perfilP.then((p) => {
    const nome = p.nome || "Usuário";
    nmTx.textContent = nome; nmOutro.textContent = primeiro(nome);
    if (p.verificado) nm.appendChild(Object.assign(svg(IC.selo), { role: "img" }));
    sub.textContent = [p.nickname ? "@" + p.nickname : "", [p.cidade, p.uf].filter(Boolean).join("/")].filter(Boolean).join(" · ");
    if (p.bio) { bio.textContent = p.bio; bio.hidden = false; }
    avQ.replaceWith(avatar(p.fotoPerfil, nome)); avOutro.replaceWith(avatar(p.fotoPerfil, nome));
    c.setAttribute("aria-label", `${v.papel || "Duo"}: ${nome}`);
  });
  const rel = await relacaoCom(fb, eu, v.outro).catch(() => ({ euSigo: false, meSegue: false }));
  const db = fb.db;
  contarMomentos(fb, eu, v.outro, rel).then((n) => { nMom.textContent = String(n); verSalao.hidden = !n; }).catch(() => {});
  contar(fb, fb.query(fb.collection(db, "vinculos"), fb.where("participantes", "array-contains", v.outro), fb.where("status", "==", "aceito"))).then((n) => { nCon.textContent = n == null ? "–" : String(n); });
  contar(fb, fb.query(fb.collection(db, "relacoes"), fb.where("tipo", "==", "seguir"), fb.where("alvoId", "==", v.outro))).then((n) => { nSeg.textContent = n == null ? "–" : String(n); });
  const lista = await lerFotos(fb, eu, v.outro, rel, op.fotosDoPost);
  if (!fundo.isConnected) return;
  if (!lista.length) { fotos.replaceWith(el("div", "dc-sem", `${primeiro(op.perfil?.nome || nmTx.textContent)} ainda não tem fotos para mostrar.`)); return; }
  const mostrar = lista.slice(0, 5);
  fotos.className = "dc-fotos q" + mostrar.length;
  fotos.replaceChildren(...mostrar.map((f, i) => {
    const b = el("button", "dc-ft"); b.type = "button";
    b.setAttribute("aria-label", f.tipo === "salao" ? "Abrir o salão" : "Abrir a publicação");
    const im = el("img"); im.src = f.foto; im.alt = ""; im.loading = "lazy"; im.decoding = "async"; b.appendChild(im);
    if (f.tipo === "salao" && i === 0) b.appendChild(el("span", "tag", "Salão"));
    if (i === mostrar.length - 1 && lista.length > mostrar.length) b.appendChild(el("span", "mais", "+" + (lista.length - mostrar.length)));
    b.addEventListener("click", () => {
      const ultima = i === mostrar.length - 1 && lista.length > mostrar.length;
      if (f.tipo === "salao" || (ultima && !verSalao.hidden)) { location.href = verSalao.href; return; }
      if (ultima && op.podeAbrir) { sair(); op.abrirPerfil?.(v.outro); return; }
      sair(); op.abrirPost ? op.abrirPost(f.id) : (location.href = `feed.html?post=${encodeURIComponent(f.id)}`);
    });
    return b;
  }));
}

// =====================================================
// Prévia do duo (17/11/2026, pedido dele com o desenho no print): tocar na rosinha abre uma GAVETINHA compacta ao lado da
// foto, por cima da capa e dos números (não a gaveta grande de baixo): foto do duo com o anel rosa, nome + selo, @ · cidade,
// o fio com o tempo juntos, uma grade 2 × 2 com os números e Ver perfil · Cartão completo.
// O fundo é transparente e PEGA o toque de fora (fecha sem deixar o toque cair na página: antes um 2º toque rápido caía na
// cidade, no Mensagens ou na foto e levava a outro lugar). Fica nas camadas do voltar.js (.dc-fundo): voltar fecha.
// op: os mesmos do abrirCartaoDuo + ancora (a rosinha) e caixa (o cartão do perfil, onde a gavetinha se encaixa).
// =====================================================
let estiloPrevia = false;
function cssPrevia() {
  if (estiloPrevia) return; estiloPrevia = true;
  const s = document.createElement("style");
  s.textContent = `
.dc-fundo.dp-fundo{display:block;background:transparent;backdrop-filter:none;-webkit-backdrop-filter:none;opacity:1;transition:none;touch-action:none}
.dp{--rosa:#ff4d6d;position:absolute;z-index:1;width:var(--dp-w,224px);padding:12px 12px 12px;border-radius:20px;color:#fff;isolation:isolate;overflow:hidden;
  background:linear-gradient(165deg,rgba(38,10,20,.97),rgba(12,8,12,.97) 55%,rgba(8,10,14,.98));border:1px solid rgba(255,77,109,.38);
  box-shadow:0 22px 50px rgba(0,0,0,.55),0 0 0 1px rgba(0,0,0,.4),0 0 32px rgba(255,77,109,.16);
  transform-origin:var(--dp-ox,0) var(--dp-oy,100%);transform:scale(.18);opacity:0;transition:transform .32s cubic-bezier(.2,1.25,.35,1),opacity .18s ease;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
.dp.aberta{transform:none;opacity:1}
.dp.saindo{transform:scale(.4);opacity:0;transition:transform .2s ease,opacity .16s ease}
.dp::before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(90% 55% at 50% 0%,rgba(255,77,109,.28),transparent 70%),radial-gradient(rgba(255,255,255,.5) .5px,transparent .7px) 0 0/16px 16px;opacity:.9;mask-image:linear-gradient(180deg,#000 30%,transparent 75%);-webkit-mask-image:linear-gradient(180deg,#000 30%,transparent 75%)}
.dp svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;flex:none}
.dp-topo{display:flex;align-items:center;justify-content:space-between;gap:6px;margin:-2px -2px 6px 0}
.dp-rot{display:inline-flex;align-items:center;gap:5px;font-size:9.5px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:#ffb3c1;white-space:nowrap;overflow:hidden}
.dp-rot svg{width:13px;height:13px;color:var(--rosa)}
.dp-x{flex:none;width:28px;height:28px;border:0;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.09);color:#fff;cursor:pointer;padding:0}
.dp-x svg{width:14px;height:14px}
.dp-quem{display:grid;justify-items:center;gap:3px;text-align:center}
.dp-av{position:relative;width:68px;height:68px;margin-bottom:5px}
.dp-av .dc-av{width:68px;height:68px;font-size:22px;box-shadow:0 0 0 2.5px #160a10,0 0 0 4.5px var(--rosa),0 0 24px rgba(255,77,109,.5)}
.dp-av i{position:absolute;right:-3px;bottom:-1px;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:#fff;color:#e11d48;box-shadow:0 0 0 2.5px #160a10}
.dp-av i svg{width:13px;height:13px}
.dp-nome{display:flex;align-items:center;justify-content:center;gap:4px;max-width:100%;font-weight:800;font-size:15px;line-height:1.2}
.dp-nome span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dp-nome svg{width:15px;height:15px;color:#1d9bf0;stroke:none}
.dp-sub{max-width:100%;font-size:11.5px;color:rgba(255,230,236,.66);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dp-fio{display:flex;align-items:center;gap:8px;margin:10px 0 9px;font-size:11px;font-weight:700;color:#ffd5de;white-space:nowrap}
.dp-fio::before,.dp-fio::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(255,77,109,.85))}
.dp-fio::after{background:linear-gradient(90deg,rgba(255,77,109,.85),transparent)}
.dp-fio b{color:#fff;font-weight:800}
.dp-grade{display:grid;grid-template-columns:1fr 1fr;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04)}
.dp-grade div{display:grid;gap:1px;padding:8px 6px;text-align:center;min-width:0}
.dp-grade div:nth-child(odd){border-right:1px solid rgba(255,255,255,.1)}
.dp-grade div:nth-child(-n+2){border-bottom:1px solid rgba(255,255,255,.1)}
.dp-grade b{font-size:15px;font-weight:800;line-height:1.15;font-variant-numeric:tabular-nums}
.dp-grade span{font-size:10px;font-weight:600;color:rgba(255,230,236,.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dp-toca{cursor:pointer;-webkit-tap-highlight-color:transparent}.dp-av.dp-toca:active{transform:scale(.96)}.dp-fotos{margin-bottom:2px}
.dp-acoes{display:grid;grid-template-columns:1fr 38px;gap:6px;margin-top:10px}
.dp-acoes.so-um{grid-template-columns:1fr}
.dp-acoes button{height:38px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.07);color:#fff;font:inherit;font-size:12.5px;font-weight:750;display:inline-flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;padding:0 8px}
.dp-acoes .pri{border:0;background:linear-gradient(135deg,#ff4d6d,#c9184a);box-shadow:0 6px 18px rgba(201,24,74,.35)}
.dp-fotos{display:grid;grid-template-columns:1fr 1fr;gap:4px;border-radius:14px;overflow:hidden}
.dp-ft{position:relative;display:block;aspect-ratio:1;padding:0;border:0;background:rgba(255,255,255,.06);cursor:pointer;overflow:hidden}
.dp-ft img{width:100%;height:100%;object-fit:cover;display:block}
.dp-ft.vaga{cursor:default;background:rgba(255,255,255,.035)}
.dp-fotos.carregando .dp-ft{animation:dpPisca 1.1s ease-in-out infinite alternate}
@keyframes dpPisca{to{background:rgba(255,255,255,.12)}}
.dp-fotos.vazia{display:block;border:1px dashed rgba(255,255,255,.18)}
.dp-vazio{display:grid;justify-items:center;gap:3px;padding:16px 8px;text-align:center}
.dp-vazio i{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;border:1.5px solid rgba(255,255,255,.75);margin-bottom:4px}
.dp-vazio i svg{width:20px;height:20px}
.dp-vazio b{font-size:13px;font-weight:800}
.dp-vazio span{font-size:11px;color:rgba(255,230,236,.6)}
.dp-nums{display:flex;justify-content:center;flex-wrap:wrap;gap:3px 8px;margin-top:8px;font-size:10.5px;color:rgba(255,230,236,.66)}
.dp-nums b{color:#fff;font-weight:800;font-variant-numeric:tabular-nums}
@media (prefers-reduced-motion:reduce){.dp,.dp.saindo{transition:opacity .15s}.dp-fotos.carregando .dp-ft{animation:none}}
`;
  document.head.appendChild(s);
}
export function abrirPreviaDuo(op) {
  css(); cssPrevia();
  const { fb, eu, vinculo: v, ancora, caixa } = op;
  document.querySelectorAll(".dc-fundo").forEach((x) => x.remove());
  const fundo = el("div", "dc-fundo dp-fundo");
  const c = el("div", "dp"); c.setAttribute("role", "dialog"); c.setAttribute("aria-modal", "true"); c.tabIndex = -1;
  fundo.appendChild(c);
  const aberta = Date.now();
  let saiu = false;
  const sair = (depois) => {
    if (saiu) return; saiu = true;
    c.classList.remove("aberta"); c.classList.add("saindo");
    document.removeEventListener("keydown", tecla); window.removeEventListener("resize", fecharJa); window.removeEventListener("scroll", fecharJa, true);
    setTimeout(() => { fundo.remove(); op.aoFechar?.(); depois?.(); }, 190);
  };
  const fecharJa = () => sair();
  const tecla = (e) => { if (e.key === "Escape") sair(); };
  // Toque fora: fecha e NÃO passa para a página. Os primeiros 350 ms não fecham (o toque que abriu ainda está chegando).
  fundo.addEventListener("pointerdown", (e) => { if (e.target === fundo) e.preventDefault(); });
  fundo.addEventListener("click", (e) => { e.stopPropagation(); if (e.target === fundo && Date.now() - aberta > 350) sair(); });
  fundo.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("keydown", tecla);

  const topo = el("div", "dp-topo");
  const rot = el("span", "dp-rot"); rot.append(svg(IC.rosa), document.createTextNode((v.papel || "Duo") + " · Akai Ito"));
  const x = el("button", "dp-x"); x.type = "button"; x.setAttribute("aria-label", "Fechar"); x.dataset.fechar = ""; x.appendChild(svg(IC.fechar)); x.addEventListener("click", () => sair());
  topo.append(rot, x);
  const quem = el("div", "dp-quem");
  const avBox = el("div", "dp-av");
  let av = avatar(op.perfil?.fotoPerfil, op.perfil?.nome || "");
  const rosinha = el("i"); rosinha.appendChild(svg(IC.rosa));
  avBox.append(av, rosinha);
  const nome = el("div", "dp-nome"); const nmTx = el("span", null, op.perfil?.nome || "Carregando…"); nome.appendChild(nmTx);
  const sub = el("div", "dp-sub", " ");
  quem.append(avBox, nome, sub);
  const fio = el("div", "dp-fio");
  const d = deISO(v.conheceram) || v.aceitoEm?.toDate?.() || null;
  if (d) { const [n, txt] = tempoJuntos(d); const sp = el("span"); sp.append(document.createTextNode("Juntos há "), el("b", null, n), document.createTextNode(" " + txt)); sp.title = "Desde " + mesAno(d); fio.append(sp); }
  else fio.append(el("span", null, "Ligados pelo fio"));
  // As 4 casas mostram as fotos da pessoa (17/11/2026, pedido dele): as do Salão primeiro, depois as mais recentes do
  // Diário. Sem nenhuma, um aviso como no Instagram.
  const grade = el("div", "dp-fotos carregando");
  for (let i = 0; i < 4; i++) grade.appendChild(el("span", "dp-ft"));
  const linhaNum = el("div", "dp-nums");
  const num = (rotulo) => { const b = el("b", null, "–"); const sp = el("span"); sp.append(b, document.createTextNode(" " + rotulo)); linhaNum.appendChild(sp); return b; };
  const nMom = num("momentos"), nCon = num("conexões"), nSeg = num("seguidores");
  const pnum = (b, n, um, varios) => { b.textContent = n == null ? "–" : String(n); if (b.nextSibling) b.nextSibling.textContent = " " + (n === 1 ? um : varios); };
  const acoes = el("div", "dp-acoes" + (op.podeAbrir ? "" : " so-um"));
  const btn = (cls, ic, txt, fn, rotulo) => { const b = el("button", cls); b.type = "button"; if (ic) b.appendChild(svg(ic)); if (txt) b.append(document.createTextNode(txt)); if (rotulo) { b.setAttribute("aria-label", rotulo); b.title = rotulo; } b.addEventListener("click", fn); return b; };
  if (op.podeAbrir) acoes.appendChild(btn("pri", null, "Ver perfil", () => sair(() => op.abrirPerfil?.(v.outro))));
  acoes.appendChild(btn(op.podeAbrir ? "" : "pri", IC.seta, op.podeAbrir ? "" : "Ver o cartão do duo", () => sair(() => abrirCartaoDuo({ ...op, aoFechar: op.aoFecharCartao })), "Abrir o cartão completo do duo"));
  // 17/11/2026 (pedido dele): sem números e sem botões. Tocar na foto (ou no nome) abre o perfil; tocar no
  // "Juntos há" abre o cartão completo do duo.
  const abrirPerfilDuo = () => sair(() => (op.podeAbrir ? op.abrirPerfil?.(v.outro) : abrirCartaoDuo({ ...op, aoFechar: op.aoFecharCartao })));
  [avBox, nome].forEach((alvo) => { alvo.classList.add("dp-toca"); alvo.setAttribute("role", "button"); alvo.tabIndex = 0; alvo.setAttribute("aria-label", op.podeAbrir ? "Abrir o perfil" : "Abrir o cartão do duo"); alvo.addEventListener("click", abrirPerfilDuo); alvo.addEventListener("keydown", (e) => { if (e.key === "Enter") abrirPerfilDuo(); }); });
  fio.classList.add("dp-toca"); fio.setAttribute("role", "button"); fio.tabIndex = 0; fio.setAttribute("aria-label", "Abrir o cartão completo do duo");
  fio.addEventListener("click", () => sair(() => abrirCartaoDuo({ ...op, aoFechar: op.aoFecharCartao })));
  void linhaNum; void acoes;
  c.append(topo, quem, fio, grade);

  // ---- posição: encaixada no cartão do perfil, à direita da foto, saindo da rosinha ----
  const r = (caixa || document.body).getBoundingClientRect(), a = ancora?.getBoundingClientRect?.();
  const vw = document.documentElement.clientWidth;
  const largura = Math.round(Math.max(196, Math.min(236, r.width * 0.6)));
  const direita = Math.min(vw - 10, r.right - 10);
  const esq = Math.max(10, direita - largura);
  const topoY = Math.max(10, r.top + 10);
  c.style.setProperty("--dp-w", largura + "px");
  c.style.left = esq + "px"; c.style.top = topoY + "px";
  if (a) { c.style.setProperty("--dp-ox", Math.round(a.left + a.width / 2 - esq) + "px"); c.style.setProperty("--dp-oy", Math.round(a.top + a.height / 2 - topoY) + "px"); }
  document.body.appendChild(fundo);
  // se passar do fim da tela, sobe
  const alto = c.offsetHeight, max = (window.visualViewport?.height || innerHeight) - 10;
  if (topoY + alto > max) c.style.top = Math.max(10, max - alto) + "px";
  requestAnimationFrame(() => requestAnimationFrame(() => c.classList.add("aberta")));
  c.focus({ preventScroll: true });
  setTimeout(() => { if (!saiu) { window.addEventListener("resize", fecharJa); window.addEventListener("scroll", fecharJa, true); } }, 400);

  // ---- dados ----
  const perfilP = op.perfil?.nome ? Promise.resolve(op.perfil) : fb.getDoc(fb.doc(fb.db, "perfis_publicos", v.outro)).then((s) => (s.exists() ? s.data() : {})).catch(() => ({}));
  perfilP.then((p) => {
    const nm = p.nome || "Usuário";
    nmTx.textContent = nomeCurto(nm); nmTx.title = nm;
    if (p.verificado && !nome.querySelector("svg")) nome.appendChild(Object.assign(svg(IC.selo), { role: "img" }));
    sub.textContent = [p.nickname ? "@" + p.nickname : "", [p.cidade, p.uf].filter(Boolean).join("/")].filter(Boolean).join(" · ") || " ";
    const novo = avatar(p.fotoPerfil, nm); av.replaceWith(novo); av = novo;
    c.setAttribute("aria-label", `${v.papel || "Duo"}: ${nm}`);
  });
  const relP = relacaoCom(fb, eu, v.outro).catch(() => ({ euSigo: false, meSegue: false }));
  void pnum; void nMom; void nCon; void nSeg;
  relP.then((rel) => lerFotos(fb, eu, v.outro, rel, op.fotosDoPost)).catch(() => []).then((lista) => {
    grade.classList.remove("carregando");
    const quatro = lista.slice(0, 4);
    if (!quatro.length) {
      grade.classList.add("vazia");
      const vz = el("div", "dp-vazio"); const ci = el("i"); ci.appendChild(svg(IC.camera));
      vz.append(ci, el("b", null, "Nenhuma foto ainda"), el("span", null, "Quando publicar, aparece aqui"));
      grade.replaceChildren(vz); return;
    }
    grade.replaceChildren(...[0, 1, 2, 3].map((i) => {
      const f = quatro[i];
      if (!f) return el("span", "dp-ft vaga");
      const b = el("button", "dp-ft"); b.type = "button"; b.setAttribute("aria-label", f.tipo === "diario" ? "Ver a publicação" : "Ver no cartão do duo");
      const im = el("img"); im.src = f.foto; im.alt = ""; im.loading = "lazy"; im.decoding = "async"; b.appendChild(im);
      b.addEventListener("click", () => sair(() => (f.tipo === "diario" && op.abrirPost ? op.abrirPost(f.id) : abrirCartaoDuo({ ...op, aoFechar: op.aoFecharCartao }))));
      return b;
    }));
    // o tamanho mudou: se passar do fim da tela, sobe
    const alto2 = c.offsetHeight, max2 = (window.visualViewport?.height || innerHeight) - 10;
    if (c.getBoundingClientRect().top + alto2 > max2) c.style.top = Math.max(10, max2 - alto2) + "px";
  });
  return { fechar: sair };
}
